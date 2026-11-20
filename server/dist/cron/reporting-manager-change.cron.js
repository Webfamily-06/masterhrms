"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runReportingManagerChangeScheduler = runReportingManagerChangeScheduler;
const prisma_js_1 = require("../prisma.js");
const reporting_manager_change_service_js_1 = require("../services/reporting-manager-change.service.js");
/**
 * Daily scheduler that scans approved future-effective Reporting Manager Change requests
 * and applies them atomically when their effective date has arrived (effectiveDate <= referenceDate).
 */
async function runReportingManagerChangeScheduler(options = {}) {
    const db = options.dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
    const referenceDate = options.referenceDate || new Date();
    const startTime = new Date().toISOString();
    const result = {
        success: true,
        executedAt: startTime,
        tenantsEvaluated: 0,
        changesEvaluated: 0,
        changesApplied: 0,
        failures: [],
    };
    try {
        let tenantIds = [];
        if (options.tenantId) {
            tenantIds = [options.tenantId];
        }
        else {
            const tenants = await db.tenant.findMany({
                select: { id: true },
            });
            tenantIds = tenants.map((t) => t.id);
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
                        await reporting_manager_change_service_js_1.ReportingManagerChangeService.applyManagerChange({
                            tenantId,
                            actorUserId: "scheduler",
                            transferId: transfer.id,
                            dbOverride: db,
                        });
                        result.changesApplied++;
                    }
                    catch (appErr) {
                        console.error(`[ReportingManagerCron] Error applying transfer #${transfer.id} for employee ${transfer.employeeId}:`, appErr.message);
                        result.failures.push({
                            transferId: transfer.id,
                            employeeId: transfer.employeeId,
                            error: appErr.message || "Unknown error applying manager change",
                        });
                    }
                }
            }
            catch (tenantErr) {
                console.error(`[ReportingManagerCron] Tenant evaluation error (${tenantId}):`, tenantErr.message);
            }
        }
    }
    catch (err) {
        console.error("[ReportingManagerCron] Fatal scheduler execution error:", err.message);
        result.success = false;
    }
    return result;
}
