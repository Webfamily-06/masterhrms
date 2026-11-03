# MASTERHRMS — DATABASE & API GAP REGISTER

**Document Target:** Database Schema Deficiencies, Relational Constraints, API Authorization & Multi-Tenancy  
**Date of Audit:** November 3, 2026  
**Status:** COMPLETE TECHNICAL AUDIT (12 Unique Technical Vulnerabilities Audited)

---

## 1. REGISTER SUMMARY BY TECHNICAL LAYER

| Category | Count | Primary Systems Impacted | Severity |
|---|:---:|---|:---:|
| **API Authorization & Role Enforcement** | 3 | Route middleware, permission bypasses, seat limit evasion. | **CRITICAL (P0)** |
| **Tenant & Data Isolation** | 2 | ADMS biometric fallback, static uploads employee-level BOLA. | **CRITICAL (P0)** |
| **Database Schema & Data Types** | 4 | Missing employee columns, Int precision conflict, Branch coordinates. | **HIGH (P1)** |
| **Relational Integrity & Retention** | 3 | Cascade deletion of statutory logs, unconstrained custom field entities. | **HIGH (P1)** |
| **TOTAL** | **12** | **Full Source Evidence Grounded in Repository** | - |

---

## 2. DETAILED DEFECT REGISTER

### GAP-DB-API-001: Missing Native Columns on `Employee` Model Forcing Custom Field Fallback
- **Severity:** High (P1)
- **Technical Layer:** Database Schema (`server/prisma/schema.prisma:308-438`)
- **Code Evidence:**
  ```prisma
  model Employee {
    id                      String         @id @default(uuid()) @db.VarChar(36)
    tenantId                String         @map("tenant_id") @db.VarChar(36)
    ...
    // Notice: NO maritalStatus, bloodGroup, emergencyContactName, emergencyContactPhone,
    // emergencyContactRelationship, addressLine1, addressLine2, city, district, postalCode
  }
  ```
- **Description:** Core employee demographic and contact fields are completely absent from the `employees` table schema. The service layer (`server/src/services/employee.service.ts:815-855`) routes these fields into generic `custom_fields` and `custom_field_values` tables via `setEmployeeMetadata`.
- **Consequences:**
  1. **Query Performance Degradation:** Fetching an employee with their emergency contact, blood group, and address requires an additional $N$ database lookups across `custom_field_values`.
  2. **Loss of Schema Validation:** Address, blood group, and emergency phone numbers are stored as untyped strings with zero database-level validation.
  3. **Indexing Impossibility:** Cannot create fast composite indexes on `[tenantId, city]` or `[tenantId, bloodGroup]`.
- **Remediation:** Add structured columns to `model Employee` in `schema.prisma`:
  - `maritalStatus String? @map("marital_status") @db.VarChar(20)`
  - `bloodGroup String? @map("blood_group") @db.VarChar(10)`
  - `addressLine1 String? @map("address_line1") @db.VarChar(255)`
  - `addressLine2 String? @map("address_line2") @db.VarChar(255)`
  - `city String? @db.VarChar(100)`
  - `district String? @db.VarChar(100)`
  - `postalCode String? @map("postal_code") @db.VarChar(20)`
  - `country String? @default("India") @db.VarChar(100)`
  - `emergencyContactName String? @map("emergency_contact_name") @db.VarChar(150)`
  - `emergencyContactRelationship String? @map("emergency_contact_relationship") @db.VarChar(50)`
  - `emergencyContactPhone String? @map("emergency_contact_phone") @db.VarChar(50)`

---

### GAP-DB-API-002: Integer Typing of `LeaveRequest.days` Preventing Fractional Leave
- **Severity:** High (P1)
- **Technical Layer:** Database Schema (`server/prisma/schema.prisma:492`)
- **Code Evidence:**
  ```prisma
  model LeaveRequest {
    ...
    days        Int         @default(1)
    status      LeaveStatus @default(pending)
  ```
- **Description:** `days` is defined as an `Int`. In Indian corporate leave rules, half-day leaves (0.5 days for morning or afternoon shifts) are a standard statutory allowance under Shops and Establishments Acts.
- **Consequences:** The database cannot store `0.5`. Any attempt to store fractional leaves forces rounding up to `1`, resulting in the deduction of full-day wages and leave balances for half-day absences.
- **Remediation:** Alter `LeaveRequest.days` to `Decimal(4, 1) @default(1.0)` or `Float`.

---

