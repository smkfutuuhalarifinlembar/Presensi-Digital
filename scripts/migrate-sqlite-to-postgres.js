// scripts/migrate-sqlite-to-postgres.js
//
// Migrasi seluruh data dari database SQLite lama (`prisma/dev.db`) ke PostgreSQL
// yang ditentukan oleh DATABASE_URL pada file `.env`.
//
// Pemakaian:
//   node scripts/migrate-sqlite-to-postgres.js --dry-run    # lihat rencana saja
//   node scripts/migrate-sqlite-to-postgres.js              # jalankan migrasi
//   node scripts/migrate-sqlite-to-postgres.js --file=dev.db
//
// Catatan:
//  - Jalankan `npx prisma db push` lebih dulu supaya tabel di PostgreSQL sudah ada.
//  - Data di PostgreSQL TIDAK dihapus. Baris dengan ID yang sudah ada akan
//    dilewati (skipDuplicates), jadi script aman dijalankan berulang kali.
//  - Relasi yatim (foreign key menunjuk data yang tidak ada) otomatis dilewati
//    dan dicatat pada ringkasan akhir.
const fs = require("fs");
const path = require("path");

// ----------------------------------------------------------------- CLI args
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fileArg = args.find((a) => a.startsWith("--file="));

const sqlitePath = path.resolve(
  process.cwd(),
  fileArg ? fileArg.slice("--file=".length) : path.join("prisma", "dev.db")
);

// -------------------------------------------------------- pembaca file .env
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env"));

// ------------------------------------------------------------- daftar model
// Urutan penting: tabel induk harus dimigrasi sebelum tabel anak.
//   clientKey : nama model pada Prisma Client
//   dates     : kolom DateTime (SQLite menyimpan sebagai epoch milidetik)
//   booleans  : kolom Boolean (SQLite menyimpan sebagai 0/1)
//   relations : kolom foreign key -> [model tujuan, wajib ada?]
const MODELS = [
  {
    name: "Institution",
    clientKey: "institution",
    dates: ["createdAt", "updatedAt"],
    booleans: ["isActive"],
    relations: {},
  },
  {
    name: "Admin",
    clientKey: "admin",
    dates: ["createdAt", "updatedAt"],
    booleans: [],
    relations: {},
  },
  {
    name: "Person",
    clientKey: "person",
    dates: ["createdAt", "updatedAt"],
    booleans: ["isActive"],
    relations: { institutionId: ["Institution", false] },
  },
  {
    name: "Activity",
    clientKey: "activity",
    dates: ["createdAt", "updatedAt"],
    booleans: ["isActive"],
    relations: { institutionId: ["Institution", false] },
  },
  {
    name: "AttendanceRecord",
    clientKey: "attendanceRecord",
    dates: ["timestamp", "createdAt"],
    booleans: ["waNotificationSent"],
    relations: {
      personId: ["Person", true],
      activityId: ["Activity", true],
      recordedByAdminId: ["Admin", false],
    },
  },
  {
    name: "NotificationLog",
    clientKey: "notificationLog",
    dates: ["sentAt", "completedAt", "createdAt", "updatedAt"],
    booleans: [],
    relations: { attendanceId: ["AttendanceRecord", true] },
  },
  {
    name: "SchoolSetting",
    clientKey: "schoolSetting",
    dates: ["updatedAt"],
    booleans: ["useSameBackBg", "yayasanEnabled"],
    relations: {},
  },
  {
    name: "Holiday",
    clientKey: "holiday",
    dates: ["createdAt", "updatedAt"],
    booleans: ["isActive"],
    relations: {},
  },
  {
    name: "WaGatewayConfig",
    clientKey: "waGatewayConfig",
    dates: ["updatedAt"],
    booleans: ["isEnabled"],
    relations: {},
  },
  {
    name: "WaTemplate",
    clientKey: "waTemplate",
    dates: ["updatedAt"],
    booleans: [],
    relations: {},
  },
  {
    name: "LeaveRequest",
    clientKey: "leaveRequest",
    dates: ["submittedAt", "reviewedAt", "createdAt", "updatedAt"],
    booleans: [],
    relations: { personId: ["Person", true] },
  },
  {
    name: "LeaveSetting",
    clientKey: "leaveSetting",
    dates: ["updatedAt"],
    booleans: [
      "isEnabled",
      "requireProof",
      "requireParentPhoto",
      "requireSignature",
      "notifyParent",
      "notifyWaliKelas",
      "autoCreateAttendance",
      "autoApprove",
      "driveEnabled",
    ],
    relations: {},
  },
  {
    name: "AuditLog",
    clientKey: "auditLog",
    dates: ["timestamp"],
    booleans: [],
    relations: { adminId: ["Admin", false] },
  },
];

