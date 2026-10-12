package http

import (
	"net/http"

	"github.com/facerec/facerec-be/facerec/module/reading_resumes/domain"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

func (h *ResumeHandler) Create(c *fiber.Ctx) error {
	var req domain.CreateResumeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	item, err := h.useCase.Create(c.Context(), req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(item, "Resume bacaan berhasil disimpan"))
}

func (h *ResumeHandler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	var req domain.CreateResumeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	item, err := h.useCase.Update(c.Context(), id, req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(item, "Resume bacaan berhasil diperbarui"))
}

func (h *ResumeHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.useCase.Delete(c.Context(), id); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(true, "Resume bacaan berhasil dihapus"))
}
