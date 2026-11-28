"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.announcementsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_context_1 = require("../context/tenant-context");
const pagination_1 = require("../lib/pagination");
const chat_service_1 = require("../services/chat.service");
const socket_1 = require("../socket");
exports.announcementsRouter = (0, express_1.Router)();
// Controlled Pilot Integration: Enforce Request-Scoped Tenant Context on all announcement endpoints
exports.announcementsRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
function requireAnnouncementManagePermission(req, res) {
    if (!chat_service_1.ChatService.hasChatPermission(req.user, "chat.announcements")) {
        res.status(403).json({
            error: "Forbidden: Only HR managers or workspace administrators can manage official announcements.",
            code: "ANNOUNCEMENT_MANAGE_FORBIDDEN",
        });
        return false;
    }
    return true;
}
// Auto-seed default categories if none exist for tenant
async function ensureSeedCategories(tenantId, db) {
    try {
        const count = await db.announcementCategory.count({ where: { tenantId } });
        if (count > 0)
            return;
        const defaults = [
            { name: "Company News", slug: "company_news", description: "Official corporate news, townhalls, and business milestones", color: "#3B82F6", icon: "ph-newspaper", displayOrder: 1 },
            { name: "Policy Update", slug: "policy_update", description: "Mandatory compliance, HR policies, and code of conduct updates", color: "#8B5CF6", icon: "ph-shield-check", displayOrder: 2 },
            { name: "Event & Wellness", slug: "event", description: "Team building, wellness webinars, and sports gatherings", color: "#10B981", icon: "ph-calendar", displayOrder: 3 },
            { name: "Celebration", slug: "celebration", description: "Employee anniversaries, promotions, and festival wishes", color: "#EC4899", icon: "ph-confetti", displayOrder: 4 },
            { name: "Urgent Alert", slug: "urgent_alert", description: "Critical system alerts, emergencies, and facility notices", color: "#EF4444", icon: "ph-warning-circle", displayOrder: 5 },
            { name: "Holiday Notice", slug: "holiday", description: "National holidays, optional leave days, and festive closures", color: "#F59E0B", icon: "ph-sun", displayOrder: 6 },
        ];
        for (const item of defaults) {
            await db.announcementCategory.create({
                data: {
                    tenantId,
                    name: item.name,
                    slug: item.slug,
                    description: item.description,
                    color: item.color,
                    icon: item.icon,
                    displayOrder: item.displayOrder,
                    isActive: true,
                },
            }).catch(() => { });
        }
    }
    catch (err) {
        console.error("[ensureSeedCategories] error:", err);
    }
}
// Auto-seed initial enterprise announcements if none exist for tenant
async function ensureSeedAnnouncements(tenantId, db) {
    try {
        const count = await db.announcement.count({ where: { tenantId } });
        if (count > 0)
            return;
        await ensureSeedCategories(tenantId, db);
        const now = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);
        await db.announcement.createMany({
            data: [
                {
                    tenantId,
                    title: "Annual Company Strategy & Product Roadmap 2026 Kickoff",
                    summary: "Join us this Friday at 4:00 PM for the All-Hands meeting to review our global expansion, new product suites, and Q1 goals.",
                    content: `Dear Team,\n\nWe are thrilled to announce our 2026 Annual All-Hands Kickoff meeting! Over the past year, we have scaled our customer base and launched state-of-the-art enterprise modules.\n\n### Key Agenda:\n1. 2025 Retrospective & Key Milestones Achieved.\n2. 2026 Product Strategy & Global Expansion.\n3. Department Highlights & Team Recognition.\n4. Open Q&A with Executive Leadership.\n\n**Date & Time:** Friday, 4:00 PM - 5:30 PM (IST)\n**Location:** Main Townhall & Global Virtual Stream`,
                    category: "company_news",
                    priority: "high",
                    status: "published",
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
                    status: "published",
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
                    status: "published",
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
                    status: "published",
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
    catch (err) {
        console.error("[ensureSeedAnnouncements] error:", err);
    }
}
// Lifecycle synchronization: converts scheduled to published and published to expired
async function syncAnnouncementLifecycle(tenantId, db) {
    const now = new Date();
    try {
        // 1. scheduled -> published
        await db.announcement.updateMany({
            where: {
                tenantId,
                status: "scheduled",
                publishDate: { lte: now },
            },
            data: { status: "published" },
        });
        // 2. published -> expired
        await db.announcement.updateMany({
            where: {
                tenantId,
                status: "published",
                expiryDate: { not: null, lte: now },
            },
            data: { status: "expired" },
        });
    }
    catch (e) {
        console.error("[syncAnnouncementLifecycle] error:", e);
    }
}
// Eligible employees resolution helper
async function getEligibleEmployees(tenantId, targetType, targetDepartmentId, targetBranchId, db = prisma_1.prisma) {
    const where = {
        tenantId,
        status: "active",
    };
    if (targetType === "department" && targetDepartmentId) {
        where.departmentId = targetDepartmentId;
    }
    else if (targetType === "branch" && targetBranchId) {
        where.branchId = targetBranchId;
    }
    else if (targetType === "custom") {
        const conditions = [];
        if (targetDepartmentId)
            conditions.push({ departmentId: targetDepartmentId });
        if (targetBranchId)
            conditions.push({ branchId: targetBranchId });
        if (conditions.length > 0) {
            where.AND = conditions;
        }
    }
    return await db.employee.findMany({
        where,
        select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            departmentId: true,
            branchId: true,
            department: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
        },
    });
}
// In-app notifications helper
async function notifyEligibleEmployees(tenantId, announcement, db) {
    try {
        const eligible = await getEligibleEmployees(tenantId, announcement.targetType, announcement.targetDepartmentId, announcement.targetBranchId, db);
        const notificationsToCreate = eligible
            .filter((emp) => emp.userId)
            .map((emp) => ({
            tenantId,
            userId: emp.userId,
            title: announcement.priority === "urgent"
                ? `🚨 Urgent Notice: ${announcement.title}`
                : `📢 New Announcement: ${announcement.title}`,
            body: announcement.summary || (announcement.content ? announcement.content.slice(0, 150) : "A new company announcement has been published."),
            module: "ANNOUNCEMENT",
            channel: "IN_APP",
            linkTo: "/me/organization/announcements",
            metadataJson: {
                announcementId: announcement.id,
                priority: announcement.priority,
                category: announcement.category,
                acknowledgementRequired: announcement.acknowledgementRequired,
            },
        }));
        if (notificationsToCreate.length > 0) {
            await db.notification.createMany({
                data: notificationsToCreate,
                skipDuplicates: true,
            });
            for (const item of notificationsToCreate) {
                (0, socket_1.broadcastToUser)(item.userId, "announcement:published", {
                    id: announcement.id,
                    type: "official_announcement",
                    title: announcement.title,
                    summary: announcement.summary,
                    priority: announcement.priority,
                    category: announcement.category,
                    acknowledgementRequired: announcement.acknowledgementRequired,
                    publishDate: announcement.publishDate,
                });
            }
        }
    }
    catch (err) {
        console.error("[notifyEligibleEmployees] Failed to generate notifications:", err);
    }
}
// =========================================================================
// CATEGORY MANAGEMENT
// =========================================================================
/**
 * GET /api/announcements/categories
 * Returns all categories for the current tenant
 */
exports.announcementsRouter.get("/categories", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        await ensureSeedCategories(tenantId, db);
        const categories = await db.announcementCategory.findMany({
            where: { tenantId },
            include: {
                _count: {
                    select: { announcements: true },
                },
            },
            orderBy: { displayOrder: "asc" },
        });
        return res.json(categories);
    }
    catch (err) {
        console.error("[GET /api/announcements/categories] error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch announcement categories." });
    }
});
/**
 * POST /api/announcements/categories
 * Creates a new category
 */
