package domain

import (
	"context"
)

// Repository interface untuk absensi & sesi sekolah
type Repository interface {
	// Sessions
	FindSessionByID(ctx context.Context, sessionID string) (*ClassSession, error)
	FindActiveSessionByClass(ctx context.Context, classID string) (*ClassSession, error)
	FindSessions(ctx context.Context, teacherID string, classID string, status string) ([]*ClassSession, error)
	CreateSession(ctx context.Context, session *ClassSession) error
	UpdateSession(ctx context.Context, session *ClassSession) error
	CloseSessionAndMarkAlpha(ctx context.Context, sessionID string) (*SessionSummary, error)

	// Students & Enrollments
	FindStudentsByClass(ctx context.Context, classID string) ([]*StudentProfile, error)
	FindStudentByQRToken(ctx context.Context, qrToken string) (*StudentProfile, error)
	FindStudentByPersonID(ctx context.Context, personID string) (*StudentProfile, error)
	FindStudentByID(ctx context.Context, studentID string) (*StudentProfile, error)
	IsStudentEnrolledInClass(ctx context.Context, studentID string, classID string) (bool, error)

	// Attendances
	InitializeAttendances(ctx context.Context, sessionID string, studentIDs []string) error
	FindAttendancesBySession(ctx context.Context, sessionID string) ([]*Attendance, error)
	FindAttendanceBySessionAndStudent(ctx context.Context, sessionID string, studentID string) (*Attendance, error)
	SaveAttendance(ctx context.Context, attendance *Attendance) error
	UpdateAttendanceStatus(ctx context.Context, sessionID string, studentID string, status string, notes string, editedBy *string) error
	GetSessionSummary(ctx context.Context, sessionID string) (*SessionSummary, error)

	// Monitoring
	GetLiveOpenSessions(ctx context.Context) ([]*ClassSession, error)

	// Courses (Mata Pelajaran)
	FindAllCourses(ctx context.Context) ([]*Course, error)
	CreateCourse(ctx context.Context, course *Course) error
	UpdateCourse(ctx context.Context, course *Course) error
	DeleteCourse(ctx context.Context, courseID string) error
	FindAllClasses(ctx context.Context) ([]*Class, error)
	CreateClass(ctx context.Context, class *Class) error
	UpdateClass(ctx context.Context, class *Class) error
	DeleteClass(ctx context.Context, classID string) error

	// Teachers (Guru Pengajar & Penetapan Walas)
	FindAllTeachers(ctx context.Context) ([]*Teacher, error)
	CreateTeacher(ctx context.Context, teacher *Teacher) error
	UpdateTeacher(ctx context.Context, teacher *Teacher) error
	DeleteTeacher(ctx context.Context, teacherID string) error

	// Students Master
	FindAllStudents(ctx context.Context, className string) ([]*Student, error)
	FindAllRombel(ctx context.Context) ([]string, error)

	// Master SSO Synchronization
	UpsertMasterPerson(ctx context.Context, personID, personType, fullName, nimNip, nisn, email, phone, className string, isActive bool) error
	PruneStaleAccounts(ctx context.Context, activePersonIDs, activeNIPs, activeNISNs []string) (int64, error)
}

