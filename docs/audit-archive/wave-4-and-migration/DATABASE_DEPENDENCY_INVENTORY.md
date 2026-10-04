# Database Dependency Inventory

## Overview
This inventory catalogs every database dependency, ORM mapping, client initialization point, connection pooler, background job, and test suite across the application.

---

## 1. Database Clients and Connection Managers

| File | Purpose | Engine / Driver | Supabase Integration Notes |
| :--- | :--- | :--- | :--- |
| `server/src/prisma.ts` | Central Prisma client instance & proxy facade export | `@prisma/client` | Reads `DATABASE_URL` (PgBouncer transaction pooler) |
| `server/src/facade/prisma-proxy.facade.ts` | Dynamic proxy intercepting model calls | Proxy pattern | Routes to tenant connection pool or shared client |
| `server/src/services/tenant-connection-manager.service.ts` | Connection pool manager & tenant database registry | Prisma Client Pool | Dynamically instantiates and caches tenant connections |
| `server/src/extensions/tenant-isolation.extension.ts` | Prisma Client extension ($extends) | Client Extension | Enforces automated `where: { tenantId }` filtering |
| `server/src/services/backup.service.ts` | Automated database backup engine | `pg_dump` + Prisma Exporter | Generates gzip SQL dumps directly from PostgreSQL |

---

## 2. Model & Table Inventory

The PostgreSQL database contains **161 distinct tables / models** categorized as follows:

| Category | Model Count | Key Entities |
| :--- | :--- | :--- |
| **Authentication & IAM** | 8 | `User`, `UserRole`, `Profile`, `TwoFactorOtp`, `Session`, `LoginHistory`, `Permission`, `RolePermission` |
| **Tenancy & Workspaces** | 7 | `Tenant`, `TenantSubscription`, `TenantSetting`, `TenantBilling`, `Branch`, `Department`, `Designation` |
| **Core HRMS & Staff** | 18 | `Employee`, `EmployeeDocument`, `EmployeeSkill`, `EmployeeEmergencyContact`, `EmployeeBanking`, `EmployeeContract` |
| **Attendance & Shifts** | 14 | `Attendance`, `BiometricDevice`, `BiometricLog`, `Shift`, `ShiftRoster`, `OvertimeRequest`, `Holiday` |
| **Leave Management** | 8 | `LeaveRequest`, `LeaveType`, `LeaveBalance`, `LeavePolicy`, `LeaveAllocation` |
| **Payroll & Statutory** | 22 | `PayrollRun`, `Payslip`, `PayrollItem`, `SalaryStructure`, `SalaryComponent`, `TaxSlab`, `ProvidentFundSetting`, `EsiSetting` |
| **Accounting & General Ledger** | 24 | `ChartOfAccount`, `GeneralLedgerEntry`, `JournalEntry`, `FiscalPeriod`, `FinancialStatement`, `TaxRate` |
| **Sales, POS & Invoicing** | 20 | `Sale`, `SaleItem`, `SalePayment`, `InvoiceTemplate`, `HeldOrder`, `PosTerminal`, `PosSession` |
| **Purchasing & Inventory** | 16 | `Purchase`, `PurchaseItem`, `PurchasePayment`, `Product`, `Warehouse`, `StockMovement`, `StockAdjustment` |
| **CRM & Deals** | 12 | `CrmContact`, `CrmCompany`, `CrmLead`, `CrmDeal`, `CrmPipeline`, `CrmActivity`, `CallHistory` |
| **Recruitment & ATS** | 8 | `JobPosting`, `Candidate`, `JobApplication`, `Interview`, `CandidateOffer` |
| **Automation & Alerts** | 4 | `AutomationRule`, `AutomationLog`, `NotificationTrigger`, `NotificationLog` |

---

## 3. Background Jobs, Cron & Workers

| Service / Worker | Schedule / Trigger | Database Interaction |
| :--- | :--- | :--- |
| `cron.service.ts` | Recurring Node cron | Scans `shift_rosters`, `attendance`, `payroll_runs` |
| `payroll-batch.service.ts` | Monthly payroll calculation | Atomic transactions across `salary_structures` & `payslips` |
| `storage-retention.service.ts` | Daily retention audit | Queries expired `stored_documents` and cleans metadata |
| `statutory-return.service.ts` | Tax period end | Aggregates TDS, PF, and ESI data for government filing |
| `zk-biometric.service.ts` | Real-time ADMS push | Ingests hardware punch logs into `biometric_logs` and `attendance` |

---

## 4. Test Suite Inventory

| Test File | Target Module | Execution Engine | Status on Supabase |
| :--- | :--- | :--- | :--- |
| `autoscoping-extension.test.ts` | Multi-tenant query interception | `npx tsx` | **10/10 PASS** |
| `tenant-context-pilot.test.ts` | Request context & fail-closed isolation | `npx tsx` | **12/12 PASS** |
| `prisma-proxy-facade.test.ts` | Dynamic proxy facade & transactions | `npx tsx` | **12/12 PASS** |
| `w1-c1-contacts-crm-isolation.test.ts` | CRM Contacts CRUD & cross-tenant security | `npx vitest` | **8/8 PASS** |
| `w1-c2-invoice-details-isolation.test.ts` | Invoices, Payments & GL ledger settlement | `npx vitest` | **13/13 PASS** |
