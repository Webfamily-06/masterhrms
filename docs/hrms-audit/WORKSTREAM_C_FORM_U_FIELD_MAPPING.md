# MASTERHRMS — WORKSTREAM C FIELD MAPPING
## Form U — Employee Register [Rule 16(1)]

**Document Reference**: `docs/hrms-audit/WORKSTREAM_C_FORM_U_FIELD_MAPPING.md`  
**Governing Statute**: Tamil Nadu Shops and Establishments Act, 1947 & Rules, 1948 — Rule 16(1)  
**Related Legislation**: Tamil Nadu Industrial Establishments (Conferment of Permanent Status to Workmen) Act, 1981  
**Verified Column Count**: Exactly **27 Columns**  

---

### 1. Statutory Background & Legal Mandate

Under Rule 16(1) of the Tamil Nadu Shops and Establishments Rules, 1948, every employer is required to maintain a comprehensive register of all persons employed in Form U. The register must be maintained up to date, accessible at the workplace during inspection, and contain exact demographic, educational, residential, statutory KYC, and service records.

Furthermore, under the Tamil Nadu Industrial Establishments (Conferment of Permanent Status to Workmen) Act, 1981, Column 23 specifically mandates recording the date on which a workman completes 480 days of continuous service in a period of 24 calendar months, triggering statutory permanency rights.

---

### 2. Comprehensive 27-Column Field Mapping Specification

| Col # | Statutory Header Name | MasterHRMS DB Source | Transformation & Logic | Validation & Compliance Rules |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Serial Number | Auto-increment index | `index + 1` | Mandatory sequential integer. |
| **2** | Name of the employee | `Employee.firstName + lastName` | Concatenate and trim. | Mandatory under Rule 16(1); flagged if missing. |
| **3** | Employee Identification No. | `Employee.employeeCode` | Direct string; fallback `EMP-{index+1}`. | Unique establishment identifier. |
| **4** | Gender | `Employee.gender` | Title case (`Male`, `Female`, `Other`). | Required for demographic categorization. |
| **5** | Father / Spouse Name | `Employee.fatherOrSpouseName` | Direct value; fallback to `—` if unmigrated. | Statutory lineage identifier. |
| **6** | Date of Birth | `Employee.dateOfBirth` | Formatted to `DD-MM-YYYY`. | Mandatory for age classification and child labour checks. |
| **7** | Date of entry into service | `Employee.joinedAt` | Formatted to `DD-MM-YYYY`. | Mandatory for service duration and gratuity calculations. |
| **8** | Designation | `Employee.position` | Position title; fallback `Staff`. | Class of employment. |
| **9** | Department | `Department.name` | Joined via `Employee.departmentId`. | Administrative division. |
| **10** | Educational Qualification | `Employee.education` | Direct string; fallback `—`. | Record of qualifications. |
| **11** | Permanent Address | `Employee.permanentAddress` | Address string; fallback to present address or state. | Legal permanent residence. |
| **12** | Present Address | `Employee.presentAddress` | Address string; fallback to `state, India`. | Local residential address for communication. |
| **13** | Mobile Number | `Employee.phone` | Direct contact string; fallback `—`. | 10-digit communication number. |
| **14** | e-mail I.D | `Employee.email` | Normalized lowercase email string. | Electronic communication address. |
| **15** | Aadhaar No. | `Employee.aadhaar` | **Masked**: `XXXXXXXX` + Last 4 digits. | **PII Security Mandate**: Full 12 digits never exposed. |
| **16** | PAN Number | `Employee.pan` | Uppercase 10-character alphanumeric. | Validated against regex `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`. |
| **17** | UAN | `Employee.uan` | 12-digit Universal Account Number. | Mandatory under EPFO rules if EPF eligible. |
| **18** | Employee's Provident Fund No. | `Employee.pfNumber` | Regional PF establishment identifier. | Mandatory if employee contributes to EPF. |
| **19** | Employee's State Insurance No. | `Employee.esiNumber` | 17-digit ESIC insurance number. | Required if monthly wages <= ₹21,000. |
| **20** | Bank A/c Number | `Employee.bankAccount` | Bank disbursement account string. | Required for cashless wage disbursal. |
| **21** | Bank Name & Branch | `Employee.bankName + bankBranch` | Concatenated as `{Bank} - {Branch}`. | Bank branch location. |
| **22** | Bank IFSC Code | `Employee.bankIfsc` | Uppercase 11-char IFSC code. | Validated format for NEFT/RTGS. |
| **23** | Date on completion of 480 days | `Employee.completion480DaysDate` | Evaluated at 480 continuous working days. | TN Permanency Status Act compliance requirement. |
| **24** | Date on which made permanent | `Employee.permanentEmploymentDate` | Date formal permanency order was issued. | Required once conferment of status is granted. |
| **25** | Date of Exit | `EmployeeExit.lastWorkingDay` | Last working day or resignation date. | Populated only upon employee separation. |
| **26** | Reason for Exit | `EmployeeExit.reason` | Resignation, retirement, termination, etc. | Required for statutory severance and FNF audits. |
| **27** | Specimen Signature / Thumb Impression | Digital Receipt Token | `DIGI-ACK-{Code}-{EmpIdHash}` | Traceable employee digital acknowledgment token. |

---

### 3. PII & Privacy Guardrails
1. **Aadhaar Masking**: Aadhaar numbers are cleaned of non-digits and strictly masked into `XXXXXXXX####` format. In no situation does the API, JSON model, XLSX, or PDF output render unmasked Aadhaar numbers.
2. **Data Minimization**: The projection query explicitly uses `SAFE_EMPLOYEE_SELECT` to ensure unmigrated columns in the remote database do not trigger query failures.

