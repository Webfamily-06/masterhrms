import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import crypto from "crypto";
import { z } from "zod";
import { syncSubscriptionPlans } from "../services/workspace-policy.service";

export const cmsRouter = Router();

// Configuration pages share storage with public CMS content. Authorize them before
// any legacy relational bridge or generic page mutation can execute.
cmsRouter.use(async (req: AuthRequest, res, next) => {
  const match = req.path.match(/^\/pages?(?:\/([^/]+))?/);
  if (!match) return next();
  let slug: string;
  try { slug = match[1] ? decodeURIComponent(match[1]) : req.body?.slug || ""; }
  catch { return res.status(400).json({ error: "Invalid page identifier." }); }
  if (typeof slug !== "string") return res.status(400).json({ error: "Invalid page identifier." });
  const publicConfig = ["system-platform-settings", "system-monetization-plans", "system-addons-catalog"];
  const write = !["GET", "HEAD"].includes(req.method);
  const internal = slug.startsWith("system-") || slug.startsWith("tenant-") || slug.includes("catalog-");
  if (!write && (!internal || publicConfig.includes(slug)) && !req.headers.authorization) return next();
  await requireAuth(req, res, async () => {
    const superAdmin = req.user?.roles.includes("super_admin");
    if (superAdmin) {
      if (write && slug === "system-monetization-plans" && req.body?.content) {
        try {
          const plans = z.array(z.object({
            id: z.string().min(1), name: z.string().trim().min(1),
            price_monthly: z.number().finite().nonnegative(), price_annual: z.number().finite().nonnegative(),
            max_employees: z.number().int().nonnegative(), max_users: z.number().int().nonnegative().nullable().optional(),
          }).passthrough()).parse(req.body.content.plans);
          if (new Set(plans.map((plan) => plan.id)).size !== plans.length) return res.status(400).json({ error: "Plan IDs must be unique." });
          const subscriptions = await prisma.cmsPage.findMany({ where: { slug: { startsWith: "tenant-", endsWith: "-subscription" } }, select: { content: true } });
          if (subscriptions.some((s: any) => s.content?.planId && !plans.some((p) => p.id === s.content.planId))) {
            return res.status(409).json({ error: "Reassign workspace subscriptions before deleting an assigned plan." });
          }
          let relationalSubscriptions: { planId: string | null }[] = [];
          try {
            relationalSubscriptions = await prisma.tenantSubscription.findMany({
              where: { planId: { not: null } }, select: { planId: true },
            });
          } catch (error: any) {
            // During a rolling deployment the schema migration may not yet be
            // applied. Legacy assignment validation remains authoritative then.
            if (error?.code !== "P2021") throw error;
          }
          if (relationalSubscriptions.some((s) => s.planId && !plans.some((p) => p.id === s.planId))) {
            return res.status(409).json({ error: "Reassign workspace subscriptions before deleting an assigned plan." });
          }
        } catch (error: any) { return res.status(error instanceof z.ZodError ? 400 : 503).json({ error: error instanceof z.ZodError ? "Plan prices and limits must be valid nonnegative numbers." : "Unable to validate plan assignments." }); }
      }
      if (req.method === "DELETE" && slug === "system-monetization-plans") return res.status(409).json({ error: "Manage individual plans in Monetization instead of deleting the plan catalog." });
      return next();
    }
    if (!write && (!internal || publicConfig.includes(slug))) return next();
    const tenantId = req.user?.tenantId;
    const owned = tenantId && (slug.startsWith(`tenant-${tenantId}-`) || slug.endsWith(`-${tenantId}`));
    if (!owned) return res.status(403).json({ error: "Platform configuration requires Super Admin access." });
    if (write && (slug.endsWith("-subscription") || slug.endsWith("-invoices-ledger") || slug.includes("policy-audit"))) {
      return res.status(403).json({ error: "Subscription and billing records are managed by the platform." });
    }
    return next();
  });
});