exports.announcementsRouter.post("/categories", async (req, res) => {
    try {
        if (!requireAnnouncementManagePermission(req, res))
            return;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { name, slug, description, color, icon, isActive, displayOrder } = req.body;
        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ error: "Category name is required." });
        }
        const cleanSlug = (slug || name).toLowerCase().trim().replace(/[^a-z0-9_-]/g, "_");
        const db = (0, tenant_context_1.getTenantDb)(req);
        // Check uniqueness
        const existing = await db.announcementCategory.findFirst({
            where: {
                tenantId,
                OR: [{ name: name.trim() }, { slug: cleanSlug }],
            },
        });
        if (existing) {
            return res.status(400).json({ error: "A category with this name or slug already exists." });
        }
        const created = await db.announcementCategory.create({
            data: {
                tenantId,
                name: name.trim(),
                slug: cleanSlug,
                description: description?.trim() || null,
                color: color || "#3B82F6",
                icon: icon || "ph-megaphone",
                isActive: isActive !== undefined ? Boolean(isActive) : true,
                displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
            },
        });
        return res.status(201).json(created);
    }
    catch (err) {
        console.error("[POST /api/announcements/categories] error:", err);
        return res.status(500).json({ error: err.message || "Failed to create category." });
    }
});
/**
 * PUT /api/announcements/categories/:id
 * Updates an existing category
 */
