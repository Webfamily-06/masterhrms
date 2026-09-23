import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const offboardingRouter = Router();

const DEFAULT_CHECKLIST_TEMPLATE = [
  { department: "IT", title: "Recover company laptop, monitors, and security keys" },
  { department: "IT", title: "Revoke Google Workspace, GitHub, VPN, and SSO credentials" },
  { department: "Finance", title: "Audit pending expense reimbursements and travel advances" },
  { department: "Finance", title: "Calculate final earned salary, leave encashment, and statutory gratuity" },
  { department: "HR", title: "Conduct formal confidential exit interview & record handover notes" },
  { department: "Admin", title: "Collect physical office badge, parking pass, and cabinet keys" },
];

// GET /api/offboarding/exits (List all employee exit records)
offboardingRouter.get("/exits", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { status, departmentId, search } = req.query;

    const where: any = { tenantId };
    if (status && status !== "all") {
      where.status = String(status);
    }
    if (departmentId && departmentId !== "all") {
      where.employee = { departmentId: String(departmentId) };
    }
    if (search) {
      where.OR = [
        { exitCode: { contains: String(search) } },
        { relievingLetterCode: { contains: String(search) } },
        { reason: { contains: String(search) } },
        { employee: { firstName: { contains: String(search) } } },
        { employee: { lastName: { contains: String(search) } } },
      ];
    }

    const exits = await prisma.employeeExit.findMany({
      where,
      include: {
        employee: {
          include: { department: true },
        },
        checklists: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(exits);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list offboarding records." });
  }
});

// POST /api/offboarding/exits (Initiate Employee Exit)
offboardingRouter.post("/exits", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const {
      employeeId,
      resignationDate,
      lastWorkingDay,
      reason,
      exitType,
      noticePeriodDays,
      fnfSettlementAmount,
    } = req.body;

    if (!employeeId || !reason) {
      return res.status(400).json({ error: "Employee and exit reason are required." });
    }

    const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp || (tenantId && emp.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Employee not found." });
    }

    // Auto-generate exit code (e.g. EXIT-8491)
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const exitCode = `EXIT-${randomCode}`;

    const resDate = resignationDate ? new Date(resignationDate) : new Date();
    const lwdDate = lastWorkingDay ? new Date(lastWorkingDay) : new Date(Date.now() + 60 * 24 * 3600 * 1000);

    const exit = await prisma.employeeExit.create({
      data: {
        tenantId,
        employeeId,
        exitCode,
        resignationDate: resDate,
        lastWorkingDay: lwdDate,
        reason,
        exitType: exitType || "resignation",
        noticePeriodDays: noticePeriodDays ? Number(noticePeriodDays) : 60,
        fnfSettlementAmount: fnfSettlementAmount ? Number(fnfSettlementAmount) : 0,
        status: "serving_notice",
        checklists: {
          create: DEFAULT_CHECKLIST_TEMPLATE.map((item) => ({
            department: item.department,
            title: item.title,
            isCompleted: false,
          })),
        },
      },
      include: {
        employee: { include: { department: true } },
        checklists: true,
      },
    });

    return res.status(201).json(exit);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to initiate offboarding." });
  }
});

// GET /api/offboarding/exits/:id (Exit details + checklist)
offboardingRouter.get("/exits/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const exit = await prisma.employeeExit.findUnique({
      where: { id },
      include: {
        employee: { include: { department: true } },
        checklists: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!exit || (tenantId && exit.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Exit record not found." });
    }

    return res.json(exit);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch exit details." });
  }
});

// PUT /api/offboarding/exits/:id/clearance (Update Department Clearance)
offboardingRouter.put("/exits/:id/clearance", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { department, isCleared, notes } = req.body; // department: "IT" | "Finance" | "HR" | "Admin"
    const tenantId = req.user?.tenantId;

    const existing = await prisma.employeeExit.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Exit record not found." });
    }

    const dataToUpdate: any = {};
    const now = isCleared ? new Date() : null;

    if (department === "IT") {
      if (isCleared) {
        const unreturnedAssets = await prisma.asset.findMany({
          where: {
            tenantId: existing.tenantId,
            assignedEmployeeId: existing.employeeId,
            status: "assigned",
          },
        });

        if (unreturnedAssets.length > 0) {
          return res.status(400).json({
            error: `IT Clearance blocked: Employee currently holds ${unreturnedAssets.length} unreturned company asset(s) [${unreturnedAssets.map((a: any) => `${a.name} (${a.assetTag})`).join(", ")}]. Mark assets returned before approving IT clearance.`,
          });
        }
      }

      dataToUpdate.itClearance = Boolean(isCleared);
      dataToUpdate.itNotes = notes || existing.itNotes;
      dataToUpdate.itClearedAt = now;
    } else if (department === "Finance") {
      dataToUpdate.financeClearance = Boolean(isCleared);
      dataToUpdate.financeNotes = notes || existing.financeNotes;
      dataToUpdate.financeClearedAt = now;
    } else if (department === "HR") {
      dataToUpdate.hrClearance = Boolean(isCleared);
      dataToUpdate.hrNotes = notes || existing.hrNotes;
      dataToUpdate.hrClearedAt = now;
    } else if (department === "Admin") {
      dataToUpdate.adminClearance = Boolean(isCleared);
      dataToUpdate.adminNotes = notes || existing.adminNotes;
      dataToUpdate.adminClearedAt = now;
    }

    // Check if all clearances are complete
    const finalIT = department === "IT" ? isCleared : existing.itClearance;
    const finalFinance = department === "Finance" ? isCleared : existing.financeClearance;
    const finalHR = department === "HR" ? isCleared : existing.hrClearance;
    const finalAdmin = department === "Admin" ? isCleared : existing.adminClearance;

    if (finalIT && finalFinance && finalHR && finalAdmin && existing.status === "serving_notice") {
      dataToUpdate.status = "clearance_pending";
    }

    const updated = await prisma.employeeExit.update({
      where: { id },
      data: dataToUpdate,
      include: {
        employee: { include: { department: true } },
        checklists: true,
      },
    });

    return res.json({
      success: true,
      message: `${department} clearance ${isCleared ? "approved" : "revoked"}!`,
      exit: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update clearance." });
  }
});

