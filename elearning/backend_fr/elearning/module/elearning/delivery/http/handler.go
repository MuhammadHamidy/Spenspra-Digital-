package http

import (
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rapor/rapor-be/libraries/responses"
	"github.com/rapor/rapor-be/rapor/module/elearning/domain"
)

type ELearningHandler struct {
	useCase domain.UseCase
}

func NewELearningHandler(useCase domain.UseCase) *ELearningHandler {
	return &ELearningHandler{useCase: useCase}
}

func (h *ELearningHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api")

	// 1. Materials
	api.Get("/materials", h.ListMaterials)
	api.Post("/materials", h.CreateMaterial)
	api.Delete("/materials/:id", h.DeleteMaterial)

	// 2. Assignments
	api.Get("/assignments", h.ListAssignments)
	api.Post("/assignments", h.CreateAssignment)
	api.Put("/assignments/:id", h.UpdateAssignment)
	api.Delete("/assignments/:id", h.DeleteAssignment)
	api.Get("/assignments/:id/submissions", h.ListSubmissions)
	api.Post("/assignments/:id/submissions", h.SubmitAssignment)
	api.Put("/submissions/:id/grade", h.GradeSubmission)

	// 3. CBT Exams & Questions
	api.Get("/exams", h.ListExams)
	api.Post("/exams", h.CreateExam)
	api.Get("/exams/:id", h.GetExamDetail)
	api.Put("/exams/:id", h.UpdateExam)
	api.Delete("/exams/:id", h.DeleteExam)
	api.Get("/exams/:id/questions", h.GetExamQuestions)
	api.Post("/exams/:id/questions", h.AddExamQuestion)
	api.Put("/exams/:id/questions", h.SaveExamQuestions)

	// 4. CBT Student Runner & Anti-Cheat Proctoring
	api.Post("/exams/:id/start", h.StartStudentExam)
	api.Post("/sessions/:id/answers", h.SaveStudentAnswer)
	api.Get("/sessions/:id/answers", h.GetStudentAnswers)
	api.Post("/sessions/:id/violations", h.RecordViolation)
	api.Post("/sessions/:id/unlock", h.UnlockStudent)
	api.Post("/sessions/:id/finish", h.FinishStudentExam)
	api.Get("/exams/:id/monitoring", h.GetLiveProctoring)


}

// Materials Handlers
func (h *ELearningHandler) ListMaterials(c *fiber.Ctx) error {
	classCode := c.Query("class_name")
	list, err := h.useCase.GetMaterials(c.Context(), classCode)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Data materi berhasil dimuat"))
}

func (h *ELearningHandler) CreateMaterial(c *fiber.Ctx) error {
	var req domain.LearningMaterial
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}
	if err := h.useCase.AddMaterial(c.Context(), &req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("VALIDATION_ERROR", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(req, "Materi berhasil ditambahkan"))
}

func (h *ELearningHandler) DeleteMaterial(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.useCase.RemoveMaterial(c.Context(), id); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{"deleted": true}, "Materi berhasil dihapus"))
}

// Assignments Handlers
func (h *ELearningHandler) ListAssignments(c *fiber.Ctx) error {
	classCode := c.Query("class_name")
	list, err := h.useCase.GetAssignments(c.Context(), classCode)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Data penugasan berhasil dimuat"))
}

func (h *ELearningHandler) CreateAssignment(c *fiber.Ctx) error {
	var req domain.LearningAssignment
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}
	if err := h.useCase.AddAssignment(c.Context(), &req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("VALIDATION_ERROR", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(req, "Tugas berhasil dibuat"))
}

func (h *ELearningHandler) UpdateAssignment(c *fiber.Ctx) error {
	id := c.Params("id")
	var req domain.LearningAssignment
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}
	if err := h.useCase.UpdateAssignment(c.Context(), id, &req); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(req, "Tugas berhasil diperbarui"))
}

func (h *ELearningHandler) DeleteAssignment(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.useCase.RemoveAssignment(c.Context(), id); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{"deleted": true}, "Tugas berhasil dihapus"))
}

