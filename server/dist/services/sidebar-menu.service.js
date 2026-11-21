"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarMenuService = void 0;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.rawPrisma || prisma_1.prisma;
class SidebarMenuService {
    static async getConfig(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "sidebar_menu", key: "custom_navigation" },
        });
        if (setting && setting.valueJson?.config) {
            return setting.valueJson.config;
        }
        // Default standard navigation items
        const defaultConfig = {
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
    static async saveConfig(tenantId, config) {
        config.updatedAt = new Date().toISOString();
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "sidebar_menu", key: "custom_navigation" },
        });
        if (existing) {
            await db.setting.update({
                where: { id: existing.id },
                data: { valueJson: { config }, version: { increment: 1 } },
            });
        }
        else {
            await db.setting.create({
                data: {
                    scope: "TENANT",
                    scopeId: tenantId,
                    group: "sidebar_menu",
                    key: "custom_navigation",
                    valueType: "JSON",
                    valueJson: { config },
                    version: 1,
                },
            });
        }
    }
    /**
     * Get filtered navigation menu items based on role
     */
    static async getNavigation(tenantId, userRole) {
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
    static async addCustomMenuItem(tenantId, data) {
        const config = await this.getConfig(tenantId);
        const newItem = {
            id: `menu_${Date.now()}_${crypto_1.default.randomBytes(2).toString("hex")}`,
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
    static async toggleMenuItem(tenantId, itemId, isEnabled) {
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
    static async reorderMenuItems(tenantId, orderedIds) {
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
exports.SidebarMenuService = SidebarMenuService;
