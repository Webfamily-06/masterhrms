"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ebookRouter = void 0;
const express_1 = require("express");
const ebook_service_1 = require("../services/ebook.service");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
exports.ebookRouter = (0, express_1.Router)();
exports.ebookRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * GET /api/ebooks
 * List eBooks
 */
exports.ebookRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { category } = req.query;
        const books = await ebook_service_1.EbookService.listBooks(tenantId, category ? String(category) : undefined);
        return res.json({ books, total: books.length });
    }
    catch (err) {
        console.error("[ebooks:list] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load eBooks." });
    }
});
/**
 * GET /api/ebooks/:id
 * Get eBook by ID
 */
exports.ebookRouter.get("/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const book = await ebook_service_1.EbookService.getById(tenantId, req.params.id);
        if (!book) {
            return res.status(404).json({ error: "eBook not found." });
        }
        return res.json({ book });
    }
    catch (err) {
        console.error("[ebooks:get] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load eBook." });
    }
});
/**
 * POST /api/ebooks
 * Publish new eBook
 */
exports.ebookRouter.post("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { title, author, category, description, fileUrl, fileFormat, totalPages } = req.body;
        if (!title || !author || !category || !fileUrl || !totalPages) {
            return res.status(400).json({ error: "Missing required fields: title, author, category, fileUrl, totalPages" });
        }
        const book = await ebook_service_1.EbookService.createBook(tenantId, {
            title,
            author,
            category,
            description,
            fileUrl,
            fileFormat,
            totalPages: Number(totalPages),
        });
        return res.status(201).json({ book });
    }
    catch (err) {
        console.error("[ebooks:create] error:", err);
        return res.status(500).json({ error: err.message || "Failed to create eBook." });
    }
});
/**
 * POST /api/ebooks/:id/progress
 * Record reading progress
 */
exports.ebookRouter.post("/:id/progress", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const employeeId = req.body.employeeId || req.user?.employeeId || req.user?.userId;
        const { page } = req.body;
        if (!employeeId || page === undefined) {
            return res.status(400).json({ error: "Employee ID and page are required." });
        }
        const result = await ebook_service_1.EbookService.recordProgress(tenantId, req.params.id, employeeId, Number(page));
        return res.json(result);
    }
    catch (err) {
        console.error("[ebooks:progress] error:", err);
        return res.status(500).json({ error: err.message || "Failed to record reading progress." });
    }
});
/**
 * POST /api/ebooks/:id/download
 * Record download
 */
exports.ebookRouter.post("/:id/download", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const book = await ebook_service_1.EbookService.recordDownload(tenantId, req.params.id);
        return res.json({ book });
    }
    catch (err) {
        console.error("[ebooks:download] error:", err);
        return res.status(500).json({ error: err.message || "Failed to record download." });
    }
});
/**
 * DELETE /api/ebooks/:id
 * Delete eBook
 */
exports.ebookRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        await ebook_service_1.EbookService.deleteBook(tenantId, req.params.id);
        return res.json({ success: true, message: "eBook deleted." });
    }
    catch (err) {
        console.error("[ebooks:delete] error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete eBook." });
    }
});
