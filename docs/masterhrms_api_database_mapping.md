# MasterHRMS — API & Database Architecture Mapping

**Document:** `docs/masterhrms_api_database_mapping.md`  
**Date:** October 15, 2026  
**Status:** **AUTHORITATIVE RECONCILED SPECIFICATION**

This document establishes the verified mappings connecting Frontend Routes, REST API Endpoints, Backend Controllers/Services, and Prisma Database Models.

---

## 1. Authentication & System Control Plane

| Frontend Route | REST API Endpoint | Controller / Service | Primary Prisma Models |
|---|---|---|---|
| `/auth` | `POST /api/auth/login`<br>`POST /api/auth/unlock` | `auth.routes.ts`<br>`loginHandler` | `User`, `Profile`, `TwoFactorOtp`, `LoginHistory` |
| `/auth/register` | `POST /api/auth/register` | `tenant-provisioning.ts`<br>`provisionTenantWithTrial` | `Tenant`, `User`, `Profile`, `TenantSubscription` |
| `/auth/forgot-password` | `POST /api/auth/forgot-password` | `auth.routes.ts`<br>`sendPasswordResetEmail` | `User`, `TwoFactorOtp` |
| `/super/dashboard` | `GET /api/super/dashboard` | `super.routes.ts`<br>`superRouter` | `Tenant`, `SubscriptionPlan`, `CommerceOrder` |
| `/super/tenants` | `GET/POST /api/super/tenants`<br>`PUT /api/super/tenants/:id` | `super.routes.ts` | `Tenant`, `TenantSubscription`, `TenantDomain` |
| `/super/plans` | `GET/POST/PUT /api/super/plans` | `super.routes.ts` | `SubscriptionPlan`, `PlanPolicy` |
| `/super/coupons` | `GET/POST/PUT /api/super/coupons` | `super.routes.ts` | `Coupon`, `CouponRedemption` |

---

## 2. Workforce & Organization Management

| Frontend Route | REST API Endpoint | Controller / Service | Primary Prisma Models |
|---|---|---|---|
| `/hr/employees` | `GET /api/employees`<br>`GET /api/v1/hr/employees` | `hr-employees.routes.ts`<br>`employees.routes.ts` | `Employee`, `Profile`, `Department`, `Designation` |
| `/hr/employees/new` | `POST /api/employees` | `hr-employees.routes.ts` | `Employee`, `User`, `Profile`, `UserRoleAssignment` |
| `/hr/employees/:id` | `GET/PUT /api/employees/:id` | `hr-employees.routes.ts` | `Employee`, `Attendance`, `Payslip`, `LeaveRequest` |
| `/hr/organization/structure` | `GET /api/v1/hr/organization/structure` | `organization.routes.ts` | `Employee`, `Department`, `Designation` |
| `/hr/organization/branches` | `GET/POST/PUT /api/v1/hr/organization/branches` | `organization.routes.ts` | `Branch` |
| `/hr/organization/departments` | `GET/POST/PUT /api/v1/hr/organization/departments` | `organization.routes.ts` | `Department` |
| `/hr/organization/designations` | `GET/POST/PUT /api/v1/hr/organization/designations` | `organization.routes.ts` | `Designation` |
| `/hr/organization/holidays` | `GET/POST/PUT /api/v1/hr/organization/holidays` | `organization.routes.ts` | `Holiday` |
| `/hr/organization/announcements` | `GET/POST/PUT /api/v1/hr/organization/announcements` | `organization.routes.ts` | `Announcement`, `AnnouncementAcknowledgement` |

---

## 3. Attendance & Time Management

