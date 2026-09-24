import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { sendDirectWaMessage } from "@/lib/wa-sender";
import { prisma } from "@/lib/prisma";
import {
  getWaGatewaySnapshot,
  getWaProviderLabel,
  normalizeWaProvider,
} from "@/lib/wa-provider";

export async function POST(req: Request) {
  try {
    const auth = await requireRole("SUPER_ADMIN");
    if (!auth.ok) return auth.error;

    const { targetPhone, config: configInput } = await req.json();
    const activeConfig = await prisma.waGatewayConfig.findUnique({
      where: { id: "default" },
    });
    const config = configInput || activeConfig;
    const testedProvider = normalizeWaProvider(config?.provider || activeConfig?.provider);
    const testedLabel = getWaProviderLabel(testedProvider, config);
    const activeGateway = getWaGatewaySnapshot(activeConfig);
    const usesActiveProvider = activeGateway.provider === testedProvider;
    const metadata = {
      testedProvider,
      testedProviderLabel: testedLabel,
      activeGateway,
      usesActiveProvider,
    };

    if (!targetPhone) {
      return NextResponse.json(
        { error: "Nomor WhatsApp tujuan tes wajib diisi.", ...metadata },
        { status: 400 }
      );
    }

    const testMessage = `[TEST KONEKSI SISTEM PRESENSI]\n\nHalo, ini adalah pesan uji coba dari Sistem Presensi Digital Sekolah.\nProvider yang diuji: ${testedLabel}.\nWaktu: ${new Date().toLocaleString("id-ID")}`;

    // Validasi field wajib sesuai provider
    if (testedProvider === "FONNTE" && !config?.fonnteApiKey) {
      return NextResponse.json(
        { success: false, message: "API Key Fonnte wajib diisi sebelum menguji koneksi.", ...metadata },
        { status: 400 }
      );
    }
    if (testedProvider === "SAUNGWA" && (!config?.saungwaApiKey || !config?.saungwaAuthKey)) {
      return NextResponse.json(
        { success: false, message: "API Key dan Auth Key SaungWA wajib diisi sebelum menguji koneksi.", ...metadata },
        { status: 400 }
      );
    }
    if (testedProvider === "CUSTOM" && !config?.customEndpointUrl) {
      return NextResponse.json(
        { success: false, message: "Custom Endpoint URL wajib diisi sebelum menguji koneksi.", ...metadata },
        { status: 400 }
      );
    }

    const result = await sendDirectWaMessage(targetPhone, testMessage, config);

    return NextResponse.json({ ...result, ...metadata });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal melakukan tes koneksi." },
      { status: 500 }
    );
  }
}
