package postgresql

import (
	"context"
	"strings"

	"github.com/facerec/facerec-be/facerec/module/beranda/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) domain.BerandaRepository {
	return &repository{db: db}
}

func (r *repository) UpsertPengguna(ctx context.Context, p *domain.Pengguna) error {
	query := `
		INSERT INTO pengguna (user_id, nisn_atau_nip, nama, peran, kelas_atau_jabatan, foto_url, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id) DO UPDATE SET
			nisn_atau_nip = EXCLUDED.nisn_atau_nip,
			nama = EXCLUDED.nama,
			peran = EXCLUDED.peran,
			kelas_atau_jabatan = EXCLUDED.kelas_atau_jabatan,
			foto_url = EXCLUDED.foto_url,
			updated_at = CURRENT_TIMESTAMP
	`
	_, err := r.db.Exec(ctx, query, p.UserID, p.NISNAtauNIP, p.Nama, p.Peran, p.KelasAtauJabatan, p.FotoURL)
	return err
}

func (r *repository) GetPenggunaByID(ctx context.Context, userID string) (*domain.Pengguna, error) {
	query := `
		SELECT user_id, nisn_atau_nip, nama, peran, kelas_atau_jabatan, foto_url, created_at, updated_at
		FROM pengguna WHERE user_id = $1
	`
	var p domain.Pengguna
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&p.UserID, &p.NISNAtauNIP, &p.Nama, &p.Peran, &p.KelasAtauJabatan, &p.FotoURL, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

func (r *repository) GetBukuList(ctx context.Context, query string, limit, offset int) ([]domain.Buku, error) {
	if limit <= 0 {
		limit = 10
	}
	baseQuery := `
		SELECT id, judul, penulis, kategori, jenis, barcode, stok, (stok > 0) AS tersedia, cover_url, deskripsi, created_at
		FROM buku
	`
	var args []interface{}
	qTrim := strings.TrimSpace(query)
	if qTrim != "" {
		baseQuery += ` WHERE judul ILIKE $1 OR penulis ILIKE $1 OR kategori ILIKE $1`
		args = append(args, "%"+qTrim+"%")
		baseQuery += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`
		args = append(args, limit, offset)
	} else {
		baseQuery += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`
		args = append(args, limit, offset)
	}

	rows, err := r.db.Query(ctx, baseQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.Buku
	for rows.Next() {
		var b domain.Buku
		if err := rows.Scan(
			&b.ID, &b.Judul, &b.Penulis, &b.Kategori, &b.Jenis, &b.Barcode, &b.Stok, &b.Tersedia, &b.CoverURL, &b.Deskripsi, &b.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, b)
	}
	return list, nil
}

func (r *repository) GetInfoPerpus(ctx context.Context) (*domain.InfoPerpus, error) {
	query := `SELECT id, jam_layanan, keterangan, updated_at FROM info_perpus ORDER BY updated_at DESC LIMIT 1`
	var info domain.InfoPerpus
	err := r.db.QueryRow(ctx, query).Scan(&info.ID, &info.JamLayanan, &info.Keterangan, &info.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return &domain.InfoPerpus{
				JamLayanan: "Senin - Jumat: 07.00 - 15.00 WIB",
				Keterangan: "Perpustakaan SMPN 1 Prambon Sidoarjo",
			}, nil
		}
		return nil, err
	}
	return &info, nil
}

func (r *repository) CreateKunjungan(ctx context.Context, k *domain.Kunjungan) error {
	query := `
		INSERT INTO kunjungan (id, user_id, keperluan, nama_tamu, asal_tamu, waktu, sumber)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.Exec(ctx, query, k.ID, k.UserID, k.Keperluan, k.NamaTamu, k.AsalTamu, k.Waktu, k.Sumber)
	return err
}

func (r *repository) GetPinjamanAktifByUser(ctx context.Context, userID string) ([]domain.PeminjamanRingkasan, error) {
	query := `
		SELECT p.id, p.buku_id, b.judul, b.penulis, b.cover_url, p.tanggal_pinjam, p.tenggat_kembali, p.tanggal_kembali, p.status
		FROM peminjaman p
		JOIN buku b ON p.buku_id = b.id
		WHERE p.user_id = $1 AND p.status IN ('DIPINJAM', 'TERLAMBAT')
		ORDER BY p.tenggat_kembali ASC
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.PeminjamanRingkasan
	for rows.Next() {
		var p domain.PeminjamanRingkasan
		if err := rows.Scan(
			&p.ID, &p.BukuID, &p.JudulBuku, &p.Penulis, &p.CoverURL, &p.TanggalPinjam, &p.TenggatKembali, &p.TanggalKembali, &p.Status,
		); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, nil
}

func (r *repository) GetAktivitasBacaTerakhir(ctx context.Context, userID string) (*domain.PeminjamanRingkasan, error) {
	query := `
		SELECT p.id, p.buku_id, b.judul, b.penulis, b.cover_url, p.tanggal_pinjam, p.tenggat_kembali, p.tanggal_kembali, p.status
		FROM peminjaman p
		JOIN buku b ON p.buku_id = b.id
		WHERE p.user_id = $1 AND p.status = 'DIKEMBALIKAN'
		ORDER BY p.tanggal_kembali DESC NULLS LAST, p.tanggal_pinjam DESC
		LIMIT 1
	`
	var p domain.PeminjamanRingkasan
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&p.ID, &p.BukuID, &p.JudulBuku, &p.Penulis, &p.CoverURL, &p.TanggalPinjam, &p.TenggatKembali, &p.TanggalKembali, &p.Status,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}
