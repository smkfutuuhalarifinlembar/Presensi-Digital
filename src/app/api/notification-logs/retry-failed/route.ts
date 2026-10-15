import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { processAutomaticAttendanceNotification } from "@/lib/wa-sender";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BULK_RETRY = 50;

export async function POST() {
  try {
    const auth = await requireRole("ADMIN_OPERATOR");
    if (!auth.ok) return auth.error;

    const failedLatest = await prisma.notificationLog.findMany({
      where: { channel: "WHATSAPP", status: "FAILED" },
      orderBy: [{ attendanceId: "asc" }, { attempt: "desc" }, { createdAt: "desc" }],
      distinct: ["attendanceId"],
      take: MAX_BULK_RETRY,
      select: {
        id: true,
        attendanceId: true,
        attendance: {
          select: { person: { select: { name: true, nisNip: true } } },
        },
      },
    });

    if (failedLatest.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada notifikasi gagal yang perlu dikirim ulang.",
        total: 0,
        succeeded: 0,
        failed: 0,
      });
    }

    let succeeded = 0;
    let failed = 0;
    const failedItems: { id: string; name: string; error: string }[] = [];

    for (const notification of failedLatest) {
      try {
        const fresh = await prisma.notificationLog.findUnique({
          where: { id: notification.id },
          select: { status: true, attendanceId: true },
        });
        const latest = await prisma.notificationLog.findFirst({
          where: { attendanceId: notification.attendanceId },
          orderBy: [{ attempt: "desc" }, { createdAt: "desc" }],
          select: { id: true },
        });
        if (!fresh || fresh.status !== "FAILED" || latest?.id !== notification.id) {
          continue;
        }

        const result = await processAutomaticAttendanceNotification(
          notification.attendanceId,
          { source: "RETRY", retryOfId: notification.id }
        );

        if (result.success) {
          succeeded += 1;
          try {
            await prisma.notificationLog.deleteMany({
              where: { id: notification.id },
            });
          } catch (replaceError) {
            console.error(
              "Gagal mengganti riwayat gagal setelah retry sukses:",
              replaceError
            );
          }
        } else {
          failed += 1;
          failedItems.push({
            id: notification.id,
            name: notification.attendance.person.name,
            error: result.message,
          });
        }
      } catch (itemError: any) {
        failed += 1;
        failedItems.push({
          id: notification.id,
          name: notification.attendance.person.name,
          error: itemError?.message || "koneksi terputus",
        });
      }
    }

    try {
      await prisma.auditLog.create({
        data: {
          adminId: auth.admin.adminId,
          adminName: auth.admin.name,
          action: "RETRY_ALL_FAILED_NOTIFICATIONS",
          target: "NOTIFICATION_LOG",
          details: `Kirim ulang massal notifikasi gagal: ${succeeded} berhasil, ${failed} gagal dari ${failedLatest.length} percobaan.`,
        },
      });
    } catch (auditError) {
      console.error("Gagal mencatat audit retry massal notifikasi:", auditError);
    }

    return NextResponse.json({
      success: failed === 0,
      message:
        failed === 0
          ? `${succeeded} notifikasi gagal berhasil dikirim ulang.`
          : `${succeeded} berhasil, ${failed} tetap gagal dari ${failedLatest.length} percobaan.`,
      total: failedLatest.length,
      succeeded,
      failed,
      failedItems: failedItems.slice(0, 10),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mengirim ulang notifikasi gagal." },
      { status: 500 }
    );
  }
}
