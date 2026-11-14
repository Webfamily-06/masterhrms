import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { prisma, rawPrisma } from "../prisma";
import { runWithTenantContext } from "../context/tenant-context";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import {
  broadcastToUser,
  getOnlineUsersForTenant,
  getOnlineUsersForTenantAsync,
  activeCalls,
  activeGroupCalls,
  getIO,
} from "../socket";
import { PusherService } from "../services/pusher.service";
import { UrlPreviewService } from "../services/url-preview.service";
import { getUploadsRoot, MediaService } from "../services/media/media.service";
import { recordSystemEvent } from "../services/chat-system-events.service";
import { ChatFolderService } from "../services/files/chat-folder.service";
import { WebRtcIceService } from "../services/webrtc-ice.service";
import { IncomingCallPushService } from "../services/incoming-call-push.service";
import {
  ChatService,
  ChatDomainError,
  CHAT_RESTRICTED_EXTENSIONS,
  MAX_CHAT_ATTACHMENTS_PER_MESSAGE,
  MAX_CHAT_FILE_SIZE_BYTES,
  DEFAULT_MAX_GROUP_MEMBERS,
  cleanChatPersonName,
} from "../services/chat.service";

export const chatRouter = Router();

// Preserved exported symbols for auth.routes.ts & test consumers
export const RESTRICTED_EXTENSIONS = CHAT_RESTRICTED_EXTENSIONS;
export const profileMemoryCache = new Map<string, { fullName: string; avatarUrl: string | null; expiresAt: number }>();

export function invalidateChatProfileCache(userId?: string, tenantId?: string) {
  ChatService.invalidateProfileCache(userId, tenantId);
  if (!userId && !tenantId) {
    profileMemoryCache.clear();
    return;
  }
  for (const key of Array.from(profileMemoryCache.keys())) {
    const [tId, uId] = key.split(":");
    if ((!userId || uId === userId) && (!tenantId || tId === tenantId)) {
      profileMemoryCache.delete(key);
    }
  }
}

export function cleanPersonName(name: string): string {
  return cleanChatPersonName(name);
}

