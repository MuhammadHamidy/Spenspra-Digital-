# PRD: Ekosistem Aplikasi Sekolah – SSO, e-Rapor, e-Perpus, dan Presensi QR

**Versi:** 3.1 (fokus rilis: SSO dan e-Rapor; e-Perpus dan Presensi QR ditunda)
**Tech Stack:** Go (REST API) + Next.js (Frontend), database terpisah per sistem
**Sekolah:** SMPN 1 Prambon

---

## 0. Fokus Rilis & Ringkasan Perubahan

> **FOKUS SAAT INI: SSO dan e-Rapor.** Seluruh requirement bertanda **[Rilis Saat Ini]** wajib selesai pada rilis ini. e-Perpus dan Presensi QR **tidak dikerjakan sekarang**; bagiannya di dokumen ini hanya menjadi acuan agar desain SSO (identitas, barcode, akses aplikasi) sudah siap menampungnya nanti, ditandai **[Fase Berikutnya]**.

| Sistem | Status |
|---|---|
| SSO | **[Rilis Saat Ini]** |
| e-Rapor | **[Rilis Saat Ini]** |
| e-Perpus | [Fase Berikutnya] |
| Presensi QR (kelas) | [Fase Berikutnya] |

### Perubahan v3.1 (dari v3.0)
* Menegaskan fokus rilis pada SSO dan e-Rapor; e-Perpus dan Presensi QR dipindah ke fase berikutnya (roadmap dan metrik disesuaikan).
* **Barcode siswa** didefinisikan sebagai alat **absensi kunjungan perpustakaan** (dipindai di e-Perpus), bukan sekadar kartu umum. Barcode tetap dibuat dan dicetak dari SSO pada rilis ini.
* **Siswa memiliki akun login SSO** untuk e-Perpus, khususnya memantau buku yang dibaca/dipinjam. Akun siswa dibuat sekarang, akses aplikasinya diaktifkan saat e-Perpus rilis.
* Opsi usulan kehadiran rapor dari Presensi QR ditunda.

### Perubahan v3.0 (dari v2.2)

| Hal | v2.2 | v3.0 |
|---|---|---|
| Struktur | SSO memuat master data akademik dan modul e-Rapor | **Empat sistem terpisah:** SSO, e-Rapor, e-Perpus, Presensi QR |
| Penentuan guru–mapel–rombel & walas | Super Admin SSO | **Admin e-Rapor** (bukan Super Admin) |
| Mata pelajaran | Master di SSO | Master di **e-Rapor** |
| Tugas Super Admin SSO | Master data + penugasan + walas | **Identitas, akun, rombel & keanggotaan siswa, tahun ajaran, kartu QR, dan akses aplikasi (user × aplikasi × peran)** |
| Peran e-Rapor | Super Admin, Guru, Walas | **Admin e-Rapor, Guru (Guru Mapel/Walas)**, serta pemantauan oleh **Kepala Sekolah** (read-only) |
| e-Perpus | Tidak ada | Peran **Guru, Siswa, Admin (Pustakawan)**; login via SSO |
| Login siswa | Tidak ada | Siswa punya akun SSO untuk e-Perpus |
| Pemantauan | Tidak ada | **Dashboard progres input nilai** per guru untuk Kepala Sekolah |

Aturan v2.2 yang dipertahankan: NFR-01 (tanpa data hardcode di frontend), NFR-02 (modular per fitur), aturan unik satu (rombel, mapel) = satu guru, aturan presensi 15 menit, dan pola CRUD seragam.

---

## 1. Problem Statement

1. **Akun dan hak akses terpecah** di setiap aplikasi (rapor, perpustakaan, presensi), sehingga rawan tidak sinkron.
2. **Kepemilikan data tidak jelas:** penugasan mengajar dan walas adalah urusan akademik e-Rapor, tetapi sebelumnya dicampur dengan administrasi akun.
3. **Kepala sekolah tidak punya cara memantau** guru mana yang sudah/belum menginput nilai.
4. **Wali kelas sulit merekap nilai dan mencetak rapor**, serta presensi dan peminjaman buku masih manual.

---

## 2. Ekosistem & Kepemilikan Data

```
                    ┌──────────────────────────────┐
                    │  SSO  (Super Admin, 1 akun)  │
                    │  Identitas • Akun • Rombel   │
                    │  Siswa • Tahun Ajaran • QR   │
                    │  Akses aplikasi (user×app×peran)
                    └───────┬───────────┬──────────┘
          OIDC / token      │           │            │
              ┌─────────────┘           │            └─────────────┐
              ▼                         ▼                          ▼
     ┌────────────────┐       ┌──────────────────┐       ┌──────────────────┐
     │ e-Rapor        │       │ e-Perpus         │       │ Presensi QR      │
     │ Admin, Guru    │       │ Admin(Pustakawan)│       │ Guru             │
     │ (+Kepsek pantau)│      │ Guru, Siswa      │       │                  │
     │ Mapel,Penugasan│       │ Koleksi,Pinjam   │       │ Sesi, Scan       │
     │ Walas,Nilai    │       └──────────────────┘       └──────────────────┘
     └───────┬────────┘
             └── menyediakan penugasan ke Presensi QR
```

