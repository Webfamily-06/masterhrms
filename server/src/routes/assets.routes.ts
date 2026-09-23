import { Router, Response, Request } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireAddon } from "../middleware/addons";

export const assetsRouter = Router();

/**
 * -------------------------------------------------------------
 * PUBLIC QR / SCAN ENDPOINT (No auth required for camera scan)
 * -------------------------------------------------------------
 * GET /api/addons/assets/public/tag/:assetTag
 */
assetsRouter.get("/public/tag/:assetTag", async (req: Request, res: Response) => {
  try {
    const { assetTag } = req.params;
    const asset = await prisma.asset.findFirst({
      where: { assetTag },
      include: {
        categoryRel: { select: { name: true, icon: true, prefix: true } },
        assignedEmployee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            position: true,
            department: { select: { name: true } },
          },
        },
        assignments: {
          orderBy: { assignedAt: "desc" },
          take: 5,
          include: {
            employee: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        maintenanceLogs: {
          orderBy: { serviceDate: "desc" },
          take: 3,
        },
      },
    });

    if (!asset) {
      return res.status(404).json({ error: `Asset tag '${assetTag}' not found.` });
    }

    return res.json({ asset });
  } catch (err: any) {
    console.error("[assets/public-tag] error:", err);
    return res.status(500).json({ error: "Failed to fetch asset details for tag." });
  }
});

// All subsequent routes require Tenant Auth and Asset Management Add-on entitlement
assetsRouter.use(requireAuth);
assetsRouter.use(requireAddon("asset-management"));

/**
 * -------------------------------------------------------------
 * 1. ASSET CATEGORIES CRUD
 * -------------------------------------------------------------
 */
assetsRouter.get("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const categories = await prisma.assetCategory.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { assets: true } },
      },
    });

    return res.json({ categories });
  } catch (err: any) {
    console.error("[assets/categories] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load categories." });
  }
});

assetsRouter.post("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { name, description, icon = "💻", prefix = "AST" } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Category name is required." });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const category = await prisma.assetCategory.upsert({
      where: { tenantId_slug: { tenantId, slug } },
      create: {
        tenantId,
        name,
        slug,
        description,
        icon,
        prefix: prefix.toUpperCase(),
      },
      update: {
        name,
        description,
        icon,
        prefix: prefix.toUpperCase(),
      },
    });

    await prisma.assetActivityLog.create({
      data: {
        tenantId,
        actionType: "create_category",
        performedBy: req.user?.email || "Admin",
        details: `Created category '${category.name}' (Prefix: ${category.prefix})`,
      },
    });

    return res.status(201).json({ category });
  } catch (err: any) {
    console.error("[assets/categories:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create category." });
  }
});

assetsRouter.delete("/categories/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.assetCategory.delete({ where: { id } });
    return res.json({ message: "Category deleted successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete category." });
  }
});

/**
 * -------------------------------------------------------------
 * 2. ASSETS INVENTORY (Single & Batch with Quantity Reconciliation)
 * -------------------------------------------------------------
 */
assetsRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { category, status, employeeId, isBatch, search } = req.query;

    const whereClause: any = { tenantId };
    if (category && category !== "all") whereClause.category = String(category);
    if (status && status !== "all") whereClause.status = String(status);
    if (employeeId) whereClause.assignedEmployeeId = String(employeeId);
    if (isBatch === "true") whereClause.isBatch = true;
    if (isBatch === "false") whereClause.isBatch = false;

    if (search) {
      whereClause.OR = [
        { name: { contains: String(search) } },
        { assetTag: { contains: String(search) } },
        { serialNumber: { contains: String(search) } },
        { brand: { contains: String(search) } },
        { location: { contains: String(search) } },
      ];
    }

    const [assets, totalCount, assignedCount, maintenanceCount, availableCount, batchCount] =
      await Promise.all([
        prisma.asset.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          include: {
            categoryRel: true,
            assignedEmployee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                position: true,
                department: { select: { name: true } },
              },
            },
            assignments: {
              where: { status: "active" },
              include: {
                employee: { select: { firstName: true, lastName: true } },
              },
            },
            maintenanceLogs: {
              orderBy: { serviceDate: "desc" },
              take: 1,
            },
          },
        }),
        prisma.asset.count({ where: { tenantId } }),
        prisma.asset.count({ where: { tenantId, status: "assigned" } }),
        prisma.asset.count({ where: { tenantId, status: "maintenance" } }),
        prisma.asset.count({ where: { tenantId, status: "available" } }),
        prisma.asset.count({ where: { tenantId, isBatch: true } }),
      ]);

    // Check expiring warranties within 60 days
    const now = new Date();
    const sixtyDaysLater = new Date();
    sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60);

    const expiringWarrantyCount = await prisma.asset.count({
      where: {
        tenantId,
        warrantyExpiry: { gte: now, lte: sixtyDaysLater },
      },
    });

    const totalAssetValuation = assets.reduce(
      (sum, a) => sum + Number(a.purchasePrice || 0) * (a.isBatch ? a.totalQuantity : 1),
      0
    );

    return res.json({
      assets,
      summary: {
        totalAssets: totalCount,
        assignedCount,
        availableCount,
        maintenanceCount,
        batchCount,
        expiringWarrantyCount,
        totalValuation: totalAssetValuation,
      },
    });
  } catch (err: any) {
    console.error("[assets/list] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load assets." });
  }
});

assetsRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    let {
      assetTag,
      name,
      category = "laptop",
      categoryId,
      brand,
      model,
      serialNumber,
      isBatch = false,
      totalQuantity = 1,
      unit = "pcs",
      location = "HQ Main Storage",
      purchaseDate,
      purchasePrice,
      vendor,
      warrantyExpiry,
      condition = "good",
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Asset name is required." });
    }

    // Auto-generate assetTag if not provided
    if (!assetTag) {
      const prefix = category.slice(0, 3).toUpperCase() || "AST";
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      assetTag = `${prefix}-${randomNum}`;
    }

    const existing = await prisma.asset.findUnique({
      where: { tenantId_assetTag: { tenantId, assetTag } },
    });

    if (existing) {
      return res.status(400).json({ error: `Asset Tag '${assetTag}' is already registered.` });
    }

    const parsedTotalQty = isBatch ? Number(totalQuantity) || 1 : 1;

    const asset = await prisma.asset.create({
      data: {
        tenantId,
        assetTag,
        name,
        category,
        categoryId: categoryId || null,
        brand,
        model,
        serialNumber: isBatch ? null : serialNumber,
        isBatch: Boolean(isBatch),
        totalQuantity: parsedTotalQty,
        availableQuantity: parsedTotalQty,
        unit,
        location,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: purchasePrice ? Number(purchasePrice) : 0,
        vendor,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        condition,
        status: "available",
        notes,
        qrCode: `/a/${assetTag}`,
      },
    });

    await prisma.assetActivityLog.create({
      data: {
        tenantId,
        assetId: asset.id,
        actionType: "create",
        quantity: parsedTotalQty,
        performedBy: req.user?.email || "Admin",
        details: `Registered asset ${asset.assetTag} (${asset.name}) - Qty: ${parsedTotalQty} ${unit}`,
      },
    });

    return res.status(201).json({ asset });
  } catch (err: any) {
    console.error("[assets/create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to register asset." });
  }
});

/**
 * -------------------------------------------------------------
 * 3. MULTI-TARGET ALLOCATIONS (Employee, Department, Warehouse)
 * -------------------------------------------------------------
 */
