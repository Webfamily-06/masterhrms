import { Router, Response } from "express";
import { requireAuth, AuthRequest, requireRole, invalidateAuthCache } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { getTenantDb } from "../context/tenant-context";
import { rawPrisma } from "../prisma";
import { LifecycleService } from "../services/lifecycle.service";
import { ProbationService } from "../services/probation.service.js";
import { AuditService } from "../services/audit.service";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";
import { dispatchComplaintFollowUpNotificationIfDueToday } from "../cron/complaint-followup-reminder.cron";

export const hrLifecycleRouter = Router();

hrLifecycleRouter.use(requireAuth, resolveTenantContext);

// Authorized HR Administration Roles
const HR_ADMIN_ROLES = ["admin", "super_admin", "tenant_admin", "hr_admin", "hr_manager"];
const COMPLAINT_ADMIN_ROLES = ["admin", "super_admin", "tenant_admin", "hr_admin", "hr_manager", "compliance_admin"];

const requireHrAdmin = requireRole(...HR_ADMIN_ROLES);
const requireComplaintAdmin = requireRole(...COMPLAINT_ADMIN_ROLES);

// =========================================================================
// 0. COMMAND CENTER OVERVIEW
// =========================================================================
hrLifecycleRouter.get("/overview", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const metrics = await LifecycleService.getOverviewMetrics(tenantId);
    return res.json(metrics);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load lifecycle overview." });
  }
});

// =========================================================================
// 1. AWARDS (HR-LC-01)
// =========================================================================
hrLifecycleRouter.get("/awards", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const awards = await db.award.findMany({
      where: { tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
        awardType: true,
      },
      orderBy: { awardDate: "desc" },
    });
    return res.json(awards);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch awards." });
  }
});

hrLifecycleRouter.post("/awards", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const { employeeId, awardTypeId, awardDate, giftItem, giftAmount, description, presentedBy, certificateNo } = req.body;

    if (!employeeId || !awardDate) {
      return res.status(400).json({ error: "Employee and award date are required." });
    }

    const award = await db.award.create({
      data: {
        tenantId,
        employeeId,
        awardTypeId: awardTypeId || null,
        awardDate: new Date(awardDate),
        giftItem: giftItem || null,
        giftAmount: giftAmount ? parseFloat(giftAmount) : 0,
        description: description || null,
        presentedBy: presentedBy || null,
        certificateNo: certificateNo || `CERT-${Date.now().toString(36).toUpperCase()}`,
        status: "awarded",
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        awardType: true,
      },
    });

    await LifecycleService.recordEvent({
      tenantId,
      employeeId,
      eventType: "AWARD_GRANTED",
      effectiveDate: new Date(awardDate),
      newState: { giftItem, giftAmount },
      actorId,
      source: "hr_admin",
      reason: description || "Employee recognized with award.",
      referenceId: award.id,
    });

    return res.status(201).json(award);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to grant award." });
  }
});

hrLifecycleRouter.delete("/awards/:id", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.award.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete award." });
  }
});

// =========================================================================
// 2. PROMOTIONS (HR-LC-02)
// =========================================================================
const EMPLOYEE_PROFILE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  employeeCode: true,
  position: true,
  branchId: true,
  departmentId: true,
  designationId: true,
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
  user: { select: { profile: { select: { avatarUrl: true } } } },
};

async function syncEmployeeFromApprovedPromotion(
  db: any,
  tenantId: string,
  promotion: {
    employeeId: string;
    newDesignation?: string | null;
    newDepartment?: string | null;
    newSalary?: any;
  },
  explicitIds?: { newDesignationId?: string; newDepartmentId?: string }
) {
  const empUpdate: any = {};
  if (promotion.newDesignation) {
    empUpdate.position = promotion.newDesignation;
    if (explicitIds?.newDesignationId) {
      empUpdate.designationId = explicitIds.newDesignationId;
    } else {
      const matchedDesig = await db.designation.findFirst({
        where: {
          tenantId,
          name: { equals: promotion.newDesignation, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (matchedDesig) empUpdate.designationId = matchedDesig.id;
    }
  }
  if (explicitIds?.newDepartmentId) {
    empUpdate.departmentId = explicitIds.newDepartmentId;
  } else if (promotion.newDepartment && promotion.newDepartment !== "N/A") {
    const matchedDept = await db.department.findFirst({
      where: {
        tenantId,
        name: { equals: promotion.newDepartment, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (matchedDept) empUpdate.departmentId = matchedDept.id;
  }
  if (promotion.newSalary && Number(promotion.newSalary) > 0) {
    empUpdate.salary = Number(promotion.newSalary);
  }
  if (Object.keys(empUpdate).length > 0) {
    await db.employee.update({ where: { id: promotion.employeeId }, data: empUpdate });
  }
}

hrLifecycleRouter.get("/promotions", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const promotions = await db.promotionRecord.findMany({
      where: { tenantId },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
      },
      orderBy: { promotionDate: "desc" },
    });
    return res.json(promotions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch promotions." });
  }
});

hrLifecycleRouter.post("/promotions", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const {
      employeeId,
      previousDesignation,
      newDesignation,
      newDesignationId,
      newDepartment,
      newDepartmentId,
      promotionDate,
      effectiveDate,
      newSalary,
      promotionType,
      status,
      documentUrl,
      documentName,
      remarks,
    } = req.body;

    if (!employeeId || !newDesignation) {
      return res.status(400).json({ error: "Employee and new designation are required." });
    }

    const employee = await (db.employee as any).findFirst({
      where: { id: employeeId, tenantId },
      select: EMPLOYEE_PROFILE_SELECT,
    });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    const normalizedStatus = (status || "pending").toLowerCase();
    const pDate = promotionDate ? new Date(promotionDate) : new Date(effectiveDate || Date.now());
    const eDate = effectiveDate ? new Date(effectiveDate) : pDate;
    const prevDesig = previousDesignation || employee.designation?.name || employee.position || "N/A";
    const prevDept = employee.department?.name || "N/A";

    const promotion = await (db.promotionRecord as any).create({
      data: {
        tenantId,
        employeeId: employee.id,
        promotionDate: pDate,
        effectiveDate: eDate,
        previousDesignation: prevDesig,
        newDesignation,
        previousDepartment: prevDept,
        newDepartment: newDepartment || prevDept,
        previousSalary: employee.salary ? Number(employee.salary) : null,
        newSalary: newSalary ? Number(newSalary) : null,
        promotionType: promotionType || "merit",
        status: normalizedStatus,
        documentUrl: documentUrl || null,
        documentName: documentName || null,
        remarks: remarks || null,
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
      },
    });

    // If immediately approved, update employee profile (position, designationId, departmentId, salary)
    if (normalizedStatus === "approved") {
      await syncEmployeeFromApprovedPromotion(db, tenantId, promotion, {
        newDesignationId,
        newDepartmentId,
      });
    }

    await LifecycleService.recordEvent({
      tenantId,
      employeeId: employee.id,
      eventType: "PROMOTED",
      effectiveDate: eDate,
      previousState: { designation: prevDesig },
      newState: { designation: newDesignation, status: normalizedStatus },
      changedFields: ["position"],
      actorId,
      source: "hr_admin",
      reason: remarks || "Promotion recorded.",
      referenceId: promotion.id,
    }).catch(() => {});

    return res.status(201).json(promotion);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to execute promotion." });
  }
});

hrLifecycleRouter.put("/promotions/:id", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const existing = await (db.promotionRecord as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Promotion record not found." });

    const {
      employeeId,
      previousDesignation,
      newDesignation,
      promotionDate,
      effectiveDate,
      newSalary,
      promotionType,
      status,
      documentUrl,
      documentName,
      remarks,
    } = req.body;

    const updated = await (db.promotionRecord as any).update({
      where: { id },
      data: {
        ...(employeeId ? { employeeId } : {}),
        ...(previousDesignation !== undefined ? { previousDesignation } : {}),
        ...(newDesignation !== undefined ? { newDesignation } : {}),
        ...(promotionDate ? { promotionDate: new Date(promotionDate) } : {}),
        ...(effectiveDate !== undefined ? { effectiveDate: effectiveDate ? new Date(effectiveDate) : null } : {}),
        ...(newSalary !== undefined ? { newSalary: newSalary ? Number(newSalary) : null } : {}),
        ...(promotionType !== undefined ? { promotionType } : {}),
        ...(status !== undefined ? { status: String(status).toLowerCase() } : {}),
        ...(documentUrl !== undefined ? { documentUrl } : {}),
        ...(documentName !== undefined ? { documentName } : {}),
        ...(remarks !== undefined ? { remarks } : {}),
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
      },
    });

    if (updated.status === "approved") {
      await syncEmployeeFromApprovedPromotion(db, tenantId, updated, {
        newDesignationId: req.body.newDesignationId,
        newDepartmentId: req.body.newDepartmentId,
      });
    }

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update promotion." });
  }
});

hrLifecycleRouter.patch("/promotions/:id/status", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status is required." });

    const existing = await (db.promotionRecord as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Promotion record not found." });

    const normalizedStatus = String(status).toLowerCase();
    const updated = await (db.promotionRecord as any).update({
      where: { id },
      data: { status: normalizedStatus },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
      },
    });

    if (normalizedStatus === "approved") {
      await syncEmployeeFromApprovedPromotion(db, tenantId, updated);
    }

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update promotion status." });
  }
});

hrLifecycleRouter.delete("/promotions/:id", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.promotionRecord.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete promotion." });
  }
});

