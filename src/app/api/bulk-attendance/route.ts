import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getTodayDateString, getCurrentTimeString, formatDateIndo } from "@/lib/date-utils";
import { processAutomaticAttendanceNotification } from "@/lib/wa-sender";

export async function POST(req: Request) {
  try {
    const auth = await requireRole("ADMIN_OPERATOR");
    if (!auth.ok) return auth.error;
    const admin = auth.admin;

    const body = await req.json();
    const {
      personIds,
      activityId,
      status = "HADIR",
      remarks,
      dateString,
      institutionId,
      className,
    } = body;

    if (!personIds || !personIds.length || !activityId || !status) {
      return NextResponse.json({
        error: "Daftar orang, Kegiatan, dan Status Kehadiran wajib dipilih.",
      }, { status: 400 });
    }

    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) {
      return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
    }

    const targetDateStr = dateString || getTodayDateString();
    const timeStr = getCurrentTimeString();

    // Filter people by institution or class if provided
    const people = await prisma.person.findMany({
      where: {
        id: { in: personIds },
        isActive: true,
        ...(institutionId ? { institutionId } : {}),
        ...(className ? { className } : {}),
      },
      select: {
        id: true,
        name: true,
        nisNip: true,
        role: true,
        className: true,
        position: true,
      },
    });

    if (people.length !== personIds.length) {
      return NextResponse.json({
        error: `Beberapa orang tidak ditemukan atau tidak memenuhi filter lembaga/kelas. Daftar orang yang valid: ${people.map(p => p.name).join(", ")}`,
      }, { status: 400 });
    }

    // Create attendance records
    const records: Array<Awaited<ReturnType<typeof prisma.attendanceRecord.create>>> = [];
    for (const person of people) {
      const existing = await prisma.attendanceRecord.findUnique({
        where: {
          personId_activityId_dateString: {
            personId: person.id,
            activityId: activity.id,
            dateString: targetDateStr,
          },
        },
      });

      let record: Awaited<ReturnType<typeof prisma.attendanceRecord.create>>;
      if (existing) {
        // Update existing record
        record = await prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            status,
            remarks: remarks || `Diubah manual oleh admin ${admin.name}`,
            recordedByAdminId: admin.adminId,
            method: "MANUAL",
            waNotificationSent: false,
            waNotificationStatus: "PENDING",
          },
        });
      } else {
        // Create new record
        record = await prisma.attendanceRecord.create({
          data: {
            personId: person.id,
            activityId: activity.id,
            dateString: targetDateStr,
            timeString: timeStr,
            status,
            method: "MANUAL",
            remarks: remarks || `Input manual oleh admin ${admin.name}`,
            recordedByAdminId: admin.adminId,
          },
        });
      }

      records.push(record);
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "BULK_MANUAL_ATTENDANCE",
        target: `${people.length} orang (${people.map(p => p.name).join(", ")})`,
        details: `Status ${status} pada kegiatan ${activity.name} (${targetDateStr}). Ket: ${remarks || "-"}`,
      },
    });

    // Jalankan percobaan notifikasi dalam masa hidup request Vercel. Promise
    // individual selalu diselesaikan tanpa mengubah hasil penyimpanan presensi.
    after(async () => {
      await Promise.allSettled(
        records.map((record) =>
          processAutomaticAttendanceNotification(record.id, { source: "MANUAL" })
        )
      );
    });

    return NextResponse.json({
      success: true,
      message: `Presensi manual ${people.length} orang berhasil disimpan (${status}). Notifikasi WhatsApp sedang diproses.`,
      records,
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err?.message || "Gagal mencatat presensi manual.",
    }, { status: 500 });
  }
}