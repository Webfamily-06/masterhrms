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

// --- Job Types ---
hrRecruitmentRouter.get("/job-types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const items = await db.jobType.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
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
    const items = await db.jobLocation.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/job-locations", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { name, code, city, state, country, isRemote, isActive } = req.body;
    if (!name) return res.status(400).json({ error: "Location name is required." });
    const item = await db.jobLocation.create({
      data: {
        tenantId,
        name: name.trim(),
        code: code?.trim() || `LOC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        city: city || null,
        state: state || null,
        country: country || "India",
        isRemote: Boolean(isRemote),
        isActive: isActive !== false,
      },
    });
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/job-locations/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
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
    const items = await db.candidateSource.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/candidate-sources", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { name, code, type, isActive } = req.body;
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
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/candidate-sources/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
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
    const items = await db.interviewTypeMaster.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
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
    const items = await db.interviewRoundMaster.findMany({ where: { tenantId }, orderBy: { sequence: "asc" } });
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/interview-rounds", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { name, sequence, description, isActive } = req.body;
    if (!name) return res.status(400).json({ error: "Round name is required." });
    const item = await db.interviewRoundMaster.create({
      data: { tenantId, name: name.trim(), sequence: Number(sequence) || 1, description: description || null, isActive: isActive !== false },
    });
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/interview-rounds/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.interviewRoundMaster.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Onboarding Check Items ---
hrRecruitmentRouter.get("/check-items", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const items = await db.onboardingCheckItem.findMany({ where: { tenantId }, orderBy: { title: "asc" } });
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
        category: category || "document",
        description: description || null,
        isMandatory: isMandatory !== false,
        dueOffsetDays: Number(dueOffsetDays) || 0,
        sequence: Number(sequence) || 1,
        assigneeRole: assigneeRole || "candidate",
        isActive: isActive !== false,
      },
    });
    return res.status(201).json(item);
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
    return res.json(templates);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/onboarding-checklists", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { name, code, description, items } = req.body;
    if (!name) return res.status(400).json({ error: "Template name is required." });

    const templateCode = code?.trim() || `CHK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const template = await db.onboardingChecklistTemplate.create({
      data: {
        tenantId,
        name: name.trim(),
        code: templateCode,
        description: description || null,
        items: Array.isArray(items) && items.length > 0 ? {
          create: items.map((it: any, idx: number) => ({
            tenantId,
            title: it.title,
            description: it.description || null,
            category: it.category || "document",
            dueOffsetDays: Number(it.dueOffsetDays) || 3,
            isMandatory: it.isMandatory !== false,
            sequence: it.sequence || idx + 1,
            assigneeRole: it.assigneeRole || "candidate",
          })),
        } : undefined,
      },
      include: { items: true },
    });
    return res.status(201).json(template);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Offer Templates ---
hrRecruitmentRouter.get("/offer-templates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const templates = await db.offerTemplate.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
    return res.json(templates);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.post("/offer-templates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { name, code, bodyHtml, contentHtml, termsAndConditions, isActive } = req.body;
    if (!name || (!bodyHtml && !contentHtml)) return res.status(400).json({ error: "Template name and body HTML are required." });
    const templateCode = code?.trim() || `OFF-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const item = await db.offerTemplate.create({
      data: {
        tenantId,
        name: name.trim(),
        code: templateCode,
        bodyHtml: bodyHtml || contentHtml,
        termsAndConditions: termsAndConditions || null,
        isActive: isActive !== false,
      },
    });
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.delete("/offer-templates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.offerTemplate.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// 2. JOB POSTINGS LIFECYCLE (P5-BR-001, P5-BR-002)
// =========================================================================

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
      ];
    }

    const pagination = parsePaginationParams(req, "createdAt", 20);
    const [total, jobs] = await Promise.all([
      db.jobPosting.count({ where }),
      db.jobPosting.findMany({
        where,
        include: {
          department: true,
          designation: true,
          branch: true,
          _count: { select: { candidates: true } },
        },
        orderBy: { createdAt: "desc" },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(jobs, total, pagination));
    }
    return res.json(jobs);
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
      departmentId,
      designationId,
      branchId,
      description,
      requirements,
      location,
      employmentType,
      experienceLevel,
      salaryMin,
      salaryMax,
      openingsCount,
      closingDate,
      hiringManagerId,
      requiresApproval,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required." });
    }

    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const initialStatus = requiresApproval ? "pending_approval" : "draft";

    const job = await db.jobPosting.create({
      data: {
        tenantId,
        title: title.trim(),
        slug,
        departmentId: departmentId || null,
        designationId: designationId || null,
        branchId: branchId || null,
        description,
        requirements: requirements || null,
        location: location || "Remote",
        employmentType: employmentType || "full_time",
        experienceLevel: experienceLevel || "Mid-Level",
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
        openingsCount: openingsCount ? Number(openingsCount) : 1,
        status: initialStatus,
        closingDate: closingDate ? new Date(closingDate) : null,
        hiringManagerId: hiringManagerId || null,
      },
      include: {
        department: true,
        designation: true,
        branch: true,
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "JOB_POSTING_CREATED",
      entityType: "JobPosting",
      entityId: job.id,
      details: { title: job.title, status: job.status },
    });

    return res.status(201).json(job);
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
        candidates: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!job) return res.status(404).json({ error: "Job posting not found." });
    return res.json(job);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrRecruitmentRouter.put("/job-postings/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.jobPosting.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Job posting not found." });

    const updated = await db.jobPosting.update({
      where: { id: req.params.id },
      data: req.body,
      include: { department: true, designation: true, branch: true },
    });
    return res.json(updated);
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
          jobPosting: { include: { department: true } },
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
        template: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(items);
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
        candidate: { select: { id: true, fullName: true, email: true, jobPosting: true } },
        interviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });
    return res.json(interviews);
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
      interviewRound,
      roundName,
      interviewType,
      scheduledAt,
      durationMinutes,
      mode,
      meetingLink,
      notes,
    } = req.body;

    if (!candidateId || !scheduledAt) {
      return res.status(400).json({ error: "Candidate and scheduled time are required." });
    }

    const conflict = await RecruitmentService.checkInterviewConflict({
      tenantId,
      candidateId,
      interviewerId,
      scheduledAt,
      durationMinutes: Number(durationMinutes) || 60,
    });

    if (conflict.hasConflict) {
      return res.status(409).json({
        error: conflict.conflictReason || "Interview scheduling conflict detected.",
        conflictingInterview: conflict.conflictingInterview,
      });
    }

    const interview = await db.jobCandidateInterview.create({
      data: {
        tenantId,
        candidateId,
        interviewerId: interviewerId || null,
        roundNumber: Number(interviewRound) || 1,
        roundName: roundName || "Technical Round",
        interviewType: interviewType || "Technical Round",
        scheduledAt: new Date(scheduledAt),
        durationMinutes: Number(durationMinutes) || 45,
        mode: mode || "virtual",
        meetingLink: meetingLink || null,
        notes: notes || null,
        status: "scheduled",
      },
      include: {
        candidate: true,
        interviewer: true,
      },
    });

    await OutboxService.publish({
      tenantId,
      eventType: "INTERVIEW_SCHEDULED",
      entityId: interview.id,
      payload: { interviewId: interview.id, candidateId, scheduledAt, actorId },
    });

    return res.status(201).json(interview);
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
        jobPosting: { select: { id: true, title: true } },
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
      joiningDate,
      expiryDate,
      ctcBreakdown,
      notes,
    } = req.body;

    if (!candidateId || !ctcAnnual || !joiningDate) {
      return res.status(400).json({ error: "Candidate, Annual CTC, and joining date are required." });
    }

    const annualCtc = Number(ctcAnnual);
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
        joiningDate: new Date(joiningDate),
        expiresAt: expiryDate ? new Date(expiryDate) : null,
        ctcStructureJson: ctcBreakdown || {},
        comments: notes || null,
        status: "draft",
      },
      include: {
        candidate: true,
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
