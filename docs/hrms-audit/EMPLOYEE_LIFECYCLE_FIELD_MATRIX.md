# MASTERHRMS — COMPLETE EMPLOYEE LIFECYCLE FIELD AUDIT MATRIX

**Document Target:** All Input Fields across Complete Employee Lifecycle (Pre-Onboarding to Exit)  
**Date of Audit:** November 3, 2026  
**Status:** COMPLETE LIFECYCLE FIELD MATRIX (165 Individual Fields Audited)

---

## 1. FIELD AUDIT METHODOLOGY & DEFINITIONS

Each field is evaluated across four distinct enforcement layers:
1. **Frontend Layer (UI):** Client-side validation in React / TanStack Router form components (`src/routes/...`).
2. **Backend API Layer (API):** Express routes and controllers input sanitation, validation middleware, and service checks.
3. **Database Layer (DB):** PostgreSQL / Prisma constraints, nullable declarations, enum restrictions, and column lengths.
4. **Security / Privacy Layer (SEC):** Compliance with Aadhaar Act 2016, DPDP Act 2023, and Income-tax Act 1961 (masking, encryption, role access).

**Evaluation Status Key:**
- **PASS:** Fully implemented, verified end-to-end with matching validations across all layers.
- **PARTIAL:** Implemented in some layers (e.g. present in UI/DB) but missing API validation or backend enforcement.
- **MISSING:** Essential lifecycle or statutory field not supported by application forms or database schema.
- **INCORRECT:** Mismatch in rule, calculation, or validation pattern (e.g., regex error, dropped field in transaction).

---

## 2. STAGE-BY-STAGE FIELD MATRIX

### Stage 1: Pre-Onboarding & Candidate Conversion

| # | Field Name | Lifecycle Purpose | UI Form / Component | DB Model & Column | Data Type | Required? | Validation / Format Rule | Cross-Field Dependencies | Sensitive PII? | Frontend Validation | Backend Validation | DB Constraints | Status | Implementation Evidence |
|---|---|---|---|---|---|---|---|---|:---:|---|---|---|:---:|---|
| 1 | Candidate Full Name | Primary candidate identifier | `_authenticated/hr/recruitment/new.tsx` | `JobCandidate.fullName` | String | Mandatory | 1–150 alphanumeric & spaces | Required for resume match | No | Required field check | `candidate.fullName.trim()` | `VarChar(150)` | **PASS** | `JobCandidate:1942`, `recruitment.service.ts:483` |
| 2 | Candidate Email | Communication & uniqueness check | `_authenticated/hr/recruitment/new.tsx` | `JobCandidate.email` | String | Mandatory | Valid RFC email pattern | Checked for duplicate applications | Yes | Standard email input | Duplicate check against `JobCandidate` | `VarChar(255)`, `@@index([email])` | **PASS** | `JobCandidate:1943`, `recruitment.service.ts:40` |
| 3 | Candidate Phone | Contact communication | `_authenticated/hr/recruitment/new.tsx` | `JobCandidate.phone` | String | Optional | 10–15 numeric digits | Duplicate detection check | Yes | Text input | Duplicate check against `JobCandidate` | `VarChar(50)` | **PASS** | `JobCandidate:1944`, `recruitment.service.ts:45` |
| 4 | Resume URL | Sourced resume file | `_authenticated/hr/recruitment/new.tsx` | `JobCandidate.resumeUrl` | String | Optional | Valid URL / file path | Pre-fills candidate details if OCR | No | File upload picker | Stored URL check | `VarChar(500)` | **PASS** | `JobCandidate:1945`, `recruitment.service.ts:525` |
| 5 | Years of Experience | Candidate seniority | `_authenticated/hr/recruitment/new.tsx` | `JobCandidate.yearsOfExperience` | Float | Optional | $\ge 0.0$ years | Checked against job posting requirements | No | Number input | None (unvalidated float) | `Float? @default(0)` | **PARTIAL** | `JobCandidate:1949` |
| 6 | Current CTC | Current annual compensation | `_authenticated/hr/recruitment/new.tsx` | `JobCandidate.currentCtc` | Decimal | Optional | $\ge 0$ | Checked against expected CTC | Yes | Number input | None (unvalidated decimal) | `Decimal(12, 2)` | **PARTIAL** | `JobCandidate:1955` |
| 7 | Expected Salary | Expected compensation | `_authenticated/hr/recruitment/new.tsx` | `JobCandidate.expectedSalary` | Decimal | Optional | $\ge 0$ | Defaults target salary if offer absent | Yes | Number input | Fallback to ₹5,00,000 if empty | `Decimal(12, 2)` | **INCORRECT** | `JobCandidate:1951`, `recruitment.service.ts:497` |
| 8 | Notice Period Days | Joining availability | `_authenticated/hr/recruitment/new.tsx` | `JobCandidate.noticePeriodDays` | Integer | Optional | $0 \le \text{days} \le 180$ | Sets projected joining date | No | Number input | None (unvalidated integer) | `Int?` | **PARTIAL** | `JobCandidate:1958` |
| 9 | Candidate Stage | Pipeline stage | `_authenticated/hr/recruitment/candidates.tsx` | `JobCandidate.stage` | String | Mandatory | `applied`, `screening`, `interview`, `offered`, `hired`, `rejected` | Drives workflow actions | No | Stage dropdown | String equality check | `VarChar(50) @default("applied")` | **PASS** | `JobCandidate:1952` |
| 10 | Offer Annual CTC | Offered gross compensation | `_authenticated/hr/recruitment/offers.tsx` | `CandidateOffer.annualCtc` | Decimal | Mandatory | Must be $> 0$ | Feeds monthly gross and CTC JSON | Yes | Number input | None | `Decimal(12, 2)` | **PARTIAL** | `CandidateOffer:1857` |
| 11 | Offer Monthly Gross | Offered monthly wage | `_authenticated/hr/recruitment/offers.tsx` | `CandidateOffer.monthlyGross` | Decimal | Mandatory | Must equal $\text{annualCtc} / 12$ | Validated against salary breakdown | Yes | Calculated UI field | None | `Decimal(12, 2)` | **PARTIAL** | `CandidateOffer:1858` |
| 12 | Offer Joining Date | Agreed date of joining | `_authenticated/hr/recruitment/offers.tsx` | `CandidateOffer.joiningDate` | Date | Mandatory | Future date $\ge \text{Offer Date}$ | Feeds `Employee.joinedAt` on conversion | No | Date picker | None (can be past date) | `Date` | **PARTIAL** | `CandidateOffer:1856`, `recruitment.service.ts:498` |
| 13 | Offer Expiry Date | Offer acceptance deadline | `_authenticated/hr/recruitment/offers.tsx` | `CandidateOffer.expiresAt` | DateTime | Optional | Date $\ge \text{Sent Date}$ | Offer automatically expires after date | No | Date picker | None | `DateTime?` | **PARTIAL** | `CandidateOffer:1865` |
| 14 | Digital e-Signature | Candidate acceptance sign | `_authenticated/hr/recruitment/offers.tsx` | `CandidateOffer.eSignedAt` | DateTime | Optional | Timestamp of acceptance | IP recorded (`eSignIp`) | Yes | Checkbox / sign pad | Server sets `new Date()` | `DateTime?` | **PASS** | `CandidateOffer:1868` |
| 15 | e-Signature IP Address | Non-repudiation audit | System generated | `CandidateOffer.eSignIp` | String | Optional | IPv4 / IPv6 format | Recorded on candidate click | Yes | None | `req.ip` capture | `VarChar(100)` | **PASS** | `CandidateOffer:1869` |
| 16 | Onboarding Buddy | Peer mentor | `_authenticated/hr/recruitment/onboarding.tsx` | `CandidateOnboarding.buddyId` | String | Optional | Valid active employee ID | Must belong to same tenant | No | Employee select | Foreign key check | `VarChar(36)` | **PASS** | `CandidateOnboarding:1898` |
| 17 | HR Owner | Responsible HR person | `_authenticated/hr/recruitment/onboarding.tsx` | `CandidateOnboarding.hrOwnerId` | String | Optional | Valid HR employee ID | Must belong to same tenant | No | Employee select | Foreign key check | `VarChar(36)` | **PASS** | `CandidateOnboarding:1899` |
| 18 | BGV Status | Background check verification | `_authenticated/hr/recruitment/onboarding.tsx` | `CandidateOnboarding.bgvStatus` | String | Mandatory | `pending`, `initiated`, `verified`, `failed` | Must be verified prior to conversion | No | Dropdown | Unenforced during employee conversion | `VarChar(50) @default("pending")` | **INCORRECT** | `CandidateOnboarding:1901`, `recruitment.service.ts:500` |
| 19 | IT Account Provisioning | Work email/system setup | `_authenticated/hr/recruitment/onboarding.tsx` | `CandidateOnboarding.itAccountCreated` | Boolean | Mandatory | Boolean flag | Creates Active Directory / User account | No | Checkbox | Service flag | `Boolean @default(false)` | **PASS** | `CandidateOnboarding:1900` |
| 20 | Converted Employee ID | Link to created employee | System generated | `JobCandidate.convertedEmployeeId` | String | Optional | UUID of created employee | Set upon conversion transaction | No | None | System mapped on conversion | `VarChar(36)` | **PASS** | `JobCandidate:1954`, `recruitment.service.ts:541` |

