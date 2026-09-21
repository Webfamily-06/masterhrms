import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const announcementsRouter = Router();

// Auto-seed initial enterprise announcements if none exist for tenant
async function ensureSeedAnnouncements(tenantId: string) {
  const count = await prisma.announcement.count({ where: { tenantId } });
  if (count > 0) return;

  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);

  await prisma.announcement.createMany({
    data: [
      {
        tenantId,
        title: "🚀 Annual Company Strategy & Product Roadmap 2026 Kickoff",
        summary: "Join us this Friday at 4:00 PM for the All-Hands meeting to review our global expansion, new product suites, and Q1 goals.",
        content: `Dear Team,\n\nWe are thrilled to announce our 2026 Annual All-Hands Kickoff meeting! Over the past year, we have scaled our customer base and launched state-of-the-art enterprise modules.\n\n### Key Agenda:\n1. 2025 Retrospective & Key Milestones Achieved.\n2. 2026 Product Strategy & Global Expansion.\n3. Department Highlights & Team Recognition.\n4. Open Q&A with Executive Leadership.\n\n**Date & Time:** Friday, 4:00 PM - 5:30 PM (IST)\n**Location:** Main Townhall & Global Virtual Stream`,
        category: "company_news",
        priority: "high",
        targetType: "all_company",
        isPinned: true,
        publishDate: now,
        expiryDate: nextMonth,
        authorName: "Executive Office / CEO",
        viewCount: 142,
        acknowledgementRequired: false,
      },
      {
        tenantId,
        title: "🛡️ Mandatory Cybersecurity & SOC2 Compliance Policy Update",
        summary: "All employees are required to review the updated SOC2 Type II data protection policy and complete digital acknowledgement by month-end.",
        content: `Attention All Employees,\n\nAs part of our continuous commitment to data privacy and SOC2 Type II compliance, we have updated our internal Security & Clean Desk Policy.\n\n### Compliance Requirements:\n- Enable Multi-Factor Authentication (MFA) on all company accounts.\n- Never share client credentials or sensitive PII over unencrypted channels.\n- Lock workstations when away from your desk.\n\n**Please click the 'Acknowledge Policy' button below to record your formal compliance signature.**`,
        category: "policy_update",
        priority: "urgent",
        targetType: "all_company",
        isPinned: true,
        publishDate: now,
        expiryDate: nextMonth,
        authorName: "Information Security & Compliance",
        viewCount: 210,
        acknowledgementRequired: true,
      },
      {
        tenantId,
        title: "🎉 Diwali & Festive Season Holiday Schedule",
        summary: "Official announcement regarding upcoming festive holidays and emergency support rostering schedule.",
        content: `Dear Colleagues,\n\nIn celebration of the upcoming festive season, please note the official office holiday schedule.\n\n- **Office Closure:** Oct 20th - Oct 22nd\n- **Emergency On-Call Support:** Managed via Shift Rostering schedule.\n- **Regular Business Resumes:** Oct 23rd at 9:00 AM.\n\nWishing you and your families a joyous and prosperous festive season!`,
        category: "holiday",
        priority: "normal",
        targetType: "all_company",
        isPinned: false,
        publishDate: now,
        authorName: "Human Resources Department",
        viewCount: 88,
        acknowledgementRequired: false,
      },
      {
        tenantId,
        title: "🌿 Employee Wellness Program & Annual Health Checkups",
        summary: "Complimentary comprehensive annual health checkups scheduled at our partner hospital network starting next week.",
        content: `Hi Everyone,\n\nYour health and wellbeing are our top priority. We are pleased to launch our Annual Health & Wellness Program in partnership with Apollo Healthcare.\n\n### Included Benefits:\n- Full executive health screening & blood work panel.\n- Eye care & dental checkups.\n- 1-on-1 nutritional consultation.\n\nSlots are available on a first-come, first-served basis. Coordinate with your department HR partner to reserve your preferred date.`,
        category: "event",
        priority: "normal",
        targetType: "all_company",
        isPinned: false,
        publishDate: now,
        authorName: "People & Culture Team",
        viewCount: 65,
        acknowledgementRequired: false,
      },
    ],
  });
}

/**
 * GET /api/announcements
 * Lists announcements for the current tenant with category, search, priority, and pin sorting.
 */
announcementsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    // seed disabled

    const { category, priority, search, departmentId } = req.query;

    const where: any = { tenantId };

    if (category && category !== "all") {
      where.category = String(category);
    }
    if (priority && priority !== "all") {
      where.priority = String(priority);
    }
    if (departmentId && departmentId !== "all") {
      where.OR = [
        { targetType: "all_company" },
        { targetDepartmentId: String(departmentId) },
      ];
    }
    if (search) {
      const q = String(search);
      where.AND = [
        {
          OR: [
            { title: { contains: q } },
            { summary: { contains: q } },
            { content: { contains: q } },
            { authorName: { contains: q } },
          ],
        },
      ];
    }

    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        targetDepartment: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            employeeCode: true,
          },
        },
        acknowledgements: {
          select: {
            id: true,
            employeeId: true,
            acknowledgedAt: true,
            comments: true,
            employee: {
              select: {
                firstName: true,
                lastName: true,
                employeeCode: true,
                department: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [
        { isPinned: "desc" },
        { publishDate: "desc" },
      ],
    });

    return res.json(announcements);
  } catch (err: any) {
    console.error("[GET /api/announcements] error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch announcements." });
  }
});

