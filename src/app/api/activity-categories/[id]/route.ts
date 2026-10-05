import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DEFAULT_CATEGORY = "UMUM";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (admin.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Hanya Super Admin yang boleh mengubah kategori." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const name = String(body?.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nama kategori wajib diisi." }, { status: 400 });
    }

    const current = await prisma.activityCategory.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
    }

    if (current.name === name) {
      return NextResponse.json({ success: true, category: current });
    }

    const clash = await prisma.activityCategory.findUnique({ where: { name } });
    if (clash) {
      return NextResponse.json(
        { error: `Kategori "${name}" sudah ada.` },
        { status: 400 }
      );
    }

    const oldName = current.name;

    // Kunci kategori default & rename dalam transaksi agar konsisten
    const [, updated] = await prisma.$transaction([
      prisma.activity.updateMany({
        where: { category: oldName },
        data: { category: name },
      }),
      prisma.activityCategory.update({
        where: { id },
        data: { name },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "UPDATE_ACTIVITY_CATEGORY",
        target: `Kategori: ${oldName}`,
        details: `Ubah nama kategori menjadi "${name}"`,
      },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mengubah kategori." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (admin.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Hanya Super Admin yang boleh menghapus kategori." },
        { status: 403 }
      );
    }

    const current = await prisma.activityCategory.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
    }
    if (current.name === DEFAULT_CATEGORY) {
      return NextResponse.json(
        { error: `Kategori "${DEFAULT_CATEGORY}" tidak dapat dihapus.` },
        { status: 400 }
      );
    }

    // Pastikan kategori default selalu ada sebelum memindahkan kegiatan
    await prisma.activityCategory.upsert({
      where: { name: DEFAULT_CATEGORY },
      update: {},
      create: { name: DEFAULT_CATEGORY, sortOrder: 0 },
    });

    const affected = await prisma.activity.count({ where: { category: current.name } });

    const [, deleted] = await prisma.$transaction([
      prisma.activity.updateMany({
        where: { category: current.name },
        data: { category: DEFAULT_CATEGORY },
      }),
      prisma.activityCategory.delete({ where: { id } }),
    ]);

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "DELETE_ACTIVITY_CATEGORY",
        target: `Kategori: ${current.name}`,
        details: `${affected} kegiatan dipindahkan ke "${DEFAULT_CATEGORY}"`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Kategori dihapus. ${affected} kegiatan dipindahkan ke "${DEFAULT_CATEGORY}".`,
      movedCount: affected,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menghapus kategori." },
      { status: 500 }
    );
  }
}