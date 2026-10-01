export interface OcrExtractedData {
  merchant?: string;
  expenseDate?: string;
  invoiceNumber?: string;
  amount?: number;
  taxAmount?: number;
  currency?: string;
  suggestedCategoryCode?: string;
  rawText: string;
  detectedFields: string[];
}

export interface OcrResult {
  success: boolean;
  engine: string;
  engineVersion: string;
  confidence: number; // 0 to 100
  isAdvisoryOnly: true;
  extracted: OcrExtractedData;
  error?: string;
  executionTimeMs: number;
}
