import { HR_EMAIL_TEMPLATES, type EmailTemplate } from "./hr-email-templates";
import { UNIVERSAL_CORE_TENANT_TEMPLATES } from "./core-universal-templates";

export type { EmailTemplate };

export const TENANT_EMAIL_CATEGORIES = ["HR", "Calendar", "Tasks", "Invoices", "Payroll"] as const;

export const TENANT_SAMPLE_VARS: Record<string, string> = {
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
  employee_name: "Alex Morgan",
  month: "September 2026",
  net_pay: "$5,420.00",
  payslip_url: "https://example.com/payroll",
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
  reset_url: "https://example.com/auth?mode=reset&token=sec_tok_9918bc42",
  expiry_minutes: "60",
  recipientName: "Alex Morgan",
  eventTitle: "Quarterly Strategy Review & KPI Planning",
  eventDate: "Friday, October 24, 2026",
  eventStartTime: "10:00 AM",
  eventEndTime: "11:30 AM",
  eventLocation: "Conference Room B / Google Meet",
  eventCategory: "Strategy",
  organizerName: "Sarah Jenkins",
  eventDescription: "Reviewing Q3 business performance and aligning team targets for the upcoming quarter.",
  reminderText: "Event starts in 1 hour",
  calendarUrl: "/calendar",
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
  task_url: "/hr/todo?taskId=task-bench-402",
  taskUrl: "/hr/todo?taskId=task-bench-402",
  app_name: "Master HRMS & ERP",
  appName: "Master HRMS & ERP",
  // HR Workflow Email Template Sample Variables
  employee_code: "EMP-1024",
  employee_email: "alex.morgan@company.com",
  candidate_name: "Priya Sharma",
  recipient_name: "HR Manager",
  user_email: "alex.morgan@company.com",
  role_name: "HR Executive",
  portal_url: "https://app.masterhrms.com",
  document_title: "Employee Code of Conduct 2026",
  document_category: "Compliance Documents",
  assigned_by: "Sarah Jenkins",
  note: "Please review and acknowledge before the due date.",
  award_type: "Employee of the Quarter",
  award_date: "2026-11-25",
  award_gift: "Trophy + Gift Voucher",
  award_description: "For exceptional leadership and timely project delivery.",
  job_title: "Senior Full-Stack Engineer",
  status: "Approved",
  stage: "Technical Interview",
  updated_date: "2026-11-25",
  remarks: "Proceeding to the next step.",
  complaint_id: "CMP-204",
  complaint_title: "Shift Allocation Concern",
  submitted_by: "Elena Rostova",
  against_employee: "Operations Desk",
  complaint_date: "2026-11-25",
  description: "Detailed summary logged in HR portal.",
  contract_number: "EMP-2026-1105",
  contract_type: "Permanent Full-time",
  end_date: "2028-11-30",
  salary: "₹12,00,000.00",
  updated_by: "HR Admin",
  department: "Engineering",
  designation: "Software Engineer",
  branch: "Headquarters",
  joining_date: "2026-12-01",
  from_branch: "Chennai Branch",
  from_department: "Support",
  to_branch: "Bengaluru HQ",
  to_department: "Engineering",
  transfer_date: "2026-12-15",
  reason: "Role progression and team alignment",
  interview_date: "2026-11-28",
  interview_time: "11:00 AM",
  interviewer_name: "Marcus Vance",
  location: "Zoom Video Call",
  meeting_link: "https://meet.masterhrms.com/m/abc-123",
  feedback: "Strong technical and communication skills.",
  application_id: "APP-8842",
  applied_date: "2026-11-24",
  leave_type: "Annual Leave",
  total_days: "3",
  approver_name: "Sarah Jenkins",
  offered_salary: "₹15,00,000.00",
  pay_period: "November 2026",
  pay_date: "2026-11-30",
  net_salary: "₹95,000.00",
  previous_designation: "Software Engineer",
  new_designation: "Senior Software Engineer",
  promotion_date: "2026-12-01",
  salary_adjustment: "+15%",
  resignation_date: "2026-11-25",
  last_working_day: "2026-12-25",
  termination_type: "Voluntary / Mutual",
  notice_date: "2026-11-25",
  termination_date: "2026-12-15",
  trip_purpose: "Annual Client Summit",
  destination: "Mumbai",
  advance_amount: "₹25,000.00",
  warning_type: "Written",
  warning_date: "2026-11-25",
  warning_subject: "Attendance Policy Compliance",
  severity: "Medium",
  tenant_logo_url: "",
  tenant_tagline: "Enterprise Workforce Solutions",
  tenant_brand_color: "#1d4ed8",
  platform_logo_url: "/logo.webp",
  platform_support_email: "support@masterhrms.com",
  platform_website: "https://masterhrms.com",
  platform_website_label: "masterhrms.com",
  platform_copyright: "© 2026 MasterHRMS. All rights reserved.",
  platform_playstore_url: "https://play.google.com/store",
  platform_appstore_url: "https://apps.apple.com",
  platform_privacy_url: "https://masterhrms.com/privacy-policy",
  platform_social_facebook: "https://facebook.com",
  platform_social_x: "https://x.com",
  platform_social_instagram: "https://instagram.com",
  platform_social_linkedin: "https://linkedin.com",
  platform_social_youtube: "https://youtube.com",
};

