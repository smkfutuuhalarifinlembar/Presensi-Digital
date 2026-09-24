import { prisma } from "./prisma";

export const NOTIFICATION_LOG_SETTING_ID = "default";
export const MIN_CLEANUP_INTERVAL_HOURS = 1;
export const MAX_CLEANUP_INTERVAL_HOURS = 168;

export function normalizeCleanupInterval(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 1;
  return Math.min(MAX_CLEANUP_INTERVAL_HOURS, Math.max(MIN_CLEANUP_INTERVAL_HOURS, parsed));
}

export async function ensureNotificationLogSetting() {
  return prisma.notificationLogSetting.upsert({
    where: { id: NOTIFICATION_LOG_SETTING_ID },
    create: { id: NOTIFICATION_LOG_SETTING_ID },
    update: {},
  });
}

export function getNextCleanupAt(setting: {
  autoDeleteEnabled: boolean;
  intervalHours: number;
  lastRunAt: Date | null;
}) {
  if (!setting.autoDeleteEnabled) return null;
  const base = setting.lastRunAt || new Date();
  return new Date(base.getTime() + setting.intervalHours * 60 * 60 * 1000);
}

export function getNotificationCleanupStatus(setting: {
  autoDeleteEnabled: boolean;
  intervalHours: number;
  lastRunAt: Date | null;
  lastDeletedCount: number;
  lastTrigger: string | null;
}) {
  return {
    ...setting,
    nextRunAt: getNextCleanupAt(setting),
  };
}

export async function runNotificationLogCleanup(options: {
  force?: boolean;
  trigger?: "AUTO" | "MANUAL" | "CRON";
} = {}) {
  const force = Boolean(options.force);
  const trigger = options.trigger || (force ? "MANUAL" : "AUTO");
  const setting = await ensureNotificationLogSetting();
  const now = new Date();

  if (!force && !setting.autoDeleteEnabled) {
    return {
      ran: false,
      deletedCount: 0,
      reason: "DISABLED",
      setting: getNotificationCleanupStatus(setting),
    };
  }

  const cutoff = new Date(
    now.getTime() - normalizeCleanupInterval(setting.intervalHours) * 60 * 60 * 1000
  );
  const isDue = force || !setting.lastRunAt || setting.lastRunAt <= cutoff;

  if (!isDue) {
    return {
      ran: false,
      deletedCount: 0,
      reason: "NOT_DUE",
      setting: getNotificationCleanupStatus(setting),
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    // UpdateMany sebagai klaim atomik agar dua request/cron tidak menghapus bersamaan.
    if (force) {
      await tx.notificationLogSetting.update({
        where: { id: NOTIFICATION_LOG_SETTING_ID },
        data: { lastRunAt: now },
      });
    } else {
      const claimed = await tx.notificationLogSetting.updateMany({
        where: {
          id: NOTIFICATION_LOG_SETTING_ID,
          autoDeleteEnabled: true,
          OR: [{ lastRunAt: null }, { lastRunAt: { lte: cutoff } }],
        },
        data: { lastRunAt: now },
      });
      if (claimed.count === 0) {
        return { ran: false, deletedCount: 0, setting };
      }
    }

    const deleted = await tx.notificationLog.deleteMany({});
    const updated = await tx.notificationLogSetting.update({
      where: { id: NOTIFICATION_LOG_SETTING_ID },
      data: {
        lastRunAt: now,
        lastDeletedCount: deleted.count,
        lastTrigger: trigger,
      },
    });
    return { ran: true, deletedCount: deleted.count, setting: updated };
  });

  return {
    ran: result.ran,
    deletedCount: result.deletedCount,
    reason: result.ran ? "DELETED" : "CLAIMED_BY_OTHER_JOB",
    setting: getNotificationCleanupStatus(result.setting),
  };
}