**Prinsip:** SSO menentukan **siapa dia dan aplikasi mana yang boleh dimasuki**; admin di tiap aplikasi menentukan **apa yang dikerjakan di dalam aplikasi itu**.

| Sistem | Pemilik data (source of truth) | Dikelola oleh |
|---|---|---|
| **SSO** | Pengguna (siswa, guru, kepala sekolah, tendik), kredensial, tahun ajaran & semester, rombel, keanggotaan siswa di rombel, token QR, registri aplikasi, akses aplikasi per pengguna | Super Admin |
| **e-Rapor** | Mata pelajaran, penugasan mengajar (guru–mapel–rombel), wali kelas, nilai, kehadiran rapor, pengaturan rapor, cetak PDF | Admin e-Rapor |
| **e-Perpus** *[Fase Berikutnya]* | Koleksi, peminjaman, riwayat baca, kunjungan perpustakaan, denda | Admin e-Perpus (Pustakawan) |
| **Presensi QR** *[Fase Berikutnya]* | Sesi kelas dan kehadiran per sesi | Guru |

Sistem non-SSO **tidak membuat akun sendiri**; daftar pengguna dan rombel dibaca (read-only) dari SSO.

---

## 3. Persona & Hak Akses

| Peran | Sistem | Hak utama |
|---|---|---|
| **Super Admin (1 akun)** | SSO | Kelola pengguna, rombel & keanggotaan siswa, tahun ajaran, kartu QR, akses aplikasi, import Excel, audit log. **Tidak** menentukan mapel, penugasan, atau walas. |
| **Admin e-Rapor** | e-Rapor | Kelola mata pelajaran, **penugasan guru–mapel–rombel**, **penetapan wali kelas**, pengaturan rapor, kunci/buka periode, pantau progres. Tidak menginput nilai. |
| **Guru (Guru Mapel)** | e-Rapor | Input nilai hanya untuk (rombel, mapel) yang ditugaskan. |
| **Guru (Wali Kelas)** | e-Rapor | Lihat seluruh nilai rombelnya (read-only), input kehadiran S/I/A, cetak PDF rapor satu rombel. Walas adalah penugasan, bukan role terpisah. |
| **Kepala Sekolah** | e-Rapor | Memantau progres input nilai dan kehadiran seluruh guru/rombel (read-only). |
| **Admin e-Perpus (Pustakawan)** *[Fase Berikutnya]* | e-Perpus | Kelola koleksi, anggota, peminjaman, laporan; memindai barcode untuk mencatat kunjungan. |
| **Guru** | e-Perpus, Presensi QR *[Fase Berikutnya]* | Perpustakaan: mencari/meminjam koleksi. Presensi: buka kelas, scan QR, override, tutup kelas. |
| **Siswa** | e-Perpus *[Fase Berikutnya]* | Login SSO untuk **memantau buku yang dibaca/dipinjam**; memegang kartu barcode yang dipindai sebagai **absensi kunjungan perpustakaan**. Akun dibuat di SSO sejak rilis ini. |

Peran aplikasi ditetapkan oleh Super Admin di SSO (matriks akses). Super Admin hanya memberi peran *Admin e-Rapor*, sedangkan isi kerjanya diatur Admin e-Rapor sendiri.

---

## 4. Goals & Non-Goals

### Goals
1. **Single Sign-On:** satu login untuk semua aplikasi, akses ditentukan matriks user × aplikasi × peran.
2. **Pemisahan wewenang:** Super Admin mengurus identitas dan akses; Admin e-Rapor mengurus penugasan akademik.
3. **Otorisasi berbasis penugasan:** guru hanya bekerja pada (rombel, mapel) yang ditugaskan; satu (semester, rombel, mapel) hanya satu guru.
4. **Walas** melihat nilai, menginput kehadiran (sakit, izin, alpha), dan mencetak PDF seluruh siswa rombel.
5. **Kepala Sekolah** memantau progres input nilai tiap guru secara real-time.
6. **[Fase Berikutnya]** e-Perpus memakai identitas dan barcode dari SSO: barcode untuk absensi kunjungan perpustakaan, login siswa untuk memantau buku yang dibaca.
7. **[Fase Berikutnya]** Presensi QR kelas dengan aturan 15 menit.
8. **NFR-01 dan NFR-02** berlaku untuk seluruh sistem.

### Non-Goals (MVP)
* **Pada rilis ini:** pengembangan e-Perpus dan Presensi QR (fase berikutnya). Spesifikasi detail e-Perpus (koleksi, denda, dll.) ditulis di PRD e-Perpus terpisah; dokumen ini hanya menyiapkan identitas, barcode, dan akses.
* Login orang tua, face recognition, WhatsApp (v2), Dapodik (v3), tanda tangan digital rapor.
* Satu (rombel, mapel) diampu dua guru (team teaching).

