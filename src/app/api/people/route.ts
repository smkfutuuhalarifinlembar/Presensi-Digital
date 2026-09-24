import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { generateUniqueQrToken } from "@/lib/qr-token";

export async function GET(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const className = searchParams.get("className");
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "25")));

    const where: any = { isActive: true };

    if (role && role !== "ALL") {
      where.role = role;
    }

    if (className && className !== "ALL") {
      where.className = className;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { nisNip: { contains: search, mode: "insensitive" } },
        { rfidUid: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, people, availableClasses] = await Promise.all([
      prisma.person.count({ where }),
      prisma.person.findMany({
        where,
        orderBy: [{ role: "asc" }, { className: "asc" }, { name: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          institution: { select: { id: true, code: true, name: true, level: true } },
        },
      }),
      prisma.person.findMany({
        where: { role: "SISWA", className: { not: null }, isActive: true },
        select: { className: true },
        distinct: ["className"],
        orderBy: { className: "asc" },
      }),
    ]);

    return NextResponse.json({
      people,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      classes: availableClasses.map((c) => c.className).filter(Boolean),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mengambil data orang." },
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
      return NextResponse.json({ error: "Hanya Super Admin yang boleh menambah data orang." }, { status: 403 });
    }

    const body = await req.json();
    const {
      nisNip,
      name,
      role,
      className,
      position,
      phone,
      parentPhone,
      rfidUid,
      gender = "L",
      photoUrl,
      institutionId,
    } = body;

    if (!nisNip || !name || !role) {
      return NextResponse.json(
        { error: "NIS/NIP, Nama Lengkap, dan Kategori wajib diisi." },
        { status: 400 }
      );
    }

    // Cek duplikasi NIS/NIP
    const existingNis = await prisma.person.findUnique({
      where: { nisNip: nisNip.trim() },
    });
    if (existingNis) {
      return NextResponse.json(
        { error: `NIS/NIP ${nisNip} sudah digunakan oleh ${existingNis.name}.` },
        { status: 400 }
      );
    }

    // Cek duplikasi RFID
    if (rfidUid && rfidUid.trim()) {
      const existingRfid = await prisma.person.findUnique({
        where: { rfidUid: rfidUid.trim() },
      });
      if (existingRfid) {
        return NextResponse.json(
          { error: `Kode RFID ${rfidUid} sudah digunakan oleh ${existingRfid.name}.` },
          { status: 400 }
        );
      }
    }

    // Validasi Lembaga / Unit (fitur Yayasan) bila diisi
    let institutionIdValue: string | null = null;
    if (institutionId) {
      const institution = await prisma.institution.findUnique({
        where: { id: String(institutionId) },
      });
      if (!institution) {
        return NextResponse.json(
          { error: "Lembaga / Unit yang dipilih tidak ditemukan." },
          { status: 400 }
        );
      }
      institutionIdValue = institution.id;
    }

    // Generate token QR Code unik (disimpan di kolom qrCodeToken / data kartu)
    const qrToken = await generateUniqueQrToken(role, nisNip.trim());

    const newPerson = await prisma.person.create({
      data: {
        nisNip: nisNip.trim(),
        name: name.trim(),
        role,
        className: className ? className.trim() : null,
        position: position ? position.trim() : null,
        phone: phone ? phone.trim() : null,
        parentPhone: parentPhone ? parentPhone.trim() : null,
        rfidUid: rfidUid && rfidUid.trim() ? rfidUid.trim() : null,
        qrCodeToken: qrToken,
        gender: gender === "P" ? "P" : "L",
        photoUrl: photoUrl || null,
        institutionId: institutionIdValue,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "CREATE_PERSON",
        target: `${role}: ${name}`,
        details: `Menambahkan data orang baru dengan NIS/NIP ${nisNip}`,
      },
    });

    return NextResponse.json({ success: true, person: newPerson });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menyimpan data orang." },
      { status: 500 }
    );
  }
}
