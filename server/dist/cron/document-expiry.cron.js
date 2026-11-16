"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDocumentExpiryCron = runDocumentExpiryCron;
const prisma_js_1 = require("../prisma.js");
const document_expiry_service_js_1 = require("../services/document-expiry.service.js");
/**
 * Platform-wide or tenant-scoped Document Expiry & Compliance Monitoring Cron.
 * Scans active employee documents, transitions past-due documents to 'expired',
 * and idempotently dispatches automated reminders at 30-day, 15-day, 7-day, and expired milestones.
 */
async function runDocumentExpiryCron(options = {}) {
    const db = options.dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
    const referenceDate = options.referenceDate || new Date();
    const startTime = new Date().toISOString();
    const result = {
        success: true,
        executedAt: startTime,
        tenantsEvaluated: 0,
        documentsChecked: 0,
        documentsExpired: 0,
        notificationsDispatched: 0,
        alreadyProcessedCount: 0,
        errors: [],
    };
    try {
        // 1. Identify target tenants
        let tenantIds = [];
        if (options.tenantId) {
            tenantIds = [options.tenantId];
        }
        else {
            const tenants = await db.tenant.findMany({
                where: {
                    // Process all non-suspended tenants
                    status: { notIn: ["suspended", "archived"] },
                },
                select: { id: true },
            });
            tenantIds = tenants.map((t) => t.id);
        }
        result.tenantsEvaluated = tenantIds.length;
        // 2. Iterate each tenant
        for (const tenantId of tenantIds) {
            try {
                // Find all documents with expiryDate not superseded/rejected
                const candidateDocs = await db.companyDocument.findMany({
                    where: {
                        tenantId,
                        expiryDate: { not: null },
                        status: { notIn: ["superseded", "rejected"] },
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
                result.documentsChecked += candidateDocs.length;
                for (const doc of candidateDocs) {
                    try {
                        const classification = document_expiry_service_js_1.DocumentExpiryService.classifyDocument(doc, referenceDate);
                        // A. Auto-transition to 'expired' if past due and not marked as expired yet
                        if (classification.isExpired && doc.status !== "expired") {
                            await db.companyDocument.update({
                                where: { id: doc.id },
                                data: {
                                    status: "expired",
                                },
                            });
                            result.documentsExpired++;
                        }
                        // B. Determine milestone notification stage
                        let milestoneStage = null;
                        if (classification.isExpired) {
                            milestoneStage = "expired";
                        }
                        else if (classification.daysRemaining !== null) {
                            if (classification.daysRemaining <= 7 && classification.daysRemaining >= 0) {
                                milestoneStage = "7_days";
                            }
                            else if (classification.daysRemaining <= 15 && classification.daysRemaining > 7) {
                                milestoneStage = "15_days";
                            }
                            else if (classification.daysRemaining <= 30 && classification.daysRemaining > 15) {
                                milestoneStage = "30_days";
                            }
                        }
                        // C. Dispatch notification idempotently if matching milestone
                        if (milestoneStage && classification.daysRemaining !== null) {
                            const dispatchRes = await document_expiry_service_js_1.DocumentExpiryService.dispatchExpiryNotification({
                                tenantId,
                                document: doc,
                                stage: milestoneStage,
                                daysRemaining: classification.daysRemaining,
                                dbOverride: db,
                            });
                            if (dispatchRes.dispatched) {
                                result.notificationsDispatched++;
                            }
                            else if (dispatchRes.alreadyProcessed) {
                                result.alreadyProcessedCount++;
                            }
                        }
                    }
                    catch (docErr) {
                        result.errors.push({
                            tenantId,
                            documentId: doc.id,
                            error: docErr.message,
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
