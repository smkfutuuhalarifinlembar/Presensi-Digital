import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { createDatabaseDump } from "@/lib/db-backup";

/**
 * Unduh backup database.
 *  - PostgreSQL : file .sql
 *        · Bila server punya `pg_dump` → dump lengkap (struktur + data).
 *        · Bila tidak ada (mis. Vercel/serverless) → mode internal aplikasi
 *          (DELETE + INSERT, tetap bisa dipulihkan lewat menu Restore).
 *  - SQLite     : file .db
 *
 * Tidak ada lagi pesan "pg_dump tidak tersedia" — backup selalu bisa diunduh.
 */

// Proses backup bisa berjalan lebih lama dari default function timeout Vercel
export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Super Admin only" }, { status: 403 });
    }

    const { filename, buffer } = await createDatabaseDump();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mengunduh backup database." },
      { status: 500 }
    );
  }
}

