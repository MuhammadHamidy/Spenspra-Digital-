INSERT INTO roles (id, name, description)
VALUES ('role-proktor', 'PROKTOR', 'Pengelola ujian UAS/ASAS dan monitoring CBT')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description;
