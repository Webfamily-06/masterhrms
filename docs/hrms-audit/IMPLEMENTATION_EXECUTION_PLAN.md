# MASTERHRMS — IMPLEMENTATION EXECUTION PLAN
## End-to-End Engineering Roadmap, Security Containment, Migration Blueprint & Gap Reconciliation

**Document Target:** Definitive Pre-Implementation Execution Master Plan  
**Date of Issue:** November 3, 2026  
**Auditor / Architect:** Antigravity Advanced Agentic Engineering Team  
**Scope:** Full-Stack Repository (`src/`, `server/`, `server/prisma/`, and all 14 Audit Deliverables)  
**Strict Mandate:** PLANNING ONLY — Zero source code, database migrations, configuration files, or production data modified.  
**Execution Status:** READY FOR FORMAL IMPLEMENTATION APPROVAL

---

## 1. RESOLUTION OF THE FIVE BUSINESS POLICY DECISIONS

To avoid inventing company policies while maintaining complete engineering readiness, MasterHRMS introduces a **Configurable Policy Architecture**. Default statutory presets are established, with explicit configuration hooks and sign-off gates for tenant-specific policies.

```
+----------------------------------------------------------------------------------------------------+
|                               TENANT POLICY ENGINE (SETTINGS LEVEL)                                |
+------------------------------------+-----------------------------------+---------------------------+
| Policy Domain                      | Default Presets (Legal Baseline)  | Tenant Configuration Hook |
+------------------------------------+-----------------------------------+---------------------------+
| 1. Contract Staffing Establishment | Principal Employer Establishment  | Client Specific Override  |
| 2. Tamil Nadu Festival Holidays    | 4 National + 5 Collectorate Gaz.  | Form V Factory Agreement  |
| 3. Gratuity Funding Model          | Direct Operating Reserve Provision| Approved Trust Fund (LIC) |
| 4. Sandwich Leave Applicability    | Unpaid Leave (LOP) Only           | Casual/Sick Leave Policy  |
| 5. Notice Period Buyout Authority  | Dual (Manager + HR Director)      | Single Manager Authority  |
+------------------------------------+-----------------------------------+---------------------------+
```

### 1.1. Contract Staffing Statutory Establishment Mapping
- **Statutory Context:** Under Section 7 of the Contract Labour (Regulation and Abolition) Act, 1970 and Section 40 of the ESI Act, 1948, the Principal Employer is legally bound to ensure statutory deductions (PF, ESI, PT). However, staffing agencies deploying contract labor to client sites often require filing under client-specific establishment codes.
- **Configurable Architecture:**
  - Introduce `statutoryFilingMode: "PRINCIPAL_ESTABLISHMENT" | "CLIENT_ESTABLISHMENT"` on the `Tenant` and `StaffingClient` models.
  - If set to `PRINCIPAL_ESTABLISHMENT` (Default), payroll engine aggregates all staff under the primary company PF/ESI/PT registration numbers.
  - If set to `CLIENT_ESTABLISHMENT`, the system queries `StaffingClient.statutoryRules` for client-specific PF sub-codes, ESI sub-codes, and municipal PT codes.
- **Tenant Approval Requirement:** Requires explicit upload and confirmation of the Client's Registration Certificate (Form I under CLRA Act) signed by the Tenant HR Director.

### 1.2. Tamil Nadu Festival Holiday Calendar
- **Statutory Context:** The Tamil Nadu Industrial Establishments (National and Festival Holidays) Act, 1958 (TN Act 33 of 1958) mandates 9 paid holidays per calendar year: 4 National Holidays (Jan 26 Republic Day, May 1 May Day, Aug 15 Independence Day, Oct 2 Gandhi Jayanti) and 5 Festival Holidays.
- **Configurable Architecture:**
  - The 4 National Holidays are locked and non-deletable in `HolidayCalendar`.
  - For the 5 Festival Holidays, the system provides two modes:
    1. `"DISTRICT_GAZETTE"` (Default): Pre-populated from the official Tamil Nadu Government Gazette for the branch district (e.g., Pongal, Thiruvalluvar Day, Deepavali, Ayutha Pooja, Christmas).
    2. `"CUSTOM_AGREEMENT"`: Allows HR Admin to select customized festival dates after executing employee consent agreements under Section 3 of the Act.
- **Tenant Approval Requirement:** If `"CUSTOM_AGREEMENT"` is selected, the application blocks calendar publication until Form V (Notice of Holidays submitted to the Inspector of Factories) is uploaded.

