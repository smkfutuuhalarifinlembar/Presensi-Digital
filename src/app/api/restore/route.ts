import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getDatabaseKind, restoreDatabaseDump } from "@/lib/db-backup";

/**
 * Pulihkan database dari file backup.
 *  - PostgreSQL : unggah file .sql (hasil tombol Backup / pg_dump)
 *  - SQLite     : unggah file .db / .sqlite
 * Database saat ini otomatis di-backup ke folder `backups/` sebelum ditimpa.
 */
export async function POST(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Super Admin only" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Tidak ada file yang diunggah." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { safetyBackup } = await restoreDatabaseDump(file.name, buffer);

    // Audit log (dilewati bila gagal, karena isi database baru saja diganti)
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.auditLog.create({
        data: {
          adminId: admin.adminId,
          adminName: admin.name,
          action: "RESTORE_DATABASE",
          target: "DATABASE",
          details: `Restore database dari file: ${file.name}`,
        },
      });
    } catch {
      // diabaikan
    }

    return NextResponse.json({
      success: true,
      message:
        "Database berhasil di-restore. Silakan muat ulang halaman (refresh) dan login kembali bila perlu.",
      database: getDatabaseKind(),
      safetyBackup,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal restore database." },
      { status: 500 }
    );
  }
}