### GAP-DB-API-003: Missing Geographic & Statutory Attributes on `Branch` Model
- **Severity:** High (P1)
- **Technical Layer:** Database Schema (`server/prisma/schema.prisma:4409-4431`)
- **Code Evidence:**
  ```prisma
  model Branch {
    id        String   @id @default(uuid()) @db.VarChar(36)
    tenantId  String   @map("tenant_id") @db.VarChar(36)
    name      String   @db.VarChar(255)
    code      String?  @db.VarChar(50)
    address   String?
    phone     String?  @db.VarChar(50)
    email     String?  @db.VarChar(255)
    status    String   @default("active") @db.VarChar(20)
  ```
- **Description:** The `Branch` model contains only basic address and contact strings. It completely lacks:
  - `latitude` and `longitude` coordinates for GPS geofencing.
  - `radiusMeters` perimeter radius.
  - State code (`stateCode`) for multi-state Professional Tax determination.
  - Statutory registration numbers (S&E Registration No, Factory License No).
- **Consequences:** `attendance.service.ts:207` is forced to hardcode corporate coordinates to Mumbai (19.0760, 72.8777), breaking geofencing validation across all non-Mumbai branches.
- **Remediation:** Add `latitude Float?`, `longitude Float?`, `geofenceRadius Int? @default(500)`, `stateCode String? @db.VarChar(10)`, and `statutoryRegNumber String? @db.VarChar(100)` to `Branch`.

---

### GAP-DB-API-004: Missing Statutory & Rehire Columns on `EmployeeExit`
- **Severity:** Medium (P2)
- **Technical Layer:** Database Schema (`server/prisma/schema.prisma:2261-2298`)
- **Code Evidence:**
  ```prisma
  model EmployeeExit {
    ...
    fnfSettlementAmount Decimal? @default(0.00) @map("fnf_settlement_amount") @db.Decimal(12, 2)
    // Missing: rehireEligible, gratuityAmount, leaveEncashmentAmount, noticeShortfallDays, noticeShortfallAmount
  ```
- **Description:** `EmployeeExit` stores only a single lump-sum `fnfSettlementAmount`. It lacks the discrete components required by Indian labour law audits to substantiate the final settlement statement.
- **Consequences:** Service parameters like `rehireEligible` (passed in `executeTermination`) are discarded, and F&F calculations cannot be audited against statutory components.
- **Remediation:** Add `rehireEligible Boolean @default(true)`, `gratuityAmount Decimal?`, `leaveEncashmentAmount Decimal?`, `noticeShortfallDays Int? @default(0)`, and `noticeShortfallAmount Decimal?`.

---

### GAP-DB-API-005: Unrestricted Privilege Escalation on `PUT /api/employees/:id`
- **Severity:** **CRITICAL (P0)**
- **Technical Layer:** API Route Authorization (`server/src/routes/employees.routes.ts:306-410`)
- **Code Evidence:**
  ```typescript
  employeesRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    // Only checks requireAuth! NO requireRole, NO requirePermission!
    const { salary, status, employmentType, pfEligible, ... } = req.body;
  ```
- **Description:** The legacy employee update route fails to restrict access to administrators or check caller permissions. Any authenticated employee possessing a valid JWT token can issue a `PUT` request to update any employee's record in their tenant.
- **Consequences:** Unauthorized salary inflation, self-promotion, status manipulation, and statutory opt-out bypasses.
- **Remediation:** Attach `requirePermission("hrm.employees.edit")` middleware to `employeesRouter.put("/:id")`, or deprecate this legacy route in favor of `hr-employees.routes.ts:239`.

---

### GAP-DB-API-006: Authorization & Quota Bypass on Primary Creation Endpoint `POST /api/v1/hr/employees`
- **Severity:** **CRITICAL (P0)**
- **Technical Layer:** API Route Authorization (`server/src/routes/hr-employees.routes.ts:40-60`)
- **Code Evidence:**
  ```typescript
  hrEmployeesRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
    // Missing requirePermission("hrm.employees.create")
    // Missing requireWithinLimit("seats")
  ```
- **Description:** While the older endpoint (`/api/employees`) checked both permissions and subscription seat limits, the new 8-step wizard API endpoint checks only `requireAuth`.
- **Consequences:** Unauthorized users can create employee records, and tenants can bypass maximum employee seat capacity limits defined in their commercial subscription plan.
- **Remediation:** Update route definition:
  ```typescript
  hrEmployeesRouter.post(
    "/",
    requireAuth,
    requirePermission("hrm.employees.create"),
    requireWithinLimit("seats"),
    async (req: AuthRequest, res: Response) => { ... }
  );
  ```

---

### GAP-DB-API-007: Cross-Tenant Data Contamination via Biometric ADMS Fallback
- **Severity:** **CRITICAL (P0)**
- **Technical Layer:** API Multi-Tenant Routing (`server/src/routes/biometric.routes.ts:1435-1445`)
- **Code Evidence:**
  ```typescript
  const defaultTenant = await rawPrisma.tenant.findFirst();
  ...
  await processBiometricPunch({
    tenantId: device?.tenantId || defaultTenant.id,
    ...
  });
  ```
