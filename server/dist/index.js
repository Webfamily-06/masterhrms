"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") }); // project root .env
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env"), override: true }); // server/.env (override)
dotenv_1.default.config(); // cwd fallback
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const auth_routes_1 = require("./routes/auth.routes");
const workspace_routes_1 = require("./routes/workspace.routes");
const workspace_routing_routes_1 = require("./routes/workspace-routing.routes");
const tenant_domain_routes_1 = require("./routes/tenant-domain.routes");
const workspace_host_middleware_1 = require("./middleware/workspace-host.middleware");
const workspace_host_1 = require("./lib/workspace-host");
const prisma_1 = require("./prisma");
const prisma = prisma_1.rawPrisma || prisma_1.prisma;
const cms_routes_1 = require("./routes/cms.routes");
const dashboard_routes_1 = require("./routes/dashboard.routes");
const employees_routes_1 = require("./routes/employees.routes");
const attendance_routes_1 = require("./routes/attendance.routes");
const leave_routes_1 = require("./routes/leave.routes");
const payroll_routes_1 = require("./routes/payroll.routes");
const payroll_phase1_routes_1 = require("./routes/payroll-phase1.routes");
const bank_disbursement_routes_1 = require("./routes/bank-disbursement.routes");
const statutory_returns_routes_1 = require("./routes/statutory-returns.routes");
const invoices_routes_1 = require("./routes/invoices.routes");
const crm_routes_1 = require("./routes/crm.routes");
const super_routes_1 = require("./routes/super.routes");
const addons_routes_1 = require("./routes/addons.routes");
const email_routes_1 = require("./routes/email.routes");
const user_email_accounts_routes_1 = require("./routes/user-email-accounts.routes");
const okr_routes_1 = require("./routes/okr.routes");
const assets_routes_1 = require("./routes/assets.routes");
const recruitment_routes_1 = require("./routes/recruitment.routes");
const shifts_routes_1 = require("./routes/shifts.routes");
const expenses_routes_1 = require("./routes/expenses.routes");
const training_routes_1 = require("./routes/training.routes");
const offboarding_routes_1 = require("./routes/offboarding.routes");
const documents_routes_1 = require("./routes/documents.routes");
const fbp_routes_1 = require("./routes/fbp.routes");
const helpdesk_routes_1 = require("./routes/helpdesk.routes");
const platform_support_routes_1 = require("./routes/platform-support.routes");
const announcements_routes_1 = require("./routes/announcements.routes");
const forms_routes_1 = require("./routes/forms.routes");
const compliance_routes_1 = require("./routes/compliance.routes");
const biometric_routes_1 = require("./routes/biometric.routes");
const accounting_routes_1 = __importDefault(require("./routes/accounting.routes"));
const ai_routes_1 = require("./routes/ai.routes");
const products_routes_1 = require("./routes/products.routes");
const sales_routes_1 = require("./routes/sales.routes");
const customers_routes_1 = require("./routes/customers.routes");
const chat_routes_1 = require("./routes/chat.routes");
const qz_routes_1 = require("./routes/qz.routes");
const transfers_routes_1 = require("./routes/transfers.routes");
const ecommerce_routes_1 = require("./routes/ecommerce.routes");
const integration_routes_1 = require("./routes/integration.routes");
const strategy_studio_routes_1 = require("./routes/strategy-studio.routes");
const woocommerce_routes_1 = require("./routes/woocommerce.routes");
const shopify_routes_1 = require("./routes/shopify.routes");
const alerts_routes_1 = require("./routes/alerts.routes");
const webhook_retry_worker_1 = require("./modules/outbound-webhooks/webhook-retry.worker");
const projects_routes_1 = require("./routes/projects.routes");
const suppliers_routes_1 = require("./routes/suppliers.routes");
const purchases_routes_1 = require("./routes/purchases.routes");
const adjustments_routes_1 = require("./routes/adjustments.routes");
const payments_routes_1 = require("./routes/payments.routes");
const docs_routes_1 = require("./routes/docs.routes");
const returns_routes_1 = require("./routes/returns.routes");
const client_routes_1 = require("./routes/client.routes");
const awards_routes_1 = require("./routes/awards.routes");
const warnings_routes_1 = require("./routes/warnings.routes");
const workflows_routes_1 = require("./routes/workflows.routes");
const hrm_extensions_routes_1 = require("./routes/hrm-extensions.routes");
const budgets_routes_1 = require("./routes/budgets.routes");
const custom_fields_routes_1 = require("./routes/custom-fields.routes");
const campaigns_routes_1 = require("./routes/campaigns.routes");
const todos_routes_1 = require("./routes/todos.routes");
const notes_routes_1 = require("./routes/notes.routes");
const calendar_routes_1 = require("./routes/calendar.routes");
const pusher_routes_1 = require("./routes/pusher.routes");
const subscription_1 = require("./middleware/subscription");
const maintenance_1 = require("./middleware/maintenance");
const billing_routes_1 = require("./routes/billing.routes");
const ai_assistant_routes_1 = __importDefault(require("./routes/ai-assistant.routes"));
const ai_document_routes_1 = __importDefault(require("./routes/ai-document.routes"));
const planning_strategy_routes_1 = __importDefault(require("./routes/planning-strategy.routes"));
const commerce_routes_1 = require("./routes/commerce.routes");
const timesheets_routes_1 = require("./routes/timesheets.routes");
const settings_routes_1 = require("./routes/settings.routes");
const media_routes_1 = require("./routes/media.routes");
const app_config_routes_1 = require("./routes/app-config.routes");
const employee_self_service_routes_1 = require("./routes/employee-self-service.routes");
const company_profile_routes_1 = require("./routes/company-profile.routes");
const settings_service_1 = require("./services/settings/settings.service");
const media_service_1 = require("./services/media/media.service");
const uploads_security_middleware_1 = require("./middleware/uploads-security.middleware");
const platform_foundation_routes_1 = require("./routes/platform-foundation.routes");
const outbox_service_1 = require("./services/outbox.service");
const security_hardening_middleware_1 = require("./middleware/security-hardening.middleware");
const config_audit_service_1 = require("./services/config-audit.service");
const two_factor_routes_1 = require("./modules/two-factor-auth/two-factor.routes");
const backup_restore_routes_1 = require("./modules/backup-restore/backup-restore.routes");
const activity_logs_routes_1 = require("./modules/activity-logs/activity-logs.routes");
const internal_reminders_routes_1 = require("./modules/internal-reminders/internal-reminders.routes");
const public_api_routes_1 = require("./modules/public-api/public-api.routes");
const notice_board_routes_1 = require("./modules/notice-board/notice-board.routes");
const outbound_webhooks_routes_1 = require("./modules/outbound-webhooks/outbound-webhooks.routes");
const sms_gateway_routes_1 = require("./modules/sms-gateway/sms-gateway.routes");
const smart_dashboard_routes_1 = require("./routes/smart-dashboard.routes");
const smart_reports_routes_1 = require("./routes/smart-reports.routes");
const ai_business_advisor_routes_1 = require("./routes/ai-business-advisor.routes");
const suggestion_box_routes_1 = require("./routes/suggestion-box.routes");
const unified_catalog_service_1 = require("./services/unified-catalog.service");
const http_1 = __importDefault(require("http"));
const socket_1 = require("./socket");
const biometric_sync_1 = require("./cron/biometric-sync");
const biometric_reconcile_cron_1 = require("./cron/biometric-reconcile.cron");
const subscription_reminder_cron_1 = require("./cron/subscription-reminder.cron");
const calendar_reminder_scheduler_1 = require("./services/calendar-reminder.scheduler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";
// Enable reverse-proxy header trust (X-Forwarded-For, X-Forwarded-Proto) for Nginx / Cloudflare
app.set("trust proxy", 1);
app.use(security_hardening_middleware_1.securityHeadersMiddleware);
// CORS setup
const defaultAllowedOrigins = process.env.NODE_ENV === "production"
    ? "https://masterhrms.com,https://www.masterhrms.com,https://staging.masterhrms.com"
    : "http://localhost:5173,http://localhost:3000,http://localhost:8080";
const allowedOrigins = (process.env.CORS_ORIGIN || defaultAllowedOrigins)
    .split(",")
    .map((s) => s.trim());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === "development") {
            return callback(null, true);
        }
        try {
            const url = new URL(origin);
            const host = url.hostname.toLowerCase();
            const baseDomain = (0, workspace_host_1.getBaseDomain)().toLowerCase();
            // Allow localhost and *.localhost
            if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1") {
                return callback(null, true);
            }
            // Allow configured BASE_DOMAIN and *.{BASE_DOMAIN}
            if (host === baseDomain || host.endsWith(`.${baseDomain}`)) {
                return callback(null, true);
            }
            // Allow active verified & approved custom domains (Flow 2)
            const cachedCustom = (0, workspace_host_1.getCachedCustomDomain)(host);
            if (cachedCustom && cachedCustom.status === "approved" && cachedCustom.dnsStatus === "verified") {
                return callback(null, true);
            }
        }
        catch { }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));
