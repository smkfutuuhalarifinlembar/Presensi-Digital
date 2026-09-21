#!/usr/bin/env bash
# ============================================================================
#  INSTALLER OTOMATIS — Sistem Presensi Digital Sekolah
#  Dijalankan DI DALAM VPS (sekali jalan, sudah termasuk seluruh konfigurasi).
#
#  Pakai:
#    bash deploy/install-vps.sh --domain=presensi.sekolah.sch.id --email=admin@sekolah.sch.id
#
#  Opsi:
#    --domain=<domain|IP>     Domain/IP publik untuk diakses (wajib)
#    --email=<email>          Email untuk pendaftaran SSL Let's Encrypt
#    --migrate                Migrasikan data dari prisma/dev.db (SQLite lama)
#    --no-ssl                 Lewati pemasangan HTTPS otomatis
#    --app-dir=<path>         Lokasi project (default /var/www/presensi)
#    --db-name=<nama>         Nama database (default presensi_sekolah)
#    --db-user=<nama>         User database (default presensi_user)
#    --ssh-pubkey=<key>       Public key yang ditambahkan ke root (akses tanpa password)
#    --skip-build             Hanya siapkan server, tanpa build aplikasi
# ============================================================================
set -euo pipefail

APP_DIR="/var/www/presensi"
DOMAIN=""
SSL_EMAIL=""
DO_MIGRATE="no"
DO_SSL="yes"
DB_NAME="presensi_sekolah"
DB_USER="presensi_user"
SSH_PUBKEY=""
SKIP_BUILD="no"
NGINX_SITE="presensi"
CRED_FILE="/root/presensi-credentials.txt"

# ------------------------------------------------------------------ utilitas
ok()   { printf '\033[0;32m✔ %s\033[0m\n' "$*"; }
info() { printf '\033[0;36mℹ %s\033[0m\n' "$*"; }
warn() { printf '\033[0;33m⚠ %s\033[0m\n' "$*"; }
err()  { printf '\033[0;31m✘ %s\033[0m\n' "$*" >&2; }
step() { printf '\n\033[1;34m=== %s ===\033[0m\n' "$*"; }

die() { err "$*"; exit 1; }

# ------------------------------------------------------------------- argumen
for arg in "$@"; do
  case "$arg" in
    --domain=*)    DOMAIN="${arg#*=}" ;;
    --email=*)     SSL_EMAIL="${arg#*=}" ;;
    --app-dir=*)   APP_DIR="${arg#*=}" ;;
    --db-name=*)   DB_NAME="${arg#*=}" ;;
    --db-user=*)   DB_USER="${arg#*=}" ;;
    --ssh-pubkey=*) SSH_PUBKEY="${arg#*=}" ;;
    --migrate)     DO_MIGRATE="yes" ;;
    --no-ssl)      DO_SSL="no" ;;
    --skip-build)  SKIP_BUILD="yes" ;;
    *) warn "Argumen tidak dikenal, dilewati: $arg" ;;
  esac
done

[ -n "$DOMAIN" ] || die "--domain wajib diisi. Contoh: --domain=presensi.sekolah.sch.id"
[ "$(id -u)" -eq 0 ] || die "Jalankan sebagai root (atau pakai sudo)."

# IP atau domain?
IS_IP="no"
if printf '%s' "$DOMAIN" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
  IS_IP="yes"
fi

# ------------------------------------------------------------------ header
echo "=============================================================="
echo " INSTALL OTOMATIS — PRESENSI DIGITAL SEKOLAH"
echo "--------------------------------------------------------------"
echo " Domain/IP    : $DOMAIN  $( [ "$IS_IP" = yes ] && echo '(alamat IP: SSL dilewati)' )"
echo " Folder app   : $APP_DIR"
echo " Database     : $DB_NAME (user: $DB_USER)"
echo " Migrasi data : $DO_MIGRATE"
echo "=============================================================="

# ------------------------------------------------------ 1. Deteksi sistem
step "1/12 Memeriksa sistem operasi"

[ -f /etc/os-release ] || die "Tidak bisa membaca /etc/os-release."

# shellcheck disable=SC1091
. /etc/os-release
OS_ID="${ID:-unknown}"
OS_VER="${VERSION_ID:-0}"
info "Sistem operasi: ${PRETTY_NAME:-$OS_ID $OS_VER}"

if ! command -v apt-get >/dev/null 2>&1; then
  err "Script ini hanya mendukung Debian/Ubuntu (apt)."
  err "Sistem Anda terdeteksi: ${PRETTY_NAME:-$OS_ID}"
  echo ""
  echo "  SOLUSI: reinstall OS VPS Anda dari dasbor VPS Murah menjadi:"
  echo "         Ubuntu 24.04 LTS  (disarankan)"
  echo "         atau Ubuntu 22.04 LTS / Debian 12"
  echo ""
  echo "  Setelah reinstall, jalankan perintah deploy ini lagi."
  exit 1
