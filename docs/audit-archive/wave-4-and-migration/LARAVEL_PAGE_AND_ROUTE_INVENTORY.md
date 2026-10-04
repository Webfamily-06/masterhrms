# Laravel Page and Route Inventory

**Source Repository:** `/Users/apple/Documents/hrms/hrms-flow`  
**Target Repository:** `/Users/apple/Documents/hrms`  
**Audit Standard:** Exhaustive inspection of `routes/web.php`, `resources/js/pages/`, controllers, models, and seeders.

---

## 1. Multi-Portal Hierarchy Overview

The Laravel application is partitioned into 3 distinct authenticated portals plus public/landing access:
1. **Super Admin Portal** (`role: superadmin` / SaaS Platform management)
2. **HR Admin Portal** (`role: company`, `manager` / Tenant organization management)
3. **Employee Self-Service Portal** (`role: employee` / Personal attendance, leave, payslips, assets)
4. **Public & Career Portal** (Public visitors, applicants, CMS content)

---

## 2. Super Admin Portal Pages (Platform Level)

| # | Laravel Route | HTTP | Source Page Component | Target Route (`src/routes/`) | Primary Entities | Required Permission |
|---|---------------|:----:|-----------------------|------------------------------|------------------|---------------------|
| 1 | `/dashboard` | GET | `pages/superadmin/dashboard.tsx` | `/_authenticated/_app/super` | `User`, `Plan`, `PlanOrder` | `manage-dashboard` |
| 2 | `/companies` | GET | `pages/companies/index.tsx` | `/_authenticated/_app/companies.tsx` | `User (type=company)` | `manage-companies` |
| 3 | `/companies/{id}` | GET | `pages/companies/view.tsx` | `/_authenticated/_app/companies.tsx` | `User`, `Plan`, `Settings` | `view-companies` |
| 4 | `/plans` | GET | `pages/plans/index.tsx` | `/_authenticated/_app/super/plans.tsx` | `Plan` | `manage-plans` |
| 5 | `/plans/create` | GET/POST | `pages/plans/create.tsx` | `/_authenticated/_app/super/plans.tsx` | `Plan` | `create-plans` |
| 6 | `/plans/{id}/edit` | GET/PUT | `pages/plans/edit.tsx` | `/_authenticated/_app/super/plans.tsx` | `Plan` | `edit-plans` |
| 7 | `/plan-orders` | GET | `pages/plans/plan-orders.tsx` | `/_authenticated/_app/super/invoices.tsx` | `PlanOrder`, `Plan` | `manage-plan-orders` |
| 8 | `/plan-requests` | GET | `pages/plans/plan-request.tsx` | `/_authenticated/_app/super/invoices.tsx` | `PlanRequest` | `manage-plan-requests` |
| 9 | `/coupons` | GET | `pages/coupons/index.tsx` | `/_authenticated/_app/super/coupons.tsx` | `Coupon` | `manage-coupons` |
| 10| `/currencies` | GET | `pages/currencies/index.tsx` | `/_authenticated/_app/currencies.tsx` | `Currency` | `manage-currencies` |
| 11| `/email-templates` | GET | `pages/email-templates/index.tsx` | `/_authenticated/_app/super/email-templates.tsx` | `EmailTemplate`, `EmailTemplateLang` | `manage-email-templates` |
| 12| `/languages` | GET | `pages/manage-language.tsx` | `/_authenticated/_app/super/languages.tsx` | Language JSON dictionaries | `manage-language` |
| 13| `/landing-page` | GET | `pages/landing-page/index.tsx` | `/_authenticated/_app/super/cms.tsx` | `LandingPageSetting` | `manage-landing-page` |
| 14| `/landing-page/settings` | GET/POST | `pages/landing-page/settings.tsx` | `/_authenticated/_app/super/cms.tsx` | `LandingPageSetting` | `manage-landing-page` |
| 15| `/landing-page/custom-pages`| GET | `pages/landing-page/custom-page.tsx` | `/_authenticated/_app/super/cms.tsx` | `LandingPageCustomPage` | `manage-landing-page` |
| 16| `/referrals` | GET | `pages/referral/index.tsx` | `/_authenticated/_app/super/referrals.tsx` | `Referral`, `PayoutRequest` | `manage-referral` |
| 17| `/newsletters` | GET | `pages/newsletters/index.tsx` | `/_authenticated/_app/super/newsletters.tsx` | `NewsLetter` | `manage-newsletters` |
| 18| `/login-history` | GET | `pages/login-history/index.tsx` | `/_authenticated/_app/super/login-history.tsx` | `LoginHistory` | `manage-login-history` |

