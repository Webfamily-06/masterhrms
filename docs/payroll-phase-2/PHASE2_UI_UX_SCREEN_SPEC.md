# Phase 2 UI/UX Screen Inventory & Interaction Specification
## Advanced Payroll Module: User Interface Architecture

**Document ID**: `DOC-P2-007`  
**Classification**: Frontend Specification  
**Status**: DESIGN ONLY — PLANNING BASELINE  
**Date**: October 1, 2026  
**Architect**: Senior UI/UX Architect & Frontend Lead  

---

## 1. Design System & Component Reuse Baseline

All Phase 2 screens adhere strictly to the established design system:
- **Core Stack**: React 19, TanStack Router, TanStack React Query, Tailwind CSS 4, Radix UI primitives.
- **Icons**: Lucide React (`lucide-react`).
- **Typography & Color**: Slate/Indigo enterprise palette with dark mode support.
- **Micro-Animations**: Radix transitions, Sonner toasts for notifications.
- **Responsive Layout**: Resizable panels (`react-resizable-panels`) for split-pane verification workflows.

---

## 2. Screen Inventory

| Screen ID | Screen Name | Target Portal / Role | Route / Entry Point | Primary Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **SCR-201** | Employee Reimbursement Filing Modal | Employee Portal (`employee`) | Sub-modal in `/expenses` or `/payroll` | File claim with drag-and-drop receipt & advisory OCR |
| **SCR-202** | FBP Declaration & Basket Workspace | Employee Portal (`employee`) | `/payroll/fbp-declaration` | Choose tax regime & allocate flexible allowance components |
| **SCR-203** | Split-Pane Tax Proof Verification | HR Admin (`hr_admin`) | `/payroll/tax-declarations/verify` | Side-by-side PDF preview and line-item deduction audit |
| **SCR-204** | Bank Disbursement Console | Payroll Admin (`hr_admin`) | Sub-dialog in `/payroll` (Disburse) | Validate bank details, select format, sign, download batch |
| **SCR-205** | Statutory Returns Filing Center | Payroll Admin (`hr_admin`) | `/payroll/statutory-filings` | Generate EPF ECR v2.0 & ESIC returns per establishment |
| **SCR-206** | Biometric Hardware Manager & Monitor| IT / HR Admin (`hr_admin`) | `/biometric` (Extended) | Real-time device health, Matrix config, reconciliation cron |

---

## 3. Screen Interaction Specifications

### 3.1 SCR-201: Employee Reimbursement Filing Modal
- **Entry Point**: Button `+ File Reimbursement` on [expenses.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/expenses.tsx).
- **Layout & Components**:
  - `Dialog` container with two-step wizard:
    - Step 1: Receipt Upload & Advisory OCR.
    - Step 2: Claim Details & Confirmation.
- **Form Controls**:
  - Drag-and-drop receipt dropzone (supports `.pdf`, `.png`, `.jpg`, max 10MB).
  - OCR processing indicator with scanning animation.
  - Expense Category dropdown (`Travel`, `Meals`, `Software`, `Medical`, `Supplies`).
  - Claim Amount (pre-filled by OCR, editable by employee).
  - Expense Date (pre-filled by OCR date, flatpickr calendar picker).
  - Merchant Name & Invoice Number.
  - Payout Preference radio: `Add to Next Payroll` (default) vs `Direct Bank Transfer`.
- **Validation & Errors**:
  - File size check (> 10MB rejected client-side).
  - Amount > Category Monthly Limit displays soft policy warning badge.
  - Duplicate check: If identical amount + merchant exists within 60 days, amber badge: `Potential Duplicate Receipt`.
- **States**:
  - Loading: Pulse animation over receipt preview.
  - Empty: Clean upload dropzone with category limit quick-cards.

---

