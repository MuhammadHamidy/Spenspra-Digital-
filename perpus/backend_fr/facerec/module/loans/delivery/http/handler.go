package http

import (
	"github.com/facerec/facerec-be/facerec/module/loans/domain"
	"github.com/gofiber/fiber/v2"
)

type LoanHandler struct {
	useCase domain.UseCase
}

func NewLoanHandler(useCase domain.UseCase) *LoanHandler {
	return &LoanHandler{useCase: useCase}
}

func (h *LoanHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/loans")
	api.Get("/", h.GetAll)
	api.Get("/stats", h.GetSummaryStats)
	api.Get("/:id", h.GetByID)
	api.Post("/borrow", h.Borrow)
	api.Post("/return", h.Return)
	api.Post("/:id/pay-fine", h.PayFine)
}
