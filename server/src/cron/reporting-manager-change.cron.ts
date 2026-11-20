import { prisma, rawPrisma } from "../prisma.js";
import { ReportingManagerChangeService } from "../services/reporting-manager-change.service.js";

export interface ReportingManagerCronOptions {
  tenantId?: string;
  referenceDate?: Date;
  dbOverride?: any;
}

export interface ReportingManagerCronResult {
  success: boolean;
  executedAt: string;
  tenantsEvaluated: number;
  changesEvaluated: number;
  changesApplied: number;
  failures: Array<{ transferId: string; employeeId: string; error: string }>;
}

/**
 * Daily scheduler that scans approved future-effective Reporting Manager Change requests
 * and applies them atomically when their effective date has arrived (effectiveDate <= referenceDate).
 */
export async function runReportingManagerChangeScheduler(
  options: ReportingManagerCronOptions = {}
): Promise<ReportingManagerCronResult> {
  const db = options.dbOverride || rawPrisma || prisma;
  const referenceDate = options.referenceDate || new Date();
  const startTime = new Date().toISOString();

  const result: ReportingManagerCronResult = {
    success: true,
    executedAt: startTime,
    tenantsEvaluated: 0,
    changesEvaluated: 0,
    changesApplied: 0,
    failures: [],
  };

  try {
    let tenantIds: string[] = [];
    if (options.tenantId) {
      tenantIds = [options.tenantId];
    } else {
      const tenants = await db.tenant.findMany({
        select: { id: true },
      });
      tenantIds = tenants.map((t: any) => t.id);
    }

    result.tenantsEvaluated = tenantIds.length;

    for (const tenantId of tenantIds) {
      try {
        const dueTransfers = await db.employeeTransfer.findMany({
          where: {
            tenantId,
            status: "APPROVED",
            effectiveDate: { lte: referenceDate },
            reason: { contains: "[MANAGER_CHANGE" },
          },
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, employeeCode: true },
            },
          },
        });

        result.changesEvaluated += dueTransfers.length;

        for (const transfer of dueTransfers) {
          try {
            await ReportingManagerChangeService.applyManagerChange({
              tenantId,
              actorUserId: "scheduler",
              transferId: transfer.id,
              dbOverride: db,
            });
            result.changesApplied++;
          } catch (appErr: any) {
            console.error(
              `[ReportingManagerCron] Error applying transfer #${transfer.id} for employee ${transfer.employeeId}:`,
              appErr.message
            );
            result.failures.push({
              transferId: transfer.id,
              employeeId: transfer.employeeId,
              error: appErr.message || "Unknown error applying manager change",
            });
          }
        }
      } catch (tenantErr: any) {
        console.error(`[ReportingManagerCron] Tenant evaluation error (${tenantId}):`, tenantErr.message);
      }
    }
  } catch (err: any) {
    console.error("[ReportingManagerCron] Fatal scheduler execution error:", err.message);
    result.success = false;
  }

  return result;
}