// =========================================================================
// 3. TRANSFERS (HR-LC-03)
// =========================================================================
hrLifecycleRouter.get("/transfers", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const [transfers, branches, departments, designations] = await Promise.all([
      db.employeeTransfer.findMany({
        where: { tenantId },
        include: {
          employee: { select: EMPLOYEE_PROFILE_SELECT },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.branch.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      db.department.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      db.designation.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    ]);

    const branchMap = new Map(branches.map((b: any) => [b.id, b.name]));
    const deptMap = new Map(departments.map((d: any) => [d.id, d.name]));
    const desigMap = new Map(designations.map((d: any) => [d.id, d.name]));

    const enriched = transfers.map((t: any) => ({
      ...t,
      fromBranchName: (t.fromBranchId && branchMap.get(t.fromBranchId)) || "—",
      toBranchName: (t.toBranchId && branchMap.get(t.toBranchId)) || "—",
      fromDeptName: (t.fromDeptId && deptMap.get(t.fromDeptId)) || "—",
      toDeptName: (t.toDeptId && deptMap.get(t.toDeptId)) || "—",
      fromDesignationName:
        t.fromDesignation ||
        (t.fromDesignationId && desigMap.get(t.fromDesignationId)) ||
        t.employee?.designation?.name ||
        t.employee?.position ||
        "—",
      toDesignationName:
        t.toDesignation ||
        (t.toDesignationId && desigMap.get(t.toDesignationId)) ||
        "—",
    }));

    return res.json(enriched);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch employee transfers." });
  }
});

hrLifecycleRouter.post("/transfers", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const {
      employeeId,
      toBranchId,
      toDeptId,
      toDesignationId,
      toDesignation,
      newManagerId,
      transferDate,
      effectiveDate,
      reason,
      notes,
      documentUrl,
      documentName,
      status,
    } = req.body;

    if (!employeeId || !effectiveDate) {
      return res.status(400).json({ error: "Employee and effective date are required." });
    }

    const employee = await (db.employee as any).findFirst({
      where: { id: employeeId, tenantId },
      select: EMPLOYEE_PROFILE_SELECT,
    });
    if (!employee) return res.status(404).json({ error: "Employee not found." });

    let resolvedToDesigName = toDesignation || null;
    if (toDesignationId && !resolvedToDesigName) {
      const d = await db.designation.findFirst({ where: { id: toDesignationId, tenantId }, select: { name: true } });
      resolvedToDesigName = d?.name || null;
    }

    const transfer = await (db.employeeTransfer as any).create({
      data: {
        tenantId,
        employeeId: employee.id,
        fromBranchId: employee.branchId || null,
        toBranchId: toBranchId || null,
        fromDeptId: employee.departmentId || null,
        toDeptId: toDeptId || null,
        fromDesignationId: employee.designationId || null,
        toDesignationId: toDesignationId || null,
        fromDesignation: employee.designation?.name || employee.position || null,
        toDesignation: resolvedToDesigName,
        oldManagerId: employee.managerId || null,
        newManagerId: newManagerId || null,
        transferDate: transferDate ? new Date(transferDate) : new Date(),
        effectiveDate: new Date(effectiveDate),
        reason: reason || null,
        notes: notes || null,
        documentUrl: documentUrl || null,
        documentName: documentName || null,
        status: (status || "PENDING").toUpperCase(),
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
      },
    });

    return res.status(201).json(transfer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to execute employee transfer." });
  }
});

hrLifecycleRouter.put("/transfers/:id", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const existing = await (db.employeeTransfer as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Transfer record not found." });

    const {
      toBranchId,
      toDeptId,
      toDesignationId,
      toDesignation,
      newManagerId,
      transferDate,
      effectiveDate,
      reason,
      notes,
      documentUrl,
      documentName,
    } = req.body;

    let resolvedToDesigName = toDesignation;
    if (toDesignationId && !resolvedToDesigName) {
      const d = await db.designation.findFirst({ where: { id: toDesignationId, tenantId }, select: { name: true } });
      resolvedToDesigName = d?.name || null;
    }

    const updated = await (db.employeeTransfer as any).update({
      where: { id },
      data: {
        ...(toBranchId !== undefined ? { toBranchId: toBranchId || null } : {}),
        ...(toDeptId !== undefined ? { toDeptId: toDeptId || null } : {}),
        ...(toDesignationId !== undefined ? { toDesignationId: toDesignationId || null } : {}),
        ...(resolvedToDesigName !== undefined ? { toDesignation: resolvedToDesigName || null } : {}),
        ...(newManagerId !== undefined ? { newManagerId: newManagerId || null } : {}),
        ...(transferDate ? { transferDate: new Date(transferDate) } : {}),
        ...(effectiveDate ? { effectiveDate: new Date(effectiveDate) } : {}),
        ...(reason !== undefined ? { reason } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(documentUrl !== undefined ? { documentUrl } : {}),
        ...(documentName !== undefined ? { documentName } : {}),
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update transfer." });
  }
});

hrLifecycleRouter.patch("/transfers/:id/status", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const { id } = req.params;
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ error: "Status is required." });

    const existing = await (db.employeeTransfer as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Transfer record not found." });

    const normalized = String(status).toUpperCase();
    const updated = await (db.employeeTransfer as any).update({
      where: { id },
      data: {
        status: normalized,
        ...(notes !== undefined && String(notes).trim().length > 0 ? { notes: String(notes).trim() } : {}),
      },
      include: { employee: { select: EMPLOYEE_PROFILE_SELECT } },
    });

    if (normalized === "APPROVED") {
      const empUpdate: any = {};
      if (existing.toBranchId) empUpdate.branchId = existing.toBranchId;
      if (existing.toDeptId) empUpdate.departmentId = existing.toDeptId;
      if (existing.toDesignationId) empUpdate.designationId = existing.toDesignationId;
      if (existing.toDesignation) empUpdate.position = existing.toDesignation;
      if (existing.newManagerId) empUpdate.managerId = existing.newManagerId;
      if (Object.keys(empUpdate).length > 0) {
        await (db.employee as any).update({ where: { id: existing.employeeId }, data: empUpdate });
      }

      await LifecycleService.recordEvent({
        tenantId,
        employeeId: existing.employeeId,
        eventType: "TRANSFERRED",
        effectiveDate: existing.effectiveDate,
        previousState: { branchId: existing.fromBranchId, deptId: existing.fromDeptId, designation: existing.fromDesignation },
        newState: { branchId: existing.toBranchId, deptId: existing.toDeptId, designation: existing.toDesignation },
        changedFields: Object.keys(empUpdate),
        actorId,
        source: "hr_admin",
        reason: existing.reason || "Transfer approved",
        referenceId: existing.id,
      }).catch(() => {});
    }

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update transfer status." });
  }
});