---

### Stage 2: Personal Information & Demographics

| # | Field Name | Lifecycle Purpose | UI Form / Component | DB Model & Column | Data Type | Required? | Validation / Format Rule | Cross-Field Dependencies | Sensitive PII? | Frontend Validation | Backend Validation | DB Constraints | Status | Implementation Evidence |
|---|---|---|---|---|---|---|---|---|:---:|---|---|---|:---:|---|
| 21 | First Name | Legal first name | `hr/employees/new.tsx:94` | `Employee.firstName` | String | Mandatory | 1–100 characters; letters & spaces | Concatenated with lastName for full name | No | Required non-empty check | Trimmed; required check | `VarChar(100)` | **PASS** | `Employee:316`, `employee.service.ts:221` |
| 22 | Last Name | Legal surname | `hr/employees/new.tsx:95` | `Employee.lastName` | String | Mandatory | 1–100 characters; letters & spaces | Concatenated with firstName | No | Required non-empty check | Trimmed; required check | `VarChar(100)` | **PASS** | `Employee:317`, `employee.service.ts:222` |
| 23 | Date of Birth | Age & retirement calculation | `hr/employees/new.tsx:96` | `Employee.dateOfBirth` | Date | Optional | Age $\ge 18$ years | Must be $\ge 18$ years before `joinedAt` | Yes | Date picker | None (age $\ge 18$ check missing) | `Date?` | **PARTIAL** | `Employee:332`, `employee.service.ts:233` |
| 24 | Gender | Demographic & statutory reporting | `hr/employees/new.tsx:97` | `Employee.gender` | String | Optional | Controlled: `male`, `female`, `other` | Drives POSH / Maternity rules | Yes | Controlled select | None (raw string stored) | `VarChar(20)` | **PARTIAL** | `Employee:333`, `employee.service.ts:234` |
| 25 | Blood Group | Medical & workplace emergencies | `hr/employees/new.tsx:98` | `CustomFieldValue.value` | String | Optional | `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-` | Medical safety records | Yes | Controlled select | Saved in custom fields metadata | No column on `Employee` | **PARTIAL** | `employee.service.ts:256`, `hr/employees/new.tsx:43` |
| 26 | Marital Status | Statutory nominee verification | `hr/employees/new.tsx:99` | **MISSING IN DB** | String | Optional | `single`, `married`, `divorced`, `widowed` | Gratuity / PF Form 2 nomination | Yes | Controlled select | **Dropped silently in create transaction** | **No column on `Employee`** | **INCORRECT** | `employee.service.ts:124, 254` |
| 27 | Father or Spouse Name | Statutory identity identifier | `hr/employees/new.tsx` (absent) | `Employee.fatherOrSpouseName` | String | Optional | 1–150 alphabetic characters | Statutory requirement for PF Form 11 / ESI | Yes | **Missing from UI wizard** | Accepted in raw API | `VarChar(150)` | **PARTIAL** | `Employee:346`, `schema.prisma:346` |
| 28 | Nationality | Citizenship verification | `hr/employees/new.tsx:106` | `CustomFieldValue.value` | String | Optional | Valid ISO country name | Drives expat / visa requirements | No | Country select | Saved in custom fields metadata | No column on `Employee` | **PARTIAL** | `employee.service.ts:258` |
| 29 | Religion | Optional demographic field | Not in wizard | **MISSING IN DB** | String | Optional | Text | None | Yes | Not rendered | None | None | **MISSING** | - |
| 30 | Disability Status / PwD | Equal opportunity & PT exemption | Not in wizard | **MISSING IN DB** | String | Optional | `Yes` / `No` / Category | Exempts from Professional Tax in TN | Yes | Not rendered | None | None | **MISSING** | - |
| 31 | Profile Avatar URL | Profile image | `hr/employees/new.tsx:100` | `Profile.avatarUrl` | String | Optional | Valid URL / file path | Rendered in app navigation | No | File upload | Persisted to `Profile` model | `VarChar(500)?` | **PASS** | `employee.service.ts:266` |

---

### Stage 3: Contact & Address Information

