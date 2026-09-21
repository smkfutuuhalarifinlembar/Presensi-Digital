import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getTodayDateString,
  getCurrentTimeString,
  evaluateActivityState,
  calculatePresenceStatus,
  formatDateIndo,
} from "@/lib/date-utils";
import { processAutomaticAttendanceNotification } from "@/lib/wa-sender";

// In-memory cache untuk anti double-tap cepat (30 detik per identitas)
const recentTapsCache = new Map<string, number>();

export async function POST(req: Request) {
  try {
    const { identifier, method = "RFID", activityId } = await req.json();

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json(
        { error: "Kode kartu RFID atau QR Code tidak terdeteksi." },
        { status: 400 }
      );
    }

    const cleanCode = identifier.trim();
    const now = new Date();
    const todayDateStr = getTodayDateString();
    const currentTimeStr = getCurrentTimeString();

    // 1. Anti Double-Tap / Debounce (30 detik)
    const nowEpoch = Date.now();
    const lastTap = recentTapsCache.get(cleanCode);
    if (lastTap && nowEpoch - lastTap < 30 * 1000) {
      const secondsLeft = Math.ceil((30 * 1000 - (nowEpoch - lastTap)) / 1000);
      return NextResponse.json(
        {
          error: `Kartu baru saja di-tap! Mohon tunggu ${secondsLeft} detik sebelum tap kembali.`,
          isDuplicateCooldown: true,
        },
        { status: 429 }
      );
    }

    // 2. Cari Data Orang
    let person = null;
    if (method === "RFID") {
      person = await prisma.person.findFirst({
        where: {
          OR: [
            { rfidUid: cleanCode },
            { rfidUid: cleanCode.toUpperCase() },
            { nisNip: cleanCode },
          ],
          isActive: true,
        },
      });
    } else {
      person = await prisma.person.findFirst({
        where: {
          OR: [
            { qrCodeToken: cleanCode },
            { nisNip: cleanCode },
            { rfidUid: cleanCode },
          ],
          isActive: true,
        },
      });
    }

    if (!person) {
      return NextResponse.json(
        {
          error: `Kartu / QR Code [${cleanCode}] tidak terdaftar dalam sistem. Hubungi bagian Tata Usaha.`,
        },
        { status: 404 }
      );
    }

    // Simpan ke debounce cache
    recentTapsCache.set(cleanCode, nowEpoch);

    // 3. Tentukan Kegiatan Presensi yang Dituju
    let targetActivity = null;

    if (activityId) {
      targetActivity = await prisma.activity.findUnique({
        where: { id: activityId },
      });
    } else {
      // Cari kegiatan aktif otomatis, difilter berdasarkan lembaga orang tersebut
      const allActivities = await prisma.activity.findMany({
        where: {
          isActive: true,
          OR: [
            { institutionId: null },
            { institutionId: person.institutionId || "___none___" },
          ],
        },
        orderBy: { startTime: "asc" },
      });

      const evaluated = allActivities
        .map((act) => evaluateActivityState(act, now))
        .filter((a) => {
          if (a.targetClasses && a.targetClasses !== "ALL") {
            if (person.role === "SISWA") {
              const classes = a.targetClasses.split(",").map((c: string) => c.trim());
              if (!person.className || !classes.includes(person.className)) return false;
            }
          }
          return true;
        });

      // Ambil yang isToday dan state === "ACTIVE"
      const activeActs = evaluated.filter((a) => a.isToday && a.state === "ACTIVE");

      if (activeActs.length > 0) {
        targetActivity = activeActs[0];
      } else {
        // Cek apakah ada kegiatan hari ini yang akan datang atau selesai
        const todayActs = evaluated.filter((a) => a.isToday);
        if (todayActs.length > 0) {
          const upcoming = todayActs.find((a) => a.state === "UPCOMING");
          if (upcoming) {
          return NextResponse.json(
            {
              error: `Sesi presensi "${upcoming.name}" belum dibuka (jam mulai ${upcoming.startTime}).`,
            },
            { status: 400 }
          );
          }
          return NextResponse.json(
            {
              error: `Sesi presensi untuk hari ini telah selesai ditutup. Tidak ada sesi aktif saat ini.`,
            },
            { status: 400 }
          );
        } else {
          return NextResponse.json(
            {
              error: `Tidak ada jadwal kegiatan presensi untuk hari ini.`,
            },
            { status: 400 }
          );
        }
      }
    }

    if (!targetActivity) {
      return NextResponse.json(
        { error: "Kegiatan presensi tidak ditemukan." },
        { status: 404 }
      );
    }

    // 4. Periksa apakah orang ini sudah presensi di kegiatan ini hari ini
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        personId_activityId_dateString: {
          personId: person.id,
          activityId: targetActivity.id,
          dateString: todayDateStr,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: `${person.name} sudah tercatat presensi pada ${existing.timeString} (${existing.status}).`,
          alreadyCheckedIn: true,
          person: {
            name: person.name,
            nisNip: person.nisNip,
            role: person.role,
            className: person.className,
            position: person.position,
            photoUrl: person.photoUrl,
          },
          time: existing.timeString,
          status: existing.status,
        },
        { status: 400 }
      );
    }

    // 5. Hitung Status Presensi (HADIR vs TERLAMBAT)
    const presenceStatus = calculatePresenceStatus(targetActivity, currentTimeStr);
    const remarks =
      presenceStatus === "TERLAMBAT"
        ? `Tercatat terlambat pada jam ${currentTimeStr}`
        : "Hadir tepat waktu";

    // 6. Simpan Catatan Presensi
    const record = await prisma.attendanceRecord.create({
      data: {
        personId: person.id,
        activityId: targetActivity.id,
        dateString: todayDateStr,
        timeString: currentTimeStr,
        status: presenceStatus,
        method: method,
        remarks: remarks,
      },
    });

    // 7. Picu Notifikasi WhatsApp secara Asinkron (tidak memblokir respon ke kiosk)
    processAutomaticAttendanceNotification(record.id).catch((err) => {
      console.error("Gagal mengirim notifikasi WA:", err);
    });

    return NextResponse.json({
      success: true,
      status: presenceStatus,
      message:
        presenceStatus === "HADIR"
          ? "Presensi Berhasil (Tepat Waktu)"
          : "Presensi Berhasil (Terlambat)",
      person: {
        id: person.id,
        name: person.name,
        nisNip: person.nisNip,
        role: person.role,
        className: person.className,
        position: person.position,
        photoUrl: person.photoUrl,
      },
      activityName: targetActivity.name,
      time: currentTimeStr,
      date: formatDateIndo(todayDateStr),
      method: method,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Terjadi kesalahan sistem saat memproses presensi." },
      { status: 500 }
    );
  }
}
