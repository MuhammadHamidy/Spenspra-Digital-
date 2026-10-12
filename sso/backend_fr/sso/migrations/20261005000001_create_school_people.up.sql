CREATE TABLE IF NOT EXISTS school_people (
    id VARCHAR(36) PRIMARY KEY,
    person_type VARCHAR(30) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    nisn VARCHAR(50),
    nip VARCHAR(50),
    email VARCHAR(150),
    phone VARCHAR(30),
    class_name VARCHAR(100),
    position VARCHAR(100),
    barcode_token VARCHAR(128) NOT NULL UNIQUE,
    barcode_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT school_people_type_check CHECK (person_type IN ('SISWA', 'GURU', 'KEPALA_SEKOLAH', 'TENAGA_KEPENDIDIKAN')),
    CONSTRAINT school_people_barcode_status_check CHECK (barcode_status IN ('ACTIVE', 'REVOKED', 'REPLACED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_school_people_nisn ON school_people(nisn) WHERE nisn IS NOT NULL AND nisn <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_school_people_nip ON school_people(nip) WHERE nip IS NOT NULL AND nip <> '';
CREATE INDEX IF NOT EXISTS idx_school_people_type ON school_people(person_type);
CREATE INDEX IF NOT EXISTS idx_school_people_active ON school_people(is_active, barcode_status);

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS person_id VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_accounts_person_id ON accounts(person_id);

INSERT INTO school_people (
    id, person_type, full_name, email, barcode_token, barcode_status, is_active
)
SELECT
    a.id,
    CASE
        WHEN UPPER(COALESCE(r.name, '')) = 'GURU' THEN 'GURU'
        WHEN UPPER(COALESCE(r.name, '')) = 'SISWA' THEN 'SISWA'
        ELSE 'TENAGA_KEPENDIDIKAN'
    END,
    a.full_name,
    NULLIF(a.email, ''),
    COALESCE(NULLIF(a.qr_code_token, ''), 'PRAMBON-' || md5(random()::text || clock_timestamp()::text)),
    'ACTIVE',
    TRUE
FROM accounts a
LEFT JOIN roles r ON r.id = a.role_id
WHERE NOT EXISTS (SELECT 1 FROM school_people p WHERE p.id = a.id);

UPDATE accounts a
SET person_id = a.id
WHERE person_id IS NULL
  AND EXISTS (SELECT 1 FROM school_people p WHERE p.id = a.id);
