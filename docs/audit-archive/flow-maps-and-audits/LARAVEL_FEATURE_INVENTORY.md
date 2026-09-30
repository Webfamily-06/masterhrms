# LARAVEL FEATURE INVENTORY & FUNCTIONAL SPECIFICATION

**Source Application:** WorkDo Enterprise SaaS ERP (Laravel 12 + Inertia.js + React)  
**Target Platform:** React 18 + Node.js/Express + Prisma 5 Multi-Tenant SaaS  
**Status:** Complete Feature Inventory Audit — Phase A  

---

## 1. CORE PLATFORM & SUPER ADMIN MODULES

### Module 1.1: Super Admin & SaaS Tenant Control Plane
* **Pages & Screens:** Dashboard (`/dashboard`), Tenant Users (`/users`), Tenant Admin Hub (`/users/{user}/admin-hub`), Impersonation Banner, Login History (`/users/login/history`).
* **User Roles:** `super_admin`
* **Navigation Flow:** Top Header / Sidebar -> Admin Hub -> Manage Tenants -> Impersonate / Assign Plan / Suspend.
* **Forms & Fields:**
  - Create/Edit Tenant: Name, Email, Password, Subdomain/Slug, Assign Subscription Plan, Max Employees, Max Storage.
  - Assign Plan Form: Plan Selection, Expiry Date, Custom Addons, Price Override.
* **Buttons & Actions:** `Create Tenant`, `Impersonate Tenant`, `Leave Impersonation`, `Toggle Tenant Status (Active/Suspended)`, `Assign Plan`, `Reset Password`, `Export Login Logs`.
* **Business Rules:**
  - Super admin can impersonate any tenant admin; impersonation session sets session state and renders floating red banner.
  - Suspended tenants block login and return HTTP 403 `WORKSPACE_SUSPENDED`.
* **Database Tables:** `users`, `plans`, `orders`, `login_histories`, `user_active_modules`, `add_ons`.

---

### Module 1.2: Subscription Plans & Add-on Marketplace
* **Pages & Screens:** Subscription Plans (`/plans`), Add-on Marketplace (`/add-ons`), Upload Add-on (`/add-on/upload`), Subscribe (`/plans/{plan}/subscribe`), Coupons (`/coupons`).
* **User Roles:** `super_admin`, `tenant_admin`
* **Forms & Fields:**
  - Plan Form: Name, Price, Duration (Monthly/Annual), Max Users, Max Employees, Max Storage (MB), Module Entitlements, Enable Trial, Trial Days.
  - Coupon Form: Code, Discount Type (Percentage/Flat), Discount Amount, Expiry Date, Max Uses.
* **Buttons & Actions:** `Create Plan`, `Start Free Trial`, `Apply Coupon`, `Purchase Plan`, `Upload Module Zip`, `Enable/Disable Add-on`, `Remove Active Module`.
* **Business Rules:**
  - Addon modules can be toggled per tenant; missing addon access throws HTTP 403 `ADDON_ENTITLEMENT_REQUIRED`.
  - Coupon code redemption validates usage count and expiry before applying discount.
* **Database Tables:** `plans`, `coupons`, `orders`, `user_coupons`, `add_ons`, `user_active_modules`.

---

### Module 1.3: Helpdesk & Customer Support Ticketing
* **Pages & Screens:** Tickets List (`/helpdesk-tickets`), Today's Tickets (`/helpdesk-ticket/today`), Ticket Details (`/helpdesk-tickets/{id}`), Ticket Categories (`/helpdesk-categories`).
* **User Roles:** `super_admin`, `tenant_admin`, `employee`, `customer`
* **Forms & Fields:**
  - Ticket Form: Ticket Code (Auto-generated `TICK-XXXX`), Subject, Category, Priority (Low/Medium/High/Urgent), Description, Attachments.
  - Reply Form: Reply Message, Status Change (Open/In Progress/On Hold/Resolved/Closed), File Attachments.
* **Buttons & Actions:** `Create Ticket`, `Post Reply`, `Change Priority`, `Close Ticket`, `Delete Reply`, `Export Tickets`.
* **Workflow States:** `open` -> `in_progress` -> `on_hold` -> `resolved` -> `closed`.
* **Database Tables:** `helpdesk_tickets`, `helpdesk_categories`, `helpdesk_replies`.

---

## 2. ERP ADDON MODULES (`packages/workdo/*`)

### Module 2.1: Human Resource Management (HRM Addon — `packages/workdo/Hrm`)
* **Pages & Screens:** Employees List, Create/Edit Employee, Attendance Roster, Leave Requests, Payroll Processing, Payslip PDF View, Department/Designation Setup, Company Policies, Holidays, Announcements, Awards, Complaints, Resignations, Terminations, Promotions, Transfers.
* **User Roles:** `hr_admin`, `manager`, `employee`
* **Forms & Fields:**
  - Employee Master Form: Personal Details, Employee Code, Joined Date, Department, Designation, Manager, Salary, Bank Account/IFSC, Statutory Identifiers (PAN, Aadhaar, UAN, ESI), Tax Regime.
  - Leave Application: Leave Type, Start Date, End Date, Reason, Attachment.
  - Payroll Run: Month/Year Selection, Tax Deductions, Allowances, Net Salary Calculation.
* **Workflow States:**
  - Leave Request: `pending` -> `approved` / `rejected`.
  - Payroll: `draft` -> `processing` -> `completed` -> `paid`.
  - Employee Exit: `notice_period` -> `clearance` -> `terminated`.
