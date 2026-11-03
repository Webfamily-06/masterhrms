"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractBillingService = void 0;
const prisma_1 = require("../prisma");
const company_profile_service_1 = require("./company-profile/company-profile.service");
const db = prisma_1.rawPrisma || prisma_1.prisma;
class ContractBillingService {
    /**
     * Precise 2-decimal monetary rounding helper
     */
    static round(val) {
        return Math.round((Number(val) || 0) * 100) / 100;
    }
    /**
     * Parse Indian state code (2 digits) from GSTIN or state code string
     */
    static extractStateCode(input) {
        if (!input)
            return "";
        const trimmed = input.trim();
        if (trimmed.length >= 2 && /^\d{2}/.test(trimmed)) {
            return trimmed.slice(0, 2);
        }
        return trimmed;
    }
    /**
     * Determine supply type (intra-state vs inter-state)
     */
    static determineSupplyType(supplierState, clientState) {
        const sState = this.extractStateCode(supplierState);
        const cState = this.extractStateCode(clientState);
        if (sState && cState && sState === cState) {
            return "INTRA_STATE";
        }
        return "INTER_STATE";
    }
    /**
     * Compute MMU (Contractor Margin) based on configured contract terms
     */
    static calculateMmu(params) {
        const { earnedGross, employerPf, billableCtc, basis, markupPct, fixedMarkupPerHead = 0, headcount = 1 } = params;
        let baseAmount = 0;
        let mmuAmount = 0;
        switch (basis) {
            case "GROSS_PLUS_PF":
                // Reference standard: (Gross Wages + Employer PF) * Markup %
                baseAmount = this.round(earnedGross + employerPf);
                mmuAmount = this.round(baseAmount * (markupPct / 100));
                break;
            case "TOTAL_CTC":
                // CTC Basis: Approved Employer CTC * Markup %
                baseAmount = this.round(billableCtc);
                mmuAmount = this.round(baseAmount * (markupPct / 100));
                break;
            case "FIXED_PER_HEAD":
                // Fixed fee per employee head
                baseAmount = fixedMarkupPerHead;
                mmuAmount = this.round(fixedMarkupPerHead * (headcount || 1));
                break;
            default:
                // Default to Gross + PF
                baseAmount = this.round(earnedGross + employerPf);
                mmuAmount = this.round(baseAmount * (markupPct / 100));
                break;
        }
        return {
            mmuAmount,
            baseAmount,
        };
    }
    /**
     * Compute GST liability (Intra-state CGST+SGST vs Inter-state IGST)
     */
    static calculateGst(params) {
        const { taxableAmount, supplierState, clientState, gstRate, roundToInteger = false } = params;
        const supplyType = this.determineSupplyType(supplierState, clientState);
        const rawGst = taxableAmount * (gstRate / 100);
        const totalGst = roundToInteger ? Math.round(rawGst) : this.round(rawGst);
        let cgst = 0;
        let sgst = 0;
        let igst = 0;
        if (supplyType === "INTRA_STATE") {
            cgst = this.round(totalGst / 2);
            sgst = this.round(totalGst - cgst);
        }
        else {
            igst = totalGst;
        }
        const totalInvoiceAmount = this.round(taxableAmount + totalGst);
        return {
            supplyType,
            cgst,
            sgst,
            igst,
            totalGst,
            totalInvoiceAmount,
        };
    }
    /**
     * Resolve client contract terms from database or return default structure
     */
    static async resolveClientTerms(clientId, tenantId) {
        const client = await db.staffingClient.findFirst({
            where: { id: clientId, tenantId },
        });
        if (!client)
            return null;
        let basis = "GROSS_PLUS_PF";
        const rawBase = (client.serviceChargeBase || "").toUpperCase();
        if (rawBase.includes("CTC")) {
            basis = "TOTAL_CTC";
        }
        else if (rawBase.includes("FIXED") || rawBase.includes("HEAD")) {
            basis = "FIXED_PER_HEAD";
        }
        else {
            basis = "GROSS_PLUS_PF";
        }
        return {
            id: client.id,
            tenantId: client.tenantId,
            name: client.name,
            code: client.code,
            gstin: client.gstin,
            billingStateCode: client.billingStateCode,
            address: client.address,
            serviceChargePct: Number(client.serviceChargePct ?? 10.0),
            serviceChargeBase: basis,
            fixedMarkupPerHead: 0,
            gstRate: 18.0,
            paymentTermsDays: 30,
            status: client.status,
        };
    }
    /**
     * Resolve establishment / seller state code dynamically
     */
    static async resolveSupplierState(tenantId) {
        try {
            const companyProfile = await company_profile_service_1.CompanyProfileService.getProfile(tenantId);
            const primaryGst = companyProfile?.gstRegistrations?.find((g) => g.isPrimary && g.status === "ACTIVE");
            const resolved = primaryGst?.stateCode || companyProfile?.registeredStateCode || "";
            if (resolved)
                return this.extractStateCode(resolved);
            // Check establishment
            const est = await db.establishment.findFirst({
                where: { tenantId, status: "active" },
                select: { stateCode: true },
            });
            if (est?.stateCode)
                return this.extractStateCode(est.stateCode);
            return "33"; // Tamil Nadu default for reference contractor PreCede Workforce Solutions
        }
        catch {
            return "33";
        }
    }
    /**
     * Generate complete Commercial Billing Manifest for an approved or completed payroll run
     */
    static async generateRunBillingManifest(payrollRunId, tenantId, options) {
        const payrollRun = await db.payrollRun.findFirst({
            where: { id: payrollRunId, tenantId },
            include: {
                snapshots: {
                    include: {
                        employee: {
                            include: {
                                client: true,
                                designation: true,
                            },
                        },
                    },
                },
            },
        });
        if (!payrollRun) {
            throw new Error(`Payroll run ${payrollRunId} not found for tenant ${tenantId}`);
        }
        const supplierStateCode = await this.resolveSupplierState(tenantId);
        // Group snapshots by client
        const clientMap = new Map();
        let unassignedEmployeeCount = 0;
        for (const snap of payrollRun.snapshots) {
            const client = snap.employee?.client;
            if (!client) {
                unassignedEmployeeCount++;
                continue;
            }
            if (options?.targetClientId && client.id !== options.targetClientId) {
                continue;
            }
            if (!clientMap.has(client.id)) {
                clientMap.set(client.id, { client, snapshots: [] });
            }
            clientMap.get(client.id).snapshots.push(snap);
        }
        const summaries = [];
        for (const [clientId, group] of clientMap.entries()) {
            const client = group.client;
            const terms = await this.resolveClientTerms(clientId, tenantId);
            const markupBasis = terms?.serviceChargeBase || "GROSS_PLUS_PF";
            const markupPct = terms?.serviceChargePct ?? 10.0;
            const gstRate = terms?.gstRate ?? 18.0;
            const clientStateCode = this.extractStateCode(client.billingStateCode || client.gstin || supplierStateCode);
            const supplyType = this.determineSupplyType(supplierStateCode, clientStateCode);
            const employeeLines = [];
            let sumGross = 0;
            let sumPf = 0;
            let sumEdli = 0;
            let sumPfAdmin = 0;
            let sumEsi = 0;
            let sumIns = 0;
            let sumLwf = 0;
            let sumStatutory = 0;
            let sumCtc = 0;
            let sumMmu = 0;
            for (const snap of group.snapshots) {
                const earnedGross = Number(snap.grossEarned || 0);
                const grossEarned = earnedGross;
                // Extract employer statutory components defensively from statutoryManifest or snapshotData
                const manifest = snap.statutoryManifest || {};
                const snapData = snap.snapshotData || {};
                const employerPf = Number(manifest?.epf?.employerContribution ??
                    snapData?.epfEmployer ??
                    snapData?.statutoryBreakdown?.epf?.employerContribution ??
                    0);
                const employerEdli = Number(manifest?.epf?.edliContribution ??
                    snapData?.edliContribution ??
                    snapData?.statutoryBreakdown?.epf?.edliContribution ??
                    0);
                const employerPfAdmin = Number(manifest?.epf?.adminCharges ??
                    snapData?.pfAdminCharges ??
                    snapData?.statutoryBreakdown?.epf?.adminCharges ??
                    0);
                const employerEsi = Number(manifest?.esi?.employerContribution ??
                    snapData?.esiEmployer ??
                    snapData?.statutoryBreakdown?.esi?.employerContribution ??
                    0);
                const employerInsurance = Number(snapData?.employerInsurance ??
                    snapData?.insuranceEmployer ??
                    0);
                const employerLwf = Number(manifest?.lwf?.employerContribution ??
                    snapData?.lwfEmployer ??
                    snapData?.statutoryBreakdown?.lwf?.employerContribution ??
                    0);
                const totalEmployerStatutory = this.round(employerPf + employerEdli + employerPfAdmin + employerEsi + employerInsurance + employerLwf);
                const billableCtc = this.round(grossEarned + totalEmployerStatutory);
                const { mmuAmount } = this.calculateMmu({
                    earnedGross,
                    employerPf,
                    billableCtc,
                    basis: markupBasis,
                    markupPct,
                    fixedMarkupPerHead: terms?.fixedMarkupPerHead,
                    headcount: 1,
                });
                const taxableAmount = this.round(billableCtc + mmuAmount);
                const empGst = this.round(taxableAmount * (gstRate / 100));
                const totalBillingAmount = this.round(taxableAmount + empGst);
                const line = {
                    employeeId: snap.employeeId,
                    employeeCode: snap.employee.employeeCode || snap.employee.id,
                    employeeName: `${snap.employee.firstName || ""} ${snap.employee.lastName || ""}`.trim(),
                    designation: snap.employee.designation?.name,
                    earnedGross,
                    employerPf,
                    employerEdli,
                    employerPfAdmin,
                    employerEsi,
                    employerInsurance,
                    employerLwf,
                    totalEmployerStatutory,
                    billableCtc,
                    mmuBasis: markupBasis,
                    mmuRate: markupPct,
                    mmuAmount,
                    taxableAmount,
                    gstRate,
                    gstAmount: empGst,
                    totalBillingAmount,
                };
                employeeLines.push(line);
                sumGross += grossEarned;
                sumPf += employerPf;
                sumEdli += employerEdli;
                sumPfAdmin += employerPfAdmin;
                sumEsi += employerEsi;
                sumIns += employerInsurance;
                sumLwf += employerLwf;
                sumStatutory += totalEmployerStatutory;
                sumCtc += billableCtc;
                sumMmu += mmuAmount;
            }
            sumGross = this.round(sumGross);
            sumPf = this.round(sumPf);
            sumEdli = this.round(sumEdli);
            sumPfAdmin = this.round(sumPfAdmin);
            sumEsi = this.round(sumEsi);
            sumIns = this.round(sumIns);
            sumLwf = this.round(sumLwf);
            sumStatutory = this.round(sumStatutory);
            sumCtc = this.round(sumCtc);
            sumMmu = this.round(sumMmu);
            const taxableSupplyValue = this.round(sumCtc + sumMmu);
            const gstResult = this.calculateGst({
                taxableAmount: taxableSupplyValue,
                supplierState: supplierStateCode,
                clientState: clientStateCode,
                gstRate,
                roundToInteger: options?.roundGstToInteger ?? true, // Reference Excel rounds total GST to integer
            });
            summaries.push({
                clientId: client.id,
                clientName: client.name,
                clientCode: client.code || undefined,
                clientGstin: client.gstin || undefined,
                clientBillingStateCode: client.billingStateCode || undefined,
                supplierStateCode,
                supplyType,
                headcount: employeeLines.length,
                totalGrossWages: sumGross,
                totalEmployerPf: sumPf,
                totalEmployerEdli: sumEdli,
                totalEmployerPfAdmin: sumPfAdmin,
                totalEmployerEsi: sumEsi,
                totalEmployerInsurance: sumIns,
                totalEmployerLwf: sumLwf,
                totalEmployerStatutory: sumStatutory,
                totalBillableCtc: sumCtc,
                totalMmu: sumMmu,
                taxableSupplyValue,
                gstRate,
                cgst: gstResult.cgst,
                sgst: gstResult.sgst,
                igst: gstResult.igst,
                totalGst: gstResult.totalGst,
                totalInvoiceAmount: gstResult.totalInvoiceAmount,
                mmuBasis: markupBasis,
                mmuRate: markupPct,
                employeeLines,
            });
        }
        const totalHeadcount = summaries.reduce((acc, c) => acc + c.headcount, 0);
        const totalGrossWages = this.round(summaries.reduce((acc, c) => acc + c.totalGrossWages, 0));
        const totalBillableCtc = this.round(summaries.reduce((acc, c) => acc + c.totalBillableCtc, 0));
        const totalMmu = this.round(summaries.reduce((acc, c) => acc + c.totalMmu, 0));
        const taxableSupplyValue = this.round(summaries.reduce((acc, c) => acc + c.taxableSupplyValue, 0));
        const totalGst = this.round(summaries.reduce((acc, c) => acc + c.totalGst, 0));
        const totalInvoiceAmount = this.round(summaries.reduce((acc, c) => acc + c.totalInvoiceAmount, 0));
        return {
            payrollRunId,
            periodMonth: payrollRun.periodMonth,
            periodYear: payrollRun.periodYear,
            generatedAt: new Date().toISOString(),
            totalClients: summaries.length,
            totalHeadcount,
            totalGrossWages,
            totalBillableCtc,
            totalMmu,
            taxableSupplyValue,
            totalGst,
            totalInvoiceAmount,
            clients: summaries,
            unassignedEmployeeCount,
        };
    }
}
exports.ContractBillingService = ContractBillingService;
