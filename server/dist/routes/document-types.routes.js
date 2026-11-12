"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentTypesRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const document_type_service_1 = require("../services/document-type.service");
exports.documentTypesRouter = (0, express_1.Router)();
// Apply auth and tenant resolution to all routes
exports.documentTypesRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * GET /
 * List document types for tenant with search, filtering, and usage metrics.
 */
exports.documentTypesRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { search, filter, isActive } = req.query;
        let activeFilter = undefined;
        if (isActive === "true")
            activeFilter = true;
        if (isActive === "false")
            activeFilter = false;
        const result = await document_type_service_1.DocumentTypeService.listDocumentTypes(tenantId, {
            search: typeof search === "string" ? search : undefined,
            filter: filter === "required" || filter === "optional" ? filter : "all",
            isActive: activeFilter,
        });
        return res.json({
            success: true,
            data: result.items,
            counts: result.counts,
        });
    }
    catch (err) {
        console.error("[documentTypesRouter.get] Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            error: err.message || "Failed to retrieve document types.",
        });
    }
});
/**
 * POST /
 * Create a new document type.
 */
exports.documentTypesRouter.post("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || req.user?.id || "system";
        const { name, description, isRequired, code } = req.body;
        const created = await document_type_service_1.DocumentTypeService.createDocumentType(tenantId, actorId, {
            name,
            description,
            isRequired: isRequired === true || isRequired === "true" || isRequired === "Required",
            code,
        });
        return res.status(201).json({
            success: true,
            message: `Document type "${created.name}" created successfully.`,
            data: created,
        });
    }
    catch (err) {
        console.error("[documentTypesRouter.post] Error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            error: err.message || "Failed to create document type.",
        });
    }
});
/**
 * PUT /:id
 * Update an existing document type.
 */
exports.documentTypesRouter.put("/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || req.user?.id || "system";
        const { id } = req.params;
        const { name, description, isRequired, isActive } = req.body;
        let parsedRequired = undefined;
        if (isRequired !== undefined) {
            parsedRequired = isRequired === true || isRequired === "true" || isRequired === "Required";
        }
        const updated = await document_type_service_1.DocumentTypeService.updateDocumentType(tenantId, actorId, id, {
            name,
            description,
            isRequired: parsedRequired,
            isActive,
        });
        return res.json({
            success: true,
            message: `Document type "${updated.name}" updated successfully.`,
            data: updated,
        });
    }
    catch (err) {
        console.error("[documentTypesRouter.put] Error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            error: err.message || "Failed to update document type.",
        });
    }
});
/**
 * DELETE /:id
 * Delete or deactivate document type.
 */
exports.documentTypesRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || req.user?.id || "system";
        const { id } = req.params;
        const forceDeactivate = req.query.deactivate === "true" ||
            req.body?.deactivate === true;
        const result = await document_type_service_1.DocumentTypeService.deleteDocumentType(tenantId, actorId, id, forceDeactivate);
        return res.json({
            success: true,
            ...result,
        });
    }
    catch (err) {
        console.error("[documentTypesRouter.delete] Error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            error: err.message || "Failed to delete document type.",
            canDeactivate: err.canDeactivate,
            totalUsage: err.totalUsage,
        });
    }
});
/**
 * POST /bulk-delete
 * Bulk delete or deactivate document types.
 */
exports.documentTypesRouter.post("/bulk-delete", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const roles = req.user?.roles || [];
        const isAuthorizedHR = roles.some((r) => ["admin", "super_admin", "tenant_admin", "hr_admin", "hr_manager"].includes(r));
        if (!isAuthorizedHR) {
            return res.status(403).json({ error: "Access denied. HR Administrator privileges required." });
        }
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "ids array is required" });
        }
        const validIds = ids.filter((id) => typeof id === "string" && id.trim().length > 0);
        if (validIds.length === 0) {
            return res.status(400).json({ error: "Valid string IDs array required" });
        }
        const actorId = req.user?.userId || req.user?.id || "system";
        let deletedCount = 0;
        let failedCount = 0;
        const failures = [];
        for (const id of validIds) {
            try {
                await document_type_service_1.DocumentTypeService.deleteDocumentType(tenantId, actorId, id, false);
                deletedCount++;
            }
            catch (err) {
                failedCount++;
                failures.push({ id, reason: err.message || "Deletion failed" });
            }
        }
        return res.json({
            success: true,
            deletedCount,
            failedCount,
            failures,
            message: `Processed ${validIds.length} document type(s). ${deletedCount} deleted, ${failedCount} failed.`,
        });
    }
    catch (err) {
        console.error("[documentTypesRouter.bulk-delete] Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            error: err.message || "Failed to bulk delete document types.",
        });
    }
});
