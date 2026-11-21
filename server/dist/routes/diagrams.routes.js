"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagramsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_1 = require("../lib/tenant");
const diagram_service_1 = require("../services/diagram.service");
exports.diagramsRouter = (0, express_1.Router)();
exports.diagramsRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/diagrams
exports.diagramsRouter.get("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { type } = req.query;
        const diagrams = await diagram_service_1.DiagramService.listDiagrams(tenantId, type);
        return res.json({ success: true, diagrams });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/diagrams/:id
exports.diagramsRouter.get("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const diagram = await diagram_service_1.DiagramService.getDiagram(tenantId, req.params.id);
        if (!diagram) {
            return res.status(404).json({ success: false, error: "Diagram not found" });
        }
        return res.json({ success: true, diagram });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/diagrams
exports.diagramsRouter.post("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const userId = req.user?.userId || "user_system";
        const { title, description, diagramType, nodes, edges, canvasConfig } = req.body;
        if (!title || !diagramType) {
            return res.status(400).json({
                success: false,
                error: "title and diagramType are required",
            });
        }
        const diagram = await diagram_service_1.DiagramService.createDiagram(tenantId, { title, description, diagramType, nodes, edges, canvasConfig }, userId);
        return res.status(201).json({ success: true, diagram });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// PUT /api/diagrams/:id
exports.diagramsRouter.put("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const updated = await diagram_service_1.DiagramService.updateDiagram(tenantId, req.params.id, req.body);
        return res.json({ success: true, diagram: updated });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// DELETE /api/diagrams/:id
exports.diagramsRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const deleted = await diagram_service_1.DiagramService.deleteDiagram(tenantId, req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: "Diagram not found" });
        }
        return res.json({ success: true, message: "Diagram deleted" });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
