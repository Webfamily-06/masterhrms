"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwardNominationService = void 0;
const prisma_1 = require("../prisma");
const workflow_service_1 = require("./workflow.service");
const audit_service_1 = require("./audit.service");
const notification_service_1 = require("./notification.service");
const socket_1 = require("../socket");
class AwardNominationService {
    /**
     * Validates if a manager is in the reporting hierarchy of the nominee.
     */
    static async isManagerOf(managerEmployeeId, nomineeEmployeeId, tenantId) {
        if (!managerEmployeeId || !nomineeEmployeeId)
            return false;
        if (managerEmployeeId === nomineeEmployeeId)
            return false;
        // Check direct manager
        const nominee = await prisma_1.prisma.employee.findFirst({
            where: { id: nomineeEmployeeId, tenantId },
            select: { id: true, managerId: true },
        });
        if (!nominee)
            return false;
        if (nominee.managerId === managerEmployeeId)
            return true;
        // Check 2nd level manager (skip-level)
        if (nominee.managerId) {
            const parentManager = await prisma_1.prisma.employee.findFirst({
                where: { id: nominee.managerId, tenantId },
                select: { id: true, managerId: true },
            });
            if (parentManager?.managerId === managerEmployeeId)
                return true;
        }
        return false;
    }
    /**
     * Submits a new Award Nomination.
     */
    static async submitNomination(dto) {
        const { tenantId, nomineeEmployeeId, awardTypeId, nominatorUserId, nominatorEmployeeId, reason, achievementDescription, supportingDocUrl, isHRAuthorized, } = dto;
        if (!nomineeEmployeeId) {
            throw new Error("Nominee employee is required.");
        }
        if (!awardTypeId) {
            throw new Error("Award type is required.");
        }
        if (!reason || !reason.trim()) {
            throw new Error("Recognition reason or citation is required.");
        }
        // 1. Validate nominee employee exists in current tenant and is active
        const nominee = await prisma_1.prisma.employee.findFirst({
            where: { id: nomineeEmployeeId, tenantId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                userId: true,
                status: true,
                managerId: true,
                department: { select: { id: true, name: true } },
            },
        });
        if (!nominee) {
            throw new Error("Nominee employee not found in current organization.");
        }
        if (nominee.status && nominee.status.toUpperCase() !== "ACTIVE") {
            throw new Error("Cannot nominate an inactive or terminated employee.");
        }
        // 2. Validate Award Type exists, belongs to tenant, and is active
        const awardType = await prisma_1.prisma.awardType.findFirst({
            where: { id: awardTypeId, tenantId },
        });
        if (!awardType) {
            throw new Error("Award type not found in current organization.");
        }
        if (awardType.status === "inactive") {
            throw new Error("This award type is currently deactivated and cannot accept nominations.");
        }
        // 3. Resolve nomination source
        let source = dto.nominationSource || "HR";
        const isSelf = nominee.userId === nominatorUserId ||
            (nominatorEmployeeId && nominee.id === nominatorEmployeeId);
        if (isSelf) {
            source = "SELF";
            if (!awardType.allowSelfNomination) {
                throw new Error("Self-nomination is not permitted for this award category.");
            }
        }
        else if (isHRAuthorized) {
            source = dto.nominationSource || "HR";
        }
        else if (nominatorEmployeeId) {
            const isManager = await this.isManagerOf(nominatorEmployeeId, nominee.id, tenantId);
            if (isManager) {
                source = "MANAGER";
            }
            else {
                source = "PEER";
                if (!awardType.allowPeerNomination) {
                    throw new Error("Peer nominations are disabled for this award category.");
                }
            }
        }
        else {
            source = "PEER";
            if (!awardType.allowPeerNomination) {
                throw new Error("Peer nominations are disabled for this award category.");
            }
        }
        // 4. Duplicate active nomination prevention
        const existingActive = await prisma_1.prisma.awardNomination.findFirst({
            where: {
                tenantId,
                employeeId: nominee.id,
                awardTypeId: awardType.id,
                status: { in: ["PENDING", "SUBMITTED", "PENDING_MANAGER", "PENDING_DEPARTMENT", "PENDING_HR"] },
            },
        });
        if (existingActive) {
            throw new Error(`An active nomination (${existingActive.nominationNumber}) for ${nominee.firstName} ${nominee.lastName} under '${awardType.name}' is already in progress.`);
        }
        // 5. Generate nomination number
        const certSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
        const nominationNumber = `NOM-${new Date().getFullYear()}-${certSuffix}`;
        // 6. Submit into Workflow Engine if approval is required
        let approvalRequestId = null;
        let initialStatus = "PENDING";
        if (awardType.requiresApproval) {
            try {
                const wfRequest = await workflow_service_1.WorkflowService.submit({
                    tenantId,
                    module: "AWARDS",
                    entityType: "AWARD_NOMINATION",
                    entityId: nominationNumber, // Will update or link
                    requesterId: nominatorUserId,
                    workflowId: awardType.workflowId || undefined,
                    payloadSnapshot: {
                        nominationNumber,
                        nomineeId: nominee.id,
                        nomineeName: `${nominee.firstName} ${nominee.lastName}`,
                        awardTypeId: awardType.id,
                        awardTypeName: awardType.name,
                        source,
                        reason,
                    },
                });
                if (!wfRequest || !wfRequest.id) {
                    throw new Error("Workflow submission did not return an approval request ID.");
                }
                approvalRequestId = wfRequest.id;
                initialStatus = "PENDING";
            }
            catch (wfErr) {
                console.error("[AwardNomination] Workflow auto-submission failed:", wfErr.message);
                throw new Error(`Failed to initiate nomination approval workflow: ${wfErr.message}`);
            }
        }
        else if (isHRAuthorized) {
            initialStatus = "APPROVED";
        }
        // 7. Create Award Nomination Record
        const nomination = await prisma_1.prisma.awardNomination.create({
            data: {
                tenantId,
                nominationNumber,
                employeeId: nominee.id,
                awardTypeId: awardType.id,
                nominatedByUserId: nominatorUserId,
                nominatedByEmployeeId: nominatorEmployeeId || null,
                nominationSource: source,
                reason: reason.trim(),
                achievementDescription: achievementDescription?.trim() || null,
                supportingDocUrl: supportingDocUrl || null,
                status: initialStatus,
                currentStep: 1,
                approvalRequestId,
                submittedAt: new Date(),
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        userId: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { id: true, name: true } },
                    },
                },
                awardType: true,
            },
        });
        // 8. Audit Log
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: nominatorUserId,
            action: "AWARD_NOMINATION_CREATED",
            entityType: "AwardNomination",
            entityId: nomination.id,
            newState: {
                nominationNumber: nomination.nominationNumber,
                nomineeId: nominee.id,
                awardTypeId: awardType.id,
                source,
                status: nomination.status,
            },
        }).catch((err) => console.warn("Audit error:", err.message));
        // 9. Dispatch Notifications (Safely catching errors so approval never fails)
        try {
            // Notify nominee
            if (nominee.userId && nominee.userId !== nominatorUserId) {
                await notification_service_1.NotificationService.createNotification({
                    tenantId,
                    userId: nominee.userId,
                    title: "Award Nomination Submitted",
                    message: `You have been nominated for '${awardType.name}' recognition!`,
                    type: "award_nomination",
                    actionUrl: `/me/awards`,
                });
            }
            // Notify reporting manager if not the nominator
            if (nominee.managerId && nominee.managerId !== nominatorEmployeeId) {
                const mgr = await prisma_1.prisma.employee.findUnique({
                    where: { id: nominee.managerId },
                    select: { userId: true },
                });
                if (mgr?.userId) {
                    await notification_service_1.NotificationService.createNotification({
                        tenantId,
                        userId: mgr.userId,
                        title: "Team Award Nomination",
                        message: `${nominee.firstName} ${nominee.lastName} has been nominated for '${awardType.name}'.`,
                        type: "award_nomination",
                        actionUrl: `/me/approvals`,
                    });
                }
            }
        }
        catch (notifErr) {
            console.warn("[AwardNomination] Notification dispatch failed:", notifErr.message);
        }
        (0, socket_1.broadcastToTenant)(tenantId, "award_nomination:created", nomination);
        return nomination;
    }
    /**
     * Retrieves nominations with tenant isolation and role-specific scoping.
     */
    static async getNominations(params) {
        const { tenantId, userId, employeeId, isHRAuthorized, myOnly, status, awardTypeId, nominationSource, search, page = 1, limit = 20, } = params;
        const where = { tenantId };
        // Role and scope filtering
        if (!isHRAuthorized || myOnly) {
            const orConditions = [{ nominatedByUserId: userId }];
            if (employeeId) {
                orConditions.push({ employeeId: employeeId });
                // Include subordinates if user is a manager
                orConditions.push({
                    employee: {
                        managerId: employeeId,
                    },
                });
            }
            where.OR = orConditions;
        }
        if (status && status !== "ALL") {
            where.status = status;
        }
        if (awardTypeId && awardTypeId !== "ALL") {
            where.awardTypeId = awardTypeId;
        }
        if (nominationSource && nominationSource !== "ALL") {
            where.nominationSource = nominationSource;
        }
        if (search && search.trim()) {
            const s = search.trim();
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { nominationNumber: { contains: s, mode: "insensitive" } },
                        { reason: { contains: s, mode: "insensitive" } },
                        { achievementDescription: { contains: s, mode: "insensitive" } },
                        {
                            employee: {
                                OR: [
                                    { firstName: { contains: s, mode: "insensitive" } },
                                    { lastName: { contains: s, mode: "insensitive" } },
                                    { employeeCode: { contains: s, mode: "insensitive" } },
                                ],
                            },
                        },
                        { awardType: { name: { contains: s, mode: "insensitive" } } },
                    ],
                },
            ];
        }
        const skip = (Math.max(1, page) - 1) * limit;
        const [total, nominations] = await Promise.all([
            prisma_1.prisma.awardNomination.count({ where }),
            prisma_1.prisma.awardNomination.findMany({
                where,
                include: {
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            employeeCode: true,
                            managerId: true,
                            department: { select: { id: true, name: true } },
                        },
                    },
                    awardType: true,
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
        ]);
        // Aggregate counts
        const counts = await prisma_1.prisma.awardNomination.groupBy({
            by: ["status"],
            where: { tenantId },
            _count: { id: true },
        });
        const statusCounts = {
            total: 0,
            PENDING: 0,
            APPROVED: 0,
            REJECTED: 0,
            CHANGES_REQUESTED: 0,
            AWARD_ISSUED: 0,
        };
        counts.forEach((c) => {
            statusCounts[c.status] = c._count.id;
            statusCounts.total += c._count.id;
        });
        return {
            data: nominations,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            counts: statusCounts,
        };
    }
    /**
     * Approves a nomination. Validates segregation-of-duties and stage hierarchy.
     */
    static async approveNomination(dto) {
        const { tenantId, nominationId, actorUserId, actorEmployeeId, isHRAuthorized, comment } = dto;
        const nomination = await prisma_1.prisma.awardNomination.findFirst({
            where: { id: nominationId, tenantId },
            include: {
                employee: {
                    select: {
                        id: true,
                        userId: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { id: true, name: true } },
                    },
                },
                awardType: true,
            },
        });
        if (!nomination) {
            throw new Error("Nomination not found.");
        }
        if (nomination.status === "APPROVED" || nomination.status === "AWARD_ISSUED") {
            return nomination; // Idempotent return
        }
        if (nomination.status === "REJECTED" || nomination.status === "CANCELLED") {
            throw new Error(`Cannot approve a ${nomination.status.toLowerCase()} nomination.`);
        }
        // Segregation of duties: Nominator cannot approve unless authorized HR Administrator
        if (nomination.nominatedByUserId === actorUserId && !isHRAuthorized) {
            throw new Error("Segregation of duties violation: You cannot approve a nomination that you submitted.");
        }
        // Nominee cannot approve their own nomination
        if (nomination.employee.userId === actorUserId ||
            (actorEmployeeId && nomination.employee.id === actorEmployeeId)) {
            throw new Error("Employees cannot approve their own nominations.");
        }
        let nextStatus = "APPROVED";
        if (nomination.awardType.requiresApproval) {
            // 1. Mandatory approval request validation (Close null bypass)
            if (!nomination.approvalRequestId) {
                throw new Error("Approval request record is missing or corrupted for this nomination. Cannot approve without workflow verification.");
            }
            const approvalRequest = await prisma_1.prisma.approvalRequest.findFirst({
                where: { id: nomination.approvalRequestId, tenantId },
                include: {
                    workflow: {
                        include: {
                            steps: { orderBy: { stepOrder: "asc" } },
                        },
                    },
                    actions: true,
                },
            });
            if (!approvalRequest) {
                throw new Error("Linked workflow approval request was not found for this tenant.");
            }
            if (approvalRequest.status !== "PENDING") {
                throw new Error(`Cannot approve nomination: workflow is currently in '${approvalRequest.status}' status.`);
            }
            // 2. Segregation of duties: Same-actor re-approval prevention
            const priorApproved = approvalRequest.actions.some((action) => action.actorId === actorUserId && action.action === "APPROVE");
            if (priorApproved) {
                throw new Error("Segregation of duties violation: You have already approved a step in this nomination workflow.");
            }
            // 3. Step-Specific Approver Authorization
            const currentStepNum = approvalRequest.currentStep;
            const stepDef = approvalRequest.workflow.steps.find((s) => s.stepOrder === currentStepNum);
            if (!stepDef) {
                throw new Error(`Workflow configuration error: Step ${currentStepNum} does not exist in workflow definition.`);
            }
            // Resolve all roles for actor across JWT claims, user_roles, and RBAC assignments
            let effectiveRoles = dto.actorRoles && dto.actorRoles.length > 0 ? [...dto.actorRoles] : [];
            try {
                const dbRoles = await prisma_1.prisma.userRole.findMany({
                    where: { userId: actorUserId, OR: [{ tenantId }, { tenantId: null }] },
                });
                for (const r of dbRoles) {
                    effectiveRoles.push(String(r.role).toLowerCase());
                }
                const roleAssignment = await prisma_1.prisma.userRoleAssignment.findUnique({
                    where: { userId_tenantId: { userId: actorUserId, tenantId } },
                    include: { role: true },
                });
                if (roleAssignment?.role?.slug) {
                    effectiveRoles.push(roleAssignment.role.slug.toLowerCase());
                }
                if (roleAssignment?.role?.name) {
                    effectiveRoles.push(roleAssignment.role.name.toLowerCase());
                }
            }
            catch (roleErr) {
                console.warn("[AwardNomination] Role resolution warning:", roleErr.message);
            }
            effectiveRoles = Array.from(new Set(effectiveRoles.map((r) => r.toLowerCase())));
            const isSuperOrTenantAdmin = effectiveRoles.includes("super_admin") ||
                effectiveRoles.includes("tenant_admin") ||
                effectiveRoles.includes("admin") ||
                effectiveRoles.includes("workspace admin");
            const approverType = (stepDef.approverType || "ROLE").toUpperCase();
            const approverValue = (stepDef.approverValue || "").toLowerCase();
            const cleanRoles = effectiveRoles.map((r) => r.replace(/[_\s-]+/g, "").toLowerCase());
            const cleanApproverValue = approverValue.replace(/[_\s-]+/g, "").toLowerCase();
            let isStepAuthorized = false;
            if (approverType === "MANAGER") {
                if (actorEmployeeId) {
                    isStepAuthorized = await this.isManagerOf(actorEmployeeId, nomination.employee.id, tenantId);
                }
            }
            else if (approverType === "DEPARTMENT_HEAD") {
                isStepAuthorized =
                    cleanRoles.includes("departmenthead") ||
                        cleanRoles.includes("depthead") ||
                        (cleanApproverValue && cleanRoles.includes(cleanApproverValue));
            }
            else if (approverType === "ROLE") {
                isStepAuthorized = cleanRoles.includes(cleanApproverValue) || isSuperOrTenantAdmin;
            }
            else if (approverType === "USER") {
                isStepAuthorized =
                    stepDef.approverValue === actorUserId ||
                        (actorEmployeeId && stepDef.approverValue === actorEmployeeId);
            }
            else if (approverType === "GROUP") {
                isStepAuthorized = cleanRoles.includes(cleanApproverValue) || isSuperOrTenantAdmin;
            }
            else {
                isStepAuthorized = isHRAuthorized;
            }
            if (!isStepAuthorized && !isSuperOrTenantAdmin) {
                throw new Error(`Access denied: You are not authorized to approve step ${currentStepNum} (${stepDef.name || approverType}). Required: ${approverType}${approverValue ? ` '${approverValue}'` : ""}.`);
            }
            // 4. Advance Workflow Step via WorkflowService (rejection bubbles up without bypass)
            const wfResult = await workflow_service_1.WorkflowService.approveStep({
                tenantId,
                requestId: nomination.approvalRequestId,
                actorId: actorUserId,
                comment,
            });
            nextStatus = wfResult.status === "APPROVED" ? "APPROVED" : "PENDING";
        }
        else {
            // Award type does NOT require approval
            if (!isHRAuthorized) {
                throw new Error("Access denied: Only HR authorized personnel can directly approve awards without workflow.");
            }
            nextStatus = "APPROVED";
        }
        const updated = await prisma_1.prisma.awardNomination.update({
            where: { id: nomination.id },
            data: {
                status: nextStatus,
                approvedAt: nextStatus === "APPROVED" ? new Date() : undefined,
                currentStep: nomination.currentStep + 1,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        userId: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { id: true, name: true } },
                    },
                },
                awardType: true,
            },
        });
        // Audit
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: actorUserId,
            action: "AWARD_NOMINATION_APPROVED",
            entityType: "AwardNomination",
            entityId: nomination.id,
            newState: { status: nextStatus, comment },
        }).catch((err) => console.warn("Audit error:", err.message));
        // Notifications
        try {
            if (nomination.nominatedByUserId) {
                await notification_service_1.NotificationService.createNotification({
                    tenantId,
                    userId: nomination.nominatedByUserId,
                    title: "Nomination Approved",
                    message: `Nomination ${nomination.nominationNumber} for ${nomination.employee.firstName} ${nomination.employee.lastName} was approved.`,
                    type: "award_nomination",
                    actionUrl: `/me/awards`,
                });
            }
        }
        catch (e) {
            console.warn("Notification error:", e.message);
        }
        (0, socket_1.broadcastToTenant)(tenantId, "award_nomination:updated", updated);
        return updated;
    }
    /**
     * Rejects a nomination.
     */
    static async rejectNomination(dto) {
        const { tenantId, nominationId, actorUserId, actorEmployeeId, isHRAuthorized, comment } = dto;
        const nomination = await prisma_1.prisma.awardNomination.findFirst({
            where: { id: nominationId, tenantId },
            include: {
                employee: {
                    select: {
                        id: true,
                        userId: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { id: true, name: true } },
                    },
                },
                awardType: true,
            },
        });
        if (!nomination) {
            throw new Error("Nomination not found.");
        }
        if (nomination.status === "AWARD_ISSUED") {
            throw new Error("Cannot reject a nomination after the official award has already been issued.");
        }
        if (nomination.status === "REJECTED") {
            return nomination; // Idempotent
        }
        // Check authority
        let authorized = isHRAuthorized;
        if (!authorized && actorEmployeeId) {
            authorized = await this.isManagerOf(actorEmployeeId, nomination.employee.id, tenantId);
        }
        if (!authorized) {
            throw new Error("Access denied: You are not authorized to reject this nomination.");
        }
        if (nomination.approvalRequestId) {
            try {
                await workflow_service_1.WorkflowService.rejectStep({
                    tenantId,
                    requestId: nomination.approvalRequestId,
                    actorId: actorUserId,
                    comment,
                });
            }
            catch (wfErr) {
                console.warn("[AwardNomination] Workflow rejection warning:", wfErr.message);
            }
        }
        const updated = await prisma_1.prisma.awardNomination.update({
            where: { id: nomination.id },
            data: {
                status: "REJECTED",
                rejectedAt: new Date(),
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        userId: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { id: true, name: true } },
                    },
                },
                awardType: true,
            },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: actorUserId,
            action: "AWARD_NOMINATION_REJECTED",
            entityType: "AwardNomination",
            entityId: nomination.id,
            newState: { status: "REJECTED", comment },
        }).catch((err) => console.warn("Audit error:", err.message));
        try {
            if (nomination.nominatedByUserId) {
                await notification_service_1.NotificationService.createNotification({
                    tenantId,
                    userId: nomination.nominatedByUserId,
                    title: "Nomination Not Approved",
                    message: `Nomination ${nomination.nominationNumber} was not approved.${comment ? ` Feedback: ${comment}` : ""}`,
                    type: "award_nomination",
                    actionUrl: `/me/awards`,
                });
            }
        }
        catch (e) {
            console.warn("Notification error:", e.message);
        }
        (0, socket_1.broadcastToTenant)(tenantId, "award_nomination:updated", updated);
        return updated;
    }
    /**
     * Requests modifications or additional evidence.
     */
    static async requestChanges(dto) {
        const { tenantId, nominationId, actorUserId, actorEmployeeId, isHRAuthorized, comment } = dto;
        const nomination = await prisma_1.prisma.awardNomination.findFirst({
            where: { id: nominationId, tenantId },
            include: {
                employee: {
                    select: {
                        id: true,
                        userId: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { id: true, name: true } },
                    },
                },
            },
        });
        if (!nomination) {
            throw new Error("Nomination not found.");
        }
        let authorized = isHRAuthorized;
        if (!authorized && actorEmployeeId) {
            authorized = await this.isManagerOf(actorEmployeeId, nomination.employee.id, tenantId);
        }
        if (!authorized) {
            throw new Error("Access denied: Not authorized to request changes.");
        }
        const updated = await prisma_1.prisma.awardNomination.update({
            where: { id: nomination.id },
            data: { status: "CHANGES_REQUESTED" },
            include: {
                employee: {
                    select: {
                        id: true,
                        userId: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { id: true, name: true } },
                    },
                },
                awardType: true,
            },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: actorUserId,
            action: "AWARD_NOMINATION_CHANGES_REQUESTED",
            entityType: "AwardNomination",
            entityId: nomination.id,
            newState: { status: "CHANGES_REQUESTED", comment },
        }).catch((err) => console.warn("Audit error:", err.message));
        try {
            if (nomination.nominatedByUserId) {
                await notification_service_1.NotificationService.createNotification({
                    tenantId,
                    userId: nomination.nominatedByUserId,
                    title: "Nomination Changes Requested",
                    message: `Feedback received on nomination ${nomination.nominationNumber}: ${comment || "Please provide additional details."}`,
                    type: "award_nomination",
                    actionUrl: `/me/awards`,
                });
            }
        }
        catch (e) {
            console.warn("Notification error:", e.message);
        }
        (0, socket_1.broadcastToTenant)(tenantId, "award_nomination:updated", updated);
        return updated;
    }
    /**
     * Concludes an approved nomination by conferring an official award.
     * Transactional and strictly idempotent.
     */
    static async issueOfficialAward(dto) {
        const { tenantId, nominationId, issuerUserId, issuerName, giftItem, giftAmount, presentedBy } = dto;
        // 1. Fetch nomination with relations
        const nomination = await prisma_1.prisma.awardNomination.findFirst({
            where: { id: nominationId, tenantId },
            include: {
                employee: {
                    select: {
                        id: true,
                        userId: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { id: true, name: true } },
                    },
                },
                awardType: true,
            },
        });
        if (!nomination) {
            throw new Error("Nomination not found.");
        }
        // 2. Idempotency Check: Reject repeated issuance
        if (nomination.status === "AWARD_ISSUED") {
            throw new Error("This nomination has already been converted into an official award.");
        }
        // 3. Validation: Must be in APPROVED status
        if (nomination.status !== "APPROVED") {
            throw new Error(`Cannot issue official award: Nomination is in '${nomination.status}' status (must be 'APPROVED').`);
        }
        // 4. Validate AwardType is active
        if (nomination.awardType.status === "inactive") {
            throw new Error("Cannot issue award: The associated award category has been deactivated.");
        }
        const awardDate = new Date();
        const certSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
        const certificateNo = `AWD-${awardDate.getFullYear()}-${certSuffix}`;
        const defaultTitle = nomination.awardType.name || "Excellence Honor";
        // 5. Interactive Transaction for Idempotent Concurrence
        const createdAward = await prisma_1.prisma.$transaction(async (tx) => {
            // Create official award
            const award = await tx.award.create({
                data: {
                    tenantId,
                    employeeId: nomination.employee.id,
                    awardTypeId: nomination.awardType.id,
                    nominationId: nomination.id,
                    awardDate,
                    giftItem: giftItem?.trim() || defaultTitle,
                    giftAmount: giftAmount !== undefined ? Number(giftAmount) : 0,
                    description: nomination.reason,
                    certificateNo,
                    presentedBy: presentedBy?.trim() || issuerName || "Executive Management",
                    status: "awarded",
                },
                include: {
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            employeeCode: true,
                            department: { select: { id: true, name: true } },
                        },
                    },
                    awardType: true,
                },
            });
            // Mark nomination as AWARD_ISSUED
            await tx.awardNomination.update({
                where: { id: nomination.id },
                data: {
                    status: "AWARD_ISSUED",
                    issuedAwardId: award.id,
                },
            });
            return award;
        });
        // 6. Audit
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: issuerUserId,
            action: "EMPLOYEE_AWARD_CONFERRED_FROM_NOMINATION",
            entityType: "Award",
            entityId: createdAward.id,
            newState: {
                awardId: createdAward.id,
                nominationId: nomination.id,
                certificateNo: createdAward.certificateNo,
            },
        }).catch((err) => console.warn("Audit error:", err.message));
        // 7. Notification
        try {
            if (nomination.employee.id) {
                const emp = await prisma_1.prisma.employee.findUnique({
                    where: { id: nomination.employee.id },
                    select: { userId: true },
                });
                if (emp?.userId) {
                    await notification_service_1.NotificationService.createNotification({
                        tenantId,
                        userId: emp.userId,
                        title: "Award Conferred!",
                        message: `Congratulations! You have officially received '${nomination.awardType.name}' (Certificate: ${createdAward.certificateNo}).`,
                        type: "award",
                        actionUrl: `/me/awards`,
                    });
                }
            }
        }
        catch (e) {
            console.warn("Notification error:", e.message);
        }
        (0, socket_1.broadcastToTenant)(tenantId, "award:created", createdAward);
        (0, socket_1.broadcastToTenant)(tenantId, "notification:new", {
            title: "Award Presented",
            description: `${createdAward.employee.firstName} ${createdAward.employee.lastName} was presented with '${createdAward.awardType?.name || createdAward.giftItem}'!`,
            type: "award",
            timestamp: new Date().toISOString(),
        });
        return createdAward;
    }
}
exports.AwardNominationService = AwardNominationService;
