package domain

import (
	"time"
)

type Pengguna struct {
	UserID          string    `json:"user_id"`
	NISNAtauNIP     string    `json:"nisn_atau_nip"`
	Nama            string    `json:"nama"`
	Peran           string    `json:"peran"`
	KelasAtauJabatan string   `json:"kelas_atau_jabatan"`
	FotoURL         string    `json:"foto_url"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type Buku struct {
	ID        string    `json:"id"`
	Judul     string    `json:"judul"`
	Penulis   string    `json:"penulis"`
	Kategori  string    `json:"kategori"`
	Jenis     string    `json:"jenis"`
	Barcode   string    `json:"barcode"`
	Stok      int       `json:"stok"`
	Tersedia  bool      `json:"tersedia"`
	CoverURL  string    `json:"cover_url"`
	Deskripsi string    `json:"deskripsi"`
	CreatedAt time.Time `json:"created_at"`
}

type PeminjamanRingkasan struct {
	ID             string     `json:"id"`
	BukuID         string     `json:"buku_id"`
	JudulBuku      string     `json:"judul_buku"`
	Penulis        string     `json:"penulis"`
	CoverURL       string     `json:"cover_url"`
	TanggalPinjam  time.Time  `json:"tanggal_pinjam"`
	TenggatKembali time.Time  `json:"tenggat_kembali"`
	TanggalKembali *time.Time `json:"tanggal_kembali,omitempty"`
	Status         string     `json:"status"`
}

type Kunjungan struct {
	ID        string    `json:"id"`
	UserID    *string   `json:"user_id,omitempty"`
	Keperluan string    `json:"keperluan"`
	NamaTamu  *string   `json:"nama_tamu,omitempty"`
	AsalTamu  *string   `json:"asal_tamu,omitempty"`
	Waktu     time.Time `json:"waktu"`
	Sumber    string    `json:"sumber"`
}

type InfoPerpus struct {
	ID         string    `json:"id"`
	JamLayanan string    `json:"jam_layanan"`
	Keterangan string    `json:"keterangan"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type SessionResponse struct {
	ID              string `json:"id"`
	Nama            string `json:"nama"`
	Peran           string `json:"peran"`
	KelasAtauJabatan string `json:"kelas_atau_jabatan"`
	Foto            string `json:"foto"`
}

type BerandaResponse struct {
	Pengguna               SessionResponse        `json:"pengguna"`
	PinjamanAktif          []PeminjamanRingkasan `json:"pinjaman_aktif"`
	TenggatBerikutnya      *time.Time             `json:"tenggat_berikutnya,omitempty"`
	AktivitasBacaTerakhir *PeminjamanRingkasan   `json:"aktivitas_baca_terakhir,omitempty"`
}

type KunjunganRequest struct {
	Keperluan string  `json:"keperluan"`
	NamaTamu  *string `json:"nama_tamu,omitempty"`
	AsalTamu  *string `json:"asal_tamu,omitempty"`
}
