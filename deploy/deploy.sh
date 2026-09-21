#!/usr/bin/env bash
# ==========================================================================
#  Script deploy Sistem Presensi Digital di VPS (Ubuntu / Debian)
#
#  Pemakaian (dari folder project di VPS):
#      bash deploy/deploy.sh
#
#  Variabel opsional:
#      APP_DIR=/var/www/presensi BRANCH=main bash deploy/deploy.sh
# ==========================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/presensi}"
APP_NAME="${APP_NAME:-presensi-digital}"
BRANCH="${BRANCH:-main}"
HEALTH_URL="http://127.0.0.1:3000/api/health"

cd "$APP_DIR"

echo "======================================================="
echo " Deploy Presensi Digital — $(date '+%Y-%m-%d %H:%M:%S')"
echo " Folder : $APP_DIR"
echo " Branch : $BRANCH"
echo "======================================================="

# ---------- 0. Prasyarat ----------
if [ ! -f .env ]; then
  echo "❌ File .env belum ada di $APP_DIR"
  echo "   Jalankan: cp .env.example .env  lalu isi DATABASE_URL, JWT_SECRET,"
  echo "   dan NEXT_PUBLIC_APP_URL sebelum deploy."
  exit 1
fi

if [ ! -d .git ]; then
  echo "❌ Folder ini bukan git repository. Clone dulu:"
  echo "   git clone <URL_REPO> $APP_DIR"
  exit 1
fi

command -v node >/dev/null 2>&1 || { echo "❌ Node.js belum terinstall."; exit 1; }
echo "ℹ️  Node.js: $(node -v)"

# ---------- 1. Ambil kode terbaru ----------
echo ""
echo "==> [1/6] Mengambil kode terbaru dari git"
git fetch --all --prune
if git rev-parse --verify --quiet "origin/$BRANCH" >/dev/null; then
  git checkout "$BRANCH" 2>/dev/null || git checkout -B "$BRANCH" "origin/$BRANCH"
  git pull --ff-only origin "$BRANCH"
else
  echo "⚠️  Branch origin/$BRANCH tidak ditemukan, lanjut dengan kode yang ada."
fi

# ---------- 2. Dependensi ----------
echo ""
echo "==> [2/6] Install dependensi"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# ---------- 3. Prisma Client ----------
echo ""
echo "==> [3/6] Generate Prisma Client"
npx prisma generate

# ---------- 4. Sinkronisasi skema database ----------
echo ""
echo "==> [4/6] Sinkronisasi skema database (prisma db push)"
npx prisma db push

# ---------- 5. Build produksi ----------
echo ""
echo "==> [5/6] Build produksi (NODE_ENV=production)"
NODE_ENV=production npm run build

# ---------- 6. Restart aplikasi ----------
echo ""
echo "==> [6/6] Restart aplikasi via PM2"
mkdir -p logs

if ! command -v pm2 >/dev/null 2>&1; then
  echo "❌ PM2 belum terinstall. Jalankan: sudo npm install -g pm2"
  exit 1
fi

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env
else
  pm2 start ecosystem.config.js
fi
pm2 save

# ---------- Verifikasi ----------
echo ""
echo "==> Verifikasi health check: $HEALTH_URL"
for i in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    echo ""
    echo "✅ Deploy berhasil! Aplikasi sehat dan berjalan."
    curl -fsS "$HEALTH_URL"; echo ""
    exit 0
  fi
  sleep 2
done

echo ""
echo "❌ Aplikasi belum merespons health check."
echo "   Periksa log dengan: pm2 logs $APP_NAME --lines 100"
exit 1
