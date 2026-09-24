-- Migration SQL for PostgreSQL (VPS Murah)
-- Run this in your database (via psql, pgAdmin, or any SQL client)
-- Generated: 2026-09-21

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN_OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'SD',
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "nisNip" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "className" TEXT,
    "position" TEXT,
    "phone" TEXT,
    "parentPhone" TEXT,
    "rfidUid" TEXT,
    "qrCodeToken" TEXT NOT NULL,
    "photoUrl" TEXT,
    "gender" TEXT DEFAULT 'L',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "institutionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daysOfWeek" TEXT NOT NULL DEFAULT 'ALL',
    "specificDate" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "lateCutoffTime" TEXT NOT NULL,
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 0,
    "targetRoles" TEXT NOT NULL DEFAULT 'ALL',
    "targetClasses" TEXT NOT NULL DEFAULT 'ALL',
    "institutionId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "dateString" TEXT NOT NULL,
    "timeString" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'RFID',
    "remarks" TEXT,
    "recordedByAdminId" TEXT,
    "waNotificationSent" BOOLEAN NOT NULL DEFAULT false,
    "waNotificationStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT,
    "targetPhone" TEXT,
    "messageContent" TEXT NOT NULL,
    "deliveryMessage" TEXT,
    "errorMessage" TEXT,
    "retryOfId" TEXT,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "SchoolSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL DEFAULT 'SMK Negeri 1 Nusantara',
    "npsn" TEXT NOT NULL DEFAULT '20214567',
    "address" TEXT NOT NULL DEFAULT 'Jl. Pendidikan No. 45, Kebayoran Baru, Jakarta Selatan',
    "phone" TEXT NOT NULL DEFAULT '(021) 789-0123',
    "email" TEXT NOT NULL DEFAULT 'info@smkn1nusantara.sch.id',
    "website" TEXT DEFAULT 'https://smkn1nusantara.sch.id',
    "principalName" TEXT NOT NULL DEFAULT 'Drs. H. Bambang Sudirman, M.Pd.',
    "principalNip" TEXT NOT NULL DEFAULT '197103151998021003',
    "principalSignatureUrl" TEXT,
    "logoUrl" TEXT,
    "kioskBackgroundUrl" TEXT,
    "kioskBackgroundColor" TEXT NOT NULL DEFAULT '#0f172a',
    "kioskHeaderSubtitle" TEXT NOT NULL DEFAULT 'Sistem Presensi Digital Terpadu & Terpercaya',
    "cardValidity" TEXT NOT NULL DEFAULT '2026/2027',
    "academicYear" TEXT NOT NULL DEFAULT '2026/2027',
    "cardBackNotes" TEXT NOT NULL DEFAULT '1. Kartu ini merupakan tanda pengenal resmi di lingkungan sekolah.
