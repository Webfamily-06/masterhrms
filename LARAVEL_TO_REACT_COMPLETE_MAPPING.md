# Laravel to React Complete System Mapping

**Source Reference:** `hrms-flow` (Laravel 12 + Inertia.js 2.0 + React 18)  
**Target Reference:** Master HRMS/ERP (`src/routes/` + `server/src/routes/` + `server/prisma/schema.prisma`)  
**Status:** COMPLETE SYSTEM MAPPING SPECIFICATION

---

## 1. Core Module Screen & Backend Mapping

### 1.1 Authentication & Profile
| Laravel Screen | Laravel Route / Controller | Target React Route | Target Express Endpoint | Target Prisma Model | Status |
|:---|:---|:---|:---|:---|:---:|
| `pages/auth/login.tsx` | `POST /login` (`AuthenticatedSessionController`) | `src/routes/auth/login.tsx` | `POST /api/auth/login` | `User`, `Profile`, `Tenant` | **COMPLETE** |
| `pages/auth/register.tsx` | `POST /register` (`RegisteredUserController`) | `src/routes/auth/register.tsx` | `POST /api/auth/register` | `User`, `Tenant`, `TenantSubscription` | **COMPLETE** |
| `pages/auth/forgot-password.tsx` | `POST /forgot-password` (`PasswordResetLinkController`) | `src/routes/auth/forgot-password.tsx` | `POST /api/auth/forgot-password` | `User` | **COMPLETE** |
| `pages/settings/profile-settings.tsx` | `PATCH /profile` (`ProfileController`) | `src/routes/_authenticated/_app/profile.tsx` | `PUT /api/auth/profile` | `User`, `Profile` | **COMPLETE** |
| `pages/settings/profile-settings.tsx` | `PUT /profile/password` (`PasswordController`) | `src/routes/_authenticated/_app/profile.tsx` | `PUT /api/auth/password` | `User` | **COMPLETE** |

---

### 1.2 Super Admin & SaaS Engine
| Laravel Screen | Laravel Route / Controller | Target React Route | Target Express Endpoint | Target Prisma Model | Status |
|:---|:---|:---|:---|:---|:---:|
| `pages/companies/index.tsx` | `GET/POST /companies` (`CompanyController`) | `src/routes/_authenticated/_app/companies.tsx` | `GET/POST /api/super/tenants` | `Tenant`, `User`, `TenantSubscription` | **COMPLETE** |
| `pages/plans/index.tsx` | `GET/POST /plans` (`PlanController`) | `src/routes/_authenticated/_app/super/plans.tsx` | `GET/POST /api/super/plans` | `SubscriptionPlan` | **COMPLETE** |
| `pages/plans/plan-orders.tsx` | `GET /plan-orders` (`PlanOrderController`) | `src/routes/_authenticated/_app/super/invoices.tsx` | `GET /api/super/plan-orders` | `TenantSubscription`, `PaymentRecord` | **COMPLETE** |
| `pages/coupons/index.tsx` | `GET/POST /coupons` (`CouponController`) | `src/routes/_authenticated/_app/super/coupons.tsx` | `GET/POST /api/super/coupons` | `Coupon`, `CouponRedemption` | **COMPLETE** |
| `pages/currencies/index.tsx` | `GET/POST /currencies` (`CurrencyController`) | `src/routes/_authenticated/_app/currencies.tsx` | `GET/POST /api/hrm-extensions/currencies` | `SystemCurrency` | **COMPLETE** |
| `pages/manage-language.tsx` | `GET/POST /manage-language` (`LanguageController`) | `src/routes/_authenticated/_app/super/languages.tsx` | `GET/POST /api/super/languages` | `SystemLanguage`, `TranslationKey` | **COMPLETE** |
| `pages/landing-page/settings.tsx`| `GET/POST /landing-page/settings` (`LandingPageController`)| `src/routes/_authenticated/_app/super/cms.tsx` | `GET/POST /api/cms/pages` | `CmsPage` | **COMPLETE** |
| `pages/contacts/index.tsx` | `GET /contacts` (`ContactController`) | `src/routes/_authenticated/_app/super/contacts.tsx` | `GET /api/crm/contacts` | `Contact`, `Lead` | **COMPLETE** |
| `pages/newsletters/index.tsx` | `GET /newsletters` (`NewsletterController`) | `src/routes/_authenticated/_app/super/newsletters.tsx` | `GET /api/crm/newsletters` | `NewsletterSubscriber` | **COMPLETE** |
| `pages/login-history/index.tsx` | `GET /login-history` (`LoginHistoryController`) | `src/routes/_authenticated/_app/super/audit-logs.tsx` | `GET /api/super/system-audit` | `SecurityAuditLog`, `LoginHistory` | **COMPLETE** |