---

## 3. HR Admin Portal Pages (Tenant Organization Level)

### 3.1 Organization & People
| # | Laravel Route | HTTP | Source Page Component | Target Route (`src/routes/`) | Primary Entities | Required Permission |
|---|---------------|:----:|-----------------------|------------------------------|------------------|---------------------|
| 19| `/dashboard` | GET | `pages/dashboard.tsx` | `/_authenticated/_app/dashboard.tsx` | `Employee`, `Attendance`, `Leave` | `manage-dashboard` |
| 20| `/hr/branches` | GET/POST | `pages/hr/branches/index.tsx` | `/_authenticated/_app/branches.tsx` | `Branch` | `manage-branches` |
| 21| `/hr/departments` | GET/POST | `pages/hr/departments/index.tsx` | `/_authenticated/_app/departments.tsx` | `Department` | `manage-departments` |
| 22| `/hr/designations` | GET/POST | `pages/hr/designations/index.tsx` | `/_authenticated/_app/designations.tsx` | `Designation` | `manage-designations` |
| 23| `/hr/employees` | GET/POST | `pages/hr/employees/index.tsx` | `/_authenticated/_app/employees.tsx` | `Employee`, `User` | `manage-employees` |
| 24| `/hr/employees/{id}` | GET | `pages/hr/employees/show.tsx` | `/_authenticated/_app/employee-details.tsx` | `Employee`, `User`, `Document` | `view-employees` |
| 25| `/hr/organization-chart` | GET | `pages/hr/organization-chart/index.tsx` | `/_authenticated/_app/organization-chart.tsx` | `Employee`, `Designation` | `view-organization-chart` |

### 3.2 Time, Attendance & Leaves
| # | Laravel Route | HTTP | Source Page Component | Target Route (`src/routes/`) | Primary Entities | Required Permission |
|---|---------------|:----:|-----------------------|------------------------------|------------------|---------------------|
| 26| `/hr/attendance-records` | GET/POST | `pages/hr/attendance-records/index.tsx` | `/_authenticated/_app/attendance.tsx` | `AttendanceRecord` | `manage-attendance-records` |
| 27| `/hr/attendance-records/monthly`| GET | `pages/hr/attendance-records/monthly.tsx`| `/_authenticated/_app/attendance-employee.tsx` | `AttendanceRecord` | `view-attendance-records` |
| 28| `/hr/attendance-policies` | GET/POST | `pages/hr/attendance-policies/index.tsx`| `/_authenticated/_app/attendance-policies.tsx`| `AttendancePolicy` | `manage-attendance-policies` |
| 29| `/hr/attendance-regularizations`| GET/POST| `pages/hr/attendance-regularizations/index.tsx`| `/_authenticated/_app/attendance-regularization.tsx`| `AttendanceRegularization`| `manage-attendance-regularizations`|
| 30| `/hr/shifts` | GET/POST | `pages/hr/shifts/index.tsx` | `/_authenticated/_app/shifts.tsx` | `Shift` | `manage-shifts` |
| 31| `/hr/time-entries` | GET/POST | `pages/hr/time-entries/index.tsx` | `/_authenticated/_app/time-entries.tsx` | `TimeEntry` | `manage-time-entries` |
| 32| `/hr/biometric-attendance` | GET/POST | `pages/hr/biometric-attendance/index.tsx`| `/_authenticated/_app/biometric-sync.tsx` | `BiometricDevice`, `PunchLog` | `manage-biometric-attendance` |
| 33| `/hr/holidays` | GET/POST | `pages/hr/holidays/index.tsx` | `/_authenticated/_app/holidays.tsx` | `Holiday` | `manage-holidays` |
| 34| `/hr/leave-types` | GET/POST | `pages/hr/leave-types/index.tsx` | `/_authenticated/_app/leave.tsx` | `LeaveType` | `manage-leave-types` |
| 35| `/hr/leave-policies` | GET/POST | `pages/hr/leave-policies/index.tsx` | `/_authenticated/_app/leave.tsx` | `LeavePolicy` | `manage-leave-policies` |
| 36| `/hr/leave-applications` | GET/POST | `pages/hr/leave-applications/index.tsx`| `/_authenticated/_app/leave.tsx` | `LeaveApplication` | `manage-leave-applications` |
| 37| `/hr/leave-balances` | GET | `pages/hr/leave-balances/index.tsx` | `/_authenticated/_app/leave.tsx` | `LeaveBalance` | `manage-leave-balances` |

