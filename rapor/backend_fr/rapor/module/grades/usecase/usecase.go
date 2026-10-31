package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rapor/rapor-be/rapor/module/grades/domain"
)

// KKM default sekolah (Kriteria Ketuntasan Minimal).
const DefaultKKM = 75.0

type useCase struct {
	repo domain.Repository
}

func NewUseCase(repo domain.Repository) domain.UseCase {
	return &useCase{repo: repo}
}

func Predicate(score float64) string {
	switch {
	case score >= 86:
		return "A"
	case score >= 76:
		return "B"
	case score >= 66:
		return "C"
	default:
		return "D"
	}
}

func (u *useCase) List(ctx context.Context, f domain.GradeFilter) ([]*domain.StudentGrade, error) {
	return u.repo.FindAll(ctx, f)
}

func (u *useCase) SaveBulk(ctx context.Context, req domain.BulkGradeRequest, reason string) (int, error) {
	if req.ClassName == "" || req.SubjectCode == "" {
		return 0, errors.New("class_name dan subject_code wajib diisi")
	}
	if req.AssessmentType == "" {
		req.AssessmentType = "PTS"
	}
	if req.AcademicYear == "" {
		req.AcademicYear = "2025/2026"
	}
	if req.Semester == "" {
		req.Semester = "GENAP"
	}
	req.AssessmentType = strings.ToUpper(req.AssessmentType)
	req.Semester = strings.ToUpper(req.Semester)
	if req.SubjectName == "" {
		req.SubjectName = req.SubjectCode
	}

	// 1. Cek apakah nilai telah dikunci
	lock, err := u.repo.GetLock(ctx, req.ClassName, req.SubjectCode, req.AssessmentType, req.AcademicYear, req.Semester)
	if err == nil && lock != nil && lock.IsLocked {
		return 0, fmt.Errorf("nilai untuk kelas %s mapel %s semester %s telah dikunci/final. Buka kunci untuk menyimpan perubahan",
			req.ClassName, req.SubjectCode, req.Semester)
	}

	// 2. Ambil nilai lama untuk mendeteksi perubahan (Audit Trail)
	existingList, _ := u.repo.FindAll(ctx, domain.GradeFilter{
		ClassName:      req.ClassName,
		SubjectCode:    req.SubjectCode,
		AssessmentType: req.AssessmentType,
		AcademicYear:   req.AcademicYear,
		Semester:       req.Semester,
	})
	existingMap := make(map[string]*domain.StudentGrade)
	for _, eg := range existingList {
		existingMap[eg.StudentID] = eg
	}

	now := time.Now()
	rows := make([]*domain.StudentGrade, 0, len(req.Grades))
	changeLogs := make([]*domain.GradeChangeLog, 0)
	deleteIDs := make([]string, 0)

	logReason := strings.TrimSpace(reason)
	if logReason == "" {
		logReason = "Pembaruan nilai oleh guru pengampu"
	}

	for _, g := range req.Grades {
		if g.StudentID == "" {
			continue
		}

		// Tangani jika nilai dikosongkan (Score nil atau < 0)
		if g.Score == nil || *g.Score < 0 {
			if old, exists := existingMap[g.StudentID]; exists && old.Score >= 0 {
				oldScoreVal := old.Score
				changeLogs = append(changeLogs, &domain.GradeChangeLog{
					ID:             uuid.New().String(),
					StudentID:      g.StudentID,
					StudentName:    g.StudentName,
					ClassName:      req.ClassName,
					SubjectCode:    req.SubjectCode,
					SubjectName:    req.SubjectName,
					AssessmentType: req.AssessmentType,
					AcademicYear:   req.AcademicYear,
					Semester:       req.Semester,
					OldScore:       &oldScoreVal,
					NewScore:       nil,
					OldDescription: old.Description,
					NewDescription: "",
					ChangedByID:    req.TeacherID,
					ChangedByName:  req.TeacherName,
					Reason:         "Nilai dikosongkan oleh guru pengampu",
					CreatedAt:      now,
				})

				if old.ID != "" {
					deleteIDs = append(deleteIDs, old.ID)
				}
			}
			continue
		}

		score := *g.Score
		if score < 0 || score > 100 {
			return 0, fmt.Errorf("nilai %s harus 0-100", g.StudentName)
		}

		// Deteksi apakah nilai berubah dari yang tersimpan
		if old, exists := existingMap[g.StudentID]; exists {
			if old.Score != score || old.Description != g.Description {
				var oldScorePtr *float64
				if old.Score >= 0 {
					oldScoreVal := old.Score
					oldScorePtr = &oldScoreVal
				}
				newScoreVal := score
				changeLogs = append(changeLogs, &domain.GradeChangeLog{
					ID:             uuid.New().String(),
					StudentID:      g.StudentID,
					StudentName:    g.StudentName,
					ClassName:      req.ClassName,
					SubjectCode:    req.SubjectCode,
					SubjectName:    req.SubjectName,
					AssessmentType: req.AssessmentType,
					AcademicYear:   req.AcademicYear,
					Semester:       req.Semester,
					OldScore:       oldScorePtr,
					NewScore:       &newScoreVal,
					OldDescription: old.Description,
					NewDescription: g.Description,
					ChangedByID:    req.TeacherID,
					ChangedByName:  req.TeacherName,
					Reason:         logReason,
					CreatedAt:      now,
				})
			}
		}

		gradeID := uuid.New().String()
		if old, exists := existingMap[g.StudentID]; exists && old.ID != "" {
			gradeID = old.ID
		}

		rows = append(rows, &domain.StudentGrade{
			ID:             gradeID,
			StudentID:      g.StudentID,
			PersonID:       g.PersonID,
			NISN:           g.NISN,
			StudentName:    g.StudentName,
			ClassName:      req.ClassName,
			SubjectCode:    req.SubjectCode,
			SubjectName:    req.SubjectName,
			AssessmentType: req.AssessmentType,
			AcademicYear:   req.AcademicYear,
			Semester:       req.Semester,
			Score:          score,
			Predicate:      Predicate(score),
			Description:    g.Description,
			TeacherID:      req.TeacherID,
			TeacherName:    req.TeacherName,
			CreatedAt:      now,
			UpdatedAt:      now,
		})
	}

	// 1. Hapus nilai siswa yang dikosongkan dari tabel student_grades
	if len(deleteIDs) > 0 {
		if err := u.repo.DeleteByIDs(ctx, deleteIDs); err != nil {
			return 0, fmt.Errorf("gagal menghapus nilai yang dikosongkan: %w", err)
		}
	}

	// 2. Simpan nilai yang valid (0 <= score <= 100)
	if len(rows) > 0 {
		if err := u.repo.Upsert(ctx, rows); err != nil {
			return 0, fmt.Errorf("gagal menyimpan nilai: %w", err)
		}
	}

	// 3. Simpan audit log perubahan jika ada
	if len(changeLogs) > 0 {
		_ = u.repo.CreateChangeLogs(ctx, changeLogs)
	}

	return len(rows), nil
}

