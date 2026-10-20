package postgresql

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/rapor/rapor-be/rapor/module/school_attendances/domain"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) domain.Repository {
	return &repository{db: db}
}

func (r *repository) FindSessionByID(ctx context.Context, sessionID string) (*domain.ClassSession, error) {
	var s domain.ClassSession
	err := r.db.WithContext(ctx).Table("class_sessions").
		Select("class_sessions.*, classes.class_code as class_name, accounts.full_name as teacher_name").
		Joins("LEFT JOIN classes ON classes.id = class_sessions.class_id").
		Joins("LEFT JOIN accounts ON accounts.id = class_sessions.teacher_id").
		Where("class_sessions.id = ?", sessionID).
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *repository) FindActiveSessionByClass(ctx context.Context, classID string) (*domain.ClassSession, error) {
	var s domain.ClassSession
	err := r.db.WithContext(ctx).Table("class_sessions").
		Select("class_sessions.*, classes.class_code as class_name, accounts.full_name as teacher_name").
		Joins("LEFT JOIN classes ON classes.id = class_sessions.class_id").
		Joins("LEFT JOIN accounts ON accounts.id = class_sessions.teacher_id").
		Where("class_sessions.class_id = ? AND class_sessions.status = ?", classID, domain.SessionStatusOpen).
		First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *repository) FindSessions(ctx context.Context, teacherID string, classID string, status string) ([]*domain.ClassSession, error) {
	var list []*domain.ClassSession
	q := r.db.WithContext(ctx).Table("class_sessions").
		Select("class_sessions.*, classes.class_code as class_name, accounts.full_name as teacher_name").
		Joins("LEFT JOIN classes ON classes.id = class_sessions.class_id").
		Joins("LEFT JOIN accounts ON accounts.id = class_sessions.teacher_id").
		Order("class_sessions.created_at DESC")

	if teacherID != "" {
		q = q.Where("class_sessions.teacher_id = ?", teacherID)
	}
	if classID != "" {
		q = q.Where("class_sessions.class_id = ?", classID)
	}
	if status != "" {
		q = q.Where("class_sessions.status = ?", status)
	}

	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *repository) CreateSession(ctx context.Context, session *domain.ClassSession) error {
	return r.db.WithContext(ctx).Table("class_sessions").Create(session).Error
}

func (r *repository) UpdateSession(ctx context.Context, session *domain.ClassSession) error {
	return r.db.WithContext(ctx).Table("class_sessions").Save(session).Error
}

func (r *repository) CloseSessionAndMarkAlpha(ctx context.Context, sessionID string) (*domain.SessionSummary, error) {
	var summary domain.SessionSummary
	now := time.Now()

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. Update status semua PENDING jadi ALPHA
		if err := tx.Table("attendances").
			Where("session_id = ? AND status = ?", sessionID, domain.StatusPending).
			Updates(map[string]interface{}{
				"status":     domain.StatusAlpha,
				"updated_at": now,
			}).Error; err != nil {
			return err
		}

		// 2. Hitung agregat kehadiran
		var total, hadir, late, sakit, izin, alpha int64
		_ = tx.Table("attendances").Where("session_id = ?", sessionID).Count(&total)
		_ = tx.Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusHadir).Count(&hadir)
		_ = tx.Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusTerlambat).Count(&late)
		_ = tx.Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusSakit).Count(&sakit)
		_ = tx.Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusIzin).Count(&izin)
		_ = tx.Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusAlpha).Count(&alpha)

		summary = domain.SessionSummary{
			TotalStudents: int(total),
			TotalHadir:    int(hadir),
			TotalLate:     int(late),
			TotalSakit:    int(sakit),
			TotalIzin:     int(izin),
			TotalAlpha:    int(alpha),
			TotalPending:  0,
		}

		// 3. Update class_sessions
		return tx.Table("class_sessions").
			Where("id = ?", sessionID).
			Updates(map[string]interface{}{
				"status":         domain.SessionStatusClosed,
				"closed_at":      now,
				"total_students": summary.TotalStudents,
				"total_present":  summary.TotalHadir,
				"total_late":     summary.TotalLate,
				"total_alpha":    summary.TotalAlpha,
				"updated_at":     now,
			}).Error
	})

	if err != nil {
		return nil, err
	}
	return &summary, nil
}

