-- ==================================================
-- Presensi Digital Sekolah - SQL Dump
-- Compatible with MySQL / MariaDB (XAMPP)
-- Generated: 2026-09-05T08:51:29.794Z
-- ==================================================
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS `SchoolSetting`;
CREATE TABLE IF NOT EXISTS SchoolSetting (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL DEFAULT 'SMK Negeri 1 Nusantara',
  npsn VARCHAR(191) NOT NULL DEFAULT '20214567',
  address VARCHAR(191) NOT NULL DEFAULT '',
  phone VARCHAR(191) NOT NULL DEFAULT '',
  email VARCHAR(191) NOT NULL DEFAULT '',
  website VARCHAR(191) NULL,
  principalName VARCHAR(191) NOT NULL DEFAULT '',
  principalNip VARCHAR(191) NOT NULL DEFAULT '',
  principalSignatureUrl VARCHAR(191) NULL,
  logoUrl VARCHAR(191) NULL,
  kioskBackgroundUrl VARCHAR(191) NULL,
  kioskBackgroundColor VARCHAR(191) NOT NULL DEFAULT '#0f172a',
  kioskHeaderSubtitle VARCHAR(191) NOT NULL DEFAULT '',
  cardValidity VARCHAR(191) NOT NULL DEFAULT '2026/2027',
  cardBackNotes TEXT NULL,
  cardBackgroundMode VARCHAR(191) NOT NULL DEFAULT 'KIOSK',
  cardSolidColor VARCHAR(191) NOT NULL DEFAULT '#1e3a8a',
  cardGradientFrom VARCHAR(191) NOT NULL DEFAULT '#1e40af',
  cardGradientTo VARCHAR(191) NOT NULL DEFAULT '#3730a3',
  cardBackgroundImageUrl VARCHAR(191) NULL,
  cardSiswaColor VARCHAR(191) NOT NULL DEFAULT '#1e3a8a',
  cardGuruColor VARCHAR(191) NOT NULL DEFAULT '#065f46',
  cardPegawaiColor VARCHAR(191) NOT NULL DEFAULT '#7c2d12',
  cardKepsekColor VARCHAR(191) NOT NULL DEFAULT '#581c87',
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data untuk tabel SchoolSetting (1 baris)
INSERT INTO `SchoolSetting` (`id`,`name`,`npsn`,`address`,`phone`,`email`,`website`,`principalName`,`principalNip`,`principalSignatureUrl`,`logoUrl`,`kioskBackgroundUrl`,`kioskBackgroundColor`,`kioskHeaderSubtitle`,`cardValidity`,`cardBackNotes`,`cardBackgroundMode`,`cardSolidColor`,`cardGradientFrom`,`cardGradientTo`,`cardBackgroundImageUrl`,`cardSiswaColor`,`cardGuruColor`,`cardPegawaiColor`,`cardKepsekColor`,`updatedAt`) VALUES ('default','SMK Negeri 1 Nusantara','20214567','Jl. Pendidikan No. 45, Kebayoran Baru, Jakarta Selatan 12180','(021) 789-0123','info@smkn1nusantara.sch.id','https://smkn1nusantara.sch.id','Drs. H. Bambang Sudirman, M.Pd.','197103151998021003',NULL,NULL,NULL,'#0b192e','Sistem Presensi Digital Terpadu & Terpercaya','2026/2027','1. Kartu ini merupakan identitas resmi di lingkungan SMK Negeri 1 Nusantara.\n2. Wajib dibawa setiap hari sekolah untuk presensi mandiri (RFID / QR Code).\n3. Dilarang merusak, memotong, atau meminjamkan kartu ini kepada orang lain.\n4. Apabila kartu hilang atau ditemukan, mohon hubungi bagian Tata Usaha sekolah.','KIOSK','#1e3a8a','#1e40af','#3730a3',NULL,'#1e3a8a','#065f46','#7c2d12','#581c87',1788598199394);

DROP TABLE IF EXISTS `Admin`;
CREATE TABLE IF NOT EXISTS Admin (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  username VARCHAR(191) NOT NULL UNIQUE,
  passwordHash VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  role VARCHAR(191) NOT NULL DEFAULT 'ADMIN_OPERATOR',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data untuk tabel Admin (2 baris)
INSERT INTO `Admin` (`id`,`username`,`passwordHash`,`name`,`role`,`createdAt`,`updatedAt`) VALUES ('cmto56rzy0000po0505oslhly','admin','$2a$10$ZBiPI3XQq2tOdyKgPe1UY.xli3QNF9K4nSvyi0SaiAkPLgwZjJA5K','Super Administrator','SUPER_ADMIN',1788598200382,1788598200382);
INSERT INTO `Admin` (`id`,`username`,`passwordHash`,`name`,`role`,`createdAt`,`updatedAt`) VALUES ('cmto56s3t0001po05qxw6v326','operator','$2a$10$Wa5RHpegdlpRtm.gVYqOOuO6BGT4oy5a5bap8QkFOFhrfHo.F34vK','Operator Tata Usaha','ADMIN_OPERATOR',1788598200522,1788598200522);

DROP TABLE IF EXISTS `Person`;
CREATE TABLE IF NOT EXISTS Person (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  nisNip VARCHAR(191) NOT NULL UNIQUE,
  name VARCHAR(191) NOT NULL,
  role VARCHAR(191) NOT NULL,
  className VARCHAR(191) NULL,
  position VARCHAR(191) NULL,
  phone VARCHAR(191) NULL,
  parentPhone VARCHAR(191) NULL,
  rfidUid VARCHAR(191) NULL UNIQUE,
  qrCodeToken VARCHAR(191) NOT NULL UNIQUE,
  photoUrl VARCHAR(191) NULL,
  gender VARCHAR(191) NULL DEFAULT 'L',
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data untuk tabel Person (20 baris)
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56ttn000cpo05dar10y8u','197103151998021003','Drs. H. Bambang Sudirman, M.Pd.','KEPALA_SEKOLAH',NULL,'Kepala Sekolah','081234567890',NULL,'KS1001','QR-KS-197103151998021003',NULL,'L',1,1788598202747,1788598202747);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56ty1000dpo05j846bv0q','198204122005012002','Siti Rahmawati, S.Pd.','GURU',NULL,'Guru Matematika & Wali Kelas X-RPL-1','081234567891',NULL,'GURU1001','QR-GURU-198204122005012002',NULL,'P',1,1788598202905,1788598202905);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56u3q000epo05eyshbpd7','198807212010011005','Hendra Kurniawan, S.Kom.','GURU',NULL,'Guru Produktif Rekayasa Perangkat Lunak','081234567892',NULL,'GURU1002','QR-GURU-198807212010011005',NULL,'L',1,1788598203110,1788598203110);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56ubo000fpo05uk48eeyz','197509182000032001','Dra. Sri Wahyuni, M.Hum.','GURU',NULL,'Guru Bahasa Indonesia & Pembina OSIS','081234567893',NULL,'GURU1003','QR-GURU-197509182000032001',NULL,'P',1,1788598203397,1788598203397);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56ugr000gpo05fg2pr60i','198501102014021001','Agus Prasetyo, S.Sos.','PEGAWAI',NULL,'Kepala Tata Usaha','081234567894',NULL,'STAF1001','QR-STAF-198501102014021001',NULL,'L',1,1788598203580,1788598203580);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56ul6000hpo05v0hfy7kf','199008252019031002','Rahmat Hidayat','PEGAWAI',NULL,'Teknisi Laboratorium Komputer','081234567895',NULL,'STAF1002','QR-STAF-199008252019031002',NULL,'L',1,1788598203738,1788598203738);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56uqd000ipo05f9ppmta7','102401','Ahmad Zaki Pratama','SISWA','X-RPL-1',NULL,'082100010001','081299990001','SISWA1001','QR-SISWA-102401',NULL,'L',1,1788598203926,1788598203926);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56uv6000jpo05twal5ky6','102402','Annisa Larasati','SISWA','X-RPL-1',NULL,'082100010002','081299990002','SISWA1002','QR-SISWA-102402',NULL,'P',1,1788598204098,1788598204098);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56uzj000kpo05checkhbh','102403','Bagas Surya Ramadhan','SISWA','X-RPL-1',NULL,'082100010003','081299990003','SISWA1003','QR-SISWA-102403',NULL,'L',1,1788598204255,1788598204255);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56v3x000lpo05nhhgw7xd','102404','Cantika Putri Azzahra','SISWA','X-RPL-1',NULL,'082100010004','081299990004','SISWA1004','QR-SISWA-102404',NULL,'P',1,1788598204413,1788598204413);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56vcy000mpo05qy2nxlgl','102405','Dimas Arya Wijaya','SISWA','X-RPL-1',NULL,'082100010005','081299990005','SISWA1005','QR-SISWA-102405',NULL,'L',1,1788598204739,1788598204739);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56vkq000npo05pemk6p9n','112301','Fajar Nugraha','SISWA','XI-TKJ-1',NULL,'082100010006','081299990006','SISWA2001','QR-SISWA-112301',NULL,'L',1,1788598205019,1788598205019);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56vqf000opo05tyup28d0','112302','Gita Nuraini','SISWA','XI-TKJ-1',NULL,'082100010007','081299990007','SISWA2002','QR-SISWA-112302',NULL,'P',1,1788598205223,1788598205223);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56vwk000ppo054s3dyl1f','112303','Hafiz Maulana','SISWA','XI-TKJ-1',NULL,'082100010008','081299990008','SISWA2003','QR-SISWA-112303',NULL,'L',1,1788598205445,1788598205445);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56w1h000qpo05f0imx3af','112304','Indah Permatasari','SISWA','XI-TKJ-1',NULL,'082100010009','081299990009','SISWA2004','QR-SISWA-112304',NULL,'P',1,1788598205621,1788598205621);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56w6n000rpo05eontwg1b','122201','Kevin Jonathan','SISWA','XII-RPL-2',NULL,'082100010010','081299990010','SISWA3001','QR-SISWA-122201',NULL,'L',1,1788598205807,1788598205807);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56wb9000spo05r1rwfj8q','122202','Melani Safitri','SISWA','XII-RPL-2',NULL,'082100010011','081299990011','SISWA3002','QR-SISWA-122202',NULL,'P',1,1788598205973,1788598205973);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56wfu000tpo054b8f4jiq','122203','Muhammad Rizky','SISWA','XII-RPL-2',NULL,'082100010012','081299990012','SISWA3003','QR-SISWA-122203',NULL,'L',1,1788598206139,1788598206139);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56wlk000upo05ux4auhez','122204','Nabila Ayu Wardani','SISWA','XII-RPL-2',NULL,'082100010013','081299990013','SISWA3004','QR-SISWA-122204',NULL,'P',1,1788598206345,1788598206345);
INSERT INTO `Person` (`id`,`nisNip`,`name`,`role`,`className`,`position`,`phone`,`parentPhone`,`rfidUid`,`qrCodeToken`,`photoUrl`,`gender`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56wrx000vpo058ndvwssv','122205','Rizky Dwi Saputra','SISWA','XII-RPL-2',NULL,'082100010014','081299990014','SISWA3005','QR-SISWA-122205',NULL,'L',1,1788598206574,1788598206574);

DROP TABLE IF EXISTS `Activity`;
CREATE TABLE IF NOT EXISTS Activity (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  daysOfWeek VARCHAR(191) NOT NULL DEFAULT 'ALL',
  specificDate VARCHAR(191) NULL,
  startTime VARCHAR(191) NOT NULL,
  endTime VARCHAR(191) NOT NULL,
  lateCutoffTime VARCHAR(191) NOT NULL,
  gracePeriodMinutes INT NOT NULL DEFAULT 0,
  targetRoles VARCHAR(191) NOT NULL DEFAULT 'ALL',
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data untuk tabel Activity (3 baris)
INSERT INTO `Activity` (`id`,`name`,`daysOfWeek`,`specificDate`,`startTime`,`endTime`,`lateCutoffTime`,`gracePeriodMinutes`,`targetRoles`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56s8h0002po05iidhhw46','Presensi Pagi Masuk','ALL',NULL,'06:00','23:59','07:00',15,'ALL',1,1788598200689,1788598200689);
INSERT INTO `Activity` (`id`,`name`,`daysOfWeek`,`specificDate`,`startTime`,`endTime`,`lateCutoffTime`,`gracePeriodMinutes`,`targetRoles`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56sd00003po059azr5rd7','Upacara Bendera Senin','1',NULL,'06:45','08:15','07:00',5,'ALL',1,1788598200853,1788598200853);
INSERT INTO `Activity` (`id`,`name`,`daysOfWeek`,`specificDate`,`startTime`,`endTime`,`lateCutoffTime`,`gracePeriodMinutes`,`targetRoles`,`isActive`,`createdAt`,`updatedAt`) VALUES ('cmto56sh10004po05boludr4t','Presensi Pulang','1,2,3,4,5',NULL,'15:00','18:00','17:00',0,'ALL',1,1788598200997,1788598200997);

DROP TABLE IF EXISTS `AttendanceRecord`;
CREATE TABLE IF NOT EXISTS AttendanceRecord (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  personId VARCHAR(191) NOT NULL,
  activityId VARCHAR(191) NOT NULL,
  dateString VARCHAR(191) NOT NULL,
  timeString VARCHAR(191) NOT NULL,
  timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  status VARCHAR(191) NOT NULL,
  method VARCHAR(191) NOT NULL DEFAULT 'RFID',
  remarks TEXT NULL,
  recordedByAdminId VARCHAR(191) NULL,
  waNotificationSent TINYINT(1) NOT NULL DEFAULT 0,
  waNotificationStatus VARCHAR(191) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY Person_Activity_Date (personId, activityId, dateString),
  INDEX idx_attendance_date (dateString),
  CONSTRAINT fk_att_person FOREIGN KEY (personId) REFERENCES Person(id) ON DELETE CASCADE,
  CONSTRAINT fk_att_activity FOREIGN KEY (activityId) REFERENCES Activity(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data untuk tabel AttendanceRecord (12 baris)
INSERT INTO `AttendanceRecord` (`id`,`personId`,`activityId`,`dateString`,`timeString`,`timestamp`,`status`,`method`,`remarks`,`recordedByAdminId`,`waNotificationSent`,`waNotificationStatus`,`createdAt`) VALUES ('cmto56wwa000xpo05f7jswm4z','cmto56ttn000cpo05dar10y8u','cmto56s8h0002po05iidhhw46','2026-09-05','06:35:10',1788598206731,'HADIR','RFID',NULL,NULL,1,'SENT',1788598206731);
INSERT INTO `AttendanceRecord` (`id`,`personId`,`activityId`,`dateString`,`timeString`,`timestamp`,`status`,`method`,`remarks`,`recordedByAdminId`,`waNotificationSent`,`waNotificationStatus`,`createdAt`) VALUES ('cmto56x0q000zpo0533dpnmmw','cmto56ty1000dpo05j846bv0q','cmto56s8h0002po05iidhhw46','2026-09-05','06:42:15',1788598206890,'HADIR','RFID',NULL,NULL,1,'SENT',1788598206890);
INSERT INTO `AttendanceRecord` (`id`,`personId`,`activityId`,`dateString`,`timeString`,`timestamp`,`status`,`method`,`remarks`,`recordedByAdminId`,`waNotificationSent`,`waNotificationStatus`,`createdAt`) VALUES ('cmto56x510011po05eiftyi05','cmto56u3q000epo05eyshbpd7','cmto56s8h0002po05iidhhw46','2026-09-05','06:55:40',1788598207046,'HADIR','QR',NULL,NULL,1,'SENT',1788598207046);
INSERT INTO `AttendanceRecord` (`id`,`personId`,`activityId`,`dateString`,`timeString`,`timestamp`,`status`,`method`,`remarks`,`recordedByAdminId`,`waNotificationSent`,`waNotificationStatus`,`createdAt`) VALUES ('cmto56x9o0013po05d77c03rb','cmto56ugr000gpo05fg2pr60i','cmto56s8h0002po05iidhhw46','2026-09-05','06:48:20',1788598207213,'HADIR','RFID',NULL,NULL,1,'SENT',1788598207213);
INSERT INTO `AttendanceRecord` (`id`,`personId`,`activityId`,`dateString`,`timeString`,`timestamp`,`status`,`method`,`remarks`,`recordedByAdminId`,`waNotificationSent`,`waNotificationStatus`,`createdAt`) VALUES ('cmto56xe30015po05tzqb65n4','cmto56uqd000ipo05f9ppmta7','cmto56s8h0002po05iidhhw46','2026-09-05','06:40:05',1788598207371,'HADIR','RFID',NULL,NULL,1,'SENT',1788598207371);
INSERT INTO `AttendanceRecord` (`id`,`personId`,`activityId`,`dateString`,`timeString`,`timestamp`,`status`,`method`,`remarks`,`recordedByAdminId`,`waNotificationSent`,`waNotificationStatus`,`createdAt`) VALUES ('cmto56xj40017po050kcg405w','cmto56uv6000jpo05twal5ky6','cmto56s8h0002po05iidhhw46','2026-09-05','06:45:30',1788598207553,'HADIR','RFID',NULL,NULL,1,'SENT',1788598207553);
INSERT INTO `AttendanceRecord` (`id`,`personId`,`activityId`,`dateString`,`timeString`,`timestamp`,`status`,`method`,`remarks`,`recordedByAdminId`,`waNotificationSent`,`waNotificationStatus`,`createdAt`) VALUES ('cmto56xox0019po05jls09nqm','cmto56uzj000kpo05checkhbh','cmto56s8h0002po05iidhhw46','2026-09-05','07:22:15',1788598207761,'TERLAMBAT','RFID','Terlambat 7 menit dari batas toleransi',NULL,1,'SENT',1788598207761);
INSERT INTO `AttendanceRecord` (`id`,`personId`,`activityId`,`dateString`,`timeString`,`timestamp`,`status`,`method`,`remarks`,`recordedByAdminId`,`waNotificationSent`,`waNotificationStatus`,`createdAt`) VALUES ('cmto56xtd001bpo05aax56p9b','cmto56v3x000lpo05nhhgw7xd','cmto56s8h0002po05iidhhw46','2026-09-05','07:28:40',1788598207922,'TERLAMBAT','QR','Kendala transportasi',NULL,1,'SENT',1788598207922);
INSERT INTO `AttendanceRecord` (`id`,`personId`,`activityId`,`dateString`,`timeString`,`timestamp`,`status`,`method`,`remarks`,`recordedByAdminId`,`waNotificationSent`,`waNotificationStatus`,`createdAt`) VALUES ('cmto56xxz001dpo050b6r5zld','cmto56vcy000mpo05qy2nxlgl','cmto56s8h0002po05iidhhw46','2026-09-05','07:05:00',1788598208088,'IZIN','MANUAL','Izin mengikuti lomba sains tingkat kota','cmto56rzy0000po0505oslhly',1,'SENT',1788598208088);
INSERT INTO `AttendanceRecord` (`id`,`personId`,`activityId`,`dateString`,`timeString`,`timestamp`,`status`,`method`,`remarks`,`recordedByAdminId`,`waNotificationSent`,`waNotificationStatus`,`createdAt`) VALUES ('cmto56y2u001fpo0586qx5nn3','cmto56vkq000npo05pemk6p9n','cmto56s8h0002po05iidhhw46','2026-09-05','07:10:00',1788598208262,'SAKIT','MANUAL','Surat dokter terlampir demam','cmto56s3t0001po05qxw6v326',1,'SENT',1788598208262);
INSERT INTO `AttendanceRecord` (`id`,`personId`,`activityId`,`dateString`,`timeString`,`timestamp`,`status`,`method`,`remarks`,`recordedByAdminId`,`waNotificationSent`,`waNotificationStatus`,`createdAt`) VALUES ('cmto56y7h001hpo05k0ed0hiv','cmto56w6n000rpo05eontwg1b','cmto56s8h0002po05iidhhw46','2026-09-05','06:50:12',1788598208429,'HADIR','RFID',NULL,NULL,1,'SENT',1788598208429);
INSERT INTO `AttendanceRecord` (`id`,`personId`,`activityId`,`dateString`,`timeString`,`timestamp`,`status`,`method`,`remarks`,`recordedByAdminId`,`waNotificationSent`,`waNotificationStatus`,`createdAt`) VALUES ('cmto56yc4001jpo053ithh9es','cmto56wb9000spo05r1rwfj8q','cmto56s8h0002po05iidhhw46','2026-09-05','06:52:45',1788598208597,'HADIR','RFID',NULL,NULL,1,'SENT',1788598208597);

DROP TABLE IF EXISTS `WaGatewayConfig`;
CREATE TABLE IF NOT EXISTS WaGatewayConfig (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  provider VARCHAR(191) NOT NULL DEFAULT 'FONNTE',
  apiKey TEXT NULL,
  authKey TEXT NULL,
  endpointUrl VARCHAR(191) NOT NULL DEFAULT 'https://api.fonnte.com/send',
  method VARCHAR(191) NOT NULL DEFAULT 'POST',
  customHeadersJson TEXT NULL,
  customBodyMappingJson TEXT NULL,
  isEnabled TINYINT(1) NOT NULL DEFAULT 0,
  senderNumber VARCHAR(191) NULL,
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data untuk tabel WaGatewayConfig (1 baris)
INSERT INTO `WaGatewayConfig` (`id`,`provider`,`apiKey`,`authKey`,`endpointUrl`,`method`,`customHeadersJson`,`customBodyMappingJson`,`isEnabled`,`senderNumber`,`updatedAt`) VALUES ('default','FONNTE','',NULL,'https://api.fonnte.com/send','POST',NULL,NULL,0,NULL,1788598202601);

DROP TABLE IF EXISTS `WaTemplate`;
CREATE TABLE IF NOT EXISTS WaTemplate (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  status VARCHAR(191) NOT NULL UNIQUE,
  contentTemplate TEXT NOT NULL,
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data untuk tabel WaTemplate (7 baris)
INSERT INTO `WaTemplate` (`id`,`status`,`contentTemplate`,`updatedAt`) VALUES ('cmto56sl60005po05pupwqesu','HADIR','Assalamu\'alaikum wr. wb. Menginformasikan bahwa ananda *{nama}* ({kelas}) telah tercatat hadir di *{nama_sekolah}* pada kegiatan *{nama_kegiatan}* pukul {waktu} WIB ({tanggal}). Status: *HADIR TEPAT WAKTU*. Terima kasih atas kerjasamanya.',1788598201147);
INSERT INTO `WaTemplate` (`id`,`status`,`contentTemplate`,`updatedAt`) VALUES ('cmto56sr50006po05v1dakmul','TERLAMBAT','Pemberitahuan dari *{nama_sekolah}*: Ananda *{nama}* ({kelas}) tercatat *TERLAMBAT* mengikuti *{nama_kegiatan}* pada pukul {waktu} WIB ({tanggal}). Mohon bimbingan orang tua/wali untuk meningkatkan kedisiplinan ananda.',1788598201361);
INSERT INTO `WaTemplate` (`id`,`status`,`contentTemplate`,`updatedAt`) VALUES ('cmto56sxi0007po058xxbsbwj','IZIN','Informasi Presensi *{nama_sekolah}*: Ananda *{nama}* ({kelas}) tercatat berstatus *IZIN* pada *{nama_kegiatan}* tanggal {tanggal}. Keterangan: {status}.',1788598201591);
INSERT INTO `WaTemplate` (`id`,`status`,`contentTemplate`,`updatedAt`) VALUES ('cmto56t2t0008po05zfoxq31w','SAKIT','Informasi Presensi *{nama_sekolah}*: Ananda *{nama}* ({kelas}) tercatat berstatus *SAKIT* pada *{nama_kegiatan}* tanggal {tanggal}. Semoga ananda lekas pulih dan dapat beraktivitas kembali seperti sedia kala.',1788598201782);
INSERT INTO `WaTemplate` (`id`,`status`,`contentTemplate`,`updatedAt`) VALUES ('cmto56t980009po059k72x21w','ALPA','PERINGATAN DARI *{nama_sekolah}*: Ananda *{nama}* ({kelas}) tercatat *ALPA (Tanpa Keterangan)* pada kegiatan *{nama_kegiatan}* tanggal {tanggal}. Mohon segera konfirmasi ke pihak sekolah/wali kelas.',1788598202012);
INSERT INTO `WaTemplate` (`id`,`status`,`contentTemplate`,`updatedAt`) VALUES ('cmto56te3000apo05tqhdyr69','BOLOS','PERINGATAN KHUSUS *{nama_sekolah}*: Siswa ananda *{nama}* ({kelas}) tercatat *BOLOS / TIDAK MENGIKUTI KEGIATAN* *{nama_kegiatan}* pada tanggal {tanggal}. Mohon konfirmasi mendesak ke kantor Tata Usaha.',1788598202188);
INSERT INTO `WaTemplate` (`id`,`status`,`contentTemplate`,`updatedAt`) VALUES ('cmto56tkl000bpo05kcu9g6e2','DINAS_LUAR','Informasi Kedinasan *{nama_sekolah}*: {nama} ({jabatan}) tercatat berstatus *DINAS LUAR* pada {nama_kegiatan} tanggal {tanggal}.',1788598202422);

DROP TABLE IF EXISTS `AuditLog`;
CREATE TABLE IF NOT EXISTS AuditLog (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  adminId VARCHAR(191) NULL,
  adminName VARCHAR(191) NOT NULL,
  action VARCHAR(191) NOT NULL,
  target VARCHAR(191) NOT NULL,
  details TEXT NULL,
  ipAddress VARCHAR(191) NULL,
  timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_audit_admin FOREIGN KEY (adminId) REFERENCES Admin(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data untuk tabel AuditLog (1 baris)
INSERT INTO `AuditLog` (`id`,`adminId`,`adminName`,`action`,`target`,`details`,`ipAddress`,`timestamp`) VALUES ('cmto56ygi001lpo05cimzo4yu','cmto56rzy0000po0505oslhly','Super Administrator','SYSTEM_INITIALIZE','SYSTEM','Inisialisasi sistem presensi dan data awal sekolah',NULL,1788598208755);

SET FOREIGN_KEY_CHECKS=1;
