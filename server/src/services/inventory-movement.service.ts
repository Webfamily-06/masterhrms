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

    // Verify stock availability at source warehouse
    for (const item of items) {
      const stock = await prisma.productWarehouse.findUnique({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: fromWarehouseId,
          },
        },
      });

      const currentQty = stock?.quantity ?? 0;
      if (currentQty < item.quantity) {
        const prod = await prisma.product.findUnique({ where: { id: item.productId } });
        throw new Error(
          `Insufficient stock for "${prod?.name || item.productId}". Available: ${currentQty}, Requested: ${item.quantity}`
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

    // Execute atomic balance movements depending on state transition
    await prisma.$transaction(async (tx) => {
      // 1. When entering in_transit, deduct quantity from source warehouse
      if (newStatus === "in_transit" && currentStatus !== "in_transit" && currentStatus !== "completed") {
        for (const item of transfer.details) {
          await tx.productWarehouse.upsert({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: transfer.fromWarehouseId,
              },
            },
            update: {
              quantity: { decrement: item.quantity },
            },
            create: {
              productId: item.productId,
              warehouseId: transfer.fromWarehouseId,
              quantity: -item.quantity,
            },
          });
        }
      }

      // 2. When completed, ensure source was deducted, then add quantity to destination warehouse
      if (newStatus === "completed") {
        if (currentStatus !== "in_transit") {
          // If jumped straight from pending/approved to completed, deduct source first
          for (const item of transfer.details) {
            await tx.productWarehouse.upsert({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: transfer.fromWarehouseId,
                },
              },
              update: {
                quantity: { decrement: item.quantity },
              },
              create: {
                productId: item.productId,
                warehouseId: transfer.fromWarehouseId,
                quantity: -item.quantity,
              },
            });
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
   * Record Stock Adjustment (Addition / Subtraction / Damage)
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

      // Update warehouse stock levels
      for (const item of details) {
        const delta = type === "addition" ? item.quantity : -item.quantity;
        await tx.productWarehouse.upsert({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId,
            },
          },
          update: {
            quantity: { increment: delta },
          },
          create: {
            productId: item.productId,
            warehouseId,
            quantity: Math.max(0, delta),
          },
        });
      }

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
