/**
 * MASTERHRMS — Authoritative Email Template Registry
 * ==================================================
 * Single source of truth for all system default email templates across:
 * - Express backend services (Calendar notifications, Todo notifications, Subscription lifecycle)
 * - Super Admin Email Templates management (/super/email-templates)
 * - Next.js CMS & TanStack client-side routing
 */

export type EmailTemplateCategory =
  | "Calendar"
  | "Tasks"
  | "Subscription"
  | "Invoices"
  | "Payroll"
  | "Onboarding"
  | "Security"
  | string;

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: EmailTemplateCategory;
  html_body: string;
  variables: string[];
}

export const SAMPLE_VARS: Record<string, string> = {
  // Calendar variables
  recipientName: "Alex Morgan",
  recipient_name: "Alex Morgan",
  eventTitle: "Quarterly Strategy Review & KPI Planning",
  event_title: "Quarterly Strategy Review & KPI Planning",
  eventDate: "Friday, October 24, 2026",
  event_date: "Friday, October 24, 2026",
  eventStartTime: "10:00 AM",
  event_start_time: "10:00 AM",
  eventEndTime: "11:30 AM",
  event_end_time: "11:30 AM",
  eventLocation: "Conference Room B / Google Meet",
  event_location: "Conference Room B / Google Meet",
  eventCategory: "Strategy",
  event_category: "Strategy",
  organizerName: "Sarah Jenkins",
  organizer_name: "Sarah Jenkins",
  eventDescription: "Reviewing Q3 business performance and aligning team targets for the upcoming quarter.",
  event_description: "Reviewing Q3 business performance and aligning team targets for the upcoming quarter.",
  reminderText: "Event starts in 1 hour",
  reminder_text: "Event starts in 1 hour",
  calendarUrl: "http://master.localhost:3000/hr/calendar",
  calendar_url: "http://master.localhost:3000/hr/calendar",

  // Tasks variables
  task_title: "Q4 Performance Benchmarking & Team Audit",
  taskTitle: "Q4 Performance Benchmarking & Team Audit",
  task_description: "Complete cross-department benchmarking analysis with assigned leads.",
  taskDescription: "Complete cross-department benchmarking analysis with assigned leads.",
  assigner_name: "Sarah Jenkins (HR Director)",
  assignerName: "Sarah Jenkins (HR Director)",
  assignee_name: "Alex Morgan",
  assigneeName: "Alex Morgan",
  priority: "High",
  start_date: "26 Oct 2026",
  startDate: "26 Oct 2026",
  due_date: "31 Oct 2026",
  dueDate: "31 Oct 2026",
  task_url: "http://master.localhost:3000/hr/todo?taskId=task-bench-402",
  taskUrl: "http://master.localhost:3000/hr/todo?taskId=task-bench-402",
  app_name: "Master HRMS & ERP",
  appName: "Master HRMS & ERP",

  // Subscription variables
  company_name: "Acme Global Solutions",
  tenant_name: "Acme Global Solutions",
  tenant_id: "ten_acme_891",
  plan_name: "Enterprise Tier",
  expiry_date: "Oct 18, 2026",
  days_remaining: "15",
  suspension_date: "Oct 3, 2026, 02:00 UTC",
  suspension_reason: "Billing cycle overdue beyond permitted grace period",
  support_email: "support@example.com",
  renewal_url: "https://example.com/subscription",
  admin_name: "Sarah Jenkins",
  user_name: "Sarah Jenkins",
  login_url: "https://example.com/auth",

  // Payroll & Onboarding
  employee_name: "Alex Morgan",
  month: "September 2026",
  net_pay: "$5,420.00",
  payslip_url: "https://example.com/payroll",

  // Invoices variables
  COMPANY_NAME: "Enterprise ERP Platform",
  COMPANY_ADDRESS: "Technology Park, Suite 400",
  CONTACT_NUMBER: "+1 (555) 019-2834",
  SUPPORT_EMAIL: "billing@example.com",
  INVOICE_NUMBER: "INV-2026-0042",
  INVOICE_DATE: "03 Oct 2026",
  TENANT_NAME: "Acme Cloud Corp",
  TENANT_EMAIL: "admin@acmecloud.com",
  PAYMENT_METHOD: "Razorpay (UPI / NetBanking)",
  RAZORPAY_PAYMENT_ID: "pay_Oz92B450Kx71",
  PAYMENT_STATUS: "PAID",
  PLAN_NAME: "Growth Enterprise Plan",
  PLAN_DESCRIPTION: "Complete 16-Module HRM Suite, Advanced Accounting, CRM & 500+ Ecosystem Addons",
  SUBTOTAL: "₹3,990.00",
  TAX_AMOUNT: "₹718.20",
  TOTAL_AMOUNT: "₹4,708.20",

  // Security variables
  reset_url: "https://example.com/auth?mode=reset&token=sec_tok_9918bc42",
  expiry_minutes: "60",
};

