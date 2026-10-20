package postgresql

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/rapor/rapor-be/rapor/module/elearning/domain"
	"gorm.io/gorm"
)

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) domain.Repository {
	_ = db.AutoMigrate(
		&domain.LearningMaterial{},
		&domain.LearningAssignment{},
		&domain.AssignmentSubmission{},
		&domain.CBTExam{},
		&domain.CBTQuestion{},
		&domain.CBTStudentSession{},
		&domain.CBTViolationLog{},
	)
	return &repository{db: db}
}

// ================= MATERIALS =================

func (r *repository) ListMaterials(ctx context.Context, classCode string) ([]domain.LearningMaterial, error) {
	var list []domain.LearningMaterial
	q := r.db.WithContext(ctx).Table("learning_materials").Order("created_at desc")
	if classCode != "" {
		q = q.Where("class_code = ? OR class_code = ''", classCode)
	}
	err := q.Find(&list).Error
	return list, err
}

func (r *repository) CreateMaterial(ctx context.Context, m *domain.LearningMaterial) error {
	if m.ID == "" {
		m.ID = "mat-" + uuid.NewString()[:8]
	}
	m.CreatedAt = time.Now()
	m.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Table("learning_materials").Create(m).Error
}

func (r *repository) DeleteMaterial(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Table("learning_materials").Where("id = ?", id).Delete(&domain.LearningMaterial{}).Error
}

// ================= ASSIGNMENTS =================

func (r *repository) ListAssignments(ctx context.Context, classCode string) ([]domain.LearningAssignment, error) {
	var list []domain.LearningAssignment
	q := r.db.WithContext(ctx).Table("learning_assignments").Order("due_date asc")
	if classCode != "" {
		q = q.Where("class_code = ? OR class_code = ''", classCode)
	}
	err := q.Find(&list).Error
	return list, err
}

func (r *repository) CreateAssignment(ctx context.Context, a *domain.LearningAssignment) error {
	if a.ID == "" {
		a.ID = "tug-" + uuid.NewString()[:8]
	}
	a.CreatedAt = time.Now()
	a.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Table("learning_assignments").Create(a).Error
}

func (r *repository) ListSubmissions(ctx context.Context, assignmentID string) ([]domain.AssignmentSubmission, error) {
	var list []domain.AssignmentSubmission
	err := r.db.WithContext(ctx).Table("assignment_submissions").
		Where("assignment_id = ?", assignmentID).
		Order("submitted_at desc").
		Find(&list).Error
	return list, err
}

func (r *repository) SaveSubmission(ctx context.Context, s *domain.AssignmentSubmission) error {
	if s.ID == "" {
		s.ID = "sub-" + uuid.NewString()[:8]
	}
	s.SubmittedAt = time.Now()
	s.Status = "SUBMITTED"
	return r.db.WithContext(ctx).Table("assignment_submissions").
		Where("assignment_id = ? AND student_id = ?", s.AssignmentID, s.StudentID).
		Assign(s).
		FirstOrCreate(s).Error
}

func (r *repository) GradeSubmission(ctx context.Context, submissionID string, score float64, feedback string, graderID string) error {
	now := time.Now()
	return r.db.WithContext(ctx).Table("assignment_submissions").
		Where("id = ?", submissionID).
		Updates(map[string]interface{}{
			"score":            score,
			"teacher_feedback": feedback,
			"graded_at":        now,
			"graded_by":        graderID,
			"status":           "GRADED",
		}).Error
}

// ================= CBT EXAMS =================

func (r *repository) ListExams(ctx context.Context, classCode string) ([]domain.CBTExam, error) {
	var list []domain.CBTExam
	q := r.db.WithContext(ctx).Table("cbt_exams").Order("start_time desc")
	if classCode != "" {
		q = q.Where("class_code = ? OR class_code = ''", classCode)
	}
	err := q.Find(&list).Error
	return list, err
}

func (r *repository) GetExamByID(ctx context.Context, id string) (*domain.CBTExam, error) {
	var exam domain.CBTExam
	err := r.db.WithContext(ctx).Table("cbt_exams").Where("id = ?", id).First(&exam).Error
	if err != nil {
		return nil, err
	}
	return &exam, nil
}

func (r *repository) CreateExam(ctx context.Context, e *domain.CBTExam) error {
	if e.ID == "" {
		e.ID = "cbt-" + uuid.NewString()[:8]
	}
	e.CreatedAt = time.Now()
	e.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Table("cbt_exams").Create(e).Error
}