export function formatNaturalList(names: string[]): string {
  const cleaned = names.map(cleanPersonName).filter(Boolean);
  if (cleaned.length === 0) return "members";
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(", ")}, and ${cleaned[cleaned.length - 1]}`;
}

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_CHAT_FILE_SIZE_BYTES,
    files: MAX_CHAT_ATTACHMENTS_PER_MESSAGE,
  },
});

function handleChatError(res: Response, err: any, fallbackMessage = "Internal chat error") {
  if (err instanceof ChatDomainError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  if (err?.status && typeof err.status === "number") {
    return res.status(err.status).json({ error: err.message || fallbackMessage, code: err.code });
  }
  return res.status(500).json({ error: err?.message || fallbackMessage });
}

function formatMessageSnippet(msg: any): string {
  if (!msg) return "";
  if (msg.isDeletedForEveryone || msg.is_deleted_for_everyone) return "This message was deleted";
  if (msg.content && String(msg.content).trim()) return String(msg.content);
  if (msg.poll) return `Poll: ${msg.poll.question || "Vote"}`;
  if (msg.voiceNote || msg.voice_note) return "Voice message";
  if (msg.attachments) return "Attachment";
  return "";
}

/**
 * Batch helper: fetches latest message and unread count across arbitrarily many threads in 2 indexed SQL queries (zero N+1).
 */
async function fetchThreadSummariesBatch(
  tenantId: string,
  currentUserId: string,
  threadIds: string[]
): Promise<{
  lastMessageMap: Map<string, { content: string; senderName: string; createdAt: Date; senderId: string }>;
  unreadCountMap: Map<string, number>;
}> {
  const lastMessageMap = new Map<string, { content: string; senderName: string; createdAt: Date; senderId: string }>();
  const unreadCountMap = new Map<string, number>();

  if (!threadIds || threadIds.length === 0) {
    return { lastMessageMap, unreadCountMap };
  }

  const db: any = rawPrisma || prisma;
  if (typeof db.$queryRawUnsafe === "function") {
    const [latestRows, unreadRows] = await Promise.all([
      db.$queryRawUnsafe(
        `SELECT DISTINCT ON (thread_id)
           thread_id, sender_id, sender_name, content, attachments, voice_note, poll, is_deleted_for_everyone, created_at
         FROM chat_messages
         WHERE tenant_id = $1
           AND thread_id = ANY($2::text[])
           AND NOT (COALESCE(deleted_for_user_ids, '[]'::jsonb) @> to_jsonb($3::text))
         ORDER BY thread_id, created_at DESC`,
        tenantId,
        threadIds,
        currentUserId
      ),
      db.$queryRawUnsafe(
        `SELECT m.thread_id, COUNT(*)::int AS unread_count
         FROM chat_messages m
         LEFT JOIN chat_read_receipts r
           ON r.tenant_id = m.tenant_id
          AND r.thread_id = m.thread_id
          AND r.user_id = $2
         WHERE m.tenant_id = $1
           AND m.thread_id = ANY($3::text[])
           AND m.sender_id <> $2
           AND m.created_at > COALESCE(r.last_read_at, to_timestamp(0))
           AND NOT (COALESCE(m.deleted_for_user_ids, '[]'::jsonb) @> to_jsonb($2::text))
         GROUP BY m.thread_id`,
        tenantId,
        currentUserId,
        threadIds
      ),
    ]);

    for (const row of Array.isArray(latestRows) ? latestRows : []) {
      lastMessageMap.set(row.thread_id, {
        content: formatMessageSnippet(row),
        senderName: row.sender_name || "",
        senderId: row.sender_id || "",
        createdAt: new Date(row.created_at),
      });
    }
    for (const row of Array.isArray(unreadRows) ? unreadRows : []) {
      unreadCountMap.set(row.thread_id, Number(row.unread_count) || 0);
    }
    return { lastMessageMap, unreadCountMap };
  }

  // Fallback for mocked unit test environments without $queryRawUnsafe
  for (const tid of threadIds) {
    const lastMsg = await prisma.chatMessage.findFirst({
      where: { tenantId, threadId: tid },
      orderBy: { createdAt: "desc" },
    });
    if (lastMsg) {
      lastMessageMap.set(tid, {
        content: formatMessageSnippet(lastMsg),
        senderName: lastMsg.senderName,
        senderId: lastMsg.senderId,
        createdAt: lastMsg.createdAt,
      });
    }
    const receipt = await prisma.chatReadReceipt.findUnique({
      where: { tenantId_threadId_userId: { tenantId, threadId: tid, userId: currentUserId } },
    });
    const unread = await prisma.chatMessage.count({
      where: {
        tenantId,
        threadId: tid,
        senderId: { not: currentUserId },
        createdAt: { gt: receipt?.lastReadAt || new Date(0) },
      },
    });
    unreadCountMap.set(tid, unread);
  }
  return { lastMessageMap, unreadCountMap };
}

/**
 * Batch helper: resolves Employee + Profile metadata for a set of userIds in 2 queries (zero N+1).
 */
async function resolveParticipantsBatch(tenantId: string, userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return { empByKey: new Map<string, any>(), profByUserId: new Map<string, any>() };
  }

  const [employees, profiles] = await Promise.all([
    prisma.employee.findMany({
      where: {
        tenantId,
        OR: [{ userId: { in: uniqueIds } }, { id: { in: uniqueIds } }],
      },
      select: {
        id: true,
        userId: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        position: true,
        department: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
      },
    }),
    prisma.profile.findMany({
      where: { tenantId, userId: { in: uniqueIds } },
      select: {
        id: true,
        userId: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        user: { select: { email: true } },
      },
    }),
  ]);

  const empByKey = new Map<string, any>();
  for (const emp of employees) {
    empByKey.set(emp.id, emp);
    if (emp.userId) empByKey.set(emp.userId, emp);
  }

  const profByUserId = new Map<string, any>();
  for (const prof of profiles) {
    profByUserId.set(prof.userId, prof);
  }

  return { empByKey, profByUserId };
}

// ============================================================================
// SIGNED & ACL-PROTECTED PRIVATE ATTACHMENT DOWNLOAD (Registered pre-global auth
// so HMAC-signed <img>/<audio>/<a> URLs AND Bearer-authenticated requests both work
// while strictly enforcing live DB thread membership & FileAcl!)
// ============================================================================
chatRouter.get("/attachments/:mediaId/download", async (req: AuthRequest, res: Response) => {
  try {
    const { mediaId } = req.params;
    const sig = typeof req.query.sig === "string" ? req.query.sig : "";
    const uid = typeof req.query.uid === "string" ? req.query.uid : "";
    const tid = typeof req.query.tid === "string" ? req.query.tid : "";
    const exp = Number(req.query.exp || 0);
    const inline = req.query.inline === "1" || req.query.inline === "true";

    let verifiedTenantId = "";
    let verifiedUserId = "";
    let verifiedRoles: string[] = [];

    // Path A: Cryptographic HMAC-SHA256 signed URL with expiration check
    if (sig && uid && tid && exp) {
      if (Math.floor(Date.now() / 1000) > exp) {
        return res.status(403).json({
          error: "Signed attachment URL has expired. Refresh the conversation to obtain a fresh link.",
          code: "SIGNED_URL_EXPIRED",
        });
      }
      const sigValid = ChatService.verifyAttachmentSignature({
        mediaId,
        tenantId: tid,
        userId: uid,
        exp,
        sig,
      });
      if (!sigValid) {
        return res.status(403).json({
          error: "Invalid attachment signature.",
          code: "INVALID_ATTACHMENT_SIGNATURE",
        });
      }
      verifiedTenantId = tid;
      verifiedUserId = uid;
    } else {
      // Path B: Standard authenticated session (Bearer header or auth cookie)
      let authFailed = false;
      await new Promise<void>((resolve) => {
        requireAuth(req, res, () => resolve());
        if (res.headersSent) {
          authFailed = true;
          resolve();
        }
      });
      if (authFailed || !req.user?.userId || !req.user?.tenantId) {
        if (!res.headersSent) {
          return res.status(401).json({ error: "Authentication required to access private attachments." });
        }
        return;
      }
      verifiedTenantId = req.user.tenantId;
      verifiedUserId = req.user.userId;
      verifiedRoles = req.user.roles || [];
    }

    const db = rawPrisma || prisma;
    const mediaFile = await db.mediaFile.findFirst({
      where: { id: mediaId, deletedAt: null },
    });

    if (!mediaFile || (mediaFile.tenantId && mediaFile.tenantId !== verifiedTenantId)) {
      return res.status(404).json({ error: "Attachment not found." });
    }

    // Enforce live DB membership / FileAcl check (even for signed URLs, revoked group members or deleted messages lose access immediately!)
    const allowed = await ChatService.authorizeChatMediaAccess({
      mediaFile,
      tenantId: verifiedTenantId,
      userId: verifiedUserId,
      roles: verifiedRoles,
    });

    if (!allowed) {
      return res.status(403).json({
        error: "Access denied: You are not authorized to access this private attachment.",
        code: "ATTACHMENT_ACCESS_DENIED",
      });
    }

    const uploadsRoot = path.resolve(getUploadsRoot());
    const relPath = String(mediaFile.filePath || "").replace(/^[/\\]+/, "");
    const absPath = path.resolve(uploadsRoot, relPath);

    if (!absPath.startsWith(uploadsRoot)) {
      return res.status(403).json({ error: "Invalid attachment storage path." });
    }

    let cloudBuffer: Buffer | null = null;
    if (!fs.existsSync(absPath)) {
      cloudBuffer = await MediaService.fetchCloudMediaBuffer(mediaFile.tenantId, relPath);
      if (cloudBuffer) {
        try {
          const dir = path.dirname(absPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          await fs.promises.writeFile(absPath, cloudBuffer);
        } catch {}
      } else {
        return res.status(404).json({ error: "Attachment file is missing from storage." });
      }
    }

    const safeMime = String(mediaFile.mimeType || "application/octet-stream").toLowerCase();
    const isSafeInline =
      inline &&
      (safeMime.startsWith("image/") ||
        safeMime.startsWith("audio/") ||
        safeMime.startsWith("video/") ||
        safeMime === "application/pdf") &&
      !safeMime.includes("svg") &&
      !safeMime.includes("html") &&
      !safeMime.includes("xml");

    const safeName = String(mediaFile.fileName || "attachment").replace(/["\r\n]/g, "_");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Security-Policy", "default-src 'none'; media-src 'self' blob: data:; img-src 'self' blob: data:; style-src 'unsafe-inline'");
    res.setHeader("Cache-Control", "private, max-age=300, must-revalidate");
    res.setHeader("Content-Type", isSafeInline ? safeMime : "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `${isSafeInline ? "inline" : "attachment"}; filename="${encodeURIComponent(safeName)}"`
    );

    if (fs.existsSync(absPath)) {
      return res.sendFile(absPath);
    }
    return res.send(cloudBuffer!);
  } catch (err: any) {
    return handleChatError(res, err, "Failed to serve attachment");
  }
});

// Require authenticated workspace context for all remaining routes
chatRouter.use(requireAuth, resolveTenantContext);

// GET /api/chat/file-policy - Active file restriction & quota rules
chatRouter.get("/file-policy", async (_req: AuthRequest, res: Response) => {
  return res.json({
    prohibitedExtensions: Array.from(CHAT_RESTRICTED_EXTENSIONS),
    maxFileSizeBytes: MAX_CHAT_FILE_SIZE_BYTES,
    maxAttachmentsPerMessage: MAX_CHAT_ATTACHMENTS_PER_MESSAGE,
    allowedCategories: [
      "Images (png, jpg, jpeg, gif, webp)",
      "Documents (pdf, docx, xlsx, pptx, txt, csv)",
      "Audio & Video (mp3, wav, ogg, m4a, mp4, webm)",
    ],
  });
});

// GET /api/chat/presence - Distributed + local online user IDs in tenant
chatRouter.get("/presence", async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId || "default";
  const onlineUserIds = await getOnlineUsersForTenantAsync(tenantId);
  return res.json({ onlineUserIds });
});

// GET /api/chat/participant/:id - Authoritative participant profile with full HRMS metadata
chatRouter.get("/participant/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Participant ID is required" });
    }

    const [emp, prof, onlineList] = await Promise.all([
      prisma.employee.findFirst({
        where: {
          tenantId,
          OR: [{ id }, { userId: id }],
        },
        select: {
          id: true,
          userId: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          position: true,
          employmentType: true,
          joinedAt: true,
          department: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
          manager: {
            select: {
              id: true,
              userId: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              position: true,
            },
          },
          user: {
            select: {
              profile: {
                select: { id: true, fullName: true, avatarUrl: true },
              },
            },
          },
        },
      }),
      prisma.profile.findFirst({
        where: {
          tenantId,
          OR: [{ userId: id }, { id }],
        },
        include: {
          user: { select: { id: true, email: true } },
        },
      }),
      getOnlineUsersForTenantAsync(tenantId),
    ]);

    if (!emp && !prof) {
      return res.status(404).json({ error: "Participant not found in this tenant workspace." });
    }

    const onlineSet = new Set(onlineList);
    const canonicalUserId = emp?.userId || prof?.userId || id;
    const isOnline = onlineSet.has(canonicalUserId) || onlineSet.has(id);

    const fullName = emp
      ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || prof?.fullName || emp.email
      : prof?.fullName || prof?.user?.email || "Colleague";

    const designation = emp?.designation?.name || emp?.position || "Team Member";
    const department = emp?.department?.name || null;
    const branch = emp?.branch?.name || null;
    const email = emp?.email || prof?.user?.email || "";
    const phone = emp?.phone || prof?.phone || null;
    const avatarUrl = prof?.avatarUrl || emp?.user?.profile?.avatarUrl || null;
    const employeeCode = emp?.employeeCode || null;
    const reportingManager = emp?.manager
      ? {
          id: emp.manager.id,
          userId: emp.manager.userId,
          employeeCode: emp.manager.employeeCode,
          name: `${emp.manager.firstName || ""} ${emp.manager.lastName || ""}`.trim(),
          designation: emp.manager.position || "Manager",
        }
      : null;

    return res.json({
      id: canonicalUserId,
      userId: canonicalUserId,
      employeeId: emp?.id || null,
      employeeCode,
      name: fullName,
      email,
      phone,
      department,
      departmentId: emp?.department?.id || null,
      branch,
      branchId: emp?.branch?.id || null,
      designation,
      reportingManager,
      avatarUrl,
      status: isOnline ? "online" : "offline",
      statusText: isOnline ? "Online" : "Offline",
      employmentType: emp?.employmentType || null,
      joinedAt: emp?.joinedAt || null,
      bio: (prof as any)?.bio || null,
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// GET /api/chat/contacts - Batch-optimized HRMS directory with search, filters & server pagination (zero N+1, no 200 cap)
chatRouter.get("/contacts", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const search = String(req.query.search || req.query.q || "").trim().toLowerCase();
    const departmentIdFilter = String(req.query.departmentId || "").trim();
    const branchIdFilter = String(req.query.branchId || "").trim();
    const paginatedMode = req.query.paginated === "true" || req.query.paginated === "1";
    const hasExplicitPaging = req.query.page !== undefined || req.query.limit !== undefined;
    const pageNum = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limitNum = hasExplicitPaging
      ? Math.min(500, Math.max(1, parseInt(String(req.query.limit || "100"), 10) || 100))
      : 1000;

    const empWhere: any = {
      tenantId,
      status: "active",
      ...(departmentIdFilter ? { departmentId: departmentIdFilter } : {}),
      ...(branchIdFilter ? { branchId: branchIdFilter } : {}),
    };

    const [employees, userProfiles, onlineList] = await Promise.all([
      prisma.employee.findMany({
        where: empWhere,
        select: {
          id: true,
          userId: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          position: true,
          managerId: true,
          department: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
          manager: { select: { id: true, userId: true, firstName: true, lastName: true } },
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      !departmentIdFilter && !branchIdFilter
        ? prisma.profile.findMany({
            where: { tenantId },
            select: {
              id: true,
              userId: true,
              tenantId: true,
              fullName: true,
              phone: true,
              avatarUrl: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  roles: { select: { role: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
      getOnlineUsersForTenantAsync(tenantId),
    ]);

    const onlineSet = new Set(onlineList);
    const profileByUser = new Map<string, any>();
    for (const p of userProfiles) {
      const isPlatformSuperOnly = p.user?.roles?.some((r: any) => r.role === "super_admin") && !p.tenantId;
      if (!isPlatformSuperOnly) {
        profileByUser.set(p.userId, p);
      }
    }

    const contactMap = new Map<string, any>();

    for (const emp of employees) {
      const uId = emp.userId || emp.id;
      if (uId === currentUserId || emp.id === currentUserId) continue;

      const prof = emp.userId ? profileByUser.get(emp.userId) : null;
      const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || prof?.fullName || emp.email;
      const designation = emp.designation?.name || emp.position || "Team Member";
      const department = emp.department?.name || null;
      const branch = emp.branch?.name || null;
      const isOnline = onlineSet.has(uId) || Boolean(emp.userId && onlineSet.has(emp.userId));
      const managerName = emp.manager
        ? `${emp.manager.firstName || ""} ${emp.manager.lastName || ""}`.trim()
        : null;

      contactMap.set(uId, {
        id: uId,
        userId: emp.userId || null,
        employeeId: emp.id,
        employeeCode: emp.employeeCode || null,
        name,
        email: emp.email,
        phone: emp.phone || prof?.phone || null,
        title: designation,
        designation,
        department,
        departmentId: emp.department?.id || null,
        branch,
        branchId: emp.branch?.id || null,
        managerId: emp.managerId || null,
        managerName,
        avatarUrl: prof?.avatarUrl || null,
        status: isOnline ? "online" : "offline",
        statusText: isOnline ? "Online" : "Offline",
      });
    }

    for (const [uId, prof] of profileByUser.entries()) {
      if (uId === currentUserId) continue;
      if (!contactMap.has(uId)) {
        const isOnline = onlineSet.has(uId);
        contactMap.set(uId, {
          id: uId,
          userId: uId,
          employeeId: null,
          employeeCode: null,
          name: prof.fullName || prof.user?.email || "User",
          email: prof.user?.email || "",
          phone: prof.phone || "",
          title: "Workspace Member",
          designation: "Workspace Member",
          department: null,
          departmentId: null,
          branch: null,
          branchId: null,
          managerId: null,
          managerName: null,
          avatarUrl: prof.avatarUrl || null,
          status: isOnline ? "online" : "offline",
          statusText: isOnline ? "Online" : "Offline",
        });
      }
    }

    let contacts = Array.from(contactMap.values());

    if (search) {
      contacts = contacts.filter((c) => {
        return (
          String(c.name || "").toLowerCase().includes(search) ||
          String(c.employeeCode || "").toLowerCase().includes(search) ||
          String(c.email || "").toLowerCase().includes(search) ||
          String(c.designation || "").toLowerCase().includes(search) ||
          String(c.department || "").toLowerCase().includes(search) ||
          String(c.branch || "").toLowerCase().includes(search)
        );
      });
    }

    const total = contacts.length;
    const threadIds = contacts.map((c) => ChatService.canonicalizeDirectThreadId(currentUserId, c.id));
    const { lastMessageMap, unreadCountMap } = await fetchThreadSummariesBatch(tenantId, currentUserId, threadIds);

    const enrichedAll = contacts.map((c) => {
      const threadId = ChatService.canonicalizeDirectThreadId(currentUserId, c.id);
      const lastMsg = lastMessageMap.get(threadId);
      const unreadCount = unreadCountMap.get(threadId) || 0;
      return {
        ...c,
        threadId,
        lastMessage: lastMsg?.content || "",
        time: lastMsg?.createdAt ? lastMsg.createdAt.toISOString() : null,
        unread: unreadCount,
      };
    });

    enrichedAll.sort((a, b) => {
      if (a.time && b.time) return new Date(b.time).getTime() - new Date(a.time).getTime();
      if (a.time) return -1;
      if (b.time) return 1;
      return String(a.name).localeCompare(String(b.name));
    });

    const startIdx = (pageNum - 1) * limitNum;
    const pagedContacts = enrichedAll.slice(startIdx, startIdx + limitNum);
    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    res.setHeader("X-Total-Count", String(total));
    res.setHeader("X-Page", String(pageNum));
    res.setHeader("X-Limit", String(limitNum));
    res.setHeader("X-Total-Pages", String(totalPages));

    if (paginatedMode) {
      return res.json({
        contacts: pagedContacts,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      });
    }

    return res.json(pagedContacts);
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// GET /api/chat/conversations - Batch-optimized active direct & group conversations (zero N+1)
chatRouter.get("/conversations", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const filter = String(req.query.filter || "all").toLowerCase(); // all | unread | archived | muted | groups | direct
    const includeArchived =
      req.query.includeArchived === "true" || req.query.includeArchived === "1" || filter === "archived";
    const paginatedMode = req.query.paginated === "true" || req.query.paginated === "1";
    const hasExplicitPaging = req.query.page !== undefined || req.query.limit !== undefined;
    const pageNum = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limitNum = hasExplicitPaging
      ? Math.min(500, Math.max(1, parseInt(String(req.query.limit || "100"), 10) || 100))
      : 500;

    const db: any = rawPrisma || prisma;

    const [onlineList, userPins, userPrefs, groupMemberships, callerEmp] = await Promise.all([
      getOnlineUsersForTenantAsync(tenantId),
      prisma.chatConversationPin.findMany({
        where: { tenantId, userId: currentUserId },
      }),
      db.chatConversationPreference
        ? db.chatConversationPreference.findMany({
            where: { tenantId, userId: currentUserId },
          })
        : Promise.resolve([]),
      prisma.chatGroupMember.findMany({
        where: { tenantId, userId: currentUserId },
        include: {
          group: {
            include: { members: { select: { userId: true, role: true, isMuted: true, mutedUntil: true } } },
          },
        },
      }),
      prisma.employee.findFirst({
        where: { tenantId, userId: currentUserId },
        select: { id: true },
      }),
    ]);

    const onlineSet = new Set(onlineList);
    const pinnedSet = new Set(userPins.map((p: any) => p.threadId));
    const prefByThread = new Map<string, any>(userPrefs.map((p: any) => [p.threadId, p]));

    // Discover all distinct direct threads involving currentUserId (or caller's employeeId) without a 200-message cap
    const directThreadSet = new Set<string>();
    if (typeof db.$queryRawUnsafe === "function") {
      const patterns = [`direct_${currentUserId}_%`, `direct_%_${currentUserId}`];
      if (callerEmp?.id && callerEmp.id !== currentUserId) {
        patterns.push(`direct_${callerEmp.id}_%`, `direct_%_${callerEmp.id}`);
      }
      const directRows: any[] = await db.$queryRawUnsafe(
        `SELECT DISTINCT thread_id
         FROM chat_messages
         WHERE tenant_id = $1
           AND thread_id LIKE 'direct_%'
           AND (thread_id LIKE ANY($2::text[]))`,
        tenantId,
        patterns
      );
      for (const r of Array.isArray(directRows) ? directRows : []) {
        if (r?.thread_id) directThreadSet.add(r.thread_id);
      }
    } else {
      const fallbackMsgs = await prisma.chatMessage.findMany({
        where: {
          tenantId,
          threadId: { startsWith: "direct_" },
          OR: [{ threadId: { contains: `_${currentUserId}` } }, { threadId: { contains: `${currentUserId}_` } }],
        },
        select: { threadId: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      });
      fallbackMsgs.forEach((m) => directThreadSet.add(m.threadId));
    }

    // Also include direct threads with saved pins or preferences
    for (const p of userPins) {
      if (p.threadId.startsWith("direct_")) directThreadSet.add(p.threadId);
    }
    for (const pref of userPrefs) {
      if (pref.threadId.startsWith("direct_")) directThreadSet.add(pref.threadId);
    }

    // Parse & validate direct threads (strictly 2 tokens)
    const callerIdentities = new Set<string>([currentUserId]);
    if (callerEmp?.id) callerIdentities.add(callerEmp.id);

    const validDirectEntries: Array<{ threadId: string; otherToken: string }> = [];
    for (const tid of directThreadSet) {
      const parts = tid.slice("direct_".length).split("_").filter(Boolean);
      if (parts.length !== 2) continue;
      if (!callerIdentities.has(parts[0]) && !callerIdentities.has(parts[1])) continue;
      const otherToken = callerIdentities.has(parts[0]) ? parts[1] : parts[0];
      validDirectEntries.push({ threadId: tid, otherToken });
    }

    const groupThreadIds = groupMemberships.map((m) => `group_${m.group.id}`);
    const allThreadIds = [...groupThreadIds, ...validDirectEntries.map((d) => d.threadId)];

    const [{ lastMessageMap, unreadCountMap }, { empByKey, profByUserId }] = await Promise.all([
      fetchThreadSummariesBatch(tenantId, currentUserId, allThreadIds),
      resolveParticipantsBatch(
        tenantId,
        validDirectEntries.map((d) => d.otherToken)
      ),
    ]);

    const nowMs = Date.now();

    const groupConversations = groupMemberships.map((m) => {
      const g: any = m.group;
      const threadId = `group_${g.id}`;
      const lastMsg = lastMessageMap.get(threadId);
      const pref = prefByThread.get(threadId);
      const rawUnread = unreadCountMap.get(threadId) || 0;
      const markedUnread = Boolean(pref?.markedUnreadAt);
      const unreadCount = markedUnread ? Math.max(1, rawUnread) : rawUnread;
      const isMuted =
        Boolean(m.isMuted && (!m.mutedUntil || new Date(m.mutedUntil).getTime() > nowMs)) ||
        Boolean(pref?.isMuted && (!pref?.mutedUntil || new Date(pref.mutedUntil).getTime() > nowMs));
      const isArchived = Boolean(pref?.isArchived || g.isArchived);

      return {
        id: g.id,
        groupId: g.id,
        threadId,
        type: "group" as const,
        name: g.name,
        description: g.description,
        avatarUrl: g.avatarUrl || null,
        category: g.category || "custom",
        sourceEntityId: g.sourceEntityId || null,
        isAnnouncementOnly: Boolean(g.isAnnouncementOnly),
        groupIsArchived: Boolean(g.isArchived),
        maxMembers: g.maxMembers || DEFAULT_MAX_GROUP_MEMBERS,
        memberCount: g.members.length,
        members: g.members.map((mem: any) => mem.userId),
        myRole: g.ownerId === currentUserId ? "owner" : m.role || "member",
        createdById: g.createdById,
        ownerId: g.ownerId || g.createdById,
        lastMessage: lastMsg?.content || "",
        lastMessageSender: lastMsg?.senderName || "",
        lastMessageTime: lastMsg?.createdAt || g.createdAt,
        unreadCount,
        markedUnread,
        isPinned: pinnedSet.has(threadId),
        isMuted,
        mutedUntil: pref?.mutedUntil || m.mutedUntil || null,
        isArchived,
        notificationLevel: pref?.notificationLevel || "all",
      };
    });

    const directConversations: any[] = [];
    const seenCanonicalDirectPeers = new Set<string>();

    for (const { threadId, otherToken } of validDirectEntries) {
      const emp = empByKey.get(otherToken);
      const canonicalOtherUserId = emp?.userId || otherToken;
      const prof = profByUserId.get(canonicalOtherUserId) || profByUserId.get(otherToken);

      // Skip orphaned/cross-tenant tokens that do not exist in this workspace
      if (!emp && !prof) continue;

      const dedupeKey = `${threadId}`;
      if (seenCanonicalDirectPeers.has(dedupeKey)) continue;
      seenCanonicalDirectPeers.add(dedupeKey);

      const name = emp
        ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || prof?.fullName || emp.email
        : prof?.fullName || prof?.user?.email || "User";
      const email = emp?.email || prof?.user?.email || "";
      const title = emp?.designation?.name || emp?.position || "Team Member";
      const avatarUrl = prof?.avatarUrl || null;
      const isOnline = onlineSet.has(canonicalOtherUserId) || onlineSet.has(otherToken);

      const lastMsg = lastMessageMap.get(threadId);
      const pref = prefByThread.get(threadId);
      const rawUnread = unreadCountMap.get(threadId) || 0;
      const markedUnread = Boolean(pref?.markedUnreadAt);
      const unreadCount = markedUnread ? Math.max(1, rawUnread) : rawUnread;
      const isMuted = Boolean(pref?.isMuted && (!pref?.mutedUntil || new Date(pref.mutedUntil).getTime() > nowMs));
      const isArchived = Boolean(pref?.isArchived);

      directConversations.push({
        id: canonicalOtherUserId,
        userId: canonicalOtherUserId,
        employeeId: emp?.id || null,
        employeeCode: emp?.employeeCode || null,
        threadId,
        type: "direct" as const,
        name,
        email,
        phone: emp?.phone || prof?.phone || null,
        department: emp?.department?.name || null,
        branch: emp?.branch?.name || null,
        title,
        designation: title,
        avatarUrl,
        status: isOnline ? "online" : "offline",
        statusText: isOnline ? "Online" : "Offline",
        lastMessage: lastMsg?.content || "",
        lastMessageTime: lastMsg?.createdAt || pref?.updatedAt || new Date(0),
        unreadCount,
        markedUnread,
        isPinned: pinnedSet.has(threadId),
        isMuted,
        mutedUntil: pref?.mutedUntil || null,
        isArchived,
        notificationLevel: pref?.notificationLevel || "all",
      });
    }

    let allConversations = [...groupConversations, ...directConversations];

    if (!includeArchived) {
      allConversations = allConversations.filter((c) => !c.isArchived);
    }
    if (filter === "archived") {
      allConversations = allConversations.filter((c) => c.isArchived);
    } else if (filter === "unread") {
      allConversations = allConversations.filter((c) => c.unreadCount > 0 || c.markedUnread);
    } else if (filter === "muted") {
      allConversations = allConversations.filter((c) => c.isMuted);
    } else if (filter === "groups") {
      allConversations = allConversations.filter((c) => c.type === "group");
    } else if (filter === "direct") {
      allConversations = allConversations.filter((c) => c.type === "direct");
    }

    allConversations.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });

    const total = allConversations.length;
    const startIdx = (pageNum - 1) * limitNum;
    const pagedConversations = allConversations.slice(startIdx, startIdx + limitNum);
    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    res.setHeader("X-Total-Count", String(total));
    res.setHeader("X-Page", String(pageNum));
    res.setHeader("X-Total-Pages", String(totalPages));

    if (paginatedMode) {
      return res.json({
        conversations: pagedConversations,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      });
    }

    return res.json(pagedConversations);
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/conversations/direct - Start or open a canonical 1:1 direct conversation
chatRouter.post("/conversations/direct", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const rawTarget = req.body.targetUserId || req.body.participantId || req.body.userId || req.body.contactId;

    if (!rawTarget || typeof rawTarget !== "string") {
      return res.status(400).json({ error: "targetUserId or participantId is required" });
    }

    const resolvedTarget = await ChatService.resolveParticipantUserInTenant(tenantId, rawTarget);
    if (!resolvedTarget) {
      return res.status(404).json({
        error: "Target contact not found in this tenant workspace.",
        code: "CROSS_TENANT_FORBIDDEN",
      });
    }

    const targetUserId = resolvedTarget.userId;
    const [targetUser, targetEmp, onlineList] = await Promise.all([
      prisma.user.findFirst({
        where: { id: targetUserId, profile: { tenantId } },
        include: { profile: true },
      }),
      prisma.employee.findFirst({
        where: { tenantId, OR: [{ userId: targetUserId }, { id: rawTarget }] },
        select: {
          id: true,
          userId: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          position: true,
          department: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
        },
      }),
      getOnlineUsersForTenantAsync(tenantId),
    ]);

    const threadId = ChatService.canonicalizeDirectThreadId(currentUserId, targetUserId);
    const contactName = targetEmp
      ? `${targetEmp.firstName || ""} ${targetEmp.lastName || ""}`.trim() || targetEmp.email
      : targetUser?.profile?.fullName || targetUser?.email || "User";
    const designation = targetEmp?.designation?.name || targetEmp?.position || "Team Member";

    return res.json({
      threadId,
      targetUserId,
      otherParticipantId: targetUserId,
      title: contactName,
      name: contactName,
      avatarUrl: targetUser?.profile?.avatarUrl || null,
      email: targetEmp?.email || targetUser?.email,
      phone: targetEmp?.phone || targetUser?.profile?.phone || null,
      department: targetEmp?.department?.name || null,
      branch: targetEmp?.branch?.name || null,
      designation,
      employeeCode: targetEmp?.employeeCode || null,
      status: onlineList.includes(targetUserId) ? "online" : "offline",
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// ============================================================================
// CONVERSATION PREFERENCES (Pin, Mute, Archive, Mark Unread, Notification Level)
// ============================================================================

// GET /api/chat/conversations/preferences - All conversation preferences for caller
chatRouter.get("/conversations/preferences", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const db: any = rawPrisma || prisma;
    const prefs = db.chatConversationPreference
      ? await db.chatConversationPreference.findMany({
          where: { tenantId, userId: currentUserId },
        })
      : [];
    return res.json({ preferences: prefs });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// PATCH & POST /api/chat/conversations/:threadId/preferences - Update Mute / Archive / Unread / Notification settings
const handleUpdateConversationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { threadId } = req.params;

    const authCheck = await ChatService.authorizeThread({
      threadId,
      tenantId,
      userId: currentUserId,
      roles: req.user?.roles,
      allowAdminModeration: false,
    });
    if (!authCheck.authorized) {
      return res.status(authCheck.status || 403).json({
        error: authCheck.reason || "Unauthorized conversation.",
        code: authCheck.code || "CHAT_UNAUTHORIZED",
      });
    }

    const { isMuted, durationHours, mutedUntil, isArchived, markedUnread, notificationLevel } = req.body || {};
    const db: any = rawPrisma || prisma;

    const existing = await db.chatConversationPreference.findUnique({
      where: {
        tenantId_userId_threadId: {
          tenantId,
          userId: currentUserId,
          threadId,
        },
      },
    });

    const updateData: any = {};
    if (typeof isMuted === "boolean") {
      updateData.isMuted = isMuted;
      if (isMuted) {
        updateData.mutedUntil = mutedUntil
          ? new Date(mutedUntil)
          : durationHours
            ? new Date(Date.now() + Number(durationHours) * 3600 * 1000)
            : null;
      } else {
        updateData.mutedUntil = null;
      }
    }

    if (typeof isArchived === "boolean") {
      updateData.isArchived = isArchived;
      updateData.archivedAt = isArchived ? new Date() : null;
    }

    if (typeof markedUnread === "boolean") {
      updateData.markedUnreadAt = markedUnread ? new Date() : null;
    }

    if (typeof notificationLevel === "string" && ["all", "mentions", "none"].includes(notificationLevel)) {
      updateData.notificationLevel = notificationLevel;
    }

    const saved = await db.chatConversationPreference.upsert({
      where: {
        tenantId_userId_threadId: {
          tenantId,
          userId: currentUserId,
          threadId,
        },
      },
      create: {
        tenantId,
        userId: currentUserId,
        threadId,
        isMuted: updateData.isMuted ?? false,
        mutedUntil: updateData.mutedUntil ?? null,
        isArchived: updateData.isArchived ?? false,
        archivedAt: updateData.archivedAt ?? null,
        markedUnreadAt: updateData.markedUnreadAt ?? null,
        notificationLevel: updateData.notificationLevel ?? "all",
      },
      update: updateData,
    });

    // Keep ChatGroupMember mute columns synchronized for group threads
    if (authCheck.threadType === "group" && authCheck.membership?.id && typeof isMuted === "boolean") {
      await prisma.chatGroupMember
        .update({
          where: { id: authCheck.membership.id },
          data: {
            isMuted: saved.isMuted,
            mutedUntil: saved.mutedUntil,
          },
        })
        .catch(() => {});
    }

    // If explicitly marked read via preferences, synchronize read receipt
    if (markedUnread === false && existing?.markedUnreadAt) {
      await ChatService.markThreadRead({
        tenantId,
        userId: currentUserId,
        roles: req.user?.roles,
        threadId,
      }).catch(() => {});
    }

    broadcastToUser(currentUserId, "chat:preference_updated", {
      threadId,
      preference: saved,
    });

    return res.json({
      success: true,
      threadId,
      preference: saved,
      isMuted: saved.isMuted,
      mutedUntil: saved.mutedUntil,
      isArchived: saved.isArchived,
      markedUnread: Boolean(saved.markedUnreadAt),
      notificationLevel: saved.notificationLevel,
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
};

chatRouter.patch("/conversations/:threadId/preferences", handleUpdateConversationPreferences);
chatRouter.post("/conversations/:threadId/preferences", handleUpdateConversationPreferences);

// POST /api/chat/conversations/:threadId/pin - Toggle pin for current user (with strict thread authorization)
chatRouter.post("/conversations/:threadId/pin", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { threadId } = req.params;

    const authCheck = await ChatService.authorizeThread({
      threadId,
      tenantId,
      userId: currentUserId,
      roles: req.user?.roles,
      allowAdminModeration: false,
    });
    if (!authCheck.authorized) {
      return res.status(authCheck.status || 403).json({
        error: authCheck.reason || "Access denied: Cannot pin an unauthorized conversation.",
        code: authCheck.code || "CHAT_UNAUTHORIZED",
      });
    }

    const existing = await prisma.chatConversationPin.findUnique({
      where: {
        tenantId_userId_threadId: {
          tenantId,
          userId: currentUserId,
          threadId,
        },
      },
    });

    if (existing) {
      await prisma.chatConversationPin.delete({ where: { id: existing.id } });
      broadcastToUser(currentUserId, "chat:conversation_pinned", { threadId, isPinned: false });
      return res.json({ isPinned: false, message: "Conversation unpinned." });
    } else {
      await prisma.chatConversationPin.create({
        data: { tenantId, userId: currentUserId, threadId },
      });
      broadcastToUser(currentUserId, "chat:conversation_pinned", { threadId, isPinned: true });
      return res.json({ isPinned: true, message: "Conversation pinned." });
    }
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// GET /api/chat/conversations/pinned - Get all pinned conversation thread IDs for current user
chatRouter.get("/conversations/pinned", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";

    const pins = await prisma.chatConversationPin.findMany({
      where: { tenantId, userId: currentUserId },
      orderBy: { pinnedAt: "desc" },
    });

    return res.json(pins.map((p) => p.threadId));
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// ============================================================================
// GROUP CHAT & HRMS DYNAMIC GROUP HELPERS (Section 4 & Section 9)
// ============================================================================

// GET /api/chat/groups - Batch-optimized groups for current user (zero N+1)
chatRouter.get("/groups", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const search = String(req.query.search || "").trim();
    const includeArchived = req.query.includeArchived === "true" || req.query.includeArchived === "1";

    const db: any = rawPrisma || prisma;
    const [userPins, userPrefs, groups] = await Promise.all([
      prisma.chatConversationPin.findMany({
        where: { tenantId, userId: currentUserId },
      }),
      db.chatConversationPreference
        ? db.chatConversationPreference.findMany({
            where: { tenantId, userId: currentUserId, threadId: { startsWith: "group_" } },
          })
        : Promise.resolve([]),
      prisma.chatGroup.findMany({
        where: {
          tenantId,
          members: { some: { userId: currentUserId } },
          ...(includeArchived ? {} : { isArchived: false }),
          ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        } as any,
        include: { members: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const pinnedSet = new Set(userPins.map((p) => p.threadId));
    const prefByThread = new Map<string, any>(userPrefs.map((p: any) => [p.threadId, p]));

    const allMemberUserIds = Array.from(
      new Set(groups.flatMap((g) => g.members.map((m) => m.userId)))
    );
    const groupThreadIds = groups.map((g) => `group_${g.id}`);

    const [{ empByKey, profByUserId }, { lastMessageMap, unreadCountMap }] = await Promise.all([
      resolveParticipantsBatch(tenantId, allMemberUserIds),
      fetchThreadSummariesBatch(tenantId, currentUserId, groupThreadIds),
    ]);

    const enrichedGroups = groups.map((g: any) => {
      const threadId = `group_${g.id}`;
      const lastMsg = lastMessageMap.get(threadId);
      const unreadCount = unreadCountMap.get(threadId) || 0;
      const userMembership = g.members.find((m: any) => m.userId === currentUserId);
      const pref = prefByThread.get(threadId);

      const richMembers = g.members.map((mem: any) => {
        const emp = empByKey.get(mem.userId);
        const prof = profByUserId.get(mem.userId);
        const displayName = emp
          ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email
          : prof?.fullName || "Member";

        return {
          id: mem.id,
          userId: mem.userId,
          role: g.ownerId === mem.userId ? "owner" : mem.role || "member",
          isMuted: mem.isMuted,
          name: displayName,
          email: emp?.email || prof?.user?.email || "",
          avatarUrl: prof?.avatarUrl || null,
          department: emp?.department?.name || null,
          branch: emp?.branch?.name || null,
          designation: emp?.designation?.name || emp?.position || "Team Member",
        };
      });

      return {
        id: g.id,
        groupId: g.id,
        threadId,
        name: g.name,
        description: g.description,
        avatarUrl: g.avatarUrl,
        category: g.category || "custom",
        sourceEntityId: g.sourceEntityId || null,
        isAnnouncementOnly: Boolean(g.isAnnouncementOnly),
        isArchived: Boolean(g.isArchived),
        maxMembers: g.maxMembers || DEFAULT_MAX_GROUP_MEMBERS,
        hasActiveInvite: Boolean(g.inviteToken && g.inviteExpiresAt && new Date(g.inviteExpiresAt).getTime() > Date.now()),
        memberCount: g.members.length,
        members: richMembers,
        myRole: g.ownerId === currentUserId ? "owner" : userMembership?.role || "member",
        createdById: g.createdById,
        ownerId: g.ownerId || g.createdById,
        lastMessage: lastMsg?.content || "",
        lastMessageSender: lastMsg?.senderName || "",
        time: lastMsg?.createdAt || g.createdAt,
        unread: unreadCount,
        unreadCount,
        isPinned: pinnedSet.has(threadId),
        isMuted: Boolean(userMembership?.isMuted || pref?.isMuted),
        isConversationArchived: Boolean(pref?.isArchived),
      };
    });

    enrichedGroups.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });

    return res.json(enrichedGroups);
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/groups - Create a new group with strict tenant-member validation & member-only emission (Section 2.5)
chatRouter.post("/groups", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const {
      name,
      description,
      avatarUrl,
      memberIds = [],
      category = "custom",
      isAnnouncementOnly = false,
      maxMembers = DEFAULT_MAX_GROUP_MEMBERS,
    } = req.body;

    if (!ChatService.hasChatPermission(req.user, "chat.create_group")) {
      return res.status(403).json({ error: "You do not have permission to create chat groups." });
    }

    const wantAnnouncement = Boolean(isAnnouncementOnly || category === "announcement");
    if (wantAnnouncement && !ChatService.hasChatPermission(req.user, "chat.announcements")) {
      return res.status(403).json({
        error: "Only HR or workspace administrators can create official announcement channels.",
        code: "ANNOUNCEMENT_ADMIN_REQUIRED",
      });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Group name is required." });
    }
    if (name.trim().length > 150) {
      return res.status(400).json({ error: "Group name cannot exceed 150 characters." });
    }

    const submittedIds = Array.isArray(memberIds)
      ? memberIds.map((id: any) => String(id || "").trim()).filter(Boolean)
      : [];

    // Resolve & validate EVERY submitted user belongs to this tenant (reject cross-tenant or invalid IDs!)
    const resolvedMemberUserIds = new Set<string>([currentUserId]);
    const invalidIds: string[] = [];

    for (const candidateId of submittedIds) {
      if (candidateId === currentUserId) continue;
      const resolved = await ChatService.resolveParticipantUserInTenant(tenantId, candidateId);
      if (!resolved) {
        invalidIds.push(candidateId);
      } else {
        resolvedMemberUserIds.add(resolved.userId);
      }
    }

    if (invalidIds.length > 0) {
      return res.status(403).json({
        error: `Cannot add users outside your workspace or invalid user IDs: ${invalidIds.slice(0, 5).join(", ")}`,
        code: "CROSS_TENANT_MEMBER_REJECTED",
        invalidIds,
      });
    }

    const cappedMaxMembers = Math.min(500, Math.max(2, Number(maxMembers) || DEFAULT_MAX_GROUP_MEMBERS));
    const uniqueMembers = Array.from(resolvedMemberUserIds);

    if (uniqueMembers.length > cappedMaxMembers) {
      return res.status(400).json({
        error: `Group cannot exceed ${cappedMaxMembers} members.`,
        code: "GROUP_MEMBER_LIMIT_EXCEEDED",
      });
    }

    const allowedCategories = new Set([
      "custom",
      "department",
      "branch",
      "project",
      "leadership",
      "hr",
      "management",
      "announcement",
    ]);
    const safeCategory = allowedCategories.has(String(category)) ? String(category) : "custom";

    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.chatGroup.create({
        data: {
          tenantId,
          name: name.trim(),
          description: description?.trim() || null,
          avatarUrl: avatarUrl?.trim() || null,
          createdById: currentUserId,
          ownerId: currentUserId,
          category: safeCategory,
          isAnnouncementOnly: wantAnnouncement,
          maxMembers: cappedMaxMembers,
        } as any,
      });

      await tx.chatGroupMember.createMany({
        data: uniqueMembers.map((uid) => ({
          tenantId,
          groupId: created.id,
          userId: uid,
          role: uid === currentUserId ? "owner" : "member",
        })),
        skipDuplicates: true,
      });

      const creatorProfile = await tx.profile.findFirst({
        where: { userId: currentUserId, tenantId },
        select: { fullName: true },
      });
      const creatorName = cleanPersonName(creatorProfile?.fullName || req.user?.email?.split("@")[0] || "User");

      await recordSystemEvent(
        tenantId,
        `group_${created.id}`,
        currentUserId,
        "group_created",
        `${creatorName} created the group "${name.trim()}"`,
        { groupName: name.trim(), category: safeCategory },
        tx
      );

      return created;
    });

    const fullGroup = await prisma.chatGroup.findUnique({
      where: { id: group.id },
      include: { members: true },
    });

    // Emit group_created STRICTLY to the group's authorized members (never tenant-wide!)
    await ChatService.emitToAuthorizedThread({
      tenantId,
      threadId: `group_${group.id}`,
      event: "chat:group_created",
      payload: { group: fullGroup },
      participantUserIds: uniqueMembers,
    });

    return res.status(201).json(fullGroup);
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// GET /api/chat/hrms/group-templates - Discover Department, Branch, Project & Role cohorts for dynamic group creation
chatRouter.get("/hrms/group-templates", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";

    const [departments, branches, projects, activeEmployees, existingDynamicGroups] = await Promise.all([
      prisma.department.findMany({
        where: { tenantId, status: "active" },
        select: { id: true, name: true, description: true },
        orderBy: { name: "asc" },
      }),
      prisma.branch.findMany({
        where: { tenantId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.project.findMany({
        where: { tenantId, status: { not: "cancelled" } },
        select: { id: true, name: true, status: true },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
      prisma.employee.findMany({
        where: { tenantId, status: "active", userId: { not: null } },
        select: {
          id: true,
          userId: true,
          departmentId: true,
          branchId: true,
          managerId: true,
          position: true,
          department: { select: { name: true } },
          subordinates: { select: { id: true }, take: 1 },
        },
      }),
      prisma.chatGroup.findMany({
        where: { tenantId, category: { not: "custom" }, isArchived: false } as any,
        select: { id: true, name: true, category: true, sourceEntityId: true },
      }),
    ]);

    const groupLookup = new Map<string, any>();
    for (const g of existingDynamicGroups as any[]) {
      groupLookup.set(`${g.category}:${g.sourceEntityId || g.category}`, g);
    }

    const deptCounts = new Map<string, number>();
    const branchCounts = new Map<string, number>();
    let leadershipCount = 0;
    let managementCount = 0;
    let hrCount = 0;

    for (const emp of activeEmployees) {
      if (emp.departmentId) deptCounts.set(emp.departmentId, (deptCounts.get(emp.departmentId) || 0) + 1);
      if (emp.branchId) branchCounts.set(emp.branchId, (branchCounts.get(emp.branchId) || 0) + 1);
      const pos = String(emp.position || "").toLowerCase();
      const deptName = String(emp.department?.name || "").toLowerCase();
      if (!emp.managerId || /(chief|ceo|cto|cfo|coo|vp|vice president|director|head|founder)/i.test(pos)) {
        leadershipCount++;
      }
      if ((emp.subordinates && emp.subordinates.length > 0) || /(manager|lead|supervisor|director|head)/i.test(pos)) {
        managementCount++;
      }
      if (deptName.includes("hr") || deptName.includes("human resource") || deptName.includes("people") || /\bhr\b/i.test(pos)) {
        hrCount++;
      }
    }

    const deptItems = departments.map((d) => ({
      id: d.id,
      sourceEntityId: d.id,
      templateType: "department",
      category: "department",
      name: d.name,
      description: d.description,
      memberCount: deptCounts.get(d.id) || 0,
      existingGroup: groupLookup.get(`department:${d.id}`) || null,
    }));
    const branchItems = branches.map((b) => ({
      id: b.id,
      sourceEntityId: b.id,
      templateType: "branch",
      category: "branch",
      name: b.name,
      memberCount: branchCounts.get(b.id) || 0,
      existingGroup: groupLookup.get(`branch:${b.id}`) || null,
    }));
    const projectItems = projects.map((p) => ({
      id: p.id,
      sourceEntityId: p.id,
      templateType: "project",
      category: "project",
      name: p.name,
      status: p.status,
      existingGroup: groupLookup.get(`project:${p.id}`) || null,
    }));
    const cohortItems = [
      {
        type: "leadership",
        templateType: "leadership",
        category: "leadership",
        sourceEntityId: "cohort_leadership",
        name: "Executive & Leadership Team",
        memberCount: leadershipCount,
        existingGroup: groupLookup.get("leadership:cohort_leadership") || null,
      },
      {
        type: "management",
        templateType: "management",
        category: "management",
        sourceEntityId: "cohort_management",
        name: "People Managers & Leads",
        memberCount: managementCount,
        existingGroup: groupLookup.get("management:cohort_management") || null,
      },
      {
        type: "hr",
        templateType: "hr",
        category: "hr",
        sourceEntityId: "cohort_hr",
        name: "HR & People Operations",
        memberCount: hrCount,
        existingGroup: groupLookup.get("hr:cohort_hr") || null,
      },
    ];

    return res.json({
      departments: deptItems,
      branches: branchItems,
      projects: projectItems,
      cohorts: cohortItems,
      special: cohortItems,
      templates: [...deptItems, ...branchItems, ...projectItems, ...cohortItems],
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/hrms/groups/from-org - Idempotently create or sync an HRMS organization group without duplicates
chatRouter.post("/hrms/groups/from-org", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const {
      templateType,
      sourceEntityId,
      name: customName,
      description: customDesc,
      syncMembers = true,
      isAnnouncementOnly = false,
    } = req.body;

    if (!ChatService.hasChatPermission(req.user, "chat.create_group")) {
      return res.status(403).json({ error: "You do not have permission to create organization groups." });
    }

    const validTypes = ["department", "branch", "project", "leadership", "hr", "management"];
    if (!templateType || !validTypes.includes(templateType)) {
      return res.status(400).json({ error: `templateType must be one of: ${validTypes.join(", ")}` });
    }

    let resolvedName = typeof customName === "string" && customName.trim() ? customName.trim() : "";
    let resolvedDesc = typeof customDesc === "string" && customDesc.trim() ? customDesc.trim() : "";
    let effectiveSourceId = typeof sourceEntityId === "string" && sourceEntityId.trim() ? sourceEntityId.trim() : `cohort_${templateType}`;
    const memberUserIdSet = new Set<string>([currentUserId]);

    if (templateType === "department") {
      if (!sourceEntityId) return res.status(400).json({ error: "sourceEntityId (departmentId) is required." });
      const dept = await prisma.department.findFirst({ where: { id: sourceEntityId, tenantId } });
      if (!dept) return res.status(404).json({ error: "Department not found in your workspace." });
      effectiveSourceId = dept.id;
      resolvedName = resolvedName || `${dept.name} Department`;
      resolvedDesc = resolvedDesc || dept.description || `Official ${dept.name} department channel`;
      const emps = await prisma.employee.findMany({
        where: { tenantId, departmentId: dept.id, status: "active", userId: { not: null } },
        select: { userId: true },
      });
      emps.forEach((e) => e.userId && memberUserIdSet.add(e.userId));
    } else if (templateType === "branch") {
      if (!sourceEntityId) return res.status(400).json({ error: "sourceEntityId (branchId) is required." });
      const branch = await prisma.branch.findFirst({ where: { id: sourceEntityId, tenantId } });
      if (!branch) return res.status(404).json({ error: "Branch not found in your workspace." });
      effectiveSourceId = branch.id;
      resolvedName = resolvedName || `${branch.name} Branch`;
      resolvedDesc = resolvedDesc || `Branch collaboration group for ${branch.name}`;
      const emps = await prisma.employee.findMany({
        where: { tenantId, branchId: branch.id, status: "active", userId: { not: null } },
        select: { userId: true },
      });
      emps.forEach((e) => e.userId && memberUserIdSet.add(e.userId));
    } else if (templateType === "project") {
      if (!sourceEntityId) return res.status(400).json({ error: "sourceEntityId (projectId) is required." });
      const project = await prisma.project.findFirst({ where: { id: sourceEntityId, tenantId } });
      if (!project) return res.status(404).json({ error: "Project not found in your workspace." });
      effectiveSourceId = project.id;
      resolvedName = resolvedName || `Project: ${project.name}`;
      resolvedDesc = resolvedDesc || project.description || `Project team workspace for ${project.name}`;
      const [tasks, timesheets] = await Promise.all([
        prisma.projectTask.findMany({
          where: { tenantId, projectId: project.id, assignedTo: { not: null } },
          select: { assignedTo: true },
        }),
        prisma.timesheet.findMany({
          where: { tenantId, projectId: project.id },
          select: { employeeId: true },
          take: 200,
        }),
      ]);
      const candidateTokens = new Set<string>();
      tasks.forEach((t) => t.assignedTo && candidateTokens.add(t.assignedTo));
      timesheets.forEach((ts) => ts.employeeId && candidateTokens.add(ts.employeeId));
      if (candidateTokens.size > 0) {
        const emps = await prisma.employee.findMany({
          where: {
            tenantId,
            status: "active",
            userId: { not: null },
            OR: [
              { id: { in: Array.from(candidateTokens) } },
              { userId: { in: Array.from(candidateTokens) } },
              { email: { in: Array.from(candidateTokens) } },
            ],
          },
          select: { userId: true },
        });
        emps.forEach((e) => e.userId && memberUserIdSet.add(e.userId));
      }
    } else {
      const emps = await prisma.employee.findMany({
        where: { tenantId, status: "active", userId: { not: null } },
        select: {
          userId: true,
          managerId: true,
          position: true,
          department: { select: { name: true } },
          subordinates: { select: { id: true }, take: 1 },
        },
      });
      if (templateType === "leadership") {
        resolvedName = resolvedName || "Executive & Leadership Team";
        resolvedDesc = resolvedDesc || "Organization leadership & department heads";
        for (const emp of emps) {
          const pos = String(emp.position || "");
          if ((!emp.managerId || /(chief|ceo|cto|cfo|coo|vp|vice president|director|head|founder)/i.test(pos)) && emp.userId) {
            memberUserIdSet.add(emp.userId);
          }
        }
      } else if (templateType === "management") {
        resolvedName = resolvedName || "People Managers & Leads";
        resolvedDesc = resolvedDesc || "Reporting managers and team leads across departments";
        for (const emp of emps) {
          const pos = String(emp.position || "");
          if (((emp.subordinates && emp.subordinates.length > 0) || /(manager|lead|supervisor|director|head)/i.test(pos)) && emp.userId) {
            memberUserIdSet.add(emp.userId);
          }
        }
      } else if (templateType === "hr") {
        resolvedName = resolvedName || "HR & People Operations";
        resolvedDesc = resolvedDesc || "Human Resources & People Operations team";
        for (const emp of emps) {
          const deptName = String(emp.department?.name || "").toLowerCase();
          const pos = String(emp.position || "");
          if ((deptName.includes("hr") || deptName.includes("human resource") || deptName.includes("people") || /\bhr\b/i.test(pos)) && emp.userId) {
            memberUserIdSet.add(emp.userId);
          }
        }
      }
    }

    const cappedMembers = Array.from(memberUserIdSet).slice(0, DEFAULT_MAX_GROUP_MEMBERS);

    // Check if dynamic group already exists for (tenantId, category, sourceEntityId) -> prevent duplicate creation!
    const existingGroup: any = await prisma.chatGroup.findFirst({
      where: {
        tenantId,
        category: templateType,
        sourceEntityId: effectiveSourceId,
        isArchived: false,
      } as any,
      include: { members: true },
    });

    if (existingGroup) {
      let syncedAddedCount = 0;
      if (syncMembers) {
        const existingSet = new Set(existingGroup.members.map((m: any) => m.userId));
        const toAdd = cappedMembers
          .filter((uid) => !existingSet.has(uid))
          .slice(0, Math.max(0, (existingGroup.maxMembers || DEFAULT_MAX_GROUP_MEMBERS) - existingGroup.members.length));

        if (toAdd.length > 0) {
          await prisma.chatGroupMember.createMany({
            data: toAdd.map((uid) => ({
              tenantId,
              groupId: existingGroup.id,
              userId: uid,
              role: "member",
            })),
            skipDuplicates: true,
          });
          syncedAddedCount = toAdd.length;
        }
      }

      const refreshed = await prisma.chatGroup.findUnique({
        where: { id: existingGroup.id },
        include: { members: true },
      });

      if (syncedAddedCount > 0 && refreshed) {
        await ChatService.emitToAuthorizedThread({
          tenantId,
          threadId: `group_${existingGroup.id}`,
          event: "chat:group_updated",
          payload: { groupId: existingGroup.id, group: refreshed },
          participantUserIds: refreshed.members.map((m) => m.userId),
        });
      }

      return res.status(200).json({
        created: false,
        syncedAddedCount,
        group: refreshed,
      });
    }

    const createdGroup = await prisma.$transaction(async (tx) => {
      const g = await tx.chatGroup.create({
        data: {
          tenantId,
          name: resolvedName.slice(0, 150),
          description: resolvedDesc.slice(0, 500) || null,
          createdById: currentUserId,
          ownerId: currentUserId,
          category: templateType,
          sourceEntityId: effectiveSourceId,
          isAnnouncementOnly: Boolean(isAnnouncementOnly),
          maxMembers: DEFAULT_MAX_GROUP_MEMBERS,
        } as any,
      });

      await tx.chatGroupMember.createMany({
        data: cappedMembers.map((uid) => ({
          tenantId,
          groupId: g.id,
          userId: uid,
          role: uid === currentUserId ? "owner" : "member",
        })),
        skipDuplicates: true,
      });

      const { senderName } = await ChatService.resolveSenderIdentity({ tenantId, userId: currentUserId });
      await recordSystemEvent(
        tenantId,
        `group_${g.id}`,
        currentUserId,
        "group_created",
        `${senderName} created the ${templateType} group "${g.name}"`,
        { category: templateType, sourceEntityId: effectiveSourceId },
        tx
      );

      return g;
    });

    const fullGroup = await prisma.chatGroup.findUnique({
      where: { id: createdGroup.id },
      include: { members: true },
    });

    await ChatService.emitToAuthorizedThread({
      tenantId,
      threadId: `group_${createdGroup.id}`,
      event: "chat:group_created",
      payload: { group: fullGroup },
      participantUserIds: cappedMembers,
    });

    return res.status(201).json({
      created: true,
      syncedAddedCount: cappedMembers.length,
      group: fullGroup,
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// GET /api/chat/groups/:id - Get group details & batch-resolved members
chatRouter.get("/groups/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;

    const group: any = await prisma.chatGroup.findFirst({
      where: { id, tenantId },
      include: { members: true },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    const isMember = group.members.some((m: any) => m.userId === currentUserId);
    if (!isMember) {
      return res.status(403).json({
        error: "Access denied: You are not a member of this group.",
        code: "CHAT_GROUP_MEMBER_REQUIRED",
      });
    }

    const [onlineList, { empByKey, profByUserId }] = await Promise.all([
      getOnlineUsersForTenantAsync(tenantId),
      resolveParticipantsBatch(
        tenantId,
        group.members.map((m: any) => m.userId)
      ),
    ]);
    const onlineSet = new Set(onlineList);

    const richMembers = group.members.map((mem: any) => {
      const emp = empByKey.get(mem.userId);
      const prof = profByUserId.get(mem.userId);
      const displayName = emp
        ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email
        : prof?.fullName || "Member";

      return {
        id: mem.id,
        userId: mem.userId,
        role: group.ownerId === mem.userId ? "owner" : mem.role || "member",
        isMuted: mem.isMuted,
        joinedAt: mem.joinedAt,
        name: displayName,
        email: emp?.email || prof?.user?.email || "",
        avatarUrl: prof?.avatarUrl || null,
        department: emp?.department?.name || null,
        branch: emp?.branch?.name || null,
        designation: emp?.designation?.name || emp?.position || "Team Member",
        status: onlineSet.has(mem.userId) ? "online" : "offline",
      };
    });

    const isRequesterAdmin = richMembers.some(
      (m: any) => m.userId === currentUserId && ["owner", "admin"].includes(m.role)
    );

    return res.json({
      ...group,
      ownerId: group.ownerId || group.createdById,
      // Only expose inviteToken to group owners/admins
      inviteToken: isRequesterAdmin ? group.inviteToken : undefined,
      inviteExpiresAt: isRequesterAdmin ? group.inviteExpiresAt : undefined,
      members: richMembers,
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// GET /api/chat/groups/:id/members - Server-side paginated group member list (Section 10)
chatRouter.get("/groups/:id/members", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;
    const search = String(req.query.search || "").trim().toLowerCase();
    const pageNum = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(req.query.limit || "50"), 10) || 50));

    const authCheck = await ChatService.authorizeThread({
      threadId: `group_${id}`,
      tenantId,
      userId: currentUserId,
      roles: req.user?.roles,
      allowAdminModeration: false,
    });
    if (!authCheck.authorized || !authCheck.group) {
      return res.status(authCheck.status || 403).json({
        error: authCheck.reason || "Access denied.",
        code: authCheck.code || "CHAT_UNAUTHORIZED",
      });
    }

    const members = authCheck.group.members || [];
    const allMembersFull = await prisma.chatGroupMember.findMany({
      where: { tenantId, groupId: id },
      orderBy: { joinedAt: "asc" },
    });

    const [onlineList, { empByKey, profByUserId }] = await Promise.all([
      getOnlineUsersForTenantAsync(tenantId),
      resolveParticipantsBatch(
        tenantId,
        allMembersFull.map((m) => m.userId)
      ),
    ]);
    const onlineSet = new Set(onlineList);

    let rich = allMembersFull.map((mem) => {
      const emp = empByKey.get(mem.userId);
      const prof = profByUserId.get(mem.userId);
      const name = emp
        ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email
        : prof?.fullName || "Member";

      return {
        id: mem.id,
        userId: mem.userId,
        role: authCheck.group.ownerId === mem.userId ? "owner" : mem.role || "member",
        joinedAt: mem.joinedAt,
        name,
        email: emp?.email || prof?.user?.email || "",
        employeeCode: emp?.employeeCode || null,
        avatarUrl: prof?.avatarUrl || null,
        department: emp?.department?.name || null,
        branch: emp?.branch?.name || null,
        designation: emp?.designation?.name || emp?.position || "Team Member",
        status: onlineSet.has(mem.userId) ? "online" : "offline",
      };
    });

    if (search) {
      rich = rich.filter(
        (m) =>
          m.name.toLowerCase().includes(search) ||
          m.email.toLowerCase().includes(search) ||
          String(m.department || "").toLowerCase().includes(search) ||
          String(m.designation || "").toLowerCase().includes(search)
      );
    }

    const total = rich.length;
    const paged = rich.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.json({
      members: paged,
      total,
      totalGroupMembers: members.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// PATCH /api/chat/groups/:id - Update group profile & settings
chatRouter.patch("/groups/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;
    const { name, description, avatarUrl, isAnnouncementOnly, maxMembers } = req.body;

    const group: any = await prisma.chatGroup.findFirst({
      where: { id, tenantId },
      include: { members: true },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    const requesterMember = group.members.find((m: any) => m.userId === currentUserId);
    const isOwner = group.ownerId === currentUserId || group.createdById === currentUserId;
    const isGroupAdmin = requesterMember?.role === "admin" || requesterMember?.role === "owner" || isOwner;
    const isTenantAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));

    if (!isGroupAdmin && !isTenantAdmin) {
      return res.status(403).json({
        error: "Access denied: Only group administrators or owners can edit group settings.",
        code: "CHAT_GROUP_ADMIN_REQUIRED",
      });
    }

    const updatedData: any = {};
    if (typeof name === "string" && name.trim()) updatedData.name = name.trim().slice(0, 150);
    if (typeof description === "string") updatedData.description = description.trim().slice(0, 500) || null;
    if (avatarUrl !== undefined) {
      updatedData.avatarUrl = typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : null;
    }
    if (typeof isAnnouncementOnly === "boolean") {
      updatedData.isAnnouncementOnly = isAnnouncementOnly;
    }
    if (maxMembers !== undefined) {
      updatedData.maxMembers = Math.min(500, Math.max(group.members.length, Number(maxMembers) || DEFAULT_MAX_GROUP_MEMBERS));
    }

    const updated = await prisma.chatGroup.update({
      where: { id },
      data: updatedData,
      include: { members: true },
    });

    const { senderName } = await ChatService.resolveSenderIdentity({ tenantId, userId: currentUserId });
    const changes: string[] = [];
    if (updatedData.name && updatedData.name !== group.name) {
      changes.push(`changed group name to "${updatedData.name}"`);
    }
    if (updatedData.avatarUrl !== undefined && updatedData.avatarUrl !== group.avatarUrl) {
      changes.push(updatedData.avatarUrl ? "updated group photo" : "removed group photo");
    }
    if (updatedData.description !== undefined && updatedData.description !== group.description) {
      changes.push("updated group description");
    }
    if (updatedData.isAnnouncementOnly !== undefined && updatedData.isAnnouncementOnly !== group.isAnnouncementOnly) {
      changes.push(updatedData.isAnnouncementOnly ? "enabled announcement-only mode" : "disabled announcement-only mode");
    }

    await recordSystemEvent(
      tenantId,
      `group_${id}`,
      currentUserId,
      "group_profile_updated",
      `${senderName} ${changes.length > 0 ? changes.join(" and ") : "updated group settings"}`,
      { updatedFields: Object.keys(updatedData) }
    );

    await ChatService.emitToAuthorizedThread({
      tenantId,
      threadId: `group_${id}`,
      event: "chat:group_updated",
      payload: { groupId: id, group: updated },
      participantUserIds: updated.members.map((m) => m.userId),
    });

    return res.json(updated);
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/groups/:id/archive - Archive or unarchive group (owner or HR/workspace admin)
chatRouter.post("/groups/:id/archive", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;
    const { isArchived } = req.body || {};

    const group: any = await prisma.chatGroup.findFirst({
      where: { id, tenantId },
      include: { members: true },
    });
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    const isOwner = group.ownerId === currentUserId || group.createdById === currentUserId;
    const isTenantAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));
    if (!isOwner && !isTenantAdmin) {
      return res.status(403).json({
        error: "Only the group owner or workspace administrator can archive or unarchive this group.",
        code: "CHAT_OWNER_REQUIRED",
      });
    }

    const nextArchived = typeof isArchived === "boolean" ? isArchived : !group.isArchived;
    const updated = await prisma.chatGroup.update({
      where: { id },
      data: { isArchived: nextArchived } as any,
      include: { members: true },
    });

    const { senderName } = await ChatService.resolveSenderIdentity({ tenantId, userId: currentUserId });
    await recordSystemEvent(
      tenantId,
      `group_${id}`,
      currentUserId,
      nextArchived ? "group_archived" : "group_unarchived",
      `${senderName} ${nextArchived ? "archived" : "unarchived"} the group`,
      { isArchived: nextArchived }
    );

    await ChatService.emitToAuthorizedThread({
      tenantId,
      threadId: `group_${id}`,
      event: "chat:group_updated",
      payload: { groupId: id, isArchived: nextArchived, group: updated },
      participantUserIds: updated.members.map((m) => m.userId),
    });

    return res.json({
      success: true,
      isArchived: nextArchived,
      group: updated,
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// DELETE /api/chat/groups/:id - Soft-archive by default (preserves organizational message records per Section 4), or delete empty custom group
chatRouter.delete("/groups/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;

    const group: any = await prisma.chatGroup.findFirst({
      where: { id, tenantId },
      include: { members: true },
    });
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    const isOwner = group.ownerId === currentUserId || group.createdById === currentUserId;
    const isTenantAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));
    if (!isOwner && !isTenantAdmin) {
      return res.status(403).json({
        error: "Only the group owner or workspace administrator can delete or archive this group.",
        code: "CHAT_OWNER_REQUIRED",
      });
    }

    const memberIds = group.members.map((m: any) => m.userId);
    const nonSystemMessageCount = await prisma.chatMessage.count({
      where: { tenantId, threadId: `group_${id}`, isSystemEvent: false },
    });

    // Preserve historical organizational records if messages exist -> archive & revoke invite token
    if (nonSystemMessageCount > 0) {
      const archived = await prisma.chatGroup.update({
        where: { id },
        data: {
          isArchived: true,
          inviteToken: null,
          inviteExpiresAt: null,
        } as any,
      });

      const { senderName } = await ChatService.resolveSenderIdentity({ tenantId, userId: currentUserId });
      await recordSystemEvent(
        tenantId,
        `group_${id}`,
        currentUserId,
        "group_archived",
        `${senderName} closed and archived the group (message history preserved)`,
        { archivedBy: currentUserId }
      );

      await ChatService.emitToAuthorizedThread({
        tenantId,
        threadId: `group_${id}`,
        event: "chat:group_updated",
        payload: { groupId: id, isArchived: true, group: archived },
        participantUserIds: memberIds,
      });

      return res.json({
        success: true,
        mode: "archived",
        message: "Group has been archived and closed while preserving organizational chat history.",
      });
    }

    // Empty group with zero user messages can be cleanly deleted
    await prisma.$transaction([
      prisma.chatMessage.deleteMany({ where: { tenantId, threadId: `group_${id}`, isSystemEvent: true } }),
      prisma.chatGroupMember.deleteMany({ where: { tenantId, groupId: id } }),
      prisma.chatGroup.delete({ where: { id } }),
    ]);

    for (const uid of memberIds) {
      ChatService.evictUserFromThreadRoom(tenantId, `group_${id}`, uid);
      broadcastToUser(uid, "chat:group_deleted", { groupId: id, threadId: `group_${id}` });
    }

    return res.json({
      success: true,
      mode: "deleted",
      message: "Empty group deleted.",
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/groups/:id/members - Add members to group with strict cross-tenant rejection & maxMembers enforcement
chatRouter.post("/groups/:id/members", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;
    const { memberIds = [], userId } = req.body;

    const rawIds: string[] = (Array.isArray(memberIds) && memberIds.length > 0 ? memberIds : userId ? [userId] : [])
      .map((v: any) => String(v || "").trim())
      .filter(Boolean);

    if (rawIds.length === 0) {
      return res.status(400).json({ error: "memberIds array or userId is required." });
    }

    const group: any = await prisma.chatGroup.findFirst({
      where: { id, tenantId },
      include: { members: true },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }
    if (group.isArchived) {
      return res.status(400).json({ error: "Cannot add members to an archived group.", code: "GROUP_ARCHIVED" });
    }

    const requesterMember = group.members.find((m: any) => m.userId === currentUserId);
    const isOwner = group.ownerId === currentUserId || group.createdById === currentUserId;
    const isGroupAdmin = requesterMember?.role === "admin" || requesterMember?.role === "owner" || isOwner;
    const isTenantAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));

    if (!isGroupAdmin && !isTenantAdmin) {
      return res.status(403).json({
        error: "Access denied: Only group admins or tenant admins can add members.",
        code: "CHAT_GROUP_ADMIN_REQUIRED",
      });
    }

    const approvedIds: string[] = [];
    const rejectedIds: string[] = [];
    for (const candidate of rawIds) {
      const resolved = await ChatService.resolveParticipantUserInTenant(tenantId, candidate);
      if (!resolved) {
        rejectedIds.push(candidate);
      } else {
        approvedIds.push(resolved.userId);
      }
    }

    if (rejectedIds.length > 0) {
      return res.status(403).json({
        error: "Access denied: One or more submitted users do not belong to your workspace.",
        code: "CROSS_TENANT_MEMBER_REJECTED",
        rejectedIds,
      });
    }

    const uniqueApprovedIds = Array.from(new Set(approvedIds));
    const newMembers = uniqueApprovedIds.filter((uid) => !group.members.some((m: any) => m.userId === uid));

    const maxCap = group.maxMembers || DEFAULT_MAX_GROUP_MEMBERS;
    if (group.members.length + newMembers.length > maxCap) {
      return res.status(400).json({
        error: `Adding ${newMembers.length} member(s) would exceed the group limit of ${maxCap} members.`,
        code: "GROUP_MEMBER_LIMIT_EXCEEDED",
      });
    }

    if (newMembers.length > 0) {
      await prisma.chatGroupMember.createMany({
        data: newMembers.map((uid) => ({
          tenantId,
          groupId: id,
          userId: uid,
          role: "member",
        })),
        skipDuplicates: true,
      });

      const [{ senderName: actorName }, addedProfiles] = await Promise.all([
        ChatService.resolveSenderIdentity({ tenantId, userId: currentUserId }),
        prisma.profile.findMany({
          where: { userId: { in: newMembers }, tenantId },
          select: { fullName: true },
        }),
      ]);
      const addedNames = formatNaturalList(addedProfiles.map((p) => p.fullName)) || `${newMembers.length} member(s)`;

      await recordSystemEvent(
        tenantId,
        `group_${id}`,
        currentUserId,
        "member_added",
        `${actorName} added ${addedNames}`,
        { addedMemberIds: newMembers, addedNames }
      );
    }

    const updated = await prisma.chatGroup.findUnique({
      where: { id },
      include: { members: true },
    });

    if (newMembers.length > 0 && updated) {
      await ChatService.emitToAuthorizedThread({
        tenantId,
        threadId: `group_${id}`,
        event: "chat:group_updated",
        payload: { groupId: id, addedMemberIds: newMembers, group: updated },
        participantUserIds: updated.members.map((m) => m.userId),
      });
    }

    return res.json({
      ...(updated || {}),
      success: true,
      addedCount: newMembers.length,
      addedMemberIds: newMembers,
      group: updated,
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// DELETE /api/chat/groups/:id/members/:userId - Remove member & immediately revoke room access
chatRouter.delete("/groups/:id/members/:userId", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id, userId } = req.params;

    const group = await prisma.chatGroup.findFirst({
      where: { id, tenantId },
      include: { members: true },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    const isSelf = currentUserId === userId;
    const requesterMember = group.members.find((m) => m.userId === currentUserId);
    const targetMember = group.members.find((m) => m.userId === userId);

    if (!targetMember) {
      return res.status(404).json({ error: "Target user is not a member of this group." });
    }

    const isOwner = group.ownerId === currentUserId || group.createdById === currentUserId;
    const isGroupAdmin = requesterMember?.role === "admin" || requesterMember?.role === "owner" || isOwner;
    const isTenantAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));

    if (!isSelf && !isGroupAdmin && !isTenantAdmin) {
      return res.status(403).json({
        error: "Access denied: Only group admins can remove other members.",
        code: "CHAT_GROUP_ADMIN_REQUIRED",
      });
    }

    const isTargetOwner = group.ownerId === userId || targetMember.role === "owner";
    if (!isSelf && isTargetOwner && !isTenantAdmin) {
      return res.status(403).json({
        error: "Access denied: Group admins cannot remove the group owner.",
        code: "CHAT_OWNER_PROTECTED",
      });
    }

    const otherAdmins = group.members.filter(
      (m) => m.userId !== userId && (m.role === "admin" || m.role === "owner" || group.ownerId === m.userId)
    );

    if (isTargetOwner && group.members.length > 1 && otherAdmins.length === 0) {
      return res.status(400).json({
        error: "Cannot leave or remove as the only group owner/admin. Please transfer ownership to another member first.",
        code: "LAST_ADMIN_SAFETY_VIOLATION",
      });
    }

    await prisma.chatGroupMember.deleteMany({
      where: { groupId: id, userId, tenantId },
    });

    // Immediately revoke Socket.IO room access & notify removed user's active sessions!
    ChatService.evictUserFromThreadRoom(tenantId, `group_${id}`, userId);

    const [{ senderName: actorName }, { senderName: targetName }] = await Promise.all([
      ChatService.resolveSenderIdentity({ tenantId, userId: currentUserId }),
      ChatService.resolveSenderIdentity({ tenantId, userId }),
    ]);

    const eventContent = isSelf ? `${actorName} left the group` : `${actorName} removed ${targetName}`;
    const eventType = isSelf ? "member_left" : "member_removed";

    const remainingMemberIds = group.members.filter((m) => m.userId !== userId).map((m) => m.userId);

    await recordSystemEvent(
      tenantId,
      `group_${id}`,
      currentUserId,
      eventType,
      eventContent,
      { affectedUserId: userId, affectedUserName: targetName }
    );

    await ChatService.emitToAuthorizedThread({
      tenantId,
      threadId: `group_${id}`,
      event: "chat:group_updated",
      payload: { groupId: id, removedMemberId: userId },
      participantUserIds: remainingMemberIds,
    });

    return res.json({ success: true, message: isSelf ? "You have left the group." : "Member removed from group." });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// PATCH /api/chat/groups/:id/members/:userId/role - Manage Member/Moderator/Admin roles
chatRouter.patch("/groups/:id/members/:userId/role", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id, userId } = req.params;
    const { role } = req.body;

    const validRoles = ["owner", "admin", "moderator", "member"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Allowed roles: ${validRoles.join(", ")}` });
    }

    const group = await prisma.chatGroup.findFirst({
      where: { id, tenantId },
      include: { members: true },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    const requesterMember = group.members.find((m) => m.userId === currentUserId);
    const targetMember = group.members.find((m) => m.userId === userId);

    if (!targetMember) {
      return res.status(404).json({ error: "User is not a member of this group." });
    }

    const isRequesterOwner = group.ownerId === currentUserId || requesterMember?.role === "owner";
    const isTenantAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));
    const isRequesterAdmin = requesterMember?.role === "admin";

    if (!isRequesterOwner && !isRequesterAdmin && !isTenantAdmin) {
      return res.status(403).json({
        error: "Access denied: Only group owners or admins can change member roles.",
        code: "CHAT_ROLE_FORBIDDEN",
      });
    }

    if (role === "owner" && !isRequesterOwner && !isTenantAdmin) {
      return res.status(403).json({
        error: "Access denied: Only the current owner can assign owner role (use Transfer Ownership).",
        code: "CHAT_OWNER_REQUIRED",
      });
    }

    if ((targetMember.role === "owner" || group.ownerId === userId) && !isRequesterOwner && !isTenantAdmin) {
      return res.status(403).json({
        error: "Access denied: Cannot change the role of the group owner.",
        code: "CHAT_OWNER_PROTECTED",
      });
    }

    if ((targetMember.role === "owner" || targetMember.role === "admin") && role !== "owner" && role !== "admin") {
      const otherAdmins = group.members.filter(
        (m) => m.userId !== userId && (m.role === "admin" || m.role === "owner" || group.ownerId === m.userId)
      );
      if (otherAdmins.length === 0) {
        return res.status(400).json({
          error: "Cannot demote the last administrator/owner of the group.",
          code: "LAST_ADMIN_SAFETY_VIOLATION",
        });
      }
    }

    await prisma.chatGroupMember.update({
      where: { id: targetMember.id },
      data: { role },
    });

    const [{ senderName: cActor }, { senderName: cTarget }] = await Promise.all([
      ChatService.resolveSenderIdentity({ tenantId, userId: currentUserId }),
      ChatService.resolveSenderIdentity({ tenantId, userId }),
    ]);

    let roleEventText = `${cActor} changed ${cTarget}'s role to ${role}`;
    if (role === "admin") roleEventText = `${cActor} made ${cTarget} a group admin`;
    else if (role === "moderator") roleEventText = `${cActor} made ${cTarget} a group moderator`;
    else if (role === "member") roleEventText = `${cActor} removed ${cTarget}'s admin privileges`;

    await recordSystemEvent(
      tenantId,
      `group_${id}`,
      currentUserId,
      "role_changed",
      roleEventText,
      { affectedUserId: userId, affectedUserName: cTarget, newRole: role }
    );

    await ChatService.emitToAuthorizedThread({
      tenantId,
      threadId: `group_${id}`,
      event: "chat:group_updated",
      payload: { groupId: id, userId, role },
      participantUserIds: group.members.map((m) => m.userId),
    });

    return res.json({ success: true, message: roleEventText, newRole: role });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/groups/:id/transfer-ownership - Transfer group ownership transactionally
