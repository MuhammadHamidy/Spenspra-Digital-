# Panduan Lengkap Deploy Spenspra ke VPS Hostinger + Cloudflare

Panduan ini mendokumentasikan langkah demi langkah deployment sistem Spenspra (SSO, e-Rapor, dan Perpustakaan) ke **VPS Hostinger (KVM 2 / RAM 4 GB atau lebih)** menggunakan **Docker Compose** dan **Cloudflare** (SSL Otomatis & CDN).

---

## Ringkasan Arsitektur Deployment

- **Server VPS**: Hostinger KVM VPS (OS: Ubuntu 22.04 / 24.04 LTS).
- **DNS & SSL**: Cloudflare Proxy (🟠 Proxied) menangani sertifikat SSL/TLS (HTTPS) secara otomatis.
- **Port Nginx**: Port 80 VPS menerima trafik HTTP aman yang di-reverse proxy dari Cloudflare.
- **Microservices**:
  - `spenspra-postgres`: Database terpadu (`presdig_sso`, `presdig_rapor`, `perpusdig`).
  - `spenspra-redis`: Token session & in-memory cache.
  - `sso-api`, `rapor-api`, `perpus-api`: Backend API berbasis Go Fiber.
  - `sso-frontend`, `rapor-frontend`, `perpus-frontend`: Frontend Next.js Standalone.
  - `spenspra-nginx`: API gateway & routing subdomain internal Docker.

---

## Langkah 1: Konfigurasi DNS & SSL di Cloudflare

Sebelum masuk ke VPS, siapkan domain di dashboard Cloudflare:

