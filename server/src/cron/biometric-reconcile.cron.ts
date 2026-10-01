/**
 * Wave 2.3 — Biometric Overnight Reconciliation Cron Worker
 * ──────────────────────────────────────────────────────────
 * Runs nightly (configured for 02:00 AM IST in index.ts).
 *
 * Responsibilities:
 *  1. Replay any pending entries in biometric_offline_buffer.
 *  2. Retry unmatched punch logs — re-attempt employee resolution after
 *     new employees may have been created during the day.
 *  3. For each tenant, compute payable days and Loss-Of-Pay (LOP) for
 *     the previous calendar month and write a summary to the console /
 *     a structured log that the payroll engine can consume.
 *
 * This worker does NOT modify payroll data directly; it only updates
 * Attendance records and cleans up punch log sync statuses.
 * The payroll engine reads Attendance records at payroll run time.
 */

import { rawPrisma as prisma } from "../prisma";
import { processBiometricPunch } from "../routes/biometric.routes";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function previousMonth(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const year  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const start = new Date(Date.UTC(year, month, 1));
  const end   = new Date(Date.UTC(year, month + 1, 1)); // exclusive upper bound
  const label = `${year}-${String(month + 1).padStart(2, "0")}`;
  return { start, end, label };
}

// ─── Step 1: Replay Offline Buffer ───────────────────────────────────────────

async function replayOfflineBuffer(): Promise<{ attempted: number; processed: number; failed: number }> {
  const pending = await prisma.biometricOfflineBuffer.findMany({
    where: { status: "pending" },
    orderBy: { punchTime: "asc" },
    take: 2000, // process at most 2000 at a time to avoid OOM
  });

  console.log(`[RECONCILE] Offline buffer: ${pending.length} pending entries`);

  let processed = 0;
  let failed    = 0;

  for (const entry of pending) {
    try {
      const punchResult = await processBiometricPunch({
        tenantId:         entry.tenantId,
        deviceId:         entry.deviceId ?? undefined,
        employeeCode:     entry.employeeCode,
        punchTime:        entry.punchTime,
        punchType:        entry.punchType,
        verificationMode: entry.verificationMode,
        rawPayload:       entry.rawPayload,
      });

      const isDuplicate = (punchResult as any)?.isDuplicate;
      await prisma.biometricOfflineBuffer.update({
        where: { id: entry.id },
        data:  { status: isDuplicate ? "duplicate" : "processed", processedAt: new Date() },
      });
      if (!isDuplicate) processed++;
    } catch (err: any) {
      const isDuplicate = err?.message?.toLowerCase().includes("duplicate") ||
                          err?.code === "P2002";
      await prisma.biometricOfflineBuffer.update({
        where: { id: entry.id },
        data: {
          status:        isDuplicate ? "duplicate" : "failed",
          failureReason: String(err?.message || err).slice(0, 500),
          processedAt:   new Date(),
        },
      });
      if (!isDuplicate) failed++;
    }
  }

  return { attempted: pending.length, processed, failed };
}

// ─── Step 2: Retry Unmatched Punch Logs ──────────────────────────────────────

async function retryUnmatchedLogs(): Promise<{ retried: number; resolved: number }> {
  const unmatched = await prisma.biometricPunchLog.findMany({
    where: { syncStatus: "unmatched_employee" },
    take:  5000,
  });

  console.log(`[RECONCILE] Unmatched punch logs: ${unmatched.length}`);
  let resolved = 0;

  for (const log of unmatched) {
    // Try all the same code variations as processBiometricPunch
    const code       = log.employeeCode;
    const stripped   = code.replace(/^0+/, "") || code;
    const candidates = [
      code,
      stripped,
      `0${stripped}`,
      `00${stripped}`,
      `EMP-${code}`,
      `EMP-${stripped}`,
      `EMP-0${stripped}`,
    ];

    const employee = await prisma.employee.findFirst({
      where: {
        tenantId: log.tenantId,
        employeeCode: { in: candidates },
      },
    });

    // Also check BiometricEmployeeMapping PIN table
    let resolvedEmployee = employee;
    if (!resolvedEmployee) {
      const mapping = await prisma.biometricEmployeeMapping.findFirst({
        where: {
          tenantId:  log.tenantId,
          deviceId:  log.deviceId,
          devicePin: code,
          isActive:  true,
        },
        include: { employee: true },
      });
      if (mapping?.employee) resolvedEmployee = mapping.employee;
    }

    if (resolvedEmployee) {
      await prisma.biometricPunchLog.update({
        where: { id: log.id },
        data:  { employeeId: resolvedEmployee.id, syncStatus: "processed" },
      });
      resolved++;
    }
  }

  return { retried: unmatched.length, resolved };
}

// ─── Step 3: Compute Payable Days / LOP for Previous Month ───────────────────

