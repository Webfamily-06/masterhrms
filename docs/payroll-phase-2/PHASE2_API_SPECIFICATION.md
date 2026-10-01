# Phase 2 REST API Specification & Endpoint Contracts
## Advanced Payroll Module: API Endpoints (Planning & Proposed Contracts)

**Document ID**: `DOC-P2-006`  
**Classification**: API Specification  
**Status**: DESIGN ONLY — DO NOT IMPLEMENT YET  
**Date**: October 1, 2026  
**Architect**: Principal Software Architect  

---

## 1. Global Conventions & Standards

All proposed Phase 2 endpoints strictly follow existing ERP backend conventions:
- **Authentication**: JWT Bearer token in `Authorization: Bearer <token>` header.
- **Tenant Context**: Automatically resolved from JWT payload (`req.user.tenantId`).
- **Response Format**: Standard JSON `{ success: boolean, data?: any, error?: string }` except binary/stream file downloads.
- **Error Codes**:
  - `400 Bad Request`: Validation failure or malformed payload.
  - `401 Unauthorized`: Missing or invalid JWT.
  - `403 Forbidden`: Insufficient RBAC role.
  - `404 Not Found`: Entity not found or belongs to another tenant.
  - `409 Conflict`: Business rule violation (e.g. modifying locked payroll run or batch).
  - `500 Internal Server Error`: Unhandled server exception.

---

## 2. P2.1 — Employee Reimbursements & OCR API Specification

### 2.1 Advisory Receipt OCR Extraction
- **Method / Route**: `POST /api/expenses/claims/ocr-extract`
- **Purpose**: Accepts a receipt image or PDF and returns structured extracted fields for form pre-fill.
- **Permissions**: `employee`, `manager`, `hr_admin`, `super_admin`
- **Request Body (Multipart or JSON Base64)**:
  ```json
  {
    "fileBase64": "data:image/png;base64,iVBORw0KGgo...",
    "fileName": "fuel_bill_oct2026.png",
    "mimeType": "image/png"
  }
  ```
- **Response Structure (200 OK)**:
  ```json
  {
    "success": true,
    "extraction": {
      "merchant": "HP Petrol Pump Koramangala",
      "expenseDate": "2026-10-01",
      "invoiceNumber": "HP-984321",
      "amount": 2500.00,
      "taxAmount": 381.35,
      "confidence": 94.5,
      "suggestedCategoryCode": "TRV",
      "isAdvisoryOnly": true
    }
  }
  ```
- **Error Cases**: `400` Unsupported file type; `422` Unreadable document.

---

### 2.2 Secure Claim Submission with Integrity Hash
- **Method / Route**: `POST /api/expenses/claims/submit`
- **Purpose**: Creates an expense claim with receipt upload and SHA-256 duplicate validation.
- **Permissions**: `employee`, `hr_admin`
- **Request Body**:
  ```json
  {
    "categoryId": "cat-uuid-trv",
    "title": "Client Travel to Chennai Site",
    "amount": 4200.00,
    "expenseDate": "2026-09-28",
    "merchant": "Uber India Systems",
    "description": "Taxi fare to client facility",
    "reimbursementMethod": "payroll_addition",
    "payrollMonth": "2026-10",
    "fileBase64": "...",
    "fileName": "uber_trip.pdf"
  }
  ```
- **Response Structure (201 Created)**:
  ```json
  {
    "success": true,
    "claim": {
      "id": "claim-uuid-001",
      "claimCode": "EXP-7821",
      "status": "pending",
      "receiptHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "isDuplicateWarning": false
    }
  }
  ```
- **Audit Event**: `EXPENSE_CLAIM_FILED` logged to `PayrollAuditTrail`.

---

## 3. P2.2 — Flexible Benefit Plan (FBP) & Tax Declarations API

### 3.1 Get Employee FBP Allocation Basket
- **Method / Route**: `GET /api/fbp/declarations/me`
- **Purpose**: Retrieves employee's active FBP declaration and available component ceilings.
- **Permissions**: `employee`, `hr_admin`
- **Response Structure (200 OK)**:
  ```json
  {
    "success": true,
    "financialYear": "2026-2027",
    "taxRegime": "new",
    "totalFbpPool": 240000.00,
    "status": "draft",
    "items": [
      { "componentCode": "FUEL", "name": "Fuel & Driver Allowance", "annualDeclared": 60000, "maxAnnualCap": 96000 },
      { "componentCode": "TEL", "name": "Telephone & Internet", "annualDeclared": 36000, "maxAnnualCap": 60000 },
      { "componentCode": "MEAL", "name": "Meal Allowance", "annualDeclared": 26400, "maxAnnualCap": 26400 }
    ]
  }
  ```

---

### 3.2 Submit FBP Allocation Basket
- **Method / Route**: `POST /api/fbp/declarations/submit`
- **Purpose**: Submits or updates the employee's FBP allocation.
- **Permissions**: `employee`, `hr_admin`
- **Request Body**:
  ```json
  {
    "financialYear": "2026-2027",
    "items": [
      { "componentCode": "FUEL", "annualDeclared": 60000 },
      { "componentCode": "TEL", "annualDeclared": 36000 },
      { "componentCode": "MEAL", "annualDeclared": 26400 }
    ]
  }
  ```