chatRouter.post("/groups/:id/transfer-ownership", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;
    const { newOwnerId } = req.body;

    if (!newOwnerId || typeof newOwnerId !== "string") {
      return res.status(400).json({ error: "newOwnerId is required." });
    }

    const group = await prisma.chatGroup.findFirst({
      where: { id, tenantId },
      include: { members: true },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    const isOwner = group.ownerId === currentUserId || group.createdById === currentUserId;
    const isTenantAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));

    if (!isOwner && !isTenantAdmin) {
      return res.status(403).json({
        error: "Access denied: Only the group owner can transfer ownership.",
        code: "CHAT_OWNER_REQUIRED",
      });
    }

    const targetMember = group.members.find((m) => m.userId === newOwnerId);
    if (!targetMember) {
      return res.status(400).json({ error: "The designated new owner must be an active member of this group." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.chatGroup.update({
        where: { id },
        data: { ownerId: newOwnerId },
      });

      await tx.chatGroupMember.update({
        where: { id: targetMember.id },
        data: { role: "owner" },
      });

      const prevOwnerMember = group.members.find((m) => m.userId === currentUserId);
      if (prevOwnerMember && prevOwnerMember.id !== targetMember.id) {
        await tx.chatGroupMember.update({
          where: { id: prevOwnerMember.id },
          data: { role: "admin" },
        });
      }

      const [{ senderName: actorName }, { senderName: targetName }] = await Promise.all([
        ChatService.resolveSenderIdentity({ tenantId, userId: currentUserId }),
        ChatService.resolveSenderIdentity({ tenantId, userId: newOwnerId }),
      ]);

      await recordSystemEvent(
        tenantId,
        `group_${id}`,
        currentUserId,
        "ownership_transferred",
        `${actorName} transferred group ownership to ${targetName}`,
        { oldOwnerId: currentUserId, newOwnerId, oldOwnerName: actorName, newOwnerName: targetName },
        tx
      );
    });

    await ChatService.emitToAuthorizedThread({
      tenantId,
      threadId: `group_${id}`,
      event: "chat:group_updated",
      payload: { groupId: id, newOwnerId },
      participantUserIds: group.members.map((m) => m.userId),
    });

    return res.json({ success: true, message: "Ownership successfully transferred.", newOwnerId });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/groups/:id/leave - Leave group with last-admin safety & immediate room eviction
chatRouter.post("/groups/:id/leave", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;

    const group = await prisma.chatGroup.findFirst({
      where: { id, tenantId },
      include: { members: true },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    const currentMember = group.members.find((m) => m.userId === currentUserId);
    if (!currentMember) {
      return res.status(400).json({ error: "You are not a member of this group." });
    }

    const isOwner = group.ownerId === currentUserId || currentMember.role === "owner";
    const otherAdmins = group.members.filter(
      (m) => m.userId !== currentUserId && (m.role === "admin" || m.role === "owner" || group.ownerId === m.userId)
    );

    if (isOwner && group.members.length > 1 && otherAdmins.length === 0) {
      return res.status(400).json({
        error: "You are the only owner/admin of this group. You must transfer ownership to another member before leaving.",
        code: "LAST_ADMIN_SAFETY_VIOLATION",
      });
    }

    await prisma.chatGroupMember.deleteMany({
      where: { groupId: id, userId: currentUserId, tenantId },
    });

    // Immediately evict caller's sockets from the group room!
    ChatService.evictUserFromThreadRoom(tenantId, `group_${id}`, currentUserId);

    const { senderName: actorName } = await ChatService.resolveSenderIdentity({ tenantId, userId: currentUserId });
    const remainingMemberIds = group.members.filter((m) => m.userId !== currentUserId).map((m) => m.userId);

    await recordSystemEvent(
      tenantId,
      `group_${id}`,
      currentUserId,
      "member_left",
      `${actorName} left the group.`,
      { leftUserId: currentUserId, leftUserName: actorName }
    );

    await ChatService.emitToAuthorizedThread({
      tenantId,
      threadId: `group_${id}`,
      event: "chat:group_updated",
      payload: { groupId: id, removedMemberId: currentUserId },
      participantUserIds: remainingMemberIds,
    });

    return res.json({ success: true, message: "You have left the group." });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/groups/:id/mute - Toggle or set mute preference (synced with ChatConversationPreference)
chatRouter.post("/groups/:id/mute", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;
    const { isMuted, durationHours } = req.body;

    const membership = await prisma.chatGroupMember.findFirst({
      where: { groupId: id, userId: currentUserId, tenantId },
    });

    if (!membership) {
      return res.status(404).json({ error: "You are not a member of this group." });
    }

    const nextMuted = typeof isMuted === "boolean" ? isMuted : !membership.isMuted;
    const mutedUntil = nextMuted && durationHours ? new Date(Date.now() + Number(durationHours) * 3600 * 1000) : null;
    const threadId = `group_${id}`;
    const db: any = rawPrisma || prisma;

    const [updated] = await Promise.all([
      prisma.chatGroupMember.update({
        where: { id: membership.id },
        data: { isMuted: nextMuted, mutedUntil },
      }),
      db.chatConversationPreference
        ?.upsert({
          where: { tenantId_userId_threadId: { tenantId, userId: currentUserId, threadId } },
          create: { tenantId, userId: currentUserId, threadId, isMuted: nextMuted, mutedUntil },
          update: { isMuted: nextMuted, mutedUntil },
        })
        .catch(() => {}),
    ]);

    return res.json({
      success: true,
      isMuted: updated.isMuted,
      mutedUntil: updated.mutedUntil,
      message: updated.isMuted ? "Group notifications muted." : "Group notifications unmuted.",
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/groups/:id/invite-link - Generate expiring internal workspace-scoped invite token (Section 4)
chatRouter.post(["/groups/:id/invite-link", "/groups/:id/invite"], async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;
    const expiresInHours = Math.min(720, Math.max(1, Number(req.body?.expiresInHours) || 72));

    const group: any = await prisma.chatGroup.findFirst({
      where: { id, tenantId },
      include: { members: true },
    });
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }
    if (group.isArchived) {
      return res.status(400).json({ error: "Cannot generate invite links for an archived group." });
    }

    const requesterMember = group.members.find((m: any) => m.userId === currentUserId);
    const isOwner = group.ownerId === currentUserId || group.createdById === currentUserId;
    const isGroupAdmin = requesterMember?.role === "admin" || requesterMember?.role === "owner" || isOwner;
    const isTenantAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));

    if (!isGroupAdmin && !isTenantAdmin) {
      return res.status(403).json({
        error: "Only group owners or administrators can generate invite links.",
        code: "CHAT_GROUP_ADMIN_REQUIRED",
      });
    }

    const inviteToken = crypto.randomBytes(24).toString("base64url");
    const inviteExpiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);

    await prisma.chatGroup.update({
      where: { id },
      data: { inviteToken, inviteExpiresAt },
    });

    const { senderName } = await ChatService.resolveSenderIdentity({ tenantId, userId: currentUserId });
    await recordSystemEvent(
      tenantId,
      `group_${id}`,
      currentUserId,
      "invite_link_created",
      `${senderName} generated an internal workspace invite link (expires in ${expiresInHours}h)`,
      { expiresInHours, inviteExpiresAt: inviteExpiresAt.toISOString() }
    );

    return res.json({
      success: true,
      groupId: id,
      inviteToken,
      inviteExpiresAt: inviteExpiresAt.toISOString(),
      scope: "workspace_internal",
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// DELETE /api/chat/groups/:id/invite-link - Revoke active group invite link
chatRouter.delete(["/groups/:id/invite-link", "/groups/:id/invite"], async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;

    const group: any = await prisma.chatGroup.findFirst({
      where: { id, tenantId },
      include: { members: true },
    });
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    const requesterMember = group.members.find((m: any) => m.userId === currentUserId);
    const isOwner = group.ownerId === currentUserId || group.createdById === currentUserId;
    const isGroupAdmin = requesterMember?.role === "admin" || requesterMember?.role === "owner" || isOwner;
    const isTenantAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));

    if (!isGroupAdmin && !isTenantAdmin) {
      return res.status(403).json({ error: "Only group owners or administrators can revoke invite links." });
    }

    await prisma.chatGroup.update({
      where: { id },
      data: { inviteToken: null, inviteExpiresAt: null },
    });

    const { senderName } = await ChatService.resolveSenderIdentity({ tenantId, userId: currentUserId });
    await recordSystemEvent(
      tenantId,
      `group_${id}`,
      currentUserId,
      "invite_link_revoked",
      `${senderName} revoked the group invite link`,
      {}
    );

    return res.json({ success: true, message: "Group invite link revoked." });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/groups/join-by-invite - Authenticated same-tenant join via expiring invite token (blocks external/cross-tenant users)
chatRouter.post(["/groups/join-by-invite", "/groups/invite/:inviteCode"], async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const token = String(req.params.inviteCode || req.body?.inviteToken || req.body?.token || "").trim();

    if (!token) {
      return res.status(400).json({ error: "Invite token is required." });
    }

    // Strict tenant isolation: token ONLY resolves within caller's own authenticated tenantId
    const group: any = await prisma.chatGroup.findFirst({
      where: { tenantId, inviteToken: token },
      include: { members: true },
    });

    if (!group) {
      return res.status(404).json({
        error: "Invalid or unauthorized workspace invite link.",
        code: "INVITE_INVALID_OR_CROSS_TENANT",
      });
    }

    if (group.isArchived) {
      return res.status(400).json({ error: "This group is archived and cannot accept new members.", code: "GROUP_ARCHIVED" });
    }

    if (!group.inviteExpiresAt || new Date(group.inviteExpiresAt).getTime() <= Date.now()) {
      return res.status(410).json({
        error: "This invite link has expired. Ask a group admin for a new link.",
        code: "INVITE_EXPIRED",
      });
    }

    const alreadyMember = group.members.some((m: any) => m.userId === currentUserId);
    if (alreadyMember) {
      return res.json({ success: true, alreadyMember: true, group });
    }

    const maxCap = group.maxMembers || DEFAULT_MAX_GROUP_MEMBERS;
    if (group.members.length >= maxCap) {
      return res.status(400).json({
        error: `This group has reached its maximum limit of ${maxCap} members.`,
        code: "GROUP_MEMBER_LIMIT_EXCEEDED",
      });
    }

    await prisma.chatGroupMember.create({
      data: {
        tenantId,
        groupId: group.id,
        userId: currentUserId,
        role: "member",
      },
    });

    const { senderName } = await ChatService.resolveSenderIdentity({ tenantId, userId: currentUserId });
    await recordSystemEvent(
      tenantId,
      `group_${group.id}`,
      currentUserId,
      "member_joined_via_invite",
      `${senderName} joined via workspace invite link`,
      { userId: currentUserId }
    );

    const updated = await prisma.chatGroup.findUnique({
      where: { id: group.id },
      include: { members: true },
    });

    if (updated) {
      await ChatService.emitToAuthorizedThread({
        tenantId,
        threadId: `group_${group.id}`,
        event: "chat:group_updated",
        payload: { groupId: group.id, addedMemberIds: [currentUserId], group: updated },
        participantUserIds: updated.members.map((m) => m.userId),
      });
    }

    return res.json({ success: true, alreadyMember: false, group: updated });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// GET /api/chat/groups/:id/activity - Fetch group activity history (system events)
chatRouter.get("/groups/:id/activity", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;

    const authCheck = await ChatService.authorizeThread({
      threadId: `group_${id}`,
      tenantId,
      userId: currentUserId,
      roles: req.user?.roles,
      allowAdminModeration: false,
    });
    if (!authCheck.authorized) {
      return res.status(authCheck.status || 403).json({
        error: authCheck.reason || "Access denied.",
        code: authCheck.code || "CHAT_UNAUTHORIZED",
      });
    }

    const events = await prisma.chatMessage.findMany({
      where: {
        tenantId,
        threadId: `group_${id}`,
        isSystemEvent: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return res.json(events);
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// ============================================================================
// FILE UPLOAD & URL PREVIEW ENDPOINTS
// ============================================================================

// POST /api/chat/upload - Upload attachment or voice note to Centralized Media Library with private ACL
chatRouter.post(
  "/upload",
  (req, res, next) => {
    chatUpload.any()(req, res, (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            error: "File size exceeds 30 MB limit. Please select a smaller file.",
            code: "FILE_TOO_LARGE",
          });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({
            error: `Cannot upload more than ${MAX_CHAT_ATTACHMENTS_PER_MESSAGE} files at once.`,
            code: "TOO_MANY_FILES",
          });
        }
        return res.status(400).json({
          error: err.message || "File upload error",
          code: "UPLOAD_ERROR",
        });
      }
      next();
    });
  },
  async (req: AuthRequest, res: Response) => {
    try {
      if (!ChatService.hasChatPermission(req.user, "chat.files")) {
        return res.status(403).json({ error: "You do not have permission to upload chat attachments." });
      }

      const rawFiles: Express.Multer.File[] = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
      if (!rawFiles || rawFiles.length === 0) {
        return res.status(400).json({ error: "No file provided" });
      }
      if (rawFiles.length > MAX_CHAT_ATTACHMENTS_PER_MESSAGE) {
        return res.status(400).json({
          error: `Cannot upload more than ${MAX_CHAT_ATTACHMENTS_PER_MESSAGE} files at once.`,
          code: "TOO_MANY_FILES",
        });
      }

      const tenantId = req.user?.tenantId || "default";
      const currentUserId = req.user?.userId || "system";
      const threadId = req.body?.threadId || (req.query?.threadId as string);

      let participantUserIds: string[] = [currentUserId];
      if (threadId) {
        const authCheck = await ChatService.authorizeThread({
          threadId,
          tenantId,
          userId: currentUserId,
          roles: req.user?.roles,
          allowAdminModeration: false,
          requireWritePermission: true,
        });
        if (!authCheck.authorized) {
          return res.status(authCheck.status || 403).json({
            error: authCheck.reason || "Unauthorized access to thread",
            code: authCheck.code || "CHAT_UNAUTHORIZED",
          });
        }
        if (authCheck.participantUserIds) {
          participantUserIds = authCheck.participantUserIds;
        }
      }

      const folderContext = await ChatFolderService.resolveChatFolderHierarchy(tenantId, threadId, currentUserId);
      const savedFiles: any[] = [];

      for (const file of rawFiles) {
        const originalName = file.originalname || "attachment";
        const lastDot = originalName.lastIndexOf(".");
        const ext = lastDot !== -1 ? originalName.slice(lastDot + 1).toLowerCase() : "";

        if (file.size > MAX_CHAT_FILE_SIZE_BYTES || (file.buffer && file.buffer.length > MAX_CHAT_FILE_SIZE_BYTES)) {
          return res.status(413).json({
            error: `File "${originalName}" exceeds 30 MB limit.`,
            code: "FILE_TOO_LARGE",
          });
        }

        if (CHAT_RESTRICTED_EXTENSIONS.has(ext)) {
          return res.status(400).json({
            error: `Security Violation: Files with extension .${ext} are strictly prohibited.`,
            code: "FILE_RESTRICTED",
          });
        }

        if (originalName.toLowerCase().startsWith(".env") || originalName.toLowerCase().endsWith(".env")) {
          return res.status(400).json({
            error: "Security Violation: .env files are strictly prohibited.",
            code: "FILE_RESTRICTED",
          });
        }

        const mediaRecord = await MediaService.uploadMedia(file.buffer, originalName, {
          folder: folderContext.folderPath,
          tenantId,
          uploadedBy: currentUserId,
          mimeType: file.mimetype,
          tags: ["chat", "communication", "private"],
          systemModule: "chat",
        } as any);

        await prisma.mediaFile.update({
          where: { id: mediaRecord.id },
          data: {
            parentId: folderContext.folderId || undefined,
            systemModule: "chat",
            isPublic: false,
          },
        });

        // Grant FileAcl to direct conversation participants & uploader
        const aclRecipients = Array.from(
          new Set([
            currentUserId,
            ...(threadId?.startsWith("direct_") ? participantUserIds : []),
            ...(folderContext.aclUsers || []),
          ])
        );
        for (const uid of aclRecipients) {
          const existingAcl = await prisma.fileAcl.findFirst({
            where: { fileId: mediaRecord.id, principalType: "USER", principalId: uid },
            select: { id: true },
          });
          if (!existingAcl) {
            await prisma.fileAcl
              .create({
                data: {
                  fileId: mediaRecord.id,
                  principalType: "USER",
                  principalId: uid,
                  permission: uid === currentUserId ? "OWNER" : "VIEWER",
                  createdBy: currentUserId,
                },
              })
              .catch(() => {});
          }
        }

        const signedDownloadUrl = ChatService.signAttachmentDownloadUrl({
          mediaId: mediaRecord.id,
          tenantId,
          userId: currentUserId,
          inline: false,
        });
        const signedPreviewUrl = ChatService.signAttachmentDownloadUrl({
          mediaId: mediaRecord.id,
          tenantId,
          userId: currentUserId,
          inline: true,
        });

        savedFiles.push({
          id: mediaRecord.id,
          mediaId: mediaRecord.id,
          url: mediaRecord.url,
          signedDownloadUrl,
          signedPreviewUrl,
          name: mediaRecord.fileName,
          fileName: mediaRecord.fileName,
          size: mediaRecord.fileSize,
          fileSize: mediaRecord.fileSize,
          type: mediaRecord.mimeType,
          mimeType: mediaRecord.mimeType,
          folder: mediaRecord.folder,
          extension: ext,
          uploadedAt: mediaRecord.createdAt.toISOString(),
        });
      }

      return res.status(200).json({
        files: savedFiles,
        data: savedFiles,
        url: savedFiles[0]?.url,
        signedDownloadUrl: savedFiles[0]?.signedDownloadUrl,
        signedPreviewUrl: savedFiles[0]?.signedPreviewUrl,
        fileName: savedFiles[0]?.fileName,
        id: savedFiles[0]?.id,
        mediaId: savedFiles[0]?.mediaId,
      });
    } catch (err: any) {
      if (
        err?.message?.includes("spoofing") ||
        err?.message?.includes("not allowed") ||
        err?.message?.includes("Mismatch") ||
        err?.message?.includes("prohibited")
      ) {
        return res.status(400).json({ error: err.message, code: "FILE_VALIDATION_FAILED" });
      }
      return handleChatError(res, err, "File upload failed");
    }
  }
);

// GET /api/chat/url-preview - SSRF-safe URL preview metadata endpoint
chatRouter.get("/url-preview", async (req: AuthRequest, res: Response) => {
  try {
    const url = String(req.query.url || "").trim();
    if (!url) {
      return res.status(400).json({ error: "URL query parameter is required." });
    }

    const preview = await UrlPreviewService.fetchPreview(url);
    if (!preview) {
      return res.status(400).json({ error: "Invalid, restricted, or unreachable URL." });
    }
    return res.json({ preview });
  } catch (err: any) {
    const status =
      err.message?.includes("prohibited") ||
      err.message?.includes("Invalid URL") ||
      err.message?.includes("blocked") ||
      err.message?.includes("private") ||
      err.message?.includes("redirect")
        ? 400
        : 500;
    return res.status(status).json({ error: err.message || "Failed to fetch URL preview" });
  }
});

// ============================================================================
// MESSAGES, SEARCH, RECEIPTS & INTERACTIVE ACTIONS (Section 2, 5, 6)
// ============================================================================

async function handleGetThreadMessages(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { threadId } = req.params;
    const currentUserId = req.user?.userId || "";

    if (!threadId) {
      return res.status(400).json({ error: "threadId is required" });
    }

    const authCheck = await ChatService.authorizeThread({
      threadId,
      tenantId,
      userId: currentUserId,
      roles: req.user?.roles,
      allowAdminModeration: false,
    });
    if (!authCheck.authorized) {
      return res.status(authCheck.status || 403).json({
        error: authCheck.reason || "Access denied: You are not authorized to view this conversation.",
        code: authCheck.code || "CHAT_UNAUTHORIZED",
      });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 25, 1), 100);
    const before = req.query.before as string | undefined;
    const after = req.query.after as string | undefined;
    const markRead = req.query.markRead !== "false" && req.query.markRead !== "0";

    // Reconnect catch-up mode (`after` messageId or ISO timestamp) - Section 5.4
    if (after) {
      let afterDate: Date | null = null;
      const cursorMsg = await prisma.chatMessage.findFirst({
        where: { id: after, tenantId, threadId },
        select: { createdAt: true },
      });
      if (cursorMsg) {
        afterDate = cursorMsg.createdAt;
      } else if (!Number.isNaN(Date.parse(after))) {
        afterDate = new Date(after);
      }

      if (afterDate) {
        const missedRaw = await prisma.chatMessage.findMany({
          where: {
            tenantId,
            threadId,
            createdAt: { gt: afterDate },
          },
          orderBy: { createdAt: "asc" },
          take: limit,
        });
        const missed = missedRaw
          .filter((msg: any) => !((msg.deletedForUserIds as string[]) || []).includes(currentUserId))
          .map((msg: any) => ChatService.sanitizeMessageForViewer(msg, currentUserId, tenantId));

        return res.json({
          messages: missed,
          nextCursor: null,
          hasMore: missedRaw.length === limit,
          reconciled: true,
        });
      }
    }

    let cursorWhere: any = {};
    if (before) {
      const cursorMessage = await prisma.chatMessage.findFirst({
        where: { id: before, tenantId, threadId },
        select: { createdAt: true, id: true },
      });
      if (cursorMessage) {
        cursorWhere = {
          createdAt: { lt: cursorMessage.createdAt },
        };
      }
    }

    const rawMessages = await prisma.chatMessage.findMany({
      where: {
        tenantId,
        threadId,
        ...cursorWhere,
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = rawMessages.length > limit;
    const pageMessages = hasMore ? rawMessages.slice(0, limit) : rawMessages;
    pageMessages.reverse(); // Chronological (asc) order

    const nextCursor = hasMore && pageMessages.length > 0 ? pageMessages[0]?.id : null;

    const filteredMessages = pageMessages
      .filter((msg: any) => {
        const deletedFor = (msg.deletedForUserIds as string[]) || [];
        return !deletedFor.includes(currentUserId);
      })
      .map((msg: any) => ChatService.sanitizeMessageForViewer(msg, currentUserId, tenantId));

    // Fetch group per-member seen cursors or mark read
    let seenBy: any[] | undefined;
    if (currentUserId && markRead && !before) {
      const readRes = await ChatService.markThreadRead({
        tenantId,
        userId: currentUserId,
        roles: req.user?.roles,
        threadId,
      }).catch(() => null);
      if (readRes?.seenBy) seenBy = readRes.seenBy;
    } else if (authCheck.threadType === "group" && authCheck.participantUserIds) {
      const [receipts, profiles] = await Promise.all([
        prisma.chatReadReceipt.findMany({
          where: { tenantId, threadId, userId: { in: authCheck.participantUserIds } },
        }),
        prisma.profile.findMany({
          where: { tenantId, userId: { in: authCheck.participantUserIds } },
          select: { userId: true, fullName: true, avatarUrl: true },
        }),
      ]);
      const profMap = new Map(profiles.map((p) => [p.userId, p]));
      seenBy = receipts.map((r) => ({
        userId: r.userId,
        fullName: cleanPersonName(profMap.get(r.userId)?.fullName || "Member"),
        avatarUrl: profMap.get(r.userId)?.avatarUrl || null,
        lastReadAt: r.lastReadAt.toISOString(),
      }));
    }

    return res.json({
      messages: filteredMessages,
      nextCursor,
      hasMore,
      seenBy,
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
}

chatRouter.get("/messages/:threadId", handleGetThreadMessages);
chatRouter.get("/conversations/:threadId/messages", handleGetThreadMessages);

// GET /api/chat/messages/:threadId/pinned - Get pinned messages in thread
chatRouter.get("/messages/:threadId/pinned", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { threadId } = req.params;
    const currentUserId = req.user?.userId || "";

    const authCheck = await ChatService.authorizeThread({
      threadId,
      tenantId,
      userId: currentUserId,
      roles: req.user?.roles,
      allowAdminModeration: false,
    });
    if (!authCheck.authorized) {
      return res.status(authCheck.status || 403).json({ error: "Access denied", code: "CHAT_UNAUTHORIZED" });
    }

    const rawPinned = await prisma.chatMessage.findMany({
      where: {
        tenantId,
        threadId,
        isPinned: true,
        isDeletedForEveryone: false,
      },
      orderBy: { pinnedAt: "desc" },
    });

    const pinnedMessages = rawPinned
      .filter((m: any) => !((m.deletedForUserIds as string[]) || []).includes(currentUserId))
      .map((m: any) => ChatService.sanitizeMessageForViewer(m, currentUserId, tenantId));

    return res.json(pinnedMessages);
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// GET /api/chat/messages/:threadId/files - Shared files & attachments with signed URLs & server pagination
chatRouter.get("/messages/:threadId/files", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { threadId } = req.params;
    const currentUserId = req.user?.userId || "";
    const typeFilter = String(req.query.type || "").toLowerCase(); // "media" | "documents" | "all"
    const search = String(req.query.search || "").toLowerCase();
    const paginatedMode = req.query.paginated === "true" || req.query.paginated === "1";
    const pageNum = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(req.query.limit || "50"), 10) || 50));

    const authCheck = await ChatService.authorizeThread({
      threadId,
      tenantId,
      userId: currentUserId,
      roles: req.user?.roles,
      allowAdminModeration: false,
    });
    if (!authCheck.authorized) {
      return res.status(authCheck.status || 403).json({ error: "Access denied", code: "CHAT_UNAUTHORIZED" });
    }

    const rawMessages = await prisma.chatMessage.findMany({
      where: {
        tenantId,
        threadId,
        isDeletedForEveryone: false,
        attachments: { not: null as any },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const messages = rawMessages.filter((m: any) => {
      const deletedFor = (m.deletedForUserIds as string[]) || [];
      return !deletedFor.includes(currentUserId);
    });

    const allFiles: any[] = [];
    for (const msg of messages) {
      const sanitized = ChatService.sanitizeMessageForViewer(msg, currentUserId, tenantId);
      const atts: any[] = Array.isArray(sanitized.attachments) ? sanitized.attachments : [];
      for (const attItem of atts) {
        const att: any = typeof attItem === "object" && attItem !== null ? attItem : {};
        const fileName = String(att.name || att.fileName || "").toLowerCase();
        const mime = String(att.type || att.mimeType || "").toLowerCase();
        const isMedia = mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/");

        if (typeFilter === "media" && !isMedia) continue;
        if (typeFilter === "documents" && isMedia) continue;
        if (search && !fileName.includes(search)) continue;

        allFiles.push({
          messageId: msg.id,
          senderId: msg.senderId,
          senderName: msg.senderName,
          createdAt: msg.createdAt,
          ...att,
        });
      }
    }

    const total = allFiles.length;
    const paged = allFiles.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.setHeader("X-Total-Count", String(total));
    res.setHeader("X-Page", String(pageNum));
    res.setHeader("X-Total-Pages", String(Math.max(1, Math.ceil(total / limitNum))));

    if (paginatedMode) {
      return res.json({
        files: paged,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      });
    }

    return res.json(paged);
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// GET /api/chat/search - Global Cross-Conversation Search strictly scoped to caller's authorized threads (Section 6)
chatRouter.get("/search", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const q = String(req.query.q || req.query.query || "").trim();
    const senderId = String(req.query.senderId || "").trim();
    const threadFilter = String(req.query.threadId || "").trim();
    const hasAttachment = req.query.hasAttachment === "true" || req.query.hasAttachment === "1";
    const fileName = String(req.query.fileName || "").trim().toLowerCase();
    const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : null;
    const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : null;
    const pageNum = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "25"), 10) || 25));

    if (!q && !senderId && !hasAttachment && !fileName && !startDate && !endDate) {
      return res.json({ results: [], messages: [], files: [], total: 0, page: pageNum, limit: limitNum, totalPages: 1 });
    }

    // If a specific threadId was requested, strictly verify caller's authorization for that thread
    let allowedThreadConditions: any[] = [];
    if (threadFilter) {
      const check = await ChatService.authorizeThread({
        threadId: threadFilter,
        tenantId,
        userId: currentUserId,
        roles: req.user?.roles,
        allowAdminModeration: false,
      });
      if (!check.authorized) {
        return res.status(check.status || 403).json({
          error: check.reason || "Access denied to requested thread.",
          code: check.code || "CHAT_UNAUTHORIZED",
        });
      }
      allowedThreadConditions = [{ threadId: threadFilter }];
    } else {
      // Build exact set of caller's active groups + caller's own 1:1 DMs (never expose other users' DMs!)
      const [memberships, callerEmp] = await Promise.all([
        prisma.chatGroupMember.findMany({
          where: { tenantId, userId: currentUserId },
          select: { groupId: true },
        }),
        prisma.employee.findFirst({
          where: { tenantId, userId: currentUserId },
          select: { id: true },
        }),
      ]);
      const groupThreadIds = memberships.map((m) => `group_${m.groupId}`);
      allowedThreadConditions = [
        ...(groupThreadIds.length > 0 ? [{ threadId: { in: groupThreadIds } }] : []),
        {
          AND: [
            { threadId: { startsWith: "direct_" } },
            {
              OR: [
                { threadId: { startsWith: `direct_${currentUserId}_` } },
                { threadId: { endsWith: `_${currentUserId}` } },
                ...(callerEmp?.id && callerEmp.id !== currentUserId
                  ? [
                      { threadId: { startsWith: `direct_${callerEmp.id}_` } },
                      { threadId: { endsWith: `_${callerEmp.id}` } },
                    ]
                  : []),
              ],
            },
          ],
        },
      ];
    }

    const andClauses: any[] = [
      { tenantId },
      { isDeletedForEveryone: false },
      { isSystemEvent: false },
      { OR: allowedThreadConditions },
    ];

    if (senderId) {
      andClauses.push({ senderId });
    }
    if (hasAttachment || fileName) {
      andClauses.push({ attachments: { not: null as any } });
    }
    if (startDate && !Number.isNaN(startDate.getTime())) {
      andClauses.push({ createdAt: { gte: startDate } });
    }
    if (endDate && !Number.isNaN(endDate.getTime())) {
      andClauses.push({ createdAt: { lte: endDate } });
    }
    if (q) {
      andClauses.push({
        OR: [
          { content: { contains: q, mode: "insensitive" } },
          { senderName: { contains: q, mode: "insensitive" } },
          { attachments: { string_contains: q } as any },
        ],
      });
    }

    const rawMatches = await prisma.chatMessage.findMany({
      where: { AND: andClauses },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    // Post-filter deletedForMe, malformed direct threads, and optional fileName substring
    const filtered = rawMatches.filter((m: any) => {
      if (m.threadId.startsWith("direct_")) {
        const parts = m.threadId.slice(7).split("_").filter(Boolean);
        if (parts.length !== 2) return false;
      }
      const deletedFor = (m.deletedForUserIds as string[]) || [];
      if (deletedFor.includes(currentUserId)) return false;
      if (fileName) {
        const atts: any[] = Array.isArray(m.attachments) ? m.attachments : [];
        const matchFile = atts.some((a) =>
          String(a?.name || a?.fileName || "")
            .toLowerCase()
            .includes(fileName)
        );
        if (!matchFile) return false;
      }
      return true;
    });

    const total = filtered.length;
    const paged = filtered
      .slice((pageNum - 1) * limitNum, pageNum * limitNum)
      .map((m: any) => ChatService.sanitizeMessageForViewer(m, currentUserId, tenantId));

    const matchedFiles: any[] = [];
    const lowerQ = q.toLowerCase();
    for (const msg of paged) {
      const atts: any[] = Array.isArray(msg.attachments) ? msg.attachments : [];
      for (const att of atts) {
        if (!att || typeof att !== "object") continue;
        const attName = String(att.name || att.fileName || "");
        if (!lowerQ || attName.toLowerCase().includes(lowerQ) || String(msg.content || "").toLowerCase().includes(lowerQ)) {
          matchedFiles.push({
            messageId: msg.id,
            threadId: msg.threadId,
            senderId: msg.senderId,
            senderName: msg.senderName,
            createdAt: msg.createdAt,
            ...att,
          });
        }
      }
    }

    return res.json({
      results: paged,
      messages: paged,
      files: matchedFiles,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// GET /api/chat/messages/:threadId/search - In-conversation search with sender, date, attachment filters & pagination
chatRouter.get("/messages/:threadId/search", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { threadId } = req.params;
    const currentUserId = req.user?.userId || "";
    const q = String(req.query.query || req.query.q || "").trim();
    const senderId = String(req.query.senderId || "").trim();
    const hasAttachment = req.query.hasAttachment === "true" || req.query.hasAttachment === "1";
    const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : null;
    const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : null;
    const paginatedMode = req.query.paginated === "true" || req.query.paginated === "1";
    const pageNum = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "50"), 10) || 50));

    const authCheck = await ChatService.authorizeThread({
      threadId,
      tenantId,
      userId: currentUserId,
      roles: req.user?.roles,
      allowAdminModeration: false,
    });
    if (!authCheck.authorized) {
      return res.status(authCheck.status || 403).json({
        error: authCheck.reason || "Access denied",
        code: authCheck.code || "CHAT_UNAUTHORIZED",
      });
    }

    if (!q && !senderId && !hasAttachment && !startDate && !endDate) {
      return res.json(paginatedMode ? { results: [], total: 0, page: 1, limit: limitNum } : []);
    }

    const where: any = {
      tenantId,
      threadId,
      isDeletedForEveryone: false,
      ...(senderId ? { senderId } : {}),
      ...(hasAttachment ? { attachments: { not: null as any } } : {}),
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate && !Number.isNaN(startDate.getTime())) where.createdAt.gte = startDate;
      if (endDate && !Number.isNaN(endDate.getTime())) where.createdAt.lte = endDate;
    }

    if (q) {
      where.OR = [
        { content: { contains: q, mode: "insensitive" } },
        { senderName: { contains: q, mode: "insensitive" } },
        { attachments: { string_contains: q } as any },
      ];
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const filtered = messages
      .filter((m: any) => !((m.deletedForUserIds as string[]) || []).includes(currentUserId))
      .map((m: any) => ChatService.sanitizeMessageForViewer(m, currentUserId, tenantId));

    const total = filtered.length;
    const paged = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.setHeader("X-Total-Count", String(total));
    if (paginatedMode) {
      return res.json({
        results: paged,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      });
    }

    return res.json(paged);
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/messages - Single Authoritative Message Service (Section 2.1 & 5.1)
chatRouter.post("/messages", async (req: AuthRequest, res: Response) => {
  const t0 = Date.now();
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const userProfile = (req.user as any)?.profile;

    let effectiveThreadId = typeof req.body?.threadId === "string" ? req.body.threadId.trim() : "";
    if (!effectiveThreadId && req.body?.groupId) {
      effectiveThreadId = `group_${String(req.body.groupId).trim()}`;
    } else if (!effectiveThreadId && req.body?.recipientId) {
      const resolvedRecipient = await ChatService.resolveParticipantUserInTenant(
        tenantId,
        String(req.body.recipientId).trim()
      );
      if (!resolvedRecipient) {
        return res.status(403).json({
          error: "Access denied: Recipient does not belong to your workspace.",
          code: "CHAT_CROSS_TENANT_FORBIDDEN",
        });
      }
      effectiveThreadId = `direct_${[currentUserId, resolvedRecipient.userId].sort().join("_")}`;
    }

    const { message, deduplicated } = await ChatService.sendMessage({
      tenantId,
      userId: currentUserId,
      roles: req.user?.roles,
      permissions: req.user?.permissions,
      workspaceRole: req.user?.workspaceRole,
      senderNameHint: userProfile?.fullName || (req.user as any)?.fullName || null,
      senderAvatarHint: userProfile?.avatarUrl || (req.user as any)?.avatarUrl || null,
      senderEmailHint: req.user?.email || null,
      threadId: effectiveThreadId,
      content: req.body?.content,
      attachments: req.body?.attachments,
      replyToId: req.body?.replyToId,
      replyTo: req.body?.replyTo,
      voiceNote: req.body?.voiceNote,
      poll: req.body?.poll,
      urlPreviews: req.body?.urlPreviews,
      clientTempId: req.body?.clientTempId,
      mentions: req.body?.mentions,
    });

    res.setHeader("Server-Timing", `total;dur=${Date.now() - t0}`);
    return res.status(deduplicated ? 200 : 201).json(message);
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// PATCH /api/chat/messages/:id - Authoritative Edit with Edit History Audit Trail (Section 2.6 & 6)
chatRouter.patch("/messages/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const updated = await ChatService.editMessage({
      tenantId,
      userId: currentUserId,
      roles: req.user?.roles,
      messageId: req.params.id,
      content: req.body?.content,
    });
    return res.json(updated);
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/messages/forward-batch - Forward message with strict source/dest auth & FileAcl binding
chatRouter.post("/messages/forward-batch", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { messageId, targetThreadIds } = req.body;

    if (!messageId || !Array.isArray(targetThreadIds) || targetThreadIds.length === 0) {
      return res.status(400).json({ error: "messageId and targetThreadIds array are required" });
    }

    const originalMessage: any = await prisma.chatMessage.findFirst({
      where: { id: messageId, tenantId, isDeletedForEveryone: false },
    });

    if (!originalMessage) {
      return res.status(404).json({ error: "Original message not found or was deleted." });
    }

    const deletedFor = (originalMessage.deletedForUserIds as string[]) || [];
    if (deletedFor.includes(currentUserId)) {
      return res.status(404).json({ error: "Original message not found." });
    }

    const sourceAuth = await ChatService.authorizeThread({
      threadId: originalMessage.threadId,
      tenantId,
      userId: currentUserId,
      roles: req.user?.roles,
      allowAdminModeration: false,
    });
    if (!sourceAuth.authorized) {
      return res.status(sourceAuth.status || 403).json({
        error: "Not authorized to access or forward this message.",
        code: sourceAuth.code || "CHAT_UNAUTHORIZED",
      });
    }

    const { senderName, senderAvatar } = await ChatService.resolveSenderIdentity({
      tenantId,
      userId: currentUserId,
      fallbackEmail: req.user?.email,
    });

    const forwardedMessages: any[] = [];
    const failedThreads: { threadId: string; reason: string }[] = [];
    const uniqueTargets = Array.from(new Set(targetThreadIds.map((t: any) => String(t || "").trim()).filter(Boolean))).slice(0, 20);

    // Reset votes if forwarding a poll so destination gets a clean poll copy
    let forwardedPoll: any = null;
    if (originalMessage.poll && typeof originalMessage.poll === "object") {
      forwardedPoll = {
        ...JSON.parse(JSON.stringify(originalMessage.poll)),
        isClosed: false,
        distinctVotersCount: 0,
        totalVotesCount: 0,
        options: Array.isArray((originalMessage.poll as any).options)
          ? (originalMessage.poll as any).options.map((o: any) => ({ id: o.id, text: o.text, votes: [] }))
          : [],
      };
    }

    for (const targetThreadId of uniqueTargets) {
      try {
        const destAuth = await ChatService.authorizeThread({
          threadId: targetThreadId,
          tenantId,
          userId: currentUserId,
          roles: req.user?.roles,
          allowAdminModeration: false,
          requireWritePermission: true,
        });
        if (!destAuth.authorized) {
          failedThreads.push({ threadId: targetThreadId, reason: destAuth.reason || "Access denied to destination conversation" });
          continue;
        }

        const clonedAttachments = originalMessage.attachments
          ? JSON.parse(JSON.stringify(originalMessage.attachments))
          : null;
        const clonedVoice = originalMessage.voiceNote
          ? JSON.parse(JSON.stringify(originalMessage.voiceNote))
          : null;

        const newMsg = await prisma.chatMessage.create({
          data: {
            tenantId,
            threadId: targetThreadId,
            senderId: currentUserId,
            senderName,
            senderAvatar,
            content: originalMessage.content,
            attachments: clonedAttachments,
            voiceNote: clonedVoice,
            poll: forwardedPoll,
            urlPreviews: originalMessage.urlPreviews ? JSON.parse(JSON.stringify(originalMessage.urlPreviews)) : null,
            deliveryStatus: "sent",
            deliveredToUserIds: [],
            eventMetadata: {
              isForwarded: true,
              forwardedFromId: originalMessage.id,
              forwardedFromSender: originalMessage.senderName,
            },
          },
        });

        await ChatService.bindMessageMediaPermissions({
          tenantId,
          messageId: newMsg.id,
          actorUserId: currentUserId,
          attachments: clonedAttachments,
          voiceNote: clonedVoice,
          participantUserIds: destAuth.participantUserIds || [currentUserId],
          threadType: destAuth.threadType || "direct",
        });

        forwardedMessages.push(ChatService.sanitizeMessageForViewer(newMsg, currentUserId, tenantId));

        await ChatService.emitToAuthorizedThread({
          tenantId,
          threadId: targetThreadId,
          event: "chat:message",
          payload: {
            threadId: targetThreadId,
            message: ChatService.sanitizeMessageForViewer(newMsg, undefined, tenantId),
          },
          participantUserIds: destAuth.participantUserIds,
          perUserPayloadTransform:
            clonedAttachments || clonedVoice
              ? (viewerId) => ({
                  threadId: targetThreadId,
                  message: ChatService.sanitizeMessageForViewer(newMsg, viewerId, tenantId),
                })
              : undefined,
        });
      } catch (destErr: any) {
        failedThreads.push({ threadId: targetThreadId, reason: destErr.message });
      }
    }

    return res.json({
      success: true,
      forwardedCount: forwardedMessages.length,
      failedCount: failedThreads.length,
      messages: forwardedMessages,
      failedThreads,
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/messages/:id/pin - Pin or unpin message within thread
chatRouter.post("/messages/:id/pin", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;

    const existing = await prisma.chatMessage.findFirst({
      where: { id, tenantId },
    });

    if (!existing || existing.isDeletedForEveryone) {
      return res.status(404).json({ error: "Message not found or was deleted." });
    }

    const authCheck = await ChatService.authorizeThread({
      threadId: existing.threadId,
      tenantId,
      userId: currentUserId,
      roles: req.user?.roles,
      allowAdminModeration: false,
      requireWritePermission: true,
    });
    if (!authCheck.authorized) {
      return res.status(authCheck.status || 403).json({
        error: authCheck.reason || "Access denied",
        code: authCheck.code || "CHAT_UNAUTHORIZED",
      });
    }

    const nextPinned = !existing.isPinned;
    const updated = await prisma.chatMessage.update({
      where: { id },
      data: {
        isPinned: nextPinned,
        pinnedAt: nextPinned ? new Date() : null,
        pinnedById: nextPinned ? currentUserId : null,
      },
    });

    const sanitized = ChatService.sanitizeMessageForViewer(updated, currentUserId, tenantId);

    await ChatService.emitToAuthorizedThread({
      tenantId,
      threadId: existing.threadId,
      event: "chat:message_pinned",
      payload: {
        id,
        threadId: existing.threadId,
        isPinned: nextPinned,
        message: ChatService.sanitizeMessageForViewer(updated, undefined, tenantId),
      },
      participantUserIds: authCheck.participantUserIds,
    });

    return res.json(sanitized);
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/messages/:id/react - Toggle emoji reaction with row-level locking & thread-scoped emission
chatRouter.post("/messages/:id/react", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== "string" || emoji.trim().length > 16) {
      return res.status(400).json({ error: "Valid emoji is required" });
    }

    const { senderName, senderAvatar } = await ChatService.resolveSenderIdentity({
      tenantId,
      userId: currentUserId,
      fallbackName: (req.user as any)?.profile?.fullName || (req.user as any)?.fullName,
      fallbackAvatar: (req.user as any)?.profile?.avatarUrl || (req.user as any)?.avatarUrl,
      fallbackEmail: req.user?.email,
    });

    const result = await prisma.$transaction(async (tx: any) => {
      const rows: any[] = await tx.$queryRawUnsafe(
        "SELECT id, thread_id, tenant_id, reactions, is_deleted_for_everyone FROM chat_messages WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
        id,
        tenantId
      );

      if (!rows || rows.length === 0 || rows[0].is_deleted_for_everyone) {
        return { status: 404, error: "Message not found" };
      }

      const row = rows[0];
      const threadId = row.thread_id;

      const authCheck = await ChatService.authorizeThread({
        threadId,
        tenantId,
        userId: currentUserId,
        roles: req.user?.roles,
        allowAdminModeration: false,
      });
      if (!authCheck.authorized) {
        return {
          status: authCheck.status || 403,
          error: authCheck.reason || "Access denied",
          code: authCheck.code || "CHAT_UNAUTHORIZED",
        };
      }

      let rawReactions: any[] = [];
      if (Array.isArray(row.reactions)) {
        rawReactions = row.reactions;
      } else if (row.reactions && typeof row.reactions === "object") {
        rawReactions = Object.entries(row.reactions).map(([k, v]: [string, any]) => ({
          emoji: k,
          userIds: Array.isArray(v) ? v : v?.userIds || [],
          count: Array.isArray(v) ? v.length : v?.count || 0,
          users: Array.isArray(v?.users) ? v.users : [],
        }));
      }

      let reactions: Array<{
        emoji: string;
        userIds: string[];
        count: number;
        users: Array<{ userId: string; fullName: string; avatarUrl?: string | null }>;
      }> = rawReactions.map((r: any) => ({
        emoji: r.emoji,
        userIds: Array.isArray(r.userIds) ? [...r.userIds] : [],
        count: Array.isArray(r.userIds) ? r.userIds.length : typeof r.count === "number" ? r.count : 0,
        users: Array.isArray(r.users) ? [...r.users] : [],
      }));

      const cleanEmoji = emoji.trim();
      const existingReaction = reactions.find((r) => r.emoji === cleanEmoji);
      if (existingReaction) {
        if (existingReaction.userIds.includes(currentUserId)) {
          existingReaction.userIds = existingReaction.userIds.filter((u) => u !== currentUserId);
          existingReaction.users = existingReaction.users.filter((u) => u.userId !== currentUserId);
        } else {
          existingReaction.userIds.push(currentUserId);
          if (!existingReaction.users.some((u) => u.userId === currentUserId)) {
            existingReaction.users.push({
              userId: currentUserId,
              fullName: senderName,
              avatarUrl: senderAvatar,
            });
          }
        }
        existingReaction.count = existingReaction.userIds.length;
      } else {
        reactions.push({
          emoji: cleanEmoji,
          userIds: [currentUserId],
          count: 1,
          users: [
            {
              userId: currentUserId,
              fullName: senderName,
              avatarUrl: senderAvatar,
            },
          ],
        });
      }

      reactions = reactions.filter((r) => r.userIds.length > 0);

      const updated = await tx.chatMessage.update({
        where: { id },
        data: { reactions },
      });

      return { status: 200, threadId, reactions, updated, participantUserIds: authCheck.participantUserIds };
    });

    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error, code: result.code });
    }

    await ChatService.emitToAuthorizedThread({
      tenantId,
      threadId: result.threadId,
      event: "chat:reaction",
      payload: {
        id,
        threadId: result.threadId,
        reactions: result.reactions,
      },
      participantUserIds: result.participantUserIds,
    });

    return res.json(ChatService.sanitizeMessageForViewer(result.updated, currentUserId, tenantId));
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/messages/:id/poll/vote - Atomic poll vote with anonymous voter privacy enforcement (Section 6)
chatRouter.post("/messages/:id/poll/vote", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;
    const { optionId } = req.body;

    if (optionId === undefined || optionId === null || optionId === "") {
      return res.status(400).json({ error: "optionId is required" });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const rows: any[] = await tx.$queryRawUnsafe(
        "SELECT id, thread_id, tenant_id, poll, is_deleted_for_everyone FROM chat_messages WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
        id,
        tenantId
      );

      if (!rows || rows.length === 0 || !rows[0].poll || rows[0].is_deleted_for_everyone) {
        return { status: 404, error: "Poll message not found" };
      }

      const row = rows[0];
      const threadId = row.thread_id;

      const authCheck = await ChatService.authorizeThread({
        threadId,
        tenantId,
        userId: currentUserId,
        roles: req.user?.roles,
        allowAdminModeration: false,
      });
      if (!authCheck.authorized) {
        return {
          status: authCheck.status || 403,
          error: authCheck.reason || "Access denied: You cannot vote on polls in this thread.",
          code: authCheck.code || "CHAT_UNAUTHORIZED",
        };
      }

      const pollData: any = typeof row.poll === "string" ? JSON.parse(row.poll) : row.poll;
      if (pollData.isClosed) {
        return { status: 400, error: "This poll is closed." };
      }

      const isMultiSelect = Boolean(pollData.isMultiSelect || pollData.allowMultiple);
      const options: any[] = Array.isArray(pollData.options) ? pollData.options : [];

      const targetOpt = options.find(
        (o, idx) => o.id === optionId || String(o.id) === String(optionId) || idx === Number(optionId)
      );
      if (!targetOpt) {
        return { status: 404, error: "Poll option not found" };
      }

      if (!isMultiSelect) {
        const hadVotedTarget = Array.isArray(targetOpt.votes) && targetOpt.votes.includes(currentUserId);
        for (const opt of options) {
          opt.votes = Array.isArray(opt.votes) ? opt.votes.filter((u: string) => u !== currentUserId) : [];
        }
        // Toggle off if clicking same option, otherwise select target option
        if (!hadVotedTarget) {
          targetOpt.votes.push(currentUserId);
        }
      } else {
        const currentVotes = Array.isArray(targetOpt.votes) ? targetOpt.votes : [];
        if (currentVotes.includes(currentUserId)) {
          targetOpt.votes = currentVotes.filter((u: string) => u !== currentUserId);
        } else {
          targetOpt.votes = [...currentVotes, currentUserId];
        }
      }

      for (const opt of options) {
        opt.votes = Array.isArray(opt.votes) ? Array.from(new Set(opt.votes)) : [];
      }

      pollData.options = options;
      const allVoterIds = new Set(options.flatMap((o: any) => (Array.isArray(o.votes) ? o.votes : [])));
      pollData.distinctVotersCount = allVoterIds.size;
      pollData.totalVotesCount = options.reduce(
        (sum: number, o: any) => sum + (Array.isArray(o.votes) ? o.votes.length : 0),
        0
      );

      await tx.chatMessage.update({
        where: { id },
        data: { poll: pollData },
      });

      return { status: 200, threadId, rawPoll: pollData, participantUserIds: authCheck.participantUserIds };
    });

    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error, code: result.code });
    }

    // Emit personalized viewer-sanitized poll payloads when anonymous!
    await ChatService.emitToAuthorizedThread({
      tenantId,
      threadId: result.threadId,
      event: "chat:poll_updated",
      payload: {
        id,
        threadId: result.threadId,
        poll: ChatService.sanitizePollForViewer(result.rawPoll, undefined),
      },
      participantUserIds: result.participantUserIds,
      perUserPayloadTransform: result.rawPoll?.isAnonymous
        ? (viewerId) => ({
            id,
            threadId: result.threadId,
            poll: ChatService.sanitizePollForViewer(result.rawPoll, viewerId),
          })
        : undefined,
    });

    return res.json({
      success: true,
      poll: ChatService.sanitizePollForViewer(result.rawPoll, currentUserId),
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/messages/:id/poll/close - Close a poll with row-level locking & anonymous voter privacy
chatRouter.post("/messages/:id/poll/close", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx: any) => {
      const rows: any[] = await tx.$queryRawUnsafe(
        "SELECT id, thread_id, tenant_id, sender_id, poll, is_deleted_for_everyone FROM chat_messages WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
        id,
        tenantId
      );

      if (!rows || rows.length === 0 || !rows[0].poll || rows[0].is_deleted_for_everyone) {
        return { status: 404, error: "Poll message not found" };
      }

      const row = rows[0];
      const threadId = row.thread_id;

      const authCheck = await ChatService.authorizeThread({
        threadId,
        tenantId,
        userId: currentUserId,
        roles: req.user?.roles,
        allowAdminModeration: false,
      });
      if (!authCheck.authorized) {
        return {
          status: authCheck.status || 403,
          error: authCheck.reason || "Access denied: You cannot close polls in this thread.",
          code: authCheck.code || "CHAT_UNAUTHORIZED",
        };
      }

      const isCreator = row.sender_id === currentUserId;
      const isGroupAdmin = authCheck.threadType === "group" && ["owner", "admin"].includes(authCheck.memberRole || "");
      const isTenantAdmin = req.user?.roles?.some((r: string) => ["super_admin", "tenant_admin"].includes(r));
      if (!isCreator && !isGroupAdmin && !isTenantAdmin) {
        return { status: 403, error: "Only the poll creator or group admin can close this poll." };
      }

      const pollObj: any = typeof row.poll === "string" ? JSON.parse(row.poll) : row.poll || {};
      const opts = Array.isArray(pollObj.options) ? pollObj.options : [];
      const allVoterIds = new Set(opts.flatMap((o: any) => (Array.isArray(o.votes) ? o.votes : [])));
      const pollData: any = {
        ...pollObj,
        isClosed: true,
        closedAt: new Date().toISOString(),
        closedById: currentUserId,
        distinctVotersCount: allVoterIds.size,
        totalVotesCount: opts.reduce((sum: number, o: any) => sum + (Array.isArray(o.votes) ? o.votes.length : 0), 0),
      };

      await tx.chatMessage.update({
        where: { id },
        data: { poll: pollData },
      });

      return { status: 200, threadId, rawPoll: pollData, participantUserIds: authCheck.participantUserIds };
    });

    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error, code: result.code });
    }

    await ChatService.emitToAuthorizedThread({
      tenantId,
      threadId: result.threadId,
      event: "chat:poll_updated",
      payload: {
        id,
        threadId: result.threadId,
        poll: ChatService.sanitizePollForViewer(result.rawPoll, undefined),
      },
      participantUserIds: result.participantUserIds,
      perUserPayloadTransform: result.rawPoll?.isAnonymous
        ? (viewerId) => ({
            id,
            threadId: result.threadId,
            poll: ChatService.sanitizePollForViewer(result.rawPoll, viewerId),
          })
        : undefined,
    });

    return res.json({
      success: true,
      poll: ChatService.sanitizePollForViewer(result.rawPoll, currentUserId),
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/messages/delivered - Authoritative Delivery Receipt Acknowledgment (Section 5.2)
chatRouter.post("/messages/delivered", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { messageIds, threadId } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.json({ success: true, acknowledgedIds: [] });
    }

    // Resolve threadId from first message if client omitted threadId
    let targetThreadId = typeof threadId === "string" ? threadId : "";
    if (!targetThreadId) {
      const sample = await prisma.chatMessage.findFirst({
        where: { id: String(messageIds[0]), tenantId },
        select: { threadId: true },
      });
      if (!sample) return res.json({ success: true, acknowledgedIds: [] });
      targetThreadId = sample.threadId;
    }

    const result = await ChatService.acknowledgeDelivered({
      tenantId,
      userId: currentUserId,
      roles: req.user?.roles,
      threadId: targetThreadId,
      messageIds,
    });

    return res.json({ success: true, ...result });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// POST /api/chat/messages/:threadId/read (+ aliases) - Authoritative Read Receipt Update (Section 5.3)
const handleMarkThreadRead = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { threadId } = req.params;

    const result = await ChatService.markThreadRead({
      tenantId,
      userId: currentUserId,
      roles: req.user?.roles,
      threadId,
    });

    return res.json({ success: true, lastReadAt: result.lastReadAt, seenBy: result.seenBy });
  } catch (err: any) {
    return handleChatError(res, err);
  }
};

chatRouter.post("/messages/:threadId/read", handleMarkThreadRead);
chatRouter.post("/conversations/:threadId/read", handleMarkThreadRead);
chatRouter.post("/threads/:threadId/read", handleMarkThreadRead);

// DELETE /api/chat/messages/:id - Authoritative Delete ("Delete for everyone" vs "Delete for me") (Section 2.6)
chatRouter.delete("/messages/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;
    const forEveryone =
      req.query.forEveryone === "true" ||
      req.query.mode === "everyone" ||
      req.body?.forEveryone === true ||
      req.body?.mode === "everyone";

    const result = await ChatService.deleteMessage({
      tenantId,
      userId: currentUserId,
      roles: req.user?.roles,
      permissions: req.user?.permissions,
      workspaceRole: req.user?.workspaceRole,
      messageId: id,
      forEveryone,
    });

    return res.json({
      success: true,
      id: result.id,
      mode: result.mode,
      message: result.mode === "everyone" ? "Message deleted for everyone" : "Message hidden for you",
    });
  } catch (err: any) {
    return handleChatError(res, err);
  }
});

// =========================================================================
// CALL HISTORY ENDPOINTS (/api/chat/calls)
// =========================================================================

chatRouter.get("/calls", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const isAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin"].includes(r)) || false;

    const {
      search,
      callType,
      direction,
      status,
      startDate,
      endDate,
      contactId,
      page = "1",
      limit = "50",
      sort = "desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      tenantId,
      NOT: {
        hiddenByUserIds: { has: currentUserId },
      },
    };

    if (!isAdmin && currentUserId) {
      where.OR = [
        { callerId: currentUserId },
        { receiverId: currentUserId },
        { participantIds: { has: currentUserId } },
      ];
    }

    if (contactId && typeof contactId === "string") {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { callerId: contactId },
            { receiverId: contactId },
            { participantIds: { has: contactId } },
          ],
        },
      ];
    }

    if (callType && callType !== "all") {
      where.callType = String(callType).toLowerCase();
    }
    if (direction && direction !== "all") {
      where.direction = String(direction).toLowerCase();
    }
    if (status && status !== "all") {
      where.status = String(status).toLowerCase();
    }

    if (startDate || endDate) {
      where.callTime = {};
      if (startDate) where.callTime.gte = new Date(String(startDate));
      if (endDate) where.callTime.lte = new Date(String(endDate));
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { callerName: { contains: q, mode: "insensitive" } },
            { callerEmail: { contains: q, mode: "insensitive" } },
            { callerPhone: { contains: q, mode: "insensitive" } },
            { receiverName: { contains: q, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [total, calls] = await Promise.all([
      prisma.callHistoryRecord.count({ where }),
      prisma.callHistoryRecord.findMany({
        where,
        orderBy: { callTime: sort === "asc" ? "asc" : "desc" },
        skip,
        take: limitNum,
      }),
    ]);

    const enrichedCalls = calls.map((c) => {
      const isCaller = c.callerId === currentUserId;
      const isReceiver = c.receiverId === currentUserId;
      const computedDirection = c.direction || (isCaller ? "outgoing" : isReceiver ? "incoming" : "outgoing");
      const otherPartyName = isCaller ? c.receiverName || "Colleague" : c.callerName;
      const otherPartyAvatar = isCaller ? c.receiverAvatarUrl : c.callerAvatarUrl;

      return {
        ...c,
        computedDirection,
        contactName: otherPartyName,
        contactAvatarUrl: otherPartyAvatar,
        otherUserId: isCaller ? c.receiverId : c.callerId,
      };
    });

    res.setHeader("X-Total-Count", total.toString());
    res.setHeader("X-Page", pageNum.toString());
    res.setHeader("X-Total-Pages", Math.ceil(total / limitNum).toString());

    return res.json({
      calls: enrichedCalls,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err: any) {
    return handleChatError(res, err, "Failed to fetch call history");
  }
});

chatRouter.post("/calls", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const {
      callSessionId,
      callerId,
      callerName,
      callerEmail,
      callerPhone = "Internal Call",
      callerAvatarUrl,
      receiverId,
      receiverName,
      receiverAvatarUrl,
      direction = "outgoing",
      callType = "audio",
      durationSeconds = 0,
      status = "completed",
      notes,
      groupId,
      threadId,
      participantIds = [],
    } = req.body;

    if (!callSessionId) {
      return res.status(400).json({
        error: "Direct manual call logging is disabled. Call records must originate from verified call sessions.",
        code: "MANUAL_CALL_LOGGING_DISABLED",
      });
    }

    const existing = await prisma.callHistoryRecord.findFirst({
      where: { tenantId, callSessionId },
    });

    if (existing) {
      // Only call participants may update an existing call history record
      const isParticipant =
        existing.callerId === currentUserId ||
        existing.receiverId === currentUserId ||
        (Array.isArray(existing.participantIds) && existing.participantIds.includes(currentUserId));
      if (!isParticipant) {
        return res.status(403).json({ error: "Access denied: Not a participant of this call session." });
      }

      const finalStatus = status || existing.status;
      await prisma.callHistoryRecord.updateMany({
        where: { tenantId, callSessionId },
        data: {
          durationSeconds: Math.max(existing.durationSeconds, Number(durationSeconds) || 0),
          status: finalStatus,
          endedAt: new Date(),
          notes: notes || existing.notes,
        },
      });
      const updated = await prisma.callHistoryRecord.findUnique({ where: { id: existing.id } });

      if (["completed", "missed", "declined", "cancelled", "rejected"].includes(String(finalStatus).toLowerCase())) {
        const memSession = activeCalls.get(callSessionId);
        if (memSession) {
          if (memSession.timeoutTimer) clearTimeout(memSession.timeoutTimer);
          activeCalls.delete(callSessionId);
          const peerId = memSession.callerId === currentUserId ? memSession.targetUserId : memSession.callerId;
          const io = getIO();
          io?.to(`user:${peerId}`).emit("call:ended", { callId: callSessionId, endedBy: currentUserId, durationSeconds: Number(durationSeconds) || 0 });
          io?.to(`user:${peerId}`).emit("call.ended", { callId: callSessionId, endedBy: currentUserId, durationSeconds: Number(durationSeconds) || 0 });
        }
        const db = rawPrisma || prisma;
        const dbCalls = await db.call
          .findMany({
            where: { tenantId, OR: [{ id: callSessionId }, { roomKey: callSessionId }] },
            select: { id: true },
          })
          .catch(() => []);
        if (dbCalls.length > 0) {
          const ids = dbCalls.map((c: any) => c.id);
          await db.call
            .updateMany({ where: { id: { in: ids } }, data: { status: "ENDED", endedAt: new Date() } })
            .catch(() => {});
          await db.callParticipant
            .updateMany({ where: { callId: { in: ids }, leftAt: null }, data: { state: "LEFT", leftAt: new Date() } })
            .catch(() => {});
        }
      }

      return res.status(200).json(updated || existing);
    }

    const resolvedCallerId = callerId === currentUserId ? callerId : currentUserId;
    const record = await prisma.callHistoryRecord.create({
      data: {
        tenantId,
        callSessionId,
        callerId: resolvedCallerId,
        callerName: callerName || req.user?.email || "Colleague",
        callerEmail: callerEmail || null,
        callerPhone,
        callerAvatarUrl: callerAvatarUrl || null,
        receiverId: receiverId || null,
        receiverName: receiverName || null,
        receiverAvatarUrl: receiverAvatarUrl || null,
        direction: direction || "outgoing",
        callType: callType || "audio",
        durationSeconds: Number(durationSeconds) || 0,
        callTime: new Date(),
        startedAt: new Date(Date.now() - (Number(durationSeconds) || 0) * 1000),
        endedAt: new Date(),
        status: status || "completed",
        groupId: groupId || null,
        threadId: threadId || (groupId ? `group_${groupId}` : receiverId ? ChatService.canonicalizeDirectThreadId(resolvedCallerId, receiverId) : null),
        participantIds: Array.isArray(participantIds) ? participantIds : [],
        notes: notes || null,
      } as any,
    });

    if (["completed", "missed", "declined", "cancelled", "rejected"].includes(String(status || "completed").toLowerCase())) {
      const memSession = activeCalls.get(callSessionId);
      if (memSession && memSession.tenantId === tenantId) {
        if (memSession.timeoutTimer) clearTimeout(memSession.timeoutTimer);
        activeCalls.delete(callSessionId);
        const peerId = memSession.callerId === currentUserId ? memSession.targetUserId : memSession.callerId;
        const io = getIO();
        io?.to(`user:${peerId}`).emit("call:ended", { callId: callSessionId, endedBy: currentUserId, durationSeconds: Number(durationSeconds) || 0 });
        io?.to(`user:${peerId}`).emit("call.ended", { callId: callSessionId, endedBy: currentUserId, durationSeconds: Number(durationSeconds) || 0 });
      }
      const db = rawPrisma || prisma;
      const dbCall = await db.call
        .findFirst({
          where: { tenantId, OR: [{ id: callSessionId }, { roomKey: callSessionId }] },
          select: { id: true },
        })
        .catch(() => null);
      if (dbCall?.id) {
        await db.call.update({ where: { id: dbCall.id }, data: { status: "ENDED", endedAt: new Date() } }).catch(() => {});
        await db.callParticipant.updateMany({ where: { callId: dbCall.id, leftAt: null }, data: { state: "LEFT", leftAt: new Date() } }).catch(() => {});
      }
    }

    return res.status(201).json(record);
  } catch (err: any) {
    return handleChatError(res, err, "Failed to record call event");
  }
});

chatRouter.delete("/calls/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { id } = req.params;

    const record = await prisma.callHistoryRecord.findFirst({
      where: { id, tenantId },
    });

    if (!record) {
      return res.status(404).json({ error: "Call record not found." });
    }

    // Soft-hide for current user without destroying call history records (Section 0 rule: never delete call history)
    const existingHidden = record.hiddenByUserIds || [];
    if (!existingHidden.includes(currentUserId)) {
      await prisma.callHistoryRecord.update({
        where: { id },
        data: {
          hiddenByUserIds: { push: currentUserId },
        },
      });
    }

    return res.json({ success: true, message: "Call record hidden from your Call History." });
  } catch (err: any) {
    return handleChatError(res, err, "Failed to remove call record");
  }
});

chatRouter.post("/calls/bulk-delete", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Array of IDs required." });
    }

    const records = await prisma.callHistoryRecord.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true, hiddenByUserIds: true },
    });

    await Promise.all(
      records.map((r) => {
        if (!r.hiddenByUserIds.includes(currentUserId)) {
          return prisma.callHistoryRecord.update({
            where: { id: r.id },
            data: {
              hiddenByUserIds: { push: currentUserId },
            },
          });
        }
        return Promise.resolve();
      })
    );

    return res.json({ success: true, count: records.length });
  } catch (err: any) {
    return handleChatError(res, err, "Failed to bulk remove call records");
  }
});