hrLifecycleRouter.delete("/transfers/:id", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.employeeTransfer.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete transfer." });
  }
});

// =========================================================================
// 4. WARNINGS (HR-LC-04)
// =========================================================================
hrLifecycleRouter.get("/warnings", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const warnings = await db.disciplinaryWarning.findMany({
      where: { tenantId },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
        warningType: true,
      },
      orderBy: { warningDate: "desc" },
    });
    return res.json(warnings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch disciplinary warnings." });
  }
});

hrLifecycleRouter.post("/warnings", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const {
      employeeId,
      warningTypeId,
      warningTypeName,
      warningBy,
      subject,
      severity,
      warningDate,
      expiryDate,
      description,
      status,
      letterUrl,
      documentName,
      employeeResponse,
      acknowledgedAt,
      hasImprovementPlan,
      improvementPlanGoals,
      improvementPlanStartDate,
      improvementPlanEndDate,
      improvementPlanProgress,
    } = req.body;

    if (!employeeId || !subject || !warningDate) {
      return res.status(400).json({ error: "Employee, subject, and warning date are required." });
    }

    const warning = await (db.disciplinaryWarning as any).create({
      data: {
        tenantId,
        employeeId,
        warningTypeId: warningTypeId || null,
        warningTypeName: warningTypeName || null,
        warningBy: warningBy || null,
        subject,
        severity: severity || "Written",
        warningDate: new Date(warningDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        description: description || "",
        status: (status || "issued").toLowerCase(),
        letterUrl: letterUrl || null,
        documentName: documentName || null,
        employeeResponse: employeeResponse || null,
        acknowledgedAt: acknowledgedAt ? new Date(acknowledgedAt) : null,
        hasImprovementPlan: Boolean(hasImprovementPlan),
        improvementPlanGoals: improvementPlanGoals || null,
        improvementPlanStartDate: improvementPlanStartDate ? new Date(improvementPlanStartDate) : null,
        improvementPlanEndDate: improvementPlanEndDate ? new Date(improvementPlanEndDate) : null,
        improvementPlanProgress: improvementPlanProgress || null,
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
        warningType: true,
      },
    });

    await LifecycleService.recordEvent({
      tenantId,
      employeeId,
      eventType: "WARNING_ISSUED",
      effectiveDate: new Date(warningDate),
      newState: { subject, severity: warning.severity, status: warning.status },
      changedFields: ["disciplinary_warnings"],
      actorId,
      source: "hr_admin",
      reason: description || subject,
      referenceId: warning.id,
    }).catch(() => {});

    return res.status(201).json(warning);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to issue disciplinary warning." });
  }
});

