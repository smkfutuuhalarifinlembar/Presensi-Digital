import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateActivityState, getTodayDateString } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const todayDateStr = getTodayDateString();
    const now = new Date();

    // 1. Ambil Pengaturan Sekolah
    let school = await prisma.schoolSetting.findUnique({
      where: { id: "default" },
    });

    if (!school) {
      school = await prisma.schoolSetting.create({
        data: { id: "default" },
      });
    }

    // 2. Ambil Semua Jadwal Kegiatan Aktif
    //    (ikut menyertakan nama lembaga agar tampilan "Jadwal Hari Ini"
    //     di layar presensi sinkron dengan info di Manajemen Jadwal)
    const rawActivities = await prisma.activity.findMany({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
      include: {
        institution: {
          select: { id: true, name: true, level: true },
        },
      },
    });

    // Evaluasi status jadwal hari ini
    const evaluatedActivities = rawActivities.map((act) =>
      evaluateActivityState(act, now)
    );

    // Filter yang berlaku hari ini
    const todayActivities = evaluatedActivities.filter((act) => act.isToday);

    // Cari kegiatan yang sedang aktif saat ini
    const currentActiveActivity =
      todayActivities.find((act) => act.state === "ACTIVE") || null;

    // 3. Ambil 10 Presensi Terakhir Hari Ini
    const recentAttendances = await prisma.attendanceRecord.findMany({
      where: { dateString: todayDateStr },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            nisNip: true,
            role: true,
            className: true,
            position: true,
            photoUrl: true,
          },
        },
        activity: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 10,
    });

    // 4. Hitung Statistik Singkat Hari Ini
    const totalToday = await prisma.attendanceRecord.count({
      where: { dateString: todayDateStr },
    });

    const hadirToday = await prisma.attendanceRecord.count({
      where: { dateString: todayDateStr, status: "HADIR" },
    });

    const terlambatToday = await prisma.attendanceRecord.count({
      where: { dateString: todayDateStr, status: "TERLAMBAT" },
    });

    return NextResponse.json({
      school,
      todayActivities,
      activeActivity: currentActiveActivity,
      recentAttendances,
      stats: {
        total: totalToday,
        hadir: hadirToday,
        terlambat: terlambatToday,
      },
      serverTime: now.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memuat data kiosk." },
      { status: 500 }
    );
  }
}