assetsRouter.post("/:id/allocate", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { id } = req.params;
    const {
      targetType = "employee", // employee, department, location
      employeeId,
      departmentId,
      locationName,
      quantity = 1,
      expectedReturnDate,
      conditionOnAssign = "good",
      notes,
    } = req.body;

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset || asset.tenantId !== tenantId) {
      return res.status(404).json({ error: "Asset not found." });
    }

    const allocQty = Number(quantity) || 1;
    if (asset.availableQuantity < allocQty) {
      return res.status(400).json({
        error: `Insufficient available quantity. In stock: ${asset.availableQuantity}, Requested: ${allocQty}`,
      });
    }

    const newAvailableQty = asset.availableQuantity - allocQty;

    // 1. Create Assignment record
    const assignment = await prisma.assetAssignment.create({
      data: {
        assetId: id,
        targetType,
        employeeId: targetType === "employee" ? employeeId : null,
        departmentId: targetType === "department" ? departmentId : null,
        locationName: targetType === "location" ? locationName : null,
        quantity: allocQty,
        assignedAt: new Date(),
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
        conditionOnAssign,
        status: "active",
        notes,
      },
    });

    // 2. Update Asset status & quantity
    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: {
        availableQuantity: newAvailableQty,
        status: newAvailableQty === 0 ? "assigned" : "available",
        assignedEmployeeId: targetType === "employee" ? employeeId : asset.assignedEmployeeId,
        assignedAt: new Date(),
      },
      include: {
        assignedEmployee: { select: { firstName: true, lastName: true } },
      },
    });

    // 3. Log Activity
    await prisma.assetActivityLog.create({
      data: {
        tenantId,
        assetId: id,
        actionType: "assign",
        quantity: allocQty,
        performedBy: req.user?.email || "Admin",
        details: `Allocated ${allocQty} ${asset.unit} of ${asset.assetTag} to ${targetType}`,
      },
    });

    return res.json({
      message: `Successfully allocated ${allocQty} ${asset.unit} of ${asset.assetTag}!`,
      asset: updatedAsset,
      assignment,
    });
  } catch (err: any) {
    console.error("[assets/allocate] error:", err);
    return res.status(500).json({ error: err.message || "Failed to allocate asset." });
  }
});

assetsRouter.post("/assignments/:assignmentId/return", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { assignmentId } = req.params;
    const { returnedQuantity, conditionOnReturn = "good", notes } = req.body;

    const assignment = await prisma.assetAssignment.findUnique({
      where: { id: assignmentId },
      include: { asset: true },
    });

    if (!assignment || assignment.asset.tenantId !== tenantId) {
      return res.status(404).json({ error: "Assignment not found." });
    }

    const returnQty = Number(returnedQuantity) || assignment.quantity;
    const isFullReturn = returnQty >= assignment.quantity;

    // 1. Update assignment
    await prisma.assetAssignment.update({
      where: { id: assignmentId },
      data: {
        status: isFullReturn ? "returned" : "active",
        returnedAt: new Date(),
        conditionOnReturn,
        notes: notes ? `${assignment.notes || ""}\n[Return]: ${notes}` : assignment.notes,
        quantity: assignment.quantity - (isFullReturn ? 0 : returnQty),
      },
    });

    // 2. Reconcile asset quantity
    const newAvailable = Math.min(
      assignment.asset.totalQuantity,
      assignment.asset.availableQuantity + returnQty
    );

    const asset = await prisma.asset.update({
      where: { id: assignment.assetId },
      data: {
        availableQuantity: newAvailable,
        status: newAvailable > 0 ? "available" : "assigned",
        assignedEmployeeId: newAvailable === assignment.asset.totalQuantity ? null : assignment.asset.assignedEmployeeId,
      },
    });

    // 3. Log Activity
    await prisma.assetActivityLog.create({
      data: {
        tenantId,
        assetId: asset.id,
        actionType: "return",
        quantity: returnQty,
        performedBy: req.user?.email || "Admin",
        details: `Returned ${returnQty} units of ${asset.assetTag} (Condition: ${conditionOnReturn})`,
      },
    });

    return res.json({
      message: `Checked in ${returnQty} units of ${asset.assetTag}. In stock: ${newAvailable}`,
      asset,
    });
  } catch (err: any) {
    console.error("[assets/return] error:", err);
    return res.status(500).json({ error: err.message || "Failed to return asset." });
  }
});

