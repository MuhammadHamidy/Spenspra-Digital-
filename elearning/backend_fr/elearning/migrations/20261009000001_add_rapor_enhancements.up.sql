-- ==============================================================================
-- Migration: 20261009000001_add_rapor_enhancements.up.sql
-- Description: Tabel penguncian nilai, log perubahan (audit trail), dan pengesahan rapor kepala sekolah.
-- ==============================================================================

-- 1. Tabel Kunci Nilai (Grade Locks)
CREATE TABLE IF NOT EXISTS grade_locks (
    id              VARCHAR(64) PRIMARY KEY,
    class_name      VARCHAR(32)  NOT NULL,
    subject_code    VARCHAR(16)  NOT NULL, -- 'ALL' jika seluruh mapel terkunci
    assessment_type VARCHAR(16)  NOT NULL DEFAULT 'PTS',
    academic_year   VARCHAR(16)  NOT NULL DEFAULT '2025/2026',
    semester        VARCHAR(16)  NOT NULL DEFAULT 'GENAP',
    is_locked       BOOLEAN      NOT NULL DEFAULT TRUE,
    locked_by_id    VARCHAR(64),
    locked_by_name  VARCHAR(255),
    locked_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_grade_locks
    ON grade_locks(class_name, subject_code, assessment_type, academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_grade_locks_lookup
    ON grade_locks(class_name, academic_year, semester);

-- 2. Tabel Audit Log Perubahan Nilai (Grade Change Logs)
CREATE TABLE IF NOT EXISTS grade_change_logs (
    id              VARCHAR(64) PRIMARY KEY,
    student_id      VARCHAR(64)  NOT NULL,
    student_name    VARCHAR(255) NOT NULL,
    class_name      VARCHAR(32)  NOT NULL,
    subject_code    VARCHAR(16)  NOT NULL,
    subject_name    VARCHAR(255),
    assessment_type VARCHAR(16)  NOT NULL DEFAULT 'PTS',
    academic_year   VARCHAR(16)  NOT NULL DEFAULT '2025/2026',
    semester        VARCHAR(16)  NOT NULL DEFAULT 'GENAP',
    old_score       NUMERIC(5,2),
    new_score       NUMERIC(5,2),
    old_description TEXT,
    new_description TEXT,
    changed_by_id   VARCHAR(64),
    changed_by_name VARCHAR(255),
    reason          TEXT NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grade_change_logs_student
    ON grade_change_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_change_logs_class_subject
    ON grade_change_logs(class_name, subject_code);
CREATE INDEX IF NOT EXISTS idx_grade_change_logs_created
    ON grade_change_logs(created_at DESC);

-- 3. Tabel Pengesahan Rapor Kepala Sekolah (Report Endorsements)
CREATE TABLE IF NOT EXISTS report_endorsements (
    id              VARCHAR(64) PRIMARY KEY,
    class_name      VARCHAR(32)  NOT NULL,
    academic_year   VARCHAR(16)  NOT NULL DEFAULT '2025/2026',
    semester        VARCHAR(16)  NOT NULL DEFAULT 'GENAP',
    assessment_type VARCHAR(16)  NOT NULL DEFAULT 'PTS',
    principal_id    VARCHAR(64),
    principal_name  VARCHAR(255) NOT NULL,
    principal_nip   VARCHAR(64)  NOT NULL,
    signature_type  VARCHAR(16)  NOT NULL DEFAULT 'CANVAS', -- 'CANVAS' | 'UPLOAD'
    signature_data  TEXT         NOT NULL, -- data URL base64
    status          VARCHAR(16)  NOT NULL DEFAULT 'APPROVED', -- 'APPROVED' | 'DRAFT'
    notes           TEXT,
    signed_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_report_endorsements
    ON report_endorsements(class_name, academic_year, semester, assessment_type);
