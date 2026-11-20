# Scoped Requirements: MASTERHRMS Enterprise Implementation

## Overview

This requirements document scopes the implementation of the 133 Add-ons and 64 Business Functions into executable requirements, aligned with GSD Workstreams A through I.

---

## Requirements

### Workstream A: Platform Foundation, Security & Background Crons

- [ ] **REQ-CRON-01**: Wire `document-expiry.cron.ts` to `server/src/index.ts` startup scheduler (runs daily at 01:00 UTC).
- [ ] **REQ-CRON-02**: Wire `probation-contract-expiry.cron.ts` to `server/src/index.ts` startup scheduler (runs daily at 01:30 UTC).
- [ ] **REQ-CRON-03**: Wire `reporting-manager-change.cron.ts` to `server/src/index.ts` startup scheduler (runs daily at 02:30 UTC).
- [ ] **REQ-CRON-04**: Wire `saas-billing.cron.ts` (`runExpireTrialsCron` and `runRenewalsAndGraceCron`) to `server/src/index.ts` startup scheduler (runs daily at 03:00 UTC).
- [ ] **REQ-SEC-01**: Maintain application-level fail-closed tenant scoping across all newly added and modified routes.

### Workstream B: Core HR & Offboarding Document Generation

- [ ] **REQ-FNF-01**: Implement formal Relieving Letter generation and storage upon Full & Final settlement completion in `server/src/routes/offboarding.routes.ts` (resolving FN-057 / GAP-01).
  - Generate structured relieving document metadata (employee name, designation, department, joining date, exit date, relieving letter code).
  - Store document record in `Document` or `EmployeeExit` with secure download URL.
  - Return downloadable artifact link in API response.
- [ ] **REQ-HR-01**: Verify and preserve existing 15 Core HR business functions (FN-001 through FN-006, FN-056).

### Workstream C: Attendance, Leave & Workforce Management

- [ ] **REQ-ATT-01**: Verify punch ingestion, geofencing, overtime calculation, and ZKTeco biometrics integration (FN-007 through FN-010).
- [ ] **REQ-LEV-01**: Verify leave application, quota deduction, manager approval, and LOP calculation integration with payroll (FN-011 through FN-014).
- [ ] **REQ-SFT-01**: Verify shift rosters, peer-to-peer swap initiation, and manager approvals (FN-015 through FN-017).

### Workstream D: Recruitment, Training & Performance

- [ ] **REQ-REC-01**: Verify job postings, applicant pipeline, and candidate-to-employee one-click conversion (FN-050, FN-051).
- [ ] **REQ-TRN-01**: Verify course curriculum builder and employee enrollment tracking (FN-052, FN-053).
- [ ] **REQ-OKR-01**: Verify corporate OKRs, key result tracking, and weekly check-ins (FN-048, FN-049).

### Workstream E: Statutory Payroll & Tax Compliance

- [ ] **REQ-PAY-01**: Verify dual-regime tax computation (Old vs New 115BAC) and EPF basic ceiling capping (FN-018, FN-019).
- [ ] **REQ-PAY-02**: Verify payroll finalization lock and bank NACH/NEFT export file generation (FN-020, FN-021).
- [ ] **REQ-TAX-01**: Document statutory tax form specifications (Form 16, Form 24Q, EPF Form 19/10C/31) as documented compliance specifications (FN-022 through FN-024).

### Workstream F: Finance, CRM & Procurement

- [ ] **REQ-CRM-01**: Implement missing One-Click Lead-to-Customer conversion endpoint (`POST /api/crm/leads/:id/convert` — FN-041).
- [ ] **REQ-AST-01**: Implement missing Asset Custodian Allocation & Acceptance Sign-off endpoint (`POST /api/addons/assets/:id/assign` — FN-046).
- [ ] **REQ-EXP-01**: Implement missing Manager Expense Reimbursement Approval action endpoint (`PUT /api/expenses/:id/approve` — FN-055).
- [ ] **REQ-ACC-01**: Verify 5-tier Chart of Accounts, manual journal entries, and double-entry ledger posting (FN-037, FN-038).

### Workstream G: SaaS Marketplace & Multi-Tenant Lifecycle

- [ ] **REQ-MKT-01**: Verify add-on catalog discovery, installation, and subscription entitlement gating in `entitlements.ts`.
- [ ] **REQ-SUP-01**: Implement missing Tenant Resource Quota Enforcement API route (`PUT /api/super/tenants/:id/quota` — FN-061).

### Workstream H: Communication, Realtime Chat & Integrations

- [ ] **REQ-CHAT-01**: Verify Socket.IO direct and channel messaging with database persistence (FN-059).
- [ ] **REQ-COM-01**: Verify outbound webhook dispatching and WhatsApp alert queue processing (FN-062, FN-063).

### Workstream I: Modular Add-on Architecture

- [ ] **REQ-MOD-01**: Maintain and verify 8 isolated plugins in `server/src/modules/` (`activity-logs`, `backup-restore`, `internal-reminders`, `notice-board`, `outbound-webhooks`, `public-api`, `sms-gateway`, `two-factor-auth`).
- [ ] **REQ-MOD-02**: Ensure route-level add-on controllers continue executing without regressions.