exports.announcementsRouter.put("/categories/:id", async (req, res) => {
    try {
        if (!requireAnnouncementManagePermission(req, res))
            return;
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        const category = await db.announcementCategory.findFirst({
            where: { id, tenantId },
        });
        if (!category) {
            return res.status(404).json({ error: "Category not found." });
        }
        const { name, description, color, icon, isActive, displayOrder } = req.body;
        if (name && name.trim() !== category.name) {
            const duplicate = await db.announcementCategory.findFirst({
                where: {
                    tenantId,
                    name: name.trim(),
                    id: { not: id },
                },
            });
            if (duplicate) {
                return res.status(400).json({ error: "Another category with this name already exists." });
            }
        }
        const updated = await db.announcementCategory.update({
            where: { id },
            data: {
                name: name ? name.trim() : undefined,
                description: description !== undefined ? description?.trim() || null : undefined,
                color: color || undefined,
                icon: icon || undefined,
                isActive: isActive !== undefined ? Boolean(isActive) : undefined,
                displayOrder: typeof displayOrder === "number" ? displayOrder : undefined,
            },
        });
        return res.json(updated);
    }
    catch (err) {
        console.error("[PUT /api/announcements/categories/:id] error:", err);
        return res.status(500).json({ error: err.message || "Failed to update category." });
    }
});
/**
 * DELETE /api/announcements/categories/:id
 * Deletes category safely if no announcements are attached
 */
exports.announcementsRouter.delete("/categories/:id", async (req, res) => {
    try {
        if (!requireAnnouncementManagePermission(req, res))
            return;
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        const category = await db.announcementCategory.findFirst({
            where: { id, tenantId },
        });
        if (!category) {
            return res.status(404).json({ error: "Category not found." });
        }
        // Check if announcements reference this category by id or by slug
        const count = await db.announcement.count({
            where: {
                tenantId,
                OR: [{ categoryId: id }, { category: category.slug }],
            },
        });
        if (count > 0) {
            return res.status(400).json({
                error: `Cannot delete category "${category.name}" because it is currently referenced by ${count} announcement(s). Reassign or archive those announcements first.`,
            });
        }
        await db.announcementCategory.delete({ where: { id } });
        return res.json({ success: true, message: `Category "${category.name}" deleted successfully.` });
    }
    catch (err) {
        console.error("[DELETE /api/announcements/categories/:id] error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete category." });
    }
});
// =========================================================================
// ANNOUNCEMENTS LIST & STATS
// =========================================================================
/**
 * GET /api/announcements
 * Lists announcements for current tenant with status, category, search, priority, branch, department, and pin sorting.
 */
