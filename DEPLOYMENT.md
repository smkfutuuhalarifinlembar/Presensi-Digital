# 🚀 Panduan Deploy ke VPS — Sistem Presensi Digital Sekolah

Panduan langkah demi langkah mengonlinekan sistem presensi ke **VPS Ubuntu 22.04 / 24.04 LTS**
memakai **PostgreSQL + PM2 + Nginx + HTTPS gratis (Let's Encrypt)**.

Hasil akhir:

| Halaman | URL |
|---|---|
| Kiosk presensi (RFID / QR) | `https://presensi.sekolahanda.sch.id` |
| Formulir izin | `https://presensi.sekolahanda.sch.id/izin` |
| Panel admin | `https://presensi.sekolahanda.sch.id/admin/login` |
| Health check | `https://presensi.sekolahanda.sch.id/api/health` |

> ⚠️ **Penting:** ini aplikasi **Next.js (Node.js)**, bukan PHP.
> Jangan ditaruh di `htdocs` XAMPP dan jangan diakses lewat Apache/PHP.

---

## 📋 Prasyarat

| Kebutuhan | Keterangan |
|---|---|
| VPS | Ubuntu 22.04 / 24.04 LTS, RAM minimal 1 GB (2 GB lebih nyaman), disk ≥ 20 GB |
| Akses SSH | `ssh root@IP_VPS` |
| Domain (disarankan) | A record → IP VPS. Tanpa domain tetap bisa via `http://IP_VPS` |
| Repository Git | GitHub / GitLab (boleh private) — dipakai VPS untuk mengambil kode |
| PostgreSQL | Akan dipasang otomatis oleh `deploy/setup-vps.sh` |

---

## 🧭 Alur Singkat

1. Push project ke GitHub.
2. Setup VPS (Node.js, PostgreSQL, Nginx, PM2, firewall) → `deploy/setup-vps.sh`.
3. Clone project ke `/var/www/presensi` lalu isi `.env`.
4. (Opsional) Mitigasi data lama dari `prisma/dev.db` ke PostgreSQL.
5. `bash deploy/deploy.sh` → aplikasi berjalan.
6. Pasang Nginx reverse proxy + HTTPS.
7. Update rutin cukup: `bash deploy/deploy.sh`.

---

## Langkah 1 — Push Project ke GitHub

Dari komputer Anda:

```bash
cd "d:/Project/Presensi Digital_2"
git add .
git commit -m "Siap deploy ke VPS"
git branch -M main
git remote add origin https://github.com/USERNAME/presensi-digital.git
git push -u origin main
```

Aman: file `.env` (berisi `JWT_SECRET`) dan `prisma/dev.db` **tidak** ikut ter-commit karena sudah
terdaftar di `.gitignore`.

---

## Langkah 2 — Setup VPS (sekali saja)

```bash
ssh root@IP_VPS

# Ambil kode aplikasi
apt update && apt install -y git
git clone https://github.com/USERNAME/presensi-digital.git /var/www/presensi
cd /var/www/presensi

# Jalankan setup otomatis
bash deploy/setup-vps.sh
```

Yang dilakukan script:

1. Update paket & install tools dasar.
2. Install **Node.js 22 LTS** + **PM2**.
3. Install **PostgreSQL**, membuat user `presensi_user` + database `presensi_sekolah`.
4. Install **Nginx** dan mengaktifkan firewall **UFW**.
5. Menyiapkan folder `/var/www/presensi`.

> 📌 **CATAT** `DATABASE_URL` yang dicetak di akhir script — password hanya ditampilkan sekali.
> Contoh keluaran:
> ```
> DATABASE_URL="postgresql://presensi_user:AbCd1234XyZ@localhost:5432/presensi_sekolah?schema=public"
> ```

---

## Langkah 3 — Isi File `.env` di VPS

```bash
cd /var/www/presensi
cp .env.example .env
nano .env
```

Contoh isi untuk produksi:

```env
DATABASE_URL="postgresql://presensi_user:PASSWORD_DARI_SCRIPT@localhost:5432/presensi_sekolah?schema=public"
JWT_SECRET="hasil-dari-openssl-rand-hex-32"
NEXT_PUBLIC_APP_URL="https://presensi.sekolahanda.sch.id"
NODE_ENV="production"
```

Buat `JWT_SECRET` acak:

```bash
openssl rand -hex 32
```

Amankan file:

```bash
chmod 600 .env
```

> Biarkan `BLOB_READ_WRITE_TOKEN` **kosong**. Di VPS, semua file unggahan (foto siswa, logo,
> background kiosk, bukti izin) otomatis disimpan ke folder `public/uploads` dan disajikan Nginx
> pada URL `/uploads/...`.

---

## Langkah 4 — (Opsional) Migrasi Data Lama ke PostgreSQL

Database lama Anda (`prisma/dev.db` berisi pengaturan sekolah, 2 lembaga, 20 orang, jadwal kegiatan,
template WhatsApp, dan audit log) bisa dipindahkan seluruhnya ke PostgreSQL.

**a. Kirim file `dev.db` dari laptop ke VPS:**

```powershell
# jalankan di Windows PowerShell pada folder project
scp "prisma/dev.db" root@IP_VPS:/var/www/presensi/prisma/dev.db
```

**b. Jalankan migrasi di VPS:**

```bash
cd /var/www/presensi

# 1) Lihat rencana migrasi (tidak menulis apa pun)
npm run db:migrate:pg -- --dry-run

# 2) Jalankan migrasi sebenarnya
npm run db:migrate:pg
```

Script akan menampilkan ringkasan jumlah baris per tabel, misalnya:

```
→ Institution        : 2 baris dimasukkan (SQLite: 2 baris)
→ Admin              : 2 baris dimasukkan (SQLite: 2 baris)
→ Person             : 20 baris dimasukkan (SQLite: 20 baris)
...
  SELESAI. Total 157 baris berhasil dimigrasi.
```

Catatan:

- Data di PostgreSQL tidak pernah dihapus; baris dengan ID yang sama akan dilewati, jadi script
  aman dijalankan berulang kali.
- Relasi yatim (mis. presensi milik orang yang sudah dihapus) otomatis dilewati dan dilaporkan.
- **Lewati langkah ini** jika ingin mulai dari nol. Untuk mengisi data contoh:
  ```bash
  npm run db:seed      # membuat akun admin/admin123, operator/operator123 + data contoh
  ```
  > ⚠️ `db:seed` menghapus seluruh data terlebih dahulu. Jangan dipakai setelah migrasi produksi.

---

## Langkah 5 — Deploy Aplikasi

```bash
cd /var/www/presensi
bash deploy/deploy.sh
```

Urutan kerja script:

| Tahap | Perintah |
|---|---|
| 1 | `git pull` kode terbaru |
| 2 | `npm ci` (install dependensi persis sesuai `package-lock.json`) |
| 3 | `npx prisma generate` |
| 4 | `npx prisma db push` (sinkronkan skema PostgreSQL) |
| 5 | `NODE_ENV=production npm run build` |
| 6 | `pm2 start/reload presensi-digital` + `pm2 save` |
| 7 | Verifikasi `http://127.0.0.1:3000/api/health` |

Jika berhasil, akan muncul:

```
✅ Deploy berhasil! Aplikasi sehat dan berjalan.
```

---

## Langkah 6 — Nginx Reverse Proxy + HTTPS

**a. Pasang konfigurasi Nginx:**

```bash
cd /var/www/presensi
cp deploy/nginx-presensi.conf /etc/nginx/sites-available/presensi
nano /etc/nginx/sites-available/presensi
```

Ganti dua hal pada file tersebut:

- `server_name` → domain atau IP VPS Anda
- `alias /var/www/presensi/...` → sesuaikan bila folder project berbeda

**b. Aktifkan:**

```bash
ln -s /etc/nginx/sites-available/presensi /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

**c. HTTPS gratis (Let's Encrypt):**

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d presensi.sekolahanda.sch.id
```

Pilih **Redirect HTTP to HTTPS** saat ditanya. Sertifikat diperbarui otomatis oleh Certbot.

> Tanpa domain? Akses langsung `http://IP_VPS` (port 80) — konfigurasi Nginx di atas sudah
> menangani keduanya, cukup ganti `server_name` menjadi alamat IP.

---

## Langkah 7 — Autostart Saat VPS Reboot

```bash
pm2 startup systemd
# Jalankan perintah yang dicetak PM2 di layar, lalu:
pm2 save
```

---

## Langkah 8 — Verifikasi

```bash
# 1. Aplikasi merespons?
curl http://127.0.0.1:3000/api/health
# -> {"status":"ok","checks":{"database":true,"storage":{"mode":"local",...}}}

# 2. Status PM2
pm2 status

# 3. Lihat log realtime
pm2 logs presensi-digital --lines 50
```

Lalu buka di browser:

- `https://presensi.sekolahanda.sch.id` → kiosk presensi
- `https://presensi.sekolahanda.sch.id/admin/login` → login admin

Akun hasil seed: `admin / admin123` (Super Admin) dan `operator / operator123`.
> ⚠️ **Segera ganti password** lewat menu **Kelola Pengguna & Hak Akses** setelah login pertama.

---

## 🔁 Cara Update Aplikasi (deploy ulang)

Setiap kali ada perubahan kode:

```bash
cd /var/www/presensi
bash deploy/deploy.sh
```

Script akan menarik kode terbaru, install dependensi, sinkronkan skema database, build ulang, dan
me-reload PM2 **tanpa downtime berarti**.

---

## 💾 Backup & Restore Database

### Cara 1 — Lewat panel admin (paling mudah)

Masuk sebagai **Super Admin** → menu **Backup & Restore**:

- **Unduh Backup Sekarang** → menghasilkan file `Backup_Presensi_<tanggal>.sql`
- **Restore** → unggah file `.sql` tersebut. Sistem otomatis menyimpan backup pengaman ke folder
  `backups/` sebelum menimpa data.

Contoh backup manual dari terminal:

```bash
sudo -u postgres pg_dump --no-owner --no-privileges \
  presensi_sekolah > /root/backup-presensi-$(date +%F).sql
```

Restore manual dari terminal:

```bash
sudo -u postgres psql presensi_sekolah < /root/backup-presensi-2026-09-21.sql
```

### Cara 2 — Backup harian otomatis (cron)

```bash
crontab -e
```

Tambahkan baris berikut (backup tiap hari pukul 01:00, simpan 14 hari terakhir):

```cron
0 1 * * * /usr/bin/pg_dump --no-owner --no-privileges presensi_sekolah | gzip > /root/backup/presensi-$(date +\%F).sql.gz && find /root/backup -name "presensi-*.sql.gz" -mtime +14 -delete
```

### Backend file upload (foto, logo, background)

Semua file tersimpan di `/var/www/presensi/public/uploads`. Cukup ikutkan folder ini pada strategi
backup Anda:

```bash
tar -czf /root/backup/uploads-$(date +%F).tar.gz -C /var/www/presensi public/uploads
```

---

## 🐳 Opsi Docker Compose (alternatif)

Jika lebih suka container (PostgreSQL + aplikasi sekaligus):

```bash
cd /var/www/presensi
cp .env.example .env && nano .env          # isi JWT_SECRET & NEXT_PUBLIC_APP_URL

export POSTGRES_PASSWORD="password_kuat_anda"
docker compose up -d --build
docker compose exec presensi-app npx prisma db push
docker compose exec presensi-app npm run db:seed    # opsional
```

Aplikasi berjalan di `127.0.0.1:3000` pada host, jadi tetap disarankan memakai Nginx sebagai
reverse proxy (langkah 6) agar bisa diakses publik dengan HTTPS.

> File upload memakai bind-mount `./public/uploads`, sehingga file tetap tersimpan di host dan
> tidak hilang saat container di-rebuild.

---

## 🔧 Troubleshooting

| Gejala | Penyebab & Solusi |
|---|---|
| `prisma db push` gagal / P1012 | `DATABASE_URL` salah format. Harus berawalan `postgresql://` |
| Aplikasi error "Can't reach database server" | PostgreSQL mati → `systemctl status postgresql` lalu `systemctl restart postgresql` |
| Halaman 502 Bad Gateway | PM2 mati → `pm2 logs presensi-digital --lines 100` untuk melihat error build/runtime |
| Upload foto/logo gagal | Pastikan `public/uploads` ada dan bisa ditulis: `mkdir -p public/uploads && chown -R www-data:www-data public/uploads` |
| Gambar `/uploads/...` 404 | Cek bagian `location /uploads/` pada Nginx (path `alias` harus benar) dan `nginx -t` |
| Build kehabisan memori di VPS 1 GB | Tambahkan swap: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` |
| Kiosk tidak bisa dibuka dari komputer lain | Cek `ufw status` (port 80/443 harus ALLOW) dan `server_name` pada Nginx |
| Login admin berhasil tapi langsung logout | `JWT_SECRET` berubah setelah cookie dibuat → hapus cookie browser / login ulang |
| Scan RFID tidak terdeteksi | Reader USB HID harus mode keyboard; klik area kiosk dulu agar input fokus |
| Link bukti izin di WhatsApp tidak bisa dibuka | Isi `NEXT_PUBLIC_APP_URL` dengan domain publik (mis. `https://presensi.sekolahanda.sch.id`) lalu deploy ulang |

### Perintah PM2 yang sering dipakai

```bash
pm2 status                        # status semua aplikasi
pm2 logs presensi-digital         # log realtime
pm2 restart presensi-digital      # restart aplikasi
pm2 reload presensi-digital       # reload tanpa downtime
pm2 stop presensi-digital         # hentikan sementara
pm2 monit                         # monitoring CPU & RAM
```

---

## 🖥️ Menjalankan di Komputer Lokal Setelah Pindah ke PostgreSQL

Komputer Windows Anda belum terpasang PostgreSQL. Ada dua pilihan:

**Opsi A — Lewati database VPS via SSH tunnel (paling cepat, tanpa install apa pun):**

```powershell
ssh -L 5433:127.0.0.1:5432 root@IP_VPS
```

Biarkan terminal itu terbuka, lalu ubah sementara `.env`:

```env
DATABASE_URL="postgresql://presensi_user:PASSWORD@127.0.0.1:5433/presensi_sekolah?schema=public"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

```bash
npm run dev     # buka http://localhost:3000
```

**Opsi B — Install PostgreSQL 16 di Windows**, buat database `presensi_sekolah`, lalu:

```bash
npm run db:push
npm run db:seed      # data contoh (menghapus data yang ada)
```

---

## 📱 Panduan Integrasi WhatsApp Gateway

### 1. Menggunakan Fonnte

1. Daftar akun di [https://fonnte.com](https://fonnte.com).
2. Masuk ke dashboard Fonnte, scan QR WhatsApp sekolah Anda di menu **Device**.
3. Salin **API Key / Token** dari dashboard Fonnte.
4. Masuk ke Panel Admin Presensi → Menu **WhatsApp Gateway**.
5. Pilih provider **Fonnte**, masukkan API Key, dan centang **Status Gateway: Aktif**.
6. Masukkan nomor HP Anda di kolom **Test Koneksi**, lalu klik **Test Koneksi** untuk memverifikasi pesan masuk.
7. Klik **Simpan Pengaturan & Template**.

### 2. Menggunakan SaungWA

1. Daftar akun di [https://saungwa.com](https://saungwa.com).
2. Hubungkan perangkat WhatsApp Anda.
3. Salin **API Key** dan **Auth Key**.
4. Di panel admin presensi, pilih provider **SaungWA**, isi kedua key tersebut, uji coba via **Test Koneksi**, lalu simpan.

### 3. Menggunakan Provider Kustom Lainnya

Pilih provider **Custom Gateway**, masukkan URL endpoint penyedia Anda (misal `https://api.wagateway.com/send`), pilih metode HTTP (`POST` / `GET`), isi JSON Header (jika memerlukan Bearer token), dan sesuaikan JSON mapping body sesuai dokumentasi provider Anda.

> 💡 Pastikan `NEXT_PUBLIC_APP_URL` sudah berisi domain publik. Link surat izin & foto bukti yang
> dikirim ke WhatsApp dibangun dari variabel ini.

---

## ✅ Checklist Deploy

- [ ] Kode sudah di-push ke GitHub (`.env` & `prisma/dev.db` tidak ikut)
- [ ] `bash deploy/setup-vps.sh` selesai dan `DATABASE_URL` sudah dicatat
- [ ] File `.env` di VPS sudah diisi: `DATABASE_URL`, `JWT_SECRET` (acak), `NEXT_PUBLIC_APP_URL`, `NODE_ENV=production`
- [ ] `npx prisma db push` berhasil
- [ ] Data lama dimigrasi (`npm run db:migrate:pg`) **atau** seed baru dijalankan
- [ ] `bash deploy/deploy.sh` berakhir dengan "✅ Deploy berhasil!"
- [ ] Nginx aktif: `nginx -t && systemctl reload nginx`
- [ ] HTTPS aktif: `certbot --nginx -d domain-anda`
- [ ] `pm2 startup` + `pm2 save` sudah dijalankan
- [ ] Firewall UFW membuka OpenSSH + Nginx Full
- [ ] Password `admin` default sudah diganti
- [ ] Backup harian (cron) sudah dijadwalkan
- [ ] Uji dari HP: buka kiosk, scan RFID/QR, cek muncul di dashboard admin