- **Validation**: Sum of `annualDeclared` cannot exceed `totalFbpPool`. No item can exceed `maxAnnualCap`.

---

### 3.3 Verify Tax Declaration Proof (HR Workspace)
- **Method / Route**: `PUT /api/tax-declarations/proofs/:proofId/verify`
- **Purpose**: Approves or rejects an employee tax deduction proof with verified amount.
- **Permissions**: `hr_admin`, `super_admin`
- **Request Body**:
  ```json
  {
    "status": "verified",
    "approvedAmount": 50000.00,
    "rejectionReason": null,
    "reviewerNotes": "Verified against LIC policy receipt dated 2026-08-10"
  }
  ```
- **Response Structure (200 OK)**:
  ```json
  {
    "success": true,
    "proof": { "id": "proof-uuid-1", "status": "verified", "approvedAmount": 50000.00 }
  }
  ```

---

## 4. P2.3 — Biometric Hardware & Ingestion API

### 4.1 Matrix COSEC Webhook Receiver
- **Method / Route**: `POST /api/biometric/matrix/push`
- **Purpose**: Receives real-time attendance events from Matrix COSEC door controllers / devices.
- **Permissions**: Public endpoint with Device API Key validation in headers (`X-Matrix-Device-Key`).
- **Request Body**:
  ```json
  {
    "deviceId": "COSEC-VEGA-01",
    "events": [
      {
        "userId": "1004",
        "timestamp": "2026-10-01 09:14:22",
        "eventCode": "CHECK_IN",
        "verificationType": "FACE_RECOGNITION"
      }
    ]
  }
  ```
- **Response Structure (200 OK)**:
  ```json
  { "success": true, "processedCount": 1, "status": "ACK" }
  ```

---

### 4.2 Trigger Overnight Attendance Reconciliation Worker
- **Method / Route**: `POST /api/biometric/reconcile`
- **Purpose**: Executes punch log to shift attendance reconciliation for a date range.
- **Permissions**: `hr_admin`, `super_admin`
- **Request Body**:
  ```json
  {
    "startDate": "2026-09-01",
    "endDate": "2026-09-30",
    "departmentId": "all"
  }
  ```
- **Response Structure (200 OK)**:
  ```json
  {
    "success": true,
    "reconciledDays": 30,
    "attendanceCreated": 1440,
    "lateMarksDetected": 38,
    "lopDaysCalculated": 12.5
  }
  ```

---

## 5. P2.4 — Bank Disbursement File Generator API

### 5.1 Pre-Disbursement Bank Diagnostic Validation
- **Method / Route**: `POST /api/payroll/runs/:id/disbursement/validate`
- **Purpose**: Validates account numbers and IFSC codes for all employees in a completed run.
- **Permissions**: `hr_admin`, `super_admin`
- **Response Structure (200 OK)**:
  ```json
  {
    "success": true,
    "canDisburse": true,
    "totalPayees": 48,
    "totalNetPay": 1425600.00,
    "blockers": [],
    "warnings": []
  }
  ```

---

### 5.2 Generate & Download Bank Disbursement File
- **Method / Route**: `POST /api/payroll/runs/:id/disbursement/generate`
- **Purpose**: Generates ICICI, HDFC, or SBI payment file, creates batch record, and streams formatted text/CSV.
- **Permissions**: `hr_admin`, `super_admin`
- **Request Body**:
  ```json
  {
    "bankCode": "HDFC",
    "debitAccountNumber": "50200012345678",
    "batchReference": "SAL-202608-HDFC-01",
    "valueDate": "2026-10-02"
  }
  ```
- **Response Structure (200 OK - File Stream)**:
  - Header: `Content-Disposition: attachment; filename="SAL_202608_HDFC_01.csv"`
  - Content-Type: `text/csv`
  - Body: Formatted bank transmission text.

---

## 6. P2.5 — Statutory Returns & Portals API

### 6.1 Generate EPF ECR v2.0 Text File
- **Method / Route**: `GET /api/payroll/runs/:id/statutory/epf-ecr`
- **Purpose**: Streams the EPFO Unified Portal compliant `#~#` delimited text file.
- **Query Parameters**: `establishmentId` (optional, defaults to primary establishment).
- **Permissions**: `hr_admin`, `super_admin`
- **Response (200 OK - File Stream)**:
  - Header: `Content-Disposition: attachment; filename="ECR_202608_TN_EST01.txt"`
  - Content-Type: `text/plain`
  - Body: Formatted 11-column string:
    ```
    101234567890#~#ESTHER NIRMALA P#~#30000#~#15000#~#15000#~#15000#~#1800#~#1250#~#550#~#0#~#0
    101234567891#~#SOWMIYA S#~#26129#~#15000#~#15000#~#15000#~#1800#~#1250#~#550#~#4#~#0
    ```

---

### 6.2 Generate ESIC Monthly Return Portal File
- **Method / Route**: `GET /api/payroll/runs/:id/statutory/esic-return`
- **Purpose**: Streams the official ESIC portal Excel workbook (`.xlsx`).
- **Query Parameters**: `establishmentId`.
- **Permissions**: `hr_admin`, `super_admin`
- **Response (200 OK - File Stream)**:
  - Header: `Content-Disposition: attachment; filename="ESIC_MONTHLY_202608.xlsx"`
  - Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
