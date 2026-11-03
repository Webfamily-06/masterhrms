const ExcelJS = require('exceljs');
const fs = require('fs');
const path = 'C:\\Users\\TSV Global Solutions\\Downloads\\Paysheet_ENABL_OCT_2026 -Final.xlsx';

async function extractFormColumnsDetailed() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);

  const formSpecs = {
    'Form U': { headerRow: 9, maxCols: 27 },
    'Form V': { headerRow: 9, maxCols: 46 },
    'FORM W ': { headerRow: 9, maxCols: 34 },
    'Form X': { headerRow: 10, maxCols: 21 },
    'FORM S': { headerRow: 6, maxCols: 38 },
  };

  const results = {};

  for (const [sheetName, spec] of Object.entries(formSpecs)) {
    const sheet = wb.getWorksheet(sheetName);
    if (!sheet) continue;

    const row = sheet.getRow(spec.headerRow);
    const cols = [];

    for (let c = 1; c <= spec.maxCols; c++) {
      const cell = row.getCell(c);
      let text = cell.text ? String(cell.text).trim() : '';
      if (!text && spec.headerRow > 1) {
        // Check row above or below
        const alt = sheet.getRow(spec.headerRow - 1).getCell(c).text || sheet.getRow(spec.headerRow + 1).getCell(c).text;
        text = alt ? String(alt).trim() : `Column ${c}`;
      }
      cols.push({ col: c, letter: sheet.getColumn(c).letter, name: text || `Column ${c}` });
    }
    results[sheetName.trim()] = cols;
  }

  fs.writeFileSync('scripts/statutory_forms_cols.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('Written to scripts/statutory_forms_cols.json');
}

extractFormColumnsDetailed().catch(console.error);

