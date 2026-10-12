package http

import (
	"net/http"

	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

func (h *MemberHandler) GetAll(c *fiber.Ctx) error {
	search := c.Query("search")
	list, err := h.useCase.GetAll(c.Context(), search)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Berhasil mengambil data anggota perpustakaan"))
}

func (h *MemberHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	m, err := h.useCase.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(m, "Berhasil mengambil detail anggota"))
}

func (h *MemberHandler) GetByCode(c *fiber.Ctx) error {
	code := c.Params("code")
	m, err := h.useCase.GetByCode(c.Context(), code)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(m, "Berhasil mengambil detail anggota berdasarkan kode barcode"))
}

func (h *MemberHandler) SyncFromSSO(c *fiber.Ctx) error {
	count, err := h.useCase.SyncFromSSO(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SYNC_FAILED", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(map[string]interface{}{
		"synced_count": count,
	}, "Berhasil menyinkronkan data anggota dari Master SSO"))
}

