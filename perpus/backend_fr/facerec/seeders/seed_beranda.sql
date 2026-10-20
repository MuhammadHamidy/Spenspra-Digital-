-- Seeder: seed_beranda.sql
-- Inisialisasi Data Development Modul Beranda Perpustakaan SMPN 1 Prambon

-- 1. Informasi Layanan Perpustakaan
INSERT INTO info_perpus (id, jam_layanan, keterangan, updated_at) VALUES
('info-001', 
 'Senin - Kamis: 07.00 - 15.00 WIB | Jumat: 07.00 - 11.30 WIB | Sabtu & Minggu: Tutup', 
 'Perpustakaan SMPN 1 Prambon Sidoarjo merupakan ruang belajar yang menyediakan berbagai sumber pengetahuan untuk mendukung kegiatan belajar dan meningkatkan minat baca siswa. Kami hadir untuk membantu setiap siswa menemukan informasi, inspirasi, dan cerita baru melalui pengalaman membaca yang menyenangkan.',
 CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET 
    jam_layanan = EXCLUDED.jam_layanan,
    keterangan = EXCLUDED.keterangan;

-- 2. Sampel Akun Pengguna Terintegrasi SSO (Development)
INSERT INTO pengguna (user_id, nisn_atau_nip, nama, peran, kelas_atau_jabatan, foto_url, created_at, updated_at) VALUES
('usr-siswa-001', '0081234567', 'M. Mu''ammal Hamidy', 'SISWA', 'Kelas 9A', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('usr-guru-001', '198501012010011001', 'Dra. Siti Aminah, M.Pd', 'GURU', 'Guru Bahasa Indonesia', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (user_id) DO UPDATE SET
    nama = EXCLUDED.nama,
    peran = EXCLUDED.peran,
    kelas_atau_jabatan = EXCLUDED.kelas_atau_jabatan;

-- 3. Katalog Buku Bacaan (10 Buku Beranda Sesuai Desain Acuan)
INSERT INTO buku (id, judul, penulis, kategori, jenis, barcode, stok, cover_url, deskripsi, created_at) VALUES
('buku-001', 'Etika Politik', 'Franz Magnis-Suseno', 'Filsafat & Sosial', 'NON-FIKSI', 'LIB-BK-ETIK-01', 3, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400', 'Prinsip-prinsip moral dasar kenegaraan modern yang mengupas tuntas etika berdemokrasi.', CURRENT_TIMESTAMP),
('buku-002', 'Ilmu Pengetahuan Alam', 'Hamidy', 'Sains & Teknologi', 'NON-FIKSI', 'LIB-BK-IPA-02', 5, 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?w=400', 'Buku ajar dan eksplorasi sains terpadu untuk siswa sekolah menengah pertama.', CURRENT_TIMESTAMP),
('buku-003', 'Sejarah Dunia Yang Disembunyikan', 'Jonathan Black', 'Sejarah', 'NON-FIKSI', 'LIB-BK-SEJ-03', 0, 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400', 'Dalam kehidupan berbangsa dan bernegara selalu saja ditemukan tarik ulur antara kekuasaan, hukum, dan demokrasi.', CURRENT_TIMESTAMP),
('buku-004', 'Sejarah Peradaban Islam', 'Hamidy', 'Sejarah & Agama', 'NON-FIKSI', 'LIB-BK-SPI-04', 2, 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400', 'Menelusuri jejak emas ilmu pengetahuan, kebudayaan, dan kemanusiaan dalam peradaban Islam.', CURRENT_TIMESTAMP),
('buku-005', 'Sejarah Sumatra', 'Hamidy', 'Sejarah Nusantara', 'NON-FIKSI', 'LIB-BK-SUM-05', 0, 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400', 'Catatan historiografi lengkap mengenai perkembangan kerajaan dan peradaban di tanah Andalas.', CURRENT_TIMESTAMP),
('buku-006', 'Politik Identitas', 'Hamidy', 'Sosial Politik', 'NON-FIKSI', 'LIB-BK-POL-06', 4, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400', 'Analisis komprehensif dinamika sosial dan artikulasi politik di era pasca-reformasi.', CURRENT_TIMESTAMP),
('buku-007', 'Perspektif Pendidikan dalam Bingkai Ilmu dan Tokoh', 'Hamidy', 'Pendidikan', 'NON-FIKSI', 'LIB-BK-DIK-07', 2, 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400', 'Refleksi gagasan tokoh-tokoh besar pendidikan dalam memajukan kecerdasan literasi bangsa.', CURRENT_TIMESTAMP),
('buku-008', 'Sejarah Benua Kuno', 'Hamidy', 'Sejarah Dunia', 'NON-FIKSI', 'LIB-BK-BNU-08', 0, 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400', 'Eksplorasi arkeologi dan artefak peradaban tua di Asia, Afrika, dan Mediterania.', CURRENT_TIMESTAMP),
('buku-009', 'Kebijakan Politik Hukum Indonesia', 'Hamidy', 'Hukum & Tata Negara', 'NON-FIKSI', 'LIB-BK-HKM-09', 3, 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400', 'Telaah kritis arah perundang-undangan dan penegakan keadilan hukum nasional.', CURRENT_TIMESTAMP),
('buku-010', 'Filsafat Politik', 'Jonathan Floyd', 'Filsafat', 'NON-FIKSI', 'LIB-BK-FIL-10', 0, 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400', 'Panduan pengantar memahami pemikiran politik klasik dan kontemporer dari masa ke masa.', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    judul = EXCLUDED.judul,
    penulis = EXCLUDED.penulis,
    stok = EXCLUDED.stok;

-- 4. Sampel Peminjaman Aktif & Riwayat Baca Siswa
INSERT INTO peminjaman (id, user_id, buku_id, tanggal_pinjam, tenggat_kembali, tanggal_kembali, status, created_at) VALUES
('pmj-001', 'usr-siswa-001', 'buku-001', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '4 days', NULL, 'DIPINJAM', CURRENT_TIMESTAMP),
('pmj-002', 'usr-siswa-001', 'buku-002', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days', 'DIKEMBALIKAN', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 5. Sampel Kunjungan
INSERT INTO kunjungan (id, user_id, keperluan, nama_tamu, asal_tamu, waktu, sumber) VALUES
('knj-001', 'usr-siswa-001', 'MEMBACA', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '2 hours', 'WEB_BERANDA'),
('knj-002', NULL, 'TAMU', 'Bapak Suryanto, M.Pd', 'Dinas Pendidikan Kab. Sidoarjo', CURRENT_TIMESTAMP - INTERVAL '1 day', 'WEB_BERANDA')
ON CONFLICT (id) DO NOTHING;
