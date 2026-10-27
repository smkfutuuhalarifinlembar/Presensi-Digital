import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getWaGatewaySnapshot } from "@/lib/wa-provider";
import { processBroadcastBatch, countPending, refreshBatchSummary } from "@/lib/broadcast-sender";

export const dynamic = "force-dynamic";
export const maxDuration = 270;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole("ADMIN_OPERATOR");
    if (!auth.ok) return auth.error;

    const { id } = await params;

    const batch = await prisma.broadcastBatch.findUnique({
      where: { id },
      select: { id: true, status: true, delaySeconds: true },
    });
    if (!batch) {
      return NextResponse.json({ error: "Batch tidak ditemukan." }, { status: 404 });
    }

    const config = await prisma.waGatewayConfig.findUnique({ where: { id: "default" } });
    const snapshot = getWaGatewaySnapshot(config);

    if (!config || !config.isEnabled) {
      return NextResponse.json(
        {
          error: `Gateway WhatsApp belum aktif atau belum dikonfigurasi (${snapshot.label || "Belum ada"}).`,
          activeGateway: snapshot,
          batch,
        },
        { status: 400 }
      );
    }

    if (!snapshot.isConfigured) {
      return NextResponse.json(
        {
          error: "Credential provider WhatsApp belum lengkap. Periksa menu WhatsApp Gateway.",
          activeGateway: snapshot,
          batch,
        },
        { status: 400 }
      );
    }

    const result = await processBroadcastBatch(batch.id, config, batch.delaySeconds);

    await refreshBatchSummary(batch.id);
    const refreshed = await prisma.broadcastBatch.findUnique({ where: { id: batch.id } });
    const stillPending = await countPending(batch.id);

    try {
      await prisma.auditLog.create({
        data: {
          adminId: auth.admin.adminId,
          adminName: auth.admin.name,
          action: "SEND_BROADCAST_BATCH",
          target: `BroadcastBatch ${batch.id}`,
          details: `Mengirim broadcast WA: diproses ${result.processed}, masih tertunda ${stillPending}. Status batch: ${refreshed?.status}.`,
        },
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      processed: result.processed,
      morePending: stillPending > 0,
      batch: refreshed,
      activeGateway: snapshot,
      message: result.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memproses batch broadcast." },
      { status: 500 }
    );
  }
}