2. Wajib dibawa setiap hari kerja/sekolah untuk keperluan presensi.
3. Jangan melipat, membengkokkan, atau merusak kartu RFID ini.
4. Apabila menemukan kartu ini, mohon kembalikan ke kantor Tata Usaha.',
    "cardBackgroundMode" TEXT NOT NULL DEFAULT 'KIOSK',
    "cardSolidColor" TEXT NOT NULL DEFAULT '#1e3a8a',
    "cardGradientFrom" TEXT NOT NULL DEFAULT '#1e40af',
    "cardGradientTo" TEXT NOT NULL DEFAULT '#3730a3',
    "cardBackgroundImageUrl" TEXT,
    "cardSiswaColor" TEXT NOT NULL DEFAULT '#1e3a8a',
    "cardGuruColor" TEXT NOT NULL DEFAULT '#065f46',
    "cardPegawaiColor" TEXT NOT NULL DEFAULT '#7c2d12',
    "cardKepsekColor" TEXT NOT NULL DEFAULT '#581c87',
    "cardBackBackgroundMode" TEXT NOT NULL DEFAULT 'SOLID',
    "cardBackBackgroundImageUrl" TEXT,
    "cardBackSolidColor" TEXT NOT NULL DEFAULT '#ffffff',
    "useSameBackBg" BOOLEAN NOT NULL DEFAULT false,
    "headerLogoLeftUrl" TEXT,
    "headerLogoRightUrl" TEXT,
    "headerLines" TEXT,
    "headerFont" TEXT NOT NULL DEFAULT 'text-xs',
    "headerTextColor" TEXT NOT NULL DEFAULT '#0f172a',
    "yayasanEnabled" BOOLEAN NOT NULL DEFAULT false,
    "yayasanName" TEXT NOT NULL DEFAULT 'Yayasan Pendidikan',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "dateString" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'NATIONAL',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaGatewayConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" TEXT NOT NULL DEFAULT 'FONNTE',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fonnteApiKey" TEXT,
    "fonnteEndpointUrl" TEXT,
    "saungwaApiKey" TEXT,
    "saungwaAuthKey" TEXT,
    "saungwaEndpointUrl" TEXT,
    "saungwaSenderNumber" TEXT,
    "customName" TEXT,
    "customEndpointUrl" TEXT,
    "customApiKey" TEXT,
    "customMethod" TEXT NOT NULL DEFAULT 'POST',
    "customHeadersJson" TEXT,
    "customBodyMappingJson" TEXT,

    CONSTRAINT "WaGatewayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaTemplate" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ALL',
    "status" TEXT NOT NULL,
    "contentTemplate" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "nisNip" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SISWA',
    "className" TEXT,
    "position" TEXT,
    "parentPhone" TEXT,
    "personPhone" TEXT,
    "waliKelasPhone" TEXT,
    "reasonType" TEXT NOT NULL DEFAULT 'SAKIT',
    "customReason" TEXT,
    "dateString" TEXT NOT NULL,
    "proofImageUrl" TEXT,
    "proofBlobPathname" TEXT,
    "proofDriveId" TEXT,
    "proofDriveLink" TEXT,
    "parentPhotoUrl" TEXT,
    "parentPhotoBlobPathname" TEXT,
    "parentPhotoDriveId" TEXT,
    "parentPhotoDriveLink" TEXT,
    "signatureDataUrl" TEXT,
    "signatureDriveId" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "reviewedByAdminName" TEXT,
    "reviewNote" TEXT,
    "waToTuStatus" TEXT,
    "waResultStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL DEFAULT 'Formulir Izin Tidak Masuk Sekolah',
    "subtitle" TEXT DEFAULT 'Silakan isi pengajuan izin di bawah ini dengan lengkap dan jujur.',
    "requireProof" BOOLEAN NOT NULL DEFAULT true,
    "requireParentPhoto" BOOLEAN NOT NULL DEFAULT true,
    "requireSignature" BOOLEAN NOT NULL DEFAULT true,
    "allowedReasonsJson" TEXT DEFAULT '["SAKIT","IZIN","KEPERLUAN_KELUARGA","DINAS","LAINNYA"]',
    "tuWaNumbers" TEXT DEFAULT '',
    "waliKelasMapJson" TEXT DEFAULT '{}',
    "waliKelasDefaultWa" TEXT,
    "notifyParent" BOOLEAN NOT NULL DEFAULT true,
    "notifyWaliKelas" BOOLEAN NOT NULL DEFAULT true,
    "autoCreateAttendance" BOOLEAN NOT NULL DEFAULT true,
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,
    "driveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "driveFolderId" TEXT DEFAULT '1kk1p30xrosFap-3emPsc2vAemIW3ISG5',
    "templatePengajuan" TEXT DEFAULT '🔔 *PENGAJUAN IZIN BARU*

Nama: {nama}
NIS: {nis}
Kelas: {kelas}
Keterangan: {keterangan}
Tanggal: {tanggal}
Pesan: {pesan}
📄 Surat Izin: {link_surat}
📷 Foto Bukti: {link_foto}

Mohon segera ditinjau di panel TU/Operator.',
    "templateDisetujui" TEXT DEFAULT '✅ *Izin Disetujui*

Yth. Orang Tua/Wali Siswa

