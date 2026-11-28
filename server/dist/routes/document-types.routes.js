"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentTypesRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const document_type_service_1 = require("../services/document-type.service");
const tenant_context_1 = require("../context/tenant-context");
async function pushMissingDocumentAnnouncementIfNeeded(req, tenantId, docTypeName, isRequired) {
    if (!isRequired)
        return false;
    try {
        const db = (0, tenant_context_1.getTenantDb)(req);
        const activeEmployees = await db.employee.findMany({
            where: { tenantId, status: "active" },
            select: { id: true },
        });
        if (activeEmployees.length === 0)
            return false;
        const existingUploads = await db.companyDocument.findMany({
            where: {
                tenantId,
                OR: [
                    { category: { equals: docTypeName, mode: "insensitive" } },
                    { title: { contains: docTypeName, mode: "insensitive" } },
                ],
            },
            select: { employeeId: true },
        });
        const uploadedEmpIds = new Set(existingUploads.map((u) => u.employeeId).filter(Boolean));
        const missingCount = activeEmployees.filter((e) => !uploadedEmpIds.has(e.id)).length;
        if (missingCount === 0)
            return false;
        const title = `Action Required: Upload Mandatory Document — ${docTypeName}`;
        const existingAnn = await db.announcement.findFirst({
            where: { tenantId, title, status: "published" },
            select: { id: true },
        });
        if (existingAnn)
            return false;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        await db.announcement.create({
            data: {
                tenantId,
                title,
                summary: `${docTypeName} is now a mandatory employee document. ${missingCount} existing employee(s) need to upload this document.`,
                content: `Dear Team,\n\n"${docTypeName}" has been marked as a mandatory employee document by HR.\n\nIf you have not yet uploaded your ${docTypeName}, please upload it from your Employee Documents portal at the earliest and acknowledge this announcement.\n\nEmployees currently missing this document: ${missingCount}.`,
                category: "Policy Updates",
                priority: "high",
                status: "published",
                targetType: "all_company",
                isPinned: true,
                publishDate: new Date(),
                expiryDate,
                authorName: "Human Resources",
                acknowledgementRequired: true,
            },
        });
        return true;
    }
    catch (err) {
        console.warn("[pushMissingDocumentAnnouncementIfNeeded] warning:", err);
        return false;
    }
}
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
        const isReq = isRequired === true || isRequired === "true" || isRequired === "Required";
        const created = await document_type_service_1.DocumentTypeService.createDocumentType(tenantId, actorId, {
            name,
            description,
            isRequired: isReq,
            code,
        });
        const announcementPushed = await pushMissingDocumentAnnouncementIfNeeded(req, tenantId, created.name, isReq);
        return res.status(201).json({
            success: true,
            message: `Document type "${created.name}" created successfully.`,
            announcementPushed,
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
        const announcementPushed = parsedRequired === true
            ? await pushMissingDocumentAnnouncementIfNeeded(req, tenantId, updated.name, true)
            : false;
        return res.json({
            success: true,
            message: `Document type "${updated.name}" updated successfully.`,
            announcementPushed,
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
