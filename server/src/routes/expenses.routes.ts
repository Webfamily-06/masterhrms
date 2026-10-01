import { Router, Response } from "express";
import multer from "multer";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { autoPostExpenseToLedger } from "../services/ledger-posting.service";
import { storageService } from "../services/storage/local-encrypted-storage.service";
import { validateFileBuffer, MAX_UPLOAD_SIZE_BYTES } from "../services/storage/file-validator";
import { tesseractOcrService } from "../services/ocr/tesseract-ocr.service";
import { ReimbursementApprovalService } from "../services/reimbursement-approval.service";

export const expensesRouter = Router();
const approvalService = new ReimbursementApprovalService(prisma as any);

// Configure disk-backed streaming memory buffer with strict 10MB early rejection
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES, // 10 Megabytes
  },
});

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

/**
 * POST /api/expenses/claims/upload-receipt
 * Multipart upload endpoint:
 * 1. Checks 10MB limit and validates binary magic bytes (PDF, PNG, JPEG)
 * 2. Encrypts payload with AES-256-GCM and stores in tenant directory
 * 3. Persists StoredDocument with SHA-256 hash
 * 4. Runs self-hosted Tesseract OCR (Advisory)
 * 5. Checks for duplicate receipt hashes within last 60 days
 */
expensesRouter.post(
  "/claims/upload-receipt",
  requireAuth,
  upload.single("receipt"),
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No receipt file provided in multipart payload." });
      }

      // 1. Binary Magic Bytes & Size Validation
      const val = validateFileBuffer(file.buffer, file.originalname, file.mimetype);
      if (!val.isValid) {
        return res.status(400).json({ error: val.error });
      }

      // 2. Encrypt and save to tenant-isolated disk storage
      const stored = await storageService.save(
        tenantId,
        {
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: val.detectedMime!,
          sizeBytes: file.size,
        },
        "expense_receipt",
        undefined,
        (req.user as any)?.userId || (req.user as any)?.id
      );

      // 3. Advisory OCR extraction (Local self-hosted)
      const ocrResult = await tesseractOcrService.processReceiptBuffer(
        file.buffer,
        val.detectedMime!
      );

      // 4. Duplicate receipt detection (look for existing receipt with identical SHA-256 in last 60 days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const existingReceiptHash = await prisma.expenseClaim.findFirst({
        where: {
          tenantId,
          receiptHash: stored.sha256Hash,
          createdAt: { gte: sixtyDaysAgo },
          status: { not: "rejected" },
        },
        select: { id: true, claimCode: true, merchant: true, amount: true },
      });

      return res.status(201).json({
        success: true,
        storedDocument: stored,
        streamUrl: `/api/documents/${stored.id}/stream`,
        ocr: ocrResult,
        isDuplicateWarning: Boolean(existingReceiptHash),
        duplicateNotice: existingReceiptHash
          ? `Receipt hash matches existing claim ${existingReceiptHash.claimCode} (${existingReceiptHash.merchant} ₹${existingReceiptHash.amount}).`
          : undefined,
      });
    } catch (err: any) {
      console.error("[RECEIPT UPLOAD ERROR]:", err);
      return res.status(500).json({ error: err.message || "Failed to process receipt upload." });
    }
  }
);

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
      storedDocumentId,
      receiptHash,
      receiptPath,
      receiptMime,
      receiptSize,
      ocrExtracted,
      ocrConfidence,
      ocrStatus,
      isDuplicateWarning,
    } = req.body;

    if (!employeeId || !categoryId || !title || !amount || !merchant) {
      return res.status(400).json({ error: "Employee, category, title, amount, and merchant are required." });
    }

    const claim = await prisma.$transaction(async (tx) => {
      // PO-DEC-03: Enforce category monthly spending limit inside transaction
      const limitCheck = await approvalService.checkCategoryMonthlyLimit(
        tenantId,
        employeeId,
        categoryId,
        Number(amount),
        expenseDate ? new Date(expenseDate) : new Date(),
        tx
      );

      if (!limitCheck.withinLimit) {
        const err: any = new Error(
          `Expense claim exceeds monthly spending limit for this category. Limit: ₹${limitCheck.monthlyLimit}, Current: ₹${limitCheck.currentMonthlySpend}, Claim: ₹${amount}, Projected Total: ₹${limitCheck.projectedTotal}.`
        );
        err.statusCode = 400;
        err.categoryLimit = limitCheck;
        throw err;
      }

      // Duplicate detection across last 60 days
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const dupClaim = await tx.expenseClaim.findFirst({
        where: {
          tenantId,
          employeeId,
          amount: Number(amount),
          merchant: String(merchant).trim(),
          expenseDate: { gte: sixtyDaysAgo },
          status: { not: "rejected" },
        },
      });

      const duplicateFlag = isDuplicateWarning || Boolean(dupClaim);

      // Generate unique claim code (e.g. EXP-8429)
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const claimCode = `EXP-${randomCode}`;

      const created = await tx.expenseClaim.create({
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
          receiptUrl: storedDocumentId ? `/api/documents/${storedDocumentId}/stream` : (receiptUrl || null),
          receiptName: receiptName || null,
          storedDocumentId: storedDocumentId || null,
          receiptHash: receiptHash || null,
          receiptPath: receiptPath || null,
          receiptMime: receiptMime || null,
          receiptSize: receiptSize ? Number(receiptSize) : null,
          ocrExtracted: ocrExtracted ? ocrExtracted : undefined,
          ocrConfidence: ocrConfidence ? Number(ocrConfidence) : null,
          ocrStatus: ocrStatus || (ocrExtracted ? "completed" : "not_processed"),
          isDuplicateWarning: duplicateFlag,
          status: "pending",
        },
        include: {
          employee: { include: { department: true } },
          category: true,
        },
      });

      // Link storedDocument entityId if provided
      if (storedDocumentId) {
        await tx.storedDocument.updateMany({
          where: { id: storedDocumentId, tenantId },
          data: { entityId: created.id },
        });
      }

      return created;
    });

    return res.status(201).json(claim);
  } catch (err: any) {
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.message, categoryLimit: err.categoryLimit });
    }
    return res.status(500).json({ error: err.message || "Failed to submit expense claim." });
  }
});

