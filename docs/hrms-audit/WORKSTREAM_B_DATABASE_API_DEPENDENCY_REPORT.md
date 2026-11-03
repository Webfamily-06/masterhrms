# MASTERHRMS — WORKSTREAM B DATABASE & API DEPENDENCY REPORT
## Schema Compatibility, Zero Remote DDL Enforcement & API Endpoint Reference

> **Workstream**: B — Contract Staffing Billing  
> **Status**: COMPLETED & VERIFIED  
> **Target Database**: Supabase PostgreSQL (`aws-0-ap-south-1.pooler.supabase.com:6543`, DB: `postgres`)  
> **Remote Migration Boundary**: STRICT ZERO REMOTE DDL / ZERO SCHEMA MIGRATIONS EXECUTED  

---

## 1. Remote Database Schema Compatibility

In accordance with strict environment constraints, **zero remote database migrations or schema drift** were introduced against the live database pooler.

Instead, the implementation leverages existing Prisma models and JSON fields:

| Conceptual Field | Target Model in Prisma | Native Column vs Structured JSON Storage | Status in Remote DB |
| :--- | :--- | :--- | :---: |
| **Staffing Client Record** | `StaffingClient` (`staffing_clients`) | Native Table (`id`, `tenantId`, `name`, `code`, `gstin`, `serviceChargePct`, `serviceChargeBase`, `billingStateCode`, `status`) | **Existing in DB (276 tables)** |
| **Employee Client Link** | `Employee` (`employees`) | Native Column (`client_id` FK to `staffing_clients.id`) | **Existing in DB** |
| **Commercial Billing Manifest** | `PayrollSnapshot` (`payroll_snapshots`) | Persisted in `snapshotData.commercialBilling` and `statutoryManifest` | **Existing JSON Field** |
| **Client Invoice Record** | `Sale` (`sales`) | Native Table (`id`, `tenantId`, `invoiceNo`, `type='staffing_billing'`, `subtotal`, `cgst`, `sgst`, `igst`, `totalTax`, `total`) | **Existing in DB** |
| **Client Invoice Details** | `SaleDetail` (`sale_details`) | Native Table (`saleId`, `productName`, `hsnSac='998513'`, `price`, `quantity`, `subtotal`, `taxRate`) | **Existing in DB** |
| **Audit & State History** | `Sale` (`sales`) | Persisted in `notes` JSON payload | **Existing JSON / Text Field** |

---

## 2. Workstream B API Endpoints Reference

All endpoints enforce multi-tenant isolation via `resolveTenantContext` and require authenticated sessions (`requireAuth`).

| HTTP Method | Route Endpoint | Description | Role Authorization |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/staffing/clients` | List all staffing clients, markup rates, and staff counts | `admin`, `finance_manager`, `hr_admin`, `hr_manager` |
| `POST` | `/api/staffing/clients` | Register new staffing client with commercial terms | `super_admin`, `tenant_admin`, `admin`, `finance_manager` |
| `GET` | `/api/staffing/clients/:id` | Fetch specific client details and assigned employees | `admin`, `finance_manager`, `hr_admin`, `hr_manager` |
| `PUT` | `/api/staffing/clients/:id` | Update client commercial terms (markup %, basis, GST) | `super_admin`, `tenant_admin`, `admin`, `finance_manager` |
| `POST` | `/api/staffing/simulate-mmu` | Interactive simulation of MMU, GST, and tax splits | `admin`, `finance_manager`, `hr_admin`, `hr_manager` |
| `GET` | `/api/staffing/runs/:id/summary` | Preview commercial billing by client for a payroll run | `admin`, `finance_manager`, `hr_admin`, `hr_manager` |
| `GET` | `/api/payroll/runs/:id/staffing-summary` | Alias for run billing summary | `admin`, `finance_manager`, `hr_admin`, `hr_manager` |
| `POST` | `/api/staffing/runs/:id/generate-invoices` | Generate draft/approved client invoices from payroll | `super_admin`, `tenant_admin`, `admin`, `finance_manager` |
| `POST` | `/api/payroll/runs/:id/generate-invoices` | Alias for run invoice generation | `super_admin`, `tenant_admin`, `admin`, `finance_manager` |
| `GET` | `/api/staffing/invoices` | List generated staffing invoices with filters | `admin`, `finance_manager`, `hr_admin`, `hr_manager` |
| `GET` | `/api/staffing/invoices/:id` | Get invoice breakdown, line items, and audit trail | `admin`, `finance_manager`, `hr_admin`, `hr_manager` |
| `PATCH` | `/api/staffing/invoices/:id/status` | Transition invoice workflow status (DRAFT/APPROVED/etc.) | `super_admin`, `tenant_admin`, `admin`, `finance_manager` |
| `GET` | `/api/staffing/invoices/:id/reconciliation` | Run automated reconciliation against source payroll run | `admin`, `finance_manager`, `hr_admin`, `hr_manager` |

---

## 3. Hardcoded Remediation Status (HC-09, HC-11, HC-12)

| Remediation ID | Previous Code State | Workstream B Refactored State |
| :--- | :--- | :--- |
| **HC-09** | Hardcoded agency contact email (`billing@tsvsolutions.com`) and phone (`+91 98765 43210`) in `invoices.routes.ts:1696` | Dynamically resolves establishment legal identity from `CompanyProfileService.getProfile(tenantId)` with registered city/state/pincode. |
| **HC-11** | Universal 10% MMU assumption hardcoded in calculation loops | Dynamically resolves client-specific markup percentage and markup basis from `StaffingClient` record. |
| **HC-12** | Universal 18% GST assumption with static state tax splits | Dynamically resolves place of supply and client GSTIN to split CGST/SGST or apply IGST. |

