# 🏫 Sistem Presensi Digital Sekolah (Production-Ready)

Website sistem presensi digital sekolah modern, lengkap, dan siap pakai (*production-ready*). Dirancang khusus untuk **Siswa, Guru, Pegawai, dan Kepala Sekolah** dengan antarmuka presensi mandiri (Kiosk), panel admin terintegrasi, cetak ID Card standar KTP Indonesia tata letak A4, rekap kehadiran otomatis, dan multi-provider WhatsApp Gateway.

---

## 🌟 Fitur Utama Sistem

### 1. Halaman Presensi Mandiri (Kiosk Publik)
- **2 Metode Presensi Mandiri**:
  - **RFID (Default)**: Langsung aktif begitu halaman dibuka tanpa perlu menekan tombol apa pun. Kompatibel dengan reader RFID USB HID (terbaca sebagai input keyboard).
  - **QR Code (Opsi Kedua)**: Tombol switch untuk mengaktifkan kamera laptop/webcam/HP untuk scan QR unik milik siswa/guru, lalu otomatis kembali ke mode RFID.
- **Efek Suara Wajib & Text-to-Speech (TTS)**:
  - Synthesizer nada *chime* sukses (Hadir Tepat Waktu) dan nada peringatan (Terlambat) menggunakan Web Audio API tanpa dependensi audio eksternal.
  - Web Speech API otomatis menyebutkan nama dan status siswa secara verbal.
- **Notifikasi Konfirmasi Dinamis (5 Detik)**:
  - Tampil selama 5 detik dengan countdown bar.
  - **Interupsi Cepat**: Jika ada orang lain men-tap kartu dalam rentang 5 detik tersebut, notifikasi langsung digantikan oleh orang baru beserta efek suara baru tanpa harus menunggu 5 detik selesai.
- **Header & Informasi Hari Ini**:
  - Jam digital real-time & tanggal format Indonesia panjang.
  - Status jadwal kegiatan hari ini (*Akan Datang*, *Sedang Berlangsung*, *Selesai*).
  - Logo sekolah, nama sekolah, dan latar belakang kustom yang dapat diganti via panel admin.
- **Anti Double-Tap (Rate Limiting)**:
  - Mencegah tap ganda kartu yang sama dalam interval 30 detik untuk menghindari duplikasi data.

### 2. Panel Pengelolaan & Login Admin
- **Role-Based Authentication**:
  - **Super Admin**: Akses penuh ke seluruh konfigurasi dan database.
  - **Admin / Operator**: Pengelolaan data harian, rekap, dan input manual.
- **Dashboard Statistik**:
  - Ringkasan kehadiran hari ini (Hadir, Terlambat, Izin, Sakit, Alpa).
  - Rincian per kategori (Siswa, Guru, Pegawai & Staf).
- **Manajemen Data Orang (Siswa, Guru, Pegawai, Kepsek)**:
  - Form input manual, edit, dan hapus.
  - **Daftarkan RFID Langsung**: Fitur tap kartu fisik langsung saat menambah/mengedit data.
  - **Import Massal Excel/CSV**: Validasi per baris, menampilkan rincian baris yang gagal tanpa menggagalkan baris lain yang valid.
  - **Unduh Template Excel**: Format baku untuk panduan pengisian data sebelum import.
  - **Export Data Excel**: Unduh seluruh data atau filter per kelas/kategori.
- **Jadwal & Waktu Presensi**:
  - Tambah kegiatan (Presensi Pagi, Upacara, Presensi Pulang, Ekskul, Ujian).
  - Sistem otomatis membuka sesi presensi saat jam mulai tiba dan otomatis menutup saat jam selesai terlewati.
  - Atur jam batas "Hadir" vs "Terlambat" dan toleransi keterlambatan (menit).
- **Input Presensi Manual (Khusus Admin)**:
  - Input kehadiran siswa/guru yang lupa kartu RFID atau tidak bisa scan QR.
  - Pilihan status: Hadir, Terlambat, Sakit, Izin, Alpa, Bolos, Dinas Luar, atau Keterangan Kustom.
  - Audit log otomatis mencatat admin yang menginput beserta waktunya.
  - Memicu pengiriman pesan WhatsApp otomatis ke nomor terkait.
- **Cetak ID Card Standar KTP Indonesia**:
  - Dimensi resmi KTP: **3,37 inch x 2,12 inch** (85.6 mm x 53.98 mm).
  - **Layout Cetak Kertas A4**: Format berpasangan (sisi kiri Desain Depan, sisi kanan Desain Belakang) dengan garis potong (*crop marks*).
  - Auto-pagination: Menata 4 pasang kartu per lembar A4 secara rapi ke halaman berikutnya.
  - Siap cetak langsung dari browser atau simpan ke PDF A4.
- **Rekap & Laporan**:
  - Filter harian, mingguan, bulanan, per kegiatan, per kelas, dan per status.
  - Export ke format Excel (`.xlsx`).
  - Fitur cetak langsung (*print-friendly layout* A4 tanpa elemen navigasi admin).
- **WhatsApp Gateway Multi-Provider**:
  - Mendukung **Fonnte**, **SaungWA**, dan **Custom HTTP Gateway** generik.
  - Tombol **Test Koneksi** untuk verifikasi API key dan URL.
  - Editor template pesan dinamis per status dengan variabel: `{nama}`, `{nis}`, `{kelas}`, `{waktu}`, `{tanggal}`, `{status}`, `{nama_kegiatan}`, `{nama_sekolah}`.
- **Pengaturan Tampilan & Backup**:
  - Upload logo sekolah dan ganti latar belakang kiosk (gambar atau warna).
  - Identitas sekolah & kepala sekolah.
  - Tombol one-click **Cadangkan Database (Backup)**.
