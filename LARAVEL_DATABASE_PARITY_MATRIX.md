# Laravel to Prisma Database Parity Matrix

**Source Database:** MySQL Migrations (`hrms-flow/database/migrations/` — 123 migrations, 118 Eloquent Models)  
**Target Database:** MySQL with Prisma ORM (`server/prisma/schema.prisma` — 130+ Models)  
**Multi-Tenant Model:** Strict Request-Scoped `tenant_id` Isolation

---

## 1. Relational Table & Model Mapping

| Laravel Table | Laravel Eloquent Model | Target Prisma Model | Multi-Tenant Field | Primary Foreign Keys | Data Integrity & Cascades |
|:---|:---|:---|:---:|:---|:---|
| `users` | `User.php` | `User` | N/A (Global Auth) | `tenantId` (via `Profile` / `UserRole`) | Soft/Hard Delete with tenant cascades |
| `companies` / `users` (type=company) | `User.php` | `Tenant` | `id` (Tenant Root) | `id` | Tenant root container |
| `employees` | `Employee.php` | `Employee` | `tenant_id` | `department_id`, `designation_id`, `user_id` | Cascade on tenant delete |
| `branches` | `Branch.php` | `Branch` | `tenant_id` | `tenant_id` | Cascade on tenant delete |
| `departments` | `Department.php` | `Department` | `tenant_id` | `branch_id`, `parent_id` | Cascade on tenant delete |
| `designations` | `Designation.php` | `Designation` | `tenant_id` | `department_id` | Cascade on tenant delete |
| `attendance_records` | `AttendanceRecord.php` | `Attendance` | `tenant_id` | `employee_id` | Unique compound `[employeeId, date]` |
| `shifts` | `Shift.php` | `ShiftDefinition` | `tenant_id` | `tenant_id` | Referenced by rosters |
| `attendance_policies` | `AttendancePolicy.php` | `AttendancePolicy` | `tenant_id` | `tenant_id` | Referenced by employees |
| `attendance_regularizations` | `AttendanceRegularization.php` | `AttendanceRegularization` | `tenant_id` | `employee_id` | Audited approval states |
| `time_entries` | `TimeEntry.php` | `TimeEntry` | `tenant_id` | `employee_id`, `project_id` | Decimal hours precision |
| `leave_types` | `LeaveType.php` | `LeaveType` | `tenant_id` | `tenant_id` | Unique `[tenant_id, name]` |
| `leave_policies` | `LeavePolicy.php` | `LeavePolicy` | `tenant_id` | `leave_type_id` | Encodes allocation rules |
| `leave_applications` | `LeaveApplication.php` | `LeaveRequest` | `tenant_id` | `employee_id`, `leave_type_id` | Days balance checking constraint |
| `leave_balances` | `LeaveBalance.php` | `EmployeeLeaveBalance` | `tenant_id` | `employee_id`, `leave_type_id` | Unique `[employee_id, leave_type_id, year]` |
| `salary_components` | `SalaryComponent.php` | `SalaryComponent` | `tenant_id` | `tenant_id` | Earning vs Deduction type enum |
| `employee_salaries` | `EmployeeSalary.php` | `EmployeeSalaryAssignment` | `tenant_id` | `employee_id` | Historical pay versioning |
| `payroll_runs` | `PayrollRun.php` | `PayrollRun` | `tenant_id` | `tenant_id` | Lockable batch state machine |
| `payroll_entries` / `payslips` | `PayrollEntry.php`, `Payslip.php` | `Payslip`, `PayrollSnapshot` | `tenant_id` | `payroll_run_id`, `employee_id` | Immutable JSON salary breakdown snapshot |
| `awards` | `Award.php` | `EmployeeAward` | `tenant_id` | `employee_id`, `award_type_id` | Monetary award tracking |
| `promotions` | `Promotion.php` | `EmployeePromotion` | `tenant_id` | `employee_id`, `designation_id` | Historical audit record |
| `employee_transfers` | `EmployeeTransfer.php` | `EmployeeTransfer` | `tenant_id` | `employee_id`, `department_id`, `branch_id`| Multi-entity transfer state |
| `resignations` | `Resignation.php` | `EmployeeResignation` | `tenant_id` | `employee_id` | Notice period dates |
| `terminations` | `Termination.php` | `EmployeeTermination` | `tenant_id` | `employee_id` | Termination reason category |
| `warnings` | `Warning.php` | `EmployeeDisciplinaryWarning`| `tenant_id` | `employee_id` | Disciplinary record tracking |
| `complaints` | `Complaint.php` | `EmployeeComplaint` | `tenant_id` | `employee_id`, `assigned_to` | Confidential grievance logging |
| `trips` | `Trip.php` | `BusinessTrip` | `tenant_id` | `employee_id` | Budget allocation & expense logging |
| `holidays` | `Holiday.php` | `CompanyHoliday` | `tenant_id` | `tenant_id` | Non-working calendar dates |
| `announcements` | `Announcement.php` | `Announcement` | `tenant_id` | `tenant_id` | Target audience scoping |
| `asset_types` | `AssetType.php` | `AssetCategory` | `tenant_id` | `tenant_id` | Asset classification |
| `assets` | `Asset.php` | `Asset` | `tenant_id` | `asset_category_id` | Asset serial number & warranty |
| `training_types` | `TrainingType.php` | `TrainingType` | `tenant_id` | `tenant_id` | Training classification |
| `training_programs` | `TrainingProgram.php` | `TrainingProgram` | `tenant_id` | `training_type_id` | Curriculum definition |
| `training_sessions` | `TrainingSession.php` | `TrainingSession` | `tenant_id` | `training_program_id` | Scheduling & venue dates |
| `employee_trainings` | `EmployeeTraining.php` | `EmployeeTraining` | `tenant_id` | `training_session_id`, `employee_id` | Attendance & score verification |
| `job_postings` | `JobPosting.php` | `JobPosting` | `tenant_id` | `department_id` | Active public opening status |
| `candidates` | `Candidate.php` | `JobCandidate` | `tenant_id` | `job_posting_id` | ATS pipeline stage enum |
| `interviews` | `Interview.php` | `JobCandidateInterview` | `tenant_id` | `candidate_id` | Calendar round scheduling |
| `offers` | `Offer.php` | `CandidateOffer` | `tenant_id` | `candidate_id` | Salary offer & joining date |
| `candidate_onboarding` | `CandidateOnboarding.php` | `CandidateOnboardingRecord` | `tenant_id` | `candidate_id` | Checklists & welcome kit tracker |
| `meetings` | `Meeting.php` | `Meeting` | `tenant_id` | `room_id` | Calendar sync & RSVP records |
| `action_items` | `ActionItem.php` | `ProjectTask` / `ActionItem` | `tenant_id` | `meeting_id`, `assignee_id` | Status, due date, progress % |
| `plans` | `Plan.php` | `SubscriptionPlan` | N/A (Platform Root) | `id` | Global SaaS subscription tiers |
| `plan_orders` | `PlanOrder.php` | `TenantSubscription`, `PaymentRecord` | `tenant_id` | `tenant_id`, `plan_id` | Multi-currency invoice payment log |
| `coupons` | `Coupon.php` | `Coupon` | N/A (Platform Root) | `id` | Global discount codes |
| `currencies` | `Currency.php` | `SystemCurrency` | N/A (Platform Root) | `id` | ISO-4217 standard symbols |
| `settings` | `Setting.php` | `TenantSetting` | `tenant_id` | `tenant_id` | Key-value tenant config registry |
| `webhooks` | `Webhook.php` | `WebhookConfig` | `tenant_id` | `tenant_id` | Outbound event trigger webhooks |
| `ip_restrictions` | `IpRestriction.php` | `BannedIpAddress` | `tenant_id` | `tenant_id` | CIDR / IP security allow & ban list |
| `custom_fields` | `CustomField.php` | `CustomField` | `tenant_id` | `tenant_id` | Dynamic custom field schemas & data types |
| `custom_field_values` | `CustomFieldValue.php` | `CustomFieldValue` | `tenant_id` | `custom_field_id`, `entity_id` | Polymorphic dynamic field values |
| `marketing_campaigns` | `Campaign.php` | `MarketingCampaign` | `tenant_id` | `tenant_id` | Lifecycle status, budget, spent, targeting |
| `login_histories` | `LoginHistory.php` | `LoginHistory` | N/A (User relation) | `user_id`, `created_by` | Tracks IP, user agent, browser/device breakdown |
| `database_backups` | `BackupController.php` | File Storage (`server/backups/`) | N/A (Platform Root) | N/A | Gzipped SQL dumps with validated metadata |
| `languages` & phrases | `LanguageController.php`| `CmsPage` (JSON registry/dicts) | N/A (Platform Root) | `slug` | System-wide multilingual translation dictionaries |
| `faqs` | `FaqController.php` | `CmsPage` (`system-cms-faqs`) | N/A (Platform Root) | `slug` | Landing FAQ items, categories, and order sequences |
| `testimonials` | `Testimonial.php` | `CmsPage` (`system-cms-testimonials`)| N/A (Platform Root) | `slug` | Verified reviews, ratings, and customer profiles |

---

## 2. Multi-Tenant Scoping & Transaction Isolation
- **Prisma Extension Interceptor:** Every tenant-scoped query automatically attaches `where: { tenantId }`.
- **Database Engine:** MySQL 8.0 with InnoDB engine enforcing foreign key relational integrity and index acceleration.
- **Precision Types:** Currency values stored as `Decimal(12, 2)` or `Decimal(14, 4)` avoiding IEEE-754 floating point rounding errors.
