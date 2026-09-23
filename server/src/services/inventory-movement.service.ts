import { prisma } from "../prisma";

export interface TransferItemInput {
  productId: string;
  quantity: number;
  unitCost?: number;
}

export class InventoryMovementService {
  /**
   * Create a new Multi-Warehouse Transfer request
   */
  static async createTransfer(params: {
    tenantId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    notes?: string;
    items: TransferItemInput[];
  }) {
    const { tenantId, fromWarehouseId, toWarehouseId, notes, items } = params;

    if (fromWarehouseId === toWarehouseId) {
      throw new Error("Source and destination warehouses cannot be the same");
    }

    if (!items || items.length === 0) {
      throw new Error("Transfer must include at least one product item");
    }

    // Verify stock availability at source warehouse (batched)
    const productIds = Array.from(new Set(items.map((i) => i.productId)));
    const [stocks, products] = await Promise.all([
      prisma.productWarehouse.findMany({
        where: { warehouseId: fromWarehouseId, productId: { in: productIds } },
      }),
      prisma.product.findMany({
        where: { id: { in: productIds } },
      }),
    ]);

    const stockMap = new Map(stocks.map((s) => [s.productId, s.quantity]));
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    for (const item of items) {
      const currentQty = stockMap.get(item.productId) ?? 0;
      if (currentQty < item.quantity) {
        const prodName = productMap.get(item.productId) || item.productId;
        throw new Error(
          `Insufficient stock for "${prodName}". Available: ${currentQty}, Requested: ${item.quantity}`
        );
      }
    }

    const transferNo = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const transfer = await prisma.stockTransfer.create({
      data: {
        tenantId,
        transferNo,
        fromWarehouseId,
        toWarehouseId,
        status: "pending",
        notes: notes || null,
        details: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        details: {
          include: {
            product: true,
          },
        },
      },
    });

    return transfer;
  }

