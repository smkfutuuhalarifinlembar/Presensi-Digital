import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTimeString } from "@/lib/date-utils";
import { getLeaveSetting, notifyResultOnReview, reasonLabel } from "@/lib/leave-notify";

function mapReasonToAttendance(reasonType: string): string {
  if (reasonType === "SAKIT") return "SAKIT";
  if (reasonType === "DINAS") return "DINAS_LUAR";
  return "IZIN";
}

// Mencatat / memperbarui AttendanceRecord agar muncul di Rekap & Laporan.
// Disetujui -> SAKIT/IZIN/DINAS_LUAR sesuai keterangan; Ditolak -> ALPA.
export async function writeLeaveAttendance(
  leave: { personId: string; dateString: string; reasonType: string; customReason?: string | null },
  decision: "APPROVED" | "REJECTED",
  byAdminId: string | null,
  byAdminName: string,
  note?: string | null
) {
  const act = await prisma.activity.findFirst({
    where: { isActive: true }, orderBy: { startTime: "asc" },
  });
  if (!act) return null;
  const status = decision === "APPROVED" ? mapReasonToAttendance(leave.reasonType) : "ALPA";
  const ket = decision === "APPROVED"
    ? `${reasonLabel(leave.reasonType, leave.customReason)} — Disetujui ${byAdminName}${note ? ": " + note : ""}`
    : `Izin DITOLAK ${byAdminName} — tercatat Alpa${note ? ": " + note : ""}`;
  return prisma.attendanceRecord.upsert({
    where: {
      personId_activityId_dateString: {
        personId: leave.personId, activityId: act.id, dateString: leave.dateString,
      },
    },
    update: { status, remarks: ket, method: "IZIN_ONLINE", recordedByAdminId: byAdminId },
    create: {
      personId: leave.personId, activityId: act.id, dateString: leave.dateString,
      timeString: getCurrentTimeString(), status, method: "IZIN_ONLINE",
      remarks: ket, recordedByAdminId: byAdminId,
    },
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await ctx.params;
    const body = await req.json();
    const { decision, note } = body;
    if (!["APPROVED", "REJECTED"].includes(decision)) {
      return NextResponse.json({ error: "Keputusan harus APPROVED / REJECTED." }, { status: 400 });
    }
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: decision,
        reviewedAt: new Date(),
        reviewedByAdminId: admin.adminId,
        reviewedByAdminName: admin.name,
        reviewNote: note?.trim() || null,
      },
    });

    // Catat ke AttendanceRecord agar OTOMATIS terekap di Rekap & Laporan:
    // disetujui -> SAKIT/IZIN/DINAS_LUAR, ditolak -> ALPA.
    try {
      const setting: any = await getLeaveSetting();
      if (setting.autoCreateAttendance) {
        await writeLeaveAttendance(leave, decision, admin.adminId, admin.name, note);
      }
    } catch (e) { console.error("Gagal catat presensi otomatis:", e); }

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId, adminName: admin.name,
        action: decision === "APPROVED" ? "APPROVE_LEAVE" : "REJECT_LEAVE",
        target: `${leave.personName} (${leave.nisNip})`,
        details: `Izin tgl ${leave.dateString} ${decision}. Catatan: ${note || "-"}`,
      },
    });

    // WA hasil (disetujui/ditolak) WAJIB terkirim ke wali kelas + ortu/siswa:
    // dikirim AWAIT supaya status tercatat sebelum respons kembali; error tidak menggagalkan review.
    let waResult: any = null;
    try {
      waResult = await notifyResultOnReview(id);
    } catch (e: any) {
      console.error("WA hasil gagal:", e);
      waResult = { success: false, message: e?.message || "error" };
    }
    const fresh = await prisma.leaveRequest.findUnique({ where: { id } });
    return NextResponse.json({
      success: true, leave: fresh || updated,
      waResult: { success: waResult?.success || false, message: waResult?.message || "", status: fresh?.waResultStatus || "" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal memproses." }, { status: 500 });
  }
}
