import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { broadcastToTenant } from "../socket";

export const chatRouter = Router();

// GET /api/chat/messages/:threadId - Get thread messages
chatRouter.get("/messages/:threadId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { threadId } = req.params;

    const messages = await prisma.chatMessage.findMany({
      where: { tenantId, threadId },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return res.json(messages);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/messages - Send message & broadcast
chatRouter.post("/messages", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { threadId, content, attachments } = req.body;

    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Message content cannot be empty" });
    }

    const senderId = req.user?.userId || "system";
    const senderName = req.user?.email?.split("@")[0] || "User";

    const msg = await prisma.chatMessage.create({
      data: {
        tenantId,
        threadId: threadId || "general",
        senderId,
        senderName,
        content: content || "",
        attachments: attachments || null,
      },
    });

    // Realtime broadcast to tenant
    broadcastToTenant(tenantId, "chat:message", {
      threadId: msg.threadId,
      message: msg,
    });

    return res.status(201).json(msg);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
