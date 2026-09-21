<#
.SYNOPSIS
  Deploy OTOMATIS Sistem Presensi Digital Sekolah ke VPS (VPS Murah / Ubuntu) —
  dijalankan dari komputer Windows ini. Hanya butuh SATU perintah.

.DESCRIPTION
  Script akan otomatis:
    1. Membungkus project menjadi satu file (tanpa node_modules/.next/.git/.env)
    2. Mengunggahnya ke VPS
    3. Menjalankan installer di VPS: swap, Node.js 22, PostgreSQL, Nginx, PM2,
       pembuatan .env + JWT_SECRET, db push, migrasi data (opsional), build,
       reverse proxy, dan HTTPS Let's Encrypt
    4. Menampilkan hasil akhir (URL + kredensial)

  Anda hanya perlu mengetik password root VPS saat diminta (1-2 kali).

.EXAMPLE
  # Deploy dengan domain + HTTPS otomatis (paling umum)
  .\deploy\windows-deploy.ps1 -Server 103.55.1.20 -Domain presensi.sekolah.sch.id -SslEmail admin@sekolah.sch.id -MigrateData

.EXAMPLE
  # Tanpa domain (akses via IP VPS, tanpa HTTPS)
  .\deploy\windows-deploy.ps1 -Server 103.55.1.20

.EXAMPLE
  # Pakai SSH key (tanpa prompt password; dipakai untuk otomatisasi penuh)
  .\deploy\windows-deploy.ps1 -Server 103.55.1.20 -Domain presensi.sekolah.sch.id -KeyFile .\deploy\ssh\id_presensi
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Server,

  [string]$Domain = "",
  [string]$SslEmail = "",
  [string]$SshUser = "root",
  [int]$SshPort = 22,
  [switch]$MigrateData,
  [switch]$NoSsl,
  [string]$KeyFile = "",
  [string]$AppDir = "/var/www/presensi",
  [string]$BundlePath = "$env:TEMP\presensi-deploy.tar.gz",
  [switch]$SkipUpload
)

$ErrorActionPreference = "Stop"

function Write-Step { param($Text) Write-Host "`n=== $Text ===" -ForegroundColor Cyan }
function Write-Ok   { param($Text) Write-Host "[OK] $Text"   -ForegroundColor Green }
function Write-Info { param($Text) Write-Host "[i]  $Text"   -ForegroundColor Gray }
function Write-Warn { param($Text) Write-Host "[!]  $Text"   -ForegroundColor Yellow }

# ------------------------------------------------------------------ validasi
$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
  throw "package.json tidak ditemukan di $ProjectRoot. Jalankan script ini dari dalam folder project."
}

foreach ($tool in @("ssh", "scp", "tar")) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    throw "Perintah '$tool' tidak ditemukan. Install 'OpenSSH Client' dari Settings > Apps > Optional Features."
  }
}

if (-not $Domain) {
  Write-Host ""
  Write-Info "Domain belum diisi. Tekan ENTER untuk memakai alamat IP VPS ($Server)."
  $answer = Read-Host "Domain/IP yang dipakai (contoh: presensi.sekolah.sch.id)"
  if ($answer) { $Domain = $answer.Trim() } else { $Domain = $Server }
}

if ($Domain -match '^\d+\.\d+\.\d+\.\d+$') {
  $NoSsl = $true
  Write-Info "Terdeteksi alamat IP -> HTTPS dilewati."
}

if ($KeyFile -and -not (Test-Path $KeyFile)) {
  throw "File SSH key tidak ditemukan: $KeyFile"
}

# ------------------------------------------------------------ opsi SSH umum
$SshOptions = @("-p", "$SshPort", "-o", "StrictHostKeyChecking=accept-new", "-o", "ServerAliveInterval=30")
$ScpOptions = @("-P", "$SshPort", "-o", "StrictHostKeyChecking=accept-new")
if ($KeyFile) {
  $SshOptions += @("-i", $KeyFile, "-o", "BatchMode=yes", "-o", "IdentitiesOnly=yes")
  $ScpOptions += @("-i", $KeyFile, "-o", "BatchMode=yes", "-o", "IdentitiesOnly=yes")
  Write-Info "Menggunakan SSH key: $KeyFile (tanpa prompt password)"
}

