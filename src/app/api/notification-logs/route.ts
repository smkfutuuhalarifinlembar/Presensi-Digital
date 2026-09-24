import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getWaGatewaySnapshot } from "@/lib/wa-provider";

export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isDateInput(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth;
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(req: Request) {
  try {
    const auth = await requireRole("ADMIN_OPERATOR");
    if (!auth.ok) return auth.error;

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "ALL").toUpperCase();
    const source = (searchParams.get("source") || "ALL").toUpperCase();
    const query = (searchParams.get("q") || "").trim().slice(0, 120);
    const from = (searchParams.get("from") || "").trim();
    const to = (searchParams.get("to") || "").trim();
    const page = positiveInt(searchParams.get("page"), 1);
    const limit = Math.min(100, positiveInt(searchParams.get("limit"), 25));

    if (!["ALL", "SENT", "FAILED"].includes(status)) {
      return NextResponse.json({ error: "Status filter tidak valid." }, { status: 400 });
    }
    if (!["ALL", "AUTOMATIC", "MANUAL", "RETRY", "RFID", "QR", "IZIN_ONLINE"].includes(source)) {
      return NextResponse.json({ error: "Sumber notifikasi tidak valid." }, { status: 400 });
    }
    if ((from && !isDateInput(from)) || (to && !isDateInput(to))) {
      return NextResponse.json({ error: "Format tanggal filter tidak valid." }, { status: 400 });
    }
    if (from && to && from > to) {
      return NextResponse.json({ error: "Tanggal awal tidak boleh melewati tanggal akhir." }, { status: 400 });
    }

    const createdAt: { gte?: Date; lt?: Date } = {};
    if (from) createdAt.gte = new Date(`${from}T00:00:00+07:00`);
    if (to) {
      const end = new Date(`${to}T00:00:00+07:00`);
      end.setUTCDate(end.getUTCDate() + 1);
      createdAt.lt = end;
    }

    const scopeWhere: any = {
      channel: "WHATSAPP",
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
      ...(query
        ? {
            OR: [
              { targetPhone: { contains: query, mode: "insensitive" } },
              { messageContent: { contains: query, mode: "insensitive" } },
              { errorMessage: { contains: query, mode: "insensitive" } },
              { attendance: { person: { name: { contains: query, mode: "insensitive" } } } },
              { attendance: { person: { nisNip: { contains: query, mode: "insensitive" } } } },
              { attendance: { activity: { name: { contains: query, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };
    const where = {
      ...scopeWhere,
      ...(status !== "ALL" ? { status } : {}),
      ...(source !== "ALL" ? { source } : {}),
    };

    const [total, logs, grouped, activeGatewayConfig] = await Promise.all([
      prisma.notificationLog.count({ where }),
      prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          attendance: {
            select: {
              id: true,
              dateString: true,
              timeString: true,
              status: true,
              method: true,
              person: { select: { name: true, nisNip: true, role: true, className: true } },
              activity: { select: { name: true } },
            },
          },
        },
      }),
      prisma.notificationLog.groupBy({
        by: ["status"],
        where: scopeWhere,
        _count: { _all: true },
      }),
      prisma.waGatewayConfig.findUnique({ where: { id: "default" } }),
    ]);
    const summary = { total: 0, sent: 0, failed: 0, pending: 0 };
    for (const row of grouped) {
      const count = row._count._all;
      summary.total += count;
      if (row.status === "SENT") summary.sent += count;
      if (row.status === "FAILED") summary.failed += count;
      if (row.status === "PENDING") summary.pending += count;
    }

    return NextResponse.json({
      logs,
      total,
      summary,
      activeGateway: getWaGatewaySnapshot(activeGatewayConfig),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memuat riwayat notifikasi." },
      { status: 500 }
    );
  }
}