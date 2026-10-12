-- Migration: 20260914000001_create_digital_library_schema.down.sql
DROP TABLE IF EXISTS reading_resumes;
DROP TABLE IF EXISTS library_attendances;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS book_items;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS library_members;
