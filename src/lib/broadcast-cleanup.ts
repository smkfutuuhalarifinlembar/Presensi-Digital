import { prisma } from "./prisma";

export function normalizeRetentionHours(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return 24;
  return Math.min(168, n);
}

export const BROADCAST_RETENTION_HOURS = normalizeRetentionHours(process.env.BROADCAST_RETENTION_HOURS);

export type BroadcastCleanupTrigger = "AUTO" | "MANUAL" | "CRON";

export interface BroadcastCleanupResult {
  ran: boolean;
  deletedBatches: number;
  deletedMessages: number;
  cutoff: Date;
  retentionHours: number;
  trigger: BroadcastCleanupTrigger;
}

export async function runBroadcastCleanup(options: {
  force?: boolean;
  trigger?: BroadcastCleanupTrigger;
} = {}): Promise<BroadcastCleanupResult> {
  const force = Boolean(options.force);
  const trigger: BroadcastCleanupTrigger = options.trigger || (force ? "MANUAL" : "CRON");
  const cutoff = new Date(Date.now() - BROADCAST_RETENTION_HOURS * 60 * 60 * 1000);

  const { deletedMessages, deletedBatches } = await prisma.$transaction(async (tx) => {
    const messages = await tx.broadcastMessage.deleteMany({
      where: { batch: { createdAt: { lt: cutoff } } },
    });
    const batches = await tx.broadcastBatch.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return { deletedMessages: messages.count, deletedBatches: batches.count };
  });

  return {
    ran: true,
    deletedBatches,
    deletedMessages,
    cutoff,
    retentionHours: BROADCAST_RETENTION_HOURS,
    trigger,
  };
}
