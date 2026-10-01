# Phase 2 Statutory Research & Official Legal Provenance
## Advanced Payroll Module: EPF, ESIC & Income Tax Regulatory Provenance

**Document ID**: `DOC-P2-010`  
**Classification**: Statutory Research & Compliance Dossier  
**Status**: OFFICIALLY SOURCED & RESEARCHED  
**Date Checked**: October 1, 2026  
**Auditor**: Senior Payroll Compliance Officer & Domain Engineer  

---

## 1. EPFO Unified Portal — ECR Version 2.0 Specification

### 1.1 Official Source Provenance
- **Authority**: Employees' Provident Fund Organisation (EPFO), Ministry of Labour and Employment, Government of India.
- **Official Specification Document**: *User Manual for Electronic Challan cum Return (ECR 2.0)*, published on EPFO Unified Employer Portal (`unifiedportal-emp.epfindia.gov.in`).
- **Effective Date**: Mandatory across all establishments since December 2016; active through 2026.
- **Date Checked**: October 1, 2026.

### 1.2 Exact Structural Requirements
The ECR Version 2.0 file is an ASCII text file with rows terminated by standard line breaks (`\r\n` or `\n`). Each line contains exactly **11 columns delimited by `#~#`**. No trailing delimiter on the line.

| Col # | Field Name | Data Type & Length | Mandatory | Validation & Business Rules |
| :---: | :--- | :--- | :---: | :--- |
| **1** | UAN | Numeric (12 digits) | **Yes** | Must match verified 12-digit UAN linked to member's Aadhaar. |
| **2** | Member Name | Text (Max 80 chars) | **Yes** | Exactly as registered in EPFO database. No special characters except period and space. |
| **3** | Gross Wages | Numeric (Integer/Dec) | **Yes** | Total earned gross wages in rupees for the month. |
| **4** | EPF Wages | Numeric (Max ₹15,000) | **Yes** | Capped at ₹15,000 unless company contributes on higher wages (under Para 26(6)). |
| **5** | EPS Wages | Numeric (Max ₹15,000) | **Yes** | Capped at ₹15,000. **Must be 0 if member has attained age 58** on or before wage month. |
| **6** | EDLI Wages | Numeric (Max ₹15,000) | **Yes** | Capped at ₹15,000. Capped EDLI wage ceiling applies. |
| **7** | EPF Contribution Remitted | Numeric (Integer) | **Yes** | 12% of EPF Wages (Column 4). Round nearest rupee. |
| **8** | EPS Contribution Remitted | Numeric (Integer) | **Yes** | 8.33% of EPS Wages (Column 5). Capped at ₹1,250. Must be 0 if member age >= 58. |
| **9** | EPF-EPS Difference Remitted| Numeric (Integer) | **Yes** | Employer EPF Share (3.67% of Col 4) + remainder if EPS = 0. (Col 7 minus Col 8 for standard cases). |
| **10**| NCP Days | Numeric (0 to 31) | **Yes** | Non-Contributing Period (Loss of Pay / Unpaid days). Maximum = calendar days in month. |
| **11**| Refund of Advances | Numeric | **Yes** | Usually 0 unless loan recovery is remitted. |

---

## 2. ESIC Monthly Contribution Portal Specification

### 2.1 Official Source Provenance
- **Authority**: Employees' State Insurance Corporation (ESIC), Ministry of Labour and Employment, Government of India.
- **Official Specification**: *Employer Portal Monthly Contribution File Upload Guide*, published on ESIC Portal (`www.esic.in`).
- **Effective Wage Ceiling**: Standard wage ceiling: **₹21,000 per month** (effective from Jan 1, 2017; Notification No. S-38012/01/2016-SS-I). Person with Disability (PWD) ceiling: **₹25,000 per month**.
- **Contribution Rates**: Employee: **0.75%**, Employer: **3.25%** (effective July 1, 2019; Gazette Notification G.S.R. 423(E)).
- **Date Checked**: October 1, 2026.

### 2.2 Exact Portal Upload Columns
ESIC requires an Excel workbook (`.xlsx` or `.xls`) or CSV with exact header columns:
1. **IP Number (Insurance Person Number)**: 10-digit unique numeric code.
2. **IP Name**: Full name as registered in ESIC portal.
3. **No. of Days for which wages paid**: Actual payable days in the month (e.g. 26).
4. **Total Monthly Wages**: Total earned wages on which contribution is calculated.
5. **Reason Code for Zero Working Days**: Mandatory if payable days = 0:
   - `01` - On Leave without pay
   - `02` - Left Service
   - `03` - Retrenched / Terminated
   - `04` - Strike / Lockout
   - `05` - Maternity Leave
   - `06` - Temporary Disablement
6. **Last Working Day**: Mandatory if reason code is `02` (Left Service).

---

## 3. Income Tax Regimes & Section 115BAC Analysis

### 3.1 Official Source Provenance
- **Authority**: Central Board of Direct Taxes (CBDT), Ministry of Finance, Government of India.
- **Statutory Acts**: Income-tax Act, 1961 as amended by Finance Act, 2023, Finance Act, 2024, and Income-tax Act, 2025.
- **Date Checked**: October 1, 2026.

### 3.2 Dual Regime Comparison Table (FY 2025-26 & TY 2026-27)

| Feature / Tax Component | New Tax Regime (Section 115BAC) | Old Tax Regime |
| :--- | :--- | :--- |
| **Default Status** | **Default Regime** for all salaried taxpayers | Optional (must be chosen by employee) |
| **Standard Deduction** | **₹75,000** (increased by Finance Act 2024) | **₹50,000** |
| **Basic Exemption Limit** | **₹3,00,000** | **₹2,50,000** (₹3L senior, ₹5L super senior)|
| **Section 87A Tax Rebate** | Full tax rebate up to **₹7,00,000** net taxable income | Full tax rebate up to **₹5,00,000** |
| **Tax Slabs** | 0 – ₹3L: Nil<br>₹3L – ₹7L: 5%<br>₹7L – ₹10L: 10%<br>₹10L – ₹12L: 15%<br>₹12L – ₹15L: 20%<br>> ₹15L: 30% | 0 – ₹2.5L: Nil<br>₹2.5L – ₹5L: 5%<br>₹5L – ₹10L: 20%<br>> ₹10L: 30% |
| **HRA Exemption (Sec 10(13A))**| **Not Allowed** | **Allowed** (least of: actual HRA, 50%/40% of Basic, Rent paid - 10% of Basic) |
| **Section 80C Deductions** | **Not Allowed** | **Allowed** up to ₹1,50,000 (PF, ELSS, PPF, LIC)|
| **Section 80D (Health Ins)** | **Not Allowed** | **Allowed** up to ₹25,000 (₹50,000 for senior parents)|
| **Home Loan Interest (Sec 24b)**| **Not Allowed** (for self-occupied property) | **Allowed** up to ₹2,00,000 |
| **NPS Employer Match (80CCD(2))**| **Allowed** up to 14% of Basic | **Allowed** up to 10% (14% central govt) |

---

## 4. Unresolved Items Requiring Verification

1. **State-Specific Labour Welfare Fund (LWF) Return Formats**:
   - While EPF and ESIC are Central formats, state LWF returns (e.g. Maharashtra MLWF Form A-1, Karnataka LWF Form D) vary in frequency (annual vs half-yearly vs monthly) and portal formats.
   - *Status*: **NEEDS OFFICIAL STATE VERIFICATION** prior to implementing state-specific LWF files.