### 1.3. Gratuity Funding Model: Trust Fund vs Direct Provisioning
- **Statutory Context:** The Payment of Gratuity Act, 1972 mandates payment of gratuity upon completion of 5 years of continuous service. Employers may fund this liability through an approved group gratuity trust fund (e.g. LIC, HDFC Life) or provision directly on their balance sheet.
- **Configurable Architecture:**
  - Setting `gratuityFundingType: "DIRECT_PROVISION" | "APPROVED_TRUST_FUND"`.
  - In `"DIRECT_PROVISION"` mode, the payroll engine computes monthly gratuity accrual (`(15 * Basic / 26) / 12`) for internal financial reporting, and Full & Final (F&F) settlements disburse gratuity directly via company operating payroll.
  - In `"APPROVED_TRUST_FUND"` mode, the F&F workflow generates an insurance claim schedule (LIC Form I / Claim Notice) and marks gratuity payout as `"TRUST_PENDING"` until funds are cleared.
- **Tenant Approval Requirement:** CFO / Finance Director sign-off required to switch between Direct Provisioning and Trust Funding.

### 1.4. Sandwich Leave Applicability
- **Statutory Context:** Neither the Tamil Nadu Shops and Establishments Act, 1947 nor Central labor laws mandate the "sandwich rule" (treating intervening weekly offs or holidays as leave if an employee takes leave on both surrounding days). It is strictly a company-level employment policy.
- **Configurable Architecture:**
  - Add configuration fields to `LeaveTypePolicy`:
    ```typescript
    sandwichRule: {
      enabled: boolean;                 // Default: false
      applyOnWeeklyOff: boolean;        // Default: false
      applyOnHolidays: boolean;         // Default: false
      applicableLeaveTypes: string[];   // Default: ["LOP"] (Unpaid leave only)
      medicalWaiverSupported: boolean;  // Default: true
    }
    ```
  - Standard policy default: The sandwich rule applies **only** to Loss of Pay (LOP) and unpaid unauthorized absences. Casual Leave (CL) and Sick Leave (SL) do not swallow weekly offs.
- **Tenant Approval Requirement:** Tenant HR Policy confirmation required if a company chooses to extend the sandwich rule to paid statutory leaves.

### 1.5. Notice Period Buyout Approval Authority
- **Statutory Context:** Notice period duration and buyout terms are defined by employment contracts and Section 41 of the Tamil Nadu Shops and Establishments Act, 1947. Waiving buyout recoveries or shortfalls involves financial discretion.
- **Configurable Architecture:**
  - Configurable delegation matrix in `ExitPolicy`:
    - Tier 1 (Notice Waiver ≤ 7 Days): Reporting Manager approval allowed.
    - Tier 2 (Notice Waiver 8–30 Days): Department Head + HR Admin joint approval required.
    - Tier 3 (Notice Waiver > 30 Days or Recovery Waiver > ₹50,000): CEO / Managing Director explicit digital authorization required.
- **Tenant Approval Requirement:** Tenant Executive Leadership must confirm the approval matrix limits during initial workspace onboarding.

---

## 2. SECURITY CONTAINMENT PLAN

Immediate remediation and rigorous regression test specifications for the 6 critical security vulnerabilities identified during the audit:

```
+---------------------------------------------------------------------------------------------------+
|                                   SECURITY CONTAINMENT MATRIX                                     |
+-----------------------------------+--------------------+------------------+-----------------------+
| Vulnerability / Defect            | Severity & Vector  | Containment Task | Verification Method   |
+-----------------------------------+--------------------+------------------+-----------------------+
| 1. Employee Update Privilege Esc. | P0 / API Route     | TASK-P0-02       | Automated API Test    |
| 2. Employee Creation Quota Bypass | P0 / Multi-Tenancy | TASK-P0-03       | Quota Enforcer Test   |
| 3. Biometric Device Punch Leakage | P0 / Hardware Push | TASK-P0-04       | Hardware Auth Test    |
| 4. Employee Document BOLA / IDOR  | P1 / Static Mounts | TASK-P1-03       | Cross-User BOLA Test  |
| 5. Sensitive Identity Data Leak   | P1 / Data Layer    | TASK-P1-01       | Field Masking Test    |
| 6. Stale Session JWT Persistence  | P1 / Auth Engine   | TASK-P1-08       | Session Revocation QA |
+-----------------------------------+--------------------+------------------+-----------------------+
```

### 2.1. Employee Update Privilege Escalation (`GAP-VAL-002` -> `TASK-P0-02`)
- **Vulnerability:** `PUT /api/employees/:id` in `server/src/routes/employees.routes.ts:306-410` executes with only `requireAuth`. Any authenticated user can modify salary, statutory PF eligibility, or terminate supervisor records.
- **Immediate Containment:**
  1. Wrap endpoint with `requirePermission("hrm.employees.edit")`.
  2. Implement strict payload filtering: Reject or strip `salary`, `annualCtc`, `pfEligible`, `esiEligible`, `ptEligible`, and `status` unless `req.user.roles.includes("hr_admin") || req.user.roles.includes("payroll_admin")`.
  3. Direct standard self-service employee updates strictly to `PUT /api/v1/me/profile`.
