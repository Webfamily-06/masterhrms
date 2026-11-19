# MasterHRMS Mobile — API Implementation Priority Roadmap

## 1. Roadmap Architecture & Execution Principles

This roadmap provides a phased, dependency-aware implementation strategy to resolve every gap, mock, and disconnected workflow discovered during the MasterHRMS forensic audit.

### Core Rules for Next Phase
1. **Reuse Existing Backend Endpoints**: Do not create duplicate routes or modify backend database schemas; reuse the verified existing backend contracts discovered in `server/src/routes/`.
2. **Strict Dependency Order**: Foundation services and contract alignments must precede UI view integrations.
3. **Zero Simulated Data**: Remove all fallback mock arrays and dummy timers. A failed request must present an honest error state.
4. **Automated Verification Gate**: Every implemented phase must pass TypeScript checks (`npm run typecheck`) and Jest test suites (`npm test`).

---

## 2. Priority Scoring Matrix

| Priority | Criteria & Description | Findings Assigned |
|---|---|---|
| **P0 — Critical** | Authentication failure, tenant isolation breach, authorization bypass, sensitive payroll exposure, or platform policy violation. | **GAP-012** (Super Admin mobile prohibition guard) |
| **P1 — High** | Core employee, manager, or HR daily workflows without real server persistence (Expense claims, loan requests, payslip breakdown, notification contract mismatch, biometric session restoration). | **GAP-001**, **GAP-002**, **GAP-003**, **GAP-004**, **GAP-006**, **GAP-013** |
| **P2 — Medium** | Broken export actions, missing document downloads, unpersisted admin settings, static project feeds, and non-critical workflow modals. | **GAP-005**, **GAP-007**, **GAP-008**, **GAP-009**, **GAP-010**, **GAP-014**, **GAP-015** |
| **P3 — Low** | Static mock presentation for secondary view-only cards (e.g. Virtual payment card layout). | **GAP-011** |

---

## 3. Phased Implementation Roadmap

```mermaid
flowchart TD
    subgraph Phase 1 [Phase 1: Foundation & Notification Contracts]
        P1_1[GAP-006: Fix NotificationService URLs & Methods]
        P1_2[GAP-013: Wire Biometric Session Restoration to Auth Refresh]
        P1_3[GAP-012: Document Super Admin Mobile Exclusion Policy]
    end

    subgraph Phase 2 [Phase 2: ESS Core Financial Workflows]
        P2_1[GAP-001 & GAP-002: Create ExpenseService & Wire ExpenseClaimsScreen]
        P2_2[GAP-003: Implement requestSalaryAdvance in PayrollService]
        P2_3[GAP-004: Wire SalarySlipDetailScreen to getPayslipDetail API]
    end

    subgraph Phase 3 [Phase 3: Manager & HR Admin Workflows]
        P3_1[GAP-009: Add getTeamProjects to ManagerService & Wire Screen]
        P3_2[GAP-010: Add getTenantModules to TenantAdminService & Wire Screen]
        P3_3[GAP-014: Enable Policy Mutation in SecurityOverviewScreen]
    end

    subgraph Phase 4 [Phase 4: Document Downloads, Exports & Polish]
        P4_1[GAP-005: Wire Real File Download in DocumentsVaultScreen]
        P4_2[GAP-007: Wire Real PDF Export in AttendanceDetailScreen]
        P4_3[GAP-008: Wire Permission Flow in LeaveDetailScreen]
        P4_4[GAP-011: Bind PaymentCardsScreen to Real Employee Bank Profile]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
    Phase 3 --> Phase 4
```

---

### Phase 1: Core Foundation & Contract Reconciliation (P0 / P1)
**Goal**: Ensure authentication stability, biometric session restoration, push token registration, and notification delivery.

- **Task 1.1 (GAP-006)**: Update `mobile-app/src/core/services/notificationService.ts`:
  - Change `getNotifications()` endpoint to `GET /api/v1/me/notifications`.
  - Change `markAsRead(id)` endpoint to `POST /api/v1/shared/notifications/${id}/read`.
  - Change `registerDeviceToken()` to `POST /api/notifications/push/subscribe`.