/**
 * -------------------------------------------------------------
 * 4. EMPLOYEE ASSET REQUESTS & 1-CLICK APPROVAL
 * -------------------------------------------------------------
 */
assetsRouter.get("/requests", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { status, employeeId } = req.query;

    const whereClause: any = { tenantId };
    if (status && status !== "all") whereClause.status = String(status);
    if (employeeId) whereClause.employeeId = String(employeeId);

    const requests = await prisma.assetRequest.findMany({
      where: whereClause,
      orderBy: { requestedAt: "desc" },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    return res.json({ requests });
  } catch (err: any) {
    console.error("[assets/requests] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load requests." });
  }
});

assetsRouter.post("/requests", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { employeeId, categoryName, itemName, quantity = 1, purpose, priority = "medium" } = req.body;

    if (!employeeId || !itemName || !purpose) {
      return res.status(400).json({ error: "Employee, item name, and business purpose are required." });
    }

    const request = await prisma.assetRequest.create({
      data: {
        tenantId,
        employeeId,
        categoryName: categoryName || "General IT",
        itemName,
        quantity: Number(quantity) || 1,
        purpose,
        priority,
        status: "pending",
      },
    });

    await prisma.assetActivityLog.create({
      data: {
        tenantId,
        actionType: "request",
        performedBy: req.user?.email || "Employee",
        details: `Submitted request for ${request.quantity}x ${request.itemName} (Priority: ${request.priority})`,
      },
    });

    return res.status(201).json({ request });
  } catch (err: any) {
    console.error("[assets/requests:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to submit request." });
  }
});

assetsRouter.post("/requests/:id/review", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { id } = req.params;
    const { status, adminNotes } = req.body; // approved, rejected, fulfilled

    if (!status) {
      return res.status(400).json({ error: "Review status is required." });
    }

    const request = await prisma.assetRequest.update({
      where: { id },
      data: {
        status,
        adminNotes,
        reviewedAt: new Date(),
        reviewedBy: req.user?.email || "Admin",
      },
      include: { employee: true },
    });

    await prisma.assetActivityLog.create({
      data: {
        tenantId,
        actionType: "request_review",
        performedBy: req.user?.email || "Admin",
        details: `Marked asset request for ${request.itemName} as '${status}'`,
      },
    });

    return res.json({ message: `Request updated to ${status}.`, request });
  } catch (err: any) {
    console.error("[assets/requests:review] error:", err);
    return res.status(500).json({ error: err.message || "Failed to review request." });
  }
});

/**
 * -------------------------------------------------------------
 * 5. DISPOSALS & WRITE-OFF BATCHES
 * -------------------------------------------------------------
 */
assetsRouter.get("/disposals", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const batches = await prisma.assetDisposalBatch.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            asset: { select: { assetTag: true, name: true, category: true } },
          },
        },
      },
    });

    return res.json({ batches });
  } catch (err: any) {
    console.error("[assets/disposals] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load disposals." });
  }
});

assetsRouter.post("/disposals", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { title, period = "Q4", justification, items = [] } = req.body;

    const batchNumber = `DISP-${period}-${Math.floor(1000 + Math.random() * 9000)}`;

    let totalBookVal = 0;
    let totalItems = 0;

    items.forEach((item: any) => {
      totalBookVal += Number(item.bookValue || 0) * (Number(item.quantity) || 1);
      totalItems += Number(item.quantity) || 1;
    });

    const batch = await prisma.assetDisposalBatch.create({
      data: {
        tenantId,
        batchNumber,
        title: title || `Asset Write-Off Batch ${period}`,
        period,
        status: "draft",
        totalItemsCount: totalItems,
        totalBookValue: totalBookVal,
        justification,
        items: {
          create: items.map((it: any) => ({
            assetId: it.assetId,
            quantity: Number(it.quantity) || 1,
            reason: it.reason || "End of life / irreparable damage",
            bookValue: Number(it.bookValue) || 0,
            disposalMethod: it.disposalMethod || "scrap",
            recoveryAmount: Number(it.recoveryAmount) || 0,
          })),
        },
      },
      include: { items: true },
    });

    return res.status(201).json({ batch });
  } catch (err: any) {
    console.error("[assets/disposals:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create disposal batch." });
  }
});

