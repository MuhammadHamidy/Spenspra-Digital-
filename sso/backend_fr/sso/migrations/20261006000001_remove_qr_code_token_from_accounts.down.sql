-- Migration: 20261006000001_remove_qr_code_token_from_accounts.down.sql
-- Rollback: Kembalikan kolom qr_code_token jika perlu downgrade.

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS qr_code_token VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_qr_token
ON accounts(qr_code_token)
WHERE qr_code_token IS NOT NULL;
