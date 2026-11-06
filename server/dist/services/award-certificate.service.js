"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwardCertificateService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const qrcode_1 = __importDefault(require("qrcode"));
const prisma_1 = require("../prisma");
const media_service_1 = require("./media/media.service");
const notification_service_1 = require("./notification.service");
const outbox_service_1 = require("./outbox.service");
const audit_service_1 = require("./audit.service");
const certificate_folder_service_1 = require("./files/certificate-folder.service");
const files_service_1 = require("./files/files.service");
const socket_1 = require("../socket");
const certificate_studio_service_1 = require("./certificate-studio.service");
class AwardCertificateService {
    /**
     * Generates a printable, vector-rendered landscape A4 certificate PDF.
     */
    static async renderCertificatePdf(data) {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new pdfkit_1.default({
                    size: "A4",
                    layout: "landscape",
                    margins: { top: 25, bottom: 25, left: 25, right: 25 },
                    info: {
                        Title: `Certificate - ${data.recipientName} - ${data.awardTitle}`,
                        Author: data.issuingOrganization || "MASTERHRMS Cloud",
                        Subject: `Official Award Certificate #${data.certificateNumber}`,
                        Keywords: "certificate, award, recognition, hrms, verified",
                    },
                });
                const chunks = [];
                doc.on("data", (chunk) => chunks.push(chunk));
                doc.on("end", () => resolve(Buffer.concat(chunks)));
                doc.on("error", (err) => reject(err));
                const pageWidth = 841.89;
                const pageHeight = 595.28;
                // ─────────────────────────────────────────────────────────────
                // 1. LUXURY BACKGROUND & BORDERS
                // ─────────────────────────────────────────────────────────────
                // Background tint
                doc.rect(0, 0, pageWidth, pageHeight).fill("#FDFDFE");
                // Outer Double Border with Navy & Gold
                const outerMargin = 20;
                doc
                    .rect(outerMargin, outerMargin, pageWidth - outerMargin * 2, pageHeight - outerMargin * 2)
                    .lineWidth(3)
                    .strokeColor("#1E3A8A") // Deep Royal Navy
                    .stroke();
                const innerMargin = 26;
                doc
                    .rect(innerMargin, innerMargin, pageWidth - innerMargin * 2, pageHeight - innerMargin * 2)
                    .lineWidth(1)
                    .strokeColor("#D97706") // Elegant Amber Gold
                    .stroke();
                // Corner Ornaments
                const drawCorner = (x, y, xDir, yDir) => {
                    doc
                        .save()
                        .lineWidth(2)
                        .strokeColor("#D97706")
                        .moveTo(x, y + yDir * 15)
                        .lineTo(x, y)
                        .lineTo(x + xDir * 15, y)
                        .stroke()
                        .restore();
                };
                drawCorner(innerMargin + 4, innerMargin + 4, 1, 1);
                drawCorner(pageWidth - innerMargin - 4, innerMargin + 4, -1, 1);
                drawCorner(innerMargin + 4, pageHeight - innerMargin - 4, 1, -1);
                drawCorner(pageWidth - innerMargin - 4, pageHeight - innerMargin - 4, -1, -1);
                // ─────────────────────────────────────────────────────────────
                // 2. HEADER: ORGANIZATION & BRANDING
                // ─────────────────────────────────────────────────────────────
                let currentY = 48;
                // Issuing Org
                doc
                    .font("Helvetica-Bold")
                    .fontSize(11)
                    .fillColor("#64748B")
                    .text(data.issuingOrganization.toUpperCase(), 0, currentY, {
                    align: "center",
                    width: pageWidth,
                    characterSpacing: 2.5,
                });
                currentY += 18;
                // Program Subtitle
                doc
                    .font("Helvetica")
                    .fontSize(8.5)
                    .fillColor("#94A3B8")
                    .text("EMPLOYEE RECOGNITION & REWARD PROGRAM", 0, currentY, {
                    align: "center",
                    width: pageWidth,
                    characterSpacing: 2,
                });
                currentY += 28;
                // Certificate Title
                doc
                    .font("Helvetica-Bold")
                    .fontSize(26)
                    .fillColor("#1E3A8A")
                    .text("CERTIFICATE OF EXCELLENCE", 0, currentY, {
                    align: "center",
                    width: pageWidth,
                    characterSpacing: 3,
                });
                currentY += 34;
                // Thin decorative gold rule
                const ruleWidth = 240;
                const ruleX = (pageWidth - ruleWidth) / 2;
                doc
                    .save()
                    .lineWidth(1.5)
                    .strokeColor("#D97706")
                    .moveTo(ruleX, currentY)
                    .lineTo(ruleX + ruleWidth, currentY)
                    .stroke()
                    .restore();
                currentY += 18;
                // Presentation text
                doc
                    .font("Helvetica")
                    .fontSize(10.5)
                    .fillColor("#475569")
                    .text("PROUDLY PRESENTED TO", 0, currentY, {
                    align: "center",
                    width: pageWidth,
                    characterSpacing: 1.5,
                });
                currentY += 20;
                // ─────────────────────────────────────────────────────────────
                // 3. RECIPIENT NAME & BADGE
                // ─────────────────────────────────────────────────────────────
                doc
                    .font("Helvetica-Bold")
                    .fontSize(27)
                    .fillColor("#0F172A")
                    .text(data.recipientName, 0, currentY, {
                    align: "center",
                    width: pageWidth,
                });
                currentY += 34;
                // Recipient details (Department & Code)
                const recipientSub = `${data.departmentName}  •  Employee ID: ${data.employeeCode}`;
                doc
                    .font("Helvetica")
                    .fontSize(9.5)
                    .fillColor("#64748B")
                    .text(recipientSub, 0, currentY, {
                    align: "center",
                    width: pageWidth,
                });
                currentY += 22;
                // Citation preamble
                doc
                    .font("Helvetica-Oblique")
                    .fontSize(10)
                    .fillColor("#475569")
                    .text("in honor of exceptional dedication, professional distinction, and outstanding contributions through", 0, currentY, { align: "center", width: pageWidth });
                currentY += 18;
                // ─────────────────────────────────────────────────────────────
                // 4. AWARD TITLE (HIGHLIGHT BANNER)
                // ─────────────────────────────────────────────────────────────
                const bannerWidth = 420;
                const bannerHeight = 30;
                const bannerX = (pageWidth - bannerWidth) / 2;
                doc
                    .roundedRect(bannerX, currentY, bannerWidth, bannerHeight, 4)
                    .fill("#EFF6FF");
                doc
                    .roundedRect(bannerX, currentY, bannerWidth, bannerHeight, 4)
                    .lineWidth(1)
                    .strokeColor("#BFDBFE")
                    .stroke();
                doc
                    .font("Helvetica-Bold")
                    .fontSize(13)
                    .fillColor("#1E3A8A")
                    .text(data.awardTitle.toUpperCase(), bannerX, currentY + 8, {
                    align: "center",
                    width: bannerWidth,
                    characterSpacing: 1,
                });
                currentY += 42;
                // Citation / Reason text
                if (data.awardReason) {
                    const reasonSnippet = data.awardReason.length > 240
                        ? data.awardReason.substring(0, 237) + "..."
                        : data.awardReason;
                    doc
                        .font("Helvetica")
                        .fontSize(9)
                        .fillColor("#334155")
                        .text(`"${reasonSnippet}"`, 90, currentY, {
                        align: "center",
                        width: pageWidth - 180,
                        lineGap: 3,
                    });
                }
                // ─────────────────────────────────────────────────────────────
                // 5. SIGNATURE & DATE BLOCKS
                // ─────────────────────────────────────────────────────────────
                const footerStartY = pageHeight - 145;
                // Left Signature Block: Date of Conferral
                const leftColX = 90;
                const colWidth = 180;
                doc
                    .strokeColor("#CBD5E1")
                    .lineWidth(1)
                    .moveTo(leftColX, footerStartY)
                    .lineTo(leftColX + colWidth, footerStartY)
                    .stroke();
                doc
                    .font("Helvetica-Bold")
                    .fontSize(9.5)
                    .fillColor("#0F172A")
                    .text(data.awardDate, leftColX, footerStartY + 6, {
                    align: "center",
                    width: colWidth,
                });
                doc
                    .font("Helvetica")
                    .fontSize(7.5)
                    .fillColor("#64748B")
                    .text("DATE OF CONFERRAL", leftColX, footerStartY + 19, {
                    align: "center",
                    width: colWidth,
                    characterSpacing: 0.5,
                });
                // Right Signature Block: Authorized Presenter
                const rightColX = pageWidth - 90 - colWidth;
                doc
                    .strokeColor("#CBD5E1")
                    .lineWidth(1)
                    .moveTo(rightColX, footerStartY)
                    .lineTo(rightColX + colWidth, footerStartY)
                    .stroke();
                doc
                    .font("Helvetica-Bold")
                    .fontSize(9.5)
                    .fillColor("#0F172A")
                    .text(data.presentedBy, rightColX, footerStartY + 6, {
                    align: "center",
                    width: colWidth,
                });
                doc
                    .font("Helvetica")
                    .fontSize(7.5)
                    .fillColor("#64748B")
                    .text("AUTHORIZED ISSUER / HR", rightColX, footerStartY + 19, {
                    align: "center",
                    width: colWidth,
                    characterSpacing: 0.5,
                });
                // ─────────────────────────────────────────────────────────────
                // 6. QR CODE & VERIFICATION BADGE (CENTER)
                // ─────────────────────────────────────────────────────────────
                const qrSize = 64;
                const qrX = (pageWidth - qrSize) / 2;
                const qrY = footerStartY - 14;
                try {
                    const qrBuffer = await qrcode_1.default.toBuffer(data.verificationUrl, {
                        width: qrSize * 2,
                        margin: 1,
                        color: { dark: "#0F172A", light: "#FFFFFF" },
                    });
                    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
                }
                catch (qrErr) {
                    console.warn("[renderCertificatePdf] QR generation warning:", qrErr);
                }
                doc
                    .font("Helvetica-Bold")
                    .fontSize(7)
                    .fillColor("#1E3A8A")
                    .text("SCAN TO VERIFY", 0, qrY + qrSize + 3, {
                    align: "center",
                    width: pageWidth,
                    characterSpacing: 0.8,
                });
                // ─────────────────────────────────────────────────────────────
                // 7. BOTTOM METADATA BAR
                // ─────────────────────────────────────────────────────────────
                const bottomBarY = pageHeight - 44;
                doc
                    .strokeColor("#E2E8F0")
                    .lineWidth(0.5)
                    .moveTo(innerMargin + 10, bottomBarY)
                    .lineTo(pageWidth - innerMargin - 10, bottomBarY)
                    .stroke();
                doc
                    .font("Helvetica")
                    .fontSize(6.5)
                    .fillColor("#94A3B8")
                    .text(`Certificate No: ${data.certificateNumber}  |  Verification Code: ${data.verificationCode}  |  Issued: ${data.issuedAt.split("T")[0]}  |  Authenticity: ${data.verificationUrl}`, 0, bottomBarY + 6, { align: "center", width: pageWidth });
                doc.end();
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Generates or retrieves an authoritative certificate for an employee award.
     * Fully idempotent: If an active certificate already exists and forceReissue is false, returns existing.
     */
    static async generateCertificate(dto) {
        const { tenantId, awardId, actorUserId, isHRAuthorized, forceReissue, reissueReason } = dto;
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        if (!isHRAuthorized) {
            throw new Error("Access denied: Only HR authorized personnel can generate award certificates.");
        }
        // 1. Fetch award with relations
        const award = await db.award.findFirst({
            where: { id: awardId, tenantId },
            include: {
                awardType: true,
                employee: {
                    select: {
                        id: true,
                        userId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        employeeCode: true,
                        department: { select: { id: true, name: true } },
                        designation: { select: { id: true, name: true } },
                    },
                },
                nomination: true,
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        });
        if (!award) {
            throw new Error("Award not found.");
        }
        // 2. Validate Award status and Nomination status
        if (award.status === "revoked") {
            throw new Error("Cannot generate certificate for a revoked award.");
        }
        if (award.nomination && award.nomination.status !== "AWARD_ISSUED" && award.nomination.status !== "APPROVED") {
            throw new Error(`Cannot generate certificate: Linked nomination is in '${award.nomination.status}' status.`);
        }
        // 3. Idempotency Check (if active certificate exists and not forceReissue)
        const existingActiveCert = await db.employeeAwardCertificate.findFirst({
            where: {
                tenantId,
                awardId,
                status: "ACTIVE",
            },
        });
        if (existingActiveCert && !forceReissue) {
            return {
                certificate: existingActiveCert,
                reused: true,
                message: "Active certificate already exists for this award.",
            };
        }
        // 4. If forceReissue, revoke existing active certificates
        if (existingActiveCert && forceReissue) {
            await db.employeeAwardCertificate.updateMany({
                where: {
                    tenantId,
                    awardId,
                    status: "ACTIVE",
                },
                data: {
                    status: "REVOKED",
                    revokedAt: new Date(),
                    revokedBy: actorUserId,
                    revocationReason: reissueReason || "Superseded by certificate re-issuance",
                },
            });
        }
        // 5. Generate unique Certificate Number & unguessable Verification Code
        const year = new Date().getFullYear();
        const randomHex = crypto_1.default.randomBytes(4).toString("hex").toUpperCase();
        const certificateNumber = `CERT-${year}-${randomHex}`;
        const verificationCode = `VERIFY-${crypto_1.default.randomBytes(16).toString("hex").toUpperCase()}`;
        const certId = crypto_1.default.randomUUID();
        const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const verificationUrl = `${baseUrl}/verify-certificate?code=${verificationCode}`;
        const metadata = {
            certificateNumber,
            verificationCode,
            recipientName: `${award.employee.firstName} ${award.employee.lastName}`.trim(),
            recipientEmail: award.employee.email || undefined,
            employeeCode: award.employee.employeeCode || "N/A",
            departmentName: award.employee.department?.name || "General",
            designationTitle: award.employee.designation?.name || "Team Member",
            awardTitle: award.awardType?.name || award.giftItem || "Excellence Recognition",
            awardCategory: award.awardType?.name || "Recognition",
            awardReason: award.description || "In recognition of outstanding dedication and exceptional performance.",
            awardDate: award.awardDate ? new Date(award.awardDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            presentedBy: award.presentedBy || award.tenant?.name || "Executive Management",
            issuingOrganization: award.tenant?.name || "MASTERHRMS Cloud",
            tenantSlug: award.tenant?.slug || tenantId,
            issuedAt: new Date().toISOString(),
            verificationUrl,
        };
        // 6. Check for template assignment from Certificate Studio or fallback to base vector PDF
        let pdfBuffer = null;
        let templateId = null;
        let templateVersionId = null;
        let snapshotData = null;
        if (award.awardTypeId) {
            try {
                const assignment = await db.certificateTemplateAssignment.findUnique({
                    where: {
                        tenantId_awardTypeId: { tenantId, awardTypeId: award.awardTypeId }
                    },
                    include: {
                        template: true,
                        templateVersion: true
                    }
                });
                if (assignment && assignment.template) {
                    const version = assignment.templateVersion ?? await db.certificateTemplateVersion.findFirst({
                        where: { templateId: assignment.templateId },
                        orderBy: { versionNumber: "desc" }
                    });
                    if (version && version.designJson && version.designJson.elements) {
                        templateId = assignment.templateId;
                        templateVersionId = version.id;
                        const placeholderMap = {
                            "{{employee.name}}": metadata.recipientName,
                            "{{employee.employeeCode}}": metadata.employeeCode,
                            "{{employee.designation}}": metadata.designationTitle,
                            "{{employee.department}}": metadata.departmentName,
                            "{{award.title}}": metadata.awardTitle,
                            "{{award.description}}": metadata.awardReason,
                            "{{award.date}}": metadata.awardDate,
                            "{{award.category}}": metadata.awardCategory,
                            "{{organization.name}}": metadata.issuingOrganization,
                            "{{certificate.number}}": metadata.certificateNumber,
                            "{{certificate.verificationCode}}": metadata.verificationCode,
                            "{{certificate.verificationUrl}}": metadata.verificationUrl
                        };
                        pdfBuffer = await certificate_studio_service_1.CertificateStudioService.renderTemplateToPdf(version.designJson, placeholderMap);
                        snapshotData = {
                            templateName: assignment.template.name,
                            templateVersionNumber: version.versionNumber,
                            signatoryConfiguration: assignment.signatoryConfiguration,
                            designSnapshot: version.designJson
                        };
                    }
                }
            }
            catch (tmplErr) {
                console.warn("[AwardCert] Could not render via custom template, falling back to base vector PDF:", tmplErr);
            }
        }
        if (!pdfBuffer) {
            pdfBuffer = await this.renderCertificatePdf(metadata);
        }
        // 7. Store to File Manager and Tenant-Isolated Local Storage
        const folders = await certificate_folder_service_1.CertificateFolderService.ensureCertificatesFolders(tenantId, actorUserId || "system");
        const fileName = `certificate-${certificateNumber}.pdf`;
        let mediaFile = null;
        try {
            mediaFile = await files_service_1.FilesService.uploadFile({
                buffer: pdfBuffer,
                originalFilename: fileName,
                tenantId,
                userId: actorUserId || "system",
                parentId: folders.generatedFolder.id,
                folder: "Certificates/Generated",
                category: "Documents",
                tags: ["certificates", "generated", certificateNumber],
            });
        }
        catch (uploadErr) {
            console.warn("[AwardCertificateService] File Manager upload warning:", uploadErr?.message);
        }
        const uploadsRoot = (0, media_service_1.getUploadsRoot)();
        const relativeDir = path_1.default.join("tenants", tenantId, "awards", "certificates", certId);
        const absoluteDir = path_1.default.join(uploadsRoot, relativeDir);
        await fs_1.default.promises.mkdir(absoluteDir, { recursive: true });
        const absoluteFilePath = path_1.default.join(absoluteDir, fileName);
        await fs_1.default.promises.writeFile(absoluteFilePath, pdfBuffer);
        const relativeStoragePath = path_1.default.join(relativeDir, fileName).replace(/\\/g, "/");
        // Also mirror to File Manager physical path if distinct so file stream endpoints resolve
        if (mediaFile?.filePath) {
            const mediaAbsolute = path_1.default.resolve(uploadsRoot, mediaFile.filePath);
            if (!fs_1.default.existsSync(mediaAbsolute)) {
                await fs_1.default.promises.mkdir(path_1.default.dirname(mediaAbsolute), { recursive: true });
                await fs_1.default.promises.writeFile(mediaAbsolute, pdfBuffer);
            }
        }
        // 8. Persist Certificate record to Database (with concurrency race resolution)
        let certificate = null;
        try {
            certificate = await db.employeeAwardCertificate.create({
                data: {
                    id: certId,
                    tenantId,
                    awardId: award.id,
                    nominationId: award.nominationId ?? null,
                    employeeId: award.employee.id,
                    certificateNumber,
                    verificationCode,
                    storagePath: relativeStoragePath,
                    fileId: mediaFile?.id ?? null,
                    fileName,
                    mimeType: "application/pdf",
                    fileSize: pdfBuffer.length,
                    status: "ACTIVE",
                    metadata: metadata,
                    templateId: templateId ?? null,
                    templateVersionId: templateVersionId ?? null,
                    snapshotData: (snapshotData ?? {}),
                    issuedAt: new Date(),
                    generatedAt: new Date(),
                },
            });
        }
        catch (createErr) {
            if (createErr.code === "P2002" || createErr.message?.includes("Unique constraint")) {
                const concurrentActiveCert = await db.employeeAwardCertificate.findFirst({
                    where: { tenantId, awardId: award.id, status: "ACTIVE" },
                });
                if (concurrentActiveCert) {
                    // Clean up redundant file from disk
                    try {
                        await fs_1.default.promises.unlink(absoluteFilePath);
                    }
                    catch { }
                    return {
                        certificate: concurrentActiveCert,
                        reused: true,
                        message: "Active certificate already exists for this award (concurrency resolution).",
                    };
                }
            }
            throw createErr;
        }
        // 9. Update Award with certificate link and certificateNo
        const downloadUrl = `/api/awards/certificates/${certId}/download`;
        await db.award.update({
            where: { id: award.id },
            data: {
                certificateUrl: downloadUrl,
                certificateNo: certificateNumber,
            },
        });
        // 10. Audit Logging
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: actorUserId,
            action: forceReissue ? "AWARD_CERTIFICATE_REISSUED" : "AWARD_CERTIFICATE_GENERATED",
            entityType: "EmployeeAwardCertificate",
            entityId: certId,
            newState: {
                certificateNumber,
                verificationCode,
                awardId: award.id,
                employeeId: award.employee.id,
                status: "ACTIVE",
            },
        }).catch((err) => console.warn("[AwardCertificateService] Audit log warning:", err.message));
        // 11. In-App Notification to recipient employee
        try {
            if (award.employee.userId) {
                await notification_service_1.NotificationService.createNotification({
                    tenantId,
                    userId: award.employee.userId,
                    title: "Award Certificate Available",
                    message: `Congratulations! Your official certificate for "${metadata.awardTitle}" is ready to view and download.`,
                    type: "award_certificate",
                    actionUrl: `/me/awards`,
                    metadata: {
                        certificateId: certId,
                        certificateNumber,
                        awardId: award.id,
                    },
                });
            }
        }
        catch (notifErr) {
            console.warn("[AwardCertificateService] Notification warning:", notifErr.message);
        }
        // 12. Transactional Outbox Event for resilient async processing
        try {
            await outbox_service_1.OutboxService.createOutboxEvent({
                tenantId,
                eventType: forceReissue ? "award.certificate.reissued" : "award.certificate.generated",
                entityType: "EmployeeAwardCertificate",
                entityId: certId,
                actorId: actorUserId,
                payload: {
                    certificateNumber,
                    verificationCode,
                    awardId: award.id,
                    employeeId: award.employee.id,
                    recipientEmail: award.employee.email,
                    awardTitle: metadata.awardTitle,
                },
            });
        }
        catch (outboxErr) {
            console.warn("[AwardCertificateService] Outbox event warning:", outboxErr.message);
        }
        // 13. Realtime WebSocket Broadcast
        (0, socket_1.broadcastToTenant)(tenantId, "award_certificate:generated", certificate);
        return {
            certificate,
            reused: false,
            message: forceReissue ? "Certificate successfully reissued." : "Certificate successfully generated.",
        };
    }
    /**
     * Revokes an existing active certificate with a mandatory reason.
     */
    static async revokeCertificate(dto) {
        const { tenantId, certificateId, actorUserId, reason, isHRAuthorized } = dto;
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        if (!isHRAuthorized) {
            throw new Error("Access denied: Only HR authorized personnel can revoke award certificates.");
        }
        if (!reason || reason.trim().length < 3) {
            throw new Error("A valid revocation reason (at least 3 characters) is required.");
        }
        const certificate = await db.employeeAwardCertificate.findFirst({
            where: { id: certificateId, tenantId },
            include: {
                employee: { select: { id: true, userId: true, firstName: true, lastName: true } },
                award: true,
            },
        });
        if (!certificate) {
            throw new Error("Certificate not found.");
        }
        if (certificate.status === "REVOKED") {
            throw new Error("Certificate is already revoked.");
        }
        const updated = await db.employeeAwardCertificate.update({
            where: { id: certificate.id },
            data: {
                status: "REVOKED",
                revokedAt: new Date(),
                revokedBy: actorUserId,
                revocationReason: reason.trim(),
            },
        });
        // Audit Logging
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: actorUserId,
            action: "AWARD_CERTIFICATE_REVOKED",
            entityType: "EmployeeAwardCertificate",
            entityId: certificate.id,
            newState: {
                status: "REVOKED",
                revocationReason: reason.trim(),
            },
        }).catch((err) => console.warn("[AwardCertificateService] Audit log warning:", err.message));
        // Notify recipient employee
        try {
            if (certificate.employee.userId) {
                await notification_service_1.NotificationService.createNotification({
                    tenantId,
                    userId: certificate.employee.userId,
                    title: "Award Certificate Revoked",
                    message: `The certificate for "${certificate.metadata?.awardTitle || "Award"}" has been revoked: ${reason.trim()}`,
                    type: "award_certificate",
                    actionUrl: `/me/awards`,
                });
            }
        }
        catch (notifErr) {
            console.warn("[AwardCertificateService] Notification warning:", notifErr.message);
        }
        // Outbox event
        try {
            await outbox_service_1.OutboxService.createOutboxEvent({
                tenantId,
                eventType: "award.certificate.revoked",
                entityType: "EmployeeAwardCertificate",
                entityId: certificate.id,
                actorId: actorUserId,
                payload: {
                    certificateNumber: certificate.certificateNumber,
                    reason: reason.trim(),
                    awardId: certificate.awardId,
                },
            });
        }
        catch (outboxErr) {
            console.warn("[AwardCertificateService] Outbox warning:", outboxErr.message);
        }
        (0, socket_1.broadcastToTenant)(tenantId, "award_certificate:revoked", updated);
        return updated;
    }
    /**
     * Reissues a certificate by revoking active instances and creating a fresh one.
     */
    static async reissueCertificate(dto) {
        return this.generateCertificate({
            tenantId: dto.tenantId,
            awardId: dto.awardId,
            actorUserId: dto.actorUserId,
            isHRAuthorized: dto.isHRAuthorized,
            forceReissue: true,
            reissueReason: dto.reason,
        });
    }
    /**
     * Public, non-sensitive certificate verification.
     * Completely rate-limitable, zero PII leakage.
     */
    static async verifyPublicly(verificationCode) {
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        if (!verificationCode || verificationCode.trim().length === 0) {
            return { valid: false, message: "Verification code must be specified." };
        }
        const cert = await db.employeeAwardCertificate.findFirst({
            where: { verificationCode: verificationCode.trim() },
        });
        if (!cert) {
            return {
                valid: false,
                message: "No certificate found matching the provided verification code.",
            };
        }
        const meta = cert.metadata || {};
        if (cert.status === "REVOKED") {
            return {
                valid: false,
                status: "REVOKED",
                certificateNumber: cert.certificateNumber,
                awardTitle: meta.awardTitle || "Award",
                recipientName: meta.recipientName || "N/A",
                issuingOrganization: meta.issuingOrganization || "MASTERHRMS",
                revokedAt: cert.revokedAt,
                revocationReason: cert.revocationReason || "Revoked by issuer",
                message: "This certificate has been officially revoked by the issuing organization.",
            };
        }
        return {
            valid: true,
            status: "ACTIVE",
            certificateNumber: cert.certificateNumber,
            awardTitle: meta.awardTitle || "Recognition Award",
            awardCategory: meta.awardCategory || "General",
            recipientName: meta.recipientName || "N/A",
            awardDate: meta.awardDate || cert.issuedAt.toISOString().split("T")[0],
            issuingOrganization: meta.issuingOrganization || "MASTERHRMS Cloud",
            issuedAt: cert.issuedAt,
        };
    }
    /**
     * Resolves certificate binary stream with strict tenant and permission validation.
     */
    static async getCertificateFile(options) {
        const { certificateId, tenantId, callerEmployeeId, isHRAuthorized } = options;
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        const cert = await db.employeeAwardCertificate.findUnique({
            where: { id: certificateId },
            include: {
                award: true,
            },
        });
        if (!cert) {
            throw new Error("Certificate not found.");
        }
        // Tenant check
        if (tenantId && cert.tenantId !== tenantId) {
            throw new Error("Access denied: Certificate does not belong to your organization.");
        }
        // Role or Employee ownership check
        const isOwner = callerEmployeeId && cert.employeeId === callerEmployeeId;
        if (!isHRAuthorized && !isOwner) {
            throw new Error("Access denied: You are not authorized to download this certificate.");
        }
        // Check status
        if (cert.status === "REVOKED" && !isHRAuthorized) {
            throw new Error("This certificate has been revoked and cannot be downloaded.");
        }
        const uploadsRoot = (0, media_service_1.getUploadsRoot)();
        const absolutePath = path_1.default.resolve(uploadsRoot, cert.storagePath);
        // Guard directory traversal
        if (!absolutePath.startsWith(path_1.default.resolve(uploadsRoot))) {
            throw new Error("Security violation: Storage path traversal detected.");
        }
        if (!fs_1.default.existsSync(absolutePath)) {
            // Self-healing storage: re-render from historical snapshot data or metadata
            let freshBuffer = null;
            const snap = cert.snapshotData;
            const meta = cert.metadata;
            if (snap && snap.designSnapshot && snap.designSnapshot.elements) {
                try {
                    const placeholderMap = {
                        "{{employee.name}}": meta?.recipientName || "Recipient",
                        "{{employee.employeeCode}}": meta?.employeeCode || "N/A",
                        "{{employee.designation}}": meta?.designationTitle || "Team Member",
                        "{{employee.department}}": meta?.departmentName || "General",
                        "{{award.title}}": meta?.awardTitle || "Recognition",
                        "{{award.description}}": meta?.awardReason || "",
                        "{{award.date}}": meta?.awardDate || new Date().toISOString().split("T")[0],
                        "{{award.category}}": meta?.awardCategory || "Recognition",
                        "{{organization.name}}": meta?.issuingOrganization || "Organization",
                        "{{certificate.number}}": cert.certificateNumber,
                        "{{certificate.verificationCode}}": cert.verificationCode,
                        "{{certificate.verificationUrl}}": meta?.verificationUrl || ""
                    };
                    freshBuffer = await certificate_studio_service_1.CertificateStudioService.renderTemplateToPdf(snap.designSnapshot, placeholderMap);
                }
                catch (snapErr) {
                    console.warn("[getCertificateFile] Historical snapshot re-render warning:", snapErr);
                }
            }
            if (!freshBuffer && cert.metadata) {
                freshBuffer = await this.renderCertificatePdf(cert.metadata);
            }
            if (freshBuffer) {
                try {
                    const healFolders = await certificate_folder_service_1.CertificateFolderService.ensureCertificatesFolders(cert.tenantId, "system");
                    const healMediaFile = await files_service_1.FilesService.uploadFile({
                        buffer: freshBuffer,
                        originalFilename: cert.fileName || path_1.default.basename(absolutePath),
                        tenantId: cert.tenantId,
                        userId: options.actorUserId || "system",
                        parentId: healFolders.generatedFolder.id,
                        folder: "Certificates/Generated",
                        category: "Documents",
                        tags: ["certificates", "self-healed", cert.certificateNumber],
                    });
                    if (healMediaFile) {
                        await db.employeeAwardCertificate.update({
                            where: { id: cert.id },
                            data: { fileId: healMediaFile.id }
                        });
                        const healMediaDisk = path_1.default.resolve(uploadsRoot, healMediaFile.filePath);
                        if (!fs_1.default.existsSync(healMediaDisk)) {
                            await fs_1.default.promises.mkdir(path_1.default.dirname(healMediaDisk), { recursive: true });
                            await fs_1.default.promises.writeFile(healMediaDisk, freshBuffer);
                        }
                    }
                }
                catch (healSyncErr) {
                    console.warn("[getCertificateFile] File Manager self-heal sync warning:", healSyncErr?.message);
                }
                await fs_1.default.promises.mkdir(path_1.default.dirname(absolutePath), { recursive: true });
                await fs_1.default.promises.writeFile(absolutePath, freshBuffer);
                // Record audit trail for self-healing recovery
                await audit_service_1.AuditService.logMutation({
                    tenantId: cert.tenantId,
                    actorId: options.actorUserId || "system",
                    action: "AWARD_CERTIFICATE_SELF_HEALED",
                    entityType: "EmployeeAwardCertificate",
                    entityId: cert.id,
                    newState: {
                        certificateNumber: cert.certificateNumber,
                        restoredPath: cert.storagePath,
                        source: snap?.designSnapshot ? "HISTORICAL_DESIGN_SNAPSHOT" : "BASE_METADATA",
                        restoredAt: new Date().toISOString()
                    }
                }).catch((err) => console.warn("[getCertificateFile] Self-healing audit warning:", err.message));
                return {
                    absolutePath,
                    fileName: cert.fileName,
                    mimeType: cert.mimeType,
                    fileSize: freshBuffer.length,
                    certificate: cert,
                };
            }
            throw new Error("Certificate file not found on disk.");
        }
        const stats = await fs_1.default.promises.stat(absolutePath);
        return {
            absolutePath,
            fileName: cert.fileName,
            mimeType: cert.mimeType,
            fileSize: stats.size,
            certificate: cert,
        };
    }
}
exports.AwardCertificateService = AwardCertificateService;
