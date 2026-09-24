import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Pencarian nama publik untuk form izin (tanpa login).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q || q.length < 2) return NextResponse.json({ people: [] });

    const people = await prisma.person.findMany({
      where: {
        isActive: true,
        OR: [{ name: { contains: q, mode: "insensitive" } }, { nisNip: { contains: q, mode: "insensitive" } }],
      },
      take: 15,
      select: {
        id: true,
        name: true,
        nisNip: true,
        role: true,
        className: true,
        position: true,
        phone: true,
        parentPhone: true,
      },
    });
    return NextResponse.json({ people });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal mencari data." }, { status: 500 });
  }
}
