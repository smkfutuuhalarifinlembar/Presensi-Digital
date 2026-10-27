import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { runBroadcastCleanup } from "@/lib/broadcast-cleanup";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  try {
    const auth = await requireRole("ADMIN_OPERATOR");
    if (!auth.ok) return auth.error;

    const result = await runBroadcastCleanup({ force: true, trigger: "MANUAL" });

    try {
      await prisma.auditLog.create({
        data: {
          adminId: auth.admin.adminId,
          adminName: auth.admin.name,
          action: "CLEANUP_BROADCAST_HISTORY",
          target: "BroadcastBatch",
          details: `Bersihkan riwayat broadcast otomatis >${result.retentionHours} jam: ${result.deletedBatches} batch, ${result.deletedMessages} pesan.`,
        },
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      message: `Riwayat broadcast lama (> ${result.retentionHours} jam) berhasil dihapus: ${result.deletedBatches} batch, ${result.deletedMessages} pesan.`,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal membersihkan riwayat broadcast." },
      { status: 500 }
    );
  }
}
