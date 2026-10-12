package http

import (
	"net/http"

	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

func (h *BookHandler) GetAll(c *fiber.Ctx) error {
	search := c.Query("search")
	category := c.Query("category")
	list, err := h.useCase.GetAll(c.Context(), search, category)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Berhasil mengambil katalog buku"))
}

func (h *BookHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	book, err := h.useCase.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(book, "Berhasil mengambil detail buku"))
}

func (h *BookHandler) GetItemByBarcode(c *fiber.Ctx) error {
	barcode := c.Params("barcode")
	item, err := h.useCase.GetItemByBarcode(c.Context(), barcode)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(item, "Berhasil menemukan eksemplar buku"))
}