- **Regression Test Suite (`security-employee-privilege.test.ts`):**
  - *Test 1:* Authenticated regular employee sends `PUT /api/employees/:id` with `{ salary: 150000 }` -> Must return `403 Forbidden`.
  - *Test 2:* Authenticated regular employee sends `PUT /api/employees/:supervisorId` with `{ status: "terminated" }` -> Must return `403 Forbidden`.
  - *Test 3:* HR Admin with `hrm.employees.edit` sends update -> Must return `200 OK` and write an audit log entry.

### 2.2. Employee Creation Permission & Seat-Limit Bypass (`GAP-VAL-013` -> `TASK-P0-03`)
- **Vulnerability:** `POST /api/v1/hr/employees` in `server/src/routes/hr-employees.routes.ts:40-60` lacks RBAC guards and fails to check subscription seat limits.
- **Immediate Containment:**
  1. Prepend `requirePermission("hrm.employees.create")` middleware.
  2. Prepend `requireWithinLimit("seats")` middleware to assert that `tenant.currentEmployeeCount < tenant.seatLimit`.
- **Regression Test Suite (`security-seat-limit-bypass.test.ts`):**
  - *Test 1:* Non-HR user invokes `POST /api/v1/hr/employees` -> Must return `403 Forbidden`.
  - *Test 2:* Tenant with 10 purchased seats and 10 active employees attempts 11th employee creation -> Must return `402 Payment Required` with code `SEAT_LIMIT_EXCEEDED`.

### 2.3. Biometric ADMS Cross-Tenant Punch Leakage (`GAP-VAL-005` -> `TASK-P0-04`)
- **Vulnerability:** In `server/src/routes/biometric.routes.ts:1435-1445`, unrecognized device serial numbers silently fallback to `defaultTenant.id`, attributing external punches to customer tenant #1.
- **Immediate Containment:**
  1. Remove `rawPrisma.tenant.findFirst()` default fallback in `handleAdmsPush`.
  2. If the pushing device's serial number is unmapped to any registered `BiometricDevice` record in the database, terminate immediately:
     ```typescript
     res.status(401).send("ERROR: UNREGISTERED DEVICE\n");
     ```
  3. Log security alert: `UNREGISTERED_BIOMETRIC_PUSH_ATTEMPT` with remote IP and serial number.
- **Regression Test Suite (`security-biometric-adms.test.ts`):**
  - *Test 1:* Device pushes serial `SN_UNKNOWN_DEVICE_999` to `/iclock/cdata` -> Must return `401 Unauthorized` and insert zero records across all database tables.
  - *Test 2:* Registered device for Tenant B pushes punch for Employee X -> Punch is persisted strictly under Tenant B.

### 2.4. Employee Confidential Document BOLA / IDOR (`GAP-VAL-010` -> `TASK-P1-03`)
- **Vulnerability:** `server/src/middleware/uploads-security.middleware.ts:105-112` enforces tenant-level isolation, but lacks employee-level authorization. Any employee in Tenant A can download confidential documents belonging to other employees in Tenant A.
- **Immediate Containment:**
  1. Check `mediaFile.category`:
     - If `category in ["passport", "medical", "disciplinary", "salary_slip", "national_id"]`:
     - Verify: `req.user.id === mediaFile.uploadedBy` OR `req.user.employeeId === mediaFile.employeeId` OR `req.user.permissions.includes("hrm.documents.view_all")`.
  2. Deny access with `403 Forbidden: Unauthorized document access`.
- **Regression Test Suite (`security-document-bola.test.ts`):**
  - *Test 1:* Employee A attempts `GET /uploads/documents/employeeB_pan_card.pdf` -> Must return `403 Forbidden`.
  - *Test 2:* HR Manager with `hrm.documents.view_all` requests same file -> Must return `200 OK`.
  - *Test 3:* Employee B requests their own document -> Must return `200 OK`.

### 2.5. Sensitive Employee Identity Data Exposure (`GAP-DB-API-009` -> `TASK-P1-01`)
- **Vulnerability:** Employee directory and master APIs return unmasked Aadhaar numbers, PAN numbers, and personal bank accounts in plaintext to frontend callers.
- **Immediate Containment:**
  1. Implement automated data masking serialization interceptor:
     - Aadhaar: Mask first 8 digits (`••••••••1234`).
     - PAN: Mask first 5 characters (`•••••1234F`).
     - Bank Account: Mask all but last 4 digits (`••••••••5678`).
  2. Full unmasked values exposed **only** on dedicated secure endpoint `GET /api/v1/hr/employees/:id/sensitive-statutory`, guarded by `requirePermission("hrm.statutory.view_sensitive")`.
- **Regression Test Suite (`security-data-masking.test.ts`):**
  - *Test 1:* `GET /api/employees` payload inspected -> Proves Aadhaar, PAN, and Bank fields are masked with regex pattern `^•+`.
  - *Test 2:* Caller with `hrm.statutory.view_sensitive` querying dedicated endpoint receives decrypted plaintext.