hrLifecycleRouter.put("/warnings/:id", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const existing = await (db.disciplinaryWarning as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Warning record not found." });

    const {
      employeeId,
      warningTypeId,
      warningTypeName,
      warningBy,
      subject,
      severity,
      warningDate,
      expiryDate,
      description,
      status,
      letterUrl,
      documentName,
      employeeResponse,
      acknowledgedAt,
      hasImprovementPlan,
      improvementPlanGoals,
      improvementPlanStartDate,
      improvementPlanEndDate,
      improvementPlanProgress,
    } = req.body;

    const updated = await (db.disciplinaryWarning as any).update({
      where: { id },
      data: {
        ...(employeeId ? { employeeId } : {}),
        ...(warningTypeId !== undefined ? { warningTypeId: warningTypeId || null } : {}),
        ...(warningTypeName !== undefined ? { warningTypeName: warningTypeName || null } : {}),
        ...(warningBy !== undefined ? { warningBy: warningBy || null } : {}),
        ...(subject !== undefined ? { subject } : {}),
        ...(severity !== undefined ? { severity } : {}),
        ...(warningDate ? { warningDate: new Date(warningDate) } : {}),
        ...(expiryDate !== undefined ? { expiryDate: expiryDate ? new Date(expiryDate) : null } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status !== undefined ? { status: String(status).toLowerCase() } : {}),
        ...(letterUrl !== undefined ? { letterUrl } : {}),
        ...(documentName !== undefined ? { documentName } : {}),
        ...(employeeResponse !== undefined ? { employeeResponse } : {}),
        ...(acknowledgedAt !== undefined ? { acknowledgedAt: acknowledgedAt ? new Date(acknowledgedAt) : null } : {}),
        ...(hasImprovementPlan !== undefined ? { hasImprovementPlan: Boolean(hasImprovementPlan) } : {}),
        ...(improvementPlanGoals !== undefined ? { improvementPlanGoals } : {}),
        ...(improvementPlanStartDate !== undefined
          ? { improvementPlanStartDate: improvementPlanStartDate ? new Date(improvementPlanStartDate) : null }
          : {}),
        ...(improvementPlanEndDate !== undefined
          ? { improvementPlanEndDate: improvementPlanEndDate ? new Date(improvementPlanEndDate) : null }
          : {}),
        ...(improvementPlanProgress !== undefined ? { improvementPlanProgress } : {}),
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
        warningType: true,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update warning." });
  }
});

hrLifecycleRouter.patch("/warnings/:id/status", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const { status, acknowledgedAt, employeeResponse } = req.body;
    if (!status) return res.status(400).json({ error: "Status is required." });

    const existing = await (db.disciplinaryWarning as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Warning record not found." });

    const updated = await (db.disciplinaryWarning as any).update({
      where: { id },
      data: {
        status: String(status).toLowerCase(),
        ...(acknowledgedAt !== undefined ? { acknowledgedAt: acknowledgedAt ? new Date(acknowledgedAt) : null } : {}),
        ...(employeeResponse !== undefined ? { employeeResponse } : {}),
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
        warningType: true,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to change warning status." });
  }
});

hrLifecycleRouter.patch("/warnings/:id/improvement-plan", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const {
      hasImprovementPlan,
      improvementPlanGoals,
      improvementPlanStartDate,
      improvementPlanEndDate,
      improvementPlanProgress,
    } = req.body;

    const existing = await (db.disciplinaryWarning as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Warning record not found." });

    const updated = await (db.disciplinaryWarning as any).update({
      where: { id },
      data: {
        hasImprovementPlan: hasImprovementPlan !== undefined ? Boolean(hasImprovementPlan) : true,
        improvementPlanGoals: improvementPlanGoals ?? existing.improvementPlanGoals,
        improvementPlanStartDate: improvementPlanStartDate
          ? new Date(improvementPlanStartDate)
          : improvementPlanStartDate === null
          ? null
          : existing.improvementPlanStartDate,
        improvementPlanEndDate: improvementPlanEndDate
          ? new Date(improvementPlanEndDate)
          : improvementPlanEndDate === null
          ? null
          : existing.improvementPlanEndDate,
        improvementPlanProgress: improvementPlanProgress ?? existing.improvementPlanProgress,
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
        warningType: true,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update improvement plan." });
  }
});

hrLifecycleRouter.delete("/warnings/:id", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.disciplinaryWarning.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete warning." });
  }
});

// =========================================================================
// 5. RESIGNATIONS (HR-LC-05)
// =========================================================================
hrLifecycleRouter.get("/resignations", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const resignations = await (db.employeeExit as any).findMany({
      where: { tenantId, exitType: "resignation" },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
        checklists: true,
      },
      orderBy: { resignationDate: "desc" },
    });
    return res.json(resignations);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch resignations." });
  }
});

hrLifecycleRouter.post("/resignations", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const {
      employeeId,
      resignationDate,
      lastWorkingDay,
      noticePeriodLabel,
      noticePeriodDays,
      reason,
      description,
      documentUrl,
      documentName,
      status,
    } = req.body;

    if (!employeeId || !resignationDate || !reason) {
      return res.status(400).json({ error: "Employee, resignation date, and reason are required." });
    }

    const rDate = new Date(resignationDate);
    const lwd = lastWorkingDay
      ? new Date(lastWorkingDay)
      : new Date(rDate.getTime() + (Number(noticePeriodDays) || 30) * 86400000);
    const exitCode = `RES-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    const created = await (db.employeeExit as any).create({
      data: {
        tenantId,
        employeeId,
        exitCode,
        exitType: "resignation",
        resignationDate: rDate,
        lastWorkingDay: lwd,
        reason: reason.trim(),
        description: description || null,
        noticePeriodLabel: noticePeriodLabel || "30 days",
        noticePeriodDays: Number(noticePeriodDays) || 30,
        documentUrl: documentUrl || null,
        documentName: documentName || null,
        status: (status || "pending").toLowerCase(),
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
      },
    });
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create resignation." });
  }
});

hrLifecycleRouter.put("/resignations/:id", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const existing = await (db.employeeExit as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Resignation record not found." });

    const {
      employeeId,
      resignationDate,
      lastWorkingDay,
      noticePeriodLabel,
      noticePeriodDays,
      reason,
      description,
      documentUrl,
      documentName,
      status,
      exitInterviewConducted,
      exitInterviewDate,
      exitInterviewNotes,
    } = req.body;

    const updated = await (db.employeeExit as any).update({
      where: { id },
      data: {
        ...(employeeId ? { employeeId } : {}),
        ...(resignationDate ? { resignationDate: new Date(resignationDate) } : {}),
        ...(lastWorkingDay ? { lastWorkingDay: new Date(lastWorkingDay) } : {}),
        ...(noticePeriodLabel !== undefined ? { noticePeriodLabel } : {}),
        ...(noticePeriodDays !== undefined ? { noticePeriodDays: Number(noticePeriodDays) || 30 } : {}),
        ...(reason !== undefined ? { reason } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(documentUrl !== undefined ? { documentUrl } : {}),
        ...(documentName !== undefined ? { documentName } : {}),
        ...(status !== undefined ? { status: String(status).toLowerCase() } : {}),
        ...(exitInterviewConducted !== undefined ? { exitInterviewConducted: Boolean(exitInterviewConducted) } : {}),
        ...(exitInterviewDate !== undefined ? { exitInterviewDate: exitInterviewDate ? new Date(exitInterviewDate) : null } : {}),
        ...(exitInterviewNotes !== undefined ? { exitInterviewNotes } : {}),
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update resignation." });
  }
});

hrLifecycleRouter.patch("/resignations/:id/status", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const { status, exitInterviewConducted, exitInterviewDate, exitInterviewNotes } = req.body;
    if (!status) return res.status(400).json({ error: "Status is required." });

    const existing = await (db.employeeExit as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Resignation record not found." });

    const updated = await (db.employeeExit as any).update({
      where: { id },
      data: {
        status: String(status).toLowerCase(),
        ...(exitInterviewConducted !== undefined ? { exitInterviewConducted: Boolean(exitInterviewConducted) } : {}),
        ...(exitInterviewDate !== undefined ? { exitInterviewDate: exitInterviewDate ? new Date(exitInterviewDate) : null } : {}),
        ...(exitInterviewNotes !== undefined ? { exitInterviewNotes } : {}),
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update resignation status." });
  }
});

hrLifecycleRouter.put("/resignations/:id/review", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = getTenantDb();
    const { status, acceptedLastWorkingDay, notes } = req.body;

    const exit = await db.employeeExit.update({
      where: { id: req.params.id },
      data: {
        status: status || "approved",
        lastWorkingDay: acceptedLastWorkingDay ? new Date(acceptedLastWorkingDay) : undefined,
        exitInterviewNotes: notes || undefined,
      },
      include: { employee: true },
    });

    return res.json(exit);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to review resignation." });
  }
});

hrLifecycleRouter.delete("/resignations/:id", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.employeeExit.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete resignation." });
  }
});

// =========================================================================
// 6. TERMINATIONS (HR-LC-06)
// =========================================================================
hrLifecycleRouter.get("/terminations", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const terminations = await (db.employeeExit as any).findMany({
      where: { tenantId, exitType: { not: "resignation" } },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
      },
      orderBy: { lastWorkingDay: "desc" },
    });
    return res.json(terminations);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch terminations." });
  }
});

hrLifecycleRouter.post("/terminations", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const {
      employeeId,
      exitType,
      resignationDate,
      lastWorkingDay,
      noticePeriodLabel,
      reason,
      description,
      documentUrl,
      documentName,
      status,
    } = req.body;

    if (!employeeId || !exitType || !resignationDate || !lastWorkingDay || !reason) {
      return res.status(400).json({ error: "Employee, termination type, notice date, termination date, and reason are required." });
    }

    const exitCode = `TRM-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const created = await (db.employeeExit as any).create({
      data: {
        tenantId,
        employeeId,
        exitCode,
        exitType: exitType.trim(),
        resignationDate: new Date(resignationDate),
        lastWorkingDay: new Date(lastWorkingDay),
        noticePeriodLabel: noticePeriodLabel || "Immediate",
        reason: reason.trim(),
        description: description || null,
        documentUrl: documentUrl || null,
        documentName: documentName || null,
        status: (status || "planned").toLowerCase(),
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
      },
    });
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to execute termination." });
  }
});

