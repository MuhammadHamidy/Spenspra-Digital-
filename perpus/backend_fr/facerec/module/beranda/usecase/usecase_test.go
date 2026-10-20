package usecase

import (
	"context"
	"testing"
	"time"

	"github.com/facerec/facerec-be/facerec/module/beranda/domain"
	"github.com/stretchr/testify/assert"
)

type mockRepo struct {
	upsertCalled   bool
	createdVisit   *domain.Kunjungan
	bukuList       []domain.Buku
	pinjamanList   []domain.PeminjamanRingkasan
	aktivitasBaca  *domain.PeminjamanRingkasan
	infoPerpus     *domain.InfoPerpus
}

func (m *mockRepo) UpsertPengguna(ctx context.Context, p *domain.Pengguna) error {
	m.upsertCalled = true
	return nil
}

func (m *mockRepo) GetPenggunaByID(ctx context.Context, userID string) (*domain.Pengguna, error) {
	return nil, nil
}

func (m *mockRepo) GetBukuList(ctx context.Context, query string, limit, offset int) ([]domain.Buku, error) {
	return m.bukuList, nil
}

func (m *mockRepo) GetInfoPerpus(ctx context.Context) (*domain.InfoPerpus, error) {
	return m.infoPerpus, nil
}

func (m *mockRepo) CreateKunjungan(ctx context.Context, k *domain.Kunjungan) error {
	m.createdVisit = k
	return nil
}

func (m *mockRepo) GetPinjamanAktifByUser(ctx context.Context, userID string) ([]domain.PeminjamanRingkasan, error) {
	return m.pinjamanList, nil
}

func (m *mockRepo) GetAktivitasBacaTerakhir(ctx context.Context, userID string) (*domain.PeminjamanRingkasan, error) {
	return m.aktivitasBaca, nil
}

func TestGetSession(t *testing.T) {
	repo := &mockRepo{}
	uc := NewUseCase(repo)

	claims := map[string]interface{}{
		"sub":       "usr-123",
		"name":      "Ahmad Siswa",
		"role":      "SISWA",
		"class":     "Kelas 8B",
		"nisn":      "0088991122",
		"photo":     "https://example.com/foto.jpg",
	}

	session, err := uc.GetSession(context.Background(), claims)
	assert.NoError(t, err)
	assert.NotNil(t, session)
	assert.Equal(t, "usr-123", session.ID)
	assert.Equal(t, "Ahmad Siswa", session.Nama)
	assert.Equal(t, "SISWA", session.Peran)
	assert.Equal(t, "Kelas 8B", session.KelasAtauJabatan)
	assert.True(t, repo.upsertCalled)
}

func TestGetBeranda(t *testing.T) {
	due := time.Now().Add(48 * time.Hour)
	repo := &mockRepo{
		pinjamanList: []domain.PeminjamanRingkasan{
			{
				ID:             "pmj-1",
				JudulBuku:      "Clean Code",
				TenggatKembali: due,
				Status:         "DIPINJAM",
			},
		},
		aktivitasBaca: &domain.PeminjamanRingkasan{
			ID:        "pmj-0",
			JudulBuku: "Laskar Pelangi",
			Status:    "DIKEMBALIKAN",
		},
	}
	uc := NewUseCase(repo)

	claims := map[string]interface{}{
		"sub":  "usr-123",
		"name": "Budi",
		"role": "SISWA",
	}

	beranda, err := uc.GetBeranda(context.Background(), "usr-123", claims)
	assert.NoError(t, err)
	assert.NotNil(t, beranda)
	assert.Len(t, beranda.PinjamanAktif, 1)
	assert.NotNil(t, beranda.TenggatBerikutnya)
	assert.NotNil(t, beranda.AktivitasBacaTerakhir)
	assert.Equal(t, "Laskar Pelangi", beranda.AktivitasBacaTerakhir.JudulBuku)
}

func TestCatatKunjunganTamu(t *testing.T) {
	repo := &mockRepo{}
	uc := NewUseCase(repo)

	nama := "Bapak Camat"
	asal := "Kecamatan Prambon"
	req := &domain.KunjunganRequest{
		Keperluan: "TAMU",
		NamaTamu:  &nama,
		AsalTamu:  &asal,
	}

	k, err := uc.CatatKunjungan(context.Background(), nil, req)
	assert.NoError(t, err)
	assert.NotNil(t, k)
	assert.Equal(t, "TAMU", k.Keperluan)
	assert.Nil(t, k.UserID)
	assert.Equal(t, "Bapak Camat", *k.NamaTamu)
}

func TestCatatKunjunganMemberTanpaLogin(t *testing.T) {
	repo := &mockRepo{}
	uc := NewUseCase(repo)

	req := &domain.KunjunganRequest{
		Keperluan: "MEMBACA",
	}

	_, err := uc.CatatKunjungan(context.Background(), nil, req)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "mewajibkan akun login SSO")
}