### 2.6. Terminated Employee Stale Session Revocation (`GAP-VAL-019` -> `TASK-P1-08`)
- **Vulnerability:** `finalizeExit` in `lifecycle.service.ts` deletes `userRole`, but leaves `User.status = "active"`, preserves `DeviceSession` rows, and does not invalidate active JWT access tokens.
- **Immediate Containment:**
  1. In `finalizeExit` transaction:
     ```typescript
     await db.user.update({ where: { id: exit.employee.userId }, data: { status: "inactive" } });
     await db.deviceSession.deleteMany({ where: { userId: exit.employee.userId } });
     await invalidateAuthCache(exit.employee.userId);
     ```
  2. Verify that JWT validation middleware queries the user revocation cache on every authenticated request.
- **Regression Test Suite (`security-exit-revocation.test.ts`):**
  - *Test 1:* Employee active session token captured. Exit finalized via API. Subsequent request with captured token -> Must immediately return `401 Unauthorized`.

---

## 3. DATABASE MIGRATION PLAN

All schema modifications follow a zero-downtime, expand-and-contract migration strategy. No destructive changes or drops occur in Phase 1.

```
+----------------------------------------------------------------------------------------------------+
|                               DATABASE MIGRATION ARCHITECTURE                                      |
+-------------------+----------------------------+-----------------------+---------------------------+
| Migration ID      | Affected Models            | Change Type           | Existing Data Impact      |
+-------------------+----------------------------+-----------------------+---------------------------+
| MIGRATE-01-FIELDS | Employee                   | Add 10 Native Columns | Non-destructive (Nullable)|
| MIGRATE-02-LEAVE  | LeaveRequest, LeaveLedger  | Int -> Decimal(4,1)   | Value Preservation (1.0)  |
| MIGRATE-03-GEO    | Branch                     | Add Coords & Radius   | Non-destructive (Nullable)|
| MIGRATE-04-SALARY | EmployeeSalaryAssignment   | Create New Model      | Historical Backfill Script|
| MIGRATE-05-SOFTDEL| Core Statutory Models      | Add deletedAt column  | Non-destructive           |
+-------------------+----------------------------+-----------------------+---------------------------+
```

### 3.1. Migration 1: Native Demographic & Contact Columns on `Employee` (`TASK-P0-07`)
- **Current Schema (`server/prisma/schema.prisma:308-438`):**
  `Employee` model lacks native columns for marital status, blood group, emergency contact details, and granular address components. Data passed during 8-step onboarding is silently dropped.
- **Proposed Schema Alteration:**
  ```prisma
  // In model Employee
  maritalStatus               String?   @map("marital_status") @db.VarChar(20)
  bloodGroup                  String?   @map("blood_group") @db.VarChar(10)
  addressLine1                String?   @map("address_line1") @db.VarChar(255)
  addressLine2                String?   @map("address_line2") @db.VarChar(255)
  city                        String?   @map("city") @db.VarChar(100)
  district                    String?   @map("district") @db.VarChar(100)
  postalCode                  String?   @map("postal_code") @db.VarChar(20)
  emergencyContactName        String?   @map("emergency_contact_name") @db.VarChar(100)
  emergencyContactRelationship String?  @map("emergency_contact_relationship") @db.VarChar(50)
  emergencyContactPhone       String?   @map("emergency_contact_phone") @db.VarChar(30)
  ```
- **Existing Data Impact:** Zero data loss. All columns are nullable.
- **Backfill Strategy:** Run automated data migration script: extract any legacy JSON metadata stored in `Employee.metadata` and populate newly added structured columns.
- **Rollback Strategy:** `ALTER TABLE "employees" DROP COLUMN ...` (Reverse migration script prepared).

### 3.2. Migration 2: Decimal Precision for Half-Day Leaves (`TASK-P0-06`)
- **Current Schema (`server/prisma/schema.prisma:492`):**
  `LeaveRequest.days Int @default(1)` and `LeaveLedgerEntry.amount Int`.
  Applying for half-day leave (`0.5` days) truncates or rounds to `1` or `0`, corrupting leave balances.
- **Proposed Schema Alteration:**
  ```prisma
  // In model LeaveRequest
  days        Decimal   @default(1.0) @db.Decimal(4, 1)

  // In model LeaveLedgerEntry
  amount      Decimal   @db.Decimal(5, 2)
  ```
- **Existing Data Impact:** Non-destructive type cast from integer to numeric decimal. All existing integer rows (e.g. `2`) convert safely to `2.0`.
- **Backfill Strategy:** None required. Post-migration sanity query: `SELECT count(*) FROM "leave_requests" WHERE days IS NULL;` (Must return 0).
- **Rollback Strategy:** `ALTER TABLE "leave_requests" ALTER COLUMN "days" TYPE integer;`

