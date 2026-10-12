package http

import (
	"net/http"

	"github.com/facerec/facerec-be/facerec/module/library_members/domain"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

func (h *MemberHandler) Create(c *fiber.Ctx) error {
	var req domain.CreateMemberRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	m, err := h.useCase.Create(c.Context(), req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(m, "Berhasil mendaftarkan anggota baru"))
}

func (h *MemberHandler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	var req domain.CreateMemberRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	m, err := h.useCase.Update(c.Context(), id, req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(m, "Berhasil memperbarui data anggota"))
}

func (h *MemberHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.useCase.Delete(c.Context(), id); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(true, "Berhasil menghapus data anggota"))
}
