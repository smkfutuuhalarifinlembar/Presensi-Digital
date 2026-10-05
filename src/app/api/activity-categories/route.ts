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

    const categories = await prisma.activityCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    const counts = await prisma.activity.groupBy({
      by: ["category"],
      _count: { _all: true },
    });
    const countMap = new Map<string, number>();
    for (const c of counts) {
      if (c.category) countMap.set(c.category, c._count._all);
    }

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
        activityCount: countMap.get(c.name) ?? 0,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memuat kategori." },
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
      return NextResponse.json(
        { error: "Hanya Super Admin yang boleh menambah kategori." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const name = String(body?.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "Nama kategori wajib diisi." },
        { status: 400 }
      );
    }

    const exists = await prisma.activityCategory.findUnique({ where: { name } });
    if (exists) {
      return NextResponse.json(
        { error: `Kategori "${name}" sudah ada.` },
        { status: 400 }
      );
    }

    const max = await prisma.activityCategory.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.activityCategory.create({
      data: { name, sortOrder: (max._max.sortOrder ?? 0) + 1 },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "CREATE_ACTIVITY_CATEGORY",
        target: `Kategori: ${category.name}`,
        details: `Menambah kategori kegiatan baru`,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menyimpan kategori." },
      { status: 500 }
    );
  }
}