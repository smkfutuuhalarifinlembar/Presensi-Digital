import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const person = await prisma.person.findUnique({
      where: { id },
      include: {
        attendances: {
          take: 10,
          orderBy: { timestamp: "desc" },
          include: { activity: true },
        },
      },
    });

    if (!person) {
      return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ person });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mengambil data." },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json({ error: "Hanya Super Admin yang boleh mengubah data orang." }, { status: 403 });
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
      gender,
      photoUrl,
      isActive,
      institutionId,
    } = body;

    // Validasi Lembaga / Unit (fitur Yayasan) bila diisi
    let institutionIdValue: string | null | undefined = undefined;
    if (institutionId !== undefined) {
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
      } else {
        institutionIdValue = null;
      }
    }

    // Cek duplikasi NIS/NIP jika berubah
    if (nisNip) {
      const conflict = await prisma.person.findFirst({
        where: {
          nisNip: nisNip.trim(),
          id: { not: id },
        },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `NIS/NIP ${nisNip} sudah digunakan oleh orang lain.` },
          { status: 400 }
        );
      }
    }

    // Cek duplikasi RFID jika berubah
    if (rfidUid && rfidUid.trim()) {
      const conflictRfid = await prisma.person.findFirst({
        where: {
          rfidUid: rfidUid.trim(),
          id: { not: id },
        },
      });
      if (conflictRfid) {
        return NextResponse.json(
          { error: `Kode RFID ${rfidUid} sudah digunakan oleh ${conflictRfid.name}.` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.person.update({
      where: { id },
      data: {
        ...(nisNip ? { nisNip: nisNip.trim() } : {}),
        ...(name ? { name: name.trim() } : {}),
        ...(role ? { role } : {}),
        className: className !== undefined ? (className ? className.trim() : null) : undefined,
        position: position !== undefined ? (position ? position.trim() : null) : undefined,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : undefined,
        parentPhone: parentPhone !== undefined ? (parentPhone ? parentPhone.trim() : null) : undefined,
        rfidUid: rfidUid !== undefined ? (rfidUid && rfidUid.trim() ? rfidUid.trim() : null) : undefined,
        gender: gender !== undefined ? gender : undefined,
        photoUrl: photoUrl !== undefined ? photoUrl : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        // Lembaga / Unit (fitur Yayasan) — ikut disimpan saat edit,
        // nilai undefined = tidak diubah, null = dilepas dari lembaga.
        institutionId: institutionIdValue,
        // CATATAN: `qrCodeToken` sengaja TIDAK di-generate ulang.
        // Token QR adalah data kartu yang sudah tercetak, jadi tetap dibiarkan
        // walau NIS/NIP berubah agar kartu lama tetap bisa di-scan di kiosk.
      },
    });

    // Info lembaga sesudah perubahan, untuk jejak audit
    const updatedWithInstitution = await prisma.person.findUnique({
      where: { id: updated.id },
      select: {
        institutionId: true,
        institution: { select: { name: true, level: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "UPDATE_PERSON",
        target: `${updated.role}: ${updated.name}`,
        details: `Mengubah data profil (NIS/NIP: ${updated.nisNip}) — Lembaga/Unit: ${
          updatedWithInstitution?.institution
            ? `${updatedWithInstitution.institution.name} (${updatedWithInstitution.institution.level})`
            : "Tanpa Lembaga"
        }`,
      },
    });

    return NextResponse.json({ success: true, person: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memperbarui data orang." },
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
      return NextResponse.json({ error: "Hanya Super Admin yang boleh menghapus data orang." }, { status: 403 });
    }

    const person = await prisma.person.findUnique({
      where: { id },
    });

    if (!person) {
      return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
    }

    await prisma.person.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "DELETE_PERSON",
        target: `${person.role}: ${person.name}`,
        details: `Menghapus data orang (${person.nisNip})`,
      },
    });

    return NextResponse.json({ success: true, message: "Data berhasil dihapus." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menghapus data." },
      { status: 500 }
    );
  }
}
