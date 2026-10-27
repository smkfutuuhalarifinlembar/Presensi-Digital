import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getWaGatewaySnapshot } from "@/lib/wa-provider";
import { MAX_TARGETS_PER_BATCH, MAX_BROADCAST_DELAY_SECONDS } from "@/lib/broadcast-sender";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["SISWA", "GURU", "PEGAWAI", "ADMIN", "ALL"];

function clampDelay(value: unknown): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 0) return 2;
  if (n > MAX_BROADCAST_DELAY_SECONDS) return MAX_BROADCAST_DELAY_SECONDS;
  return n;
}

export async function GET(req: Request) {
  try {
    const auth = await requireRole("ADMIN_OPERATOR");
    if (!auth.ok) return auth.error;

    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get("institutionId");
    const status = (searchParams.get("status") || "ALL").toUpperCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const scopeWhere: any = {};
    if (institutionId && institutionId !== "ALL") {
      scopeWhere.institutionId = institutionId;
    }
    if (status !== "ALL") {
      scopeWhere.status = status;
    }

    const [total, batches, gatewayConfig, totals] = await Promise.all([
      prisma.broadcastBatch.count({ where: scopeWhere }),
      prisma.broadcastBatch.findMany({
        where: scopeWhere,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          institution: { select: { id: true, code: true, name: true, level: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.waGatewayConfig.findUnique({ where: { id: "default" } }),
      prisma.broadcastBatch.aggregate({
        where: scopeWhere,
        _sum: { sentCount: true, failedCount: true, skippedCount: true, totalTargets: true },
      }),
    ]);

    const summary = {
      batches: total,
      sent: Number(totals._sum.sentCount || 0),
      failed: Number(totals._sum.failedCount || 0),
      skipped: Number(totals._sum.skippedCount || 0),
      targets: Number(totals._sum.totalTargets || 0),
    };

    return NextResponse.json({
      batches,
      summary,
      total: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      activeGateway: getWaGatewaySnapshot(gatewayConfig),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memuat riwayat broadcast." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireRole("ADMIN_OPERATOR");
    if (!auth.ok) return auth.error;

    const body = await req.json();
    const { institutionId = null, targetRole = "SISWA", message, delaySeconds, classNames = [] } = body || {};

    if (!message || !String(message).trim()) {
      return NextResponse.json({ error: "Isi pesan wajib diisi." }, { status: 400 });
    }
    const normalizedMessage = String(message);
    const delay = clampDelay(delaySeconds);

    let institution: { id: string; code: string; name: string; level: string } | null = null;
    if (institutionId && institutionId !== "ALL") {
      institution = await prisma.institution.findUnique({
        where: { id: String(institutionId) },
        select: { id: true, code: true, name: true, level: true },
      });
      if (!institution) {
        return NextResponse.json({ error: "Lembaga yang dipilih tidak ditemukan." }, { status: 400 });
      }
    }

    const roleFilter = targetRole && targetRole !== "ALL" ? targetRole : undefined;
    if (roleFilter && !VALID_ROLES.includes(roleFilter)) {
      return NextResponse.json({ error: "Role sasaran tidak valid." }, { status: 400 });
    }

    const selectedClasses: string[] = Array.isArray(classNames)
      ? classNames.filter((c): c is string => typeof c === "string" && c.trim() !== "").map((c) => c.trim())
      : [];

    const personWhere: any = {
      isActive: true,
      ...(institution ? { institutionId: institution.id } : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
    };
    if (institution && selectedClasses.length > 0) {
      personWhere.className = { in: selectedClasses };
    }

    const people = await prisma.person.findMany({
      where: personWhere,
      select: { id: true, name: true, nisNip: true, className: true, role: true, parentPhone: true, phone: true, institutionId: true },
    });

    const withPhone = people.filter((p) => {
      if (p.role === "SISWA") {
        return p.parentPhone && p.parentPhone.trim();
      }
      return (p.phone && p.phone.trim()) || (p.parentPhone && p.parentPhone.trim());
    });
    const withoutPhone = people.length - withPhone.length;

    if (withPhone.length > MAX_TARGETS_PER_BATCH) {
      return NextResponse.json(
        {
          error: `Jumlah sasaran dengan nomor WhatsApp (${withPhone.length}) melebihi batas maksimal ${MAX_TARGETS_PER_BATCH} per batch. Kirim per lembaga atau kelompok yang lebih kecil.`,
          withPhone: withPhone.length,
          total: people.length,
          maxTargets: MAX_TARGETS_PER_BATCH,
        },
        { status: 413 }
      );
    }

    const scope = institution ? "INSTITUTION" : "ALL";
    const batch = await prisma.broadcastBatch.create({
      data: {
        scope,
        institutionId: institution ? institution.id : null,
        institutionName: institution ? institution.name : null,
        institutionCode: institution ? institution.code : null,
        targetRole: roleFilter || null,
        selectedClassesJson: selectedClasses.length > 0 ? JSON.stringify(selectedClasses) : null,
        message: normalizedMessage,
        delaySeconds: delay,
        totalTargets: people.length,
        withPhoneCount: withPhone.length,
        skippedCount: withoutPhone,
        status: "PENDING",
        createdByAdminId: auth.admin.adminId,
        createdByName: auth.admin.name,
      },
    });

    if (people.length > 0) {
      await prisma.broadcastMessage.createMany({
        data: people.map((p) => {
          const phone = p.role === "SISWA"
            ? (p.parentPhone ? p.parentPhone.trim() : null)
            : (p.phone?.trim() || p.parentPhone?.trim() || null);
          const hasPhone = Boolean(phone);
          return {
            batchId: batch.id,
            personId: p.id,
            personName: p.name,
            nisNip: p.nisNip,
            className: p.className,
            targetPhone: phone,
            messageContent: normalizedMessage,
            status: hasPhone ? "PENDING" : "SKIPPED",
            deliveryMessage: hasPhone ? null : "Nomor WhatsApp tidak tersedia.",
          };
        }),
        skipDuplicates: true,
      });
    }

    await prisma.auditLog.create({
      data: {
        adminId: auth.admin.adminId,
        adminName: auth.admin.name,
        action: "CREATE_BROADCAST_BATCH",
        target: `BroadcastBatch ${batch.id}`,
        details: `Membuat batch notifikasi broadcast ke orang tua/kontak: scope=${scope}, lembaga=${institution ? institution.name : "SEMUA"}, kelas=${selectedClasses.length ? selectedClasses.join(", ") : "SEMUA"}, target=${people.length}, ada_nomor=${withPhone.length}, tanpa_nomor=${withoutPhone}, delay=${delay}s.`,
      },
    });

    return NextResponse.json({
      success: true,
      batch: {
        id: batch.id,
        status: batch.status,
        totalTargets: batch.totalTargets,
        withPhoneCount: batch.withPhoneCount,
        withoutPhoneCount: withoutPhone,
        sentCount: 0,
        failedCount: 0,
        skippedCount: batch.skippedCount,
        message: batch.message,
        delaySeconds: batch.delaySeconds,
        scope: batch.scope,
        institutionName: batch.institutionName,
        selectedClasses: selectedClasses,
        createdAt: batch.createdAt,
      },
      preview: {
        total: people.length,
        withPhone: withPhone.length,
        withoutPhone,
        sampleInstitutionName: institution ? institution.name : null,
        selectedClasses,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal membuat batch broadcast." },
      { status: 500 }
    );
  }
}
