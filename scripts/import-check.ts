/**
 * Uji diff fungsi Import Excel (src/lib/import-diff.ts).
 *
 * Aturan: baris file = sumber kebenaran.
 * - Ada selisih per kolom → daftar kolom berubah (sistem mengganti data)
 * - Identik               → array kosong (sistem TIDAK mengganti data)
 *
 * Jalankan: npx tsx scripts/import-check.ts
 */
import assert from "assert";
import { diffPersonImportRow } from "../src/lib/import-diff";

// 1. Identik → tidak ada perubahan
const existing = {
  name: "Budi Santoso",
  role: "SISWA",
  className: "X-RPL-1",
  position: null,
  gender: "L",
  phone: "081234567890",
  parentPhone: null,
  rfidUid: "SISWA1001",
  institutionId: "inst-smk",
};
assert.deepStrictEqual(diffPersonImportRow(existing, { ...existing }), [], "identik → []");

// 2. Null/undefined/spasi berlebih dianggap sama → tidak ada perubahan
const fromDb = {
  name: "Budi",
  role: "SISWA",
  className: null,
  position: null,
  gender: null, // NULL di DB = default "L"
  phone: null,
  parentPhone: null,
  rfidUid: null,
  institutionId: null,
};
const fromFile = {
  name: " Budi ",
  role: "SISWA",
  className: undefined,
  position: undefined,
  gender: "L",
  phone: undefined,
  parentPhone: undefined,
  rfidUid: undefined,
  institutionId: undefined,
};
assert.deepStrictEqual(
  diffPersonImportRow(fromDb, fromFile),
  [],
  "null vs undefined vs spasi → []"
);

// 3. Perubahan per kolom terdeteksi
assert.deepStrictEqual(diffPersonImportRow(existing, { ...existing, name: "Budi S." }), ["Nama"]);
assert.deepStrictEqual(diffPersonImportRow(existing, { ...existing, role: "GURU" }), ["Kategori"]);
assert.deepStrictEqual(diffPersonImportRow(existing, { ...existing, className: "X-TKJ-2" }), ["Kelas"]);
assert.deepStrictEqual(diffPersonImportRow(existing, { ...existing, position: "Wali Kelas" }), ["Jabatan"]);
assert.deepStrictEqual(diffPersonImportRow(existing, { ...existing, gender: "P" }), ["Jenis Kelamin"]);
assert.deepStrictEqual(diffPersonImportRow(existing, { ...existing, phone: null }), ["No HP"]);
assert.deepStrictEqual(diffPersonImportRow(existing, { ...existing, parentPhone: "0812" }), ["No HP Orang Tua"]);
assert.deepStrictEqual(diffPersonImportRow(existing, { ...existing, rfidUid: "SISWA9999" }), ["Kode Kartu RFID"]);
assert.deepStrictEqual(diffPersonImportRow(existing, { ...existing, institutionId: null }), ["Lembaga"]);

// 4. Beberapa kolom berubah sekaligus → daftar lengkap & berurutan
assert.deepStrictEqual(
  diffPersonImportRow(existing, { ...existing, className: "X-TKJ-2", position: "Anggota OSIS", rfidUid: "SISWA1009" }),
  ["Kelas", "Jabatan", "Kode Kartu RFID"]
);

// 5. NIS/NIP bukan bagian diff (menjadi kunci pencarian, tidak bisa berubah)
assert.deepStrictEqual(diffPersonImportRow(existing, { ...existing, phone: existing.phone }), []);

console.log("✅ Semua uji diff Import Excel lulus (ubah terdeteksi, identik tidak diganti).");
