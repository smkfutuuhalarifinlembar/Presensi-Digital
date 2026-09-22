"""Deploy otomatis: bundle -> upload (SFTP) -> install di VPS -> pantau log -> verifikasi."""
import paramiko, os, tarfile, time, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "103.147.32.22"
PORT = 20199
USER = "root"
PASSWORD = os.environ["VPS_SSH_PASSWORD"]
DOMAIN = "smkfutuuhalarifinlembar.my.id"
SSL_EMAIL = "admin@smkfutuuhalarifinlembar.my.id"
APP_DIR = "/var/www/presensi"
LOG = "/root/presensi-install.log"
BUNDLE_LOCAL = os.path.join(os.environ.get("TEMP", "/tmp"), "presensi-deploy.tar.gz")

EXCL_DIRS = {"node_modules", ".next", ".git", "__pycache__"}
EXCL_EXACT = {".env"}

def make_bundle():
    n = 0
    with tarfile.open(BUNDLE_LOCAL, "w:gz") as tar:
        for root, dirs, files in os.walk("."):
            rel = os.path.relpath(root, ".")
            dirs[:] = [d for d in dirs
                       if d not in EXCL_DIRS
                       and not rel.replace("\\", "/").startswith("deploy/ssh")]
            for f in files:
                if f.endswith(".log") or f in EXCL_EXACT:
                    continue
                full = os.path.join(root, f)
                arc = os.path.relpath(full, ".")
                tar.add(full, arcname=arc)
                n += 1
    mb = os.path.getsize(BUNDLE_LOCAL) / 1024 / 1024
    print(f"[1/5] Bundle: {n} file, {mb:.1f} MB", flush=True)

def ssh_client():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASSWORD,
              timeout=30, banner_timeout=60, auth_timeout=60)
    return c

def run(ssh, cmd, timeout=120):
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    code = out.channel.recv_exit_status()
    return code, out.read().decode() + err.read().decode()

make_bundle()
ssh = ssh_client()
print("[2/5] SSH terhubung", flush=True)

pub = open("deploy/ssh/id_presensi.pub").read().strip()
code, o = run(ssh, f"mkdir -p {APP_DIR} /root/.ssh && chmod 700 /root/.ssh && "
                   f"touch /root/.ssh/authorized_keys && "
                   f"grep -qF '{pub}' /root/.ssh/authorized_keys || echo '{pub}' >> /root/.ssh/authorized_keys")
print("[3/5] SSH key didaftarkan di VPS (deploy berikutnya tanpa password)", flush=True)

print("[4/5] Cek/upload bundle via SFTP...", flush=True)
code, size = run(ssh, "stat -c %s /root/presensi-deploy.tar.gz 2>/dev/null || echo MISSING")
uploaded = False
try:
    remote_size = int(size.strip())
    local_size = os.path.getsize(BUNDLE_LOCAL)
    if remote_size == local_size:
        uploaded = True
        print(f"      bundle {remote_size/1024/1024:.1f} MB sudah ada di VPS, lanjut.", flush=True)
except ValueError:
    pass
if not uploaded:
    sftp = ssh.open_sftp()
    sftp.put(BUNDLE_LOCAL, "/root/presensi-deploy.tar.gz")
    sftp.close()
    code, size = run(ssh, "stat -c %s /root/presensi-deploy.tar.gz")
    print(f"      terupload {int(size.strip())/1024/1024:.1f} MB", flush=True)

code, o = run(ssh, f"rm -rf {APP_DIR} && mkdir -p {APP_DIR} && "
                   f"tar -xzf /root/presensi-deploy.tar.gz -C {APP_DIR} && "
                   f"cp {APP_DIR}/deploy/install-vps.sh /root/install-vps.sh && chmod +x /root/install-vps.sh && "
                   f"ls {APP_DIR}/package.json {APP_DIR}/prisma/schema.prisma && echo EXTRACT_OK")
print(o.strip()[-200:], flush=True)
assert "EXTRACT_OK" in o, "Extract gagal!"

print("[5/5] Menjalankan ulang installer dari awal (fresh log)...", flush=True)
run(ssh, f"rm -f {LOG}; nohup bash /root/install-vps.sh --domain={DOMAIN} --email={SSL_EMAIL} "
          f"--migrate --app-dir={APP_DIR} "
          f"--ssh-pubkey='{pub}' > {LOG} 2>&1 & echo STARTED")

last = 0
while True:
    code, o = run(ssh, f"ls -la {LOG} 2>/dev/null; echo ---TAIL---; tail -c 3000 {LOG} 2>/dev/null; "
                        f"echo ---PROC---; pgrep -f install-vps.sh >/dev/null && echo RUNNING || echo DONE")
    tail = o.split("---TAIL---")[1].split("---PROC---")[0] if "---TAIL---" in o else ""
    running = "RUNNING" in o
    if len(tail) > last:
        try:
            print(tail[last:], end="", flush=True)
        except UnicodeEncodeError:
            print(tail[last:].encode("ascii", "replace").decode(), end="", flush=True)
        last = len(tail)
    if not running:
        break
    time.sleep(20)

print("\n===== VERIFIKASI =====", flush=True)
for cmd in [f"cat {APP_DIR}/../presensi-credentials.txt 2>/dev/null || cat /root/presensi-credentials.txt",
            "pm2 list 2>/dev/null | head -12",
            "curl -s -o /dev/null -w 'HTTP lokal: %{http_code}\\n' http://127.0.0.1:3000/api/health",
            f"curl -sk -o /dev/null -w 'HTTP publik: %{{http_code}}\\n' https://{DOMAIN}/api/health"]:
    code, o = run(ssh, cmd)
    print(f"$ {cmd}\n{o.strip()[:1500]}", flush=True)

ssh.close()
print("SELESAI", flush=True)
