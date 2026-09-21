import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { evaluateActivityState } from "@/lib/date-utils";

export async function GET() {
  try {
    const now = new Date();
    const activities = await prisma.activity.findMany({
      orderBy: [{ isActive: "desc" }, { startTime: "asc" }],
    });

    const withState = activities.map((act) => evaluateActivityState(act, now));

    const institutions = await prisma.institution.findMany({
      orderBy: [{ level: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ activities: withState, institutions });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memuat kegiatan." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang boleh menambah jadwal." }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      daysOfWeek = "ALL",
      specificDate,
      startTime,
      endTime,
      lateCutoffTime,
      gracePeriodMinutes = 0,
      targetRoles = "ALL",
      targetClasses = "ALL",
      institutionId,
    } = body;

    if (!name || !startTime || !endTime || !lateCutoffTime) {
      return NextResponse.json(
        { error: "Nama Kegiatan, Jam Mulai, Jam Selesai, dan Jam Batas Hadir wajib diisi." },
        { status: 400 }
      );
    }

    const newActivity = await prisma.activity.create({
      data: {
        name: name.trim(),
        daysOfWeek: daysOfWeek || "ALL",
        specificDate: specificDate ? specificDate.trim() : null,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        lateCutoffTime: lateCutoffTime.trim(),
        gracePeriodMinutes: parseInt(gracePeriodMinutes) || 0,
        targetRoles: targetRoles || "ALL",
        targetClasses: targetClasses || "ALL",
        institutionId: institutionId || null,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "CREATE_ACTIVITY",
        target: `Kegiatan: ${newActivity.name}`,
        details: `Jadwal ${newActivity.startTime}-${newActivity.endTime}, Batas ${newActivity.lateCutoffTime}`,
      },
    });

    return NextResponse.json({ success: true, activity: newActivity });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal membuat kegiatan." },
      { status: 500 }
    );
  }
}