exports.announcementsRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        await ensureSeedAnnouncements(tenantId, db);
        await syncAnnouncementLifecycle(tenantId, db);
        const { category, priority, status, search, departmentId, branchId } = req.query;
        const where = { tenantId };
        if (category && category !== "all") {
            where.OR = [
                { category: String(category) },
                { categoryId: String(category) },
            ];
        }
        if (priority && priority !== "all") {
            where.priority = String(priority);
        }
        if (status && status !== "all") {
            where.status = String(status);
        }
        if (departmentId && departmentId !== "all") {
            where.OR = [
                { targetType: "all_company" },
                { targetDepartmentId: String(departmentId) },
            ];
        }
        if (branchId && branchId !== "all") {
            where.OR = [
                { targetType: "all_company" },
                { targetBranchId: String(branchId) },
            ];
        }
        if (search) {
            const q = String(search);
            where.AND = [
                {
                    OR: [
                        { title: { contains: q, mode: "insensitive" } },
                        { summary: { contains: q, mode: "insensitive" } },
                        { content: { contains: q, mode: "insensitive" } },
                        { authorName: { contains: q, mode: "insensitive" } },
                    ],
                },
            ];
        }
        const pagination = (0, pagination_1.parsePaginationParams)(req, "publishDate", 10);
        const [total, announcements] = await Promise.all([
            db.announcement.count({ where }),
            db.announcement.findMany({
                where,
                include: {
                    targetDepartment: true,
                    targetBranch: true,
                    categoryModel: true,
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
                                    branch: { select: { name: true } },
                                },
                            },
                        },
                    },
                    views: {
                        select: {
                            id: true,
                            employeeId: true,
                            viewedAt: true,
                            viewCount: true,
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
        // Compute active employees in tenant for engagement context
        const totalEmployees = await db.employee.count({
            where: { tenantId, status: "active" },
        });
        const enriched = announcements.map((a) => {
            const ackCount = a.acknowledgements?.length || 0;
            const uniqueViewsCount = a.views?.length || 0;
            return {
                ...a,
                totalEligibleEmployees: totalEmployees,
                uniqueViewsCount,
                acknowledgementCount: ackCount,
            };
        });
        if (pagination.isPaginated) {
            return res.json((0, pagination_1.formatPaginatedResponse)(enriched, total, pagination));
        }
        res.setHeader("X-Total-Count", String(total));
        return res.json(enriched);
    }
    catch (err) {
        console.error("[GET /api/announcements] error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch announcements." });
    }
});
/**
 * GET /api/announcements/summary/stats
 * Complete metrics: total, by status, pinned, urgent, policy compliance.
 */
exports.announcementsRouter.get("/summary/stats", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        await syncAnnouncementLifecycle(tenantId, db);
        const all = await db.announcement.findMany({
            where: { tenantId },
            include: { acknowledgements: true, views: true },
        });
        const totalEmployees = await db.employee.count({
            where: { tenantId, status: "active" },
        });
        const totalAnnouncements = all.length;
        const publishedCount = all.filter((a) => a.status === "published").length;
        const draftCount = all.filter((a) => a.status === "draft").length;
        const scheduledCount = all.filter((a) => a.status === "scheduled").length;
        const expiredCount = all.filter((a) => a.status === "expired").length;
        const archivedCount = all.filter((a) => a.status === "archived").length;
        const pinnedCount = all.filter((a) => a.isPinned).length;
        const urgentCount = all.filter((a) => a.priority === "urgent" || a.priority === "high").length;
        const policyCount = all.filter((a) => a.acknowledgementRequired).length;
        // Engagement totals
        let totalViews = 0;
        let totalAcks = 0;
        let totalAckRequired = 0;
        all.forEach((a) => {
            totalViews += (a.views?.length || a.viewCount || 0);
            if (a.acknowledgementRequired) {
                totalAckRequired += totalEmployees;
                totalAcks += a.acknowledgements.length;
            }
        });
        const complianceRate = totalAckRequired > 0 ? Math.round((totalAcks / totalAckRequired) * 100) : 100;
        return res.json({
            totalAnnouncements,
            publishedCount,
            draftCount,
            scheduledCount,
            expiredCount,
            archivedCount,
            pinnedCount,
            urgentCount,
            policyCount,
            complianceRate,
            totalViews,
            totalAcks,
            totalActiveEmployees: totalEmployees,
        });
    }
    catch (err) {
        console.error("[GET /api/announcements/summary/stats] error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch announcement metrics." });
    }
});
/**
 * GET /api/announcements/:id/analytics
 * Dedicated detailed engagement statistics for a single announcement
 */
