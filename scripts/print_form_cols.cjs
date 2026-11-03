const fs = require('fs');
const forms = JSON.parse(fs.readFileSync('scripts/statutory_forms_cols.json', 'utf8'));

for (const [name, cols] of Object.entries(forms)) {
  console.log(`\n=== FORM: ${name} (${cols.length} Columns) ===`);
  cols.forEach(c => console.log(`  Col ${String(c.col).padStart(2)} (${c.letter}): "${c.name}"`));
}