---

## 5. User Stories

| ID | Sebagai | Saya Ingin | Supaya |
|---|---|---|---|
| **SSO** | | | |
| US-S1 | Super Admin | Mengimpor guru, siswa, staf, dan rombel via Excel | Identitas terbentuk cepat |
| US-S2 | Super Admin | Menentukan aplikasi dan peran tiap pengguna di satu matriks | Akses terpusat dan jelas |
| US-S3 | Super Admin | Menonaktifkan akun satu kali | Akses ke semua aplikasi langsung tercabut |
| US-S4 | Super Admin | Mencetak kartu QR/barcode per rombel | Kartu dipakai untuk presensi dan perpustakaan |
| US-S5 | Pengguna | Login sekali lalu berpindah antar aplikasi | Tidak login berulang |
| **e-Rapor** | | | |
| US-R1 | Admin e-Rapor | Mengelola mata pelajaran | Kurikulum tercatat |
| US-R2 | Admin e-Rapor | Menentukan guru pengampu pada matriks mapel × rombel | Hak input nilai tiap guru benar |
| US-R3 | Admin e-Rapor | Menetapkan wali kelas per rombel | Walas mendapat akses rekap dan cetak |
| US-R4 | Admin e-Rapor | Mengunci/membuka periode rapor | Nilai tidak berubah setelah final |
| US-R5 | Guru Mapel | Menginput nilai pada rombel+mapel saya | Nilai terlihat oleh walas |
| US-R6 | Walas | Melihat nilai semua mapel di rombel saya | Memeriksa kelengkapan |
| US-R7 | Walas | Menginput sakit, izin, alpha tiap siswa | Rekap kehadiran tampil di rapor |
| US-R8 | Walas | Mencetak PDF rapor seluruh siswa sekaligus | Tidak mencetak satu per satu |
| US-R9 | Kepala Sekolah | Melihat progres input nilai per guru, mapel, dan rombel | Menindaklanjuti guru yang belum selesai |
| US-R10 | Admin e-Rapor | Melihat progres yang sama | Mengingatkan guru sebelum batas waktu |
| **e-Perpus** *[Fase Berikutnya]* | | | |
| US-P1 | Siswa | Login via SSO dan melihat daftar buku yang sedang dipinjam serta riwayat buku yang dibaca | Memantau bacaan sendiri tanpa akun baru |
| US-P1b | Guru | Login via SSO ke e-Perpus | Memakai perpustakaan tanpa akun baru |
| US-P2 | Pustakawan | Memindai barcode kartu siswa saat masuk perpustakaan | Kunjungan (absensi perpustakaan) tercatat otomatis |
| US-P3 | Pustakawan | Memindai barcode saat peminjaman | Peminjaman cepat, identitas valid |
| **Presensi QR** *[Fase Berikutnya]* | | | |
| US-A1 | Guru | Buka Kelas → scan QR → Tutup Kelas | Presensi < 2 menit |
| US-A2 | Guru | Override status Sakit/Izin/Terlambat | Kasus khusus tercatat |

---

## 6. Functional Requirements

### 6.1 SSO

**FR-S1: Autentikasi.** OIDC/OAuth2 Authorization Code + PKCE; access token 15 menit + refresh token; password di-hash (argon2/bcrypt); lockout setelah 5 kali gagal; ganti password wajib saat login pertama. Endpoint: `/api/sso/authorize`, `/token`, `/userinfo`, `/logout`, `/me/access`. Menonaktifkan akun mencabut semua token.

**FR-S2: Manajemen identitas.** CRUD + import Excel untuk:
* **Pengguna:** jenis identitas `SISWA`, `GURU`, `KEPALA_SEKOLAH`, `TENDIK`. Siswa: NISN (unik), nama, jenis kelamin, rombel. Guru/staf: NIP (unik), nama, email, username.
* **Tahun Ajaran & Semester** (satu semester aktif).
* **Rombel:** nama (format baku, mis. VII-A), tingkat, ruang. Tanpa field wali kelas atau mapel.
* **Keanggotaan siswa di rombel** per tahun ajaran, dengan riwayat mutasi.
* Token QR/barcode `qr_code_token` (UUIDv4) dibuat otomatis untuk setiap pengguna yang membutuhkan kartu.

