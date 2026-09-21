import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang boleh mengelola pengguna." }, { status: 403 });
    }

    const users = await prisma.admin.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal memuat data pengguna." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang boleh mengelola pengguna." }, { status: 403 });
    }

    const { username, password, name, role } = await req.json();

    if (!username || !password || !name) {
      return NextResponse.json({ error: "Username, password, dan nama wajib diisi." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
    }
    if (!["SUPER_ADMIN", "ADMIN_OPERATOR"].includes(role)) {
      return NextResponse.json({ error: "Role tidak valid." }, { status: 400 });
    }

    const existing = await prisma.admin.findUnique({ where: { username: username.trim().toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Username sudah dipakai." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const newUser = await prisma.admin.create({
      data: {
        username: username.trim().toLowerCase(),
        passwordHash,
        name: name.trim(),
        role,
      },
      select: { id: true, username: true, name: true, role: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "CREATE_ADMIN",
        target: `USER:${newUser.username}`,
        details: `Menambahkan pengguna baru (${newUser.role})`,
      },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal membuat pengguna." }, { status: 500 });
  }
}
