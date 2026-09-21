import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorageInfo } from "@/lib/storage";

export const dynamic = "force-dynamic";

const startedAt = Date.now();

/**
 * Health check untuk monitoring (uptime robot / PM2 / Nginx) dan verifikasi
 * setelah deploy. Contoh: curl http://127.0.0.1:3000/api/health
 *
 * Catatan: endpoint ini publik, jadi hanya mengembalikan status boolean —
 * tidak pernah mengembalikan connection string atau kredensial.
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    database: false,
    storage: getStorageInfo(),
  };

  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    checks.database = true;
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        message: "Koneksi database gagal.",
        detail: err?.message || String(err),
        checks,
        uptimeSec: Math.round((Date.now() - startedAt) / 1000),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "ok",
    app: "presensi-digital-sekolah",
    checks,
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
}