**FR-S3: Akses aplikasi (user × aplikasi × peran).**
* Registri aplikasi: `erapor`, `eperpus`, `presensi`, beserta peran yang tersedia (e-Rapor: `ADMIN`, `GURU`, `KEPALA_SEKOLAH`; e-Perpus: `ADMIN`, `GURU`, `SISWA`; Presensi: `GURU`).
* **Rilis saat ini:** aplikasi `erapor` aktif; `eperpus` dan `presensi` didaftarkan tetapi berstatus **nonaktif** (`is_active = false`) sampai fase berikutnya. Akun siswa tetap dibuat di SSO, tanpa akses aplikasi aktif.
* **Aturan default per jenis identitas** (dapat diubah; yang menyangkut aplikasi nonaktif baru berlaku saat diaktifkan): Guru → e-Rapor `GURU`, e-Perpus `GURU`, Presensi `GURU`; Siswa → e-Perpus `SISWA`; Kepala Sekolah → e-Rapor `KEPALA_SEKOLAH`.
* Peran `ADMIN` diberikan manual oleh Super Admin, dengan konfirmasi dan audit log.
* Pemberian akses massal berdasarkan filter (jenis identitas, rombel).
* Token memuat `sub`, `app_roles` per aplikasi; aplikasi tetap memvalidasi ke SSO untuk aksi tulis.

**FR-S4: Kartu QR/Barcode [Rilis Saat Ini].** Generate QR ISO/IEC 18004 dari `qr_code_token`; cetak per rombel (ID-1/CR80 atau A4) berisi nama, NISN/NIP, rombel, QR. **Tujuan utama barcode: absensi kunjungan siswa di perpustakaan (e-Perpus).** Token yang sama dicadangkan untuk presensi kelas bila Presensi QR dirilis kelak. Token hanya berisi UUID acak, tanpa data pribadi, dan dapat diterbitkan ulang (kartu hilang) dengan token lama langsung tidak berlaku.

**FR-S5: Import Excel multi-sheet.** Sheet `rombel`, `siswa`, `guru`, `staf`; validasi lintas sheet dalam satu transaksi, rollback dengan nama sheet dan nomor baris.

**FR-S6: Sinkronisasi ke aplikasi.** Direktori read-only: `GET /api/sso/directory/users?app=&role=`, `/classes`, `/students?class_id=`, `/semesters/active`. Perubahan penting (akun nonaktif, siswa pindah rombel, semester aktif berganti) dikirim sebagai **event/webhook** ke aplikasi terdaftar; aplikasi menyimpan referensi berupa `sso_user_id`/`class_id`.

**FR-S7: Audit log** untuk login, perubahan identitas, akses aplikasi, dan cetak kartu.

**FR-S8: UX panel Super Admin (SSO).** Sidebar: **Beranda** (checklist: Tahun Ajaran → Rombel → Siswa → Guru & Staf → Akses Aplikasi), **Data Master** (Tahun Ajaran, Rombel, Siswa, Guru, Staf), **Akses Aplikasi** (matriks), **Kartu QR**, **Import/Export**, **Audit Log**. Selektor semester aktif di topbar. Menu Mata Pelajaran, Penugasan, dan Wali Kelas **tidak ada** di SSO.

### 6.2 e-Rapor

**FR-R1: Autentikasi.** Login hanya via SSO; pengguna tanpa peran e-Rapor ditolak. Peran dibaca dari token.

**FR-R2: Mata pelajaran (Admin e-Rapor).** Kode (unik), nama, alokasi JP/minggu, deskripsi, status aktif; import Excel.

**FR-R3: Penugasan mengajar (Admin e-Rapor).**
* Matriks **mapel (baris) × rombel (kolom)** pada semester aktif; tiap sel satu dropdown guru. Daftar guru dan rombel diambil dari SSO (hanya guru ber-peran e-Rapor `GURU`).
* Constraint unik `(semester_id, class_id, subject_id)` → satu guru. Seorang guru boleh banyak rombel dan banyak mapel.
* Filter per guru (jumlah rombel, mapel, JP); tombol "Simpan Perubahan" memvalidasi sekaligus; tampilan alternatif per rombel atas data yang sama.
* Perubahan guru menyimpan riwayat (`valid_from`, `valid_to`) dan audit log.
* Import Excel penugasan: `NIP Guru`, `Kode Mapel`, `Nama Rombel`; baris konflik ditolak dengan nama guru yang sudah mengampu.

**FR-R4: Wali kelas (Admin e-Rapor).** Ditetapkan di halaman detail Rombel (nama rombel dari SSO). Satu rombel tepat satu walas per semester; satu guru maksimal satu rombel per semester; dropdown menyembunyikan guru yang sudah menjadi walas. Walas boleh merangkap guru mapel.

**FR-R5: Input nilai (Guru Mapel).** Hanya (rombel, mapel) yang ditugaskan; selain itu `403`. Minimum: nilai akhir (0–100) dan deskripsi capaian; komponen rinci menunggu keputusan (Pertanyaan Terbuka). Riwayat perubahan mencatat `input_by` dan waktu. Terkunci saat periode dikunci.

**FR-R6: Tampilan Walas.** Matriks siswa × mapel rombelnya (read-only), dengan indikator mapel belum lengkap dan nama guru pengampu. Koreksi dilakukan guru mapel atau Admin membuka kunci.

**FR-R7: Kehadiran rapor (Walas).** Per siswa: jumlah **Sakit, Izin, Alpha** (bilangan bulat ≥ 0) pada semester aktif; total tidak melebihi hari efektif (diatur Admin e-Rapor); terkunci saat periode dikunci. Opsional (fase berikutnya, setelah Presensi QR aktif): usulan nilai awal dari data presensi yang tetap bisa diedit.

