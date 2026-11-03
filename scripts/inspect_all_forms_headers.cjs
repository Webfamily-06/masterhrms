const ExcelJS = require('exceljs');
const path = 'C:\\Users\\TSV Global Solutions\\Downloads\\Paysheet_ENABL_OCT_2026 -Final.xlsx';

async function inspectFormColumns() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);

  const forms = ['Form U', 'Form V', 'FORM W ', 'Form X', 'FORM S'];

  for (const name of forms) {
    const sheet = wb.getWorksheet(name);
    if (!sheet) continue;

    console.log(`\n================================================================`);
    console.log(`FORM: "${name}"`);
    console.log(`================================================================`);

    // In statutory forms, headers are usually between rows 5 and 11
    // Let's print rows 5 to 12 with non-empty cells
    for (let r = 5; r <= 12; r++) {
      const row = sheet.getRow(r);
      const cells = [];
      row.eachCell({ includeEmpty: false }, (cell, c) => {
        cells.push(`[Col ${c} (${cell.address})]: "${String(cell.text).trim()}"`);
      });
      if (cells.length > 0) {
        console.log(`Row ${r}: ${cells.join(' | ')}`);
      }
    }
  }
}

inspectFormColumns().catch(console.error);

