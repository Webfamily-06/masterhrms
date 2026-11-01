"use strict";
/**
 * MASTERHRMS — Phase F6 Data Loss Prevention (DLP) Engine
 *
 * Inspects document text against PII rules (Credit Card Luhn check, SSN, Email, Phone)
 * and custom regex/keyword policies with masked/redacted evidence logging.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DlpEngineService = void 0;
const prisma_1 = require("../../prisma");
const document_preview_service_1 = require("../files/document-preview.service");
const prisma = prisma_1.rawPrisma || prisma_1.prisma;
class DlpEngineService {
    /**
     * Luhn Algorithm Check for Credit Card Number Validation
     */
    static isValidLuhn(digitsOnly) {
        if (!digitsOnly || digitsOnly.length < 13 || digitsOnly.length > 19)
            return false;
        let sum = 0;
        let alternate = false;
        for (let i = digitsOnly.length - 1; i >= 0; i--) {
            let n = parseInt(digitsOnly.charAt(i), 10);
            if (alternate) {
                n *= 2;
                if (n > 9)
                    n -= 9;
            }
            sum += n;
            alternate = !alternate;
        }
        return sum % 10 === 0;
    }
    /**
     * Redact sensitive pattern evidence for compliance audit logging.
     */
    static redactValue(type, value) {
        const clean = value.trim();
        if (type === "PII_CREDIT_CARD") {
            const digits = clean.replace(/\D/g, "");
            const last4 = digits.slice(-4);
            return `****-****-****-${last4}`;
        }
        if (type === "PII_SSN") {
            const last4 = clean.slice(-4);
            return `***-**-${last4}`;
        }
        if (type === "PII_EMAIL") {
            const [user, domain] = clean.split("@");
            const maskedUser = (user || "").slice(0, 1) + "***";
            return `${maskedUser}@${domain || "masked.com"}`;
        }
        if (type === "PII_PHONE") {
            const digits = clean.replace(/\D/g, "");
            const last4 = digits.slice(-4);
            return `***-***-${last4}`;
        }
        // Default custom keyword redaction
        if (clean.length <= 4)
            return "****";
        return clean.slice(0, 2) + "*".repeat(clean.length - 4) + clean.slice(-2);
    }
    /**
     * Inspect extracted document text against tenant DLP policies.
     */
    static async inspectContent(tenantId, fileId, textContent) {
        let policies = await prisma.dlpPolicy.findMany({
            where: { tenantId, isEnabled: true },
        });
        if (policies.length === 0) {
            // Auto-provision default baseline tenant DLP policies
            const defaultPols = [
                {
                    name: "Credit Card Protection",
                    description: "Detects Visa, Mastercard, AMEX numbers using Luhn check",
                    policyType: "PII_CREDIT_CARD",
                    severity: "CRITICAL",
                    action: "BLOCK",
                },
                {
                    name: "Tax & National ID Protection",
                    description: "Detects standard SSN / National Tax Identifier formats",
                    policyType: "PII_SSN",
                    severity: "HIGH",
                    action: "WARN",
                },
            ];
            for (const p of defaultPols) {
                const created = await prisma.dlpPolicy.create({
                    data: {
                        tenantId,
                        name: p.name,
                        description: p.description,
                        policyType: p.policyType,
                        severity: p.severity,
                        action: p.action,
                        isEnabled: true,
                        createdBy: "system",
                    },
                });
                policies.push(created);
            }
        }
        const findings = [];
        let highestAction = "NONE";
        const actionPriority = {
            NONE: 0,
            LOG: 1,
            WARN: 2,
            BLOCK: 3,
            QUARANTINE: 4,
        };
        const lines = textContent.split(/\r?\n/);
        for (const policy of policies) {
            if (policy.policyType === "PII_CREDIT_CARD") {
                // Regex matches 13-16 digits formatted or unformatted
                const ccRegex = /\b(?:\d{4}[ -]?){3}\d{1,4}\b/g;
                lines.forEach((line, lineIdx) => {
                    let match;
                    while ((match = ccRegex.exec(line)) !== null) {
                        const rawDigits = match[0].replace(/\D/g, "");
                        if (this.isValidLuhn(rawDigits)) {
                            findings.push({
                                policyId: policy.id,
                                policyName: policy.name,
                                findingType: "PII_CREDIT_CARD",
                                severity: policy.severity,
                                actionTaken: policy.action,
                                redactedMatch: this.redactValue("PII_CREDIT_CARD", match[0]),
                                location: `Line ${lineIdx + 1}, Col ${match.index + 1}`,
                            });
                            if (actionPriority[policy.action] > actionPriority[highestAction]) {
                                highestAction = policy.action;
                            }
                        }
                    }
                });
            }
            else if (policy.policyType === "PII_SSN") {
                const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
                lines.forEach((line, lineIdx) => {
                    let match;
                    while ((match = ssnRegex.exec(line)) !== null) {
                        findings.push({
                            policyId: policy.id,
                            policyName: policy.name,
                            findingType: "PII_SSN",
                            severity: policy.severity,
                            actionTaken: policy.action,
                            redactedMatch: this.redactValue("PII_SSN", match[0]),
                            location: `Line ${lineIdx + 1}, Col ${match.index + 1}`,
                        });
                        if (actionPriority[policy.action] > actionPriority[highestAction]) {
                            highestAction = policy.action;
                        }
                    }
                });
            }
            else if (policy.pattern) {
                // Generic regex or keyword match
                try {
                    const customRegex = new RegExp(policy.pattern, "gi");
                    lines.forEach((line, lineIdx) => {
                        let match;
                        while ((match = customRegex.exec(line)) !== null) {
                            findings.push({
                                policyId: policy.id,
                                policyName: policy.name,
                                findingType: policy.policyType,
                                severity: policy.severity,
                                actionTaken: policy.action,
                                redactedMatch: this.redactValue(policy.policyType, match[0]),
                                location: `Line ${lineIdx + 1}, Col ${match.index + 1}`,
                            });
                            if (actionPriority[policy.action] > actionPriority[highestAction]) {
                                highestAction = policy.action;
                            }
                        }
                    });
                }
                catch (regErr) {
                    console.warn(`[DlpEngine] Invalid pattern in policy ${policy.id}:`, policy.pattern);
                }
            }
        }
        // Persist findings in database
        if (findings.length > 0) {
            for (const finding of findings) {
                await prisma.dlpFinding.create({
                    data: {
                        tenantId,
                        fileId,
                        policyId: finding.policyId,
                        findingType: finding.findingType,
                        severity: finding.severity,
                        status: "OPEN",
                        redactedMatch: finding.redactedMatch,
                        location: finding.location,
                        actionTaken: finding.actionTaken,
                    },
                });
            }
            // If highest action is QUARANTINE, quarantine the file
            if (highestAction === "QUARANTINE") {
                await prisma.mediaFile.update({
                    where: { id: fileId },
                    data: {
                        scanStatus: "QUARANTINED",
                        quarantinedAt: new Date(),
                        quarantineReason: `DLP Violation: Sensitive confidential data detected (${findings[0].findingType})`,
                    },
                });
            }
        }
        return {
            hasViolations: findings.length > 0,
            findings,
            highestAction: highestAction,
        };
    }
    /**
     * Scan file for DLP violations by extracting readable text.
     */
    static async scanFile(tenantId, fileId) {
        const file = await prisma.mediaFile.findFirst({
            where: { id: fileId, tenantId },
        });
        if (!file) {
            throw new Error("File not found for DLP scan.");
        }
        const buffer = await document_preview_service_1.DocumentPreviewService.getFileBuffer(file);
        if (!buffer) {
            return { hasViolations: false, findings: [], highestAction: "NONE" };
        }
        const text = buffer.toString("utf-8");
        return this.inspectContent(tenantId, fileId, text);
    }
    /**
     * List DLP Policies for tenant.
     */
    static async listPolicies(tenantId) {
        return prisma.dlpPolicy.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
        });
    }
    /**
     * Create new DLP Policy.
     */
    static async createPolicy(tenantId, userId, data) {
        return prisma.dlpPolicy.create({
            data: {
                tenantId,
                name: data.name,
                description: data.description,
                policyType: data.policyType,
                pattern: data.pattern,
                severity: data.severity || "HIGH",
                action: data.action || "BLOCK",
                isEnabled: true,
                createdBy: userId,
            },
        });
    }
    /**
     * Update DLP Policy.
     */
    static async updatePolicy(tenantId, policyId, data) {
        return prisma.dlpPolicy.update({
            where: { id: policyId, tenantId },
            data,
        });
    }
    /**
     * Delete DLP Policy.
     */
    static async deletePolicy(tenantId, policyId) {
        return prisma.dlpPolicy.delete({
            where: { id: policyId, tenantId },
        });
    }
    /**
     * List DLP Findings for review.
     */
    static async listFindings(tenantId, status) {
        const where = { tenantId };
        if (status)
            where.status = status;
        return prisma.dlpFinding.findMany({
            where,
            include: {
                file: {
                    select: { id: true, fileName: true, mimeType: true, fileSize: true },
                },
                policy: {
                    select: { id: true, name: true, severity: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    /**
     * SecOps Review finding (resolve, mark false positive).
     */
    static async reviewFinding(tenantId, findingId, userId, data) {
        return prisma.dlpFinding.update({
            where: { id: findingId, tenantId },
            data: {
                status: data.status,
                reviewedBy: userId,
                reviewedAt: new Date(),
                reviewNotes: data.reviewNotes,
            },
        });
    }
}
exports.DlpEngineService = DlpEngineService;
