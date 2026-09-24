/**
 * Uji sinkronisasi "Manajemen Jadwal & Jam Presensi" ↔ "Jadwal Hari Ini".
 *
 * Semua kasus uji memakai INSTAN UTC eksplisit sehingga hasil uji sama
 * terlepas dari zona waktu mesin. Zona sekolah default: Asia/Makassar (WITA).
 * Jalankan: npx tsx scripts/sync-check.ts
 */
import assert from "assert";
import {
  evaluateActivityState,
  activityAppliesToPerson,
  getTodayDateString,
  getCurrentTimeString,
  formatDateIndo,
  formatShortDateIndo,
} from "../src/lib/date-utils";

// Jadwal dari panel admin: "Presensi Masuk Siswa"
// Hari Senin-Sabtu, Mulai 06:30, Batas Hadir 07:40, Selesai 08:30, Toleransi 1 menit
const contoh = {
  id: "act1",
  name: "Presensi Masuk Siswa",
  daysOfWeek: "1,2,3,4,5,6",
  specificDate: null as string | null,
  startTime: "06:30",
  endTime: "08:30",
  lateCutoffTime: "07:40",
  gracePeriodMinutes: 1,
  targetRoles: "SISWA",
  targetClasses: "ALL",
  institutionId: null as string | null,
  isActive: true,
};

// ============================================================
// A. Zona waktu sekolah (WITA) — reproduksi bug lapangan
// ============================================================
// 2026-09-23T23:53:00Z = Kamis 2026-09-24 07:53 WITA.
// Di server UTC "hari ini" masih Rabu 23:53 (menit 1437) → bug lama
// menampilkan "Sudah Selesai" walau jam sekolah 07:53 pagi.
const pagiWita = new Date("2026-09-23T23:53:00Z");

assert.strictEqual(getTodayDateString(pagiWita), "2026-09-24", "tanggal hari ini harus menurut WITA");
assert.ok(getCurrentTimeString(pagiWita).startsWith("07:53"), "jam sekarang harus 07:53 WITA");

let r = evaluateActivityState(contoh, pagiWita);
assert.strictEqual(r.isToday, true, "Kamis termasuk hari Sen-Sab");
assert.strictEqual(r.state, "ACTIVE", "07:53 WITA harus Sedang Berlangsung");
assert.strictEqual(r.stateLabel, "Sedang Berlangsung");

// 08:31 WITA = 00:31Z hari berikutnya → lewat jam selesai
r = evaluateActivityState(contoh, new Date("2026-09-24T00:31:00Z"));
assert.strictEqual(r.state, "COMPLETED", "08:31 WITA harus Sudah Selesai");

// 06:00 WITA = 22:00Z sebelumnya → sebelum mulai
r = evaluateActivityState(contoh, new Date("2026-09-23T22:00:00Z"));
assert.strictEqual(r.state, "UPCOMING", "06:00 WITA harus Akan Datang");

// ============================================================
// B. Hari berlaku mengikuti tanggal WITA (lintas tengah malam UTC)
// 2026-09-24 = Kamis, 2026-09-25 = Jumat, 2026-09-27 = Ahad
// ============================================================
const jumatDiniWita = new Date("2026-09-24T16:30:00Z"); // Jumat 00:30 WITA
assert.strictEqual(getTodayDateString(jumatDiniWita), "2026-09-25");
r = evaluateActivityState({ ...contoh, daysOfWeek: "1,2,3,4,5" }, jumatDiniWita);
assert.strictEqual(r.isToday, true, "Jumat termasuk hari kerja 1-5");

const ahadPagiWita = new Date("2026-09-26T23:00:00Z"); // Ahad 07:00 WITA
assert.strictEqual(getTodayDateString(ahadPagiWita), "2026-09-27");
r = evaluateActivityState({ ...contoh, daysOfWeek: "1,2,3,4,5" }, ahadPagiWita);
assert.strictEqual(r.isToday, false, "Ahad tidak termasuk hari kerja 1-5");

// ============================================================
// C. Toleransi keterlambatan & specificDate
// ============================================================
const singkat = { ...contoh, endTime: "07:00", lateCutoffTime: "07:00", gracePeriodMinutes: 15 };
r = evaluateActivityState(singkat, new Date("2026-09-23T23:05:00Z")); // 07:05 WITA
assert.strictEqual(r.state, "ACTIVE", "07:05 masih dalam toleransi (07:00 + 15 mnt)");
r = evaluateActivityState(singkat, new Date("2026-09-23T23:16:00Z")); // 07:16 WITA
assert.strictEqual(r.state, "COMPLETED", "07:16 lewat toleransi");

r = evaluateActivityState({ ...contoh, specificDate: "2026-09-24" }, pagiWita);
assert.strictEqual(r.isToday, true, "specificDate cocok dengan tanggal WITA");
r = evaluateActivityState({ ...contoh, specificDate: "2026-09-25" }, pagiWita);
assert.strictEqual(r.isToday, false, "specificDate beda tanggal");

// ============================================================
// D. Format tanggal bebas geser zona
// ============================================================
assert.strictEqual(formatDateIndo("2026-09-24"), "Kamis, 24 September 2026");
assert.strictEqual(formatShortDateIndo("2026-09-24"), "24 Sep 2026");

// ============================================================
// E. Target peserta (lembaga / peran / kelas) — aturan panel admin
// ============================================================
const orangGlobal = { role: "SISWA", className: "7A", institutionId: null };
const siswaLembaga = { role: "SISWA", className: "7A", institutionId: "inst-SMK" };
const guru = { role: "GURU", className: null, institutionId: null };
const siswa7B = { role: "SISWA", className: "7B", institutionId: null };
const semuaOrang = { ...contoh, targetRoles: "ALL" };

assert.strictEqual(activityAppliesToPerson(contoh, orangGlobal), true);
assert.strictEqual(
  activityAppliesToPerson({ ...contoh, institutionId: "inst-SMK" }, orangGlobal),
  false,
  "Kegiatan lembaga tidak berlaku utk orang tanpa lembaga"
);
assert.strictEqual(activityAppliesToPerson({ ...contoh, institutionId: "inst-SMK" }, siswaLembaga), true);

assert.strictEqual(
  activityAppliesToPerson({ ...contoh, targetRoles: "GURU" }, orangGlobal),
  false,
  "Siswa tidak masuk kegiatan khusus guru"
);
assert.strictEqual(activityAppliesToPerson({ ...contoh, targetRoles: "GURU" }, guru), true);
assert.strictEqual(activityAppliesToPerson({ ...contoh, targetRoles: "SISWA,GURU" }, guru), true);

assert.strictEqual(
  activityAppliesToPerson({ ...semuaOrang, targetClasses: "7B" }, orangGlobal),
  false,
  "Siswa 7A tidak masuk kegiatan kelas 7B"
);
assert.strictEqual(
  activityAppliesToPerson({ ...semuaOrang, targetClasses: "7B" }, guru),
  true,
  "Target kelas tidak memengaruhi guru"
);
assert.strictEqual(activityAppliesToPerson({ ...semuaOrang, targetClasses: "7A,7B" }, siswa7B), true);

console.log("✅ Semua uji sinkronisasi jadwal lulus (zona sekolah, sesi, hari, target).");
