import { PrismaClient } from "@prisma/client";

/**
 * Darurat: coba hubungkan ke PostgreSQL (dengan 1 koneksi) lalu
 * terminate koneksi IDLE lain agar slot koneksi lega.
 * Hanya memakai kredensial yang sudah ada di DATABASE_URL.
 */
async function main() {
  const base = process.env.DATABASE_URL!;
  const url = base + (base.includes("?") ? "&" : "?") + "connection_limit=1&pool_timeout=3";
  const prisma = new PrismaClient({ datasourceUrl: url });

  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      "SELECT pid, state, application_name, backend_start FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND state = 'idle'"
    );
    console.log(`Idle connections found: ${rows.length}`);
    for (const r of rows) {
      console.log(`  terminating pid=${r.pid} app=${r.application_name || '-'} since=${r.backend_start}`);
      await prisma.$queryRawUnsafe(`SELECT pg_terminate_backend(${Number(r.pid)})`);
    }
    const after: any[] = await prisma.$queryRawUnsafe(
      "SELECT count(*)::int AS n FROM pg_stat_activity"
    );
    console.log(`Connections after cleanup: ${after[0].n}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
