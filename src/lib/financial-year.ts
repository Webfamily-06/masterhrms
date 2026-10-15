/**
 * Client-Side Financial Year, Assessment Year & Tax Period Utility
 * 
 * Republic of India Statutory Period Standards:
 * - Financial Year (FY): 1 April to 31 March
 * - Assessment Year (AY): FY + 1 year
 * - Income-tax Act, 1961 (FY <= 2025-26)
 * - Income-tax Act, 2025 (FY >= 2026-27)
 */

export interface FinancialYearMeta {
  financialYear: string;        // "2025-2026"
  shortCode: string;            // "2025-26"
  assessmentYear: string;       // "2026-2027"
  taxYear: string;              // "2026-27"
  startYear: number;
  endYear: number;
  governingAct: "Income-tax Act, 1961" | "Income-tax Act, 2025";
  isCurrent: boolean;
  isHistorical: boolean;
  isPlanning: boolean;
}

export interface SelectableFYOption {
  value: string;             // "2025-2026"
  label: string;             // Display text
  shortCode: string;         // "2025-26"
  assessmentYear: string;    // "2026-2027"
  isCurrent: boolean;
  isHistorical: boolean;
  isPlanning: boolean;
  governingAct: string;
}

/**
 * Standardize any incoming FY string representation into canonical "YYYY-YYYY" format.
 */
export function normalizeFinancialYear(input?: string | null): string {
  if (!input) {
    return getCurrentFinancialYear();
  }
  const clean = input.trim().replace(/^FY\s*/i, "");
  const fullMatch = clean.match(/^(\d{4})-(\d{4})$/);
  if (fullMatch) {
    const start = parseInt(fullMatch[1], 10);
    const end = parseInt(fullMatch[2], 10);
    if (end === start + 1) {
      return `${start}-${end}`;
    }
  }
  const shortMatch = clean.match(/^(\d{4})-(\d{2})$/);
  if (shortMatch) {
    const start = parseInt(shortMatch[1], 10);
    const endSuffix = parseInt(shortMatch[2], 10);
    const expectedSuffix = (start + 1) % 100;
    if (endSuffix === expectedSuffix) {
      return `${start}-${start + 1}`;
    }
  }
  return getCurrentFinancialYear();
}

/**
 * Compute the Indian Financial Year for any given Gregorian Date.
 * Months 1..3 (Jan, Feb, Mar) belong to previous calendar year's FY.
 * Months 4..12 (Apr..Dec) belong to current calendar year's FY.
 */
export function getFinancialYearFromDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1 to 12
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

/**
 * Compute the Indian Financial Year from a payroll period (month: 1-12, year: YYYY).
 */
export function getFinancialYearFromPeriod(month: number, year: number): string {
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

/**
 * Get current active Financial Year.
 */
export function getCurrentFinancialYear(): string {
  return getFinancialYearFromDate(new Date());
}

/**
 * Compute Assessment Year from a Financial Year.
 */
export function getAssessmentYear(financialYear: string): string {
  const normalized = normalizeFinancialYear(financialYear);
  const startYear = parseInt(normalized.split("-")[0], 10);
  return `${startYear + 1}-${startYear + 2}`;
}

/**
 * Convert canonical "2025-2026" to short "2025-26".
 */
export function toShortFY(financialYear: string): string {
  const normalized = normalizeFinancialYear(financialYear);
  const [start, end] = normalized.split("-");
  return `${start}-${end.slice(-2)}`;
}

/**
 * Get metadata for a given Financial Year.
 */
export function getFinancialYearMeta(financialYear?: string | null, referenceDate: Date = new Date()): FinancialYearMeta {
  const canonical = normalizeFinancialYear(financialYear);
  const [startStr, endStr] = canonical.split("-");
  const startYear = parseInt(startStr, 10);
  const endYear = parseInt(endStr, 10);

  const currentFY = getFinancialYearFromDate(referenceDate);
  const currentStartYear = parseInt(currentFY.split("-")[0], 10);

  const isCurrent = canonical === currentFY;
  const isHistorical = startYear < currentStartYear;
  const isPlanning = startYear > currentStartYear;

  const governingAct = startYear >= 2026 ? "Income-tax Act, 2025" : "Income-tax Act, 1961";

  return {
    financialYear: canonical,
    shortCode: `${startYear}-${String(endYear).slice(-2)}`,
    assessmentYear: `${startYear + 1}-${endYear + 1}`,
    taxYear: `${startYear}-${String(endYear).slice(-2)}`,
    startYear,
    endYear,
    governingAct,
    isCurrent,
    isHistorical,
    isPlanning,
  };
}

/**
 * Dynamic selectable Financial Years for UI Select / Dropdowns.
 */
export function getSelectableFinancialYears(options?: {
  pastYears?: number;
  futureYears?: number;
  referenceDate?: Date;
  compact?: boolean;
}): SelectableFYOption[] {
  const pastYears = options?.pastYears ?? 3;
  const futureYears = options?.futureYears ?? 1;
  const refDate = options?.referenceDate ?? new Date();

  const currentFY = getFinancialYearFromDate(refDate);
  const currentStartYear = parseInt(currentFY.split("-")[0], 10);

  const optionsList: SelectableFYOption[] = [];
  const minStartYear = currentStartYear - pastYears;
  const maxStartYear = currentStartYear + futureYears;

  for (let y = maxStartYear; y >= minStartYear; y--) {
    const fy = `${y}-${y + 1}`;
    const meta = getFinancialYearMeta(fy, refDate);
    const status = meta.isCurrent ? " (Current)" : (meta.isPlanning ? " (Planning)" : "");
    const label = options?.compact
      ? `FY ${meta.shortCode}${status}`
      : `FY ${meta.shortCode} / AY ${meta.assessmentYear}${status}`;

    optionsList.push({
      value: fy,
      label,
      shortCode: meta.shortCode,
      assessmentYear: meta.assessmentYear,
      isCurrent: meta.isCurrent,
      isHistorical: meta.isHistorical,
      isPlanning: meta.isPlanning,
      governingAct: meta.governingAct,
    });
  }

  return optionsList;
}
