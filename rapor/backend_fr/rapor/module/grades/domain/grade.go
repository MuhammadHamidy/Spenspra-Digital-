package domain

import (
	"context"
	"time"
)

type StudentGrade struct {
	ID             string    `json:"id" gorm:"column:id;primaryKey"`
	StudentID      string    `json:"student_id" gorm:"column:student_id"`
	PersonID       *string   `json:"person_id,omitempty" gorm:"column:person_id"`
	NISN           string    `json:"nisn" gorm:"column:nisn"`
	StudentName    string    `json:"student_name" gorm:"column:student_name"`
	ClassName      string    `json:"class_name" gorm:"column:class_name"`
	SubjectCode    string    `json:"subject_code" gorm:"column:subject_code"`
	SubjectName    string    `json:"subject_name" gorm:"column:subject_name"`
	AssessmentType string    `json:"assessment_type" gorm:"column:assessment_type"`
	AcademicYear   string    `json:"academic_year" gorm:"column:academic_year"`
	Semester       string    `json:"semester" gorm:"column:semester"`
	Score          float64   `json:"score" gorm:"column:score"`
	Predicate      string    `json:"predicate" gorm:"column:predicate"`
	Description    string    `json:"description" gorm:"column:description"`
	TeacherID      string    `json:"teacher_id" gorm:"column:teacher_id"`
	TeacherName    string    `json:"teacher_name" gorm:"column:teacher_name"`
	CreatedAt      time.Time `json:"created_at" gorm:"column:created_at"`
	UpdatedAt      time.Time `json:"updated_at" gorm:"column:updated_at"`
}

func (StudentGrade) TableName() string { return "student_grades" }

type GradeFilter struct {
	ClassName      string
	SubjectCode    string
	AssessmentType string
	AcademicYear   string
	Semester       string
	TeacherID      string
}

type GradeInput struct {
	StudentID   string   `json:"student_id"`
	PersonID    *string  `json:"person_id,omitempty"`
	NISN        string   `json:"nisn"`
	StudentName string   `json:"student_name"`
	Score       *float64 `json:"score"`
	Description string   `json:"description"`
}

type BulkGradeRequest struct {
	ClassName      string       `json:"class_name"`
	SubjectCode    string       `json:"subject_code"`
	SubjectName    string       `json:"subject_name"`
	AssessmentType string       `json:"assessment_type"`
	AcademicYear   string       `json:"academic_year"`
	Semester       string       `json:"semester"`
	TeacherID      string       `json:"teacher_id"`
	TeacherName    string       `json:"teacher_name"`
	Grades         []GradeInput `json:"grades"`
}

// ===== Monitoring (Kepala Sekolah) =====

type SubjectStat struct {
	SubjectCode  string  `json:"subject_code"`
	SubjectName  string  `json:"subject_name"`
	AverageScore float64 `json:"average_score"`
	GradedCount  int64   `json:"graded_count"`
}

type ClassStat struct {
	ClassName    string  `json:"class_name"`
	AverageScore float64 `json:"average_score"`
	GradedCount  int64   `json:"graded_count"`
	BelowKKM     int64   `json:"below_kkm"`
}

type TeacherProgress struct {
	TeacherID    string    `json:"teacher_id"`
	TeacherName  string    `json:"teacher_name"`
	SubjectCode  string    `json:"subject_code"`
	SubjectName  string    `json:"subject_name"`
	Classes      []string  `json:"classes" gorm:"-"`
	ClassesRaw   string    `json:"-" gorm:"column:classes_raw"`
	GradedCount  int64     `json:"graded_count"`
	AverageScore float64   `json:"average_score"`
	LastUpdated  time.Time `json:"last_updated"`
}

type PredicateDistribution struct {
	A int64 `json:"A"`
	B int64 `json:"B"`
	C int64 `json:"C"`
	D int64 `json:"D"`
}

type AttendanceToday struct {
	Hadir     int64 `json:"hadir"`
	Terlambat int64 `json:"terlambat"`
	Sakit     int64 `json:"sakit"`
	Izin      int64 `json:"izin"`
	Alpha     int64 `json:"alpha"`
	Sessions  int64 `json:"sessions"`
}

type StudentRank struct {
	StudentID    string  `json:"student_id"`
	StudentName  string  `json:"student_name"`
	NISN         string  `json:"nisn"`
	ClassName    string  `json:"class_name"`
	AverageScore float64 `json:"average_score"`
	SubjectCount int64   `json:"subject_count"`
}

