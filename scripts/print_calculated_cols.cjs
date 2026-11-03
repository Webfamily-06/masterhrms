const fs = require('fs');
const audit = JSON.parse(fs.readFileSync('scripts/oct_2026_col_audit.json', 'utf8'));

console.log('=== CALCULATED COLUMNS IN OCT 2026 - Final ===\n');

for (const c of audit) {
  if (c.hasFormula || c.total.startsWith('Formula:')) {
    console.log(`Col ${c.col} (${c.letter}) | Group: "${c.group}" | Name: "${c.name}"`);
    if (c.formulas.length > 0) {
      console.log(`  Row Formulas: ${c.formulas.join('; ')}`);
    } else {
      console.log(`  Row Formulas: NONE (Only total has formula)`);
    }
    console.log(`  Total: ${c.total}\n`);
  }
}

