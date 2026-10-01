# WAVE 2.4 — API DOCUMENTATION
## RESTful Endpoints: Bank Disbursement & Statutory Returns Subsystems

---

## 1. Bank Disbursement Endpoints (`/api/payroll/disbursement`)

### 1.1 `GET /api/payroll/disbursement/batches`
- **Description**: Returns all payout batches for current tenant.
- **Access**: HR Admin, Super Admin, Finance.
- **Response**: Array of `BankDisbursementBatch` objects with associated `payrollRun`.

### 1.2 `POST /api/payroll/disbursement/batches`
- **Description**: Creates a new payout batch from an approved/finalized payroll run.
- **Request Body**:
  ```json
  {
    "payrollRunId": "uuid",
    "bankCode": "ICICI | HDFC | SBI",
    "debitAccountNumber": "000901552345",
    "clientCode": "OPTIONAL_CLIENT_CODE",
    "narration": "Salary Payout"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "batch": { "id": "uuid", "batchReference": "PAY-ICICI-202610-A1B2C3", "status": "draft", ... },
    "eligibleCount": 48,
    "totalDisbursement": 1205517.70
  }
  ```

### 1.3 `GET /api/payroll/disbursement/batches/:id`
- **Description**: Returns batch details with masked beneficiary items (`••••••••1234`).
- **Response**:
  ```json
  {
    "batch": { ... },
    "items": [
      {
        "id": "uuid",
        "beneficiaryName": "John Doe",
        "accountNumber": "••••••••4556",
        "ifscCode": "ICIC0000009",
        "amount": 35000,
        "paymentMode": "NEFT"
      }
    ]
  }
  ```

### 1.4 `POST /api/payroll/disbursement/batches/:id/approve`
- **Description**: Transitions batch status from `draft` to `approved`.
- **Response (200 OK)**: Updated batch object.

### 1.5 `POST /api/payroll/disbursement/batches/:id/generate`
- **Description**: Generates target bank payout file and optionally attaches detached PKCS#7 signature.
- **Request Body**:
  ```json
  {
    "digitallySign": true,
    "signerName": "CFO Signatory"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "fileName": "PAY-ICICI-202610-A1B2C3_ICICI_CIB.txt",
    "fileHash": "sha256_hex_digest",
    "isDigitallySigned": true,
    "batch": { "status": "generated", ... }
  }
  ```

### 1.6 `GET /api/payroll/disbursement/batches/:id/download`
- **Description**: Streams the generated payout file with secure headers (`Content-Disposition: attachment`).
- **Security**: Authenticated via Bearer token or signed query token; tenant-isolated.

### 1.7 `POST /api/payroll/disbursement/batches/:id/disburse`
- **Description**: Confirms bank execution, records bank reference/UTR, and transitions to terminal `disbursed` status.
- **Request Body**:
  ```json
  { "bankReference": "CMS20261001099234" }
  ```

---

## 2. Statutory Return Endpoints (`/api/payroll/statutory`)

### 2.1 `GET /api/payroll/statutory/filings`
- **Description**: Lists all statutory return filings for tenant.
- **Response**: Array of `StatutoryReturnFiling` records.

### 2.2 `POST /api/payroll/statutory/ecr/generate`
- **Description**: Generates official EPFO ECR v2.0 (#~# delimited) text file with Para 8(3) Age 58 cutoff logic.
- **Request Body**:
  ```json
  { "payrollRunId": "uuid", "establishmentId": "optional_uuid" }
  ```
- **Response (200 OK)**:
  ```json
  {
    "filing": { "id": "uuid", "returnType": "EPF_ECR", "totalMembers": 48, ... },
    "fileName": "EPF_ECR_2026_10.txt",
    "fileHash": "sha256_hex_digest"
  }
  ```

### 2.3 `POST /api/payroll/statutory/esic/generate`
- **Description**: Generates ESIC monthly return (.xlsx or .csv) with 0.75%/3.25% reconciliation.
- **Request Body**:
  ```json
  { "payrollRunId": "uuid", "format": "xlsx | csv" }
  ```

### 2.4 `GET /api/payroll/statutory/filings/:id/download`
- **Description**: Streams portal return file (`.txt`, `.xlsx`, `.csv`) with authenticated download guard.

### 2.5 `POST /api/payroll/statutory/filings/:id/trrn`
- **Description**: Records government payment TRRN and marks filing as `paid`.
- **Request Body**:
  ```json
  { "challanTrrn": "1012609012345", "status": "paid" }
  ```
