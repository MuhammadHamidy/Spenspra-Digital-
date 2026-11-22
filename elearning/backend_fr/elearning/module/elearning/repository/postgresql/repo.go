package postgresql

import (
	"context"
	"encoding/json"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rapor/rapor-be/rapor/module/elearning/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) domain.Repository {
	_ = db.Exec("ALTER TABLE cbt_student_answers DROP CONSTRAINT IF EXISTS cbt_student_answers_question_id_fkey").Error
	_ = db.Exec("ALTER TABLE cbt_student_answers ALTER COLUMN selected_option TYPE TEXT").Error
	_ = db.Exec("ALTER TABLE cbt_questions ALTER COLUMN correct_answer TYPE TEXT").Error
	_ = db.Exec("ALTER TABLE cbt_questions ALTER COLUMN question_type TYPE VARCHAR(50)").Error

	_ = db.AutoMigrate(
		&domain.LearningMaterial{},
		&domain.LearningAssignment{},
		&domain.AssignmentSubmission{},
		&domain.CBTExam{},
		&domain.CBTQuestion{},
		&domain.CBTStudentSession{},
		&domain.CBTViolationLog{},
		&domain.CBTStudentAnswer{},
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

func (r *repository) UpdateAssignment(ctx context.Context, id string, a *domain.LearningAssignment) error {
	a.UpdatedAt = time.Now()
	updates := map[string]interface{}{
		"title":           a.Title,
		"instructions":    a.Instructions,
		"course_id":       a.CourseID,
		"course_name":     a.CourseName,
		"class_code":      a.ClassCode,
		"attachment_url":  a.AttachmentURL,
		"attachment_name": a.AttachmentName,
		"max_score":       a.MaxScore,
		"status":          a.Status,
		"updated_at":      a.UpdatedAt,
	}
	if !a.DueDate.IsZero() {
		updates["due_date"] = a.DueDate
	}
	return r.db.WithContext(ctx).Table("learning_assignments").Where("id = ?", id).Updates(updates).Error
}

func (r *repository) DeleteAssignment(ctx context.Context, id string) error {
	_ = r.db.WithContext(ctx).Table("assignment_submissions").Where("assignment_id = ?", id).Delete(nil).Error
	return r.db.WithContext(ctx).Table("learning_assignments").Where("id = ?", id).Delete(nil).Error
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
		q = q.Where("class_code = ?", classCode)
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

func (r *repository) UpdateExam(ctx context.Context, id string, e *domain.CBTExam) error {
	e.UpdatedAt = time.Now()
	updates := map[string]interface{}{
		"title":               e.Title,
		"class_code":          e.ClassCode,
		"course_name":         e.CourseName,
		"course_id":           e.CourseID,
		"teacher_name":        e.TeacherName,
		"teacher_id":          e.TeacherID,
		"token":               e.Token,
		"duration_minutes":    e.DurationMinutes,
		"max_violations":      e.MaxViolations,
		"exam_category":       e.ExamCategory,
		"target_grade_level":  e.TargetGradeLevel,
		"supervisor_pin":      e.SupervisorPin,
		"is_coordinator_exam": e.IsCoordinatorExam,
		"start_time":          e.StartTime,
		"end_time":            e.EndTime,
		"description":         e.Description,
		"status":              e.Status,
		"updated_at":          e.UpdatedAt,
	}
	return r.db.WithContext(ctx).Table("cbt_exams").Where("id = ?", id).Updates(updates).Error
}

func (r *repository) DeleteExam(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Table("cbt_exams").Where("id = ?", id).Delete(&domain.CBTExam{}).Error
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

func (r *repository) SaveQuestions(ctx context.Context, examID string, questions []domain.CBTQuestion) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if len(questions) == 0 {
			return tx.Table("cbt_questions").Where("exam_id = ?", examID).Delete(&domain.CBTQuestion{}).Error
		}

		now := time.Now()
		keepIDs := make([]string, 0, len(questions))
		for i := range questions {
			if questions[i].ID == "" {
				questions[i].ID = "q-" + uuid.NewString()[:8]
			}
			questions[i].ExamID = examID
			if questions[i].QuestionNumber <= 0 {
				questions[i].QuestionNumber = i + 1
			}
			if questions[i].CorrectAnswer == "" {
				questions[i].CorrectAnswer = "-"
			}
			if questions[i].ScoreWeight <= 0 {
				questions[i].ScoreWeight = 10.0
			}
			if questions[i].CreatedAt.IsZero() {
				questions[i].CreatedAt = now
			}
			keepIDs = append(keepIDs, questions[i].ID)
		}

		// Hapus hanya butir soal yang sudah tidak ada di daftar soal ujian ini (jangan hapus soal yang masih dipakai agar jawaban siswa tetap utuh)
		if err := tx.Table("cbt_questions").Where("exam_id = ? AND id NOT IN ?", examID, keepIDs).Delete(&domain.CBTQuestion{}).Error; err != nil {
			return err
		}

		// Upsert setiap butir soal
		return tx.Table("cbt_questions").
			Clauses(clause.OnConflict{
				Columns: []clause.Column{{Name: "id"}},
				DoUpdates: clause.AssignmentColumns([]string{
					"exam_id",
					"question_number",
					"question_type",
					"question_text",
					"image_url",
					"option_a",
					"option_b",
					"option_c",
					"option_d",
					"option_e",
					"correct_answer",
					"score_weight",
				}),
			}).Create(&questions).Error
	})
}

// ================= CBT SESSIONS & PROCTORING =================

func (r *repository) GetOrCreateSession(ctx context.Context, examID, studentID, studentName, classCode string) (*domain.CBTStudentSession, error) {
	var sess domain.CBTStudentSession
	err := r.db.WithContext(ctx).Table("cbt_student_sessions").
		Where("exam_id = ? AND student_id = ?", examID, studentID).
		First(&sess).Error

	if err == nil {
		// JANGAN PERNAH mereset sesi yang sudah SUBMITTED kembali menjadi IN_PROGRESS!
		// Jika siswa sudah mengumpulkan ujian, kembalikan sesi SUBMITTED apa adanya.
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

func (r *repository) GetSessionByExamAndStudent(ctx context.Context, examID, studentID string) (*domain.CBTStudentSession, error) {
	var sess domain.CBTStudentSession
	err := r.db.WithContext(ctx).Table("cbt_student_sessions").
		Where("exam_id = ? AND student_id = ?", examID, studentID).
		Order("started_at desc").
		First(&sess).Error
	if err != nil {
		return nil, err
	}
	return &sess, nil
}

func (r *repository) GetSessionByID(ctx context.Context, sessionID string) (*domain.CBTStudentSession, error) {
	var sess domain.CBTStudentSession
	err := r.db.WithContext(ctx).Table("cbt_student_sessions").
		Where("id = ?", sessionID).
		First(&sess).Error
	if err != nil {
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

func (r *repository) DeleteSession(ctx context.Context, sessionID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Table("cbt_student_answers").Where("session_id = ?", sessionID).Delete(nil).Error; err != nil {
			return err
		}
		if err := tx.Table("cbt_violation_logs").Where("session_id = ?", sessionID).Delete(nil).Error; err != nil {
			return err
		}
		return tx.Table("cbt_student_sessions").Where("id = ?", sessionID).Delete(nil).Error
	})
}

type repoMatchingPair struct {
	ID    interface{} `json:"id"`
	Left  string      `json:"left"`
	Right string      `json:"right"`
}

type repoQuestionMeta struct {
	Type            string             `json:"type"`
	CorrectOptions  []string           `json:"correctOptions"`
	TrueFalseAnswer *bool              `json:"trueFalseAnswer"`
	MatchingPairs   []repoMatchingPair `json:"matchingPairs"`
	Points          float64            `json:"points"`
}

func (r *repository) calculateSessionScoreFromDB(ctx context.Context, sessionID string) (float64, bool) {
	var sess domain.CBTStudentSession
	if err := r.db.WithContext(ctx).Table("cbt_student_sessions").Where("id = ?", sessionID).First(&sess).Error; err != nil || sess.ExamID == "" {
		return 0, false
	}

	var questions []domain.CBTQuestion
	if err := r.db.WithContext(ctx).Table("cbt_questions").Where("exam_id = ?", sess.ExamID).Order("question_number asc").Find(&questions).Error; err != nil || len(questions) == 0 {
		return 0, false
	}

	var answers []domain.CBTStudentAnswer
	_ = r.db.WithContext(ctx).Table("cbt_student_answers").Where("session_id = ?", sessionID).Find(&answers).Error
	ansMap := make(map[string]domain.CBTStudentAnswer, len(answers))
	for _, a := range answers {
		ansMap[a.QuestionID] = a
	}

	var totalMax float64
	var totalEarned float64

	for _, q := range questions {
		var meta repoQuestionMeta
		if idx := strings.Index(q.QuestionText, "<!--SPENSPRA_META:"); idx != -1 {
			endIdx := strings.Index(q.QuestionText[idx:], "-->")
			if endIdx != -1 {
				metaRaw := q.QuestionText[idx+len("<!--SPENSPRA_META:") : idx+endIdx]
				_ = json.Unmarshal([]byte(metaRaw), &meta)
			}
		}

		qType := strings.ToUpper(strings.TrimSpace(q.QuestionType))
		if meta.Type != "" {
			qType = strings.ToUpper(strings.TrimSpace(meta.Type))
		}
		if qType == "PILIHAN_GANDA" || qType == "" {
			qType = "MCQ"
		}

		pts := q.ScoreWeight
		if meta.Points > 0 {
			pts = meta.Points
		}
		if pts <= 0 {
			pts = 10.0
		}
		totalMax += pts

		ans, hasAns := ansMap[q.ID]
		if !hasAns {
			continue
		}
		sel := strings.TrimSpace(ans.SelectedOption)

		switch qType {
		case "MCQ":
			corr := strings.ToUpper(strings.TrimSpace(q.CorrectAnswer))
			if sel != "" && strings.ToUpper(sel) == corr {
				totalEarned += pts
			}
		case "COMPLEX_MCQ":
			corrOpts := meta.CorrectOptions
			if len(corrOpts) == 0 && q.CorrectAnswer != "" && q.CorrectAnswer != "-" {
				corrOpts = strings.Split(q.CorrectAnswer, ",")
			}
			var cClean []string
			for _, c := range corrOpts {
				t := strings.ToUpper(strings.TrimSpace(c))
				if t != "" {
					cClean = append(cClean, t)
				}
			}
			var sClean []string
			if sel != "" && !strings.HasPrefix(sel, "{") {
				for _, s := range strings.Split(sel, ",") {
					t := strings.ToUpper(strings.TrimSpace(s))
					if t != "" {
						sClean = append(sClean, t)
					}
				}
			}
			sort.Strings(cClean)
			sort.Strings(sClean)
			if len(sClean) > 0 && len(cClean) > 0 && strings.Join(sClean, ",") == strings.Join(cClean, ",") {
				totalEarned += pts
			}
		case "TRUE_FALSE":
			sUpper := strings.ToUpper(sel)
			isStudentTrue := sUpper == "TRUE" || sUpper == "BENAR" || sUpper == "T"
			isStudentFalse := sUpper == "FALSE" || sUpper == "SALAH" || sUpper == "F"
			if !isStudentTrue && !isStudentFalse {
				continue
			}
			isCorrectTrue := true
			if meta.TrueFalseAnswer != nil {
				isCorrectTrue = *meta.TrueFalseAnswer
			} else if q.CorrectAnswer != "" {
				cUpper := strings.ToUpper(strings.TrimSpace(q.CorrectAnswer))
				isCorrectTrue = cUpper == "TRUE" || cUpper == "BENAR" || cUpper == "T"
			}
			if (isStudentTrue && isCorrectTrue) || (isStudentFalse && !isCorrectTrue) {
				totalEarned += pts
			}
		case "MATCHING":
			if sel == "" || !strings.HasPrefix(sel, "{") || len(meta.MatchingPairs) == 0 {
				continue
			}
			var mAns map[string]string
			if err := json.Unmarshal([]byte(sel), &mAns); err != nil {
				continue
			}
			matched := 0
			for pIdx, pair := range meta.MatchingPairs {
				var idKey string
				switch v := pair.ID.(type) {
				case float64:
					idKey = strings.TrimSuffix(strings.TrimSuffix(strings.TrimSpace(strings.ReplaceAll(json.Number(
						func() string { b, _ := json.Marshal(v); return string(b) }(),
					).String(), "", "")), ".0"), ".")
				case string:
					idKey = v
				}
				studentVal := mAns[idKey]
				if studentVal == "" {
					studentVal = mAns[strings.TrimSpace(pair.Left)]
				}
				if studentVal == "" {
					idxKey := "idx_" + string(rune('0'+pIdx))
					studentVal = mAns[idxKey]
				}
				if studentVal == "" {
					numKey := string(rune('1' + pIdx))
					studentVal = mAns[numKey]
				}
				if strings.TrimSpace(studentVal) != "" && strings.EqualFold(strings.TrimSpace(studentVal), strings.TrimSpace(pair.Right)) {
					matched++
				}
			}
			ratio := float64(matched) / float64(len(meta.MatchingPairs))
			totalEarned += math.Round(ratio * pts)
		case "ESSAY":
			if ans.ScoreObtained > 0 {
				totalEarned += math.Min(pts, ans.ScoreObtained)
			}
		}
	}

	if totalMax <= 0 {
		return 0, false
	}
	return math.Round((totalEarned / totalMax) * 100), true
}

func (r *repository) SubmitExamSession(ctx context.Context, sessionID string, score float64) error {
	now := time.Now()
	finalScore := score
	if calcScore, ok := r.calculateSessionScoreFromDB(ctx, sessionID); ok {
		// Jika score dari siswa 0 atau berbeda karena browser siswa tidak memegang kunci jawaban, gunakan kalkulasi otoritatif database
		// Namun jika guru mengirimkan nilai koreksi manual (score > calcScore karena nilai esai), gunakan nilai yang lebih tinggi / nilai guru
		if score <= 0 || calcScore > 0 {
			if score > calcScore {
				finalScore = score
			} else {
				finalScore = calcScore
			}
		}
	}
	return r.db.WithContext(ctx).Table("cbt_student_sessions").
		Where("id = ?", sessionID).
		Updates(map[string]interface{}{
			"status":       "SUBMITTED",
			"submitted_at": now,
			"score":        finalScore,
		}).Error
}

func (r *repository) SaveStudentAnswer(ctx context.Context, ans *domain.CBTStudentAnswer) error {
	if ans.ID == "" {
		ans.ID = "ans-" + uuid.NewString()[:8]
	}
	if ans.AnsweredAt.IsZero() {
		ans.AnsweredAt = time.Now()
	}

	return r.db.WithContext(ctx).Table("cbt_student_answers").
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "session_id"}, {Name: "question_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"selected_option", "essay_answer", "is_doubtful", "is_correct", "score_obtained", "answered_at"}),
		}).Create(ans).Error
}

func (r *repository) BatchSaveStudentAnswers(ctx context.Context, sessionID string, answers []domain.CBTStudentAnswer) error {
	for i := range answers {
		// Jangan timpa jawaban yang sudah tersimpan di database dengan string kosong jika payload parsial
		if answers[i].SelectedOption == "" && answers[i].EssayAnswer == "" {
			continue
		}
		answers[i].SessionID = sessionID
		if answers[i].ID == "" {
			answers[i].ID = "ans-" + uuid.NewString()[:8]
		}
		if answers[i].AnsweredAt.IsZero() {
			answers[i].AnsweredAt = time.Now()
		}
		_ = r.db.WithContext(ctx).Table("cbt_student_answers").
			Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "session_id"}, {Name: "question_id"}},
				DoUpdates: clause.AssignmentColumns([]string{"selected_option", "essay_answer", "is_doubtful", "is_correct", "score_obtained", "answered_at"}),
			}).Create(&answers[i]).Error
	}
	return nil
}