$Target = "$SshUser@$Server"

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Blue
Write-Host " DEPLOY OTOMATIS PRESENSI DIGITAL" -ForegroundColor Blue
Write-Host "--------------------------------------------------------------" -ForegroundColor Blue
Write-Host " Server        : $Server (port $SshPort, user $SshUser)"
Write-Host " Domain/IP     : $Domain"
Write-Host " Folder di VPS : $AppDir"
if ($MigrateData) { $MigrateLabel = "YA (dari prisma/dev.db)" } else { $MigrateLabel = "tidak" }
if ($NoSsl) { $HttpsLabel = "tidak" } else { $HttpsLabel = "ya (Let's Encrypt)" }
Write-Host " Migrasi data  : $MigrateLabel"
Write-Host " HTTPS         : $HttpsLabel"
Write-Host "==============================================================" -ForegroundColor Blue

# --------------------------------------------------- 1. Bungkus file project
if (-not $SkipUpload) {
Write-Step "1/4 Membungkus project (mengecualikan node_modules, .next, .git, .env)"

if (Test-Path $BundlePath) { Remove-Item $BundlePath -Force }

$tarExcludes = @(
  "--exclude=./node_modules",
  "--exclude=./.next",
  "--exclude=./.git",
  "--exclude=./.env",
  "--exclude=./logs",
  "--exclude=./backups",
  "--exclude=./deploy/ssh",
  "--exclude=./dev-server.log",
  "--exclude=*.log",
  "--exclude=*.tsbuildinfo",
  "--exclude=./next-env.d.ts"
)

$tarArgs = @("-czf", $BundlePath) + $tarExcludes + @("-C", $ProjectRoot, ".")
& tar @tarArgs
if ($LASTEXITCODE -ne 0) { throw "Gagal membuat file bundle." }

$bundleSize = [math]::Round((Get-Item $BundlePath).Length / 1MB, 2)
Write-Ok "Bundle dibuat: $BundlePath ($bundleSize MB)"
} else {
Write-Info "Dilewati: pembuatan bundle & upload (project sudah ada di VPS)."
}

# ------------------------------------------------------ 2. Cek konektivitas
Write-Step "2/4 Memeriksa koneksi ke VPS"

try {
  $tcp = New-Object System.Net.Sockets.TcpClient
  $async = $tcp.BeginConnect($Server, $SshPort, $null, $null)
  $connected = $async.AsyncWaitHandle.WaitOne(10000, $false) -and $tcp.Connected
  $tcp.Close()
} catch {
  $connected = $false
}

if (-not $connected) {
  Write-Warn "Tidak bisa menghubungi $Server pada port $SshPort."
  Write-Host ""
  Write-Host "Kemungkinan penyebab:" -ForegroundColor Yellow
  Write-Host "  1. VPS belum selesai di-provision (tunggu email/WA dari admin VPS Murah)"
  Write-Host "  2. IP server salah (cek email 'Detail Akses VPS')"
  Write-Host "  3. Firewall/port SSH bukan 22 (coba: -SshPort <port>)"
  throw "Server belum bisa dihubungi."
}
Write-Ok "VPS merespons di port $SshPort."

# ------------------------------------------------------------- 3. Unggah file
if (-not $SkipUpload) {
Write-Step "3/4 Mengunggah project ke VPS (jika diminta, masukkan password root)"

& scp @ScpOptions $BundlePath "${Target}:/root/presensi-deploy.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "Upload gagal (password/IP/port salah?)." }
Write-Ok "Upload selesai ($bundleSize MB)."
} else {
Write-Info "Dilewati: upload file."
}

