import { getTenantDb } from "../context/tenant-context";
import { OutboxService } from "./outbox.service";
import { AuditService } from "./audit.service";
import { Prisma } from "@prisma/client";

export class AssetService {
  /**
   * 1. DASHBOARD & OVERVIEW
   */
  static async getOverview(tenantId: string) {
    const db = getTenantDb();
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

    const totalAssetValue = assetsWithPrice.reduce(
      (sum: number, a: any) => sum + Number(a.purchasePrice || 0),
      0
    );

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
  static async listCategories(tenantId: string) {
    const db = getTenantDb();
    return await db.assetCategory.findMany({
      where: { tenantId },
      include: { _count: { select: { assets: true } } },
      orderBy: { name: "asc" },
    });
  }

  static async createCategory(
    tenantId: string,
    data: { name: string; slug?: string; description?: string; prefix?: string; icon?: string }
  ) {
    const db = getTenantDb();
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
  static async listAssets(
    tenantId: string,
    filters?: { category?: string; status?: string; search?: string }
  ) {
    const db = getTenantDb();
    const where: any = { tenantId };

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

  static async createAsset(
    tenantId: string,
    actorId: string,
    data: {
      name: string;
      assetTag?: string;
      category?: string;
      categoryId?: string;
      brand?: string;
      model?: string;
      serialNumber?: string;
      purchaseDate?: string | Date;
      purchasePrice?: number;
      vendor?: string;
      condition?: string;
      location?: string;
      usefulLifeMonths?: number;
      salvageValue?: number;
      depreciationMethod?: string;
      notes?: string;
    }
  ) {
    const db = getTenantDb();
    const assetTag = data.assetTag || `AST-${Date.now().toString().slice(-6)}`;

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
        purchasePrice: data.purchasePrice ? new Prisma.Decimal(data.purchasePrice) : null,
        vendor: data.vendor || null,
        condition: data.condition || "good",
        status: "available",
        location: data.location || "Headquarters",
        usefulLifeMonths: data.usefulLifeMonths ?? 36,
        salvageValue: data.salvageValue ? new Prisma.Decimal(data.salvageValue) : new Prisma.Decimal(0),
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

    await AuditService.record({
      tenantId,
      actorId,
      action: "asset.created",
      entityType: "Asset",
      entityId: asset.id,
      newValues: { assetTag: asset.assetTag, name: asset.name },
    });

    return asset;
  }

  static async assignAsset(
    tenantId: string,
    actorId: string,
    assetId: string,
    employeeId: string,
    expectedReturnDate?: string | Date,
    conditionOnAssign?: string,
    notes?: string
  ) {
    const db = getTenantDb();
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

    const assignment = await db.assetAssignment.create({
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

    await db.asset.update({
      where: { id: assetId },
      data: {
        status: "assigned",
        assignedEmployeeId: employeeId,
        assignedAt: new Date(),
      },
    });

    await db.assetActivityLog.create({
      data: {
        tenantId,
        assetId,
        actionType: "assign",
        performedBy: actorId,
        details: `Assigned to ${employee.firstName} ${employee.lastName} (${employee.employeeCode || employee.email})`,
      },
    });

    await OutboxService.publish({
      tenantId,
      eventType: "asset.assigned",
      entityType: "Asset",
      entityId: asset.id,
      payload: { employeeId, assetTag: asset.assetTag, assetName: asset.name },
    });

    return assignment;
  }

  static async acknowledgeAsset(
    tenantId: string,
    assignmentId: string,
    employeeId: string,
    signature: string
  ) {
    const db = getTenantDb();
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

  static async returnAsset(
    tenantId: string,
    actorId: string,
    assignmentId: string,
    conditionOnReturn?: string,
    notes?: string
  ) {
    const db = getTenantDb();
    const assignment = await db.assetAssignment.findUnique({
      where: { id: assignmentId },
      include: { asset: true },
    });

    if (!assignment || assignment.asset.tenantId !== tenantId) {
      throw new Error("Assignment record not found.");
    }

    const updatedAssignment = await db.assetAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "returned",
        returnedAt: new Date(),
        conditionOnReturn: conditionOnReturn || "good",
        notes: notes || assignment.notes,
      },
    });

    await db.asset.update({
      where: { id: assignment.assetId },
      data: {
        status: "available",
        assignedEmployeeId: null,
        assignedAt: null,
        condition: conditionOnReturn || assignment.asset.condition,
      },
    });

    await db.assetActivityLog.create({
      data: {
        tenantId,
        assetId: assignment.assetId,
        actionType: "return",
        performedBy: actorId,
        details: `Asset returned with condition '${conditionOnReturn || "good"}'`,
      },
    });

    return updatedAssignment;
  }

  /**
   * 4. DEPRECIATION CALCULATION ENGINE
   */
  static async calculateDepreciation(tenantId: string, assetId: string) {
    const db = getTenantDb();
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
    const monthsElapsed = Math.max(
      0,
      (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth())
    );

    const totalAccumulatedDepreciation = Math.min(
      purchasePrice - salvageValue,
      monthlyDepreciation * monthsElapsed
    );
    const currentBookValue = Math.max(salvageValue, purchasePrice - totalAccumulatedDepreciation);

    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const schedule = await db.assetDepreciationSchedule.create({
      data: {
        tenantId,
        assetId,
        fiscalYear: now.getFullYear(),
        period,
        startingBookValue: new Prisma.Decimal(purchasePrice),
        depreciationAmount: new Prisma.Decimal(totalAccumulatedDepreciation),
        endingBookValue: new Prisma.Decimal(currentBookValue),
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

  static async listDepreciationSchedules(tenantId: string, assetId?: string) {
    const db = getTenantDb();
    const where: any = { tenantId };
    if (assetId) where.assetId = assetId;

    return await db.assetDepreciationSchedule.findMany({
      where,
      include: { asset: { select: { id: true, name: true, assetTag: true, category: true } } },
      orderBy: { calculationDate: "desc" },
    });
  }

  /**
   * 5. REQUESTS & MAINTENANCE
   */
  static async requestAsset(
    tenantId: string,
    employeeId: string,
    data: { categoryName: string; itemName: string; quantity?: number; purpose: string; priority?: string }
  ) {
    const db = getTenantDb();
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

  static async reviewAssetRequest(
    tenantId: string,
    actorId: string,
    requestId: string,
    status: string,
    adminNotes?: string
  ) {
    const db = getTenantDb();
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

  static async createMaintenance(
    tenantId: string,
    assetId: string,
    data: { serviceType?: string; vendor?: string; cost?: number; issueDescription: string; nextServiceDate?: string | Date }
  ) {
    const db = getTenantDb();
    const maintenance = await db.assetMaintenance.create({
      data: {
        assetId,
        serviceType: data.serviceType || "corrective",
        vendor: data.vendor || null,
        cost: data.cost ? new Prisma.Decimal(data.cost) : new Prisma.Decimal(0),
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

  static async completeMaintenance(tenantId: string, maintenanceId: string, resolutionDetails?: string) {
    const db = getTenantDb();
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

  static async getEmployeeAssets(tenantId: string, employeeId: string) {
    const db = getTenantDb();
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

  static async getEmployeeRequests(tenantId: string, employeeId: string) {
    const db = getTenantDb();
    return await db.assetRequest.findMany({
      where: { tenantId, employeeId },
      orderBy: { requestedAt: "desc" },
    });
  }
}

export const assetService = AssetService;
