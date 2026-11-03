# MASTERHRMS — WORKSTREAM C FIELD MAPPING
## Form W — Register of Wages [Rule 16(1)]

**Document Reference**: `docs/hrms-audit/WORKSTREAM_C_FORM_W_FIELD_MAPPING.md`  
**Governing Statute**: Tamil Nadu Shops and Establishments Act, 1947 & Rules, 1948 — Rule 16(1)  
**Related Legislation**: Payment of Wages Act, 1936; Minimum Wages Act, 1948  
**Verified Column Count**: Exactly **34 Columns**  

---

### 1. Statutory Role & Mathematical Reconciliation

Form W is the primary financial register of wages earned, statutory and voluntary deductions made, and net wage disbursements. Under Rule 16(1), the employer must maintain a complete wage sheet reflecting gross earnings, individual breakdown components, statutory withholdings (EPF, ESI, Professional Tax, Labour Welfare Fund, and TDS), damage/loss deductions, and verifiable proof of disbursement.

The automated `FormWRegisterBuilder` executes strict mathematical reconciliation:
$$\text{Gross Wages} = \text{Basic} + \text{DA} + \text{HRA} + \text{Special Allowance} + \text{Bonus} + \text{OT} + \text{Arrears}$$
$$\text{Total Deductions} = \text{EPF} + \text{ESI} + \text{PT} + \text{LWF} + \text{TDS} + \text{Loans} + \text{Damage / Loss}$$
$$\text{Net Wages Paid} = \text{Gross Wages} - \text{Total Deductions}$$

---

### 2. Comprehensive 34-Column Field Mapping Specification

| Col # | Statutory Header Name | MasterHRMS DB Source | Transformation & Logic | Validation & Compliance Rules |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Serial Number | Auto-increment index | `index + 1` | Sequential integer. |
| **2** | Name of the Employee | `Employee.firstName + lastName` | Concatenate and trim. | Mandatory identity. |
| **3** | Employee Identification No. | `Employee.employeeCode` | Direct employee code string. | Unique employee reference. |
| **4** | Number of days worked | `PayrollSnapshot.payableDays` | Number of payable days (e.g. 26). | Validated against muster roll days worked. |
| **5** | Basic Wage Rate / Earned | `PayrollSnapshot.basicEarned` | Monthly basic salary earned. | Core wage rate. |
| **6** | Dearness Allowance | `PayrollSnapshot.daEarned` | DA component (if applicable). | Statutory cost-of-living allowance. |
| **7** | House Rent Allowance | `PayrollSnapshot.hraEarned` | HRA earned in period. | Statutory housing allowance. |
| **8** | Special Allowances | `PayrollSnapshot.specialAllowanceEarned` | Balancing / performance allowance. | Supplementary wage. |
| **9** | Statutory Bonus (Monthly Provision) | `PayrollSnapshot.bonusEarned` | Monthly provision under Payment of Bonus Act. | Minimum 8.33% statutory allocation. |
| **10** | Overtime Wages | `PayrollSnapshot.overtimeAmount` | Overtime compensation at 2x normal rate. | Section 31 OT multiplier compliance. |
| **11** | Arrears (Basic / Special) | `PayrollSnapshot.arrears` | Retrospective wage adjustments. | Traceable adjustment line. |
| **12** | Gross Wages Earned | `PayrollSnapshot.grossEarned` | **Mathematical sum of Cols 5–11**. | Validated with 0-cent variance. |
| **13** | Minimum Wages Payable by Law | Statutory benchmark | e.g. ₹11,500 under Scheduled Employment. | Warning flagged if Gross < Benchmark for 26 days. |
| **14** | EPF Employee Deduction | `PayrollSnapshot.pfEmployee` | 12% statutory employee contribution. | Capped at ₹1,800 or uncapped if authorized. |
| **15** | ESIC Employee Deduction | `PayrollSnapshot.esiEmployee` | 0.75% contribution (gross <= ₹21,000). | Rounded up under ESIC Regulation 52. |
| **16** | Professional Tax Deduction | `PayrollSnapshot.professionalTax` | Tamil Nadu slab-based municipal tax. | Monthly proration of half-yearly slab. |
| **17** | LWF Employee Deduction | `PayrollSnapshot.lwfEmployee` | ₹20 employee contribution (December cycle). | TN Labour Welfare Fund statutory rule. |
| **18** | Income Tax / TDS | `PayrollSnapshot.tds` | Monthly TDS withheld u/s 192. | Validated against IT tax regime calculation. |
| **19** | Recovery of Advances / Loans | `PayrollSnapshot.loanDeductions` | Monthly EMI for salary advances / loans. | Governed by Payment of Wages Act limits. |
| **20** | Deductions for Damage or Loss | `PayrollDeduction.damageLoss` | Penalty for damage/loss caused to employer. | Notice and show-cause required under statute. |
| **21** | Total Deductions | `PayrollSnapshot.totalDeductions` | **Mathematical sum of Cols 14–20**. | Capped at 50% max under Payment of Wages Act. |
| **22** | Net Wages Paid | `PayrollSnapshot.netSalary` | **Gross Wages minus Total Deductions**. | Net amount disbursed to employee. |
| **23** | Date of Payment | `PayrollCycle.payoutDate` | Formatted `DD-MM-YYYY` (e.g. `07-11-2026`). | Must be on or before 7th/10th of following month. |
| **24** | Payment Mode | `Employee.paymentMethod` | Normalized string: `BANK_TRANSFER`. | Mandatory cashless wage mandate. |
| **25** | Bank UTR / Transaction Reference | `PayrollPayment.transactionRef` | Unique banking transaction reference number. | Traceable electronic bank proof. |
| **26** | Disbursement Bank Name | `Employee.bankName` | Direct string; fallback `Primary Bank`. | Disbursing banking institution. |
| **27** | Bank Account Number Credited | `Employee.bankAccount` | Target account number. | Credited account. |
| **28** | Bank IFSC Code | `Employee.bankIfsc` | 11-character bank branch routing code. | Electronic clearing code. |
| **29** | Payment Authentication Timestamp | `PayrollRun.processedAt` | ISO timestamp of batch settlement. | Digital banking audit trail. |
| **30** | Digital Acknowledgment Voucher ID | `PayrollSnapshot.voucherToken` | Deterministic token: `VOUCH-{Code}-{Period}`. | Cryptographic transaction proof. |
| **31** | Worker Signature / Thumb Impression / Ack | Digital Receipt Stamp | Employee biometric / digital receipt ack. | Replaces manual paper thumb impression. |
| **32** | Witness Name / Manager Attestation | `CompanyProfile.signatoryName` | Manager / HR authorized representative name. | Attestation of accurate disbursement. |
| **33** | Employer Digital Seal Reference | Digital Seal Token | `SEAL-{EstablishmentCode}` | Authenticated establishment credential. |
| **34** | Remarks / Audit Trail Ref | System Audit Hash | `Automated Compliance Engine` | MasterHRMS automated statutory trace. |

---

### 3. Financial Reconciliation Guarantees
Every generated Form W model includes an automated reconciliation diagnostic comparing the register totals against the frozen payroll run snapshot:
- **Gross Variance**: Must be $\le ₹1.00$ (rounding tolerance).
- **Deductions Variance**: Must be $\le ₹1.00$.
- **Net Variance**: Must be $\le ₹1.00$.
- **Reconciliation Status**: Register is marked `isReconciled: true` only when all three variance checks pass.
