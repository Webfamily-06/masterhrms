import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") }); // project root .env
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true }); // server/.env (override)
dotenv.config(); // cwd fallback

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
import { addonsRouter } from "./routes/addons.routes";
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
import { woocommerceRouter } from "./routes/woocommerce.routes";
import { shopifyRouter } from "./routes/shopify.routes";
import { alertsRouter } from "./routes/alerts.routes";
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
import { requireActiveSubscription } from "./middleware/subscription";
import { maintenanceMiddleware } from "./middleware/maintenance";
import { billingRouter, handleRazorpayWebhook } from "./routes/billing.routes";
import { commerceRouter } from "./routes/commerce.routes";
import { timesheetsRouter } from "./routes/timesheets.routes";
import { settingsRouter } from "./routes/settings.routes";
import { mediaRouter } from "./routes/media.routes";
import { appConfigRouter } from "./routes/app-config.routes";
import { employeeSelfServiceRouter } from "./routes/employee-self-service.routes";
import { companyProfileRouter } from "./routes/company-profile.routes";
import { SettingsService } from "./services/settings/settings.service";
import { getUploadsRoot } from "./services/media/media.service";
import { platformFoundationRouter } from "./routes/platform-foundation.routes";
import { OutboxService } from "./services/outbox.service";

import http from "http";
import { initSocket } from "./socket";
import { runBiometricAutoSync } from "./cron/biometric-sync";
import { runBiometricReconciliation } from "./cron/biometric-reconcile.cron";
import { runSubscriptionExpiryRemindersCron } from "./cron/subscription-reminder.cron";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// CORS setup
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3000,http://localhost:8080")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === "development") {
        return callback(null, true);
      }

      try {
        const url = new URL(origin);
        const host = url.hostname.toLowerCase();
        const baseDomain = getBaseDomain().toLowerCase();

        // Allow localhost and *.localhost
        if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1") {
          return callback(null, true);
        }

        // Allow configured BASE_DOMAIN and *.{BASE_DOMAIN}
        if (host === baseDomain || host.endsWith(`.${baseDomain}`)) {
          return callback(null, true);
        }

        // Allow active verified & approved custom domains (Flow 2)
        const cachedCustom = getCachedCustomDomain(host);
        if (cachedCustom && cachedCustom.status === "approved" && cachedCustom.dnsStatus === "verified") {
          return callback(null, true);
        }
      } catch {}

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.post("/api/payments/razorpay/webhook", express.raw({ type: "application/json" }), razorpayWebhookHandler);
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
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
app.use("/uploads", express.static(getUploadsRoot()));
app.use(compression()); // Gzip all responses — 60-80% smaller payloads
app.use(workspaceHostMiddleware); // Host resolution early in the pipeline
app.use(maintenanceMiddleware);
app.use("/api", requireActiveSubscription);

// Health Check (Deep Observability & Outbox Health)
app.get("/api/health", async (_req, res) => {
  const timeoutMs = 3000;
  const startTime = Date.now();

  try {
    // 1. Primary Database Ping with bounded timeout
    const dbPingPromise = (async () => {
      await prisma.$queryRawUnsafe("SELECT 1");
      return Date.now() - startTime;
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database ping timed out")), timeoutMs)
    );

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
    } catch {
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
  } catch {
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
app.use("/api/v1/settings", settingsRouter);
app.use("/api/v1/media", mediaRouter);
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
app.use("/api/auth", authRouter);
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

// Platform Foundation APIs (v1 & unversioned alias)
app.use("/api/v1", platformFoundationRouter);
app.use("/api", platformFoundationRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const server = http.createServer(app);
initSocket(server, allowedOrigins);

// Start Transactional Outbox Background Processor (Every 3 seconds)
OutboxService.startProcessor(3000);

// Start Biometric Auto-Sync Cron (Every 30 mins)
setInterval(() => {
  runBiometricAutoSync();
}, 30 * 60 * 1000);

// Wave 2.3 — Nightly Biometric Reconciliation Cron (02:00 AM IST daily)
// Replays offline buffer, resolves unmatched logs, and computes monthly LOP.
function scheduleNightlyReconciliation() {
  const now     = new Date();
  // Target: next 02:00 IST = 20:30 UTC previous day
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST  = new Date(now.getTime() + IST_OFFSET_MS);
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

server.listen(PORT, async () => {
  console.log(`🚀 Master HRMS Backend Server running on http://localhost:${PORT}`);
  console.log(`🔌 Database Provider: Supabase PostgreSQL (Prisma ORM connected)`);
  console.log(`⚡ WebSocket Server: Ready on ws://localhost:${PORT}`);

  try {
    await SettingsService.ensureDefaultSettings();
    console.log(`⚙️ [STARTUP] Platform default settings verified in database.`);
  } catch (err: any) {
    console.error(`⚠️ [STARTUP] Failed to ensure default settings:`, err?.message || err);
  }
});
