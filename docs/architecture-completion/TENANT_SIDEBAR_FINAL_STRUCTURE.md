# Final Architecture: Tenant Portal Navigation & Sidebar Structure

**Document Reference:** `DOC-ARCH-TENANT-NAV-009`  
**Security Boundary:** Tenant Workspace (L1) — Company Admin Exclusive  
**Authority:** Approved Business & Technical Governance Rules  

---

## 1. Architectural Mandate: Strict Portal Boundary Separation

The MASTERHRMS Tenant Portal (`/tenant/*`) is **exclusively the Company Admin workspace**.

In strict conformance with enterprise multi-tenant boundary governance:
1. **Four Completely Separate Portals:**
   - **Platform Super Admin:** `/super/*`
   - **Tenant Administrator:** `/tenant/*` (Company Admin Workspace)
   - **HR Operations:** `/hr/*` (Workforce, Payroll, Recruitment, Exits)
   - **Employee Self-Service:** `/me/*` (Personal Attendance, Leaves, Payslips)
2. **Zero Cross-Portal Navigation in Tenant Sidebar:**
   - All `/hr/*` and `/me/*` routes are strictly excluded from the Tenant Sidebar.
   - The Tenant Sidebar contains zero links, submenus, shortcuts, or cross-portal switchers pointing to `/hr/*` or `/me/*`.
   - HR operations and employee personal self-service remain fully functional in their own dedicated portals without regression.
3. **Dedicated Position for Unmapped Pages:**
   - `Unmapped Pages` is positioned immediately below `Dashboard` (Position #2).

---

## 2. Final 11-Group Main Menu Order

The Tenant Sidebar is structured into exactly 11 main menu groups:

| Order | Main Menu Group | Icon | Primary Target Route | Description / Contained Items |
| :---: | :--- | :---: | :--- | :--- |
| **1** | **Dashboard** | `LayoutDashboard` | `/tenant/dashboard` | Main Company Admin operational KPI dashboard |
| **2** | **Unmapped Pages** | `Layers` | `/ai-business-advisor` | **Dedicated Main Menu immediately below Dashboard:**<br>• AI Business Advisor (`/ai-business-advisor`)<br>• Smart Analytics Dashboard (`/smart-dashboard`)<br>• Company Notice Board (`/notice-board`)<br>• Workspace Time Tracker (`/time-tracker`)<br>• Asset Management (`/assets`)<br>• OKR & Strategic Goals (`/okr`)<br>• PESTEL Strategic Analysis (`/pestel`) |
| **3** | **Workspace** | `Briefcase` | `/tenant/calendar` | **Shared Company Applications:**<br>• Calendar (`/tenant/calendar`)<br>• Todo (`/tenant/todo`)<br>• Gantt Timeline (`/tenant/todo/gantt`)<br>• Chat (`/tenant/chat`) *(Personal, Groups, Contacts, Calls)*<br>• File Manager (`/tenant/file-manager`) |
| **4** | **Company Profile** | `Building2` | `/tenant/company-profile` | Corporate legal entity, GST/PAN, registered address, billing identity |
| **5** | **Organization Structure**| `GitBranch` | `/tenant/organization` | Interactive company tree, branches, departments, designations |
| **6** | **Users** | `Users` | `/tenant/users` | Company employee account provisioning, logins, password/2FA resets |
| **7** | **Roles and Permissions**| `ShieldCheck`| `/tenant/roles` | RBAC matrix, custom workspace roles, module access permissions |
| **8** | **Add-on Store & Integrations** | `Boxes` | `/tenant/modules` | 4-column modern card marketplace, app drawer & category filters |
| **9** | **Subscription & Billing** | `CreditCard` | `/tenant/subscription` | **SaaS Subscription Governance:**<br>• Plan and Usage (`/tenant/subscription`)<br>• Billing and Invoices (`/tenant/billing`) |
| **10**| **Configuration** | `Settings` | `/tenant/settings` | **Company System Settings:**<br>• Branding (`/tenant/branding`)<br>• Settings (`/tenant/settings`)<br>• Custom Domain (`/tenant/domain`)<br>• Integrations (`/tenant/integrations`)<br>• Biometric Hardware Hub (`/biometric-sync`)<br>• Data Management (`/tenant/data`)<br>• Audit Logs (`/tenant/audit-logs`)<br>• Technical Support (`/tenant/support`) |
| **11**| **Company Reports** | `FileBarChart`| `/smart-reports` | **Company-Level Analytics & BI:**<br>• Smart BI Custom Reports (`/smart-reports`)<br>• Daily Overview Report (`/daily-report`)<br>• Operational Expenses Report (`/expenses-report`)<br>• Sales Invoice Aging Report (`/invoice-report`)<br>• Payment Collections Report (`/payment-report`)<br>• Project Progress Variance Report (`/project-report`) |

---

## 3. Strict Absence of HR & Employee Entries

Automated registry auditing confirms that the Tenant Navigation Registry contains:
- **0** links to `/hr/*`
- **0** links to `/me/*`
- **0** links to `/super/*`
- **0** cross-portal switcher buttons

Any attempts by unauthorized users or tampered client state to cross security boundaries are blocked at the route guard (`src/lib/route-guards.ts`) and backend middleware (`server/src/middleware/auth.ts`) levels.
