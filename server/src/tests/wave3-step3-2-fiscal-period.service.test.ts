import assert from "node:assert/strict";
import { assertOpenPeriodForPosting, PeriodPostingError } from "../services/fiscal-period.service";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const makeDb = (year: any, period: any, configured = Boolean(year)) => ({
  fiscalYear: {
    count: async () => configured ? 1 : 0,
    findFirst: async () => year,
  },
  accountingPeriod: { findFirst: async () => period },
});

async function expectCode(db: any, code: PeriodPostingError["code"]) {
  await assert.rejects(() => assertOpenPeriodForPosting(db, "tenant-a", date("2026-05-15")), (error: any) => error instanceof PeriodPostingError && error.code === code);
}

async function run() {
  const openYear = { id: "fy-1", status: "open" };
  const openPeriod = { id: "p-1", status: "open" };
  assert.equal((await assertOpenPeriodForPosting(makeDb(openYear, openPeriod), "tenant-a", date("2026-05-15")))?.period.id, "p-1");
  assert.equal(await assertOpenPeriodForPosting(makeDb(null, null), "legacy-tenant", date("2026-05-15")), null);
  await expectCode(makeDb(null, openPeriod, true), "FISCAL_YEAR_NOT_FOUND");
  await expectCode(makeDb({ ...openYear, status: "closed" }, openPeriod), "FISCAL_YEAR_CLOSED");
  await expectCode(makeDb(openYear, null), "ACCOUNTING_PERIOD_NOT_FOUND");
  await expectCode(makeDb(openYear, { ...openPeriod, status: "closed" }), "PERIOD_CLOSED_FOR_POSTING");
  console.log("PASS: fiscal-period service guard scenarios (6/6)");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
