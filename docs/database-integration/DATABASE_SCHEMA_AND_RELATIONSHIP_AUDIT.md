# DATABASE SCHEMA AND RELATIONSHIP AUDIT

## 1. Executive Summary

This document audits the complete MySQL database schema backing the Master HRMS platform (`master_hrms` on MySQL 3306), managed via Prisma ORM (`server/prisma/schema.prisma`).

The current schema contains **159 Prisma models** encompassing:
- Multi-tenant Core & Access Control (Tenants, Users, Profiles, Roles, Permissions)
- HR Core (Employees, Departments, Designations, Workflows, Shifts)
- Attendance & Time Tracking (Biometric Devices, PIN Mappings, Attendance Logs, Shifts)
- Leave Management (Leave Types, Balances, Requests, Approvals)
- Advanced Payroll Engine (Salary Components, Structures, Assignments, Payroll Runs, Payslips, Snapshots)
- Statutory Compliance & Tax (Statutory Rules, Tax Declarations, Proofs, FBP, ECR, ESIC)
- Banking & Disbursements (Batches, Items, Digital Signatures, Bank Formats)
- Expenses & Claims (Expense Categories, Expenses, Mileage, Per Diems, Approvals)
- Performance & OKRs (Cycles, Objectives, Key Results, Reviews, Check-ins)
- Recruitment & ATS (Job Openings, Candidates, Interviews, Stages)
- Training & LMS (Courses, Modules, Enrollments, Certifications)
- Asset Management (Assets, Categories, Assignments, Maintenance, Disposals)
- CRM & Sales (Leads, Deals, Pipelines, Contacts, Accounts, Activities)
- Procurement & Inventory (Suppliers, POs, Products, Warehouses, Stock Adjustments)
- Finance & Accounting (Chart of Accounts, Journal Entries, Tax Rates, Financial Years)
- Helpdesk & Support (Tickets, Categories, SLAs, Comments)

---

## 2. Model Categorization & Tenant Isolation Architecture

The application strictly classifies models into three isolation classes (`server/src/config/tenant-models.config.ts`):

1. **Global Control Plane Models (`GLOBAL_MODELS`)**:
   - `User`, `SubscriptionPlan`, `Addon`, `CmsPage`, `Permission`, `TwoFactorOtp`
   - Scoped globally to the platform; no `tenantId` column.

2. **Root Tenant Model**:
   - `Tenant`: Top-level multi-tenant container identifying each organization.

3. **Direct Multi-Tenant Entities (`DIRECT_TENANT_MODELS`)**:
   - Contains explicit `tenantId` foreign key referencing `Tenant(id)`.
   - Covered by Prisma proxy middleware injection: all queries are automatically filtered by `tenantId = activeTenantId`.

4. **Child-Dependent Multi-Tenant Entities (`CHILD_DEPENDENT_MODELS`)**:
   - Child records without direct `tenantId` (e.g. `SalaryStructureItem`, `BankDisbursementItem`, `TaxDeclarationProof`, `OkrKeyResult`).
   - Tenant isolation enforced transitively through mandatory relation join to parent entity possessing `tenantId`.

---

## 3. Detailed Model Audit by Business Domain

### 3.1 Organization, Employees & Roles
| Model | Primary Key | Tenant Scoped | Foreign Keys / Relations | Status |
|---|---|---|---|---|
| `Tenant` | `id` (VARCHAR) | Root | Employees, Users, Departments, etc. | Verified |
| `User` | `id` (VARCHAR) | Global | Profiles, UserRoles, AuditLogs | Verified |
| `Profile` | `id` (VARCHAR) | Yes (`tenantId`) | `userId -> User.id`, `tenantId -> Tenant.id` | Verified |
| `Department` | `id` (VARCHAR) | Yes (`tenantId`) | `headOfDepartmentId -> Employee.id` | Verified |
| `Designation` | `id` (VARCHAR) | Yes (`tenantId`) | `departmentId -> Department.id` | Verified |
| `Employee` | `id` (VARCHAR) | Yes (`tenantId`) | `userId -> User.id`, `departmentId -> Department.id`, `designationId -> Designation.id` | Verified |

### 3.2 Attendance & Biometric Integration
| Model | Primary Key | Tenant Scoped | Foreign Keys / Relations | Status |
|---|---|---|---|---|
| `BiometricDevice` | `id` (VARCHAR) | Yes (`tenantId`) | `pinMappings -> BiometricPinMapping` | Verified |
| `BiometricPinMapping` | `id` (VARCHAR) | Yes (`tenantId`) | `deviceId -> BiometricDevice.id`, `employeeId -> Employee.id` | Verified |
| `Attendance` | `id` (VARCHAR) | Yes (`tenantId`) | `employeeId -> Employee.id`, `shiftId -> Shift.id` | Verified |
| `AttendanceAuditLog` | `id` (VARCHAR) | Yes (`tenantId`) | `employeeId -> Employee.id` | Verified |

