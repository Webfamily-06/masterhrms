import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantId } from "../lib/tenant";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";

export const productsRouter = Router();

// Helper to ensure default warehouse exists
async function ensureDefaultWarehouse(tenantId: string) {
  let wh = await prisma.warehouse.findFirst({
    where: { tenantId, isDefault: true },
  });
  if (!wh) {
    wh = await prisma.warehouse.create({
      data: {
        tenantId,
        name: "Main Central Warehouse",
        location: "Hub Terminal A",
        isDefault: true,
      },
    });
  }
  return wh;
}

// GET /api/products - List all products for tenant (Stocky Rule 0: Universal Query Contract)
productsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const pagination = parsePaginationParams(req, "createdAt", 50);
    const { categoryId, brandId, warehouseId, type } = req.query;

    const where: any = { tenantId, isActive: true };

    if (pagination.search) {
      where.OR = [
        { name: { contains: pagination.search } },
        { sku: { contains: pagination.search } },
        { barcode: { contains: pagination.search } },
      ];
    }

    if (categoryId && categoryId !== "all") where.categoryId = String(categoryId);
    if (brandId && brandId !== "all") where.brandId = String(brandId);
    if (type && type !== "all") where.type = String(type);
    if (warehouseId && warehouseId !== "all") {
      where.warehouseStocks = { some: { warehouseId: String(warehouseId) } };
    }

    const sortField = ["name", "createdAt", "updatedAt", "salePrice"].includes(pagination.sortField)
      ? pagination.sortField
      : "createdAt";

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          unit: true,
          taxRate: true,
          warehouseStocks: {
            include: {
              warehouse: true,
            },
          },
        },
        orderBy: { [sortField]: pagination.sortType },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    const formatted = products.map((p) => {
      const totalStock = p.warehouseStocks.reduce((sum, ws) => sum + ws.quantity, 0);
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        sku: p.sku,
        barcode: p.barcode || p.sku,
        hsn_sac: p.hsnSac,
        categoryId: p.categoryId,
        categoryName: p.category ? p.category.name : "General",
        categoryColor: p.category ? p.category.color : "#3b82f6",
        category: p.category ? p.category.name : "General",
        taxRate: p.taxRate ? Number(p.taxRate.rate) : 18,
        taxName: p.taxRate ? p.taxRate.name : "GST 18%",
        gst_rate: p.taxRate ? Number(p.taxRate.rate) : 18,
        salePrice: Number(p.salePrice),
        purchasePrice: Number(p.purchasePrice),
        price: Number(p.salePrice),
        unit: p.unit ? p.unit.name : "Pcs",
        quantity: totalStock,
        stock: totalStock,
        low_stock_threshold: p.lowStockThreshold,
        warehouseStocks: p.warehouseStocks.map((ws) => ({
          warehouseId: ws.warehouseId,
          warehouseName: ws.warehouse.name,
          quantity: ws.quantity,
        })),
        image: p.image || "/images/no-image.png",
        shortDescription: p.shortDescription || "",
        description: p.description || "",
        createdAt: p.createdAt.toISOString(),
      };
    });

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(formatted, total, pagination));
    }

    res.setHeader("X-Total-Count", String(total));
    return res.json(formatted);
  } catch (err: any) {
    console.error("Products GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch products" });
  }
});

// POST /api/products - Create a new product
productsRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const body = req.body;

    if (!body.name || !body.name.trim()) {
      return res.status(400).json({ error: "Product name is required" });
    }

    const defaultWh = await ensureDefaultWarehouse(tenantId);
    const sku = body.sku ? body.sku.trim() : "SKU-" + Date.now().toString().slice(-6);

    let categoryId = body.categoryId || null;
    if (!categoryId && body.categoryName) {
      const cat = await prisma.productCategory.findFirst({
        where: { tenantId, name: body.categoryName },
      });
      categoryId = cat
        ? cat.id
        : (await prisma.productCategory.create({ data: { tenantId, name: body.categoryName } })).id;
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          tenantId,
          name: body.name.trim(),
          type: body.type || "Product",
          sku,
          barcode: body.barcode || sku,
          hsnSac: body.hsn_sac || body.hsnSac || "8471",
          categoryId,
          brandId: body.brandId || null,
          unitId: body.unitId || null,
          taxRateId: body.taxRateId || null,
          salePrice: Number(body.salePrice || body.price || 0),
          purchasePrice: Number(body.purchasePrice || 0),
          lowStockThreshold: Number(body.low_stock_threshold || body.lowStockThreshold || 5),
          shortDescription: body.shortDescription || "",
          description: body.description || "",
          image: body.image && body.image.trim() ? body.image.trim() : "/images/no-image.png",
        },
      });

      const initialQty = Number(body.quantity || body.stock || 0);
      await tx.productWarehouse.create({
        data: {
          productId: product.id,
          warehouseId: body.warehouseId || defaultWh.id,
          quantity: initialQty,
        },
      });

      return product;
    });

    return res.status(201).json(result);
  } catch (err: any) {
    console.error("Products POST error:", err);
    return res.status(500).json({ error: err.message || "Failed to create product" });
  }
});