hrLifecycleRouter.put("/terminations/:id", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const existing = await (db.employeeExit as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Termination record not found." });

    const {
      employeeId,
      exitType,
      resignationDate,
      lastWorkingDay,
      noticePeriodLabel,
      reason,
      description,
      documentUrl,
      documentName,
      status,
      exitInterviewConducted,
      exitInterviewDate,
      exitInterviewNotes,
    } = req.body;

    const updated = await (db.employeeExit as any).update({
      where: { id },
      data: {
        ...(employeeId ? { employeeId } : {}),
        ...(exitType !== undefined ? { exitType } : {}),
        ...(resignationDate ? { resignationDate: new Date(resignationDate) } : {}),
        ...(lastWorkingDay ? { lastWorkingDay: new Date(lastWorkingDay) } : {}),
        ...(noticePeriodLabel !== undefined ? { noticePeriodLabel } : {}),
        ...(reason !== undefined ? { reason } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(documentUrl !== undefined ? { documentUrl } : {}),
        ...(documentName !== undefined ? { documentName } : {}),
        ...(status !== undefined ? { status: String(status).toLowerCase() } : {}),
        ...(exitInterviewConducted !== undefined ? { exitInterviewConducted: Boolean(exitInterviewConducted) } : {}),
        ...(exitInterviewDate !== undefined ? { exitInterviewDate: exitInterviewDate ? new Date(exitInterviewDate) : null } : {}),
        ...(exitInterviewNotes !== undefined ? { exitInterviewNotes } : {}),
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update termination." });
  }
});

hrLifecycleRouter.patch("/terminations/:id/status", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const { status, exitInterviewConducted, exitInterviewDate, exitInterviewNotes } = req.body;
    if (!status) return res.status(400).json({ error: "Status is required." });

    const existing = await (db.employeeExit as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Termination record not found." });

    const normalized = String(status).toLowerCase();
    const updated = await (db.employeeExit as any).update({
      where: { id },
      data: {
        status: normalized,
        ...(exitInterviewConducted !== undefined ? { exitInterviewConducted: Boolean(exitInterviewConducted) } : {}),
        ...(exitInterviewDate !== undefined ? { exitInterviewDate: exitInterviewDate ? new Date(exitInterviewDate) : null } : {}),
        ...(exitInterviewNotes !== undefined ? { exitInterviewNotes } : {}),
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
      },
    });

    if (normalized === "completed") {
      const terminatedEmp = await (db.employee as any).update({
        where: { id: existing.employeeId },
        data: { status: "terminated" },
        select: { id: true, userId: true, email: true },
      }).catch(() => null);

      // REM-001 (DEFECT-016): Immediately revoke all active sessions & invalidate auth cache on termination completion
      const targetUserId = terminatedEmp?.userId || (updated as any)?.employee?.userId;
      if (targetUserId) {
        await rawPrisma.deviceSession.updateMany({
          where: { userId: targetUserId, revoked: false },
          data: { revoked: true },
        }).catch(() => {});
        invalidateAuthCache(targetUserId, tenantId);
      }

      await AuditService.log({
        tenantId,
        actorId: req.user?.userId || null,
        action: "TERMINATION_COMPLETED_SESSIONS_REVOKED",
        entityType: "EmployeeExit",
        entityId: id,
        newData: { employeeId: existing.employeeId, userId: targetUserId || null, status: "completed" },
      }).catch(() => {});
    }

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update termination status." });
  }
});

hrLifecycleRouter.delete("/terminations/:id", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.employeeExit.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete termination." });
  }
});

// =========================================================================
// 7. BUSINESS TRIPS & TRIP EXPENSES (HR-LC-07)
// =========================================================================
hrLifecycleRouter.get("/trips", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const trips = await (db.employeeTrip as any).findMany({
      where: { tenantId },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
        expenses: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { fromDate: "desc" },
    });
    return res.json(trips);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch business trips." });
  }
});

hrLifecycleRouter.get("/trips/:id", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const trip = await (db.employeeTrip as any).findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
        expenses: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!trip) return res.status(404).json({ error: "Trip not found." });
    return res.json(trip);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch trip." });
  }
});

