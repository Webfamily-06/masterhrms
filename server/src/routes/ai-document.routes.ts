import { Router } from "express";
import { AiDocumentService } from "../services/ai-document.service";
import { AiAssistantService } from "../services/ai-assistant.service";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireAddon } from "../middleware/entitlements";

const router = Router();
router.use(requireAuth);
router.use(requireAddon("ai-document"));

/**
 * CATEGORIES
 */
router.get("/categories", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const categories = await AiDocumentService.getCategories(tenantId);
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/categories", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const category = await AiDocumentService.createCategory(tenantId, req.body);
    res.json(category);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/categories/:id", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const category = await AiDocumentService.updateCategory(tenantId, req.params.id, req.body);
    res.json(category);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/categories/:id", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    await AiDocumentService.deleteCategory(tenantId, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * TONES
 */
router.get("/tones", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const tones = await AiDocumentService.getTones(tenantId);
    res.json(tones);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tones", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const tone = await AiDocumentService.createTone(tenantId, req.body);
    res.json(tone);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/tones/:id", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const tone = await AiDocumentService.updateTone(tenantId, req.params.id, req.body);
    res.json(tone);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/tones/:id", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    await AiDocumentService.deleteTone(tenantId, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * TEMPLATES
 */
router.get("/templates", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const templates = await AiDocumentService.getTemplates(tenantId);
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/templates", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const userId = req.user?.userId || (req.user as any)?.id || "user-unknown";
    const template = await AiDocumentService.createTemplate(tenantId, {
      ...req.body,
      createdBy: userId,
    });
    res.json(template);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/templates/:id", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const template = await AiDocumentService.getTemplate(tenantId, req.params.id);
    if (!template) return res.status(404).json({ error: "Template not found" });
    res.json(template);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/templates/:id", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const template = await AiDocumentService.updateTemplate(tenantId, req.params.id, req.body);
    res.json(template);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/templates/:id/duplicate", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const duplicate = await AiDocumentService.duplicateTemplate(tenantId, req.params.id);
    res.json(duplicate);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/templates/:id", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    await AiDocumentService.deleteTemplate(tenantId, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GENERATE
 */
router.post("/generate", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const userId = req.user?.userId || (req.user as any)?.id || "user-unknown";
    const result = await AiDocumentService.generateDocument(tenantId, userId, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DOCUMENTS CRUD
 */
router.get("/documents", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const docs = await AiDocumentService.listDocuments(tenantId);
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/documents", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const userId = req.user?.userId || (req.user as any)?.id || "user-unknown";
    const doc = await AiDocumentService.createDocument(tenantId, userId, req.body);
    res.json(doc);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/documents/:id", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const doc = await AiDocumentService.getDocument(tenantId, req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/documents/:id", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const doc = await AiDocumentService.updateDocument(tenantId, req.params.id, req.body);
    res.json(doc);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/documents/:id", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    await AiDocumentService.deleteDocument(tenantId, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/documents/:id/export", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const rawFormat = (req.query.format as string) || "txt";
    const format = ["txt", "docx", "pdf"].includes(rawFormat) ? (rawFormat as "txt" | "docx" | "pdf") : "txt";
    const exported = await AiDocumentService.exportDocument(tenantId, req.params.id, format);

    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(exported.filename)}"`);
    res.setHeader("Content-Type", exported.contentType);
    res.send(exported.buffer);
  } catch (err: any) {
    res.status(err.message === "Document not found" ? 404 : 500).json({ error: err.message });
  }
});

/**
 * ANALYTICS
 */
router.get("/analytics", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const analytics = await AiDocumentService.getAnalytics(tenantId, from, to);
    res.json(analytics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * SETTINGS (Shared with ai_provider_config)
 */
router.get("/settings", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const config = await AiAssistantService.getProviderConfig(tenantId);
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/settings", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || "default";
    const config = await AiAssistantService.updateProviderConfig(tenantId, req.body);
    res.json(config);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
