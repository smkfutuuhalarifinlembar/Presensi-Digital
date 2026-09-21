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

export function formatDateIndo(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const hari = HARI_INDO[date.getDay()];
  const tgl = date.getDate();
  const bln = BULAN_INDO[date.getMonth()];
  const thn = date.getFullYear();

  return `${hari}, ${tgl} ${bln} ${thn}`;
}

export function formatShortDateIndo(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const tgl = String(date.getDate()).padStart(2, "0");
  const bln = BULAN_INDO[date.getMonth()].substring(0, 3);
  const thn = date.getFullYear();

  return `${tgl} ${bln} ${thn}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
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
  const todayDateStr = getTodayDateString();
  const currentDayOfWeek = String(now.getDay()); // 0 = Sunday, 1 = Monday, ...
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

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

  let state: "UPCOMING" | "ACTIVE" | "COMPLETED" = "UPCOMING";
  let stateLabel = "Akan Datang";

  if (!isToday || !activity.isActive) {
    state = "COMPLETED";
    stateLabel = "Tidak Aktif Hari Ini";
  } else if (currentMinutes < startMinutes) {
    state = "UPCOMING";
    stateLabel = "Akan Datang";
  } else if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
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