hrLifecycleRouter.post("/trips", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const {
      employeeId,
      purpose,
      destination,
      description,
      expectedOutcomes,
      documentUrl,
      documentName,
      tripReport,
      fromDate,
      toDate,
      travelMode,
      advanceAmount,
      estimatedCost,
      status,
      advanceStatus,
      reimbursementStatus,
    } = req.body;

    if (!employeeId || !purpose || !destination || !fromDate || !toDate) {
      return res.status(400).json({ error: "Employee, purpose, destination, start date, and end date are required." });
    }

    const tripCode = `TRP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const trip = await (db.employeeTrip as any).create({
      data: {
        tenantId,
        employeeId,
        tripCode,
        purpose: purpose.trim(),
        destination: destination.trim(),
        description: description || null,
        expectedOutcomes: expectedOutcomes || null,
        documentUrl: documentUrl || null,
        documentName: documentName || null,
        tripReport: tripReport || null,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        travelMode: travelMode || "flight",
        advanceAmount: advanceAmount ? Number(advanceAmount) : 0,
        estimatedCost: estimatedCost ? Number(estimatedCost) : 0,
        status: (status || "planned").toLowerCase(),
        advanceStatus: (advanceStatus || "requested").toLowerCase(),
        reimbursementStatus: (reimbursementStatus || "pending").toLowerCase(),
        settlementStatus: (reimbursementStatus || "pending").toLowerCase(),
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
        expenses: true,
      },
    });

    return res.status(201).json(trip);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create business trip." });
  }
});

hrLifecycleRouter.put("/trips/:id", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const existing = await (db.employeeTrip as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Trip not found." });

    const {
      employeeId,
      purpose,
      destination,
      description,
      expectedOutcomes,
      documentUrl,
      documentName,
      tripReport,
      fromDate,
      toDate,
      travelMode,
      advanceAmount,
      estimatedCost,
      status,
      advanceStatus,
      reimbursementStatus,
    } = req.body;

    const updated = await (db.employeeTrip as any).update({
      where: { id },
      data: {
        ...(employeeId ? { employeeId } : {}),
        ...(purpose !== undefined ? { purpose } : {}),
        ...(destination !== undefined ? { destination } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(expectedOutcomes !== undefined ? { expectedOutcomes } : {}),
        ...(documentUrl !== undefined ? { documentUrl } : {}),
        ...(documentName !== undefined ? { documentName } : {}),
        ...(tripReport !== undefined ? { tripReport } : {}),
        ...(fromDate ? { fromDate: new Date(fromDate) } : {}),
        ...(toDate ? { toDate: new Date(toDate) } : {}),
        ...(travelMode !== undefined ? { travelMode } : {}),
        ...(advanceAmount !== undefined ? { advanceAmount: Number(advanceAmount) || 0 } : {}),
        ...(estimatedCost !== undefined ? { estimatedCost: Number(estimatedCost) || 0 } : {}),
        ...(status !== undefined ? { status: String(status).toLowerCase() } : {}),
        ...(advanceStatus !== undefined ? { advanceStatus: String(advanceStatus).toLowerCase() } : {}),
        ...(reimbursementStatus !== undefined
          ? {
              reimbursementStatus: String(reimbursementStatus).toLowerCase(),
              settlementStatus: String(reimbursementStatus).toLowerCase(),
            }
          : {}),
      },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
        expenses: true,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update trip." });
  }
});

hrLifecycleRouter.patch("/trips/:id/status", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status is required." });

    const existing = await (db.employeeTrip as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Trip not found." });

    const updated = await (db.employeeTrip as any).update({
      where: { id },
      data: { status: String(status).toLowerCase() },
      include: { employee: { select: EMPLOYEE_PROFILE_SELECT }, expenses: true },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update trip status." });
  }
});

hrLifecycleRouter.patch("/trips/:id/advance-status", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const { advanceStatus } = req.body;
    if (!advanceStatus) return res.status(400).json({ error: "Advance status is required." });

    const existing = await (db.employeeTrip as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Trip not found." });

    const updated = await (db.employeeTrip as any).update({
      where: { id },
      data: { advanceStatus: String(advanceStatus).toLowerCase() },
      include: { employee: { select: EMPLOYEE_PROFILE_SELECT }, expenses: true },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update advance status." });
  }
});

hrLifecycleRouter.patch("/trips/:id/reimbursement-status", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const { reimbursementStatus } = req.body;
    if (!reimbursementStatus) return res.status(400).json({ error: "Reimbursement status is required." });

    const existing = await (db.employeeTrip as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Trip not found." });

    const normalized = String(reimbursementStatus).toLowerCase();
    const updated = await (db.employeeTrip as any).update({
      where: { id },
      data: { reimbursementStatus: normalized, settlementStatus: normalized },
      include: { employee: { select: EMPLOYEE_PROFILE_SELECT }, expenses: true },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update reimbursement status." });
  }
});

hrLifecycleRouter.put("/trips/:id/approve", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const trip = await LifecycleService.approveTrip(tenantId, actorId, req.params.id, req.body.remarks);
    return res.json(trip);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to approve trip." });
  }
});

hrLifecycleRouter.delete("/trips/:id", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.employeeTrip.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete trip." });
  }
});

// Trip Expenses CRUD
hrLifecycleRouter.get("/trips/:id/expenses", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const trip = await (db.employeeTrip as any).findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        employee: { select: EMPLOYEE_PROFILE_SELECT },
        expenses: { orderBy: { receiptDate: "desc" } },
      },
    });
    if (!trip) return res.status(404).json({ error: "Trip not found." });
    return res.json(trip);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch trip expenses." });
  }
});

hrLifecycleRouter.post("/trips/:id/expenses", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const tripId = req.params.id;
    const trip = await (db.employeeTrip as any).findFirst({ where: { id: tripId, tenantId } });
    if (!trip) return res.status(404).json({ error: "Trip not found." });

    const { category, amount, currency, receiptUrl, receiptName, receiptDate, description, isReimbursable, status } = req.body;
    if (!category || !amount) {
      return res.status(400).json({ error: "Expense type and amount are required." });
    }

    const item = await (db.tripExpenseItem as any).create({
      data: {
        tenantId,
        tripId,
        category,
        amount: Number(amount),
        currency: currency || "USD",
        receiptUrl: receiptUrl || null,
        receiptName: receiptName || null,
        receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
        description: description || null,
        isReimbursable: isReimbursable !== undefined ? Boolean(isReimbursable) : true,
        status: (status || "pending").toLowerCase(),
      },
    });

    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to add trip expense." });
  }
});

hrLifecycleRouter.put("/trips/:id/expenses/:expenseId", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id: tripId, expenseId } = req.params;
    const existing = await (db.tripExpenseItem as any).findFirst({ where: { id: expenseId, tripId, tenantId } });
    if (!existing) return res.status(404).json({ error: "Expense item not found." });

    const { category, amount, currency, receiptUrl, receiptName, receiptDate, description, isReimbursable, status } = req.body;
    const updated = await (db.tripExpenseItem as any).update({
      where: { id: expenseId },
      data: {
        ...(category !== undefined ? { category } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(currency !== undefined ? { currency } : {}),
        ...(receiptUrl !== undefined ? { receiptUrl } : {}),
        ...(receiptName !== undefined ? { receiptName } : {}),
        ...(receiptDate !== undefined ? { receiptDate: receiptDate ? new Date(receiptDate) : null } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isReimbursable !== undefined ? { isReimbursable: Boolean(isReimbursable) } : {}),
        ...(status !== undefined ? { status: String(status).toLowerCase(), isApproved: String(status).toLowerCase() === "approved" } : {}),
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update trip expense." });
  }
});

hrLifecycleRouter.delete("/trips/:id/expenses/:expenseId", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.tripExpenseItem.deleteMany({
      where: { id: req.params.expenseId, tripId: req.params.id, tenantId },
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete trip expense." });
  }
});

// =========================================================================
// 8. COMPLAINTS & GRIEVANCES (HR-LC-08)
// Strictly restricted to HR & Compliance administrators
// =========================================================================
hrLifecycleRouter.get("/complaints", requireComplaintAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const [complaints, employees] = await Promise.all([
      (db.employeeComplaint as any).findMany({
        where: { tenantId },
        include: {
          caseNotes: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
      (db.employee as any).findMany({
        where: { tenantId },
        select: EMPLOYEE_PROFILE_SELECT,
      }),
    ]);

    const empMap = new Map(employees.map((e: any) => [e.id, e]));
    const enriched = complaints.map((c: any) => ({
      ...c,
      complainantEmployee: c.complainantId ? empMap.get(c.complainantId) || null : null,
      againstEmployee: c.accusedEmployeeId ? empMap.get(c.accusedEmployeeId) || null : null,
      assignedToEmployee: c.assignedInvestigatorId ? empMap.get(c.assignedInvestigatorId) || null : null,
    }));

    return res.json(enriched);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch complaints." });
  }
});

hrLifecycleRouter.post("/complaints", requireComplaintAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const {
      complainantId,
      accusedEmployeeId,
      category,
      severity,
      incidentDate,
      subject,
      description,
      evidenceUrl,
      documentName,
      isAnonymous,
      status,
    } = req.body;

    if (!subject || !description || !category) {
      return res.status(400).json({ error: "Complaint type, subject, and description are required." });
    }

    const ticketCode = `CMP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const complaint = await (db.employeeComplaint as any).create({
      data: {
        tenantId,
        ticketCode,
        complainantId: complainantId || null,
        accusedEmployeeId: accusedEmployeeId || null,
        category,
        severity: severity || "medium",
        incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
        subject: subject.trim(),
        description: description.trim(),
        evidenceUrl: evidenceUrl || null,
        documentName: documentName || null,
        isAnonymous: Boolean(isAnonymous),
        status: (status || "submitted").toLowerCase(),
      },
    });
    return res.status(201).json(complaint);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to record complaint." });
  }
});

