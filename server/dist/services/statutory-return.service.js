"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatutoryReturnService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const exceljs_1 = __importDefault(require("exceljs"));
const prisma_1 = require("../prisma");
class StatutoryReturnService {
    /**
     * Generates EPFO ECR Version 2.0 text file (#~# delimited, 11 columns)
     * Official Specification: EPFO Unified Employer Portal
     */
    static async generateEpfEcr(input) {
        const { tenantId, payrollRunId, establishmentId, generatedBy } = input;
        // 1. Fetch Payroll Run with payslips and employees
        const payrollRun = await prisma_1.rawPrisma.payrollRun.findFirst({
            where: { id: payrollRunId, tenantId },
            include: {
                payslips: {
                    include: {
                        employee: {
                            include: {
                                establishment: true,
                            },
                        },
                    },
                },
                snapshots: true,
            },
        });
        if (!payrollRun) {
            throw new Error('Payroll run not found.');
        }
        // 2. Fetch Establishment details if specified, or primary establishment
        let establishment = null;
        if (establishmentId) {
            establishment = await prisma_1.rawPrisma.establishment.findFirst({
                where: { id: establishmentId, tenantId },
            });
        }
        else {
            establishment = await prisma_1.rawPrisma.establishment.findFirst({
                where: { tenantId, status: 'active', epfCode: { not: null } },
            });
        }
        // 3. Filter eligible PF employees
        const snapshotMap = new Map(payrollRun.snapshots.map((s) => [s.employeeId, s]));
        const eligiblePayslips = payrollRun.payslips.filter((p) => {
            const emp = p.employee;
            if (!emp.pfEligible)
                return false;
            if (establishmentId && emp.establishmentId !== establishmentId)
                return false;
            return true;
        });
        if (eligiblePayslips.length === 0) {
            throw new Error('No eligible EPF employees found for this payroll run and establishment.');
        }
        const lines = [];
        const validationErrors = [];
        let totalGrossWages = 0;
        let totalEpfWages = 0;
        let totalEeShare = 0;
        let totalEpsShare = 0;
        let totalErShare = 0;
        for (const p of eligiblePayslips) {
            const emp = p.employee;
            const snap = snapshotMap.get(emp.id);
            // Validate UAN
            const cleanUan = (emp.uan || '').trim().replace(/\D/g, '');
            if (!cleanUan || cleanUan.length !== 12) {
                validationErrors.push({
                    employeeCode: emp.employeeCode,
                    name: `${emp.firstName} ${emp.lastName}`,
                    issue: `Missing or invalid 12-digit UAN ("${emp.uan || 'blank'}"). Mandatory for EPFO ECR 2.0.`,
                });
            }
            // Calculate Age on Wage Month to check Age 58 cutoff
            const isAge58OrAbove = this.checkAge58(emp.dateOfBirth, payrollRun.periodYear, payrollRun.periodMonth);
            // Extract breakdown numbers from payslip/snapshot
            const grossEarned = Number(p.grossSalary || 0);
            const breakdown = p.breakdown || {};
            // Standard EPF wage ceiling is ₹15,000 (unless higher wage contribution enabled)
            const basicEarned = Number(breakdown.BASIC || breakdown.Basic || grossEarned * 0.5);
            const epfWageCap = emp.pfCalculationMethod === 'actual_wages' ? grossEarned : 15000;
            const epfWages = Math.min(basicEarned, epfWageCap);
            // EPS wage: 0 if member age >= 58, else capped at ₹15,000
            const epsWages = isAge58OrAbove ? 0 : Math.min(epfWages, 15000);
            const edliWages = Math.min(epfWages, 15000);
            // Employee 12% deduction (rounded)
            const eeShare = Math.round(epfWages * 0.12);
            // Employer EPS 8.33% (capped at ₹1,250, 0 if >= 58)
            const epsShare = isAge58OrAbove ? 0 : Math.min(Math.round(epsWages * 0.0833), 1250);
            // Employer EPF share = EE share minus EPS share
            const erShare = eeShare - epsShare;
            // NCP Days (Loss of Pay / unpaid days in month)
            const ncpDays = Math.max(0, Math.min(31, Math.round(Number(snap?.lopDays || 0))));
            // Sanitize member name (alphanumeric and space only, max 80 chars)
            const memberName = `${emp.firstName} ${emp.lastName}`
                .replace(/[^a-zA-Z0-9. ]/g, '')
                .trim()
                .slice(0, 80);
            // Format line: 11 columns delimited by #~# (no trailing delimiter)
            const line = [
                cleanUan || '000000000000',
                memberName,
                Math.round(grossEarned),
                Math.round(epfWages),
                Math.round(epsWages),
                Math.round(edliWages),
                eeShare,
                epsShare,
                erShare,
                ncpDays,
                0, // Refund of Advances
            ].join('#~#');
            lines.push(line);
            totalGrossWages += grossEarned;
            totalEpfWages += epfWages;
            totalEeShare += eeShare;
            totalEpsShare += epsShare;
            totalErShare += erShare;
        }
        if (validationErrors.length > 0) {
            throw new Error(`EPF ECR Generation blocked by ${validationErrors.length} validation errors: \n` +
                validationErrors.map((v) => `• [${v.employeeCode}] ${v.name}: ${v.issue}`).join('\n'));
        }
        const content = lines.join('\r\n');
        const fileName = `EPF_ECR_${payrollRun.periodYear}_${String(payrollRun.periodMonth).padStart(2, '0')}.txt`;
        const fileHash = crypto_1.default.createHash('sha256').update(content, 'utf8').digest('hex');
        // Persist file
        const storageDir = path_1.default.join(process.cwd(), 'storage', 'tenants', tenantId, 'statutory');
        fs_1.default.mkdirSync(storageDir, { recursive: true });
        const filePath = path_1.default.join(storageDir, fileName);
        fs_1.default.writeFileSync(filePath, content, 'utf8');
        const totalChallan = totalEeShare + totalEpsShare + totalErShare;
        // Create or update StatutoryReturnFiling record
        const filing = await prisma_1.rawPrisma.statutoryReturnFiling.upsert({
            where: {
                tenantId_establishmentId_returnType_wageYear_wageMonth: {
                    tenantId,
                    establishmentId: establishment?.id || 'primary',
                    returnType: 'EPF_ECR',
                    wageYear: payrollRun.periodYear,
                    wageMonth: payrollRun.periodMonth,
                },
            },
            update: {
                totalMembers: eligiblePayslips.length,
                totalWages: totalGrossWages,
                totalEmployeeShare: totalEeShare,
                totalEmployerShare: totalEpsShare + totalErShare,
                totalChallanAmount: totalChallan,
                fileFormat: 'txt',
                fileHash,
                filePath,
                status: 'generated',
                generatedBy: generatedBy || 'system',
            },
            create: {
                tenantId,
                establishmentId: establishment?.id || null,
                payrollRunId,
                returnType: 'EPF_ECR',
                wageMonth: payrollRun.periodMonth,
                wageYear: payrollRun.periodYear,
                totalMembers: eligiblePayslips.length,
                totalWages: totalGrossWages,
                totalEmployeeShare: totalEeShare,
                totalEmployerShare: totalEpsShare + totalErShare,
                totalChallanAmount: totalChallan,
                fileFormat: 'txt',
                fileHash,
                filePath,
                status: 'generated',
                generatedBy: generatedBy || 'system',
            },
        });
        return {
            filing,
            content,
            fileName,
            fileHash,
            totalMembers: eligiblePayslips.length,
            totalGrossWages,
            totalEeShare,
            totalEpsShare,
            totalErShare,
            totalChallan,
        };
    }
    /**
     * Generates ESIC Monthly Contribution Return Spreadsheet (.xlsx or .csv)
     * Official Specification: ESIC Monthly Contribution File Upload Guide
     */
    static async generateEsicReturn(input) {
        const { tenantId, payrollRunId, establishmentId, format = 'xlsx', generatedBy } = input;
        const payrollRun = await prisma_1.rawPrisma.payrollRun.findFirst({
            where: { id: payrollRunId, tenantId },
            include: {
                payslips: {
                    include: {
                        employee: true,
                    },
                },
                snapshots: true,
            },
        });
        if (!payrollRun)
            throw new Error('Payroll run not found.');
        const snapshotMap = new Map(payrollRun.snapshots.map((s) => [s.employeeId, s]));
        // Filter eligible ESIC employees
        const eligiblePayslips = payrollRun.payslips.filter((p) => {
            const emp = p.employee;
            if (!emp.esiEligible)
                return false;
            if (establishmentId && emp.establishmentId !== establishmentId)
                return false;
            return true;
        });
        if (eligiblePayslips.length === 0) {
            throw new Error('No eligible ESIC employees found for this payroll run.');
        }
        const validationErrors = [];
        const rows = [];
        let totalWagesSum = 0;
        let totalEeContribution = 0;
        let totalErContribution = 0;
        for (const p of eligiblePayslips) {
            const emp = p.employee;
            const snap = snapshotMap.get(emp.id);
            const cleanEsi = (emp.esiNumber || '').trim().replace(/\D/g, '');
            if (!cleanEsi || cleanEsi.length < 10 || cleanEsi.length > 17) {
                validationErrors.push({
                    employeeCode: emp.employeeCode,
                    name: `${emp.firstName} ${emp.lastName}`,
                    issue: `Invalid ESIC Insurance Person (IP) Number ("${emp.esiNumber || 'blank'}"). Must be a 10 to 17-digit numeric identifier.`,
                });
            }
            const grossWages = Number(p.grossSalary || 0);
            const payableDays = Math.round(Number(snap?.payableDays || 26));
            // Employee share (0.75%), Employer share (3.25%)
            const eeContr = Math.ceil(grossWages * 0.0075);
            const erContr = Math.ceil(grossWages * 0.0325);
            let reasonCode = '';
            if (payableDays === 0) {
                reasonCode = emp.status === 'terminated' ? '02' : '01'; // 01 on leave without pay, 02 left service
            }
            rows.push({
                ipNumber: cleanEsi || '0000000000',
                ipName: `${emp.firstName} ${emp.lastName}`.trim(),
                payableDays,
                totalWages: Math.round(grossWages),
                reasonCode,
                lastWorkingDay: reasonCode === '02' ? '30/09/2026' : '',
            });
            totalWagesSum += grossWages;
            totalEeContribution += eeContr;
            totalErContribution += erContr;
        }
        if (validationErrors.length > 0) {
            throw new Error(`ESIC Return generation blocked by ${validationErrors.length} errors: \n` +
                validationErrors.map((v) => `• [${v.employeeCode}] ${v.name}: ${v.issue}`).join('\n'));
        }
        const storageDir = path_1.default.join(process.cwd(), 'storage', 'tenants', tenantId, 'statutory');
        fs_1.default.mkdirSync(storageDir, { recursive: true });
        let fileName = '';
        let filePath = '';
        let fileHash = '';
        if (format === 'xlsx') {
            const workbook = new exceljs_1.default.Workbook();
            const sheet = workbook.addWorksheet('Monthly Contribution');
            sheet.columns = [
                { header: 'IP Number', key: 'ipNumber', width: 18 },
                { header: 'IP Name', key: 'ipName', width: 28 },
                { header: 'No of Days for which wages paid', key: 'payableDays', width: 32 },
                { header: 'Total Monthly Wages', key: 'totalWages', width: 22 },
                { header: 'Reason Code for Zero Working Days', key: 'reasonCode', width: 34 },
                { header: 'Last Working Day', key: 'lastWorkingDay', width: 20 },
            ];
            // Styling header row
            sheet.getRow(1).font = { bold: true };
            rows.forEach((r) => sheet.addRow(r));
            fileName = `ESIC_Return_${payrollRun.periodYear}_${String(payrollRun.periodMonth).padStart(2, '0')}.xlsx`;
            filePath = path_1.default.join(storageDir, fileName);
            const buffer = await workbook.xlsx.writeBuffer();
            fs_1.default.writeFileSync(filePath, Buffer.from(buffer));
            fileHash = crypto_1.default.createHash('sha256').update(Buffer.from(buffer)).digest('hex');
        }
        else {
            // CSV format
            const csvLines = [
                'IP Number,IP Name,No of Days for which wages paid,Total Monthly Wages,Reason Code for Zero Working Days,Last Working Day',
                ...rows.map((r) => `${r.ipNumber},"${r.ipName.replace(/"/g, '""')}",${r.payableDays},${r.totalWages},${r.reasonCode},${r.lastWorkingDay}`),
            ];
            const csvContent = csvLines.join('\r\n');
            fileName = `ESIC_Return_${payrollRun.periodYear}_${String(payrollRun.periodMonth).padStart(2, '0')}.csv`;
            filePath = path_1.default.join(storageDir, fileName);
            fs_1.default.writeFileSync(filePath, csvContent, 'utf8');
            fileHash = crypto_1.default.createHash('sha256').update(csvContent, 'utf8').digest('hex');
        }
        const totalChallan = totalEeContribution + totalErContribution;
        // Create or update StatutoryReturnFiling record
        const filing = await prisma_1.rawPrisma.statutoryReturnFiling.upsert({
            where: {
                tenantId_establishmentId_returnType_wageYear_wageMonth: {
                    tenantId,
                    establishmentId: establishmentId || 'primary',
                    returnType: 'ESIC_MONTHLY',
                    wageYear: payrollRun.periodYear,
                    wageMonth: payrollRun.periodMonth,
                },
            },
            update: {
                totalMembers: eligiblePayslips.length,
                totalWages: totalWagesSum,
                totalEmployeeShare: totalEeContribution,
                totalEmployerShare: totalErContribution,
                totalChallanAmount: totalChallan,
                fileFormat: format,
                fileHash,
                filePath,
                status: 'generated',
                generatedBy: generatedBy || 'system',
            },
            create: {
                tenantId,
                establishmentId: establishmentId || null,
                payrollRunId,
                returnType: 'ESIC_MONTHLY',
                wageMonth: payrollRun.periodMonth,
                wageYear: payrollRun.periodYear,
                totalMembers: eligiblePayslips.length,
                totalWages: totalWagesSum,
                totalEmployeeShare: totalEeContribution,
                totalEmployerShare: totalErContribution,
                totalChallanAmount: totalChallan,
                fileFormat: format,
                fileHash,
                filePath,
                status: 'generated',
                generatedBy: generatedBy || 'system',
            },
        });
        return {
            filing,
            fileName,
            fileHash,
            totalMembers: eligiblePayslips.length,
            totalWagesSum,
            totalEeContribution,
            totalErContribution,
            totalChallan,
        };
    }
    /**
     * Helper to evaluate Age 58 cutoff for EPS wage exclusion
     */
    static checkAge58(dateOfBirth, wageYear, wageMonth) {
        if (!dateOfBirth)
            return false;
        const dob = new Date(dateOfBirth);
        let age = wageYear - dob.getFullYear();
        const monthDiff = wageMonth - (dob.getMonth() + 1);
        if (monthDiff < 0) {
            age--;
        }
        return age >= 58;
    }
}
exports.StatutoryReturnService = StatutoryReturnService;
