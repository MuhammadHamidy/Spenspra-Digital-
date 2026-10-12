-- Migration: 20261006000001_remove_qr_code_token_from_accounts.up.sql
-- Tujuan: Hapus kolom identitas lokal qr_code_token dari tabel accounts.
--
-- Setelah school_people menjadi sumber kebenaran tunggal untuk barcode_token,
-- kolom qr_code_token di accounts tidak lagi diperlukan.
--
-- PRASYARAT sebelum menjalankan migrasi ini:
--   1. Seluruh data accounts sudah ter-link ke school_people via accounts.person_id
--   2. Sistem e-Rapor sudah dikonfigurasi dengan SSO_API_URL
--   3. Scan QR via SSO API sudah diverifikasi berfungsi (uji scan lintas sistem)
--
-- Setelah migrasi ini, tidak ada lagi fallback ke qr_code_token lokal.

-- Hapus index unik pada qr_code_token
DROP INDEX IF EXISTS idx_accounts_qr_token;

-- Hapus kolom qr_code_token
ALTER TABLE accounts DROP COLUMN IF EXISTS qr_code_token;
