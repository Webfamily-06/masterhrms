const ExcelJS = require('exceljs');
const fs = require('fs');
const path = 'C:\\Users\\TSV Global Solutions\\Downloads\\Paysheet_ENABL_OCT_2026 -Final.xlsx';

async function generateFullCatalog() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);

  const catalog = {};

  for (const sheet of wb.worksheets) {
    if (sheet.rowCount === 0) continue;

    const sheetName = sheet.name.trim();
    catalog[sheetName] = {
      sheetName,
      rowCount: sheet.rowCount,
      colCount: sheet.columnCount,
      columns: [],
      headerRows: [],
      dataRows: [],
      totalRows: [],
      formulas: [],
      formulaErrors: [],
    };

    // Find headers: usually rows 1-2 or 8-10
    // Let's inspect all non-empty rows
    for (let r = 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const cells = [];
      row.eachCell({ includeEmpty: true }, (cell, c) => {
        let text = cell.text ? String(cell.text).trim() : '';
        let formula = cell.value && cell.value.formula ? cell.value.formula : null;
        let isError = cell.value && cell.value.error ? cell.value.error : (text.startsWith('#') ? text : null);

        if (isError) {
          catalog[sheetName].formulaErrors.push({ row: r, col: c, address: cell.address, error: isError });
        }
        if (formula) {
          catalog[sheetName].formulas.push({ row: r, col: c, address: cell.address, formula, result: text });
        }

        cells.push({ col: c, address: cell.address, text, formula, isError });
      });

      const nonEmpties = cells.filter(c => c.text !== '');
      if (nonEmpties.length === 0) continue;

      const firstText = nonEmpties[0]?.text.toUpperCase() || '';
      if (firstText.includes('TOTAL') || firstText.includes('SUMMARY') || firstText === 'TOTAL') {
        catalog[sheetName].totalRows.push({ row: r, cells: nonEmpties });
      }
    }
  }

  fs.writeFileSync('scripts/full_payroll_catalog.json', JSON.stringify(catalog, null, 2), 'utf8');
  console.log('Full payroll catalog generated at scripts/full_payroll_catalog.json');
}

generateFullCatalog().catch(console.error);

