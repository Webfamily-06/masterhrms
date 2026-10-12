import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import { AuditService } from "../../services/audit.service";
import { OutboxService } from "../../services/outbox.service";
const db = rawPrisma || proxiedPrisma;

export interface CreateNoticeInput {
  title: string;
  summary?: string;
  content: string;
  category?: string; // company_news, policy_update, event, celebration, urgent_alert, holiday
  priority?: "low" | "normal" | "high" | "urgent";
  targetType?: "all_company" | "department" | "specific_roles";
  targetDepartmentId?: string;
  isPinned?: boolean;
  publishDate?: Date;
  expiryDate?: Date;
  authorName?: string;
  authorId?: string;
  attachmentUrl?: string;
  acknowledgementRequired?: boolean;
}

export interface NoticeFilterOptions {
  category?: string;
  priority?: string;
  departmentId?: string;
  search?: string;
  role?: string;
}

export class NoticeBoardService {
  /**
   * Create a new announcement/notice.
   */
  static async createNotice(
    tenantId: string,
    authorUserId: string,
    input: CreateNoticeInput
  ) {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error("Notice title is required");
    }
    if (!input.content || input.content.trim().length === 0) {
      throw new Error("Notice content is required");
    }

    const notice = await db.announcement.create({
      data: {
        tenantId,
        title: input.title.trim(),
        summary: input.summary ? input.summary.trim() : null,
        content: input.content.trim(),
        category: input.category || "company_news",
        priority: input.priority || "normal",
        targetType: input.targetType || "all_company",
        targetDepartmentId: input.targetDepartmentId || null,
        isPinned: Boolean(input.isPinned),
        publishDate: input.publishDate || new Date(),
        expiryDate: input.expiryDate || null,
        authorName: input.authorName || "Management / HR",
        authorId: input.authorId || null,
        attachmentUrl: input.attachmentUrl || null,
        acknowledgementRequired: Boolean(input.acknowledgementRequired),
      },
      include: {
        targetDepartment: true,
      },
    });

    // Record audit log
    await AuditService.logMutation({
      tenantId,
      actorId: authorUserId,
      action: "notice-board.notice.created",
      entityType: "Announcement",
      entityId: notice.id,
      newState: {
        noticeId: notice.id,
        title: notice.title,
        priority: notice.priority,
        targetType: notice.targetType,
        acknowledgementRequired: notice.acknowledgementRequired,
      },
    }).catch(() => {});

    // Record outbox event
    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "notice-board.notice.created",
      entityType: "Announcement",
      entityId: notice.id,
      actorId: authorUserId,
      payload: {
        noticeId: notice.id,
        title: notice.title,
        priority: notice.priority,
        targetType: notice.targetType,
      },
    }).catch(() => {});

    return notice;
  }

  /**
   * Query notices for a tenant with audience and category filtering.
   */
  static async listNotices(
    tenantId: string,
    filters: NoticeFilterOptions = {}
  ) {
    const where: any = { tenantId };

    if (filters.category && filters.category !== "all") {
      where.category = filters.category;
    }
    if (filters.priority && filters.priority !== "all") {
      where.priority = filters.priority;
    }
    if (filters.departmentId && filters.departmentId !== "all") {
      where.OR = [
        { targetType: "all_company" },
        { targetDepartmentId: filters.departmentId },
      ];
    }
    if (filters.search) {
      const q = filters.search.trim();
      where.AND = [
        {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { summary: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        },
      ];
    }

    return await db.announcement.findMany({
      where,
      include: {
        targetDepartment: true,
        acknowledgements: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
              },
            },
          },
        },
      },
      orderBy: [{ isPinned: "desc" }, { publishDate: "desc" }],
    });
  }

  /**
   * Get single notice by ID and tenantId.
   */
  static async getNotice(tenantId: string, noticeId: string) {
    const notice = await db.announcement.findFirst({
      where: { id: noticeId, tenantId },
      include: {
        targetDepartment: true,
        acknowledgements: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
              },
            },
          },
        },
      },
    });

    if (!notice) {
      throw new Error("Notice not found");
    }

    return notice;
  }

  /**
   * Record employee acknowledgement for a notice.
   */
  static async acknowledgeNotice(
    tenantId: string,
    noticeId: string,
    employeeId: string,
    comments?: string
  ) {
    // 1. Verify notice exists and belongs to tenant
    const notice = await db.announcement.findFirst({
      where: { id: noticeId, tenantId },
    });
    if (!notice) {
      throw new Error("Notice not found in this workspace");
    }

    // 2. Verify employee exists and belongs to tenant
    const employee = await db.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!employee) {
      throw new Error("Employee not found in this workspace");
    }

    // 3. Upsert acknowledgement (prevents duplicates)
    const ack = await db.announcementAcknowledgement.upsert({
      where: {
        announcementId_employeeId: {
          announcementId: noticeId,
          employeeId,
        },
      },
      create: {
        announcementId: noticeId,
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
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
    });

    // Record outbox event
    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "notice-board.notice.acknowledged",
      entityType: "Announcement",
      entityId: noticeId,
      actorId: employeeId,
      payload: {
        noticeId,
        employeeId,
        acknowledgedAt: ack.acknowledgedAt,
      },
    }).catch(() => {});

    return ack;
  }

  /**
   * Delete a notice.
   */
  static async deleteNotice(tenantId: string, noticeId: string, userId: string) {
    const notice = await db.announcement.findFirst({
      where: { id: noticeId, tenantId },
    });
    if (!notice) {
      throw new Error("Notice not found");
    }

    await db.announcement.delete({ where: { id: noticeId } });

    await AuditService.logMutation({
      tenantId,
      actorId: userId,
      action: "notice-board.notice.deleted",
      entityType: "Announcement",
      entityId: noticeId,
      newState: { noticeId, title: notice.title },
    }).catch(() => {});

    return true;
  }

  /**
   * Get compliance and visibility statistics for the notice board.
   */
  static async getNoticeStats(tenantId: string) {
    const all = await db.announcement.findMany({
      where: { tenantId },
      include: { acknowledgements: true },
    });

    const totalActiveEmployees = await db.employee.count({
      where: { tenantId, status: "active" },
    });

    const totalNotices = all.length;
    const pinnedCount = all.filter((n) => n.isPinned).length;
    const urgentCount = all.filter((n) => n.priority === "urgent" || n.priority === "high").length;
    const policyCount = all.filter((n) => n.acknowledgementRequired).length;

    let totalRequired = 0;
    let totalCompleted = 0;
    all.forEach((n) => {
      if (n.acknowledgementRequired) {
        totalRequired += totalActiveEmployees;
        totalCompleted += n.acknowledgements.length;
      }
    });

    const complianceRate = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 100;

    return {
      totalNotices,
      pinnedCount,
      urgentCount,
      policyCount,
      totalActiveEmployees,
      complianceRate,
    };
  }
}