**FR-R8: Cetak PDF rapor satu rombel (Walas).** Satu PDF berisi rapor seluruh siswa (identitas, nilai per mapel, deskripsi, rekap S/I/A, nama walas). Peringatan bila nilai/kehadiran belum lengkap; walas memilih lanjut atau batal. Proses asinkron (job), target ≤ 60 detik untuk 36 siswa; opsi cetak satu siswa.

**FR-R9: Dashboard progres (Kepala Sekolah dan Admin e-Rapor, read-only).**
* **Per guru:** daftar penugasan (rombel × mapel), jumlah siswa yang sudah dinilai / total, persentase, status (`BELUM_MULAI`, `SEBAGIAN`, `LENGKAP`), waktu input terakhir.
* **Per rombel:** kelengkapan nilai seluruh mapel, status kehadiran rapor walas, kesiapan cetak.
* **Ringkasan sekolah:** persentase keseluruhan, jumlah guru belum mulai, daftar prioritas tindak lanjut (guru dengan progres terendah) dan tenggat periode.
* Filter: semester, guru, mapel, rombel, status; ekspor `.xlsx`; data diperbarui real-time/otomatis berkala.
* Kepala Sekolah **tidak dapat mengubah** nilai, penugasan, atau pengaturan.

**FR-R10: Pengaturan rapor (Admin e-Rapor).** Hari efektif, kop/identitas rapor, komponen nilai, kunci/buka periode (buka kunci mencatat alasan dan audit log).

**FR-R11: UX panel Admin e-Rapor.** Sidebar: Beranda (checklist: Mapel → Penugasan → Walas → Pengaturan), Mata Pelajaran, Penugasan Mengajar (matriks), Rombel & Walas, Progres Nilai, Pengaturan Rapor, Audit Log. Pola CRUD seragam: tabel + pencarian + tombol "+ Tambah" + drawer + menu "⋯"; nonaktif/arsip dengan dialog dampak; field relasi selalu dropdown.

### 6.3 e-Perpus [Fase Berikutnya – ringkas, hanya sebagai acuan integrasi]

* **FR-P1:** Login via SSO untuk peran `ADMIN` (pustakawan), `GURU`, `SISWA`.
* **FR-P2:** Data anggota diambil dari SSO (direktori); anggota nonaktif di SSO tidak dapat meminjam.
* **FR-P3 (absensi kunjungan):** pustakawan atau kios memindai barcode siswa (`qr_code_token`) saat masuk perpustakaan; e-Perpus mencatat kunjungan (`user_sso_id`, rombel, waktu, pencatat). Scan ganda dalam jangka pendek ditolak (debounce); token tidak dikenal ditolak dengan umpan balik suara/warna.
* **FR-P4 (portal siswa):** siswa login SSO untuk melihat buku yang sedang dipinjam, riwayat buku yang dibaca/dipinjam, dan jatuh tempo. Siswa hanya dapat melihat data dirinya sendiri.
* **FR-P5:** koleksi, peminjaman, dan denda dimiliki e-Perpus dan dikelola Admin e-Perpus (spesifikasi di PRD terpisah).

### 6.4 Presensi QR [Fase Berikutnya – ringkas, hanya sebagai acuan]

*Belum dikerjakan pada rilis ini. Apakah barcode siswa juga dipakai untuk presensi kelas masih perlu dikonfirmasi (lihat Pertanyaan Terbuka).*

**FR-A1:** Akses peran `GURU` via SSO. **FR-A2:** "Buka Kelas" hanya menampilkan penugasan (rombel, mapel) milik guru, diambil dari e-Rapor.
**FR-A3 (aturan 15 menit):** Buka Kelas membuat `class_sessions` (`OPEN`, `opened_at`, `late_cutoff_at`) dan seluruh siswa rombel berstatus `PENDING`. Scan dalam 0–15 menit → `HADIR`. Lewat 15 menit → `PENDING` otomatis menjadi `ALPHA`; guru dapat mengubah menjadi `TERLAMBAT`/`SAKIT`/`IZIN` manual. Tutup Kelas mengunci sesi permanen.
**FR-A4:** Scan via webcam (`html5-qrcode`/`@zxing/browser`) atau scanner USB keyboard-wedge (buffer global, akhiran Enter); audio dan warna sukses/gagal; debounce 2 detik; unique `(session_id, student_id)`; tolak siswa beda rombel.
**FR-A5:** Antrean offline (IndexedDB) dan sinkron saat online; auto-close sesi `OPEN` setelah 3 jam; pencarian "Absen Manual" bila kartu rusak; export laporan `.xlsx`.
Nilai 15 menit dan 3 jam diambil dari konfigurasi backend (NFR-01).

---

## 7. Non-Functional Requirements (berlaku untuk semua sistem)

