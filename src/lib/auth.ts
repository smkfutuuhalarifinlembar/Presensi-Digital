import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-presensi-2026";
const COOKIE_NAME = "presensi_admin_session";

export interface SessionPayload {
  adminId: string;
  username: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN_OPERATOR";
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentAdmin(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  // Verifikasi ke database apakah admin masih aktif/ada
  const admin = await prisma.admin.findUnique({
    where: { id: payload.adminId },
    select: { id: true, username: true, name: true, role: true },
  });

  if (!admin) return null;

  return {
    adminId: admin.id,
    username: admin.username,
    name: admin.name,
    role: admin.role as "SUPER_ADMIN" | "ADMIN_OPERATOR",
  };
}

export async function requireRole(
  required: "SUPER_ADMIN" | "ADMIN_OPERATOR"
): Promise<{ ok: true; admin: SessionPayload } | { ok: false; error: NextResponse }> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { ok: false, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (admin.role !== "SUPER_ADMIN" && admin.role !== required) {
    return { ok: false, error: NextResponse.json({ error: "Forbidden: tidak punya akses" }, { status: 403 }) };
  }
  return { ok: true, admin };
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
