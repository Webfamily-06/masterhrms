# PHASE B — GAP & CONFLICT ANALYSIS REPORT

**Source Application:** WorkDo Enterprise SaaS ERP (`main-file/`)  
**Target Platform:** React 18 + Node.js/Express + Prisma 5 SaaS (`/`)  
**Status:** Phase B Gap & Conflict Analysis Complete — Proposed Resolutions Established  

---

## 1. IDENTIFIED ARCHITECTURAL & FUNCTIONAL CONFLICTS

During the Phase B deep mapping, six primary conflicts and architectural discrepancies were identified between the Laravel source and the target React + Node.js platform:

---

### Conflict 1: Single-Tenant Session Auth vs Dynamic Prisma Proxy Facade
* **Laravel Source Implementation:** Uses traditional session cookies and Spatie Laravel Permission middleware querying a single database.
* **Target Platform Reality:** Uses JWT bearer tokens, `AsyncLocalStorage` (`tenantStorage`), and a **Dynamic Prisma Proxy Facade** supporting both `SHARED_SCHEMA` and `SCHEMA_PER_TENANT` isolated databases.
* **Resolution Strategy:** Preserve the target platform's JWT `requireAuth` + `resolveTenantContext` + `prismaProxy` architecture. All migrated routes must use `getTenantDb()` / `prismaProxy` rather than direct raw SQL queries or static Eloquent scopes.

---

### Conflict 2: Inertia.js Monolithic Page Props vs REST API / TanStack Query
* **Laravel Source Implementation:** Controller methods return `Inertia::render('PageName', [ 'props' => $data ])`, embedding database models directly inside the HTML response payload.
* **Target Platform Reality:** Separated Client-Server Architecture (React 18 SPA + Node.js Express REST API returning JSON payloads).
* **Resolution Strategy:** Convert Laravel controller `Inertia::render` props into clean, typed Express REST API endpoints (`/api/module/...`) and consume them in React using TanStack Query hooks (`useQuery`, `useMutation`).

---

### Conflict 3: Employee Master Statutory Field Gap
* **Laravel Source Implementation:** `packages/workdo/Hrm/src/Models/Employee.php` includes statutory columns for Indian/Global HR compliance: `pan`, `aadhaar`, `uan`, `esi_number`, `bank_name`, `bank_account`, `bank_ifsc`, `tax_regime`.
* **Target Platform Schema:** `server/prisma/schema.prisma` already includes these fields on model `Employee` (`pan`, `aadhaar`, `uan`, `esiNumber`, `bankName`, `bankAccount`, `bankIfsc`, `taxRegime`).
* **Resolution Strategy:** Target database schema already contains these fields. Ensure frontend `EmployeeForm` renders input fields for all statutory properties.

---

### Conflict 4: Sales & Purchase Returns Model Absence
* **Laravel Source Implementation:** `app/Models/SalesReturn.php` & `app/Models/PurchaseReturn.php` manage credit/debit return notes and multi-step approval workflows (`approve`, `complete`).
* **Target Platform Schema:** Target `schema.prisma` currently lacks dedicated `SalesReturn` and `PurchaseReturn` models.
* **Resolution Strategy:** Add `SalesReturn` and `PurchaseReturn` models to `schema.prisma` during Wave 3 implementation, including foreign keys to `Sale` / `Purchase`, `tenant_id`, and line items array.

---

### Conflict 5: Double-Entry Journal Balance Validation
* **Laravel Source Implementation:** `packages/workdo/Account/src/Http/Controllers/JournalEntryController.php` enforces that total debits equal total credits before saving.
* **Target Platform Reality:** Existing accounting service requires explicit transaction validation.
* **Resolution Strategy:** Replicate Laravel's exact double-entry validation helper (`sum(debits) === sum(credits)`) inside `server/src/services/ledger-posting.service.ts`.

---

### Conflict 6: Add-on Zip Uploader Security
* **Laravel Source Implementation:** `ModuleController.php` unzips uploaded add-on archives directly into `packages/workdo/`.
* **Target Platform Reality:** In Node.js + TypeScript, dynamic code execution from un-sandboxed zips presents security risks.
* **Resolution Strategy:** Maintain database-driven add-on toggling (`Addon` & `TenantAddon` tables) and zip extraction into a controlled `addons/` directory with manifest validation (`module.json`), enforcing `requireAddon` middleware.

---

## 2. SUMMARY OF RESOLVED & UNRESOLVED GAPS

| Gap / Conflict Description | Source File Reference | Target File Reference | Proposed Resolution | Risk Level |
| :--- | :--- | :--- | :--- | :---: |
| **Sales & Purchase Return Models** | `app/Models/SalesReturn.php` | `server/prisma/schema.prisma` | Add `SalesReturn` & `PurchaseReturn` models to Prisma schema in Wave 3. | Low |
| **Statutory Field Rendering** | `packages/workdo/Hrm/src/Models/Employee.php` | `src/routes/_authenticated/_app/employees.tsx` | Render PAN, Aadhaar, UAN, ESI, Bank IFSC fields in React form. | Low |
| **Double-Entry Journal Balancing** | `Account/JournalEntryController.php` | `server/src/services/ledger-posting.service.ts` | Enforce debit = credit validation inside Express handler. | Medium |
| **POS Barcode Scanner & Receipt** | `Pos/PosController.php` | `src/routes/_authenticated/_app/pos.tsx` | Integrate keypress listener & printable receipt modal. | Low |
| **Multi-Tenant Proxy Integration** | `app/Http/Middleware/` | `server/src/facade/prisma-proxy.facade.ts` | Wrap all migrated backend controllers in `resolveTenantContext` & `prismaProxy`. | Medium |