### 3.3. Migration 3: Geographic Coordinates & Radius on `Branch` (`TASK-P1-09`)
- **Current Schema (`server/prisma/schema.prisma:4409`):**
  `Branch` model contains text address fields but lacks latitude, longitude, and geofence radius. Attendance punch geofencing defaults to hardcoded Mumbai coordinates.
- **Proposed Schema Alteration:**
  ```prisma
  // In model Branch
  latitude        Float?
  longitude       Float?
  geofenceRadius  Int?    @default(500) @map("geofence_radius") // in meters
  ```
- **Existing Data Impact:** Non-destructive. Existing branches retain null coordinates until geocoded or updated by admin.
- **Rollback Strategy:** `ALTER TABLE "branches" DROP COLUMN latitude, DROP COLUMN longitude, DROP COLUMN geofence_radius;`

### 3.4. Migration 4: Effective-Dated Salary Assignment (`TASK-P2-02`)
- **Current Schema:**
  `Employee.salary` is a single static column. Promotions and salary increments mutate the record in-place, making past payroll recalculation impossible.
- **Proposed Schema Alteration:**
  ```prisma
  model EmployeeSalaryAssignment {
    id                  String    @id @default(uuid())
    tenantId            String    @map("tenant_id")
    employeeId          String    @map("employee_id")
    salaryStructureId   String?   @map("salary_structure_id")
    ctcMonthly          Decimal   @map("ctc_monthly") @db.Decimal(12, 2)
    ctcAnnual           Decimal   @map("ctc_annual") @db.Decimal(12, 2)
    effectiveFrom       DateTime  @map("effective_from") @db.Date
    effectiveTo         DateTime? @map("effective_to") @db.Date
    reason              String?   @db.VarChar(100) // "ONBOARDING", "PROMOTION", "INCREMENT"
    isActive            Boolean   @default(true) @map("is_active")
    createdAt           DateTime  @default(now()) @map("created_at")
    createdById         String?   @map("created_by_id")

    tenant              Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    employee            Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)

    @@index([tenantId, employeeId, effectiveFrom])
    @@map("employee_salary_assignments")
  }
  ```
- **Backfill Strategy:** Run idempotent script: For every existing `Employee` with `salary > 0`, generate an initial `EmployeeSalaryAssignment` record with `effectiveFrom = Employee.joiningDate` and `effectiveTo = null`.
- **Historical Preservation:** Ensures historical payroll runs always query the salary structure active on that specific pay period date.

### 3.5. Migration 5: Soft Deletion Protection for Statutory Audit Records (`TASK-P3-03`)
- **Current Schema:**
  Several models declare `onDelete: Cascade` on the `Employee` relation. Deleting an employee physically cascades and purges historical payrolls, tax deductions, and disciplinary records, violating statutory audit requirements.
- **Proposed Schema Alteration:**
  1. Add `deletedAt DateTime? @map("deleted_at")` to `Employee`, `EmployeeExit`, `DisciplinaryWarning`, and `LeaveLedgerEntry`.
  2. Alter foreign key constraints from `onDelete: Cascade` to `onDelete: Restrict`.
- **Rollback Strategy:** Revert foreign keys to cascade via Prisma schema update.

---

## 4. SHARED ARCHITECTURE IMPLEMENTATION SPECIFICATIONS

### 4.1. Centralized Zod Validation Middleware (`TASK-P1-01`)
Create reusable Express middleware `server/src/middleware/validate.middleware.ts`:
```typescript
import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export const validateRequest = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (schema.body) req.body = await schema.body.parseAsync(req.body);
    if (schema.query) req.query = await schema.query.parseAsync(req.query);
    if (schema.params) req.params = await schema.params.parseAsync(req.params);
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.errors.map(e => ({
          field: e.path.join("."),
          message: e.message,
          rule: e.code,
        })),
      });
    }
    return next(error);
  }
};
```

### 4.2. Global Dialog Container & Viewport Overflow Fix (`TASK-P0-08`)
Update `src/components/ui/dialog.tsx`:
```tsx
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 flex flex-col w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 sm:rounded-lg overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex-1 overflow-y-auto px-6 py-4", className)} {...props} />
);

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("sticky bottom-0 bg-background/95 backdrop-blur px-6 py-4 border-t flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
```

### 4.3. Double Padding Elimination in 98 Page Roots (`TASK-P0-09`)
- Remove root `p-6` or `p-4` classes from all 98 audited files.
- Enforce layout containment:
  ```tsx
  // BEFORE (Double margin bug: 48px desktop / 80px mobile)
  export default function EmployeesPage() {
    return <div className="p-6 space-y-6"> ... </div>;
  }

  // AFTER (Clean layout managed by .content container in styles.css)
  export default function EmployeesPage() {
    return <div className="space-y-6"> ... </div>;
  }
  ```

