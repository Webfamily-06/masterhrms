const fs = require('fs');
const path = require('path');
const { tesseractOcrService } = require('../../dist/services/ocr/tesseract-ocr.service');

async function testRealImageOcr() {
  console.log('================================================================');
  console.log('REAL RECEIPT IMAGE OCR VERIFICATION EVIDENCE');
  console.log('Image: Starbucks Coffee Retail Receipt Photograph (723 KB JPEG)');
  console.log('================================================================\n');

  const imgPath = path.resolve(__dirname, 'fixtures/sample_receipt.jpg');
  if (!fs.existsSync(imgPath)) {
    throw new Error('Sample receipt fixture not found at ' + imgPath);
  }

  const imageBuffer = fs.readFileSync(imgPath);
  console.log('1. Read Real Image Buffer:', imageBuffer.length, 'bytes');

  const startTime = Date.now();
  const ocrResult = await tesseractOcrService.processReceiptBuffer(imageBuffer, 'image/jpeg');
  const elapsed = Date.now() - startTime;

  console.log('\n2. Tesseract OCR Output Verification:');
  console.log('   - OCR Engine Used:       ', ocrResult.engine);
  console.log('   - Engine Version:        ', ocrResult.engineVersion);
  console.log('   - Success Status:        ', ocrResult.success);
  console.log('   - Advisory Flag:         ', ocrResult.isAdvisoryOnly);
  console.log('   - Confidence Score:      ', ocrResult.confidence + '%');
  console.log('   - Execution Time:        ', elapsed + ' ms');

  console.log('\n3. Heuristic Field Extraction Verification:');
  console.log('   - Extracted Merchant:    ', ocrResult.extracted.merchant);
  console.log('   - Extracted Date:        ', ocrResult.extracted.expenseDate);
  console.log('   - Extracted Invoice No:  ', ocrResult.extracted.invoiceNumber);
  console.log('   - Extracted Total Amount:', ocrResult.extracted.amount, ocrResult.extracted.currency);
  console.log('   - Extracted Tax (GST):   ', ocrResult.extracted.taxAmount);
  console.log('   - Suggested Category:    ', ocrResult.extracted.suggestedCategoryCode, '(Meals/Dining)');
  console.log('   - Detected Fields:       ', ocrResult.extracted.detectedFields);

  console.log('\n4. Raw Captured OCR Text:');
  console.log('----------------------------------------------------');
  console.log(ocrResult.extracted.rawText.trim());
  console.log('----------------------------------------------------');

  // Assertions
  const passed =
    ocrResult.success === true &&
    ocrResult.extracted.merchant === 'STARBUCKS COFFEE' &&
    ocrResult.extracted.expenseDate === '2026-09-15' &&
    ocrResult.extracted.amount === 413 &&
    ocrResult.extracted.taxAmount === 63 &&
    ocrResult.extracted.suggestedCategoryCode === 'MEL' &&
    ocrResult.confidence >= 80;

  if (passed) {
    console.log('\n>>> VERIFICATION RESULT: 100% PASSED (REAL IMAGE OCR VERIFIED) <<<\n');
  } else {
    console.error('\n>>> VERIFICATION RESULT: FAILED <<<');
    process.exit(1);
  }
}

testRealImageOcr().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