func (r *repository) ListQuestions(ctx context.Context, examID string, includeAnswer bool) ([]domain.CBTQuestion, error) {
	var list []domain.CBTQuestion
	err := r.db.WithContext(ctx).Table("cbt_questions").
		Where("exam_id = ?", examID).
		Order("question_number asc").
		Find(&list).Error
	if err != nil {
		return nil, err
	}

	// Sembunyikan kunci jawaban untuk siswa
	if !includeAnswer {
		for i := range list {
			list[i].CorrectAnswer = ""
		}
	}
	return list, err
}

func (r *repository) SaveQuestion(ctx context.Context, q *domain.CBTQuestion) error {
	if q.ID == "" {
		q.ID = "q-" + uuid.NewString()[:8]
	}
	q.CreatedAt = time.Now()
	return r.db.WithContext(ctx).Table("cbt_questions").Create(q).Error
}

// ================= CBT SESSIONS & PROCTORING =================

func (r *repository) GetOrCreateSession(ctx context.Context, examID, studentID, studentName, classCode string) (*domain.CBTStudentSession, error) {
	var sess domain.CBTStudentSession
	err := r.db.WithContext(ctx).Table("cbt_student_sessions").
		Where("exam_id = ? AND student_id = ?", examID, studentID).
		First(&sess).Error

	if err == nil {
		return &sess, nil
	}

	// Create new session
	sess = domain.CBTStudentSession{
		ID:             "ses-" + uuid.NewString()[:8],
		ExamID:         examID,
		StudentID:      studentID,
		StudentName:    studentName,
		ClassCode:      classCode,
		StartedAt:      time.Now(),
		Status:         "IN_PROGRESS",
		ViolationCount: 0,
		Score:          0,
	}

	if err := r.db.WithContext(ctx).Table("cbt_student_sessions").Create(&sess).Error; err != nil {
		return nil, err
	}
	return &sess, nil
}

func (r *repository) RecordViolation(ctx context.Context, log *domain.CBTViolationLog) (*domain.CBTStudentSession, error) {
	if log.ID == "" {
		log.ID = "viol-" + uuid.NewString()[:8]
	}
	log.CreatedAt = time.Now()

	// Insert violation log
	if err := r.db.WithContext(ctx).Table("cbt_violation_logs").Create(log).Error; err != nil {
		return nil, err
	}

	// Increment session violation count
	var sess domain.CBTStudentSession
	if err := r.db.WithContext(ctx).Table("cbt_student_sessions").
		Where("id = ?", log.SessionID).
		First(&sess).Error; err != nil {
		return nil, err
	}

	sess.ViolationCount++

	// Check max violations
	var exam domain.CBTExam
	if err := r.db.WithContext(ctx).Table("cbt_exams").Where("id = ?", sess.ExamID).First(&exam).Error; err == nil {
		if exam.MaxViolations > 0 && sess.ViolationCount >= exam.MaxViolations {
			sess.Status = "LOCKED"
		}
	}

	r.db.WithContext(ctx).Table("cbt_student_sessions").
		Where("id = ?", sess.ID).
		Updates(map[string]interface{}{
			"violation_count": sess.ViolationCount,
			"status":          sess.Status,
		})

	return &sess, nil
}

func (r *repository) UnlockSession(ctx context.Context, sessionID string) error {
	return r.db.WithContext(ctx).Table("cbt_student_sessions").
		Where("id = ?", sessionID).
		Updates(map[string]interface{}{
			"status": "IN_PROGRESS",
		}).Error
}

func (r *repository) SubmitExamSession(ctx context.Context, sessionID string, score float64) error {
	now := time.Now()
	return r.db.WithContext(ctx).Table("cbt_student_sessions").
		Where("id = ?", sessionID).
		Updates(map[string]interface{}{
			"status":       "SUBMITTED",
			"submitted_at": now,
			"score":        score,
		}).Error
}

func (r *repository) ListLiveProctoringSessions(ctx context.Context, examID string) ([]domain.CBTStudentSession, []domain.CBTViolationLog, error) {
	var sessions []domain.CBTStudentSession
	err := r.db.WithContext(ctx).Table("cbt_student_sessions").
		Where("exam_id = ?", examID).
		Order("started_at desc").
		Find(&sessions).Error
	if err != nil {
		return nil, nil, err
	}

	var sessionIDs []string
	for _, s := range sessions {
		sessionIDs = append(sessionIDs, s.ID)
	}

	var logs []domain.CBTViolationLog
	if len(sessionIDs) > 0 {
		r.db.WithContext(ctx).Table("cbt_violation_logs").
			Where("session_id IN ?", sessionIDs).
			Order("created_at desc").
			Find(&logs)
	}

	return sessions, logs, nil
}
