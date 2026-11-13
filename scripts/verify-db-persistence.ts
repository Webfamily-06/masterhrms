import { PrismaClient } from "@prisma/client";
import { generateToken } from "../server/src/lib/jwt";

const prisma = new PrismaClient();

async function main() {
  console.log("=== VERIFYING DATABASE PERSISTENCE ===");
  const user = await prisma.user.findFirst({
    where: { profile: { tenantId: { not: null } } },
    include: { profile: true, roles: true },
  });
  if (!user || !user.profile?.tenantId) throw new Error("No user found");

  const tenantId = user.profile.tenantId;

  // Ensure active session
  let session = await prisma.deviceSession.findFirst({
    where: { userId: user.id, revoked: false, expiresAt: { gt: new Date() } },
  });
  if (!session) {
    session = await prisma.deviceSession.create({
      data: {
        userId: user.id,
        tenantId,
        deviceType: "desktop",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revoked: false,
      },
    });
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    tenantId,
    roles: user.roles.map((r) => r.role),
    sessionId: session.id,
  });

  // Get active employees for this tenant
  const emps = await prisma.employee.findMany({
    where: { tenantId, status: "active" },
    take: 3,
  });
  if (emps.length === 0) throw new Error("No active employees in tenant");

  console.log(`Testing with ${emps.length} employees: ${emps.map((e) => e.employeeCode).join(", ")}`);

  // 1. Single Record Adjustment (POST /api/v1/hr/attendance/records)
  const singleDate = "2026-11-04";
  console.log(`1. Testing single record adjustment for employee ${emps[0].employeeCode} on ${singleDate}...`);
  const singleRes = await fetch("http://localhost:4000/api/v1/hr/attendance/records", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      employeeId: emps[0].id,
      date: singleDate,
      checkIn: "2026-11-04T09:15:00.000Z",
      checkOut: "2026-11-04T18:45:00.000Z",
      status: "present",
      hours: 9.5,
      notes: "Empirical verification: Single manual punch correction",
    }),
  });

  console.log("Single Adjustment HTTP Status:", singleRes.status);
  const singleData = await singleRes.json();
  console.log("Single Adjustment Response:", singleData.id, singleData.status, singleData.hours);

  // Verify in PostgreSQL via Prisma
  const dbSingle = await prisma.attendance.findUnique({
    where: {
      tenantId_employeeId_date: {
        tenantId,
        employeeId: emps[0].id,
        date: new Date(Date.UTC(2026, 10, 4)),
      },
    },
  });
  console.log("DB Verified Single Record:", {
    id: dbSingle?.id,
    hours: dbSingle?.hours?.toString(),
    status: dbSingle?.status,
    notes: dbSingle?.notes,
    source: dbSingle?.source,
  });

  // 2. Bulk Attendance Entry (POST /api/v1/hr/attendance/records/bulk)
  const bulkDate = "2026-11-05";
  console.log(`2. Testing bulk attendance entry for ${emps.length} employees on ${bulkDate}...`);
  const bulkRes = await fetch("http://localhost:4000/api/v1/hr/attendance/records/bulk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      employeeIds: emps.map((e) => e.id),
      date: bulkDate,
      checkIn: "09:30",
      checkOut: "18:30",
      status: "present",
      breakMinutes: 60,
      hours: 8,
      notes: "Empirical verification: Bulk project punch",
      overwriteExisting: true,
    }),
  });

  console.log("Bulk Entry HTTP Status:", bulkRes.status);
  const bulkData = await bulkRes.json();
  console.log("Bulk Entry Result:", {
    success: bulkData.success,
    totalRequested: bulkData.totalRequested,
    succeeded: bulkData.succeeded,
    skipped: bulkData.skipped,
  });

  // Verify all in PostgreSQL
  const dbBulk = await prisma.attendance.findMany({
    where: {
      tenantId,
      date: new Date(Date.UTC(2026, 10, 5)),
      employeeId: { in: emps.map((e) => e.id) },
    },
  });
  console.log(`DB Verified Bulk Records: ${dbBulk.length} records found in database.`);
  for (const b of dbBulk) {
    console.log(` - Employee ${b.employeeId}: status=${b.status}, hours=${b.hours}, notes=${b.notes}`);
  }

  // 3. Matrix Endpoint Verification
  console.log("3. Testing updated matrix response for November 2026...");
  const matrixRes = await fetch("http://localhost:4000/api/v1/hr/attendance/matrix?year=2026&month=11", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const matrixJson = await matrixRes.json();
  console.log("Matrix Status:", matrixRes.status);
  console.log("Matrix Working Days:", matrixJson.totalWorkingDays);
  console.log("Matrix Employee Count:", matrixJson.matrix?.length);
  const targetRow = matrixJson.matrix?.find((r: any) => r.employee.id === emps[0].id);
  if (targetRow) {
    console.log(`Target Employee (${targetRow.employee.name}) Score:`, targetRow.summary.attendanceScore);
    const day4 = targetRow.days?.find((d: any) => d.day === 4);
    const day5 = targetRow.days?.find((d: any) => d.day === 5);
    console.log(" Day 4 (Single adjust):", day4?.statusCode, day4?.displayLabel, day4?.hours);
    console.log(" Day 5 (Bulk adjust):", day5?.statusCode, day5?.displayLabel, day5?.hours);
  }

  console.log("=== DATABASE PERSISTENCE VERIFICATION COMPLETE ===");
}

main().finally(() => prisma.$disconnect());

