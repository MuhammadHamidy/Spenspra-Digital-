package http

import (
	"net/http"

	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

func (h *ResumeHandler) GetAll(c *fiber.Ctx) error {
	memberID := c.Query("member_id")
	bookID := c.Query("book_id")
	search := c.Query("search")
	list, err := h.useCase.GetAll(c.Context(), memberID, bookID, search)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(list, "Berhasil mengambil resume bacaan"))
}

func (h *ResumeHandler) GetInsights(c *fiber.Ctx) error {
	insights, err := h.useCase.GetInsights(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(insights, "Berhasil mengambil analitik kebiasaan membaca"))
}

func (h *ResumeHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	item, err := h.useCase.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(item, "Detail resume bacaan"))
}
