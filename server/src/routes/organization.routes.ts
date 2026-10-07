import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { getTenantDb } from "../context/tenant-context";
import { createMasterDataRouter } from "../blueprints/master-data.blueprint";
import { announcementsRouter } from "./announcements.routes";
import { resolveUserSecurityContext, buildDataScopePrismaFilter } from "../lib/data-scope";
import { applyFieldSecurityMask } from "../lib/field-security";

export const organizationRouter = Router();

// =========================================================================
// 1. BRANCHES MASTER (/branches)
// =========================================================================
organizationRouter.use(
  "/branches",
  createMasterDataRouter({
    modelName: "branch",
    entityName: "Branch",
    searchFields: ["name", "code", "email", "phone"],
    uniqueFields: ["code"],
  })
);

// =========================================================================
// 2. DEPARTMENTS MASTER (/departments)
// =========================================================================
organizationRouter.use(
  "/departments",
  createMasterDataRouter({
    modelName: "department",
    entityName: "Department",
    searchFields: ["name", "description"],
    uniqueFields: ["name"],
  })
);

// =========================================================================
// 3. DESIGNATIONS MASTER (/designations)
// =========================================================================
organizationRouter.use(
  "/designations",
  createMasterDataRouter({
    modelName: "designation",
    entityName: "Designation",
    searchFields: ["name", "description"],
    uniqueFields: ["name"],
  })
);

// =========================================================================
// 4. AWARD TYPES MASTER (/award-types)
// =========================================================================
organizationRouter.use(
  "/award-types",
  createMasterDataRouter({
    modelName: "awardType",
    entityName: "AwardType",
    searchFields: ["name", "description"],
    uniqueFields: ["name"],
  })
);

// =========================================================================
// 5. HOLIDAYS MASTER (/holidays)
// Middleware to normalize date and auto-populate year
// =========================================================================
const holidayDateNormalizer = (req: any, _res: any, next: any) => {
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

organizationRouter.use(
  "/holidays",
  holidayDateNormalizer,
  createMasterDataRouter({
    modelName: "holiday",
    entityName: "Holiday",
    searchFields: ["name", "description", "type"],
    uniqueFields: [],
  })
);

// =========================================================================
// 6. ANNOUNCEMENTS (/announcements)
// =========================================================================
organizationRouter.use("/announcements", announcementsRouter);

// =========================================================================
// 7. HR ORGANIZATION STRUCTURE & HIERARCHY (GET /structure)
// =========================================================================
organizationRouter.get(
  "/structure",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

      const db = getTenantDb();

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
      const employeeMap = new Map<string, any>();
      employees.forEach((emp: any) => {
        employeeMap.set(emp.id, {
          ...emp,
          name: `${emp.firstName} ${emp.lastName}`.trim(),
          subordinates: [],
        });
      });

      const rootNodes: any[] = [];
      employees.forEach((emp: any) => {
        const node = employeeMap.get(emp.id);
        if (emp.managerId && employeeMap.has(emp.managerId)) {
          employeeMap.get(emp.managerId).subordinates.push(node);
        } else {
          rootNodes.push(node);
        }
      });

      const stats = {
        totalBranches: branches.length,
        totalDepartments: departments.length,
        totalDesignations: designations.length,
        totalEmployees: employees.length,
        activeEmployees: employees.filter((e: any) => e.status === "active").length,
      };

      return res.json({
        branches,
        departments,
        designations,
        orgChart: rootNodes,
        stats,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);
