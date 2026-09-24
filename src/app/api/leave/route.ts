import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { getLeaveSetting, notifyTuOnNewLeave, notifyResultOnReview } from "@/lib/leave-notify";
import { uploadBufferToDrive, dataUrlToBuffer } from "@/lib/drive-uploader";
import { getTodayDateString } from "@/lib/date-utils";
import { writeLeaveAttendance } from "@/app/api/leave/[id]/review/route";
import { processImageIfNeeded } from "@/lib/image-processor";

export async function GET(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ALL";
    const q = (searchParams.get("q") || "").trim();
    const date = searchParams.get("date") || "";
    const where: any = {};
    if (status !== "ALL") where.status = status;
    if (date) where.dateString = date;
    if (q) {
      where.OR = [
        { personName: { contains: q, mode: "insensitive" } },
        { nisNip: { contains: q, mode: "insensitive" } },
      ];
    }
    const items = await prisma.leaveRequest.findMany({
      where, orderBy: { submittedAt: "desc" }, take: 200,
    });
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memuat data izin." }, { status: 500 });
  }
}

async function handleImage(input: any, prefix: string, nis: string, folderId?: string | null) {
  if (!input || typeof input !== "string") return { blobUrl: null as any, blobPathname: null as any, driveId: null as any, driveLink: null as any, dataUrl: null as any };
  if (input.startsWith("data:")) {
    const parsed = dataUrlToBuffer(input);
    if (!parsed) return { blobUrl: null, blobPathname: null, driveId: null, driveLink: null, dataUrl: null };
    
    // Kompres gambar sebelum upload
    const { buffer: processedBuffer, mimeType, extension } = await processImageIfNeeded(
      parsed.buffer,
      parsed.mime,
      { maxWidth: 1600, maxHeight: 1600, quality: 85, format: "jpeg" }
    );
    
    const up = await uploadBufferToDrive({
      buffer: processedBuffer, filename: `${prefix}_${nis}.${extension}`,
      mimeType, folderId: folderId || undefined,
    });
    return { blobUrl: up.blobUrl, blobPathname: up.blobPathname, driveId: up.fileId, driveLink: up.webViewLink, dataUrl: prefix === "ttd" ? input : null };
  }
  return { blobUrl: input, blobPathname: null, driveId: null, driveLink: null, dataUrl: null };
}

