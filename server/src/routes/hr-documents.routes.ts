import { Router, Response } from "express";
import { prisma, rawPrisma } from "../prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { documentService } from "../services/document.service.js";
import { ContractLifecycleService } from "../services/contract-lifecycle.service.js";

export const hrDocumentsRouter = Router();

function slugifyDocCode(name: string): string {
  const base = String(name || "ITEM")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base || "ITEM"}_${suffix}`;
}

function extractPlaceholders(content: string, explicit?: any): string[] {
  if (Array.isArray(explicit) && explicit.length > 0) {
    return Array.from(new Set(explicit.map((x) => String(x).trim()).filter(Boolean)));
  }
  if (typeof explicit === "string" && explicit.trim()) {
    return Array.from(
      new Set(
        explicit
          .split(",")
          .map((s) => s.replace(/^\{\{|\}\}$/g, "").trim())
          .filter(Boolean)
      )
    );
  }
  const matches = Array.from(String(content || "").matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g));
  return Array.from(new Set(matches.map((m) => m[1])));
}

function parseDefaultValues(raw: any): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return {};
}

// =========================================================================
// 1. DOCUMENT CATEGORIES
// =========================================================================
hrDocumentsRouter.get("/categories", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const [categories, companyDocs, templates] = await Promise.all([
      prisma.documentCategory.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.companyDocument.findMany({
        where: { tenantId },
        select: { id: true, category: true },
      }),
      prisma.documentTemplate.findMany({
        where: { tenantId },
        select: { id: true, categoryId: true, category: true },
      }),
    ]);

    const formatted = categories.map((cat) => {
      const nameLower = cat.name.toLowerCase();
      const docCount = companyDocs.filter(
        (d) => (d.category || "").toLowerCase() === nameLower
      ).length;
      const tplCount = templates.filter(
        (t) => t.categoryId === cat.id || (t.category || "").toLowerCase() === nameLower
      ).length;

      return {
        ...cat,
        color: cat.color || "#3B82F6",
        icon: cat.icon || "folder",
        isMandatory: Boolean(cat.isMandatory),
        status: cat.isActive ? "active" : "inactive",
        documentsCount: docCount + tplCount,
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/categories", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { name, code, description, color, icon, isMandatory, status, isActive } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: "Category name is required." });

    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : true;

    const created = await prisma.documentCategory.create({
      data: {
        tenantId,
        name: String(name).trim(),
        code: code ? String(code).trim().toUpperCase() : slugifyDocCode(name),
        description: description ? String(description).trim() : null,
        color: color ? String(color).trim() : "#3B82F6",
        icon: icon ? String(icon).trim() : "folder",
        isMandatory: Boolean(isMandatory),
        isActive: activeFlag,
      },
    });
    return res.status(201).json({
      ...created,
      status: created.isActive ? "active" : "inactive",
      documentsCount: 0,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.put("/categories/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.documentCategory.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Document category not found." });

    const { name, description, color, icon, isMandatory, status, isActive } = req.body || {};
    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : undefined;

    const updated = await prisma.documentCategory.update({
      where: { id: existing.id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(color ? { color: String(color).trim() } : {}),
        ...(icon ? { icon: String(icon).trim() } : {}),
        ...(isMandatory !== undefined ? { isMandatory: Boolean(isMandatory) } : {}),
        ...(activeFlag !== undefined ? { isActive: activeFlag } : {}),
      },
    });
    return res.json({ ...updated, status: updated.isActive ? "active" : "inactive" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.patch("/categories/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.documentCategory.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Document category not found." });

    const nextActive =
      req.body?.isActive !== undefined
        ? Boolean(req.body.isActive)
        : req.body?.status !== undefined
        ? String(req.body.status).toLowerCase() !== "inactive"
        : !existing.isActive;

    const updated = await prisma.documentCategory.update({
      where: { id: existing.id },
      data: { isActive: nextActive },
    });
    return res.json({ ...updated, status: updated.isActive ? "active" : "inactive" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.delete("/categories/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.documentCategory.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Document category not found." });
    await prisma.documentCategory.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 2. CONTRACT TYPES (Placed BEFORE /:id to prevent Express route shadowing!)
// =========================================================================
hrDocumentsRouter.get("/contract-types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const types = await prisma.contractType.findMany({
      where: { tenantId },
      include: { _count: { select: { employeeContracts: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(
      types.map((t) => ({
        ...t,
        contractsCount: t._count?.employeeContracts ?? 0,
        status: String(t.status || "active").toLowerCase() === "inactive" ? "inactive" : "active",
      }))
    );
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/contract-types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const {
      name,
      description,
      defaultDurationMonths,
      probationPeriodMonths,
      noticePeriodDays,
      isRenewable,
      status,
    } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: "Contract type name is required." });

    const created = await prisma.contractType.create({
      data: {
        tenantId,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        defaultDurationMonths:
          defaultDurationMonths !== undefined && defaultDurationMonths !== "" && defaultDurationMonths !== null
            ? Number(defaultDurationMonths)
            : null,
        probationPeriodMonths:
          probationPeriodMonths !== undefined && probationPeriodMonths !== ""
            ? Number(probationPeriodMonths)
            : 3,
        noticePeriodDays:
          noticePeriodDays !== undefined && noticePeriodDays !== ""
            ? Number(noticePeriodDays)
            : 30,
        isRenewable: Boolean(isRenewable),
        status: String(status || "active").toLowerCase() === "inactive" ? "inactive" : "active",
      },
      include: { _count: { select: { employeeContracts: true } } },
    });
    return res.status(201).json({
      ...created,
      contractsCount: created._count?.employeeContracts ?? 0,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.put("/contract-types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.contractType.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Contract type not found." });

    const {
      name,
      description,
      defaultDurationMonths,
      probationPeriodMonths,
      noticePeriodDays,
      isRenewable,
      status,
    } = req.body || {};

    const updated = await prisma.contractType.update({
      where: { id: existing.id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(defaultDurationMonths !== undefined
          ? {
              defaultDurationMonths:
                defaultDurationMonths !== "" && defaultDurationMonths !== null
                  ? Number(defaultDurationMonths)
                  : null,
            }
          : {}),
        ...(probationPeriodMonths !== undefined && probationPeriodMonths !== ""
          ? { probationPeriodMonths: Number(probationPeriodMonths) }
          : {}),
        ...(noticePeriodDays !== undefined && noticePeriodDays !== ""
          ? { noticePeriodDays: Number(noticePeriodDays) }
          : {}),
        ...(isRenewable !== undefined ? { isRenewable: Boolean(isRenewable) } : {}),
        ...(status
          ? { status: String(status).toLowerCase() === "inactive" ? "inactive" : "active" }
          : {}),
      },
      include: { _count: { select: { employeeContracts: true } } },
    });
    return res.json({
      ...updated,
      contractsCount: updated._count?.employeeContracts ?? 0,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.patch("/contract-types/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.contractType.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Contract type not found." });

    const nextStatus =
      req.body?.status !== undefined
        ? String(req.body.status).toLowerCase() === "inactive"
          ? "inactive"
          : "active"
        : existing.status === "active"
        ? "inactive"
        : "active";

    const updated = await prisma.contractType.update({
      where: { id: existing.id },
      data: { status: nextStatus },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.delete("/contract-types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.contractType.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Contract type not found." });
    await prisma.contractType.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 3. DOCUMENT TEMPLATES
// =========================================================================
function formatTemplateRecord(t: any, catMap: Map<string, any>) {
  const catObj = (t.categoryId && catMap.get(t.categoryId)) ||
    Array.from(catMap.values()).find((c) => c.name.toLowerCase() === (t.category || "").toLowerCase()) ||
    null;
  const placeholders = extractPlaceholders(t.content, t.tokens);
  const defaultValues = parseDefaultValues(t.defaultValues);
  return {
    id: t.id,
    tenantId: t.tenantId,
    title: t.title,
    name: t.title,
    code: t.code,
    categoryId: t.categoryId || catObj?.id || null,
    category: catObj?.name || t.category || "General",
    categoryColor: catObj?.color || "#F59E0B",
    categoryIcon: catObj?.icon || "file-text",
    description: t.description || "",
    type: t.type,
    fileFormat: (t.fileFormat || "PDF").toUpperCase(),
    isDefault: Boolean(t.isDefault),
    content: t.content || "",
    contentLength: String(t.content || "").length,
    placeholders,
    tokens: placeholders,
    defaultValues,
    isActive: t.isActive !== false,
    status: t.isActive === false ? "inactive" : "active",
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

hrDocumentsRouter.get("/templates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const [templates, categories] = await Promise.all([
      prisma.documentTemplate.findMany({
        where: { tenantId, type: { not: "contract" } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.documentCategory.findMany({
        where: { tenantId },
        select: { id: true, name: true, color: true, icon: true },
      }),
    ]);
    const catMap = new Map(categories.map((c) => [c.id, c]));
    return res.json(templates.map((t) => formatTemplateRecord(t, catMap)));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.get("/templates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const [template, categories] = await Promise.all([
      prisma.documentTemplate.findFirst({ where: { id: req.params.id, tenantId } }),
      prisma.documentCategory.findMany({
        where: { tenantId },
        select: { id: true, name: true, color: true, icon: true },
      }),
    ]);
    if (!template) return res.status(404).json({ error: "Document template not found." });
    const catMap = new Map(categories.map((c) => [c.id, c]));
    return res.json(formatTemplateRecord(template, catMap));
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/templates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const {
      title,
      name,
      code,
      categoryId,
      category,
      description,
      fileFormat,
      isDefault,
      content,
      placeholders,
      tokens,
      defaultValues,
      status,
      isActive,
    } = req.body || {};

    const templateTitle = String(title || name || "").trim();
    if (!templateTitle) return res.status(400).json({ error: "Template name is required." });
    if (!content?.trim()) return res.status(400).json({ error: "Template content is required." });

    let resolvedCategory = category || "General";
    if (categoryId) {
      const cat = await prisma.documentCategory.findFirst({
        where: { id: categoryId, tenantId },
        select: { name: true },
      });
      if (cat) resolvedCategory = cat.name;
    }

    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : true;

    const extracted = extractPlaceholders(content, placeholders ?? tokens);
    const parsedDefaults = parseDefaultValues(defaultValues);

    if (isDefault && categoryId) {
      await prisma.documentTemplate.updateMany({
        where: { tenantId, categoryId },
        data: { isDefault: false },
      });
    }

    const created = await prisma.documentTemplate.create({
      data: {
        tenantId,
        categoryId: categoryId || null,
        title: templateTitle,
        code: code ? String(code).trim().toUpperCase() : slugifyDocCode(templateTitle),
        category: resolvedCategory,
        description: description ? String(description).trim() : null,
        type: "letter",
        fileFormat: String(fileFormat || "PDF").toUpperCase(),
        isDefault: Boolean(isDefault),
        content: String(content),
        tokens: extracted,
        defaultValues: parsedDefaults,
        isActive: activeFlag,
      },
    });
    return res.status(201).json(formatTemplateRecord(created, new Map()));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.put("/templates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.documentTemplate.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Document template not found." });

    const {
      title,
      name,
      categoryId,
      category,
      description,
      fileFormat,
      isDefault,
      content,
      placeholders,
      tokens,
      defaultValues,
      status,
      isActive,
    } = req.body || {};

    let resolvedCategory = category || existing.category;
    if (categoryId) {
      const cat = await prisma.documentCategory.findFirst({
        where: { id: categoryId, tenantId },
        select: { name: true },
      });
      if (cat) resolvedCategory = cat.name;
    }

    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : undefined;

    const nextContent = content !== undefined ? String(content) : existing.content;
    const extracted =
      placeholders !== undefined || tokens !== undefined
        ? extractPlaceholders(nextContent, placeholders ?? tokens)
        : undefined;

    if (isDefault && (categoryId || existing.categoryId)) {
      await prisma.documentTemplate.updateMany({
        where: { tenantId, categoryId: categoryId || existing.categoryId, id: { not: existing.id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.documentTemplate.update({
      where: { id: existing.id },
      data: {
        ...(title || name ? { title: String(title || name).trim() } : {}),
        ...(categoryId !== undefined ? { categoryId: categoryId || null, category: resolvedCategory } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(fileFormat ? { fileFormat: String(fileFormat).toUpperCase() } : {}),
        ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
        ...(content !== undefined ? { content: nextContent } : {}),
        ...(extracted !== undefined ? { tokens: extracted } : {}),
        ...(defaultValues !== undefined ? { defaultValues: parseDefaultValues(defaultValues) } : {}),
        ...(activeFlag !== undefined ? { isActive: activeFlag } : {}),
      },
    });
    return res.json(formatTemplateRecord(updated, new Map()));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.patch("/templates/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.documentTemplate.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Document template not found." });

    const nextActive =
      req.body?.isActive !== undefined
        ? Boolean(req.body.isActive)
        : req.body?.status !== undefined
        ? String(req.body.status).toLowerCase() !== "inactive"
        : !existing.isActive;

    const updated = await prisma.documentTemplate.update({
      where: { id: existing.id },
      data: { isActive: nextActive },
    });
    return res.json(formatTemplateRecord(updated, new Map()));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.delete("/templates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.documentTemplate.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Document template not found." });
    await prisma.documentTemplate.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 4. CONTRACT TEMPLATES (type = "contract")
// =========================================================================
function extractClauses(content: string, explicit?: any): string[] {
  if (Array.isArray(explicit) && explicit.length > 0) {
    return Array.from(new Set(explicit.map((x) => String(x).trim()).filter(Boolean)));
  }
  if (typeof explicit === "string" && explicit.trim()) {
    return Array.from(
      new Set(
        explicit
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
  }
  // Auto-detect uppercase section headings like "CONFIDENTIALITY:" or "TERMINATION:"
  const matches = Array.from(String(content || "").matchAll(/^([A-Z][A-Z0-9\s&-]{2,32}):$/gm));
  return Array.from(
    new Set(
      matches.map((m) =>
        m[1]
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim()
      )
    )
  );
}

function formatContractTemplateRecord(t: any, typeMap: Map<string, any>) {
  const ctObj =
    (t.categoryId && typeMap.get(t.categoryId)) ||
    Array.from(typeMap.values()).find((c) => c.name.toLowerCase() === (t.category || "").toLowerCase()) ||
    null;
  const variables = extractPlaceholders(t.content, t.tokens);
  const clauses = extractClauses(t.content, t.clauses);
  return {
    id: t.id,
    tenantId: t.tenantId,
    title: t.title,
    name: t.title,
    code: t.code,
    contractTypeId: t.categoryId || ctObj?.id || null,
    contractType: ctObj?.name || t.category || "General",
    description: t.description || "",
    isDefault: Boolean(t.isDefault),
    content: t.content || "",
    contentLength: String(t.content || "").length,
    variables,
    clauses,
    isActive: t.isActive !== false,
    status: t.isActive === false ? "inactive" : "active",
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

hrDocumentsRouter.get("/contract-templates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const [templates, contractTypes] = await Promise.all([
      prisma.documentTemplate.findMany({
        where: { tenantId, type: "contract" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contractType.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
    ]);
    const typeMap = new Map(contractTypes.map((c) => [c.id, c]));
    return res.json(templates.map((t) => formatContractTemplateRecord(t, typeMap)));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.get("/contract-templates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const [template, contractTypes] = await Promise.all([
      prisma.documentTemplate.findFirst({ where: { id: req.params.id, tenantId, type: "contract" } }),
      prisma.contractType.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    ]);
    if (!template) return res.status(404).json({ error: "Contract template not found." });
    const typeMap = new Map(contractTypes.map((c) => [c.id, c]));
    return res.json(formatContractTemplateRecord(template, typeMap));
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/contract-templates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const {
      title,
      name,
      contractTypeId,
      contractType,
      description,
      isDefault,
      content,
      variables,
      clauses,
      status,
      isActive,
    } = req.body || {};

    const templateTitle = String(title || name || "").trim();
    if (!templateTitle) return res.status(400).json({ error: "Template name is required." });
    if (!content?.trim()) return res.status(400).json({ error: "Template content is required." });

    let resolvedTypeName = contractType || "General";
    if (contractTypeId) {
      const ct = await prisma.contractType.findFirst({
        where: { id: contractTypeId, tenantId },
        select: { name: true },
      });
      if (ct) resolvedTypeName = ct.name;
    }

    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : true;

    const extractedVars = extractPlaceholders(content, variables);
    const extractedClauses = extractClauses(content, clauses);

    if (isDefault && contractTypeId) {
      await prisma.documentTemplate.updateMany({
        where: { tenantId, type: "contract", categoryId: contractTypeId },
        data: { isDefault: false },
      });
    }

    const created = await prisma.documentTemplate.create({
      data: {
        tenantId,
        categoryId: contractTypeId || null,
        title: templateTitle,
        code: slugifyDocCode(templateTitle),
        category: resolvedTypeName,
        description: description ? String(description).trim() : null,
        type: "contract",
        fileFormat: "PDF",
        isDefault: Boolean(isDefault),
        content: String(content),
        tokens: extractedVars,
        clauses: extractedClauses,
        isActive: activeFlag,
      },
    });
    return res.status(201).json(formatContractTemplateRecord(created, new Map()));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.put("/contract-templates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.documentTemplate.findFirst({
      where: { id: req.params.id, tenantId, type: "contract" },
    });
    if (!existing) return res.status(404).json({ error: "Contract template not found." });

    const {
      title,
      name,
      contractTypeId,
      contractType,
      description,
      isDefault,
      content,
      variables,
      clauses,
      status,
      isActive,
    } = req.body || {};

    let resolvedTypeName = contractType || existing.category;
    if (contractTypeId) {
      const ct = await prisma.contractType.findFirst({
        where: { id: contractTypeId, tenantId },
        select: { name: true },
      });
      if (ct) resolvedTypeName = ct.name;
    }

    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : undefined;

    const nextContent = content !== undefined ? String(content) : existing.content;
    const extractedVars =
      variables !== undefined ? extractPlaceholders(nextContent, variables) : undefined;
    const extractedClauses =
      clauses !== undefined
        ? extractClauses(nextContent, clauses)
        : content !== undefined
        ? extractClauses(nextContent)
        : undefined;

    if (isDefault && (contractTypeId || existing.categoryId)) {
      await prisma.documentTemplate.updateMany({
        where: {
          tenantId,
          type: "contract",
          categoryId: contractTypeId || existing.categoryId,
          id: { not: existing.id },
        },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.documentTemplate.update({
      where: { id: existing.id },
      data: {
        ...(title || name ? { title: String(title || name).trim() } : {}),
        ...(contractTypeId !== undefined
          ? { categoryId: contractTypeId || null, category: resolvedTypeName }
          : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
        ...(content !== undefined ? { content: nextContent } : {}),
        ...(extractedVars !== undefined ? { tokens: extractedVars } : {}),
        ...(extractedClauses !== undefined ? { clauses: extractedClauses } : {}),
        ...(activeFlag !== undefined ? { isActive: activeFlag } : {}),
      },
    });
    return res.json(formatContractTemplateRecord(updated, new Map()));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.patch("/contract-templates/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.documentTemplate.findFirst({
      where: { id: req.params.id, tenantId, type: "contract" },
    });
    if (!existing) return res.status(404).json({ error: "Contract template not found." });
    const nextActive =
      req.body?.isActive !== undefined
        ? Boolean(req.body.isActive)
        : req.body?.status !== undefined
        ? String(req.body.status).toLowerCase() !== "inactive"
        : !existing.isActive;
    const updated = await prisma.documentTemplate.update({
      where: { id: existing.id },
      data: { isActive: nextActive },
    });
    return res.json(formatContractTemplateRecord(updated, new Map()));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.delete("/contract-templates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.documentTemplate.findFirst({
      where: { id: req.params.id, tenantId, type: "contract" },
    });
    if (!existing) return res.status(404).json({ error: "Contract template not found." });
    await prisma.documentTemplate.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 5. HR DOCUMENTS (COMPANY DOCUMENTS VAULT)
// =========================================================================
function normalizeHrDocStatus(rawStatus: string | null | undefined, expiryDate?: Date | null): string {
  const s = String(rawStatus || "published").toLowerCase().trim();
  let mapped = s;
  if (s === "verified" || s === "active") mapped = "published";
  else if (s === "pending_signature" || s === "pending") mapped = "under_review";
  else if (!["draft", "under_review", "approved", "published", "archived", "expired"].includes(s)) {
    mapped = "published";
  }

  if (expiryDate && mapped === "published") {
    const todayStr = new Date().toISOString().split("T")[0];
    const expStr = new Date(expiryDate).toISOString().split("T")[0];
    if (expStr < todayStr) return "expired";
  }
  return mapped;
}

function formatHrDocument(doc: any, catMap: Map<string, any>) {
  const catObj =
    (doc.categoryId && catMap.get(doc.categoryId)) ||
    Array.from(catMap.values()).find(
      (c) => c.name.toLowerCase() === String(doc.category || "").toLowerCase()
    ) ||
    null;

  const effectiveStr = doc.effectiveDate
    ? new Date(doc.effectiveDate).toISOString().split("T")[0]
    : "";
  const expiryStr = doc.expiryDate
    ? new Date(doc.expiryDate).toISOString().split("T")[0]
    : "";
  const updatedStr = doc.updatedAt
    ? new Date(doc.updatedAt).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  return {
    id: doc.id,
    documentCode: doc.documentCode,
    title: doc.title,
    description: doc.notes || "",
    notes: doc.notes || "",
    categoryId: doc.categoryId || catObj?.id || null,
    category: catObj?.name || doc.category || "General",
    categoryColor: catObj?.color || "#3B82F6",
    categoryIcon: catObj?.icon || "folder",
    fileUrl: doc.fileUrl || "",
    fileName: doc.fileName || "",
    fileSize: doc.fileSize || "",
    fileType: doc.fileType || "",
    status: normalizeHrDocStatus(doc.status, doc.expiryDate),
    requiresAcknowledgment: Boolean(doc.requiresSignature),
    requiresSignature: Boolean(doc.requiresSignature),
    version: doc.version || "1.0",
    downloadCount: Number(doc.downloadCount || 0),
    effectiveDate: effectiveStr,
    expiryDate: expiryStr,
    lastUpdate: effectiveStr || updatedStr,
    uploadedByName: doc.uploadedByName || "Company",
    uploadedByEmail: doc.uploadedByEmail || "",
    uploadedByAvatar: doc.uploadedByAvatar || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// Documents Vault (Company Documents) — NOTE: /:id routes moved to bottom of file!
hrDocumentsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const [docs, categories] = await Promise.all([
      prisma.companyDocument.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.documentCategory.findMany({
        where: { tenantId },
        select: { id: true, name: true, color: true, icon: true },
      }),
    ]);
    const catMap = new Map(categories.map((c) => [c.id, c]));
    return res.json(docs.map((d) => formatHrDocument(d, catMap)));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const {
      title,
      categoryId,
      category,
      description,
      notes,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      effectiveDate,
      expiryDate,
      requiresAcknowledgment,
      requiresSignature,
      status,
      version,
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "Document title is required." });
    }

    let resolvedCategory = category || "General";
    const categories = await prisma.documentCategory.findMany({
      where: { tenantId },
      select: { id: true, name: true, color: true, icon: true },
    });
    const catMap = new Map(categories.map((c) => [c.id, c]));
    if (categoryId && catMap.has(categoryId)) {
      resolvedCategory = catMap.get(categoryId)!.name;
    }

    let uploadedByName = req.user?.email?.split("@")[0] || "Company";
    let uploadedByEmail = req.user?.email || "";
    let uploadedByAvatar: string | null = null;
    if (req.user?.userId) {
      const me = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { email: true, profile: { select: { fullName: true, avatarUrl: true } } },
      });
      if (me) {
        uploadedByName = me.profile?.fullName || uploadedByName;
        uploadedByEmail = me.email || uploadedByEmail;
        uploadedByAvatar = me.profile?.avatarUrl || null;
      }
    }

    const reqAck =
      requiresAcknowledgment !== undefined
        ? Boolean(requiresAcknowledgment)
        : Boolean(requiresSignature);

    const created = await prisma.companyDocument.create({
      data: {
        tenantId,
        documentCode: `DOC-${Date.now().toString().slice(-6)}`,
        title: String(title).trim(),
        categoryId: categoryId || null,
        category: resolvedCategory,
        notes: description !== undefined ? String(description).trim() || null : notes || null,
        fileUrl: fileUrl ? String(fileUrl).trim() : null,
        fileName: fileName ? String(fileName).trim() : `${String(title).trim().replace(/\s+/g, "_")}.pdf`,
        fileSize: fileSize ? String(fileSize) : "1.0 MB",
        fileType: fileType ? String(fileType) : "application/pdf",
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        requiresSignature: reqAck,
        status: status ? String(status).toLowerCase() : "published",
        version: version ? String(version) : "1.0",
        downloadCount: 0,
        uploadedByName,
        uploadedByEmail,
        uploadedByAvatar,
      },
    });
    return res.status(201).json(formatHrDocument(created, catMap));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Employee Contracts Settings
hrDocumentsRouter.get("/contracts/vendors", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const suppliers = await rawPrisma.supplier.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        gstin: true,
        email: true,
        phone: true,
        city: true,
      },
      orderBy: { name: "asc" },
    });
    return res.json(suppliers);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.get("/contracts/settings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const settings = await ContractLifecycleService.getTenantExpirySettings(tenantId);
    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.put("/contracts/settings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const settings = await ContractLifecycleService.updateTenantExpirySettings(tenantId, req.body, actorId);
    return res.json(settings);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Employee Contracts
hrDocumentsRouter.get("/contracts/overview", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const overview = await ContractLifecycleService.getContractOverview(tenantId);
    return res.json(overview);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.get("/contracts", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const contracts = await prisma.employeeContract.findMany({
      where: {
        tenantId,
        ...(req.query.employeeId && req.query.employeeId !== "all"
          ? { employeeId: String(req.query.employeeId) }
          : {}),
        ...(req.query.contractTypeId && req.query.contractTypeId !== "all"
          ? { contractTypeId: String(req.query.contractTypeId) }
          : {}),
      },
      include: {
        contractType: { select: { id: true, name: true } },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = contracts.map((c) => {
      const startStr = new Date(c.startDate).toISOString().split("T")[0];
      const endStr = c.endDate ? new Date(c.endDate).toISOString().split("T")[0] : "";
      return {
        id: c.id,
        contractNumber: c.contractNumber || `EMP-${new Date(c.createdAt).getFullYear()}-${c.id.slice(0, 4).toUpperCase()}`,
        contractTypeId: c.contractTypeId,
        contractType: c.contractType || null,
        title: c.title || c.contractType?.name || "Employment Contract",
        employeeId: c.employeeId,
        employee: c.employee
          ? {
              id: c.employee.id,
              firstName: c.employee.firstName,
              lastName: c.employee.lastName,
              email: c.employee.email,
              employeeCode: c.employee.employeeCode,
              avatarUrl: c.employee.user?.profile?.avatarUrl || null,
            }
          : null,
        startDate: startStr,
        endDate: endStr,
        salary: c.salary !== null && c.salary !== undefined ? Number(c.salary) : 0,
        notes: c.notes || "",
        status: String(c.status || "active").toLowerCase(),
        approvedAt: c.approvedAt ? new Date(c.approvedAt).toISOString().split("T")[0] : "",
        approvedByName: c.approvedByName || "",
        createdAt: c.createdAt,
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/contracts", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { employeeId, contractTypeId, title, startDate, endDate, salary, notes, status } =
      req.body || {};
    if (!employeeId || !startDate) {
      return res.status(400).json({ error: "Employee and Start Date are required." });
    }

    let resolvedTitle = title;
    let noticeDays = 30;
    if (contractTypeId) {
      const ct = await prisma.contractType.findFirst({
        where: { id: contractTypeId, tenantId },
        select: { name: true, noticePeriodDays: true },
      });
      if (ct) {
        if (!resolvedTitle) resolvedTitle = ct.name;
        noticeDays = ct.noticePeriodDays ?? 30;
      }
    }

    const year = new Date().getFullYear();
    const count = await prisma.employeeContract.count({ where: { tenantId } });
    const contractNumber = `EMP-${year}-${String(1101 + count)}`;
    const normalizedStatus = String(status || "active").toLowerCase();

    const created = await prisma.employeeContract.create({
      data: {
        tenantId,
        employeeId,
        contractTypeId: contractTypeId || null,
        contractNumber,
        title: String(resolvedTitle || "Employment Contract").trim(),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        salary: salary !== undefined && salary !== "" ? Number(salary) : 0,
        noticePeriodDays: noticeDays,
        notes: notes ? String(notes).trim() : null,
        status: normalizedStatus,
        approvedAt: normalizedStatus === "active" ? new Date() : null,
        approvedByName:
          normalizedStatus === "active"
            ? req.user?.email?.split("@")[0] || "HR Manager"
            : null,
      },
    });
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.patch("/contracts/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.employeeContract.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Employee contract not found." });
    const nextStatus = String(req.body?.status || "active").toLowerCase();
    const updated = await prisma.employeeContract.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        ...(nextStatus === "active" && !existing.approvedAt
          ? {
              approvedAt: new Date(),
              approvedByName: req.user?.email?.split("@")[0] || "HR Manager",
            }
          : {}),
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /contracts/:id/renew (Contract Renewal Lifecycle)
hrDocumentsRouter.post("/contracts/:id/renew", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const result = await ContractLifecycleService.renewContract({
      tenantId,
      actorUserId: actorId,
      predecessorId: req.params.id,
      renewal: req.body,
    });
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /contracts/:id/convert (Convert to Permanent Employment)
hrDocumentsRouter.post("/contracts/:id/convert", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const result = await ContractLifecycleService.convertContractToPermanent({
      tenantId,
      contractId: req.params.id,
      actorUserId: actorId,
      salary: req.body.salary,
      notes: req.body.notes,
    });
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /contracts/:id/amend (Amend Active Contract)
hrDocumentsRouter.post("/contracts/:id/amend", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const result = await ContractLifecycleService.amendContract({
      tenantId,
      contractId: req.params.id,
      actorUserId: actorId,
      amendment: req.body,
    });
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /contracts/:id/terminate (Terminate Contract)
hrDocumentsRouter.post("/contracts/:id/terminate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const result = await ContractLifecycleService.terminateContract({
      tenantId,
      contractId: req.params.id,
      actorUserId: actorId,
      reason: req.body.reason,
    });
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /contracts/:id/payable-voucher (Workflow B: Accounts Payable Purchase Voucher)
hrDocumentsRouter.post("/contracts/:id/payable-voucher", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const { period, amount, invoiceNumber, notes } = req.body;
    if (!period || amount === undefined) {
      return res.status(400).json({ error: "Billing period and amount are required." });
    }
    const voucher = await ContractLifecycleService.createVendorPayableVoucher({
      tenantId,
      contractId: req.params.id,
      period,
      amount: Number(amount),
      invoiceNumber,
      notes,
      actorUserId: actorId,
    });
    return res.status(201).json(voucher);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.get("/contracts/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const contract = await documentService.getContract(tenantId, req.params.id);
    return res.json(contract);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

hrDocumentsRouter.put("/contracts/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.employeeContract.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Employee contract not found." });

    const {
      employeeId,
      contractTypeId,
      title,
      startDate,
      endDate,
      salary,
      notes,
      status,
    } = req.body || {};

    let resolvedTitle = title;
    if (contractTypeId && !resolvedTitle) {
      const ct = await prisma.contractType.findFirst({
        where: { id: contractTypeId, tenantId },
        select: { name: true },
      });
      if (ct) resolvedTitle = ct.name;
    }

    const updated = await prisma.employeeContract.update({
      where: { id: existing.id },
      data: {
        ...(employeeId ? { employeeId } : {}),
        ...(contractTypeId !== undefined ? { contractTypeId: contractTypeId || null } : {}),
        ...(resolvedTitle ? { title: String(resolvedTitle).trim() } : {}),
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
        ...(salary !== undefined && salary !== "" ? { salary: Number(salary) } : {}),
        ...(notes !== undefined ? { notes: notes ? String(notes).trim() : null } : {}),
        ...(status ? { status: String(status).toLowerCase() } : {}),
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.delete("/contracts/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const result = await documentService.deleteContract(tenantId, req.params.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Acknowledgements (Full CRUD + Acknowledge)
function formatAckRecord(a: any) {
  const todayStr = new Date().toISOString().split("T")[0];
  const dueStr = a.dueDate ? new Date(a.dueDate).toISOString().split("T")[0] : "";
  const ackStr = a.acknowledgedAt ? new Date(a.acknowledgedAt).toISOString().split("T")[0] : "";
  const rawStatus = String(a.status || "pending").toLowerCase();
  let computedStatus = rawStatus;
  let daysOverdue = 0;

  if (rawStatus !== "acknowledged" && rawStatus !== "exempted" && dueStr && dueStr < todayStr) {
    computedStatus = "overdue";
    const diffMs = new Date(todayStr).getTime() - new Date(dueStr).getTime();
    daysOverdue = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  return {
    id: a.id,
    documentId: a.documentId,
    employeeId: a.employeeId,
    status: computedStatus,
    rawStatus,
    dueDate: dueStr,
    daysOverdue,
    acknowledgedAt: ackStr,
    assignedAt: new Date(a.createdAt).toISOString().split("T")[0],
    assignedByName: a.assignedByName || "HR Manager",
    assignedByEmail: a.assignedByEmail || "",
    assignedByAvatar: a.assignedByAvatar || null,
    comments: a.comments || "",
    note: a.comments || "",
    document: a.document
      ? { id: a.document.id, title: a.document.title, fileUrl: a.document.fileUrl || "" }
      : null,
    employee: a.employee
      ? {
          id: a.employee.id,
          firstName: a.employee.firstName,
          lastName: a.employee.lastName,
          email: a.employee.email,
          avatarUrl: a.employee.user?.profile?.avatarUrl || null,
        }
      : null,
  };
}

const ACK_INCLUDE = {
  document: { select: { id: true, title: true, fileUrl: true } },
  employee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      user: { select: { profile: { select: { avatarUrl: true } } } },
    },
  },
};

hrDocumentsRouter.get("/acknowledgements", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const acks = await prisma.documentAcknowledgement.findMany({
      where: {
        tenantId,
        ...(req.query.documentId && req.query.documentId !== "all"
          ? { documentId: String(req.query.documentId) }
          : {}),
        ...(req.query.employeeId && req.query.employeeId !== "all"
          ? { employeeId: String(req.query.employeeId) }
          : {}),
      },
      include: ACK_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return res.json(acks.map(formatAckRecord));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/acknowledgements", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { documentId, employeeId, dueDate, note, comments, status } = req.body || {};
    if (!documentId || !employeeId) {
      return res.status(400).json({ error: "Document and User are required." });
    }

    let assignedByName = req.user?.email?.split("@")[0] || "HR Manager";
    let assignedByEmail = req.user?.email || "";
    let assignedByAvatar: string | null = null;
    if (req.user?.userId) {
      const me = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { email: true, profile: { select: { fullName: true, avatarUrl: true } } },
      });
      if (me) {
        assignedByName = me.profile?.fullName || assignedByName;
        assignedByEmail = me.email || assignedByEmail;
        assignedByAvatar = me.profile?.avatarUrl || null;
      }
    }

    const created = await prisma.documentAcknowledgement.create({
      data: {
        tenantId,
        documentId,
        employeeId,
        status: String(status || "pending").toLowerCase(),
        dueDate: dueDate ? new Date(dueDate) : null,
        comments: note ?? comments ?? null,
        assignedByName,
        assignedByEmail,
        assignedByAvatar,
      },
      include: ACK_INCLUDE,
    });
    return res.status(201).json(formatAckRecord(created));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.put("/acknowledgements/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.documentAcknowledgement.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Acknowledgment not found." });

    const { documentId, employeeId, dueDate, status, note, comments } = req.body || {};
    const nextStatus = status ? String(status).toLowerCase() : existing.status;

    const updated = await prisma.documentAcknowledgement.update({
      where: { id: existing.id },
      data: {
        ...(documentId ? { documentId } : {}),
        ...(employeeId ? { employeeId } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        status: nextStatus,
        ...(nextStatus === "acknowledged" && !existing.acknowledgedAt
          ? { acknowledgedAt: new Date() }
          : {}),
        ...(note !== undefined || comments !== undefined
          ? { comments: (note ?? comments) || null }
          : {}),
      },
      include: ACK_INCLUDE,
    });
    return res.json(formatAckRecord(updated));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.patch("/acknowledgements/:id/acknowledge", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.documentAcknowledgement.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Acknowledgment not found." });

    const noteText = req.body?.note ?? req.body?.comments;
    const updated = await prisma.documentAcknowledgement.update({
      where: { id: existing.id },
      data: {
        status: "acknowledged",
        acknowledgedAt: new Date(),
        ...(noteText !== undefined ? { comments: String(noteText).trim() || existing.comments } : {}),
      },
      include: ACK_INCLUDE,
    });
    return res.json(formatAckRecord(updated));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.delete("/acknowledgements/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.documentAcknowledgement.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Acknowledgment not found." });
    await prisma.documentAcknowledgement.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/acknowledgements/campaign", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const campaign = await documentService.createCampaign(tenantId, req.body);
    return res.status(201).json(campaign);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Letters Center
hrDocumentsRouter.get("/letters", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const letters = await documentService.listGeneratedLetters(tenantId, {
      employeeId: req.query.employeeId as string,
      letterType: req.query.letterType as string,
      search: req.query.search as string,
    });
    return res.json(letters);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/letters/generate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const issuedById = req.user?.userId;
    const letter = await documentService.generateLetter(tenantId, {
      ...req.body,
      issuedById,
    });
    return res.status(201).json(letter);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.get("/letters/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const letter = await documentService.getGeneratedLetter(tenantId, req.params.id);
    return res.json(letter);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

// Company Document /:id routes MUST stay at the bottom so named sub-routes never get shadowed!
hrDocumentsRouter.patch("/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.companyDocument.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Document not found." });
    const nextStatus = String(req.body?.status || "published").toLowerCase();
    const updated = await prisma.companyDocument.update({
      where: { id: existing.id },
      data: { status: nextStatus },
    });
    const categories = await prisma.documentCategory.findMany({
      where: { tenantId },
      select: { id: true, name: true, color: true, icon: true },
    });
    return res.json(formatHrDocument(updated, new Map(categories.map((c) => [c.id, c]))));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/:id/download", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.companyDocument.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Document not found." });
    const updated = await prisma.companyDocument.update({
      where: { id: existing.id },
      data: { downloadCount: { increment: 1 } },
    });
    return res.json({ id: updated.id, downloadCount: updated.downloadCount, fileUrl: updated.fileUrl });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const [doc, categories] = await Promise.all([
      prisma.companyDocument.findFirst({ where: { id: req.params.id, tenantId } }),
      prisma.documentCategory.findMany({
        where: { tenantId },
        select: { id: true, name: true, color: true, icon: true },
      }),
    ]);
    if (!doc) return res.status(404).json({ error: "Document not found." });
    return res.json(formatHrDocument(doc, new Map(categories.map((c) => [c.id, c]))));
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

hrDocumentsRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.companyDocument.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Document not found." });

    const {
      title,
      categoryId,
      category,
      description,
      notes,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      effectiveDate,
      expiryDate,
      requiresAcknowledgment,
      requiresSignature,
      status,
    } = req.body || {};

    const categories = await prisma.documentCategory.findMany({
      where: { tenantId },
      select: { id: true, name: true, color: true, icon: true },
    });
    const catMap = new Map(categories.map((c) => [c.id, c]));
    let resolvedCategory = category || existing.category;
    if (categoryId && catMap.has(categoryId)) {
      resolvedCategory = catMap.get(categoryId)!.name;
    }

    // Bump minor version if a new file is uploaded
    let nextVersion = existing.version || "1.0";
    if (fileUrl && fileUrl !== existing.fileUrl) {
      const parts = nextVersion.split(".");
      const major = parseInt(parts[0] || "1", 10) || 1;
      const minor = (parseInt(parts[1] || "0", 10) || 0) + 1;
      nextVersion = `${major}.${minor}`;
    }

    const reqAck =
      requiresAcknowledgment !== undefined
        ? Boolean(requiresAcknowledgment)
        : requiresSignature !== undefined
        ? Boolean(requiresSignature)
        : undefined;

    const updated = await prisma.companyDocument.update({
      where: { id: existing.id },
      data: {
        ...(title ? { title: String(title).trim() } : {}),
        ...(categoryId !== undefined ? { categoryId: categoryId || null, category: resolvedCategory } : {}),
        ...(description !== undefined || notes !== undefined
          ? { notes: (description ?? notes) ? String(description ?? notes).trim() : null }
          : {}),
        ...(fileUrl !== undefined ? { fileUrl: fileUrl ? String(fileUrl).trim() : null } : {}),
        ...(fileName !== undefined ? { fileName: fileName ? String(fileName).trim() : existing.fileName } : {}),
        ...(fileSize !== undefined ? { fileSize: String(fileSize) } : {}),
        ...(fileType !== undefined ? { fileType: String(fileType) } : {}),
        ...(effectiveDate !== undefined
          ? { effectiveDate: effectiveDate ? new Date(effectiveDate) : null }
          : {}),
        ...(expiryDate !== undefined
          ? { expiryDate: expiryDate ? new Date(expiryDate) : null }
          : {}),
        ...(reqAck !== undefined ? { requiresSignature: reqAck } : {}),
        ...(status ? { status: String(status).toLowerCase() } : {}),
        version: nextVersion,
      },
    });
    return res.json(formatHrDocument(updated, catMap));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.companyDocument.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Document not found." });
    await prisma.companyDocument.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