// ============================================================================
// MULTI-PARTICIPANT WEBRTC MESH MEETINGS CONTROLLER (Section 8)
// ============================================================================

/**
 * Recovers an active group meeting from PostgreSQL (`Call` + `CallParticipant`) if in-memory `activeGroupCalls`
 * was cleared by a process restart or routed to another backend instance.
 */
async function resolveOrRecoverGroupMeeting(callId: string, tenantId: string) {
  const existingMem = activeGroupCalls.get(callId);
  if (existingMem && existingMem.tenantId === tenantId) {
    return existingMem;
  }

  const db = rawPrisma || prisma;
  const dbCall = await db.call
    .findFirst({
      where: {
        roomKey: `group_meeting:${callId}`,
        tenantId,
        status: { in: ["RINGING", "ACTIVE"] },
      },
      include: { participants: true },
    })
    .catch(() => null);

  if (!dbCall || !dbCall.groupId) return null;

  const group = await db.chatGroup
    .findFirst({
      where: { id: dbCall.groupId, tenantId },
      select: { id: true, name: true, avatarUrl: true },
    })
    .catch(() => null);

  const participantUserIds = dbCall.participants.map((p) => p.userId);
  const profiles: Array<{ userId: string; fullName: string | null; avatarUrl: string | null }> = await db.profile
    .findMany({
      where: { tenantId, userId: { in: participantUserIds } },
      select: { userId: true, fullName: true, avatarUrl: true },
    })
    .catch(() => []);
  const profMap = new Map<string, { userId: string; fullName: string | null; avatarUrl: string | null }>(
    profiles.map((p) => [p.userId, p])
  );

  const participants = new Map<string, any>();
  const invitedUserIds = new Set<string>();

  for (const p of dbCall.participants) {
    const prof = profMap.get(p.userId);
    if (p.state === "JOINED") {
      participants.set(p.userId, {
        userId: p.userId,
        name: cleanPersonName(prof?.fullName || "Participant"),
        avatar: prof?.avatarUrl || null,
        role: p.role === "HOST" ? "host" : "participant",
        joinedAt: p.joinedAt || dbCall.startedAt,
        isMuted: false,
        isCameraOff: dbCall.media === "AUDIO",
        isScreenSharing: false,
        isSpeaking: false,
        socketIds: new Set<string>(),
      });
    } else if (p.state === "INVITED" || p.state === "RINGING") {
      invitedUserIds.add(p.userId);
    }
  }

  const recovered = {
    callId,
    groupId: dbCall.groupId,
    groupName: group?.name || "Group Meeting",
    groupAvatarUrl: group?.avatarUrl || null,
    tenantId,
    creatorId: dbCall.startedBy,
    callType: (dbCall.media === "AUDIO" ? "audio" : "video") as "audio" | "video",
    startedAt: dbCall.startedAt,
    participants,
    invitedUserIds,
    historyPersisted: Boolean(dbCall.historyRecordId),
  };

  activeGroupCalls.set(callId, recovered as any);
  return recovered;
}

