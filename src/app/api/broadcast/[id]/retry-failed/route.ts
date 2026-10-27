import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getWaGatewaySnapshot } from "@/lib/wa-provider";
import { sendSingleBroadcastMessage, recalcBatchCounts, sleep } from "@/lib/broadcast-sender";

export const dynamic = "force-dynamic";
export const maxDuration = 270;

const MAX_BULK_RETRY = 50;

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
    if (!config || !config.isEnabled || !snapshot.isConfigured) {
      return NextResponse.json(
        {
          error: "Gateway WhatsApp belum aktif atau belum dikonfigurasi.",
          activeGateway: snapshot,
        },
        { status: 400 }
      );
    }

    const failed = await prisma.broadcastMessage.findMany({
      where: { batchId: id, status: "FAILED" },
      orderBy: { createdAt: "asc" },
      take: MAX_BULK_RETRY,
      select: { id: true, personName: true, targetPhone: true },
    });

    if (failed.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada pesan gagal untuk dikirim ulang.",
        total: 0,
        succeeded: 0,
        failed: 0,
      });
    }

    let succeeded = 0;
    let stillFailed = 0;
    const failedItems: { id: string; name: string; error: string }[] = [];

    for (let i = 0; i < failed.length; i++) {
      try {
        const result = await sendSingleBroadcastMessage(failed[i].id, config);
        if (result.success) {
          succeeded += 1;
        } else {
          stillFailed += 1;
          failedItems.push({
            id: failed[i].id,
            name: failed[i].personName || "-",
            error: result.message,
          });
        }
      } catch (itemError: any) {
        stillFailed += 1;
        failedItems.push({
          id: failed[i].id,
          name: failed[i].personName || "-",
          error: itemError?.message || "koneksi terputus",
        });
      }
      if (i < failed.length - 1 && batch.delaySeconds > 0) {
        await sleep(batch.delaySeconds * 1000);
      }
    }

    await recalcBatchCounts(id);

    try {
      await prisma.auditLog.create({
        data: {
          adminId: auth.admin.adminId,
          adminName: auth.admin.name,
          action: "RETRY_FAILED_BROADCAST_MESSAGES",
          target: `BroadcastBatch ${id}`,
          details: `Kirim ulang massal broadcast WA gagal: ${succeeded} berhasil, ${stillFailed} tetap gagal dari ${failed.length} percobaan.`,
        },
      });
    } catch {
      // non-blocking
    }

    const refreshed = await prisma.broadcastBatch.findUnique({ where: { id } });

    return NextResponse.json({
      success: stillFailed === 0,
      message:
        stillFailed === 0
          ? `${failed.length} pesan gagal berhasil dikirim ulang.`
          : `${succeeded} berhasil, ${stillFailed} tetap gagal dari ${failed.length} pesan.`,
      total: failed.length,
      succeeded,
      failed: stillFailed,
      failedItems: failedItems.slice(0, 10),
      batch: refreshed,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mengirim ulang pesan gagal." },
      { status: 500 }
    );
  }
}
