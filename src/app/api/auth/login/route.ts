import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi." },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Username atau password salah." },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, admin.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Username atau password salah." },
        { status: 401 }
      );
    }

    const sessionData = {
      adminId: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role as "SUPER_ADMIN" | "ADMIN_OPERATOR",
    };

    await setSessionCookie(sessionData);

    // Catat log
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.name,
        action: "LOGIN",
        target: "AUTH",
        details: `Login berhasil sebagai ${admin.role}`,
      },
    });

    return NextResponse.json({
      success: true,
      user: sessionData,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
