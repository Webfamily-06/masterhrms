# MASTERHRMS — HR ADMIN SETTINGS SPECIFICATION & VERIFICATION REPORT
## Operational Human Capital, Policies, Statutory Rules & Lifecycle Hub (`/hr/settings`)

**Document Version:** 1.0.0  
**Status:** Verified & Operational  
**Route:** `/hr/settings` (TanStack: `src/routes/_authenticated/hr/settings.tsx`, Next.js CMS: `CMS/src/app/(workspace)/hr/settings/page.tsx`)  
**Authorization Guard:** Accessible to users with `hr_admin`, `admin`, `owner`, or `super_admin` roles.

---

### 1. Overview & Architectural Scope

The HR Administration Settings experience (`/hr/settings`) is the primary operational management console for human resources professionals in MASTERHRMS. It coordinates organization structures, workforce attendance policies, statutory payroll rules, leave quotas, approval hierarchies, and dynamic schema extensions.

Unlike platform infrastructure settings, HR settings directly dictate the day-to-day business rules of the workforce. Changes made here actively alter how attendance punches are classified, how leave balances are debited, how payroll pay slips are computed, and how approval tasks are routed.

---

### 2. Operational Categories & Navigation Sections

The HR settings suite provides 15 structured operational sections organized into four functional categories:

#### Category 1: Workspace & Identity (`workspace-cat`)
1. **Workspace Roles & Modules (`workspace`):**
   - Manage seat licenses, assigned roles (Admin, HR Admin, Manager, Employee), and module feature toggles.
2. **Workspace Branding (`workspace-branding`):**
   - Configure tenant-level company logos, accent colors, and custom appearance overrides.
3. **Company Profile & GST (`company-profile`):**
   - Legal business entity name, corporate registration number, GSTIN tax registration, and primary dispatch address.
4. **Office Timing & Policy (`organization`):**
   - Standard working shifts, flexible timing windows, attendance grace periods, and minimum half-day/full-day hour thresholds.
5. **Settings & Gateways (`system-settings`):**
   - Direct integration of `SharedSettingsShell` for communication, storage, payments, and system controls.

#### Category 2: Workforce & HR Management (`workforce-cat`)
1. **Leave Types & Quotas (`leave-types`):**
   - Annual vacation, sick, casual, maternity/paternity, and compensatory-off quotas.
   - Accrual frequencies (monthly vs annual) and carry-forward limits.
2. **Departments & Teams (`departments`):**
   - Department hierarchy, sub-departments, team leads, and divisional assignment.
3. **Approval Workflows (`approvals`):**
   - Multi-tier approval chains (Manager -> HR -> Finance) for leave, attendance regularizations, overtime, and profile updates.
   - Auto-approval timeouts and escalation paths.

#### Category 3: Payroll & Finance (`finance-cat`)
1. **Salary & Statutory Rules (`salary-settings`):**
   - Compensation breakdown formulas: Dearness Allowance (DA), House Rent Allowance (HRA), Provident Fund (PF), Employee State Insurance (ESI), and state-specific Professional Tax (PT).
2. **Invoice & Billing Terms (`invoice-settings`):**
   - Corporate invoice numbering prefix, default payment terms (Net 15, Net 30), and bank wire transfer instructions.

#### Category 4: System & Intelligence (`system-cat`) & Account
1. **HRMS Portal Config Hub (`config-hub`):**
   - High-level operational shortcuts to attendance, leave, payroll, and asset management modules.
2. **Dynamic Custom Fields (`custom-fields`):**
   - Schema extension engine allowing HR admins to add custom string, number, date, or dropdown fields to employee profiles, recruitment candidates, and tickets.
3. **AI Engine Settings (`ai-settings`):**
   - Configuration for AI-assisted job description generation, resume parsing, and attendance pattern anomaly detection.
4. **Security & 2FA (`security`):**
   - Two-factor authentication status and emergency backup codes.
5. **Email Accounts (`email`):**
   - Dedicated integration of `UserEmailAccountsSettings` for managing corporate and departmental mailboxes.

---

### 3. Business Rule Impact & Runtime Consumers

| HR Setting Area | Controlled Business Flow | Verification Evidence |
| :--- | :--- | :--- |
| **Office Timing & Grace Periods** | Attendance Punch Classification | Shifts with a 15-minute grace window automatically classify clock-ins between 09:00 and 09:15 as `ON_TIME` rather than `LATE`. |
| **Leave Quotas & Carry-Forward** | Leave Application Validation | Prevents leave application submission if requested days exceed dynamic available balance calculated via `LeaveService`. |
| **Approval Chains** | Task Routing Engine | Multi-level approval steps generate sequential approval records in `approvals` table before marking requests `APPROVED`. |
| **Employee ID Sequence** | Auto-Generated Identifier | The `hr.employee_id.sequence_start` and `hr.employee_id.sequence_digits` keys generate formatted IDs (e.g. `EMP-0001`). |

---

### 4. Privilege Boundary & Security Controls

1. **HR vs Super Admin Separation:** HR Admins cannot access global `PLATFORM` scope keys, system-wide maintenance mode, or multi-tenant database connection strings.
2. **Role Verification:** Non-administrative employees navigating to `/hr/settings` are intercepted by the `AccessDenied` guard component and cannot execute mutations.
3. **Audit Trail:** All operational changes are recorded in `setting_audits` with the modifying HR administrator's identity and timestamp.