func (h *ELearningHandler) ListSubmissions(c *fiber.Ctx) error {
	id := c.Params("id")
	list, err := h.useCase.GetSubmissions(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Data pengumpulan tugas dimuat"))
}

func (h *ELearningHandler) SubmitAssignment(c *fiber.Ctx) error {
	id := c.Params("id")
	var req domain.AssignmentSubmission
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}
	req.AssignmentID = id
	if err := h.useCase.SubmitAssignment(c.Context(), &req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("VALIDATION_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(req, "Tugas berhasil dikumpulkan"))
}

func (h *ELearningHandler) GradeSubmission(c *fiber.Ctx) error {
	id := c.Params("id")
	type GradeReq struct {
		Score    float64 `json:"score"`
		Feedback string  `json:"feedback"`
	}
	var req GradeReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}
	graderID := c.Get("X-User-Id")
	if err := h.useCase.GradeAssignmentSubmission(c.Context(), id, req.Score, req.Feedback, graderID); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{"graded": true}, "Nilai tugas berhasil disimpan"))
}

type CBTExamInput struct {
	ID                   string `json:"id"`
	Title                string `json:"title"`
	Subject              string `json:"subject"`
	CourseName           string `json:"course_name"`
	SubjectCode          string `json:"subjectCode"`
	CourseID             string `json:"course_id"`
	ClassName            string `json:"className"`
	ClassCode            string `json:"class_code"`
	TeacherName          string `json:"teacherName"`
	TeacherNameSnake     string `json:"teacher_name"`
	TeacherID            string `json:"teacherId"`
	TeacherIDSnake       string `json:"teacher_id"`
	Token                string `json:"token"`
	DurationMinutes      int    `json:"durationMinutes"`
	DurationMinutesSnake int    `json:"duration_minutes"`
	MaxViolations        int    `json:"maxViolations"`
	MaxViolationsSnake   int    `json:"max_violations"`
	ScheduledDate        string `json:"scheduledDate"`
	StartTime            string `json:"startTime"`
	EndTime              string `json:"endTime"`
	StartDateTime        string `json:"startDateTime"`
	EndDateTime          string `json:"endDateTime"`
	Description          string `json:"description"`
	Status               string `json:"status"`
}

func (in *CBTExamInput) ToDomain() domain.CBTExam {
	cls := strings.TrimSpace(in.ClassCode)
	if cls == "" {
		cls = strings.TrimSpace(in.ClassName)
	}

	cName := strings.TrimSpace(in.CourseName)
	if cName == "" {
		cName = strings.TrimSpace(in.Subject)
	}

	cID := strings.TrimSpace(in.CourseID)
	if cID == "" {
		cID = strings.TrimSpace(in.SubjectCode)
	}
	if cID == "" && cName != "" {
		cID = "MAPEL"
	}

	tName := strings.TrimSpace(in.TeacherNameSnake)
	if tName == "" {
		tName = strings.TrimSpace(in.TeacherName)
	}

	tID := strings.TrimSpace(in.TeacherIDSnake)
	if tID == "" {
		tID = strings.TrimSpace(in.TeacherID)
	}

	dur := in.DurationMinutesSnake
	if dur <= 0 {
		dur = in.DurationMinutes
	}
	if dur <= 0 {
		dur = 60
	}

	maxV := in.MaxViolationsSnake
	if maxV <= 0 {
		maxV = in.MaxViolations
	}
	if maxV <= 0 {
		maxV = 3
	}

	stat := strings.ToUpper(strings.TrimSpace(in.Status))
	if stat == "" {
		stat = "UPCOMING"
	}

	parseTime := func(dtStr, dStr, tStr string) *time.Time {
		if dtStr != "" {
			for _, layout := range []string{time.RFC3339, "2006-01-02T15:04:05", "2006-01-02T15:04"} {
				if t, err := time.ParseInLocation(layout, dtStr, time.Local); err == nil {
					return &t
				}
			}
		}
		if dStr != "" && tStr != "" {
			combined := dStr + "T" + tStr
			for _, layout := range []string{"2006-01-02T15:04", "2006-01-02T15:04:05"} {
				if t, err := time.ParseInLocation(layout, combined, time.Local); err == nil {
					return &t
				}
			}
		}
		return nil
	}

	startT := parseTime(in.StartDateTime, in.ScheduledDate, in.StartTime)
	endT := parseTime(in.EndDateTime, in.ScheduledDate, in.EndTime)

	return domain.CBTExam{
		ID:              in.ID,
		Title:           strings.TrimSpace(in.Title),
		ClassCode:       cls,
		CourseName:      cName,
		CourseID:        cID,
		TeacherName:     tName,
		TeacherID:       tID,
		Token:           strings.ToUpper(strings.TrimSpace(in.Token)),
		DurationMinutes: dur,
		MaxViolations:   maxV,
		StartTime:       startT,
		EndTime:         endT,
		Description:     strings.TrimSpace(in.Description),
		Status:          stat,
	}
}

