# 12. WorkDo vs MASTERHRMS: Comprehensive Gap Analysis & Parity Matrix

This document provides a comprehensive, feature-by-feature parity scorecard comparing the WorkDo HRMS reference application against the local MASTERHRMS codebase. Each capability is classified with exact technical gaps, severity, and implementation complexity.

---

## 1. Classification Taxonomy

- **IMPLEMENTED (🟢)**: Feature is fully operational in MASTERHRMS with active API routes, database persistence, and UI controls matching or exceeding WorkDo.
- **PARTIALLY IMPLEMENTED (🟡)**: The base route and UI exist, but specific sub-actions, filters, edge-case validations, or workflows are incomplete.
- **UI ONLY / MOCK (🟠)**: The UI view renders mock, hardcoded, or static data without functional backend mutation or database synchronization.
- **MISSING (🔴)**: The feature exists in WorkDo but is not present in MASTERHRMS.

---

## 2. Parity Scorecard by Module

### 2.1 Super Admin Module

| Feature / Capability | WorkDo Reference | MASTERHRMS Status | Gap Details | Severity | Complexity |
|---|---|---|---|---|---|
| **Tenant List & Management** | Full CRUD, domain, plan | 🟢 IMPLEMENTED | Present in `super/tenants.tsx` with Supabase DB sync | None | None |
| **Tenant Impersonation ("Login As")** | One-click button in row | 🟡 PARTIALLY IMPLEMENTED | Backend endpoint exists; missing UI button & top banner | High | Low |
| **Subscription Plans & Quotas** | CRUD plans, quotas, pricing | 🟢 IMPLEMENTED | Present in `super/plans.tsx` with dynamic feature toggles | None | None |
| **Coupon Code Engine** | Percentage/fixed discount codes | 🟢 IMPLEMENTED | Implemented in `super/coupons.tsx` | None | None |
| **Affiliate & Referral Tracking** | Commission rates & tracking | 🟢 IMPLEMENTED | Implemented in `super/referral.tsx` | None | None |
| **Custom Domain Mapping** | CNAME / IP verification | 🟢 IMPLEMENTED | Implemented in `super/domains.tsx` | None | None |
| **Platform Brand Settings** | Upload logos, favicon, title | 🟢 IMPLEMENTED | Implemented in `super/settings.tsx` | None | None |
| **Helpdesk / Support Tickets** | Ticket threads, SLA, status | 🟢 IMPLEMENTED | Implemented in `super/tenant-support-tickets.tsx` | None | None |

---

### 2.2 HRM: Employee Management

| Feature / Capability | WorkDo Reference | MASTERHRMS Status | Gap Details | Severity | Complexity |
|---|---|---|---|---|---|
| **Employee Directory Table** | Branch/Dept filter, search | 🟢 IMPLEMENTED | Active in `hr/employees/` with search and pagination | None | None |
| **Employee Creation Wizard** | 4-step sequential wizard | 🟡 PARTIALLY IMPLEMENTED | Form exists, but implemented as long tabs; needs wizard UI | Medium | Medium |
| **Auto User Provisioning** | Checkbox generates user login | 🟡 PARTIALLY IMPLEMENTED | In MASTERHRMS, user link is manual; need auto-provision checkbox | High | Low |
| **Employee Profile 360 View** | Tabs: Personal, Salary, Docs | 🟢 IMPLEMENTED | Rich profile view active in `hr/employees/$id` | None | None |
| **CSV / Excel Bulk Import** | Upload CSV with schema check | 🔴 MISSING | Export exists; Import parsing is missing | High | Medium |
| **Statutory Document Vault** | Upload Aadhaar, PAN, Passport | 🟡 PARTIALLY IMPLEMENTED | Uploads exist, but expiry tracking and verification missing | Medium | Low |

---

### 2.3 HRM: Attendance & Time Tracking

| Feature / Capability | WorkDo Reference | MASTERHRMS Status | Gap Details | Severity | Complexity |
|---|---|---|---|---|---|
| **Monthly Attendance Matrix** | Grid view with status badges | 🟢 IMPLEMENTED | Implemented in `hr/attendance/` | None | None |
| **Manual Punch Correction** | Modal to edit clock in/out | 🟢 IMPLEMENTED | Implemented with audit logging | None | None |
| **Bulk Attendance Marking** | Mass mark for branch/date | 🔴 MISSING | HR must mark individually; mass action missing | High | Low |
| **Automated Overtime Calculation**| Real-time overtime vs shift | 🟡 PARTIALLY IMPLEMENTED | Records hours, but doesn't calculate hourly OT rate | Critical | Medium |
| **Grace Period & Late Detection** | Configurable grace minutes | 🟡 PARTIALLY IMPLEMENTED | Hardcoded late logic; needs tenant setting integration | Medium | Low |

---

### 2.4 HRM: Leave Management

