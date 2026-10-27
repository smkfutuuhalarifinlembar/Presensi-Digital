import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

// GET all holidays
export async function GET(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const institutionId = searchParams.get("institutionId");
    const exactScope = searchParams.get("exactScope") === "true";
    const type = searchParams.get("type");

    const where: any = { isActive: true };

    if (institutionId) {
      if (institutionId === "global") {
        where.institutionId = null;
      } else if (institutionId !== "all") {
        if (exactScope) {
          where.institutionId = institutionId;
        } else {
          where.OR = [
            { institutionId },
            { institutionId: null },
          ];
        }
      }
    }

    if (type && type !== "all") {
      where.type = type;
    }

    if (year && month) {
      const monthPadded = month.padStart(2, "0");
      where.dateString = {
        startsWith: `${year}-${monthPadded}`,
      };
    } else if (year) {
      where.dateString = {
        startsWith: `${year}`,
      };
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { dateString: "asc" },
      include: {
        institution: {
          select: { id: true, name: true, code: true, level: true },
        },
      },
    });

    return NextResponse.json({ holidays });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memuat data libur." },
      { status: 500 }
    );
  }
}

// POST create new holiday(s)
export async function POST(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || (admin.role !== "SUPER_ADMIN" && admin.role !== "ADMIN_OPERATOR")) {
      return NextResponse.json(
        { error: "Anda tidak memiliki hak akses untuk menambah data libur." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      dateString,
      name,
      type = "NATIONAL",
      description,
      institutionId,
      startDate,
      endDate,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama libur wajib diisi." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const targetInstitutionId =
      institutionId === "all" || !institutionId ? null : institutionId;

    // Build list of dates to create
    const datesToCreate: string[] = [];

    if (startDate && endDate && endDate.trim() !== "") {
      const start = new Date(startDate + "T00:00:00");
      const end = new Date(endDate + "T00:00:00");
      if (end < start) {
        return NextResponse.json(
          { error: "Tanggal akhir tidak boleh lebih awal dari tanggal awal." },
          { status: 400 }
        );
      }
      let d = new Date(start);
      while (d <= end) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        datesToCreate.push(`${y}-${m}-${day}`);
        d.setDate(d.getDate() + 1);
      }
    } else if (startDate) {
      datesToCreate.push(startDate);
    } else if (dateString) {
      datesToCreate.push(dateString);
    } else {
      return NextResponse.json(
        { error: "Tanggal wajib diisi (pilih tanggal atau rentang tanggal)." },
        { status: 400 }
      );
    }

    // Check existing active holidays for these dates
    const existingHolidays = await prisma.holiday.findMany({
      where: {
        dateString: { in: datesToCreate },
        isActive: true,
        ...(targetInstitutionId
          ? {
              OR: [{ institutionId: targetInstitutionId }, { institutionId: null }],
            }
          : {
              institutionId: null,
            }),
      },
      select: { dateString: true, name: true },
    });

    const existingDateSet = new Set(existingHolidays.map((h) => h.dateString));

    // For single date creation: return error if already exists
    if (datesToCreate.length === 1 && existingHolidays.length > 0) {
      const existing = existingHolidays[0];
      const scopeName = targetInstitutionId ? "lembaga terpilih" : "semua lembaga";
      return NextResponse.json(
        {
          error: `Tanggal ${existing.dateString} sudah terdaftar sebagai libur "${existing.name}" untuk ${scopeName}.`,
        },
        { status: 400 }
      );
    }

    // For range: filter out dates that already exist
    const finalDatesToCreate = datesToCreate.filter(
      (ds) => !existingDateSet.has(ds)
    );

    if (finalDatesToCreate.length === 0) {
      return NextResponse.json(
        {
          error: "Semua tanggal dalam rentang yang dipilih sudah terdaftar sebagai hari libur.",
        },
        { status: 400 }
      );
    }

    // Create holiday records
    const createdHolidays = await prisma.$transaction(
      finalDatesToCreate.map((ds) =>
        prisma.holiday.create({
          data: {
            dateString: ds,
            name: cleanName,
            type,
            description: description?.trim() || null,
            institutionId: targetInstitutionId,
          },
          include: {
            institution: {
              select: { id: true, name: true, code: true, level: true },
            },
          },
        })
      )
    );

    // Audit log
    const dateList = createdHolidays.map((h) => h.dateString).join(", ");
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "CREATE_HOLIDAY",
        target: `HOLIDAY: ${cleanName}`,
        details: `Menambah ${createdHolidays.length} hari libur: ${cleanName} (${dateList})${
          targetInstitutionId ? ` untuk lembaga ${targetInstitutionId}` : " untuk semua lembaga"
        }`,
      },
    });

    const skippedCount = datesToCreate.length - finalDatesToCreate.length;
    let message = `${createdHolidays.length} hari libur berhasil ditambahkan.`;
    if (skippedCount > 0) {
      message += ` (${skippedCount} tanggal dilewati karena sudah terdaftar)`;
    }

    return NextResponse.json({
      success: true,
      message,
      holidays: createdHolidays,
      skippedCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menyimpan data libur." },
      { status: 500 }
    );
  }
}

