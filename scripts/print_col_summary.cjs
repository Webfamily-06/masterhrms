const fs = require('fs');
const audit = JSON.parse(fs.readFileSync('scripts/oct_2026_col_audit.json', 'utf8'));

console.log(`Audited ${audit.length} columns in 'OCT 2026 - Final'.\n`);

const summary = audit.map(c => ({
  col: c.col,
  letter: c.letter,
  group: c.group,
  name: c.name,
  type: c.hasFormula ? 'CALCULATED' : 'FIXED/MANUAL/MASTER',
  formulas: c.formulas,
  sampleValue: c.rowValues.slice(0, 1),
  total: c.total,
}));

console.log(JSON.stringify(summary, null, 2));

