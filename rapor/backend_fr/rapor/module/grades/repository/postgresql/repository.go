package postgresql

import (
	"context"
	"strings"
	"time"

	"github.com/rapor/rapor-be/rapor/module/grades/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) domain.Repository {
	_ = db.AutoMigrate(
		&domain.GradeDeadline{},
		&domain.GradeLock{},
		&domain.GradeChangeLog{},
		&domain.ReportEndorsement{},
	)
	return &repository{db: db}
}

func (r *repository) FindAll(ctx context.Context, f domain.GradeFilter) ([]*domain.StudentGrade, error) {
	var list []*domain.StudentGrade
	q := r.db.WithContext(ctx).Model(&domain.StudentGrade{}).Order("class_name, student_name")
	var classVariants []string
	var classIDCandidates []string
	if f.ClassName != "" {
		cleaned := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(f.ClassName, "Kelas"), "kelas"))
		cleaned = strings.TrimSpace(cleaned)
		classVariants = append(classVariants, f.ClassName, cleaned, "Kelas "+cleaned)

		roman := cleaned
		if strings.HasPrefix(roman, "7") {
			roman = strings.Replace(roman, "7", "VII-", 1)
		} else if strings.HasPrefix(roman, "8") {
			roman = strings.Replace(roman, "8", "VIII-", 1)
		} else if strings.HasPrefix(roman, "9") {
			roman = strings.Replace(roman, "9", "IX-", 1)
		}
		classVariants = append(classVariants, roman, "Kelas "+roman, strings.ReplaceAll(roman, "-", " "), "Kelas "+strings.ReplaceAll(roman, "-", " "))

		arabic := cleaned
		if strings.HasPrefix(arabic, "VII-") {
			arabic = strings.Replace(arabic, "VII-", "7", 1)
		} else if strings.HasPrefix(arabic, "VIII-") {
			arabic = strings.Replace(arabic, "VIII-", "8", 1)
		} else if strings.HasPrefix(arabic, "IX-") {
			arabic = strings.Replace(arabic, "IX-", "9", 1)
		} else if strings.HasPrefix(arabic, "VII ") {
			arabic = strings.Replace(arabic, "VII ", "7", 1)
		} else if strings.HasPrefix(arabic, "VIII ") {
			arabic = strings.Replace(arabic, "VIII ", "8", 1)
		} else if strings.HasPrefix(arabic, "IX ") {
			arabic = strings.Replace(arabic, "IX ", "9", 1)
		}
		classVariants = append(classVariants, arabic, "Kelas "+arabic)

		classIDCandidates = []string{
			"class-" + strings.ToLower(cleaned),
			"class-" + strings.ToLower(strings.ReplaceAll(cleaned, " ", "-")),
			"class-" + strings.ToLower(f.ClassName),
		}

		q = q.Where("class_name IN (?)", classVariants)
	}
	if f.SubjectCode != "" {
		q = q.Where("subject_code = ?", f.SubjectCode)
	}
	if f.AssessmentType != "" {
		q = q.Where("assessment_type = ?", f.AssessmentType)
	}
	if f.AcademicYear != "" {
		q = q.Where("academic_year = ?", f.AcademicYear)
	}
	if f.Semester != "" {
		q = q.Where("semester = ?", f.Semester)
	}
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}

	// Jika f.ClassName terisi, pastikan seluruh siswa aktif di kelas tersebut tampil
	if f.ClassName != "" {
		var students []struct {
			ID       string  `gorm:"column:id"`
			PersonID *string `gorm:"column:person_id"`
			NISN     string  `gorm:"column:nisn"`
			FullName string  `gorm:"column:full_name"`
		}

		err := r.db.WithContext(ctx).Table("accounts").
			Select("accounts.id, accounts.person_id, accounts.nisn, accounts.full_name").
			Joins("LEFT JOIN class_enrollments ON class_enrollments.student_id = accounts.id").
			Where("(class_enrollments.class_id IN (?) OR accounts.class_name IN (?)) AND accounts.role_id = ? AND accounts.is_active = true",
				classIDCandidates, classVariants, "role-siswa").
			Group("accounts.id, accounts.person_id, accounts.nisn, accounts.full_name").
			Order("accounts.full_name ASC").
			Find(&students).Error

		if err == nil && len(students) > 0 {
			if f.SubjectCode != "" {
				gradeMap := make(map[string]*domain.StudentGrade)
				for _, g := range list {
					gradeMap[g.StudentID] = g
				}

				var mergedList []*domain.StudentGrade
				for _, s := range students {
					if g, exists := gradeMap[s.ID]; exists {
						mergedList = append(mergedList, g)
					} else {
						mergedList = append(mergedList, &domain.StudentGrade{
							StudentID:      s.ID,
							PersonID:       s.PersonID,
							NISN:           s.NISN,
							StudentName:    s.FullName,
							ClassName:      f.ClassName,
							SubjectCode:    f.SubjectCode,
							AssessmentType: f.AssessmentType,
							AcademicYear:   f.AcademicYear,
							Semester:       f.Semester,
							Score:          -1,
							Predicate:      "-",
							Description:    "",
						})
					}
				}
				return mergedList, nil
			} else {
				// Query tanpa subject_code (misal untuk rekap wali kelas)
				studentWithGrade := make(map[string]bool)
				for _, g := range list {
					studentWithGrade[g.StudentID] = true
				}

				mergedList := append([]*domain.StudentGrade{}, list...)
				for _, s := range students {
					if !studentWithGrade[s.ID] {
						mergedList = append(mergedList, &domain.StudentGrade{
							StudentID:      s.ID,
							PersonID:       s.PersonID,
							NISN:           s.NISN,
							StudentName:    s.FullName,
							ClassName:      f.ClassName,
							SubjectCode:    "",
							AssessmentType: f.AssessmentType,
							AcademicYear:   f.AcademicYear,
							Semester:       f.Semester,
							Score:          -1,
							Predicate:      "-",
							Description:    "",
						})
					}
				}
				return mergedList, nil
			}
		}
	}

	return list, nil
}

