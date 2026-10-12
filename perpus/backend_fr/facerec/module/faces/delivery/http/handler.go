package http

import (
	"github.com/facerec/facerec-be/facerec/module/faces/domain"
	"github.com/gofiber/fiber/v2"
)

type FaceHandler struct {
	useCase domain.UseCase
}

func NewFaceHandler(useCase domain.UseCase) *FaceHandler {
	return &FaceHandler{useCase: useCase}
}

func (h *FaceHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/faces")
	api.Post("/register", h.RegisterFace)
	api.Get("/user/:userId", h.GetByUserID)
	api.Post("/match", h.MatchFace)
}
