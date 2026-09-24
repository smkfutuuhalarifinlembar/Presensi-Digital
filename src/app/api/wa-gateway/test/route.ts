import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { sendDirectWaMessage } from "@/lib/wa-sender";

export async function POST(req: Request) {
  try {
    const auth = await requireRole("SUPER_ADMIN");
    if (!auth.ok) return auth.error;

    const { targetPhone, config } = await req.json();

    if (!targetPhone) {
      return NextResponse.json(
        { error: "Nomor WhatsApp tujuan tes wajib diisi." },
        { status: 400 }
      );
    }

    const testMessage = `[TEST KONEKSI SISTEM PRESENSI]\n\nHalo, ini adalah pesan uji coba dari Sistem Presensi Digital Sekolah.\nStatus: Gateway ${config?.provider || "Tersambung"} Berfungsi dengan Baik.\nWaktu: ${new Date().toLocaleString("id-ID")}`;

    // Validasi field wajib sesuai provider
    if (config?.provider === "FONNTE" && !config?.fonnteApiKey) {
      return NextResponse.json(
        { success: false, message: "API Key Fonnte wajib diisi sebelum menguji koneksi." },
        { status: 400 }
      );
    }
    if (config?.provider === "SAUNGWA" && (!config?.saungwaApiKey || !config?.saungwaAuthKey)) {
      return NextResponse.json(
        { success: false, message: "API Key dan Auth Key SaungWA wajib diisi sebelum menguji koneksi." },
        { status: 400 }
      );
    }
    if (config?.provider === "CUSTOM" && !config?.customEndpointUrl) {
      return NextResponse.json(
        { success: false, message: "Custom Endpoint URL wajib diisi sebelum menguji koneksi." },
        { status: 400 }
      );
    }

    const result = await sendDirectWaMessage(targetPhone, testMessage, config);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal melakukan tes koneksi." },
      { status: 500 }
    );
  }
}