// ---------------------------------------------------------------- utilitas
function openSqliteDatabase(file) {
  try {
    const Database = require("better-sqlite3");
    return new Database(file, { readonly: true });
  } catch (primaryError) {
    try {
      // Node.js 22+ menyediakan SQLite bawaan sebagai cadangan.
      const { DatabaseSync } = require("node:sqlite");
      return new DatabaseSync(file, { readOnly: true });
    } catch {
      console.error("❌ Tidak bisa membuka file SQLite.");
      console.error("   Install dulu: npm install --save-dev better-sqlite3");
      console.error("   Detail:", primaryError.message);
      process.exit(1);
    }
  }
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

/** Ambil daftar kolom & kolom id dari Prisma DMMF (sumber kebenaran schema). */
function getModelMeta(modelName) {
  try {
    const dmmf = require("@prisma/client").Prisma.dmmf;
    const model = dmmf.datamodel.models.find((m) => m.name === modelName);
    if (!model) return null;
    const idField = model.fields.find((f) => f.isId);
    return {
      scalars: new Set(
        model.fields.filter((f) => f.kind === "scalar").map((f) => f.name)
      ),
      idField: idField ? idField.name : "id",
    };
  } catch {
    return null;
  }
}

/** SQLite menyimpan DateTime sebagai epoch milidetik, bisa juga berupa teks. */
function toDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value === "bigint") return new Date(Number(value));
  if (typeof value === "number") return new Date(value);

  const text = String(value).trim();
  if (/^\d+$/.test(text)) return new Date(Number(text));

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** SQLite menyimpan Boolean sebagai 0/1. */
function toBoolean(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value).trim().toLowerCase();
  return !["", "0", "false", "null", "none"].includes(text);
}

// -------------------------------------------------------------------- main
let sqlite = null;
let prisma = null;

