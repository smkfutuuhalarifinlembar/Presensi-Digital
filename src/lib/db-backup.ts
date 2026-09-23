import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { prisma } from "@/lib/prisma";

/**
 * Backup & restore database yang mendukung PostgreSQL maupun SQLite.
 *
 *  - PostgreSQL :
 *      1. Memakai `pg_dump` (backup) dan `psql` (restore) BILA tersedia di server
 *         (mis. VPS setelah `apt install postgresql-client`).
 *      2. Bila tidak tersedia — seperti di hosting serverless (Vercel) yang tidak
 *         punya binari pg_dump/psql — otomatis memakai MODE INTERNAL murni
 *         JavaScript: data dibaca lewat Prisma lalu ditulis sebagai file .sql
 *         berisi perintah `DELETE` + `INSERT` standar PostgreSQL.
 *         File hasil mode internal tetap bisa dipulihkan lewat menu Restore
 *         maupun manual: `psql "$DATABASE_URL" -f Backup_Presensi_xxx.sql`.
 *  - SQLite     : menyalin file `dev.db`.
 */

/** Penanda file dump buatan aplikasi (mode internal tanpa pg_dump). */
export const JS_DUMP_MARKER = "-- PRESENSI-DIGITAL-DUMP v1";

export type DatabaseKind = "postgresql" | "sqlite";

export function getDatabaseKind(): DatabaseKind {
  return /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL || "")
    ? "postgresql"
    : "sqlite";
}

/**
 * Folder penyimpanan backup otomatis (safety backup).
 * Di Vercel folder project bersifat read-only, jadi bila `backups/` tidak bisa
 * dibuat kita jatuh ke folder sementara sistem (os.tmpdir()).
 */
function backupsDirectory(): string {
  const candidates = [
    path.join(process.cwd(), "backups"),
    path.join(os.tmpdir(), "presensi-backups"),
  ];
  for (const dir of candidates) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      return dir;
    } catch {
      // lanjut ke kandidat berikutnya
    }
  }
  return os.tmpdir();
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");
}

/** Error khusus bila binari (pg_dump/psql) tidak tersedia di server. */
function missingToolError(command: string): Error & { toolMissing?: string } {
  const err: any = new Error(
    `Perintah "${command}" tidak tersedia di server ini (hosting serverless tanpa PostgreSQL client).`
  );
  err.code = "ENOENT";
  err.toolMissing = command;
  return err;
}

/** Jalankan perintah dan ambil stdout sebagai Buffer. */
function runCapture(command: string, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    const chunks: Buffer[] = [];
    let stderr = "";

    child.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err: any) => {
      if (err?.code === "ENOENT") {
        reject(missingToolError(command));
        return;
      }
      reject(err);
    });

    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(stderr.trim() || `${command} gagal (kode ${code})`));
    });
  });
}

/** Jalankan perintah dengan data pada stdin. */
function runWithInput(
  command: string,
  args: string[],
  input: Buffer
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err: any) => {
      if (err?.code === "ENOENT") {
        reject(missingToolError(command));
        return;
      }
      reject(err);
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `${command} gagal (kode ${code})`));
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

/* ============================================================
   MODE INTERNAL — dump & restore tanpa pg_dump / psql
   ============================================================ */

/** Bungkus nama tabel/kolom dengan tanda kutip ganda agar aman. */
function quoteIdent(name: string): string {
  return `"${String(name).replace(/"/g, '""')}"`;
}

/** Ubah nilai JavaScript menjadi literal SQL PostgreSQL. */
function toSqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (Buffer.isBuffer(value)) return `'\\x${value.toString("hex")}'`;
  if (typeof value === "object") {
    // Decimal / tipe khusus Prisma
    if (typeof (value as any).toFixed === "function") return String(value);
    const text = String(value);
    if (text === "[object Object]") {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }
    return `'${text.replace(/'/g, "''")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** Pecah skrip SQL menjadi perintah-perintah (menghormati string & komentar). */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inString = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (inString) {
      if (ch === "'") {
        if (sql[i + 1] === "'") {
          current += "''";
          i++;
        } else {
          inString = false;
          current += ch;
        }
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      current += ch;
      continue;
    }

    // Komentar baris "-- ..." diabaikan
    if (ch === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      current += "\n";
      continue;
    }

    if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

/**
 * Urutan tabel yang aman: tabel induk lebih dulu, lalu tabel anak
 * (mengikuti relasi Foreign Key).
 */
async function orderedTables(): Promise<string[]> {
  const tableRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`
  );
  const names = tableRows.map((r) => String(r.table_name)).filter(Boolean);

  const fkRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT tc.table_name AS child, ccu.table_name AS parent
       FROM information_schema.table_constraints tc
       JOIN information_schema.constraint_column_usage ccu
         ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'`
  );

  const parentsOf = new Map<string, Set<string>>();
  for (const name of names) parentsOf.set(name, new Set());
  for (const row of fkRows) {
    const child = String(row.child);
    const parent = String(row.parent);
    if (parentsOf.has(child) && child !== parent) {
      parentsOf.get(child)!.add(parent);
    }
  }

  const ordered: string[] = [];
  const remaining = new Set(names);

  while (remaining.size > 0) {
    const ready = [...remaining].filter((table) =>
      [...(parentsOf.get(table) || [])].every((parent) => !remaining.has(parent))
    );
    // Bila ada relasi melingkar, sisanya dipaksa keluar agar tidak looping
    const batch = (ready.length > 0 ? ready : [...remaining]).sort();
    for (const table of batch) {
      ordered.push(table);
      remaining.delete(table);
    }
  }

  return ordered;
}

