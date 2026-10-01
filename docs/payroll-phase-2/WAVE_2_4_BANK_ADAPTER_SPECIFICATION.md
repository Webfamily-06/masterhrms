# WAVE 2.4 — BANK ADAPTER SPECIFICATION
## Corporate Banking Payout Protocols: ICICI Bank, HDFC Bank & State Bank of India (SBI)

---

## 1. Overview

The Bank Disbursement Engine implements an extensible adapter architecture via `BankPayoutAdapter` interface defined in `server/src/services/bank-adapters/bank-adapter.interface.ts`.

Each adapter encapsulates:
1. Bank-specific pre-generation validation rules (account number length, IFSC code rules, payment mode selection).
2. Header, detail, and trailer line formatting.
3. Character encoding and delimiter standards.
4. Mathematical control totals and decimal formatting.

---

## 2. Supported Bank Adapters & Specifications

### 2.1 ICICI Bank Corporate Internet Banking (CIB) Adapter
- **File Name Convention**: `PAY-ICICI-{YYYYMM}-{REF}_ICICI_CIB.txt`
- **Delimiter**: Caret (`^`)
- **Record Structure**:
  - **Header Line (`H`)**:
    - `H^CIB^SALARY^{DEBIT_ACCOUNT_NUMBER}^{TOTAL_RECORDS}^{TOTAL_AMOUNT_2DEC}^{BATCH_REFERENCE}^{YYYY-MM-DD}`
  - **Detail Line (`D`)**:
    - `D^{PAYMENT_MODE}^{BENE_ACCOUNT}^{IFSC}^{AMOUNT_2DEC}^{BENE_NAME}^{TRAN_REF}^{NARRATION}`
    - Payment Mode: `IFT` (Internal Fund Transfer) for ICICI accounts starting with `ICIC`, `RTG` for RTGS (> ₹2,00,000), `NFT` for NEFT.
- **Account Validation Rules**:
  - Account Number: 12 numeric digits.
  - IFSC: 11 characters starting with 4 letters, '0', and 6 alphanumeric characters.
- **Official Specification Source**: ICICI Corporate Internet Banking (CIB) Bulk Upload Guide v4.2.

---

### 2.2 HDFC Bank Enet Corporate Banking Adapter
- **File Name Convention**: `PAY-HDFC-{YYYYMM}-{REF}_HDFC_ENET.csv`
- **Format**: 11-column standard Comma-Separated Values (`.csv`) with header row.
- **Header Line**:
  - `Transaction Type,Beneficiary Code,Beneficiary Account Number,Transaction Amount,Beneficiary Name,Drawee Location,Print Location,Bene Address 1,Bene Address 2,Customer Reference Number,Payment Details 1`
- **Detail Line**:
  - `P,{EMP_CODE},{BENE_ACCOUNT},{AMOUNT_2DEC},{BENE_NAME},,,,{IFSC},{BATCH_REF},{NARRATION}`
- **Account Validation Rules**:
  - Account Number: 9 to 16 numeric digits.
  - Beneficiary Code: Non-empty string (mapped to `employeeCode`).
- **Official Specification Source**: HDFC Bank Enet Bulk Upload Salary Protocol Specification v3.8.

---

### 2.3 State Bank of India (SBI) Corporate Multi-Portal (CMP) Adapter
- **File Name Convention**: `PAY-SBI-{YYYYMM}-{REF}_SBI_CMP.txt`
- **Delimiter**: Pipe (`|`)
- **Record Structure**:
  - **Header Line (`HDR`)**:
    - `HDR|CMP|SALARY|{DEBIT_ACCOUNT_NUMBER}|{CLIENT_CODE}|{YYYY-MM-DD}|{BATCH_REFERENCE}`
  - **Detail Line (`TXN`)**:
    - `TXN|{SERIAL_NUMBER}|{PAYMENT_MODE}|{BENE_ACCOUNT}|{AMOUNT_2DEC}|{BENE_NAME}|{IFSC}|{NARRATION}|{BATCH_REF}`
    - Payment Mode: `INB` (Internal State Bank) for IFSC starting with `SBIN`, `NEFT` for others.
  - **Trailer Line (`TRL`)**:
    - `TRL|{TOTAL_COUNT}|{TOTAL_AMOUNT_2DEC}|END`
- **Account Validation Rules**:
  - Account Number: 11 to 17 numeric digits.
  - Trailer Control Total: Exact mathematical sum matching detail rows.
- **Official Specification Source**: SBI Corporate Salary Package (CSP/CMP) Host-to-Host Transmission Spec v2.4.

---

## 3. Pre-Disbursement Validation Rules & Error Messages

| Check | Failure Condition | Error Message |
| :--- | :--- | :--- |
| Beneficiary Name | Empty or whitespace | `Beneficiary name is required` |
| Account Number | Non-numeric or outside bank length limits | `Account number must be {X} digits for {BANK}` |
| IFSC Code | Doesn't match `^[A-Z]{4}0[A-Z0-9]{6}$` | `Invalid IFSC Code "{CODE}". Must be 11 characters conforming to RBI standard.` |
| Net Amount | `<= 0` | `Payable amount must be greater than zero` |
