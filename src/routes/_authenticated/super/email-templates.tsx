import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Mail, Code, Eye, Save, RefreshCw, Loader2, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/email-templates")({
  component: EmailTemplatesAdmin,
});

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  category: "Subscription" | "Onboarding" | "Payroll" | "Security" | "Invoices";
  html_body: string;
  variables: string[];
};

const SAMPLE_VARS: Record<string, string> = {
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
};

const DEFAULT_TEMPLATES: EmailTemplate[] = [
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
    subject: "Workspace Locked: {{company_name}} subscription has expired",
    category: "Subscription",
    variables: [
      "{{company_name}}",
      "{{plan_name}}",
      "{{expiry_date}}",
      "{{support_email}}",
      "{{renewal_url}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #ef4444; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #7f1d1d; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #fee2e2; margin: 4px 0 0 0; font-size: 13px;">Subscription Expired — Workspace Locked</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Subscription Expired</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        The subscription for <strong>{{company_name}}</strong> has expired on <strong>{{expiry_date}}</strong>. Workspace access has been locked for all team members.
      </p>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">Renew Subscription to Restore Access →</a></div>
      <p style="color: #64748b; font-size: 12px; margin: 0;">Need assistance? Contact our team at <a href="mailto:{{support_email}}" style="color: #dc2626;">{{support_email}}</a>.</p>
    </td></tr>
  </table>
</body></html>`,
  },

  {
    id: "tenant-account-suspended",
    name: "Tenant Account Suspended",
    subject: "Workspace Suspended: {{company_name}} ({{tenant_id}})",
    category: "Subscription",
    variables: [
      "{{company_name}}",
      "{{tenant_id}}",
      "{{plan_name}}",
      "{{suspension_date}}",
      "{{suspension_reason}}",
      "{{support_email}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #475569; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #1e293b; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Account Suspension Notice</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Workspace Suspended</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Workspace <strong>{{company_name}}</strong> has been suspended on <strong>{{suspension_date}}</strong>.
      </p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; color: #334155;">
        <div><strong>Tenant ID:</strong> {{tenant_id}}</div>
        <div><strong>Current Plan:</strong> {{plan_name}}</div>
        <div><strong>Suspension Reason:</strong> {{suspension_reason}}</div>
      </div>
      <div style="text-align: center; margin: 24px 0;"><a href="mailto:{{support_email}}" style="background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Contact Platform Support →</a></div>
    </td></tr>
  </table>
</body></html>`,
  },

  {
    id: "tenant-account-reactivated",
    name: "Tenant Account Reactivated",
    subject: "Workspace Reactivated: Welcome back to {{company_name}}",
    category: "Subscription",
    variables: [
      "{{company_name}}",
      "{{plan_name}}",
      "{{renewal_url}}",
      "{{admin_name}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #86efac; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #166534; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #dcfce7; margin: 4px 0 0 0; font-size: 13px;">Workspace Reactivated</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Access Restored, {{admin_name}}!</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your workspace <strong>{{company_name}}</strong> has been reactivated. All team members can now sign in and resume standard operations.
      </p>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Open Workspace →</a></div>
    </td></tr>
  </table>
</body></html>`,
  },

  {
    id: "subscription-renewed",
    name: "Subscription Renewed",
    subject: "Confirmed: {{company_name}} subscription has been renewed",
    category: "Subscription",
    variables: [
      "{{company_name}}",
      "{{expiry_date}}",
      "{{renewal_url}}",
      "{{admin_name}}",
    ],
    html_body: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #86efac; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #0f766e; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #ccfbf1; margin: 4px 0 0 0; font-size: 13px;">Subscription Renewal Confirmation</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Subscription Renewed Successfully</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Hello {{admin_name}}, thank you for renewing your subscription for <strong>{{company_name}}</strong>. Your workspace is active through <strong>{{expiry_date}}</strong>.
      </p>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #0f766e; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Go to Workspace Dashboard →</a></div>
    </td></tr>
  </table>
</body></html>`,
  },

  {
    id: "et-1",
    name: "Welcome & Workspace Setup Email",
    subject: "Welcome to Master HRMS — Set Up Your Workspace",
    category: "Onboarding",
    variables: ["{{user_name}}", "{{company_name}}", "{{login_url}}"],
    html_body: `<html lang="en">
<body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 30px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0f172a; margin-top: 0;">Welcome aboard, {{user_name}}!</h2>
    <p style="color: #475569; line-height: 1.6;">Your company workspace <strong>{{company_name}}</strong> has been successfully provisioned on Master HRMS.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{login_url}}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Access Workspace →</a>
    </div>
  </div>
</body></html>`,
  },
  {
    id: "et-2",
    name: "Payslip Generated Notification",
    subject: "Your Monthly Payslip for {{month}} is Ready",
    category: "Payroll",
    variables: ["{{employee_name}}", "{{month}}", "{{net_pay}}", "{{payslip_url}}"],
    html_body: `<html lang="en">
<body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 30px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0f172a; margin-top: 0;">Payslip Generated</h2>
    <p style="color: #475569;">Hello {{employee_name}}, your payslip for <strong>{{month}}</strong> has been generated.</p>
    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e1;">
      <span style="font-size: 14px; color: #64748b;">Net Disbursed Salary:</span>
      <h3 style="color: #16a34a; margin: 5px 0 0 0; font-size: 24px;">{{net_pay}}</h3>
    </div>
    <a href="{{payslip_url}}" style="background: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: bold; display: inline-block;">Download PDF Payslip</a>
  </div>
</body></html>`,
  },
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

function EmailTemplatesAdmin() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState("subscription-reminder-15d");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeView, setActiveView] = useState<"code" | "preview">("preview");
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // 1. Fetch email templates from CMS API
  const {
    data: templates,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["realtime-email-templates"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-email-templates");
        if (page?.content && Array.isArray(page.content.templates) && page.content.templates.length > 0) {
          // Merge with any missing DEFAULT_TEMPLATES so new lifecycle templates appear
          const fetchedMap = new Map((page.content.templates as EmailTemplate[]).map((t) => [t.id, t]));
          const merged: EmailTemplate[] = [];
          for (const def of DEFAULT_TEMPLATES) {
            merged.push(fetchedMap.get(def.id) || def);
            fetchedMap.delete(def.id);
          }
          // append custom ones
          for (const remaining of fetchedMap.values()) {
            merged.push(remaining);
          }
          return merged;
        }
        return DEFAULT_TEMPLATES;
      } catch {
        return DEFAULT_TEMPLATES;
      }
    },
  });

  const list = templates ?? DEFAULT_TEMPLATES;
  const current = list.find((t) => t.id === selectedId) ?? list[0];

  // 2. Save mutation
  const saveMutation = useMutation({
    mutationFn: async (updatedList: EmailTemplate[]) => {
      await api.put("/cms/pages/system-email-templates", {
        title: "System Email Templates",
        meta_description: "Realtime transactional HTML email templates",
        content: { templates: updatedList },
        published: true,
      });
    },
    onSuccess: () => {
      toast.success(`Saved HTML email template "${current.name}"`);
      qc.invalidateQueries({ queryKey: ["realtime-email-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function updateCurrent(field: keyof EmailTemplate, val: any) {
    const updated = list.map((t) => (t.id === current.id ? { ...t, [field]: val } : t));
    saveMutation.mutate(updated);
  }

  // Render preview with substituted sample vars
  const renderedPreviewHtml = (() => {
    let out = current.html_body || "";
    for (const [k, v] of Object.entries(SAMPLE_VARS)) {
      const reg = new RegExp(`{{${k}}}`, "g");
      out = out.replace(reg, v);
    }
    return out;
  })();

  async function handleSendTestEmail() {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await api.post("/super/email-templates/test", {
        templateId: current.id,
        toEmail: testEmailAddress,
        subject: current.subject,
        htmlBody: current.html_body,
      });

      if (res?.success) {
        toast.success(res.message || `Test email dispatched to ${testEmailAddress}`);
        setTestModalOpen(false);
      } else {
        toast.error(res?.error || "Failed to dispatch test email.");
      }
    } catch (err: any) {
      toast.error(err.message || "Test email delivery encountered an error.");
    } finally {
      setIsSendingTest(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">HTML Email Templates</h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Mail className="size-3 text-primary" /> Lifecycle & System ({list.length})
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Customize transactional email templates for subscription expiry reminders (15d, 10d, 5d, 3d, 2d, 1d), account suspension, and renewal.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setTestModalOpen(true)}
            className="gap-2"
          >
            <Send className="size-3.5" /> Send Test Email
          </Button>

          <Button
            onClick={() => saveMutation.mutate(list)}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save Templates
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
          {/* Template Selector Sidebar */}
          <Card className="p-2 border shadow-xs">
            <div className="p-3 text-xs font-bold text-muted-foreground uppercase border-b mb-2 flex items-center justify-between">
              <span>Templates</span>
              <span className="text-[10px] font-mono text-muted-foreground">{list.length} Total</span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1 p-1.5 mb-2 bg-muted/40 rounded-lg border border-border/50 text-[11px]">
              {["All", "Invoices", "Subscription", "Payroll", "Onboarding"].map((cat) => {
                const count = cat === "All" ? list.length : list.filter((t) => t.category === cat).length;
                if (count === 0 && cat !== "All") return null;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      const firstInCat = cat === "All" ? list[0] : list.find((t) => t.category === cat);
                      if (firstInCat) setSelectedId(firstInCat.id);
                    }}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
                      isSelected
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[9px] px-1 rounded-full ${isSelected ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1 max-h-[700px] overflow-y-auto pr-1">
              {list
                .filter((t) => selectedCategory === "All" || t.category === selectedCategory)
                .map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left p-3 rounded-lg text-xs transition-all ${
                    current.id === t.id
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "hover:bg-secondary/70 text-foreground"
                  }`}
                >
                  <div className="truncate font-medium">{t.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`text-[10px] font-mono ${
                        current.id === t.id ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      {t.category}
                    </span>
                    {t.category === "Invoices" ? (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${current.id === t.id ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-600"}`}>
                        HTML Invoice
                      </span>
                    ) : t.category === "Subscription" ? (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${current.id === t.id ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                        Lifecycle
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Editor & Previewer Studio */}
          <Card className="border shadow-xs p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Template Name</Label>
                <Input
                  value={current.name}
                  onChange={(e) => updateCurrent("name", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Subject Line</Label>
                <Input
                  value={current.subject}
                  onChange={(e) => updateCurrent("subject", e.target.value)}
                />
              </div>
            </div>

            {/* Dynamic Variables list */}
            <div className="p-3 rounded-lg border bg-secondary/20 space-y-1.5">
              <div className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                <span>Safe Template Variables:</span>
                <span className="text-[10px] text-muted-foreground font-normal">Substituted from live tenant database records</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(current.variables ?? []).map((v) => (
                  <Badge key={v} variant="outline" className="font-mono text-[11px] bg-background">
                    {v}
                  </Badge>
                ))}
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center justify-between border-b pb-3">
              <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
                <TabsList className="grid grid-cols-2 w-[220px]">
                  <TabsTrigger value="code" className="gap-1.5 text-xs">
                    <Code className="size-3.5" /> HTML Code
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-1.5 text-xs">
                    <Eye className="size-3.5" /> Live Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {activeView === "preview" && (
                <span className="text-[11px] text-muted-foreground italic">
                  Preview rendered with verified sample data
                </span>
              )}
            </div>

            {/* Code vs Live Preview */}
            {activeView === "code" ? (
              <div className="space-y-2">
                <Textarea
                  value={current.html_body}
                  onChange={(e) => updateCurrent("html_body", e.target.value)}
                  rows={20}
                  className="font-mono text-xs leading-relaxed bg-slate-950 text-slate-100 p-4 rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  Inline CSS is strongly recommended for broad compatibility across web, Outlook, and mobile mail clients.
                </p>
              </div>
            ) : (
              <div className="border rounded-xl p-4 bg-slate-100 dark:bg-slate-900 min-h-[460px]">
                <div className="bg-white dark:bg-slate-950 border rounded-t-lg p-3 text-xs text-muted-foreground border-b flex items-center gap-2">
                  <span className="font-semibold text-foreground">Subject:</span>
                  <span>{current.subject.replace(/{{company_name}}/g, SAMPLE_VARS.company_name)}</span>
                </div>
                <iframe
                  title="Email Preview"
                  srcDoc={renderedPreviewHtml}
                  className="w-full h-[450px] border-0 rounded-b-lg bg-white shadow-xs"
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Send Test Email Modal */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Dispatch a real test of &quot;{current.name}&quot; to any verified inbox to confirm formatting and deliverability.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="test-email" className="text-xs font-semibold">Recipient Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="you@domain.com"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground bg-secondary/40 p-3 rounded-lg border">
              Sample variables such as <strong>{SAMPLE_VARS.company_name}</strong> and plan <strong>{SAMPLE_VARS.plan_name}</strong> will be substituted into the test message.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setTestModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSendTestEmail} disabled={isSendingTest} className="gap-2">
              {isSendingTest ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