### 4.4. Unified Background Asynchronous Worker Architecture
- Replace unmonitored Node.js timers with a database-backed or Redis-backed **Outbox Worker Pattern** (`server/src/services/outbox.service.ts`).
- Heavy tasks (Batch Payroll, Full Statutory PDF Zip generation, Biometric ADMS sync) write an outbox job record.
- Background worker executes jobs in worker threads with retry counters, error logs, and execution heartbeats, preventing HTTP 504 timeouts.

---

## 5. RECONCILIATION MATRIX: 62 AUDIT GAPS TO 43 IMPLEMENTATION TASKS

Every single gap identified during the audit is mapped directly to an engineering implementation task. Zero gaps are dropped.

```
====================================================================================================
GAP ID          CATEGORY           SEVERITY   ASSIGNED TASK ID   DEPENDENCY         PARALLELIZABLE?
====================================================================================================
GAP-VAL-001     Statutory PT       P0         TASK-P0-01         None               Yes
GAP-VAL-002     Security Priv.     P0         TASK-P0-02         None               Yes
GAP-VAL-003     Data Loss Marital  P0         TASK-P0-07         MIGRATE-01-FIELDS  No
GAP-VAL-004     Attendance Overw.  P1         TASK-P1-02         None               Yes
GAP-VAL-005     Biometric ADMS     P0         TASK-P0-04         None               Yes
GAP-VAL-006     Candidate Pan/Uan  P1         TASK-P1-05         None               Yes
GAP-VAL-007     Onboarding Gate    P1         TASK-P1-06         TASK-P1-05         No
GAP-VAL-008     Half-Day Truncate  P0         TASK-P0-06         MIGRATE-02-LEAVE   No
GAP-VAL-009     Probation Confirm  P1         TASK-P1-01         None               Yes
GAP-VAL-010     Document BOLA      P1         TASK-P1-03         None               Yes
GAP-VAL-011     Statutory Forms    P1         TASK-P1-11         None               Yes
GAP-VAL-012     Shift Time 24hr    P3         TASK-P3-01         None               Yes
GAP-VAL-013     Seat Quota Bypass  P0         TASK-P0-03         None               Yes
GAP-VAL-014     Negative Advance   P1         TASK-P1-01         None               Yes
GAP-VAL-015     Public Uploads     P1         TASK-P1-04         TASK-P1-03         No
GAP-VAL-016     Leave Encashment   P2         TASK-P2-07         TASK-P0-01         No
GAP-VAL-017     Overtime Limit     P1         TASK-P1-01         None               Yes
GAP-VAL-018     Transfer Relocate  P2         TASK-P2-01         None               Yes
GAP-VAL-019     Exit Session Rev.  P1         TASK-P1-08         None               Yes
GAP-VAL-020     Promotion Salary   P2         TASK-P2-02         MIGRATE-04-SALARY  No
GAP-VAL-021     FNF Gratuity Calc  P2         TASK-P2-03         None               Yes
GAP-VAL-022     Warning Appeal     P2         TASK-P2-06         None               Yes
GAP-VAL-023     Training Capacity  P1         TASK-P1-01         None               Yes
GAP-VAL-024     Asset Condition    P1         TASK-P1-01         None               Yes
GAP-VAL-025     Grievance Redress  P2         TASK-P2-06         None               Yes

WF-GAP-001      Candidate Convert  P1         TASK-P1-06         None               Yes
WF-GAP-002      Direct Prob. Pass  P1         TASK-P1-01         None               Yes
WF-GAP-003      Transfer Effective P2         TASK-P2-01         None               Yes
WF-GAP-004      Promotion Version  P2         TASK-P2-02         MIGRATE-04-SALARY  No
WF-GAP-005      Immediate Resign   P1         TASK-P1-01         None               Yes
WF-GAP-006      Exit Clearances    P1         TASK-P1-07         None               Yes
WF-GAP-007      Asset Return Gate  P1         TASK-P1-07         None               Yes
WF-GAP-008      FNF Auto-Trigger   P2         TASK-P2-03         TASK-P1-07         No
WF-GAP-009      Month Lock Bypass  P0         TASK-P0-05         None               Yes
WF-GAP-010      Warning Dangling   P2         TASK-P2-06         None               Yes

GAP-DB-API-001  Demographic Schema P0         TASK-P0-07         MIGRATE-01-FIELDS  No
GAP-DB-API-002  Leave Decimal DB   P0         TASK-P0-06         MIGRATE-02-LEAVE   No
GAP-DB-API-003  Branch Geofence DB P1         TASK-P1-09         MIGRATE-03-GEO     No
GAP-DB-API-004  Missing SoftDelete P3         TASK-P3-03         MIGRATE-05-SOFTDEL No
GAP-DB-API-005  Salary History DB  P2         TASK-P2-02         MIGRATE-04-SALARY  No
GAP-DB-API-006  Unchecked PUT Emp  P0         TASK-P0-02         None               Yes
GAP-DB-API-007  Biometric Tenant   P0         TASK-P0-04         None               Yes
GAP-DB-API-008  Seat Quota Check   P0         TASK-P0-03         None               Yes
GAP-DB-API-009  Data Masking APIs  P1         TASK-P1-01         None               Yes
GAP-DB-API-010  Static Upload Auth P1         TASK-P1-03         None               Yes
GAP-DB-API-011  Public Folder Dir  P1         TASK-P1-04         TASK-P1-03         No
GAP-DB-API-012  JWT Revocation DB  P1         TASK-P1-08         None               Yes

GAP-UI-001      Dialog Overflow    P0         TASK-P0-08         None               Yes
GAP-UI-002      Double Padding 98p P0         TASK-P0-09         None               Yes
GAP-UI-003      Hex Color Tokens   P1         TASK-P1-12         None               Yes
GAP-UI-004      Font Stack Bypas   P1         TASK-P1-13         None               Yes
GAP-UI-005      Radius Mismatch    P2         TASK-P2-08         None               Yes
GAP-UI-006      Select iOS Zoom    P1         TASK-P1-14         None               Yes
GAP-UI-007      Touch Target 44px  P2         TASK-P2-09         None               Yes
GAP-UI-008      Table Sticky Cols  P1         TASK-P1-15         None               Yes
GAP-UI-009      ApexCharts Dark    P2         TASK-P2-10         None               Yes
GAP-UI-010      Sidebar Codebases  P1         TASK-P1-17         None               Yes
GAP-UI-011      Breakpoint 768/1024P1         TASK-P1-16         None               Yes
GAP-UI-012      Z-Index Hierarchy  P2         TASK-P2-11         None               Yes
GAP-UI-013      Button Submit Lock P2         TASK-P2-12         None               Yes
GAP-UI-014      Empty States SharedP3         TASK-P3-04         None               Yes
GAP-UI-015      Textarea ConstraintsP3        TASK-P3-05         None               Yes
====================================================================================================
```

