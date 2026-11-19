# MasterHRMS Mobile — API Contract Verification Master Register
**Document ID**: `M1-M2-ACV-2026-11`  
**Date**: November 18, 2026  
**Status**: Formally Verified  
**Milestones Covered**: M1 (Foundation & Security) + M2 (ESS Financial)  

---

## 1. Master Contract Reconciliation Table

| Gap ID | Feature Area | Legacy Client Endpoint | Verified Backend Route | HTTP Method | Auth Mode | Handler / Controller | Request Payload Schema | Response Schema |
|---|---|---|---|---|---|---|---|---|
| **GAP-006** | Notifications List | `GET /api/notifications` | `/api/v1/me/notifications` | `GET` | Bearer JWT | `meCollaborationRouter` (`me-collaboration.routes.ts:185`) | Query: `{ unread?: boolean, limit?: number, offset?: number }` | `{ notifications: AppNotification[], total: number, unreadCount: number }` |
| **GAP-006** | Mark Single Read | `PATCH /api/notifications/:id/read` | `/api/v1/shared/notifications/:id/read` | `POST` | Bearer JWT | `platformFoundationRouter` (`platform-foundation.routes.ts:214`) | None (Path: `:id`) | `{ success: boolean }` |
| **GAP-006** | Mark All Read | None (Missing) | `/api/v1/shared/notifications/read-all` | `POST` | Bearer JWT | `platformFoundationRouter` (`platform-foundation.routes.ts:229`) | None | `{ success: boolean }` |
| **GAP-006** | Push Token Registration | `POST /api/push/register` | `/api/notifications/push/subscribe` | `POST` | Bearer JWT | `pushRouter` (`push.routes.ts:33`) | `{ endpoint: string, deviceId: string, platform: 'android'\|'ios', keys: { p256dh: string, auth: string } }` | `{ success: boolean, data: { subscriptionId: string, deviceId: string } }` |
| **GAP-013** | Biometric Session Refresh | None (Timer fake) | `/api/v1/auth/refresh` | `POST` | Public / Token Body | `authRouter` (`auth.routes.ts:2045`) | `{ refreshToken: string, sessionId: string }` | `{ token: string, refreshToken: string, sessionId: string }` |
| **GAP-013** | Current User Hydration | None | `/api/v1/auth/me` | `GET` | Bearer JWT | `authRouter` (`auth.routes.ts:2112`) | None | `{ id: string, email: string, roles: string[], permissions: string[], profile: object }` |
| **GAP-012** | Super Admin Guard | Partial | `/api/v1/auth/login`, `/api/v1/auth/2fa/verify-login`, `/api/v1/auth/refresh` | Multiple | Public / Bearer | `authService.ts` & `AppNavigator.tsx` | N/A (Client Security Boundary) | Rejects with 403 Forbidden client validation |
| **GAP-015** | Profile Direct Edit | `PUT /api/v1/me/profile` | `/api/v1/me/profile` | `PUT` | Bearer JWT | `employeeSelfServiceRouter` (`employee-self-service.routes.ts:114`) | `{ phone?: string, gender?: string }` | `{ success: boolean, message: string, data: object }` |
| **GAP-015** | Profile Change Request | None (Missing) | `/api/v1/me/profile/change-requests` | `POST` | Bearer JWT | `employeeSelfServiceRouter` (`employee-self-service.routes.ts:146`) | `{ category: string, fieldKey: string, newValue: string, reason?: string }` | `{ success: boolean, data: object }` |
| **GAP-001** | Expense Claims List | None (Mock array) | `/api/expenses/claims` | `GET` | Bearer JWT | `expensesRouter` (`expenses.routes.ts:162`) | Query: `{ status?: string, categoryId?: string, search?: string }` | `Array<ExpenseClaim>` |
| **GAP-001** | Expense Categories | None (Missing) | `/api/expenses/categories` | `GET` | Bearer JWT | `expensesRouter` (`expenses.routes.ts:56`) | None | `Array<ExpenseCategory>` |
| **GAP-002** | Submit Expense Claim | None (Mock append) | `/api/expenses/claims` | `POST` | Bearer JWT | `expensesRouter` (`expenses.routes.ts:288`) | `{ employeeId: string, categoryId: string, title: string, amount: number, merchant: string, expenseDate?: string, description?: string }` | `ExpenseClaim` (Status 201 Created) |
| **GAP-003** | Salary Advance Loan Request | None (Mock alert) | `/api/v1/me/payroll/loans/request` | `POST` | Bearer JWT | `mePayrollRouter` (`me-payroll.routes.ts:321`) | `{ principal: number, tenureMonths: number, deductionStartMonth: string, reason?: string, loanType?: string }` | `{ loan: EmployeeLoan }` (Status 201 Created) |
| **GAP-003** | My Loans & EMI Schedule | None (Missing) | `/api/v1/me/payroll/reimbursements-loans` | `GET` | Bearer JWT | `mePayrollRouter` (`me-payroll.routes.ts:289`) | None | `{ claims: object[], loans: EmployeeLoan[] }` |
| **GAP-004** | Single Payslip Detail | Synthetic `0.7` formula | `/api/v1/me/payslips/:id` | `GET` | Bearer JWT | `mePayrollRouter` (`me-payroll.routes.ts:83`) | None (Path: `:id`) | `{ payslip: { id, grossSalary, netSalary, deductions, breakdown: object } }` |
| **GAP-004** | My Payslips List | None | `/api/v1/me/payslips` | `GET` | Bearer JWT | `mePayrollRouter` (`me-payroll.routes.ts:44`) | None | `{ payslips: PayslipItem[] }` |

---

## 2. Request/Response Normalization Rules

1. **Envelope Unwrapping**:
   - For endpoints returning `{ data: T }` or `{ payslip: T }` or `{ loan: T }`:
     The client service normalizes responses using `response.data?.payslip || response.data?.data || response.data`.
2. **Numeric Precision**:
   - Prisma `Decimal` fields (`amount`, `grossSalary`, `netSalary`, `monthlyEmi`) are returned as strings or numbers from JSON serialization. The mobile client safely parses them via `Number(val || 0)` or `parseFloat()`.
3. **HTTP Status Codes**:
   - `200 OK`: Standard read and mutation success.
   - `201 Created`: Returned by `POST /api/expenses/claims` and `POST /api/v1/me/payroll/loans/request`.
   - `400 Bad Request`: Validation failure or category spending limit exceeded (`categoryLimit` returned).
   - `401 Unauthorized`: Token expired or refresh token reuse detected.
   - `403 Forbidden`: Tenant context missing or Super Admin mobile attempt.
   - `404 Not Found`: Payslip not published or claim does not belong to tenant/employee.
