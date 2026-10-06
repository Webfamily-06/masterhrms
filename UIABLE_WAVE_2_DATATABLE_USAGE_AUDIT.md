# UIABLE WAVE 2: DATA TABLE USAGE & COMPATIBILITY AUDIT
**MASTERHRMS Enterprise System — Complete Table Census, Architecture & Compatibility Matrix**
*Status: Pre-Implementation Audit Baseline*
*Execution Date: 2026-10-06*

---

## 1. Executive Summary

This audit establishes the comprehensive baseline for **Wave 2: Data Tables & Complex Displays** of the controlled UIAble UI migration.

Following the strict architectural governance principles:
> **PRESERVE FUNCTIONALITY FIRST → IMPROVE UI SECOND → VERIFY EVERYTHING → PROCEED WAVE BY WAVE**

This audit inspects every data table implementation, data-display pattern, and listing experience across all 10 portals and 212 routes of the MASTERHRMS platform before modifying any source code.

Wave 1 Foundation UI components (`Button`, `Badge`, `Card`, `Input`, `Textarea`, `Empty`, `EmptyState`, `Table`, `Dialog`, `Tabs`) are **LOCKED** as the verified baseline. Wave 2 builds directly upon these verified primitives without modifying foundation code unless a concrete dependency strictly requires it.

---

## 2. Table Ecosystem Discovery & Census

A deep-scan analysis of the repository identified two primary architectural layers of table implementations:

```text
================================================================================
                       MASTERHRMS TABLE ARCHITECTURAL CENSUS
================================================================================
Total Routes in Application:                     212
Routes with Tabular Data Displays:               140
1. Generic Reusable Component:
   - src/components/ui/data-table.tsx            1 (Primary Target)
2. Direct Consumers of DataTable:
   - src/components/accounting/
     chart-of-accounts-table.tsx                 1 (Accounting GL System)
3. Foundation UI Table (@/components/ui/table):
   - Table, TableHeader, TableBody,
     TableRow, TableHead, TableCell              81 routes & components
4. Native Responsive HTML <table> Displays:     139 route templates
5. Tables with Client/Server-Side Pagination:   112 routes
6. Tables with Multi-faceted Filtering:          124 routes
7. Server-Side Data Query Tables (useQuery/api): 136 routes
8. Business-Critical Mission Workflow Tables:    28 core routes
================================================================================
```

---

## 3. Classification of Every Table Usage

Every table implementation across the enterprise system is categorized according to the Wave 2 classification schema:

### A. STANDARD TABLE
**Characteristics**: Fixed or static columns, simple row mapping, minimal interactive filtering, standard empty state, client-side display.
- **Examples**:
  - `src/routes/_authenticated/_app/holidays.tsx` (Company holiday list)
  - `src/routes/_authenticated/_app/designations.tsx` (Designation list)
  - `src/routes/_authenticated/_app/departments.tsx` (Department directory)
  - `src/routes/_authenticated/_app/taxes.tsx` (Tax rate bracket list)
  - `src/routes/_authenticated/_app/provident-fund.tsx` (PF configuration rules)
- **Migration Strategy**: Directly compatible with enhanced `DataTable` or Wave 1 `@/components/ui/table` standard styling.

### B. INTERACTIVE TABLE
**Characteristics**: Client-side filtering, column rendering, dynamic sorting, client pagination, search inputs, batch row selection.
- **Examples**:
  - `src/components/accounting/chart-of-accounts-table.tsx` (Consumes `DataTable`, custom code/name buttons, account type badges, currency balance formatting)
  - `src/routes/_authenticated/_app/attendance.tsx` (Monthly grid, employee status badges, shift tagging)
  - `src/routes/_authenticated/_app/timesheets.tsx` (Daily time logs, approval indicators)
  - `src/routes/_authenticated/_app/projects.tsx` (Project milestones, progress bars, lead avatars)
- **Migration Strategy**: Fully supported by elevating `src/components/ui/data-table.tsx` to UIAble visual standards with zero breaking changes to `DataTableProps<T>` and `Column<T>`.

