"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizationRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_1 = require("../context/tenant-context");
const master_data_blueprint_1 = require("../blueprints/master-data.blueprint");
const announcements_routes_1 = require("./announcements.routes");
exports.organizationRouter = (0, express_1.Router)();
// =========================================================================
// 1. BRANCHES MASTER (/branches)
// =========================================================================
exports.organizationRouter.use("/branches", (0, master_data_blueprint_1.createMasterDataRouter)({
    modelName: "branch",
    entityName: "Branch",
    searchFields: ["name", "code", "email", "phone"],
    uniqueFields: ["code"],
}));
// =========================================================================
// 2. DEPARTMENTS MASTER (/departments)
// =========================================================================
exports.organizationRouter.use("/departments", (0, master_data_blueprint_1.createMasterDataRouter)({
    modelName: "department",
    entityName: "Department",
    searchFields: ["name", "description"],
    uniqueFields: ["name"],
}));
// =========================================================================
// 3. DESIGNATIONS MASTER (/designations)
// =========================================================================
exports.organizationRouter.use("/designations", (0, master_data_blueprint_1.createMasterDataRouter)({
    modelName: "designation",
    entityName: "Designation",
    searchFields: ["name", "description"],
    uniqueFields: ["name"],
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
const holidayDateNormalizer = (req, _res, next) => {
    if (req.body && req.body.date) {
        const d = new Date(req.body.date);
        if (!isNaN(d.getTime())) {
            req.body.date = d;
            if (!req.body.year) {
                req.body.year = d.getFullYear();
            }
        }
    }
    next();
};
exports.organizationRouter.use("/holidays", holidayDateNormalizer, (0, master_data_blueprint_1.createMasterDataRouter)({
    modelName: "holiday",
    entityName: "Holiday",
    searchFields: ["name", "description", "type"],
    uniqueFields: [],
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
