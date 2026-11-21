import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { resolveTenantId } from "../lib/tenant";
import { DiagramService, DiagramType } from "../services/diagram.service";

export const diagramsRouter = Router();

diagramsRouter.use(requireAuth, resolveTenantContext);

// GET /api/diagrams
diagramsRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { type } = req.query;
    const diagrams = await DiagramService.listDiagrams(tenantId, type as DiagramType);
    return res.json({ success: true, diagrams });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/diagrams/:id
diagramsRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const diagram = await DiagramService.getDiagram(tenantId, req.params.id);
    if (!diagram) {
      return res.status(404).json({ success: false, error: "Diagram not found" });
    }
    return res.json({ success: true, diagram });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/diagrams
diagramsRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const userId = req.user?.userId || "user_system";
    const { title, description, diagramType, nodes, edges, canvasConfig } = req.body;

    if (!title || !diagramType) {
      return res.status(400).json({
        success: false,
        error: "title and diagramType are required",
      });
    }

    const diagram = await DiagramService.createDiagram(
      tenantId,
      { title, description, diagramType, nodes, edges, canvasConfig },
      userId
    );
    return res.status(201).json({ success: true, diagram });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/diagrams/:id
diagramsRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const updated = await DiagramService.updateDiagram(tenantId, req.params.id, req.body);
    return res.json({ success: true, diagram: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/diagrams/:id
diagramsRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const deleted = await DiagramService.deleteDiagram(tenantId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Diagram not found" });
    }
    return res.json({ success: true, message: "Diagram deleted" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
