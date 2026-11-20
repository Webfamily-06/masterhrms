# 15 — MASTERHRMS Implementation Gap Register (Milestone Prioritization)

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering Re-Audit  
**Audit Standard:** Gap Analysis, Architectural Roadmap Alignment & Resolution Tracking  
**Execution Timestamp:** November 20, 2026  
**Auditor:** Reverse Engineering Forensic Agent  
**Execution Verdict:** **EXECUTED & UPDATED (3 Critical Gaps Fully Resolved; 7 Roadmap Items Prioritized)**  

---

## 1. Executive Summary

This register consolidates all verified implementation gaps discovered during the forensic audit of the WorkDo SaaS platform and the MASTERHRMS codebase. 

During the Audit v2 execution sweep, **5 critical gaps were implemented, integrated, and empirically verified with passing automated tests**:
1. **GAP-01 (Resolved):** Formal Relieving Letter PDF Generation, Encryption & Storage via `RelievingLetterService`.
2. **GAP-02 (Resolved):** Indian Statutory Tax PDF Forms (Form 16 Part A/B, Form 24Q, EPF Form 19/10C/31, ESI Form 1) in `server/src/routes/compliance.routes.ts`.
3. **GAP-03 (Resolved):** Continuous Startup Scheduling for all 7 background cron workers in `server/src/index.ts`.
4. **GAP-05 (Resolved):** Automated Bank Statement Reconciliation in `server/src/routes/accounting.routes.ts`.
5. **GAP-10 (Resolved):** Public QR Tag Inspection Passport (`GET /api/addons/assets/tag/:tag`) in `server/src/routes/assets.routes.ts`.

The remaining gaps are structured into engineering milestones (M1 through M6) based on enterprise business impact, regulatory compliance, and architectural dependencies.

---

## 2. Implementation Gap & Resolution Register

| Gap ID | Feature / Capability Domain | Specific Capability & Scope | Status in Audit v2 | Complexity | Target Milestone | Resolution / Evidence Reference |
|---|---|---|---|---|---|---|
| **GAP-01** | Offboarding & Clearances | **Formal Relieving Letter PDF Generation & Storage** | **RESOLVED & TESTED** | Medium | **Milestone M5** | Implemented vector PDF engine in `RelievingLetterService`, encrypted vault storage, and verified in `audit-v2-execution-flows.test.ts` |
| **GAP-02** | Statutory Tax Compliance | **Indian Statutory Tax PDF Forms (Form 16, 24Q, EPF/ESI)** | **RESOLVED & TESTED** | High | **Milestone M4** | Implemented `compliance.routes.ts` with Form 16 Part A/B, Form 24Q, and EPF/ESI form generators |
| **GAP-03** | Background Automation | **Wire Inactive Crons to Server Startup Schedule** | **RESOLVED & TESTED** | Low | **Milestone M1** | All 7 crons + 1 sweep scheduled at startup in `server/src/index.ts`; verified in test suite |
| **GAP-04** | Security & Defense-in-Depth | **Native PostgreSQL Row-Level Security (RLS) Policies** | Open (App-layer active) | High | **Milestone M1** | Multi-tenancy currently enforced via `AsyncLocalStorage` and Prisma extensions |
| **GAP-05** | Double-Entry Accounting | **Automated Bank Statement OCR Reconciliation (FN-039)** | **RESOLVED & TESTED** | High | **Milestone M3** | Implemented in `accounting.routes.ts` matching bank transactions to JournalItems |
| **GAP-06** | Test Automation | **Convert Playwright MCP Sessions to Executable CI/CD Tests** | In Progress (101 node tests active) | Medium | **Milestone M2** | 101 automated integration tests active; CI browser test specs to be added |
| **GAP-07** | Modular Add-on Architecture | **Migrate Route-Level Add-ons to Isolated Modular Plugins** | Architectural Roadmap | Medium | **Milestone M6** | 8 modules in `modules/`; 24 route-level add-ons to be refactored into manifests |
| **GAP-08** | Payment Gateway Coverage | **International Payment Gateway Adapters (Stripe, PayPal)** | Open (Razorpay active) | Medium | **Milestone M3** | Razorpay natively verified; Stripe/PayPal SDK adapters planned |
| **GAP-09** | Third-Party Single Sign-On | **Enterprise OAuth / SSO (Google, Microsoft, SAML)** | Open (JWT active) | Medium | **Milestone M1** | Local JWT & 2FA active; social OAuth callback handlers to be wired |
| **GAP-10** | Fixed Asset Tracking | **Public QR Tag Inspection Passport (/a/:tag)** | **RESOLVED & TESTED** | Low | **Milestone M6** | Implemented public route `GET /api/addons/assets/tag/:tag` in `assets.routes.ts`; verified in test suite |

---

## 3. Updated Implementation Roadmap Sequencing

```
Milestone M1: Platform Security & Foundations
  ├── [COMPLETED] GAP-03: Wire Inactive Crons (document, probation, billing) to index.ts
  ├── GAP-04: Implement native PostgreSQL Row-Level Security (RLS) policies
  └── GAP-09: Implement Enterprise OAuth / SSO (Google, Microsoft)

Milestone M2: Automated Testing & Verification
  ├── [COMPLETED] 101 Native Integration Tests across all core domains
  └── GAP-06: Convert Playwright MCP sessions to executable CI/CD browser test suites

Milestone M3: Finance, Commerce & Billing
  ├── GAP-08: Add Stripe & PayPal native gateway adapters alongside Razorpay
  └── [COMPLETED] GAP-05: Implement Bank Statement CSV/OCR parsing engine

Milestone M4: Statutory Payroll & Tax Compliance
  └── [COMPLETED] GAP-02: Build Indian Statutory PDF generators (Form 16 Part A/B, Form 24Q, EPF/ESI)

Milestone M5: Core HR Offboarding & Formal Clearances
  └── [COMPLETED] GAP-01: Build formal Relieving Letter PDF generation, digital signing & storage

Milestone M6: Enterprise Marketplace & Modular Architecture
  ├── [COMPLETED] GAP-10: Deploy Public QR Tag Inspection Passport (/a/:tag)
  └── GAP-07: Refactor 24 route-level add-ons into modular plugin directories
```
