import { NextResponse } from "next/server";
import { runNotificationLogCleanup } from "@/lib/notification-cleanup";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authorization = req.headers.get("authorization");
      if (authorization !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await runNotificationLogCleanup({ trigger: "CRON" });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Pembersihan notifikasi otomatis gagal." },
      { status: 500 }
    );
  }
}