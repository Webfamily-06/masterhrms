# Laravel Permission & RBAC Parity Matrix

**Source Reference:** `hrms-flow/database/seeders/PermissionSeeder.php`, `RoleSeeder.php`, `StaffRoleSeeder.php`  
**Target Reference:** `server/src/middleware/auth.ts`, `server/prisma/schema.prisma` (`UserRole`, `WorkspaceRole`, `UserRoleAssignment`)

---

## 1. Role Hierarchy Architecture

In the Laravel source code:
1. **`superadmin`**: Platform administrator (has `Permission::all()` assigned). Manages all tenants/companies, plans, coupons, system settings, languages, and CMS.
2. **`company`**: Tenant Organization Owner / HR Administrator. Manages organizational structure, employees, attendance, payroll, recruitment, documents, and company settings.
3. **`manager`**: Department/Team lead. Authorized to view team attendance, approve leave requests, review employee performance, and conduct recruitment interviews.
4. **`employee`**: Individual staff member. Granted self-service access to own attendance, leave applications, payslip downloads, assigned assets, and goals.

In the Target React + Node.js architecture:
- Roles are enforced via JWT payload claims and validated against `UserRole` and `UserRoleAssignment` tables with request-scoped `tenant_id` isolation.
- Middleware helpers:
  - `requireSuperAdmin` — Restricted exclusively to Super Admin.
  - `requireRole(...roles)` — Role-level gate (`hr_admin`, `manager`, `employee`, `super_admin`).
  - `requirePermission(code)` — Dynamic granular permission check (`module.resource.action`).

---

## 2. Granular Module Permissions Matrix

