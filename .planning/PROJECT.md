# MASTERHRMS — Complete Enterprise Functionality Implementation

## What This Is

MASTERHRMS is an enterprise multi-tenant Human Resource Management, Payroll, and ERP SaaS platform. This project implements all applicable enterprise functionalities documented in the reverse-engineered WorkDo SaaS specification across 133 canonical Add-ons and 64 business functions, transforming architectural specifications into genuinely functional, tested software.

## Core Value

Every approved functionality must become a genuinely working, secure, tested MASTERHRMS feature with verified backend transactions, API contracts, and user-facing workflows.

## Requirements

### Validated

- ✓ 299 Prisma database models verified and schema-mapped — Phase 0
- ✓ 2,084 Express REST endpoints mapped across 130 route modules — Phase 0
- ✓ 545 TanStack file-based frontend routes verified — Phase 0
- ✓ 8 isolated modular plugins operational in `server/src/modules/` — Phase 0
- ✓ 24 route-level add-on implementations operational in `server/src/routes/` — Phase 0
- ✓ 36 business functions verified fully operational end-to-end — Phase 0
- ✓ AES-256-GCM settings and credentials encryption verified — Phase 0
- ✓ Application-level tenant isolation via `AsyncLocalStorage` (`tenantStorage`) verified — Phase 0
- ✓ Razorpay enterprise payment gateway with HMAC SHA-256 webhook validation verified — Phase 0
- ✓ Dynamic NodeMailer SMTP transporter pool with tenant scoping verified — Phase 0

### Active

- [ ] Implement formal Relieving Letter PDF generation, digital signing, and storage upon Full & Final settlement completion (FN-057 / GAP-01)
- [ ] Wire all inactive background cron workers (`document-expiry`, `probation-contract-expiry`, `reporting-manager-change`, `saas-billing`) to `server/src/index.ts` startup scheduler (GAP-03)
- [ ] Implement missing endpoints in Express controllers:
  - One-Click Lead to Customer conversion endpoint (`POST /api/crm/leads/:id/convert` — FN-041)
  - Fixed Asset Custodian Allocation & Acceptance Sign-off (`POST /api/addons/assets/:id/assign` — FN-046)
  - Manager Expense Reimbursement Approval action handler (`PUT /api/expenses/:id/approve` — FN-055)
  - Tenant Resource Quota Enforcement API route (`PUT /api/super/tenants/:id/quota` — FN-061)
- [ ] Implement modular plugin encapsulation for route-level add-ons into `server/src/modules/` (GAP-07)
- [ ] Validate all changes via TypeScript compilation and automated Jest regression suites
- [ ] Maintain comprehensive functionality tracking in `reverseenginerring/`

### Out of Scope

- Direct code deployment to live production clusters — User authorization policy requires manual deployment review.
- Git push to `origin/main` — All changes remain local until authorized.
- Destructive database migrations (`prisma migrate reset`) — Strictly prohibited to protect workspace data.
- 101 unbuilt third-party niche add-ons requiring live commercial API credentials not provided — Documented as BLOCKED_EXTERNAL_CREDENTIALS.

## Context

- **Authoritative Reverse-Engineering Knowledge Base:** Located at `reverseenginerring/` (preserving exact directory naming requested by user).
- **Backend Architecture:** Node.js, Express, TypeScript, Prisma ORM, PostgreSQL.
- **Frontend Architecture:** React 19, TanStack Router, Tailwind CSS, Vite.
- **Mobile Architecture:** React Native, Expo, TypeScript.
- **Multi-Tenancy:** Subdomain host scoping (`{tenant}.masterhrms.com`), JWT Bearer tokens, `tenantStorage` context, Prisma query extensions.

## Constraints

- **Database Safety**: Zero destructive schema migrations. All migrations must be non-breaking and additive.
- **Repository Integrity**: Preserve all pre-existing changes across branches.
- **Evidence-Based Acceptance**: Features are marked complete only with passing code execution evidence.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use `reverseenginerring/` as persistent knowledge source | Preserves user mandate directory name and centralizes all 467 reverse-engineering files | ✓ Good |
| Application-level tenant isolation via Prisma extension | Binds `tenantId` to queries automatically without breaking Super Admin global queries | ✓ Good |
| Reusable MailerFactory pool rather than 27 discrete SDKs | Standard SMTP handles all 27 provider presets without library bloat | ✓ Good |
| Razorpay native adapter with HMAC SHA-256 webhooks | Complies with Indian and international enterprise payment standards | ✓ Good |

---
*Last updated: 2026-11-19 after GSD initialization and documentation ingestion*