### C. SERVER-SIDE TABLE
**Characteristics**: Backend paginated via query parameters (`page`, `pageSize`), server-side sorting, debounce search params, URL synchronization, asynchronous refetching.
- **Examples**:
  - `src/routes/_authenticated/super/tenants.tsx` (Tenant directory with status filters, tier filters, server pagination)
  - `src/routes/_authenticated/super/users.tsx` (Cross-tenant user listing, role filtration)
  - `src/routes/_authenticated/_app/employees.tsx` (Enterprise employee master directory with department/branch server filtering)
  - `src/routes/_authenticated/_app/invoices.tsx` (Multi-tenant invoice registry with date range and status queries)
- **Migration Strategy**: Business logic and query hooks (`useQuery`, `api.get`) are 100% preserved. Table presentation layers consume Wave 1 `Table` tokens.

### D. BUSINESS-CRITICAL TABLE
**Characteristics**: Financial, audit-sensitive, or legal compliance workflows. Contains irreversible actions (Approve, Reject, Ledger Posting, Bank Disbursement).
- **Examples**:
  - `src/routes/_authenticated/super/transactions.tsx` (Super Admin Purchase Transactions — see Section 6)
  - `src/components/payroll/bank-disbursement-workspace.tsx` (Salary direct-deposit execution, batch approval)
  - `src/components/payroll/statutory-returns-workspace.tsx` (PF, ESI, TDS government reporting)
  - `src/components/payroll/fbp-workspace.tsx` (Flexible Benefit Plan claims and tax exemption verification)
  - `src/components/accounting/financial-statements-view.tsx` (Balance Sheet, Profit & Loss, Trial Balance)
- **Migration Strategy**: **PROTECTED**. Absolutely zero business logic, transaction workflows, approval states, or dialogs may be altered.

### E. CUSTOM TABLE
**Characteristics**: Complex composite layouts, kanban hybrid tables, or specialized matrix views.
- **Examples**:
  - `src/routes/_authenticated/_app/pipeline.tsx` (CRM deal pipeline matrix)
  - `src/routes/_authenticated/_app/shifts.tsx` (Roster scheduling matrix)
- **Migration Strategy**: `KEEP_EXISTING` or `CUSTOM_REQUIRED`. Do NOT force standard table layouts into non-tabular workflows.

---

## 4. Primary Target: `src/components/ui/data-table.tsx`

### Existing Public API Contract:
```typescript
export interface Column<T = any> {
  key: string;
  header: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  showPagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  className?: string;
}
```

### Analysis of Current Implementation:
1. **Container**: Simple `rounded-xl border bg-card overflow-hidden shadow-sm` wrapper.
2. **Table Foundation**: Utilizes `@/components/ui/table` (`Table`, `TableHeader`, `TableBody`, `TableCell`, `TableHead`, `TableRow`).
3. **Empty State**: Simple unstyled text block (`p` elements) inside a `TableCell colSpan`.
4. **Loading State**: Standard `Loader2` spinner.
5. **Pagination**: Functional client-side slice pagination with rows-per-page `Select` and icon `Button` navigation.

### UIAble Elevation Plan:
- Elevate table wrapper with UIAble design tokens (`border-border/80`, `shadow-2xs`, smooth hover transitions).
- Seamlessly integrate Wave 1's `@/components/ui/empty` (`Empty`, `EmptyMedia`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`) for rich, contextual zero-state presentation.
- Enhance pagination bar with responsive flex layout, polished page indicators, and accessible controls.
- Maintain **100% strict backward compatibility** with `DataTableProps<T>` and `Column<T>`.

---

## 5. TanStack Table & UIAble Evaluation

We compared the `@uiable/data-table` reference block (`data-table-basic`) against the existing application architecture:

### Compatibility Matrix:

| Capability | Existing Implementation | UIAble Reference Pattern | Compatible? | Architecture Decision |
|---|---|---|---|---|
| **Underlying Primitives** | `@/components/ui/table` (Wave 1 enhanced) | `@uiable/table` | **100% Identical** | Use Wave 1 verified table primitives |
| **API Contract** | Generic `Column<T>`, `data: T[]` props | TanStack `ColumnDef<T>`, `useReactTable` | **Adaptable** | Preserve existing `Column<T>` API; do not break consumers |
| **Pagination Controls** | Client-side `Select` + `Button` controls | TanStack `getPaginationRowModel()` | **Compatible** | Retain existing pagination API while elevating layout |
| **Empty State** | Simple `TableCell` with text | Can embed `@uiable/empty` | **Superior** | Upgrade empty state to use Wave 1 `Empty` / `EmptyMedia` |
| **Loading State** | Spinner with `Loader2` | Skeleton or spinner | **Compatible** | Retain spinner with elevated smooth animation |
| **Search / Filtering** | Optional `searchValue` / external filters | `Input` column filters | **Preserved** | Maintain existing toolbar and filter patterns |
| **Sorting** | Page-level or column-level | `ArrowUpDown` button in header | **Compatible** | Allow custom header rendering via `Column.header` |
| **Row Selection** | Page-level checkbox state | TanStack selection model | **Preserved** | Preserve page-level selection state handlers |
| **Responsive Scrolling**| `overflow-x-auto` table wrapper | `overflow-x-auto` container | **100% Identical** | Enforce responsive overflow wrapper at all breakpoints |

---

## 6. Critical Payment Table Audit: `/super/transactions`

The Super Admin Purchase Transactions page (`src/routes/_authenticated/super/transactions.tsx`, 2,066 lines) was specifically audited:

### Workflows & Actions Verified:
1. **Search & Debounce**: Multi-field search querying customer email, tenant slug, transaction ID, and invoice number.
2. **Date Range Popover**: Start date, end date, quick presets ("Last 7 Days", "Last 30 Days", "Sep 2026", "Reset All").
3. **Multi-Faceted Dropdown Filters**:
   - Payment Method (`Razorpay`, `PayPal`, `Credit Card`, `Net Banking`, `Offline Payment`, `Bank Transfer`).
   - Payment Status (`Paid`, `Unpaid`, `Failed`, `Pending`, `Refunded`).
   - Verification Mode (`All Modes`, `Automatic Gateway`, `Manual Review`).
   - Sort Order (`Last 7 Days`, `Recently Added`, `Ascending`, `Descending`, `Last Month`).
4. **Authoritative Action Matrix**:
   - **View Full Details** (`setViewInvoice(tx)`): Opens modal displaying complete invoice metadata, line items, provider details, audit log.
   - **Payment Proof** (`setProofPreviewTx(tx)`): Renders customer-uploaded transfer slip / receipt image with zoom and notes.
   - **Approve Manual Payment** (`setApproveConfirmTx(tx)`): Confirms manual review, calls `/super/transactions/:id/approve`, credits subscription ledger.
   - **Reject Manual Payment** (`setRejectTargetTx(tx)`): Opens rejection dialog with required reason input, calls `/super/transactions/:id/reject`.
   - **Download Invoice PDF** (`handleDownloadInvoice(tx.id)`): Generates official vector invoice/receipt PDF document.
   - **Export CSV** (`handleExportCSV`): Exports filtered datasets with UTF-8 BOM encoding.
5. **Architectural Protection**:
   - All state, dialog handlers, API routes, and manual approval actions are **100% PROTECTED**.
   - No backend endpoints, parameters, or permissions are modified.

---

## 7. Migration Strategy & Scope Boundaries

### Execution Strategy:
```text
Existing Enterprise Business Logic (Protected)
                 ↓
Existing Page State / TanStack Table Queries (Protected)
                 ↓
Enhanced src/components/ui/data-table.tsx (UIAble Design Tokens)
                 ↓
Wave 1 Foundation Primitives (Table, Button, Badge, Empty, Dialog)
```

### Scope Boundaries:
- **IN SCOPE**:
  - `src/components/ui/data-table.tsx` enhancement with UIAble design tokens and Wave 1 `Empty` integration.
  - Verification of `chart-of-accounts-table.tsx` consumer.
  - End-to-end verification of `/super/transactions` actions and dialogs.
  - Responsive audit across 1440px, 1280px, 1024px, 768px, and 375px viewports.
  - TypeScript, test suite, and production build verification.
  - Browser QA automation script `server/scripts/wave2_datatable_browser_qa.ts`.
- **OUT OF SCOPE (STRICTLY FORBIDDEN)**:
  - Navigation/Shell components (`DreamsSidebar`, `DashboardHeader`, `SettingsNestedNav`).
  - Wave 1 foundation components modifications.
  - Backend API contracts, Prisma queries, Express controllers.
  - Arbitrary file deletions or cleanup.

---
*End of Wave 2 Data Table Usage & Compatibility Audit*