type RemedialStudent struct {
	StudentID   string   `json:"student_id"`
	StudentName string   `json:"student_name"`
	NISN        string   `json:"nisn"`
	ClassName   string   `json:"class_name"`
	Subjects    []string `json:"subjects" gorm:"-"`
	SubjectsRaw string   `json:"-" gorm:"column:subjects_raw"`
	LowestScore float64  `json:"lowest_score"`
}

type AcademicSummary struct {
	KKM                   float64               `json:"kkm"`
	TotalStudents         int64                 `json:"total_students"`
	TotalTeachers         int64                 `json:"total_teachers"`
	TotalGrades           int64                 `json:"total_grades"`
	TotalGradedStudents   int64                 `json:"total_graded_students"`
	AverageScore          float64               `json:"average_score"`
	BelowKKM              int64                 `json:"below_kkm"`
	PredicateDistribution PredicateDistribution `json:"predicate_distribution"`
	Subjects              []SubjectStat         `json:"subjects"`
	Classes               []ClassStat           `json:"classes"`
	Teachers              []TeacherProgress     `json:"teachers"`
	TopStudents           []StudentRank         `json:"top_students"`
	RemedialStudents      []RemedialStudent     `json:"remedial_students"`
	AttendanceToday       AttendanceToday       `json:"attendance_today"`
	GeneratedAt           time.Time             `json:"generated_at"`
}

type GradeDeadline struct {
	ID           string    `json:"id" gorm:"primaryKey;column:id;type:varchar(64)"`
	Type         string    `json:"type" gorm:"column:type;type:varchar(32)"` // "PTS" | "UAS"
	Title        string    `json:"title" gorm:"column:title;type:varchar(255)"`
	DeadlineAt   time.Time `json:"deadline_at" gorm:"column:deadline_at"`
	IsOpen       bool      `json:"is_open" gorm:"column:is_open;default:true"`
	Announcement string    `json:"announcement" gorm:"column:announcement;type:text"`
	AcademicYear string    `json:"academic_year" gorm:"column:academic_year;type:varchar(32)"`
	Semester     string    `json:"semester" gorm:"column:semester;type:varchar(16)"`
	UpdatedAt    time.Time `json:"updated_at" gorm:"column:updated_at"`
}

// ===== 1. Kunci Nilai (Grade Lock) =====
type GradeLock struct {
	ID             string    `json:"id" gorm:"primaryKey;column:id"`
	ClassName      string    `json:"class_name" gorm:"column:class_name"`
	SubjectCode    string    `json:"subject_code" gorm:"column:subject_code"`
	AssessmentType string    `json:"assessment_type" gorm:"column:assessment_type"`
	AcademicYear   string    `json:"academic_year" gorm:"column:academic_year"`
	Semester       string    `json:"semester" gorm:"column:semester"`
	IsLocked       bool      `json:"is_locked" gorm:"column:is_locked"`
	LockedByID     string    `json:"locked_by_id" gorm:"column:locked_by_id"`
	LockedByName   string    `json:"locked_by_name" gorm:"column:locked_by_name"`
	LockedAt       time.Time `json:"locked_at" gorm:"column:locked_at"`
	Notes          string    `json:"notes" gorm:"column:notes"`
	CreatedAt      time.Time `json:"created_at" gorm:"column:created_at"`
	UpdatedAt      time.Time `json:"updated_at" gorm:"column:updated_at"`
}

func (GradeLock) TableName() string { return "grade_locks" }

type LockRequest struct {
	ClassName      string `json:"class_name"`
	SubjectCode    string `json:"subject_code"`
	AssessmentType string `json:"assessment_type"`
	AcademicYear   string `json:"academic_year"`
	Semester       string `json:"semester"`
	IsLocked       bool   `json:"is_locked"`
	LockedByID     string `json:"locked_by_id"`
	LockedByName   string `json:"locked_by_name"`
	Notes          string `json:"notes"`
}