* **Database Tables:** `employees`, `attendance`, `leave_applications`, `leave_types`, `payrolls`, `payroll_entries`, `allowances`, `deductions`, `departments`, `designations`, `branches`, `holidays`, `announcements`, `acknowledgments`, `company_policies`, `awards`, `complaints`, `resignations`, `terminations`, `promotions`, `employee_transfers`.

---

### Module 2.2: Accounting & Financial ERP Addon (`packages/workdo/Account`)
* **Pages & Screens:** Chart of Accounts, Bank Accounts, Bank Transactions, Double-Entry Journal Entries, Revenues, Expenses, Customer Payments, Vendor Payments, Credit Notes, Debit Notes, Financial Reports (Trial Balance, P&L, Balance Sheet).
* **User Roles:** `accountant`, `tenant_admin`
* **Forms & Fields:**
  - Chart of Account Form: Account Code, Account Name, Account Type (Asset/Liability/Equity/Income/Expense), Parent Account.
  - Journal Entry Form: Entry Date, Reference No, Debit Items (Account, Amount), Credit Items (Account, Amount) — Must Balance!
  - Customer Payment Form: Customer, Payment Date, Amount, Payment Method, Deposit Account, Allocate to Invoices.
* **Business Rules:**
  - Double-entry constraint: Total Debits MUST equal Total Credits before posting journal entries.
  - Credit/Debit note application reduces open invoice balance dynamically.
* **Database Tables:** `chart_of_accounts`, `account_types`, `account_categories`, `bank_accounts`, `bank_transactions`, `journal_entries`, `journal_entry_items`, `revenues`, `expenses`, `customer_payments`, `vendor_payments`, `credit_notes`, `debit_notes`.

---

### Module 2.3: Point of Sale & Inventory Addon (`packages/workdo/Pos`)
* **Pages & Screens:** POS Terminal Screen, Cash Register Shift, Sales Invoices (`/sales-invoices`), Purchase Bills (`/purchase-invoices`), Sales Returns (`/sales-returns`), Purchase Returns (`/purchase-returns`), Warehouse Stock Transfers (`/transfers`), Warehouses (`/warehouses`).
* **User Roles:** `cashier`, `warehouse_manager`, `tenant_admin`
* **Forms & Fields:**
  - POS Checkout Screen: Barcode Scanner Input, Customer Selection, Product Grid, Quantity Adjuster, Tax Calculation, Discount Rate/Coupon, Payment Method (Cash/Card/Bank/Split), Thermal Print Button.
  - Stock Transfer Form: From Warehouse, To Warehouse, Product List, Quantities, Transfer Date, Notes.
* **Workflow States:**
  - Sales Return: `pending` -> `approved` -> `completed` (Restocks product to warehouse).
  - Register Shift: `open` -> `reconciled` -> `closed`.
* **Database Tables:** `pos`, `pos_items`, `pos_payments`, `pos_discounts`, `pos_billing_counters`, `pos_returns`, `sales_invoices`, `sales_invoice_items`, `purchase_invoices`, `purchase_invoice_items`, `transfers`, `warehouses`, `warehouse_stocks`.

---

### Module 2.4: Project Management Addon (`packages/workdo/Taskly`)
* **Pages & Screens:** Project Grid/List, Project Detail Dashboard, Kanban Task Board, Gantt Chart, Milestones, Bug Tracking Board, Task Details Modal, Project Payment Invoices.
* **User Roles:** `project_manager`, `developer`, `client`
* **Forms & Fields:**
  - Project Form: Title, Client, Start Date, End Date, Budget, Priority, Assign Team Members, Status.
  - Task Form: Title, Project, Milestone, Assignee, Priority, Due Date, Estimated Hours, Description, Attachments.
  - Bug Form: Title, Bug Stage (Unconfirmed/Confirmed/In Progress/Fixed/Closed), Severity, Description.
* **Workflow States:** Task Stages (`todo` -> `in_progress` -> `review` -> `done`).
* **Database Tables:** `projects`, `project_users`, `project_clients`, `project_tasks`, `task_stages`, `task_comments`, `task_subtasks`, `project_milestones`, `project_bugs`, `bug_stages`, `activity_logs`.

---

### Module 2.5: CRM & Sales Funnel Addon (`packages/workdo/Lead`)
* **Pages & Screens:** Lead Pipeline Kanban (`/leads`), Deal Pipeline Kanban (`/deals`), Proposals (`/sales-proposals`), Lead Details Drawer, Deal Conversion Modal.
* **User Roles:** `sales_agent`, `sales_manager`
* **Forms & Fields:**
  - Lead Form: Name, Email, Phone, Company, Pipeline, Stage, Lead Value, Source, Notes.
  - Proposal Form: Customer, Issue Date, Expiry Date, Warehouse Products / Services List, Tax Rates, Discount, Terms & Conditions.
* **Workflow States:**
  - Lead: `new` -> `contacted` -> `qualified` -> `converted_to_deal` / `lost`.
  - Proposal: `draft` -> `sent` -> `accepted` / `rejected` -> `converted_to_invoice`.
* **Database Tables:** `leads`, `lead_stages`, `deals`, `deal_stages`, `pipelines`, `sources`, `sales_proposals`, `sales_proposal_items`.

---

### Module 2.6: Products & Services Catalog Addon (`packages/workdo/ProductService`)
* **Pages & Screens:** Product Catalog, Services List, Product Categories, Units of Measure, Tax Rates Setup.
* **Forms & Fields:** Product SKU, Name, Type (Product/Service), Purchase Price, Sale Price, Category, Unit, Tax Rate, Image, Initial Stock.
* **Database Tables:** `product_service_items`, `product_service_categories`, `product_service_units`, `product_service_taxes`, `warehouse_stocks`.
