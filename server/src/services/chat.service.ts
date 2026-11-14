import crypto from "crypto";
import { prisma, rawPrisma } from "../prisma";
import { runWithTenantContext } from "../context/tenant-context";
import { getIO } from "../socket";
import { PusherService } from "./pusher.service";
import { runInBackground } from "../lib/background-tasks";
import { NotificationService } from "./notification.service";
import { UrlPreviewService } from "./url-preview.service";

export const CHAT_RESTRICTED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "bin", "msi", "apk", "com", "vbs", "ps1", "scr", "pif", "app", "dmg", "pkg", "deb", "rpm",
  "env", "json", "js", "mjs", "cjs", "jsx", "ts", "tsx", "php", "py", "pyc", "rb", "go", "java", "class", "jar",
  "c", "cpp", "h", "hpp", "cs", "sql", "bash", "zsh", "lua", "pl", "asp", "aspx", "jsp", "wasm", "yaml", "yml",
  "pem", "key", "crt", "cer", "pfx", "p12", "svg", "svgz", "html", "htm", "xhtml", "hta",
]);

export const MAX_CHAT_ATTACHMENTS_PER_MESSAGE = 10;
export const MAX_CHAT_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB
export const DEFAULT_MAX_GROUP_MEMBERS = 250;

export type ChatPermissionAction =
  | "chat.view"
  | "chat.send"
  | "chat.create_group"
  | "chat.manage_group"
  | "chat.manage_members"
  | "chat.delete_messages"
  | "chat.files"
  | "chat.calls"
  | "chat.meetings"
  | "chat.announcements";

export interface ThreadAuthResult {
  authorized: boolean;
  status?: number;
  code?: string;
  reason?: string;
  threadType?: "direct" | "group";
  canonicalThreadId?: string;
  groupId?: string;
  group?: any;
  membership?: any;
  memberRole?: string;
  participantUserIds?: string[];
}

export class ChatDomainError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status = 400, code = "CHAT_ERROR") {
    super(message);
    this.name = "ChatDomainError";
    this.status = status;
    this.code = code;
  }
}

const profileCache = new Map<string, { fullName: string; avatarUrl: string | null; expiresAt: number }>();

export function cleanChatPersonName(name?: string | null): string {
  if (!name) return "User";
  return (
    name
      .replace(/\s*\([^)]*(admin|administrator|manager|employee|owner|leader|supervisor|tester|user|staff|hr)[^)]*\)/gi, "")
      .replace(/\s+/g, " ")
      .trim() || "User"
  );
}

export class ChatService {
  public static invalidateProfileCache(userId?: string, tenantId?: string): void {
    if (!userId && !tenantId) {
      profileCache.clear();
      return;
    }
    for (const key of Array.from(profileCache.keys())) {
      const [tId, uId] = key.split(":");
      if ((!userId || uId === userId) && (!tenantId || tId === tenantId)) {
        profileCache.delete(key);
      }
    }
  }

  private static getSigningSecret(): string {
    return process.env.JWT_SECRET || "masterhrms-chat-attachment-signing-key";
  }

  public static getThreadRoomName(tenantId: string, threadId: string): string {
    return `tenant:${tenantId}:chat:${threadId}`;
  }

  public static canonicalizeDirectThreadId(userIdA: string, userIdB: string): string {
    return `direct_${[String(userIdA).trim(), String(userIdB).trim()].sort().join("_")}`;
  }

  /**
   * Evaluates existing MASTERHRMS RBAC permissions & roles without creating a parallel system.
   * Standard employees have baseline chat/call/file/group rights unless restricted by workspace policy;
   * administrative actions (announcements, cross-user moderation) require HR/Admin roles or explicit permission codes.
   */
  public static hasChatPermission(
    actor: { roles?: string[]; permissions?: string[]; workspaceRole?: string } | undefined,
    action: ChatPermissionAction
  ): boolean {
    if (!actor) return false;
    const roles = actor.roles || [];
    const perms = actor.permissions || [];
    const wsRole = (actor.workspaceRole || "").toLowerCase();

    const isAdminOrHr =
      roles.some((r) => ["super_admin", "tenant_admin", "hr_admin", "admin"].includes(r)) ||
      ["owner", "admin", "hr manager", "hr_admin", "workspace admin"].includes(wsRole);

    if (isAdminOrHr) return true;
    if (perms.includes("*") || perms.includes(action)) return true;

    // Restricted actions require explicit permission or HR/Admin role
    if (action === "chat.announcements") {
      return perms.includes("hrm.announcements.manage") || perms.includes("chat.announcements");
    }

    // Check if workspace explicitly denied a permission via negative marker
    if (perms.includes(`!${action}`)) return false;

    // Baseline employee collaboration capabilities
    return true;
  }

  public static validateAttachmentsSecurity(
    attachments: any[]
  ): { isAllowed: boolean; status?: number; code?: string; blockedFile?: string; reason?: string } {
    if (!attachments || !Array.isArray(attachments)) return { isAllowed: true };
    if (attachments.length > MAX_CHAT_ATTACHMENTS_PER_MESSAGE) {
      return {
        isAllowed: false,
        status: 400,
        code: "TOO_MANY_FILES",
        reason: `A single message cannot exceed ${MAX_CHAT_ATTACHMENTS_PER_MESSAGE} attachments.`,
      };
    }

    for (const att of attachments) {
      const fileName = String(att?.name || att?.fileName || "").toLowerCase().trim();
      if (fileName === ".env" || fileName.startsWith(".env.") || fileName.endsWith(".env")) {
        return {
          isAllowed: false,
          status: 403,
          code: "FILE_RESTRICTED",
          blockedFile: fileName,
          reason: "Environment configuration files (.env) are strictly prohibited.",
        };
      }
      const lastDot = fileName.lastIndexOf(".");
      if (lastDot !== -1) {
        const ext = fileName.slice(lastDot + 1);
        if (CHAT_RESTRICTED_EXTENSIONS.has(ext)) {
          return {
            isAllowed: false,
            status: 403,
            code: "FILE_RESTRICTED",
            blockedFile: fileName,
            reason: `Files with extension .${ext} are prohibited for security.`,
          };
        }
      }
      const sz = Number(att?.size || att?.fileSize || 0);
      if (sz > MAX_CHAT_FILE_SIZE_BYTES) {
        return {
          isAllowed: false,
          status: 413,
          code: "FILE_TOO_LARGE",
          blockedFile: fileName || "Attachment",
          reason: `Attachment exceeds the 30 MB size limit.`,
        };
      }
    }
    return { isAllowed: true };
  }

  /**
   * Resolves a token (User.id or Employee.id) to canonical User.id within the given tenant.
   */
  public static async resolveParticipantUserInTenant(
    tenantId: string,
    candidateId: string
  ): Promise<{ userId: string; employeeId?: string } | null> {
    if (!tenantId || !candidateId || typeof candidateId !== "string") return null;
    const clean = candidateId.trim();
    if (!clean || clean.length > 64 || /[\s/\\]/.test(clean)) return null;

    const db = rawPrisma || prisma;
    const profile = await db.profile.findFirst({
      where: { tenantId, userId: clean },
      select: { userId: true },
    });
    if (profile?.userId) {
      return { userId: profile.userId };
    }

    const emp = await db.employee.findFirst({
      where: {
        tenantId,
        OR: [{ id: clean }, { userId: clean }],
      },
      select: { id: true, userId: true },
    });
    if (emp) {
      return { userId: emp.userId || emp.id, employeeId: emp.id };
    }

    // Also support super_admin accounts assigned to this workspace if explicitly present in UserRoleAssignment
    const roleAssign = await db.userRoleAssignment.findFirst({
      where: { tenantId, userId: clean },
      select: { userId: true },
    }).catch(() => null);
    if (roleAssign?.userId) {
      return { userId: roleAssign.userId };
    }

    return null;
  }