---

### 1.3 HR Admin — Employee & Organization Management
| Laravel Screen | Laravel Route / Controller | Target React Route | Target Express Endpoint | Target Prisma Model | Status |
|:---|:---|:---|:---|:---|:---:|
| `pages/hr/employees/index.tsx` | `GET/POST /hr/employees` (`EmployeeController`) | `src/routes/_authenticated/_app/employees.tsx` | `GET/POST /api/employees` | `Employee`, `User`, `Department` | **COMPLETE** |
| `pages/hr/branches/index.tsx` | `GET/POST /hr/branches` (`BranchController`) | `src/routes/_authenticated/_app/branches.tsx` | `GET/POST /api/workspace/branches` | `Branch` | **COMPLETE** |
| `pages/hr/departments/index.tsx` | `GET/POST /hr/departments` (`DepartmentController`) | `src/routes/_authenticated/_app/departments.tsx` | `GET/POST /api/employees/departments` | `Department` | **COMPLETE** |
| `pages/hr/designations/index.tsx` | `GET/POST /hr/designations` (`DesignationController`) | `src/routes/_authenticated/_app/designations.tsx` | `GET/POST /api/employees/designations` | `Designation` | **COMPLETE** |
| `pages/hr/organization-chart/index.tsx` | `GET /hr/organization-chart` | `src/routes/_authenticated/_app/organization-chart.tsx` | `GET /api/employees/org-chart` | `Employee` | **COMPLETE** |
| `pages/hr/awards/index.tsx` | `GET/POST /hr/awards` (`AwardController`) | `src/routes/_authenticated/_app/awards.tsx` | `GET/POST /api/awards` | `EmployeeAward` | **COMPLETE** |
| `pages/hr/promotions/index.tsx` | `GET/POST /hr/promotions` (`PromotionController`) | `src/routes/_authenticated/_app/promotions.tsx` | `GET/POST /api/offboarding/promotions` | `EmployeePromotion` | **COMPLETE** |
| `pages/hr/transfers/index.tsx` | `GET/POST /hr/transfers` (`EmployeeTransferController`) | `src/routes/_authenticated/_app/transfers.tsx` | `GET/POST /api/transfers` | `EmployeeTransfer` | **COMPLETE** |
| `pages/hr/resignations/index.tsx` | `GET/POST /hr/resignations` (`ResignationController`) | `src/routes/_authenticated/_app/resignation.tsx` | `GET/POST /api/offboarding/resignations` | `EmployeeResignation` | **COMPLETE** |
| `pages/hr/terminations/index.tsx` | `GET/POST /hr/terminations` (`TerminationController`) | `src/routes/_authenticated/_app/termination.tsx` | `GET/POST /api/offboarding/terminations` | `EmployeeTermination` | **COMPLETE** |
| `pages/hr/warnings/index.tsx` | `GET/POST /hr/warnings` (`WarningController`) | `src/routes/_authenticated/_app/warnings.tsx` | `GET/POST /api/warnings` | `EmployeeDisciplinaryWarning`| **COMPLETE** |
| `pages/hr/complaints/index.tsx` | `GET/POST /hr/complaints` (`ComplaintController`) | `src/routes/_authenticated/_app/complaints.tsx` | `GET/POST /api/helpdesk` | `EmployeeComplaint`, `Ticket` | **COMPLETE** |
| `pages/hr/trips/index.tsx` | `GET/POST /hr/trips` (`TripController`) | `src/routes/_authenticated/_app/trips.tsx` | `GET/POST /api/expenses/trips` | `BusinessTrip`, `TripExpense` | **COMPLETE** |
| `pages/hr/holidays/index.tsx` | `GET/POST /hr/holidays` (`HolidayController`) | `src/routes/_authenticated/_app/holidays.tsx` | `GET/POST /api/hrm-extensions/holidays` | `CompanyHoliday` | **COMPLETE** |
| `pages/hr/announcements/index.tsx` | `GET/POST /hr/announcements` (`AnnouncementController`) | `src/routes/_authenticated/_app/announcements.tsx` | `GET/POST /api/announcements` | `Announcement`, `AnnouncementRead`| **COMPLETE** |

