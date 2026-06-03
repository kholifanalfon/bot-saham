#!/bin/bash

# ============================================================
# deploy.sh - Script deployment Bot Saham (tanpa Docker)
# Membaca konfigurasi dari file .env di root project
# ============================================================

set -e  # Hentikan jika ada error

# Warna output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Load .env ───────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  log_error "File .env tidak ditemukan! Salin dari .env.example terlebih dahulu:\n  cp .env.example .env"
fi

# Export semua variabel dari .env (abaikan komentar & baris kosong)
set -o allexport
source "$ENV_FILE"
set +o allexport

log_info "Konfigurasi berhasil dibaca dari .env"

# ─── Validasi Variabel Wajib ──────────────────────────────────
: "${DEPLOY_PATH:?Variabel DEPLOY_PATH belum diset di .env}"
: "${PORT:=3001}"

log_info "Target deploy client : $DEPLOY_PATH"
log_info "Server akan berjalan di port : $PORT"

# ─── Build Server ─────────────────────────────────────────────
log_info "Building server (TypeScript)..."
cd "$SCRIPT_DIR/server"
# Install semua deps termasuk devDeps (butuh typescript/tsc untuk build)
npm install
npm run build
# Hapus devDeps setelah build selesai (hemat storage di production)
npm prune --omit=dev
log_success "Server berhasil di-build → server/dist/"

# ─── Migrasi & Seed Database ──────────────────────────────────
if [ "${RUN_MIGRATE:-true}" = "true" ]; then
  log_info "Menjalankan migrasi database..."
  node dist/db/migrate.js -- refresh && log_success "Migrasi selesai"
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  log_warn "Menjalankan seed database... (hanya untuk setup awal)"
  node dist/db/seed.js && log_success "Seed selesai"
fi

# ─── Build Client ─────────────────────────────────────────────
log_info "Building client (React + Vite)..."
cd "$SCRIPT_DIR/client"
npm install
VITE_BASE_PATH="./" npm run build
log_success "Client berhasil di-build → client/dist/"

# ─── Deploy Client ke DEPLOY_PATH ────────────────────────────────────────
log_info "Menyalin hasil build ke $DEPLOY_PATH..."
mkdir -p "$DEPLOY_PATH" || {
  log_warn "Tidak bisa membuat direktori '$DEPLOY_PATH'."
  log_warn "Jika path di /var/www/, jalankan langsung: sudo bash deploy.sh"
  log_error "Gagal membuat direktori tujuan deploy."
}
cp -r "$SCRIPT_DIR/client/dist/." "$DEPLOY_PATH/"
log_success "Client berhasil di-deploy ke $DEPLOY_PATH"

# ─── Restart Server dengan PM2 ────────────────────────────────
cd "$SCRIPT_DIR/server"

if command -v pm2 &> /dev/null; then
  if pm2 describe bot-saham-server &> /dev/null; then
    log_info "Merestart server PM2..."
    pm2 restart bot-saham-server || {
      log_warn "Gagal merestart, menghapus konfigurasi lama dan mendaftarkan ulang ke PM2..."
      pm2 delete bot-saham-server
      pm2 start dist/index.js --name "bot-saham-server"
      pm2 save
    }
  else
    log_info "Memulai server PM2 untuk pertama kali..."
    pm2 start dist/index.js --name "bot-saham-server"
    pm2 save
  fi
  log_success "Server berjalan via PM2"
else
  log_warn "PM2 tidak ditemukan. Install dengan: npm install -g pm2"
  log_warn "Jalankan manual: cd server && node dist/index.js"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Deployment selesai!${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "  Web App  : ${BLUE}${CLIENT_URL:-http://localhost}${NC}"
echo -e "  API      : ${BLUE}http://localhost:${PORT}${NC}"
echo -e "  PM2 logs : ${YELLOW}pm2 logs bot-saham-server${NC}"
echo ""
