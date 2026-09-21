import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { exportAttendanceToExcelBuffer } from "@/lib/export-excel";
import { getTodayDateString } from "@/lib/date-utils";

export async function GET(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const today = getTodayDateString();
    const startDate = searchParams.get("startDate") || today;
    const endDate = searchParams.get("endDate") || today;
    const activityId = searchParams.get("activityId");
    const role = searchParams.get("role");
    const className = searchParams.get("className");
    const status = searchParams.get("status");

    const where: any = {
      dateString: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (activityId && activityId !== "ALL") where.activityId = activityId;
    if (status && status !== "ALL") where.status = status;
    if (role && role !== "ALL") where.person = { ...where.person, role };
    if (className && className !== "ALL") where.person = { ...where.person, className };

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        person: true,
        activity: true,
        recordedByAdmin: {
          select: { name: true },
        },
      },
      orderBy: [{ dateString: "asc" }, { timeString: "asc" }],
    });

    const buffer = exportAttendanceToExcelBuffer(
      records,
      `Rekap Presensi ${startDate} s.d ${endDate}`
    );

    const filename = `Rekap_Presensi_${startDate}_sd_${endDate}.xlsx`;

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
      { error: err?.message || "Gagal mengexport laporan." },
      { status: 500 }
    );
  }
}
