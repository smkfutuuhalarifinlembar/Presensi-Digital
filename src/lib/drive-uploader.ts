import path from "path";
import { saveObject } from "./storage";

export interface DriveUploadResult {
  fileId: string | null;
  webViewLink: string | null;
  blobUrl: string;
  blobPathname: string;
  driveEnabled: boolean;
  folderId: string | null;
  note?: string;
}

export const DEFAULT_DRIVE_FOLDER_ID = "1kk1p30xrosFap-3emPsc2vAemIW3ISG5";

// Upload buffer ke Google Drive (ID folder bawaan di atas), simpan salinan ke storage aplikasi.
// Konfigurasi via env: GOOGLE_DRIVE_ENABLED, GOOGLE_DRIVE_FOLDER_ID,
// GOOGLE_SERVICE_ACCOUNT_JSON (isi JSON) atau GOOGLE_SERVICE_ACCOUNT_PATH.
// Folder ID dapat dioverride per-pengaturan (LeaveSetting.driveFolderId).
export async function uploadBufferToDrive(opts: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folderId?: string | null;
}): Promise<DriveUploadResult> {
  const safeBase = path.basename(opts.filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const finalName = `izin_${Date.now()}_${safeBase}`;
  const blobPathname = `izin/${finalName}`;

  // Simpan salinan ke storage aplikasi (lokal `public/uploads` di VPS, atau Vercel Blob bila token tersedia)
  const blob = await saveObject(blobPathname, opts.buffer, opts.mimeType);

  const driveEnabled =
    String(process.env.GOOGLE_DRIVE_ENABLED || "").toLowerCase() === "true";
  const folderId =
    (opts.folderId || "").trim() ||
    (process.env.GOOGLE_DRIVE_FOLDER_ID || "").trim() ||
    DEFAULT_DRIVE_FOLDER_ID;

  if (!driveEnabled) {
    return {
      fileId: null,
      webViewLink: null,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      driveEnabled: false,
      folderId,
      note: "Upload Drive nonaktif (GOOGLE_DRIVE_ENABLED != true). Disimpan ke storage aplikasi.",
    };
  }

  try {
    const saJson =
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      (process.env.GOOGLE_SERVICE_ACCOUNT_PATH
        ? (await import("fs")).readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_PATH, "utf8")
        : null);
    if (!saJson) {
      return {
        fileId: null,
        webViewLink: null,
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        driveEnabled: true,
        folderId,
        note: `Kredensial service account Drive belum dikonfigurasi. Folder tujuan: ${folderId}. Disimpan ke storage aplikasi.`,
      };
    }
    const credentials = JSON.parse(saJson);

    // Dapatkan access token via JWT (tanpa dependency tambahan)
    const { default: crypto } = await import("crypto");
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT" })
    ).toString("base64url");
    const claim = Buffer.from(
      JSON.stringify({
        iss: credentials.client_email,
        scope: "https://www.googleapis.com/auth/drive.file",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    ).toString("base64url");
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(`${header}.${claim}`);
    const signature = signer
      .sign(credentials.private_key, "base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const assertion = `${header}.${claim}.${signature}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }).toString(),
    });
    const tokenJson: any = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenJson.access_token) {
      return {
        fileId: null,
        webViewLink: null,
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        driveEnabled: true,
        folderId,
        note: `Gagal otentikasi Drive: ${tokenJson.error_description || tokenJson.error || tokenRes.status}. Disimpan ke storage aplikasi.`,
      };
    }

    // Upload multipart ke Drive
    const boundary = `----drive${Date.now()}`;
    const metadata: any = { name: finalName };
    if (folderId) metadata.parents = [folderId];
    const preamble = Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${opts.mimeType}\r\n\r\n`
    );
    const epilogue = Buffer.from(`\r\n--${boundary}--`);
    const body = Buffer.concat([preamble, opts.buffer, epilogue]);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
          "Content-Length": String(body.length),
        },
        body: body as any,
      }
    );
    const uploadJson: any = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok || !uploadJson.id) {
      return {
        fileId: null,
        webViewLink: null,
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        driveEnabled: true,
        folderId,
        note: `Gagal upload Drive ke folder ${folderId}: ${uploadJson?.error?.message || uploadRes.status}. Disimpan ke storage aplikasi.`,
      };
    }
    return {
      fileId: uploadJson.id,
      webViewLink: uploadJson.webViewLink || `https://drive.google.com/file/d/${uploadJson.id}/view`,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      driveEnabled: true,
      folderId,
    };
  } catch (err: any) {
    return {
      fileId: null,
      webViewLink: null,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      driveEnabled: true,
      folderId,
      note: `${err?.message || "Gagal upload ke Drive"}. Disimpan ke storage aplikasi.`,
    };
  }
}

export function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const m = /^data:(.+?);base64,(.+)$/.exec(dataUrl || "");
  if (!m) return null;
  return { buffer: Buffer.from(m[2], "base64"), mime: m[1] };
}