/** Daftar kolom sebuah tabel sesuai urutan aslinya. */
async function columnsOf(tableName: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
    tableName
  );
  return rows.map((r) => String(r.column_name)).filter(Boolean);
}

/** Jumlah baris per perintah INSERT (mempercepat restore & memperkecil file). */
const MAX_ROWS_PER_INSERT = 100;
/** Batas panjang satu perintah INSERT agar tetap wajar. */
const MAX_STATEMENT_CHARS = 200_000;

/** Buat file .sql dari isi database memakai Prisma (tanpa binari pg_dump). */
async function createInternalSqlDump(): Promise<Buffer> {
  const tables = await orderedTables();
  const lines: string[] = [];

  lines.push(JS_DUMP_MARKER);
  lines.push("-- Dibuat otomatis oleh aplikasi Presensi Digital (mode internal).");
  lines.push(`-- Waktu : ${new Date().toISOString()}`);
  lines.push("-- Jenis : PostgreSQL");
  lines.push(`-- Tabel : ${tables.length}`);
  lines.push("-- Cara restore:");
  lines.push("--   1) Panel admin > Backup & Restore > Restore Database > unggah file ini");
  lines.push('--   2) Terminal     : psql "$DATABASE_URL" -f <nama-file-ini>.sql');
  lines.push("-- Catatan: file ini berisi DATA saja (DELETE + INSERT), bukan struktur tabel.");
  lines.push('--          Struktur tabel dibuat dengan perintah "npx prisma db push".');
  lines.push("");
  lines.push("BEGIN;");
  lines.push("SET client_encoding = 'UTF8';");
  lines.push("SET standard_conforming_strings = on;");
  lines.push("");

  lines.push("-- ===== Hapus data lama (urutan anak ke induk) =====");
  for (const table of [...tables].reverse()) {
    lines.push(`DELETE FROM ${quoteIdent(table)};`);
  }
  lines.push("");

  let totalRows = 0;
  let dumpedTables = 0;

  for (const table of tables) {
    const columns = await columnsOf(table);
    if (columns.length === 0) continue;

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM ${quoteIdent(table)}`
    );
    if (!Array.isArray(rows) || rows.length === 0) continue;

    dumpedTables++;
    lines.push(`-- ===== ${table} (${rows.length} baris) =====`);
    const columnList = columns.map(quoteIdent).join(", ");

    // Kumpulkan semua baris sebagai tuple nilai SQL
    const tuples: string[] = [];
    for (const row of rows) {
      const values = columns.map((col) => toSqlLiteral(row[col])).join(", ");
      tuples.push(`(${values})`);
      totalRows++;
    }

    // Gabungkan beberapa baris per perintah INSERT (jauh lebih cepat saat restore)
    const prefix = `INSERT INTO ${quoteIdent(table)} (${columnList}) VALUES `;
    let chunk: string[] = [];
    let chunkLength = prefix.length;

    const flush = () => {
      if (chunk.length === 0) return;
      lines.push(prefix + chunk.join(", ") + ";");
      chunk = [];
      chunkLength = prefix.length;
    };

    for (const tuple of tuples) {
      if (
        chunk.length >= MAX_ROWS_PER_INSERT ||
        chunkLength + tuple.length + 2 > MAX_STATEMENT_CHARS
      ) {
        flush();
      }
      chunk.push(tuple);
      chunkLength += tuple.length + 2;
    }
    flush();

    lines.push("");
  }

  lines.push("COMMIT;");
  lines.push("");
  lines.push(`-- SELESAI: ${totalRows} baris dari ${dumpedTables} tabel.`);

  return Buffer.from(lines.join("\n"), "utf8");
}

/** Pulihkan database dari file .sql buatan sendiri, dalam satu transaksi. */
async function executeInternalDump(sql: string): Promise<void> {
  const statements = splitSqlStatements(sql).filter((statement) => {
    const upper = statement.trim().toUpperCase();
    // Perintah kontrol transaksi & sesi diabaikan (transaksi diatur Prisma)
    if (upper === "BEGIN" || upper === "COMMIT" || upper === "START TRANSACTION") {
      return false;
    }
    if (upper.startsWith("SET ")) return false;
    return upper.length > 0;
  });

  if (statements.length === 0) {
    throw new Error("File .sql tidak memuat perintah yang bisa dijalankan.");
  }

  await prisma.$transaction(
    async (tx) => {
      for (const statement of statements) {
        await tx.$executeRawUnsafe(statement);
      }
    },
    { timeout: 10 * 60 * 1000, maxWait: 30 * 1000 }
  );
}

export interface DatabaseDump {
  filename: string;
  buffer: Buffer;
}

/** Buat file backup database sesuai jenis database yang aktif. */
export async function createDatabaseDump(): Promise<DatabaseDump> {
  if (getDatabaseKind() === "postgresql") {
    const filename = `Backup_Presensi_${timestamp()}.sql`;

    // 1) Utamakan pg_dump bila tersedia (dump paling lengkap: struktur + data)
    try {
      const buffer = await runCapture("pg_dump", [
        "--no-owner",
        "--no-privileges",
        "--clean",
        "--if-exists",
        `--dbname=${process.env.DATABASE_URL as string}`,
      ]);
      return { filename, buffer };
    } catch (err: any) {
      if (err?.toolMissing) {
        console.warn(
          "pg_dump tidak tersedia di server — memakai mode dump internal (tanpa binari)."
        );
      } else {
        console.warn(
          "pg_dump gagal — memakai mode dump internal:",
          err?.message || err
        );
      }
    }

    // 2) Mode internal: jalan tanpa pg_dump (mis. Vercel / serverless)
    const buffer = await createInternalSqlDump();
    return { filename, buffer };
  }

  const dbPath = path.join(process.cwd(), "dev.db");
  if (!fs.existsSync(dbPath)) {
    throw new Error("File database SQLite (dev.db) tidak ditemukan.");
  }
  return {
    filename: `Backup_Presensi_${timestamp()}.db`,
    buffer: fs.readFileSync(dbPath),
  };
}

/**
 * Pulihkan database dari file backup.
 * Database saat ini otomatis di-backup lebih dulu ke folder `backups/`.
 */
export async function restoreDatabaseDump(
  fileName: string,
  buffer: Buffer
): Promise<{ safetyBackup: string | null }> {
  const extension = path.extname(fileName).toLowerCase();

  if (getDatabaseKind() === "postgresql") {
    if (extension !== ".sql") {
      throw new Error(
        "Untuk PostgreSQL, file backup harus berformat .sql (hasil tombol Backup / pg_dump). File .db hanya berlaku untuk SQLite."
      );
    }

    const url = process.env.DATABASE_URL as string;

    // Simpan backup pengaman sebelum menimpa data
    let safetyBackup: string | null = null;
    try {
      const current = await createDatabaseDump();
      const safetyPath = path.join(
        backupsDirectory(),
        `auto_backup_${timestamp()}.sql`
      );
      fs.writeFileSync(safetyPath, current.buffer);
      safetyBackup = safetyPath;
    } catch {
      safetyBackup = null;
    }

    const text = buffer.toString("utf8");

    // A) File hasil tombol Backup aplikasi (mode internal) → dipulihkan via Prisma,
    //    tidak butuh binari psql sehingga tetap jalan di Vercel/serverless.
    if (text.includes(JS_DUMP_MARKER)) {
      await executeInternalDump(text);
      return { safetyBackup };
    }

    // B) Dump asli pg_dump → pemulihannya butuh binari `psql`
    try {
      await runWithInput(
        "psql",
        [`--dbname=${url}`, "-v", "ON_ERROR_STOP=1", "--quiet"],
        buffer
      );
    } catch (err: any) {
      if (err?.toolMissing) {
        throw new Error(
          'File yang diunggah adalah dump asli pg_dump (bukan hasil tombol "Unduh Backup Sekarang"), sehingga pemulihannya memerlukan perintah "psql" di server — dan server ini tidak menyediakannya (umum di Vercel/serverless). Solusi: unduh ulang backup lewat tombol "Unduh Backup Sekarang" pada versi terbaru (file .sql kompatibel tanpa binari), atau restore file pg_dump ini lewat terminal VPS: psql "$DATABASE_URL" -f namafile.sql'
        );
      }
      throw err;
    }

    return { safetyBackup };
  }

  if (![".db", ".sqlite", ".sqlite3"].includes(extension)) {
    throw new Error("Format file tidak valid. Gunakan file .db (SQLite).");
  }

  const dbPath = path.join(process.cwd(), "dev.db");
  let safetyBackup: string | null = null;

  if (fs.existsSync(dbPath)) {
    const safetyPath = path.join(
      backupsDirectory(),
      `auto_backup_${timestamp()}.db`
    );
    fs.copyFileSync(dbPath, safetyPath);
    safetyBackup = safetyPath;
  }

  fs.writeFileSync(dbPath, buffer);
  return { safetyBackup };
}
