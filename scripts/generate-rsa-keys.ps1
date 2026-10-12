# ==============================================================================
# GENERATE RSA 2048-BIT KEY PAIR FOR SPENSPRA SSO (RS256)
# ==============================================================================
$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $PSScriptRoot
$keysDir = Join-Path $rootDir "shared\keys"

if (-not (Test-Path $keysDir)) {
    New-Item -ItemType Directory -Path $keysDir -Force | Out-Null
}

$privateKeyPath = Join-Path $keysDir "jwt_private.pem"
$publicKeyPath  = Join-Path $keysDir "jwt_public.pem"

Write-Host "Menghasilkan pasangan kunci RSA 2048-bit (RS256)..." -ForegroundColor Cyan

$success = $false

# 1. Coba menggunakan gen_keys.bat (Go dengan local cache)
$batScript = Join-Path $PSScriptRoot "gen_keys.bat"
if (Test-Path $batScript) {
    try {
        & cmd.exe /c $batScript
        if ($LASTEXITCODE -eq 0 -and (Test-Path $privateKeyPath) -and (Test-Path $publicKeyPath)) {
            $success = $true
        }
    } catch {
        # Lanjut ke metode berikutnya
    }
}

# 2. Coba menggunakan Node.js jika tersedia
if (-not $success) {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        try {
            $mjsScript = Join-Path $PSScriptRoot "generate-rsa-keys.mjs"
            if (Test-Path $mjsScript) {
                & node $mjsScript
                if ($LASTEXITCODE -eq 0 -and (Test-Path $privateKeyPath) -and (Test-Path $publicKeyPath)) {
                    $success = $true
                }
            }
        } catch {
            # Lanjut ke metode berikutnya
        }
    }
}

# 3. Coba menggunakan .NET Core Cryptography (jika PowerShell 7+)
if (-not $success) {
    try {
        $rsa = [System.Security.Cryptography.RSA]::Create(2048)
        $privBytes = $rsa.ExportPkcs8PrivateKey()
        $privB64 = [System.Convert]::ToBase64String($privBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
        $privPem = "-----BEGIN PRIVATE KEY-----`n" + $privB64 + "`n-----END PRIVATE KEY-----`n"
        [System.IO.File]::WriteAllText($privateKeyPath, $privPem, [System.Text.Encoding]::UTF8)

        $pubBytes = $rsa.ExportSubjectPublicKeyInfo()
        $pubB64 = [System.Convert]::ToBase64String($pubBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
        $pubPem = "-----BEGIN PUBLIC KEY-----`n" + $pubB64 + "`n-----END PUBLIC KEY-----`n"
        [System.IO.File]::WriteAllText($publicKeyPath, $pubPem, [System.Text.Encoding]::UTF8)

        $success = $true
    } catch {
        Write-Warning "Metode .NET bawaan tidak didukung pada versi Windows PowerShell ini: $_"
    }
}

if ($success) {
    Write-Host "Kunci RSA 2048-bit berhasil diverifikasi & disimpan:" -ForegroundColor Green
    Write-Host " - Private Key: $privateKeyPath" -ForegroundColor Green
    Write-Host " - Public Key : $publicKeyPath" -ForegroundColor Green
} else {
    Write-Error "Gagal menghasilkan kunci RSA. Pastikan Node.js atau Go terpasang pada sistem."
}

