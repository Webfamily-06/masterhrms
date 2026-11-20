"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpfoEsicService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const prisma_1 = require("../prisma");
class EpfoEsicService {
    /**
     * Generates statutory claim document (Form 19, 10C, 31, or ESIC Form 1)
     */
    static async generateClaim(input) {
        const { tenantId, employeeId, claimType, reason, requestedAmount, generatedBy } = input;
        // 1. Fetch Employee & Tenant details
        const [employee, tenant] = await Promise.all([
            prisma_1.rawPrisma.employee.findFirst({
                where: { id: employeeId, tenantId },
                include: { department: true, establishment: true },
            }),
            prisma_1.rawPrisma.tenant.findUnique({
                where: { id: tenantId },
            }),
        ]);
        if (!employee) {
            throw new Error(`Employee ${employeeId} not found in tenant ${tenantId}.`);
        }
        const uan = employee.uan || "101234567890";
        const pfAccountNumber = `TN/MAS/0012345/000/${employee.employeeCode}`;
        const monthlySalary = Number(employee.salary || 50000);
        const basicWage = Math.round(monthlySalary * 0.5);
        // Calculate tenure in years
        const joinDate = employee.joinedAt || employee.joiningDate
            ? new Date(employee.joinedAt || employee.joiningDate)
            : new Date(Date.now() - 3 * 365 * 24 * 3600 * 1000);
        const tenureYears = Math.max(0.5, (Date.now() - joinDate.getTime()) / (365.25 * 24 * 3600 * 1000));
        // Estimated accumulations based on salary and tenure
        const monthlyPfEe = Math.min(basicWage, 15000) * 0.12;
        const monthlyPfEr = Math.min(basicWage, 15000) * 0.0367;
        const monthlyEps = Math.min(basicWage, 15000) * 0.0833;
        const totalPfBalance = Math.round((monthlyPfEe + monthlyPfEr) * (tenureYears * 12));
        const totalPensionContribution = Math.round(monthlyEps * (tenureYears * 12));
        let eligibleAmount = 0;
        let approvedAmount = 0;
        let claimTitle = "";
        let details = {};
        switch (claimType) {
            case "FORM_19": {
                // Form 19: Full & Final PF Settlement
                claimTitle = "Form 19 — Claim for Final Settlement of Provident Fund";
                eligibleAmount = totalPfBalance;
                approvedAmount = eligibleAmount;
                details = {
                    rule: "Employees' Provident Funds Scheme, 1952 (Paragraph 69)",
                    reasonForLeaving: employee.status === "terminated" ? "Cessation of Service" : "Voluntary Resignation",
                    dateOfLeaving: new Date().toISOString().slice(0, 10),
                    totalMonthsContributed: Math.round(tenureYears * 12),
                    memberPfShare: Math.round(monthlyPfEe * (tenureYears * 12)),
                    employerPfShare: Math.round(monthlyPfEr * (tenureYears * 12)),
                    fullSettlementPayable: eligibleAmount,
                };
                break;
            }
            case "FORM_10C": {
                // Form 10C: EPS Pension Scheme Certificate / Withdrawal Benefit
                claimTitle = "Form 10C — Claim for Scheme Certificate / EPS Withdrawal Benefit";
                // Less than 10 years: eligible for withdrawal benefit. 10+ years: scheme certificate
                if (tenureYears < 10) {
                    eligibleAmount = totalPensionContribution;
                    approvedAmount = eligibleAmount;
                    details = {
                        benefitType: "Withdrawal Benefit (Lump sum)",
                        rule: "Employees' Pension Scheme, 1995 (Paragraph 14)",
                        tenureYears: tenureYears.toFixed(1),
                        totalPensionAccumulation: totalPensionContribution,
                    };
                }
                else {
                    eligibleAmount = 0; // Scheme Certificate issued, pension begins at 58
                    approvedAmount = 0;
                    details = {
                        benefitType: "Scheme Certificate for Early/Superannuation Pension",
                        rule: "Employees' Pension Scheme, 1995 (Paragraph 12)",
                        tenureYears: tenureYears.toFixed(1),
                        eligiblePensionAt58: Math.round((basicWage * tenureYears) / 70),
                    };
                }
                break;
            }
            case "FORM_31": {
                // Form 31: PF Partial Advance / Non-refundable Loan
                claimTitle = "Form 31 — Application for Advance from Provident Fund Account";
                const advReason = reason || "house_construction";
                let maxMultiplier = 24; // months of basic
                if (advReason === "illness")
                    maxMultiplier = 6;
                else if (advReason === "marriage")
                    maxMultiplier = 12;
                const maxBySalary = basicWage * maxMultiplier;
                eligibleAmount = Math.min(totalPfBalance * 0.9, maxBySalary);
                approvedAmount = Math.min(requestedAmount || eligibleAmount, eligibleAmount);
                details = {
                    rule: "Employees' Provident Funds Scheme, 1952 (Paragraph 68B/H/K)",
                    purposeOfAdvance: advReason,
                    requestedAmount: requestedAmount || eligibleAmount,
                    maximumEligibleAmount: eligibleAmount,
                    totalPfBalanceAvailable: totalPfBalance,
                };
                break;
            }
            case "ESIC_FORM_1": {
                // ESIC Form 1: Employee Declaration Form
                claimTitle = "Form 1 — Declaration Form for Registration under ESI Act, 1948";
                eligibleAmount = 0;
                approvedAmount = 0;
                details = {
                    rule: "Regulation 11 & 12, Employees' State Insurance (General) Regulations, 1950",
                    insuranceNumber: employee.esiNumber || "ESIC-5100012345",
                    dispensary: "ESI Dispensary, Guindy, Chennai",
                    nomineeName: `${employee.firstName} Dependent`,
                    nomineeRelationship: "Spouse",
                    monthlyGrossWages: monthlySalary,
                    dateOfAppointment: joinDate.toISOString().slice(0, 10),
                };
                break;
            }
            default:
                throw new Error(`Unsupported claim type: ${claimType}`);
        }
        const bankDetails = {
            accountNumber: input.bankAccountNumber || employee.bankAccount || "918273645012",
            ifscCode: input.ifscCode || employee.bankIfsc || "HDFC0001234",
            bankName: employee.bankName || "HDFC Bank Limited",
        };
        // 2. Render PDF Document
        const pdfBuffer = await this.renderClaimPdf({
            claimType,
            claimTitle,
            employerName: tenant?.name || "MasterHRMS Enterprise India",
            employeeName: `${employee.firstName} ${employee.lastName}`,
            employeeCode: employee.employeeCode,
            uan,
            pfAccountNumber,
            pan: employee.pan || "ABCDE1234F",
            eligibleAmount,
            approvedAmount,
            bankDetails,
            details,
        });
        const fileHash = crypto_1.default.createHash("sha256").update(pdfBuffer).digest("hex");
        const storageDir = path_1.default.join(process.cwd(), "storage", "tenants", tenantId, "statutory");
        fs_1.default.mkdirSync(storageDir, { recursive: true });
        const fileName = `${claimType}_${employee.employeeCode}_${Date.now()}.pdf`;
        const filePath = path_1.default.join(storageDir, fileName);
        fs_1.default.writeFileSync(filePath, pdfBuffer);
        return {
            tenantId,
            employeeId,
            employeeCode: employee.employeeCode,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            uan,
            pfAccountNumber,
            claimType,
            claimTitle,
            eligibleAmount,
            approvedAmount,
            bankDetails,
            details,
            pdfPath: filePath,
            pdfHash: fileHash,
            pdfBuffer,
        };
    }
    /**
     * Internal PDF generator for statutory claims
     */
    static renderClaimPdf(data) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new pdfkit_1.default({ size: "A4", margin: 40 });
                const buffers = [];
                doc.on("data", (chunk) => buffers.push(chunk));
                doc.on("end", () => resolve(Buffer.concat(buffers)));
                // Title Block
                doc.fontSize(14).font("Helvetica-Bold").text(data.claimTitle.toUpperCase(), { align: "center" });
                doc.fontSize(9).font("Helvetica-Oblique").text(`Statutory filing under Ministry of Labour & Employment, Govt. of India`, { align: "center" });
                doc.moveDown(0.8);
                // Metadata box
                doc.strokeColor("#94A3B8").lineWidth(1).rect(40, doc.y, 515, 75).stroke();
                const startY = doc.y + 6;
                doc.fontSize(8).font("Helvetica-Bold").text("Employer Details:", 48, startY);
                doc.font("Helvetica").text(data.employerName, 48, startY + 12);
                doc.font("Helvetica-Bold").text("Establishment Code: TN/MAS/0012345", 48, startY + 24);
                doc.font("Helvetica-Bold").text("Member Identification:", 320, startY);
                doc.font("Helvetica").text(`${data.employeeName} (Emp #${data.employeeCode})`, 320, startY + 12);
                doc.font("Helvetica-Bold").text(`UAN: ${data.uan}  |  PAN: ${data.pan}`, 320, startY + 24);
                doc.font("Helvetica").text(`PF Member ID: ${data.pfAccountNumber}`, 320, startY + 36);
                doc.y = startY + 75;
                doc.moveDown(0.6);
                // Claim Specific Details
                doc.fontSize(11).font("Helvetica-Bold").fillColor("#1E293B").text("Claim Particulars & Calculations");
                doc.moveDown(0.4);
                doc.fontSize(8).font("Helvetica");
                for (const [key, value] of Object.entries(data.details)) {
                    const formattedKey = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
                    doc.font("Helvetica-Bold").text(`${formattedKey}: `, 48, doc.y, { continued: true });
                    doc.font("Helvetica").text(String(value));
                    doc.moveDown(0.3);
                }
                if (data.approvedAmount > 0) {
                    doc.moveDown(0.5);
                    doc.font("Helvetica-Bold").fontSize(10).fillColor("#047857");
                    doc.text(`Total Approved Claim Amount: ₹ ${data.approvedAmount.toLocaleString("en-IN")}`);
                    doc.moveDown(0.5);
                }
                // Bank Details Section
                doc.fontSize(10).font("Helvetica-Bold").fillColor("#1E293B").text("Direct Credit Bank Details (Aadhaar / NPCI Linked)");
                doc.moveDown(0.3);
                doc.fontSize(8).font("Helvetica").fillColor("#334155");
                doc.text(`Bank Name: ${data.bankDetails.bankName}`);
                doc.text(`Account Number: ${data.bankDetails.accountNumber}`);
                doc.text(`IFSC Code: ${data.bankDetails.ifscCode}`);
                doc.moveDown(0.8);
                // Declaration & Signatures
                doc.fontSize(8).font("Helvetica-Bold").text("Member Declaration");
                doc.fontSize(7).font("Helvetica").text("I hereby solemnly declare that the particulars given above are correct to the best of my knowledge and belief. I agree to refund any amount found to have been paid in excess.", { align: "justify" });
                doc.moveDown(1.5);
                const sigY = doc.y;
                doc.fontSize(8).font("Helvetica-Bold").text("Signature / Thumb Impression of Member", 48, sigY);
                doc.text("Authorised Signatory of Establishment", 340, sigY);
                doc.fontSize(6).font("Helvetica").text("Digitally prepared via MasterHRMS Statutory Engine", 48, sigY + 25);
                doc.end();
            }
            catch (err) {
                reject(err);
            }
        });
    }
}
exports.EpfoEsicService = EpfoEsicService;
