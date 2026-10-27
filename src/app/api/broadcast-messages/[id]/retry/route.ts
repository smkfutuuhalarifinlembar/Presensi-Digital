import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { sendSingleBroadcastMessage } from "@/lib/broadcast-sender";
import { getWaGatewaySnapshot } from "@/lib/wa-provider";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole("ADMIN_OPERATOR");
    if (!auth.ok) return auth.error;

    const { id } = await params;

    const message = await prisma.broadcastMessage.findUnique({
      where: { id },
      include: { batch: { select: { id: true, message: true } } },
    });
    if (!message) {
      return NextResponse.json({ error: "Pesan tidak ditemukan." }, { status: 404 });
    }
    if (message.status !== "FAILED") {
      return NextResponse.json(
        { error: "Hanya pesan dengan status GAGAL yang dapat dikirim ulang." },
        { status: 409 }
      );
    }

    const config = await prisma.waGatewayConfig.findUnique({ where: { id: "default" } });
    const snapshot = getWaGatewaySnapshot(config);

    if (!config || !config.isEnabled || !snapshot.isConfigured) {
      return NextResponse.json(
        {
          error: "Gateway WhatsApp belum aktif atau belum dikonfigurasi.",
          activeGateway: snapshot,
        },
        { status: 400 }
      );
    }

    const result = await sendSingleBroadcastMessage(message.id, config);

    try {
      await prisma.auditLog.create({
        data: {
          adminId: auth.admin.adminId,
          adminName: auth.admin.name,
          action: "RETRY_BROADCAST_MESSAGE",
          target: `BroadcastMessage ${message.id} (${message.personName})`,
          details: `Kirim ulang broadcast WA ${result.success ? "berhasil" : "gagal"}: ${result.message}`,
        },
      });
    } catch {
      // non-blocking
    }

    const updated = await prisma.broadcastMessage.findUnique({ where: { id: message.id } });

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? "Pesan WhatsApp berhasil dikirim ulang."
        : `Pengiriman ulang gagal: ${result.message}`,
      broadcastMessage: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mengirim ulang pesan broadcast." },
      { status: 500 }
    );
  }
}
