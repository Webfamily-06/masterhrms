"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractLifecycleService = exports.DEFAULT_CONTRACT_EXPIRY_SETTINGS = void 0;
const prisma_js_1 = require("../prisma.js");
const notification_service_js_1 = require("./notification.service.js");
const outbox_service_js_1 = require("./outbox.service.js");
const audit_service_js_1 = require("./audit.service.js");
exports.DEFAULT_CONTRACT_EXPIRY_SETTINGS = {
    reminderIntervals: [60, 30, 15, 7],
    notifyEmployee: true,
    notifyHR: true,
    notifyManager: true,
    escalationDays: 7,
};
class ContractLifecycleService {
    /**
     * Pure classification function for an employee contract against a reference date.
     */
    static classifyContract(contract, referenceDate = new Date(), intervals = [60, 30, 15, 7]) {
        const rawStatus = (contract.status || "").toLowerCase().trim();
        if (rawStatus === "renewed" || rawStatus === "superseded") {
            return {
                classification: "RENEWED",
                daysRemaining: null,
                isExpired: false,
                isExpiringSoon: false,
                stage: "none",
            };
        }
        if (rawStatus === "converted") {
            return {
                classification: "CONVERTED",
                daysRemaining: null,
                isExpired: false,
                isExpiringSoon: false,
                stage: "none",
            };
        }
        if (rawStatus === "terminated" || rawStatus === "cancelled") {
            return {
                classification: "TERMINATED",
                daysRemaining: null,
                isExpired: false,
                isExpiringSoon: false,
                stage: "none",
            };
        }
        if (!contract.endDate) {
            return {
                classification: "ACTIVE",
                daysRemaining: null,
                isExpired: false,
                isExpiringSoon: false,
                stage: "none",
            };
        }
        const expDate = new Date(contract.endDate);
        const expMidnight = Date.UTC(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
        const refMidnight = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
        const diffDays = Math.round((expMidnight - refMidnight) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            return {
                classification: "EXPIRED",
                daysRemaining: diffDays,
                isExpired: true,
                isExpiringSoon: false,
                stage: "expired",
            };
        }
        if (diffDays === 0) {
            return {
                classification: "EXPIRING_TODAY",
                daysRemaining: 0,
                isExpired: false,
                isExpiringSoon: true,
                stage: "today",
            };
        }
        if (diffDays <= 7 && (intervals.includes(7) || intervals.some((i) => i <= 7))) {
            return {
                classification: "EXPIRING_7_DAYS",
                daysRemaining: diffDays,
                isExpired: false,
                isExpiringSoon: true,
                stage: "7_days",
            };
        }
        if (diffDays <= 15 && (intervals.includes(15) || intervals.some((i) => i <= 15))) {
            return {
                classification: "EXPIRING_15_DAYS",
                daysRemaining: diffDays,
                isExpired: false,
                isExpiringSoon: true,
                stage: "15_days",
            };
        }
        if (diffDays <= 30 && (intervals.includes(30) || intervals.some((i) => i <= 30))) {
            return {
                classification: "EXPIRING_30_DAYS",
                daysRemaining: diffDays,
                isExpired: false,
                isExpiringSoon: true,
                stage: "30_days",
            };
        }
        if (diffDays <= 60 && (intervals.includes(60) || intervals.some((i) => i <= 60))) {
            return {
                classification: "EXPIRING_60_DAYS",
                daysRemaining: diffDays,
                isExpired: false,
                isExpiringSoon: true,
                stage: "60_days",
            };
        }
        return {
            classification: "ACTIVE",
            daysRemaining: diffDays,
            isExpired: false,
            isExpiringSoon: false,
            stage: "none",
        };
    }
    /**
     * Deterministic idempotency key for contract expiration reminders.
     * Pattern: cnt_exp_{contractId}_{endDate}_{stage}
     */
    static generateIdempotencyKey(contractId, endDate, stage) {
        const d = new Date(endDate);
        const dateStr = d.toISOString().slice(0, 10);
        return `cnt_exp_${contractId}_${dateStr}_${stage}`;
    }
    static buildIdempotencyKey(contractId, endDate, stage) {
        return this.generateIdempotencyKey(contractId, endDate, stage);
    }
    /**
     * Read organization/tenant contract expiry settings from database or fallback to defaults.
     */
    static async getTenantExpirySettings(tenantId, dbOverride) {
        const db = dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
        try {
            const setting = await db.setting.findFirst({
                where: {
                    scope: "TENANT",
                    scopeId: tenantId,
                    group: "contracts",
                    key: "contract_expiry_reminders",
                },
            });
            if (setting && setting.valueJson) {
                const val = typeof setting.valueJson === "string" ? JSON.parse(setting.valueJson) : setting.valueJson;
                return {
                    reminderIntervals: Array.isArray(val.reminderIntervals)
                        ? val.reminderIntervals
                        : exports.DEFAULT_CONTRACT_EXPIRY_SETTINGS.reminderIntervals,
                    notifyEmployee: val.notifyEmployee ?? exports.DEFAULT_CONTRACT_EXPIRY_SETTINGS.notifyEmployee,
                    notifyHR: val.notifyHR ?? exports.DEFAULT_CONTRACT_EXPIRY_SETTINGS.notifyHR,
                    notifyManager: val.notifyManager ?? exports.DEFAULT_CONTRACT_EXPIRY_SETTINGS.notifyManager,
                    escalationDays: val.escalationDays ?? exports.DEFAULT_CONTRACT_EXPIRY_SETTINGS.escalationDays,
                };
            }
        }
        catch (err) {
            console.warn("[ContractLifecycleService] Failed to load tenant contract settings:", err.message);
        }
        return exports.DEFAULT_CONTRACT_EXPIRY_SETTINGS;
    }
    /**
     * Update tenant-configured contract expiry settings.
     */
    static async updateTenantExpirySettings(tenantId, settings, actorUserId, dbOverride) {
        const db = dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
        const current = await this.getTenantExpirySettings(tenantId, db);
        const updated = {
            reminderIntervals: Array.isArray(settings.reminderIntervals)
                ? settings.reminderIntervals
                : current.reminderIntervals,
            notifyEmployee: settings.notifyEmployee ?? current.notifyEmployee,
            notifyHR: settings.notifyHR ?? current.notifyHR,
            notifyManager: settings.notifyManager ?? current.notifyManager,
            escalationDays: settings.escalationDays ?? current.escalationDays,
        };
        const existing = await db.setting.findFirst({
            where: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "contracts",
                key: "contract_expiry_reminders",
            },
        });
        if (existing) {
            await db.setting.update({
                where: { id: existing.id },
                data: {
                    valueJson: updated,
                    updatedBy: actorUserId || null,
                },
            });
        }
        else {
            await db.setting.create({
                data: {
                    scope: "TENANT",
                    scopeId: tenantId,
                    group: "contracts",
                    key: "contract_expiry_reminders",
                    valueJson: updated,
                    valueType: "json",
                    updatedBy: actorUserId || null,
                },
            });
        }
        return updated;
    }
    /**
     * Dispatches an automated contract expiry reminder idempotently.
     */
    static async dispatchContractNotification(params) {
        const { tenantId, contract, stage, daysRemaining, dbOverride } = params;
        const db = dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
        if (!contract.endDate || stage === "none") {
            return { dispatched: false, alreadyProcessed: false };
        }
        const settings = params.settings || (await this.getTenantExpirySettings(tenantId, db));
        const idempotencyKey = this.generateIdempotencyKey(contract.id, contract.endDate, stage);
        // 1. Check for existing notification in database
        const existingNotif = await db.notification.findFirst({
            where: {
                tenantId,
                metadataJson: {
                    path: ["idempotencyKey"],
                    equals: idempotencyKey,
                },
            },
        });
        if (existingNotif) {
            return { dispatched: false, alreadyProcessed: true };
        }
        const emp = contract.employee;
        const employeeName = emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() : "Employee";
        const employeeUserId = emp?.userId;
        const stageTitles = {
            "60_days": `Contract Expiring in 60 Days: ${contract.title}`,
            "30_days": `Contract Expiring in 30 Days: ${contract.title}`,
            "15_days": `Contract Expiring in 15 Days: ${contract.title}`,
            "7_days": `URGENT: Contract Expiring in 7 Days: ${contract.title}`,
            today: `Contract Concludes Today: ${contract.title}`,
            expired: `EXPIRED CONTRACT: Action Required for ${contract.title}`,
        };
        const stageBodies = {
            "60_days": `Your employment contract "${contract.title}" will expire in 60 days on ${new Date(contract.endDate).toLocaleDateString()}. HR planning review initialized.`,
            "30_days": `Your employment contract "${contract.title}" will expire in 30 days on ${new Date(contract.endDate).toLocaleDateString()}. Please consult with HR regarding renewal terms.`,
            "15_days": `Your employment contract "${contract.title}" will expire in 15 days on ${new Date(contract.endDate).toLocaleDateString()}.`,
            "7_days": `URGENT: Your contract "${contract.title}" expires in 7 days! HR renewal action is required.`,
            today: `Your contract "${contract.title}" reaches its concluding term today (${new Date(contract.endDate).toLocaleDateString()}).`,
            expired: `Contract "${contract.title}" concluded on ${new Date(contract.endDate).toLocaleDateString()}. Please ensure renewal or exit processing is complete.`,
        };
        const title = stageTitles[stage] || `Contract Lifecycle Update: ${contract.title}`;
        const body = stageBodies[stage] || `Contract status update for ${employeeName}`;
        // 2. Dispatch to Employee if user exists and setting enabled
        if (employeeUserId && settings.notifyEmployee) {
            await notification_service_js_1.NotificationService.createNotification({
                tenantId,
                userId: employeeUserId,
                title,
                message: body,
                type: "CONTRACT_EXPIRY",
                actionUrl: "/me/documents/contracts",
                metadata: {
                    idempotencyKey,
                    contractId: contract.id,
                    stage,
                    daysRemaining,
                },
            });
        }
        // 3. Notify HR Admins for action if setting enabled
        if (settings.notifyHR) {
            try {
                const hrRoles = await db.userRole.findMany({
                    where: {
                        tenantId,
                        role: { in: ["hr_admin", "super_admin"] },
                    },
                    select: { userId: true },
                    take: 5,
                });
                for (const hr of hrRoles) {
                    await notification_service_js_1.NotificationService.createNotification({
                        tenantId,
                        userId: hr.userId,
                        title: `[HR Contract Alert] ${employeeName}: ${title}`,
                        message: `Employee ${employeeName}'s contract (${contract.title}) ${stage === "expired" ? "has expired" : `expires in ${daysRemaining} days`}.`,
                        type: "HR_CONTRACT_EXPIRY_ALERT",
                        actionUrl: "/hr/documents/contracts",
                        metadata: {
                            idempotencyKey: `${idempotencyKey}_hr_${hr.userId}`,
                            contractId: contract.id,
                            employeeId: contract.employeeId,
                            stage,
                        },
                    });
                }
            }
            catch (hrErr) {
                console.warn("[ContractLifecycleService] HR notification error:", hrErr.message);
            }
        }
        // 4. Outbox Event
        try {
            await outbox_service_js_1.OutboxService.createOutboxEvent({
                tenantId,
                eventType: stage === "expired" ? "CONTRACT_EXPIRED" : "CONTRACT_EXPIRING_SOON",
                entityType: "EmployeeContract",
                entityId: contract.id,
                payload: {
                    idempotencyKey,
                    contractId: contract.id,
                    contractTitle: contract.title,
                    employeeId: contract.employeeId,
                    employeeName,
                    stage,
                    daysRemaining,
                    endDate: contract.endDate,
                },
                metadata: {
                    idempotencyKey,
                    source: "ContractLifecycleService",
                },
            }, dbOverride);
        }
        catch (outboxErr) {
            console.warn("[ContractLifecycleService] Outbox event error:", outboxErr.message);
        }
        return { dispatched: true, alreadyProcessed: false };
    }
    /**
     * Executes atomic Contract Renewal Workflow:
     * 1. Marks predecessor contract as 'renewed'
     * 2. Preserves predecessor terms and audit lineage
     * 3. Creates successor renewed contract record with carried forward category/vendor
     * 4. Enforces no date overlap across active contracts
     * 5. Emits audit and outbox events
     */
    static async renewContract(params) {
        const { tenantId, actorUserId, predecessorId, renewal, dbOverride } = params;
        const db = dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
        const predecessor = await db.employeeContract.findFirst({
            where: { id: predecessorId, tenantId },
            include: {
                employee: { select: { id: true, userId: true, firstName: true, lastName: true, employeeCode: true } },
            },
        });
        if (!predecessor) {
            throw new Error("Predecessor contract not found in current tenant context.");
        }
        if (predecessor.status === "renewed" || predecessor.status === "superseded") {
            throw new Error("Cannot renew a contract that has already been renewed or superseded.");
        }
        if (predecessor.status === "converted") {
            throw new Error("Cannot renew a contract that has already been converted to permanent employment.");
        }
        const startDate = new Date(renewal.startDate);
        const endDate = renewal.endDate ? new Date(renewal.endDate) : null;
        if (endDate && endDate <= startDate) {
            throw new Error("Contract end date must be after the contract start date.");
        }
        // Overlap validation: Ensure no other active contract overlaps with this renewal period for this employee
        const conflictingContracts = await db.employeeContract.findMany({
            where: {
                tenantId,
                employeeId: predecessor.employeeId,
                id: { not: predecessor.id },
                status: "active",
                AND: [
                    { startDate: { lte: endDate || new Date("2099-12-31") } },
                    {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: startDate } },
                        ],
                    },
                ],
            },
        });
        if (conflictingContracts.length > 0) {
            throw new Error(`Conflicting active contract found (${conflictingContracts[0].title}). Active contract dates cannot overlap.`);
        }
        const renewalTitle = renewal.title || `${predecessor.title} (Renewed)`;
        const newSalary = renewal.salary !== undefined ? Number(renewal.salary) : predecessor.salary;
        const newHourlyRate = renewal.hourlyRate !== undefined ? Number(renewal.hourlyRate) : predecessor.hourlyRate;
        const newContractTypeId = renewal.contractTypeId || predecessor.contractTypeId;
        const newCategory = renewal.category || predecessor.category || "direct_contract";
        const newPaymentWorkflow = renewal.paymentWorkflow || predecessor.paymentWorkflow || "PAYROLL";
        const newSupplierId = renewal.supplierId || predecessor.supplierId || null;
        const newBillingFrequency = renewal.billingFrequency || predecessor.billingFrequency || "monthly";
        const seq = Math.floor(1000 + Math.random() * 9000);
        const generatedContractNumber = `CNT-${startDate.getFullYear()}-${seq}`;
        // Atomic update + insert
        const [updatedPredecessor, newContract] = await db.$transaction([
            db.employeeContract.update({
                where: { id: predecessor.id },
                data: {
                    status: "renewed",
                    notes: predecessor.notes
                        ? `${predecessor.notes}\n[Renewed on ${new Date().toISOString().slice(0, 10)} by user ${actorUserId}]`
                        : `[Renewed on ${new Date().toISOString().slice(0, 10)} by user ${actorUserId}]`,
                },
            }),
            db.employeeContract.create({
                data: {
                    tenantId,
                    employeeId: predecessor.employeeId,
                    contractNumber: generatedContractNumber,
                    contractTypeId: newContractTypeId,
                    category: newCategory,
                    paymentWorkflow: newPaymentWorkflow,
                    supplierId: newSupplierId,
                    title: renewalTitle,
                    startDate,
                    endDate,
                    salary: newSalary,
                    hourlyRate: newHourlyRate,
                    billingFrequency: newBillingFrequency,
                    notes: renewal.notes
                        ? `Renewal of predecessor contract ${predecessor.id}. ${renewal.notes}`
                        : `Renewal of predecessor contract ${predecessor.id}`,
                    status: "active",
                },
                include: {
                    employee: {
                        select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true },
                    },
                    contractType: true,
                    supplier: true,
                },
            }),
        ]);
        // Record Audit mutation
        try {
            await audit_service_js_1.AuditService.logMutation({
                tenantId,
                actorId: actorUserId,
                action: "CONTRACT_RENEWED",
                entityType: "EmployeeContract",
                entityId: newContract.id,
                metadata: {
                    predecessorId: predecessor.id,
                    newContractId: newContract.id,
                    employeeId: predecessor.employeeId,
                    startDate: newContract.startDate,
                    endDate: newContract.endDate,
                },
            });
        }
        catch (auditErr) {
            console.warn("[ContractLifecycleService] Audit error:", auditErr.message);
        }
        // Outbox Event
        try {
            await outbox_service_js_1.OutboxService.createOutboxEvent({
                tenantId,
                eventType: "CONTRACT_RENEWED",
                entityType: "EmployeeContract",
                entityId: newContract.id,
                actorId: actorUserId,
                payload: {
                    predecessorId: predecessor.id,
                    newContractId: newContract.id,
                    employeeId: predecessor.employeeId,
                    title: newContract.title,
                    startDate: newContract.startDate,
                    endDate: newContract.endDate,
                },
            });
        }
        catch (outboxErr) {
            console.warn("[ContractLifecycleService] Outbox error:", outboxErr.message);
        }
        // Notify employee of renewal
        if (predecessor.employee?.userId) {
            try {
                await notification_service_js_1.NotificationService.createNotification({
                    tenantId,
                    userId: predecessor.employee.userId,
                    title: `Contract Renewed: ${newContract.title}`,
                    message: `Your employment contract has been successfully renewed through ${endDate ? endDate.toLocaleDateString() : "Indefinite term"}.`,
                    type: "CONTRACT_RENEWED",
                    actionUrl: "/me/documents/contracts",
                    metadata: {
                        contractId: newContract.id,
                        predecessorId: predecessor.id,
                    },
                });
            }
            catch (notifErr) {
                console.warn("[ContractLifecycleService] Notification error:", notifErr.message);
            }
        }
        return {
            predecessor: updatedPredecessor,
            contract: newContract,
            successor: newContract,
        };
    }
    /**
     * Converts a contract employee to Permanent Full-Time statutory employment:
     * 1. Updates contract record (converted_to_permanent = true, converted_at = now, status = 'converted')
     * 2. Updates employee master (employmentType = 'full_time', employmentCategory = 'permanent', clears supplierId)
     * 3. Emits audit & notification
     */
    static async convertContractToPermanent(params) {
        const { tenantId, contractId, actorUserId, salary, notes, dbOverride } = params;
        const db = dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
        const contract = await db.employeeContract.findFirst({
            where: { id: contractId, tenantId },
            include: {
                employee: true,
            },
        });
        if (!contract) {
            throw new Error("Contract not found.");
        }
        if (contract.status === "converted") {
            throw new Error("Contract has already been converted to permanent.");
        }
        if (contract.status === "terminated") {
            throw new Error("Cannot convert a terminated contract to permanent employment.");
        }
        const conversionDate = new Date();
        const finalSalary = salary !== undefined ? Number(salary) : contract.salary ? Number(contract.salary) : undefined;
        const [updatedContract, updatedEmployee] = await db.$transaction([
            db.employeeContract.update({
                where: { id: contract.id },
                data: {
                    status: "converted",
                    convertedToPermanent: true,
                    convertedAt: conversionDate,
                    notes: notes
                        ? `${contract.notes || ""}\n[Converted to permanent on ${conversionDate.toISOString().slice(0, 10)} by user ${actorUserId}. ${notes}]`
                        : `${contract.notes || ""}\n[Converted to permanent on ${conversionDate.toISOString().slice(0, 10)} by user ${actorUserId}]`,
                },
            }),
            db.employee.update({
                where: { id: contract.employeeId },
                data: {
                    employmentType: "full_time",
                    employmentCategory: "permanent",
                    supplierId: null, // No longer an agency worker
                    permanentEmploymentDate: conversionDate,
                    salary: finalSalary,
                },
            }),
        ]);
        // Record Audit mutation
        try {
            await audit_service_js_1.AuditService.logMutation({
                tenantId,
                actorId: actorUserId,
                action: "CONTRACT_CONVERTED_TO_PERMANENT",
                entityType: "EmployeeContract",
                entityId: contract.id,
                metadata: {
                    contractId: contract.id,
                    employeeId: contract.employeeId,
                    conversionDate,
                    finalSalary,
                },
            });
        }
        catch (auditErr) {
            console.warn("[ContractLifecycleService] Audit error:", auditErr.message);
        }
        // Outbox Event
        try {
            await outbox_service_js_1.OutboxService.createOutboxEvent({
                tenantId,
                eventType: "EMPLOYEE_CONVERTED_TO_PERMANENT",
                entityType: "Employee",
                entityId: contract.employeeId,
                actorId: actorUserId,
                payload: {
                    contractId: contract.id,
                    employeeId: contract.employeeId,
                    conversionDate,
                    salary: finalSalary,
                },
            });
        }
        catch (outboxErr) {
            console.warn("[ContractLifecycleService] Outbox error:", outboxErr.message);
        }
        // Notify employee of permanent appointment
        if (contract.employee?.userId) {
            try {
                await notification_service_js_1.NotificationService.createNotification({
                    tenantId,
                    userId: contract.employee.userId,
                    title: `Congratulations: Converted to Permanent Employment!`,
                    message: `Your employment engagement has been officially converted to a Permanent position effective ${conversionDate.toLocaleDateString()}.`,
                    type: "PERMANENT_APPOINTMENT",
                    actionUrl: "/me/profile",
                    metadata: {
                        contractId: contract.id,
                        conversionDate,
                    },
                });
            }
            catch (notifErr) {
                console.warn("[ContractLifecycleService] Notification error:", notifErr.message);
            }
        }
        return {
            contract: updatedContract,
            employee: updatedEmployee,
        };
    }
    /**
     * Amend existing active contract terms (extension, rate revision, etc.).
     */
    static async amendContract(params) {
        const { tenantId, contractId, actorUserId, amendment, dbOverride } = params;
        const db = dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
        const contract = await db.employeeContract.findFirst({
            where: { id: contractId, tenantId },
        });
        if (!contract) {
            throw new Error("Contract not found.");
        }
        if (contract.status !== "active") {
            throw new Error(`Only active contracts can be amended. Current status: ${contract.status}`);
        }
        const currentAmendment = contract.amendmentNumber || 0;
        const nextAmendment = currentAmendment + 1;
        const updateData = {
            amendmentNumber: nextAmendment,
        };
        if (amendment.title)
            updateData.title = amendment.title;
        if (amendment.endDate !== undefined) {
            updateData.endDate = amendment.endDate ? new Date(amendment.endDate) : null;
        }
        if (amendment.salary !== undefined)
            updateData.salary = Number(amendment.salary);
        if (amendment.hourlyRate !== undefined)
            updateData.hourlyRate = Number(amendment.hourlyRate);
        const amendmentLog = `[Amendment #${nextAmendment} on ${new Date().toISOString().slice(0, 10)} by user ${actorUserId}: ${amendment.notes || "Terms revised"}]`;
        updateData.notes = contract.notes ? `${contract.notes}\n${amendmentLog}` : amendmentLog;
        const updated = await db.employeeContract.update({
            where: { id: contractId },
            data: updateData,
            include: {
                employee: true,
                contractType: true,
                supplier: true,
            },
        });
        // Record Audit mutation
        try {
            await audit_service_js_1.AuditService.logMutation({
                tenantId,
                actorId: actorUserId,
                action: "CONTRACT_AMENDED",
                entityType: "EmployeeContract",
                entityId: contractId,
                metadata: {
                    contractId,
                    amendmentNumber: nextAmendment,
                    changes: amendment,
                },
            });
        }
        catch (auditErr) {
            console.warn("[ContractLifecycleService] Audit error:", auditErr.message);
        }
        return updated;
    }
    /**
     * Terminate contract with reason.
     */
    static async terminateContract(params) {
        const { tenantId, contractId, actorUserId, reason, dbOverride } = params;
        const db = dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
        const contract = await db.employeeContract.findFirst({
            where: { id: contractId, tenantId },
            include: { employee: true },
        });
        if (!contract) {
            throw new Error("Contract not found.");
        }
        const termLog = `[Terminated on ${new Date().toISOString().slice(0, 10)} by user ${actorUserId}. Reason: ${reason || "No reason specified"}]`;
        const updated = await db.employeeContract.update({
            where: { id: contractId },
            data: {
                status: "terminated",
                notes: contract.notes ? `${contract.notes}\n${termLog}` : termLog,
            },
            include: {
                employee: true,
                contractType: true,
                supplier: true,
            },
        });
        // Record Audit mutation
        try {
            await audit_service_js_1.AuditService.logMutation({
                tenantId,
                actorId: actorUserId,
                action: "CONTRACT_TERMINATED",
                entityType: "EmployeeContract",
                entityId: contractId,
                metadata: {
                    contractId,
                    reason,
                },
            });
        }
        catch (auditErr) {
            console.warn("[ContractLifecycleService] Audit error:", auditErr.message);
        }
        return updated;
    }
    /**
     * Workflow B: Create Accounts Payable Purchase Voucher for external vendor/consultant.
     * Never generates an employee payroll payslip!
     */
    static async createVendorPayableVoucher(params) {
        const { tenantId, contractId, period, amount, invoiceNumber, notes, actorUserId, dbOverride } = params;
        const db = dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
        const contract = await db.employeeContract.findFirst({
            where: { id: contractId, tenantId },
            include: { employee: true, supplier: true },
        });
        if (!contract) {
            throw new Error("Contract not found.");
        }
        if (contract.paymentWorkflow !== "ACCOUNTS_PAYABLE") {
            throw new Error(`Contract payment workflow is '${contract.paymentWorkflow}'. AP Vouchers can only be created for ACCOUNTS_PAYABLE contracts.`);
        }
        if (!contract.supplierId) {
            throw new Error("Contract does not have a linked Vendor / Supplier for Accounts Payable routing.");
        }
        const invoiceNo = invoiceNumber || `VOUCH-${contract.contractNumber || contract.id.slice(0, 8)}-${period}`;
        const purchaseNo = `PUR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        // Create Purchase (AP Invoice)
        const purchase = await db.purchase.create({
            data: {
                tenantId,
                purchaseNo,
                supplierId: contract.supplierId,
                date: new Date(),
                status: "received",
                paymentStatus: "unpaid",
                total: amount,
                paidAmount: 0,
                notes: notes ||
                    `Workforce service voucher for ${contract.employee?.firstName} ${contract.employee?.lastName} (${contract.title}) - Period ${period} [Ref: ${invoiceNo}]`,
            },
            include: {
                supplier: true,
            },
        });
        // Record Audit mutation
        try {
            await audit_service_js_1.AuditService.logMutation({
                tenantId,
                actorId: actorUserId,
                action: "VENDOR_PAYABLE_VOUCHER_CREATED",
                entityType: "Purchase",
                entityId: purchase.id,
                metadata: {
                    contractId: contract.id,
                    supplierId: contract.supplierId,
                    amount,
                    invoiceNo,
                    period,
                },
            });
        }
        catch (auditErr) {
            console.warn("[ContractLifecycleService] Audit error:", auditErr.message);
        }
        return purchase;
    }
    /**
     * Validates attendance check-in boundary against active contract tenure.
     */
    static async validateAttendanceContractBoundary(params) {
        const { tenantId, employeeId, date, dbOverride } = params;
        const db = dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
        const checkDate = new Date(date);
        checkDate.setUTCHours(0, 0, 0, 0);
        const activeContract = await db.employeeContract.findFirst({
            where: {
                tenantId,
                employeeId,
            },
            orderBy: { startDate: "desc" },
        });
        if (!activeContract) {
            // If no contract record exists, default to allowed (permanent staff)
            return { allowed: true };
        }
        if (activeContract.status === "terminated") {
            return { allowed: false, reason: "Employee contract has been terminated. Attendance cannot be logged." };
        }
        const cStart = new Date(activeContract.startDate);
        cStart.setUTCHours(0, 0, 0, 0);
        if (checkDate < cStart) {
            return {
                allowed: false,
                reason: `Attendance date (${checkDate.toISOString().slice(0, 10)}) precedes contract commencement date (${cStart.toISOString().slice(0, 10)}).`,
            };
        }
        if (activeContract.endDate) {
            const cEnd = new Date(activeContract.endDate);
            cEnd.setUTCHours(23, 59, 59, 999);
            if (checkDate > cEnd) {
                return {
                    allowed: false,
                    reason: `Attendance date (${checkDate.toISOString().slice(0, 10)}) exceeds contract conclusion date (${cEnd.toISOString().slice(0, 10)}).`,
                };
            }
        }
        return { allowed: true };
    }
    /**
     * Retrieves tenant-wide contract overview metrics, category breakdowns, and evaluations.
     */
    static async getContractOverview(tenantId, dbOverride) {
        const db = dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
        const now = new Date();
        const settings = await this.getTenantExpirySettings(tenantId, db);
        const contracts = await db.employeeContract.findMany({
            where: { tenantId },
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                        employmentCategory: true,
                        department: { select: { id: true, name: true } },
                    },
                },
                contractType: true,
                supplier: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
            },
            orderBy: { endDate: "asc" },
        });
        const evaluated = contracts.map((c) => {
            const cls = this.classifyContract(c, now, settings.reminderIntervals);
            return {
                ...c,
                classification: cls.classification,
                daysRemaining: cls.daysRemaining,
                isExpired: cls.isExpired,
                isExpiringSoon: cls.isExpiringSoon,
                stage: cls.stage,
            };
        });
        const metrics = {
            total: evaluated.length,
            active: evaluated.filter((c) => c.status === "active" && !c.isExpired).length,
            expiringSoon: evaluated.filter((c) => c.isExpiringSoon && c.status === "active").length,
            expiring60: evaluated.filter((c) => c.stage === "60_days").length,
            expiring30: evaluated.filter((c) => c.stage === "30_days").length,
            expiring15: evaluated.filter((c) => c.stage === "15_days").length,
            expiring7: evaluated.filter((c) => c.stage === "7_days").length,
            expired: evaluated.filter((c) => c.isExpired).length,
            renewed: evaluated.filter((c) => c.status === "renewed").length,
            converted: evaluated.filter((c) => c.status === "converted").length,
            terminated: evaluated.filter((c) => c.status === "terminated").length,
        };
        const byCategory = {
            directContract: evaluated.filter((c) => c.category === "direct_contract").length,
            vendorOutsourced: evaluated.filter((c) => c.category === "vendor_outsourced").length,
            consultantFreelancer: evaluated.filter((c) => c.category === "consultant_freelancer").length,
            temporary: evaluated.filter((c) => c.category === "temporary").length,
            intern: evaluated.filter((c) => c.category === "intern").length,
        };
        const byPaymentWorkflow = {
            payroll: evaluated.filter((c) => c.paymentWorkflow === "PAYROLL").length,
            accountsPayable: evaluated.filter((c) => c.paymentWorkflow === "ACCOUNTS_PAYABLE").length,
        };
        // Suppliers summary
        const suppliers = await db.supplier.findMany({
            where: { tenantId },
            include: {
                _count: {
                    select: {
                        employeeContracts: true,
                        employees: true,
                        purchases: true,
                    },
                },
            },
        });
        return {
            metrics,
            byCategory,
            byPaymentWorkflow,
            settings,
            suppliers,
            contracts: evaluated,
        };
    }
}
exports.ContractLifecycleService = ContractLifecycleService;
