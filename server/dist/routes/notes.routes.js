"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notesRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const idempotency_middleware_1 = require("../middleware/idempotency.middleware");
exports.notesRouter = (0, express_1.Router)();
exports.notesRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/notes - List notes for current tenant/user
exports.notesRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { tag, isPinned, isStarred, isTrash, search } = req.query;
        const whereClause = {
            tenantId,
            userId,
        };
        if (isTrash === "all") {
            // Return all notes regardless of trash status
        }
        else if (isTrash !== undefined) {
            whereClause.isTrash = String(isTrash) === "true";
        }
        else {
            // By default, exclude trash unless explicitly asked
            whereClause.isTrash = false;
        }
        if (tag && tag !== "all") {
            whereClause.tag = String(tag);
        }
        if (isPinned !== undefined) {
            whereClause.isPinned = String(isPinned) === "true";
        }
        if (isStarred !== undefined) {
            whereClause.isStarred = String(isStarred) === "true";
        }
        if (search) {
            whereClause.OR = [
                { title: { contains: String(search) } },
                { content: { contains: String(search) } },
            ];
        }
        const notes = await prisma_1.prisma.workspaceNote.findMany({
            where: whereClause,
            orderBy: [
                { isPinned: "desc" },
                { updatedAt: "desc" },
            ],
        });
        res.json({ success: true, data: notes });
    }
    catch (error) {
        console.error("Error fetching notes:", error);
        res.status(500).json({ error: error.message || "Failed to fetch notes" });
    }
});
// POST /api/notes - Create new note
exports.notesRouter.post("/", idempotency_middleware_1.enforceIdempotency, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { title, content, tag, priority, isPinned, isStarred, color } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: "Note title is required" });
        }
        const note = await prisma_1.prisma.workspaceNote.create({
            data: {
                tenantId,
                userId,
                title: title.trim(),
                content: content ? content.trim() : "",
                tag: tag || "general",
                priority: priority || "medium",
                isPinned: Boolean(isPinned),
                isStarred: Boolean(isStarred),
                isTrash: false,
                color: color || "default",
            },
        });
        res.status(201).json({ success: true, data: note });
    }
    catch (error) {
        console.error("Error creating note:", error);
        res.status(500).json({ error: error.message || "Failed to create note" });
    }
});
// PUT /api/notes/:id - Update note
exports.notesRouter.put("/:id", idempotency_middleware_1.enforceIdempotency, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { title, content, tag, priority, isPinned, isStarred, isTrash, color } = req.body;
        const existing = await prisma_1.prisma.workspaceNote.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Note not found" });
        }
        const updateData = {};
        if (title !== undefined)
            updateData.title = title.trim();
        if (content !== undefined)
            updateData.content = content ? content.trim() : "";
        if (tag !== undefined)
            updateData.tag = tag;
        if (priority !== undefined)
            updateData.priority = priority;
        if (isPinned !== undefined)
            updateData.isPinned = Boolean(isPinned);
        if (isStarred !== undefined)
            updateData.isStarred = Boolean(isStarred);
        if (isTrash !== undefined)
            updateData.isTrash = Boolean(isTrash);
        if (color !== undefined)
            updateData.color = color;
        const updated = await prisma_1.prisma.workspaceNote.update({
            where: { id },
            data: updateData,
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error("Error updating note:", error);
        res.status(500).json({ error: error.message || "Failed to update note" });
    }
});
// DELETE /api/notes/:id - Permanent delete note
exports.notesRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const existing = await prisma_1.prisma.workspaceNote.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Note not found" });
        }
        await prisma_1.prisma.workspaceNote.delete({
            where: { id },
        });
        res.json({ success: true, message: "Note permanently deleted" });
    }
    catch (error) {
        console.error("Error deleting note:", error);
        res.status(500).json({ error: error.message || "Failed to delete note" });
    }
});
