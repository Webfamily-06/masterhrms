const fs = require('fs');

const excelAnalysis = JSON.parse(fs.readFileSync('scripts/excel_analysis.json', 'utf8'));
const octSheet = require('./dump-oct-sheet-columns.cjs'); // or read from JSON
const schema = fs.readFileSync('server/prisma/schema.prisma', 'utf8');

// Parse Employee fields from schema
const empFields = new Set();
const empMatch = schema.match(/model Employee \{[\s\S]*?\n\}/);
if (empMatch) {
  empMatch[0].split('\n').forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2 && !parts[0].startsWith('//') && !parts[0].startsWith('@') && !parts[0].startsWith('model')) {
      empFields.add(parts[0]);
    }
  });
}

// Parse PayrollRun and Payslip fields
const payslipFields = new Set();
const psMatch = schema.match(/model Payslip \{[\s\S]*?\n\}/);
if (psMatch) {
  psMatch[0].split('\n').forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2 && !parts[0].startsWith('//') && !parts[0].startsWith('@') && !parts[0].startsWith('model')) {
      payslipFields.add(parts[0]);
    }
  });
}

console.log('Employee fields in Prisma:', empFields.size);
console.log('Payslip fields in Prisma:', payslipFields.size);

