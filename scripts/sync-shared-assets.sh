#!/bin/bash
# ==============================================================================
# SPENSPRA MONOREPO ASSET SYNC SCRIPT (Bash for Linux / Docker / CI/CD)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

SHARED_ASSETS_DIR="$ROOT_DIR/shared/assets"
SHARED_IMAGE_DIR="$SHARED_ASSETS_DIR/image"
SHARED_ICON_DIR="$SHARED_ASSETS_DIR/icon"

echo "=== SPENSPRA MONOREPO - ASSET OPTIMIZER & SYNC ==="
mkdir -p "$SHARED_IMAGE_DIR" "$SHARED_ICON_DIR"

# 1. Update logo resmi SMPN 1 Prambon
OFFICIAL_LOGO="$ROOT_DIR/rapor/frontend_fr/public/image/new_logo_prambon.png"
if [ ! -f "$OFFICIAL_LOGO" ]; then
    OFFICIAL_LOGO="$SHARED_IMAGE_DIR/new_logo_prambon.png"
fi

if [ -f "$OFFICIAL_LOGO" ]; then
    cp -f "$OFFICIAL_LOGO" "$SHARED_IMAGE_DIR/new_logo_prambon.png"
    cp -f "$OFFICIAL_LOGO" "$SHARED_IMAGE_DIR/logo-prambon.png"
    cp -f "$OFFICIAL_LOGO" "$SHARED_IMAGE_DIR/logo_prambon.png"
    echo "[+] Official logo set in shared/assets/image"
fi

FRONTENDS=(
    "$ROOT_DIR/sso/frontend_fr"
    "$ROOT_DIR/rapor/frontend_fr"
    "$ROOT_DIR/perpus/frontend_fr"
)

JUNK_FILES=(
    "alpukat.png" "domba.png" "catat_*.png" "kelengkeng.png"
    "logo_farmease.png" "operator.png" "sheep_*.png" "ternak_*.png"
    "kandang.png" "rumput.png" "lahan.png" "hay.png" "daily-routine.png"
    "bibit.png" "barrel.png" "rutin_task.png" "rincian_kebun.png"
    "book_success.jpg" "library_hall.jpg" "scanner_viewport.jpg"
    "next.svg" "vercel.svg" "globe.svg" "window.svg" "file.svg"
    "logo.svg"
)

for FE in "${FRONTENDS[@]}"; do
    if [ -d "$FE" ]; then
        PUB_DIR="$FE/public"
        echo "[*] Cleaning and syncing $FE"
        rm -f "$PUB_DIR/new_logo_prambon.png" || true
        rm -rf "$PUB_DIR/images" || true
        rm -rf "$PUB_DIR/icon" || true
        rm -rf "$PUB_DIR/image/icons" || true
        rm -rf "$PUB_DIR/image/placeholder" || true
        for PAT in "${JUNK_FILES[@]}"; do
            find "$PUB_DIR" -name "$PAT" -type f -delete 2>/dev/null || true
        done
        mkdir -p "$PUB_DIR/image"
        if [ -d "$SHARED_IMAGE_DIR" ]; then
            cp -rf "$SHARED_IMAGE_DIR"/* "$PUB_DIR/image/" 2>/dev/null || true
        fi
        echo "    [OK] Synced official assets to $FE/public/image"
    fi
done

echo "=== ASSET SYNC COMPLETED SUCCESSFULLY ==="
