package usecase

import (
	"context"
	"errors"
	"strings"

	"github.com/rapor/rapor-be/rapor/module/elearning/domain"
)

type useCase struct {
	repo domain.Repository
}

func NewUseCase(repo domain.Repository) domain.UseCase {
	return &useCase{repo: repo}
}

// Materials
func (u *useCase) GetMaterials(ctx context.Context, classCode string) ([]domain.LearningMaterial, error) {
	return u.repo.ListMaterials(ctx, classCode)
}

func (u *useCase) AddMaterial(ctx context.Context, m *domain.LearningMaterial) error {
	if m.Title == "" {
		return errors.New("judul materi wajib diisi")
	}
	return u.repo.CreateMaterial(ctx, m)
}

func (u *useCase) RemoveMaterial(ctx context.Context, id string) error {
	return u.repo.DeleteMaterial(ctx, id)
}

// Assignments
func (u *useCase) GetAssignments(ctx context.Context, classCode string) ([]domain.LearningAssignment, error) {
	return u.repo.ListAssignments(ctx, classCode)
}

func (u *useCase) AddAssignment(ctx context.Context, a *domain.LearningAssignment) error {
	if a.Title == "" {
		return errors.New("judul tugas wajib diisi")
	}
	return u.repo.CreateAssignment(ctx, a)
}

func (u *useCase) UpdateAssignment(ctx context.Context, id string, a *domain.LearningAssignment) error {
	if id == "" {
		return errors.New("id tugas diperlukan")
	}
	return u.repo.UpdateAssignment(ctx, id, a)
}

func (u *useCase) RemoveAssignment(ctx context.Context, id string) error {
	if id == "" {
		return errors.New("id tugas diperlukan")
	}
	return u.repo.DeleteAssignment(ctx, id)
}


func (u *useCase) GetSubmissions(ctx context.Context, assignmentID string) ([]domain.AssignmentSubmission, error) {
	return u.repo.ListSubmissions(ctx, assignmentID)
}

func (u *useCase) SubmitAssignment(ctx context.Context, s *domain.AssignmentSubmission) error {
	if s.AssignmentID == "" || s.StudentID == "" {
		return errors.New("id penugasan dan siswa wajib diisi")
	}
	return u.repo.SaveSubmission(ctx, s)
}

func (u *useCase) GradeAssignmentSubmission(ctx context.Context, submissionID string, score float64, feedback string, graderID string) error {
	return u.repo.GradeSubmission(ctx, submissionID, score, feedback, graderID)
}

// CBT Exams
func (u *useCase) GetExams(ctx context.Context, classCode string) ([]domain.CBTExam, error) {
	return u.repo.ListExams(ctx, classCode)
}

func (u *useCase) GetExamDetail(ctx context.Context, id string) (*domain.CBTExam, error) {
	return u.repo.GetExamByID(ctx, id)
}

func (u *useCase) AddExam(ctx context.Context, e *domain.CBTExam) error {
	if e.Title == "" || e.Token == "" {
		return errors.New("judul dan token ujian wajib diisi")
	}
	e.Token = strings.ToUpper(strings.TrimSpace(e.Token))
	return u.repo.CreateExam(ctx, e)
}

func (u *useCase) UpdateExam(ctx context.Context, id string, e *domain.CBTExam) error {
	if id == "" {
		return errors.New("id ujian diperlukan")
	}
	if e.Token != "" {
		e.Token = strings.ToUpper(strings.TrimSpace(e.Token))
	}
	return u.repo.UpdateExam(ctx, id, e)
}

func (u *useCase) DeleteExam(ctx context.Context, id string) error {
	if id == "" {
		return errors.New("id ujian diperlukan")
	}
	return u.repo.DeleteExam(ctx, id)
}

func (u *useCase) GetExamQuestions(ctx context.Context, examID string, isTeacher bool) ([]domain.CBTQuestion, error) {
	return u.repo.ListQuestions(ctx, examID, isTeacher)
}

func (u *useCase) AddExamQuestion(ctx context.Context, q *domain.CBTQuestion) error {
	if q.QuestionText == "" {
		return errors.New("teks pertanyaan tidak boleh kosong")
	}
	return u.repo.SaveQuestion(ctx, q)
}

func (u *useCase) SaveQuestions(ctx context.Context, examID string, questions []domain.CBTQuestion) error {
	if examID == "" {
		return errors.New("id ujian diperlukan")
	}
	return u.repo.SaveQuestions(ctx, examID, questions)
}

// CBT Proctoring & Student Runner
func (u *useCase) StartStudentExam(ctx context.Context, examID, token, studentID, studentName, classCode string) (*domain.CBTStudentSession, error) {
	exam, err := u.repo.GetExamByID(ctx, examID)
	if err != nil {
		return nil, errors.New("ujian tidak ditemukan")
	}

	if exam.Token != "" && strings.ToUpper(strings.TrimSpace(token)) != strings.ToUpper(strings.TrimSpace(exam.Token)) {
		return nil, errors.New("token ujian tidak valid! periksa token dari pengawas")
	}

	if studentID == "" {
		studentID = "std-demo"
	}
	if studentName == "" {
		studentName = "Siswa Spenspra"
	}
	if classCode == "" {
		classCode = exam.ClassCode
	}

	return u.repo.GetOrCreateSession(ctx, examID, studentID, studentName, classCode)
}

func (u *useCase) LogViolation(ctx context.Context, log *domain.CBTViolationLog) (*domain.CBTStudentSession, error) {
	if log.SessionID == "" {
		return nil, errors.New("session id diperlukan")
	}
	return u.repo.RecordViolation(ctx, log)
}

func (u *useCase) UnlockStudent(ctx context.Context, sessionID string) error {
	return u.repo.UnlockSession(ctx, sessionID)
}

func (u *useCase) FinishStudentExam(ctx context.Context, sessionID string, score float64) error {
	return u.repo.SubmitExamSession(ctx, sessionID, score)
}

func (u *useCase) GetLiveProctoring(ctx context.Context, examID string) (map[string]interface{}, error) {
	sessions, logs, err := u.repo.ListLiveProctoringSessions(ctx, examID)
	if err != nil {
		return nil, err
	}

	// Map logs to session ID
	logsBySession := make(map[string][]domain.CBTViolationLog)
	for _, l := range logs {
		logsBySession[l.SessionID] = append(logsBySession[l.SessionID], l)
	}

	var results []domain.CBTLiveSession
	for _, s := range sessions {
		results = append(results, domain.CBTLiveSession{
			CBTStudentSession: s,
			Violations:        logsBySession[s.ID],
		})
	}

	return map[string]interface{}{
		"exam_id":  examID,
		"sessions": results,
		"total":    len(results),
	}, nil
}
