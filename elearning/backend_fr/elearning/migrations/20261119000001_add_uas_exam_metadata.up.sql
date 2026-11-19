ALTER TABLE cbt_exams
    ADD COLUMN IF NOT EXISTS exam_category VARCHAR(32) NOT NULL DEFAULT 'REGULAR',
    ADD COLUMN IF NOT EXISTS target_grade_level VARCHAR(8),
    ADD COLUMN IF NOT EXISTS supervisor_pin VARCHAR(32),
    ADD COLUMN IF NOT EXISTS is_coordinator_exam BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_cbt_exams_category
    ON cbt_exams(exam_category, target_grade_level);
