import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  try {
    let settings = await prisma.schoolSetting.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.schoolSetting.create({
        data: { id: "default" },
      });
    }

    return NextResponse.json({ settings });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mengambil pengaturan sekolah." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang boleh mengubah pengaturan." }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      npsn,
      address,
      phone,
      email,
      website,
      principalName,
      principalNip,
      principalSignatureUrl,
      logoUrl,
      kioskBackgroundUrl,
      kioskBackgroundColor,
      kioskHeaderSubtitle,
      cardValidity,
      academicYear,
      cardBackNotes,
      cardBackgroundMode,
      cardSolidColor,
      cardGradientFrom,
      cardGradientTo,
      cardBackgroundImageUrl,
       cardSiswaColor,
       cardGuruColor,
       cardPegawaiColor,
       cardKepsekColor,
       useSameBackBg,
       cardBackBackgroundMode,
       cardBackBackgroundImageUrl,
       cardBackSolidColor,
       headerLogoLeftUrl,
       headerLogoRightUrl,
       headerLines,
       headerFont,
       headerTextColor,
       yayasanEnabled,
       yayasanName,
    } = body;

    const updated = await prisma.schoolSetting.upsert({
      where: { id: "default" },
      update: {
        ...(name ? { name: name.trim() } : {}),
        ...(npsn ? { npsn: npsn.trim() } : {}),
        ...(address ? { address: address.trim() } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(email ? { email: email.trim() } : {}),
        ...(website !== undefined ? { website: website ? website.trim() : null } : {}),
        ...(principalName ? { principalName: principalName.trim() } : {}),
        ...(principalNip ? { principalNip: principalNip.trim() } : {}),
        ...(principalSignatureUrl !== undefined ? { principalSignatureUrl } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        ...(kioskBackgroundUrl !== undefined ? { kioskBackgroundUrl } : {}),
        ...(kioskBackgroundColor ? { kioskBackgroundColor } : {}),
        ...(kioskHeaderSubtitle ? { kioskHeaderSubtitle } : {}),
        ...(cardValidity ? { cardValidity } : {}),
        ...(academicYear ? { academicYear } : {}),
        ...(cardBackNotes ? { cardBackNotes } : {}),
        ...(cardBackgroundMode ? { cardBackgroundMode } : {}),
        ...(cardSolidColor ? { cardSolidColor } : {}),
        ...(cardGradientFrom ? { cardGradientFrom } : {}),
        ...(cardGradientTo ? { cardGradientTo } : {}),
        ...(cardBackgroundImageUrl !== undefined ? { cardBackgroundImageUrl } : {}),
        ...(cardSiswaColor ? { cardSiswaColor } : {}),
        ...(cardGuruColor ? { cardGuruColor } : {}),
        ...(cardPegawaiColor ? { cardPegawaiColor } : {}),
        ...(cardKepsekColor ? { cardKepsekColor } : {}),
        ...(useSameBackBg !== undefined ? { useSameBackBg } : {}),
        ...(cardBackBackgroundMode ? { cardBackBackgroundMode } : {}),
        ...(cardBackBackgroundImageUrl !== undefined ? { cardBackBackgroundImageUrl } : {}),
        ...(cardBackSolidColor ? { cardBackSolidColor } : {}),
        ...(headerLogoLeftUrl !== undefined ? { headerLogoLeftUrl } : {}),
        ...(headerLogoRightUrl !== undefined ? { headerLogoRightUrl } : {}),
        ...(headerLines !== undefined ? { headerLines } : {}),
        ...(headerFont ? { headerFont } : {}),
        ...(headerTextColor ? { headerTextColor } : {}),
        ...(yayasanEnabled !== undefined ? { yayasanEnabled: Boolean(yayasanEnabled) } : {}),
        ...(yayasanName ? { yayasanName: yayasanName.trim() } : {}),
      },
      create: {
        id: "default",
        name: name || "SMK Negeri 1 Nusantara",
        npsn: npsn || "20214567",
        address: address || "Jl. Pendidikan No. 45",
        phone: phone || "021-12345678",
        email: email || "info@sekolah.sch.id",
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "UPDATE_SETTINGS",
        target: "PENGATURAN_SEKOLAH",
        details: "Memperbarui identitas dan tampilan sistem",
      },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memperbarui pengaturan." },
      { status: 500 }
    );
  }
}
