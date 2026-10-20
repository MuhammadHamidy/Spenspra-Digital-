package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rapor/rapor-be/rapor/libraries/ssoclient"
	"github.com/rapor/rapor-be/rapor/module/school_attendances/domain"
	"github.com/redis/go-redis/v9"
	qrcode "github.com/skip2/go-qrcode"
)

type useCase struct {
	repo        domain.Repository
	ssoClient   *ssoclient.Client
	redisClient redis.UniversalClient
}

func NewUseCase(repo domain.Repository, rds redis.UniversalClient) domain.UseCase {
	return &useCase{
		repo:        repo,
		ssoClient:   ssoclient.New(),
		redisClient: rds,
	}
}

func (u *useCase) OpenSession(ctx context.Context, teacherID string, req domain.OpenSessionRequest) (*domain.ClassSession, error) {
	if req.ClassID == "" {
		return nil, errors.New("class_id wajib diisi")
	}

	// 1. Cek apakah ada sesi yang masih OPEN di kelas ini
	existing, err := u.repo.FindActiveSessionByClass(ctx, req.ClassID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil // Kembalikan sesi aktif yang sudah ada
	}

	// 2. Siapkan waktu buka & cut-off 15 menit
	now := time.Now()
	cutoff := now.Add(15 * time.Minute)
	todayStr := now.Format("2006-01-02")
	timeStr := now.Format("15:04")

	sessionNumber := req.SessionNumber
	if sessionNumber <= 0 {
		sessionNumber = 1
	}
	topic := req.Topic
	if topic == "" {
		topic = fmt.Sprintf("Pertemuan Sesi %d", sessionNumber)
	}

	sessionID := uuid.New().String()
	sess := &domain.ClassSession{
		ID:            sessionID,
		ClassID:       req.ClassID,
		TeacherID:     &teacherID,
		SessionNumber: sessionNumber,
		Topic:         topic,
		Date:          todayStr,
		StartTime:     timeStr,
		Status:        domain.SessionStatusOpen,
		SessionToken:  uuid.New().String(),
		OpenedAt:      &now,
		LateCutoffAt:  &cutoff,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// 3. Simpan sesi ke database
	if err := u.repo.CreateSession(ctx, sess); err != nil {
		return nil, fmt.Errorf("gagal membuat sesi: %w", err)
	}

	// 4. Ambil seluruh siswa terdaftar dan inisialisasi kehadiran sebagai PENDING
	students, err := u.repo.FindStudentsByClass(ctx, req.ClassID)
	if err == nil && len(students) > 0 {
		var studentIDs []string
		for _, s := range students {
			studentIDs = append(studentIDs, s.ID)
		}
		_ = u.repo.InitializeAttendances(ctx, sessionID, studentIDs)
		sess.TotalStudents = len(students)
		_ = u.repo.UpdateSession(ctx, sess)
	}

	return u.repo.FindSessionByID(ctx, sessionID)
}

func (u *useCase) CloseSession(ctx context.Context, teacherID string, sessionID string) (*domain.SessionSummary, error) {
	sess, err := u.repo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("sesi tidak ditemukan: %w", err)
	}
	if sess.Status == domain.SessionStatusClosed {
		return u.repo.GetSessionSummary(ctx, sessionID)
	}

	return u.repo.CloseSessionAndMarkAlpha(ctx, sessionID)
}

