# MASTERHRMS — WORKSTREAM C DATABASE AND API DEPENDENCY REPORT
## Schema Interactions, Safe Projections & Endpoint Contracts

**Document Reference**: `docs/hrms-audit/WORKSTREAM_C_DATABASE_API_DEPENDENCY_REPORT.md`  
**Audit Purpose**: Map every database entity, relation, safe projection, and HTTP API contract utilized by Workstream C.  
**Schema Drift Strategy**: Zero remote migrations; explicit `SAFE_EMPLOYEE_SELECT` projection.  

---

### 1. Database Dependency Mapping

| Prisma Model | Underlying SQL Table | Usage in Workstream C | Queried Columns / Relations | Schema Drift Safeguard |
| :--- | :--- | :--- | :--- | :--- |
| **`Tenant`** | `tenants` | Root tenant validation & company identity | `id`, `name`, `slug` | Verified in live DB. |
| **`CompanyProfile`** | `company_profiles` | Establishment legal name, PAN, CIN, address | `id`, `legalName`, `tradeName`, `cin`, `pan`, `registeredAddress`, `signatoryName` | Verified in live DB. |
| **`Establishment`** | `establishments` | Statutory registration numbers (EPF, ESI, PT) | `id`, `name`, `code`, `address`, `epfCode`, `esicCode`, `ptRegistrationNo` | Verified in live DB. |
| **`Employee`** | `employees` | Demographic, KYC, position, bank, and service data | Projected exclusively via `SAFE_EMPLOYEE_SELECT` | **Critical**: Unmigrated columns (`fatherOrSpouseName`, `presentAddress`, etc.) omitted from SQL `SELECT` to prevent query failure. |
| **`Department`** | `departments` | Employee department name | `id`, `name` | Verified in live DB. |
| **`EmployeeExit`** | `employee_exits` | Separation date and exit reason | `id`, `resignationDate`, `lastWorkingDay`, `reason`, `status` | Verified in live DB. |
| **`EmployeeSalaryAssignment`** | `employee_salary_assignments` | Wage contract and monthly CTC | `id`, `ctcMonthly`, `ctcAnnual`, `isCurrent` | Verified in live DB. |
| **`Attendance`** | `attendance` | Daily 31-day presence matrix | `employeeId`, `date`, `status`, `hours`, `overtimeMinutes` | Verified in live DB. |
| **`ShiftDefinition`** | `shift_definitions` | Default work hours and rest intervals | `name`, `startTime`, `endTime`, `breakMinutes`, `breakStart` | Verified in live DB. |
| **`PayrollRun`** | `payroll_runs` | Payroll cycle status and lock | `id`, `periodMonth`, `periodYear`, `status`, `processedAt` | Verified in live DB. |
| **`PayrollSnapshot`** | `payroll_snapshots` | Frozen earnings and statutory deductions | `employeeId`, `payableDays`, `grossEarned`, `totalDeductions`, `netPay`, `snapshotData` | Verified in live DB. |
| **`LeaveRequest`** | `leave_requests` | Approved leave days by leave category | `employeeId`, `leaveTypeId`, `days`, `status`, `startDate`, `endDate` | Verified in live DB. |
| **`LeaveType`** | `leave_types` | Leave category identification | `id`, `name`, `code` | Verified in live DB. |

---

### 2. Defensive Projection: `SAFE_EMPLOYEE_SELECT`

Located in `server/src/services/statutory/builders/statutory-builder-common.ts`:
```typescript
export const SAFE_EMPLOYEE_SELECT = {
  id: true,
  tenantId: true,
  userId: true,
  departmentId: true,
  branchId: true,
  designationId: true,
  managerId: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  position: true,
  employmentType: true,
  status: true,
  salary: true,
  joinedAt: true,
  pan: true,
  aadhaar: true,
  uan: true,
  esiNumber: true,
  bankName: true,
  bankAccount: true,
  bankIfsc: true,
  bankBranch: true,
  dateOfBirth: true,
  gender: true,
  taxRegime: true,
  state: true,
  workStateCode: true,
  establishmentId: true,
  clientId: true,
  pfNumber: true,
  pfEligible: true,
  pfCalculationMethod: true,
  pfCustomCap: true,
  esiEligible: true,
  ptEligible: true,
  tdsEligible: true,
  createdAt: true,
  updatedAt: true,
  department: {
    select: { id: true, name: true },
  },
  employeeExits: {
    take: 1,
    orderBy: { createdAt: "desc" },
    select: { id: true, resignationDate: true, lastWorkingDay: true, reason: true, status: true },
  },
  salaryAssignments: {
    where: { isCurrent: true },
    take: 1,
    select: { id: true, ctcMonthly: true, ctcAnnual: true, isCurrent: true },
  },
} as const;
```
This guarantees that Prisma queries only execute against columns that physically exist in the remote database.

---

### 3. API Route Specifications

Mounted in `server/src/routes/statutory-registers.routes.ts`:

#### 1. Catalog Endpoint
- `GET /api/payroll/statutory-registers/catalog`
- **Output**: Array of statutory register metadata (`FORM_U`, `FORM_V`, `FORM_W`, `FORM_X`, `FORM_S`).

#### 2. Preview Endpoint
- `GET /api/payroll/statutory-registers/preview/:formCode`
- **Query Params**: `tenantId`, `year`, `month`, `payrollRunId`, `establishmentId`.
- **Output**: Full structured JSON model with establishment metadata, column names, rows, and totals.

#### 3. Single Register Excel Export
- `GET /api/payroll/statutory-registers/export/:formCode`
- **Headers**: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Output**: Downloadable `.xlsx` file formatted according to government labor templates.

#### 4. Single Register PDF Export
- `GET /api/payroll/statutory-registers/export/:formCode/pdf`
- **Headers**: `Content-Type: application/pdf`
- **Output**: Downloadable A4 Landscape PDF with official headers and digital seals.

#### 5. Complete 5-Sheet Multi-Tab Bundle
- `GET /api/payroll/statutory-registers/bundle`
- **Output**: Consolidated `.xlsx` workbook containing all five registers in tabs matching the client reference workbook (`Paysheet_ENABL_OCT_2026 -Final.xlsx`).

#### 6. Pre-Flight Validation Diagnostics
- `GET /api/payroll/statutory-registers/validate/:formCode`
- **Output**: Detailed validation report, error count, warning count, and actionable missing field issues.

#### 7. Payroll Reconciliation Endpoint
- `GET /api/payroll/statutory-registers/reconcile/:formCode`
- **Output**: Variance breakdown against frozen payroll snapshots.

