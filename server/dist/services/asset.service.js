"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetService = exports.AssetService = void 0;
const tenant_context_1 = require("../context/tenant-context");
const outbox_service_1 = require("./outbox.service");
const audit_service_1 = require("./audit.service");
const client_1 = require("@prisma/client");
class AssetService {
    /**
     * 1. DASHBOARD & OVERVIEW
     */
    static async getOverview(tenantId) {
        const db = (0, tenant_context_1.getTenantDb)();
        const [totalAssets, availableAssets, assignedAssets, maintenanceAssets, requests] = await Promise.all([
            db.asset.count({ where: { tenantId } }),
            db.asset.count({ where: { tenantId, status: "available" } }),
            db.asset.count({ where: { tenantId, status: "assigned" } }),
            db.asset.count({ where: { tenantId, status: "maintenance" } }),
            db.assetRequest.count({ where: { tenantId, status: "pending" } }),
        ]);
        const assetsWithPrice = await db.asset.findMany({
            where: { tenantId, purchasePrice: { not: null } },
            select: { purchasePrice: true },
        });
        const totalAssetValue = assetsWithPrice.reduce((sum, a) => sum + Number(a.purchasePrice || 0), 0);
        return {
            totalAssets,
            availableAssets,
            assignedAssets,
            maintenanceAssets,
            pendingRequests: requests,
            totalAssetValue,
            allocationRate: totalAssets > 0 ? Math.round((assignedAssets / totalAssets) * 100) : 0,
        };
    }
    /**
     * 2. CATEGORIES
     */
    static async listCategories(tenantId) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.assetCategory.findMany({
            where: { tenantId },
            include: { _count: { select: { assets: true } } },
            orderBy: { name: "asc" },
        });
    }
    static async createCategory(tenantId, data) {
        const db = (0, tenant_context_1.getTenantDb)();
        const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return await db.assetCategory.create({
            data: {
                tenantId,
                name: data.name,
                slug,
                description: data.description,
                prefix: data.prefix || "AST",
                icon: data.icon || "💻",
            },
        });
    }
    /**
     * 3. ASSET INVENTORY & LIFECYCLE
     */
    static async listAssets(tenantId, filters) {
        const db = (0, tenant_context_1.getTenantDb)();
        const where = { tenantId };
        if (filters?.category && filters.category !== "all") {
            where.category = filters.category;
        }
        if (filters?.status && filters.status !== "all") {
            where.status = filters.status;
        }
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: "insensitive" } },
                { assetTag: { contains: filters.search, mode: "insensitive" } },
                { serialNumber: { contains: filters.search, mode: "insensitive" } },
            ];
        }
        return await db.asset.findMany({
            where,
            include: {
                categoryRel: { select: { id: true, name: true, prefix: true } },
                assignedEmployee: {
                    select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true },
                },
                assignments: {
                    where: { status: "active" },
                    take: 1,
                    orderBy: { assignedAt: "desc" },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    static async createAsset(tenantId, actorId, data) {
        const db = (0, tenant_context_1.getTenantDb)();
        const assetTag = data.assetTag || `AST-${Date.now().toString().slice(-6)}`;
        const existingTag = await db.asset.findFirst({
            where: { tenantId, assetTag },
        });
        if (existingTag) {
            throw new Error(`Asset with tag '${assetTag}' already exists in this organization.`);
        }
        if (data.categoryId) {
            const cat = await db.assetCategory.findFirst({
                where: { id: data.categoryId, tenantId },
            });
            if (!cat) {
                throw new Error("Specified asset category does not exist in this organization.");
            }
        }
        const asset = await db.asset.create({
            data: {
                tenantId,
                assetTag,
                name: data.name,
                category: data.category || "General",
                categoryId: data.categoryId || null,
                brand: data.brand || null,
                model: data.model || null,
                serialNumber: data.serialNumber || null,
                purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
                purchasePrice: data.purchasePrice ? new client_1.Prisma.Decimal(data.purchasePrice) : null,
                vendor: data.vendor || null,
                condition: data.condition || "good",
                status: "available",
                location: data.location || "Headquarters",
                usefulLifeMonths: data.usefulLifeMonths ?? 36,
                salvageValue: data.salvageValue ? new client_1.Prisma.Decimal(data.salvageValue) : new client_1.Prisma.Decimal(0),
                depreciationMethod: data.depreciationMethod || "straight_line",
                notes: data.notes || null,
            },
        });
        await db.assetActivityLog.create({
            data: {
                tenantId,
                assetId: asset.id,
                actionType: "create",
                performedBy: actorId,
                details: `Asset '${asset.name}' registered with tag ${asset.assetTag}`,
            },
        });
        await audit_service_1.AuditService.record({
            tenantId,
            actorId,
            action: "asset.created",
            entityType: "Asset",
            entityId: asset.id,
            newValues: { assetTag: asset.assetTag, name: asset.name },
        });
        return asset;
    }
    static async assignAsset(tenantId, actorId, assetId, employeeId, expectedReturnDate, conditionOnAssign, notes) {
        const db = (0, tenant_context_1.getTenantDb)();
        const asset = await db.asset.findUnique({ where: { id: assetId } });
        if (!asset || asset.tenantId !== tenantId) {
            throw new Error("Asset not found.");
        }
        if (asset.status !== "available") {
            throw new Error(`Asset cannot be assigned. Current status is '${asset.status}'.`);
        }
        const employee = await db.employee.findUnique({ where: { id: employeeId } });
        if (!employee || employee.tenantId !== tenantId) {
            throw new Error("Target employee not found.");
        }
        const assignment = await db.$transaction(async (tx) => {
            const newAssignment = await tx.assetAssignment.create({
                data: {
                    assetId,
                    employeeId,
                    departmentId: employee.departmentId || null,
                    targetType: "employee",
                    quantity: 1,
                    assignedAt: new Date(),
                    expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
                    conditionOnAssign: conditionOnAssign || asset.condition || "good",
                    status: "active",
                    notes: notes || null,
                },
            });
            await tx.asset.update({
                where: { id: assetId },
                data: {
                    status: "assigned",
                    assignedEmployeeId: employeeId,
                    assignedAt: new Date(),
                },
            });
            await tx.assetActivityLog.create({
                data: {
                    tenantId,
                    assetId,
                    actionType: "assign",
                    performedBy: actorId,
                    details: `Assigned to ${employee.firstName} ${employee.lastName} (${employee.employeeCode || employee.email})`,
                },
            });
            return newAssignment;
        });
        await outbox_service_1.OutboxService.publish({
            tenantId,
            eventType: "asset.assigned",
            entityType: "Asset",
            entityId: asset.id,
            payload: { employeeId, assetTag: asset.assetTag, assetName: asset.name },
        });
        return assignment;
    }
    static async acknowledgeAsset(tenantId, assignmentId, employeeId, signature) {
        const db = (0, tenant_context_1.getTenantDb)();
        const assignment = await db.assetAssignment.findUnique({
            where: { id: assignmentId },
            include: { asset: true },
        });
        if (!assignment || assignment.employeeId !== employeeId) {
            throw new Error("Unauthorized asset assignment sign-off.");
        }
        return await db.assetAssignment.update({
            where: { id: assignmentId },
            data: {
                acknowledgedAt: new Date(),
                acknowledgementSignature: signature,
            },
        });
    }
    static async returnAsset(tenantId, actorId, assignmentId, conditionOnReturn, notes) {
        const db = (0, tenant_context_1.getTenantDb)();
        const assignment = await db.assetAssignment.findUnique({
            where: { id: assignmentId },
            include: { asset: true },
        });
        if (!assignment || assignment.asset.tenantId !== tenantId) {
            throw new Error("Assignment record not found.");
        }
        const updatedAssignment = await db.$transaction(async (tx) => {
            const res = await tx.assetAssignment.update({
                where: { id: assignmentId },
                data: {
                    status: "returned",
                    returnedAt: new Date(),
                    conditionOnReturn: conditionOnReturn || "good",
                    notes: notes || assignment.notes,
                },
            });
            await tx.asset.update({
                where: { id: assignment.assetId },
                data: {
                    status: "available",
                    assignedEmployeeId: null,
                    assignedAt: null,
                    condition: conditionOnReturn || assignment.asset.condition,
                },
            });
            await tx.assetActivityLog.create({
                data: {
                    tenantId,
                    assetId: assignment.assetId,
                    actionType: "return",
                    performedBy: actorId,
                    details: `Asset returned with condition '${conditionOnReturn || "good"}'`,
                },
            });
            return res;
        });
        return updatedAssignment;
    }
    /**
     * 4. DEPRECIATION CALCULATION ENGINE
     */
    static async calculateDepreciation(tenantId, assetId) {
        const db = (0, tenant_context_1.getTenantDb)();
        const asset = await db.asset.findUnique({ where: { id: assetId } });
        if (!asset || asset.tenantId !== tenantId) {
            throw new Error("Asset not found.");
        }
        const purchasePrice = Number(asset.purchasePrice || 0);
        const salvageValue = Number(asset.salvageValue || 0);
        const usefulLifeMonths = asset.usefulLifeMonths || 36;
        const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date();
        const monthlyDepreciation = (purchasePrice - salvageValue) / usefulLifeMonths;
        const now = new Date();
        const monthsElapsed = Math.max(0, (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth()));
        const totalAccumulatedDepreciation = Math.min(purchasePrice - salvageValue, monthlyDepreciation * monthsElapsed);
        const currentBookValue = Math.max(salvageValue, purchasePrice - totalAccumulatedDepreciation);
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const schedule = await db.assetDepreciationSchedule.create({
            data: {
                tenantId,
                assetId,
                fiscalYear: now.getFullYear(),
                period,
                startingBookValue: new client_1.Prisma.Decimal(purchasePrice),
                depreciationAmount: new client_1.Prisma.Decimal(totalAccumulatedDepreciation),
                endingBookValue: new client_1.Prisma.Decimal(currentBookValue),
            },
        });
        return {
            assetId,
            assetName: asset.name,
            purchasePrice,
            salvageValue,
            usefulLifeMonths,
            monthsElapsed,
            monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100,
            totalAccumulatedDepreciation: Math.round(totalAccumulatedDepreciation * 100) / 100,
            currentBookValue: Math.round(currentBookValue * 100) / 100,
            schedule,
        };
    }
    static async listDepreciationSchedules(tenantId, assetId) {
        const db = (0, tenant_context_1.getTenantDb)();
        const where = { tenantId };
        if (assetId)
            where.assetId = assetId;
        return await db.assetDepreciationSchedule.findMany({
            where,
            include: { asset: { select: { id: true, name: true, assetTag: true, category: true } } },
            orderBy: { calculationDate: "desc" },
        });
    }
    /**
     * 5. REQUESTS & MAINTENANCE
     */
    static async requestAsset(tenantId, employeeId, data) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.assetRequest.create({
            data: {
                tenantId,
                employeeId,
                categoryName: data.categoryName,
                itemName: data.itemName,
                quantity: data.quantity ?? 1,
                purpose: data.purpose,
                priority: data.priority || "medium",
                status: "pending",
            },
        });
    }
    static async reviewAssetRequest(tenantId, actorId, requestId, status, adminNotes) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.assetRequest.update({
            where: { id: requestId },
            data: {
                status,
                adminNotes,
                reviewedAt: new Date(),
                reviewedBy: actorId,
            },
        });
    }
    static async createMaintenance(tenantId, assetId, data) {
        const db = (0, tenant_context_1.getTenantDb)();
        const maintenance = await db.assetMaintenance.create({
            data: {
                assetId,
                serviceType: data.serviceType || "corrective",
                vendor: data.vendor || null,
                cost: data.cost ? new client_1.Prisma.Decimal(data.cost) : new client_1.Prisma.Decimal(0),
                issueDescription: data.issueDescription,
                nextServiceDate: data.nextServiceDate ? new Date(data.nextServiceDate) : null,
                status: "in_progress",
            },
        });
        await db.asset.update({
            where: { id: assetId },
            data: { status: "maintenance" },
        });
        return maintenance;
    }
    static async completeMaintenance(tenantId, maintenanceId, resolutionDetails) {
        const db = (0, tenant_context_1.getTenantDb)();
        const maintenance = await db.assetMaintenance.update({
            where: { id: maintenanceId },
            data: {
                status: "completed",
                resolutionDetails: resolutionDetails || "Servicing and maintenance completed successfully.",
            },
        });
        await db.asset.update({
            where: { id: maintenance.assetId },
            data: { status: "available" },
        });
        return maintenance;
    }
    static async getEmployeeAssets(tenantId, employeeId) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.assetAssignment.findMany({
            where: { employeeId, status: "active" },
            include: {
                asset: {
                    include: { categoryRel: true },
                },
            },
            orderBy: { assignedAt: "desc" },
        });
    }
    static async getEmployeeRequests(tenantId, employeeId) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.assetRequest.findMany({
            where: { tenantId, employeeId },
            orderBy: { requestedAt: "desc" },
        });
    }
}
exports.AssetService = AssetService;
exports.assetService = AssetService;
