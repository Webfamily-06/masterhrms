import { prisma } from "../prisma";

export type CalendarAuditAction =
  | "EVENT_CREATE"
  | "EVENT_UPDATE"
  | "EVENT_CANCEL"
  | "EVENT_DELETE"
  | "SHARE_ADD"
  | "SHARE_REVOKE"
  | "RSVP_UPDATE"
  | "RECURRENCE_SERIES_UPDATE"
  | "OCCURRENCE_EXCEPTION"
  | "OCCURRENCE_CANCEL"
  | "ROOM_ASSIGN";

export interface RecordCalendarAuditParams {
  tenantId: string;
  actorId?: string;
  actorEmail?: string;
  action: CalendarAuditAction;
  entityId: string;
  beforeJson?: any;
  afterJson?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class CalendarAuditService {
  /**
   * Sanitizes sensitive information before writing to audit log
   */
  private static sanitizePayload(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;

    const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };
    const sensitiveKeys = ["password", "token", "jwt", "secret", "pan", "aadhaar", "salary"];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
        sanitized[key] = this.sanitizePayload(sanitized[key]);
      }
    }
    return sanitized;
  }

  /**
   * Records an auditable calendar action
   */
  public static async record(params: RecordCalendarAuditParams): Promise<void> {
    try {
      const {
        tenantId,
        actorId,
        actorEmail,
        action,
        entityId,
        beforeJson,
        afterJson,
        ipAddress,
        userAgent,
      } = params;

      await prisma.auditLog.create({
        data: {
          tenantId,
          actorId: actorId || null,
          actorEmail: actorEmail || null,
          action,
          entityType: "CALENDAR_EVENT",
          entityId,
          beforeJson: beforeJson ? this.sanitizePayload(beforeJson) : null,
          afterJson: afterJson ? this.sanitizePayload(afterJson) : null,
          ipAddress: ipAddress ? ipAddress.slice(0, 45) : null,
          userAgent: userAgent ? userAgent.slice(0, 255) : null,
        },
      });
    } catch (err: any) {
      // Deliberately log audit failures to stderr without crashing primary transactions
      console.error("[CalendarAuditService] Failed to record audit log:", err.message);
    }
  }

  /**
   * Retrieves audit logs for a specific calendar event
   */
  public static async getEventAuditLogs(tenantId: string, eventId: string) {
    return await prisma.auditLog.findMany({
      where: {
        tenantId,
        entityType: "CALENDAR_EVENT",
        entityId: eventId,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}
