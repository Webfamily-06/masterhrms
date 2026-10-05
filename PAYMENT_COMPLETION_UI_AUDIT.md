# PAYMENT COMPLETION + UI/PDF AUDIT REPORT (PHASE 0)

**Date:** October 5, 2026  
**Auditor:** Master HRMS Architecture & Security Agent  
**Target:** Unified Payment Lifecycle, Super Admin Transactions, Manual/Offline Payment Operations, Vector PDF Invoice Engine, Realtime Socket.IO  

---

## 1. Executive Summary

Phase 0 is a read-only audit of the current payment infrastructure, database models, frontend transaction consoles, PDF generation pipelines, and branding resolvers following the completion of **Fail-Closed Payment Security Hardening**.

The audit confirms that the backend security invariants (C1–C5) are solidly in place, cross-tenant isolation is enforced, and historical financial records (`SUB-INV-2026-0001..3`, `INV-2024-001..5`) are preserved. However, substantial gaps exist in the **frontend operational controls** on `/super/transactions`, **PDFKit logo rendering and layout alignment**, **realtime socket invalidations**, and **server-side PayPal/Stripe API integrations**.

---

## 2. Findings Classification Matrix

| Component | Scope | Current State | Classification | Root Cause / Impact |
| :--- | :--- | :--- | :---: | :--- |
| **Razorpay Verification** | Backend API | Cryptographic HMAC-SHA256 timing-safe verification active; fails closed with HTTP 503 if secret absent. | **PARTIALLY VERIFIED** | Awaits user-supplied live/sandbox credentials in `.env`. Architecture and verification logic are verified. |
| **PayPal Verification** | Backend API | Fails closed with HTTP 503 (`PAYMENT_VERIFICATION_UNAVAILABLE`). | **MISSING** | Server-side PayPal v2 Orders capture REST API integration is not implemented; currently safely blocked. |
| **Stripe Verification** | Backend API | Fails closed with HTTP 503 (`PAYMENT_VERIFICATION_UNAVAILABLE`). | **MISSING** | Server-side Stripe PaymentIntent / Checkout Session retrieval is not implemented; currently safely blocked. |
| **Offline / Net Banking** | Backend API | Authoritative plan price validation, receipt proof validation, MIME/size validation, status `open` pending review. | **VERIFIED** | Fully functional and secure against tampering. |
| **Super Admin Approval** | Backend API | Atomic approval, ledger persistence, subscription activation, idempotent re-approval guard. | **VERIFIED** | Endpoints `/approve`, `/reject`, `/status` fully operational. |
| **Transactions Table UI** | Frontend (`/super/transactions`) | Displays Invoice ID, Customer, Email, Date, Amount, Method, Status, [View], [Download]. | **PARTIALLY VERIFIED / MISSING** | Missing separate Transaction ID column, Verification Status column, Receipt indicator column, and direct row action buttons ([Receipt], [Approve], [Reject]). |
| **Manual Payment Modal** | Frontend (`/super/transactions`) | Details modal exists with verification details and `<img>` preview. | **BROKEN / INCOMPLETE** | PDF receipt proofs cannot render in `<img>` tags (broken image). Approve button lacks a confirmation dialog. |
| **Realtime Updates** | Frontend / Socket.IO | `broadcastToTenant` called on approval/rejection/submission, but frontend clients do not listen to payment events. | **MISSING** | Super Admin transaction table and Tenant subscription page require manual refresh to reflect status changes. |
| **Invoice PDF Logo** | Backend (`invoice-pdf.service.ts`) | PDFKit document generated with text only; no `doc.image()` call exists. | **BROKEN / MISSING** | Logo is completely absent from generated PDFs. |
| **Invoice PDF Layout** | Backend (`invoice-pdf.service.ts`) | Text header and table exist, but alignment, column widths, currency symbols, and corporate grid need refinement. | **PARTIALLY VERIFIED** | Margins and typography need professional alignment with brand identity. |
| **Branding Source** | Platform / CMS | `CMSPage: system-platform-settings` stores `logoLightUrl: "/logo.webp"`, `appName`, `currencySymbol`. | **PARTIALLY VERIFIED** | Disconnected from `invoice-engine.service.ts`; PDFKit cannot natively decode WebP images without conversion or PNG fallback. |
| **Email Resilience** | Backend (`email.ts`) | Safe capture of nodemailer SMTP errors; returns `emailDelivery: "failed"` without rolling back payments. | **VERIFIED** | Error resilience and accurate reporting confirmed. |
| **Historical Records** | PostgreSQL DB | `SUB-INV-2026-0001..3`, `INV-2024-001..5` intact. | **VERIFIED** | 100% immutable and unchanged. |

