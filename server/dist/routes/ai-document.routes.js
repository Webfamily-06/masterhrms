"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_document_service_1 = require("../services/ai-document.service");
const ai_assistant_service_1 = require("../services/ai-assistant.service");
const auth_1 = require("../middleware/auth");
const entitlements_1 = require("../middleware/entitlements");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.use((0, entitlements_1.requireAddon)("ai-document"));
/**
 * CATEGORIES
 */
router.get("/categories", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const categories = await ai_document_service_1.AiDocumentService.getCategories(tenantId);
        res.json(categories);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/categories", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const category = await ai_document_service_1.AiDocumentService.createCategory(tenantId, req.body);
        res.json(category);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.put("/categories/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const category = await ai_document_service_1.AiDocumentService.updateCategory(tenantId, req.params.id, req.body);
        res.json(category);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.delete("/categories/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        await ai_document_service_1.AiDocumentService.deleteCategory(tenantId, req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
/**
 * TONES
 */
router.get("/tones", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const tones = await ai_document_service_1.AiDocumentService.getTones(tenantId);
        res.json(tones);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/tones", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const tone = await ai_document_service_1.AiDocumentService.createTone(tenantId, req.body);
        res.json(tone);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.put("/tones/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const tone = await ai_document_service_1.AiDocumentService.updateTone(tenantId, req.params.id, req.body);
        res.json(tone);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.delete("/tones/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        await ai_document_service_1.AiDocumentService.deleteTone(tenantId, req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
/**
 * TEMPLATES
 */
router.get("/templates", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const templates = await ai_document_service_1.AiDocumentService.getTemplates(tenantId);
        res.json(templates);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/templates", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const userId = req.user?.userId || req.user?.id || "user-unknown";
        const template = await ai_document_service_1.AiDocumentService.createTemplate(tenantId, {
            ...req.body,
            createdBy: userId,
        });
        res.json(template);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get("/templates/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const template = await ai_document_service_1.AiDocumentService.getTemplate(tenantId, req.params.id);
        if (!template)
            return res.status(404).json({ error: "Template not found" });
        res.json(template);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put("/templates/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const template = await ai_document_service_1.AiDocumentService.updateTemplate(tenantId, req.params.id, req.body);
        res.json(template);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post("/templates/:id/duplicate", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const duplicate = await ai_document_service_1.AiDocumentService.duplicateTemplate(tenantId, req.params.id);
        res.json(duplicate);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.delete("/templates/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        await ai_document_service_1.AiDocumentService.deleteTemplate(tenantId, req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
/**
 * GENERATE
 */
router.post("/generate", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const userId = req.user?.userId || req.user?.id || "user-unknown";
        const result = await ai_document_service_1.AiDocumentService.generateDocument(tenantId, userId, req.body);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
/**
 * DOCUMENTS CRUD
 */
router.get("/documents", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const docs = await ai_document_service_1.AiDocumentService.listDocuments(tenantId);
        res.json(docs);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/documents", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const userId = req.user?.userId || req.user?.id || "user-unknown";
        const doc = await ai_document_service_1.AiDocumentService.createDocument(tenantId, userId, req.body);
        res.json(doc);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get("/documents/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const doc = await ai_document_service_1.AiDocumentService.getDocument(tenantId, req.params.id);
        if (!doc)
            return res.status(404).json({ error: "Document not found" });
        res.json(doc);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put("/documents/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const doc = await ai_document_service_1.AiDocumentService.updateDocument(tenantId, req.params.id, req.body);
        res.json(doc);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.delete("/documents/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        await ai_document_service_1.AiDocumentService.deleteDocument(tenantId, req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get("/documents/:id/export", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const rawFormat = req.query.format || "txt";
        const format = ["txt", "docx", "pdf"].includes(rawFormat) ? rawFormat : "txt";
        const exported = await ai_document_service_1.AiDocumentService.exportDocument(tenantId, req.params.id, format);
        const disposition = req.query.disposition === "inline" ? "inline" : "attachment";
        res.setHeader("Content-Disposition", `${disposition}; filename="${encodeURIComponent(exported.filename)}"`);
        res.setHeader("Content-Type", exported.contentType);
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
        res.setHeader("Pragma", "no-cache");
        res.send(exported.buffer);
    }
    catch (err) {
        res.status(err.message === "Document not found" ? 404 : 500).json({ error: err.message });
    }
});
/**
 * ANALYTICS
 */
router.get("/analytics", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const from = req.query.from;
        const to = req.query.to;
        const analytics = await ai_document_service_1.AiDocumentService.getAnalytics(tenantId, from, to);
        res.json(analytics);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * SETTINGS (Shared with ai_provider_config)
 */
router.get("/settings", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const config = await ai_assistant_service_1.AiAssistantService.getProviderConfig(tenantId);
        res.json(config);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put("/settings", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || "default";
        const config = await ai_assistant_service_1.AiAssistantService.updateProviderConfig(tenantId, req.body);
        res.json(config);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
