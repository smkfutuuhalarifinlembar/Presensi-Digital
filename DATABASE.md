# 🗄️ Panduan Database — Sistem Presensi Digital Sekolah

Sistem ini memakai **PostgreSQL** sebagai database produksi (lihat `prisma/schema.prisma`).

> ## ⚠️ PENTING: Cara Menjalankan Aplikasi
>
> **Aplikasi ini BUKAN aplikasi PHP!** Ini aplikasi **Next.js (Node.js)**.
>
> ❌ **JANGAN** letakkan folder ini di `C:\xampp\htdocs\presensi-digital` lalu akses
> `http://localhost/presensi-digital` — itu cara aplikasi PHP dan **tidak akan berfungsi**.
>
> ✅ **Cara yang benar:**
>
> ```bash
> npm install
> npm run build          # atau: npm run dev  untuk pengembangan
> npm start
> ```
>
> Lalu buka **http://localhost:3000**.
>
> **Untuk jaringan lokal (LAN):** jalankan `npm start` di komputer server, lalu komputer lain
> mengakses `http://IP_SERVER:3000`.

---

## 📌 Ringkasan Konfigurasi

| Komponen | Dipakai | Keterangan |
|---|---|---|
| Database | **PostgreSQL** | `provider = "postgresql"` pada `prisma/schema.prisma` |
| ORM | **Prisma 5** | Sinkronisasi skema: `npx prisma db push` |
| Penyimpanan file | **Folder `public/uploads`** | Foto siswa, logo, background, bukti izin → URL `/uploads/...` |
| Lokasi file env | `.env` (root project) | Tidak ikut ter-commit (lihat `.gitignore`) |

Variabel database:

```env
DATABASE_URL="postgresql://presensi_user:PASSWORD@localhost:5432/presensi_sekolah?schema=public"
```

---

## 🖥️ Opsi 1 — PostgreSQL di VPS (Produksi)

Ini skenario utama. Ringkasnya:

```bash
# 1. Di VPS: setup otomatis (install PostgreSQL, buat user & database)
bash deploy/setup-vps.sh          # catat DATABASE_URL yang dicetak

# 2. Isi .env dengan DATABASE_URL tersebut

# 3. Sinkronkan skema
npx prisma db push                # atau cukup: bash deploy/deploy.sh

# 4. (Opsional) migrasi data dari SQLite lama
npm run db:migrate:pg
```

📖 Langkah lengkap termasuk Nginx, HTTPS, PM2, dan backup:
lihat **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

---

## 💻 Opsi 2 — Menjalankan di Komputer Lokal

Komputer Windows biasanya belum punya PostgreSQL. Ada dua cara:

### Cara A — SSH tunnel ke PostgreSQL VPS (tanpa install apa pun)

```powershell
# ganti IP_VPS dengan IP server Anda, biarkan terminal ini terbuka
ssh -L 5433:127.0.0.1:5432 root@IP_VPS
```

Ubah sementara `.env`:

```env
DATABASE_URL="postgresql://presensi_user:PASSWORD_VPS@127.0.0.1:5433/presensi_sekolah?schema=public"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

```bash
npm run dev
```

### Cara B — Install PostgreSQL di Windows

1. Unduh installer dari <https://www.postgresql.org/download/windows/> (versi 16).
2. Saat instalasi, catat **password user `postgres`** dan biarkan port **5432**.
3. Buat database:

   ```bash
   # jalankan di SQL Shell (psql) atau pgAdmin
   CREATE DATABASE presensi_sekolah;
   ```

4. Isi `.env`:

   ```env
   DATABASE_URL="postgresql://postgres:PASSWORD_ANDA@localhost:5432/presensi_sekolah?schema=public"
   NODE_ENV="development"
   ```

5. Siapkan tabel & data contoh:

   ```bash
   npm run setup       # = prisma db push + seed data contoh
   npm run dev
   ```

   > ⚠️ `db:seed` menghapus seluruh isi tabel terlebih dahulu. Jangan dipakai di produksi.
   > Untuk sekadar membuat tabel tanpa data contoh, gunakan `npx prisma db push`.

---

## 🔁 Opsi 3 — Migrasi Data dari SQLite Lama (`prisma/dev.db`)

Jika sebelumnya Anda sudah memakai versi SQLite dan ingin memindahkan seluruh data
(pengaturan sekolah, lembaga, siswa/guru, kode RFID, riwayat presensi, template WhatsApp, dll)
ke PostgreSQL:

```bash
# 1. Lihat rencana migrasi (tidak menulis apa pun)
node scripts/migrate-sqlite-to-postgres.js --dry-run

# 2. Jalankan migrasi
npm run db:migrate:pg

