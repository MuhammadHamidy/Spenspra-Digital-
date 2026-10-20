-- Migration: 20261005000001_add_person_id_to_accounts.up.sql
-- Tujuan: Menambahkan kolom person_id ke tabel accounts di e-Rapor
-- agar dapat memetakan akun siswa dan guru dengan person_id terpusat dari SSO school_people.

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS person_id VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_accounts_person_id ON accounts(person_id);

-- Untuk data yang sudah ada, defaultkan person_id ke accounts.id
UPDATE accounts SET person_id = id WHERE person_id IS NULL;
