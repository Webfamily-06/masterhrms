import { PrismaClient } from "@prisma/client";
import { generateToken } from "../server/src/lib/jwt";
import * as fs from "fs";
import * as path from "path";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();
const OUTPUT_DIR = "C:/Users/TSV Global Solutions/.gemini/antigravity/brain/a577d1c0-e728-48a2-b5e2-4bfe07f028cd";

async function main() {
  const user = await prisma.user.findFirst({
    where: { profile: { tenantId: { not: null } } },
    include: { profile: true, roles: true },
  });
  const tenantId = user!.profile!.tenantId!;

  let session = await prisma.deviceSession.findFirst({
    where: { userId: user!.id, revoked: false, expiresAt: { gt: new Date() } },
  });
  if (!session) {
    session = await prisma.deviceSession.create({
      data: {
        userId: user!.id,
        tenantId,
        deviceType: "desktop",
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });
  }

  const token = generateToken({
    userId: user!.id,
    email: user!.email,
    tenantId,
    roles: user!.roles.map((r) => r.role),
    sessionId: session.id,
  });

  const headers = { Authorization: `Bearer ${token}` };

  console.log("=== 1. Testing Monthly Excel API ===");
  const resMonthXlsx = await fetch("http://localhost:4000/api/v1/hr/attendance/export/excel/monthly?year=2026&month=8&cycle=25_24", { headers });
  console.log("Monthly Excel HTTP Status:", resMonthXlsx.status, "Content-Type:", resMonthXlsx.headers.get("content-type"));
  const bufMonthXlsx = Buffer.from(await resMonthXlsx.arrayBuffer());
  const fileMonthXlsx = path.join(OUTPUT_DIR, "GET_Attendance_Record_2026_8_25_24.xlsx");
  fs.writeFileSync(fileMonthXlsx, bufMonthXlsx);
  console.log("Saved Monthly Excel to:", fileMonthXlsx, "Size:", bufMonthXlsx.length);

  // Inspect generated Monthly Excel
  const wbMonth = new ExcelJS.Workbook();
  await wbMonth.xlsx.readFile(fileMonthXlsx);
  console.log("Monthly Excel Sheet names:", wbMonth.worksheets.map(w => w.name));
  const wsMonth = wbMonth.worksheets[0];
  console.log(`Monthly sheet: ${wsMonth.name}, Rows: ${wsMonth.rowCount}, Cols: ${wsMonth.columnCount}`);
  console.log("Row 1 Col 1-5:", [1,2,3,4,5].map(c => wsMonth.getRow(1).getCell(c).value));
  console.log("Row 2 Col 1-5:", [1,2,3,4,5].map(c => wsMonth.getRow(2).getCell(c).value));

  console.log("\n=== 2. Testing Yearly Consolidated Excel API ===");
  const resYearXlsx = await fetch("http://localhost:4000/api/v1/hr/attendance/export/excel/yearly?year=2026&cycle=25_24", { headers });
  console.log("Yearly Excel HTTP Status:", resYearXlsx.status, "Content-Type:", resYearXlsx.headers.get("content-type"));
  const bufYearXlsx = Buffer.from(await resYearXlsx.arrayBuffer());
  const fileYearXlsx = path.join(OUTPUT_DIR, "GET_Attendance_Consolidated_2026_25_24.xlsx");
  fs.writeFileSync(fileYearXlsx, bufYearXlsx);
  console.log("Saved Yearly Excel to:", fileYearXlsx, "Size:", bufYearXlsx.length);

  // Inspect generated Yearly Consolidated Excel
  const wbYear = new ExcelJS.Workbook();
  await wbYear.xlsx.readFile(fileYearXlsx);
  console.log("Yearly Consolidated Sheet names:", wbYear.worksheets.map(w => w.name));
  const wsCons = wbYear.getWorksheet("Consolidated ");
  console.log(`Consolidated sheet: ${wsCons?.name}, Rows: ${wsCons?.rowCount}, Cols: ${wsCons?.columnCount}`);
  console.log("Row 1 Title:", wsCons?.getRow(1).getCell(1).value);
  console.log("Row 2 Categories:", [1,2,3,4,16,17,29,30,42,43].map(c => wsCons?.getRow(2).getCell(c).value));
  console.log("Row 3 Months:", [1,2,3,4,5,6,16,17,18,29,30,42,43].map(c => wsCons?.getRow(3).getCell(c).value));

  console.log("\n=== 3. Testing Monthly PDF API ===");
  const resMonthPdf = await fetch("http://localhost:4000/api/v1/hr/attendance/export/pdf/monthly?year=2026&month=8&cycle=25_24", { headers });
  console.log("Monthly PDF HTTP Status:", resMonthPdf.status, "Content-Type:", resMonthPdf.headers.get("content-type"));
  const bufMonthPdf = Buffer.from(await resMonthPdf.arrayBuffer());
  const fileMonthPdf = path.join(OUTPUT_DIR, "GET_Attendance_Record_2026_8_25_24.pdf");
  fs.writeFileSync(fileMonthPdf, bufMonthPdf);
  console.log("Saved Monthly PDF to:", fileMonthPdf, "Size:", bufMonthPdf.length);

  console.log("\n=== 4. Testing Yearly Consolidated PDF API ===");
  const resYearPdf = await fetch("http://localhost:4000/api/v1/hr/attendance/export/pdf/yearly?year=2026&cycle=25_24", { headers });
  console.log("Yearly PDF HTTP Status:", resYearPdf.status, "Content-Type:", resYearPdf.headers.get("content-type"));
  const bufYearPdf = Buffer.from(await resYearPdf.arrayBuffer());
  const fileYearPdf = path.join(OUTPUT_DIR, "GET_Attendance_Consolidated_2026_25_24.pdf");
  fs.writeFileSync(fileYearPdf, bufYearPdf);
  console.log("Saved Yearly PDF to:", fileYearPdf, "Size:", bufYearPdf.length);

  console.log("\n=== 5. Testing Consolidated Data API ===");
  const resData = await fetch("http://localhost:4000/api/v1/hr/attendance/export/consolidated-data?year=2026&cycle=25_24", { headers });
  console.log("Data API HTTP Status:", resData.status);
  const json = await resData.json();
  console.log("Data API Summary: year:", json.year, "cycle:", json.cycle, "months:", json.months.length, "employees:", json.employees.length);
  if (json.employees.length > 0) {
    const e1 = json.employees[0];
    console.log("Sample employee:", e1.name, "DOJ:", e1.doj, "Total Credit:", e1.totalCredit, "Total Utilised:", e1.totalUtilised, "Cum. Balance:", e1.cumulativeBalance, "Status:", e1.status);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

