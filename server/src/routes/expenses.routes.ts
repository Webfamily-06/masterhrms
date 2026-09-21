import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { autoPostExpenseToLedger } from "../services/ledger-posting.service";

export const expensesRouter = Router();

// Default seed categories for new tenants
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Travel & Mileage", code: "TRV", monthlyLimit: 50000, requiresReceipt: true, icon: "Plane" },
  { name: "Client Meals & Food", code: "MEL", monthlyLimit: 20000, requiresReceipt: true, icon: "Coffee" },
  { name: "IT Hardware & Equipment", code: "EQP", monthlyLimit: 100000, requiresReceipt: true, icon: "Laptop" },
  { name: "Software Subscriptions", code: "SFT", monthlyLimit: 35000, requiresReceipt: true, icon: "Layers" },
  { name: "Medical Reimbursement", code: "MED", monthlyLimit: 25000, requiresReceipt: true, icon: "Plus" },
  { name: "General Office Supplies", code: "GEN", monthlyLimit: 15000, requiresReceipt: false, icon: "Receipt" },
];

/**
 * Auto-seed default expense categories if tenant has none
 */
async function ensureSeedCategories(tenantId: string) {
  const count = await prisma.expenseCategory.count({ where: { tenantId } });
  if (count === 0) {
    for (const c of DEFAULT_EXPENSE_CATEGORIES) {
      await prisma.expenseCategory.create({
        data: {
          tenantId,
          name: c.name,
          code: c.code,
          monthlyLimit: c.monthlyLimit,
          requiresReceipt: c.requiresReceipt,
          icon: c.icon,
        },
      });
    }
  }
}

// GET /api/expenses/categories (List expense categories)
expensesRouter.get("/categories", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    await ensureSeedCategories(tenantId);

    const categories = await prisma.expenseCategory.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { claims: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.json(categories);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list expense categories." });
  }
});

// POST /api/expenses/categories (Create category)
expensesRouter.post("/categories", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { name, code, monthlyLimit, requiresReceipt, icon } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: "Category name and code are required." });
    }

    const category = await prisma.expenseCategory.create({
      data: {
        tenantId,
        name,
        code: String(code).toUpperCase().trim(),
        monthlyLimit: monthlyLimit ? Number(monthlyLimit) : null,
        requiresReceipt: requiresReceipt !== undefined ? Boolean(requiresReceipt) : true,
        icon: icon || "Receipt",
      },
    });

    return res.status(201).json(category);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create category." });
  }
});

// PUT /api/expenses/categories/:id (Update category)
expensesRouter.put("/categories/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.expenseCategory.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Category not found." });
    }

    const { name, code, monthlyLimit, requiresReceipt, icon } = req.body;

    const updated = await prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code: String(code).toUpperCase().trim() }),
        ...(monthlyLimit !== undefined && { monthlyLimit: monthlyLimit ? Number(monthlyLimit) : null }),
        ...(requiresReceipt !== undefined && { requiresReceipt: Boolean(requiresReceipt) }),
        ...(icon && { icon }),
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update category." });
  }
});

// DELETE /api/expenses/categories/:id (Delete category)
expensesRouter.delete("/categories/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.expenseCategory.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Category not found." });
    }

    const claimsCount = await prisma.expenseClaim.count({ where: { categoryId: id } });
    if (claimsCount > 0) {
      return res.status(400).json({ error: `Cannot delete: Category has ${claimsCount} claims filed under it.` });
    }

    await prisma.expenseCategory.delete({ where: { id } });
    return res.json({ success: true, message: "Category deleted." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete category." });
  }
});

