# MASTERHRMS — SETTINGS TO BUSINESS MODULE DEPENDENCY MATRIX
**Comprehensive Configuration Tracing Across All 20 Business Modules**  
**Repository:** `Webfamily-06/masterhrms`  
**Primary Branch:** `main`  
**Auditor Mode:** Read-Only Source-Verified Analysis  

---

## 1. Architectural Distinction: Settings vs Relational Policies

In MASTERHRMS, application behavior is governed by two complementary configuration stores:
1. **Dynamic Key-Value Settings (`Setting` & `SettingSecret` via `SettingsService`)**: Used for infrastructural, integration, security, and white-label branding parameters. Supports 3-tier fallback: `TENANT` -> `PLATFORM` -> Registry default.
2. **Relational Domain Policies (Dedicated Tables via Prisma)**: Used for high-volume, multi-condition enterprise business rules (e.g. Leave Accrual Policies, Salary Structures, Shifts, Tax Slabs, Chart of Accounts).

---

## 2. Business Module Dependency Matrix

| # | Business Module | Settings / Policies Consumed | Configuration Source | Platform Default? | Tenant Override? | Employee Pref? | Effect Timeline | Implementation Status |
| :-: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **1** | **Employee Management** | `branding.app_name`, Employee ID prefix format, default probationary period | `SettingsService` & `Tenant` model | Yes | Yes | No | Immediate on new employee creation | Verified implementation |
| **2** | **Organization Structure** | Department trees, branch codes, hierarchy connectors | Database tables (`Department`, `Branch`) | No | Yes (Tenant tables) | No | Immediate on tree render | Verified implementation |
| **3** | **Attendance Tracking** | `hr.work_week_start`, `hr.daily_work_hours`, grace time, biometric sync | `hr.*` settings & `ShiftDefinition` | Yes | Yes | No | Evaluated per daily punch log | Verified implementation |
| **4** | **Leave Management** | `hr.sandwich_leave_enabled`, leave quota, encashment limits | Relational `LeaveType`, `LeavePolicy` tables | No | Yes (Tenant tables) | No | Evaluated upon leave application | Verified implementation |
| **5** | **Leave Encashment** | Encashable min/max days, salary component basis (Basic vs Gross) | Relational `LeavePolicy` & `SalaryComponent` | No | Yes (Tenant tables) | No | Evaluated upon HR approval | Verified implementation |
| **6** | **Comp-Off Management** | `hr.comp_off_expiry_days` (default 60 days), holiday overtime multipliers | `SETTINGS_REGISTRY` & `LeavePolicy` | Yes | Yes | No | Ledger entry auto-expires after N days | Verified implementation |
| **7** | **Payroll Processing** | Statutory slabs, PF/ESI/TDS rules, overtime formula, `locale.currency` | `StatutoryRule`, `SalaryStructure`, `locale.*` | Yes | Yes | No | Computed during monthly payroll run | Verified implementation |
| **8** | **Finance & Accounting** | `ChartOfAccount`, `FiscalYear`, `AccountingPeriod`, journal auto-post | Relational Accounting tables | No | Yes (Tenant tables) | No | Applied on journal entry posting | Verified implementation |
| **9** | **Sales & Invoicing** | `payments.razorpay_*`, `payments.bank_account_details`, invoice number prefix | `payments.*` settings & `Invoice` tables | Yes | Yes | No | Attached to newly rendered invoices | Verified implementation |
| **10**| **Purchase & Stock** | Reorder thresholds, warehouse stock locations, tax rates | Relational POS / Inventory tables | No | Yes (Tenant tables) | No | Evaluated on purchase order generation | Verified implementation |
| **11**| **Documents & Storage** | `storage.provider`, `storage.s3_*`, `storage.max_upload_size_mb` | `SettingsService` -> `StorageFactory` | Yes | Yes | No | Hot-reloaded on file upload dispatch | Verified implementation |
| **12**| **Notifications & Email** | `email.smtp_*`, `email.from_*`, `email.queue_enabled` | `SettingsService` -> `MailerFactory` | Yes | Yes | No | Hot-reloaded on email transmission | Verified implementation |
| **13**| **Chat & LiveKit SFU** | `integration.pusher_*`, LiveKit SFU API secrets | `SettingsService`, `pusher.service.ts` | Yes | Yes | No | Instant on socket connection | Verified implementation |
| **14**| **Calendar & Meetings** | `locale.timezone`, working days, holiday master | `CalendarEvent`, `Holiday` tables | No | Yes (Tenant tables) | Yes (`timezone`) | Immediate on calendar view render | Verified implementation |
| **15**| **Recruitment** | Offer letter templates, interview stages, job categories | `OfferTemplate`, `JobPosting` tables | No | Yes (Tenant tables) | No | Immediate on vacancy creation | Verified implementation |
| **16**| **Performance & OKRs** | OKR review cycles, appraisal rating scales, key result weights | `OkrCycle`, `OkrObjective` tables | No | Yes (Tenant tables) | No | Applied across review cycle duration | Verified implementation |
| **17**| **Training & LMS** | Course modules, enrollment deadlines, pass marks | `TrainingCourse`, `CourseModule` tables | No | Yes (Tenant tables) | No | Immediate on course publication | Verified implementation |
| **18**| **Integrations & Webhooks**| Webhook endpoints, HMAC secret, biometric device IP | `TenantWebhook`, `BiometricDevice` tables | No | Yes (Tenant tables) | No | Dispatched on entity lifecycle events | Verified implementation |
| **19**| **Billing & Subscriptions**| `TenantSubscription`, plan limits (max employees, storage GB) | `TenantSubscription`, `SubscriptionPlan` | Yes | Yes | No | Enforced on employee invite / upload | Verified implementation |
| **20**| **Tenant Onboarding** | Workspace slug, company name, default admin account | `Tenant`, `User`, `Profile` tables | No | Yes | No | Sets initial workspace state | Verified implementation |

---

## 3. Configuration Hot-Reloading vs Persistence Latency

1. **Immediate In-Memory Hot-Reload**:
   - `branding.*` updates reflect immediately upon query invalidation.
   - `email.*` SMTP transporter pools are flushed and reconstructed on the fly by `MailerFactory.invalidate()`.
   - `storage.*` S3 clients are reconstructed on the fly by `StorageFactory.invalidate()`.
   - `system.maintenance_mode` flips instantly in memory via `invalidateMaintenanceCache()`.
2. **Snapshot-Based Persistence**:
   - Payroll runs freeze salary components at run time (`PayrollSnapshot`), ensuring historical payslips never change if salary structures are edited later.
   - Leave applications lock the policy in effect on the date of request.
