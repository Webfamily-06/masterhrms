const ExcelJS = require('exceljs');
const path = 'C:\\Users\\TSV Global Solutions\\Downloads\\Paysheet_ENABL_OCT_2026 -Final.xlsx';

async function inspectMergedHeaders() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);

  for (const sName of ['Form V', 'FORM W ']) {
    const sheet = wb.getWorksheet(sName);
    console.log(`\n=== ROWS 8 to 11 of "${sName}" ===`);
    for (let r = 8; r <= 11; r++) {
      const row = sheet.getRow(r);
      const cells = [];
      row.eachCell({ includeEmpty: false }, (cell, c) => {
        cells.push(`[C${c}]: "${String(cell.text).trim()}"`);
      });
      console.log(`Row ${r}: ${cells.slice(0, 20).join(' | ')}`);
      if (cells.length > 20) {
        console.log(`  ...cont: ${cells.slice(20).join(' | ')}`);
      }
    }
  }
}

inspectMergedHeaders().catch(console.error);

