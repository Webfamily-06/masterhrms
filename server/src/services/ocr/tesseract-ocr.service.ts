import { createWorker } from 'tesseract.js';
import { OcrResult, OcrExtractedData } from './ocr.types';

/**
 * Heuristically extracts receipt fields from OCR text.
 * Strictly advisory — never authoritative.
 */
export function parseReceiptFields(rawText: string): OcrExtractedData {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const detectedFields: string[] = [];
  let merchant: string | undefined;
  let expenseDate: string | undefined;
  let invoiceNumber: string | undefined;
  let amount: number | undefined;
  let taxAmount: number | undefined;
  let suggestedCategoryCode: string = 'GEN';

  // 1. Merchant Extraction (typically in top 3 non-empty lines)
  for (let i = 0; i < Math.min(lines.length, 4); i++) {
    const candidate = lines[i];
    // Skip receipt headers like "TAX INVOICE", "RECEIPT", date, or phone lines
    if (
      !candidate.match(/^(tax|invoice|bill|receipt|cash|memo|date|phone|gstin|tel)/i) &&
      candidate.length > 2 &&
      candidate.length < 80
    ) {
      merchant = candidate.replace(/[#*:=_]/g, '').trim();
      detectedFields.push('merchant');
      break;
    }
  }

  // 2. Invoice / Bill Number
  const invMatch = rawText.match(
    /(?:invoice|bill|receipt|order|txn|ticket)\s*(?:no|num|#|\.)?\s*[:\s-]?\s*([a-zA-Z0-9\/-]{3,30})/i
  );
  if (invMatch && invMatch[1]) {
    invoiceNumber = invMatch[1].trim();
    detectedFields.push('invoiceNumber');
  }

  // 3. Date Extraction (supports YYYY-MM-DD, DD/MM/YYYY, DD-Mon-YYYY)
  const dateMatch = rawText.match(
    /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,-]+\d{2,4})\b/i
  );
  if (dateMatch && dateMatch[1]) {
    const rawDateStr = dateMatch[1];
    const parsedDate = new Date(rawDateStr);
    if (!isNaN(parsedDate.getTime())) {
      expenseDate = parsedDate.toISOString().slice(0, 10);
      detectedFields.push('expenseDate');
    }
  }

  // 4. Tax Amount (GST, CGST, SGST, IGST, VAT, TAX)
  const taxMatches = Array.from(
    rawText.matchAll(
      /(?:cgst|sgst|igst|gst|tax|vat)\s*(?:\([^)]*\)|@\s*\d+%?)?\s*[:=]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+\.\d{2}|[0-9,]+)/gi
    )
  );
  if (taxMatches.length > 0) {
    let totalTax = 0;
    for (const match of taxMatches) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(num) && num < 100000) {
        totalTax += num;
      }
    }
    if (totalTax > 0) {
      taxAmount = Math.round(totalTax * 100) / 100;
      detectedFields.push('taxAmount');
    }
  }

  // 5. Total Amount (looks for "Total", "Grand Total", "Net Amount", "Amount Paid")
  const totalMatches = Array.from(
    rawText.matchAll(
      /(?:grand\s*total|net\s*amount|total\s*amount|amount\s*payable|paid\s*amount|total)\s*[:=]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+\.\d{2}|[0-9,]+)/gi
    )
  );

  if (totalMatches.length > 0) {
    // Pick the last matching Total line or highest value
    const lastMatch = totalMatches[totalMatches.length - 1];
    const val = parseFloat(lastMatch[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) {
      amount = val;
      detectedFields.push('amount');
    }
  } else {
    // Fallback: look for currency symbols ₹ or INR or Rs followed by decimal number
    const genericAmountMatch = rawText.match(/(?:rs\.?|inr|₹)\s*([0-9,]+\.\d{2})/i);
    if (genericAmountMatch && genericAmountMatch[1]) {
      const val = parseFloat(genericAmountMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        amount = val;
        detectedFields.push('amount');
      }
    }
  }

  // 6. Category Heuristics
  const lowerText = rawText.toLowerCase();
  if (
    lowerText.includes('uber') ||
    lowerText.includes('ola') ||
    lowerText.includes('fuel') ||
    lowerText.includes('petrol') ||
    lowerText.includes('flight') ||
    lowerText.includes('hotel') ||
    lowerText.includes('travel') ||
    lowerText.includes('railway')
  ) {
    suggestedCategoryCode = 'TRV';
  } else if (
    lowerText.includes('restaurant') ||
    lowerText.includes('cafe') ||
    lowerText.includes('swiggy') ||
    lowerText.includes('zomato') ||
    lowerText.includes('food') ||
    lowerText.includes('dining') ||
    lowerText.includes('coffee')
  ) {
    suggestedCategoryCode = 'MEL';
  } else if (
    lowerText.includes('aws') ||
    lowerText.includes('azure') ||
    lowerText.includes('google cloud') ||
    lowerText.includes('software') ||
    lowerText.includes('github') ||
    lowerText.includes('subscription')
  ) {
    suggestedCategoryCode = 'SFT';
  } else if (
    lowerText.includes('pharmacy') ||
    lowerText.includes('medical') ||
    lowerText.includes('hospital') ||
    lowerText.includes('clinic') ||
    lowerText.includes('diagnostic')
  ) {
    suggestedCategoryCode = 'MED';
  } else if (
    lowerText.includes('laptop') ||
    lowerText.includes('keyboard') ||
    lowerText.includes('monitor') ||
    lowerText.includes('hardware') ||
    lowerText.includes('electronics')
  ) {
    suggestedCategoryCode = 'EQP';
  }

  return {
    merchant,
    expenseDate,
    invoiceNumber,
    amount,
    taxAmount,
    currency: 'INR',
    suggestedCategoryCode,
    rawText,
    detectedFields,
  };
}