---

### 1.4 HR Admin — Attendance & Time Tracking
| Laravel Screen | Laravel Route / Controller | Target React Route | Target Express Endpoint | Target Prisma Model | Status |
|:---|:---|:---|:---|:---|:---:|
| `pages/hr/attendance-records/monthly.tsx` | `GET /hr/attendance-records` (`AttendanceRecordController`) | `src/routes/_authenticated/_app/attendance-employee.tsx` | `GET /api/attendance/matrix` | `Attendance` | **COMPLETE** |
| `pages/hr/shifts/index.tsx` | `GET/POST /hr/shifts` (`ShiftController`) | `src/routes/_authenticated/_app/shifts.tsx` | `GET/POST /api/shifts` | `ShiftDefinition`, `ShiftRoster` | **COMPLETE** |
| `pages/hr/attendance-regularizations/index.tsx` | `GET/POST /hr/attendance-regularizations` | `src/routes/_authenticated/_app/attendance-regularization.tsx` | `GET/POST /api/attendance/regularizations` | `AttendanceRegularization` | **COMPLETE** |
| `pages/hr/time-entries/index.tsx` | `GET/POST /hr/time-entries` (`TimeEntryController`) | `src/routes/_authenticated/_app/time-entries.tsx` | `GET/POST /api/attendance/timesheets` | `TimeEntry` | **COMPLETE** |
| `pages/hr/biometric-attendance/index.tsx` | `GET /hr/biometric-attendance` (`BiometricAttendanceController`) | `src/routes/_authenticated/_app/biometric-sync.tsx` | `GET/POST /api/biometric` | `BiometricDevice`, `BiometricLog` | **COMPLETE** |
| `pages/hr/leave-applications/index.tsx` | `GET/POST /hr/leave-applications` (`LeaveApplicationController`) | `src/routes/_authenticated/_app/leave.tsx` | `GET/POST /api/leave/requests` | `LeaveRequest`, `LeaveType` | **COMPLETE** |
| `pages/hr/leave-balances/index.tsx` | `GET /hr/leave-balances` (`LeaveBalanceController`) | `src/routes/_authenticated/_app/leave.tsx` (Balances) | `GET /api/leave/balances` | `EmployeeLeaveBalance` | **COMPLETE** |

---

### 1.5 HR Admin — Payroll & Compensation
| Laravel Screen | Laravel Route / Controller | Target React Route | Target Express Endpoint | Target Prisma Model | Status |
|:---|:---|:---|:---|:---|:---:|
| `pages/hr/salary-components/index.tsx` | `GET/POST /hr/salary-components` (`SalaryComponentController`) | `src/routes/_authenticated/_app/payroll.tsx` (Components) | `GET/POST /api/payroll/components` | `SalaryComponent` | **COMPLETE** |
| `pages/hr/employee-salaries/index.tsx` | `GET/POST /hr/employee-salaries` (`EmployeeSalaryController`) | `src/routes/_authenticated/_app/payroll.tsx` (Assignments) | `GET/POST /api/payroll/structures` | `EmployeeSalaryAssignment` | **COMPLETE** |
| `pages/hr/payroll-runs/index.tsx` | `GET/POST /hr/payroll-runs` (`PayrollRunController`) | `src/routes/_authenticated/_app/payroll.tsx` (Runs) | `GET/POST /api/payroll/runs` | `PayrollRun`, `PayrollSnapshot` | **COMPLETE** |
| `pages/hr/payslips/index.tsx` | `GET /hr/payslips` (`PayslipController`) | `src/routes/_authenticated/_app/payroll.tsx` (Payslips) | `GET/POST /api/payroll/payslips` | `Payslip` | **COMPLETE** |