func (r *repository) FindStudentsByClass(ctx context.Context, classID string) ([]*domain.StudentProfile, error) {
	var list []*domain.StudentProfile
	err := r.db.WithContext(ctx).Table("accounts").
		Select("accounts.id, accounts.username, accounts.full_name, accounts.nisn, accounts.class_name, accounts.qr_code_token, accounts.is_active").
		Joins("JOIN class_enrollments ON class_enrollments.student_id = accounts.id").
		Where("class_enrollments.class_id = ?", classID).
		Find(&list).Error
	if err != nil {
		return nil, err
	}
	return list, nil
}

func (r *repository) FindStudentByQRToken(ctx context.Context, qrToken string) (*domain.StudentProfile, error) {
	var s domain.StudentProfile
	err := r.db.WithContext(ctx).Table("accounts").
		Select("id, username, full_name, nisn, class_name, qr_code_token, is_active").
		Where("qr_code_token = ?", qrToken).
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// FindStudentByPersonID mencari akun siswa berdasarkan person_id (dari SSO school_people).
// Digunakan oleh ScanQRCode setelah barcode berhasil di-resolve via SSO API.
func (r *repository) FindStudentByPersonID(ctx context.Context, personID string) (*domain.StudentProfile, error) {
	var s domain.StudentProfile
	err := r.db.WithContext(ctx).Table("accounts").
		Select("id, username, full_name, nisn, class_name, qr_code_token, is_active").
		Where("person_id = ?", personID).
		First(&s).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *repository) FindStudentByID(ctx context.Context, studentID string) (*domain.StudentProfile, error) {
	var s domain.StudentProfile
	err := r.db.WithContext(ctx).Table("accounts").
		Select("id, username, full_name, nisn, class_name, qr_code_token, is_active").
		Where("id = ?", studentID).
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *repository) IsStudentEnrolledInClass(ctx context.Context, studentID string, classID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Table("class_enrollments").
		Where("student_id = ? AND class_id = ?", studentID, classID).
		Count(&count).Error
	return count > 0, err
}

func (r *repository) InitializeAttendances(ctx context.Context, sessionID string, studentIDs []string) error {
	if len(studentIDs) == 0 {
		return nil
	}
	now := time.Now()
	var records []domain.Attendance
	for _, sid := range studentIDs {
		records = append(records, domain.Attendance{
			ID:        uuid.New().String(),
			SessionID: sessionID,
			StudentID: sid,
			Status:    domain.StatusPending,
			Method:    domain.MethodQRCode,
			CreatedAt: now,
			UpdatedAt: now,
		})
	}
	return r.db.WithContext(ctx).Table("attendances").Create(&records).Error
}

func (r *repository) FindAttendancesBySession(ctx context.Context, sessionID string) ([]*domain.Attendance, error) {
	var list []*domain.Attendance
	err := r.db.WithContext(ctx).Table("attendances").
		Select("attendances.*, accounts.full_name as student_name, accounts.nisn as nisn, accounts.class_name as class_name").
		Joins("JOIN accounts ON accounts.id = attendances.student_id").
		Where("attendances.session_id = ?", sessionID).
		Order("attendances.timestamp DESC NULLS LAST, accounts.full_name ASC").
		Find(&list).Error
	if err != nil {
		return nil, err
	}
	return list, nil
}

func (r *repository) FindAttendanceBySessionAndStudent(ctx context.Context, sessionID string, studentID string) (*domain.Attendance, error) {
	var att domain.Attendance
	err := r.db.WithContext(ctx).Table("attendances").
		Select("attendances.*, accounts.full_name as student_name, accounts.nisn as nisn, accounts.class_name as class_name").
		Joins("JOIN accounts ON accounts.id = attendances.student_id").
		Where("attendances.session_id = ? AND attendances.student_id = ?", sessionID, studentID).
		First(&att).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &att, nil
}

func (r *repository) SaveAttendance(ctx context.Context, attendance *domain.Attendance) error {
	return r.db.WithContext(ctx).Table("attendances").Save(attendance).Error
}

func (r *repository) UpdateAttendanceStatus(ctx context.Context, sessionID string, studentID string, status string, notes string, editedBy *string) error {
	now := time.Now()
	updates := map[string]interface{}{
		"status":         status,
		"notes":          notes,
		"is_manual_edit": true,
		"edited_by":      editedBy,
		"updated_at":     now,
	}
	if status == domain.StatusHadir || status == domain.StatusTerlambat {
		updates["timestamp"] = now
	}
	return r.db.WithContext(ctx).Table("attendances").
		Where("session_id = ? AND student_id = ?", sessionID, studentID).
		Updates(updates).Error
}

func (r *repository) GetSessionSummary(ctx context.Context, sessionID string) (*domain.SessionSummary, error) {
	var total, hadir, late, sakit, izin, alpha, pending int64
	_ = r.db.WithContext(ctx).Table("attendances").Where("session_id = ?", sessionID).Count(&total)
	_ = r.db.WithContext(ctx).Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusHadir).Count(&hadir)
	_ = r.db.WithContext(ctx).Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusTerlambat).Count(&late)
	_ = r.db.WithContext(ctx).Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusSakit).Count(&sakit)
	_ = r.db.WithContext(ctx).Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusIzin).Count(&izin)
	_ = r.db.WithContext(ctx).Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusAlpha).Count(&alpha)
	_ = r.db.WithContext(ctx).Table("attendances").Where("session_id = ? AND status = ?", sessionID, domain.StatusPending).Count(&pending)

	return &domain.SessionSummary{
		TotalStudents: int(total),
		TotalHadir:    int(hadir),
		TotalLate:     int(late),
		TotalSakit:    int(sakit),
		TotalIzin:     int(izin),
		TotalAlpha:    int(alpha),
		TotalPending:  int(pending),
	}, nil
}

