import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { getTenantDb } from "../context/tenant-context.js";
import { AssetService } from "../services/asset.service.js";

export const meAssetsRouter = Router();

async function resolveEmployee(req: AuthRequest) {
  const tenantId = req.user?.tenantId!;
  const user = req.user!;
  const userId = user.userId || (user as any).id;
  const db = getTenantDb();
  return await db.employee.findFirst({
    where: { tenantId, userId },
  });
}

// My Assets Dashboard
meAssetsRouter.get("/dashboard", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json({ totalAssigned: 0, pendingAcknowledgement: 0, requestsCount: 0 });

    const assignments = await AssetService.getEmployeeAssets(tenantId, employee.id);
    const requests = await AssetService.getEmployeeRequests(tenantId, employee.id);

    const pendingAck = assignments.filter((a) => !a.acknowledgedAt).length;

    return res.json({
      totalAssigned: assignments.filter((a) => a.status === 'active').length,
      pendingAcknowledgement: pendingAck,
      requestsCount: requests.length,
      recentAssignments: assignments.slice(0, 5),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// My Assets List
meAssetsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const assignments = await AssetService.getEmployeeAssets(tenantId, employee.id);
    return res.json(assignments);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Acknowledge Assignment
meAssetsRouter.post("/assignments/:id/acknowledge", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(403).json({ error: "Employee profile not found" });

    const result = await AssetService.acknowledgeAsset(
      tenantId,
      req.params.id,
      employee.id,
      req.body.signatureDataUrl || "DIGITALLY_SIGNED"
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// My Requests
meAssetsRouter.get("/requests", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const requests = await AssetService.getEmployeeRequests(tenantId, employee.id);
    return res.json(requests);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

meAssetsRouter.post("/requests", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(403).json({ error: "Employee profile not found" });

    const request = await AssetService.requestAsset(tenantId, employee.id, req.body);
    return res.status(201).json(request);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
