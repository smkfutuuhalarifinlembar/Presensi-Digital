import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN_OPERATOR");
    if (!auth.ok) return auth.error;

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const statusFilter = (searchParams.get("status") || "ALL").toUpperCase();
    const query = (searchParams.get("q") || "").trim().slice(0, 120);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));

    const batch = await prisma.broadcastBatch.findUnique({
      where: { id },
      include: { institution: { select: { id: true, code: true, name: true } } },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch tidak ditemukan." }, { status: 404 });
    }

    const msgWhere: any = { batchId: id };
    if (statusFilter !== "ALL") {
      msgWhere.status = statusFilter;
    }
    if (query) {
      msgWhere.OR = [
        { targetPhone: { contains: query, mode: "insensitive" } },
        { personName: { contains: query, mode: "insensitive" } },
        { nisNip: { contains: query, mode: "insensitive" } },
        { errorMessage: { contains: query, mode: "insensitive" } },
        { deliveryMessage: { contains: query, mode: "insensitive" } },
      ];
    }

    const [total, messages] = await Promise.all([
      prisma.broadcastMessage.count({ where: msgWhere }),
      prisma.broadcastMessage.findMany({
        where: msgWhere,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      batch,
      messages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memuat detail batch." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole("ADMIN_OPERATOR");
    if (!auth.ok) return auth.error;

    const { id } = await params;

    const batch = await prisma.broadcastBatch.findUnique({
      where: { id },
      select: { id: true, status: true, institutionName: true, createdAt: true },
    });
    if (!batch) {
      return NextResponse.json({ error: "Batch tidak ditemukan." }, { status: 404 });
    }
    if (batch.status === "RUNNING") {
      return NextResponse.json(
        { error: "Batch sedang mengirim (RUNNING). Hentikan pengiriman sebelum menghapus." },
        { status: 409 }
      );
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const msgs = await tx.broadcastMessage.deleteMany({ where: { batchId: id } });
      const b = await tx.broadcastBatch.delete({ where: { id } });
      return { messages: msgs.count, batch: b };
    });

    try {
      await prisma.auditLog.create({
        data: {
          adminId: auth.admin.adminId,
          adminName: auth.admin.name,
          action: "DELETE_BROADCAST_BATCH",
          target: `BroadcastBatch ${id}`,
          details: `Menghapus riwayat broadcast batch (${batch.institutionName || "Semua Lembaga"}, ${deleted.messages} pesan).`,
        },
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      message: `Batch dihapus: ${deleted.messages} pesan, 1 batch.`,
      deletedMessages: deleted.messages,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menghapus batch broadcast." },
      { status: 500 }
    );
  }
}
