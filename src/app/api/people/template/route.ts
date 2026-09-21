import { NextResponse } from "next/server";
import { generatePeopleTemplateBuffer } from "@/lib/export-excel";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const buffer = generatePeopleTemplateBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="Template_Import_Data_Presensi.xlsx"',
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mengunduh template." },
      { status: 500 }
    );
  }
}
