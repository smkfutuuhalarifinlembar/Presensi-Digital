import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import path from "path";
import AdmZip from "adm-zip";
import { processImageIfNeeded } from "@/lib/image-processor";
import { saveObject } from "@/lib/storage";

export async function POST(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Tidak ada file yang diunggah." }, { status: 400 });
    }

    const people = await prisma.person.findMany({
      select: { id: true, nisNip: true, name: true, photoUrl: true },
    });

    const results: any[] = [];

    // Helper: proses satu file foto
    const processPhotoFile = async (fileName: string, fileBuffer: Buffer, fileMimeType: string) => {
      const { buffer: processedBuffer, extension } = await processImageIfNeeded(
        fileBuffer,
        fileMimeType,
        { maxWidth: 800, maxHeight: 800, quality: 75, format: "jpeg" }
      );

      // Beberapa strategi pencocokan:
      // 1) NIS/NIP exact
      // 2) Nama persis (case-insensitive)
      // 3) Nama-NIS atau NIS-Nama
      // 4) Normalized name tanpa spasi/simbol
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const basenameRaw = path.basename(fileName, path.extname(fileName)).trim();
      const lookupNorm = norm(basenameRaw);

      // Coba parse "Nama - NIS" atau "NIS - Nama"
      let lookupName = basenameRaw;
      let lookupNis = "";
      if (basenameRaw.includes(" - ")) {
        const parts = basenameRaw.split(" - ").map((p) => p.trim());
        if (parts.length >= 2) {
          if (parts[0].length <= 12 && /\d/.test(parts[0])) {
            lookupNis = parts[0];
            lookupName = parts[1];
          } else {
            lookupName = parts[0];
            lookupNis = parts[1];
          }
        }
      } else if (basenameRaw.includes("_")) {
        const parts = basenameRaw.split("_");
        if (parts.length >= 2) {
          lookupName = parts[0].trim();
          lookupNis = parts[1].trim();
        }
      }

      const matched = people.find((p: any) => {
        if (lookupNis && p.nisNip === lookupNis) return true;
        if (p.name.trim().toLowerCase() === lookupName.toLowerCase()) return true;
        if (norm(p.name) === lookupNorm) return true;
        if (p.nisNip === basenameRaw) return true;
        if (p.nisNip && norm(p.nisNip) === lookupNorm) return true;
        return false;
      });

      if (!matched) {
        results.push({
          file: fileName,
          ok: false,
          reason: `Tidak ditemukan siswa/guru/staff dengan nama/NIS "${basenameRaw}". Gunakan format: Nama atau NIS atau Nama_NIS.`,
        });
        return;
      }

      const safeBase = basenameRaw.replace(/[^a-zA-Z0-9_-]/g, "");
      const filename = `photo_${matched.id}_${Date.now()}_${safeBase}.${extension}`;
      const pathname = `people/photos/${filename}`;

      // Simpan ke storage (lokal `public/uploads` di VPS, atau Vercel Blob bila token tersedia)
      const stored = await saveObject(pathname, processedBuffer, `image/${extension}`);

      await prisma.person.update({
        where: { id: matched.id },
        data: { photoUrl: stored.url },
      });

      results.push({
        file: fileName,
        ok: true,
        personId: matched.id,
        name: matched.name,
        nisNip: matched.nisNip,
        url: stored.url,
        pathname: stored.pathname,
      });
    };

    // Proses semua file
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mimeType = file.type;

      // Jika file adalah ZIP, ekstrak isinya
      if (path.extname(file.name).toLowerCase() === ".zip") {
        try {
          const zip = new AdmZip(buffer);
          const zipEntries = zip.getEntries();

          // Filter hanya file gambar
          const imageEntries = zipEntries.filter((entry) => {
            if (entry.isDirectory) return false;
            const entryExt = path.extname(entry.entryName).toLowerCase();
            return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].includes(entryExt);
          });

          if (imageEntries.length === 0) {
            results.push({
              file: file.name,
              ok: false,
              reason: "File ZIP tidak mengandung gambar (jpg/png/gif/webp/bmp).",
            });
            continue;
          }

          for (const entry of imageEntries) {
            const entryName = path.basename(entry.entryName);
            const entryBuffer = entry.getData();
            const entryMimeType = entryName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
            await processPhotoFile(entryName, entryBuffer, entryMimeType);
          }
        } catch (zipErr: any) {
          results.push({
            file: file.name,
            ok: false,
            reason: `Gagal membaca file ZIP: ${zipErr?.message || "Format tidak valid"}`,
          });
        }
      } else {
        // File gambar langsung
        await processPhotoFile(file.name, buffer, mimeType);
      }
    }

    const successCount = results.filter((r) => r.ok).length;
    const failCount = results.filter((r) => !r.ok).length;

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "BULK_UPLOAD_PHOTOS",
        target: "PERSON",
        details: `Upload foto massal: ${successCount} berhasil, ${failCount} gagal`,
      },
    });

    return NextResponse.json({
      success: true,
      successCount,
      failCount,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mengunggah foto massal." },
      { status: 500 }
    );
  }
}