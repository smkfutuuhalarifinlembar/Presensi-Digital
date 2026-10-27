import { PrismaClient } from "@prisma/client";

/** Inspeksi jumlah data di setiap tabel — untuk memastikan data asli masih ada. */
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  const url = (process.env.DATABASE_URL || "").replace(/:\/\/[^:]+:[^@]+@/, "://***:***@");
  console.log("target DB:", url);

  const max: any[] = await prisma.$queryRawUnsafe("SHOW max_connections");
  console.log("max_connections:", max[0]?.max_connections);

  const used: any[] = await prisma.$queryRawUnsafe(
    "SELECT count(*)::int AS total, count(*) FILTER (WHERE state = 'idle')::int AS idle, count(*) FILTER (WHERE state = 'active')::int AS active FROM pg_stat_activity"
  );
  console.log(
    `connections now: total=${used[0].total} idle=${used[0].idle} active=${used[0].active}`
  );

  const models: [string, string][] = [
    ["person", "Person"],
    ["admin", "Admin"],
    ["institution", "Institution"],
    ["activity", "Activity"],
    ["activityCategory", "ActivityCategory"],
    ["attendanceRecord", "AttendanceRecord"],
    ["leaveRequest", "LeaveRequest"],
    ["schoolSetting", "SchoolSetting"],
  ];

  console.log("--- row counts ---");
  for (const [key, name] of models) {
    try {
      const c = await (prisma as any)[key].count();
      console.log(`${name.padEnd(20)} = ${c}`);
    } catch (e: any) {
      console.log(`${name.padEnd(20)} = ERR: ${e.message?.split("\n")[0]}`);
    }
  }

  // Contoh data Person (cari tanda data ASLI vs data contoh)
  console.log("--- sample Person (up to 8) ---");
  try {
    const people = await prisma.person.findMany({
      take: 8,
      orderBy: { createdAt: "asc" },
      select: { nisNip: true, name: true, role: true, className: true },
    });
    for (const p of people) console.log(`  ${p.nisNip}  ${p.name}  [${p.role}]${p.className ? " " + p.className : ""}`);
  } catch (e: any) {
    console.log("  ERR:", e.message?.split("\n")[0]);
  }

  // Rentang tanggal presensi (bukti data asli banyak)
  console.log("--- attendance date range ---");
  try {
    const total = await prisma.attendanceRecord.count();
    const first = await prisma.attendanceRecord.findFirst({
      orderBy: { timestamp: "asc" },
      select: { dateString: true },
    });
    const last = await prisma.attendanceRecord.findFirst({
      orderBy: { timestamp: "desc" },
      select: { dateString: true },
    });
    console.log(`  total=${total}  oldest=${first?.dateString}  newest=${last?.dateString}`);
  } catch (e: any) {
    console.log("  ERR:", e.message?.split("\n")[0]);
  }

  // Nama sekolah tersimpan
  console.log("--- SchoolSetting ---");
  try {
    const s = await prisma.schoolSetting.findFirst({
      select: { name: true, npsn: true, principalName: true, updatedAt: true },
    });
    console.log("  ", JSON.stringify(s));
  } catch (e: any) {
    console.log("  ERR:", e.message?.split("\n")[0]);
  }
}

main()
  .catch((e) => {
    console.error("DB ERROR:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
