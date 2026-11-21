import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  dietaryBadges: string[]; // e.g. 'Vegan', 'Gluten-Free', 'Halal', 'Chef-Special'
  isAvailable: boolean;
  preparationTimeMinutes?: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  icon?: string;
  items: MenuItem[];
}

export interface RestaurantMenuCatalog {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  currency: string;
  qrPayload: string;
  categories: MenuCategory[];
  updatedAt: string;
}

export class RestaurantMenuService {
  private static async getCatalog(tenantId: string): Promise<RestaurantMenuCatalog> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "restaurant", key: "menu_catalog" },
    });
    if (setting && (setting.valueJson as any)?.catalog) {
      return (setting.valueJson as any).catalog;
    }

    // Default template with standard restaurant categories
    const defaultCatalog: RestaurantMenuCatalog = {
      id: `menu_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
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

  private static async saveCatalog(tenantId: string, catalog: RestaurantMenuCatalog): Promise<void> {
    catalog.updatedAt = new Date().toISOString();
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "restaurant", key: "menu_catalog" },
    });

    if (existing) {
      await db.setting.update({
        where: { id: existing.id },
        data: { valueJson: { catalog } as any, version: { increment: 1 } },
      });
    } else {
      await db.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantId,
          group: "restaurant",
          key: "menu_catalog",
          valueType: "JSON",
          valueJson: { catalog } as any,
          version: 1,
        },
      });
    }
  }

  /**
   * Get restaurant menu catalog
   */
  static async getMenu(tenantId: string): Promise<RestaurantMenuCatalog> {
    return await this.getCatalog(tenantId);
  }

  /**
   * Add a new menu category
   */
  static async addCategory(
    tenantId: string,
    data: { name: string; sortOrder?: number; icon?: string }
  ): Promise<MenuCategory> {
    const catalog = await this.getCatalog(tenantId);
    const newCategory: MenuCategory = {
      id: `cat_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
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
  static async addItem(
    tenantId: string,
    categoryId: string,
    data: {
      name: string;
      description?: string;
      price: number;
      dietaryBadges?: string[];
      isAvailable?: boolean;
      preparationTimeMinutes?: number;
    }
  ): Promise<MenuItem> {
    const catalog = await this.getCatalog(tenantId);
    const category = catalog.categories.find((c) => c.id === categoryId);
    if (!category) {
      throw new Error("Menu category not found.");
    }

    const newItem: MenuItem = {
      id: `item_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
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
  static async toggleAvailability(tenantId: string, itemId: string, isAvailable: boolean): Promise<MenuItem> {
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
  static async generateQrPayload(tenantId: string, customDomain?: string): Promise<{ qrPayload: string; totalItems: number }> {
    const catalog = await this.getCatalog(tenantId);
    const domain = customDomain || "app.masterhrms.com";
    const qrPayload = `https://${domain}/menu/qr/${tenantId}`;
    catalog.qrPayload = qrPayload;
    await this.saveCatalog(tenantId, catalog);

    const totalItems = catalog.categories.reduce((acc, c) => acc + c.items.length, 0);
    return { qrPayload, totalItems };
  }
}
