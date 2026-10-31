import path from "path";
import fs from "fs";
import crypto from "crypto";

// Centralized environment variable initialization (Development / Local environments only)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const isProduction = process.env.NODE_ENV === "production";

if (!isServerless && !isProduction) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require("dotenv");
    dotenv.config({ path: path.resolve(__dirname, "../../.env") }); // project root .env
    dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true }); // server/.env (override)
  } catch {
    // Gracefully ignore if dotenv is omitted or unresolvable
  }
}

// Global BigInt JSON serialization support for Express API boundaries
if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    const intVal = Number(this);
    return Number.isSafeInteger(intVal) ? intVal : this.toString();
  };
}

// Global process error logging (ensures crashes appear in Vercel runtime logs without secret leakage)
process.on("unhandledRejection", (reason: any) => {
  console.error("Unhandled Rejection:", reason?.message || reason, reason?.stack || "");
});

process.on("uncaughtException", (err: Error) => {
  console.error("Uncaught Exception:", err?.message || err, err?.stack || "");
});

const REQUIRED_ENV_VARS = ["DATABASE_URL", "JWT_SECRET"];
export function getMissingRequiredEnvNames(): string[] {
  return REQUIRED_ENV_VARS.filter((name) => !process.env[name] || process.env[name]?.trim() === "");
}
const missingOnStartup = getMissingRequiredEnvNames();
if (missingOnStartup.length > 0) {
  console.error("⚠️ [CONFIG] Missing required environment variables on startup:", missingOnStartup.join(", "));
}

