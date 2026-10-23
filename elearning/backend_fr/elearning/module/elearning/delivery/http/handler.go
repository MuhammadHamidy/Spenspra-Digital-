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

	// 4. CBT Student Runner & Anti-Cheat Proctoring
	api.Post("/exams/:id/start", h.StartStudentExam)
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
	if cName == "" {
		cName = "Matematika"
	}

	cID := strings.TrimSpace(in.CourseID)
	if cID == "" {
		cID = strings.TrimSpace(in.SubjectCode)
	}
	if cID == "" {
		cID = "MAPEL"
	}

	tName := strings.TrimSpace(in.TeacherNameSnake)
	if tName == "" {
		tName = strings.TrimSpace(in.TeacherName)
	}
	if tName == "" {
		tName = "Bapak/Ibu Guru"
	}

	tID := strings.TrimSpace(in.TeacherIDSnake)
	if tID == "" {
		tID = strings.TrimSpace(in.TeacherID)
	}
	if tID == "" {
		tID = "guru-default"
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
	if err := h.useCase.AddExam(c.Context(), &req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("VALIDATION_ERROR", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(formatExamForFrontend(req), "Ujian CBT berhasil dibuat"))
}

func (h *ELearningHandler) UpdateExam(c *fiber.Ctx) error {
	id := c.Params("id")
	var input CBTExamInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}
	req := input.ToDomain()
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

func (h *ELearningHandler) GetExamQuestions(c *fiber.Ctx) error {
	id := c.Params("id")
	role := c.Get("X-User-Role")
	isTeacher := role == "GURU" || role == "ADMIN" || role == "SUPER_ADMIN"
	questions, err := h.useCase.GetExamQuestions(c.Context(), id, isTeacher)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(questions, "Daftar butir soal dimuat"))
}

func (h *ELearningHandler) AddExamQuestion(c *fiber.Ctx) error {
	id := c.Params("id")
	var req domain.CBTQuestion
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}
	req.ExamID = id
	if err := h.useCase.AddExamQuestion(c.Context(), &req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("VALIDATION_ERROR", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(req, "Soal berhasil ditambahkan"))
}

// Student Runner & Anti-Cheat Handlers
func (h *ELearningHandler) StartStudentExam(c *fiber.Ctx) error {
	id := c.Params("id")
	type StartReq struct {
		Token       string `json:"token"`
		StudentID   string `json:"student_id"`
		StudentName string `json:"student_name"`
		ClassCode   string `json:"class_code"`
	}
	var req StartReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}
	sess, err := h.useCase.StartStudentExam(c.Context(), id, req.Token, req.StudentID, req.StudentName, req.ClassCode)
	if err != nil {
		return c.Status(http.StatusUnauthorized).JSON(responses.Fail("AUTH_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(sess, "Sesi ujian dimulai"))
}

func (h *ELearningHandler) RecordViolation(c *fiber.Ctx) error {
	id := c.Params("id")
	var req domain.CBTViolationLog
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}
	req.SessionID = id
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

func (h *ELearningHandler) FinishStudentExam(c *fiber.Ctx) error {
	id := c.Params("id")
	type FinishReq struct {
		Score float64 `json:"score"`
	}
	var req FinishReq
	_ = c.BodyParser(&req)
	if err := h.useCase.FinishStudentExam(c.Context(), id, req.Score); err != nil {
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
	return c.Status(http.StatusOK).JSON(responses.Success(data, "Data proctoring real-time dimuat"))
}
