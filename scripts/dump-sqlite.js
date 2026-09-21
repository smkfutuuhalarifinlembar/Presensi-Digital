// scripts/dump-sqlite.js
// Mengkonversi SQLite ke file SQL (CREATE TABLE + INSERT) untuk XAMPP/MySQL.
// Usage: node scripts/dump-sqlite.js
const fs = require("fs");
const path = require("path");

// Try to load the Prisma client
let Database;
try {
  Database = require("better-sqlite3");
} catch (e) {
  console.error("Install better-sqlite3 first: npm i -D better-sqlite3");
  process.exit(1);
}

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
if (!fs.existsSync(dbPath)) {
  console.error("Database tidak ditemukan:", dbPath);
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

// Mapping Prisma table names
const TABLES = [
  "SchoolSetting",
  "Admin",
  "Person",
  "Activity",
  "AttendanceRecord",
  "WaGatewayConfig",
  "WaTemplate",
  "AuditLog",
];

// MySQL CREATE TABLE statements (disesuaikan dari Prisma schema)
const CREATE_MYSQL = {
  SchoolSetting: `CREATE TABLE IF NOT EXISTS SchoolSetting (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  Admin: `CREATE TABLE IF NOT EXISTS Admin (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  username VARCHAR(191) NOT NULL UNIQUE,
  passwordHash VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  role VARCHAR(191) NOT NULL DEFAULT 'ADMIN_OPERATOR',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  Person: `CREATE TABLE IF NOT EXISTS Person (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  Activity: `CREATE TABLE IF NOT EXISTS Activity (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  AttendanceRecord: `CREATE TABLE IF NOT EXISTS AttendanceRecord (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  WaGatewayConfig: `CREATE TABLE IF NOT EXISTS WaGatewayConfig (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  WaTemplate: `CREATE TABLE IF NOT EXISTS WaTemplate (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  status VARCHAR(191) NOT NULL UNIQUE,
  contentTemplate TEXT NOT NULL,
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  AuditLog: `CREATE TABLE IF NOT EXISTS AuditLog (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  adminId VARCHAR(191) NULL,
  adminName VARCHAR(191) NOT NULL,
  action VARCHAR(191) NOT NULL,
  target VARCHAR(191) NOT NULL,
  details TEXT NULL,
  ipAddress VARCHAR(191) NULL,
  timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_audit_admin FOREIGN KEY (adminId) REFERENCES Admin(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
};

function escape(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "bigint") return v.toString();
  const s = String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  return `'${s}'`;
}

const out = [];
out.push("-- ==================================================");
out.push("-- Presensi Digital Sekolah - SQL Dump");
out.push("-- Compatible with MySQL / MariaDB (XAMPP)");
out.push("-- Generated: " + new Date().toISOString());
out.push("-- ==================================================");
out.push("SET FOREIGN_KEY_CHECKS=0;");
out.push("");

for (const tbl of TABLES) {
  out.push("DROP TABLE IF EXISTS `" + tbl + "`;");
  out.push(CREATE_MYSQL[tbl]);
  out.push("");

  const rows = db.prepare(`SELECT * FROM "${tbl}"`).all();
  if (rows.length > 0) {
    const cols = Object.keys(rows[0]);
    out.push("-- Data untuk tabel " + tbl + " (" + rows.length + " baris)");
    for (const r of rows) {
      const vals = cols.map((c) => escape(r[c]));
      out.push(`INSERT INTO \`${tbl}\` (\`${cols.join("`,`")}\`) VALUES (${vals.join(",")});`);
    }
    out.push("");
  }
}

out.push("SET FOREIGN_KEY_CHECKS=1;");
out.push("");

const outPath = path.join(process.cwd(), "prisma", "presensi-digital.sql");
fs.writeFileSync(outPath, out.join("\n"), "utf8");
console.log("✅ SQL Dump berhasil dibuat:", outPath);
console.log("   Total baris INSERT:");
for (const tbl of TABLES) {
  const n = db.prepare(`SELECT COUNT(*) AS c FROM "${tbl}"`).get().c;
  console.log(`   - ${tbl}: ${n}`);
}
db.close();