// GET /api/cms/pages (list all pages)
cmsRouter.get("/pages", async (req, res) => {
  try {
    const pages = await prisma.cmsPage.findMany({
      where: (req as AuthRequest).user?.roles.includes("super_admin") ? {} : {
        published: true, NOT: [{ slug: { startsWith: "system-" } }, { slug: { startsWith: "tenant-" } }, { slug: { startsWith: "catalog-" } }],
      },
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

    // Relational bridge for catalog-items
    if (slug.includes("catalog-items")) {
      const tenantMatch = slug.match(/tenant-([^/]+)-catalog-items/) || slug.match(/system-catalog-items-([^/]+)/);
      const tenantId = tenantMatch ? tenantMatch[1] : "default";

      const products = await prisma.product.findMany({
        where: { tenantId, isActive: true },
        include: {
          category: true,
          unit: true,
          taxRate: true,
          warehouseStocks: { include: { warehouse: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      if (products.length > 0) {
        const formatted = products.map((p) => {
          const totalStock = p.warehouseStocks.reduce((sum, ws) => sum + ws.quantity, 0);
          return {
            id: p.id,
            name: p.name,
            type: p.type,
            sku: p.sku,
            barcode: p.barcode || p.sku,
            hsn_sac: p.hsnSac,
            categoryId: p.categoryId,
            categoryName: p.category ? p.category.name : "General",
            categoryColor: p.category ? p.category.color : "#3b82f6",
            category: p.category ? p.category.name : "General",
            taxRate: p.taxRate ? Number(p.taxRate.rate) : 18,
            taxName: p.taxRate ? p.taxRate.name : "GST 18%",
            gst_rate: p.taxRate ? Number(p.taxRate.rate) : 18,
            salePrice: Number(p.salePrice),
            purchasePrice: Number(p.purchasePrice),
            price: Number(p.salePrice),
            unit: p.unit ? p.unit.name : "Pcs",
            quantity: totalStock,
            stock: totalStock,
            low_stock_threshold: p.lowStockThreshold,
            warehouseStocks: p.warehouseStocks.map((ws) => ({
              warehouseId: ws.warehouseId,
              warehouseName: ws.warehouse.name,
              quantity: ws.quantity,
            })),
            image: p.image || "/images/no-image.png",
            shortDescription: p.shortDescription || "",
            description: p.description || "",
            createdAt: p.createdAt.toISOString(),
          };
        });

        return res.json({
          id: "relational-catalog",
          slug,
          title: "Catalog Items",
          content: formatted,
          published: true,
        });
      }
    }

    // Relational bridge for warehouses
    if (slug.includes("catalog-warehouses")) {
      const tenantMatch = slug.match(/catalog-warehouses-([^/]+)/);
      const tenantId = tenantMatch ? tenantMatch[1] : "default";
      const warehouses = await prisma.warehouse.findMany({ where: { tenantId } });
      if (warehouses.length > 0) {
        return res.json({
          id: "relational-warehouses",
          slug,
          title: "Warehouses",
          content: warehouses.map((w) => ({ id: w.id, name: w.name, location: w.location })),
          published: true,
        });
      }
    }

    // Relational bridge for categories
    if (slug.includes("catalog-categories")) {
      const tenantMatch = slug.match(/catalog-categories-([^/]+)/);
      const tenantId = tenantMatch ? tenantMatch[1] : "default";
      const categories = await prisma.productCategory.findMany({ where: { tenantId } });
      if (categories.length > 0) {
        return res.json({
          id: "relational-categories",
          slug,
          title: "Categories",
          content: categories.map((c) => ({ id: c.id, name: c.name, color: c.color })),
          published: true,
        });
      }
    }

    const page = await prisma.cmsPage.findUnique({
      where: { slug },
    });

    if (!page) {
      return res.status(404).json({ error: "CMS Page / config not found" });
    }

    const isSuper = (req as AuthRequest).user?.roles.includes("super_admin");
    if (!isSuper && slug === "system-monetization-plans") {
      return res.json({ ...page, content: { plans: (page.content as any)?.plans || [] } });
    }
    if (!isSuper && slug === "system-platform-settings") {
      const safeKeys = ["companyName", "siteName", "logoUrl", "faviconUrl", "defaultCurrency", "currencySymbol", "decimalPlaces", "symbolPosition", "decimalSeparator", "thousandsSeparator", "showDecimals", "addSpaceBetweenSymbol", "maintenanceMode", "allowRegistration", "supportEmail"];
      const content = Object.fromEntries(Object.entries((page.content as any) || {}).filter(([key]) => safeKeys.includes(key)));
      return res.json({ ...page, content });
    }
    if (!isSuper && !slug.startsWith("tenant-") && !slug.startsWith("system-") && !page.published) {
      return res.status(404).json({ error: "Page not found" });
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

    if (slug === "system-monetization-plans") {
      await syncSubscriptionPlans(Array.isArray((content as any)?.plans) ? (content as any).plans : []);
    }

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
