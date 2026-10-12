-- Migration: 20261005000001_add_person_id_to_accounts.down.sql

DROP INDEX IF EXISTS idx_accounts_person_id;
ALTER TABLE accounts DROP COLUMN IF EXISTS person_id;