### NFR-01: Tidak Ada Data Hardcode di Frontend
* Semua data domain, konfigurasi, dan aturan bisnis dibuat, disimpan, dan divalidasi di **backend**; frontend hanya menampilkan dan mengirim data lewat API.
* **Dilarang di frontend:** opsi dropdown (peran, jenis identitas, status kehadiran, jenis kelamin, status progres), data master atau data contoh, aturan bisnis (15 menit, 3 jam, hari efektif, rentang nilai, format nama rombel, kebijakan password), identitas sekolah dan kop rapor, struktur menu dan hak akses per peran, label dan warna status.
* **Boleh:** teks UI statis lewat satu berkas i18n, dan konstanta teknis murni UI (breakpoint, durasi animasi, debounce scan).
* Sumber di backend tiap sistem: `GET /api/meta/enums`, `GET /api/meta/settings` (tabel `app_settings`), `GET /api/<sistem>/me/access` (menu dan izin), endpoint lookup per entitas (`/options`), dan **seeder/migration backend** untuk data awal. Data demo lewat seed backend (`make seed-dev`), tanpa mock di build produksi.
* Bila API gagal, frontend menampilkan state error/kosong, bukan data cadangan. Validasi frontend hanya pelengkap UX dengan aturan dari backend.
* CI menggagalkan build bila ditemukan konstanta data domain di folder frontend.

### NFR-02: Struktur Kode Modular, Satu Fitur Satu Berkas/Folder
* Setiap fitur punya folder sendiri; setiap tanggung jawab di file terpisah. Tidak ada satu file yang menampung banyak fitur.
* **Backend (Go), contoh `internal/<fitur>/`:** `routes.go`, `handler.go`, `service.go`, `repository.go`, `model.go`, `dto.go`, `validator.go`, `service_test.go`; `shared/` hanya untuk middleware dan helper tanpa logika fitur; satu berkas migrasi per perubahan; satu seeder per jenis data.
* **Frontend (Next.js), contoh `features/<fitur>/`:** `api.ts`, `types.ts`, `hooks.ts`, `components/` (satu komponen per file); `app/` hanya merakit komponen fitur; `shared/` untuk komponen UI generik.
* **Modul per sistem:** SSO: `auth`, `users`, `semesters`, `classes`, `enrollments`, `app_access`, `qr_cards`, `imports`, `directory`, `audit`, `settings`, `meta`. e-Rapor: `auth`, `subjects`, `teaching_assignments`, `homeroom`, `grades`, `rapor_attendance`, `rapor_print`, `progress`, `rapor_settings`, `audit`, `meta`. e-Perpus dan Presensi *(fase berikutnya)*: modul sendiri per fitur.
* Target ≤ 300 baris per file (kecuali hasil generate); dilarang file serba ada (`utils`, `helpers`, `constants`, `api`); fitur tidak mengimpor internal fitur lain, hanya lewat antarmuka atau `shared/`; fitur baru = folder baru + satu titik registrasi.

### NFR-03: Integrasi Antar Sistem
* Sistem non-SSO tidak menyimpan password; hanya referensi `sso_user_id`, `class_id`, `student_id`.
* Pemanggilan antar sistem memakai token layanan (service-to-service) dengan cakupan minimum; setiap pemanggilan di-log.
* Jika SSO tidak dapat dihubungi, sesi yang sudah aktif tetap berjalan sampai token kedaluwarsa; aplikasi memakai cache direktori terakhir hanya untuk **baca**, dan aksi tulis sensitif ditolak.

---

## 8. Data Model (Ringkas, per Sistem)

```
== SSO ==
users(id, username UNIQUE, password_hash, full_name, email, identity_type[SISWA|GURU|KEPALA_SEKOLAH|TENDIK],
      nip UNIQUE NULL, nisn UNIQUE NULL, gender, qr_code_token UNIQUE, is_active, must_change_password)
academic_years(id, name, is_active)        semesters(id, academic_year_id, name, is_active)
classes(id, name, grade_level, room, academic_year_id)                  -- rombel
enrollments(id, student_id, class_id, academic_year_id, valid_from, valid_to)
apps(id, code UNIQUE, name, is_active)     app_roles(id, app_id, code, label)
user_app_access(id, user_id, app_id, app_role_id, granted_by, granted_at)  UNIQUE(user_id, app_id)
app_settings(id, key UNIQUE, value JSONB, value_type)    enum_definitions(id, group, code, label, color, sort_order)
audit_logs(id, actor_id, action, entity, entity_id, detail, created_at)

== e-Rapor ==
subjects(id, code UNIQUE, name, jp_per_week, is_active)
teaching_assignments(id, semester_id, class_id, subject_id, teacher_sso_id, valid_from, valid_to)
   UNIQUE(semester_id, class_id, subject_id) WHERE valid_to IS NULL
homeroom_assignments(id, semester_id, class_id, teacher_sso_id)
   UNIQUE(semester_id, class_id), UNIQUE(semester_id, teacher_sso_id)
grades(id, semester_id, student_id, subject_id, score, description, input_by, updated_at)
   UNIQUE(semester_id, student_id, subject_id)
rapor_attendance(id, semester_id, student_id, sakit, izin, alpha, input_by, updated_at)
   UNIQUE(semester_id, student_id)
rapor_periods(id, semester_id, locked_at, locked_by, unlock_reason)
rapor_print_jobs(id, semester_id, class_id, requested_by, status, file_url, created_at)
progress_snapshots(id, semester_id, teacher_sso_id, class_id, subject_id, graded, total, last_input_at)  -- cache dashboard
app_settings(...)  enum_definitions(...)  audit_logs(...)

== Presensi QR == [Fase Berikutnya]
class_sessions(id, teacher_sso_id, class_id, subject_id, status, opened_at, late_cutoff_at, closed_at)
attendances(id, session_id, student_id, scan_time, status, is_manual_edit, notes)  UNIQUE(session_id, student_id)

== e-Perpus == [Fase Berikutnya] (skema lengkap di PRD e-Perpus)
library_visits(id, user_sso_id, class_id, visited_at, recorded_by)     -- absensi kunjungan via barcode
loans(id, user_sso_id, book_id, loaned_at, due_at, returned_at)       -- sumber "buku yang dibaca"
books(...), members(id, user_sso_id, status)
```

