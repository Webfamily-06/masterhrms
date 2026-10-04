# Supabase Data Migration Report

## 1. Executive Summary
Data migration and initial database bootstrapping was executed against the live Supabase PostgreSQL instance using idempotent seeders and verification audits.

- **Target Host**: `aws-0-ap-south-1.pooler.supabase.com`
- **Database**: `postgres`
- **Execution Timestamps**: October 1, 2026
- **Status**: **100% Verified**

---

## 2. Seeded Records Summary

### Core Platform & Tenancy
| Entity | Record Key / Identifier | Details | Status |
| :--- | :--- | :--- | :--- |
| **Tenant** | `tenant-default-001` | Name: "Master Enterprise ERP", Slug: "default" | **MIGRATED & VERIFIED** |
| **Super Admin** | `admin@masterhrms.com` | User ID: `user-admin-001`, Roles: `super_admin`, `hr_admin` | **MIGRATED & VERIFIED** |
| **HR Admin** | `hr@masterhrms.com` | User ID: `user-hr-001`, Name: "Sarah Jenkins (HR Director)", Role: `hr_admin` | **MIGRATED & VERIFIED** |
| **Employee** | `employee@masterhrms.com` | User ID: `user-emp-001`, Name: "Alex Morgan (Staff)", Role: `employee` | **MIGRATED & VERIFIED** |
| **Employee Record** | `emp-demo-001` | Code: `EMP-0001`, Salary: 85,000, Senior Full Stack Engineer | **MIGRATED & VERIFIED** |

### Subscription Plans & Catalog
| Plan ID | Name | Monthly Price | Annual Price | Employee Capacity | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `starter` | Starter Cloud | $199.00 | $1,990.00 | 50 Employees | **VERIFIED** |
| `growth` | Growth Enterprise | $399.00 | $3,990.00 | 250 Employees | **VERIFIED** |
| `enterprise` | Global Sovereign Tier | $899.00 | $8,990.00 | Unlimited Employees | **VERIFIED** |

### Ecosystem Addons
| Addon ID | Name | Category | Status |
| :--- | :--- | :--- | :--- |
| `biometric-hardware-bridge` | Biometric ADMS Attendance Gateway | hardware | **VERIFIED** |
| `whatsapp-automated-notifications` | WhatsApp Real-time Alerts Engine | messaging | **VERIFIED** |
| `ai-ocr-smart-expense-scanner` | AI Neural Invoice & Receipt OCR | ai | **VERIFIED** |
| `tally-erp-dual-sync-importer` | Tally ERP 9 & Prime Bidirectional Importer | integration | **VERIFIED** |
| `retail-pos-offline-cashier` | Retail POS Counter & Cashier Terminal | retail | **VERIFIED** |
| `google-workspace-directory-sync` | Google Workspace & Azure AD Directory Sync | integration | **VERIFIED** |

### Corporate Designations (10 Roles)
- Chief Technology Officer
- Senior Full Stack Engineer
- Frontend Developer
- Backend Developer
- DevOps Architect
- Product Manager
- HR Operations Director
- Financial Controller
- Sales Account Executive
- QA Automation Lead

### CRM Seed Data
- **Companies**: Apex Technologies (Bengaluru), Vanguard Logistics (Mumbai), Horizon Health Labs (Chennai)
- **Contacts**: Rajesh Kumar (VP Engineering), Ananya Deshmukh (Procurement Head), Dr. Vikram Seth (Managing Director)

---

## 3. Data Integrity & Constraint Verification
1. **Foreign Key Integrity**: Verified across `users` ➔ `profiles`, `users` ➔ `user_roles`, `tenants` ➔ `employees`.
2. **Password Hashes**: Standard bcrypt (10 rounds) stored in `users.password_hash`. Verified for `admin123`.
3. **Double-Entry Balance Verification**: Verified in invoice tests where debits and credits maintain 0 imbalance.
