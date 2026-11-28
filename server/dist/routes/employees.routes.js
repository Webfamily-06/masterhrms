"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeesRouter = void 0;
const employee_schema_1 = require("../schemas/employee.schema");
const validate_middleware_1 = require("../middleware/validate.middleware");
const workspace_policy_service_1 = require("../services/workspace-policy.service");
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const auth_helpers_1 = require("../lib/auth-helpers");
const limits_1 = require("../middleware/limits");
const audit_service_1 = require("../services/audit.service");
const reporting_hierarchy_validator_1 = require("../lib/reporting-hierarchy-validator");
exports.employeesRouter = (0, express_1.Router)();
// Enforce Request-Scoped Tenant Context on all employee endpoints
exports.employeesRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
const requireHrEmployeeAdmin = (0, auth_1.requireRole)("admin", "super_admin", "tenant_admin", "hr_admin");
// ---------------------------------------------------------------------------
// PII MASKING — WAVE 2 SECURITY ENFORCEMENT
// Protects Aadhaar, PAN, Bank Account numbers from exposure to non-privileged
// users. Only HR admins and payroll managers may see full statutory identifiers.
// Compliant with: Aadhaar Act 2016, DPDP Act 2023, Income-tax Act Section 139A.
// ---------------------------------------------------------------------------
/**
 * Returns true if the requesting user has elevated HR/Finance privileges that
 * entitle them to view full statutory PII (Aadhaar, PAN, bank account).
 */
function callerHasStatutoryPIIAccess(req) {
    if (!req.user)
        return false;
    if (req.user.roles?.includes("super_admin"))
        return true;
    if (req.user.roles?.some((r) => ["admin", "tenant_admin", "workspace_admin", "hr_admin", "hr_manager", "Workspace Admin", "HR Manager"].includes(r))) {
        return true;
    }
    const wsRole = String(req.user.workspaceRole || "").toLowerCase().trim();
    if (["workspace admin", "tenant admin", "hr manager", "hr admin", "hr administrator"].includes(wsRole)) {
        return true;
    }
    const hrPermissions = ["hrm.employees.manage", "hrm.payroll.manage", "hrm.sensitive.view", "hr:employee:sensitive:read"];
    const userPerms = req.user.permissions || [];
    return hrPermissions.some((p) => userPerms.includes(p));
}
/**
 * Masks a numeric-identifier string, keeping only the last `visible` characters.
 * Example: maskNumeric("123456789012", 4) => "XXXXXXXX9012"
 */
function maskNumeric(value, visible = 4) {
    if (!value)
        return value ?? null;
    const s = String(value);
    if (s.length <= visible)
        return s; // too short to meaningfully mask
    return "X".repeat(s.length - visible) + s.slice(-visible);
}
/**
 * Masks an alphanumeric PAN, keeping last 4 alphanumeric characters visible.
 * Example: maskPAN("ABCDE1234F") => "XXXXXX234F"
 */
function maskPAN(value) {
    if (!value)
        return value ?? null;
    const s = String(value);
    if (s.length <= 4)
        return s;
    return "X".repeat(s.length - 4) + s.slice(-4);
}
/**
 * Strict field-level security projection for non-privileged callers (DEFECT-027).
 * Standard employees viewing colleagues only receive safe public directory fields —
 * compensation, banking, statutory IDs, DOB, and phone are completely stripped.
 */
function applyPIIMask(employee, req) {
    if (!employee)
        return employee;
    if (callerHasStatutoryPIIAccess(req))
        return employee;
    // Check self-access: employee can view their own profile unmasked
    const selfEmployeeId = req.user?.employeeId;
    const selfUserId = req.user?.userId || req.user?.id;
    if ((selfEmployeeId && selfEmployeeId === employee.id) || (selfUserId && employee.userId && selfUserId === employee.userId)) {
        return employee;
    }
    return {
        id: employee.id,
        tenantId: employee.tenantId,
        userId: employee.userId ?? null,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        position: employee.position ?? null,
        employmentType: employee.employmentType,
        status: employee.status,
        joinedAt: employee.joinedAt ?? null,
        departmentId: employee.departmentId ?? null,
        department: employee.department ?? null,
        branchId: employee.branchId ?? null,
        branch: employee.branch ?? null,
        designationId: employee.designationId ?? null,
        designation: employee.designation ?? null,
        managerId: employee.managerId ?? null,
        manager: employee.manager ?? null,
        avatarUrl: employee.avatarUrl ?? employee.user?.profile?.avatarUrl ?? null,
    };
}
/**
 * Apply PII masking to an array of employee records.
 */
function applyPIIMaskList(employees, req) {
    if (callerHasStatutoryPIIAccess(req))
        return employees;
    return employees.map((emp) => applyPIIMask(emp, req));
}
function parseEmployeeStatus(status) {
    if (!status)
        return "active";
    const s = String(status).toLowerCase().trim();
    if (s === "on_leave" || s === "onleave" || s === "leave")
        return "on_leave";
    if (s === "terminated" || s === "inactive")
        return "terminated";
    return "active";
}
function parseEmploymentType(type) {
    if (!type)
        return "full_time";
    const t = String(type).toLowerCase().trim();
    if (t === "part_time" || t === "parttime")
        return "part_time";
    if (t === "contract")
        return "contract";
    if (t === "intern" || t === "internship")
        return "intern";
    return "full_time";
}
/**
 * Helper to safely extract tenantId with robust fallback
 */