---

## 9. Matriks Otorisasi

| Aksi | Super Admin (SSO) | Admin e-Rapor | Guru Mapel | Walas | Kepala Sekolah |
|---|---|---|---|---|---|
| Kelola pengguna, rombel, siswa, tahun ajaran | ✔ | ✖ | ✖ | ✖ | ✖ |
| Atur akses aplikasi & peran | ✔ | ✖ | ✖ | ✖ | ✖ |
| Kelola mapel | ✖ | ✔ | ✖ | ✖ | ✖ |
| Tentukan guru–mapel–rombel | ✖ | ✔ | ✖ | ✖ | ✖ |
| Tetapkan wali kelas | ✖ | ✔ | ✖ | ✖ | ✖ |
| Kunci/buka periode rapor | ✖ | ✔ | ✖ | ✖ | ✖ |
| Input/ubah nilai | ✖ | ✖ | ✔ (penugasan sendiri) | ✖ (kecuali sebagai guru mapel) | ✖ |
| Lihat nilai satu rombel | ✖ | ✔ | Mapel miliknya | ✔ | ✔ |
| Input kehadiran S/I/A | ✖ | ✖ | ✖ | ✔ | ✖ |
| Cetak PDF rapor satu rombel | ✖ | ✔ | ✖ | ✔ | ✖ |
| Lihat dashboard progres | ✖ | ✔ | Progres sendiri | Progres rombelnya | ✔ (seluruh sekolah) |

Seluruh pemeriksaan dilakukan di API; menu yang tersembunyi bukan kontrol keamanan.

---

## 10. Edge Cases & Failure States

| Skenario | Penanganan |
|---|---|
| Guru belum punya akses e-Rapor di SSO | Muncul di SSO sebagai "belum punya akses"; tidak muncul di dropdown penugasan e-Rapor |
| Dua guru ditugaskan pada (rombel, mapel) yang sama | Ditolak constraint; pesan menyebut guru yang sudah mengampu |
| Guru diganti di tengah semester | Penugasan lama ditutup, guru baru mendapat akses; nilai lama tetap dengan `input_by` asli; dashboard progres mengikuti pengampu aktif |
| Akun guru dinonaktifkan di SSO yang masih memegang penugasan/walas | e-Rapor menerima event, menandai penugasan "perlu dialihkan" di dashboard Admin e-Rapor; nilai lama tetap tersimpan |
| Siswa pindah rombel di tengah semester | SSO mencatat mutasi lalu event ke aplikasi; nilai/kehadiran terbawa, riwayat dicatat |
| Rombel di SSO diubah namanya/dihapus | Hanya arsip; e-Rapor memakai `class_id`, bukan nama |
| Walas ditukar saat rapor diisi | Data kehadiran tetap milik rombel; walas baru melanjutkan |
| Nilai belum lengkap saat cetak | Peringatan dan daftar yang kosong; walas lanjut atau batal |
| Kepala Sekolah mencoba mengubah data | `403`; hanya baca |
| Periode rapor terkunci | Input nilai/kehadiran ditolak; hanya Admin e-Rapor yang dapat membuka kunci dengan alasan |
| Generate PDF gagal/timeout | Job dapat diulang; status dan galat tampil |
| SSO tidak terjangkau | Sesi aktif lanjut; data direktori dari cache hanya baca; aksi tulis sensitif ditolak |
| Super Admin menurunkan peran Admin e-Rapor | Berlaku seketika (validasi ulang ke SSO); data yang diubah sebelumnya tetap |
| API meta/settings gagal dimuat | Halaman error + coba lagi; tidak ada nilai cadangan hardcode |
| Aturan bisnis diubah (mis. batas 15 menit) | Berlaku untuk sesi berikutnya; sesi berjalan memakai `late_cutoff_at` tersimpan |
| Kartu QR rusak / double scan / salah rombel / internet drop / lupa Tutup Kelas | Sama seperti ketentuan Presensi QR (FR-A4, FR-A5) |
| Excel rusak/duplikat | Atomic rollback + nama sheet dan nomor baris |