- **Log Aktivitas (Audit Trail)**:
  - Jejak digital setiap perubahan data dan input manual.

---

## 🚀 Panduan Instalasi Lokal Cepat

### Prasyarat:
- **Node.js**: Versi 18.x / 20.x / 22.x atau lebih baru.
- **NPM**: Bawaan Node.js.

### Langkah-Langkah:

1. **Clone atau Buka Folder Proyek**:
   ```bash
   cd "d:/Project/Presensi Digital"
   ```

2. **Install Dependensi**:
   ```bash
   npm install
   ```

3. **Inisialisasi Database & Seeder Data Contoh**:
   ```bash
   npm run setup
   ```
   *Perintah ini akan membuat skema database dan mengisi data contoh realistis (akun admin, jadwal sekolah, template WA, dan 20+ data siswa, guru, kepsek).*

4. **Jalankan Server Development**:
   ```bash
   npm run dev
   ```

5. **Buka di Browser**:
   - **Layar Kiosk Presensi Publik**: [http://localhost:3000](http://localhost:3000)
   - **Panel Admin / Pengelolaan**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

---

## 🔑 Akun Pengelola Default (Seed Data)

| Role | Username | Password | Keterangan |
|---|---|---|---|
| **Super Admin** | `admin` | `admin123` | Hak akses penuh ke seluruh menu & konfigurasi |
| **Operator TU** | `operator` | `operator123` | Pengelolaan data harian, rekap, & input manual |

---

## 💳 Data Contoh Kartu Siap Uji Coba

Anda dapat langsung mencoba menempelkan kartu (atau mengetik kodenya lalu tekan **Enter** pada halaman Kiosk):

| Kategori | Nama | NIS / NIP | Kode RFID Siap Tap |
|---|---|---|---|
| **Kepala Sekolah** | Drs. H. Bambang Sudirman, M.Pd. | `197103151998021003` | `KS1001` |
| **Guru** | Siti Rahmawati, S.Pd. | `198204122005012002` | `GURU1001` |
| **Guru** | Hendra Kurniawan, S.Kom. | `198807212010011005` | `GURU1002` |
| **Pegawai** | Agus Prasetyo, S.Sos. | `198501102014021001` | `STAF1001` |
| **Siswa (X-RPL-1)** | Ahmad Zaki Pratama | `102401` | `SISWA1001` |
| **Siswa (X-RPL-1)** | Annisa Larasati | `102402` | `SISWA1002` |
| **Siswa (XI-TKJ-1)** | Fajar Nugraha | `112301` | `SISWA2001` |
| **Siswa (XII-RPL-2)**| Muhammad Rizky | `122203` | `SISWA3003` |

---

## 🌐 Panduan Deploy & Online-kan

Untuk panduan lengkap deploy ke VPS Ubuntu + Nginx + SSL HTTPS gratis, Docker Compose, atau platform Cloud PaaS (Railway / Render / Vercel), silakan buka dokumen:
👉 **[DEPLOYMENT.md](./DEPLOYMENT.md)**

---

## 📁 Struktur Direktori Proyek

```
Presensi Digital/
├── prisma/
│   ├── schema.prisma              # Definisi skema database (PostgreSQL)
│   ├── seed.ts                    # Seeder data sekolah, admin, siswa, & guru
│   └── dev.db                     # Database SQLite LAMA (tidak di-commit)
├── public/
│   └── uploads/                   # Penyimpanan foto, logo, & background (di VPS)
├── deploy/
│   ├── setup-vps.sh               # Setup awal VPS: Node, PostgreSQL, Nginx, PM2, UFW
│   ├── deploy.sh                  # Deploy/update aplikasi (pull, build, reload PM2)
│   └── nginx-presensi.conf        # Contoh konfigurasi reverse proxy Nginx (+HTTPS)
├── scripts/
│   ├── dump-sqlite.js             # (Lama) dump SQLite -> MySQL
│   └── migrate-sqlite-to-postgres.js  # Migrasi data SQLite lama -> PostgreSQL
├── src/
│   ├── app/
│   │   ├── api/                   # REST API routes Next.js
│   │   │   ├── health/            # Health check untuk monitoring & verifikasi deploy
│   │   │   └── ...
│   │   ├── (public)/page.tsx      # Halaman Kiosk presensi utama
│   │   └── admin/                 # Panel admin responsive (Dashboard, People, Activities, ID Card, dll)
│   ├── components/
│   │   ├── kiosk/                 # Kiosk header, RFID listener, QR modal, Toast 5s
│   │   └── admin/                 # Layout admin & sidebar
│   └── lib/
│       ├── prisma.ts              # Prisma ORM singleton client
│       ├── auth.ts                # Session JWT & password hashing
│       ├── storage.ts             # Penyimpanan file: lokal (VPS) / Vercel Blob
│       ├── db-backup.ts           # Backup & restore (pg_dump/psql atau file SQLite)
│       ├── date-utils.ts          # Format tanggal Indo & kalkulator jam presensi
│       ├── wa-sender.ts           # Engine pengirim WA (Fonnte, SaungWA, Custom)
│       └── export-excel.ts        # Parser & generator Excel (.xlsx)
├── ecosystem.config.js            # Konfigurasi PM2 untuk VPS
├── Dockerfile                     # Multi-stage production container
├── docker-compose.yml             # Orchestration: aplikasi + PostgreSQL
├── DEPLOYMENT.md                  # Panduan deploy lengkap ke VPS
├── DATABASE.md                    # Panduan database (PostgreSQL)
├── package.json
└── tailwind.config.ts
```