/**
 * GET /api/announcements/summary/stats
 * Metrics: total count, pinned count, urgent alerts, policy compliance rate.
 */
announcementsRouter.get("/summary/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const all = await prisma.announcement.findMany({
      where: { tenantId },
      include: { acknowledgements: true },
    });

    const totalEmployees = await prisma.employee.count({
      where: { tenantId, status: "active" },
    });

    const totalAnnouncements = all.length;
    const pinnedCount = all.filter((a: any) => a.isPinned).length;
    const urgentCount = all.filter((a: any) => a.priority === "urgent" || a.priority === "high").length;
    const policyCount = all.filter((a: any) => a.acknowledgementRequired).length;

    // Calculate total acknowledgements required vs completed
    let totalRequired = 0;
    let totalCompleted = 0;
    all.forEach((a: any) => {
      if (a.acknowledgementRequired) {
        totalRequired += totalEmployees;
        totalCompleted += a.acknowledgements.length;
      }
    });

    const complianceRate = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 100;

    return res.json({
      totalAnnouncements,
      pinnedCount,
      urgentCount,
      policyCount,
      complianceRate,
      totalActiveEmployees: totalEmployees,
    });
  } catch (err: any) {
    console.error("[GET /api/announcements/summary/stats] error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch announcement metrics." });
  }
});

/**
 * GET /api/announcements/:id
 * Get single announcement and increment view count
 */
announcementsRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: {
        targetDepartment: true,
        author: true,
        acknowledgements: {
          include: {
            employee: {
              include: { department: true },
            },
          },
          orderBy: { acknowledgedAt: "desc" },
        },
      },
    });

    if (!announcement || (tenantId && announcement.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Announcement not found." });
    }

    return res.json(announcement);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch announcement." });
  }
});

/**
 * POST /api/announcements
 * Create new company broadcast / announcement
 */
announcementsRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const {
      title,
      summary,
      content,
      category,
      priority,
      targetType,
      targetDepartmentId,
      isPinned,
      publishDate,
      expiryDate,
      authorName,
      attachmentUrl,
      acknowledgementRequired,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and Content are required fields." });
    }

    const newAnnouncement = await prisma.announcement.create({
      data: {
        tenantId,
        title,
        summary: summary || null,
        content,
        category: category || "company_news",
        priority: priority || "normal",
        targetType: targetType || "all_company",
        targetDepartmentId: targetDepartmentId || null,
        isPinned: Boolean(isPinned),
        publishDate: publishDate ? new Date(publishDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        authorName: authorName || req.user?.email || "Executive HR",
        attachmentUrl: attachmentUrl || null,
        acknowledgementRequired: Boolean(acknowledgementRequired),
      },
      include: {
        targetDepartment: true,
      },
    });

    return res.status(201).json(newAnnouncement);
  } catch (err: any) {
    console.error("[POST /api/announcements] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create announcement." });
  }
});

/**
 * PUT /api/announcements/:id
 * Update announcement
 */
announcementsRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      summary,
      content,
      category,
      priority,
      targetType,
      targetDepartmentId,
      isPinned,
      publishDate,
      expiryDate,
      authorName,
      attachmentUrl,
      acknowledgementRequired,
    } = req.body;

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        title,
        summary,
        content,
        category,
        priority,
        targetType,
        targetDepartmentId: targetDepartmentId || null,
        isPinned: isPinned !== undefined ? Boolean(isPinned) : undefined,
        publishDate: publishDate ? new Date(publishDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        authorName,
        attachmentUrl: attachmentUrl || null,
        acknowledgementRequired: acknowledgementRequired !== undefined ? Boolean(acknowledgementRequired) : undefined,
      },
      include: {
        targetDepartment: true,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update announcement." });
  }
});

/**
 * DELETE /api/announcements/:id
 * Delete announcement
 */
announcementsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.announcement.delete({ where: { id } });
    return res.json({ success: true, message: "Announcement deleted successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete announcement." });
  }
});

/**
 * POST /api/announcements/:id/acknowledge
 * Employee records official acknowledgement / digital compliance signature
 */
announcementsRouter.post("/:id/acknowledge", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const { employeeId, comments } = req.body;

    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });
    if (!employeeId) return res.status(400).json({ error: "Employee identification required." });

    const acknowledgement = await prisma.announcementAcknowledgement.upsert({
      where: {
        announcementId_employeeId: {
          announcementId: id,
          employeeId,
        },
      },
      create: {
        announcementId: id,
        employeeId,
        tenantId,
        comments: comments || "Acknowledged and agreed.",
        acknowledgedAt: new Date(),
      },
      update: {
        comments: comments || "Acknowledged and agreed.",
        acknowledgedAt: new Date(),
      },
      include: {
        employee: {
          include: { department: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Announcement acknowledged successfully!",
      acknowledgement,
    });
  } catch (err: any) {
    console.error("[POST /api/announcements/:id/acknowledge] error:", err);
    return res.status(500).json({ error: err.message || "Failed to record acknowledgement." });
  }
});