func (r *repository) Upsert(ctx context.Context, grades []*domain.StudentGrade) error {
	if len(grades) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "student_id"}, {Name: "subject_code"}, {Name: "assessment_type"},
			{Name: "academic_year"}, {Name: "semester"},
		},
		DoUpdates: clause.AssignmentColumns([]string{
			"score", "predicate", "description", "student_name", "nisn", "person_id",
			"class_name", "subject_name", "teacher_id", "teacher_name", "updated_at",
		}),
	}).Create(&grades).Error
}

func (r *repository) GetSummary(ctx context.Context, kkm float64) (*domain.AcademicSummary, error) {
	db := r.db.WithContext(ctx)
	s := &domain.AcademicSummary{KKM: kkm, GeneratedAt: time.Now()}

	// Total Siswa & Guru Aktif dari accounts
	var totalStudents int64
	db.Table("accounts").Where("role_id = ? AND is_active = true", "role-siswa").Count(&totalStudents)
	s.TotalStudents = totalStudents

	var totalTeachers int64
	db.Table("accounts").Where("role_id = ? AND is_active = true", "role-guru").Count(&totalTeachers)
	s.TotalTeachers = totalTeachers

	// Ringkasan umum nilai
	var overall struct {
		Total    int64
		Students int64
		Avg      float64
		Below    int64
	}
	if err := db.Table("student_grades").Select(
		"COUNT(*) AS total, COUNT(DISTINCT student_id) AS students, "+
			"COALESCE(ROUND(AVG(score)::numeric, 2), 0) AS avg, "+
			"COUNT(*) FILTER (WHERE score < ?) AS below", kkm,
	).Scan(&overall).Error; err != nil {
		return nil, err
	}
	s.TotalGrades, s.TotalGradedStudents, s.AverageScore, s.BelowKKM =
		overall.Total, overall.Students, overall.Avg, overall.Below


	// Distribusi predikat
	var preds []struct {
		Predicate string
		Count     int64
	}
	db.Table("student_grades").Select("predicate, COUNT(*) AS count").Group("predicate").Scan(&preds)
	for _, p := range preds {
		switch p.Predicate {
		case "A":
			s.PredicateDistribution.A = p.Count
		case "B":
			s.PredicateDistribution.B = p.Count
		case "C":
			s.PredicateDistribution.C = p.Count
		case "D":
			s.PredicateDistribution.D = p.Count
		}
	}

	// Per mapel
	db.Table("student_grades").
		Select("subject_code, MAX(subject_name) AS subject_name, ROUND(AVG(score)::numeric, 2) AS average_score, COUNT(*) AS graded_count").
		Group("subject_code").Order("average_score DESC").Scan(&s.Subjects)

	// Per kelas
	db.Table("student_grades").
		Select("class_name, ROUND(AVG(score)::numeric, 2) AS average_score, COUNT(*) AS graded_count, "+
			"COUNT(*) FILTER (WHERE score < ?) AS below_kkm", kkm).
		Group("class_name").Order("class_name").Scan(&s.Classes)

	// Progres input guru: gabungkan penugasan di classes dengan capaian di student_grades
	type teacherAssignment struct {
		TeacherID   string `gorm:"column:teacher_id"`
		TeacherName string `gorm:"column:teacher_name"`
		CourseCode  string `gorm:"column:course_code"`
		CourseName  string `gorm:"column:course_name"`
		ClassCode   string `gorm:"column:class_code"`
	}
	var assigns []teacherAssignment
	_ = db.Table("classes cl").
		Select("cl.dosen_id AS teacher_id, accounts.full_name AS teacher_name, courses.code AS course_code, courses.name AS course_name, cl.class_code").
		Joins("JOIN accounts ON accounts.id = cl.dosen_id").
		Joins("JOIN courses ON courses.id = cl.course_id").
		Find(&assigns).Error

	progressMap := make(map[string]*domain.TeacherProgress)
	for _, as := range assigns {
		key := as.TeacherID + "_" + as.CourseCode
		if _, exists := progressMap[key]; !exists {
			progressMap[key] = &domain.TeacherProgress{
				TeacherID:   as.TeacherID,
				TeacherName: as.TeacherName,
				SubjectCode: as.CourseCode,
				SubjectName: as.CourseName,
				Classes:     []string{},
			}
		}
		progressMap[key].Classes = append(progressMap[key].Classes, as.ClassCode)
	}

	for _, tp := range progressMap {
		var stat struct {
			GradedCount  int64     `gorm:"column:graded_count"`
			AverageScore float64   `gorm:"column:average_score"`
			LastUpdated  time.Time `gorm:"column:last_updated"`
		}
		_ = db.Table("student_grades").
			Select("COUNT(*) AS graded_count, COALESCE(ROUND(AVG(score)::numeric, 2), 0) AS average_score, COALESCE(MAX(updated_at), NOW()) AS last_updated").
			Where("teacher_id = ? AND subject_code = ?", tp.TeacherID, tp.SubjectCode).
			Scan(&stat).Error

		tp.GradedCount = stat.GradedCount
		tp.AverageScore = stat.AverageScore
		tp.LastUpdated = stat.LastUpdated
		s.Teachers = append(s.Teachers, *tp)
	}

	// Fallback jika belum ada penugasan di classes
	if len(s.Teachers) == 0 {
		db.Table("student_grades").
			Select("COALESCE(teacher_id, '') AS teacher_id, COALESCE(MAX(teacher_name), 'Guru') AS teacher_name, " +
				"subject_code, MAX(subject_name) AS subject_name, " +
				"STRING_AGG(DISTINCT class_name, ',') AS classes_raw, COUNT(*) AS graded_count, " +
				"ROUND(AVG(score)::numeric, 2) AS average_score, MAX(updated_at) AS last_updated").
			Group("teacher_id, subject_code").Order("last_updated DESC").Scan(&s.Teachers)
		for i := range s.Teachers {
			if s.Teachers[i].ClassesRaw != "" {
				s.Teachers[i].Classes = strings.Split(s.Teachers[i].ClassesRaw, ",")
			} else {
				s.Teachers[i].Classes = []string{}
			}
		}
	}

	// Presensi kelas hari ini
	var att []struct {
		Status string
		Count  int64
	}
	db.Table("attendances a").
		Select("a.status, COUNT(*) AS count").
		Joins("JOIN class_sessions cs ON cs.id = a.session_id").
		Where("cs.date = CURRENT_DATE").
		Group("a.status").Scan(&att)
	for _, a := range att {
		switch a.Status {
		case "HADIR":
			s.AttendanceToday.Hadir = a.Count
		case "TERLAMBAT":
			s.AttendanceToday.Terlambat = a.Count
		case "SAKIT":
			s.AttendanceToday.Sakit = a.Count
		case "IZIN":
			s.AttendanceToday.Izin = a.Count
		case "ALPHA":
			s.AttendanceToday.Alpha = a.Count
		}
	}
	db.Table("class_sessions").Where("date = CURRENT_DATE").Count(&s.AttendanceToday.Sessions)

	// 5 siswa dengan rerata tertinggi
	db.Table("student_grades").
		Select("student_id, MAX(student_name) AS student_name, MAX(nisn) AS nisn, MAX(class_name) AS class_name, " +
			"ROUND(AVG(score)::numeric, 2) AS average_score, COUNT(DISTINCT subject_code) AS subject_count").
		Group("student_id").Order("average_score DESC").Limit(5).Scan(&s.TopStudents)

	// Siswa dengan minimal satu nilai di bawah KKM
	db.Table("student_grades").
		Select("student_id, MAX(student_name) AS student_name, MAX(nisn) AS nisn, MAX(class_name) AS class_name, "+
			"STRING_AGG(subject_name || ' (' || TRIM(TO_CHAR(score, 'FM990.##')) || ')', ', ' ORDER BY score) AS subjects_raw, "+
			"MIN(score) AS lowest_score").
		Where("score < ?", kkm).
		Group("student_id").Order("lowest_score ASC").Limit(10).Scan(&s.RemedialStudents)
	for i := range s.RemedialStudents {
		s.RemedialStudents[i].Subjects = strings.Split(s.RemedialStudents[i].SubjectsRaw, ", ")
	}
	if s.TopStudents == nil {
		s.TopStudents = []domain.StudentRank{}
	}
	if s.RemedialStudents == nil {
		s.RemedialStudents = []domain.RemedialStudent{}
	}

	if s.Subjects == nil {
		s.Subjects = []domain.SubjectStat{}
	}
	if s.Classes == nil {
		s.Classes = []domain.ClassStat{}
	}
	if s.Teachers == nil {
		s.Teachers = []domain.TeacherProgress{}
	}
	return s, nil
}

