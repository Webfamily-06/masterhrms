"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogsService = void 0;
exports.redactSensitiveData = redactSensitiveData;
const prisma_1 = require("../../prisma");
const SENSITIVE_KEY_PATTERNS = [
    /password/i,
    /secret/i,
    /token/i,
    /apikey/i,
    /api_key/i,
    /authorization/i,
    /backup_code/i,
    /backupcode/i,
    /card_number/i,
    /cvv/i,
    /private_key/i,
    /privatekey/i,
    /access_token/i,
    /refresh_token/i,
    /ssn/i,
    /aadhaar/i,
    /pin/i,
];
/**
 * Recursively deep-redacts sensitive secrets and credentials from JSON payloads.
 */
function redactSensitiveData(data) {
    if (data === null || data === undefined)
        return data;
    if (typeof data !== "object")
        return data;
    if (Array.isArray(data)) {
        return data.map(redactSensitiveData);
    }
    const clean = {};
    for (const [key, value] of Object.entries(data)) {
        const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
        if (isSensitive) {
            clean[key] = "[REDACTED]";
        }
        else if (typeof value === "object" && value !== null) {
            clean[key] = redactSensitiveData(value);
        }
        else {
            clean[key] = value;
        }
    }
    return clean;
}
function escapeCsvField(val) {
    if (val === null || val === undefined)
        return "";
    let str = typeof val === "object" ? JSON.stringify(val) : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        str = '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}
class ActivityLogsService {
    static getDb() {
        return prisma_1.rawPrisma || prisma_1.prisma;
    }
    /**
     * Builds tenant-scoped WHERE clause with actor and date filters.
     */
    static buildWhereClause(tenantId, params) {
        const where = { tenantId };
        if (params.actorId) {
            where.actorId = params.actorId;
        }
        if (params.actorEmail) {
            where.actorEmail = { contains: params.actorEmail, mode: "insensitive" };
        }
        if (params.action) {
            where.action = { contains: params.action, mode: "insensitive" };
        }
        if (params.entityType) {
            where.entityType = params.entityType;
        }
        if (params.dateFrom || params.dateTo) {
            where.createdAt = {};
            if (params.dateFrom) {
                where.createdAt.gte = new Date(params.dateFrom);
            }
            if (params.dateTo) {
                where.createdAt.lte = new Date(params.dateTo);
            }
        }
        if (params.search) {
            where.OR = [
                { action: { contains: params.search, mode: "insensitive" } },
                { entityType: { contains: params.search, mode: "insensitive" } },
                { actorEmail: { contains: params.search, mode: "insensitive" } },
                { entityId: { contains: params.search, mode: "insensitive" } },
            ];
        }
        return where;
    }
    /**
     * Retrieves paginated, filtered, and secret-redacted activity logs for the tenant.
     */
    static async listActivityLogs(tenantId, params = {}) {
        const db = this.getDb();
        const page = Math.max(1, Number(params.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
        const skip = (page - 1) * limit;
        const where = this.buildWhereClause(tenantId, params);
        const [total, rawItems] = await Promise.all([
            db.auditLog.count({ where }),
            db.auditLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
        ]);
        const items = rawItems.map((item) => ({
            ...item,
            beforeJson: redactSensitiveData(item.beforeJson),
            afterJson: redactSensitiveData(item.afterJson),
        }));
        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }
    /**
     * Retrieves a single activity log item by ID with strict tenant boundary enforcement.
     */
    static async getActivityLog(tenantId, logId) {
        const db = this.getDb();
        const item = await db.auditLog.findFirst({
            where: {
                id: logId,
                tenantId,
            },
        });
        if (!item) {
            return null;
        }
        return {
            ...item,
            beforeJson: redactSensitiveData(item.beforeJson),
            afterJson: redactSensitiveData(item.afterJson),
        };
    }
    /**
     * Generates an RFC 4180 CSV export of tenant activity logs with secret redaction.
     */
    static async exportActivityLogsCsv(tenantId, params = {}, maxRows = 5000) {
        const db = this.getDb();
        const where = this.buildWhereClause(tenantId, params);
        const records = await db.auditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: maxRows,
        });
        const headers = [
            "Timestamp",
            "Action",
            "Entity Type",
            "Entity ID",
            "Actor Email",
            "Actor ID",
            "IP Address",
            "Details",
        ];
        const rows = [headers.join(",")];
        for (const r of records) {
            const cleanDetails = redactSensitiveData(r.afterJson || r.beforeJson || {});
            const row = [
                escapeCsvField(r.createdAt.toISOString()),
                escapeCsvField(r.action),
                escapeCsvField(r.entityType),
                escapeCsvField(r.entityId),
                escapeCsvField(r.actorEmail || ""),
                escapeCsvField(r.actorId || ""),
                escapeCsvField(r.ipAddress || ""),
                escapeCsvField(JSON.stringify(cleanDetails)),
            ];
            rows.push(row.join(","));
        }
        return rows.join("\r\n");
    }
}
exports.ActivityLogsService = ActivityLogsService;
