"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestaurantMenuService = void 0;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.rawPrisma || prisma_1.prisma;
class RestaurantMenuService {
    static async getCatalog(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "restaurant", key: "menu_catalog" },
        });
        if (setting && setting.valueJson?.catalog) {
            return setting.valueJson.catalog;
        }
        // Default template with standard restaurant categories
        const defaultCatalog = {
            id: `menu_${Date.now()}_${crypto_1.default.randomBytes(3).toString("hex")}`,
            tenantId,
            title: "Main Restaurant & Dining Menu",
            description: "Artisanal food and beverage offerings",
            currency: "USD",
            qrPayload: `https://app.masterhrms.com/menu/${tenantId}`,
            categories: [
                { id: "cat-starters", name: "Starters & Appetizers", sortOrder: 1, items: [] },
                { id: "cat-mains", name: "Main Courses", sortOrder: 2, items: [] },
                { id: "cat-desserts", name: "Desserts", sortOrder: 3, items: [] },
                { id: "cat-beverages", name: "Beverages & Drinks", sortOrder: 4, items: [] },
            ],
            updatedAt: new Date().toISOString(),
        };
        return defaultCatalog;
    }
    static async saveCatalog(tenantId, catalog) {
        catalog.updatedAt = new Date().toISOString();
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "restaurant", key: "menu_catalog" },
        });
        if (existing) {
            await db.setting.update({
                where: { id: existing.id },
                data: { valueJson: { catalog }, version: { increment: 1 } },
            });
        }
        else {
            await db.setting.create({
                data: {
                    scope: "TENANT",
                    scopeId: tenantId,
                    group: "restaurant",
                    key: "menu_catalog",
                    valueType: "JSON",
                    valueJson: { catalog },
                    version: 1,
                },
            });
        }
    }
    /**
     * Get restaurant menu catalog
     */
    static async getMenu(tenantId) {
        return await this.getCatalog(tenantId);
    }
    /**
     * Add a new menu category
     */
    static async addCategory(tenantId, data) {
        const catalog = await this.getCatalog(tenantId);
        const newCategory = {
            id: `cat_${Date.now()}_${crypto_1.default.randomBytes(2).toString("hex")}`,
            name: data.name,
            sortOrder: data.sortOrder || catalog.categories.length + 1,
            icon: data.icon,
            items: [],
        };
        catalog.categories.push(newCategory);
        catalog.categories.sort((a, b) => a.sortOrder - b.sortOrder);
        await this.saveCatalog(tenantId, catalog);
        return newCategory;
    }
    /**
     * Add an item to a menu category
     */
    static async addItem(tenantId, categoryId, data) {
        const catalog = await this.getCatalog(tenantId);
        const category = catalog.categories.find((c) => c.id === categoryId);
        if (!category) {
            throw new Error("Menu category not found.");
        }
        const newItem = {
            id: `item_${Date.now()}_${crypto_1.default.randomBytes(2).toString("hex")}`,
            categoryId,
            name: data.name,
            description: data.description,
            price: data.price,
            dietaryBadges: data.dietaryBadges || [],
            isAvailable: data.isAvailable ?? true,
            preparationTimeMinutes: data.preparationTimeMinutes || 15,
        };
        category.items.push(newItem);
        await this.saveCatalog(tenantId, catalog);
        return newItem;
    }
    /**
     * Toggle item availability
     */
    static async toggleAvailability(tenantId, itemId, isAvailable) {
        const catalog = await this.getCatalog(tenantId);
        for (const cat of catalog.categories) {
            const item = cat.items.find((i) => i.id === itemId);
            if (item) {
                item.isAvailable = isAvailable;
                await this.saveCatalog(tenantId, catalog);
                return item;
            }
        }
        throw new Error("Menu item not found.");
    }
    /**
     * Generate digital QR menu payload
     */
    static async generateQrPayload(tenantId, customDomain) {
        const catalog = await this.getCatalog(tenantId);
        const domain = customDomain || "app.masterhrms.com";
        const qrPayload = `https://${domain}/menu/qr/${tenantId}`;
        catalog.qrPayload = qrPayload;
        await this.saveCatalog(tenantId, catalog);
        const totalItems = catalog.categories.reduce((acc, c) => acc + c.items.length, 0);
        return { qrPayload, totalItems };
    }
}
exports.RestaurantMenuService = RestaurantMenuService;