// PUT /api/products/:id - Update product
productsRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.product.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Product not found" });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : existing.name,
        type: body.type !== undefined ? body.type : existing.type,
        sku: body.sku !== undefined ? body.sku : existing.sku,
        barcode: body.barcode !== undefined ? body.barcode : existing.barcode,
        hsnSac: body.hsn_sac !== undefined ? body.hsn_sac : existing.hsnSac,
        categoryId: body.categoryId !== undefined ? body.categoryId : existing.categoryId,
        salePrice: body.salePrice !== undefined ? Number(body.salePrice) : existing.salePrice,
        purchasePrice: body.purchasePrice !== undefined ? Number(body.purchasePrice) : existing.purchasePrice,
        lowStockThreshold: body.low_stock_threshold !== undefined ? Number(body.low_stock_threshold) : existing.lowStockThreshold,
        description: body.description !== undefined ? body.description : existing.description,
        image: body.image !== undefined ? body.image : existing.image,
      },
    });

    if (body.quantity !== undefined || body.stock !== undefined) {
      const defaultWh = await ensureDefaultWarehouse(tenantId);
      const targetQty = Number(body.quantity !== undefined ? body.quantity : body.stock);
      await prisma.productWarehouse.upsert({
        where: {
          productId_warehouseId: { productId: id, warehouseId: body.warehouseId || defaultWh.id },
        },
        update: { quantity: targetQty },
        create: {
          productId: id,
          warehouseId: body.warehouseId || defaultWh.id,
          quantity: targetQty,
        },
      });
    }

    return res.json(updated);
  } catch (err: any) {
    console.error("Products PUT error:", err);
    return res.status(500).json({ error: err.message || "Failed to update product" });
  }
});

// DELETE /api/products/:id - Soft delete
productsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    await prisma.product.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    });

    return res.json({ success: true, message: "Product deleted" });
  } catch (err: any) {
    console.error("Products DELETE error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete product" });
  }
});

// GET /api/products/categories - Categories list
productsRouter.get("/categories", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    let categories = await prisma.productCategory.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });

    if (categories.length === 0) {
      const defaults = [
        { name: "Electronics & Hardware", color: "#3b82f6" },
        { name: "Software Licenses", color: "#8b5cf6" },
        { name: "Professional Services", color: "#10b981" },
        { name: "Spare Parts & Accessories", color: "#f59e0b" },
      ];
      for (const d of defaults) {
        await prisma.productCategory.create({ data: { tenantId, name: d.name, color: d.color } });
      }
      categories = await prisma.productCategory.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
      });
    }

    return res.json(categories);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/products/warehouses - Warehouses list
productsRouter.get("/warehouses", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    await ensureDefaultWarehouse(tenantId);
    const warehouses = await prisma.warehouse.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
    return res.json(warehouses);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/products/brands - Brands list
productsRouter.get("/brands", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    let brands = await prisma.brand.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });

    if (brands.length === 0) {
      const defaults = [
        { name: "Apple", description: "Consumer Electronics & Tech", image: "/images/no-image.png" },
        { name: "Dell", description: "Enterprise Workstations & Servers", image: "/images/no-image.png" },
        { name: "HP", description: "Laptops, Desktops, & Printers", image: "/images/no-image.png" },
        { name: "Logitech", description: "Peripherals & Video Collaboration", image: "/images/no-image.png" },
        { name: "ZKTeco", description: "Biometric Hardware & Security", image: "/images/no-image.png" },
      ];
      for (const d of defaults) {
        await prisma.brand.create({
          data: { tenantId, name: d.name, description: d.description, image: d.image },
        });
      }
      brands = await prisma.brand.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
    }

    return res.json(
      brands.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description || "",
        image: b.image || "/images/no-image.png",
      }))
    );
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/products/brands - Create brand
productsRouter.post("/brands", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { name, description, image } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Brand name is required" });
    }

    const brand = await prisma.brand.create({
      data: {
        tenantId,
        name: name.trim(),
        description: description || null,
        image: image && image.trim() ? image.trim() : "/images/no-image.png",
      },
    });

    return res.status(201).json(brand);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/brands/:id - Update brand
