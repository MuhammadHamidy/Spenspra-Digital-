package http

import (
	"net/http"

	"github.com/facerec/facerec-be/facerec/module/books/domain"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

func (h *BookHandler) Create(c *fiber.Ctx) error {
	var req domain.CreateBookRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	book, err := h.useCase.Create(c.Context(), req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(book, "Buku berhasil ditambahkan ke katalog"))
}

func (h *BookHandler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	var req domain.CreateBookRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	book, err := h.useCase.Update(c.Context(), id, req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(book, "Buku berhasil diperbarui"))
}

func (h *BookHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.useCase.Delete(c.Context(), id); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(true, "Buku berhasil dihapus dari katalog"))
}

func (h *BookHandler) AddCopies(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		Count int `json:"count"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	items, err := h.useCase.AddCopies(c.Context(), id, req.Count)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(items, "Eksemplar baru berhasil ditambahkan"))
}