app.post("/api/payments/razorpay/webhook", express_1.default.raw({ type: "application/json" }), payments_routes_1.razorpayWebhookHandler);
app.use(express_1.default.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
// NOTE: Do NOT include "multipart/*" or "*/*" here — multer handles multipart/form-data
// and express.text consuming it first causes "Unexpected end of form" errors in multer.
app.use(express_1.default.text({
    type: (req) => {
        const ct = req.headers["content-type"] || "";
        // Skip multipart — let multer handle it
        if (ct.startsWith("multipart/"))
            return false;
        // Match text/* and application/octet-stream only
        return ct.startsWith("text/") || ct === "application/octet-stream";
    },
}));
app.use("/uploads", uploads_security_middleware_1.uploadsSecurityMiddleware, express_1.default.static((0, media_service_1.getUploadsRoot)(), {
    maxAge: "7d",
    etag: true,
    lastModified: true,
    fallthrough: false,
}));
app.use((0, compression_1.default)()); // Gzip all responses — 60-80% smaller payloads
app.use(workspace_host_middleware_1.workspaceHostMiddleware); // Host resolution early in the pipeline
app.use(maintenance_1.maintenanceMiddleware);
app.use("/api", subscription_1.requireActiveSubscription);
let isShuttingDown = false;
app.use((req, res, next) => {
    if (isShuttingDown && !req.path.startsWith("/api/health/live")) {
        res.setHeader("Connection", "close");
        return res.status(503).json({ error: "Server is undergoing graceful shutdown." });
    }
    next();
});
// Liveness Check (Process alive check without external dependency)
app.get(["/api/health/live", "/health/live"], (_req, res) => {
    if (isShuttingDown) {
        return res.status(503).json({ status: "shutting_down", uptime: process.uptime() });
    }
    return res.status(200).json({
        status: "alive",
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        service: "Master HRMS API",
    });
});
// Readiness Check (Database dependency verification)
app.get(["/api/health/ready", "/health/ready"], async (_req, res) => {
    if (isShuttingDown) {
        return res.status(503).json({ status: "not_ready", error: "Server is shutting down" });
    }
    const timeoutMs = 3000;
    const startTime = Date.now();
    try {
        const dbPingPromise = (async () => {
            await prisma.$queryRawUnsafe("SELECT 1");
            return Date.now() - startTime;
        })();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Database readiness ping timed out")), timeoutMs));
        const latencyMs = await Promise.race([dbPingPromise, timeoutPromise]);
        return res.status(200).json({
            status: "ready",
            timestamp: new Date().toISOString(),
            database: { status: "connected", latencyMs },
        });
    }
    catch {
        return res.status(503).json({
            status: "not_ready",
            timestamp: new Date().toISOString(),
            database: { status: "disconnected" },
            error: "Primary database readiness check failed",
        });
    }
});
// Health Check (Deep Observability & Outbox Health)
app.get(["/api/health", "/health"], async (_req, res) => {
    const timeoutMs = 3000;
    const startTime = Date.now();
    try {
        // 1. Primary Database Ping with bounded timeout
        const dbPingPromise = (async () => {
            await prisma.$queryRawUnsafe("SELECT 1");
            return Date.now() - startTime;
        })();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Database ping timed out")), timeoutMs));
        const latencyMs = await Promise.race([dbPingPromise, timeoutPromise]);
        // 2. Query Commerce Outbox metrics
        let pendingOutbox = 0;
        let failedOutbox = 0;
        try {
            const [pending, failed] = await Promise.all([
                prisma.outboxEvent.count({ where: { status: "PENDING" } }),
                prisma.outboxEvent.count({ where: { status: "FAILED" } }),
            ]);
            pendingOutbox = pending;
            failedOutbox = failed;
        }
        catch {
            // Outbox query failure does not crash DB status but is flagged
        }
        return res.status(200).json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            service: "Master HRMS API",
            database: {
                status: "connected",
                latencyMs,
            },
            commerceOutbox: {
                status: failedOutbox > 10 ? "degraded" : "operational",
                pendingCount: pendingOutbox,
                failedCount: failedOutbox,
            },
        });
    }
    catch {
        // Fail-safe closed: return 503 without leaking credentials, SQL errors, or internal hostnames
        return res.status(503).json({
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            service: "Master HRMS API",
            database: {
                status: "disconnected",
            },
            error: "Primary database health check failed",
        });
    }
});
// Settings & Media & App-Config (Phase 1)
app.use("/api/v1/settings", settings_routes_1.settingsRouter);
app.use("/api/v1/media", media_routes_1.mediaRouter);
app.use("/api/v1/public", app_config_routes_1.appConfigRouter);
app.use("/api/public", app_config_routes_1.appConfigRouter);
app.use("/api", app_config_routes_1.appConfigRouter);
// Employee Self-Service (ESS) Routes (/api/v1/me & /api/me)
app.use("/api/v1/me", employee_self_service_routes_1.employeeSelfServiceRouter);
app.use("/api/me", employee_self_service_routes_1.employeeSelfServiceRouter);
// Company Profile & GST (Phase 2 Wave 2.1)
app.use("/api/v1/company-profile", company_profile_routes_1.companyProfileRouter);
app.use("/api/company-profile", company_profile_routes_1.companyProfileRouter);
// Mount Routes
app.use("/api/billing", billing_routes_1.billingRouter);
app.use("/api/commerce", commerce_routes_1.commerceRouter);
app.post("/api/webhooks/razorpay", billing_routes_1.handleRazorpayWebhook);
app.use("/api/auth", security_hardening_middleware_1.authRateLimiter, auth_routes_1.authRouter);
app.use("/api/workspace/custom-domain", tenant_domain_routes_1.tenantDomainRouter);
app.use("/api/workspace", workspace_routing_routes_1.workspaceRoutingRouter);
app.use("/api", workspace_routing_routes_1.workspaceRoutingRouter);
app.use("/api/workspace", workspace_routes_1.workspaceRouter);
app.use("/api/cms", cms_routes_1.cmsRouter);
app.use("/api/dashboard", dashboard_routes_1.dashboardRouter); // Aggregation endpoint — replaces N individual calls
app.use("/api/employees", employees_routes_1.employeesRouter);
app.use("/api/attendance", attendance_routes_1.attendanceRouter);
app.use("/api/leave", leave_routes_1.leaveRouter);
app.use("/api/leaves", leave_routes_1.leaveRouter);
app.use("/api/awards", awards_routes_1.awardsRouter);
app.use("/api/warnings", warnings_routes_1.warningsRouter);
app.use("/api/payroll", payroll_routes_1.payrollRouter);
app.use("/api/payroll", payroll_phase1_routes_1.payrollPhase1Router);
app.use("/api/payroll/disbursement", bank_disbursement_routes_1.bankDisbursementRouter);
app.use("/api/payroll/statutory", statutory_returns_routes_1.statutoryReturnsRouter);
app.use("/api/invoices", invoices_routes_1.invoicesRouter);
app.use("/api/crm", crm_routes_1.crmRouter);
app.use("/api/super", super_routes_1.superRouter);
app.use("/api/addons", addons_routes_1.addonsRouter);
app.use("/api/addons/okr", okr_routes_1.okrRouter);
app.use("/api/addons/assets", assets_routes_1.assetsRouter);
app.use("/api/v1/two-factor-auth", two_factor_routes_1.twoFactorRouter);
app.use("/api/two-factor-auth", two_factor_routes_1.twoFactorRouter);
app.use("/api/v1/backup-restore", backup_restore_routes_1.backupRestoreRouter);
app.use("/api/backup-restore", backup_restore_routes_1.backupRestoreRouter);
app.use("/api/v1/activity-logs", activity_logs_routes_1.activityLogsRouter);
app.use("/api/activity-logs", activity_logs_routes_1.activityLogsRouter);
app.use("/api/v1/reminders", internal_reminders_routes_1.internalRemindersRouter);
app.use("/api/reminders", internal_reminders_routes_1.internalRemindersRouter);
app.use("/api/v1/internal-reminders", internal_reminders_routes_1.internalRemindersRouter);
app.use("/api/internal-reminders", internal_reminders_routes_1.internalRemindersRouter);
app.use("/api/v1/public-api", public_api_routes_1.publicApiRouter);
app.use("/api/public-api", public_api_routes_1.publicApiRouter);
app.use("/api/v1/notice-board", notice_board_routes_1.noticeBoardRouter);
app.use("/api/notice-board", notice_board_routes_1.noticeBoardRouter);
app.use("/api/v1/addons/webhook", outbound_webhooks_routes_1.outboundWebhooksRouter);
app.use("/api/v1/webhook", outbound_webhooks_routes_1.outboundWebhooksRouter);
app.use("/api/v1/outbound-webhooks", outbound_webhooks_routes_1.outboundWebhooksRouter);
app.use("/api/outbound-webhooks", outbound_webhooks_routes_1.outboundWebhooksRouter);
app.use("/api/v1/addons/ai-assistant", ai_assistant_routes_1.default);
app.use("/api/addons/ai-assistant", ai_assistant_routes_1.default);
app.use("/api/v1/addons/ai-document", ai_document_routes_1.default);
app.use("/api/addons/ai-document", ai_document_routes_1.default);
app.use("/api/v1/addons/planning", planning_strategy_routes_1.default);
app.use("/api/addons/planning", planning_strategy_routes_1.default);
app.use("/api/v1/sms-gateway", sms_gateway_routes_1.smsGatewayRouter);
app.use("/api/sms-gateway", sms_gateway_routes_1.smsGatewayRouter);
app.use("/api/v1/suggestion-box", suggestion_box_routes_1.suggestionBoxRouter);
app.use("/api/suggestion-box", suggestion_box_routes_1.suggestionBoxRouter);
app.use("/api/recruitment", recruitment_routes_1.recruitmentRouter);
app.use("/api/addons/recruitment", recruitment_routes_1.recruitmentRouter);
app.use("/api/public/jobs", recruitment_routes_1.publicJobsRouter);
app.use("/api/shifts", shifts_routes_1.shiftsRouter);
app.use("/api/expenses", expenses_routes_1.expensesRouter);
app.use("/api/training", training_routes_1.trainingRouter);
app.use("/api/offboarding", offboarding_routes_1.offboardingRouter);
app.use("/api/documents", documents_routes_1.documentsRouter);
app.use("/api/fbp", fbp_routes_1.fbpRouter);
app.use("/api/helpdesk", helpdesk_routes_1.helpdeskRouter);
app.use("/api/support/platform", platform_support_routes_1.platformSupportRouter);
app.use("/api/announcements", announcements_routes_1.announcementsRouter);
app.use("/api/forms", forms_routes_1.formsRouter);
app.use("/api/compliance", compliance_routes_1.complianceRouter);
app.use("/api/accounting", accounting_routes_1.default);
app.use("/api/ai", ai_routes_1.aiRouter);
app.use("/api/products", products_routes_1.productsRouter);
app.use("/api/sales", sales_routes_1.salesRouter);
app.use("/api/customers", customers_routes_1.customersRouter);
app.use("/api/chat", chat_routes_1.chatRouter);
app.use("/api/biometric", biometric_routes_1.biometricRouter);
app.use("/api/public/biometric", biometric_routes_1.publicBiometricRouter);
app.use("/iclock", biometric_routes_1.iclockRouter);
app.use("/api/qz", qz_routes_1.qzRouter);
app.use("/api/transfers", transfers_routes_1.transfersRouter);
app.use("/api/ecommerce", ecommerce_routes_1.ecommerceRouter);
app.use("/api/integrations", integration_routes_1.integrationRouter);
app.use("/api/strategy-studio", strategy_studio_routes_1.strategyStudioRouter);
app.use("/api/woocommerce", woocommerce_routes_1.woocommerceRouter);
app.use("/api/shopify", shopify_routes_1.shopifyRouter);
app.use("/api/alerts", alerts_routes_1.alertsRouter);
app.use("/api/projects", projects_routes_1.projectsRouter);
app.use("/api/suppliers", suppliers_routes_1.suppliersRouter);
app.use("/api/purchases", purchases_routes_1.purchasesRouter);
app.use("/api/adjustments", adjustments_routes_1.adjustmentsRouter);
app.use("/api/payments", payments_routes_1.paymentsRouter);
app.use("/api/docs", docs_routes_1.docsRouter);
app.use("/api/returns", returns_routes_1.returnsRouter);
app.use("/api/client", client_routes_1.clientRouter);
app.use("/api/timesheets", timesheets_routes_1.timesheetsRouter);
app.use("/api/workflows", workflows_routes_1.workflowsRouter);
app.use("/api/overtime", hrm_extensions_routes_1.overtimeRouter);
app.use("/api/wfh", hrm_extensions_routes_1.wfhRouter);
app.use("/api/promotions", hrm_extensions_routes_1.promotionRouter);
app.use("/api/probation", hrm_extensions_routes_1.probationRouter);
app.use("/api/budgets", budgets_routes_1.budgetsRouter);
app.use("/api/provident-funds", hrm_extensions_routes_1.providentFundRouter);
app.use("/api/banned-ips", hrm_extensions_routes_1.bannedIpRouter);
app.use("/api/system", hrm_extensions_routes_1.systemMaintenanceRouter);
app.use("/api/custom-fields", custom_fields_routes_1.customFieldsRouter);
app.use("/api/campaigns", campaigns_routes_1.campaignsRouter);
app.use("/api/todos", todos_routes_1.todosRouter);
app.use("/api/notes", notes_routes_1.notesRouter);
app.use("/api/calendar", calendar_routes_1.calendarRouter);
app.use("/api/pusher", pusher_routes_1.pusherRouter);
app.use("/api/email", email_routes_1.emailRouter);
app.use("/api/user/email-accounts", user_email_accounts_routes_1.userEmailAccountsRouter);
app.use("/api/smart-dashboard", smart_dashboard_routes_1.smartDashboardRouter);
app.use("/api/smart-reports", smart_reports_routes_1.smartReportsRouter);
app.use("/api/ai-business-advisor", ai_business_advisor_routes_1.aiBusinessAdvisorRouter);
// Platform Foundation APIs (v1 & unversioned alias)
app.use("/api/v1", platform_foundation_routes_1.platformFoundationRouter);
app.use("/api", platform_foundation_routes_1.platformFoundationRouter);
// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    const isHardened = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging";
    const rawMsg = String(err?.message || "");
    const isSensitive = rawMsg.includes("prisma") ||
        rawMsg.includes("SELECT ") ||
        rawMsg.includes("database") ||
        rawMsg.includes("postgres") ||
        rawMsg.includes("connect") ||
        rawMsg.includes("password");
    const clientError = isHardened && isSensitive ? "Internal server error" : (rawMsg || "Internal server error");
    res.status(err.status || 500).json({ error: clientError });
});
const server = http_1.default.createServer(app);
// Wave 2.3 — Nightly Biometric Reconciliation Cron (02:00 AM IST daily)
// Replays offline buffer, resolves unmatched logs, and computes monthly LOP.
function scheduleNightlyReconciliation() {
    const now = new Date();
    // Target: next 02:00 IST = 20:30 UTC previous day
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + IST_OFFSET_MS);
    const next2AM = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate(), 2, 0, 0, 0));
    // next2AM is in "IST calendar" but stored as UTC — convert back to real UTC
    let msUntilNext = (next2AM.getTime() - IST_OFFSET_MS) - now.getTime();
    if (msUntilNext <= 0)
        msUntilNext += 24 * 60 * 60 * 1000; // push to tomorrow
    setTimeout(async () => {
        await (0, biometric_reconcile_cron_1.runBiometricReconciliation)();
        scheduleNightlyReconciliation(); // reschedule for next day
    }, msUntilNext);
    console.log(`⏰ Biometric reconciliation scheduled in ${Math.round(msUntilNext / 60000)} min`);
}
// Centralized Subscription Expiry Reminders Cron (08:00 UTC daily)
function scheduleDailySubscriptionReminders() {
    const now = new Date();
    const next8AM = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0, 0, 0));
    let msUntilNext = next8AM.getTime() - now.getTime();
    if (msUntilNext <= 0)
        msUntilNext += 24 * 60 * 60 * 1000;
    setTimeout(async () => {
        try {
            console.log("⏰ [CRON] Executing scheduled daily subscription expiry reminders...");
            const result = await (0, subscription_reminder_cron_1.runSubscriptionExpiryRemindersCron)();
            console.log("✅ [CRON] Daily subscription reminders finished:", result);
        }
        catch (err) {
            console.error("❌ [CRON] Daily subscription reminders failed:", err.message);
        }
        scheduleDailySubscriptionReminders();
    }, msUntilNext);
    console.log(`⏰ Daily Subscription Expiry Reminders scheduled in ${Math.round(msUntilNext / 60000)} min (target: 08:00 UTC)`);
}
// In serverless environments (e.g. Vercel), do NOT start persistent background workers,
// WebSocket listeners, or infinite interval timers which cause FUNCTION_INVOCATION_FAILED.
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
    (0, socket_1.initSocket)(server, allowedOrigins);
    // Start Transactional Outbox Background Processor (Every 3 seconds)
    outbox_service_1.OutboxService.startProcessor(3000);
    // Start Outbound Webhook Background Retry Worker (Every 5 seconds)
    webhook_retry_worker_1.WebhookRetryWorker.start(5000);
    // Start Biometric Auto-Sync Cron (Every 30 mins)
    setInterval(() => {
        (0, biometric_sync_1.runBiometricAutoSync)();
    }, 30 * 60 * 1000);
    scheduleNightlyReconciliation();
    scheduleDailySubscriptionReminders();
    calendar_reminder_scheduler_1.CalendarReminderScheduler.start();
    server.listen(Number(PORT), HOST, async () => {
        console.log(`🚀 Master HRMS Backend Server running on http://${HOST}:${PORT}`);
        console.log(`🔌 Database Provider: Supabase PostgreSQL (Prisma ORM connected)`);
        console.log(`⚡ WebSocket Server: Ready on ws://${HOST}:${PORT}`);
        try {
            await settings_service_1.SettingsService.ensureDefaultSettings();
            console.log(`⚙️ [STARTUP] Platform default settings verified in database.`);
            await unified_catalog_service_1.UnifiedCatalogService.ensureCanonicalAddonsInDb();
            console.log(`📦 [STARTUP] Canonical Add-ons verified in database.`);
            const audit = config_audit_service_1.ConfigAuditService.auditEnvironment();
            console.log(`🛡️ [CONFIG AUDIT] Score: ${audit.score}/100 | Pass: ${audit.summary.passed} | Warn: ${audit.summary.warnings} | Fail: ${audit.summary.failures}`);
        }
        catch (err) {
            console.error(`⚠️ [STARTUP] Initialization warning:`, err?.message || err);
        }
    });
}
// Graceful Process Shutdown Handler (SIGTERM & SIGINT)
const handleGracefulShutdown = async (signal) => {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    console.log(`\n🛑 [SHUTDOWN] Received ${signal}. Initiating graceful termination sequence...`);
    // Allow 10s grace period for in-flight connections to complete
    const forceKillTimer = setTimeout(() => {
        console.error("⚠️ [SHUTDOWN] Grace period exceeded. Forcing exit.");
        process.exit(1);
    }, 10000);
    if (forceKillTimer.unref)
        forceKillTimer.unref();
    server.close(async () => {
        console.log("🛑 [SHUTDOWN] HTTP listener closed to new connections.");
        try {
            // 1. Terminate background outbox worker
            outbox_service_1.OutboxService.stopProcessor();
            calendar_reminder_scheduler_1.CalendarReminderScheduler.stop();
            console.log("🛑 [SHUTDOWN] Background outbox and calendar reminder schedulers halted.");
            // 2. Disconnect Prisma pool
            await prisma.$disconnect();
            console.log("🛑 [SHUTDOWN] Database pool disconnected cleanly.");
            console.log("✅ [SHUTDOWN] Graceful shutdown completed.");
            process.exit(0);
        }
        catch (shutdownErr) {
            console.error("⚠️ [SHUTDOWN] Error during shutdown:", shutdownErr?.message);
            process.exit(1);
        }
    });
};
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
// MasterHRMS Platform Server active
app.server = server;
// Crucial: CommonJS export compatibility for Vercel Serverless Function entry point
if (typeof module !== "undefined" && module.exports) {
    module.exports = app;
    module.exports.default = app;
}
exports.default = app;