productsRouter.put("/brands/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;
    const { name, description, image } = req.body;

    const brand = await prisma.brand.updateMany({
      where: { id, tenantId },
      data: {
        name,
        description,
        image: image && image.trim() ? image.trim() : "/images/no-image.png",
      },
    });

    return res.json({ success: true, brand });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/brands/:id - Delete brand
productsRouter.delete("/brands/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    await prisma.brand.deleteMany({
      where: { id, tenantId },
    });

    return res.json({ success: true, message: "Brand deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/products/categories - Create category
productsRouter.post("/categories", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { name, color, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Category name is required" });

    const cat = await prisma.productCategory.create({
      data: {
        tenantId,
        name: name.trim(),
        color: color || "#3b82f6",
        description: description || null,
      },
    });
    return res.status(201).json(cat);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/categories/:id - Delete category
productsRouter.delete("/categories/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;
    await prisma.productCategory.deleteMany({ where: { id, tenantId } });
    return res.json({ success: true, message: "Category deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/products/taxes - List taxes
productsRouter.get("/taxes", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    let taxes = await prisma.taxRate.findMany({
      where: { tenantId },
      orderBy: { rate: "asc" },
    });
    if (taxes.length === 0) {
      const defaults = [
        { name: "Zero Tax (0%)", rate: 0 },
        { name: "GST 5% (Essentials)", rate: 5 },
        { name: "GST 12% (Apparel/Hardware)", rate: 12 },
        { name: "GST 18% (Standard Rate)", rate: 18, isDefault: true },
      ];
      for (const d of defaults) {
        await prisma.taxRate.create({
          data: { tenantId, name: d.name, rate: d.rate, isDefault: !!d.isDefault },
        });
      }
      taxes = await prisma.taxRate.findMany({ where: { tenantId }, orderBy: { rate: "asc" } });
    }
    return res.json(taxes.map(t => ({ id: t.id, name: t.name, rate: Number(t.rate), isDefault: t.isDefault })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/products/taxes - Create tax
productsRouter.post("/taxes", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { name, rate } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Tax name is required" });
    const tax = await prisma.taxRate.create({
      data: {
        tenantId,
        name: name.trim(),
        rate: Number(rate) || 0,
      },
    });
    return res.status(201).json({ id: tax.id, name: tax.name, rate: Number(tax.rate) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/taxes/:id - Delete tax
productsRouter.delete("/taxes/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;
    await prisma.taxRate.deleteMany({ where: { id, tenantId } });
    return res.json({ success: true, message: "Tax rate deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/products/units - List units
productsRouter.get("/units", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    let units = await prisma.unit.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
    if (units.length === 0) {
      const defaults = ["Piece (Pcs)", "Pair (Pr)", "Kilogram (Kg)", "Box (Bx)", "Meter (Mtr)", "Hours (Hr)", "Month (Mo)"];
      for (const d of defaults) {
        await prisma.unit.create({ data: { tenantId, name: d } });
      }
      units = await prisma.unit.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
    }
    return res.json(units.map(u => ({ id: u.id, name: u.name, shortName: u.shortName })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/products/units - Create unit
productsRouter.post("/units", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { name, shortName } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Unit name is required" });
    const unit = await prisma.unit.create({
      data: {
        tenantId,
        name: name.trim(),
        shortName: shortName || null,
      },
    });
    return res.status(201).json(unit);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/units/:id - Delete unit
productsRouter.delete("/units/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;
    await prisma.unit.deleteMany({ where: { id, tenantId } });
    return res.json({ success: true, message: "Unit deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/products/warehouses - Create warehouse
productsRouter.post("/warehouses", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { name, location, city, phone, email } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Warehouse name is required" });
    const wh = await prisma.warehouse.create({
      data: {
        tenantId,
        name: name.trim(),
        location: location || null,
        city: city || null,
        phone: phone || null,
        email: email || null,
      },
    });
    return res.status(201).json(wh);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/products/stock/add - Add stock to warehouse
productsRouter.post("/stock/add", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { productId, warehouseId, quantity } = req.body;
    if (!productId || !warehouseId) return res.status(400).json({ error: "productId and warehouseId are required" });
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: "Valid quantity is required" });

    const whStock = await prisma.productWarehouse.upsert({
      where: { productId_warehouseId: { productId, warehouseId } },
      update: { quantity: { increment: qty } },
      create: { productId, warehouseId, quantity: qty },
    });

    return res.json({ success: true, stock: whStock });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

