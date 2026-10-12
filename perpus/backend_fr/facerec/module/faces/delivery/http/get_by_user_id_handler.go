package http

import (
	"net/http"

	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

func (h *FaceHandler) GetByUserID(c *fiber.Ctx) error {
	userId := c.Params("userId")
	res, err := h.useCase.GetByUserID(c.Context(), userId)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(res, "Berhasil mengambil data wajah mahasiswa"))
}