fi
ok "Sistem Debian/Ubuntu terdeteksi."

ARCH="$(dpkg --print-architecture 2>/dev/null || echo amd64)"
info "Arsitektur: $ARCH"

export DEBIAN_FRONTEND=noninteractive

# ------------------------------------------------------------ 2. Swap file
step "2/12 Memastikan ketersediaan memori (swap)"

MEM_MB="$(awk '/MemTotal/ {printf "%d", $2/1024}' /proc/meminfo)"
SWAP_MB="$(awk '/SwapTotal/ {printf "%d", $2/1024}' /proc/meminfo)"
info "RAM: ${MEM_MB} MB | Swap saat ini: ${SWAP_MB} MB"

if [ "$MEM_MB" -lt 1900 ] && [ "$SWAP_MB" -lt 1024 ] && [ ! -f /swapfile ]; then
  info "RAM kecil (${MEM_MB} MB) — membuat swap 2 GB agar build tidak gagal..."
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "Swap 2 GB aktif."
else
  ok "Memori mencukupi (RAM ${MEM_MB} MB, swap ${SWAP_MB} MB)."
fi

# --------------------------------------------------- 3. Paket dasar & update
step "3/12 Update paket dasar"
apt-get update -y -qq
apt-get upgrade -y -qq -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
apt-get install -y -qq curl git ufw ca-certificates build-essential openssl gnupg
ok "Paket dasar terpasang."

# ------------------------------------------------------------ 4. Node.js 22
step "4/12 Memasang Node.js 22 LTS + PM2"

NEED_NODE_INSTALL="yes"
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR_JSON="$(node -v | sed 's/^v\([0-9]*\).*/\1/')"
  if [ "${NODE_MAJOR_JSON:-0}" -ge 20 ]; then
    NEED_NODE_INSTALL="no"
    info "Node.js sudah terpasang: $(node -v)"
  fi
fi

