import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const notesRouter = Router();

notesRouter.use(requireAuth, resolveTenantContext);

// GET /api/notes - List notes for current tenant/user
notesRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { tag, isPinned, isStarred, isTrash, search } = req.query;

    const whereClause: any = {
      tenantId,
      userId,
    };

    if (isTrash === "all") {
      // Return all notes regardless of trash status
    } else if (isTrash !== undefined) {
      whereClause.isTrash = String(isTrash) === "true";
    } else {
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

    const notes = await prisma.workspaceNote.findMany({
      where: whereClause,
      orderBy: [
        { isPinned: "desc" },
        { updatedAt: "desc" },
      ],
    });

    res.json({ success: true, data: notes });
  } catch (error: any) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ error: error.message || "Failed to fetch notes" });
  }
});

// POST /api/notes - Create new note
notesRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { title, content, tag, priority, isPinned, isStarred, color } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Note title is required" });
    }

    const note = await prisma.workspaceNote.create({
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
  } catch (error: any) {
    console.error("Error creating note:", error);
    res.status(500).json({ error: error.message || "Failed to create note" });
  }
});

// PUT /api/notes/:id - Update note
notesRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id } = req.params;
    const { title, content, tag, priority, isPinned, isStarred, isTrash, color } = req.body;

    const existing = await prisma.workspaceNote.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Note not found" });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content ? content.trim() : "";
    if (tag !== undefined) updateData.tag = tag;
    if (priority !== undefined) updateData.priority = priority;
    if (isPinned !== undefined) updateData.isPinned = Boolean(isPinned);
    if (isStarred !== undefined) updateData.isStarred = Boolean(isStarred);
    if (isTrash !== undefined) updateData.isTrash = Boolean(isTrash);
    if (color !== undefined) updateData.color = color;

    const updated = await prisma.workspaceNote.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating note:", error);
    res.status(500).json({ error: error.message || "Failed to update note" });
  }
});

// DELETE /api/notes/:id - Permanent delete note
notesRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id } = req.params;

    const existing = await prisma.workspaceNote.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Note not found" });
    }

    await prisma.workspaceNote.delete({
      where: { id },
    });

    res.json({ success: true, message: "Note permanently deleted" });
  } catch (error: any) {
    console.error("Error deleting note:", error);
    res.status(500).json({ error: error.message || "Failed to delete note" });
  }
});
