"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMasterDataRouter = createMasterDataRouter;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
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
    router.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
    const { modelName, entityName, searchFields = ["name", "code"], uniqueFields = ["name"], filterFields = [], select, include, customCounts, dependencyCheck, } = config;
    // 1. LIST ENTITIES (GET /)
    router.get("/", auth_1.requireAuth, async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "Tenant context required" });
            const db = (0, tenant_context_1.getTenantDb)(req);
            const page = Math.max(Number(req.query.page) || 1, 1);
            const limit = Math.min(Number(req.query.limit) || 20, 100);
            const search = req.query.search || "";
            const sortBy = req.query.sortBy || "createdAt";
            const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";
            const status = req.query.status || "all";
            const where = { tenantId };
            if (status && status !== "all") {
                where.status = status;
            }
            // Handle additional filter fields (e.g. year, type, branchId)
            if (filterFields && filterFields.length > 0) {
                for (const f of filterFields) {
                    const val = req.query[f];
                    if (val !== undefined && val !== "all" && val !== "") {
                        if (f === "year") {
                            const y = Number(val);
                            if (!isNaN(y))
                                where.year = y;
                        }
                        else if (f === "branchId") {
                            // Support branch filter across array or single field
                            where.OR = [
                                { branchIds: { has: String(val) } },
                                { branchIds: { isEmpty: true } },
                            ];
                        }
                        else {
                            where[f] = val;
                        }
                    }
                }
            }
            if (search && searchFields.length > 0) {
                where.OR = searchFields.map((field) => ({
                    [field]: { contains: search, mode: "insensitive" },
                }));
            }
            const delegate = db[modelName];
            if (!delegate) {
                return res.status(500).json({ error: `Model '${modelName}' not found in Prisma client` });
            }
            const findArgs = {
                where,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            };
            if (select) {
                findArgs.select = select;
            }
            else if (include) {
                findArgs.include = include;
            }
            const countPromises = [
                delegate.findMany(findArgs),
                delegate.count({ where }),
                delegate.count({ where: { tenantId, status: "active" } }),
                delegate.count({ where: { tenantId, status: "inactive" } }),
            ];
            if (customCounts) {
                countPromises.push(customCounts(db, tenantId, req));
            }
            const results = await Promise.all(countPromises);
            const items = results[0];
            const total = results[1];
            const activeCount = results[2];
            const inactiveCount = results[3];
            const custom = customCounts ? results[4] : {};
            const userContext = await (0, data_scope_1.resolveUserSecurityContext)(req.user?.userId, tenantId, req.user?.roles || [], db);
            const withActions = (0, allowed_actions_1.attachAllowedActions)("Generic", items, userContext, req.user?.permissions || []);
            return res.json({
                data: withActions,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
                counts: {
                    total: activeCount + inactiveCount,
                    active: activeCount,
                    inactive: inactiveCount,
                    ...custom,
                },
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
            const db = (0, tenant_context_1.getTenantDb)(req);
            const delegate = db[modelName];
            const item = await delegate.findFirst({
                where: { id: req.params.id, tenantId },
                select: select || undefined,
                include: !select && include ? include : undefined,
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
            const roles = req.user?.roles || [];
            const isAuthorizedHR = roles.some((r) => ["hr_admin", "super_admin", "tenant_admin"].includes(r));
            if (!isAuthorizedHR) {
                return res.status(403).json({ error: "Access denied. HR Administrator privileges required." });
            }
            const db = (0, tenant_context_1.getTenantDb)(req);
            const delegate = db[modelName];
            // Validate unique constraint within tenant
            for (const field of uniqueFields) {
                if (req.body[field]) {
                    const existing = await delegate.findFirst({
                        where: { tenantId, [field]: req.body[field] },
                        select: { id: true },
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
                const createData = {
                    ...req.body,
                    tenantId,
                };
                if (req.user?.userId) {
                    createData.createdBy = req.user.userId;
                    createData.updatedBy = req.user.userId;
                }
                const item = await tx[modelName].create({
                    data: createData,
                    select: select || undefined,
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
            const roles = req.user?.roles || [];
            const isAuthorizedHR = roles.some((r) => ["hr_admin", "super_admin", "tenant_admin"].includes(r));
            if (!isAuthorizedHR) {
                return res.status(403).json({ error: "Access denied. HR Administrator privileges required." });
            }
            const db = (0, tenant_context_1.getTenantDb)(req);
            const delegate = db[modelName];
            const existing = await delegate.findFirst({
                where: { id: req.params.id, tenantId },
                select: { id: true },
            });
            if (!existing) {
                return res.status(404).json({ error: `${entityName} not found` });
            }
            // Validate unique constraint on update (excluding current record)
            for (const field of uniqueFields) {
                if (req.body[field]) {
                    const duplicate = await delegate.findFirst({
                        where: {
                            tenantId,
                            [field]: req.body[field],
                            NOT: { id: req.params.id },
                        },
                        select: { id: true },
                    });
                    if (duplicate) {
                        return res.status(400).json({
                            error: `A ${entityName} with this ${field} ('${req.body[field]}') already exists`,
                        });
                    }
                }
            }
            const result = await db.$transaction(async (tx) => {
                const payload = { ...req.body };
                delete payload.id;
                delete payload.tenantId;
                delete payload.createdAt;
                if (req.user?.userId) {
                    payload.updatedBy = req.user.userId;
                }
                const updated = await tx[modelName].update({
                    where: { id: req.params.id },
                    data: payload,
                    select: select || undefined,
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
            const roles = req.user?.roles || [];
            const isAuthorizedHR = roles.some((r) => ["hr_admin", "super_admin", "tenant_admin"].includes(r));
            if (!isAuthorizedHR) {
                return res.status(403).json({ error: "Access denied. HR Administrator privileges required." });
            }
            const db = (0, tenant_context_1.getTenantDb)(req);
            const delegate = db[modelName];
            const existing = await delegate.findFirst({
                where: { id: req.params.id, tenantId },
                select: { id: true },
            });
            if (!existing) {
                return res.status(404).json({ error: `${entityName} not found` });
            }
            if (dependencyCheck) {
                const check = await dependencyCheck(db, req.params.id, tenantId);
                if (!check.canDelete) {
                    return res.status(409).json({
                        error: check.message || `Cannot delete ${entityName} because it is referenced by existing records.`,
                        referenced: true,
                    });
                }
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
    // 6. BULK ARCHIVE / STATUS UPDATE (POST /bulk-archive)
    router.post("/bulk-archive", auth_1.requireAuth, async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "Tenant context required" });
            const roles = req.user?.roles || [];
            const isAuthorizedHR = roles.some((r) => ["hr_admin", "super_admin", "tenant_admin"].includes(r));
            if (!isAuthorizedHR) {
                return res.status(403).json({ error: "Access denied. HR Administrator privileges required." });
            }
            const { ids, status = "inactive" } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: "IDs array required" });
            }
            const db = (0, tenant_context_1.getTenantDb)(req);
            const delegate = db[modelName];
            const result = await delegate.updateMany({
                where: { id: { in: ids }, tenantId },
                data: { status },
            });
            return res.json({ success: true, count: result.count });
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    });
    return router;
}
