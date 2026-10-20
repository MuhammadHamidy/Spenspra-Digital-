package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/facerec/facerec-be/facerec/module/beranda/domain"
	"github.com/facerec/facerec-be/libraries/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

type mockUseCase struct {
	sessionFunc func() (*domain.SessionResponse, error)
	berandaFunc func() (*domain.BerandaResponse, error)
	bukuFunc    func() ([]domain.Buku, error)
	infoFunc    func() (*domain.InfoPerpus, error)
	kunjunganFn func() (*domain.Kunjungan, error)
}

func (m *mockUseCase) GetSession(ctx context.Context, claims map[string]interface{}) (*domain.SessionResponse, error) {
	if m.sessionFunc != nil {
		return m.sessionFunc()
	}
	return &domain.SessionResponse{ID: "usr-1", Nama: "Test User", Peran: "SISWA"}, nil
}

func (m *mockUseCase) GetBeranda(ctx context.Context, userID string, claims map[string]interface{}) (*domain.BerandaResponse, error) {
	if m.berandaFunc != nil {
		return m.berandaFunc()
	}
	return &domain.BerandaResponse{
		Pengguna: domain.SessionResponse{ID: userID, Nama: "Test User"},
	}, nil
}

func (m *mockUseCase) GetKatalogBuku(ctx context.Context, query string, limit, offset int) ([]domain.Buku, error) {
	if m.bukuFunc != nil {
		return m.bukuFunc()
	}
	return []domain.Buku{{ID: "b-1", Judul: "Buku 1", Penulis: "Penulis 1"}}, nil
}

func (m *mockUseCase) GetInfo(ctx context.Context) (*domain.InfoPerpus, error) {
	if m.infoFunc != nil {
		return m.infoFunc()
	}
	return &domain.InfoPerpus{JamLayanan: "07.00 - 15.00", Keterangan: "Info Test"}, nil
}

func (m *mockUseCase) CatatKunjungan(ctx context.Context, userID *string, req *domain.KunjunganRequest) (*domain.Kunjungan, error) {
	if m.kunjunganFn != nil {
		return m.kunjunganFn()
	}
	return &domain.Kunjungan{ID: "k-1", Keperluan: req.Keperluan, Waktu: time.Now()}, nil
}

func setupApp(uc domain.UseCase) *fiber.App {
	app := fiber.New()
	authMiddleware := middleware.NewAuthorizationMiddleware(nil, nil, nil)
	handler := NewBerandaHandler(uc, authMiddleware)
	handler.RegisterRoutes(app)
	return app
}

func TestGetBukuPublic(t *testing.T) {
	app := setupApp(&mockUseCase{})

	req := httptest.NewRequest(http.MethodGet, "/api/buku", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestGetInfoPublic(t *testing.T) {
	app := setupApp(&mockUseCase{})

	req := httptest.NewRequest(http.MethodGet, "/api/info", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestCatatKunjunganTamuSuccess(t *testing.T) {
	app := setupApp(&mockUseCase{})

	nama := "Tamu Uji"
	asal := "Sekolah Uji"
	payload := domain.KunjunganRequest{
		Keperluan: "TAMU",
		NamaTamu:  &nama,
		AsalTamu:  &asal,
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/api/kunjungan", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
}

func TestCatatKunjunganMemberTanpaLogin(t *testing.T) {
	app := setupApp(&mockUseCase{})

	payload := domain.KunjunganRequest{
		Keperluan: "MEMBACA",
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/api/kunjungan", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}
