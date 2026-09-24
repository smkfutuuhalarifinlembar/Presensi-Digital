import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getTodayDateString,
  getCurrentTimeString,
  evaluateActivityState,
  activityAppliesToPerson,
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

    // 2. Cari Data Orang BERDASARKAN DATA KARTU (bukan NIS/NIP)
    //    - RFID  -> hanya dicocokkan dengan kolom `rfidUid` (UID kartu RFID yang didaftarkan)
    //    - QR    -> hanya dicocokkan dengan kolom `qrCodeToken` (isi QR Code yang tercetak di kartu)
    //    - MANUAL -> khusus pengetikan manual NIS/NIP di layar kiosk
    //    Tujuannya: presensi tidak lagi bergantung pada NIS/NIP yang bisa saja
    //    belum ada / belum sesuai, tetapi murni pada data kartu yang terdaftar.
    const methodUpper = String(method).toUpperCase();
    const codeVariants = Array.from(
      new Set([cleanCode, cleanCode.toUpperCase(), cleanCode.toLowerCase()])
    );

    let person = null;
    if (methodUpper === "QR") {
      person = await prisma.person.findFirst({
        where: {
          qrCodeToken: { in: codeVariants },
          isActive: true,
        },
      });

      if (!person) {
        return NextResponse.json(
          {
            error: `QR Code kartu [${cleanCode}] belum terdaftar. Cetak ulang kartu dari menu Cetak ID Card atau daftarkan di menu Kelola Orang.`,
          },
          { status: 404 }
        );
      }
    } else if (methodUpper === "MANUAL") {
      // Input manual (keyboard di layar kiosk) -> memakai NIS/NIP
      person = await prisma.person.findFirst({
        where: {
          nisNip: cleanCode,
          isActive: true,
        },
      });

      if (!person) {
        return NextResponse.json(
          {
            error: `NIS/NIP [${cleanCode}] tidak terdaftar dalam sistem. Hubungi bagian Tata Usaha.`,
          },
          { status: 404 }
        );
      }
    } else {
      // Default: pembacaan kartu RFID
      person = await prisma.person.findFirst({
        where: {
          rfidUid: { in: codeVariants },
          isActive: true,
        },
      });

      if (!person) {
        return NextResponse.json(
          {
            error: `Kartu RFID [${cleanCode}] belum terdaftar. Daftarkan kode kartunya di menu Kelola Orang lalu coba tap kembali.`,
          },
          { status: 404 }
        );
      }
    }

    // Simpan ke debounce cache
    recentTapsCache.set(cleanCode, nowEpoch);

    // 3. Tentukan Kegiatan Presensi yang Dituju
    //    Kegiatan SELALU divalidasi ulang dari database (bukan percaya pada
    //    activityId dari layar kiosk yang bisa saja sudah basi), menggunakan
    //    aturan yang sama dengan "Manajemen Jadwal & Jam Presensi":
    //    - isActive & berlaku hari ini (hari / tanggal khusus)
    //    - sesi sedang berbuka (ACTIVE)
    //    - lembaga, target peserta, dan target kelas cocok untuk orang ini
    let targetActivity = null;

    const allActivities = await prisma.activity.findMany({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
    });

    const applicableActivities = allActivities
      .map((act) => evaluateActivityState(act, now))
      .filter((a) => a.isToday && activityAppliesToPerson(a, person));

    // Utamakan kegiatan yang diminta kiosk, asalkan masih valid & terbuka
    if (activityId) {
      const preferred = applicableActivities.find(
        (a) => a.id === activityId && a.state === "ACTIVE"
      );
      if (preferred) {
        targetActivity = preferred;
      }
    }

    if (!targetActivity) {
      // Cari kegiatan aktif otomatis untuk orang ini
      const activeActs = applicableActivities.filter((a) => a.state === "ACTIVE");

      if (activeActs.length > 0) {
        targetActivity = activeActs[0];
      } else {
        // Cek apakah ada kegiatan hari ini yang akan datang atau selesai
        if (applicableActivities.length > 0) {
          const upcoming = applicableActivities.find((a) => a.state === "UPCOMING");
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
