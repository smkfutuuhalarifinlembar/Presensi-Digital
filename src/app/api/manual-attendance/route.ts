import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import {
  getTodayDateString,
  getCurrentTimeString,
  formatDateIndo,
  activityAppliesToPerson,
  activityRunsOnDate,
} from "@/lib/date-utils";
import { processAutomaticAttendanceNotification } from "@/lib/wa-sender";

const VALID_STATUSES = [
  "HADIR",
  "TERLAMBAT",
  "IZIN",
  "SAKIT",
  "ALPA",
  "BOLOS",
  "DINAS_LUAR",
];

// Batas aman agar satu input tidak membanjiri database
const MAX_RANGE_DAYS = 62;

function buildDateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (d <= last && out.length < MAX_RANGE_DAYS) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export async function GET(req: Request) {
  try {
    const auth = await requireRole("ADMIN_OPERATOR");
    if (!auth.ok) return auth.error;
    const admin = auth.admin;

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
    const auth = await requireRole("ADMIN_OPERATOR");
    if (!auth.ok) return auth.error;
    const admin = auth.admin;

    const body = await req.json();
    const {
      personId,
      activityId, // opsional (kompatibilitas lama); bila diisi, batasi ke kegiatan itu
      status = "HADIR",
      remarks,
      dateString,
      endDateString,
    } = body;

    if (!personId || !status) {
      return NextResponse.json(
        { error: "Orang dan Status Kehadiran wajib dipilih." },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Status kehadiran tidak valid." }, { status: 400 });
    }

    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person) {
      return NextResponse.json({ error: "Data orang tidak ditemukan." }, { status: 404 });
    }

    const startDate = dateString || getTodayDateString();
    const endDate = endDateString || startDate;

    if (endDate < startDate) {
      return NextResponse.json(
        { error: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai." },
        { status: 400 }
      );
    }

    const dates = buildDateRange(startDate, endDate);
    if (dates.length === 0) {
      return NextResponse.json({ error: "Rentang tanggal tidak valid." }, { status: 400 });
    }
    if (dates.length >= MAX_RANGE_DAYS) {
      return NextResponse.json(
        { error: `Rentang tanggal maksimal ${MAX_RANGE_DAYS} hari.` },
        { status: 400 }
      );
    }

    // Semua kegiatan yang berlaku untuk orang ini (Siswa/Guru/Pegawai)
    const allActivities = await prisma.activity.findMany({
      where: {
        isActive: true,
        ...(activityId && activityId !== "ALL" ? { id: activityId } : {}),
      },
      orderBy: { startTime: "asc" },
    });

    const applicable = allActivities.filter((a) => activityAppliesToPerson(a, person));

    if (applicable.length === 0) {
      return NextResponse.json(
        {
          error:
            "Tidak ada kegiatan presensi yang berlaku untuk orang ini. Periksa pengaturan Target Peserta pada kegiatan.",
        },
        { status: 400 }
      );
    }

    const timeStr = getCurrentTimeString();
    const remarkText =
      remarks?.trim() || `Input manual oleh admin ${admin.name}`;

    // Libur nasional tidak dicatat (di rekap sudah tampil sebagai "L")
    const holidays = await prisma.holiday.findMany({
      where: { isActive: true, dateString: { in: dates } },
      select: { dateString: true },
    });
    const holidaySet = new Set(holidays.map((h) => h.dateString));

    const appliedDates: string[] = [];
    const skippedDates: string[] = [];
    const notifyIds: string[] = []; // satu notifikasi per tanggal (anti spam)
    let createdCount = 0;
    let updatedCount = 0;

    for (const day of dates) {
      const dayActivities = applicable.filter((a) => activityRunsOnDate(a, day));

      if (dayActivities.length === 0) {
        skippedDates.push(day);
        continue;
      }

      // Hari Minggu / libur: biarkan rekap menampilkannya sebagai Libur
      const dow = new Date(`${day}T00:00:00`).getDay();
      if (dow === 0 || holidaySet.has(day)) {
        skippedDates.push(day);
        continue;
      }

      for (const activity of dayActivities) {
        const existing = await prisma.attendanceRecord.findUnique({
          where: {
            personId_activityId_dateString: {
              personId: person.id,
              activityId: activity.id,
              dateString: day,
            },
          },
        });

        if (existing) {
          await prisma.attendanceRecord.update({
            where: { id: existing.id },
            data: {
              status,
              remarks: remarkText,
              recordedByAdminId: admin.adminId,
              method: "MANUAL",
              waNotificationSent: false,
              waNotificationStatus: "PENDING",
            },
          });
          updatedCount++;
          notifyIds.push(existing.id);
        } else {
          const record = await prisma.attendanceRecord.create({
            data: {
              personId: person.id,
              activityId: activity.id,
              dateString: day,
              timeString: timeStr,
              status,
              method: "MANUAL",
              remarks: remarkText,
              recordedByAdminId: admin.adminId,
            },
          });
          createdCount++;
          notifyIds.push(record.id);
        }
      }

      appliedDates.push(day);
    }

    if (appliedDates.length === 0) {
      return NextResponse.json(
        {
          error:
            "Tidak ada kegiatan yang berjalan pada rentang tanggal tersebut (semua hari libur/Minggu).",
        },
        { status: 400 }
      );
    }

    const categoriesTouched = Array.from(
      new Set(
        applicable
          .filter((a) => activityRunsOnDate(a, appliedDates[0]))
          .map((a) => a.category || "UMUM")
      )
    );

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "MANUAL_ATTENDANCE",
        target: `${person.name} (${person.nisNip})`,
        details: `Status ${status} pada ${appliedDates.length} hari (${formatDateIndo(
          appliedDates[0]
        )} s.d ${formatDateIndo(appliedDates[appliedDates.length - 1])}), ${
          createdCount + updatedCount
        } catatan pada kategori [${categoriesTouched.join(", ")}]. Ket: ${
          remarks || "-"
        }`,
      },
    });

    // Notifikasi WhatsApp: satu pesan per tanggal agar tidak membanjiri,
    // dan tidak bergantung pada keberhasilan pengiriman.
    const uniqueNotifyIds = Array.from(new Set(notifyIds)).slice(
      0,
      appliedDates.length
    );
    after(async () => {
      for (const id of uniqueNotifyIds) {
        try {
          await processAutomaticAttendanceNotification(id, { source: "MANUAL" });
        } catch (err) {
          console.error("Gagal mengirim notifikasi WA manual:", err);
        }
      }
    });

    const rangeLabel =
      appliedDates.length === 1
        ? formatDateIndo(appliedDates[0])
        : `${formatDateIndo(appliedDates[0])} s.d ${formatDateIndo(
            appliedDates[appliedDates.length - 1]
          )}`;

    let message = `Presensi manual ${person.name} tersimpan: ${status} pada ${rangeLabel} (${appliedDates.length} hari, kategori: ${categoriesTouched.join(
      ", "
    )}).`;
    if (skippedDates.length > 0) {
      message += ` ${skippedDates.length} hari dilewati (Minggu/libur/tanpa kegiatan).`;
    }
    message += " Notifikasi WhatsApp sedang diproses.";

    return NextResponse.json({
      success: true,
      message,
      appliedDates,
      skippedDates,
      categories: categoriesTouched,
      createdCount,
      updatedCount,
      recordId: uniqueNotifyIds[0] || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mencatat presensi manual." },
      { status: 500 }
    );
  }
}
