# MasterHRMS Mobile — Gap Reconciliation Register
**Document ID**: `M1-M2-GRR-2026-11`  
**Date**: November 18, 2026  
**Status**: 100% Reconciled  
**Total Audit Gaps Addressed**: 8  

---

## 1. Gap Reconciliation Ledger

### GAP-001: Missing Expense Claims API Service
- **Baseline Audit Finding**: No `expenseService.ts` existed in `mobile-app/src/core/services/`.
- **Severity**: HIGH
- **Remediation**: Created `mobile-app/src/core/services/expenseService.ts` implementing `getMyClaims()`, `getCategories()`, `submitClaim()`, and `getClaimDetail()`.
- **Target Backend Endpoints**: `GET /api/expenses/claims`, `GET /api/expenses/categories`, `POST /api/expenses/claims`.
- **Status**: **RESOLVED**
- **Test Reference**: `mobile-app/__tests__/milestone_m2_ess_financial.test.ts` (`M2-EXP-01`, `M2-EXP-02`)

### GAP-002: Expense Claims Screen Uses Fabricated Mock Data & Fake Submission
- **Baseline Audit Finding**: `ExpenseClaimsScreen.tsx` maintained hardcoded dummy claims array and local React state append in `handleSubmitClaim`.
- **Severity**: CRITICAL
- **Remediation**: Completely purged mock array; wired `loadData` to `ExpenseService.getMyClaims()` and `ExpenseService.getCategories()`; wired modal to `ExpenseService.submitClaim()`; added dynamic totals aggregation and pull-to-refresh.
- **Status**: **RESOLVED**
- **Test Reference**: `mobile-app/__tests__/milestone_m2_ess_financial.test.ts` (`M2-EXP-03`)

### GAP-003: Salary Advance Loan Request Not Dispatched
- **Baseline Audit Finding**: `SalaryAdvanceLoanScreen.tsx` displayed a fake success `Alert.alert` without calling any backend endpoint.
- **Severity**: CRITICAL
- **Remediation**: Implemented `PayrollService.requestSalaryAdvance()` calling `POST /api/v1/me/payroll/loans/request`. Wired input validation, tenure extraction, deduction month computation, and loading lock.
- **Status**: **RESOLVED**
- **Test Reference**: `mobile-app/__tests__/milestone_m2_ess_financial.test.ts` (`M2-LOAN-01`, `M2-LOAN-02`)

### GAP-004: Salary Slip Detail Uses Fabricated Math Multipliers
- **Baseline Audit Finding**: `SalarySlipDetailScreen.tsx` derived earnings and deductions via synthetic math (`grossAmount * 0.7`, `deductions * 0.6`) and displayed fake modal dollar amounts.
- **Severity**: HIGH
- **Remediation**: Deleted synthetic math formulas; wired screen to `PayrollService.getPayslipDetail()` and `PayrollService.getMyPayslips()`; parsed real server breakdown JSON; added honest unissued empty state; formatted currency as Indian Rupees (`₹`).
- **Status**: **RESOLVED**
- **Test Reference**: `mobile-app/__tests__/milestone_m2_ess_financial.test.ts` (`M2-PAY-01`, `M2-PAY-02`, `M2-PAY-03`)

### GAP-006: Notification Contract Disconnected
- **Baseline Audit Finding**: `NotificationService` called non-existent `/api/notifications` and `PATCH /api/notifications/:id/read`.
- **Severity**: HIGH
- **Remediation**: Reconciled endpoints to `GET /api/v1/me/notifications`, `POST /api/v1/shared/notifications/:id/read`, `POST /api/v1/shared/notifications/read-all`, and `POST /api/notifications/push/subscribe`. Wired screen interactions in `NotificationsScreen.tsx`.
- **Status**: **RESOLVED**
- **Test Reference**: `mobile-app/__tests__/milestone_m1_foundation_security.test.ts` (`M1-NOTIF-01` through `04`)

### GAP-012: Super Admin Mobile Exclusion Policy
- **Baseline Audit Finding**: Ensure multi-tenant Super Admin accounts are forbidden from mobile access across all authentication workflows.
- **Severity**: CRITICAL (Security)
- **Remediation**: Enforced role rejection guards in `AuthService.login()`, `AuthService.verify2Fa()`, and `AuthService.restoreBiometricSession()`. Enforced closed routing in `AppNavigator.tsx`.
- **Status**: **RESOLVED & VERIFIED**
- **Test Reference**: `mobile-app/__tests__/milestone_m1_foundation_security.test.ts` (`M1-SEC-01` through `04`)

### GAP-013: Biometric Auth Screen Fake Timer Fallback
- **Baseline Audit Finding**: `FaceIdAuthScreen.tsx` and `FingerprintAuthScreen.tsx` used `setTimeout` without real token rotation or session restoration.
- **Severity**: HIGH
- **Remediation**: Implemented `AuthService.restoreBiometricSession()` executing token rotation via `POST /api/v1/auth/refresh`, secure storage updates, user profile hydration, and session state initialization.
- **Status**: **RESOLVED**
- **Test Reference**: `mobile-app/__tests__/milestone_m1_foundation_security.test.ts` (`M1-BIO-01` through `03`)

### GAP-015: Profile Change Request vs Direct Edit Boundaries
- **Baseline Audit Finding**: `EditProfileScreen.tsx` had hardcoded persona placeholders ("Sarah Miller") and `EmployeeService.getMyProfile()` failed to unpack data envelope.
- **Severity**: MEDIUM
- **Remediation**: Fixed `getMyProfile()` envelope unwrapping; added `submitProfileChangeRequest()` to `EmployeeService`; removed hardcoded placeholders in `EditProfileScreen.tsx`.
- **Status**: **RESOLVED**
- **Test Reference**: `mobile-app/__tests__/milestone_m1_foundation_security.test.ts` (`M1-PROF-01`, `M1-PROF-02`)

---

## 2. Sign-Off Summary

- **Total Gaps Tracked**: 8
- **Total Gaps Resolved**: 8 (100%)
- **Remaining Open Gaps for M1/M2**: 0
- **Automated Verification**: 100% Passed (114/114 Tests)
