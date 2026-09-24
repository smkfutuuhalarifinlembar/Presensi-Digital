const HARI_INDO = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const BULAN_INDO = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// ============================================================
// Zona waktu sekolah
// ------------------------------------------------------------
// Semua perhitungan jadwal presensi (hari berlaku, buka/tutup
// sesi, batas hadir, jam yang dicatat ke database) dihitung di
// zona waktu sekolah, BUKAN zona waktu server.
//
// Mengapa penting: VPS/builder umumnya berjalan dalam UTC,
// sedangkan sekolah berada di WITA (UTC+8). Jika memakai zona
// server, status "Jadwal Hari Ini" di layar presensi dan panel
// admin akan meleset berjam-jam dari jam sebenarnya (mis. jam
// 07:57 pagi sudah dinilai "Sudah Selesai" karena server masih
// Rabu 23:57 UTC).
//
// Zona bisa dioverride lewat env SCHOOL_TIMEZONE
// (contoh: "Asia/Jakarta" = WIB, "Asia/Makassar" = WITA).
// ============================================================
const DEFAULT_SCHOOL_TIMEZONE = "Asia/Makassar";

function getSchoolTimezone(): string {
  try {
    if (typeof process !== "undefined" && process.env) {
      const envTz = process.env.SCHOOL_TIMEZONE;
      if (envTz) return envTz;
    }
  } catch {
    // lingkungan tanpa process.env (mis. sandbox) → pakai default
  }
  return DEFAULT_SCHOOL_TIMEZONE;
}

const schoolFormatterCache = new Map<string, Intl.DateTimeFormat>();

function createFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

function getSchoolFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = schoolFormatterCache.get(timeZone);
  if (cached) return cached;

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = createFormatter(timeZone);
  } catch {
    // Zona tidak dikenal → kembalikan zona default sekolah
    formatter = createFormatter(DEFAULT_SCHOOL_TIMEZONE);
  }
  schoolFormatterCache.set(timeZone, formatter);
  return formatter;
}

export interface SchoolTimeParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number;
  dayOfWeek: number; // 0 = Ahad ... 6 = Sabtu
  minutes: number; // menit sejak tengah malam
  dateString: string; // YYYY-MM-DD
  timeString: string; // HH:MM:SS
}

/**
 * Mengambil komponen waktu sebuah Date sesuai zona waktu sekolah,
 * independen dari zona waktu server/browser.
 */
export function getSchoolTimeParts(date: Date = new Date()): SchoolTimeParts {
  const parts = getSchoolFormatter(getSchoolTimezone()).formatToParts(date);
  const num = (type: string): number => {
    const raw = parts.find((p) => p.type === type)?.value ?? "0";
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const year = num("year");
  const month = num("month");
  const day = num("day");
  // Beberapa versi ICU lama melaporkan "24" untuk tengah malam
  const hour = num("hour") % 24;
  const minute = num("minute");
  const second = num("second");

  // Hari dalam minggu dihitung dari komponen tanggal murni
  // (independen dari zona waktu proses)
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  const pad2 = (n: number) => String(n).padStart(2, "0");

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dayOfWeek,
    minutes: hour * 60 + minute,
    dateString: `${year}-${pad2(month)}-${pad2(day)}`,
    timeString: `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`,
  };
}

/** Parse string tanggal murni "YYYY-MM-DD" tanpa bergantung zona waktu. */
function parseDateOnlyString(input: string): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
} | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, dayOfWeek };
}

export function formatDateIndo(dateInput: Date | string): string {
  // String tanggal polos "YYYY-MM-DD" → parse manual agar tidak
  // bergeser hari karena zona waktu proses (new Date("YYYY-MM-DD")
  // diinterpretasikan sebagai tengah malam UTC).
  if (typeof dateInput === "string") {
    const dateOnly = parseDateOnlyString(dateInput);
    if (dateOnly) {
      return `${HARI_INDO[dateOnly.dayOfWeek]}, ${dateOnly.day} ${BULAN_INDO[dateOnly.month - 1]} ${dateOnly.year}`;
    }
  }

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const hari = HARI_INDO[date.getDay()];
  const tgl = date.getDate();
  const bln = BULAN_INDO[date.getMonth()];
  const thn = date.getFullYear();

  return `${hari}, ${tgl} ${bln} ${thn}`;
}

export function formatShortDateIndo(dateInput: Date | string): string {
  if (typeof dateInput === "string") {
    const dateOnly = parseDateOnlyString(dateInput);
    if (dateOnly) {
      const tgl = String(dateOnly.day).padStart(2, "0");
      const bln = BULAN_INDO[dateOnly.month - 1].substring(0, 3);
      return `${tgl} ${bln} ${dateOnly.year}`;
    }
  }

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const tgl = String(date.getDate()).padStart(2, "0");
  const bln = BULAN_INDO[date.getMonth()].substring(0, 3);
  const thn = date.getFullYear();

  return `${tgl} ${bln} ${thn}`;
}

/**
 * Tanggal hari ini menurut zona waktu sekolah (bukan zona server).
 * Dipakai sebagai kunci `dateString` presensi & filter "hari ini".
 */
export function getTodayDateString(date?: Date): string {
  return getSchoolTimeParts(date ?? new Date()).dateString;
}

/**
 * Jam sekarang menurut zona waktu sekolah (bukan zona server).
 * Dipakai sebagai `timeString` presensi & perhitungan keterlambatan.
 */
