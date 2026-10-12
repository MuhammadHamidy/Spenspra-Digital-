package http

import (
	"github.com/facerec/facerec-be/facerec/module/library_attendances/domain"
	"github.com/gofiber/fiber/v2"
)

type AttendanceHandler struct {
	useCase domain.UseCase
}

func NewAttendanceHandler(useCase domain.UseCase) *AttendanceHandler {
	return &AttendanceHandler{useCase: useCase}
}

func (h *AttendanceHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/library-attendances")
	api.Get("/", h.GetAll)
	api.Get("/stats", h.GetStats)
	api.Post("/recognize", h.RecognizeAndAttend)
	api.Post("/manual", h.RecordManualVisit)
}
