import { Router, Response } from "express";
import { NoticeBoardService } from "./notice-board.service";
import { requireAuth, AuthRequest } from "../../middleware/auth";

export const noticeBoardRouter = Router();

noticeBoardRouter.use(requireAuth as any);

// 1. Get Notice Board statistics
noticeBoardRouter.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required" });

    const stats = await NoticeBoardService.getNoticeStats(tenantId);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch notice board stats" });
  }
});

// 2. List notices with filters (mounts / and /notices)
const handleListNotices = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required" });

    const { category, priority, departmentId, search } = req.query;
    const notices = await NoticeBoardService.listNotices(tenantId, {
      category: category ? String(category) : undefined,
      priority: priority ? String(priority) : undefined,
      departmentId: departmentId ? String(departmentId) : undefined,
      search: search ? String(search) : undefined,
    });

    res.json({ success: true, notices });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch notices" });
  }
};

noticeBoardRouter.get("/", handleListNotices);
noticeBoardRouter.get("/notices", handleListNotices);

// 3. Create a notice (mounts / and /notices)
const handleCreateNotice = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      return res.status(400).json({ error: "Tenant and user context required" });
    }

    const notice = await NoticeBoardService.createNotice(tenantId, userId, req.body);
    res.status(201).json({ success: true, notice });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to create notice" });
  }
};

noticeBoardRouter.post("/", handleCreateNotice);
noticeBoardRouter.post("/notices", handleCreateNotice);

// 4. Get a single notice
noticeBoardRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });

    const notice = await NoticeBoardService.getNotice(tenantId, id);
    res.json({ notice });
  } catch (err: any) {
    res.status(404).json({ error: err.message || "Notice not found" });
  }
});

// 5. Acknowledge a notice
noticeBoardRouter.post("/:id/acknowledge", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { employeeId, comments } = req.body;

    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    if (!employeeId) {
      return res.status(400).json({ error: "Employee ID is required for acknowledgement" });
    }

    const ack = await NoticeBoardService.acknowledgeNotice(tenantId, id, employeeId, comments);
    res.status(201).json({ success: true, acknowledgement: ack });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to acknowledge notice" });
  }
});

// 6. Delete a notice
noticeBoardRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: "Tenant and user context required" });
    }

    await NoticeBoardService.deleteNotice(tenantId, id, userId);
    res.json({ success: true, message: "Notice deleted successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to delete notice" });
  }
});