func formatExamForFrontend(e domain.CBTExam) fiber.Map {
	sDate := ""
	sTime := ""
	eTime := ""
	sDateTime := ""
	eDateTime := ""

	if e.StartTime != nil {
		sDateTime = e.StartTime.Format(time.RFC3339)
		sDate = e.StartTime.Format("2006-01-02")
		sTime = e.StartTime.Format("15:04")
	}
	if e.EndTime != nil {
		eDateTime = e.EndTime.Format(time.RFC3339)
		eTime = e.EndTime.Format("15:04")
	}

	return fiber.Map{
		"id":               e.ID,
		"title":            e.Title,
		"class_code":       e.ClassCode,
		"className":        e.ClassCode,
		"course_name":      e.CourseName,
		"subject":          e.CourseName,
		"course_id":        e.CourseID,
		"subjectCode":      e.CourseID,
		"teacher_name":     e.TeacherName,
		"teacherName":      e.TeacherName,
		"teacher_id":       e.TeacherID,
		"token":            e.Token,
		"duration_minutes": e.DurationMinutes,
		"durationMinutes":  e.DurationMinutes,
		"max_violations":   e.MaxViolations,
		"maxViolations":    e.MaxViolations,
		"scheduledDate":    sDate,
		"startTime":        sTime,
		"endTime":          eTime,
		"startDateTime":    sDateTime,
		"endDateTime":      eDateTime,
		"start_time":       sDateTime,
		"end_time":         eDateTime,
		"description":      e.Description,
		"status":           e.Status,
		"created_at":       e.CreatedAt,
		"updated_at":       e.UpdatedAt,
	}
}

// CBT Exams Handlers
func (h *ELearningHandler) ListExams(c *fiber.Ctx) error {
	classCode := c.Query("class_name")
	if classCode == "" {
		classCode = c.Query("class_code")
	}
	list, err := h.useCase.GetExams(c.Context(), classCode)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	formatted := make([]fiber.Map, len(list))
	for i, ex := range list {
		formatted[i] = formatExamForFrontend(ex)
	}
	return c.Status(http.StatusOK).JSON(responses.Success(formatted, "Daftar ujian CBT berhasil dimuat"))
}

func (h *ELearningHandler) GetExamDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	exam, err := h.useCase.GetExamDetail(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(formatExamForFrontend(*exam), "Detail ujian dimuat"))
}

func (h *ELearningHandler) CreateExam(c *fiber.Ctx) error {
	var input CBTExamInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}
	req := input.ToDomain()

	if req.CourseName == "" {
		req.CourseName = "Informatika"
	}
	if req.CourseID == "" {
		req.CourseID = "INF"
	}

	if req.TeacherName == "" {
		if uName := c.Get("X-User-Name"); strings.TrimSpace(uName) != "" {
			req.TeacherName = strings.TrimSpace(uName)
		} else {
			req.TeacherName = "Bapak/Ibu Guru"
		}
	}
	if req.TeacherID == "" {
		if uID := c.Get("X-User-Id"); strings.TrimSpace(uID) != "" {
			req.TeacherID = strings.TrimSpace(uID)
		} else {
			req.TeacherID = "guru-default"
		}
	}

	if err := h.useCase.AddExam(c.Context(), &req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("VALIDATION_ERROR", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(formatExamForFrontend(req), "Ujian CBT berhasil dibuat"))
}

