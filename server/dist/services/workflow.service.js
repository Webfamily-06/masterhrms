"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowService = void 0;
const tenant_context_1 = require("../context/tenant-context");
const audit_service_1 = require("./audit.service");
const outbox_service_1 = require("./outbox.service");
class WorkflowService {
    /**
     * Submits an entity for workflow approval.
     */
    static async submit(params) {
        const db = (0, tenant_context_1.getTenantDb)();
        // 1. Locate Workflow Definition
        let workflow = null;
        if (params.workflowId) {
            workflow = await db.workflowDefinition.findFirst({
                where: { id: params.workflowId, tenantId: params.tenantId, isActive: true },
                include: { steps: { orderBy: { stepOrder: "asc" } } },
            });
        }
        if (!workflow) {
            workflow = await db.workflowDefinition.findFirst({
                where: {
                    tenantId: params.tenantId,
                    entityType: params.entityType,
                    isActive: true,
                },
                include: { steps: { orderBy: { stepOrder: "asc" } } },
            });
        }
        // If no workflow definition configured, auto-create a single-step default workflow
        if (!workflow) {
            workflow = await db.workflowDefinition.create({
                data: {
                    tenantId: params.tenantId,
                    module: params.module || "SYSTEM",
                    entityType: params.entityType,
                    name: `Default ${params.entityType} Workflow`,
                    isActive: true,
                    steps: {
                        create: [
                            {
                                stepOrder: 1,
                                name: "Manager Approval",
                                approverType: "MANAGER",
                            },
                        ],
                    },
                },
                include: { steps: { orderBy: { stepOrder: "asc" } } },
            });
        }
        // 2. Create approval request and audit inside interactive transaction
        return await db.$transaction(async (tx) => {
            const request = await tx.approvalRequest.create({
                data: {
                    tenantId: params.tenantId,
                    workflowId: workflow.id,
                    entityType: params.entityType,
                    entityId: params.entityId,
                    requesterId: params.requesterId,
                    status: "PENDING",
                    currentStep: 1,
                    payloadJson: params.payloadSnapshot ?? {},
                    actions: {
                        create: {
                            tenantId: params.tenantId,
                            stepNumber: 1,
                            actorId: params.requesterId,
                            action: "SUBMIT",
                            comment: "Request submitted for approval",
                        },
                    },
                },
                include: {
                    workflow: { include: { steps: true } },
                    actions: true,
                },
            });
            // 3. Write Audit Log
            await audit_service_1.AuditService.logMutation({
                tenantId: params.tenantId,
                actorId: params.requesterId,
                action: "WORKFLOW_SUBMIT",
                entityType: params.entityType,
                entityId: params.entityId,
                newState: { requestId: request.id, status: "PENDING", step: 1 },
            }, tx);
            // 4. Persist Outbox Event
            await outbox_service_1.OutboxService.createOutboxEvent({
                tenantId: params.tenantId,
                eventType: "workflow.submitted",
                entityType: params.entityType,
                entityId: params.entityId,
                actorId: params.requesterId,
                payload: {
                    requestId: request.id,
                    status: "PENDING",
                    currentStep: 1,
                    requesterId: params.requesterId,
                },
                metadata: {
                    targetUserId: params.requesterId,
                },
            }, tx);
            return request;
        });
    }
    /**
     * Approves the current step in a workflow request.
     */
    static async approveStep(params) {
        const db = (0, tenant_context_1.getTenantDb)();
        const request = await db.approvalRequest.findFirst({
            where: { id: params.requestId, tenantId: params.tenantId },
            include: { workflow: { include: { steps: { orderBy: { stepOrder: "asc" } } } } },
        });
        if (!request) {
            throw new Error("Approval request not found");
        }
        if (request.status !== "PENDING") {
            throw new Error(`Cannot approve request in ${request.status} status`);
        }
        const currentStep = request.currentStep;
        const allSteps = request.workflow.steps;
        const isLastStep = currentStep >= allSteps.length;
        const nextStatus = isLastStep ? "APPROVED" : "PENDING";
        const nextStep = isLastStep ? currentStep : currentStep + 1;
        return await db.$transaction(async (tx) => {
            // 1. Record Action
            await tx.approvalAction.create({
                data: {
                    tenantId: params.tenantId,
                    requestId: request.id,
                    stepNumber: currentStep,
                    actorId: params.actorId,
                    action: "APPROVE",
                    comment: params.comment ?? null,
                },
            });
            // 2. Update Request
            const updated = await tx.approvalRequest.update({
                where: { id: request.id },
                data: {
                    status: nextStatus,
                    currentStep: nextStep,
                },
                include: { actions: true },
            });
            // 3. Write Audit Log
            await audit_service_1.AuditService.logMutation({
                tenantId: params.tenantId,
                actorId: params.actorId,
                action: isLastStep ? "WORKFLOW_APPROVED" : "WORKFLOW_STEP_APPROVED",
                entityType: request.entityType,
                entityId: request.entityId,
                oldState: { status: request.status, step: currentStep },
                newState: { status: nextStatus, step: nextStep },
            }, tx);
            // 4. Persist Outbox Event
            await outbox_service_1.OutboxService.createOutboxEvent({
                tenantId: params.tenantId,
                eventType: isLastStep ? "workflow.approved" : "workflow.step_approved",
                entityType: request.entityType,
                entityId: request.entityId,
                actorId: params.actorId,
                payload: {
                    requestId: request.id,
                    status: nextStatus,
                    currentStep: nextStep,
                    approvedBy: params.actorId,
                    requesterId: request.requesterId,
                },
                metadata: {
                    targetUserId: request.requesterId,
                },
            }, tx);
            return updated;
        });
    }
    /**
     * Rejects a workflow request.
     */
    static async rejectStep(params) {
        const db = (0, tenant_context_1.getTenantDb)();
        const request = await db.approvalRequest.findFirst({
            where: { id: params.requestId, tenantId: params.tenantId },
        });
        if (!request) {
            throw new Error("Approval request not found");
        }
        if (request.status !== "PENDING") {
            throw new Error(`Cannot reject request in ${request.status} status`);
        }
        return await db.$transaction(async (tx) => {
            // 1. Record Action
            await tx.approvalAction.create({
                data: {
                    tenantId: params.tenantId,
                    requestId: request.id,
                    stepNumber: request.currentStep,
                    actorId: params.actorId,
                    action: "REJECT",
                    comment: params.comment ?? null,
                },
            });
            // 2. Update Request
            const updated = await tx.approvalRequest.update({
                where: { id: request.id },
                data: {
                    status: "REJECTED",
                },
                include: { actions: true },
            });
            // 3. Audit Log
            await audit_service_1.AuditService.logMutation({
                tenantId: params.tenantId,
                actorId: params.actorId,
                action: "WORKFLOW_REJECTED",
                entityType: request.entityType,
                entityId: request.entityId,
                oldState: { status: request.status },
                newState: { status: "REJECTED" },
            }, tx);
            // 4. Outbox Event
            await outbox_service_1.OutboxService.createOutboxEvent({
                tenantId: params.tenantId,
                eventType: "workflow.rejected",
                entityType: request.entityType,
                entityId: request.entityId,
                actorId: params.actorId,
                payload: {
                    requestId: request.id,
                    status: "REJECTED",
                    rejectedBy: params.actorId,
                    comment: params.comment,
                    requesterId: request.requesterId,
                },
                metadata: {
                    targetUserId: request.requesterId,
                },
            }, tx);
            return updated;
        });
    }
    /**
     * Withdraws a pending request by the requester.
     */
    static async withdrawRequest(params) {
        const db = (0, tenant_context_1.getTenantDb)();
        const request = await db.approvalRequest.findFirst({
            where: { id: params.requestId, tenantId: params.tenantId },
        });
        if (!request) {
            throw new Error("Approval request not found");
        }
        if (request.status !== "PENDING") {
            throw new Error(`Cannot withdraw request in ${request.status} status`);
        }
        return await db.$transaction(async (tx) => {
            await tx.approvalAction.create({
                data: {
                    tenantId: params.tenantId,
                    requestId: request.id,
                    stepNumber: request.currentStep,
                    actorId: params.actorId,
                    action: "WITHDRAW",
                    comment: params.comment ?? "Withdrawn by requester",
                },
            });
            const updated = await tx.approvalRequest.update({
                where: { id: request.id },
                data: { status: "WITHDRAWN" },
            });
            await audit_service_1.AuditService.logMutation({
                tenantId: params.tenantId,
                actorId: params.actorId,
                action: "WORKFLOW_WITHDRAWN",
                entityType: request.entityType,
                entityId: request.entityId,
                oldState: { status: "PENDING" },
                newState: { status: "WITHDRAWN" },
            }, tx);
            await outbox_service_1.OutboxService.createOutboxEvent({
                tenantId: params.tenantId,
                eventType: "workflow.withdrawn",
                entityType: request.entityType,
                entityId: request.entityId,
                actorId: params.actorId,
                payload: { requestId: request.id, status: "WITHDRAWN" },
            }, tx);
            return updated;
        });
    }
    /**
     * Delegates approval step to another user.
     */
    static async delegateStep(params) {
        const db = (0, tenant_context_1.getTenantDb)();
        const request = await db.approvalRequest.findFirst({
            where: { id: params.requestId, tenantId: params.tenantId },
        });
        if (!request)
            throw new Error("Approval request not found");
        if (request.status !== "PENDING")
            throw new Error("Request is not pending approval");
        return await db.$transaction(async (tx) => {
            await tx.approvalAction.create({
                data: {
                    tenantId: params.tenantId,
                    requestId: request.id,
                    stepNumber: request.currentStep,
                    actorId: params.actorId,
                    action: "DELEGATE",
                    comment: params.comment ?? null,
                    metadataJson: { delegatedTo: params.delegateToUserId },
                },
            });
            await audit_service_1.AuditService.logMutation({
                tenantId: params.tenantId,
                actorId: params.actorId,
                action: "WORKFLOW_DELEGATED",
                entityType: request.entityType,
                entityId: request.entityId,
                metadata: { delegatedTo: params.delegateToUserId },
            }, tx);
            await outbox_service_1.OutboxService.createOutboxEvent({
                tenantId: params.tenantId,
                eventType: "workflow.delegated",
                entityType: request.entityType,
                entityId: request.entityId,
                actorId: params.actorId,
                payload: {
                    requestId: request.id,
                    delegatedTo: params.delegateToUserId,
                    delegatedBy: params.actorId,
                },
                metadata: {
                    targetUserId: params.delegateToUserId,
                },
            }, tx);
            return { success: true, requestId: request.id, delegatedTo: params.delegateToUserId };
        });
    }
}
exports.WorkflowService = WorkflowService;
