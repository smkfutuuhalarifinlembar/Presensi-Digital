import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import {
  getNotificationCleanupStatus,
  normalizeCleanupInterval,
  runNotificationLogCleanup,
} from "@/lib/notification-cleanup";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireRole("ADMIN_OPERATOR");
    if (!auth.ok) return auth.error;
    await runNotificationLogCleanup({ trigger: "AUTO" }).catch(() => undefined);
    const [setting, currentCount] = await Promise.all([
      prisma.notificationLogSetting.findUnique({ where: { id: "default" } }),
      prisma.notificationLog.count(),
    ]);
    return NextResponse.json({
      setting: setting ? getNotificationCleanupStatus(setting) : null,
      currentCount,
      canManage: auth.admin.role === "SUPER_ADMIN",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memuat pengaturan cleaners." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireRole("SUPER_ADMIN");
    if (!auth.ok) return auth.error;
    const body = await req.json();
    const autoDeleteEnabled = Boolean(body.autoDeleteEnabled);
    const intervalInput = Number(body.intervalHours);
    if (!Number.isInteger(intervalInput) || intervalInput < 1 || intervalInput > 168) {
      return NextResponse.json(
        { error: "Interval harus berupa bilangan bulat antara 1 sampai 168 jam." },
        { status: 400 }
      );
    }
    const intervalHours = normalizeCleanupInterval(intervalInput);
    const now = new Date();

    const setting = await prisma.notificationLogSetting.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        autoDeleteEnabled,
        intervalHours,
        lastRunAt: autoDeleteEnabled ? now : null,
      },
      update: {
        autoDeleteEnabled,
        intervalHours,
        // Mengatur ulang siklus dari waktu pengaturan disimpan.
        ...(autoDeleteEnabled ? { lastRunAt: now } : {}),
      },
    });
    await prisma.auditLog.create({
      data: {
        adminId: auth.admin.adminId,
        adminName: auth.admin.name,
        action: "UPDATE_NOTIFICATION_CLEANUP_SETTING",
        target: "NOTIFICATION_LOG",
        details: `Auto hapus ${autoDeleteEnabled ? "aktif" : "nonaktif"} setiap ${intervalHours} jam.`,
      },
    });
    return NextResponse.json({ success: true, setting: getNotificationCleanupStatus(setting) });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menyimpan pengaturan cleaners." },
      { status: 500 }
    );
  }
}