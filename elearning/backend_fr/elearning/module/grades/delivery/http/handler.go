package http

import (
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/rapor/rapor-be/libraries/responses"
	"github.com/rapor/rapor-be/rapor/module/grades/domain"
)

type GradeHandler struct {
	useCase domain.UseCase
}

func NewGradeHandler(useCase domain.UseCase) *GradeHandler {
	return &GradeHandler{useCase: useCase}
}

func (h *GradeHandler) RegisterRoutes(app *fiber.App) {
	app.Get("/api/grades", h.List)
	app.Post("/api/grades/bulk", h.SaveBulk)
	app.Get("/api/monitoring/summary", h.GetSummary)
	app.Get("/api/grades/deadlines", h.GetDeadlines)
	app.Post("/api/grades/deadlines", h.SaveDeadline)

	// Kunci Nilai & Log
	app.Get("/api/grades/locks", h.GetLocks)
	app.Post("/api/grades/locks", h.SetLock)
	app.Get("/api/grades/logs", h.GetLogs)

	// Pengesahan Rapor Kepala Sekolah
	app.Get("/api/endorsements", h.GetEndorsements)
	app.Post("/api/endorsements", h.SaveEndorsement)

	// Backup & Restore
	app.Get("/api/backup", h.ExportBackup)
	app.Post("/api/restore", h.RestoreBackup)

	// Hapus / Reset Nilai
	app.Delete("/api/grades", h.DeleteGrades)
}

func (h *GradeHandler) List(c *fiber.Ctx) error {
	list, err := h.useCase.List(c.Context(), domain.GradeFilter{
		ClassName:      c.Query("class_name"),
		SubjectCode:    c.Query("subject_code"),
		AssessmentType: c.Query("assessment_type"),
		AcademicYear:   c.Query("academic_year"),
		Semester:       c.Query("semester"),
	})
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Data nilai berhasil dimuat"))
}

func (h *GradeHandler) SaveBulk(c *fiber.Ctx) error {
	var req domain.BulkGradeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	if req.TeacherID == "" {
		req.TeacherID = c.Get("X-User-Id", "")
	}
	reason := c.Query("reason", c.Get("X-Change-Reason", ""))
	saved, err := h.useCase.SaveBulk(c.Context(), req, reason)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("SAVE_GRADES_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{"saved": saved}, "Nilai berhasil disimpan"))
}

func (h *GradeHandler) GetSummary(c *fiber.Ctx) error {
	var kkm float64
	if kkmStr := c.Query("kkm"); kkmStr != "" {
		if val, err := strconv.ParseFloat(kkmStr, 64); err == nil && val > 0 {
			kkm = val
		}
	}
	if kkm <= 0 {
		if kkmCookie := c.Cookies("spenspra_school_kkm"); kkmCookie != "" {
			if val, err := strconv.ParseFloat(kkmCookie, 64); err == nil && val > 0 {
				kkm = val
			}
		}
	}

	s, err := h.useCase.GetSummary(c.Context(), kkm)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(s, "Ringkasan akademik berhasil dimuat"))
}

func (h *GradeHandler) GetDeadlines(c *fiber.Ctx) error {
	list, err := h.useCase.GetDeadlines(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Daftar tenggat nilai berhasil dimuat"))
}

func (h *GradeHandler) SaveDeadline(c *fiber.Ctx) error {
	var dl domain.GradeDeadline
	if err := c.BodyParser(&dl); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format input tenggat tidak valid"))
	}
	if err := h.useCase.SaveDeadline(c.Context(), &dl); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("SAVE_DEADLINE_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(dl, "Tenggat nilai berhasil disimpan"))
}

// ===== Kunci Nilai & Log Handlers =====

func (h *GradeHandler) GetLocks(c *fiber.Ctx) error {
	className := c.Query("class_name")
	subjectCode := c.Query("subject_code")
	assessmentType := c.Query("assessment_type", "PTS")
	academicYear := c.Query("academic_year", "2025/2026")
	semester := c.Query("semester", "GENAP")

	if subjectCode != "" {
		lock, err := h.useCase.GetLock(c.Context(), className, subjectCode, assessmentType, academicYear, semester)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
		}
		return c.Status(http.StatusOK).JSON(responses.Success(lock, "Status kunci nilai berhasil dimuat"))
	}

	locks, err := h.useCase.ListLocks(c.Context(), className, academicYear, semester)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(locks, "Daftar kunci nilai berhasil dimuat"))
}