func (h *ELearningHandler) UpdateExam(c *fiber.Ctx) error {
	id := c.Params("id")
	existing, err := h.useCase.GetExamDetail(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", "Ujian tidak ditemukan"))
	}

	var input CBTExamInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}

	// Gunakan data yang ada di database sebagai fondasi, jangan pernah me-reset ke default
	req := *existing

	if t := strings.TrimSpace(input.Title); t != "" {
		req.Title = t
	}

	cName := strings.TrimSpace(input.CourseName)
	if cName == "" {
		cName = strings.TrimSpace(input.Subject)
	}
	if cName != "" {
		req.CourseName = cName
	}

	cID := strings.TrimSpace(input.CourseID)
	if cID == "" {
		cID = strings.TrimSpace(input.SubjectCode)
	}
	if cID != "" {
		req.CourseID = cID
	}

	cls := strings.TrimSpace(input.ClassCode)
	if cls == "" {
		cls = strings.TrimSpace(input.ClassName)
	}
	if cls != "" {
		req.ClassCode = cls
	}

	tName := strings.TrimSpace(input.TeacherNameSnake)
	if tName == "" {
		tName = strings.TrimSpace(input.TeacherName)
	}
	if tName != "" {
		req.TeacherName = tName
	} else if req.TeacherName == "" || req.TeacherName == "Bapak/Ibu Guru" {
		if uName := c.Get("X-User-Name"); strings.TrimSpace(uName) != "" {
			req.TeacherName = strings.TrimSpace(uName)
		}
	}

	tID := strings.TrimSpace(input.TeacherIDSnake)
	if tID == "" {
		tID = strings.TrimSpace(input.TeacherID)
	}
	if tID != "" {
		req.TeacherID = tID
	}

	if tok := strings.TrimSpace(input.Token); tok != "" {
		req.Token = strings.ToUpper(tok)
	}

	dur := input.DurationMinutesSnake
	if dur <= 0 {
		dur = input.DurationMinutes
	}
	if dur > 0 {
		req.DurationMinutes = dur
	}

	maxV := input.MaxViolationsSnake
	if maxV <= 0 {
		maxV = input.MaxViolations
	}
	if maxV > 0 {
		req.MaxViolations = maxV
	}

	if stat := strings.TrimSpace(input.Status); stat != "" {
		req.Status = strings.ToUpper(stat)
	}

	if desc := strings.TrimSpace(input.Description); desc != "" {
		req.Description = desc
	}

	parseTime := func(dtStr, dStr, tStr string) *time.Time {
		if dtStr != "" {
			for _, layout := range []string{time.RFC3339, "2006-01-02T15:04:05", "2006-01-02T15:04"} {
				if t, err := time.ParseInLocation(layout, dtStr, time.Local); err == nil {
					return &t
				}
			}
		}
		if dStr != "" && tStr != "" {
			combined := dStr + "T" + tStr
			for _, layout := range []string{"2006-01-02T15:04", "2006-01-02T15:04:05"} {
				if t, err := time.ParseInLocation(layout, combined, time.Local); err == nil {
					return &t
				}
			}
		}
		return nil
	}

	if startT := parseTime(input.StartDateTime, input.ScheduledDate, input.StartTime); startT != nil {
		req.StartTime = startT
	}
	if endT := parseTime(input.EndDateTime, input.ScheduledDate, input.EndTime); endT != nil {
		req.EndTime = endT
	}

	if err := h.useCase.UpdateExam(c.Context(), id, &req); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(formatExamForFrontend(req), "Ujian CBT berhasil diperbarui"))
}

func (h *ELearningHandler) DeleteExam(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.useCase.DeleteExam(c.Context(), id); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{"deleted": true}, "Ujian CBT berhasil dihapus"))
}

type CBTQuestionOptionInput struct {
	Key  string `json:"key"`
	Text string `json:"text"`
}

