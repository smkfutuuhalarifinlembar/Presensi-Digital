import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

// Delete attendance records
export async function DELETE(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Super Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // attendance, people, activities, all

    let deletedCount = 0;
    let details = "";

    if (type === "attendance") {
      // Delete with optional date range
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const role = searchParams.get("role");
      const className = searchParams.get("className");

      const where: any = {};
      
      if (startDate && endDate) {
        where.dateString = { gte: startDate, lte: endDate };
      }
      
      if (role && role !== "ALL") {
        where.person = { role };
      }
      
      if (className && className !== "ALL") {
        where.person = { ...where.person, className };
      }

      const result = await prisma.attendanceRecord.deleteMany({ where });
      deletedCount = result.count;
      details = `Menghapus ${deletedCount} data presensi`;
    } else if (type === "people") {
      // Delete with optional role filter
      const role = searchParams.get("role");
      const className = searchParams.get("className");

      const where: any = { isActive: true };
      
      if (role && role !== "ALL") {
        where.role = role;
      }
      
      if (className && className !== "ALL") {
        where.className = className;
      }

      // First delete related attendance records
      const people = await prisma.person.findMany({ where, select: { id: true } });
      const personIds = people.map((p: { id: string }) => p.id);
      
      if (personIds.length > 0) {
        await prisma.attendanceRecord.deleteMany({
          where: { personId: { in: personIds } },
        });
      }

      // Then delete people (soft delete by setting isActive to false)
      const result = await prisma.person.updateMany({
        where,
        data: { isActive: false },
      });
      deletedCount = result.count;
      details = `Menghapus ${deletedCount} data orang (soft delete)`;
    } else if (type === "activities") {
      const result = await prisma.activity.deleteMany({});
      deletedCount = result.count;
      details = `Menghapus ${deletedCount} data kegiatan`;
    } else if (type === "all") {
      // Nuclear option - delete everything
      await prisma.attendanceRecord.deleteMany({});
      await prisma.auditLog.deleteMany({});
      await prisma.person.deleteMany({});
      await prisma.activity.deleteMany({});
      await prisma.waTemplate.deleteMany({});
      await prisma.waGatewayConfig.deleteMany({});
      // Keep settings and admin accounts
      details = "Menghapus SEMUA data (kecuali pengaturan dan akun admin)";
    } else {
      return NextResponse.json({ error: "Tipe hapus tidak valid." }, { status: 400 });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "DELETE_DATA",
        target: type?.toUpperCase() || "UNKNOWN",
        details,
      },
    });

    return NextResponse.json({ success: true, message: details, deletedCount });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menghapus data." },
      { status: 500 }
    );
  }
}

// Get data counts for display
export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Super Admin only" }, { status: 403 });
    }

    const [peopleCount, attendanceCount, activitiesCount, auditLogCount, userCount] = await Promise.all([
      prisma.person.count({ where: { isActive: true } }),
      prisma.attendanceRecord.count(),
      prisma.activity.count(),
      prisma.auditLog.count(),
      prisma.admin.count(),
    ]);

    // Get date range of attendance records
    const earliestRecord = await prisma.attendanceRecord.findFirst({
      orderBy: { dateString: "asc" },
      select: { dateString: true },
    });
    const latestRecord = await prisma.attendanceRecord.findFirst({
      orderBy: { dateString: "desc" },
      select: { dateString: true },
    });

    return NextResponse.json({
      counts: {
        people: peopleCount,
        attendance: attendanceCount,
        activities: activitiesCount,
        auditLogs: auditLogCount,
        users: userCount,
      },
      dateRange: {
        earliest: earliestRecord?.dateString || null,
        latest: latestRecord?.dateString || null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memuat data." },
      { status: 500 }
    );
  }
}