### 3.3 Advanced Payroll & Banking (Phase 1 & Phase 2 Verified)
| Model | Primary Key | Tenant Scoped | Foreign Keys / Relations | Status |
|---|---|---|---|---|
| `SalaryComponent` | `id` (VARCHAR) | Yes (`tenantId`) | `structures -> SalaryStructureItem` | Verified |
| `SalaryStructure` | `id` (VARCHAR) | Yes (`tenantId`) | `items -> SalaryStructureItem` | Verified |
| `EmployeeSalaryAssignment` | `id` (VARCHAR) | Yes (`tenantId`) | `employeeId -> Employee.id`, `structureId -> SalaryStructure.id` | Verified |
| `PayrollRun` | `id` (VARCHAR) | Yes (`tenantId`) | `payslips -> Payslip`, `disbursementBatches -> BankDisbursementBatch` | Verified |
| `Payslip` | `id` (VARCHAR) | Yes (`tenantId`) | `payrollRunId -> PayrollRun.id`, `employeeId -> Employee.id` | Verified |
| `BankDisbursementBatch` | `id` (VARCHAR) | Yes (`tenantId`) | `payrollRunId -> PayrollRun.id`, `items -> BankDisbursementItem` | Verified |
| `BankDisbursementItem` | `id` (VARCHAR) | Child | `batchId -> BankDisbursementBatch.id`, `employeeId -> Employee.id` | Verified |
| `EpfEcrSubmission` | `id` (VARCHAR) | Yes (`tenantId`) | `payrollRunId -> PayrollRun.id` | Verified |
| `EsicReturnSubmission` | `id` (VARCHAR) | Yes (`tenantId`) | `payrollRunId -> PayrollRun.id` | Verified |

### 3.4 Operational Models (CRM, Projects, Helpdesk, Inventory)
| Model | Primary Key | Tenant Scoped | Foreign Keys / Relations | Status |
|---|---|---|---|---|
| `CrmLead` | `id` (VARCHAR) | Yes (`tenantId`) | `assignedToId -> Employee.id` | Verified |
| `CrmDeal` | `id` (VARCHAR) | Yes (`tenantId`) | `leadId -> CrmLead.id` | Verified |
| `Project` | `id` (VARCHAR) | Yes (`tenantId`) | `tasks -> ProjectTask`, `team -> ProjectMember` | Verified |
| `ProjectTask` | `id` (VARCHAR) | Yes (`tenantId`) | `projectId -> Project.id`, `assigneeId -> Employee.id` | Verified |
| `HelpdeskTicket` | `id` (VARCHAR) | Yes (`tenantId`) | `comments -> HelpdeskComment` | Verified |
| `Product` | `id` (VARCHAR) | Yes (`tenantId`) | `warehouses -> ProductWarehouse` | Verified |
| `PurchaseOrder` | `id` (VARCHAR) | Yes (`tenantId`) | `supplierId -> Supplier.id` | Verified |

---

## 4. Identified Schema Gaps & Required Models

During the audit, three operational productivity modules were discovered operating entirely in browser `localStorage` or component state without Prisma database models:

1. **Workspace Todo (`WorkspaceTodo`)**:
   - Currently in `src/routes/_authenticated/_app/todo.tsx` backed by browser `localStorage` with `INITIAL_TODOS`.
   - **Required Model**:
     ```prisma
     model WorkspaceTodo {
       id          String   @id @default(uuid())
       tenantId    String   @map("tenant_id")
       userId      String   @map("user_id")
       title       String   @db.VarChar(255)
       description String?  @db.Text
       completed   Boolean  @default(false)
       priority    String   @default("medium") @db.VarChar(50)
       tag         String?  @db.VarChar(50)
       dueDate     DateTime? @map("due_date")
       createdAt   DateTime @default(now()) @map("created_at")
       updatedAt   DateTime @updatedAt @map("updated_at")

       tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
       user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

       @@index([tenantId])
       @@index([userId])
       @@map("workspace_todos")
     }
     ```

2. **Workspace Notes (`WorkspaceNote`)**:
   - Currently in `src/routes/_authenticated/_app/notes.tsx` backed by browser `localStorage` with `INITIAL_NOTES`.
   - **Required Model**:
     ```prisma
     model WorkspaceNote {
       id          String   @id @default(uuid())
       tenantId    String   @map("tenant_id")
       userId      String   @map("user_id")
       title       String   @db.VarChar(255)
       content     String   @db.Text
       tag         String   @default("personal") @db.VarChar(50)
       priority    String   @default("medium") @db.VarChar(50)
       isPinned    Boolean  @default(false) @map("is_pinned")
       isStarred   Boolean  @default(false) @map("is_starred")
       isTrash     Boolean  @default(false) @map("is_trash")
       color       String   @default("default") @db.VarChar(50)
       createdAt   DateTime @default(now()) @map("created_at")
       updatedAt   DateTime @updatedAt @map("updated_at")

       tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
       user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

       @@index([tenantId])
       @@index([userId])
       @@map("workspace_notes")
     }
     ```

3. **Calendar Events (`CalendarEvent`)**:
   - Currently in `src/routes/_authenticated/_app/calendar.tsx` backed by browser `localStorage` (`hrms_calendar_events_${tenantId}`).
   - **Required Model**:
     ```prisma
     model CalendarEvent {
       id          String   @id @default(uuid())
       tenantId    String   @map("tenant_id")
       userId      String   @map("user_id")
       title       String   @db.VarChar(255)
       description String?  @db.Text
       startDate   DateTime @map("start_date")
       endDate     DateTime @map("end_date")
       allDay      Boolean  @default(false) @map("all_day")
       category    String   @default("general") @db.VarChar(50)
       location    String?  @db.VarChar(255)
       createdAt   DateTime @default(now()) @map("created_at")
       updatedAt   DateTime @updatedAt @map("updated_at")

       tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
       user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

       @@index([tenantId])
       @@index([userId])
       @@index([startDate, endDate])
       @@map("calendar_events")
     }
     ```

---

## 5. Migration Strategy & Non-Destructive Deployment
- The three new models will be appended to `server/prisma/schema.prisma`.
- Relations will be added to `Tenant` and `User` models.
- The models will be registered in `server/src/config/tenant-models.config.ts` under `DIRECT_TENANT_MODELS`.
- Synchronized using `npx prisma db push` without dropping any tables or altering any existing columns.