import express from "express";
import cors from "cors";
import compression from "compression";
import { authRouter } from "./routes/auth.routes";
import { workspaceRouter } from "./routes/workspace.routes";
import { workspaceRoutingRouter } from "./routes/workspace-routing.routes";
import { tenantDomainRouter } from "./routes/tenant-domain.routes";
import { workspaceHostMiddleware } from "./middleware/workspace-host.middleware";
import { getBaseDomain, getCachedCustomDomain, setCachedCustomDomain } from "./lib/workspace-host";
import { rawPrisma, prisma as proxiedPrisma } from "./prisma";
const prisma = rawPrisma || proxiedPrisma;
import { cmsRouter } from "./routes/cms.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { employeesRouter } from "./routes/employees.routes";
import { attendanceRouter } from "./routes/attendance.routes";
import { leaveRouter } from "./routes/leave.routes";
import { payrollRouter } from "./routes/payroll.routes";
import { payrollPhase1Router } from "./routes/payroll-phase1.routes";
import { bankDisbursementRouter } from "./routes/bank-disbursement.routes";
import { statutoryReturnsRouter } from "./routes/statutory-returns.routes";
import { invoicesRouter } from "./routes/invoices.routes";
import { crmRouter } from "./routes/crm.routes";
import { superRouter } from "./routes/super.routes";
import { superStorageRouter } from "./routes/super-storage.routes";
import { tenantStorageRouter } from "./routes/tenant-storage.routes";
import { addonsRouter } from "./routes/addons.routes";
import { emailRouter } from "./routes/email.routes";
import { userEmailAccountsRouter } from "./routes/user-email-accounts.routes";
import { okrRouter } from "./routes/okr.routes";
import { assetsRouter } from "./routes/assets.routes";
import { recruitmentRouter, publicJobsRouter } from "./routes/recruitment.routes";
import { shiftsRouter } from "./routes/shifts.routes";
import { expensesRouter } from "./routes/expenses.routes";
import { trainingRouter } from "./routes/training.routes";
import { offboardingRouter } from "./routes/offboarding.routes";
import { documentsRouter } from "./routes/documents.routes";
import { fbpRouter } from "./routes/fbp.routes";
import { helpdeskRouter } from "./routes/helpdesk.routes";
import { platformSupportRouter } from "./routes/platform-support.routes";
import { announcementsRouter } from "./routes/announcements.routes";
import { formsRouter } from "./routes/forms.routes";
import { complianceRouter } from "./routes/compliance.routes";
import { biometricRouter, publicBiometricRouter, iclockRouter } from "./routes/biometric.routes";
import accountingRouter from "./routes/accounting.routes";
import { aiRouter } from "./routes/ai.routes";
import { productsRouter } from "./routes/products.routes";
import { salesRouter } from "./routes/sales.routes";
import { customersRouter } from "./routes/customers.routes";
import { chatRouter } from "./routes/chat.routes";
import { qzRouter } from "./routes/qz.routes";
import { transfersRouter } from "./routes/transfers.routes";
import { ecommerceRouter } from "./routes/ecommerce.routes";
import { integrationRouter } from "./routes/integration.routes";
import { strategyStudioRouter } from "./routes/strategy-studio.routes";
import { woocommerceRouter } from "./routes/woocommerce.routes";
import { shopifyRouter } from "./routes/shopify.routes";
import { alertsRouter } from "./routes/alerts.routes";
import { WebhookRetryWorker } from "./modules/outbound-webhooks/webhook-retry.worker";
import { projectsRouter } from "./routes/projects.routes";
import { suppliersRouter } from "./routes/suppliers.routes";
import { purchasesRouter } from "./routes/purchases.routes";
import { adjustmentsRouter } from "./routes/adjustments.routes";
import { paymentsRouter, razorpayWebhookHandler } from "./routes/payments.routes";
import { docsRouter } from "./routes/docs.routes";
import { returnsRouter } from "./routes/returns.routes";
import { clientRouter } from "./routes/client.routes";
import { awardsRouter } from "./routes/awards.routes";
import { warningsRouter } from "./routes/warnings.routes";
import { workflowsRouter } from "./routes/workflows.routes";
import { overtimeRouter, wfhRouter, promotionRouter, probationRouter, providentFundRouter, bannedIpRouter, systemMaintenanceRouter } from "./routes/hrm-extensions.routes";
import { budgetsRouter } from "./routes/budgets.routes";
import { customFieldsRouter } from "./routes/custom-fields.routes";
import { campaignsRouter } from "./routes/campaigns.routes";
import { todosRouter } from "./routes/todos.routes";
import { notesRouter } from "./routes/notes.routes";
import { calendarRouter } from "./routes/calendar.routes";
import { pusherRouter } from "./routes/pusher.routes";
import { requireActiveSubscription } from "./middleware/subscription";
import { maintenanceMiddleware } from "./middleware/maintenance";
import { billingRouter, handleRazorpayWebhook } from "./routes/billing.routes";
import aiAssistantRouter from "./routes/ai-assistant.routes";
import aiDocumentRouter from "./routes/ai-document.routes";
import planningStrategyRouter from "./routes/planning-strategy.routes";
import { commerceRouter } from "./routes/commerce.routes";
import { timesheetsRouter } from "./routes/timesheets.routes";
import { settingsRouter } from "./routes/settings.routes";
import { mediaRouter } from "./routes/media.routes";
import { filesRouter } from "./routes/files.routes";
import { publicFilesRouter } from "./routes/public-files.routes";
import { webdavRouter } from "./routes/webdav.routes";
import { appConfigRouter } from "./routes/app-config.routes";
import { employeeSelfServiceRouter } from "./routes/employee-self-service.routes";
import { companyProfileRouter } from "./routes/company-profile.routes";
import { SettingsService } from "./services/settings/settings.service";
import { getUploadsRoot } from "./services/media/media.service";
import { uploadsSecurityMiddleware } from "./middleware/uploads-security.middleware";
import { platformFoundationRouter } from "./routes/platform-foundation.routes";
import { OutboxService } from "./services/outbox.service";
import { securityHeadersMiddleware, authRateLimiter } from "./middleware/security-hardening.middleware";
import { ConfigAuditService } from "./services/config-audit.service";
import { twoFactorRouter } from "./modules/two-factor-auth/two-factor.routes";
import { backupRestoreRouter } from "./modules/backup-restore/backup-restore.routes";
import { activityLogsRouter } from "./modules/activity-logs/activity-logs.routes";
import { internalRemindersRouter } from "./modules/internal-reminders/internal-reminders.routes";
import { publicApiRouter } from "./modules/public-api/public-api.routes";
import { noticeBoardRouter } from "./modules/notice-board/notice-board.routes";
import { outboundWebhooksRouter } from "./modules/outbound-webhooks/outbound-webhooks.routes";
import { smsGatewayRouter } from "./modules/sms-gateway/sms-gateway.routes";
import { smartDashboardRouter } from "./routes/smart-dashboard.routes";
import { smartReportsRouter } from "./routes/smart-reports.routes";
import { aiBusinessAdvisorRouter } from "./routes/ai-business-advisor.routes";
import { suggestionBoxRouter } from "./routes/suggestion-box.routes";
import { UnifiedCatalogService } from "./services/unified-catalog.service";

