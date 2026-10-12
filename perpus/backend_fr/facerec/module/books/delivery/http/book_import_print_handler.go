package http

import (
	"net/http"

	"github.com/facerec/facerec-be/facerec/module/books/domain"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

func (h *BookHandler) ImportBatch(c *fiber.Ctx) error {
	var req domain.ImportBatchRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	result, err := h.useCase.ImportBatch(c.Context(), req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(result, "Import batch buku selesai diproses"))
}

func (h *BookHandler) GetLabelsForPrinting(c *fiber.Ctx) error {
	var req struct {
		Barcodes []string `json:"barcodes"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	labels, err := h.useCase.GetLabelsForPrinting(c.Context(), req.Barcodes)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(labels, "Data label barcode berhasil disiapkan"))
}