  /**
   * Strict, zero-trust thread authorization (Section 2.2).
   * - Rejects unknown prefixes and malformed direct thread IDs.
   * - Resolves both direct conversation participants and verifies BOTH belong to tenantId.
   * - Verifies caller is one of the two direct participants (never exposes private 1:1 DMs to other tenant users/admins).
   * - For group threads, verifies active ChatGroupMember in tenantId (with explicit audited moderation flag only where permitted).
   */
  public static async authorizeThread(params: {
    threadId: string;
    tenantId: string;
    userId: string;
    roles?: string[];
    allowAdminModeration?: boolean;
    requireWritePermission?: boolean;
  }): Promise<ThreadAuthResult> {
    const {
      threadId,
      tenantId,
      userId,
      roles = [],
      allowAdminModeration = false,
      requireWritePermission = false,
    } = params;

    if (!tenantId || tenantId === "default" || !userId) {
      return {
        authorized: false,
        status: 401,
        code: "CHAT_AUTH_REQUIRED",
        reason: "Authenticated workspace context is required.",
      };
    }

    if (!threadId || typeof threadId !== "string" || threadId.length > 100 || /[\s/\\]/.test(threadId)) {
      return {
        authorized: false,
        status: 400,
        code: "INVALID_THREAD_ID",
        reason: "Invalid or malformed conversation thread ID.",
      };
    }

    const db = rawPrisma || prisma;

    // 1. Direct 1:1 Conversation
    if (threadId.startsWith("direct_")) {
      const rawBody = threadId.slice("direct_".length);
      const parts = rawBody.split("_").filter(Boolean);
      if (parts.length !== 2) {
        return {
          authorized: false,
          status: 400,
          code: "MALFORMED_DIRECT_THREAD",
          reason: "Malformed direct conversation identifier: exactly two participants are required.",
        };
      }

      const [rawA, rawB] = parts;
      const [resolvedA, resolvedB, callerEmp] = await Promise.all([
        this.resolveParticipantUserInTenant(tenantId, rawA),
        this.resolveParticipantUserInTenant(tenantId, rawB),
        db.employee.findFirst({
          where: { tenantId, userId },
          select: { id: true, userId: true },
        }),
      ]);

      if (!resolvedA || !resolvedB) {
        return {
          authorized: false,
          status: 403,
          code: "CROSS_TENANT_FORBIDDEN",
          reason: "Access denied: One or more conversation participants do not belong to this workspace.",
        };
      }

      const callerIds = new Set<string>([userId]);
      if (callerEmp?.id) callerIds.add(callerEmp.id);

      const isCallerParticipant =
        callerIds.has(rawA) ||
        callerIds.has(rawB) ||
        callerIds.has(resolvedA.userId) ||
        callerIds.has(resolvedB.userId) ||
        (resolvedA.employeeId ? callerIds.has(resolvedA.employeeId) : false) ||
        (resolvedB.employeeId ? callerIds.has(resolvedB.employeeId) : false);

      if (!isCallerParticipant) {
        return {
          authorized: false,
          status: 403,
          code: "CHAT_UNAUTHORIZED",
          reason: "Access denied: You are not a participant in this private direct conversation.",
        };
      }

      const participantUserIds = Array.from(new Set([resolvedA.userId, resolvedB.userId]));
      return {
        authorized: true,
        threadType: "direct",
        canonicalThreadId: this.canonicalizeDirectThreadId(resolvedA.userId, resolvedB.userId),
        participantUserIds,
      };
    }

    // 2. Group Conversation
    if (threadId.startsWith("group_")) {
      const groupId = threadId.slice("group_".length).trim();
      if (!groupId || groupId.includes("_") || groupId.length > 64) {
        return {
          authorized: false,
          status: 400,
          code: "INVALID_GROUP_THREAD",
          reason: "Malformed group thread identifier.",
        };
      }

      const group = await db.chatGroup.findFirst({
        where: { id: groupId, tenantId },
        include: {
          members: {
            select: { id: true, userId: true, role: true, isMuted: true, mutedUntil: true },
          },
        },
      });

      if (!group) {
        return {
          authorized: false,
          status: 403,
          code: "CHAT_UNAUTHORIZED",
          reason: "Access denied: Group does not exist in your workspace.",
          groupId,
        };
      }

      const membership = group.members.find((m: any) => m.userId === userId);
      const isWorkspaceAdmin = roles.some((r) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));

      if (!membership) {
        if (allowAdminModeration && isWorkspaceAdmin) {
          return {
            authorized: true,
            threadType: "group",
            canonicalThreadId: threadId,
            groupId,
            group,
            memberRole: "workspace_admin",
            participantUserIds: group.members.map((m: any) => m.userId),
          };
        }
        return {
          authorized: false,
          status: 403,
          code: "CHAT_UNAUTHORIZED",
          reason: "Access denied: You are not an active member of this chat group.",
          groupId,
        };
      }

      const effectiveRole = group.ownerId === userId ? "owner" : (membership.role || "member");

      if (requireWritePermission) {
        if ((group as any).isArchived) {
          return {
            authorized: false,
            status: 403,
            code: "GROUP_ARCHIVED",
            reason: "This group is archived and no longer accepts new messages.",
            groupId,
          };
        }
        if (
          (group as any).isAnnouncementOnly &&
          !["owner", "admin", "moderator"].includes(effectiveRole) &&
          !isWorkspaceAdmin
        ) {
          return {
            authorized: false,
            status: 403,
            code: "ANNOUNCEMENT_ONLY",
            reason: "Only group owners, admins, or HR administrators can post in announcement channels.",
            groupId,
          };
        }
      }

      return {
        authorized: true,
        threadType: "group",
        canonicalThreadId: threadId,
        groupId,
        group,
        membership,
        memberRole: effectiveRole,
        participantUserIds: group.members.map((m: any) => m.userId),
      };
    }

