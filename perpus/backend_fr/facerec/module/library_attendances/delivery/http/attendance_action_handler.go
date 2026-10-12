package http

import (
	"net/http"

	"github.com/facerec/facerec-be/facerec/module/library_attendances/domain"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

func (h *AttendanceHandler) RecognizeAndAttend(c *fiber.Ctx) error {
	var req domain.RecognizeVisitRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	res, err := h.useCase.RecognizeAndAttend(c.Context(), req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(res, res.Message))
}

func (h *AttendanceHandler) RecordManualVisit(c *fiber.Ctx) error {
	var req domain.ManualVisitRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	res, err := h.useCase.RecordManualVisit(c.Context(), req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(res, "Kunjungan manual berhasil dicatat"))
}
