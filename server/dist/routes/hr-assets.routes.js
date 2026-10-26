"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrAssetsRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const tenant_context_middleware_js_1 = require("../middleware/tenant-context.middleware.js");
const asset_service_js_1 = require("../services/asset.service.js");
const tenant_context_js_1 = require("../context/tenant-context.js");
exports.hrAssetsRouter = (0, express_1.Router)();
// Strict Authentication and Tenant AsyncLocalStorage Isolation
exports.hrAssetsRouter.use(auth_js_1.requireAuth, tenant_context_middleware_js_1.resolveTenantContext);
// Authorized Asset Administration Roles
const ASSET_ADMIN_ROLES = ["admin", "super_admin", "tenant_admin", "hr_admin", "assets_admin", "hr_manager"];
const requireAssetAdmin = (0, auth_js_1.requireRole)(...ASSET_ADMIN_ROLES);
// =========================================================================
// 1. DASHBOARD & OVERVIEW AGGREGATES
// =========================================================================
exports.hrAssetsRouter.get("/overview", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const overview = await asset_service_js_1.AssetService.getOverview(tenantId);
        return res.json(overview);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load assets overview" });
    }
});
// =========================================================================
// 2. ASSET CATEGORIES / TYPES
// =========================================================================
exports.hrAssetsRouter.get("/types", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const types = await asset_service_js_1.AssetService.listCategories(tenantId);
        return res.json(types);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load asset categories" });
    }
});
exports.hrAssetsRouter.post("/types", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!req.body?.name?.trim()) {
            return res.status(400).json({ error: "Category name is required" });
        }
        const type = await asset_service_js_1.AssetService.createCategory(tenantId, req.body);
        return res.status(201).json(type);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to create asset category" });
    }
});
exports.hrAssetsRouter.put("/types/:id", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_js_1.getTenantDb)();
        const existing = await db.assetCategory.findFirst({
            where: { id: req.params.id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Asset category not found in this organization" });
        }
        const type = await db.assetCategory.update({
            where: { id: req.params.id },
            data: req.body,
        });
        return res.json(type);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to update category" });
    }
});
exports.hrAssetsRouter.delete("/types/:id", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_js_1.getTenantDb)();
        const existing = await db.assetCategory.findFirst({
            where: { id: req.params.id, tenantId },
            include: { _count: { select: { assets: true } } },
        });
        if (!existing) {
            return res.status(404).json({ error: "Asset category not found in this organization" });
        }
        if (existing._count.assets > 0) {
            return res.status(400).json({
                error: `Cannot delete category with ${existing._count.assets} linked assets. Reassign assets first.`,
            });
        }
        await db.assetCategory.delete({ where: { id: req.params.id } });
        return res.json({ success: true, message: "Category deleted successfully" });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to delete category" });
    }
});
// =========================================================================
// 3. DEPRECIATION SCHEDULES
// =========================================================================
exports.hrAssetsRouter.get("/depreciation", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const schedules = await asset_service_js_1.AssetService.listDepreciationSchedules(tenantId, req.query.assetId);
        return res.json(schedules);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load depreciation schedules" });
    }
});
exports.hrAssetsRouter.post("/:id/depreciation/calculate", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const schedule = await asset_service_js_1.AssetService.calculateDepreciation(tenantId, req.params.id);
        return res.json(schedule);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to calculate depreciation" });
    }
});
// =========================================================================
// 4. REQUESTS & MAINTENANCE
// =========================================================================
exports.hrAssetsRouter.get("/requests-maintenance", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_js_1.getTenantDb)();
        const [requests, maintenance] = await Promise.all([
            db.assetRequest.findMany({
                where: { tenantId },
                include: { employee: true },
                orderBy: { requestedAt: "desc" },
            }),
            db.assetMaintenance.findMany({
                where: { asset: { tenantId } },
                include: { asset: true },
                orderBy: { serviceDate: "desc" },
            }),
        ]);
        return res.json({ requests, maintenance });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load maintenance records" });
    }
});
exports.hrAssetsRouter.patch("/requests/:id", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const resolved = await asset_service_js_1.AssetService.reviewAssetRequest(tenantId, req.params.id, actorId, req.body);
        return res.json(resolved);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to review asset request" });
    }
});
exports.hrAssetsRouter.post("/maintenance", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const record = await asset_service_js_1.AssetService.createMaintenance(tenantId, actorId, req.body);
        return res.status(201).json(record);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to record asset maintenance" });
    }
});
exports.hrAssetsRouter.patch("/maintenance/:id/complete", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const updated = await asset_service_js_1.AssetService.completeMaintenance(tenantId, req.params.id, req.body.resolutionDetails);
        return res.json(updated);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to complete maintenance record" });
    }
});
// =========================================================================
// 5. ASSETS REGISTRY (CRUD)
// =========================================================================
exports.hrAssetsRouter.get("/", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const assets = await asset_service_js_1.AssetService.listAssets(tenantId, {
            status: req.query.status,
            category: req.query.category,
            search: req.query.search,
        });
        return res.json(assets);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to list assets" });
    }
});
exports.hrAssetsRouter.post("/", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        if (!req.body?.name?.trim()) {
            return res.status(400).json({ error: "Asset name is required" });
        }
        const asset = await asset_service_js_1.AssetService.createAsset(tenantId, actorId, req.body);
        return res.status(201).json(asset);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to create asset" });
    }
});
exports.hrAssetsRouter.get("/:id", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_js_1.getTenantDb)();
        const asset = await db.asset.findFirst({
            where: { id: req.params.id, tenantId },
            include: {
                categoryRel: true,
                assignedEmployee: {
                    select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true },
                },
                assignments: {
                    include: { employee: true },
                    orderBy: { assignedAt: "desc" },
                },
                maintenanceLogs: {
                    orderBy: { serviceDate: "desc" },
                },
                depreciationSchedules: {
                    orderBy: { calculationDate: "desc" },
                },
            },
        });
        if (!asset)
            return res.status(404).json({ error: "Asset not found" });
        return res.json(asset);
    }
    catch (err) {
        return res.status(404).json({ error: err.message || "Asset not found" });
    }
});
exports.hrAssetsRouter.put("/:id", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_js_1.getTenantDb)();
        const existing = await db.asset.findFirst({
            where: { id: req.params.id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Asset not found in this organization" });
        }
        // Check duplicate tag if tag changed
        if (req.body.assetTag && req.body.assetTag !== existing.assetTag) {
            const duplicate = await db.asset.findFirst({
                where: { tenantId, assetTag: req.body.assetTag, id: { not: existing.id } },
            });
            if (duplicate) {
                return res.status(400).json({ error: `Asset tag '${req.body.assetTag}' is already in use.` });
            }
        }
        const updated = await db.asset.update({
            where: { id: req.params.id },
            data: req.body,
        });
        return res.json(updated);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to update asset" });
    }
});
exports.hrAssetsRouter.delete("/:id", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_js_1.getTenantDb)();
        const existing = await db.asset.findFirst({
            where: { id: req.params.id, tenantId },
            include: {
                assignments: { where: { status: "active" } },
            },
        });
        if (!existing) {
            return res.status(404).json({ error: "Asset not found in this organization" });
        }
        if (existing.status === "assigned" || existing.assignments.length > 0) {
            return res.status(400).json({
                error: "Cannot delete an asset that is currently assigned. Return the asset before deleting.",
            });
        }
        // Transaction to remove relational dependencies cleanly
        await db.$transaction(async (tx) => {
            await tx.assetActivityLog.deleteMany({ where: { assetId: existing.id } });
            await tx.assetDepreciationSchedule.deleteMany({ where: { assetId: existing.id } });
            await tx.assetMaintenance.deleteMany({ where: { assetId: existing.id } });
            await tx.assetAssignment.deleteMany({ where: { assetId: existing.id } });
            await tx.asset.delete({ where: { id: existing.id } });
        });
        return res.json({ success: true, message: "Asset deleted successfully" });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to delete asset" });
    }
});
// =========================================================================
// 6. ASSET ASSIGNMENT & RETURN WORKFLOWS
// =========================================================================
exports.hrAssetsRouter.post("/:id/assign", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        if (!req.body?.employeeId) {
            return res.status(400).json({ error: "Target employeeId is required for assignment" });
        }
        const assignment = await asset_service_js_1.AssetService.assignAsset(tenantId, actorId, req.params.id, req.body.employeeId, req.body.expectedReturnDate, req.body.conditionOnAssign, req.body.notes);
        return res.status(201).json(assignment);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to assign asset" });
    }
});
// Return via assignment ID
exports.hrAssetsRouter.post("/assignments/:id/return", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const returned = await asset_service_js_1.AssetService.returnAsset(tenantId, actorId, req.params.id, req.body.returnCondition, req.body.returnNotes);
        return res.json(returned);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to return asset" });
    }
});
// Convenience return directly via asset ID
exports.hrAssetsRouter.post("/:id/return", requireAssetAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const db = (0, tenant_context_js_1.getTenantDb)();
        const activeAssignment = await db.assetAssignment.findFirst({
            where: { assetId: req.params.id, asset: { tenantId }, status: "active" },
        });
        if (!activeAssignment) {
            // If no active assignment record exists, ensure asset is marked available
            const asset = await db.asset.findFirst({ where: { id: req.params.id, tenantId } });
            if (!asset)
                return res.status(404).json({ error: "Asset not found" });
            await db.asset.update({
                where: { id: asset.id },
                data: { status: "available", assignedEmployeeId: null, assignedAt: null },
            });
            return res.json({ success: true, message: "Asset marked available" });
        }
        const returned = await asset_service_js_1.AssetService.returnAsset(tenantId, actorId, activeAssignment.id, req.body.returnCondition, req.body.returnNotes);
        return res.json(returned);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to return asset" });
    }
});