| # | Laravel Permission Module | Core Actions Defined | Target Permission Code | Role Access | Target Verification |
|---|---------------------------|----------------------|------------------------|:-----------:|:-------------------:|
| 1 | `dashboard` | `manage-dashboard`, `view-dashboard` | `dashboard.view` | All Roles | ✅ Enforced |
| 2 | `users` | `manage`, `view`, `create`, `edit`, `delete`, `reset-password`, `toggle-status` | `users.*` | `superadmin`, `company` | ✅ Enforced |
| 3 | `roles` | `manage`, `view`, `create`, `edit`, `delete` | `roles.*` | `superadmin`, `company` | ✅ Enforced |
| 4 | `permissions` | `manage`, `view`, `create`, `edit`, `delete` | `permissions.*` | `superadmin` | ✅ Enforced |
| 5 | `companies` | `manage`, `view`, `create`, `edit`, `delete`, `reset-password`, `toggle-status`, `manage-plans` | `companies.*` | `superadmin` | ✅ Enforced |
| 6 | `plans` | `manage`, `view`, `create`, `edit`, `delete`, `request`, `trial`, `subscribe` | `plans.*` | `superadmin` (manage), `company` (subscribe) | ✅ Enforced |
| 7 | `plan_orders` | `manage`, `view`, `create`, `edit`, `delete`, `approve`, `reject` | `plan_orders.*` | `superadmin` | ✅ Enforced |
| 8 | `plan_requests` | `manage`, `view`, `create`, `edit`, `delete`, `approve`, `reject` | `plan_requests.*` | `superadmin` | ✅ Enforced |
| 9 | `coupons` | `manage`, `view`, `create`, `edit`, `delete`, `toggle-status` | `coupons.*` | `superadmin` | ✅ Enforced |
| 10| `currencies` | `manage`, `view`, `create`, `edit`, `delete`, `toggle-status` | `currencies.*` | `superadmin` | ✅ Enforced |
| 11| `email_templates` | `manage`, `view`, `edit`, `toggle-status` | `email_templates.*` | `superadmin` | ✅ Enforced |
| 12| `landing_page` | `manage`, `view`, `edit-settings`, `custom-pages` | `landing_page.*` | `superadmin` | ✅ Enforced |
| 13| `referral` | `manage`, `view`, `payout-requests`, `settings` | `referral.*` | `superadmin` | ✅ Enforced |
| 14| `newsletters` | `manage`, `view`, `delete` | `newsletters.*` | `superadmin` | ✅ Enforced |
| 15| `login_history` | `manage`, `view`, `delete` | `login_history.*` | `superadmin`, `company` | ✅ Enforced |
| 16| `branches` | `manage`, `view`, `create`, `edit`, `delete` | `branches.*` | `company` | ✅ Enforced |
| 17| `departments` | `manage`, `view`, `create`, `edit`, `delete` | `departments.*` | `company` | ✅ Enforced |
| 18| `designations` | `manage`, `view`, `create`, `edit`, `delete` | `designations.*` | `company` | ✅ Enforced |
| 19| `employees` | `manage`, `view`, `create`, `edit`, `delete`, `passport`, `export` | `employees.*` | `company`, `manager` | ✅ Enforced |
| 20| `attendance_records` | `manage`, `view`, `clock-in`, `clock-out`, `monthly-matrix` | `attendance.*` | `company`, `manager`, `employee` | ✅ Enforced |
| 21| `attendance_policies`| `manage`, `view`, `create`, `edit`, `delete` | `attendance_policies.*`| `company` | ✅ Enforced |
| 22| `attendance_regularizations`| `manage`, `view`, `submit`, `approve`, `reject` | `regularizations.*` | `company`, `manager`, `employee` | ✅ Enforced |
| 23| `shifts` | `manage`, `view`, `create`, `edit`, `delete`, `swap-requests` | `shifts.*` | `company`, `manager`, `employee` | ✅ Enforced |
| 24| `time_entries` | `manage`, `view`, `create`, `edit`, `delete` | `timesheets.*` | `company`, `employee` | ✅ Enforced |
| 25| `biometric_attendance`| `manage`, `view`, `sync-hardware`, `logs` | `biometric.*` | `company` | ✅ Enforced |
| 26| `holidays` | `manage`, `view`, `create`, `edit`, `delete` | `holidays.*` | `company` (manage), All (view) | ✅ Enforced |
| 27| `leave_types` | `manage`, `view`, `create`, `edit`, `delete` | `leave_types.*` | `company` | ✅ Enforced |
| 28| `leave_policies` | `manage`, `view`, `create`, `edit`, `delete` | `leave_policies.*` | `company` | ✅ Enforced |
| 29| `leave_applications`| `manage`, `view`, `submit`, `approve`, `reject` | `leave.*` | `company`, `manager`, `employee` | ✅ Enforced |
| 30| `leave_balances` | `manage`, `view`, `adjust`, `sync` | `leave_balances.*` | `company`, `manager`, `employee` | ✅ Enforced |
| 31| `salary_components`| `manage`, `view`, `create`, `edit`, `delete` | `payroll.components.*` | `company` | ✅ Enforced |
| 32| `employee_salaries`| `manage`, `view`, `assign`, `edit` | `payroll.structures.*` | `company` | ✅ Enforced |
| 33| `payroll_runs` | `manage`, `view`, `generate`, `lock`, `export` | `payroll.runs.*` | `company` | ✅ Enforced |
| 34| `payslips` | `manage`, `view`, `download-pdf`, `email` | `payroll.payslips.*` | `company`, `employee` | ✅ Enforced |
| 35| `job_postings` | `manage`, `view`, `create`, `edit`, `delete`, `publish` | `recruitment.postings.*`| `company`, `manager` | ✅ Enforced |
| 36| `candidates` | `manage`, `view`, `create`, `stage-change`, `score` | `recruitment.candidates.*`| `company`, `manager` | ✅ Enforced |
| 37| `custom_questions`| `manage`, `view`, `create`, `edit`, `delete` | `custom_fields.*` | `company` | ✅ Enforced |
| 38| `interviews` | `manage`, `view`, `schedule`, `feedback` | `recruitment.interviews.*`| `company`, `manager` | ✅ Enforced |
| 39| `offers` | `manage`, `view`, `create`, `send`, `accept` | `recruitment.offers.*` | `company` | ✅ Enforced |
| 40| `onboarding_checklists`| `manage`, `view`, `create`, `track-items` | `recruitment.onboarding.*`| `company`, `manager` | ✅ Enforced |
| 41| `performance_indicators`| `manage`, `view`, `create`, `edit`, `delete` | `performance.kpi.*` | `company`, `manager` | ✅ Enforced |
| 42| `employee_goals` | `manage`, `view`, `create`, `edit`, `update-progress`| `okr.goals.*` | `company`, `manager`, `employee` | ✅ Enforced |
| 43| `employee_reviews`| `manage`, `view`, `cycle-setup`, `submit-review` | `performance.reviews.*`| `company`, `manager`, `employee` | ✅ Enforced |
| 44| `training-programs`| `manage`, `view`, `create`, `enroll`, `sessions` | `training.*` | `company`, `manager`, `employee` | ✅ Enforced |
| 45| `promotions` | `manage`, `view`, `create`, `delete` | `promotions.*` | `company` | ✅ Enforced |
| 46| `transfers` | `manage`, `view`, `create`, `delete` | `transfers.*` | `company` | ✅ Enforced |
| 47| `resignations` | `manage`, `view`, `submit`, `clearance` | `resignations.*` | `company`, `manager`, `employee` | ✅ Enforced |
| 48| `terminations` | `manage`, `view`, `record`, `revoke-access` | `terminations.*` | `company` | ✅ Enforced |
| 49| `warnings` | `manage`, `view`, `issue`, `delete` | `warnings.*` | `company`, `manager` | ✅ Enforced |
| 50| `complaints` | `manage`, `view`, `lodge`, `resolve` | `helpdesk.*` | `company`, `employee` | ✅ Enforced |
| 51| `trips` | `manage`, `view`, `apply`, `approve`, `expenses` | `expenses.*` | `company`, `manager`, `employee` | ✅ Enforced |
| 52| `awards` | `manage`, `view`, `create`, `delete` | `awards.*` | `company` (manage), All (view) | ✅ Enforced |
| 53| `employee_contracts`| `manage`, `view`, `create`, `renew`, `templates` | `contracts.*` | `company` | ✅ Enforced |
| 54| `hr_documents` | `manage`, `view`, `upload`, `acknowledge` | `documents.*` | `company`, `employee` | ✅ Enforced |
| 55| `assets` | `manage`, `view`, `assign`, `return`, `disposal` | `assets.*` | `company`, `employee` | ✅ Enforced |
| 56| `announcements` | `manage`, `view`, `publish`, `delete` | `announcements.*` | `company` (publish), All (view)| ✅ Enforced |
| 57| `calendar` | `manage`, `view`, `create-events`, `rsvp` | `calendar.*` | All Roles | ✅ Enforced |
| 58| `meetings` | `manage`, `view`, `rooms`, `minutes`, `actions` | `meetings.*` | `company`, `manager`, `employee` | ✅ Enforced |
| 59| `action_items` | `manage`, `view`, `create`, `update-status` | `task_board.*` | `company`, `manager`, `employee` | ✅ Enforced |
| 60| `media` | `manage`, `view`, `upload`, `delete`, `directories`| `media.*` | `company`, `superadmin` | ✅ Enforced |
| 61| `ip_restriction` | `manage`, `view`, `ban`, `unban`, `firewall` | `banned_ips.*` | `company`, `superadmin` | ✅ Enforced |
| 62| `settings` | `manage`, `view`, `brand`, `email`, `webhooks`, `system` | `settings.*` | `company`, `superadmin` | ✅ Enforced |
| 63| `custom_fields` | `manage`, `view`, `create`, `edit`, `delete`, `values` | `custom_fields.*` | `company` | ✅ Enforced |
| 64| `marketing_campaigns`| `manage`, `view`, `create`, `edit`, `delete`, `export` | `campaigns.*` | `company` | ✅ Enforced |
| 65| `database_backup` | `manage`, `generate`, `download`, `delete` | `backup.*` | `superadmin` | ✅ Enforced |
| 66| `languages` | `manage`, `view`, `create`, `toggle`, `translate` | `languages.*` | `superadmin` | ✅ Enforced |
| 67| `cms_content` | `manage`, `faqs`, `testimonials`, `reorder` | `cms.*` | `superadmin` | ✅ Enforced |

