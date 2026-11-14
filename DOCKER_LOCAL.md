# Menjalankan Spenspra dengan Docker di Local

## Prasyarat

- Docker Desktop sudah berjalan.
- Minimal 8 GB RAM dialokasikan ke Docker Desktop.
- Port `3000`, `3001`, `3002`, `3004`, `8080`, `8082`, `8083`, dan `8084` tidak sedang digunakan.

## Persiapan

PowerShell:

```powershell
Copy-Item .env.docker.local.example .env.docker.local
```

`.env.docker.local` hanya untuk komputer lokal dan tidak boleh di-commit.

> Penting: `DB_USER` dan `DB_PASSWORD` hanya dibaca PostgreSQL saat volume
> database dibuat pertama kali. Jika sebelumnya pernah menjalankan Compose
> dengan kredensial berbeda, volume lama dapat menyebabkan error
> `role "spenspra_local" does not exist`.

## Menjalankan seluruh aplikasi

```powershell
docker compose --env-file .env.docker.local -f docker-compose.yml -f docker-compose.local.yml up --build
```

Tunggu sampai migration selesai. Container migration yang berstatus `Exited (0)` adalah normal.

## URL local

| Aplikasi | URL |
|---|---|
| SSO | http://localhost:3000 |
| e-Rapor | http://localhost:3001 |
| e-Perpus | http://localhost:3002 |
| Spenspra Belajar / CBT | http://localhost:3004 |

API:

| Service | URL |
|---|---|
| SSO API | http://localhost:8080 |
| e-Rapor API | http://localhost:8082 |
| e-Perpus API | http://localhost:8083 |
| Spenspra Belajar API | http://localhost:8084 |

## Perintah operasional

```powershell
# Menjalankan di background
docker compose --env-file .env.docker.local -f docker-compose.yml -f docker-compose.local.yml up -d

# Melihat status
docker compose --env-file .env.docker.local -f docker-compose.yml -f docker-compose.local.yml ps

# Melihat log service tertentu
docker compose --env-file .env.docker.local -f docker-compose.yml -f docker-compose.local.yml logs -f sso-api

# Menghentikan container tanpa menghapus database
docker compose --env-file .env.docker.local -f docker-compose.yml -f docker-compose.local.yml down

# Menghentikan dan menghapus data database local
docker compose --env-file .env.docker.local -f docker-compose.yml -f docker-compose.local.yml down -v
```

### Akun administrator local

Jalankan seeder administrator local dengan profile `seed`:

```powershell
docker compose --env-file .env.docker.local -f docker-compose.yml -f docker-compose.local.yml --profile seed up sso-local-admin-seeder
```

| Aplikasi | Username | Password |
|---|---|---|
| e-Perpus | `admin.perpus.local` | `LocalPerpus2026!` |
| e-Learning | `admin.elearning.local` | `LocalElearning2026!` |
| e-Rapor | `admin.rapor.local` | `LocalRapor2026!` |

Akun dan password tersebut hanya untuk Docker local. Jangan gunakan pada
staging atau production.

### Memperbaiki error autentikasi PostgreSQL local

Jika log menampilkan `password authentication failed` atau
`role "spenspra_local" does not exist`, lakukan reset database local berikut.
Perintah ini menghapus data database local, tetapi tidak menghapus source code:

```powershell
docker compose --env-file .env.docker.local -f docker-compose.yml -f docker-compose.local.yml down -v
docker compose --env-file .env.docker.local -f docker-compose.yml -f docker-compose.local.yml up -d
docker compose --env-file .env.docker.local -f docker-compose.yml -f docker-compose.local.yml ps
```

Jangan gunakan `down -v` pada server atau environment yang berisi data penting.
Jika data local perlu dipertahankan, gunakan kembali nilai `DB_USER` dan
`DB_PASSWORD` yang dipakai saat volume PostgreSQL tersebut pertama kali dibuat,
atau buat backup database sebelum reset.

Jika `elearning-db-init` atau container migration sudah terlanjur `Exited`
karena database masih `starting up`, jalankan ulang Compose tanpa menghapus
volume:

```powershell
docker compose --env-file .env.docker.local -f docker-compose.yml -f docker-compose.local.yml up -d
```

## Mode gateway opsional

Compose produksi tetap memakai Nginx. Jika ingin menguji gateway dengan domain `*.localhost`, jalankan:

```powershell
docker compose --env-file .env.docker.local -f docker-compose.yml -f docker-compose.local.yml --profile gateway up --build
```

Mode utama tetap direkomendasikan karena akses langsung melalui `localhost:<port>` tidak memerlukan perubahan file `hosts` atau sertifikat SSL.

## Deployment

Untuk server, jangan gunakan file local ini. Salin `.env.docker.example` menjadi `.env.docker`, isi secret production, lalu jalankan:

```bash
docker compose --env-file .env.docker up -d --build
```
