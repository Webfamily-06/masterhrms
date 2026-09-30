# PHASE B — RECOMMENDED MIGRATION WAVE PLAN & ACCEPTANCE CRITERIA

**Source Application:** WorkDo Enterprise SaaS ERP (`main-file/`)  
**Target Platform:** React 18 + Node.js/Express + Prisma 5 SaaS (`/`)  
**Status:** Phase B Migration Wave Plan Complete — Recommended Implementation Order Established  

---

## 1. RECOMMENDED IMPLEMENTATION ORDER & WAVE SCHEDULE

Based on the module dependency audit, features MUST be migrated in strict prerequisite sequence. No downstream module (e.g. Sales Invoices or POS) can be migrated before its underlying prerequisites (Core Auth, Tenant Isolation, Product Catalog, Accounting Ledger) are verified.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WAVE 1: Core SaaS Framework & Control Plane (Prerequisite Baseline)        │
│ Modules: Tenant Impersonation, Plan Management, Addon Engine, Settings       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WAVE 2: Human Resource Management System (HRMS)                             │
│ Modules: Employee Master, Attendance, Leave Management, Payroll Runs        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WAVE 3: Products, Inventory, Accounting & POS ERP                           │
│ Modules: Catalog & Warehouses, Chart of Accounts, Invoices, POS Checkout    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WAVE 4: CRM Sales Funnel & Taskly Project Management                        │
│ Modules: Leads, Deals, Proposals, Projects, Kanban Boards, Bug Tracking     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WAVE 5: Support, Realtime Communication & AI Assistance                    │
│ Modules: Helpdesk Ticketing, Realtime Chat Messenger, AI Agent Assistant    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. WAVE-BY-WAVE EXECUTION SPECIFICATIONS

### Wave 1: Core SaaS Framework & Control Plane
* **Modules Included:** Admin Hub & Tenant Impersonation, Subscription Plans, Addon Marketplace Engine, System Settings (Brand, Currency, SMTP, Pusher).
* **Dependencies:** Core Auth & Dynamic Prisma Proxy Facade (Completed in Phase 1 Step 4).
* **Risk Rating:** Low / Foundation.
* **Testing Requirements:** Verify super admin impersonation JWT issuance, red floating banner rendering, plan assignment, add-on entitlement checks (`requireAddon`), and brand settings persistence.
* **Acceptance Criteria:** Super admin can seamlessly impersonate any active tenant and configure marketplace add-ons with 100% tenant isolation.

---

### Wave 2: Human Resource Management System (HRMS)
* **Modules Included:** Employee Master (Statutory PAN/Aadhaar/UAN/ESI + Bank details), Attendance Roster & Punch Sync, Leave Applications & Approval Workflow, Monthly Payroll Processing & Payslips.
* **Dependencies:** Wave 1 Core SaaS Framework.
* **Risk Rating:** Medium / High Compliance.
* **Testing Requirements:** Validate employee code uniqueness within tenant, leave balance deductions, formula-based statutory tax deductions (PF/ESI/PT/TDS), payslip PDF rendering.
* **Acceptance Criteria:** Full HR lifecycle from employee creation to payroll calculation and payslip export operates with 100% data persistence and formula accuracy.

---

### Wave 3: Products, Inventory, Accounting & POS ERP
* **Modules Included:** Product & Services Catalog, Warehouse Stock Management, Chart of Accounts & Double-Entry Journal Entries, Sales Invoices, Purchase Bills, POS Barcode Checkout.
* **Dependencies:** Wave 1 Core SaaS Framework.
* **Risk Rating:** High Financial & Inventory Risk.
* **Testing Requirements:** Validate double-entry journal balance rule (`Sum(Debits) === Sum(Credits)`), warehouse stock decrement on POS/Invoice checkout, thermal receipt printing.
* **Acceptance Criteria:** POS sale scans barcode, decrements warehouse inventory count, creates sales invoice, and posts double-entry journal entry to general ledger.

---

### Wave 4: CRM Sales Funnel & Taskly Project Management
* **Modules Included:** CRM Lead Pipeline Kanban, Deal Stages, Custom Sales Proposals, Project Master, Task Kanban Board, Gantt Chart, Bug Tracking.
* **Dependencies:** Wave 1 Framework & Wave 3 Product Catalog.
* **Risk Rating:** Medium.
* **Testing Requirements:** Validate drag-and-drop lead/deal stage movements, proposal conversion into sales invoices, task stage transitions, milestone billing.
* **Acceptance Criteria:** Sales proposal accepted by customer converts into a Sales Invoice with line items intact; project tasks drag and drop cleanly on Kanban board.

---

### Wave 5: Support, Realtime Communication & AI Assistance
* **Modules Included:** Helpdesk Support Ticketing & Replies, Realtime Chat Messenger (WebSockets), AI Assistant Chat Sessions.
* **Dependencies:** Wave 1 Framework & Wave 2 HRMS (Employee identities).
* **Risk Rating:** Low / Feature Polish.
* **Testing Requirements:** Test Pusher WebSockets message delivery, ticket status transitions (`Open` -> `Closed`), OpenAI/Anthropic API assistant responses.
* **Acceptance Criteria:** Support agents reply to tickets with file attachments; users chat in real time via WebSockets with online presence indicators.