func (h *GradeHandler) SetLock(c *fiber.Ctx) error {
	var req domain.LockRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format request penguncian tidak valid"))
	}
	if req.LockedByID == "" {
		req.LockedByID = c.Get("X-User-Id", "")
	}
	lock, err := h.useCase.SetLock(c.Context(), req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("LOCK_ERROR", err.Error()))
	}
	statusMsg := "Nilai berhasil difinalisasi & dikunci"
	if !req.IsLocked {
		statusMsg = "Kunci nilai berhasil dibuka"
	}
	return c.Status(http.StatusOK).JSON(responses.Success(lock, statusMsg))
}

func (h *GradeHandler) GetLogs(c *fiber.Ctx) error {
	filter := domain.GradeChangeLogFilter{
		StudentID:      c.Query("student_id"),
		ClassName:      c.Query("class_name"),
		SubjectCode:    c.Query("subject_code"),
		AssessmentType: c.Query("assessment_type"),
		AcademicYear:   c.Query("academic_year"),
		Semester:       c.Query("semester"),
	}
	logs, err := h.useCase.GetChangeLogs(c.Context(), filter)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(logs, "Log perubahan nilai berhasil dimuat"))
}

// ===== Pengesahan Rapor Kepala Sekolah Handlers =====

func (h *GradeHandler) GetEndorsements(c *fiber.Ctx) error {
	academicYear := c.Query("academic_year", "2025/2026")
	semester := c.Query("semester", "GENAP")
	list, err := h.useCase.GetEndorsements(c.Context(), academicYear, semester)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Daftar pengesahan rapor berhasil dimuat"))
}

func (h *GradeHandler) SaveEndorsement(c *fiber.Ctx) error {
	var end domain.ReportEndorsement
	if err := c.BodyParser(&end); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format data pengesahan tidak valid"))
	}
	if end.PrincipalID == "" {
		end.PrincipalID = c.Get("X-User-Id", "")
	}
	if err := h.useCase.SaveEndorsement(c.Context(), &end); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("ENDORSEMENT_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(end, "Rapor berhasil disahkan oleh Kepala Sekolah"))
}

// ===== Backup & Restore Handlers =====

func (h *GradeHandler) ExportBackup(c *fiber.Ctx) error {
	backup, err := h.useCase.ExportBackup(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("BACKUP_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(backup, "Snapshot backup e-rapor berhasil dibuat"))
}

func (h *GradeHandler) RestoreBackup(c *fiber.Ctx) error {
	var backup domain.BackupData
	if err := c.BodyParser(&backup); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format berkas backup tidak valid"))
	}
	if err := h.useCase.RestoreBackup(c.Context(), &backup); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("RESTORE_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{
		"grades_restored":       len(backup.Grades),
		"locks_restored":        len(backup.Locks),
		"logs_restored":         len(backup.Logs),
		"endorsements_restored": len(backup.Endorsements),
	}, "Data e-Rapor berhasil dipulihkan (restore)"))
}

func (h *GradeHandler) DeleteGrades(c *fiber.Ctx) error {
	all := c.Query("all") == "true"
	className := c.Query("class_name")
	subjectCode := c.Query("subject_code")
	teacherID := c.Query("teacher_id")
	assessmentType := c.Query("assessment_type")
	academicYear := c.Query("academic_year")
	semester := c.Query("semester")

	f := domain.GradeFilter{
		ClassName:      className,
		SubjectCode:    subjectCode,
		AssessmentType: assessmentType,
		AcademicYear:   academicYear,
		Semester:       semester,
		TeacherID:      teacherID,
	}

	deleted, err := h.useCase.DeleteGrades(c.Context(), f, all)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("DELETE_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{
		"deleted_count": deleted,
	}, "Data nilai berhasil dihapus"))
}

