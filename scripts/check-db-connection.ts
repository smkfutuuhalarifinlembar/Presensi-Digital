import { prisma } from "../src/lib/prisma";

/** Cek kapasitas & pemakaian koneksi pada server PostgreSQL. */
async function main() {
  const max: any[] = await prisma.$queryRawUnsafe("SHOW max_connections");
  console.log("max_connections:", max[0]?.max_connections);

  const used: any[] = await prisma.$queryRawUnsafe(
    "SELECT count(*)::int AS total, count(*) FILTER (WHERE state = 'idle')::int AS idle, count(*) FILTER (WHERE state = 'active')::int AS active FROM pg_stat_activity"
  );
  console.log(
    `connections now: total=${used[0].total} idle=${used[0].idle} active=${used[0].active}`
  );

  const byApp: any[] = await prisma.$queryRawUnsafe(
    "SELECT coalesce(application_name,'-') AS app, coalesce(state,'-') AS state, count(*)::int AS n FROM pg_stat_activity GROUP BY 1,2 ORDER BY n DESC LIMIT 15"
  );
  console.log("by application/state:");
  for (const r of byApp) console.log(`  ${r.n.toString().padStart(3)}  ${r.app}  (${r.state})`);
}

main()
  .catch((e) => {
    console.error("DB ERROR:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
