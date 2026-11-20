# 15 — MASTERHRMS Implementation Gap Register (Milestone Prioritization)

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering Re-Audit  
**Audit Standard:** Gap Analysis & Architectural Roadmap Alignment  
**Date:** November 19, 2026  
**Target Milestone Alignment:** Milestones M1 through M6  

---

## 1. Executive Summary

This register consolidates all verified implementation gaps discovered during the forensic audit of the WorkDo SaaS platform and the MASTERHRMS codebase. 

Gaps are prioritized based on enterprise business impact, multi-tenant security risk, regulatory compliance requirements, and architectural dependencies, rather than the arbitrary visual order of WorkDo sidebar menus.

---

## 2. Prioritized Implementation Gap Register

| Gap ID | Feature / Capability Domain | Specific Missing Capability | Architecture Impact & Risk | Technical Complexity | Recommended Milestone | Dependencies |
|---|---|---|---|---|---|---|
| **GAP-01** | Offboarding & Clearances | **Formal Relieving Letter PDF Generation & Storage** | Milestone M5 blocked. Currently only code string `REL-XXXX` is stored. No PDF, digital signature, or download link | **Medium** | **Milestone M5 (Core HR Lifecycle)** | `EmployeeExit`, PDF rendering engine (Puppeteer/PDFKit), S3 Storage |
| **GAP-02** | Statutory Tax Compliance | **Indian Statutory Tax PDF Forms (Form 16, 24Q, EPF/ESI)** | Regulatory non-compliance for payroll tenants. Currently SPECIFICATION ONLY; no form engines exist | **High** | **Milestone M4 (Statutory Payroll)** | `Payroll`, `SalarySlip`, Tax slab engines, Government layout templates |
| **GAP-03** | Background Automation | **Wire Inactive Crons to Server Startup Schedule** | Background tasks do not execute automatically. `document-expiry`, `probation-expiry`, `manager-change`, `saas-billing` orphaned | **Low** | **Milestone M1 (Platform Foundation)** | `server/src/index.ts`, node-cron |
| **GAP-04** | Security & Defense-in-Depth | **Native PostgreSQL Row-Level Security (RLS) Policies** | Multi-tenancy currently relies entirely on application-layer Prisma extensions. No DB-kernel protection | **High** | **Milestone M1 (Platform Foundation)** | PostgreSQL migrations, `current_setting('app.current_tenant_id')` |
| **GAP-05** | Double-Entry Accounting | **Automated Bank Statement OCR Reconciliation (FN-039)** | Bank statement reconciliation is purely manual. Claimed OCR ingestion engine does not exist in code | **High** | **Milestone M3 (Financial Ledger)** | OCR microservice (Tesseract/Textract), `ChartOfAccount`, `JournalEntry` |
| **GAP-06** | Test Automation | **Convert Playwright MCP Sessions to Executable CI/CD Tests** | PW-01 through PW-08 are interactive MCP browser logs, not repeatable regression tests in CI pipeline | **Medium** | **Milestone M2 (Quality & CI/CD)** | `@playwright/test`, mock tenant fixtures, CI workflow |
| **GAP-07** | Modular Add-on Architecture | **Migrate Route-Level Add-ons to Isolated Modular Plugins** | 24 add-ons live as loose route files rather than using the `server/src/modules/` plugin architecture | **Medium** | **Milestone M6 (Enterprise Marketplace)** | Module loader, manifest schema, dynamic router registration |
| **GAP-08** | Payment Gateway Coverage | **International Payment Gateway Adapters (Stripe, PayPal)** | Only Razorpay is natively implemented. International tenants requiring Stripe/PayPal cannot transact | **Medium** | **Milestone M3 (Commerce & Billing)** | `@stripe/stripe-node`, `@paypal/checkout-server-sdk`, Webhook verification |
| **GAP-09** | Third-Party Single Sign-On | **Enterprise OAuth / SSO (Google, Microsoft, SAML)** | OAuth configurations exist in settings schema, but backend OAuth callback handlers are not implemented | **Medium** | **Milestone M1 (Auth & Security)** | Passport.js / Arctic OAuth handlers, User identity linking |
| **GAP-10** | Fixed Asset Tracking | **Public QR Tag Inspection Passport (/a/:tag)** | Physical asset barcodes cannot be verified publicly by field staff without an active admin session | **Low** | **Milestone M6 (Asset Management)** | Public Express route, lightweight public React view |

---

## 3. Recommended Implementation Roadmap Sequencing

```
Milestone M1: Platform Security & Foundations
  ├── GAP-03: Wire Inactive Crons (document, probation, billing) to index.ts
  ├── GAP-04: Implement native PostgreSQL Row-Level Security (RLS) policies
  └── GAP-09: Implement Enterprise OAuth / SSO (Google, Microsoft)

Milestone M2: Automated Testing & Verification
  └── GAP-06: Convert Playwright MCP sessions to executable CI/CD test suites

Milestone M3: Finance, Commerce & Billing
  ├── GAP-08: Add Stripe & PayPal native gateway adapters alongside Razorpay
  └── GAP-05: Implement Bank Statement CSV/OCR parsing engine

Milestone M4: Statutory Payroll & Tax Compliance
  └── GAP-02: Build Indian Statutory PDF generators (Form 16 Part A/B, Form 24Q, EPF/ESI)

Milestone M5: Core HR Offboarding & Formal Clearances
  └── GAP-01: Build formal Relieving Letter PDF generation, digital signing & storage

Milestone M6: Enterprise Marketplace & Modular Architecture
  ├── GAP-07: Refactor 24 route-level add-ons into modular plugin directories
  └── GAP-10: Deploy Public QR Tag Inspection Passport (/a/:tag)
```
