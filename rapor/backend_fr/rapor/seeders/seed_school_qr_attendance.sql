-- Seed data resmi ekosistem e-Rapor SMP Negeri 1 Prambon
-- Berisi role, akun guru & admin resmi, master mata pelajaran, kelas resmi, dan relasi guru

-- 1. Roles
INSERT INTO roles (id, name, description) VALUES
('role-admin', 'ADMIN', 'Administrator sekolah'),
('role-guru', 'GURU', 'Guru pengampu kelas'),
('role-siswa', 'SISWA', 'Siswa yang mengikuti kelas'),
('role-kepala-sekolah', 'KEPALA_SEKOLAH', 'Kepala Sekolah SMP Negeri 1 Prambon')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 2. Master Mata Pelajaran (Courses) - 12 Mapel Resmi
INSERT INTO courses (id, code, name, sks, description) VALUES
('crs-mtk', 'MAT', 'Matematika', 4, 'Mata Pelajaran Matematika SMP Kurikulum Merdeka'),
('crs-bin', 'BI', 'Bahasa Indonesia', 4, 'Mata Pelajaran Bahasa Indonesia'),
('crs-ipa', 'IPA', 'Ilmu Pengetahuan Alam', 4, 'Mata Pelajaran IPA Terpadu'),
('crs-ips', 'IPS', 'Ilmu Pengetahuan Sosial', 4, 'Mata Pelajaran IPS Terpadu'),
('crs-big', 'BIG', 'Bahasa Inggris', 3, 'Mata Pelajaran Bahasa Inggris'),
('crs-pp',  'PP',  'Pendidikan Pancasila', 3, 'Mata Pelajaran Pendidikan Pancasila'),
('crs-inf', 'INF', 'Informatika', 2, 'Mata Pelajaran Informatika & Berpikir Komputasional'),
('crs-pai', 'PAI', 'Pendidikan Agama Islam', 3, 'Mata Pelajaran PAI dan Budi Pekerti'),
('crs-pjok','PJOK','Pendidikan Jasmani', 3, 'Mata Pelajaran PJOK'),
('crs-sbd', 'SBP', 'Seni Budaya dan Prakarya', 2, 'Mata Pelajaran Seni Budaya dan Prakarya'),
('crs-bj',  'BJ',  'Bahasa Jawa', 2, 'Muatan Lokal Bahasa Jawa'),
('crs-btq', 'BTQ', 'Baca Tulis Al-Qur''an', 2, 'Muatan Lokal BTQ')
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    name = EXCLUDED.name;

-- 3. Akun Administrator Sistem e-Rapor
-- CATATAN ARSITEKTUR:
-- Data Guru & Siswa TIDAK LAGI dimuat via seeder statis!
-- Seluruh data guru & siswa ditarik secara otomatis & on-demand langsung dari Master Data SSO
-- melalui endpoint POST /api/school/sync-sso atau auto-sync saat halaman admin dibuka.
INSERT INTO accounts (
    id, username, password_hash, email, full_name, role_id, nim_nip, phone, class_name, is_active
) VALUES 
('user-admin-1', 'admin', '$2a$10$LOQmzILymmWdzSSrUyQdZ.6Hc/xlqkDRzQ6DaiyuCYH1Y1qMidb8i', 'admin@smpn1prambon.sch.id', 'Administrator Sekolah', 'role-admin', 'ADMIN-001', '', '', true),
('user-kepsek-1', 'kepsek.prambon', '$2a$10$GetAXrF5zu8wwz7UFprSKuZY6tFG.gbzF4IDSQI213Z5PXLVglh/C', 'kepsek@smpn1prambon.sch.id', 'Kepala Sekolah SMP Negeri 1 Prambon', 'role-kepala-sekolah', 'KEPSEK-001', '', '', true)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nim_nip = EXCLUDED.nim_nip,
    role_id = EXCLUDED.role_id,
    class_name = EXCLUDED.class_name;

-- 4. Data Kelas Resmi SMP Negeri 1 Prambon
INSERT INTO classes (
    id, course_id, class_code, dosen_id, academic_year, room, schedule_day, schedule_time
) VALUES
('class-7a', 'crs-big', '7A', NULL, '2025/2026', 'Ruang VII-A', 'Senin', '07:30 - 09:30'),
('class-7a-mat', 'crs-mtk', '7A', NULL, '2025/2026', 'Ruang VII-A', 'Rabu', '07:30 - 09:30'),
('class-7b', 'crs-bin', '7B', NULL, '2025/2026', 'Ruang VII-B', 'Selasa', '07:30 - 09:30'),
('class-8a', 'crs-ipa', '8A', NULL, '2025/2026', 'Ruang VIII-A', 'Rabu', '07:30 - 09:30'),
('class-8b', 'crs-inf', '8B', NULL, '2025/2026', 'Lab Komputer', 'Kamis', '07:30 - 09:30'),
('class-9a', 'crs-big', '9A', NULL, '2025/2026', 'Ruang IX-A', 'Jumat', '07:30 - 09:30'),
('class-9b', 'crs-pjok', '9B', NULL, '2025/2026', 'Lapangan', 'Sabtu', '07:00 - 09:00')
ON CONFLICT (id) DO UPDATE SET
    course_id = EXCLUDED.course_id;

