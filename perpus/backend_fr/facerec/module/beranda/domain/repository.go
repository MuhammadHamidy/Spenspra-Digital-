package domain

import (
	"context"
)

type BerandaRepository interface {
	UpsertPengguna(ctx context.Context, p *Pengguna) error
	GetPenggunaByID(ctx context.Context, userID string) (*Pengguna, error)
	GetBukuList(ctx context.Context, query string, limit, offset int) ([]Buku, error)
	GetInfoPerpus(ctx context.Context) (*InfoPerpus, error)
	CreateKunjungan(ctx context.Context, k *Kunjungan) error
	GetPinjamanAktifByUser(ctx context.Context, userID string) ([]PeminjamanRingkasan, error)
	GetAktivitasBacaTerakhir(ctx context.Context, userID string) (*PeminjamanRingkasan, error)
}

type UseCase interface {
	GetSession(ctx context.Context, claims map[string]interface{}) (*SessionResponse, error)
	GetBeranda(ctx context.Context, userID string, claims map[string]interface{}) (*BerandaResponse, error)
	GetKatalogBuku(ctx context.Context, query string, limit, offset int) ([]Buku, error)
	GetInfo(ctx context.Context) (*InfoPerpus, error)
	CatatKunjungan(ctx context.Context, userID *string, req *KunjunganRequest) (*Kunjungan, error)
}
