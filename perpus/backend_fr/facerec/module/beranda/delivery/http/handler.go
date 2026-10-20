package http

import (
	"strconv"
	"strings"

	"github.com/facerec/facerec-be/facerec/module/beranda/domain"
	"github.com/facerec/facerec-be/libraries/middleware"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type BerandaHandler struct {
	useCase domain.UseCase
	auth    *middleware.AuthorizationMiddleware
}

func NewBerandaHandler(useCase domain.UseCase, auth *middleware.AuthorizationMiddleware) *BerandaHandler {
	return &BerandaHandler{useCase: useCase, auth: auth}
}

func (h *BerandaHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api")

	api.Get("/session", h.auth.Authenticate(), h.GetSession)
	api.Get("/beranda", h.auth.Authenticate(), h.GetBeranda)
	api.Get("/buku", h.GetBuku)
	api.Get("/info", h.GetInfo)
	api.Post("/kunjungan", h.CatatKunjungan)
}

func (h *BerandaHandler) GetSession(c *fiber.Ctx) error {
	claims, ok := c.Locals("claims").(jwt.MapClaims)
	if !ok || claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(responses.Fail("UNAUTHORIZED", "Sesi tidak valid"))
	}

	session, err := h.useCase.GetSession(c.Context(), claims)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(responses.Fail("UNAUTHORIZED", err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(responses.Success(session, "Berhasil memuat sesi pengguna"))
}

func (h *BerandaHandler) GetBeranda(c *fiber.Ctx) error {
	userID, ok := c.Locals(middleware.XUserIdKey).(string)
	claims, _ := c.Locals("claims").(jwt.MapClaims)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(responses.Fail("UNAUTHORIZED", "Wajib login untuk mengakses ringkasan beranda"))
	}

	resp, err := h.useCase.GetBeranda(c.Context(), userID, claims)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(responses.Fail("INTERNAL_ERROR", err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(responses.Success(resp, "Berhasil memuat data beranda"))
}

func (h *BerandaHandler) GetBuku(c *fiber.Ctx) error {
	q := c.Query("q", "")
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	list, err := h.useCase.GetKatalogBuku(c.Context(), q, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(responses.Fail("INTERNAL_ERROR", err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(responses.Success(list, "Berhasil mengambil katalog buku"))
}

func (h *BerandaHandler) GetInfo(c *fiber.Ctx) error {
	info, err := h.useCase.GetInfo(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(responses.Fail("INTERNAL_ERROR", err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(responses.Success(info, "Berhasil mengambil informasi perpustakaan"))
}

func (h *BerandaHandler) CatatKunjungan(c *fiber.Ctx) error {
	var req domain.KunjunganRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", "Format payload tidak valid"))
	}

	var userIDPtr *string
	keperluanUpper := strings.ToUpper(strings.TrimSpace(req.Keperluan))

	// Jika bukan tamu, periksa token login SSO
	token := strings.TrimSpace(c.Get("Authorization"))
	if strings.HasPrefix(strings.ToLower(token), "bearer ") {
		token = strings.TrimSpace(token[7:])
	}
	if token == "" {
		token = strings.TrimSpace(c.Cookies("access_token"))
	}
	if token == "" {
		token = strings.TrimSpace(c.Cookies("perpusdig_auth_token"))
	}

	if token != "" {
		// Parse token ringan tanpa verifikasi signature jika hanya untuk membaca user id,
		// atau gunakan usecase jika sudah terverifikasi.
		parts := strings.Split(token, ".")
		if len(parts) == 3 {
			// Extract sub
			parser := jwt.NewParser()
			if claims := make(jwt.MapClaims); parser != nil {
				if _, _, err := parser.ParseUnverified(token, claims); err == nil {
					if sub, ok := claims["sub"].(string); ok && sub != "" {
						userIDPtr = &sub
					}
				}
			}
		}
	}

	if keperluanUpper != "TAMU" && (userIDPtr == nil || *userIDPtr == "") {
		return c.Status(fiber.StatusUnauthorized).JSON(responses.Fail("UNAUTHORIZED", "Keperluan kunjungan ini memerlukan login akun SSO"))
	}

	kunjungan, err := h.useCase.CatatKunjungan(c.Context(), userIDPtr, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(responses.Fail("VALIDATION_ERROR", err.Error()))
	}

	return c.Status(fiber.StatusCreated).JSON(responses.Success(kunjungan, "Kunjungan berhasil dicatat"))
}
