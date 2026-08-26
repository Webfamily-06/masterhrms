# MASTER WORKSPACE
# GLOBAL ERP SaaS ARCHITECTURE & MODULE DEVELOPMENT CONSTITUTION

## PURPOSE

This document is the permanent architectural contract for the entire Master Workspace multi-tenant ERP SaaS application.

Every future module, addon, feature, workflow, page, API, database change, subscription feature, payment feature, Super Admin feature, or integration MUST follow this document.

This document exists to prevent architectural inconsistency when modules are developed at different times by AI agents or developers.

---

# 1. ABSOLUTE RULE

Before implementing any new module:

1. Inspect the existing architecture.
2. Inspect existing database schema.
3. Inspect existing APIs.
4. Inspect existing authentication.
5. Inspect tenant isolation.
6. Inspect RBAC and permissions.
7. Inspect subscription architecture.
8. Inspect billing architecture.
9. Inspect existing UI components.
10. Inspect navigation architecture.
11. Inspect existing audit logging.
12. Inspect existing notification system.
13. Inspect existing file storage.
14. Inspect existing settings/configuration system.
15. Inspect existing reusable services.

DO NOT immediately start coding.
First determine what already exists.

---

# 2. NEVER INVENT A SECOND ARCHITECTURE

If an existing architecture already solves a problem:
USE IT.

Do not create:
* Another authentication system
* Another tenant system
* Another user table
* Another permission system
* Another billing system
* Another invoice system
* Another notification system
* Another file storage system
* Another audit log system
* Another API response format
* Another UI design system

unless the existing architecture is explicitly proven insufficient.
If a change is necessary, extend the existing architecture instead of creating a parallel architecture.

---

# 3. MODULE DEVELOPMENT CONTRACT

Every module MUST be developed through the same lifecycle:

```text
PHASE 01: Architecture Audit
        ↓
PHASE 02: Requirements & Gap Analysis
        ↓
PHASE 03: Database Architecture
        ↓
PHASE 04: API Architecture
        ↓
PHASE 05: Backend Implementation
        ↓
PHASE 06: Frontend / UI Implementation
        ↓
PHASE 07: RBAC & Security
        ↓
PHASE 08: Subscription / Entitlement Integration
        ↓
PHASE 09: Cross-Module Integration
        ↓
PHASE 10: Notifications / Audit Logs
        ↓
PHASE 11: Testing
        ↓
PHASE 12: Acceptance Verification
        ↓
PHASE 13: Architecture Lock
```

---

# 4. MASTER DEVELOPMENT SEQUENCE

```text
01. Master Architecture Audit
02. Super Admin Foundation
03. Tenant Management
04. User Management
05. RBAC / Permissions
06. System Settings
07. Audit Logs

08. Plans
09. Subscription
10. Payment Gateway
11. Billing Engine
12. Invoice Engine
13. User Billing Portal
14. Add-on Manager
15. Entitlement / Feature Flags

16. Organization
17. CRM
18. Products & Catalog
19. Sales
20. Purchase
21. Inventory
22. POS
23. Accounting & Ledger

24. HRMS Foundation
25. Employee Directory
26. Attendance
27. Leave
28. Payroll
29. Recruitment
30. Training
31. Expenses
32. Helpdesk
33. Documents
34. Onboarding
35. Offboarding
36. HR Analytics

37. OKR & Performance Add-on
38. Asset Management Add-on

39. Cross-module Automation
40. Notifications
41. Global Search
42. Global Reports
43. API / Developer Platform
44. Security Hardening
45. Performance Optimization
46. Final SaaS QA
```

---

# 5. DATABASE & API RULES

- **Tenant Isolation**: Every tenant-owned table must include `tenant_id`. Enforced at Backend, Query Layer, API, Exports, Search, and WebSockets.
- **Naming Standard**: `snake_case` tables (e.g. `employees`, `asset_assignments`, `okr_objectives`), `id` primary keys, `employee_id`, `tenant_id`, `user_id` foreign keys.
- **API Order**:
  `requireAuth` -> `Tenant Verification` -> `Permission Check` -> `Add-on Entitlement Check` -> `Business Logic` -> `Audit Activity Log`.
- **UI Standard**: Information density, typography consistency, Radix + Tailwind design tokens, compact tables, no mock/hardcoded values.
