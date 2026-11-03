const fs = require('fs');
const file = 'server/src/services/statutory-form-data.service.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Map fatherOrSpouseName in EPF_FORM_19 and ESI_FORM_1
code = code.replace(
  'fatherOrSpouseName: "—",\r\n          uan: employee?.uan',
  'fatherOrSpouseName: employee?.fatherOrSpouseName || "—",\r\n          uan: employee?.uan'
);
code = code.replace(
  'fatherOrSpouseName: "—",\n          uan: employee?.uan',
  'fatherOrSpouseName: employee?.fatherOrSpouseName || "—",\n          uan: employee?.uan'
);

code = code.replace(
  'fatherOrSpouseName: "—",\r\n          dateOfBirth: employee?.dateOfBirth',
  'fatherOrSpouseName: employee?.fatherOrSpouseName || "—",\r\n          dateOfBirth: employee?.dateOfBirth'
);
code = code.replace(
  'fatherOrSpouseName: "—",\n          dateOfBirth: employee?.dateOfBirth',
  'fatherOrSpouseName: employee?.fatherOrSpouseName || "—",\n          dateOfBirth: employee?.dateOfBirth'
);

// 2. Map Form U, V, W, X, S and operational payslip records in WAGES_REGISTER
const oldSwitchBlock = `    case "WAGES_REGISTER_FORM_A":
    default: {
      const rosterRows = allTenantEmployees.map((emp, idx) => {
        const empMonthlyGross = Number(emp.salaryAssignments?.[0]?.ctcMonthly || emp.salary || 0);
        const empBasic = Math.round(empMonthlyGross * 0.5);
        const empHra = Math.round(empMonthlyGross * 0.2);
        const empOther = Math.round(empMonthlyGross * 0.3);
        const empEpf = Math.round(empBasic * 0.12);
        const empEsi = empMonthlyGross <= 21000 ? Math.round(empMonthlyGross * 0.0075) : 0;
        const empPt = 200;
        const empTds = Math.round(empMonthlyGross * 0.05);
        const totalDed = empEpf + empEsi + empPt + empTds;
        return {
          slNo: idx + 1,
          employeeCode: emp.employeeCode,
          employeeName: \`\${emp.firstName} \${emp.lastName}\`.trim(),
          designation: emp.position || "Staff",
          department: emp.department?.name || "General",
          daysWorked: 30,
          lopDays: 0,
          basicSalary: empBasic,
          hra: empHra,
          otherAllowances: empOther,
          overtime: 0,
          grossWages: empMonthlyGross,
          epfDeduction: empEpf,
          esiDeduction: empEsi,
          ptDeduction: empPt,
          tdsDeduction: empTds,
          otherDeductions: 0,
          totalDeductions: totalDed,
          netWages: empMonthlyGross - totalDed,
        };
      });

      formSpecificModel = {
        formCode: "WAGES_REGISTER_FORM_A",`;

const newSwitchBlock = `    case "FORM_U":
    case "FORM_V":
    case "FORM_W":
    case "FORM_X":
    case "FORM_S":
    case "WAGES_REGISTER_FORM_A":
    default: {
      const formCode = (["FORM_U", "FORM_V", "FORM_W", "FORM_X", "FORM_S"].includes(formType) ? formType : "WAGES_REGISTER_FORM_A") as any;
      const payslipByEmp = new Map(payslips.map((p) => [p.employeeId, p]));
      const snapshotByEmp = new Map(snapshots.map((s) => [s.employeeId, s]));

      const rosterRows = allTenantEmployees.map((emp, idx) => {
        const livePayslip = payslipByEmp.get(emp.id);
        const liveSnapshot = snapshotByEmp.get(emp.id);

        let empBasic = 0;
        let empHra = 0;
        let empOther = 0;
        let empGross = 0;
        let empEpf = 0;
        let empEsi = 0;
        let empPt = 0;
        let empTds = 0;
        let empTotalDed = 0;
        let empNet = 0;
        let daysWorked = 30;
        let lopDays = 0;

        if (livePayslip) {
          empGross = Number(livePayslip.grossSalary || 0);
          empBasic = Number(livePayslip.basicSalary || Math.round(empGross * 0.5));
          empHra = Number(livePayslip.allowances || Math.round(empGross * 0.2));
          empOther = Math.max(0, empGross - empBasic - empHra);
          const bd = livePayslip.breakdown as any;
          empEpf = Number(bd?.deductions?.providentFund || 0);
          empEsi = Number(bd?.deductions?.esi || 0);
          empPt = Number(bd?.deductions?.professionalTax || 0);
          empTds = Number(bd?.deductions?.tds || 0);
          empTotalDed = Number(livePayslip.deductions || (empEpf + empEsi + empPt + empTds));
          empNet = Number(livePayslip.netSalary || (empGross - empTotalDed));
          daysWorked = liveSnapshot ? Math.round(Number(liveSnapshot.payableDays || 30)) : 30;
          lopDays = liveSnapshot ? Math.round(Number(liveSnapshot.lopDays || 0)) : 0;
        } else {
          const empMonthlyGross = Number(emp.salaryAssignments?.[0]?.ctcMonthly || emp.salary || 0);
          empGross = empMonthlyGross;
          empBasic = Math.round(empMonthlyGross * 0.5);
          empHra = Math.round(empMonthlyGross * 0.2);
          empOther = Math.round(empMonthlyGross * 0.3);
          empEpf = Math.round(empBasic * 0.12);
          empEsi = empMonthlyGross <= 21000 ? Math.round(empMonthlyGross * 0.0075) : 0;
          empPt = 200;
          empTds = Math.round(empMonthlyGross * 0.05);
          empTotalDed = empEpf + empEsi + empPt + empTds;
          empNet = empMonthlyGross - empTotalDed;
          daysWorked = 30;
          lopDays = 0;
        }

        return {
          slNo: idx + 1,
          employeeCode: emp.employeeCode,
          employeeName: \`\${emp.firstName} \${emp.lastName}\`.trim(),
          designation: emp.position || "Staff",
          department: emp.department?.name || "General",
          daysWorked,
          lopDays,
          basicSalary: empBasic,
          hra: empHra,
          otherAllowances: empOther,
          overtime: 0,
          grossWages: empGross,
          epfDeduction: empEpf,
          esiDeduction: empEsi,
          ptDeduction: empPt,
          tdsDeduction: empTds,
          otherDeductions: 0,
          totalDeductions: empTotalDed,
          netWages: empNet,
        };
      });

      formSpecificModel = {
        formCode,`;

const oldSwitchBlockCRLF = oldSwitchBlock.replace(/\n/g, '\r\n');
const newSwitchBlockCRLF = newSwitchBlock.replace(/\n/g, '\r\n');

if (code.includes(oldSwitchBlockCRLF)) {
  code = code.replace(oldSwitchBlockCRLF, newSwitchBlockCRLF);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Successfully patched statutory form generator (CRLF)');
} else if (code.includes(oldSwitchBlock)) {
  code = code.replace(oldSwitchBlock, newSwitchBlock);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Successfully patched statutory form generator (LF)');
} else {
  console.error('Old switch block not found');
  process.exit(1);
}

