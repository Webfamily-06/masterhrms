import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { broadcastToTenant } from "../socket";

export const chatRouter = Router();

chatRouter.use(requireAuth, resolveTenantContext);

// Prohibited File Extensions (Executables, Embedded Scripts, Env, Code Files)
export const RESTRICTED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "bin", "msi", "apk", "com", "vbs", "ps1", "scr", "pif", "app", "dmg", "pkg", "deb", "rpm",
  "env", "json", "js", "mjs", "cjs", "jsx", "ts", "tsx", "php", "py", "pyc", "rb", "go", "java", "class", "jar",
  "c", "cpp", "h", "hpp", "cs", "sql", "bash", "zsh", "lua", "pl", "asp", "aspx", "jsp", "wasm", "yaml", "yml",
  "pem", "key", "crt", "cer", "pfx", "p12"
]);

function validateFileSecurity(attachments: any[]): { isAllowed: boolean; blockedFile?: string; reason?: string } {
  if (!attachments || !Array.isArray(attachments)) return { isAllowed: true };
  for (const att of attachments) {
    const fileName = String(att.name || att.fileName || "").toLowerCase().trim();
    if (fileName === ".env" || fileName.startsWith(".env.") || fileName.endsWith(".env")) {
      return { isAllowed: false, blockedFile: fileName, reason: "Environment configuration files (.env) are restricted for security." };
    }
    const lastDot = fileName.lastIndexOf(".");
    if (lastDot !== -1) {
      const ext = fileName.slice(lastDot + 1);
      if (RESTRICTED_EXTENSIONS.has(ext)) {
        return { isAllowed: false, blockedFile: fileName, reason: `Files with extension .${ext} are restricted for security (no executables, code, or config files).` };
      }
    }
  }
  return { isAllowed: true };
}

// GET /api/chat/file-policy - Get active file restriction rules
chatRouter.get("/file-policy", requireAuth, async (_req: AuthRequest, res: Response) => {
  return res.json({
    prohibitedExtensions: Array.from(RESTRICTED_EXTENSIONS),
    allowedCategories: ["Images (png, jpg, jpeg, gif, webp)", "Documents (pdf, docx, xlsx, pptx, txt, csv)"],
  });
});

// GET /api/chat/messages/:threadId - Get thread messages
chatRouter.get("/messages/:threadId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { threadId } = req.params;
    const currentUserId = req.user?.userId;

    // Participant Authorization for direct conversations
    if (threadId.startsWith("direct_")) {
      const parts = threadId.slice("direct_".length).split("_");
      let empId: string | undefined;
      if (currentUserId) {
        const emp = await prisma.employee.findFirst({
          where: { tenantId, userId: currentUserId },
          select: { id: true },
        });
        empId = emp?.id;
      }

      const isParticipant = parts.some(p => p === currentUserId || (empId && p === empId));
      if (!isParticipant) {
        return res.status(403).json({
          error: "Access denied: You are not an authorized participant in this private direct conversation.",
          code: "CHAT_PARTICIPANT_REQUIRED"
        });
      }
    }

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

// POST /api/chat/messages - Send message & broadcast with security checks
chatRouter.post("/messages", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { threadId, content, attachments } = req.body;
    const currentUserId = req.user?.userId;

    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Message content cannot be empty" });
    }

    // Participant Authorization for direct conversations
    if (threadId && typeof threadId === "string" && threadId.startsWith("direct_")) {
      const parts = threadId.slice("direct_".length).split("_");
      let empId: string | undefined;
      if (currentUserId) {
        const emp = await prisma.employee.findFirst({
          where: { tenantId, userId: currentUserId },
          select: { id: true },
        });
        empId = emp?.id;
      }

      const isParticipant = parts.some(p => p === currentUserId || (empId && p === empId));
      if (!isParticipant) {
        return res.status(403).json({
          error: "Access denied: You cannot send messages to a private direct thread you are not part of.",
          code: "CHAT_PARTICIPANT_REQUIRED"
        });
      }
    }

    // Backend File Security Filter
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const secCheck = validateFileSecurity(attachments);
      if (!secCheck.isAllowed) {
        return res.status(403).json({
          error: `Security Violation: Cannot upload '${secCheck.blockedFile}'. ${secCheck.reason}`,
        });
      }
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

// DELETE /api/chat/messages/:id - Delete message (original sender or system admin only)
chatRouter.delete("/messages/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId;
    const { id } = req.params;

    const existing = await prisma.chatMessage.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Message not found" });
    }

    const isSender = existing.senderId === currentUserId;
    const isAdmin = req.user?.roles?.some((r: string) => ["super_admin", "tenant_admin"].includes(r));

    if (!isSender && !isAdmin) {
      return res.status(403).json({
        error: "Access denied: You can only delete your own messages.",
        code: "CHAT_DELETE_FORBIDDEN"
      });
    }

    await prisma.chatMessage.delete({
      where: { id },
    });

    return res.json({ success: true, message: "Message deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