Berikut informasi perizinan:

👤 *Nama : {nama_siswa}*
🏫 *Kelas : {kelas}*
📋 *Keterangan : {keterangan}*
📅 *Tanggal : {tanggal}*
💬 *Pesan : {pesan}*

📄 Surat Izin: {link_surat}
📷 Foto Bukti: {link_foto}

Izin telah *DISETUJUI* oleh pihak sekolah.

Salam,
{nama_sekolah}',
    "templateDitolak" TEXT DEFAULT '❌ *Izin Ditolak*

Yth. Siswa/Orang Tua

👤 *Nama : {nama_siswa}*
🏫 *Kelas : {kelas}*
📋 *Keterangan : {keterangan}*
📅 *Tanggal : {tanggal}*

Mohon maaf, pengajuan izin Anda *DITOLAK* oleh pihak sekolah.
Silakan hubungi wali kelas untuk informasi lebih lanjut.

Salam,
{nama_sekolah}',
    "templateSetujuOrtu" TEXT,
    "templateSetujuWali" TEXT DEFAULT '✅ *Pemberitahuan Izin Disetujui*

Mohon pesan ini diteruskan ke Grup Guru atau Guru Mapel.

Yth. Wali Kelas {kelas}

Dengan ini memberitahukan bahwa:

👤 *Nama : {nama_siswa}*
🏫 *Kelas : {kelas}*
📋 *Keterangan : {keterangan}*
📅 *Tanggal : {tanggal}*
💬 *Pesan : {pesan}*

📄 Surat Izin: {link_surat}
📷 Foto Bukti: {link_foto}

Izin telah *DISETUJUI* oleh pihak sekolah.

Salam,
{nama_sekolah}',
    "templateTolakOrtu" TEXT DEFAULT '❌ *Izin Ditolak*

Yth. Siswa/Orang Tua

👤 *Nama : {nama_siswa}*
🏫 *Kelas : {kelas}*
📋 *Keterangan : {keterangan}*
📅 *Tanggal : {tanggal}*

Mohon maaf, pengajuan izin Anda *DITOLAK* oleh pihak sekolah.
Silakan hubungi wali kelas untuk informasi lebih lanjut.

Salam,
{nama_sekolah}',
    "templateTolakWali" TEXT DEFAULT '❌ *Pemberitahuan Izin Ditolak*

Yth. Wali Kelas {kelas}

Dengan ini memberitahukan bahwa:

👤 *Nama : {nama_siswa}*
🏫 *Kelas : {kelas}*
📋 *Keterangan : {keterangan}*
📅 *Tanggal : {tanggal}*
💬 *Pesan : {pesan}*

Izin telah *DITOLAK* oleh pihak sekolah.

Salam,
{nama_sekolah}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "adminName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_code_key" ON "Institution"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Person_nisNip_key" ON "Person"("nisNip");

-- CreateIndex
CREATE UNIQUE INDEX "Person_rfidUid_key" ON "Person"("rfidUid");

-- CreateIndex
CREATE UNIQUE INDEX "Person_qrCodeToken_key" ON "Person"("qrCodeToken");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_personId_activityId_dateString_key" ON "AttendanceRecord"("personId", "activityId", "dateString");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_retryOfId_key" ON "NotificationLog"("retryOfId");

-- CreateIndex
CREATE INDEX "NotificationLog_channel_status_createdAt_idx" ON "NotificationLog"("channel", "status", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_attendanceId_createdAt_idx" ON "NotificationLog"("attendanceId", "createdAt");
-- CreateIndex
CREATE UNIQUE INDEX "Holiday_dateString_key" ON "Holiday"("dateString");

-- CreateIndex
CREATE UNIQUE INDEX "WaTemplate_role_status_key" ON "WaTemplate"("role", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_dateString_idx" ON "LeaveRequest"("status", "dateString");

-- CreateIndex
CREATE INDEX "LeaveRequest_personId_dateString_idx" ON "LeaveRequest"("personId", "dateString");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_recordedByAdminId_fkey" FOREIGN KEY ("recordedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;