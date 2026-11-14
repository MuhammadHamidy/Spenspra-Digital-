package http

import (
	"strings"

	"github.com/facerec/facerec-be/facerec/module/reading_resumes/domain"
	"github.com/facerec/facerec-be/libraries/middleware"
	"github.com/gofiber/fiber/v2"
)

type ResumeHandler struct {
	useCase domain.UseCase
	auth    *middleware.AuthorizationMiddleware
}

func NewResumeHandler(useCase domain.UseCase, auth *middleware.AuthorizationMiddleware) *ResumeHandler {
	return &ResumeHandler{useCase: useCase, auth: auth}
}

func requireEducator(c *fiber.Ctx) error {
	role, ok := c.Locals("user_role").(string)
	if !ok || role == "" {
		return fiber.ErrUnauthorized
	}

	switch strings.ToUpper(role) {
	case "GURU", "WALI_KELAS", "PUSTAKAWAN", "ADMIN", "ADMIN_PERPUS", "SUPER_ADMIN":
		return c.Next()
	default:
		return fiber.NewError(fiber.StatusForbidden, "akses literasi hanya tersedia untuk guru atau petugas perpustakaan")
	}
}

func (h *ResumeHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/reading-resumes")
	api.Use(h.auth.Authenticate(), requireEducator)
	api.Get("/", h.GetAll)
	api.Get("/insights", h.GetInsights)
	api.Get("/:id", h.GetByID)
	api.Post("/", h.Create)
	api.Put("/:id", h.Update)
	api.Delete("/:id", h.Delete)
}
