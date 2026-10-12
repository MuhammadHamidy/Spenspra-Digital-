-- Revert nullable
ALTER TABLE classes ALTER COLUMN dosen_id SET NOT NULL;
ALTER TABLE classes ALTER COLUMN course_id SET NOT NULL;
