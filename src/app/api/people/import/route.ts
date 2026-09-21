import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePeopleExcelBuffer } from "@/lib/export-excel";
import { getCurrentAdmin } from "@/lib/auth";

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
    let successCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const rowNumber = i + 2; // +2 for 1-indexed and header row

      try {
        // Cek apakah NIS/NIP sudah terdaftar di database
        const existingNis = await prisma.person.findUnique({
          where: { nisNip: row.nisNip },
        });

        if (existingNis) {
          failedRows.push({
            rowNumber,
            data: row,
            reason: `NIS/NIP '${row.nisNip}' sudah ada di database (${existingNis.name})`,
          });
          continue;
        }

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

        const qrToken = `QR-${row.role}-${row.nisNip}`;

        await prisma.person.create({
          data: {
            nisNip: row.nisNip,
            name: row.name,
            role: row.role,
            className: row.className || null,
            position: row.position || null,
            gender: row.gender || "L",
            phone: row.phone || null,
            parentPhone: row.parentPhone || null,
            rfidUid: row.rfidUid || null,
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
        details: `Import massal: ${successCount} berhasil, ${failedRows.length} gagal dari total ${validRows.length + initialErrors.length} baris`,
      },
    });

    return NextResponse.json({
      success: true,
      totalRows: validRows.length + initialErrors.length,
      successCount,
      failCount: failedRows.length,
      failedRows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memproses file import." },
      { status: 500 }
    );
  }
}
