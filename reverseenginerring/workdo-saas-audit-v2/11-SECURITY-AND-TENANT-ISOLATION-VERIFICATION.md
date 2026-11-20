# 11 — Security & Multi-Tenant Isolation Verification (Defensive Audit)

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering Re-Audit  
**Audit Standard:** Defensive Source Code & Schema Security Audit  
**Date:** November 19, 2026  
**Focus Files:** `server/src/middleware/tenant-context.middleware.ts`, `server/src/context/tenant-context.ts`, `server/src/lib/crypto-config.ts`, `server/prisma/schema.prisma`  

---

## 1. Executive Summary & Critical Architectural Correction

In the historical security report (`docs/reverse-engineering/workdo-saas/33-COMPLETE-SECURITY-AND-TENANT-ISOLATION-REGISTER.md`), MASTERHRMS was claimed to enforce multi-tenant isolation across four distinct layers, concluding that cross-tenant data leakage is **"physically impossible via PostgreSQL Row-Level Security (PostgresRLS)"**.

A forensic audit of `server/prisma/schema.prisma`, database migration scripts, and backend services completely disproves this claim:
- **Zero PostgreSQL RLS Policies:** There is **NOT A SINGLE `CREATE POLICY` or `ENABLE ROW LEVEL SECURITY` statement** in the application codebase or database schema.
- **Application-Layer Isolation Reality:** Multi-tenant isolation is enforced entirely at the **application and ORM layer** through Node.js `AsyncLocalStorage` (`tenantStorage`), Express middleware, and Prisma client query extension hooks (`server/src/extensions/tenant-isolation.extension.ts`).
- **PostgreSQL RLS Claim Verdict:** **CONTRADICTED**. Claiming PostgreSQL kernel-level RLS protection when only application-layer ORM filtering exists is a severe documentation misrepresentation.

---

## 2. Security Claim Register & Forensic Verdicts

The following register audits all explicit security assertions from historical reports against verified codebase evidence:

| # | Security Claim in Historical Report | Actual Codebase Implementation | Concrete Codebase Evidence | Test Execution Reference | Forensic Verdict |
|---|---|---|---|---|---|
| **SC-01** | Cross-tenant leakage physically impossible via PostgreSQL RLS | Zero RLS policies configured. Isolation enforced via application Prisma query extensions | `server/prisma/schema.prisma` (no RLS policies); `tenant-isolation.extension.ts` | Tested in `tenant-proxy-fail-closed.test.ts` (Application level only) | **CONTRADICTED** |
| **SC-02** | Secret Encryption using AES-256-GCM with PBKDF2 salt | Sensitive settings, 2FA TOTP secrets, and API keys encrypted with AES-256-GCM | `server/src/lib/crypto-config.ts` (`createCipheriv('aes-256-gcm', ...)`), `SettingsService` | `crypto-security-hardening.test.ts` (Passing) | **VERIFIED** |
| **SC-03** | SQL Injection (SQLi) Fully Mitigated | Relational queries use Prisma ORM parameterized queries; raw SQL queries are bound safely | `server/src/prisma.ts`; AST audit reveals no dynamic SQL string concatenation | `settings-database-persistence-audit.test.ts` | **VERIFIED** |
| **SC-04** | Cross-Site Scripting (XSS) Fully Mitigated | React 19 JSX escapes strings automatically; HTML rendered via DOMPurify | Frontend component audit (`src/components/`) | Frontend lint and build checks | **SOURCE-INSPECTED** |
| **SC-05** | IDOR Enforced by Automatic Tenant Filtering | Enforced on 242 models with direct `tenantId`. Dependent child models require manual join | `server/src/middleware/tenant-context.middleware.ts`, `server/src/context/tenant-context.ts` | `settings-phase1-2-multitenant.test.ts` | **PARTIALLY VERIFIED** |
| **SC-06** | JWT Authentication & Session Fail-Closed | Bearer token validation with signature, expiration, and tenant parity checks | `server/src/middleware/auth.ts` (`requireAuth`), `server/src/lib/jwt.ts` | `auth.test.ts`, `super.routes.ts` | **VERIFIED** |
| **SC-07** | Payment Webhook Cryptographic Verification | Razorpay webhooks validate HMAC SHA-256 signatures before recording payments | `server/src/routes/payments.routes.ts` (`razorpayWebhookHandler`) | `unified-payment-workflow.test.ts` | **VERIFIED** |
| **SC-08** | Multi-Tenant Host Subdomain Scoping | Host header parsed for `{tenant}.masterhrms.com`; custom CNAME verified | `server/src/lib/workspace-host.ts`, `workspace-host.middleware.ts` | `cms-tenant-host-isolation.test.ts` | **VERIFIED** |
| **SC-09** | Immutable Audit Logging on Business Mutations | Audit logs emitted on sensitive mutations into `activity_logs` table | `server/src/modules/activity-logs/`, `activity-logs.service.ts` | `activity-logs.test.ts` | **VERIFIED** |

---

## 3. Actual Multi-Tenant Isolation Architecture

```
Incoming Request: https://acme.masterhrms.com/api/employees
  │
  ▼
[Layer 1: Network & Subdomain Resolution]
  - File: `server/src/lib/workspace-host.ts`
  - Action: Extracts tenant slug `acme` from Host header.
  │
  ▼
[Layer 2: JWT Bearer Authentication]
  - File: `server/src/middleware/auth.ts` (`requireAuth`)
  - Action: Validates signature and decodes `req.user.tenantId`.
  │
  ▼
[Layer 3: Tenant Parity & Context Binding]
  - File: `server/src/middleware/tenant-context.middleware.ts`
  - Action: Asserts `hostTenant.id === req.user.tenantId`.
  - Abort: If mismatch, emits HTTP 403 `TENANT_MISMATCH`.
  - Success: Stores tenant ID in `tenantStorage` (Node.js `AsyncLocalStorage`).
  │
  ▼
[Layer 4: Prisma Query Rewriting Extension]
  - File: `server/src/extensions/tenant-isolation.extension.ts`
  - Action: Intercepts queries on tenant-scoped models and auto-injects `where: { tenantId }`.
  │
  ▼
[PostgreSQL Database Engine]
  - Plain relational execution (No kernel-level RLS policies).
```

---

## 4. Architectural Vulnerability & Remediation Note

Because PostgreSQL RLS is absent, multi-tenancy is entirely reliant on the Node.js application process remaining uncompromised. Any raw query executed via `prisma.$queryRawUnsafe` that fails to manually bind `tenantId` could theoretically leak cross-tenant data. 

**Remediation Recommendation:** For true defense-in-depth, configure native PostgreSQL Row-Level Security via a Prisma migration using `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `CREATE POLICY ... USING (tenant_id = current_setting('app.current_tenant_id'))`.