    // 3. Reject all unknown / arbitrary thread prefixes
    return {
      authorized: false,
      status: 403,
      code: "UNKNOWN_THREAD_PREFIX",
      reason: "Rejected: Unsupported or unauthorized conversation prefix.",
    };
  }

  /**
   * Resolves all authorized User IDs for a thread without trusting client input.
   */
  public static async getAuthorizedParticipantUserIds(tenantId: string, threadId: string): Promise<string[]> {
    const db = rawPrisma || prisma;
    if (threadId.startsWith("direct_")) {
      const parts = threadId.slice("direct_".length).split("_").filter(Boolean);
      if (parts.length !== 2) return [];
      const [a, b] = await Promise.all([
        this.resolveParticipantUserInTenant(tenantId, parts[0]),
        this.resolveParticipantUserInTenant(tenantId, parts[1]),
      ]);
      if (!a || !b) return [];
      return Array.from(new Set([a.userId, b.userId]));
    }
    if (threadId.startsWith("group_")) {
      const groupId = threadId.slice("group_".length);
      const members = await db.chatGroupMember.findMany({
        where: { tenantId, groupId },
        select: { userId: true },
      });
      return members.map((m: any) => m.userId);
    }
    return [];
  }

  /**
   * Emits a realtime chat event strictly to:
   *  1) Conversation-specific Socket.IO room `tenant:{tenantId}:chat:{threadId}`
   *  2) Authorized participants' individual `user:{uid}` rooms (Socket.IO deduplicates across chained .to() rooms!)
   *  3) Authorized participants' private Pusher channels `private-user-{uid}` (when Pusher is enabled)
   * NEVER emits private chat payloads to `tenant:{tenantId}` or `private-tenant-{tenantId}`!
   */
  public static async emitToAuthorizedThread(params: {
    tenantId: string;
    threadId: string;
    event: string;
    payload: any;
    participantUserIds?: string[];
    excludeUserId?: string;
    skipUserRooms?: boolean;
    skipPusher?: boolean;
    perUserPayloadTransform?: (viewerUserId: string) => any;
  }): Promise<void> {
    const {
      tenantId,
      threadId,
      event,
      payload,
      excludeUserId,
      skipUserRooms = false,
      skipPusher = false,
      perUserPayloadTransform,
    } = params;

    const participantIds = (
      params.participantUserIds || (await this.getAuthorizedParticipantUserIds(tenantId, threadId))
    ).filter((uid) => uid && uid !== excludeUserId);

    const io = getIO();
    const roomName = this.getThreadRoomName(tenantId, threadId);

    if (io) {
      if (perUserPayloadTransform) {
        // Personalized payloads (e.g. anonymous polls where `hasVoted` is viewer-specific)
        for (const uid of participantIds) {
          io.to(`user:${uid}`).emit(event, perUserPayloadTransform(uid));
        }
      } else {
        let emitter: any = io.to(roomName);
        if (!skipUserRooms) {
          for (const uid of participantIds) {
            emitter = emitter.to(`user:${uid}`);
          }
        }
        if (excludeUserId) {
          emitter = emitter.except(`user:${excludeUserId}`);
        }
        emitter.emit(event, payload);
      }
    }

    if (!skipPusher) {
      for (const uid of participantIds) {
        const userPayload = perUserPayloadTransform ? perUserPayloadTransform(uid) : payload;
        void PusherService.triggerUserEvent(tenantId, uid, event, userPayload).catch(() => {});
      }
    }
  }

  /**
   * Immediately evicts all connected sockets of `targetUserId` from a conversation room
   * and notifies their active client tabs so stale group views close immediately.
   */
  public static evictUserFromThreadRoom(tenantId: string, threadId: string, targetUserId: string): void {
    const io = getIO();
    const roomName = this.getThreadRoomName(tenantId, threadId);
    if (io) {
      io.in(`user:${targetUserId}`).socketsLeave(roomName);
      io.to(`user:${targetUserId}`).emit("chat:room_revoked", {
        threadId,
        groupId: threadId.startsWith("group_") ? threadId.slice("group_".length) : undefined,
        revokedAt: new Date().toISOString(),
      });
    }
    void PusherService.triggerUserEvent(tenantId, targetUserId, "chat:room_revoked", {
      threadId,
      groupId: threadId.startsWith("group_") ? threadId.slice("group_".length) : undefined,
      revokedAt: new Date().toISOString(),
    }).catch(() => {});
  }

  /**
   * Generates a time-limited HMAC-SHA256 signed download URL for private chat attachments.
   */
  public static signAttachmentDownloadUrl(params: {
    mediaId: string;
    tenantId: string;
    userId: string;
    ttlSeconds?: number;
    inline?: boolean;
  }): string {
    const { mediaId, tenantId, userId, ttlSeconds = 3600, inline = false } = params;
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const data = `${mediaId}:${tenantId}:${userId}:${exp}`;
    const sig = crypto.createHmac("sha256", this.getSigningSecret()).update(data).digest("hex");
    const disp = inline ? "&inline=1" : "";
    return `/api/chat/attachments/${encodeURIComponent(mediaId)}/download?tid=${encodeURIComponent(tenantId)}&uid=${encodeURIComponent(userId)}&exp=${exp}&sig=${sig}${disp}`;
  }

  public static verifyAttachmentSignature(params: {
    mediaId: string;
    tenantId: string;
    userId: string;
    exp: number;
    sig: string;
  }): boolean {
    const { mediaId, tenantId, userId, exp, sig } = params;
    if (!mediaId || !tenantId || !userId || !exp || !sig) return false;
    if (Math.floor(Date.now() / 1000) > Number(exp)) return false;
    const expected = crypto
      .createHmac("sha256", this.getSigningSecret())
      .update(`${mediaId}:${tenantId}:${userId}:${exp}`)
      .digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
    } catch {
      return false;
    }
  }

  /**
   * Verifies whether `userId` in `tenantId` is authorized to view/download `mediaFile`.
   * Checks uploader ownership, explicit `FileAcl` grants, AND active membership in any linked chat message thread.
   */
  public static async authorizeChatMediaAccess(params: {
    mediaFile: any;
    tenantId: string;
    userId: string;
    roles?: string[];
  }): Promise<boolean> {
    const { mediaFile, tenantId, userId, roles = [] } = params;
    if (!mediaFile || mediaFile.deletedAt) return false;
    if (mediaFile.tenantId && mediaFile.tenantId !== tenantId) return false;

    if (mediaFile.uploadedBy === userId || mediaFile.ownerId === userId) {
      return true;
    }

    const db = rawPrisma || prisma;

    // 1. Explicit FileAcl grant
    const acl = await db.fileAcl.findFirst({
      where: {
        fileId: mediaFile.id,
        principalType: "USER",
        principalId: userId,
      },
      select: { id: true },
    });
    if (acl) return true;

    // 2. Active thread authorization via MediaUsage -> ChatMessage
    const usages = await db.mediaUsage.findMany({
      where: {
        mediaId: mediaFile.id,
        entityType: "chat_message",
      },
      select: { entityId: true },
      take: 25,
    });

    if (usages.length > 0) {
      const msgIds = usages.map((u: any) => u.entityId);
      const linkedMessages = await db.chatMessage.findMany({
        where: {
          id: { in: msgIds },
          tenantId,
          isDeletedForEveryone: false,
        },
        select: { threadId: true },
      });

      const distinctThreads = Array.from(new Set(linkedMessages.map((m: any) => m.threadId)));
      for (const tid of distinctThreads) {
        const check = await this.authorizeThread({
          threadId: tid,
          tenantId,
          userId,
          roles,
          allowAdminModeration: false,
        });
        if (check.authorized) return true;
      }
      return false;
    }

    // 3. Fallback scan if legacy chat attachment had URL/ID without MediaUsage row
    if (mediaFile.id || mediaFile.url) {
      const orClauses: any[] = [];
      if (mediaFile.id) {
        orClauses.push({ attachments: { string_contains: mediaFile.id } });
        orClauses.push({ voiceNote: { string_contains: mediaFile.id } });
      }
      if (mediaFile.url) {
        orClauses.push({ attachments: { string_contains: mediaFile.url } });
        orClauses.push({ voiceNote: { string_contains: mediaFile.url } });
      }
      const legacyMsg = await db.chatMessage.findFirst({
        where: {
          tenantId,
          isDeletedForEveryone: false,
          OR: orClauses,
        },
        select: { threadId: true },
      }).catch(() => null);

      if (legacyMsg?.threadId) {
        const check = await this.authorizeThread({
          threadId: legacyMsg.threadId,
          tenantId,
          userId,
          roles,
          allowAdminModeration: false,
        });
        return check.authorized;
      }
    }

    return false;
  }

  /**
   * Sanitizes a poll object for a specific viewer.
   * When `poll.isAnonymous === true`, strips raw `votes` user IDs and voter names/avatars so anonymous votes cannot be deanonymized.
   */
  public static sanitizePollForViewer(rawPoll: any, viewerUserId?: string): any {
    if (!rawPoll) return null;
    const poll = typeof rawPoll === "string" ? JSON.parse(rawPoll) : JSON.parse(JSON.stringify(rawPoll));
    if (!poll || typeof poll !== "object") return null;

    const options = Array.isArray(poll.options) ? poll.options : [];
    const allVoters = new Set<string>();
    let totalVotes = 0;

    for (const opt of options) {
      const votesArr: string[] = Array.isArray(opt.votes) ? opt.votes : [];
      votesArr.forEach((v) => allVoters.add(v));
      totalVotes += votesArr.length;
    }

    poll.distinctVotersCount = allVoters.size;
    poll.totalVotesCount = totalVotes;

    if (poll.isAnonymous) {
      poll.options = options.map((opt: any) => {
        const votesArr: string[] = Array.isArray(opt.votes) ? opt.votes : [];
        const hasVoted = Boolean(viewerUserId && votesArr.includes(viewerUserId));
        return {
          id: opt.id,
          text: opt.text,
          voteCount: votesArr.length,
          hasVoted,
          // Keep viewer's own ID ONLY if they voted so existing frontend `opt.votes.includes(currentUserId)` works without exposing any other voter!
          votes: hasVoted && viewerUserId ? [viewerUserId] : [],
          voters: [],
        };
      });
    } else {
      poll.options = options.map((opt: any) => {
        const votesArr: string[] = Array.isArray(opt.votes) ? opt.votes : [];
        return {
          ...opt,
          voteCount: votesArr.length,
          hasVoted: Boolean(viewerUserId && votesArr.includes(viewerUserId)),
          votes: votesArr,
        };
      });
    }

    return poll;
  }

  private static extractAttachmentMediaId(item: any): string | null {
    if (!item || typeof item !== "object") return null;
    if (item.mediaId && typeof item.mediaId === "string") return item.mediaId;
    if (
      item.id &&
      typeof item.id === "string" &&
      !item.id.startsWith("att_") &&
      !item.id.startsWith("vn_") &&
      !item.id.startsWith("temp_")
    ) {
      return item.id;
    }
    const rawUrl = item.rawUrl || item.url;
    if (typeof rawUrl === "string") {
      const match = rawUrl.match(/\/api\/chat\/attachments\/([^/?#]+)\/download/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
    return null;
  }

  /**
   * Sanitizes a message record for a specific viewer (redacting anonymous poll voters & signing private attachment download URLs).
   */
  public static sanitizeMessageForViewer(msg: any, viewerUserId?: string, tenantId?: string): any {
    if (!msg) return msg;
    const out = { ...msg };
    if (out.isDeletedForEveryone) {
      out.content = "This message was deleted";
      out.attachments = null;
      out.voiceNote = null;
      out.poll = null;
      out.urlPreviews = null;
      out.reactions = null;
      out.editHistory = null;
      return out;
    }

    if (typeof out.reactions === "string") {
      try { out.reactions = JSON.parse(out.reactions); } catch {}
    }
    if (typeof out.attachments === "string") {
      try { out.attachments = JSON.parse(out.attachments); } catch {}
    }
    if (typeof out.voiceNote === "string") {
      try { out.voiceNote = JSON.parse(out.voiceNote); } catch {}
    }
    if (typeof out.editHistory === "string") {
      try { out.editHistory = JSON.parse(out.editHistory); } catch {}
    }

    if (out.poll) {
      out.poll = this.sanitizePollForViewer(out.poll, viewerUserId);
    }

    const effTenantId = tenantId || out.tenantId;
    if (viewerUserId && effTenantId && Array.isArray(out.attachments)) {
      out.attachments = out.attachments.map((att: any) => {
        if (!att || typeof att !== "object") return att;
        const mId = this.extractAttachmentMediaId(att);
        if (mId) {
          const signedDownloadUrl = this.signAttachmentDownloadUrl({
            mediaId: String(mId),
            tenantId: effTenantId,
            userId: viewerUserId,
            inline: false,
          });
          const signedPreviewUrl = this.signAttachmentDownloadUrl({
            mediaId: String(mId),
            tenantId: effTenantId,
            userId: viewerUserId,
            inline: true,
          });
          return {
            ...att,
            mediaId: String(mId),
            rawUrl: att.rawUrl || att.url,
            url: signedPreviewUrl,
            signedDownloadUrl,
            signedPreviewUrl,
          };
        }
        return att;
      });
    }

    if (viewerUserId && effTenantId && out.voiceNote && typeof out.voiceNote === "object") {
      const vmId = this.extractAttachmentMediaId(out.voiceNote);
      if (vmId) {
        const signedAudioUrl = this.signAttachmentDownloadUrl({
          mediaId: String(vmId),
          tenantId: effTenantId,
          userId: viewerUserId,
          inline: true,
        });
        out.voiceNote = {
          ...out.voiceNote,
          mediaId: String(vmId),
          rawUrl: out.voiceNote.rawUrl || out.voiceNote.url,
          url: signedAudioUrl,
          signedUrl: signedAudioUrl,
        };
      }
    }

    return out;
  }

  public static async resolveSenderIdentity(params: {
    tenantId: string;
    userId: string;
    fallbackName?: string | null;
    fallbackAvatar?: string | null;
    fallbackEmail?: string | null;
  }): Promise<{ senderName: string; senderAvatar: string | null }> {
    const { tenantId, userId, fallbackName, fallbackAvatar, fallbackEmail } = params;
    if (fallbackName) {
      return { senderName: cleanChatPersonName(fallbackName), senderAvatar: fallbackAvatar || null };
    }
    const cacheKey = `${tenantId}:${userId}`;
    const cached = profileCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { senderName: cached.fullName, senderAvatar: cached.avatarUrl };
    }
    const db = rawPrisma || prisma;
    const prof = await db.profile.findFirst({
      where: { userId, tenantId },
      select: { fullName: true, avatarUrl: true },
    });
    const senderName = cleanChatPersonName(prof?.fullName || fallbackEmail?.split("@")[0] || "User");
    const senderAvatar = prof?.avatarUrl || fallbackAvatar || null;
    profileCache.set(cacheKey, { fullName: senderName, avatarUrl: senderAvatar, expiresAt: Date.now() + 300_000 });
    return { senderName, senderAvatar };
  }

  /**
   * Grants FileAcl & MediaUsage links for message attachments to authorized thread participants.
   */
  public static async bindMessageMediaPermissions(params: {
    tenantId: string;
    messageId: string;
    actorUserId: string;
    attachments?: any[] | null;
    voiceNote?: any | null;
    participantUserIds: string[];
    threadType: "direct" | "group";
  }): Promise<void> {
    const { messageId, actorUserId, attachments, voiceNote, participantUserIds, threadType } = params;
    const db = rawPrisma || prisma;
    const mediaIds = new Set<string>();

    if (Array.isArray(attachments)) {
      for (const att of attachments) {
        const mId = this.extractAttachmentMediaId(att);
        if (mId) mediaIds.add(mId);
      }
    }
    if (voiceNote && typeof voiceNote === "object") {
      const vmId = this.extractAttachmentMediaId(voiceNote);
      if (vmId) mediaIds.add(vmId);
    }

    if (mediaIds.size === 0) return;

    for (const mId of mediaIds) {
      await db.mediaUsage
        .upsert({
          where: {
            mediaId_entityType_entityId_fieldKey: {
              mediaId: mId,
              entityType: "chat_message",
              entityId: messageId,
              fieldKey: "attachment",
            },
          },
          create: {
            mediaId: mId,
            entityType: "chat_message",
            entityId: messageId,
            fieldKey: "attachment",
          },
          update: {},
        })
        .catch(() => {});

      // Bind explicit FileAcl rows for authorized thread participants (direct & small/medium group chats)
      const aclUsers = threadType === "direct" ? participantUserIds : participantUserIds.slice(0, 100);
      for (const uid of aclUsers) {
        const exists = await db.fileAcl
          .findFirst({
            where: { fileId: mId, principalType: "USER", principalId: uid },
            select: { id: true },
          })
          .catch(() => null);
        if (!exists) {
          await db.fileAcl
            .create({
              data: {
                fileId: mId,
                principalType: "USER",
                principalId: uid,
                permission: "VIEWER",
                createdBy: actorUserId,
              },
            })
            .catch(() => {});
        }
      }
    }
  }

  /**
   * Single Authoritative Message Service (Section 2.1 & Section 5.1).
   * Shared by both REST `POST /api/chat/messages` and Socket.IO `chat:send`.
   */
  public static async sendMessage(params: {
    tenantId: string;
    userId: string;
    roles?: string[];
    permissions?: string[];
    workspaceRole?: string;
    senderNameHint?: string | null;
    senderAvatarHint?: string | null;
    senderEmailHint?: string | null;
    threadId: string;
    content?: string;
    attachments?: any[];
    replyToId?: string | null;
    replyTo?: any;
    voiceNote?: any;
    poll?: any;
    urlPreviews?: any;
    clientTempId?: string | null;
    mentions?: string[] | null;
  }): Promise<{ message: any; deduplicated: boolean }> {
    const {
      tenantId,
      userId,
      roles = [],
      permissions = [],
      workspaceRole,
      senderNameHint,
      senderAvatarHint,
      senderEmailHint,
      threadId,
      content,
      attachments,
      replyToId,
      replyTo,
      voiceNote,
      poll,
      urlPreviews,
      clientTempId,
      mentions,
    } = params;

    if (!this.hasChatPermission({ roles, permissions, workspaceRole }, "chat.send")) {
      throw new ChatDomainError("You do not have permission to send chat messages.", 403, "CHAT_PERMISSION_DENIED");
    }

    const trimmedContent = typeof content === "string" ? content : "";
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!trimmedContent.trim() && !hasAttachments && !voiceNote && !poll) {
      throw new ChatDomainError("Message content, attachment, voice note, or poll is required.", 400, "EMPTY_MESSAGE");
    }

    if (trimmedContent.length > 20_000) {
      throw new ChatDomainError("Message content exceeds maximum length of 20,000 characters.", 400, "MESSAGE_TOO_LONG");
    }

    // 1. Strict Thread & Membership Validation
    const authCheck = await this.authorizeThread({
      threadId,
      tenantId,
      userId,
      roles,
      allowAdminModeration: false,
      requireWritePermission: true,
    });
    if (!authCheck.authorized) {
      throw new ChatDomainError(
        authCheck.reason || "Access denied: You cannot send messages to this thread.",
        authCheck.status || 403,
        authCheck.code || "CHAT_UNAUTHORIZED"
      );
    }

    const db = rawPrisma || prisma;
    const cleanTempId =
      typeof clientTempId === "string" && clientTempId.trim().length > 0
        ? clientTempId.trim().slice(0, 100)
        : null;

    // 2. Durable DB-Backed Idempotency Lookup (Section 5.1)
    if (cleanTempId) {
      const existingByTemp = await db.chatMessage.findFirst({
        where: { tenantId, senderId: userId, clientTempId: cleanTempId },
      });
      if (existingByTemp) {
        return {
          message: this.sanitizeMessageForViewer(existingByTemp, userId, tenantId),
          deduplicated: true,
        };
      }
    }

    // 3. Attachment & Voice Note Validation
    if (hasAttachments) {
      if (!this.hasChatPermission({ roles, permissions, workspaceRole }, "chat.files")) {
        throw new ChatDomainError("You do not have permission to attach files.", 403, "CHAT_FILE_PERMISSION_DENIED");
      }
      const secCheck = this.validateAttachmentsSecurity(attachments!);
      if (!secCheck.isAllowed) {
        throw new ChatDomainError(
          secCheck.reason || "Attachment blocked by security policy.",
          secCheck.status || 403,
          secCheck.code || "FILE_RESTRICTED"
        );
      }
    }

    if (voiceNote) {
      const vSize = Number(voiceNote.size || 0);
      if (vSize > MAX_CHAT_FILE_SIZE_BYTES) {
        throw new ChatDomainError("Voice note exceeds the 30 MB limit.", 413, "FILE_TOO_LARGE");
      }
    }

    // 4. Reply Target Validation (same tenant & same thread)
    let resolvedReplyToId: string | null = null;
    let resolvedReplyTo: any = null;
    if (replyToId && typeof replyToId === "string") {
      const parentMsg = await db.chatMessage.findFirst({
        where: { id: replyToId, tenantId, threadId },
        select: {
          id: true,
          senderId: true,
          senderName: true,
          content: true,
          isDeletedForEveryone: true,
          attachments: true,
          voiceNote: true,
        },
      });
      if (parentMsg) {
        resolvedReplyToId = parentMsg.id;
        resolvedReplyTo = {
          id: parentMsg.id,
          senderId: parentMsg.senderId,
          senderName: parentMsg.senderName,
          content: parentMsg.isDeletedForEveryone
            ? "This message was deleted"
            : parentMsg.content ||
              (parentMsg.voiceNote ? "Voice message" : Array.isArray(parentMsg.attachments) && parentMsg.attachments.length ? "Attachment" : ""),
          isDeleted: parentMsg.isDeletedForEveryone,
        };
      } else if (replyTo && typeof replyTo === "object") {
        // Ignore cross-thread replyToId spoofing
        resolvedReplyToId = null;
        resolvedReplyTo = null;
      }
    }

    // 5. Strict Poll Validation
    let validatedPoll: any = null;
    if (poll) {
      const question = typeof poll.question === "string" ? poll.question.trim() : "";
      if (!question) {
        throw new ChatDomainError("Poll question is required.", 400, "INVALID_POLL");
      }
      const rawOptions: any[] = Array.isArray(poll.options) ? poll.options : [];
      const cleanOptions: { id: string; text: string; votes: string[] }[] = [];
      const seenTexts = new Set<string>();

      for (let i = 0; i < rawOptions.length; i++) {
        const item = rawOptions[i];
        const text =
          typeof item === "string" ? item.trim() : typeof item?.text === "string" ? item.text.trim() : "";
        if (!text) continue;
        const lower = text.toLowerCase();
        if (seenTexts.has(lower)) {
          throw new ChatDomainError(`Duplicate poll option: "${text}". Each option must be distinct.`, 400, "DUPLICATE_POLL_OPTION");
        }
        seenTexts.add(lower);
        cleanOptions.push({
          id: item?.id || `opt_${i + 1}`,
          text: text.slice(0, 200),
          votes: [],
        });
      }

      if (cleanOptions.length < 2) {
        throw new ChatDomainError("Poll must contain at least 2 distinct non-empty options.", 400, "INVALID_POLL");
      }
      if (cleanOptions.length > 10) {
        throw new ChatDomainError("Poll cannot exceed 10 options.", 400, "INVALID_POLL");
      }

      const isMulti = Boolean(poll.allowMultiple || poll.isMultiSelect);
      const isAnonymous = Boolean(poll.isAnonymous);
      validatedPoll = {
        question: question.slice(0, 300),
        options: cleanOptions,
        isClosed: false,
        allowMultiple: isMulti,
        isMultiSelect: isMulti,
        isAnonymous,
        distinctVotersCount: 0,
        totalVotesCount: 0,
        createdAt: new Date().toISOString(),
      };
    }

    // 6. Sanitize Client URL Previews or Fetch SSRF-Safe Preview
    let finalUrlPreviews: any = UrlPreviewService.sanitizeClientPreviews(urlPreviews);
    if (!finalUrlPreviews && trimmedContent) {
      const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/i;
      const urlMatch = trimmedContent.match(urlRegex);
      if (urlMatch && urlMatch[0]) {
        try {
          const fetched = await UrlPreviewService.fetchPreview(urlMatch[0]);
          if (fetched) finalUrlPreviews = [fetched];
        } catch {
          // Ignore preview fetch timeout
        }
      }
    }

    // 7. Resolve Authoritative Sender Identity
    const { senderName, senderAvatar } = await this.resolveSenderIdentity({
      tenantId,
      userId,
      fallbackName: senderNameHint,
      fallbackAvatar: senderAvatarHint,
      fallbackEmail: senderEmailHint,
    });

    // 8. Persist Message with Unique Constraint Conflict Recovery (`P2002`)
    let createdMsg: any;
    try {
      createdMsg = await runWithTenantContext(
        {
          tenantId,
          userId,
          roles,
          status: "ACTIVE",
          tenancyStrategy: "SHARED_SCHEMA",
          db: rawPrisma,
        },
        async () => {
          return await db.chatMessage.create({
            data: {
              tenantId,
              threadId,
              senderId: userId,
              senderName,
              senderAvatar,
              content: trimmedContent,
              attachments: hasAttachments ? attachments : null,
              replyToId: resolvedReplyToId,
              replyTo: resolvedReplyTo,
              voiceNote: voiceNote || null,
              poll: validatedPoll,
              urlPreviews: finalUrlPreviews,
              deliveryStatus: "sent",
              deliveredToUserIds: [],
              clientTempId: cleanTempId,
              mentions: Array.isArray(mentions) ? mentions : null,
            },
          });
        }
      );
    } catch (err: any) {
      if (cleanTempId && err?.code === "P2002") {
        const existingWinner = await db.chatMessage.findFirst({
          where: { tenantId, senderId: userId, clientTempId: cleanTempId },
        });
        if (existingWinner) {
          return {
            message: this.sanitizeMessageForViewer(existingWinner, userId, tenantId),
            deduplicated: true,
          };
        }
      }
      throw err;
    }

    const participantUserIds = authCheck.participantUserIds || [userId];

    // 9. Bind MediaUsage & FileAcl for Attachments / Voice Note BEFORE broadcasting so recipients never hit 403 race!
    await this.bindMessageMediaPermissions({
      tenantId,
      messageId: createdMsg.id,
      actorUserId: userId,
      attachments: hasAttachments ? attachments : null,
      voiceNote,
      participantUserIds,
      threadType: authCheck.threadType || "direct",
    }).catch(() => {});

    // 10. Advance Sender's Read Receipt & Clear Manual Unread Flag
    void Promise.all([
      db.chatReadReceipt.upsert({
        where: { tenantId_threadId_userId: { tenantId, threadId, userId } },
        create: { tenantId, threadId, userId, lastReadAt: new Date() },
        update: { lastReadAt: new Date() },
      }),
      (db as any).chatConversationPreference
        ?.updateMany({
          where: { tenantId, userId, threadId, markedUnreadAt: { not: null } },
          data: { markedUnreadAt: null },
        })
        .catch(() => {}),
    ]).catch(() => {});

    // 11. Conversation-Scoped Realtime Delivery ONLY to Authorized Participants
    const broadcastAt = Date.now();
    await this.emitToAuthorizedThread({
      tenantId,
      threadId,
      event: "chat:message",
      payload: {
        threadId: createdMsg.threadId,
        message: this.sanitizeMessageForViewer(createdMsg, undefined, tenantId),
        broadcastAt,
      },
      participantUserIds,
      perUserPayloadTransform: validatedPoll?.isAnonymous || hasAttachments || Boolean(voiceNote)
        ? (viewerId) => ({
            threadId: createdMsg.threadId,
            message: this.sanitizeMessageForViewer(createdMsg, viewerId, tenantId),
            broadcastAt,
          })
        : undefined,
    });

    // 12. Dispatch Scoped In-App & Web Push Notifications Respecting Mute & Notification Preferences
    // (tracked so serverless runtimes do not freeze before OS push notifications are delivered)
    runInBackground(() =>
      this.dispatchMessageNotifications({
        tenantId,
        threadId,
        threadType: authCheck.threadType || "direct",
        group: authCheck.group,
        senderId: userId,
        senderName,
        message: createdMsg,
        participantUserIds,
        mentions: Array.isArray(mentions) ? mentions : [],
      }).catch(() => {})
    );

    return {
      message: this.sanitizeMessageForViewer(createdMsg, userId, tenantId),
      deduplicated: false,
    };
  }

  private static async dispatchMessageNotifications(params: {
    tenantId: string;
    threadId: string;
    threadType: "direct" | "group";
    group?: any;
    senderId: string;
    senderName: string;
    message: any;
    participantUserIds: string[];
    mentions: string[];
  }): Promise<void> {
    const { tenantId, threadId, threadType, group, senderId, senderName, message, participantUserIds, mentions } = params;
    const recipientIds = participantUserIds.filter((uid) => uid && uid !== senderId);
    if (recipientIds.length === 0) return;

    const db = rawPrisma || prisma;
    const now = Date.now();

    // Batch fetch preferences & profiles in 2 queries (zero N+1!)
    const [prefs, profiles] = await Promise.all([
      (db as any).chatConversationPreference
        ? (db as any).chatConversationPreference.findMany({
            where: { tenantId, threadId, userId: { in: recipientIds } },
          })
        : Promise.resolve([]),
      message.content && message.content.includes("@")
        ? db.profile.findMany({
            where: { tenantId, userId: { in: recipientIds } },
            select: { userId: true, fullName: true },
          })
        : Promise.resolve([]),
    ]);

    const prefByUser = new Map<string, any>(prefs.map((p: any) => [p.userId, p]));
    const groupMemberByUser = new Map<string, any>(
      Array.isArray(group?.members) ? group.members.map((m: any) => [m.userId, m]) : []
    );

    const mentionedSet = new Set<string>(mentions);
    if (message.content && message.content.includes("@")) {
      const lowerContent = String(message.content).toLowerCase();
      if (lowerContent.includes("@everyone") || lowerContent.includes("@all") || lowerContent.includes("@channel")) {
        recipientIds.forEach((id) => mentionedSet.add(id));
      } else {
        for (const prof of profiles) {
          if (prof.fullName && lowerContent.includes(`@${prof.fullName.toLowerCase()}`)) {
            mentionedSet.add(prof.userId);
          }
        }
      }
    }

    const previewBody = message.content
      ? message.content.length > 80
        ? message.content.slice(0, 80) + "..."
        : message.content
      : message.poll
        ? `Poll: ${message.poll.question || "Vote now"}`
        : message.voiceNote
          ? "Sent a voice message"
          : "Sent an attachment";

    for (const recipientId of recipientIds) {
      const isMentioned = mentionedSet.has(recipientId);
      const userPref = prefByUser.get(recipientId);
      const groupMem = groupMemberByUser.get(recipientId);

      const prefMuted =
        Boolean(userPref?.isMuted) && (!userPref?.mutedUntil || new Date(userPref.mutedUntil).getTime() > now);
      const groupMuted =
        Boolean(groupMem?.isMuted) && (!groupMem?.mutedUntil || new Date(groupMem.mutedUntil).getTime() > now);
      const notifLevel = userPref?.notificationLevel || "all";

      if (notifLevel === "none") continue;
      if ((prefMuted || groupMuted || notifLevel === "mentions") && !isMentioned) continue;

      const isOfficialAnnouncement = Boolean(group?.isAnnouncementOnly || group?.category === "announcement");
      const title = isOfficialAnnouncement
        ? `Official Announcement in ${group?.name || "HR Channel"}`
        : threadType === "group"
          ? isMentioned
            ? `${senderName} mentioned you in ${group?.name || "a group"}`
            : `${senderName} in ${group?.name || "Group"}`
          : `New message from ${senderName}`;

      await NotificationService.createNotification({
        tenantId,
        userId: recipientId,
        title,
        message: previewBody,
        type: isOfficialAnnouncement ? "HR_ANNOUNCEMENT" : "CHAT_MESSAGE",
        actionUrl: `/me/chat?threadId=${encodeURIComponent(threadId)}`,
        metadata: {
          threadId,
          senderId,
          messageId: message.id,
          isMentioned,
          isAnnouncement: isOfficialAnnouncement,
        },
      }).catch(() => {});
    }
  }

  /**
   * Authoritative Delivery Receipt Acknowledgment (Section 5.2).
   * Persists recipient in `deliveredToUserIds` and advances `sent` -> `delivered` (never downgrading `read`).
   */
  public static async acknowledgeDelivered(params: {
    tenantId: string;
    userId: string;
    roles?: string[];
    threadId: string;
    messageIds: string[];
  }): Promise<{ acknowledgedIds: string[]; deliveredAt: string }> {
    const { tenantId, userId, roles = [], threadId, messageIds } = params;
    const deliveredAt = new Date().toISOString();
    if (!threadId || !Array.isArray(messageIds) || messageIds.length === 0) {
      return { acknowledgedIds: [], deliveredAt };
    }

    const authCheck = await this.authorizeThread({
      threadId,
      tenantId,
      userId,
      roles,
      allowAdminModeration: false,
    });
    if (!authCheck.authorized) {
      throw new ChatDomainError(
        authCheck.reason || "Unauthorized delivery receipt.",
        authCheck.status || 403,
        authCheck.code || "CHAT_UNAUTHORIZED"
      );
    }

    const db = rawPrisma || prisma;
    const cleanIds = Array.from(new Set(messageIds.filter((id) => typeof id === "string" && id.length <= 64))).slice(0, 100);
    if (cleanIds.length === 0) return { acknowledgedIds: [], deliveredAt };

    const targetMessages = await db.chatMessage.findMany({
      where: {
        id: { in: cleanIds },
        tenantId,
        threadId,
        senderId: { not: userId },
      },
      select: {
        id: true,
        deliveryStatus: true,
        deliveredToUserIds: true,
      },
    });

    const acknowledgedIds: string[] = [];
    for (const msg of targetMessages) {
      const existingDelivered: string[] = Array.isArray(msg.deliveredToUserIds)
        ? (msg.deliveredToUserIds as string[])
        : [];
      const nextDelivered = existingDelivered.includes(userId)
        ? existingDelivered
        : [...existingDelivered, userId];
      const nextStatus = msg.deliveryStatus === "read" ? "read" : "delivered";

      if (!existingDelivered.includes(userId) || msg.deliveryStatus !== nextStatus) {
        await db.chatMessage.update({
          where: { id: msg.id },
          data: {
            deliveryStatus: nextStatus,
            deliveredToUserIds: nextDelivered,
          },
        });
      }
      acknowledgedIds.push(msg.id);
    }

    if (acknowledgedIds.length > 0) {
      await this.emitToAuthorizedThread({
        tenantId,
        threadId,
        event: "chat:delivered",
        payload: {
          messageIds: acknowledgedIds,
          threadId,
          userId,
          deliveredAt,
        },
        participantUserIds: authCheck.participantUserIds,
      });
    }

    return { acknowledgedIds, deliveredAt };
  }

  /**
   * Authoritative Read Receipt Update (Section 5.3).
   * - Preserves & upserts `ChatReadReceipt`.
   * - In 1:1 DMs: marks messages from the other participant as `read`.
   * - In Groups: computes per-member seen coverage and marks `deliveryStatus = "read"` ONLY when all non-sender members have read, otherwise `"delivered"`.
   */
  public static async markThreadRead(params: {
    tenantId: string;
    userId: string;
    roles?: string[];
    threadId: string;
  }): Promise<{ lastReadAt: Date; seenBy?: Array<{ userId: string; fullName: string; avatarUrl: string | null; lastReadAt: string }> }> {
    const { tenantId, userId, roles = [], threadId } = params;

    const authCheck = await this.authorizeThread({
      threadId,
      tenantId,
      userId,
      roles,
      allowAdminModeration: false,
    });
    if (!authCheck.authorized) {
      throw new ChatDomainError(
        authCheck.reason || "Unauthorized read receipt.",
        authCheck.status || 403,
        authCheck.code || "CHAT_UNAUTHORIZED"
      );
    }

    const db = rawPrisma || prisma;
    const now = new Date();

    const [receipt] = await Promise.all([
      db.chatReadReceipt.upsert({
        where: { tenantId_threadId_userId: { tenantId, threadId, userId } },
        create: { tenantId, threadId, userId, lastReadAt: now },
        update: { lastReadAt: now },
      }),
      (db as any).chatConversationPreference
        ?.updateMany({
          where: { tenantId, userId, threadId, markedUnreadAt: { not: null } },
          data: { markedUnreadAt: null },
        })
        .catch(() => {}),
    ]);

    let seenByPayload: Array<{ userId: string; fullName: string; avatarUrl: string | null; lastReadAt: string }> | undefined;

    if (authCheck.threadType === "direct") {
      await db.chatMessage.updateMany({
        where: {
          tenantId,
          threadId,
          senderId: { not: userId },
          createdAt: { lte: now },
          deliveryStatus: { not: "read" },
        },
        data: {
          deliveryStatus: "read",
        },
      });
    } else if (authCheck.threadType === "group" && authCheck.participantUserIds) {
      const memberIds = authCheck.participantUserIds;
      const [receipts, profiles] = await Promise.all([
        db.chatReadReceipt.findMany({
          where: { tenantId, threadId, userId: { in: memberIds } },
        }),
        db.profile.findMany({
          where: { tenantId, userId: { in: memberIds } },
          select: { userId: true, fullName: true, avatarUrl: true },
        }),
      ]);

      const profMap = new Map(profiles.map((p: any) => [p.userId, p]));
      const receiptMap = new Map<string, Date>(receipts.map((r: any) => [r.userId, new Date(r.lastReadAt)]));

      seenByPayload = receipts.map((r: any) => {
        const p: any = profMap.get(r.userId);
        return {
          userId: r.userId,
          fullName: cleanChatPersonName(p?.fullName || "Member"),
          avatarUrl: p?.avatarUrl || null,
          lastReadAt: new Date(r.lastReadAt).toISOString(),
        };
      });

      // Compute oldest read watermark among all group members to promote fully-seen messages to `read`,
      // and promote partially-seen messages up to `now` to `delivered`.
      const recentUnreadMsgs = await db.chatMessage.findMany({
        where: {
          tenantId,
          threadId,
          isSystemEvent: false,
          createdAt: { lte: now },
          deliveryStatus: { not: "read" },
        },
        select: { id: true, senderId: true, createdAt: true, deliveryStatus: true, deliveredToUserIds: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      const toMarkRead: string[] = [];
      const toMarkDelivered: string[] = [];

      for (const m of recentUnreadMsgs) {
        const otherMembers = memberIds.filter((uid) => uid !== m.senderId);
        if (otherMembers.length === 0) continue;
        const msgTime = new Date(m.createdAt).getTime();
        const readersCount = otherMembers.filter((uid) => {
          const rAt = receiptMap.get(uid);
          return rAt && rAt.getTime() >= msgTime;
        }).length;

        if (readersCount === otherMembers.length) {
          toMarkRead.push(m.id);
        } else if (readersCount > 0 && m.deliveryStatus === "sent") {
          toMarkDelivered.push(m.id);
        }
      }

      if (toMarkRead.length > 0) {
        await db.chatMessage.updateMany({
          where: { id: { in: toMarkRead }, tenantId },
          data: { deliveryStatus: "read" },
        });
      }
      if (toMarkDelivered.length > 0) {
        await db.chatMessage.updateMany({
          where: { id: { in: toMarkDelivered }, tenantId, deliveryStatus: "sent" },
          data: { deliveryStatus: "delivered" },
        });
      }
    }

    const { senderName, senderAvatar } = await this.resolveSenderIdentity({ tenantId, userId });

    await this.emitToAuthorizedThread({
      tenantId,
      threadId,
      event: "chat:read",
      payload: {
        threadId,
        userId,
        userName: senderName,
        userAvatar: senderAvatar,
        readAt: receipt.lastReadAt.toISOString(),
        seenBy: seenByPayload,
      },
      participantUserIds: authCheck.participantUserIds,
    });

    return { lastReadAt: receipt.lastReadAt, seenBy: seenByPayload };
  }

  /**
   * Authoritative Message Edit with Thread Membership Verification & Edit History Audit Trail (Section 2.6 & 6).
   */
  public static async editMessage(params: {
    tenantId: string;
    userId: string;
    roles?: string[];
    messageId: string;
    content: string;
  }): Promise<any> {
    const { tenantId, userId, roles = [], messageId, content } = params;
    const trimmed = typeof content === "string" ? content.trim() : "";
    if (!trimmed) {
      throw new ChatDomainError("Content is required for edit.", 400, "EMPTY_EDIT_CONTENT");
    }
    if (trimmed.length > 20_000) {
      throw new ChatDomainError("Edited content exceeds maximum length.", 400, "MESSAGE_TOO_LONG");
    }

    const db = rawPrisma || prisma;
    const existing: any = await db.chatMessage.findFirst({
      where: { id: messageId, tenantId },
    });

    if (!existing) {
      throw new ChatDomainError("Message not found.", 404, "MESSAGE_NOT_FOUND");
    }

    if (existing.senderId !== userId) {
      throw new ChatDomainError("Access denied: You can only edit your own messages.", 403, "CHAT_EDIT_FORBIDDEN");
    }

    if (existing.isDeletedForEveryone || existing.isSystemEvent) {
      throw new ChatDomainError("Cannot edit a deleted or system message.", 400, "CHAT_EDIT_INVALID");
    }

    // Verify caller is STILL an active authorized participant in the thread (prevents ex-group-member edits!)
    const authCheck = await this.authorizeThread({
      threadId: existing.threadId,
      tenantId,
      userId,
      roles,
      allowAdminModeration: false,
      requireWritePermission: true,
    });
    if (!authCheck.authorized) {
      throw new ChatDomainError(
        authCheck.reason || "You no longer have permission to edit messages in this conversation.",
        authCheck.status || 403,
        authCheck.code || "CHAT_UNAUTHORIZED"
      );
    }

    const now = new Date();
    const prevHistory: any[] = Array.isArray(existing.editHistory) ? [...existing.editHistory] : [];
    if (existing.content !== trimmed) {
      prevHistory.push({
        content: existing.content,
        editedAt: (existing.editedAt ? new Date(existing.editedAt) : new Date(existing.createdAt)).toISOString(),
        editedBy: userId,
      });
    }

    const updated = await db.chatMessage.update({
      where: { id: messageId },
      data: {
        content: trimmed,
        isEdited: true,
        editedAt: now,
        editHistory: prevHistory.slice(-20),
      } as any,
    });

    // Update denormalized replyTo snapshots on child messages in the same thread
    const childReplies = await db.chatMessage.findMany({
      where: { tenantId, threadId: existing.threadId, replyToId: messageId },
      select: { id: true, replyTo: true },
    });
    for (const child of childReplies) {
      if (child.replyTo && typeof child.replyTo === "object") {
        await db.chatMessage
          .update({
            where: { id: child.id },
            data: {
              replyTo: {
                ...(child.replyTo as any),
                content: trimmed,
                isEdited: true,
              },
            },
          })
          .catch(() => {});
      }
    }

    await this.emitToAuthorizedThread({
      tenantId,
      threadId: existing.threadId,
      event: "chat:message_edited",
      payload: {
        id: messageId,
        threadId: existing.threadId,
        message: this.sanitizeMessageForViewer(updated, undefined, tenantId),
      },
      participantUserIds: authCheck.participantUserIds,
    });

    return this.sanitizeMessageForViewer(updated, userId, tenantId);
  }

  /**
   * Authoritative Message Delete ("Delete for everyone" vs "Delete for me") with Attachment Revocation & Reply Redaction (Section 2.6).
   */
  public static async deleteMessage(params: {
    tenantId: string;
    userId: string;
    roles?: string[];
    permissions?: string[];
    workspaceRole?: string;
    messageId: string;
    forEveryone: boolean;
  }): Promise<{ id: string; mode: "everyone" | "me"; threadId: string }> {
    const { tenantId, userId, roles = [], permissions = [], workspaceRole, messageId, forEveryone } = params;
    const db = rawPrisma || prisma;

    const existing: any = await db.chatMessage.findFirst({
      where: { id: messageId, tenantId },
    });

    if (!existing) {
      throw new ChatDomainError("Message not found.", 404, "MESSAGE_NOT_FOUND");
    }

    const isWorkspaceAdmin = roles.some((r) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));

    // Must be an active thread participant (or workspace admin explicitly moderating delete-for-everyone in a group)
    const authCheck = await this.authorizeThread({
      threadId: existing.threadId,
      tenantId,
      userId,
      roles,
      allowAdminModeration: Boolean(forEveryone && existing.threadId.startsWith("group_") && isWorkspaceAdmin),
    });

    if (!authCheck.authorized) {
      throw new ChatDomainError(
        authCheck.reason || "Access denied: You are not a participant in this conversation.",
        authCheck.status || 403,
        authCheck.code || "CHAT_UNAUTHORIZED"
      );
    }

    if (forEveryone) {
      const isSender = existing.senderId === userId;
      const isGroupModerator =
        authCheck.threadType === "group" &&
        ["owner", "admin", "moderator"].includes(authCheck.memberRole || "");
      const canModerateDelete =
        authCheck.threadType === "group" &&
        (isGroupModerator || isWorkspaceAdmin || this.hasChatPermission({ roles, permissions, workspaceRole }, "chat.delete_messages") && isGroupModerator);

      if (!isSender && !canModerateDelete && !(authCheck.threadType === "group" && isWorkspaceAdmin)) {
        throw new ChatDomainError(
          "Access denied: Only the sender or authorized group/workspace administrator can delete for everyone.",
          403,
          "CHAT_DELETE_FORBIDDEN"
        );
      }

      // Extract attachment mediaIds BEFORE clearing attachments so we can revoke MediaUsage & FileAcl
      const revokedMediaIds: string[] = [];
      if (Array.isArray(existing.attachments)) {
        for (const att of existing.attachments) {
          const mId = att?.mediaId || (att?.id && !String(att.id).startsWith("att_") ? String(att.id) : null);
          if (mId) revokedMediaIds.push(mId);
        }
      }
      if (existing.voiceNote?.mediaId) {
        revokedMediaIds.push(String(existing.voiceNote.mediaId));
      }

      const existingMeta = existing.eventMetadata && typeof existing.eventMetadata === "object" ? existing.eventMetadata : {};
      await db.chatMessage.update({
        where: { id: messageId },
        data: {
          isDeletedForEveryone: true,
          content: "This message was deleted",
          attachments: null,
          voiceNote: null,
          poll: null,
          urlPreviews: null,
          reactions: null,
          editHistory: null,
          isPinned: false,
          pinnedAt: null,
          pinnedById: null,
          eventMetadata: {
            ...existingMeta,
            deletedAt: new Date().toISOString(),
            deletedById: userId,
          },
        } as any,
      });

      // Revoke attachment usage & ACL if no other active message still references the mediaFile
      for (const mId of revokedMediaIds) {
        await db.mediaUsage
          .deleteMany({
            where: { mediaId: mId, entityType: "chat_message", entityId: messageId },
          })
          .catch(() => {});

        const remainingUsageCount = await db.mediaUsage
          .count({
            where: { mediaId: mId },
          })
          .catch(() => 1);

        if (remainingUsageCount === 0) {
          await db.fileAcl.deleteMany({ where: { fileId: mId } }).catch(() => {});
          await db.mediaFile
            .updateMany({
              where: { id: mId, tenantId, systemModule: "chat" },
              data: { deletedAt: new Date(), status: "DELETED" },
            })
            .catch(() => {});
        }
      }

      // Redact denormalized replyTo quotes referencing this deleted message
      const replies = await db.chatMessage.findMany({
        where: { tenantId, threadId: existing.threadId, replyToId: messageId },
        select: { id: true, replyTo: true },
      });
      for (const rep of replies) {
        await db.chatMessage
          .update({
            where: { id: rep.id },
            data: {
              replyTo: {
                id: messageId,
                senderName: existing.senderName,
                content: "This message was deleted",
                isDeleted: true,
              },
            },
          })
          .catch(() => {});
      }

      await this.emitToAuthorizedThread({
        tenantId,
        threadId: existing.threadId,
        event: "chat:message_deleted",
        payload: {
          id: messageId,
          threadId: existing.threadId,
          isDeletedForEveryone: true,
          deletedById: userId,
        },
        participantUserIds: authCheck.participantUserIds,
      });

      return { id: messageId, mode: "everyone", threadId: existing.threadId };
    } else {
      // Delete for me only (already verified active thread participation above!)
      const currentList: string[] = Array.isArray(existing.deletedForUserIds)
        ? [...existing.deletedForUserIds]
        : [];
      if (!currentList.includes(userId)) {
        currentList.push(userId);
      }

      await db.chatMessage.update({
        where: { id: messageId },
        data: { deletedForUserIds: currentList },
      });

      const io = getIO();
      if (io) {
        io.to(`user:${userId}`).emit("chat:message_deleted", {
          id: messageId,
          threadId: existing.threadId,
          isDeletedForEveryone: false,
          deletedForUserId: userId,
        });
      }
      void PusherService.triggerUserEvent(tenantId, userId, "chat:message_deleted", {
        id: messageId,
        threadId: existing.threadId,
        isDeletedForEveryone: false,
        deletedForUserId: userId,
      }).catch(() => {});

      return { id: messageId, mode: "me", threadId: existing.threadId };
    }
  }
}