async function main() {
  console.log("=======================================================");
  console.log("  MIGRASI DATA: SQLite  ->  PostgreSQL");
  console.log("-------------------------------------------------------");
  console.log("  Sumber SQLite : " + sqlitePath);
  console.log("  Tujuan        : " + (process.env.DATABASE_URL || "(DATABASE_URL belum diisi!)"));
  console.log("  Mode          : " + (dryRun ? "DRY RUN (tidak menulis data)" : "MIGRASI (menulis data)"));
  console.log("=======================================================\n");

  if (!fs.existsSync(sqlitePath)) {
    console.error("❌ File SQLite tidak ditemukan: " + sqlitePath);
    console.error("   Jalankan dari folder project, atau tentukan path: --file=<lokasi/dev.db>");
    process.exit(1);
  }

  if (!dryRun) {
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL belum diisi pada file .env");
      process.exit(1);
    }
    const { PrismaClient } = require("@prisma/client");
    prisma = new PrismaClient();
  }

  sqlite = openSqliteDatabase(sqlitePath);

  const tables = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all()
    .map((row) => row.name);

  const idSets = {}; // kumpulan id per model (dipakai untuk validasi foreign key)
  const summary = { table: [], inserted: 0, skipped: 0 };

  for (const model of MODELS) {
    const table = model.name;

    if (!tables.includes(table)) {
      console.log(`→ ${table.padEnd(18)} : dilewati (tabel belum ada di SQLite lama)`);
      continue;
    }

    const sqliteColumns = sqlite
      .prepare(`PRAGMA table_info(${quoteIdent(table)})`)
      .all()
      .map((column) => column.name);

    const meta = getModelMeta(table);
    const allowed = meta ? meta.scalars : new Set(sqliteColumns);
    const idField = meta ? meta.idField : "id";

    const staleColumns = meta
      ? sqliteColumns.filter((column) => !allowed.has(column))
      : [];
    if (staleColumns.length > 0) {
      console.log(
        `  ℹ️  ${table}: kolom lama yang dilewati -> ${staleColumns.join(", ")}`
      );
    }

    const rows = sqlite.prepare(`SELECT * FROM ${quoteIdent(table)}`).all();
    const data = [];

    for (const row of rows) {
      const record = {};

      // 1) Ambil hanya kolom yang dikenal schema Prisma saat ini
      for (const column of sqliteColumns) {
        if (allowed.has(column)) record[column] = row[column];
      }

      // 2) Konversi tipe data
      for (const column of model.dates) {
        if (column in record) record[column] = toDate(record[column]);
      }
      for (const column of model.booleans) {
        if (column in record) record[column] = toBoolean(record[column]);
      }

      // 3) Validasi relasi (foreign key)
      let valid = true;
      for (const [column, [target, required]] of Object.entries(model.relations)) {
        const value = record[column];
        const empty = value === null || value === undefined || value === "";

        if (empty) {
          if (required) {
            console.log(`  ⚠️  ${table}.${column} kosong (wajib) -> baris dilewati`);
            summary.skipped += 1;
            valid = false;
            break;
          }
          record[column] = null;
          continue;
        }

        if (idSets[target] && !idSets[target].has(value)) {
          if (required) {
            console.log(`  ⚠️  ${table}.${column} = "${value}" tidak ada di ${target} -> baris dilewati`);
            summary.skipped += 1;
            valid = false;
            break;
          }
          record[column] = null;
        }
      }

      if (!valid) continue;
      data.push(record);
    }

    idSets[table] = new Set(rows.map((row) => row[idField]).filter(Boolean));

    if (dryRun) {
      console.log(
        `→ ${table.padEnd(18)} : ${data.length} baris siap dimigrasi (SQLite: ${rows.length} baris)`
      );
      summary.table.push({ table, rows: data.length });
      continue;
    }

    if (data.length === 0) {
      console.log(`→ ${table.padEnd(18)} : tidak ada data`);
      continue;
    }

    const result = await prisma[model.clientKey].createMany({
      data,
      skipDuplicates: true,
    });

    summary.inserted += result.count;
    summary.table.push({ table, rows: result.count });
    console.log(
      `→ ${table.padEnd(18)} : ${result.count} baris dimasukkan (SQLite: ${rows.length} baris)`
    );
  }

  console.log("\n=======================================================");
  if (dryRun) {
    console.log("  DRY RUN selesai — tidak ada data yang ditulis.");
    console.log("  Jalankan tanpa --dry-run untuk benar-benar memigrasi.");
  } else {
    console.log(`  SELESAI. Total ${summary.inserted} baris berhasil dimigrasi.`);
    if (summary.skipped > 0) {
      console.log(`  ${summary.skipped} baris dilewati karena relasi tidak valid.`);
    }
    console.log("  Baris dengan ID yang sudah ada di PostgreSQL otomatis dilewati.");
  }
  console.log("=======================================================\n");
}

main()
  .catch((error) => {
    console.error("\n❌ Migrasi gagal:", error && error.message ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (sqlite && typeof sqlite.close === "function") sqlite.close();
    } catch {}
    try {
      if (prisma) await prisma.$disconnect();
    } catch {}
  });


