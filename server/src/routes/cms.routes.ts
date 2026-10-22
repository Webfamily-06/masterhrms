import { Router, Response } from "express";
import { prisma, rawPrisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import crypto from "crypto";
import { z } from "zod";
import { syncSubscriptionPlans } from "../services/workspace-policy.service";
import { SettingsService } from "../services/settings/settings.service";
import { AUTHORITATIVE_LEGAL_DOCS } from "../services/legal-docs.service";

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
  const publicConfig = ["system-platform-settings", "system-monetization-plans", "system-addons-catalog", "system-solutions-catalog", "system-about-us", "system-product-modules", "system-landing-page", "system-blog-categories", "system-blog-tags"];
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
        content: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    return res.json(pages);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/cms/pages/by-id/:id - Fetch page by persistent ID
cmsRouter.get("/pages/by-id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const page = await prisma.cmsPage.findUnique({
      where: { id },
    });
    if (!page) {
      return res.status(404).json({ error: "CMS Page not found with the specified ID" });
    }
    if (!page.published) {
      const isSuper = (req as AuthRequest).user?.roles?.includes("super_admin");
      if (!isSuper) {
        return res.status(404).json({ error: "CMS Page not found" });
      }
    }
    return res.json(page);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// PUT /api/cms/pages/by-id/:id - Update page by persistent ID