chatRouter.get("/meetings/config", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId || (req.user as any)?.id || "anonymous";
    const diagnostic = WebRtcIceService.getDiagnostics(userId);
    const iceServers = WebRtcIceService.getIceServers(userId);
    return res.json({
      transport: "webrtc-mesh",
      ...diagnostic,
      iceServers,
    });
  } catch (err: any) {
    return handleChatError(res, err, "Failed to resolve meetings config");
  }
});

// POST /api/chat/meetings/start - Server-authoritative WebRTC Mesh meeting start & direct ringing
chatRouter.post("/meetings/start", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId || (req.user as any)?.id;
    const { groupId, callId, callType = "video", invitedUserIds: extraInvitees = [] } = req.body;

    if (!groupId || !callId || !tenantId || !userId) {
      return res.status(400).json({ success: false, error: "groupId, callId and tenantId are required." });
    }

    if (!ChatService.hasChatPermission(req.user, "chat.meetings")) {
      return res.status(403).json({ success: false, error: "You do not have permission to start meetings." });
    }

    const existingActive = await resolveOrRecoverGroupMeeting(callId, tenantId);
    if (existingActive) {
      return res.json({
        success: true,
        callId,
        status: "connected",
        iceServers: WebRtcIceService.getIceServers(userId),
        message: "Meeting already active.",
      });
    }

    const group = await prisma.chatGroup.findFirst({
      where: { id: groupId, tenantId },
      include: { members: true },
    });

    if (!group || !group.members.some((m) => m.userId === userId)) {
      return res.status(403).json({ success: false, error: "You cannot start a meeting for this group." });
    }

    for (const [, call] of activeCalls) {
      if (
        call.tenantId === tenantId &&
        (call.status === "ringing" || call.status === "connected") &&
        (call.callerId === userId || call.targetUserId === userId)
      ) {
        return res.status(409).json({ success: false, code: "CALL_BUSY", error: "You are already in an active call." });
      }
    }

    for (const [, meeting] of activeGroupCalls) {
      if (meeting.tenantId === tenantId && meeting.participants.has(userId)) {
        return res.status(409).json({ success: false, code: "CALL_BUSY", error: "You are already in another meeting." });
      }
    }

    const { senderName: hostName, senderAvatar: hostAvatar } = await ChatService.resolveSenderIdentity({
      tenantId,
      userId,
      fallbackEmail: req.user?.email,
    });

    const normalizedCallType: "audio" | "video" = callType === "audio" ? "audio" : "video";
    const participants = new Map<string, any>();
    participants.set(userId, {
      userId,
      name: hostName,
      avatar: hostAvatar,
      role: "host",
      joinedAt: new Date(),
      isMuted: false,
      isCameraOff: normalizedCallType === "audio",
      isScreenSharing: false,
      isSpeaking: false,
      socketIds: new Set<string>(),
    });

    const invitedUserIds = new Set<string>();
    for (const m of group.members) {
      if (m.userId !== userId) {
        invitedUserIds.add(m.userId);
      }
    }

    // Validate optional extra same-tenant invitees
    if (Array.isArray(extraInvitees)) {
      for (const cand of extraInvitees) {
        const resolved = await ChatService.resolveParticipantUserInTenant(tenantId, String(cand));
        if (resolved && resolved.userId !== userId) {
          invitedUserIds.add(resolved.userId);
        }
      }
    }

    activeGroupCalls.set(callId, {
      callId,
      groupId,
      groupName: group.name,
      groupAvatarUrl: group.avatarUrl,
      tenantId,
      creatorId: userId,
      callType: normalizedCallType,
      startedAt: new Date(),
      participants,
      invitedUserIds,
      historyPersisted: false,
    });

    // Persist durable Call + CallParticipant records in PostgreSQL for multi-node/restart resilience
    const db = rawPrisma || prisma;
    await db.call
      .upsert({
        where: { roomKey: `group_meeting:${callId}` },
        create: {
          tenantId,
          type: "GROUP",
          media: normalizedCallType === "audio" ? "AUDIO" : "VIDEO",
          status: "ACTIVE",
          startedBy: userId,
          roomKey: `group_meeting:${callId}`,
          groupId,
          threadId: `group_${groupId}`,
          answeredAt: new Date(),
          ringingExpiresAt: new Date(Date.now() + 3600 * 1000),
          maxParticipants: 25,
          participants: {
            create: [
              { userId, state: "JOINED", role: "HOST", joinedAt: new Date() },
              ...Array.from(invitedUserIds).map((uid) => ({
                userId: uid,
                state: "INVITED",
                role: "PARTICIPANT",
              })),
            ],
          },
        },
        update: { status: "ACTIVE" },
      })
      .catch(() => {});

    const ioInstance = getIO();
    for (const inviteeId of invitedUserIds) {
      const invitePayload = {
        groupId,
        groupName: group.name,
        groupAvatarUrl: group.avatarUrl,
        callId,
        callType: normalizedCallType,
        callerId: userId,
        callerName: hostName,
        callerAvatar: hostAvatar,
        eventId: `group_call_${callId}_${inviteeId}`,
      };
      ioInstance?.to(`user:${inviteeId}`).emit("group-call:incoming", invitePayload);
      PusherService.triggerUserEvent(tenantId, inviteeId, "group-call:incoming", invitePayload).catch(() => {});
      void IncomingCallPushService.sendIncomingCallPush({
        tenantId,
        targetUserId: inviteeId,
        callId,
        callerId: userId,
        callerName: `${hostName} (${group.name})`,
        callerAvatar: group.avatarUrl || hostAvatar,
        callType: normalizedCallType,
        threadId: `group_${groupId}`,
      }).catch(() => {});
    }

    await recordSystemEvent(
      tenantId,
      `group_${groupId}`,
      userId,
      "group_call_started",
      `${hostName} started a group ${normalizedCallType} meeting.`,
      { groupId, callId, callType: normalizedCallType }
    ).catch(() => {});

    return res.json({
      success: true,
      callId,
      status: "connected",
      iceServers: WebRtcIceService.getIceServers(userId),
      message: "Meeting session confirmed and started successfully",
    });
  } catch (err: any) {
    return handleChatError(res, err, "Failed to start meeting");
  }
});

