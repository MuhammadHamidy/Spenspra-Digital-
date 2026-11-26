package http

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rapor/rapor-be/libraries/middleware"
	"github.com/rapor/rapor-be/libraries/responses"
	"github.com/rapor/rapor-be/rapor/module/elearning/domain"
)

type ELearningHandler struct {
	useCase domain.UseCase
}

func actorID(c *fiber.Ctx) string {
	if v, ok := c.Locals(middleware.XUserIdKey).(string); ok && strings.TrimSpace(v) != "" {
		return strings.TrimSpace(v)
	}
	return strings.TrimSpace(c.Get("X-User-Id"))
}

func actorRole(c *fiber.Ctx) string {
	if v, ok := c.Locals("user_role").(string); ok && strings.TrimSpace(v) != "" {
		return strings.ToUpper(strings.TrimSpace(v))
	}
	return strings.ToUpper(strings.TrimSpace(c.Get("X-User-Role")))
}

func actorName(c *fiber.Ctx) string {
	if v, ok := c.Locals("full_name").(string); ok && strings.TrimSpace(v) != "" {
		return strings.TrimSpace(v)
	}
	return strings.TrimSpace(c.Get("X-User-Name"))
}

func isTeacherRole(role string) bool {
	r := strings.ToUpper(strings.TrimSpace(role))
	return r == "GURU" || r == "TEACHER" || r == "PENDIDIK" || r == "WALI_KELAS" || r == "KOORDINATOR" ||
		r == "PROKTOR" || r == "ADMIN_PROKTOR" || r == "KOORDINATOR_UAS" || r == "GURU_PROKTOR"
}

func canManageAll(role string) bool {
	r := strings.ToUpper(strings.TrimSpace(role))
	return r == "ADMIN" || r == "SUPER_ADMIN" || r == "ADMIN_ELEARNING" ||
		r == "PROKTOR" || r == "ADMIN_PROKTOR" || r == "KOORDINATOR_UAS" || r == "GURU_PROKTOR"
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

func (h *ELearningHandler) RegisterRoutes(app *fiber.App, authMiddleware *middleware.AuthorizationMiddleware) {
	var api fiber.Router
	if authMiddleware != nil {
		api = app.Group("/api", authMiddleware.Authenticate())
	} else {
		api = app.Group("/api")
	}

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
	api.Delete("/sessions/:id", h.DeleteStudentSession)
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

var wibZone = time.FixedZone("WIB", 7*3600)

type CBTExamInput struct {
	ID                     string `json:"id"`
	Title                  string `json:"title"`
	Subject                string `json:"subject"`
	CourseName             string `json:"course_name"`
	SubjectCode            string `json:"subjectCode"`
	CourseID               string `json:"course_id"`
	ClassName              string `json:"className"`
	ClassCode              string `json:"class_code"`
	TeacherName            string `json:"teacherName"`
	TeacherNameSnake       string `json:"teacher_name"`
	TeacherID              string `json:"teacherId"`
	TeacherIDSnake         string `json:"teacher_id"`
	Token                  string `json:"token"`
	DurationMinutes        int    `json:"durationMinutes"`
	DurationMinutesSnake   int    `json:"duration_minutes"`
	MaxViolations          int    `json:"maxViolations"`
	MaxViolationsSnake     int    `json:"max_violations"`
	ScheduledDate          string `json:"scheduledDate"`
	StartTime              string `json:"startTime"`
	EndTime                string `json:"endTime"`
	StartDateTime          string `json:"startDateTime"`
	EndDateTime            string `json:"endDateTime"`
	Description            string `json:"description"`
	Status                 string `json:"status"`
	ExamCategory           string `json:"examCategory"`
	ExamCategorySnake      string `json:"exam_category"`
	TargetGradeLevel       string `json:"targetGradeLevel"`
	TargetGradeLevelSnake  string `json:"target_grade_level"`
	SupervisorPin          string `json:"supervisorPin"`
	SupervisorPinSnake     string `json:"supervisor_pin"`
	IsCoordinatorExam      bool   `json:"isCoordinatorExam"`
	IsCoordinatorExamSnake bool   `json:"is_coordinator_exam"`
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
			for _, layout := range []string{time.RFC3339, "2006-01-02T15:04:05Z07:00", "2006-01-02T15:04:05", "2006-01-02T15:04"} {
				if t, err := time.ParseInLocation(layout, dtStr, wibZone); err == nil {
					tWib := t.In(wibZone)
					return &tWib
				}
			}
		}
		if dStr != "" && tStr != "" {
			combined := dStr + "T" + tStr
			for _, layout := range []string{"2006-01-02T15:04", "2006-01-02T15:04:05"} {
				if t, err := time.ParseInLocation(layout, combined, wibZone); err == nil {
					tWib := t.In(wibZone)
					return &tWib
				}
			}
		}
		return nil
	}

	startT := parseTime(in.StartDateTime, in.ScheduledDate, in.StartTime)
	endT := parseTime(in.EndDateTime, in.ScheduledDate, in.EndTime)

	now := time.Now().In(wibZone)
	if stat == "ACTIVE" {
		stat = "ACTIVE"
		if startT != nil && startT.After(now) {
			startT = &now
		}
	} else if stat == "COMPLETED" || stat == "CLOSED" {
		stat = "COMPLETED"
	} else {
		switch {
		case endT != nil && !now.Before(*endT):
			stat = "COMPLETED"
		case startT != nil && now.Before(*startT):
			stat = "UPCOMING"
		case startT != nil:
			stat = "ACTIVE"
		}
	}

	return domain.CBTExam{
		ID:                in.ID,
		Title:             strings.TrimSpace(in.Title),
		ClassCode:         cls,
		CourseName:        cName,
		CourseID:          cID,
		TeacherName:       tName,
		TeacherID:         tID,
		Token:             strings.ToUpper(strings.TrimSpace(in.Token)),
		DurationMinutes:   dur,
		MaxViolations:     maxV,
		StartTime:         startT,
		EndTime:           endT,
		Description:       strings.TrimSpace(in.Description),
		ExamCategory:      firstNonEmpty(in.ExamCategorySnake, in.ExamCategory, "REGULAR"),
		TargetGradeLevel:  firstNonEmpty(in.TargetGradeLevelSnake, in.TargetGradeLevel),
		SupervisorPin:     strings.ToUpper(firstNonEmpty(in.SupervisorPinSnake, in.SupervisorPin)),
		IsCoordinatorExam: in.IsCoordinatorExam || in.IsCoordinatorExamSnake,
		Status:            stat,
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value = strings.TrimSpace(value); value != "" {
			return value
		}
	}
	return ""
}

