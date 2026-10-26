"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatutoryRuleRegistryService = void 0;
const prisma_1 = require("../prisma");
class StatutoryRuleRegistryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma || prisma_1.rawPrisma;
    }
    static async resolveActiveRule(ruleType, stateCode, tenantId, effectiveDate = new Date()) {
        const service = new StatutoryRuleRegistryService();
        const result = await service.resolveApplicableRule({
            ruleType,
            stateCode: stateCode || 'ALL',
            tenantId: tenantId || undefined,
            effectiveDate,
        });
        return result ? result.rule : null;
    }
    static async listRules(params) {
        const service = new StatutoryRuleRegistryService();
        return service.listRules(params);
    }
    static async createDraftRule(input, actorEmail, actorRole, tenantId) {
        const service = new StatutoryRuleRegistryService();
        return service.createDraft({
            ...input,
            tenantId: tenantId || input.tenantId,
            actorEmail: actorEmail || input.actorEmail,
            actorRole: actorRole || input.actorRole,
        });
    }
    static async submitForReview(ruleId, actorEmail, actorRole) {
        const service = new StatutoryRuleRegistryService();
        return service.submitForReview(ruleId, actorEmail, actorRole);
    }
    async listRules(params) {
        const where = {};
        if (params.ruleType)
            where.ruleType = params.ruleType;
        if (params.stateCode) {
            if (params.stateCode === 'ALL') {
                where.stateCode = 'ALL';
            }
            else {
                where.stateCode = { in: [params.stateCode, 'ALL'] };
            }
        }
        if (params.category)
            where.category = params.category;
        if (params.publicationStatus)
            where.publicationStatus = params.publicationStatus;
        if (params.tenantId) {
            where.OR = [{ tenantId: params.tenantId }, { isGlobal: true }, { tenantId: null }];
        }
        return this.prisma.statutoryRule.findMany({
            where,
            orderBy: [{ ruleType: 'asc' }, { stateCode: 'asc' }, { version: 'desc' }],
        });
    }
    /**
     * Resolve authoritative statutory rule using strict precedence:
     * 1. Active Published Tenant-specific Override (if permitted)
     * 2. Active Published State-specific Rule
     * 3. Active Published Central / National Rule
     *
     * Validates date boundaries [effectiveFrom, effectiveTo].
     * Fails closed if multiple conflicting rules overlap ambiguously.
     */
    async resolveApplicableRule(params) {
        const { tenantId, ruleType, stateCode = 'ALL', effectiveDate, financialYear, allowTenantOverride = true, } = params;
        const normState = (stateCode || 'ALL').trim().toUpperCase();
        const queryDate = new Date(effectiveDate);
        // Common date filter using AND to prevent OR collision
        const dateConditions = [
            { isActive: true },
            { publicationStatus: 'published' },
            { effectiveFrom: { lte: queryDate } },
            {
                OR: [
                    { effectiveTo: null },
                    { effectiveTo: { gte: queryDate } },
                ],
            },
        ];
        // 1. Tier 1: Tenant-specific override (if tenantId is provided and allowed)
        if (tenantId && allowTenantOverride) {
            const tenantRules = await this.prisma.statutoryRule.findMany({
                where: {
                    AND: [
                        ...dateConditions,
                        { tenantId },
                        { ruleType },
                        {
                            OR: [
                                { stateCode: normState },
                                { stateCode: 'ALL' },
                            ],
                        },
                    ],
                },
                orderBy: [{ version: 'desc' }, { effectiveFrom: 'desc' }],
            });
            if (tenantRules.length > 0) {
                // State-matched tenant rule takes precedence over ALL-state tenant rule
                const exactStateRule = tenantRules.find((r) => r.stateCode?.toUpperCase() === normState);
                const selected = exactStateRule || tenantRules[0];
                return {
                    rule: selected,
                    resolutionSource: 'TENANT_OVERRIDE',
                    matchedState: selected.stateCode || 'ALL',
                    effectiveVersion: selected.version,
                };
            }
        }
        // 2. Tier 2: State-specific rules (State jurisdiction or specific state code)
        if (normState !== 'ALL') {
            const stateRules = await this.prisma.statutoryRule.findMany({
                where: {
                    AND: [
                        ...dateConditions,
                        { ruleType },
                        { stateCode: normState },
                        {
                            OR: [
                                { isGlobal: true },
                                { tenantId: null },
                                ...(tenantId ? [{ tenantId }] : []),
                            ],
                        },
                    ],
                },
                orderBy: [{ version: 'desc' }, { effectiveFrom: 'desc' }],
            });
            if (stateRules.length > 0) {
                // Check for ambiguous multiple published rules with exact same version and date
                if (stateRules.length > 1 && stateRules[0].version === stateRules[1].version) {
                    throw new Error(`Ambiguous overlapping statutory rule detected for ${ruleType} in state ${normState}. Manual precedence review required.`);
                }
                return {
                    rule: stateRules[0],
                    resolutionSource: 'STATE_RULE',
                    matchedState: normState,
                    effectiveVersion: stateRules[0].version,
                };
            }
        }
        // 3. Tier 3: Central / National Global Rule (stateCode === 'ALL' or jurisdictionLevel === 'CENTRAL')
        const centralRules = await this.prisma.statutoryRule.findMany({
            where: {
                AND: [
                    ...dateConditions,
                    { ruleType },
                    {
                        OR: [
                            { stateCode: 'ALL' },
                            { stateCode: null },
                            { jurisdictionLevel: 'CENTRAL' },
                        ],
                    },
                ],
            },
            orderBy: [{ version: 'desc' }, { effectiveFrom: 'desc' }],
        });
        if (centralRules.length > 0) {
            return {
                rule: centralRules[0],
                resolutionSource: 'CENTRAL_GLOBAL',
                matchedState: 'ALL',
                effectiveVersion: centralRules[0].version,
            };
        }
        // No matching active published rule found
        return null;
    }
    /**
     * Create a new draft statutory rule with strict validation
     */
    async createDraft(input) {
        const fromDate = new Date(input.effectiveFrom);
        const toDate = input.effectiveTo ? new Date(input.effectiveTo) : null;
        if (toDate && toDate < fromDate) {
            throw new Error('effectiveTo date cannot be earlier than effectiveFrom date');
        }
        // 1. Direct Tax / TDS statutory period and legal alignment validation
        if (input.category === 'DIRECT_TAX' ||
            input.ruleType.startsWith('TDS_') ||
            (input.configJson && (input.configJson.act || input.configJson.salaryWithholdingSection))) {
            const config = input.configJson || {};
            const act = config.act || config.statutoryAct;
            const fy = input.financialYear || config.financialYear || config.taxYear;
            const withholdingSec = config.salaryWithholdingSection ? String(config.salaryWithholdingSection).trim() : null;
            const rebateSec = config.rebateSection ? String(config.rebateSection).trim() : null;
            if (act && act.includes('1961')) {
                if (withholdingSec && withholdingSec !== '192') {
                    throw new Error(`Statutory mismatch: Income-tax Act, 1961 requires salary withholding under Section 192, received '${withholdingSec}'.`);
                }
                if (rebateSec && rebateSec !== '87A') {
                    throw new Error(`Statutory mismatch: Income-tax Act, 1961 requires tax rebate under Section 87A, received '${rebateSec}'.`);
                }
                if (fy && fy >= '2026-2027' && fromDate >= new Date('2026-04-01')) {
                    throw new Error(`Statutory mismatch: Income-tax Act, 1961 cannot be configured as governing law for FY ${fy} (effective from ${fromDate.toISOString().slice(0, 10)}). FY 2026-27 onward is governed by Income-tax Act, 2025.`);
                }
            }
            else if (act && act.includes('2025')) {
                if (withholdingSec && withholdingSec !== '392') {
                    throw new Error(`Statutory mismatch: Income-tax Act, 2025 requires salary withholding under Section 392, received '${withholdingSec}'.`);
                }
                if (rebateSec && rebateSec !== '156' && rebateSec !== '156(2)') {
                    throw new Error(`Statutory mismatch: Income-tax Act, 2025 requires tax rebate under Section 156 / 156(2), received '${rebateSec}'.`);
                }
                if (fromDate < new Date('2026-04-01') || (fy && fy < '2026-2027')) {
                    throw new Error(`Statutory mismatch: Income-tax Act, 2025 cannot be made effective prior to 2026-04-01 or for FY prior to 2026-2027 (received FY ${fy}, effectiveFrom ${fromDate.toISOString().slice(0, 10)}). FY 2025-26 and prior are governed by Income-tax Act, 1961.`);
                }
            }
        }
        // 2. Tenant statutory override protection: Tenant overrides cannot reduce mandatory statutory minimums
        if (input.tenantId && input.configJson) {
            const cfg = input.configJson;
            if (input.ruleType === 'EPF') {
                const empRate = cfg.employeeRate ?? cfg.employeeContributionRate;
                const emprRate = cfg.employerRate ?? cfg.employerContributionRate;
                if (empRate !== undefined && empRate < 0.12) {
                    throw new Error(`Statutory violation: Tenant override cannot reduce mandatory EPF employee contribution rate below 12% (0.12). Received: ${empRate}`);
                }
                if (emprRate !== undefined && emprRate < 0.12) {
                    throw new Error(`Statutory violation: Tenant override cannot reduce mandatory EPF employer contribution rate below 12% (0.12). Received: ${emprRate}`);
                }
            }
            else if (input.ruleType === 'ESI') {
                const empRate = cfg.employeeRate ?? cfg.employeeContributionRate;
                const emprRate = cfg.employerRate ?? cfg.employerContributionRate;
                if (empRate !== undefined && empRate < 0.0075) {
                    throw new Error(`Statutory violation: Tenant override cannot reduce mandatory ESI employee contribution rate below 0.75% (0.0075). Received: ${empRate}`);
                }
                if (emprRate !== undefined && emprRate < 0.0325) {
                    throw new Error(`Statutory violation: Tenant override cannot reduce mandatory ESI employer contribution rate below 3.25% (0.0325). Received: ${emprRate}`);
                }
            }
        }
        // Validate that the ruleIdentifier is unique within the tenant/global scope
        const existing = await this.prisma.statutoryRule.findFirst({
            where: {
                ruleIdentifier: input.ruleIdentifier,
                version: input.version || 1,
                ...(input.tenantId ? { tenantId: input.tenantId } : { isGlobal: true }),
            },
        });
        if (existing) {
            throw new Error(`Statutory rule with identifier ${input.ruleIdentifier} and version ${input.version || 1} already exists.`);
        }
        const created = await this.prisma.statutoryRule.create({
            data: {
                tenantId: input.tenantId || null,
                ruleIdentifier: input.ruleIdentifier,
                ruleType: input.ruleType,
                category: input.category,
                jurisdictionLevel: input.jurisdictionLevel,
                stateCode: input.stateCode ? input.stateCode.toUpperCase() : 'ALL',
                applicableCategory: input.applicableCategory || 'ALL',
                configJson: input.configJson,
                version: input.version || 1,
                effectiveFrom: fromDate,
                effectiveTo: toDate,
                financialYear: input.financialYear || null,
                sourceAuthority: input.sourceAuthority || null,
                notificationRef: input.notificationRef || null,
                sourceUrl: input.sourceUrl || null,
                publicationStatus: 'draft',
                isVerified: false,
                createdBy: input.actorEmail || 'compliance_admin',
                changeLog: input.changeLog || 'Draft rule initialized',
                status: 'draft',
                isActive: false,
                isGlobal: Boolean(input.isGlobal ?? !input.tenantId),
            },
        });
        // Record audit trail
        await this.prisma.statutoryRuleAuditLog.create({
            data: {
                ruleId: created.id,
                action: 'DRAFT_CREATED',
                actorEmail: input.actorEmail || 'compliance_admin',
                actorRole: input.actorRole || 'COMPLIANCE_OFFICER',
                afterState: created,
                notes: `Draft statutory rule created: ${input.ruleIdentifier} v${created.version}`,
            },
        });
        return created;
    }
    /**
     * Submit draft rule for compliance review
     */
    async submitForReview(ruleId, actorEmail, actorRole) {
        const rule = await this.prisma.statutoryRule.findUnique({ where: { id: ruleId } });
        if (!rule)
            throw new Error(`Statutory rule ${ruleId} not found`);
        if (rule.publicationStatus !== 'draft') {
            throw new Error(`Only rules in 'draft' status can be submitted for review. Current status: ${rule.publicationStatus}`);
        }
        const updated = await this.prisma.statutoryRule.update({
            where: { id: ruleId },
            data: {
                publicationStatus: 'under_review',
                reviewedBy: actorEmail,
            },
        });
        await this.prisma.statutoryRuleAuditLog.create({
            data: {
                ruleId,
                action: 'SUBMITTED_FOR_REVIEW',
                actorEmail,
                actorRole,
                beforeState: rule,
                afterState: updated,
                notes: `Statutory rule submitted for formal compliance review.`,
            },
        });
        return updated;
    }
    /**
     * Approve rule (maker-checker requirement: approver cannot be the creator)
     */
    async approveRule(ruleId, approverEmail, approverRole, enforceMakerChecker = true) {
        const rule = await this.prisma.statutoryRule.findUnique({ where: { id: ruleId } });
        if (!rule)
            throw new Error(`Statutory rule ${ruleId} not found`);
        if (rule.publicationStatus !== 'under_review') {
            throw new Error(`Rule must be in 'under_review' status to be approved. Current: ${rule.publicationStatus}`);
        }
        if (enforceMakerChecker && rule.createdBy && rule.createdBy.toLowerCase() === approverEmail.toLowerCase()) {
            throw new Error('Maker-Checker violation: Rule creator cannot be the compliance approver.');
        }
        const updated = await this.prisma.statutoryRule.update({
            where: { id: ruleId },
            data: {
                publicationStatus: 'approved',
                isVerified: true,
                verifiedBy: approverEmail,
                approvedBy: approverEmail,
                signoffDate: new Date(),
            },
        });
        await this.prisma.statutoryRuleAuditLog.create({
            data: {
                ruleId,
                action: 'APPROVED',
                actorEmail: approverEmail,
                actorRole: approverRole,
                beforeState: rule,
                afterState: updated,
                notes: `Statutory rule officially approved by ${approverEmail}`,
            },
        });
        return updated;
    }
    /**
     * Publish approved rule and activate.
     * Supersedes previous active rule for the same type and jurisdiction.
     */
    async publishRule(ruleId, publisherEmail, publisherRole) {
        const rule = await this.prisma.statutoryRule.findUnique({ where: { id: ruleId } });
        if (!rule)
            throw new Error(`Statutory rule ${ruleId} not found`);
        if (rule.publicationStatus !== 'approved') {
            throw new Error(`Only approved rules can be published. Current: ${rule.publicationStatus}`);
        }
        // Find and supersede any currently published active rule for the exact same scope
        const existingActive = await this.prisma.statutoryRule.findMany({
            where: {
                id: { not: ruleId },
                ruleType: rule.ruleType,
                stateCode: rule.stateCode,
                tenantId: rule.tenantId,
                isGlobal: rule.isGlobal,
                publicationStatus: 'published',
                isActive: true,
            },
        });
        for (const prev of existingActive) {
            await this.prisma.statutoryRule.update({
                where: { id: prev.id },
                data: {
                    publicationStatus: 'superseded',
                    isActive: false,
                    effectiveTo: prev.effectiveTo || rule.effectiveFrom,
                },
            });
            await this.prisma.statutoryRuleAuditLog.create({
                data: {
                    ruleId: prev.id,
                    action: 'SUPERSEDED',
                    actorEmail: publisherEmail,
                    actorRole: publisherRole,
                    notes: `Superseded by new published statutory rule ${rule.ruleIdentifier} v${rule.version}`,
                },
            });
        }
        const published = await this.prisma.statutoryRule.update({
            where: { id: ruleId },
            data: {
                publicationStatus: 'published',
                isActive: true,
                status: 'active',
                publishedBy: publisherEmail,
                publishedAt: new Date(),
                previousVersionId: existingActive.length > 0 ? existingActive[0].id : null,
            },
        });
        await this.prisma.statutoryRuleAuditLog.create({
            data: {
                ruleId,
                action: 'PUBLISHED',
                actorEmail: publisherEmail,
                actorRole: publisherRole,
                beforeState: rule,
                afterState: published,
                notes: `Statutory rule officially published and activated for payroll calculations.`,
            },
        });
        return published;
    }
    /**
     * Rollback a published rule to a prior version
     */
    async rollbackRule(ruleId, targetVersionId, actorEmail, actorRole) {
        const currentRule = await this.prisma.statutoryRule.findUnique({ where: { id: ruleId } });
        const targetRule = await this.prisma.statutoryRule.findUnique({ where: { id: targetVersionId } });
        if (!currentRule || !targetRule) {
            throw new Error('Current rule or target rollback rule not found.');
        }
        // Deactivate current
        await this.prisma.statutoryRule.update({
            where: { id: ruleId },
            data: {
                publicationStatus: 'archived',
                isActive: false,
            },
        });
        // Re-activate target
        const restored = await this.prisma.statutoryRule.update({
            where: { id: targetVersionId },
            data: {
                publicationStatus: 'published',
                isActive: true,
                status: 'active',
                publishedAt: new Date(),
                publishedBy: actorEmail,
            },
        });
        await this.prisma.statutoryRuleAuditLog.create({
            data: {
                ruleId: targetVersionId,
                action: 'ROLLBACK',
                actorEmail,
                actorRole,
                notes: `Rolled back from ${currentRule.ruleIdentifier} v${currentRule.version} to ${targetRule.ruleIdentifier} v${targetRule.version}`,
            },
        });
        return restored;
    }
    /**
     * Seed central and state-specific statutory rule registry with authoritative defaults
     */
    async seedAuthoritativeRegistry(seedTenantId) {
        const { OFFICIAL_STATUTORY_RULE_PACKS } = await Promise.resolve().then(() => __importStar(require('../seeds/statutory-rules.seed')));
        let count = 0;
        for (const pack of OFFICIAL_STATUTORY_RULE_PACKS) {
            const isCentral = pack.stateCode === 'ALL';
            const jurisdictionLevel = isCentral ? 'CENTRAL' : 'STATE';
            // Category derivation
            let category = 'CENTRAL_STATUTORY';
            if (pack.ruleType === 'EPF')
                category = 'RETIREMENT_PF';
            else if (pack.ruleType === 'ESI')
                category = 'SOCIAL_SECURITY_ESI';
            else if (pack.ruleType === 'PT')
                category = 'PROFESSIONAL_TAX';
            else if (pack.ruleType === 'LWF')
                category = 'LABOUR_WELFARE';
            else if (pack.ruleType.includes('TDS'))
                category = 'DIRECT_TAX';
            else if (pack.ruleType === 'GRATUITY')
                category = 'GRATUITY';
            const ruleIdentifier = `${pack.ruleType}_${pack.stateCode}_V${pack.version}`;
            const existing = await this.prisma.statutoryRule.findFirst({
                where: {
                    ruleType: pack.ruleType,
                    stateCode: pack.stateCode,
                    version: pack.version,
                    ...(seedTenantId ? { tenantId: seedTenantId } : { isGlobal: true }),
                },
            });
            if (existing) {
                await this.prisma.statutoryRule.update({
                    where: { id: existing.id },
                    data: {
                        ruleIdentifier,
                        category,
                        jurisdictionLevel,
                        configJson: pack.configJson,
                        effectiveFrom: pack.effectiveFrom,
                        effectiveTo: pack.effectiveTo,
                        sourceAuthority: pack.sourceAuthority,
                        notificationRef: pack.notificationRef,
                        publicationStatus: 'published',
                        isVerified: true,
                        isActive: true,
                        isGlobal: !seedTenantId,
                    },
                });
            }
            else {
                await this.prisma.statutoryRule.create({
                    data: {
                        tenantId: seedTenantId || null,
                        ruleIdentifier,
                        ruleType: pack.ruleType,
                        category,
                        jurisdictionLevel,
                        stateCode: pack.stateCode,
                        applicableCategory: 'ALL',
                        configJson: pack.configJson,
                        version: pack.version,
                        effectiveFrom: pack.effectiveFrom,
                        effectiveTo: pack.effectiveTo,
                        sourceAuthority: pack.sourceAuthority,
                        notificationRef: pack.notificationRef,
                        publicationStatus: 'published',
                        isVerified: true,
                        isActive: true,
                        isGlobal: !seedTenantId,
                        createdBy: 'system_compliance_seeder',
                        publishedBy: 'system_compliance_seeder',
                        publishedAt: new Date(),
                    },
                });
            }
            count++;
        }
        return { count };
    }
}
exports.StatutoryRuleRegistryService = StatutoryRuleRegistryService;
