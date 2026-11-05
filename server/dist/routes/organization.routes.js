"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRANCH_PHYSICAL_COLUMNS_SELECT = exports.organizationRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_context_1 = require("../context/tenant-context");
const master_data_blueprint_1 = require("../blueprints/master-data.blueprint");
const announcements_routes_1 = require("./announcements.routes");
exports.organizationRouter = (0, express_1.Router)();
exports.organizationRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
exports.BRANCH_PHYSICAL_COLUMNS_SELECT = {
    id: true,
    tenantId: true,
    name: true,
    code: true,
    address: true,
    phone: true,
    email: true,
    status: true,
    createdAt: true,
    updatedAt: true,
};
// =========================================================================
// 1. BRANCHES MASTER (/branches)
// =========================================================================
exports.organizationRouter.use("/branches", (0, master_data_blueprint_1.createMasterDataRouter)({
    modelName: "branch",
    entityName: "Branch",
    searchFields: ["name", "code", "email", "phone"],
    uniqueFields: ["code", "name"],
    select: exports.BRANCH_PHYSICAL_COLUMNS_SELECT,
    dependencyCheck: async (db, id, tenantId) => {
        const [empCount, deptCount] = await Promise.all([
            db.employee.count({ where: { branchId: id, tenantId } }),
            db.department.count({ where: { branchId: id, tenantId } }),
        ]);
        if (empCount > 0 || deptCount > 0) {
            return {
                canDelete: false,
                message: `Cannot delete Branch because ${empCount} employee(s) and ${deptCount} department(s) are assigned to it. Please deactivate/archive it instead.`,
            };
        }
        return { canDelete: true };
    },
}));
// =========================================================================
// 2. DEPARTMENTS MASTER (/departments)
// =========================================================================
exports.organizationRouter.use("/departments", (0, master_data_blueprint_1.createMasterDataRouter)({
    modelName: "department",
    entityName: "Department",
    searchFields: ["name", "description"],
    uniqueFields: ["name"],
    include: {
        branch: { select: { id: true, name: true, code: true } },
    },
    dependencyCheck: async (db, id, tenantId) => {
        const [empCount, desigCount] = await Promise.all([
            db.employee.count({ where: { departmentId: id, tenantId } }),
            db.designation.count({ where: { departmentId: id, tenantId } }),
        ]);
        if (empCount > 0 || desigCount > 0) {
            return {
                canDelete: false,
                message: `Cannot delete Department because ${empCount} employee(s) and ${desigCount} designation(s) are assigned to it. Please deactivate/archive it instead.`,
            };
        }
        return { canDelete: true };
    },
}));
// =========================================================================
// 3. DESIGNATIONS MASTER (/designations)
// =========================================================================
exports.organizationRouter.use("/designations", (0, master_data_blueprint_1.createMasterDataRouter)({
    modelName: "designation",
    entityName: "Designation",
    searchFields: ["name", "description"],
    uniqueFields: ["name"],
    include: {
        department: { select: { id: true, name: true } },
    },
    dependencyCheck: async (db, id, tenantId) => {
        const empCount = await db.employee.count({ where: { designationId: id, tenantId } });
        if (empCount > 0) {
            return {
                canDelete: false,
                message: `Cannot delete Designation because ${empCount} employee(s) are assigned to it. Please deactivate/archive it instead.`,
            };
        }
        return { canDelete: true };
    },
}));
// =========================================================================
// 4. AWARD TYPES MASTER (/award-types)
// =========================================================================
exports.organizationRouter.use("/award-types", (0, master_data_blueprint_1.createMasterDataRouter)({
    modelName: "awardType",
    entityName: "AwardType",
    searchFields: ["name", "description"],
    uniqueFields: ["name"],
}));
// =========================================================================
// 5. HOLIDAYS MASTER (/holidays)
// Middleware to normalize date and auto-populate year
// =========================================================================
const holidayDateNormalizer = async (req, res, next) => {
    if (req.method === "POST" || req.method === "PUT") {
        // Map title to name if needed and delete title to avoid Prisma unknown argument error
        if (req.body && req.body.title) {
            if (!req.body.name) {
                req.body.name = req.body.title;
            }
            delete req.body.title;
        }
        if (req.body && req.body.date) {
            const d = new Date(req.body.date);
            if (isNaN(d.getTime())) {
                return res.status(400).json({ error: "Invalid holiday date provided" });
            }
            req.body.date = d;
            if (!req.body.year) {
                req.body.year = d.getFullYear();
            }
        }
        // On POST creation, validate required fields and duplicate date
        if (req.method === "POST") {
            if (!req.body.name || !String(req.body.name).trim()) {
                return res.status(400).json({ error: "Holiday title is required" });
            }
            if (!req.body.date) {
                return res.status(400).json({ error: "Holiday date is required" });
            }
            // Check duplicate date in same tenant
            try {
                const tenantId = req.user?.tenantId;
                if (tenantId && req.body.date) {
                    const db = (0, tenant_context_1.getTenantDb)(req);
                    const startOfDay = new Date(req.body.date);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(req.body.date);
                    endOfDay.setHours(23, 59, 59, 999);
                    const existing = await db.holiday.findFirst({
                        where: {
                            tenantId,
                            date: { gte: startOfDay, lte: endOfDay },
                            status: "active",
                        },
                        select: { id: true, name: true },
                    });
                    if (existing) {
                        return res.status(400).json({
                            error: `An active holiday ('${existing.name}') is already scheduled for this date.`,
                        });
                    }
                }
            }
            catch (err) {
                console.warn("[holidayDateNormalizer] duplicate check warning:", err.message);
            }
        }
    }
    next();
};
exports.organizationRouter.use("/holidays", holidayDateNormalizer, (0, master_data_blueprint_1.createMasterDataRouter)({
    modelName: "holiday",
    entityName: "Holiday",
    searchFields: ["name", "description", "type"],
    filterFields: ["year", "type", "branchId"],
    uniqueFields: [],
    customCounts: async (db, tenantId) => {
        const [publicCount, optionalCount] = await Promise.all([
            db.holiday.count({
                where: {
                    tenantId,
                    status: "active",
                    OR: [
                        { type: { contains: "public", mode: "insensitive" } },
                        { type: { contains: "national", mode: "insensitive" } },
                        { type: { contains: "company", mode: "insensitive" } },
                    ],
                },
            }),
            db.holiday.count({
                where: {
                    tenantId,
                    status: "active",
                    OR: [
                        { type: { contains: "optional", mode: "insensitive" } },
                        { type: { contains: "restricted", mode: "insensitive" } },
                        { type: { contains: "religious", mode: "insensitive" } },
                    ],
                },
            }),
        ]);
        return { public: publicCount, optional: optionalCount };
    },
}));
// 5.1 HOLIDAY TYPES MASTER (/holiday-types)
exports.organizationRouter.use("/holiday-types", (0, master_data_blueprint_1.createMasterDataRouter)({
    modelName: "holidayType",
    entityName: "HolidayType",
    searchFields: ["name", "description"],
    uniqueFields: ["name"],
    dependencyCheck: async (db, id, tenantId) => {
        const type = await db.holidayType.findUnique({ where: { id } });
        if (type) {
            const count = await db.holiday.count({
                where: {
                    tenantId,
                    type: { equals: type.name, mode: "insensitive" },
                },
            });
            if (count > 0) {
                return {
                    canDelete: false,
                    message: `Cannot delete Holiday Type '${type.name}' because it is assigned to ${count} existing holiday(s). Please reassign or de-activate it instead.`,
                };
            }
        }
        return { canDelete: true };
    },
}));
// =========================================================================
// 6. ANNOUNCEMENTS (/announcements)
// =========================================================================
exports.organizationRouter.use("/announcements", announcements_routes_1.announcementsRouter);
// =========================================================================
// 7. HR ORGANIZATION STRUCTURE & HIERARCHY (GET /structure)
// =========================================================================
exports.organizationRouter.get("/structure", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const db = (0, tenant_context_1.getTenantDb)();
        // Parallel fetch of org components
        const [branches, departments, designations, employees] = await Promise.all([
            db.branch.findMany({
                where: { tenantId },
                include: {
                    _count: {
                        select: { employees: true, departments: true },
                    },
                },
                orderBy: { name: "asc" },
            }),
            db.department.findMany({
                where: { tenantId },
                include: {
                    branch: { select: { id: true, name: true, code: true } },
                    _count: {
                        select: { employees: true, designations: true },
                    },
                },
                orderBy: { name: "asc" },
            }),
            db.designation.findMany({
                where: { tenantId },
                include: {
                    department: { select: { id: true, name: true } },
                    _count: {
                        select: { employees: true },
                    },
                },
                orderBy: { name: "asc" },
            }),
            db.employee.findMany({
                where: { tenantId, status: "active" },
                select: {
                    id: true,
                    employeeCode: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    position: true,
                    managerId: true,
                    departmentId: true,
                    branchId: true,
                    designationId: true,
                    status: true,
                    department: { select: { id: true, name: true } },
                    branch: { select: { id: true, name: true } },
                    designation: { select: { id: true, name: true } },
                },
            }),
        ]);
        // Build employee reporting hierarchy tree
        const employeeMap = new Map();
        employees.forEach((emp) => {
            employeeMap.set(emp.id, {
                ...emp,
                name: `${emp.firstName} ${emp.lastName}`.trim(),
                subordinates: [],
            });
        });
        const rootNodes = [];
        employees.forEach((emp) => {
            const node = employeeMap.get(emp.id);
            if (emp.managerId && employeeMap.has(emp.managerId)) {
                employeeMap.get(emp.managerId).subordinates.push(node);
            }
            else {
                rootNodes.push(node);
            }
        });
        const stats = {
            totalBranches: branches.length,
            totalDepartments: departments.length,
            totalDesignations: designations.length,
            totalEmployees: employees.length,
            activeEmployees: employees.filter((e) => e.status === "active").length,
        };
        return res.json({
            branches,
            departments,
            designations,
            orgChart: rootNodes,
            stats,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