func (r *repository) GetLiveOpenSessions(ctx context.Context) ([]*domain.ClassSession, error) {
	var list []*domain.ClassSession
	err := r.db.WithContext(ctx).Table("class_sessions").
		Select("class_sessions.*, classes.class_code as class_name, accounts.full_name as teacher_name").
		Joins("LEFT JOIN classes ON classes.id = class_sessions.class_id").
		Joins("LEFT JOIN accounts ON accounts.id = class_sessions.teacher_id").
		Where("class_sessions.status = ?", domain.SessionStatusOpen).
		Order("class_sessions.opened_at DESC").
		Find(&list).Error
	if err != nil {
		return nil, err
	}
	return list, nil
}

func (r *repository) FindAllCourses(ctx context.Context) ([]*domain.Course, error) {
	var list []*domain.Course
	err := r.db.WithContext(ctx).Table("courses").Order("code ASC").Find(&list).Error
	return list, err
}

func (r *repository) CreateCourse(ctx context.Context, course *domain.Course) error {
	return r.db.WithContext(ctx).Table("courses").Create(course).Error
}

func (r *repository) UpdateCourse(ctx context.Context, course *domain.Course) error {
	return r.db.WithContext(ctx).Table("courses").Where("id = ?", course.ID).Updates(map[string]interface{}{
		"code":        course.Code,
		"name":        course.Name,
		"sks":         course.SKS,
		"description": course.Description,
	}).Error
}

func (r *repository) DeleteCourse(ctx context.Context, courseID string) error {
	return r.db.WithContext(ctx).Table("courses").Where("id = ?", courseID).Delete(&domain.Course{}).Error
}

func (r *repository) FindAllClasses(ctx context.Context) ([]*domain.Class, error) {
	var list []*domain.Class
	err := r.db.WithContext(ctx).Table("classes").
		Select("classes.*, classes.dosen_id AS teacher_id, COALESCE(courses.code, '') AS course_code, COALESCE(courses.name, '') AS course_name, COALESCE(accounts.full_name, '') AS teacher_name").
		Joins("LEFT JOIN courses ON courses.id = classes.course_id").
		Joins("LEFT JOIN accounts ON (accounts.id = classes.dosen_id OR accounts.person_id = classes.dosen_id)").
		Order("classes.class_code ASC, courses.code ASC").
		Find(&list).Error
	return list, err
}

func (r *repository) CreateClass(ctx context.Context, class *domain.Class) error {
	if class.ID == "" {
		class.ID = uuid.New().String()
	}
	if class.AcademicYear == "" {
		class.AcademicYear = "2025/2026"
	}
	data := map[string]interface{}{
		"id":                  class.ID,
		"course_id":           class.CourseID,
		"class_code":          class.ClassCode,
		"academic_year":       class.AcademicYear,
		"room":                class.Room,
		"schedule_day":        class.ScheduleDay,
		"schedule_time":       class.ScheduleTime,
		"schedule_start_time": class.ScheduleStartTime,
		"schedule_end_time":   class.ScheduleEndTime,
	}
	if class.TeacherID != "" {
		data["dosen_id"] = class.TeacherID
	} else {
		data["dosen_id"] = nil
	}
	return r.db.WithContext(ctx).Table("classes").Create(data).Error
}

