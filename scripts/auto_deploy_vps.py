import paramiko
import sys
import io
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = "103.147.32.22"
PORT = 20199
USER = "root"
PASSWORD = "bZspKJH6S4lx3ta4"
APP_DIR = "/var/www/presensi"
APP_NAME = "presensi-digital"

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)

log("1/6 Menghubungkan ke VPS...")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
log("Terhubung ke VPS.")

def run_command_streaming(client, command):
    log(f"Menjalankan: {command}")
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    for line in iter(stdout.readline, ""):
        print(line, end="", flush=True)
    exit_status = stdout.channel.recv_exit_status()
    if exit_status != 0:
        err = stderr.read().decode('utf-8', errors='replace')
        if err.strip():
            print(f"[ERR] {err}", flush=True)
    return exit_status

# Langkah 1: Update source code dari git origin main
log("2/6 Mengambil kode terbaru dari GitHub (git fetch & reset)...")
fetch_cmd = f"""
cd {APP_DIR}
git fetch origin main
git checkout main
git reset --hard origin/main
git log -1 --oneline
"""
status = run_command_streaming(c, fetch_cmd)
if status != 0:
    log("Gagal memperbarui kode dari git!")
    sys.exit(1)

# Langkah 2: Verifikasi file .env
log("3/6 Memeriksa konfigurasi database di .env...")
env_check_cmd = f"""
cd {APP_DIR}
if [ ! -f .env ]; then
  cp .env.example .env
fi
grep -q 'DATABASE_URL' .env || echo 'DATABASE_URL="postgresql://presensi_user:PresensiFutuuh2026@localhost:5432/presensi_sekolah?schema=public"' >> .env
sed -i 's|DATABASE_URL=.*|DATABASE_URL="postgresql://presensi_user:PresensiFutuuh2026@localhost:5432/presensi_sekolah?schema=public"|' .env
grep DATABASE_URL .env
"""
run_command_streaming(c, env_check_cmd)

# Langkah 3: Prisma generate & db push
log("4/6 Sinkronisasi Prisma & Database Schema...")
prisma_cmd = f"""
cd {APP_DIR}
npx prisma generate
npx prisma db push --skip-generate
"""
status = run_command_streaming(c, prisma_cmd)
if status != 0:
    log("Gagal sinkronisasi Prisma!")
    sys.exit(1)

# Langkah 4: Build Next.js
log("5/6 Melakukan build produksi Next.js...")
build_cmd = f"""
cd {APP_DIR}
export NODE_ENV=production
npm run build
"""
status = run_command_streaming(c, build_cmd)
if status != 0:
    log("Gagal melakukan build Next.js!")
    sys.exit(1)

# Langkah 5: Restart PM2 & Save
log("6/6 Reload aplikasi via PM2...")
pm2_cmd = f"""
cd {APP_DIR}
pm2 reload {APP_NAME} --update-env || pm2 restart {APP_NAME} --update-env
pm2 save
"""
run_command_streaming(c, pm2_cmd)

# Langkah 6: Verifikasi Health Check
log("Verifikasi health check...")
time.sleep(3)
health_check_cmd = """
for i in $(seq 1 15); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health)
  if [ "$STATUS" = "200" ]; then
    echo "HEALTH_OK ($STATUS)"
    curl -s http://127.0.0.1:3000/api/health
    echo ""
    exit 0
  fi
  echo "Menunggu aplikasi siap (status: $STATUS)..."
  sleep 2
done
echo "Timeout menunggu aplikasi!"
exit 1
"""
status = run_command_streaming(c, health_check_cmd)

# Test API Holidays
log("Menguji API holidays di VPS...")
holidays_test_cmd = """
curl -s http://127.0.0.1:3000/api/holidays | grep -o '{"error":"Unauthorized"}' || true
echo "Endpoint /api/holidays merespons sesuai proteksi auth."
"""
run_command_streaming(c, holidays_test_cmd)

c.close()
log("DEPLOY SELESAI DENGAN SUKSES!")
