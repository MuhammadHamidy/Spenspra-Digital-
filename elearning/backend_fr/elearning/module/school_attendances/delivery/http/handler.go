package http

import (
	"net/http"
	"strconv"

	"github.com/rapor/rapor-be/rapor/module/school_attendances/domain"
	"github.com/rapor/rapor-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

type SchoolAttendanceHandler struct {
	useCase domain.UseCase
}

func NewSchoolAttendanceHandler(useCase domain.UseCase) *SchoolAttendanceHandler {
	return &SchoolAttendanceHandler{useCase: useCase}
}

func (h *SchoolAttendanceHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/school")

	// Sesi Kelas
	api.Post("/sessions/open", h.OpenSession)
	api.Post("/sessions/:id/close", h.CloseSession)
	api.Get("/sessions/:id", h.GetSessionDetail)
	api.Get("/sessions", h.GetSessions)

	// Pemindaian & Override Kehadiran
	api.Post("/sessions/:id/scan", h.ScanQRCode)
	api.Put("/sessions/:id/attendances/:student_id", h.ManualOverride)

	// Monitoring Live & Tools
	api.Get("/monitoring/live", h.GetLiveMonitoring)
	api.Get("/qrcode/:token", h.GetQRCodeImage)

	// Kelola Mata Pelajaran & Pengampu (Admin e-Rapor)
	api.Get("/courses", h.GetCourses)
	api.Post("/courses", h.CreateCourse)
	api.Put("/courses/:id", h.UpdateCourse)
	api.Delete("/courses/:id", h.DeleteCourse)
	api.Get("/classes", h.GetClasses)
	api.Post("/classes", h.CreateClass)
	api.Put("/classes/:id", h.UpdateClass)
	api.Delete("/classes/:id", h.DeleteClass)

	// Kelola Siswa, Guru & Penetapan Walas (e-Rapor)
	api.Get("/students", h.GetStudents)
	api.Get("/rombel", h.GetRombel)
	api.Get("/teachers", h.GetTeachers)
	api.Post("/teachers", h.CreateTeacher)
	api.Put("/teachers/:id", h.UpdateTeacher)
	api.Delete("/teachers/:id", h.DeleteTeacher)
	api.Post("/sync-sso", h.SyncFromSSO)
}


func (h *SchoolAttendanceHandler) OpenSession(c *fiber.Ctx) error {
	var req domain.OpenSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	// Ambil teacher_id dari query/header jika ada, atau default guru
	teacherID := c.Query("teacher_id", "")
	if teacherID == "" {
		teacherID = c.Get("X-User-Id", "user-guru-1")
	}

	sess, err := h.useCase.OpenSession(c.Context(), teacherID, req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("OPEN_SESSION_ERROR", err.Error()))
	}

	return c.Status(http.StatusCreated).JSON(responses.Success(sess, "Sesi kelas berhasil dibuka. Timer 15 menit berjalan."))
}

func (h *SchoolAttendanceHandler) CloseSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	teacherID := c.Get("X-User-Id", "")

	summary, err := h.useCase.CloseSession(c.Context(), teacherID, sessionID)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("CLOSE_SESSION_ERROR", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(summary, "Sesi kelas resmi ditutup. Siswa tanpa keterangan telah ditandai ALPHA."))
}

func (h *SchoolAttendanceHandler) GetSessionDetail(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	detail, err := h.useCase.GetSessionDetail(c.Context(), sessionID)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(detail, "Detail sesi berhasil dimuat"))
}

func (h *SchoolAttendanceHandler) GetSessions(c *fiber.Ctx) error {
	teacherID := c.Query("teacher_id", "")
	classID := c.Query("class_id", "")
	status := c.Query("status", "")

	list, err := h.useCase.GetTeacherSessions(c.Context(), teacherID, classID, status)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("INTERNAL_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Daftar sesi berhasil dimuat"))
}

func (h *SchoolAttendanceHandler) ScanQRCode(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	var req domain.ScanQRRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format request tidak valid"))
	}

	res, err := h.useCase.ScanQRCode(c.Context(), sessionID, req.QRCodeToken)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("SCAN_FAILED", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(res, res.Message))
}

func (h *SchoolAttendanceHandler) ManualOverride(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	studentID := c.Params("student_id")
	teacherID := c.Get("X-User-Id", "user-guru-1")

	var req domain.ManualOverrideRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	if err := h.useCase.ManualOverride(c.Context(), teacherID, sessionID, studentID, req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("OVERRIDE_FAILED", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(true, "Status kehadiran siswa berhasil diubah secara manual"))
}

func (h *SchoolAttendanceHandler) GetLiveMonitoring(c *fiber.Ctx) error {
	list, err := h.useCase.GetLiveMonitoring(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("MONITORING_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Data monitoring kelas aktif berhasil dimuat"))
}

func (h *SchoolAttendanceHandler) GetQRCodeImage(c *fiber.Ctx) error {
	token := c.Params("token")
	sizeStr := c.Query("size", "256")
	size, _ := strconv.Atoi(sizeStr)

	pngBytes, err := h.useCase.GenerateQRCodePNG(c.Context(), token, size)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("QR_GEN_ERROR", err.Error()))
	}

	c.Set("Content-Type", "image/png")
	return c.Status(http.StatusOK).Send(pngBytes)
}