assetsRouter.post("/disposals/:id/approve", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { id } = req.params;

    const batch = await prisma.assetDisposalBatch.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!batch || batch.tenantId !== tenantId) {
      return res.status(404).json({ error: "Disposal batch not found." });
    }

    // 1. Mark assets as disposed and deduct quantity (batched)
    const assetIds = Array.from(new Set(batch.items.map((item) => item.assetId)));
    const assets = await prisma.asset.findMany({
      where: { id: { in: assetIds } },
    });
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    for (const item of batch.items) {
      const asset = assetMap.get(item.assetId);
      if (asset) {
        const remainingTotal = Math.max(0, asset.totalQuantity - item.quantity);
        const remainingAvail = Math.max(0, asset.availableQuantity - item.quantity);

        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            totalQuantity: remainingTotal,
            availableQuantity: remainingAvail,
            status: remainingTotal === 0 ? "disposed" : asset.status,
          },
        });
      }
    }

    // 2. Approve batch
    const updatedBatch = await prisma.assetDisposalBatch.update({
      where: { id },
      data: {
        status: "approved",
        approvedBy: req.user?.email || "Board Approver",
        approvedAt: new Date(),
      },
    });

    await prisma.assetActivityLog.create({
      data: {
        tenantId,
        actionType: "disposal_approved",
        performedBy: req.user?.email || "Board Approver",
        details: `Approved write-off batch ${batch.batchNumber} (${batch.totalItemsCount} items)`,
      },
    });

    return res.json({ message: "Disposal batch approved and assets written off!", batch: updatedBatch });
  } catch (err: any) {
    console.error("[assets/disposals:approve] error:", err);
    return res.status(500).json({ error: err.message || "Failed to approve disposal batch." });
  }
});

/**
 * -------------------------------------------------------------
 * 6. 4 OPERATIONAL REPORTS
 * -------------------------------------------------------------
 */
assetsRouter.get("/reports", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;

    // 1. Employee Assignments Report
    const employeeAssignments = await prisma.assetAssignment.findMany({
      where: { asset: { tenantId }, targetType: "employee", status: "active" },
      include: {
        asset: true,
        employee: { select: { firstName: true, lastName: true, position: true, department: { select: { name: true } } } },
      },
    });

    // 2. Department & Location Distribution
    const departmentAssignments = await prisma.assetAssignment.findMany({
      where: { asset: { tenantId }, status: "active" },
      include: {
        asset: true,
      },
    });

    // 3. Inventory & Valuation Reconciliation
    const inventoryReconciliation = await prisma.asset.findMany({
      where: { tenantId },
      include: { categoryRel: true },
    });

    // 4. Damaged & Under Maintenance Assets
    const maintenanceAndDamaged = await prisma.asset.findMany({
      where: {
        tenantId,
        OR: [{ status: "maintenance" }, { condition: "damaged" }],
      },
      include: {
        maintenanceLogs: { orderBy: { serviceDate: "desc" }, take: 1 },
      },
    });

    return res.json({
      reports: {
        employeeAssignments,
        departmentAssignments,
        inventoryReconciliation,
        maintenanceAndDamaged,
      },
    });
  } catch (err: any) {
    console.error("[assets/reports] error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate reports." });
  }
});

/**
 * -------------------------------------------------------------
 * 7. AUDIT & TRANSACTION LOGS
 * -------------------------------------------------------------
 */
assetsRouter.get("/activity", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const logs = await prisma.assetActivityLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        asset: { select: { assetTag: true, name: true } },
      },
    });

    return res.json({ logs });
  } catch (err: any) {
    console.error("[assets/activity] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load activity logs." });
  }
});
