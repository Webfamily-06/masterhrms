"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformFoundationRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_context_1 = require("../context/tenant-context");
const notification_service_1 = require("../services/notification.service");
const workflow_service_1 = require("../services/workflow.service");
const audit_service_1 = require("../services/audit.service");
const allowed_actions_1 = require("../lib/allowed-actions");
const data_scope_1 = require("../lib/data-scope");
const master_data_blueprint_1 = require("../blueprints/master-data.blueprint");
const organization_routes_1 = require("./organization.routes");
const hr_employees_routes_1 = require("./hr-employees.routes");
const hr_attendance_routes_1 = require("./hr-attendance.routes");
const hr_leave_routes_1 = require("./hr-leave.routes");
const me_attendance_routes_1 = require("./me-attendance.routes");
const me_leave_routes_1 = require("./me-leave.routes");
const hr_payroll_routes_1 = require("./hr-payroll.routes");
const me_payroll_routes_1 = require("./me-payroll.routes");
const hr_recruitment_routes_1 = require("./hr-recruitment.routes");
const me_recruitment_routes_1 = require("./me-recruitment.routes");
const hr_lifecycle_routes_1 = require("./hr-lifecycle.routes");
const hr_performance_routes_1 = require("./hr-performance.routes");
const me_lifecycle_routes_1 = require("./me-lifecycle.routes");
const me_performance_routes_1 = require("./me-performance.routes");
const hr_training_routes_1 = require("./hr-training.routes");
const me_training_routes_1 = require("./me-training.routes");
const hr_assets_routes_1 = require("./hr-assets.routes");
const me_assets_routes_1 = require("./me-assets.routes");
const hr_meetings_routes_1 = require("./hr-meetings.routes");
const me_meetings_routes_1 = require("./me-meetings.routes");
const hr_documents_routes_1 = require("./hr-documents.routes");
const me_documents_routes_1 = require("./me-documents.routes");
const hr_collaboration_routes_1 = require("./hr-collaboration.routes");
const me_collaboration_routes_1 = require("./me-collaboration.routes");
exports.platformFoundationRouter = (0, express_1.Router)();
exports.platformFoundationRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// =========================================================================
// P2. ORGANIZATION & EMPLOYEES BUSINESS LAYER
// =========================================================================
exports.platformFoundationRouter.use("/hr/organization", organization_routes_1.organizationRouter);
exports.platformFoundationRouter.use("/hr/employees", hr_employees_routes_1.hrEmployeesRouter);
// =========================================================================
// P3. ATTENDANCE & LEAVE BUSINESS LAYER
// =========================================================================
exports.platformFoundationRouter.use("/hr/attendance", hr_attendance_routes_1.hrAttendanceRouter);
exports.platformFoundationRouter.use("/hr/leave", hr_leave_routes_1.hrLeaveRouter);
exports.platformFoundationRouter.use("/me/attendance", me_attendance_routes_1.meAttendanceRouter);
exports.platformFoundationRouter.use("/me/leave", me_leave_routes_1.meLeaveRouter);
// =========================================================================
// P4. PAYROLL & FINANCE BUSINESS LAYER
// =========================================================================
exports.platformFoundationRouter.use("/hr/payroll", hr_payroll_routes_1.hrPayrollRouter);
exports.platformFoundationRouter.use("/me/payroll", me_payroll_routes_1.mePayrollRouter);
// =========================================================================
// P5. RECRUITMENT & TALENT BUSINESS LAYER
// =========================================================================
exports.platformFoundationRouter.use("/hr/recruitment", hr_recruitment_routes_1.hrRecruitmentRouter);
exports.platformFoundationRouter.use("/me/recruitment", me_recruitment_routes_1.meRecruitmentRouter);
// =========================================================================
// P6. LIFECYCLE & PERFORMANCE BUSINESS LAYER
// =========================================================================
exports.platformFoundationRouter.use("/hr/lifecycle", hr_lifecycle_routes_1.hrLifecycleRouter);
exports.platformFoundationRouter.use("/hr/performance", hr_performance_routes_1.hrPerformanceRouter);
exports.platformFoundationRouter.use("/me/lifecycle", me_lifecycle_routes_1.meLifecycleRouter);
exports.platformFoundationRouter.use("/me/performance", me_performance_routes_1.mePerformanceRouter);
// =========================================================================
// P7. TRAINING, ASSETS, MEETINGS, DOCUMENTS BUSINESS LAYER
// =========================================================================
exports.platformFoundationRouter.use("/hr/training", hr_training_routes_1.hrTrainingRouter);
exports.platformFoundationRouter.use("/me/training", me_training_routes_1.meTrainingRouter);
exports.platformFoundationRouter.use("/hr/assets", hr_assets_routes_1.hrAssetsRouter);
exports.platformFoundationRouter.use("/me/assets", me_assets_routes_1.meAssetsRouter);
exports.platformFoundationRouter.use("/hr/meetings", hr_meetings_routes_1.hrMeetingsRouter);
exports.platformFoundationRouter.use("/me/meetings", me_meetings_routes_1.meMeetingsRouter);
exports.platformFoundationRouter.use("/hr/documents", hr_documents_routes_1.hrDocumentsRouter);
exports.platformFoundationRouter.use("/me/documents", me_documents_routes_1.meDocumentsRouter);
// =========================================================================
// P8. COLLABORATION & FINAL POLISH BUSINESS LAYER
// =========================================================================
exports.platformFoundationRouter.use("/hr", hr_collaboration_routes_1.hrCollaborationRouter);
exports.platformFoundationRouter.use("/me", me_collaboration_routes_1.meCollaborationRouter);
// =========================================================================
// 0. MASTER DATA BLUEPRINTS
// =========================================================================
exports.platformFoundationRouter.use("/hr/masters/departments", (0, master_data_blueprint_1.createMasterDataRouter)({
    modelName: "department",
    entityName: "Department",
    searchFields: ["name"],
    uniqueFields: ["name"],
}));
exports.platformFoundationRouter.use("/hr/masters/branches", (0, master_data_blueprint_1.createMasterDataRouter)({
    modelName: "branch",
    entityName: "Branch",
    searchFields: ["name", "code"],
    uniqueFields: ["code"],
}));
exports.platformFoundationRouter.use("/hr/masters/designations", (0, master_data_blueprint_1.createMasterDataRouter)({
    modelName: "designation",
    entityName: "Designation",
    searchFields: ["name"],
    uniqueFields: ["name"],
}));
// =========================================================================
// 1. REALTIME CATCH-UP (GET /api/v1/shared/events)
// =========================================================================
exports.platformFoundationRouter.get("/shared/events", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: "Tenant context required" });
        }
        const since = req.query.since;
        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const db = (0, tenant_context_1.getTenantDb)();
        const where = { tenantId };
        if (since) {
            const sinceDate = new Date(since);
            if (!isNaN(sinceDate.getTime())) {
                where.createdAt = { gt: sinceDate };
            }
        }
        const events = await db.outboxEvent.findMany({
            where,
            orderBy: { createdAt: "asc" },
            take: limit,
        });
        return res.json({
            events: events.map((e) => ({
                eventId: e.id,
                eventType: e.eventType,
                entityType: e.entityType,
                entityId: e.entityId,
                occurredAt: e.createdAt,
                payload: e.payload,
                metadata: e.payload?._metadata || null,
            })),
            cursor: events.length > 0 ? events[events.length - 1].createdAt : since,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 2. NOTIFICATIONS (GET & POST /api/v1/shared/notifications)
// =========================================================================
exports.platformFoundationRouter.get("/shared/notifications", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: "Context required" });
        }
        const unreadOnly = req.query.unread === "true";
        const limit = Math.min(Number(req.query.limit) || 20, 50);
        const offset = Number(req.query.offset) || 0;
        const moduleParam = req.query.module ? String(req.query.module) : undefined;
        const result = await notification_service_1.NotificationService.getUserNotifications(tenantId, userId, {
            unreadOnly,
            limit,
            offset,
            module: moduleParam,
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.platformFoundationRouter.post("/shared/notifications/:id/read", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        await notification_service_1.NotificationService.markAsRead(tenantId, req.params.id, userId);
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.platformFoundationRouter.post("/shared/notifications/read-all", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        await notification_service_1.NotificationService.markAllAsRead(tenantId, userId);
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 3. WORKFLOW DEFINITIONS & APPROVAL INBOX
// =========================================================================
// List workflow definitions
exports.platformFoundationRouter.get("/hr/workflows", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const workflows = await db.workflowDefinition.findMany({
            where: { tenantId },
            include: { steps: { orderBy: { stepOrder: "asc" } } },
        });
        return res.json({ workflows });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Create workflow definition
exports.platformFoundationRouter.post("/hr/workflows", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { entityType, name, description, isDefault, steps } = req.body;
        const db = (0, tenant_context_1.getTenantDb)();
        const created = await db.workflowDefinition.create({
            data: {
                tenantId,
                module: req.body.module || "SYSTEM",
                entityType,
                name,
                description: description ?? null,
                isActive: true,
                steps: {
                    create: (steps || []).map((step, index) => ({
                        stepOrder: step.stepOrder || index + 1,
                        name: step.name || `Step ${index + 1}`,
                        approverType: step.approverType || "ROLE",
                        approverRole: step.approverRole ?? null,
                        specificUserId: step.specificUserId ?? null,
                        slaHours: step.slaHours ?? null,
                    })),
                },
            },
            include: { steps: true },
        });
        return res.status(201).json(created);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Unified HR Approval Inbox (All pending requests in tenant)
exports.platformFoundationRouter.get("/hr/approvals", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const userContext = await (0, data_scope_1.resolveUserSecurityContext)(req.user?.userId, tenantId, req.user?.roles || [], db);
        const status = req.query.status;
        const where = { tenantId };
        if (status) {
            where.status = status;
        }
        const requests = await db.approvalRequest.findMany({
            where,
            include: {
                workflow: { include: { steps: true } },
                actions: { orderBy: { createdAt: "desc" } },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        const withAllowedActions = (0, allowed_actions_1.attachAllowedActions)("ApprovalRequest", requests, userContext, req.user?.permissions || []);
        return res.json({ requests: withAllowedActions });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Employee Self-Service My Approvals / My Requests
exports.platformFoundationRouter.get("/me/approvals", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const db = (0, tenant_context_1.getTenantDb)();
        const userContext = await (0, data_scope_1.resolveUserSecurityContext)(userId, tenantId, req.user?.roles || [], db);
        // 1. Requests submitted by me
        const mySubmitted = await db.approvalRequest.findMany({
            where: { tenantId, requesterId: userId },
            include: { workflow: true, actions: { orderBy: { createdAt: "desc" } } },
            orderBy: { createdAt: "desc" },
        });
        // 2. Requests awaiting my action (where I am approver or manager)
        const toApprove = await db.approvalRequest.findMany({
            where: {
                tenantId,
                status: "PENDING",
            },
            include: {
                workflow: { include: { steps: true } },
                actions: { orderBy: { createdAt: "desc" } },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json({
            submitted: (0, allowed_actions_1.attachAllowedActions)("ApprovalRequest", mySubmitted, userContext),
            pendingAction: (0, allowed_actions_1.attachAllowedActions)("ApprovalRequest", toApprove, userContext),
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Workflow Action: Approve
exports.platformFoundationRouter.post("/shared/approvals/:id/approve", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId;
        const { comment } = req.body;
        const result = await workflow_service_1.WorkflowService.approveStep({
            tenantId,
            requestId: req.params.id,
            actorId,
            comment,
        });
        return res.json({ success: true, request: result });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// Workflow Action: Reject
exports.platformFoundationRouter.post("/shared/approvals/:id/reject", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId;
        const { comment } = req.body;
        const result = await workflow_service_1.WorkflowService.rejectStep({
            tenantId,
            requestId: req.params.id,
            actorId,
            comment,
        });
        return res.json({ success: true, request: result });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// Workflow Action: Withdraw
exports.platformFoundationRouter.post("/shared/approvals/:id/withdraw", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId;
        const { comment } = req.body;
        const result = await workflow_service_1.WorkflowService.withdrawRequest({
            tenantId,
            requestId: req.params.id,
            actorId,
            comment,
        });
        return res.json({ success: true, request: result });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// Workflow Action: Delegate
exports.platformFoundationRouter.post("/shared/approvals/:id/delegate", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId;
        const { delegateToUserId, comment } = req.body;
        if (!delegateToUserId) {
            return res.status(400).json({ error: "delegateToUserId is required" });
        }
        const result = await workflow_service_1.WorkflowService.delegateStep({
            tenantId,
            requestId: req.params.id,
            actorId,
            delegateToUserId,
            comment,
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// Entity Audit Trail
exports.platformFoundationRouter.get("/shared/audit-trail", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const entityType = req.query.entityType;
        const entityId = req.query.entityId;
        if (!entityType || !entityId) {
            return res.status(400).json({ error: "entityType and entityId are required" });
        }
        const trail = await audit_service_1.AuditService.getEntityAuditTrail(tenantId, entityType, entityId);
        return res.json({ auditTrail: trail });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
