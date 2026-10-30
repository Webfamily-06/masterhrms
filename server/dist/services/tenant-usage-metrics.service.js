"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantUsageMetricsService = void 0;
exports.formatBytes = formatBytes;
const prisma_1 = require("../prisma");
const workspace_host_1 = require("../lib/workspace-host");
const storage_admin_service_1 = require("./files/storage-admin.service");
const storage_usage_engine_1 = require("./files/storage-usage.engine");
const quota_service_1 = require("./files/quota.service");
const storage_forecast_service_1 = require("./files/storage-forecast.service");
function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes <= 0)
        return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
function parsePeriodDate(period) {
    const now = new Date();
    switch (period) {
        case "7d":
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case "30d":
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case "90d":
            return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        case "1y":
            return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        case "all":
        default:
            return null;
    }
}
class TenantUsageMetricsService {
    /**
     * Fetch all tenants with authoritative metrics from database
     */
    static async getTenantUsageMetricsList(options = {}) {
        const { search, plan, status, sortBy = "activity_desc", period = "30d" } = options;
        const sinceDate = parsePeriodDate(period);
        // 1. Fetch tenants with relational counts and subscription
        const tenants = await prisma_1.rawPrisma.tenant.findMany({
            include: {
                subscription: {
                    include: {
                        plan: true,
                    },
                },
                _count: {
                    select: {
                        employees: true,
                        profiles: true,
                        userRoles: true,
                        storedDocuments: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        const tenantIds = tenants.map((t) => t.id);
        // 2. Canonical F4 Storage Usage & Quota Lookups
        const [usages, quotas, versionAggs] = await Promise.all([
            prisma_1.rawPrisma.storageUsage.findMany({
                where: { tenantId: { in: tenantIds }, userId: null },
            }),
            prisma_1.rawPrisma.storageQuota.findMany({
                where: { tenantId: { in: tenantIds }, userId: null },
            }),
            prisma_1.rawPrisma.fileVersion.groupBy({
                by: ["fileId"],
                where: { file: { tenantId: { in: tenantIds } }, isCurrent: false },
                _sum: { sizeBytes: true },
            }),
        ]);
        const usageMap = new Map();
        usages.forEach((u) => usageMap.set(u.tenantId, u));
        const quotaMap = new Map();
        quotas.forEach((q) => quotaMap.set(q.tenantId, q));
        // Map non-current version bytes per file then per tenant
        const versionMap = new Map();
        // Pre-aggregate version bytes for tenants
        const versionFiles = await prisma_1.rawPrisma.mediaFile.findMany({
            where: { tenantId: { in: tenantIds }, versions: { some: { isCurrent: false } } },
            select: { id: true, tenantId: true },
        });
        const fileTenantMap = new Map();
        versionFiles.forEach(f => { if (f.tenantId)
            fileTenantMap.set(f.id, f.tenantId); });
        versionAggs.forEach((v) => {
            const tId = fileTenantMap.get(v.fileId);
            if (tId) {
                versionMap.set(tId, (versionMap.get(tId) || 0) + Number(v._sum.sizeBytes || 0));
            }
        });
        // 4. Fetch module activity counts per tenant within period
        const dateFilter = sinceDate ? { gte: sinceDate } : undefined;
        // A. Attendance records (HRM)
        const attendanceAggs = await prisma_1.rawPrisma.attendance.groupBy({
            by: ["tenantId"],
            _count: { _all: true },
            where: { tenantId: { in: tenantIds }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        });
        const attendanceMap = new Map();
        attendanceAggs.forEach((a) => attendanceMap.set(a.tenantId, a._count._all));
        // B. Leave Requests (HRM)
        const leaveAggs = await prisma_1.rawPrisma.leaveRequest.groupBy({
            by: ["tenantId"],
            _count: { _all: true },
            where: { tenantId: { in: tenantIds }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        });
        const leaveMap = new Map();
        leaveAggs.forEach((l) => leaveMap.set(l.tenantId, l._count._all));
        // C. Payroll Runs (HRM)
        const payrollAggs = await prisma_1.rawPrisma.payrollRun.groupBy({
            by: ["tenantId"],
            _count: { _all: true },
            where: { tenantId: { in: tenantIds }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        });
        const payrollMap = new Map();
        payrollAggs.forEach((p) => payrollMap.set(p.tenantId, p._count._all));
        // D. POS Sales (POS)
        const salesAggs = await prisma_1.rawPrisma.sale.groupBy({
            by: ["tenantId"],
            _count: { _all: true },
            where: { tenantId: { in: tenantIds }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        });
        const salesMap = new Map();
        salesAggs.forEach((s) => salesMap.set(s.tenantId, s._count._all));
        // E. CRM Leads (CRM)
        const leadAggs = await prisma_1.rawPrisma.crmLead.groupBy({
            by: ["tenantId"],
            _count: { _all: true },
            where: { tenantId: { in: tenantIds }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        });
        const leadMap = new Map();
        leadAggs.forEach((c) => leadMap.set(c.tenantId, c._count._all));
        // F. Project Tasks (Projects)
        const taskAggs = await prisma_1.rawPrisma.projectTask.groupBy({
            by: ["tenantId"],
            _count: { _all: true },
            where: { tenantId: { in: tenantIds }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        });
        const taskMap = new Map();
        taskAggs.forEach((t) => taskMap.set(t.tenantId, t._count._all));
        // G. Support Tickets (Helpdesk)
        const ticketAggs = await prisma_1.rawPrisma.helpdeskTicket.groupBy({
            by: ["tenantId"],
            _count: { _all: true },
            where: { tenantId: { in: tenantIds }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        });
        const ticketMap = new Map();
        ticketAggs.forEach((t) => ticketMap.set(t.tenantId, t._count._all));
        // H. Logins from LoginHistory
        const loginHistories = await prisma_1.rawPrisma.loginHistory.findMany({
            where: {
                ...(dateFilter ? { date: dateFilter } : {}),
                user: { profile: { tenantId: { in: tenantIds } } },
            },
            select: {
                date: true,
                user: { select: { profile: { select: { tenantId: true } } } },
            },
            orderBy: { date: "desc" },
        });
        const loginCountMap = new Map();
        const lastLoginMap = new Map();
        loginHistories.forEach((l) => {
            const tid = l.user.profile?.tenantId;
            if (tid) {
                loginCountMap.set(tid, (loginCountMap.get(tid) || 0) + 1);
                if (!lastLoginMap.has(tid)) {
                    lastLoginMap.set(tid, l.date);
                }
            }
        });
        // 5. Build tenant usage records
        const results = tenants.map((tenant) => {
            const sub = tenant.subscription;
            const planName = sub?.plan?.name || "Starter Cloud";
            const billingCycle = sub?.billingCycle || "monthly";
            // Quota limit in GB: override on subscription or from plan
            const storageLimitGb = sub?.storageLimitGb ?? sub?.plan?.storageLimitGb ?? null;
            const maxUsers = sub?.maxUsers ?? sub?.plan?.maxUsers ?? null;
            // Canonical F4-B Multi-Dimensional Storage Dimensions
            const usage = usageMap.get(tenant.id);
            const activeBytes = usage ? Number(usage.usedBytes) : 0;
            const trashBytes = usage ? Number(usage.trashBytes) : 0;
            const reservedBytes = usage ? Number(usage.reservedBytes) : 0;
            const versionBytes = versionMap.get(tenant.id) || 0;
            const billableBytes = activeBytes + trashBytes + versionBytes;
            const physicalBytes = billableBytes; // 1:1 local / storage provider mapping
            // Resolve effective tenant quota (Override -> Subscription -> Plan -> Default 10GB)
            let effectiveQuotaBytes = 10 * 1024 * 1024 * 1024;
            let quotaSource = "DEFAULT";
            const qOverride = quotaMap.get(tenant.id);
            if (qOverride && Number(qOverride.quotaBytes) > 0) {
                effectiveQuotaBytes = Number(qOverride.quotaBytes);
                quotaSource = "OVERRIDE";
            }
            else if (storageLimitGb) {
                effectiveQuotaBytes = storageLimitGb * 1024 * 1024 * 1024;
                quotaSource = "SUBSCRIPTION";
            }
            else if (sub?.plan?.storageLimitGb) {
                effectiveQuotaBytes = sub.plan.storageLimitGb * 1024 * 1024 * 1024;
                quotaSource = "PLAN";
            }
            else {
                const pKey = (sub?.planId || "starter").toLowerCase();
                if (quota_service_1.PLAN_STORAGE_CAPACITIES_GB[pKey]) {
                    effectiveQuotaBytes = quota_service_1.PLAN_STORAGE_CAPACITIES_GB[pKey] * 1024 * 1024 * 1024;
                    quotaSource = "PLAN";
                }
            }
            const totalUsedBytes = activeBytes;
            const storageLimitBytes = effectiveQuotaBytes;
            const storagePercentage = storageLimitBytes > 0
                ? Math.min(100, parseFloat(((totalUsedBytes / storageLimitBytes) * 100).toFixed(1)))
                : 0;
            // F4-C Quota Lifecycle State Machine
            const thresholdState = storagePercentage >= 100
                ? "LOCKED"
                : storagePercentage >= 90
                    ? "CRITICAL"
                    : storagePercentage >= 80
                        ? "WARNING"
                        : "NORMAL";
            // User Counts
            const totalUsers = tenant._count.profiles || tenant._count.userRoles || 1;
            const activeUsers = Math.max(1, loginCountMap.get(tenant.id) || totalUsers);
            const totalEmployees = tenant._count.employees || 0;
            // Module Usage breakdown
            const moduleScores = [
                {
                    name: "HRM",
                    key: "hrm",
                    count: (attendanceMap.get(tenant.id) || 0) + (leaveMap.get(tenant.id) || 0) + (payrollMap.get(tenant.id) || 0),
                },
                { name: "POS", key: "pos", count: salesMap.get(tenant.id) || 0 },
                { name: "CRM", key: "crm", count: leadMap.get(tenant.id) || 0 },
                { name: "Projects", key: "project", count: taskMap.get(tenant.id) || 0 },
                { name: "Helpdesk", key: "support", count: ticketMap.get(tenant.id) || 0 },
                { name: "Documents", key: "documents", count: tenant._count.storedDocuments || 0 },
            ];
            // Filter only modules that have actual recorded actions (> 0)
            const activeModules = moduleScores
                .filter((m) => m.count > 0)
                .sort((a, b) => b.count - a.count);
            const mostModuleUsage = activeModules.length > 0 ? activeModules.map((m) => m.name) : [];
            const totalActivityScore = moduleScores.reduce((acc, curr) => acc + curr.count, 0) + (loginCountMap.get(tenant.id) || 0);
            // Status
            const isSuspended = sub?.status === "suspended";
            const isExpired = sub?.status === "expired" || (sub?.expiresAt && new Date(sub.expiresAt).getTime() < Date.now());
            const accountStatus = isSuspended ? "Suspended" : isExpired ? "Expired" : "Active";
            const lastLogin = lastLoginMap.get(tenant.id);
            const lastActivityAt = lastLogin || sub?.updatedAt || tenant.createdAt;
            return {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                domainUrl: `${tenant.slug}.${(0, workspace_host_1.getBaseDomain)()}`,
                logoUrl: tenant.logoUrl || null,
                plan: planName,
                billingCycle,
                activeUsers,
                totalUsers,
                totalEmployees,
                maxUsers,
                userUsagePercentage: maxUsers ? Math.min(100, Math.round((activeUsers / maxUsers) * 100)) : null,
                storageUsedBytes: totalUsedBytes,
                storageLimitBytes,
                storageUsedFormatted: formatBytes(totalUsedBytes),
                storageLimitFormatted: storageLimitGb ? `${storageLimitGb} GB` : "Not configured",
                storageLimitGb: Math.round(effectiveQuotaBytes / (1024 * 1024 * 1024)),
                storagePercentage,
                activeBytes,
                formattedActive: formatBytes(activeBytes),
                trashBytes,
                formattedTrash: formatBytes(trashBytes),
                versionBytes,
                formattedVersion: formatBytes(versionBytes),
                reservedBytes,
                formattedReserved: formatBytes(reservedBytes),
                physicalBytes,
                formattedPhysical: formatBytes(physicalBytes),
                billableBytes,
                formattedBillable: formatBytes(billableBytes),
                quotaBytes: effectiveQuotaBytes,
                formattedQuota: formatBytes(effectiveQuotaBytes),
                quotaSource,
                thresholdState,
                fileCount: usage ? usage.fileCount : 0,
                mostModuleUsage,
                totalActivityScore,
                status: accountStatus,
                lastLoginAt: lastLogin ? lastLogin.toISOString() : null,
                lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : (tenant.createdAt || new Date()).toISOString(),
                updatedAt: usage?.updatedAt ? usage.updatedAt.toISOString() : (sub?.updatedAt || tenant.createdAt || new Date()).toISOString(),
                createdAt: (tenant.createdAt || new Date()).toISOString(),
            };
        });
        // 6. Apply search and filtering
        let filtered = results;
        if (search && search.trim()) {
            const q = search.trim().toLowerCase();
            filtered = filtered.filter((m) => m.name.toLowerCase().includes(q) ||
                m.slug.toLowerCase().includes(q) ||
                m.domainUrl.toLowerCase().includes(q));
        }
        if (plan && plan !== "all") {
            const p = plan.trim().toLowerCase();
            filtered = filtered.filter((m) => m.plan.toLowerCase().includes(p));
        }
        if (status && status !== "all") {
            const s = status.trim().toLowerCase();
            filtered = filtered.filter((m) => m.status.toLowerCase() === s);
        }
        // 7. Apply Sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case "activity_asc":
                    return a.totalActivityScore - b.totalActivityScore;
                case "activity_desc":
                    return b.totalActivityScore - a.totalActivityScore;
                case "storage_desc":
                    return b.storageUsedBytes - a.storageUsedBytes;
                case "storage_asc":
                    return a.storageUsedBytes - b.storageUsedBytes;
                case "users_desc":
                    return b.activeUsers - a.activeUsers;
                case "users_asc":
                    return a.activeUsers - b.activeUsers;
                case "name_asc":
                    return a.name.localeCompare(b.name);
                case "name_desc":
                    return b.name.localeCompare(a.name);
                default:
                    return b.totalActivityScore - a.totalActivityScore;
            }
        });
        // Compute platform fleet summary
        const totalAllocatedStorage = results.reduce((acc, r) => acc + (r.quotaBytes || 0), 0);
        const totalActiveStorage = results.reduce((acc, r) => acc + r.activeBytes, 0);
        const totalTrashStorage = results.reduce((acc, r) => acc + r.trashBytes, 0);
        const totalVersionStorage = results.reduce((acc, r) => acc + r.versionBytes, 0);
        const totalReservedStorage = results.reduce((acc, r) => acc + r.reservedBytes, 0);
        const totalPhysicalStorage = results.reduce((acc, r) => acc + r.physicalBytes, 0);
        const totalBillableStorage = results.reduce((acc, r) => acc + r.billableBytes, 0);
        const fleetSummary = {
            totalTenants: tenants.length,
            activeTenants: tenants.filter((t) => t.subscription?.status === "active" || !t.subscription?.status).length,
            totalAllocatedStorage,
            formattedAllocatedStorage: formatBytes(totalAllocatedStorage),
            totalActiveStorage,
            formattedActiveStorage: formatBytes(totalActiveStorage),
            totalTrashStorage,
            formattedTrashStorage: formatBytes(totalTrashStorage),
            totalVersionStorage,
            formattedVersionStorage: formatBytes(totalVersionStorage),
            totalReservedStorage,
            formattedReservedStorage: formatBytes(totalReservedStorage),
            totalPhysicalStorage,
            formattedPhysicalStorage: formatBytes(totalPhysicalStorage),
            totalBillableStorage,
            formattedBillableStorage: formatBytes(totalBillableStorage),
            tenantsApproachingQuota: results.filter((r) => r.storagePercentage !== null && r.storagePercentage >= 80 && r.storagePercentage < 100).length,
            tenantsLocked: results.filter((r) => r.storagePercentage !== null && r.storagePercentage >= 100).length,
        };
        return {
            fleetSummary,
            data: filtered,
            tenants: filtered,
        };
    }
    /**
     * Fetch comprehensive tenant usage detail for modal/drawer
     */
    static async getTenantUsageDetail(tenantId, period = "30d") {
        const sinceDate = parsePeriodDate(period);
        const dateFilter = sinceDate ? { gte: sinceDate } : undefined;
        const tenant = await prisma_1.rawPrisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                subscription: {
                    include: { plan: true },
                },
                _count: {
                    select: {
                        employees: true,
                        profiles: true,
                        userRoles: true,
                        storedDocuments: true,
                    },
                },
            },
        });
        if (!tenant) {
            throw new Error(`Tenant '${tenantId}' not found.`);
        }
        const sub = tenant.subscription;
        const planName = sub?.plan?.name || "Starter Cloud";
        const storageLimitGb = sub?.storageLimitGb ?? sub?.plan?.storageLimitGb ?? null;
        const storageLimitBytes = storageLimitGb ? storageLimitGb * 1024 * 1024 * 1024 : null;
        // A. Canonical F4 Storage Breakdown & Telemetry
        const lookbackDays = period === "7d" ? 7 : (period === "90d" ? 90 : 30);
        const [storageSummary, departmentBreakdown, recentActivities, forecast, growthHistory, attCount, saleCount, leadCount, taskCount, ticketCount, empCount] = await Promise.all([
            storage_admin_service_1.StorageAdminService.getTenantStorageSummary(tenantId).catch(() => null),
            storage_usage_engine_1.StorageUsageEngine.calculateDepartmentBreakdown(tenantId).catch(() => []),
            storage_admin_service_1.StorageAdminService.getStorageActivity(tenantId, 15).catch(() => []),
            storage_forecast_service_1.StorageForecastService.calculateTenantForecast(tenantId, { lookbackDays }).catch(() => null),
            storage_forecast_service_1.StorageForecastService.getTenantGrowthHistory(tenantId, { lookbackDays }).catch(() => null),
            prisma_1.rawPrisma.attendance.count({ where: { tenantId } }),
            prisma_1.rawPrisma.sale.count({ where: { tenantId } }),
            prisma_1.rawPrisma.crmLead.count({ where: { tenantId } }),
            prisma_1.rawPrisma.projectTask.count({ where: { tenantId } }),
            prisma_1.rawPrisma.helpdeskTicket.count({ where: { tenantId } }),
            prisma_1.rawPrisma.employee.count({ where: { tenantId } }),
        ]);
        const activeBytes = storageSummary ? storageSummary.usage.activeBytes : 0;
        const trashBytes = storageSummary ? storageSummary.usage.trashBytes : 0;
        const versionBytes = storageSummary ? storageSummary.usage.versionBytes : 0;
        const reservedBytes = storageSummary ? storageSummary.usage.reservedBytes : 0;
        const totalBillableBytes = storageSummary ? storageSummary.usage.totalBillableBytes : 0;
        const physicalBytes = totalBillableBytes;
        const quotaBytes = storageSummary ? storageSummary.quota.quotaBytes : (storageLimitBytes || 10 * 1024 * 1024 * 1024);
        const availableBytes = storageSummary ? storageSummary.usage.availableBytes : Math.max(0, quotaBytes - activeBytes);
        const storagePercentage = storageSummary ? storageSummary.usage.percentUsed : (quotaBytes > 0 ? Math.min(100, (activeBytes / quotaBytes) * 100) : 0);
        const thresholdState = storageSummary ? storageSummary.usage.thresholdState : "NORMAL";
        const totalRecords = attCount + saleCount + leadCount + taskCount + ticketCount + empCount;
        const databaseBytes = 1024 * 1024 * 2 + totalRecords * 2048;
        const catMap = new Map((storageSummary?.categories || []).map((c) => [c.category, c]));
        const imagesBytes = catMap.get("Images")?.bytes || 0;
        const docsBytes = catMap.get("Documents")?.bytes || 0;
        const videoBytes = catMap.get("Videos")?.bytes || 0;
        const audioBytes = catMap.get("Audio")?.bytes || 0;
        const otherFileBytes = (storageSummary?.categories || []).filter((c) => !["Images", "Documents", "Videos", "Audio"].includes(c.category)).reduce((acc, c) => acc + c.bytes, 0);
        const totalUsedBytes = activeBytes;
        const remainingBytes = availableBytes;
        // B. User and Login Activity
        const loginHistories = await prisma_1.rawPrisma.loginHistory.findMany({
            where: {
                user: { profile: { tenantId } },
                ...(dateFilter ? { date: dateFilter } : {}),
            },
            select: { date: true, userId: true },
            orderBy: { date: "desc" },
        });
        const totalLogins = loginHistories.length;
        const lastLogin = loginHistories[0]?.date || null;
        // Calculate Peak Usage Window if login records exist
        let peakUsageWindow = null;
        if (loginHistories.length >= 2) {
            const hourBuckets = new Array(24).fill(0);
            loginHistories.forEach((lh) => {
                const hour = new Date(lh.date).getHours();
                hourBuckets[hour]++;
            });
            let maxHour = 10;
            let maxCount = 0;
            for (let h = 0; h < 24; h++) {
                const windowCount = hourBuckets[h] + hourBuckets[(h + 1) % 24];
                if (windowCount > maxCount) {
                    maxCount = windowCount;
                    maxHour = h;
                }
            }
            const formatHour = (h) => {
                const period = h >= 12 ? "PM" : "AM";
                const hour12 = h % 12 === 0 ? 12 : h % 12;
                return `${hour12}:00 ${period}`;
            };
            peakUsageWindow = `${formatHour(maxHour)} – ${formatHour((maxHour + 2) % 24)}`;
        }
        // Active users: unique user logins in period, or minimum 1 if profiles exist
        const totalUsers = tenant._count.profiles || tenant._count.userRoles || 1;
        const uniqueActiveUserIds = new Set(loginHistories.map((lh) => lh.userId));
        const activeUsers = Math.max(uniqueActiveUserIds.size, totalUsers > 0 ? 1 : 0);
        // C. Most Module Usage during the period
        const [attPeriodCount, leavePeriodCount, payrollPeriodCount, salesPeriodCount, leadPeriodCount, taskPeriodCount, ticketPeriodCount] = await Promise.all([
            prisma_1.rawPrisma.attendance.count({ where: { tenantId, ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
            prisma_1.rawPrisma.leaveRequest.count({ where: { tenantId, ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
            prisma_1.rawPrisma.payrollRun.count({ where: { tenantId, ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
            prisma_1.rawPrisma.sale.count({ where: { tenantId, ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
            prisma_1.rawPrisma.crmLead.count({ where: { tenantId, ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
            prisma_1.rawPrisma.projectTask.count({ where: { tenantId, ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
            prisma_1.rawPrisma.helpdeskTicket.count({ where: { tenantId, ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
        ]);
        const moduleUsageRecords = [
            { name: "HRM & Attendance", key: "hrm", actionCount: attPeriodCount + leavePeriodCount + payrollPeriodCount },
            { name: "POS & Sales", key: "pos", actionCount: salesPeriodCount },
            { name: "CRM & Pipeline", key: "crm", actionCount: leadPeriodCount },
            { name: "Projects & Tasks", key: "project", actionCount: taskPeriodCount },
            { name: "Support Desk", key: "support", actionCount: ticketPeriodCount },
        ];
        const activeModuleUsage = moduleUsageRecords
            .filter((m) => m.actionCount > 0)
            .sort((a, b) => b.actionCount - a.actionCount);
        // D. Notifications Telemetry (Real database events from SubscriptionNotificationEvent)
        const notificationEvents = await prisma_1.rawPrisma.subscriptionNotificationEvent.findMany({
            where: { tenantId },
            select: { status: true },
        });
        let emailsSent = 0;
        let emailsFailed = 0;
        notificationEvents.forEach((n) => {
            if (n.status === "sent")
                emailsSent++;
            if (n.status === "failed")
                emailsFailed++;
        });
        // Account Status
        const isSuspended = sub?.status === "suspended";
        const isExpired = sub?.status === "expired" || (sub?.expiresAt && new Date(sub.expiresAt).getTime() < Date.now());
        const accountStatus = isSuspended ? "Suspended" : isExpired ? "Expired" : "Active";
        return {
            profile: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                domainUrl: `${tenant.slug}.${(0, workspace_host_1.getBaseDomain)()}`,
                logoUrl: tenant.logoUrl || null,
                plan: planName,
                billingCycle: sub?.billingCycle || "monthly",
                status: accountStatus,
                createdAt: tenant.createdAt.toISOString(),
                updatedAt: (sub?.updatedAt || tenant.createdAt).toISOString(),
            },
            storage: {
                totalUsedBytes,
                totalUsedFormatted: formatBytes(totalUsedBytes),
                totalLimitBytes: quotaBytes,
                totalLimitFormatted: formatBytes(quotaBytes),
                remainingBytes,
                remainingFormatted: formatBytes(remainingBytes),
                storagePercentage,
                activeBytes,
                formattedActive: formatBytes(activeBytes),
                trashBytes,
                formattedTrash: formatBytes(trashBytes),
                versionBytes,
                formattedVersion: formatBytes(versionBytes),
                reservedBytes,
                formattedReserved: formatBytes(reservedBytes),
                physicalBytes,
                formattedPhysical: formatBytes(physicalBytes),
                totalBillableBytes,
                formattedTotalBillable: formatBytes(totalBillableBytes),
                thresholdState,
                quotaSource: storageSummary?.quota?.quotaSource || "PLAN",
                categories: {
                    database: { bytes: databaseBytes, formatted: formatBytes(databaseBytes) },
                    images: { bytes: imagesBytes, formatted: formatBytes(imagesBytes) },
                    documents: { bytes: docsBytes, formatted: formatBytes(docsBytes) },
                    videos: { bytes: videoBytes, formatted: formatBytes(videoBytes) },
                    audio: { bytes: audioBytes, formatted: formatBytes(audioBytes) },
                    other: { bytes: otherFileBytes, formatted: formatBytes(otherFileBytes) },
                },
                departmentBreakdown,
                topUsers: storageSummary?.topUsers || [],
                teams: storageSummary?.teams || [],
                recentActivities: recentActivities || [],
                forecast,
                growthHistory,
                lastReconciledAt: null,
            },
            userActivity: {
                activeUsers,
                totalUsers,
                activeEmployees: empCount,
                totalEmployees: empCount,
                totalLogins,
                lastLoginAt: lastLogin ? lastLogin.toISOString() : null,
                averageSessionDuration: null, // Session duration not tracked in database — returns null for 'Not available'
                peakUsageTime: peakUsageWindow, // Computed 2-hour window or null if insufficient data
                reportingPeriod: period,
            },
            moduleUsage: {
                reportingPeriod: period,
                records: activeModuleUsage,
            },
            notifications: {
                emailsSent,
                emailsFailed,
                push: null, // Outbound push carrier not configured
                sms: null, // Outbound SMS carrier not configured
            },
        };
    }
}
exports.TenantUsageMetricsService = TenantUsageMetricsService;