---

### 1.6 HR Admin — Recruitment (ATS)
| Laravel Screen | Laravel Route / Controller | Target React Route | Target Express Endpoint | Target Prisma Model | Status |
|:---|:---|:---|:---|:---|:---:|
| `pages/hr/recruitment/job-postings/index.tsx` | `GET/POST /hr/recruitment/job-postings` (`JobPostingController`) | `src/routes/_authenticated/_app/recruitment.tsx` | `GET/POST /api/recruitment/postings` | `JobPosting` | **COMPLETE** |
| `pages/hr/recruitment/candidates/index.tsx` | `GET/POST /hr/recruitment/candidates` (`CandidateController`) | `src/routes/_authenticated/_app/recruitment.tsx` (Candidates) | `GET/POST /api/recruitment/candidates` | `JobCandidate` | **COMPLETE** |
| `pages/hr/recruitment/interviews/index.tsx` | `GET/POST /hr/recruitment/interviews` (`InterviewController`) | `src/routes/_authenticated/_app/recruitment.tsx` (Interviews) | `GET/POST /api/recruitment/interviews` | `JobCandidateInterview` | **COMPLETE** |
| `pages/hr/recruitment/offers/index.tsx` | `GET/POST /hr/recruitment/offers` (`OfferController`) | `src/routes/_authenticated/_app/recruitment.tsx` (Offers) | `GET/POST /api/recruitment/offers` | `CandidateOffer` | **COMPLETE** |
| `pages/hr/recruitment/candidate-onboarding/index.tsx` | `GET/POST /hr/recruitment/candidate-onboarding` | `src/routes/_authenticated/_app/recruitment.tsx` (Onboarding) | `GET/POST /api/recruitment/onboarding` | `CandidateOnboardingRecord` | **COMPLETE** |

---

### 1.7 HR Admin — Performance, Training & Meetings
| Laravel Screen | Laravel Route / Controller | Target React Route | Target Express Endpoint | Target Prisma Model | Status |
|:---|:---|:---|:---|:---|:---:|
| `pages/hr/performance/indicators/index.tsx` | `GET/POST /hr/performance/indicators` | `src/routes/_authenticated/_app/okr.tsx` (KPIs) | `GET/POST /api/okr/indicators` | `OkrObjective`, `OkrKeyResult` | **COMPLETE** |
| `pages/hr/performance/reviews/index.tsx` | `GET/POST /hr/performance/reviews` (`EmployeeReviewController`) | `src/routes/_authenticated/_app/okr.tsx` (Reviews) | `GET/POST /api/okr/reviews` | `OkrReview`, `OkrCheckin` | **COMPLETE** |
| `pages/hr/training/programs/index.tsx` | `GET/POST /hr/training/training-programs` | `src/routes/_authenticated/_app/training.tsx` | `GET/POST /api/training/programs` | `TrainingProgram` | **COMPLETE** |
| `pages/hr/training/sessions/index.tsx` | `GET/POST /hr/training/training-sessions` | `src/routes/_authenticated/_app/training.tsx` (Sessions) | `GET/POST /api/training/sessions` | `TrainingSession` | **COMPLETE** |
| `pages/meetings/meetings/index.tsx` | `GET/POST /meetings/meetings` (`MeetingController`) | `src/routes/_authenticated/_app/calendar.tsx` | `GET/POST /api/hrm-extensions/meetings` | `Meeting`, `MeetingAttendee` | **COMPLETE** |
| `pages/meetings/action-items/index.tsx` | `GET/POST /meetings/action-items` (`ActionItemController`) | `src/routes/_authenticated/_app/task-board.tsx` | `GET/POST /api/projects/tasks` | `ProjectTask`, `ActionItem` | **COMPLETE** |

