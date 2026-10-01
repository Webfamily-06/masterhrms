# Laravel to React UI/UX Parity Matrix

**Visual Standard:** Complete visual, aesthetic, and behavioral parity with `hrms-flow/resources/js/pages/`.  
**Target UI:** React 19 + TailwindCSS + Radix UI + Dreams/shadcn Design System (`src/`).

---

## 1. Design Token & UI Atom Parity

| Visual Element | Laravel Source (`hrms-flow/resources/js`) | Target React (`src/`) | Parity Status | Verification Notes |
|:---|:---|:---|:---:|:---|
| **Component Primitives** | Radix UI / shadcn (`components/ui/*`) | Radix UI (`src/components/ui/*`) | **EXACT MATCH** | Dialog, Dropdown, Table, Input, Select, Badge, Avatar, Progress, Tabs all present and styled. |
| **Typography & Fonts** | Inter & Outfit sans-serif fonts | Inter & Outfit system stack | **EXACT MATCH** | High-legibility enterprise tabular layout, strict font-weight hierarchy. |
| **Table Layout & Density** | Compact enterprise data table with search, status filters, bulk select, pagination | Standardized DataTable with search, multi-select, pagination bar | **EXACT MATCH** | Preserves compact row height (44px), avatar thumbnail, badge status pills. |
| **Header & Breadcrumbs** | Top breadcrumb navigation with primary CTA buttons | Standardized Header with Breadcrumbs & Action Bar | **EXACT MATCH** | Consistent layout across all administrative and staff routes. |
| **KPI Metric Stat Cards** | 4-column card grid with category background badges and numeric trend indicators | Metric Cards with accent pills, icons, and live counts | **EXACT MATCH** | Zero static placeholders; values calculated directly from database records. |
| **Modal & Drawer Forms** | Two-column responsive modal dialogs with validation error hints | Radix Dialog with auto-scrolling form body and sticky footer | **EXACT MATCH** | Clear cancellation vs submission states with pending spinners. |
| **Action Dropdowns** | Three-dot vertical ellipsis menu (`ti-dots-vertical` / `MoreVertical`) | Radix DropdownMenu (`Edit`, `Toggle Status`, `Delete`) | **EXACT MATCH** | Identical context menu actions per row. |

---

## 2. Screen-by-Screen UI Comparison Matrix

| Screen Category | Laravel Page Reference | Target React Route | Key Visual Features | Parity Status |
|:---|:---|:---|:---|:---:|
| **Dashboard** | `pages/dashboard.tsx` | `src/routes/_authenticated/_app/dashboard.tsx` | Live employee attendance pie, recruitment pipeline, revenue counters, quick actions | **COMPLETE** |
| **Employee Dashboard** | `pages/employee-dashboard.tsx`| `src/routes/_authenticated/_app/employee-dashboard.tsx` | Clock-in clock-out punch clock, leave quota cards, announcements, task summary | **COMPLETE** |
| **Employees List** | `pages/hr/employees/index.tsx` | `src/routes/_authenticated/_app/employees.tsx` | Table & grid switcher, department filtering, export to excel, employee passport drawer | **COMPLETE** |
| **Attendance Matrix** | `pages/hr/attendance-records/monthly.tsx` | `src/routes/_authenticated/_app/attendance-employee.tsx` | 31-day visual calendar grid, colored status dots (P=green, A=red, L=yellow, H=blue) | **COMPLETE** |
| **Shift Management** | `pages/hr/shifts/index.tsx` | `src/routes/_authenticated/_app/shifts.tsx` | Shift timing badges, grace periods, employee roster view, shift swap requests | **COMPLETE** |
| **Leave Management** | `pages/hr/leave-applications/index.tsx` | `src/routes/_authenticated/_app/leave.tsx` | Leave entitlement balance cards, multi-day calendar, manager approval action buttons | **COMPLETE** |
| **Payroll Runs** | `pages/hr/payroll-runs/index.tsx` | `src/routes/_authenticated/_app/payroll.tsx` | Monthly batch run selector, gross/deductions/net breakdown, lock run confirmation | **COMPLETE** |
| **Recruitment (ATS)**| `pages/hr/recruitment/job-postings/index.tsx`| `src/routes/_authenticated/_app/recruitment.tsx` | Pipeline Kanban cards, candidate drag-and-drop, interview schedule modal | **COMPLETE** |
| **Performance (OKR)**| `pages/hr/performance/indicators/index.tsx` | `src/routes/_authenticated/_app/okr.tsx` | Progress ring charts, key results checklist, quarterly cycle review dialogue | **COMPLETE** |
| **Global Task Board** | `pages/meetings/action-items/index.tsx` | `src/routes/_authenticated/_app/task-board.tsx` | 6 Kanban columns (`To Do`, `Pending`, `Inprogress`, `On-hold`, `Review`, `Completed`) | **COMPLETE** |
| **Companies (SaaS)** | `pages/companies/index.tsx` | `src/routes/_authenticated/_app/companies.tsx` | Tenant subdomain badges, plan tier pills, active/suspended switcher, reset password modal | **COMPLETE** |
| **Plans & Pricing** | `pages/plans/index.tsx` | `src/routes/_authenticated/_app/super/plans.tsx` | Monthly/annual switcher, plan feature checks, upgrade modal, order confirmation | **COMPLETE** |
| **Settings Suite** | `pages/settings/index.tsx` | `src/routes/_authenticated/_app/settings.tsx` | Tabbed settings navigation (System, Brand, Email, Currencies, Working Days, Webhooks) | **COMPLETE** |
| **Custom Fields** | `ui-2/custom-fields.html` | `src/routes/_authenticated/_app/custom-fields.tsx` | Module filter, field type badges, required pills, add/edit modal with dynamic options | **COMPLETE** |
| **Marketing Campaigns** | `ui/campaigns.html` | `src/routes/_authenticated/_app/campaigns.tsx` | 3 tabs (Active, Completed, Archived), KPI cards, offcanvas drawer, CSV/Excel & PDF export | **COMPLETE** |
| **Users & Reset Password** | `pages/users/index.tsx` | `src/routes/_authenticated/super/users.tsx` | Min 8 chars validation, confirmation check, direct login history drawer button per row | **COMPLETE** |
| **Login History Inspector** | `pages/users/login-history.tsx` | `src/routes/_authenticated/super/users.tsx` | Full-width audit table: avatar, IP, timestamp, device/browser details, search & delete | **COMPLETE** |
| **Database Backup** | `pages/settings/backup.tsx` | `src/routes/_authenticated/super/backup.tsx` | Real file listing, live dump progress generator, authenticated stream download, deletion | **COMPLETE** |
| **Phrase Editor** | `pages/languages/index.tsx` | `src/routes/_authenticated/super/languages.tsx` | Language switcher, live search, 30-item pagination, inline translation inputs, add language modal | **COMPLETE** |
| **CMS FAQs Studio** | `pages/cms/faqs/index.tsx` | `src/routes/_authenticated/super/cms.tsx` | Category filters, question/answer dialog, active status toggle, drag/order buttons | **COMPLETE** |
| **CMS Testimonials** | `pages/cms/testimonials/index.tsx` | `src/routes/_authenticated/super/cms.tsx` | Star ratings (1-5), customer avatar & role, review quote, active toggle, reordering | **COMPLETE** |

---

## 3. UI Parity Conclusion
The React target implementation replicates the full corporate ERP density, color tokens, responsive behaviors, modal workflows, and iconography of the Laravel source code without simplification or compromise.
