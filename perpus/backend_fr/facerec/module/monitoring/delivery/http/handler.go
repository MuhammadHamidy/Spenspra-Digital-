package http

import (
	"net/http"

	"github.com/facerec/facerec-be/facerec/module/monitoring/domain"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

type MonitoringHandler struct {
	useCase domain.UseCase
}

func NewMonitoringHandler(useCase domain.UseCase) *MonitoringHandler {
	return &MonitoringHandler{useCase: useCase}
}

func (h *MonitoringHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/monitoring")
	// Open endpoint — Kepala Sekolah fetches summary from SSO portal (no per-user auth needed here).
	api.Get("/summary", h.GetSummary)
}

// GetSummary godoc
// @Summary     Get library executive summary
// @Description Returns aggregated library metrics for Kepala Sekolah dashboard
// @Tags        monitoring
// @Produce     json
// @Success     200  {object}  domain.LibrarySummary
// @Router      /api/monitoring/summary [get]
func (h *MonitoringHandler) GetSummary(c *fiber.Ctx) error {
	summary, err := h.useCase.GetSummary(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(summary, "Berhasil mengambil ringkasan perpustakaan"))
}
