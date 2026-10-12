# ==============================================================================
# SPENSPRA MONOREPO ASSET SYNC SCRIPT (PowerShell)
# ==============================================================================
# Single Source of Truth: shared/assets/
# Logo Resmi SMPN 1 Prambon: rapor/frontend_fr/public/image/new_logo_prambon.png
# ==============================================================================

param(
    [switch]$CleanOnly = $false,
    [switch]$VerboseOutput = $false
)

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $PSScriptRoot

$sharedAssetsDir = Join-Path $rootDir "shared\assets"
$sharedImageDir  = Join-Path $sharedAssetsDir "image"
$sharedIconDir   = Join-Path $sharedAssetsDir "icon"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SPENSPRA MONOREPO - ASSET OPTIMIZER & SYNC" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Pastikan folder shared/assets tersedia
if (-not (Test-Path $sharedImageDir)) { New-Item -ItemType Directory -Path $sharedImageDir -Force | Out-Null }
if (-not (Test-Path $sharedIconDir))  { New-Item -ItemType Directory -Path $sharedIconDir -Force | Out-Null }

# 2. LOGO RESMI SMPN 1 PRAMBON (Sumber Kebenaran Tunggal yang Ditentukan Pengguna)
$officialLogoSource = Join-Path $rootDir "rapor\frontend_fr\public\image\new_logo_prambon.png"
if (-not (Test-Path $officialLogoSource)) {
    # Fallback jika sudah dipindah
    $officialLogoSource = Join-Path $sharedImageDir "new_logo_prambon.png"
}

if (Test-Path $officialLogoSource) {
    Copy-Item $officialLogoSource (Join-Path $sharedImageDir "new_logo_prambon.png") -Force
    Copy-Item $officialLogoSource (Join-Path $sharedImageDir "logo-prambon.png") -Force
    Copy-Item $officialLogoSource (Join-Path $sharedImageDir "logo_prambon.png") -Force
    Write-Host "[+] Master logo resmi SMPN 1 Prambon diset ke shared/assets/image" -ForegroundColor Green
} else {
    Write-Host "[!] Peringatan: File logo resmi tidak ditemukan di $officialLogoSource" -ForegroundColor Red
}

# 3. KOP & WATERMARK RESMI KE shared/assets/image
$raporKop = Join-Path $rootDir "rapor\frontend_fr\public\image\kop-prambon.png"
if (-not (Test-Path $raporKop)) { $raporKop = Join-Path $sharedImageDir "kop-prambon.png" }
if (Test-Path $raporKop) {
    Copy-Item $raporKop (Join-Path $sharedImageDir "kop-prambon.png") -Force
    Write-Host "[+] Master kop surat tersimpan di shared/assets/image" -ForegroundColor Green
}

$raporWatermark = Join-Path $rootDir "rapor\frontend_fr\public\image\watermark-prambon.png"
if (-not (Test-Path $raporWatermark)) { $raporWatermark = Join-Path $sharedImageDir "watermark-prambon.png" }
if (Test-Path $raporWatermark) {
    Copy-Item $raporWatermark (Join-Path $sharedImageDir "watermark-prambon.png") -Force
    Write-Host "[+] Master watermark tersimpan di shared/assets/image" -ForegroundColor Green
}

$raporWatermarkJpg = Join-Path $rootDir "rapor\frontend_fr\public\image\watermark-prambon.jpg"
if (-not (Test-Path $raporWatermarkJpg)) { $raporWatermarkJpg = Join-Path $sharedImageDir "watermark-prambon.jpg" }
if (Test-Path $raporWatermarkJpg) {
    Copy-Item $raporWatermarkJpg (Join-Path $sharedImageDir "watermark-prambon.jpg") -Force
}

# 4. DAFTAR FRONTEND
$frontends = @(
    (Join-Path $rootDir "sso\frontend_fr"),
    (Join-Path $rootDir "rapor\frontend_fr"),
    (Join-Path $rootDir "perpus\frontend_fr")
)