import http from "http";
import { initSocket } from "./socket";
import { runBiometricAutoSync } from "./cron/biometric-sync";
import { runBiometricReconciliation } from "./cron/biometric-reconcile.cron";
import { runSubscriptionExpiryRemindersCron } from "./cron/subscription-reminder.cron";
import { CalendarReminderScheduler } from "./services/calendar-reminder.scheduler";

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";

// Enable reverse-proxy header trust (X-Forwarded-For, X-Forwarded-Proto) for Nginx / Cloudflare
app.set("trust proxy", 1);

app.use(securityHeadersMiddleware);

// CORS setup
const defaultAllowedOrigins = process.env.NODE_ENV === "production"
  ? "https://masterhrms.com,https://staging.masterhrms.com,https://masterhrms.vercel.app,https://www.masterhrms.com"
  : "http://localhost:5173,http://localhost:3000,http://localhost:8080";
const allowedOrigins = (process.env.CORS_ORIGIN || defaultAllowedOrigins)
  .split(",")
  .map((s) => s.trim());

function isOriginAllowed(origin: string): boolean {
  if (allowedOrigins.indexOf(origin) !== -1) {
    return true;
  }
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    const baseDomain = getBaseDomain().toLowerCase();

    // Allow localhost and *.localhost only in non-production
    if (process.env.NODE_ENV !== "production" && (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1")) {
      return true;
    }

    // Allow Vercel preview and canonical production domains
    if (host === "masterhrms.vercel.app" || host.endsWith(".vercel.app") || host === "www.masterhrms.com" || host === "masterhrms.com") {
      return true;
    }

    // Allow configured BASE_DOMAIN and *.{BASE_DOMAIN}
    if (host === baseDomain || host.endsWith(`.${baseDomain}`)) {
      return true;
    }

    // Allow active verified & approved custom domains (Flow 2)
    const cachedCustom = getCachedCustomDomain(host);
    if (cachedCustom && cachedCustom.status === "approved" && cachedCustom.dnsStatus === "verified") {
      return true;
    }
  } catch {}
  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);

// Explicit 403 response for disallowed origin if origin header was sent and rejected
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !isOriginAllowed(origin)) {
    return res.status(403).json({
      error: "CORS origin forbidden",
      code: "CORS_DISALLOWED",
      origin,
    });
  }
  next();
});

app.post("/api/payments/razorpay/webhook", express.raw({ type: "application/json" }), razorpayWebhookHandler);
app.use(
  express.json({
    limit: "50mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// NOTE: Do NOT include "multipart/*" or "*/*" here — multer handles multipart/form-data
// and express.text consuming it first causes "Unexpected end of form" errors in multer.
app.use(
  express.text({
    type: (req) => {
      const ct = req.headers["content-type"] || "";
      // Skip multipart — let multer handle it
      if (ct.startsWith("multipart/")) return false;
      // Match text/* and application/octet-stream only
      return ct.startsWith("text/") || ct === "application/octet-stream";
    },
  }),
);
const uploadsDir = getUploadsRoot();
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e: any) {
  console.warn("⚠️ [UPLOADS] Read-only or inaccessible uploads directory:", e?.message);
}

app.use(
  "/uploads",
  uploadsSecurityMiddleware,
  express.static(uploadsDir, {
    maxAge: "7d",
    etag: true,
    lastModified: true,
    fallthrough: false,
  })
);
app.use(compression()); // Gzip all responses — 60-80% smaller payloads

// ── 1. Core Platform Health Probes (Bypass all host, auth, & subscription middlewares) ──
app.get(["/api/health/live", "/health/live", "/live"], (_req, res) => {
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

app.get(["/api/health/db", "/health/db"], async (_req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ ok: false, error: "DATABASE_URL is not configured" });
  }
  try {
    const timeoutMs = 3000;
    const dbPingPromise = prisma.$queryRawUnsafe("SELECT 1");
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database ping timed out")), timeoutMs)
    );
    await Promise.race([dbPingPromise, timeoutPromise]);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(503).json({ ok: false, error: "Database unreachable" });
  }
});