---

## 3. Detailed Component Deep-Dive

### 3.1 Gateway Verifications (Phase 1)
- **Razorpay**: Checkout creates order; `/verify` performs timing-safe HMAC comparison. If `RAZORPAY_KEY_SECRET` is unset, returns HTTP 503 (`PAYMENT_VERIFICATION_UNAVAILABLE`). Signature tampering returns HTTP 400.
- **PayPal**: Current handler returns HTTP 503. To support real sandbox testing when credentials are provided, a genuine server-side verification service (`PayPalService`) using `https://api-m.sandbox.paypal.com/v2/checkout/orders/{id}/capture` is needed. When credentials are absent, it must continue to fail closed.
- **Stripe**: Current handler returns HTTP 503. To support real test-mode testing when credentials are provided, a genuine server-side Stripe service (`StripeService`) retrieving `PaymentIntent` is needed. When credentials are absent, it must continue to fail closed.

### 3.2 Super Admin Transactions Table UI (Phase 3)
In [src/routes/_authenticated/super/transactions.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/super/transactions.tsx):
1. **Columns**: Currently has 9 columns (`Checkbox`, `Invoice ID`, `Customer`, `Email`, `Created Date`, `Amount`, `Payment Method`, `Status`, `Actions`).  
   **Required Columns**:
   - `Checkbox`
   - `Transaction ID` (e.g. `INV-2024-001` or `TXN-...`)
   - `Invoice Number` (e.g. `SUB-INV-2026-0001`)
   - `Tenant / Company` (with logo and workspace slug `@master`)
   - `Customer Email`
   - `Payment Method` (with official brand icon badge)
   - `Amount & Currency` (right-aligned, formatted with ISO currency code)
   - `Payment Status` (Paid / Unpaid / Failed)
   - `Verification Status` (VERIFIED / MISMATCH / PENDING VERIFICATION badge)
   - `Submitted Date`
   - `Receipt Proof` (clickable preview thumbnail or "No Receipt" badge)
   - `Actions` ([View], [Receipt], [Approve], [Reject], [Download])
2. **Action Buttons**: For pending/unpaid manual payments, Super Admin must be able to click **[Approve]** and **[Reject]** directly from the row as well as inside the modal. For paid records, display a green `[Verified]` badge; for rejected records, display `[Rejected]`.

### 3.3 Manual Payment Detail UI & File Viewer (Phase 4 & 11)
1. **Modal Details**: Detail drawer/modal must display Transaction No, Invoice No, Tenant Name, Workspace Slug, Payment Method, Amount, Currency, Status, Submitted Timestamp, and Gateway Cross-Verification details.
2. **Proof Viewer**:
   - For image files (`PNG`, `JPEG`, `WEBP`): Display inline preview with zoom/expand and "Open Full Size" / "Download" controls.
   - For PDF files (`application/pdf` or `.pdf` URL): Display PDF icon/embed with dedicated "Open PDF" and "Download Receipt" buttons.
   - For invalid or missing proof: Clean fallback stating "No proof attached" or "Unable to preview this file".
   - Prevent arbitrary URL leakage or SSRF.
3. **Approval Confirmation**: Approve button must trigger a confirmation prompt ("Approve this payment of ₹X for Tenant Y?") before executing the mutation.
4. **Rejection Modal**: Allows entering a required or optional explanation reason.

### 3.4 Realtime Socket.IO Invalidation (Phase 5)
1. **Backend**:
   - In `super.routes.ts`: `broadcastToTenant(tenantId, "payment:confirmed", ...)` and `broadcastToAll("super:transaction_updated", ...)` should be emitted upon approval, rejection, and offline submission.
