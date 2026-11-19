---
milestone: WorkDo vs MasterHRMS Deep Forensic Parity
version: 1.0.0
updated: 2026-11-19T12:11:00+05:30
source_audit: docs/audit/WORKDO_VS_MASTERHRMS_SUPER_ADMIN_DEEP_FORENSIC_AUDIT.md
---

# Roadmap: WorkDo Parity Gap Closure

> **Current Phase:** 01 - Super-Admin Parity & Gap Closure
> **Status:** ✅ Complete
> **Scope:** Web Application Architecture, Backend APIs, UI Action Controls (Excluding Mobile)

## Must-Haves (from Forensic Audit)

- [x] **Referral Program Module**: Full Affiliate / Referral Commission Engine (Settings, Referred Tenants, Payout Requests Approve/Reject).
- [x] **Super-Admin Navigation Parity**: "Referral Program" integrated into Core Orchestration sidebar (`/super/referral`) and Command Palette.
- [x] **Tenant Row-Level Status Switch**: 1-click active/suspended toggle switch in `/super/tenants` table row.
- [x] **Subscription Plan Improvements**: 1-click "Duplicate Plan" (Clone) and editable trial days in `/super/plans`.
- [x] **Coupon Code Generator**: 1-click "Auto-Generate Random Code" button in `/super/coupons`.

---

## Phases

### Phase 1: Super-Admin Parity & Gap Closure
**Status:** ✅ Complete  
**Objective:** Close all 6 forensic gaps identified between WorkDo Super-Admin and MasterHRMS Super-Admin.  
**Reference:** `docs/audit/WORKDO_VS_MASTERHRMS_SUPER_ADMIN_DEEP_FORENSIC_AUDIT.md`

**Plans:**
- [x] Plan 1.1: Referral Backend Engine & APIs (`PLAN-01-REFERRAL-BACKEND.md` -> `SUMMARY-01.md`)
- [x] Plan 1.2: Referral Frontend Hub & Navigation Integration (`PLAN-02-REFERRAL-FRONTEND-AND-NAV.md` -> `SUMMARY-02.md`)
- [x] Plan 1.3: Super-Admin UI Controls Polish (`PLAN-03-SUPER-ADMIN-UI-CONTROLS-POLISH.md` -> `SUMMARY-03.md`)

---

### Phase 2: Company Admin Parity & Gap Closure
**Status:** ⬜ Ready to Start  
**Objective:** Audit and close gaps for Company Administrator role across HRM, Recruitment, Payroll, and Timesheets.  
**Depends on:** Phase 1

---

### Phase 3: HR Manager Parity & Gap Closure
**Status:** ⬜ Not Started  
**Objective:** Audit and close gaps for HR Manager role (Employee onboarding, Performance appraisals, Leaves approval).  
**Depends on:** Phase 2

---

### Phase 4: Employee ESS Parity & Gap Closure
**Status:** ⬜ Not Started  
**Objective:** Audit and close gaps for Employee Self-Service (Attendance punches, Payslip downloads, Expense claims).  
**Depends on:** Phase 3

---

## Progress Summary

| Phase | Status | Plans | Complete |
|-------|--------|-------|----------|
| 1. Super-Admin Parity | ✅ Complete | 3/3 | 100% |
| 2. Company Admin Parity | ⬜ Ready | 0/0 | — |
| 3. HR Manager Parity | ⬜ Not Started | 0/0 | — |
| 4. Employee ESS Parity | ⬜ Not Started | 0/0 | — |

---

## Verification Strategy

- Automated TypeScript verification: `npx tsc --noEmit` in both `server/` and web root (PASSED, 0 diagnostics).
- Route availability: `/super/referral` registers and builds cleanly with TanStack Router (PASSED).
- API validation: All referral endpoints (`GET /api/super/referral`, `PUT /settings`, `POST /approve`, `POST /reject`, `POST /plans/:id/duplicate`, `POST /plans/:id/make-default`) verified (PASSED).
