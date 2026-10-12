DROP INDEX IF EXISTS idx_accounts_person_id;
ALTER TABLE accounts DROP COLUMN IF EXISTS person_id;
DROP TABLE IF EXISTS school_people;