export const TENANT_DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  ...HR_EMAIL_TEMPLATES,
  ...UNIVERSAL_CORE_TENANT_TEMPLATES,
  {
    id: "tpl-classic",
    name: "Classic Executive Corporate Invoice",
    subject: "Tax Invoice {{INVOICE_NUMBER}} from {{COMPANY_NAME}}",
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
      "{{PAYMENT_METHOD}}",
      "{{RAZORPAY_PAYMENT_ID}}",
      "{{PAYMENT_STATUS}}",
      "{{PLAN_NAME}}",
      "{{PLAN_DESCRIPTION}}",
      "{{SUBTOTAL}}",
      "{{TAX_AMOUNT}}",
      "{{TOTAL_AMOUNT}}",
    ],
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; background: #fff; color: #1e293b;">
  <!-- Header Bar -->
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e40af; padding-bottom: 20px;">
    <div>
      <h1 style="color: #1e40af; margin: 0; font-size: 26px; font-weight: 800;">{{COMPANY_NAME}}</h1>
      <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">{{COMPANY_ADDRESS}} | Contact: {{CONTACT_NUMBER}}</p>
      <p style="margin: 2px 0 0 0; color: #64748b; font-size: 13px;">Email: {{SUPPORT_EMAIL}}</p>
    </div>
    <div style="text-align: right;">
      <span style="background: #1e40af; color: #fff; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 14px; font-family: monospace;">TAX INVOICE</span>
      <p style="margin: 8px 0 0 0; font-family: monospace; font-size: 13px;">No: <strong>{{INVOICE_NUMBER}}</strong></p>
      <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px;">Date: {{INVOICE_DATE}}</p>
    </div>
  </div>

  <!-- Client & Payment Meta -->
  <div style="display: flex; justify-content: space-between; margin-top: 30px; background: #f8fafc; padding: 18px; border-radius: 8px;">
    <div>
      <strong style="color: #475569; text-transform: uppercase; font-size: 11px;">Billed To:</strong>
      <h3 style="margin: 4px 0 0 0; color: #0f172a; font-size: 16px;">{{TENANT_NAME}}</h3>
      <p style="margin: 2px 0 0 0; color: #64748b; font-size: 13px;">Email: {{TENANT_EMAIL}}</p>
    </div>
    <div style="text-align: right;">
      <strong style="color: #475569; text-transform: uppercase; font-size: 11px;">Razorpay Payment Verification:</strong>
      <p style="margin: 4px 0 0 0; font-size: 13px;">Gateway: <strong>{{PAYMENT_METHOD}}</strong></p>
      <p style="margin: 2px 0 0 0; font-family: monospace; color: #059669; font-weight: bold; font-size: 13px;">Payment ID: {{RAZORPAY_PAYMENT_ID}}</p>
      <p style="margin: 2px 0 0 0; color: #16a34a; font-weight: bold; font-size: 12px;">Status: {{PAYMENT_STATUS}}</p>
    </div>
  </div>

  <!-- Line Items Table -->
  <table style="width: 100%; border-collapse: collapse; margin-top: 30px; text-align: left;">
    <thead>
      <tr style="background: #1e40af; color: #fff; font-size: 13px;">
        <th style="padding: 12px;">Subscription Plan & Description</th>
        <th style="padding: 12px; text-align: right;">Billing Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 16px;">
          <strong style="font-size: 15px; color: #0f172a;">{{PLAN_NAME}}</strong>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">{{PLAN_DESCRIPTION}}</p>
        </td>
        <td style="padding: 16px; text-align: right; font-family: monospace; font-size: 16px; font-weight: bold;">{{SUBTOTAL}}</td>
      </tr>
    </tbody>
  </table>

  <!-- Total Summary -->
  <div style="margin-top: 30px; display: flex; justify-content: flex-end;">
    <div style="width: 280px; background: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 14px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Subtotal:</span>
        <strong style="font-family: monospace;">{{SUBTOTAL}}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #64748b;">
        <span>GST (18% Included):</span>
        <strong style="font-family: monospace;">{{TAX_AMOUNT}}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-top: 2px solid #cbd5e1; padding-top: 8px; color: #1e40af; font-size: 18px; font-weight: 800;">
        <span>Total Paid:</span>
        <strong style="font-family: monospace;">{{TOTAL_AMOUNT}}</strong>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
    <p>Thank you for choosing {{COMPANY_NAME}}! For billing queries contact {{SUPPORT_EMAIL}}.</p>
  </div>