app.get(["/api/health/ready", "/health/ready", "/ready"], async (_req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: "not_ready", error: "Server is shutting down" });
  }
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({
      status: "not_ready",
      timestamp: new Date().toISOString(),
      database: { status: "disconnected" },
      error: "DATABASE_URL is not configured",
    });
  }
  const timeoutMs = 3000;
  const startTime = Date.now();
  try {
    const dbPingPromise = (async () => {
      await prisma.$queryRawUnsafe("SELECT 1");
      return Date.now() - startTime;
    })();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database readiness ping timed out")), timeoutMs)
    );
    const latencyMs = await Promise.race([dbPingPromise, timeoutPromise]);
    return res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
      database: { status: "connected", latencyMs },
    });
  } catch {
    return res.status(503).json({
      status: "not_ready",
      timestamp: new Date().toISOString(),
      database: { status: "disconnected" },
      error: "Primary database readiness check failed",
    });
  }
});

// GET /api/health — Minimal high-availability response
app.get(["/api/health", "/health"], (_req, res) => {
  return res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Master HRMS API",
  });
});

// Temporary diagnostics endpoint (protected by x-diag-token header)
app.get(["/api/health/diag", "/health/diag"], (req, res) => {
  const diagToken = process.env.DIAG_TOKEN;
  if (!diagToken || req.headers["x-diag-token"] !== diagToken) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return res.status(200).json({
    nodeEnv: process.env.NODE_ENV || "unknown",
    isVercel: Boolean(process.env.VERCEL),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasJwtSecret: Boolean(process.env.JWT_SECRET),
    hasCorsOrigin: Boolean(process.env.CORS_ORIGIN),
    hasBaseDomain: Boolean(process.env.BASE_DOMAIN),
    missingRequiredEnv: getMissingRequiredEnvNames(),
    baseDomain: getBaseDomain(),
  });
});

// ── 2. Required Environment Configuration Guard ────────────────
app.use((req, res, next) => {
  if (req.path.startsWith("/api/health") || req.path.startsWith("/health")) {
    return next();
  }
  const missing = getMissingRequiredEnvNames();
  if (missing.length > 0) {
    const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
    return res.status(503).json({
      error: "Service unavailable due to missing required platform configuration.",
      code: "MISSING_ENV_CONFIGURATION",
      missingRequired: missing,
      requestId,
    });
  }
  next();
});

let isShuttingDown = false;
app.use((req, res, next) => {
  if (isShuttingDown && !req.path.startsWith("/api/health/live")) {
    res.setHeader("Connection", "close");
    return res.status(503).json({ error: "Server is undergoing graceful shutdown." });
  }
  next();
});

// ── 3. Platform Identity, Host, Maintenance & Subscription Pipeline ──
app.use(workspaceHostMiddleware); // Host resolution
app.use(maintenanceMiddleware);
app.use("/api", requireActiveSubscription);

// Settings & Media & App-Config (Phase 1)
app.use("/api/v1/settings", settingsRouter);
app.use("/api/v1/media", mediaRouter);
app.use("/api/media", mediaRouter);
app.use("/api/v1/files", filesRouter);
app.use("/api/files", filesRouter);
app.use("/api/v1/super/storage", superStorageRouter);
app.use("/api/super/storage", superStorageRouter);
app.use("/api/v1/tenant/storage", tenantStorageRouter);
app.use("/api/tenant/storage", tenantStorageRouter);
app.use("/api/v1/public/files", publicFilesRouter);
app.use("/api/public/files", publicFilesRouter);
app.use("/webdav", webdavRouter);
app.use("/api/v1/public", appConfigRouter);
app.use("/api/public", appConfigRouter);
app.use("/api", appConfigRouter);

