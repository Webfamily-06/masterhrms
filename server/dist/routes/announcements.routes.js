"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.announcementsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_context_1 = require("../context/tenant-context");
const pagination_1 = require("../lib/pagination");
exports.announcementsRouter = (0, express_1.Router)();
// Controlled Pilot Integration: Enforce Request-Scoped Tenant Context on all announcement endpoints
exports.announcementsRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// Auto-seed initial enterprise announcements if none exist for tenant
async function ensureSeedAnnouncements(tenantId) {
    const count = await prisma_1.prisma.announcement.count({ where: { tenantId } });
    if (count > 0)
        return;
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    await prisma_1.prisma.announcement.createMany({
        data: [
            {
                tenantId,
                title: "Annual Company Strategy & Product Roadmap 2026 Kickoff",
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
                title: "Mandatory Cybersecurity & SOC2 Compliance Policy Update",
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
                title: "Diwali & Festive Season Holiday Schedule",
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
                title: "Employee Wellness Program & Annual Health Checkups",
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
exports.announcementsRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        const { category, priority, search, departmentId } = req.query;
        const where = { tenantId };
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
        const pagination = (0, pagination_1.parsePaginationParams)(req, "publishDate", 20);
        const [total, announcements] = await Promise.all([
            db.announcement.count({ where }),
            db.announcement.findMany({
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
                ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
            }),
        ]);
        if (pagination.isPaginated) {
            return res.json((0, pagination_1.formatPaginatedResponse)(announcements, total, pagination));
        }
        res.setHeader("X-Total-Count", String(total));
        return res.json(announcements);
    }
    catch (err) {
        console.error("[GET /api/announcements] error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch announcements." });
    }
});
/**
 * GET /api/announcements/summary/stats
 * Metrics: total count, pinned count, urgent alerts, policy compliance rate.
 */
exports.announcementsRouter.get("/summary/stats", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        const all = await db.announcement.findMany({
            where: { tenantId },
            include: { acknowledgements: true },
        });
        const totalEmployees = await db.employee.count({
            where: { tenantId, status: "active" },
        });
        const totalAnnouncements = all.length;
        const pinnedCount = all.filter((a) => a.isPinned).length;
        const urgentCount = all.filter((a) => a.priority === "urgent" || a.priority === "high").length;
        const policyCount = all.filter((a) => a.acknowledgementRequired).length;
        // Calculate total acknowledgements required vs completed
        let totalRequired = 0;
        let totalCompleted = 0;
        all.forEach((a) => {
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
    }
    catch (err) {
        console.error("[GET /api/announcements/summary/stats] error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch announcement metrics." });
    }
});
/**
 * GET /api/announcements/:id
 * Get single announcement and increment view count
 */
exports.announcementsRouter.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)(req);
        const announcement = await db.announcement.update({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch announcement." });
    }
});
/**
 * POST /api/announcements
 * Create new company broadcast / announcement
 */
exports.announcementsRouter.post("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        const { title, summary, content, category, priority, targetType, targetDepartmentId, isPinned, publishDate, expiryDate, authorName, attachmentUrl, acknowledgementRequired, } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: "Title and Content are required fields." });
        }
        const newAnnouncement = await db.announcement.create({
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
    }
    catch (err) {
        console.error("[POST /api/announcements] error:", err);
        return res.status(500).json({ error: err.message || "Failed to create announcement." });
    }
});
/**
 * PUT /api/announcements/:id
 * Update announcement
 */
exports.announcementsRouter.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const db = (0, tenant_context_1.getTenantDb)(req);
        const { title, summary, content, category, priority, targetType, targetDepartmentId, isPinned, publishDate, expiryDate, authorName, attachmentUrl, acknowledgementRequired, } = req.body;
        const updated = await db.announcement.update({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update announcement." });
    }
});
/**
 * DELETE /api/announcements/:id
 * Delete announcement
 */
exports.announcementsRouter.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const db = (0, tenant_context_1.getTenantDb)(req);
        await db.announcement.delete({ where: { id } });
        return res.json({ success: true, message: "Announcement deleted successfully." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete announcement." });
    }
});
/**
 * POST /api/announcements/:id/acknowledge
 * Employee records official acknowledgement / digital compliance signature
 */
exports.announcementsRouter.post("/:id/acknowledge", async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const { employeeId, comments } = req.body;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        if (!employeeId)
            return res.status(400).json({ error: "Employee identification required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        const acknowledgement = await db.announcementAcknowledgement.upsert({
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
    }
    catch (err) {
        console.error("[POST /api/announcements/:id/acknowledge] error:", err);
        return res.status(500).json({ error: err.message || "Failed to record acknowledgement." });
    }
});