---

## 11. Success Metrics

1. 100% penulisan nilai berasal dari guru dengan penugasan valid; 0 konflik penugasan ganda.
2. Satu login memberi akses ke semua aplikasi sesuai peran; pencabutan akun berlaku ≤ 15 menit (maks. umur token) untuk baca dan seketika untuk tulis.
3. Admin e-Rapor menyelesaikan penugasan semester (± 20 guru) dalam ≤ 30 menit tanpa bantuan.
4. Dashboard progres Kepala Sekolah menampilkan data dengan keterlambatan ≤ 1 menit dari input guru.
5. Cetak PDF rapor satu rombel (36 siswa) ≤ 60 detik.
6. ≥ 95% rombel memiliki nilai lengkap dan kehadiran terisi sebelum batas kunci periode.
7. Import massal identitas selesai < 5 menit.
8. *[Fase Berikutnya]* Presensi ≤ 2 menit per kelas, latensi scan ≤ 300 ms, 0 duplikasi; kunjungan perpustakaan tercatat ≤ 2 detik per siswa.
9. 0 temuan data domain hardcode di frontend; tidak ada file kode (non-generate) > 300 baris.

---

## 12. Roadmap

* **Rilis saat ini (MVP):** **SSO** (identitas guru/siswa/kepala sekolah/tendik, rombel & keanggotaan, akses aplikasi, kartu barcode, import Excel, audit) dan **e-Rapor** (mapel, penugasan, walas, nilai, kehadiran rapor, cetak PDF, dashboard progres Kepala Sekolah).
* **Fase berikutnya (1):** **e-Perpus** (login siswa/guru/pustakawan, absensi kunjungan via barcode, portal siswa memantau buku yang dibaca, peminjaman).
* **Fase berikutnya (2):** **Presensi QR kelas** (aturan 15 menit), prefill kehadiran rapor dari presensi.
* **Lanjutan:** WhatsApp ke wali murid, rotating QR, analitik, template rapor kustom, portal orang tua, integrasi Dapodik, tanda tangan digital.

---

## 13. Pertanyaan Terbuka

**Rilis saat ini (SSO & e-Rapor)**
1. **Kepala Sekolah di e-Rapor:** peran ketiga `KEPALA_SEKOLAH` (read-only, draft ini) atau akun Guru dengan izin tambahan pemantauan? kepala sekolah
2. **Rombel** dipegang SSO (draft ini). Apakah Admin e-Rapor perlu dapat meminta penambahan rombel ke Super Admin? iya perlu
3. **Struktur nilai:** hanya nilai akhir per mapel, atau komponen (tugas/UTS/UAS) dengan bobot? Format Kurikulum Merdeka?struktur nilai hanya fokus ke menu uts dengan format sebelumnya 
4. **Walas:** boleh satu guru menjadi walas di lebih dari satu rombel? (Draft: maksimal satu.)
5. **Format cetak rapor:** satu PDF gabungan atau ZIP per siswa; template resmi (kop, F4/A4)?pdf gabungan
6. **Kehadiran rapor:** murni input manual walas pada rilis ini (draft); prefill dari presensi menunggu fase berikutnya.
7. **Admin e-Rapor:** siapa orangnya (TU atau guru tertentu) dan boleh lebih dari satu akun? kesiswaan
8. **Kartu barcode:** printer PVC atau stiker A4 laminasi? Apakah kartu juga berfungsi sebagai kartu pelajar? nani berbentuk kecil yang di tempel pada kartu pelajar
9. **Akun siswa:** username (NISN) dan password awal dibuat bagaimana, mengingat akun dibuat sekarang walau e-Perpus belum dirilis (default, ditempel di kartu, atau diaktifkan saat e-Perpus rilis)? password sama dengan username

**Fase berikutnya**
10. **Barcode untuk presensi kelas:** apakah barcode siswa yang sama juga dipakai di Presensi QR kelas, atau hanya untuk perpustakaan? dipakai untuk keduanya
11. **Presensi QR** bergantung pada penugasan dari e-Rapor (draft). Bagaimana untuk guru pengganti? menggunakan nama guru yang diganti
12. **Override Alpha** pada presensi: boleh menjadi `HADIR` atau wajib `TERLAMBAT`? boleh menjadi hadir
13. **Absensi perpustakaan:** dipindai pustakawan atau kios mandiri di pintu? Apakah ada batas jam kunjungan? dipindai oleh pustakawan
14. **Riwayat baca siswa:** hanya buku yang dipinjam, atau juga buku yang dibaca di tempat? hanya buku yang dipinjam dan dibaca di tempat