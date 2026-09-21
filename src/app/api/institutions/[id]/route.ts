import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

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
      return NextResponse.json({ error: "Hanya Super Admin yang boleh mengubah lembaga." }, { status: 403 });
    }

    const body = await req.json();
    const { code, name, level, address, isActive } = body;

    const updated = await prisma.institution.update({
      where: { id },
      data: {
        ...(code ? { code: code.trim().toUpperCase() } : {}),
        ...(name ? { name: name.trim() } : {}),
        ...(level ? { level } : {}),
        address: address !== undefined ? (address ? address.trim() : null) : undefined,
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "UPDATE_INSTITUTION",
        target: `Lembaga: ${updated.name}`,
        details: `Memperbarui data lembaga (${updated.code})`,
      },
    });

    return NextResponse.json({ success: true, institution: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memperbarui lembaga." },
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
      return NextResponse.json({ error: "Hanya Super Admin yang boleh menghapus lembaga." }, { status: 403 });
    }

    const institution = await prisma.institution.findUnique({
      where: { id },
    });

    if (!institution) {
      return NextResponse.json({ error: "Lembaga tidak ditemukan." }, { status: 404 });
    }

    await prisma.institution.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "DELETE_INSTITUTION",
        target: `Lembaga: ${institution.name}`,
        details: `Menghapus lembaga (${institution.code})`,
      },
    });

    return NextResponse.json({ success: true, message: "Lembaga berhasil dihapus." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menghapus lembaga." },
      { status: 500 }
    );
  }
}