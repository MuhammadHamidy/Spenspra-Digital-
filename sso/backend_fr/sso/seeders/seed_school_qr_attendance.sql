-- Inisialisasi Role & Akun Super Administrator Pusat SSO.
-- Seeder ini AMAN dan TIDAK MENGHAPUS data riil yang sudah diinput pengguna.
-- Menggunakan ON CONFLICT DO NOTHING agar data riil tidak pernah tertimpa.

INSERT INTO roles (id, name, description) VALUES
('role-admin', 'ADMIN', 'Administrator sekolah'),
('role-super-admin', 'SUPER_ADMIN', 'Administrator seluruh aplikasi'),
('role-admin-rapor', 'ADMIN_RAPOR', 'Administrator aplikasi e-Rapor'),
('role-admin-perpus', 'ADMIN_PERPUS', 'Administrator aplikasi perpustakaan'),
('role-admin-absensi', 'ADMIN_ABSENSI', 'Administrator aplikasi presensi'),
('role-guru', 'GURU', 'Guru pengampu kelas'),
('role-wali-kelas', 'WALI_KELAS', 'Guru yang menjadi wali kelas'),
('role-siswa', 'SISWA', 'Siswa yang mengikuti kelas'),
('role-kepala-sekolah', 'KEPALA_SEKOLAH', 'Kepala Sekolah SMP Negeri 1 Prambon')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Akun super admin pusat SSO.
-- Username: superadmin.prambon
-- Password awal: SsoPrambon!2026#Admin
INSERT INTO accounts (
    id, username, password_hash, email, full_name, role_id, nim_nip, phone
) VALUES (
    'user-super-admin-1',
    'superadmin.prambon',
    '$2b$12$7xBwL4PzM9ebl7nhIAA5mu/4mkWqKmGp6mZrDhAZrotHa44qrsliu',
    'superadmin@smpn1prambon.sch.id',
    'Super Administrator SMP Negeri 1 Prambon',
    'role-super-admin',
    'SUPER-ADMIN-001',
    ''
)
ON CONFLICT (id) DO NOTHING;

-- Akun admin aplikasi eksternal (e-Rapor, Perpustakaan, Presensi)
INSERT INTO accounts (
    id, username, password_hash, email, full_name, role_id, nim_nip, phone
) VALUES
(
    'user-admin-rapor-1',
    'admin.rapor.prambon',
    '$2b$12$MhK3yx0Mnr4m4DjnlqL/reUSgpsOA0v4fk7Bbjm9Xz1aw3DiLQ6sC',
    'admin.rapor@smpn1prambon.sch.id',
    'Administrator e-Rapor SMP Negeri 1 Prambon',
    'role-admin-rapor',
    'ADMIN-RAPOR-001',
    ''
),
(
    'user-admin-perpus-1',
    'admin.perpus.prambon',
    '$2b$12$b7M6TM8JKthdO8bFRgt0p.s2feGtjTZSBB72RnFmX1nvvrfRvdEFG',
    'admin.perpus@smpn1prambon.sch.id',
    'Administrator Perpustakaan SMP Negeri 1 Prambon',
    'role-admin-perpus',
    'ADMIN-PERPUS-001',
    ''
),
(
    'user-admin-absensi-1',
    'admin.absensi.prambon',
    '$2b$12$wNDRG94rY9TExPGXw25.Veh11CAExB5bSOaUeVFK3pejHk.ck4a9S',
    'admin.absensi@smpn1prambon.sch.id',
    'Administrator Presensi SMP Negeri 1 Prambon',
    'role-admin-absensi',
    'ADMIN-ABSENSI-001',
    ''
),
(
    'user-admin-1',
    'admin',
    '$2a$10$LOQmzILymmWdzSSrUyQdZ.6Hc/xlqkDRzQ6DaiyuCYH1Y1qMidb8i',
    'admin@smpn1prambon.sch.id',
    'Administrator Sekolah',
    'role-admin',
    'ADMIN-001',
    ''
),
(
    'user-kepsek-1',
    'kepsek.prambon',
    '$2a$10$GetAXrF5zu8wwz7UFprSKuZY6tFG.gbzF4IDSQI213Z5PXLVglh/C',
    'kepsek@smpn1prambon.sch.id',
    'Kepala Sekolah SMP Negeri 1 Prambon',
    'role-kepala-sekolah',
    'KEPSEK-001',
    ''
)
ON CONFLICT (id) DO NOTHING;
