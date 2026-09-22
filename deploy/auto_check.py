"""Preflight check: koneksi SSH + info VPS + uji bundling project."""
import paramiko, os, tarfile, io

HOST = "103.147.32.22"
PORT = 20199
USER = "root"
PASSWORD = os.environ["VPS_SSH_PASSWORD"]

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USER, password=PASSWORD,
            timeout=20, banner_timeout=30, auth_timeout=30)
print("SSH TERHUBUNG:", HOST)

def run(cmd):
    _, out, err = ssh.exec_command(cmd, timeout=60)
    code = out.channel.recv_exit_status()
    return code, (out.read().decode().strip() + err.read().decode().strip()).strip()

for cmd in ["cat /etc/os-release | head -3",
            "free -m | head -2",
            "df -h / | tail -1",
            "node -v 2>/dev/null || echo NODE_BELUM_ADA",
            "sudo -u postgres psql -tAc 'SHOW server_version' 2>/dev/null || echo PG_BELUM_ADA"]:
    code, text = run(cmd)
    print(f"$ {cmd}\n  -> {text[:300]}")

ssh.close()

# Uji bundling (tanpa benar-benar upload)
EXCL = {"node_modules", ".next", ".git", ".env"}
count, size = 0, 0
for root, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in EXCL and d != "deploy/ssh"]
    if root.startswith(".\\deploy\\ssh") or root.startswith("./deploy/ssh"):
        dirs[:] = []
        continue
    for f in files:
        if f.endswith(".log"):
            continue
        p = os.path.join(root, f)
        try:
            size += os.path.getsize(p); count += 1
        except OSError:
            pass
print(f"BUNDLE OK: {count} file, {size/1024/1024:.1f} MB")
