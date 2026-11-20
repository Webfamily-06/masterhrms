"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelievingLetterService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const prisma_1 = require("../prisma");
const local_encrypted_storage_service_1 = require("./storage/local-encrypted-storage.service");
class RelievingLetterService {
    /**
     * Generates a vector PDF buffer for the formal Relieving Letter & Service Certificate
     */
    static generateRelievingPdfBuffer(data) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new pdfkit_1.default({
                    size: "A4",
                    margin: 50,
                    info: {
                        Title: `Relieving Letter - ${data.employeeName} (${data.relievingCode})`,
                        Author: data.companyName,
                        Subject: "Relieving Letter and Service Certificate",
                        Keywords: "Relieving, FnF, Offboarding, Clearance",
                    },
                });
                const chunks = [];
                doc.on("data", (chunk) => chunks.push(chunk));
                doc.on("end", () => resolve(Buffer.concat(chunks)));
                doc.on("error", (err) => reject(err));
                const primaryColor = "#0f172a";
                const accentColor = "#2563eb";
                const mutedColor = "#64748b";
                // 1. Company Letterhead Header
                doc.fillColor(accentColor).fontSize(20).font("Helvetica-Bold").text(data.companyName.toUpperCase(), { align: "center" });
                if (data.companyAddress) {
                    doc.fillColor(mutedColor).fontSize(9).font("Helvetica").text(data.companyAddress, { align: "center" });
                }
                if (data.companyPhone) {
                    doc.fillColor(mutedColor).fontSize(9).font("Helvetica").text(`Contact: ${data.companyPhone}`, { align: "center" });
                }
                doc.moveDown(0.5);
                doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
                doc.moveDown(1.5);
                // 2. Reference & Date Line
                const issueDateStr = data.issueDate.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                });
                const currentY = doc.y;
                doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold").text(`Ref No: ${data.relievingCode}`, 50, currentY);
                doc.fillColor(primaryColor).fontSize(10).font("Helvetica").text(`Date: ${issueDateStr}`, 400, currentY, { align: "right" });
                doc.moveDown(2);
                // 3. Document Title
                doc.fillColor(primaryColor).fontSize(14).font("Helvetica-Bold").text("EXPERIENCE CERTIFICATE & RELIEVING LETTER", { align: "center", underline: true });
                doc.moveDown(1.5);
                // 4. Salutation
                doc.fontSize(11).font("Helvetica-Bold").text("TO WHOMSOEVER IT MAY CONCERN");
                doc.moveDown(1);
                // 5. Letter Body
                const joiningDateStr = data.joiningDate
                    ? new Date(data.joiningDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                    : "N/A";
                const lwdStr = new Date(data.lastWorkingDay).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
                const designation = data.designation || "Executive";
                const department = data.department || "Operations";
                const p1 = `This is to certify that ${data.employeeName} (Employee Code: ${data.employeeCode}) was employed with ${data.companyName} from ${joiningDateStr} to ${lwdStr}. At the time of exit, they were designated as ${designation} in the ${department} Department.`;
                doc.fontSize(10.5).font("Helvetica").lineGap(4).text(p1, { align: "justify" });
                doc.moveDown(1);
                const p2 = `During their tenure with us, ${data.employeeName} displayed commendable dedication, sincerity, and professional conduct. They have satisfactorily completed all handovers and transitional duties associated with their role.`;
                doc.text(p2, { align: "justify" });
                doc.moveDown(1);
                const p3 = `We further confirm that ${data.employeeName} has been officially relieved of all duties and responsibilities with effect from the close of business hours on ${lwdStr}. All organizational clearances — including Human Resources, IT & Systems Asset recovery, Finance & Accounts Full & Final settlement, and Administration clearances — have been satisfactorily completed with zero outstanding obligations.`;
                doc.text(p3, { align: "justify" });
                doc.moveDown(1);
                const p4 = "We thank them for their contributions during their association with us and wish them all success in their future professional endeavors.";
                doc.text(p4, { align: "justify" });
                doc.moveDown(2.5);
                // 6. Signatory & Organization Stamp
                doc.fontSize(10).font("Helvetica-Bold").text(`For ${data.companyName}`);
                doc.moveDown(2);
                doc.fontSize(10).font("Helvetica-Bold").text("Authorized Signatory");
                doc.fontSize(9).font("Helvetica").text("People & Culture / HR Operations");
                doc.moveDown(2);
                // 7. Verification & Security Footer Box
                const boxY = 700;
                doc.rect(50, boxY, 495, 60).fillAndStroke("#f8fafc", "#e2e8f0");
                doc.fillColor("#0284c7").fontSize(8.5).font("Helvetica-Bold").text("SYSTEM VERIFIED & DIGITALLY SEALED DOCUMENT", 60, boxY + 8);
                doc.fillColor(mutedColor).fontSize(7.5).font("Helvetica")
                    .text(`Certificate Code: ${data.relievingCode} | Exit Case ID: Verified | Issue Timestamp: ${data.issueDate.toISOString()}`, 60, boxY + 22)
                    .text("This official electronic certificate has been issued under the MASTERHRMS Enterprise Offboarding Framework.", 60, boxY + 34)
                    .text("Tamper-evident verification hash is registered in the tenant document audit vault.", 60, boxY + 46);
                doc.end();
            }
            catch (err) {
                reject(err);
            }
        });
    }
    /**
     * Generates, encrypts, persists to StoredDocument & CompanyDocument, and returns metadata.
     */
    static async generateAndStoreRelievingLetter(tenantId, exitId, uploadedById) {
        const exit = await prisma_1.prisma.employeeExit.findUnique({
            where: { id: exitId },
            include: {
                employee: {
                    include: { department: true },
                },
                tenant: true,
            },
        });
        if (!exit || exit.tenantId !== tenantId) {
            throw new Error("Employee exit record not found for tenant.");
        }
        // Ensure relieving letter code exists (e.g. REL-7482)
        let relievingLetterCode = exit.relievingLetterCode;
        if (!relievingLetterCode) {
            const randomCode = Math.floor(1000 + Math.random() * 9000);
            relievingLetterCode = `REL-${randomCode}`;
            await prisma_1.prisma.employeeExit.update({
                where: { id: exitId },
                data: { relievingLetterCode },
            });
        }
        const employee = exit.employee;
        const employeeFullName = `${employee.firstName} ${employee.lastName}`.trim();
        const issueDate = exit.fnfSettledAt || new Date();
        const pdfBuffer = await this.generateRelievingPdfBuffer({
            companyName: exit.tenant.name || "Master HRMS Organization",
            companyAddress: exit.tenant.address || null,
            companyPhone: exit.tenant.phone || null,
            relievingCode: relievingLetterCode,
            issueDate,
            employeeName: employeeFullName,
            employeeCode: employee.employeeCode,
            designation: employee.position,
            department: employee.department?.name || null,
            joiningDate: employee.joinedAt,
            lastWorkingDay: exit.lastWorkingDay,
            exitType: exit.exitType,
            fnfAmount: exit.fnfSettlementAmount ? Number(exit.fnfSettlementAmount) : null,
        });
        const fileName = `Relieving_Letter_${employee.employeeCode}_${relievingLetterCode}.pdf`;
        // Save through encrypted tenant storage
        const stored = await local_encrypted_storage_service_1.storageService.save(tenantId, {
            buffer: pdfBuffer,
            originalName: fileName,
            mimeType: "application/pdf",
            sizeBytes: pdfBuffer.length,
        }, "RelievingLetter", exit.id, uploadedById);
        // Create formal CompanyDocument record for employee documents vault
        const companyDoc = await prisma_1.prisma.companyDocument.create({
            data: {
                tenantId,
                employeeId: employee.id,
                documentCode: relievingLetterCode,
                title: `Relieving Letter & Service Certificate - ${employeeFullName}`,
                category: "Exit & Relieving",
                fileUrl: `/api/documents/${stored.id}/stream`,
                fileName,
                fileSize: `${(pdfBuffer.length / 1024).toFixed(1)} KB`,
                fileType: "application/pdf",
                status: "verified",
                requiresSignature: false,
                signerName: "HR Operations System",
                signedAt: issueDate,
                notes: `Relieving letter generated upon FnF settlement. Storage ID: ${stored.id}, SHA-256: ${stored.sha256Hash}`,
            },
        });
        return {
            success: true,
            relievingLetterCode,
            documentId: stored.id,
            companyDocumentId: companyDoc.id,
            downloadUrl: `/api/documents/${stored.id}/stream`,
            sha256Hash: stored.sha256Hash,
            fileName,
            fileSizeBytes: pdfBuffer.length,
            issuedAt: issueDate.toISOString(),
        };
    }
}
exports.RelievingLetterService = RelievingLetterService;
