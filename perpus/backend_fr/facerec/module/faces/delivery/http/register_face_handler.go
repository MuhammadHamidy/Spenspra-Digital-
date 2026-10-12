package http

import (
	"net/http"

	"github.com/facerec/facerec-be/facerec/module/faces/domain"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

func (h *FaceHandler) RegisterFace(c *fiber.Ctx) error {
	var req domain.RegisterFaceRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	res, err := h.useCase.RegisterFace(c.Context(), req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	return c.Status(http.StatusCreated).JSON(responses.Success(res, "Data wajah mahasiswa berhasil terdaftar"))
}