hrLifecycleRouter.put("/complaints/:id", requireComplaintAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const existing = await (db.employeeComplaint as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Complaint not found." });

    const {
      complainantId,
      accusedEmployeeId,
      category,
      severity,
      incidentDate,
      subject,
      description,
      evidenceUrl,
      documentName,
      isAnonymous,
      status,
      assignedInvestigatorId,
      resolutionDeadline,
      resolutionType,
      resolutionNotes,
      actionTaken,
      resolvedAt,
      followUpAction,
      followUpDate,
      feedback,
    } = req.body;

    const updated = await (db.employeeComplaint as any).update({
      where: { id },
      data: {
        ...(complainantId !== undefined ? { complainantId: complainantId || null } : {}),
        ...(accusedEmployeeId !== undefined ? { accusedEmployeeId: accusedEmployeeId || null } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(severity !== undefined ? { severity } : {}),
        ...(incidentDate !== undefined ? { incidentDate: incidentDate ? new Date(incidentDate) : null } : {}),
        ...(subject !== undefined ? { subject } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(evidenceUrl !== undefined ? { evidenceUrl: evidenceUrl || null } : {}),
        ...(documentName !== undefined ? { documentName: documentName || null } : {}),
        ...(isAnonymous !== undefined ? { isAnonymous: Boolean(isAnonymous) } : {}),
        ...(status !== undefined ? { status: String(status).toLowerCase() } : {}),
        ...(assignedInvestigatorId !== undefined ? { assignedInvestigatorId: assignedInvestigatorId || null } : {}),
        ...(resolutionDeadline !== undefined ? { resolutionDeadline: resolutionDeadline ? new Date(resolutionDeadline) : null } : {}),
        ...(resolutionType !== undefined ? { resolutionType: resolutionType || null } : {}),
        ...(resolutionNotes !== undefined ? { resolutionNotes: resolutionNotes || null } : {}),
        ...(actionTaken !== undefined ? { actionTaken: actionTaken || null } : {}),
        ...(resolvedAt !== undefined ? { resolvedAt: resolvedAt ? new Date(resolvedAt) : null } : {}),
        ...(followUpAction !== undefined ? { followUpAction: followUpAction || null } : {}),
        ...(followUpDate !== undefined ? { followUpDate: followUpDate ? new Date(followUpDate) : null } : {}),
        ...(feedback !== undefined ? { feedback: feedback || null } : {}),
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update complaint." });
  }
});

hrLifecycleRouter.patch("/complaints/:id/status", requireComplaintAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status is required." });

    const existing = await (db.employeeComplaint as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Complaint not found." });

    const updated = await (db.employeeComplaint as any).update({
      where: { id },
      data: { status: String(status).toLowerCase() },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update complaint status." });
  }
});

hrLifecycleRouter.patch("/complaints/:id/assign", requireComplaintAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const { assignedInvestigatorId, resolutionDeadline } = req.body;
    if (!assignedInvestigatorId) return res.status(400).json({ error: "Assignee is required." });

    const existing = await (db.employeeComplaint as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Complaint not found." });

    const updated = await (db.employeeComplaint as any).update({
      where: { id },
      data: {
        assignedInvestigatorId,
        ...(resolutionDeadline !== undefined
          ? { resolutionDeadline: resolutionDeadline ? new Date(resolutionDeadline) : null }
          : {}),
        status: existing.status === "submitted" || existing.status === "new" ? "under_investigation" : existing.status,
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to assign complaint." });
  }
});

hrLifecycleRouter.put("/complaints/:id/resolve", requireComplaintAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const { resolutionType, resolutionNotes, actionTaken, resolvedAt, followUpAction, followUpDate } = req.body;

    const existing = await (db.employeeComplaint as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Complaint not found." });

    const updated = await (db.employeeComplaint as any).update({
      where: { id },
      data: {
        status: "resolved",
        resolutionType: resolutionType || existing.resolutionType || null,
        resolutionNotes: resolutionNotes ?? existing.resolutionNotes,
        actionTaken: actionTaken ?? existing.actionTaken,
        resolvedAt: resolvedAt ? new Date(resolvedAt) : new Date(),
        ...(followUpAction !== undefined ? { followUpAction: followUpAction || null } : {}),
        ...(followUpDate !== undefined ? { followUpDate: followUpDate ? new Date(followUpDate) : null } : {}),
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to resolve complaint." });
  }
});

hrLifecycleRouter.patch("/complaints/:id/follow-up", requireComplaintAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { id } = req.params;
    const { followUpAction, followUpDate, feedback } = req.body;

    const existing = await (db.employeeComplaint as any).findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Complaint not found." });

    const updated = await (db.employeeComplaint as any).update({
      where: { id },
      data: {
        followUpAction: followUpAction ?? existing.followUpAction,
        followUpDate: followUpDate ? new Date(followUpDate) : existing.followUpDate,
        feedback: feedback !== undefined ? feedback : existing.feedback,
      },
    });

    // If follow-up date is today and we are already in office hours (>= 09:00 AM), notify immediately
    if (updated.followUpDate && new Date().getHours() >= 9) {
      dispatchComplaintFollowUpNotificationIfDueToday(updated).catch(() => {});
    }

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update follow-up information." });
  }
});

hrLifecycleRouter.delete("/complaints/:id", requireComplaintAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.employeeComplaint.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete complaint." });
  }
});

hrLifecycleRouter.post("/complaints/:id/notes", requireComplaintAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const authorId = req.user?.userId || "system";
    const db = getTenantDb();
    const { noteText, isConfidential } = req.body;
    if (!noteText) {
      return res.status(400).json({ error: "Note text is required." });
    }
    const caseNote = await db.complaintCaseNote.create({
      data: {
        tenantId,
        complaintId: req.params.id,
        authorId,
        noteText,
        isConfidential: isConfidential ?? true,
      },
    });
    return res.status(201).json(caseNote);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to add case note." });
  }
});

// =========================================================================
// 9. EXITS & CLEARANCE (HR-LC-09)
// =========================================================================
hrLifecycleRouter.get("/exits", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const exits = await db.employeeExit.findMany({
      where: { tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
        checklists: true,
      },
      orderBy: { lastWorkingDay: "desc" },
    });
    return res.json(exits);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch exit cases." });
  }
});

hrLifecycleRouter.put("/exits/:id/checklist/:itemId", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { isCompleted } = req.body;
    const actorName = req.user?.email || "HR Admin";

    const item = await db.exitChecklistItem.update({
      where: { id: req.params.itemId },
      data: {
        isCompleted: !!isCompleted,
        completedBy: isCompleted ? actorName : null,
        completedAt: isCompleted ? new Date() : null,
      },
    });
    return res.json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update checklist item." });
  }
});

hrLifecycleRouter.put("/exits/:id/finalize", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const exit = await LifecycleService.finalizeExit(tenantId, actorId, req.params.id);
    return res.json(exit);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to finalize employee exit." });
  }
});

// =========================================================================
// 10. PROBATION MANAGEMENT (HR-LC-10)
// =========================================================================
hrLifecycleRouter.get("/probation/overview", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const overview = await ProbationService.getProbationOverview(tenantId);
    return res.json(overview);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch probation overview." });
  }
});

hrLifecycleRouter.get("/probation", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const now = new Date();
    const probations = await db.probationRecord.findMany({
      where: { tenantId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            position: true,
            department: { select: { id: true, name: true } },
            manager: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { endDate: "asc" },
    });

    const evaluated = probations.map((p) => {
      const cls = ProbationService.classifyProbation(p, now);
      return {
        ...p,
        classification: cls.classification,
        daysRemaining: cls.daysRemaining,
        isOverdue: cls.isOverdue,
        isDueSoon: cls.isDueSoon,
        stage: cls.stage,
      };
    });

    return res.json(evaluated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch probation records." });
  }
});

// Handler for probation extension
async function handleExtendProbation(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const { extensionDays, remarks } = req.body;
    const updated = await LifecycleService.extendProbation(
      tenantId,
      actorId,
      req.params.id,
      parseInt(extensionDays, 10),
      remarks
    );
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to extend probation." });
  }
}

hrLifecycleRouter.put("/probation/:id/extend", requireHrAdmin, handleExtendProbation);
hrLifecycleRouter.post("/probation/:id/extend", requireHrAdmin, handleExtendProbation);

// Handler for probation confirmation (with automated letter generation)
async function handleConfirmProbation(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const { performanceRating, remarks } = req.body;
    const result = await ProbationService.confirmProbationWithLetter({
      tenantId,
      actorUserId: actorId,
      probationId: req.params.id,
      performanceRating,
      remarks,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to confirm probation." });
  }
}

hrLifecycleRouter.put("/probation/:id/confirm", requireHrAdmin, handleConfirmProbation);
hrLifecycleRouter.post("/probation/:id/confirm", requireHrAdmin, handleConfirmProbation);

// Manager Review Submission
hrLifecycleRouter.post("/probation/:id/manager-review", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const updated = await ProbationService.submitManagerReview({
      tenantId,
      actorUserId: actorId,
      probationId: req.params.id,
      review: req.body,
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to submit manager review." });
  }
});

// =========================================================================
// 11. TIMELINE & EVENT STORE QUERY (P6-BR-019)
// =========================================================================
hrLifecycleRouter.get("/timeline/:employeeId", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const events = await LifecycleService.getTimeline(tenantId, req.params.employeeId);
    return res.json(events);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load employee timeline." });
  }
});

