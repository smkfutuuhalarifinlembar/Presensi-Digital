import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";


export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang boleh mengubah jadwal." }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      daysOfWeek,
      specificDate,
      startTime,
      endTime,
      lateCutoffTime,
      gracePeriodMinutes,
      targetRoles,
      targetClasses,
      institutionId,
      isActive,
    } = body;

    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(daysOfWeek !== undefined ? { daysOfWeek } : {}),
        specificDate: specificDate !== undefined ? (specificDate ? specificDate.trim() : null) : undefined,
        ...(startTime ? { startTime: startTime.trim() } : {}),
        ...(endTime ? { endTime: endTime.trim() } : {}),
        ...(lateCutoffTime ? { lateCutoffTime: lateCutoffTime.trim() } : {}),
        ...(gracePeriodMinutes !== undefined ? { gracePeriodMinutes: parseInt(gracePeriodMinutes) || 0 } : {}),
        ...(targetRoles !== undefined ? { targetRoles } : {}),
        ...(targetClasses !== undefined ? { targetClasses } : {}),
        institutionId: institutionId !== undefined ? (institutionId || null) : undefined,
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "UPDATE_ACTIVITY",
        target: `Kegiatan: ${updatedActivity.name}`,
        details: `Update jadwal/toleransi keterlambatan`,
      },
    });

    return NextResponse.json({ success: true, activity: updatedActivity });
  } catch (err: any) {
    console.error("Error updating activity:", err);
    return NextResponse.json(
      { error: err.message || "Terjadi kesalahan sistem saat menyimpan." },
      { status: 500 }
    );
  }
}


export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang boleh menghapus jadwal." }, { status: 403 });
    }

    const activity = await prisma.activity.findUnique({
      where: { id },
    });

    if (!activity) {
      return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
    }

    await prisma.activity.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "DELETE_ACTIVITY",
        target: `Kegiatan: ${activity.name}`,
        details: `Menghapus jadwal kegiatan`,
      },
    });

    return NextResponse.json({ success: true, message: "Kegiatan berhasil dihapus." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menghapus kegiatan." },
      { status: 500 }
    );
  }
}
