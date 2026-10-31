-- ==============================================================================
-- Migration: 20261031000001_create_student_rapor_attendances_table.up.sql
-- Description: Tabel rekapitulasi kehadiran rapor siswa per kelas, tahun ajaran, dan semester
-- ==============================================================================

CREATE TABLE IF NOT EXISTS student_rapor_attendances (
    id            VARCHAR(64) PRIMARY KEY,
    class_name    VARCHAR(32)  NOT NULL,
    academic_year VARCHAR(16)  NOT NULL DEFAULT '2025/2026',
    semester      VARCHAR(16)  NOT NULL DEFAULT 'GENAP',
    student_id    VARCHAR(64)  NOT NULL,
    nisn          VARCHAR(32),
    student_name  VARCHAR(255),
    hadir         INT          NOT NULL DEFAULT 0,
    sakit         INT          NOT NULL DEFAULT 0,
    izin          INT          NOT NULL DEFAULT 0,
    alfa          INT          NOT NULL DEFAULT 0,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_rapor_attendances
    ON student_rapor_attendances(class_name, academic_year, semester, student_id);

CREATE INDEX IF NOT EXISTS idx_student_rapor_att_lookup
    ON student_rapor_attendances(class_name, academic_year, semester);

CREATE INDEX IF NOT EXISTS idx_student_rapor_att_nisn
    ON student_rapor_attendances(nisn);
