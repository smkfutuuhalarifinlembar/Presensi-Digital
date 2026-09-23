import * as XLSX from "xlsx";

export interface PersonRowData {
  nisNip: string;
  name: string;
  role: "SISWA" | "GURU" | "PEGAWAI" | "KEPALA_SEKOLAH";
  className?: string;
  position?: string;
  gender?: string;
  phone?: string;
  parentPhone?: string;
  rfidUid?: string;
  institutionCode?: string;
}

export function generatePeopleTemplateBuffer(): Buffer {
  const headers = [
    "NIS/NIP (Wajib)",
    "Nama Lengkap (Wajib)",
    "Kategori (SISWA/GURU/PEGAWAI/KEPALA_SEKOLAH)",
    "Kelas (Khusus Siswa)",
    "Jabatan (Khusus Guru/Pegawai)",
    "Jenis Kelamin (L/P)",
    "No HP Pribadi",
    "No HP Orang Tua / Wali (Khusus Siswa)",
    "Kode Kartu RFID (Opsional)",
    "Kode Lembaga (Opsional, dari menu Yayasan & Lembaga)",
  ];

  const sampleData = [
    [
      "102499",
      "Contoh Siswa Pratama",
      "SISWA",
      "X-RPL-1",
      "",
      "L",
      "082112345678",
      "081234567890",
      "SISWA9999",
      "SMK",
    ],
    [
      "198501012010011009",
      "Contoh Guru Teladan, S.Pd.",
      "GURU",
      "",
      "Guru Bahasa Inggris",
      "P",
      "081398765432",
      "",
      "GURU9999",
      "SMP",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Set column widths
  ws["!cols"] = [
    { wch: 22 },
    { wch: 30 },
    { wch: 22 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 28 },
    { wch: 25 },
    { wch: 34 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Data Orang");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export interface ParseResult {
  validRows: PersonRowData[];
  errorRows: { rowNumber: number; data: any; reason: string }[];
}

export function parsePeopleExcelBuffer(buffer: Buffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (!rows || rows.length <= 1) {
    return {
      validRows: [],
      errorRows: [{ rowNumber: 1, data: null, reason: "File kosong atau tidak memiliki data baris." }],
    };
  }

  const validRows: PersonRowData[] = [];
  const errorRows: { rowNumber: number; data: any; reason: string }[] = [];
  const seenNis = new Set<string>();
  const seenRfid = new Set<string>();

  // Skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every((c: any) => c === undefined || c === null || String(c).trim() === "")) {
      continue; // Lewati baris kosong
    }

    const rowNumber = i + 1;
    const nisNip = String(row[0] || "").trim();
    const name = String(row[1] || "").trim();
    let role = String(row[2] || "").trim().toUpperCase();
    const className = row[3] ? String(row[3]).trim() : undefined;
    const position = row[4] ? String(row[4]).trim() : undefined;
    const gender = row[5] ? String(row[5]).trim().toUpperCase() : "L";
    const phone = row[6] ? String(row[6]).trim() : undefined;
    const parentPhone = row[7] ? String(row[7]).trim() : undefined;
    const rfidUid = row[8] ? String(row[8]).trim() : undefined;
    const institutionCode = row[9] ? String(row[9]).trim() : undefined;

    // Validasi field wajib
    if (!nisNip) {
      errorRows.push({ rowNumber, data: row, reason: "NIS/NIP tidak boleh kosong" });
      continue;
    }

    if (!name) {
      errorRows.push({ rowNumber, data: row, reason: "Nama Lengkap tidak boleh kosong" });
      continue;
    }

    // Normalisasi role
    if (!["SISWA", "GURU", "PEGAWAI", "KEPALA_SEKOLAH"].includes(role)) {
      if (role.includes("MURID") || role.includes("SISWA")) role = "SISWA";
      else if (role.includes("GURU") || role.includes("TEACHER")) role = "GURU";
      else if (role.includes("KEPSEK") || role.includes("KEPALA")) role = "KEPALA_SEKOLAH";
      else if (role.includes("STAF") || role.includes("TU") || role.includes("PEGAWAI")) role = "PEGAWAI";
      else {
        errorRows.push({
          rowNumber,
          data: row,
          reason: `Kategori '${role}' tidak valid. Gunakan SISWA, GURU, PEGAWAI, atau KEPALA_SEKOLAH`,
        });
        continue;
      }
    }

    // Validasi duplikasi dalam file
    if (seenNis.has(nisNip)) {
      errorRows.push({ rowNumber, data: row, reason: `Duplikasi NIS/NIP '${nisNip}' dalam file` });
      continue;
    }
    seenNis.add(nisNip);

    if (rfidUid) {
      if (seenRfid.has(rfidUid)) {
        errorRows.push({ rowNumber, data: row, reason: `Duplikasi Kode RFID '${rfidUid}' dalam file` });
        continue;
      }
      seenRfid.add(rfidUid);
    }

    validRows.push({
      nisNip,
      name,
      role: role as any,
      className,
      position,
      gender: gender === "P" ? "P" : "L",
      phone,
      parentPhone,
      rfidUid,
      institutionCode,
    });
  }

  return { validRows, errorRows };
}

export function exportPeopleToExcelBuffer(people: any[]): Buffer {
  const headers = [
    "No",
    "NIS/NIP",
    "Nama Lengkap",
    "Kategori",
    "Kelas",
    "Jabatan",
    "Jenis Kelamin",
    "No HP Pribadi",
    "No HP Orang Tua",
    "Kode RFID",
    "Lembaga / Unit",
    "Token QR",
    "Status Akun",
  ];

  const dataRows = people.map((p, idx) => [
    idx + 1,
    p.nisNip,
    p.name,
    p.role,
    p.className || "-",
    p.position || "-",
    p.gender || "L",
    p.phone || "-",
    p.parentPhone || "-",
    p.rfidUid || "-",
    p.institution?.name
      ? `${p.institution.name}${p.institution.level ? ` (${p.institution.level})` : ""}`
      : "-",
    p.qrCodeToken || "-",
    p.isActive ? "Aktif" : "Non-Aktif",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  ws["!cols"] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 28 },
    { wch: 16 },
    { wch: 14 },
    { wch: 24 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 26 },
    { wch: 24 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Master Orang");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function exportAttendanceToExcelBuffer(records: any[], title: string = "Rekap Presensi"): Buffer {
  const headers = [
    "No",
    "Tanggal",
    "Waktu",
    "NIS/NIP",
    "Nama",
    "Kategori",
    "Kelas/Jabatan",
    "Kegiatan",
    "Status Kehadiran",
    "Metode Presensi",
    "Dicatat Oleh",
    "Keterangan Tambahan",
  ];

  const dataRows = records.map((r, idx) => [
    idx + 1,
    r.dateString,
    r.timeString,
    r.person?.nisNip || "-",
    r.person?.name || "-",
    r.person?.role || "-",
    r.person?.className || r.person?.position || "-",
    r.activity?.name || "-",
    r.status,
    r.method,
    r.recordedByAdmin ? `${r.recordedByAdmin.name} (Admin)` : "Mandiri",
    r.remarks || "-",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  ws["!cols"] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 28 },
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 28 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Laporan Presensi");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