func (r *repository) GetDeadlines(ctx context.Context) ([]*domain.GradeDeadline, error) {
	var list []*domain.GradeDeadline
	err := r.db.WithContext(ctx).Table("grade_deadlines").Order("deadline_at ASC").Find(&list).Error
	if err != nil || len(list) == 0 {
		defaultList := []*domain.GradeDeadline{
			{
				ID:           "dl-pts-1",
				Type:         "PTS",
				Title:        "Penilaian Tengah Semester (PTS) Ganjil",
				DeadlineAt:   time.Now().AddDate(0, 0, 7),
				IsOpen:       true,
				Announcement: "Batas akhir penginputan nilai PTS oleh guru mata pelajaran di SMPN 1 Prambon. Mohon selesaikan sebelum tenggat waktu.",
				AcademicYear: "2026/2027",
				Semester:     "1",
				UpdatedAt:    time.Now(),
			},
			{
				ID:           "dl-uas-1",
				Type:         "UAS",
				Title:        "Penilaian Akhir Semester (PAS/SAS) Ganjil",
				DeadlineAt:   time.Now().AddDate(0, 1, 0),
				IsOpen:       true,
				Announcement: "Batas akhir penginputan nilai akhir semester untuk penerbitan dan cetak buku rapor.",
				AcademicYear: "2026/2027",
				Semester:     "1",
				UpdatedAt:    time.Now(),
			},
		}
		for _, dl := range defaultList {
			_ = r.db.WithContext(ctx).Table("grade_deadlines").Save(dl).Error
		}
		return defaultList, nil
	}
	return list, nil
}