func (h *SchoolAttendanceHandler) GetCourses(c *fiber.Ctx) error {
	courses, err := h.useCase.GetCourses(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("INTERNAL_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(courses, "Daftar mata pelajaran berhasil dimuat"))
}

func (h *SchoolAttendanceHandler) CreateCourse(c *fiber.Ctx) error {
	var course domain.Course
	if err := c.BodyParser(&course); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format input tidak valid"))
	}
	if err := h.useCase.CreateCourse(c.Context(), &course); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("CREATE_FAILED", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(course, "Mata pelajaran berhasil ditambahkan"))
}

func (h *SchoolAttendanceHandler) UpdateCourse(c *fiber.Ctx) error {
	var course domain.Course
	if err := c.BodyParser(&course); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format input tidak valid"))
	}
	course.ID = c.Params("id")
	if err := h.useCase.UpdateCourse(c.Context(), &course); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("UPDATE_FAILED", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(course, "Mata pelajaran berhasil diperbarui"))
}

func (h *SchoolAttendanceHandler) DeleteCourse(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.useCase.DeleteCourse(c.Context(), id); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("DELETE_FAILED", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(true, "Mata pelajaran berhasil dihapus"))
}

func (h *SchoolAttendanceHandler) GetClasses(c *fiber.Ctx) error {
	list, err := h.useCase.GetClasses(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("INTERNAL_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Daftar kelas berhasil dimuat"))
}

func (h *SchoolAttendanceHandler) CreateClass(c *fiber.Ctx) error {
	var class domain.Class
	if err := c.BodyParser(&class); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format input kelas tidak valid"))
	}
	if err := h.useCase.CreateClass(c.Context(), &class); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("CREATE_FAILED", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(class, "Kelas berhasil ditambahkan"))
}

func (h *SchoolAttendanceHandler) UpdateClass(c *fiber.Ctx) error {
	var class domain.Class
	if err := c.BodyParser(&class); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format input kelas tidak valid"))
	}
	class.ID = c.Params("id")
	if err := h.useCase.UpdateClass(c.Context(), &class); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("UPDATE_FAILED", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(class, "Kelas berhasil diperbarui"))
}

func (h *SchoolAttendanceHandler) DeleteClass(c *fiber.Ctx) error {
	if err := h.useCase.DeleteClass(c.Context(), c.Params("id")); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("DELETE_FAILED", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(true, "Kelas berhasil dihapus"))
}

func (h *SchoolAttendanceHandler) GetTeachers(c *fiber.Ctx) error {
	list, err := h.useCase.GetTeachers(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("INTERNAL_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Daftar guru berhasil dimuat"))
}

func (h *SchoolAttendanceHandler) CreateTeacher(c *fiber.Ctx) error {
	var teacher domain.Teacher
	if err := c.BodyParser(&teacher); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format input data guru tidak valid"))
	}
	if err := h.useCase.CreateTeacher(c.Context(), &teacher); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("CREATE_FAILED", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(teacher, "Data guru berhasil ditambahkan"))
}

func (h *SchoolAttendanceHandler) UpdateTeacher(c *fiber.Ctx) error {
	var teacher domain.Teacher
	if err := c.BodyParser(&teacher); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format input data guru tidak valid"))
	}
	teacher.ID = c.Params("id")
	if err := h.useCase.UpdateTeacher(c.Context(), &teacher); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("UPDATE_FAILED", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(teacher, "Data guru berhasil diperbarui"))
}

func (h *SchoolAttendanceHandler) DeleteTeacher(c *fiber.Ctx) error {
	if err := h.useCase.DeleteTeacher(c.Context(), c.Params("id")); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("DELETE_FAILED", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(true, "Data guru berhasil dihapus"))
}

func (h *SchoolAttendanceHandler) GetStudents(c *fiber.Ctx) error {
	className := c.Query("class_name", "")
	students, err := h.useCase.GetStudents(c.Context(), className)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(students, "Daftar siswa berhasil dimuat"))
}

func (h *SchoolAttendanceHandler) GetRombel(c *fiber.Ctx) error {
	list, err := h.useCase.GetRombel(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Daftar rombel berhasil dimuat"))
}

func (h *SchoolAttendanceHandler) SyncFromSSO(c *fiber.Ctx) error {
	stats, err := h.useCase.SyncFromSSO(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SYNC_FAILED", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(stats, "Berhasil menyinkronkan data guru & siswa dari Master SSO"))
}