// POST /api/chat/meetings/:callId/join - Join WebRTC Mesh group meeting (REST + Pusher + Socket parity)
chatRouter.post("/meetings/:callId/join", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const userId = req.user?.userId || "";
    const { callId } = req.params;
    const { groupId } = req.body || {};

    const session = await resolveOrRecoverGroupMeeting(callId, tenantId);
    if (!session || session.tenantId !== tenantId || (groupId && session.groupId !== groupId)) {
      return res.status(404).json({ error: "Active meeting session not found." });
    }

    const group = await prisma.chatGroup.findFirst({
      where: { id: session.groupId, tenantId },
      include: { members: true },
    });

    const isMember = Boolean(group && group.members.some((m) => m.userId === userId));
    const isInvited = session.participants.has(userId) || session.invitedUserIds.has(userId);
    if (!isMember && !isInvited) {
      return res.status(403).json({ error: "Access denied. You are not a member or invitee of this meeting." });
    }

    const isHost =
      session.creatorId === userId ||
      req.user?.roles?.some((r) => ["super_admin", "tenant_admin"].includes(r)) ||
      false;

    const { senderName: displayName, senderAvatar } = await ChatService.resolveSenderIdentity({
      tenantId,
      userId,
      fallbackEmail: req.user?.email,
    });

    let participant = session.participants.get(userId);
    if (!participant) {
      participant = {
        userId,
        name: displayName,
        avatar: senderAvatar,
        role: isHost ? "host" : "participant",
        joinedAt: new Date(),
        isMuted: false,
        isCameraOff: session.callType === "audio",
        isScreenSharing: false,
        isSpeaking: false,
        socketIds: new Set<string>(),
      };
      session.participants.set(userId, participant);
    }

    // Mark participant JOINED in durable DB call record
    const db = rawPrisma || prisma;
    const dbCall = await db.call
      .findUnique({ where: { roomKey: `group_meeting:${callId}` }, select: { id: true } })
      .catch(() => null);
    if (dbCall?.id) {
      await db.callParticipant
        .upsert({
          where: { callId_userId: { callId: dbCall.id, userId } },
          create: { callId: dbCall.id, userId, state: "JOINED", role: isHost ? "HOST" : "PARTICIPANT", joinedAt: new Date() },
          update: { state: "JOINED", joinedAt: new Date(), leftAt: null },
        })
        .catch(() => {});
    }

    const joinedPayload = {
      callId,
      userId,
      name: participant.name,
      avatar: participant.avatar,
      role: participant.role,
      isMuted: participant.isMuted,
      isCameraOff: participant.isCameraOff,
    };

    const io = getIO();
    io?.to(`group_call_${callId}`).emit("group-call:user_joined", joinedPayload);
    for (const pid of session.participants.keys()) {
      if (pid !== userId) {
        io?.to(`user:${pid}`).emit("group-call:user_joined", joinedPayload);
        void PusherService.triggerUserEvent(tenantId, pid, "group-call:user_joined", joinedPayload).catch(() => {});
      }
    }

    void IncomingCallPushService.sendCallCancelledPush({
      tenantId,
      targetUserId: userId,
      callId,
      reason: "accepted",
    }).catch(() => {});

    const roster = Array.from(session.participants.values()).map((p: any) => ({
      userId: p.userId,
      name: p.name,
      avatar: p.avatar,
      role: p.role,
      isMuted: p.isMuted,
      isCameraOff: p.isCameraOff,
      isScreenSharing: p.isScreenSharing,
      isSpeaking: p.isSpeaking,
    }));

    return res.json({
      success: true,
      mode: "webrtc_mesh",
      callId,
      groupId: session.groupId,
      callType: session.callType,
      creatorId: session.creatorId,
      isHost,
      iceServers: WebRtcIceService.getIceServers(userId),
      user: { userId, name: displayName, avatarUrl: senderAvatar },
      participants: roster,
    });
  } catch (err: any) {
    return handleChatError(res, err, "Failed to join meeting");
  }
});

