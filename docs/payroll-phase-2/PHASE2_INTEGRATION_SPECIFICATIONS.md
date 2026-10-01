# Phase 2 Technical Integration Specifications
## Advanced Payroll Module: External Integrations & Format Specifications

**Document ID**: `DOC-P2-009`  
**Classification**: Technical Protocol & Hardware Specification  
**Status**: APPROVED ARCHITECTURAL SPECIFICATION  
**Date**: October 1, 2026  
**Architect**: Principal Integration Engineer & Senior Payroll Architect  

---

## 1. Advisory Receipt OCR Integration Specification

### 1.1 Architectural Principle
OCR extraction is **strictly advisory**. The OCR engine suggests values into form fields; it **never** automatically approves claims or bypasses human approval.

### 1.2 Provider Options & Recommendation
1. **Option A: Self-Hosted Tesseract / LayoutLM (Local)**
   - *Pros*: Zero recurring API cost; 100% data privacy within tenant boundaries.
   - *Cons*: Lower accuracy on folded, thermal, or hand-annotated paper receipts.
2. **Option B: Cloud Vision API (Google Cloud Document AI / AWS Textract / Azure Form Recognizer)**
   - *Pros*: High accuracy (95%+ on receipts, automatic merchant/tax bounding boxes).
   - *Cons*: External network dependency and per-page API billing.
3. **Recommended Hybrid Architecture**:
   - Utilize a pluggable `OcrProviderAdapter` interface. Default implementation uses local extraction (Tesseract/pdf-parse) with fallback/upgrade configuration to Cloud Document AI via tenant setting.

### 1.3 Advisory Confidence Thresholds
- **Confidence >= 90%**: Green indicator, pre-fills fields without modal warnings.
- **Confidence 70% – 89%**: Amber indicator, pre-fills fields with alert: `Please verify merchant and amount against original receipt`.
- **Confidence < 70%**: Red indicator, leaves fields blank, displays raw receipt in viewer for manual entry.

---

## 2. Biometric Hardware Protocol Specifications

### 2.1 ZKTeco Integration Profile
- **Primary Protocol**: ZKTeco ADMS (Automatic Data Master Server) HTTP Push.
- **Port**: HTTP 80 / 4000 (Backend listener at `/iclock/cdata`).
- **Device Configuration**:
  - Web Server URL: `http://<server-ip>:4000/iclock/`
  - Push Protocol: `iClock / Push SDK 2.0`
- **Secondary Protocol (Direct Socket Polling)**:
  - Protocol: ZK UDP/TCP protocol on port `4370`.
  - Implemented in: [zk-protocol.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/zk-protocol.ts) using `node-zklib`.

### 2.2 Matrix COSEC Integration Profile
- **Primary Protocol**: Matrix COSEC Web API / REST Push Notification.
- **Communication Pattern**: Matrix Door Controller (e.g. COSEC VEGA, COSEC ARGO) configured with an HTTP Webhook callback endpoint.
- **Callback Route**: `POST /api/biometric/matrix/push`
- **Payload Format (JSON/XML)**:
  ```json
  {
    "device_id": "COSEC-ARGO-01",
    "event_time": "2026-10-01 09:30:15",
    "user_id": "1002",
    "event_code": 1,
    "event_name": "Access Granted",
    "verification_mode": "FACE"
  }
  ```
- **Security**: Device requests pass a shared pre-shared key header: `X-Matrix-Auth: <tenant-device-secret>`.

### 2.3 eSSL Hardware Integration Profile
- **Architecture**: eSSL biometric terminals (e.g. eSSL Identix, K30, MB160) are predominantly ZKTeco OEM hardware.
- **Compatibility Modes**:
  - *Mode 1 (ADMS Enabled)*: Configure device server address to ERP's `/iclock/cdata`. Operates identically to ZKTeco push.
  - *Mode 2 (LAN Socket)*: Polled directly via TCP Port 4370 using `zk-protocol.ts`.
  - *Mode 3 (eTimeTrack Server Sync)*: For legacy desktop eTimeTrack installations, an agent sync script polls the MS Access / SQL Server database and posts punches to `/api/biometric/push`.

