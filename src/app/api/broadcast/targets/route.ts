import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireRole("ADMIN_OPERATOR");
    if (!auth.ok) return auth.error;

    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get("institutionId");
    const targetRole = searchParams.get("targetRole") || "SISWA";
    const classNames = searchParams.getAll("classNames").filter(Boolean);

    const roleFilter = targetRole && targetRole !== "ALL" ? targetRole : undefined;
    const where: any = { isActive: true };
    if (institutionId && institutionId !== "ALL") {
      where.institutionId = institutionId;
    }
    if (roleFilter) {
      where.role = roleFilter;
    }
    if (classNames.length > 0) {
      where.className = { in: classNames };
    }

    const isStudentRole = roleFilter === "SISWA";
    const phoneCondition = isStudentRole
      ? { parentPhone: { not: null } }
      : { OR: [{ parentPhone: { not: null } }, { phone: { not: null } }] };

    const [total, withPhone, institution, classes] = await Promise.all([
      prisma.person.count({ where }),
      prisma.person.count({
        where: { AND: [where, phoneCondition] },
      }),
      institutionId && institutionId !== "ALL"
        ? prisma.institution.findUnique({
            where: { id: institutionId },
            select: { id: true, code: true, name: true, level: true },
          })
        : null,
      prisma.person.findMany({
        where: {
          ...(institutionId && institutionId !== "ALL" ? { institutionId } : {}),
          ...(roleFilter ? { role: roleFilter } : {}),
          isActive: true,
          className: { not: null },
        } as any,
        select: { className: true },
        distinct: ["className"],
        orderBy: { className: "asc" },
      }),
    ]);

    return NextResponse.json({
      total,
      withPhone,
      withoutPhone: total - withPhone,
      institution,
      classes: classes.map((c) => c.className).filter(Boolean),
      targetRole: roleFilter || "ALL",
      classNames,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mempreview sasaran." },
      { status: 500 }
    );
  }
}