export interface LopSummaryEntry {
  tenantId:    string;
  employeeId:  string;
  month:       string;
  workingDays: number;   // Calendar working days (Mon–Sat by default)
  presentDays: number;   // Days with at least one check-in
  halfDays:    number;   // Days marked half_day
  lopDays:     number;   // Loss-of-pay = workingDays - presentDays - (halfDays * 0.5)
  leaveDays:   number;   // Approved leaves in the period
  effectivePaidDays: number;
}

async function computeLopSummary(): Promise<LopSummaryEntry[]> {
  const { start, end, label } = previousMonth();
  const tenants = await prisma.tenant.findMany({ select: { id: true } });

  const summaries: LopSummaryEntry[] = [];

  for (const tenant of tenants) {
    const employees = await prisma.employee.findMany({
      where:  { tenantId: tenant.id, status: "active" },
      select: { id: true },
    });

    for (const emp of employees) {
      // Count working days in the month (Mon–Sat = 6 days/week; adjust per policy)
      let workingDays = 0;
      const d = new Date(start);
      while (d < end) {
        const dow = d.getUTCDay(); // 0=Sun, 6=Sat
        if (dow !== 0) workingDays++; // Exclude Sunday; include Mon–Sat
        d.setUTCDate(d.getUTCDate() + 1);
      }

      // Attendance records for this employee in the month
      const attendances = await prisma.attendance.findMany({
        where: {
          tenantId:   tenant.id,
          employeeId: emp.id,
          date:       { gte: start, lt: end },
        },
        select: { status: true, checkIn: true },
      });

      const presentDays  = attendances.filter(a => a.status === "present" && a.checkIn).length;
      const halfDays     = attendances.filter(a => a.status === "half_day" && a.checkIn).length;

      // Approved leave days in the period
      const leaves = await prisma.leaveRequest.findMany({
        where: {
          tenantId:   tenant.id,
          employeeId: emp.id,
          status:     "approved",
          startDate:  { lt: end },
          endDate:    { gte: start },
        },
        select: { startDate: true, endDate: true },
      });

      // Count leave days that fall within working days of the month
      let leaveDays = 0;
      for (const leave of leaves) {
        const leaveStart = new Date(Math.max(leave.startDate.getTime(), start.getTime()));
        const leaveEnd   = new Date(Math.min(leave.endDate.getTime(),   end.getTime()));
        const ld = new Date(leaveStart);
        while (ld <= leaveEnd) {
          if (ld.getUTCDay() !== 0) leaveDays++; // Mon–Sat leave days
          ld.setUTCDate(ld.getUTCDate() + 1);
        }
      }

      // LOP = working days − present days − 0.5 × half-days − leave days
      const effectivePresentDays = presentDays + halfDays * 0.5 + leaveDays;
      const lopDays = Math.max(0, workingDays - effectivePresentDays);

      summaries.push({
        tenantId:  tenant.id,
        employeeId: emp.id,
        month:     label,
        workingDays,
        presentDays,
        halfDays,
        lopDays,
        leaveDays,
        effectivePaidDays: Math.min(workingDays, effectivePresentDays),
      });
    }
  }

  return summaries;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function runBiometricReconciliation(): Promise<void> {
  const ts = new Date().toISOString();
  console.log(`\n[RECONCILE] ════════════════════════════════════════`);
  console.log(`[RECONCILE] Starting nightly biometric reconciliation`);
  console.log(`[RECONCILE] Timestamp: ${ts}`);

  try {
    // 1. Replay offline buffer
    const bufferResult = await replayOfflineBuffer();
    console.log(`[RECONCILE] Offline buffer — attempted: ${bufferResult.attempted}, processed: ${bufferResult.processed}, failed: ${bufferResult.failed}`);

    // 2. Retry unmatched punch logs
    const retryResult = await retryUnmatchedLogs();
    console.log(`[RECONCILE] Unmatched retry — retried: ${retryResult.retried}, resolved: ${retryResult.resolved}`);

    // 3. Compute LOP summary for last month
    const summaries = await computeLopSummary();
    const totalLop  = summaries.reduce((acc, s) => acc + s.lopDays, 0);
    console.log(`[RECONCILE] LOP computation — employees processed: ${summaries.length}, total LOP days: ${totalLop}`);

    // Log a sample of non-zero LOP entries for visibility
    const nonZeroLop = summaries.filter(s => s.lopDays > 0);
    if (nonZeroLop.length > 0) {
      console.log(`[RECONCILE] Employees with LOP: ${nonZeroLop.length}`);
      for (const s of nonZeroLop.slice(0, 10)) {
        console.log(`  [RECONCILE] → emp=${s.employeeId} month=${s.month} working=${s.workingDays} present=${s.presentDays} lop=${s.lopDays}`);
      }
    }

    console.log(`[RECONCILE] Nightly reconciliation completed successfully`);
    console.log(`[RECONCILE] ════════════════════════════════════════\n`);
  } catch (err) {
    console.error("[RECONCILE] FATAL: Nightly reconciliation failed:", err);
  }
}
