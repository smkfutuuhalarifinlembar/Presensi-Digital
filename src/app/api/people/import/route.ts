import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePeopleExcelBuffer } from "@/lib/export-excel";
import { getCurrentAdmin } from "@/lib/auth";
import { generateUniqueQrToken } from "@/lib/qr-token";
import {
  diffPersonImportRow,
  type PersonImportFields,
} from "@/lib/import-diff";

export async function POST(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang boleh import data." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "File Excel/CSV tidak ditemukan." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel/CSV
    const { validRows, errorRows: initialErrors } = parsePeopleExcelBuffer(buffer);

    const failedRows = [...initialErrors];
    let successCount = 0; // data BARU (NIS/NIP belum ada)
    let updatedCount = 0; // data existing yang ada PERUBAHAN → diganti
    let unchangedCount = 0; // data existing TANPA perubahan → tidak disentuh
    const updatedRows: {
      rowNumber: number;
      nisNip: string;
      name: string;
      changes: string[];
    }[] = [];

    // Peta Lembaga / Unit untuk kolom "Kode Lembaga" pada file import
    const institutionList = await prisma.institution.findMany({
      select: { id: true, code: true, name: true },
    });
    const findInstitution = (raw?: string) => {
      if (!raw) return null;
      const key = raw.trim().toLowerCase();
      return (
        institutionList.find((inst) => inst.code.toLowerCase() === key) ||
        institutionList.find((inst) => inst.name.toLowerCase() === key) ||
        null
      );
    };

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const rowNumber = i + 2; // +2 for 1-indexed and header row

      try {
        // Resolusi Lembaga / Unit (opsional, dari kolom "Kode Lembaga")
        let institutionId: string | null = null;
        if (row.institutionCode) {
          const institution = findInstitution(row.institutionCode);
          if (!institution) {
            failedRows.push({
              rowNumber,
              data: row,
              reason: `Lembaga / Unit '${row.institutionCode}' tidak ditemukan. Periksa kode atau nama pada menu Yayasan & Lembaga.`,
            });
            continue;
          }
          institutionId = institution.id;
        }

        // Data hasil file — file menjadi sumber kebenaran per baris
        // (sel kosong dianggap kosong/null)
        const desired: PersonImportFields = {
          name: row.name,
          role: row.role,
          className: row.className || null,
          position: row.position || null,
          gender: row.gender || "L",
          phone: row.phone || null,
          parentPhone: row.parentPhone || null,
          rfidUid: row.rfidUid || null,
          institutionId,
        };

        // Cek apakah NIS/NIP sudah terdaftar di database
        const existingNis = await prisma.person.findUnique({
          where: { nisNip: row.nisNip },
        });

        if (existingNis) {
          // ===== NIS/NIP sudah ada: bedakan per kolom =====
          // Ada perubahan  -> ganti data dengan versi file
          // Tidak ada      -> biarkan (tidak ada tulisan ke database)
          const changes = diffPersonImportRow(existingNis, desired);

          if (changes.length === 0) {
            unchangedCount++;
            continue;
          }

          // Pastikan UID RFID baru (bila berubah) tidak dipakai orang lain
          if (desired.rfidUid && desired.rfidUid !== existingNis.rfidUid) {
            const existingRfid = await prisma.person.findUnique({
              where: { rfidUid: desired.rfidUid },
            });
            if (existingRfid && existingRfid.id !== existingNis.id) {
              failedRows.push({
                rowNumber,
                data: row,
                reason: `Kode RFID '${desired.rfidUid}' sudah digunakan oleh ${existingRfid.name}`,
              });
              continue;
            }
          }

          // Ganti field hasil file. qrCodeToken TIDAK disentuh agar
          // QR Code pada kartu yang sudah tercetak tetap berlaku.
          await prisma.person.update({
            where: { id: existingNis.id },
            data: desired,
          });

          updatedCount++;
          updatedRows.push({
            rowNumber,
            nisNip: row.nisNip,
            name: desired.name,
            changes,
          });
          continue;
        }

        // ===== NIS/NIP baru: cek RFID lalu buat data =====
        // Cek apakah RFID sudah dipakai
        if (row.rfidUid) {
          const existingRfid = await prisma.person.findUnique({
            where: { rfidUid: row.rfidUid },
          });

          if (existingRfid) {
            failedRows.push({
              rowNumber,
              data: row,
              reason: `Kode RFID '${row.rfidUid}' sudah digunakan oleh ${existingRfid.name}`,
            });
            continue;
          }
        }

        const qrToken = await generateUniqueQrToken(row.role, row.nisNip);

        await prisma.person.create({
          data: {
            nisNip: row.nisNip,
            ...desired,
            qrCodeToken: qrToken,
          },
        });

        successCount++;
      } catch (err: any) {
        failedRows.push({
          rowNumber,
          data: row,
          reason: err?.message || "Gagal menyimpan ke database",
        });
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "IMPORT_PEOPLE",
        target: "DATABASE",
        details: `Import massal: ${successCount} baru, ${updatedCount} diperbarui, ${unchangedCount} tidak berubah, ${failedRows.length} gagal dari total ${validRows.length + initialErrors.length} baris`,
      },
    });

    return NextResponse.json({
      success: true,
      totalRows: validRows.length + initialErrors.length,
      successCount,
      updatedCount,
      unchangedCount,
      failCount: failedRows.length,
      failedRows,
      updatedRows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memproses file import." },
      { status: 500 }
    );
  }
}
