-- Migration: 20260914000001_create_digital_library_schema.up.sql
-- Description: Creates tables for Perpustakaan Digital (Digital Library System)

-- 1. Library Members table
CREATE TABLE IF NOT EXISTS library_members (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES accounts(id) ON DELETE SET NULL,
    person_id VARCHAR(36),
    member_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    identity_number VARCHAR(50), -- NISN / NIM / NIK
    email VARCHAR(150),
    phone VARCHAR(30),
    address TEXT,
    max_borrow_limit INT NOT NULL DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_members_code ON library_members(member_code);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON library_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_person_id ON library_members(person_id);
CREATE INDEX IF NOT EXISTS idx_members_identity ON library_members(identity_number);

-- 2. Books Catalog table
CREATE TABLE IF NOT EXISTS books (
    id VARCHAR(36) PRIMARY KEY,
    isbn VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(150) NOT NULL,
    publisher VARCHAR(150),
    publish_year INT,
    category VARCHAR(100) NOT NULL,
    call_number VARCHAR(50), -- Dewey Decimal / Lokasi Rak
    description TEXT,
    cover_url TEXT,
    total_copies INT NOT NULL DEFAULT 0,
    available_copies INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);

-- 3. Book Items (Eksemplar Fisik Buku)
CREATE TABLE IF NOT EXISTS book_items (
    id VARCHAR(36) PRIMARY KEY,
    book_id VARCHAR(36) NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    barcode VARCHAR(100) NOT NULL UNIQUE,
    copy_number INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, BORROWED, MAINTENANCE, LOST
    item_condition VARCHAR(30) NOT NULL DEFAULT 'GOOD', -- GOOD, FAIR, DAMAGED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_book_items_barcode ON book_items(barcode);
CREATE INDEX IF NOT EXISTS idx_book_items_book_id ON book_items(book_id);
CREATE INDEX IF NOT EXISTS idx_book_items_status ON book_items(status);

-- 4. Loans (Transaksi Peminjaman & Pengembalian)
CREATE TABLE IF NOT EXISTS loans (
    id VARCHAR(36) PRIMARY KEY,
    loan_code VARCHAR(50) NOT NULL UNIQUE,
    member_id VARCHAR(36) NOT NULL REFERENCES library_members(id) ON DELETE RESTRICT,
    book_item_id VARCHAR(36) NOT NULL REFERENCES book_items(id) ON DELETE RESTRICT,
    borrow_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    return_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) NOT NULL DEFAULT 'BORROWED', -- BORROWED, RETURNED, OVERDUE, LOST
    fine_per_day DECIMAL(12, 2) NOT NULL DEFAULT 1000.00,
    days_overdue INT NOT NULL DEFAULT 0,
    fine_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    is_fine_paid BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loans_code ON loans(loan_code);
CREATE INDEX IF NOT EXISTS idx_loans_member ON loans(member_id);
CREATE INDEX IF NOT EXISTS idx_loans_item ON loans(book_item_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);

-- 5. Library Attendances (Absensi Kunjungan Wajah / Barcode)
CREATE TABLE IF NOT EXISTS library_attendances (
    id VARCHAR(36) PRIMARY KEY,
    member_id VARCHAR(36) REFERENCES library_members(id) ON DELETE SET NULL,
    visitor_name VARCHAR(150) NOT NULL,
    visitor_type VARCHAR(30) NOT NULL DEFAULT 'MEMBER', -- MEMBER, GUEST
    method VARCHAR(30) NOT NULL DEFAULT 'FACE_RECOGNITION', -- FACE_RECOGNITION, BARCODE_SCAN, MANUAL
    purpose VARCHAR(100) NOT NULL DEFAULT 'MEMBACA', -- MEMBACA, PINJAM_KEMBALI, DISKUSI, STUDI, LAINNYA
    confidence_score FLOAT NOT NULL DEFAULT 0.0,
    photo_url TEXT,
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lib_att_member ON library_attendances(member_id);
CREATE INDEX IF NOT EXISTS idx_lib_att_visited_at ON library_attendances(visited_at);

-- 6. Reading Resumes & Insights
CREATE TABLE IF NOT EXISTS reading_resumes (
    id VARCHAR(36) PRIMARY KEY,
    member_id VARCHAR(36) NOT NULL REFERENCES library_members(id) ON DELETE CASCADE,
    book_id VARCHAR(36) NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    loan_id VARCHAR(36) REFERENCES loans(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    key_insights TEXT NOT NULL,
    favorite_quotes TEXT,
    rating INT NOT NULL DEFAULT 5, -- 1-5
    status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resumes_member ON reading_resumes(member_id);
CREATE INDEX IF NOT EXISTS idx_resumes_book ON reading_resumes(book_id);
