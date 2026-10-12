-- Allow classes to be created without requiring course or teacher (SSO PRD FR-S2)
ALTER TABLE classes ALTER COLUMN dosen_id DROP NOT NULL;
ALTER TABLE classes ALTER COLUMN course_id DROP NOT NULL;
