package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/facerec/facerec-be/facerec/module/beranda/domain"
	"github.com/google/uuid"
)

type useCase struct {
	repo domain.BerandaRepository
}

func NewUseCase(repo domain.BerandaRepository) domain.UseCase {
	return &useCase{repo: repo}
}

func (u *useCase) extractClaims(claims map[string]interface{}) domain.Pengguna {
	var p domain.Pengguna
	if sub, ok := claims["sub"].(string); ok && sub != "" {
		p.UserID = sub
	} else if id, ok := claims["id"].(string); ok {
		p.UserID = id
	}

	if name, ok := claims["name"].(string); ok && name != "" {
		p.Nama = name
	} else if fullName, ok := claims["full_name"].(string); ok {
		p.Nama = fullName
	}

	if role, ok := claims["role"].(string); ok && role != "" {
		p.Peran = role
	} else if roleName, ok := claims["role_name"].(string); ok {
		p.Peran = roleName
	} else {
		p.Peran = "ANGGOTA"
	}

	if nisn, ok := claims["nisn"].(string); ok && nisn != "" {
		p.NISNAtauNIP = nisn
	} else if nip, ok := claims["nip"].(string); ok && nip != "" {
		p.NISNAtauNIP = nip
	}

	if class, ok := claims["class"].(string); ok && class != "" {
		p.KelasAtauJabatan = class
	} else if dept, ok := claims["department"].(string); ok && dept != "" {
		p.KelasAtauJabatan = dept
	}

	if photo, ok := claims["photo"].(string); ok && photo != "" {
		p.FotoURL = photo
	} else if avatar, ok := claims["avatar"].(string); ok {
		p.FotoURL = avatar
	}

	return p
}

func (u *useCase) GetSession(ctx context.Context, claims map[string]interface{}) (*domain.SessionResponse, error) {
	if claims == nil {
		return nil, errors.New("sesi tidak valid atau token belum diverifikasi")
	}

	user := u.extractClaims(claims)
	if user.UserID == "" {
		return nil, errors.New("user ID tidak ditemukan dalam token")
	}

	// Upsert profil pengguna sebagai cache lokal dari SSO
	_ = u.repo.UpsertPengguna(ctx, &user)

	return &domain.SessionResponse{
		ID:              user.UserID,
		Nama:            user.Nama,
		Peran:           user.Peran,
		KelasAtauJabatan: user.KelasAtauJabatan,
		Foto:            user.FotoURL,
	}, nil
}

func (u *useCase) GetBeranda(ctx context.Context, userID string, claims map[string]interface{}) (*domain.BerandaResponse, error) {
	session, err := u.GetSession(ctx, claims)
	if err != nil {
		return nil, err
	}

	pinjamanAktif, err := u.repo.GetPinjamanAktifByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("gagal memuat pinjaman aktif: %w", err)
	}

	var tenggatBerikutnya *time.Time
	if len(pinjamanAktif) > 0 {
		t := pinjamanAktif[0].TenggatKembali
		tenggatBerikutnya = &t
	}

	aktivitasTerakhir, _ := u.repo.GetAktivitasBacaTerakhir(ctx, userID)

	return &domain.BerandaResponse{
		Pengguna:              *session,
		PinjamanAktif:         pinjamanAktif,
		TenggatBerikutnya:     tenggatBerikutnya,
		AktivitasBacaTerakhir: aktivitasTerakhir,
	}, nil
}

func (u *useCase) GetKatalogBuku(ctx context.Context, query string, limit, offset int) ([]domain.Buku, error) {
	return u.repo.GetBukuList(ctx, query, limit, offset)
}

func (u *useCase) GetInfo(ctx context.Context) (*domain.InfoPerpus, error) {
	return u.repo.GetInfoPerpus(ctx)
}

func (u *useCase) CatatKunjungan(ctx context.Context, userID *string, req *domain.KunjunganRequest) (*domain.Kunjungan, error) {
	if req == nil {
		return nil, errors.New("data kunjungan wajib diisi")
	}

	keperluanNorm := strings.ToUpper(strings.TrimSpace(req.Keperluan))
	if keperluanNorm == "" {
		return nil, errors.New("keperluan kunjungan wajib dipilih")
	}

	// Validasi berdasarkan jenis keperluan
	if keperluanNorm == "TAMU" {
		if req.NamaTamu == nil || strings.TrimSpace(*req.NamaTamu) == "" {
			return nil, errors.New("nama tamu wajib diisi")
		}
		if req.AsalTamu == nil || strings.TrimSpace(*req.AsalTamu) == "" {
			return nil, errors.New("asal instansi/sekolah tamu wajib diisi")
		}
	} else {
		if userID == nil || *userID == "" {
			return nil, errors.New("keperluan ini mewajibkan akun login SSO")
		}
	}

	k := &domain.Kunjungan{
		ID:        uuid.New().String(),
		UserID:    userID,
		Keperluan: keperluanNorm,
		NamaTamu:  req.NamaTamu,
		AsalTamu:  req.AsalTamu,
		Waktu:     time.Now(),
		Sumber:    "WEB_BERANDA",
	}

	if err := u.repo.CreateKunjungan(ctx, k); err != nil {
		return nil, fmt.Errorf("gagal mencatat kunjungan: %w", err)
	}

	return k, nil
}
