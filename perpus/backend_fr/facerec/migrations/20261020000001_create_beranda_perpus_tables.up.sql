-- Migration: 20261020000001_create_beranda_perpus_tables.up.sql
-- Description: Skema database minimal untuk modul Beranda Perpustakaan SMPN 1 Prambon

-- 1. Tabel Cache Pengguna SSO (Upsert ringan dari klaim token)
CREATE TABLE IF NOT EXISTS pengguna (
    user_id VARCHAR(36) PRIMARY KEY,
    nisn_atau_nip VARCHAR(50),
    nama VARCHAR(150) NOT NULL,
    peran VARCHAR(50) NOT NULL,
    kelas_atau_jabatan VARCHAR(100),
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pengguna_nisn_nip ON pengguna(nisn_atau_nip);

-- 2. Tabel Katalog Buku Utama
CREATE TABLE IF NOT EXISTS buku (
    id VARCHAR(36) PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    penulis VARCHAR(150) NOT NULL,
    kategori VARCHAR(100) NOT NULL,
    jenis VARCHAR(50) NOT NULL DEFAULT 'NON-FIKSI',
    barcode VARCHAR(100) UNIQUE,
    stok INT NOT NULL DEFAULT 1,
    cover_url TEXT,
    deskripsi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_buku_barcode ON buku(barcode);
CREATE INDEX IF NOT EXISTS idx_buku_judul ON buku(judul);
CREATE INDEX IF NOT EXISTS idx_buku_kategori ON buku(kategori);

-- 3. Tabel Peminjaman Buku Siswa/Guru
CREATE TABLE IF NOT EXISTS peminjaman (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES pengguna(user_id) ON DELETE CASCADE,
    buku_id VARCHAR(36) NOT NULL REFERENCES buku(id) ON DELETE RESTRICT,
    tanggal_pinjam TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tenggat_kembali TIMESTAMP WITH TIME ZONE NOT NULL,
    tanggal_kembali TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) NOT NULL DEFAULT 'DIPINJAM',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_peminjaman_user_id ON peminjaman(user_id);
CREATE INDEX IF NOT EXISTS idx_peminjaman_buku_id ON peminjaman(buku_id);
CREATE INDEX IF NOT EXISTS idx_peminjaman_status ON peminjaman(status);

-- 4. Tabel Kunjungan / Presensi Masuk Perpustakaan
CREATE TABLE IF NOT EXISTS kunjungan (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES pengguna(user_id) ON DELETE SET NULL,
    keperluan VARCHAR(50) NOT NULL,
    nama_tamu VARCHAR(150),
    asal_tamu VARCHAR(150),
    waktu TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sumber VARCHAR(50) DEFAULT 'WEB_BERANDA'
);

CREATE INDEX IF NOT EXISTS idx_kunjungan_user_id ON kunjungan(user_id);
CREATE INDEX IF NOT EXISTS idx_kunjungan_keperluan ON kunjungan(keperluan);
CREATE INDEX IF NOT EXISTS idx_kunjungan_waktu ON kunjungan(waktu);

-- 5. Tabel Informasi dan Jam Layanan Perpustakaan
CREATE TABLE IF NOT EXISTS info_perpus (
    id VARCHAR(36) PRIMARY KEY,
    jam_layanan TEXT NOT NULL,
    keterangan TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
