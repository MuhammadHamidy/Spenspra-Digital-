package http

import (
	"net/http"

	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

func (h *AttendanceHandler) GetAll(c *fiber.Ctx) error {
	search := c.Query("search")
	date := c.Query("date")
	list, err := h.useCase.GetAll(c.Context(), search, date)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Berhasil mengambil riwayat kunjungan"))
}

func (h *AttendanceHandler) GetStats(c *fiber.Ctx) error {
	stats, err := h.useCase.GetStats(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(stats, "Statistik kunjungan perpustakaan"))
}
