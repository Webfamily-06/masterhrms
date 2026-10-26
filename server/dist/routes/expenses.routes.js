"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expensesRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const ledger_posting_service_1 = require("../services/ledger-posting.service");
const storage_factory_1 = require("../services/factories/storage.factory");
const file_validator_1 = require("../services/storage/file-validator");
const tesseract_ocr_service_1 = require("../services/ocr/tesseract-ocr.service");
const reimbursement_approval_service_1 = require("../services/reimbursement-approval.service");
const audit_service_1 = require("../services/audit.service");
const outbox_service_1 = require("../services/outbox.service");
exports.expensesRouter = (0, express_1.Router)();
const approvalService = new reimbursement_approval_service_1.ReimbursementApprovalService(prisma_1.prisma);
// Configure disk-backed streaming memory buffer with strict 10MB early rejection
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: file_validator_1.MAX_UPLOAD_SIZE_BYTES, // 10 Megabytes
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
async function ensureSeedCategories(tenantId) {
    const count = await prisma_1.prisma.expenseCategory.count({ where: { tenantId } });
    if (count === 0) {
        for (const c of DEFAULT_EXPENSE_CATEGORIES) {
            await prisma_1.prisma.expenseCategory.create({
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
exports.expensesRouter.get("/categories", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        await ensureSeedCategories(tenantId);
        const categories = await prisma_1.prisma.expenseCategory.findMany({
            where: { tenantId },
            include: {
                _count: {
                    select: { claims: true },
                },
            },
            orderBy: { createdAt: "asc" },
        });
        return res.json(categories);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to list expense categories." });
    }
});
// POST /api/expenses/categories (Create category)
exports.expensesRouter.post("/categories", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { name, code, monthlyLimit, requiresReceipt, icon } = req.body;
        if (!name || !code) {
            return res.status(400).json({ error: "Category name and code are required." });
        }
        const category = await prisma_1.prisma.expenseCategory.create({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create category." });
    }
});
// PUT /api/expenses/categories/:id (Update category)
exports.expensesRouter.put("/categories/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const existing = await prisma_1.prisma.expenseCategory.findUnique({ where: { id } });
        if (!existing || (tenantId && existing.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Category not found." });
        }
        const { name, code, monthlyLimit, requiresReceipt, icon } = req.body;
        const updated = await prisma_1.prisma.expenseCategory.update({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update category." });
    }
});
// DELETE /api/expenses/categories/:id (Delete category)
exports.expensesRouter.delete("/categories/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const existing = await prisma_1.prisma.expenseCategory.findUnique({ where: { id } });
        if (!existing || (tenantId && existing.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Category not found." });
        }
        const claimsCount = await prisma_1.prisma.expenseClaim.count({ where: { categoryId: id } });
        if (claimsCount > 0) {
            return res.status(400).json({ error: `Cannot delete: Category has ${claimsCount} claims filed under it.` });
        }
        await prisma_1.prisma.expenseCategory.delete({ where: { id } });
        return res.json({ success: true, message: "Category deleted." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete category." });
    }
});
// GET /api/expenses/claims (List expense claims with filters)
exports.expensesRouter.get("/claims", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { status, categoryId, employeeId, search } = req.query;
        const where = { tenantId };
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
        const claims = await prisma_1.prisma.expenseClaim.findMany({
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
    }
    catch (err) {
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
exports.expensesRouter.post("/claims/upload-receipt", auth_1.requireAuth, upload.single("receipt"), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: "No receipt file provided in multipart payload." });
        }
        // 1. Binary Magic Bytes & Size Validation
        const val = (0, file_validator_1.validateFileBuffer)(file.buffer, file.originalname, file.mimetype);
        if (!val.isValid) {
            return res.status(400).json({ error: val.error });
        }
        // 2. Encrypt and save to tenant-isolated disk storage via StorageFactory
        const storage = await storage_factory_1.StorageFactory.getDriver("TENANT", tenantId);
        const stored = await storage.save(tenantId, {
            buffer: file.buffer,
            originalName: file.originalname,
            mimeType: val.detectedMime,
            sizeBytes: file.size,
        }, "expense_receipt", undefined, req.user?.userId || req.user?.id);
        // 3. Advisory OCR extraction (Local self-hosted)
        const ocrResult = await tesseract_ocr_service_1.tesseractOcrService.processReceiptBuffer(file.buffer, val.detectedMime);
        // 4. Duplicate receipt detection (look for existing receipt with identical SHA-256 in last 60 days)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const existingReceiptHash = await prisma_1.prisma.expenseClaim.findFirst({
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
    }
    catch (err) {
        console.error("[RECEIPT UPLOAD ERROR]:", err);
        return res.status(500).json({ error: err.message || "Failed to process receipt upload." });
    }
});
// POST /api/expenses/claims (Submit expense claim)
exports.expensesRouter.post("/claims", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { employeeId, categoryId, title, amount, expenseDate, merchant, description, receiptUrl, receiptName, storedDocumentId, receiptHash, receiptPath, receiptMime, receiptSize, ocrExtracted, ocrConfidence, ocrStatus, isDuplicateWarning, } = req.body;
        if (!employeeId || !categoryId || !title || !amount || !merchant) {
            return res.status(400).json({ error: "Employee, category, title, amount, and merchant are required." });
        }
        const claim = await prisma_1.prisma.$transaction(async (tx) => {
            // PO-DEC-03: Enforce category monthly spending limit inside transaction
            const limitCheck = await approvalService.checkCategoryMonthlyLimit(tenantId, employeeId, categoryId, Number(amount), expenseDate ? new Date(expenseDate) : new Date(), tx);
            if (!limitCheck.withinLimit) {
                const err = new Error(`Expense claim exceeds monthly spending limit for this category. Limit: ₹${limitCheck.monthlyLimit}, Current: ₹${limitCheck.currentMonthlySpend}, Claim: ₹${amount}, Projected Total: ₹${limitCheck.projectedTotal}.`);
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
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "expense.claim.created",
            entityType: "ExpenseClaim",
            entityId: claim.id,
            newState: { claimCode: claim.claimCode, title: claim.title, amount: Number(claim.amount), merchant: claim.merchant },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId,
            eventType: "expense.claim.created",
            entityType: "expense_claim",
            entityId: claim.id,
            actorId: req.user?.userId || req.user?.id,
            payload: { claimCode: claim.claimCode, amount: Number(claim.amount), merchant: claim.merchant },
        }).catch(() => { });
        return res.status(201).json(claim);
    }
    catch (err) {
        if (err.statusCode === 400) {
            return res.status(400).json({ error: err.message, categoryLimit: err.categoryLimit });
        }
        return res.status(500).json({ error: err.message || "Failed to submit expense claim." });
    }
});
// GET /api/expenses/claims/:id (Get single claim details)
exports.expensesRouter.get("/claims/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const claim = await prisma_1.prisma.expenseClaim.findFirst({
            where: { id, tenantId },
            include: {
                employee: { include: { department: true } },
                category: true,
            },
        });
        if (!claim) {
            return res.status(404).json({ error: "Expense claim not found." });
        }
        return res.json(claim);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch claim." });
    }
});
// PUT /api/expenses/claims/:id (Update pending claim)
exports.expensesRouter.put("/claims/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const existing = await prisma_1.prisma.expenseClaim.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Expense claim not found." });
        }
        if (existing.status !== "pending") {
            return res.status(400).json({ error: `Cannot edit claim with status '${existing.status}'. Only pending claims can be updated.` });
        }
        const { title, amount, merchant, description, categoryId, expenseDate } = req.body;
        const updated = await prisma_1.prisma.expenseClaim.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(amount !== undefined && { amount: Number(amount) }),
                ...(merchant !== undefined && { merchant }),
                ...(description !== undefined && { description }),
                ...(categoryId !== undefined && { categoryId }),
                ...(expenseDate !== undefined && { expenseDate: new Date(expenseDate) }),
            },
            include: {
                employee: { include: { department: true } },
                category: true,
            },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "expense.claim.updated",
            entityType: "ExpenseClaim",
            entityId: id,
            oldState: { title: existing.title, amount: Number(existing.amount), merchant: existing.merchant },
            newState: { title: updated.title, amount: Number(updated.amount), merchant: updated.merchant },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId,
            eventType: "expense.claim.updated",
            entityType: "expense_claim",
            entityId: id,
            actorId: req.user?.userId || req.user?.id,
            payload: { claimCode: updated.claimCode, amount: Number(updated.amount), merchant: updated.merchant },
        }).catch(() => { });
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update expense claim." });
    }
});
// POST /api/expenses/claims/:id/ocr-process (Re-trigger advisory OCR on stored receipt)
exports.expensesRouter.post("/claims/:id/ocr-process", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const claim = await prisma_1.prisma.expenseClaim.findFirst({
            where: { id, tenantId },
        });
        if (!claim)
            return res.status(404).json({ error: "Expense claim not found." });
        if (!claim.storedDocumentId) {
            return res.status(400).json({ error: "Claim does not have an attached stored document for OCR." });
        }
        const storage = await storage_factory_1.StorageFactory.getDriver("TENANT", tenantId);
        const { buffer, metadata } = await storage.getBuffer(tenantId, claim.storedDocumentId);
        const ocrResult = await tesseract_ocr_service_1.tesseractOcrService.processReceiptBuffer(buffer, metadata.mimeType);
        const updated = await prisma_1.prisma.expenseClaim.update({
            where: { id },
            data: {
                ocrExtracted: ocrResult.extracted,
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
    }
    catch (err) {
        console.error("[CLAIM OCR PROCESS ERROR]:", err);
        return res.status(500).json({ error: err.message || "Failed to process claim OCR." });
    }
});
// PUT /api/expenses/claims/:id/status (Approval action with PO-DEC-03 two-tier threshold routing)
exports.expensesRouter.put("/claims/:id/status", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, action, approverNotes, reimbursementMethod } = req.body;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const userRole = req.user?.role || "manager";
        const userName = req.user?.email || "Manager";
        // Map legacy status parameter to approval action if needed
        let approvalAction = "manager_approve";
        if (action) {
            approvalAction = action;
        }
        else if (status === "finance_approved") {
            approvalAction = "finance_approve";
        }
        else if (status === "rejected") {
            approvalAction = "reject";
        }
        else {
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update claim status." });
    }
});
// GET /api/expenses/claims/authorized-for-payroll (List claims ready for payroll payout batch)
exports.expensesRouter.get("/claims/authorized-for-payroll", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { periodMonth = new Date().getMonth() + 1, periodYear = new Date().getFullYear(), employeeIds } = req.query;
        const empIdArray = employeeIds ? String(employeeIds).split(",").map((s) => s.trim()) : undefined;
        const claims = await approvalService.getAuthorizedClaimsForPayroll(tenantId, Number(periodMonth), Number(periodYear), empIdArray);
        return res.json({
            success: true,
            periodMonth: Number(periodMonth),
            periodYear: Number(periodYear),
            count: claims.length,
            totalAmount: claims.reduce((sum, c) => sum + Number(c.amount), 0),
            claims,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to retrieve authorized claims." });
    }
});
// POST /api/expenses/claims/:id/reimburse (Execute reimbursement / Link to Payroll)
exports.expensesRouter.post("/claims/:id/reimburse", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { reimbursementMethod, payrollMonth, approverNotes } = req.body;
        const tenantId = req.user?.tenantId;
        const existing = await prisma_1.prisma.expenseClaim.findUnique({ where: { id } });
        if (!existing || (tenantId && existing.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Expense claim not found." });
        }
        const updated = await prisma_1.prisma.expenseClaim.update({
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
        (0, ledger_posting_service_1.autoPostExpenseToLedger)({
            tenantId: existing.tenantId,
            claimId: existing.id,
            title: `${existing.claimCode} - ${existing.title}`,
            amount: Number(existing.amount),
            paymentMode: reimbursementMethod || "Cash",
        }).catch((e) => console.error("Auto-post expense to ledger error:", e));
        await audit_service_1.AuditService.logMutation({
            tenantId: existing.tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "expense.claim.reimbursed",
            entityType: "ExpenseClaim",
            entityId: id,
            oldState: { status: existing.status },
            newState: { status: "reimbursed", reimbursementMethod: updated.reimbursementMethod },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId: existing.tenantId,
            eventType: "expense.claim.reimbursed",
            entityType: "expense_claim",
            entityId: id,
            actorId: req.user?.userId || req.user?.id,
            payload: { claimCode: existing.claimCode, amount: Number(existing.amount), status: "reimbursed" },
        }).catch(() => { });
        return res.json({
            success: true,
            message: `Expense claim ${existing.claimCode} marked as Reimbursed (${updated.reimbursementMethod?.replace("_", " ")})!`,
            claim: updated,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to reimburse claim." });
    }
});
// DELETE /api/expenses/claims/:id (Delete claim)
exports.expensesRouter.delete("/claims/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const existing = await prisma_1.prisma.expenseClaim.findUnique({ where: { id } });
        if (!existing || (tenantId && existing.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Expense claim not found." });
        }
        if (existing.status === "reimbursed") {
            return res.status(400).json({ error: "Cannot delete a reimbursed claim." });
        }
        await prisma_1.prisma.expenseClaim.delete({ where: { id } });
        await audit_service_1.AuditService.logMutation({
            tenantId: existing.tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "expense.claim.deleted",
            entityType: "ExpenseClaim",
            entityId: id,
            oldState: { claimCode: existing.claimCode, title: existing.title, amount: Number(existing.amount) },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId: existing.tenantId,
            eventType: "expense.claim.deleted",
            entityType: "expense_claim",
            entityId: id,
            actorId: req.user?.userId || req.user?.id,
            payload: { claimCode: existing.claimCode },
        }).catch(() => { });
        return res.json({ success: true, message: "Expense claim deleted." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete expense claim." });
    }
});
// GET /api/expenses/summary (Aggregate spending analytics)
exports.expensesRouter.get("/summary", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const allClaims = await prisma_1.prisma.expenseClaim.findMany({
            where: { tenantId },
            include: { category: true },
        });
        let pendingAmount = 0;
        let approvedAmount = 0;
        let reimbursedAmount = 0;
        const categorySpend = {};
        for (const c of allClaims) {
            const amt = Number(c.amount) || 0;
            if (c.status === "pending")
                pendingAmount += amt;
            else if (["manager_approved", "finance_approved"].includes(c.status))
                approvedAmount += amt;
            else if (c.status === "reimbursed")
                reimbursedAmount += amt;
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to generate expense summary." });
    }
});
