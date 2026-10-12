# Dokumentasi API — Sistem Perpustakaan Digital Cerdas (Smart Digital Library)

Versi: 2.0.0  
Base URL: `http://localhost:8080/api`  
Spesifikasi: RESTful API Go Fiber + PostgreSQL + Python Face Service

---

## 1. Fitur Utama & Ruang Lingkup Sistem

Sistem ini mentransformasikan pengelolaan perpustakaan modern dengan 7 fitur unggulan:
1. **Absensi Otomatis Anggota / Pengunjung (Face Recognition)**: Kios layar sentuh dengan kamera pengenal wajah untuk mencatat kunjungan tanpa sentuh.
2. **Sirkulasi Peminjaman & Pengembalian via Barcode Scanner**: Kasir cepat pemindaian barcode kartu anggota dan stiker eksemplar buku.
3. **Input & Import Data Buku Massal (Excel / CSV)**: Unggah file spreadsheet katalog dengan auto-mapping dan validasi baris.
4. **Generate Barcode Otomatis per Eksemplar Buku**: Format standar Code-128 unik (`LIB-BK-YYYY-SEQ-C##`).
5. **Pencetakan Label Barcode**: Ekspor dan cetak stiker barcode siap tempel pada kertas stiker sheet A4 (Tom & Jerry 108/121) atau printer thermal roll (50x30 mm).
6. **Pemantauan (Tracking) Sirkulasi & Keterlambatan**: Deteksi otomatis jatuh tempo, kalkulasi denda per hari (Rp 1.000/hari), dan status transaksi.
7. **Pencatatan Resume Bacaan & Insight Agregat**: Form refleksi literasi anggota, rating buku, poin pembelajaran, serta dashboard analitik tren literasi perpustakaan.

---

## 2. Format Respons Standar

**Sukses:**
```json
{
  "success": true,
  "message": "Berhasil",
  "data": { ... }
}
```

**Gagal:**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Pesan deskripsi kesalahan"
  }
}
```

---

## 3. Daftar Endpoint Lengkap

### A. Autentikasi & Akun (`/api/auth`, `/api/users`, `/api/roles`)
| Metode | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/auth/login` | Login pengguna (Admin, Pustakawan, Anggota) |
| POST | `/api/auth/register` | Pendaftaran akun baru |
| GET | `/api/users` | Daftar akun pengguna sistem |
| GET | `/api/roles` | Daftar peran hak akses |

---

### B. Anggota Perpustakaan (`/api/members`)
| Metode | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/members?search=` | Daftar anggota perpustakaan dengan filter pencarian |
| GET | `/api/members/:id` | Detail data anggota berdasarkan UUID |
| GET | `/api/members/code/:code` | Cari anggota berdasarkan barcode (`MBR-2026-XXXX`) |
| POST | `/api/members` | Daftarkan anggota baru & terbitkan kode barcode |
| PUT | `/api/members/:id` | Perbarui profil anggota |
| DELETE | `/api/members/:id` | Hapus data anggota |

---

### C. Katalog Buku & Eksemplar (`/api/books`)
| Metode | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/books?search=&category=` | Daftar katalog buku perpustakaan |
| GET | `/api/books/:id` | Detail buku beserta daftar eksemplar fisik & barcode |
| GET | `/api/books/barcode/:barcode` | Cari eksemplar fisik buku via scan barcode |
| POST | `/api/books` | Buat buku baru & auto-generate eksemplar barcode |
| PUT | `/api/books/:id` | Perbarui informasi buku |
| DELETE | `/api/books/:id` | Hapus buku beserta eksemplarnya |
| POST | `/api/books/:id/copies` | Tambah jumlah eksemplar baru pada buku yang ada |
| POST | `/api/books/import-batch` | Import massal data buku dari Excel / CSV |
| POST | `/api/books/labels-print` | Ambil data label cetak barcode sesuai daftar barcode terpilih |

---

### D. Sirkulasi Peminjaman & Pengembalian (`/api/loans`)
| Metode | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/loans?status=&member_id=&search=` | Daftar peminjaman (filter: BORROWED, OVERDUE, RETURNED) |
| GET | `/api/loans/stats` | Ringkasan statistik (total dipinjam, overdue, total denda) |
| GET | `/api/loans/:id` | Detail transaksi peminjaman |
| POST | `/api/loans/borrow` | Catat peminjaman buku (input scan barcode anggota & buku) |
| POST | `/api/loans/return` | Catat pengembalian buku (scan barcode buku, auto kalkulasi denda) |
| POST | `/api/loans/:id/pay-fine` | Konfirmasi pelunasan denda keterlambatan |

---

### E. Absensi Pengunjung Face Recognition (`/api/library-attendances`)
| Metode | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/library-attendances/recognize` | Presensi otomatis via pencocokan vektor wajah |
| POST | `/api/library-attendances/manual` | Presensi manual tamu / scan kartu |
| GET | `/api/library-attendances?search=&date=` | Riwayat log presensi pengunjung |
| GET | `/api/library-attendances/stats` | Statistik pengunjung harian, anggota vs tamu |

---

### F. Resume Bacaan & Analitik Literasi (`/api/reading-resumes`)
| Metode | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/reading-resumes?member_id=&book_id=&search=` | Daftar resume bacaan terbit |
| GET | `/api/reading-resumes/insights` | Agregat analitik kebiasaan membaca & leaderboard |
| GET | `/api/reading-resumes/:id` | Detail resume bacaan |
| POST | `/api/reading-resumes` | Tulis & simpan resume bacaan baru |
| PUT | `/api/reading-resumes/:id` | Perbarui resume bacaan |
| DELETE | `/api/reading-resumes/:id` | Hapus resume bacaan |

---

## 4. Format Import Data Excel / CSV Buku

File CSV/Excel harus memiliki baris header berikut:
```csv
Judul,ISBN,Pengarang,Penerbit,Tahun,Kategori,NomorPanggil,JumlahEksemplar,Deskripsi
"Clean Code","978-0132350884","Robert C. Martin","Prentice Hall",2008,"Teknologi","005.1 MAR c",3,"Panduan kode bersih."
```

Setiap buku yang diimpor akan secara otomatis dibuatkan entri eksemplar fisik pada tabel `book_items` dengan kode barcode unik berformat:
`LIB-BK-{TAHUN}-{URUTAN_BUKU}-C{NOMOR_EKSEMPLAR}`.
