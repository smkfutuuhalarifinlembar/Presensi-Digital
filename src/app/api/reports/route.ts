import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { getTodayDateString } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

// Get holidays + Sundays within a date range (untuk matriks bulanan & rentang)
async function getHolidaysForRange(startDate: string, endDate: string): Promise<string[]> {
  // Get holidays from database
  const holidays = await prisma.holiday.findMany({
    where: {
      isActive: true,
      dateString: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: { dateString: true },
  });

  const holidayDates = new Set(holidays.map((h) => h.dateString));

  // Add Sundays dalam rentang
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    if (d.getDay() === 0) {
      holidayDates.add(`${y}-${m}-${day}`);
    }
  }

  return Array.from(holidayDates);
}

export async function GET(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const today = getTodayDateString();
    const startDate = searchParams.get("startDate") || today;
    const endDate = searchParams.get("endDate") || today;
    const activityId = searchParams.get("activityId");
    const role = searchParams.get("role");
    const className = searchParams.get("className");
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get("limit") || "50")));
    const view = (searchParams.get("view") || "list").toLowerCase(); // list | matrix | monthly

    const where: any = {
      dateString: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (activityId && activityId !== "ALL") {
      where.activityId = activityId;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (role && role !== "ALL") {
      where.person = { ...where.person, role };
    }

    if (className && className !== "ALL") {
      where.person = { ...where.person, className };
    }

    if (search) {
      where.person = {
        ...where.person,
        OR: [
          { name: { contains: search } },
          { nisNip: { contains: search } },
        ],
      };
    }

    // ============== MONTHLY MODE (01-31 per bulan) ==============
    if (view === "monthly") {
      // Ambil semua orang yang cocok filter (sebagai basis baris)
      const personWhere: any = { isActive: true };
      if (role && role !== "ALL") personWhere.role = role;
      if (className && className !== "ALL") personWhere.className = className;
      if (search) {
        personWhere.OR = [
          { name: { contains: search } },
          { nisNip: { contains: search } },
        ];
      }

      const start = new Date(startDate + "T00:00:00");
      const year = start.getFullYear();
      const month = start.getMonth();

      const [people, records, holidayDates] = await Promise.all([
        prisma.person.findMany({
          where: personWhere,
          orderBy: [{ role: "asc" }, { className: "asc" }, { name: "asc" }],
        }),
        prisma.attendanceRecord.findMany({
          where,
          include: { activity: { select: { name: true } } },
        }),
        getHolidaysForRange(startDate, endDate),
      ]);

      // Tentukan daftar tanggal 01-31 dari bulan yang dipilih
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dates: string[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const y = year;
        const m = String(month + 1).padStart(2, "0");
        const d = String(day).padStart(2, "0");
        dates.push(`${y}-${m}-${d}`);
      }

      // Map: personId+date -> status code (jika multi-kegiatan dalam 1 hari, pilih yang paling representatif)
      // Prioritas: HADIR > TERLAMBAT > SAKIT > IZIN > DINAS_LUAR > BOLOS > ALPA
      const priority = ["HADIR", "TERLAMBAT", "SAKIT", "IZIN", "DINAS_LUAR", "BOLOS", "ALPA"];
      const map: Record<string, Record<string, string>> = {};
      for (const p of people) {
        map[p.id] = {};
        for (const d of dates) {
          if (holidayDates.includes(d)) {
            // Mark holidays as "LIBUR" - tidak dihitung sebagai Alpa
            map[p.id][d] = "LIBUR";
          } else {
            // Default: tanpa data presensi = ALPA (Alpa)
            map[p.id][d] = "ALPA";
          }
        }
      }
      for (const r of records) {
        const cur = map[r.personId]?.[r.dateString];
        if (cur === undefined) continue;
        // Record presensi akan override status default (ALPA atau LIBUR)
        if (cur === "ALPA" || cur === "LIBUR") {
          map[r.personId][r.dateString] = r.status;
          continue;
        }
        // Pilih status dengan prioritas lebih tinggi (indeks lebih kecil = lebih penting)
        const curIdx = priority.indexOf(cur);
        const newIdx = priority.indexOf(r.status);
        if (newIdx !== -1 && (curIdx === -1 || newIdx < curIdx)) {
          map[r.personId][r.dateString] = r.status;
        }
      }

      // Summary per orang (exclude LIBUR from summary counts)
      const matrix = people.map((p: any) => {
        const row = map[p.id];
        let H = 0, T = 0, I = 0, S = 0, A = 0, B = 0, D = 0;
        for (const d of dates) {
          const v = row[d];
          if (v === "HADIR") H++;
          else if (v === "TERLAMBAT") T++;
          else if (v === "IZIN") I++;
          else if (v === "SAKIT") S++;
          else if (v === "ALPA") A++;
          else if (v === "BOLOS") B++;
          else if (v === "DINAS_LUAR") D++;
          // LIBUR is not counted in any category
        }
        return {
          personId: p.id,
          name: p.name,
          nisNip: p.nisNip,
          role: p.role,
          className: p.className,
          position: p.position,
          cells: row,
          summary: { H, T, I, S, A, B, D },
        };
      });

      return NextResponse.json({
        view: "monthly",
        dates,
        holidays: holidayDates,
        startDate,
        endDate,
        matrix,
      });
    }

    // ============== MATRIX MODE ==============
    if (view === "matrix") {
      // Ambil semua orang yang cocok filter (sebagai basis baris)
      const personWhere: any = { isActive: true };
      if (role && role !== "ALL") personWhere.role = role;
      if (className && className !== "ALL") personWhere.className = className;
      if (search) {
        personWhere.OR = [
          { name: { contains: search } },
          { nisNip: { contains: search } },
        ];
      }

      const start = new Date(startDate + "T00:00:00");
      const year = start.getFullYear();
      const month = start.getMonth();

      const [people, records, holidayDates] = await Promise.all([
        prisma.person.findMany({
          where: personWhere,
          orderBy: [{ role: "asc" }, { className: "asc" }, { name: "asc" }],
        }),
        prisma.attendanceRecord.findMany({
          where,
          include: { activity: { select: { name: true } } },
        }),
        getHolidaysForRange(startDate, endDate),
      ]);

      // Tentukan daftar tanggal dari startDate-endDate
      const dates: string[] = [];
      const end = new Date(endDate + "T00:00:00");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        dates.push(`${y}-${m}-${day}`);
      }

      // Map: personId+date -> status code (jika multi-kegiatan dalam 1 hari, pilih yang paling representatif)
      // Prioritas: HADIR > TERLAMBAT > SAKIT > IZIN > DINAS_LUAR > BOLOS > ALPA
      const priority = ["HADIR", "TERLAMBAT", "SAKIT", "IZIN", "DINAS_LUAR", "BOLOS", "ALPA"];
      const map: Record<string, Record<string, string>> = {};
      for (const p of people) {
        map[p.id] = {};
        for (const d of dates) {
          if (holidayDates.includes(d)) {
            map[p.id][d] = "LIBUR";
          } else {
            map[p.id][d] = "ALPA";
          }
        }
      }
      for (const r of records) {
        const cur = map[r.personId]?.[r.dateString];
        if (cur === undefined) continue;
        if (cur === "ALPA" || cur === "LIBUR") {
          map[r.personId][r.dateString] = r.status;
          continue;
        }
        // Pilih status dengan prioritas lebih tinggi (indeks lebih kecil = lebih penting)
        const curIdx = priority.indexOf(cur);
        const newIdx = priority.indexOf(r.status);
        if (newIdx !== -1 && (curIdx === -1 || newIdx < curIdx)) {
          map[r.personId][r.dateString] = r.status;
        }
      }

      // Summary per orang
      const matrix = people.map((p: any) => {
        const row = map[p.id];
        let H = 0, T = 0, I = 0, S = 0, A = 0, B = 0, D = 0;
        for (const d of dates) {
          const v = row[d];
          if (v === "HADIR") H++;
          else if (v === "TERLAMBAT") T++;
          else if (v === "IZIN") I++;
          else if (v === "SAKIT") S++;
          else if (v === "ALPA") A++;
          else if (v === "BOLOS") B++;
          else if (v === "DINAS_LUAR") D++;
        }
        return {
          personId: p.id,
          name: p.name,
          nisNip: p.nisNip,
          role: p.role,
          className: p.className,
          position: p.position,
          cells: row,
          summary: { H, T, I, S, A, B, D },
        };
      });

      return NextResponse.json({
        view: "matrix",
        dates,
        startDate,
        endDate,
        matrix,
      });
    }

    // ============== LIST MODE (default) ==============
    const [total, records, allStatusCounts] = await Promise.all([
      prisma.attendanceRecord.count({ where }),
      prisma.attendanceRecord.findMany({
        where,
        include: {
          person: true,
          activity: true,
          recordedByAdmin: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: [{ dateString: "desc" }, { timeString: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.attendanceRecord.groupBy({
        by: ["status"],
        where,
        _count: { status: true },
      }),
    ]);

    const summary: Record<string, number> = {
      TOTAL: total,
      HADIR: 0,
      TERLAMBAT: 0,
      IZIN: 0,
      SAKIT: 0,
      ALPA: 0,
      BOLOS: 0,
      DINAS_LUAR: 0,
    };

    for (const item of allStatusCounts) {
      summary[item.status] = item._count.status;
    }

    return NextResponse.json({
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memuat data laporan presensi." },
      { status: 500 }
    );
  }
}