| Frontend Route | REST API Endpoint | Controller / Service | Primary Prisma Models |
|---|---|---|---|
| `/hr/attendance/records`<br>`/me/attendance/records` | `GET /api/attendance`<br>`GET /api/v1/me/attendance/records` | `hr-attendance.routes.ts`<br>`employee-self-service.routes.ts` | `Attendance`, `ShiftDefinition` |
| Dashboard Widget | `POST /api/v1/me/attendance/check-in`<br>`POST /api/v1/me/attendance/check-out` | `employee-self-service.routes.ts` | `Attendance` |
| `/hr/attendance/regularizations`<br>`/me/attendance/regularizations` | `GET/POST /api/v1/me/regularizations`<br>`POST /api/attendance/regularize/:id/approve` | `employee-self-service.routes.ts`<br>`hr-attendance.routes.ts` | `AttendanceRegularization`, `Attendance` |
| `/hr/attendance/shifts`<br>`/me/attendance/shifts` | `GET/POST /api/shifts`<br>`GET/POST /api/v1/me/shifts` | `shifts.routes.ts` | `ShiftDefinition`, `ShiftRoster`, `ShiftSwapRequest` |
| `/hr/attendance/policies` | `GET/POST /api/attendance/policies` | `hr-attendance.routes.ts` | `AttendancePolicy` |
| `/hr/attendance/devices` | `GET/POST /api/biometric/devices`<br>`POST /iclock/*` | `biometric.routes.ts` | `BiometricDevice`, `BiometricPunchLog` |

---

## 4. Leave Management

| Frontend Route | REST API Endpoint | Controller / Service | Primary Prisma Models |
|---|---|---|---|
| `/hr/leave/applications`<br>`/me/leave/applications` | `GET/POST /api/v1/me/leaves`<br>`POST /api/v1/me/team-leaves/:id/approve` | `employee-self-service.routes.ts`<br>`hr-leave.routes.ts` | `LeaveRequest`, `LeaveType`, `LeaveLedgerEntry` |
| `/hr/leave/balances`<br>`/me/leave/balance` | `GET /api/leave/balances`<br>`GET /api/v1/me/leave/balance` | `hr-leave.routes.ts`<br>`employee-self-service.routes.ts` | `LeaveLedgerEntry`, `LeaveType` |
| `/hr/leave/types` | `GET/POST/PUT /api/leave/types` | `hr-leave.routes.ts` | `LeaveType` |
| `/hr/leave/policies` | `GET/POST/PUT /api/leave/policies` | `hr-leave.routes.ts` | `LeavePolicy` |
| `/hr/leave/calendar`<br>`/me/leave/team-calendar` | `GET /api/leave/calendar` | `hr-leave.routes.ts` | `LeaveRequest`, `Holiday` |

---

## 5. Recruitment & Hiring

| Frontend Route | REST API Endpoint | Controller / Service | Primary Prisma Models |
|---|---|---|---|
| `/hr/recruitment/job-postings` | `GET/POST/PUT /api/recruitment/jobs` | `recruitment.routes.ts` | `JobPosting`, `JobCategory`, `JobType`, `JobLocation` |
| `/hr/recruitment/candidates` | `GET/POST /api/recruitment/candidates` | `recruitment.routes.ts` | `JobCandidate` |
| `/hr/recruitment/interviews` | `GET/POST /api/recruitment/interviews` | `recruitment.routes.ts` | `JobCandidateInterview`, `InterviewTypeMaster` |
| `/hr/recruitment/offers` | `GET/POST /api/recruitment/offers` | `recruitment.routes.ts` | `CandidateOffer`, `OfferTemplate` |
| `/hr/recruitment/onboarding` | `GET/POST /api/recruitment/onboarding` | `recruitment.routes.ts` | `CandidateOnboarding`, `OnboardingCheckItem` |
| `/me/recruitment/career` | `GET/POST /api/v1/me/referrals` | `employee-self-service.routes.ts` | `EmployeeReferral`, `JobPosting` |

---

## 6. Employee Lifecycle, Performance & Training

| Frontend Route | REST API Endpoint | Controller / Service | Primary Prisma Models |
|---|---|---|---|
| `/hr/lifecycle/awards` | `GET/POST /api/awards` | `awards.routes.ts` | `Award`, `AwardType` |
| `/hr/lifecycle/promotions` | `GET/POST /api/promotions` | `hrm-extensions.routes.ts` | `PromotionRecord` |
| `/hr/lifecycle/transfers` | `GET/POST /api/transfers` | `transfers.routes.ts` | `EmployeeTransfer` |
| `/hr/lifecycle/warnings` | `GET/POST /api/warnings` | `warnings.routes.ts` | `DisciplinaryWarning`, `WarningType` |
| `/hr/lifecycle/resignation` | `GET/POST /api/offboarding/resignations` | `offboarding.routes.ts` | `EmployeeExit`, `ExitChecklistItem` |
| `/hr/lifecycle/trips` | `GET/POST /api/v1/hr/lifecycle/trips` | `hr-lifecycle.routes.ts` | `EmployeeTrip`, `TripExpenseItem` |
| `/hr/lifecycle/complaints` | `GET/POST /api/v1/hr/lifecycle/complaints` | `hr-lifecycle.routes.ts` | `EmployeeComplaint`, `ComplaintCaseNote` |
| `/hr/performance/reviews` | `GET/POST /api/v1/hr/performance/reviews` | `hr-performance.routes.ts` | `ReviewIndicatorRating` |
| `/hr/performance/goals` | `GET/POST /api/addons/okr` | `okr.routes.ts` | `OkrObjective`, `OkrKeyResult` |
| `/hr/training/programs` | `GET/POST /api/training/courses` | `training.routes.ts` | `TrainingCourse`, `CourseModule` |
| `/hr/training/sessions` | `GET/POST /api/training/sessions` | `training.routes.ts` | `TrainingSession`, `SessionAttendance` |