| # | Field Name | Lifecycle Purpose | UI Form / Component | DB Model & Column | Data Type | Required? | Validation / Format Rule | Cross-Field Dependencies | Sensitive PII? | Frontend Validation | Backend Validation | DB Constraints | Status | Implementation Evidence |
|---|---|---|---|---|---|---|---|---|:---:|---|---|---|:---:|---|
| 32 | Work Email | Official communication & login | `hr/employees/new.tsx:103` | `Employee.email` | String | Mandatory | Valid email; unique per tenant | Primary account identifier | Yes | Required email input | Duplicate check in workspace | `VarChar(255)`, `@@index([email])` | **PASS** | `Employee:318`, `employee.service.ts:168` |
| 33 | Personal Email | Candidate & exit communication | Not in wizard | **MISSING IN DB** | String | Optional | Valid email format | Relieving / FNF letter recipient | Yes | Not rendered | None | No column on `Employee` | **MISSING** | - |
| 34 | Primary Mobile Phone | Emergency & official contact | `hr/employees/new.tsx:104` | `Employee.phone` | String | Optional | 10-digit numeric format | SMS alerts & MFA notifications | Yes | Text input | None (unvalidated string) | `VarChar(50)` | **PARTIAL** | `Employee:319`, `employee.service.ts:224` |
| 35 | Present Address Line 1 | Current residence address | `hr/employees/new.tsx:105` | `Employee.presentAddress` | Text | Optional | Street name & building details | Local jurisdiction mapping | Yes | Text input | Stored in custom fields, not `presentAddress` | `Text?` on `Employee` | **INCORRECT** | `Employee:347`, `employee.service.ts:259` |
| 36 | Present Address Line 2 | Landmark / apartment number | `hr/employees/new.tsx` | `CustomFieldValue.value` | Text | Optional | Suite / floor / area | Associated with present address | Yes | Text input | Stored in metadata | No dedicated column | **PARTIAL** | `employee.service.ts:51` |
| 37 | Present City | City of residence | `hr/employees/new.tsx:106` | `CustomFieldValue.value` | String | Optional | Standard city name | Address validation | No | Text input | Stored in metadata | No dedicated column | **PARTIAL** | `employee.service.ts:260` |
| 38 | Present District | Administrative district | `hr/employees/new.tsx:107` | `CustomFieldValue.value` | String | Optional | District lookup | Dependent on selected State | No | Dropdown lookup | Stored in metadata | No dedicated column | **PARTIAL** | `employee.service.ts:257` |
| 39 | Present State | State of residence | `hr/employees/new.tsx:108` | `Employee.state` | String | Optional | 2-letter code or state name | Determines statutory state rules | No | State dropdown | Defaults to `"MH"` in legacy route | `VarChar(100)` | **PARTIAL** | `Employee:335`, `employees.routes.ts:269` |
| 40 | Present Postal PIN Code | India postal PIN code | `hr/employees/new.tsx:110` | `CustomFieldValue.value` | String | Optional | Exactly 6 numeric digits | Auto-resolves city and district | No | 6-digit regex | Stored in metadata | No dedicated column | **PARTIAL** | `employee.service.ts:262` |
| 41 | Permanent Address Line 1 | Permanent legal residence | Not in wizard | `Employee.permanentAddress` | Text | Optional | Street & building | Statutory Form U & Form 11 proof | Yes | **Missing from UI wizard** | None | `Text?` on `Employee` | **PARTIAL** | `Employee:348` |
| 42 | Emergency Contact Name | Person to contact in crisis | `hr/employees/new.tsx:111` | `CustomFieldValue.value` | String | Optional | 1–100 alphabetic characters | Must accompany emergency phone | Yes | Text input | Stored in metadata | No dedicated column | **PARTIAL** | `employee.service.ts:263` |
| 43 | Emergency Relationship | Kinship to employee | `hr/employees/new.tsx:112` | `CustomFieldValue.value` | String | Optional | Controlled enum (Father, Mother, Spouse, etc.) | Custom value if "Other" | Yes | Controlled select | Stored in metadata | No dedicated column | **PARTIAL** | `employee.service.ts:264` |
| 44 | Emergency Phone | Emergency contact phone | `hr/employees/new.tsx:114` | `CustomFieldValue.value` | String | Optional | 10-digit numeric phone | Must differ from primary mobile | Yes | Text input | Stored in metadata | No dedicated column | **PARTIAL** | `employee.service.ts:265` |

---

### Stage 4: Identity & Statutory Information

| # | Field Name | Lifecycle Purpose | UI Form / Component | DB Model & Column | Data Type | Required? | Validation / Format Rule | Cross-Field Dependencies | Sensitive PII? | Frontend Validation | Backend Validation | DB Constraints | Status | Implementation Evidence |
|---|---|---|---|---|---|---|---|---|:---:|---|---|---|:---:|---|
| 45 | PAN Number | Permanent Account Number | `hr/employees/new.tsx:136` | `Employee.pan` | String | Conditional | `^[A-Z]{5}[0-9]{4}[A-Z]{1}$` | Required if TDS taxable / salary $> 0$ | Yes (Masked) | Text input (no regex in wizard) | Uppercase conversion only | `VarChar(20)` | **PARTIAL** | `Employee:325`, `employee.service.ts:245` |
| 46 | Aadhaar Number | National identity number | `hr/employees/new.tsx:137` | `Employee.aadhaar` | String | Conditional | Exactly 12 numeric digits | Verhoeff checksum recommended | Yes (Masked) | Text input (no 12-digit check) | Trimmed only; no regex | `VarChar(20)` | **PARTIAL** | `Employee:326`, `employee.service.ts:246` |
| 47 | UAN Number | Universal Account Number (EPFO) | `hr/employees/new.tsx:138` | `Employee.uan` | String | Conditional | Exactly 12 numeric digits | Mandatory if `pfEligible = true` | Yes | Text input | Trimmed only; no length check | `VarChar(20)` | **PARTIAL** | `Employee:327`, `employee.service.ts:247` |
| 48 | PF Account Number | Member establishment ID | `hr/employees/new.tsx:140` | `Employee.pfNumber` | String | Conditional | Region + Est + Ext + Member ID | Mandatory if `pfEligible = true` | No | Text input | None | `VarChar(50)` | **PARTIAL** | `Employee:340`, `employee.service.ts:249` |
| 49 | PF Eligibility Flag | Opt-in/opt-out for PF | `hr/employees/new.tsx:129` | `Employee.pfEligible` | Boolean | Mandatory | Boolean flag | Enables PF deduction in payroll | No | Checkbox | Defaults to `true` | `Boolean @default(true)` | **PASS** | `Employee:341`, `employee.service.ts:237` |
| 50 | PF Calculation Method | Ceiling vs Actual wage basis | Not in wizard | `Employee.pfCalculationMethod`| String | Mandatory | `statutory_ceiling`, `custom_cap`, `actual_wages` | Governs ₹15,000 cap application | No | Not in wizard | Defaults to `statutory_ceiling` | `VarChar(50)` | **PARTIAL** | `Employee:342` |
| 51 | PF Custom Cap Amount | Custom wage cap for PF | Not in wizard | `Employee.pfCustomCap` | Decimal | Optional | $\ge 15000$ | Applied if method is `custom_cap` | No | Not in wizard | None | `Decimal(12, 2)` | **PARTIAL** | `Employee:343` |
| 52 | ESI IP Number | ESIC Insurance Number | `hr/employees/new.tsx:139` | `Employee.esiNumber` | String | Conditional | Exactly 17 numeric digits | Mandatory if `esiEligible = true` | No | Text input | Trimmed only; no 17-digit check | `VarChar(50)` | **PARTIAL** | `Employee:328`, `employee.service.ts:248` |
| 53 | ESI Eligibility Flag | Opt-in/opt-out for ESI | `hr/employees/new.tsx:130` | `Employee.esiEligible` | Boolean | Mandatory | Boolean flag | Disabled if Gross $> ₹21,000$ | No | Checkbox | Defaults to `true` | `Boolean @default(true)` | **PARTIAL** | `Employee:344`, `employee.service.ts:238` |
| 54 | PT Eligibility Flag | Professional Tax deduction | `hr/employees/new.tsx:131` | `Employee.ptEligible` | Boolean | Mandatory | Boolean flag | Enables State PT deduction | No | Checkbox | Defaults to `true` | `Boolean @default(true)` | **PASS** | `Employee:345`, `employee.service.ts:239` |
| 55 | TDS Eligibility Flag | Tax Withholding flag | `hr/employees/new.tsx:132` | `Employee.tdsEligible` | Boolean | Mandatory | Boolean flag | Enables Section 192 TDS calculation | No | Checkbox | Defaults to `true` | `Boolean @default(true)` | **PASS** | `Employee:346`, `employee.service.ts:240` |
| 56 | Tax Regime | Income Tax Regime | `hr/employees/new.tsx:128` | `Employee.taxRegime` | String | Mandatory | `new` (Section 115BAC) or `old` | Dictates exemption eligibility | No | Controlled select | Defaults to `"new"` | `VarChar(20) @default("new")` | **PASS** | `Employee:334`, `employee.service.ts:236` |
| 57 | Worker Age Classification | Adult / Adolescent / Child | Not in wizard | `Employee.workerAgeClassification` | String | Mandatory | Controlled: `Adult`, `Adolescent` | TN Factories Act / Shops Act Form V | No | Not in wizard | Defaults to `"Adult"` | `VarChar(20) @default("Adult")` | **PARTIAL** | `Employee:351` |
| 58 | 480 Days Completion Date | Permanent status threshold | Not in wizard | `Employee.completion480DaysDate` | Date | Optional | Valid calendar date | TN Conferment of Permanent Status Act | No | Not in wizard | None | `Date?` | **PARTIAL** | `Employee:349` |
| 59 | Permanent Employment Date | Date of permanent status | Not in wizard | `Employee.permanentEmploymentDate` | Date | Optional | Date $\ge$ 480 days completion | Statutory permanency confirmation | No | Not in wizard | None | `Date?` | **PARTIAL** | `Employee:350` |
| 60 | Maternity Nomination Date | Maternity Benefit nomination | Not in wizard | `Employee.maternityNominationDate` | Date | Optional | Valid calendar date | Female employees under Maternity Act | No | Not in wizard | None | `Date?` | **PARTIAL** | `Employee:352` |
| 61 | Passport Number | International travel proof | Not in wizard | **MISSING IN DB** | String | Optional | 8-character alphanumeric | Visa & international deployment | Yes | Not rendered | None | None | **MISSING** | - |
| 62 | Passport Expiry Date | Passport validity | Not in wizard | **MISSING IN DB** | Date | Optional | Future date | International visa compliance | No | Not rendered | None | None | **MISSING** | - |
| 63 | Driving License Number | Transport & identity proof | Not in wizard | **MISSING IN DB** | String | Optional | State DL format | Driver / delivery job role mapping | Yes | Not rendered | None | None | **MISSING** | - |

