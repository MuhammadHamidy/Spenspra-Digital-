package http

import (
	"net/http"

	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

func (h *FaceHandler) MatchFace(c *fiber.Ctx) error {
	var req struct {
		FaceVector     []float32 `json:"face_vector"`
		AllowedUserIds []string  `json:"allowed_user_ids"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	res, err := h.useCase.MatchFace(c.Context(), req.FaceVector, req.AllowedUserIds)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(res, "Pencocokan wajah selesai"))
}
