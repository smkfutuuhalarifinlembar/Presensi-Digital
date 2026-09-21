import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { getTodayDateString, evaluateActivityState } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

// Check if a date is a holiday (including Sundays)
async function checkIsHoliday(dateString: string): Promise<{ isHoliday: boolean; holidayName: string | null }> {
  // Check if it's Sunday (0 = Sunday)
  const date = new Date(dateString + "T00:00:00");
  if (date.getDay() === 0) {
    return { isHoliday: true, holidayName: "Minggu" };
  }

  // Check if it's in the holidays table
  const holiday = await prisma.holiday.findUnique({
    where: { dateString, isActive: true },
  });

  if (holiday) {
    return { isHoliday: true, holidayName: holiday.name };
  }

  return { isHoliday: false, holidayName: null };
}

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayDateStr = getTodayDateString();
    const now = new Date();

    // Check if today is a holiday
    const holidayCheck = await checkIsHoliday(todayDateStr);

    // 1. Hitung total orang per kategori
    const [
      totalSiswa,
      totalGuru,
      totalPegawai,
      totalKepsek,
    ] = await Promise.all([
      prisma.person.count({ where: { role: "SISWA", isActive: true } }),
      prisma.person.count({ where: { role: "GURU", isActive: true } }),
      prisma.person.count({ where: { role: "PEGAWAI", isActive: true } }),
      prisma.person.count({ where: { role: "KEPALA_SEKOLAH", isActive: true } }),
    ]);

    // 2. Ambil seluruh presensi hari ini beserta role orangnya
    const todayRecords = await prisma.attendanceRecord.findMany({
      where: { dateString: todayDateStr },
      include: {
        person: {
          select: { role: true, className: true },
        },
      },
    });

    // Breakdown statistik hari ini per kategori
    const breakdown = {
      SISWA: { total: totalSiswa, hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 },
      GURU: { total: totalGuru, hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 },
      PEGAWAI: { total: totalPegawai, hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 },
      ALL: {
        totalRegistered: totalSiswa + totalGuru + totalPegawai + totalKepsek,
        totalCheckedIn: todayRecords.length,
        hadir: 0,
        terlambat: 0,
        izin: 0,
        sakit: 0,
        alpa: 0,
      },
    };

    for (const rec of todayRecords) {
      const role = rec.person.role;
      const status = rec.status;

      // Update global
      if (status === "HADIR") breakdown.ALL.hadir++;
      else if (status === "TERLAMBAT") breakdown.ALL.terlambat++;
      else if (status === "IZIN") breakdown.ALL.izin++;
      else if (status === "SAKIT") breakdown.ALL.sakit++;
      else if (status === "ALPA") breakdown.ALL.alpa++;

      // Update role-based
      const targetRoleGroup =
        role === "SISWA"
          ? breakdown.SISWA
          : role === "GURU"
          ? breakdown.GURU
          : role === "PEGAWAI" || role === "KEPALA_SEKOLAH"
          ? breakdown.PEGAWAI
          : null;

      if (targetRoleGroup) {
        if (status === "HADIR") targetRoleGroup.hadir++;
        else if (status === "TERLAMBAT") targetRoleGroup.terlambat++;
        else if (status === "IZIN") targetRoleGroup.izin++;
        else if (status === "SAKIT") targetRoleGroup.sakit++;
        else if (status === "ALPA") targetRoleGroup.alpa++;
      }
    }

    // 3. Ambil jadwal hari ini
    const rawActivities = await prisma.activity.findMany({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
    });

    const evaluatedActivities = rawActivities.map((act) =>
      evaluateActivityState(act, now)
    );

    return NextResponse.json({
      todayDateStr,
      isHoliday: holidayCheck.isHoliday,
      holidayName: holidayCheck.holidayName,
      counts: {
        siswa: totalSiswa,
        guru: totalGuru,
        pegawai: totalPegawai,
        kepsek: totalKepsek,
        totalPeople: totalSiswa + totalGuru + totalPegawai + totalKepsek,
      },
      breakdown,
      activities: evaluatedActivities.filter((a) => a.isToday),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memuat statistik dashboard." },
      { status: 500 }
    );
  }
}