  /**
   * Process State Transitions for Multi-Tier Approval Workflow
   * States: pending -> approved -> in_transit -> completed | rejected
   */
  static async updateTransferStatus(params: {
    transferId: string;
    newStatus: "approved" | "in_transit" | "completed" | "rejected";
    tenantId: string;
  }) {
    const { transferId, newStatus, tenantId } = params;

    const transfer = await prisma.stockTransfer.findFirst({
      where: { id: transferId, tenantId },
      include: { details: true },
    });

    if (!transfer) {
      throw new Error("Stock transfer not found or unauthorized");
    }

    const currentStatus = transfer.status.toLowerCase();

    if (currentStatus === newStatus) {
      return transfer;
    }

    // Execute atomic balance movements depending on state transition (Stocky Rule 2)
    await prisma.$transaction(async (tx) => {
      // 1. When entering in_transit, atomically deduct quantity from source warehouse
      if (newStatus === "in_transit" && currentStatus !== "in_transit" && currentStatus !== "completed") {
        for (const item of transfer.details) {
          const pw = await tx.productWarehouse.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: transfer.fromWarehouseId,
              },
            },
          });
          const available = pw ? pw.quantity : 0;
          if (available < item.quantity) {
            throw new Error(
              `Cannot dispatch transfer: Source warehouse only has ${available} units available (requested ${item.quantity}).`
            );
          }

          const updated = await tx.productWarehouse.updateMany({
            where: {
              productId: item.productId,
              warehouseId: transfer.fromWarehouseId,
              quantity: { gte: item.quantity },
            },
            data: {
              quantity: { decrement: item.quantity },
            },
          });

          if (updated.count === 0) {
            throw new Error(`Concurrency conflict during dispatch. Available stock was modified by another operation.`);
          }
        }
      }

      // 2. When completed, ensure source was deducted, then add quantity to destination warehouse
      if (newStatus === "completed") {
        if (currentStatus !== "in_transit") {
          // If jumped straight from pending/approved to completed, deduct source first with atomic guard
          for (const item of transfer.details) {
            const pw = await tx.productWarehouse.findUnique({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: transfer.fromWarehouseId,
                },
              },
            });
            const available = pw ? pw.quantity : 0;
            if (available < item.quantity) {
              throw new Error(
                `Cannot complete transfer: Source warehouse only has ${available} units available (requested ${item.quantity}).`
              );
            }

            const updated = await tx.productWarehouse.updateMany({
              where: {
                productId: item.productId,
                warehouseId: transfer.fromWarehouseId,
                quantity: { gte: item.quantity },
              },
              data: {
                quantity: { decrement: item.quantity },
              },
            });

            if (updated.count === 0) {
              throw new Error(`Concurrency conflict during transfer completion.`);
            }
          }
        }

        // Add to destination
        for (const item of transfer.details) {
          await tx.productWarehouse.upsert({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: transfer.toWarehouseId,
              },
            },
            update: {
              quantity: { increment: item.quantity },
            },
            create: {
              productId: item.productId,
              warehouseId: transfer.toWarehouseId,
              quantity: item.quantity,
            },
          });
        }
      }

      // 3. When rejected after in_transit, restore stock back to source warehouse
      if (newStatus === "rejected" && currentStatus === "in_transit") {
        for (const item of transfer.details) {
          await tx.productWarehouse.upsert({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: transfer.fromWarehouseId,
              },
            },
            update: {
              quantity: { increment: item.quantity },
            },
            create: {
              productId: item.productId,
              warehouseId: transfer.fromWarehouseId,
              quantity: item.quantity,
            },
          });
        }
      }

      // Update transfer status
      await tx.stockTransfer.update({
        where: { id: transferId },
        data: { status: newStatus },
      });
    });

    return await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        details: { include: { product: true } },
      },
    });
  }

  /**
   * Record Stock Adjustment (Addition / Subtraction / Damage) with concurrency checks
   */
  static async recordAdjustment(params: {
    tenantId: string;
    warehouseId: string;
    type: "addition" | "subtraction";
    reason?: string;
    details: { productId: string; quantity: number }[];
  }) {
    const { tenantId, warehouseId, type, reason, details } = params;

    return await prisma.$transaction(async (tx) => {
      const adjustment = await tx.stockAdjustment.create({
        data: {
          tenantId,
          warehouseId,
          type,
          reason: reason || null,
          details: {
            create: details.map((d) => ({
              productId: d.productId,
              quantity: d.quantity,
            })),
          },
        },
        include: {
          warehouse: true,
          details: { include: { product: true } },
        },
      });

      // Update warehouse stock levels with atomic boundary validation
      for (const item of details) {
        if (type === "subtraction") {
          const pw = await tx.productWarehouse.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId,
              },
            },
          });
          const available = pw ? pw.quantity : 0;
          if (available < item.quantity) {
            throw new Error(`Cannot subtract ${item.quantity} units from warehouse. Current stock is ${available}.`);
          }

          const updated = await tx.productWarehouse.updateMany({
            where: {
              productId: item.productId,
              warehouseId,
              quantity: { gte: item.quantity },
            },
            data: {
              quantity: { decrement: item.quantity },
            },
          });

          if (updated.count === 0) {
            throw new Error(`Concurrency conflict during stock subtraction.`);
          }
        } else {
          // addition
          await tx.productWarehouse.upsert({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId,
              },
            },
            update: {
              quantity: { increment: item.quantity },
            },
            create: {
              productId: item.productId,
              warehouseId,
              quantity: item.quantity,
            },
          });
        }
      }

      return adjustment;
    });
  }

  /**
   * Reconcile Physical Stock (Physical Count Audit)
   * Calculates difference between physical count and system stock,
   * records corresponding adjustment, and updates stock to exact physical count.
   */
  static async reconcilePhysicalStock(params: {
    tenantId: string;
    warehouseId: string;
    reason?: string;
    counts: { productId: string; physicalQuantity: number }[];
  }) {
    const { tenantId, warehouseId, reason, counts } = params;

    return await prisma.$transaction(async (tx) => {
      const adjustmentLines: { productId: string; quantity: number }[] = [];
      let overallType: "addition" | "subtraction" = "addition";
      let netDiff = 0;

      // Batch fetch system quantities for all reconciliation counts
      const countProductIds = Array.from(new Set(counts.map((c) => c.productId)));
      const existingStocks = await tx.productWarehouse.findMany({
        where: { warehouseId, productId: { in: countProductIds } },
      });
      const stockMap = new Map(existingStocks.map((s) => [s.productId, s.quantity]));

      for (const c of counts) {
        const systemQty = stockMap.get(c.productId) ?? 0;
        const diff = c.physicalQuantity - systemQty;

        if (diff !== 0) {
          adjustmentLines.push({
            productId: c.productId,
            quantity: Math.abs(diff),
          });
          netDiff += diff;

          // Set stock directly to physical count
          await tx.productWarehouse.upsert({
            where: {
              productId_warehouseId: {
                productId: c.productId,
                warehouseId,
              },
            },
            update: {
              quantity: c.physicalQuantity,
            },
            create: {
              productId: c.productId,
              warehouseId,
              quantity: c.physicalQuantity,
            },
          });
        }
      }

      if (adjustmentLines.length === 0) {
        return null;
      }

      overallType = netDiff >= 0 ? "addition" : "subtraction";

      const adjustment = await tx.stockAdjustment.create({
        data: {
          tenantId,
          warehouseId,
          type: overallType,
          reason: reason || "Physical Inventory Audit Reconciliation",
          details: {
            create: adjustmentLines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
            })),
          },
        },
        include: {
          warehouse: true,
          details: { include: { product: true } },
        },
      });

      return adjustment;
    });
  }

  /**
   * Get warehouse stock summary with total units and estimated inventory valuation
   */
  static async getWarehouseStockSummary(tenantId: string, warehouseId?: string) {
    const where: any = { tenantId };
    if (warehouseId) where.id = warehouseId;

    const warehouses = await prisma.warehouse.findMany({
      where,
      include: {
        stocks: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                salePrice: true,
                purchasePrice: true,
                lowStockThreshold: true,
              },
            },
          },
        },
      },
    });

    return warehouses.map((wh) => {
      const totalUnits = wh.stocks.reduce((acc, s) => acc + s.quantity, 0);
      const valuation = wh.stocks.reduce(
        (acc, s) => acc + s.quantity * Number(s.product.purchasePrice || 0),
        0
      );
      const lowStockCount = wh.stocks.filter(
        (s) => s.quantity <= (s.product.lowStockThreshold || 5)
      ).length;

      return {
        id: wh.id,
        name: wh.name,
        location: wh.location,
        isDefault: wh.isDefault,
        totalUnits,
        valuation,
        lowStockCount,
        stockItems: wh.stocks.map((s) => ({
          productId: s.productId,
          productName: s.product.name,
          sku: s.product.sku,
          quantity: s.quantity,
          purchasePrice: Number(s.product.purchasePrice || 0),
          salePrice: Number(s.product.salePrice || 0),
          isLowStock: s.quantity <= (s.product.lowStockThreshold || 5),
        })),
      };
    });
  }
}
