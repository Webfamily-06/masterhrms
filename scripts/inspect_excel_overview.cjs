const ExcelJS = require('exceljs');
const path = 'C:\\Users\\TSV Global Solutions\\Downloads\\Paysheet_ENABL_OCT_2026 -Final.xlsx';

async function analyzeWorkbook() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);

  console.log(`Workbook loaded: ${path}`);
  console.log(`Total sheets: ${workbook.worksheets.length}`);

  for (const sheet of workbook.worksheets) {
    console.log(`\n================================================================`);
    console.log(`SHEET: "${sheet.name}" (ID: ${sheet.id}, Rows: ${sheet.rowCount}, Cols: ${sheet.columnCount})`);
    console.log(`================================================================`);

    // Print first 5 rows to understand header structure
    for (let r = 1; r <= Math.min(10, sheet.rowCount); r++) {
      const row = sheet.getRow(r);
      const values = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let val = cell.value;
        if (val && typeof val === 'object' && val.formula) {
          val = `[FORMULA: ${val.formula}]`;
        } else if (val && typeof val === 'object' && val.result !== undefined) {
          val = `[FORMULA: ${val.formula || 'expr'} => ${val.result}]`;
        }
        values.push(`C${colNumber}: ${String(val).substring(0, 40)}`);
      });
      if (values.length > 0) {
        console.log(`Row ${r}: ${values.slice(0, 15).join(' | ')}${values.length > 15 ? ' ...' : ''}`);
      }
    }
  }
}

analyzeWorkbook().catch(err => {
  console.error("Analysis failed:", err);
});

