import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { getTodayDateString, getCurrentTimeString, formatDateIndo } from "@/lib/date-utils";
import { processAutomaticAttendanceNotification } from "@/lib/wa-sender";

export async function GET(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    if (!q || q.length < 3) {
      return NextResponse.json({ people: [] });
    }

    const people = await prisma.person.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { nisNip: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      select: {
        id: true,
        name: true,
        nisNip: true,
        role: true,
        className: true,
        position: true,
        photoUrl: true,
      },
    });

    return NextResponse.json({ people });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mencari data orang." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      personId,
      activityId,
      status = "HADIR",
      remarks,
      dateString,
      sendWa = true,
    } = body;

    if (!personId || !activityId || !status) {
      return NextResponse.json(
        { error: "Orang, Kegiatan, dan Status Kehadiran wajib dipilih." },
        { status: 400 }
      );
    }

    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person) {
      return NextResponse.json({ error: "Data orang tidak ditemukan." }, { status: 404 });
    }

    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) {
      return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
    }

    const targetDateStr = dateString || getTodayDateString();
    const timeStr = getCurrentTimeString();

    // Cek apakah sudah ada catatan untuk kegiatan & tanggal ini
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        personId_activityId_dateString: {
          personId: person.id,
          activityId: activity.id,
          dateString: targetDateStr,
        },
      },
    });

    let record;
    if (existing) {
      // Update record yang sudah ada
      record = await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          status,
          remarks: remarks || `Diubah manual oleh admin ${admin.name}`,
          recordedByAdminId: admin.adminId,
          method: "MANUAL",
        },
      });
    } else {
      // Buat baru
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

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "MANUAL_ATTENDANCE",
        target: `${person.name} (${person.nisNip})`,
        details: `Status ${status} pada kegiatan ${activity.name} (${targetDateStr}). Ket: ${remarks || "-"}`,
      },
    });

    // Picu pengiriman WhatsApp jika opsi diaktifkan
    if (sendWa) {
      processAutomaticAttendanceNotification(record.id).catch((err) => {
        console.error("Gagal kirim WA manual:", err);
      });
    }

    return NextResponse.json({
      success: true,
      message: `Presensi manual ${person.name} berhasil disimpan (${status}).`,
      record,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mencatat presensi manual." },
      { status: 500 }
    );
  }
}