func (u *useCase) GetSessionDetail(ctx context.Context, sessionID string) (*domain.SessionDetailResponse, error) {
	sess, err := u.repo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("sesi tidak ditemukan: %w", err)
	}

	attendances, err := u.repo.FindAttendancesBySession(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	summary, err := u.repo.GetSessionSummary(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	return &domain.SessionDetailResponse{
		Session:     sess,
		Summary:     *summary,
		Attendances: attendances,
	}, nil
}

func (u *useCase) GetTeacherSessions(ctx context.Context, teacherID string, classID string, status string) ([]*domain.ClassSession, error) {
	return u.repo.FindSessions(ctx, teacherID, classID, status)
}

func (u *useCase) ScanQRCode(ctx context.Context, sessionID string, qrToken string) (*domain.ScanResultResponse, error) {
	if sessionID == "" || qrToken == "" {
		return nil, errors.New("session_id dan qr_code_token wajib diisi")
	}

	// 1. Ambil detail sesi kelas
	sess, err := u.repo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return nil, errors.New("sesi kelas tidak ditemukan")
	}
	if sess.Status != domain.SessionStatusOpen {
		return nil, errors.New("sesi kelas sudah ditutup atau belum dibuka")
	}

	// 2. Resolve barcode via SSO (sumber kebenaran tunggal).
	var student *domain.StudentProfile

	ssoPerson, ssoErr := u.ssoClient.ResolveBarcode(ctx, qrToken)
	if ssoErr == nil && ssoPerson != nil {
		// Token valid di SSO — cari akun lokal berdasarkan person_id
		student, err = u.repo.FindStudentByPersonID(ctx, ssoPerson.ID)
		if err != nil || student == nil {
			// Person ada di SSO tapi belum punya akun lokal (belum didaftarkan)
			return nil, fmt.Errorf("siswa %s belum terdaftar di sistem e-Rapor", ssoPerson.FullName)
		}
	} else {
		// Jika token bertipe SSO (awalan PRAMBON-), tolak langsung saat gagal di SSO
		if strings.HasPrefix(qrToken, "PRAMBON-") || len(qrToken) > 20 {
			return nil, errors.New("kartu QR tidak valid, tidak aktif, atau sudah dicabut di SSO")
		}
		// Fallback untuk token legacy lokal non-SSO
		student, err = u.repo.FindStudentByQRToken(ctx, qrToken)
		if err != nil || student == nil {
			return nil, errors.New("kartu QR tidak terdaftar di sistem")
		}
	}

	// 3. Verifikasi apakah siswa terdaftar di kelas ini
	enrolled, err := u.repo.IsStudentEnrolledInClass(ctx, student.ID, sess.ClassID)
	if err != nil || !enrolled {
		return nil, fmt.Errorf("siswa %s bukan anggota kelas %s", student.FullName, sess.ClassName)
	}

	// 4. Periksa catatan presensi saat ini
	att, err := u.repo.FindAttendanceBySessionAndStudent(ctx, sessionID, student.ID)
	now := time.Now()

	if att != nil && (att.Status == domain.StatusHadir || att.Status == domain.StatusTerlambat) {
		formattedTime := ""
		if att.Timestamp != nil {
			formattedTime = att.Timestamp.Format("15:04:05")
		}
		return nil, fmt.Errorf("siswa %s sudah diabsen sebelumnya pada %s", student.FullName, formattedTime)
	}

	// 5. Evaluasi status berdasarkan batas cut-off 15 menit
	status := domain.StatusHadir
	isLate := false
	msg := fmt.Sprintf("Presensi BERHASIL dicatat: %s", student.FullName)

	if sess.LateCutoffAt != nil && now.After(*sess.LateCutoffAt) {
		status = domain.StatusTerlambat
		isLate = true
		msg = fmt.Sprintf("Presensi dicatat TERLAMBAT (lewat batas 15 menit): %s", student.FullName)
	}

	// 6. Simpan / Perbarui kehadiran
	if att == nil {
		att = &domain.Attendance{
			ID:        uuid.New().String(),
			SessionID: sessionID,
			StudentID: student.ID,
			Timestamp: &now,
			Status:    status,
			Method:    domain.MethodQRCode,
			CreatedAt: now,
			UpdatedAt: now,
		}
		if err := u.repo.SaveAttendance(ctx, att); err != nil {
			return nil, err
		}
	} else {
		if err := u.repo.UpdateAttendanceStatus(ctx, sessionID, student.ID, status, "", nil); err != nil {
			return nil, err
		}
	}

	// 7. Update counter pada class_sessions
	summary, _ := u.repo.GetSessionSummary(ctx, sessionID)
	if summary != nil {
		sess.TotalPresent = summary.TotalHadir
		sess.TotalLate = summary.TotalLate
		sess.TotalAlpha = summary.TotalAlpha
		_ = u.repo.UpdateSession(ctx, sess)
	}

	return &domain.ScanResultResponse{
		StudentID: student.ID,
		FullName:  student.FullName,
		NISN:      student.NISN,
		ClassName: student.ClassName,
		ScanTime:  now.Format("15:04:05 WIB"),
		Status:    status,
		IsLate:    isLate,
		Message:   msg,
	}, nil
}