// =========================================================================
// 12. GLOBAL LIFECYCLE BULK OPERATIONS
// =========================================================================
hrLifecycleRouter.post("/bulk-delete", requireHrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const { entity, ids } = req.body;
    if (!entity || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "entity and array of ids are required." });
    }

    const validIds = ids.filter((id: any) => typeof id === "string" && id.trim().length > 0);
    if (validIds.length === 0) {
      return res.status(400).json({ error: "Valid string IDs array required" });
    }

    const db = getTenantDb();
    const actorId = req.user?.userId || "system";
    let deletedCount = 0;
    let failedCount = 0;
    const failures: { id: string; reason: string }[] = [];

    switch (entity) {
      case "awards": {
        const records = await db.award.findMany({
          where: { tenantId, id: { in: validIds } },
        });
        const foundMap = new Map(records.map((r: any) => [r.id, r]));
        for (const id of validIds) {
          const existing = foundMap.get(id);
          if (!existing) {
            failedCount++;
            failures.push({ id, reason: "Record not found or belongs to another tenant" });
            continue;
          }
          await db.$transaction(async (tx: any) => {
            await tx.award.delete({ where: { id } });
            await AuditService.logMutation(
              {
                tenantId,
                actorId,
                action: "AWARD_BULK_DELETE",
                entityType: "Award",
                entityId: id,
                oldState: existing,
              },
              tx
            );
          });
          deletedCount++;
        }
        break;
      }
      case "warnings": {
        const records = await db.disciplinaryWarning.findMany({
          where: { tenantId, id: { in: validIds } },
        });
        const foundMap = new Map(records.map((r: any) => [r.id, r]));
        for (const id of validIds) {
          const existing = foundMap.get(id);
          if (!existing) {
            failedCount++;
            failures.push({ id, reason: "Record not found or belongs to another tenant" });
            continue;
          }
          await db.$transaction(async (tx: any) => {
            await tx.disciplinaryWarning.delete({ where: { id } });
            await AuditService.logMutation(
              {
                tenantId,
                actorId,
                action: "WARNING_BULK_DELETE",
                entityType: "DisciplinaryWarning",
                entityId: id,
                oldState: existing,
              },
              tx
            );
          });
          deletedCount++;
        }
        break;
      }
      case "promotions": {
        const records = await db.promotionRecord.findMany({
          where: { tenantId, id: { in: validIds } },
        });
        const foundMap = new Map(records.map((r: any) => [r.id, r]));
        for (const id of validIds) {
          const existing = foundMap.get(id);
          if (!existing) {
            failedCount++;
            failures.push({ id, reason: "Record not found or belongs to another tenant" });
            continue;
          }
          await db.$transaction(async (tx: any) => {
            await tx.promotionRecord.delete({ where: { id } });
            await AuditService.logMutation(
              {
                tenantId,
                actorId,
                action: "PROMOTION_BULK_DELETE",
                entityType: "PromotionRecord",
                entityId: id,
                oldState: existing,
              },
              tx
            );
          });
          deletedCount++;
        }
        break;
      }
      case "transfers": {
        const records = await db.employeeTransfer.findMany({
          where: { tenantId, id: { in: validIds } },
        });
        const foundMap = new Map(records.map((r: any) => [r.id, r]));
        for (const id of validIds) {
          const existing = foundMap.get(id);
          if (!existing) {
            failedCount++;
            failures.push({ id, reason: "Record not found or belongs to another tenant" });
            continue;
          }
          if (existing.status === "COMPLETED") {
            failedCount++;
            failures.push({ id, reason: "Cannot delete completed employee transfer record to preserve historical career records." });
            continue;
          }
          await db.$transaction(async (tx: any) => {
            await tx.employeeTransfer.delete({ where: { id } });
            await AuditService.logMutation(
              {
                tenantId,
                actorId,
                action: "TRANSFER_BULK_DELETE",
                entityType: "EmployeeTransfer",
                entityId: id,
                oldState: existing,
              },
              tx
            );
          });
          deletedCount++;
        }
        break;
      }
      case "resignations":
      case "terminations":
      case "exits": {
        const records = await db.employeeExit.findMany({
          where: { tenantId, id: { in: validIds } },
        });
        const foundMap = new Map(records.map((r: any) => [r.id, r]));
        for (const id of validIds) {
          const existing = foundMap.get(id);
          if (!existing) {
            failedCount++;
            failures.push({ id, reason: "Record not found or belongs to another tenant" });
            continue;
          }
          // Protect settled or finalized exits
          if (
            existing.fnfSettlementStatus === "completed" ||
            existing.fnfSettlementStatus === "settled" ||
            existing.relievingLetterCode
          ) {
            failedCount++;
            failures.push({ id, reason: "Cannot delete settled or finalized exit record with full & final clearance." });
            continue;
          }
          await db.$transaction(async (tx: any) => {
            await tx.exitChecklistItem.deleteMany({
              where: { exitId: id },
            });
            await tx.employeeExit.delete({
              where: { id },
            });
            await AuditService.logMutation(
              {
                tenantId,
                actorId,
                action: "EXIT_BULK_DELETE",
                entityType: "EmployeeExit",
                entityId: id,
                oldState: existing,
              },
              tx
            );
          });
          deletedCount++;
        }
        break;
      }
      case "trips": {
        const records = await db.employeeTrip.findMany({
          where: { tenantId, id: { in: validIds } },
        });
        const foundMap = new Map(records.map((r: any) => [r.id, r]));
        for (const id of validIds) {
          const existing = foundMap.get(id);
          if (!existing) {
            failedCount++;
            failures.push({ id, reason: "Record not found or belongs to another tenant" });
            continue;
          }
          // Protect settled or reimbursed travel expense claims
          if (
            existing.settlementStatus === "settled" ||
            existing.settlementStatus === "reimbursed"
          ) {
            failedCount++;
            failures.push({ id, reason: "Cannot delete settled travel expense record." });
            continue;
          }
          await db.$transaction(async (tx: any) => {
            await tx.tripExpenseItem.deleteMany({
              where: { tripId: id },
            });
            await tx.employeeTrip.delete({
              where: { id },
            });
            await AuditService.logMutation(
              {
                tenantId,
                actorId,
                action: "TRIP_BULK_DELETE",
                entityType: "EmployeeTrip",
                entityId: id,
                oldState: existing,
              },
              tx
            );
          });
          deletedCount++;
        }
        break;
      }
      case "complaints": {
        const records = await db.employeeComplaint.findMany({
          where: { tenantId, id: { in: validIds } },
        });
        const foundMap = new Map(records.map((r: any) => [r.id, r]));
        for (const id of validIds) {
          const existing = foundMap.get(id);
          if (!existing) {
            failedCount++;
            failures.push({ id, reason: "Record not found or belongs to another tenant" });
            continue;
          }
          await db.$transaction(async (tx: any) => {
            await tx.complaintCaseNote.deleteMany({
              where: { complaintId: id },
            });
            await tx.employeeComplaint.delete({
              where: { id },
            });
            await AuditService.logMutation(
              {
                tenantId,
                actorId,
                action: "COMPLAINT_BULK_DELETE",
                entityType: "EmployeeComplaint",
                entityId: id,
                oldState: existing,
              },
              tx
            );
          });
          deletedCount++;
        }
        break;
      }
      default:
        return res.status(400).json({ error: `Unsupported entity type: ${entity}` });
    }

    return res.json({
      success: true,
      message: `Processed ${validIds.length} record(s). ${deletedCount} deleted, ${failedCount} failed.`,
      deletedCount,
      failedCount,
      failures,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to execute bulk deletion." });
  }
});

