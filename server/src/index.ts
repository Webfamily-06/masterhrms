import express from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth.routes";
import { cmsRouter } from "./routes/cms.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { employeesRouter } from "./routes/employees.routes";
import { attendanceRouter } from "./routes/attendance.routes";
import { leaveRouter } from "./routes/leave.routes";
import { payrollRouter } from "./routes/payroll.routes";
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
import { helpdeskRouter } from "./routes/helpdesk.routes";
import { platformSupportRouter } from "./routes/platform-support.routes";
import { announcementsRouter } from "./routes/announcements.routes";
import { formsRouter } from "./routes/forms.routes";
import { biometricRouter, publicBiometricRouter, iclockRouter } from "./routes/biometric.routes";
import accountingRouter from "./routes/accounting.routes";
import { aiRouter } from "./routes/ai.routes";

import http from "http";
import { initSocket } from "./socket";

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
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.text({ type: ["text/*", "application/octet-stream", "*/*"] }));
app.use(compression()); // Gzip all responses — 60-80% smaller payloads

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Master HRMS MySQL API",
    websocket: "active",
  });
});

// Mount Routes
app.use("/api/auth", authRouter);
app.use("/api/cms", cmsRouter);
app.use("/api/dashboard", dashboardRouter); // Aggregation endpoint — replaces N individual calls
app.use("/api/employees", employeesRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/leave", leaveRouter);
app.use("/api/payroll", payrollRouter);
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
app.use("/api/helpdesk", helpdeskRouter);
app.use("/api/support/platform", platformSupportRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/forms", formsRouter);
app.use("/api/accounting", accountingRouter);
app.use("/api/ai", aiRouter);
app.use("/api/biometric", biometricRouter);
app.use("/api/public/biometric", publicBiometricRouter);
app.use("/iclock", iclockRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const server = http.createServer(app);
initSocket(server, allowedOrigins);

server.listen(PORT, () => {
  console.log(`🚀 Master HRMS Backend Server running on http://localhost:${PORT}`);
  console.log(`🔌 Database Provider: MySQL (Prisma ORM connected)`);
  console.log(`⚡ WebSocket Server: Ready on ws://localhost:${PORT}`);
});
