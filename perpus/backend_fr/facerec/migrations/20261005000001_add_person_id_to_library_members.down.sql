DROP INDEX IF EXISTS idx_library_members_person_id;
ALTER TABLE library_members DROP COLUMN IF EXISTS person_id;