func (u *useCase) ManualOverride(ctx context.Context, teacherID string, sessionID string, studentID string, req domain.ManualOverrideRequest) error {
	if req.Status == "" {
		return errors.New("status presensi wajib diisi")
	}

	// Validasi status yang diizinkan
	validStatus := map[string]bool{
		domain.StatusHadir:     true,
		domain.StatusTerlambat: true,
		domain.StatusSakit:     true,
		domain.StatusIzin:      true,
		domain.StatusAlpha:     true,
	}
	if !validStatus[req.Status] {
		return fmt.Errorf("status '%s' tidak valid", req.Status)
	}

	err := u.repo.UpdateAttendanceStatus(ctx, sessionID, studentID, req.Status, req.Notes, &teacherID)
	if err != nil {
		return err
	}

	// Update counter summary
	sess, _ := u.repo.FindSessionByID(ctx, sessionID)
	if sess != nil {
		summary, _ := u.repo.GetSessionSummary(ctx, sessionID)
		if summary != nil {
			sess.TotalPresent = summary.TotalHadir
			sess.TotalLate = summary.TotalLate
			sess.TotalAlpha = summary.TotalAlpha
			_ = u.repo.UpdateSession(ctx, sess)
		}
	}

	return nil
}

func (u *useCase) GetLiveMonitoring(ctx context.Context) ([]*domain.ClassSession, error) {
	return u.repo.GetLiveOpenSessions(ctx)
}

func (u *useCase) GenerateQRCodePNG(ctx context.Context, qrToken string, size int) ([]byte, error) {
	if size <= 0 {
		size = 256
	}
	return qrcode.Encode(qrToken, qrcode.Medium, size)
}

func (u *useCase) GetCourses(ctx context.Context) ([]*domain.Course, error) {
	return u.repo.FindAllCourses(ctx)
}

func (u *useCase) CreateCourse(ctx context.Context, course *domain.Course) error {
	if course.Code == "" || course.Name == "" {
		return errors.New("kode dan nama mata pelajaran wajib diisi")
	}
	if course.ID == "" {
		course.ID = uuid.New().String()
	}
	return u.repo.CreateCourse(ctx, course)
}

func (u *useCase) UpdateCourse(ctx context.Context, course *domain.Course) error {
	if course.ID == "" {
		return errors.New("course_id wajib diisi")
	}
	if course.Code == "" || course.Name == "" {
		return errors.New("kode dan nama mata pelajaran wajib diisi")
	}
	return u.repo.UpdateCourse(ctx, course)
}

func (u *useCase) DeleteCourse(ctx context.Context, courseID string) error {
	if courseID == "" {
		return errors.New("course_id wajib diisi")
	}
	return u.repo.DeleteCourse(ctx, courseID)
}

func (u *useCase) GetClasses(ctx context.Context) ([]*domain.Class, error) {
	return u.repo.FindAllClasses(ctx)
}

func (u *useCase) CreateClass(ctx context.Context, class *domain.Class) error {
	if class.CourseID == "" || class.ClassCode == "" || class.TeacherID == "" {
		return errors.New("course_id, class_code en teacher_id wajib diisi")
	}
	if class.ID == "" {
		class.ID = uuid.New().String()
	}
	return u.repo.CreateClass(ctx, class)
}

func (u *useCase) UpdateClass(ctx context.Context, class *domain.Class) error {
	if class.ID == "" {
		return errors.New("id kelas wajib diisi")
	}
	return u.repo.UpdateClass(ctx, class)
}

func (u *useCase) DeleteClass(ctx context.Context, classID string) error {
	if classID == "" {
		return errors.New("class_id wajib diisi")
	}
	return u.repo.DeleteClass(ctx, classID)
}

func (u *useCase) GetTeachers(ctx context.Context) ([]*domain.Teacher, error) {
	teachers, err := u.repo.FindAllTeachers(ctx)
	if err == nil && len(teachers) == 0 && u.ssoClient != nil {
		_, _ = u.SyncFromSSO(ctx)
		return u.repo.FindAllTeachers(ctx)
	}
	return teachers, err
}

func (u *useCase) CreateTeacher(ctx context.Context, teacher *domain.Teacher) error {
	if teacher.FullName == "" || teacher.NimNip == "" {
		return errors.New("nama lengkap dan NIP guru wajib diisi")
	}
	return u.repo.CreateTeacher(ctx, teacher)
}

