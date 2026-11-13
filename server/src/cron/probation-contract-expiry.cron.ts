import { prisma, rawPrisma } from "../prisma.js";
import { ProbationService } from "../services/probation.service.js";
import { ContractLifecycleService } from "../services/contract-lifecycle.service.js";

export interface ProbationContractCronOptions {
  tenantId?: string;
  referenceDate?: Date;
  dbOverride?: any;
}

export interface ProbationContractCronResult {
  success: boolean;
  executedAt: string;
  tenantsEvaluated: number;
  probationsChecked: number;
  probationRemindersDispatched: number;
  contractsChecked: number;
  contractsExpired: number;
  contractRemindersDispatched: number;
  alreadyProcessedCount: number;
  errors: Array<{ tenantId?: string; error: string }>;
}

/**
 * Platform-wide or tenant-scoped Probation Review & Contract Expiry Daily Scheduler.
 * Evaluates active employee probations and contracts, identifies milestones (30d, 15d, 7d, today, overdue),
 * transitions past-due contracts, and dispatches deduplicated alerts.
 */
export async function runProbationContractExpiryCron(
  options: ProbationContractCronOptions = {}
): Promise<ProbationContractCronResult> {
  const db = options.dbOverride || rawPrisma || prisma;
  const referenceDate = options.referenceDate || new Date();
  const startTime = new Date().toISOString();

  const result: ProbationContractCronResult = {
    success: true,
    executedAt: startTime,
    tenantsEvaluated: 0,
    probationsChecked: 0,
    probationRemindersDispatched: 0,
    contractsChecked: 0,
    contractsExpired: 0,
    contractRemindersDispatched: 0,
    alreadyProcessedCount: 0,
    errors: [],
  };

  try {
    let tenantIds: string[] = [];
    if (options.tenantId) {
      tenantIds = [options.tenantId];
    } else {
      const tenants = await db.tenant.findMany({
        where: {
          status: { notIn: ["suspended", "archived"] },
        },
        select: { id: true },
      });
      tenantIds = tenants.map((t: any) => t.id);
    }

    result.tenantsEvaluated = tenantIds.length;

    for (const tenantId of tenantIds) {
      try {
        // ── 1. PROBATION MONITORING & REMINDERS ─────────────────────────
        const candidateProbations = await db.probationRecord.findMany({
          where: {
            tenantId,
            status: { notIn: ["confirmed", "cancelled"] },
          },
          include: {
            employee: {
              select: {
                id: true,
                userId: true,
                firstName: true,
                lastName: true,
                managerId: true,
                manager: { select: { id: true, userId: true } },
              },
            },
          },
        });

        result.probationsChecked += candidateProbations.length;

        for (const prob of candidateProbations) {
          try {
            const cls = ProbationService.classifyProbation(prob, referenceDate);

            if (cls.stage && cls.stage !== "none") {
              const dispatchRes = await ProbationService.dispatchProbationNotification({
                tenantId,
                record: prob,
                stage: cls.stage,
                daysRemaining: cls.daysRemaining,
                dbOverride: db,
              });

              if (dispatchRes.dispatched) {
                result.probationRemindersDispatched++;
              } else if (dispatchRes.alreadyProcessed) {
                result.alreadyProcessedCount++;
              }
            }
          } catch (probErr: any) {
            result.errors.push({
              tenantId,
              error: `Probation ${prob.id}: ${probErr.message}`,
            });
          }
        }

        // ── 2. CONTRACT EXPIRY MONITORING & REMINDERS ───────────────────
        const candidateContracts = await db.employeeContract.findMany({
          where: {
            tenantId,
            endDate: { not: null },
            status: { notIn: ["renewed", "superseded", "terminated"] },
          },
          include: {
            employee: {
              select: {
                id: true,
                userId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        result.contractsChecked += candidateContracts.length;

        for (const contract of candidateContracts) {
          try {
            const cls = ContractLifecycleService.classifyContract(contract, referenceDate);

            // Auto-transition past due contracts to 'expired'
            if (cls.isExpired && contract.status !== "expired") {
              await db.employeeContract.update({
                where: { id: contract.id },
                data: { status: "expired" },
              });
              result.contractsExpired++;
            }

            if (cls.stage && cls.stage !== "none") {
              const dispatchRes = await ContractLifecycleService.dispatchContractNotification({
                tenantId,
                contract,
                stage: cls.stage,
                daysRemaining: cls.daysRemaining || 0,
                dbOverride: db,
              });

              if (dispatchRes.dispatched) {
                result.contractRemindersDispatched++;
              } else if (dispatchRes.alreadyProcessed) {
                result.alreadyProcessedCount++;
              }
            }
          } catch (cntErr: any) {
            result.errors.push({
              tenantId,
              error: `Contract ${contract.id}: ${cntErr.message}`,
            });
          }
        }
      } catch (tenantErr: any) {
        result.errors.push({
          tenantId,
          error: tenantErr.message,
        });
      }
    }
  } catch (err: any) {
    result.success = false;
    result.errors.push({ error: err.message });
  }

  return result;
}