// Employee Self-Service (ESS) Routes (/api/v1/me & /api/me)
app.use("/api/v1/me", employeeSelfServiceRouter);
app.use("/api/me", employeeSelfServiceRouter);

// Company Profile & GST (Phase 2 Wave 2.1)
app.use("/api/v1/company-profile", companyProfileRouter);
app.use("/api/company-profile", companyProfileRouter);

// Mount Routes
app.use("/api/billing", billingRouter);
app.use("/api/commerce", commerceRouter);
app.post("/api/webhooks/razorpay", handleRazorpayWebhook);
app.use(["/api/auth", "/api/v1/auth"], authRateLimiter, authRouter);
app.use("/api/workspace/custom-domain", tenantDomainRouter);
app.use("/api/workspace", workspaceRoutingRouter);
app.use("/api", workspaceRoutingRouter);
app.use("/api/workspace", workspaceRouter);
app.use("/api/cms", cmsRouter);
app.use("/api/dashboard", dashboardRouter); // Aggregation endpoint — replaces N individual calls
app.use("/api/employees", employeesRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/leave", leaveRouter);
app.use("/api/leaves", leaveRouter);
app.use("/api/awards", awardsRouter);
app.use("/api/warnings", warningsRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/payroll", payrollPhase1Router);
app.use("/api/payroll/disbursement", bankDisbursementRouter);
app.use("/api/payroll/statutory", statutoryReturnsRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/crm", crmRouter);
app.use("/api/super", superRouter);
app.use("/api/addons", addonsRouter);
app.use("/api/addons/okr", okrRouter);
app.use("/api/addons/assets", assetsRouter);
app.use("/api/v1/two-factor-auth", twoFactorRouter);
app.use("/api/two-factor-auth", twoFactorRouter);
app.use("/api/v1/backup-restore", backupRestoreRouter);
app.use("/api/backup-restore", backupRestoreRouter);
app.use("/api/v1/activity-logs", activityLogsRouter);
app.use("/api/activity-logs", activityLogsRouter);
app.use("/api/v1/reminders", internalRemindersRouter);
app.use("/api/reminders", internalRemindersRouter);
app.use("/api/v1/internal-reminders", internalRemindersRouter);
app.use("/api/internal-reminders", internalRemindersRouter);
app.use("/api/v1/public-api", publicApiRouter);
app.use("/api/public-api", publicApiRouter);
app.use("/api/v1/notice-board", noticeBoardRouter);
app.use("/api/notice-board", noticeBoardRouter);
app.use("/api/v1/addons/webhook", outboundWebhooksRouter);
app.use("/api/v1/webhook", outboundWebhooksRouter);
app.use("/api/v1/outbound-webhooks", outboundWebhooksRouter);
app.use("/api/outbound-webhooks", outboundWebhooksRouter);
app.use("/api/v1/addons/ai-assistant", aiAssistantRouter);
app.use("/api/addons/ai-assistant", aiAssistantRouter);
app.use("/api/v1/addons/ai-document", aiDocumentRouter);
app.use("/api/addons/ai-document", aiDocumentRouter);
app.use("/api/v1/addons/planning", planningStrategyRouter);
app.use("/api/addons/planning", planningStrategyRouter);
app.use("/api/v1/sms-gateway", smsGatewayRouter);
app.use("/api/sms-gateway", smsGatewayRouter);
app.use("/api/v1/suggestion-box", suggestionBoxRouter);
app.use("/api/suggestion-box", suggestionBoxRouter);
app.use("/api/recruitment", recruitmentRouter);
app.use("/api/addons/recruitment", recruitmentRouter);
app.use("/api/public/jobs", publicJobsRouter);
app.use("/api/shifts", shiftsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/training", trainingRouter);
app.use("/api/offboarding", offboardingRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/fbp", fbpRouter);
app.use("/api/helpdesk", helpdeskRouter);
app.use("/api/support/platform", platformSupportRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/forms", formsRouter);
app.use("/api/compliance", complianceRouter);
app.use("/api/accounting", accountingRouter);
app.use("/api/ai", aiRouter);
app.use("/api/products", productsRouter);
app.use("/api/sales", salesRouter);
app.use("/api/customers", customersRouter);
app.use("/api/chat", chatRouter);
app.use("/api/biometric", biometricRouter);
app.use("/api/public/biometric", publicBiometricRouter);
app.use("/iclock", iclockRouter);
app.use("/api/qz", qzRouter);
app.use("/api/transfers", transfersRouter);
app.use("/api/ecommerce", ecommerceRouter);
app.use("/api/integrations", integrationRouter);
app.use("/api/strategy-studio", strategyStudioRouter);
app.use("/api/woocommerce", woocommerceRouter);
app.use("/api/shopify", shopifyRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/purchases", purchasesRouter);
app.use("/api/adjustments", adjustmentsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/docs", docsRouter);
app.use("/api/returns", returnsRouter);
app.use("/api/client", clientRouter);
app.use("/api/timesheets", timesheetsRouter);
app.use("/api/workflows", workflowsRouter);
app.use("/api/overtime", overtimeRouter);
app.use("/api/wfh", wfhRouter);
app.use("/api/promotions", promotionRouter);
app.use("/api/probation", probationRouter);
app.use("/api/budgets", budgetsRouter);
app.use("/api/provident-funds", providentFundRouter);
app.use("/api/banned-ips", bannedIpRouter);
app.use("/api/system", systemMaintenanceRouter);
app.use("/api/custom-fields", customFieldsRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/todos", todosRouter);
app.use("/api/notes", notesRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/pusher", pusherRouter);
app.use("/api/email", emailRouter);
app.use("/api/user/email-accounts", userEmailAccountsRouter);
app.use("/api/smart-dashboard", smartDashboardRouter);
app.use("/api/smart-reports", smartReportsRouter);
app.use("/api/ai-business-advisor", aiBusinessAdvisorRouter);

// Platform Foundation APIs (v1 & unversioned alias)
app.use("/api/v1", platformFoundationRouter);
app.use("/api", platformFoundationRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requestId = (req as any).requestId || req.headers["x-request-id"] || crypto.randomUUID();
  console.error(`[ERROR] [${requestId}] Unhandled error:`, err?.message || err, err?.stack || "");
  const isHardened = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging";
  const rawMsg = String(err?.message || "");
  const isSensitive =
    rawMsg.includes("prisma") ||
    rawMsg.includes("SELECT ") ||
    rawMsg.includes("database") ||
    rawMsg.includes("postgres") ||
    rawMsg.includes("connect") ||
    rawMsg.includes("password");
  const clientError = isHardened && isSensitive ? "Internal server error" : (rawMsg || "Internal server error");
  res.status(err.status || 500).json({ error: clientError, requestId });
});

let server: http.Server | undefined;

if (!isServerless && process.env.NODE_ENV !== "test") {
  server = http.createServer(app);
  initSocket(server, allowedOrigins);

  // Start Transactional Outbox Background Processor (Every 3 seconds)
  OutboxService.startProcessor(3000);

  // Start Outbound Webhook Background Retry Worker (Every 5 seconds)
  WebhookRetryWorker.start(5000);

  // Start Biometric Auto-Sync Cron (Every 30 mins)
  setInterval(() => {
    runBiometricAutoSync();
  }, 30 * 60 * 1000);

  // Wave 2.3 — Nightly Biometric Reconciliation Cron (02:00 AM IST daily)
  // Replays offline buffer, resolves unmatched logs, and computes monthly LOP.
  function scheduleNightlyReconciliation() {
    const now = new Date();
    // Target: next 02:00 IST = 20:30 UTC previous day
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + IST_OFFSET_MS);
    const next2AM = new Date(Date.UTC(
      nowIST.getUTCFullYear(),
      nowIST.getUTCMonth(),
      nowIST.getUTCDate(),
      2, 0, 0, 0, // 02:00 IST = subtract IST offset for UTC
    ));
    // next2AM is in "IST calendar" but stored as UTC — convert back to real UTC
    let msUntilNext = (next2AM.getTime() - IST_OFFSET_MS) - now.getTime();
    if (msUntilNext <= 0) msUntilNext += 24 * 60 * 60 * 1000; // push to tomorrow

    setTimeout(async () => {
      await runBiometricReconciliation();
      scheduleNightlyReconciliation(); // reschedule for next day
    }, msUntilNext);

    console.log(`⏰ Biometric reconciliation scheduled in ${Math.round(msUntilNext / 60000)} min`);
  }
  scheduleNightlyReconciliation();

  // Centralized Subscription Expiry Reminders Cron (08:00 UTC daily)
  function scheduleDailySubscriptionReminders() {
    const now = new Date();
    const next8AM = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      8, 0, 0, 0
    ));
    let msUntilNext = next8AM.getTime() - now.getTime();
    if (msUntilNext <= 0) msUntilNext += 24 * 60 * 60 * 1000;

    setTimeout(async () => {
      try {
        console.log("⏰ [CRON] Executing scheduled daily subscription expiry reminders...");
        const result = await runSubscriptionExpiryRemindersCron();
        console.log("✅ [CRON] Daily subscription reminders finished:", result);
      } catch (err: any) {
        console.error("❌ [CRON] Daily subscription reminders failed:", err.message);
      }
      scheduleDailySubscriptionReminders();
    }, msUntilNext);

    console.log(`⏰ Daily Subscription Expiry Reminders scheduled in ${Math.round(msUntilNext / 60000)} min (target: 08:00 UTC)`);
  }
  scheduleDailySubscriptionReminders();
  CalendarReminderScheduler.start();

  server.listen(Number(PORT), HOST, async () => {
    console.log(`🚀 Master HRMS Backend Server running on http://${HOST}:${PORT}`);
    console.log(`🔌 Database Provider: Supabase PostgreSQL (Prisma ORM connected)`);
    console.log(`⚡ WebSocket Server: Ready on ws://${HOST}:${PORT}`);

    try {
      await SettingsService.ensureDefaultSettings();
      console.log(`⚙️ [STARTUP] Platform default settings verified in database.`);

      await UnifiedCatalogService.ensureCanonicalAddonsInDb();
      console.log(`📦 [STARTUP] Canonical Add-ons verified in database.`);

      const audit = ConfigAuditService.auditEnvironment();
      console.log(`🛡️ [CONFIG AUDIT] Score: ${audit.score}/100 | Pass: ${audit.summary.passed} | Warn: ${audit.summary.warnings} | Fail: ${audit.summary.failures}`);
    } catch (err: any) {
      console.error(`⚠️ [STARTUP] Initialization warning:`, err?.message || err);
    }
  });
}

// Graceful Process Shutdown Handler (SIGTERM & SIGINT)
const handleGracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n🛑 [SHUTDOWN] Received ${signal}. Initiating graceful termination sequence...`);

  // Allow 10s grace period for in-flight connections to complete
  const forceKillTimer = setTimeout(() => {
    console.error("⚠️ [SHUTDOWN] Grace period exceeded. Forcing exit.");
    process.exit(1);
  }, 10000);
  if (forceKillTimer.unref) forceKillTimer.unref();

  if (server) {
    server.close(async () => {
      console.log("🛑 [SHUTDOWN] HTTP listener closed to new connections.");
      try {
        // 1. Terminate background outbox worker
        OutboxService.stopProcessor();
        CalendarReminderScheduler.stop();
        console.log("🛑 [SHUTDOWN] Background outbox and calendar reminder schedulers halted.");

        // 2. Disconnect Prisma pool
        await prisma.$disconnect();
        console.log("🛑 [SHUTDOWN] Database pool disconnected cleanly.");

        console.log("✅ [SHUTDOWN] Graceful shutdown completed.");
        process.exit(0);
      } catch (shutdownErr: any) {
        console.error("⚠️ [SHUTDOWN] Error during shutdown:", shutdownErr?.message);
        process.exit(1);
      }
    });
  } else {
    try {
      await prisma.$disconnect();
    } catch (_) {}
    process.exit(0);
  }
};

process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
// MasterHRMS Platform Server active

(app as any).server = server;

// Crucial: CommonJS export compatibility for Vercel Serverless Function entry point
if (typeof module !== "undefined" && module.exports) {
  module.exports = app;
  (module.exports as any).default = app;
}

export { app, server };
export default app;


