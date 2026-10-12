# Menjalankan Spenspra dengan Docker

Dokumen ini menjelaskan cara menjalankan SSO, e-Rapor, dan Perpustakaan secara
bersamaan menggunakan Docker Compose utama.

## Prasyarat

- Docker Desktop sudah terpasang dan sedang berjalan.
- Docker Engine dapat merespons perintah `docker version`.
- Port `80` tidak sedang digunakan aplikasi lain.
- RAM Docker Desktop disarankan minimal 6 GB.

Periksa Docker sebelum memulai:

```powershell
docker version
docker compose version
```

## Persiapan pertama kali

Buka PowerShell, lalu masuk ke root workspace:

```powershell
cd "C:\Kuliah\Kebutuhan Kerja\Kerja\Spenspra"
```

Jika `.env.docker` belum tersedia:

```powershell
Copy-Item .env.docker.example .env.docker
```

Gunakan password database yang kuat pada `.env.docker` sebelum deployment
production. Jangan menghapus atau membagikan file tersebut karena berisi
konfigurasi sensitif.

## Validasi Compose

Jalankan validasi konfigurasi:

```powershell
docker compose --env-file .env.docker config --quiet
```

Jika tidak ada output error, konfigurasi Compose valid.

## Build image secara bertahap

Build bertahap direkomendasikan karena build paralel dapat membuat Docker
Desktop kehabisan resource dan menghasilkan error `rpc error ... EOF`.

```powershell
$env:COMPOSE_PARALLEL_LIMIT="1"

docker compose --env-file .env.docker build sso-api
docker compose --env-file .env.docker build rapor-api
docker compose --env-file .env.docker build perpus-api
docker compose --env-file .env.docker build sso-frontend
docker compose --env-file .env.docker build rapor-frontend
docker compose --env-file .env.docker build perpus-frontend
```

Face recognition tidak dijalankan saat ini karena sistem menggunakan barcode.

## Menjalankan seluruh sistem

Setelah build selesai:

```powershell
docker compose --env-file .env.docker up
```

Atau jalankan di background:

```powershell
docker compose --env-file .env.docker up -d
```

Compose akan menjalankan urutan berikut:

1. PostgreSQL.
2. Migration.
3. Seeder.
4. Backend API.
5. Frontend.
6. Nginx sebagai gateway utama.

## Alamat aplikasi

Buka portal SSO melalui:

```text
http://sso.localhost
```

Alamat sistem lain:

```text
http://rapor.localhost
http://perpus.localhost
```

Jika domain `*.localhost` tidak dapat dibuka, tambahkan baris berikut ke file
hosts Windows menggunakan editor sebagai Administrator:

```text
127.0.0.1 sso.localhost
127.0.0.1 rapor.localhost
127.0.0.1 perpus.localhost
```

Lokasi file hosts:

```text
C:\Windows\System32\drivers\etc\hosts
```

## Akun login SSO

### Super Admin

```text
Username : superadmin.prambon
Password : SsoPrambon!2026#Admin
Role     : SUPER_ADMIN
```

Super Admin digunakan untuk mengelola akun, role, dan akses administrator
masing-masing sistem.

### Admin e-Rapor

```text
Username : admin.rapor.prambon
Password : RaporPrambon!2026#Admin
Role     : ADMIN_RAPOR
```

Setelah login, akun diarahkan ke e-Rapor.

### Admin Perpustakaan

```text
Username : admin.perpus.prambon
Password : PerpusPrambon!2026#Admin
Role     : ADMIN_PERPUS
```

Setelah login, akun diarahkan ke Perpustakaan.

### Admin Presensi

```text
Username : admin.absensi.prambon
Password : AbsensiPrambon!2026#Admin
Role     : ADMIN_ABSENSI
```

Setelah login, akun diarahkan ke modul Presensi.

### Kepala Sekolah (Dashboard Eksekutif)

```text
Username : kepsek.prambon
Password : KepsekPrambon!2026#Admin
Role     : KEPALA_SEKOLAH
```

Setelah login, akun otomatis diarahkan ke Dashboard Monitoring Eksekutif (`/monitoring/kepala-sekolah`) untuk memantau performa keseluruhan sistem: progres entri nilai siswa di e-Rapor dan sirkulasi literasi perpustakaan.