cmsRouter.put("/pages/by-id/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, slug, metaDescription, content, published, expectedUpdatedAt } = req.body;
    const isSuper = req.user?.roles.includes("super_admin");
    if (!isSuper) {
      return res.status(403).json({ error: "Super admin authorization required to update pages." });
    }

    const existing = await prisma.cmsPage.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "CMS Page not found with the specified ID." });
    }

    // Optimistic Concurrency Control: Prevent silent overwrites if another session updated the record
    if (expectedUpdatedAt) {
      const clientTime = new Date(expectedUpdatedAt).getTime();
      const serverTime = new Date(existing.updatedAt).getTime();
      if (!isNaN(clientTime) && serverTime > clientTime + 1500) {
        return res.status(409).json({
          error: "Conflict: This article was modified by another session. Please reload to review the latest changes.",
          serverUpdatedAt: existing.updatedAt,
        });
      }
    }

    let targetSlug = existing.slug;
    if (slug && slug.trim() && slug.trim() !== existing.slug) {
      const slugConflict = await prisma.cmsPage.findFirst({
        where: {
          slug: slug.trim(),
          NOT: { id },
        },
      });
      if (slugConflict) {
        return res.status(409).json({ error: `A page with slug '${slug.trim()}' already exists.` });
      }
      targetSlug = slug.trim();
    }

    const updated = await prisma.cmsPage.update({
      where: { id },
      data: {
        title: title || existing.title,
        slug: targetSlug,
        metaDescription: metaDescription !== undefined ? metaDescription : existing.metaDescription,
        content: content !== undefined ? content : existing.content,
        published: typeof published === "boolean" ? published : existing.published,
        updatedBy: req.user?.userId || existing.updatedBy,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// DELETE /api/cms/pages/by-id/:id - Delete page by persistent ID
cmsRouter.delete("/pages/by-id/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isSuper = req.user?.roles?.includes("super_admin");
    if (!isSuper) {
      return res.status(403).json({ error: "Super admin authorization required to delete pages." });
    }
    const { id } = req.params;
    const existing = await prisma.cmsPage.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });
    if (!existing) {
      return res.status(404).json({ error: "CMS Page not found with the specified ID" });
    }

    // Safety guard: prevent deletion of core system configuration pages
    const protectedSlugs = [
      "system-platform-settings",
      "system-monetization-plans",
      "system-addons-catalog",
      "system-solutions-catalog",
      "system-about-us",
      "system-product-modules",
      "system-landing-page",
    ];
    if (protectedSlugs.includes(existing.slug)) {
      return res.status(400).json({ error: `Core platform configuration '${existing.slug}' cannot be deleted.` });
    }

    await prisma.cmsPage.delete({ where: { id: existing.id } });
    return res.json({ success: true, message: `Page '${existing.title}' deleted successfully` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/cms/blogs - List all blog articles
cmsRouter.get("/blogs", async (req, res) => {
  try {
    const isSuper = (req as AuthRequest).user?.roles?.includes("super_admin");
    const blogs = await prisma.cmsPage.findMany({
      where: {
        AND: [
          isSuper ? {} : { published: true },
          {
            OR: [
              { slug: { startsWith: "blog-" } },
              { slug: "resource-blogs" },
            ],
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });

    // Enforce publication date boundary for scheduled posts
    if (!isSuper) {
      const now = new Date();
      const eligible = blogs.filter((b: any) => {
        if (!b.published) return false;
        const pubAt = b.content?.publishedAt;
        if (pubAt) {
          const pubDate = new Date(pubAt);
          if (!isNaN(pubDate.getTime()) && pubDate > now) {
            return false; // Scheduled post - hide from public
          }
        }
        return true;
      });
      return res.json(eligible);
    }

    return res.json(blogs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/cms/blogs/:id - Get blog by persistent ID or slug
cmsRouter.get("/blogs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const isSuper = (req as AuthRequest).user?.roles?.includes("super_admin");
    const blog = await prisma.cmsPage.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
          { slug: `blog-${id}` },
        ],
      },
    });
    if (!blog) {
      return res.status(404).json({ error: "Blog article not found" });
    }
    if (!isSuper) {
      if (!blog.published) {
        return res.status(404).json({ error: "Blog article not found" });
      }
      const pubAt = (blog.content as any)?.publishedAt;
      if (pubAt) {
        const pubDate = new Date(pubAt);
        if (!isNaN(pubDate.getTime()) && pubDate > new Date()) {
          return res.status(404).json({ error: "Blog article not found" });
        }
      }
    }
    return res.json(blog);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/cms/blogs - Create blog with guaranteed persistent UUID
cmsRouter.post("/blogs", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isSuper = req.user?.roles?.includes("super_admin");
    if (!isSuper) {
      return res.status(403).json({ error: "Super admin authorization required to create articles." });
    }
    const { title, slug, content, metaDescription, published } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const rawSlug = (slug || title).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
    const cleanSlug = rawSlug.replace(/^blog-/, "");
    const finalSlug = `blog-${cleanSlug}`;

    const existing = await prisma.cmsPage.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      return res.status(409).json({ error: `An article with slug '${finalSlug}' already exists.` });
    }

    const article = await prisma.cmsPage.create({
      data: {
        id: crypto.randomUUID(),
        slug: finalSlug,
        title: title.trim(),
        content: content ?? {},
        metaDescription: metaDescription || null,
        published: published ?? true,
        updatedBy: req.user?.userId,
      },
    });

    return res.status(201).json(article);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// PUT /api/cms/blogs/:id - Update blog by persistent ID or slug
cmsRouter.put("/blogs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isSuper = req.user?.roles?.includes("super_admin");
    if (!isSuper) {
      return res.status(403).json({ error: "Super admin authorization required to update articles." });
    }
    const { id } = req.params;
    const { title, slug, content, metaDescription, published, expectedUpdatedAt } = req.body;

    const existing = await prisma.cmsPage.findFirst({
      where: {
        OR: [{ id }, { slug: id }, { slug: `blog-${id}` }],
      },
    });
    if (!existing) {
      return res.status(404).json({ error: "Blog article not found" });
    }

    // Optimistic Concurrency Control
    if (expectedUpdatedAt) {
      const clientTime = new Date(expectedUpdatedAt).getTime();
      const serverTime = new Date(existing.updatedAt).getTime();
      if (!isNaN(clientTime) && serverTime > clientTime + 1500) {
        return res.status(409).json({
          error: "Conflict: This article was modified by another session. Please reload to review the latest changes.",
          serverUpdatedAt: existing.updatedAt,
        });
      }
    }

    let targetSlug = existing.slug;
    if (slug) {
      const rawSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
      const cleanSlug = rawSlug.replace(/^blog-/, "");
      targetSlug = `blog-${cleanSlug}`;

      if (targetSlug !== existing.slug) {
        const conflict = await prisma.cmsPage.findFirst({
          where: {
            slug: targetSlug,
            NOT: { id: existing.id },
          },
        });
        if (conflict) {
          return res.status(409).json({ error: `An article with slug '${targetSlug}' already exists.` });
        }
      }
    }

    const updated = await prisma.cmsPage.update({
      where: { id: existing.id },
      data: {
        title: title !== undefined ? title : existing.title,
        slug: targetSlug,
        content: content !== undefined ? content : existing.content,
        metaDescription: metaDescription !== undefined ? metaDescription : existing.metaDescription,
        published: typeof published === "boolean" ? published : existing.published,
        updatedBy: req.user?.userId || existing.updatedBy,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// DELETE /api/cms/blogs/:id - Delete blog by persistent ID or slug
cmsRouter.delete("/blogs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isSuper = req.user?.roles?.includes("super_admin");
    if (!isSuper) {
      return res.status(403).json({ error: "Super admin authorization required to delete articles." });
    }
    const { id } = req.params;
    const existing = await prisma.cmsPage.findFirst({
      where: {
        OR: [{ id }, { slug: id }, { slug: `blog-${id}` }],
      },
    });
    if (!existing) {
      return res.status(404).json({ error: "Blog article not found" });
    }

    await prisma.cmsPage.delete({ where: { id: existing.id } });
    return res.json({ success: true, message: "Blog article deleted successfully" });
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

    let page = await prisma.cmsPage.findFirst({
      where: {
        OR: [
          { slug },
          { id: slug },
        ],
      },
    });

    if (!page && slug === "system-solutions-catalog") {
      const defaultSolutions = [
        { id: "it", title: "IT & Software", desc: "Distributed teams, contractor management, and rapid hiring.", highlights: ["Remote-first attendance", "Contractor & vendor onboarding", "Certification tracking for tech skills", "Fast, high-volume recruitment"] },
        { id: "manufacturing", title: "Manufacturing", desc: "Shift rosters, statutory compliance, and shop-floor attendance.", highlights: ["Rotational shifts & overtime", "Biometric device integration", "Factories Act compliance", "Safety training via LMS"] },
        { id: "healthcare", title: "Healthcare", desc: "Rosters, credentials, and 24×7 workforce scheduling.", highlights: ["Credential & license expiry alerts", "24×7 shift roster", "On-call & standby pay", "Mandatory training compliance"] },
        { id: "retail", title: "Retail", desc: "Multi-location workforce, seasonal hiring, and mobile-first HR.", highlights: ["Store-level attendance", "Seasonal & temp staff", "Mobile-first self-service", "Sales incentive payroll"] },
        { id: "bfsi", title: "BFSI", desc: "Audit-ready HR with strong security and role-based controls.", highlights: ["Detailed audit logs", "SSO / SAML", "Role-based access control", "Regulatory training"] },
        { id: "education", title: "Education", desc: "Faculty, staff, and academic-year workflows in one system.", highlights: ["Academic-year leave policies", "Faculty appraisals", "Substitution management", "Payroll for allowances"] },
      ];
      page = await prisma.cmsPage.upsert({
        where: { slug: "system-solutions-catalog" },
        create: { id: "system-solutions-catalog", slug: "system-solutions-catalog", title: "Solutions by Industry", content: { industries: defaultSolutions }, published: true },
        update: {},
      });
    }

    if (!page && slug === "system-about-us") {
      const defaultAbout = {
        values: [
          { title: "People First", desc: "We build for growing organizations and the people they empower every single day." },
          { title: "High Velocity", desc: "Autonomous releases, sub-second latency, and continuous performance optimization." },
          { title: "Global by Default", desc: "Multi-currency, localized tax engines, and distributed clusters in 5 global regions." },
          { title: "Craft & Ergonomics", desc: "Enterprise software should inspire. Modern interfaces designed with intuitive ergonomics." },
        ],
        stats: [
          { v: "2020", l: "Engine Founded" },
          { v: "180+", l: "Core Contributors" },
          { v: "1,200+", l: "Global Enterprises" },
          { v: "50,000+", l: "Workforce Managed" },
        ],
      };
      page = await prisma.cmsPage.upsert({
        where: { slug: "system-about-us" },
        create: { id: "system-about-us", slug: "system-about-us", title: "About Us & Values", content: defaultAbout, published: true },
        update: {},
      });
    }

    if (!page && slug === "system-product-modules") {
      const defaultModules = [
        { id: "core-hr", title: "Core HR", desc: "The single source of truth for your people data.", features: ["Employee master & documents", "Org chart & departments", "Lifecycle events (onboarding, transfers, exits)", "Custom fields & workflows", "Employee self-service portal"] },
        { id: "payroll", title: "Payroll", desc: "Statutory-ready payroll with automated pay runs.", features: ["Salary structures & CTC", "Automated tax, PF, ESI, PT", "Payslip generation & delivery", "Reimbursements & bonuses", "Year-end filings & Form 16"] },
        { id: "attendance", title: "Attendance", desc: "Track time across web, mobile, biometric, and geo-fence.", features: ["Web & mobile clock-in", "Shift rosters & swaps", "Geo-fenced attendance", "Biometric device sync", "Overtime & regularization"] },
        { id: "leave", title: "Leave", desc: "Policies, balances, and approval flows made simple.", features: ["Configurable leave policies", "Accrual & carry-forward rules", "Team calendars & holiday lists", "Multi-level approvals", "Leave encashment"] },
        { id: "recruitment", title: "Recruitment", desc: "Applicant tracking from job post to offer letter.", features: ["Career site & job posts", "Candidate pipeline & Kanban", "Interview scheduling", "Feedback & scorecards", "Offer letters & onboarding handoff"] },
        { id: "performance", title: "Performance", desc: "Goals, continuous feedback, and 360 reviews.", features: ["OKR goal trees", "Quarterly & annual review cycles", "Multi-rater / 360 feedback", "Performance-to-payroll linkage", "1:1 meeting agendas"] },
        { id: "lms", title: "LMS & Training", desc: "Course library, compliance tracks, and skill assessments.", features: ["Course authoring & SCORM", "Mandatory compliance certifications", "Quizzes & skill assessments", "Progress dashboards", "Automated reminder nudges"] },
        { id: "helpdesk", title: "Internal Helpdesk", desc: "Employee ticketing with SLA-driven routing.", features: ["Shared HR / IT ticket inbox", "Custom categories & SLAs", "Internal notes & canned replies", "Satisfaction (CSAT) surveys", "Knowledge base integration"] },
      ];
      page = await prisma.cmsPage.upsert({
        where: { slug: "system-product-modules" },
        create: { id: "system-product-modules", slug: "system-product-modules", title: "Product Modules", content: { modules: defaultModules }, published: true },
        update: {},
      });
    }

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

    if (!page && slug.startsWith("legal-") && AUTHORITATIVE_LEGAL_DOCS[slug]) {
      const docDef = AUTHORITATIVE_LEGAL_DOCS[slug];
      page = await prisma.cmsPage.upsert({
        where: { slug: docDef.slug },
        create: {
          slug: docDef.slug,
          title: docDef.title,
          metaDescription: docDef.metaDescription,
          content: { body: docDef.body },
          published: true,
        },
        update: {},
      });
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
        // Overlay authoritative payments from SettingsService
        try {
          const paymentsRes = await SettingsService.getGroup("payments", "PLATFORM");
          const pVals = paymentsRes?.values || {};
          if (pVals["payments.razorpay_enabled"] !== undefined && (page.content as any)?.razorpayEnabled === undefined) {
            content.razorpayEnabled = Boolean(pVals["payments.razorpay_enabled"]);
          }
          if (pVals["payments.razorpay_key_id"] && !(page.content as any)?.razorpayKeyId) {
            content.razorpayKeyId = pVals["payments.razorpay_key_id"];
          }
          if (pVals["payments.bank_transfer_enabled"] !== undefined && (page.content as any)?.bankTransferEnabled === undefined) {
            content.bankTransferEnabled = Boolean(pVals["payments.bank_transfer_enabled"]);
          }
          if (pVals["payments.bank_details"] && !(page.content as any)?.bankTransferDetails) {
            content.bankTransferDetails = pVals["payments.bank_details"];
          }
          if (pVals["payments.paypal_enabled"] !== undefined && (page.content as any)?.paypalEnabled === undefined) {
            content.paypalEnabled = Boolean(pVals["payments.paypal_enabled"]);
          }
          if (pVals["payments.paypal_client_id"] && !(page.content as any)?.paypalClientId) {
            content.paypalClientId = pVals["payments.paypal_client_id"];
          }
          if (pVals["payments.paypal_mode"] && !(page.content as any)?.paypalMode) {
            content.paypalMode = pVals["payments.paypal_mode"];
          }
        } catch (payErr) {
          console.error("Failed to overlay payments onto system-platform-settings:", payErr);
        }
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
        res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
        return res.json({ ...page, content });
      }

      // For Super Admin: NEVER leak plaintext secrets over the wire; mask them safely
      const SENSITIVE_KEYS = [
        "razorpayKeySecret",
        "paypalSecret",
        "paypalClientSecret",
        "stripeSecretKey",
        "smtpPass",
        "smtpPassword",
        "pusherAppSecret",
        "livekitApiSecret",
        "slackClientSecret",
      ];
      const maskedContent = { ...((page.content as any) || {}) };
      for (const sk of SENSITIVE_KEYS) {
        if (maskedContent[sk]) {
          maskedContent[`has_${sk}`] = true;
          maskedContent[`has${sk.charAt(0).toUpperCase()}${sk.slice(1)}`] = true;
          maskedContent[sk] = "••••••••••••••••";
        }
      }
      res.set("Cache-Control", "private, no-cache, no-store");
      return res.json({ ...page, content: maskedContent });
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
    let { title, content, metaDescription, published } = req.body;
    const isSuper = req.user?.roles.includes("super_admin");

    if (slug === "system-platform-settings") {
      if (!isSuper) {
        return res.status(403).json({ error: "Super admin authorization required to update platform settings." });
      }

      const existingPage = await prisma.cmsPage.findUnique({ where: { slug } });
      const existingContent = (existingPage?.content as any) || {};

      // Credential validation: fail-closed if live keys in sandbox
      const isLivePaymentAuthorized = process.env.ENABLE_LIVE_PAYMENTS === "true";
      const keyId = content?.razorpayKeyId || "";
      const keySecret = content?.razorpayKeySecret || "";
      if (!isLivePaymentAuthorized && (keyId.startsWith("rzp_live_") || (keySecret && !keySecret.includes("••••") && keySecret.startsWith("rzp_live_")))) {
        return res.status(400).json({
          error: "Live Razorpay credentials (rzp_live_*) are strictly prohibited in sandbox mode.",
        });
      }

      // Preserve existing secrets when omitted or masked
      const SENSITIVE_KEYS = [
        "razorpayKeySecret",
        "paypalSecret",
        "paypalClientSecret",
        "stripeSecretKey",
        "smtpPass",
        "smtpPassword",
        "pusherAppSecret",
        "livekitApiSecret",
        "slackClientSecret",
      ];

      const mergedContent = { ...existingContent, ...(content || {}) };
      for (const sk of SENSITIVE_KEYS) {
        const val = content ? content[sk] : undefined;
        if (val === undefined || val === "" || (typeof val === "string" && val.includes("••••"))) {
          mergedContent[sk] = existingContent[sk] || "";
        } else if (typeof val === "string" && val !== existingContent[sk]) {
          // Explicit secret rotation! Record audit log
          mergedContent[sk] = val;
          try {
            await (rawPrisma || prisma).settingAudit.create({
              data: {
                scope: "PLATFORM",
                scopeId: null,
                key: `platform.${sk}`,
                oldValueMasked: existingContent[sk] ? "••••••••••••••••" : null,
                newValueMasked: "••••••••••••••••",
                changedBy: req.user?.userId || "super-admin",
                ipAddress: req.ip || null,
                userAgent: (req.headers["user-agent"] as string) || null,
              },
            });
          } catch (auditErr) {
            console.error("Failed to write setting audit log:", auditErr);
          }
        }
      }
      content = mergedContent;
    }

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

        // Sync payment gateways to SettingsService
        if (content.razorpayEnabled !== undefined) toSet["payments.razorpay_enabled"] = Boolean(content.razorpayEnabled);
        if (content.razorpayKeyId !== undefined) toSet["payments.razorpay_key_id"] = content.razorpayKeyId;
        if (content.razorpayKeySecret && typeof content.razorpayKeySecret === "string" && !content.razorpayKeySecret.includes("••••")) {
          toSet["payments.razorpay_key_secret"] = content.razorpayKeySecret;
        }
        if (content.bankTransferEnabled !== undefined) toSet["payments.bank_transfer_enabled"] = Boolean(content.bankTransferEnabled);
        if (content.bankTransferDetails !== undefined) toSet["payments.bank_details"] = content.bankTransferDetails;
        if (content.defaultCurrency) toSet["payments.currency"] = content.defaultCurrency;

        // Sync PayPal to SettingsService
        if (content.paypalEnabled !== undefined) toSet["payments.paypal_enabled"] = Boolean(content.paypalEnabled);
        if (content.paypalClientId !== undefined) toSet["payments.paypal_client_id"] = content.paypalClientId;
        if (content.paypalSecret && typeof content.paypalSecret === "string" && !content.paypalSecret.includes("••••")) {
          toSet["payments.paypal_secret"] = content.paypalSecret;
        }
        if (content.paypalMode !== undefined) toSet["payments.paypal_mode"] = content.paypalMode;

        if (Object.keys(toSet).length > 0) {
          await SettingsService.setMany(toSet, "PLATFORM", null, req.user?.userId || null);
        }
      } catch (syncErr) {
        console.error("Failed to sync system-platform-settings to SettingsService:", syncErr);
      }
    }

    if (slug === "system-platform-settings") {
      const maskedContent = { ...((page.content as any) || {}) };
      const SENSITIVE_KEYS = [
        "razorpayKeySecret",
        "paypalSecret",
        "paypalClientSecret",
        "stripeSecretKey",
        "smtpPass",
        "smtpPassword",
        "pusherAppSecret",
        "livekitApiSecret",
        "slackClientSecret",
      ];
      for (const sk of SENSITIVE_KEYS) {
        if (maskedContent[sk]) {
          maskedContent[`has_${sk}`] = true;
          maskedContent[`has${sk.charAt(0).toUpperCase()}${sk.slice(1)}`] = true;
          maskedContent[sk] = "••••••••••••••••";
        }
      }
      return res.json({ ...page, content: maskedContent });
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

// ==========================================
// IN-MEMORY PERFORMANCE CACHE FOR PUBLIC ADDONS
// ==========================================
interface AddonCacheEntry<T> {
  data: T;
  expiresAt: number;
}

let catalogCache: AddonCacheEntry<any[]> | null = null;
let categoryCache: AddonCacheEntry<string[]> | null = null;
const slugCache = new Map<string, AddonCacheEntry<any>>();

export function invalidateCmsAddonsCache(slug?: string) {
  catalogCache = null;
  categoryCache = null;
  if (slug) {
    slugCache.delete(slug);
  } else {
    slugCache.clear();
  }
}

// GET /api/cms/addons/categories
cmsRouter.get("/addons/categories", async (_req, res) => {
  try {
    const now = Date.now();
    if (categoryCache && categoryCache.expiresAt > now) {
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
      return res.json(categoryCache.data);
    }

    const distinct = await prisma.addon.findMany({
      where: { status: "active" },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    const categories = distinct.map((d: any) => d.category).filter(Boolean);

    categoryCache = {
      data: categories,
      expiresAt: now + 60 * 1000,
    };

    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const isDefaultQuery = (!category || category === "All") && (!search || !search.trim()) && page === 1;
    const now = Date.now();

    if (isDefaultQuery && catalogCache && catalogCache.expiresAt > now) {
      res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      return res.json(catalogCache.data);
    }

    const where: any = { status: "active" };
    if (category && category !== "All") {
      where.category = category;
    }
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { slug: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { tagline: { contains: term, mode: "insensitive" } },
      ];
    }

    // Only select fields required for catalog cards — avoid fetching large descriptions and galleries for listing cards
    const addons = await prisma.addon.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        tagline: true,
        description: true,
        category: true,
        status: true,
        priceMonthly: true,
        icon: true,
        featured: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }, { id: "asc" }],
      take: limit,
      skip: offset,
    });

    // Check if custom persisted ordering exists
    let orderSlugs: string[] = [];
    try {
      const orderSetting = await (rawPrisma || prisma).setting.findFirst({
        where: {
          scope: "PLATFORM",
          group: "addon_catalog",
          key: { in: ["addon_catalog.display_order", "display_order"] },
        },
      });
      if (orderSetting?.valueJson && Array.isArray((orderSetting.valueJson as any).slugs)) {
        orderSlugs = (orderSetting.valueJson as any).slugs;
      }
    } catch {}

    const formatted = addons.map((a: any) => {
      const price = a.priceMonthly != null ? Number(a.priceMonthly) : 0;
      return {
        id: a.id,
        name: a.name,
        slug: a.slug,
        tagline: a.tagline ?? null,
        description: a.description ?? null,
        category: a.category,
        status: a.status,
        priceMonthly: price,
        price_monthly: price,
        icon: a.icon ?? null,
        featured: Boolean(a.featured),
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      };
    });

    if (orderSlugs.length > 0) {
      formatted.sort((a, b) => {
        const idxA = orderSlugs.indexOf(a.slug);
        const idxB = orderSlugs.indexOf(b.slug);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    if (isDefaultQuery) {
      catalogCache = {
        data: formatted,
        expiresAt: now + 30 * 1000,
      };
    }

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch addons" });
  }
});

// PATCH & PUT /api/cms/addons/reorder (Super Admin manual ordering persistence)
const handleAddonReorder = async (req: AuthRequest, res: Response) => {
  try {
    const isSuperAdmin = (req.user?.roles || []).includes("super_admin") || (req.user as any)?.role === "super_admin";
    if (!isSuperAdmin) {
      return res.status(403).json({ error: "Super admin authorization required to reorder catalog" });
    }

    const { slugs } = req.body;
    if (!Array.isArray(slugs)) {
      return res.status(400).json({ error: "slugs must be an array of addon slugs" });
    }

    const db = rawPrisma || prisma;
    await db.setting.upsert({
      where: {
        scope_scopeId_key: {
          scope: "PLATFORM",
          scopeId: "SYSTEM",
          key: "addon_catalog.display_order",
        },
      },
      create: {
        scope: "PLATFORM",
        scopeId: "SYSTEM",
        group: "addon_catalog",
        key: "addon_catalog.display_order",
        valueJson: { slugs } as any,
        valueType: "json",
        isSecret: false,
        version: 1,
        updatedBy: req.user?.userId || "SYSTEM",
      },
      update: {
        valueJson: { slugs } as any,
        updatedBy: req.user?.userId || "SYSTEM",
      },
    });

    invalidateCmsAddonsCache();

    return res.json({ success: true, message: "Addon catalog order persisted successfully", slugs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to persist addon order" });
  }
};
cmsRouter.patch("/addons/reorder", requireAuth, handleAddonReorder);
cmsRouter.put("/addons/reorder", requireAuth, handleAddonReorder);

// PATCH /api/cms/addons/categories/reorder
cmsRouter.patch("/addons/categories/reorder", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isSuperAdmin = (req.user?.roles || []).includes("super_admin") || (req.user as any)?.role === "super_admin";
    if (!isSuperAdmin) {
      return res.status(403).json({ error: "Super admin authorization required to reorder categories" });
    }

    const { categories } = req.body;
    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: "categories must be an array of category names" });
    }

    const db = rawPrisma || prisma;
    await db.setting.upsert({
      where: {
        scope_scopeId_key: {
          scope: "PLATFORM",
          scopeId: "SYSTEM",
          key: "addon_catalog.category_order",
        },
      },
      create: {
        scope: "PLATFORM",
        scopeId: "SYSTEM",
        group: "addon_catalog",
        key: "addon_catalog.category_order",
        valueJson: { categories } as any,
        valueType: "json",
        isSecret: false,
        version: 1,
        updatedBy: req.user?.userId || "SYSTEM",
      },
      update: {
        valueJson: { categories } as any,
        updatedBy: req.user?.userId || "SYSTEM",
      },
    });

    invalidateCmsAddonsCache();

    return res.json({ success: true, message: "Category order persisted successfully", categories });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to persist category order" });
  }
});

// GET /api/cms/addons/:slug
cmsRouter.get("/addons/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const now = Date.now();
    const cached = slugCache.get(slug);
    if (cached && cached.expiresAt > now) {
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
      return res.json(cached.data);
    }

    // Direct indexed query by slug
    const addon = await prisma.addon.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        tagline: true,
        description: true,
        longDescription: true,
        category: true,
        status: true,
        priceMonthly: true,
        icon: true,
        screenshots: true,
        features: true,
        developer: true,
        version: true,
        docsUrl: true,
        galleryVideo: true,
        installUrl: true,
        featured: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Ensure draft and archived records remain excluded from public results
    if (!addon || addon.status !== "active") {
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

    slugCache.set(slug, {
      data: formatted,
      expiresAt: now + 60 * 1000,
    });

    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
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

// ==========================================
// P12: RESOURCE GUIDES & PLAYBOOKS MANAGEMENT
// ==========================================
const DEFAULT_GUIDES = [
  {
    id: "guide-1",
    slug: "enterprise-erp-compliance-checklist-2026",
    title: "Enterprise ERP & HR Compliance Checklist 2026",
    description: "Complete statutory audit and labor compliance checklist for multinational enterprises.",
    category: "Compliance",
    type: "PDF · 24 pages",
    downloadUrl: "/downloads/enterprise-erp-compliance-checklist-2026.pdf",
    coverImage: "/images/resources/guide-compliance.jpg",
    coverImageAlt: "ERP Compliance Checklist",
    order: 1,
    isActive: true,
  },
  {
    id: "guide-2",
    slug: "multi-currency-payroll-setup-playbook",
    title: "Multi-Currency Payroll Setup Playbook",
    description: "Step-by-step implementation guide for multi-country salary structures, FX conversion, and tax deductions.",
    category: "Payroll",
    type: "Playbook · 18 pages",
    downloadUrl: "/downloads/multi-currency-payroll-setup-playbook.pdf",
    coverImage: "/images/resources/guide-payroll.jpg",
    coverImageAlt: "Multi-Currency Payroll Playbook",
    order: 2,
    isActive: true,
  },
  {
    id: "guide-3",
    slug: "performance-review-okr-cascades",
    title: "Performance Review & OKR Cascades",
    description: "Strategic framework for cascading corporate OKRs into quarterly departmental goals and reviews.",
    category: "Performance",
    type: "Toolkit · 12 pages",
    downloadUrl: "/downloads/performance-review-okr-cascades.pdf",
    coverImage: "/images/resources/guide-okr.jpg",
    coverImageAlt: "OKR Performance Review Toolkit",
    order: 3,
    isActive: true,
  },
  {
    id: "guide-4",
    slug: "employee-master-directory-setup-guide",
    title: "Employee Master Directory Setup Guide",
    description: "Best practices for configuring single source of truth employee directories, custom schemas, and role permissions.",
    category: "Core HR",
    type: "Template · 15 pages",
    downloadUrl: "/downloads/employee-master-directory-setup-guide.pdf",
    coverImage: "/images/resources/guide-directory.jpg",
    coverImageAlt: "Employee Directory Setup Guide",
    order: 4,
    isActive: true,
  },
];

async function getStoredGuides() {
  const page = await prisma.cmsPage.findUnique({ where: { slug: "system-resource-guides" } });
  if (page?.content && Array.isArray((page.content as any).guides)) {
    return (page.content as any).guides;
  }
  await prisma.cmsPage.upsert({
    where: { slug: "system-resource-guides" },
    create: {
      id: "system-resource-guides",
      slug: "system-resource-guides",
      title: "Resource Guides & Playbooks",
      content: { guides: DEFAULT_GUIDES },
      published: true,
    },
    update: {},
  });
  return DEFAULT_GUIDES;
}

cmsRouter.get("/guides", async (req, res) => {
  try {
    const guides = await getStoredGuides();
    const showAll = req.query.all === "true";
    if (!showAll) {
      return res.json(guides.filter((g: any) => g.isActive !== false));
    }
    return res.json(guides);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch resource guides" });
  }
});

const guideSchema = z.object({
  title: z.string().trim().min(3),
  slug: z.string().trim().min(2).optional(),
  description: z.string().trim().min(5),
  category: z.string().trim().default("General"),
  type: z.string().trim().default("PDF"),
  downloadUrl: z.string().trim().refine(
    (url) => (url.startsWith("/") && !url.includes("..")) || url.startsWith("https://") || url.startsWith("http://"),
    { message: "downloadUrl must be a valid path starting with / or an absolute URL" }
  ),
  coverImage: z.string().trim().optional(),
  coverImageAlt: z.string().trim().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().default(true),
});

cmsRouter.post("/guides", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isSuper = req.user?.roles.includes("super_admin");
    if (!isSuper) return res.status(403).json({ error: "Platform guides require Super Admin access." });

    const data = guideSchema.parse(req.body);
    const guides = await getStoredGuides();
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const newGuide = {
      id: `guide-${Date.now()}`,
      slug,
      title: data.title,
      description: data.description,
      category: data.category,
      type: data.type,
      downloadUrl: data.downloadUrl,
      coverImage: data.coverImage || "/images/resources/guide-compliance.jpg",
      coverImageAlt: data.coverImageAlt || data.title,
      order: data.order ?? guides.length + 1,
      isActive: data.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...guides, newGuide];
    await prisma.cmsPage.upsert({
      where: { slug: "system-resource-guides" },
      create: { id: "system-resource-guides", slug: "system-resource-guides", title: "Resource Guides & Playbooks", content: { guides: updated }, published: true },
      update: { content: { guides: updated } },
    });
    return res.status(201).json(newGuide);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    return res.status(500).json({ error: err.message || "Failed to create resource guide" });
  }
});

cmsRouter.put("/guides/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isSuper = req.user?.roles.includes("super_admin");
    if (!isSuper) return res.status(403).json({ error: "Platform guides require Super Admin access." });

    const { id } = req.params;
    const guides = await getStoredGuides();
    const index = guides.findIndex((g: any) => g.id === id);
    if (index === -1) return res.status(404).json({ error: "Resource guide not found" });

    const updatedGuide = {
      ...guides[index],
      ...req.body,
      id,
      updatedAt: new Date().toISOString(),
    };
    guides[index] = updatedGuide;

    await prisma.cmsPage.update({
      where: { slug: "system-resource-guides" },
      data: { content: { guides } },
    });
    return res.json(updatedGuide);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update resource guide" });
  }
});

cmsRouter.delete("/guides/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isSuper = req.user?.roles.includes("super_admin");
    if (!isSuper) return res.status(403).json({ error: "Platform guides require Super Admin access." });

    const { id } = req.params;
    const guides = await getStoredGuides();
    const updated = guides.filter((g: any) => g.id !== id);

    await prisma.cmsPage.update({
      where: { slug: "system-resource-guides" },
      data: { content: { guides } },
    });
    return res.json({ success: true, message: "Resource guide deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete resource guide" });
  }
});

cmsRouter.patch("/guides/reorder", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isSuper = req.user?.roles.includes("super_admin");
    if (!isSuper) return res.status(403).json({ error: "Platform guides require Super Admin access." });

    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });

    const guides = await getStoredGuides();
    const reordered = [...guides].sort((a: any, b: any) => {
      const idxA = orderedIds.indexOf(a.id);
      const idxB = orderedIds.indexOf(b.id);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    }).map((item: any, idx: number) => ({ ...item, order: idx + 1 }));

    await prisma.cmsPage.update({
      where: { slug: "system-resource-guides" },
      data: { content: { guides: reordered } },
    });
    return res.json({ success: true, guides: reordered });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to reorder resource guides" });
  }
});