# atau bila file SQLite berada di lokasi lain:
node scripts/migrate-sqlite-to-postgres.js --file=prisma/dev.db.old
```

Cara kerja script:

| Tahap | Penjelasan |
|---|---|
| Validasi | Membaca kolom SQLite lalu menyaring hanya kolom yang ada di schema Prisma saat ini |
| Konversi | Tanggal (epoch → `DateTime`) dan Boolean (0/1 → `true/false`) diubah otomatis |
| Relasi | Baris dengan foreign key tidak valid dilewati & dilaporkan |
| Idempoten | Baris dengan ID yang sama di PostgreSQL **dilewati** (`skipDuplicates`), aman diulang |

Contoh keluaran:

```
→ Institution        : 2 baris dimasukkan (SQLite: 2 baris)
→ Person             : 20 baris dimasukkan (SQLite: 20 baris)
  SELESAI. Total 157 baris berhasil dimigrasi.
```

> Script ini butuh `better-sqlite3` (sudah ada di `devDependencies`).
> Jika instalasinya gagal, pakai Node.js 22+ yang punya SQLite bawaan.

---

## 🧱 Struktur Tabel (12 Model)

| Model | Isi |
|---|---|
| `Admin` | Akun admin/operator + role (`SUPER_ADMIN`, `ADMIN_OPERATOR`) |
| `Institution` | Lembaga/yayasan (multi-unit: SD, SMP, SMA/SMK) |
| `Person` | Siswa, guru, pegawai, kepala sekolah (NIS/NIP, RFID, QR, foto) |
| `Activity` | Jadwal kegiatan presensi (jam mulai, batas terlambat, target kelas) |
| `AttendanceRecord` | Riwayat presensi (unik per orang + kegiatan + tanggal) |
| `SchoolSetting` | Profil sekolah, logo, background kiosk, desain ID card |
| `Holiday` | Hari libur (presensi otomatis nonaktif) |
| `WaGatewayConfig` | Konfigurasi provider WhatsApp (Fonnte/SaungWA/Custom) |
| `WaTemplate` | Template pesan WhatsApp per status |
| `LeaveRequest` | Pengajuan izin (surat, foto bukti, tanda tangan, hasil review) |
| `LeaveSetting` | Pengaturan formulir izin + folder Google Drive |
| `AuditLog` | Jejak aktivitas admin |

---

## 🔑 Akun Default Setelah Seed

| Role | Username | Password | Hak Akses |
|---|---|---|---|
| **Super Admin** | `admin` | `admin123` | Semua menu (Data Orang, Jadwal, Pengaturan, WA Gateway, User Management) |
| **TU / Operator** | `operator` | `operator123` | Dashboard, Live Monitoring, Input Manual, Rekap & Laporan saja |

> ⚠️ **WAJIB** ganti password setelah login pertama di menu **Kelola Pengguna & Hak Akses**.

---

## 🛠️ Perintah Berguna

```bash
# Sinkronkan schema.prisma -> tabel PostgreSQL
npx prisma db push

# HATI-HATI: hapus seluruh data & buat ulang tabel
npx prisma db push --force-reset

# Isi data contoh (admin/admin123, operator/operator123, 20+ orang)
npm run db:seed

# GUI untuk melihat/mengedit data
npx prisma studio

# Backup & restore manual (VPS)
sudo -u postgres pg_dump --no-owner --no-privileges presensi_sekolah > backup.sql
sudo -u postgres psql presensi_sekolah < backup.sql

# Migrasi dari SQLite lama
npm run db:migrate:pg
```

> 💡 Tombol **Backup** dan **Restore** di panel admin (menu *Backup & Restore*) sudah otomatis
> menyesuaikan jenis database: menghasilkan/menerima file `.sql` untuk PostgreSQL.

---

## 🧯 Troubleshooting Database

| Pesan / Gejala | Solusi |
|---|---|
| `P1012: the URL must start with the protocol postgresql://` | Nilai `DATABASE_URL` salah. Harus `postgresql://user:pass@host:5432/db` (bukan `file:./dev.db`) |
| `Can't reach database server at localhost:5432` | PostgreSQL belum jalan → `sudo systemctl start postgresql` (VPS) atau buka **Services** di Windows |
| `password authentication failed for user "presensi_user"` | Password di `DATABASE_URL` tidak sama dengan di PostgreSQL. Reset: `sudo -u postgres psql -c "ALTER ROLE presensi_user WITH PASSWORD 'baru';"` |
| `database "presensi_sekolah" does not exist` | Buat dulu: `sudo -u postgres createdb -O presensi_user presensi_sekolah` |
| `permission denied for schema public` | `sudo -u postgres psql -d presensi_sekolah -c "GRANT ALL ON SCHEMA public TO presensi_user;"` |
| Tabel tidak lengkap / kolom baru hilang | Jalankan `npx prisma db push` |

