import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import crypto from "crypto";
import { z } from "zod";
import { syncSubscriptionPlans } from "../services/workspace-policy.service";
import { SettingsService } from "../services/settings/settings.service";

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
          const totalStock = p.warehouseStocks.reduce((sum, ws) => sum + Number(ws.quantity), 0);
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

    if (slug === "system-addons-catalog") {
      const activeAddons = await prisma.addon.findMany({
        where: { status: "active" },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      });
      const formatted = activeAddons.map((a) => {
        const price = a.priceMonthly != null ? Number(a.priceMonthly) : 0;
        return {
          ...a,
          priceMonthly: price,
          price_monthly: price,
          longDescription: a.longDescription ?? null,
          long_description: a.longDescription ?? null,
          installUrl: a.installUrl ?? null,
          install_url: a.installUrl ?? null,
          docsUrl: a.docsUrl ?? null,
          docs_url: a.docsUrl ?? null,
          features: Array.isArray(a.features) ? a.features : [],
          screenshots: Array.isArray(a.screenshots) ? a.screenshots : [],
        };
      });
      return res.json({
        id: "system-addons-catalog",
        slug: "system-addons-catalog",
        title: "System Addons Catalog",
        content: formatted,
        published: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    let page = await prisma.cmsPage.findUnique({
      where: { slug },
    });

    if (!page && slug === "system-platform-settings") {
      page = {
        id: "system-platform-settings",
        slug: "system-platform-settings",
        title: "Global Platform Settings",
        metaDescription: null,
        content: {},
        published: true,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    }

    if (!page) {
      return res.status(404).json({ error: "CMS Page / config not found" });
    }

    const isSuper = (req as AuthRequest).user?.roles.includes("super_admin");
    if (!isSuper && slug === "system-monetization-plans") {
      return res.json({ ...page, content: { plans: (page.content as any)?.plans || [] } });
    }
    if (slug === "system-platform-settings") {
      try {
        const brandingRes = await SettingsService.getGroup("branding", "PLATFORM");
        const bVals = brandingRes?.values || {};
        const mUrls = brandingRes?.mediaUrls || {};
        const content = {
          ...((page.content as any) || {}),
          ...(bVals["branding.app_name"] ? { appName: bVals["branding.app_name"] } : {}),
          ...(bVals["branding.support_email"] ? { supportEmail: bVals["branding.support_email"] } : {}),
          ...(bVals["branding.primary_color"] ? { primaryThemeColor: bVals["branding.primary_color"] } : {}),
          ...(bVals["branding.footer_text"] ? { footerText: bVals["branding.footer_text"] } : {}),
          ...(bVals["branding.logo_light_id"] ? { logoLightId: bVals["branding.logo_light_id"] } : {}),
          ...(bVals["branding.logo_dark_id"] ? { logoDarkId: bVals["branding.logo_dark_id"] } : {}),
          ...(bVals["branding.favicon_id"] ? { faviconId: bVals["branding.favicon_id"] } : {}),
          ...(mUrls["branding.logo_light_id"] ? { logoLightUrl: mUrls["branding.logo_light_id"] } : {}),
          ...(mUrls["branding.logo_dark_id"] ? { logoDarkUrl: mUrls["branding.logo_dark_id"] } : {}),
          ...(mUrls["branding.favicon_id"] ? { faviconUrl: mUrls["branding.favicon_id"] } : {}),
        };
        page.content = content;
      } catch (brandingErr) {
        console.error("Failed to overlay authoritative branding onto system-platform-settings:", brandingErr);
      }

      if (!isSuper) {
        const safeKeys = [
          "companyName",
          "siteName",
          "appName",
          "logoUrl",
          "logoLightUrl",
          "logoDarkUrl",
          "faviconUrl",
          "defaultCurrency",
          "currencySymbol",
          "decimalPlaces",
          "symbolPosition",
          "decimalSeparator",
          "thousandsSeparator",
          "showDecimals",
          "addSpaceBetweenSymbol",
          "defaultTimezone",
          "primaryThemeColor",
          "maintenanceMode",
          "maintenanceScheduled",
          "maintenanceNoticeMessage",
          "maintenanceStartTime",
          "maintenanceEndTime",
          "allowRegistration",
          "supportEmail",
          "footerText",
        ];
        const content = Object.fromEntries(Object.entries((page.content as any) || {}).filter(([key]) => safeKeys.includes(key)));
        return res.json({ ...page, content });
      }
      return res.json(page);
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

    if (slug === "system-platform-settings" && content && typeof content === "object") {
      try {
        const toSet: Record<string, any> = {};
        if (content.appName) toSet["branding.app_name"] = content.appName;
        if (content.supportEmail) toSet["branding.support_email"] = content.supportEmail;
        if (content.primaryThemeColor || content.primaryColor) {
          toSet["branding.primary_color"] = content.primaryThemeColor || content.primaryColor;
        }
        if (content.footerText) toSet["branding.footer_text"] = content.footerText;
        if (content.logoLightId !== undefined) toSet["branding.logo_light_id"] = content.logoLightId;
        if (content.logoDarkId !== undefined) toSet["branding.logo_dark_id"] = content.logoDarkId;
        if (content.faviconId !== undefined) toSet["branding.favicon_id"] = content.faviconId;

        if (Object.keys(toSet).length > 0) {
          await SettingsService.setMany(toSet, "PLATFORM", null, req.user?.userId || null);
        }
      } catch (syncErr) {
        console.error("Failed to sync system-platform-settings to SettingsService:", syncErr);
      }
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

// GET /api/cms/addons/categories
cmsRouter.get("/addons/categories", async (_req, res) => {
  try {
    const distinct = await prisma.addon.findMany({
      where: { status: "active" },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    const categories = distinct.map((d) => d.category).filter(Boolean);
    return res.json(categories);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch addon categories" });
  }
});

// GET /api/cms/addons
cmsRouter.get("/addons", async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = { status: "active" };
    if (category && category !== "All") {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tagline: { contains: search, mode: "insensitive" } },
      ];
    }

    const addons = await prisma.addon.findMany({
      where,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });

    const formatted = addons.map((a) => {
      const price = a.priceMonthly != null ? Number(a.priceMonthly) : 0;
      return {
        ...a,
        priceMonthly: price,
        price_monthly: price,
        longDescription: a.longDescription ?? null,
        long_description: a.longDescription ?? null,
        installUrl: a.installUrl ?? null,
        install_url: a.installUrl ?? null,
        docsUrl: a.docsUrl ?? null,
        docs_url: a.docsUrl ?? null,
        features: Array.isArray(a.features) ? a.features : [],
        screenshots: Array.isArray(a.screenshots) ? a.screenshots : [],
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/cms/addons/:slug
cmsRouter.get("/addons/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const addon = await prisma.addon.findFirst({
      where: { slug, status: "active" },
    });
    if (!addon) {
      return res.status(404).json({ error: "Addon not found", code: "NOT_FOUND" });
    }

    const price = addon.priceMonthly != null ? Number(addon.priceMonthly) : 0;
    const formatted = {
      ...addon,
      priceMonthly: price,
      price_monthly: price,
      longDescription: addon.longDescription ?? null,
      long_description: addon.longDescription ?? null,
      installUrl: addon.installUrl ?? null,
      install_url: addon.installUrl ?? null,
      docsUrl: addon.docsUrl ?? null,
      docs_url: addon.docsUrl ?? null,
      features: Array.isArray(addon.features) ? addon.features : [],
      screenshots: Array.isArray(addon.screenshots) ? addon.screenshots : [],
    };

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch addon" });
  }
});

// GET /api/cms/addons/:slug/releases (Public Addon Changelog & Version History)
cmsRouter.get("/addons/:slug/releases", async (req, res) => {
  try {
    const { slug } = req.params;
    const addon = await prisma.addon.findFirst({
      where: { slug, status: "active" },
    });
    if (!addon) {
      return res.status(404).json({ error: "Addon not found", code: "NOT_FOUND" });
    }

    const page = await prisma.cmsPage.findUnique({
      where: { slug: `system-addon-releases-${addon.slug}` },
    });

    let releases: any[] = [];
    if (page?.content && Array.isArray((page.content as any).releases)) {
      // Filter only public releases, strip internal actorEmail and metadataDiff
      releases = ((page.content as any).releases as any[])
        .filter((r) => r.isPublic !== false)
        .map((r) => ({
          id: r.id,
          version: r.version,
          previousVersion: r.previousVersion || null,
          changeSummary: r.changeSummary,
          releaseNotes: r.releaseNotes || null,
          createdAt: r.createdAt,
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return res.json({
      addonSlug: addon.slug,
      addonName: addon.name,
      currentVersion: addon.version || "1.0.0",
      totalReleases: releases.length,
      releases,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch addon releases" });
  }
});

// ==========================================
// P10: FAQ MANAGEMENT
// ==========================================
const DEFAULT_FAQS = [
  {
    id: "faq-1",
    question: "How do I upgrade or change my plan?",
    answer: "You can upgrade or downgrade your subscription at any time from your billing settings. Plan adjustments take effect immediately.",
    category: "Billing & Plans",
    order: 1,
    isActive: true,
  },
  {
    id: "faq-2",
    question: "Is there a free trial available?",
    answer: "Yes, we offer a 14-day free trial on all plans with full access to all HRMS, payroll, and recruitment features.",
    category: "General",
    order: 2,
    isActive: true,
  },
  {
    id: "faq-3",
    question: "Can I export payroll and attendance data?",
    answer: "Yes, you can export complete payroll runs, attendance registers, and compliance reports to CSV, Excel, and PDF formats.",
    category: "Features",
    order: 3,
    isActive: true,
  },
  {
    id: "faq-4",
    question: "Is biometric attendance sync supported?",
    answer: "Yes, standard biometric devices such as ZKTeco and IP-based access controllers can be synced automatically.",
    category: "Integrations",
    order: 4,
    isActive: true,
  },
];

async function getStoredFaqs() {
  const page = await prisma.cmsPage.findUnique({ where: { slug: "system-cms-faqs" } });
  if (page?.content && Array.isArray((page.content as any).faqs)) {
    return (page.content as any).faqs;
  }
  await prisma.cmsPage.upsert({
    where: { slug: "system-cms-faqs" },
    create: {
      id: "system-cms-faqs",
      slug: "system-cms-faqs",
      title: "System FAQs",
      content: { faqs: DEFAULT_FAQS },
      published: true,
    },
    update: {},
  });
  return DEFAULT_FAQS;
}

cmsRouter.get("/faqs", async (_req, res) => {
  try {
    const faqs = await getStoredFaqs();
    return res.json(faqs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch FAQs" });
  }
});

const faqSchema = z.object({
  question: z.string().trim().min(3),
  answer: z.string().trim().min(3),
  category: z.string().trim().default("General"),
  order: z.number().int().optional(),
  isActive: z.boolean().default(true),
});

cmsRouter.post("/faqs", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = faqSchema.parse(req.body);
    const faqs = await getStoredFaqs();
    const newFaq = {
      id: `faq-${Date.now()}`,
      question: data.question,
      answer: data.answer,
      category: data.category,
      order: data.order ?? faqs.length + 1,
      isActive: data.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...faqs, newFaq];
    await prisma.cmsPage.upsert({
      where: { slug: "system-cms-faqs" },
      create: { id: "system-cms-faqs", slug: "system-cms-faqs", title: "System FAQs", content: { faqs: updated }, published: true },
      update: { content: { faqs: updated } },
    });
    return res.status(201).json(newFaq);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    return res.status(500).json({ error: err.message || "Failed to create FAQ" });
  }
});

cmsRouter.put("/faqs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const faqs = await getStoredFaqs();
    const index = faqs.findIndex((f: any) => f.id === id);
    if (index === -1) return res.status(404).json({ error: "FAQ not found" });

    const updatedFaq = {
      ...faqs[index],
      ...req.body,
      id,
      updatedAt: new Date().toISOString(),
    };
    faqs[index] = updatedFaq;

    await prisma.cmsPage.update({
      where: { slug: "system-cms-faqs" },
      data: { content: { faqs } },
    });
    return res.json(updatedFaq);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update FAQ" });
  }
});

cmsRouter.delete("/faqs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const faqs = await getStoredFaqs();
    const updated = faqs.filter((f: any) => f.id !== id);

    await prisma.cmsPage.update({
      where: { slug: "system-cms-faqs" },
      data: { content: { faqs: updated } },
    });
    return res.json({ success: true, message: "FAQ deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete FAQ" });
  }
});

cmsRouter.patch("/faqs/reorder", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });

    const faqs = await getStoredFaqs();
    const reordered = [...faqs].sort((a: any, b: any) => {
      const idxA = orderedIds.indexOf(a.id);
      const idxB = orderedIds.indexOf(b.id);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    }).map((item: any, idx: number) => ({ ...item, order: idx + 1 }));

    await prisma.cmsPage.update({
      where: { slug: "system-cms-faqs" },
      data: { content: { faqs: reordered } },
    });
    return res.json({ success: true, faqs: reordered });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to reorder FAQs" });
  }
});

// ==========================================
// P11: TESTIMONIAL MANAGEMENT
// ==========================================
const DEFAULT_TESTIMONIALS = [
  {
    id: "test-1",
    name: "Sarah Jenkins",
    role: "Head of People",
    company: "FinTech Global",
    rating: 5,
    content: "Master HRMS transformed our distributed payroll and attendance pipeline across 12 countries seamlessly.",
    avatar: "/avatars/avatar-1.png",
    order: 1,
    isActive: true,
  },
  {
    id: "test-2",
    name: "David Zhao",
    role: "VP of Operations",
    company: "Nexus Retail",
    rating: 5,
    content: "The multi-tenant isolation, shift scheduling, and fine-grained permissions have been completely rock solid.",
    avatar: "/avatars/avatar-2.png",
    order: 2,
    isActive: true,
  },
  {
    id: "test-3",
    name: "Elena Rostova",
    role: "HR Director",
    company: "CloudScale",
    rating: 5,
    content: "Employees love the self-service portal, leave workflows, and instant payslip generation on both mobile and web.",
    avatar: "/avatars/avatar-3.png",
    order: 3,
    isActive: true,
  },
];

async function getStoredTestimonials() {
  const page = await prisma.cmsPage.findUnique({ where: { slug: "system-cms-testimonials" } });
  if (page?.content && Array.isArray((page.content as any).testimonials)) {
    return (page.content as any).testimonials;
  }
  await prisma.cmsPage.upsert({
    where: { slug: "system-cms-testimonials" },
    create: {
      id: "system-cms-testimonials",
      slug: "system-cms-testimonials",
      title: "System Testimonials",
      content: { testimonials: DEFAULT_TESTIMONIALS },
      published: true,
    },
    update: {},
  });
  return DEFAULT_TESTIMONIALS;
}

cmsRouter.get("/testimonials", async (_req, res) => {
  try {
    const testimonials = await getStoredTestimonials();
    return res.json(testimonials);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch testimonials" });
  }
});

const testimonialSchema = z.object({
  name: z.string().trim().min(2),
  role: z.string().trim().optional(),
  company: z.string().trim().optional(),
  rating: z.number().min(1).max(5).default(5),
  content: z.string().trim().min(5),
  avatar: z.string().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().default(true),
});

cmsRouter.post("/testimonials", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = testimonialSchema.parse(req.body);
    const testimonials = await getStoredTestimonials();
    const newTestimonial = {
      id: `test-${Date.now()}`,
      name: data.name,
      role: data.role || "",
      company: data.company || "",
      rating: data.rating,
      content: data.content,
      avatar: data.avatar || "/avatars/avatar.png",
      order: data.order ?? testimonials.length + 1,
      isActive: data.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...testimonials, newTestimonial];
    await prisma.cmsPage.upsert({
      where: { slug: "system-cms-testimonials" },
      create: { id: "system-cms-testimonials", slug: "system-cms-testimonials", title: "System Testimonials", content: { testimonials: updated }, published: true },
      update: { content: { testimonials: updated } },
    });
    return res.status(201).json(newTestimonial);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    return res.status(500).json({ error: err.message || "Failed to create testimonial" });
  }
});

cmsRouter.put("/testimonials/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const testimonials = await getStoredTestimonials();
    const index = testimonials.findIndex((t: any) => t.id === id);
    if (index === -1) return res.status(404).json({ error: "Testimonial not found" });

    const updatedTestimonial = {
      ...testimonials[index],
      ...req.body,
      id,
      updatedAt: new Date().toISOString(),
    };
    testimonials[index] = updatedTestimonial;

    await prisma.cmsPage.update({
      where: { slug: "system-cms-testimonials" },
      data: { content: { testimonials } },
    });
    return res.json(updatedTestimonial);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update testimonial" });
  }
});

cmsRouter.delete("/testimonials/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const testimonials = await getStoredTestimonials();
    const updated = testimonials.filter((t: any) => t.id !== id);

    await prisma.cmsPage.update({
      where: { slug: "system-cms-testimonials" },
      data: { content: { testimonials: updated } },
    });
    return res.json({ success: true, message: "Testimonial deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete testimonial" });
  }
});

cmsRouter.patch("/testimonials/reorder", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });

    const testimonials = await getStoredTestimonials();
    const reordered = [...testimonials].sort((a: any, b: any) => {
      const idxA = orderedIds.indexOf(a.id);
      const idxB = orderedIds.indexOf(b.id);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    }).map((item: any, idx: number) => ({ ...item, order: idx + 1 }));

    await prisma.cmsPage.update({
      where: { slug: "system-cms-testimonials" },
      data: { content: { testimonials: reordered } },
    });
    return res.json({ success: true, testimonials: reordered });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to reorder testimonials" });
  }
});
