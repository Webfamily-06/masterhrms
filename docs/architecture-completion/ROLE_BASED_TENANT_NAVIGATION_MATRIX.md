# Role-Based Tenant Navigation Matrix: MASTERHRMS

**Document Reference:** `DOC-ARCH-TENANT-MATRIX-010`  
**Registry Source:** `TENANT_NAVIGATION_REGISTRY` in `src/nav/registry.ts`  
**Role Target:** Tenant Administrator (`tenant_admin` / `Workspace Admin`)  

---

## 1. Complete Registry Inventory

The following table provides the exhaustive definition of every item in `TENANT_NAVIGATION_REGISTRY`:

| Group Heading | Menu Label | Path / Route | Icon | Order | Submenu Children |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **1. Dashboard** | Dashboard | `/tenant/dashboard` | `LayoutDashboard` | 10 | *None (Direct Link)* |
| **2. Unmapped Pages** | Unmapped Pages | `/ai-business-advisor` | `Layers` | 20 | 1. AI Business Advisor (`/ai-business-advisor`)<br>2. Smart Analytics Dashboard (`/smart-dashboard`)<br>3. Company Notice Board (`/notice-board`)<br>4. Workspace Time Tracker (`/time-tracker`)<br>5. Asset Management (`/assets`)<br>6. OKR & Strategic Goals (`/okr`)<br>7. PESTEL Strategic Analysis (`/pestel`) |
| **3. Workspace** | Calendar | `/tenant/calendar` | `Calendar` | 30 | *None (Direct Link)* |
| | Todo | `/tenant/todo` | `CheckSquare` | 31 | *None (Direct Link)* |
| | Gantt | `/tenant/todo/gantt` | `BarChartHorizontal`| 32 | *None (Direct Link)* |
| | Chat | `/tenant/chat` | `MessageSquare` | 33 | 1. Personal Chat (`/tenant/chat?tab=personal`)<br>2. Chat Groups (`/tenant/chat/groups`)<br>3. Chat Contacts (`/tenant/chat/contacts`)<br>4. Call Logs (`/tenant/chat/calls`) |
| | File Manager | `/tenant/file-manager` | `FolderLock` | 34 | *None (Direct Link)* |
| **4. Company Profile** | Company Profile | `/tenant/company-profile` | `Building2` | 40 | *None (Direct Link)* |
| **5. Organization Structure**| Organization Structure| `/tenant/organization` | `GitBranch` | 50 | *Interactive Org Tree* |
| **6. Users** | Users | `/tenant/users` | `Users` | 60 | *None (Direct Link)* |
| **7. Roles and Permissions**| Roles and Permissions| `/tenant/roles` | `ShieldCheck` | 70 | *None (Direct Link)* |
| **8. Add-on Store & Integrations**| Add-on Store & Integrations| `/tenant/modules`| `Boxes` | 80 | *None (Direct Link)* |
| **9. Subscription & Billing**| Plan and Usage | `/tenant/subscription` | `CreditCard` | 90 | *None (Direct Link)* |
| | Billing and Invoices | `/tenant/billing` | `Receipt` | 91 | *None (Direct Link)* |
| **10. Configuration** | Branding | `/tenant/branding` | `Sparkles` | 100 | *None (Direct Link)* |
| | Settings | `/tenant/settings` | `Settings` | 101 | *None (Direct Link)* |
| | Domain | `/tenant/domain` | `Globe` | 102 | *None (Direct Link)* |
| | Integrations | `/tenant/integrations` | `Cpu` | 103 | *None (Direct Link)* |
| | Biometric Hardware Hub | `/biometric-sync` | `Fingerprint` | 104 | 1. Terminal Overview (`/biometric-sync?tab=overview`)<br>2. Cloud ADMS Setup (`/biometric-sync?tab=adms`)<br>3. Employee Mapping (`/biometric-sync?tab=employees`)<br>4. Punch Audit Logs (`/biometric-sync?tab=logs`)<br>5. Diagnostics & DLLs (`/biometric-sync?tab=diagnostics`) |
| | Data Management | `/tenant/data` | `Database` | 105 | *None (Direct Link)* |
| | Audit Logs | `/tenant/audit-logs` | `FileSearch` | 106 | *None (Direct Link)* |
| | Support | `/tenant/support` | `HelpCircle` | 107 | *None (Direct Link)* |
| **11. Company Reports** | Company Reports | `/smart-reports` | `FileBarChart` | 110 | 1. Smart BI Reports (`/smart-reports`)<br>2. Daily Report (`/daily-report`)<br>3. Expenses Report (`/expenses-report`)<br>4. Sales Invoice Report (`/invoice-report`)<br>5. Payment Report (`/payment-report`)<br>6. Project Progress Report (`/project-report`) |

---

## 2. Cross-Portal Isolation Comparison

| Attribute | Tenant Portal (`/tenant/*`) | HR Operations Portal (`/hr/*`) | Employee Portal (`/me/*`) |
| :--- | :--- | :--- | :--- |
| **Target Role** | Tenant Admin (`tenant_admin`) | HR Lead (`hr_admin`) | Employee (`employee`) |
| **Primary Focus** | Corporate governance, users, roles, billing | Workforce management, payroll, leave | Personal self-service |
| **Allowed Routes** | `/tenant/*`, `/smart-reports`, `/biometric-sync` | `/hr/*` | `/me/*` |
| **Prohibited Routes**| `/hr/*`, `/me/*`, `/super/*` | `/tenant/*`, `/me/*`, `/super/*` | `/tenant/*`, `/hr/*`, `/super/*` |
| **Guard Enforcement**| `evaluateRouteAccess({ targetPortal: "tenant" })` | `evaluateRouteAccess({ targetPortal: "hr" })` | `evaluateRouteAccess({ targetPortal: "me" })` |
