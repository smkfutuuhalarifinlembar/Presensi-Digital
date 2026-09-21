import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exportPeopleToExcelBuffer } from "@/lib/export-excel";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const className = searchParams.get("className");

    const where: any = { isActive: true };
    if (role && role !== "ALL") where.role = role;
    if (className && className !== "ALL") where.className = className;

    const people = await prisma.person.findMany({
      where,
      orderBy: [{ role: "asc" }, { className: "asc" }, { name: "asc" }],
    });

    const buffer = exportPeopleToExcelBuffer(people);

    const filename = `Data_Master_Orang_${role || "Semua"}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mengexport data." },
      { status: 500 }
    );
  }
}
