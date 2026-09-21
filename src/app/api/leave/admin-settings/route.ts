import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let s = await prisma.leaveSetting.findUnique({ where: { id: "default" } });
    if (!s) s = await prisma.leaveSetting.create({ data: { id: "default" } });
    return NextResponse.json({ setting: s });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memuat." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin." }, { status: 403 });
    }
    const b = await req.json();
    const updated = await prisma.leaveSetting.upsert({
      where: { id: "default" },
      update: {
        isEnabled: b.isEnabled ?? undefined,
        title: b.title ?? undefined,
        subtitle: b.subtitle ?? undefined,
        requireProof: b.requireProof ?? undefined,
        requireParentPhoto: b.requireParentPhoto ?? undefined,
        requireSignature: b.requireSignature ?? undefined,
        allowedReasonsJson: b.allowedReasonsJson ?? undefined,
        tuWaNumbers: b.tuWaNumbers ?? undefined,
        waliKelasMapJson: b.waliKelasMapJson ?? undefined,
        waliKelasDefaultWa: b.waliKelasDefaultWa ?? undefined,
        notifyParent: b.notifyParent ?? undefined,
        notifyWaliKelas: b.notifyWaliKelas ?? undefined,
        autoCreateAttendance: b.autoCreateAttendance ?? undefined,
        autoApprove: b.autoApprove ?? undefined,
        driveEnabled: b.driveEnabled ?? undefined,
        driveFolderId: b.driveFolderId ?? undefined,
        templatePengajuan: b.templatePengajuan ?? undefined,
        templateSetujuOrtu: b.templateSetujuOrtu ?? b.templateDisetujui ?? undefined,
        templateSetujuWali: b.templateSetujuWali ?? b.templateDisetujui ?? undefined,
        templateTolakOrtu: b.templateTolakOrtu ?? b.templateDitolak ?? undefined,
        templateTolakWali: b.templateTolakWali ?? b.templateDitolak ?? undefined,
      },
      create: { id: "default" },
    });
    await prisma.auditLog.create({
      data: { adminId: admin.adminId, adminName: admin.name, action: "UPDATE_LEAVE_SETTING", target: "FORM_IZIN", details: "Memperbarui pengaturan form izin" },
    });
    return NextResponse.json({ success: true, setting: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal menyimpan." }, { status: 500 });
  }
}