1. Buka dashboard [Cloudflare](https://dash.cloudflare.com/) dan pilih domain Anda (misal: `domainsekolah.sch.id`).
2. Masuk ke menu **DNS** -> **Records**, lalu tambahkan 3 DNS A Record berikut:
   | Type | Name | IPv4 address | Proxy status | TTL |
   | :--- | :--- | :--- | :--- | :--- |
   | **A** | `sso` | `<IP_VPS_HOSTINGER>` | 🟠 **Proxied** | Auto |
   | **A** | `rapor` | `<IP_VPS_HOSTINGER>` | 🟠 **Proxied** | Auto |
   | **A** | `perpus` | `<IP_VPS_HOSTINGER>` | 🟠 **Proxied** | Auto |
3. Masuk ke menu **SSL/TLS** -> **Overview**:
   - Pilih mode enkripsi: **Full** (atau **Flexible**).
4. Masuk ke menu **SSL/TLS** -> **Edge Certificates**:
   - Aktifkan opsi **Always Use HTTPS** (On).
   - Aktifkan **Automatic HTTPS Rewrites** (On).

> **Hasil:** Seluruh trafik publik akan otomatis menggunakan protokol HTTPS aman (`https://sso.domainsekolah.sch.id`, `https://rapor...`, `https://perpus...`).

---

## Langkah 2: Persiapan dan Hardening VPS Hostinger

Buka terminal di komputer Anda (PowerShell / Command Prompt / Terminal), lalu hubungkan ke VPS via SSH:

```bash
ssh root@<IP_VPS_HOSTINGER>
```

### 1. Update Paket Sistem
```bash
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban
```

### 2. Setup SWAP Memory (4 GB)
Next.js melakukan kompilasi bundel production saat proses build. Meskipun VPS memiliki RAM 4 GB, penambahan 4 GB Swap mencegah server kehabisan memori (*Out Of Memory / OOM*):

```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Verifikasi dengan:
```bash
free -h
```

### 3. Install Docker Engine & Docker Compose
Jalankan skrip instalasi resmi Docker:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable --now docker
```

Verifikasi instalasi:
```bash
docker --version
docker compose version
```

### 4. Konfigurasi Firewall UFW
Buka hanya port SSH dan HTTP (karena SSL ditangani Cloudflare via port 80):

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

---

## Langkah 3: Unduh Repositori & Konfigurasi Lingkungan

Masuk ke direktori `/opt` dan lakukan clone repositori:

```bash
cd /opt
git clone https://github.com/MuhammadHamidy/Spenspra-Digital-.git spenspra
cd /opt/spenspra
```

### 1. Buat File Konfigurasi `.env.docker`
Salin template konfigurasi:

```bash
cp .env.docker.example .env.docker
nano .env.docker
```

Sesuaikan nilai-nilai berikut pada file `.env.docker`:

```ini
# Ganti dengan username & password database yang kuat
DB_USER=spenspra_admin
DB_PASSWORD=KombinasiPasswordKuat123!
SSO_DB_NAME=presdig_sso
RAPOR_DB_NAME=presdig_rapor
PERPUS_DB_NAME=perpusdig

# Kunci acak minimal 32 karakter untuk sesi enkripsi Next.js
JWT_SECRET=SpenspraSecureJwtSecretProductionKey2026Min32Chars!

# Port Nginx (Tetap 80 untuk menerima proxy Cloudflare)
NGINX_PORT_BINDING=80

# URL Domain Publik (Ganti "domainsekolah.sch.id" dengan domain asli Anda)
SSO_PUBLIC_API_URL=https://sso.domainsekolah.sch.id/api
RAPOR_PUBLIC_API_URL=https://rapor.domainsekolah.sch.id/api
PERPUS_PUBLIC_API_URL=https://perpus.domainsekolah.sch.id/api
APP_PORTAL_URL=https://sso.domainsekolah.sch.id/login
SSO_LOGIN_URL=https://sso.domainsekolah.sch.id/login

# Konfigurasi SMTP Gmail (Gunakan App Password 16 huruf)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=email.sekolah@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
SMTP_FROM=email.sekolah@gmail.com
SMTP_SENDER_NAME="SMPN 1 Prambon - Presensi Digital"
```

Simpan file dengan menekan `Ctrl + O`, lalu `Enter`, dan keluar dengan `Ctrl + X`.

### 2. Periksa Kunci RSA SSO (JWT RS256)
Pastikan berkas kunci RSA tersedia:

```bash
ls -la shared/keys/
```

Harus terdapat berkas:
- `jwt_private.pem`
- `jwt_public.pem`

*(Jika belum ada, jalankan `node scripts/generate-rsa-keys.mjs`)*.

---

## Langkah 4: Build dan Jalankan Aplikasi

### 1. Build Image Secara Bertahap (Hemat Resource)
Gunakan batasan paralel `1` agar build stabil:

```bash
export COMPOSE_PARALLEL_LIMIT=1

docker compose --env-file .env.docker build sso-api
docker compose --env-file .env.docker build rapor-api
docker compose --env-file .env.docker build perpus-api
docker compose --env-file .env.docker build sso-frontend
docker compose --env-file .env.docker build rapor-frontend
docker compose --env-file .env.docker build perpus-frontend
```

### 2. Jalankan Seluruh Stack di Background
```bash
docker compose --env-file .env.docker up -d
```

Docker Compose akan otomatis menjalankan:
1. PostgreSQL & Redis
2. Migrasi skema database (SSO, e-Rapor, Perpus)
3. Seeder data awal & akun Super Admin
4. 3 Service Backend API Go
5. 3 Service Frontend Next.js Standalone
6. Gateway Nginx

### 3. Periksa Status Container
```bash
docker compose --env-file .env.docker ps
```

Container berikut harus berstatus `Up`:
- `spenspra-postgres`
- `spenspra-redis`
- `spenspra-sso-api`
- `spenspra-rapor-api`
- `spenspra-perpus-api`
- `spenspra-sso-frontend`
- `spenspra-rapor-frontend`
- `spenspra-perpus-frontend`
- `spenspra-nginx`

*(Container `*-migrate` dan `*-seeder` berstatus `Exited (0)` setelah selesai, kondisi tersebut normal).*

---

## Langkah 5: Pengujian Akses

Buka browser dan uji ketiga URL aplikasi:

1. **Portal SSO**:  
   `https://sso.domainsekolah.sch.id`  
   - Akun Super Admin:  
     - Username: `superadmin.prambon`  
     - Password: `SsoPrambon!2026#Admin`  
   - Akun Kepala Sekolah (Dashboard Eksekutif):  
     - Username: `kepsek.prambon`  
     - Password: `KepsekPrambon!2026#Admin`

2. **Aplikasi e-Rapor Digital**:  
   `https://rapor.domainsekolah.sch.id`  
   - Akun Admin:  
     - Username: `admin.rapor.prambon`  
     - Password: `RaporPrambon!2026#Admin`

3. **Aplikasi Perpustakaan Digital**:  
   `https://perpus.domainsekolah.sch.id`  
   - Akun Admin:  
     - Username: `admin.perpus.prambon`  
     - Password: `PerpusPrambon!2026#Admin`

---

## Perintah Operasional & Maintenance

### Melihat Log Realtime
```bash
# Semua service
docker compose --env-file .env.docker logs -f

# Khusus SSO API & Frontend
docker compose --env-file .env.docker logs -f sso-api sso-frontend

# Khusus Nginx Gateway
docker compose --env-file .env.docker logs -f nginx
```

### Restart Service
```bash
docker compose --env-file .env.docker restart nginx
```

### Update Kode Aplikasi (Deployment Selanjutnya)
Jika ada pembaruan kode dari GitHub:

```bash
cd /opt/spenspra
git pull origin main
export COMPOSE_PARALLEL_LIMIT=1
docker compose --env-file .env.docker up -d --build
```

### Backup Database Rutin
Untuk melakukan backup manual database:

```bash
mkdir -p /opt/spenspra/backups
docker exec spenspra-postgres pg_dumpall -U spenspra_admin | gzip > /opt/spenspra/backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

---

## Troubleshooting

| Gejala | Penyebab | Solusi |
| :--- | :--- | :--- |
| **Error 502 Bad Gateway** | Nginx menyimpan IP internal lama setelah container di-recreate | Jalankan `docker compose --env-file .env.docker restart nginx` |
| **Error 521 / 522 di Cloudflare** | Port 80 terblokir di UFW atau Nginx belum aktif | Jalankan `ufw allow 80/tcp` dan periksa `docker compose ps` |
| **Cookie SSO logout sendiri** | Domain salah ketik di `.env.docker` | Pastikan URL di `.env.docker` sama persis dengan nama domain yang diakses |
| **Build Next.js terhenti / SIGKILL** | Kehabisan RAM saat kompilasi | Pastikan swap 4 GB sudah aktif (`free -h`) dan gunakan `COMPOSE_PARALLEL_LIMIT=1` |
