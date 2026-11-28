"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformBroadcastsRouter = exports.superBroadcastsRouter = void 0;
const crypto_1 = __importDefault(require("crypto"));
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const super_audit_1 = require("../lib/super-audit");
exports.superBroadcastsRouter = (0, express_1.Router)();
exports.platformBroadcastsRouter = (0, express_1.Router)();
exports.superBroadcastsRouter.use(auth_1.requireAuth, auth_1.requireSuperAdmin, (0, super_audit_1.superAuditMiddleware)("super-broadcasts"));
exports.platformBroadcastsRouter.use(auth_1.requireAuth);
const BROADCAST_SETTING_KEY = "platform_broadcasts";
const BROADCAST_SETTING_GROUP = "broadcasts";
const isoDateString = zod_1.z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid ISO date string" });
const broadcastPayloadSchema = zod_1.z
    .object({
    title: zod_1.z.string().trim().min(1, "Title is required").max(160, "Title must be 160 characters or fewer"),
    message: zod_1.z.string().trim().min(1, "Message is required").max(2000, "Message must be 2000 characters or fewer"),
    severity: zod_1.z.enum(["info", "warning", "critical", "maintenance"]).default("info"),
    audienceType: zod_1.z.enum(["all", "plans", "tenants"]).default("all"),
    targetPlanIds: zod_1.z.array(zod_1.z.string().trim().min(1)).optional(),
    targetTenantIds: zod_1.z.array(zod_1.z.string().trim().min(1)).optional(),
    startsAt: isoDateString.optional(),
    endsAt: isoDateString.nullable().optional(),
    dismissible: zod_1.z.boolean().default(true),
    status: zod_1.z.enum(["draft", "scheduled", "active", "expired"]).optional(),
})
    .superRefine((data, ctx) => {
    if (data.audienceType === "plans" && (!data.targetPlanIds || data.targetPlanIds.length === 0)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["targetPlanIds"],
            message: "Select at least one subscription plan when targeting plans.",
        });
    }
    if (data.audienceType === "tenants" && (!data.targetTenantIds || data.targetTenantIds.length === 0)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["targetTenantIds"],
            message: "Select at least one tenant workspace when targeting tenants.",
        });
    }
    if (data.startsAt && data.endsAt) {
        const startMs = Date.parse(data.startsAt);
        const endMs = Date.parse(data.endsAt);
        if (endMs <= startMs) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ["endsAt"],
                message: "End time must be after start time.",
            });
        }
    }
});
const broadcastUpdateSchema = zod_1.z
    .object({
    title: zod_1.z.string().trim().min(1, "Title is required").max(160).optional(),
    message: zod_1.z.string().trim().min(1, "Message is required").max(2000).optional(),
    severity: zod_1.z.enum(["info", "warning", "critical", "maintenance"]).optional(),
    audienceType: zod_1.z.enum(["all", "plans", "tenants"]).optional(),
    targetPlanIds: zod_1.z.array(zod_1.z.string().trim().min(1)).optional(),
    targetTenantIds: zod_1.z.array(zod_1.z.string().trim().min(1)).optional(),
    startsAt: isoDateString.optional(),
    endsAt: isoDateString.nullable().optional(),
    dismissible: zod_1.z.boolean().optional(),
    status: zod_1.z.enum(["draft", "scheduled", "active", "expired"]).optional(),
});
function resolveStatus(requestedStatus, startsAtIso, endsAtIso, now = new Date()) {
    if (requestedStatus === "draft")
        return "draft";
    if (requestedStatus === "expired")
        return "expired";
    const nowMs = now.getTime();
    const startMs = Date.parse(startsAtIso);
    const endMs = endsAtIso ? Date.parse(endsAtIso) : null;
    if (endMs !== null && !Number.isNaN(endMs) && endMs <= nowMs) {
        return "expired";
    }
    if (!Number.isNaN(startMs) && startMs > nowMs) {
        return "scheduled";
    }
    return "active";
}
async function readBroadcasts() {
    const existing = await prisma_1.rawPrisma.setting.findFirst({
        where: {
            scope: "PLATFORM",
            scopeId: null,
            key: BROADCAST_SETTING_KEY,
        },
    });
    if (!existing || !Array.isArray(existing.valueJson)) {
        return [];
    }
    return existing.valueJson;
}
async function writeBroadcasts(items, updatedBy) {
    const existing = await prisma_1.rawPrisma.setting.findFirst({
        where: {
            scope: "PLATFORM",
            scopeId: null,
            key: BROADCAST_SETTING_KEY,
        },
    });
    if (existing) {
        await prisma_1.rawPrisma.setting.update({
            where: { id: existing.id },
            data: {
                valueJson: items,
                updatedBy: updatedBy ? updatedBy.slice(0, 36) : null,
                version: existing.version + 1,
            },
        });
    }
    else {
        await prisma_1.rawPrisma.setting.create({
            data: {
                scope: "PLATFORM",
                scopeId: null,
                group: BROADCAST_SETTING_GROUP,
                key: BROADCAST_SETTING_KEY,
                valueType: "json",
                valueJson: items,
                updatedBy: updatedBy ? updatedBy.slice(0, 36) : null,
            },
        });
    }
}
function hydrateBroadcastStatus(b, now = new Date()) {
    return {
        ...b,
        status: resolveStatus(b.status, b.startsAt, b.endsAt, now),
    };
}
// ─── SUPER ADMIN CRUD (/api/super/broadcasts) ────────────────────────────────
// GET /api/super/broadcasts
exports.superBroadcastsRouter.get("/", async (_req, res) => {
    try {
        const now = new Date();
        const raw = await readBroadcasts();
        const broadcasts = raw
            .map((b) => hydrateBroadcastStatus(b, now))
            .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        return res.json({ broadcasts });
    }
    catch (err) {
        console.error("[super-broadcasts GET /] error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch platform broadcasts." });
    }
});
// POST /api/super/broadcasts
exports.superBroadcastsRouter.post("/", async (req, res) => {
    try {
        const parsed = broadcastPayloadSchema.parse(req.body);
        const now = new Date();
        const nowIso = now.toISOString();
        const startsAtIso = parsed.startsAt ? new Date(parsed.startsAt).toISOString() : nowIso;
        const endsAtIso = parsed.endsAt ? new Date(parsed.endsAt).toISOString() : null;
        const newBroadcast = {
            id: crypto_1.default.randomUUID(),
            title: parsed.title,
            message: parsed.message,
            severity: parsed.severity,
            audienceType: parsed.audienceType,
            targetPlanIds: parsed.audienceType === "plans" ? Array.from(new Set(parsed.targetPlanIds || [])) : [],
            targetTenantIds: parsed.audienceType === "tenants" ? Array.from(new Set(parsed.targetTenantIds || [])) : [],
            startsAt: startsAtIso,
            endsAt: endsAtIso,
            dismissible: parsed.dismissible,
            status: resolveStatus(parsed.status, startsAtIso, endsAtIso, now),
            createdBy: req.user?.email || req.user?.userId || "super_admin",
            createdAt: nowIso,
            updatedAt: nowIso,
        };
        const list = await readBroadcasts();
        list.unshift(newBroadcast);
        await writeBroadcasts(list, req.user?.userId || req.user?.id || null);
        res.locals.superAudit = {
            action: "PLATFORM_BROADCAST_CREATED",
            entityType: "PlatformBroadcast",
            entityId: newBroadcast.id,
            after: newBroadcast,
        };
        return res.status(201).json({ success: true, broadcast: newBroadcast });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: err.errors[0]?.message || "Invalid broadcast payload." });
        }
        console.error("[super-broadcasts POST /] error:", err);
        return res.status(500).json({ error: err.message || "Failed to create broadcast." });
    }
});
// PUT /api/super/broadcasts/:id
exports.superBroadcastsRouter.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const patch = broadcastUpdateSchema.parse(req.body);
        const list = await readBroadcasts();
        const idx = list.findIndex((b) => b.id === id);
        if (idx === -1) {
            return res.status(404).json({ error: "Broadcast alert not found." });
        }
        const existing = list[idx];
        const nextAudience = patch.audienceType ?? existing.audienceType;
        const nextTargetPlanIds = nextAudience === "plans" ? Array.from(new Set(patch.targetPlanIds ?? existing.targetPlanIds ?? [])) : [];
        const nextTargetTenantIds = nextAudience === "tenants" ? Array.from(new Set(patch.targetTenantIds ?? existing.targetTenantIds ?? [])) : [];
        if (nextAudience === "plans" && nextTargetPlanIds.length === 0) {
            return res.status(400).json({ error: "Select at least one subscription plan when targeting plans." });
        }
        if (nextAudience === "tenants" && nextTargetTenantIds.length === 0) {
            return res.status(400).json({ error: "Select at least one tenant workspace when targeting tenants." });
        }
        const nextStartsAt = patch.startsAt ? new Date(patch.startsAt).toISOString() : existing.startsAt;
        const nextEndsAt = patch.endsAt === undefined ? existing.endsAt ?? null : patch.endsAt ? new Date(patch.endsAt).toISOString() : null;
        if (nextEndsAt && Date.parse(nextEndsAt) <= Date.parse(nextStartsAt)) {
            return res.status(400).json({ error: "End time must be after start time." });
        }
        const now = new Date();
        const updated = {
            ...existing,
            title: patch.title ?? existing.title,
            message: patch.message ?? existing.message,
            severity: patch.severity ?? existing.severity,
            audienceType: nextAudience,
            targetPlanIds: nextTargetPlanIds,
            targetTenantIds: nextTargetTenantIds,
            startsAt: nextStartsAt,
            endsAt: nextEndsAt,
            dismissible: patch.dismissible ?? existing.dismissible,
            status: resolveStatus(patch.status ?? existing.status, nextStartsAt, nextEndsAt, now),
            updatedAt: now.toISOString(),
        };
        list[idx] = updated;
        await writeBroadcasts(list, req.user?.userId || req.user?.id || null);
        res.locals.superAudit = {
            action: "PLATFORM_BROADCAST_UPDATED",
            entityType: "PlatformBroadcast",
            entityId: id,
            before: existing,
            after: updated,
        };
        return res.json({ success: true, broadcast: updated });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: err.errors[0]?.message || "Invalid broadcast update payload." });
        }
        console.error("[super-broadcasts PUT /:id] error:", err);
        return res.status(500).json({ error: err.message || "Failed to update broadcast." });
    }
});
// DELETE /api/super/broadcasts/:id
exports.superBroadcastsRouter.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const list = await readBroadcasts();
        const idx = list.findIndex((b) => b.id === id);
        if (idx === -1) {
            return res.status(404).json({ error: "Broadcast alert not found." });
        }
        const [removed] = list.splice(idx, 1);
        await writeBroadcasts(list, req.user?.userId || req.user?.id || null);
        res.locals.superAudit = {
            action: "PLATFORM_BROADCAST_DELETED",
            entityType: "PlatformBroadcast",
            entityId: id,
            before: removed,
            after: null,
        };
        return res.json({ success: true, id });
    }
    catch (err) {
        console.error("[super-broadcasts DELETE /:id] error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete broadcast." });
    }
});
// ─── AUTHENTICATED PLATFORM ENDPOINT (/api/platform/broadcasts) ──────────────
const SEVERITY_WEIGHT = {
    critical: 4,
    maintenance: 3,
    warning: 2,
    info: 1,
};
// GET /api/platform/broadcasts/active
exports.platformBroadcastsRouter.get("/active", async (req, res) => {
    try {
        const now = new Date();
        const nowMs = now.getTime();
        const all = await readBroadcasts();
        // Filter broadcasts that are active and within [startsAt, endsAt]
        const timeActive = all.filter((b) => {
            if (b.status === "draft" || b.status === "expired")
                return false;
            const startMs = Date.parse(b.startsAt);
            if (Number.isNaN(startMs) || startMs > nowMs)
                return false;
            if (b.endsAt) {
                const endMs = Date.parse(b.endsAt);
                if (!Number.isNaN(endMs) && endMs <= nowMs)
                    return false;
            }
            return true;
        });
        if (timeActive.length === 0) {
            return res.json({ broadcasts: [] });
        }
        const tenantId = req.user?.tenantId || req.tenantId || null;
        const needsPlanLookup = Boolean(tenantId && timeActive.some((b) => b.audienceType === "plans"));
        let tenantPlanId = null;
        if (needsPlanLookup && tenantId) {
            const sub = await prisma_1.rawPrisma.tenantSubscription.findUnique({
                where: { tenantId },
                select: { planId: true },
            });
            tenantPlanId = sub?.planId || null;
        }
        const matched = timeActive
            .filter((b) => {
            if (b.audienceType === "all")
                return true;
            if (b.audienceType === "tenants") {
                return Boolean(tenantId && Array.isArray(b.targetTenantIds) && b.targetTenantIds.includes(tenantId));
            }
            if (b.audienceType === "plans") {
                return Boolean(tenantPlanId && Array.isArray(b.targetPlanIds) && b.targetPlanIds.includes(tenantPlanId));
            }
            return false;
        })
            .map((b) => ({
            ...b,
            status: "active",
        }))
            .sort((a, b) => {
            const wDiff = (SEVERITY_WEIGHT[b.severity] || 0) - (SEVERITY_WEIGHT[a.severity] || 0);
            if (wDiff !== 0)
                return wDiff;
            return Date.parse(b.startsAt) - Date.parse(a.startsAt);
        });
        return res.json({ broadcasts: matched });
    }
    catch (err) {
        console.error("[platform-broadcasts GET /active] error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch active broadcasts." });
    }
});
