import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { getTodayDateString } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

const STATUS_PRIORITY = ["HADIR", "TERLAMBAT", "SAKIT", "IZIN", "DINAS_LUAR", "BOLOS", "ALPA"];

function getHighestPriorityRecord(records: any[]): any | null {
  if (!records || records.length === 0) return null;
  return records.reduce((best, current) => {
    const bestIdx = STATUS_PRIORITY.indexOf(best.status);
    const currentIdx = STATUS_PRIORITY.indexOf(current.status);
    if (currentIdx === -1) return best;
    if (bestIdx === -1 || currentIdx < bestIdx) return current;
    return best;
  });
}

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
    const category = searchParams.get("category");
    const role = searchParams.get("role");
    const className = searchParams.get("className");
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get("limit") || "50")));
    const view = (searchParams.get("view") || "list").toLowerCase(); // list | matrix | monthly

    // Fetch distinct categories for dropdown
    const categories = await prisma.activity.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ["category"],
    });
    const categoryOptions = categories.map((c) => c.category).filter(Boolean) as string[];

    const where: any = {
      dateString: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Handle category filter - get activity IDs for the category
    let categoryActivityIds: string[] = [];
    if (category && category !== "ALL") {
      const activities = await prisma.activity.findMany({
        where: { category, isActive: true },
        select: { id: true },
      });
      categoryActivityIds = activities.map((a) => a.id);
    }

    // Determine activity filter: specific activityId OR category activities
    if (activityId && activityId !== "ALL") {
      where.activityId = activityId;
    } else if (categoryActivityIds.length > 0) {
      where.activityId = { in: categoryActivityIds };
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
          { name: { contains: search, mode: "insensitive" } },
          { nisNip: { contains: search, mode: "insensitive" } },
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
          { name: { contains: search, mode: "insensitive" } },
          { nisNip: { contains: search, mode: "insensitive" } },
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
          include: { activity: { select: { name: true, category: true } } },
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
        categories: categoryOptions,
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
          { name: { contains: search, mode: "insensitive" } },
          { nisNip: { contains: search, mode: "insensitive" } },
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
          include: { activity: { select: { name: true, category: true } } },
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
        categories: categoryOptions,
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
      categories: categoryOptions,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memuat data laporan presensi." },
      { status: 500 }
    );
  }
}

// PATCH: Update attendance record cell (for matrix edit)
export async function PATCH(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { personId, dateString, status, activityId, category } = body;

    if (!personId || !dateString || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Valid statuses
    const validStatuses = ["HADIR", "TERLAMBAT", "IZIN", "SAKIT", "ALPA", "BOLOS", "DINAS_LUAR"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Find existing attendance records for this person/date
    const where: any = {
      personId,
      dateString,
    };
    if (activityId && activityId !== "ALL") {
      where.activityId = activityId;
    }

    const existingRecords = await prisma.attendanceRecord.findMany({
      where,
      orderBy: [{ dateString: "desc" }, { timeString: "desc" }],
    });

    let record;
    if (existingRecords.length > 0) {
      // Update the highest priority record (or the specific activity if provided)
      const targetRecord = activityId && activityId !== "ALL"
        ? existingRecords.find(r => r.activityId === activityId)
        : getHighestPriorityRecord(existingRecords);
      
      if (targetRecord) {
        record = await prisma.attendanceRecord.update({
          where: { id: targetRecord.id },
          data: { 
            status,
          },
        });
      } else {
        // Fallback: update the first record
        record = await prisma.attendanceRecord.update({
          where: { id: existingRecords[0].id },
          data: { 
            status,
          },
        });
      }
    } else {
      // Create new attendance record
      // Need to get a default activity if not provided
      let targetActivityId = activityId;
      if (!targetActivityId || targetActivityId === "ALL") {
        if (category && category !== "ALL") {
          // Find first activity in the category
          const categoryActivity = await prisma.activity.findFirst({
            where: { category, isActive: true },
            orderBy: { createdAt: "asc" },
          });
          targetActivityId = categoryActivity?.id;
        }
        if (!targetActivityId) {
          // Fallback to any active activity
          const firstActivity = await prisma.activity.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
          });
          targetActivityId = firstActivity?.id;
        }
      }
      
      if (!targetActivityId) {
        return NextResponse.json({ error: "No active activity found" }, { status: 400 });
      }

      record = await prisma.attendanceRecord.create({
        data: {
          personId,
          activityId: targetActivityId,
          dateString,
          timeString: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }),
          status,
          method: "MANUAL",
          recordedByAdminId: admin.adminId,
        },
      });
    }

    return NextResponse.json({ success: true, record });
  } catch (err: any) {
    console.error("Error updating attendance:", err);
    return NextResponse.json(
      { error: err?.message || "Gagal memperbarui data presensi." },
      { status: 500 }
    );
  }
}