export const AUTHORITATIVE_EMAIL_TEMPLATES: EmailTemplate[] = [
  // ── 1. CALENDAR ────────────────────────────────────────────────────────────
  {
    id: "calendar-event-notification",
    name: "Calendar Event & Reminder Notification",
    subject: "Calendar Event: {{eventTitle}}",
    category: "Calendar",
    variables: [
      "{{recipientName}}",
      "{{eventTitle}}",
      "{{eventDate}}",
      "{{eventStartTime}}",
      "{{eventEndTime}}",
      "{{eventLocation}}",
      "{{eventCategory}}",
      "{{organizerName}}",
      "{{eventDescription}}",
      "{{reminderText}}",
      "{{calendarUrl}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 24px 32px; background: #0f172a; text-align: left;">
        <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 700;">MASTERHRMS Calendar</h1>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Event Schedule & Reminder</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 18px;">Hello {{recipientName}},</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          {{reminderText}}
        </p>
        <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 18px; border-radius: 6px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 16px;">{{eventTitle}}</h3>
          <table width="100%" style="font-size: 13px; color: #334155;">
            <tr><td style="padding: 4px 0; font-weight: 600; width: 110px;">Date:</td><td>{{eventDate}}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Time:</td><td>{{eventStartTime}} - {{eventEndTime}}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Category:</td><td>{{eventCategory}}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Location:</td><td>{{eventLocation}}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Organizer:</td><td>{{organizerName}}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Description:</td><td>{{eventDescription}}</td></tr>
          </table>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="{{calendarUrl}}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Open in Calendar →</a>
        </div>
        <p style="color: #94a3b8; font-size: 11px; margin: 0; text-align: center;">This is an automated notification from Master HRMS. Please do not reply directly.</p>
      </td>
    </tr>
  </table>
</body></html>`,
  },

  // ── 2. TASKS ───────────────────────────────────────────────────────────────
  {
    id: "todo-task-created",
    name: "Task Created — New Task Assigned",
    subject: "New Task Assigned: {{task_title}}",
    category: "Tasks",
    variables: [
      "{{assignee_name}}",
      "{{task_title}}",
      "{{task_description}}",
      "{{assigner_name}}",
      "{{priority}}",
      "{{start_date}}",
      "{{due_date}}",
      "{{task_url}}",
      "{{app_name}}",
      "{{company_name}}",
      "{{support_email}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 24px 32px; background: #0f172a; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">{{app_name}}</h1>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Action Item Notification</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 18px;">Hello {{assignee_name}},</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          A new actionable deliverable has been assigned to you by <strong>{{assigner_name}}</strong>:
        </p>
        <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 18px; border-radius: 6px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px;">{{task_title}}</h3>
          <table width="100%" style="font-size: 13px; color: #475569;">
            <tr><td style="padding: 4px 0; width: 110px; font-weight: 600;">Priority:</td><td><span style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">{{priority}}</span></td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Start Date:</td><td>{{start_date}}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Due Date:</td><td><strong>{{due_date}}</strong></td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Assigner:</td><td>{{assigner_name}}</td></tr>
          </table>
          <p style="margin: 12px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">{{task_description}}</p>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="{{task_url}}" style="background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Open Task in Workspace →</a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0 0; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          This is an automated notification from {{company_name}}. Need help? Contact <a href="mailto:{{support_email}}" style="color: #6366f1; text-decoration: none;">{{support_email}}</a>.
        </p>
      </td>
    </tr>
  </table>
</body></html>`,
  },
  {
    id: "todo-task-assigned",
    name: "Task Reassigned / Additional Assignment",
    subject: "Task Assigned: {{task_title}}",
    category: "Tasks",
    variables: [
      "{{assignee_name}}",
      "{{task_title}}",
      "{{task_description}}",
      "{{assigner_name}}",
      "{{priority}}",
      "{{due_date}}",
      "{{task_url}}",
      "{{app_name}}",
      "{{company_name}}",
      "{{support_email}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 24px 32px; background: #0f172a; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">{{app_name}}</h1>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Task Assignment Update</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 18px;">Hello {{assignee_name}},</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          You have been added as an assignee to the following task by <strong>{{assigner_name}}</strong>:
        </p>
        <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 18px; border-radius: 6px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px;">{{task_title}}</h3>
          <table width="100%" style="font-size: 13px; color: #475569;">
            <tr><td style="padding: 4px 0; width: 110px; font-weight: 600;">Priority:</td><td><span style="background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">{{priority}}</span></td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Due Date:</td><td><strong>{{due_date}}</strong></td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Assigner:</td><td>{{assigner_name}}</td></tr>
          </table>
          <p style="margin: 12px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">{{task_description}}</p>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="{{task_url}}" style="background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">View Assigned Task →</a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0 0; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          This is an automated notification from {{company_name}}. Need help? Contact <a href="mailto:{{support_email}}" style="color: #3b82f6; text-decoration: none;">{{support_email}}</a>.
        </p>
      </td>
    </tr>
  </table>
</body></html>`,
  },
  {
    id: "todo-task-reminder-2-days",
    name: "Task Reminder — Due in 2 Days",
    subject: "Reminder: Task due in 2 days — {{task_title}}",
    category: "Tasks",
    variables: [
      "{{assignee_name}}",
      "{{task_title}}",
      "{{task_description}}",
      "{{assigner_name}}",
      "{{priority}}",
      "{{due_date}}",
      "{{task_url}}",
      "{{app_name}}",
      "{{company_name}}",
      "{{support_email}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 24px 32px; background: #0f172a; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">{{app_name}}</h1>
        <p style="color: #f59e0b; margin: 4px 0 0 0; font-size: 13px; font-weight: 600;">Upcoming Deadline — Due in 2 Days</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 18px;">Hello {{assignee_name}},</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          This is an automated courtesy reminder that your assigned task is due in <strong>2 days</strong> on <strong>{{due_date}}</strong>:
        </p>
        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 18px; border-radius: 6px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">{{task_title}}</h3>
          <table width="100%" style="font-size: 13px; color: #78350f;">
            <tr><td style="padding: 4px 0; width: 110px; font-weight: 600;">Target Due:</td><td><strong>{{due_date}}</strong></td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Priority:</td><td>{{priority}}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Assigner:</td><td>{{assigner_name}}</td></tr>
          </table>
          <p style="margin: 12px 0 0 0; font-size: 13px; color: #92400e; line-height: 1.5;">{{task_description}}</p>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="{{task_url}}" style="background: #f59e0b; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Review & Complete Task →</a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0 0; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          This is an automated notification from {{company_name}}. Need help? Contact <a href="mailto:{{support_email}}" style="color: #f59e0b; text-decoration: none;">{{support_email}}</a>.
        </p>
      </td>
    </tr>
  </table>
</body></html>`,
  },
  {
    id: "todo-task-reminder-1-day",
    name: "Task Reminder — Due Tomorrow",
    subject: "Urgent Reminder: Task due tomorrow — {{task_title}}",
    category: "Tasks",
    variables: [
      "{{assignee_name}}",
      "{{task_title}}",
      "{{task_description}}",
      "{{assigner_name}}",
      "{{priority}}",
      "{{due_date}}",
      "{{task_url}}",
      "{{app_name}}",
      "{{company_name}}",
      "{{support_email}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 24px 32px; background: #0f172a; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">{{app_name}}</h1>
        <p style="color: #ef4444; margin: 4px 0 0 0; font-size: 13px; font-weight: 700;">CRITICAL: Due Tomorrow (1 Day Remaining)</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 18px;">Hello {{assignee_name}},</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          Your assigned task is due <strong>tomorrow</strong> on <strong>{{due_date}}</strong>. Please ensure all deliverables and checklists are finalized:
        </p>
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 18px; border-radius: 6px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; color: #991b1b; font-size: 16px;">{{task_title}}</h3>
          <table width="100%" style="font-size: 13px; color: #991b1b;">
            <tr><td style="padding: 4px 0; width: 110px; font-weight: 600;">Due Tomorrow:</td><td><strong>{{due_date}}</strong></td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Priority:</td><td><strong style="color: #dc2626;">{{priority}}</strong></td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Assigner:</td><td>{{assigner_name}}</td></tr>
          </table>
          <p style="margin: 12px 0 0 0; font-size: 13px; color: #7f1d1d; line-height: 1.5;">{{task_description}}</p>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="{{task_url}}" style="background: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Complete Task Now →</a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0 0; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          This is an automated notification from {{company_name}}. Need help? Contact <a href="mailto:{{support_email}}" style="color: #ef4444; text-decoration: none;">{{support_email}}</a>.
        </p>
      </td>
    </tr>
  </table>
</body></html>`,
  },

  // ── 3. SUBSCRIPTION LIFECYCLE (10 TEMPLATES) ───────────────────────────────
  {
    id: "subscription-reminder-15d",
    name: "Subscription Expiry — 15 Days",
    subject: "Reminder: {{company_name}} subscription expires in 15 days",
    category: "Subscription",
    variables: [
      "{{company_name}}",
      "{{tenant_name}}",
      "{{tenant_id}}",
      "{{plan_name}}",
      "{{expiry_date}}",
      "{{days_remaining}}",
      "{{support_email}}",
      "{{renewal_url}}",
      "{{admin_name}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 28px 32px; background: #0f172a; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Master HRMS & ERP</h1>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Subscription Expiry Reminder</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Hello {{admin_name}},</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          This is an automated courtesy reminder that your subscription for company <strong>{{company_name}}</strong> (Plan: <strong>{{plan_name}}</strong>) is scheduled to expire in <strong>15 days</strong> on <strong>{{expiry_date}}</strong>.
        </p>
        <div style="background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
          <table width="100%" style="font-size: 13px; color: #334155;">
            <tr><td style="padding: 3px 0; font-weight: 600;">Workspace:</td><td>{{company_name}} ({{tenant_id}})</td></tr>
            <tr><td style="padding: 3px 0; font-weight: 600;">Current Tier:</td><td>{{plan_name}}</td></tr>
            <tr><td style="padding: 3px 0; font-weight: 600;">Expiry Date:</td><td>{{expiry_date}}</td></tr>
            <tr><td style="padding: 3px 0; font-weight: 600;">Days Remaining:</td><td>15 Days</td></tr>
          </table>
        </div>
        <div style="text-align: center; margin-bottom: 28px;">
          <a href="{{renewal_url}}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Renew Subscription Now →</a>
        </div>
        <p style="color: #64748b; font-size: 12px; margin: 0;">Support: <a href="mailto:{{support_email}}" style="color: #2563eb;">{{support_email}}</a></p>
      </td>
    </tr>
  </table>
</body></html>`,
  },
  {
    id: "subscription-reminder-10d",
    name: "Subscription Expiry — 10 Days",
    subject: "Reminder: {{company_name}} subscription expires in 10 days",
    category: "Subscription",
    variables: [
      "{{company_name}}",
      "{{tenant_id}}",
      "{{plan_name}}",
      "{{expiry_date}}",
      "{{days_remaining}}",
      "{{renewal_url}}",
      "{{admin_name}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #0f172a; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">10-Day Expiry Notice</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Notice for {{admin_name}},</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your workspace <strong>{{company_name}}</strong> has <strong>10 days remaining</strong> on its current <strong>{{plan_name}}</strong> subscription. It will expire on <strong>{{expiry_date}}</strong>.
      </p>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Renew Subscription →</a></div>
      <p style="color: #64748b; font-size: 12px; margin: 0;">Need help? Contact <a href="mailto:{{support_email}}" style="color: #2563eb;">{{support_email}}</a>.</p>
    </td></tr>
  </table>
</body></html>`,
  },
  {
    id: "subscription-reminder-5d",
    name: "Subscription Expiry — 5 Days",
    subject: "Important: Only 5 days remaining for {{company_name}} subscription",
    category: "Subscription",
    variables: [
      "{{company_name}}",
      "{{tenant_id}}",
      "{{plan_name}}",
      "{{expiry_date}}",
      "{{days_remaining}}",
      "{{renewal_url}}",
      "{{admin_name}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #fed7aa; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #ea580c; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #ffedd5; margin: 4px 0 0 0; font-size: 13px;">5 Days Remaining Notice</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Action Recommended, {{admin_name}}</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your subscription for <strong>{{company_name}}</strong> will expire in <strong>5 days</strong> on <strong>{{expiry_date}}</strong>.
      </p>
      <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 14px; margin-bottom: 20px; font-size: 13px; color: #9a3412;">
        When your subscription reaches expiration, workspace access for all company administrators and employees will be locked.
      </div>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #ea580c; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Renew Plan Now →</a></div>
    </td></tr>
  </table>
</body></html>`,
  },
  {
    id: "subscription-reminder-3d",
    name: "Subscription Expiry — 3 Days",
    subject: "Urgent: Only 3 days left for {{company_name}} subscription",
    category: "Subscription",
    variables: [
      "{{company_name}}",
      "{{plan_name}}",
      "{{expiry_date}}",
      "{{days_remaining}}",
      "{{renewal_url}}",
      "{{admin_name}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #fca5a5; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #dc2626; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #fee2e2; margin: 4px 0 0 0; font-size: 13px;">Critical 3-Day Expiry Notice</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Critical: 3 Days Remaining</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Hello {{admin_name}}, your workspace <strong>{{company_name}}</strong> will expire on <strong>{{expiry_date}}</strong> (3 days remaining).
      </p>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Renew Plan Immediately →</a></div>
    </td></tr>
  </table>
</body></html>`,
  },
  {
    id: "subscription-reminder-2d",
    name: "Subscription Expiry — 2 Days",
    subject: "Urgent: 2 days left before {{company_name}} subscription expires",
    category: "Subscription",
    variables: [
      "{{company_name}}",
      "{{plan_name}}",
      "{{expiry_date}}",
      "{{days_remaining}}",
      "{{renewal_url}}",
      "{{admin_name}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #fca5a5; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #b91c1c; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #fee2e2; margin: 4px 0 0 0; font-size: 13px;">Final Notice: 2 Days Left</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">2 Days Remaining, {{admin_name}}</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your workspace <strong>{{company_name}}</strong> has 2 days remaining before expiration on <strong>{{expiry_date}}</strong>.
      </p>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #b91c1c; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Renew Plan Now →</a></div>
    </td></tr>
  </table>
</body></html>`,
  },
  {
    id: "subscription-reminder-1d",
    name: "Subscription Expiry — 1 Day",
    subject: "Final Notice: {{company_name}} subscription expires tomorrow",
    category: "Subscription",
    variables: [
      "{{company_name}}",
      "{{plan_name}}",
      "{{expiry_date}}",
      "{{days_remaining}}",
      "{{renewal_url}}",
      "{{admin_name}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #991b1b; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #991b1b; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #fee2e2; margin: 4px 0 0 0; font-size: 13px;">Final Expiry Reminder — 24 Hours Remaining</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Action Required Today, {{admin_name}}</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your workspace <strong>{{company_name}}</strong> subscription expires <strong>tomorrow ({{expiry_date}})</strong>. Once expired, access to your HRMS dashboard and employee features will be locked.
      </p>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #991b1b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">Renew Immediately to Prevent Lockout →</a></div>
    </td></tr>
  </table>
</body></html>`,
  },
  {
    id: "subscription-expired",
    name: "Subscription Expired",
    subject: "Alert: {{company_name}} subscription has expired",
    category: "Subscription",
    variables: [
      "{{company_name}}",
      "{{tenant_id}}",
      "{{plan_name}}",
      "{{expiry_date}}",
      "{{renewal_url}}",
      "{{support_email}}",
      "{{admin_name}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #7f1d1d; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #fca5a5; margin: 4px 0 0 0; font-size: 13px;">Subscription Status: EXPIRED</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Subscription Expired, {{admin_name}}</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        The subscription for <strong>{{company_name}}</strong> expired on <strong>{{expiry_date}}</strong>. Workspace services are now operating in restricted mode.
      </p>
      <div style="text-align: center; margin: 28px 0;"><a href="{{renewal_url}}" style="background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Reactivate Workspace Now →</a></div>
    </td></tr>
  </table>
</body></html>`,
  },
  {
    id: "tenant-account-suspended",
    name: "Account Suspended",
    subject: "Critical: {{company_name}} workspace has been suspended",
    category: "Subscription",
    variables: [
      "{{company_name}}",
      "{{tenant_id}}",
      "{{suspension_date}}",
      "{{suspension_reason}}",
      "{{support_email}}",
      "{{renewal_url}}",
      "{{admin_name}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #ef4444; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #450a0a; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #f87171; margin: 4px 0 0 0; font-size: 13px;">ACCOUNT SUSPENDED</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Workspace Suspended</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Access to workspace <strong>{{company_name}}</strong> has been temporarily suspended effective <strong>{{suspension_date}}</strong>.
      </p>
      <p style="color: #64748b; font-size: 13px;">Reason: <em>{{suspension_reason}}</em></p>
      <div style="text-align: center; margin: 28px 0;"><a href="{{renewal_url}}" style="background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Resolve Suspension →</a></div>
    </td></tr>
  </table>
</body></html>`,
  },
  {
    id: "tenant-account-reactivated",
    name: "Account Reactivated",
    subject: "Workspace Reactivated: Welcome back to {{company_name}}",
    category: "Subscription",
    variables: [
      "{{company_name}}",
      "{{tenant_id}}",
      "{{plan_name}}",
      "{{login_url}}",
      "{{admin_name}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #86efac; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #064e3b; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #86efac; margin: 4px 0 0 0; font-size: 13px;">Account Reactivated Successfully</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Welcome Back, {{admin_name}}!</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your workspace <strong>{{company_name}}</strong> has been reactivated. All team members can now resume normal operations under plan <strong>{{plan_name}}</strong>.
      </p>
      <div style="text-align: center; margin: 28px 0;"><a href="{{login_url}}" style="background: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Sign In to Workspace →</a></div>
    </td></tr>
  </table>
</body></html>`,
  },
  {
    id: "subscription-renewed",
    name: "Subscription Renewed Successfully",
    subject: "Receipt: {{company_name}} subscription renewed successfully",
    category: "Subscription",
    variables: [
      "{{company_name}}",
      "{{plan_name}}",
      "{{expiry_date}}",
      "{{admin_name}}",
      "{{support_email}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #0f172a; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #38bdf8; margin: 4px 0 0 0; font-size: 13px;">Payment Confirmed</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Thank You, {{admin_name}}!</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        We have received your renewal payment for company <strong>{{company_name}}</strong>. Your <strong>{{plan_name}}</strong> subscription is now extended through <strong>{{expiry_date}}</strong>.
      </p>
    </td></tr>
  </table>
</body></html>`,
  },

  // ── 4. GENERAL, ONBOARDING, PAYROLL, SECURITY ─────────────────────────────
  {
    id: "et-1",
    name: "Welcome to Master HRMS",
    subject: "Welcome to {{company_name}}!",
    category: "Onboarding",
    variables: [
      "{{user_name}}",
      "{{company_name}}",
      "{{login_url}}",
      "{{support_email}}",
    ],
    html_body: `<div style="font-family: sans-serif; padding: 20px;">
  <h2>Welcome to {{company_name}}, {{user_name}}!</h2>
  <p>Your account is ready. Access your workspace portal below:</p>
  <a href="{{login_url}}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Log In</a>
</div>`,
  },
  {
    id: "et-2",
    name: "Monthly Payslip Generated",
    subject: "Your Payslip for {{month}} is Ready",
    category: "Payroll",
    variables: [
      "{{employee_name}}",
      "{{month}}",
      "{{net_pay}}",
      "{{payslip_url}}",
    ],
    html_body: `<div style="font-family: sans-serif; padding: 20px;">
  <h2>Payslip for {{month}}</h2>
  <p>Dear {{employee_name}}, your payslip of {{net_pay}} has been processed and is ready for download.</p>
  <a href="{{payslip_url}}" style="display:inline-block;padding:10px 20px;background:#16a34a;color:#fff;border-radius:6px;text-decoration:none;">View Payslip</a>
</div>`,
  },
  {
    id: "PASSWORD_RESET",
    name: "Password Reset Security Code",
    subject: "Reset your Master HRMS password",
    category: "Security",
    variables: [
      "{{user_name}}",
      "{{reset_url}}",
      "{{expiry_minutes}}",
      "{{support_email}}",
    ],
    html_body: `<div style="font-family: sans-serif; padding: 24px; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
  <p>Hello {{user_name}},</p>
  <p>We received a request to reset your password. Click the link below to set a new password. This link expires in {{expiry_minutes}} minutes.</p>
  <div style="margin: 24px 0;">
    <a href="{{reset_url}}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
  </div>
  <p style="color: #64748b; font-size: 13px;">If you did not request this, please contact <a href="mailto:{{support_email}}">{{support_email}}</a> immediately.</p>
</div>`,
  },

  // ── 5. INVOICES (5 TEMPLATES) ──────────────────────────────────────────────
  {
    id: "tpl-classic",
    name: "Classic Corporate Invoice",
    subject: "Invoice {{INVOICE_NUMBER}} from {{COMPANY_NAME}}",
    category: "Invoices",
    variables: [
      "{{COMPANY_NAME}}",
      "{{COMPANY_ADDRESS}}",
      "{{CONTACT_NUMBER}}",
      "{{SUPPORT_EMAIL}}",
      "{{INVOICE_NUMBER}}",
      "{{INVOICE_DATE}}",
      "{{TENANT_NAME}}",
      "{{TENANT_EMAIL}}",
      "{{PLAN_NAME}}",
      "{{PLAN_DESCRIPTION}}",
      "{{SUBTOTAL}}",
      "{{TAX_AMOUNT}}",
      "{{TOTAL_AMOUNT}}",
      "{{PAYMENT_STATUS}}",
      "{{PAYMENT_METHOD}}",
    ],
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 8px;">
  <table width="100%" style="margin-bottom: 25px;">
    <tr>
      <td><h2 style="margin:0; color:#1e293b;">{{COMPANY_NAME}}</h2><p style="margin:4px 0 0 0; color:#64748b; font-size:12px;">{{COMPANY_ADDRESS}}</p></td>
      <td style="text-align: right;"><h1 style="margin:0; color:#0f172a; font-size:24px;">INVOICE</h1><p style="margin:4px 0 0 0; font-weight:bold; color:#475569;">#{{INVOICE_NUMBER}}</p><p style="margin:2px 0 0 0; color:#94a3b8; font-size:12px;">Date: {{INVOICE_DATE}}</p></td>
    </tr>
  </table>
  <div style="background:#f8fafc; padding:15px; border-radius:6px; margin-bottom:20px;">
    <strong style="font-size:11px; text-transform:uppercase; color:#64748b;">Billed To:</strong>
    <p style="margin:4px 0 0 0; font-size:14px; font-weight:bold; color:#1e293b;">{{TENANT_NAME}}</p>
    <p style="margin:2px 0 0 0; font-size:12px; color:#475569;">{{TENANT_EMAIL}}</p>
  </div>
  <table width="100%" style="border-collapse: collapse; margin-bottom: 20px;">
    <thead><tr style="background:#f1f5f9; color:#475569; font-size:12px; text-align:left;"><th style="padding:10px;">Item & Description</th><th style="padding:10px; text-align:right;">Amount</th></tr></thead>
    <tbody><tr><td style="padding:12px 10px; border-bottom:1px solid #e2e8f0;"><strong>{{PLAN_NAME}}</strong><div style="font-size:11px; color:#64748b; margin-top:2px;">{{PLAN_DESCRIPTION}}</div></td><td style="padding:12px 10px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:bold;">{{SUBTOTAL}}</td></tr></tbody>
    <tfoot>
      <tr><td style="padding:8px 10px; text-align:right; font-size:12px; color:#64748b;">Tax (GST):</td><td style="padding:8px 10px; text-align:right; font-size:12px;">{{TAX_AMOUNT}}</td></tr>
      <tr style="font-size:15px; font-weight:bold; color:#0f172a;"><td style="padding:10px; text-align:right;">Total:</td><td style="padding:10px; text-align:right;">{{TOTAL_AMOUNT}}</td></tr>
    </tfoot>
  </table>
  <div style="padding:12px; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:6px; font-size:12px; color:#065f46;">Payment Status: <strong>{{PAYMENT_STATUS}}</strong> via {{PAYMENT_METHOD}}</div>
</div>`,
  },
  {
    id: "tpl-modern-gradient",
    name: "Modern Gradient Invoice",
    subject: "Your Invoice {{INVOICE_NUMBER}} from {{COMPANY_NAME}}",
    category: "Invoices",
    variables: [
      "{{COMPANY_NAME}}",
      "{{INVOICE_NUMBER}}",
      "{{INVOICE_DATE}}",
      "{{TENANT_NAME}}",
      "{{PLAN_NAME}}",
      "{{TOTAL_AMOUNT}}",
      "{{PAYMENT_STATUS}}",
    ],
    html_body: `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; color: #ffffff;">
    <h1 style="margin:0; font-size:24px;">{{COMPANY_NAME}}</h1>
    <p style="margin:6px 0 0 0; opacity:0.85; font-size:13px;">Official Tax Invoice #{{INVOICE_NUMBER}}</p>
  </div>
  <div style="padding: 32px;">
    <div style="display:flex; justify-content:space-between; margin-bottom:24px;">
      <div><span style="font-size:11px; color:#64748b; text-transform:uppercase;">Customer</span><h3 style="margin:2px 0 0 0; font-size:16px;">{{TENANT_NAME}}</h3></div>
      <div style="text-align:right;"><span style="font-size:11px; color:#64748b; text-transform:uppercase;">Date</span><p style="margin:2px 0 0 0; font-size:13px; font-weight:bold;">{{INVOICE_DATE}}</p></div>
    </div>
    <div style="background:#f8fafc; border-radius:8px; padding:20px; margin-bottom:24px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:12px;"><strong>{{PLAN_NAME}}</strong><strong style="color:#4f46e5;">{{TOTAL_AMOUNT}}</strong></div>
      <p style="margin:0; font-size:12px; color:#64748b;">Paid via Razorpay. Status: <span style="color:#16a34a; font-weight:bold;">{{PAYMENT_STATUS}}</span></p>
    </div>
  </div>
</div>`,
  },
  {
    id: "tpl-monochrome",
    name: "Minimal Monochrome Invoice",
    subject: "Receipt #{{INVOICE_NUMBER}} - {{COMPANY_NAME}}",
    category: "Invoices",
    variables: [
      "{{COMPANY_NAME}}",
      "{{INVOICE_NUMBER}}",
      "{{INVOICE_DATE}}",
      "{{TENANT_NAME}}",
      "{{TOTAL_AMOUNT}}",
    ],
    html_body: `<div style="font-family: monospace; max-width: 550px; margin: auto; padding: 24px; border: 2px solid #000; color: #000;">
  <h2 style="margin:0; text-transform:uppercase; border-bottom:2px solid #000; padding-bottom:8px;">{{COMPANY_NAME}}</h2>
  <p style="margin:12px 0; font-size:13px;">INVOICE: #{{INVOICE_NUMBER}} | DATE: {{INVOICE_DATE}}</p>
  <p style="margin:12px 0; font-size:13px;">BILLED TO: {{TENANT_NAME}}</p>
  <div style="border-top:1px dashed #000; border-bottom:1px dashed #000; padding:12px 0; margin:16px 0; display:flex; justify-content:space-between;">
    <span>TOTAL PAID:</span><strong>{{TOTAL_AMOUNT}}</strong>
  </div>
  <p style="font-size:11px; text-align:center; margin:16px 0 0 0;">*** THANK YOU FOR YOUR SUBSCRIPTION ***</p>
</div>`,
  },
  {
    id: "tpl-indigo-pro",
    name: "Indigo Professional Invoice",
    subject: "Invoice {{INVOICE_NUMBER}}",
    category: "Invoices",
    variables: [
      "{{COMPANY_NAME}}",
      "{{INVOICE_NUMBER}}",
      "{{INVOICE_DATE}}",
      "{{TENANT_NAME}}",
      "{{PLAN_NAME}}",
      "{{TOTAL_AMOUNT}}",
    ],
    html_body: `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 620px; margin: auto; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
  <div style="background:#1e1b4b; padding:24px 30px; display:flex; justify-content:space-between; align-items:center;">
    <h2 style="margin:0; color:#e0e7ff; font-size:20px;">{{COMPANY_NAME}}</h2>
    <span style="background:#3730a3; color:#ffffff; font-size:11px; padding:4px 12px; border-radius:12px; font-weight:bold;">PAID</span>
  </div>
  <div style="padding:28px 30px;">
    <p style="font-size:13px; color:#64748b; margin:0 0 4px 0;">Invoice to <strong>{{TENANT_NAME}}</strong></p>
    <p style="font-size:12px; color:#94a3b8; margin:0 0 20px 0;">Date: {{INVOICE_DATE}} | Invoice #: {{INVOICE_NUMBER}}</p>
    <div style="border-top:2px solid #e0e7ff; border-bottom:2px solid #e0e7ff; padding:16px 0; margin-bottom:20px; display:flex; justify-content:space-between;">
      <span style="font-weight:600; color:#1e1b4b;">{{PLAN_NAME}}</span>
      <span style="font-weight:700; color:#1e1b4b; font-size:16px;">{{TOTAL_AMOUNT}}</span>
    </div>
  </div>
</div>`,
  },
  {
    id: "tpl-compact-gst",
    name: "Compact GST & Tax Invoice",
    subject: "GST Tax Invoice - {{INVOICE_NUMBER}}",
    category: "Invoices",
    variables: [
      "{{COMPANY_NAME}}",
      "{{INVOICE_NUMBER}}",
      "{{INVOICE_DATE}}",
      "{{TENANT_NAME}}",
      "{{PLAN_NAME}}",
      "{{PLAN_DESCRIPTION}}",
      "{{SUBTOTAL}}",
      "{{TAX_AMOUNT}}",
      "{{TOTAL_AMOUNT}}",
    ],
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 580px; margin: auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px;">
  <div style="text-align:center; border-bottom:1px solid #000; padding-bottom:10px; margin-bottom:15px;">
    <h3 style="margin:0; text-transform:uppercase;">{{COMPANY_NAME}}</h3>
    <p style="margin:2px 0 0 0; color:#64748b;">TAX INVOICE / CASH MEMO</p>
  </div>
  <table width="100%" style="margin-bottom:15px;">
    <tr><td><strong>Inv No:</strong> {{INVOICE_NUMBER}}</td><td style="text-align:right;"><strong>Date:</strong> {{INVOICE_DATE}}</td></tr>
    <tr><td colspan="2"><strong>Customer:</strong> {{TENANT_NAME}}</td></tr>
  </table>
  <table width="100%" style="border-collapse: collapse; margin-bottom: 15px;">
    <thead><tr style="background:#f1f5f9; border-top:1px solid #000; border-bottom:1px solid #000;"><th style="text-align:left; padding:4px;">Item</th><th style="text-align:right; padding:4px;">Tax</th><th style="text-align:right; padding:4px;">Total</th></tr></thead>
    <tbody><tr><td style="padding:6px 4px;"><strong>{{PLAN_NAME}}</strong><br/><span style="font-size:10px; color:#64748b;">{{PLAN_DESCRIPTION}}</span></td><td style="text-align:right; padding:6px 4px;">{{TAX_AMOUNT}}</td><td style="text-align:right; padding:6px 4px; font-weight:bold;">{{TOTAL_AMOUNT}}</td></tr></tbody>
  </table>
</div>`,
  },
];

/**
 * Returns a cloned copy of the 23 authoritative email templates.
 */
export function getAuthoritativeTemplates(): EmailTemplate[] {
  return JSON.parse(JSON.stringify(AUTHORITATIVE_EMAIL_TEMPLATES));
}

/**
 * Merges persisted templates from the database with built-in authoritative templates.
 * - Stable ID matching ensures zero duplicates.
 * - Preserves administrator customizations for existing templates.
 * - Non-destructively restores missing authoritative templates (e.g. Tasks, Calendar).
 * - Preserves any custom templates added by administrators.
 */
export function mergeWithPersistedTemplates(persistedList: EmailTemplate[] = []): EmailTemplate[] {
  const persistedMap = new Map<string, EmailTemplate>();
  for (const t of persistedList) {
    if (t && t.id) {
      persistedMap.set(t.id, t);
    }
  }

  const result: EmailTemplate[] = [];

  // 1. Maintain authoritative template order, using persisted customizations if present
  for (const def of AUTHORITATIVE_EMAIL_TEMPLATES) {
    if (persistedMap.has(def.id)) {
      result.push(persistedMap.get(def.id)!);
      persistedMap.delete(def.id);
    } else {
      result.push(def);
    }
  }

  // 2. Append any extra custom templates created by administrators
  for (const custom of persistedMap.values()) {
    result.push(custom);
  }

  return result;
}

/**
 * Safely substitutes template variables with values from a provided dictionary.
 */
export function substituteTemplateVars(template: string, vars: Record<string, string>): string {
  if (!template) return "";
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    const reg = new RegExp(`{{${k}}}`, "g");
    out = out.replace(reg, v ?? "");
  }
  return out;
}
