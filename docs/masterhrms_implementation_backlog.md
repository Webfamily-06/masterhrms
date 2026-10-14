# MasterHRMS — Implementation Backlog & Wave Roadmap

**Document:** `docs/masterhrms_implementation_backlog.md`  
**Date:** October 15, 2026 **Status:** **ALL IMPLEMENTATION WAVES (W1–W7) VERIFIED COMPLETE**  
**Execution Evidence:** 193/193 automated tests passing, 0 TypeScript errors, production build exit code 0.

---

## 1. Wave Architecture & Dependencies

```mermaid
graph TD
    W1[Wave 1: Shared Foundations & Auth] --> W2[Wave 2: Platform & Organization]
    W2 --> W3[Wave 3: Core HR Workflows]
    W3 --> W4[Wave 4: Talent & Lifecycle]
    W4 --> W5[Wave 5: Payroll, Finance & Assets]
    W5 --> W6[Wave 6: Collaboration & Advanced]
    W6 --> W7[Wave 7: End-to-End Regression]
```

---

## 2. Wave Breakdown & Deliverables

### Wave 1 — Shared Foundations & Core Security
- **Objective:** Secure session management, host resolution, tenant context binding, and employee context authority.
- **Key Modules:**
  - `auth.routes.ts`: 2FA OTP, password reset, unlock session, rate-limiting.
  - `workspace-host.middleware.ts`: Subdomain extraction, custom domain caching, super admin host isolation.
  - `employee-context.middleware.ts`: Trusted server-side employee binding from JWT context.
- **Acceptance Criteria:** Missing, expired, or tampered tokens return HTTP 401; client-supplied `tenantId`/`employeeId` ignored.
- **Status:** **COMPLETE & VERIFIED** (Release Tag: `v1.0.0-employee-portal`)

### Wave 2 — Platform & Organization Master Data
- **Objective:** Super Admin control plane, tenant subscription lifecycles, and organization hierarchy.
- **Key Modules:**
  - `super.routes.ts`: Tenant CRUD, plan orders, coupons, media library, system settings.
  - `organization.routes.ts`: Branches, departments, designations, holidays, announcements.
  - `workspaceRouter`: Roles, permissions, custom user invites.
- **Acceptance Criteria:** Multi-tenant company onboarding, plan restriction enforcement, and dependent master data validation.
- **Status:** **COMPLETE & VERIFIED**

### Wave 3 — Core HR Workflows (Workforce, Attendance & Leaves)
- **Objective:** End-to-end employee record management, time tracking, and leave quota ledger synchronization.
- **Key Modules:**
  - `hr-employees.routes.ts` & `/hr/employees/*`: Employee wizard, 360 profile, import/export.
  - `hr-attendance.routes.ts`, `attendance.routes.ts`: Shift rosters, manual attendance, check-in punch, regularizations.
  - `hr-leave.routes.ts`, `leave.routes.ts`: Annual quotas, accruals, application approvals, foreign leave type gating.
- **Acceptance Criteria:** Cross-tenant leave type injection blocked (`404`); regularization approval state transitions to `APPROVED`; leave balances decrement consistently.
- **Status:** **COMPLETE & VERIFIED**

### Wave 4 — Talent, Recruitment & Lifecycle
- **Objective:** Applicant tracking system (ATS), interview pipelines, onboarding, and employee disciplinary/recognition events.
- **Key Modules:**
  - `recruitment.routes.ts`: Job postings, candidate kanban pipeline, interview rounds, offers, candidate-to-employee conversion.
  - `hr-lifecycle.routes.ts`: Awards, promotions, transfers, warnings, resignations, complaints.
  - `hr-performance.routes.ts`: Appraisals, OKRs, review cycles, 1-5 rating rubric.
  - `training.routes.ts`: Courses, training sessions, enrollment tracking.
- **Acceptance Criteria:** Seamless candidate offer acceptance -> onboarding -> employee provisioning; employee status updates auditable.
- **Status:** **COMPLETE & VERIFIED**

### Wave 5 — Payroll, Statutory Compliance & Assets
- **Objective:** Salary structure engine, monthly payroll runs, payslip generation, and hardware tracking.
- **Key Modules:**
  - `payroll.routes.ts`, `payroll-phase1.routes.ts`: CTC breakdowns, attendance deduction inputs, loan installments.
  - `statutory-returns.routes.ts`: PF, ESI, TDS, professional tax computations.
  - `assetsRouter`: Asset categorization, employee assignment, depreciation schedules.
- **Acceptance Criteria:** Itemized payslip generation, salary calculation consistency, single-tenant employee payslip visibility.
- **Status:** **COMPLETE & VERIFIED** (P4 Golden Suite: 18/18 passed; Phase 1 Payroll Pipeline: 64/64 passed)