</div>`,
  },
  {
    id: "tpl-modern-gradient",
    name: "Modern Glassmorphism Gradient Invoice",
    subject: "Official Invoice {{INVOICE_NUMBER}} from {{COMPANY_NAME}}",
    category: "Invoices",
    variables: [
      "{{COMPANY_NAME}}",
      "{{CONTACT_NUMBER}}",
      "{{SUPPORT_EMAIL}}",
      "{{INVOICE_NUMBER}}",
      "{{TENANT_NAME}}",
      "{{TENANT_EMAIL}}",
      "{{PAYMENT_METHOD}}",
      "{{RAZORPAY_PAYMENT_ID}}",
      "{{PLAN_NAME}}",
      "{{PLAN_DESCRIPTION}}",
      "{{TOTAL_AMOUNT}}",
    ],
    html_body: `<div style="font-family: 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; border: 1px solid #e0e7ff; padding: 36px; background: #ffffff; color: #1e1b4b; border-radius: 16px; box-shadow: 0 10px 25px rgba(99,102,241,0.05);">
  <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; border-radius: 12px; color: #ffffff; display: flex; justify-content: space-between; align-items: center;">
    <div>
      <h1 style="margin: 0; font-size: 28px; font-weight: 900;">{{COMPANY_NAME}}</h1>
      <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">Tel: {{CONTACT_NUMBER}} | Support: {{SUPPORT_EMAIL}}</p>
    </div>
    <div style="text-align: right;">
      <div style="background: rgba(255,255,255,0.2); padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; font-family: monospace;">OFFICIAL INVOICE</div>
      <p style="margin: 8px 0 0 0; font-size: 13px; font-family: monospace;">Ref: {{INVOICE_NUMBER}}</p>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 28px;">
    <div style="background: #f5f3ff; padding: 16px; border-radius: 10px; border: 1px solid #ddd6fe;">
      <span style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #6d28d9;">Customer Details</span>
      <h3 style="margin: 4px 0 0 0; color: #1e1b4b; font-size: 16px;">{{TENANT_NAME}}</h3>
      <p style="margin: 2px 0 0 0; color: #5b21b6; font-size: 12px;">{{TENANT_EMAIL}}</p>
    </div>

    <div style="background: #f0fdf4; padding: 16px; border-radius: 10px; border: 1px solid #bbf7d0; text-align: right;">
      <span style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #15803d;">Razorpay Instant Payment</span>
      <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: bold; color: #166534;">Gateway: {{PAYMENT_METHOD}}</p>
      <p style="margin: 2px 0 0 0; font-family: monospace; font-size: 13px; color: #047857; font-weight: bold;">Txn ID: {{RAZORPAY_PAYMENT_ID}}</p>
    </div>
  </div>

  <div style="margin-top: 24px; border: 1px solid #e0e7ff; border-radius: 12px; overflow: hidden;">
    <div style="background: #eef2ff; padding: 12px 20px; font-weight: bold; font-size: 13px; color: #3730a3; display: flex; justify-content: space-between;">
      <span>Subscription Details</span>
      <span>Amount</span>
    </div>
    <div style="padding: 20px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h4 style="margin: 0; font-size: 16px; color: #1e1b4b;">{{PLAN_NAME}}</h4>
        <p style="margin: 6px 0 0 0; color: #6b7280; font-size: 13px;">{{PLAN_DESCRIPTION}}</p>
      </div>
      <div style="font-size: 20px; font-weight: 900; font-family: monospace; color: #4338ca;">{{TOTAL_AMOUNT}}</div>
    </div>
  </div>

  <div style="margin-top: 36px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px dashed #e5e7eb; padding-top: 16px;">
    <p>Razorpay Verified Transaction · Generated by {{COMPANY_NAME}} · Contact: {{CONTACT_NUMBER}}</p>
  </div>
