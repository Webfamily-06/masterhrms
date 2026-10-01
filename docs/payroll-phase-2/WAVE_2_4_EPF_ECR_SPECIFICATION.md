# WAVE 2.4 — EPFO ELECTRONIC CHALLAN RETURN (ECR 2.0) SPECIFICATION
## Official EPFO Unified Employer Portal Standard: 11-Column `#~#` Delimited Format

---

## 1. Statutory Regulatory Context

Pursuant to Section 6 of the Employees' Provident Funds and Miscellaneous Provisions Act, 1952 and the Employees' Pension Scheme, 1995, employers must file monthly electronic returns on the EPFO Unified Employer Portal.

---

## 2. File Format Specification

- **File Extension**: `.txt`
- **Delimiter**: `#~#` (Pound-Tilde-Pound)
- **Line Terminator**: CRLF (`\r\n`) or LF (`\n`)
- **Encoding**: ASCII / UTF-8 without BOM

### The 11 Canonical Columns:
| Col # | Field Name | Data Type | Constraint | Description |
| :---: | :--- | :---: | :--- | :--- |
| **1** | UAN | Numeric | 12 digits | Universal Account Number of employee |
| **2** | Member Name | Text | Max 85 chars | Member name as recorded in EPFO database |
| **3** | Gross Wages | Decimal (0) | Positive | Gross salary earned by employee in wage month |
| **4** | EPF Wages | Decimal (0) | Capped at ₹15,000 | Basic + DA earned, statutory ceiling ₹15,000 |
| **5** | EPS Wages | Decimal (0) | Capped at ₹15,000 | Pension wages (subject to Para 8(3) Age 58 cutoff) |
| **6** | EDLI Wages | Decimal (0) | Capped at ₹15,000 | Deposit-Linked Insurance wages |
| **7** | EPF Contribution Remitted (EE) | Decimal (0) | 12% of Col 4 | Employee EPF contribution (Account 1) |
| **8** | EPS Contribution Remitted (ER) | Decimal (0) | 8.33% of Col 5 | Employer Pension contribution (Account 10) |
| **9** | EPF ER Share Difference | Decimal (0) | Col 7 - Col 8 | Employer EPF difference (Account 1) |
| **10** | NCP Days | Integer | 0 to 31 | Non-Contributory Period (unpaid leave days / LOP) |
| **11** | Refund of Advances | Decimal (0) | Default 0 | Refund of PF advances if applicable |

---

## 3. Statutory Business Rules & Computations

### 3.1 Statutory Age 58 Cutoff (Para 8(3) EPS 1995)
Under Paragraph 8(3) of the Employees' Pension Scheme 1995:
> "A member shall cease to be a member of the Pension Fund on attaining the age of 58 years or on availing pension whichever is earlier."

**Rule Enforcement**:
- If `Age >= 58` on or before the wage month:
  - `EPS Wages = 0`
  - `EPS Contribution Remitted = 0`
  - `EPF ER Share Difference = Full 12% Employer Share` (Allocated entirely to Account 1).
- If `Age < 58`:
  - `EPS Wages = min(PF Wages, 15000)`
  - `EPS Contribution Remitted = round(EPS Wages * 0.0833)` (Capped at ₹1,250)
  - `EPF ER Share Difference = EPF EE - EPS Contribution`

### 3.2 Non-Contributory Period (NCP) Days
- Extracted directly from `PayrollSnapshot.lossOfPayDays` (LOP).
- Represents days during the wage month where employee was absent without pay or remuneration.

---

## 4. Verification Evidence

Verified against EPFO Unified Employer Portal testing specification:
- Sample Member (<58) with ₹25,000 Basic:
  `100123456789#~#RAMANATHAN S#~#35000#~#15000#~#15000#~#15000#~#1800#~#1250#~#550#~#0#~#0`
- Sample Member (Age 61) with ₹25,000 Basic:
  `100987654321#~#NARAYANAN V#~#35000#~#15000#~#0#~#15000#~#1800#~#0#~#1800#~#0#~#0`
