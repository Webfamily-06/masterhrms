"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMasterDataRouter = createMasterDataRouter;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_1 = require("../context/tenant-context");
const audit_service_1 = require("../services/audit.service");
const outbox_service_1 = require("../services/outbox.service");
const allowed_actions_1 = require("../lib/allowed-actions");
const data_scope_1 = require("../lib/data-scope");
/**
 * Creates an authoritative, tenant-isolated CRUD router for master-data entities.
 * Enforces:
 * - Server-authoritative tenant isolation
 * - Automatic Audit Logging
 * - Transactional Outbox Event emission
 * - Server-computed allowedActions[]
 */
function createMasterDataRouter(config) {
    const router = (0, express_1.Router)();
    const { modelName, entityName, searchFields = ["name", "code"], uniqueFields = ["name"] } = config;
    // 1. LIST ENTITIES (GET /)
    router.get("/", auth_1.requireAuth, async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "Tenant context required" });
            const db = (0, tenant_context_1.getTenantDb)();
            const page = Math.max(Number(req.query.page) || 1, 1);
            const limit = Math.min(Number(req.query.limit) || 20, 100);
            const search = req.query.search || "";
            const sortBy = req.query.sortBy || "createdAt";
            const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";
            const where = { tenantId };
            if (search && searchFields.length > 0) {
                where.OR = searchFields.map((field) => ({
                    [field]: { contains: search, mode: "insensitive" },
                }));
            }
            const delegate = db[modelName];
            if (!delegate) {
                return res.status(500).json({ error: `Model '${modelName}' not found in Prisma client` });
            }
            const [items, total] = await Promise.all([
                delegate.findMany({
                    where,
                    orderBy: { [sortBy]: sortOrder },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                delegate.count({ where }),
            ]);
            const userContext = await (0, data_scope_1.resolveUserSecurityContext)(req.user?.userId, tenantId, req.user?.roles || [], db);
            const withActions = (0, allowed_actions_1.attachAllowedActions)("Generic", items, userContext, req.user?.permissions || []);
            return res.json({
                data: withActions,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            });
        }
        catch (err) {
            return res.status(500).json({ error: err.message });
        }
    });
    // 2. GET SINGLE ENTITY (GET /:id)
    router.get("/:id", auth_1.requireAuth, async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "Tenant context required" });
            const db = (0, tenant_context_1.getTenantDb)();
            const delegate = db[modelName];
            const item = await delegate.findFirst({
                where: { id: req.params.id, tenantId },
            });
            if (!item) {
                return res.status(404).json({ error: `${entityName} not found` });
            }
            const userContext = await (0, data_scope_1.resolveUserSecurityContext)(req.user?.userId, tenantId, req.user?.roles || [], db);
            const withActions = (0, allowed_actions_1.attachAllowedActions)("Generic", item, userContext, req.user?.permissions || []);
            return res.json(withActions);
        }
        catch (err) {
            return res.status(500).json({ error: err.message });
        }
    });
    // 3. CREATE ENTITY (POST /)
    router.post("/", auth_1.requireAuth, async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "Tenant context required" });
            const db = (0, tenant_context_1.getTenantDb)();
            const delegate = db[modelName];
            // Validate unique constraint within tenant
            for (const field of uniqueFields) {
                if (req.body[field]) {
                    const existing = await delegate.findFirst({
                        where: { tenantId, [field]: req.body[field] },
                    });
                    if (existing) {
                        return res.status(400).json({
                            error: `A ${entityName} with this ${field} ('${req.body[field]}') already exists`,
                        });
                    }
                }
            }
            // Execute within transaction: create + audit + outbox
            const result = await db.$transaction(async (tx) => {
                const item = await tx[modelName].create({
                    data: {
                        ...req.body,
                        tenantId,
                    },
                });
                await audit_service_1.AuditService.logMutation({
                    tenantId,
                    actorId: req.user?.userId,
                    action: `${entityName.toUpperCase()}_CREATE`,
                    entityType: entityName,
                    entityId: item.id,
                    newState: item,
                }, tx);
                await outbox_service_1.OutboxService.createOutboxEvent({
                    tenantId,
                    eventType: `master.${modelName}.created`,
                    entityType: entityName,
                    entityId: item.id,
                    actorId: req.user?.userId,
                    payload: { id: item.id, name: item.name || item.code },
                }, tx);
                return item;
            });
            return res.status(201).json(result);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    });
    // 4. UPDATE ENTITY (PUT /:id)
    router.put("/:id", auth_1.requireAuth, async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "Tenant context required" });
            const db = (0, tenant_context_1.getTenantDb)();
            const delegate = db[modelName];
            const existing = await delegate.findFirst({
                where: { id: req.params.id, tenantId },
            });
            if (!existing) {
                return res.status(404).json({ error: `${entityName} not found` });
            }
            const result = await db.$transaction(async (tx) => {
                const payload = { ...req.body };
                delete payload.id;
                delete payload.tenantId;
                const updated = await tx[modelName].update({
                    where: { id: req.params.id },
                    data: payload,
                });
                await audit_service_1.AuditService.logMutation({
                    tenantId,
                    actorId: req.user?.userId,
                    action: `${entityName.toUpperCase()}_UPDATE`,
                    entityType: entityName,
                    entityId: updated.id,
                    oldState: existing,
                    newState: updated,
                }, tx);
                await outbox_service_1.OutboxService.createOutboxEvent({
                    tenantId,
                    eventType: `master.${modelName}.updated`,
                    entityType: entityName,
                    entityId: updated.id,
                    actorId: req.user?.userId,
                    payload: { id: updated.id },
                }, tx);
                return updated;
            });
            return res.json(result);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    });
    // 5. DELETE ENTITY (DELETE /:id)
    router.delete("/:id", auth_1.requireAuth, async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "Tenant context required" });
            const db = (0, tenant_context_1.getTenantDb)();
            const delegate = db[modelName];
            const existing = await delegate.findFirst({
                where: { id: req.params.id, tenantId },
            });
            if (!existing) {
                return res.status(404).json({ error: `${entityName} not found` });
            }
            await db.$transaction(async (tx) => {
                await tx[modelName].delete({
                    where: { id: req.params.id },
                });
                await audit_service_1.AuditService.logMutation({
                    tenantId,
                    actorId: req.user?.userId,
                    action: `${entityName.toUpperCase()}_DELETE`,
                    entityType: entityName,
                    entityId: req.params.id,
                    oldState: existing,
                }, tx);
                await outbox_service_1.OutboxService.createOutboxEvent({
                    tenantId,
                    eventType: `master.${modelName}.deleted`,
                    entityType: entityName,
                    entityId: req.params.id,
                    actorId: req.user?.userId,
                    payload: { id: req.params.id },
                }, tx);
            });
            return res.json({ success: true, message: `${entityName} deleted` });
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    });
    return router;
}