// POST /api/chat/meetings/:callId/signal - HTTP WebRTC Mesh signaling relay for group meetings
chatRouter.post("/meetings/:callId/signal", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const userId = req.user?.userId || "";
    const { callId } = req.params;
    const rawTargetId = req.body?.targetUserId || req.body?.toUserId;
    const signal = req.body?.signal;

    if (!rawTargetId || !signal || typeof signal !== "object") {
      return res.status(400).json({ error: "targetUserId and signal are required." });
    }

    const session = await resolveOrRecoverGroupMeeting(callId, tenantId);
    if (!session || session.tenantId !== tenantId) {
      return res.status(404).json({ error: "Active meeting session not found." });
    }

    const resolvedTarget = await ChatService.resolveParticipantUserInTenant(tenantId, String(rawTargetId));
    const targetUserId = resolvedTarget?.userId || String(rawTargetId);

    const senderOk = session.participants.has(userId) || session.invitedUserIds.has(userId);
    const targetOk = session.participants.has(targetUserId) || session.invitedUserIds.has(targetUserId);
    if (!senderOk || !targetOk) {
      return res.status(403).json({ error: "Unauthorized meeting signaling peer." });
    }

    const signalPayload = {
      callId,
      senderId: userId,
      fromUserId: userId,
      signal,
    };

    const io = getIO();
    io?.to(`user:${targetUserId}`).emit("group-call:signal", signalPayload);
    void PusherService.triggerUserEvent(tenantId, targetUserId, "group-call:signal", signalPayload).catch(() => {});

    return res.json({ success: true, delivered: true });
  } catch (err: any) {
    return handleChatError(res, err, "Failed to relay meeting signal");
  }
});

