"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatExtensionsRouter = void 0;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const auth_js_1 = require("../middleware/auth.js");
const tenant_context_middleware_js_1 = require("../middleware/tenant-context.middleware.js");
const prisma_js_1 = require("../prisma.js");
const socket_js_1 = require("../socket.js");
exports.chatExtensionsRouter = (0, express_1.Router)();
exports.chatExtensionsRouter.use(auth_js_1.requireAuth, tenant_context_middleware_js_1.resolveTenantContext);
function randomMeetingCode() {
    const bytes = crypto_1.default.randomBytes(4).toString("hex");
    return `${bytes.slice(0, 3)}-${bytes.slice(3, 6)}-${bytes.slice(6, 8)}`;
}
// =========================================================================
// 1. PER-FILE ATTACHMENT DELETE ("Delete for me" / "Delete for everyone")
// =========================================================================
exports.chatExtensionsRouter.delete("/messages/:id/attachments/:index", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const idx = parseInt(req.params.index, 10);
        const scope = String(req.query.scope || req.body?.scope || "me").toLowerCase();
        if (Number.isNaN(idx) || idx < 0) {
            return res.status(400).json({ error: "Invalid attachment index." });
        }
        const msg = await prisma_js_1.prisma.chatMessage.findFirst({
            where: { id: req.params.id, tenantId },
        });
        if (!msg)
            return res.status(404).json({ error: "Message not found." });
        const currentAttachments = Array.isArray(msg.attachments) ? [...msg.attachments] : [];
        if (idx >= currentAttachments.length) {
            return res.status(404).json({ error: "Attachment index out of range." });
        }
        if (scope === "everyone") {
            const isSender = msg.senderId === userId;
            const roles = (req.user?.roles || []).map((r) => String(r).toLowerCase());
            const isAdmin = roles.some((r) => ["admin", "tenant_admin", "hr_admin", "super_admin", "owner"].includes(r));
            if (!isSender && !isAdmin) {
                return res.status(403).json({
                    error: "Only the sender or an admin can delete an attachment for everyone.",
                });
            }
            const nextAttachments = currentAttachments.filter((_, i) => i !== idx);
            const hasText = Boolean(String(msg.content || "").trim());
            // If no attachments left and no text, mark whole message deleted for everyone
            if (nextAttachments.length === 0 && !hasText) {
                const updated = await prisma_js_1.prisma.chatMessage.update({
                    where: { id: msg.id },
                    data: {
                        attachments: [],
                        isDeletedForEveryone: true,
                        content: "This message was deleted",
                    },
                });
                (0, socket_js_1.getIO)()?.to(`tenant:${tenantId}`).emit("chat:message:deleted", {
                    messageId: msg.id,
                    threadId: msg.threadId,
                    scope: "everyone",
                });
                return res.json({ success: true, scope: "everyone", messageDeleted: true, message: updated });
            }
            const updated = await prisma_js_1.prisma.chatMessage.update({
                where: { id: msg.id },
                data: { attachments: nextAttachments },
            });
            (0, socket_js_1.getIO)()?.to(`tenant:${tenantId}`).emit("chat:message:updated", {
                messageId: msg.id,
                threadId: msg.threadId,
                attachments: nextAttachments,
            });
            return res.json({ success: true, scope: "everyone", attachments: nextAttachments, message: updated });
        }
        // Scope = "me": hide only this attachment index for this user
        const existingMap = msg.deletedAttachmentsByUser && typeof msg.deletedAttachmentsByUser === "object"
            ? { ...msg.deletedAttachmentsByUser }
            : {};
        const userList = Array.isArray(existingMap[userId]) ? [...existingMap[userId]] : [];
        if (!userList.includes(idx))
            userList.push(idx);
        existingMap[userId] = userList;
        const updated = await prisma_js_1.prisma.chatMessage.update({
            where: { id: msg.id },
            data: { deletedAttachmentsByUser: existingMap },
        });
        return res.json({
            success: true,
            scope: "me",
            deletedAttachmentIndexes: userList,
            message: updated,
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// =========================================================================
// 2. STARRED / BOOKMARKED MESSAGES
// =========================================================================
exports.chatExtensionsRouter.get("/messages/starred", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const all = await prisma_js_1.prisma.chatMessage.findMany({
            where: {
                tenantId,
                isDeletedForEveryone: false,
            },
            orderBy: { createdAt: "desc" },
            take: 400,
        });
        const starred = all.filter((m) => {
            const list = Array.isArray(m.isStarredBy) ? m.isStarredBy : [];
            return list.includes(userId);
        });
        return res.json(starred);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.chatExtensionsRouter.post("/messages/:id/star", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const msg = await prisma_js_1.prisma.chatMessage.findFirst({
            where: { id: req.params.id, tenantId },
        });
        if (!msg)
            return res.status(404).json({ error: "Message not found." });
        const list = Array.isArray(msg.isStarredBy) ? [...msg.isStarredBy] : [];
        const exists = list.includes(userId);
        const nextList = exists ? list.filter((id) => id !== userId) : [...list, userId];
        const updated = await prisma_js_1.prisma.chatMessage.update({
            where: { id: msg.id },
            data: { isStarredBy: nextList },
        });
        return res.json({ id: updated.id, starred: !exists, isStarredBy: nextList });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// =========================================================================
// 3. SCHEDULED MESSAGES
// =========================================================================
exports.chatExtensionsRouter.get("/messages/scheduled", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const now = new Date();
        const scheduled = await prisma_js_1.prisma.chatMessage.findMany({
            where: {
                tenantId,
                senderId: userId,
                scheduledFor: { gt: now },
                isDeletedForEveryone: false,
            },
            orderBy: { scheduledFor: "asc" },
        });
        return res.json(scheduled);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.chatExtensionsRouter.post("/messages/schedule", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const { threadId, content, scheduledFor, attachments } = req.body || {};
        if (!threadId || !content?.trim() || !scheduledFor) {
            return res.status(400).json({ error: "threadId, content, and scheduledFor are required." });
        }
        const schedDate = new Date(scheduledFor);
        if (Number.isNaN(schedDate.getTime()) || schedDate <= new Date()) {
            return res.status(400).json({ error: "scheduledFor must be a valid future date/time." });
        }
        const me = await prisma_js_1.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, profile: { select: { fullName: true, avatarUrl: true } } },
        });
        const created = await prisma_js_1.prisma.chatMessage.create({
            data: {
                tenantId,
                threadId: String(threadId),
                senderId: userId,
                senderName: me?.profile?.fullName || req.user?.email?.split("@")[0] || "User",
                senderAvatar: me?.profile?.avatarUrl || null,
                content: String(content).trim(),
                attachments: Array.isArray(attachments) ? attachments : undefined,
                scheduledFor: schedDate,
                deliveryStatus: "scheduled",
            },
        });
        return res.status(201).json(created);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.chatExtensionsRouter.delete("/messages/scheduled/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const existing = await prisma_js_1.prisma.chatMessage.findFirst({
            where: { id: req.params.id, tenantId, senderId: userId },
        });
        if (!existing)
            return res.status(404).json({ error: "Scheduled message not found." });
        await prisma_js_1.prisma.chatMessage.delete({ where: { id: existing.id } });
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// =========================================================================
// 4. DISAPPEARING MESSAGES (AUTO-EXPIRE TIMER PER CONVERSATION)
// =========================================================================
exports.chatExtensionsRouter.patch("/conversations/:threadId/disappearing", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const threadId = req.params.threadId;
        const ttlSeconds = Math.max(0, Number(req.body?.ttlSeconds || 0));
        const pref = await prisma_js_1.prisma.chatConversationPreference.upsert({
            where: { tenantId_userId_threadId: { tenantId, userId, threadId } },
            create: {
                tenantId,
                userId,
                threadId,
                disappearingTtlSeconds: ttlSeconds,
            },
            update: {
                disappearingTtlSeconds: ttlSeconds,
            },
        });
        return res.json({ threadId, disappearingTtlSeconds: pref.disappearingTtlSeconds });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// =========================================================================
// 5. THREADED REPLIES (SLACK-STYLE SIDE THREADS)
// =========================================================================
exports.chatExtensionsRouter.get("/messages/:id/thread", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const root = await prisma_js_1.prisma.chatMessage.findFirst({
            where: { id: req.params.id, tenantId },
        });
        if (!root)
            return res.status(404).json({ error: "Root message not found." });
        const replies = await prisma_js_1.prisma.chatMessage.findMany({
            where: {
                tenantId,
                OR: [{ threadRootId: root.id }, { replyToId: root.id }],
                isDeletedForEveryone: false,
            },
            orderBy: { createdAt: "asc" },
        });
        return res.json({ root, replies });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.chatExtensionsRouter.post("/messages/:id/thread", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const { content } = req.body || {};
        if (!content || !String(content).trim()) {
            return res.status(400).json({ error: "Reply content is required." });
        }
        const root = await prisma_js_1.prisma.chatMessage.findFirst({
            where: { id: req.params.id, tenantId },
        });
        if (!root)
            return res.status(404).json({ error: "Root message not found." });
        const me = await prisma_js_1.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, profile: { select: { fullName: true, avatarUrl: true } } },
        });
        const created = await prisma_js_1.prisma.chatMessage.create({
            data: {
                tenantId,
                threadId: root.threadId,
                threadRootId: root.id,
                replyToId: root.id,
                replyTo: {
                    id: root.id,
                    senderName: root.senderName,
                    content: root.content.slice(0, 140),
                },
                senderId: userId,
                senderName: me?.profile?.fullName || req.user?.email?.split("@")[0] || "User",
                senderAvatar: me?.profile?.avatarUrl || null,
                content: String(content).trim(),
            },
        });
        (0, socket_js_1.getIO)()?.to(`tenant:${tenantId}`).emit("chat:thread:reply", {
            rootId: root.id,
            threadId: root.threadId,
            reply: created,
        });
        return res.status(201).json(created);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// =========================================================================
// 6. VOICE NOTE TRANSCRIPTION PERSISTENCE
// =========================================================================
exports.chatExtensionsRouter.post("/messages/:id/transcribe", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const msg = await prisma_js_1.prisma.chatMessage.findFirst({
            where: { id: req.params.id, tenantId },
        });
        if (!msg)
            return res.status(404).json({ error: "Message not found." });
        const transcript = String(req.body?.transcript || "").trim();
        const existingVoice = msg.voiceNote && typeof msg.voiceNote === "object"
            ? { ...msg.voiceNote }
            : {};
        existingVoice.transcript = transcript;
        existingVoice.transcribedAt = new Date().toISOString();
        const updated = await prisma_js_1.prisma.chatMessage.update({
            where: { id: msg.id },
            data: { voiceNote: existingVoice },
        });
        return res.json({ id: updated.id, voiceNote: existingVoice });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// =========================================================================
// 7. WEB PUSH / FCM / APNS OFFLINE SUBSCRIPTIONS
// =========================================================================
exports.chatExtensionsRouter.get("/push/status", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            return res.json({ enabled: false, configured: false, count: 0, subscriptions: [] });
        }
        const configured = Boolean(process.env.VAPID_PUBLIC_KEY ||
            process.env.FIREBASE_SERVER_KEY ||
            process.env.FIREBASE_PROJECT_ID);
        const subs = await prisma_js_1.prisma.chatPushSubscription.findMany({
            where: { tenantId, userId, isActive: true },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ enabled: subs.length > 0, configured, count: subs.length, subscriptions: subs });
    }
    catch (err) {
        console.warn("[chat/push/status] Returning disabled status fallback:", err?.message || err);
        return res.json({ enabled: false, configured: false, count: 0, subscriptions: [] });
    }
});
exports.chatExtensionsRouter.post("/push/subscribe", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const { platform, endpoint, p256dh, auth, deviceToken } = req.body || {};
        const created = await prisma_js_1.prisma.chatPushSubscription.create({
            data: {
                tenantId,
                userId,
                platform: String(platform || "web").toLowerCase(),
                endpoint: endpoint ? String(endpoint) : null,
                p256dh: p256dh ? String(p256dh) : null,
                auth: auth ? String(auth) : null,
                deviceToken: deviceToken ? String(deviceToken) : null,
                isActive: true,
            },
        });
        return res.status(201).json(created);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.chatExtensionsRouter.delete("/push/unsubscribe", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        await prisma_js_1.prisma.chatPushSubscription.updateMany({
            where: { tenantId, userId, isActive: true },
            data: { isActive: false },
        });
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// =========================================================================
// 8. CHAT EXPORT / COMPLIANCE ARCHIVAL (CSV & JSON)
// =========================================================================
exports.chatExtensionsRouter.get("/conversations/:threadId/export", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const threadId = req.params.threadId;
        const format = String(req.query.format || "csv").toLowerCase();
        const messages = await prisma_js_1.prisma.chatMessage.findMany({
            where: { tenantId, threadId },
            orderBy: { createdAt: "asc" },
        });
        if (format === "json") {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Content-Disposition", `attachment; filename="chat-export-${threadId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json"`);
            return res.json({
                exportedAt: new Date().toISOString(),
                tenantId,
                threadId,
                totalMessages: messages.length,
                messages,
            });
        }
        const escapeCsv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const header = ["Timestamp", "Sender", "Content", "Attachments", "Deleted"].join(",");
        const rows = messages.map((m) => {
            const attNames = Array.isArray(m.attachments)
                ? m.attachments.map((a) => a.name || a.fileName || "file").join("; ")
                : "";
            return [
                escapeCsv(new Date(m.createdAt).toISOString()),
                escapeCsv(m.senderName),
                escapeCsv(m.content),
                escapeCsv(attNames),
                escapeCsv(m.isDeletedForEveryone ? "Yes" : "No"),
            ].join(",");
        });
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="chat-export-${threadId.replace(/[^a-zA-Z0-9_-]/g, "_")}.csv"`);
        return res.send([header, ...rows].join("\n"));
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 9. UPCOMING MEETINGS SYNC FOR CHAT (HR MEETINGS + RANDOM MEETING LINKS)
// =========================================================================
exports.chatExtensionsRouter.get("/upcoming-meetings", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const emp = await prisma_js_1.prisma.employee.findFirst({
            where: { tenantId, userId },
            select: { id: true },
        });
        const now = new Date();
        const meetings = await prisma_js_1.prisma.meeting.findMany({
            where: {
                tenantId,
                status: { in: ["scheduled", "in_progress"] },
                endTime: { gte: now },
                ...(emp
                    ? {
                        OR: [
                            { organizerId: emp.id },
                            { attendees: { some: { employeeId: emp.id } } },
                        ],
                    }
                    : {}),
            },
            include: {
                room: { select: { id: true, name: true, bookingUrl: true } },
                type: { select: { id: true, name: true } },
                organizer: { select: { id: true, firstName: true, lastName: true } },
                attendees: {
                    include: {
                        employee: { select: { id: true, firstName: true, lastName: true } },
                    },
                },
            },
            orderBy: { startTime: "asc" },
            take: 10,
        });
        const formatted = meetings.map((m) => ({
            id: m.id,
            title: m.title,
            startTime: m.startTime,
            endTime: m.endTime,
            status: m.status,
            meetingUrl: m.meetingUrl || m.room?.bookingUrl || `/hr/chat/calls?meeting=${m.id}`,
            roomName: m.room?.name || "Online",
            typeName: m.type?.name || "Meeting",
            organizerName: m.organizer
                ? `${m.organizer.firstName} ${m.organizer.lastName}`.trim()
                : "Organizer",
            attendeesCount: m.attendees.length,
        }));
        return res.json(formatted);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Quick Schedule Meeting directly from Chat / Call Logs (auto-generates random link + syncs to HR Meetings)
exports.chatExtensionsRouter.post("/schedule-meeting", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const { title, meetingDate, startTime, endTime, attendeeEmployeeIds, agenda } = req.body || {};
        if (!title || !String(title).trim()) {
            return res.status(400).json({ error: "Meeting title is required." });
        }
        let organizer = await prisma_js_1.prisma.employee.findFirst({
            where: { tenantId, userId },
            select: { id: true },
        });
        if (!organizer) {
            organizer = await prisma_js_1.prisma.employee.findFirst({
                where: { tenantId },
                select: { id: true },
            });
        }
        if (!organizer) {
            return res.status(400).json({ error: "No employee record found to set as organizer." });
        }
        const baseDate = meetingDate || new Date().toISOString().split("T")[0];
        const startDt = new Date(`${baseDate}T${startTime || "10:00"}:00`);
        const endDt = new Date(`${baseDate}T${endTime || "10:30"}:00`);
        const code = randomMeetingCode();
        const meetingUrl = `/hr/chat/calls?meeting=${code}`;
        const created = await prisma_js_1.prisma.meeting.create({
            data: {
                tenantId,
                title: String(title).trim(),
                organizerId: organizer.id,
                startTime: startDt,
                endTime: endDt > startDt ? endDt : new Date(startDt.getTime() + 30 * 60 * 1000),
                meetingUrl,
                agenda: agenda ? String(agenda).trim() : null,
                status: "scheduled",
            },
        });
        const empIds = Array.isArray(attendeeEmployeeIds) ? attendeeEmployeeIds.map(String) : [];
        for (const empId of empIds) {
            await prisma_js_1.prisma.meetingAttendee
                .create({
                data: {
                    meetingId: created.id,
                    employeeId: empId,
                    rsvpStatus: "pending",
                    attendanceStatus: "not_attended",
                },
            })
                .catch(() => { });
        }
        // Notify tenant users in real time so their Chat Upcoming Meetings banner syncs immediately
        (0, socket_js_1.getIO)()?.to(`tenant:${tenantId}`).emit("meeting:upcoming:sync", {
            meetingId: created.id,
            title: created.title,
            startTime: created.startTime,
            meetingUrl,
        });
        return res.status(201).json({ ...created, meetingUrl });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
