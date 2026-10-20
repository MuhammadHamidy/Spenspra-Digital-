-- 20261021000001_create_elearning_schema.up.sql
-- Inisialisasi Skema e-Learning (Materi, Tugas) & CBT e-Ujian Anti-Curang (Proctoring)
-- SMP Negeri 1 Prambon (Spenspra Digital)

-- 1. Tabel Materi Pembelajaran
CREATE TABLE IF NOT EXISTS learning_materials (
    id VARCHAR(36) PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    class_code VARCHAR(30) NOT NULL,
    teacher_id VARCHAR(36) NOT NULL,
    teacher_name VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_materials_class ON learning_materials(class_code);
CREATE INDEX IF NOT EXISTS idx_materials_teacher ON learning_materials(teacher_id);
CREATE INDEX IF NOT EXISTS idx_materials_course ON learning_materials(course_id);

-- 2. Tabel Penugasan Siswa
CREATE TABLE IF NOT EXISTS learning_assignments (
    id VARCHAR(36) PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    class_code VARCHAR(30) NOT NULL,
    teacher_id VARCHAR(36) NOT NULL,
    teacher_name VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    instructions TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    max_score INT DEFAULT 100,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assignments_class ON learning_assignments(class_code);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON learning_assignments(teacher_id);

-- 3. Tabel Pengumpulan Tugas (Submissions)
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id VARCHAR(36) PRIMARY KEY,
    assignment_id VARCHAR(36) NOT NULL REFERENCES learning_assignments(id) ON DELETE CASCADE,
    student_id VARCHAR(36) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    student_nisn VARCHAR(30),
    class_code VARCHAR(30) NOT NULL,
    submission_text TEXT,
    file_url TEXT,
    file_name VARCHAR(255),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'SUBMITTED',
    score NUMERIC(5,2),
    teacher_feedback TEXT,
    graded_at TIMESTAMP WITH TIME ZONE,
    graded_by VARCHAR(36),
    CONSTRAINT unique_assignment_student UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON assignment_submissions(student_id);

-- 4. Tabel Sesi Ujian CBT
CREATE TABLE IF NOT EXISTS cbt_exams (
    id VARCHAR(36) PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    class_code VARCHAR(30) NOT NULL,
    teacher_id VARCHAR(36) NOT NULL,
    teacher_name VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    token VARCHAR(10) NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 60,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    max_violations INT DEFAULT 3,
    randomize_questions BOOLEAN DEFAULT TRUE,
    randomize_options BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cbt_exams_class ON cbt_exams(class_code);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_teacher ON cbt_exams(teacher_id);

-- 5. Tabel Butir Soal Ujian
CREATE TABLE IF NOT EXISTS cbt_questions (
    id VARCHAR(36) PRIMARY KEY,
    exam_id VARCHAR(36) NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
    question_number INT DEFAULT 1,
    question_type VARCHAR(20) DEFAULT 'PILIHAN_GANDA',
    question_text TEXT NOT NULL,
    image_url TEXT,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    option_e TEXT,
    correct_answer VARCHAR(10) NOT NULL,
    score_weight NUMERIC(5,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cbt_questions_exam ON cbt_questions(exam_id);

-- 6. Tabel Sesi Pengerjaan Siswa
CREATE TABLE IF NOT EXISTS cbt_student_sessions (
    id VARCHAR(36) PRIMARY KEY,
    exam_id VARCHAR(36) NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
    student_id VARCHAR(36) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    student_nisn VARCHAR(30),
    class_code VARCHAR(30) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'IN_PROGRESS',
    violation_count INT DEFAULT 0,
    score NUMERIC(5,2) DEFAULT 0,
    device_info TEXT,
    ip_address VARCHAR(45),
    CONSTRAINT unique_exam_student_session UNIQUE (exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_cbt_sessions_exam ON cbt_student_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_cbt_sessions_student ON cbt_student_sessions(student_id);

-- 7. Tabel Jawaban Siswa per Butir Soal
CREATE TABLE IF NOT EXISTS cbt_student_answers (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES cbt_student_sessions(id) ON DELETE CASCADE,
    question_id VARCHAR(36) NOT NULL REFERENCES cbt_questions(id) ON DELETE CASCADE,
    selected_option VARCHAR(10),
    essay_answer TEXT,
    is_doubtful BOOLEAN DEFAULT FALSE,
    is_correct BOOLEAN DEFAULT FALSE,
    score_obtained NUMERIC(5,2) DEFAULT 0,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_session_question UNIQUE (session_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_cbt_answers_session ON cbt_student_answers(session_id);

-- 8. Tabel Audit Log Pelanggaran Anti-Curang (Proctoring Log)
CREATE TABLE IF NOT EXISTS cbt_violation_logs (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES cbt_student_sessions(id) ON DELETE CASCADE,
    student_id VARCHAR(36) NOT NULL,
    violation_type VARCHAR(50) NOT NULL,
    details TEXT,
    duration_seconds INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cbt_violations_session ON cbt_violation_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_cbt_violations_student ON cbt_violation_logs(student_id);
