-- Akun administrator untuk pengujian local Docker.
-- Jangan gunakan password ini pada staging atau production.

INSERT INTO roles (id, name, description) VALUES
('role-admin-rapor', 'ADMIN_RAPOR', 'Administrator aplikasi e-Rapor'),
('role-admin-perpus', 'ADMIN_PERPUS', 'Administrator aplikasi perpustakaan'),
('role-admin', 'ADMIN', 'Administrator aplikasi e-Learning')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

INSERT INTO accounts (
    id, username, password_hash, email, full_name, role_id, nim_nip, phone
) VALUES
(
    'local-admin-perpus',
    'admin.perpus.local',
    '$2b$10$/uBUUGopZT7p/dYcg1eOw.Sfc9l/RamLJH.iy0Tu223FlVhbFO6F2',
    'admin.perpus.local@smpn1prambon.sch.id',
    'Admin Perpustakaan Local',
    'role-admin-perpus',
    'LOCAL-ADMIN-PERPUS',
    ''
),
(
    'local-admin-elearning',
    'admin.elearning.local',
    '$2b$10$aBTNbsUAK7rYTMzng.kK5u/UemWKDQJlaJ3G/5FdLVJT8LoNxaz4W',
    'admin.elearning.local@smpn1prambon.sch.id',
    'Admin e-Learning Local',
    'role-admin',
    'LOCAL-ADMIN-ELEARNING',
    ''
),
(
    'local-admin-rapor',
    'admin.rapor.local',
    '$2b$10$V2cEVUtkMrP587ERacEmFOUm0EVZ29CFCPInRg2z80ceZHLoOZvTa',
    'admin.rapor.local@smpn1prambon.sch.id',
    'Admin e-Rapor Local',
    'role-admin-rapor',
    'LOCAL-ADMIN-RAPOR',
    ''
)
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    nim_nip = EXCLUDED.nim_nip;
