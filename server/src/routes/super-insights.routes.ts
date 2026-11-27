import { Router, Response } from "express";
import { rawPrisma as prisma } from "../prisma";
import { requireAuth, requireSuperAdmin, AuthRequest } from "../middleware/auth";
import { superAuditMiddleware } from "../lib/super-audit";
import { sendSubscriptionLifecycleEmail } from "../lib/email";
import { getWorkspaceUrl } from "../lib/workspace-host";

export const superInsightsRouter = Router();

superInsightsRouter.use(requireAuth, requireSuperAdmin, superAuditMiddleware("super-insights"));

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PAID_INVOICE_STATUSES = new Set(["paid", "success", "verified"]);
const PAID_GATEWAY_STATUSES = new Set(["verified", "success", "paid", "captured"]);
const FAILED_STATUSES = new Set(["failed", "void", "rejected", "declined"]);

const REQUEST_TICKET_KEYWORDS = [
  "upgrade",
  "plan",
  "addon",
  "add-on",
  "subscription",
  "seat",
  "quota",
  "billing",
  "downgrade",
  "package",
];

function computeDeltaPercent(current: number, previous: number): number | null {
  if (!previous || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function isRequestTicket(ticket: {
  requestType?: string | null;
  targetAddonSlug?: string | null;
  subject?: string | null;
}): boolean {
  if (ticket.targetAddonSlug) return true;
  const hay = `${ticket.requestType || ""} ${ticket.subject || ""}`.toLowerCase();
  return REQUEST_TICKET_KEYWORDS.some((kw) => hay.includes(kw));
}

function normalizeDisplayStatus(rawStatus: string, isPaidSet: Set<string>): "Paid" | "Unpaid" | "Failed" {
  const s = (rawStatus || "").toLowerCase();
  if (isPaidSet.has(s)) return "Paid";
  if (FAILED_STATUSES.has(s)) return "Failed";
  return "Unpaid";
}

// GET /api/super/insights/overview?year=YYYY&companyRange=week|month|year&plansRange=month|year
superInsightsRouter.get("/overview", async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const currentYear = now.getUTCFullYear();

    const parsedYear = parseInt(String(req.query.year || currentYear), 10);
    const year = Number.isFinite(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100 ? parsedYear : currentYear;

    const rawCompanyRange = String(req.query.companyRange || "week").toLowerCase();
    const companyRange: "week" | "month" | "year" =
      rawCompanyRange === "month" || rawCompanyRange === "year" ? rawCompanyRange : "week";

    const rawPlansRange = String(req.query.plansRange || "month").toLowerCase();
    const plansRange: "month" | "year" = rawPlansRange === "year" ? "year" : "month";

    const [tenants, totalUsers, totalEmployees, invoices, gatewayTxns, openTickets] = await Promise.all([
      prisma.tenant.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          createdAt: true,
          subscription: {
            select: {
              id: true,
              planId: true,
              status: true,
              billingCycle: true,
              expiresAt: true,
              trialEndsAt: true,
              createdAt: true,
              updatedAt: true,
              plan: {
                select: {
                  id: true,
                  name: true,
                  isTrial: true,
                },
              },
            },
          },
          tenantDomains: {
            select: {
              domain: true,
              isPrimary: true,
            },
            orderBy: { isPrimary: "desc" },
            take: 2,
          },
          profiles: {
            select: {
              email: true,
              fullName: true,
            },
            take: 2,
          },
          _count: {
            select: {
              profiles: true,
              employees: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
      prisma.employee.count(),
      prisma.billingInvoice.findMany({
        select: {
          id: true,
          invoiceNo: true,
          tenantId: true,
          amount: true,
          currency: true,
          status: true,
          billingCycle: true,
          paymentMethod: true,
          gatewayOrderId: true,
          gatewayPaymentId: true,
          paidAt: true,
          createdAt: true,
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
          subscription: {
            select: {
              plan: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.paymentGatewayTransaction.findMany({
        select: {
          id: true,
          tenantId: true,
          provider: true,
          method: true,
          providerOrderId: true,
          providerPaymentId: true,
          amount: true,
          currency: true,
          status: true,
          verifiedAt: true,
          createdAt: true,
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.platformSupportTicket.findMany({
        where: {
          status: { in: ["open", "in_progress", "on_hold"] },
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              tenantDomains: {
                select: { domain: true, isPrimary: true },
                orderBy: { isPrimary: "desc" },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    // ─── Tenant Totals & Status Breakdown ─────────────────────────────────────
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    let activeTenants = 0;
    let suspendedTenants = 0;
    let trialTenants = 0;
    let expiredTenants = 0;
    let todayNewTenants = 0;
    let tenantsThisMonth = 0;
    let tenantsLastMonth = 0;

    for (const t of tenants) {
      const createdAt = new Date(t.createdAt);
      if (createdAt >= startOfToday) todayNewTenants++;
      if (createdAt >= startOfThisMonth) tenantsThisMonth++;
      else if (createdAt >= startOfLastMonth && createdAt < startOfThisMonth) tenantsLastMonth++;

      const sub = t.subscription;
      const subStatus = (sub?.status || "active").toLowerCase();
      const isDateExpired = Boolean(sub?.expiresAt && new Date(sub.expiresAt) < now);

      if (subStatus === "suspended") {
        suspendedTenants++;
      } else if (subStatus === "expired" || isDateExpired) {
        expiredTenants++;
      } else if (
        subStatus === "trialing" ||
        subStatus === "trial" ||
        Boolean(sub?.plan?.isTrial) ||
        Boolean(sub?.trialEndsAt && new Date(sub.trialEndsAt) > now && !sub?.expiresAt)
      ) {
        trialTenants++;
        activeTenants++;
      } else {
        activeTenants++;
      }
    }

    // ─── Unified Real Transactions (BillingInvoice + Non-Duplicate Gateway Txns) ─
    const invoicePaymentIds = new Set<string>();
    const invoiceOrderIds = new Set<string>();

    const normalizedInvoices = invoices.map((inv) => {
      if (inv.gatewayPaymentId) invoicePaymentIds.add(inv.gatewayPaymentId);
      if (inv.gatewayOrderId) invoiceOrderIds.add(inv.gatewayOrderId);
      const rawStatus = (inv.status || "open").toLowerCase();
      const status = normalizeDisplayStatus(rawStatus, PAID_INVOICE_STATUSES);
      const amount = Number(inv.amount) || 0;
      const effectiveDate = inv.paidAt ? new Date(inv.paidAt) : new Date(inv.createdAt);

      return {
        id: inv.id,
        invoiceId: inv.invoiceNo || `INV-${inv.id.slice(0, 8).toUpperCase()}`,
        tenantId: inv.tenantId,
        tenantName: inv.tenant?.name || "Workspace",
        tenantSlug: inv.tenant?.slug || "",
        companyLogo: inv.tenant?.logoUrl || null,
        amount,
        currency: inv.currency || "INR",
        status,
        rawStatus,
        planName: inv.subscription?.plan?.name || "Subscription Plan",
        billingCycle: inv.billingCycle || "monthly",
        paymentMethod: inv.paymentMethod || "online",
        paidAt: inv.paidAt ? new Date(inv.paidAt).toISOString() : null,
        createdAt: new Date(inv.createdAt).toISOString(),
        effectiveDate,
        sourceType: "billing_invoice" as const,
      };
    });

    const normalizedGatewayTxns = gatewayTxns
      .filter((tx) => {
        if (tx.providerPaymentId && invoicePaymentIds.has(tx.providerPaymentId)) return false;
        if (tx.providerOrderId && invoiceOrderIds.has(tx.providerOrderId)) return false;
        return true;
      })
      .map((tx) => {
        const rawStatus = (tx.status || "pending").toLowerCase();
        const status = normalizeDisplayStatus(rawStatus, PAID_GATEWAY_STATUSES);
        const amount = Number(tx.amount) || 0;
        const effectiveDate = tx.verifiedAt ? new Date(tx.verifiedAt) : new Date(tx.createdAt);

        return {
          id: tx.id,
          invoiceId: tx.providerOrderId || `TXN-${tx.id.slice(0, 8).toUpperCase()}`,
          tenantId: tx.tenantId,
          tenantName: tx.tenant?.name || "Workspace",
          tenantSlug: tx.tenant?.slug || "",
          companyLogo: tx.tenant?.logoUrl || null,
          amount,
          currency: tx.currency || "INR",
          status,
          rawStatus,
          planName: tx.method ? `${tx.provider} (${tx.method})` : tx.provider || "Gateway Payment",
          billingCycle: "monthly",
          paymentMethod: tx.provider || "gateway",
          paidAt: tx.verifiedAt ? new Date(tx.verifiedAt).toISOString() : null,
          createdAt: new Date(tx.createdAt).toISOString(),
          effectiveDate,
          sourceType: "gateway_transaction" as const,
        };
      });

    const allTransactions = [...normalizedInvoices, ...normalizedGatewayTxns].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paidTransactions = allTransactions.filter((t) => t.status === "Paid");

    // ─── Revenue Aggregations ─────────────────────────────────────────────────
    let totalEarnings = 0;
    let revenueThisMonth = 0;
    let revenueLastMonth = 0;
    let revenueSelectedYear = 0;
    let revenuePrevYear = 0;

    const monthlyBuckets = Array.from({ length: 12 }, (_, idx) => ({
      month: MONTH_LABELS[idx],
      monthIndex: idx,
      revenue: 0,
      count: 0,
    }));

    for (const tx of paidTransactions) {
      totalEarnings += tx.amount;
      const d = tx.effectiveDate;
      if (d >= startOfThisMonth) {
        revenueThisMonth += tx.amount;
      } else if (d >= startOfLastMonth && d < startOfThisMonth) {
        revenueLastMonth += tx.amount;
      }

      const txYear = d.getUTCFullYear();
      if (txYear === year) {
        revenueSelectedYear += tx.amount;
        const m = d.getUTCMonth();
        monthlyBuckets[m].revenue = Math.round((monthlyBuckets[m].revenue + tx.amount) * 100) / 100;
        monthlyBuckets[m].count += 1;
      } else if (txYear === year - 1) {
        revenuePrevYear += tx.amount;
      }
    }

    // ─── Companies Registered Series (week | month | year) ────────────────────
    let companyCategories: string[] = [];
    let companyCounts: number[] = [];
    let companyPeriodTotal = 0;
    let companyPrevPeriodTotal = 0;

    if (companyRange === "week") {
      // Last 7 days inclusive (today - 6d .. today)
      const buckets: { label: string; start: Date; end: Date; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        buckets.push({
          label: DAY_LABELS[dayStart.getUTCDay()],
          start: dayStart,
          end: dayEnd,
          count: 0,
        });
      }
      const prevStart = new Date(buckets[0].start.getTime() - 7 * 24 * 60 * 60 * 1000);
      const prevEnd = buckets[0].start;

      for (const t of tenants) {
        const d = new Date(t.createdAt);
        if (d >= prevStart && d < prevEnd) companyPrevPeriodTotal++;
        for (const b of buckets) {
          if (d >= b.start && d < b.end) {
            b.count++;
            companyPeriodTotal++;
            break;
          }
        }
      }
      companyCategories = buckets.map((b) => b.label);
      companyCounts = buckets.map((b) => b.count);
    } else if (companyRange === "month") {
      // 4 weekly buckets inside the last 28 days
      const buckets: { label: string; start: Date; end: Date; count: number }[] = [];
      for (let w = 3; w >= 0; w--) {
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1 - w * 7));
        const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        buckets.push({
          label: `W${4 - w}`,
          start,
          end,
          count: 0,
        });
      }
      const prevStart = new Date(buckets[0].start.getTime() - 28 * 24 * 60 * 60 * 1000);
      const prevEnd = buckets[0].start;

      for (const t of tenants) {
        const d = new Date(t.createdAt);
        if (d >= prevStart && d < prevEnd) companyPrevPeriodTotal++;
        for (const b of buckets) {
          if (d >= b.start && d < b.end) {
            b.count++;
            companyPeriodTotal++;
            break;
          }
        }
      }
      companyCategories = buckets.map((b) => b.label);
      companyCounts = buckets.map((b) => b.count);
    } else {
      // 12 months for selected year
      const counts = Array(12).fill(0) as number[];
      for (const t of tenants) {
        const d = new Date(t.createdAt);
        const y = d.getUTCFullYear();
        if (y === year) {
          counts[d.getUTCMonth()]++;
          companyPeriodTotal++;
        } else if (y === year - 1) {
          companyPrevPeriodTotal++;
        }
      }
      companyCategories = [...MONTH_LABELS];
      companyCounts = counts;
    }

    // ─── Plan Distribution (tenantSubscription grouped by plan) ───────────────
    const plansRangeStart =
      plansRange === "month"
        ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30))
        : new Date(Date.UTC(year, 0, 1));
    const plansRangeEnd =
      plansRange === "month"
        ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
        : new Date(Date.UTC(year + 1, 0, 1));

    const planCountsInRange = new Map<string, { planId: string | null; name: string; count: number }>();
    const planCountsAllActive = new Map<string, { planId: string | null; name: string; count: number }>();

    for (const t of tenants) {
      const sub = t.subscription;
      if (!sub) continue;

      const key = sub.planId || "__unassigned__";
      const planName = sub.plan?.name || "Unassigned";

      // All subscriptions map
      const existingAll = planCountsAllActive.get(key) || { planId: sub.planId, name: planName, count: 0 };
      existingAll.count += 1;
      planCountsAllActive.set(key, existingAll);

      // Range-filtered subscriptions map (created or updated within range)
      const subCreated = new Date(sub.createdAt);
      const subUpdated = new Date(sub.updatedAt);
      const inRange =
        (subCreated >= plansRangeStart && subCreated < plansRangeEnd) ||
        (subUpdated >= plansRangeStart && subUpdated < plansRangeEnd);

      if (inRange) {
        const existingRange = planCountsInRange.get(key) || { planId: sub.planId, name: planName, count: 0 };
        existingRange.count += 1;
        planCountsInRange.set(key, existingRange);
      }
    }

    const formatPlanDistribution = (map: Map<string, { planId: string | null; name: string; count: number }>) => {
      const items = Array.from(map.values()).sort((a, b) => b.count - a.count);
      const total = items.reduce((acc, item) => acc + item.count, 0);
      return items.map((item) => ({
        planId: item.planId,
        name: item.name,
        count: item.count,
        percentage: total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0,
      }));
    };

    const rangedPlans = formatPlanDistribution(planCountsInRange);
    const allPlans = formatPlanDistribution(planCountsAllActive);

    // ─── Operational Lists (Latest 5 Each) ────────────────────────────────────
    const recentTransactions = allTransactions.slice(0, 5).map(({ effectiveDate: _e, ...rest }) => rest);

    const recentlyRegistered = tenants.slice(0, 5).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      logoUrl: t.logoUrl || null,
      planName: t.subscription?.plan?.name || "Unassigned",
      billingCycle: t.subscription?.billingCycle || "monthly",
      usersCount: t._count?.profiles || 0,
      employeesCount: t._count?.employees || 0,
      domain: t.tenantDomains?.[0]?.domain || `${t.slug}`,
      createdAt: new Date(t.createdAt).toISOString(),
    }));

    const recentlyExpired = tenants
      .filter((t) => {
        const sub = t.subscription;
        if (!sub) return false;
        const isExpiredDate = Boolean(sub.expiresAt && new Date(sub.expiresAt) < now);
        return isExpiredDate || sub.status.toLowerCase() === "expired";
      })
      .sort((a, b) => {
        const aTime = a.subscription?.expiresAt ? new Date(a.subscription.expiresAt).getTime() : 0;
        const bTime = b.subscription?.expiresAt ? new Date(b.subscription.expiresAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5)
      .map((t) => ({
        id: t.subscription!.id,
        tenantId: t.id,
        tenantName: t.name,
        tenantSlug: t.slug,
        companyLogo: t.logoUrl || null,
        planName: t.subscription?.plan?.name || "Subscription",
        billingCycle: t.subscription?.billingCycle || "monthly",
        status: t.subscription?.status || "expired",
        expiresAt: t.subscription?.expiresAt ? new Date(t.subscription.expiresAt).toISOString() : null,
        adminEmail: t.profiles?.find((p) => p.email)?.email || null,
      }));

    const pendingRequests = openTickets
      .filter((ticket) => isRequestTicket(ticket))
      .slice(0, 5)
      .map((ticket) => ({
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        tenantId: ticket.tenantId,
        tenantName: ticket.tenant?.name || "Workspace",
        tenantSlug: ticket.tenant?.slug || "",
        companyLogo: ticket.tenant?.logoUrl || null,
        domain: ticket.tenant?.tenantDomains?.[0]?.domain || ticket.tenant?.slug || "",
        subject: ticket.subject,
        requestType: ticket.requestType,
        targetAddonSlug: ticket.targetAddonSlug || null,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: new Date(ticket.createdAt).toISOString(),
      }));

    // ─── Real 7-Day Sparklines ────────────────────────────────────────────────
    const sparklineTenants: number[] = [];
    const sparklineRevenue: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      sparklineTenants.push(tenants.filter((t) => new Date(t.createdAt) < dayEnd).length);
      const dayRev = paidTransactions
        .filter((tx) => tx.effectiveDate >= dayStart && tx.effectiveDate < dayEnd)
        .reduce((sum, tx) => sum + tx.amount, 0);
      sparklineRevenue.push(Math.round(dayRev));
    }

    return res.json({
      totals: {
        totalTenants: tenants.length,
        activeTenants,
        suspendedTenants,
        trialTenants,
        expiredTenants,
        todayNewTenants,
        tenantsThisMonth,
        tenantsLastMonth,
        tenantsDeltaPercent: computeDeltaPercent(tenantsThisMonth, tenantsLastMonth),
        totalUsers,
        totalEmployees,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
      },
      revenue: {
        year,
        currency: "INR",
        thisMonth: Math.round(revenueThisMonth * 100) / 100,
        lastMonth: Math.round(revenueLastMonth * 100) / 100,
        deltaPercent: computeDeltaPercent(revenueThisMonth, revenueLastMonth),
        yearTotal: Math.round(revenueSelectedYear * 100) / 100,
        previousYearTotal: Math.round(revenuePrevYear * 100) / 100,
        yearDeltaPercent: computeDeltaPercent(revenueSelectedYear, revenuePrevYear),
        monthlySeries: monthlyBuckets,
      },
      companiesRegistered: {
        range: companyRange,
        categories: companyCategories,
        counts: companyCounts,
        periodTotal: companyPeriodTotal,
        previousPeriodTotal: companyPrevPeriodTotal,
        deltaPercent: computeDeltaPercent(companyPeriodTotal, companyPrevPeriodTotal),
      },
      planDistribution: {
        range: plansRange,
        items: rangedPlans,
        allTimeItems: allPlans,
        totalInRange: rangedPlans.reduce((s, p) => s + p.count, 0),
        totalAllTime: allPlans.reduce((s, p) => s + p.count, 0),
      },
      recentTransactions,
      recentlyRegistered,
      recentlyExpired,
      pendingRequests,
      sparklines: {
        tenants: sparklineTenants,
        revenue: sparklineRevenue,
      },
      measuredAt: now.toISOString(),
    });
  } catch (err: any) {
    console.error("[super-insights GET /overview] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load Super Admin insights overview." });
  }
});

// POST /api/super/insights/tenants/:id/remind
superInsightsRouter.post("/tenants/:id/remind", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        profiles: {
          include: {
            user: {
              include: {
                roles: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant workspace not found." });
    }

    const adminRoleKeys = new Set(["admin", "hr_admin", "tenant_admin", "owner", "super_admin"]);
    const adminProfile =
      tenant.profiles.find((p) => {
        const email = p.email || p.user?.email;
        if (!email) return false;
        return p.user?.roles?.some((r) => adminRoleKeys.has(String(r.role).toLowerCase()));
      }) || tenant.profiles.find((p) => Boolean(p.email || p.user?.email));

    const toEmail = adminProfile?.email || adminProfile?.user?.email || null;
    if (!toEmail) {
      return res.status(400).json({
        error: `No administrator email address found for workspace "${tenant.name}".`,
      });
    }

    const now = new Date();
    const expiresAt = tenant.subscription?.expiresAt ? new Date(tenant.subscription.expiresAt) : null;
    const msDiff = expiresAt ? expiresAt.getTime() - now.getTime() : 0;
    const daysRemaining = expiresAt ? Math.ceil(msDiff / (24 * 60 * 60 * 1000)) : 0;

    let templateId = "subscription-expired";
    if (expiresAt && daysRemaining > 0) {
      if (daysRemaining <= 1) templateId = "subscription-reminder-1d";
      else if (daysRemaining <= 2) templateId = "subscription-reminder-2d";
      else if (daysRemaining <= 3) templateId = "subscription-reminder-3d";
      else if (daysRemaining <= 5) templateId = "subscription-reminder-5d";
      else if (daysRemaining <= 10) templateId = "subscription-reminder-10d";
      else templateId = "subscription-reminder-15d";
    }

    const expiryDateFormatted = expiresAt
      ? expiresAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "Expired";

    const adminName = adminProfile?.fullName || toEmail.split("@")[0] || "Workspace Administrator";
    const planName = tenant.subscription?.plan?.name || "Subscription Plan";
    const renewalUrl = `${getWorkspaceUrl(tenant.slug)}/subscription`;

    const result = await sendSubscriptionLifecycleEmail({
      toEmail,
      templateId,
      tenantId: tenant.id,
      scope: "PLATFORM",
      variables: {
        company_name: tenant.name,
        tenant_name: tenant.name,
        tenant_id: tenant.id,
        admin_name: adminName,
        plan_name: planName,
        expiry_date: expiryDateFormatted,
        days_remaining: String(Math.max(0, daysRemaining)),
        renewal_url: renewalUrl,
      },
    });

    if (!result.success) {
      const isSmtpUnconfigured = Boolean(result.error && result.error.toLowerCase().includes("not configured"));
      if (!isSmtpUnconfigured) {
        return res.status(502).json({
          error: result.error || "Failed to send subscription expiry reminder email.",
        });
      }
    }

    res.locals.superAudit = {
      action: "TENANT_EXPIRY_REMINDER_SENT",
      entityType: "Tenant",
      entityId: tenant.id,
      tenantId: tenant.id,
      after: {
        toEmail,
        templateId,
        planName,
        expiresAt: expiresAt?.toISOString() || null,
        messageId: result.messageId || null,
      },
    };

    return res.json({
      success: true,
      message: result.success
        ? `Subscription reminder email sent to ${toEmail}.`
        : `Reminder queued for ${toEmail} (SMTP not configured on server; logged in development mode).`,
      toEmail,
      templateId,
      messageId: result.messageId || null,
      smtpConfigured: result.success,
    });
  } catch (err: any) {
    console.error("[super-insights POST /tenants/:id/remind] error:", err);
    return res.status(500).json({ error: err.message || "Failed to send expiry reminder." });
  }
});
