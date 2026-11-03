const fs = require('fs');
const meta = JSON.parse(fs.readFileSync('scripts/extracted_payroll_metadata.json', 'utf8'));

const sheetsToInspect = ['Summary', 'Form U', 'Form V', 'FORM W ', 'Form X', 'FORM S'];

for (const sName of sheetsToInspect) {
  const sheet = meta[sName];
  if (!sheet) {
    console.log(`Sheet not found: "${sName}"`);
    continue;
  }
  console.log(`\n================================================================`);
  console.log(`SHEET: "${sName}" (Cols: ${sheet.columnCount}, Rows: ${sheet.rowCount})`);
  console.log(`================================================================`);

  for (const h of sheet.headers) {
    console.log(`Row ${h.row}: ${h.cells.map(c => `[C${c.col}: ${c.text}]`).join(' ')}`);
  }

  const formulaCols = Object.keys(sheet.formulas);
  if (formulaCols.length > 0) {
    console.log(`\nFormulas in "${sName}":`);
    for (const col of formulaCols) {
      console.log(`  Col ${col}: ${sheet.formulas[col].map(f => `${f.address} = ${f.formula}`).join('; ')}`);
    }
  } else {
    console.log(`\nNo cell formulas found in "${sName}".`);
  }

  if (sheet.summaryRows.length > 0) {
    console.log(`\nSummary/Total Rows:`);
    for (const sr of sheet.summaryRows) {
      console.log(`  Row ${sr.row}: ${sr.cells.map(c => `[C${c.col}: ${c.text}]`).join(' ')}`);
    }
  }
}

