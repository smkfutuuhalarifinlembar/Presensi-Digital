import { PrismaClient } from "@prisma/client";

/**
 * Darurat: poll PostgreSQL sampai bisa masuk (1 slot kosong),
 * lalu terminate koneksi IDLE lain agar slot lega.
 */
const base = process.env.DATABASE_URL!;
const url = base + (base.includes("?") ? "&" : "?") + "connection_limit=1&pool_timeout=3";

const DEADLINE = Date.now() + 5 * 60 * 1000; // coba maksimal 5 menit

async function attempt(n: number): Promise<boolean> {
  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      "SELECT pid, state, application_name, backend_start, extract(epoch from (now() - state_change))::int AS idle_sec FROM pg_stat_activity WHERE pid <> pg_backend_pid()"
    );
    console.log(`[attempt ${n}] connected. total connections = ${rows.length}`);
    for (const r of rows) {
      console.log(
        `  pid=${r.pid} state=${r.state} app=${r.application_name || "-"} idle=${r.idle_sec}s`
      );
      if (r.state === "idle") {
        await prisma.$queryRawUnsafe(`SELECT pg_terminate_backend(${Number(r.pid)})`);
        console.log(`    -> terminated`);
      }
    }
    const after: any[] = await prisma.$queryRawUnsafe(
      "SELECT count(*)::int AS n FROM pg_stat_activity"
    );
    console.log(`Connections after cleanup: ${after[0].n}`);
    return true;
  } catch (e: any) {
    console.log(`[attempt ${n}] ${e.message.split("\n").pop()?.trim()}`);
    return false;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

async function main() {
  let n = 0;
  while (Date.now() < DEADLINE) {
    n++;
    if (await attempt(n)) return;
    await new Promise((r) => setTimeout(r, 10_000));
  }
  console.error("Gagal dalam 5 menit — server tetap penuh.");
  process.exit(1);
}

main();

