import { prisma, rawPrisma } from "../prisma";
import crypto from "crypto";
import { OutboxService } from "../services/outbox.service";

export interface ProvisionTenantInput {
  name: string;
  slug?: string;
  currency?: string;
  timezone?: string;
  adminEmail: string;
  adminFullName?: string;
  userId: string;
}

// 17 Standard Core Accounts for initial chart of accounts setup
const STANDARD_ACCOUNTS = [
  { code: "1010", name: "Cash on Hand", type: "asset", category: "current_asset" },
  { code: "1020", name: "Primary Operating Bank Account", type: "asset", category: "current_asset" },
  { code: "1030", name: "Accounts Receivable (Sundry Debtors)", type: "asset", category: "current_asset" },
  { code: "1040", name: "Merchandise Inventory", type: "asset", category: "current_asset" },
  { code: "1050", name: "Office Equipment & IT Assets", type: "asset", category: "fixed_asset" },
  { code: "2010", name: "Accounts Payable (Sundry Creditors)", type: "liability", category: "current_liability" },
  { code: "2020", name: "Salaries & Wages Payable", type: "liability", category: "current_liability" },
  { code: "2030", name: "Output CGST Payable", type: "liability", category: "current_liability" },
  { code: "2040", name: "Output SGST Payable", type: "liability", category: "current_liability" },
  { code: "2050", name: "Output IGST Payable", type: "liability", category: "current_liability" },
  { code: "2060", name: "Provident Fund & ESI Payable", type: "liability", category: "current_liability" },
  { code: "3010", name: "Share Capital / Owner's Equity", type: "equity", category: "equity" },
  { code: "3020", name: "Retained Earnings", type: "equity", category: "equity" },
  { code: "4010", name: "Sales & Service Revenue", type: "revenue", category: "direct_income" },
  { code: "5010", name: "Employee Salaries & Allowances", type: "expense", category: "indirect_expense" },
  { code: "5020", name: "Office Rent & Utilities", type: "expense", category: "indirect_expense" },
  { code: "5030", name: "Software Subscriptions & IT Expense", type: "expense", category: "indirect_expense" },
];

export async function provisionTenantWithTrial(input: ProvisionTenantInput) {
  const db = rawPrisma || prisma;

  // Idempotency: check if user is already linked to an active tenant
  const existingProfile = await db.profile.findUnique({
    where: { userId: input.userId },
    include: { tenant: { include: { subscription: true } } },
  });

  if (existingProfile?.tenantId && existingProfile.tenant) {
    return {
      tenant: existingProfile.tenant,
      subscription: existingProfile.tenant.subscription,
      trialEndsAt: existingProfile.tenant.subscription?.trialEndsAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      accountsSeeded: STANDARD_ACCOUNTS.length,
      isExisting: true,
    };
  }

  // Generate unique slug
  let baseSlug = (input.slug || input.name.toLowerCase().replace(/[^a-z0-9]/g, "-")).replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!baseSlug) baseSlug = "org-" + crypto.randomBytes(4).toString("hex");

  let slug = baseSlug;
  let counter = 1;
  while (await db.tenant.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  // 1. Create Tenant Organization
  const tenant = await db.tenant.create({
    data: {
      name: input.name,
      slug,
      timezone: input.timezone || "Asia/Kolkata",
      currency: input.currency || "INR",
      isOnboarded: false,
    },
  });

  const now = new Date();
  const trialDays = 14;
  const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000); // 14 Days Free Trial

  // 2. Create TenantSubscription with trialing status
  const subscription = await db.tenantSubscription.create({
    data: {
      tenantId: tenant.id,
      status: "trialing",
      billingCycle: "monthly",
      maxEmployees: 25,
      maxUsers: 5,
      storageLimitGb: 10,
      trialStartedAt: now,
      trialEndsAt,
      expiresAt: trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
    },
  });

  // 3. Seed 17 Standard Chart of Accounts
  for (const acc of STANDARD_ACCOUNTS) {
    await db.chartOfAccount.create({
      data: {
        tenantId: tenant.id,
        accountCode: acc.code,
        accountName: acc.name,
        accountType: acc.type,
        category: acc.category,
        status: "active",
      },
    });
  }

  // 4. Create Default Central Warehouse
  await db.warehouse.create({
    data: {
      tenantId: tenant.id,
      name: "Main Central Warehouse",
      location: "HQ Facility",
      city: "Corporate Hub",
      isDefault: true,
    },
  });

  // 5. Link user profile to tenant
  await db.profile.upsert({
    where: { userId: input.userId },
    create: {
      id: crypto.randomUUID(),
      userId: input.userId,
      tenantId: tenant.id,
      email: input.adminEmail,
      fullName: input.adminFullName || input.adminEmail.split("@")[0],
    },
    update: {
      tenantId: tenant.id,
      fullName: input.adminFullName || undefined,
    },
  });

  // 6. Assign hr_admin role (Tenant Administrator AppRole)
  await db.userRole.create({
    data: {
      userId: input.userId,
      tenantId: tenant.id,
      role: "hr_admin",
    },
  });

  // 7. Find or create Workspace Admin WorkspaceRole and assign
  try {
    let wsAdminRole = await db.workspaceRole.findFirst({
      where: {
        OR: [
          { tenantId: tenant.id, name: "Workspace Admin" },
          { name: "Workspace Admin" },
        ],
      },
    });

    if (!wsAdminRole) {
      wsAdminRole = await db.workspaceRole.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          name: "Workspace Admin",
          description: "Full administrator privileges for tenant workspace",
        },
      });
    }

    if (wsAdminRole) {
      await db.userRoleAssignment.upsert({
        where: {
          userId_tenantId: {
            userId: input.userId,
            tenantId: tenant.id,
          },
        },
        create: {
          userId: input.userId,
          tenantId: tenant.id,
          roleId: wsAdminRole.id,
        },
        update: {
          roleId: wsAdminRole.id,
        },
      });
    }
  } catch (roleErr: any) {
    console.warn("[provisionTenantWithTrial] WorkspaceRole assignment warning:", roleErr.message);
  }

  // 8. Publish domain outbox events
  try {
    await OutboxService.createOutboxEvent({
      tenantId: tenant.id,
      eventType: "tenant.provisioned",
      entityType: "Tenant",
      entityId: tenant.id,
      actorId: input.userId,
      payload: {
        tenantId: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        adminEmail: input.adminEmail,
        trialEndsAt: trialEndsAt.toISOString(),
      },
    });
  } catch (evtErr: any) {
    console.warn("[provisionTenantWithTrial] Outbox event create warning:", evtErr.message);
  }

  return {
    tenant,
    subscription,
    trialEndsAt,
    accountsSeeded: STANDARD_ACCOUNTS.length,
    isExisting: false,
  };
}