type CBTQuestionInput struct {
	ID                  string                   `json:"id"`
	QuestionNumber      int                      `json:"questionNumber"`
	QuestionNumberSnake int                      `json:"question_number"`
	Type                string                   `json:"type"`
	QuestionType        string                   `json:"question_type"`
	QuestionText        string                   `json:"questionText"`
	QuestionTextSnake   string                   `json:"question_text"`
	StimulusText        string                   `json:"stimulusText"`
	ImageURL            string                   `json:"imageUrl"`
	ImageURLSnake       string                   `json:"image_url"`
	Options             []CBTQuestionOptionInput `json:"options"`
	OptionA             string                   `json:"option_a"`
	OptionB             string                   `json:"option_b"`
	OptionC             string                   `json:"option_c"`
	OptionD             string                   `json:"option_d"`
	OptionE             string                   `json:"option_e"`
	CorrectOption       string                   `json:"correctOption"`
	CorrectAnswer       string                   `json:"correct_answer"`
	Points              float64                  `json:"points"`
	ScoreWeight         float64                  `json:"score_weight"`
}

func (in *CBTQuestionInput) ToDomain(examID string, index int) domain.CBTQuestion {
	qNum := in.QuestionNumber
	if qNum <= 0 {
		qNum = in.QuestionNumberSnake
	}
	if qNum <= 0 {
		qNum = index + 1
	}

	qType := strings.ToUpper(strings.TrimSpace(in.Type))
	if qType == "" {
		qType = strings.ToUpper(strings.TrimSpace(in.QuestionType))
	}
	if qType == "PILIHAN_GANDA" || qType == "" {
		qType = "MCQ"
	}

	qText := strings.TrimSpace(in.QuestionText)
	if qText == "" {
		qText = strings.TrimSpace(in.QuestionTextSnake)
	}

	img := strings.TrimSpace(in.ImageURL)
	if img == "" {
		img = strings.TrimSpace(in.ImageURLSnake)
	}

	optA := in.OptionA
	optB := in.OptionB
	optC := in.OptionC
	optD := in.OptionD
	optE := in.OptionE

	for _, opt := range in.Options {
		k := strings.ToUpper(strings.TrimSpace(opt.Key))
		switch k {
		case "A":
			optA = opt.Text
		case "B":
			optB = opt.Text
		case "C":
			optC = opt.Text
		case "D":
			optD = opt.Text
		case "E":
			optE = opt.Text
		}
	}

	corr := strings.ToUpper(strings.TrimSpace(in.CorrectOption))
	if corr == "" {
		corr = strings.ToUpper(strings.TrimSpace(in.CorrectAnswer))
	}
	if corr == "" && qType != "ESSAY" {
		corr = "A"
	}
	if corr == "" {
		corr = "-"
	}

	pts := in.Points
	if pts <= 0 {
		pts = in.ScoreWeight
	}
	if pts <= 0 {
		pts = 1.0
	}

	return domain.CBTQuestion{
		ID:             in.ID,
		ExamID:         examID,
		QuestionNumber: qNum,
		QuestionType:   qType,
		QuestionText:   qText,
		ImageURL:       img,
		OptionA:        optA,
		OptionB:        optB,
		OptionC:        optC,
		OptionD:        optD,
		OptionE:        optE,
		CorrectAnswer:  corr,
		ScoreWeight:    pts,
	}
}

func formatQuestionForFrontend(q domain.CBTQuestion) fiber.Map {
	opts := []fiber.Map{}
	if q.OptionA != "" {
		opts = append(opts, fiber.Map{"key": "A", "text": q.OptionA})
	}
	if q.OptionB != "" {
		opts = append(opts, fiber.Map{"key": "B", "text": q.OptionB})
	}
	if q.OptionC != "" {
		opts = append(opts, fiber.Map{"key": "C", "text": q.OptionC})
	}
	if q.OptionD != "" {
		opts = append(opts, fiber.Map{"key": "D", "text": q.OptionD})
	}
	if q.OptionE != "" {
		opts = append(opts, fiber.Map{"key": "E", "text": q.OptionE})
	}

	qType := q.QuestionType
	if qType == "PILIHAN_GANDA" {
		qType = "MCQ"
	}

	return fiber.Map{
		"id":              q.ID,
		"exam_id":         q.ExamID,
		"examId":          q.ExamID,
		"questionNumber":  q.QuestionNumber,
		"question_number": q.QuestionNumber,
		"type":            qType,
		"question_type":   q.QuestionType,
		"questionText":    q.QuestionText,
		"question_text":   q.QuestionText,
		"imageUrl":        q.ImageURL,
		"image_url":       q.ImageURL,
		"options":         opts,
		"option_a":        q.OptionA,
		"option_b":        q.OptionB,
		"option_c":        q.OptionC,
		"option_d":        q.OptionD,
		"option_e":        q.OptionE,
		"correctOption":   q.CorrectAnswer,
		"correct_answer":  q.CorrectAnswer,
		"points":          q.ScoreWeight,
		"score_weight":    q.ScoreWeight,
		"created_at":       q.CreatedAt,
	}
}