async function getTenantId(req) {
    const tenantId = req.user?.tenantId;
    if (!tenantId)
        throw Object.assign(new Error("Workspace context required"), { status: 403 });
    return tenantId;
}
const pagination_1 = require("../lib/pagination");
// GET /api/employees (Stocky Rule 0: Universal Query Contract)
exports.employeesRouter.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 50);
        const { departmentId, branchId, designationId, status, employmentType } = req.query;
        const where = { tenantId };
        if (pagination.search) {
            where.OR = [
                { firstName: { contains: pagination.search } },
                { lastName: { contains: pagination.search } },
                { email: { contains: pagination.search } },
                { employeeCode: { contains: pagination.search } },
                { phone: { contains: pagination.search } },
                { position: { contains: pagination.search } },
            ];
        }
        if (departmentId && departmentId !== "all") {
            where.departmentId = String(departmentId);
        }
        if (branchId && branchId !== "all") {
            where.branchId = String(branchId);
        }
        if (designationId && designationId !== "all") {
            where.designationId = String(designationId);
        }
        if (status && status !== "all") {
            where.status = parseEmployeeStatus(status);
        }
        if (employmentType && employmentType !== "all") {
            where.employmentType = parseEmploymentType(employmentType);
        }
        const isPrivilegedCaller = callerHasStatutoryPIIAccess(req);
        const allowedSortFields = isPrivilegedCaller
            ? ["firstName", "lastName", "employeeCode", "createdAt", "updatedAt", "joinedAt", "salary"]
            : ["firstName", "lastName", "employeeCode", "createdAt", "updatedAt", "joinedAt"];
        const sortField = allowedSortFields.includes(pagination.sortField)
            ? pagination.sortField
            : "createdAt";
        const baseCountWhere = { tenantId };
        if (departmentId && departmentId !== "all")
            baseCountWhere.departmentId = String(departmentId);
        if (branchId && branchId !== "all")
            baseCountWhere.branchId = String(branchId);
        if (designationId && designationId !== "all")
            baseCountWhere.designationId = String(designationId);
        if (employmentType && employmentType !== "all")
            baseCountWhere.employmentType = parseEmploymentType(employmentType);
        const [total, employees, allCount, activeCount, inactiveCount, probationCount, terminatedCount] = await Promise.all([
            prisma_1.prisma.employee.count({ where }),
            prisma_1.prisma.employee.findMany({
                where,
                include: {
                    department: true,
                    branch: true,
                    designation: true,
                    manager: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                    user: {
                        select: {
                            profile: {
                                select: { avatarUrl: true },
                            },
                        },
                    },
                },
                orderBy: { [sortField]: pagination.sortType },
                ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
            }),
            prisma_1.prisma.employee.count({ where: baseCountWhere }),
            prisma_1.prisma.employee.count({ where: { ...baseCountWhere, status: "active" } }),
            prisma_1.prisma.employee.count({ where: { ...baseCountWhere, status: { not: "active" } } }),
            prisma_1.prisma.employee.count({ where: { ...baseCountWhere, probationRecords: { some: { status: { in: ["active", "extended", "ongoing"] } } } } }),
            prisma_1.prisma.employee.count({ where: { ...baseCountWhere, status: "terminated" } }),
        ]);
        // WAVE 2 — Apply PII masking based on caller privilege + flatten avatarUrl & loginStatus
        const enrichedEmployees = employees.map((emp) => ({
            ...emp,
            loginStatus: emp.userId ? "active" : "inactive",
            avatarUrl: emp.avatarUrl || emp.user?.profile?.avatarUrl || null,
        }));
        const maskedEmployees = applyPIIMaskList(enrichedEmployees, req);
        const statusCounts = {
            all: allCount,
            active: activeCount,
            inactive: inactiveCount,
            probation: probationCount,
            terminated: terminatedCount,
        };
        if (pagination.isPaginated) {
            return res.json({
                ...(0, pagination_1.formatPaginatedResponse)(maskedEmployees, total, pagination),
                statusCounts,
            });
        }
        res.setHeader("X-Total-Count", String(total));
        return res.json(maskedEmployees);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
    }
});
// POST /api/employees
exports.employeesRouter.post("/", auth_1.requireAuth, (0, auth_1.requirePermission)("hrm.employees.create"), (0, limits_1.requireWithinLimit)("seats"), async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        const { firstName, lastName, email, phone, position, employeeCode, branchId, departmentId, designationId, managerId, employmentType, salary, joinedAt, avatarUrl, password, createLoginAccount, userRole, workspaceRole, roleId, pan, aadhaar, uan, esiNumber, bankName, bankAccount, bankIfsc, bankBranch, dateOfBirth, gender, taxRegime, state, pfEligible, esiEligible, ptEligible, tdsEligible, } = req.body;
        const shouldCreateLogin = createLoginAccount !== false;
        if (shouldCreateLogin && (!password || String(password).trim().length < 6)) {
            return res.status(400).json({
                error: "An initial login password of at least 6 characters is required when login account creation is enabled.",
                code: "PASSWORD_REQUIRED",
            });
        }
        if (managerId) {
            const hierarchyCheck = await (0, reporting_hierarchy_validator_1.validateReportingHierarchy)(tenantId, null, managerId, prisma_1.prisma);
            if (!hierarchyCheck.valid) {
                return res.status(400).json({ error: hierarchyCheck.error });
            }
        }
        const employee = await prisma_1.prisma.$transaction(async (tx) => {
            await (0, workspace_policy_service_1.lockWorkspaceCapacity)(tx, tenantId, "employees");
            const cleanEmail = email.toLowerCase().trim();
            let userId;
            if (shouldCreateLogin) {
                userId = await (0, auth_helpers_1.provisionEmployeeUser)(tx, {
                    tenantId,
                    email: cleanEmail,
                    firstName,
                    lastName,
                    phone,
                    avatarUrl,
                    password: String(password).trim(),
                    userRole: userRole || null,
                    workspaceRole: workspaceRole || null,
                    roleId: roleId || null,
                });
            }
            let resolvedPosition = position ? String(position).trim() : null;
            if (!resolvedPosition && designationId) {
                const desig = await tx.designation.findFirst({
                    where: { id: designationId, tenantId },
                    select: { name: true },
                });
                if (desig?.name)
                    resolvedPosition = desig.name;
            }
            const created = await tx.employee.create({
                data: {
                    tenantId,
                    userId: userId || null,
                    firstName,
                    lastName,
                    email: email.toLowerCase().trim(),
                    phone,
                    position: resolvedPosition,
                    employeeCode: employeeCode || `EMP-${Date.now().toString().slice(-4)}`,
                    branchId: branchId || null,
                    departmentId: departmentId || null,
                    designationId: designationId || null,
                    managerId: managerId || null,
                    employmentType: parseEmploymentType(employmentType),
                    status: parseEmployeeStatus(req.body.status),
                    salary: salary ? Number(salary) : null,
                    joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
                    pan: pan ? String(pan).toUpperCase().trim() : null,
                    aadhaar: aadhaar ? String(aadhaar).trim() : null,
                    uan: uan ? String(uan).trim() : null,
                    esiNumber: esiNumber ? String(esiNumber).trim() : null,
                    bankName: bankName ? String(bankName).trim() : null,
                    bankAccount: bankAccount ? String(bankAccount).trim() : null,
                    bankIfsc: bankIfsc ? String(bankIfsc).toUpperCase().trim() : null,
                    bankBranch: bankBranch ? String(bankBranch).trim() : null,
                    dateOfBirth: dateOfBirth && !isNaN(Date.parse(dateOfBirth)) ? new Date(dateOfBirth) : null,
                    gender: gender ? String(gender).trim() : null,
                    taxRegime: taxRegime === "old" ? "old" : "new",
                    state: state ? String(state).trim() : "MH",
                    pfEligible: pfEligible !== undefined ? Boolean(pfEligible) : true,
                    esiEligible: esiEligible !== undefined ? Boolean(esiEligible) : true,
                    ptEligible: ptEligible !== undefined ? Boolean(ptEligible) : true,
                    tdsEligible: tdsEligible !== undefined ? Boolean(tdsEligible) : true,
                },
                include: {
                    department: true,
                    branch: true,
                    designation: true,
                    user: {
                        select: {
                            profile: {
                                select: { avatarUrl: true },
                            },
                        },
                    },
                },
            });
            return created;
        }, { timeout: 30000, maxWait: 10000 });
        return res.status(201).json(employee);
    }
    catch (err) {
        if (err.code === "P2002" || err.message?.includes("uq_employees_tenant_user_id")) {
            return res.status(409).json({
                error: "This user account is already assigned to another employee in this workspace.",
                code: "EMPLOYEE_USER_CONFLICT",
            });
        }
        return res.status(err.status || 500).json({
            error: err.message || "Internal server error",
            code: err.code || (err.status === 409 ? "QUOTA_EXCEEDED" : "INTERNAL_ERROR"),
        });
    }
});
// PUT /api/employees/:id
exports.employeesRouter.put("/:id", auth_1.requireAuth, (0, auth_1.requirePermission)("hrm.employees.edit"), (0, validate_middleware_1.validateBody)(employee_schema_1.updateEmployeeSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, phone, position, employeeCode, branchId, departmentId, designationId, managerId, employmentType, status, salary, joinedAt, avatarUrl, pan, aadhaar, uan, esiNumber, bankName, bankAccount, bankIfsc, bankBranch, dateOfBirth, gender, taxRegime, state, pfEligible, esiEligible, ptEligible, tdsEligible, } = req.body;
        const tenantId = req.user?.tenantId;
        const isSuperAdmin = req.user?.roles?.includes("super_admin");
        const existingEmp = await prisma_1.prisma.employee.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!existingEmp || (!isSuperAdmin && tenantId && existingEmp.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Employee not found." });
        }
        const isHrOrAdmin = req.user?.roles?.some((r) => ["admin", "super_admin", "hr_manager", "hr_admin"].includes(r));
        if (salary !== undefined && !isHrOrAdmin) {
            return res.status(403).json({
                error: "FORBIDDEN: Insufficient permissions to modify employee compensation",
                code: "INSUFFICIENT_COMPENSATION_PRIVILEGE",
            });
        }
        if (status !== undefined && !isHrOrAdmin) {
            return res.status(403).json({
                error: "FORBIDDEN: Insufficient permissions to modify employee lifecycle status",
                code: "INSUFFICIENT_STATUS_PRIVILEGE",
            });
        }
        if (managerId !== undefined && managerId !== existingEmp.managerId) {
            const hierarchyCheck = await (0, reporting_hierarchy_validator_1.validateReportingHierarchy)(existingEmp.tenantId, id, managerId, prisma_1.prisma);
            if (!hierarchyCheck.valid) {
                return res.status(400).json({ error: hierarchyCheck.error });
            }
        }
        await audit_service_1.AuditService.logMutation({
            tenantId: tenantId || "unknown",
            actorId: req.user?.userId || "system",
            action: "UPDATE_EMPLOYEE",
            entityType: "Employee",
            entityId: id,
            metadata: { employeeId: id, updatedFields: Object.keys(req.body) },
        });
        // Resolve the new status being applied
        const newStatus = status ? parseEmployeeStatus(status) : existingEmp.status;
        const isReactivation = existingEmp.status === "terminated" && newStatus === "active";
        // WAVE 2 — REACTIVATION CAPACITY ENFORCEMENT
        // When reactivating a terminated employee, enforce subscription seat limits
        // atomically using a pessimistic row lock on the tenant row.
        if (isReactivation && tenantId) {
            const employee = await prisma_1.prisma.$transaction(async (tx) => {
                // This executes SELECT ... FOR UPDATE on the tenant row and checks maxEmployees
                await (0, workspace_policy_service_1.lockWorkspaceCapacity)(tx, tenantId, "employees", 1);
                // Perform the avatar update inside the same transaction if required
                if (avatarUrl && existingEmp.userId) {
                    await tx.profile.upsert({
                        where: { userId: existingEmp.userId },
                        create: {
                            userId: existingEmp.userId,
                            fullName: `${firstName || ""} ${lastName || ""}`.trim() || email,
                            email: email ? email.toLowerCase().trim() : existingEmp.email,
                            avatarUrl,
                            tenantId: existingEmp.tenantId,
                        },
                        update: {
                            avatarUrl,
                            fullName: `${firstName || ""} ${lastName || ""}`.trim() || email,
                        },
                    });
                }
                return tx.employee.update({
                    where: { id },
                    data: {
                        firstName,
                        lastName,
                        email: email ? email.toLowerCase().trim() : undefined,
                        phone,
                        position,
                        employeeCode,
                        ...(branchId !== undefined && { branchId: branchId || null }),
                        departmentId: departmentId || null,
                        ...(designationId !== undefined && { designationId: designationId || null }),
                        managerId: managerId || null,
                        employmentType: employmentType ? parseEmploymentType(employmentType) : undefined,
                        status: newStatus,
                        salary: salary !== undefined && salary !== "" && !isNaN(Number(salary)) ? Number(salary) : undefined,
                        joinedAt: joinedAt && !isNaN(Date.parse(joinedAt)) ? new Date(joinedAt) : undefined,
                        ...(pan !== undefined && { pan: pan ? String(pan).toUpperCase().trim() : null }),
                        ...(aadhaar !== undefined && { aadhaar: aadhaar ? String(aadhaar).trim() : null }),
                        ...(uan !== undefined && { uan: uan ? String(uan).trim() : null }),
                        ...(esiNumber !== undefined && { esiNumber: esiNumber ? String(esiNumber).trim() : null }),
                        ...(bankName !== undefined && { bankName: bankName ? String(bankName).trim() : null }),
                        ...(bankAccount !== undefined && { bankAccount: bankAccount ? String(bankAccount).trim() : null }),
                        ...(bankIfsc !== undefined && { bankIfsc: bankIfsc ? String(bankIfsc).toUpperCase().trim() : null }),
                        ...(bankBranch !== undefined && { bankBranch: bankBranch ? String(bankBranch).trim() : null }),
                        ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth && !isNaN(Date.parse(dateOfBirth)) ? new Date(dateOfBirth) : null }),
                        ...(gender !== undefined && { gender: gender ? String(gender).trim() : null }),
                        ...(taxRegime !== undefined && { taxRegime: taxRegime === "old" ? "old" : "new" }),
                        ...(state !== undefined && { state: state ? String(state).trim() : null }),
                        ...(pfEligible !== undefined && { pfEligible: Boolean(pfEligible) }),
                        ...(esiEligible !== undefined && { esiEligible: Boolean(esiEligible) }),
                        ...(ptEligible !== undefined && { ptEligible: Boolean(ptEligible) }),
                        ...(tdsEligible !== undefined && { tdsEligible: Boolean(tdsEligible) }),
                    },
                    include: {
                        department: true,
                        user: {
                            select: {
                                profile: {
                                    select: { avatarUrl: true },
                                },
                            },
                        },
                    },
                });
            }, { timeout: 30000, maxWait: 10000 });
            return res.json(employee);
        }
        // --- Non-reactivation update path (no capacity check needed) ---
        const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
        if (existingEmp.userId && normalizedEmail && existingEmp.user?.email?.toLowerCase().trim() !== normalizedEmail) {
            const emailOwner = await prisma_1.prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
            if (!emailOwner || emailOwner.id === existingEmp.userId) {
                await prisma_1.prisma.user.update({
                    where: { id: existingEmp.userId },
                    data: { email: normalizedEmail },
                });
            }
        }
        if (existingEmp.userId && (avatarUrl || normalizedEmail || firstName || lastName)) {
            await prisma_1.prisma.profile.upsert({
                where: { userId: existingEmp.userId },
                create: {
                    userId: existingEmp.userId,
                    fullName: `${firstName || existingEmp.firstName || ""} ${lastName || existingEmp.lastName || ""}`.trim() || normalizedEmail || existingEmp.email,
                    email: normalizedEmail || existingEmp.email,
                    avatarUrl: avatarUrl || null,
                    tenantId: existingEmp.tenantId,
                },
                update: {
                    ...(avatarUrl ? { avatarUrl } : {}),
                    ...(normalizedEmail ? { email: normalizedEmail } : {}),
                    fullName: `${firstName || existingEmp.firstName || ""} ${lastName || existingEmp.lastName || ""}`.trim() || normalizedEmail || existingEmp.email,
                },
            });
        }
        const employee = await prisma_1.prisma.employee.update({
            where: { id },
            data: {
                firstName,
                lastName,
                email: email ? email.toLowerCase().trim() : undefined,
                phone,
                position,
                employeeCode,
                ...(branchId !== undefined && { branchId: branchId || null }),
                departmentId: departmentId || null,
                ...(designationId !== undefined && { designationId: designationId || null }),
                managerId: managerId || null,
                employmentType: employmentType ? parseEmploymentType(employmentType) : undefined,
                status: newStatus,
                salary: salary !== undefined && salary !== "" && !isNaN(Number(salary)) ? Number(salary) : undefined,
                joinedAt: joinedAt && !isNaN(Date.parse(joinedAt)) ? new Date(joinedAt) : undefined,
                ...(pan !== undefined && { pan: pan ? String(pan).toUpperCase().trim() : null }),
                ...(aadhaar !== undefined && { aadhaar: aadhaar ? String(aadhaar).trim() : null }),
                ...(uan !== undefined && { uan: uan ? String(uan).trim() : null }),
                ...(esiNumber !== undefined && { esiNumber: esiNumber ? String(esiNumber).trim() : null }),
                ...(bankName !== undefined && { bankName: bankName ? String(bankName).trim() : null }),
                ...(bankAccount !== undefined && { bankAccount: bankAccount ? String(bankAccount).trim() : null }),
                ...(bankIfsc !== undefined && { bankIfsc: bankIfsc ? String(bankIfsc).toUpperCase().trim() : null }),
                ...(bankBranch !== undefined && { bankBranch: bankBranch ? String(bankBranch).trim() : null }),
                ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth && !isNaN(Date.parse(dateOfBirth)) ? new Date(dateOfBirth) : null }),
                ...(gender !== undefined && { gender: gender ? String(gender).trim() : null }),
                ...(taxRegime !== undefined && { taxRegime: taxRegime === "old" ? "old" : "new" }),
                ...(state !== undefined && { state: state ? String(state).trim() : null }),
                ...(pfEligible !== undefined && { pfEligible: Boolean(pfEligible) }),
                ...(esiEligible !== undefined && { esiEligible: Boolean(esiEligible) }),
                ...(ptEligible !== undefined && { ptEligible: Boolean(ptEligible) }),
                ...(tdsEligible !== undefined && { tdsEligible: Boolean(tdsEligible) }),
            },
            include: {
                department: true,
                user: {
                    select: {
                        profile: {
                            select: { avatarUrl: true },
                        },
                    },
                },
            },
        });
        return res.json(employee);
    }
    catch (err) {
        if (err.code === "P2002" || err.message?.includes("uq_employees_tenant_user_id")) {
            return res.status(409).json({
                error: "This user account is already assigned to another employee in this workspace.",
                code: "EMPLOYEE_USER_CONFLICT",
            });
        }
        return res.status(err.status || 500).json({
            error: err.message || "Internal server error",
            code: err.code || (err.status === 409 ? "QUOTA_EXCEEDED" : "INTERNAL_ERROR"),
        });
    }
});
// DELETE /api/employees/:id (Secured with HR Admin RBAC guard)
exports.employeesRouter.delete("/:id", auth_1.requireAuth, requireHrEmployeeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: "Employee ID is required" });
        const tenantId = req.user?.tenantId;
        const isSuperAdmin = req.user?.roles?.includes("super_admin");
        // Verify employee exists and belongs to current tenant
        const employee = await prisma_1.prisma.employee.findUnique({
            where: { id },
            select: { id: true, userId: true, firstName: true, lastName: true, tenantId: true },
        });
        if (!employee || (!isSuperAdmin && tenantId && employee.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Employee not found" });
        }
        await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Release assigned company assets
            await tx.assetRequest.updateMany({
                where: { employeeId: id, status: "pending" },
                data: { status: "cancelled" },
            });
            await tx.asset.updateMany({
                where: { assignedEmployeeId: id },
                data: { assignedEmployeeId: null, status: "available" },
            });
            // 2. Unlink manager references for subordinate employees
            await tx.employee.updateMany({
                where: { managerId: id },
                data: { managerId: null },
            });
            // Cancel pending leave requests
            await tx.leaveRequest.updateMany({
                where: { employeeId: id, status: "pending" },
                data: { status: "cancelled" },
            });
            // 3. Statutory Soft Delete: Mark employee status as "terminated"
            // Preserves historical attendance, leaveRequests, payslips, employeeExit, and tax audit records
            await tx.employee.update({
                where: { id },
                data: {
                    status: "terminated",
                    userId: null,
                },
                select: { id: true },
            });
            // 4. Revoke user authentication, active sessions, and access roles
            if (employee.userId) {
                const otherLinked = await tx.employee.count({
                    where: { userId: employee.userId, id: { not: id } },
                });
                if (otherLinked === 0) {
                    await tx.deviceSession.updateMany({
                        where: { userId: employee.userId, revoked: false },
                        data: { revoked: true, revokedAt: new Date() },
                    });
                    await tx.userRole.deleteMany({ where: { userId: employee.userId } });
                    await tx.userRoleAssignment.deleteMany({ where: { userId: employee.userId } });
                    (0, auth_1.invalidateAuthCache)(employee.userId, employee.tenantId);
                }
            }
        });
        // 5. Emit security & compliance audit log
        try {
            await audit_service_1.AuditService.logMutation({
                tenantId: employee.tenantId,
                actorId: req.user?.userId || req.user?.id,
                action: "EMPLOYEE_ARCHIVED",
                entityType: "Employee",
                entityId: employee.id,
                metadata: {
                    details: `Employee ${employee.firstName} ${employee.lastName} was archived. Active sessions revoked and statutory records preserved.`,
                },
            });
        }
        catch { }
        console.log("[DELETE /employees/" + id + "] Employee " + employee.firstName + " " + employee.lastName + " successfully deleted from database.");
        return res.json({
            success: true,
            message: "Employee " + employee.firstName + " " + employee.lastName + " has been archived. Statutory attendance, payslip, and tax audit records are preserved.",
        });
    }
    catch (err) {
        console.error("Employee delete error:", err.message);
        return res.status(err.status || 500).json({ error: err.message || "Internal server error during employee deletion" });
    }
});
// GET /api/employees/departments
exports.employeesRouter.get("/departments", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        const departments = await prisma_1.prisma.department.findMany({
            where: { tenantId },
            include: {
                _count: {
                    select: { employees: true },
                },
            },
            orderBy: { name: "asc" },
        });
        return res.json(departments);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
    }
});
// GET /api/employees/departments/:id
exports.employeesRouter.get("/departments/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = await getTenantId(req);
        const department = await prisma_1.prisma.department.findFirst({
            where: { id, tenantId },
            include: {
                _count: { select: { employees: true } },
            },
        });
        if (!department) {
            return res.status(404).json({ error: "Department not found" });
        }
        return res.json(department);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
    }
});
// POST /api/employees/departments
exports.employeesRouter.post("/departments", auth_1.requireAuth, requireHrEmployeeAdmin, async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        const { name, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Department name is required" });
        }
        const department = await prisma_1.prisma.department.create({
            data: {
                tenantId,
                name: name.trim(),
                description: description?.trim() || null,
            },
        });
        return res.status(201).json(department);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
    }
});
// PUT /api/employees/departments/:id
exports.employeesRouter.put("/departments/:id", auth_1.requireAuth, requireHrEmployeeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = await getTenantId(req);
        const { name, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Department name is required" });
        }
        // Tenant isolation: ensure department belongs to this tenant
        const existing = await prisma_1.prisma.department.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: "Department not found" });
        }
        const updated = await prisma_1.prisma.department.update({
            where: { id },
            data: {
                name: name.trim(),
                description: description?.trim() ?? existing.description,
            },
        });
        return res.json(updated);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
    }
});
// PATCH /api/employees/departments/:id  (partial update alias)
exports.employeesRouter.patch("/departments/:id", auth_1.requireAuth, requireHrEmployeeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = await getTenantId(req);
        const { name, description } = req.body;
        // Tenant isolation
        const existing = await prisma_1.prisma.department.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: "Department not found" });
        }
        const updated = await prisma_1.prisma.department.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(description !== undefined && { description: description.trim() || null }),
            },
        });
        return res.json(updated);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
    }
});
// DELETE /api/employees/departments/:id
exports.employeesRouter.delete("/departments/:id", auth_1.requireAuth, requireHrEmployeeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = await getTenantId(req);
        // Tenant isolation: ensure department belongs to this tenant
        const existing = await prisma_1.prisma.department.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: "Department not found" });
        }
        await prisma_1.prisma.department.delete({ where: { id } });
        return res.json({ success: true, message: "Department deleted" });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
    }
});
// GET /api/employees/:id (Fetch single employee record with tenant boundary)
exports.employeesRouter.get("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const isSuperAdmin = req.user?.roles?.includes("super_admin");
        const employee = await prisma_1.prisma.employee.findUnique({
            where: { id },
            include: {
                department: true,
                branch: true,
                designation: true,
                manager: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                user: {
                    select: {
                        profile: {
                            select: { avatarUrl: true },
                        },
                    },
                },
            },
        });
        if (!employee || (!isSuperAdmin && tenantId && employee.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Employee not found" });
        }
        // WAVE 2 — Apply PII masking based on caller privilege
        return res.json(applyPIIMask(employee, req));
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
    }
});
// POST /api/employees/:id/reset-2fa (Tenant Admin resets 2FA for an employee)
exports.employeesRouter.post("/:id/reset-2fa", auth_1.requireAuth, requireHrEmployeeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const employee = await prisma_1.prisma.employee.findUnique({
            where: { id },
        });
        if (!employee || (tenantId && employee.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Employee record not found in this workspace." });
        }
        // Find user record by email
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: employee.email },
        });
        if (!user) {
            return res.status(404).json({ error: `No login account found for ${employee.email}` });
        }
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorBackupCodes: null,
                twoFactorConfirmedAt: null,
            },
        });
        return res.json({
            success: true,
            message: `Two-Factor Authentication reset for ${employee.firstName} ${employee.lastName} (${employee.email}). Account unlocked.`,
        });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
    }
});
// GET /api/employees/:id/login-account (Fetch employee login account status & roles)
exports.employeesRouter.get("/:id/login-account", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const employee = await prisma_1.prisma.employee.findUnique({
            where: { id },
            include: { department: true },
        });
        if (!employee || (tenantId && employee.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Employee record not found." });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: employee.email.toLowerCase().trim() },
            include: {
                roles: true,
                profile: true,
            },
        });
        return res.json({
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
            email: employee.email,
            hasAccount: !!user,
            userId: user?.id || null,
            twoFactorEnabled: user?.twoFactorEnabled || false,
            roles: user?.roles?.map((r) => r.role) || ["employee"],
            isLocked: false,
            createdAt: user?.createdAt || null,
        });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
    }
});
// POST /api/employees/:id/set-password (Admin sets / resets employee login password)
exports.employeesRouter.post("/:id/set-password", auth_1.requireAuth, requireHrEmployeeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword, sendNotification } = req.body;
        const tenantId = req.user?.tenantId;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long." });
        }
        const employee = await prisma_1.prisma.employee.findUnique({
            where: { id },
            select: {
                id: true,
                tenantId: true,
                userId: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
            },
        });
        if (!employee || (tenantId && employee.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Employee record not found in this workspace." });
        }
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
        const email = employee.email.toLowerCase().trim();
        await prisma_1.prisma.$transaction(async (tx) => {
            const userId = await (0, auth_helpers_1.provisionEmployeeUser)(tx, {
                tenantId: employee.tenantId, email, firstName: employee.firstName,
                lastName: employee.lastName, phone: employee.phone, password: newPassword,
                employeeId: employee.id,
            });
            await tx.employee.update({
                where: { id: employee.id },
                data: { userId },
                select: { id: true, userId: true },
            });
        });
        // Log audit
        try {
            await audit_service_1.AuditService.logMutation({
                tenantId: employee.tenantId,
                actorId: req.user?.userId || req.user?.id,
                action: "EMPLOYEE_PASSWORD_SET",
                entityType: "Employee",
                entityId: employee.id,
                metadata: {
                    details: `Admin reset password for employee ${employee.firstName} ${employee.lastName} (${email})`,
                },
            });
        }
        catch { }
        return res.json({
            success: true,
            message: `Password successfully updated for ${employee.firstName} ${employee.lastName}. The employee can now login at /auth using their email and new password.`,
            email,
        });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
    }
});
// POST /api/employees/bulk-import
// Atomically imports multiple employees in batch with upfront capacity enforcement & auto department resolution
exports.employeesRouter.post("/bulk-import", auth_1.requireAuth, requireHrEmployeeAdmin, async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        const rawList = Array.isArray(req.body) ? req.body : req.body.employees || req.body.data || [];
        if (!Array.isArray(rawList) || rawList.length === 0) {
            return res.status(400).json({ error: "An array of employee records is required in 'employees'." });
        }
        const errors = [];
        let skippedCount = 0;
        // 1. Identify existing employees in this tenant to deduplicate before capacity check
        const candidateEmails = rawList
            .map((r) => (r.email || "").trim().toLowerCase())
            .filter(Boolean);
        const existingEmps = await prisma_1.prisma.employee.findMany({
            where: { tenantId, email: { in: candidateEmails } },
            select: { email: true },
        });
        const existingEmailSet = new Set(existingEmps.map((e) => e.email.toLowerCase()));
        const validNewRows = [];
        const batchSeenEmails = new Set();
        for (let i = 0; i < rawList.length; i++) {
            const row = rawList[i];
            const firstName = (row.firstName || row.first_name || "").trim();
            const lastName = (row.lastName || row.last_name || "").trim();
            const rawEmail = (row.email || "").trim().toLowerCase();
            if (!firstName || !rawEmail) {
                errors.push({ index: i, email: rawEmail, error: "First name and email are mandatory." });
                continue;
            }
            if (existingEmailSet.has(rawEmail) || batchSeenEmails.has(rawEmail)) {
                skippedCount++;
                continue;
            }
            batchSeenEmails.add(rawEmail);
            validNewRows.push({ row, index: i, email: rawEmail, firstName, lastName });
        }
        if (errors.length > 0) {
            return res.status(400).json({
                error: "Validation failed for one or more records. Entire import aborted.",
                code: "VALIDATION_FAILED",
                errors,
            });
        }
        if (validNewRows.length === 0) {
            return res.json({
                success: true,
                total: rawList.length,
                imported: 0,
                skipped: skippedCount,
                failed: 0,
                employees: [],
            });
        }
        // Cache departments to avoid repeated queries
        const existingDepts = await prisma_1.prisma.department.findMany({ where: { tenantId } });
        const deptMap = new Map();
        for (const d of existingDepts) {
            deptMap.set(d.name.toLowerCase().trim(), d.id);
        }
        const provisioningWarnings = [];
        // 2. Execute entire batch atomically inside a transaction with pessimistic capacity lock
        const importedEmployees = await prisma_1.prisma.$transaction(async (tx) => {
            // Upfront capacity lock: validate active count + batch size <= plan limit
            await (0, workspace_policy_service_1.lockWorkspaceCapacity)(tx, tenantId, "employees", validNewRows.length);
            const createdList = [];
            for (const item of validNewRows) {
                const { row, index: i, email: rawEmail, firstName, lastName } = item;
                // Resolve department
                let departmentId = row.departmentId || row.department_id || null;
                const deptName = (row.department || row.departmentName || "").trim();
                if (!departmentId && deptName) {
                    const lowerDept = deptName.toLowerCase();
                    if (deptMap.has(lowerDept)) {
                        departmentId = deptMap.get(lowerDept);
                    }
                    else {
                        const newDept = await tx.department.create({
                            data: { tenantId, name: deptName },
                        });
                        deptMap.set(lowerDept, newDept.id);
                        departmentId = newDept.id;
                    }
                }
                let userId;
                try {
                    // PARTIAL-004: Generate strong random temp password when omitted (never hardcoded weak Password@123)
                    const initialPassword = typeof row.password === "string" && row.password.trim().length >= 8
                        ? row.password.trim()
                        : `${crypto_1.default.randomBytes(12).toString("base64url")}!A1`;
                    userId = await (0, auth_helpers_1.provisionEmployeeUser)(tx, {
                        tenantId,
                        email: rawEmail,
                        firstName,
                        lastName: lastName || "-",
                        phone: row.phone || null,
                        password: initialPassword,
                    });
                }
                catch (provErr) {
                    // PARTIAL-004: Surface partial user-account provisioning warnings instead of silently swallowing
                    provisioningWarnings.push({
                        index: i,
                        email: rawEmail,
                        reason: provErr?.message || "Employee created without login account provisioning.",
                    });
                }
                const empCode = row.employeeCode || row.employee_code || `EMP-${Date.now().toString().slice(-4)}${i}`;
                const created = await tx.employee.create({
                    data: {
                        tenantId,
                        userId: userId || null,
                        firstName,
                        lastName: lastName || "-",
                        email: rawEmail,
                        phone: row.phone || null,
                        position: row.position || row.designation || "Team Member",
                        employeeCode: empCode,
                        departmentId,
                        employmentType: parseEmploymentType(row.employmentType || row.employment_type),
                        status: parseEmployeeStatus(row.status),
                        salary: row.salary ? Number(row.salary) : null,
                        joinedAt: row.joinedAt ? new Date(row.joinedAt) : new Date(),
                        pan: row.pan ? String(row.pan).toUpperCase().trim() : null,
                        aadhaar: row.aadhaar ? String(row.aadhaar).trim() : null,
                        uan: row.uan ? String(row.uan).trim() : null,
                        esiNumber: row.esiNumber || row.esi_number ? String(row.esiNumber || row.esi_number).trim() : null,
                        bankName: row.bankName || row.bank_name || null,
                        bankAccount: row.bankAccount || row.bank_account || null,
                        bankIfsc: row.bankIfsc || row.bank_ifsc ? String(row.bankIfsc || row.bank_ifsc).toUpperCase().trim() : null,
                        bankBranch: row.bankBranch || row.bank_branch || null,
                        taxRegime: row.taxRegime === "old" ? "old" : "new",
                        state: row.state || "MH",
                    },
                    include: {
                        department: true,
                    },
                });
                createdList.push(created);
            }
            return createdList;
        }, { timeout: 60000, maxWait: 15000 });
        // Log bulk audit activity
        try {
            await audit_service_1.AuditService.logMutation({
                tenantId,
                actorId: req.user?.userId || req.user?.id,
                action: "EMPLOYEES_BULK_IMPORTED",
                entityType: "Employee",
                entityId: tenantId,
                metadata: {
                    details: `Bulk imported ${importedEmployees.length} employees (skipped: ${skippedCount}, errors: ${errors.length})`,
                },
            });
        }
        catch { }
        const isPartial = provisioningWarnings.length > 0;
        return res.status(isPartial ? 207 : 201).json({
            success: !isPartial,
            partial: isPartial,
            total: rawList.length,
            imported: importedEmployees.length,
            skipped: skippedCount,
            failed: errors.length,
            warningsCount: provisioningWarnings.length,
            warnings: provisioningWarnings.length > 0 ? provisioningWarnings : undefined,
            employees: importedEmployees,
            errors: errors.length > 0 ? errors : undefined,
        });
    }
    catch (err) {
        return res.status(err.status || 500).json({
            error: err.message || "Internal server error during bulk import",
            code: err.code || (err.status === 409 ? "QUOTA_EXCEEDED" : "INTERNAL_ERROR"),
        });
    }
});
