import { Router, Response } from "express";
import nodemailer from "nodemailer";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { resolveTenantContext } from "../middleware/tenant-context.middleware.js";
import { requireHrOrAdmin } from "../middleware/hr-rbac.middleware.js";
import { prisma } from "../prisma.js";

export const hrMailTemplatesRouter = Router();

// DEFECT-041: Restrict HR Mail Templates and SMTP test dispatch strictly to HR/Tenant Administrators
hrMailTemplatesRouter.use(
  requireAuth,
  resolveTenantContext,
  requireHrOrAdmin({
    allowedPermissions: ["hrm.settings", "mail_templates", "settings.manage"],
    deniedMessage: "Access denied: HR or Workspace Administrator privileges are required to manage mail templates.",
  })
);

export interface DefaultMailTemplateDef {
  eventKey: string;
  name: string;
  module: string;
  subject: string;
  body: string;
  variables: string[];
}

export const DEFAULT_HR_MAIL_TEMPLATES: DefaultMailTemplateDef[] = [
  {
    eventKey: "assignDocumentToEmployee",
    name: "Assign Document To Employee",
    module: "Documents",
    subject: "Action Required: New Document Assigned — {{document_title}}",
    body: `Hello {{employee_name}},

A new HR document has been assigned to you for review and acknowledgment.

Document: {{document_title}}
Category: {{document_category}}
Assigned By: {{assigned_by}}
Due Date: {{due_date}}
Note: {{note}}

Please log in to {{company_name}} to review and acknowledge this document before the due date.

Best regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "document_title", "document_category", "assigned_by", "due_date", "note", "company_name"],
  },
  {
    eventKey: "awardCreate",
    name: "Award Create",
    module: "Lifecycle",
    subject: "Congratulations {{employee_name}}! You Received the {{award_type}} Award",
    body: `Dear {{employee_name}},

We are delighted to inform you that you have been recognized with the {{award_type}} award!

Award Date: {{award_date}}
Gift / Recognition: {{award_gift}}
Citation: {{award_description}}

Thank you for your outstanding contribution to {{company_name}}.

Warm regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "award_type", "award_date", "award_gift", "award_description", "company_name"],
  },
  {
    eventKey: "candidateStatusUpdate",
    name: "Candidate Status Update",
    module: "Recruitment",
    subject: "Application Status Update for {{job_title}} at {{company_name}}",
    body: `Dear {{candidate_name}},

Your application status for the position of {{job_title}} has been updated.

Current Status: {{status}}
Stage: {{stage}}
Updated On: {{updated_date}}
Remarks: {{remarks}}

We appreciate your interest in {{company_name}} and will keep you informed on next steps.

Best regards,
{{company_name}} Talent Acquisition`,
    variables: ["candidate_name", "job_title", "status", "stage", "updated_date", "remarks", "company_name"],
  },
  {
    eventKey: "complaintCreate",
    name: "Complaint Create",
    module: "Lifecycle",
    subject: "HR Complaint Logged: {{complaint_title}} (Ref #{{complaint_id}})",
    body: `Hello {{recipient_name}},

A formal HR complaint has been submitted and logged for review.

Reference ID: {{complaint_id}}
Title: {{complaint_title}}
Submitted By: {{submitted_by}}
Against: {{against_employee}}
Date: {{complaint_date}}
Summary: {{description}}

Please review this case confidentially in the {{company_name}} HR portal.

Regards,
{{company_name}} HR Team`,
    variables: ["recipient_name", "complaint_id", "complaint_title", "submitted_by", "against_employee", "complaint_date", "description", "company_name"],
  },
  {
    eventKey: "employeeContractCreate",
    name: "Employee Contract Create",
    module: "Documents",
    subject: "New Employment Contract Issued — {{contract_number}}",
    body: `Dear {{employee_name}},

Your new employment contract has been created in {{company_name}}.

Contract Number: {{contract_number}}
Contract Type: {{contract_type}}
Start Date: {{start_date}}
End Date: {{end_date}}
Compensation: {{salary}}

Please sign in to your employee portal to review the contract terms.

Best regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "contract_number", "contract_type", "start_date", "end_date", "salary", "company_name"],
  },
  {
    eventKey: "employeeContractStatusUpdate",
    name: "Employee Contract Status Update",
    module: "Documents",
    subject: "Contract {{contract_number}} Status Changed to {{status}}",
    body: `Dear {{employee_name}},

The status of your employment contract ({{contract_number}}) has been updated.

Contract Type: {{contract_type}}
New Status: {{status}}
Effective Period: {{start_date}} to {{end_date}}
Updated By: {{updated_by}}

Log in to {{company_name}} for full contract details.

Best regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "contract_number", "contract_type", "status", "start_date", "end_date", "updated_by", "company_name"],
  },
  {
    eventKey: "employeeCreate",
    name: "Employee Create",
    module: "Employees",
    subject: "Welcome to {{company_name}}, {{employee_name}}!",
    body: `Dear {{employee_name}},

Welcome aboard! Your employee profile has been created at {{company_name}}.

Employee Code: {{employee_code}}
Department: {{department}}
Designation: {{designation}}
Branch: {{branch}}
Joining Date: {{joining_date}}
Work Email: {{employee_email}}

We are excited to have you on our team!

Warm regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "employee_code", "department", "designation", "branch", "joining_date", "employee_email", "company_name"],
  },
  {
    eventKey: "employeeTransfer",
    name: "Employee Transfer",
    module: "Lifecycle",
    subject: "Transfer Notice: {{employee_name}} — Effective {{transfer_date}}",
    body: `Dear {{employee_name}},

This is to inform you that a transfer has been initiated for your role at {{company_name}}.

From Branch / Department: {{from_branch}} / {{from_department}}
To Branch / Department: {{to_branch}} / {{to_department}}
Effective Date: {{transfer_date}}
Reason: {{reason}}

Please connect with HR for transition details.

Best regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "from_branch", "from_department", "to_branch", "to_department", "transfer_date", "reason", "company_name"],
  },
  {
    eventKey: "employeeTransferStatusUpdate",
    name: "Employee Transfer Status Update",
    module: "Lifecycle",
    subject: "Transfer Request Status Updated — {{status}}",
    body: `Dear {{employee_name}},

Your employee transfer request status has been updated.

Destination: {{to_branch}} / {{to_department}}
Transfer Date: {{transfer_date}}
New Status: {{status}}
Remarks: {{remarks}}

Regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "to_branch", "to_department", "transfer_date", "status", "remarks", "company_name"],
  },
  {
    eventKey: "interviewCreate",
    name: "Interview Create",
    module: "Recruitment",
    subject: "Interview Scheduled: {{job_title}} on {{interview_date}}",
    body: `Dear {{candidate_name}},

Your interview for the {{job_title}} position at {{company_name}} has been scheduled.

Date: {{interview_date}}
Time: {{interview_time}}
Interviewer: {{interviewer_name}}
Mode / Location: {{location}}
Meeting Link: {{meeting_link}}

Please be available 5 minutes prior to the scheduled time. Good luck!

Best regards,
{{company_name}} Recruitment Team`,
    variables: ["candidate_name", "job_title", "interview_date", "interview_time", "interviewer_name", "location", "meeting_link", "company_name"],
  },
  {
    eventKey: "interviewStatusUpdate",
    name: "Interview Status Update",
    module: "Recruitment",
    subject: "Interview Status Update: {{job_title}} — {{status}}",
    body: `Dear {{candidate_name}},

The status of your interview for {{job_title}} has been updated.

Interview Date: {{interview_date}}
Updated Status: {{status}}
Feedback / Notes: {{feedback}}

Thank you for your time with {{company_name}}.

Best regards,
{{company_name}} Recruitment Team`,
    variables: ["candidate_name", "job_title", "interview_date", "status", "feedback", "company_name"],
  },
  {
    eventKey: "jobApplied",
    name: "Job Applied",
    module: "Recruitment",
    subject: "Application Received: {{job_title}} at {{company_name}}",
    body: `Dear {{candidate_name}},

Thank you for applying for the {{job_title}} position at {{company_name}}.

Application ID: {{application_id}}
Applied On: {{applied_date}}
Department: {{department}}

Our hiring team will review your profile and get in touch if your qualifications match our requirements.

Best regards,
{{company_name}} Talent Acquisition`,
    variables: ["candidate_name", "job_title", "application_id", "applied_date", "department", "company_name"],
  },
  {
    eventKey: "leaveStatusUpdate",
    name: "Leave Status Update",
    module: "Leave",
    subject: "Leave Request {{status}}: {{leave_type}} ({{start_date}} to {{end_date}})",
    body: `Dear {{employee_name}},

Your leave request has been {{status}}.

Leave Type: {{leave_type}}
Duration: {{start_date}} to {{end_date}} ({{total_days}} days)
Reviewed By: {{approver_name}}
Remarks: {{remarks}}

Regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "leave_type", "start_date", "end_date", "total_days", "status", "approver_name", "remarks", "company_name"],
  },
  {
    eventKey: "offerCreate",
    name: "Offer Create",
    module: "Recruitment",
    subject: "Job Offer from {{company_name}} — {{job_title}}",
    body: `Dear {{candidate_name}},

Congratulations! We are pleased to extend an official offer of employment for the role of {{job_title}} at {{company_name}}.

Offered Compensation: {{offered_salary}}
Proposed Joining Date: {{joining_date}}
Offer Expiry Date: {{expiry_date}}

Please review and respond to your offer letter via the link provided.

Warm regards,
{{company_name}} HR Team`,
    variables: ["candidate_name", "job_title", "offered_salary", "joining_date", "expiry_date", "company_name"],
  },
  {
    eventKey: "payrollRunStatusUpdate",
    name: "Payroll Run Status Update",
    module: "Payroll",
    subject: "Payroll Update for {{pay_period}} — Status: {{status}}",
    body: `Dear {{employee_name}},

The payroll run for {{pay_period}} has been updated to {{status}}.

Pay Date: {{pay_date}}
Net Pay: {{net_salary}}
Status: {{status}}

You can view and download your payslip from the {{company_name}} Employee Portal.

Best regards,
{{company_name}} Payroll Team`,
    variables: ["employee_name", "pay_period", "pay_date", "net_salary", "status", "company_name"],
  },
  {
    eventKey: "promotionCreate",
    name: "Promotion Create",
    module: "Lifecycle",
    subject: "Congratulations on Your Promotion to {{new_designation}}!",
    body: `Dear {{employee_name}},

Congratulations! We are thrilled to announce your promotion at {{company_name}}.

Previous Designation: {{previous_designation}}
New Designation: {{new_designation}}
Effective Date: {{promotion_date}}
Salary Adjustment: {{salary_adjustment}}

We wish you continued success in your new role!

Warm regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "previous_designation", "new_designation", "promotion_date", "salary_adjustment", "company_name"],
  },
  {
    eventKey: "promotionStatusUpdate",
    name: "Promotion Status Update",
    module: "Lifecycle",
    subject: "Promotion Update: {{new_designation}} — {{status}}",
    body: `Dear {{employee_name}},

The status of your promotion record for {{new_designation}} has been updated.

New Status: {{status}}
Effective Date: {{promotion_date}}
Remarks: {{remarks}}

Regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "new_designation", "status", "promotion_date", "remarks", "company_name"],
  },
  {
    eventKey: "resignationStatusUpdate",
    name: "Resignation Status Update",
    module: "Lifecycle",
    subject: "Resignation Request Status Updated — {{status}}",
    body: `Dear {{employee_name}},

Your resignation submission has been reviewed and updated.

Status: {{status}}
Resignation Date: {{resignation_date}}
Last Working Day: {{last_working_day}}
Remarks: {{remarks}}

Please coordinate with HR for exit formalities and handover.

Regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "status", "resignation_date", "last_working_day", "remarks", "company_name"],
  },
  {
    eventKey: "terminationCreate",
    name: "Termination Create",
    module: "Lifecycle",
    subject: "Official Notice of Employment Termination — {{employee_name}}",
    body: `Dear {{employee_name}},

This notice serves as formal communication regarding the termination of your employment with {{company_name}}.

Termination Type: {{termination_type}}
Notice Date: {{notice_date}}
Termination Date: {{termination_date}}
Reason: {{reason}}

Please contact HR regarding final settlement and asset return procedures.

Regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "termination_type", "notice_date", "termination_date", "reason", "company_name"],
  },
  {
    eventKey: "terminationStatusUpdate",
    name: "Termination Status Update",
    module: "Lifecycle",
    subject: "Employment Termination Record Updated — {{status}}",
    body: `Dear {{employee_name}},

Your termination record status at {{company_name}} has been updated.

Status: {{status}}
Termination Date: {{termination_date}}
Remarks: {{remarks}}

Regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "status", "termination_date", "remarks", "company_name"],
  },
  {
    eventKey: "tripCreate",
    name: "Trip Create",
    module: "Lifecycle",
    subject: "Business Trip Scheduled: {{destination}} ({{start_date}} – {{end_date}})",
    body: `Dear {{employee_name}},

A business trip has been created for you at {{company_name}}.

Purpose: {{trip_purpose}}
Destination: {{destination}}
Dates: {{start_date}} to {{end_date}}
Advance Amount: {{advance_amount}}

Safe travels! Please submit your expense receipts in the portal upon return.

Best regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "trip_purpose", "destination", "start_date", "end_date", "advance_amount", "company_name"],
  },
  {
    eventKey: "tripStatusUpdate",
    name: "Trip Status Update",
    module: "Lifecycle",
    subject: "Business Trip Status Updated ({{destination}}) — {{status}}",
    body: `Dear {{employee_name}},

The status of your business trip to {{destination}} has been updated.

Status: {{status}}
Dates: {{start_date}} to {{end_date}}
Remarks: {{remarks}}

Regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "destination", "status", "start_date", "end_date", "remarks", "company_name"],
  },
  {
    eventKey: "userCreate",
    name: "User Create",
    module: "Users",
    subject: "Your {{company_name}} Account Has Been Created",
    body: `Hello {{user_name}},

An account has been created for you on {{company_name}}.

Login Email: {{user_email}}
Assigned Role: {{role_name}}
Portal URL: {{portal_url}}

Please sign in and update your password on first login.

Best regards,
{{company_name}} Administration`,
    variables: ["user_name", "user_email", "role_name", "portal_url", "company_name"],
  },
  {
    eventKey: "warningCreate",
    name: "Warning Create",
    module: "Lifecycle",
    subject: "Official HR Warning Notice — {{warning_subject}}",
    body: `Dear {{employee_name}},

This email serves as an official {{warning_type}} warning notice issued on {{warning_date}}.

Subject: {{warning_subject}}
Severity: {{severity}}
Details: {{description}}

Please acknowledge this notice in the {{company_name}} HR portal and reach out to HR if you have any questions.

Regards,
{{company_name}} HR Team`,
    variables: ["employee_name", "warning_type", "warning_date", "warning_subject", "severity", "description", "company_name"],
  },
];

function extractVariables(text: string): string[] {
  const matches = Array.from(String(text || "").matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g));
  return Array.from(new Set(matches.map((m) => m[1])));
}

export function interpolateTemplate(template: string, values: Record<string, string>): string {
  return String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    return values[key] !== undefined && values[key] !== "" ? values[key] : `{{${key}}}`;
  });
}

async function ensureDefaultTemplates(tenantId: string) {
  const existing = await prisma.tenantMailTemplate.findMany({
    where: { tenantId },
    select: { eventKey: true },
  });
  const existingSet = new Set(existing.map((e) => e.eventKey));
  const missing = DEFAULT_HR_MAIL_TEMPLATES.filter((t) => !existingSet.has(t.eventKey));
  if (missing.length > 0) {
    await prisma.tenantMailTemplate.createMany({
      data: missing.map((t) => ({
        tenantId,
        eventKey: t.eventKey,
        name: t.name,
        module: t.module,
        subject: t.subject,
        body: t.body,
        variables: t.variables,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }
}

// GET /api/hr/mail-templates
hrMailTemplatesRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    await ensureDefaultTemplates(tenantId);
    const list = await prisma.tenantMailTemplate.findMany({
      where: { tenantId },
      orderBy: [{ module: "asc" }, { name: "asc" }],
    });
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/hr/mail-templates (Create custom mail template)
hrMailTemplatesRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { eventKey, name, module, subject, body, variables, isActive } = req.body || {};
    if (!name?.trim() || !subject?.trim() || !body?.trim()) {
      return res.status(400).json({ error: "Name, Subject, and Body are required." });
    }
    const cleanKey =
      String(eventKey || name)
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 75) || `custom_${Date.now()}`;

    const detectedVars = extractVariables(`${subject} ${body}`);
    const mergedVars = Array.from(
      new Set([...(Array.isArray(variables) ? variables : []), ...detectedVars])
    );

    const created = await prisma.tenantMailTemplate.create({
      data: {
        tenantId,
        eventKey: cleanKey,
        name: String(name).trim(),
        module: String(module || "Custom").trim(),
        subject: String(subject).trim(),
        body: String(body),
        variables: mergedVars,
        isActive: isActive !== false,
      },
    });
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// PUT /api/hr/mail-templates/:eventKey
hrMailTemplatesRouter.put("/:eventKey", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const eventKey = req.params.eventKey;
    const { name, module, subject, body, variables, isActive } = req.body || {};

    const existing = await prisma.tenantMailTemplate.findUnique({
      where: { tenantId_eventKey: { tenantId, eventKey } },
    });
    if (!existing) return res.status(404).json({ error: "Mail template not found." });

    const nextSubject = subject !== undefined ? String(subject).trim() : existing.subject;
    const nextBody = body !== undefined ? String(body) : existing.body;
    const detectedVars = extractVariables(`${nextSubject} ${nextBody}`);
    const existingVars = Array.isArray(existing.variables) ? (existing.variables as string[]) : [];
    const mergedVars = Array.from(
      new Set([...(Array.isArray(variables) ? variables : existingVars), ...detectedVars])
    );

    const updated = await prisma.tenantMailTemplate.update({
      where: { id: existing.id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(module ? { module: String(module).trim() } : {}),
        subject: nextSubject,
        body: nextBody,
        variables: mergedVars,
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// PATCH /api/hr/mail-templates/:eventKey/status
hrMailTemplatesRouter.patch(
  "/:eventKey/status",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const existing = await prisma.tenantMailTemplate.findUnique({
        where: { tenantId_eventKey: { tenantId, eventKey: req.params.eventKey } },
      });
      if (!existing) return res.status(404).json({ error: "Mail template not found." });

      const nextActive =
        req.body?.isActive !== undefined ? Boolean(req.body.isActive) : !existing.isActive;
      const updated = await prisma.tenantMailTemplate.update({
        where: { id: existing.id },
        data: { isActive: nextActive },
      });
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

// POST /api/hr/mail-templates/:eventKey/reset
hrMailTemplatesRouter.post(
  "/:eventKey/reset",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const def = DEFAULT_HR_MAIL_TEMPLATES.find((t) => t.eventKey === req.params.eventKey);
      if (!def) return res.status(404).json({ error: "No default template found for this key." });

      const updated = await prisma.tenantMailTemplate.upsert({
        where: { tenantId_eventKey: { tenantId, eventKey: def.eventKey } },
        create: {
          tenantId,
          eventKey: def.eventKey,
          name: def.name,
          module: def.module,
          subject: def.subject,
          body: def.body,
          variables: def.variables,
          isActive: true,
        },
        update: {
          name: def.name,
          module: def.module,
          subject: def.subject,
          body: def.body,
          variables: def.variables,
          isActive: true,
        },
      });
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

// POST /api/hr/mail-templates/:eventKey/test (Send live dynamic test email via Tenant SMTP)
hrMailTemplatesRouter.post(
  "/:eventKey/test",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const { toEmail, sampleValues } = req.body || {};
      if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(toEmail))) {
        return res.status(400).json({ error: "Please enter a valid recipient email address." });
      }

      const tpl = await prisma.tenantMailTemplate.findUnique({
        where: { tenantId_eventKey: { tenantId, eventKey: req.params.eventKey } },
      });
      if (!tpl) return res.status(404).json({ error: "Mail template not found." });

      const [tenant, emailSetting] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { name: true },
        }),
        prisma.setting.findFirst({
          where: {
            scope: "TENANT",
            scopeId: tenantId,
            group: "tenant_system_settings",
            key: "email",
          },
        }),
      ]);
      const emailCfg = (emailSetting?.valueJson as any) || {};

      if (!emailCfg.host) {
        return res
          .status(400)
          .json({ error: "SMTP is not configured yet. Please configure Email Settings first." });
      }

      const vals: Record<string, string> = {
        company_name: tenant?.name || "MasterHRMS",
        ...(sampleValues && typeof sampleValues === "object" ? sampleValues : {}),
      };
      const renderedSubject = interpolateTemplate(tpl.subject, vals);
      const renderedBody = interpolateTemplate(tpl.body, vals);

      const port = Number(emailCfg.port) || 587;
      const enc = String(emailCfg.encryption || "TLS").toUpperCase();
      const isSsl = enc === "SSL" || port === 465;
      const smtpUser = String(emailCfg.username || "").trim();
      const smtpPass = String(emailCfg.password || "").trim();
      const fromName = String(emailCfg.fromName || tenant?.name || "MasterHRMS").trim();
      const primaryFrom = String(emailCfg.fromAddress || smtpUser).trim();

      const transporter = nodemailer.createTransport({
        host: String(emailCfg.host).trim(),
        port,
        secure: isSsl,
        requireTLS: enc === "TLS" && !isSsl,
        auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
      });

      try {
        await transporter.sendMail({
          from: `"${fromName}" <${primaryFrom}>`,
          to: String(toEmail).trim(),
          subject: renderedSubject,
          text: renderedBody,
        });
      } catch (sendErr: any) {
        if (
          /550|5\.7\.1|relay|sender.*not allowed|SendAsDenied/i.test(String(sendErr?.message || "")) &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpUser)
        ) {
          await transporter.sendMail({
            from: `"${fromName}" <${smtpUser}>`,
            replyTo: primaryFrom,
            to: String(toEmail).trim(),
            subject: renderedSubject,
            text: renderedBody,
          });
        } else {
          throw sendErr;
        }
      }

      return res.json({ success: true, message: `Test template email sent to ${toEmail}.` });
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || "Failed to send test template email." });
    }
  }
);

// DELETE /api/hr/mail-templates/:eventKey (Only custom templates)
hrMailTemplatesRouter.delete("/:eventKey", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const isDefault = DEFAULT_HR_MAIL_TEMPLATES.some((t) => t.eventKey === req.params.eventKey);
    if (isDefault) {
      return res.status(400).json({ error: "Built-in HR templates cannot be deleted. You can disable or reset them." });
    }
    const existing = await prisma.tenantMailTemplate.findUnique({
      where: { tenantId_eventKey: { tenantId, eventKey: req.params.eventKey } },
    });
    if (!existing) return res.status(404).json({ error: "Mail template not found." });
    await prisma.tenantMailTemplate.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
