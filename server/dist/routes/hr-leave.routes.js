"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrLeaveRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const pagination_1 = require("../lib/pagination");
const leave_service_1 = require("../services/leave.service");
const audit_service_1 = require("../services/audit.service");
const hr_leave_encashment_compoff_routes_1 = require("./hr-leave-encashment-compoff.routes");
exports.hrLeaveRouter = (0, express_1.Router)();
exports.hrLeaveRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
function sendLeaveError(res, err, fallbackStatus = 500) {
    if (err?.code === "PERIOD_LOCKED") {
        return res.status(423).json({ error: err.message, code: "PERIOD_LOCKED" });
    }
    if (err instanceof leave_service_1.LeaveHttpError || typeof err?.status === "number") {
        return res.status(err.status || 400).json({
            error: err.message,
            ...(err.code ? { code: err.code } : {}),
            ...(err.details ? { details: err.details, ...err.details } : {}),
        });
    }
    return res.status(fallbackStatus).json({ error: err?.message || "Internal server error" });
}
/**
 * Restricts HR configuration & manual balance admin actions strictly to elevated HR / Workspace Admin roles,
 * even when standard Employee roles possess `hrm.leave.create` for self-service submissions.
 */
function requireHrAdminRole(req, res, next) {
    if (!leave_service_1.LeaveService.isElevatedHrUser(req.user?.roles)) {
        return res.status(403).json({
            error: "Forbidden: HR Administrator privileges are required for this action.",
            code: "HR_ADMIN_REQUIRED",
        });
    }
    next();
}
/**
 * Resolves caller employee & reporting scope when caller is not an elevated HR Admin.
 */
