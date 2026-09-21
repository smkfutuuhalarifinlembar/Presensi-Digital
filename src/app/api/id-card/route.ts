import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import QRCode from "qrcode";

export async function GET(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const personId = searchParams.get("personId");
    const role = searchParams.get("role");
    const className = searchParams.get("className");

    const where: any = { isActive: true };
    if (personId) where.id = personId;
    else {
      if (role && role !== "ALL") where.role = role;
      if (className && className !== "ALL") where.className = className;
    }

    const [school, people] = await Promise.all([
      prisma.schoolSetting.findUnique({ where: { id: "default" } }),
      prisma.person.findMany({
        where,
        orderBy: [{ role: "asc" }, { className: "asc" }, { name: "asc" }],
      }),
    ]);

    // Generate DataURL QR Code untuk tiap kartu
    const peopleWithQr = await Promise.all(
      people.map(async (p) => {
        let qrDataUrl = "";
        try {
          qrDataUrl = await QRCode.toDataURL(p.qrCodeToken, {
            margin: 1,
            width: 250,
            color: {
              dark: "#0f172a",
              light: "#ffffff",
            },
          });
        } catch {}
        return {
          ...p,
          qrDataUrl,
        };
      })
    );

    return NextResponse.json({
      school,
      cards: peopleWithQr,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memuat data cetak ID card." },
      { status: 500 }
    );
  }
}