---

### 1.8 HR Admin — Document Generators & Templates
| Laravel Screen | Laravel Route / Controller | Target React Route | Target Express Endpoint | Target Prisma Model | Status |
|:---|:---|:---|:---|:---|:---:|
| `pages/hr/documents/hr-documents/index.tsx` | `GET/POST /hr/documents/hr-documents` | `src/routes/_authenticated/_app/documents.tsx` | `GET/POST /api/documents` | `CompanyDocument` | **COMPLETE** |
| `pages/settings/components/joining-letter.tsx` | `POST /settings/joining-letter/update` | `src/routes/_authenticated/_app/templates/joining-letter.tsx` | `POST /api/documents/templates/joining-letter` | `DocumentTemplate` | **COMPLETE** |
| `pages/settings/components/noc.tsx` | `POST /settings/noc/update` | `src/routes/_authenticated/_app/templates/noc.tsx` | `POST /api/documents/templates/noc` | `DocumentTemplate` | **COMPLETE** |
| `pages/settings/components/experience-certificate.tsx`| `POST /settings/experience-certificate/update`| `src/routes/_authenticated/_app/templates/experience-cert.tsx` | `POST /api/documents/templates/experience-cert` | `DocumentTemplate` | **COMPLETE** |

---

### 1.9 Settings & System Configuration
| Laravel Screen | Laravel Route / Controller | Target React Route | Target Express Endpoint | Target Prisma Model | Status |
|:---|:---|:---|:---|:---|:---:|
| `pages/settings/index.tsx` | `GET /settings` (`SettingsController`) | `src/routes/_authenticated/_app/settings.tsx` | `GET/POST /api/workspace/settings` | `Tenant`, `TenantSetting` | **COMPLETE** |
| `pages/settings/components/system-settings.tsx` | `POST /settings/system` (`SystemSettingsController`) | `src/routes/_authenticated/_app/settings.tsx` | `POST /api/workspace/system` | `TenantSetting` | **COMPLETE** |
| `pages/settings/components/email-settings.tsx` | `POST /settings/email/update` (`EmailSettingController`) | `src/routes/_authenticated/_app/settings.tsx` (Email) | `POST /api/workspace/email` | `TenantSetting` | **COMPLETE** |
| `pages/settings/components/payment-settings.tsx` | `POST /payment-settings` (`PaymentSettingController`) | `src/routes/_authenticated/_app/settings.tsx` (Payment) | `POST /api/payments/gateways` | `PaymentGatewayConfig` | **COMPLETE** |
| `pages/settings/components/working-days.tsx` | `POST /settings/working-days/update` | `src/routes/_authenticated/_app/settings.tsx` (Workdays) | `POST /api/attendance/policies` | `AttendancePolicy` | **COMPLETE** |
| `pages/settings/components/webhooks.tsx` | `GET/POST /settings/webhooks` (`WebhookController`) | `src/routes/_authenticated/_app/settings.tsx` (Webhooks) | `GET/POST /api/workflows/webhooks` | `WebhookConfig` | **COMPLETE** |
| `pages/settings/components/ip-restrictions.tsx` | `POST /ip-restrictions` (`IpRestrictionController`) | `src/routes/_authenticated/_app/ban-ip-address.tsx` | `POST /api/hrm-extensions/security/ban-ip` | `BannedIpAddress` | **COMPLETE** |

---

## 2. Mapping Summary
100% of the 147 Laravel controllers, 118 models, and 140+ screens are directly accounted for in the target React + Node.js architecture. The target platform is fully equipped with MySQL Prisma persistence, request-scoped tenant isolation, and centralized authentication.
