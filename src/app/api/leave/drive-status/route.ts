import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_DRIVE_FOLDER_ID } from "@/lib/drive-uploader";

// Status koneksi Drive + daftar file yang sudah tersimpan dengan ID Drive.
export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const setting: any = await prisma.leaveSetting.findUnique({ where: { id: "default" } });
    const folderId = (setting?.driveFolderId || "").trim() || DEFAULT_DRIVE_FOLDER_ID;
    const envEnabled = String(process.env.GOOGLE_DRIVE_ENABLED || "").toLowerCase() === "true";
    const hasSaEnv = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_PATH);
    const total = await prisma.leaveRequest.count();
    const withProofDrive = await prisma.leaveRequest.count({ where: { proofDriveId: { not: null } } });
    const withParentDrive = await prisma.leaveRequest.count({ where: { parentPhotoDriveId: { not: null } } });
    const latest = await prisma.leaveRequest.findMany({
      orderBy: { submittedAt: "desc" }, take: 20,
      select: {
        id: true, personName: true, nisNip: true, className: true, dateString: true, status: true,
        proofImageUrl: true, proofDriveId: true, proofDriveLink: true,
        parentPhotoUrl: true, parentPhotoDriveId: true, parentPhotoDriveLink: true,
        submittedAt: true,
      },
    });
    return NextResponse.json({
      folderId, defaultFolderId: DEFAULT_DRIVE_FOLDER_ID,
      folderLink: `https://drive.google.com/drive/folders/${folderId}`,
      driveEnabledEnv: envEnabled,
      driveSettingFlag: Boolean(setting?.driveEnabled),
      hasServiceAccount: hasSaEnv,
      active: envEnabled && hasSaEnv,
      stats: { total, withProofDrive, withParentDrive },
      latest,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal memuat status Drive." }, { status: 500 });
  }
}