// PUT update existing holiday
export async function PUT(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || (admin.role !== "SUPER_ADMIN" && admin.role !== "ADMIN_OPERATOR")) {
      return NextResponse.json(
        { error: "Anda tidak memiliki hak akses untuk mengubah data libur." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, name, type, description, institutionId, dateString } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID libur tidak ditemukan." },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama libur wajib diisi." },
        { status: 400 }
      );
    }

    const existing = await prisma.holiday.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Data libur tidak ditemukan." },
        { status: 404 }
      );
    }

    const targetDate = dateString || existing.dateString;
    const targetInstitutionId =
      institutionId === "all" || !institutionId ? null : institutionId;

    // Check if target date + institutionId conflicts with ANOTHER active holiday
    const conflict = await prisma.holiday.findFirst({
      where: {
        id: { not: id },
        dateString: targetDate,
        isActive: true,
        ...(targetInstitutionId
          ? {
              institutionId: targetInstitutionId,
            }
          : {
              institutionId: null,
            }),
      },
    });

    if (conflict) {
      return NextResponse.json(
        {
          error: `Tanggal ${targetDate} sudah terdaftar untuk libur "${conflict.name}".`,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.holiday.update({
      where: { id },
      data: {
        name: name.trim(),
        type: type || existing.type,
        description: description !== undefined ? (description?.trim() || null) : existing.description,
        institutionId: targetInstitutionId,
        dateString: targetDate,
      },
      include: {
        institution: {
          select: { id: true, name: true, code: true, level: true },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "UPDATE_HOLIDAY",
        target: `HOLIDAY: ${updated.name}`,
        details: `Mengubah hari libur: ${updated.name} (${updated.dateString})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Hari libur berhasil diperbarui.",
      holiday: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memperbarui data libur." },
      { status: 500 }
    );
  }
}

// DELETE holiday
export async function DELETE(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || (admin.role !== "SUPER_ADMIN" && admin.role !== "ADMIN_OPERATOR")) {
      return NextResponse.json(
        { error: "Anda tidak memiliki hak akses untuk menghapus data libur." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID libur tidak ditemukan." }, { status: 400 });
    }

    const holiday = await prisma.holiday.findUnique({
      where: { id },
    });

    if (!holiday) {
      return NextResponse.json({ error: "Data libur tidak ditemukan." }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    await prisma.holiday.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "DELETE_HOLIDAY",
        target: `HOLIDAY: ${holiday.name}`,
        details: `Menghapus hari libur: ${holiday.name} (${holiday.dateString})`,
      },
    });

    return NextResponse.json({ success: true, message: "Hari libur berhasil dihapus." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menghapus data libur." },
      { status: 500 }
    );
  }
}