exports.announcementsRouter.get("/:id/analytics", async (req, res) => {
    try {
        if (!requireAnnouncementManagePermission(req, res))
            return;
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        const announcement = await db.announcement.findFirst({
            where: { id, tenantId },
            include: {
                targetDepartment: true,
                targetBranch: true,
                categoryModel: true,
                acknowledgements: {
                    include: {
                        employee: {
                            include: { department: true, branch: true },
                        },
                    },
                },
                views: {
                    include: {
                        employee: {
                            include: { department: true, branch: true },
                        },
                    },
                },
            },
        });
        if (!announcement) {
            return res.status(404).json({ error: "Announcement not found." });
        }
        // Resolve eligible audience employees
        const eligibleEmployees = await getEligibleEmployees(tenantId, announcement.targetType, announcement.targetDepartmentId, announcement.targetBranchId, db);
        const totalEligible = eligibleEmployees.length;
        // Map views and acknowledgements by employeeId
        const viewMap = new Map();
        announcement.views.forEach((v) => {
            viewMap.set(v.employeeId, v);
        });
        const ackMap = new Map();
        announcement.acknowledgements.forEach((a) => {
            ackMap.set(a.employeeId, a);
        });
        // Build complete employee roster
        const employeeRoster = eligibleEmployees.map((emp) => {
            const view = viewMap.get(emp.id);
            const ack = ackMap.get(emp.id);
            return {
                employeeId: emp.id,
                firstName: emp.firstName,
                lastName: emp.lastName,
                fullName: `${emp.firstName} ${emp.lastName}`.trim(),
                employeeCode: emp.employeeCode,
                department: emp.department?.name || "General",
                departmentId: emp.departmentId,
                branch: emp.branch?.name || "Main HQ",
                branchId: emp.branchId,
                hasViewed: Boolean(view),
                viewCount: view ? view.viewCount : 0,
                viewedAt: view ? view.viewedAt : null,
                hasAcknowledged: Boolean(ack),
                acknowledgedAt: ack ? ack.acknowledgedAt : null,
                comments: ack ? ack.comments : null,
            };
        });
        const uniqueViewsCount = viewMap.size;
        const ackCount = ackMap.size;
        const viewRate = totalEligible > 0 ? Math.round((uniqueViewsCount / totalEligible) * 100) : 0;
        const ackRate = totalEligible > 0 ? Math.round((ackCount / totalEligible) * 100) : 0;
        const pendingAcks = announcement.acknowledgementRequired ? Math.max(0, totalEligible - ackCount) : 0;
        // Department-wise breakdown
        const deptMap = new Map();
        employeeRoster.forEach((emp) => {
            const deptName = emp.department;
            if (!deptMap.has(deptName)) {
                deptMap.set(deptName, { departmentName: deptName, eligible: 0, viewed: 0, acked: 0 });
            }
            const entry = deptMap.get(deptName);
            entry.eligible += 1;
            if (emp.hasViewed)
                entry.viewed += 1;
            if (emp.hasAcknowledged)
                entry.acked += 1;
        });
        const departmentBreakdown = Array.from(deptMap.values()).map((d) => ({
            ...d,
            viewRate: d.eligible > 0 ? Math.round((d.viewed / d.eligible) * 100) : 0,
            ackRate: d.eligible > 0 ? Math.round((d.acked / d.eligible) * 100) : 0,
        }));
        // Branch-wise breakdown
        const branchBreakdownMap = new Map();
        employeeRoster.forEach((emp) => {
            const brName = emp.branch;
            if (!branchBreakdownMap.has(brName)) {
                branchBreakdownMap.set(brName, { branchName: brName, eligible: 0, viewed: 0, acked: 0 });
            }
            const entry = branchBreakdownMap.get(brName);
            entry.eligible += 1;
            if (emp.hasViewed)
                entry.viewed += 1;
            if (emp.hasAcknowledged)
                entry.acked += 1;
        });
        const branchBreakdown = Array.from(branchBreakdownMap.values()).map((b) => ({
            ...b,
            viewRate: b.eligible > 0 ? Math.round((b.viewed / b.eligible) * 100) : 0,
            ackRate: b.eligible > 0 ? Math.round((b.acked / b.eligible) * 100) : 0,
        }));
        return res.json({
            announcement: {
                id: announcement.id,
                title: announcement.title,
                summary: announcement.summary,
                category: announcement.category,
                categoryModel: announcement.categoryModel,
                priority: announcement.priority,
                status: announcement.status,
                targetType: announcement.targetType,
                targetDepartment: announcement.targetDepartment,
                targetBranch: announcement.targetBranch,
                isPinned: announcement.isPinned,
                publishDate: announcement.publishDate,
                expiryDate: announcement.expiryDate,
                authorName: announcement.authorName,
                acknowledgementRequired: announcement.acknowledgementRequired,
            },
            metrics: {
                totalEligibleEmployees: totalEligible,
                uniqueViewsCount,
                viewRate,
                acknowledgementCount: ackCount,
                acknowledgementRate: ackRate,
                pendingAcknowledgements: pendingAcks,
            },
            departmentBreakdown,
            branchBreakdown,
            employeeRoster,
        });
    }
    catch (err) {
        console.error("[GET /api/announcements/:id/analytics] error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch announcement analytics." });
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
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        const announcement = await db.announcement.findFirst({
            where: { id, tenantId },
            include: {
                targetDepartment: true,
                targetBranch: true,
                categoryModel: true,
                author: true,
                acknowledgements: {
                    include: {
                        employee: {
                            include: { department: true, branch: true },
                        },
                    },
                    orderBy: { acknowledgedAt: "desc" },
                },
                views: true,
            },
        });
        if (!announcement) {
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
 * Create new announcement
 */
exports.announcementsRouter.post("/", async (req, res) => {
    try {
        if (!requireAnnouncementManagePermission(req, res))
            return;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        const { title, summary, content, category, categoryId, priority, status, targetType, targetDepartmentId, targetBranchId, isPinned, publishDate, expiryDate, authorName, attachmentUrl, acknowledgementRequired, } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: "Title and Content are required fields." });
        }
        // Determine initial status
        let initialStatus = status || "published";
        const pubDate = publishDate ? new Date(publishDate) : new Date();
        const expDate = expiryDate ? new Date(expiryDate) : null;
        if (status === "scheduled" || (pubDate > new Date() && status !== "draft")) {
            initialStatus = "scheduled";
        }
        // Resolve category slug
        let finalCategorySlug = category || "company_news";
        let finalCategoryId = categoryId || null;
        if (finalCategoryId && !category) {
            const catObj = await db.announcementCategory.findUnique({ where: { id: finalCategoryId } });
            if (catObj)
                finalCategorySlug = catObj.slug;
        }
        else if (!finalCategoryId && category) {
            const catObj = await db.announcementCategory.findFirst({ where: { tenantId, slug: category } });
            if (catObj)
                finalCategoryId = catObj.id;
        }
        const newAnnouncement = await db.announcement.create({
            data: {
                tenantId,
                title: title.trim(),
                summary: summary ? summary.trim() : null,
                content,
                category: finalCategorySlug,
                categoryId: finalCategoryId,
                priority: priority || "normal",
                status: initialStatus,
                targetType: targetType || "all_company",
                targetDepartmentId: targetDepartmentId || null,
                targetBranchId: targetBranchId || null,
                isPinned: Boolean(isPinned),
                publishDate: pubDate,
                expiryDate: expDate,
                authorName: authorName || req.user?.email || "Executive HR",
                attachmentUrl: attachmentUrl || null,
                acknowledgementRequired: Boolean(acknowledgementRequired),
            },
            include: {
                targetDepartment: true,
                targetBranch: true,
                categoryModel: true,
            },
        });
        // If published immediately, dispatch notifications
        if (initialStatus === "published") {
            notifyEligibleEmployees(tenantId, newAnnouncement, db).catch(() => { });
        }
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
        if (!requireAnnouncementManagePermission(req, res))
            return;
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        const existing = await db.announcement.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Announcement not found." });
        const { title, summary, content, category, categoryId, priority, status, targetType, targetDepartmentId, targetBranchId, isPinned, publishDate, expiryDate, authorName, attachmentUrl, acknowledgementRequired, } = req.body;
        const pubDate = publishDate !== undefined ? (publishDate ? new Date(publishDate) : new Date()) : existing.publishDate;
        const expDate = expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : existing.expiryDate;
        let targetStatus = status !== undefined ? status : existing.status;
        if (targetStatus === "scheduled" && pubDate <= new Date()) {
            targetStatus = "published";
        }
        const updated = await db.announcement.update({
            where: { id },
            data: {
                title: title !== undefined ? title.trim() : undefined,
                summary: summary !== undefined ? (summary ? summary.trim() : null) : undefined,
                content: content !== undefined ? content : undefined,
                category: category !== undefined ? category : undefined,
                categoryId: categoryId !== undefined ? categoryId : undefined,
                priority: priority !== undefined ? priority : undefined,
                status: targetStatus,
                targetType: targetType !== undefined ? targetType : undefined,
                targetDepartmentId: targetDepartmentId !== undefined ? (targetDepartmentId || null) : undefined,
                targetBranchId: targetBranchId !== undefined ? (targetBranchId || null) : undefined,
                isPinned: isPinned !== undefined ? Boolean(isPinned) : undefined,
                publishDate: pubDate,
                expiryDate: expDate,
                authorName: authorName !== undefined ? authorName : undefined,
                attachmentUrl: attachmentUrl !== undefined ? (attachmentUrl || null) : undefined,
                acknowledgementRequired: acknowledgementRequired !== undefined ? Boolean(acknowledgementRequired) : undefined,
            },
            include: {
                targetDepartment: true,
                targetBranch: true,
                categoryModel: true,
            },
        });
        // If transitioned from draft/scheduled to published, notify employees
        if (existing.status !== "published" && targetStatus === "published") {
            notifyEligibleEmployees(tenantId, updated, db).catch(() => { });
        }
        return res.json(updated);
    }
    catch (err) {
        console.error("[PUT /api/announcements/:id] error:", err);
        return res.status(500).json({ error: err.message || "Failed to update announcement." });
    }
});
/**
 * DELETE /api/announcements/:id
 * Delete announcement
 */
