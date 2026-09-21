#!/usr/bin/env bash
# ==========================================================================
#  Setup awal VPS untuk Sistem Presensi Digital Sekolah
#  Target : Ubuntu 22.04 / 24.04 LTS (VPS baru)
#
#  Pemakaian:
#      sudo bash deploy/setup-vps.sh
#
#  Yang dilakukan:
#    1. Update paket & tools dasar
#    2. Install Node.js 22 LTS + PM2
#    3. Install & konfigurasi PostgreSQL (role + database untuk aplikasi)
#    4. Install Nginx + aktifkan firewall UFW
#    5. Siapkan folder aplikasi
#
#  Script ini aman dijalankan berulang (tidak menimpa database yang sudah ada).
# ==========================================================================
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

APP_DIR="${APP_DIR:-/var/www/presensi}"
DB_NAME="${DB_NAME:-presensi_sekolah}"
DB_USER="${DB_USER:-presensi_user}"
NODE_MAJOR="${NODE_MAJOR:-22}"
OWNER="${SUDO_USER:-root}"

echo "======================================================="
echo " Setup VPS Presensi Digital"
echo " Folder aplikasi : $APP_DIR"
echo " Database        : $DB_NAME (user: $DB_USER)"
echo "======================================================="

echo ""
echo "==> [1/6] Update paket dasar"
apt-get update -y
apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
apt-get install -y curl git build-essential ca-certificates gnupg ufw

echo ""
echo "==> [2/6] Install Node.js $NODE_MAJOR + PM2"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
else
  echo "ℹ️  Node.js sudah terinstall: $(node -v)"
fi
npm install -g pm2
echo "ℹ️  Node.js: $(node -v) | npm: $(npm -v) | pm2: $(pm2 -v)"

echo ""
echo "==> [3/6] Install & konfigurasi PostgreSQL"
apt-get install -y postgresql postgresql-contrib
systemctl enable --now postgresql

DB_PASS="$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 28)"

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
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
  echo "ℹ️  Database ${DB_NAME} sudah ada, dilewati."
else
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
  echo "✅ Database ${DB_NAME} dibuat."
fi

sudo -u postgres psql -d "${DB_NAME}" -v ON_ERROR_STOP=1 \
  -c "GRANT ALL ON SCHEMA public TO ${DB_USER};" \
  -c "ALTER SCHEMA public OWNER TO ${DB_USER};"

echo "ℹ️  PostgreSQL: $(sudo -u postgres psql -tAc 'SHOW server_version')"

echo ""
echo "==> [4/6] Install Nginx"
apt-get install -y nginx
systemctl enable --now nginx

echo ""
echo "==> [5/6] Firewall (UFW)"
ufw allow OpenSSH >/dev/null
ufw allow "Nginx Full" >/dev/null
ufw --force enable
ufw status

echo ""
echo "==> [6/6] Siapkan folder aplikasi"
mkdir -p "$APP_DIR"
chown -R "${OWNER}:${OWNER}" "$APP_DIR" 2>/dev/null || true
echo "✅ Folder siap: $APP_DIR"

cat <<INFO

=======================================================
 ✅ SETUP VPS SELESAI
=======================================================

SIMPAN INFORMASI DATABASE BERIKUT (password hanya tampil sekali):

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"

Buat JWT_SECRET acak:
   openssl rand -hex 32

LANGKAH SELANJUTNYA:

1) Ambil kode aplikasi:
   cd ${APP_DIR}
   git clone <URL_REPO_GITHUB_ANDA> .

2) Buat file .env lalu isi DATABASE_URL di atas, JWT_SECRET, dan domain:
   cp .env.example .env
   nano .env
   (isi NEXT_PUBLIC_APP_URL="https://domain-anda.sch.id" dan NODE_ENV="production")

3) Migrasi data dari laptop (opsional, bila ingin data lama):
   - Dari laptop:  scp "prisma/dev.db" root@IP_VPS:${APP_DIR}/prisma/dev.db
   - Di VPS     :  node scripts/migrate-sqlite-to-postgres.js

4) Deploy aplikasi:
   bash deploy/deploy.sh

5) Pasang reverse proxy Nginx:
   nano /etc/nginx/sites-available/presensi   (copy dari deploy/nginx-presensi.conf)
   ln -s /etc/nginx/sites-available/presensi /etc/nginx/sites-enabled/
   rm -f /etc/nginx/sites-enabled/default
   nginx -t && systemctl reload nginx

6) Aktifkan HTTPS gratis:
   apt-get install -y certbot python3-certbot-nginx
   certbot --nginx -d domain-anda.sch.id -d www.domain-anda.sch.id

7) Aktifkan auto-start saat server reboot:
   pm2 startup systemd -u ${OWNER} --hp /home/${OWNER}   (ikuti perintah yang muncul)
   pm2 save

=======================================================
INFO