func (u *useCase) GetSummary(ctx context.Context, kkm ...float64) (*domain.AcademicSummary, error) {
	targetKKM := DefaultKKM
	if len(kkm) > 0 && kkm[0] > 0 {
		targetKKM = kkm[0]
	}
	return u.repo.GetSummary(ctx, targetKKM)
}

func (u *useCase) GetDeadlines(ctx context.Context) ([]*domain.GradeDeadline, error) {
	return u.repo.GetDeadlines(ctx)
}

func (u *useCase) SaveDeadline(ctx context.Context, dl *domain.GradeDeadline) error {
	if dl.ID == "" {
		dl.ID = uuid.New().String()
	}
	return u.repo.SaveDeadline(ctx, dl)
}

// ===== Kunci Nilai & Log =====

func (u *useCase) GetLock(ctx context.Context, className, subjectCode, assessmentType, academicYear, semester string) (*domain.GradeLock, error) {
	if academicYear == "" {
		academicYear = "2025/2026"
	}
	if semester == "" {
		semester = "GENAP"
	}
	if assessmentType == "" {
		assessmentType = "PTS"
	}
	return u.repo.GetLock(ctx, className, subjectCode, assessmentType, academicYear, semester)
}

func (u *useCase) SetLock(ctx context.Context, req domain.LockRequest) (*domain.GradeLock, error) {
	if req.ClassName == "" {
		return nil, errors.New("class_name wajib diisi")
	}
	if req.SubjectCode == "" {
		req.SubjectCode = "ALL"
	}
	if req.AssessmentType == "" {
		req.AssessmentType = "PTS"
	}
	if req.AcademicYear == "" {
		req.AcademicYear = "2025/2026"
	}
	if req.Semester == "" {
		req.Semester = "GENAP"
	}

	lock := &domain.GradeLock{
		ID:             uuid.New().String(),
		ClassName:      req.ClassName,
		SubjectCode:    req.SubjectCode,
		AssessmentType: req.AssessmentType,
		AcademicYear:   req.AcademicYear,
		Semester:       req.Semester,
		IsLocked:       req.IsLocked,
		LockedByID:     req.LockedByID,
		LockedByName:   req.LockedByName,
		LockedAt:       time.Now(),
		Notes:          req.Notes,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := u.repo.SetLock(ctx, lock); err != nil {
		return nil, err
	}
	return lock, nil
}

func (u *useCase) ListLocks(ctx context.Context, className, academicYear, semester string) ([]*domain.GradeLock, error) {
	return u.repo.ListLocks(ctx, className, academicYear, semester)
}

func (u *useCase) GetChangeLogs(ctx context.Context, f domain.GradeChangeLogFilter) ([]*domain.GradeChangeLog, error) {
	return u.repo.GetChangeLogs(ctx, f)
}

// ===== Pengesahan Rapor Kepala Sekolah =====

func (u *useCase) GetEndorsements(ctx context.Context, academicYear, semester string) ([]*domain.ReportEndorsement, error) {
	if academicYear == "" {
		academicYear = "2025/2026"
	}
	if semester == "" {
		semester = "GENAP"
	}
	return u.repo.GetEndorsements(ctx, academicYear, semester)
}

func (u *useCase) SaveEndorsement(ctx context.Context, endorsement *domain.ReportEndorsement) error {
	if endorsement.ClassName == "" {
		return errors.New("class_name wajib diisi")
	}
	if endorsement.AcademicYear == "" {
		endorsement.AcademicYear = "2025/2026"
	}
	if endorsement.Semester == "" {
		endorsement.Semester = "GENAP"
	}
	if endorsement.AssessmentType == "" {
		endorsement.AssessmentType = "PTS"
	}
	if endorsement.ID == "" {
		endorsement.ID = uuid.New().String()
	}
	if endorsement.Status == "" {
		endorsement.Status = "APPROVED"
	}
	endorsement.SignedAt = time.Now()
	return u.repo.SaveEndorsement(ctx, endorsement)
}

// ===== Backup & Restore =====

func (u *useCase) ExportBackup(ctx context.Context) (*domain.BackupData, error) {
	return u.repo.ExportBackup(ctx)
}

func (u *useCase) RestoreBackup(ctx context.Context, data *domain.BackupData) error {
	if data == nil {
		return errors.New("data backup kosong")
	}
	return u.repo.RestoreBackup(ctx, data)
}

func (u *useCase) DeleteGrades(ctx context.Context, f domain.GradeFilter, all bool) (int64, error) {
	return u.repo.DeleteGrades(ctx, f, all)
}

// ===== Rekapitulasi Kehadiran Siswa di Rapor =====

func (u *useCase) GetRaporAttendances(ctx context.Context, className, academicYear, semester string) ([]*domain.StudentRaporAttendance, error) {
	return u.repo.GetRaporAttendances(ctx, className, academicYear, semester)
}

func (u *useCase) SaveRaporAttendances(ctx context.Context, req domain.BulkRaporAttendanceRequest) error {
	if req.ClassName == "" {
		return errors.New("class_name wajib diisi")
	}
	if req.AcademicYear == "" {
		req.AcademicYear = "2025/2026"
	}
	if req.Semester == "" {
		req.Semester = "GENAP"
	}
	req.Semester = strings.ToUpper(req.Semester)

	now := time.Now()
	cleanClass := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(req.ClassName, "Kelas"), "kelas"))
	if cleanClass == "" {
		cleanClass = req.ClassName
	}

	var list []*domain.StudentRaporAttendance
	for _, item := range req.Attendances {
		sid := strings.TrimSpace(item.StudentID)
		if sid == "" {
			sid = strings.TrimSpace(item.NISN)
		}
		if sid == "" {
			continue
		}

		uniqueID := fmt.Sprintf("att_%s_%s_%s_%s",
			cleanClass,
			strings.ReplaceAll(req.AcademicYear, "/", "_"),
			req.Semester,
			sid,
		)

		list = append(list, &domain.StudentRaporAttendance{
			ID:           uniqueID,
			ClassName:    cleanClass,
			AcademicYear: req.AcademicYear,
			Semester:     req.Semester,
			StudentID:    sid,
			NISN:         item.NISN,
			StudentName:  item.StudentName,
			Hadir:        item.Hadir,
			Sakit:        item.Sakit,
			Izin:         item.Izin,
			Alfa:         item.Alfa,
			CreatedAt:    now,
			UpdatedAt:    now,
		})
	}

	return u.repo.SaveRaporAttendances(ctx, list)
}


