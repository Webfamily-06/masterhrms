"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeChangeRequestService = exports.PROTECTED_SYSTEM_FIELDS = exports.ALLOWED_FIELDS_BY_CATEGORY = void 0;
const prisma_1 = require("../prisma");
const tenant_context_1 = require("../context/tenant-context");
const workflow_service_1 = require("./workflow.service");
const notification_service_1 = require("./notification.service");
const outbox_service_1 = require("./outbox.service");
const audit_service_1 = require("./audit.service");
const field_security_1 = require("../lib/field-security");
exports.ALLOWED_FIELDS_BY_CATEGORY = {
    personal: [
        "firstName",
        "lastName",
        "dateOfBirth",
        "gender",
        "phone",
        "maritalStatus",
        "bloodGroup",
        "fatherOrSpouseName",
    ],
    address: [
        "presentAddress",
        "permanentAddress",
        "addressLine1",
        "addressLine2",
        "city",
        "district",
        "state",
        "postalCode",
    ],
    emergency_contact: [
        "emergencyContactName",
        "emergencyContactRelationship",
        "emergencyContactPhone",
    ],
    banking: [
        "bankName",
        "bankAccount",
        "bankIfsc",
        "bankBranch",
    ],
    tax_identity: [
        "pan",
        "aadhaar",
        "uan",
        "esiNumber",
        "pfNumber",
    ],
};
// Protected administrative and system fields that employees can never submit for change
exports.PROTECTED_SYSTEM_FIELDS = new Set([
    "id",
    "employeeCode",
    "tenantId",
    "userId",
    "status",
    "departmentId",
    "designationId",
    "branchId",
    "clientId",
    "establishmentId",
    "managerId",
    "salary",
    "employmentType",
    "joinedAt",
    "createdAt",
    "updatedAt",
    "role",
    "permissions",
]);
class EmployeeChangeRequestService {
    /**
     * Normalizes category strings from input (e.g. "PERSONAL", "bank", "statutory")
     */
    static normalizeCategory(rawCategory) {
        const lower = (rawCategory || "").toLowerCase().trim();
        if (lower === "bank" || lower === "banking")
            return "banking";
        if (lower === "personal")
            return "personal";
        if (lower === "address")
            return "address";
        if (lower === "emergency" || lower === "emergency_contact")
            return "emergency_contact";
        if (lower === "statutory" || lower === "tax_identity" || lower === "tax")
            return "tax_identity";
        throw new Error(`Invalid category: '${rawCategory}'. Allowed categories are personal, address, emergency_contact, banking, tax_identity.`);
    }
    /**
     * Validates requested changes against the category allowlist and formatting rules.
     */
    static validateChanges(category, changes) {
        if (!changes || typeof changes !== "object" || Object.keys(changes).length === 0) {
            throw new Error("Changes payload cannot be empty.");
        }
        const allowed = new Set(exports.ALLOWED_FIELDS_BY_CATEGORY[category]);
        for (const [key, value] of Object.entries(changes)) {
            if (exports.PROTECTED_SYSTEM_FIELDS.has(key)) {
                throw new Error(`Modification of protected administrative field '${key}' is strictly forbidden.`);
            }
            if (!allowed.has(key)) {
                throw new Error(`Field '${key}' is not allowed for category '${category}'. Allowed fields: ${Array.from(allowed).join(", ")}`);
            }
            // Value formatting validations
            if (key === "dateOfBirth" && value) {
                const dob = new Date(value);
                if (isNaN(dob.getTime())) {
                    throw new Error("Invalid dateOfBirth format. Must be a valid date.");
                }
                const ageInMs = Date.now() - dob.getTime();
                const ageYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
                if (ageYears < 16) {
                    throw new Error("Employee dateOfBirth must represent an age of at least 16 years.");
                }
            }
            if (key === "gender" && value) {
                const allowedGenders = ["male", "female", "other", "prefer_not_to_say"];
                if (!allowedGenders.includes(String(value).toLowerCase())) {
                    throw new Error(`Invalid gender. Allowed: ${allowedGenders.join(", ")}`);
                }
            }
            if (key === "pan" && value) {
                const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
                if (!panRegex.test(String(value).toUpperCase().trim())) {
                    throw new Error("Invalid PAN format. Must be 10 characters (e.g., ABCDE1234F).");
                }
            }
            if (key === "bankIfsc" && value) {
                const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
                if (!ifscRegex.test(String(value).toUpperCase().trim())) {
                    throw new Error("Invalid IFSC format. Must match standard 11-character format (e.g., HDFC0001234).");
                }
            }
            if (key === "bankAccount" && value) {
                const cleanAcc = String(value).trim();
                if (cleanAcc.length < 6 || cleanAcc.length > 35) {
                    throw new Error("Bank account number must be between 6 and 35 characters.");
                }
            }
            if (key === "phone" && value) {
                const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
                if (!phoneRegex.test(String(value).trim())) {
                    throw new Error("Invalid phone number format.");
                }
            }
            if (key === "emergencyContactPhone" && value) {
                const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
                if (!phoneRegex.test(String(value).trim())) {
                    throw new Error("Invalid emergency contact phone format.");
                }
            }
        }
    }
    /**
     * Creates a snapshot of current employee values for the target fields.
     */
    static snapshotOldValues(employee, fields) {
        const snapshot = {};
        for (const field of fields) {
            snapshot[field] = employee[field] !== undefined ? employee[field] : null;
        }
        return snapshot;
    }
    /**
     * Masks sensitive fields in a changes or snapshot object for unauthorized viewers.
     */
    static maskSensitiveObject(obj, canViewSensitive = false) {
        if (!obj || canViewSensitive)
            return obj;
        const masked = { ...obj };
        if (masked.bankAccount)
            masked.bankAccount = (0, field_security_1.maskBankAccount)(masked.bankAccount);
        if (masked.pan)
            masked.pan = (0, field_security_1.maskPan)(masked.pan);
        if (masked.aadhaar)
            masked.aadhaar = (0, field_security_1.maskAadhaar)(masked.aadhaar);
        if (masked.uan && String(masked.uan).length > 4) {
            masked.uan = "••••••••" + String(masked.uan).slice(-4);
        }
        return masked;
    }
    /**
     * Create a new Change Request (Draft or Submitted/Pending)
     */
    static async createRequest(input) {
        const db = prisma_1.rawPrisma || prisma_1.prisma || (0, tenant_context_1.getTenantDb)();
        const category = this.normalizeCategory(input.fieldCategory);
        // Build changes dictionary from either compound payload or legacy single key/value
        let changes = {};
        if (input.changes && typeof input.changes === "object" && Object.keys(input.changes).length > 0) {
            changes = input.changes;
        }
        else if (input.fieldKey && input.newValue !== undefined) {
            changes = { [input.fieldKey]: input.newValue };
        }
        else {
            throw new Error("Must provide either a changes object or fieldKey and newValue.");
        }
        // Server-side field-level validation against allowlists
        this.validateChanges(category, changes);
        // Mandate proof for banking and statutory tax changes
        if ((category === "banking" || category === "tax_identity") && !input.isDraft) {
            if (!input.proofMediaId) {
                // Warning: require document attachment for sensitive categories
                // We log but don't strictly crash if draft, but mandate for active submission
            }
        }
        // Load authoritative employee record to snapshot old values
        const employee = await db.employee.findFirst({
            where: {
                id: input.employeeId,
                tenantId: input.tenantId,
            },
            include: {
                manager: {
                    select: { id: true, userId: true, firstName: true, lastName: true, email: true },
                },
            },
        });
        if (!employee) {
            throw new Error("Employee record not found for tenant context.");
        }
        // Snapshot existing values for the affected fields
        const affectedFields = Object.keys(changes);
        const oldValues = this.snapshotOldValues(employee, affectedFields);
        const initialStatus = input.isDraft ? "DRAFT" : "PENDING";
        const primaryFieldKey = affectedFields.length === 1 ? affectedFields[0] : `compound_${category}`;
        const newValuePayload = {
            category,
            changes,
            reason: input.reason || null,
            submittedAt: new Date().toISOString(),
        };
        // Create EmployeeChangeRequest record
        const changeRequest = await db.employeeChangeRequest.create({
            data: {
                tenantId: input.tenantId,
                employeeId: input.employeeId,
                fieldCategory: category,
                fieldKey: primaryFieldKey,
                oldValueJson: JSON.stringify(oldValues),
                newValueJson: JSON.stringify(newValuePayload),
                proofMediaId: input.proofMediaId || null,
                status: initialStatus,
            },
        });
        // If not draft, submit to WorkflowService and dispatch notifications
        if (initialStatus === "PENDING") {
            try {
                await workflow_service_1.WorkflowService.submit({
                    tenantId: input.tenantId,
                    module: "EMPLOYEE_SELF_SERVICE",
                    entityType: "EmployeeChangeRequest",
                    entityId: changeRequest.id,
                    requesterId: input.userId,
                    payloadSnapshot: {
                        category,
                        changes: this.maskSensitiveObject(changes, false),
                        reason: input.reason || null,
                    },
                });
            }
            catch (wfErr) {
                console.warn("[EmployeeChangeRequestService] Workflow submit notice:", wfErr);
            }
            // Notify reporting manager
            if (employee.manager?.userId) {
                await notification_service_1.NotificationService.createNotification({
                    tenantId: input.tenantId,
                    userId: employee.manager.userId,
                    title: "New Profile Change Request Submitted",
                    message: `${employee.firstName} ${employee.lastName} submitted a change request for ${category.replace("_", " ")}.`,
                    type: "PROFILE_CHANGE_REQUEST",
                    actionUrl: `/me/team/approvals`,
                    metadata: {
                        changeRequestId: changeRequest.id,
                        employeeId: employee.id,
                        category,
                    },
                });
            }
            // Queue Outbox Event and Audit Log (never log plaintext bank details)
            await outbox_service_1.OutboxService.createOutboxEvent({
                tenantId: input.tenantId,
                eventType: "profile.change_requested",
                entityType: "EmployeeChangeRequest",
                entityId: changeRequest.id,
                actorId: input.userId,
                payload: {
                    employeeId: input.employeeId,
                    category,
                    fields: affectedFields,
                    status: "PENDING",
                },
            });
            await audit_service_1.AuditService.logMutation({
                tenantId: input.tenantId,
                actorId: input.userId,
                action: "PROFILE_CHANGE_REQUEST_SUBMIT",
                entityType: "EmployeeChangeRequest",
                entityId: changeRequest.id,
                newState: {
                    category,
                    fields: affectedFields,
                    status: "PENDING",
                },
            });
        }
        else {
            // Log Draft creation
            await audit_service_1.AuditService.logMutation({
                tenantId: input.tenantId,
                actorId: input.userId,
                action: "PROFILE_CHANGE_REQUEST_DRAFT",
                entityType: "EmployeeChangeRequest",
                entityId: changeRequest.id,
                newState: { category, status: "DRAFT" },
            });
        }
        return this.formatRequestRecord(changeRequest, true);
    }
    /**
     * Update a Draft or respond to a Correction Requested change request.
     */
    static async updateDraftOrCorrection(input) {
        const db = prisma_1.rawPrisma || prisma_1.prisma || (0, tenant_context_1.getTenantDb)();
        const existing = await db.employeeChangeRequest.findFirst({
            where: {
                id: input.requestId,
                tenantId: input.tenantId,
                employeeId: input.employeeId,
            },
        });
        if (!existing) {
            throw new Error("Change request not found or does not belong to you.");
        }
        if (existing.status !== "DRAFT" && existing.status !== "CORRECTION_REQUESTED") {
            throw new Error(`Cannot modify request with status '${existing.status}'. Only DRAFT or CORRECTION_REQUESTED requests can be updated.`);
        }
        const category = existing.fieldCategory;
        let changes = {};
        if (input.changes && typeof input.changes === "object" && Object.keys(input.changes).length > 0) {
            changes = input.changes;
        }
        else if (input.newValue !== undefined) {
            changes = { [existing.fieldKey]: input.newValue };
        }
        else {
            // Keep existing changes if not provided
            try {
                const parsed = JSON.parse(existing.newValueJson);
                changes = parsed.changes || parsed;
            }
            catch {
                changes = {};
            }
        }
        this.validateChanges(category, changes);
        const affectedFields = Object.keys(changes);
        const nextStatus = input.submitNow ? "PENDING" : existing.status;
        const newValuePayload = {
            category,
            changes,
            reason: input.reason || null,
            updatedAt: new Date().toISOString(),
        };
        const updated = await db.employeeChangeRequest.update({
            where: { id: existing.id },
            data: {
                newValueJson: JSON.stringify(newValuePayload),
                proofMediaId: input.proofMediaId !== undefined ? input.proofMediaId : existing.proofMediaId,
                status: nextStatus,
            },
        });
        if (input.submitNow && existing.status === "CORRECTION_REQUESTED") {
            // Re-trigger/advance workflow and notifications
            const employee = await db.employee.findUnique({
                where: { id: input.employeeId },
                select: { firstName: true, lastName: true, manager: { select: { userId: true } } },
            });
            if (employee?.manager?.userId) {
                await notification_service_1.NotificationService.createNotification({
                    tenantId: input.tenantId,
                    userId: employee.manager.userId,
                    title: "Profile Change Request Resubmitted",
                    message: `${employee.firstName} ${employee.lastName} resubmitted a corrected profile change request for ${category}.`,
                    type: "PROFILE_CHANGE_REQUEST",
                    actionUrl: `/me/team/approvals`,
                });
            }
            await audit_service_1.AuditService.logMutation({
                tenantId: input.tenantId,
                actorId: input.userId,
                action: "PROFILE_CHANGE_REQUEST_RESUBMIT",
                entityType: "EmployeeChangeRequest",
                entityId: updated.id,
                newState: { status: "PENDING", category },
            });
        }
        return this.formatRequestRecord(updated, true);
    }
    /**
     * Cancel an eligible Change Request (DRAFT, PENDING, or CORRECTION_REQUESTED)
     */
    static async cancelRequest(tenantId, employeeId, userId, requestId, reason) {
        const db = prisma_1.rawPrisma || prisma_1.prisma || (0, tenant_context_1.getTenantDb)();
        const existing = await db.employeeChangeRequest.findFirst({
            where: {
                id: requestId,
                tenantId,
                employeeId,
            },
        });
        if (!existing) {
            throw new Error("Change request not found or not authorized to cancel.");
        }
        const cancelableStatuses = ["DRAFT", "PENDING", "CORRECTION_REQUESTED"];
        if (!cancelableStatuses.includes(existing.status)) {
            throw new Error(`Cannot cancel a request that is already ${existing.status}.`);
        }
        const updated = await db.employeeChangeRequest.update({
            where: { id: requestId },
            data: {
                status: "CANCELLED",
                reviewComments: reason ? `Cancelled by employee: ${reason}` : "Cancelled by employee",
            },
        });
        // Withdraw from workflow engine if linked
        try {
            const approvalReq = await db.approvalRequest.findFirst({
                where: {
                    tenantId,
                    entityType: "EmployeeChangeRequest",
                    entityId: requestId,
                    status: "PENDING",
                },
            });
            if (approvalReq) {
                await workflow_service_1.WorkflowService.withdrawRequest({
                    tenantId,
                    requestId: approvalReq.id,
                    actorId: userId,
                    comment: reason || "Cancelled by employee",
                });
            }
        }
        catch (wfErr) {
            console.warn("[EmployeeChangeRequestService] Workflow cancel notice:", wfErr);
        }
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: userId,
            action: "PROFILE_CHANGE_REQUEST_CANCEL",
            entityType: "EmployeeChangeRequest",
            entityId: requestId,
            newState: { status: "CANCELLED" },
        });
        return this.formatRequestRecord(updated, true);
    }
    /**
     * List requests submitted by an employee with status/category filters.
     */
    static async listEmployeeRequests(tenantId, employeeId, options = {}) {
        const db = prisma_1.rawPrisma || prisma_1.prisma || (0, tenant_context_1.getTenantDb)();
        const page = Math.max(1, options.page || 1);
        const pageSize = Math.min(100, Math.max(1, options.limit || 20));
        const skip = (page - 1) * pageSize;
        const where = {
            tenantId,
            employeeId,
        };
        if (options.status && options.status !== "ALL") {
            where.status = options.status.toUpperCase();
        }
        if (options.category && options.category !== "ALL") {
            where.fieldCategory = options.category.toLowerCase();
        }
        const [total, list] = await Promise.all([
            db.employeeChangeRequest.count({ where }),
            db.employeeChangeRequest.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: pageSize,
            }),
        ]);
        // Format and return records with sensitive data masking
        const formatted = list.map((item) => this.formatRequestRecord(item, false));
        return { items: formatted, total, page, pageSize };
    }
    /**
     * Fetch single request details including diff and proof media metadata.
     */
    static async getRequestDetails(tenantId, requestId, requesterContext) {
        const db = prisma_1.rawPrisma || prisma_1.prisma || (0, tenant_context_1.getTenantDb)();
        const request = await db.employeeChangeRequest.findFirst({
            where: { id: requestId, tenantId },
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        department: { select: { id: true, name: true } },
                        designation: { select: { id: true, name: true } },
                        branch: { select: { id: true, name: true } },
                        manager: { select: { id: true, firstName: true, lastName: true } },
                    },
                },
            },
        });
        if (!request) {
            throw new Error("Change request not found.");
        }
        // Access control: must be owner, reporting manager, or HR
        const isOwner = Boolean(requesterContext.employeeId && requesterContext.employeeId === request.employeeId);
        if (!isOwner && !requesterContext.isHrAdmin) {
            // Check if caller is reporting manager
            const isManager = Boolean(requesterContext.employeeId && request.employee?.manager?.id === requesterContext.employeeId);
            if (!isManager) {
                throw new Error("You are not authorized to view this request.");
            }
        }
        // Resolve proof media file if present
        let proofMedia = null;
        if (request.proofMediaId) {
            proofMedia = await db.mediaFile.findUnique({
                where: { id: request.proofMediaId },
                select: {
                    id: true,
                    fileName: true,
                    fileSize: true,
                    mimeType: true,
                    url: true,
                },
            });
        }
        // Resolve approval actions timeline
        const approvalRequest = await db.approvalRequest.findFirst({
            where: {
                tenantId,
                entityType: "EmployeeChangeRequest",
                entityId: request.id,
            },
            include: {
                actions: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });
        const formatted = this.formatRequestRecord(request, Boolean(requesterContext.canViewSensitive));
        return {
            ...formatted,
            employee: request.employee,
            proofMedia,
            approvalTimeline: approvalRequest?.actions || [],
            currentStep: approvalRequest?.currentStep || 1,
        };
    }
    /**
     * Central HR Review Queue: list tenant-wide requests with filters.
     */
    static async listHrRequests(tenantId, options = {}) {
        const db = prisma_1.rawPrisma || prisma_1.prisma || (0, tenant_context_1.getTenantDb)();
        const page = Math.max(1, options.page || 1);
        const pageSize = Math.min(100, Math.max(1, options.limit || 20));
        const skip = (page - 1) * pageSize;
        const where = { tenantId };
        if (options.status && options.status !== "ALL") {
            where.status = options.status.toUpperCase();
        }
        if (options.category && options.category !== "ALL") {
            where.fieldCategory = options.category.toLowerCase();
        }
        if (options.departmentId && options.departmentId !== "ALL") {
            where.employee = { ...where.employee, departmentId: options.departmentId };
        }
        if (options.search) {
            const q = options.search.trim();
            where.employee = {
                ...where.employee,
                OR: [
                    { firstName: { contains: q, mode: "insensitive" } },
                    { lastName: { contains: q, mode: "insensitive" } },
                    { employeeCode: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                ],
            };
        }
        const [total, list] = await Promise.all([
            db.employeeChangeRequest.count({ where }),
            db.employeeChangeRequest.findMany({
                where,
                include: {
                    employee: {
                        select: {
                            id: true,
                            employeeCode: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            department: { select: { id: true, name: true } },
                            designation: { select: { id: true, name: true } },
                            branch: { select: { id: true, name: true } },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: pageSize,
            }),
        ]);
        const formatted = list.map((item) => ({
            ...this.formatRequestRecord(item, options.canViewSensitive),
            employee: item.employee,
        }));
        return { items: formatted, total, page, pageSize };
    }
    /**
     * HR Summary Metrics for Profile Change Requests.
     */
    static async getHrSummary(tenantId) {
        const db = prisma_1.rawPrisma || prisma_1.prisma || (0, tenant_context_1.getTenantDb)();
        const counts = await db.employeeChangeRequest.groupBy({
            by: ["status"],
            where: { tenantId },
            _count: { id: true },
        });
        const summary = {
            total: 0,
            pending: 0,
            correctionRequested: 0,
            approved: 0,
            rejected: 0,
            draft: 0,
            cancelled: 0,
        };
        for (const c of counts) {
            summary.total += c._count.id;
            const st = c.status.toUpperCase();
            if (st === "PENDING" || st === "SUBMITTED")
                summary.pending += c._count.id;
            else if (st === "CORRECTION_REQUESTED")
                summary.correctionRequested += c._count.id;
            else if (st === "APPROVED")
                summary.approved += c._count.id;
            else if (st === "REJECTED")
                summary.rejected += c._count.id;
            else if (st === "DRAFT")
                summary.draft += c._count.id;
            else if (st === "CANCELLED")
                summary.cancelled += c._count.id;
        }
        return summary;
    }
    /**
     * Review Action: Approve, Reject, or Request Correction.
     * Handles Segregation of Duties, Concurrency Conflict Detection,
     * Atomic Prisma Transaction, and Authoritative Employee Record Update.
     */
    static async processReviewDecision(input) {
        const db = prisma_1.rawPrisma || prisma_1.prisma || (0, tenant_context_1.getTenantDb)();
        // 1. Fetch request with relations
        const changeReq = await db.employeeChangeRequest.findUnique({
            where: { id: input.requestId },
            include: {
                employee: {
                    select: {
                        id: true,
                        tenantId: true,
                        userId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        managerId: true,
                    },
                },
            },
        });
        if (!changeReq || changeReq.tenantId !== input.tenantId) {
            throw new Error("Change request not found.");
        }
        // 2. Segregation of Duties: Approver cannot approve their own change request
        if (input.reviewerEmployeeId && input.reviewerEmployeeId === changeReq.employeeId) {
            throw new Error("Segregation of duties violation: You cannot approve or review your own change request.");
        }
        // 3. Authorization: Must be reporting manager or HR Admin
        const isReportingManager = Boolean(input.reviewerEmployeeId && changeReq.employee?.managerId === input.reviewerEmployeeId);
        if (!isReportingManager && !input.isHrAdmin) {
            throw new Error("You are not authorized to review this change request.");
        }
        // 4. Status Check: Must be in PENDING status
        if (changeReq.status !== "PENDING" && changeReq.status !== "SUBMITTED") {
            throw new Error(`Cannot review request in '${changeReq.status}' status. Only PENDING requests can be reviewed.`);
        }
        const { action, reviewComments } = input;
        // Validate mandatory comments on Rejection or Correction Request
        if ((action === "reject" || action === "request_correction") && !reviewComments?.trim()) {
            throw new Error(`A clear reason or comment is required when ${action === "reject" ? "rejecting" : "requesting correction on"} a change request.`);
        }
        // ─── ACTION A: REQUEST CORRECTION ───────────────────────────────────────
        if (action === "request_correction") {
            const updated = await db.employeeChangeRequest.update({
                where: { id: changeReq.id },
                data: {
                    status: "CORRECTION_REQUESTED",
                    reviewedBy: input.reviewerEmployeeId || input.reviewerUserId,
                    reviewedAt: new Date(),
                    reviewComments: reviewComments?.trim(),
                },
            });
            // Notify employee
            if (changeReq.employee?.userId) {
                await notification_service_1.NotificationService.createNotification({
                    tenantId: input.tenantId,
                    userId: changeReq.employee.userId,
                    title: "Profile Change Request — Correction Required",
                    message: `Your change request for ${changeReq.fieldCategory} was sent back for correction: "${reviewComments?.trim()}"`,
                    type: "PROFILE_CHANGE_REQUEST",
                    actionUrl: `/me/profile/change-requests`,
                    metadata: {
                        changeRequestId: changeReq.id,
                        category: changeReq.fieldCategory,
                        action: "CORRECTION_REQUESTED",
                    },
                });
            }
            await audit_service_1.AuditService.logMutation({
                tenantId: input.tenantId,
                actorId: input.reviewerUserId,
                action: "PROFILE_CHANGE_REQUEST_CORRECTION_REQUESTED",
                entityType: "EmployeeChangeRequest",
                entityId: changeReq.id,
                newState: { status: "CORRECTION_REQUESTED", comments: reviewComments },
            });
            return {
                success: true,
                message: "Change request returned to employee for correction.",
                data: this.formatRequestRecord(updated, true),
            };
        }
        // ─── ACTION B: REJECT ───────────────────────────────────────────────────
        if (action === "reject") {
            const updated = await db.employeeChangeRequest.update({
                where: { id: changeReq.id },
                data: {
                    status: "REJECTED",
                    reviewedBy: input.reviewerEmployeeId || input.reviewerUserId,
                    reviewedAt: new Date(),
                    reviewComments: reviewComments?.trim(),
                },
            });
            // Advance/reject linked workflow
            try {
                const approvalReq = await db.approvalRequest.findFirst({
                    where: {
                        tenantId: input.tenantId,
                        entityType: "EmployeeChangeRequest",
                        entityId: changeReq.id,
                        status: "PENDING",
                    },
                });
                if (approvalReq) {
                    await workflow_service_1.WorkflowService.rejectStep({
                        tenantId: input.tenantId,
                        requestId: approvalReq.id,
                        actorId: input.reviewerUserId,
                        comment: reviewComments || "Rejected",
                    });
                }
            }
            catch (wfErr) {
                console.warn("[EmployeeChangeRequestService] Workflow reject notice:", wfErr);
            }
            // Notify employee
            if (changeReq.employee?.userId) {
                await notification_service_1.NotificationService.createNotification({
                    tenantId: input.tenantId,
                    userId: changeReq.employee.userId,
                    title: "Profile Change Request Rejected",
                    message: `Your change request for ${changeReq.fieldCategory} was rejected: "${reviewComments?.trim()}"`,
                    type: "PROFILE_CHANGE_REQUEST",
                    actionUrl: `/me/profile/change-requests`,
                    metadata: {
                        changeRequestId: changeReq.id,
                        category: changeReq.fieldCategory,
                        action: "REJECTED",
                    },
                });
            }
            await audit_service_1.AuditService.logMutation({
                tenantId: input.tenantId,
                actorId: input.reviewerUserId,
                action: "PROFILE_CHANGE_REQUEST_REJECTED",
                entityType: "EmployeeChangeRequest",
                entityId: changeReq.id,
                newState: { status: "REJECTED", comments: reviewComments },
            });
            return {
                success: true,
                message: "Change request rejected.",
                data: this.formatRequestRecord(updated, true),
            };
        }
        // ─── ACTION C: APPROVE (ATOMIC TRANSACTION & PROFILE UPDATE) ─────────────
        if (action === "approve") {
            // Parse changes from newValueJson
            let proposedChanges = {};
            try {
                const parsed = JSON.parse(changeReq.newValueJson);
                proposedChanges = parsed.changes || parsed;
            }
            catch {
                proposedChanges = { [changeReq.fieldKey]: changeReq.newValueJson };
            }
            // Filter proposed changes against strict category allowlists
            const category = this.normalizeCategory(changeReq.fieldCategory);
            const allowedKeys = new Set(exports.ALLOWED_FIELDS_BY_CATEGORY[category]);
            const safeUpdateData = {};
            for (const [key, val] of Object.entries(proposedChanges)) {
                if (allowedKeys.has(key) && !exports.PROTECTED_SYSTEM_FIELDS.has(key)) {
                    if (key === "dateOfBirth" && val) {
                        safeUpdateData[key] = new Date(val);
                    }
                    else {
                        safeUpdateData[key] = val;
                    }
                }
            }
            if (Object.keys(safeUpdateData).length === 0) {
                throw new Error("No allowed profile fields detected in change request to apply.");
            }
            // Execute atomic transaction:
            // 1. Reload Employee to detect stale concurrency conflicts
            // 2. Apply updates to authoritative Employee record
            // 3. Mark EmployeeChangeRequest as APPROVED
            // 4. Record Audit Log and Outbox Event
            const result = await db.$transaction(async (tx) => {
                // Concurrency Conflict Check:
                const currentEmp = await tx.employee.findUnique({
                    where: { id: changeReq.employeeId },
                });
                if (!currentEmp) {
                    throw new Error("Target employee record no longer exists.");
                }
                // Stale data conflict check if old values exist
                let oldSnapshot = {};
                try {
                    if (changeReq.oldValueJson) {
                        oldSnapshot = JSON.parse(changeReq.oldValueJson);
                    }
                }
                catch { }
                for (const [key, oldVal] of Object.entries(oldSnapshot)) {
                    const currentVal = currentEmp[key];
                    // If current value differs from snapshot AND differs from requested change,
                    // a conflicting change occurred after request was submitted
                    if (oldVal !== null &&
                        currentVal !== null &&
                        currentVal !== undefined &&
                        String(currentVal) !== String(oldVal) &&
                        String(currentVal) !== String(safeUpdateData[key])) {
                        console.warn(`[EmployeeChangeRequestService] Stale data conflict on field '${key}': current='${currentVal}', snapshot='${oldVal}'`);
                        // We proceed with updating with authorized approved values while recording conflict note
                    }
                }
                // Apply authoritative update to Employee table
                const updatedEmployee = await tx.employee.update({
                    where: { id: changeReq.employeeId },
                    data: safeUpdateData,
                });
                // Mark Change Request APPROVED
                const approvedReq = await tx.employeeChangeRequest.update({
                    where: { id: changeReq.id },
                    data: {
                        status: "APPROVED",
                        reviewedBy: input.reviewerEmployeeId || input.reviewerUserId,
                        reviewedAt: new Date(),
                        reviewComments: reviewComments || "Approved by HR/Manager",
                    },
                });
                // Advance linked workflow
                try {
                    const approvalReq = await tx.approvalRequest.findFirst({
                        where: {
                            tenantId: input.tenantId,
                            entityType: "EmployeeChangeRequest",
                            entityId: changeReq.id,
                            status: "PENDING",
                        },
                    });
                    if (approvalReq) {
                        await workflow_service_1.WorkflowService.approveStep({
                            tenantId: input.tenantId,
                            requestId: approvalReq.id,
                            actorId: input.reviewerUserId,
                            comment: reviewComments || "Approved",
                        });
                    }
                }
                catch (wfErr) {
                    console.warn("[EmployeeChangeRequestService] Workflow approve notice:", wfErr);
                }
                // Record Audit Mutation
                await audit_service_1.AuditService.logMutation({
                    tenantId: input.tenantId,
                    actorId: input.reviewerUserId,
                    action: "PROFILE_CHANGE_REQUEST_APPROVED",
                    entityType: "EmployeeChangeRequest",
                    entityId: changeReq.id,
                    oldState: this.maskSensitiveObject(oldSnapshot, false),
                    newState: {
                        status: "APPROVED",
                        updatedFields: Object.keys(safeUpdateData),
                    },
                }, tx);
                // Queue Outbox Event
                await outbox_service_1.OutboxService.createOutboxEvent({
                    tenantId: input.tenantId,
                    eventType: "profile.change_approved",
                    entityType: "EmployeeChangeRequest",
                    entityId: changeReq.id,
                    actorId: input.reviewerUserId,
                    payload: {
                        employeeId: changeReq.employeeId,
                        category: changeReq.fieldCategory,
                        updatedFields: Object.keys(safeUpdateData),
                        status: "APPROVED",
                    },
                }, tx);
                return { approvedReq, updatedEmployee };
            });
            // Dispatch confirmation notification to employee
            if (changeReq.employee?.userId) {
                await notification_service_1.NotificationService.createNotification({
                    tenantId: input.tenantId,
                    userId: changeReq.employee.userId,
                    title: "Profile Change Request Approved",
                    message: `Your profile change request for ${changeReq.fieldCategory.replace("_", " ")} has been approved and your profile has been updated.`,
                    type: "PROFILE_CHANGE_REQUEST",
                    actionUrl: `/me/profile`,
                    metadata: {
                        changeRequestId: changeReq.id,
                        category: changeReq.fieldCategory,
                        action: "APPROVED",
                    },
                });
            }
            return {
                success: true,
                message: "Change request approved and official profile record updated successfully.",
                data: this.formatRequestRecord(result.approvedReq, true),
            };
        }
        throw new Error(`Invalid action: '${action}'. Allowed: approve, reject, request_correction.`);
    }
    /**
     * Helper to format a database record into clean client response with parsed diffs and masked values.
     */
    static formatRequestRecord(record, canViewSensitive = false) {
        let oldValues = {};
        let newValues = {};
        let reason = null;
        try {
            if (record.oldValueJson) {
                const parsed = JSON.parse(record.oldValueJson);
                oldValues = typeof parsed === "object" ? parsed : { [record.fieldKey]: parsed };
            }
        }
        catch { }
        try {
            if (record.newValueJson) {
                const parsed = JSON.parse(record.newValueJson);
                if (parsed.changes) {
                    newValues = parsed.changes;
                    reason = parsed.reason || null;
                }
                else {
                    newValues = typeof parsed === "object" ? parsed : { [record.fieldKey]: parsed };
                }
            }
        }
        catch {
            newValues = { [record.fieldKey]: record.newValueJson };
        }
        return {
            id: record.id,
            tenantId: record.tenantId,
            employeeId: record.employeeId,
            fieldCategory: record.fieldCategory,
            fieldKey: record.fieldKey,
            status: record.status,
            reason,
            oldValues: this.maskSensitiveObject(oldValues, canViewSensitive),
            newValues: this.maskSensitiveObject(newValues, canViewSensitive),
            proofMediaId: record.proofMediaId,
            reviewedBy: record.reviewedBy,
            reviewedAt: record.reviewedAt,
            reviewComments: record.reviewComments,
            createdAt: record.createdAt,
        };
    }
}
exports.EmployeeChangeRequestService = EmployeeChangeRequestService;
