"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runProbationContractExpiryCron = runProbationContractExpiryCron;
const prisma_js_1 = require("../prisma.js");
const probation_service_js_1 = require("../services/probation.service.js");
const contract_lifecycle_service_js_1 = require("../services/contract-lifecycle.service.js");
/**
 * Platform-wide or tenant-scoped Probation Review & Contract Expiry Daily Scheduler.
 * Evaluates active employee probations and contracts, identifies milestones (30d, 15d, 7d, today, overdue),
 * transitions past-due contracts, and dispatches deduplicated alerts.
 */
async function runProbationContractExpiryCron(options = {}) {
    const db = options.dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
    const referenceDate = options.referenceDate || new Date();
    const startTime = new Date().toISOString();
    const result = {
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
        let tenantIds = [];
        if (options.tenantId) {
            tenantIds = [options.tenantId];
        }
        else {
            const tenants = await db.tenant.findMany({
                where: {
                    status: { notIn: ["suspended", "archived"] },
                },
                select: { id: true },
            });
            tenantIds = tenants.map((t) => t.id);
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
                        const cls = probation_service_js_1.ProbationService.classifyProbation(prob, referenceDate);
                        if (cls.stage && cls.stage !== "none") {
                            const dispatchRes = await probation_service_js_1.ProbationService.dispatchProbationNotification({
                                tenantId,
                                record: prob,
                                stage: cls.stage,
                                daysRemaining: cls.daysRemaining,
                                dbOverride: db,
                            });
                            if (dispatchRes.dispatched) {
                                result.probationRemindersDispatched++;
                            }
                            else if (dispatchRes.alreadyProcessed) {
                                result.alreadyProcessedCount++;
                            }
                        }
                    }
                    catch (probErr) {
                        result.errors.push({
                            tenantId,
                            error: `Probation ${prob.id}: ${probErr.message}`,
                        });
                    }
                }
                // ── 2. CONTRACT EXPIRY MONITORING & REMINDERS ───────────────────
                const settings = await contract_lifecycle_service_js_1.ContractLifecycleService.getTenantExpirySettings(tenantId, db);
                const candidateContracts = await db.employeeContract.findMany({
                    where: {
                        tenantId,
                        endDate: { not: null },
                        status: { notIn: ["renewed", "superseded", "terminated", "converted"] },
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
                        const cls = contract_lifecycle_service_js_1.ContractLifecycleService.classifyContract(contract, referenceDate, settings.reminderIntervals);
                        // Auto-transition past due contracts to 'expired'
                        if (cls.isExpired && contract.status !== "expired") {
                            await db.employeeContract.update({
                                where: { id: contract.id },
                                data: { status: "expired" },
                            });
                            result.contractsExpired++;
                        }
                        if (cls.stage && cls.stage !== "none") {
                            const dispatchRes = await contract_lifecycle_service_js_1.ContractLifecycleService.dispatchContractNotification({
                                tenantId,
                                contract,
                                stage: cls.stage,
                                daysRemaining: cls.daysRemaining || 0,
                                dbOverride: db,
                                settings,
                            });
                            if (dispatchRes.dispatched) {
                                result.contractRemindersDispatched++;
                            }
                            else if (dispatchRes.alreadyProcessed) {
                                result.alreadyProcessedCount++;
                            }
                        }
                    }
                    catch (cntErr) {
                        result.errors.push({
                            tenantId,
                            error: `Contract ${contract.id}: ${cntErr.message}`,
                        });
                    }
                }
            }
            catch (tenantErr) {
                result.errors.push({
                    tenantId,
                    error: tenantErr.message,
                });
            }
        }
    }
    catch (err) {
        result.success = false;
        result.errors.push({ error: err.message });
    }
    return result;
}
