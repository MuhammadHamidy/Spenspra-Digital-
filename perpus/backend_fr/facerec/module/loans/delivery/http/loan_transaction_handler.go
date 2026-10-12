package http

import (
	"net/http"

	"github.com/facerec/facerec-be/facerec/module/loans/domain"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

func (h *LoanHandler) Borrow(c *fiber.Ctx) error {
	var req domain.BorrowRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	loan, err := h.useCase.Borrow(c.Context(), req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(loan, "Peminjaman buku berhasil dicatat"))
}

func (h *LoanHandler) Return(c *fiber.Ctx) error {
	var req domain.ReturnRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	loan, err := h.useCase.Return(c.Context(), req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(loan, "Pengembalian buku berhasil diproses"))
}

func (h *LoanHandler) PayFine(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.useCase.PayFine(c.Context(), id); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(true, "Denda berhasil dilunasi"))
}
