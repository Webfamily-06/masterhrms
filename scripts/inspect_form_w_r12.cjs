const ExcelJS = require('exceljs');
const path = 'C:\\Users\\TSV Global Solutions\\Downloads\\Paysheet_ENABL_OCT_2026 -Final.xlsx';

async function checkRow12() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const sheet = wb.getWorksheet('FORM W ');
  const r12 = sheet.getRow(12);
  const cells = [];
  r12.eachCell((c, col) => cells.push(`[C${col}]: "${c.text.trim()}"`));
  console.log('Row 12 of FORM W:\n' + cells.join(' | '));
}

checkRow12();

