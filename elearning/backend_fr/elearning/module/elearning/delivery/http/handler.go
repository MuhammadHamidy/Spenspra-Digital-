package http

import (
	"encoding/json"
	"fmt"
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

func actorID(c *fiber.Ctx) string {
	return strings.TrimSpace(c.Get("X-User-Id"))
}

func actorRole(c *fiber.Ctx) string {
	return strings.ToUpper(strings.TrimSpace(c.Get("X-User-Role")))
}

func isTeacherRole(role string) bool {
	r := strings.ToUpper(strings.TrimSpace(role))
	return r == "GURU" || r == "TEACHER" || r == "PENDIDIK" || r == "WALI_KELAS" || r == "KOORDINATOR"
}

func canManageAll(role string) bool {
	r := strings.ToUpper(strings.TrimSpace(role))
	return r == "ADMIN" || r == "SUPER_ADMIN" || r == "ADMIN_ELEARNING"
}

func cleanTeacherName(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.ReplaceAll(s, ".", " ")
	s = strings.ReplaceAll(s, ",", " ")
	return strings.Join(strings.Fields(s), " ")
}

func isOwnedByActor(c *fiber.Ctx, teacherID, teacherName string) bool {
	uid := strings.ToLower(actorID(c))
	uname := cleanTeacherName(c.Get("X-User-Name"))
	tID := strings.ToLower(strings.TrimSpace(teacherID))
	tName := cleanTeacherName(teacherName)

	if uid != "" && uid != "user-elearning-default" && tID != "" && tID != "user-elearning-default" {
		if uid == tID {
			return true
		}
		if uname != "" && uname != "bapak/ibu guru" && tName != "" && tName != "bapak/ibu guru" && uname == tName {
			return true
		}
		return false
	}

	if uname != "" && uname != "bapak/ibu guru" && tName != "" && tName != "bapak/ibu guru" {
		return uname == tName
	}

	return false
}

func (h *ELearningHandler) requireExamOwner(c *fiber.Ctx, exam *domain.CBTExam) *fiber.Error {
	role := actorRole(c)
	if canManageAll(role) {
		return nil
	}
	if role != "" && !isTeacherRole(role) {
		return fiber.NewError(http.StatusForbidden, "hanya guru atau staf pengajar yang dapat mengelola ujian")
	}
	if exam != nil && !isOwnedByActor(c, exam.TeacherID, exam.TeacherName) {
		return fiber.NewError(http.StatusForbidden, "akses ditolak: hanya guru pembuat soal ujian ini yang dapat mengelola soal dan pengaturannya")
	}
	return nil
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
	api.Get("/exams/:id/session", h.GetStudentSession)
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
	role := actorRole(c)
	if isTeacherRole(role) && !canManageAll(role) && (actorID(c) != "" || strings.TrimSpace(c.Get("X-User-Name")) != "") {
		filtered := list[:0]
		for _, m := range list {
			if isOwnedByActor(c, m.TeacherID, m.TeacherName) {
				filtered = append(filtered, m)
			}
		}
		list = filtered
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Data materi berhasil dimuat"))
}

func (h *ELearningHandler) CreateMaterial(c *fiber.Ctx) error {
	var req domain.LearningMaterial
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}
	if strings.TrimSpace(req.TeacherID) == "" || isTeacherRole(actorRole(c)) {
		if uid := actorID(c); uid != "" {
			req.TeacherID = uid
		}
	}
	if strings.TrimSpace(req.TeacherName) == "" {
		if uName := strings.TrimSpace(c.Get("X-User-Name")); uName != "" {
			req.TeacherName = uName
		}
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
	role := actorRole(c)
	if isTeacherRole(role) && !canManageAll(role) && (actorID(c) != "" || strings.TrimSpace(c.Get("X-User-Name")) != "") {
		filtered := list[:0]
		for _, a := range list {
			if isOwnedByActor(c, a.TeacherID, a.TeacherName) {
				filtered = append(filtered, a)
			}
		}
		list = filtered
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Data penugasan berhasil dimuat"))
}

func (h *ELearningHandler) CreateAssignment(c *fiber.Ctx) error {
	var req domain.LearningAssignment
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", err.Error()))
	}
	if strings.TrimSpace(req.TeacherID) == "" || isTeacherRole(actorRole(c)) {
		if uid := actorID(c); uid != "" {
			req.TeacherID = uid
		}
	}
	if strings.TrimSpace(req.TeacherName) == "" {
		if uName := strings.TrimSpace(c.Get("X-User-Name")); uName != "" {
			req.TeacherName = uName
		}
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

	showScore := true
	if strings.Contains(e.Description, "[SCORE:0]") {
		showScore = false
	}
	showAnswers := false
	if strings.Contains(e.Description, "[ANSWERS:1]") {
		showAnswers = true
	}

	cleanDesc := e.Description
	for _, tag := range []string{"[SCORE:0]", "[SCORE:1]", "[ANSWERS:0]", "[ANSWERS:1]"} {
		cleanDesc = strings.ReplaceAll(cleanDesc, tag, "")
	}
	cleanDesc = strings.TrimSpace(cleanDesc)

	return fiber.Map{
		"id":                      e.ID,
		"title":                   e.Title,
		"class_code":              e.ClassCode,
		"className":               e.ClassCode,
		"course_name":             e.CourseName,
		"subject":                 e.CourseName,
		"course_id":               e.CourseID,
		"subjectCode":             e.CourseID,
		"teacher_name":            e.TeacherName,
		"teacherName":             e.TeacherName,
		"teacher_id":              e.TeacherID,
		"token":                   e.Token,
		"duration_minutes":        e.DurationMinutes,
		"durationMinutes":         e.DurationMinutes,
		"max_violations":          e.MaxViolations,
		"maxViolations":           e.MaxViolations,
		"scheduledDate":           sDate,
		"startTime":               sTime,
		"endTime":                 eTime,
		"startDateTime":           sDateTime,
		"endDateTime":             eDateTime,
		"start_time":              sDateTime,
		"end_time":                eDateTime,
		"description":             cleanDesc,
		"rawDescription":          e.Description,
		"showScoreToStudent":      showScore,
		"show_score_to_student":   showScore,
		"showAnswersToStudent":    showAnswers,
		"show_answers_to_student": showAnswers,
		"status":                  e.Status,
		"created_at":              e.CreatedAt,
		"updated_at":              e.UpdatedAt,
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
	role := actorRole(c)
	if isTeacherRole(role) && !canManageAll(role) && (actorID(c) != "" || strings.TrimSpace(c.Get("X-User-Name")) != "") {
		filtered := list[:0]
		for _, exam := range list {
			if isOwnedByActor(c, exam.TeacherID, exam.TeacherName) {
				filtered = append(filtered, exam)
			}
		}
		list = filtered
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
	if actorRole(c) == "GURU" {
		if userID := actorID(c); userID != "" {
			req.TeacherID = userID
		}
	} else if req.TeacherID == "" {
		if userID := actorID(c); userID != "" {
			req.TeacherID = userID
		}
	}
	if req.TeacherID == "" {
		return c.Status(http.StatusUnauthorized).JSON(responses.Fail("AUTH_ERROR", "identitas guru wajib tersedia"))
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
	if err := h.requireExamOwner(c, existing); err != nil {
		return c.Status(err.Code).JSON(responses.Fail("FORBIDDEN", err.Message))
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
	if tID != "" && canManageAll(actorRole(c)) {
		req.TeacherID = tID
	}
	if actorRole(c) == "GURU" {
		req.TeacherID = existing.TeacherID
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
	existing, err := h.useCase.GetExamDetail(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", "ujian tidak ditemukan"))
	}
	if err := h.requireExamOwner(c, existing); err != nil {
		return c.Status(err.Code).JSON(responses.Fail("FORBIDDEN", err.Message))
	}
	if err := h.useCase.DeleteExam(c.Context(), id); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{"deleted": true}, "Ujian CBT berhasil dihapus"))
}

type CBTQuestionOptionInput struct {
	Key  string `json:"key"`
	Text string `json:"text"`
}

type CBTMatchingPairInput struct {
	ID    interface{} `json:"id"`
	Left  string      `json:"left"`
	Right string      `json:"right"`
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
	CorrectOptions      []string                 `json:"correctOptions"`
	TrueFalseAnswer     *bool                    `json:"trueFalseAnswer"`
	MatchingPairs       []CBTMatchingPairInput   `json:"matchingPairs"`
	EssayRubric         string                   `json:"essayRubric"`
	Points              float64                  `json:"points"`
	ScoreWeight         float64                  `json:"score_weight"`
}

type CBTQuestionMeta struct {
	Type            string                   `json:"type,omitempty"`
	StimulusText    string                   `json:"stimulusText,omitempty"`
	CorrectOptions  []string                 `json:"correctOptions,omitempty"`
	TrueFalseAnswer *bool                    `json:"trueFalseAnswer,omitempty"`
	MatchingPairs   []CBTMatchingPairInput   `json:"matchingPairs,omitempty"`
	EssayRubric     string                   `json:"essayRubric,omitempty"`
	Points          float64                  `json:"points,omitempty"`
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
	if qType == "COMPLEX_MCQ" {
		if len(in.CorrectOptions) > 0 {
			cleanOpts := make([]string, 0, len(in.CorrectOptions))
			for _, o := range in.CorrectOptions {
				trimmed := strings.ToUpper(strings.TrimSpace(o))
				if trimmed != "" {
					cleanOpts = append(cleanOpts, trimmed)
				}
			}
			in.CorrectOptions = cleanOpts
			if len(cleanOpts) > 0 {
				corr = strings.Join(cleanOpts, ",")
			}
		} else if corr != "" && corr != "-" {
			parts := strings.Split(corr, ",")
			cleanOpts := make([]string, 0, len(parts))
			for _, p := range parts {
				trimmed := strings.ToUpper(strings.TrimSpace(p))
				if trimmed != "" {
					cleanOpts = append(cleanOpts, trimmed)
				}
			}
			in.CorrectOptions = cleanOpts
		}
	} else if qType == "TRUE_FALSE" {
		if in.TrueFalseAnswer != nil {
			if *in.TrueFalseAnswer {
				corr = "TRUE"
			} else {
				corr = "FALSE"
			}
		} else {
			isTrue := corr != "FALSE" && corr != "SALAH" && corr != "F"
			in.TrueFalseAnswer = &isTrue
			if isTrue {
				corr = "TRUE"
			} else {
				corr = "FALSE"
			}
		}
	} else if qType == "MATCHING" {
		for idx := range in.MatchingPairs {
			if in.MatchingPairs[idx].ID == nil || in.MatchingPairs[idx].ID == "" {
				in.MatchingPairs[idx].ID = idx + 1
			}
			in.MatchingPairs[idx].Left = strings.TrimSpace(in.MatchingPairs[idx].Left)
			in.MatchingPairs[idx].Right = strings.TrimSpace(in.MatchingPairs[idx].Right)
		}
	}
	if corr == "" && qType != "ESSAY" && qType != "MATCHING" {
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
		pts = 10.0
	}

	// Persist rich metadata into question_text comment
	meta := CBTQuestionMeta{
		Type:            qType,
		StimulusText:    strings.TrimSpace(in.StimulusText),
		CorrectOptions:  in.CorrectOptions,
		TrueFalseAnswer: in.TrueFalseAnswer,
		MatchingPairs:   in.MatchingPairs,
		EssayRubric:     strings.TrimSpace(in.EssayRubric),
		Points:          pts,
	}
	metaBytes, err := json.Marshal(meta)
	fullText := qText
	if err == nil && len(metaBytes) > 2 {
		fullText = fmt.Sprintf("%s<!--SPENSPRA_META:%s-->", qText, string(metaBytes))
	}

	return domain.CBTQuestion{
		ID:             in.ID,
		ExamID:         examID,
		QuestionNumber: qNum,
		QuestionType:   qType,
		QuestionText:   fullText,
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
	qText := q.QuestionText
	var meta CBTQuestionMeta
	if idx := strings.Index(qText, "<!--SPENSPRA_META:"); idx != -1 {
		endIdx := strings.Index(qText[idx:], "-->")
		if endIdx != -1 {
			metaRaw := qText[idx+len("<!--SPENSPRA_META:") : idx+endIdx]
			_ = json.Unmarshal([]byte(metaRaw), &meta)
			qText = strings.TrimSpace(qText[:idx])
		}
	}

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
	if meta.Type != "" {
		qType = meta.Type
	} else if qType == "PILIHAN_GANDA" || qType == "" {
		qType = "MCQ"
	}

	pts := q.ScoreWeight
	if meta.Points > 0 {
		pts = meta.Points
	}

	matchingPairs := meta.MatchingPairs
	if matchingPairs == nil {
		matchingPairs = []CBTMatchingPairInput{}
	}
	for idx := range matchingPairs {
		if matchingPairs[idx].ID == nil || matchingPairs[idx].ID == "" {
			matchingPairs[idx].ID = idx + 1
		}
	}

	correctOptions := meta.CorrectOptions
	if len(correctOptions) == 0 && qType == "COMPLEX_MCQ" && q.CorrectAnswer != "" && q.CorrectAnswer != "-" {
		for _, part := range strings.Split(q.CorrectAnswer, ",") {
			trimmed := strings.ToUpper(strings.TrimSpace(part))
			if trimmed != "" {
				correctOptions = append(correctOptions, trimmed)
			}
		}
	}
	if correctOptions == nil {
		correctOptions = []string{}
	}

	tfAns := meta.TrueFalseAnswer
	if tfAns == nil && qType == "TRUE_FALSE" && q.CorrectAnswer != "" {
		caUpper := strings.ToUpper(strings.TrimSpace(q.CorrectAnswer))
		isTrue := caUpper == "TRUE" || caUpper == "BENAR" || caUpper == "T"
		tfAns = &isTrue
	}

	return fiber.Map{
		"id":              q.ID,
		"exam_id":         q.ExamID,
		"examId":          q.ExamID,
		"questionNumber":  q.QuestionNumber,
		"question_number": q.QuestionNumber,
		"type":            qType,
		"question_type":   qType,
		"questionText":    qText,
		"question_text":   qText,
		"stimulusText":    meta.StimulusText,
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
		"correctOptions":  correctOptions,
		"trueFalseAnswer": tfAns,
		"matchingPairs":   matchingPairs,
		"essayRubric":     meta.EssayRubric,
		"points":          pts,
		"score_weight":    pts,
		"created_at":      q.CreatedAt,
	}
}

func (h *ELearningHandler) GetExamQuestions(c *fiber.Ctx) error {
	id := c.Params("id")
	role := actorRole(c)
	isTeacher := isTeacherRole(role) || canManageAll(role)
	if isTeacher {
		exam, err := h.useCase.GetExamDetail(c.Context(), id)
		if err != nil {
			return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", "ujian tidak ditemukan"))
		}
		if err := h.requireExamOwner(c, exam); err != nil {
			return c.Status(err.Code).JSON(responses.Fail("FORBIDDEN", err.Message))
		}
	}
	questions, err := h.useCase.GetExamQuestions(c.Context(), id, isTeacher)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}

	formatted := make([]fiber.Map, len(questions))
	for i, q := range questions {
		formatted[i] = formatQuestionForFrontend(q)
		if !isTeacher {
			formatted[i]["correctOption"] = ""
			formatted[i]["correct_answer"] = ""
			formatted[i]["correctOptions"] = []string{}
			formatted[i]["trueFalseAnswer"] = nil
			formatted[i]["essayRubric"] = ""
		}
	}

	return c.Status(http.StatusOK).JSON(responses.Success(formatted, "Daftar butir soal dimuat"))
}

func (h *ELearningHandler) AddExamQuestion(c *fiber.Ctx) error {
	id := c.Params("id")
	exam, err := h.useCase.GetExamDetail(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", "ujian tidak ditemukan"))
	}
	if err := h.requireExamOwner(c, exam); err != nil {
		return c.Status(err.Code).JSON(responses.Fail("FORBIDDEN", err.Message))
	}
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
	exam, err := h.useCase.GetExamDetail(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", "ujian tidak ditemukan"))
	}
	if err := h.requireExamOwner(c, exam); err != nil {
		return c.Status(err.Code).JSON(responses.Fail("FORBIDDEN", err.Message))
	}

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
		Token            string `json:"token"`
		StudentID        string `json:"student_id"`
		StudentIdCamel   string `json:"studentId"`
		StudentName      string `json:"student_name"`
		StudentNameCamel string `json:"studentName"`
		ClassCode        string `json:"class_code"`
		ClassName        string `json:"className"`
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
			if strVal, ok := raw.(string); ok && strings.TrimSpace(strVal) != "" {
				ans.SelectedOption = strings.TrimSpace(strVal)
			} else if m, ok := raw.(map[string]interface{}); ok {
				if opt, ok := m["selectedOption"].(string); ok && opt != "" {
					ans.SelectedOption = opt
				} else if opt, ok := m["selected_option"].(string); ok && opt != "" {
					ans.SelectedOption = opt
				}
				// Fallback untuk Pilihan Ganda Kompleks (selectedOptions array)
				if ans.SelectedOption == "" {
					if optsRaw, ok := m["selectedOptions"].([]interface{}); ok && len(optsRaw) > 0 {
						parts := make([]string, 0, len(optsRaw))
						for _, item := range optsRaw {
							if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
								parts = append(parts, strings.TrimSpace(s))
							}
						}
						if len(parts) > 0 {
							ans.SelectedOption = strings.Join(parts, ",")
						}
					}
				}
				// Fallback untuk Menjodohkan / Pencocokan (matchingAnswers map)
				if ans.SelectedOption == "" {
					if matchMap, ok := m["matchingAnswers"].(map[string]interface{}); ok && len(matchMap) > 0 {
						if b, err := json.Marshal(matchMap); err == nil {
							ans.SelectedOption = string(b)
						}
					}
				}
				// Fallback untuk Benar / Salah (trueFalseAnswer bool)
				if ans.SelectedOption == "" {
					if tf, ok := m["trueFalseAnswer"].(bool); ok {
						if tf {
							ans.SelectedOption = "TRUE"
						} else {
							ans.SelectedOption = "FALSE"
						}
					}
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
			if ans.SelectedOption != "" || ans.EssayAnswer != "" {
				answerList = append(answerList, ans)
			}
		}
	}

	if err := h.useCase.FinishStudentExam(c.Context(), id, req.Score, answerList); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	sess, _ := h.useCase.GetStudentSessionByID(c.Context(), id)
	retScore := req.Score
	if sess != nil {
		retScore = sess.Score
	}
	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{
		"finished": true,
		"score":    retScore,
	}, "Ujian berhasil diselesaikan"))
}

func (h *ELearningHandler) GetStudentSession(c *fiber.Ctx) error {
	examID := c.Params("id")
	studentID := strings.TrimSpace(c.Query("student_id"))
	if studentID == "" {
		studentID = strings.TrimSpace(c.Query("studentId"))
	}
	if studentID == "" {
		studentID = strings.TrimSpace(c.Get("X-User-Id"))
	}
	if studentID == "" {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("VALIDATION_ERROR", "student_id diperlukan"))
	}

	sess, err := h.useCase.GetStudentSessionByExamAndStudent(c.Context(), examID, studentID)
	if err != nil || sess == nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", "Sesi ujian siswa tidak ditemukan"))
	}

	subAt := ""
	if sess.SubmittedAt != nil {
		subAt = sess.SubmittedAt.Format(time.RFC3339)
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
		"status":          sess.Status,
		"score":           sess.Score,
		"started_at":      sess.StartedAt.Format(time.RFC3339),
		"submitted_at":    subAt,
		"submittedAt":     subAt,
		"violationsCount": sess.ViolationCount,
		"violations_count": sess.ViolationCount,
	}, "Sesi ujian dimuat"))
}

func (h *ELearningHandler) GetLiveProctoring(c *fiber.Ctx) error {
	id := c.Params("id")
	exam, err := h.useCase.GetExamDetail(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", "ujian tidak ditemukan"))
	}
	if err := h.requireExamOwner(c, exam); err != nil {
		return c.Status(err.Code).JSON(responses.Fail("FORBIDDEN", err.Message))
	}
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
