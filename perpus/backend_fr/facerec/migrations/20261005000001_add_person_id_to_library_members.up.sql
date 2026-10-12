ALTER TABLE library_members ADD COLUMN IF NOT EXISTS person_id VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_library_members_person_id ON library_members(person_id);
