package http

import (
	"net/http"
	"strings"
	"time"

	"github.com/sso/sso-be/sso/module/auth/domain"
	"github.com/sso/sso-be/libraries/responses"
	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	useCase domain.UseCase
}

func NewAuthHandler(useCase domain.UseCase) *AuthHandler {
	return &AuthHandler{useCase: useCase}
}

func (h *AuthHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api")

	auth := api.Group("/auth")
	auth.Post("/login", h.Login)
	auth.Post("/logout", h.Logout)
	auth.Get("/public-key", h.GetPublicKey)

	accounts := api.Group("/accounts")
	accounts.Get("/", h.GetAccountList)
	accounts.Post("/", h.CreateAccount)
	accounts.Put("/:id", h.UpdateAccount)
	accounts.Delete("/:id", h.DeleteAccount)
	accounts.Post("/:id/reset-password", h.ResetPassword)
	accounts.Post("/:id/send-access-email", h.SendAccessEmail)
	accounts.Put("/:id/profile", h.UpdateProfile)

	roles := api.Group("/roles")
	roles.Get("/", h.GetRoleList)

	api.Get("/academic-period", h.GetAcademicPeriod)
	api.Post("/academic-period", h.SetAcademicPeriod)

	api.Get("/metadata/enums", h.GetMetadataEnums)
}

func (h *AuthHandler) GetPublicKey(c *fiber.Ctx) error {
	pubKey, err := h.useCase.GetPublicKey(c.Context())
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(responses.Fail("KEY_NOT_FOUND", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{
		"algorithm":  "RS256",
		"public_key": pubKey,
		"issuer":     "sso.spenspra.sch.id",
	}, "Berhasil mengambil kunci publik SSO"))
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req domain.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	res, err := h.useCase.Login(c.Context(), req)
	if err != nil {
		return c.Status(http.StatusUnauthorized).JSON(responses.Fail("UNAUTHORIZED", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(res, "Login berhasil"))
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	token := strings.TrimSpace(c.Get("Authorization"))
	if strings.HasPrefix(strings.ToLower(token), "bearer ") {
		token = strings.TrimSpace(token[len("Bearer "):])
	}
	if token == "" {
		token = strings.TrimSpace(c.Cookies("perpusdig_auth_token"))
	}
	if token == "" {
		token = strings.TrimSpace(c.Cookies("access_token"))
	}

	_ = h.useCase.Logout(c.Context(), token)

	// Bersihkan cookies
	c.Cookie(&fiber.Cookie{
		Name:     "perpusdig_auth_token",
		Value:    "",
		Expires:  time.Now().Add(-24 * time.Hour),
		HTTPOnly: true,
		SameSite: "Lax",
		Path:     "/",
	})
	c.Cookie(&fiber.Cookie{
		Name:     "perpusdig_auth_user",
		Value:    "",
		Expires:  time.Now().Add(-24 * time.Hour),
		HTTPOnly: false,
		SameSite: "Lax",
		Path:     "/",
	})

	return c.Status(http.StatusOK).JSON(responses.Success(fiber.Map{}, "Berhasil keluar (logout)"))
}

func (h *AuthHandler) GetAccountList(c *fiber.Ctx) error {
	roleName := c.Query("role", "")
	res, err := h.useCase.GetAccountList(c.Context(), roleName)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SYSTEM_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(res, "Berhasil mengambil daftar akun"))
}

func (h *AuthHandler) CreateAccount(c *fiber.Ctx) error {
	var account domain.Account
	if err := c.BodyParser(&account); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	err := h.useCase.CreateAccount(c.Context(), &account)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	return c.Status(http.StatusCreated).JSON(responses.Success(account, "Akun berhasil dibuat"))
}

func (h *AuthHandler) UpdateAccount(c *fiber.Ctx) error {
	id := c.Params("id")
	var account domain.Account
	if err := c.BodyParser(&account); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	err := h.useCase.UpdateAccount(c.Context(), id, &account)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(account, "Akun berhasil diperbarui"))
}