func (r *repository) SaveDeadline(ctx context.Context, dl *domain.GradeDeadline) error {
	dl.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Table("grade_deadlines").Save(dl).Error
}

// ===== Kunci Nilai =====

func (r *repository) GetLock(ctx context.Context, className, subjectCode, assessmentType, academicYear, semester string) (*domain.GradeLock, error) {
	var lock domain.GradeLock
	q := r.db.WithContext(ctx).Table("grade_locks").
		Where("class_name = ? AND (subject_code = ? OR subject_code = 'ALL') AND assessment_type = ? AND academic_year = ? AND semester = ?",
			className, subjectCode, assessmentType, academicYear, semester).
		Order("subject_code DESC") // Prioritaskan spesifik subject_code dibanding 'ALL'

	err := q.First(&lock).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &lock, nil
}

func (r *repository) SetLock(ctx context.Context, lock *domain.GradeLock) error {
	lock.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "class_name"}, {Name: "subject_code"}, {Name: "assessment_type"},
			{Name: "academic_year"}, {Name: "semester"},
		},
		DoUpdates: clause.AssignmentColumns([]string{
			"is_locked", "locked_by_id", "locked_by_name", "locked_at", "notes", "updated_at",
		}),
	}).Create(lock).Error
}

func (r *repository) ListLocks(ctx context.Context, className, academicYear, semester string) ([]*domain.GradeLock, error) {
	var list []*domain.GradeLock
	q := r.db.WithContext(ctx).Table("grade_locks")
	if className != "" {
		q = q.Where("class_name = ?", className)
	}
	if academicYear != "" {
		q = q.Where("academic_year = ?", academicYear)
	}
	if semester != "" {
		q = q.Where("semester = ?", semester)
	}
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// ===== Log Perubahan Nilai =====

func (r *repository) CreateChangeLogs(ctx context.Context, logs []*domain.GradeChangeLog) error {
	if len(logs) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Table("grade_change_logs").Create(&logs).Error
}

func (r *repository) GetChangeLogs(ctx context.Context, f domain.GradeChangeLogFilter) ([]*domain.GradeChangeLog, error) {
	var list []*domain.GradeChangeLog
	q := r.db.WithContext(ctx).Table("grade_change_logs").Order("created_at DESC").Limit(100)
	if f.StudentID != "" {
		q = q.Where("student_id = ?", f.StudentID)
	}
	if f.ClassName != "" {
		q = q.Where("class_name = ?", f.ClassName)
	}
	if f.SubjectCode != "" {
		q = q.Where("subject_code = ?", f.SubjectCode)
	}
	if f.AssessmentType != "" {
		q = q.Where("assessment_type = ?", f.AssessmentType)
	}
	if f.AcademicYear != "" {
		q = q.Where("academic_year = ?", f.AcademicYear)
	}
	if f.Semester != "" {
		q = q.Where("semester = ?", f.Semester)
	}
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// ===== Pengesahan Rapor Kepala Sekolah =====

func (r *repository) GetEndorsements(ctx context.Context, academicYear, semester string) ([]*domain.ReportEndorsement, error) {
	var list []*domain.ReportEndorsement
	q := r.db.WithContext(ctx).Table("report_endorsements").Order("class_name ASC")
	if academicYear != "" {
		q = q.Where("academic_year = ?", academicYear)
	}
	if semester != "" {
		q = q.Where("semester = ?", semester)
	}
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *repository) SaveEndorsement(ctx context.Context, endorsement *domain.ReportEndorsement) error {
	endorsement.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "class_name"}, {Name: "academic_year"}, {Name: "semester"}, {Name: "assessment_type"},
		},
		DoUpdates: clause.AssignmentColumns([]string{
			"principal_id", "principal_name", "principal_nip", "signature_type", "signature_data",
			"status", "notes", "signed_at", "updated_at",
		}),
	}).Create(endorsement).Error
}