/**
 * Self-Hosted Tesseract OCR Service with support for both image and digital PDF receipts.
 * Strictly advisory, local execution only.
 */
export class TesseractOcrService {
  /**
   * Process a binary buffer (PDF or Image) and extract advisory receipt fields.
   */
  async processReceiptBuffer(buffer: Buffer, mimeType: string): Promise<OcrResult> {
    const startTime = Date.now();
    let rawText = '';
    let confidence = 0;
    let engine = 'tesseract.js';
    const engineVersion = '7.0.0';

    try {
      // 1. Digital PDF Handling: If file is PDF, first check for digital text stream via pdf-parse
      if (mimeType === 'application/pdf') {
        try {
          const { PDFParse } = require('pdf-parse');
          const parser = new PDFParse({ data: buffer });
          await parser.load();
          const parsedText = await parser.getText();
          if (parsedText && parsedText.trim().length > 30) {
            rawText = parsedText;
            confidence = 96.0; // High confidence for native vector PDF text streams
            engine = 'pdf-parse-native';
          }
        } catch (pdfErr) {
          // Digital text extraction failed or not a text-stream PDF
        }
      }

      // 2. Image OCR via Tesseract worker (for PNG, JPG, or image-only buffers)
      if (!rawText || rawText.trim().length < 10) {
        if (mimeType === 'application/pdf') {
          // PDFs cannot be directly decoded by Leptonica image reader without external pdftoppm rasterizer
          // Advisory graceful degradation: mark un-rasterized PDF
          engine = 'pdf-parse-native';
          confidence = 35.0;
        } else {
          engine = 'tesseract.js-wasm';
          const worker = await createWorker('eng');
          try {
            const ret = await worker.recognize(buffer);
            rawText = ret.data.text || '';
            confidence = ret.data.confidence ? Math.round(ret.data.confidence * 10) / 10 : 75.0;
          } catch (tessErr) {
            confidence = 20.0;
          } finally {
            await worker.terminate();
          }
        }
      }

      // 3. Heuristic field extraction
      const extracted = parseReceiptFields(rawText);

      // Adjust confidence based on fields found
      let weightedConfidence = confidence;
      if (extracted.amount && extracted.expenseDate && extracted.merchant) {
        weightedConfidence = Math.min(99.0, Math.max(confidence, 92.0));
      } else if (!extracted.amount) {
        weightedConfidence = Math.min(confidence, 65.0); // Penalty if amount could not be found
      }

      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        engine,
        engineVersion,
        confidence: Math.round(weightedConfidence * 10) / 10,
        isAdvisoryOnly: true,
        extracted,
        executionTimeMs,
      };
    } catch (err: any) {
      return {
        success: false,
        engine,
        engineVersion,
        confidence: 0,
        isAdvisoryOnly: true,
        extracted: { rawText: '', detectedFields: [] },
        error: `OCR Processing Failed: ${err.message}`,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }
}

// Export singleton instance
export const tesseractOcrService = new TesseractOcrService();