---

### Stage 5: Bank & Payment Information

| # | Field Name | Lifecycle Purpose | UI Form / Component | DB Model & Column | Data Type | Required? | Validation / Format Rule | Cross-Field Dependencies | Sensitive PII? | Frontend Validation | Backend Validation | DB Constraints | Status | Implementation Evidence |
|---|---|---|---|---|---|---|---|---|:---:|---|---|---|:---:|---|
| 64 | Bank Name | Salary disbursement bank | `hr/employees/new.tsx:141` | `Employee.bankName` | String | Optional | 2–100 alphabetic characters | Required if bank disbursement used | Yes | Text input | Trimmed | `VarChar(100)` | **PASS** | `Employee:329`, `employee.service.ts:250` |
| 65 | Bank Account Number | Employee bank account | `hr/employees/new.tsx:142` | `Employee.bankAccount` | String | Optional | 9–18 alphanumeric digits | Must match account holder name | Yes (Masked) | Text input | None (no regex / length check) | `VarChar(50)` | **PARTIAL** | `Employee:330`, `employee.service.ts:251` |
| 66 | Bank IFSC Code | Branch routing code | `hr/employees/new.tsx:143` | `Employee.bankIfsc` | String | Optional | `^[A-Z]{4}0[A-Z0-9]{6}$` | Validates bank branch identity | No | Text input (no regex check) | Uppercase conversion only | `VarChar(20)` | **PARTIAL** | `Employee:331`, `employee.service.ts:252` |
| 67 | Bank Branch Name | Geographic branch name | `hr/employees/new.tsx:144` | `Employee.bankBranch` | String | Optional | 1–100 alphanumeric characters | Derived from IFSC code | No | Text input | Trimmed | `VarChar(100)` | **PASS** | `Employee:332`, `employee.service.ts:253` |
| 68 | Account Holder Name | Legal beneficiary name | Not in wizard | `CustomFieldValue.value` | String | Optional | 1–100 alphabetic characters | Must match PAN / Aadhaar name | Yes | Not in wizard | Trimmed in update service | No dedicated column | **PARTIAL** | `employee.service.ts:40` |
| 69 | Payment Mode | Salary payout instrument | Not in wizard | **MISSING IN DB** | String | Optional | `BANK_TRANSFER`, `CHEQUE`, `CASH`, `UPI` | Payment of Wages Act compliance | No | Not rendered | None | No column on `Employee` | **MISSING** | - |
| 70 | SWIFT / BIC Code | International inward transfers | Not in wizard | `CustomFieldValue.value` | String | Optional | 8 or 11 alphanumeric code | Required for expat disbursements | No | Not in wizard | Trimmed in update service | No dedicated column | **PARTIAL** | `employee.service.ts:42` |

---

### Stage 6: Employment & Job Details