// GET /api/expenses/claims (List expense claims with filters)
expensesRouter.get("/claims", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { status, categoryId, employeeId, search } = req.query;

    const where: any = { tenantId };
    if (status && status !== "all") {
      where.status = String(status);
    }
    if (categoryId && categoryId !== "all") {
      where.categoryId = String(categoryId);
    }
    if (employeeId && employeeId !== "all") {
      where.employeeId = String(employeeId);
    }
    if (search) {
      where.OR = [
        { claimCode: { contains: String(search) } },
        { title: { contains: String(search) } },
        { merchant: { contains: String(search) } },
        { employee: { firstName: { contains: String(search) } } },
        { employee: { lastName: { contains: String(search) } } },
      ];
    }

    const claims = await prisma.expenseClaim.findMany({
      where,
      include: {
        employee: {
          include: { department: true },
        },
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(claims);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list expense claims." });
  }
});

// POST /api/expenses/claims (Submit expense claim)
expensesRouter.post("/claims", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const {
      employeeId,
      categoryId,
      title,
      amount,
      expenseDate,
      merchant,
      description,
      receiptUrl,
      receiptName,
    } = req.body;

    if (!employeeId || !categoryId || !title || !amount || !merchant) {
      return res.status(400).json({ error: "Employee, category, title, amount, and merchant are required." });
    }

    // Generate unique claim code (e.g. EXP-8429)
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const claimCode = `EXP-${randomCode}`;

    const claim = await prisma.expenseClaim.create({
      data: {
        tenantId,
        employeeId,
        categoryId,
        claimCode,
        title,
        amount: Number(amount),
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        merchant,
        description: description || null,
        receiptUrl: receiptUrl || null,
        receiptName: receiptName || null,
        status: "pending",
      },
      include: {
        employee: { include: { department: true } },
        category: true,
      },
    });

    return res.status(201).json(claim);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to submit expense claim." });
  }
});

// PUT /api/expenses/claims/:id/status (Approval action: manager_approved, finance_approved, rejected)
expensesRouter.put("/claims/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, approverNotes } = req.body;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.expenseClaim.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Expense claim not found." });
    }

    const validStatuses = ["pending", "manager_approved", "finance_approved", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const updated = await prisma.expenseClaim.update({
      where: { id },
      data: {
        status,
        approverNotes: approverNotes || null,
        approvedAt: ["manager_approved", "finance_approved"].includes(status) ? new Date() : null,
      },
      include: {
        employee: { include: { department: true } },
        category: true,
      },
    });

    return res.json({
      success: true,
      message: `Expense claim ${existing.claimCode} marked as ${status.replace("_", " ")}!`,
      claim: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update claim status." });
  }
});

// POST /api/expenses/claims/:id/reimburse (Execute reimbursement / Link to Payroll)
expensesRouter.post("/claims/:id/reimburse", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reimbursementMethod, payrollMonth, approverNotes } = req.body;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.expenseClaim.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Expense claim not found." });
    }

    const updated = await prisma.expenseClaim.update({
      where: { id },
      data: {
        status: "reimbursed",
        reimbursementMethod: reimbursementMethod || "payroll_addition",
        payrollMonth: payrollMonth || new Date().toISOString().slice(0, 7),
        reimbursedAt: new Date(),
        approverNotes: approverNotes || existing.approverNotes,
      },
      include: {
        employee: { include: { department: true } },
        category: true,
      },
    });

    // ⚡ Auto-post to Double-Entry General Ledger
    autoPostExpenseToLedger({
      tenantId: existing.tenantId,
      claimId: existing.id,
      title: `${existing.claimCode} - ${existing.title}`,
      amount: Number(existing.amount),
      paymentMode: reimbursementMethod || "Cash",
    }).catch((e) => console.error("Auto-post expense to ledger error:", e));

    return res.json({
      success: true,
      message: `Expense claim ${existing.claimCode} marked as Reimbursed (${updated.reimbursementMethod?.replace("_", " ")})!`,
      claim: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to reimburse claim." });
  }
});

// DELETE /api/expenses/claims/:id (Delete claim)
expensesRouter.delete("/claims/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.expenseClaim.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Expense claim not found." });
    }

    if (existing.status === "reimbursed") {
      return res.status(400).json({ error: "Cannot delete a reimbursed claim." });
    }

    await prisma.expenseClaim.delete({ where: { id } });
    return res.json({ success: true, message: "Expense claim deleted." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete expense claim." });
  }
});

// GET /api/expenses/summary (Aggregate spending analytics)
expensesRouter.get("/summary", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const allClaims = await prisma.expenseClaim.findMany({
      where: { tenantId },
      include: { category: true },
    });

    let pendingAmount = 0;
    let approvedAmount = 0;
    let reimbursedAmount = 0;

    const categorySpend: Record<string, number> = {};

    for (const c of allClaims) {
      const amt = Number(c.amount) || 0;
      if (c.status === "pending") pendingAmount += amt;
      else if (["manager_approved", "finance_approved"].includes(c.status)) approvedAmount += amt;
      else if (c.status === "reimbursed") reimbursedAmount += amt;

      const catName = c.category?.name || "General";
      categorySpend[catName] = (categorySpend[catName] || 0) + amt;
    }

    return res.json({
      totalClaims: allClaims.length,
      pendingAmount,
      approvedAmount,
      reimbursedAmount,
      categorySpend,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate expense summary." });
  }
});
