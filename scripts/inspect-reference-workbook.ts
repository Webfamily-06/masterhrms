import ExcelJS from "exceljs";

async function main() {
  const filePath = "C:/Users/TSV Global Solutions/Downloads/Copy of GET Attendance Record - 2026 Aug.xlsx";
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  console.log("=== WORKBOOK OVERVIEW ===");
  console.log("Worksheets count:", wb.worksheets.length);
  console.log("Worksheet names:", wb.worksheets.map((w) => w.name));

  for (const ws of wb.worksheets) {
    console.log(`\n==================================================`);
    console.log(`SHEET: "${ws.name}" (Rows: ${ws.rowCount}, Cols: ${ws.columnCount})`);
    console.log(`==================================================`);

    // Print first 8 rows
    for (let r = 1; r <= Math.min(ws.rowCount, 8); r++) {
      const row = ws.getRow(r);
      const values: any[] = [];
      for (let c = 1; c <= Math.min(ws.columnCount, 45); c++) {
        const val = row.getCell(c).value;
        if (val !== null && val !== undefined) {
          // If formula
          if (typeof val === "object" && "formula" in val) {
            values.push(`[=${val.formula}]`);
          } else if (typeof val === "object" && "result" in val) {
            values.push(val.result);
          } else {
            values.push(val);
          }
        } else {
          values.push("");
        }
      }
      // Print if has any non-empty
      if (values.some((v) => v !== "")) {
        console.log(`Row ${r}:`, values.filter((_, idx) => idx < 20).join(" | "));
      }
    }
  }
}

main().catch(console.error);