// PUT /api/offboarding/exits/:id/checklist/:itemId (Toggle Checklist Item)
offboardingRouter.put("/exits/:id/checklist/:itemId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const { isCompleted } = req.body;
    const userName = req.user?.email || "Manager";

    const updated = await prisma.exitChecklistItem.update({
      where: { id: itemId },
      data: {
        isCompleted: Boolean(isCompleted),
        completedBy: isCompleted ? userName : null,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update checklist item." });
  }
});

// POST /api/offboarding/exits/:id/settle-fnf (1-Click Full & Final Settlement & Relieving)
offboardingRouter.post("/exits/:id/settle-fnf", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fnfSettlementAmount, exitInterviewNotes } = req.body;
    const tenantId = req.user?.tenantId;

    const exit = await prisma.employeeExit.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!exit || (tenantId && exit.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Exit record not found." });
    }

    // Auto-generate Relieving Letter Code (e.g. REL-7482)
    const randomRelCode = Math.floor(1000 + Math.random() * 9000);
    const relievingLetterCode = exit.relievingLetterCode || `REL-${randomRelCode}`;

    // Execute atomic transaction: Update exit status, mark FnF paid, and set employee status to resigned
    const result = await prisma.$transaction(async (tx: any) => {
      const updatedExit = await tx.employeeExit.update({
        where: { id },
        data: {
          status: "completed",
          fnfSettlementAmount: fnfSettlementAmount ? Number(fnfSettlementAmount) : exit.fnfSettlementAmount,
          fnfSettlementStatus: "paid",
          fnfSettledAt: new Date(),
          relievingLetterCode,
          exitInterviewNotes: exitInterviewNotes || exit.exitInterviewNotes,
          itClearance: true,
          financeClearance: true,
          hrClearance: true,
          adminClearance: true,
        },
        include: {
          employee: { include: { department: true } },
          checklists: true,
        },
      });

      // Update Employee Status to Inactive / Terminated
      await tx.employee.update({
        where: { id: exit.employeeId },
        data: {
          status: "terminated",
        },
      });

      return updatedExit;
    });

    return res.json({
      success: true,
      message: `Full & Final settlement of ₹${result.fnfSettlementAmount} completed for ${result.employee.firstName}! Relieving Letter code ${result.relievingLetterCode} generated.`,
      exit: result,
    });
  } catch (err: any) {
    console.error("[settle-fnf] error:", err);
    return res.status(500).json({ error: err.message || "Failed to settle FnF." });
  }
});

// DELETE /api/offboarding/exits/:id (Delete exit case)
offboardingRouter.delete("/exits/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.employeeExit.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Exit record not found." });
    }

    if (existing.status === "completed") {
      return res.status(400).json({ error: "Cannot delete an already completed and relieved exit record." });
    }

    await prisma.employeeExit.delete({ where: { id } });
    return res.json({ success: true, message: "Exit record deleted." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete exit record." });
  }
});

// GET /api/offboarding/summary (Aggregate exit metrics)
offboardingRouter.get("/summary", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const allExits: any[] = await prisma.employeeExit.findMany({ where: { tenantId } });

    const servingNoticeCount = allExits.filter((e: any) => e.status === "serving_notice").length;
    const clearancePendingCount = allExits.filter((e: any) => e.status === "clearance_pending").length;
    const completedCount = allExits.filter((e: any) => e.status === "completed").length;

    let totalFnfAmount = 0;
    for (const e of allExits) {
      totalFnfAmount += Number(e.fnfSettlementAmount) || 0;
    }

    return res.json({
      totalExits: allExits.length,
      servingNoticeCount,
      clearancePendingCount,
      completedCount,
      totalFnfAmount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate offboarding summary." });
  }
});