func (h *ELearningHandler) GetExamQuestions(c *fiber.Ctx) error {
	id := c.Params("id")
	role := c.Get("X-User-Role")
	isTeacher := role == "GURU" || role == "ADMIN" || role == "SUPER_ADMIN"
	questions, err := h.useCase.GetExamQuestions(c.Context(), id, isTeacher)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}

	formatted := make([]fiber.Map, len(questions))
	for i, q := range questions {
		formatted[i] = formatQuestionForFrontend(q)
	}

	return c.Status(http.StatusOK).JSON(responses.Success(formatted, "Daftar butir soal dimuat"))
}

func (h *ELearningHandler) AddExamQuestion(c *fiber.Ctx) error {
	id := c.Params("id")
	var input CBTQuestionInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}
	req := input.ToDomain(id, 0)
	if err := h.useCase.AddExamQuestion(c.Context(), &req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("VALIDATION_ERROR", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(formatQuestionForFrontend(req), "Soal berhasil ditambahkan"))
}

func (h *ELearningHandler) SaveExamQuestions(c *fiber.Ctx) error {
	id := c.Params("id")

	// Payload can be { questions: [...] } or direct slice [...]
	type BulkPayload struct {
		Questions []CBTQuestionInput `json:"questions"`
	}

	var rawBulk BulkPayload
	var inputs []CBTQuestionInput

	if err := c.BodyParser(&rawBulk); err == nil && len(rawBulk.Questions) > 0 {
		inputs = rawBulk.Questions
	} else {
		_ = c.BodyParser(&inputs)
	}

	var domainQuestions []domain.CBTQuestion
	for i, in := range inputs {
		domainQuestions = append(domainQuestions, in.ToDomain(id, i))
	}

	if err := h.useCase.SaveQuestions(c.Context(), id, domainQuestions); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}

	formatted := make([]fiber.Map, len(domainQuestions))
	for i, q := range domainQuestions {
		formatted[i] = formatQuestionForFrontend(q)
	}

	return c.Status(http.StatusOK).JSON(responses.Success(formatted, "Semua butir soal berhasil disimpan ke server"))
}

// Student Runner & Anti-Cheat Handlers
func (h *ELearningHandler) StartStudentExam(c *fiber.Ctx) error {
	id := c.Params("id")
	type StartReq struct {
		Token       string `json:"token"`
		StudentID   string `json:"student_id"`
		StudentIdCamel string `json:"studentId"`
		StudentName string `json:"student_name"`
		StudentNameCamel string `json:"studentName"`
		ClassCode   string `json:"class_code"`
		ClassName   string `json:"className"`
	}
	var req StartReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}

	sID := strings.TrimSpace(req.StudentID)
	if sID == "" {
		sID = strings.TrimSpace(req.StudentIdCamel)
	}
	sName := strings.TrimSpace(req.StudentName)
	if sName == "" {
		sName = strings.TrimSpace(req.StudentNameCamel)
	}
	cls := strings.TrimSpace(req.ClassCode)
	if cls == "" {
		cls = strings.TrimSpace(req.ClassName)
	}

	sess, err := h.useCase.StartStudentExam(c.Context(), id, req.Token, sID, sName, cls)
	if err != nil {
		return c.Status(http.StatusUnauthorized).JSON(responses.Fail("AUTH_ERROR", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{
		"id":              sess.ID,
		"sessionId":       sess.ID,
		"exam_id":         sess.ExamID,
		"examId":          sess.ExamID,
		"student_id":      sess.StudentID,
		"studentId":       sess.StudentID,
		"student_name":    sess.StudentName,
		"studentName":     sess.StudentName,
		"class_code":      sess.ClassCode,
		"className":       sess.ClassCode,
		"started_at":      sess.StartedAt,
		"status":          sess.Status,
		"violation_count": sess.ViolationCount,
		"violationsCount": sess.ViolationCount,
		"score":           sess.Score,
	}, "Sesi ujian dimulai"))
}

