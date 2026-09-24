/**
 * Deteksi perubahan untuk fungsi "Import Excel" data orang.
 *
 * Baris file dianggap sebagai sumber kebenaran: sistem membandingkan
 * nilai hasil parse file dengan data tersimpan di database per kolom.
 * - Ada selisih   → daftar kolom yang berubah (sistem mengganti data)
 * - Tidak ada     → array kosong (sistem TIDAK menyentuh data sama sekali)
 *
 * Sel kosong/undefined di file dan NULL di database dianggap sama.
 */
export interface PersonImportFields {
  name: string;
  role: string;
  className?: string | null;
  position?: string | null;
  gender?: string | null;
  phone?: string | null;
  parentPhone?: string | null;
  rfidUid?: string | null;
  institutionId?: string | null;
}

/** Normalisasi nilai teks: null/undefined/whitespace → string kosong. */
const norm = (v?: string | null) => (v || "").trim();

/**
 * Bandingkan data baris file (`desired`) dengan data tersimpan (`existing`).
 * Mengembalikan daftar nama kolom yang berubah; kosong = identik.
 */
export function diffPersonImportRow(
  existing: PersonImportFields,
  desired: PersonImportFields
): string[] {
  const changes: string[] = [];

  if (norm(existing.name) !== norm(desired.name)) changes.push("Nama");
  if (norm(existing.role) !== norm(desired.role)) changes.push("Kategori");
  if (norm(existing.className) !== norm(desired.className)) changes.push("Kelas");
  if (norm(existing.position) !== norm(desired.position)) changes.push("Jabatan");
  // Gender NULL di database = default "L" (sesuai skema)
  if (norm(existing.gender || "L") !== norm(desired.gender || "L"))
    changes.push("Jenis Kelamin");
  if (norm(existing.phone) !== norm(desired.phone)) changes.push("No HP");
  if (norm(existing.parentPhone) !== norm(desired.parentPhone))
    changes.push("No HP Orang Tua");
  if (norm(existing.rfidUid) !== norm(desired.rfidUid))
    changes.push("Kode Kartu RFID");
  if (norm(existing.institutionId) !== norm(desired.institutionId))
    changes.push("Lembaga");

  return changes;
}