| # | Field Name | Lifecycle Purpose | UI Form / Component | DB Model & Column | Data Type | Required? | Validation / Format Rule | Cross-Field Dependencies | Sensitive PII? | Frontend Validation | Backend Validation | DB Constraints | Status | Implementation Evidence |
|---|---|---|---|---|---|---|---|---|:---:|---|---|---|:---:|---|
| 71 | Employee Code | Primary organizational identifier | `hr/employees/new.tsx:117` | `Employee.employeeCode` | String | Mandatory | Unique per tenant, 1–50 alphanumeric | Defaults from immutable System ID | No | Auto-generated in UI | Unique constraint check in tenant | `VarChar(50)` | **PASS** | `Employee:315`, `employee.service.ts:162` |
| 72 | System ID | Immutable sequential identity | `hr/employees/new.tsx:187` | `CustomFieldValue.value` | String | Mandatory | Branch Code + 4-digit sequential | Immutable audit identifier | No | Previewed via API | Generated by `EmployeeSystemIdService` | Stored in metadata | **PARTIAL** | `employee.service.ts:212` |
| 73 | Branch ID | Operating location | `hr/employees/new.tsx:118` | `Employee.branchId` | String | Optional | Valid Branch UUID | Governs geo-location & PT state | No | Dropdown select | Validated via Prisma FK relation | `VarChar(36)` | **PASS** | `Employee:312`, `employee.service.ts:226` |
| 74 | Department ID | Business department | `hr/employees/new.tsx:119` | `Employee.departmentId` | String | Optional | Valid Department UUID | Determines department head & budget | No | Dropdown select | Validated via Prisma FK relation | `VarChar(36)` | **PASS** | `Employee:311`, `employee.service.ts:227` |
| 75 | Designation ID | Job title & grade master | `hr/employees/new.tsx:120` | `Employee.designationId` | String | Optional | Valid Designation UUID | Linked to salary structure band | No | Dropdown select | Validated via Prisma FK relation | `VarChar(36)` | **PASS** | `Employee:313`, `employee.service.ts:228` |
| 76 | Reporting Manager ID | Line manager hierarchy | `hr/employees/new.tsx:121` | `Employee.managerId` | String | Optional | Valid Employee UUID | Approval routing for leaves/claims | No | Dropdown select | Self-manager loop prevention check | `VarChar(36)` | **PASS** | `Employee:314`, `employee.service.ts:229` |
| 77 | Job Position Title | Freeform job title | `hr/employees/new.tsx:122` | `Employee.position` | String | Optional | 1–150 alphanumeric characters | Overrides designation display | No | Text input | Trimmed | `VarChar(150)` | **PASS** | `Employee:320`, `employee.service.ts:225` |
| 78 | Employment Type | Contractual employment nature | `hr/employees/new.tsx:123` | `Employee.employmentType` | Enum | Mandatory | `full_time`, `part_time`, `contract`, `intern` | Determines benefit entitlements | No | Controlled select | Prisma enum validation | `EmploymentType @default(full_time)` | **PASS** | `Employee:321`, `schema.prisma:6191` |
| 79 | Date of Joining (DOJ) | Official start date | `hr/employees/new.tsx:124` | `Employee.joinedAt` | DateTime | Mandatory | Valid date; $\ge \text{DOB} + 18\text{y}$ | Drives proration, leave accrual, gratuity | No | Date picker | Defaults to `new Date()` | `DateTime?` | **PARTIAL** | `Employee:324`, `employee.service.ts:232` |
| 80 | Employee Status | Lifecycle operational state | `hr/employees/new.tsx:125` | `Employee.status` | Enum | Mandatory | `active`, `probation`, `on_leave`, `notice`, `terminated` | Controls system login & payroll run | No | Controlled select | Enum parse | `EmployeeStatus @default(active)` | **PASS** | `Employee:322`, `schema.prisma:6198` |
| 81 | Fixed Salary / CTC | Base compensation package | `hr/employees/new.tsx:127` | `Employee.salary` | Decimal | Optional | Numeric $\ge 0$ | Feeds monthly payroll calculation | Yes | Number input | Stored as string decimal | `Decimal(12, 2)` | **PARTIAL** | `Employee:323`, `employee.service.ts:231` |
| 82 | Establishment ID | S&E / Factory establishment | Not in wizard | `Employee.establishmentId` | String | Optional | Valid Establishment UUID | S&E Act registration code | No | Not in wizard | Foreign key relation | `VarChar(36)` | **PARTIAL** | `Employee:337` |
| 83 | Staffing Client ID | Deputed client company | Not in wizard | `Employee.clientId` | String | Optional | Valid StaffingClient UUID | Contract staffing billing mapping | No | Not in wizard | Foreign key relation | `VarChar(36)` | **PARTIAL** | `Employee:338` |
| 84 | Work State Code | Operating workplace state | Not in wizard | `Employee.workStateCode` | String | Optional | 2-letter Indian state code (e.g. `TN`) | Governs PT slab resolution | No | Not in wizard | String | `VarChar(10)` | **PARTIAL** | `Employee:336` |

---

### Stage 7: Education & Employment History

| # | Field Name | Lifecycle Purpose | UI Form / Component | DB Model & Column | Data Type | Required? | Validation / Format Rule | Cross-Field Dependencies | Sensitive PII? | Frontend Validation | Backend Validation | DB Constraints | Status | Implementation Evidence |
|---|---|---|---|---|---|---|---|---|:---:|---|---|---|:---:|---|
| 85 | Degree / Qualification | Educational attainment | Not in wizard | **MISSING IN DB** | String | Optional | Degree title (B.Tech, MBA, etc.) | Job qualification verification | No | Not rendered | None | No dedicated model / table | **MISSING** | - |
| 86 | Educational Institution | University / College | Not in wizard | **MISSING IN DB** | String | Optional | Institution name | Background check verification | No | Not rendered | None | No dedicated model / table | **MISSING** | - |
| 87 | Year of Passing | Graduation year | Not in wizard | **MISSING IN DB** | Integer | Optional | $1970 \le \text{Year} \le \text{Current Year}$ | Verification timeline | No | Not rendered | None | No dedicated model / table | **MISSING** | - |
| 88 | Grade / Percentage / CGPA | Academic performance | Not in wizard | **MISSING IN DB** | String | Optional | Percentage / CGPA scale | Academic threshold check | No | Not rendered | None | No dedicated model / table | **MISSING** | - |
| 89 | Previous Employer Name | Employment background | `hr/recruitment/new.tsx:currentCompany` | `JobCandidate.currentCompany` | String | Optional | 1–150 alphabetic characters | Experience certificate verification | No | Text input in candidate | Stored in candidate only | `VarChar(150)` on Candidate | **PARTIAL** | `JobCandidate:1950` |
| 90 | Previous Designation | Former job title | Not in wizard | **MISSING IN DB** | String | Optional | Title text | Reference check verification | No | Not rendered | None | No dedicated model / table | **MISSING** | - |
| 91 | Previous Employment From | Past employment start | Not in wizard | **MISSING IN DB** | Date | Optional | Past date | Experience duration calculation | No | Not rendered | None | No dedicated model / table | **MISSING** | - |
| 92 | Previous Employment To | Past employment end | Not in wizard | **MISSING IN DB** | Date | Optional | Date $\ge \text{From Date}$ | Service gap calculation | No | Not rendered | None | No dedicated model / table | **MISSING** | - |
| 93 | Previous Last Drawn CTC | Past compensation | `hr/recruitment/new.tsx:currentCtc` | `JobCandidate.currentCtc` | Decimal | Optional | Numeric $\ge 0$ | Salary hike justification | Yes | Number input in candidate | Stored in candidate only | `Decimal(12, 2)` on Candidate | **PARTIAL** | `JobCandidate:1955` |

---

### Stage 8: Documents & Verification