---

## 7. Payroll, Assets & Documents

| Frontend Route | REST API Endpoint | Controller / Service | Primary Prisma Models |
|---|---|---|---|
| `/hr/payroll/salary-components` | `GET/POST /api/payroll/components` | `payroll.routes.ts` | `SalaryComponent`, `SalaryStructure` |
| `/hr/payroll/employee-salary` | `GET/POST /api/payroll/assignments` | `payroll.routes.ts` | `EmployeeSalaryAssignment`, `EmployeeSalaryItem` |
| `/hr/payroll/runs` | `GET/POST /api/payroll/runs` | `payroll.routes.ts` | `PayrollRun`, `PayrollSnapshot` |
| `/hr/payroll/payslips`<br>`/me/payroll/payslips` | `GET /api/payroll/payslips`<br>`GET /api/v1/me/payslips` | `payroll.routes.ts`<br>`employee-self-service.routes.ts` | `Payslip` |
| `/hr/assets` | `GET/POST /api/addons/assets` | `assets.routes.ts` | `Asset`, `AssetCategory`, `AssetAssignment` |
| `/hr/meetings` | `GET/POST /api/v1/hr/meetings` | `hr-meetings.routes.ts` | `Meeting`, `MeetingAttendee`, `MeetingRoom` |
| `/hr/documents` | `GET/POST /api/documents` | `documents.routes.ts` | `CompanyDocument`, `StoredDocument` |
| `/hr/documents/contracts` | `GET/POST /api/v1/hr/documents/contracts` | `hr-documents.routes.ts` | `EmployeeContract`, `ContractType` |
| `/hr/documents/templates` | `GET/POST /api/v1/hr/documents/templates` | `hr-documents.routes.ts` | `DocumentTemplate`, `GeneratedLetter` |
| `/tenant/settings` | `GET/PUT /api/v1/settings` | `settings.routes.ts`<br>`SettingsService` | `Setting`, `SettingSecret` |

---

## 8. Platform Maintenance & Payment Webhooks

| Frontend Route / Inbound Path | REST API Endpoint | Controller / Service | Primary Prisma Models | RBAC / Permission Scope |
|---|---|---|---|---|
| `/maintenance` | `GET /api/system/maintenance-status` | `hrm-extensions.routes.ts`<br>`systemMaintenanceRouter` | `CmsPage`, `Setting` | Public Unauthenticated Probe |
| `/super/settings` | `PUT /api/cms/pages/system-platform-settings` | `cms.routes.ts`<br>`cmsRouter` | `CmsPage` | `super_admin` Only |
| `/api/health` | `GET /api/health/live`, `GET /api/health/ready` | `server/src/index.ts` | Process & Database Ping | Public Monitoring / Load Balancer |
| `/api/payments/razorpay/webhook` | `POST /api/payments/razorpay/webhook` | `index.ts` / `razorpayWebhookHandler` | `TenantSubscription`, `Transaction` | Cryptographic HMAC SHA256 Signature Header |
| `/api/billing/webhook` | `POST /api/billing/webhook` | `billing.routes.ts`<br>`handleRazorpayWebhook` | `TenantSubscription`, `WebhookEvent` | HMAC SHA256 (`x-razorpay-signature`) |
| `/api/commerce/webhook` | `POST /api/commerce/webhook` | `commerce.routes.ts` | `CommerceOrder`, `OrderEvent` | HMAC SHA256 Signature + Idempotency Replay Guard |