func (h *ELearningHandler) RecordViolation(c *fiber.Ctx) error {
	id := c.Params("id")
	type ViolationInput struct {
		Type            string `json:"type"`
		ViolationType   string `json:"violation_type"`
		Description     string `json:"description"`
		Details         string `json:"details"`
		DurationSeconds int    `json:"duration_seconds"`
		StudentID       string `json:"student_id"`
		StudentIdCamel  string `json:"studentId"`
	}
	var input ViolationInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}

	vType := strings.TrimSpace(input.ViolationType)
	if vType == "" {
		vType = strings.TrimSpace(input.Type)
	}
	if vType == "" {
		vType = "WINDOW_BLUR"
	}

	vDetails := strings.TrimSpace(input.Details)
	if vDetails == "" {
		vDetails = strings.TrimSpace(input.Description)
	}

	stID := strings.TrimSpace(input.StudentID)
	if stID == "" {
		stID = strings.TrimSpace(input.StudentIdCamel)
	}

	req := domain.CBTViolationLog{
		SessionID:       id,
		StudentID:       stID,
		ViolationType:   vType,
		Details:         vDetails,
		DurationSeconds: input.DurationSeconds,
	}

	sess, err := h.useCase.LogViolation(c.Context(), &req)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(sess, "Pelanggaran berhasil dicatat"))
}

func (h *ELearningHandler) UnlockStudent(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.useCase.UnlockStudent(c.Context(), id); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{"unlocked": true}, "Kunci sesi ujian berhasil dibuka"))
}

type CBTStudentAnswerInput struct {
	QuestionID     string  `json:"question_id"`
	QuestionIdAlt  string  `json:"questionId"`
	SelectedOption string  `json:"selected_option"`
	SelectedOptAlt string  `json:"selectedOption"`
	EssayAnswer    string  `json:"essay_answer"`
	EssayAnsAlt    string  `json:"essayAnswer"`
	IsDoubtful     bool    `json:"is_doubtful"`
	IsDoubtfulAlt  bool    `json:"isDoubtful"`
	ScoreObtained  float64 `json:"score_obtained"`
}

func (h *ELearningHandler) SaveStudentAnswer(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	var input CBTStudentAnswerInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}

	qID := input.QuestionID
	if qID == "" {
		qID = input.QuestionIdAlt
	}
	selOpt := input.SelectedOption
	if selOpt == "" {
		selOpt = input.SelectedOptAlt
	}
	essayAns := input.EssayAnswer
	if essayAns == "" {
		essayAns = input.EssayAnsAlt
	}
	isDoubtful := input.IsDoubtful || input.IsDoubtfulAlt

	ans := domain.CBTStudentAnswer{
		SessionID:      sessionID,
		QuestionID:     qID,
		SelectedOption: selOpt,
		EssayAnswer:    essayAns,
		IsDoubtful:     isDoubtful,
		ScoreObtained:  input.ScoreObtained,
	}

	if err := h.useCase.SaveStudentAnswer(c.Context(), &ans); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{"saved": true}, "Jawaban berhasil disimpan"))
}