2. **Frontend**:
   - In `src/lib/socket.ts` and `src/routes/_authenticated/_app/subscription.tsx`: Register listeners for `payment:confirmed`, `payment:rejected`, `subscription:activated`, and `subscription:updated` to automatically invalidate `["workspace-subscription", tenantId]`, `["billing-plans", tenantId]`, and `["realtime-tenant-invoices", tenantId]`.
   - In `src/routes/_authenticated/super/transactions.tsx`: Register listener for `super:transaction_updated` and `payment:submitted` to immediately invalidate `["super-transactions-list"]`.

### 3.5 Invoice PDF Correction & Logo Rendering (Phase 6, 7, 8 & 10)
1. **Logo Pipeline**:
   - Source: [server/src/services/invoice-engine.service.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/invoice-engine.service.ts) `getAuthoritativeSupplierInfo()` must resolve `logoPath` from `system-platform-settings` or local fallback.
   - Asset on disk: `public/white-logo.png` (205KB PNG) and `public/Payment/*` are available. WebP (`logo.webp`) is not supported by PDFKit's native raster parser.
   - Resolver: Check if a valid PNG/JPEG exists on the filesystem (e.g. `public/white-logo.png` or `public/logo.png`). If present and accessible, embed via `doc.image(logoPath, startX, y, { width: 120 })`. If absent or corrupted, render an elegant vector monogram/typography fallback without crashing the PDF.
2. **Layout & Grid**:
   - **Header**: Left side = Company Logo + Tagline. Right side = "MASTER HRMS & ERP", Company Address, Support Email, Phone, GSTIN.
   - **Meta Grid**: Document classification title (`PAYMENT RECEIPT / TRANSACTION VOUCHER` or `COMMERCIAL INVOICE / BILL OF SUPPLY` or `TAX INVOICE`), Invoice Number, Status Badge (`[ PAID ]` in green), Issue Date, Settlement Date, Billing Period.
   - **Parties Section**: Billed To / Customer (Left) vs Payment & Gateway Overview (Right).
   - **Table**: `ITEM & DESCRIPTION` | `QTY` | `UNIT RATE` | `TAX` | `TOTAL AMOUNT`. Numeric columns strictly right-aligned with authoritative ISO currency symbols.
   - **Totals Box**: Subtotal, Discount, CGST/SGST breakup (if applicable), Total Amount.
   - **Footer**: Verification hash, page number, and authoritative legal disclaimer.

---

## 4. Architectural Conflicts & Blocking Items

* **Critical Architectural Conflicts:** **NONE.**  
  The Prisma models, Express endpoints, frontend routes, and Socket.IO server are fully compatible and architecturally aligned.
* **Credentials Notice:** Live payment execution for Razorpay, PayPal, and Stripe requires sandbox credentials in `server/.env`. Until provided, the server verification layer will fail closed safely with HTTP 503 (`PAYMENT_VERIFICATION_UNAVAILABLE`), which is the exact expected behavior under the fail-closed security contract.

---

## 5. Next Steps / Implementation Roadmap

1. **Step 1 (Real Gateway Verification Modules):** Implement server-side verification modules for Razorpay (HMAC + API check), PayPal (v2 Orders capture REST), and Stripe (PaymentIntent retrieval), strictly failing closed if credentials are unset.
2. **Step 2 (PDF Vector Engine & Logo Rendering):** Update `invoice-pdf.service.ts` and `invoice-engine.service.ts` to implement logo resolution, header restructuring, numeric grid alignment, and document classification preservation.
3. **Step 3 (Super Admin Transactions UI Overhaul):** Update `/super/transactions` table with 12 canonical columns, row-level action buttons, receipt preview popover/modal (supporting both images and PDF proofs), approve confirmation dialog, and rejection modal.
4. **Step 4 (Realtime Socket.IO Integration):** Wire socket event listeners on both `/super/transactions` and `/subscription` to auto-invalidate TanStack Query caches on payment events.
5. **Step 5 (Validation & Verification):** Run automated test suites (Security Probe 11/11, Unified Workflow 30/30, Cross-Verification 30/30, Invoice Engine 19/19, Custom Domains 30/30, TypeScript 0 errors, build 0 errors), generate PDF samples, and produce visual QA evidence.
