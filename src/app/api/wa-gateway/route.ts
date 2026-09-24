import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, requireRole } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await requireRole("SUPER_ADMIN");
    if (!auth.ok) return auth.error;

    let config = await prisma.waGatewayConfig.findUnique({
      where: { id: "default" },
    });

    if (!config) {
      config = await prisma.waGatewayConfig.create({
        data: {
          id: "default",
          provider: "FONNTE",
          fonnteEndpointUrl: "https://api.fonnte.com/send",
        },
      });
    }

    const templates = await prisma.waTemplate.findMany({
      orderBy: { status: "asc" },
    });

    return NextResponse.json({ config, templates });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memuat konfigurasi WhatsApp." },
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
      return NextResponse.json({ error: "Hanya Super Admin yang boleh mengubah konfigurasi WA." }, { status: 403 });
    }

    const body = await req.json();
    const { config, templates } = body;

    let updatedConfig = null;
    if (config) {
      updatedConfig = await prisma.waGatewayConfig.upsert({
        where: { id: "default" },
        update: {
          provider: config.provider || "FONNTE",
          isEnabled: Boolean(config.isEnabled),

          fonnteApiKey: config.fonnteApiKey?.trim() || null,
          fonnteEndpointUrl: config.fonnteEndpointUrl?.trim() || "https://api.fonnte.com/send",

          saungwaApiKey: config.saungwaApiKey?.trim() || null,
          saungwaAuthKey: config.saungwaAuthKey?.trim() || null,
          saungwaEndpointUrl: config.saungwaEndpointUrl?.trim() || "https://app.saungwa.com/api/create-message",
          saungwaSenderNumber: config.saungwaSenderNumber?.trim() || null,

          customName: config.customName?.trim() || null,
          customEndpointUrl: config.customEndpointUrl?.trim() || null,
          customApiKey: config.customApiKey?.trim() || null,
          customMethod: config.customMethod || "POST",
          customHeadersJson: config.customHeadersJson || null,
          customBodyMappingJson: config.customBodyMappingJson || null,
        },
        create: {
          id: "default",
          provider: config.provider || "FONNTE",
          isEnabled: Boolean(config.isEnabled),
        },
      });
    }

    // Update templates jika ada
    if (templates && Array.isArray(templates)) {
      for (const t of templates) {
        if (t.status && t.contentTemplate) {
          await prisma.waTemplate.upsert({
            where: {
              role_status: {
                role: t.role || "ALL",
                status: t.status,
              },
            },
            update: { contentTemplate: t.contentTemplate },
            create: {
              role: t.role || "ALL",
              status: t.status,
              contentTemplate: t.contentTemplate,
            },
          });
        }
      }
    }

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "UPDATE_WA_CONFIG",
        target: "WA_GATEWAY",
        details: `Memperbarui konfigurasi gateway WhatsApp (${config?.provider})`,
      },
    });

    const refreshedTemplates = await prisma.waTemplate.findMany({
      orderBy: { status: "asc" },
    });

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      templates: refreshedTemplates,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memperbarui konfigurasi WhatsApp." },
      { status: 500 }
    );
  }
}