### 3.2 SCR-202: FBP Declaration & Basket Workspace
- **Entry Point**: Navigation link in Payroll menu: `Flexible Benefits (FBP)`.
- **Layout & Components**:
  - Top Card: **Tax Regime Toggle** (New Tax Regime vs Old Tax Regime) with dynamic net take-home comparison summary.
  - Main Panel: **CTC Basket Allocation Calculator**:
    - Progress Bar showing Total Pool Allocated (e.g. `₹2,10,000 / ₹2,40,000`).
    - Component Sliders / Inputs:
      - Fuel & Maintenance (Max: ₹96,000/yr)
      - Telephone & Broadband (Max: ₹60,000/yr)
      - Books & Periodicals (Max: ₹30,000/yr)
      - Meal Allowance (Max: ₹26,400/yr)
      - Children Education Allowance (Max: ₹2,400/child/yr)
  - Unallocated balance automatically routes to taxable **Special Allowance**.
- **Action Buttons**: `Save Draft`, `Submit Declaration`.
- **Lock State**: When the administrative cutoff passes, inputs disable with badge: `Declaration Window Locked for FY 2026-27`.

---

### 3.3 SCR-203: Split-Pane Tax Proof Verification (HR Admin)
- **Entry Point**: `/payroll/tax-declarations/verify` or via `Audit Proofs` badge on employee rows.
- **Layout (`react-resizable-panels`)**:
  - **Left Panel (50% default)**: Built-in PDF/Image Viewer supporting pan, zoom, rotate, and multi-page navigation for the employee's uploaded proof (LIC receipt, rent agreement).
  - **Right Panel (50% default)**: Verification Audit Form:
    - Employee Header: Name, Code, Department, Chosen Tax Regime.
    - Section Item Card:
      - Declared Amount (read-only): e.g. `₹1,20,000`
      - Approved Amount Input: pre-filled with declared amount, adjustable by reviewer.
      - Landlord PAN validation check badge (green check if valid 10-char format).
      - Rejection Reason dropdown (if reducing or rejecting amount).
      - Reviewer Notes textarea.
    - Action Bar: `Approve Line Item`, `Reject Line Item`, `Save & Next Employee`.

---

### 3.4 SCR-204: Bank Disbursement Console
- **Entry Point**: Action button `Disburse Batch` on finalized Payroll Run row in [payroll.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/payroll.tsx).
- **Layout & Components**:
  - Modal with 3-tab workflow:
    1. **Pre-Disbursement Audit**:
       - Table listing any payees with invalid IFSC, missing bank accounts, or zero pay.
       - Disburse button disabled if blockers exist.
    2. **Format Selection & Corporate Config**:
       - Bank Selector: `ICICI Bank (CIB)`, `HDFC Bank (Enet)`, `State Bank of India (CMP)`.
       - Corporate Debit Account number select.
       - Value Date picker.
       - Digital Signing Checkbox: `Generate Detached PKCS#7 Signature (.sig)`.
    3. **Generation & Download**:
       - Displays generated batch reference (`SAL-202608-HDFC-01`), record count (48), total payout (`₹14,25,600.00`), and SHA-256 integrity hash.
       - Button `Download Bank Payout File` and `Download Signature File`.
       - Button `Mark as Disbursed` (updates run state and locks batch).

---

### 3.5 SCR-205: Statutory Returns Filing Center
- **Entry Point**: `/payroll/statutory-filings` or tab within Payroll screen.
- **Layout & Components**:
  - Filters: Payroll Month, Year, Establishment dropdown.
  - **EPF ECR Card**:
    - Summary Metrics: Total Members (48), Gross Wages (₹14.4L), EPF Wages (₹7.2L), Total EPF/EPS Remittance (₹1.72L).
    - Account-wise Breakdown Table (A/c 1, 2, 10, 21, 22).
    - Action: Button `Generate ECR Text File (#~#)` with immediate download.
  - **ESIC Monthly Return Card**:
    - Summary Metrics: Covered IP Count (18), Total Wages (₹3.2L), Total Contribution (₹12.8K).
    - Action: Button `Generate ESIC Portal Excel (.xlsx)`.
  - **Filing History Table**:
    - Lists previous months with generated file hashes, download timestamps, and Challan TRRN input field.
