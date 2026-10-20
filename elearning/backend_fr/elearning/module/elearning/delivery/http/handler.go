package http

import (
	"net/http"

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

// CBT Exams Handlers
func (h *ELearningHandler) ListExams(c *fiber.Ctx) error {
	classCode := c.Query("class_name")
	list, err := h.useCase.GetExams(c.Context(), classCode)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Daftar ujian CBT berhasil dimuat"))
}

func (h *ELearningHandler) GetExamDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	exam, err := h.useCase.GetExamDetail(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(exam, "Detail ujian dimuat"))
}

func (h *ELearningHandler) CreateExam(c *fiber.Ctx) error {
	var req domain.CBTExam
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}
	if err := h.useCase.AddExam(c.Context(), &req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("VALIDATION_ERROR", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(req, "Ujian CBT berhasil dibuat"))
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
