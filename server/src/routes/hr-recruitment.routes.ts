import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { getTenantDb } from "../context/tenant-context";
import { RecruitmentService } from "../services/recruitment.service";
import { AuditService } from "../services/audit.service";
import { OutboxService } from "../services/outbox.service";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";

export const hrRecruitmentRouter = Router();

// =========================================================================
// 1. RECRUITMENT MASTERS
// =========================================================================

// --- Job Categories ---
hrRecruitmentRouter.get("/job-categories", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const categories = await db.jobCategory.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
    return res.json(categories);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch job categories." });
  }
});

hrRecruitmentRouter.post("/job-categories", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { name, code, description, isActive } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required." });

    const item = await db.jobCategory.create({
      data: {
        tenantId,
        name: name.trim(),
        code: code?.trim() || `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        description: description || null,
        isActive: isActive !== false,
      },
    });
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create job category." });
  }
});

hrRecruitmentRouter.put("/job-categories/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.jobCategory.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Job category not found." });

    const { name, code, description, isActive } = req.body || {};
    const updated = await db.jobCategory.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(code !== undefined ? { code: String(code).trim() } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update job category." });
  }
});

hrRecruitmentRouter.delete("/job-categories/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.jobCategory.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete job category." });
  }
});

async function saveTenantMeta(db: any, tenantId: string, group: string, key: string, valueJson: any, actorId = "system") {
  const existing = await db.setting.findFirst({
    where: { scope: "TENANT", scopeId: tenantId, group, key },
  });
  if (existing) {
    await db.setting.update({
      where: { id: existing.id },
      data: { valueJson, updatedBy: actorId, version: (existing.version || 1) + 1 },
    });
  } else {
    await db.setting.create({
      data: {
        scope: "TENANT",
        scopeId: tenantId,
        group,
        key,
        valueJson,
        valueType: "json",
        updatedBy: actorId,
      },
    });
  }
}

async function getTenantMetaMap(db: any, tenantId: string, group: string, keys: string[]) {
  if (!keys.length) return new Map<string, any>();
  const rows = await db.setting.findMany({
    where: { scope: "TENANT", scopeId: tenantId, group, key: { in: keys } },
  });
  return new Map<string, any>(rows.map((r: any) => [r.key, r.valueJson]));
}

function extractTemplateVariables(content: string, explicit?: any): string[] {
  if (Array.isArray(explicit) && explicit.length > 0) {
    return Array.from(new Set(explicit.map((v: any) => String(v).trim()).filter(Boolean)));
  }
  if (typeof explicit === "string" && explicit.trim().length > 0) {
    return Array.from(new Set(explicit.split(",").map((v) => v.trim()).filter(Boolean)));
  }
  const matches = Array.from(String(content || "").matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g));
  return Array.from(new Set(matches.map((m) => m[1])));
}

// --- Job Types ---
hrRecruitmentRouter.get("/job-types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const items = await db.jobType.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/job-types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { name, code, description, isActive } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required." });
    const item = await db.jobType.create({
      data: {
        tenantId,
        name: name.trim(),
        code: code?.trim() || `TYPE-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        description: description || null,
        isActive: isActive !== false,
      },
    });
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/job-types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.jobType.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Job type not found." });
    const { name, description, isActive } = req.body;
    const updated = await db.jobType.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/job-types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.jobType.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Job Locations ---
hrRecruitmentRouter.get("/job-locations", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const items = await db.jobLocation.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
    const metaMap = await getTenantMetaMap(db, tenantId, "job_location_meta", items.map((i: any) => i.id));
    return res.json(
      items.map((i: any) => ({
        ...i,
        locationType: metaMap.get(i.id)?.locationType || (i.isRemote ? "Remote" : "On-site"),
      }))
    );
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/job-locations", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const { name, code, address, city, state, country, isRemote, locationType, isActive } = req.body;
    if (!name) return res.status(400).json({ error: "Location name is required." });
    const resolvedRemote =
      isRemote !== undefined
        ? Boolean(isRemote)
        : String(locationType || "").toLowerCase().includes("remote");
    const resolvedType = locationType ? String(locationType).trim() : resolvedRemote ? "Remote" : "On-site";

    const item = await db.jobLocation.create({
      data: {
        tenantId,
        name: name.trim(),
        code: code?.trim() || `LOC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || "India",
        isRemote: resolvedRemote,
        isActive: isActive !== false,
      },
    });
    await saveTenantMeta(db, tenantId, "job_location_meta", item.id, { locationType: resolvedType }, actorId);
    return res.status(201).json({ ...item, locationType: resolvedType });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/job-locations/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const existing = await db.jobLocation.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Job location not found." });
    const { name, address, city, state, country, isRemote, locationType, isActive } = req.body;
    const resolvedRemote =
      isRemote !== undefined
        ? Boolean(isRemote)
        : locationType !== undefined
          ? String(locationType).toLowerCase().includes("remote")
          : undefined;

    const updated = await db.jobLocation.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(address !== undefined ? { address: address || null } : {}),
        ...(city !== undefined ? { city: city || null } : {}),
        ...(state !== undefined ? { state: state || null } : {}),
        ...(country !== undefined ? { country: country || "India" } : {}),
        ...(resolvedRemote !== undefined ? { isRemote: resolvedRemote } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });
    let nextType: string;
    if (locationType !== undefined) {
      nextType = String(locationType).trim() || (updated.isRemote ? "Remote" : "On-site");
      await saveTenantMeta(db, tenantId, "job_location_meta", existing.id, { locationType: nextType }, actorId);
    } else {
      const m = await getTenantMetaMap(db, tenantId, "job_location_meta", [existing.id]);
      nextType = m.get(existing.id)?.locationType || (updated.isRemote ? "Remote" : "On-site");
    }
    return res.json({ ...updated, locationType: nextType });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/job-locations/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.setting.deleteMany({ where: { scope: "TENANT", scopeId: tenantId, group: "job_location_meta", key: req.params.id } });
    await db.jobLocation.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Candidate Sources ---
hrRecruitmentRouter.get("/candidate-sources", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const items = await db.candidateSource.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
    const metaMap = await getTenantMetaMap(db, tenantId, "candidate_source_meta", items.map((i: any) => i.id));
    return res.json(items.map((i: any) => ({ ...i, description: metaMap.get(i.id)?.description || "" })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/candidate-sources", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const { name, code, type, description, isActive } = req.body;
    if (!name) return res.status(400).json({ error: "Source name is required." });
    const item = await db.candidateSource.create({
      data: {
        tenantId,
        name: name.trim(),
        code: code?.trim() || `SRC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        type: type || "direct",
        isActive: isActive !== false,
      },
    });
    if (description !== undefined) {
      await saveTenantMeta(db, tenantId, "candidate_source_meta", item.id, { description: description || "" }, actorId);
    }
    return res.status(201).json({ ...item, description: description || "" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/candidate-sources/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const existing = await db.candidateSource.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Candidate source not found." });
    const { name, type, description, isActive } = req.body;
    const updated = await db.candidateSource.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(type !== undefined ? { type: type || "direct" } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });
    let nextDesc = "";
    if (description !== undefined) {
      nextDesc = description || "";
      await saveTenantMeta(db, tenantId, "candidate_source_meta", existing.id, { description: nextDesc }, actorId);
    } else {
      const m = await getTenantMetaMap(db, tenantId, "candidate_source_meta", [existing.id]);
      nextDesc = m.get(existing.id)?.description || "";
    }
    return res.json({ ...updated, description: nextDesc });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/candidate-sources/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.setting.deleteMany({ where: { scope: "TENANT", scopeId: tenantId, group: "candidate_source_meta", key: req.params.id } });
    await db.candidateSource.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Interview Types ---
hrRecruitmentRouter.get("/interview-types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const items = await db.interviewTypeMaster.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/interview-types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { name, code, description, defaultDuration, isActive } = req.body;
    if (!name) return res.status(400).json({ error: "Type name is required." });
    const item = await db.interviewTypeMaster.create({
      data: {
        tenantId,
        name: name.trim(),
        code: code?.trim() || `INT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        description: description || null,
        defaultDurationMinutes: Number(defaultDuration) || 45,
        isActive: isActive !== false,
      },
    });
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/interview-types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.interviewTypeMaster.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Interview type not found." });
    const { name, description, defaultDuration, isActive } = req.body;
    const updated = await db.interviewTypeMaster.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(defaultDuration !== undefined ? { defaultDurationMinutes: Number(defaultDuration) || 45 } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/interview-types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.interviewTypeMaster.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Interview Rounds ---
hrRecruitmentRouter.get("/interview-rounds", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const items = await db.interviewRoundMaster.findMany({
      where: { tenantId },
      orderBy: [{ createdAt: "desc" }, { sequence: "asc" }],
    });
    const metaMap = await getTenantMetaMap(db, tenantId, "interview_round_meta", items.map((i: any) => i.id));
    const jobIds = Array.from(
      new Set(items.map((i: any) => metaMap.get(i.id)?.jobPostingId).filter(Boolean))
    ) as string[];
    const jobs = jobIds.length
      ? await db.jobPosting.findMany({
          where: { tenantId, id: { in: jobIds } },
          select: { id: true, title: true, jobCode: true },
        })
      : [];
    const jobMap = new Map(jobs.map((j: any) => [j.id, j]));

    return res.json(
      items.map((i: any) => {
        const meta = metaMap.get(i.id) || {};
        const job = meta.jobPostingId ? jobMap.get(meta.jobPostingId) || null : null;
        return {
          ...i,
          jobPostingId: meta.jobPostingId || null,
          jobPosting: job,
        };
      })
    );
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/interview-rounds", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const { name, sequence, description, isActive, jobPostingId } = req.body;
    if (!name) return res.status(400).json({ error: "Round name is required." });
    const item = await db.interviewRoundMaster.create({
      data: {
        tenantId,
        name: name.trim(),
        sequence: Number(sequence) || 1,
        description: description || null,
        isActive: isActive !== false,
      },
    });
    if (jobPostingId) {
      await saveTenantMeta(db, tenantId, "interview_round_meta", item.id, { jobPostingId }, actorId);
    }
    const job = jobPostingId
      ? await db.jobPosting.findFirst({ where: { id: jobPostingId, tenantId }, select: { id: true, title: true, jobCode: true } })
      : null;
    return res.status(201).json({ ...item, jobPostingId: jobPostingId || null, jobPosting: job });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/interview-rounds/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const existing = await db.interviewRoundMaster.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Interview round not found." });
    const { name, sequence, description, isActive, jobPostingId } = req.body;
    const updated = await db.interviewRoundMaster.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(sequence !== undefined ? { sequence: Number(sequence) || 1 } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });
    let resolvedJobId: string | null = null;
    if (jobPostingId !== undefined) {
      resolvedJobId = jobPostingId || null;
      await saveTenantMeta(db, tenantId, "interview_round_meta", existing.id, { jobPostingId: resolvedJobId }, actorId);
    } else {
      const m = await getTenantMetaMap(db, tenantId, "interview_round_meta", [existing.id]);
      resolvedJobId = m.get(existing.id)?.jobPostingId || null;
    }
    const job = resolvedJobId
      ? await db.jobPosting.findFirst({ where: { id: resolvedJobId, tenantId }, select: { id: true, title: true, jobCode: true } })
      : null;
    return res.json({ ...updated, jobPostingId: resolvedJobId, jobPosting: job });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/interview-rounds/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.setting.deleteMany({ where: { scope: "TENANT", scopeId: tenantId, group: "interview_round_meta", key: req.params.id } });
    await db.interviewRoundMaster.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Onboarding Check Items ---
hrRecruitmentRouter.get("/check-items/document-types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const docTypes = await db.documentType.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ isRequired: "desc" }, { name: "asc" }],
    });
    return res.json(docTypes);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.get("/check-items", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const items = await db.onboardingCheckItem.findMany({
      where: { tenantId },
      include: { template: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/check-items", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { templateId, title, category, description, isMandatory, dueOffsetDays, sequence, assigneeRole, isActive } = req.body;
    if (!title || !templateId) return res.status(400).json({ error: "Item title and templateId are required." });
    const item = await db.onboardingCheckItem.create({
      data: {
        tenantId,
        templateId,
        title: title.trim(),
        category: category || "Training",
        description: description || null,
        isMandatory: isMandatory !== false,
        dueOffsetDays: Number(dueOffsetDays) || 0,
        sequence: Number(sequence) || 1,
        assigneeRole: assigneeRole || "candidate",
        isActive: isActive !== false,
      },
      include: { template: { select: { id: true, name: true } } },
    });
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/check-items/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.onboardingCheckItem.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Checklist item not found." });
    const { templateId, title, category, description, isMandatory, dueOffsetDays, sequence, assigneeRole, isActive } = req.body;
    const updated = await db.onboardingCheckItem.update({
      where: { id: existing.id },
      data: {
        ...(templateId !== undefined ? { templateId } : {}),
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(category !== undefined ? { category: category || "Training" } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(isMandatory !== undefined ? { isMandatory: Boolean(isMandatory) } : {}),
        ...(dueOffsetDays !== undefined ? { dueOffsetDays: Number(dueOffsetDays) || 0 } : {}),
        ...(sequence !== undefined ? { sequence: Number(sequence) || 1 } : {}),
        ...(assigneeRole !== undefined ? { assigneeRole: assigneeRole || "candidate" } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
      include: { template: { select: { id: true, name: true } } },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/check-items/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.onboardingCheckItem.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Onboarding Checklists (Templates) ---
hrRecruitmentRouter.get("/onboarding-checklists", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const templates = await db.onboardingChecklistTemplate.findMany({
      where: { tenantId },
      include: {
        items: {
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const defaultRow = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "onboarding_checklist_meta", key: "default_id" },
    });
    const defaultId = (defaultRow?.valueJson as any)?.id || null;
    return res.json(templates.map((t: any) => ({ ...t, isDefault: t.id === defaultId })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/onboarding-checklists", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const { name, code, description, items, isActive, isDefault } = req.body;
    if (!name) return res.status(400).json({ error: "Checklist name is required." });

    const templateCode = code?.trim() || `CHK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const template = await db.onboardingChecklistTemplate.create({
      data: {
        tenantId,
        name: name.trim(),
        code: templateCode,
        description: description || null,
        isActive: isActive !== false,
        items: Array.isArray(items) && items.length > 0 ? {
          create: items.map((it: any, idx: number) => ({
            tenantId,
            title: it.title,
            description: it.description || null,
            category: it.category || "Training",
            dueOffsetDays: Number(it.dueOffsetDays) || 3,
            isMandatory: it.isMandatory !== false,
            sequence: it.sequence || idx + 1,
            assigneeRole: it.assigneeRole || "candidate",
          })),
        } : undefined,
      },
      include: { items: true },
    });
    if (isDefault) {
      await saveTenantMeta(db, tenantId, "onboarding_checklist_meta", "default_id", { id: template.id }, actorId);
    }
    return res.status(201).json({ ...template, isDefault: Boolean(isDefault) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/onboarding-checklists/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const existing = await db.onboardingChecklistTemplate.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Onboarding checklist not found." });

    const { name, description, isActive, isDefault } = req.body;
    const updated = await db.onboardingChecklistTemplate.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
      include: { items: true },
    });

    const defaultRow = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "onboarding_checklist_meta", key: "default_id" },
    });
    let defaultId = (defaultRow?.valueJson as any)?.id || null;
    if (isDefault === true) {
      defaultId = updated.id;
      await saveTenantMeta(db, tenantId, "onboarding_checklist_meta", "default_id", { id: updated.id }, actorId);
    } else if (isDefault === false && defaultId === updated.id) {
      defaultId = null;
      await saveTenantMeta(db, tenantId, "onboarding_checklist_meta", "default_id", { id: null }, actorId);
    }

    return res.json({ ...updated, isDefault: updated.id === defaultId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/onboarding-checklists/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.onboardingChecklistTemplate.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Offer Templates ---
hrRecruitmentRouter.get("/offer-templates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const templates = await db.offerTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
    const metaMap = await getTenantMetaMap(db, tenantId, "offer_template_meta", templates.map((t: any) => t.id));
    return res.json(
      templates.map((t: any) => ({
        ...t,
        variables: extractTemplateVariables(t.bodyHtml, metaMap.get(t.id)?.variables),
      }))
    );
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.get("/offer-templates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const item = await db.offerTemplate.findFirst({ where: { id: req.params.id, tenantId } });
    if (!item) return res.status(404).json({ error: "Offer template not found." });
    const metaMap = await getTenantMetaMap(db, tenantId, "offer_template_meta", [item.id]);
    return res.json({
      ...item,
      variables: extractTemplateVariables(item.bodyHtml, metaMap.get(item.id)?.variables),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/offer-templates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const { name, code, bodyHtml, contentHtml, content, termsAndConditions, variables, isActive } = req.body;
    const body = bodyHtml || contentHtml || content;
    if (!name || !body) return res.status(400).json({ error: "Template name and content are required." });
    const templateCode = code?.trim() || `OFF-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const item = await db.offerTemplate.create({
      data: {
        tenantId,
        name: name.trim(),
        code: templateCode,
        bodyHtml: body,
        termsAndConditions: termsAndConditions || null,
        isActive: isActive !== false,
      },
    });
    const parsedVars = extractTemplateVariables(body, variables);
    await saveTenantMeta(db, tenantId, "offer_template_meta", item.id, { variables: parsedVars }, actorId);
    return res.status(201).json({ ...item, variables: parsedVars });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/offer-templates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const existing = await db.offerTemplate.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Offer template not found." });
    const { name, bodyHtml, contentHtml, content, termsAndConditions, variables, isActive } = req.body;
    const nextBody = bodyHtml ?? contentHtml ?? content;
    const updated = await db.offerTemplate.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(nextBody !== undefined ? { bodyHtml: nextBody } : {}),
        ...(termsAndConditions !== undefined ? { termsAndConditions: termsAndConditions || null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });
    const existingMeta = await getTenantMetaMap(db, tenantId, "offer_template_meta", [existing.id]);
    const parsedVars =
      variables !== undefined
        ? extractTemplateVariables(updated.bodyHtml, variables)
        : nextBody !== undefined
          ? extractTemplateVariables(updated.bodyHtml)
          : extractTemplateVariables(updated.bodyHtml, existingMeta.get(existing.id)?.variables);
    await saveTenantMeta(db, tenantId, "offer_template_meta", existing.id, { variables: parsedVars }, actorId);
    return res.json({ ...updated, variables: parsedVars });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/offer-templates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.setting.deleteMany({ where: { scope: "TENANT", scopeId: tenantId, group: "offer_template_meta", key: req.params.id } });
    await db.offerTemplate.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// 2. JOB POSTINGS LIFECYCLE (P5-BR-001, P5-BR-002)
// =========================================================================

const JOB_META_GROUP = "job_posting_meta";

function extractJobMeta(body: any) {
  return {
    priority: body.priority ?? "Low",
    skills: Array.isArray(body.skills)
      ? body.skills.map((s: any) => String(s).trim()).filter(Boolean)
      : typeof body.skills === "string"
        ? body.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
    startDate: body.startDate || null,
    jobApplicationType: body.jobApplicationType || "Existing Link",
    applicationUrl: body.applicationUrl || "",
    featuredJob: Boolean(body.featuredJob),
    minExperience: body.minExperience !== undefined && body.minExperience !== "" && body.minExperience !== null ? Number(body.minExperience) : 0,
    maxExperience: body.maxExperience !== undefined && body.maxExperience !== "" && body.maxExperience !== null ? Number(body.maxExperience) : 0,
    customQuestions: Array.isArray(body.customQuestions) ? body.customQuestions : [],
    needToAsk: body.needToAsk && typeof body.needToAsk === "object"
      ? { gender: Boolean(body.needToAsk.gender), dateOfBirth: Boolean(body.needToAsk.dateOfBirth) }
      : { gender: false, dateOfBirth: false },
    needToShowOption: body.needToShowOption && typeof body.needToShowOption === "object"
      ? { coverLetter: Boolean(body.needToShowOption.coverLetter), termsAndConditions: Boolean(body.needToShowOption.termsAndConditions) }
      : { coverLetter: false, termsAndConditions: false },
  };
}

function mergeJobWithMeta(job: any, meta: any) {
  const m = meta && typeof meta === "object" ? meta : {};
  return {
    ...job,
    priority: m.priority ?? "Low",
    skills: Array.isArray(m.skills) ? m.skills : [],
    startDate: m.startDate ?? null,
    jobApplicationType: m.jobApplicationType ?? "Existing Link",
    applicationUrl: m.applicationUrl ?? "",
    featuredJob: Boolean(m.featuredJob),
    minExperience: m.minExperience ?? 0,
    maxExperience: m.maxExperience ?? 0,
    customQuestions: Array.isArray(m.customQuestions) ? m.customQuestions : [],
    needToAsk: m.needToAsk ?? { gender: false, dateOfBirth: false },
    needToShowOption: m.needToShowOption ?? { coverLetter: false, termsAndConditions: false },
  };
}

async function saveJobMeta(db: any, tenantId: string, jobId: string, meta: any, actorId: string) {
  const existing = await db.setting.findFirst({
    where: { scope: "TENANT", scopeId: tenantId, group: JOB_META_GROUP, key: jobId },
  });
  if (existing) {
    await db.setting.update({
      where: { id: existing.id },
      data: { valueJson: meta, updatedBy: actorId, version: (existing.version || 1) + 1 },
    });
  } else {
    await db.setting.create({
      data: {
        scope: "TENANT",
        scopeId: tenantId,
        group: JOB_META_GROUP,
        key: jobId,
        valueJson: meta,
        valueType: "json",
        updatedBy: actorId,
      },
    });
  }
}

hrRecruitmentRouter.get("/job-postings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { status, departmentId, search } = req.query;

    const where: any = { tenantId };
    if (status && status !== "all") where.status = String(status);
    if (departmentId && departmentId !== "all") where.departmentId = String(departmentId);
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: "insensitive" } },
        { location: { contains: String(search), mode: "insensitive" } },
        { jobCode: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const pagination = parsePaginationParams(req, "createdAt", 50);
    const [total, jobs] = await Promise.all([
      db.jobPosting.count({ where }),
      db.jobPosting.findMany({
        where,
        include: {
          department: true,
          designation: true,
          branch: true,
          type: true,
          jobLocation: true,
          _count: { select: { candidates: true } },
        },
        orderBy: { createdAt: "desc" },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    const jobIds = jobs.map((j: any) => j.id);
    const metaRows = jobIds.length
      ? await db.setting.findMany({
          where: { scope: "TENANT", scopeId: tenantId, group: JOB_META_GROUP, key: { in: jobIds } },
        })
      : [];
    const metaMap = new Map(metaRows.map((r: any) => [r.key, r.valueJson]));
    const enriched = jobs.map((j: any) => mergeJobWithMeta(j, metaMap.get(j.id)));

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(enriched, total, pagination));
    }
    return res.json(enriched);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list job postings." });
  }
});

hrRecruitmentRouter.post("/job-postings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    const db = getTenantDb();

    const {
      title,
      jobCode,
      departmentId,
      designationId,
      branchId,
      locationId,
      typeId,
      categoryId,
      description,
      requirements,
      benefits,
      location,
      employmentType,
      experienceLevel,
      salaryMin,
      salaryMax,
      openingsCount,
      closingDate,
      hiringManagerId,
      requiresApproval,
      status,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required." });
    }

    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const resolvedStatus = status
      ? String(status).toLowerCase()
      : requiresApproval
        ? "pending_approval"
        : "draft";

    const existingCount = await db.jobPosting.count({ where: { tenantId } });
    const monthStr = String(new Date().getMonth() + 1).padStart(2, "0");
    const generatedCode = jobCode?.trim() || `JOB-${monthStr}-${String(existingCount + 1).padStart(5, "0")}`;

    const meta = extractJobMeta(req.body);
    const expLabel =
      experienceLevel ||
      `${Number(meta.minExperience || 0).toFixed(1)} - ${Number(meta.maxExperience || 0).toFixed(1)} years`;

    const job = await db.jobPosting.create({
      data: {
        tenantId,
        title: title.trim(),
        slug,
        jobCode: generatedCode,
        departmentId: departmentId || null,
        designationId: designationId || null,
        branchId: branchId || null,
        locationId: locationId || null,
        typeId: typeId || null,
        categoryId: categoryId || null,
        description,
        requirements: requirements || null,
        benefits: benefits || null,
        location: location || "Remote",
        employmentType: employmentType || "full_time",
        experienceLevel: expLabel,
        salaryMin: salaryMin !== undefined && salaryMin !== "" && salaryMin !== null ? Number(salaryMin) : null,
        salaryMax: salaryMax !== undefined && salaryMax !== "" && salaryMax !== null ? Number(salaryMax) : null,
        openingsCount: openingsCount ? Number(openingsCount) : 1,
        status: resolvedStatus,
        publishedAt: resolvedStatus === "published" ? new Date() : null,
        closingDate: closingDate ? new Date(closingDate) : null,
        hiringManagerId: hiringManagerId || null,
      },
      include: {
        department: true,
        designation: true,
        branch: true,
        type: true,
        jobLocation: true,
        _count: { select: { candidates: true } },
      },
    });

    await saveJobMeta(db, tenantId, job.id, meta, actorId);

    await AuditService.log({
      tenantId,
      actorId,
      action: "JOB_POSTING_CREATED",
      entityType: "JobPosting",
      entityId: job.id,
      details: { title: job.title, status: job.status, jobCode: job.jobCode },
    });

    return res.status(201).json(mergeJobWithMeta(job, meta));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.get("/job-postings/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const job = await db.jobPosting.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        department: true,
        designation: true,
        branch: true,
        type: true,
        jobLocation: true,
        _count: { select: { candidates: true } },
        candidates: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!job) return res.status(404).json({ error: "Job posting not found." });

    const metaRow = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: JOB_META_GROUP, key: job.id },
    });
    return res.json(mergeJobWithMeta(job, metaRow?.valueJson));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/job-postings/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    const db = getTenantDb();
    const existing = await db.jobPosting.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Job posting not found." });

    const b = req.body || {};
    const updateData: any = {};
    if (b.title !== undefined) updateData.title = String(b.title).trim();
    if (b.jobCode !== undefined) updateData.jobCode = b.jobCode || existing.jobCode;
    if (b.departmentId !== undefined) updateData.departmentId = b.departmentId || null;
    if (b.designationId !== undefined) updateData.designationId = b.designationId || null;
    if (b.branchId !== undefined) updateData.branchId = b.branchId || null;
    if (b.locationId !== undefined) updateData.locationId = b.locationId || null;
    if (b.typeId !== undefined) updateData.typeId = b.typeId || null;
    if (b.categoryId !== undefined) updateData.categoryId = b.categoryId || null;
    if (b.description !== undefined) updateData.description = b.description;
    if (b.requirements !== undefined) updateData.requirements = b.requirements || null;
    if (b.benefits !== undefined) updateData.benefits = b.benefits || null;
    if (b.location !== undefined) updateData.location = b.location || "Remote";
    if (b.employmentType !== undefined) updateData.employmentType = b.employmentType || "full_time";
    if (b.salaryMin !== undefined) updateData.salaryMin = b.salaryMin !== "" && b.salaryMin !== null ? Number(b.salaryMin) : null;
    if (b.salaryMax !== undefined) updateData.salaryMax = b.salaryMax !== "" && b.salaryMax !== null ? Number(b.salaryMax) : null;
    if (b.openingsCount !== undefined) updateData.openingsCount = Number(b.openingsCount) || 1;
    if (b.closingDate !== undefined) updateData.closingDate = b.closingDate ? new Date(b.closingDate) : null;
    if (b.status !== undefined) {
      const nextStatus = String(b.status).toLowerCase();
      updateData.status = nextStatus;
      if (nextStatus === "published" && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const existingMetaRow = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: JOB_META_GROUP, key: existing.id },
    });
    const existingMetaObj =
      existingMetaRow?.valueJson && typeof existingMetaRow.valueJson === "object"
        ? (existingMetaRow.valueJson as Record<string, any>)
        : {};
    const mergedInput = { ...existingMetaObj, ...b };
    const meta = extractJobMeta(mergedInput);

    if (b.minExperience !== undefined || b.maxExperience !== undefined) {
      updateData.experienceLevel = `${Number(meta.minExperience || 0).toFixed(1)} - ${Number(meta.maxExperience || 0).toFixed(1)} years`;
    } else if (b.experienceLevel !== undefined) {
      updateData.experienceLevel = b.experienceLevel;
    }

    const updated = await db.jobPosting.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        department: true,
        designation: true,
        branch: true,
        type: true,
        jobLocation: true,
        _count: { select: { candidates: true } },
      },
    });

    await saveJobMeta(db, tenantId, updated.id, meta, actorId);
    return res.json(mergeJobWithMeta(updated, meta));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Unpublish Job Posting (revert to Draft)
hrRecruitmentRouter.post("/job-postings/:id/unpublish", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.jobPosting.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Job posting not found." });

    const updated = await db.jobPosting.update({
      where: { id: req.params.id },
      data: { status: "draft" },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete Job Posting
hrRecruitmentRouter.delete("/job-postings/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.jobPosting.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Job posting not found." });

    await db.setting.deleteMany({
      where: { scope: "TENANT", scopeId: tenantId, group: JOB_META_GROUP, key: existing.id },
    });
    await db.jobPosting.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Approve Job Posting
hrRecruitmentRouter.post("/job-postings/:id/approve", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    const db = getTenantDb();

    const existing = await db.jobPosting.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Job posting not found." });

    const updated = await db.jobPosting.update({
      where: { id: req.params.id },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: actorId,
        status: existing.status === "pending_approval" ? "published" : existing.status,
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "JOB_POSTING_APPROVED",
      entityType: "JobPosting",
      entityId: updated.id,
      details: { title: updated.title, isApproved: true },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Publish Job Posting
hrRecruitmentRouter.post("/job-postings/:id/publish", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    const db = getTenantDb();

    const existing = await db.jobPosting.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Job posting not found." });

    const updated = await db.jobPosting.update({
      where: { id: req.params.id },
      data: {
        status: "published",
        publishedAt: new Date(),
      },
    });

    await OutboxService.publish({
      tenantId,
      eventType: "JOB_POSTING_PUBLISHED",
      entityId: updated.id,
      payload: { jobPostingId: updated.id, title: updated.title, actorId },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Close Job Posting
hrRecruitmentRouter.post("/job-postings/:id/close", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    const { closeReason } = req.body;
    const db = getTenantDb();

    const existing = await db.jobPosting.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Job posting not found." });

    const updated = await db.jobPosting.update({
      where: { id: req.params.id },
      data: {
        status: "closed",
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "JOB_POSTING_CLOSED",
      entityType: "JobPosting",
      entityId: updated.id,
      details: { title: updated.title, closeReason },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// 3. CANDIDATES & DUPLICATE DETECTION (P5-BR-003, Candidate 360)
// =========================================================================

hrRecruitmentRouter.get("/candidates/check-duplicate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { email, phone, excludeId } = req.query;
    const result = await RecruitmentService.checkCandidateDuplicate(
      tenantId,
      email as string,
      phone as string,
      excludeId as string
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.get("/candidates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { jobPostingId, stage, search } = req.query;

    const where: any = { tenantId };
    if (jobPostingId && jobPostingId !== "all") where.jobPostingId = String(jobPostingId);
    if (stage && stage !== "all") where.stage = String(stage);
    if (search) {
      where.OR = [
        { fullName: { contains: String(search), mode: "insensitive" } },
        { email: { contains: String(search), mode: "insensitive" } },
        { currentCompany: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const pagination = parsePaginationParams(req, "createdAt", 20);
    const [total, candidates] = await Promise.all([
      db.jobCandidate.count({ where }),
      db.jobCandidate.findMany({
        where,
        include: {
          jobPosting: { include: { department: true, branch: true, type: true, jobLocation: true } },
          source: true,
          interviews: true,
          offers: true,
        },
        orderBy: { createdAt: "desc" },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(candidates, total, pagination));
    }
    return res.json(candidates);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/candidates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    const db = getTenantDb();

    const {
      jobPostingId,
      fullName,
      email,
      phone,
      resumeUrl,
      currentCompany,
      expectedSalary,
      currentSalary,
      noticePeriodDays,
      yearsOfExperience,
      skills,
      stage,
      sourceId,
      rating,
      interviewerNotes,
      allowDuplicate,
    } = req.body;

    if (!jobPostingId || !fullName || !email) {
      return res.status(400).json({ error: "Job posting, full name, and email are required." });
    }

    if (!allowDuplicate) {
      const dup = await RecruitmentService.checkCandidateDuplicate(tenantId, email, phone);
      if (dup.hasDuplicate) {
        return res.status(409).json({
          error: `Duplicate candidate detected by ${dup.matchType}. Existing candidate: '${dup.existingCandidate?.fullName}'.`,
          existingCandidate: dup.existingCandidate,
        });
      }
    }

    const candidate = await db.jobCandidate.create({
      data: {
        tenantId,
        jobPostingId,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        resumeUrl: resumeUrl || null,
        currentCompany: currentCompany || null,
        expectedSalary: expectedSalary ? Number(expectedSalary) : null,
        currentCtc: currentSalary ? Number(currentSalary) : null,
        noticePeriodDays: noticePeriodDays ? Number(noticePeriodDays) : null,
        yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : 0,
        skills: Array.isArray(skills) ? skills.join(", ") : (skills || null),
        stage: stage || "applied",
        sourceId: sourceId || null,
        rating: rating ? Number(rating) : 0,
        interviewerNotes: interviewerNotes || null,
      },
      include: {
        jobPosting: { include: { department: true } },
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "CANDIDATE_CREATED",
      entityType: "JobCandidate",
      entityId: candidate.id,
      details: { fullName: candidate.fullName, email: candidate.email, jobPostingId },
    });

    await OutboxService.publish({
      tenantId,
      eventType: "CANDIDATE_CREATED",
      entityId: candidate.id,
      payload: { candidateId: candidate.id, fullName: candidate.fullName, email: candidate.email, jobPostingId },
    });

    return res.status(201).json(candidate);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Candidate Detail by ID
hrRecruitmentRouter.get("/candidates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const candidate = await db.jobCandidate.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        jobPosting: { include: { department: true, branch: true, type: true, jobLocation: true } },
        source: true,
        offers: { orderBy: { createdAt: "desc" } },
        interviews: { orderBy: { scheduledAt: "desc" } },
      },
    });
    if (!candidate) return res.status(404).json({ error: "Candidate not found." });
    const metaMap = await getTenantMetaMap(db, tenantId, "candidate_profile_meta", [candidate.id]);
    return res.json({ ...candidate, ...(metaMap.get(candidate.id) || {}) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update Candidate (Edit Modal + Kanban Drag-and-Drop Stage Update)
hrRecruitmentRouter.put("/candidates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const existing = await db.jobCandidate.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Candidate not found." });

    const b = req.body || {};
    const updateData: any = {};
    if (b.fullName !== undefined) updateData.fullName = String(b.fullName).trim();
    if (b.email !== undefined) updateData.email = String(b.email).toLowerCase().trim();
    if (b.phone !== undefined) updateData.phone = b.phone || null;
    if (b.jobPostingId !== undefined) updateData.jobPostingId = b.jobPostingId;
    if (b.sourceId !== undefined) updateData.sourceId = b.sourceId || null;
    if (b.yearsOfExperience !== undefined) updateData.yearsOfExperience = b.yearsOfExperience !== "" ? Number(b.yearsOfExperience) : 0;
    if (b.currentSalary !== undefined || b.currentCtc !== undefined) {
      const val = b.currentSalary ?? b.currentCtc;
      updateData.currentCtc = val !== "" && val !== null ? Number(val) : null;
    }
    if (b.expectedSalary !== undefined) {
      updateData.expectedSalary = b.expectedSalary !== "" && b.expectedSalary !== null ? Number(b.expectedSalary) : null;
    }
    if (b.currentCompany !== undefined) updateData.currentCompany = b.currentCompany || null;
    if (b.location !== undefined) updateData.location = b.location || null;
    if (b.noticePeriodDays !== undefined) {
      updateData.noticePeriodDays = b.noticePeriodDays !== "" && b.noticePeriodDays !== null ? Number(b.noticePeriodDays) : null;
    }
    if (b.stage !== undefined) updateData.stage = String(b.stage).toLowerCase();
    if (b.coverLetter !== undefined) updateData.coverLetter = b.coverLetter || null;
    if (b.resumeUrl !== undefined) updateData.resumeUrl = b.resumeUrl || null;
    if (b.skills !== undefined) updateData.skills = Array.isArray(b.skills) ? b.skills.join(", ") : b.skills || null;

    const updated = await db.jobCandidate.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        jobPosting: { include: { department: true, branch: true, type: true, jobLocation: true } },
        source: true,
        offers: true,
      },
    });

    if (
      b.gender !== undefined ||
      b.dateOfBirth !== undefined ||
      b.address !== undefined ||
      b.city !== undefined ||
      b.state !== undefined ||
      b.country !== undefined ||
      b.zipCode !== undefined ||
      b.currentPosition !== undefined ||
      b.screeningAnswers !== undefined
    ) {
      const prevMap = await getTenantMetaMap(db, tenantId, "candidate_profile_meta", [existing.id]);
      const nextMeta = {
        ...(prevMap.get(existing.id) || {}),
        ...(b.gender !== undefined ? { gender: b.gender } : {}),
        ...(b.dateOfBirth !== undefined ? { dateOfBirth: b.dateOfBirth } : {}),
        ...(b.address !== undefined ? { address: b.address } : {}),
        ...(b.city !== undefined ? { city: b.city } : {}),
        ...(b.state !== undefined ? { state: b.state } : {}),
        ...(b.country !== undefined ? { country: b.country } : {}),
        ...(b.zipCode !== undefined ? { zipCode: b.zipCode } : {}),
        ...(b.currentPosition !== undefined ? { currentPosition: b.currentPosition } : {}),
        ...(b.screeningAnswers !== undefined ? { screeningAnswers: b.screeningAnswers } : {}),
      };
      await saveTenantMeta(db, tenantId, "candidate_profile_meta", existing.id, nextMeta, actorId);
    }

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete Candidate
hrRecruitmentRouter.delete("/candidates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.setting.deleteMany({
      where: { scope: "TENANT", scopeId: tenantId, group: "candidate_profile_meta", key: req.params.id },
    });
    await db.jobCandidate.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Candidate 360 View
hrRecruitmentRouter.get("/candidates/:id/360", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const candidate360 = await RecruitmentService.getCandidate360(tenantId, req.params.id);
    return res.json(candidate360);
  } catch (err: any) {
    return res.status(404).json({ error: err.message || "Candidate 360 not found." });
  }
});

// Stage Transition Engine
hrRecruitmentRouter.put("/candidates/:id/stage", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    const { stage, reason, notes } = req.body;

    if (!stage) return res.status(400).json({ error: "Target stage is required." });

    const updated = await RecruitmentService.transitionCandidateStage(
      tenantId,
      actorId,
      req.params.id,
      stage,
      reason,
      notes
    );
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// 1-Click Candidate → Employee Conversion (P5-BR-010 via P2 EmployeeService)
hrRecruitmentRouter.post("/candidates/:id/convert-to-employee", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";

    const result = await RecruitmentService.convertCandidateToEmployee(
      tenantId,
      actorId,
      req.params.id,
      req.body
    );
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});


// =========================================================================
// 4. PIPELINE KANBAN & FUNNEL (HR-REC-17)
// =========================================================================

hrRecruitmentRouter.get("/pipeline", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { jobPostingId } = req.query;
    const db = getTenantDb();

    const where: any = { tenantId };
    if (jobPostingId && jobPostingId !== "all") {
      where.jobPostingId = String(jobPostingId);
    }

    const candidates = await db.jobCandidate.findMany({
      where,
      include: {
        jobPosting: { select: { id: true, title: true, department: true } },
        interviews: { select: { id: true, scheduledAt: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const stages = ["applied", "screening", "assessment", "interview", "offered", "hired", "rejected"];
    const kanban: Record<string, any[]> = {};
    for (const s of stages) kanban[s] = [];

    for (const c of candidates) {
      const s = c.stage?.toLowerCase() || "applied";
      if (kanban[s]) kanban[s].push(c);
      else kanban["applied"].push(c);
    }

    return res.json({ kanban, total: candidates.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.get("/pipeline/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { jobPostingId } = req.query;
    const stats = await RecruitmentService.getRecruitmentFunnelStats(tenantId, jobPostingId as string);
    return res.json(stats);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// 5. ASSESSMENTS ENGINE (P5-BR-005)
// =========================================================================

hrRecruitmentRouter.get("/assessments/templates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const templates = await db.assessmentTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return res.json(templates);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/assessments/templates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { title, description, timeLimitMinutes, passingScorePercent, questions, code } = req.body;

    if (!title) return res.status(400).json({ error: "Template title is required." });

    const template = await db.assessmentTemplate.create({
      data: {
        tenantId,
        title: title.trim(),
        code: code || `ASM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        description: description || null,
        timeLimitMinutes: Number(timeLimitMinutes) || 30,
        passScore: Number(passingScorePercent) || 60,
        questionsJson: Array.isArray(questions) ? questions : [],
      },
    });
    return res.status(201).json(template);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.get("/assessments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const items = await db.candidateAssessment.findMany({
      where: { tenantId },
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
        evaluator: { select: { id: true, firstName: true, lastName: true, email: true } },
        template: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/assessments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const {
      candidateId,
      templateId,
      assessmentName,
      score,
      maxScore,
      status,
      evaluatorId,
      assessmentDate,
      comments,
      jobPostingId,
    } = req.body;

    if (!candidateId) return res.status(400).json({ error: "Candidate is required." });

    let resolvedTemplateId = templateId;
    if (!resolvedTemplateId) {
      const title = String(assessmentName || "").trim();
      if (!title) return res.status(400).json({ error: "Assessment Name is required." });
      let tpl = await db.assessmentTemplate.findFirst({
        where: { tenantId, title: { equals: title, mode: "insensitive" } },
      });
      if (!tpl) {
        tpl = await db.assessmentTemplate.create({
          data: {
            tenantId,
            title,
            code: `ASM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
            timeLimitMinutes: 45,
            passScore: 60,
            questionsJson: [],
          },
        });
      }
      resolvedTemplateId = tpl.id;
    }

    const normalizedStatus = String(status || "pending").toLowerCase();
    const numericScore = score !== undefined && score !== "" && score !== null ? Number(score) : null;
    const numericMax = maxScore !== undefined && maxScore !== "" && maxScore !== null ? Number(maxScore) : 100;
    const dateVal = assessmentDate ? new Date(assessmentDate) : new Date();

    const created = await db.candidateAssessment.create({
      data: {
        tenantId,
        candidateId,
        templateId: resolvedTemplateId,
        jobPostingId: jobPostingId || null,
        status: normalizedStatus,
        score: numericScore,
        totalScore: numericMax,
        passed: normalizedStatus === "pass" ? true : normalizedStatus === "fail" ? false : null,
        evaluatorId: evaluatorId || null,
        assignedAt: dateVal,
        completedAt: normalizedStatus === "pending" ? null : dateVal,
        evaluationNotes: comments || null,
      },
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
        evaluator: { select: { id: true, firstName: true, lastName: true, email: true } },
        template: true,
      },
    });
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/assessments/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.candidateAssessment.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Assessment not found." });

    const {
      candidateId,
      assessmentName,
      score,
      maxScore,
      status,
      evaluatorId,
      assessmentDate,
      comments,
    } = req.body;

    let resolvedTemplateId = existing.templateId;
    if (assessmentName !== undefined && String(assessmentName).trim()) {
      const title = String(assessmentName).trim();
      let tpl = await db.assessmentTemplate.findFirst({
        where: { tenantId, title: { equals: title, mode: "insensitive" } },
      });
      if (!tpl) {
        tpl = await db.assessmentTemplate.create({
          data: {
            tenantId,
            title,
            code: `ASM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
            timeLimitMinutes: 45,
            passScore: 60,
            questionsJson: [],
          },
        });
      }
      resolvedTemplateId = tpl.id;
    }

    const normalizedStatus = status !== undefined ? String(status).toLowerCase() : existing.status;
    const dateVal = assessmentDate ? new Date(assessmentDate) : undefined;

    const updated = await db.candidateAssessment.update({
      where: { id: existing.id },
      data: {
        ...(candidateId !== undefined ? { candidateId } : {}),
        templateId: resolvedTemplateId,
        ...(score !== undefined ? { score: score !== "" && score !== null ? Number(score) : null } : {}),
        ...(maxScore !== undefined ? { totalScore: maxScore !== "" && maxScore !== null ? Number(maxScore) : 100 } : {}),
        status: normalizedStatus,
        passed: normalizedStatus === "pass" ? true : normalizedStatus === "fail" ? false : null,
        ...(evaluatorId !== undefined ? { evaluatorId: evaluatorId || null } : {}),
        ...(dateVal ? { assignedAt: dateVal, completedAt: normalizedStatus === "pending" ? null : dateVal } : {}),
        ...(comments !== undefined ? { evaluationNotes: comments || null } : {}),
      },
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
        evaluator: { select: { id: true, firstName: true, lastName: true, email: true } },
        template: true,
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/assessments/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.candidateAssessment.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/assessments/assign", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { candidateId, templateId, jobPostingId } = req.body;

    if (!candidateId || !templateId) {
      return res.status(400).json({ error: "Candidate and template are required." });
    }

    const assessment = await db.candidateAssessment.create({
      data: {
        tenantId,
        candidateId,
        templateId,
        jobPostingId: jobPostingId || null,
        status: "assigned",
      },
      include: {
        candidate: true,
        template: true,
      },
    });

    return res.status(201).json(assessment);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// 6. INTERVIEWS & CONFLICT CHECK (P5-BR-006, P5-BR-007)
// =========================================================================

hrRecruitmentRouter.post("/interviews/check-conflict", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { candidateId, interviewerId, scheduledAt, durationMinutes, interviewId } = req.body;

    if (!candidateId || !scheduledAt) {
      return res.status(400).json({ error: "Candidate and scheduledAt are required." });
    }

    const conflict = await RecruitmentService.checkInterviewConflict({
      tenantId,
      candidateId,
      interviewerId,
      scheduledAt,
      durationMinutes: Number(durationMinutes) || 60,
      interviewId,
    });
    return res.json(conflict);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.get("/interviews", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { status, candidateId, interviewerId } = req.query;

    const where: any = { tenantId };
    if (status && status !== "all") where.status = String(status);
    if (candidateId) where.candidateId = String(candidateId);
    if (interviewerId) where.interviewerId = String(interviewerId);

    const interviews = await db.jobCandidateInterview.findMany({
      where,
      include: {
        candidate: { select: { id: true, fullName: true, email: true, phone: true, jobPosting: true } },
        interviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    const metaMap = await getTenantMetaMap(db, tenantId, "interview_meta", interviews.map((i: any) => i.id));
    const allEmpIds = Array.from(
      new Set(
        interviews.flatMap((i: any) => {
          const m = metaMap.get(i.id);
          return Array.isArray(m?.interviewerIds) ? m.interviewerIds : [];
        })
      )
    ) as string[];
    const empList = allEmpIds.length
      ? await db.employee.findMany({
          where: { tenantId, id: { in: allEmpIds } },
          select: { id: true, firstName: true, lastName: true, email: true, position: true },
        })
      : [];
    const empMap = new Map(empList.map((e: any) => [e.id, e]));

    return res.json(
      interviews.map((i: any) => {
        const m = metaMap.get(i.id) || {};
        const ids: string[] = Array.isArray(m.interviewerIds)
          ? m.interviewerIds
          : i.interviewerId
            ? [i.interviewerId]
            : [];
        const assignedInterviewers = ids.map((id) => empMap.get(id)).filter(Boolean);
        if (assignedInterviewers.length === 0 && i.interviewer) assignedInterviewers.push(i.interviewer);
        return {
          ...i,
          location: m.location || (i.meetingLink ? "Online" : ""),
          interviewerIds: ids,
          interviewers: assignedInterviewers,
          feedbackList: Array.isArray(m.feedbackList) ? m.feedbackList : [],
        };
      })
    );
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.get("/interviews/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const interview = await db.jobCandidateInterview.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        candidate: {
          include: {
            jobPosting: true,
          },
        },
        interviewer: { select: { id: true, firstName: true, lastName: true, email: true, position: true } },
      },
    });
    if (!interview) return res.status(404).json({ error: "Interview not found." });

    const metaMap = await getTenantMetaMap(db, tenantId, "interview_meta", [interview.id]);
    const m = metaMap.get(interview.id) || {};
    const ids: string[] = Array.isArray(m.interviewerIds)
      ? m.interviewerIds
      : interview.interviewerId
        ? [interview.interviewerId]
        : [];
    const empList = ids.length
      ? await db.employee.findMany({
          where: { tenantId, id: { in: ids } },
          select: { id: true, firstName: true, lastName: true, email: true, position: true },
        })
      : [];
    const assignedInterviewers = empList.length > 0 ? empList : interview.interviewer ? [interview.interviewer] : [];

    return res.json({
      ...interview,
      location: m.location || (interview.meetingLink ? "Online" : ""),
      interviewerIds: ids,
      interviewers: assignedInterviewers,
      feedbackList: Array.isArray(m.feedbackList) ? m.feedbackList : [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/interviews", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    const db = getTenantDb();

    const {
      candidateId,
      interviewerId,
      interviewerIds,
      interviewRound,
      roundName,
      interviewType,
      scheduledAt,
      durationMinutes,
      mode,
      location,
      meetingLink,
      notes,
    } = req.body;

    if (!candidateId || !scheduledAt) {
      return res.status(400).json({ error: "Candidate and scheduled time are required." });
    }

    const resolvedIds: string[] = Array.isArray(interviewerIds) && interviewerIds.length > 0
      ? interviewerIds
      : interviewerId
        ? [interviewerId]
        : [];
    const primaryInterviewerId = resolvedIds[0] || null;

    const interview = await db.jobCandidateInterview.create({
      data: {
        tenantId,
        candidateId,
        interviewerId: primaryInterviewerId,
        roundNumber: Number(interviewRound) || 1,
        roundName: roundName || "Technical Round",
        interviewType: interviewType || "Technical Interview",
        scheduledAt: new Date(scheduledAt),
        durationMinutes: Number(durationMinutes) || 60,
        mode: mode || (meetingLink ? "virtual" : "onsite"),
        meetingLink: meetingLink || null,
        notes: notes || null,
        status: "scheduled",
      },
      include: {
        candidate: { select: { id: true, fullName: true, email: true, jobPosting: true } },
        interviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await saveTenantMeta(
      db,
      tenantId,
      "interview_meta",
      interview.id,
      { location: location || "", interviewerIds: resolvedIds, feedbackList: [] },
      actorId
    );

    await OutboxService.publish({
      tenantId,
      eventType: "INTERVIEW_SCHEDULED",
      entityId: interview.id,
      payload: { interviewId: interview.id, candidateId, scheduledAt, actorId },
    });

    return res.status(201).json({
      ...interview,
      location: location || "",
      interviewerIds: resolvedIds,
      feedbackList: [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/interviews/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const existing = await db.jobCandidateInterview.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Interview not found." });

    const b = req.body || {};
    const updateData: any = {};
    if (b.candidateId !== undefined) updateData.candidateId = b.candidateId;
    if (b.roundName !== undefined) updateData.roundName = b.roundName;
    if (b.interviewType !== undefined) updateData.interviewType = b.interviewType;
    if (b.scheduledAt !== undefined) updateData.scheduledAt = new Date(b.scheduledAt);
    if (b.durationMinutes !== undefined) updateData.durationMinutes = Number(b.durationMinutes) || 60;
    if (b.meetingLink !== undefined) updateData.meetingLink = b.meetingLink || null;
    if (b.notes !== undefined) updateData.notes = b.notes || null;
    if (b.status !== undefined) updateData.status = String(b.status).toLowerCase();
    if (Array.isArray(b.interviewerIds)) {
      updateData.interviewerId = b.interviewerIds[0] || null;
    } else if (b.interviewerId !== undefined) {
      updateData.interviewerId = b.interviewerId || null;
    }

    const updated = await db.jobCandidateInterview.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        candidate: { select: { id: true, fullName: true, email: true, jobPosting: true } },
        interviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    const prevMap = await getTenantMetaMap(db, tenantId, "interview_meta", [existing.id]);
    const prevMeta = prevMap.get(existing.id) || {};
    const nextMeta = {
      ...prevMeta,
      ...(b.location !== undefined ? { location: b.location || "" } : {}),
      ...(Array.isArray(b.interviewerIds) ? { interviewerIds: b.interviewerIds } : {}),
    };
    await saveTenantMeta(db, tenantId, "interview_meta", existing.id, nextMeta, actorId);

    return res.json({ ...updated, ...nextMeta });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/interviews/:id/feedback", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const existing = await db.jobCandidateInterview.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Interview not found." });

    const {
      interviewerName,
      interviewerRole,
      recommendation,
      technical,
      communication,
      culturalFit,
      strengths,
      weaknesses,
      comments,
    } = req.body;

    const tech = Number(technical) || 4;
    const comm = Number(communication) || 4;
    const cult = Number(culturalFit) || 4;
    const overallScore = Number(((tech + comm + cult) / 3).toFixed(1));

    const prevMap = await getTenantMetaMap(db, tenantId, "interview_meta", [existing.id]);
    const prevMeta = prevMap.get(existing.id) || {};
    const prevList = Array.isArray(prevMeta.feedbackList) ? prevMeta.feedbackList : [];

    const entry = {
      id: `fb-${Date.now()}`,
      interviewerName: interviewerName || "Interviewer",
      interviewerRole: interviewerRole || "manager",
      recommendation: recommendation || "Hire",
      overallScore,
      technical: tech,
      communication: comm,
      culturalFit: cult,
      strengths: strengths || "",
      weaknesses: weaknesses || "",
      comments: comments || "",
      createdAt: new Date().toISOString(),
    };

    const nextList = [...prevList, entry];
    await saveTenantMeta(
      db,
      tenantId,
      "interview_meta",
      existing.id,
      { ...prevMeta, feedbackList: nextList },
      actorId
    );

    await db.jobCandidateInterview.update({
      where: { id: existing.id },
      data: {
        feedback: comments || existing.feedback || "Feedback submitted",
        recommendation: recommendation || existing.recommendation,
      },
    });

    return res.status(201).json(entry);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/interviews/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.setting.deleteMany({
      where: { scope: "TENANT", scopeId: tenantId, group: "interview_meta", key: req.params.id },
    });
    await db.jobCandidateInterview.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/interviews/:id/scorecard", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    const db = getTenantDb();
    const { score, recommendation, feedback, scorecard } = req.body;

    const existing = await db.jobCandidateInterview.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Interview not found." });

    const validRecommendations = ["STRONG_YES", "YES", "NEUTRAL", "NO", "STRONG_NO"];
    if (recommendation && !validRecommendations.includes(recommendation)) {
      return res.status(400).json({ error: "Invalid recommendation value." });
    }

    const updated = await db.jobCandidateInterview.update({
      where: { id: req.params.id },
      data: {
        recommendation: recommendation || existing.recommendation,
        feedback: feedback || existing.feedback,
        criteriaRatingsJson: scorecard || (score !== undefined ? { score } : existing.criteriaRatingsJson),
        status: "completed",
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "INTERVIEW_FEEDBACK_SUBMITTED",
      entityType: "JobCandidateInterview",
      entityId: updated.id,
      details: { recommendation: updated.recommendation },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// 7. OFFERS & COMPENSATION INTEGRATION (P5-BR-008)
// =========================================================================

hrRecruitmentRouter.get("/offers", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const offers = await db.candidateOffer.findMany({
      where: { tenantId },
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
        jobPosting: { select: { id: true, title: true, jobCode: true } },
        designation: true,
        department: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(offers);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.get("/offers/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const offer = await db.candidateOffer.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        candidate: { select: { id: true, fullName: true, email: true, phone: true } },
        jobPosting: { select: { id: true, title: true, jobCode: true, department: true } },
        designation: true,
        department: true,
        template: true,
      },
    });
    if (!offer) return res.status(404).json({ error: "Offer not found." });
    return res.json(offer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/offers", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    const db = getTenantDb();

    const {
      candidateId,
      jobPostingId,
      designationId,
      departmentId,
      branchId,
      templateId,
      ctcAnnual,
      salary,
      joiningDate,
      startDate,
      expiryDate,
      expirationDate,
      ctcBreakdown,
      notes,
      benefits,
      approvedBy,
      status,
    } = req.body;

    const resolvedSalary = ctcAnnual ?? salary;
    const resolvedStartDate = joiningDate || startDate;
    const resolvedExpiry = expiryDate || expirationDate;

    if (!candidateId || !resolvedSalary || !resolvedStartDate) {
      return res.status(400).json({ error: "Candidate, Salary, and Start Date are required." });
    }

    const annualCtc = Number(resolvedSalary);
    const monthlyGross = Math.round(annualCtc / 12);

    const offer = await db.candidateOffer.create({
      data: {
        tenantId,
        candidateId,
        jobPostingId: jobPostingId || null,
        designationId: designationId || null,
        departmentId: departmentId || null,
        branchId: branchId || null,
        templateId: templateId || null,
        annualCtc,
        monthlyGross,
        joiningDate: new Date(resolvedStartDate),
        expiresAt: resolvedExpiry ? new Date(resolvedExpiry) : null,
        ctcStructureJson: ctcBreakdown || {},
        comments: benefits ?? notes ?? null,
        approvedBy: approvedBy || null,
        status: status ? String(status).toLowerCase() : "draft",
      },
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
        jobPosting: { select: { id: true, title: true, jobCode: true } },
        department: true,
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "OFFER_CREATED",
      entityType: "CandidateOffer",
      entityId: offer.id,
      details: { candidateName: offer.candidate?.fullName, annualCtc: offer.annualCtc },
    });

    return res.status(201).json(offer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/offers/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.candidateOffer.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Offer not found." });

    const {
      candidateId,
      jobPostingId,
      departmentId,
      designationId,
      salary,
      ctcAnnual,
      startDate,
      joiningDate,
      expirationDate,
      expiryDate,
      approvedBy,
      benefits,
      notes,
      status,
    } = req.body;

    const resolvedSalary = ctcAnnual ?? salary;
    const resolvedStart = joiningDate ?? startDate;
    const resolvedExpiry = expiryDate ?? expirationDate;
    const resolvedBenefits = benefits !== undefined ? benefits : notes;

    const updateData: any = {};
    if (candidateId !== undefined) updateData.candidateId = candidateId;
    if (jobPostingId !== undefined) updateData.jobPostingId = jobPostingId || null;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (designationId !== undefined) updateData.designationId = designationId || null;
    if (resolvedSalary !== undefined && resolvedSalary !== "") {
      updateData.annualCtc = Number(resolvedSalary);
      updateData.monthlyGross = Math.round(Number(resolvedSalary) / 12);
    }
    if (resolvedStart !== undefined && resolvedStart !== "") {
      updateData.joiningDate = new Date(resolvedStart);
    }
    if (resolvedExpiry !== undefined) {
      updateData.expiresAt = resolvedExpiry ? new Date(resolvedExpiry) : null;
    }
    if (approvedBy !== undefined) updateData.approvedBy = approvedBy || null;
    if (resolvedBenefits !== undefined) updateData.comments = resolvedBenefits || null;
    if (status !== undefined) {
      updateData.status = String(status).toLowerCase();
      if (updateData.status === "sent" && !existing.sentAt) updateData.sentAt = new Date();
    }

    const updated = await db.candidateOffer.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
        jobPosting: { select: { id: true, title: true, jobCode: true } },
        department: true,
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/offers/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.candidateOffer.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/offers/:id/approve", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    const db = getTenantDb();

    const updated = await db.candidateOffer.update({
      where: { id: req.params.id },
      data: {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: actorId,
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/offers/:id/accept", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";

    const result = await RecruitmentService.acceptOfferAndInitOnboarding(
      tenantId,
      actorId,
      req.params.id
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// 8. CANDIDATE ONBOARDING (P5-BR-009)
// =========================================================================

hrRecruitmentRouter.get("/candidate-onboarding", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const onboardings = await db.candidateOnboarding.findMany({
      where: { tenantId },
      include: {
        candidate: { select: { id: true, fullName: true, email: true, phone: true } },
        buddy: { select: { id: true, firstName: true, lastName: true, email: true } },
        template: { include: { items: { orderBy: { sequence: "asc" } } } },
        offer: { select: { id: true, annualCtc: true, joiningDate: true } },
        tasks: { orderBy: { sequence: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(onboardings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.get("/candidate-onboarding/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const onboarding = await db.candidateOnboarding.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        candidate: { select: { id: true, fullName: true, email: true, phone: true } },
        buddy: { select: { id: true, firstName: true, lastName: true, email: true } },
        template: { include: { items: { orderBy: { sequence: "asc" } } } },
        offer: { select: { id: true, annualCtc: true, joiningDate: true } },
        tasks: { orderBy: { sequence: "asc" } },
      },
    });
    if (!onboarding) return res.status(404).json({ error: "Onboarding record not found." });
    return res.json(onboarding);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/candidate-onboarding", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { candidateId, employeeId, templateId, startDate, joiningDate, buddyId, status } = req.body;

    let resolvedCandidateId = candidateId;
    if (!resolvedCandidateId && employeeId) {
      const emp = await db.employee.findFirst({ where: { id: employeeId, tenantId } });
      if (!emp) return res.status(404).json({ error: "Selected employee not found." });
      let cand = await db.jobCandidate.findFirst({ where: { tenantId, email: emp.email } });
      if (!cand) {
        const firstJob = await db.jobPosting.findFirst({ where: { tenantId }, select: { id: true } });
        if (!firstJob) {
          return res.status(400).json({ error: "Please create at least one Job Posting before onboarding an employee." });
        }
        cand = await db.jobCandidate.create({
          data: {
            tenantId,
            jobPostingId: firstJob.id,
            fullName: [emp.firstName, emp.lastName].filter(Boolean).join(" ") || emp.email,
            email: emp.email,
            phone: emp.phone || null,
            stage: "hired",
          },
        });
      }
      resolvedCandidateId = cand.id;
    }

    if (!resolvedCandidateId) {
      return res.status(400).json({ error: "Employee or Candidate is required." });
    }

    const existingForCand = await db.candidateOnboarding.findFirst({
      where: { tenantId, candidateId: resolvedCandidateId },
    });
    if (existingForCand) {
      return res.status(409).json({ error: "Onboarding already exists for this employee/candidate." });
    }

    const checklist = templateId
      ? await db.onboardingChecklistTemplate.findFirst({
          where: { id: templateId, tenantId },
          include: { items: { orderBy: { sequence: "asc" } } },
        })
      : null;

    const resolvedDate = startDate || joiningDate || new Date().toISOString().slice(0, 10);

    const created = await db.candidateOnboarding.create({
      data: {
        tenantId,
        candidateId: resolvedCandidateId,
        templateId: templateId || null,
        joiningDate: new Date(resolvedDate),
        buddyId: buddyId || null,
        status: status ? String(status).toLowerCase() : "pending",
        tasks:
          checklist && checklist.items.length > 0
            ? {
                create: checklist.items.map((it: any, idx: number) => ({
                  tenantId,
                  title: it.title,
                  description: it.description || null,
                  category: it.category || "Training",
                  isMandatory: it.isMandatory !== false,
                  sequence: it.sequence || idx + 1,
                  dueOffsetDays: Number(it.dueOffsetDays) || idx + 1,
                  status: "pending",
                })),
              }
            : undefined,
      },
      include: {
        candidate: { select: { id: true, fullName: true, email: true, phone: true } },
        buddy: { select: { id: true, firstName: true, lastName: true, email: true } },
        template: { include: { items: { orderBy: { sequence: "asc" } } } },
        tasks: { orderBy: { sequence: "asc" } },
      },
    });
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/candidate-onboarding/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.candidateOnboarding.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Onboarding record not found." });

    const { templateId, startDate, joiningDate, buddyId, status } = req.body;
    const resolvedDate = startDate ?? joiningDate;

    const updated = await db.candidateOnboarding.update({
      where: { id: existing.id },
      data: {
        ...(templateId !== undefined ? { templateId: templateId || null } : {}),
        ...(resolvedDate ? { joiningDate: new Date(resolvedDate) } : {}),
        ...(buddyId !== undefined ? { buddyId: buddyId || null } : {}),
        ...(status !== undefined ? { status: String(status).toLowerCase() } : {}),
      },
      include: {
        candidate: { select: { id: true, fullName: true, email: true, phone: true } },
        buddy: { select: { id: true, firstName: true, lastName: true, email: true } },
        template: { include: { items: { orderBy: { sequence: "asc" } } } },
        tasks: { orderBy: { sequence: "asc" } },
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/candidate-onboarding/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.candidateOnboarding.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/candidate-onboarding/:id/tasks/:taskId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { status, notes, documentUrl } = req.body;

    const task = await db.candidateOnboardingTask.update({
      where: { id: req.params.taskId },
      data: {
        status: status || undefined,
        notes: notes || undefined,
        documentUrl: documentUrl || undefined,
        verifiedAt: status === "verified" ? new Date() : undefined,
      },
    });
    return res.json(task);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// 9. REFERRALS (HR-REC-18)
// =========================================================================

hrRecruitmentRouter.get("/referrals", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const referrals = await db.employeeReferral.findMany({
      where: { tenantId },
      include: {
        referrer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(referrals);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/referrals", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    const db = getTenantDb();

    const employee = await db.employee.findFirst({
      where: { tenantId, userId: actorId },
    });

    const { candidateName, candidateEmail, candidatePhone, jobTitle, notes } = req.body;
    if (!candidateName || !candidateEmail) {
      return res.status(400).json({ error: "Candidate name and email are required." });
    }

    const referralCode = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const referral = await db.employeeReferral.create({
      data: {
        tenantId,
        referrerId: employee?.id || actorId,
        referralCode,
        jobTitle: jobTitle || "Open Role",
        refereeName: candidateName.trim(),
        refereeEmail: candidateEmail.toLowerCase().trim(),
        refereePhone: candidatePhone?.trim() || null,
        notes: notes || null,
        status: "pending",
      },
    });

    return res.status(201).json(referral);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/referrals/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { status } = req.body;

    const updated = await db.employeeReferral.update({
      where: { id: req.params.id },
      data: { status },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