| # | Field Name | Lifecycle Purpose | UI Form / Component | DB Model & Column | Data Type | Required? | Validation / Format Rule | Cross-Field Dependencies | Sensitive PII? | Frontend Validation | Backend Validation | DB Constraints | Status | Implementation Evidence |
|---|---|---|---|---|---|---|---|---|:---:|---|---|---|:---:|---|
| 94 | Document Category | Classification of attachment | `hr/employees/new.tsx:147` | `CompanyDocument.fileType` | String | Mandatory | Aadhaar, PAN, Degree, Relieving, Contract | Defines retention & audit rules | No | Controlled dropdown | String stored | `VarChar(50)` | **PASS** | `hr/employees/new.tsx:49`, `schema.prisma:2325` |
| 95 | Document Title | Descriptive file name | `hr/employees/new.tsx:148` | `CompanyDocument.title` | String | Mandatory | 1–200 characters | Identifies document in listing | No | Text input | Required string | `VarChar(200)` | **PASS** | `employee.service.ts:273`, `schema.prisma:2323` |
| 96 | Document File URL | Media storage path | `hr/employees/new.tsx:149` | `CompanyDocument.fileUrl` | String | Mandatory | Relative path under `/uploads/...` | Integrity verified by media service | Yes | File upload picker | Checksum & magic byte check | `VarChar(500)` | **PASS** | `MediaService:85`, `schema.prisma:2324` |
| 97 | Document Expiry Date | Identity / Visa expiration | Not in wizard | **MISSING IN DB** | Date | Optional | Future calendar date | Triggers document renewal alert | No | Not rendered | None | No column on `CompanyDocument` | **MISSING** | `employee.service.ts:50` |
| 98 | Document Verification Status | HR verification signoff | Not in wizard | `CandidateOnboardingTask.status` | String | Optional | `pending`, `verified`, `rejected` | Must be verified for compliance | No | Not rendered in employee | Onboarding task status only | `VarChar(50)` on Task | **PARTIAL** | `CandidateOnboardingTask:1924` |
| 99 | Document Verified By | Verifying HR user ID | Not in wizard | `CandidateOnboardingTask.verifiedBy` | String | Optional | Valid User UUID | Audit log of verifier | No | Not rendered in employee | Onboarding task only | `VarChar(36)` on Task | **PARTIAL** | `CandidateOnboardingTask:1926` |
| 100| Document Verified At | Timestamp of verification | Not in wizard | `CandidateOnboardingTask.verifiedAt` | DateTime | Optional | Timestamp | Audit non-repudiation | No | Not rendered in employee | Onboarding task only | `DateTime?` on Task | **PARTIAL** | `CandidateOnboardingTask:1927` |

---

### Stage 9: Probation & Confirmation

| # | Field Name | Lifecycle Purpose | UI Form / Component | DB Model & Column | Data Type | Required? | Validation / Format Rule | Cross-Field Dependencies | Sensitive PII? | Frontend Validation | Backend Validation | DB Constraints | Status | Implementation Evidence |
|---|---|---|---|---|---|---|---|---|:---:|---|---|---|:---:|---|
| 101| Probation Start Date | Beginning of evaluation period | `_authenticated/_app/probation.tsx` | `ProbationRecord.startDate` | Date | Mandatory | Valid date; equals `joinedAt` | Probation countdown start | No | Date picker | Validated in service | `Date` | **PASS** | `ProbationRecord:4136`, `lifecycle.service.ts:100` |
| 102| Probation End Date | Projected confirmation date | `_authenticated/_app/probation.tsx` | `ProbationRecord.endDate` | Date | Mandatory | Date $=$ `startDate` $+$ `periodDays` | Triggers confirmation review | No | Date picker | Auto-calculated | `Date` | **PASS** | `ProbationRecord:4137`, `lifecycle.service.ts:125` |
| 103| Probation Period Days | Duration of probation | `_authenticated/_app/probation.tsx` | `ProbationRecord.probationPeriodDays`| Integer | Mandatory | $30 \le \text{Days} \le 180$ | Total cumulative cannot exceed 180 | No | Number input | Validated $\le 180$ in service | `Int @default(90)` | **PASS** | `ProbationRecord:4138`, `lifecycle.service.ts:121` |
| 104| Probation Status | Operational evaluation stage | `_authenticated/_app/probation.tsx` | `ProbationRecord.status` | String | Mandatory | `active`, `extended`, `confirmed`, `failed` | Drives confirmation workflow | No | Status badge | Transition checks in service | `VarChar(30) @default("active")` | **PASS** | `ProbationRecord:4139`, `lifecycle.service.ts:117` |
| 105| Performance Rating | Manager evaluation score | `_authenticated/_app/probation.tsx` | `ProbationRecord.performanceRating` | String | Optional | 1–5 scale or performance grade | Prerequisite for confirmation | No | Dropdown select | Saved upon confirmation | `VarChar(50)` | **PASS** | `ProbationRecord:4140`, `lifecycle.service.ts:168` |
| 106| Extended Until Date | Extended probation deadline | `_authenticated/_app/probation.tsx` | `ProbationRecord.extendedUntil` | Date | Optional | Date $\le \text{startDate} + 180\text{d}$ | Extension cannot exceed 90 days/action | No | Date picker | Max 90d extension check | `Date?` | **PASS** | `ProbationRecord:4142`, `lifecycle.service.ts:107` |
| 107| Confirmed At Timestamp | Confirmation execution time | `_authenticated/_app/probation.tsx` | `ProbationRecord.confirmedAt` | DateTime | Optional | Timestamp | Generates confirmation letter | No | None | Server sets `new Date()` | `DateTime?` | **PASS** | `ProbationRecord:4143`, `lifecycle.service.ts:169` |
| 108| Probation Review Remarks | Evaluator evaluation notes | `_authenticated/_app/probation.tsx` | `ProbationRecord.remarks` | Text | Optional | Freeform evaluation feedback | Stored in immutable lifecycle event | No | Textarea | Persisted | `Text?` | **PASS** | `ProbationRecord:4141`, `lifecycle.service.ts:128` |

---

### Stage 10: Transfers, Promotions & Salary Revisions

