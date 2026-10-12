package http

import (
	"net/http"

	"github.com/facerec/facerec-be/facerec/module/books/domain"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

func (h *BookHandler) UpdateItemBarcode(c *fiber.Ctx) error {
	itemID := c.Params("itemId")
	var req struct {
		Barcode string `json:"barcode"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	item, err := h.useCase.UpdateItemBarcode(c.Context(), itemID, req.Barcode)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(item, "Nomor barcode berhasil diperbarui"))
}

func (h *BookHandler) BatchRenumberBarcodes(c *fiber.Ctx) error {
	var req domain.BatchRenumberRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	result, err := h.useCase.BatchRenumberBarcodes(c.Context(), req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(result, "Berhasil memperbarui penomoran barcode secara berurutan"))
}
