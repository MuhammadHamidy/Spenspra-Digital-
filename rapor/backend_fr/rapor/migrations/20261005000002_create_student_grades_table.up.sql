-- ==============================================================================
-- Migration: 20261005000002_create_student_grades_table.up.sql
-- Description: Penyimpanan nilai siswa yang diinput guru (PTS/PAS/Harian).
--              Sumber data dashboard monitoring Kepala Sekolah.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS student_grades (
    id              VARCHAR(36) PRIMARY KEY,
    student_id      VARCHAR(64)  NOT NULL,
    person_id       VARCHAR(36),
    nisn            VARCHAR(32),
    student_name    VARCHAR(255) NOT NULL,
    class_name      VARCHAR(32)  NOT NULL,
    subject_code    VARCHAR(16)  NOT NULL,
    subject_name    VARCHAR(255) NOT NULL,
    assessment_type VARCHAR(16)  NOT NULL DEFAULT 'PTS', -- PTS, PAS, HARIAN
    academic_year   VARCHAR(16)  NOT NULL DEFAULT '2026/2027',
    semester        VARCHAR(8)   NOT NULL DEFAULT 'GANJIL', -- GANJIL, GENAP
    score           NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    predicate       VARCHAR(2)   NOT NULL,
    description     TEXT,
    teacher_id      VARCHAR(64),
    teacher_name    VARCHAR(255),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_grades_unique
    ON student_grades(student_id, subject_code, assessment_type, academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_student_grades_class   ON student_grades(class_name);
CREATE INDEX IF NOT EXISTS idx_student_grades_subject ON student_grades(subject_code);
CREATE INDEX IF NOT EXISTS idx_student_grades_teacher ON student_grades(teacher_id);