Segera ganti password awal setelah login pada deployment yang digunakan secara
nyata.

## Melihat status container

```powershell
docker compose --env-file .env.docker ps
```

Container yang diharapkan aktif antara lain:

```text
spenspra-nginx
spenspra-sso-api
spenspra-sso-frontend
spenspra-rapor-api
spenspra-rapor-frontend
spenspra-perpus-api
spenspra-perpus-frontend
spenspra-redis
```

Container migration dan seeder dapat berstatus `Exited (0)` setelah berhasil.
Itu normal karena keduanya adalah proses sekali jalan.

## Melihat log

Semua service:

```powershell
docker compose --env-file .env.docker logs -f
```

SSO:

```powershell
docker compose --env-file .env.docker logs -f sso-api sso-frontend
```

e-Rapor:

```powershell
docker compose --env-file .env.docker logs -f rapor-api rapor-frontend
```

Perpustakaan:

```powershell
docker compose --env-file .env.docker logs -f perpus-api perpus-frontend
```

Nginx:

```powershell
docker compose --env-file .env.docker logs -f nginx
```

## Menghentikan sistem

Jika dijalankan di foreground, tekan `Ctrl+C`.

Jika dijalankan di background:

```powershell
docker compose --env-file .env.docker down
```

Perintah tersebut menghentikan container tanpa menghapus volume database.

## Menjalankan ulang setelah perubahan kode

```powershell
docker compose --env-file .env.docker up -d --build
```

Jika ingin rebuild satu service saja:

```powershell
docker compose --env-file .env.docker build sso-frontend
docker compose --env-file .env.docker up -d sso-frontend
docker compose --env-file .env.docker restart nginx
```

> **Catatan jika muncul `502 Bad Gateway`:**  
> Ketika suatu container service di-recreate / di-rebuild, IP internal Docker container tersebut dapat berubah sementara Nginx masih memegang IP lama di cache DNS upstream. Cukup restart container Nginx dengan:
> ```powershell
> docker compose --env-file .env.docker restart nginx
> ```

## Reset database development

**Peringatan:** perintah ini menghapus seluruh data pada volume PostgreSQL dan
Redis.

```powershell
docker compose --env-file .env.docker down -v
docker compose --env-file .env.docker up --build
```

Gunakan reset hanya untuk development atau instalasi baru. Jangan menjalankan
`down -v` pada server yang sudah memiliki data penting.

## Ruang Lingkup Barcode & Identitas Terpusat

Sistem Spenspra menggunakan **Single Source of Truth** untuk identitas siswa, guru,
dan tenaga kependidikan yang berpusat di layanan SSO dengan aturan pembagian penggunaan yang jelas:

- **Penggunaan Barcode Khusus Perpustakaan**:
  - Barcode kartu identitas siswa dan guru **hanya digunakan** ketika berkunjung ke perpustakaan (presensi mandiri) dan transaksi peminjaman/pengembalian buku.
  - Barcode buku fisik perpustakaan tetap independen dengan format `LIB-BK-*`.
- **e-Rapor dan SSO Bebas Barcode**:
  - Aplikasi e-Rapor dan portal utama SSO **tidak menggunakan barcode**.
  - Seluruh autentikasi, input nilai oleh guru, dan manajemen sekolah dilakukan melalui sistem login SSO.
- **Tabel Sumber Kebenaran**: `school_people` di SSO (`presdig`).
- **Format Barcode Token Perpustakaan**: `PRAMBON-{hex48}` (contoh: `PRAMBON-A1B2C3D4...`).
- **Aturan Relasi**:
  - Satu orang/siswa hanya memiliki **satu `person_id`**.
  - Satu orang/siswa hanya memiliki **satu `barcode_token`** aktif untuk kartu perpustakaan.

## Fitur Pengawasan Kepala Sekolah (Dashboard Eksekutif)

Kepala Sekolah SMPN 1 Prambon memiliki portal monitoring terpusat untuk memantau performa keseluruhan sistem:

- **Alamat Akses**:
  - Melalui SSO: `http://sso.localhost/monitoring/kepala-sekolah`
  - Melalui e-Rapor: `http://rapor.localhost/admin/monitoring`
- **Metrik & Analisis Nilai Siswa (e-Rapor)**:
  - **Progres Input Nilai Guru**: status real-time berapa guru yang sudah selesai input nilai PTS per mata pelajaran dan kelas.
  - **Rata-Rata Nilai per Mata Pelajaran**: capaian nilai sekolah dibandingkan dengan KKM (75.0).
  - **Peringkat Siswa Berprestasi**: daftar 5 siswa dengan rerata nilai tertinggi di sekolah.
  - **Early Warning System (Remedial)**: deteksi siswa dengan nilai di bawah KKM agar segera mendapat bimbingan tambahan.
- **Metrik & Analisis Perpustakaan**:
  - **Statistik Kunjungan**: jumlah pemindaian barcode siswa/guru harian dan bulanan.
  - **Sirkulasi Buku**: jumlah buku dipinjam aktif, eksemplar tersedia, dan peminjaman terlambat (*overdue*).
  - **Buku Terpopuler**: daftar 5 judul buku yang paling sering dipinjam siswa.
  - **Duta Literasi**: daftar siswa yang paling aktif membaca dan berkunjung ke perpustakaan.


### Urutan Startup Docker

Layanan `rapor-api` dan `perpus-api` bergantung pada `sso-api` (`depends_on: sso-api`).
Environment variable `SSO_API_URL: http://sso-api:8080` dikonfigurasi pada Docker Compose
sehingga backend e-Rapor dan Perpustakaan dapat langsung memanggil resolusi barcode SSO
melalui jaringan internal Docker `spenspra`.

### Panduan Operasional Barcode

#### 1. Menambah Siswa / Guru Baru
1. Buka portal SSO di `http://sso.localhost` dan login sebagai **Super Admin**.
2. Masuk ke menu **Master Data** (`/admin/master-data`).
3. Klik tombol **+ Tambah Person Baru**, pilih tipe (`SISWA`, `GURU`, `KEPALA_SEKOLAH`, `TENAGA_KEPENDIDIKAN`).
4. Isi data identitas (NISN untuk siswa, NIP untuk guru/staf).
5. Sistem SSO otomatis men-generate `barcode_token` unik berawalan `PRAMBON-`.
6. Cetak kartu fisik melalui tombol **Cetak QR / Barcode**.

#### 2. Rotasi dan Pencabutan Barcode (Revoke)
Jika kartu siswa hilang atau disalahgunakan:
1. Pada menu **Master Data** SSO, cari siswa bersangkutan.
2. Klik tombol **Cabut Barcode**.
3. Status barcode di SSO langsung berubah menjadi `REVOKED`.
4. **Efek Seketika Lintas Sistem**:
   - Pemindaian kartu di e-Rapor akan langsung **ditolak** ("kartu QR tidak valid, tidak aktif, atau sudah dicabut di SSO").
   - Pemindaian kartu di Perpustakaan (kunjungan & peminjaman buku) akan langsung **ditolak**.
   - Tidak ada lagi fallback ke ID lokal atau member_code lama untuk kartu SSO.

#### 3. Verifikasi Pengujian Lintas Sistem
Tersedia skrip verifikasi otomatis untuk memastikan integrasi SSO, e-Rapor, dan Perpustakaan:

Di Windows (PowerShell):
```powershell
.\scripts\verify_cross_system_barcode.ps1
```

Di Linux / Mac / WSL (Bash):
```bash
chmod +x ./scripts/verify_cross_system_barcode.sh
./scripts/verify_cross_system_barcode.sh
```

## Jika Docker mengalami error `EOF`

1. Tutup dan buka kembali Docker Desktop.
2. Pastikan `docker version` berhasil.
3. Jalankan build satu per satu dengan `COMPOSE_PARALLEL_LIMIT=1`.
4. Pastikan Docker Desktop memiliki RAM yang cukup.
5. Coba build tanpa cache hanya pada service yang bermasalah:

```powershell
docker compose --env-file .env.docker build --no-cache sso-api
```

Jangan langsung menghapus volume database ketika memperbaiki error build.