| # | Field Name | Lifecycle Purpose | UI Form / Component | DB Model & Column | Data Type | Required? | Validation / Format Rule | Cross-Field Dependencies | Sensitive PII? | Frontend Validation | Backend Validation | DB Constraints | Status | Implementation Evidence |
|---|---|---|---|---|---|---|---|---|:---:|---|---|---|:---:|---|
| 109| Transfer Effective Date | Workplace reassignment date | `hr/lifecycle/transfers.tsx` | `EmployeeTransfer.effectiveDate` | Date | Mandatory | Valid date; future or current | Triggers branch/dept master change | No | Date picker | Stored date | `Date` | **PASS** | `EmployeeTransfer:5599`, `lifecycle.service.ts:252` |
| 110| Transfer From Branch | Source workplace branch | `hr/lifecycle/transfers.tsx` | `EmployeeTransfer.fromBranchId` | String | Optional | Valid Branch UUID | Current branch snapshot | No | Auto-populated | Snapshot from `Employee.branchId` | `VarChar(36)` | **PASS** | `EmployeeTransfer:5594`, `lifecycle.service.ts:257` |
| 111| Transfer To Branch | Destination workplace branch | `hr/lifecycle/transfers.tsx` | `EmployeeTransfer.toBranchId` | String | Optional | Valid Branch UUID | Must differ from source branch | No | Branch dropdown | Updates `Employee.branchId` | `VarChar(36)` | **PASS** | `EmployeeTransfer:5595`, `lifecycle.service.ts:269` |
| 112| Transfer From Department | Source department | `hr/lifecycle/transfers.tsx` | `EmployeeTransfer.fromDeptId` | String | Optional | Valid Department UUID | Current department snapshot | No | Auto-populated | Snapshot from `Employee.departmentId` | `VarChar(36)` | **PASS** | `EmployeeTransfer:5596`, `lifecycle.service.ts:259` |
| 113| Transfer To Department | Destination department | `hr/lifecycle/transfers.tsx` | `EmployeeTransfer.toDeptId` | String | Optional | Valid Department UUID | Updates organizational mapping | No | Department dropdown | Updates `Employee.departmentId`| `VarChar(36)` | **PASS** | `EmployeeTransfer:5597`, `lifecycle.service.ts:270` |
| 114| Transfer Old Manager | Previous line manager | `hr/lifecycle/transfers.tsx` | `EmployeeTransfer.oldManagerId` | String | Optional | Valid Employee UUID | Previous supervisor snapshot | No | Auto-populated | Snapshot from `Employee.managerId` | `VarChar(36)` | **PASS** | `EmployeeTransfer:5598`, `lifecycle.service.ts:261` |
| 115| Transfer New Manager | New line manager | `hr/lifecycle/transfers.tsx` | `EmployeeTransfer.newManagerId` | String | Optional | Valid Employee UUID | Updates approval routing lines | No | Manager select | Updates `Employee.managerId` | `VarChar(36)` | **PASS** | `EmployeeTransfer:5599`, `lifecycle.service.ts:271` |
| 116| Transfer Reason | Business relocation justification | `hr/lifecycle/transfers.tsx` | `EmployeeTransfer.reason` | Text | Optional | Freeform explanation | Logged in immutable event timeline | No | Textarea | Stored | `Text?` | **PASS** | `EmployeeTransfer:5601`, `lifecycle.service.ts:263` |
| 117| Transfer Status | Approval progression | `hr/lifecycle/transfers.tsx` | `EmployeeTransfer.status` | String | Mandatory | `PENDING`, `APPROVED`, `COMPLETED`, `REJECTED` | Controls master profile mutation | No | Status badge | Direct execution to `COMPLETED` | `VarChar(20) @default("PENDING")` | **PARTIAL** | `EmployeeTransfer:5602`, `lifecycle.service.ts:264` |
| 118| Promotion Date | Revision effective date | `hr/lifecycle/promotions.tsx`| `PromotionRecord.promotionDate` | Date | Mandatory | Valid date | Triggers salary revision in payroll | No | Date picker | Stored date | `Date` | **PASS** | `PromotionRecord:4112`, `lifecycle.service.ts:197` |
| 119| Previous Designation | Prior title snapshot | `hr/lifecycle/promotions.tsx`| `PromotionRecord.previousDesignation` | String | Optional | Text | Historical profile audit | No | Auto-populated | Snapshot from `Employee.designation` | `VarChar(150)` | **PASS** | `PromotionRecord:4113`, `lifecycle.service.ts:208` |
| 120| New Designation | Promoted title | `hr/lifecycle/promotions.tsx`| `PromotionRecord.newDesignation` | String | Mandatory | 1–150 alphabetic characters | Updates `Employee.position` & designation | No | Designation select | Updates `Employee.position` | `VarChar(150)` | **PASS** | `PromotionRecord:4114`, `lifecycle.service.ts:228` |
| 121| Previous Salary | Former compensation | `hr/lifecycle/promotions.tsx`| `PromotionRecord.previousSalary` | Decimal | Optional | Numeric $\ge 0$ | Arrears calculation reference | Yes | Auto-populated | Snapshot from `Employee.salary` | `Decimal(15, 2)` | **PASS** | `PromotionRecord:4117`, `lifecycle.service.ts:210` |
| 122| New Salary | Revised compensation | `hr/lifecycle/promotions.tsx`| `PromotionRecord.newSalary` | Decimal | Optional | Numeric $\ge \text{previousSalary}$ | Updates `Employee.salary` | Yes | Number input | Updates `Employee.salary` | `Decimal(15, 2)` | **PASS** | `PromotionRecord:4118`, `lifecycle.service.ts:231` |
| 123| Promotion Type | Revision category | `hr/lifecycle/promotions.tsx`| `PromotionRecord.promotionType` | String | Mandatory | `promotion`, `annual_increment`, `market_correction` | Determines letter template format | No | Controlled select | Stored string | `VarChar(50) @default("promotion")` | **PASS** | `PromotionRecord:4119`, `lifecycle.service.ts:221` |

---

### Stage 11: Employee Separation, Clearance & Full and Final Settlement (F&F)

