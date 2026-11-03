const ExcelJS = require('exceljs');
const fs = require('fs');
const path = 'C:\\Users\\TSV Global Solutions\\Downloads\\Paysheet_ENABL_OCT_2026 -Final.xlsx';

async function extractDetailedMetadata() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);

  const report = {};

  for (const sheet of workbook.worksheets) {
    if (sheet.rowCount === 0) continue;

    console.log(`Extracting: ${sheet.name}`);
    const sheetData = {
      name: sheet.name,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      headers: [],
      columns: [],
      formulas: {},
      summaryRows: [],
    };

    // Scan all rows
    for (let r = 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const cells = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let text = cell.text;
        let formula = null;
        let value = cell.value;

        if (value && typeof value === 'object') {
          if (value.formula) {
            formula = value.formula;
            text = value.result !== undefined ? String(value.result) : `[Formula: ${value.formula}]`;
          } else if (value.richText) {
            text = value.richText.map(t => t.text).join('');
          }
        }

        cells.push({
          col: colNumber,
          address: cell.address,
          text: text ? String(text).trim() : '',
          formula: formula,
        });
      });

      // Detect header vs data vs summary
      const nonEmpties = cells.filter(c => c.text !== '');
      if (nonEmpties.length === 0) continue;

      const firstCell = nonEmpties[0]?.text || '';
      if (firstCell.toUpperCase().includes('TOTAL') || firstCell.toUpperCase().includes('SUMMARY')) {
        sheetData.summaryRows.push({ row: r, cells: nonEmpties });
      }

      // Collect rows 1 to 5 for header inspection
      if (r <= 10) {
        sheetData.headers.push({ row: r, cells: nonEmpties });
      }

      // Collect formulas
      for (const c of cells) {
        if (c.formula) {
          if (!sheetData.formulas[c.col]) {
            sheetData.formulas[c.col] = [];
          }
          if (!sheetData.formulas[c.col].some(f => f.formula === c.formula)) {
            sheetData.formulas[c.col].push({ row: r, address: c.address, formula: c.formula });
          }
        }
      }
    }

    report[sheet.name] = sheetData;
  }

  fs.writeFileSync('scripts/extracted_payroll_metadata.json', JSON.stringify(report, null, 2), 'utf8');
  console.log("Metadata written to scripts/extracted_payroll_metadata.json");
}

extractDetailedMetadata().catch(console.error);

