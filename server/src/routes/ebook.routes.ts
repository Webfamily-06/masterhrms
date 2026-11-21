import { Router, Response } from "express";
import { EbookService } from "../services/ebook.service";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const ebookRouter = Router();

ebookRouter.use(requireAuth, resolveTenantContext as any);

/**
 * GET /api/ebooks
 * List eBooks
 */
ebookRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { category } = req.query;
    const books = await EbookService.listBooks(tenantId, category ? String(category) : undefined);
    return res.json({ books, total: books.length });
  } catch (err: any) {
    console.error("[ebooks:list] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load eBooks." });
  }
});

/**
 * GET /api/ebooks/:id
 * Get eBook by ID
 */
ebookRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const book = await EbookService.getById(tenantId, req.params.id);
    if (!book) {
      return res.status(404).json({ error: "eBook not found." });
    }
    return res.json({ book });
  } catch (err: any) {
    console.error("[ebooks:get] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load eBook." });
  }
});

/**
 * POST /api/ebooks
 * Publish new eBook
 */
ebookRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { title, author, category, description, fileUrl, fileFormat, totalPages } = req.body;

    if (!title || !author || !category || !fileUrl || !totalPages) {
      return res.status(400).json({ error: "Missing required fields: title, author, category, fileUrl, totalPages" });
    }

    const book = await EbookService.createBook(tenantId, {
      title,
      author,
      category,
      description,
      fileUrl,
      fileFormat,
      totalPages: Number(totalPages),
    });

    return res.status(201).json({ book });
  } catch (err: any) {
    console.error("[ebooks:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create eBook." });
  }
});

/**
 * POST /api/ebooks/:id/progress
 * Record reading progress
 */
ebookRouter.post("/:id/progress", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const employeeId = (req.body.employeeId as string) || (req.user as any)?.employeeId || req.user?.userId;
    const { page } = req.body;

    if (!employeeId || page === undefined) {
      return res.status(400).json({ error: "Employee ID and page are required." });
    }

    const result = await EbookService.recordProgress(tenantId, req.params.id, employeeId, Number(page));
    return res.json(result);
  } catch (err: any) {
    console.error("[ebooks:progress] error:", err);
    return res.status(500).json({ error: err.message || "Failed to record reading progress." });
  }
});

/**
 * POST /api/ebooks/:id/download
 * Record download
 */
ebookRouter.post("/:id/download", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const book = await EbookService.recordDownload(tenantId, req.params.id);
    return res.json({ book });
  } catch (err: any) {
    console.error("[ebooks:download] error:", err);
    return res.status(500).json({ error: err.message || "Failed to record download." });
  }
});

/**
 * DELETE /api/ebooks/:id
 * Delete eBook
 */
ebookRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    await EbookService.deleteBook(tenantId, req.params.id);
    return res.json({ success: true, message: "eBook deleted." });
  } catch (err: any) {
    console.error("[ebooks:delete] error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete eBook." });
  }
});
