-- Roles Perpustakaan & Admin
INSERT INTO roles (id, name, description) VALUES
('role-admin', 'ADMIN', 'Administrator Sistem'),
('role-admin-perpus', 'ADMIN_PERPUS', 'Administrator Perpustakaan'),
('role-pustakawan', 'PUSTAKAWAN', 'Petugas Pengelola Perpustakaan')
ON CONFLICT (id) DO NOTHING;

-- Akun Administrator Perpustakaan
-- Catatan: Data siswa dan guru tidak lagi disimpan di akun lokal perpustakaan.
-- Identitas anggota perpustakaan terhubung ke master data terpusat SSO (school_people) via library_members.person_id.
INSERT INTO accounts (id, username, password_hash, email, full_name, role_id, nim_nip, phone, class_name) VALUES
('user-admin-1', 'admin', '$2a$10$COUmOBX6VoOiCgTHfPQ66OggF7jaIBaQrCP9GL1z1tB.DS0S807X6', 'admin@smpn1prambon.sch.id', 'Administrator SMPN 1 Prambon', 'role-admin', 'ADM-001', '081234567890', ''),
('user-admin-perpus-1', 'admin.perpus.prambon', '$2b$12$b7M6TM8JKthdO8bFRgt0p.s2feGtjTZSBB72RnFmX1nvvrfRvdEFG', 'admin.perpus@smpn1prambon.sch.id', 'Administrator Perpustakaan SMP Negeri 1 Prambon', 'role-admin', 'ADMIN-PERPUS-001', '081234567890', '')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;