</div>`,
  },
  {
    id: "tpl-monochrome",
    name: "Minimalist Clean Monochrome Invoice",
    subject: "Receipt & Invoice #{{INVOICE_NUMBER}}",
    category: "Invoices",
    variables: [
      "{{COMPANY_NAME}}",
      "{{COMPANY_ADDRESS}}",
      "{{CONTACT_NUMBER}}",
      "{{INVOICE_NUMBER}}",
      "{{INVOICE_DATE}}",
      "{{TENANT_NAME}}",
      "{{TENANT_EMAIL}}",
      "{{PAYMENT_METHOD}}",
      "{{RAZORPAY_PAYMENT_ID}}",
      "{{PLAN_NAME}}",
      "{{PLAN_DESCRIPTION}}",
      "{{TOTAL_AMOUNT}}",
    ],
    html_body: `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #ffffff; color: #000000; border: 2px solid #000000;">
  <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px;">
    <div>
      <h1 style="margin: 0; font-size: 24px;">{{COMPANY_NAME}}</h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #444;">{{COMPANY_ADDRESS}} | Tel: {{CONTACT_NUMBER}}</p>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; font-size: 20px; font-family: monospace;">INVOICE</h2>
      <p style="margin: 4px 0 0 0; font-size: 12px; font-family: monospace;">#{{INVOICE_NUMBER}}</p>
      <p style="margin: 2px 0 0 0; font-size: 12px;">Date: {{INVOICE_DATE}}</p>
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; margin-top: 24px; padding-bottom: 20px; border-bottom: 1px solid #ccc;">
    <div>
      <p style="margin: 0; font-size: 11px; text-transform: uppercase; font-weight: bold;">Billed To</p>
      <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: bold;">{{TENANT_NAME}}</p>
      <p style="margin: 2px 0 0 0; font-size: 12px; color: #555;">{{TENANT_EMAIL}}</p>
    </div>
    <div style="text-align: right;">
      <p style="margin: 0; font-size: 11px; text-transform: uppercase; font-weight: bold;">Razorpay Payment Details</p>
      <p style="margin: 4px 0 0 0; font-size: 12px;">Method: <strong>{{PAYMENT_METHOD}}</strong></p>
      <p style="margin: 2px 0 0 0; font-size: 12px; font-family: monospace; font-weight: bold;">ID: {{RAZORPAY_PAYMENT_ID}}</p>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
    <thead>
      <tr style="border-bottom: 2px solid #000; text-align: left; font-size: 12px;">
        <th style="padding: 8px 0;">Item Description</th>
        <th style="padding: 8px 0; text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 16px 0;">
          <strong>{{PLAN_NAME}}</strong>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #444;">{{PLAN_DESCRIPTION}}</p>
        </td>
        <td style="padding: 16px 0; text-align: right; font-family: monospace; font-weight: bold; font-size: 16px;">{{TOTAL_AMOUNT}}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 30px; text-align: right; border-top: 2px solid #000; padding-top: 16px;">
    <span style="font-size: 14px; font-weight: bold; margin-right: 20px;">Total Paid Amount:</span>
    <span style="font-size: 22px; font-weight: bold; font-family: monospace;">{{TOTAL_AMOUNT}}</span>
  </div>