func (h *ELearningHandler) GetStudentAnswers(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	answers, err := h.useCase.GetStudentAnswers(c.Context(), sessionID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	formatted := fiber.Map{}
	for qID, a := range answers {
		formatted[qID] = fiber.Map{
			"id":              a.ID,
			"question_id":     a.QuestionID,
			"questionId":      a.QuestionID,
			"selected_option": a.SelectedOption,
			"selectedOption":  a.SelectedOption,
			"essay_answer":    a.EssayAnswer,
			"essayAnswer":     a.EssayAnswer,
			"is_doubtful":     a.IsDoubtful,
			"isDoubtful":      a.IsDoubtful,
			"score_obtained":  a.ScoreObtained,
			"scoreObtained":   a.ScoreObtained,
		}
	}
	return c.Status(http.StatusOK).JSON(responses.Success(formatted, "Jawaban siswa berhasil dimuat"))
}


func (h *ELearningHandler) FinishStudentExam(c *fiber.Ctx) error {
	id := c.Params("id")
	type FinishReq struct {
		Score   float64                `json:"score"`
		Answers map[string]interface{} `json:"answers"`
	}
	var req FinishReq
	_ = c.BodyParser(&req)

	var answerList []domain.CBTStudentAnswer
	if req.Answers != nil {
		for qID, raw := range req.Answers {
			ans := domain.CBTStudentAnswer{
				SessionID:  id,
				QuestionID: qID,
			}
			if m, ok := raw.(map[string]interface{}); ok {
				if opt, ok := m["selectedOption"].(string); ok && opt != "" {
					ans.SelectedOption = opt
				} else if opt, ok := m["selected_option"].(string); ok && opt != "" {
					ans.SelectedOption = opt
				}
				if ess, ok := m["essayAnswer"].(string); ok && ess != "" {
					ans.EssayAnswer = ess
				} else if ess, ok := m["essay_answer"].(string); ok && ess != "" {
					ans.EssayAnswer = ess
				}
				if d, ok := m["isDoubtful"].(bool); ok {
					ans.IsDoubtful = d
				} else if d, ok := m["is_doubtful"].(bool); ok {
					ans.IsDoubtful = d
				}
			}
			answerList = append(answerList, ans)
		}
	}

	if err := h.useCase.FinishStudentExam(c.Context(), id, req.Score, answerList); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{"finished": true}, "Ujian berhasil diselesaikan"))
}

func (h *ELearningHandler) GetLiveProctoring(c *fiber.Ctx) error {
	id := c.Params("id")
	data, err := h.useCase.GetLiveProctoring(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}

	rawSessions, _ := data["sessions"].([]domain.CBTLiveSession)
	formattedSessions := []fiber.Map{}

	for _, s := range rawSessions {
		var formattedLogs []fiber.Map
		for _, l := range s.Violations {
			formattedLogs = append(formattedLogs, fiber.Map{
				"id":               l.ID,
				"session_id":       l.SessionID,
				"sessionId":        l.SessionID,
				"student_id":       l.StudentID,
				"studentId":        l.StudentID,
				"type":             l.ViolationType,
				"violation_type":   l.ViolationType,
				"description":      l.Details,
				"details":          l.Details,
				"duration_seconds": l.DurationSeconds,
				"created_at":       l.CreatedAt,
				"timestamp":        l.CreatedAt,
			})
		}

		formattedAnswers := fiber.Map{}
		for qId, a := range s.Answers {
			formattedAnswers[qId] = fiber.Map{
				"id":              a.ID,
				"question_id":     a.QuestionID,
				"questionId":      a.QuestionID,
				"selected_option": a.SelectedOption,
				"selectedOption":  a.SelectedOption,
				"essay_answer":    a.EssayAnswer,
				"essayAnswer":     a.EssayAnswer,
				"is_doubtful":     a.IsDoubtful,
				"isDoubtful":      a.IsDoubtful,
				"score_obtained":  a.ScoreObtained,
				"scoreObtained":   a.ScoreObtained,
			}
		}

		formattedSessions = append(formattedSessions, fiber.Map{
			"id":              s.ID,
			"sessionId":       s.ID,
			"exam_id":         s.ExamID,
			"examId":          s.ExamID,
			"student_id":      s.StudentID,
			"studentId":       s.StudentID,
			"student_name":    s.StudentName,
			"studentName":     s.StudentName,
			"nisn":            s.StudentNISN,
			"student_nisn":    s.StudentNISN,
			"class_code":      s.ClassCode,
			"className":       s.ClassCode,
			"started_at":      s.StartedAt,
			"status":          s.Status,
			"violation_count": s.ViolationCount,
			"violationsCount": s.ViolationCount,
			"score":           s.Score,
			"violations":      formattedLogs,
			"answers":         formattedAnswers,
		})
	}

	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{
		"exam_id":  id,
		"sessions": formattedSessions,
		"total":    len(formattedSessions),
	}, "Data proctoring real-time dimuat"))
}

