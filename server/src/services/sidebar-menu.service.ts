import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export interface SidebarMenuItem {
  id: string;
  title: string;
  path: string;
  icon?: string;
  roles: string[]; // Allowed roles e.g. ['admin', 'manager', 'employee']
  sortOrder: number;
  isEnabled: boolean;
  isCustom: boolean;
}

export interface SidebarConfig {
  tenantId: string;
  items: SidebarMenuItem[];
  updatedAt: string;
}

export class SidebarMenuService {
  private static async getConfig(tenantId: string): Promise<SidebarConfig> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "sidebar_menu", key: "custom_navigation" },
    });
    if (setting && (setting.valueJson as any)?.config) {
      return (setting.valueJson as any).config;
    }

    // Default standard navigation items
    const defaultConfig: SidebarConfig = {
      tenantId,
      items: [
        { id: "nav-dash", title: "Dashboard", path: "/dashboard", icon: "LayoutDashboard", roles: ["admin", "manager", "employee"], sortOrder: 1, isEnabled: true, isCustom: false },
        { id: "nav-emp", title: "Employees", path: "/employees", icon: "Users", roles: ["admin", "manager"], sortOrder: 2, isEnabled: true, isCustom: false },
        { id: "nav-att", title: "Attendance", path: "/attendance", icon: "Clock", roles: ["admin", "manager", "employee"], sortOrder: 3, isEnabled: true, isCustom: false },
        { id: "nav-pay", title: "Payroll", path: "/payroll", icon: "CreditCard", roles: ["admin"], sortOrder: 4, isEnabled: true, isCustom: false },
        { id: "nav-strat", title: "Strategy Studio", path: "/strategy", icon: "Target", roles: ["admin", "manager"], sortOrder: 5, isEnabled: true, isCustom: false },
      ],
      updatedAt: new Date().toISOString(),
    };

    return defaultConfig;
  }

  private static async saveConfig(tenantId: string, config: SidebarConfig): Promise<void> {
    config.updatedAt = new Date().toISOString();
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "sidebar_menu", key: "custom_navigation" },
    });

    if (existing) {
      await db.setting.update({
        where: { id: existing.id },
        data: { valueJson: { config } as any, version: { increment: 1 } },
      });
    } else {
      await db.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantId,
          group: "sidebar_menu",
          key: "custom_navigation",
          valueType: "JSON",
          valueJson: { config } as any,
          version: 1,
        },
      });
    }
  }

  /**
   * Get filtered navigation menu items based on role
   */
  static async getNavigation(tenantId: string, userRole?: string): Promise<SidebarMenuItem[]> {
    const config = await this.getConfig(tenantId);
    let items = config.items.filter((item) => item.isEnabled);

    if (userRole) {
      items = items.filter((item) => item.roles.includes(userRole));
    }

    return items.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Add custom sidebar menu link
   */
  static async addCustomMenuItem(
    tenantId: string,
    data: {
      title: string;
      path: string;
      icon?: string;
      roles?: string[];
      sortOrder?: number;
    }
  ): Promise<SidebarMenuItem> {
    const config = await this.getConfig(tenantId);
    const newItem: SidebarMenuItem = {
      id: `menu_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
      title: data.title,
      path: data.path,
      icon: data.icon || "Link",
      roles: data.roles || ["admin", "manager", "employee"],
      sortOrder: data.sortOrder || config.items.length + 1,
      isEnabled: true,
      isCustom: true,
    };

    config.items.push(newItem);
    await this.saveConfig(tenantId, config);
    return newItem;
  }

  /**
   * Toggle menu item visibility
   */
  static async toggleMenuItem(tenantId: string, itemId: string, isEnabled: boolean): Promise<SidebarMenuItem> {
    const config = await this.getConfig(tenantId);
    const item = config.items.find((i) => i.id === itemId);
    if (!item) {
      throw new Error("Sidebar menu item not found.");
    }

    item.isEnabled = isEnabled;
    await this.saveConfig(tenantId, config);
    return item;
  }

  /**
   * Reorder menu items
   */
  static async reorderMenuItems(tenantId: string, orderedIds: string[]): Promise<SidebarMenuItem[]> {
    const config = await this.getConfig(tenantId);
    orderedIds.forEach((id, index) => {
      const item = config.items.find((i) => i.id === id);
      if (item) {
        item.sortOrder = index + 1;
      }
    });

    config.items.sort((a, b) => a.sortOrder - b.sortOrder);
    await this.saveConfig(tenantId, config);
    return config.items;
  }
}