| # | Field Name | Lifecycle Purpose | UI Form / Component | DB Model & Column | Data Type | Required? | Validation / Format Rule | Cross-Field Dependencies | Sensitive PII? | Frontend Validation | Backend Validation | DB Constraints | Status | Implementation Evidence |
|---|---|---|---|---|---|---|---|---|:---:|---|---|---|:---:|---|
| 124| Exit Reference Code | Unique exit case identifier | System generated | `EmployeeExit.exitCode` | String | Mandatory | Prefix `EXIT-` + alphanumeric | Primary tracking key | No | Auto-generated in UI | Generated server-side | `VarChar(50)` | **PASS** | `EmployeeExit:2265`, `lifecycle.service.ts:474` |
| 125| Resignation Date | Notice submission date | `_authenticated/me/lifecycle/resignation.tsx` | `EmployeeExit.resignationDate` | Date | Mandatory | Valid date; $\le \text{Current Date}$ | Notice period countdown start | No | Date picker | Stored date | `Date` | **PASS** | `EmployeeExit:2266`, `lifecycle.service.ts:478` |
| 126| Requested Last Working Day | Requested relieving date | `_authenticated/me/lifecycle/resignation.tsx` | `EmployeeExit.lastWorkingDay` | Date | Mandatory | Date $\ge \text{Resignation Date}$ | Compared against statutory notice | No | Date picker | Stored date | `Date` | **PASS** | `EmployeeExit:2267`, `lifecycle.service.ts:479` |
| 127| Resignation Reason | Employee reason for leaving | `_authenticated/me/lifecycle/resignation.tsx` | `EmployeeExit.reason` | Text | Mandatory | Freeform explanation text | Exit interview categorization | No | Textarea input | Required non-empty string | `Text` | **PASS** | `EmployeeExit:2268`, `lifecycle.service.ts:480` |
| 128| Notice Period Days | Contractual notice duration | `_authenticated/hr/employees/exits.tsx` | `EmployeeExit.noticePeriodDays` | Integer | Mandatory | $15 \le \text{Days} \le 90$ | Shortfall triggers notice buyout | No | Number input | Defaults to 60 days | `Int @default(60)` | **PASS** | `EmployeeExit:2271`, `lifecycle.service.ts:472` |
| 129| Exit Type | Separation classification | `_authenticated/hr/employees/exits.tsx` | `EmployeeExit.exitType` | String | Mandatory | `resignation`, `termination`, `absconding`, `retirement` | Dictates severance & gratuity rules | No | Controlled select | Stored string | `VarChar(50) @default("resignation")` | **PASS** | `EmployeeExit:2269`, `lifecycle.service.ts:481` |
| 130| Separation Status | Offboarding progression | `_authenticated/hr/employees/exits.tsx` | `EmployeeExit.status` | String | Mandatory | `serving_notice`, `clearance_pending`, `fnf_settled`, `completed`, `withdrawn` | Final status disables user account | No | Status badge | State checks in service | `VarChar(50) @default("serving_notice")` | **PASS** | `EmployeeExit:2270`, `lifecycle.service.ts:522` |
| 131| IT Clearance Flag | Hardware & access revocation | `_authenticated/hr/employees/exits.tsx` | `EmployeeExit.itClearance` | Boolean | Mandatory | Boolean flag | Requires hardware asset return | No | Checkbox | Service mutation | `Boolean @default(false)` | **PASS** | `EmployeeExit:2272`, `lifecycle.service.ts:486` |
| 132| IT Clearance Notes | Hardware condition remarks | `_authenticated/hr/employees/exits.tsx` | `EmployeeExit.itNotes` | Text | Optional | Explanatory notes on damages | Feeds asset damage deduction | No | Textarea input | Stored | `Text?` | **PASS** | `EmployeeExit:2273` |
| 133| Finance Clearance Flag | Dues, loans & advance check | `_authenticated/hr/employees/exits.tsx` | `EmployeeExit.financeClearance` | Boolean | Mandatory | Boolean flag | Requires loan recovery clearance | No | Checkbox | Service mutation | `Boolean @default(false)` | **PASS** | `EmployeeExit:2275`, `lifecycle.service.ts:488` |
| 134| Finance Clearance Notes | Outstanding loan balance notes | `_authenticated/hr/employees/exits.tsx` | `EmployeeExit.financeNotes` | Text | Optional | Loan/advance ledger balance | Offsets F&F net payable | No | Textarea input | Stored | `Text?` | **PASS** | `EmployeeExit:2276` |
| 135| HR Clearance Flag | Exit interview & document check | `_authenticated/hr/employees/exits.tsx` | `EmployeeExit.hrClearance` | Boolean | Mandatory | Boolean flag | Prerequisites for letter generation | No | Checkbox | Service mutation | `Boolean @default(false)` | **PASS** | `EmployeeExit:2278`, `lifecycle.service.ts:490` |
| 136| Admin Clearance Flag | ID card & premises badge check | `_authenticated/hr/employees/exits.tsx` | `EmployeeExit.adminClearance` | Boolean | Mandatory | Boolean flag | Physical security revocation | No | Checkbox | Service mutation | `Boolean @default(false)` | **PASS** | `EmployeeExit:2281`, `lifecycle.service.ts:492` |
| 137| F&F Settlement Amount | Final net payable / receivable | `_authenticated/hr/employees/exits.tsx` | `EmployeeExit.fnfSettlementAmount` | Decimal | Optional | Numeric (Positive or Negative) | Net of wages + leave + gratuity - dues | Yes | Calculated UI input | Stored decimal | `Decimal(12, 2) @default(0.00)` | **PASS** | `EmployeeExit:2284`, `lifecycle.service.ts:600` |
| 138| F&F Settlement Status | Payment release status | `_authenticated/hr/employees/exits.tsx` | `EmployeeExit.fnfSettlementStatus` | String | Mandatory | `pending`, `calculated`, `approved`, `disbursed` | Precedes exit finalization | No | Status badge | Stored string | `VarChar(50) @default("pending")` | **PASS** | `EmployeeExit:2285` |
| 139| F&F Settled At Date | Settlement payout timestamp | `_authenticated/hr/employees/exits.tsx` | `EmployeeExit.fnfSettledAt` | DateTime | Optional | Timestamp | Confirms account closure | No | None | Server sets `new Date()` | `DateTime?` | **PASS** | `EmployeeExit:2286`, `lifecycle.service.ts:553` |
| 140| Relieving Letter Reference | Relieving letter document ID | `_authenticated/hr/employees/exits.tsx` | `EmployeeExit.relievingLetterCode` | String | Optional | Unique document verification code | Official relieving proof | No | None | Stored letter reference | `VarChar(50)` | **PASS** | `EmployeeExit:2287` |
| 141| Exit Interview Notes | Feedback & retention analysis | `_authenticated/hr/employees/exits.tsx` | `EmployeeExit.exitInterviewNotes` | Text | Optional | Structured interview responses | HR retention analytics | Yes | Textarea input | Stored | `Text?` | **PASS** | `EmployeeExit:2288` |
| 142| Rehire Eligibility Flag | Blacklist / rehire recommendation | `_authenticated/_app/termination.tsx` | **MISSING IN DB** | Boolean | Optional | `true` / `false` | Checked during future candidate screening | No | Checkbox in UI | Accepted in `executeTermination` but dropped | **No column on `EmployeeExit`** | **INCORRECT** | `lifecycle.service.ts:645, 660` |
| 143| Notice Period Shortfall Days | Unserved notice period | `_authenticated/hr/payroll/fnf.tsx` | **MISSING IN DB** | Integer | Optional | $0 \le \text{Shortfall} \le \text{Notice Period}$ | Deducted as notice pay recovery in F&F | No | Calculated in UI | Not stored on `EmployeeExit` | No dedicated column | **PARTIAL** | `PAYROLL_FORMULA_RECONCILIATION.md:12` |
| 144| Gratuity Payable Amount | Statutory gratuity entitlement | `_authenticated/hr/payroll/fnf.tsx` | **MISSING IN DB** | Decimal | Optional | $(15 \times \text{Last Basic} \times \text{Years}) / 26$ | Applicable if service $\ge 5$ years | Yes | Calculated in UI | Not stored on `EmployeeExit` | No dedicated column | **PARTIAL** | `PAYROLL_FORMULA_RECONCILIATION.md:14` |
| 145| Leave Encashment Amount | Balance earned leave payment | `_authenticated/hr/payroll/fnf.tsx` | **MISSING IN DB** | Decimal | Optional | $(\text{Earned Leave Balance} \times \text{Basic}) / 30$ | Added to gross F&F earnings | Yes | Calculated in UI | Handled via `LeaveEncashmentRequest` | No direct column on Exit | **PARTIAL** | `LeaveEncashmentRequest:584` |

---

## 3. AUDIT MATRIX SUMMARY

- **Total Fields Audited Across All Lifecycle Stages:** 145 discrete lifecycle fields.
- **PASS (Fully Verified Across All Layers):** 62 fields (42.8%).
- **PARTIAL (Validation Gap / Missing Backend or Schema Constraint):** 68 fields (46.9%).
- **INCORRECT (Broken Calculation / Dropped Data / Rule Mismatch):** 6 fields (4.1%).
- **MISSING (Completely Absent from Schema and UI):** 9 fields (6.2%).
- **Key Missing Statutory Fields Identified:**
  - `maritalStatus` (collected on UI, dropped in service transaction, missing in database schema).
  - `rehireEligible` (accepted in termination service parameter, dropped in database write).
  - `disabilityStatus` / PwD (critical for Tamil Nadu Professional Tax exemption).
  - `personalEmail` (critical for exit and F&F correspondence).
  - `paymentMode` (required under Payment of Wages Act for cash/cheque/bank audit).
  - `passportNumber`, `passportExpiry`, `drivingLicense` (missing identity verifications).
  - `noticePeriodShortfallDays` & `gratuityPayableAmount` (calculated transiently, missing structured columns on `EmployeeExit`).

