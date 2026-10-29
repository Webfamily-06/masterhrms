"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileMemoryCache = exports.RESTRICTED_EXTENSIONS = exports.chatRouter = void 0;
exports.invalidateChatProfileCache = invalidateChatProfileCache;
const recentClientTempIds = new Map();
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const socket_1 = require("../socket");
const pusher_service_1 = require("../services/pusher.service");
const url_preview_service_1 = require("../services/url-preview.service");
const notification_service_1 = require("../services/notification.service");
const media_service_1 = require("../services/media/media.service");
const chat_system_events_service_1 = require("../services/chat-system-events.service");
exports.chatRouter = (0, express_1.Router)();
exports.chatRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
const chatUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB limit
});
// Prohibited File Extensions (Executables, Embedded Scripts, Env, Code Files)
exports.RESTRICTED_EXTENSIONS = new Set([
    "exe", "bat", "cmd", "sh", "bin", "msi", "apk", "com", "vbs", "ps1", "scr", "pif", "app", "dmg", "pkg", "deb", "rpm",
    "env", "json", "js", "mjs", "cjs", "jsx", "ts", "tsx", "php", "py", "pyc", "rb", "go", "java", "class", "jar",
    "c", "cpp", "h", "hpp", "cs", "sql", "bash", "zsh", "lua", "pl", "asp", "aspx", "jsp", "wasm", "yaml", "yml",
    "pem", "key", "crt", "cer", "pfx", "p12"
]);
exports.profileMemoryCache = new Map();
function invalidateChatProfileCache(userId, tenantId) {
    if (!userId && !tenantId) {
        exports.profileMemoryCache.clear();
        return;
    }
    for (const key of Array.from(exports.profileMemoryCache.keys())) {
        const [tId, uId] = key.split(":");
        if ((!userId || uId === userId) && (!tenantId || tId === tenantId)) {
            exports.profileMemoryCache.delete(key);
        }
    }
}
function validateFileSecurity(attachments) {
    if (!attachments || !Array.isArray(attachments))
        return { isAllowed: true };
    for (const att of attachments) {
        const fileName = String(att.name || att.fileName || "").toLowerCase().trim();
        if (fileName === ".env" || fileName.startsWith(".env.") || fileName.endsWith(".env")) {
            return { isAllowed: false, blockedFile: fileName, reason: "Environment configuration files (.env) are restricted for security." };
        }
        const lastDot = fileName.lastIndexOf(".");
        if (lastDot !== -1) {
            const ext = fileName.slice(lastDot + 1);
            if (exports.RESTRICTED_EXTENSIONS.has(ext)) {
                return { isAllowed: false, blockedFile: fileName, reason: `Files with extension .${ext} are restricted for security (no executables, code, or config files).` };
            }
        }
    }
    return { isAllowed: true };
}
// Helper to determine if threadId is authorized for current user
async function checkThreadAuthorization(threadId, tenantId, currentUserId, roles) {
    const isAdmin = roles?.some((r) => ["super_admin", "tenant_admin"].includes(r)) || false;
    // 1. Direct conversations
    if (threadId.startsWith("direct_")) {
        const parts = threadId.slice("direct_".length).split("_");
        if (parts.length === 1 || parts.includes(currentUserId) || isAdmin) {
            return { authorized: true };
        }
        const userEmps = await prisma_1.prisma.employee.findMany({
            where: {
                tenantId,
                OR: [{ userId: currentUserId }, { id: currentUserId }],
            },
            select: { id: true, userId: true },
        });
        const validCurrentUserIds = new Set([currentUserId]);
        for (const ue of userEmps) {
            if (ue.id)
                validCurrentUserIds.add(ue.id);
            if (ue.userId)
                validCurrentUserIds.add(ue.userId);
        }
        const isParticipant = parts.length === 1 || parts.some((p) => validCurrentUserIds.has(p));
        if (!isParticipant && !isAdmin) {
            return {
                authorized: false,
                reason: "Access denied: You are not an authorized participant in this private direct conversation.",
            };
        }
        return { authorized: true };
    }
    // 2. Group conversations
    if (threadId.startsWith("group_")) {
        const groupId = threadId.slice("group_".length);
        const membership = await prisma_1.prisma.chatGroupMember.findFirst({
            where: { tenantId, groupId, userId: currentUserId },
        });
        if (!membership && !isAdmin) {
            return {
                authorized: false,
                reason: "Access denied: You are not an active member of this chat group.",
                groupId,
            };
        }
        return { authorized: true, groupId };
    }
    // 3. Fallback or general thread
    return { authorized: true };
}
// GET /api/chat/file-policy - Get active file restriction rules
exports.chatRouter.get("/file-policy", auth_1.requireAuth, async (_req, res) => {
    return res.json({
        prohibitedExtensions: Array.from(exports.RESTRICTED_EXTENSIONS),
        allowedCategories: ["Images (png, jpg, jpeg, gif, webp)", "Documents (pdf, docx, xlsx, pptx, txt, csv)"],
    });
});
// GET /api/chat/presence - Get currently active online user IDs in tenant
exports.chatRouter.get("/presence", auth_1.requireAuth, async (req, res) => {
    const tenantId = req.user?.tenantId || "default";
    const onlineUserIds = (0, socket_1.getOnlineUsersForTenant)(tenantId);
    return res.json({ onlineUserIds });
});
// GET /api/chat/participant/:id - Fetch authoritative participant profile with real Employee data
exports.chatRouter.get("/participant/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Participant ID is required" });
        }
        // 1. First, search for matching Employee in this tenant
        const emp = await prisma_1.prisma.employee.findFirst({
            where: {
                tenantId,
                OR: [{ id }, { userId: id }],
            },
            include: {
                department: { select: { id: true, name: true } },
                designation: { select: { id: true, name: true } },
                user: {
                    include: {
                        profile: true,
                    },
                },
            },
        });
        // 2. Search for matching Profile/User in this tenant
        const prof = await prisma_1.prisma.profile.findFirst({
            where: {
                tenantId,
                OR: [{ userId: id }, { id }],
            },
            include: {
                user: {
                    select: { id: true, email: true },
                },
            },
        });
        if (!emp && !prof) {
            return res.status(404).json({ error: "Participant not found in this tenant workspace." });
        }
        const onlineSet = new Set((0, socket_1.getOnlineUsersForTenant)(tenantId));
        const canonicalUserId = emp?.userId || prof?.userId || id;
        const isOnline = onlineSet.has(canonicalUserId) || onlineSet.has(id);
        const fullName = emp
            ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || prof?.fullName || emp.email
            : prof?.fullName || prof?.user?.email || "Colleague";
        const designation = emp?.position || emp?.designation?.name || "Team Member";
        const department = emp?.department?.name || null;
        const email = emp?.email || prof?.user?.email || "";
        const phone = emp?.phone || prof?.phone || null;
        const avatarUrl = prof?.avatarUrl || emp?.user?.profile?.avatarUrl || null;
        const employeeCode = emp?.employeeCode || null;
        return res.json({
            id: canonicalUserId,
            userId: canonicalUserId,
            employeeId: emp?.id || null,
            employeeCode,
            name: fullName,
            email,
            phone,
            department,
            designation,
            avatarUrl,
            status: isOnline ? "online" : "offline",
            statusText: isOnline ? "Online" : "Offline",
            employmentType: emp?.employmentType || null,
            joinedAt: emp?.joinedAt || null,
            bio: prof?.bio || null,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/chat/contacts - Get authorized tenant users and employees
exports.chatRouter.get("/contacts", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const search = String(req.query.search || "").trim().toLowerCase();
        // Fetch active employees with department in this tenant
        const employees = await prisma_1.prisma.employee.findMany({
            where: {
                tenantId,
                status: "active",
            },
            include: {
                department: { select: { id: true, name: true } },
                designation: { select: { id: true, name: true } },
            },
            take: 200,
        });
        // Also fetch user profiles in this tenant (to exclude super_admin platform accounts)
        const userProfiles = await prisma_1.prisma.profile.findMany({
            where: { tenantId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        roles: { select: { role: true } },
                    },
                },
            },
            take: 200,
        });
        const onlineSet = new Set((0, socket_1.getOnlineUsersForTenant)(tenantId));
        // Map profiles into lookup
        const profileByUser = new Map();
        for (const p of userProfiles) {
            // Exclude platform super_admin accounts without tenant membership
            const isPlatformSuperOnly = p.user.roles.some((r) => r.role === "super_admin") && !p.tenantId;
            if (!isPlatformSuperOnly) {
                profileByUser.set(p.userId, p);
            }
        }
        // Build contacts list
        const contactMap = new Map();
        for (const emp of employees) {
            const uId = emp.userId || emp.id;
            if (uId === currentUserId)
                continue; // Skip self
            const prof = emp.userId ? profileByUser.get(emp.userId) : null;
            const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || prof?.fullName || emp.email;
            contactMap.set(uId, {
                id: uId,
                userId: emp.userId || null,
                employeeId: emp.id,
                employeeCode: emp.employeeCode || null,
                name,
                email: emp.email,
                phone: emp.phone || prof?.phone || null,
                title: emp.position || emp.designation?.name || "Team Member",
                designation: emp.position || emp.designation?.name || "Team Member",
                department: emp.department?.name || null,
                avatarUrl: prof?.avatarUrl || null,
                status: onlineSet.has(uId) || (emp.userId && onlineSet.has(emp.userId)) ? "online" : "offline",
                statusText: onlineSet.has(uId) ? "Online" : "Offline",
            });
        }
        // Include any profiles not mapped to employee record
        for (const [uId, prof] of profileByUser.entries()) {
            if (uId === currentUserId)
                continue;
            if (!contactMap.has(uId)) {
                contactMap.set(uId, {
                    id: uId,
                    userId: uId,
                    employeeId: null,
                    name: prof.fullName || prof.user.email,
                    email: prof.user.email,
                    phone: prof.phone || "",
                    title: "User",
                    department: "",
                    avatarUrl: prof.avatarUrl || null,
                    status: onlineSet.has(uId) ? "online" : "offline",
                    statusText: onlineSet.has(uId) ? "Online" : "Offline",
                });
            }
        }
        let contacts = Array.from(contactMap.values());
        // Filter by search query if provided
        if (search) {
            contacts = contacts.filter((c) => c.name.toLowerCase().includes(search) ||
                c.email.toLowerCase().includes(search) ||
                c.title.toLowerCase().includes(search) ||
                c.department.toLowerCase().includes(search));
        }
        // Attach latest message snippet and unread count for each contact
        const enrichedContacts = await Promise.all(contacts.map(async (c) => {
            const threadId = `direct_${[currentUserId, c.id].sort().join("_")}`;
            const lastMsg = await prisma_1.prisma.chatMessage.findFirst({
                where: { tenantId, threadId },
                orderBy: { createdAt: "desc" },
                select: { content: true, createdAt: true, senderId: true },
            });
            const receipt = await prisma_1.prisma.chatReadReceipt.findUnique({
                where: { tenantId_threadId_userId: { tenantId, threadId, userId: currentUserId } },
                select: { lastReadAt: true },
            });
            const lastReadAt = receipt?.lastReadAt || new Date(0);
            const unreadCount = await prisma_1.prisma.chatMessage.count({
                where: {
                    tenantId,
                    threadId,
                    senderId: { not: currentUserId },
                    createdAt: { gt: lastReadAt },
                },
            });
            return {
                ...c,
                threadId,
                lastMessage: lastMsg?.content || "",
                time: lastMsg?.createdAt ? new Date(lastMsg.createdAt).toISOString() : null,
                unread: unreadCount,
            };
        }));
        enrichedContacts.sort((a, b) => {
            if (a.time && b.time)
                return new Date(b.time).getTime() - new Date(a.time).getTime();
            if (a.time)
                return -1;
            if (b.time)
                return 1;
            return a.name.localeCompare(b.name);
        });
        return res.json(enrichedContacts);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/chat/conversations - Get all active direct and group conversations
exports.chatRouter.get("/conversations", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const onlineSet = new Set((0, socket_1.getOnlineUsersForTenant)(tenantId));
        // Query pinned conversations for current user
        const userPins = await prisma_1.prisma.chatConversationPin.findMany({
            where: { tenantId, userId: currentUserId },
        });
        const pinnedSet = new Set(userPins.map((p) => p.threadId));
        // 1. Fetch user's groups in this tenant
        const groupMemberships = await prisma_1.prisma.chatGroupMember.findMany({
            where: { tenantId, userId: currentUserId },
            include: {
                group: {
                    include: {
                        members: true,
                    },
                },
            },
        });
        const groupConversations = await Promise.all(groupMemberships.map(async (m) => {
            const g = m.group;
            const threadId = `group_${g.id}`;
            const lastMsg = await prisma_1.prisma.chatMessage.findFirst({
                where: { tenantId, threadId },
                orderBy: { createdAt: "desc" },
            });
            const receipt = await prisma_1.prisma.chatReadReceipt.findUnique({
                where: { tenantId_threadId_userId: { tenantId, threadId, userId: currentUserId } },
            });
            const lastReadAt = receipt?.lastReadAt || new Date(0);
            const unreadCount = await prisma_1.prisma.chatMessage.count({
                where: {
                    tenantId,
                    threadId,
                    senderId: { not: currentUserId },
                    createdAt: { gt: lastReadAt },
                },
            });
            return {
                id: g.id,
                groupId: g.id,
                threadId,
                type: "group",
                name: g.name,
                description: g.description,
                avatarUrl: g.avatarUrl || null,
                memberCount: g.members.length,
                members: g.members.map((mem) => mem.userId),
                createdById: g.createdById,
                ownerId: g.ownerId || g.createdById,
                lastMessage: lastMsg?.content || "",
                lastMessageTime: lastMsg?.createdAt || g.createdAt,
                unreadCount,
                isPinned: pinnedSet.has(threadId),
                isMuted: m.isMuted,
            };
        }));
        // 2. Fetch distinct direct threads involving currentUserId
        const directMessages = await prisma_1.prisma.chatMessage.findMany({
            where: {
                tenantId,
                threadId: { startsWith: "direct_" },
                OR: [
                    { threadId: { contains: `_${currentUserId}` } },
                    { threadId: { contains: `${currentUserId}_` } },
                ],
            },
            orderBy: { createdAt: "desc" },
            take: 200,
        });
        const directThreadsMap = new Map();
        for (const msg of directMessages) {
            if (!directThreadsMap.has(msg.threadId)) {
                directThreadsMap.set(msg.threadId, msg);
            }
        }
        const directConversations = await Promise.all(Array.from(directThreadsMap.entries()).map(async ([threadId, lastMsg]) => {
            const parts = threadId.slice("direct_".length).split("_");
            const otherUserId = parts.find((p) => p !== currentUserId) || currentUserId;
            // Fetch other user profile or employee details
            let name = "User";
            let email = "";
            let avatarUrl = null;
            let title = "Employee";
            const emp = await prisma_1.prisma.employee.findFirst({
                where: { tenantId, OR: [{ userId: otherUserId }, { id: otherUserId }] },
                include: {
                    department: { select: { id: true, name: true } },
                    designation: { select: { id: true, name: true } },
                },
            });
            if (emp) {
                name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email;
                email = emp.email;
                title = emp.position || emp.designation?.name || "Team Member";
            }
            const prof = await prisma_1.prisma.profile.findFirst({
                where: { tenantId, userId: otherUserId },
            });
            if (prof) {
                if (!emp)
                    name = prof.fullName || name;
                avatarUrl = prof.avatarUrl;
            }
            const receipt = await prisma_1.prisma.chatReadReceipt.findUnique({
                where: { tenantId_threadId_userId: { tenantId, threadId, userId: currentUserId } },
            });
            const lastReadAt = receipt?.lastReadAt || new Date(0);
            const unreadCount = await prisma_1.prisma.chatMessage.count({
                where: {
                    tenantId,
                    threadId,
                    senderId: { not: currentUserId },
                    createdAt: { gt: lastReadAt },
                },
            });
            return {
                id: otherUserId,
                userId: emp?.userId || prof?.userId || otherUserId,
                employeeId: emp?.id || null,
                employeeCode: emp?.employeeCode || null,
                threadId,
                type: "direct",
                name,
                email,
                phone: emp?.phone || prof?.phone || null,
                department: emp?.department?.name || null,
                title,
                designation: title,
                avatarUrl,
                status: onlineSet.has(otherUserId) ? "online" : "offline",
                statusText: onlineSet.has(otherUserId) ? "Online" : "Offline",
                lastMessage: lastMsg.content,
                lastMessageTime: lastMsg.createdAt,
                unreadCount,
                isPinned: pinnedSet.has(threadId),
            };
        }));
        const allConversations = [...groupConversations, ...directConversations].sort((a, b) => {
            if (a.isPinned && !b.isPinned)
                return -1;
            if (!a.isPinned && b.isPinned)
                return 1;
            return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        });
        return res.json(allConversations);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/chat/conversations/direct - Start or open a direct conversation
exports.chatRouter.post("/conversations/direct", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const targetUserId = req.body.targetUserId || req.body.participantId || req.body.userId || req.body.contactId;
        if (!targetUserId || typeof targetUserId !== "string") {
            return res.status(400).json({ error: "targetUserId or participantId is required" });
        }
        // Verify target belongs to the same tenant
        const targetUser = await prisma_1.prisma.user.findFirst({
            where: {
                id: targetUserId,
                profile: { tenantId },
            },
            include: { profile: true },
        });
        const targetEmp = await prisma_1.prisma.employee.findFirst({
            where: {
                tenantId,
                OR: [{ userId: targetUserId }, { id: targetUserId }],
            },
            include: {
                department: { select: { id: true, name: true } },
                designation: { select: { id: true, name: true } },
            },
        });
        if (!targetUser && !targetEmp) {
            return res.status(404).json({ error: "Target contact not found in this tenant workspace." });
        }
        // Canonical deterministic threadId: prevents duplicate threads
        const threadId = `direct_${[currentUserId, targetUserId].sort().join("_")}`;
        const contactName = targetEmp
            ? `${targetEmp.firstName || ""} ${targetEmp.lastName || ""}`.trim() || targetEmp.email
            : targetUser?.profile?.fullName || targetUser?.email || "User";
        const designation = targetEmp?.position || targetEmp?.designation?.name || "Team Member";
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
            designation,
            employeeCode: targetEmp?.employeeCode || null,
            status: (0, socket_1.getOnlineUsersForTenant)(tenantId).includes(targetUserId) ? "online" : "offline",
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/chat/groups - Get all groups for current user
exports.chatRouter.get("/groups", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const search = String(req.query.search || "").trim().toLowerCase();
        // Query pinned conversations for current user
        const userPins = await prisma_1.prisma.chatConversationPin.findMany({
            where: { tenantId, userId: currentUserId },
        });
        const pinnedSet = new Set(userPins.map((p) => p.threadId));
        const groups = await prisma_1.prisma.chatGroup.findMany({
            where: {
                tenantId,
                members: {
                    some: { userId: currentUserId },
                },
                ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
            },
            include: {
                members: true,
            },
            orderBy: { updatedAt: "desc" },
        });
        const enrichedGroups = await Promise.all(groups.map(async (g) => {
            const threadId = `group_${g.id}`;
            const lastMsg = await prisma_1.prisma.chatMessage.findFirst({
                where: { tenantId, threadId },
                orderBy: { createdAt: "desc" },
                select: { content: true, createdAt: true, senderName: true },
            });
            const receipt = await prisma_1.prisma.chatReadReceipt.findUnique({
                where: { tenantId_threadId_userId: { tenantId, threadId, userId: currentUserId } },
            });
            const lastReadAt = receipt?.lastReadAt || new Date(0);
            const unreadCount = await prisma_1.prisma.chatMessage.count({
                where: {
                    tenantId,
                    threadId,
                    senderId: { not: currentUserId },
                    createdAt: { gt: lastReadAt },
                },
            });
            const userMembership = g.members.find((m) => m.userId === currentUserId);
            const richMembers = await Promise.all(g.members.map(async (mem) => {
                const prof = await prisma_1.prisma.profile.findFirst({
                    where: { tenantId, userId: mem.userId },
                    select: { fullName: true, avatarUrl: true },
                });
                const emp = await prisma_1.prisma.employee.findFirst({
                    where: { tenantId, OR: [{ userId: mem.userId }, { id: mem.userId }] },
                    select: { id: true, firstName: true, lastName: true, email: true, position: true, department: { select: { name: true } } },
                });
                const displayName = emp
                    ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email
                    : prof?.fullName || "Member";
                return {
                    id: mem.id,
                    userId: mem.userId,
                    role: mem.role || "member",
                    isMuted: mem.isMuted,
                    name: displayName,
                    email: emp?.email,
                    avatarUrl: prof?.avatarUrl || null,
                    department: emp?.department?.name || null,
                    designation: emp?.position || "Team Member",
                };
            }));
            return {
                id: g.id,
                groupId: g.id,
                threadId,
                name: g.name,
                description: g.description,
                avatarUrl: g.avatarUrl,
                memberCount: g.members.length,
                members: richMembers,
                createdById: g.createdById,
                ownerId: g.ownerId || g.createdById,
                lastMessage: lastMsg?.content || "",
                lastMessageSender: lastMsg?.senderName || "",
                time: lastMsg?.createdAt || g.createdAt,
                unread: unreadCount,
                unreadCount,
                isPinned: pinnedSet.has(threadId),
                isMuted: userMembership?.isMuted || false,
            };
        }));
        enrichedGroups.sort((a, b) => {
            if (a.isPinned && !b.isPinned)
                return -1;
            if (!a.isPinned && b.isPinned)
                return 1;
            return new Date(b.time).getTime() - new Date(a.time).getTime();
        });
        return res.json(enrichedGroups);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/chat/groups - Create a new group
exports.chatRouter.post("/groups", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { name, description, avatarUrl, memberIds = [] } = req.body;
        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ error: "Group name is required." });
        }
        // Verify all memberIds belong to this tenant
        const uniqueMembers = Array.from(new Set([currentUserId, ...(Array.isArray(memberIds) ? memberIds : [])]));
        const group = await prisma_1.prisma.$transaction(async (tx) => {
            const created = await tx.chatGroup.create({
                data: {
                    tenantId,
                    name: name.trim(),
                    description: description?.trim() || null,
                    avatarUrl: avatarUrl?.trim() || null,
                    createdById: currentUserId,
                    ownerId: currentUserId,
                },
            });
            // Add members: creator is "owner", others are "member"
            const memberData = uniqueMembers.map((userId) => ({
                tenantId,
                groupId: created.id,
                userId,
                role: userId === currentUserId ? "owner" : "member",
            }));
            await tx.chatGroupMember.createMany({
                data: memberData,
                skipDuplicates: true,
            });
            // System event for group creation
            const creatorProfile = await tx.profile.findFirst({
                where: { userId: currentUserId, tenantId },
                select: { fullName: true },
            });
            const creatorName = creatorProfile?.fullName || req.user?.email?.split("@")[0] || "User";
            await (0, chat_system_events_service_1.recordSystemEvent)(tenantId, `group_${created.id}`, currentUserId, "group_created", `${creatorName} created the group "${name.trim()}".`, { groupName: name.trim() }, tx);
            return created;
        });
        const fullGroup = await prisma_1.prisma.chatGroup.findUnique({
            where: { id: group.id },
            include: { members: true },
        });
        // Broadcast to tenant
        (0, socket_1.broadcastToTenant)(tenantId, "chat:group_created", { group: fullGroup });
        await pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:group_created", { group: fullGroup }).catch(() => { });
        return res.status(201).json(fullGroup);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/chat/groups/:id - Get group details & members
exports.chatRouter.get("/groups/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { id } = req.params;
        const group = await prisma_1.prisma.chatGroup.findFirst({
            where: { id, tenantId },
            include: {
                members: true,
            },
        });
        if (!group) {
            return res.status(404).json({ error: "Group not found." });
        }
        const isMember = group.members.some((m) => m.userId === currentUserId);
        const isAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin"].includes(r));
        if (!isMember && !isAdmin) {
            return res.status(403).json({
                error: "Access denied: You are not a member of this group.",
                code: "CHAT_GROUP_MEMBER_REQUIRED",
            });
        }
        const richMembers = await Promise.all(group.members.map(async (mem) => {
            const prof = await prisma_1.prisma.profile.findFirst({
                where: { tenantId, userId: mem.userId },
                select: { fullName: true, avatarUrl: true },
            });
            const emp = await prisma_1.prisma.employee.findFirst({
                where: { tenantId, OR: [{ userId: mem.userId }, { id: mem.userId }] },
                select: { id: true, firstName: true, lastName: true, email: true, position: true, department: { select: { name: true } } },
            });
            const displayName = emp
                ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email
                : prof?.fullName || "Member";
            return {
                id: mem.id,
                userId: mem.userId,
                role: mem.role || "member",
                isMuted: mem.isMuted,
                name: displayName,
                email: emp?.email,
                avatarUrl: prof?.avatarUrl || null,
                department: emp?.department?.name || null,
                designation: emp?.position || "Team Member",
            };
        }));
        return res.json({
            ...group,
            ownerId: group.ownerId || group.createdById,
            members: richMembers,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// PATCH /api/chat/groups/:id - Update group profile (name, description, avatarUrl)
exports.chatRouter.patch("/groups/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { id } = req.params;
        const { name, description, avatarUrl } = req.body;
        const group = await prisma_1.prisma.chatGroup.findFirst({
            where: { id, tenantId },
            include: { members: true },
        });
        if (!group) {
            return res.status(404).json({ error: "Group not found." });
        }
        const requesterMember = group.members.find((m) => m.userId === currentUserId);
        const isOwner = group.ownerId === currentUserId || group.createdById === currentUserId;
        const isGroupAdmin = requesterMember?.role === "admin" || requesterMember?.role === "owner" || isOwner;
        const isTenantAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));
        if (!isGroupAdmin && !isTenantAdmin) {
            return res.status(403).json({
                error: "Access denied: Only group administrators or owners can edit group profile.",
                code: "CHAT_GROUP_ADMIN_REQUIRED",
            });
        }
        const updatedData = {};
        if (typeof name === "string" && name.trim())
            updatedData.name = name.trim();
        if (typeof description === "string")
            updatedData.description = description.trim() || null;
        if (avatarUrl !== undefined) {
            updatedData.avatarUrl = typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : null;
        }
        const updated = await prisma_1.prisma.chatGroup.update({
            where: { id },
            data: updatedData,
            include: { members: true },
        });
        // Record system event
        const prof = await prisma_1.prisma.profile.findFirst({
            where: { userId: currentUserId, tenantId },
            select: { fullName: true },
        });
        const actorName = prof?.fullName || "Admin";
        const changes = [];
        if (updatedData.name && updatedData.name !== group.name) {
            changes.push(`changed group name to "${updatedData.name}"`);
        }
        if (updatedData.avatarUrl !== undefined && updatedData.avatarUrl !== group.avatarUrl) {
            changes.push(updatedData.avatarUrl ? `updated group photo` : `removed group photo`);
        }
        if (updatedData.description !== undefined && updatedData.description !== group.description) {
            changes.push(`updated group description`);
        }
        const changeDesc = changes.length > 0 ? changes.join(" and ") : "updated the group profile";
        await (0, chat_system_events_service_1.recordSystemEvent)(tenantId, `group_${id}`, currentUserId, "group_profile_updated", `${actorName} ${changeDesc}.`, { updatedFields: Object.keys(updatedData) });
        (0, socket_1.broadcastToTenant)(tenantId, "chat:group_updated", { groupId: id, group: updated });
        await pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:group_updated", { groupId: id, group: updated }).catch(() => { });
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/chat/groups/:id/members - Add members to group
exports.chatRouter.post("/groups/:id/members", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { id } = req.params;
        const { memberIds = [], userId } = req.body;
        const rawIds = Array.isArray(memberIds) && memberIds.length > 0 ? memberIds : userId ? [userId] : [];
        if (rawIds.length === 0) {
            return res.status(400).json({ error: "memberIds array or userId is required." });
        }
        const group = await prisma_1.prisma.chatGroup.findFirst({
            where: { id, tenantId },
            include: { members: true },
        });
        if (!group) {
            return res.status(404).json({ error: "Group not found." });
        }
        const requesterMember = group.members.find((m) => m.userId === currentUserId);
        const isOwner = group.ownerId === currentUserId || group.createdById === currentUserId;
        const isGroupAdmin = requesterMember?.role === "admin" || requesterMember?.role === "owner" || isOwner;
        const isTenantAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));
        if (!isGroupAdmin && !isTenantAdmin) {
            return res.status(403).json({
                error: "Access denied: Only group admins or tenant admins can add members.",
                code: "CHAT_GROUP_ADMIN_REQUIRED",
            });
        }
        // Validate that submitted users belong to this tenant (prevent cross-tenant additions)
        const validTenantProfiles = await prisma_1.prisma.profile.findMany({
            where: { userId: { in: rawIds }, tenantId },
            select: { userId: true, fullName: true },
        });
        const validTenantUserIds = new Set(validTenantProfiles.map((p) => p.userId));
        const tenantApprovedIds = rawIds.filter((uid) => validTenantUserIds.has(uid));
        if (tenantApprovedIds.length === 0) {
            return res.status(400).json({ error: "No eligible organization members found in the submission." });
        }
        const uniqueApprovedIds = Array.from(new Set(tenantApprovedIds));
        const newMembers = uniqueApprovedIds.filter((uid) => !group.members.some((m) => m.userId === uid));
        if (newMembers.length > 0) {
            await prisma_1.prisma.chatGroupMember.createMany({
                data: newMembers.map((uid) => ({
                    tenantId,
                    groupId: id,
                    userId: uid,
                    role: "member",
                })),
                skipDuplicates: true,
            });
            // System event for added members
            const actorProf = await prisma_1.prisma.profile.findFirst({
                where: { userId: currentUserId, tenantId },
                select: { fullName: true },
            });
            const actorName = actorProf?.fullName || "Admin";
            const addedProfiles = await prisma_1.prisma.profile.findMany({
                where: { userId: { in: newMembers }, tenantId },
                select: { fullName: true },
            });
            const addedNames = addedProfiles.map((p) => p.fullName).filter(Boolean).join(", ") || `${newMembers.length} member(s)`;
            await (0, chat_system_events_service_1.recordSystemEvent)(tenantId, `group_${id}`, currentUserId, "member_added", `${actorName} added ${addedNames}.`, { addedMemberIds: newMembers, addedNames });
            (0, socket_1.broadcastToTenant)(tenantId, "chat:group_updated", { groupId: id, addedMemberIds: newMembers });
            await pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:group_updated", { groupId: id, addedMemberIds: newMembers }).catch(() => { });
        }
        const updated = await prisma_1.prisma.chatGroup.findUnique({
            where: { id },
            include: { members: true },
        });
        return res.json({
            ...(updated || {}),
            success: true,
            addedCount: newMembers.length,
            addedMemberIds: newMembers,
            group: updated,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// DELETE /api/chat/groups/:id/members/:userId - Remove member from group
exports.chatRouter.delete("/groups/:id/members/:userId", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { id, userId } = req.params;
        const group = await prisma_1.prisma.chatGroup.findFirst({
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
        // Last-admin safety check
        const isTargetOwner = group.ownerId === userId || targetMember.role === "owner";
        const otherAdmins = group.members.filter((m) => m.userId !== userId && (m.role === "admin" || m.role === "owner" || group.ownerId === m.userId));
        if (isTargetOwner && group.members.length > 1 && otherAdmins.length === 0) {
            return res.status(400).json({
                error: "Cannot leave or remove as the only group owner/admin. Please transfer ownership to another member first.",
                code: "LAST_ADMIN_SAFETY_VIOLATION",
            });
        }
        await prisma_1.prisma.chatGroupMember.deleteMany({
            where: {
                groupId: id,
                userId,
                tenantId,
            },
        });
        // Record system event
        const actorProf = await prisma_1.prisma.profile.findFirst({
            where: { userId: currentUserId, tenantId },
            select: { fullName: true },
        });
        const actorName = actorProf?.fullName || "User";
        const targetProf = await prisma_1.prisma.profile.findFirst({
            where: { userId, tenantId },
            select: { fullName: true },
        });
        const targetName = targetProf?.fullName || "Member";
        const eventContent = isSelf ? `${actorName} left the group.` : `${actorName} removed ${targetName}.`;
        const eventType = isSelf ? "member_left" : "member_removed";
        await (0, chat_system_events_service_1.recordSystemEvent)(tenantId, `group_${id}`, currentUserId, eventType, eventContent, { affectedUserId: userId, affectedUserName: targetName });
        (0, socket_1.broadcastToTenant)(tenantId, "chat:group_updated", { groupId: id, removedMemberId: userId });
        await pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:group_updated", { groupId: id, removedMemberId: userId }).catch(() => { });
        return res.json({ success: true, message: isSelf ? "You have left the group." : "Member removed from group." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// PATCH /api/chat/groups/:id/members/:userId/role - Manage Member/Moderator/Admin roles
exports.chatRouter.patch("/groups/:id/members/:userId/role", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { id, userId } = req.params;
        const { role } = req.body;
        const validRoles = ["owner", "admin", "moderator", "member"];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({ error: `Invalid role. Allowed roles: ${validRoles.join(", ")}` });
        }
        const group = await prisma_1.prisma.chatGroup.findFirst({
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
        // Non-admin cannot change roles
        if (!isRequesterOwner && !isRequesterAdmin && !isTenantAdmin) {
            return res.status(403).json({
                error: "Access denied: Only group owners or admins can change member roles.",
                code: "CHAT_ROLE_FORBIDDEN",
            });
        }
        // Only owner can assign owner or modify other admins
        if (role === "owner" && !isRequesterOwner && !isTenantAdmin) {
            return res.status(403).json({
                error: "Access denied: Only the current owner can assign owner role (use Transfer Ownership).",
                code: "CHAT_OWNER_REQUIRED",
            });
        }
        // Admin cannot demote owner
        if (targetMember.role === "owner" && !isRequesterOwner && !isTenantAdmin) {
            return res.status(403).json({
                error: "Access denied: Cannot change the role of the group owner.",
                code: "CHAT_OWNER_PROTECTED",
            });
        }
        // Last-admin safety
        if ((targetMember.role === "owner" || targetMember.role === "admin") &&
            role !== "owner" &&
            role !== "admin") {
            const otherAdmins = group.members.filter((m) => m.userId !== userId && (m.role === "admin" || m.role === "owner" || group.ownerId === m.userId));
            if (otherAdmins.length === 0) {
                return res.status(400).json({
                    error: "Cannot demote the last administrator/owner of the group.",
                    code: "LAST_ADMIN_SAFETY_VIOLATION",
                });
            }
        }
        await prisma_1.prisma.chatGroupMember.update({
            where: { id: targetMember.id },
            data: { role },
        });
        // Record system event
        const actorProf = await prisma_1.prisma.profile.findFirst({
            where: { userId: currentUserId, tenantId },
            select: { fullName: true },
        });
        const actorName = actorProf?.fullName || "Admin";
        const targetProf = await prisma_1.prisma.profile.findFirst({
            where: { userId, tenantId },
            select: { fullName: true },
        });
        const targetName = targetProf?.fullName || "Member";
        let roleEventText = `${actorName} changed ${targetName}'s role to ${role}.`;
        if (role === "admin")
            roleEventText = `${actorName} made ${targetName} a group admin.`;
        else if (role === "moderator")
            roleEventText = `${actorName} made ${targetName} a group moderator.`;
        else if (role === "member")
            roleEventText = `${actorName} removed ${targetName}'s admin privileges.`;
        await (0, chat_system_events_service_1.recordSystemEvent)(tenantId, `group_${id}`, currentUserId, "role_changed", roleEventText, { affectedUserId: userId, affectedUserName: targetName, newRole: role });
        (0, socket_1.broadcastToTenant)(tenantId, "chat:group_updated", { groupId: id, userId, role });
        await pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:group_updated", { groupId: id, userId, role }).catch(() => { });
        return res.json({ success: true, message: roleEventText, newRole: role });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/chat/groups/:id/transfer-ownership - Transfer group ownership transactionally
exports.chatRouter.post("/groups/:id/transfer-ownership", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { id } = req.params;
        const { newOwnerId } = req.body;
        if (!newOwnerId || typeof newOwnerId !== "string") {
            return res.status(400).json({ error: "newOwnerId is required." });
        }
        const group = await prisma_1.prisma.chatGroup.findFirst({
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
        await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Update group ownerId
            await tx.chatGroup.update({
                where: { id },
                data: { ownerId: newOwnerId },
            });
            // 2. Set target member role to "owner"
            await tx.chatGroupMember.update({
                where: { id: targetMember.id },
                data: { role: "owner" },
            });
            // 3. Set previous owner to "admin"
            const prevOwnerMember = group.members.find((m) => m.userId === currentUserId);
            if (prevOwnerMember) {
                await tx.chatGroupMember.update({
                    where: { id: prevOwnerMember.id },
                    data: { role: "admin" },
                });
            }
            // 4. Record system event
            const actorProf = await tx.profile.findFirst({
                where: { userId: currentUserId, tenantId },
                select: { fullName: true },
            });
            const actorName = actorProf?.fullName || "Previous Owner";
            const targetProf = await tx.profile.findFirst({
                where: { userId: newOwnerId, tenantId },
                select: { fullName: true },
            });
            const targetName = targetProf?.fullName || "New Owner";
            await (0, chat_system_events_service_1.recordSystemEvent)(tenantId, `group_${id}`, currentUserId, "ownership_transferred", `${actorName} transferred group ownership to ${targetName}.`, { oldOwnerId: currentUserId, newOwnerId, oldOwnerName: actorName, newOwnerName: targetName }, tx);
        });
        (0, socket_1.broadcastToTenant)(tenantId, "chat:group_updated", { groupId: id, newOwnerId });
        await pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:group_updated", { groupId: id, newOwnerId }).catch(() => { });
        return res.json({ success: true, message: "Ownership successfully transferred.", newOwnerId });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/chat/groups/:id/leave - Leave group with last-admin safety check
exports.chatRouter.post("/groups/:id/leave", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { id } = req.params;
        const group = await prisma_1.prisma.chatGroup.findFirst({
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
        // Last-admin safety check
        const isOwner = group.ownerId === currentUserId || currentMember.role === "owner";
        const otherAdmins = group.members.filter((m) => m.userId !== currentUserId && (m.role === "admin" || m.role === "owner" || group.ownerId === m.userId));
        if (isOwner && group.members.length > 1 && otherAdmins.length === 0) {
            return res.status(400).json({
                error: "You are the only owner/admin of this group. You must transfer ownership to another member before leaving.",
                code: "LAST_ADMIN_SAFETY_VIOLATION",
            });
        }
        await prisma_1.prisma.chatGroupMember.deleteMany({
            where: { groupId: id, userId: currentUserId, tenantId },
        });
        const actorProf = await prisma_1.prisma.profile.findFirst({
            where: { userId: currentUserId, tenantId },
            select: { fullName: true },
        });
        const actorName = actorProf?.fullName || "A member";
        await (0, chat_system_events_service_1.recordSystemEvent)(tenantId, `group_${id}`, currentUserId, "member_left", `${actorName} left the group.`, { leftUserId: currentUserId, leftUserName: actorName });
        (0, socket_1.broadcastToTenant)(tenantId, "chat:group_updated", { groupId: id, removedMemberId: currentUserId });
        await pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:group_updated", { groupId: id, removedMemberId: currentUserId }).catch(() => { });
        return res.json({ success: true, message: "You have left the group." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/chat/groups/:id/mute - Toggle or set mute preference
exports.chatRouter.post("/groups/:id/mute", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { id } = req.params;
        const { isMuted, durationHours } = req.body;
        const membership = await prisma_1.prisma.chatGroupMember.findFirst({
            where: { groupId: id, userId: currentUserId, tenantId },
        });
        if (!membership) {
            return res.status(404).json({ error: "You are not a member of this group." });
        }
        const nextMuted = typeof isMuted === "boolean" ? isMuted : !membership.isMuted;
        const mutedUntil = nextMuted && durationHours ? new Date(Date.now() + durationHours * 3600 * 1000) : null;
        const updated = await prisma_1.prisma.chatGroupMember.update({
            where: { id: membership.id },
            data: { isMuted: nextMuted, mutedUntil },
        });
        return res.json({
            success: true,
            isMuted: updated.isMuted,
            mutedUntil: updated.mutedUntil,
            message: updated.isMuted ? "Group notifications muted." : "Group notifications unmuted.",
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/chat/groups/:id/invite-link - Generate secure invite token
// Retired: Public invite links are disabled for HRMS security
exports.chatRouter.all(["/groups/:id/invite-link", "/groups/:id/invite"], auth_1.requireAuth, async (_req, res) => {
    return res.status(403).json({
        error: "Public invite links are disabled for internal HRMS workspaces. Please use the internal member invitation dialog.",
        code: "PUBLIC_INVITE_DISABLED",
    });
});
exports.chatRouter.all(["/groups/join-by-invite", "/groups/invite/:inviteCode", "/groups/invite*"], async (_req, res) => {
    return res.status(403).json({
        error: "Joining groups via public invite links is disabled. Please contact your workspace or group administrator to be added directly.",
        code: "PUBLIC_INVITE_DISABLED",
    });
});
// GET /api/chat/groups/:id/activity - Fetch group activity history (system events)
exports.chatRouter.get("/groups/:id/activity", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { id } = req.params;
        const group = await prisma_1.prisma.chatGroup.findFirst({
            where: { id, tenantId },
            include: { members: true },
        });
        if (!group) {
            return res.status(404).json({ error: "Group not found." });
        }
        const isMember = group.members.some((m) => m.userId === currentUserId);
        const isAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin"].includes(r));
        if (!isMember && !isAdmin) {
            return res.status(403).json({ error: "Access denied.", code: "CHAT_UNAUTHORIZED" });
        }
        const events = await prisma_1.prisma.chatMessage.findMany({
            where: {
                tenantId,
                threadId: `group_${id}`,
                isSystemEvent: true,
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        return res.json(events);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/chat/conversations/:threadId/pin - Toggle pin for current user
exports.chatRouter.post("/conversations/:threadId/pin", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { threadId } = req.params;
        const existing = await prisma_1.prisma.chatConversationPin.findUnique({
            where: {
                tenantId_userId_threadId: {
                    tenantId,
                    userId: currentUserId,
                    threadId,
                },
            },
        });
        if (existing) {
            await prisma_1.prisma.chatConversationPin.delete({
                where: { id: existing.id },
            });
            return res.json({ isPinned: false, message: "Conversation unpinned." });
        }
        else {
            await prisma_1.prisma.chatConversationPin.create({
                data: {
                    tenantId,
                    userId: currentUserId,
                    threadId,
                },
            });
            return res.json({ isPinned: true, message: "Conversation pinned." });
        }
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/chat/conversations/pinned - Get all pinned conversation thread IDs for current user
exports.chatRouter.get("/conversations/pinned", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const pins = await prisma_1.prisma.chatConversationPin.findMany({
            where: { tenantId, userId: currentUserId },
            orderBy: { pinnedAt: "desc" },
        });
        return res.json(pins.map((p) => p.threadId));
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/chat/upload - Upload attachment or voice note to Centralized Media Library
exports.chatRouter.post("/upload", auth_1.requireAuth, (req, res, next) => {
    chatUpload.any()(req, res, (err) => {
        if (err) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                    error: "File size exceeds 30 MB limit. Please select a smaller file.",
                    code: "FILE_TOO_LARGE",
                });
            }
            return res.status(400).json({
                error: err.message || "File upload error",
                code: "UPLOAD_ERROR",
            });
        }
        next();
    });
}, async (req, res) => {
    try {
        const rawFiles = req.files || (req.file ? [req.file] : []);
        if (!rawFiles || rawFiles.length === 0) {
            return res.status(400).json({ error: "No file provided" });
        }
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "system";
        const savedFiles = [];
        for (const file of rawFiles) {
            const originalName = file.originalname || "attachment";
            const lastDot = originalName.lastIndexOf(".");
            const ext = lastDot !== -1 ? originalName.slice(lastDot + 1).toLowerCase() : "";
            if (file.size > 30 * 1024 * 1024 || (file.buffer && file.buffer.length > 30 * 1024 * 1024)) {
                return res.status(413).json({
                    error: `File "${originalName}" exceeds 30 MB limit.`,
                    code: "FILE_TOO_LARGE",
                });
            }
            if (exports.RESTRICTED_EXTENSIONS.has(ext)) {
                return res.status(400).json({
                    error: `Security Violation: Files with extension .${ext} are strictly prohibited (no executables, code, or configuration files).`,
                    code: "FILE_RESTRICTED",
                });
            }
            if (originalName.toLowerCase().startsWith(".env") || originalName.toLowerCase().endsWith(".env")) {
                return res.status(400).json({
                    error: "Security Violation: .env files are strictly prohibited.",
                    code: "FILE_RESTRICTED",
                });
            }
            // Logical folder classification under /media:
            // - Images -> Chat/Images/
            // - Audio -> Chat/Audio/
            // - PDFs and Documents -> Chat/Documents/
            let targetFolder = "Chat/Documents";
            const mime = (file.mimetype || "").toLowerCase();
            if (mime.startsWith("image/") ||
                ["png", "jpg", "jpeg", "webp", "gif", "ico", "svg"].includes(ext)) {
                targetFolder = "Chat/Images";
            }
            else if (mime.startsWith("audio/") ||
                ["mp3", "wav", "ogg", "weba", "webm", "m4a", "aac"].includes(ext)) {
                targetFolder = "Chat/Audio";
            }
            // Persist in central Media Library with tenant scope
            const mediaRecord = await media_service_1.MediaService.uploadMedia(file.buffer, originalName, {
                folder: targetFolder,
                tenantId,
                uploadedBy: currentUserId,
                mimeType: file.mimetype,
                tags: ["chat", targetFolder.toLowerCase()],
            });
            savedFiles.push({
                id: mediaRecord.id,
                mediaId: mediaRecord.id,
                url: mediaRecord.url,
                name: mediaRecord.fileName,
                fileName: mediaRecord.fileName,
                size: mediaRecord.fileSize,
                fileSize: mediaRecord.fileSize,
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
            fileName: savedFiles[0]?.fileName,
            id: savedFiles[0]?.id,
            mediaId: savedFiles[0]?.mediaId,
        });
    }
    catch (err) {
        console.error("Chat upload error:", err);
        return res.status(500).json({ error: err.message || "File upload failed" });
    }
});
// GET /api/chat/url-preview - SSRF-safe URL preview metadata endpoint
exports.chatRouter.get("/url-preview", auth_1.requireAuth, async (req, res) => {
    try {
        const url = String(req.query.url || "").trim();
        if (!url) {
            return res.status(400).json({ error: "URL query parameter is required." });
        }
        const preview = await url_preview_service_1.UrlPreviewService.fetchPreview(url);
        if (!preview) {
            return res.status(400).json({ error: "Invalid, restricted, or unreachable URL." });
        }
        return res.json({ preview });
    }
    catch (err) {
        const status = err.message?.includes("prohibited") ||
            err.message?.includes("Invalid URL") ||
            err.message?.includes("blocked") ||
            err.message?.includes("private")
            ? 400
            : 500;
        return res.status(status).json({ error: err.message || "Failed to fetch URL preview" });
    }
});
// Handler function for fetching thread messages with cursor pagination (latest 25 first)
async function handleGetThreadMessages(req, res) {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { threadId } = req.params;
        const currentUserId = req.user?.userId || "";
        if (!threadId) {
            return res.status(400).json({ error: "threadId is required" });
        }
        // Security check: verify requester is authorized for this thread
        const authCheck = await checkThreadAuthorization(threadId, tenantId, currentUserId, req.user?.roles);
        if (!authCheck.authorized) {
            return res.status(403).json({
                error: authCheck.reason || "Access denied: You are not authorized to view this conversation.",
                code: "CHAT_UNAUTHORIZED",
            });
        }
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
        const before = req.query.before;
        let cursorWhere = {};
        if (before) {
            const cursorMessage = await prisma_1.prisma.chatMessage.findUnique({
                where: { id: before },
                select: { createdAt: true, id: true },
            });
            if (cursorMessage) {
                cursorWhere = {
                    createdAt: { lt: cursorMessage.createdAt },
                };
            }
        }
        const rawMessages = await prisma_1.prisma.chatMessage.findMany({
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
        pageMessages.reverse(); // Return in chronological (asc) order
        const nextCursor = hasMore && pageMessages.length > 0 ? pageMessages[0]?.id : null;
        // Filter out messages deleted for current user ("Delete for me")
        const filteredMessages = pageMessages
            .filter((msg) => {
            const deletedFor = msg.deletedForUserIds || [];
            return !deletedFor.includes(currentUserId);
        })
            .map((msg) => {
            const rawPoll = typeof msg.poll === "string" ? JSON.parse(msg.poll) : msg.poll;
            const rawReactions = typeof msg.reactions === "string" ? JSON.parse(msg.reactions) : msg.reactions;
            const rawAttachments = typeof msg.attachments === "string" ? JSON.parse(msg.attachments) : msg.attachments;
            const rawVoiceNote = typeof msg.voiceNote === "string" ? JSON.parse(msg.voiceNote) : msg.voiceNote;
            if (msg.isDeletedForEveryone) {
                return {
                    ...msg,
                    content: "This message was deleted",
                    attachments: null,
                    voiceNote: null,
                    poll: null,
                    urlPreviews: null,
                    reactions: null,
                };
            }
            return {
                ...msg,
                poll: rawPoll,
                reactions: rawReactions,
                attachments: rawAttachments,
                voiceNote: rawVoiceNote,
            };
        });
        // Mark as read automatically when fetching thread messages
        if (currentUserId) {
            await prisma_1.prisma.chatReadReceipt.upsert({
                where: { tenantId_threadId_userId: { tenantId, threadId, userId: currentUserId } },
                create: { tenantId, threadId, userId: currentUserId, lastReadAt: new Date() },
                update: { lastReadAt: new Date() },
            }).catch(() => { });
        }
        return res.json({
            messages: filteredMessages,
            nextCursor,
            hasMore,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
// GET /api/chat/messages/:threadId - Get thread messages
exports.chatRouter.get("/messages/:threadId", auth_1.requireAuth, handleGetThreadMessages);
// GET /api/chat/conversations/:threadId/messages - Canonical alias for thread messages
exports.chatRouter.get("/conversations/:threadId/messages", auth_1.requireAuth, handleGetThreadMessages);
// GET /api/chat/messages/:threadId/pinned - Get pinned messages in thread
exports.chatRouter.get("/messages/:threadId/pinned", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { threadId } = req.params;
        const currentUserId = req.user?.userId || "";
        const authCheck = await checkThreadAuthorization(threadId, tenantId, currentUserId, req.user?.roles);
        if (!authCheck.authorized) {
            return res.status(403).json({ error: "Access denied", code: "CHAT_UNAUTHORIZED" });
        }
        const pinnedMessages = await prisma_1.prisma.chatMessage.findMany({
            where: {
                tenantId,
                threadId,
                isPinned: true,
                isDeletedForEveryone: false,
            },
            orderBy: { pinnedAt: "desc" },
        });
        return res.json(pinnedMessages);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/chat/messages/:threadId/files - Get shared files and attachments in thread
exports.chatRouter.get("/messages/:threadId/files", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { threadId } = req.params;
        const currentUserId = req.user?.userId || "";
        const typeFilter = String(req.query.type || "").toLowerCase(); // "media" | "documents" | "all"
        const search = String(req.query.search || "").toLowerCase();
        const authCheck = await checkThreadAuthorization(threadId, tenantId, currentUserId, req.user?.roles);
        if (!authCheck.authorized) {
            return res.status(403).json({ error: "Access denied", code: "CHAT_UNAUTHORIZED" });
        }
        const messages = await prisma_1.prisma.chatMessage.findMany({
            where: {
                tenantId,
                threadId,
                isDeletedForEveryone: false,
                attachments: { not: null },
            },
            orderBy: { createdAt: "desc" },
            take: 200,
        });
        const allFiles = [];
        for (const msg of messages) {
            const atts = Array.isArray(msg.attachments) ? msg.attachments : [];
            for (const attItem of atts) {
                const att = typeof attItem === "object" && attItem !== null ? attItem : {};
                const fileObj = {
                    messageId: msg.id,
                    senderId: msg.senderId,
                    senderName: msg.senderName,
                    createdAt: msg.createdAt,
                    ...att,
                };
                const fileName = String(att.name || att.fileName || "").toLowerCase();
                const mime = String(att.type || att.mimeType || "").toLowerCase();
                const isMedia = mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/");
                if (typeFilter === "media" && !isMedia)
                    continue;
                if (typeFilter === "documents" && isMedia)
                    continue;
                if (search && !fileName.includes(search))
                    continue;
                allFiles.push(fileObj);
            }
        }
        return res.json(allFiles);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/chat/messages/:threadId/search - In-conversation search
exports.chatRouter.get("/messages/:threadId/search", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { threadId } = req.params;
        const currentUserId = req.user?.userId || "";
        const q = String(req.query.query || req.query.q || "").trim().toLowerCase();
        if (!q) {
            return res.json([]);
        }
        const authCheck = await checkThreadAuthorization(threadId, tenantId, currentUserId, req.user?.roles);
        if (!authCheck.authorized) {
            return res.status(403).json({ error: "Access denied", code: "CHAT_UNAUTHORIZED" });
        }
        const messages = await prisma_1.prisma.chatMessage.findMany({
            where: {
                tenantId,
                threadId,
                isDeletedForEveryone: false,
                content: { contains: q, mode: "insensitive" },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        // Filter out messages deleted for me
        const results = messages.filter((m) => {
            const deletedFor = m.deletedForUserIds || [];
            return !deletedFor.includes(currentUserId);
        });
        return res.json(results);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/chat/messages - Send message & broadcast with security checks, idempotency, replies, voice notes, polls, url previews
exports.chatRouter.post("/messages", auth_1.requireAuth, async (req, res) => {
    const _t0 = Date.now();
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "system";
        const { threadId, content, attachments, replyToId, replyTo, voiceNote, poll, urlPreviews, clientTempId, mentions, } = req.body;
        if (!content && (!attachments || attachments.length === 0) && !voiceNote && !poll) {
            return res.status(400).json({ error: "Message content, attachment, voice note, or poll is required" });
        }
        if (!threadId || typeof threadId !== "string") {
            return res.status(400).json({ error: "threadId is required" });
        }
        // Security check: verify requester is authorized to send to this thread
        const authCheck = await checkThreadAuthorization(threadId, tenantId, currentUserId, req.user?.roles);
        if (!authCheck.authorized) {
            return res.status(403).json({
                error: authCheck.reason || "Access denied: You cannot send messages to this thread.",
                code: "CHAT_UNAUTHORIZED",
            });
        }
        // Server-side Idempotency check: fast in-memory cache then DB fallback
        if (clientTempId && typeof clientTempId === "string") {
            const tempKey = `${tenantId}:${threadId}:${clientTempId}`;
            const memoryMsg = recentClientTempIds.get(tempKey);
            if (memoryMsg) {
                return res.status(200).json(memoryMsg);
            }
        }
        // File security validation
        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            const secCheck = validateFileSecurity(attachments);
            if (!secCheck.isAllowed) {
                return res.status(403).json({
                    error: `Security Violation: Cannot upload '${secCheck.blockedFile}'. ${secCheck.reason}`,
                });
            }
            for (const att of attachments) {
                const sz = Number(att.size || att.fileSize || 0);
                if (sz > 30 * 1024 * 1024) {
                    return res.status(413).json({
                        error: `Attachment "${att.name || att.fileName || "File"}" exceeds the 30 MB limit.`,
                        code: "FILE_TOO_LARGE",
                    });
                }
            }
        }
        if (voiceNote) {
            const vSize = Number(voiceNote.size || 0);
            if (vSize > 30 * 1024 * 1024) {
                return res.status(413).json({
                    error: "Voice note exceeds the 30 MB limit.",
                    code: "FILE_TOO_LARGE",
                });
            }
        }
        // Resolve sender's display name and avatar from req.user / in-memory cache / DB fallback
        const userProfile = req.user?.profile;
        let senderName = userProfile?.fullName || req.user?.fullName;
        let senderAvatar = userProfile?.avatarUrl || req.user?.avatarUrl || null;
        if (!senderName) {
            const pKey = `${tenantId}:${currentUserId}`;
            const cached = exports.profileMemoryCache.get(pKey);
            if (cached && cached.expiresAt > Date.now()) {
                senderName = cached.fullName;
                senderAvatar = cached.avatarUrl;
            }
            else {
                const profile = await prisma_1.prisma.profile.findFirst({
                    where: { userId: currentUserId, tenantId },
                    select: { fullName: true, avatarUrl: true },
                });
                senderName = profile?.fullName || req.user?.email?.split("@")[0] || "User";
                senderAvatar = profile?.avatarUrl || null;
                exports.profileMemoryCache.set(pKey, { fullName: senderName, avatarUrl: senderAvatar, expiresAt: Date.now() + 300000 });
            }
        }
        // Automatic SSRF-safe URL preview extraction if link found in content
        let finalUrlPreviews = urlPreviews || null;
        if (!finalUrlPreviews && content) {
            const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/i;
            const urlMatch = content.match(urlRegex);
            if (urlMatch && urlMatch[0]) {
                try {
                    const preview = await url_preview_service_1.UrlPreviewService.fetchPreview(urlMatch[0]);
                    if (preview) {
                        finalUrlPreviews = [preview];
                    }
                }
                catch { }
            }
        }
        // Strict Poll Validation & Normalization
        let validatedPoll = null;
        if (poll) {
            const question = typeof poll.question === "string" ? poll.question.trim() : "";
            if (!question) {
                return res.status(400).json({ error: "Poll question is required." });
            }
            const rawOptions = Array.isArray(poll.options) ? poll.options : [];
            const cleanOptions = [];
            const seenTexts = new Set();
            for (let i = 0; i < rawOptions.length; i++) {
                const item = rawOptions[i];
                const text = typeof item === "string" ? item.trim() : (typeof item?.text === "string" ? item.text.trim() : "");
                if (!text)
                    continue;
                const lower = text.toLowerCase();
                if (seenTexts.has(lower)) {
                    return res.status(400).json({ error: `Duplicate poll option: "${text}". Each option must be distinct.` });
                }
                seenTexts.add(lower);
                cleanOptions.push({
                    id: item?.id || `opt_${i + 1}`,
                    text,
                    votes: Array.isArray(item?.votes) ? item.votes : [],
                });
            }
            if (cleanOptions.length < 2) {
                return res.status(400).json({ error: "Poll must contain at least 2 distinct non-empty options." });
            }
            if (cleanOptions.length > 10) {
                return res.status(400).json({ error: "Poll cannot exceed 10 options." });
            }
            const isMulti = Boolean(poll.allowMultiple || poll.isMultiSelect);
            validatedPoll = {
                question,
                options: cleanOptions,
                isClosed: Boolean(poll.isClosed),
                allowMultiple: isMulti,
                isMultiSelect: isMulti,
                createdAt: new Date().toISOString(),
            };
        }
        console.log(`[PERF_ROUTE] pre-create: ${Date.now() - _t0}ms`);
        const _tPre = Date.now();
        const msg = await prisma_1.prisma.chatMessage.create({
            data: {
                tenantId,
                threadId,
                senderId: currentUserId,
                senderName,
                senderAvatar,
                content: content || "",
                attachments: attachments || null,
                replyToId: replyToId || null,
                replyTo: replyTo || null,
                voiceNote: voiceNote || null,
                poll: validatedPoll,
                urlPreviews: finalUrlPreviews,
                deliveryStatus: "sent",
                clientTempId: clientTempId || null,
                mentions: mentions || null,
            },
        });
        // Register MediaUsage relations for attachments linked to Media Library records
        if (attachments && Array.isArray(attachments)) {
            for (const att of attachments) {
                const mId = att?.mediaId || (att?.id && !String(att.id).startsWith("att_") && !String(att.id).startsWith("temp_") ? att.id : null);
                if (mId) {
                    try {
                        await prisma_1.prisma.mediaUsage.upsert({
                            where: {
                                mediaId_entityType_entityId_fieldKey: {
                                    mediaId: mId,
                                    entityType: "chat_message",
                                    entityId: msg.id,
                                    fieldKey: "attachment",
                                },
                            },
                            create: {
                                mediaId: mId,
                                entityType: "chat_message",
                                entityId: msg.id,
                                fieldKey: "attachment",
                            },
                            update: {},
                        }).catch(() => { });
                    }
                    catch { }
                }
            }
        }
        // Mark as read for the sender in background (non-blocking)
        prisma_1.prisma.chatReadReceipt.upsert({
            where: { tenantId_threadId_userId: { tenantId, threadId, userId: currentUserId } },
            create: { tenantId, threadId, userId: currentUserId, lastReadAt: new Date() },
            update: { lastReadAt: new Date() },
        }).catch(() => { });
        // Realtime broadcast via Socket.io
        (0, socket_1.broadcastToTenant)(tenantId, "chat:message", {
            threadId: msg.threadId,
            message: msg,
        });
        // If direct message, trigger push notification for recipient
        if (threadId.startsWith("direct_")) {
            const parts = threadId.slice("direct_".length).split("_");
            const recipientId = parts.find((p) => p !== currentUserId);
            if (recipientId) {
                // Push In-App notification to recipient in background
                setImmediate(() => {
                    notification_service_1.NotificationService.createNotification({
                        tenantId,
                        userId: recipientId,
                        title: `New message from ${senderName}`,
                        message: content ? (content.length > 80 ? content.slice(0, 80) + "..." : content) : "Sent an attachment",
                        type: "CHAT_MESSAGE",
                        actionUrl: `/me/chat?threadId=${threadId}`,
                        metadata: { threadId, senderId: currentUserId, messageId: msg.id },
                    }).catch(() => { });
                });
            }
        }
        // If group message, process @mentions and notify active members in background
        if (threadId.startsWith("group_")) {
            const groupId = threadId.slice("group_".length);
            (async () => {
                try {
                    const members = await prisma_1.prisma.chatGroupMember.findMany({
                        where: { tenantId, groupId, userId: { not: currentUserId } },
                    });
                    // Extract mentioned user IDs
                    const mentionedUserIds = Array.isArray(mentions) ? [...mentions] : [];
                    if (content && content.includes("@")) {
                        for (const mem of members) {
                            if (!mentionedUserIds.includes(mem.userId)) {
                                const prof = await prisma_1.prisma.profile.findFirst({
                                    where: { userId: mem.userId, tenantId },
                                    select: { fullName: true },
                                });
                                if (prof?.fullName && content.toLowerCase().includes(`@${prof.fullName.toLowerCase()}`)) {
                                    mentionedUserIds.push(mem.userId);
                                }
                            }
                        }
                    }
                    for (const mem of members) {
                        if (mem.isMuted) {
                            const isMuteActive = !mem.mutedUntil || new Date(mem.mutedUntil).getTime() > Date.now();
                            if (isMuteActive && !mentionedUserIds.includes(mem.userId)) {
                                continue;
                            }
                        }
                        const isMentioned = mentionedUserIds.includes(mem.userId);
                        notification_service_1.NotificationService.createNotification({
                            tenantId,
                            userId: mem.userId,
                            title: isMentioned ? `${senderName} mentioned you in a group` : `New message in group from ${senderName}`,
                            message: content ? (content.length > 80 ? content.slice(0, 80) + "..." : content) : "Sent an attachment",
                            type: "CHAT_MESSAGE",
                            actionUrl: `/me/chat?threadId=${threadId}`,
                            metadata: { threadId, senderId: currentUserId, messageId: msg.id, isMentioned },
                        }).catch(() => { });
                    }
                }
                catch { }
            })().catch(() => { });
        }
        // Realtime broadcast via Pusher in background
        setImmediate(() => {
            pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:message", {
                threadId: msg.threadId,
                message: msg,
            }).catch(() => { });
        });
        console.log(`[PERF_ROUTE] prisma create: ${Date.now() - _tPre}ms | total handler: ${Date.now() - _t0}ms`);
        if (clientTempId && typeof clientTempId === "string") {
            recentClientTempIds.set(`${tenantId}:${threadId}:${clientTempId}`, msg);
            if (recentClientTempIds.size > 2000) {
                const oldestKey = recentClientTempIds.keys().next().value;
                if (oldestKey)
                    recentClientTempIds.delete(oldestKey);
            }
        }
        return res.status(201).json(msg);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// PATCH /api/chat/messages/:id - Edit message content
exports.chatRouter.patch("/messages/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId;
        const { id } = req.params;
        const { content } = req.body;
        if (!content || typeof content !== "string" || !content.trim()) {
            return res.status(400).json({ error: "Content is required for edit" });
        }
        const existing = await prisma_1.prisma.chatMessage.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Message not found" });
        }
        if (existing.senderId !== currentUserId) {
            return res.status(403).json({
                error: "Access denied: You can only edit your own messages.",
                code: "CHAT_EDIT_FORBIDDEN",
            });
        }
        if (existing.isDeletedForEveryone) {
            return res.status(400).json({ error: "Cannot edit a deleted message." });
        }
        const updated = await prisma_1.prisma.chatMessage.update({
            where: { id },
            data: {
                content: content.trim(),
                isEdited: true,
                editedAt: new Date(),
            },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "chat:message_edited", {
            id,
            threadId: existing.threadId,
            message: updated,
        });
        await pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:message_edited", {
            id,
            threadId: existing.threadId,
            message: updated,
        });
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/chat/messages/:id/pin - Pin or unpin message
exports.chatRouter.post("/messages/:id/pin", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { id } = req.params;
        const existing = await prisma_1.prisma.chatMessage.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Message not found" });
        }
        const authCheck = await checkThreadAuthorization(existing.threadId, tenantId, currentUserId, req.user?.roles);
        if (!authCheck.authorized) {
            return res.status(403).json({ error: "Access denied", code: "CHAT_UNAUTHORIZED" });
        }
        const nextPinned = !existing.isPinned;
        const updated = await prisma_1.prisma.chatMessage.update({
            where: { id },
            data: {
                isPinned: nextPinned,
                pinnedAt: nextPinned ? new Date() : null,
                pinnedById: nextPinned ? currentUserId : null,
            },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "chat:message_pinned", {
            id,
            threadId: existing.threadId,
            isPinned: nextPinned,
            message: updated,
        });
        await pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:message_pinned", {
            id,
            threadId: existing.threadId,
            isPinned: nextPinned,
            message: updated,
        });
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/chat/messages/:id/react - Add or toggle emoji reaction
exports.chatRouter.post("/messages/:id/react", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { id } = req.params;
        const { emoji } = req.body;
        if (!emoji || typeof emoji !== "string") {
            return res.status(400).json({ error: "emoji is required" });
        }
        const existing = await prisma_1.prisma.chatMessage.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Message not found" });
        }
        const authCheck = await checkThreadAuthorization(existing.threadId, tenantId, currentUserId, req.user?.roles);
        if (!authCheck.authorized) {
            return res.status(403).json({ error: "Access denied", code: "CHAT_UNAUTHORIZED" });
        }
        // Reaction structure: Array of { emoji: string, userIds: string[], count: number, users: Array<{ userId: string, fullName: string, avatarUrl?: string | null }> }
        let rawReactions = [];
        if (Array.isArray(existing.reactions)) {
            rawReactions = existing.reactions;
        }
        else if (existing.reactions && typeof existing.reactions === "object") {
            rawReactions = Object.entries(existing.reactions).map(([k, v]) => ({
                emoji: k,
                userIds: Array.isArray(v) ? v : (v?.userIds || []),
                count: Array.isArray(v) ? v.length : (v?.count || 0),
                users: Array.isArray(v?.users) ? v.users : [],
            }));
        }
        // Look up reacting user profile
        const profile = await prisma_1.prisma.profile.findFirst({
            where: { userId: currentUserId, tenantId },
            select: { fullName: true, avatarUrl: true },
        });
        const senderName = profile?.fullName || req.user?.email?.split("@")[0] || "User";
        const senderAvatar = profile?.avatarUrl || null;
        let reactions = rawReactions.map((r) => ({
            emoji: r.emoji,
            userIds: Array.isArray(r.userIds) ? [...r.userIds] : [],
            count: Array.isArray(r.userIds) ? r.userIds.length : (typeof r.count === "number" ? r.count : 0),
            users: Array.isArray(r.users) ? [...r.users] : [],
        }));
        const existingReaction = reactions.find((r) => r.emoji === emoji);
        if (existingReaction) {
            if (existingReaction.userIds.includes(currentUserId)) {
                // Toggle OFF: remove user reaction
                existingReaction.userIds = existingReaction.userIds.filter((u) => u !== currentUserId);
                existingReaction.users = existingReaction.users.filter((u) => u.userId !== currentUserId);
            }
            else {
                // Toggle ON: add user reaction
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
        }
        else {
            reactions.push({
                emoji,
                userIds: [currentUserId],
                count: 1,
                users: [{
                        userId: currentUserId,
                        fullName: senderName,
                        avatarUrl: senderAvatar,
                    }],
            });
        }
        // Filter out reactions with 0 userIds
        reactions = reactions.filter((r) => r.userIds.length > 0);
        const updated = await prisma_1.prisma.chatMessage.update({
            where: { id },
            data: { reactions },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "chat:reaction", {
            id,
            threadId: existing.threadId,
            reactions,
        });
        await pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:reaction", {
            id,
            threadId: existing.threadId,
            reactions,
        });
        return res.json({ success: true, reactions });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/chat/messages/:id/poll/vote - Cast a vote on a poll with atomic database transactions & row-level locking
exports.chatRouter.post("/messages/:id/poll/vote", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { id } = req.params;
        const { optionId } = req.body;
        if (optionId === undefined || optionId === null || optionId === "") {
            return res.status(400).json({ error: "optionId is required" });
        }
        // Execute vote inside a database transaction with row-level lock (FOR UPDATE)
        // to guarantee atomicity and prevent lost updates under concurrent voting
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Acquire row-level lock on the chat message
            const rows = await tx.$queryRawUnsafe('SELECT id, thread_id, tenant_id, poll FROM chat_messages WHERE id = $1 AND tenant_id = $2 FOR UPDATE', id, tenantId);
            if (!rows || rows.length === 0 || !rows[0].poll) {
                return { status: 404, error: "Poll message not found" };
            }
            const row = rows[0];
            const threadId = row.thread_id;
            // Security check: verify voter belongs to this thread
            const authCheck = await checkThreadAuthorization(threadId, tenantId, currentUserId, req.user?.roles);
            if (!authCheck.authorized) {
                return {
                    status: 403,
                    error: authCheck.reason || "Access denied: You cannot vote on polls in this thread.",
                    code: "CHAT_UNAUTHORIZED",
                };
            }
            const pollData = typeof row.poll === "string" ? JSON.parse(row.poll) : row.poll;
            if (pollData.isClosed) {
                return { status: 400, error: "This poll is closed." };
            }
            const isMultiSelect = Boolean(pollData.isMultiSelect || pollData.allowMultiple);
            const options = Array.isArray(pollData.options) ? pollData.options : [];
            const targetOpt = options.find((o, idx) => o.id === optionId || String(o.id) === String(optionId) || idx === Number(optionId));
            if (!targetOpt) {
                return { status: 404, error: "Poll option not found" };
            }
            if (!isMultiSelect) {
                // Single-choice mode: remove user from all options
                for (const opt of options) {
                    opt.votes = Array.isArray(opt.votes) ? opt.votes.filter((u) => u !== currentUserId) : [];
                }
                // Then record vote on target option
                if (!Array.isArray(targetOpt.votes)) {
                    targetOpt.votes = [];
                }
                targetOpt.votes.push(currentUserId);
            }
            else {
                // Multiple-choice mode: toggle user's vote on target option
                const currentVotes = Array.isArray(targetOpt.votes) ? targetOpt.votes : [];
                if (currentVotes.includes(currentUserId)) {
                    targetOpt.votes = currentVotes.filter((u) => u !== currentUserId);
                }
                else {
                    targetOpt.votes = [...currentVotes, currentUserId];
                }
            }
            // Deduplicate voter IDs on all options
            for (const opt of options) {
                if (Array.isArray(opt.votes)) {
                    opt.votes = Array.from(new Set(opt.votes));
                }
                else {
                    opt.votes = [];
                }
            }
            pollData.options = options;
            const allVoterIds = new Set(options.flatMap((o) => (Array.isArray(o.votes) ? o.votes : [])));
            pollData.distinctVotersCount = allVoterIds.size;
            pollData.totalVotesCount = options.reduce((sum, o) => sum + (Array.isArray(o.votes) ? o.votes.length : 0), 0);
            await tx.chatMessage.update({
                where: { id },
                data: { poll: pollData },
            });
            return { status: 200, threadId, poll: pollData };
        });
        if (result.status !== 200) {
            return res.status(result.status).json({ error: result.error, code: result.code });
        }
        (0, socket_1.broadcastToTenant)(tenantId, "chat:poll_updated", {
            id,
            threadId: result.threadId,
            poll: result.poll,
        });
        await pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:poll_updated", {
            id,
            threadId: result.threadId,
            poll: result.poll,
        });
        return res.json({ success: true, poll: result.poll });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/chat/messages/:id/poll/close - Close a poll with row-level locking
exports.chatRouter.post("/messages/:id/poll/close", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { id } = req.params;
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const rows = await tx.$queryRawUnsafe('SELECT id, thread_id, tenant_id, sender_id, poll FROM chat_messages WHERE id = $1 AND tenant_id = $2 FOR UPDATE', id, tenantId);
            if (!rows || rows.length === 0 || !rows[0].poll) {
                return { status: 404, error: "Poll message not found" };
            }
            const row = rows[0];
            const threadId = row.thread_id;
            const authCheck = await checkThreadAuthorization(threadId, tenantId, currentUserId, req.user?.roles);
            if (!authCheck.authorized) {
                return {
                    status: 403,
                    error: authCheck.reason || "Access denied: You cannot close polls in this thread.",
                    code: "CHAT_UNAUTHORIZED",
                };
            }
            const isCreator = row.sender_id === currentUserId;
            const isAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin"].includes(r));
            if (!isCreator && !isAdmin) {
                return { status: 403, error: "Only the poll creator or admin can close this poll." };
            }
            const pollObj = typeof row.poll === "string" ? JSON.parse(row.poll) : (row.poll || {});
            const opts = Array.isArray(pollObj.options) ? pollObj.options : [];
            const allVoterIds = new Set(opts.flatMap((o) => (Array.isArray(o.votes) ? o.votes : [])));
            const pollData = {
                ...pollObj,
                isClosed: true,
                distinctVotersCount: allVoterIds.size,
                totalVotesCount: opts.reduce((sum, o) => sum + (Array.isArray(o.votes) ? o.votes.length : 0), 0),
            };
            await tx.chatMessage.update({
                where: { id },
                data: { poll: pollData },
            });
            return { status: 200, threadId, poll: pollData };
        });
        if (result.status !== 200) {
            return res.status(result.status).json({ error: result.error, code: result.code });
        }
        (0, socket_1.broadcastToTenant)(tenantId, "chat:poll_updated", {
            id,
            threadId: result.threadId,
            poll: result.poll,
        });
        await pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:poll_updated", {
            id,
            threadId: result.threadId,
            poll: result.poll,
        });
        return res.json({ success: true, poll: result.poll });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/chat/messages/delivered - Acknowledge message delivery
exports.chatRouter.post("/messages/delivered", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { messageIds, threadId } = req.body;
        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.json({ success: true });
        }
        await prisma_1.prisma.chatMessage.updateMany({
            where: {
                id: { in: messageIds },
                tenantId,
                senderId: { not: currentUserId },
            },
            data: {
                deliveryStatus: "delivered",
            },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "chat:delivered", {
            messageIds,
            threadId,
            userId: currentUserId,
            deliveredAt: new Date().toISOString(),
        });
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Handler for marking thread messages as read
const handleMarkThreadRead = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { threadId } = req.params;
        const receipt = await prisma_1.prisma.chatReadReceipt.upsert({
            where: { tenantId_threadId_userId: { tenantId, threadId, userId: currentUserId } },
            create: { tenantId, threadId, userId: currentUserId, lastReadAt: new Date() },
            update: { lastReadAt: new Date() },
        });
        // Mark deliveryStatus as read in database
        await prisma_1.prisma.chatMessage.updateMany({
            where: {
                tenantId,
                threadId,
                senderId: { not: currentUserId },
            },
            data: {
                deliveryStatus: "read",
            },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "chat:read", {
            threadId,
            userId: currentUserId,
            readAt: receipt.lastReadAt,
        });
        await pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:read", {
            threadId,
            userId: currentUserId,
            readAt: receipt.lastReadAt,
        });
        return res.json({ success: true, lastReadAt: receipt.lastReadAt });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
// POST /api/chat/messages/:threadId/read - Mark thread messages as read
exports.chatRouter.post("/messages/:threadId/read", auth_1.requireAuth, handleMarkThreadRead);
exports.chatRouter.post("/conversations/:threadId/read", auth_1.requireAuth, handleMarkThreadRead);
exports.chatRouter.post("/threads/:threadId/read", auth_1.requireAuth, handleMarkThreadRead);
// DELETE /api/chat/messages/:id - Delete message ("Delete for everyone" vs "Delete for me")
exports.chatRouter.delete("/messages/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { id } = req.params;
        const forEveryone = req.query.forEveryone === "true" ||
            req.query.mode === "everyone" ||
            req.body?.forEveryone === true ||
            req.body?.mode === "everyone";
        const existing = await prisma_1.prisma.chatMessage.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Message not found" });
        }
        if (forEveryone) {
            const isSender = existing.senderId === currentUserId;
            const isAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin"].includes(r));
            if (!isSender && !isAdmin) {
                return res.status(403).json({
                    error: "Access denied: You can only delete your own messages for everyone.",
                    code: "CHAT_DELETE_FORBIDDEN",
                });
            }
            await prisma_1.prisma.chatMessage.update({
                where: { id },
                data: {
                    isDeletedForEveryone: true,
                    content: "This message was deleted",
                    attachments: null,
                    voiceNote: null,
                    poll: null,
                    urlPreviews: null,
                    reactions: null,
                },
            });
            (0, socket_1.broadcastToTenant)(tenantId, "chat:message_deleted", {
                id,
                threadId: existing.threadId,
                isDeletedForEveryone: true,
            });
            await pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:message_deleted", {
                id,
                threadId: existing.threadId,
                isDeletedForEveryone: true,
            });
            return res.json({ success: true, id, mode: "everyone", message: "Message deleted for everyone" });
        }
        else {
            // Delete for me only: append currentUserId to deletedForUserIds
            const currentList = Array.isArray(existing.deletedForUserIds)
                ? existing.deletedForUserIds
                : [];
            if (!currentList.includes(currentUserId)) {
                currentList.push(currentUserId);
            }
            await prisma_1.prisma.chatMessage.update({
                where: { id },
                data: {
                    deletedForUserIds: currentList,
                },
            });
            (0, socket_1.broadcastToUser)(currentUserId, "chat:message_deleted", {
                id,
                threadId: existing.threadId,
                isDeletedForEveryone: false,
                deletedForUserId: currentUserId,
            });
            return res.json({ success: true, id, mode: "me", message: "Message hidden for you" });
        }
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// CALL HISTORY ENDPOINTS (/api/chat/calls)
// =========================================================================
// GET /api/chat/calls - List authoritative Call History records for user & tenant
exports.chatRouter.get("/calls", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const isAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin"].includes(r)) || false;
        const { search, callType, direction, status, startDate, endDate, contactId, page = "1", limit = "50", sort = "desc", } = req.query;
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
        const skip = (pageNum - 1) * limitNum;
        const where = {
            tenantId,
            NOT: {
                hiddenByUserIds: { has: currentUserId },
            },
        };
        // Non-admin users only see calls where they were caller, receiver, or participant
        if (!isAdmin && currentUserId) {
            where.OR = [
                { callerId: currentUserId },
                { receiverId: currentUserId },
                { participantIds: { has: currentUserId } },
            ];
        }
        // Filter by specific contact
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
        // Filter by call type: audio vs video
        if (callType && callType !== "all") {
            where.callType = String(callType).toLowerCase();
        }
        // Filter by direction: incoming vs outgoing
        if (direction && direction !== "all") {
            where.direction = String(direction).toLowerCase();
        }
        // Filter by outcome / status: completed, missed, rejected, cancelled, failed
        if (status && status !== "all") {
            where.status = String(status).toLowerCase();
        }
        // Date range filtering
        if (startDate || endDate) {
            where.callTime = {};
            if (startDate) {
                where.callTime.gte = new Date(String(startDate));
            }
            if (endDate) {
                where.callTime.lte = new Date(String(endDate));
            }
        }
        // Search by contact name, email, or phone
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
            prisma_1.prisma.callHistoryRecord.count({ where }),
            prisma_1.prisma.callHistoryRecord.findMany({
                where,
                orderBy: { callTime: sort === "asc" ? "asc" : "desc" },
                skip,
                take: limitNum,
            }),
        ]);
        // Format response to include caller/receiver details and direction
        const enrichedCalls = calls.map((c) => {
            const isCaller = c.callerId === currentUserId;
            const isReceiver = c.receiverId === currentUserId;
            const computedDirection = c.direction || (isCaller ? "outgoing" : isReceiver ? "incoming" : "outgoing");
            const otherPartyName = isCaller ? (c.receiverName || "Colleague") : c.callerName;
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
    }
    catch (err) {
        console.error("Call History GET error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch call history" });
    }
});
// POST /api/chat/calls - Persist call lifecycle event (Idempotent WebRTC lifecycle recording)
exports.chatRouter.post("/calls", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { callSessionId, callerId, callerName, callerEmail, callerPhone = "Internal Call", callerAvatarUrl, receiverId, receiverName, receiverAvatarUrl, direction = "outgoing", callType = "audio", durationSeconds = 0, status = "completed", notes, groupId, participantIds = [], } = req.body;
        // Reject unverified manual entries without session identity
        if (!callSessionId) {
            return res.status(400).json({
                error: "Direct manual call logging is disabled. Call records must originate from verified call sessions.",
                code: "MANUAL_CALL_LOGGING_DISABLED",
            });
        }
        // Check for existing record by session ID for idempotency
        const existing = await prisma_1.prisma.callHistoryRecord.findFirst({
            where: { tenantId, callSessionId },
        });
        if (existing) {
            // Update existing record with final duration and outcome
            const updated = await prisma_1.prisma.callHistoryRecord.update({
                where: { id: existing.id },
                data: {
                    durationSeconds: Math.max(existing.durationSeconds, Number(durationSeconds) || 0),
                    status: status || existing.status,
                    endedAt: new Date(),
                    notes: notes || existing.notes,
                },
            });
            return res.status(200).json(updated);
        }
        const resolvedCallerId = callerId || currentUserId;
        const record = await prisma_1.prisma.callHistoryRecord.create({
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
                participantIds: Array.isArray(participantIds) ? participantIds : [],
                notes: notes || null,
            },
        });
        return res.status(201).json(record);
    }
    catch (err) {
        console.error("Call History POST error:", err);
        return res.status(500).json({ error: err.message || "Failed to record call event" });
    }
});
// DELETE /api/chat/calls/:id - User-specific hide (or admin delete)
exports.chatRouter.delete("/calls/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const isAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin"].includes(r)) || false;
        const { id } = req.params;
        const force = req.query.force === "true";
        const record = await prisma_1.prisma.callHistoryRecord.findFirst({
            where: { id, tenantId },
        });
        if (!record) {
            return res.status(404).json({ error: "Call record not found." });
        }
        if (isAdmin && force) {
            await prisma_1.prisma.callHistoryRecord.delete({ where: { id } });
            return res.json({ success: true, message: "Call record permanently deleted by administrator." });
        }
        // Hide record for current user without destroying audit data for the other party
        const existingHidden = record.hiddenByUserIds || [];
        if (!existingHidden.includes(currentUserId)) {
            await prisma_1.prisma.callHistoryRecord.update({
                where: { id },
                data: {
                    hiddenByUserIds: { push: currentUserId },
                },
            });
        }
        return res.json({ success: true, message: "Call record removed from your Call History." });
    }
    catch (err) {
        console.error("Call History DELETE error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete call record" });
    }
});
// POST /api/chat/calls/bulk-delete - Hide multiple call records for current user
exports.chatRouter.post("/calls/bulk-delete", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const currentUserId = req.user?.userId || "";
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "Array of IDs required." });
        }
        const records = await prisma_1.prisma.callHistoryRecord.findMany({
            where: { id: { in: ids }, tenantId },
            select: { id: true, hiddenByUserIds: true },
        });
        await Promise.all(records.map((r) => {
            if (!r.hiddenByUserIds.includes(currentUserId)) {
                return prisma_1.prisma.callHistoryRecord.update({
                    where: { id: r.id },
                    data: {
                        hiddenByUserIds: { push: currentUserId },
                    },
                });
            }
            return Promise.resolve();
        }));
        return res.json({ success: true, count: records.length });
    }
    catch (err) {
        console.error("Call History Bulk DELETE error:", err);
        return res.status(500).json({ error: err.message || "Failed to bulk remove call records" });
    }
});
