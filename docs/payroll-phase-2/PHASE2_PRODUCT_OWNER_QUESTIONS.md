# Phase 2 Product Owner Questions, Blockers & Decision Log
## Advanced Payroll Module: Governance & Pre-Implementation Sign-Off

**Document ID**: `DOC-P2-014`  
**Classification**: Product Governance & Decision Log  
**Status**: DECISIONS PO-DEC-01 THROUGH PO-DEC-05 APPROVED (READY FOR WAVE 2.2)  
**Date**: October 1, 2026  
**Auditor**: Senior Payroll Domain Engineer & Enterprise Consultant  

---

## 1. Executive Summary

To ensure compliance, data privacy, and accurate execution, the engineering team cannot make unilateral assumptions on business policies, banking configurations, or biometric hardware environments.

The following **10 prioritized decision items** must be reviewed and decided by the Product Owner prior to beginning implementation of their respective Phase 2 waves.

---

## 2. Prioritized Question & Blocker Register

### Q-01: Reimbursement Policy Limits & Multi-Tier Approval Routing
- **Priority**: **HIGH**
- **Affected Feature**: P2.1 (Employee Reimbursements)
- **Question**: What are the organization's exact reimbursement categories, monthly spending limits, and approval routing thresholds? (e.g., Do claims exceeding ₹10,000 require CFO / Secondary Finance approval, or is a single-level Manager -> HR approval sufficient?)
- **Why it matters**: Determines whether the approval engine requires a dynamic multi-tier rule evaluator or a fixed two-stage workflow.
- **Required Decision / Artifact**: Approval matrix policy document specifying category codes, monthly limits, and role escalation rules.

---

### Q-02: Advisory OCR Engine Selection & Document Retention Policy
- **Priority**: **HIGH**
- **Affected Feature**: P2.1 (Receipt Attachments & OCR)
- **Question**: Should receipt OCR rely strictly on a local self-hosted engine (Tesseract/LayoutLM) for zero external API costs and absolute on-prem data privacy, or should it integrate with Cloud Document AI (Google/AWS) for higher extraction accuracy? What is the statutory document retention period for receipt images (e.g. 8 years as per IT Act)?
- **Why it matters**: Impacts cloud hosting budgets, external network egress, and disk storage sizing.
- **Required Decision / Artifact**: Selection of OCR provider tier and confirmation of storage retention quotas.

---

### Q-03: Flexible Benefit Plan (FBP) Eligibility & Window Timelines
- **Priority**: **HIGH**
- **Affected Feature**: P2.2 (FBP Declarations)
- **Question**: Which employee grades or salary tiers are eligible for FBP? What are the exact corporate declaration window dates (e.g. April 1 to April 30 for projections; December 15 to January 31 for final proofs)?
- **Why it matters**: Governs access control to the FBP workspace and defines automated window lock triggers.
- **Required Decision / Artifact**: HR policy defining FBP component list, eligibility rules, and declaration calendar dates.

---

### Q-04: Mandatory Old vs New Tax Regime Switching Rules
- **Priority**: **HIGH**
- **Affected Feature**: P2.2 (TDS Calculation Engine)
- **Question**: For employees who do not actively select a tax regime, should the engine default to the **New Tax Regime** (Section 115BAC)? Are employees permitted to switch regimes mid-year upon life events, or is regime selection strictly frozen at the start of the financial year?
- **Why it matters**: Section 115BAC makes the New Regime the statutory default. Mid-year switching introduces retroactive TDS recalculation complexities.
- **Required Decision / Artifact**: Policy sign-off confirming New Regime as default and regime lock policy.

---

### Q-05: Exact Biometric Device Models, Firmware & Protocol Variants
- **Priority**: **BLOCKER (For Wave 2.3)**
- **Affected Feature**: P2.3 (Biometric Hardware Integration)
- **Question**: What are the exact hardware models, serial prefixes, and firmware versions deployed across company offices for ZKTeco, Matrix, and eSSL? (e.g., Matrix COSEC VEGA vs ARGO; ZKTeco MB20 vs SilkFP; eSSL Identix vs K30).
- **Why it matters**: Hardware protocols vary significantly by firmware version (e.g. Push SDK 2.0 vs Push SDK 3.0 vs proprietary SOAP API).
- **Required Decision / Artifact**: Hardware inventory list with device model numbers, installed firmware versions, and current network protocols.

---

### Q-06: Biometric Network Topology & Deployment Model
- **Priority**: **BLOCKER (For Wave 2.3)**
- **Affected Feature**: P2.3 (Biometric Ingestion)
- **Question**: Will biometric devices connect to the HRMS server across a private corporate LAN, a Site-to-Site VPN, or push data over the public internet to a cloud-hosted domain?
- **Why it matters**: Governs whether the server requires direct TCP/IP socket listeners on port 4370, an on-premises polling proxy agent, or a public HTTPS webhook endpoint.
- **Required Decision / Artifact**: Network architecture diagram defining device IP addressing, firewalls, and NAT configuration.

