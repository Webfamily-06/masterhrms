"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeriodPostingError = void 0;
exports.parseAccountingDate = parseAccountingDate;
exports.assertOpenPeriodForPosting = assertOpenPeriodForPosting;
/** Central financial-posting guard.  It deliberately fails closed once a tenant
 * has configured fiscal years: every posting date must belong to an open year
 * and an open accounting period.  Tenants with no fiscal configuration retain
 * legacy behaviour until an administrator creates their first fiscal year. */
class PeriodPostingError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "PeriodPostingError";
    }
}
exports.PeriodPostingError = PeriodPostingError;
function parseAccountingDate(value) {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime()))
        throw new PeriodPostingError("FISCAL_YEAR_NOT_FOUND", "A valid transaction date is required for posting");
    return date;
}
async function assertOpenPeriodForPosting(db, tenantId, dateValue) {
    const entryDate = parseAccountingDate(dateValue);
    const configuredYears = await db.fiscalYear.count({ where: { tenantId } });
    if (configuredYears === 0)
        return null;
    const fiscalYear = await db.fiscalYear.findFirst({ where: { tenantId, startDate: { lte: entryDate }, endDate: { gte: entryDate } } });
    if (!fiscalYear)
        throw new PeriodPostingError("FISCAL_YEAR_NOT_FOUND", "No fiscal year covers this transaction date");
    if (fiscalYear.status === "closed")
        throw new PeriodPostingError("FISCAL_YEAR_CLOSED", "The fiscal year for this transaction date is closed");
    const period = await db.accountingPeriod.findFirst({ where: { tenantId, fiscalYearId: fiscalYear.id, startDate: { lte: entryDate }, endDate: { gte: entryDate } } });
    if (!period)
        throw new PeriodPostingError("ACCOUNTING_PERIOD_NOT_FOUND", "No accounting period covers this transaction date");
    if (period.status === "closed")
        throw new PeriodPostingError("PERIOD_CLOSED_FOR_POSTING", "This accounting period is closed for posting");
    return { fiscalYear, period };
}