export async function POST(req: Request) {
  try {
    const setting: any = await getLeaveSetting();
    if (!setting.isEnabled) {
      return NextResponse.json({ error: "Formulir izin sedang dinonaktifkan." }, { status: 403 });
    }
    const body = await req.json();
    const { personId, reasonType, customReason, dateString, proofImage, parentPhoto, signature, message } = body;
    if (!personId) return NextResponse.json({ error: "Nama wajib dipilih." }, { status: 400 });
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person || !person.isActive) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
    if (!reasonType) return NextResponse.json({ error: "Keterangan izin wajib dipilih." }, { status: 400 });
    if (reasonType === "LAINNYA" && !String(customReason || "").trim()) {
      return NextResponse.json({ error: "Keterangan manual wajib diisi." }, { status: 400 });
    }
    if (setting.requireProof && !proofImage) return NextResponse.json({ error: "Bukti surat izin wajib diunggah." }, { status: 400 });
    if (setting.requireParentPhoto && !parentPhoto) return NextResponse.json({ error: "Foto bersama orang tua wajib diunggah." }, { status: 400 });
    if (setting.requireSignature && !signature) return NextResponse.json({ error: "Tanda tangan wajib diisi." }, { status: 400 });

    const targetDate = String(dateString || getTodayDateString()).slice(0, 10);
    const existing = await prisma.leaveRequest.findFirst({
      where: { personId: person.id, dateString: targetDate, status: { in: ["PENDING", "APPROVED"] } },
    });
    if (existing) return NextResponse.json({ error: `Pengajuan tgl ${targetDate} sudah ada (${existing.status}).` }, { status: 400 });

    const p1 = await handleImage(proofImage, "bukti", person.nisNip, setting.driveFolderId);
    const p2 = await handleImage(parentPhoto, "ortu", person.nisNip, setting.driveFolderId);
    const p3 = await handleImage(signature, "ttd", person.nisNip, setting.driveFolderId);

    let waliPhone: string | null = null;
    try {
      const map = JSON.parse(setting.waliKelasMapJson || "{}");
      waliPhone = (person.className && map[person.className]) || setting.waliKelasDefaultWa || null;
    } catch { waliPhone = setting.waliKelasDefaultWa || null; }

    const created = await prisma.leaveRequest.create({
      data: {
        personId: person.id, personName: person.name, nisNip: person.nisNip,
        role: person.role, className: person.className, position: person.position,
        parentPhone: person.parentPhone, personPhone: person.phone, waliKelasPhone: waliPhone,
        reasonType, customReason: customReason?.trim() || null, dateString: targetDate,
        proofImageUrl: p1.blobUrl, proofBlobPathname: p1.blobPathname, proofDriveId: p1.driveId, proofDriveLink: p1.driveLink,
        parentPhotoUrl: p2.blobUrl, parentPhotoBlobPathname: p2.blobPathname, parentPhotoDriveId: p2.driveId, parentPhotoDriveLink: p2.driveLink,
        signatureDataUrl: p3.dataUrl, signatureDriveId: p3.driveId,
        message: message?.trim() || null, status: "PENDING",
      },
    });

    // Mode Persetujuan: jika autoApprove AKTIF -> langsung APPROVED otomatis,
    // catat presensi + kirim WA hasil, lewati antre TU.
    const auto = Boolean((setting as any).autoApprove);
    if (auto) {
      const approved = await prisma.leaveRequest.update({
        where: { id: created.id },
        data: {
          status: "APPROVED", reviewedAt: new Date(),
          reviewedByAdminName: "Otomatis (Sistem)",
          reviewNote: "Disetujui otomatis (Mode Persetujuan Otomatis aktif)",
        },
      });
      try {
        if ((setting as any).autoCreateAttendance !== false) {
          await writeLeaveAttendance(approved, "APPROVED", null, "Otomatis (Sistem)", approved.reviewNote);
        }
      } catch (e) { console.error("WA/auto presensi gagal:", e); }
      // WA hasil disetujui otomatis: WAJIB ke wali kelas + ortu/siswa (await).
      let waResult: any = null;
      try {
        waResult = await notifyResultOnReview(approved.id);
      } catch (e: any) {
        waResult = { success: false, message: e?.message || "error" };
      }
      const freshAuto = await prisma.leaveRequest.findUnique({ where: { id: approved.id } });
      return NextResponse.json({
        success: true, leave: freshAuto || approved, autoApproved: true,
        message: waResult?.success
          ? "Pengajuan langsung DISETUJUI otomatis. WA hasil terkirim ke wali kelas & ortu/siswa."
          : `Pengajuan langsung DISETUJUI otomatis, TAPI WA hasil gagal (${waResult?.message || "tidak ada nomor"}). Cek nomor walas/ortu & gateway.`,
        waResult: { success: waResult?.success || false, message: waResult?.message || "", status: freshAuto?.waResultStatus || "" },
      });
    }

    // Mode manual (Menunggu TU/Operator): WA pemberitahuan WAJIB terkirim
    // ke TU/Operator TERLEBIH DAHULU (await) sebelum respons dikembalikan,
    // agar TU tahu ada izin baru yang perlu disetujui/ditolak.
    const waTu = await notifyTuOnNewLeave(created.id, { wait: true });
    const fresh = await prisma.leaveRequest.findUnique({ where: { id: created.id } });
    const waInfo = fresh?.waToTuStatus || "";
    if (!waTu.success && waInfo.includes("NO_TU_NUMBER")) {
      return NextResponse.json({
        success: true, leave: fresh || created, warning: true,
        message: "Pengajuan tersimpan (Menunggu), TAPI nomor WA TU/Operator belum diatur — segera isi di Pengaturan Form Izin.",
        waToTu: waInfo,
      });
    }
    if (!waTu.success) {
      return NextResponse.json({
        success: true, leave: fresh || created, warning: true,
        message: `Pengajuan tersimpan (Menunggu), TAPI WA ke TU/Operator gagal (${waTu.message}). Cek WA Gateway & nomor TU.`,
        waToTu: waInfo,
      });
    }
    return NextResponse.json({ success: true, message: "Pengajuan terkirim. WA pemberitahuan sudah terkirim ke TU/Operator — menunggu persetujuan.", leave: fresh || created, waToTu: waInfo });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal mengirim." }, { status: 500 });
  }
}
