import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { getTodayDateString } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayDateStr = getTodayDateString();

    const [people, records, recentRecords] = await Promise.all([
      prisma.person.findMany({
        where: { isActive: true },
        orderBy: [{ role: "asc" }, { className: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          role: true,
          className: true,
          position: true,
          photoUrl: true,
        },
      }),
      prisma.attendanceRecord.findMany({
        where: { dateString: todayDateStr },
        include: { activity: { select: { name: true } } },
      }),
      prisma.attendanceRecord.findMany({
        where: { dateString: todayDateStr },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          person: { select: { name: true, role: true, className: true, position: true, photoUrl: true } },
          activity: { select: { name: true } },
        },
      }),
    ]);

    // Index records by personId, keep first status
    const personStatus: Record<string, { status: string; activity: string; time: string }> = {};
    for (const r of records) {
      if (!personStatus[r.personId]) {
        personStatus[r.personId] = {
          status: r.status,
          activity: r.activity?.name || "-",
          time: r.timeString,
        };
      }
    }

    // Group per kelas (khusus siswa)
    const byClass: Record<string, {
      className: string;
      role: string;
      members: { id: string; name: string; status: string; activity: string; time: string; photoUrl: string | null }[];
      stats: { total: number; checkedIn: number; hadir: number; terlambat: number; izin: number; sakit: number; belum: number };
    }> = {};

    for (const p of people) {
      const key = p.role === "SISWA" ? (p.className || "Tanpa Kelas") : (p.role === "GURU" ? "Guru & Tenaga Pendidik" : p.role === "KEPALA_SEKOLAH" ? "Kepsek" : "Pegawai & Staf");
      if (!byClass[key]) {
        byClass[key] = {
          className: key,
          role: p.role === "SISWA" ? "SISWA" : (p.role === "GURU" ? "GURU" : "PEGAWAI"),
          members: [],
          stats: { total: 0, checkedIn: 0, hadir: 0, terlambat: 0, izin: 0, sakit: 0, belum: 0 },
        };
      }
      const s = personStatus[p.id];
      const status = s?.status || "BELUM";
      byClass[key].members.push({
        id: p.id,
        name: p.name,
        status,
        activity: s?.activity || "-",
        time: s?.time || "-",
        photoUrl: p.photoUrl,
      });
      byClass[key].stats.total++;
      if (status === "HADIR") {
        byClass[key].stats.hadir++;
        byClass[key].stats.checkedIn++;
      } else if (status === "TERLAMBAT") {
        byClass[key].stats.terlambat++;
        byClass[key].stats.checkedIn++;
      } else if (status === "IZIN") {
        byClass[key].stats.izin++;
        byClass[key].stats.checkedIn++;
      } else if (status === "SAKIT") {
        byClass[key].stats.sakit++;
        byClass[key].stats.checkedIn++;
      } else {
        byClass[key].stats.belum++;
      }
    }

    const totalAll = people.length;
    const checkedInAll = Object.values(byClass).reduce((s, c) => s + c.stats.checkedIn, 0);

    return NextResponse.json({
      todayDateStr,
      totalAll,
      checkedInAll,
      byClass: Object.values(byClass).sort((a, b) => a.className.localeCompare(b.className)),
      recent: recentRecords.map((r) => ({
        id: r.id,
        personId: r.personId,
        name: r.person?.name || "-",
        role: r.person?.role || "-",
        className: r.person?.className || r.person?.position || "",
        photoUrl: r.person?.photoUrl || null,
        status: r.status,
        activity: r.activity?.name || "-",
        time: r.timeString,
        createdAt: r.createdAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal memuat data monitoring." }, { status: 500 });
  }
}
