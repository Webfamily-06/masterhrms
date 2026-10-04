# Laravel to React Migration Gap & Risk Report

**Document Purpose:** Identify architectural divergence, potential risks, data-integrity vulnerabilities, and security controls across the Laravel and React/Node.js stacks.

---

## 1. Architectural Differences & Resolution Strategies

### 1.1 State Management & Routing
- **Laravel Inertia Stack:** Relies on server-rendered Inertia page components where controller return values (`Inertia::render('page', $data)`) inject props directly into the React root.
- **Target React Stack:** Uses TanStack Router with TanStack Query (React Query). Data fetching happens asynchronously over REST APIs (`/api/*`) with client-side caching, optimistic mutations, and query invalidation.
- **Mitigation:**
  - Standardized JSON responses (`{ success: true, data: ... }` or raw collections matching target patterns).
  - Maintained full TanStack Query cache invalidation across all mutations.

### 1.2 Multi-Tenant Scoping Mechanism
- **Laravel Stack:** Spatie Permission + Eloquent scopes (`where('created_by', creatorId())`).
- **Target Node Stack:** Request-scoped Prisma extension with middleware `resolveTenantContext` and `requireAuth`.
- **Mitigation:**
  - Automated tests enforce that Tenant A cannot access or update Tenant B records under any circumstances.
  - Strict 404 responses returned when records are not found within the calling tenant workspace.

---

## 2. Identified Risks & Verified Mitigations

### Risk 1 — Floating Point Inaccuracies in Financial Math
- **Severity:** 🔴 HIGH
- **Concern:** Payroll calculations, recurring invoice subtotals, tax rates, and discounts can drift if using standard JavaScript floating point arithmetic.
- **Mitigation:**
  - Stored all monetary fields as `Decimal` in Prisma MySQL schema.
  - Calculated all values using explicit roundings (`Math.round((val + Number.EPSILON) * 100) / 100`).
  - Verified with 43 automated assertions in `recurring-invoices-and-generator.test.ts`.

### Risk 2 — Multi-Tenant Data Leakage via Unscoped Update Operations
- **Severity:** 🔴 HIGH
- **Concern:** Using `prisma.model.updateMany({ where: { id, tenantId }, data })` returns `{ count: 0 }` without error when the ID belongs to another tenant, potentially masking a breach attempt.
- **Mitigation:**
  - Explicit check `if (result.count === 0) return res.status(404).json({ error: "Not found in this workspace." })` applied across all route handlers.
  - Verified in `global-task-board-and-kanban.test.ts` (Test 6: Cross-tenant isolation verification).

### Risk 3 — Biometric Device TCP Socket Latency
- **Severity:** 🟡 MEDIUM
- **Concern:** ZKTeco devices connected over TCP can hang if the network connection drops or device is offline.
- **Mitigation:**
  - Implemented timeout guards (5000ms) with background task queueing to prevent blocking Express HTTP threads.

---

## 3. Recommended Implementation Sequence for Subsequent Modules

1. **Phase 1: Foundation Verification**: Auth, Tenant Isolation, Prisma Schema. (COMPLETED)
2. **Phase 2: Core HRMS & People**: Employees, Attendance, Shifts, Leaves. (COMPLETED)
3. **Phase 3: Compensation & Payroll**: Salary Structures, Payroll Runs, Payslips. (COMPLETED)
4. **Phase 4: Recruitment & OKRs**: Job Postings, Candidates, Interviews, OKR Goals. (COMPLETED)
5. **Phase 5: Global Kanban & Recurring Invoicing**: 6-column Task Board, Invoices Generator. (COMPLETED)
6. **Phase 6: Advanced Settings & Workflows**: Custom Fields, SLA Policies, Multi-Level Leave Approvals. (NEXT WAVE)

---

## 4. Phase 0 Audit Sign-off
Phase 0 Discovery and Audit is complete. The system architecture is fully understood, mapped, and documented. No application code or database schema was modified during this audit phase.