---

## 6. ORDERED IMPLEMENTATION ROADMAP & EXECUTION PHASES

```
+----------------------------------------------------------------------------------------------------+
|                                    PHASED EXECUTION TIMELINE                                       |
+----------------------------------------------------------------------------------------------------+
| PHASE 1: Critical Security, Statutory & Viewport Hotfixes (P0 — 9 Tasks / Days 1–3)                |
| -> Database Migrations (MIGRATE-01 & 02)                                                           |
| -> Fix Tamil Nadu PT Inversion & Monthly Slabs (TASK-P0-01)                                        |
| -> Close Privilege Escalation on PUT /api/employees/:id (TASK-P0-02)                               |
| -> Close Employee Creation Seat Quota Bypass (TASK-P0-03)                                          |
| -> Terminate Biometric ADMS Default Tenant Fallback (TASK-P0-04)                                   |
| -> Enforce Month Lock on Attendance Regularization (TASK-P0-05)                                    |
| -> Rebuild Dialog Container with Scroll & Max-Height (TASK-P0-08)                                  |
| -> Eliminate Double Padding on 98 Page Roots (TASK-P0-09)                                          |
+----------------------------------------------------------------------------------------------------+
| PHASE 2: Validation Gates, File Security, Tokens & Navigation (P1 — 17 Tasks / Days 4–8)            |
| -> Implement Zod Backend Validation Middleware on Employee Routes (TASK-P1-01)                     |
| -> Close BOLA Vulnerability on Static Uploads (TASK-P1-03) & Remove Public Default (TASK-P1-04)    |
| -> Attach Onboarding Task & BGV Verification Gates (TASK-P1-06)                                    |
| -> Multi-Department Clearance Gates on Exit (TASK-P1-07)                                           |
| -> Invalidate JWT Sessions & DeviceSessions upon Exit (TASK-P1-08)                                 |
| -> Branch Geofencing Coordinates Migration & Calculation (TASK-P1-09)                              |
| -> Update TN LWF Seed Rates to Amended 20/40 (TASK-P1-10)                                          |
| -> Reconcile Statutory Form Generator (Form U, V, W, X, S) (TASK-P1-11)                            |
| -> Migrate 552 Hex Colors to OKLCH Design Tokens (TASK-P1-12)                                      |
| -> Harmonize SelectTrigger Font to 16px to stop iOS Safari Zoom (TASK-P1-14)                       |
| -> Implement Sticky Table Columns on Mobile Data Tables (TASK-P1-15)                               |
| -> Replace Monolithic DreamsSidebar with Typed PortalSidebar (TASK-P1-17)                          |
+----------------------------------------------------------------------------------------------------+
| PHASE 3: Workflows, Versioned Salary & Visual Polish (P2 — 12 Tasks / Days 9–13)                   |
| -> Multi-Party Approval Scheduler for Transfers (TASK-P2-01)                                       |
| -> Versioned EmployeeSalaryAssignment on Promotions (TASK-P2-02)                                  |
| -> Automated Full & Final Settlement Calculation Engine (TASK-P2-03)                               |
| -> Midnight Rollover Attendance Punch Pairing (TASK-P2-05)                                         |
| -> Disciplinary Warning Appeal Hearing Workflow (TASK-P2-06)                                       |
| -> Connect Approved Leave Encashments to Payroll (TASK-P2-07)                                      |
| -> Standardize Component Radii to rounded-md (TASK-P2-08)                                          |
| -> Enforce 44px Touch Targets on Action Menus (TASK-P2-09)                                         |
| -> Synchronize ApexCharts with Dark Mode (TASK-P2-10)                                              |
| -> Enforce Button Loading States & Double-Click Mutexes (TASK-P2-12)                               |
+----------------------------------------------------------------------------------------------------+
| PHASE 4: Data Hygiene & Long-Term Retention (P3 — 5 Tasks / Days 14–16)                            |
| -> 24-Hour Time Format Regex Validation on Shifts (TASK-P3-01)                                     |
| -> Standardize Phone & Address E.164 Formatting (TASK-P3-02)                                        |
| -> Replace Cascade Deletes with Soft Deletion on Core Models (TASK-P3-03)                          |
| -> Standardize Empty State Illustrations Across Modules (TASK-P3-04)                               |
| -> Add Textarea Resize Constraints & Character Badges (TASK-P3-05)                                 |
+----------------------------------------------------------------------------------------------------+
```