func (r *repository) ListLiveProctoringSessions(ctx context.Context, examID string) ([]domain.CBTStudentSession, []domain.CBTViolationLog, []domain.CBTStudentAnswer, error) {
	var sessions []domain.CBTStudentSession
	err := r.db.WithContext(ctx).Table("cbt_student_sessions").
		Where("exam_id = ?", examID).
		Order("started_at desc").
		Find(&sessions).Error
	if err != nil {
		return nil, nil, nil, err
	}

	var sessionIDs []string
	for _, s := range sessions {
		sessionIDs = append(sessionIDs, s.ID)
	}

	var logs []domain.CBTViolationLog
	var answers []domain.CBTStudentAnswer
	if len(sessionIDs) > 0 {
		r.db.WithContext(ctx).Table("cbt_violation_logs").
			Where("session_id IN ?", sessionIDs).
			Order("created_at desc").
			Find(&logs)

		r.db.WithContext(ctx).Table("cbt_student_answers").
			Where("session_id IN ?", sessionIDs).
			Order("answered_at asc").
			Find(&answers)
	}

	return sessions, logs, answers, nil
}

func (r *repository) GetStudentAnswers(ctx context.Context, sessionID string) ([]domain.CBTStudentAnswer, error) {
	var answers []domain.CBTStudentAnswer
	err := r.db.WithContext(ctx).Table("cbt_student_answers").
		Where("session_id = ?", sessionID).
		Order("answered_at asc").
		Find(&answers).Error
	return answers, err
}