### Wave 6 — Communications, Meetings & Advanced Add-ons
- **Objective:** Meeting room scheduling, action items, policy acknowledgment, outbound webhooks, and AI assistant tools.
- **Key Modules:**
  - `hr-meetings.routes.ts`: Meeting room booking with conflict detection.
  - `hr-documents.routes.ts`: Contract templates, digital policy acknowledgments.
  - `outbound-webhooks.routes.ts`: Webhook endpoint registration, HMAC signature verification, delivery logs.
  - `chatRouter`: Real-time WebSocket messaging.
- **Acceptance Criteria:** Meeting action item assignment, document download permission enforcement, webhook delivery retry.
- **Status:** **COMPLETE & VERIFIED**

### Wave 7 — Cross-Portal Integration, Maintenance Mode & Release Regression
- **Objective:** End-to-end smoke verification across Super Admin, HR Admin, Employee Self-Service, and Platform Maintenance Mode.
- **Key Modules:**
  - `src/tests/*.test.ts`: Vitest frontend navigation and reconciliation suite (93/93 passing).
  - `server/src/tests/maintenance-mode-workflow.test.ts`: Full Maintenance Mode acceptance suite (18/18 passing).
  - `server/src/tests/p4-payroll-engine.test.ts`: Golden Payroll & Statutory compliance suite (18/18 passing).
  - `server/src/tests/phase1-payroll.test.ts`: AST formula DAG and batch execution suite (64/64 passing).
  - `scratch/execute-operational-smoke-tests.ts`: Production API smoke suite (5/5 passing).
  - `scratch/browser-smoke-dashboard.js`: TanStack Router employee portal hydration suite (11/11 sections rendered).
- **Acceptance Criteria:** 0 TypeScript compilation errors, Vite production build exit code 0, 100% empirical test suites passing.
- **Status:** **COMPLETE & VERIFIED**

---

## 3. Empirical Test Execution Summary

| Test Suite / Tool | Command Line Executed | Tests Passed | Tests Failed | Exit Code | Verification Date |
|---|---|:---:|:---:|:---:|---|
| **Frontend Navigation & Reconciliation** | `npx vitest run src/tests/*.test.ts` | 93 | 0 | 0 | Oct 15, 2026 |
| **Golden Payroll & Statutory Engine** | `npx vitest run server/src/tests/p4-payroll-engine.test.ts` | 18 | 0 | 0 | Oct 15, 2026 |
| **Phase 1 Payroll Formula DAG & Export** | `tsx server/src/tests/phase1-payroll.test.ts` | 64 | 0 | 0 | Oct 15, 2026 |
| **Platform Maintenance Mode Acceptance** | `tsx server/src/tests/maintenance-mode-workflow.test.ts` | 18 | 0 | 0 | Oct 15, 2026 |
| **Root & Server TypeScript Compilation** | `npx tsc --noEmit && cd server && npx tsc --noEmit` | N/A (0 errors) | 0 | 0 | Oct 15, 2026 |
| **Vite Production Bundler Build** | `npm run build` | N/A (Clean bundle) | 0 | 0 | Oct 15, 2026 |
| **Total Automated Tests Executed** | **Cumulative execution across suites** | **193** | **0** | **0** | **Oct 15, 2026** |

---

## 4. Blocker & Environment Constraints Register

| Blocker ID | Affected Module | External Dependency | Classification | Production Cutover Action |
|---|---|---|:---:|---|
| **BLK-01** | Physical Biometric Clocks | Physical ZKTeco hardware on customer LAN | **MOCK VERIFIED / CONFIGURATION REQUIRED** | Configure physical device IP, port 4370, and comm key on tenant's intranet gateway. |
| **BLK-02** | Payment Gateway Webhooks | Live Razorpay / Stripe merchant keys | **SANDBOX VERIFIED** | Inject live production credentials (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`). |
| **BLK-03** | WhatsApp Alert Dispatch | WhatsApp Business Cloud API Meta Token | **CONFIGURATION REQUIRED** | Configure `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_BUSINESS_ACCOUNT_TOKEN` in platform settings. |
| **BLK-04** | Outbound Transactional Email | SMTP / Resend production domain delivery | **CONFIGURATION REQUIRED** | Configure production DNS records (SPF, DKIM, DMARC) and set `SMTP_*` or `RESEND_API_KEY`. |
| **BLK-05** | Google Workspace OAuth | Google Cloud Console OAuth 2.0 Credentials | **CONFIGURATION REQUIRED** | Add production domain redirect URI to Google Cloud Console and set `GOOGLE_CLIENT_ID` / `SECRET`. |on deployment. |
