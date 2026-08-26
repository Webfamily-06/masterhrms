import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import crypto from "crypto";

export const cmsRouter = Router();

// GET /api/cms/pages (list all pages)
cmsRouter.get("/pages", async (req, res) => {
  try {
    const pages = await prisma.cmsPage.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        metaDescription: true,
        published: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    return res.json(pages);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/cms/pages/:slug or /api/cms/page/:slug
cmsRouter.get(["/pages/:slug", "/page/:slug"], async (req, res) => {
  try {
    const { slug } = req.params;
    const page = await prisma.cmsPage.findUnique({
      where: { slug },
    });

    if (!page) {
      return res.status(404).json({ error: "CMS Page / config not found" });
    }

    return res.json(page);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/cms/pages (create new page)
cmsRouter.post(["/pages", "/page"], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { slug, title, content, metaDescription, published } = req.body;
    if (!slug) {
      return res.status(400).json({ error: "Slug is required" });
    }

    const existing = await prisma.cmsPage.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: "A page with this slug already exists" });
    }

    const page = await prisma.cmsPage.create({
      data: {
        id: crypto.randomUUID(),
        slug,
        title: title || slug,
        content: content ?? {},
        metaDescription,
        published: published ?? true,
        updatedBy: req.user?.userId,
      },
    });

    return res.status(201).json(page);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// PUT /api/cms/pages/:slug (upsert)
cmsRouter.put(["/pages/:slug", "/page/:slug"], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const { title, content, metaDescription, published } = req.body;

    const page = await prisma.cmsPage.upsert({
      where: { slug },
      update: {
        title: title || slug,
        content: content ?? {},
        metaDescription,
        published: published ?? true,
        updatedBy: req.user?.userId,
      },
      create: {
        id: crypto.randomUUID(),
        slug,
        title: title || slug,
        content: content ?? {},
        metaDescription,
        published: published ?? true,
        updatedBy: req.user?.userId,
      },
    });

    return res.json(page);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/cms/pages/:slug/publish (toggle publish)
cmsRouter.post("/pages/:slug/publish", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const { published } = req.body;

    const page = await prisma.cmsPage.update({
      where: { slug },
      data: {
        published: published !== undefined ? published : true,
        updatedBy: req.user?.userId,
      },
    });

    return res.json(page);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// DELETE /api/cms/pages/:slug (delete page)
cmsRouter.delete("/pages/:slug", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    await prisma.cmsPage.delete({
      where: { slug },
    });
    return res.json({ success: true, message: `Page '${slug}' deleted successfully` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/cms/addons
cmsRouter.get("/addons", async (req, res) => {
  try {
    const addons = await prisma.addon.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.json(addons);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