async function resolveCallerScope(req, tenantId) {
    const isElevatedHR = leave_service_1.LeaveService.isElevatedHrUser(req.user?.roles);
    if (isElevatedHR) {
        return { isElevatedHR: true, callerEmpId: null };
    }
    const callerEmp = await prisma_1.rawPrisma.employee.findFirst({
        where: { tenantId, userId: req.user.userId },
        select: { id: true },
    });
    return {
        isElevatedHR: false,
        callerEmpId: callerEmp?.id || null,
    };
}
// =========================================================================
// 1. LEAVE APPLICATIONS (List, Detail, Matrix, Dry-Run, Submit, Edit, Decide, Cancel, Reverse)
// =========================================================================
// GET /api/v1/hr/leave/applications
exports.hrLeaveRouter.get("/applications", (0, auth_1.requirePermission)("hrm.leave.view"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 25);
        const { status, employeeId, leaveTypeId, year, month } = req.query;
        const { isElevatedHR, callerEmpId } = await resolveCallerScope(req, tenantId);
        const andFilters = [{ tenantId }];
        if (!isElevatedHR) {
            if (!callerEmpId) {
                return res.json((0, pagination_1.formatPaginatedResponse)([], 0, pagination));
            }
            andFilters.push({
                OR: [{ employeeId: callerEmpId }, { employee: { managerId: callerEmpId } }],
            });
        }
        if (status && status !== "all") {
            andFilters.push({ status: String(status) });
        }
        if (employeeId && employeeId !== "all") {
            andFilters.push({ employeeId: String(employeeId) });
        }
        if (leaveTypeId && leaveTypeId !== "all") {
            andFilters.push({ leaveTypeId: String(leaveTypeId) });
        }
        if (year) {
            const y = parseInt(String(year), 10);
            if (!Number.isNaN(y)) {
                const m = month ? parseInt(String(month), 10) : null;
                const rangeStart = m && m >= 1 && m <= 12 ? new Date(Date.UTC(y, m - 1, 1)) : new Date(Date.UTC(y, 0, 1));
                const rangeEnd = m && m >= 1 && m <= 12
                    ? new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))
                    : new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
                andFilters.push({
                    startDate: { lte: rangeEnd },
                    endDate: { gte: rangeStart },
                });
            }
        }
        if (pagination.search) {
            andFilters.push({
                OR: [
                    { reason: { contains: pagination.search, mode: "insensitive" } },
                    { employee: { firstName: { contains: pagination.search, mode: "insensitive" } } },
                    { employee: { lastName: { contains: pagination.search, mode: "insensitive" } } },
                    { employee: { employeeCode: { contains: pagination.search, mode: "insensitive" } } },
                    { leaveType: { name: { contains: pagination.search, mode: "insensitive" } } },
                ],
            });
        }
        const where = andFilters.length === 1 ? andFilters[0] : { AND: andFilters };
        const allowedSortFields = ["createdAt", "startDate", "endDate", "days", "status"];
        const sortField = allowedSortFields.includes(pagination.sortField) ? pagination.sortField : "createdAt";
        const [total, records] = await Promise.all([
            prisma_1.rawPrisma.leaveRequest.count({ where }),
            prisma_1.rawPrisma.leaveRequest.findMany({
                where,
                include: {
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            employeeCode: true,
                            position: true,
                            managerId: true,
                            branch: { select: { id: true, name: true } },
                            department: { select: { id: true, name: true } },
                            user: { select: { profile: { select: { avatarUrl: true } } } },
                        },
                    },
                    leaveType: true,
                },
                orderBy: { [sortField]: pagination.sortType },
                skip: pagination.skip,
                take: pagination.limit,
            }),
        ]);
        // Batch resolve approver names (approverId may reference User.id or Employee.id)
        const approverIds = Array.from(new Set(records.map((r) => r.approverId).filter((x) => Boolean(x))));
        const [approverUsers, approverEmps] = approverIds.length > 0
            ? await Promise.all([
                prisma_1.rawPrisma.user.findMany({
                    where: { id: { in: approverIds } },
                    select: { id: true, email: true, profile: { select: { fullName: true } } },
                }),
                prisma_1.rawPrisma.employee.findMany({
                    where: { id: { in: approverIds }, tenantId },
                    select: { id: true, firstName: true, lastName: true },
                }),
            ])
            : [[], []];
        const approverNameMap = new Map();
        for (const u of approverUsers) {
            approverNameMap.set(u.id, u.profile?.fullName || u.email);
        }
        for (const e of approverEmps) {
            approverNameMap.set(e.id, `${e.firstName} ${e.lastName}`.trim());
        }
        const enriched = records.map((r) => ({
            ...r,
            days: Number(r.days),
            approverName: r.approverId ? approverNameMap.get(r.approverId) || null : null,
        }));
        return res.json((0, pagination_1.formatPaginatedResponse)(enriched, total, pagination));
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// GET /api/v1/hr/leave/applications/matrix (Calendar Matrix Grid by Month)
exports.hrLeaveRouter.get("/applications/matrix", (0, auth_1.requirePermission)("hrm.leave.view"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const now = new Date();
        const year = parseInt(String(req.query.year || now.getUTCFullYear()), 10);
        const month = parseInt(String(req.query.month || now.getUTCMonth() + 1), 10); // 1-12
        const targetEmployeeId = req.query.employeeId ? String(req.query.employeeId) : undefined;
        const search = req.query.search ? String(req.query.search).trim() : "";
        const { isElevatedHR, callerEmpId } = await resolveCallerScope(req, tenantId);
        const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        const daysInMonth = endOfMonth.getUTCDate();
        const empAndFilters = [{ tenantId, status: "active" }];
        if (!isElevatedHR) {
            if (!callerEmpId) {
                return res.json({ year, month, daysInMonth, days: [], employees: [], allEmployees: [], leaveTypes: [] });
            }
            empAndFilters.push({
                OR: [{ id: callerEmpId }, { managerId: callerEmpId }],
            });
        }
        const baseEmpWhere = empAndFilters.length === 1 ? empAndFilters[0] : { AND: empAndFilters };
        const filteredEmpAnd = [...empAndFilters];
        if (targetEmployeeId && targetEmployeeId !== "all") {
            filteredEmpAnd.push({ id: targetEmployeeId });
        }
        if (search) {
            filteredEmpAnd.push({
                OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { employeeCode: { contains: search, mode: "insensitive" } },
                    { department: { name: { contains: search, mode: "insensitive" } } },
                ],
            });
        }
        const empWhere = filteredEmpAnd.length === 1 ? filteredEmpAnd[0] : { AND: filteredEmpAnd };
        const statusParam = req.query.status ? String(req.query.status) : "all";
        const statusFilter = statusParam === "all" ? { in: ["approved", "pending"] } : statusParam;
        const leavesWhere = {
            tenantId,
            status: statusFilter,
            startDate: { lte: endOfMonth },
            endDate: { gte: startOfMonth },
            ...(targetEmployeeId && targetEmployeeId !== "all" ? { employeeId: targetEmployeeId } : {}),
        };
        // Execute ALL 5 independent reads in parallel (was 4 sequential round-trips!)
        const [holidays, employees, allScopedEmployees, leaveTypes, leaves] = await Promise.all([
            prisma_1.rawPrisma.holiday.findMany({
                where: {
                    tenantId,
                    date: { gte: startOfMonth, lte: endOfMonth },
                    status: "active",
                },
                select: { date: true, name: true },
            }),
            prisma_1.rawPrisma.employee.findMany({
                where: empWhere,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeCode: true,
                    position: true,
                    managerId: true,
                    department: { select: { id: true, name: true } },
                    branch: { select: { id: true, name: true } },
                    user: { select: { profile: { select: { avatarUrl: true } } } },
                },
                orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
            }),
            prisma_1.rawPrisma.employee.findMany({
                where: baseEmpWhere,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeCode: true,
                    department: { select: { name: true } },
                },
                orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
            }),
            prisma_1.rawPrisma.leaveType.findMany({
                where: { tenantId, status: "active" },
                orderBy: { name: "asc" },
            }),
            prisma_1.rawPrisma.leaveRequest.findMany({
                where: leavesWhere,
                include: { leaveType: true },
                orderBy: { startDate: "asc" },
            }),
        ]);
        const holidayMap = new Map();
        holidays.forEach((h) => {
            holidayMap.set(h.date.toISOString().slice(0, 10), h.name);
        });
        const days = [];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for (let d = 1; d <= daysInMonth; d++) {
            const dayDate = new Date(Date.UTC(year, month - 1, d));
            const dateStr = dayDate.toISOString().slice(0, 10);
            const dayOfWeek = dayDate.getUTCDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidayMap.has(dateStr);
            days.push({
                dayNumber: d,
                date: dateStr,
                dayName: dayNames[dayOfWeek],
                isWeekend,
                isHoliday,
                holidayName: holidayMap.get(dateStr) || null,
            });
        }
        const leavesByEmp = new Map();
        leaves.forEach((l) => {
            if (!leavesByEmp.has(l.employeeId))
                leavesByEmp.set(l.employeeId, []);
            leavesByEmp.get(l.employeeId).push({
                id: l.id,
                employeeId: l.employeeId,
                leaveTypeId: l.leaveTypeId,
                leaveTypeName: l.leaveType?.name || "Leave",
                color: l.leaveType?.color || "#3b82f6",
                isPaid: l.leaveType?.isPaid ?? true,
                startDate: l.startDate.toISOString().slice(0, 10),
                endDate: l.endDate.toISOString().slice(0, 10),
                days: Number(l.days),
                halfDay: l.halfDay,
                halfDaySession: l.halfDaySession,
                status: l.status,
                reason: l.reason,
                attachmentUrl: l.attachmentUrl,
                rejectionReason: l.rejectionReason,
                approvedAt: l.approvedAt,
                approverId: l.approverId,
                createdAt: l.createdAt,
            });
        });
        // Every eligible employee row is always displayed even if `leaves` is empty
        const matrixEmployees = employees.map((emp) => ({
            ...emp,
            leaves: leavesByEmp.get(emp.id) || [],
        }));
        return res.json({
            year,
            month,
            daysInMonth,
            days,
            employees: matrixEmployees,
            allEmployees: allScopedEmployees,
            leaveTypes,
        });
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// POST /api/v1/hr/leave/applications/dry-run
exports.hrLeaveRouter.post("/applications/dry-run", (0, auth_1.requirePermission)("hrm.leave.view"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { employeeId, leaveTypeId, startDate, endDate, halfDay, halfDaySession, reason, excludeRequestId, bypassNoticePeriod, } = req.body;
        if (!employeeId || !leaveTypeId || !startDate || !endDate) {
            return res.status(400).json({ error: "employeeId, leaveTypeId, startDate, and endDate are required" });
        }
        const { isElevatedHR, callerEmpId } = await resolveCallerScope(req, tenantId);
        if (!isElevatedHR) {
            const targetEmp = await prisma_1.rawPrisma.employee.findFirst({
                where: { id: String(employeeId), tenantId },
                select: { id: true, managerId: true },
            });
            if (!targetEmp || (targetEmp.id !== callerEmpId && targetEmp.managerId !== callerEmpId)) {
                return res.status(403).json({ error: "Forbidden: You cannot evaluate leave for another employee." });
            }
        }
        const preview = await leave_service_1.LeaveService.validateDryRun({
            tenantId,
            employeeId: String(employeeId),
            leaveTypeId: String(leaveTypeId),
            startDate,
            endDate,
            halfDay: Boolean(halfDay),
            halfDaySession,
            reason,
            excludeRequestId,
            bypassNoticePeriod: Boolean(isElevatedHR && bypassNoticePeriod),
        });
        return res.json(preview);
    }
    catch (err) {
        return sendLeaveError(res, err, 400);
    }
});
// GET /api/v1/hr/leave/applications/:id (Full Detail View with Reviewer & Ledger Info)
exports.hrLeaveRouter.get("/applications/:id", (0, auth_1.requirePermission)("hrm.leave.view"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { isElevatedHR, callerEmpId } = await resolveCallerScope(req, tenantId);
        const record = await prisma_1.rawPrisma.leaveRequest.findFirst({
            where: { id, tenantId },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        position: true,
                        managerId: true,
                        department: { select: { id: true, name: true } },
                        branch: { select: { id: true, name: true } },
                        user: { select: { profile: { select: { avatarUrl: true } } } },
                    },
                },
                leaveType: true,
            },
        });
        if (!record) {
            return res.status(404).json({ error: "Leave application not found." });
        }
        if (!isElevatedHR &&
            record.employeeId !== callerEmpId &&
            record.employee.managerId !== callerEmpId) {
            return res.status(403).json({ error: "Forbidden: You do not have access to this leave application." });
        }
        const [ledgerTransactions, approverUser, approverEmp] = await Promise.all([
            prisma_1.rawPrisma.leaveLedgerEntry.findMany({
                where: { tenantId, referenceId: id },
                orderBy: { createdAt: "asc" },
            }),
            record.approverId
                ? prisma_1.rawPrisma.user.findUnique({
                    where: { id: record.approverId },
                    select: { id: true, email: true, profile: { select: { fullName: true } } },
                })
                : Promise.resolve(null),
            record.approverId
                ? prisma_1.rawPrisma.employee.findFirst({
                    where: { id: record.approverId, tenantId },
                    select: { id: true, firstName: true, lastName: true },
                })
                : Promise.resolve(null),
        ]);
        const approverName = approverUser?.profile?.fullName ||
            approverUser?.email ||
            (approverEmp ? `${approverEmp.firstName} ${approverEmp.lastName}`.trim() : null);
        return res.json({
            ...record,
            days: Number(record.days),
            approverName,
            ledgerTransactions: ledgerTransactions.map((t) => ({
                ...t,
                days: Number(t.days),
                balance: Number(t.balance),
            })),
        });
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// POST /api/v1/hr/leave/applications (HR submits on behalf of an employee, or self)
exports.hrLeaveRouter.post("/applications", (0, auth_1.requirePermission)("hrm.leave.create"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { employeeId, leaveTypeId, startDate, endDate, halfDay, halfDaySession, reason, attachmentUrl, bypassNoticePeriod, } = req.body;
        if (!employeeId || !leaveTypeId || !startDate || !endDate || !reason) {
            return res.status(400).json({ error: "employeeId, leaveTypeId, startDate, endDate, and reason are required" });
        }
        const { isElevatedHR, callerEmpId } = await resolveCallerScope(req, tenantId);
        if (!isElevatedHR && employeeId !== callerEmpId) {
            return res.status(403).json({
                error: "Forbidden: Only HR Administrators can submit leave applications on behalf of other employees.",
            });
        }
        const application = await leave_service_1.LeaveService.submitApplication(tenantId, String(employeeId), {
            leaveTypeId: String(leaveTypeId),
            startDate,
            endDate,
            halfDay: Boolean(halfDay),
            halfDaySession,
            reason,
            attachmentUrl,
        }, req.user.userId, { bypassNoticePeriod: Boolean(isElevatedHR && bypassNoticePeriod) });
        return res.status(201).json(application);
    }
    catch (err) {
        return sendLeaveError(res, err, 400);
    }
});
// PUT /api/v1/hr/leave/applications/:id (Edit eligible pending request)
exports.hrLeaveRouter.put("/applications/:id", (0, auth_1.requirePermission)("hrm.leave.create"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { isElevatedHR, callerEmpId } = await resolveCallerScope(req, tenantId);
        const updated = await leave_service_1.LeaveService.updatePendingApplication(tenantId, id, req.body, req.user.userId, { callerEmployeeId: callerEmpId || undefined, isElevatedHR });
        return res.json(updated);
    }
    catch (err) {
        return sendLeaveError(res, err, 400);
    }
});
// POST /api/v1/hr/leave/applications/:id/action (Approve / Reject, alias: /decide)
exports.hrLeaveRouter.post(["/applications/:id/action", "/applications/:id/decide"], (0, auth_1.requirePermission)("hrm.leave.approve"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const action = req.body.action || req.body.decision;
        const comments = req.body.comments || req.body.rejectionReason;
        if (!action || !["approve", "reject"].includes(action)) {
            return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
        }
        const result = await leave_service_1.LeaveService.decideApplication(tenantId, id, action, req.user.userId, comments, req.user?.roles);
        return res.json(result);
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// POST /api/v1/hr/leave/applications/:id/cancel
exports.hrLeaveRouter.post("/applications/:id/cancel", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { reason } = req.body;
        const existing = await prisma_1.rawPrisma.leaveRequest.findFirst({
            where: { id, tenantId },
            include: { employee: { select: { id: true, userId: true, managerId: true } } },
        });
        if (!existing) {
            return res.status(404).json({ error: "Leave request not found." });
        }
        const { isElevatedHR, callerEmpId } = await resolveCallerScope(req, tenantId);
        const isOwner = Boolean(callerEmpId && existing.employeeId === callerEmpId);
        const isDirectManager = Boolean(callerEmpId && existing.employee.managerId === callerEmpId);
        if (!isElevatedHR && !isOwner && !isDirectManager) {
            return res.status(403).json({
                error: "Forbidden: You are not authorized to cancel this leave application.",
            });
        }
        const result = await leave_service_1.LeaveService.cancelApplication(tenantId, id, req.user.userId, reason);
        return res.json(result);
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// POST /api/v1/hr/leave/applications/:id/reverse (Authorized HR / Manager Reversal of Approved or Rejected Request)
exports.hrLeaveRouter.post("/applications/:id/reverse", (0, auth_1.requirePermission)("hrm.leave.approve"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const reason = req.body.reason || req.body.comments;
        const result = await leave_service_1.LeaveService.reverseApplication(tenantId, id, req.user.userId, reason, req.user?.roles);
        return res.json(result);
    }
    catch (err) {
        return sendLeaveError(res, err, 400);
    }
});
// =========================================================================
// 2. LEAVE BALANCES & SYNCHRONIZATION (Detailed Cards, Ledger, Manual Adjust, Sync)
// =========================================================================
// GET /api/v1/hr/leave/balances
exports.hrLeaveRouter.get("/balances", (0, auth_1.requirePermission)("hrm.leave.view"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getUTCFullYear();
        const search = req.query.search ? String(req.query.search).trim() : "";
        const targetEmployeeId = req.query.employeeId ? String(req.query.employeeId) : undefined;
        const leaveTypeId = req.query.leaveTypeId ? String(req.query.leaveTypeId) : undefined;
        const departmentId = req.query.departmentId ? String(req.query.departmentId) : undefined;
        const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "24"), 10) || 24));
        const skip = (page - 1) * limit;
        const { isElevatedHR, callerEmpId } = await resolveCallerScope(req, tenantId);
        const baseAnd = [{ tenantId, status: "active" }];
        if (!isElevatedHR) {
            if (!callerEmpId) {
                return res.json({
                    year,
                    leaveTypes: [],
                    allEmployees: [],
                    data: [],
                    meta: { total: 0, page, limit, totalPages: 1 },
                });
            }
            baseAnd.push({
                OR: [{ id: callerEmpId }, { managerId: callerEmpId }],
            });
        }
        const baseEmpWhere = baseAnd.length === 1 ? baseAnd[0] : { AND: baseAnd };
        const filterAnd = [...baseAnd];
        if (targetEmployeeId && targetEmployeeId !== "all") {
            filterAnd.push({ id: targetEmployeeId });
        }
        if (departmentId && departmentId !== "all") {
            filterAnd.push({ departmentId });
        }
        if (search) {
            filterAnd.push({
                OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { employeeCode: { contains: search, mode: "insensitive" } },
                    { department: { name: { contains: search, mode: "insensitive" } } },
                ],
            });
        }
        const empWhere = filterAnd.length === 1 ? filterAnd[0] : { AND: filterAnd };
        const [totalEmployees, employees, allScopedEmployees] = await Promise.all([
            prisma_1.rawPrisma.employee.count({ where: empWhere }),
            prisma_1.rawPrisma.employee.findMany({
                where: empWhere,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeCode: true,
                    position: true,
                    department: { select: { id: true, name: true } },
                    user: { select: { profile: { select: { avatarUrl: true } } } },
                },
                orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
                skip,
                take: limit,
            }),
            prisma_1.rawPrisma.employee.findMany({
                where: baseEmpWhere,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeCode: true,
                    department: { select: { id: true, name: true } },
                },
                orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
            }),
        ]);
        const bulk = await leave_service_1.LeaveService.getBulkEmployeeDetailedBalances(tenantId, employees, year, {
            leaveTypeId,
        });
        return res.json({
            year: bulk.year,
            leaveTypes: bulk.leaveTypes,
            allEmployees: allScopedEmployees,
            data: bulk.data,
            meta: {
                total: totalEmployees,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(totalEmployees / limit)),
            },
        });
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// POST /api/v1/hr/leave/balances/sync (Safe, Year-Aware, Idempotent Entitlement Synchronization)
exports.hrLeaveRouter.post("/balances/sync", (0, auth_1.requirePermission)("hrm.leave.edit"), requireHrAdminRole, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const year = req.body?.year ? parseInt(String(req.body.year), 10) : undefined;
        const employeeId = req.body?.employeeId ? String(req.body.employeeId) : undefined;
        const result = await leave_service_1.LeaveService.syncTenantBalances(tenantId, req.user.userId, year, employeeId);
        return res.json(result);
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// GET /api/v1/hr/leave/balances/:employeeId/ledger (Immutable Ledger History with Scope Guard)
exports.hrLeaveRouter.get("/balances/:employeeId/ledger", (0, auth_1.requirePermission)("hrm.leave.view"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { employeeId } = req.params;
        const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
        const targetEmp = await prisma_1.rawPrisma.employee.findFirst({
            where: { id: employeeId, tenantId },
            select: { id: true, managerId: true },
        });
        if (!targetEmp) {
            return res.status(404).json({ error: "Employee not found in this organization." });
        }
        const { isElevatedHR, callerEmpId } = await resolveCallerScope(req, tenantId);
        if (!isElevatedHR && targetEmp.id !== callerEmpId && targetEmp.managerId !== callerEmpId) {
            return res.status(403).json({
                error: "Forbidden: You are not authorized to view another employee's leave ledger.",
            });
        }
        const ledger = await leave_service_1.LeaveService.getEmployeeLedger(tenantId, employeeId, year && !Number.isNaN(year) ? year : undefined);
        return res.json(ledger);
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// POST /api/v1/hr/leave/balances/adjust (Manual CREDIT / DEBIT Ledger Adjustment)
exports.hrLeaveRouter.post("/balances/adjust", (0, auth_1.requirePermission)("hrm.leave.edit"), requireHrAdminRole, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { employeeId, leaveTypeId, entryType, days, notes, reason, year } = req.body;
        const entry = await leave_service_1.LeaveService.adjustBalance(tenantId, {
            employeeId: String(employeeId || ""),
            leaveTypeId: String(leaveTypeId || ""),
            entryType: entryType,
            days: Number(days),
            notes: String(notes || reason || "").trim(),
            year: year ? parseInt(String(year), 10) : undefined,
            actorUserId: req.user.userId,
            actorEmail: req.user?.email || null,
        });
        return res.status(201).json(entry);
    }
    catch (err) {
        return sendLeaveError(res, err, 400);
    }
});
// =========================================================================
// 3. LEAVE TYPES CRUD (Two-Column Reference UI + Smart Referential Integrity Protection)
// =========================================================================
// GET /api/v1/hr/leave/types
exports.hrLeaveRouter.get("/types", (0, auth_1.requirePermission)("hrm.leave.view"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { status, search, sortBy, sortOrder, page, limit, paginated } = req.query;
        const where = { tenantId };
        if (status && status !== "all") {
            where.status = String(status);
        }
        if (search) {
            where.OR = [
                { name: { contains: String(search).trim(), mode: "insensitive" } },
                { code: { contains: String(search).trim(), mode: "insensitive" } },
                { description: { contains: String(search).trim(), mode: "insensitive" } },
            ];
        }
        const validSortField = ["name", "daysPerYear", "status", "createdAt", "code"].includes(String(sortBy))
            ? String(sortBy)
            : null;
        const dir = String(sortOrder).toLowerCase() === "desc" ? "desc" : "asc";
        const orderBy = validSortField
            ? [{ [validSortField]: dir }]
            : [{ status: "asc" }, { name: "asc" }];
        const isPaginated = paginated === "true";
        const pageNum = Math.max(1, parseInt(String(page || "1"), 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(String(limit || "20"), 10) || 20));
        const [total, types, ledgerGroups] = await Promise.all([
            prisma_1.rawPrisma.leaveType.count({ where }),
            prisma_1.rawPrisma.leaveType.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            leaveRequests: true,
                            leavePolicies: true,
                            encashmentRequests: true,
                        },
                    },
                },
                orderBy,
                ...(isPaginated ? { skip: (pageNum - 1) * limitNum, take: limitNum } : {}),
            }),
            prisma_1.rawPrisma.leaveLedgerEntry.groupBy({
                by: ["leaveTypeId"],
                where: { tenantId },
                _count: { _all: true },
            }),
        ]);
        const ledgerCountMap = new Map(ledgerGroups.map((g) => [g.leaveTypeId, g._count._all]));
        const enrichedTypes = types.map((t) => {
            const ledgerEntries = ledgerCountMap.get(t.id) || 0;
            const leaveRequests = t._count?.leaveRequests || 0;
            const leavePolicies = t._count?.leavePolicies || 0;
            const encashmentRequests = t._count?.encashmentRequests || 0;
            return {
                ...t,
                _count: {
                    leaveRequests,
                    leavePolicies,
                    encashmentRequests,
                    ledgerEntries,
                },
                isReferenced: leaveRequests + leavePolicies + encashmentRequests + ledgerEntries > 0,
            };
        });
        res.setHeader("X-Total-Count", String(total));
        if (isPaginated) {
            return res.json({
                data: enrichedTypes,
                meta: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.max(1, Math.ceil(total / limitNum)),
                },
            });
        }
        return res.json(enrichedTypes);
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// GET /api/v1/hr/leave/types/:id
exports.hrLeaveRouter.get("/types/:id", (0, auth_1.requirePermission)("hrm.leave.view"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const [leaveType, ledgerCount] = await Promise.all([
            prisma_1.rawPrisma.leaveType.findFirst({
                where: { id, tenantId },
                include: {
                    _count: {
                        select: {
                            leaveRequests: true,
                            leavePolicies: true,
                            encashmentRequests: true,
                        },
                    },
                },
            }),
            prisma_1.rawPrisma.leaveLedgerEntry.count({ where: { tenantId, leaveTypeId: id } }),
        ]);
        if (!leaveType)
            return res.status(404).json({ error: "Leave type not found" });
        return res.json({
            ...leaveType,
            _count: {
                ...leaveType._count,
                ledgerEntries: ledgerCount,
            },
        });
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// POST /api/v1/hr/leave/types
exports.hrLeaveRouter.post("/types", (0, auth_1.requirePermission)("hrm.leave.create"), requireHrAdminRole, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { name, code, description, daysPerYear, color, isPaid, sandwichRule, halfDayAllowed, status } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: "Leave type name is required" });
        }
        const trimmedName = String(name).trim();
        const resolvedCode = code && String(code).trim()
            ? String(code).trim().toUpperCase()
            : trimmedName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "LV";
        const parsedDays = daysPerYear !== undefined && daysPerYear !== null && daysPerYear !== ""
            ? Number(daysPerYear)
            : 12;
        if (Number.isNaN(parsedDays) || parsedDays < 0 || parsedDays > 365) {
            return res.status(400).json({ error: "Maximum days per year must be between 0 and 365." });
        }
        const duplicate = await prisma_1.rawPrisma.leaveType.findFirst({
            where: {
                tenantId,
                OR: [
                    { name: { equals: trimmedName, mode: "insensitive" } },
                    ...(code && String(code).trim()
                        ? [{ code: { equals: resolvedCode, mode: "insensitive" } }]
                        : []),
                ],
            },
        });
        if (duplicate) {
            return res.status(409).json({
                error: duplicate.name.toLowerCase() === trimmedName.toLowerCase()
                    ? `A leave type named "${trimmedName}" already exists for this organization.`
                    : `A leave type with code "${resolvedCode}" already exists for this organization.`,
                code: "DUPLICATE_LEAVE_TYPE",
            });
        }
        const leaveType = await prisma_1.rawPrisma.leaveType.create({
            data: {
                tenantId,
                name: trimmedName,
                code: resolvedCode,
                description: description?.trim() || null,
                daysPerYear: Math.round(parsedDays),
                color: color || "#3b82f6",
                isPaid: isPaid !== false,
                sandwichRule: Boolean(sandwichRule),
                halfDayAllowed: halfDayAllowed !== false,
                status: status === "inactive" ? "inactive" : "active",
            },
        });
        audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user.userId,
            action: "LEAVE_TYPE_CREATED",
            entityType: "LeaveType",
            entityId: leaveType.id,
            newState: leaveType,
        }).catch(() => { });
        return res.status(201).json(leaveType);
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// PUT /api/v1/hr/leave/types/:id
exports.hrLeaveRouter.put("/types/:id", (0, auth_1.requirePermission)("hrm.leave.edit"), requireHrAdminRole, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { name, code, description, daysPerYear, color, isPaid, sandwichRule, halfDayAllowed, status } = req.body;
        const existing = await prisma_1.rawPrisma.leaveType.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Leave type not found" });
        if (name !== undefined && !String(name).trim()) {
            return res.status(400).json({ error: "Leave type name cannot be empty." });
        }
        const nextName = name !== undefined ? String(name).trim() : existing.name;
        const nextCode = code !== undefined
            ? String(code).trim()
                ? String(code).trim().toUpperCase()
                : existing.code
            : existing.code;
        if (daysPerYear !== undefined) {
            const parsedDays = Number(daysPerYear);
            if (Number.isNaN(parsedDays) || parsedDays < 0 || parsedDays > 365) {
                return res.status(400).json({ error: "Maximum days per year must be between 0 and 365." });
            }
        }
        const duplicate = await prisma_1.rawPrisma.leaveType.findFirst({
            where: {
                tenantId,
                id: { not: id },
                OR: [
                    { name: { equals: nextName, mode: "insensitive" } },
                    ...(nextCode ? [{ code: { equals: nextCode, mode: "insensitive" } }] : []),
                ],
            },
        });
        if (duplicate) {
            return res.status(409).json({
                error: duplicate.name.toLowerCase() === nextName.toLowerCase()
                    ? `A leave type named "${nextName}" already exists for this organization.`
                    : `A leave type with code "${nextCode}" already exists for this organization.`,
                code: "DUPLICATE_LEAVE_TYPE",
            });
        }
        const updated = await prisma_1.rawPrisma.leaveType.update({
            where: { id },
            data: {
                name: nextName,
                code: nextCode,
                description: description !== undefined ? (description ? String(description).trim() : null) : existing.description,
                daysPerYear: daysPerYear !== undefined ? Math.round(Number(daysPerYear)) : existing.daysPerYear,
                color: color !== undefined ? color : existing.color,
                isPaid: isPaid !== undefined ? Boolean(isPaid) : existing.isPaid,
                sandwichRule: sandwichRule !== undefined ? Boolean(sandwichRule) : existing.sandwichRule,
                halfDayAllowed: halfDayAllowed !== undefined ? Boolean(halfDayAllowed) : existing.halfDayAllowed,
                status: status !== undefined && ["active", "inactive"].includes(status) ? status : existing.status,
            },
        });
        audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user.userId,
            action: "LEAVE_TYPE_UPDATED",
            entityType: "LeaveType",
            entityId: id,
            oldState: existing,
            newState: updated,
        }).catch(() => { });
        return res.json(updated);
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// PATCH /api/v1/hr/leave/types/:id/status
exports.hrLeaveRouter.patch("/types/:id/status", (0, auth_1.requirePermission)("hrm.leave.edit"), requireHrAdminRole, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !["active", "inactive"].includes(status)) {
            return res.status(400).json({ error: "Status must be 'active' or 'inactive'" });
        }
        const existing = await prisma_1.rawPrisma.leaveType.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Leave type not found" });
        const updated = await prisma_1.rawPrisma.leaveType.update({
            where: { id },
            data: { status },
        });
        audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user.userId,
            action: status === "inactive" ? "LEAVE_TYPE_DEACTIVATED" : "LEAVE_TYPE_ACTIVATED",
            entityType: "LeaveType",
            entityId: id,
            oldState: { status: existing.status },
            newState: { status },
        }).catch(() => { });
        return res.json({ success: true, id, status, leaveType: updated });
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// GET /api/v1/hr/leave/types/:id/dependencies (Inspect references before delete/deactivate)
exports.hrLeaveRouter.get("/types/:id/dependencies", (0, auth_1.requirePermission)("hrm.leave.view"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const existing = await prisma_1.rawPrisma.leaveType.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Leave type not found" });
        const [leaveRequests, ledgerEntries, leavePolicies, encashmentRequests] = await Promise.all([
            prisma_1.rawPrisma.leaveRequest.count({ where: { tenantId, leaveTypeId: id } }),
            prisma_1.rawPrisma.leaveLedgerEntry.count({ where: { tenantId, leaveTypeId: id } }),
            prisma_1.rawPrisma.leavePolicy.count({ where: { tenantId, leaveTypeId: id } }),
            prisma_1.rawPrisma.leaveEncashmentRequest.count({ where: { tenantId, leaveTypeId: id } }),
        ]);
        const totalReferences = leaveRequests + ledgerEntries + leavePolicies + encashmentRequests;
        return res.json({
            id: existing.id,
            name: existing.name,
            status: existing.status,
            hasDependencies: totalReferences > 0,
            inUse: totalReferences > 0,
            canHardDelete: totalReferences === 0,
            canDeactivate: existing.status === "active",
            references: {
                leaveRequests,
                ledgerEntries,
                leavePolicies,
                encashmentRequests,
                requestCount: leaveRequests,
                ledgerCount: ledgerEntries,
                policyCount: leavePolicies,
                encashmentCount: encashmentRequests,
                total: totalReferences,
            },
        });
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// DELETE /api/v1/hr/leave/types/:id (Strict Tenant Check + Referential Integrity Guard)
exports.hrLeaveRouter.delete("/types/:id", (0, auth_1.requirePermission)("hrm.leave.delete"), requireHrAdminRole, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        // 1. Strict tenant ownership verification BEFORE inspecting or deleting
        const existing = await prisma_1.rawPrisma.leaveType.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: "Leave type not found" });
        }
        // 2. Check all referencing tables in parallel
        const [requestCount, ledgerCount, policyCount, encashmentCount] = await Promise.all([
            prisma_1.rawPrisma.leaveRequest.count({ where: { tenantId, leaveTypeId: id } }),
            prisma_1.rawPrisma.leaveLedgerEntry.count({ where: { tenantId, leaveTypeId: id } }),
            prisma_1.rawPrisma.leavePolicy.count({ where: { tenantId, leaveTypeId: id } }),
            prisma_1.rawPrisma.leaveEncashmentRequest.count({ where: { tenantId, leaveTypeId: id } }),
        ]);
        if (requestCount > 0 || ledgerCount > 0 || policyCount > 0 || encashmentCount > 0) {
            const references = {
                leaveRequests: requestCount,
                ledgerEntries: ledgerCount,
                leavePolicies: policyCount,
                encashmentRequests: encashmentCount,
            };
            const parts = [];
            if (requestCount > 0)
                parts.push(`${requestCount} leave request${requestCount === 1 ? "" : "s"}`);
            if (ledgerCount > 0)
                parts.push(`${ledgerCount} ledger transaction${ledgerCount === 1 ? "" : "s"}`);
            if (policyCount > 0)
                parts.push(`${policyCount} leave polic${policyCount === 1 ? "y" : "ies"}`);
            if (encashmentCount > 0)
                parts.push(`${encashmentCount} encashment request${encashmentCount === 1 ? "" : "s"}`);
            const message = `Cannot delete leave type: It is referenced by ${parts.join(", ")}. Please deactivate it instead.`;
            return res.status(400).json({
                error: message,
                code: "LEAVE_TYPE_IN_USE",
                canDeactivate: existing.status === "active",
                references,
                details: {
                    canDeactivate: existing.status === "active",
                    leaveTypeStatus: existing.status,
                    references,
                },
            });
        }
        await prisma_1.rawPrisma.leaveType.delete({ where: { id } });
        audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user.userId,
            action: "LEAVE_TYPE_DELETED",
            entityType: "LeaveType",
            entityId: id,
            oldState: existing,
        }).catch(() => { });
        return res.json({ success: true, message: "Leave type deleted successfully." });
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// =========================================================================
// 4. LEAVE POLICIES CRUD (Full Rule Persistence, FK Validation, Sorting, Pagination)
// =========================================================================
// GET /api/v1/hr/leave/policies
exports.hrLeaveRouter.get("/policies", (0, auth_1.requirePermission)("hrm.leave.view"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { status, leaveTypeId, search, sortBy, sortOrder, page, limit, includeCounts } = req.query;
        const baseWhere = { tenantId };
        if (leaveTypeId && leaveTypeId !== "all") {
            baseWhere.leaveTypeId = String(leaveTypeId);
        }
        if (search) {
            baseWhere.OR = [
                { name: { contains: String(search).trim(), mode: "insensitive" } },
                { code: { contains: String(search).trim(), mode: "insensitive" } },
                { description: { contains: String(search).trim(), mode: "insensitive" } },
                { leaveType: { name: { contains: String(search).trim(), mode: "insensitive" } } },
            ];
        }
        const where = { ...baseWhere };
        if (status && status !== "all") {
            where.status = String(status);
        }
        const validSort = ["name", "createdAt", "maxCarryForwardDays", "status", "effectiveFrom"].includes(String(sortBy))
            ? String(sortBy)
            : null;
        const dir = String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc";
        const orderBy = validSort
            ? [{ [validSort]: dir }]
            : [{ isDefault: "desc" }, { createdAt: "desc" }];
        const isPaged = includeCounts === "true" || (page !== undefined && limit !== undefined);
        const pageNum = Math.max(1, parseInt(String(page || "1"), 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(String(limit || "20"), 10) || 20));
        if (isPaged) {
            const [policies, totalFiltered, statusGroups] = await Promise.all([
                prisma_1.rawPrisma.leavePolicy.findMany({
                    where,
                    include: { leaveType: true },
                    orderBy,
                    skip: (pageNum - 1) * limitNum,
                    take: limitNum,
                }),
                prisma_1.rawPrisma.leavePolicy.count({ where }),
                prisma_1.rawPrisma.leavePolicy.groupBy({
                    by: ["status"],
                    where: baseWhere,
                    _count: { _all: true },
                }),
            ]);
            let activeCount = 0;
            let inactiveCount = 0;
            for (const g of statusGroups) {
                if (g.status === "active")
                    activeCount += g._count._all;
                else if (g.status === "inactive")
                    inactiveCount += g._count._all;
            }
            const enriched = policies.map((p) => leave_service_1.LeaveService.enrichPolicy(p));
            return res.json({
                data: enriched,
                counts: {
                    all: activeCount + inactiveCount,
                    active: activeCount,
                    inactive: inactiveCount,
                },
                meta: {
                    total: totalFiltered,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.max(1, Math.ceil(totalFiltered / limitNum)),
                },
            });
        }
        const policies = await prisma_1.rawPrisma.leavePolicy.findMany({
            where,
            include: { leaveType: true },
            orderBy,
        });
        return res.json(policies.map((p) => leave_service_1.LeaveService.enrichPolicy(p)));
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// GET /api/v1/hr/leave/policies/:id
exports.hrLeaveRouter.get("/policies/:id", (0, auth_1.requirePermission)("hrm.leave.view"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const policy = await prisma_1.rawPrisma.leavePolicy.findFirst({
            where: { id, tenantId },
            include: { leaveType: true },
        });
        if (!policy)
            return res.status(404).json({ error: "Leave policy not found" });
        return res.json(leave_service_1.LeaveService.enrichPolicy(policy));
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// POST /api/v1/hr/leave/policies
exports.hrLeaveRouter.post("/policies", (0, auth_1.requirePermission)("hrm.leave.create"), requireHrAdminRole, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { name, code, description, leaveTypeId, branchId, departmentId, noticeDays, sandwichRule, minDays, maxConsecutiveDays, halfDayAllowed, blackoutDates, carryForward, carryForwardEnabled, maxCarryForwardDays, requiresApproval, status, accrualFrequency, probationAllowed, isDefault, effectiveFrom, effectiveTo, } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: "Policy name is required" });
        }
        const trimmedName = String(name).trim();
        // Validate same-tenant LeaveType FK if specified
        let linkedLeaveType = null;
        const resolvedLeaveTypeId = leaveTypeId && leaveTypeId !== "all" ? String(leaveTypeId) : null;
        if (resolvedLeaveTypeId) {
            linkedLeaveType = await prisma_1.rawPrisma.leaveType.findFirst({
                where: { id: resolvedLeaveTypeId, tenantId },
            });
            if (!linkedLeaveType) {
                return res.status(400).json({
                    error: "Selected leave type does not belong to this organization.",
                    code: "INVALID_LEAVE_TYPE_FK",
                });
            }
        }
        // Validate numeric & date configuration boundaries
        const parsedMinDays = minDays !== undefined && minDays !== "" ? Number(minDays) : 1;
        const parsedMaxDays = maxConsecutiveDays !== undefined && maxConsecutiveDays !== "" ? Number(maxConsecutiveDays) : 14;
        const parsedNoticeDays = noticeDays !== undefined && noticeDays !== "" ? Number(noticeDays) : 0;
        const rawCarryLimit = maxCarryForwardDays !== undefined ? maxCarryForwardDays : carryForward;
        const parsedCarryLimit = rawCarryLimit !== undefined && rawCarryLimit !== "" && typeof rawCarryLimit !== "boolean"
            ? Number(rawCarryLimit)
            : 0;
        if (Number.isNaN(parsedMinDays) || parsedMinDays < 0.5 || parsedMinDays > 365) {
            return res.status(400).json({ error: "Minimum days per application must be between 0.5 and 365." });
        }
        if (Number.isNaN(parsedMaxDays) || parsedMaxDays < 1 || parsedMaxDays > 365) {
            return res.status(400).json({ error: "Maximum days per application must be between 1 and 365." });
        }
        if (parsedMinDays > parsedMaxDays) {
            return res.status(400).json({
                error: `Minimum days per application (${parsedMinDays}) cannot exceed maximum days per application (${parsedMaxDays}).`,
                code: "INVALID_POLICY_MIN_MAX",
            });
        }
        if (Number.isNaN(parsedNoticeDays) || parsedNoticeDays < 0 || parsedNoticeDays > 365) {
            return res.status(400).json({ error: "Notice period must be between 0 and 365 days." });
        }
        if (Number.isNaN(parsedCarryLimit) || parsedCarryLimit < 0 || parsedCarryLimit > 365) {
            return res.status(400).json({ error: "Carry forward limit must be between 0 and 365 days." });
        }
        const effFromDate = effectiveFrom ? new Date(effectiveFrom) : new Date();
        const effToDate = effectiveTo ? new Date(effectiveTo) : null;
        if (Number.isNaN(effFromDate.getTime()) || (effToDate && Number.isNaN(effToDate.getTime()))) {
            return res.status(400).json({ error: "Invalid effective date range." });
        }
        if (effToDate && effToDate < effFromDate) {
            return res.status(400).json({
                error: "Policy effective end date cannot be earlier than effective start date.",
                code: "INVALID_POLICY_DATES",
            });
        }
        const duplicate = await prisma_1.rawPrisma.leavePolicy.findFirst({
            where: {
                tenantId,
                name: { equals: trimmedName, mode: "insensitive" },
            },
        });
        if (duplicate) {
            return res.status(400).json({
                error: `A leave policy named "${trimmedName}" already exists for this organization.`,
                code: "DUPLICATE_LEAVE_POLICY",
            });
        }
        if (isDefault) {
            await prisma_1.rawPrisma.leavePolicy.updateMany({
                where: { tenantId, isDefault: true },
                data: { isDefault: false },
            });
        }
        const resolvedCarryEnabled = carryForwardEnabled !== undefined ? Boolean(carryForwardEnabled) : parsedCarryLimit > 0;
        const serializedRules = leave_service_1.LeaveService.serializePolicyRules({
            minDays: parsedMinDays,
            halfDayAllowed: halfDayAllowed !== undefined
                ? Boolean(halfDayAllowed)
                : linkedLeaveType?.halfDayAllowed ?? true,
            blackoutDates,
        }, null, linkedLeaveType);
        const resolvedCode = code && String(code).trim()
            ? String(code).trim().toUpperCase()
            : `LPOL-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 89)}`;
        const policy = await prisma_1.rawPrisma.leavePolicy.create({
            data: {
                tenantId,
                name: trimmedName,
                code: resolvedCode,
                description: description?.trim() || null,
                leaveTypeId: resolvedLeaveTypeId,
                branchId: branchId && branchId !== "all" ? String(branchId) : null,
                departmentId: departmentId && departmentId !== "all" ? String(departmentId) : null,
                noticeDays: Math.round(parsedNoticeDays),
                sandwichRule: Boolean(sandwichRule),
                maxConsecutiveDays: Math.round(parsedMaxDays),
                blackoutDates: serializedRules,
                carryForwardEnabled: resolvedCarryEnabled,
                maxCarryForwardDays: resolvedCarryEnabled ? Math.round(parsedCarryLimit) : 0,
                requiresApproval: requiresApproval !== false,
                status: status === "inactive" ? "inactive" : "active",
                accrualFrequency: ["yearly", "monthly", "quarterly"].includes(String(accrualFrequency))
                    ? String(accrualFrequency)
                    : "yearly",
                probationAllowed: probationAllowed !== false,
                isDefault: Boolean(isDefault),
                effectiveFrom: effFromDate,
                effectiveTo: effToDate,
            },
            include: { leaveType: true },
        });
        audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user.userId,
            action: "LEAVE_POLICY_CREATED",
            entityType: "LeavePolicy",
            entityId: policy.id,
            newState: policy,
        }).catch(() => { });
        return res.status(201).json(leave_service_1.LeaveService.enrichPolicy(policy));
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// PUT /api/v1/hr/leave/policies/:id
exports.hrLeaveRouter.put("/policies/:id", (0, auth_1.requirePermission)("hrm.leave.edit"), requireHrAdminRole, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { name, code, description, leaveTypeId, branchId, departmentId, noticeDays, sandwichRule, minDays, maxConsecutiveDays, halfDayAllowed, blackoutDates, carryForward, carryForwardEnabled, maxCarryForwardDays, requiresApproval, status, accrualFrequency, probationAllowed, isDefault, effectiveFrom, effectiveTo, } = req.body;
        const existing = await prisma_1.rawPrisma.leavePolicy.findFirst({
            where: { id, tenantId },
            include: { leaveType: true },
        });
        if (!existing)
            return res.status(404).json({ error: "Leave policy not found" });
        if (name !== undefined && !String(name).trim()) {
            return res.status(400).json({ error: "Policy name cannot be empty." });
        }
        const nextName = name !== undefined ? String(name).trim() : existing.name;
        if (nextName.toLowerCase() !== existing.name.toLowerCase()) {
            const duplicate = await prisma_1.rawPrisma.leavePolicy.findFirst({
                where: {
                    tenantId,
                    id: { not: id },
                    name: { equals: nextName, mode: "insensitive" },
                },
            });
            if (duplicate) {
                return res.status(400).json({
                    error: `A leave policy named "${nextName}" already exists for this organization.`,
                    code: "DUPLICATE_LEAVE_POLICY",
                });
            }
        }
        const nextLeaveTypeId = leaveTypeId !== undefined ? (leaveTypeId === "all" || !leaveTypeId ? null : String(leaveTypeId)) : existing.leaveTypeId;
        let linkedLeaveType = existing.leaveType;
        if (nextLeaveTypeId) {
            linkedLeaveType = await prisma_1.rawPrisma.leaveType.findFirst({
                where: { id: nextLeaveTypeId, tenantId },
            });
            if (!linkedLeaveType) {
                return res.status(400).json({
                    error: "Selected leave type does not belong to this organization.",
                    code: "INVALID_LEAVE_TYPE_FK",
                });
            }
        }
        else {
            linkedLeaveType = null;
        }
        const existingRules = leave_service_1.LeaveService.parsePolicyRules(existing, linkedLeaveType);
        const nextMinDays = minDays !== undefined && minDays !== "" ? Number(minDays) : existingRules.minDays;
        const nextMaxDays = maxConsecutiveDays !== undefined && maxConsecutiveDays !== ""
            ? Number(maxConsecutiveDays)
            : existing.maxConsecutiveDays;
        const nextNoticeDays = noticeDays !== undefined && noticeDays !== "" ? Number(noticeDays) : existing.noticeDays;
        const rawNextCarryLimit = maxCarryForwardDays !== undefined ? maxCarryForwardDays : carryForward;
        const nextCarryLimit = rawNextCarryLimit !== undefined &&
            rawNextCarryLimit !== "" &&
            typeof rawNextCarryLimit !== "boolean"
            ? Number(rawNextCarryLimit)
            : existing.maxCarryForwardDays;
        if (Number.isNaN(nextMinDays) || nextMinDays < 0.5 || nextMinDays > 365) {
            return res.status(400).json({ error: "Minimum days per application must be between 0.5 and 365." });
        }
        if (Number.isNaN(nextMaxDays) || nextMaxDays < 1 || nextMaxDays > 365) {
            return res.status(400).json({ error: "Maximum days per application must be between 1 and 365." });
        }
        if (nextMinDays > nextMaxDays) {
            return res.status(400).json({
                error: `Minimum days per application (${nextMinDays}) cannot exceed maximum days per application (${nextMaxDays}).`,
                code: "INVALID_POLICY_MIN_MAX",
            });
        }
        if (Number.isNaN(nextNoticeDays) || nextNoticeDays < 0 || nextNoticeDays > 365) {
            return res.status(400).json({ error: "Notice period must be between 0 and 365 days." });
        }
        if (Number.isNaN(nextCarryLimit) || nextCarryLimit < 0 || nextCarryLimit > 365) {
            return res.status(400).json({ error: "Carry forward limit must be between 0 and 365 days." });
        }
        const nextEffFrom = effectiveFrom ? new Date(effectiveFrom) : existing.effectiveFrom;
        const nextEffTo = effectiveTo !== undefined ? (effectiveTo ? new Date(effectiveTo) : null) : existing.effectiveTo;
        if (nextEffTo && nextEffTo < nextEffFrom) {
            return res.status(400).json({
                error: "Policy effective end date cannot be earlier than effective start date.",
                code: "INVALID_POLICY_DATES",
            });
        }
        if (isDefault && !existing.isDefault) {
            await prisma_1.rawPrisma.leavePolicy.updateMany({
                where: { tenantId, isDefault: true },
                data: { isDefault: false },
            });
        }
        const nextCarryEnabled = carryForwardEnabled !== undefined
            ? Boolean(carryForwardEnabled)
            : typeof carryForward === "boolean"
                ? carryForward
                : rawNextCarryLimit !== undefined
                    ? nextCarryLimit > 0
                    : existing.carryForwardEnabled;
        const serializedRules = leave_service_1.LeaveService.serializePolicyRules({
            minDays: nextMinDays,
            halfDayAllowed: halfDayAllowed !== undefined ? Boolean(halfDayAllowed) : existingRules.halfDayAllowed,
            blackoutDates,
        }, existing.blackoutDates, linkedLeaveType);
        const updated = await prisma_1.rawPrisma.leavePolicy.update({
            where: { id },
            data: {
                name: nextName,
                code: code !== undefined && String(code).trim() ? String(code).trim().toUpperCase() : existing.code,
                description: description !== undefined ? (description ? String(description).trim() : null) : existing.description,
                leaveTypeId: nextLeaveTypeId,
                branchId: branchId !== undefined ? (branchId && branchId !== "all" ? String(branchId) : null) : existing.branchId,
                departmentId: departmentId !== undefined
                    ? departmentId && departmentId !== "all"
                        ? String(departmentId)
                        : null
                    : existing.departmentId,
                noticeDays: Math.round(nextNoticeDays),
                sandwichRule: sandwichRule !== undefined ? Boolean(sandwichRule) : existing.sandwichRule,
                maxConsecutiveDays: Math.round(nextMaxDays),
                blackoutDates: serializedRules,
                carryForwardEnabled: nextCarryEnabled,
                maxCarryForwardDays: nextCarryEnabled ? Math.round(nextCarryLimit) : 0,
                requiresApproval: requiresApproval !== undefined ? Boolean(requiresApproval) : existing.requiresApproval,
                status: status !== undefined && ["active", "inactive"].includes(status) ? status : existing.status,
                accrualFrequency: accrualFrequency !== undefined && ["yearly", "monthly", "quarterly"].includes(String(accrualFrequency))
                    ? String(accrualFrequency)
                    : existing.accrualFrequency,
                probationAllowed: probationAllowed !== undefined ? Boolean(probationAllowed) : existing.probationAllowed,
                isDefault: isDefault !== undefined ? Boolean(isDefault) : existing.isDefault,
                effectiveFrom: nextEffFrom,
                effectiveTo: nextEffTo,
            },
            include: { leaveType: true },
        });
        audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user.userId,
            action: "LEAVE_POLICY_UPDATED",
            entityType: "LeavePolicy",
            entityId: id,
            oldState: existing,
            newState: updated,
        }).catch(() => { });
        return res.json(leave_service_1.LeaveService.enrichPolicy(updated));
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// PATCH /api/v1/hr/leave/policies/:id/status
exports.hrLeaveRouter.patch("/policies/:id/status", (0, auth_1.requirePermission)("hrm.leave.edit"), requireHrAdminRole, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !["active", "inactive"].includes(status)) {
            return res.status(400).json({ error: "Status must be 'active' or 'inactive'" });
        }
        const existing = await prisma_1.rawPrisma.leavePolicy.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Leave policy not found" });
        await prisma_1.rawPrisma.leavePolicy.update({
            where: { id },
            data: { status },
        });
        audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user.userId,
            action: status === "inactive" ? "LEAVE_POLICY_DEACTIVATED" : "LEAVE_POLICY_ACTIVATED",
            entityType: "LeavePolicy",
            entityId: id,
            oldState: { status: existing.status },
            newState: { status },
        }).catch(() => { });
        return res.json({ success: true, id, status });
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// DELETE /api/v1/hr/leave/policies/:id
exports.hrLeaveRouter.delete("/policies/:id", (0, auth_1.requirePermission)("hrm.leave.delete"), requireHrAdminRole, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const existing = await prisma_1.rawPrisma.leavePolicy.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Leave policy not found" });
        if (existing.isDefault) {
            return res.status(400).json({
                error: "Cannot delete the default organization leave policy. Please assign another default policy first or deactivate it.",
                code: "DEFAULT_POLICY_PROTECTED",
                canDeactivate: existing.status === "active",
            });
        }
        if (existing.leaveTypeId) {
            const activeRequests = await prisma_1.rawPrisma.leaveRequest.count({
                where: { tenantId, leaveTypeId: existing.leaveTypeId },
            });
            if (activeRequests > 0) {
                return res.status(400).json({
                    error: `Cannot delete leave policy: Its associated leave type has ${activeRequests} historical leave request(s). Please deactivate the policy instead.`,
                    code: "LEAVE_POLICY_IN_USE",
                    canDeactivate: existing.status === "active",
                    details: {
                        canDeactivate: existing.status === "active",
                        leaveRequests: activeRequests,
                    },
                });
            }
        }
        await prisma_1.rawPrisma.leavePolicy.delete({ where: { id } });
        audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user.userId,
            action: "LEAVE_POLICY_DELETED",
            entityType: "LeavePolicy",
            entityId: id,
            oldState: existing,
        }).catch(() => { });
        return res.json({ success: true, message: "Leave policy deleted successfully." });
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// =========================================================================
// 5. CALENDAR (Preserved endpoint for backward compatibility, scoped)
// =========================================================================
exports.hrLeaveRouter.get("/calendar", (0, auth_1.requirePermission)("hrm.leave.view"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const now = new Date();
        const month = parseInt(String(req.query.month || now.getUTCMonth() + 1), 10);
        const year = parseInt(String(req.query.year || now.getUTCFullYear()), 10);
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        const { isElevatedHR, callerEmpId } = await resolveCallerScope(req, tenantId);
        const where = {
            tenantId,
            status: "approved",
            startDate: { lte: end },
            endDate: { gte: start },
        };
        if (!isElevatedHR) {
            if (!callerEmpId)
                return res.json([]);
            where.OR = [{ employeeId: callerEmpId }, { employee: { managerId: callerEmpId } }];
        }
        const leaves = await prisma_1.rawPrisma.leaveRequest.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        branch: { select: { name: true } },
                        department: { select: { name: true } },
                    },
                },
                leaveType: true,
            },
        });
        return res.json(leaves);
    }
    catch (err) {
        return sendLeaveError(res, err, 500);
    }
});
// =========================================================================
// 6. ENCASHMENT & COMP-OFF (5th Leave Management Module — P3-A)
// =========================================================================
exports.hrLeaveRouter.use("/encashment-compoff", hr_leave_encashment_compoff_routes_1.hrLeaveEncashmentCompOffRouter);