// ===== 2. Audit Trail Perubahan Nilai (Grade Change Log) =====
type GradeChangeLog struct {
	ID             string    `json:"id" gorm:"primaryKey;column:id"`
	StudentID      string    `json:"student_id" gorm:"column:student_id"`
	StudentName    string    `json:"student_name" gorm:"column:student_name"`
	ClassName      string    `json:"class_name" gorm:"column:class_name"`
	SubjectCode    string    `json:"subject_code" gorm:"column:subject_code"`
	SubjectName    string    `json:"subject_name" gorm:"column:subject_name"`
	AssessmentType string    `json:"assessment_type" gorm:"column:assessment_type"`
	AcademicYear   string    `json:"academic_year" gorm:"column:academic_year"`
	Semester       string    `json:"semester" gorm:"column:semester"`
	OldScore       *float64  `json:"old_score" gorm:"column:old_score"`
	NewScore       *float64  `json:"new_score" gorm:"column:new_score"`
	OldDescription string    `json:"old_description" gorm:"column:old_description"`
	NewDescription string    `json:"new_description" gorm:"column:new_description"`
	ChangedByID    string    `json:"changed_by_id" gorm:"column:changed_by_id"`
	ChangedByName  string    `json:"changed_by_name" gorm:"column:changed_by_name"`
	Reason         string    `json:"reason" gorm:"column:reason"`
	CreatedAt      time.Time `json:"created_at" gorm:"column:created_at"`
}

func (GradeChangeLog) TableName() string { return "grade_change_logs" }

type GradeChangeLogFilter struct {
	StudentID      string
	ClassName      string
	SubjectCode    string
	AssessmentType string
	AcademicYear   string
	Semester       string
}

// ===== 3. Pengesahan Rapor Kepala Sekolah (Report Endorsement) =====
type ReportEndorsement struct {
	ID             string    `json:"id" gorm:"primaryKey;column:id"`
	ClassName      string    `json:"class_name" gorm:"column:class_name"`
	AcademicYear   string    `json:"academic_year" gorm:"column:academic_year"`
	Semester       string    `json:"semester" gorm:"column:semester"`
	AssessmentType string    `json:"assessment_type" gorm:"column:assessment_type"`
	PrincipalID    string    `json:"principal_id" gorm:"column:principal_id"`
	PrincipalName  string    `json:"principal_name" gorm:"column:principal_name"`
	PrincipalNIP   string    `json:"principal_nip" gorm:"column:principal_nip"`
	SignatureType  string    `json:"signature_type" gorm:"column:signature_type"` // 'CANVAS' | 'UPLOAD'
	SignatureData  string    `json:"signature_data" gorm:"column:signature_data"`
	Status         string    `json:"status" gorm:"column:status"`                 // 'APPROVED' | 'DRAFT'
	Notes          string    `json:"notes" gorm:"column:notes"`
	SignedAt       time.Time `json:"signed_at" gorm:"column:signed_at"`
	CreatedAt      time.Time `json:"created_at" gorm:"column:created_at"`
	UpdatedAt      time.Time `json:"updated_at" gorm:"column:updated_at"`
}

func (ReportEndorsement) TableName() string { return "report_endorsements" }

// ===== 4. Rekapitulasi Kehadiran Siswa di Rapor =====
type StudentRaporAttendance struct {
	ID           string    `json:"id" gorm:"primaryKey;column:id;type:varchar(64)"`
	ClassName    string    `json:"class_name" gorm:"column:class_name;type:varchar(32);index:idx_rapor_att_class"`
	AcademicYear string    `json:"academic_year" gorm:"column:academic_year;type:varchar(16);index:idx_rapor_att_class"`
	Semester     string    `json:"semester" gorm:"column:semester;type:varchar(16);index:idx_rapor_att_class"`
	StudentID    string    `json:"student_id" gorm:"column:student_id;type:varchar(64);index:idx_rapor_att_student"`
	NISN         string    `json:"nisn" gorm:"column:nisn;type:varchar(32);index:idx_rapor_att_nisn"`
	StudentName  string    `json:"student_name" gorm:"column:student_name;type:varchar(255)"`
	Hadir        int       `json:"hadir" gorm:"column:hadir;default:0"`
	Sakit        int       `json:"sakit" gorm:"column:sakit;default:0"`
	Izin         int       `json:"izin" gorm:"column:izin;default:0"`
	Alfa         int       `json:"alfa" gorm:"column:alfa;default:0"`
	CreatedAt    time.Time `json:"created_at" gorm:"column:created_at"`
	UpdatedAt    time.Time `json:"updated_at" gorm:"column:updated_at"`
}

func (StudentRaporAttendance) TableName() string { return "student_rapor_attendances" }

type StudentRaporAttendanceItem struct {
	StudentID   string `json:"student_id"`
	NISN        string `json:"nisn"`
	StudentName string `json:"student_name"`
	Hadir       int    `json:"hadir"`
	Sakit       int    `json:"sakit"`
	Izin        int    `json:"izin"`
	Alfa        int    `json:"alfa"`
}