// POST /api/chat/meetings/:callId/media-state - Sync mute / camera / screen-share in group meeting
chatRouter.post("/meetings/:callId/media-state", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const userId = req.user?.userId || "";
    const { callId } = req.params;
    const { isMuted, isCameraOff, isScreenSharing, isSpeaking } = req.body || {};

    const session = await resolveOrRecoverGroupMeeting(callId, tenantId);
    if (!session || session.tenantId !== tenantId) {
      return res.status(404).json({ error: "Active meeting session not found." });
    }

    const participant = session.participants.get(userId);
    if (!participant) {
      return res.status(403).json({ error: "Not an active participant in this meeting." });
    }

    if (typeof isMuted === "boolean") participant.isMuted = isMuted;
    if (typeof isCameraOff === "boolean") participant.isCameraOff = isCameraOff;
    if (typeof isScreenSharing === "boolean") participant.isScreenSharing = isScreenSharing;
    if (typeof isSpeaking === "boolean") participant.isSpeaking = isSpeaking;

    const statePayload = {
      callId,
      userId,
      isMuted: participant.isMuted,
      isCameraOff: participant.isCameraOff,
      isScreenSharing: participant.isScreenSharing,
      isSpeaking: participant.isSpeaking,
    };

    const io = getIO();
    io?.to(`group_call_${callId}`).emit("group-call:media_state", statePayload);
    for (const pid of session.participants.keys()) {
      if (pid !== userId) {
        void PusherService.triggerUserEvent(tenantId, pid, "group-call:media_state", statePayload).catch(() => {});
      }
    }

    return res.json({ success: true });
  } catch (err: any) {
    return handleChatError(res, err, "Failed to update meeting media state");
  }
});

// POST /api/chat/meetings/:callId/invite - Directly ring additional workspace colleagues into group meeting
chatRouter.post("/meetings/:callId/invite", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const userId = req.user?.userId || "";
    const { callId } = req.params;
    const rawUserIds: string[] = Array.isArray(req.body?.userIds)
      ? req.body.userIds
      : req.body?.targetUserId
        ? [req.body.targetUserId]
        : [];

    if (rawUserIds.length === 0) {
      return res.status(400).json({ error: "userIds array is required." });
    }

    const session = await resolveOrRecoverGroupMeeting(callId, tenantId);
    if (!session || session.tenantId !== tenantId) {
      return res.status(404).json({ error: "Active meeting session not found." });
    }
    if (!session.participants.has(userId)) {
      return res.status(403).json({ error: "Only active meeting participants can invite colleagues." });
    }

    const { senderName: inviterName, senderAvatar: inviterAvatar } = await ChatService.resolveSenderIdentity({
      tenantId,
      userId,
      fallbackEmail: req.user?.email,
    });

    const io = getIO();
    const invitedIds: string[] = [];

    for (const candidate of rawUserIds) {
      const resolved = await ChatService.resolveParticipantUserInTenant(tenantId, String(candidate));
      if (!resolved || resolved.userId === userId || session.participants.has(resolved.userId)) continue;

      const targetId = resolved.userId;
      session.invitedUserIds.add(targetId);
      invitedIds.push(targetId);

      const invitePayload = {
        groupId: session.groupId,
        groupName: session.groupName || "Group Meeting",
        groupAvatarUrl: session.groupAvatarUrl || null,
        callId,
        callType: session.callType,
        callerId: userId,
        callerName: inviterName,
        callerAvatar: inviterAvatar,
        eventId: `group_call_${callId}_${targetId}_${Date.now()}`,
      };

      io?.to(`user:${targetId}`).emit("group-call:incoming", invitePayload);
      void PusherService.triggerUserEvent(tenantId, targetId, "group-call:incoming", invitePayload).catch(() => {});
      void IncomingCallPushService.sendIncomingCallPush({
        tenantId,
        targetUserId: targetId,
        callId,
        callerId: userId,
        callerName: `${inviterName} (${session.groupName || "Group Meeting"})`,
        callerAvatar: session.groupAvatarUrl || inviterAvatar,
        callType: session.callType,
        threadId: `group_${session.groupId}`,
      }).catch(() => {});
    }

    return res.json({ success: true, invitedCount: invitedIds.length, invitedUserIds: invitedIds });
  } catch (err: any) {
    return handleChatError(res, err, "Failed to invite colleagues to meeting");
  }
});

// POST /api/chat/meetings/:callId/leave - Leave group meeting cleanly
chatRouter.post("/meetings/:callId/leave", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const userId = req.user?.userId || "";
    const { callId } = req.params;

    const session = await resolveOrRecoverGroupMeeting(callId, tenantId);
    if (!session || session.tenantId !== tenantId) {
      return res.json({ success: true });
    }

    const leavingParticipant = session.participants.get(userId);
    session.participants.delete(userId);

    const db = rawPrisma || prisma;
    const dbCall = await db.call
      .findUnique({ where: { roomKey: `group_meeting:${callId}` }, select: { id: true } })
      .catch(() => null);
    if (dbCall?.id) {
      await db.callParticipant
        .updateMany({
          where: { callId: dbCall.id, userId },
          data: { state: "LEFT", leftAt: new Date(), leaveReason: "USER_LEFT" },
        })
        .catch(() => {});
    }

    const leftPayload = {
      callId,
      userId,
      userName: leavingParticipant?.name || "Participant",
    };

    const io = getIO();
    io?.to(`group_call_${callId}`).emit("group-call:user_left", leftPayload);
    for (const pid of session.participants.keys()) {
      io?.to(`user:${pid}`).emit("group-call:user_left", leftPayload);
      void PusherService.triggerUserEvent(tenantId, pid, "group-call:user_left", leftPayload).catch(() => {});
    }

    if (session.participants.size === 0) {
      activeGroupCalls.delete(callId);
      if (dbCall?.id) {
        await db.call
          .update({
            where: { id: dbCall.id },
            data: { status: "ENDED", endedAt: new Date(), endReason: "ALL_PARTICIPANTS_LEFT" },
          })
          .catch(() => {});
      }
    }

    return res.json({ success: true });
  } catch (err: any) {
    return handleChatError(res, err, "Failed to leave meeting");
  }
});

// GET /api/chat/meetings/:callId/participants - Authorized participant roster
chatRouter.get("/meetings/:callId/participants", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { callId } = req.params;

    const session = await resolveOrRecoverGroupMeeting(callId, tenantId);
    if (!session || session.tenantId !== tenantId) {
      return res.status(404).json({ error: "Active meeting session not found." });
    }

    // Enforce membership / invitation authorization before disclosing active meeting participants!
    const isInSession = session.participants.has(currentUserId) || session.invitedUserIds.has(currentUserId);
    if (!isInSession) {
      const authCheck = await ChatService.authorizeThread({
        threadId: `group_${session.groupId}`,
        tenantId,
        userId: currentUserId,
        roles: req.user?.roles,
        allowAdminModeration: false,
      });
      if (!authCheck.authorized) {
        return res.status(403).json({
          error: "Access denied: You are not authorized to view participants of this meeting.",
          code: "CHAT_UNAUTHORIZED",
        });
      }
    }

    const participants = Array.from(session.participants.values()).map((p: any) => ({
      userId: p.userId,
      name: p.name,
      avatar: p.avatar,
      role: p.role,
      joinedAt: p.joinedAt,
      isMuted: p.isMuted,
      isCameraOff: p.isCameraOff,
      isScreenSharing: p.isScreenSharing,
      isSpeaking: p.isSpeaking,
    }));

    return res.json({
      callId: session.callId,
      groupId: session.groupId,
      groupName: session.groupName,
      callType: session.callType,
      creatorId: session.creatorId,
      startedAt: session.startedAt,
      participants,
    });
  } catch (err: any) {
    return handleChatError(res, err, "Failed to get meeting participants");
  }
});

// POST /api/chat/meetings/:callId/end - End meeting for everyone (host only, scoped emission)
chatRouter.post("/meetings/:callId/end", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const userId = req.user?.userId || "";
    const { callId } = req.params;

    const session = await resolveOrRecoverGroupMeeting(callId, tenantId);
    if (!session || session.tenantId !== tenantId) {
      return res.status(404).json({ error: "Active meeting session not found." });
    }

    const isHost =
      session.creatorId === userId ||
      req.user?.roles?.some((r) => ["super_admin", "tenant_admin"].includes(r)) ||
      false;

    if (!isHost) {
      return res.status(403).json({ error: "Only the meeting host can end the meeting for everyone." });
    }

    const participantIds = Array.from(session.participants.keys());
    const allRecipientIds = Array.from(new Set([...participantIds, ...Array.from(session.invitedUserIds)]));

    if (!session.historyPersisted) {
      session.historyPersisted = true;
      const durationSeconds = Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000));
      const { senderName: hostName } = await ChatService.resolveSenderIdentity({
        tenantId,
        userId: session.creatorId,
      });

      try {
        await runWithTenantContext(
          {
            tenantId,
            userId,
            roles: req.user?.roles || [],
            status: "ACTIVE",
            tenancyStrategy: "SHARED_SCHEMA",
            db: rawPrisma,
          },
          async () => {
            const existingHistory = await rawPrisma.callHistoryRecord.findFirst({
              where: { tenantId, callSessionId: callId },
              select: { id: true },
            });
            const historyRec = existingHistory
              ? await rawPrisma.callHistoryRecord.update({
                  where: { id: existingHistory.id },
                  data: { status: "completed", durationSeconds },
                })
              : await rawPrisma.callHistoryRecord.create({
                  data: {
                    tenantId,
                    callSessionId: callId,
                    callerId: session.creatorId,
                    callerName: hostName,
                    callerPhone: "Group Meeting",
                    callType: session.callType,
                    status: "completed",
                    durationSeconds,
                    callTime: new Date(),
                    groupId: session.groupId,
                    threadId: `group_${session.groupId}`,
                    participantIds: participantIds.length > 0 ? participantIds : [userId],
                    notes: "Group meeting ended by host.",
                  } as any,
                });

            await rawPrisma.call
              .updateMany({
                where: { roomKey: `group_meeting:${callId}`, tenantId },
                data: {
                  status: "ENDED",
                  endedAt: new Date(),
                  endReason: "HOST_ENDED",
                  historyRecordId: historyRec.id,
                },
              })
              .catch(() => {});
          }
        );
      } catch (e: any) {
        console.warn("Failed to persist call history on API meeting end:", e.message);
      }
    }

    const endPayload = {
      callId,
      groupId: session.groupId,
      endedBy: userId,
      reason: "host_ended",
    };

    const io = getIO();
    if (io) {
      io.to(`group_call_${callId}`).emit("group-call:ended", endPayload);
    }

    // Scoped strictly to meeting participants & invitees (never PusherService.triggerTenantEvent!)
    await ChatService.emitToAuthorizedThread({
      tenantId,
      threadId: `group_${session.groupId}`,
      event: "group-call:ended",
      payload: endPayload,
      participantUserIds: allRecipientIds,
    });

    activeGroupCalls.delete(callId);
    return res.json({ success: true, message: "Meeting ended for everyone." });
  } catch (err: any) {
    return handleChatError(res, err, "Failed to end meeting");
  }
});