if [ "$NEED_NODE_INSTALL" = "yes" ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs
fi

npm install -g pm2 >/dev/null 2>&1 || npm install -g pm2
ok "Node.js $(node -v) | npm $(npm -v) | PM2 $(pm2 -v 2>/dev/null | tail -n1)"

# ----------------------------------------------------------- 5. PostgreSQL
step "5/12 Memasang & menyiapkan PostgreSQL"

if ! command -v psql >/dev/null 2>&1; then
  apt-get install -y -qq postgresql postgresql-contrib
fi
systemctl enable postgresql >/dev/null 2>&1 || true
systemctl start postgresql

# Password: pakai ulang yang sudah ada agar tidak merusak instalasi sebelumnya
DB_PASS=""
if [ -f "$APP_DIR/.env" ]; then
  DB_PASS="$(sed -n 's|^DATABASE_URL="postgresql://[^:]*:\([^@]*\)@.*|\1|p' "$APP_DIR/.env" | head -n1)"
fi
if [ -z "$DB_PASS" ] && [ -f /root/.presensi_db_password ]; then
  DB_PASS="$(cat /root/.presensi_db_password)"
fi
if [ -z "$DB_PASS" ]; then
  DB_PASS="$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 28)"
  info "Password database baru dibuat."
else
  info "Password database yang ada dipakai ulang."
fi

sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
  ELSE
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SQL

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1; then
  info "Database ${DB_NAME} sudah ada."
else
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
  ok "Database ${DB_NAME} dibuat."
fi

sudo -u postgres psql -d "${DB_NAME}" -v ON_ERROR_STOP=1 -q \
  -c "GRANT ALL ON SCHEMA public TO ${DB_USER};" \
  -c "ALTER SCHEMA public OWNER TO ${DB_USER};"

printf '%s' "$DB_PASS" > /root/.presensi_db_password
chmod 600 /root/.presensi_db_password
ok "PostgreSQL $(sudo -u postgres psql -tAc 'SHOW server_version') siap."

# ---------------------------------------------------------------- 6. Firewall
step "6/12 Mengatur firewall (UFW)"

ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow "Nginx Full" >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true
ok "Firewall aktif (SSH + HTTP + HTTPS)."

# ----------------------------------------------- 7. Akses SSH tanpa password
if [ -n "$SSH_PUBKEY" ]; then
  step "7/12 Menambahkan SSH public key untuk akses tanpa password"
  mkdir -p /root/.ssh
  chmod 700 /root/.ssh
  touch /root/.ssh/authorized_keys
  if grep -qF "$SSH_PUBKEY" /root/.ssh/authorized_keys; then
    info "Public key sudah terdaftar."
  else
    printf '%s\n' "$SSH_PUBKEY" >> /root/.ssh/authorized_keys
    ok "Public key ditambahkan."
  fi
  chmod 600 /root/.ssh/authorized_keys
else
  step "7/12 SSH key (dilewati)"
fi

# ------------------------------------------------ 8. File .env & rahasia app
step "8/12 Menyiapkan file .env"

[ -d "$APP_DIR" ] || die "Folder aplikasi tidak ditemukan: $APP_DIR (upload project dulu)."
cd "$APP_DIR"

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    info ".env dibuat dari .env.example"
  else
    : > .env
    info ".env baru dibuat."
  fi
fi
chmod 600 .env

set_env_key() {
  local key="$1" value="$2"
  if grep -qE "^${key}=" .env 2>/dev/null; then
    local escaped
    escaped="$(printf '%s' "$value" | sed -e 's/[&|\\]/\\&/g')"
    sed -i "s|^${key}=.*|${key}=\"${escaped}\"|" .env
  else
    printf '%s="%s"\n' "$key" "$value" >> .env
  fi
}

# JWT_SECRET: pertahankan bila sudah diisi manual, jika masih contoh -> buat acak
JWT_CURRENT="$(sed -n 's|^JWT_SECRET="\(.*\)"$|\1|p' .env | head -n1)"
if [ -z "$JWT_CURRENT" ] || printf '%s' "$JWT_CURRENT" | grep -qiE 'ganti|ubah|example|placeholder|change|secret-key-production'; then
  set_env_key "JWT_SECRET" "$(openssl rand -hex 32)"
  ok "JWT_SECRET acak dibuat."
else
  info "JWT_SECRET yang ada dipertahankan."
fi

if [ "$IS_IP" = "yes" ]; then
  APP_URL="http://${DOMAIN}"
else
  APP_URL="https://${DOMAIN}"
fi

set_env_key "DATABASE_URL" "postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"
set_env_key "NEXT_PUBLIC_APP_URL" "$APP_URL"
set_env_key "NODE_ENV" "production"

info "DATABASE_URL  -> postgresql://${DB_USER}:***@localhost:5432/${DB_NAME}"
info "APP URL       -> ${APP_URL}"
ok "File .env siap (chmod 600)."

# ------------------------------------------ 9. Dependensi & skema database
step "9/12 Memasang dependensi aplikasi"

if [ "$SKIP_BUILD" = "yes" ]; then
  warn "Dilewati karena --skip-build."
else
  if [ -f package-lock.json ]; then npm ci; else npm install; fi
  npx prisma generate
  ok "Dependensi aplikasi & Prisma Client siap."

  step "10/12 Menyinkronkan skema database"
  npx prisma db push
  ok "Skema database sinkron dengan schema.prisma."

  if [ "$DO_MIGRATE" = "yes" ]; then
    if [ -f prisma/dev.db ]; then
      info "Memigrasikan data lama dari prisma/dev.db ..."
      if ! node -e "require.resolve('better-sqlite3')" >/dev/null 2>&1; then
        info "Memasang pembaca SQLite (better-sqlite3)..."
        npm install --no-save better-sqlite3 >/dev/null 2>&1 \
          || warn "better-sqlite3 gagal dipasang, akan memakai SQLite bawaan Node."
      fi
      node scripts/migrate-sqlite-to-postgres.js \
        || warn "Migrasi data gagal sebagian — periksa pesan di atas."
      ok "Proses migrasi data selesai."
    else
      warn "prisma/dev.db tidak ditemukan — migrasi data dilewati."
    fi
  fi

  step "11/12 Build produksi"
  BUILD_HEAP=1024
  if [ "$MEM_MB" -ge 3500 ]; then BUILD_HEAP=2048; fi
  info "Batas memori build: ${BUILD_HEAP} MB"
  NODE_ENV=production NODE_OPTIONS="--max-old-space-size=${BUILD_HEAP}" npm run build
  ok "Build produksi selesai."
fi

# ----------------------------------------------- 12. PM2 + Nginx + HTTPS
step "12/12 Menjalankan aplikasi, reverse proxy, dan HTTPS"

mkdir -p logs

if pm2 describe presensi-digital >/dev/null 2>&1; then
  pm2 reload ecosystem.config.js --update-env >/dev/null
  info "Aplikasi di-reload (tanpa downtime)."
else
  pm2 start ecosystem.config.js >/dev/null
  ok "Aplikasi berjalan via PM2."
fi
pm2 save >/dev/null
pm2 startup systemd >/dev/null 2>&1 || true
pm2 save >/dev/null
ok "PM2 aktif & otomatis menyala saat server reboot."

if ! command -v nginx >/dev/null 2>&1; then
  apt-get install -y -qq nginx
fi
systemctl enable nginx >/dev/null 2>&1 || true
systemctl start nginx

cat > "/etc/nginx/sites-available/${NGINX_SITE}" <<NGINXCONF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    client_max_body_size 30M;
    access_log /var/log/nginx/presensi.access.log;
    error_log  /var/log/nginx/presensi.error.log;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_vary on;
    gzip_types application/javascript application/json application/xml image/svg+xml text/css text/javascript text/plain text/xml;

    location /uploads/ {
        alias ${APP_DIR}/public/uploads/;
        access_log off;
        expires 30d;
        add_header Cache-Control "public";
        try_files \$uri =404;
    }

    location /_next/static/ {
        alias ${APP_DIR}/.next/static/;
        access_log off;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
NGINXCONF

ln -sf "/etc/nginx/sites-available/${NGINX_SITE}" "/etc/nginx/sites-enabled/${NGINX_SITE}"
if [ -e /etc/nginx/sites-enabled/default ]; then rm -f /etc/nginx/sites-enabled/default; fi
nginx -t >/dev/null 2>&1 || die "Konfigurasi Nginx tidak valid. Periksa dengan: nginx -t"
systemctl reload nginx
ok "Nginx aktif sebagai reverse proxy."

# --- HTTPS otomatis (butuh domain sudah mengarah ke IP VPS ini) ---
if [ "$DO_SSL" = "yes" ] && [ "$IS_IP" = "no" ]; then
  info "Memasang sertifikat HTTPS Let's Encrypt untuk ${DOMAIN} ..."
  apt-get install -y -qq certbot python3-certbot-nginx

  if [ -n "$SSL_EMAIL" ]; then
    certbot --nginx -d "$DOMAIN" --email "$SSL_EMAIL" --agree-tos --redirect -n --no-eff-email \
      || warn "HTTPS gagal dipasang (biasanya DNS belum mengarah ke IP VPS). Aplikasi tetap bisa diakses via http://${DOMAIN}"
  else
    certbot --nginx -d "$DOMAIN" --register-unsafely-without-email --agree-tos --redirect -n \
      || warn "HTTPS gagal dipasang (biasanya DNS belum mengarah ke IP VPS). Aplikasi tetap bisa diakses via http://${DOMAIN}"
  fi
else
  info "HTTPS dilewati (mode alamat IP atau --no-ssl)."
fi

# ------------------------------------------------------- Verifikasi akhir
echo ""
info "Menunggu aplikasi merespons health check..."
APP_OK="no"
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    APP_OK="yes"
    break
  fi
  sleep 2
done

cat > "$CRED_FILE" <<CRED
=========================================================
 KREDENSIAL — SISTEM PRESENSI DIGITAL SEKOLAH
 Dibuat: $(date '+%Y-%m-%d %H:%M:%S')
=========================================================

URL kiosk          : ${APP_URL}
URL panel admin    : ${APP_URL}/admin/login
Health check       : ${APP_URL}/api/health

Akun awal (WAJIB diganti setelah login pertama):
  Super Admin      : admin / admin123
  Operator TU      : operator / operator123

Database PostgreSQL:
  Host             : localhost
  Port             : 5432
  Nama database    : ${DB_NAME}
  User             : ${DB_USER}
  Password         : ${DB_PASS}
  DATABASE_URL     : postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public

Folder aplikasi    : ${APP_DIR}
File konfigurasi   : ${APP_DIR}/.env
Log aplikasi       : ${APP_DIR}/logs/
Backup database    : sudo -u postgres pg_dump --no-owner ${DB_NAME} > backup-\$(date +%F).sql

Perintah harian:
  pm2 status
  pm2 logs presensi-digital
  cd ${APP_DIR} && bash deploy/deploy.sh      # update aplikasi ke versi terbaru
=========================================================
CRED
chmod 600 "$CRED_FILE"

echo ""
echo "=============================================================="
if [ "$APP_OK" = "yes" ]; then
  ok "INSTALASI SELESAI — APLIKASI SUDAH ONLINE"
else
  warn "INSTALASI SELESAI, namun health check belum merespons."
  warn "Periksa log: pm2 logs presensi-digital --lines 80"
fi
echo "--------------------------------------------------------------"
echo " Akses sistem : ${APP_URL}"
echo " Panel admin  : ${APP_URL}/admin/login"
echo " Login admin  : admin / admin123   (segera ganti password!)"
echo ""
echo " Semua kredensial tersimpan di: ${CRED_FILE}"
echo " Lihat isinya: cat ${CRED_FILE}"
echo "=============================================================="




