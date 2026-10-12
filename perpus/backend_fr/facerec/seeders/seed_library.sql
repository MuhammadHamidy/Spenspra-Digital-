-- Seeder: seed_library.sql
-- Inisialisasi Data Awal Perpustakaan Digital Cerdas SMP Negeri 1 Prambon
-- Semua data anggota diselaraskan secara langsung dengan Master Data SSO (school_people)

-- 1. Inisialisasi Role Perpustakaan jika belum ada
INSERT INTO roles (id, name, description) VALUES
('role-pustakawan', 'PUSTAKAWAN', 'Petugas Pengelola Perpustakaan'),
('role-anggota', 'ANGGOTA', 'Anggota Perpustakaan')
ON CONFLICT (name) DO NOTHING;

-- 2. Anggota Perpustakaan (Library Members)
-- CATATAN ARSITEKTUR:
-- Tidak lagi menggunakan seeder statis/hardcoded untuk data anggota.
-- Data seluruh anggota (guru & siswa) disinkronkan secara otomatis & on-demand langsung dari Master Data SSO
-- melalui endpoint POST /api/members/sync-sso atau saat inisialisasi aplikasi.


-- 3. Inisialisasi Katalog Buku
INSERT INTO books (id, isbn, title, author, publisher, publish_year, category, call_number, description, cover_url, total_copies, available_copies) VALUES
('bk-001', '978-602-06-3317-6', 'Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', 'Prentice Hall', 2008, 'Teknologi', '005.1 MAR c', 'Buku panduan praktis untuk menulis kode perangkat lunak yang bersih, mudah dipelihara, dan elegan.', 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?w=400', 3, 2),
('bk-002', '978-979-3062-79-2', 'Laskar Pelangi', 'Andrea Hirata', 'Bentang Pustaka', 2005, 'Sastra & Fiksi', '813 HIR l', 'Kisah inspiratif tentang perjuangan sepuluh anak di Belitung dalam menuntut ilmu di tengah keterbatasan.', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400', 4, 3),
('bk-003', '978-0-13-468599-1', 'Effective Java (3rd Edition)', 'Joshua Bloch', 'Addison-Wesley', 2018, 'Teknologi', '005.13 BLO e', 'Panduan mendalam arsitektur dan best practices pemrograman berorientasi objek modern.', 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400', 2, 1),
('bk-004', '978-602-424-694-5', 'Filosofi Teras', 'Henry Manampiring', 'Kompas', 2019, 'Filsafat & Pengembangan Diri', '158 MAN f', 'Penerapan praktis filsafat Stoa kuno untuk mengatasi kekhawatiran dan membangun mental tangguh.', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400', 5, 4),
('bk-005', '978-0-06-231609-7', 'Sapiens: A Brief History of Humankind', 'Yuval Noah Harari', 'Harper', 2014, 'Sejarah & Sains', '909 HAR s', 'Eksplorasi memukau tentang perjalanan evolusi manusia dari zaman batu hingga era teknologi modern.', 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400', 3, 3)
ON CONFLICT (id) DO NOTHING;

-- 4. Inisialisasi Eksemplar Buku Fisik (Book Items dengan Barcode Unik)
INSERT INTO book_items (id, book_id, barcode, copy_number, status, item_condition) VALUES
('item-001', 'bk-001', 'LIB-BK-2026-0001-C01', 1, 'AVAILABLE', 'GOOD'),
('item-002', 'bk-001', 'LIB-BK-2026-0001-C02', 2, 'BORROWED', 'GOOD'),
('item-003', 'bk-001', 'LIB-BK-2026-0001-C03', 3, 'AVAILABLE', 'GOOD'),

('item-004', 'bk-002', 'LIB-BK-2026-0002-C01', 1, 'AVAILABLE', 'GOOD'),
('item-005', 'bk-002', 'LIB-BK-2026-0002-C02', 2, 'AVAILABLE', 'GOOD'),
('item-006', 'bk-002', 'LIB-BK-2026-0002-C03', 3, 'BORROWED', 'GOOD'),
('item-007', 'bk-002', 'LIB-BK-2026-0002-C04', 4, 'AVAILABLE', 'FAIR'),

('item-008', 'bk-003', 'LIB-BK-2026-0003-C01', 1, 'AVAILABLE', 'GOOD'),
('item-009', 'bk-003', 'LIB-BK-2026-0003-C02', 2, 'BORROWED', 'GOOD'),

('item-010', 'bk-004', 'LIB-BK-2026-0004-C01', 1, 'AVAILABLE', 'GOOD'),
('item-011', 'bk-004', 'LIB-BK-2026-0004-C02', 2, 'AVAILABLE', 'GOOD'),
('item-012', 'bk-004', 'LIB-BK-2026-0004-C03', 3, 'BORROWED', 'GOOD'),
('item-013', 'bk-004', 'LIB-BK-2026-0004-C04', 4, 'AVAILABLE', 'GOOD'),
('item-014', 'bk-004', 'LIB-BK-2026-0004-C05', 5, 'AVAILABLE', 'GOOD'),

('item-015', 'bk-005', 'LIB-BK-2026-0005-C01', 1, 'AVAILABLE', 'GOOD'),
('item-016', 'bk-005', 'LIB-BK-2026-0005-C02', 2, 'AVAILABLE', 'GOOD'),
('item-017', 'bk-005', 'LIB-BK-2026-0005-C03', 3, 'AVAILABLE', 'GOOD')
ON CONFLICT (barcode) DO NOTHING;

-- 5. Inisialisasi Transaksi Peminjaman (Menggunakan ID Anggota Real dari SSO)
INSERT INTO loans (id, loan_code, member_id, book_item_id, borrow_date, due_date, return_date, status, fine_per_day, days_overdue, fine_amount, is_fine_paid, notes) VALUES
-- Pinjaman 1: Sedang dipinjam aktif
('loan-001', 'PJ-20260910-001', 'mbr-d6e721da', 'item-002', CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP + INTERVAL '3 days', NULL, 'BORROWED', 1000.00, 0, 0.00, FALSE, 'Peminjaman buku pengajar'),

-- Pinjaman 2: Sudah dikembalikan tepat waktu
('loan-002', 'PJ-20260901-002', 'mbr-900e306c', 'item-004', CURRENT_TIMESTAMP - INTERVAL '13 days', CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '7 days', 'RETURNED', 1000.00, 0, 0.00, TRUE, 'Dikembalikan dalam kondisi baik'),

-- Pinjaman 3: Terlambat 3 hari (Overdue)
('loan-003', 'PJ-20260901-003', 'mbr-67a1a700', 'item-006', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '3 days', NULL, 'OVERDUE', 1000.00, 3, 3000.00, FALSE, 'Belum dikembalikan, peringatan telah dikirimkan'),

-- Pinjaman 4: Terlambat 5 hari (Overdue)
('loan-004', 'PJ-20260828-004', 'mbr-132407c8', 'item-009', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '5 days', NULL, 'OVERDUE', 1000.00, 5, 5000.00, FALSE, 'Denda berjalan')
ON CONFLICT (loan_code) DO NOTHING;

-- 6. Inisialisasi Riwayat Absensi Kunjungan
INSERT INTO library_attendances (id, member_id, visitor_name, visitor_type, method, purpose, confidence_score, photo_url, visited_at) VALUES
('att-001', 'mbr-d6e721da', 'M.Mu''ammal Hamidy', 'MEMBER', 'BARCODE_SCAN', 'MEMBACA', 1.0, NULL, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('att-002', 'mbr-900e306c', 'ADLINA PUTRI RACHMADYAH', 'MEMBER', 'BARCODE_SCAN', 'PINJAM_KEMBALI', 1.0, NULL, CURRENT_TIMESTAMP - INTERVAL '4 hours'),
('att-003', 'mbr-67a1a700', 'AFIFA NANDA RAFANDA', 'MEMBER', 'BARCODE_SCAN', 'STUDI', 1.0, NULL, CURRENT_TIMESTAMP - INTERVAL '5 hours'),
('att-004', NULL, 'Tamu Dinas Pendidikan', 'GUEST', 'MANUAL', 'KUNJUNGAN', 0.0, NULL, CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- 7. Inisialisasi Resume Bacaan & Insight Literasi
INSERT INTO reading_resumes (id, member_id, book_id, loan_id, title, summary, key_insights, favorite_quotes, rating, status, submitted_at) VALUES
('res-001', 'mbr-900e306c', 'bk-002', 'loan-002', 'Refleksi Perjuangan & Keberanian Bermimpi dalam Laskar Pelangi', 'Novel ini mengisahkan tentang semangat belajar anak-anak desa Belitung di bawah bimbingan Bu Muslimah dan Pak Harfan. Dengan segala keterbatasan sarana sekolah, kecintaan mereka terhadap sains, seni, dan sastra tetap membara.', '1. Keterbatasan materi bukan alasan untuk membatasi impian.\n2. Figur pendidik yang tulus memberi dampak seumur hidup bagi anak didiknya.\n3. Nilai persahabatan sejati menguatkan saat menghadapi cobaan hidup.', '"Bermimpilah, karena Tuhan akan memeluk mimpi-mimpi itu."', 5, 'PUBLISHED', CURRENT_TIMESTAMP - INTERVAL '6 days'),

('res-002', 'mbr-d6e721da', 'bk-001', 'loan-001', 'Penerapan Prinsip Clean Code pada Pengembangan Perangkat Lunak', 'Buku ini mengajarkan bahwa kode tidak hanya harus bekerja, tetapi harus dapat dipahami manusia. Robert Martin memaparkan aturan penamaan variabel yang deskriptif, fungsi kecil dengan satu tanggung jawab (Single Responsibility), serta penghindaran duplikasi kode.', '1. Membaca kode 10x lebih sering daripada menulisnya; maka kejelasan adalah kunci utama.\n2. Fungsi yang baik adalah fungsi yang pendek dan hanya melakukan satu hal dengan sangat baik.\n3. Pengujian unit (TDD) adalah jaring pengaman agar arsitektur tetap fleksibel.', '"Any fool can write code that a computer can understand. Good programmers write code that humans can understand."', 5, 'PUBLISHED', CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;
