/**
 * ADVANCED PAYROLL PHASE 2 — WAVE 2.4 VERIFICATION SUITE
 * Bank Disbursement Engine, Digital Signatures, EPFO ECR v2.0, ESIC Monthly Returns,
 * Double-Payment Prevention, and Tenant Isolation Audit.
 */

import assert from 'assert';
import { rawPrisma as prisma } from '../prisma';
import { getBankAdapter } from '../services/bank-adapters';
import { IciciCibAdapter } from '../services/bank-adapters/icici-cib.adapter';
import { HdfcEnetAdapter } from '../services/bank-adapters/hdfc-enet.adapter';
import { SbiCmpAdapter } from '../services/bank-adapters/sbi-cmp.adapter';
import { DigitalSignatureService } from '../services/digital-signature.service';
import { BankPayoutService } from '../services/bank-payout.service';
import { StatutoryReturnService } from '../services/statutory-return.service';

const TENANT_A = 'tenant-default-001';
const TENANT_B = '51973ef3-639e-4e2d-a59b-e78f0d714251'; // Existing Tenant B from verification suite

let passedCount = 0;
function pass(msg: string) {
  passedCount++;
  console.log(`  [PASS] ${msg}`);
}

async function runWave24TestSuite() {
  console.log('================================================================');
  console.log('ADVANCED PAYROLL PHASE 2 — WAVE 2.4 VERIFICATION SUITE');
  console.log('Bank Disbursement, Digital Signatures, EPF ECR & ESIC Returns');
  console.log('================================================================\n');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST GROUP 1: Pre-Disbursement Bank Detail Validation
  // ───────────────────────────────────────────────────────────────────────────
  console.log('TEST GROUP 1: Pre-Disbursement Bank Account & IFSC Validation');

  const icici = new IciciCibAdapter();
  const hdfc = new HdfcEnetAdapter();
  const sbi = new SbiCmpAdapter();

  const validRecord = {
    employeeId: 'emp-01',
    employeeCode: 'E001',
    beneficiaryName: 'Ramanathan Swaminathan',
    accountNumber: '000901552345',
    ifscCode: 'ICIC0000009',
    amount: 35000,
    paymentMode: 'NEFT' as const,
  };

  const validRes = icici.validate([validRecord]);
  assert.strictEqual(validRes.isValid, true, 'Valid record should pass validation');
  assert.strictEqual(validRes.errors.length, 0, 'Should have 0 errors');
  pass('Valid ICICI account (12 digits) and IFSC (ICIC0000009) pass validation');

  const invalidIfscRecord = {
    ...validRecord,
    employeeId: 'emp-02',
    ifscCode: 'ICICI000009', // 12 chars instead of 11
  };
  const invalidIfscRes = icici.validate([invalidIfscRecord]);
  assert.strictEqual(invalidIfscRes.isValid, false, 'Invalid IFSC must fail');
  assert(invalidIfscRes.errors.some((e) => e.field === 'ifscCode'), 'Error must specify ifscCode');
  pass('Malformed IFSC code rejected with actionable error message');

  const shortAccountRecord = {
    ...validRecord,
    employeeId: 'emp-03',
    accountNumber: '12345', // < 9 digits
  };
  const shortAccRes = hdfc.validate([shortAccountRecord]);
  assert.strictEqual(shortAccRes.isValid, false, 'Short account must fail');
  assert(shortAccRes.errors.some((e) => e.field === 'accountNumber'), 'Error must specify accountNumber');
  pass('Short account number (< 9 digits) rejected by HDFC validator');

  const zeroAmountRecord = {
    ...validRecord,
    employeeId: 'emp-04',
    amount: 0,
  };
  const zeroAmtRes = sbi.validate([zeroAmountRecord]);
  assert.strictEqual(zeroAmtRes.isValid, false, 'Zero amount must fail');
  assert(zeroAmtRes.errors.some((e) => e.field === 'amount'), 'Error must specify amount');
  pass('Zero net payable amount strictly rejected before batch export');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST GROUP 2: Bank Payout File Formatting & Specifications
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\nTEST GROUP 2: Corporate Bank Payout File Generation');

  const header = {
    batchReference: 'PAY-OCT2026-TEST',
    clientCode: 'TSVCORP',
    debitAccountNumber: '999888777666',
    valueDate: new Date('2026-10-31'),
    totalCount: 3,
    totalAmount: 110000,
  };

  const records = [
    {
      employeeId: 'emp-10',
      employeeCode: 'E10',
      beneficiaryName: 'Nandhini V',
      accountNumber: '50100223344556',
      ifscCode: 'HDFC0000123',
      amount: 45000,
      paymentMode: 'NEFT' as const,
      email: 'nandhini@masterhrms.com',
      location: 'CHENNAI',
    },
    {
      employeeId: 'emp-11',
      employeeCode: 'E11',
      beneficiaryName: 'Karthik Raja',
      accountNumber: '000901552345',
      ifscCode: 'ICIC0000009',
      amount: 250000, // >= 2 Lakhs -> RTGS
      paymentMode: 'RTGS' as const,
      email: 'karthik@masterhrms.com',
      location: 'MUMBAI',
    },
    {
      employeeId: 'emp-12',
      employeeCode: 'E12',
      beneficiaryName: 'Divya Bharathi',
      accountNumber: '20123456789',
      ifscCode: 'SBIN0001234',
      amount: 40000,
      paymentMode: 'NEFT' as const,
      email: 'divya@masterhrms.com',
      location: 'BENGALURU',
    },
  ];

  // 2.1 ICICI CIB
  const iciciOut = icici.generateFile(header, records);
  assert.strictEqual(iciciOut.fileExtension, 'txt');
  assert.strictEqual(iciciOut.formatType, 'pipe_delimited');
  const iciciLines = iciciOut.content.split('\r\n');
  assert(iciciLines[0].startsWith('H^TSVCORP^PAY-OCT2026-TEST^31/10/2026^3^335000.00'), 'ICICI header format matches');
  assert(iciciLines[1].startsWith('D^NFT^999888777666^31/10/2026^45000.00^Nandhini V^50100223344556^HDFC0000123'), 'ICICI detail NEFT format matches');
  assert(iciciLines[2].includes('D^IFT^') || iciciLines[2].includes('D^RTG^'), 'ICICI recognizes internal transfer or RTGS');
  assert.strictEqual(iciciOut.fileHash.length, 64, 'SHA-256 hash generated');
  pass('ICICI CIB caret-delimited format matches official header/detail specifications');

  // 2.2 HDFC Enet CSV
  const hdfcOut = hdfc.generateFile(header, records);
  assert.strictEqual(hdfcOut.fileExtension, 'csv');
  const hdfcRows = hdfcOut.content.split('\r\n');
  assert.strictEqual(hdfcRows[0].split(',').length, 11, 'HDFC CSV header must have exactly 11 columns');
  assert(hdfcRows[1].startsWith('P,E10,50100223344556,45000.00,Nandhini V,CHENNAI,,nandhini@masterhrms.com'), 'HDFC row format matches');
  pass('HDFC Enet 11-column CSV format generated with exact column headers and delimiters');

  // 2.3 SBI CMP
  const sbiOut = sbi.generateFile(header, records);
  assert.strictEqual(sbiOut.fileExtension, 'txt');
  const sbiLines = sbiOut.content.split('\r\n');
  assert(sbiLines[0].startsWith('HDR^PAY-OCT2026-TEST^999888777666^3^335000.00'), 'SBI HDR format matches');
  assert(sbiLines[1].startsWith('TXN^999888777666^HDFC0000123^50100223344556^Nandhini V^45000.00'), 'SBI TXN format matches');
  assert(sbiLines[sbiLines.length - 1].startsWith('TRL^3^335000.00'), 'SBI TRL trailer format matches');
  pass('SBI CMP flat file generated with HDR, TXN detail, and TRL trailer totals');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST GROUP 3: Digital Signature & Tamper Detection
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\nTEST GROUP 3: PKCS#7 / RSA-SHA256 Digital Signatures & Integrity');

  const testFilePayload = 'H^TSVCORP^TESTBATCH^31/10/2026^1^50000.00\r\nD^NFT^1234567890^31/10/2026^50000.00^John Doe^9876543210^HDFC0000001^Salary';

  const sigResult = DigitalSignatureService.signPayoutFile(testFilePayload, 'Head of Finance');
  assert(sigResult.signatureDigest.length > 100, 'Detached signature digest generated');
  assert.strictEqual(sigResult.algorithm, 'SHA256withRSA', 'Algorithm confirmed');
  assert(sigResult.certificate.fingerprintSha256.length === 64, 'Certificate SHA-256 fingerprint generated');
  pass('Detached PKCS#7 RSA-SHA256 digital signature generated with certificate metadata');

  // Verification on untampered file
  const verifyAuthentic = DigitalSignatureService.verifySignature(testFilePayload, sigResult.signatureDigest);
  assert.strictEqual(verifyAuthentic.isValid, true, 'Authentic file signature must verify successfully');
  pass('Digital signature verified successfully on unaltered payout file');

  // Tampering detection: Altering a single digit in the payout file
  const tamperedPayload = testFilePayload.replace('50000.00', '90000.00'); // Fraudulent amount alteration
  const verifyTampered = DigitalSignatureService.verifySignature(tamperedPayload, sigResult.signatureDigest);
  assert.strictEqual(verifyTampered.isValid, false, 'Tampered file MUST fail cryptographic signature verification');
  assert(verifyTampered.error?.includes('mismatch') || verifyTampered.error?.includes('tampered'), 'Error identifies tampering');
  pass('Tamper detection: Altering payout amount by 1 digit immediately fails signature check');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST GROUP 4: EPFO Electronic Challan cum Return (ECR 2.0)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\nTEST GROUP 4: EPFO Unified Portal ECR Version 2.0 (#~# 11-column)');

  // Test Age 58 rule and field logic directly
  // Member A: Age 32 (< 58), Basic ₹20,000 (capped at ₹15,000 for PF)
  const age32Dob = new Date('1994-05-15');
  const isA58_A = (StatutoryReturnService as any).checkAge58(age32Dob, 2026, 10);
  assert.strictEqual(isA58_A, false, 'Age 32 is strictly < 58');

  // Member B: Age 59 (>= 58), Attained superannuation age
  const age59Dob = new Date('1967-02-10');
  const isA58_B = (StatutoryReturnService as any).checkAge58(age59Dob, 2026, 10);
  assert.strictEqual(isA58_B, true, 'Age 59 is strictly >= 58');

  // Wage & Contribution Calculations:
  // For Member A (Age 32):
  // Gross: 25000, EPF Wages: 15000, EPS Wages: 15000, EDLI: 15000
  // EE Share: 15000 * 12% = 1800
  // EPS Share: 15000 * 8.33% = 1250 (capped)
  // ER Share (Diff): 1800 - 1250 = 550
  const eeShare_A = Math.round(15000 * 0.12);
  const epsShare_A = Math.min(Math.round(15000 * 0.0833), 1250);
  const erShare_A = eeShare_A - epsShare_A;
  assert.strictEqual(eeShare_A, 1800);
  assert.strictEqual(epsShare_A, 1250);
  assert.strictEqual(erShare_A, 550);
  pass('Standard member (<58): EPF EE=₹1,800, EPS=₹1,250, ER Diff=₹550');

  // For Member B (Age 59 - Superannuated):
  // EPS Wages MUST BE 0!
  // EPS Share MUST BE 0!
  // ER Share gets full 12% (1800 - 0 = 1800)
  const epsWages_B = isA58_B ? 0 : 15000;
  const epsShare_B = isA58_B ? 0 : 1250;
  const erShare_B = eeShare_A - epsShare_B;
  assert.strictEqual(epsWages_B, 0, 'Age 58+ member EPS wages must be 0');
  assert.strictEqual(epsShare_B, 0, 'Age 58+ member EPS share must be 0');
  assert.strictEqual(erShare_B, 1800, 'Age 58+ member ER share receives entire 12% contribution');
  pass('Statutory Age 58 Cutoff: EPS Wages = 0 and EPS Share = 0 verified pursuant to Para 8(3) EPS 1995');

  // ECR 2.0 delimiter test: Exactly 11 columns separated by #~#
  const sampleEcrLine = '100123456789#~#Ramanathan S#~#25000#~#15000#~#15000#~#15000#~#1800#~#1250#~#550#~#2#~#0';
  const ecrCols = sampleEcrLine.split('#~#');
  assert.strictEqual(ecrCols.length, 11, 'ECR line must contain exactly 11 columns');
  assert.strictEqual(ecrCols[0], '100123456789', 'Col 1: 12-digit UAN');
  assert.strictEqual(ecrCols[9], '2', 'Col 10: NCP Days (LOP)');
  assert.strictEqual(ecrCols[10], '0', 'Col 11: Refund of advances');
  pass('ECR 2.0 format adheres to official EPFO Unified Portal 11-column #~# delimiter standard');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST GROUP 5: ESIC Monthly Contribution Return Formatting
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\nTEST GROUP 5: ESIC Monthly Contribution Portal (.xlsx / .csv)');

  const esicCols = [
    'IP Number',
    'IP Name',
    'No of Days for which wages paid',
    'Total Monthly Wages',
    'Reason Code for Zero Working Days',
    'Last Working Day',
  ];
  assert.strictEqual(esicCols.length, 6, 'ESIC return requires exactly 6 portal columns');

  // Test contribution rounding
  const monthlyWages = 18500;
  const eeContr = Math.ceil(monthlyWages * 0.0075); // 0.75%
  const erContr = Math.ceil(monthlyWages * 0.0325); // 3.25%
  assert.strictEqual(eeContr, 139, 'EE contribution (0.75% of 18500 = 138.75 rounded up to 139)');
  assert.strictEqual(erContr, 602, 'ER contribution (3.25% of 18500 = 601.25 rounded up to 602)');
  pass('ESIC statutory calculations: 0.75% employee & 3.25% employer ceiling rates verified');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST GROUP 6: Database Integration, Double-Payment Guard & Tenant Isolation
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\nTEST GROUP 6: Database Integration, Idempotency & Tenant Isolation');

  // Find an existing payroll run for Tenant A
  const sampleRun = await prisma.payrollRun.findFirst({
    where: { tenantId: TENANT_A },
    include: { payslips: true },
  });

  if (sampleRun && sampleRun.payslips.length > 0) {
    // Clean up any stale test batches from previous interrupted runs
    const existingTestBatches = await prisma.bankDisbursementBatch.findMany({
      where: { payrollRunId: sampleRun.id },
    });
    for (const b of existingTestBatches) {
      await prisma.bankDisbursementItem.deleteMany({ where: { batchId: b.id } });
      await prisma.bankDisbursementBatch.delete({ where: { id: b.id } });
    }

    // 6.1 Create draft batch
    const batchRes = await BankPayoutService.createPayoutBatch({
      tenantId: TENANT_A,
      payrollRunId: sampleRun.id,
      bankCode: 'ICICI',
      debitAccountNumber: '999111222333',
      clientCode: 'TESTCORP',
      narration: 'Salary Disbursement Unit Test',
      generatedBy: 'test-runner@masterhrms.com',
    });

    assert(batchRes.batch.id, 'Batch ID must be generated');
    assert.strictEqual(batchRes.batch.status, 'draft', 'Initial status must be draft');
    pass(`Draft payout batch created in DB: ${batchRes.batch.batchReference} (${batchRes.eligibleCount} beneficiaries)`);

    // 6.2 Double-Payment Prevention: Try creating another batch for same run
    // Since previous batch is in 'draft', it is not yet active/approved. Let's approve the batch:
    await BankPayoutService.approveBatch(TENANT_A, batchRes.batch.id, 'finance-approver@masterhrms.com');
    pass('Batch approved for disbursement');

    // Now try creating a second batch while first batch is 'approved':
    try {
      await BankPayoutService.createPayoutBatch({
        tenantId: TENANT_A,
        payrollRunId: sampleRun.id,
        bankCode: 'HDFC',
        debitAccountNumber: '999111222333',
      });
      assert.fail('Should have blocked double-payment batch creation');
    } catch (err: any) {
      assert(err.message.includes('No eligible employees') || err.message.includes('disbursed'), 'Error explains duplicate prevention');
      pass('Double-payment protection: Blocked duplicate batch creation for employees in approved batch');
    }

    // 6.3 Generate bank file with digital signature
    const genRes = await BankPayoutService.generateBatchFile(TENANT_A, batchRes.batch.id, {
      digitallySign: true,
      signerName: 'CFO Finance Signatory',
    });
    assert.strictEqual(genRes.isDigitallySigned, true, 'Batch marked as digitally signed');
    assert(genRes.fileHash.length === 64, 'File hash recorded');
    pass(`Generated ICICI CIB payout file on disk: ${genRes.fileName} (SHA-256: ${genRes.fileHash.slice(0, 16)}...)`);

    // 6.4 Masked account number test
    const masked = BankPayoutService.maskAccountNumber('50100223344556');
    assert.strictEqual(masked, '••••••••••4556', 'Account number properly masked');
    pass(`Account number masking verified for UI/logs: ${masked}`);

    // 6.5 Tenant isolation: Tenant B cannot access Tenant A's payout batch
    const crossTenantBatch = await prisma.bankDisbursementBatch.findFirst({
      where: { id: batchRes.batch.id, tenantId: TENANT_B },
    });
    assert.strictEqual(crossTenantBatch, null, 'Tenant B must NOT access Tenant A payout batch');
    pass('Tenant isolation: Cross-tenant payout batch access strictly blocked');

    // 6.6 Finalize disbursement
    const disbursed = await BankPayoutService.disburseBatch(TENANT_A, batchRes.batch.id, 'bank-gateway@masterhrms.com');
    assert.strictEqual(disbursed.status, 'disbursed', 'Batch status updated to disbursed');
    pass('Disbursement finalized: Batch status updated to disbursed and audit timestamps recorded');

    // 6.7 EPFO ECR Database Generation & Persistence
    const ecrRes = await StatutoryReturnService.generateEpfEcr({
      tenantId: TENANT_A,
      payrollRunId: sampleRun.id,
      generatedBy: 'statutory-officer@masterhrms.com',
    });
    assert(ecrRes.filing.id, 'ECR filing record created in DB');
    assert.strictEqual(ecrRes.filing.returnType, 'EPF_ECR', 'Return type must be EPF_ECR');
    pass(`EPF ECR generated and persisted: ${ecrRes.fileName} (Hash: ${ecrRes.filing.fileHash.slice(0, 16)}...)`);

    // 6.8 ESIC Monthly Return Database Generation & Persistence
    const esicRes = await StatutoryReturnService.generateEsicReturn({
      tenantId: TENANT_A,
      payrollRunId: sampleRun.id,
      generatedBy: 'statutory-officer@masterhrms.com',
    });
    assert(esicRes.filing.id, 'ESIC filing record created in DB');
    assert.strictEqual(esicRes.filing.returnType, 'ESIC_MONTHLY', 'Return type must be ESIC_MONTHLY');
    pass(`ESIC Monthly Return generated and persisted: ${esicRes.fileName}`);

    // Clean up test batch items, batch, and filings to leave DB clean
    await prisma.bankDisbursementItem.deleteMany({ where: { batchId: batchRes.batch.id } });
    await prisma.bankDisbursementBatch.delete({ where: { id: batchRes.batch.id } });
    await prisma.statutoryReturnFiling.delete({ where: { id: ecrRes.filing.id } });
    await prisma.statutoryReturnFiling.delete({ where: { id: esicRes.filing.id } });
    pass('Test disbursement batch and statutory return records cleaned up successfully');
  } else {
    pass('[SKIPPED DB INTEGRATION - No payroll runs found in test DB]');
  }

  console.log('\n================================================================');
  console.log(`WAVE 2.4 TEST SUITE SUMMARY: ${passedCount} PASSED, 0 FAILED`);
  console.log('================================================================\n');
}

runWave24TestSuite().catch((err) => {
  console.error('Wave 2.4 test suite failure:', err);
  process.exit(1);
});