exports.announcementsRouter.delete("/:id", async (req, res) => {
    try {
        if (!requireAnnouncementManagePermission(req, res))
            return;
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        const existing = await db.announcement.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Announcement not found." });
        await db.announcement.delete({ where: { id } });
        return res.json({ success: true, message: "Announcement deleted successfully." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete announcement." });
    }
});
/**
 * POST /api/announcements/bulk
 * Execute bulk operations: publish, archive, delete
 */
exports.announcementsRouter.post("/bulk", async (req, res) => {
    try {
        if (!requireAnnouncementManagePermission(req, res))
            return;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { action, ids } = req.body;
        if (!action || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "Action and non-empty ids array are required." });
        }
        const uniqueIds = Array.from(new Set(ids.map(String).filter(Boolean)));
        const db = (0, tenant_context_1.getTenantDb)(req);
        // PARTIAL-003: Report actual affected count vs missing/foreign IDs (HTTP 207 on partial match)
        if (action === "publish") {
            const existing = await db.announcement.findMany({
                where: { tenantId, id: { in: uniqueIds } },
                select: { id: true },
            });
            const existingIds = new Set(existing.map((a) => a.id));
            const notFoundIds = uniqueIds.filter((id) => !existingIds.has(id));
            const result = await db.announcement.updateMany({
                where: { tenantId, id: { in: Array.from(existingIds) } },
                data: { status: "published", publishDate: new Date() },
            });
            const isPartial = result.count > 0 && notFoundIds.length > 0;
            if (result.count === 0) {
                return res.status(404).json({ success: false, error: "No matching announcements found in this workspace.", notFoundIds });
            }
            return res.status(isPartial ? 207 : 200).json({
                success: !isPartial,
                partial: isPartial,
                requestedCount: uniqueIds.length,
                updatedCount: result.count,
                notFoundCount: notFoundIds.length,
                notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined,
                message: `Successfully published ${result.count} of ${uniqueIds.length} announcement(s).`,
            });
        }
        if (action === "archive") {
            const existing = await db.announcement.findMany({
                where: { tenantId, id: { in: uniqueIds } },
                select: { id: true },
            });
            const existingIds = new Set(existing.map((a) => a.id));
            const notFoundIds = uniqueIds.filter((id) => !existingIds.has(id));
            const result = await db.announcement.updateMany({
                where: { tenantId, id: { in: Array.from(existingIds) } },
                data: { status: "archived" },
            });
            const isPartial = result.count > 0 && notFoundIds.length > 0;
            if (result.count === 0) {
                return res.status(404).json({ success: false, error: "No matching announcements found in this workspace.", notFoundIds });
            }
            return res.status(isPartial ? 207 : 200).json({
                success: !isPartial,
                partial: isPartial,
                requestedCount: uniqueIds.length,
                updatedCount: result.count,
                notFoundCount: notFoundIds.length,
                notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined,
                message: `Successfully archived ${result.count} of ${uniqueIds.length} announcement(s).`,
            });
        }
        if (action === "delete") {
            const existing = await db.announcement.findMany({
                where: { tenantId, id: { in: uniqueIds } },
                select: { id: true },
            });
            const existingIds = new Set(existing.map((a) => a.id));
            const notFoundIds = uniqueIds.filter((id) => !existingIds.has(id));
            const result = await db.announcement.deleteMany({
                where: { tenantId, id: { in: Array.from(existingIds) } },
            });
            const isPartial = result.count > 0 && notFoundIds.length > 0;
            if (result.count === 0) {
                return res.status(404).json({ success: false, error: "No matching announcements found in this workspace.", notFoundIds });
            }
            return res.status(isPartial ? 207 : 200).json({
                success: !isPartial,
                partial: isPartial,
                requestedCount: uniqueIds.length,
                deletedCount: result.count,
                notFoundCount: notFoundIds.length,
                notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined,
                message: `Successfully deleted ${result.count} of ${uniqueIds.length} announcement(s).`,
            });
        }
        return res.status(400).json({ error: `Unsupported bulk action: ${action}` });
    }
    catch (err) {
        console.error("[POST /api/announcements/bulk] error:", err);
        return res.status(500).json({ error: err.message || "Bulk action failed." });
    }
});
/**
 * POST /api/announcements/:id/view
 * Track employee view
 */