### 3.3 Payroll & Compensation
| # | Laravel Route | HTTP | Source Page Component | Target Route (`src/routes/`) | Primary Entities | Required Permission |
|---|---------------|:----:|-----------------------|------------------------------|------------------|---------------------|
| 38| `/hr/salary-components` | GET/POST | `pages/hr/salary-components/index.tsx` | `/_authenticated/_app/payroll.tsx` | `SalaryComponent` | `manage-salary-components` |
| 39| `/hr/employee-salaries` | GET/POST | `pages/hr/employee-salaries/index.tsx` | `/_authenticated/_app/payroll.tsx` | `EmployeeSalary` | `manage-employee-salaries` |
| 40| `/hr/payroll-runs` | GET/POST | `pages/hr/payroll-runs/index.tsx` | `/_authenticated/_app/payroll.tsx` | `PayrollRun`, `PayrollEntry` | `manage-payroll-runs` |
| 41| `/hr/payslips` | GET | `pages/hr/payslips/index.tsx` | `/_authenticated/_app/payroll.tsx` | `Payslip` | `manage-payslips` |

### 3.4 Recruitment (ATS)
| # | Laravel Route | HTTP | Source Page Component | Target Route (`src/routes/`) | Primary Entities | Required Permission |
|---|---------------|:----:|-----------------------|------------------------------|------------------|---------------------|
| 42| `/hr/recruitment/job-categories` | GET/POST | `pages/hr/recruitment/job-categories/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `JobCategory` | `manage-job-categories` |
| 43| `/hr/recruitment/job-types` | GET/POST | `pages/hr/recruitment/job-types/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `JobType` | `manage-job-types` |
| 44| `/hr/recruitment/job-locations` | GET/POST | `pages/hr/recruitment/job-locations/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `JobLocation` | `manage-job-locations` |
| 45| `/hr/recruitment/job-requisitions` | GET/POST | `pages/hr/recruitment/job-requisitions/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `JobRequisition` | `manage-job-requisitions` |
| 46| `/hr/recruitment/job-postings` | GET/POST | `pages/hr/recruitment/job-postings/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `JobPosting` | `manage-job-postings` |
| 47| `/hr/recruitment/candidate-sources`| GET/POST | `pages/hr/recruitment/candidate-sources/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `CandidateSource` | `manage-candidate-sources` |
| 48| `/hr/recruitment/candidates` | GET/POST | `pages/hr/recruitment/candidates/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `Candidate` | `manage-candidates` |
| 49| `/hr/recruitment/custom-questions` | GET/POST | `pages/hr/recruitment/custom-questions/index.tsx` | `/_authenticated/_app/custom-fields.tsx` | `CustomQuestion` | `manage-custom-questions` |
| 50| `/hr/recruitment/interview-types` | GET/POST | `pages/hr/recruitment/interview-types/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `InterviewType` | `manage-interview-types` |
| 51| `/hr/recruitment/interview-rounds` | GET/POST | `pages/hr/recruitment/interview-rounds/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `InterviewRound` | `manage-interview-rounds` |
| 52| `/hr/recruitment/interviews` | GET/POST | `pages/hr/recruitment/interviews/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `Interview` | `manage-interviews` |
| 53| `/hr/recruitment/interview-feedback`| GET/POST | `pages/hr/recruitment/interview-feedback/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `InterviewFeedback` | `manage-interview-feedback` |
| 54| `/hr/recruitment/candidate-assessments`| GET/POST | `pages/hr/recruitment/candidate-assessments/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `CandidateAssessment` | `manage-candidate-assessments` |
| 55| `/hr/recruitment/offer-templates` | GET/POST | `pages/hr/recruitment/offer-templates/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `OfferTemplate` | `manage-offer-templates` |
| 56| `/hr/recruitment/offers` | GET/POST | `pages/hr/recruitment/offers/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `Offer` | `manage-offers` |
| 57| `/hr/recruitment/onboarding-checklists`| GET/POST| `pages/hr/recruitment/onboarding-checklists/index.tsx`| `/_authenticated/_app/recruitment.tsx`| `OnboardingChecklist`| `manage-onboarding-checklists`|
| 58| `/hr/recruitment/checklist-items` | GET/POST | `pages/hr/recruitment/checklist-items/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `ChecklistItem` | `manage-checklist-items` |
| 59| `/hr/recruitment/candidate-onboarding`| GET/POST | `pages/hr/recruitment/candidate-onboarding/index.tsx` | `/_authenticated/_app/recruitment.tsx` | `CandidateOnboarding` | `manage-candidate-onboarding` |

### 3.5 Performance & Training
| # | Laravel Route | HTTP | Source Page Component | Target Route (`src/routes/`) | Primary Entities | Required Permission |
|---|---------------|:----:|-----------------------|------------------------------|------------------|---------------------|
| 60| `/hr/performance/indicator-categories`| GET/POST | `pages/hr/performance/indicator-categories/index.tsx`| `/_authenticated/_app/performance-indicator.tsx`| `PerformanceIndicatorCategory`| `manage-performance-indicators`|
| 61| `/hr/performance/indicators` | GET/POST | `pages/hr/performance/indicators/index.tsx` | `/_authenticated/_app/performance-indicator.tsx` | `PerformanceIndicator` | `manage-performance-indicators` |
| 62| `/hr/performance/goal-types` | GET/POST | `pages/hr/performance/goal-types/index.tsx` | `/_authenticated/_app/okr.tsx` | `GoalType` | `manage-employee-goals` |
| 63| `/hr/performance/goals` | GET/POST | `pages/hr/performance/goals/index.tsx` | `/_authenticated/_app/okr.tsx` | `EmployeeGoal` | `manage-employee-goals` |
| 64| `/hr/performance/review-cycles`| GET/POST | `pages/hr/performance/review-cycles/index.tsx` | `/_authenticated/_app/performance-review.tsx` | `ReviewCycle` | `manage-employee-reviews` |
| 65| `/hr/performance/reviews` | GET/POST | `pages/hr/performance/reviews/index.tsx` | `/_authenticated/_app/performance-review.tsx` | `EmployeeReview` | `manage-employee-reviews` |
| 66| `/hr/training/types` | GET/POST | `pages/hr/training/types/index.tsx` | `/_authenticated/_app/training.tsx` | `TrainingType` | `manage-training-types` |
| 67| `/hr/training/programs` | GET/POST | `pages/hr/training/programs/index.tsx` | `/_authenticated/_app/training.tsx` | `TrainingProgram` | `manage-training-programs` |
| 68| `/hr/training/sessions` | GET/POST | `pages/hr/training/sessions/index.tsx` | `/_authenticated/_app/training.tsx` | `TrainingSession` | `manage-training-sessions` |
| 69| `/hr/training/employee-trainings`| GET/POST | `pages/hr/training/employee-trainings/index.tsx` | `/_authenticated/_app/training.tsx` | `EmployeeTraining` | `manage-employee-trainings` |

### 3.6 Movements, Warnings, Grievances & Awards
| # | Laravel Route | HTTP | Source Page Component | Target Route (`src/routes/`) | Primary Entities | Required Permission |
|---|---------------|:----:|-----------------------|------------------------------|------------------|---------------------|
| 70| `/hr/promotions` | GET/POST | `pages/hr/promotions/index.tsx` | `/_authenticated/_app/promotions.tsx` | `Promotion` | `manage-promotions` |
| 71| `/hr/transfers` | GET/POST | `pages/hr/transfers/index.tsx` | `/_authenticated/_app/transfers.tsx` | `EmployeeTransfer` | `manage-transfers` |
| 72| `/hr/resignations` | GET/POST | `pages/hr/resignations/index.tsx` | `/_authenticated/_app/resignation.tsx` | `Resignation` | `manage-resignations` |
| 73| `/hr/terminations` | GET/POST | `pages/hr/terminations/index.tsx` | `/_authenticated/_app/termination.tsx` | `Termination` | `manage-terminations` |
| 74| `/hr/warnings` | GET/POST | `pages/hr/warnings/index.tsx` | `/_authenticated/_app/warnings.tsx` | `Warning` | `manage-warnings` |
| 75| `/hr/complaints` | GET/POST | `pages/hr/complaints/index.tsx` | `/_authenticated/_app/helpdesk.tsx` | `Complaint` | `manage-complaints` |
| 76| `/hr/trips` | GET/POST | `pages/hr/trips/index.tsx` | `/_authenticated/_app/expenses.tsx` | `Trip` | `manage-trips` |
| 77| `/hr/award-types` | GET/POST | `pages/hr/award-types/index.tsx` | `/_authenticated/_app/awards.tsx` | `AwardType` | `manage-award-types` |
| 78| `/hr/awards` | GET/POST | `pages/hr/awards/index.tsx` | `/_authenticated/_app/awards.tsx` | `Award` | `manage-awards` |

### 3.7 Contracts, Documents, Assets & Collaboration
| # | Laravel Route | HTTP | Source Page Component | Target Route (`src/routes/`) | Primary Entities | Required Permission |
|---|---------------|:----:|-----------------------|------------------------------|------------------|---------------------|
| 79| `/hr/contracts` | GET/POST | `pages/hr/contracts/index.tsx` | `/_authenticated/_app/contracts.tsx` | `EmployeeContract` | `manage-employee-contracts` |
| 80| `/hr/contract-types` | GET/POST | `pages/hr/contract-types/index.tsx` | `/_authenticated/_app/contracts.tsx` | `ContractType` | `manage-contract-types` |
| 81| `/hr/contract-templates`| GET/POST | `pages/hr/contract-templates/index.tsx`| `/_authenticated/_app/contracts.tsx` | `ContractTemplate` | `manage-contract-templates` |
| 82| `/hr/documents` | GET/POST | `pages/hr/documents/index.tsx` | `/_authenticated/_app/documents.tsx` | `HrDocument` | `manage-hr-documents` |
| 83| `/hr/document-types` | GET/POST | `pages/hr/document-types/index.tsx` | `/_authenticated/_app/documents.tsx` | `DocumentType` | `manage-document-types` |
| 84| `/hr/assets` | GET/POST | `pages/hr/assets/index.tsx` | `/_authenticated/_app/assets.tsx` | `Asset` | `manage-assets` |
| 85| `/hr/asset-types` | GET/POST | `pages/hr/asset-types/index.tsx` | `/_authenticated/_app/assets.tsx` | `AssetType` | `manage-asset-types` |
| 86| `/hr/announcements` | GET/POST | `pages/hr/announcements/index.tsx` | `/_authenticated/_app/announcements.tsx` | `Announcement` | `manage-announcements` |
| 87| `/calendar` | GET | `pages/calendar/index.tsx` | `/_authenticated/_app/calendar.tsx` | `CalendarEvent`, `Meeting` | `manage-calendar` |
| 88| `/meetings` | GET/POST | `pages/meetings/meetings/index.tsx` | `/_authenticated/_app/meetings.tsx` | `Meeting`, `MeetingAttendee` | `manage-meetings` |
| 89| `/meetings/meeting-rooms`| GET/POST | `pages/meetings/meeting-rooms/index.tsx`| `/_authenticated/_app/meetings.tsx` | `MeetingRoom` | `manage-meeting-rooms` |
| 90| `/meetings/action-items`| GET/POST | `pages/meetings/action-items/index.tsx`| `/_authenticated/_app/task-board.tsx` | `ActionItem` | `manage-action-items` |

### 3.8 Settings & App Extensions
| # | Laravel Route | HTTP | Source Page Component | Target Route (`src/routes/`) | Primary Entities | Required Permission |
|---|---------------|:----:|-----------------------|------------------------------|------------------|---------------------|
| 91| `/settings` | GET/POST | `pages/settings/index.tsx` (21 component tabs)| `/_authenticated/_app/settings.tsx` | `Setting` (key-value) | `manage-settings` |
| 92| `/users` | GET/POST | `pages/users/index.tsx` | `/_authenticated/_app/users.tsx` | `User`, `Role` | `manage-users` |
| 93| `/roles` | GET/POST | `pages/roles/index.tsx` | `/_authenticated/_app/roles.tsx` | `Role`, `Permission` | `manage-roles` |
| 94| `/permissions` | GET | `pages/permissions/index.tsx` | `/_authenticated/_app/permissions.tsx` | `Permission` | `manage-permissions` |
| 95| `/media-library` | GET/POST | `pages/media-library.tsx` | `/_authenticated/_app/media.tsx` | `Media`, `MediaDirectory` | `manage-media` |
| 96| `/settings/custom-fields`| GET/POST | `ui-2/custom-fields.html` | `/_authenticated/_app/custom-fields.tsx` | `CustomField`, `CustomFieldValue` | `manage-settings` |
| 97| `/marketing/campaigns` | GET/POST | `ui/campaigns.html` | `/_authenticated/_app/campaigns.tsx` | `MarketingCampaign` | `manage-campaigns` |

---

## 4. Employee Self-Service (ESS) Portal Pages

| # | Feature / Screen | Laravel Source Component | Target Route (`src/routes/`) | Description |
|---|------------------|--------------------------|------------------------------|-------------|
| 98| Employee Dashboard | `pages/employee-dashboard.tsx` | `/_authenticated/_app/employee-dashboard.tsx` | Clock-in/out punch widget, pending leave card, current shift details, team announcements |
| 99| Personal Attendance | `pages/hr/attendance-records/monthly.tsx` | `/_authenticated/_app/attendance-employee.tsx` | Personal 31-day visual punch record and regularization submissions |
| 100| Leave Applications | `pages/hr/leave-applications/index.tsx` | `/_authenticated/_app/leave.tsx` | Employee PTO request submission, remaining quota balances |
| 101| Payslips Download | `pages/hr/payslips/index.tsx` | `/_authenticated/_app/payroll.tsx` | View and PDF download of monthly salary payslips |
| 102| Assigned Assets | `pages/hr/assets/index.tsx` | `/_authenticated/_app/assets.tsx` | Hardware devices and assets assigned to current employee |
| 103| Personal Goals & OKRs | `pages/hr/performance/goals/index.tsx` | `/_authenticated/_app/okr.tsx` | Personal KPI goals, milestone completion % |

---

## 5. Public & Career Portal Pages

| # | Public Feature | Laravel Source Component | Target Route (`src/routes/`) | Description |
|---|----------------|--------------------------|------------------------------|-------------|
| 104| SaaS Landing Page | `pages/welcome.tsx` | `/` (`src/routes/index.tsx`) | Hero section, features, pricing matrix, FAQ, testimonials, footer |
| 105| Public Job Board | `pages/career/index.tsx` | `/careers` | Active public openings filtered by department, location, job type |
| 106| Job Detail & Apply | `pages/career/job-detail.tsx` | `/careers/$id` | Vacancy description, requirements, dynamic question fields, resume file upload |
