import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const institutions = await prisma.institution.findMany({
      orderBy: [{ level: "asc" }, { name: "asc" }],
      include: { _count: { select: { people: true, activities: true } } },
    });

    return NextResponse.json({ institutions });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memuat data lembaga." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang boleh menambah lembaga." }, { status: 403 });
    }

    const body = await req.json();
    const { code, name, level = "SD", address, isActive = true } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: "Kode dan Nama Lembaga wajib diisi." },
        { status: 400 }
      );
    }

    const existing = await prisma.institution.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Kode ${code} sudah digunakan.` },
        { status: 400 }
      );
    }

    const institution = await prisma.institution.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        level,
        address: address ? address.trim() : null,
        isActive: Boolean(isActive),
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "CREATE_INSTITUTION",
        target: `Lembaga: ${institution.name}`,
        details: `Menambahkan lembaga ${institution.level} (${institution.code})`,
      },
    });

    return NextResponse.json({ success: true, institution });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal membuat lembaga." },
      { status: 500 }
    );
  }
}