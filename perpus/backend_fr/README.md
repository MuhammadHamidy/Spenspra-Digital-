# Sistem Absensi Pembelajaran Kelas — Face Recognition Backend REST API

Sistem backend REST API lengkap untuk presensi pembelajaran kelas berbasis pengenalan wajah (*face recognition*). Dikembangkan dengan arsitektur monorepo 2 microservice:
- **`api-service`**: Microservice Go (Fiber v2) untuk REST API publik, autentikasi JWT, manajemen pengguna/kelas/sesi, dan laporan.
- **`face-service`**: Microservice Python (FastAPI) internal untuk pengolahan sampel foto wajah (*dlib/face_recognition* atau *DeepFace*), deteksi liveness, dan komputasi *cosine distance*.

---

## 🚀 Cara Menjalankan dengan Docker Compose

Pastikan **Docker** dan **Docker Compose** telah terpasang di komputer Anda.

```bash
# 1. Clone repository & masuk ke folder project
cd proyek-FR

# 2. Jalankan seluruh service (PostgreSQL, face-service, api-service)
docker-compose up -d --build

# 3. Cek log status jalannya container
docker-compose logs -f
```

Setelah `docker-compose` berjalan:
- **`api-service` (Go Fiber)**: `http://localhost:3000/api/v1`
- **`face-service` (Python FastAPI)**: `http://localhost:8000`
- **PostgreSQL**: `localhost:5432` (`database: attendance_db`)

---

## 🔑 Default Admin Account (Seeded Automatically)

Saat pertama kali `api-service` dinyalakan, akun Administrator default otomatis dibuat:

- **Email**: `admin@sekolah.sch.id`
- **Password**: `admin123`
- **Role**: `admin`

---

## 📄 Impor Kontrak API ke Postman / Swagger UI

File kontrak OpenAPI 3.0.3 tersedia di:
```text
docs/openapi.yaml
```

### Cara Impor ke Postman:
1. Buka aplikasi **Postman**.
2. Klik tombol **Import** di pojok kiri atas.
3. Pilih file `docs/openapi.yaml` (atau drag & drop file tersebut).
4. Klik **Import**. Postman akan otomatis membuatkan Collection lengkap berisi seluruh endpoint API beserta contoh skema request/response-nya.

---

## 🌐 Daftar Environment Variables

| Variable | Service | Default | Deskripsi |
|---|---|---|---|
| `PORT` | `api-service` | `3000` | Port publik HTTP server Go Fiber |
| `ENV` | `api-service` | `development` | Environment mode (`development`/`production`) |
| `DB_HOST` | `api-service` | `postgres` | Host database PostgreSQL |
| `DB_PORT` | `api-service` | `5432` | Port database PostgreSQL |
| `DB_USER` | `api-service` | `postgres` | Username database PostgreSQL |
| `DB_PASSWORD` | `api-service` | `postgres123` | Password database PostgreSQL |
| `DB_NAME` | `api-service` | `attendance_db` | Nama database PostgreSQL |
| `JWT_SECRET` | `api-service` | `super-secret-key-32-bytes-length!` | Secret key penandatangan Access Token JWT (1 jam) |
| `JWT_REFRESH_SECRET` | `api-service` | `super-refresh-secret-key-32-bytes!` | Secret key penandatangan Refresh Token JWT (30 hari) |
| `FACE_SERVICE_URL` | `api-service` | `http://face-service:8000` | URL internal HTTP client ke `face-service` Python |
| `STORAGE_DRIVER` | `api-service` | `local` | Driver penyimpanan foto (`local` atau `s3`) |
| `FACE_ENGINE` | `face-service` | `face_recognition` | Engine AI pengenalan wajah (`face_recognition` / `deepface`) |
| `SIMILARITY_THRESHOLD` | `face-service` | `0.6` | Threshold maksimum cosine distance untuk match |

---

## 🧪 Menjalankan Unit Test

```bash
cd api-service
go test ./... -v
```

---

## 📁 Struktur Monorepo

```text
.
├── docker-compose.yml          # Orchestration PostgreSQL + api-service + face-service
├── docs/
│   ├── openapi.yaml            # Single Source of Truth API Contract
│   └── API_DOCUMENTATION.md    # Dokumen alur & skenario sistem
├── api-service/                # Go (Fiber v2) Public API Gateway & Business Logic
│   ├── cmd/api/main.go
│   ├── internal/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── faceprofile/
│   │   ├── classes/
│   │   ├── schedules/
│   │   ├── sessions/
│   │   ├── attendance/
│   │   ├── reports/
│   │   ├── faceclient/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── response/
│   │   └── storage/
│   ├── migrations/
│   ├── Dockerfile
│   └── go.mod
├── face-service/               # Python (FastAPI) Internal AI Compute Microservice
│   ├── app/
│   │   ├── main.py
│   │   ├── engine.py
│   │   ├── liveness.py
│   │   └── schemas.py
│   ├── requirements.txt
│   └── Dockerfile
└── README.md
```