---

## 7. TEST STRATEGY & BROWSER QA PROTOCOL

### 7.1. Automated Test Plan
- **Unit & Formula Tests:**
  - `payroll-tamilnadu-pt.test.ts`: Verify gross wages ₹15,000, ₹25,000, ₹40,000, ₹55,000, ₹70,000, and ₹100,000 deduct exactly ₹0, ₹16.67, ₹39.17, ₹85.00, ₹126.67, and ₹182.50 per month.
  - `leave-halfday-precision.test.ts`: Verify applying `0.5` days debits exactly `0.5` in `LeaveRequest` and `LeaveLedgerEntry`.
- **Security & Authorization Tests:**
  - Automated Jest/Supertest suite verifying 403 Forbidden on unauthenticated `PUT /api/employees/:id`, seat limit enforcement, unmapped biometric serial rejection, and cross-user document BOLA.
- **Workflow State Machine Tests:**
  - Verify that exit finalization fails with `422 Unprocessable Entity` if any department clearance is in `"pending"` or `"rejected"` status.

### 7.2. Browser-Based Visual QA Protocol
Manual and Playwright headless QA across the 9 responsive viewport tiers:
1. **Mobile (320px, 375px, 390px, 430px):**
   - Verify modal forms fit on screen with on-screen keyboard open.
   - Verify submit and cancel buttons remain sticky at the bottom.
   - Verify zero horizontal page scrolling caused by double padding.
   - Verify table action menus have minimum 44px touch height.
2. **Tablet (768px, 1024px):**
   - Verify mobile drawer opens cleanly below 1024px and desktop sidebar mounts cleanly at 1024px+.
   - Verify form grid stacking reflows from 1 column to 2 columns.
3. **Desktop (1280px, 1440px, 1920px):**
   - Verify mini-rail sidebar (72px) expands hover flyouts cleanly.
   - Verify dark mode switch synchronizes card backgrounds, borders, text, and ApexCharts without un-themed white flashes.

---

## 8. DEFINITION OF DONE (DoD)

A task or phase is marked **DONE** only when all of the following conditions are empirically verified:
1. **Codebase Integrity:** Zero TypeScript compiler errors (`npx tsc --noEmit` exits with 0).
2. **Automated Verification:** All corresponding automated unit and integration tests pass without failures.
3. **Statutory Accuracy:** Calculations match official central/state gazette schedules within ±₹0.01 tolerance.
4. **Security Hardening:** Penetration test passes; privilege escalation, BOLA, and quota bypass vectors return 401/403.
5. **Responsive Compliance:** Tested on real or emulated 320px, 375px, 768px, and 1280px viewports with zero clipping or layout overflow.
6. **Zero Speculative Code:** Every implemented field maps to an authorized business requirement.
7. **Audit Preservation:** Changes do not modify historical locked payroll periods or alter existing working functionality.

---

## STRICT ATTESTATION
- **Zero code, schema, migration, or configuration changes were executed during this planning phase.**
- All 62 gaps and 43 tasks are fully reconciled and ready for systematic implementation.

**The Implementation Execution Plan is finalized. Awaiting explicit user approval to proceed with Phase 1 execution.**

