import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { processAutomaticAttendanceNotification } from "@/lib/wa-sender";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole("ADMIN_OPERATOR");
    if (!auth.ok) return auth.error;
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID notifikasi tidak valid." }, { status: 400 });
    }

    const notification = await prisma.notificationLog.findUnique({
      where: { id },
      include: {
        attendance: {
          select: {
            person: { select: { name: true, nisNip: true } },
          },
        },
      },
    });
    if (!notification) {
      return NextResponse.json({ error: "Riwayat notifikasi tidak ditemukan." }, { status: 404 });
    }
    if (notification.status !== "FAILED") {
      return NextResponse.json(
        { error: "Hanya notifikasi dengan status FAILED yang dapat dikirim ulang." },
        { status: 409 }
      );
    }

    const latest = await prisma.notificationLog.findFirst({
      where: { attendanceId: notification.attendanceId },
      orderBy: [{ attempt: "desc" }, { createdAt: "desc" }],
      select: { id: true },
    });
    if (latest?.id !== notification.id) {
      return NextResponse.json(
        { error: "Notifikasi ini sudah memiliki percobaan yang lebih baru. Perbarui riwayat sebelum mencoba lagi." },
        { status: 409 }
      );
    }

    const result = await processAutomaticAttendanceNotification(notification.attendanceId, {
      source: "RETRY",
      retryOfId: notification.id,
    });
    const person = notification.attendance.person;

    try {
      await prisma.auditLog.create({
        data: {
          adminId: auth.admin.adminId,
          adminName: auth.admin.name,
          action: "RETRY_ATTENDANCE_NOTIFICATION",
          target: `${person.name} (${person.nisNip})`,
          details: `Kirim ulang notifikasi WA ${result.success ? "berhasil" : "gagal"}: ${result.message}`,
        },
      });
    } catch (auditError) {
      console.error("Gagal mencatat audit retry notifikasi:", auditError);
    }

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? "Notifikasi WhatsApp berhasil dikirim ulang."
        : `Pengiriman ulang gagal: ${result.message}`,
      notificationLogId: result.notificationLogId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mengirim ulang notifikasi." },
      { status: 500 }
    );
  }
}