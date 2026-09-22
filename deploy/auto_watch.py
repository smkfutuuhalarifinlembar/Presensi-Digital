"""Pantau log installer yang sedang berjalan di VPS + verifikasi akhir."""
import paramiko, os, time, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "103.147.32.22"
PORT = 20199
USER = "root"
PASSWORD = os.environ["VPS_SSH_PASSWORD"]
DOMAIN = "smkfutuuhalarifinlembar.my.id"
APP_DIR = "/var/www/presensi"
LOG = "/root/presensi-install.log"

connect_attempts = 0

def ssh_connect():
    global connect_attempts
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    max_wait = 900
    waited = 0
    while True:
        try:
            c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
                      timeout=30, banner_timeout=60, auth_timeout=60)
            print("SSH TERHUBUNG", flush=True)
            return c
        except Exception as e:
            connect_attempts += 1
            waited += 30
            if waited >= max_wait:
                raise RuntimeError(f"Gagal connect SSH setelah {max_wait}s") from e
            print(f"SSH belum siap, tunggu lagi ({connect_attempts}). {str(e)[:80]}", flush=True)
            time.sleep(30)

ssh = ssh_connect()

def run(cmd, timeout=120):
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    code = out.channel.recv_exit_status()
    return code, out.read().decode(errors="replace") + err.read().decode(errors="replace")

print("Memantau installer di VPS...", flush=True)
last = 0
run(cmd, timeout=120)
while True:
    code, o = run(f"tail -c 6000 {LOG} 2>/dev/null; "
                  f"echo ---PROC---; pgrep -f install-vps.sh >/dev/null && echo RUNNING || echo DONE")
    parts = o.split("---PROC---")
    tail = parts[0] if len(parts) > 1 else ""
    running = "RUNNING" in o
    if len(tail) > last:
        print(tail[last:], end="", flush=True)
        last = len(tail)
    if not running:
        break
    time.sleep(20)

print("\n===== VERIFIKASI =====", flush=True)
for cmd in ["cat /root/presensi-credentials.txt",
            "pm2 list 2>/dev/null | head -12",
            "curl -s -o /dev/null -w 'HTTP lokal: %{http_code}\\n' http://127.0.0.1:3000/api/health",
            f"curl -sk -o /dev/null -w 'HTTP publik: %{{http_code}}\\n' https://{DOMAIN}/api/health"]:
    code, o = run(cmd)
    print(f"$ {cmd}\n{o.strip()[:1500]}", flush=True)

ssh.close()
print("SELESAI", flush=True)