// ===== Backup & Restore =====

func (r *repository) ExportBackup(ctx context.Context) (*domain.BackupData, error) {
	db := r.db.WithContext(ctx)

	var grades []*domain.StudentGrade
	_ = db.Table("student_grades").Find(&grades).Error

	var locks []*domain.GradeLock
	_ = db.Table("grade_locks").Find(&locks).Error

	var logs []*domain.GradeChangeLog
	_ = db.Table("grade_change_logs").Find(&logs).Error

	var deadlines []*domain.GradeDeadline
	_ = db.Table("grade_deadlines").Find(&deadlines).Error

	var endorsements []*domain.ReportEndorsement
	_ = db.Table("report_endorsements").Find(&endorsements).Error

	return &domain.BackupData{
		Version:      "1.0",
		ExportedAt:   time.Now(),
		Grades:       grades,
		Locks:        locks,
		Logs:         logs,
		Deadlines:    deadlines,
		Endorsements: endorsements,
	}, nil
}

func (r *repository) RestoreBackup(ctx context.Context, data *domain.BackupData) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if len(data.Grades) > 0 {
			if err := tx.Clauses(clause.OnConflict{
				Columns: []clause.Column{
					{Name: "student_id"}, {Name: "subject_code"}, {Name: "assessment_type"},
					{Name: "academic_year"}, {Name: "semester"},
				},
				DoUpdates: clause.AssignmentColumns([]string{
					"score", "predicate", "description", "student_name", "nisn", "person_id",
					"class_name", "subject_name", "teacher_id", "teacher_name", "updated_at",
				}),
			}).Create(&data.Grades).Error; err != nil {
				return err
			}
		}

		if len(data.Locks) > 0 {
			if err := tx.Clauses(clause.OnConflict{
				Columns: []clause.Column{
					{Name: "class_name"}, {Name: "subject_code"}, {Name: "assessment_type"},
					{Name: "academic_year"}, {Name: "semester"},
				},
				DoUpdates: clause.AssignmentColumns([]string{
					"is_locked", "locked_by_id", "locked_by_name", "locked_at", "notes", "updated_at",
				}),
			}).Create(&data.Locks).Error; err != nil {
				return err
			}
		}

		if len(data.Logs) > 0 {
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&data.Logs).Error; err != nil {
				return err
			}
		}

		if len(data.Deadlines) > 0 {
			for _, dl := range data.Deadlines {
				if err := tx.Table("grade_deadlines").Save(dl).Error; err != nil {
					return err
				}
			}
		}

		if len(data.Endorsements) > 0 {
			for _, end := range data.Endorsements {
				if err := tx.Clauses(clause.OnConflict{
					Columns: []clause.Column{
						{Name: "class_name"}, {Name: "academic_year"}, {Name: "semester"}, {Name: "assessment_type"},
					},
					DoUpdates: clause.AssignmentColumns([]string{
						"principal_id", "principal_name", "principal_nip", "signature_type", "signature_data",
						"status", "notes", "signed_at", "updated_at",
					}),
				}).Create(end).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (r *repository) DeleteGrades(ctx context.Context, f domain.GradeFilter, all bool) (int64, error) {
	q := r.db.WithContext(ctx).Table("student_grades")
	if !all {
		if f.ClassName != "" {
			q = q.Where("class_name = ?", f.ClassName)
		}
		if f.SubjectCode != "" {
			q = q.Where("subject_code = ?", f.SubjectCode)
		}
		if f.AssessmentType != "" {
			q = q.Where("assessment_type = ?", f.AssessmentType)
		}
		if f.AcademicYear != "" {
			q = q.Where("academic_year = ?", f.AcademicYear)
		}
		if f.Semester != "" {
			q = q.Where("semester = ?", f.Semester)
		}
		if f.TeacherID != "" {
			q = q.Where("teacher_id = ?", f.TeacherID)
		}
	}
	res := q.Delete(nil)
	return res.RowsAffected, res.Error
}

func (r *repository) DeleteByIDs(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Table("student_grades").Where("id IN (?)", ids).Delete(nil).Error
}