- **Description:** If a biometric device pushes punches to `/iclock/cdata` with an unmapped or unrecognized serial number, the route falls back to assigning the punches to the first tenant in the database.
- **Consequences:** In multi-tenant environments, punches from newly provisioned or misconfigured devices are attributed to tenant #1, corrupting attendance records and leaking employee punch timestamps.
- **Remediation:** If `device` is null or `device.tenantId` cannot be determined, the handler must reject the request with `401 Unauthorized` or log an unassigned hardware buffer instead of attributing punches to an arbitrary customer.

---

### GAP-DB-API-008: Broken Object-Level Authorization (BOLA) in Static Uploads Middleware
- **Severity:** **CRITICAL (P0)**
- **Technical Layer:** File Security Middleware (`server/src/middleware/uploads-security.middleware.ts:75-115`)
- **Description:** The middleware validates that the caller's `userTenantId` matches `mediaFile.tenantId`. However, it performs zero checks on employee-level access or document classification.
- **Consequences:** A regular employee in Tenant A can view confidential compensation letters, medical bills, and disciplinary warning notices of other employees in Tenant A simply by requesting the file URL.
- **Remediation:** Check whether the requesting user is either:
  1. An HR administrator (`hr_admin` or `hrm.documents.view_all`).
  2. The specific employee who owns the document (`mediaFile.uploadedById === employeeId` or document recipient ID).

---

### GAP-DB-API-009: Public Asset Whitelist Abuse via Default Folder Parameter
- **Severity:** High (P1)
- **Technical Layer:** Media API & Upload Security (`server/src/routes/media.routes.ts:30`)
- **Code Evidence:**
  ```typescript
  const folder = req.body.folder || "system/branding";
  ```
- **Description:** When an upload request omits `folder`, it defaults to `"system/branding"`. Paths starting with `"system/branding/"` are whitelisted as public assets in `uploadsSecurityMiddleware`, allowing unauthenticated downloads.
- **Consequences:** Private identity documents uploaded through this route become publicly accessible on the internet without credentials.
- **Remediation:** Default `folder` to `"tenant/documents"` and restrict `"system/branding"` uploads strictly to users with the `super_admin` role.

---

### GAP-DB-API-010: Statutory Non-Compliance via Cascade Deletion of Employee Lifecycle Records
- **Severity:** High (P1)
- **Technical Layer:** Database Relational Integrity (`server/prisma/schema.prisma:308-438`)
- **Code Evidence:**
  ```prisma
  model EmployeeExit {
    ...
    employee Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  }
  model DisciplinaryWarning {
    ...
    employee Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  }
  ```
- **Description:** `onDelete: Cascade` is configured across all lifecycle models. Deleting an `Employee` record permanently purges all associated disciplinary records, promotional history, and exit documentation.
- **Statutory Conflict:** Under the Tamil Nadu Shops and Establishments Act, EPF Act, and Payment of Wages Act, employers are legally required to preserve wage slips, attendance registers, and termination records for 3 to 8 years.
- **Remediation:** Remove `onDelete: Cascade` on statutory and lifecycle models. Implement soft deletion (`deletedAt DateTime?`) on `model Employee`.

---

### GAP-DB-API-011: Dangling Custom Field Values Due to Missing Relational Foreign Keys
- **Severity:** Medium (P2)
- **Technical Layer:** Database Relational Integrity (`server/prisma/schema.prisma:4323-4338`)
- **Code Evidence:**
  ```prisma
  model CustomFieldValue {
    ...
    entityId String @map("entity_id") @db.VarChar(36) // Raw string, no relation to Employee
  ```
- **Description:** Because `entityId` is an untyped string, deleting an employee leaves orphaned metadata records (addresses, blood group, emergency contacts) indefinitely in `custom_field_values`.
- **Consequences:** Database bloat and privacy violations under DPDP Act 2023 (failure to erase personal data upon account deletion).

---

### GAP-DB-API-012: Inconsistent Route Mount Points Creating Conflicting Logic Paths
- **Severity:** Medium (P2)
- **Technical Layer:** Express Router Mount Configuration (`server/src/index.ts:469-478, 577-578`)
- **Description:**
  - Route A: `/api/employees` → `employees.routes.ts`
  - Route B: `/api/v1/hr/employees` → `hr-employees.routes.ts`
  - Route C: `/api/hr/employees` → `hr-employees.routes.ts` (via fallback mount `app.use("/api", platformFoundationRouter)`)
- **Consequences:** Different API endpoints targeting the same underlying `Employee` entity execute completely different validation logic, authorization checks, and audit logging, making holistic security auditing brittle.

