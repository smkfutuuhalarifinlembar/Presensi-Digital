import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Batasi connection pool Prisma di lingkungan serverless (Vercel).
 *
 * Masalah: setiap instance function Vercel membuat connection pool Prisma
 * sendiri (default: num_cpus * 2 + 1 koneksi per instance). Bila banyak
 * instance aktif, server PostgreSQL (apalagi hosting kecil dengan
 * max_connections rendah) cepat kehabisan koneksi → error
 * "FATAL: sorry, too many clients already" sehingga data tidak termuat.
 *
 * Solusi: paksa `connection_limit` kecil + `pool_timeout` agar setiap
 * instance hanya memakai 1 koneksi dan menunggu bila pool penuh.
 * Nilai bisa dioverride lewat env PRISMA_CONNECTION_LIMIT.
 */
function buildDatasourceUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;

  const isServerless = Boolean(process.env.VERCEL) || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
  // Hanya di serverless, dan bila belum diatur manual di DATABASE_URL.
  if (!isServerless || /connection_limit=/i.test(base)) return base;

  const limit = process.env.PRISMA_CONNECTION_LIMIT || "1";
  const timeout = process.env.PRISMA_POOL_TIMEOUT || "10";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}connection_limit=${limit}&pool_timeout=${timeout}`;
}

const datasourceUrl = buildDatasourceUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
