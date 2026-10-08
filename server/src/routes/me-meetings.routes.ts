import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { getTenantDb } from "../context/tenant-context.js";
import { MeetingService } from "../services/meeting.service.js";

export const meMeetingsRouter = Router();

async function resolveEmployee(req: AuthRequest) {
  const tenantId = req.user?.tenantId!;
  const user = req.user!;
  const userId = user.userId || (user as any).id;
  const db = getTenantDb();
  return await db.employee.findFirst({
    where: { tenantId, userId },
  });
}

// My Meetings
meMeetingsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const meetings = await MeetingService.getEmployeeMeetings(tenantId, employee.id);
    return res.json(meetings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// RSVP to a Meeting
meMeetingsRouter.post("/:id/rsvp", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(403).json({ error: "Employee profile not found" });

    const result = await MeetingService.respondRsvp(
      tenantId,
      req.params.id,
      employee.id,
      req.body.rsvpStatus
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// My Action Items
meMeetingsRouter.get("/action-items", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const items = await MeetingService.getEmployeeActionItems(tenantId, employee.id);
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update Action Item Status
meMeetingsRouter.patch("/action-items/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(403).json({ error: "Employee profile not found" });

    const updated = await MeetingService.updateActionItemStatus(
      tenantId,
      req.params.id,
      req.body.status
    );
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