exports.announcementsRouter.post("/:id/view", async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        const ann = await db.announcement.findFirst({ where: { id, tenantId }, select: { id: true } });
        if (!ann)
            return res.status(404).json({ error: "Announcement not found." });
        // Resolve employee strictly from authenticated JWT user (prevent cross-employee view spoofing)
        const callerUserId = req.user?.userId || req.user?.id;
        const callerEmp = callerUserId
            ? await db.employee.findFirst({
                where: { tenantId, userId: callerUserId },
                select: { id: true },
            })
            : null;
        let employeeId = callerEmp?.id;
        if (req.body?.employeeId && req.body.employeeId !== callerEmp?.id) {
            if (!chat_service_1.ChatService.hasChatPermission(req.user, "chat.announcements")) {
                return res.status(403).json({
                    error: "Forbidden: Cannot record announcement view on behalf of another employee.",
                    code: "ANNOUNCEMENT_VIEW_SPOOF_FORBIDDEN",
                });
            }
            const targetEmp = await db.employee.findFirst({
                where: { id: String(req.body.employeeId), tenantId },
                select: { id: true },
            });
            if (targetEmp)
                employeeId = targetEmp.id;
        }
        if (!employeeId) {
            // Just increment global view count
            await db.announcement.update({
                where: { id },
                data: { viewCount: { increment: 1 } },
            });
            return res.json({ success: true, message: "Announcement view recorded." });
        }
        // Upsert unique announcement_view
        await db.announcementView.upsert({
            where: {
                announcementId_employeeId: {
                    announcementId: id,
                    employeeId,
                },
            },
            create: {
                tenantId,
                announcementId: id,
                employeeId,
                viewCount: 1,
            },
            update: {
                viewCount: { increment: 1 },
                lastViewedAt: new Date(),
            },
        });
        await db.announcement.update({
            where: { id },
            data: { viewCount: { increment: 1 } },
        });
        return res.json({ success: true, message: "Employee view recorded." });
    }
    catch (err) {
        console.error("[POST /api/announcements/:id/view] error:", err);
        return res.status(500).json({ error: err.message || "Failed to record view." });
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
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context required." });
        const db = (0, tenant_context_1.getTenantDb)(req);
        const ann = await db.announcement.findFirst({ where: { id, tenantId }, select: { id: true } });
        if (!ann)
            return res.status(404).json({ error: "Announcement not found." });
        const callerUserId = req.user?.userId || req.user?.id;
        const callerEmp = callerUserId
            ? await db.employee.findFirst({
                where: { tenantId, userId: callerUserId },
                select: { id: true },
            })
            : null;
        let employeeId = callerEmp?.id;
        if (req.body?.employeeId && req.body.employeeId !== callerEmp?.id) {
            if (!chat_service_1.ChatService.hasChatPermission(req.user, "chat.announcements")) {
                return res.status(403).json({
                    error: "Forbidden: Cannot forge compliance acknowledgement on behalf of another employee.",
                    code: "ANNOUNCEMENT_ACK_SPOOF_FORBIDDEN",
                });
            }
            const targetEmp = await db.employee.findFirst({
                where: { id: String(req.body.employeeId), tenantId },
                select: { id: true },
            });
            if (targetEmp)
                employeeId = targetEmp.id;
        }
        if (!employeeId)
            return res.status(400).json({ error: "Employee identification required." });
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
                comments: req.body?.comments || "Acknowledged and agreed.",
                acknowledgedAt: new Date(),
            },
            update: {
                comments: req.body?.comments || "Acknowledged and agreed.",
                acknowledgedAt: new Date(),
            },
            include: {
                employee: {
                    include: { department: true, branch: true },
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
