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

    const where: any = { isActive: true };

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
    const { dateString, name, type = "NATIONAL", description } = body;

    if (!dateString || !name) {
      return NextResponse.json(
        { error: "Tanggal dan nama libur wajib diisi." },
        { status: 400 }
      );
    }

    // Check if date already exists
    const existing = await prisma.holiday.findUnique({
      where: { dateString },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Tanggal ${dateString} sudah terdaftar sebagai hari libur.` },
        { status: 400 }
      );
    }

    const holiday = await prisma.holiday.create({
      data: {
        dateString,
        name,
        type,
        description: description || null,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "CREATE_HOLIDAY",
        target: `HOLIDAY: ${name}`,
        details: `Menambah hari libur: ${name} (${dateString})`,
      },
    });

    return NextResponse.json({ success: true, holiday });
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