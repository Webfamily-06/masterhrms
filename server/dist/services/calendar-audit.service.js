"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarAuditService = void 0;
const prisma_1 = require("../prisma");
class CalendarAuditService {
    /**
     * Sanitizes sensitive information before writing to audit log
     */
    static sanitizePayload(obj) {
        if (!obj || typeof obj !== "object")
            return obj;
        const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };
        const sensitiveKeys = ["password", "token", "jwt", "secret", "pan", "aadhaar", "salary"];
        for (const key of Object.keys(sanitized)) {
            if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
                sanitized[key] = "[REDACTED]";
            }
            else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
                sanitized[key] = this.sanitizePayload(sanitized[key]);
            }
        }
        return sanitized;
    }
    /**
     * Records an auditable calendar action
     */
    static async record(params) {
        try {
            const { tenantId, actorId, actorEmail, action, entityId, beforeJson, afterJson, ipAddress, userAgent, } = params;
            await prisma_1.prisma.auditLog.create({
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
        }
        catch (err) {
            // Deliberately log audit failures to stderr without crashing primary transactions
            console.error("[CalendarAuditService] Failed to record audit log:", err.message);
        }
    }
    /**
     * Retrieves audit logs for a specific calendar event
     */
    static async getEventAuditLogs(tenantId, eventId) {
        return await prisma_1.prisma.auditLog.findMany({
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
exports.CalendarAuditService = CalendarAuditService;