func (r *repository) UpdateClass(ctx context.Context, class *domain.Class) error {
	data := map[string]interface{}{
		"course_id":           class.CourseID,
		"class_code":          class.ClassCode,
		"academic_year":       class.AcademicYear,
		"room":                class.Room,
		"schedule_day":        class.ScheduleDay,
		"schedule_time":       class.ScheduleTime,
		"schedule_start_time": class.ScheduleStartTime,
		"schedule_end_time":   class.ScheduleEndTime,
	}
	if class.TeacherID != "" {
		data["dosen_id"] = class.TeacherID
	} else {
		data["dosen_id"] = nil
	}
	return r.db.WithContext(ctx).Table("classes").Where("id = ?", class.ID).Updates(data).Error
}

func (r *repository) DeleteClass(ctx context.Context, classID string) error {
	return r.db.WithContext(ctx).Table("classes").Where("id = ?", classID).Delete(&domain.Class{}).Error
}

func (r *repository) FindAllTeachers(ctx context.Context) ([]*domain.Teacher, error) {
	type rawTeacher struct {
		ID        string `gorm:"column:id"`
		Username  string `gorm:"column:username"`
		FullName  string `gorm:"column:full_name"`
		NimNip    string `gorm:"column:nim_nip"`
		Email     string `gorm:"column:email"`
		Phone     string `gorm:"column:phone"`
		ClassName string `gorm:"column:class_name"`
	}

	var rawList []rawTeacher
	err := r.db.WithContext(ctx).Table("accounts").
		Where("role_id = ? OR role_id = ?", "role-guru", "GURU").
		Order("full_name ASC").
		Find(&rawList).Error
	if err != nil {
		return nil, err
	}

	var result []*domain.Teacher
	for _, raw := range rawList {
		t := &domain.Teacher{
			ID:          raw.ID,
			Username:    raw.Username,
			FullName:    raw.FullName,
			NimNip:      raw.NimNip,
			Email:       raw.Email,
			Phone:       raw.Phone,
			ClassName:   raw.ClassName,
			CourseIDs:   make([]string, 0),
			CourseNames: make([]string, 0),
			ClassCodes:  make([]string, 0),
		}

		type courseInfo struct {
			CourseID   string `gorm:"column:course_id"`
			CourseName string `gorm:"column:course_name"`
		}
		var cList []courseInfo
		_ = r.db.WithContext(ctx).Table("classes cl").
			Select("DISTINCT cl.course_id, c.name as course_name").
			Joins("JOIN courses c ON c.id = cl.course_id").
			Where("cl.dosen_id = ?", raw.ID).
			Find(&cList).Error
		for _, ci := range cList {
			t.CourseIDs = append(t.CourseIDs, ci.CourseID)
			t.CourseNames = append(t.CourseNames, ci.CourseName)
		}

		var classCodes []string
		_ = r.db.WithContext(ctx).Table("classes").
			Distinct("class_code").
			Where("dosen_id = ?", raw.ID).
			Pluck("class_code", &classCodes).Error
		t.ClassCodes = classCodes

		result = append(result, t)
	}
	return result, nil
}

func (r *repository) CreateTeacher(ctx context.Context, teacher *domain.Teacher) error {
	if teacher.ID == "" {
		teacher.ID = uuid.New().String()
	}
	if teacher.Username == "" {
		teacher.Username = teacher.NimNip
	}

	accMap := map[string]interface{}{
		"id":            teacher.ID,
		"username":      teacher.Username,
		"password_hash": "$2b$12$e0X3hX8H/wJpYcT0bN6zEu9MvQ8zD4jR7wL3a2c5b6e7f8g9h0i1j",
		"email":         teacher.Email,
		"full_name":     teacher.FullName,
		"role_id":       "role-guru",
		"nim_nip":       teacher.NimNip,
		"phone":         teacher.Phone,
		"class_name":    teacher.ClassName,
		"is_active":     true,
	}
	if err := r.db.WithContext(ctx).Table("accounts").Create(accMap).Error; err != nil {
		return err
	}

	for _, cid := range teacher.CourseIDs {
		tcID := uuid.New().String()
		_ = r.db.WithContext(ctx).Table("teacher_courses").Create(map[string]interface{}{
			"id":         tcID,
			"teacher_id": teacher.ID,
			"course_id":  cid,
		}).Error
	}
	return nil
}