export function getCurrentTimeString(date?: Date): string {
  return getSchoolTimeParts(date ?? new Date()).timeString;
}

export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export interface ActivityWithState {
  id: string;
  name: string;
  daysOfWeek: string;
  specificDate: string | null;
  startTime: string;
  endTime: string;
  lateCutoffTime: string;
  gracePeriodMinutes: number;
  targetRoles: string;
  targetClasses: string;
  institutionId: string | null;
  isActive: boolean;
  state: "UPCOMING" | "ACTIVE" | "COMPLETED";
  stateLabel: string;
  isToday: boolean;
}

export function evaluateActivityState(
  activity: {
    id: string;
    name: string;
    daysOfWeek: string;
    specificDate: string | null;
    startTime: string;
    endTime: string;
    lateCutoffTime: string;
    gracePeriodMinutes: number;
    targetRoles: string;
    targetClasses: string;
    institutionId: string | null;
    isActive: boolean;
  },
  now: Date = new Date()
): ActivityWithState {
  // Komponen waktu sekolah (zona waktu sekolah, bukan zona server)
  const schoolNow = getSchoolTimeParts(now);
  const todayDateStr = schoolNow.dateString;
  const currentDayOfWeek = String(schoolNow.dayOfWeek); // 0 = Ahad, 1 = Senin, ...
  const currentMinutes = schoolNow.minutes;

  // Cek apakah kegiatan berlaku hari ini
  let isToday = false;
  if (activity.specificDate) {
    isToday = activity.specificDate === todayDateStr;
  } else if (activity.daysOfWeek === "ALL") {
    isToday = true;
  } else {
    const validDays = activity.daysOfWeek.split(",").map((d) => d.trim());
    isToday = validDays.includes(currentDayOfWeek);
  }

  const startMinutes = timeToMinutes(activity.startTime);
  const endMinutes = timeToMinutes(activity.endTime);
  // Sesi presensi tetap dianggap berbuka minimal sampai batas hadir +
  // toleransi keterlambatan, agar pengaturan "Toleransi Terlambat" di
  // Manajemen Jadwal benar-benar berlaku di layar presensi.
  const cutoffMinutes = timeToMinutes(activity.lateCutoffTime);
  const sessionEndMinutes = Math.max(
    endMinutes,
    cutoffMinutes + (activity.gracePeriodMinutes || 0)
  );

  let state: "UPCOMING" | "ACTIVE" | "COMPLETED" = "UPCOMING";
  let stateLabel = "Akan Datang";

  if (!isToday || !activity.isActive) {
    state = "COMPLETED";
    stateLabel = "Tidak Aktif Hari Ini";
  } else if (currentMinutes < startMinutes) {
    state = "UPCOMING";
    stateLabel = "Akan Datang";
  } else if (currentMinutes >= startMinutes && currentMinutes <= sessionEndMinutes) {
    state = "ACTIVE";
    stateLabel = "Sedang Berlangsung";
  } else {
    state = "COMPLETED";
    stateLabel = "Sudah Selesai";
  }

  return {
    ...activity,
    state,
    stateLabel,
    isToday,
  };
}

/**
 * Menentukan apakah sebuah kegiatan presensi ditujukan untuk seseorang,
 * berdasarkan pengaturan di Manajemen Jadwal & Jam Presensi:
 * - Lembaga (institutionId): kegiatan lembaga hanya untuk orang lembaga itu,
 *   kegiatan global (null) berlaku untuk semua orang.
 * - Target Peserta (targetRoles): "ALL" atau daftar peran dipisah koma.
 * - Target Kelas (targetClasses): hanya berlaku untuk peran SISWA.
 * Dipakai bersama oleh endpoint presensi kiosk agar aturan yang dibuat
 * admin benar-benar diterapkan saat seseorang menempelkan kartu.
 */
export function activityAppliesToPerson(
  activity: {
    targetRoles: string;
    targetClasses: string;
    institutionId: string | null;
  },
  person: {
    role: string;
    className: string | null;
    institutionId: string | null;
  }
): boolean {
  // Lembaga penyelenggara
  if (activity.institutionId && activity.institutionId !== person.institutionId) {
    return false;
  }

  // Target peserta (peran)
  if (activity.targetRoles && activity.targetRoles !== "ALL") {
    const roles = activity.targetRoles.split(",").map((r) => r.trim());
    if (!roles.includes(person.role)) {
      return false;
    }
  }

  // Target kelas (khusus siswa)
  if (
    activity.targetClasses &&
    activity.targetClasses !== "ALL" &&
    person.role === "SISWA"
  ) {
    const classes = activity.targetClasses.split(",").map((c) => c.trim());
    if (!person.className || !classes.includes(person.className)) {
      return false;
    }
  }

  return true;
}

export function calculatePresenceStatus(
  activity: {
    startTime: string;
    endTime: string;
    lateCutoffTime: string;
    gracePeriodMinutes: number;
  },
  checkInTimeStr: string
): "HADIR" | "TERLAMBAT" {
  const checkInMinutes = timeToMinutes(checkInTimeStr);
  const cutoffMinutes = timeToMinutes(activity.lateCutoffTime);
  const allowedLatestMinutes = cutoffMinutes + (activity.gracePeriodMinutes || 0);

  if (checkInMinutes <= allowedLatestMinutes) {
    return "HADIR";
  } else {
    return "TERLAMBAT";
  }
}
