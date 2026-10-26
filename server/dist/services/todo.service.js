"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TodoService = void 0;
const tenant_context_1 = require("../context/tenant-context");
class TodoService {
    /**
     * Projects a unified index of actionable enterprise work:
     * 1. Meeting Action Items (Phase P7)
     * 2. Pending Approval Requests (Phase P1 Workflow)
     * 3. Asset Handover Acknowledgements (Phase P7 Assets)
     * 4. Policy Document Sign-Off Campaigns (Phase P7 Documents)
     * 5. Personal Workspace Todos
     */
    static async getTodoItems(tenantId, options = {}) {
        const db = (0, tenant_context_1.getTenantDb)();
        const { userId, employeeId, isHR = false, statusFilter = "all" } = options;
        const items = [];
        // 1. MEETING ACTION ITEMS
        try {
            const actionWhere = { tenantId };
            if (!isHR) {
                if (employeeId) {
                    actionWhere.OR = [
                        { assigneeId: employeeId },
                        { creatorId: employeeId },
                    ];
                }
                else {
                    actionWhere.id = "__none__";
                }
            }
            if (statusFilter === "pending") {
                actionWhere.status = { in: ["open", "in_progress"] };
            }
            else if (statusFilter === "completed") {
                actionWhere.status = { in: ["completed", "cancelled"] };
            }
            const actions = await db.meetingActionItem.findMany({
                where: actionWhere,
                include: {
                    meeting: true,
                    assignee: true,
                },
                orderBy: { dueDate: "asc" },
                take: 100,
            });
            for (const a of actions) {
                const isDone = a.status === "completed" || a.status === "cancelled";
                items.push({
                    id: `meeting-action-${a.id}`,
                    title: a.title,
                    description: a.description || (a.meeting ? `Meeting: ${a.meeting.title}` : undefined),
                    priority: a.priority || "medium",
                    dueDate: a.dueDate ? a.dueDate.toISOString() : undefined,
                    status: a.status,
                    completed: isDone,
                    sourceDomain: "meeting_action",
                    sourceId: a.id,
                    linkTo: isHR ? `/hr/meetings/action-items` : `/me/meetings/action-items`,
                    canComplete: true,
                    badgeLabel: "Meeting Action",
                    badgeColor: "bg-blue-500/15 text-blue-700 border-blue-500/30",
                    assigneeName: a.assignee ? `${a.assignee.firstName} ${a.assignee.lastName}` : undefined,
                });
            }
        }
        catch (err) {
            console.warn("TodoService: Failed to project meeting action items:", err);
        }
        // 2. PENDING WORKFLOW APPROVALS
        try {
            if (statusFilter !== "completed") {
                const approvalWhere = {
                    tenantId,
                    status: "PENDING",
                };
                if (!isHR && userId) {
                    // Find if user is requester or can approve
                    approvalWhere.requesterId = userId;
                }
                const approvals = await db.approvalRequest.findMany({
                    where: approvalWhere,
                    orderBy: { createdAt: "desc" },
                    take: 50,
                });
                for (const req of approvals) {
                    items.push({
                        id: `approval-${req.id}`,
                        title: `Approval Required: ${req.entityType} #${req.entityId.slice(0, 8)}`,
                        description: `Workflow Step ${req.currentStep}`,
                        priority: "high",
                        dueDate: undefined,
                        status: "pending_approval",
                        completed: false,
                        sourceDomain: "approval",
                        sourceId: req.id,
                        linkTo: isHR ? `/hr/approvals` : `/me/approvals`,
                        canComplete: false, // Must be executed via approval action dialog
                        badgeLabel: "Approval Task",
                        badgeColor: "bg-amber-500/15 text-amber-700 border-amber-500/30",
                    });
                }
            }
        }
        catch (err) {
            console.warn("TodoService: Failed to project approvals:", err);
        }
        // 3. ASSET HANDOVER ACKNOWLEDGEMENTS
        try {
            if (statusFilter !== "completed") {
                const assetWhere = {
                    asset: { tenantId },
                    status: "active",
                    acknowledgedAt: null,
                };
                if (!isHR && employeeId) {
                    assetWhere.employeeId = employeeId;
                }
                else if (!isHR && !employeeId) {
                    assetWhere.id = "__none__";
                }
                const pendingAssets = await db.assetAssignment.findMany({
                    where: assetWhere,
                    include: {
                        asset: true,
                        employee: true,
                    },
                    take: 50,
                });
                for (const assign of pendingAssets) {
                    items.push({
                        id: `asset-handover-${assign.id}`,
                        title: `Digital Custody Handover: ${assign.asset?.name || "Equipment"} (${assign.asset?.brand || "Asset"})`,
                        description: "Signature and condition acknowledgement required",
                        priority: "urgent",
                        dueDate: assign.assignedAt ? assign.assignedAt.toISOString() : undefined,
                        status: "pending_ack",
                        completed: false,
                        sourceDomain: "asset_handover",
                        sourceId: assign.id,
                        linkTo: isHR ? `/hr/assets` : `/me/assets`,
                        canComplete: true,
                        badgeLabel: "Asset Sign-off",
                        badgeColor: "bg-purple-500/15 text-purple-700 border-purple-500/30",
                        assigneeName: assign.employee ? `${assign.employee.firstName} ${assign.employee.lastName}` : undefined,
                    });
                }
            }
        }
        catch (err) {
            console.warn("TodoService: Failed to project asset handovers:", err);
        }
        // 4. DOCUMENT ACKNOWLEDGEMENT CAMPAIGNS
        try {
            if (statusFilter !== "completed") {
                const ackWhere = {
                    tenantId,
                    acknowledgedAt: null,
                };
                if (!isHR && employeeId) {
                    ackWhere.employeeId = employeeId;
                }
                else if (!isHR && !employeeId) {
                    ackWhere.id = "__none__";
                }
                const pendingAcks = await db.documentAcknowledgement.findMany({
                    where: ackWhere,
                    include: {
                        document: true,
                        employee: true,
                    },
                    take: 50,
                });
                for (const ack of pendingAcks) {
                    items.push({
                        id: `doc-ack-${ack.id}`,
                        title: `Policy Sign-Off: ${ack.document?.title || "Company Policy"}`,
                        description: "Mandatory compliance acknowledgement campaign",
                        priority: "high",
                        status: "pending_ack",
                        completed: false,
                        sourceDomain: "document_ack",
                        sourceId: ack.id,
                        linkTo: isHR ? `/hr/documents/acknowledgements` : `/me/documents/acknowledgements`,
                        canComplete: true,
                        badgeLabel: "Policy Sign-off",
                        badgeColor: "bg-rose-500/15 text-rose-700 border-rose-500/30",
                        assigneeName: ack.employee ? `${ack.employee.firstName} ${ack.employee.lastName}` : undefined,
                    });
                }
            }
        }
        catch (err) {
            console.warn("TodoService: Failed to project document acks:", err);
        }
        // 5. WORKSPACE PERSONAL TODOS
        try {
            const todoWhere = { tenantId };
            if (!isHR && userId) {
                todoWhere.userId = userId;
            }
            if (statusFilter === "pending") {
                todoWhere.completed = false;
            }
            else if (statusFilter === "completed") {
                todoWhere.completed = true;
            }
            const personalTodos = await db.workspaceTodo.findMany({
                where: todoWhere,
                orderBy: { dueDate: "asc" },
                take: 50,
            });
            for (const t of personalTodos) {
                items.push({
                    id: `todo-${t.id}`,
                    title: t.title,
                    description: t.description || undefined,
                    priority: t.priority || "medium",
                    dueDate: t.dueDate ? t.dueDate.toISOString() : undefined,
                    status: t.completed ? "completed" : "open",
                    completed: t.completed,
                    sourceDomain: "workspace_todo",
                    sourceId: t.id,
                    linkTo: isHR ? `/hr/todo` : `/me/todo`,
                    canComplete: true,
                    badgeLabel: "Personal Todo",
                    badgeColor: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
                });
            }
        }
        catch (err) {
            console.warn("TodoService: Failed to project personal todos:", err);
        }
        return items;
    }
    /**
     * Delegates status mutations back to owning authoritative domain models:
     * (P8-BR-006: Task Mutation Ownership & Delegation)
     */
    static async updateTaskStatus(tenantId, params) {
        const db = (0, tenant_context_1.getTenantDb)();
        const { sourceDomain, sourceId, status, completed, employeeId } = params;
        switch (sourceDomain) {
            case "meeting_action": {
                const nextStatus = completed ? "completed" : status || (completed === false ? "open" : "completed");
                return await db.meetingActionItem.updateMany({
                    where: { id: sourceId, tenantId },
                    data: {
                        status: nextStatus,
                        completedAt: nextStatus === "completed" ? new Date() : null,
                    },
                });
            }
            case "workspace_todo": {
                const nextCompleted = completed !== undefined ? completed : status === "completed";
                return await db.workspaceTodo.updateMany({
                    where: { id: sourceId, tenantId },
                    data: {
                        completed: nextCompleted,
                    },
                });
            }
            case "asset_handover": {
                if (!employeeId)
                    throw new Error("Employee credentials required for asset handover acknowledgement");
                return await db.assetAssignment.updateMany({
                    where: { id: sourceId, employeeId, asset: { tenantId } },
                    data: {
                        acknowledgedAt: new Date(),
                        acknowledgementSignature: "Digital Sign-off via Unified Todo",
                    },
                });
            }
            case "document_ack": {
                if (!employeeId)
                    throw new Error("Employee credentials required for policy acknowledgement");
                return await db.documentAcknowledgement.updateMany({
                    where: { id: sourceId, tenantId, employeeId },
                    data: {
                        status: "acknowledged",
                        acknowledgedAt: new Date(),
                        ipAddress: "System Digital Sign-off",
                    },
                });
            }
            default:
                throw new Error(`Unsupported domain for Todo status delegation: ${sourceDomain}`);
        }
    }
    /**
     * Creates an ad-hoc personal workspace todo.
     */
    static async createPersonalTodo(tenantId, userId, data) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.workspaceTodo.create({
            data: {
                tenantId,
                userId,
                title: data.title,
                description: data.description,
                priority: data.priority || "medium",
                dueDate: data.dueDate,
                tag: data.tag || "general",
                completed: false,
            },
        });
    }
    /**
     * Deletes an ad-hoc personal todo.
     */
    static async deletePersonalTodo(tenantId, todoId, userId, isHR) {
        const db = (0, tenant_context_1.getTenantDb)();
        const where = { id: todoId, tenantId };
        if (!isHR) {
            where.userId = userId;
        }
        return await db.workspaceTodo.deleteMany({ where });
    }
}
exports.TodoService = TodoService;