---

## 3. Corporate Bank Payout File Specifications

### 3.1 ICICI Bank Corporate Internet Banking (CIB)
- **File Format**: Pipe-delimited flat file (`.txt`)
- **Character Encoding**: ASCII / UTF-8
- **Structure**:
  - **Header Record**: `H^<ClientCode>^<BatchRef>^<ValueDate>^<TotalCount>^<TotalAmount>`
  - **Detail Record (`D^`)**:
    1. Record Type: `D`
    2. Payment Mode: `NFT` (NEFT), `RTG` (RTGS), or `IFT` (Internal Fund Transfer)
    3. Debit Account Number: 12-digit ICICI Current Account
    4. Value Date: `DD/MM/YYYY`
    5. Amount: Numeric in Rupees with 2 decimal places (e.g. `27000.00`)
    6. Beneficiary Name: Max 35 chars, alphanumeric
    7. Beneficiary Account Number: Max 34 chars
    8. Beneficiary Bank IFSC: 11 characters
    9. Narration / Remarks: Max 30 chars (e.g. `Salary Oct 2026`)

### 3.2 HDFC Bank Enet Corporate Banking
- **File Format**: Comma-separated value (`.csv`)
- **Structure**:
  - Column 1: Transaction Type (`P` for Payment)
  - Column 2: Beneficiary Code / Employee ID
  - Column 3: Beneficiary Account Number
  - Column 4: Amount (e.g. `27000.00`)
  - Column 5: Beneficiary Name (as per bank records)
  - Column 6: Drawee Location (Bank branch city)
  - Column 7: Print Location
  - Column 8: Beneficiary Email
  - Column 9: Payment Reference Number
  - Column 10: Value Date (`DD/MM/YYYY`)
  - Column 11: Beneficiary IFSC Code (Mandatory for NEFT/RTGS)

### 3.3 State Bank of India (SBI) Corporate Multi-Payment System (CMP)
- **File Format**: Fixed-width text or CSV
- **Structure**:
  - Record Type: `TXN`
  - Sender Account: SBI 11-digit or 17-digit account number
  - Beneficiary IFSC: 11 characters
  - Beneficiary Account Number: 9–18 digits
  - Beneficiary Name: Max 40 characters
  - Amount: Numeric without commas
  - Payment Narration: `SALARY_MMYYYY`
  - Trailer Record: `TRL^<TotalTransactions>^<TotalAmount>`

---

## 4. Digital Signature (DSC) Integration Specification

### 4.1 Requirement & Compliance
Corporate banking portals (especially ICICI and SBI corporate gateways) reject bulk payout files unless accompanied by a cryptographic digital signature file verifying the authorized corporate signatory.

### 4.2 Technical Architecture
- **Signature Standard**: PKCS#7 / Cryptographic Message Syntax (CMS) detached signature (`.sig` or `.p7s`).
- **Signature Algorithm**: `SHA256withRSA` (2048-bit key) or `ECDSA with P-256`.
- **Certificate Type**: Class 3 Digital Signature Certificate (DSC) issued by a licensed Certifying Authority (eMudhra, Capricorn, VSign).
- **Signing Execution Topology**:
  - *Browser USB Token Bridge*: Modern browsers cannot access USB hardware tokens directly. A lightweight local WebSocket signing bridge (e.g. Web PKI or QZ Tray component) connects to the user's USB DSC token, signs the file hash, and produces the detached `.sig` file for portal upload.
  - *Server-Side HSM Option (Enterprise)*: For cloud-native automated signing, keys are stored in a secure cloud KMS / HSM (FIPS 140-2 Level 3), authorized only upon multi-factor dual approval.
