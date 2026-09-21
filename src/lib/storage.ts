import fs from "fs";
import path from "path";

/**
 * Storage adapter untuk file upload (foto, logo, background, bukti izin).
 *
 * Mode operasi ditentukan otomatis:
 *  - "blob"  : jika env BLOB_READ_WRITE_TOKEN tersedia (deploy di Vercel).
 *  - "local" : default. File disimpan ke `public/uploads/` sehingga dapat
 *              diakses langsung sebagai `/uploads/...` pada VPS / server sendiri.
 *
 * Tujuan adapter ini: aplikasi yang di-deploy di VPS (self-hosted) tidak lagi
 * bergantung pada layanan Vercel Blob.
 */

export type StorageMode = "blob" | "local";

export interface StoredObject {
  /** URL siap pakai untuk disimpan di database (absolut untuk blob, relatif untuk lokal). */
  url: string;
  /** Path relatif di dalam storage (tanpa prefix `uploads/`). */
  pathname: string;
}

export interface ListedObject {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
}

/** Folder fisik penyimpanan lokal: <project>/public/uploads */
export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/** Prefix URL publik untuk file lokal. */
export const LOCAL_URL_PREFIX = "/uploads";

export function getStorageMode(): StorageMode {
  return process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local";
}

export function isLocalStorage(): boolean {
  return getStorageMode() === "local";
}

/** Info singkat untuk endpoint status / health check. */
export function getStorageInfo(): { mode: StorageMode; directory?: string } {
  return isLocalStorage()
    ? { mode: "local", directory: LOCAL_UPLOAD_DIR }
    : { mode: "blob" };
}

/** Normalisasi pathname: tanpa backslash, tanpa leading slash, tanpa prefix `uploads/`. */
function normalizePathname(pathname: string): string {
  return String(pathname || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^uploads\//i, "")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
}

/** Ubah pathname menjadi path absolut di disk, sekaligus mencegah path traversal. */
function resolveLocalPath(pathname: string): string {
  const relative = normalizePathname(pathname);
  const absolute = path.resolve(LOCAL_UPLOAD_DIR, relative);
  const root = path.resolve(LOCAL_UPLOAD_DIR);
  if (absolute !== root && !absolute.startsWith(root + path.sep)) {
    throw new Error("Path file tidak valid.");
  }
  return absolute;
}

function toLocalUrl(pathname: string): string {
  const relative = normalizePathname(pathname);
  return relative ? `${LOCAL_URL_PREFIX}/${relative}` : LOCAL_URL_PREFIX;
}

/**
 * Simpan buffer ke storage.
 *
 * @example
 * const { url } = await saveObject("uploads/photo_1.jpg", buffer, "image/jpeg");
 * // mode lokal  -> url = "/uploads/photo_1.jpg"
 * // mode blob   -> url = "https://xxx.public.blob.vercel-storage.com/..."
 */
export async function saveObject(
  pathname: string,
  data: Buffer,
  contentType = "application/octet-stream"
): Promise<StoredObject> {
  if (getStorageMode() === "blob") {
    const { put } = await import("@vercel/blob");
    const blob = await put(pathname, data, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { url: blob.url, pathname: blob.pathname };
  }

  const absolute = resolveLocalPath(pathname);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, data);

  return { url: toLocalUrl(pathname), pathname: normalizePathname(pathname) };
}

/**
 * Hapus file dari storage. Menerima URL absolut (blob), URL lokal (`/uploads/...`),
 * atau pathname mentah (`uploads/...`, `izin/...`).
 */
export async function deleteObject(target: string): Promise<boolean> {
  const value = String(target || "").trim();
  if (!value) return false;

  // URL absolut -> hanya bisa dihapus bila mode blob aktif.
  if (/^https?:\/\//i.test(value)) {
    if (getStorageMode() === "blob") {
      const { del } = await import("@vercel/blob");
      await del(value, { token: process.env.BLOB_READ_WRITE_TOKEN });
      return true;
    }
    return false;
  }

  try {
    const absolute = resolveLocalPath(value);
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
      fs.unlinkSync(absolute);
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/** Daftar file yang tersimpan. `prefix` dicocokkan dengan path relatif. */
export async function listObjects(prefix = ""): Promise<ListedObject[]> {
  const cleanPrefix = normalizePathname(prefix);

  if (getStorageMode() === "blob") {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({
      prefix: cleanPrefix || undefined,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blobs.map((b) => ({
      url: b.url,
      pathname: b.pathname,
      size: b.size,
      uploadedAt: new Date(b.uploadedAt).toISOString(),
    }));
  }

  const results: ListedObject[] = [];
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) return results;

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;

      const relative = path.relative(LOCAL_UPLOAD_DIR, full).split(path.sep).join("/");
      if (cleanPrefix && !relative.startsWith(cleanPrefix)) continue;

      const stat = fs.statSync(full);
      results.push({
        url: `${LOCAL_URL_PREFIX}/${relative}`,
        pathname: relative,
        size: stat.size,
        uploadedAt: stat.mtime.toISOString(),
      });
    }
  };

  walk(LOCAL_UPLOAD_DIR);
  return results.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}
