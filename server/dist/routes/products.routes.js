"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_1 = require("../lib/tenant");
const pagination_1 = require("../lib/pagination");
const inventory_movement_service_1 = require("../services/inventory-movement.service");
const inventory_movement_types_1 = require("../services/inventory-movement.types");
const limits_1 = require("../middleware/limits");
const entitlements_1 = require("../middleware/entitlements");
const audit_service_1 = require("../services/audit.service");
const outbox_service_1 = require("../services/outbox.service");
exports.productsRouter = (0, express_1.Router)();
// Enforce Request-Scoped Tenant Context and Product POS Entitlement on all product catalog & inventory endpoints
exports.productsRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, entitlements_1.requireEntitlement)("product_pos"));
// Helper to ensure default warehouse exists
async function ensureDefaultWarehouse(tenantId) {
    let wh = await prisma_1.prisma.warehouse.findFirst({
        where: { tenantId, isDefault: true },
    });
    if (!wh) {
        wh = await prisma_1.prisma.warehouse.create({
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
exports.productsRouter.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 50);
        const { categoryId, brandId, warehouseId, type } = req.query;
        const where = { tenantId, isActive: true };
        if (pagination.search) {
            where.OR = [
                { name: { contains: pagination.search } },
                { sku: { contains: pagination.search } },
                { barcode: { contains: pagination.search } },
            ];
        }
        if (categoryId && categoryId !== "all")
            where.categoryId = String(categoryId);
        if (brandId && brandId !== "all")
            where.brandId = String(brandId);
        if (type && type !== "all")
            where.type = String(type);
        if (warehouseId && warehouseId !== "all") {
            where.warehouseStocks = { some: { warehouseId: String(warehouseId) } };
        }
        const sortField = ["name", "createdAt", "updatedAt", "salePrice"].includes(pagination.sortField)
            ? pagination.sortField
            : "createdAt";
        const [total, products] = await Promise.all([
            prisma_1.prisma.product.count({ where }),
            prisma_1.prisma.product.findMany({
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
            const totalStock = p.warehouseStocks.reduce((sum, ws) => sum + Number(ws.quantity), 0);
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
            return res.json((0, pagination_1.formatPaginatedResponse)(formatted, total, pagination));
        }
        res.setHeader("X-Total-Count", String(total));
        return res.json(formatted);
    }
    catch (err) {
        console.error("Products GET error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch products" });
    }
});
// POST /api/products - Create a new product
exports.productsRouter.post("/", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const body = req.body;
        if (!body.name || !body.name.trim()) {
            return res.status(400).json({ error: "Product name is required" });
        }
        const defaultWh = await ensureDefaultWarehouse(tenantId);
        const sku = body.sku ? body.sku.trim() : "SKU-" + Date.now().toString().slice(-6);
        let categoryId = body.categoryId || null;
        if (!categoryId && body.categoryName) {
            const cat = await prisma_1.prisma.productCategory.findFirst({
                where: { tenantId, name: body.categoryName },
            });
            categoryId = cat
                ? cat.id
                : (await prisma_1.prisma.productCategory.create({ data: { tenantId, name: body.categoryName } })).id;
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
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
            if (initialQty > 0) {
                await inventory_movement_service_1.InventoryMovementService.increaseStock({
                    tenantId,
                    productId: product.id,
                    warehouseId: body.warehouseId || defaultWh.id,
                    quantity: initialQty,
                    movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.OPENING_STOCK,
                    referenceType: "PRODUCT",
                    referenceId: product.id,
                    createdById: req.user?.userId || req.user?.id,
                    notes: "Initial opening stock upon product creation",
                    tx,
                });
            }
            else {
                await tx.productWarehouse.create({
                    data: {
                        productId: product.id,
                        warehouseId: body.warehouseId || defaultWh.id,
                        quantity: 0,
                    },
                });
            }
            return product;
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "pos.product.created",
            entityType: "Product",
            entityId: result.id,
            newState: { name: result.name, sku: result.sku, salePrice: Number(result.salePrice) },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId,
            eventType: "pos.product.created",
            entityType: "product",
            entityId: result.id,
            actorId: req.user?.userId || req.user?.id,
            payload: { name: result.name, sku: result.sku, salePrice: Number(result.salePrice) },
        }).catch(() => { });
        return res.status(201).json(result);
    }
    catch (err) {
        console.error("Products POST error:", err);
        return res.status(500).json({ error: err.message || "Failed to create product" });
    }
});
// PUT /api/products/:id - Update product (metadata, pricing, tax, category - stock updates cannot be overwritten directly)
exports.productsRouter.put("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const body = req.body;
        const existing = await prisma_1.prisma.product.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: "Product not found" });
        }
        const updated = await prisma_1.prisma.product.update({
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
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "pos.product.updated",
            entityType: "Product",
            entityId: id,
            oldState: { name: existing.name, salePrice: Number(existing.salePrice), sku: existing.sku },
            newState: { name: updated.name, salePrice: Number(updated.salePrice), sku: updated.sku },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId,
            eventType: "pos.product.updated",
            entityType: "product",
            entityId: id,
            actorId: req.user?.userId || req.user?.id,
            payload: { name: updated.name, sku: updated.sku, salePrice: Number(updated.salePrice) },
        }).catch(() => { });
        return res.json(updated);
    }
    catch (err) {
        console.error("Products PUT error:", err);
        return res.status(500).json({ error: err.message || "Failed to update product" });
    }
});
// DELETE /api/products/:id - Soft delete
exports.productsRouter.delete("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const existing = await prisma_1.prisma.product.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: "Product not found" });
        }
        await prisma_1.prisma.product.updateMany({
            where: { id, tenantId },
            data: { isActive: false },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "pos.product.deleted",
            entityType: "Product",
            entityId: id,
            oldState: { name: existing.name, sku: existing.sku },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId,
            eventType: "pos.product.deleted",
            entityType: "product",
            entityId: id,
            actorId: req.user?.userId || req.user?.id,
            payload: { name: existing.name, sku: existing.sku },
        }).catch(() => { });
        return res.json({ success: true, message: "Product deleted" });
    }
    catch (err) {
        console.error("Products DELETE error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete product" });
    }
});
// GET /api/products/categories - Categories list
exports.productsRouter.get("/categories", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        let categories = await prisma_1.prisma.productCategory.findMany({
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
                await prisma_1.prisma.productCategory.create({ data: { tenantId, name: d.name, color: d.color } });
            }
            categories = await prisma_1.prisma.productCategory.findMany({
                where: { tenantId },
                orderBy: { name: "asc" },
            });
        }
        return res.json(categories);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/products/warehouses - Warehouses list
exports.productsRouter.get("/warehouses", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        await ensureDefaultWarehouse(tenantId);
        const warehouses = await prisma_1.prisma.warehouse.findMany({
            where: { tenantId },
            orderBy: { name: "asc" },
        });
        return res.json(warehouses);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/products/brands - Brands list
exports.productsRouter.get("/brands", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        let brands = await prisma_1.prisma.brand.findMany({
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
                await prisma_1.prisma.brand.create({
                    data: { tenantId, name: d.name, description: d.description, image: d.image },
                });
            }
            brands = await prisma_1.prisma.brand.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
        }
        return res.json(brands.map((b) => ({
            id: b.id,
            name: b.name,
            description: b.description || "",
            image: b.image || "/images/no-image.png",
        })));
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/products/brands - Create brand
exports.productsRouter.post("/brands", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { name, description, image } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Brand name is required" });
        }
        const brand = await prisma_1.prisma.brand.create({
            data: {
                tenantId,
                name: name.trim(),
                description: description || null,
                image: image && image.trim() ? image.trim() : "/images/no-image.png",
            },
        });
        return res.status(201).json(brand);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// PUT /api/products/brands/:id - Update brand
exports.productsRouter.put("/brands/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const { name, description, image } = req.body;
        const brand = await prisma_1.prisma.brand.updateMany({
            where: { id, tenantId },
            data: {
                name,
                description,
                image: image && image.trim() ? image.trim() : "/images/no-image.png",
            },
        });
        return res.json({ success: true, brand });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// DELETE /api/products/brands/:id - Delete brand
exports.productsRouter.delete("/brands/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        await prisma_1.prisma.brand.deleteMany({
            where: { id, tenantId },
        });
        return res.json({ success: true, message: "Brand deleted" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/products/categories - Create category
exports.productsRouter.post("/categories", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { name, color, description } = req.body;
        if (!name || !name.trim())
            return res.status(400).json({ error: "Category name is required" });
        const cat = await prisma_1.prisma.productCategory.create({
            data: {
                tenantId,
                name: name.trim(),
                color: color || "#3b82f6",
                description: description || null,
            },
        });
        return res.status(201).json(cat);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// DELETE /api/products/categories/:id - Delete category
exports.productsRouter.delete("/categories/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const existing = await prisma_1.prisma.productCategory.findFirst({
            where: { id, tenantId },
            include: { products: { select: { id: true } } },
        });
        if (!existing) {
            return res.status(404).json({ error: "Category not found" });
        }
        if (existing.products && existing.products.length > 0) {
            return res.status(400).json({
                error: `Cannot delete category with ${existing.products.length} associated products. Reassign or delete products first.`,
            });
        }
        await prisma_1.prisma.productCategory.delete({ where: { id } });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "pos.category.deleted",
            entityType: "ProductCategory",
            entityId: id,
            oldState: { name: existing.name },
        }).catch(() => { });
        return res.json({ success: true, message: "Category deleted" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// PUT /api/products/categories/:id - Update category
exports.productsRouter.put("/categories/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const { name, color, description } = req.body;
        const existing = await prisma_1.prisma.productCategory.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Category not found" });
        const updated = await prisma_1.prisma.productCategory.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(color && { color }),
                ...(description !== undefined && { description }),
            },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "pos.category.updated",
            entityType: "ProductCategory",
            entityId: id,
            oldState: { name: existing.name },
            newState: { name: updated.name },
        }).catch(() => { });
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/products/taxes - List taxes
exports.productsRouter.get("/taxes", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        let taxes = await prisma_1.prisma.taxRate.findMany({
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
                await prisma_1.prisma.taxRate.create({
                    data: { tenantId, name: d.name, rate: d.rate, isDefault: !!d.isDefault },
                });
            }
            taxes = await prisma_1.prisma.taxRate.findMany({ where: { tenantId }, orderBy: { rate: "asc" } });
        }
        return res.json(taxes.map(t => ({ id: t.id, name: t.name, rate: Number(t.rate), isDefault: t.isDefault })));
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/products/taxes - Create tax
exports.productsRouter.post("/taxes", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { name, rate } = req.body;
        if (!name || !name.trim())
            return res.status(400).json({ error: "Tax name is required" });
        const tax = await prisma_1.prisma.taxRate.create({
            data: {
                tenantId,
                name: name.trim(),
                rate: Number(rate) || 0,
            },
        });
        return res.status(201).json({ id: tax.id, name: tax.name, rate: Number(tax.rate) });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// DELETE /api/products/taxes/:id - Delete tax
exports.productsRouter.delete("/taxes/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        await prisma_1.prisma.taxRate.deleteMany({ where: { id, tenantId } });
        return res.json({ success: true, message: "Tax rate deleted" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// PUT /api/products/taxes/:id - Update tax
exports.productsRouter.put("/taxes/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const { name, rate, isDefault } = req.body;
        const existing = await prisma_1.prisma.taxRate.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Tax rate not found" });
        if (isDefault) {
            await prisma_1.prisma.taxRate.updateMany({
                where: { tenantId, id: { not: id } },
                data: { isDefault: false },
            });
        }
        const updated = await prisma_1.prisma.taxRate.update({
            where: { id },
            data: {
                ...(name !== undefined ? { name: name.trim() } : {}),
                ...(rate !== undefined ? { rate: Number(rate) || 0 } : {}),
                ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
            },
        });
        return res.json({ id: updated.id, name: updated.name, rate: Number(updated.rate), isDefault: updated.isDefault });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/products/units - List units
exports.productsRouter.get("/units", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        let units = await prisma_1.prisma.unit.findMany({
            where: { tenantId },
            orderBy: { name: "asc" },
        });
        if (units.length === 0) {
            const defaults = ["Piece (Pcs)", "Pair (Pr)", "Kilogram (Kg)", "Box (Bx)", "Meter (Mtr)", "Hours (Hr)", "Month (Mo)"];
            for (const d of defaults) {
                await prisma_1.prisma.unit.create({ data: { tenantId, name: d } });
            }
            units = await prisma_1.prisma.unit.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
        }
        return res.json(units.map(u => ({ id: u.id, name: u.name, shortName: u.shortName })));
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/products/units - Create unit
exports.productsRouter.post("/units", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { name, shortName } = req.body;
        if (!name || !name.trim())
            return res.status(400).json({ error: "Unit name is required" });
        const unit = await prisma_1.prisma.unit.create({
            data: {
                tenantId,
                name: name.trim(),
                shortName: shortName || null,
            },
        });
        return res.status(201).json(unit);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// DELETE /api/products/units/:id - Delete unit
exports.productsRouter.delete("/units/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const existing = await prisma_1.prisma.unit.findFirst({
            where: { id, tenantId },
            include: { products: { select: { id: true } } },
        });
        if (!existing) {
            return res.status(404).json({ error: "Unit not found" });
        }
        if (existing.products && existing.products.length > 0) {
            return res.status(400).json({
                error: `Cannot delete unit with ${existing.products.length} associated products. Reassign or delete products first.`,
            });
        }
        await prisma_1.prisma.unit.delete({ where: { id } });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "pos.unit.deleted",
            entityType: "Unit",
            entityId: id,
            oldState: { name: existing.name },
        }).catch(() => { });
        return res.json({ success: true, message: "Unit deleted" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// PUT /api/products/units/:id - Update unit
exports.productsRouter.put("/units/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const { name, shortName } = req.body;
        const existing = await prisma_1.prisma.unit.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Unit not found" });
        const updated = await prisma_1.prisma.unit.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(shortName !== undefined && { shortName: shortName || null }),
            },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "pos.unit.updated",
            entityType: "Unit",
            entityId: id,
            oldState: { name: existing.name },
            newState: { name: updated.name },
        }).catch(() => { });
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/products/warehouses - Create warehouse
exports.productsRouter.post("/warehouses", auth_1.requireAuth, (0, limits_1.requireWithinLimit)("warehouses"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { name, location, city, phone, email } = req.body;
        if (!name || !name.trim())
            return res.status(400).json({ error: "Warehouse name is required" });
        const wh = await prisma_1.prisma.warehouse.create({
            data: {
                tenantId,
                name: name.trim(),
                location: location || null,
                city: city || null,
                phone: phone || null,
                email: email || null,
            },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "pos.warehouse.created",
            entityType: "Warehouse",
            entityId: wh.id,
            newState: { name: wh.name, location: wh.location },
        }).catch(() => { });
        return res.status(201).json(wh);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/products/warehouses/:id - Get single warehouse
exports.productsRouter.get("/warehouses/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const wh = await prisma_1.prisma.warehouse.findFirst({
            where: { id, tenantId },
            include: {
                stocks: {
                    include: { product: true },
                },
            },
        });
        if (!wh) {
            return res.status(404).json({ error: "Warehouse not found" });
        }
        return res.json(wh);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// PUT /api/products/warehouses/:id - Update warehouse
exports.productsRouter.put("/warehouses/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const { name, location, city, phone, email, isDefault } = req.body;
        const existing = await prisma_1.prisma.warehouse.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: "Warehouse not found" });
        }
        if (isDefault) {
            await prisma_1.prisma.warehouse.updateMany({
                where: { tenantId, id: { not: id } },
                data: { isDefault: false },
            });
        }
        const updated = await prisma_1.prisma.warehouse.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(location !== undefined && { location: location || null }),
                ...(city !== undefined && { city: city || null }),
                ...(phone !== undefined && { phone: phone || null }),
                ...(email !== undefined && { email: email || null }),
                ...(isDefault !== undefined && { isDefault: Boolean(isDefault) }),
            },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "pos.warehouse.updated",
            entityType: "Warehouse",
            entityId: id,
            oldState: { name: existing.name },
            newState: { name: updated.name },
        }).catch(() => { });
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// DELETE /api/products/warehouses/:id - Delete warehouse
exports.productsRouter.delete("/warehouses/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const existing = await prisma_1.prisma.warehouse.findFirst({
            where: { id, tenantId },
            include: {
                stocks: true,
            },
        });
        if (!existing) {
            return res.status(404).json({ error: "Warehouse not found" });
        }
        if (existing.isDefault) {
            return res.status(400).json({ error: "Cannot delete the default warehouse" });
        }
        const totalStock = existing.stocks.reduce((sum, s) => sum + Number(s.quantity), 0);
        if (totalStock > 0) {
            return res.status(400).json({
                error: `Cannot delete warehouse with positive stock inventory (${totalStock} units). Transfer or adjust stock first.`,
            });
        }
        await prisma_1.prisma.warehouse.delete({ where: { id } });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "pos.warehouse.deleted",
            entityType: "Warehouse",
            entityId: id,
            oldState: { name: existing.name },
        }).catch(() => { });
        return res.json({ success: true, message: "Warehouse deleted successfully" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/products/stock/add - Add stock to warehouse
exports.productsRouter.post("/stock/add", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { productId, warehouseId, quantity } = req.body;
        if (!productId || !warehouseId)
            return res.status(400).json({ error: "productId and warehouseId are required" });
        const movementResult = await inventory_movement_service_1.InventoryMovementService.increaseStock({
            tenantId,
            productId,
            warehouseId,
            quantity,
            movementType: inventory_movement_types_1.STOCK_MOVEMENT_TYPES.OPENING_STOCK,
            referenceType: "MANUAL_ADD",
            createdById: req.user?.userId || req.user?.id,
            notes: "Manual stock addition via products API",
        });
        const whStock = await prisma_1.prisma.productWarehouse.findUnique({
            where: { productId_warehouseId: { productId, warehouseId } },
        });
        return res.json({ success: true, stock: whStock, movement: movementResult });
    }
    catch (err) {
        if (err.name === "InventoryDomainError" || err.statusCode) {
            return res.status(err.statusCode || 400).json({ error: err.message, code: err.code });
        }
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/products/:id/movements - Paginated stock movement ledger for a product
exports.productsRouter.get("/:id/movements", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const product = await prisma_1.prisma.product.findFirst({ where: { id, tenantId } });
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 30);
        const warehouseId = req.query.warehouseId;
        const where = { tenantId, productId: id };
        if (warehouseId && warehouseId !== "all") {
            where.warehouseId = warehouseId;
        }
        const [total, movements] = await Promise.all([
            prisma_1.prisma.stockMovement.count({ where }),
            prisma_1.prisma.stockMovement.findMany({
                where,
                include: {
                    warehouse: { select: { id: true, name: true, location: true } },
                },
                orderBy: { createdAt: "desc" },
                ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
            }),
        ]);
        if (pagination.isPaginated) {
            return res.json((0, pagination_1.formatPaginatedResponse)(movements, total, pagination));
        }
        return res.json({ data: movements, total });
    }
    catch (err) {
        console.error("GET /api/products/:id/movements error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch stock movements" });
    }
});
// GET /api/products/:id - Single product details
exports.productsRouter.get("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const p = await prisma_1.prisma.product.findFirst({
            where: { id, tenantId },
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
        });
        if (!p) {
            return res.status(404).json({ error: "Product not found" });
        }
        const totalStock = p.warehouseStocks.reduce((sum, ws) => sum + Number(ws.quantity), 0);
        return res.json({
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
            updatedAt: p.updatedAt.toISOString(),
            isActive: p.isActive,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch product" });
    }
});
