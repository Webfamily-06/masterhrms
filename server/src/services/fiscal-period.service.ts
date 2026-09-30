/** Central financial-posting guard.  It deliberately fails closed once a tenant
 * has configured fiscal years: every posting date must belong to an open year
 * and an open accounting period.  Tenants with no fiscal configuration retain
 * legacy behaviour until an administrator creates their first fiscal year. */
export class PeriodPostingError extends Error {
  constructor(public readonly code: "FISCAL_YEAR_NOT_FOUND" | "ACCOUNTING_PERIOD_NOT_FOUND" | "FISCAL_YEAR_CLOSED" | "PERIOD_CLOSED_FOR_POSTING", message: string) {
    super(message);
    this.name = "PeriodPostingError";
  }
}

export function parseAccountingDate(value: unknown): Date {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new PeriodPostingError("FISCAL_YEAR_NOT_FOUND", "A valid transaction date is required for posting");
  return date;
}

export async function assertOpenPeriodForPosting(db: any, tenantId: string, dateValue: unknown) {
  const entryDate = parseAccountingDate(dateValue);
  const configuredYears = await db.fiscalYear.count({ where: { tenantId } });
  if (configuredYears === 0) return null;

  const fiscalYear = await db.fiscalYear.findFirst({ where: { tenantId, startDate: { lte: entryDate }, endDate: { gte: entryDate } } });
  if (!fiscalYear) throw new PeriodPostingError("FISCAL_YEAR_NOT_FOUND", "No fiscal year covers this transaction date");
  if (fiscalYear.status === "closed") throw new PeriodPostingError("FISCAL_YEAR_CLOSED", "The fiscal year for this transaction date is closed");

  const period = await db.accountingPeriod.findFirst({ where: { tenantId, fiscalYearId: fiscalYear.id, startDate: { lte: entryDate }, endDate: { gte: entryDate } } });
  if (!period) throw new PeriodPostingError("ACCOUNTING_PERIOD_NOT_FOUND", "No accounting period covers this transaction date");
  if (period.status === "closed") throw new PeriodPostingError("PERIOD_CLOSED_FOR_POSTING", "This accounting period is closed for posting");
  return { fiscalYear, period };
}