func (r *repository) UpdateTeacher(ctx context.Context, teacher *domain.Teacher) error {
	accMap := map[string]interface{}{
		"full_name":  teacher.FullName,
		"nim_nip":    teacher.NimNip,
		"email":      teacher.Email,
		"phone":      teacher.Phone,
		"class_name": teacher.ClassName,
	}
	if err := r.db.WithContext(ctx).Table("accounts").Where("id = ?", teacher.ID).Updates(accMap).Error; err != nil {
		return err
	}

	if len(teacher.CourseIDs) > 0 {
		_ = r.db.WithContext(ctx).Table("teacher_courses").Where("teacher_id = ?", teacher.ID).Delete(map[string]interface{}{}).Error
		for _, cid := range teacher.CourseIDs {
			tcID := uuid.New().String()
			_ = r.db.WithContext(ctx).Table("teacher_courses").Create(map[string]interface{}{
				"id":         tcID,
				"teacher_id": teacher.ID,
				"course_id":  cid,
			}).Error
		}
	}
	return nil
}

func (r *repository) DeleteTeacher(ctx context.Context, teacherID string) error {
	_ = r.db.WithContext(ctx).Table("teacher_courses").Where("teacher_id = ?", teacherID).Delete(map[string]interface{}{}).Error
	return r.db.WithContext(ctx).Table("accounts").Where("id = ?", teacherID).Delete(map[string]interface{}{}).Error
}

func (r *repository) FindAllStudents(ctx context.Context, className string) ([]*domain.Student, error) {
	var list []*domain.Student
	q := r.db.WithContext(ctx).Table("accounts").
		Select("id, full_name, nisn, class_name, phone, email, is_active").
		Where("role_id = ? OR role_id = ?", "role-siswa", "SISWA").
		Order("class_name ASC, full_name ASC")

	if className != "" {
		cleaned := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(className, "Kelas"), "kelas"))
		q = q.Where("class_name ILIKE ? OR class_name ILIKE ?", "%"+cleaned+"%", "%"+className+"%")
	}

	err := q.Find(&list).Error
	return list, err
}

func (r *repository) FindAllRombel(ctx context.Context) ([]string, error) {
	var rombelFromAccounts []string
	_ = r.db.WithContext(ctx).Table("accounts").
		Where("class_name IS NOT NULL AND class_name != ''").
		Distinct("class_name").
		Pluck("class_name", &rombelFromAccounts).Error

	var rombelFromClasses []string
	_ = r.db.WithContext(ctx).Table("classes").
		Where("class_code IS NOT NULL AND class_code != ''").
		Distinct("class_code").
		Pluck("class_code", &rombelFromClasses).Error

	classSet := make(map[string]bool)
	for _, c := range rombelFromAccounts {
		clean := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(c, "Kelas"), "kelas"))
		if clean != "" {
			classSet[clean] = true
		}
	}
	for _, c := range rombelFromClasses {
		clean := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(c, "Kelas"), "kelas"))
		if clean != "" {
			classSet[clean] = true
		}
	}

	var result []string
	for k := range classSet {
		result = append(result, k)
	}
	sort.Strings(result)
	return result, nil
}

