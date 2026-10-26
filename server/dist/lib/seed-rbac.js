"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRbac = seedRbac;
const prisma_1 = require("../prisma");
const erp_modules_1 = require("./erp-modules");
async function seedRbac() {
    console.log("==> Starting RBAC Seeding...");
    // 1. Seed Permissions Catalog
    const permissionDefs = (0, erp_modules_1.getAllPermissionDefinitions)();
    console.log("==> Seeding " + permissionDefs.length + " permissions...");
    for (const def of permissionDefs) {
        await prisma_1.rawPrisma.permission.upsert({
            where: { code: def.code },
            update: {
                name: def.name,
                module: def.module,
                resource: def.resource,
                action: def.action,
                description: def.description,
            },
            create: {
                code: def.code,
                name: def.name,
                module: def.module,
                resource: def.resource,
                action: def.action,
                description: def.description,
            },
        });
    }
    // 2. Fetch all DB permissions
    const allDbPerms = await prisma_1.rawPrisma.permission.findMany();
    const permMap = new Map();
    for (const p of allDbPerms) {
        permMap.set(p.code, p.id);
    }
    // 3. Find Tenants
    const tenants = await prisma_1.rawPrisma.tenant.findMany();
    if (tenants.length === 0) {
        console.log("No tenants found in DB.");
        return;
    }
    for (const tenant of tenants) {
        console.log("==> Configuring Tenant: " + tenant.name + " (" + tenant.id + ")");
        // 3a. Enable all 9 modules
        for (const mod of erp_modules_1.ERP_MODULES) {
            await prisma_1.rawPrisma.tenantModule.upsert({
                where: {
                    tenantId_moduleKey: {
                        tenantId: tenant.id,
                        moduleKey: mod.key,
                    },
                },
                update: { isEnabled: true },
                create: {
                    tenantId: tenant.id,
                    moduleKey: mod.key,
                    isEnabled: true,
                },
            });
        }
        async function setupRole(name, description, permCodes, isSystem = false) {
            const role = await prisma_1.rawPrisma.workspaceRole.upsert({
                where: {
                    tenantId_name: {
                        tenantId: tenant.id,
                        name,
                    },
                },
                update: {
                    description,
                    isActive: true,
                },
                create: {
                    tenantId: tenant.id,
                    name,
                    description,
                    isActive: true,
                    isSystem,
                },
            });
            await prisma_1.rawPrisma.rolePermission.deleteMany({
                where: { roleId: role.id },
            });
            const validPermIds = [];
            for (const code of permCodes) {
                const id = permMap.get(code);
                if (id)
                    validPermIds.push(id);
            }
            if (validPermIds.length > 0) {
                await prisma_1.rawPrisma.rolePermission.createMany({
                    data: validPermIds.map((pId) => ({
                        roleId: role.id,
                        permissionId: pId,
                    })),
                });
            }
            return role;
        }
        // 1. Workspace Admin -> All permissions
        const adminRole = await setupRole("Workspace Admin", "Full administrative access to all workspace ERP modules, settings, users, and roles", allDbPerms.map((p) => p.code), true);
        // 2. HR Manager
        const hrPerms = allDbPerms.filter((p) => p.module === "hrm").map((p) => p.code);
        hrPerms.push("analytics.dashboard.view", "analytics.reports.view");
        const hrRole = await setupRole("HR Manager", "Full access to Human Resources, Employees, Attendance, Leaves and Payroll", hrPerms);
        // 3. Sales Manager (Section 24 specification)
        const salesPerms = [
            "inventory.dashboard.view",
            "crm.dashboard.view",
            "project.dashboard.view",
            "support.dashboard.view",
            "analytics.dashboard.view",
            "crm.leads.view",
            "crm.leads.create",
            "crm.leads.edit",
            "crm.leads.export",
            "crm.customers.view",
            "crm.customers.create",
            "crm.customers.edit",
            "crm.quotations.view",
            "crm.quotations.create",
            "crm.quotations.edit",
            "crm.quotations.approve",
            "crm.quotations.export",
            "crm.deals.view",
            "crm.deals.create",
            "crm.deals.edit",
            "inventory.products.view",
            "inventory.stock.view",
            "project.projects.view",
            "project.tasks.view",
            "project.tasks.create",
            "project.tasks.edit",
            "support.tickets.view",
            "support.tickets.create",
            "support.tickets.edit",
            "analytics.reports.view",
            "analytics.metrics.view",
        ];
        await setupRole("Sales Manager", "Access to Sales CRM, Deals, Proposals, Inventory, Projects and Customer Support", salesPerms);
        // 4. Finance Manager
        const financePerms = allDbPerms.filter((p) => p.module === "finance").map((p) => p.code);
        financePerms.push("crm.quotations.approve", "analytics.dashboard.view", "procurement.purchase_orders.view");
        await setupRole("Finance Manager", "Access to Invoicing, Expenses, Accounts, ledgers and payment approvals", financePerms);
        // 5. Inventory Manager
        const invPerms = allDbPerms.filter((p) => p.module === "inventory").map((p) => p.code);
        invPerms.push("pos.terminal.view", "procurement.purchase_orders.view", "analytics.dashboard.view");
        await setupRole("Inventory Manager", "Access to Catalog, Warehouses, Stock Adjustments and Purchase tracking", invPerms);
        // 6. Employee
        const empPerms = [
            "hrm.dashboard.view",
            "hrm.attendance.view",
            "hrm.attendance.create",
            "hrm.leave.view",
            "hrm.leave.create",
            "project.tasks.view",
            "support.tickets.view",
            "support.tickets.create",
        ];
        const employeeRole = await setupRole("Employee", "Standard workspace employee with self-service attendance, leave submission, and assigned tasks", empPerms);
        // 3c. Assign roles to users
        const profiles = await prisma_1.rawPrisma.profile.findMany({
            where: { tenantId: tenant.id },
            include: {
                user: {
                    include: { roles: true },
                },
            },
        });
        for (const prof of profiles) {
            const isUserAdmin = prof.email === "gowthamtooquik@gmail.com" ||
                prof.user.email === "gowthamtooquik@gmail.com" ||
                prof.fullName?.toLowerCase().includes("tenant administrator") ||
                prof.fullName?.toLowerCase().includes("tenant admin") ||
                prof.user.roles.some((r) => r.role === "admin" ||
                    r.role === "workspace_admin" ||
                    r.role === "tenant_admin" ||
                    r.role === "super_admin");
            const isHrUser = !isUserAdmin &&
                (prof.email === "hr@masterhrms.com" ||
                    prof.user.email === "hr@masterhrms.com" ||
                    prof.user.roles.some((r) => r.role === "hr_admin"));
            const targetRoleId = isUserAdmin
                ? adminRole.id
                : isHrUser
                    ? (hrRole ? hrRole.id : employeeRole.id)
                    : employeeRole.id;
            const existingAssign = await prisma_1.rawPrisma.userRoleAssignment.findUnique({
                where: {
                    userId_tenantId: {
                        userId: prof.userId,
                        tenantId: tenant.id,
                    },
                },
            });
            if (!existingAssign) {
                await prisma_1.rawPrisma.userRoleAssignment.create({
                    data: {
                        userId: prof.userId,
                        tenantId: tenant.id,
                        roleId: targetRoleId,
                    },
                });
                console.log("   Assigned role " + (isUserAdmin ? "Workspace Admin" : isHrUser ? "HR Manager" : "Employee") + " to user " + (prof.email || prof.userId));
            }
            else if (isUserAdmin && existingAssign.roleId !== adminRole.id) {
                await prisma_1.rawPrisma.userRoleAssignment.update({
                    where: { id: existingAssign.id },
                    data: { roleId: adminRole.id },
                });
                console.log("   Updated role to Workspace Admin for user " + (prof.email || prof.userId));
            }
        }
    }
    console.log("==> RBAC Seeding Completed Successfully!");
}
if (require.main === module) {
    seedRbac()
        .catch((err) => {
        console.error("RBAC Seeding Failed:", err);
        process.exit(1);
    })
        .finally(async () => {
        await prisma_1.rawPrisma.$disconnect();
    });
}
