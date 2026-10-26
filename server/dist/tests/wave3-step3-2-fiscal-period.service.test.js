"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const fiscal_period_service_1 = require("../services/fiscal-period.service");
const date = (value) => new Date(`${value}T00:00:00.000Z`);
const makeDb = (year, period, configured = Boolean(year)) => ({
    fiscalYear: {
        count: async () => configured ? 1 : 0,
        findFirst: async () => year,
    },
    accountingPeriod: { findFirst: async () => period },
});
async function expectCode(db, code) {
    await strict_1.default.rejects(() => (0, fiscal_period_service_1.assertOpenPeriodForPosting)(db, "tenant-a", date("2026-05-15")), (error) => error instanceof fiscal_period_service_1.PeriodPostingError && error.code === code);
}
async function run() {
    const openYear = { id: "fy-1", status: "open" };
    const openPeriod = { id: "p-1", status: "open" };
    strict_1.default.equal((await (0, fiscal_period_service_1.assertOpenPeriodForPosting)(makeDb(openYear, openPeriod), "tenant-a", date("2026-05-15")))?.period.id, "p-1");
    strict_1.default.equal(await (0, fiscal_period_service_1.assertOpenPeriodForPosting)(makeDb(null, null), "legacy-tenant", date("2026-05-15")), null);
    await expectCode(makeDb(null, openPeriod, true), "FISCAL_YEAR_NOT_FOUND");
    await expectCode(makeDb({ ...openYear, status: "closed" }, openPeriod), "FISCAL_YEAR_CLOSED");
    await expectCode(makeDb(openYear, null), "ACCOUNTING_PERIOD_NOT_FOUND");
    await expectCode(makeDb(openYear, { ...openPeriod, status: "closed" }), "PERIOD_CLOSED_FOR_POSTING");
    console.log("PASS: fiscal-period service guard scenarios (6/6)");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