// POST /api/expenses/claims/:id/ocr-process (Re-trigger advisory OCR on stored receipt)
expensesRouter.post("/claims/:id/ocr-process", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const claim = await prisma.expenseClaim.findFirst({
      where: { id, tenantId },
    });
    if (!claim) return res.status(404).json({ error: "Expense claim not found." });

    if (!claim.storedDocumentId) {
      return res.status(400).json({ error: "Claim does not have an attached stored document for OCR." });
    }

    const { buffer, metadata } = await storageService.getBuffer(tenantId, claim.storedDocumentId);
    const ocrResult = await tesseractOcrService.processReceiptBuffer(buffer, metadata.mimeType);

    const updated = await prisma.expenseClaim.update({
      where: { id },
      data: {
        ocrExtracted: ocrResult.extracted as any,
        ocrConfidence: ocrResult.confidence,
        ocrStatus: ocrResult.success ? "completed" : "failed",
      },
      include: {
        employee: { include: { department: true } },
        category: true,
      },
    });

    return res.json({
      success: true,
      claim: updated,
      ocr: ocrResult,
    });
  } catch (err: any) {
    console.error("[CLAIM OCR PROCESS ERROR]:", err);
    return res.status(500).json({ error: err.message || "Failed to process claim OCR." });
  }
});


// PUT /api/expenses/claims/:id/status (Approval action with PO-DEC-03 two-tier threshold routing)
expensesRouter.put("/claims/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, action, approverNotes, reimbursementMethod } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const userRole = (req.user as any)?.role || "manager";
    const userName = (req.user as any)?.email || "Manager";

    // Map legacy status parameter to approval action if needed
    let approvalAction: "manager_approve" | "finance_approve" | "reject" = "manager_approve";
    if (action) {
      approvalAction = action;
    } else if (status === "finance_approved") {
      approvalAction = "finance_approve";
    } else if (status === "rejected") {
      approvalAction = "reject";
    } else {
      approvalAction = "manager_approve";
    }

    const result = await approvalService.processApproval({
      tenantId,
      claimId: id,
      action: approvalAction,
      approverRole: userRole,
      approverName: userName,
      approverNotes,
      reimbursementMethod,
    });

    return res.json({
      success: true,
      message: result.message,
      claim: result.claim,
      requiresSecondaryApproval: result.requiresSecondaryApproval,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update claim status." });
  }
});

// GET /api/expenses/claims/authorized-for-payroll (List claims ready for payroll payout batch)
expensesRouter.get("/claims/authorized-for-payroll", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { periodMonth = new Date().getMonth() + 1, periodYear = new Date().getFullYear(), employeeIds } = req.query;

    const empIdArray = employeeIds ? String(employeeIds).split(",").map((s) => s.trim()) : undefined;

    const claims = await approvalService.getAuthorizedClaimsForPayroll(
      tenantId,
      Number(periodMonth),
      Number(periodYear),
      empIdArray
    );

    return res.json({
      success: true,
      periodMonth: Number(periodMonth),
      periodYear: Number(periodYear),
      count: claims.length,
      totalAmount: claims.reduce((sum, c) => sum + Number(c.amount), 0),
      claims,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to retrieve authorized claims." });
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
