package http

import (
	"net/http"

	"github.com/facerec/facerec-be/facerec/module/loans/domain"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

func (h *LoanHandler) GetAll(c *fiber.Ctx) error {
	filter := domain.LoanFilter{
		Status:   c.Query("status"),
		MemberID: c.Query("member_id"),
		Search:   c.Query("search"),
	}
	list, err := h.useCase.GetAll(c.Context(), filter)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Berhasil mengambil data peminjaman"))
}

func (h *LoanHandler) GetSummaryStats(c *fiber.Ctx) error {
	stats, err := h.useCase.GetSummaryStats(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(stats, "Statistik peminjaman berhasil diambil"))
}

func (h *LoanHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	loan, err := h.useCase.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(loan, "Detail peminjaman berhasil diambil"))
}