| Feature / Capability | WorkDo Reference | MASTERHRMS Status | Gap Details | Severity | Complexity |
|---|---|---|---|---|---|
| **Leave Applications List** | Status filter, search, dates | 🟢 IMPLEMENTED | Implemented in `hr/leave/requests` | None | None |
| **Approval / Rejection Workflow**| Modal with mandatory reason | 🟢 IMPLEMENTED | Implemented with balance checks | None | None |
| **FullCalendar View** | Interactive calendar toggle | 🟡 PARTIALLY IMPLEMENTED | List view works; calendar view toggle is placeholder | Medium | Medium |
| **Leave Entitlement Engine** | Accrual rules & balance track | 🟢 IMPLEMENTED | Backed by `LeaveBalance` in Prisma | None | None |
| **Unpaid Leave -> Payroll Link** | Auto-deducts from monthly pay | 🔴 MISSING | Approved unpaid leave doesn't auto-flow into payroll | Critical | High |

---

### 2.5 HRM: Payroll & Salary Structure

| Feature / Capability | WorkDo Reference | MASTERHRMS Status | Gap Details | Severity | Complexity |
|---|---|---|---|---|---|
| **Batch Payroll Generation** | One-click monthly batch run | 🟢 IMPLEMENTED | Implemented in `hr/payroll/cycles` | None | None |
| **Detailed Payslip Breakdown** | Gross, Allowances, Deductions | 🟢 IMPLEMENTED | Implemented in `hr/payroll/slips` | None | None |
| **Printable / PDF Payslip** | Clean print layout & PDF | 🟡 PARTIALLY IMPLEMENTED | Basic print layout; needs WorkDo-level polished styling | Medium | Medium |
| **Set Salary: Allowances** | Fixed / Percentage items | 🟡 PARTIALLY IMPLEMENTED | Basic allowance field; lacks dynamic multi-item table | Critical | Medium |
| **Set Salary: Commissions** | Recurring & ad-hoc comms | 🔴 MISSING | No dedicated commission ledger | High | Medium |
| **Set Salary: Loans & Advances** | Loan amount & auto-deduction | 🔴 MISSING | No loan tracking or remaining balance ledger | Critical | High |
| **Set Salary: Saturation Deduct**| Statutory deduction items | 🟡 PARTIALLY IMPLEMENTED | Indian PF/ESIC hardcoded; lacks generic deduction items | Medium | Low |
| **Set Salary: Overtime Rates** | Hourly / Daily overtime rate | 🔴 MISSING | Overtime multiplier missing from salary structure | High | Low |

---

### 2.6 Recruitment (ATS) Module

| Feature / Capability | WorkDo Reference | MASTERHRMS Status | Gap Details | Severity | Complexity |
|---|---|---|---|---|---|
| **Job Openings Management** | Branches, skills, positions | 🟢 IMPLEMENTED | Implemented in `hr/recruitment/jobs` | None | None |
| **Candidate Kanban Pipeline** | Drag-and-drop across stages | 🟡 PARTIALLY IMPLEMENTED | Table view exists; drag-and-drop Kanban view missing | High | High |
| **Interview Scheduling** | Date, round, interviewer | 🟡 PARTIALLY IMPLEMENTED | Basic date entry; calendar sync missing | Medium | Medium |
| **Offer Letter Generation** | Template merge with salary | 🔴 MISSING | No automated offer letter PDF generator | Medium | Medium |
| **Convert to Employee** | One-click candidate to staff | 🔴 MISSING | Must re-enter candidate data manually | High | Low |

---

### 2.7 Training & Organizational Communications

| Feature / Capability | WorkDo Reference | MASTERHRMS Status | Gap Details | Severity | Complexity |
|---|---|---|---|---|---|
| **Training Programs Management** | Trainers, costs, dates, branches| 🟢 IMPLEMENTED | Implemented in `hr/training/` | None | None |
| **Company Announcements** | Broadcast to branch/dept | 🟡 PARTIALLY IMPLEMENTED | Basic notice board; lacks targeted branch filtering | Medium | Low |
| **Employee Awards & Recognition**| Award types, gift items, icons | 🟢 IMPLEMENTED | Implemented in `hr/awards.tsx` | None | None |
| **Company Policy Vault** | PDF downloads for staff | 🟡 PARTIALLY IMPLEMENTED | File upload exists; dedicated policy viewer missing | Low | Low |

---

## 3. Critical Architectural Gaps Summary

1. **Gap 1: The Automated Payroll Pipeline (Attendance + Leaves -> Payroll)**:
   - In WorkDo, generating a payroll automatically queries the month's attendance records (for overtime hours) and approved unpaid leaves (for day deductions), calculating Gross and Net pay mathematically without human intervention.
   - In MASTERHRMS, these subsystems exist as independent silos.
2. **Gap 2: The 6-Component "Set Salary" Engine**:
   - In WorkDo, each employee has a granular structure composed of Basic Salary, Allowances, Commissions, Loans, Saturation Deductions, and Overtime rules.
   - In MASTERHRMS, salary configuration is currently modeled as a monolithic structure.
3. **Gap 3: Recruitment ATS Kanban & Candidate Conversion**:
   - WorkDo provides a visual drag-and-drop pipeline and one-click conversion of candidates into active employees.
   - MASTERHRMS requires building the Kanban drag-and-drop interface and linking candidate records to the employee creation form.
