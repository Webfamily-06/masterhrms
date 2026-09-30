# PHASE B — MODULE DEPENDENCY MAP & INTERACTION MATRIX

**Source Application:** WorkDo Enterprise SaaS ERP (`main-file/`)  
**Target Platform:** React 18 + Node.js/Express + Prisma 5 SaaS (`/`)  
**Status:** Phase B Module Dependency Mapping Complete — Zero Code Modification Executed  

---

## 1. TECHNICAL DEPENDENCY GRAPH

```
                                  ┌─────────────────────────────────────────┐
                                  │ Core Auth, Tenant Isolation & Proxy     │
                                  │ (User, Tenant, JWT, TenantStorage,      │
                                  │  PrismaProxyFacade)                      │
                                  └────────────────────┬────────────────────┘
                                                       │
                     ┌─────────────────────────────────┴─────────────────────────────────┐
                     ▼                                                                   ▼
┌─────────────────────────────────────────┐                         ┌─────────────────────────────────────────┐
│ Subscription Plans & Add-on Engine      │                         │ Product & Services Catalog              │
│ (Plan, TenantAddon, requireAddon)       │                         │ (Product, Category, TaxRate, Warehouse) │
└────────────────────┬────────────────────┘                         └────────────────────┬────────────────────┘
                     │                                                                   │
       ┌─────────────┼──────────────────────────────┬──────────────────┐                 │
       ▼             ▼                              ▼                  ▼                 ▼
┌──────────────┐ ┌──────────────┐             ┌──────────────┐   ┌──────────────┐  ┌──────────────┐
│ HRMS Module  │ │ Accounting   │             │ CRM Module   │   │ Taskly App   │  │ POS Module   │
│ (Employee,   │ │ (ChartOfAcct,│             │ (Leads,      │   │ (Projects,   │  │ (Terminal,   │
│ Attendance,  │ │ JournalEntry,│             │ Deals,       │   │ Tasks, Bugs, │  │ Invoices,    │
│ Leave,       │ │ BankAccount, │             │ Proposals)   │   │ Milestones)  │  │ Returns,     │
│ Payroll)     │ │ Expenses)    │             └──────┬───────┘   └──────────────┘  │ StockSync)   │
└──────────────┘ └──────────────┘                    │                             └──────────────┘
                                                     ▼
                                           ┌──────────────────┐
                                           │ Sales Invoices   │
                                           │ & Proposals      │
                                           └──────────────────┘
```

---

## 2. DETAILED MODULE DEPENDENCY MATRIX

| Target Module Name | Prerequisite Dependencies | Dependent Downstream Modules | Dependency Rationale & Impact |
| :--- | :--- | :--- | :--- |
| **Core Auth & Multi-Tenancy** | None (Foundation Layer) | ALL Modules | Establishes `tenant_id` context, JWT verification, and ORM autoscoping via `prismaProxy`. |
| **Subscription & Addon Engine** | Core Auth & Multi-Tenancy | ALL ERP Addons | Controls module enablement per tenant; `requireAddon` checks entitlement before routing. |
| **Product & Services Catalog** | Core Auth, Addon Engine | Accounting, Sales Invoices, POS Terminal, CRM Proposals | Master product SKU, pricing, tax rates, and warehouse stock required for all transactional documents. |
| **HRMS Module** | Core Auth, Addon Engine | Payroll, Announcements, Helpdesk, Internal Chat | Employee master records provide employee identities for leave requests, payroll runs, ticket assignment, and chat. |
| **Accounting & Financial ERP** | Core Auth, Product Catalog | Sales Invoices, Purchase Bills, POS, Payroll | Double-entry journal accounts log automated financial postings from sales, purchases, payroll, and expenses. |
| **Sales Invoices & Purchases** | Product Catalog, Accounting, Customers/Vendors | Inventory Stock, Sales Returns, Accounts Receivable | Invoices deduct warehouse stock and post revenue journal entries into Chart of Accounts. |
| **CRM Leads & Proposals** | Product Catalog, Customers | Sales Invoices, Projects | Accepted proposals convert line items directly into Sales Invoices or new Taskly Projects. |
| **Taskly Projects & Tasks** | Core Auth, Customers, Employees | Billing, Project Invoices | Team members assigned to tasks; completed milestones trigger project payment invoices. |
| **POS Terminal & Checkout** | Product Catalog, Warehouses, Cash Registers | Sales Invoices, Inventory Movement | POS checkout scans product barcodes, adjusts warehouse stock, and logs cash register shift balances. |
| **Helpdesk & Chat Messenger** | Core Auth, Employees, Customers | Notifications, Audit Logs | Support tickets and chat messages reference employee/customer profile IDs and realtime WebSockets. |
