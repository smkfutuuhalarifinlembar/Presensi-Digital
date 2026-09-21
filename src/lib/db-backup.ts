import { spawn } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Backup & restore database yang mendukung PostgreSQL maupun SQLite.
 *
 *  - PostgreSQL : memakai `pg_dump` (backup) dan `psql` (restore).
 *                 Keduanya tersedia setelah `apt install postgresql-client`
 *                 (otomatis terpasang bersama `postgresql` di VPS).
 *  - SQLite     : menyalin file `dev.db`.
 */

export type DatabaseKind = "postgresql" | "sqlite";

export function getDatabaseKind(): DatabaseKind {
  return /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL || "")
    ? "postgresql"
    : "sqlite";
}

function backupsDirectory(): string {
  const dir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");
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
        reject(
          new Error(
            `Perintah "${command}" tidak tersedia di server. Install dulu: apt install postgresql-client`
          )
        );
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
        reject(
          new Error(
            `Perintah "${command}" tidak tersedia di server. Install dulu: apt install postgresql-client`
          )
        );
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

export interface DatabaseDump {
  filename: string;
  buffer: Buffer;
}

/** Buat file backup database sesuai jenis database yang aktif. */
export async function createDatabaseDump(): Promise<DatabaseDump> {
  if (getDatabaseKind() === "postgresql") {
    const url = process.env.DATABASE_URL as string;
    const buffer = await runCapture("pg_dump", [
      "--no-owner",
      "--no-privileges",
      "--clean",
      "--if-exists",
      `--dbname=${url}`,
    ]);
    return { filename: `Backup_Presensi_${timestamp()}.sql`, buffer };
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

    await runWithInput(
      "psql",
      [`--dbname=${url}`, "-v", "ON_ERROR_STOP=1", "--quiet"],
      buffer
    );

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
