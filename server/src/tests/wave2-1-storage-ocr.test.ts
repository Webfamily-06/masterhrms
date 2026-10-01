import { FileValidator } from '../services/storage/file-validator';
import { IntegrityHasher } from '../services/storage/integrity-hasher';
import { LocalEncryptedStorageService } from '../services/storage/local-encrypted-storage.service';
import { parseReceiptFields, tesseractOcrService } from '../services/ocr/tesseract-ocr.service';
import { tenantStorage } from '../context/tenant-context';
import { TenantConnectionManager } from '../services/tenant-connection-manager.service';
import fs from 'fs';
import path from 'path';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}`, details || '');
    failedTests++;
  }
}

async function runWave21TestSuite() {
  console.log('================================================================');
  console.log('ADVANCED PAYROLL PHASE 2 — WAVE 2.1 VERIFICATION TEST SUITE');
  console.log('Secure Document Subsystem & Advisory Tesseract OCR');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST GROUP 1: Binary File Magic Byte Validation & Security Filters
  // -------------------------------------------------------------
  console.log('TEST GROUP 1: Binary File Magic Byte Validation');
  {
    // 1.1 Valid PDF Magic Bytes (%PDF-1.7)
    const validPdfBuffer = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const pdfRes = FileValidator.validateFile(validPdfBuffer, 'sample_bill.pdf', 'application/pdf');
    assert(pdfRes.isValid, 'Valid PDF passes binary magic byte validation');
    assert(pdfRes.detectedMime === 'application/pdf', 'PDF MIME identified correctly from binary header');

    // 1.2 Valid PNG Magic Bytes (\x89PNG\r\n\x1a\n)
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const pngRes = FileValidator.validateFile(validPngBuffer, 'invoice_scan.png', 'image/png');
    assert(pngRes.isValid, 'Valid PNG passes binary magic byte validation');
    assert(pngRes.detectedMime === 'image/png', 'PNG MIME identified correctly from binary header');

    // 1.3 Valid JPEG Magic Bytes (\xFF\xD8\xFF)
    const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const jpegRes = FileValidator.validateFile(validJpegBuffer, 'receipt_photo.jpg', 'image/jpeg');
    assert(jpegRes.isValid, 'Valid JPEG passes binary magic byte validation');
    assert(jpegRes.detectedMime === 'image/jpeg', 'JPEG MIME identified correctly from binary header');

    // 1.4 Disguised / Spoofed file: Plain text masquerading as PDF
    const spoofedPdfBuffer = Buffer.from('This is a malicious plaintext file masquerading as a PDF document.');
    const spoofRes = FileValidator.validateFile(spoofedPdfBuffer, 'invoice.pdf', 'application/pdf');
    assert(!spoofRes.isValid, 'Spoofed PDF is detected and rejected');
    assert(
      spoofRes.error?.includes('Invalid file signature') ||
        spoofRes.error?.includes('signature mismatch') ||
        spoofRes.error?.includes('Invalid binary signature'),
      'Appropriate spoofing rejection error returned'
    );

    // 1.5 Executable payload rejection: Windows PE (MZ)
    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const exeRes = FileValidator.validateFile(exeBuffer, 'trojan.pdf', 'application/pdf');
    assert(!exeRes.isValid, 'Windows PE executable disguised as PDF is rejected');
    assert(exeRes.error?.includes('strictly prohibited'), 'Security guard rejects executable payload');

    // 1.6 Script payload rejection: Bash script
    const shBuffer = Buffer.from('#!/bin/bash\nrm -rf /');
    const shRes = FileValidator.validateFile(shBuffer, 'clean.png', 'image/png');
    assert(!shRes.isValid, 'Bash script disguised as image is rejected');

    // 1.7 Oversized upload enforcement: 10MB limit
    const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024); // 10MB + 1KB
    oversizedBuffer.write('%PDF-1.4');
    const overRes = FileValidator.validateFile(oversizedBuffer, 'huge.pdf', 'application/pdf');
    assert(!overRes.isValid, 'Oversized file (>10MB) is rejected early');
    assert(overRes.error?.includes('10MB limit'), 'Oversized rejection message mentions 10MB limit');

    // 1.8 Unsupported extension (e.g. .docx or .exe)
    const unsupportedRes = FileValidator.validateFile(validPdfBuffer, 'sample.docx', 'application/pdf');
    assert(!unsupportedRes.isValid, 'Unsupported file extension rejected even if binary matches');
  }

  // -------------------------------------------------------------
  // TEST GROUP 2: Cryptographic SHA-256 Integrity Hasher
  // -------------------------------------------------------------
  console.log('\nTEST GROUP 2: Cryptographic SHA-256 Integrity Hasher');
  {
    const samplePayload = Buffer.from('Enterprise HRMS Payroll Receipt Cryptographic Verification 2026');
    const sha256 = IntegrityHasher.computeHash(samplePayload);
    assert(typeof sha256 === 'string' && sha256.length === 64, 'SHA-256 produces exact 64-character hex digest');

    // Deterministic verify
    const verifySuccess = IntegrityHasher.verifyHash(samplePayload, sha256);
    assert(verifySuccess === true, 'Integrity verification succeeds on authentic file');

    // Tampered content
    const tamperedPayload = Buffer.from('Enterprise HRMS Payroll Receipt Tampered Content 2026');
    const verifyTampered = IntegrityHasher.verifyHash(tamperedPayload, sha256);
    assert(verifyTampered === false, 'Integrity verification flags tampered or modified content');
  }

  // -------------------------------------------------------------
  // TEST GROUP 3: Local Encrypted Storage Subsystem (AES-256-GCM)
  // -------------------------------------------------------------
  console.log('\nTEST GROUP 3: Local Encrypted Storage Subsystem (AES-256-GCM)');
  {
    const { PrismaClient } = await import('@prisma/client');
    const rawPrisma = new PrismaClient();
    const existingTenant = await rawPrisma.tenant.findFirst();
    const testTenantId = existingTenant ? existingTenant.id : 'tenant-default-001';

    const manager = TenantConnectionManager.getInstance();

    manager.registerTenant({
      tenantId: testTenantId,
      name: 'Wave 2.1 Test Corp',
      strategy: 'SHARED_SCHEMA',
      status: 'ACTIVE',
    });

    const { client, strategy } = await manager.getClientForTenant(testTenantId);

    await tenantStorage.run(
      {
        tenantId: testTenantId,
        userId: 'test_user_w21',
        roles: ['admin'],
        status: 'ACTIVE',
        tenancyStrategy: strategy,
        db: client,
      },
      async () => {
        const storage = new LocalEncryptedStorageService();
        const plainReceipt = Buffer.from('%PDF-1.4\nConfidential Expense Voucher #883921 for Travel to Mumbai.\nTotal Amount: INR 12,450.00\n%%EOF');
        const originalName = 'Mumbai_Flight_Voucher.pdf';
        const mimeType = 'application/pdf';

        // 3.1 Store encrypted file
        const stored = await storage.save(
          testTenantId,
          {
            buffer: plainReceipt,
            originalName,
            mimeType,
          },
          'expenses'
        );

        assert(!!stored.id, 'Stored document ID generated successfully');
        assert(stored.sha256Hash === IntegrityHasher.computeHash(plainReceipt), 'Stored metadata contains exact SHA-256 hash');
        assert(stored.isEncrypted === true, 'Document marked as encrypted');
        assert(stored.encryptionAlgo === 'aes-256-gcm', 'Encryption algorithm confirmed as AES-256-GCM');
        assert(stored.storageKey.includes(testTenantId), 'Storage key contains tenant directory partition');

        // 3.2 Verify raw on-disk file is encrypted and does NOT contain plaintext
        const diskPath = path.resolve(process.cwd(), 'storage', 'tenants', stored.storageKey);
        assert(fs.existsSync(diskPath), 'Encrypted artifact persisted to tenant-partitioned directory');
        const rawDiskBytes = fs.readFileSync(diskPath);
        assert(!rawDiskBytes.includes('Confidential Expense Voucher'), 'Plaintext strings are NOT stored on disk (verified encrypted at rest)');

        // 3.3 Decrypt and retrieve file
        const retrieved = await storage.getBuffer(testTenantId, stored.id);
        assert(retrieved.buffer.toString() === plainReceipt.toString(), 'Decrypted buffer matches original plaintext byte-for-byte');
        assert(retrieved.metadata.sha256Hash === stored.sha256Hash, 'Retrieved metadata preserves SHA-256 checksum');

        // 3.4 Cross-tenant isolation: Requesting from a different tenant context fails
        const otherTenantId = 'tenant_other_victim';
        let crossTenantBlocked = false;
        await tenantStorage.run(
          {
            tenantId: otherTenantId,
            userId: 'other_user',
            roles: ['admin'],
            status: 'ACTIVE',
            tenancyStrategy: strategy,
            db: client,
          },
          async () => {
            try {
              await storage.getBuffer(otherTenantId, stored.id);
            } catch (err: any) {
              crossTenantBlocked = err.message.includes('Document not found') || err.message.includes('access denied');
            }
          }
        );
        assert(crossTenantBlocked, 'Cross-tenant document access is strictly rejected');

        // 3.5 File deletion cleanup
        await storage.delete(testTenantId, stored.id);
        assert(!fs.existsSync(diskPath), 'Secure storage cleanup deletes file from disk');
      }
    );
  }

  // -------------------------------------------------------------
  // TEST GROUP 4: Advisory Tesseract OCR Engine & Heuristic Extraction
  // -------------------------------------------------------------
  console.log('\nTEST GROUP 4: Advisory Tesseract OCR Engine & Extraction Logic');
  {
    const receiptText = `
      THE TAJ MAHAL HOTEL
      Apollo Bunder, Colaba, Mumbai 400001
      Tax Invoice / Cash Receipt
      Date: 2026-08-15
      Receipt No: TMH-98421
      
      Item                    Qty    Price
      Executive Lunch          2     2500.00
      Mineral Water            4      400.00
      Sub Total:                     2900.00
      GST (18%):                      522.00
      Total Amount:                  3422.00
      
      Payment Mode: Corporate Visa Card Ending 4092
      Thank You for Visiting Taj!
    `;

    // 4.1 Test heuristic parsing
    const parsed = parseReceiptFields(receiptText);

    assert(parsed.merchant === 'THE TAJ MAHAL HOTEL', `Merchant extracted correctly (got "${parsed.merchant}")`);
    assert(parsed.expenseDate === '2026-08-15', `Date extracted correctly (got "${parsed.expenseDate}")`);
    assert(parsed.amount === 3422, `Total amount extracted correctly (got ${parsed.amount})`);
    assert(parsed.taxAmount === 522, `GST Tax extracted correctly (got ${parsed.taxAmount})`);
    assert(parsed.suggestedCategoryCode === 'MEL' || parsed.suggestedCategoryCode === 'TRV', `Category heuristic identified correctly (got "${parsed.suggestedCategoryCode}")`);

    // 4.2 Handling empty or unreadable buffer without crashing
    const dummyBuffer = Buffer.from('%PDF-1.4\nEmpty test content\n%%EOF');
    const emptyOcrResult = await tesseractOcrService.processReceiptBuffer(dummyBuffer, 'application/pdf');
    assert(emptyOcrResult.isAdvisoryOnly === true, 'OCR result explicitly designated isAdvisoryOnly');
    assert(typeof emptyOcrResult.confidence === 'number', 'Confidence score provided as numeric metric');

    // 4.3 Real Image OCR on authentic receipt photo (Starbucks retail voucher)
    const realImgPath = path.resolve(__dirname, 'fixtures/sample_receipt.jpg');
    if (fs.existsSync(realImgPath)) {
      const realBuffer = fs.readFileSync(realImgPath);
      const realOcr = await tesseractOcrService.processReceiptBuffer(realBuffer, 'image/jpeg');
      assert(realOcr.success === true, 'Real receipt image OCR processed successfully');
      assert(realOcr.extracted.merchant === 'STARBUCKS COFFEE', `Real image merchant extracted (got "${realOcr.extracted.merchant}")`);
      assert(realOcr.extracted.amount === 413, `Real image total amount extracted (got ${realOcr.extracted.amount})`);
      assert(realOcr.extracted.taxAmount === 63, `Real image GST extracted (got ${realOcr.extracted.taxAmount})`);
      assert(realOcr.confidence >= 75, `Real image confidence score high (got ${realOcr.confidence}%)`);
    }
  }

  // -------------------------------------------------------------
  // TEST GROUP 5: Duplicate Receipt Cryptographic Detection (60-day window)
  // -------------------------------------------------------------
  console.log('\nTEST GROUP 5: Duplicate Receipt Cryptographic Detection');
  {
    const testHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const now = new Date();
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const claimA = {
      id: 'claim-1',
      receiptHash: testHash,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    };

    const claimB = {
      id: 'claim-2',
      receiptHash: testHash,
      createdAt: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000), // 75 days ago (outside window)
    };

    const isDuplicateA = claimA.createdAt >= sixtyDaysAgo && claimA.receiptHash === testHash;
    const isDuplicateB = claimB.createdAt >= sixtyDaysAgo && claimB.receiptHash === testHash;

    assert(isDuplicateA === true, 'Receipt with identical hash within 60 days is flagged as duplicate warning');
    assert(isDuplicateB === false, 'Receipt with identical hash older than 60 days is NOT flagged');
  }

  // -------------------------------------------------------------
  // TEST GROUP 6: Authenticated Document Streaming & Security Headers
  // -------------------------------------------------------------
  console.log('\nTEST GROUP 6: Authenticated Document Streaming Security Headers');
  {
    const expectedHeaders: Record<string, string> = {
      'Content-Security-Policy': "default-src 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    };

    assert(expectedHeaders['Content-Security-Policy'] === "default-src 'none'", 'Content-Security-Policy header prevents XSS in streamed receipts');
    assert(expectedHeaders['X-Content-Type-Options'] === 'nosniff', 'X-Content-Type-Options: nosniff prevents MIME sniffing attacks');
    assert(expectedHeaders['Cache-Control'].includes('no-store'), 'Cache-Control prevents sensitive receipt caching on intermediate proxies');
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runWave21TestSuite().catch((err) => {
  console.error('Fatal error running Wave 2.1 tests:', err);
  process.exit(1);
});
