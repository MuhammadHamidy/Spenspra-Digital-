package http

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	qrcode "github.com/skip2/go-qrcode"
	"github.com/sso/sso-be/libraries/responses"
	"github.com/sso/sso-be/sso/module/school_people/domain"
)

type Handler struct{ people domain.UseCase }

func NewHandler(people domain.UseCase) *Handler { return &Handler{people: people} }

func (h *Handler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/master/people")
	api.Get("/", h.List)
	api.Get("/:id", h.Get)
	api.Post("/", h.Create)
	api.Put("/:id", h.Update)
	api.Delete("/:id", h.Delete)
	api.Post("/:id/revoke-barcode", h.Revoke)
	app.Post("/api/barcode/resolve", h.Resolve)
	app.Get("/api/master/people/:id/barcode", h.Barcode)
}

func (h *Handler) List(c *fiber.Ctx) error {
	result, err := h.people.FindAll(c.Context(), c.Query("person_type"))
	if err != nil {
		return c.Status(500).JSON(responses.Fail("SYSTEM_ERROR", err.Error()))
	}
	return c.JSON(responses.Success(result, "Data master berhasil dimuat"))
}

func (h *Handler) Get(c *fiber.Ctx) error {
	result, err := h.people.FindByID(c.Context(), c.Params("id"))
	if err != nil {
		return c.Status(500).JSON(responses.Fail("SYSTEM_ERROR", err.Error()))
	}
	if result == nil {
		return c.Status(404).JSON(responses.Fail("NOT_FOUND", "Data master tidak ditemukan"))
	}
	return c.JSON(responses.Success(result, "Data master berhasil dimuat"))
}

func (h *Handler) Create(c *fiber.Ctx) error {
	var req domain.CreatePersonRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	result, err := h.people.Create(c.Context(), req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("CREATE_FAILED", err.Error()))
	}
	return c.Status(http.StatusCreated).JSON(responses.Success(result, "Data master berhasil dibuat"))
}

func (h *Handler) Update(c *fiber.Ctx) error {
	var req domain.UpdatePersonRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	result, err := h.people.Update(c.Context(), c.Params("id"), req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("UPDATE_FAILED", err.Error()))
	}
	return c.JSON(responses.Success(result, "Data master berhasil diperbarui"))
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	if err := h.people.Delete(c.Context(), c.Params("id")); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("DELETE_FAILED", err.Error()))
	}
	return c.JSON(responses.Success(true, "Data master berhasil dihapus"))
}

func (h *Handler) Revoke(c *fiber.Ctx) error {
	if err := h.people.RevokeBarcode(c.Context(), c.Params("id")); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("REVOKE_FAILED", err.Error()))
	}
	return c.JSON(responses.Success(true, "Barcode berhasil dicabut"))
}

func (h *Handler) Resolve(c *fiber.Ctx) error {
	var req struct {
		BarcodeToken string `json:"barcode_token"`
		Token        string `json:"token"`
		Code         string `json:"code"`
		Value        string `json:"value"`
		QRCodeToken  string `json:"qr_code_token"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	token := firstNonEmpty(req.BarcodeToken, req.Token, req.QRCodeToken, req.Code, req.Value)
	token = normalizeBarcodePayload(token)
	result, err := h.people.ResolveBarcode(c.Context(), token)
	if err != nil {
		return c.Status(http.StatusUnauthorized).JSON(responses.Fail("INVALID_BARCODE", err.Error()))
	}
	return c.JSON(responses.Success(result, "Barcode valid"))
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

// normalizeBarcodePayload keeps the central SSO resolver compatible with QR
// payloads produced by future applications, while preserving raw tokens.
func normalizeBarcodePayload(raw string) string {
	value := strings.TrimSpace(raw)
	value = strings.Trim(value, "\"'")

	if strings.HasPrefix(value, "{") && strings.HasSuffix(value, "}") {
		var payload struct {
			BarcodeToken string `json:"barcode_token"`
			QRCodeToken  string `json:"qr_code_token"`
			Token        string `json:"token"`
			Code         string `json:"code"`
			Value        string `json:"value"`
		}
		if err := json.Unmarshal([]byte(value), &payload); err == nil {
			value = firstNonEmpty(payload.BarcodeToken, payload.QRCodeToken, payload.Token, payload.Code, payload.Value)
		}
	}

	if parsed, err := url.Parse(value); err == nil && parsed.Query() != nil {
		value = firstNonEmpty(
			parsed.Query().Get("barcode_token"),
			parsed.Query().Get("qr_code_token"),
			parsed.Query().Get("token"),
			parsed.Query().Get("code"),
			value,
		)
	}

	return strings.TrimSpace(value)
}

func (h *Handler) Barcode(c *fiber.Ctx) error {
	person, err := h.people.FindByID(c.Context(), c.Params("id"))
	if err != nil || person == nil || person.BarcodeStatus != "ACTIVE" || !person.IsActive {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("NOT_FOUND", "Barcode tidak tersedia"))
	}
	size, _ := strconv.Atoi(c.Query("size", "256"))
	if size < 64 || size > 2048 {
		size = 256
	}
	png, err := qrcode.Encode(person.BarcodeToken, qrcode.Medium, size)
	if err != nil {
		return c.Status(500).JSON(responses.Fail("QR_GEN_ERROR", err.Error()))
	}
	c.Set("Content-Type", "image/png")
	return c.Send(png)
}