func formatExamForFrontend(e domain.CBTExam) fiber.Map {
	sDate := ""
	sTime := ""
	eTime := ""
	sDateTime := ""
	eDateTime := ""
	status := strings.ToUpper(strings.TrimSpace(e.Status))
	now := time.Now().In(wibZone)

	if e.StartTime != nil {
		st := e.StartTime.In(wibZone)
		sDateTime = st.Format("2006-01-02T15:04:05+07:00")
		sDate = st.Format("2006-01-02")
		sTime = st.Format("15:04")
	}
	if e.EndTime != nil {
		et := e.EndTime.In(wibZone)
		eDateTime = et.Format("2006-01-02T15:04:05+07:00")
		eTime = et.Format("15:04")
	}

	if status != "COMPLETED" && status != "CLOSED" {
		if e.EndTime != nil && !now.Before(e.EndTime.In(wibZone)) {
			status = "COMPLETED"
		} else if status == "ACTIVE" {
			// Jika status sudah diaktifkan oleh guru, pertahankan ACTIVE sampai jam selesai
			status = "ACTIVE"
		} else if e.StartTime != nil {
			if now.Before(e.StartTime.In(wibZone)) {
				status = "UPCOMING"
			} else {
				status = "ACTIVE"
			}
		} else if status == "" {
			status = "UPCOMING"
		}
	}

	showScore := true
	if strings.Contains(e.Description, "[SCORE:0]") {
		showScore = false
	}
	showAnswers := false
	if strings.Contains(e.Description, "[ANSWERS:1]") {
		showAnswers = true
	}
	shuffleQuestions := strings.Contains(e.Description, "[SHUFFLE_Q:1]")
	shuffleOptions := strings.Contains(e.Description, "[SHUFFLE_OPT:1]")

	cleanDesc := e.Description
	for _, tag := range []string{
		"[SCORE:0]", "[SCORE:1]", "[ANSWERS:0]", "[ANSWERS:1]",
		"[CAT:SEMESTER_UAS]", "[CAT:SEMESTER_UTS]", "[CAT:TKA]", "[CAT:REGULAR]",
		"[SHUFFLE_Q:0]", "[SHUFFLE_Q:1]", "[SHUFFLE_OPT:0]", "[SHUFFLE_OPT:1]",
	} {
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
		"examCategory":            e.ExamCategory,
		"exam_category":           e.ExamCategory,
		"targetGradeLevel":        e.TargetGradeLevel,
		"target_grade_level":      e.TargetGradeLevel,
		"supervisorPin":           e.SupervisorPin,
		"supervisor_pin":          e.SupervisorPin,
		"isCoordinatorExam":       e.IsCoordinatorExam,
		"is_coordinator_exam":     e.IsCoordinatorExam,
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
		"shuffleQuestions":        shuffleQuestions,
		"shuffle_questions":       shuffleQuestions,
		"shuffleOptions":          shuffleOptions,
		"shuffle_options":         shuffleOptions,
		"status":                  status,
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
	forRapor := c.Query("for_rapor") == "true"
	if isTeacherRole(role) && !canManageAll(role) && !forRapor && (actorID(c) != "" || strings.TrimSpace(c.Get("X-User-Name")) != "") {
		filtered := list[:0]
		for _, exam := range list {
			isParallelExam := exam.IsCoordinatorExam || exam.ExamCategory == "SEMESTER_UAS" || exam.ExamCategory == "SEMESTER_UTS" || exam.ExamCategory == "TKA" || exam.TargetGradeLevel != ""
			if isParallelExam || isOwnedByActor(c, exam.TeacherID, exam.TeacherName) {
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
		req.CourseName = "Umum"
	}
	if req.CourseID == "" {
		req.CourseID = "MAPEL"
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

	if category := firstNonEmpty(input.ExamCategorySnake, input.ExamCategory); category != "" {
		req.ExamCategory = strings.ToUpper(category)
	}
	if level := firstNonEmpty(input.TargetGradeLevelSnake, input.TargetGradeLevel); level != "" {
		req.TargetGradeLevel = level
	}
	if pin := firstNonEmpty(input.SupervisorPinSnake, input.SupervisorPin); pin != "" {
		req.SupervisorPin = strings.ToUpper(pin)
	}
	if input.IsCoordinatorExam || input.IsCoordinatorExamSnake {
		req.IsCoordinatorExam = true
	}

	if stat := strings.TrimSpace(input.Status); stat != "" {
		req.Status = strings.ToUpper(stat)
	}

	if desc := strings.TrimSpace(input.Description); desc != "" {
		req.Description = desc
	}

	parseTime := func(dtStr, dStr, tStr string) *time.Time {
		if dtStr != "" {
			for _, layout := range []string{time.RFC3339, "2006-01-02T15:04:05Z07:00", "2006-01-02T15:04:05", "2006-01-02T15:04"} {
				if t, err := time.ParseInLocation(layout, dtStr, wibZone); err == nil {
					tWib := t.In(wibZone)
					return &tWib
				}
			}
		}
		if dStr != "" && tStr != "" {
			combined := dStr + "T" + tStr
			for _, layout := range []string{"2006-01-02T15:04", "2006-01-02T15:04:05"} {
				if t, err := time.ParseInLocation(layout, combined, wibZone); err == nil {
					tWib := t.In(wibZone)
					return &tWib
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

	now := time.Now().In(wibZone)
	if strings.ToUpper(input.Status) == "ACTIVE" {
		req.Status = "ACTIVE"
		if req.StartTime != nil && req.StartTime.After(now) {
			req.StartTime = &now
		}
	} else if strings.ToUpper(input.Status) == "COMPLETED" || strings.ToUpper(input.Status) == "CLOSED" {
		req.Status = "COMPLETED"
	} else {
		switch {
		case req.EndTime != nil && !now.Before(*req.EndTime):
			req.Status = "COMPLETED"
		case req.StartTime != nil && now.Before(*req.StartTime):
			req.Status = "UPCOMING"
		case req.StartTime != nil:
			req.Status = "ACTIVE"
		}
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
	Key           string `json:"key"`
	Text          string `json:"text"`
	ImageURL      string `json:"imageUrl,omitempty"`
	ImageURLSnake string `json:"image_url,omitempty"`
}

type CBTMatchingPairInput struct {
	ID     interface{} `json:"id"`
	Left   string      `json:"left"`
	Right  string      `json:"right"`
	Rights []string    `json:"rights,omitempty"`
}

type CBTQuestionInput struct {
	ID                   string                   `json:"id"`
	QuestionNumber       int                      `json:"questionNumber"`
	QuestionNumberSnake  int                      `json:"question_number"`
	Type                 string                   `json:"type"`
	QuestionType         string                   `json:"question_type"`
	QuestionText         string                   `json:"questionText"`
	QuestionTextSnake    string                   `json:"question_text"`
	StimulusText         string                   `json:"stimulusText"`
	ImageURL             string                   `json:"imageUrl"`
	ImageURLSnake        string                   `json:"image_url"`
	Options              []CBTQuestionOptionInput `json:"options"`
	OptionA              string                   `json:"option_a"`
	OptionB              string                   `json:"option_b"`
	OptionC              string                   `json:"option_c"`
	OptionD              string                   `json:"option_d"`
	OptionE              string                   `json:"option_e"`
	CorrectOption        string                   `json:"correctOption"`
	CorrectAnswer        string                   `json:"correct_answer"`
	CorrectOptions       []string                 `json:"correctOptions"`
	TrueFalseAnswer      *bool                    `json:"trueFalseAnswer"`
	MatchingPairs        []CBTMatchingPairInput   `json:"matchingPairs"`
	MatchingRightOptions []string                 `json:"matchingRightOptions,omitempty"`
	MatchingMultiSelect  bool                     `json:"matchingMultiSelect,omitempty"`
	EssayRubric          string                   `json:"essayRubric"`
	Points               float64                  `json:"points"`
	ScoreWeight          float64                  `json:"score_weight"`
}

type CBTQuestionMeta struct {
	Type                 string                   `json:"type,omitempty"`
	StimulusText         string                   `json:"stimulusText,omitempty"`
	Options              []CBTQuestionOptionInput `json:"options,omitempty"`
	CorrectOptions       []string                 `json:"correctOptions,omitempty"`
	TrueFalseAnswer      *bool                    `json:"trueFalseAnswer,omitempty"`
	MatchingPairs        []CBTMatchingPairInput   `json:"matchingPairs,omitempty"`
	MatchingRightOptions []string                 `json:"matchingRightOptions,omitempty"`
	MatchingMultiSelect  bool                     `json:"matchingMultiSelect,omitempty"`
	EssayRubric          string                   `json:"essayRubric,omitempty"`
	Points               float64                  `json:"points,omitempty"`
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
		optVal := opt.Text
		if optVal == "" && (opt.ImageURL != "" || opt.ImageURLSnake != "") {
			optVal = opt.ImageURL
			if optVal == "" {
				optVal = opt.ImageURLSnake
			}
		}
		switch k {
		case "A":
			optA = optVal
		case "B":
			optB = optVal
		case "C":
			optC = optVal
		case "D":
			optD = optVal
		case "E":
			optE = optVal
		}
	}

	corr := strings.ToUpper(strings.TrimSpace(in.CorrectOption))
	if corr == "" {
		corr = strings.ToUpper(strings.TrimSpace(in.CorrectAnswer))
	}
	switch qType {
	case "COMPLEX_MCQ":
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
	case "TRUE_FALSE":
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
	case "MATCHING":
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
		Type:                 qType,
		StimulusText:         strings.TrimSpace(in.StimulusText),
		Options:              in.Options,
		CorrectOptions:       in.CorrectOptions,
		TrueFalseAnswer:      in.TrueFalseAnswer,
		MatchingPairs:        in.MatchingPairs,
		MatchingRightOptions: in.MatchingRightOptions,
		MatchingMultiSelect:  in.MatchingMultiSelect,
		EssayRubric:          strings.TrimSpace(in.EssayRubric),
		Points:               pts,
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
	if len(meta.Options) > 0 {
		for _, option := range meta.Options {
			img := option.ImageURL
			if img == "" {
				img = option.ImageURLSnake
			}
			if strings.TrimSpace(option.Text) == "" && strings.TrimSpace(img) == "" {
				continue
			}
			opts = append(opts, fiber.Map{
				"key":      option.Key,
				"text":     option.Text,
				"imageUrl": img,
			})
		}
	} else {
		mapOpt := func(k, val string) {
			if val == "" {
				return
			}
			if strings.HasPrefix(val, "data:image") || strings.HasPrefix(val, "http") {
				opts = append(opts, fiber.Map{"key": k, "text": "", "imageUrl": val})
			} else {
				opts = append(opts, fiber.Map{"key": k, "text": val})
			}
		}
		mapOpt("A", q.OptionA)
		mapOpt("B", q.OptionB)
		mapOpt("C", q.OptionC)
		mapOpt("D", q.OptionD)
		mapOpt("E", q.OptionE)
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
		"trueFalseAnswer":      tfAns,
		"matchingPairs":        matchingPairs,
		"matchingRightOptions": meta.MatchingRightOptions,
		"matchingMultiSelect":  meta.MatchingMultiSelect,
		"essayRubric":          meta.EssayRubric,
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
	exam, err := h.useCase.GetExamDetail(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", "Ujian tidak ditemukan"))
	}
	now := time.Now()
	if exam.EndTime != nil && !now.Before(*exam.EndTime) {
		return c.Status(http.StatusForbidden).JSON(responses.Fail("EXAM_CLOSED", "Waktu ujian telah berakhir"))
	}
	if exam.StartTime != nil && now.Before(*exam.StartTime) {
		return c.Status(http.StatusForbidden).JSON(responses.Fail("EXAM_NOT_STARTED", "Ujian belum memasuki jadwal pengerjaan"))
	}
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
	if sID == "" {
		sID = actorID(c)
	}
	sName := strings.TrimSpace(req.StudentName)
	if sName == "" {
		sName = strings.TrimSpace(req.StudentNameCamel)
	}
	if sName == "" {
		sName = actorName(c)
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
		return c.Status(http.StatusOK).JSON(responses.Success((*domain.CBTStudentSession)(nil), "Sesi ujian siswa belum dibuat"))
	}

	exam, examErr := h.useCase.GetExamDetail(c.Context(), examID)
	if examErr == nil && exam.EndTime != nil && !time.Now().Before(*exam.EndTime) &&
		(sess.Status == "IN_PROGRESS" || sess.Status == "LOCKED") {
		_ = h.useCase.FinishStudentExam(c.Context(), sess.ID, sess.Score, nil)
		sess.Status = "SUBMITTED"
		now := time.Now()
		sess.SubmittedAt = &now
	}

	subAt := ""
	if sess.SubmittedAt != nil {
		subAt = sess.SubmittedAt.Format(time.RFC3339)
	}

	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{
		"id":               sess.ID,
		"sessionId":        sess.ID,
		"exam_id":          sess.ExamID,
		"examId":           sess.ExamID,
		"student_id":       sess.StudentID,
		"studentId":        sess.StudentID,
		"student_name":     sess.StudentName,
		"studentName":      sess.StudentName,
		"class_code":       sess.ClassCode,
		"className":        sess.ClassCode,
		"status":           sess.Status,
		"score":            sess.Score,
		"started_at":       sess.StartedAt.Format(time.RFC3339),
		"submitted_at":     subAt,
		"submittedAt":      subAt,
		"violationsCount":  sess.ViolationCount,
		"violations_count": sess.ViolationCount,
	}, "Sesi ujian dimuat"))
}

func (h *ELearningHandler) DeleteStudentSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	if strings.TrimSpace(sessionID) == "" {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("INVALID_PAYLOAD", "session id wajib diisi"))
	}

	sess, err := h.useCase.GetStudentSessionByID(c.Context(), sessionID)
	if err != nil || sess == nil {
		return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{"session_id": sessionID}, "Sesi siswa sudah dihapus atau tidak ditemukan"))
	}

	exam, examErr := h.useCase.GetExamDetail(c.Context(), sess.ExamID)
	if examErr == nil && exam != nil {
		isSharedExam := exam.IsCoordinatorExam || exam.ExamCategory == "SEMESTER_UAS" || exam.ExamCategory == "SEMESTER_UTS" || exam.ExamCategory == "TKA" || exam.TargetGradeLevel != ""
		if !isSharedExam {
			if permErr := h.requireExamOwner(c, exam); permErr != nil {
				return c.Status(permErr.Code).JSON(responses.Fail("FORBIDDEN", permErr.Message))
			}
		} else {
			role := actorRole(c)
			if role != "" && !canManageAll(role) && !isTeacherRole(role) {
				return c.Status(http.StatusForbidden).JSON(responses.Fail("FORBIDDEN", "hanya guru atau pengawas yang dapat menghapus jawaban siswa"))
			}
		}
	}

	if err := h.useCase.DeleteStudentSession(c.Context(), sessionID); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{"session_id": sessionID}, "Sesi dan jawaban siswa berhasil dihapus"))
}

func (h *ELearningHandler) GetLiveProctoring(c *fiber.Ctx) error {
	id := c.Params("id")
	exam, err := h.useCase.GetExamDetail(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", "ujian tidak ditemukan"))
	}
	isSharedExam := exam.IsCoordinatorExam || exam.ExamCategory == "SEMESTER_UAS" || exam.ExamCategory == "SEMESTER_UTS" || exam.ExamCategory == "TKA" || exam.TargetGradeLevel != "" || c.Query("for_rapor") == "true"
	if !isSharedExam {
		if err := h.requireExamOwner(c, exam); err != nil {
			return c.Status(err.Code).JSON(responses.Fail("FORBIDDEN", err.Message))
		}
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
