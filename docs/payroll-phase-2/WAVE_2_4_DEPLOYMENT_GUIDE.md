# WAVE 2.4 — DEPLOYMENT & OPERATIONS GUIDE
## Configuration, Environment Variables, File Storage, and Production Runbooks

---

## 1. Environment Variables Configuration

Add the following environment variables to `server/.env`:

```ini
# Storage root for tenant artifacts (defaults to server/storage/tenants)
TENANT_STORAGE_DIR="storage/tenants"

# Corporate Digital Signature Configuration (Optional in dev, required for prod host-to-host bank transmission)
CORPORATE_SIGNING_PRIVATE_KEY_PATH="/etc/ssl/certs/corporate_signing_key.pem"
CORPORATE_SIGNING_CERT_PATH="/etc/ssl/certs/corporate_signing_cert.pem"
CORPORATE_SIGNING_KEY_PASSPHRASE="your_production_secure_passphrase"
```

---

## 2. Directory Structure & Permissions

Ensure the storage directory has appropriate file system permissions:
```bash
mkdir -p server/storage/tenants
chmod -R 750 server/storage/tenants
```

Subdirectories are automatically provisioned on-demand by tenant ID:
- `storage/tenants/{tenantId}/disbursement/`
- `storage/tenants/{tenantId}/statutory/`

---

## 3. Database Migration Execution

Apply schema changes to production MySQL:
```bash
cd server
npx prisma db push
```

Verify tables created:
- `bank_disbursement_batches`
- `bank_disbursement_items`
- `statutory_return_filings`

---

## 4. Operational Runbook

### Routine Monthly Payout & Statutory Filing Flow:
1. **Day 28 - 30**: Finalize and approve the monthly `PayrollRun`.
2. **Day 1**:
   - Navigate to `/payroll` ➔ **Bank Disbursement** tab.
   - Click **New Disbursement Batch**, select corporate bank adapter (e.g. ICICI, HDFC, or SBI), and verify debit account.
   - Click **Approve** and then **Generate / Sign** with authorized officer identity.
   - Download the signed payout file and upload to the corporate banking portal.
3. **Day 2**:
   - Once the bank executes the transfer, click **Disburse** on the batch and enter the Bank UTR / Reference.
4. **Day 5 - 15**:
   - Navigate to `/payroll` ➔ **EPF & ESIC Returns** tab.
   - Click **Generate ECR** for the finalized run; download and upload to the EPFO Unified Portal.
   - Click **Generate ESIC** for the finalized run; download and upload to the ESIC portal.
   - After paying the challans, click **Record TRRN** and enter the government receipt reference numbers.

---

## 5. Mandatory Pre-Production Operational Checklist

Before initiating live production disbursements or statutory filings, the operations and finance teams MUST complete and sign off on the following four pre-production verification gates:

### Gate 1: Confirm Actual Bank Acceptance of Each Payout Format
- **ICICI Bank (CIB Caret Format)**: Submit a UAT sample file to the ICICI CMS/CIB integration desk to confirm acceptance of header (`H^...`) and detail (`D^...`) lines.
- **HDFC Bank (Corporate Enet CSV)**: Submit a sample 11-column CSV file to the HDFC Enet product team for format validation.
- **State Bank of India (SBI CMP Flat File)**: Validate the `HDR|...`, `TXN|...`, and `TRL|...` record layout with the SBI Corporate Salary Package (CSP) team.
- **Sign-Off Condition**: Formal acknowledgment from each corporate banking partner that test files parse cleanly without syntax or character set errors.

### Gate 2: Verify EPF and ESIC Files Against Official Specifications
- **EPFO Unified Employer Portal**: Upload a generated ECR 2.0 text file to the EPFO portal sandbox/test validator. Confirm 11-column `#~#` formatting, member count reconciliation, and Para 8(3) Age 58 EPS wage cutoff rules.
- **ESIC Portal**: Perform a test validation upload of the generated `.xlsx` and `.csv` files on the ESIC employer portal. Confirm that Insurance Person (IP) records, contribution calculations (0.75% EE / 3.25% ER), and reason codes match portal expectations.
- **Sign-Off Condition**: Zero schema or delimiter rejections upon portal pre-upload validation.

### Gate 3: Test Real Certificate-Based Signing & Secure Key Management
- **Certificate Installation**: Install the production Class 2/3 Digital Signature Certificate (DSC) issued by a licensed Certifying Authority (e.g. eMudhra, Sify, Capricorn).
- **Key Security**: Configure `CORPORATE_SIGNING_PRIVATE_KEY_PATH` and `CORPORATE_SIGNING_CERT_PATH`. Ensure private keys are stored outside the web root with restricted permissions (`chmod 600`) or within an enterprise HSM/KMS.
- **Verification**: Execute test signing on a batch payout file. Confirm that `verifyDetachedSignature` validates successfully and that intentional byte alteration is immediately flagged.
- **Sign-Off Condition**: Successful detached PKCS#7 / RSA-SHA256 signature generation and verification using production credentials.

### Gate 4: Perform Production Deployment & Payout Reconciliation Test
- **Staging Deployment**: Deploy backend and frontend builds to the production staging environment. Verify database migrations on the target database instance.
- **Controlled Pilot Disbursement**: Execute a controlled test disbursement with a designated pilot group (e.g. 2–5 internal test accounts).
- **End-to-End Reconciliation**: Verify bank debit scroll / UTR confirmation against `bank_disbursement_items`, confirm batch transitions to `disbursed`, and verify that duplicate disbursement attempts are strictly rejected.
- **Sign-Off Condition**: 100% reconciliation between bank debits, employee credit notifications, and HRMS ledger entries.

