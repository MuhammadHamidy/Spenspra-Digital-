package http

import (
	"github.com/facerec/facerec-be/facerec/module/reading_resumes/domain"
	"github.com/gofiber/fiber/v2"
)

type ResumeHandler struct {
	useCase domain.UseCase
}

func NewResumeHandler(useCase domain.UseCase) *ResumeHandler {
	return &ResumeHandler{useCase: useCase}
}

func (h *ResumeHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/reading-resumes")
	api.Get("/", h.GetAll)
	api.Get("/insights", h.GetInsights)
	api.Get("/:id", h.GetByID)
	api.Post("/", h.Create)
	api.Put("/:id", h.Update)
	api.Delete("/:id", h.Delete)
}
