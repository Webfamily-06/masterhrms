import { prisma } from "../prisma";

export class WorkspacePolicyError extends Error {
  constructor(message: string, public status = 403) { super(message); }
}

export function resolveWorkspacePolicy(subscription: any = {}, plans: any[] = []) {
  const plan = plans.find((p) => p.id === subscription.planId);
  const limit = (value: unknown): number | null =>
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
  const planLimit = (camelCase: string, snakeCase: string) => plan?.[camelCase] ?? plan?.[snakeCase];
  const planPrice = (camelCase: string, snakeCase: string) => Number(plan?.[camelCase] ?? plan?.[snakeCase]) || 0;
  return {
    planId: plan?.id ?? null,
    planName: plan?.name ?? "Unassigned",
    status: subscription.status === "suspended" ? "suspended" : "active",
    expiresAt: subscription.expiresAt || null,
    maxEmployees: limit(subscription.maxEmployees !== undefined ? subscription.maxEmployees : planLimit("maxEmployees", "max_employees")),
    maxUsers: limit(subscription.maxUsers !== undefined ? subscription.maxUsers : planLimit("maxUsers", "max_users")),
    billingCycle: subscription.billingCycle === "annual" ? "annual" : "monthly",
    monthlyRevenue: plan ? (subscription.billingCycle === "annual" ? planPrice("priceAnnual", "price_annual") / 12 : planPrice("priceMonthly", "price_monthly")) : 0,
  };
}

export function assertWorkspaceActive(policy: ReturnType<typeof resolveWorkspacePolicy>) {
  if (policy.status === "suspended") throw new WorkspacePolicyError("This workspace is suspended. Contact platform support.");
  if (policy.expiresAt && new Date(policy.expiresAt).getTime() <= Date.now()) {
    throw new WorkspacePolicyError("This workspace subscription has expired. Contact platform support.");
  }
}

export async function getWorkspacePolicy(tenantId: string, db: any = prisma) {
  // Prefer the relational source of truth. The optional access keeps the
  // transition backward-compatible with test fixtures and pre-migration DBs.
  if (db.tenantSubscription?.findUnique) {
    try {
      const subscription = await db.tenantSubscription.findUnique({
        where: { tenantId },
        include: { plan: true },
      });
      if (subscription) {
        return resolveWorkspacePolicy(subscription, subscription.plan ? [subscription.plan] : []);
      }
    } catch (error: any) {
      // A deployment can temporarily run code before db push. Fall back to
      // legacy data instead of changing a workspace's access unexpectedly.
      if (error?.code !== "P2021") throw error;
    }
  }
  const [subscription, catalog] = await Promise.all([
    db.cmsPage.findUnique({ where: { slug: `tenant-${tenantId}-subscription` } }),
    db.cmsPage.findUnique({ where: { slug: "system-monetization-plans" } }),
  ]);
  return resolveWorkspacePolicy(subscription?.content || {}, Array.isArray(catalog?.content?.plans) ? catalog.content.plans : []);
}

export async function syncSubscriptionPlans(plans: any[], db: any = prisma) {
  if (!db.subscriptionPlan?.upsert) return;
  await Promise.all(plans.map((plan) => db.subscriptionPlan.upsert({
    where: { id: plan.id },
    create: {
      id: plan.id,
      name: plan.name,
      description: plan.description || null,
      status: plan.status === "inactive" ? "inactive" : "active",
      priceMonthly: Number(plan.price_monthly) || 0,
      priceAnnual: Number(plan.price_annual) || 0,
      maxEmployees: Number.isSafeInteger(plan.max_employees) ? plan.max_employees : null,
      maxUsers: Number.isSafeInteger(plan.max_users) ? plan.max_users : null,
      features: Array.isArray(plan.features) ? plan.features : undefined,
      includedAddonIds: Array.isArray(plan.included_addon_ids) ? plan.included_addon_ids : undefined,
      isPopular: Boolean(plan.popular),
    },
    update: {
      name: plan.name,
      description: plan.description || null,
      status: plan.status === "inactive" ? "inactive" : "active",
      priceMonthly: Number(plan.price_monthly) || 0,
      priceAnnual: Number(plan.price_annual) || 0,
      maxEmployees: Number.isSafeInteger(plan.max_employees) ? plan.max_employees : null,
      maxUsers: Number.isSafeInteger(plan.max_users) ? plan.max_users : null,
      features: Array.isArray(plan.features) ? plan.features : undefined,
      includedAddonIds: Array.isArray(plan.included_addon_ids) ? plan.included_addon_ids : undefined,
      isPopular: Boolean(plan.popular),
    },
  })));
}

// Serialize capacity checks and writes on the tenant row, including imports and ATS conversions.
// Call inside the SAME transaction that creates the employee/account.
export async function lockWorkspaceCapacity(db: any, tenantId: string, resource: "employees" | "users", additional = 1) {
  if (!tenantId) throw new WorkspacePolicyError("Workspace context is required.");
  const rows = await db.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`;
  if (!rows.length) throw new WorkspacePolicyError("Workspace not found.", 404);
  const policy = await getWorkspacePolicy(tenantId, db);
  assertWorkspaceActive(policy);
  const maximum = resource === "employees" ? policy.maxEmployees : policy.maxUsers;
  const used = resource === "employees"
    ? await db.employee.count({ where: { tenantId } })
    : await db.profile.count({ where: { tenantId, user: { roles: { none: { role: "super_admin" } } } } });
  if (maximum !== null && used + additional > maximum) {
    throw new WorkspacePolicyError(`Workspace ${resource} limit reached (${used}/${maximum}). Contact your platform administrator.`, 409);
  }
}
