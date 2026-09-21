import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hashPassword } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = await getCurrentAdmin();
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang boleh mengelola pengguna." }, { status: 403 });
    }

    const { name, role, password } = await req.json();

    const target = await prisma.admin.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (role && ["SUPER_ADMIN", "ADMIN_OPERATOR"].includes(role)) updateData.role = role;
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
      }
      updateData.passwordHash = await hashPassword(password);
    }

    const updated = await prisma.admin.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, name: true, role: true, updatedAt: true },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "UPDATE_ADMIN",
        target: `USER:${updated.username}`,
        details: `Memperbarui data pengguna${password ? " (reset password)" : ""}`,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal memperbarui pengguna." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = await getCurrentAdmin();
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang boleh mengelola pengguna." }, { status: 403 });
    }

    if (id === admin.adminId) {
      return NextResponse.json({ error: "Tidak dapat menghapus akun Anda sendiri yang sedang login." }, { status: 400 });
    }

    const target = await prisma.admin.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    await prisma.admin.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "DELETE_ADMIN",
        target: `USER:${target.username}`,
        details: `Menghapus pengguna ${target.username}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal menghapus pengguna." }, { status: 500 });
  }
}