---

### Q-07: Official Corporate Banking Formats (ICICI, HDFC, SBI)
- **Priority**: **BLOCKER (For Wave 2.4)**
- **Affected Feature**: P2.4 (Bank Disbursement File Engine)
- **Question**: Does the organization possess official corporate banking format guidelines, sample payout files, or client code prefixes provided by the relationship managers at ICICI, HDFC, and SBI?
- **Why it matters**: Corporate banks have multiple proprietary variants (e.g. ICICI CIB vs EazyPay; HDFC Enet vs Enet 2.0). Generating an unverified generic layout will result in portal upload rejections.
- **Required Decision / Artifact**: Bank-issued corporate bulk payout sample templates and client code identifiers.

---

### Q-08: Digital Signature Certificate (DSC) Ownership & Signing Bridge
- **Priority**: **HIGH**
- **Affected Feature**: P2.4 (Digital Signing Architecture)
- **Question**: Does the organization intend to digitally sign payment files using an authorized corporate signatory's USB Hardware Token (DSC Class 3) via a browser bridge, or should the platform provide an automated server-side HSM signing integration?
- **Why it matters**: Client-side USB token signing requires a desktop bridge (e.g. Web PKI or QZ Tray), whereas server-side signing requires secure cloud KMS / HSM keys.
- **Required Decision / Artifact**: Corporate DSC signing policy and hardware token availability.

---

### Q-09: EPF & ESIC Establishment Codes & Filing Responsibilities
- **Priority**: **BLOCKER (For Wave 2.4)**
- **Affected Feature**: P2.5 (Statutory Returns Export)
- **Question**: Are EPF and ESIC returns filed centrally under a single primary establishment, or partitioned by branch establishment codes across states? Does the organization remit EPF on actual wages or strictly capped at the statutory ceiling (₹15,000)?
- **Why it matters**: Governs whether ECR generation partitions records into separate text files per establishment and determines Column 4 wage calculations.
- **Required Decision / Artifact**: Establishment registration list with EPFO/ESIC codes and confirmation of voluntary higher PF contribution policy.

---

### Q-10: Accounting & Double-Entry General Ledger Sync Policy
- **Priority**: **MEDIUM**
- **Affected Feature**: Cross-Module (Payroll & Accounting)
- **Question**: Should bank salary disbursement batches and reimbursed expenses automatically generate confirmed journal vouchers in the ERP's Chart of Accounts, or should they create draft journal entries requiring manual Finance approval?
- **Why it matters**: Governs whether `autoPostExpenseToLedger` runs synchronously in `posted` state or awaits manual GL review.
- **Required Decision / Artifact**: Financial accounting workflow sign-off.

---

## 3. Approved Decision Register

The following formal decisions have been evaluated and explicitly approved by the Product Owner:

### PO-DEC-01: Document Storage Engine (Approved for Wave 2.1)
- **Approved Policy**: Local encrypted disk storage (`LocalEncryptedStorageService`) utilizing AES-256-GCM authenticated encryption, random 96-bit IVs, and tenant isolation, designed behind a pluggable `IStorageService` interface for future cloud S3 migration.

### PO-DEC-02: Receipt OCR Architecture (Approved for Wave 2.1)
- **Approved Policy**: Local self-hosted OCR using Tesseract.js (WASM worker) with native PDF text extraction fallback. OCR extracted values operate strictly as advisory suggestions with mandatory human verification before submission and approval.

### PO-DEC-03: Reimbursement Limits & Approval Routing (Approved for Wave 2.2)
- **Approved Policy**: **Two-Tier with Threshold Routing**.
  - Direct Reporting Manager approves claims up to **₹10,000**.
  - Claims exceeding **₹10,000** require secondary **HR / Finance authorization** before qualifying for batch payout.
  - Per-category monthly spending limits are strictly enforced.

### PO-DEC-04: FBP Eligibility & Window Timelines (Approved for Wave 2.2)
- **Approved Policy**: **Universal Salaried Eligibility with Standard Corporate Windows**.
  - All full-time salaried employees across all grades are eligible for Flexible Benefit Plan (FBP) allocation.
  - **Annual Projection Window**: Open April 1 to April 30 (or within 30 days from Date of Joining for mid-year joiners).
  - **Final Tax-Proof Submission Window**: Open December 15 to January 31 for receipt audit and proof verification.

### PO-DEC-05: Tax Regime Defaults & Mid-Year Switching Policy (Approved for Wave 2.2)
- **Approved Policy**: **Statutory Default (Sec 115BAC New Regime) with Financial Year Lock**.
  - Employees who do not actively elect a tax regime automatically default to the **New Tax Regime** pursuant to Section 115BAC statutory defaulting.
  - Selected regime is **locked for the duration of the Financial Year** with no mid-year switching for salaried employees in compliance with CBDT guidelines.