type BulkRaporAttendanceRequest struct {
	ClassName    string                       `json:"class_name"`
	AcademicYear string                       `json:"academic_year"`
	Semester     string                       `json:"semester"`
	Attendances  []StudentRaporAttendanceItem `json:"attendances"`
}

// ===== 5. Backup & Restore Data e-Rapor =====
type BackupData struct {
	Version      string                    `json:"version"`
	ExportedAt   time.Time                 `json:"exported_at"`
	Grades       []*StudentGrade           `json:"grades"`
	Locks        []*GradeLock              `json:"locks"`
	Logs         []*GradeChangeLog         `json:"logs"`
	Deadlines    []*GradeDeadline          `json:"deadlines"`
	Endorsements []*ReportEndorsement      `json:"endorsements"`
	Attendances  []*StudentRaporAttendance `json:"attendances,omitempty"`
}

type Repository interface {
	FindAll(ctx context.Context, f GradeFilter) ([]*StudentGrade, error)
	Upsert(ctx context.Context, grades []*StudentGrade) error
	GetSummary(ctx context.Context, kkm float64) (*AcademicSummary, error)
	GetDeadlines(ctx context.Context) ([]*GradeDeadline, error)
	SaveDeadline(ctx context.Context, dl *GradeDeadline) error

	// Kunci Nilai & Log
	GetLock(ctx context.Context, className, subjectCode, assessmentType, academicYear, semester string) (*GradeLock, error)
	SetLock(ctx context.Context, lock *GradeLock) error
	ListLocks(ctx context.Context, className, academicYear, semester string) ([]*GradeLock, error)
	CreateChangeLogs(ctx context.Context, logs []*GradeChangeLog) error
	GetChangeLogs(ctx context.Context, f GradeChangeLogFilter) ([]*GradeChangeLog, error)

	// Pengesahan Rapor
	GetEndorsements(ctx context.Context, academicYear, semester string) ([]*ReportEndorsement, error)
	SaveEndorsement(ctx context.Context, endorsement *ReportEndorsement) error

	// Rekap Kehadiran Rapor
	GetRaporAttendances(ctx context.Context, className, academicYear, semester string) ([]*StudentRaporAttendance, error)
	SaveRaporAttendances(ctx context.Context, attendances []*StudentRaporAttendance) error

	// Backup & Restore
	ExportBackup(ctx context.Context) (*BackupData, error)
	RestoreBackup(ctx context.Context, data *BackupData) error

	// Hapus / Reset Nilai
	DeleteGrades(ctx context.Context, f GradeFilter, all bool) (int64, error)
	DeleteByIDs(ctx context.Context, ids []string) error
}

type UseCase interface {
	List(ctx context.Context, f GradeFilter) ([]*StudentGrade, error)
	SaveBulk(ctx context.Context, req BulkGradeRequest, reason string) (int, error)
	GetSummary(ctx context.Context, kkm ...float64) (*AcademicSummary, error)
	GetDeadlines(ctx context.Context) ([]*GradeDeadline, error)
	SaveDeadline(ctx context.Context, dl *GradeDeadline) error

	// Kunci Nilai & Log
	GetLock(ctx context.Context, className, subjectCode, assessmentType, academicYear, semester string) (*GradeLock, error)
	SetLock(ctx context.Context, req LockRequest) (*GradeLock, error)
	ListLocks(ctx context.Context, className, academicYear, semester string) ([]*GradeLock, error)
	GetChangeLogs(ctx context.Context, f GradeChangeLogFilter) ([]*GradeChangeLog, error)

	// Pengesahan Rapor
	GetEndorsements(ctx context.Context, academicYear, semester string) ([]*ReportEndorsement, error)
	SaveEndorsement(ctx context.Context, endorsement *ReportEndorsement) error

	// Rekap Kehadiran Rapor
	GetRaporAttendances(ctx context.Context, className, academicYear, semester string) ([]*StudentRaporAttendance, error)
	SaveRaporAttendances(ctx context.Context, req BulkRaporAttendanceRequest) error

	// Backup & Restore
	ExportBackup(ctx context.Context) (*BackupData, error)
	RestoreBackup(ctx context.Context, data *BackupData) error

	// Hapus / Reset Nilai
	DeleteGrades(ctx context.Context, f GradeFilter, all bool) (int64, error)
}


