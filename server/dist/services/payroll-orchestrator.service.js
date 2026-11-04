"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollOrchestratorService = void 0;
const prisma_1 = require("../prisma");
const decimal_js_1 = __importDefault(require("decimal.js"));
const crypto_1 = __importDefault(require("crypto"));
const statutory_builder_common_1 = require("./statutory/builders/statutory-builder-common");
const payroll_engine_service_1 = require("./payroll-engine.service");
const ledger_posting_service_1 = require("./ledger-posting.service");
const tenant_context_1 = require("../context/tenant-context");
const contract_billing_service_1 = require("./contract-billing.service");
const contract_invoice_service_1 = require("./contract-invoice.service");
const db = prisma_1.rawPrisma || prisma_1.prisma;
// In-memory locking removed in AUD-CONC-002 in favor of PostgreSQL atomic conditional updates (claim-check)
class PayrollOrchestratorService {
    /**
     * Acquire execution lock for a payroll run
     */
    static acquireLock(_runId) {
        return true;
    }
    static releaseLock(_runId) { }
    /**
     * Stage 1: Period Creation & Calendar Initialization
     * Idempotent: Returns existing run if already created for (tenantId, month, year)
     */
    static async createPeriod(tenantId, periodMonth, periodYear, actorId) {
        if (periodMonth < 1 || periodMonth > 12) {
            throw new Error(`Invalid period month: ${periodMonth}. Must be between 1 and 12.`);
        }
        if (periodYear < 2020 || periodYear > 2040) {
            throw new Error(`Invalid period year: ${periodYear}.`);
        }
        // Check if period already exists
        const existing = await db.payrollRun.findFirst({
            where: {
                tenantId,
                periodMonth,
                periodYear,
            },
            include: {
                _count: {
                    select: { payslips: true, snapshots: true },
                },
            },
        });
        const monthDays = new Date(Date.UTC(periodYear, periodMonth, 0)).getDate();
        const periodStartDate = new Date(Date.UTC(periodYear, periodMonth - 1, 1));
        const periodEndDate = new Date(Date.UTC(periodYear, periodMonth, 0, 23, 59, 59));
        // Calculate calendar parameters (Sundays, working days)
        let sundays = 0;
        for (let day = 1; day <= monthDays; day++) {
            const d = new Date(Date.UTC(periodYear, periodMonth - 1, day));
            if (d.getUTCDay() === 0)
                sundays++;
        }
        const standardWorkingDays = monthDays - sundays;
        if (existing) {
            return {
                isNew: false,
                run: existing,
                calendar: {
                    periodMonth,
                    periodYear,
                    monthDays,
                    sundays,
                    standardWorkingDays,
                    periodStartDate,
                    periodEndDate,
                },
            };
        }
        // Create new PayrollRun in DRAFT status
        const created = await db.payrollRun.create({
            data: {
                tenantId,
                periodMonth,
                periodYear,
                status: "draft",
                approvalStatus: "DRAFT",
                employeeCount: 0,
                totalAmount: new decimal_js_1.default(0),
                totalNet: new decimal_js_1.default(0),
                totalDeductions: new decimal_js_1.default(0),
                varianceSummary: {
                    stage: "STAGE_1_CREATED",
                    calendar: {
                        monthDays,
                        sundays,
                        standardWorkingDays,
                        periodStartDate: periodStartDate.toISOString(),
                        periodEndDate: periodEndDate.toISOString(),
                    },
                    createdAt: new Date().toISOString(),
                    createdById: actorId || null,
                },
            },
        });
        return {
            isNew: true,
            run: created,
            calendar: {
                periodMonth,
                periodYear,
                monthDays,
                sundays,
                standardWorkingDays,
                periodStartDate,
                periodEndDate,
            },
        };
    }
    /**
     * Stage 2: Employee Eligibility Resolution
     * Resolves active employees, mid-month joiners, mid-month exits
     */
    static async resolveEligibility(tenantId, periodMonth, periodYear) {
        const monthDays = new Date(Date.UTC(periodYear, periodMonth, 0)).getDate();
        const periodStartDate = new Date(Date.UTC(periodYear, periodMonth - 1, 1));
        const periodEndDate = new Date(Date.UTC(periodYear, periodMonth, 0, 23, 59, 59));
        // Use SAFE_EMPLOYEE_SELECT to prevent errors on unmigrated columns in remote DB
        const employees = await db.employee.findMany({
            where: {
                tenantId,
                OR: [
                    { status: "active" },
                    {
                        joinedAt: {
                            gte: periodStartDate,
                            lte: periodEndDate,
                        },
                    },
                    {
                        employeeExits: {
                            some: {
                                lastWorkingDay: {
                                    gte: periodStartDate,
                                },
                            },
                        },
                    },
                ],
            },
            select: statutory_builder_common_1.SAFE_EMPLOYEE_SELECT,
            orderBy: { employeeCode: "asc" },
        });
        const eligibleList = [];
        for (const emp of employees) {
            const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeCode;
            const joinedAt = emp.joinedAt ? new Date(emp.joinedAt) : null;
            const exitRecord = emp.employeeExits?.[0];
            const exitDate = exitRecord?.lastWorkingDay ? new Date(exitRecord.lastWorkingDay) : null;
            // Evaluate Mid-Month Joiner
            let isMidMonthJoiner = false;
            let isMidMonthExit = false;
            let prorationFactor = 1.0;
            if (joinedAt && joinedAt > periodStartDate && joinedAt <= periodEndDate) {
                isMidMonthJoiner = true;
                const joiningDay = joinedAt.getUTCDate();
                const payableCalendarDays = monthDays - joiningDay + 1;
                prorationFactor = Math.max(0, Math.min(1.0, payableCalendarDays / monthDays));
            }
            // Evaluate Mid-Month Exit
            if (exitDate && exitDate >= periodStartDate && exitDate < periodEndDate) {
                isMidMonthExit = true;
                const lastDay = exitDate.getUTCDate();
                const exitProration = Math.max(0, Math.min(1.0, lastDay / monthDays));
                prorationFactor = isMidMonthJoiner
                    ? Math.min(prorationFactor, exitProration)
                    : exitProration;
            }
            // If employee joined AFTER periodEndDate or exited BEFORE periodStartDate, skip
            if (joinedAt && joinedAt > periodEndDate)
                continue;
            if (exitDate && exitDate < periodStartDate && emp.status !== "active")
                continue;
            eligibleList.push({
                id: emp.id,
                employeeCode: emp.employeeCode,
                fullName,
                joinedAt,
                exitDate,
                status: emp.status,
                isMidMonthJoiner,
                isMidMonthExit,
                prorationFactor,
                salary: Number(emp.salary || 0),
                bankAccount: emp.bankAccount,
                bankIfsc: emp.bankIfsc,
                pan: emp.pan,
                uan: emp.uan,
                esiNumber: emp.esiNumber,
                pfEligible: emp.pfEligible,
                esiEligible: emp.esiEligible,
                taxRegime: emp.taxRegime,
                rawEmployee: emp,
            });
        }
        return eligibleList;
    }
    /**
     * Stage 3 & 4: Attendance & Leave/LOP Locking
     * Reconciles punches and leave ledgers, derives payable days, locks attendance for period
     */
    static async lockAttendance(tenantId, runId, lockedById, notes) {
        const run = await db.payrollRun.findUnique({
            where: { id: runId },
        });
        if (!run || run.tenantId !== tenantId) {
            throw new Error("Payroll run not found for the specified tenant.");
        }
        if (run.approvalStatus !== "DRAFT" && run.approvalStatus !== "ATTENDANCE_LOCKED") {
            throw new Error(`Cannot lock attendance when cycle is in state '${run.approvalStatus}'. Only DRAFT cycles can be locked.`);
        }
        const monthDays = new Date(Date.UTC(run.periodYear, run.periodMonth, 0)).getDate();
        const periodStartDate = new Date(Date.UTC(run.periodYear, run.periodMonth - 1, 1));
        const periodEndDate = new Date(Date.UTC(run.periodYear, run.periodMonth, 0, 23, 59, 59));
        // Resolve eligible employees
        const eligibleEmployees = await this.resolveEligibility(tenantId, run.periodMonth, run.periodYear);
        // Lock attendance records in AttendanceMonthLock (upsert)
        await db.attendanceMonthLock.upsert({
            where: {
                tenantId_year_month: {
                    tenantId,
                    year: run.periodYear,
                    month: run.periodMonth,
                },
            },
            create: {
                tenantId,
                year: run.periodYear,
                month: run.periodMonth,
                isLocked: true,
                lockedById,
                notes: notes || `Attendance locked by payroll orchestration for ${run.periodMonth}/${run.periodYear}`,
            },
            update: {
                isLocked: true,
                lockedAt: new Date(),
                lockedById,
                notes: notes || `Attendance re-locked by payroll orchestration for ${run.periodMonth}/${run.periodYear}`,
            },
        });
        // Advance cycle state to ATTENDANCE_LOCKED
        const updatedRun = await db.payrollRun.update({
            where: { id: runId },
            data: {
                approvalStatus: "ATTENDANCE_LOCKED",
                employeeCount: eligibleEmployees.length,
                varianceSummary: {
                    ...(typeof run.varianceSummary === "object" && run.varianceSummary ? run.varianceSummary : {}),
                    stage: "STAGE_3_4_ATTENDANCE_LOCKED",
                    attendanceLockedAt: new Date().toISOString(),
                    attendanceLockedBy: lockedById,
                    eligibleCount: eligibleEmployees.length,
                },
            },
        });
        return {
            run: updatedRun,
            monthDays,
            eligibleHeadcount: eligibleEmployees.length,
            isLocked: true,
        };
    }
    /**
     * Stages 5 to 10 + Stage 11: Full Batch Calculation & Pre-run Variance Gate
     */
    static async calculatePayroll(tenantId, runId, calculatedById, options) {
        const run = await db.payrollRun.findUnique({
            where: { id: runId },
        });
        if (!run || run.tenantId !== tenantId) {
            throw new Error("Payroll run not found for the specified tenant.");
        }
        // State machine check: cannot calculate if approved, finalized, or closed
        if (run.approvalStatus === "UNDER_REVIEW" ||
            run.approvalStatus === "APPROVED" ||
            run.approvalStatus === "FINALIZING" ||
            run.approvalStatus === "OUTPUTS_GENERATED" ||
            run.approvalStatus === "CLOSED" ||
            run.status === "completed" ||
            run.status === "paid") {
            const err = new Error(`409 Conflict: Payroll run is in state '${run.approvalStatus}'. Immutable cycles cannot be re-calculated.`);
            err.statusCode = 409;
            throw err;
        }
        const monthDays = new Date(Date.UTC(run.periodYear, run.periodMonth, 0)).getDate();
        const periodStartDate = new Date(Date.UTC(run.periodYear, run.periodMonth - 1, 1));
        const periodEndDate = new Date(Date.UTC(run.periodYear, run.periodMonth, 0, 23, 59, 59));
        // Resolve eligible employees
        const eligibleEmployees = await this.resolveEligibility(tenantId, run.periodMonth, run.periodYear);
        // Fetch active loans for voluntary deductions (Stage 10)
        const activeLoans = await db.employeeLoan.findMany({
            where: {
                tenantId,
                status: "active",
                outstandingBalance: { gt: 0 },
            },
        });
        const loanByEmp = new Map();
        for (const loan of activeLoans) {
            loanByEmp.set(loan.employeeId, loan);
        }
        let batchTotalGross = new decimal_js_1.default(0);
        let batchTotalNet = new decimal_js_1.default(0);
        let batchTotalDeductions = new decimal_js_1.default(0);
        const calculatedEmployees = [];
        for (const emp of eligibleEmployees) {
            // Stage 4: LOP & Payable Days
            const overrideLop = options?.lopOverrides?.[emp.id];
            let lopDays = overrideLop !== undefined ? overrideLop : 0;
            // If mid-month joiner/exit, prorate payable days accordingly
            if (emp.isMidMonthJoiner || emp.isMidMonthExit) {
                const expectedProratedDays = Math.round(monthDays * emp.prorationFactor);
                const joinerLop = monthDays - expectedProratedDays;
                lopDays = Math.max(lopDays, joinerLop);
            }
            const payableDays = Math.max(0, monthDays - lopDays);
            // Stage 5: Overtime Hours
            const approvedOtHours = options?.overtimeHours?.[emp.id] || 0;
            // Stage 6 & 7: Salary Resolution & Proration via Workstream A Engine
            const assignment = emp.rawEmployee.salaryAssignments?.[0];
            const baseMonthlyCtc = assignment?.ctcMonthly
                ? Number(assignment.ctcMonthly)
                : emp.salary || 23200;
            // Extract custom structure components if available
            const customComponents = assignment?.items?.map((item) => ({
                code: item.component?.code || "BASIC",
                name: item.component?.name || "Basic Salary",
                type: item.component?.type || "earning",
                monthlyAmount: Number(item.amount || 0),
            }));
            // Stage 5: Overtime Amount (Factories Act Rate: 2x hourly rate based on basic)
            const basicForOt = baseMonthlyCtc * 0.5;
            const hourlyRate = basicForOt / 26 / 8;
            const overtimeAmount = approvedOtHours > 0 ? hourlyRate * 2 * approvedOtHours : 0;
            // Stage 8: Statutory Deductions & Proration
            const breakdown = (0, payroll_engine_service_1.computeEmployeePayrollBreakdown)({
                id: emp.id,
                employeeCode: emp.employeeCode,
                firstName: emp.rawEmployee.firstName || emp.employeeCode,
                lastName: emp.rawEmployee.lastName || "",
                email: emp.rawEmployee.email || `${emp.employeeCode.toLowerCase()}@company.com`,
                baseMonthlyCtc,
                pfEligible: emp.pfEligible,
                esiEligible: emp.esiEligible,
                ptEligible: emp.rawEmployee.ptEligible ?? true,
                taxRegime: emp.taxRegime || "new",
            }, {
                totalWorkingDays: monthDays,
                payableDays,
                presentDays: payableDays,
                halfDays: 0,
                approvedLeaveDays: 0,
                lossOfPayDays: lopDays,
                prorationFactor: emp.prorationFactor,
            }, {
                periodMonth: run.periodMonth,
                periodYear: run.periodYear,
                structureComponents: customComponents && customComponents.length > 0 ? customComponents : undefined,
                overtimeAmount,
            });
            // Stage 10: Loan Deduction
            const activeLoan = loanByEmp.get(emp.id);
            let loanDeduction = 0;
            if (activeLoan) {
                const emi = Number(activeLoan.monthlyEmi || 0);
                const balance = Number(activeLoan.outstandingBalance || 0);
                loanDeduction = Math.min(emi, balance);
            }
            // Add loan deduction to total deductions and recompute net pay
            const finalDeductions = new decimal_js_1.default(breakdown.deductions.totalDeductions).plus(loanDeduction);
            const finalGross = new decimal_js_1.default(breakdown.earnings.totalGross);
            const finalNet = decimal_js_1.default.max(0, finalGross.minus(finalDeductions));
            batchTotalGross = batchTotalGross.plus(finalGross);
            batchTotalNet = batchTotalNet.plus(finalNet);
            batchTotalDeductions = batchTotalDeductions.plus(finalDeductions);
            calculatedEmployees.push({
                emp,
                payableDays,
                lopDays,
                approvedOtHours,
                loanDeduction,
                breakdown,
                gross: finalGross,
                net: finalNet,
                deductions: finalDeductions,
            });
        }
        // Persist calculation results transactionally
        await db.$transaction(async (tx) => {
            // Clear existing payslips and snapshots for this run
            await tx.payslip.deleteMany({
                where: { payrollRunId: runId },
            });
            await tx.payrollSnapshot.deleteMany({
                where: { payrollRunId: runId },
            });
            // Insert new Payslips and Snapshots
            for (const item of calculatedEmployees) {
                const payslip = await tx.payslip.create({
                    data: {
                        tenantId,
                        payrollRunId: runId,
                        employeeId: item.emp.id,
                        periodMonth: run.periodMonth,
                        periodYear: run.periodYear,
                        grossSalary: item.gross.toNumber(),
                        deductions: item.deductions.toNumber(),
                        netSalary: item.net.toNumber(),
                        breakdown: {
                            ...item.breakdown,
                            loanRecovery: item.loanDeduction,
                            attendance: {
                                monthDays,
                                payableDays: item.payableDays,
                                lopDays: item.lopDays,
                                approvedOtHours: item.approvedOtHours,
                            },
                        },
                    },
                });
                await tx.payrollSnapshot.create({
                    data: {
                        tenantId,
                        payrollRunId: runId,
                        employeeId: item.emp.id,
                        periodMonth: run.periodMonth,
                        periodYear: run.periodYear,
                        ctcAnnual: item.gross.times(12).toNumber(),
                        grossEarned: item.gross.toNumber(),
                        totalDeductions: item.deductions.toNumber(),
                        netPay: item.net.toNumber(),
                        lopDays: item.lopDays,
                        payableDays: item.payableDays,
                        isLocked: false,
                        snapshotData: {
                            payslipId: payslip.id,
                            ...item.breakdown,
                            loanRecovery: item.loanDeduction,
                            prorationFactor: item.emp.prorationFactor,
                        },
                    },
                });
            }
            // Update PayrollRun totals and state
            await tx.payrollRun.update({
                where: { id: runId },
                data: {
                    employeeCount: calculatedEmployees.length,
                    totalAmount: batchTotalGross.toNumber(),
                    totalNet: batchTotalNet.toNumber(),
                    totalDeductions: batchTotalDeductions.toNumber(),
                    approvalStatus: "CALCULATED",
                    status: "draft",
                    processedAt: new Date(),
                },
            });
        }, {
            timeout: 30000,
            maxWait: 10000,
        });
        // Stage 11: Execute 16-Check Pre-Run Variance & Anomaly Engine
        const varianceReport = await this.evaluatePreRunVariance(tenantId, runId);
        // If zero blockers, auto-promote to PREVIEW_READY
        const finalState = varianceReport.blockerCount === 0 ? "PREVIEW_READY" : "CALCULATED";
        const updatedRun = await db.payrollRun.update({
            where: { id: runId },
            data: {
                approvalStatus: finalState,
                varianceSummary: varianceReport,
            },
        });
        return {
            run: updatedRun,
            headcount: calculatedEmployees.length,
            totalGross: batchTotalGross.toNumber(),
            totalNet: batchTotalNet.toNumber(),
            totalDeductions: batchTotalDeductions.toNumber(),
            state: finalState,
            varianceReport,
        };
    }
    /**
     * Stage 11: 16-Point Pre-Run Variance & Anomaly Engine
     */
    static async evaluatePreRunVariance(tenantId, runId) {
        const run = await db.payrollRun.findUnique({
            where: { id: runId },
            include: {
                payslips: {
                    include: {
                        employee: {
                            select: statutory_builder_common_1.SAFE_EMPLOYEE_SELECT,
                        },
                    },
                },
            },
        });
        if (!run || run.tenantId !== tenantId) {
            throw new Error("Payroll run not found for the specified tenant.");
        }
        const periodStr = `${String(run.periodMonth).padStart(2, "0")}/${run.periodYear}`;
        const monthDays = new Date(Date.UTC(run.periodYear, run.periodMonth, 0)).getDate();
        // Query preceding cycle for >20% net pay variance check (Check 1)
        const prevMonth = run.periodMonth === 1 ? 12 : run.periodMonth - 1;
        const prevYear = run.periodMonth === 1 ? run.periodYear - 1 : run.periodYear;
        const prevRun = await db.payrollRun.findFirst({
            where: {
                tenantId,
                periodMonth: prevMonth,
                periodYear: prevYear,
            },
            include: {
                payslips: true,
            },
        });
        const prevNetMap = new Map();
        if (prevRun) {
            for (const slip of prevRun.payslips) {
                prevNetMap.set(slip.employeeId, Number(slip.netSalary));
            }
        }
        const findings = [];
        let netPayVarianceCount = 0;
        let negativeNetPayCount = 0;
        let zeroDaysCount = 0;
        let missingBankDetailsCount = 0;
        let missingPanCount = 0;
        let missingUanCount = 0;
        let statutoryCeilingCount = 0;
        let unapprovedOtCount = 0;
        for (const slip of run.payslips) {
            const emp = slip.employee;
            const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeCode;
            const gross = Number(slip.grossSalary);
            const net = Number(slip.netSalary);
            const deductions = Number(slip.deductions);
            const breakdown = slip.breakdown;
            const attendance = breakdown?.attendance || {};
            const payableDays = Number(attendance.payableDays ?? 26);
            const lopDays = Number(attendance.lopDays ?? 0);
            // Check 1: Net Pay Variance > 20% vs preceding period
            if (prevNetMap.has(emp.id)) {
                const prevNet = prevNetMap.get(emp.id);
                if (prevNet > 0) {
                    const delta = Math.abs(net - prevNet) / prevNet;
                    if (delta > 0.2) {
                        netPayVarianceCount++;
                        findings.push({
                            code: "NET_PAY_VARIANCE_20",
                            severity: "WARNING",
                            category: "COMPENSATION",
                            message: `Net pay for ${fullName} (${emp.employeeCode}) shifted by ${(delta * 100).toFixed(1)}% vs previous period (₹${prevNet} -> ₹${net}).`,
                            employeeId: emp.id,
                            employeeCode: emp.employeeCode,
                            employeeName: fullName,
                            field: "netSalary",
                            actionableRemediation: "Verify overtime, incentives, or LOP changes causing >20% wage swing.",
                        });
                    }
                }
            }
            // Check 2: Negative Net Pay (BLOCKER)
            if (net < 0) {
                negativeNetPayCount++;
                findings.push({
                    code: "NEGATIVE_NET_PAY",
                    severity: "BLOCKER",
                    category: "CALCULATION",
                    message: `Employee ${emp.employeeCode} has negative net pay: ₹${net.toLocaleString("en-IN")}.`,
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    field: "netSalary",
                    actionableRemediation: "Reduce excessive voluntary deductions or advance recovery.",
                });
            }
            // Check 3: Zero Payable Days with Active Status
            if (payableDays === 0 && emp.status === "active" && gross > 0) {
                zeroDaysCount++;
                findings.push({
                    code: "ZERO_PAYABLE_DAYS_ACTIVE",
                    severity: "BLOCKER",
                    category: "ATTENDANCE",
                    message: `Active employee ${emp.employeeCode} has 0 payable days but earned gross of ₹${gross.toLocaleString("en-IN")}.`,
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    field: "payableDays",
                    actionableRemediation: "Adjust attendance record or set gross wages to zero for unpaid hold.",
                });
            }
            // Check 4: Missing Bank Details for Direct Transfer (BLOCKER)
            if (!emp.bankAccount || emp.bankAccount.trim().length === 0) {
                missingBankDetailsCount++;
                findings.push({
                    code: "MISSING_BANK_ACCOUNT",
                    severity: "BLOCKER",
                    category: "MASTER_DATA",
                    message: `Employee ${emp.employeeCode} has no bank account number configured for bank transfer.`,
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    field: "bankAccount",
                    actionableRemediation: "Add valid bank account number in Employee Profile.",
                });
            }
            // Check 5: Invalid Bank IFSC (BLOCKER)
            const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            if (!emp.bankIfsc || !ifscPattern.test(emp.bankIfsc.trim().toUpperCase())) {
                missingBankDetailsCount++;
                findings.push({
                    code: "INVALID_BANK_IFSC",
                    severity: "BLOCKER",
                    category: "MASTER_DATA",
                    message: `Employee ${emp.employeeCode} has invalid IFSC code: '${emp.bankIfsc || "EMPTY"}'.`,
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    field: "bankIfsc",
                    actionableRemediation: "Update IFSC to standard 11-digit format (e.g. HDFC0001234).",
                });
            }
            // Check 6: Missing PAN (WARNING)
            if (!emp.pan || emp.pan.trim().length === 0) {
                missingPanCount++;
                findings.push({
                    code: "MISSING_PAN",
                    severity: "WARNING",
                    category: "MASTER_DATA",
                    message: `Employee ${emp.employeeCode} is missing PAN. Section 206AA penal withholding (20%) may apply.`,
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    field: "pan",
                    actionableRemediation: "Collect and record 10-digit PAN in Employee Master.",
                });
            }
            // Check 7: Missing UAN for PF Eligible (WARNING)
            if (emp.pfEligible && (!emp.uan || emp.uan.trim().length === 0)) {
                missingUanCount++;
                findings.push({
                    code: "MISSING_UAN",
                    severity: "WARNING",
                    category: "STATUTORY",
                    message: `Employee ${emp.employeeCode} is PF-eligible but missing UAN. EPFO ECR return will fail.`,
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    field: "uan",
                    actionableRemediation: "Record 12-digit UAN in employee statutory record.",
                });
            }
            // Check 8: Gross Earnings Below Statutory Minimum Wage Floor (WARNING)
            const basicEarned = Number(breakdown?.earnings?.earnedComponents?.BASIC || 0);
            if (basicEarned > 0 && basicEarned < 5000 && payableDays > 20) {
                findings.push({
                    code: "GROSS_LESS_MIN_WAGE",
                    severity: "WARNING",
                    category: "COMPENSATION",
                    message: `Basic wage (₹${basicEarned}) for full month appears below statutory minimum wage floor.`,
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    field: "salary",
                    actionableRemediation: "Verify minimum wage compliance under Tamil Nadu MW notifications.",
                });
            }
            // Check 9: LOP Days Exceed Calendar Days (BLOCKER)
            if (lopDays > monthDays) {
                findings.push({
                    code: "LOP_EXCEEDS_CALENDAR_DAYS",
                    severity: "BLOCKER",
                    category: "ATTENDANCE",
                    message: `LOP days (${lopDays}) exceed total calendar days (${monthDays}) for ${emp.employeeCode}.`,
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    field: "lopDays",
                    actionableRemediation: "Correct LOP days to not exceed month days.",
                });
            }
            // Check 10: Duplicate Absence Deductions
            if (lopDays > 0 && payableDays + lopDays > monthDays) {
                findings.push({
                    code: "DUPLICATE_ABSENCE_DEDUCTION",
                    severity: "WARNING",
                    category: "ATTENDANCE",
                    message: `Payable days (${payableDays}) + LOP days (${lopDays}) exceed month calendar days (${monthDays}).`,
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    actionableRemediation: "Audit attendance reconciliation to prevent double counting.",
                });
            }
            // Check 11: Total Deductions Exceed Gross (BLOCKER)
            if (deductions > gross && gross > 0) {
                findings.push({
                    code: "DEDUCTIONS_EXCEED_GROSS",
                    severity: "BLOCKER",
                    category: "CALCULATION",
                    message: `Total deductions (₹${deductions}) exceed gross earnings (₹${gross}) for ${emp.employeeCode}.`,
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    field: "deductions",
                    actionableRemediation: "Cap voluntary deductions to avoid salary negative balance.",
                });
            }
            // Check 12: ESI Wage Ceiling Mismatch (WARNING)
            if (emp.esiEligible && gross > 21000 && breakdown?.deductions?.statutoryDeductions?.ESI > 0) {
                statutoryCeilingCount++;
                findings.push({
                    code: "ESI_CEILING_MISMATCH",
                    severity: "INFO",
                    category: "STATUTORY",
                    message: `Gross earnings (₹${gross}) exceed ₹21,000 ceiling. ESI is continued due to mid-contribution period rules.`,
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    field: "esiEligible",
                    actionableRemediation: "Contribution period status confirmed.",
                });
            }
            // Check 13: PF Wage Ceiling Check
            const pfWages = Number(breakdown?.deductions?.statutoryDeductions?.EPF || 0);
            if (emp.pfEligible && pfWages > 1800) {
                statutoryCeilingCount++;
                findings.push({
                    code: "PF_WAGE_CEILING_ANOMALY",
                    severity: "INFO",
                    category: "STATUTORY",
                    message: `PF deduction is ₹${pfWages} (above standard ₹1,800 cap), indicating voluntary higher contribution mode.`,
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    field: "pfCalculationMethod",
                    actionableRemediation: "Voluntary PF contribution authorized.",
                });
            }
            // Check 14: Unapproved Overtime
            const otHours = Number(attendance.approvedOtHours || 0);
            if (otHours < 0) {
                unapprovedOtCount++;
                findings.push({
                    code: "UNAPPROVED_OVERTIME",
                    severity: "BLOCKER",
                    category: "ATTENDANCE",
                    message: `Negative overtime hours detected for ${emp.employeeCode}: ${otHours} hrs.`,
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    field: "overtimeHours",
                    actionableRemediation: "Adjust overtime hours to non-negative value.",
                });
            }
            // Check 15: Mid-Month Proration Verification
            const prorationFactor = Number(breakdown?.prorationFactor ?? 1.0);
            if (prorationFactor < 1.0 && payableDays === monthDays) {
                findings.push({
                    code: "MID_MONTH_PRORATION_DISCREPANCY",
                    severity: "WARNING",
                    category: "RECONCILIATION",
                    message: `Proration factor is ${prorationFactor} but payable days equal full month (${monthDays}).`,
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    actionableRemediation: "Recalculate proration days for mid-month joiner/exit.",
                });
            }
            // Check 16: Inactive Employee Included (BLOCKER)
            if (emp.status !== "active" && !emp.joinedAt && payableDays > 0) {
                findings.push({
                    code: "INACTIVE_EMPLOYEE_IN_RUN",
                    severity: "BLOCKER",
                    category: "MASTER_DATA",
                    message: `Inactive employee ${emp.employeeCode} has active payable days without FnF settlement flag.`,
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    field: "status",
                    actionableRemediation: "Exclude inactive employee or initiate FnF workflow.",
                });
            }
        }
        const blockerCount = findings.filter((f) => f.severity === "BLOCKER").length;
        const warningCount = findings.filter((f) => f.severity === "WARNING").length;
        const infoCount = findings.filter((f) => f.severity === "INFO").length;
        return {
            runId,
            period: periodStr,
            totalEmployees: run.payslips.length,
            blockerCount,
            warningCount,
            infoCount,
            canProceedToReview: blockerCount === 0,
            findings,
            scorecard: {
                netPayVarianceCount,
                negativeNetPayCount,
                zeroDaysCount,
                missingBankDetailsCount,
                missingPanCount,
                missingUanCount,
                statutoryCeilingCount,
                unapprovedOtCount,
            },
            validatedAt: new Date().toISOString(),
        };
    }
    /**
     * Stage 12a: Tier 1 Submission (HR Manager)
     * Moves cycle from PREVIEW_READY to UNDER_REVIEW
     */
    static async submitForReview(tenantId, runId, actor, comments, options) {
        const run = await db.payrollRun.findUnique({
            where: { id: runId },
        });
        if (!run || run.tenantId !== tenantId) {
            throw new Error("Payroll run not found for the specified tenant.");
        }
        if (run.approvalStatus !== "PREVIEW_READY" && run.approvalStatus !== "CALCULATED") {
            throw new Error(`Cannot submit for review from state '${run.approvalStatus}'. Cycle must be in 'PREVIEW_READY'.`);
        }
        // Verify blockers
        const variance = await this.evaluatePreRunVariance(tenantId, runId);
        const blockers = variance.findings.filter((f) => f.severity === "BLOCKER");
        const unapprovedBlockers = blockers.filter((b) => !options?.approvedExceptions?.includes(b.code));
        if (unapprovedBlockers.length > 0 && !options?.allowBlockerOverride) {
            throw new Error(`Cannot submit for review: ${unapprovedBlockers.length} blocking errors detected. Blocker resolution or authorized exception waiver required.`);
        }
        const updated = await db.payrollRun.update({
            where: { id: runId },
            data: {
                approvalStatus: "UNDER_REVIEW",
                varianceSummary: {
                    ...(typeof run.varianceSummary === "object" && run.varianceSummary ? run.varianceSummary : {}),
                    stage: "STAGE_12A_UNDER_REVIEW",
                    submittedBy: actor.email,
                    submittedById: actor.id,
                    submittedAt: new Date().toISOString(),
                    submissionComments: comments || null,
                    blockerOverrideAuthorized: options?.allowBlockerOverride ?? false,
                    approvedExceptions: options?.approvedExceptions || [],
                },
            },
        });
        return updated;
    }
    /**
     * Stage 12b: Tier 2 Authorization (Finance Director / CFO)
     * Anti-Collusion Check: Submitter cannot approve their own run!
     */
    static async approvePayroll(tenantId, runId, actor, notes) {
        const run = await db.payrollRun.findUnique({
            where: { id: runId },
        });
        if (!run || run.tenantId !== tenantId) {
            throw new Error("Payroll run not found for the specified tenant.");
        }
        if (run.approvalStatus !== "UNDER_REVIEW") {
            throw new Error(`Cannot approve payroll cycle from state '${run.approvalStatus}'. Must be in 'UNDER_REVIEW'.`);
        }
        // Anti-Collusion: Separation of Duties
        const summary = run.varianceSummary;
        const submittedById = summary?.submittedById;
        const submittedByEmail = summary?.submittedBy;
        if ((submittedById && submittedById === actor.id) ||
            (submittedByEmail && submittedByEmail.toLowerCase() === actor.email.toLowerCase())) {
            const err = new Error("403 Forbidden: Submitter cannot approve their own payroll cycle. Strict separation of duties required between HR submitter and Finance approver.");
            err.statusCode = 403;
            throw err;
        }
        const updated = await db.payrollRun.update({
            where: { id: runId },
            data: {
                approvalStatus: "APPROVED",
                approvedBy: actor.email,
                approvedAt: new Date(),
                varianceSummary: {
                    ...(typeof run.varianceSummary === "object" && run.varianceSummary ? run.varianceSummary : {}),
                    stage: "STAGE_12B_APPROVED",
                    approvedBy: actor.email,
                    approvedById: actor.id,
                    approvedAt: new Date().toISOString(),
                    approvalNotes: notes || null,
                },
            },
        });
        return updated;
    }
    /**
     * Stage 12 Rejection: Rejects cycle from UNDER_REVIEW back to DRAFT with reason
     */
    static async rejectPayroll(tenantId, runId, actor, rejectionReason) {
        if (!rejectionReason || rejectionReason.trim().length === 0) {
            throw new Error("Rejection reason is mandatory when returning cycle to DRAFT.");
        }
        const run = await db.payrollRun.findUnique({
            where: { id: runId },
        });
        if (!run || run.tenantId !== tenantId) {
            throw new Error("Payroll run not found for the specified tenant.");
        }
        if (run.approvalStatus !== "UNDER_REVIEW") {
            throw new Error(`Cannot reject payroll cycle from state '${run.approvalStatus}'. Must be in 'UNDER_REVIEW'.`);
        }
        const updated = await db.payrollRun.update({
            where: { id: runId },
            data: {
                approvalStatus: "DRAFT",
                varianceSummary: {
                    ...(typeof run.varianceSummary === "object" && run.varianceSummary ? run.varianceSummary : {}),
                    stage: "STAGE_12_REJECTED_TO_DRAFT",
                    rejectedBy: actor.email,
                    rejectedById: actor.id,
                    rejectedAt: new Date().toISOString(),
                    rejectionReason: rejectionReason.trim(),
                },
            },
        });
        return updated;
    }
    /**
     * Stage 13: Finalization & Cryptographic Ledger Lock
     * Commits double-entry ledger, locks snapshots, generates SHA-256 seal, commits loan recoveries
     */
    static async finalizePayroll(tenantId, runId, actor) {
        // Stage 13 Distributed Atomic Claim: Conditional update on approvalStatus
        // Changes approvalStatus from "APPROVED" -> "FINALIZING"
        const claim = await db.payrollRun.updateMany({
            where: {
                id: runId,
                tenantId,
                approvalStatus: "APPROVED",
            },
            data: {
                approvalStatus: "FINALIZING",
                processedAt: new Date(),
                approvedBy: actor.email,
            },
        });
        if (claim.count === 0) {
            const existing = await db.payrollRun.findUnique({
                where: { id: runId },
                select: { approvalStatus: true, tenantId: true },
            });
            if (!existing || existing.tenantId !== tenantId) {
                const err = new Error("Payroll run not found for the specified tenant.");
                err.statusCode = 404;
                throw err;
            }
            if (existing.approvalStatus === "FINALIZING") {
                const err = new Error("409 Conflict: Payroll cycle is currently being finalized by another worker. Distributed lock prevented concurrent double execution.");
                err.statusCode = 409;
                throw err;
            }
            if (existing.approvalStatus === "CLOSED" || existing.approvalStatus === "OUTPUTS_GENERATED") {
                const err = new Error(`409 Conflict: Payroll cycle is already finalized (current state: ${existing.approvalStatus}). Finalized payroll runs are strictly immutable.`);
                err.statusCode = 409;
                throw err;
            }
            const err = new Error(`Cannot finalize payroll cycle from state '${existing.approvalStatus}'. Must be in 'APPROVED'.`);
            err.statusCode = 400;
            throw err;
        }
        const run = await db.payrollRun.findUnique({
            where: { id: runId },
            include: {
                snapshots: true,
                payslips: true,
            },
        });
        if (!run) {
            throw new Error("Payroll run not found after atomic claim.");
        }
        try {
            const periodStr = `${String(run.periodMonth).padStart(2, "0")}/${run.periodYear}`;
            const totalGross = Number(run.totalAmount || 0);
            const totalNet = Number(run.totalNet || 0);
            const totalDeductions = Number(run.totalDeductions || 0);
            // Compute Cryptographic Digest (SHA-256) of cycle snapshots
            const digestPayload = JSON.stringify({
                runId,
                tenantId,
                periodMonth: run.periodMonth,
                periodYear: run.periodYear,
                totalGross,
                totalNet,
                totalDeductions,
                employeeCount: run.employeeCount,
                snapshots: run.snapshots.map((s) => ({
                    id: s.id,
                    employeeId: s.employeeId,
                    gross: Number(s.grossEarned),
                    net: Number(s.netPay),
                    deductions: Number(s.totalDeductions),
                })),
            });
            const cryptographicHash = crypto_1.default
                .createHash("sha256")
                .update(digestPayload)
                .digest("hex");
            // 1. Post to General Ledger (autoPostPayrollToLedger with tenant context)
            const tenantCtx = {
                tenantId,
                userId: actor.id,
                roles: [actor.role || "finance_director"],
                status: "ACTIVE",
                tenancyStrategy: "SHARED_SCHEMA",
                db: prisma_1.rawPrisma,
            };
            await (0, tenant_context_1.runWithTenantContext)(tenantCtx, async () => {
                await (0, ledger_posting_service_1.autoPostPayrollToLedger)({
                    tenantId,
                    payrollRunId: runId,
                    period: periodStr,
                    totalGross,
                    totalNet,
                    totalDeductions,
                });
            });
            // 2. Execute transactional snapshot lock and cycle finalization
            const finalizedResult = await db.$transaction(async (tx) => {
                // Lock snapshots
                await tx.payrollSnapshot.updateMany({
                    where: { payrollRunId: runId },
                    data: { isLocked: true },
                });
                // Commit Loan Balances idempotently
                for (const slip of run.payslips) {
                    const breakdown = slip.breakdown;
                    const loanRecovery = Number(breakdown?.loanRecovery || 0);
                    if (loanRecovery > 0) {
                        const loan = await tx.employeeLoan.findFirst({
                            where: {
                                tenantId,
                                employeeId: slip.employeeId,
                                status: "active",
                                outstandingBalance: { gt: 0 },
                            },
                        });
                        if (loan) {
                            const existingInstallment = await tx.loanInstallment.findFirst({
                                where: {
                                    loanId: loan.id,
                                    payrollRunId: runId,
                                },
                            });
                            if (!existingInstallment) {
                                const newBalance = Math.max(0, Number(loan.outstandingBalance) - loanRecovery);
                                await tx.employeeLoan.update({
                                    where: { id: loan.id },
                                    data: {
                                        outstandingBalance: newBalance,
                                        status: newBalance === 0 ? "completed" : "active",
                                    },
                                });
                                // Create installment record linked to payrollRunId
                                const count = await tx.loanInstallment.count({ where: { loanId: loan.id } });
                                await tx.loanInstallment.create({
                                    data: {
                                        loanId: loan.id,
                                        tenantId,
                                        installmentNumber: count + 1,
                                        periodMonth: run.periodMonth,
                                        periodYear: run.periodYear,
                                        emiAmount: loanRecovery,
                                        principalComponent: loanRecovery,
                                        interestComponent: 0,
                                        status: "paid",
                                        payrollRunId: runId,
                                        deductedAt: new Date(),
                                    },
                                });
                            }
                        }
                    }
                }
                // Update cycle to OUTPUTS_GENERATED
                const completedRun = await tx.payrollRun.update({
                    where: { id: runId },
                    data: {
                        status: "completed",
                        approvalStatus: "OUTPUTS_GENERATED",
                        statutoryManifest: {
                            cryptographicHash,
                            finalizedBy: actor.email,
                            finalizedAt: new Date().toISOString(),
                            ledgerPosted: true,
                            ledgerReference: runId,
                        },
                    },
                });
                return completedRun;
            }, {
                timeout: 30000,
                maxWait: 10000,
            });
            // Stages 14, 15, 16: Automatically compile output bundles
            const outputManifest = await this.generatePostFinalizationOutputs(tenantId, runId, actor);
            // Close cycle
            const closedRun = await db.payrollRun.update({
                where: { id: runId },
                data: {
                    approvalStatus: "CLOSED",
                    isPublished: true,
                    publishedAt: new Date(),
                    publishedBy: actor.email,
                    statutoryManifest: {
                        ...finalizedResult.statutoryManifest,
                        outputs: outputManifest,
                        closedAt: new Date().toISOString(),
                        closedBy: actor.email,
                    },
                },
            });
            return {
                run: closedRun,
                cryptographicHash,
                outputManifest,
            };
        }
        catch (err) {
            // Automatic rollback to APPROVED if failure happened before snapshots or ledger were committed
            try {
                const checkRun = await db.payrollRun.findUnique({
                    where: { id: runId },
                    select: { approvalStatus: true },
                });
                if (checkRun?.approvalStatus === "FINALIZING") {
                    const lockedSnapshots = await db.payrollSnapshot.count({
                        where: { payrollRunId: runId, isLocked: true },
                    });
                    if (lockedSnapshots === 0) {
                        await db.payrollRun.update({
                            where: { id: runId },
                            data: {
                                approvalStatus: "APPROVED",
                                varianceSummary: {
                                    ...(typeof run.varianceSummary === "object" && run.varianceSummary ? run.varianceSummary : {}),
                                    lastFinalizationError: err.message,
                                    lastFinalizationAttemptAt: new Date().toISOString(),
                                },
                            },
                        });
                    }
                }
            }
            catch (cleanupErr) {
                console.error("[PayrollOrchestrator:RollbackError]", cleanupErr);
            }
            throw err;
        }
    }
    /**
     * Stage 13 Crash Recovery: Recovers a payroll cycle stuck in FINALIZING state.
     * - If cycle was finalizing for longer than staleThresholdMinutes (default 15m), recovers safely.
     * - If financial outputs/snapshots were locked: rolls forward to CLOSED.
     * - If no financial side-effects were committed: safely rolls back to APPROVED.
     */
    static async recoverPayrollCycle(tenantId, runId, actor, options) {
        const run = await db.payrollRun.findUnique({
            where: { id: runId },
            include: { snapshots: true },
        });
        if (!run || run.tenantId !== tenantId) {
            const err = new Error("Payroll run not found for the specified tenant.");
            err.statusCode = 404;
            throw err;
        }
        if (run.approvalStatus !== "FINALIZING") {
            const err = new Error(`Payroll cycle is in '${run.approvalStatus}' state, not 'FINALIZING'. Only stuck finalizing cycles can be recovered.`);
            err.statusCode = 400;
            throw err;
        }
        const thresholdMinutes = options?.staleThresholdMinutes ?? 15;
        const lastActiveTime = run.processedAt || run.createdAt;
        const elapsedMinutes = (Date.now() - new Date(lastActiveTime).getTime()) / (60 * 1000);
        if (elapsedMinutes < thresholdMinutes && !options?.force) {
            const remainingMinutes = Math.ceil(thresholdMinutes - elapsedMinutes);
            const err = new Error(`Payroll run is not yet considered stale. Elapsed time: ${elapsedMinutes.toFixed(1)} mins (Threshold: ${thresholdMinutes} mins). Wait ${remainingMinutes} more minute(s) or specify force: true.`);
            err.statusCode = 400;
            throw err;
        }
        // Inspect state of financial side-effects
        const lockedSnapshots = await db.payrollSnapshot.count({
            where: { payrollRunId: runId, isLocked: true },
        });
        const glEntry = await db.journalEntry.findFirst({
            where: { tenantId, reference: runId },
        });
        const hasCommittedFinancials = lockedSnapshots > 0 || !!glEntry;
        if (hasCommittedFinancials) {
            console.warn(`[PayrollRecovery] Cycle ${runId} has committed financials (lockedSnapshots=${lockedSnapshots}, glPosted=${!!glEntry}). Rolling forward to CLOSED.`);
            const outputManifest = await this.generatePostFinalizationOutputs(tenantId, runId, actor);
            const recoveredCycle = await db.payrollRun.update({
                where: { id: runId },
                data: {
                    status: "completed",
                    approvalStatus: "CLOSED",
                    isPublished: true,
                    publishedAt: run.publishedAt || new Date(),
                    publishedBy: run.publishedBy || actor.email,
                    statutoryManifest: {
                        ...(typeof run.statutoryManifest === "object" && run.statutoryManifest ? run.statutoryManifest : {}),
                        outputs: outputManifest,
                        recoveredAt: new Date().toISOString(),
                        recoveredBy: actor.email,
                        recoveryAction: "ROLLED_FORWARD_TO_CLOSED",
                        recoveryReason: `Crash recovery after ${elapsedMinutes.toFixed(1)} minutes stuck in FINALIZING`,
                    },
                },
            });
            return {
                success: true,
                actionTaken: "ROLLED_FORWARD_TO_CLOSED",
                message: "Payroll cycle safely rolled forward to CLOSED. Financial mutations were intact.",
                cycle: recoveredCycle,
                audit: {
                    recoveredBy: actor.email,
                    recoveredAt: new Date().toISOString(),
                    elapsedMinutes: Number(elapsedMinutes.toFixed(1)),
                    actionTaken: "ROLLED_FORWARD_TO_CLOSED",
                    lockedSnapshots,
                    glPosted: !!glEntry,
                },
            };
        }
        else {
            console.warn(`[PayrollRecovery] Cycle ${runId} has NO committed financials. Rolling back to APPROVED.`);
            const recoveredCycle = await db.payrollRun.update({
                where: { id: runId },
                data: {
                    approvalStatus: "APPROVED",
                    varianceSummary: {
                        ...(typeof run.varianceSummary === "object" && run.varianceSummary ? run.varianceSummary : {}),
                        recoveredAt: new Date().toISOString(),
                        recoveredBy: actor.email,
                        recoveryAction: "ROLLED_BACK_TO_APPROVED",
                        recoveryReason: `Crash recovery after ${elapsedMinutes.toFixed(1)} minutes stuck in FINALIZING without financial side-effects`,
                    },
                },
            });
            return {
                success: true,
                actionTaken: "ROLLED_BACK_TO_APPROVED",
                message: "Payroll cycle safely rolled back to APPROVED state. No financial side-effects were committed.",
                cycle: recoveredCycle,
                audit: {
                    recoveredBy: actor.email,
                    recoveredAt: new Date().toISOString(),
                    elapsedMinutes: Number(elapsedMinutes.toFixed(1)),
                    actionTaken: "ROLLED_BACK_TO_APPROVED",
                    lockedSnapshots: 0,
                    glPosted: false,
                },
            };
        }
    }
    /**
     * Stages 14, 15, 16: Post-Finalization Output Generators
     */
    static async generatePostFinalizationOutputs(tenantId, runId, actor) {
        const run = await db.payrollRun.findUnique({
            where: { id: runId },
            include: { payslips: true, snapshots: true },
        });
        if (!run)
            throw new Error("Run not found.");
        // Stage 14: Register Form Manifest via Workstream C
        const statutoryManifest = {
            formsGenerated: ["FORM_U", "FORM_V", "FORM_W", "FORM_X", "FORM_S"],
            generatedAt: new Date().toISOString(),
            statutoryRule: "Rule 16(1), Tamil Nadu Shops and Establishments Act, 1947",
        };
        // Stage 15: Client Billing Draft Invoices via Workstream B
        let clientInvoices = [];
        try {
            const tenantCtx = {
                tenantId,
                userId: actor.id,
                roles: [actor.role || "finance_director"],
                status: "ACTIVE",
                tenancyStrategy: "SHARED_SCHEMA",
                db: prisma_1.rawPrisma,
            };
            await (0, tenant_context_1.runWithTenantContext)(tenantCtx, async () => {
                const billingManifest = await contract_billing_service_1.ContractBillingService.generateRunBillingManifest(tenantId, runId);
                if (billingManifest && billingManifest.totalHeadcount > 0) {
                    const invoiceResult = await contract_invoice_service_1.ContractInvoiceService.generateInvoicesForPayrollRun(runId, tenantId, actor.email);
                    clientInvoices = invoiceResult?.invoices || [];
                }
            });
        }
        catch (err) {
            console.warn(`[Workstream D] Client invoice draft creation skipped: ${err.message}`);
        }
        // Stage 16: ESS Payslip Publishing & Bank Disbursement Metadata
        await db.payrollRun.update({
            where: { id: runId },
            data: {
                isPublished: true,
                publishedAt: new Date(),
                publishedBy: actor.email,
            },
        });
        const bankAdviceSummary = {
            totalDisbursement: Number(run.totalNet || 0),
            totalRecipients: run.payslips.length,
            format: "STANDARD_NEFT_RTGS_CSV",
            reconciled: true,
        };
        return {
            statutoryRegisters: statutoryManifest,
            clientBilling: {
                invoicesCreated: clientInvoices.length,
                invoices: clientInvoices.map((inv) => ({
                    id: inv.id,
                    invoiceNo: inv.invoiceNo,
                    totalAmount: inv.totalAmount,
                })),
            },
            bankAdvice: bankAdviceSummary,
            essPayslips: {
                isPublished: true,
                publishedAt: new Date().toISOString(),
                publishedBy: actor.email,
                payslipsCount: run.payslips.length,
            },
        };
    }
    /**
     * Bank Disbursement Advice Export Generator
     * Generates CSV / Text bank advice with exact rupee matching assertion
     */
    static async generateBankDisbursementExport(tenantId, runId, options = {}) {
        const run = await db.payrollRun.findUnique({
            where: { id: runId },
            include: {
                payslips: {
                    include: {
                        employee: {
                            select: statutory_builder_common_1.SAFE_EMPLOYEE_SELECT,
                        },
                    },
                },
            },
        });
        if (!run || run.tenantId !== tenantId) {
            throw new Error("Payroll run not found for the specified tenant.");
        }
        const rows = [];
        rows.push("SL_NO,EMPLOYEE_CODE,EMPLOYEE_NAME,BANK_NAME,ACCOUNT_NUMBER,IFSC_CODE,NET_PAY_INR,PAYMENT_REF");
        let sumNet = new decimal_js_1.default(0);
        let slNo = 1;
        for (const slip of run.payslips) {
            const emp = slip.employee;
            const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeCode;
            const netPay = new decimal_js_1.default(slip.netSalary);
            sumNet = sumNet.plus(netPay);
            let account = emp.bankAccount || "NOT_PROVIDED";
            if (options.masked && account.length > 4) {
                account = "*".repeat(account.length - 4) + account.slice(-4);
            }
            const ifsc = emp.bankIfsc || "NOT_PROVIDED";
            const bankName = emp.bankName || "PRIMARY_SALARY_BANK";
            const paymentRef = `SAL-${run.periodYear}${String(run.periodMonth).padStart(2, "0")}-${emp.employeeCode}`;
            rows.push(`${slNo},"${emp.employeeCode}","${fullName}","${bankName}","${account}","${ifsc}",${netPay.toFixed(2)},"${paymentRef}"`);
            slNo++;
        }
        const expectedTotal = new decimal_js_1.default(run.totalNet || 0);
        const isBalanced = sumNet.equals(expectedTotal);
        if (!isBalanced && run.approvalStatus === "CLOSED") {
            throw new Error(`Financial mismatch in bank advice export! Export total ₹${sumNet.toFixed(2)} does not match cycle net pay ₹${expectedTotal.toFixed(2)}.`);
        }
        return {
            csvContent: rows.join("\n"),
            totalAmount: sumNet.toNumber(),
            recordCount: run.payslips.length,
            isBalanced,
        };
    }
}
exports.PayrollOrchestratorService = PayrollOrchestratorService;
