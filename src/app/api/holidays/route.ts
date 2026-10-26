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

    const where: any = { isActive: true };

    if (institutionId) {
      where.institutionId = institutionId;
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

// POST create new holiday
export async function POST(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang boleh menambah data libur." }, { status: 403 });
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

    if (!name) {
      return NextResponse.json(
        { error: "Nama libur wajib diisi." },
        { status: 400 }
      );
    }

    // Build list of dates to create
    const datesToCreate: string[] = [];

    if (startDate && endDate) {
      // Rentang tanggal: buat satu record per tanggal
      const start = new Date(startDate + "T00:00:00");
      const end = new Date(endDate + "T00:00:00");
      if (end < start) {
        return NextResponse.json(
          { error: "Tanggal akhir tidak boleh lebih awal dari tanggal awal." },
          { status: 400 }
        );
      }
      // Gunakan getFullYear/getMonth/getDate supaya tidak kepotong karena timezone UTC (ISO)
      let d = new Date(start);
      while (d <= end) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        datesToCreate.push(`${y}-${m}-${day}`);
        d.setDate(d.getDate() + 1);
      }
    } else if (dateString) {
      datesToCreate.push(dateString);
    } else {
      return NextResponse.json(
        { error: "Tanggal wajib diisi (pilih tanggal atau rentang tanggal)." },
        { status: 400 }
      );
    }

    // Check if any date already exists (globally, across all institutions)
    // This prevents conflict if the same date is already registered for ANY institution
    const existingDates = await prisma.holiday.findMany({
      where: {
        dateString: { in: datesToCreate },
        isActive: true,
        ...(institutionId ? { institutionId } : { institutionId: null }),
      },
      select: { dateString: true },
    });

    if (existingDates.length > 0) {
      const dup = existingDates.map((d) => d.dateString).join(", ");
      const scope = institutionId ? "lembaga terpilih" : "semua lembaga";
      return NextResponse.json(
        {
          error: `Tanggal ${dup} sudah terdaftar sebagai hari libur untuk ${scope}.`,
        },
        { status: 400 }
      );
    }

    // Create holiday records (one per date)
    const holidays = await prisma.$transaction(
      datesToCreate.map((ds) =>
        prisma.holiday.create({
          data: {
            dateString: ds,
            name,
            type,
            description: description || null,
            institutionId: institutionId || null,
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
    const dateList = holidays.map((h) => h.dateString).join(", ");
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "CREATE_HOLIDAY",
        target: `HOLIDAY: ${name}`,
        details: `Menambah hari libur: ${name} (${dateList})${institutionId ? ` untuk lembaga ${institutionId}` : " untuk semua lembaga"}`,
      },
    });

    return NextResponse.json({ success: true, holidays });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menyimpan data libur." },
      { status: 500 }
    );
  }
}

// DELETE holiday
export async function DELETE(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang boleh menghapus data libur." }, { status: 403 });
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