import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { getTenantDb } from "../context/tenant-context.js";
import { documentService } from "../services/document.service.js";

export const meDocumentsRouter = Router();

async function resolveEmployee(req: AuthRequest) {
  const tenantId = req.user?.tenantId!;
  const user = req.user!;
  const userId = user.userId || (user as any).id;
  const db = getTenantDb();
  return await db.employee.findFirst({
    where: { tenantId, userId },
  });
}

// My Company Documents (General company policies or assigned to me)
meDocumentsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const db = getTenantDb();
    const docs = await db.companyDocument.findMany({
      where: {
        tenantId,
        OR: [
          { employeeId: employee.id },
          { employeeId: null }, // Company-wide policies
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(docs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// My Contracts
meDocumentsRouter.get("/contracts", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const contracts = await documentService.listContracts(tenantId, {
      employeeId: employee.id,
    });
    return res.json(contracts);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// My Acknowledgements
meDocumentsRouter.get("/acknowledgements", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const acks = await documentService.listAcknowledgements(tenantId, {
      employeeId: employee.id,
    });
    return res.json(acks);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Acknowledge Policy / Document
meDocumentsRouter.post("/acknowledgements/:documentId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(403).json({ error: "Employee profile not found" });

    const ipAddress = req.ip || (req.headers["x-forwarded-for"] as string) || "127.0.0.1";
    const result = await documentService.submitAcknowledgement(
      tenantId,
      employee.id,
      req.params.documentId,
      ipAddress,
      req.body.comments
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// My Document / Letter Requests
meDocumentsRouter.get("/requests", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const requests = await documentService.listRequests(tenantId, {
      employeeId: employee.id,
    });
    return res.json(requests);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

meDocumentsRouter.post("/requests", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(403).json({ error: "Employee profile not found" });

    const request = await documentService.createRequest(tenantId, employee.id, req.body);
    return res.status(201).json(request);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