func (u *useCase) UpdateTeacher(ctx context.Context, teacher *domain.Teacher) error {
	if teacher.ID == "" {
		return errors.New("ID guru wajib diisi")
	}
	return u.repo.UpdateTeacher(ctx, teacher)
}

func (u *useCase) DeleteTeacher(ctx context.Context, teacherID string) error {
	if teacherID == "" {
		return errors.New("ID guru wajib diisi")
	}
	return u.repo.DeleteTeacher(ctx, teacherID)
}

func (u *useCase) GetStudents(ctx context.Context, className string) ([]*domain.Student, error) {
	cleanClass := strings.ToLower(strings.TrimSpace(className))
	cacheKey := fmt.Sprintf("school:students:%s", cleanClass)

	// 1. Coba baca dari Redis Cache (< 1ms)
	if u.redisClient != nil {
		if cached, err := u.redisClient.Get(ctx, cacheKey).Result(); err == nil && cached != "" {
			var cachedStudents []*domain.Student
			if err := json.Unmarshal([]byte(cached), &cachedStudents); err == nil && len(cachedStudents) > 0 {
				return cachedStudents, nil
			}
		}
	}

	// 2. Query ke PostgreSQL jika cache miss
	students, err := u.repo.FindAllStudents(ctx, className)
	if err != nil {
		return nil, err
	}

	// 3. Simpan ke Redis dengan TTL 10 Menit
	if u.redisClient != nil && len(students) > 0 {
		if raw, err := json.Marshal(students); err == nil {
			_ = u.redisClient.Set(ctx, cacheKey, string(raw), 10*time.Minute).Err()
		}
	}

	return students, nil
}

func (u *useCase) GetRombel(ctx context.Context) ([]string, error) {
	rombel, err := u.repo.FindAllRombel(ctx)
	if err != nil {
		return nil, err
	}
	if u.ssoClient != nil {
		if ssoClasses, err := u.ssoClient.FetchAllClasses(ctx); err == nil && len(ssoClasses) > 0 {
			classMap := make(map[string]bool)
			for _, r := range rombel {
				classMap[r] = true
			}
			for _, sc := range ssoClasses {
				clean := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(sc.ClassCode, "Kelas"), "kelas"))
				if clean != "" && !classMap[clean] {
					rombel = append(rombel, clean)
					classMap[clean] = true
				}
			}
			sort.Strings(rombel)
		}
	}
	return rombel, nil
}

func (u *useCase) SyncFromSSO(ctx context.Context) (map[string]int, error) {
	if u.ssoClient == nil {
		return nil, errors.New("sso client tidak terkonfigurasi")
	}

	people, err := u.ssoClient.FetchAllPeople(ctx, "")
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data master dari SSO: %w", err)
	}

	guruCount := 0
	siswaCount := 0
	var activeIDs []string
	var activeNIPs []string
	var activeNISNs []string

	for _, p := range people {
		if p == nil || !p.IsActive {
			continue
		}
		if p.ID != "" {
			activeIDs = append(activeIDs, p.ID)
		}
		if p.NIP != "" {
			activeNIPs = append(activeNIPs, p.NIP)
		}
		if p.NISN != "" {
			activeNISNs = append(activeNISNs, p.NISN)
		}

		err := u.repo.UpsertMasterPerson(ctx, p.ID, p.PersonType, p.FullName, p.NIP, p.NISN, p.Email, p.Phone, p.ClassName, p.IsActive)
		if err == nil {
			if p.PersonType == "GURU" {
				guruCount++
			} else {
				siswaCount++
			}
		}
	}

	// Hapus akun lama/terhapus yang tidak lagi terdaftar di SSO
	prunedCount := int64(0)
	if len(activeIDs) > 0 || len(activeNIPs) > 0 {
		prunedCount, _ = u.repo.PruneStaleAccounts(ctx, activeIDs, activeNIPs, activeNISNs)
	}

	// Bersihkan cache siswa di Redis setelah sinkronisasi berhasil
	if u.redisClient != nil {
		_ = u.redisClient.Del(ctx, "school:students:", "school:students:7a", "school:students:7b", "school:students:8a", "school:students:8b", "school:students:9a", "school:students:9b").Err()
	}

	return map[string]int{
		"guru_count":   guruCount,
		"siswa_count":  siswaCount,
		"total_count":  guruCount + siswaCount,
		"pruned_count": int(prunedCount),
	}, nil
}