# 5. PEMBERSIHAN FILE & FOLDER REDUNDAN
$junkFiles = @(
    "alpukat.png", "domba.png", "catat_*.png", "kelengkeng.png",
    "logo_farmease.png", "operator.png", "sheep_*.png", "ternak_*.png",
    "kandang.png", "rumput.png", "lahan.png", "hay.png", "daily-routine.png",
    "bibit.png", "barrel.png", "rutin_task.png", "rincian_kebun.png",
    "book_success.jpg", "library_hall.jpg", "scanner_viewport.jpg",
    "next.svg", "vercel.svg", "globe.svg", "window.svg", "file.svg",
    "logo.svg"
)

foreach ($fe in $frontends) {
    if (-not (Test-Path $fe)) { continue }
    $feName = Split-Path $fe -Leaf
    $pubDir = Join-Path $fe "public"

    Write-Host "`n[*] Membersihkan frontend: $feName" -ForegroundColor Yellow

    # Hapus root new_logo_prambon.png jika ada (karena sudah di dalam image/)
    $rootLogo = Join-Path $pubDir "new_logo_prambon.png"
    if (Test-Path $rootLogo) {
        Remove-Item $rootLogo -Force
        Write-Host "    [-] Menghapus root new_logo_prambon.png redundan" -ForegroundColor Cyan
    }

    # Hapus folder images/ (plural) redundan
    $pluralImages = Join-Path $pubDir "images"
    if (Test-Path $pluralImages) {
        Remove-Item $pluralImages -Recurse -Force
        Write-Host "    [-] Menghapus folder images/ redundan" -ForegroundColor Cyan
    }

    # Hapus folder icon/ (karena dilayani terpusat oleh Nginx dari shared/assets/icon)
    $feIconDir = Join-Path $pubDir "icon"
    if (Test-Path $feIconDir) {
        Remove-Item $feIconDir -Recurse -Force
        Write-Host "    [-] Menghapus folder public/icon redundan" -ForegroundColor Cyan
    }

    # Hapus folder placeholder raksasa (~35MB) jika masih ada
    $placeholderDir = Join-Path $pubDir "image\placeholder"
    if (Test-Path $placeholderDir) {
        Remove-Item $placeholderDir -Recurse -Force
        Write-Host "    [-] Menghapus folder placeholder raksasa" -ForegroundColor Cyan
    }

    # Hapus folder junk icons e-commerce di dalam image/
    $ecomIcons = Join-Path $pubDir "image\icons"
    if (Test-Path $ecomIcons) {
        Remove-Item $ecomIcons -Recurse -Force
        Write-Host "    [-] Menghapus folder image/icons e-commerce tidak terpakai" -ForegroundColor Cyan
    }

    # Hapus file junk lainnya
    foreach ($pat in $junkFiles) {
        Get-ChildItem -Path $pubDir -Filter $pat -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
            Remove-Item $_.FullName -Force
        }
    }

    # Pastikan subfolder image/ bersih tersedia untuk runtime lokal
    $feImageDir = Join-Path $pubDir "image"
    if (-not (Test-Path $feImageDir)) { New-Item -ItemType Directory -Path $feImageDir -Force | Out-Null }

    if (-not $CleanOnly) {
        # Sinkronkan logo resmi & aset ke image/
        Get-ChildItem -File $sharedImageDir | ForEach-Object {
            Copy-Item $_.FullName (Join-Path $feImageDir $_.Name) -Force
        }
        Write-Host "    [OK] Logo resmi & aset tersinkronisasi ke $feName/public/image" -ForegroundColor Green
    }
}

Write-Host ''
Write-Host '==========================================================' -ForegroundColor Green
Write-Host '  OPTIMASI ASET MONOREPO & SINKRONISASI SELESAI!' -ForegroundColor Green
Write-Host '==========================================================' -ForegroundColor Green
