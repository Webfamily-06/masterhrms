# PHASE B — COMPLETE UI MAPPING SPECIFICATION

**Source Application:** WorkDo Enterprise SaaS ERP (Laravel 12 + Inertia.js + React 18)  
**Target Platform:** React 18 + Vite + TanStack Router + Tailwind CSS (`src/routes/`)  
**Status:** Phase B UI Mapping Complete — Zero Code Modification Executed  

---

## 1. COMPREHENSIVE UI PAGE & COMPONENT MAPPING TABLE

Below is the complete UI mapping from the Laravel Inertia React source pages (`main-file/resources/js/pages/` and `main-file/packages/workdo/*/src/Resources/js/pages/`) to the target React TanStack routes (`src/routes/_authenticated/_app/`):

| # | Laravel Source Screen & File Path | Target React TanStack Route (`src/routes/`) | Layout & Component Structure | Forms, Fields & Interaction Pattern | Target UI Status |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | `SuperAdminDashboard.tsx` | `_authenticated/_app/super-admin.tsx` | KPI Header Cards, Subscription Growth Chart, Active Tenants Table, Plan Allocation Donut | Search tenant, Filter by status/plan, Actions dropdown (`Impersonate`, `Assign Plan`, `Suspend`). | Mapped |
| **2** | `dashboard.tsx` (Tenant Admin) | `_authenticated/_app/dashboard.tsx` | Enterprise ERP Dashboard, Revenue/Expense Charts, Attendance Card, Quick Actions | Quick Links (`Add Employee`, `New Invoice`, `Create Ticket`), Date Range Picker. | Mapped |
| **3** | `users/Index.tsx` | `_authenticated/_app/users.tsx` | Tenant User Management Grid & Admin Hub Passport Drawer | User Form: Name, Email, Role Select, Password, Status Toggle, Impersonation Trigger. | Mapped |
| **4** | `plans/Index.tsx` | `_authenticated/_app/plans.tsx` | SaaS Subscription Plans Grid & Billing Cards | Plan Form: Name, Price, Trial Days, User/Storage Limits, Module Checkboxes, Coupon Code field. | Mapped |
| **5** | `modules/Index.tsx` | `_authenticated/_app/add-ons.tsx` | Add-on Marketplace Grid, Module Badges, Zip Upload Modal | Install Addon Modal, Module Enable/Disable Toggle Switch, Price Override Input. | Mapped |
| **6** | `settings/Index.tsx` | `_authenticated/_app/settings.tsx` | Tabbed Settings (Brand, Company, System, Currency, Mail, Pusher, AI Agent) | Brand Upload (Logo/Favicon), Currency Symbol, SMTP Test Email Modal, AI Provider API Keys. | Mapped |
| **7** | `helpdesk/Index.tsx` | `_authenticated/_app/helpdesk.tsx` | Support Tickets Data Table, Category Tabs, Ticket Thread Drawer | Ticket Form: Subject, Priority (Urgent/High/Normal), Category, File Upload. Reply Box + File Attachment. | Mapped |
| **8** | `messenger/Index.tsx` | `_authenticated/_app/chat.tsx` | Split-Pane Realtime Chat (Contacts List, Direct Message History, User Presence) | Rich Text Message Input, File Attachment, Favorite Star Toggle, Pinned Messages Drawer. | Mapped |
| **9** | `Sales/Index.tsx` (Sales Invoices) | `_authenticated/_app/sales-invoices.tsx` | Sales Invoices Table, Status Badges (`Draft`/`Sent`/`Paid`/`Overdue`), Print Modal | Invoice Form: Customer Select, Issue Date, Due Date, Warehouse Products Line Items, Tax/Discount Calc. | Mapped |
| **10** | `Purchase/Index.tsx` (Purchase Bills) | `_authenticated/_app/purchase-invoices.tsx` | Vendor Purchase Bills Data Grid, Post to Stock Action Button | Bill Form: Vendor Select, Bill Date, Warehouse Select, Items Array (Qty, Unit Price, Tax Rate). | Mapped |
| **11** | `SalesProposals/Index.tsx` | `_authenticated/_app/crm/proposals.tsx` | CRM Sales Proposals Data Grid, Convert to Invoice Action | Proposal Form: Customer, Expiry Date, Warehouse Items, Terms & Conditions, Acceptance Signature. | Mapped |
| **12** | `Hrm/Employees/Index.tsx` | `_authenticated/_app/employees.tsx` | Employee Master Table (Filter by Dept/Designation), Employee Passport Drawer | Form: Personal Info, Employee Code, Joined Date, Salary, Bank Account/IFSC, PAN/Aadhaar/UAN/ESI. | Mapped |
| **13** | `Hrm/Attendances/Index.tsx` | `_authenticated/_app/attendance.tsx` | Monthly Attendance Grid, Punch Log Viewer, Biometric Device Status Card | Attendance Adjustment Form: Employee, Date, Clock In, Clock Out, Status (`Present`/`Late`/`Half Day`). | Mapped |
| **14** | `Hrm/LeaveApplications/Index.tsx` | `_authenticated/_app/leave.tsx` | Leave Requests Table, Leave Balance Cards, Multi-level Approval Modal | Leave Form: Leave Type, Start/End Date, Reason, Attachment. Approve/Reject Action Buttons. | Mapped |
| **15** | `Hrm/Payrolls/Index.tsx` | `_authenticated/_app/payroll.tsx` | Monthly Payroll Run Summary, Payslip Table, PDF Download Modal | Process Payroll Form: Month/Year, Bulk Allowance/Deduction Review, Generate Payslips Button. | Mapped |
| **16** | `Hrm/Announcements/Index.tsx` | `_authenticated/_app/announcements.tsx` | Company Broadcast Cards, Pinned Memos, Digital Signature Acknowledgement Modal | Announcement Form: Title, Category, Priority, Pin Toggle, Target Dept, Acknowledgement Required. | VERIFIED |
| **17** | `Account/ChartOfAccounts/Index.tsx` | `_authenticated/_app/accounting.tsx` | Tree-view Chart of Accounts, Double-entry Journal Entry Table | Journal Form: Entry Date, Ref No, Debits Array, Credits Array (Enforces Debit = Credit balance). | Mapped |
| **18** | `Pos/Pos/Index.tsx` (POS Terminal) | `_authenticated/_app/pos.tsx` | Full-Screen Barcode POS Layout, Product Grid, Order Cart Summary, Thermal Receipt | Customer Select, Barcode Scanner Input, Quantity Counter, Payment Split (Cash/Card), Print Invoice. | Mapped |
| **19** | `Taskly/Project/Index.tsx` | `_authenticated/_app/projects.tsx` | Project Cards Grid, Kanban Task Board (`Todo`/`In Progress`/`Review`/`Done`), Gantt View | Project Form: Title, Client, Dates, Budget, Assignees. Task Modal: Description, Subtasks, Bug Tracker. | Mapped |
| **20** | `Lead/Leads/Index.tsx` | `_authenticated/_app/crm/leads.tsx` | Drag-and-Drop Pipeline Kanban Board, Lead Conversion Modal | Lead Form: Name, Email, Phone, Company, Value, Stage, Source. Convert to Deal/Invoice Trigger. | Mapped |

---

## 2. UI DESIGN & COMPONENT PARITY GUARANTEES

To ensure 100% visual and interaction parity without breaking the target application's AppShell:
1. **Compact ERP Information Density:** Replicate the high-density table views with sticky headers, pagination controls (`parsePaginationParams`), column sorting, and instant search inputs.
2. **Modal & Drawer Passports:** Standardize all slide-over drawers (e.g. Employee Passport, Ticket Reply Thread, Lead Details) using Radix UI Dialog / Drawer components.
3. **Status Badges & Colors:** Preserve status color coding across modules:
   - Green: `Active`, `Paid`, `Approved`, `Completed`, `Done`.
   - Yellow/Orange: `Pending`, `Draft`, `In Progress`, `On Hold`.
   - Red: `Suspended`, `Overdue`, `Rejected`, `Terminated`, `Urgent`.
4. **Zero Placeholder Screens:** Every visible button, modal trigger, export option, and form submission MUST connect to live backend Express API endpoints.