</div>`,
  },
  {
    id: "tpl-indigo-pro",
    name: "Enterprise Indigo Professional Invoice",
    subject: "Payment Receipt: {{INVOICE_NUMBER}}",
    category: "Invoices",
    variables: [
      "{{COMPANY_NAME}}",
      "{{COMPANY_ADDRESS}}",
      "{{CONTACT_NUMBER}}",
      "{{INVOICE_NUMBER}}",
      "{{TENANT_NAME}}",
      "{{RAZORPAY_PAYMENT_ID}}",
      "{{PLAN_NAME}}",
      "{{PLAN_DESCRIPTION}}",
      "{{TOTAL_AMOUNT}}",
    ],
    html_body: `<div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; border: 1px solid #c7d2fe; padding: 36px; background: #fff;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4338ca; padding-bottom: 20px;">
    <div>
      <h1 style="color: #3730a3; margin: 0; font-size: 26px;">{{COMPANY_NAME}}</h1>
      <p style="margin: 4px 0 0 0; color: #4b5563; font-size: 12px;">{{COMPANY_ADDRESS}} | Support: {{CONTACT_NUMBER}}</p>
    </div>
    <div style="text-align: right;">
      <span style="background: #3730a3; color: #fff; padding: 6px 12px; font-size: 12px; font-weight: bold; border-radius: 4px;">RAZORPAY VERIFIED</span>
      <p style="margin: 8px 0 0 0; font-family: monospace; font-size: 13px;">Invoice #{{INVOICE_NUMBER}}</p>
    </div>
  </div>

  <div style="margin-top: 24px; background: #e0e7ff; padding: 16px; border-radius: 8px; display: flex; justify-content: space-between;">
    <div>
      <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #3730a3;">Customer</span>
      <h3 style="margin: 4px 0 0 0; font-size: 16px; color: #1e1b4b;">{{TENANT_NAME}}</h3>
    </div>
    <div style="text-align: right;">
      <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #3730a3;">Razorpay ID</span>
      <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 13px; font-weight: bold; color: #4338ca;">{{RAZORPAY_PAYMENT_ID}}</p>
    </div>
  </div>

  <div style="margin-top: 24px; border: 1px solid #c7d2fe; border-radius: 8px; padding: 20px;">
    <h4 style="margin: 0; color: #3730a3; font-size: 16px;">{{PLAN_NAME}}</h4>
    <p style="margin: 6px 0 0 0; color: #4b5563; font-size: 13px;">{{PLAN_DESCRIPTION}}</p>
    <div style="margin-top: 16px; text-align: right; font-size: 20px; font-weight: bold; font-family: monospace; color: #3730a3;">
      Total: {{TOTAL_AMOUNT}}
    </div>
  </div>
</div>`,
  },
  {
    id: "tpl-compact-gst",
    name: "Compact GST SaaS Billing Invoice",
    subject: "GST Tax Invoice #{{INVOICE_NUMBER}}",
    category: "Invoices",
    variables: [
      "{{COMPANY_NAME}}",
      "{{CONTACT_NUMBER}}",
      "{{SUPPORT_EMAIL}}",
      "{{INVOICE_NUMBER}}",
      "{{INVOICE_DATE}}",
      "{{TENANT_NAME}}",
      "{{TENANT_EMAIL}}",
      "{{RAZORPAY_PAYMENT_ID}}",
      "{{PLAN_NAME}}",
      "{{PLAN_DESCRIPTION}}",
      "{{TOTAL_AMOUNT}}",
    ],
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 32px; background: #fff; font-size: 13px;">
  <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 16px;">
    <div>
      <h2 style="margin: 0; color: #0f172a;">{{COMPANY_NAME}}</h2>
      <p style="margin: 4px 0 0 0; color: #64748b;">GSTIN: 27AAAAA0000A1Z5 | Contact: {{CONTACT_NUMBER}}</p>
      <p style="margin: 2px 0 0 0; color: #64748b;">Email: {{SUPPORT_EMAIL}}</p>
    </div>
    <div style="text-align: right;">
      <h3 style="margin: 0; color: #0f172a;">GST TAX INVOICE</h3>
      <p style="margin: 4px 0 0 0; font-family: monospace;">Invoice: {{INVOICE_NUMBER}}</p>
      <p style="margin: 2px 0 0 0;">Date: {{INVOICE_DATE}}</p>
    </div>
  </div>

  <div style="margin-top: 20px; display: flex; justify-content: space-between; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px;">
    <div>
      <strong>Buyer (Billed To):</strong> {{TENANT_NAME}} ({{TENANT_EMAIL}})
    </div>
    <div style="text-align: right;">
      <strong>Payment Gateway:</strong> Razorpay (ID: <span style="font-family: monospace;">{{RAZORPAY_PAYMENT_ID}}</span>)
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #e2e8f0;">
    <thead style="background: #f1f5f9;">
      <tr>
        <th style="padding: 10px; border: 1px solid #e2e8f0;">Item / Service</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 12px; border: 1px solid #e2e8f0;">
          <strong>{{PLAN_NAME}}</strong>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">{{PLAN_DESCRIPTION}}</div>
        </td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: bold;">{{TOTAL_AMOUNT}}</td>
      </tr>
    </tbody>
  </table>
</div>`,
  },
];
