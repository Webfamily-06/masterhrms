"use strict";
/**
 * MASTERHRMS — HR Workflow Auto-Trigger Email Dispatcher
 * ======================================================
 * Automatically sends tenant-branded Universal HTML emails when HR events occur
 * (respecting Settings -> Email Notification Settings toggles, Brand Settings Logo Light/Dark,
 * dynamic .env public deep-links, and Tenant SMTP settings with 550 relay fallback).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HR_EVENT_TO_TEMPLATE_ID = void 0;
exports.dispatchHrWorkflowEmail = dispatchHrWorkflowEmail;
exports.resolveEmployeeContact = resolveEmployeeContact;
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma_1 = require("../prisma");
const hr_email_templates_1 = require("../lib/hr-email-templates");
const email_templates_registry_1 = require("../lib/email-templates-registry");
const email_design_system_1 = require("../lib/email-design-system");
const branding_1 = require("../lib/email-design-system/branding");
exports.HR_EVENT_TO_TEMPLATE_ID = {
    assignDocumentToEmployee: "hr-assign-document-to-employee",
    awardCreate: "hr-award-create",
    candidateStatusUpdate: "hr-candidate-status-update",
    complaintCreate: "hr-complaint-create",
    employeeContractCreate: "hr-employee-contract-create",
    employeeContractStatusUpdate: "hr-employee-contract-status-update",
    employeeCreate: "hr-employee-create",
    employeeTransfer: "hr-employee-transfer",
    employeeTransferStatusUpdate: "hr-employee-transfer-status-update",
    interviewCreate: "hr-interview-create",
    interviewStatusUpdate: "hr-interview-status-update",
    jobApplied: "hr-job-applied",
    leaveStatusUpdate: "hr-leave-status-update",
    offerCreate: "hr-offer-create",
    payrollRunStatusUpdate: "hr-payroll-run-status-update",
    promotionCreate: "hr-promotion-create",
    promotionStatusUpdate: "hr-promotion-status-update",
    resignationStatusUpdate: "hr-resignation-status-update",
    terminationCreate: "hr-termination-create",
    terminationStatusUpdate: "hr-termination-status-update",
    tripCreate: "hr-trip-create",
    tripStatusUpdate: "hr-trip-status-update",
    userCreate: "hr-user-create",
    warningCreate: "hr-warning-create",
};
async function dispatchHrWorkflowEmail(params) {
    const { tenantId, eventKey, toEmail, variables = {}, forceSend = false } = params;
    const templateId = exports.HR_EVENT_TO_TEMPLATE_ID[eventKey];
    try {
        const cleanEmail = String(toEmail || "").trim();
        if (!cleanEmail || !cleanEmail.includes("@")) {
            return {
                success: false,
                skipped: true,
                eventKey,
                templateId,
                error: "No valid recipient email address found.",
            };
        }
        const [settingRows, templatesPage, branding] = await Promise.all([
            prisma_1.rawPrisma.setting
                .findMany({
                where: { scope: "TENANT", scopeId: tenantId, group: "tenant_system_settings" },
            })
                .catch(() => []),
            prisma_1.rawPrisma.cmsPage
                .findUnique({ where: { slug: `tenant-${tenantId}-email-templates` } })
                .catch(() => null),
            (0, branding_1.resolveUniversalEmailBranding)(tenantId),
        ]);
        const sysSettings = {};
        for (const row of settingRows) {
            if (row.key && row.valueJson && typeof row.valueJson === "object") {
                sysSettings[row.key] = row.valueJson;
            }
        }
        const notifToggles = (sysSettings.email_notifications || {});
        // Respect Email Notification Settings toggle unless forceSend is true
        if (!forceSend && notifToggles[eventKey] === false) {
            return {
                success: true,
                skipped: true,
                eventKey,
                templateId,
                toEmail: cleanEmail,
                message: `Skipped: "${eventKey}" is disabled in Email Notification Settings.`,
            };
        }
        const persistedTemplates = Array.isArray(templatesPage?.content?.templates)
            ? (templatesPage?.content).templates
            : [];
        const template = persistedTemplates.find((t) => t.id === templateId) ||
            hr_email_templates_1.HR_EMAIL_TEMPLATES.find((t) => t.id === templateId);
        if (!template) {
            return {
                success: false,
                eventKey,
                templateId,
                toEmail: cleanEmail,
                error: `Template "${templateId}" not found.`,
            };
        }
        const savedEmail = sysSettings.email || {};
        const cfg = {
            host: String(savedEmail.host || process.env.SMTP_HOST || "").trim(),
            port: Number(savedEmail.port || process.env.SMTP_PORT || 587),
            username: String(savedEmail.username || process.env.SMTP_USER || "").trim(),
            password: String(savedEmail.password || process.env.SMTP_PASS || ""),
            encryption: String(savedEmail.encryption || "TLS").toUpperCase(),
            fromAddress: String(savedEmail.fromAddress || savedEmail.username || process.env.SMTP_FROM || "").trim(),
            fromName: String(savedEmail.fromName || branding.tenant.companyName || "MasterHRMS").trim(),
        };
        if (!cfg.host) {
            return {
                success: false,
                skipped: true,
                eventKey,
                templateId,
                toEmail: cleanEmail,
                error: "SMTP Host is not configured for this workspace.",
            };
        }
        const stringifiedVars = {};
        for (const [k, v] of Object.entries(variables)) {
            if (v !== undefined && v !== null) {
                stringifiedVars[k] = String(v);
            }
        }
        const mergedVars = {
            ...hr_email_templates_1.HR_SAMPLE_VARS,
            ...(0, branding_1.brandingToTemplateVars)(branding),
            portal_url: (0, branding_1.resolvePublicAppUrl)(),
            ...stringifiedVars,
        };
        const renderedSubject = (0, email_templates_registry_1.substituteTemplateVars)(template.subject, mergedVars);
        const renderedHtml = (0, email_design_system_1.substituteUniversalEmailVars)(template.html_body, mergedVars);
        const isSsl = cfg.encryption === "SSL" || cfg.port === 465;
        const transporter = nodemailer_1.default.createTransport({
            host: cfg.host,
            port: cfg.port,
            secure: isSsl,
            requireTLS: cfg.encryption === "TLS" && !isSsl,
            auth: cfg.username ? { user: cfg.username, pass: cfg.password } : undefined,
            tls: { rejectUnauthorized: false },
            connectionTimeout: 10000,
        });
        const authUserIsEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.username);
        const primaryFrom = cfg.fromAddress || cfg.username;
        const mailBase = {
            to: cleanEmail,
            subject: renderedSubject,
            html: renderedHtml,
        };
        try {
            await transporter.sendMail({
                ...mailBase,
                from: `"${cfg.fromName}" <${primaryFrom}>`,
            });
        }
        catch (sendErr) {
            const errMsg = String(sendErr?.message || "");
            const isRelayOrSenderDenied = /550|5\.7\.1|relay|sender.*not allowed|SendAsDenied|mail from|owned by/i.test(errMsg);
            if (isRelayOrSenderDenied && authUserIsEmail && primaryFrom.toLowerCase() !== cfg.username.toLowerCase()) {
                await transporter.sendMail({
                    ...mailBase,
                    from: `"${cfg.fromName}" <${cfg.username}>`,
                    replyTo: primaryFrom,
                });
            }
            else {
                throw sendErr;
            }
        }
        return {
            success: true,
            eventKey,
            templateId,
            toEmail: cleanEmail,
            message: `Sent "${template.name}" to ${cleanEmail}`,
        };
    }
    catch (err) {
        console.warn(`[HrWorkflowEmail] Failed "${eventKey}" -> ${toEmail}:`, err?.message || err);
        return {
            success: false,
            eventKey,
            templateId,
            toEmail: toEmail || undefined,
            error: err?.message || "Failed to dispatch HR workflow email.",
        };
    }
}
/**
 * Helper to look up an employee's email + full name safely by employeeId within a tenant.
 */
async function resolveEmployeeContact(tenantId, employeeId) {
    if (!employeeId)
        return null;
    const emp = await prisma_1.rawPrisma.employee
        .findFirst({
        where: { id: employeeId, tenantId },
        select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true },
    })
        .catch(() => null);
    if (!emp)
        return null;
    return {
        id: emp.id,
        name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email || "Employee",
        email: emp.email || "",
        employeeCode: emp.employeeCode || "",
    };
}