# --------------------------------------------------- 4. Jalankan installer
Write-Step "4/4 Menjalankan instalasi otomatis di VPS"
Write-Info "Proses ini 5-15 menit (install PostgreSQL, build aplikasi, Nginx, HTTPS)."
Write-Info "Biarkan jendela ini terbuka sampai muncul pesan selesai."
Write-Host ""

$remoteParts = @(
  "set -e",
  "mkdir -p '$AppDir'",
  "tar -xzf /root/presensi-deploy.tar.gz -C '$AppDir'",
  "rm -f /root/presensi-deploy.tar.gz",
  "cd '$AppDir'",
  "bash deploy/install-vps.sh --domain='$Domain'"
)

if ($SslEmail) {
  $safeEmail = ($SslEmail -replace "'", '')
  $remoteParts += "--email='$safeEmail'"
}
if ($MigrateData) { $remoteParts += "--migrate" }
if ($NoSsl)      { $remoteParts += "--no-ssl" }

# Sertakan public key kita (bila ada) agar pengelolaan VPS berikutnya
# bisa dilakukan tanpa password.
$pubKeyPath = Join-Path $PSScriptRoot "ssh\id_presensi.pub"
if (Test-Path $pubKeyPath) {
  $pubKey = (Get-Content $pubKeyPath -Raw).Trim()
  if ($pubKey) {
    $safeKey = ($pubKey -replace "'", '')
    $remoteParts += "--ssh-pubkey='$safeKey'"
    Write-Info "SSH key akan dipasang di VPS (deploy berikutnya tanpa password)."
  }
}

$remoteCommand = $remoteParts -join " "

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
& ssh @SshOptions $Target $remoteCommand
$exitCode = $LASTEXITCODE
$stopwatch.Stop()

$elapsed = "{0:mm\:ss}" -f $stopwatch.Elapsed

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Blue
if ($exitCode -eq 0) {
  Write-Host " SELESAI — APLIKASI SUDAH ONLINE (durasi $elapsed)" -ForegroundColor Green
} else {
  Write-Host " INSTALASI BERHENTI DENGAN KODE $exitCode (durasi $elapsed)" -ForegroundColor Red
}
Write-Host "==============================================================" -ForegroundColor Blue
Write-Host ""
if ($NoSsl) { $BaseUrl = "http://$Domain" } else { $BaseUrl = "https://$Domain" }
Write-Host " Akses sistem : $BaseUrl"
Write-Host " Panel admin  : $BaseUrl/admin/login"
Write-Host " Login admin  : admin / admin123   (segera ganti password)"
Write-Host ""
Write-Host " Kredensial lengkap dan password database ada di VPS:" -ForegroundColor Yellow
Write-Host "   ssh $Target"
Write-Host "   cat /root/presensi-credentials.txt"
Write-Host ""
if ($exitCode -eq 0 -and (Test-Path $pubKeyPath)) {
  Write-Host " Update aplikasi selanjutnya (tanpa password):" -ForegroundColor Yellow
  Write-Host "   .\deploy\windows-deploy.ps1 -Server $Server -Domain $Domain -KeyFile .\deploy\ssh\id_presensi -SkipUpload"
  Write-Host "   atau langsung di VPS: cd $AppDir ; bash deploy/deploy.sh"
} else {
  Write-Host " Bila ada kegagalan, lihat log di VPS:" -ForegroundColor Yellow
  Write-Host "   ssh $Target 'pm2 logs presensi-digital --lines 100'" -ForegroundColor Yellow
}
Write-Host ""
Write-Host " Contoh deploy ulang tanpa upload (cepat, hanya trigger installer):" -ForegroundColor Gray
Write-Host "   .\deploy\windows-deploy.ps1 -Server $Server -Domain $Domain -SkipUpload"
Write-Host ""

if (Test-Path $BundlePath) { Remove-Item $BundlePath -Force }

