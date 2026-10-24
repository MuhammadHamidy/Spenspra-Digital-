package domain

import (
	"context"
	"time"
)

// LearningMaterial represents a study module / video / slide
type LearningMaterial struct {
	ID             string    `json:"id"`
	CourseID       string    `json:"course_id"`
	CourseName     string    `json:"course_name"`
	ClassCode      string    `json:"class_code"`
	TeacherID      string    `json:"teacher_id"`
	TeacherName    string    `json:"teacher_name"`
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	AttachmentURL  string    `json:"attachment_url"`
	AttachmentName string    `json:"attachment_name"`
	VideoURL       string    `json:"video_url"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// LearningAssignment represents an assignment given by teacher
type LearningAssignment struct {
	ID             string    `json:"id"`
	CourseID       string    `json:"course_id"`
	CourseName     string    `json:"course_name"`
	ClassCode      string    `json:"class_code"`
	TeacherID      string    `json:"teacher_id"`
	TeacherName    string    `json:"teacher_name"`
	Title          string    `json:"title"`
	Instructions   string    `json:"instructions"`
	AttachmentURL  string    `json:"attachment_url"`
	AttachmentName string    `json:"attachment_name"`
	DueDate        time.Time `json:"due_date"`
	MaxScore       int       `json:"max_score"`
	Status         string    `json:"status"` // ACTIVE | COMPLETED
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// AssignmentSubmission represents a student's submission for an assignment
type AssignmentSubmission struct {
	ID              string     `json:"id"`
	AssignmentID    string     `json:"assignment_id"`
	StudentID       string     `json:"student_id"`
	StudentName     string     `json:"student_name"`
	StudentNISN     string     `json:"student_nisn"`
	ClassCode       string     `json:"class_code"`
	SubmissionText  string     `json:"submission_text"`
	FileURL         string     `json:"file_url"`
	FileName        string     `json:"file_name"`
	SubmittedAt     time.Time  `json:"submitted_at"`
	Status          string     `json:"status"` // SUBMITTED | GRADED
	Score           *float64   `json:"score"`
	TeacherFeedback string     `json:"teacher_feedback"`
	GradedAt        *time.Time `json:"graded_at"`
	GradedBy        string     `json:"graded_by"`
}

// CBTExam represents an e-Exam session with anti-cheat configuration
type CBTExam struct {
	ID                 string     `json:"id"`
	CourseID           string     `json:"course_id"`
	CourseName         string     `json:"course_name"`
	ClassCode          string     `json:"class_code"`
	TeacherID          string     `json:"teacher_id"`
	TeacherName        string     `json:"teacher_name"`
	Title              string     `json:"title"`
	Description        string     `json:"description"`
	Token              string     `json:"token"`
	DurationMinutes    int        `json:"duration_minutes"`
	StartTime          *time.Time `json:"start_time"`
	EndTime            *time.Time `json:"end_time"`
	MaxViolations      int        `json:"max_violations"`
	RandomizeQuestions bool       `json:"randomize_questions"`
	RandomizeOptions   bool       `json:"randomize_options"`
	Status             string     `json:"status"` // ACTIVE | UPCOMING | CLOSED
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

// CBTQuestion represents an exam question (MCQ or Essay)
type CBTQuestion struct {
	ID             string    `json:"id"`
	ExamID         string    `json:"exam_id"`
	QuestionNumber int       `json:"question_number"`
	QuestionType   string    `json:"question_type"` // PILIHAN_GANDA | ESSAY
	QuestionText   string    `json:"question_text"`
	ImageURL       string    `json:"image_url"`
	OptionA        string    `json:"option_a"`
	OptionB        string    `json:"option_b"`
	OptionC        string    `json:"option_c"`
	OptionD        string    `json:"option_d"`
	OptionE        string    `json:"option_e"`
	CorrectAnswer  string    `json:"correct_answer,omitempty"` // hidden from student during exam
	ScoreWeight    float64   `json:"score_weight"`
	CreatedAt      time.Time `json:"created_at"`
}

// CBTStudentSession represents an active student test run
type CBTStudentSession struct {
	ID             string     `json:"id"`
	ExamID         string     `json:"exam_id"`
	StudentID      string     `json:"student_id"`
	StudentName    string     `json:"student_name"`
	StudentNISN    string     `json:"student_nisn"`
	ClassCode      string     `json:"class_code"`
	StartedAt      time.Time  `json:"started_at"`
	SubmittedAt    *time.Time `json:"submitted_at"`
	Status         string     `json:"status"` // IN_PROGRESS | LOCKED | SUBMITTED
	ViolationCount int        `json:"violation_count"`
	Score          float64    `json:"score"`
	DeviceInfo     string     `json:"device_info"`
	IPAddress      string     `json:"ip_address"`
}

// CBTViolationLog represents an anti-cheat proctoring event
type CBTViolationLog struct {
	ID              string    `json:"id"`
	SessionID       string    `json:"session_id"`
	StudentID       string    `json:"student_id"`
	ViolationType   string    `json:"violation_type"` // TAB_SWITCH | WINDOW_BLUR | FULLSCREEN_EXIT | DEVTOOLS_OPEN
	Details         string    `json:"details"`
	DurationSeconds int       `json:"duration_seconds"`
	CreatedAt       time.Time `json:"created_at"`
}

// Repository Interface
type Repository interface {
	// Materials
	ListMaterials(ctx context.Context, classCode string) ([]LearningMaterial, error)
	CreateMaterial(ctx context.Context, m *LearningMaterial) error
	DeleteMaterial(ctx context.Context, id string) error

	// Assignments
	ListAssignments(ctx context.Context, classCode string) ([]LearningAssignment, error)
	CreateAssignment(ctx context.Context, a *LearningAssignment) error
	UpdateAssignment(ctx context.Context, id string, a *LearningAssignment) error
	DeleteAssignment(ctx context.Context, id string) error
	ListSubmissions(ctx context.Context, assignmentID string) ([]AssignmentSubmission, error)
	SaveSubmission(ctx context.Context, s *AssignmentSubmission) error
	GradeSubmission(ctx context.Context, submissionID string, score float64, feedback string, graderID string) error

	// CBT Exams
	ListExams(ctx context.Context, classCode string) ([]CBTExam, error)
	GetExamByID(ctx context.Context, id string) (*CBTExam, error)
	CreateExam(ctx context.Context, e *CBTExam) error
	UpdateExam(ctx context.Context, id string, e *CBTExam) error
	DeleteExam(ctx context.Context, id string) error
	ListQuestions(ctx context.Context, examID string, includeAnswer bool) ([]CBTQuestion, error)
	SaveQuestion(ctx context.Context, q *CBTQuestion) error
	SaveQuestions(ctx context.Context, examID string, questions []CBTQuestion) error

	// CBT Sessions & Proctoring
	GetOrCreateSession(ctx context.Context, examID, studentID, studentName, classCode string) (*CBTStudentSession, error)
	RecordViolation(ctx context.Context, log *CBTViolationLog) (*CBTStudentSession, error)
	UnlockSession(ctx context.Context, sessionID string) error
	SubmitExamSession(ctx context.Context, sessionID string, score float64) error
	ListLiveProctoringSessions(ctx context.Context, examID string) ([]CBTStudentSession, []CBTViolationLog, error)
}

// UseCase Interface
type UseCase interface {
	// Materials
	GetMaterials(ctx context.Context, classCode string) ([]LearningMaterial, error)
	AddMaterial(ctx context.Context, m *LearningMaterial) error
	RemoveMaterial(ctx context.Context, id string) error

	// Assignments
	GetAssignments(ctx context.Context, classCode string) ([]LearningAssignment, error)
	AddAssignment(ctx context.Context, a *LearningAssignment) error
	UpdateAssignment(ctx context.Context, id string, a *LearningAssignment) error
	RemoveAssignment(ctx context.Context, id string) error
	GetSubmissions(ctx context.Context, assignmentID string) ([]AssignmentSubmission, error)
	SubmitAssignment(ctx context.Context, s *AssignmentSubmission) error
	GradeAssignmentSubmission(ctx context.Context, submissionID string, score float64, feedback string, graderID string) error

	// CBT Exams
	GetExams(ctx context.Context, classCode string) ([]CBTExam, error)
	GetExamDetail(ctx context.Context, id string) (*CBTExam, error)
	AddExam(ctx context.Context, e *CBTExam) error
	UpdateExam(ctx context.Context, id string, e *CBTExam) error
	DeleteExam(ctx context.Context, id string) error
	GetExamQuestions(ctx context.Context, examID string, isTeacher bool) ([]CBTQuestion, error)
	AddExamQuestion(ctx context.Context, q *CBTQuestion) error
	SaveQuestions(ctx context.Context, examID string, questions []CBTQuestion) error

	// CBT Proctoring & Student Runner
	StartStudentExam(ctx context.Context, examID, token, studentID, studentName, classCode string) (*CBTStudentSession, error)
	LogViolation(ctx context.Context, log *CBTViolationLog) (*CBTStudentSession, error)
	UnlockStudent(ctx context.Context, sessionID string) error
	FinishStudentExam(ctx context.Context, sessionID string, score float64) error
	GetLiveProctoring(ctx context.Context, examID string) (map[string]interface{}, error)
}
