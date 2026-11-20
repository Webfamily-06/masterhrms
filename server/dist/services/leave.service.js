"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveService = exports.LeaveHttpError = void 0;
const prisma_1 = require("../prisma");
const audit_service_1 = require("./audit.service");
const outbox_service_1 = require("./outbox.service");
const notification_service_1 = require("./notification.service");
const attendance_service_1 = require("./attendance.service");
const socket_1 = require("../socket");
const sandwich_leave_service_1 = require("./sandwich-leave.service");
class LeaveHttpError extends Error {
    status;
    code;
    details;
    constructor(message, status = 400, code, details) {
        super(message);
        this.name = "LeaveHttpError";
        this.status = status;
        this.code = code;
        this.details = details;
    }
}
exports.LeaveHttpError = LeaveHttpError;
class LeaveService {
    static ELEVATED_HR_ROLES = [
        "super_admin",
        "admin",
        "hr_admin",
        "hr_manager",
        "HR Manager",
        "Workspace Admin",
        "tenant_admin",
    ];
    static isElevatedHrUser(roles) {
        if (!Array.isArray(roles))
            return false;
        return roles.some((r) => this.ELEVATED_HR_ROLES.includes(r));
    }
    /**
     * Parses extended policy rule metadata stored non-destructively in `LeavePolicy.blackoutDates`
     * when formatted as JSON (`{"minDays": 1, "halfDayAllowed": true, "blackout": [...]}`),
     * while remaining 100% compatible with plain comma-separated date strings or null values.
     */
    static parsePolicyRules(policy, leaveType) {
        const defaultHalfDay = leaveType?.halfDayAllowed !== undefined ? Boolean(leaveType.halfDayAllowed) : true;
        let minDays = defaultHalfDay ? 0.5 : 1;
        let halfDayAllowed = defaultHalfDay;
        let blackoutDatesList = [];
        const raw = policy?.blackoutDates;
        if (typeof raw === "string" && raw.trim().length > 0) {
            const trimmed = raw.trim();
            if (trimmed.startsWith("{")) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (typeof parsed.halfDayAllowed === "boolean") {
                        halfDayAllowed = parsed.halfDayAllowed && (leaveType ? Boolean(leaveType.halfDayAllowed) : true);
                    }
                    if (parsed.minDays !== undefined && parsed.minDays !== null && !Number.isNaN(Number(parsed.minDays))) {
                        minDays = Math.max(0.5, Number(parsed.minDays));
                    }
                    else {
                        minDays = halfDayAllowed ? 0.5 : 1;
                    }
                    if (Array.isArray(parsed.blackout)) {
                        blackoutDatesList = parsed.blackout.map(String).filter(Boolean);
                    }
                }
                catch {
                    blackoutDatesList = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
                }
            }
            else {
                blackoutDatesList = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
            }
        }
        return {
            minDays,
            halfDayAllowed,
            blackoutDatesList,
        };
    }
    static serializePolicyRules(input, existingBlackoutDates, leaveType) {
        const prev = this.parsePolicyRules({ blackoutDates: existingBlackoutDates }, leaveType);
        const halfDayAllowed = input.halfDayAllowed !== undefined ? Boolean(input.halfDayAllowed) : prev.halfDayAllowed;
        const minDays = input.minDays !== undefined && input.minDays !== "" && !Number.isNaN(Number(input.minDays))
            ? Math.max(0.5, Number(input.minDays))
            : prev.minDays;
        let blackout = prev.blackoutDatesList;
        if (Array.isArray(input.blackoutDates)) {
            blackout = input.blackoutDates.map(String).filter(Boolean);
        }
        else if (typeof input.blackoutDates === "string") {
            const t = input.blackoutDates.trim();
            if (!t) {
                blackout = [];
            }
            else if (!t.startsWith("{")) {
                blackout = t.split(",").map((s) => s.trim()).filter(Boolean);
            }
        }
        else if (input.blackoutDates === null) {
            blackout = [];
        }
        return JSON.stringify({
            minDays,
            halfDayAllowed,
            ...(blackout.length > 0 ? { blackout } : {}),
        });
    }
    static enrichPolicy(policy) {
        if (!policy)
            return null;
        const rules = this.parsePolicyRules(policy, policy.leaveType);
        const carryForwardDays = policy.carryForwardEnabled ? Number(policy.maxCarryForwardDays ?? 0) : 0;
        return {
            ...policy,
            leaveTypeName: policy.leaveType?.name || "All Leave Types (Global)",
            color: policy.leaveType?.color || "#3b82f6",
            entitlementDays: policy.leaveType?.daysPerYear !== undefined ? Number(policy.leaveType.daysPerYear) : null,
            isPaid: policy.leaveType?.isPaid ?? true,
            minDays: rules.minDays,
            halfDayAllowed: rules.halfDayAllowed,
            blackoutDatesList: rules.blackoutDatesList,
            carryForward: carryForwardDays,
            carryForwardDays,
        };
    }
    /**
     * Resolves the most specific active policy applicable to a leave type and employee org scope.
     */
    static async resolveEffectivePolicy(tenantId, leaveTypeId, branchId, departmentId, referenceDate) {
        const [policies, leaveType] = await Promise.all([
            prisma_1.rawPrisma.leavePolicy.findMany({
                where: {
                    tenantId,
                    OR: [{ leaveTypeId }, { leaveTypeId: null }, { isDefault: true }],
                },
                include: { leaveType: true },
                orderBy: [{ isDefault: "asc" }, { updatedAt: "desc" }],
            }),
            prisma_1.rawPrisma.leaveType.findFirst({ where: { id: leaveTypeId, tenantId } }),
        ]);
        const refDate = referenceDate ? new Date(referenceDate) : new Date();
        refDate.setUTCHours(0, 0, 0, 0);
        const typeSpecificPolicies = policies.filter((p) => p.leaveTypeId === leaveTypeId);
        const matchesScope = (p) => {
            if (p.branchId && branchId && p.branchId !== branchId)
                return false;
            if (p.branchId && !branchId)
                return false;
            if (p.departmentId && departmentId && p.departmentId !== departmentId)
                return false;
            if (p.departmentId && !departmentId)
                return false;
            return true;
        };
        const isWithinDates = (p) => {
            if (p.effectiveFrom) {
                const ef = new Date(p.effectiveFrom);
                ef.setUTCHours(0, 0, 0, 0);
                if (refDate < ef)
                    return false;
            }
            if (p.effectiveTo) {
                const et = new Date(p.effectiveTo);
                et.setUTCHours(23, 59, 59, 999);
                if (refDate > et)
                    return false;
            }
            return true;
        };
        const scopedTypePolicies = typeSpecificPolicies.filter(matchesScope);
        const activeScopedTypePolicies = scopedTypePolicies.filter((p) => p.status === "active" && isWithinDates(p));
        // Specificity score: branch + department (4) > department (3) > branch (2) > leaveType org-wide (1)
        const score = (p) => (p.branchId ? 2 : 0) + (p.departmentId ? 2 : 0) + (p.leaveTypeId ? 1 : 0);
        activeScopedTypePolicies.sort((a, b) => score(b) - score(a));
        if (activeScopedTypePolicies.length > 0) {
            const chosen = activeScopedTypePolicies[0];
            return {
                policy: this.enrichPolicy(chosen),
                rules: this.parsePolicyRules(chosen, leaveType || chosen.leaveType),
            };
        }
        // If a leave-type-specific policy exists for this scope, check if it was explicitly deactivated or outside effective period
        if (scopedTypePolicies.length > 0) {
            const inactiveOne = scopedTypePolicies.find((p) => p.status !== "active");
            if (inactiveOne) {
                return {
                    policy: this.enrichPolicy(inactiveOne),
                    rules: this.parsePolicyRules(inactiveOne, leaveType || inactiveOne.leaveType),
                    blockedReason: `The leave policy "${inactiveOne.name}" for ${leaveType?.name || "this leave type"} is currently inactive.`,
                };
            }
            const outOfWindow = scopedTypePolicies.find((p) => !isWithinDates(p));
            if (outOfWindow) {
                const fromStr = outOfWindow.effectiveFrom
                    ? new Date(outOfWindow.effectiveFrom).toISOString().slice(0, 10)
                    : "N/A";
                const toStr = outOfWindow.effectiveTo
                    ? new Date(outOfWindow.effectiveTo).toISOString().slice(0, 10)
                    : "open";
                return {
                    policy: this.enrichPolicy(outOfWindow),
                    rules: this.parsePolicyRules(outOfWindow, leaveType || outOfWindow.leaveType),
                    blockedReason: `Leave dates fall outside the effective period (${fromStr} to ${toStr}) of policy "${outOfWindow.name}".`,
                };
            }
        }
        // Fall back to global / default active policy
        const globalCandidates = policies
            .filter((p) => (!p.leaveTypeId || p.isDefault) && p.status === "active" && matchesScope(p) && isWithinDates(p))
            .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
        const fallback = globalCandidates[0] || null;
        return {
            policy: fallback ? this.enrichPolicy(fallback) : null,
            rules: this.parsePolicyRules(fallback, leaveType),
        };
    }
    /**
     * Pure, single-source-of-truth balance computation for one employee + one leave type in a target year.
     * Ensures HR cards, ESS cards, Ledger snapshots, and Dry-Run checks NEVER diverge.
     */
    static computeLeaveTypeBalanceSummary(lt, yearEntries, yearRequests, pendingEncashments = [], rollingCarryOverCredits = 0) {
        let accrued = 0;
        let hasSyncedAccrual = false;
        let carryForward = Number(rollingCarryOverCredits || 0);
        let manualCredits = 0;
        let earnedCredits = 0;
        let manualDebits = 0;
        let unreferencedEncashments = 0;
        let expired = 0;
        // Track reference-linked ledger debits/credits/encashments (approvals, Comp-Off credits & compensating reversals)
        const refDebits = new Map();
        const refCredits = new Map();
        const refEncashments = new Map();
        for (const entry of yearEntries) {
            const d = Number(entry.days || 0);
            if (entry.entryType === "ACCRUAL") {
                hasSyncedAccrual = true;
                accrued += d;
            }
            else if (entry.entryType === "CARRY_FORWARD") {
                carryForward += d;
            }
            else if (entry.entryType === "CREDIT") {
                if (entry.referenceId) {
                    refCredits.set(entry.referenceId, (refCredits.get(entry.referenceId) || 0) + d);
                }
                else {
                    manualCredits += d;
                }
            }
            else if (entry.entryType === "DEBIT") {
                if (entry.referenceId) {
                    refDebits.set(entry.referenceId, (refDebits.get(entry.referenceId) || 0) + d);
                }
                else {
                    manualDebits += d;
                }
            }
            else if (entry.entryType === "ENCASHMENT") {
                if (entry.referenceId) {
                    refEncashments.set(entry.referenceId, (refEncashments.get(entry.referenceId) || 0) + d);
                }
                else {
                    unreferencedEncashments += d;
                }
            }
            else if (entry.entryType === "EXPIRY") {
                expired += d;
            }
        }
        const defaultQuota = lt.daysPerYear !== undefined && lt.daysPerYear !== null ? Number(lt.daysPerYear) : 0;
        const annualEntitlement = hasSyncedAccrual ? accrued : defaultQuota;
        // Net ledger-backed encashments (ENCASHMENT minus compensating reversal CREDIT per referenceId)
        let encashments = unreferencedEncashments;
        for (const [refId, encAmt] of refEncashments.entries()) {
            const reversalCred = refCredits.get(refId) || 0;
            encashments += Math.max(0, encAmt - reversalCred);
        }
        // Net ledger-backed leave usage vs standalone earned credits (e.g. Comp-Off CREDITs)
        let netLedgerUsed = 0;
        const allNonEncashRefs = new Set([
            ...Array.from(refDebits.keys()),
            ...Array.from(refCredits.keys()).filter((k) => !refEncashments.has(k)),
        ]);
        for (const refId of allNonEncashRefs) {
            const deb = refDebits.get(refId) || 0;
            const cred = refCredits.get(refId) || 0;
            if (deb >= cred) {
                netLedgerUsed += deb - cred;
            }
            else {
                earnedCredits += cred - deb;
            }
        }
        // Include any legacy approved requests in this year that had no ledger DEBIT row
        let legacyUnledgeredApproved = 0;
        let pending = 0;
        for (const req of yearRequests) {
            const reqDays = Number(req.days || 0);
            if (req.status === "approved" && !refDebits.has(req.id)) {
                legacyUnledgeredApproved += reqDays;
            }
            else if (req.status === "pending") {
                pending += reqDays;
            }
        }
        // Reserve active pending encashment requests before they are ledgered as ENCASHMENT
        for (const enc of pendingEncashments) {
            if (!refEncashments.has(enc.id)) {
                pending += Number(enc.days || 0);
            }
        }
        const used = Number((netLedgerUsed + legacyUnledgeredApproved).toFixed(2));
        const pendingRounded = Number(pending.toFixed(2));
        const expiredRounded = Number(expired.toFixed(2));
        const total = Number(Math.max(0, annualEntitlement + carryForward + manualCredits + earnedCredits - manualDebits - encashments).toFixed(2));
        const available = Number(Math.max(0, total - used - expiredRounded - pendingRounded).toFixed(2));
        return {
            leaveTypeId: lt.id,
            leaveTypeName: lt.name,
            code: lt.code || null,
            color: lt.color || "#3b82f6",
            status: lt.status || "active",
            isPaid: lt.isPaid !== false,
            halfDayAllowed: lt.halfDayAllowed !== false,
            sandwichRule: Boolean(lt.sandwichRule),
            isSynced: hasSyncedAccrual,
            openingBalance: 0,
            annualEntitlement: Number(annualEntitlement.toFixed(2)),
            accrued: Number(annualEntitlement.toFixed(2)),
            carryForward: Number(carryForward.toFixed(2)),
            manualCredits: Number((manualCredits + earnedCredits).toFixed(2)),
            earnedCredits: Number(earnedCredits.toFixed(2)),
            manualDebits: Number(manualDebits.toFixed(2)),
            encashments: Number(encashments.toFixed(2)),
            expired: expiredRounded,
            total,
            used,
            pending: pendingRounded,
            available,
        };
    }
    /**
     * Checks whether a LeaveType serves as a Compensatory Off (Comp-Off) leave type for the tenant.
     */
    static async isCompOffLeaveType(tenantId, leaveType, db = prisma_1.rawPrisma) {
        const codeUpper = String(leaveType.code || "").trim().toUpperCase();
        const nameStr = String(leaveType.name || "").trim();
        if (["COM", "COMP", "COMP_OFF", "COMPOFF", "CO", "COFF"].includes(codeUpper) ||
            /comp[\s_-]*off|compensatory/i.test(nameStr)) {
            return true;
        }
        const linkedConfig = await db.compOffConfig.findFirst({
            where: { tenantId, compOffLeaveTypeId: leaveType.id, status: "active" },
            select: { id: true },
        });
        return Boolean(linkedConfig);
    }
    /**
     * Idempotently expires any Comp-Off credit lots for an employee whose expiresAt has passed
     * while preserving already consumed days and writing an auditable EXPIRY ledger entry.
     */
    static async sweepOverdueCompOffLotsForEmployee(tenantId, employeeId, db = prisma_1.rawPrisma) {
        const now = new Date();
        const overdueLots = await db.leaveEncashmentRequest.findMany({
            where: {
                tenantId,
                employeeId,
                type: "COMP_OFF",
                status: { in: ["CREDITED", "PARTIALLY_USED"] },
                expiresAt: { lt: now },
                remainingDays: { gt: 0 },
            },
        });
        if (overdueLots.length === 0)
            return 0;
        let expiredCount = 0;
        for (const lot of overdueLots) {
            const rem = Number(lot.remainingDays || 0);
            if (rem <= 0)
                continue;
            const existingExpiry = await db.leaveLedgerEntry.findFirst({
                where: { tenantId, referenceId: lot.id, entryType: "EXPIRY" },
                select: { id: true },
            });
            let expiryLedgerId = existingExpiry?.id || null;
            if (!existingExpiry) {
                const balBefore = await this.getEmployeeBalance(tenantId, employeeId, lot.leaveTypeId, now.getUTCFullYear(), { tx: db, skipCompOffSweep: true });
                const createdLedger = await db.leaveLedgerEntry.create({
                    data: {
                        tenantId,
                        employeeId,
                        leaveTypeId: lot.leaveTypeId,
                        entryType: "EXPIRY",
                        days: rem,
                        balance: Math.max(0, Number((balBefore - rem).toFixed(2))),
                        referenceId: lot.id,
                        notes: `Auto-expired unused Comp-Off credit (${lot.requestCode || lot.id.slice(0, 8)})`.slice(0, 250),
                        effectiveAt: lot.expiresAt || now,
                    },
                });
                expiryLedgerId = createdLedger.id;
            }
            const prevExpired = Number(lot.expiredDays || 0);
            await db.leaveEncashmentRequest.update({
                where: { id: lot.id },
                data: {
                    expiredDays: Number((prevExpired + rem).toFixed(2)),
                    remainingDays: 0,
                    status: "EXPIRED",
                    expiredAt: now,
                    expiryLedgerEntryId: expiryLedgerId,
                },
            });
            await db.leaveEncashmentCompOffEvent.create({
                data: {
                    tenantId,
                    requestId: lot.id,
                    employeeId,
                    transactionType: "COMP_OFF",
                    eventType: "EXPIRED",
                    fromStatus: lot.status,
                    toStatus: "EXPIRED",
                    days: rem,
                    ledgerEntryId: expiryLedgerId,
                    comments: `Unused Comp-Off credit (${rem} day(s)) expired on ${lot.expiresAt?.toISOString().slice(0, 10) || now.toISOString().slice(0, 10)}.`,
                },
            });
            expiredCount++;
        }
        return expiredCount;
    }
    /**
     * Computes rolling carry-over credits into `targetYear` from Comp-Off lots credited prior to `startOfYear`
     * whose expiry falls inside or after `targetYear` (or had no expiry).
     */
    static computePriorYearCompOffCarryIntoYear(priorLots, startOfYear) {
        let carry = 0;
        for (const lot of priorLots) {
            const credited = Number(lot.approvedDays ?? lot.days ?? 0);
            if (credited <= 0)
                continue;
            let priorUsed = 0;
            for (const alloc of lot.usageAllocations || []) {
                if (alloc.status === "CONSUMED" && alloc.leaveRequest?.startDate && alloc.leaveRequest.startDate < startOfYear) {
                    priorUsed += Number(alloc.daysAllocated || 0);
                }
            }
            let priorExpired = 0;
            if (lot.expiredAt && lot.expiredAt < startOfYear) {
                priorExpired = Number(lot.expiredDays || 0);
            }
            carry += Math.max(0, credited - priorUsed - priorExpired);
        }
        return Number(carry.toFixed(2));
    }
    /**
     * Returns FIFO-ordered non-expired Comp-Off credit lots available on `referenceDate`,
     * subtracting active RESERVED allocations from other pending leave requests.
     */
    static async getAvailableCompOffLotsForDate(tenantId, employeeId, leaveTypeId, referenceDate, options) {
        const db = options?.db || prisma_1.rawPrisma;
        if (!options?.skipSweep) {
            await this.sweepOverdueCompOffLotsForEmployee(tenantId, employeeId, db);
        }
        const refDay = new Date(referenceDate);
        refDay.setUTCHours(0, 0, 0, 0);
        const lots = await db.leaveEncashmentRequest.findMany({
            where: {
                tenantId,
                employeeId,
                leaveTypeId,
                type: "COMP_OFF",
                status: { in: ["CREDITED", "PARTIALLY_USED"] },
                remainingDays: { gt: 0 },
                OR: [{ expiresAt: null }, { expiresAt: { gte: refDay } }],
            },
            include: {
                usageAllocations: {
                    where: {
                        status: "RESERVED",
                        ...(options?.excludeLeaveRequestId
                            ? { leaveRequestId: { not: options.excludeLeaveRequestId } }
                            : {}),
                    },
                    include: {
                        leaveRequest: { select: { id: true, status: true } },
                    },
                },
            },
            orderBy: [{ expiresAt: "asc" }, { workedOnDate: "asc" }, { createdAt: "asc" }],
        });
        const availableLots = lots
            .map((lot) => {
            const activeReserved = (lot.usageAllocations || [])
                .filter((a) => !a.leaveRequest || a.leaveRequest.status === "pending")
                .reduce((sum, a) => sum + Number(a.daysAllocated || 0), 0);
            const netAvailable = Number(Math.max(0, Number(lot.remainingDays || 0) - activeReserved).toFixed(2));
            return {
                ...lot,
                activeReserved: Number(activeReserved.toFixed(2)),
                netAvailable,
            };
        })
            .filter((l) => l.netAvailable > 0);
        const totalNetAvailable = Number(availableLots.reduce((sum, l) => sum + l.netAvailable, 0).toFixed(2));
        return { lots: availableLots, totalNetAvailable };
    }
    /**
     * Reserves Comp-Off credit lots in FIFO order (`RESERVED`) for a pending LeaveRequest.
     */
    static async reserveCompOffLotsFifo(tx, params) {
        const { tenantId, employeeId, leaveTypeId, leaveRequestId, requiredDays, leaveEndDate } = params;
        await tx.$queryRaw `SELECT id FROM employees WHERE id = ${employeeId} AND tenant_id = ${tenantId} FOR UPDATE`;
        // Clear any stale RESERVED rows for this leaveRequestId first (for updates)
        await tx.compOffUsageAllocation.deleteMany({
            where: { tenantId, leaveRequestId, status: "RESERVED" },
        });
        const { lots, totalNetAvailable } = await this.getAvailableCompOffLotsForDate(tenantId, employeeId, leaveTypeId, leaveEndDate, { excludeLeaveRequestId: leaveRequestId, db: tx });
        if (totalNetAvailable < requiredDays) {
            throw new LeaveHttpError(`Insufficient non-expired Comp-Off balance. Available non-expired credit: ${totalNetAvailable} day(s), Required: ${requiredDays} day(s).`, 400, "INSUFFICIENT_COMPOFF_BALANCE");
        }
        let remainingToReserve = Number(requiredDays.toFixed(2));
        const allocations = [];
        for (const lot of lots) {
            if (remainingToReserve <= 0)
                break;
            const take = Number(Math.min(lot.netAvailable, remainingToReserve).toFixed(2));
            if (take <= 0)
                continue;
            const created = await tx.compOffUsageAllocation.create({
                data: {
                    tenantId,
                    employeeId,
                    compOffRequestId: lot.id,
                    leaveRequestId,
                    daysAllocated: take,
                    status: "RESERVED",
                },
            });
            allocations.push({ ...created, requestCode: lot.requestCode || lot.id.slice(0, 8) });
            remainingToReserve = Number((remainingToReserve - take).toFixed(2));
        }
        return allocations;
    }
    /**
     * Releases RESERVED Comp-Off allocations when a pending leave application is rejected or cancelled.
     */
    static async releaseReservedCompOffLots(tx, tenantId, leaveRequestId) {
        await tx.compOffUsageAllocation.updateMany({
            where: { tenantId, leaveRequestId, status: "RESERVED" },
            data: { status: "RESTORED", restoredAt: new Date() },
        });
    }
    /**
     * Derive authoritative available leave balance from immutable LeaveLedgerEntry + LeaveRequest + pending Encashment records.
     */
    static async getEmployeeBalance(tenantId, employeeId, leaveTypeId, year, options) {
        const db = options?.tx || prisma_1.rawPrisma;
        const targetYear = year || new Date().getUTCFullYear();
        const startOfYear = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
        const endOfYear = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
        const leaveType = await db.leaveType.findFirst({
            where: { id: leaveTypeId, tenantId },
        });
        if (!leaveType)
            return 0;
        const isCompOff = await this.isCompOffLeaveType(tenantId, leaveType, db);
        if (isCompOff && !options?.skipCompOffSweep) {
            await this.sweepOverdueCompOffLotsForEmployee(tenantId, employeeId, db);
        }
        const [entries, requests, pendingEncashments, priorYearCompOffLots] = await Promise.all([
            db.leaveLedgerEntry.findMany({
                where: {
                    tenantId,
                    employeeId,
                    leaveTypeId,
                    effectiveAt: { gte: startOfYear, lte: endOfYear },
                },
                select: { entryType: true, days: true, referenceId: true },
            }),
            db.leaveRequest.findMany({
                where: {
                    tenantId,
                    employeeId,
                    leaveTypeId,
                    startDate: { gte: startOfYear, lte: endOfYear },
                    status: options?.ignorePending ? { in: ["approved"] } : { in: ["pending", "approved"] },
                    ...(options?.excludeRequestId ? { id: { not: options.excludeRequestId } } : {}),
                },
                select: { id: true, status: true, days: true },
            }),
            options?.ignorePending
                ? Promise.resolve([])
                : db.leaveEncashmentRequest.findMany({
                    where: {
                        tenantId,
                        employeeId,
                        leaveTypeId,
                        type: "ENCASHMENT",
                        status: { in: ["PENDING", "MANAGER_APPROVED", "HR_APPROVED"] },
                        OR: [
                            { effectiveDate: { gte: startOfYear, lte: endOfYear } },
                            { effectiveDate: null, createdAt: { gte: startOfYear, lte: endOfYear } },
                        ],
                        ...(options?.excludeEncashmentId ? { id: { not: options.excludeEncashmentId } } : {}),
                    },
                    select: { id: true, status: true, days: true },
                }),
            isCompOff
                ? db.leaveEncashmentRequest.findMany({
                    where: {
                        tenantId,
                        employeeId,
                        leaveTypeId,
                        type: "COMP_OFF",
                        creditedAt: { lt: startOfYear },
                        OR: [{ expiresAt: null }, { expiresAt: { gte: startOfYear } }],
                    },
                    select: {
                        days: true,
                        approvedDays: true,
                        expiredAt: true,
                        expiredDays: true,
                        usageAllocations: {
                            where: { status: "CONSUMED" },
                            select: {
                                daysAllocated: true,
                                status: true,
                                leaveRequest: { select: { startDate: true } },
                            },
                        },
                    },
                })
                : Promise.resolve([]),
        ]);
        const rollingCarry = isCompOff
            ? this.computePriorYearCompOffCarryIntoYear(priorYearCompOffLots, startOfYear)
            : 0;
        const summary = this.computeLeaveTypeBalanceSummary(leaveType, entries, requests, pendingEncashments, rollingCarry);
        return summary.available;
    }
    /**
     * Comprehensive single-employee leave balances breakdown across leave types (parallel queries).
     */
    static async getEmployeeDetailedBalances(tenantId, employeeId, year, options) {
        const targetYear = year || new Date().getUTCFullYear();
        const startOfYear = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
        const endOfYear = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
        await this.sweepOverdueCompOffLotsForEmployee(tenantId, employeeId);
        const [leaveTypes, ledgerEntries, leaveRequests, pendingEncashments, priorYearCompOffLots] = await Promise.all([
            prisma_1.rawPrisma.leaveType.findMany({
                where: options?.includeInactiveWithHistory ? { tenantId } : { tenantId, status: "active" },
                orderBy: [{ status: "asc" }, { name: "asc" }],
            }),
            prisma_1.rawPrisma.leaveLedgerEntry.findMany({
                where: {
                    tenantId,
                    employeeId,
                    effectiveAt: { gte: startOfYear, lte: endOfYear },
                },
                select: { leaveTypeId: true, entryType: true, days: true, referenceId: true },
            }),
            prisma_1.rawPrisma.leaveRequest.findMany({
                where: {
                    tenantId,
                    employeeId,
                    startDate: { gte: startOfYear, lte: endOfYear },
                    status: { in: ["pending", "approved"] },
                },
                select: { id: true, leaveTypeId: true, status: true, days: true },
            }),
            prisma_1.rawPrisma.leaveEncashmentRequest.findMany({
                where: {
                    tenantId,
                    employeeId,
                    type: "ENCASHMENT",
                    status: { in: ["PENDING", "MANAGER_APPROVED", "HR_APPROVED"] },
                    OR: [
                        { effectiveDate: { gte: startOfYear, lte: endOfYear } },
                        { effectiveDate: null, createdAt: { gte: startOfYear, lte: endOfYear } },
                    ],
                },
                select: { id: true, leaveTypeId: true, status: true, days: true },
            }),
            prisma_1.rawPrisma.leaveEncashmentRequest.findMany({
                where: {
                    tenantId,
                    employeeId,
                    type: "COMP_OFF",
                    creditedAt: { lt: startOfYear },
                    OR: [{ expiresAt: null }, { expiresAt: { gte: startOfYear } }],
                },
                select: {
                    leaveTypeId: true,
                    days: true,
                    approvedDays: true,
                    expiredAt: true,
                    expiredDays: true,
                    usageAllocations: {
                        where: { status: "CONSUMED" },
                        select: {
                            daysAllocated: true,
                            status: true,
                            leaveRequest: { select: { startDate: true } },
                        },
                    },
                },
            }),
        ]);
        const entriesByType = new Map();
        for (const e of ledgerEntries) {
            if (!entriesByType.has(e.leaveTypeId))
                entriesByType.set(e.leaveTypeId, []);
            entriesByType.get(e.leaveTypeId).push(e);
        }
        const reqsByType = new Map();
        for (const r of leaveRequests) {
            if (!r.leaveTypeId)
                continue;
            if (!reqsByType.has(r.leaveTypeId))
                reqsByType.set(r.leaveTypeId, []);
            reqsByType.get(r.leaveTypeId).push(r);
        }
        const encByType = new Map();
        for (const enc of pendingEncashments) {
            if (!encByType.has(enc.leaveTypeId))
                encByType.set(enc.leaveTypeId, []);
            encByType.get(enc.leaveTypeId).push(enc);
        }
        const priorLotsByType = new Map();
        for (const lot of priorYearCompOffLots) {
            if (!priorLotsByType.has(lot.leaveTypeId))
                priorLotsByType.set(lot.leaveTypeId, []);
            priorLotsByType.get(lot.leaveTypeId).push(lot);
        }
        return leaveTypes
            .filter((lt) => {
            if (lt.status === "active")
                return true;
            if (!options?.includeInactiveWithHistory)
                return false;
            return entriesByType.has(lt.id) || reqsByType.has(lt.id) || encByType.has(lt.id);
        })
            .map((lt) => this.computeLeaveTypeBalanceSummary(lt, entriesByType.get(lt.id) || [], reqsByType.get(lt.id) || [], encByType.get(lt.id) || [], this.computePriorYearCompOffCarryIntoYear(priorLotsByType.get(lt.id) || [], startOfYear)));
    }
    /**
     * High-performance bulk balance aggregation for N employees in constant parallel queries (eliminates N+1 storm).
     */
    static async getBulkEmployeeDetailedBalances(tenantId, employees, year, options) {
        const targetYear = year || new Date().getUTCFullYear();
        const startOfYear = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
        const endOfYear = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
        const employeeIds = employees.map((e) => e.id);
        const leaveTypeWhere = { tenantId, status: "active" };
        if (options?.leaveTypeId && options.leaveTypeId !== "all") {
            leaveTypeWhere.id = options.leaveTypeId;
        }
        const [activeLeaveTypes, ledgerEntries, leaveRequests, pendingEncashments, priorYearCompOffLots] = await Promise.all([
            prisma_1.rawPrisma.leaveType.findMany({
                where: leaveTypeWhere,
                orderBy: { name: "asc" },
            }),
            employeeIds.length > 0
                ? prisma_1.rawPrisma.leaveLedgerEntry.findMany({
                    where: {
                        tenantId,
                        employeeId: { in: employeeIds },
                        effectiveAt: { gte: startOfYear, lte: endOfYear },
                        ...(options?.leaveTypeId && options.leaveTypeId !== "all"
                            ? { leaveTypeId: options.leaveTypeId }
                            : {}),
                    },
                    select: { employeeId: true, leaveTypeId: true, entryType: true, days: true, referenceId: true },
                })
                : Promise.resolve([]),
            employeeIds.length > 0
                ? prisma_1.rawPrisma.leaveRequest.findMany({
                    where: {
                        tenantId,
                        employeeId: { in: employeeIds },
                        startDate: { gte: startOfYear, lte: endOfYear },
                        status: { in: ["pending", "approved"] },
                        ...(options?.leaveTypeId && options.leaveTypeId !== "all"
                            ? { leaveTypeId: options.leaveTypeId }
                            : {}),
                    },
                    select: { id: true, employeeId: true, leaveTypeId: true, status: true, days: true },
                })
                : Promise.resolve([]),
            employeeIds.length > 0
                ? prisma_1.rawPrisma.leaveEncashmentRequest.findMany({
                    where: {
                        tenantId,
                        employeeId: { in: employeeIds },
                        type: "ENCASHMENT",
                        status: { in: ["PENDING", "MANAGER_APPROVED", "HR_APPROVED"] },
                        OR: [
                            { effectiveDate: { gte: startOfYear, lte: endOfYear } },
                            { effectiveDate: null, createdAt: { gte: startOfYear, lte: endOfYear } },
                        ],
                        ...(options?.leaveTypeId && options.leaveTypeId !== "all"
                            ? { leaveTypeId: options.leaveTypeId }
                            : {}),
                    },
                    select: { id: true, employeeId: true, leaveTypeId: true, status: true, days: true },
                })
                : Promise.resolve([]),
            employeeIds.length > 0
                ? prisma_1.rawPrisma.leaveEncashmentRequest.findMany({
                    where: {
                        tenantId,
                        employeeId: { in: employeeIds },
                        type: "COMP_OFF",
                        creditedAt: { lt: startOfYear },
                        OR: [{ expiresAt: null }, { expiresAt: { gte: startOfYear } }],
                        ...(options?.leaveTypeId && options.leaveTypeId !== "all"
                            ? { leaveTypeId: options.leaveTypeId }
                            : {}),
                    },
                    select: {
                        employeeId: true,
                        leaveTypeId: true,
                        days: true,
                        approvedDays: true,
                        expiredAt: true,
                        expiredDays: true,
                        usageAllocations: {
                            where: { status: "CONSUMED" },
                            select: {
                                daysAllocated: true,
                                status: true,
                                leaveRequest: { select: { startDate: true } },
                            },
                        },
                    },
                })
                : Promise.resolve([]),
        ]);
        const entriesMap = new Map();
        for (const e of ledgerEntries) {
            const k = `${e.employeeId}::${e.leaveTypeId}`;
            if (!entriesMap.has(k))
                entriesMap.set(k, []);
            entriesMap.get(k).push(e);
        }
        const reqsMap = new Map();
        for (const r of leaveRequests) {
            if (!r.leaveTypeId)
                continue;
            const k = `${r.employeeId}::${r.leaveTypeId}`;
            if (!reqsMap.has(k))
                reqsMap.set(k, []);
            reqsMap.get(k).push(r);
        }
        const encMap = new Map();
        for (const enc of pendingEncashments) {
            const k = `${enc.employeeId}::${enc.leaveTypeId}`;
            if (!encMap.has(k))
                encMap.set(k, []);
            encMap.get(k).push(enc);
        }
        const priorLotsMap = new Map();
        for (const lot of priorYearCompOffLots) {
            const k = `${lot.employeeId}::${lot.leaveTypeId}`;
            if (!priorLotsMap.has(k))
                priorLotsMap.set(k, []);
            priorLotsMap.get(k).push(lot);
        }
        const data = employees.map((emp) => {
            const empBalances = activeLeaveTypes.map((lt) => {
                const k = `${emp.id}::${lt.id}`;
                return this.computeLeaveTypeBalanceSummary(lt, entriesMap.get(k) || [], reqsMap.get(k) || [], encMap.get(k) || [], this.computePriorYearCompOffCarryIntoYear(priorLotsMap.get(k) || [], startOfYear));
            });
            return {
                employeeId: emp.id,
                employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
                employeeCode: emp.employeeCode,
                position: emp.position || "Team Member",
                department: emp.department?.name || "General",
                departmentId: emp.department?.id || null,
                avatarUrl: emp.user?.profile?.avatarUrl || null,
                balances: empBalances,
            };
        });
        return {
            year: targetYear,
            leaveTypes: activeLeaveTypes,
            data,
        };
    }
    /**
     * Pure date arithmetic calculation for deductible days, weekend exclusions, and intra-range sandwich leave mechanics.
     * Non-working days (weekends/holidays) inside [startDate, endDate] are only counted as sandwich days
     * when `sandwichRule` is enabled AND they are flanked by working leave days before and after.
     */
    static calculateDeductibleDays(startDate, endDate, sandwichRule, holidayDates = new Set(), isHalfDay = false) {
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(0, 0, 0, 0);
        const rawDays = [];
        const curr = new Date(start);
        while (curr <= end) {
            const dateStr = curr.toISOString().slice(0, 10);
            const dayOfWeek = curr.getUTCDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidayDates.has(dateStr);
            rawDays.push({
                date: dateStr,
                isWeekend,
                isHoliday,
                isNonWorking: isWeekend || isHoliday,
            });
            curr.setUTCDate(curr.getUTCDate() + 1);
        }
        // Identify first and last working day indices inside [start, end]
        let firstWorkingIdx = -1;
        let lastWorkingIdx = -1;
        for (let i = 0; i < rawDays.length; i++) {
            if (!rawDays[i].isNonWorking) {
                if (firstWorkingIdx === -1)
                    firstWorkingIdx = i;
                lastWorkingIdx = i;
            }
        }
        const breakdown = [];
        let deductibleDays = 0;
        let weekendDays = 0;
        let holidayDays = 0;
        let sandwichDays = 0;
        for (let i = 0; i < rawDays.length; i++) {
            const d = rawDays[i];
            if (d.isWeekend)
                weekendDays++;
            if (d.isHoliday)
                holidayDays++;
            let isDeducted = !d.isNonWorking;
            let reason;
            if (d.isNonWorking) {
                const isFlankedByWorkingLeave = !isHalfDay &&
                    firstWorkingIdx !== -1 &&
                    lastWorkingIdx !== -1 &&
                    i > firstWorkingIdx &&
                    i < lastWorkingIdx;
                if (sandwichRule && isFlankedByWorkingLeave) {
                    isDeducted = true;
                    sandwichDays++;
                    reason = d.isHoliday ? "Holiday (Sandwich Rule)" : "Weekend (Sandwich Rule)";
                }
                else {
                    isDeducted = false;
                    reason = d.isHoliday ? "Holiday" : "Weekend";
                }
            }
            if (isDeducted) {
                deductibleDays += isHalfDay ? 0.5 : 1.0;
            }
            breakdown.push({
                date: d.date,
                isWeekend: d.isWeekend,
                isHoliday: d.isHoliday,
                isDeducted,
                reason,
            });
        }
        return {
            deductibleDays,
            weekendDays,
            holidayDays,
            sandwichDays,
            breakdown,
        };
    }
    /**
     * Server-authoritative Dry-Run calculation & policy compliance check.
     * Enforces LeaveType active status, LeavePolicy rules (status, effective dates, probation,
     * notice period, min/max days, half-day, blackout dates, sandwich rule), overlaps, and ledger balance.
     */
    static async validateDryRun(options) {
        const { tenantId, employeeId, leaveTypeId } = options;
        const start = new Date(options.startDate);
        const end = new Date(options.endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            throw new LeaveHttpError("Valid start date and end date are required.", 400);
        }
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(0, 0, 0, 0);
        if (start > end) {
            throw new LeaveHttpError("Start date must be before or equal to end date.", 400);
        }
        const startIso = start.toISOString().slice(0, 10);
        const endIso = end.toISOString().slice(0, 10);
        // Parallelize core entity + policy + holiday + overlap + employee lookups
        const [leaveType, empRecord, holidays, overlapping] = await Promise.all([
            prisma_1.rawPrisma.leaveType.findFirst({
                where: { id: leaveTypeId, tenantId },
            }),
            prisma_1.rawPrisma.employee.findFirst({
                where: { id: employeeId, tenantId },
                select: {
                    id: true,
                    branchId: true,
                    departmentId: true,
                    employmentCategory: true,
                    employmentType: true,
                    joinedAt: true,
                    status: true,
                },
            }),
            prisma_1.rawPrisma.holiday.findMany({
                where: {
                    tenantId,
                    status: "active",
                    date: { gte: start, lte: end },
                },
                select: { date: true, name: true, branchIds: true },
            }),
            prisma_1.rawPrisma.leaveRequest.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    status: { in: ["pending", "approved"] },
                    ...(options.excludeRequestId ? { id: { not: options.excludeRequestId } } : {}),
                    startDate: { lte: end },
                    endDate: { gte: start },
                },
            }),
        ]);
        if (!leaveType) {
            throw new LeaveHttpError("Leave type not found in this organization.", 404);
        }
        if (!empRecord) {
            throw new LeaveHttpError("Employee record not found in this organization.", 404);
        }
        const warnings = [];
        // 1. Active Leave Type enforcement
        if (leaveType.status !== "active") {
            warnings.push(`Leave type "${leaveType.name}" is inactive and cannot be selected for new leave applications.`);
        }
        // 2. Resolve applicable LeavePolicy & extended rules
        const { policy: effectivePolicy, rules, blockedReason } = await this.resolveEffectivePolicy(tenantId, leaveTypeId, empRecord.branchId, empRecord.departmentId, start);
        if (blockedReason) {
            warnings.push(blockedReason);
        }
        const sandwichRule = Boolean(leaveType.sandwichRule || effectivePolicy?.sandwichRule);
        const halfDayAllowed = Boolean(leaveType.halfDayAllowed && rules.halfDayAllowed);
        const minDays = rules.minDays;
        const maxConsecutiveDays = effectivePolicy?.maxConsecutiveDays ?? 365;
        const noticeDays = effectivePolicy?.noticeDays ?? 0;
        const probationAllowed = effectivePolicy?.probationAllowed ?? true;
        const requiresApproval = effectivePolicy?.requiresApproval ?? true;
        // 3. Half-day validation
        if (options.halfDay) {
            if (!halfDayAllowed) {
                warnings.push(`Half-day leave is not permitted under "${effectivePolicy?.name || leaveType.name}".`);
            }
            if (startIso !== endIso) {
                warnings.push("Half-day leave can only be applied for a single calendar date.");
            }
        }
        // 4. Overlap check
        if (overlapping) {
            warnings.push("An overlapping pending or approved leave application already exists for this period.");
        }
        // 5. Workforce category, contract & probation checks
        if (empRecord.employmentCategory === "vendor_outsourced" ||
            empRecord.employmentCategory === "consultant_freelancer") {
            if (leaveType.isPaid) {
                warnings.push("External contractors and consultants under Accounts Payable cannot apply for statutory paid employee leaves. Please submit invoice adjustments or timesheet notes.");
            }
        }
        const [activeContract, activeProbation] = await Promise.all([
            prisma_1.rawPrisma.employeeContract.findFirst({
                where: { tenantId, employeeId, status: "active" },
                orderBy: { startDate: "desc" },
            }),
            !probationAllowed
                ? prisma_1.rawPrisma.probationRecord.findFirst({
                    where: {
                        tenantId,
                        employeeId,
                        status: { in: ["active", "in_progress", "extended"] },
                        startDate: { lte: start },
                        endDate: { gte: start },
                    },
                })
                : Promise.resolve(null),
        ]);
        if (activeContract) {
            const cStart = new Date(activeContract.startDate);
            cStart.setUTCHours(0, 0, 0, 0);
            if (start < cStart) {
                warnings.push(`Leave start date cannot precede active contract start date (${cStart.toISOString().slice(0, 10)}).`);
            }
            if (activeContract.endDate) {
                const cEnd = new Date(activeContract.endDate);
                cEnd.setUTCHours(23, 59, 59, 999);
                if (end > cEnd) {
                    warnings.push(`Leave end date cannot exceed active contract expiry date (${cEnd.toISOString().slice(0, 10)}).`);
                }
            }
        }
        if (!probationAllowed && (activeProbation || empRecord.employmentCategory === "probationary")) {
            warnings.push(`Employees currently on probation are not eligible for "${effectivePolicy?.name || leaveType.name}".`);
        }
        // 6. Notice period check (when noticeDays > 0 and not explicitly bypassed by HR backdate override)
        if (noticeDays > 0 && !options.bypassNoticePeriod) {
            const todayUtc = new Date();
            todayUtc.setUTCHours(0, 0, 0, 0);
            const diffNoticeDays = Math.round((start.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24));
            if (diffNoticeDays < noticeDays) {
                warnings.push(`Policy "${effectivePolicy?.name || leaveType.name}" requires at least ${noticeDays} day(s) advance notice (selected start date is ${diffNoticeDays} day(s) from today).`);
            }
        }
        // 7. Blackout dates check
        if (rules.blackoutDatesList.length > 0) {
            const hitBlackout = rules.blackoutDatesList.find((bd) => bd >= startIso && bd <= endIso);
            if (hitBlackout) {
                warnings.push(`Selected period includes restricted blackout date (${hitBlackout}).`);
            }
        }
        // 8. Calculate deductible days + intra-range sandwich days
        const holidayDates = new Set(holidays
            .filter((h) => !h.branchIds ||
            h.branchIds.length === 0 ||
            (empRecord.branchId && h.branchIds.includes(empRecord.branchId)))
            .map((h) => h.date.toISOString().slice(0, 10)));
        const calc = this.calculateDeductibleDays(start, end, sandwichRule, holidayDates, Boolean(options.halfDay));
        let deductibleDays = calc.deductibleDays;
        const weekendCount = calc.weekendDays;
        const holidayCount = calc.holidayDays;
        let totalSandwichDays = calc.sandwichDays;
        const sandwichDatesSet = new Set(calc.breakdown.filter((b) => b.isDeducted && (b.isWeekend || b.isHoliday)).map((b) => b.date));
        // 8b. Evaluate cross-request adjacent sandwich bridges (only for full-day leaves when sandwichRule=true)
        if (sandwichRule && !options.halfDay && deductibleDays > 0) {
            try {
                const extSw = await sandwich_leave_service_1.SandwichLeaveService.evaluateEmployeeSandwichLeave(tenantId, employeeId, start, end, {
                    sandwichRuleOverride: true,
                    proposedRangeAsLeave: true,
                    excludeRequestId: options.excludeRequestId,
                });
                for (const sDate of extSw.sandwichDates) {
                    if (!sandwichDatesSet.has(sDate)) {
                        sandwichDatesSet.add(sDate);
                        // If outside [startIso, endIso], add 1 deductible day for the bridged weekend/holiday
                        if (sDate < startIso || sDate > endIso) {
                            deductibleDays += 1;
                            totalSandwichDays += 1;
                        }
                    }
                }
            }
            catch {
                // Non-blocking fallback
            }
        }
        if (deductibleDays <= 0) {
            warnings.push("Selected date range contains 0 working/deductible days (falls entirely on weekends or holidays).");
        }
        else {
            // 9. Min / Max days per application enforcement
            const effectiveMin = options.halfDay && halfDayAllowed && minDays <= 1 ? 0.5 : minDays;
            if (deductibleDays < effectiveMin) {
                warnings.push(`Minimum ${effectiveMin} day(s) per application required under "${effectivePolicy?.name || leaveType.name}" (requested ${deductibleDays} day(s)).`);
            }
            if (maxConsecutiveDays > 0 && deductibleDays > maxConsecutiveDays) {
                warnings.push(`Maximum ${maxConsecutiveDays} day(s) per application allowed under "${effectivePolicy?.name || leaveType.name}" (requested ${deductibleDays} day(s)).`);
            }
        }
        // 10. Live ledger balance & non-expired Comp-Off lot check for target year
        const isCompOff = await this.isCompOffLeaveType(tenantId, leaveType);
        let availableBalance = await this.getEmployeeBalance(tenantId, employeeId, leaveTypeId, start.getUTCFullYear(), { excludeRequestId: options.excludeRequestId });
        if (isCompOff) {
            const { totalNetAvailable } = await this.getAvailableCompOffLotsForDate(tenantId, employeeId, leaveTypeId, end, { excludeLeaveRequestId: options.excludeRequestId });
            availableBalance = Number(Math.min(availableBalance, totalNetAvailable).toFixed(2));
            if (deductibleDays > 0 && totalNetAvailable < deductibleDays) {
                warnings.push(`Insufficient non-expired Comp-Off balance for ${leaveType.name}. Available non-expired credit: ${totalNetAvailable} day(s), Required: ${deductibleDays} day(s).`);
            }
        }
        else if (leaveType.isPaid && availableBalance < deductibleDays) {
            warnings.push(`Insufficient leave balance for ${leaveType.name}. Available: ${availableBalance} day(s), Required: ${deductibleDays} day(s).`);
        }
        return {
            isValid: warnings.length === 0,
            valid: warnings.length === 0,
            totalDays: deductibleDays,
            computedDays: deductibleDays,
            calculatedDays: deductibleDays,
            weekendCount,
            holidayCount,
            isSandwich: totalSandwichDays > 0,
            sandwichDaysCount: totalSandwichDays,
            sandwichDaysAdded: totalSandwichDays,
            sandwichDates: Array.from(sandwichDatesSet).sort(),
            isPaid: leaveType.isPaid,
            isCompOff,
            leaveTypeName: leaveType.name,
            availableBalance,
            remainingBalance: Number((availableBalance - deductibleDays).toFixed(2)),
            requiresApproval,
            policySummary: {
                policyId: effectivePolicy?.id || null,
                policyName: effectivePolicy?.name || "Standard Leave Policy",
                minDays,
                maxConsecutiveDays,
                noticeDays,
                probationAllowed,
                halfDayAllowed,
                sandwichRule,
                requiresApproval,
                carryForwardDays: effectivePolicy?.carryForwardDays ?? 0,
            },
            breakdown: calc.breakdown,
            warnings,
            blockingIssues: warnings,
        };
    }
    /**
     * Submit Leave Application with server-side Dry-Run verification.
     * When policy `requiresApproval === false`, auto-approves atomically with ledger DEBIT!
     */
    static async submitApplication(tenantId, employeeId, data, actorId, options) {
        if (!data.reason || !String(data.reason).trim()) {
            throw new LeaveHttpError("Leave reason is required.", 400);
        }
        const dryRun = await this.validateDryRun({
            tenantId,
            employeeId,
            leaveTypeId: data.leaveTypeId,
            startDate: data.startDate,
            endDate: data.endDate,
            halfDay: data.halfDay,
            halfDaySession: data.halfDaySession,
            reason: data.reason,
            bypassNoticePeriod: options?.bypassNoticePeriod,
        });
        if (!dryRun.isValid) {
            throw new LeaveHttpError(`Validation failed: ${dryRun.warnings.join("; ")}`, 400, "LEAVE_POLICY_VIOLATION", {
                warnings: dryRun.warnings,
            });
        }
        const start = new Date(data.startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(data.endDate);
        end.setUTCHours(0, 0, 0, 0);
        const employee = await prisma_1.rawPrisma.employee.findFirst({
            where: { id: employeeId, tenantId },
            select: { id: true, managerId: true, firstName: true, lastName: true, userId: true },
        });
        if (!employee) {
            throw new LeaveHttpError("Employee not found in this organization.", 404);
        }
        const cleanAttachmentUrl = data.attachmentUrl || data.attachment || null;
        if (cleanAttachmentUrl && String(cleanAttachmentUrl).startsWith("blob:")) {
            throw new LeaveHttpError("Invalid attachment URL: browser blob URLs cannot be persisted.", 400);
        }
        const application = await prisma_1.rawPrisma.$transaction(async (tx) => {
            // Concurrency-safe overlap re-check inside transaction
            const concurrentOverlap = await tx.leaveRequest.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    status: { in: ["pending", "approved"] },
                    startDate: { lte: end },
                    endDate: { gte: start },
                },
                select: { id: true },
            });
            if (concurrentOverlap) {
                throw new LeaveHttpError("An overlapping leave application already exists for this period.", 409, "DUPLICATE_LEAVE_SUBMISSION");
            }
            const req = await tx.leaveRequest.create({
                data: {
                    tenantId,
                    employeeId,
                    leaveTypeId: data.leaveTypeId,
                    approverId: employee.managerId || null,
                    startDate: start,
                    endDate: end,
                    days: dryRun.totalDays,
                    status: "pending",
                    reason: String(data.reason).trim(),
                    halfDay: Boolean(data.halfDay),
                    halfDaySession: data.halfDay ? data.halfDaySession || "first_half" : null,
                    attachmentUrl: cleanAttachmentUrl,
                },
                include: { leaveType: true, employee: true },
            });
            if (dryRun.isCompOff) {
                await this.reserveCompOffLotsFifo(tx, {
                    tenantId,
                    employeeId,
                    leaveTypeId: data.leaveTypeId,
                    leaveRequestId: req.id,
                    requiredDays: dryRun.totalDays,
                    leaveEndDate: end,
                });
            }
            await outbox_service_1.OutboxService.createEvent({
                tenantId,
                eventType: "leave.requested",
                entityType: "LeaveRequest",
                entityId: req.id,
                actorId: actorId || employee.userId || employeeId,
                payload: {
                    employeeId,
                    leaveTypeId: data.leaveTypeId,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    days: dryRun.totalDays,
                },
            }, tx);
            return req;
        });
        // If policy explicitly states requiresApproval = false, auto-approve through authoritative ledger flow
        if (dryRun.requiresApproval === false) {
            return await this.decideApplication(tenantId, application.id, "approve", "SYSTEM_POLICY_AUTO_APPROVAL", "Auto-approved per organization leave policy (Approval Not Required)", ["hr_admin"]);
        }
        if (employee.managerId) {
            prisma_1.rawPrisma.employee
                .findUnique({ where: { id: employee.managerId }, select: { userId: true } })
                .then((mgr) => {
                if (mgr?.userId) {
                    return notification_service_1.NotificationService.createNotification({
                        tenantId,
                        userId: mgr.userId,
                        title: "New Leave Application",
                        message: `${employee.firstName} ${employee.lastName} submitted a leave application for ${dryRun.totalDays} day(s).`,
                        type: "LEAVE_REQUESTED",
                        actionUrl: "/hr/leave/applications",
                    });
                }
            })
                .catch(() => { });
        }
        (0, socket_1.broadcastToTenant)(tenantId, "leave.requested", {
            id: application.id,
            employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
            days: dryRun.totalDays,
        });
        return application;
    }
    /**
     * Update an eligible PENDING leave application with full policy & balance re-validation.
     */
    static async updatePendingApplication(tenantId, requestId, data, actorId, options) {
        const existing = await prisma_1.rawPrisma.leaveRequest.findFirst({
            where: { id: requestId, tenantId },
            include: { employee: true, leaveType: true },
        });
        if (!existing) {
            throw new LeaveHttpError("Leave application not found.", 404);
        }
        if (!options?.isElevatedHR && options?.callerEmployeeId !== existing.employeeId) {
            throw new LeaveHttpError("Forbidden: You may only edit your own pending leave applications.", 403);
        }
        if (existing.status !== "pending") {
            throw new LeaveHttpError(`Only pending leave applications can be edited (current status: ${existing.status}).`, 400);
        }
        const nextLeaveTypeId = data.leaveTypeId || existing.leaveTypeId;
        if (!nextLeaveTypeId) {
            throw new LeaveHttpError("Leave type is required.", 400);
        }
        const nextStartStr = data.startDate || existing.startDate.toISOString().slice(0, 10);
        const nextEndStr = data.endDate || existing.endDate.toISOString().slice(0, 10);
        const nextHalfDay = data.halfDay !== undefined ? Boolean(data.halfDay) : existing.halfDay;
        const nextSession = nextHalfDay
            ? data.halfDaySession || existing.halfDaySession || "first_half"
            : null;
        const nextReason = data.reason !== undefined ? String(data.reason).trim() : existing.reason || "";
        if (!nextReason) {
            throw new LeaveHttpError("Leave reason is required.", 400);
        }
        const dryRun = await this.validateDryRun({
            tenantId,
            employeeId: existing.employeeId,
            leaveTypeId: nextLeaveTypeId,
            startDate: nextStartStr,
            endDate: nextEndStr,
            halfDay: nextHalfDay,
            halfDaySession: nextSession || undefined,
            reason: nextReason,
            excludeRequestId: requestId,
            bypassNoticePeriod: Boolean(options?.isElevatedHR),
        });
        if (!dryRun.isValid) {
            throw new LeaveHttpError(`Validation failed: ${dryRun.warnings.join("; ")}`, 400, "LEAVE_POLICY_VIOLATION", {
                warnings: dryRun.warnings,
            });
        }
        const start = new Date(nextStartStr);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(nextEndStr);
        end.setUTCHours(0, 0, 0, 0);
        const nextAttachmentUrl = data.attachmentUrl !== undefined ? data.attachmentUrl : existing.attachmentUrl;
        if (nextAttachmentUrl && String(nextAttachmentUrl).startsWith("blob:")) {
            throw new LeaveHttpError("Invalid attachment URL: browser blob URLs cannot be persisted.", 400);
        }
        const updated = await prisma_1.rawPrisma.$transaction(async (tx) => {
            const rec = await tx.leaveRequest.update({
                where: { id: requestId },
                data: {
                    leaveTypeId: nextLeaveTypeId,
                    startDate: start,
                    endDate: end,
                    days: dryRun.totalDays,
                    halfDay: nextHalfDay,
                    halfDaySession: nextSession,
                    reason: nextReason,
                    attachmentUrl: nextAttachmentUrl || null,
                },
                include: { leaveType: true, employee: true },
            });
            if (dryRun.isCompOff) {
                await this.reserveCompOffLotsFifo(tx, {
                    tenantId,
                    employeeId: existing.employeeId,
                    leaveTypeId: nextLeaveTypeId,
                    leaveRequestId: requestId,
                    requiredDays: dryRun.totalDays,
                    leaveEndDate: end,
                });
            }
            else {
                await this.releaseReservedCompOffLots(tx, tenantId, requestId);
            }
            return rec;
        });
        audit_service_1.AuditService.logMutation({
            tenantId,
            actorId,
            action: "LEAVE_APPLICATION_UPDATED",
            entityType: "LeaveRequest",
            entityId: requestId,
            oldState: {
                leaveTypeId: existing.leaveTypeId,
                startDate: existing.startDate,
                endDate: existing.endDate,
                days: Number(existing.days),
                reason: existing.reason,
            },
            newState: {
                leaveTypeId: updated.leaveTypeId,
                startDate: updated.startDate,
                endDate: updated.endDate,
                days: Number(updated.days),
                reason: updated.reason,
            },
        }).catch(() => { });
        return updated;
    }
    /**
     * Enforces reviewer authorization: elevated HR/Admin OR direct reporting manager OR active delegate.
     * Strictly forbids self-approval.
     */
    static async assertReviewerAuthorized(tenantId, reviewerUserId, reviewerRoles, targetEmployee) {
        if (reviewerUserId === "SYSTEM_POLICY_AUTO_APPROVAL")
            return;
        if (targetEmployee.userId && targetEmployee.userId === reviewerUserId) {
            throw new LeaveHttpError("Segregation of duties violation: Employees cannot approve or reject their own leave applications.", 403, "SELF_APPROVAL_FORBIDDEN");
        }
        if (this.isElevatedHrUser(reviewerRoles)) {
            return;
        }
        const reviewerEmp = await prisma_1.rawPrisma.employee.findFirst({
            where: { tenantId, userId: reviewerUserId },
            select: { id: true },
        });
        if (!reviewerEmp) {
            throw new LeaveHttpError("Forbidden: Only HR administrators or the employee's reporting manager can approve or reject this leave request.", 403, "UNAUTHORIZED_APPROVER");
        }
        if (targetEmployee.managerId && targetEmployee.managerId === reviewerEmp.id) {
            return;
        }
        // Check active ApprovalDelegation
        if (targetEmployee.managerId) {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const delegation = await prisma_1.rawPrisma.approvalDelegation.findFirst({
                where: {
                    tenantId,
                    managerId: targetEmployee.managerId,
                    delegateId: reviewerEmp.id,
                    status: "ACTIVE",
                    startDate: { lte: today },
                    endDate: { gte: today },
                },
            });
            if (delegation)
                return;
        }
        throw new LeaveHttpError("Forbidden: You are not the assigned reporting manager or authorized HR approver for this employee.", 403, "UNAUTHORIZED_APPROVER");
    }
    /**
     * Asserts AttendanceMonthLock is unlocked for distinct (year, month) pairs spanned by [startDate, endDate].
     */
    static async assertDateSpanUnlocked(tenantId, startDate, endDate) {
        const checked = new Set();
        const curr = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
        const endMonth = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
        while (curr <= endMonth) {
            const key = `${curr.getUTCFullYear()}-${curr.getUTCMonth() + 1}`;
            if (!checked.has(key)) {
                checked.add(key);
                await attendance_service_1.AttendanceService.assertMonthUnlocked(tenantId, curr);
            }
            curr.setUTCMonth(curr.getUTCMonth() + 1);
        }
    }
    /**
     * Authoritative Leave Approval / Rejection with concurrency guard and exact single ledger DEBIT.
     */
    static async decideApplication(tenantId, requestId, action, reviewerId, comments, reviewerRoles, options) {
        const request = await prisma_1.rawPrisma.leaveRequest.findUnique({
            where: { id: requestId },
            include: { leaveType: true, employee: true },
        });
        if (!request || request.tenantId !== tenantId) {
            throw new LeaveHttpError("Leave request not found.", 404);
        }
        if (request.status !== "pending") {
            throw new LeaveHttpError(`Request is already ${request.status}.`, 409, "INVALID_LEAVE_STATE");
        }
        // Resolve reviewer roles if not passed by caller
        let effectiveRoles = reviewerRoles;
        if (!effectiveRoles && reviewerId !== "SYSTEM_POLICY_AUTO_APPROVAL") {
            const userRec = await prisma_1.rawPrisma.user.findUnique({
                where: { id: reviewerId },
                include: { roles: true },
            });
            effectiveRoles = userRec?.roles?.map((r) => r.role) || [];
        }
        await this.assertReviewerAuthorized(tenantId, reviewerId, effectiveRoles, request.employee);
        if (action === "reject") {
            const executeReject = async (tx) => {
                const claimed = await tx.leaveRequest.updateMany({
                    where: { id: requestId, tenantId, status: "pending" },
                    data: {
                        status: "rejected",
                        approverId: reviewerId === "SYSTEM_POLICY_AUTO_APPROVAL" ? null : reviewerId,
                        rejectionReason: comments || "Rejected by reviewer",
                        approvedAt: new Date(),
                    },
                });
                if (claimed.count === 0) {
                    throw new LeaveHttpError("Leave request was already processed by another reviewer.", 409);
                }
                await this.releaseReservedCompOffLots(tx, tenantId, requestId);
                const req = await tx.leaveRequest.findUnique({
                    where: { id: requestId },
                    include: { leaveType: true, employee: true },
                });
                await outbox_service_1.OutboxService.createEvent({
                    tenantId,
                    eventType: "leave.rejected",
                    entityType: "LeaveRequest",
                    entityId: requestId,
                    actorId: reviewerId,
                    payload: { employeeId: request.employeeId, comments },
                }, tx);
                return req;
            };
            const updated = options?.tx
                ? await executeReject(options.tx)
                : await prisma_1.rawPrisma.$transaction(executeReject);
            if (!options?.suppressNotifications && request.employee?.userId) {
                notification_service_1.NotificationService.createNotification({
                    tenantId,
                    userId: request.employee.userId,
                    title: "Leave Application Rejected",
                    message: `Your leave request for ${request.days} day(s) was rejected. ${comments ? `Reason: ${comments}` : ""}`,
                    type: "LEAVE_REJECTED",
                    actionUrl: "/me/leave/applications",
                }).catch(() => { });
            }
            (0, socket_1.broadcastToTenant)(tenantId, "leave.rejected", { id: requestId, employeeId: request.employeeId });
            audit_service_1.AuditService.logMutation({
                tenantId,
                actorId: reviewerId === "SYSTEM_POLICY_AUTO_APPROVAL" ? null : reviewerId,
                action: "LEAVE_APPLICATION_REJECTED",
                entityType: "LeaveRequest",
                entityId: requestId,
                metadata: { comments, employeeId: request.employeeId, days: Number(request.days) },
            }).catch(() => { });
            return updated;
        }
        // APPROVE ACTION
        await this.assertDateSpanUnlocked(tenantId, request.startDate, request.endDate);
        const isCompOff = request.leaveType
            ? await this.isCompOffLeaveType(tenantId, request.leaveType)
            : false;
        const [{ policy: effectivePolicy }, holidays] = await Promise.all([
            request.leaveTypeId
                ? this.resolveEffectivePolicy(tenantId, request.leaveTypeId, request.employee.branchId, request.employee.departmentId, request.startDate)
                : Promise.resolve({ policy: null }),
            prisma_1.rawPrisma.holiday.findMany({
                where: {
                    tenantId,
                    status: "active",
                    date: { gte: request.startDate, lte: request.endDate },
                },
                select: { date: true },
            }),
        ]);
        const sandwichRule = Boolean(request.leaveType?.sandwichRule || effectivePolicy?.sandwichRule);
        const holidayDates = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));
        const end = new Date(request.endDate);
        end.setUTCHours(0, 0, 0, 0);
        const executeApprove = async (tx) => {
            if (isCompOff) {
                await tx.$queryRaw `SELECT id FROM employees WHERE id = ${request.employeeId} AND tenant_id = ${tenantId} FOR UPDATE`;
            }
            // Verify balance before approving paid or Comp-Off leave
            if (request.leaveTypeId && (request.leaveType?.isPaid !== false || isCompOff)) {
                const availableBefore = await this.getEmployeeBalance(tenantId, request.employeeId, request.leaveTypeId, request.startDate.getUTCFullYear(), { tx, excludeRequestId: requestId });
                if (availableBefore < Number(request.days)) {
                    throw new LeaveHttpError(`Cannot approve leave: employee only has ${availableBefore} day(s) available, but request requires ${Number(request.days)} day(s).`, 400, "INSUFFICIENT_LEAVE_BALANCE");
                }
            }
            // If Comp-Off, ensure valid non-expired FIFO allocations exist before approving
            let compOffAllocationsToConsume = [];
            if (isCompOff && request.leaveTypeId) {
                const existingReserved = await tx.compOffUsageAllocation.findMany({
                    where: { tenantId, leaveRequestId: requestId, status: "RESERVED" },
                    include: { compOffRequest: true },
                });
                let needsReallocation = existingReserved.length === 0;
                const reqDaysNum = Number(request.days);
                const reservedSum = Number(existingReserved.reduce((s, a) => s + Number(a.daysAllocated || 0), 0).toFixed(2));
                if (reservedSum !== reqDaysNum)
                    needsReallocation = true;
                for (const r of existingReserved) {
                    const lot = r.compOffRequest;
                    if (!lot ||
                        !["CREDITED", "PARTIALLY_USED"].includes(lot.status) ||
                        Number(lot.remainingDays || 0) < Number(r.daysAllocated || 0) ||
                        (lot.expiresAt && lot.expiresAt < end)) {
                        needsReallocation = true;
                        break;
                    }
                }
                if (needsReallocation) {
                    await this.reserveCompOffLotsFifo(tx, {
                        tenantId,
                        employeeId: request.employeeId,
                        leaveTypeId: request.leaveTypeId,
                        leaveRequestId: requestId,
                        requiredDays: reqDaysNum,
                        leaveEndDate: end,
                    });
                }
                const readyAllocations = await tx.compOffUsageAllocation.findMany({
                    where: { tenantId, leaveRequestId: requestId, status: "RESERVED" },
                    include: { compOffRequest: true },
                    orderBy: { createdAt: "asc" },
                });
                compOffAllocationsToConsume = readyAllocations.map((a) => ({
                    id: a.id,
                    compOffRequestId: a.compOffRequestId,
                    allocatedDays: Number(a.daysAllocated),
                    compOffLot: a.compOffRequest,
                }));
            }
            // Atomic status claim (prevents double-approval race conditions!)
            const claimed = await tx.leaveRequest.updateMany({
                where: { id: requestId, tenantId, status: "pending" },
                data: {
                    status: "approved",
                    approverId: reviewerId === "SYSTEM_POLICY_AUTO_APPROVAL" ? null : reviewerId,
                    approvedAt: new Date(),
                    ...(comments ? { rejectionReason: comments } : {}),
                },
            });
            if (claimed.count === 0) {
                throw new LeaveHttpError("Leave request was already processed by another reviewer.", 409);
            }
            // Write exactly ONE immutable ledger entry (DEBIT), preserving source Comp-Off credit reference when applicable
            let createdDebitId = null;
            if (request.leaveTypeId) {
                const existingDebit = await tx.leaveLedgerEntry.findFirst({
                    where: { tenantId, referenceId: requestId, entryType: "DEBIT" },
                    select: { id: true },
                });
                if (existingDebit) {
                    createdDebitId = existingDebit.id;
                }
                else {
                    const balanceBeforeDebit = await this.getEmployeeBalance(tenantId, request.employeeId, request.leaveTypeId, request.startDate.getUTCFullYear(), { tx, excludeRequestId: requestId });
                    const runningBalanceAfter = Number(Math.max(0, balanceBeforeDebit - Number(request.days)).toFixed(2));
                    const sourceCompOffRefText = compOffAllocationsToConsume.length > 0
                        ? ` [Comp-Off Ref: ${compOffAllocationsToConsume
                            .map((c) => `${c.compOffLot?.requestCode || c.compOffRequestId.slice(0, 8)}:${c.allocatedDays}d`)
                            .join(", ")}]`
                        : "";
                    const debitRec = await tx.leaveLedgerEntry.create({
                        data: {
                            tenantId,
                            employeeId: request.employeeId,
                            leaveTypeId: request.leaveTypeId,
                            entryType: "DEBIT",
                            days: request.days,
                            balance: runningBalanceAfter,
                            referenceId: requestId,
                            notes: (comments
                                ? `Approved leave #${requestId.slice(0, 8)} (${comments})${sourceCompOffRefText}`
                                : `Approved leave application #${requestId.slice(0, 8)}${sourceCompOffRefText}`).slice(0, 250),
                            effectiveAt: request.startDate,
                        },
                    });
                    createdDebitId = debitRec.id;
                }
            }
            // Consume Comp-Off FIFO lots and record audit events
            if (compOffAllocationsToConsume.length > 0) {
                for (const alloc of compOffAllocationsToConsume) {
                    await tx.compOffUsageAllocation.update({
                        where: { id: alloc.id },
                        data: {
                            status: "CONSUMED",
                            ledgerEntryId: createdDebitId,
                        },
                    });
                    const lot = await tx.leaveEncashmentRequest.findUnique({
                        where: { id: alloc.compOffRequestId },
                    });
                    if (lot) {
                        const newUsed = Number((Number(lot.usedDays || 0) + alloc.allocatedDays).toFixed(2));
                        const newRem = Number(Math.max(0, Number(lot.remainingDays || 0) - alloc.allocatedDays).toFixed(2));
                        const nextLotStatus = newRem <= 0 ? "USED" : "PARTIALLY_USED";
                        await tx.leaveEncashmentRequest.update({
                            where: { id: lot.id },
                            data: {
                                usedDays: newUsed,
                                remainingDays: newRem,
                                status: nextLotStatus,
                            },
                        });
                        await tx.leaveEncashmentCompOffEvent.create({
                            data: {
                                tenantId,
                                requestId: lot.id,
                                employeeId: request.employeeId,
                                transactionType: "COMP_OFF",
                                eventType: "UTILIZED",
                                actorId: reviewerId === "SYSTEM_POLICY_AUTO_APPROVAL" ? null : reviewerId,
                                fromStatus: lot.status,
                                toStatus: nextLotStatus,
                                days: alloc.allocatedDays,
                                ledgerEntryId: createdDebitId,
                                comments: `Consumed ${alloc.allocatedDays} day(s) against Leave Application #${requestId.slice(0, 8)}.`,
                                metadataJson: {
                                    leaveRequestId: requestId,
                                    allocatedDays: alloc.allocatedDays,
                                    remainingDays: newRem,
                                },
                            },
                        });
                    }
                }
            }
            // Sync Attendance records for deductible leave days
            const calc = this.calculateDeductibleDays(request.startDate, end, sandwichRule, holidayDates, request.halfDay);
            for (const dayItem of calc.breakdown) {
                if (!dayItem.isDeducted)
                    continue;
                const dayDate = new Date(`${dayItem.date}T00:00:00.000Z`);
                const attStatus = request.halfDay ? "half_day" : "on_leave";
                await tx.attendance.upsert({
                    where: {
                        tenantId_employeeId_date: {
                            tenantId,
                            employeeId: request.employeeId,
                            date: dayDate,
                        },
                    },
                    create: {
                        tenantId,
                        employeeId: request.employeeId,
                        date: dayDate,
                        status: attStatus,
                        notes: `Approved Leave: ${request.leaveType?.name || "Leave"}`,
                        source: "LEAVE_APPROVAL",
                    },
                    update: {
                        status: attStatus,
                        notes: `Approved Leave: ${request.leaveType?.name || "Leave"}`,
                    },
                });
            }
            const req = await tx.leaveRequest.findUnique({
                where: { id: requestId },
                include: { leaveType: true, employee: true },
            });
            await outbox_service_1.OutboxService.createEvent({
                tenantId,
                eventType: "leave.approved",
                entityType: "LeaveRequest",
                entityId: requestId,
                actorId: reviewerId,
                payload: {
                    employeeId: request.employeeId,
                    leaveTypeId: request.leaveTypeId,
                    days: request.days,
                },
            }, tx);
            await outbox_service_1.OutboxService.createEvent({
                tenantId,
                eventType: "leave.balance_changed",
                entityType: "LeaveLedgerEntry",
                entityId: requestId,
                actorId: reviewerId,
                payload: {
                    employeeId: request.employeeId,
                    leaveTypeId: request.leaveTypeId,
                },
            }, tx);
            return req;
        };
        const approved = options?.tx
            ? await executeApprove(options.tx)
            : await prisma_1.rawPrisma.$transaction(executeApprove);
        if (!options?.suppressNotifications && request.employee?.userId) {
            notification_service_1.NotificationService.createNotification({
                tenantId,
                userId: request.employee.userId,
                title: "Leave Application Approved",
                message: `Your ${request.leaveType?.name || "leave"} request for ${request.days} day(s) has been approved.`,
                type: "LEAVE_APPROVED",
                actionUrl: "/me/leave/applications",
            }).catch(() => { });
            if (isCompOff) {
                notification_service_1.NotificationService.createNotification({
                    tenantId,
                    userId: request.employee.userId,
                    title: "Comp-Off Balance Utilized",
                    message: `${request.days} day(s) of Comp-Off credit were utilized for your approved leave application.`,
                    type: "COMP_OFF_BALANCE_CHANGED",
                    actionUrl: "/me/leave/encashment-compoff",
                }).catch(() => { });
            }
        }
        (0, socket_1.broadcastToTenant)(tenantId, "leave.approved", {
            id: requestId,
            employeeId: request.employeeId,
            days: request.days,
        });
        audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: reviewerId === "SYSTEM_POLICY_AUTO_APPROVAL" ? null : reviewerId,
            action: "LEAVE_APPLICATION_APPROVED",
            entityType: "LeaveRequest",
            entityId: requestId,
            metadata: { comments, employeeId: request.employeeId, days: Number(request.days), isCompOff },
        }).catch(() => { });
        return approved;
    }
    /**
     * Cancel an approved or pending leave application with non-destructive compensating CREDIT ledger entry.
     */
    static async cancelApplication(tenantId, requestId, actorId, reason, options) {
        const request = await prisma_1.rawPrisma.leaveRequest.findUnique({
            where: { id: requestId },
            include: { leaveType: true, employee: true },
        });
        if (!request || request.tenantId !== tenantId) {
            throw new LeaveHttpError("Leave request not found.", 404);
        }
        if (request.status === "cancelled" || request.status === "rejected") {
            throw new LeaveHttpError(`Cannot cancel a request with status ${request.status}.`, 400);
        }
        if (request.status === "approved") {
            await this.assertDateSpanUnlocked(tenantId, request.startDate, request.endDate);
        }
        const isCompOff = request.leaveType
            ? await this.isCompOffLeaveType(tenantId, request.leaveType)
            : false;
        const holidays = await prisma_1.rawPrisma.holiday.findMany({
            where: {
                tenantId,
                date: { gte: request.startDate, lte: request.endDate },
                status: "active",
            },
            select: { date: true, name: true },
        });
        const holidayMap = new Map();
        holidays.forEach((h) => holidayMap.set(h.date.toISOString().slice(0, 10), h.name));
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const cancelled = await prisma_1.rawPrisma.$transaction(async (tx) => {
            if (isCompOff) {
                await tx.$queryRaw `SELECT id FROM employees WHERE id = ${request.employeeId} AND tenant_id = ${tenantId} FOR UPDATE`;
            }
            const claimed = await tx.leaveRequest.updateMany({
                where: { id: requestId, tenantId, status: { in: ["pending", "approved"] } },
                data: {
                    status: "cancelled",
                    ...(reason ? { rejectionReason: reason } : {}),
                },
            });
            if (claimed.count === 0) {
                throw new LeaveHttpError("Leave request was already cancelled.", 409);
            }
            if (request.status === "pending") {
                await this.releaseReservedCompOffLots(tx, tenantId, requestId);
            }
            // If it was approved, create a single compensating CREDIT entry (strictly idempotent)
            if (request.status === "approved" && request.leaveTypeId) {
                const consumedAllocations = await tx.compOffUsageAllocation.findMany({
                    where: { tenantId, leaveRequestId: requestId, status: "CONSUMED" },
                    include: { compOffRequest: true },
                });
                const sourceRefsNote = consumedAllocations.length > 0
                    ? ` [Comp-Off Ref: ${consumedAllocations
                        .map((a) => `${a.compOffRequest?.requestCode || a.compOffRequestId.slice(0, 8)}:${Number(a.allocatedDays)}d`)
                        .join(", ")}]`
                    : "";
                let reversalCreditId = null;
                const existingCredit = await tx.leaveLedgerEntry.findFirst({
                    where: { tenantId, referenceId: requestId, entryType: "CREDIT" },
                    select: { id: true },
                });
                if (existingCredit) {
                    reversalCreditId = existingCredit.id;
                }
                else {
                    // Ensure a DEBIT existed or create compensating CREDIT that restores exact post-reversal balance
                    const existingDebit = await tx.leaveLedgerEntry.findFirst({
                        where: { tenantId, referenceId: requestId, entryType: "DEBIT" },
                        select: { id: true },
                    });
                    // If legacy approved request had no DEBIT, write the historical DEBIT first or compute restored balance cleanly
                    if (!existingDebit) {
                        const balNow = await this.getEmployeeBalance(tenantId, request.employeeId, request.leaveTypeId, request.startDate.getUTCFullYear(), { tx });
                        await tx.leaveLedgerEntry.create({
                            data: {
                                tenantId,
                                employeeId: request.employeeId,
                                leaveTypeId: request.leaveTypeId,
                                entryType: "DEBIT",
                                days: request.days,
                                balance: Math.max(0, Number((balNow - Number(request.days)).toFixed(2))),
                                referenceId: requestId,
                                notes: `Historical approval debit for #${requestId.slice(0, 8)}`,
                                effectiveAt: request.startDate,
                            },
                        });
                    }
                    const balanceBeforeCredit = await this.getEmployeeBalance(tenantId, request.employeeId, request.leaveTypeId, request.startDate.getUTCFullYear(), { tx });
                    const restoredBalance = Number((balanceBeforeCredit + Number(request.days)).toFixed(2));
                    const creditEntry = await tx.leaveLedgerEntry.create({
                        data: {
                            tenantId,
                            employeeId: request.employeeId,
                            leaveTypeId: request.leaveTypeId,
                            entryType: "CREDIT",
                            days: request.days,
                            balance: restoredBalance,
                            referenceId: requestId,
                            notes: `Compensating reversal for ${options?.actionLabel || "cancelled"} leave #${requestId.slice(0, 8)}${sourceRefsNote}. Reason: ${reason || "Cancelled"}`.slice(0, 250),
                            effectiveAt: request.startDate,
                        },
                    });
                    reversalCreditId = creditEntry.id;
                }
                // Restore Comp-Off source lots (or immediately expire if lot's expiresAt already passed)
                if (consumedAllocations.length > 0) {
                    const nowTs = new Date();
                    for (const alloc of consumedAllocations) {
                        await tx.compOffUsageAllocation.update({
                            where: { id: alloc.id },
                            data: {
                                status: "RESTORED",
                                ledgerEntryId: reversalCreditId || alloc.ledgerEntryId,
                                restoredAt: nowTs,
                            },
                        });
                        const lot = await tx.leaveEncashmentRequest.findUnique({
                            where: { id: alloc.compOffRequestId },
                        });
                        if (!lot)
                            continue;
                        const allocDays = Number(alloc.daysAllocated || 0);
                        const newUsed = Number(Math.max(0, Number(lot.usedDays || 0) - allocDays).toFixed(2));
                        const isAlreadyPastExpiry = Boolean(lot.expiresAt && lot.expiresAt < nowTs);
                        if (!isAlreadyPastExpiry) {
                            const newRem = Number((Number(lot.remainingDays || 0) + allocDays).toFixed(2));
                            const nextLotStatus = newUsed > 0 ? "PARTIALLY_USED" : "CREDITED";
                            await tx.leaveEncashmentRequest.update({
                                where: { id: lot.id },
                                data: {
                                    usedDays: newUsed,
                                    remainingDays: newRem,
                                    status: nextLotStatus,
                                },
                            });
                            await tx.leaveEncashmentCompOffEvent.create({
                                data: {
                                    tenantId,
                                    requestId: lot.id,
                                    employeeId: request.employeeId,
                                    transactionType: "COMP_OFF",
                                    eventType: "USAGE_RESTORED",
                                    actorId: actorId,
                                    fromStatus: lot.status,
                                    toStatus: nextLotStatus,
                                    days: allocDays,
                                    ledgerEntryId: reversalCreditId,
                                    comments: `Restored ${allocDays} day(s) from cancelled Leave Application #${requestId.slice(0, 8)}.`,
                                    metadataJson: { leaveRequestId: requestId, restoredDays: allocDays, remainingDays: newRem },
                                },
                            });
                        }
                        else {
                            // Underlying Comp-Off lot expired while leave was active: record EXPIRY ledger so expired credit cannot be reused
                            const balBeforeExp = await this.getEmployeeBalance(tenantId, request.employeeId, request.leaveTypeId, nowTs.getUTCFullYear(), { tx, skipCompOffSweep: true });
                            const existingLotExpiry = await tx.leaveLedgerEntry.findFirst({
                                where: { tenantId, referenceId: lot.id, entryType: "EXPIRY" },
                                select: { id: true, days: true },
                            });
                            let expLedgerId = existingLotExpiry?.id || null;
                            if (!existingLotExpiry) {
                                const expEntry = await tx.leaveLedgerEntry.create({
                                    data: {
                                        tenantId,
                                        employeeId: request.employeeId,
                                        leaveTypeId: request.leaveTypeId,
                                        entryType: "EXPIRY",
                                        days: allocDays,
                                        balance: Math.max(0, Number((balBeforeExp - allocDays).toFixed(2))),
                                        referenceId: lot.id,
                                        notes: `Expired restored Comp-Off credit (${lot.requestCode || lot.id.slice(0, 8)}) upon leave cancellation`.slice(0, 250),
                                        effectiveAt: lot.expiresAt || nowTs,
                                    },
                                });
                                expLedgerId = expEntry.id;
                            }
                            else {
                                await tx.leaveLedgerEntry.update({
                                    where: { id: existingLotExpiry.id },
                                    data: {
                                        days: Number((Number(existingLotExpiry.days || 0) + allocDays).toFixed(2)),
                                    },
                                });
                            }
                            const newExp = Number((Number(lot.expiredDays || 0) + allocDays).toFixed(2));
                            await tx.leaveEncashmentRequest.update({
                                where: { id: lot.id },
                                data: {
                                    usedDays: newUsed,
                                    expiredDays: newExp,
                                    remainingDays: 0,
                                    status: "EXPIRED",
                                    expiredAt: lot.expiredAt || nowTs,
                                    expiryLedgerEntryId: expLedgerId,
                                },
                            });
                            await tx.leaveEncashmentCompOffEvent.create({
                                data: {
                                    tenantId,
                                    requestId: lot.id,
                                    employeeId: request.employeeId,
                                    transactionType: "COMP_OFF",
                                    eventType: "EXPIRED",
                                    actorId: actorId,
                                    fromStatus: lot.status,
                                    toStatus: "EXPIRED",
                                    days: allocDays,
                                    ledgerEntryId: expLedgerId,
                                    comments: `Restored ${allocDays} day(s) from cancelled Leave #${requestId.slice(0, 8)} immediately expired (past expiry date).`,
                                },
                            });
                        }
                    }
                }
                // Revert attendance records for affected dates
                const existingAtts = await tx.attendance.findMany({
                    where: {
                        tenantId,
                        employeeId: request.employeeId,
                        date: { gte: request.startDate, lte: request.endDate },
                        status: { in: ["on_leave", "half_day"] },
                    },
                });
                for (const existingAtt of existingAtts) {
                    const dayDate = new Date(existingAtt.date);
                    dayDate.setUTCHours(0, 0, 0, 0);
                    const dateStr = dayDate.toISOString().slice(0, 10);
                    const dayOfWeek = dayDate.getUTCDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isHoliday = holidayMap.has(dateStr);
                    if (isHoliday || isWeekend || (dayDate >= today && existingAtt.source === "LEAVE_APPROVAL")) {
                        await tx.attendance.delete({ where: { id: existingAtt.id } });
                    }
                    else if (existingAtt.source === "LEAVE_APPROVAL" && !existingAtt.checkIn) {
                        await tx.attendance.delete({ where: { id: existingAtt.id } });
                    }
                    else {
                        const revertedStatus = existingAtt.checkIn ? "present" : "absent";
                        await tx.attendance.update({
                            where: { id: existingAtt.id },
                            data: {
                                status: revertedStatus,
                                notes: `Leave ${options?.actionLabel || "cancelled"}. Prior status restored: ${revertedStatus}`,
                            },
                        });
                    }
                }
            }
            const req = await tx.leaveRequest.findUnique({
                where: { id: requestId },
                include: { leaveType: true, employee: true },
            });
            await outbox_service_1.OutboxService.createEvent({
                tenantId,
                eventType: "leave.cancelled",
                entityType: "LeaveRequest",
                entityId: requestId,
                actorId,
                payload: { employeeId: request.employeeId, reason },
            }, tx);
            return req;
        });
        if (isCompOff && request.status === "approved" && request.employee?.userId) {
            notification_service_1.NotificationService.createNotification({
                tenantId,
                userId: request.employee.userId,
                title: "Comp-Off Balance Updated",
                message: `Your cancelled Comp-Off leave request (${request.days} day(s)) has been reconciled in your balance.`,
                type: "COMP_OFF_BALANCE_CHANGED",
                actionUrl: "/me/leave/encashment-compoff",
            }).catch(() => { });
        }
        audit_service_1.AuditService.logMutation({
            tenantId,
            actorId,
            action: options?.actionLabel === "reversed"
                ? "LEAVE_APPLICATION_REVERSED"
                : "LEAVE_APPLICATION_CANCELLED",
            entityType: "LeaveRequest",
            entityId: requestId,
            metadata: { reason, employeeId: request.employeeId, days: Number(request.days), isCompOff },
        }).catch(() => { });
        (0, socket_1.broadcastToTenant)(tenantId, "leave.cancelled", { id: requestId, employeeId: request.employeeId });
        return cancelled;
    }
    /**
     * Authorized HR Reversal of a finalized (`approved` or `rejected`) leave request.
     * - If `approved`: cancels with compensating CREDIT ledger entry and restores attendance.
     * - If `rejected`: re-opens as `pending` for fresh review (preserving full audit trail).
     */
    static async reverseApplication(tenantId, requestId, actorId, reason, actorRoles) {
        if (!reason || !String(reason).trim()) {
            throw new LeaveHttpError("A reason is mandatory when reversing a leave decision.", 400);
        }
        const request = await prisma_1.rawPrisma.leaveRequest.findFirst({
            where: { id: requestId, tenantId },
            include: { employee: true, leaveType: true },
        });
        if (!request) {
            throw new LeaveHttpError("Leave request not found.", 404);
        }
        await this.assertReviewerAuthorized(tenantId, actorId, actorRoles, request.employee);
        if (request.status === "approved") {
            return await this.cancelApplication(tenantId, requestId, actorId, reason.trim(), {
                actionLabel: "reversed",
            });
        }
        if (request.status === "rejected") {
            const reopened = await prisma_1.rawPrisma.leaveRequest.update({
                where: { id: requestId },
                data: {
                    status: "pending",
                    rejectionReason: `Decision reversed: ${reason.trim()}`,
                    approvedAt: null,
                },
                include: { employee: true, leaveType: true },
            });
            audit_service_1.AuditService.logMutation({
                tenantId,
                actorId,
                action: "LEAVE_REJECTION_REVERSED",
                entityType: "LeaveRequest",
                entityId: requestId,
                metadata: { reason: reason.trim(), employeeId: request.employeeId },
            }).catch(() => { });
            return reopened;
        }
        throw new LeaveHttpError(`Only approved or rejected leave applications can be reversed (current status: ${request.status}).`, 400);
    }
    /**
     * Atomic, concurrency-safe manual CREDIT / DEBIT adjustment with mandatory reason and actor audit log.
     */
    static async adjustBalance(tenantId, params) {
        const { employeeId, leaveTypeId, entryType, notes, actorUserId, actorEmail } = params;
        const numDays = Number(params.days);
        if (!employeeId || !leaveTypeId) {
            throw new LeaveHttpError("employeeId and leaveTypeId are required.", 400);
        }
        if (!["CREDIT", "DEBIT"].includes(entryType)) {
            throw new LeaveHttpError("entryType must be 'CREDIT' or 'DEBIT'.", 400);
        }
        if (Number.isNaN(numDays) || numDays <= 0) {
            throw new LeaveHttpError("Adjustment days must be a positive number greater than 0.", 400);
        }
        if (!notes || !String(notes).trim()) {
            throw new LeaveHttpError("A reason/note is mandatory for manual leave balance adjustments.", 400);
        }
        const [emp, lt] = await Promise.all([
            prisma_1.rawPrisma.employee.findFirst({ where: { id: employeeId, tenantId }, select: { id: true } }),
            prisma_1.rawPrisma.leaveType.findFirst({ where: { id: leaveTypeId, tenantId }, select: { id: true, name: true } }),
        ]);
        if (!emp)
            throw new LeaveHttpError("Employee not found in this organization.", 404);
        if (!lt)
            throw new LeaveHttpError("Leave type not found in this organization.", 404);
        const now = new Date();
        const targetYear = params.year || now.getUTCFullYear();
        const effectiveAt = targetYear === now.getUTCFullYear()
            ? now
            : new Date(Date.UTC(targetYear, 0, 15, 12, 0, 0));
        return await prisma_1.rawPrisma.$transaction(async (tx) => {
            // Lock the employee row in transaction to serialize concurrent balance adjustments!
            await tx.$queryRaw `SELECT id FROM employees WHERE id = ${employeeId} AND tenant_id = ${tenantId} FOR UPDATE`;
            const currentBal = await this.getEmployeeBalance(tenantId, employeeId, leaveTypeId, targetYear, { tx });
            if (entryType === "DEBIT" && numDays > currentBal) {
                throw new LeaveHttpError(`Cannot debit ${numDays} day(s): current available balance for ${lt.name} is ${currentBal} day(s).`, 400, "INSUFFICIENT_BALANCE_FOR_DEBIT");
            }
            const newBal = entryType === "CREDIT"
                ? Number((currentBal + numDays).toFixed(2))
                : Number(Math.max(0, currentBal - numDays).toFixed(2));
            const rec = await tx.leaveLedgerEntry.create({
                data: {
                    tenantId,
                    employeeId,
                    leaveTypeId,
                    entryType,
                    days: numDays,
                    balance: newBal,
                    notes: String(notes).trim().slice(0, 255),
                    effectiveAt,
                },
            });
            await audit_service_1.AuditService.logMutation({
                tenantId,
                actorId: actorUserId,
                actorEmail: actorEmail || null,
                action: "LEAVE_BALANCE_MANUAL_ADJUSTMENT",
                entityType: "LeaveLedgerEntry",
                entityId: rec.id,
                newState: {
                    employeeId,
                    leaveTypeId,
                    leaveTypeName: lt.name,
                    entryType,
                    days: numDays,
                    previousBalance: currentBal,
                    newBalance: newBal,
                    year: targetYear,
                    reason: String(notes).trim(),
                },
            }, tx);
            return rec;
        });
    }
    /**
     * Synchronize initial yearly accrual leave balances for a newly created or target employee.
     * Delegates to syncTenantBalances with tenant scoping and idempotency.
     */
    static async synchronizeEmployeeYearlyAccruals(tenantId, year, actorId, employeeId) {
        return this.syncTenantBalances(tenantId, actorId, year, employeeId);
    }
    /**
     * Year-aware, idempotent Balance Synchronization for active employees and active leave types.
     * Checks ONLY `entryType = "ACCRUAL"` within `targetYear` so:
     * - Manual CREDIT/DEBIT adjustments never block initial entitlement sync
     * - Re-syncing never overwrites or duplicates allocations
     * - Unpaid 0-day leave types preserve `0` (never coerced to `12`!)
     */
    static async syncTenantBalances(tenantId, actorUserId, year, targetEmployeeId) {
        const targetYear = year || new Date().getUTCFullYear();
        const startOfYear = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
        const endOfYear = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
        const accrualEffectiveDate = targetYear === new Date().getUTCFullYear()
            ? new Date()
            : new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
        const empWhere = { tenantId };
        if (targetEmployeeId && targetEmployeeId !== "all") {
            empWhere.id = targetEmployeeId;
            empWhere.status = { not: "terminated" };
        }
        else {
            empWhere.status = "active";
        }
        const [employees, leaveTypes, existingAccruals, existingYearAdjustments] = await Promise.all([
            prisma_1.rawPrisma.employee.findMany({
                where: empWhere,
                select: { id: true, firstName: true, lastName: true, employeeCode: true, employmentCategory: true },
            }),
            prisma_1.rawPrisma.leaveType.findMany({
                where: { tenantId, status: "active" },
            }),
            prisma_1.rawPrisma.leaveLedgerEntry.findMany({
                where: {
                    tenantId,
                    entryType: "ACCRUAL",
                    effectiveAt: { gte: startOfYear, lte: endOfYear },
                    ...(targetEmployeeId && targetEmployeeId !== "all" ? { employeeId: targetEmployeeId } : {}),
                },
                select: { employeeId: true, leaveTypeId: true },
            }),
            prisma_1.rawPrisma.leaveLedgerEntry.findMany({
                where: {
                    tenantId,
                    entryType: { not: "ACCRUAL" },
                    effectiveAt: { gte: startOfYear, lte: endOfYear },
                    ...(targetEmployeeId && targetEmployeeId !== "all" ? { employeeId: targetEmployeeId } : {}),
                },
                select: { employeeId: true, leaveTypeId: true, entryType: true, days: true, referenceId: true },
            }),
        ]);
        const existingAccrualSet = new Set(existingAccruals.map((e) => `${e.employeeId}::${e.leaveTypeId}`));
        const netDeltaMap = new Map();
        for (const adj of existingYearAdjustments) {
            const k = `${adj.employeeId}::${adj.leaveTypeId}`;
            const d = Number(adj.days || 0);
            const cur = netDeltaMap.get(k) || 0;
            if (adj.entryType === "CREDIT" || adj.entryType === "CARRY_FORWARD") {
                netDeltaMap.set(k, cur + d);
            }
            else if (adj.entryType === "DEBIT" || adj.entryType === "ENCASHMENT" || adj.entryType === "EXPIRY") {
                netDeltaMap.set(k, cur - d);
            }
        }
        const entriesToCreate = [];
        for (const emp of employees) {
            // Skip external AP contractors for paid leave accruals
            const isExternalContractor = emp.employmentCategory === "vendor_outsourced" ||
                emp.employmentCategory === "consultant_freelancer";
            for (const lt of leaveTypes) {
                if (isExternalContractor && lt.isPaid)
                    continue;
                const key = `${emp.id}::${lt.id}`;
                if (!existingAccrualSet.has(key)) {
                    const quota = lt.daysPerYear !== undefined && lt.daysPerYear !== null ? Number(lt.daysPerYear) : 0;
                    const priorDelta = netDeltaMap.get(key) || 0;
                    entriesToCreate.push({
                        tenantId,
                        employeeId: emp.id,
                        leaveTypeId: lt.id,
                        entryType: "ACCRUAL",
                        days: quota,
                        balance: Math.max(0, Number((quota + priorDelta).toFixed(2))),
                        notes: `${targetYear} annual entitlement sync for ${lt.name}`,
                        effectiveAt: accrualEffectiveDate,
                    });
                    existingAccrualSet.add(key);
                }
            }
        }
        if (entriesToCreate.length > 0) {
            await prisma_1.rawPrisma.$transaction(async (tx) => {
                await tx.leaveLedgerEntry.createMany({
                    data: entriesToCreate,
                });
            });
        }
        const createdEntriesCount = entriesToCreate.length;
        if (actorUserId) {
            audit_service_1.AuditService.logMutation({
                tenantId,
                actorId: actorUserId,
                action: "LEAVE_BALANCES_SYNCHRONIZED",
                entityType: "LeaveLedgerEntry",
                entityId: tenantId,
                newState: {
                    year: targetYear,
                    employeesCount: employees.length,
                    createdEntriesCount,
                },
            }).catch(() => { });
        }
        return {
            success: true,
            year: targetYear,
            employeesCount: employees.length,
            createdEntriesCount,
            message: createdEntriesCount > 0
                ? `Synchronized ${targetYear} balances for ${employees.length} employee(s) (${createdEntriesCount} new ledger allocation(s) recorded).`
                : `All ${targetYear} leave entitlements are already synchronized (${employees.length} employee(s) verified, 0 duplicate allocations created).`,
        };
    }
    /**
     * Retrieve immutable leave ledger history for an employee, enriched with LeaveType and Actor metadata.
     */
    static async getEmployeeLedger(tenantId, employeeId, year) {
        const where = { tenantId, employeeId };
        if (year) {
            where.effectiveAt = {
                gte: new Date(Date.UTC(year, 0, 1, 0, 0, 0)),
                lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
            };
        }
        const [entries, leaveTypes, employee] = await Promise.all([
            prisma_1.rawPrisma.leaveLedgerEntry.findMany({
                where,
                orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
            }),
            prisma_1.rawPrisma.leaveType.findMany({ where: { tenantId } }),
            prisma_1.rawPrisma.employee.findFirst({
                where: { id: employeeId, tenantId },
                select: { id: true, firstName: true, lastName: true, employeeCode: true },
            }),
        ]);
        const typeMap = new Map(leaveTypes.map((t) => [t.id, t]));
        const entryIds = entries.map((e) => e.id);
        const refIds = entries.map((e) => e.referenceId).filter((r) => Boolean(r));
        const lookupEntityIds = Array.from(new Set([...entryIds, ...refIds]));
        const auditLogs = lookupEntityIds.length > 0
            ? await prisma_1.rawPrisma.auditLog.findMany({
                where: {
                    tenantId,
                    entityId: { in: lookupEntityIds },
                },
                orderBy: { createdAt: "desc" },
                select: { entityId: true, actorId: true, actorEmail: true, action: true },
            })
            : [];
        const actorIds = Array.from(new Set(auditLogs.map((a) => a.actorId).filter((x) => Boolean(x))));
        const actorUsers = actorIds.length > 0
            ? await prisma_1.rawPrisma.user.findMany({
                where: { id: { in: actorIds } },
                select: { id: true, email: true, profile: { select: { fullName: true } } },
            })
            : [];
        const userMap = new Map(actorUsers.map((u) => [u.id, u.profile?.fullName || u.email || "Authorized HR"]));
        const auditByEntity = new Map();
        for (const log of auditLogs) {
            if (!auditByEntity.has(log.entityId)) {
                const actorName = (log.actorId && userMap.get(log.actorId)) ||
                    log.actorEmail ||
                    (log.action === "LEAVE_BALANCES_SYNCHRONIZED" ? "HR Entitlement Sync" : "System");
                auditByEntity.set(log.entityId, { actorName, actorId: log.actorId });
            }
        }
        return entries.map((e) => {
            const auditInfo = auditByEntity.get(e.id) || (e.referenceId ? auditByEntity.get(e.referenceId) : undefined);
            const actorName = auditInfo?.actorName ||
                (e.entryType === "ACCRUAL" ? "System / HR Sync" : "HR / Workflow Engine");
            return {
                ...e,
                days: Number(e.days),
                balance: Number(e.balance),
                reason: e.notes || "",
                actorName,
                actorId: auditInfo?.actorId || null,
                employeeName: employee ? `${employee.firstName} ${employee.lastName}`.trim() : null,
                employeeCode: employee?.employeeCode || null,
                leaveType: typeMap.get(e.leaveTypeId) || null,
            };
        });
    }
    /**
     * Returns all active Leave Types + resolved applicable Leave Policies + live balances + eligibility flags
     * for an authenticated Employee Self-Service caller in minimal parallel queries.
     */
    static async getEligibleEmployeeLeaveCatalog(tenantId, employeeId, year) {
        const targetYear = year || new Date().getUTCFullYear();
        const refDate = new Date();
        refDate.setUTCHours(0, 0, 0, 0);
        const [employee, activeTypes, allPolicies, detailedBalances, activeProbation] = await Promise.all([
            prisma_1.rawPrisma.employee.findFirst({
                where: { id: employeeId, tenantId },
                include: { branch: true, department: true },
            }),
            prisma_1.rawPrisma.leaveType.findMany({
                where: { tenantId, status: "active" },
                orderBy: { name: "asc" },
            }),
            prisma_1.rawPrisma.leavePolicy.findMany({
                where: { tenantId, status: "active" },
                include: { leaveType: true },
                orderBy: [{ isDefault: "asc" }, { updatedAt: "desc" }],
            }),
            this.getEmployeeDetailedBalances(tenantId, employeeId, targetYear),
            prisma_1.rawPrisma.probationRecord.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    status: { in: ["active", "in_progress", "extended"] },
                    startDate: { lte: refDate },
                    endDate: { gte: refDate },
                },
            }),
        ]);
        if (!employee) {
            throw new LeaveHttpError("Employee profile not found.", 404);
        }
        const isOnProbation = Boolean(activeProbation || employee.employmentCategory === "probationary");
        const isExternalContractor = employee.employmentCategory === "vendor_outsourced" ||
            employee.employmentCategory === "consultant_freelancer";
        const balanceMap = new Map(detailedBalances.map((b) => [b.leaveTypeId, b]));
        const matchesScope = (p) => {
            if (p.branchId && p.branchId !== employee.branchId)
                return false;
            if (p.departmentId && p.departmentId !== employee.departmentId)
                return false;
            return true;
        };
        const isWithinDates = (p) => {
            if (p.effectiveFrom) {
                const ef = new Date(p.effectiveFrom);
                ef.setUTCHours(0, 0, 0, 0);
                if (refDate < ef)
                    return false;
            }
            if (p.effectiveTo) {
                const et = new Date(p.effectiveTo);
                et.setUTCHours(23, 59, 59, 999);
                if (refDate > et)
                    return false;
            }
            return true;
        };
        const scopedActivePolicies = allPolicies.filter((p) => matchesScope(p) && isWithinDates(p));
        const defaultPolicy = scopedActivePolicies.find((p) => p.isDefault) ||
            scopedActivePolicies.find((p) => !p.leaveTypeId) ||
            null;
        const items = activeTypes.map((lt) => {
            const typeCandidates = scopedActivePolicies
                .filter((p) => p.leaveTypeId === lt.id)
                .sort((a, b) => (b.branchId ? 2 : 0) +
                (b.departmentId ? 2 : 0) -
                ((a.branchId ? 2 : 0) + (a.departmentId ? 2 : 0)));
            const resolvedPolicy = typeCandidates[0] || defaultPolicy;
            const rules = this.parsePolicyRules(resolvedPolicy, lt);
            const bal = balanceMap.get(lt.id);
            let eligible = true;
            let ineligibilityReason = null;
            if (isExternalContractor && lt.isPaid) {
                eligible = false;
                ineligibilityReason = "External contractors/consultants are only eligible for unpaid leave notes.";
            }
            else if (resolvedPolicy && !resolvedPolicy.probationAllowed && isOnProbation) {
                eligible = false;
                ineligibilityReason = "Not available during active probation period.";
            }
            const resolvedCarryEnabled = Boolean(resolvedPolicy ? resolvedPolicy.carryForwardEnabled : false);
            const resolvedCarryDays = resolvedPolicy
                ? resolvedPolicy.carryForwardEnabled
                    ? Number(resolvedPolicy.maxCarryForwardDays ?? 0)
                    : 0
                : 0;
            return {
                id: lt.id,
                leaveTypeId: lt.id,
                name: lt.name,
                code: lt.code || lt.name.slice(0, 3).toUpperCase(),
                description: resolvedPolicy?.description || lt.description || null,
                color: lt.color || "#3b82f6",
                daysPerYear: Number(lt.daysPerYear ?? 0),
                isPaid: lt.isPaid,
                carryForward: resolvedCarryEnabled,
                maxCarryForward: resolvedCarryDays,
                halfDayAllowed: Boolean(lt.halfDayAllowed && rules.halfDayAllowed),
                sandwichRule: Boolean(lt.sandwichRule || resolvedPolicy?.sandwichRule),
                status: lt.status,
                eligible,
                ineligibilityReason,
                ineligibleReason: ineligibilityReason,
                availableBalance: bal?.available ?? Number(lt.daysPerYear ?? 0),
                usedBalance: bal?.used ?? 0,
                pendingBalance: bal?.pending ?? 0,
                carryForwardBalance: bal?.carryForward ?? 0,
                totalEntitlement: bal?.total ?? Number(lt.daysPerYear ?? 0),
                policy: {
                    id: resolvedPolicy?.id || null,
                    name: resolvedPolicy?.name || `${lt.name} Standard Policy`,
                    code: resolvedPolicy?.code || lt.code || "STD",
                    description: resolvedPolicy?.description || lt.description || null,
                    minDays: rules.minDays,
                    maxConsecutiveDays: resolvedPolicy?.maxConsecutiveDays ?? 14,
                    noticeDays: resolvedPolicy?.noticeDays ?? 0,
                    carryForward: resolvedCarryDays,
                    carryForwardEnabled: resolvedCarryEnabled,
                    maxCarryForwardDays: resolvedCarryDays,
                    requiresApproval: resolvedPolicy?.requiresApproval ?? true,
                    probationAllowed: resolvedPolicy?.probationAllowed ?? true,
                    halfDayAllowed: Boolean(lt.halfDayAllowed && rules.halfDayAllowed),
                    sandwichRule: Boolean(lt.sandwichRule || resolvedPolicy?.sandwichRule),
                    accrualFrequency: resolvedPolicy?.accrualFrequency || "yearly",
                    effectiveFrom: resolvedPolicy?.effectiveFrom || null,
                    effectiveTo: resolvedPolicy?.effectiveTo || null,
                    isDefault: resolvedPolicy?.isDefault ?? false,
                },
            };
        });
        return {
            employee: {
                id: employee.id,
                name: `${employee.firstName} ${employee.lastName}`.trim(),
                employeeCode: employee.employeeCode,
                department: employee.department?.name || "General",
                branch: employee.branch?.name || "Headquarters",
                employmentCategory: employee.employmentCategory || "permanent",
                isOnProbation,
            },
            year: targetYear,
            leaveTypes: items,
        };
    }
}
exports.LeaveService = LeaveService;
