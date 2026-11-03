const fs = require('fs');
const meta = JSON.parse(fs.readFileSync('scripts/extracted_payroll_metadata.json', 'utf8'));

const mainSheet = meta['OCT 2026 - Final'];
console.log(`\n=== SHEET: OCT 2026 - Final (Cols: ${mainSheet.columnCount}, Rows: ${mainSheet.rowCount}) ===`);

const r1 = mainSheet.headers.find(h => h.row === 1)?.cells || [];
const r2 = mainSheet.headers.find(h => h.row === 2)?.cells || [];

const colMap = {};
for (const c of r1) {
  colMap[c.col] = { col: c.col, group: c.text, name: '' };
}
for (const c of r2) {
  if (!colMap[c.col]) colMap[c.col] = { col: c.col, group: '', name: '' };
  colMap[c.col].name = c.text;
}

const colsSorted = Object.values(colMap).sort((a,b) => a.col - b.col);

console.log(`\nCol# | Excel Col | Group Header | Field Name | Formulas Sample`);
console.log(`-----------------------------------------------------------------------------------------------------`);

function colToLetter(col) {
  let temp, letter = '';
  while (col > 0) {
    temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = (col - temp - 1) / 26;
  }
  return letter;
}

for (const c of colsSorted) {
  const colLetter = colToLetter(c.col);
  const formulas = mainSheet.formulas[c.col] || [];
  const fText = formulas.length > 0 ? formulas.map(f => f.formula).slice(0, 2).join('; ') : 'STATIC / MANUAL';
  console.log(`${String(c.col).padStart(4)} | ${colLetter.padStart(9)} | ${(c.group || '').padEnd(25)} | ${(c.name || '').padEnd(30)} | ${fText}`);
}

