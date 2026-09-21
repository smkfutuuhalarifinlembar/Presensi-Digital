import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let setting = await prisma.leaveSetting.findUnique({ where: { id: "default" } });
    if (!setting) setting = await prisma.leaveSetting.create({ data: { id: "default" } });
    // Jangan bocorkan nomor TU ke publik
    const { tuWaNumbers, waliKelasMapJson, waliKelasDefaultWa, ...publik } = setting as any;
    return NextResponse.json({ setting: publik });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal memuat pengaturan izin." }, { status: 500 });
  }
}