func (r *repository) UpsertMasterPerson(ctx context.Context, personID, personType, fullName, nimNip, nisn, email, phone, className string, isActive bool) error {
	var existingID string
	if personID != "" {
		_ = r.db.WithContext(ctx).Table("accounts").Where("person_id = ? OR id = ?", personID, personID).Select("id").Limit(1).Pluck("id", &existingID).Error
	}
	if existingID == "" && nimNip != "" {
		_ = r.db.WithContext(ctx).Table("accounts").Where("nim_nip = ?", nimNip).Select("id").Limit(1).Pluck("id", &existingID).Error
	}
	if existingID == "" && nisn != "" {
		_ = r.db.WithContext(ctx).Table("accounts").Where("nisn = ?", nisn).Select("id").Limit(1).Pluck("id", &existingID).Error
	}

	if existingID != "" {
		upd := map[string]interface{}{
			"full_name":  fullName,
			"phone":      phone,
			"is_active":  isActive,
			"updated_at": time.Now(),
		}
		if email != "" {
			upd["email"] = email
		}
		if nimNip != "" {
			upd["nim_nip"] = nimNip
		}
		if nisn != "" {
			upd["nisn"] = nisn
		}
		if className != "" {
			upd["class_name"] = className
		}
		if personID != "" {
			upd["person_id"] = personID
		}
		return r.db.WithContext(ctx).Table("accounts").Where("id = ?", existingID).Updates(upd).Error
	}

	roleID := "role-siswa"
	username := nisn
	accID := personID
	if accID == "" {
		accID = uuid.New().String()
	}

	if personType == "GURU" {
		roleID = "role-guru"
		username = nimNip
		if username == "" {
			username = personID
		}
	}

	if email == "" {
		email = username + "@smpn1prambon.sch.id"
	}

	ins := map[string]interface{}{
		"id":            accID,
		"username":      username,
		"password_hash": "$2a$10$LOQmzILymmWdzSSrUyQdZ.6Hc/xlqkDRzQ6DaiyuCYH1Y1qMidb8i",
		"email":         email,
		"full_name":     fullName,
		"role_id":       roleID,
		"nim_nip":       nimNip,
		"nisn":          nisn,
		"phone":         phone,
		"class_name":    className,
		"person_id":     personID,
		"is_active":     isActive,
	}

	err := r.db.WithContext(ctx).Table("accounts").Create(ins).Error
	if err != nil {
		return err
	}

	if roleID == "role-siswa" && (className == "7A" || className == "VII-A") {
		_ = r.db.WithContext(ctx).Table("class_enrollments").Create(map[string]interface{}{
			"id":         accID,
			"class_id":   "class-7a",
			"student_id": accID,
		}).Error
	}

	return nil
}

func (r *repository) PruneStaleAccounts(ctx context.Context, activePersonIDs, activeNIPs, activeNISNs []string) (int64, error) {
	// Ambil semua akun guru dan siswa di e-rapor
	var accounts []struct {
		ID       string `gorm:"column:id"`
		PersonID string `gorm:"column:person_id"`
		NimNip   string `gorm:"column:nim_nip"`
		Nisn     string `gorm:"column:nisn"`
	}

	err := r.db.WithContext(ctx).Table("accounts").
		Select("id, person_id, nim_nip, nisn").
		Where("role_id IN ('role-guru', 'GURU', 'role-siswa', 'SISWA')").
		Find(&accounts).Error
	if err != nil {
		return 0, err
	}

	// Bentuk set pencarian cepat
	pSet := make(map[string]bool)
	for _, id := range activePersonIDs {
		if id != "" {
			pSet[id] = true
		}
	}
	nipSet := make(map[string]bool)
	for _, nip := range activeNIPs {
		if nip != "" {
			nipSet[nip] = true
		}
	}
	nisnSet := make(map[string]bool)
	for _, nisn := range activeNISNs {
		if nisn != "" {
			nisnSet[nisn] = true
		}
	}

	var staleIDs []string
	for _, a := range accounts {
		// Jika akun ada di activePersonIDs, atau cocok NIP-nya, atau cocok NISN-nya, akun ini VALID.
		isValid := false
		if a.PersonID != "" && pSet[a.PersonID] {
			isValid = true
		} else if a.ID != "" && pSet[a.ID] {
			isValid = true
		} else if a.NimNip != "" && nipSet[a.NimNip] {
			isValid = true
		} else if a.Nisn != "" && nisnSet[a.Nisn] {
			isValid = true
		}

		if !isValid {
			staleIDs = append(staleIDs, a.ID)
		}
	}

	if len(staleIDs) == 0 {
		return 0, nil
	}

	// 1. Lepas relasi di classes jika guru terhapus
	_ = r.db.WithContext(ctx).Table("classes").Where("dosen_id IN (?)", staleIDs).Update("dosen_id", nil).Error

	// 2. Bersihkan foreign key relasi siswa terhapus
	_ = r.db.WithContext(ctx).Table("class_enrollments").Where("student_id IN (?)", staleIDs).Delete(nil).Error
	_ = r.db.WithContext(ctx).Table("student_grades").Where("student_id IN (?)", staleIDs).Delete(nil).Error
	_ = r.db.WithContext(ctx).Table("attendances").Where("student_id IN (?)", staleIDs).Delete(nil).Error

	// 3. Hapus akun usang
	res := r.db.WithContext(ctx).Table("accounts").Where("id IN (?)", staleIDs).Delete(nil)
	return res.RowsAffected, res.Error
}