- **Task 1.2 (GAP-013)**: In `FaceIdAuthScreen.tsx` and `FingerprintAuthScreen.tsx`, call `AuthService.refreshToken()` immediately upon successful biometric verification to refresh the session token before dashboard navigation.
- **Task 1.3 (GAP-012)**: Document Super Admin mobile exclusion governance in system compliance specifications.
- **Verification Criteria**:
  - `npm --prefix mobile-app test -- -t "notification"` passes.
  - Notifications list populates from backend without 404 errors.

---

### Phase 2: ESS Financial & Expense Workflows (P1)
**Goal**: Replace all mock data and stub alerts in employee expense and salary advance workflows with real server endpoints.

- **Task 2.1 (GAP-001 & GAP-002)**: Create `mobile-app/src/core/services/expenseService.ts`:
  - Implement `getMyClaims(params)`, `submitClaim(payload)`, `getCategories()`.
  - Wire `ExpenseClaimsScreen.tsx` with TanStack `useQuery` and `useMutation`.
  - Eliminate the hardcoded static `expenses` array.
- **Task 2.2 (GAP-003)**: In `mobile-app/src/core/services/payrollService.ts`:
  - Implement `requestSalaryAdvance({ principal, tenureMonths, reason, loanType })` calling `POST /api/v1/me/payroll/loans/request`.
  - Wire `SalaryAdvanceLoanScreen.tsx` `handleSubmit` to this service call with loading spinner and error alert.
- **Task 2.3 (GAP-004)**: In `SalarySlipDetailScreen.tsx`:
  - Eliminate fake multiplier calculations (`grossAmount * 0.7`).
  - Wire screen to `PayrollService.getPayslipDetail(routeParams.id)` to load exact earnings and deductions.
  - Re-fetch real payslip on month offset navigation.
- **Verification Criteria**:
  - Submitting an expense claim persists in database table `ExpenseClaim`.
  - Submitting a salary advance persists in `EmployeeLoan`.
  - Payslip breakdown matches exact backend payroll component figures.

---

### Phase 3: Manager & Tenant Admin Dynamic Operations (P1 / P2)
**Goal**: Connect manager project tracking and tenant administration modules to server endpoints.

- **Task 3.1 (GAP-009)**: In `mobile-app/src/core/services/managerService.ts`:
  - Implement `getTeamProjects()` calling `GET /api/projects`.
  - Wire `TeamProjectsScreen.tsx` with `useQuery` and eliminate static project array.
- **Task 3.2 (GAP-010)**: In `mobile-app/src/core/services/tenantAdminService.ts`:
  - Implement `getTenantModules()` calling `GET /api/workspace/modules`.
  - Wire `ModulesOverviewScreen.tsx` to display real licensed tenant addons.
- **Task 3.3 (GAP-014)**: In `SecurityOverviewScreen.tsx`:
  - Add interactive toggle switches for MFA enforcement and session timeout.
  - Wire "Save" action to `TenantAdminService.updateSettings('security', payload)`.
- **Verification Criteria**:
  - Manager projects reflect real database projects.
  - Updating security settings updates the tenant's security configuration in PostgreSQL.

---

### Phase 4: Document Downloads, Exports & UI Polish (P2 / P3)
**Goal**: Eliminate all remaining stub `Alert.alert` placeholders and connect real native file streaming.

- **Task 4.1 (GAP-005)**: In `DocumentsVaultScreen.tsx`:
  - Replace `handleDownload` stub alert with `openOrShareAttachment({ url: doc.url, fileName: doc.name, mimeType: doc.type })`.
- **Task 4.2 (GAP-007)**: In `attendanceService.ts` & `AttendanceDetailScreen.tsx`:
  - Implement `downloadAttendanceReport(params)` calling `GET /api/attendance/export?format=pdf`.
  - Wire header download icon and "Download Full Report" button to stream and share PDF.
- **Task 4.3 (GAP-008)**: In `LeaveDetailScreen.tsx`:
  - Connect "Request Permission" button to short-leave modal and dispatch to `LeaveService.applyLeave`.
- **Task 4.4 (GAP-011)**: In `PaymentCardsScreen.tsx`:
  - Bind bank account view to `EmployeeService.getMyProfile()` to display real bank and IFSC data.
- **Verification Criteria**:
  - Tapping download opens the native Android/iOS file save dialog with the real PDF/file.
  - Zero stub alerts remain in production screens.
