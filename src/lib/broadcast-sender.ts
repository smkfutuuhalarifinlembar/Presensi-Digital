import { prisma } from "./prisma";
import { sendDirectWaMessage } from "./wa-sender";
import { getWaGatewaySnapshot } from "./wa-provider";

export const MAX_TARGETS_PER_BATCH = 200;
export const MAX_BROADCAST_DELAY_SECONDS = 300;

export type BroadcastStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
export type BroadcastMessageStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

export interface BroadcastSnapshot {
  isEnabled: boolean;
  isConfigured: boolean;
  label: string | null;
  provider: string | null;
  providerLabel: string;
}

export function getBroadcastSnapshot(config: any): BroadcastSnapshot {
  const snap = getWaGatewaySnapshot(config);
  return {
    isEnabled: snap.isEnabled,
    isConfigured: snap.isConfigured,
    label: snap.label,
    provider: snap.provider,
    providerLabel: snap.label || "WhatsApp Gateway",
  };
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function countPending(batchId: string): Promise<number> {
  return prisma.broadcastMessage.count({ where: { batchId, status: "PENDING" } });
}

export async function recalcBatchCounts(batchId: string): Promise<void> {
  const [sent, failed, skipped, pending] = await Promise.all([
    prisma.broadcastMessage.count({ where: { batchId, status: "SENT" } }),
    prisma.broadcastMessage.count({ where: { batchId, status: "FAILED" } }),
    prisma.broadcastMessage.count({ where: { batchId, status: "SKIPPED" } }),
    prisma.broadcastMessage.count({ where: { batchId, status: "PENDING" } }),
  ]);

  const totalTargets = sent + failed + skipped + pending;
  const isDone = pending === 0;

  await prisma.broadcastBatch.update({
    where: { id: batchId },
    data: {
      totalTargets,
      sentCount: sent,
      failedCount: failed,
      skippedCount: skipped,
      status: isDone ? "COMPLETED" : "RUNNING",
      completedAt: isDone ? new Date() : null,
      updatedAt: new Date(),
    },
  });
}

export interface SendSingleResult {
  success: boolean;
  message: string;
  provider?: string | null;
  httpStatus?: number;
}

export async function sendSingleBroadcastMessage(messageId: string, config: any): Promise<SendSingleResult> {
  const msg = await prisma.broadcastMessage.findUnique({
    where: { id: messageId },
    select: { id: true, targetPhone: true, messageContent: true },
  });
  if (!msg) {
    return { success: false, message: "Pesan broadcast tidak ditemukan." };
  }

  if (!msg.targetPhone || !msg.targetPhone.trim()) {
    await prisma.broadcastMessage.update({
      where: { id: messageId },
      data: { status: "SKIPPED", deliveryMessage: "Nomor WhatsApp tujuan tidak tersedia.", updatedAt: new Date() },
    });
    return { success: false, message: "Nomor WhatsApp tujuan tidak tersedia." };
  }

  const result = await sendDirectWaMessage(msg.targetPhone, msg.messageContent, config);

  await prisma.broadcastMessage.update({
    where: { id: messageId },
    data: {
      status: result.success ? "SENT" : "FAILED",
      provider: result.provider || null,
      deliveryMessage: result.message,
      errorMessage: result.success ? null : result.message,
      sentAt: result.success ? new Date() : null,
      attempt: { increment: 1 },
      updatedAt: new Date(),
    },
  });

  return result;
}

export interface ProcessBatchResult {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  morePending: boolean;
  message: string;
}

export async function processBroadcastBatch(
  batchId: string,
  config: any,
  delaySeconds: number
): Promise<ProcessBatchResult> {
  const batch = await prisma.broadcastBatch.findUnique({
    where: { id: batchId },
    select: { id: true, status: true, delaySeconds: true },
  });
  if (!batch) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0, morePending: false, message: "Batch tidak ditemukan." };
  }
  if (batch.status === "COMPLETED") {
    return { processed: 0, sent: 0, failed: 0, skipped: 0, morePending: false, message: "Batch sudah selesai dikirim." };
  }

  const delayMs = Math.max(0, delaySeconds) * 1000;
  const budgetMs = (270) * 1000;
  const deadline = Date.now() + budgetMs;

  await prisma.broadcastBatch.update({
    where: { id: batchId },
    data: { status: "RUNNING", startedAt: new Date(), updatedAt: new Date() },
  });

  let processed = 0;

  while (true) {
    const pending = await prisma.broadcastMessage.findMany({
      where: { batchId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: MAX_TARGETS_PER_BATCH,
    });

    if (pending.length === 0) {
      await recalcBatchCounts(batchId);
      return {
        processed,
        sent: 0,
        failed: 0,
        skipped: 0,
        morePending: false,
        message: "Batch selesai.",
      };
    }

    for (let i = 0; i < pending.length; i++) {
      const m = pending[i];
      const projected = Date.now() + delayMs + 2000;
      if (projected > deadline && pending.length > 1) {
        await recalcBatchCounts(batchId);
        return {
          processed,
          sent: 0,
          failed: 0,
          skipped: 0,
          morePending: true,
          message: `Batas waktu permintaan tercapai; ${pending.length - i} pesan tersisa tertunda. Lanjutkan pengiriman.`,
        };
      }
      await sendSingleBroadcastMessage(m.id, config);
      processed += 1;
      if (i < pending.length - 1 && delayMs > 0) {
        await sleep(delayMs);
      }
    }

    if (pending.length < MAX_TARGETS_PER_BATCH) {
      break;
    }
    await recalcBatchCounts(batchId);
  }

  await recalcBatchCounts(batchId);
  return {
    processed,
    sent: 0,
    failed: 0,
    skipped: 0,
    morePending: await countPending(batchId) > 0,
    message: "Batch diproses.",
  };
}

export async function refreshBatchSummary(batchId: string): Promise<void> {
  await recalcBatchCounts(batchId);
}

export { getWaGatewaySnapshot };