func (h *AuthHandler) DeleteAccount(c *fiber.Ctx) error {
	id := c.Params("id")
	err := h.useCase.DeleteAccount(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SYSTEM_ERROR", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(map[string]any{}, "Akun berhasil dihapus"))
}

func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	id := c.Params("id")
	var req domain.ResetPasswordRequest
	_ = c.BodyParser(&req)

	res, err := h.useCase.ResetPassword(c.Context(), id, req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(res, "Password berhasil direset"))
}

func (h *AuthHandler) SendAccessEmail(c *fiber.Ctx) error {
	id := c.Params("id")
	var req domain.SendAccessEmailRequest
	_ = c.BodyParser(&req)

	err := h.useCase.SendAccessEmail(c.Context(), id, req.Password)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(map[string]any{"id": id}, "Email notifikasi akses guru berhasil dikirim"))
}

func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	id := c.Params("id")
	var req domain.UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	account, err := h.useCase.UpdateProfile(c.Context(), id, req)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}

	return c.Status(http.StatusOK).JSON(responses.Success(account, "Profil dan kredensial berhasil diperbarui"))
}

func (h *AuthHandler) GetRoleList(c *fiber.Ctx) error {

	res, err := h.useCase.GetRoleList(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SYSTEM_ERROR", err.Error()))
	}
	return c.Status(http.StatusOK).JSON(responses.Success(res, "Berhasil mengambil daftar role"))
}

type EnumChoice struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type MetadataEnumsResponse struct {
	UserRoles        []EnumChoice `json:"user_roles"`
	AttendanceStatus []EnumChoice `json:"attendance_status"`
	AttendanceMethod []EnumChoice `json:"attendance_method"`
	SessionStatus    []EnumChoice `json:"session_status"`
	DayOfWeek        []EnumChoice `json:"day_of_week"`
}

func (h *AuthHandler) GetMetadataEnums(c *fiber.Ctx) error {
	response := MetadataEnumsResponse{
		UserRoles: []EnumChoice{
			{Value: "ADMIN", Label: "Administrator"},
			{Value: "GURU", Label: "Guru Mata Pelajaran"},
		},
		AttendanceStatus: []EnumChoice{
			{Value: "HADIR", Label: "Hadir"},
			{Value: "TERLAMBAT", Label: "Terlambat"},
			{Value: "IZIN", Label: "Izin"},
			{Value: "SAKIT", Label: "Sakit"},
			{Value: "ALPA", Label: "Alpa / Tidak Masuk"},
		},
		AttendanceMethod: []EnumChoice{
			{Value: "FACE_RECOGNITION", Label: "Face Recognition"},
			{Value: "MANUAL", Label: "Manual Guru"},
			{Value: "QR_CODE", Label: "QR Code"},
		},
		SessionStatus: []EnumChoice{
			{Value: "UPCOMING", Label: "Belum Dimulai"},
			{Value: "OPEN", Label: "Sesi Aktif (Berlangsung)"},
			{Value: "CLOSED", Label: "Sesi Selesai"},
		},
		DayOfWeek: []EnumChoice{
			{Value: "Senin", Label: "Senin"},
			{Value: "Selasa", Label: "Selasa"},
			{Value: "Rabu", Label: "Rabu"},
			{Value: "Kamis", Label: "Kamis"},
			{Value: "Jumat", Label: "Jumat"},
			{Value: "Sabtu", Label: "Sabtu"},
			{Value: "Minggu", Label: "Minggu"},
		},
	}
	return c.Status(fiber.StatusOK).JSON(responses.Success(response, "Berhasil mengambil metadata enums"))
}

func (h *AuthHandler) GetAcademicPeriod(c *fiber.Ctx) error {
	period, err := h.useCase.GetAcademicPeriod(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(fiber.StatusOK).JSON(responses.Success(period, "Berhasil mengambil periode akademik aktif"))
}

func (h *AuthHandler) SetAcademicPeriod(c *fiber.Ctx) error {
	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(responses.Fail("BAD_REQUEST", err.Error()))
	}
	if err := h.useCase.SetAcademicPeriod(c.Context(), body); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(responses.Fail("SERVER_ERROR", err.Error()))
	}
	return c.Status(fiber.StatusOK).JSON(responses.Success(body, "Periode akademik aktif berhasil diperbarui"))
}
