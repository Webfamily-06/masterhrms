const fs = require('fs');
const file = 'server/src/services/statutory-form-data.service.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `        if (livePayslip) {
          empGross = Number(livePayslip.grossSalary || 0);
          empBasic = Number(livePayslip.basicSalary || Math.round(empGross * 0.5));
          empHra = Number(livePayslip.allowances || Math.round(empGross * 0.2));
          empOther = Math.max(0, empGross - empBasic - empHra);
          const bd = livePayslip.breakdown as any;`;

const replacement = `        if (livePayslip) {
          const bd = (livePayslip.breakdown as any) || {};
          empGross = Number(livePayslip.grossSalary || 0);
          empBasic = Number(bd.earnings?.basic || bd.basic || Math.round(empGross * 0.5));
          empHra = Number(bd.earnings?.hra || bd.hra || Math.round(empGross * 0.2));
          empOther = Math.max(0, empGross - empBasic - empHra);`;

const targetCRLF = target.replace(/\n/g, '\r\n');
const replacementCRLF = replacement.replace(/\n/g, '\r\n');

if (code.includes(targetCRLF)) {
  code = code.replace(targetCRLF, replacementCRLF);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Successfully fixed statutory payslip breakdown properties (CRLF)');
} else if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Successfully fixed statutory payslip breakdown properties (LF)');
} else {
  console.error('Target not found');
  process.exit(1);
}

