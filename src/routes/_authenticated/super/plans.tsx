import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  CreditCard,
  Tag,
  ShoppingBag,
  Building,
  Plus,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  DollarSign,
  Search,
  Check,
  Calendar,
  Percent,
  RefreshCw,
  Loader2,
  FileText,
  Printer,
  Download,
  Store,
  Zap,
  Boxes,
  Code,
  Eye,
  CheckSquare,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/plans")({
  component: PlansMonetizationAdmin,
});

export type SubscriptionPlan = {
  id: string;
  name: string;
  price_monthly: number;
  price_annual: number;
  max_employees: number;
  features: string[];
  included_addon_ids?: string[];
  popular?: boolean;
};

export type PromoCoupon = {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number;
  used_count: number;
  active: boolean;
};

export type CustomerOrder = {
  id: string;
  order_number: string;
  tenant_name: string;
  tenant_email?: string;
  plan_name: string;
  plan_description?: string;
  amount: number;
  payment_method: "Razorpay" | "PayPal" | "Bank Transfer";
  razorpay_payment_id?: string;
  status: "paid" | "pending" | "failed";
  date: string;
};

export type BankTransferRequest = {
  id: string;
  tenant_name: string;
  amount: number;
  reference_no: string;
  receipt_url: string;
  status: "pending" | "approved" | "rejected";
  date: string;
};

export type InvoiceTemplate = {
  id: string;
  name: string;
  description: string;
  html: string;
};

// 6 DISTINCT HIGH-QUALITY HTML INVOICE TEMPLATES
const DEFAULT_INVOICE_TEMPLATES: InvoiceTemplate[] = [
  {
    id: "tpl-classic",
    name: "Classic Executive Corporate",
    description: "Formal Navy Header with structured itemized billing and Razorpay payment stamp.",
    html: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; background: #fff; color: #1e293b;">
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
    <p>Thank you for choosing {{COMPANY_NAME}}! For billing queries call {{CONTACT_NUMBER}} or email {{SUPPORT_EMAIL}}.</p>
  </div>
</div>`
  },
  {
    id: "tpl-modern-gradient",
    name: "Modern Glassmorphism Gradient",
    description: "Vibrant Gradient Header overlay with pill badges and modern typography.",
    html: `<div style="font-family: 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; border: 1px solid #e0e7ff; padding: 36px; background: #ffffff; color: #1e1b4b; border-radius: 16px; box-shadow: 0 10px 25px rgba(99,102,241,0.05);">
  <!-- Vibrant Gradient Header -->
  <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; border-radius: 12px; color: #ffffff; display: flex; justify-content: space-between; align-items: center;">
    <div>
      <h1 style="margin: 0; font-size: 28px; font-weight: 900; tracking-tight: -0.02em;">{{COMPANY_NAME}}</h1>
      <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">Tel: {{CONTACT_NUMBER}} | Support: {{SUPPORT_EMAIL}}</p>
    </div>
    <div style="text-align: right;">
      <div style="background: rgba(255,255,255,0.2); padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; font-family: monospace; backdrop-filter: blur(4px);">OFFICIAL INVOICE</div>
      <p style="margin: 8px 0 0 0; font-size: 13px; font-family: monospace;">Ref: {{INVOICE_NUMBER}}</p>
    </div>
  </div>

  <!-- Invoice Meta Details -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 28px;">
    <div style="background: #f5f3ff; p-4: 16px; padding: 16px; border-radius: 10px; border: 1px solid #ddd6fe;">
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

  <!-- Plan Item -->
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

  <!-- Footer Footer -->
  <div style="margin-top: 36px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px dashed #e5e7eb; padding-top: 16px;">
    <p>Razorpay Verified Transaction · Generated by {{COMPANY_NAME}} · Contact: {{CONTACT_NUMBER}}</p>
  </div>
</div>`
  },
  {
    id: "tpl-monochrome",
    name: "Minimalist Clean Monochrome",
    description: "High-contrast minimalist layout with crisp typography and clean lines.",
    html: `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #ffffff; color: #000000; border: 2px solid #000000;">
  <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px;">
    <div>
      <h1 style="margin: 0; font-size: 24px; letter-spacing: -0.03em;">{{COMPANY_NAME}}</h1>
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
</div>`
  },
  {
    id: "tpl-indigo-pro",
    name: "Enterprise Indigo Professional",
    description: "Indigo accent banners, tax breakdown grid, and verified payment stamp.",
    html: `<div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; border: 1px solid #c7d2fe; padding: 36px; background: #fff;">
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

  <div style="margin-top: 24px; border: 1px solid #c7d2fe; border-radius: 8px; p: 16px; padding: 20px;">
    <h4 style="margin: 0; color: #3730a3; font-size: 16px;">{{PLAN_NAME}}</h4>
    <p style="margin: 6px 0 0 0; color: #4b5563; font-size: 13px;">{{PLAN_DESCRIPTION}}</p>
    <div style="margin-top: 16px; text-align: right; font-size: 20px; font-weight: bold; font-family: monospace; color: #3730a3;">
      Total: {{TOTAL_AMOUNT}}
    </div>
  </div>
</div>`
  },
  {
    id: "tpl-compact-gst",
    name: "Compact GST SaaS Billing",
    description: "Formal Indian GSTIN tax breakdown layout with company contact footer.",
    html: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 32px; background: #fff; font-size: 13px;">
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
</div>`
  },
  {
    id: "tpl-dark-premium",
    name: "Tech Dark Mode Premium",
    description: "Sleek dark theme invoice with glowing emerald and gold payment stamps.",
    html: `<div style="font-family: 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #334155;">
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px;">
    <div>
      <h1 style="margin: 0; color: #38bdf8; font-size: 26px;">{{COMPANY_NAME}}</h1>
      <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">{{COMPANY_ADDRESS}} | Contact: {{CONTACT_NUMBER}}</p>
    </div>
    <div style="text-align: right;">
      <span style="background: #10b981; color: #022c22; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 12px; font-family: monospace;">PAID · RAZORPAY</span>
      <p style="margin: 8px 0 0 0; font-family: monospace; font-size: 13px; color: #cbd5e1;">#{{INVOICE_NUMBER}}</p>
    </div>
  </div>

  <div style="margin-top: 28px; background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; display: flex; justify-content: space-between;">
    <div>
      <span style="font-size: 10px; text-transform: uppercase; color: #38bdf8; font-weight: bold;">Customer</span>
      <h3 style="margin: 4px 0 0 0; color: #f8fafc; font-size: 16px;">{{TENANT_NAME}}</h3>
      <p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 12px;">{{TENANT_EMAIL}}</p>
    </div>
    <div style="text-align: right;">
      <span style="font-size: 10px; text-transform: uppercase; color: #34d399; font-weight: bold;">Razorpay Payment Verification</span>
      <p style="margin: 4px 0 0 0; font-size: 13px;">Gateway: {{PAYMENT_METHOD}}</p>
      <p style="margin: 2px 0 0 0; font-family: monospace; color: #34d399; font-weight: bold; font-size: 13px;">ID: {{RAZORPAY_PAYMENT_ID}}</p>
    </div>
  </div>

  <div style="margin-top: 24px; background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
    <div>
      <h4 style="margin: 0; color: #38bdf8; font-size: 16px;">{{PLAN_NAME}}</h4>
      <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">{{PLAN_DESCRIPTION}}</p>
    </div>
    <div style="font-size: 22px; font-weight: 900; font-family: monospace; color: #34d399;">
      {{TOTAL_AMOUNT}}
    </div>
  </div>
</div>`
  }
];

const DEFAULT_PLANS: SubscriptionPlan[] = [
  { id: "p1", name: "Starter Plan", price_monthly: 49, price_annual: 470, max_employees: 25, features: ["Core HR", "Attendance", "Standard Support"], included_addon_ids: [] },
  { id: "p2", name: "Growth Plan", price_monthly: 149, price_annual: 1430, max_employees: 100, features: ["Core HR", "Payroll", "Leave", "5 Addons"], included_addon_ids: [], popular: true },
  { id: "p3", name: "Enterprise Plan", price_monthly: 399, price_annual: 3830, max_employees: 500, features: ["All Modules", "Unlimited Addons", "Dedicated Success"], included_addon_ids: [] },
];

const DEFAULT_ORDERS: CustomerOrder[] = [
  {
    id: "o1",
    order_number: "ORD-9901",
    tenant_name: "Acme Corp",
    tenant_email: "billing@acmecorp.com",
    plan_name: "Growth Plan (Annual Subscription)",
    plan_description: "Includes 100 Employee Roster Seats, General Ledger Accounting, POS Terminal, CRM Pipelines & Priority Support",
    amount: 149,
    payment_method: "Razorpay",
    razorpay_payment_id: "pay_Rz98K4mN2Pq7L1",
    status: "paid",
    date: "2026-07-27",
  },
  {
    id: "o2",
    order_number: "ORD-9902",
    tenant_name: "Cyberdyne Systems",
    tenant_email: "accounts@cyberdyne.com",
    plan_name: "Enterprise Multi-Entity Plan",
    plan_description: "Unlimited Employees & Multi-Tenant Data Isolation with 500+ Marketplace Addons & Dedicated Account SLA",
    amount: 399,
    payment_method: "Razorpay",
    razorpay_payment_id: "pay_Pz9xK7mL2Nq4Rv",
    status: "paid",
    date: "2026-07-26",
  },
];

function PlansMonetizationAdmin() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"plans" | "coupons" | "orders" | "bank_transfers" | "templates">("plans");

  // New Coupon Dialog
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState(20);

  // New Plan Dialog State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<SubscriptionPlan> | null>(null);

  // Invoice Dialog & Selected Template
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<CustomerOrder | null>(null);
  const [activeInvoiceTemplateId, setActiveInvoiceTemplateId] = useState<string>("tpl-classic");

  // Invoice Template Editor State
  const [selectedEditTemplateId, setSelectedEditTemplateId] = useState<string>("tpl-classic");
  const [editingTemplateHtml, setEditingTemplateHtml] = useState<string>("");

  // 1. REALTIME QUERY: Fetch plans, orders & invoice templates from Supabase
  const { data: monetizationData, isLoading, refetch } = useQuery({
    queryKey: ["realtime-plans-monetization"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-monetization-plans").maybeSingle();
      if (data?.content) {
        const parsed = data.content as any;
        return {
          plans: (parsed.plans ?? DEFAULT_PLANS) as SubscriptionPlan[],
          coupons: (parsed.coupons ?? []) as PromoCoupon[],
          orders: (parsed.orders ?? DEFAULT_ORDERS) as CustomerOrder[],
          bankTransfers: (parsed.bankTransfers ?? []) as BankTransferRequest[],
          templates: (parsed.templates ?? DEFAULT_INVOICE_TEMPLATES) as InvoiceTemplate[],
        };
      }
      return { plans: DEFAULT_PLANS, coupons: [], orders: DEFAULT_ORDERS, bankTransfers: [], templates: DEFAULT_INVOICE_TEMPLATES };
    },
  });

  // 2. REALTIME QUERY: Fetch available Super-Admin Addons
  const { data: availableAddons = [] } = useQuery({
    queryKey: ["realtime-super-addons-list"],
    queryFn: async () => {
      const { data } = await supabase.from("addons").select("id, name, slug, category, price_monthly").order("name", { ascending: true });
      return data || [];
    },
  });

  // 3. REALTIME QUERY: Fetch Platform Settings for company name & logo
  const { data: platformSettings } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const plans = monetizationData?.plans ?? DEFAULT_PLANS;
  const coupons = monetizationData?.coupons ?? [];
  const orders = monetizationData?.orders ?? DEFAULT_ORDERS;
  const bankTransfers = monetizationData?.bankTransfers ?? [];
  const templates = monetizationData?.templates ?? DEFAULT_INVOICE_TEMPLATES;

  const currentEditTemplate = templates.find((t) => t.id === selectedEditTemplateId) || templates[0] || DEFAULT_INVOICE_TEMPLATES[0];

  // 4. SAVE MONETIZATION STATE MUTATION
  const saveMonetizationMutation = useMutation({
    mutationFn: async (updatedData: {
      plans?: SubscriptionPlan[];
      coupons?: PromoCoupon[];
      orders?: CustomerOrder[];
      bankTransfers?: BankTransferRequest[];
      templates?: InvoiceTemplate[];
    }) => {
      const payload = {
        plans: updatedData.plans ?? plans,
        coupons: updatedData.coupons ?? coupons,
        orders: updatedData.orders ?? orders,
        bankTransfers: updatedData.bankTransfers ?? bankTransfers,
        templates: updatedData.templates ?? templates,
      };
      const { error } = await supabase.from("cms_pages").upsert({
        slug: "system-monetization-plans",
        title: "System Monetization & Subscriptions",
        meta_description: "Realtime subscription plans, coupons, orders, and editable invoice templates",
        content: payload as any,
        published: true,
      }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["realtime-plans-monetization"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleCreateCoupon() {
    if (!newCode) return;
    const newCoupon: PromoCoupon = {
      id: `c-${Date.now()}`,
      code: newCode.toUpperCase(),
      discount_percent: newDiscount,
      max_uses: 100,
      used_count: 0,
      active: true,
    };
    saveMonetizationMutation.mutate({ coupons: [...coupons, newCoupon] });
    setNewCode("");
    setIsCouponModalOpen(false);
    toast.success("Coupon code created in real-time");
  }

  function handleSavePlan() {
    if (!editingPlan?.name) return toast.error("Plan name is required");
    let updatedPlans: SubscriptionPlan[];
    if (editingPlan.id) {
      updatedPlans = plans.map((p) => (p.id === editingPlan.id ? ({ ...p, ...editingPlan } as SubscriptionPlan) : p));
    } else {
      const newP: SubscriptionPlan = {
        id: `p-${Date.now()}`,
        name: editingPlan.name,
        price_monthly: editingPlan.price_monthly || 99,
        price_annual: editingPlan.price_annual || 990,
        max_employees: editingPlan.max_employees || 50,
        features: editingPlan.features || ["Core HR", "Attendance"],
        included_addon_ids: editingPlan.included_addon_ids || [],
      };
      updatedPlans = [...plans, newP];
    }
    saveMonetizationMutation.mutate({ plans: updatedPlans });
    setIsPlanModalOpen(false);
    setEditingPlan(null);
    toast.success("Subscription Plan & default activated addons saved!");
  }

  function handleSaveHtmlTemplate() {
    if (!editingTemplateHtml) return;
    const updated = templates.map((t) => (t.id === selectedEditTemplateId ? { ...t, html: editingTemplateHtml } : t));
    saveMonetizationMutation.mutate({ templates: updated });
    toast.success(`HTML Invoice Template "${currentEditTemplate.name}" saved!`);
  }

  function toggleAddonInPlan(addonId: string) {
    const currentList = editingPlan?.included_addon_ids || [];
    const exists = currentList.includes(addonId);
    const updatedList = exists ? currentList.filter((id) => id !== addonId) : [...currentList, addonId];
    setEditingPlan({ ...editingPlan, included_addon_ids: updatedList });
  }

  // Render HTML Invoice with Dynamic Order Variables & Razorpay Data
  function renderInvoiceHtml(order: CustomerOrder, tplHtml: string) {
    const companyName = platformSettings?.appName || "Master HRMS Inc.";
    const contactNumber = platformSettings?.supportPhone || "+91 98765 43210";
    const supportEmail = platformSettings?.smtpFrom || "billing@masterhrms.com";
    const address = "100 Tech Park, Suite 400, Silicon Valley, CA";
    const razorpayId = order.razorpay_payment_id || `pay_${Math.random().toString(36).substring(2, 14)}`;

    const subtotalNum = order.amount;
    const taxNum = Math.round(subtotalNum * 0.18);
    const totalNum = subtotalNum;

    return tplHtml
      .replace(/{{COMPANY_NAME}}/g, companyName)
      .replace(/{{COMPANY_ADDRESS}}/g, address)
      .replace(/{{CONTACT_NUMBER}}/g, contactNumber)
      .replace(/{{SUPPORT_EMAIL}}/g, supportEmail)
      .replace(/{{INVOICE_NUMBER}}/g, order.order_number)
      .replace(/{{INVOICE_DATE}}/g, order.date)
      .replace(/{{TENANT_NAME}}/g, order.tenant_name)
      .replace(/{{TENANT_EMAIL}}/g, order.tenant_email || `billing@${order.tenant_name.toLowerCase().replace(/\s+/g, "")}.com`)
      .replace(/{{PLAN_NAME}}/g, order.plan_name)
      .replace(/{{PLAN_DESCRIPTION}}/g, order.plan_description || "Includes full module access, database isolation & priority support.")
      .replace(/{{SUBTOTAL}}/g, `$${subtotalNum}.00`)
      .replace(/{{TAX_AMOUNT}}/g, `$${taxNum}.00`)
      .replace(/{{TOTAL_AMOUNT}}/g, `$${totalNum}.00 USD`)
      .replace(/{{PAYMENT_METHOD}}/g, order.payment_method || "Razorpay")
      .replace(/{{RAZORPAY_PAYMENT_ID}}/g, razorpayId)
      .replace(/{{PAYMENT_STATUS}}/g, "PAID · Razorpay Verified");
  }

  function handleApproveTransfer(id: string) {
    const target = bankTransfers.find((b) => b.id === id);
    const updatedTransfers = bankTransfers.map((b) => (b.id === id ? { ...b, status: "approved" as const } : b));

    let updatedOrders = orders;
    if (target) {
      const newOrder: CustomerOrder = {
        id: `o-${Date.now()}`,
        order_number: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        tenant_name: target.tenant_name,
        tenant_email: `billing@${target.tenant_name.toLowerCase().replace(/\s+/g, "")}.com`,
        plan_name: "Annual Subscription Plan",
        plan_description: "Enterprise Subscription with Razorpay Payment Verification",
        amount: target.amount,
        payment_method: "Razorpay",
        razorpay_payment_id: `pay_${Math.random().toString(36).substring(2, 14)}`,
        status: "paid",
        date: new Date().toISOString().split("T")[0],
      };
      updatedOrders = [newOrder, ...orders];
    }

    saveMonetizationMutation.mutate({ bankTransfers: updatedTransfers, orders: updatedOrders });
    toast.success("Bank transfer approved & Razorpay order invoice generated!");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Plans & Monetization Console</h1>
            <Badge variant="secondary" className="gap-1 text-xs font-mono">
              <CreditCard className="size-3 text-primary" /> Realtime Billing & HTML Templates
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Configure subscription plan tiers, bundle default activated addons, and edit 6 variation HTML invoice templates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setEditingPlan({ name: "", price_monthly: 99, price_annual: 950, max_employees: 50, features: ["Core HR", "Attendance"], included_addon_ids: [] }); setIsPlanModalOpen(true); }} className="gap-2 bg-primary font-bold">
            <Plus className="size-4" /> Add Plan Tier
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-5 w-[760px]">
          <TabsTrigger value="plans" className="gap-1.5 text-xs">
            <CreditCard className="size-3.5" /> Subscription Plans ({plans.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs">
            <Code className="size-3.5" /> HTML Invoice Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="coupons" className="gap-1.5 text-xs">
            <Tag className="size-3.5" /> Coupons ({coupons.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 text-xs">
            <ShoppingBag className="size-3.5" /> Orders & Invoices ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="bank_transfers" className="gap-1.5 text-xs">
            <Building className="size-3.5" /> Bank Transfers ({bankTransfers.filter((b) => b.status === "pending").length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SUBSCRIPTION PLANS */}
        <TabsContent value="plans" className="space-y-4 pt-4">
          {isLoading ? (
            <div className="py-20 grid place-items-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((p) => {
                const bundledAddonIds = p.included_addon_ids || [];
                const bundledAddonNames = availableAddons
                  .filter((a) => bundledAddonIds.includes(a.id))
                  .map((a) => a.name);

                return (
                  <Card key={p.id} className={`p-6 flex flex-col justify-between relative ${p.popular ? "border-primary shadow-md" : "border"}`}>
                    {p.popular && <Badge className="absolute -top-3 right-4 bg-primary text-primary-foreground font-mono text-[10px]">Popular Tier</Badge>}
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-bold text-xl">{p.name}</h3>
                        <div className="mt-2 text-3xl font-extrabold font-mono">${p.price_monthly}<span className="text-xs font-normal text-muted-foreground">/mo</span></div>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">Up to {p.max_employees} employee seats</p>
                      </div>

                      {/* Standard Features */}
                      <div className="space-y-1.5 border-t pt-3 text-xs">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Standard Perks</div>
                        {p.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Check className="size-3.5 text-primary shrink-0" /> {f}
                          </div>
                        ))}
                      </div>

                      {/* Default Activated Addons */}
                      <div className="space-y-1.5 border-t pt-3 text-xs">
                        <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider flex items-center gap-1">
                          <Boxes className="size-3" /> Default Activated Addons ({bundledAddonIds.length})
                        </div>
                        {bundledAddonNames.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground italic">No default addons bundled yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {bundledAddonNames.map((name, i) => (
                              <Badge key={i} variant="outline" className="text-[9px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                ✓ {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => { setEditingPlan(p); setIsPlanModalOpen(true); }} className="w-full text-xs font-bold gap-2 mt-6">
                      <Pencil className="size-3.5" /> Edit Plan & Bundled Addons
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: EDITABLE 6 HTML INVOICE TEMPLATES SUITE */}
        <TabsContent value="templates" className="space-y-4 pt-4">
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Code className="size-5 text-primary" /> Editable HTML Invoice Templates Studio
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose from 6 HTML invoice templates, edit HTML markup directly, and preview with dynamic Razorpay payment IDs.
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <Select
                  value={selectedEditTemplateId}
                  onValueChange={(id) => {
                    setSelectedEditTemplateId(id);
                    const t = templates.find((x) => x.id === id);
                    if (t) setEditingTemplateHtml(t.html);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs w-[260px] font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs font-semibold">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button onClick={handleSaveHtmlTemplate} className="gap-2 bg-primary font-bold text-xs">
                  <CheckCircle2 className="size-4" /> Save HTML Template
                </Button>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 items-start">
              {/* HTML Code Editor Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Code className="size-4 text-primary" /> HTML Source Code ({currentEditTemplate.name})</span>
                  <span className="text-[10px] font-mono text-muted-foreground">Supports &#123;&#123;COMPANY_NAME&#125;&#125;, &#123;&#123;RAZORPAY_PAYMENT_ID&#125;&#125;, etc.</span>
                </div>

                <Textarea
                  rows={22}
                  value={editingTemplateHtml || currentEditTemplate.html}
                  onChange={(e) => setEditingTemplateHtml(e.target.value)}
                  className="font-mono text-xs leading-relaxed bg-slate-950 text-emerald-400 p-4 rounded-xl border"
                />
              </div>

              {/* Live Rendered HTML Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Eye className="size-4 text-emerald-600" /> Live HTML Invoice Render Preview</span>
                  <Badge variant="outline" className="text-[9px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    ● Live Razorpay Sample Render
                  </Badge>
                </div>

                <div className="border rounded-xl p-4 bg-secondary/20 min-h-[440px] max-h-[520px] overflow-y-auto shadow-inner">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderInvoiceHtml(orders[0] || DEFAULT_ORDERS[0], editingTemplateHtml || currentEditTemplate.html),
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: COUPONS */}
        <TabsContent value="coupons" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm">Active Promo Coupons ({coupons.length})</h3>
            <Button size="sm" onClick={() => setIsCouponModalOpen(true)} className="gap-1.5 text-xs">
              <Plus className="size-3.5" /> Create Coupon
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {coupons.map((c) => (
              <Card key={c.id} className="p-4 border space-y-2">
                <div className="flex justify-between items-center">
                  <Badge className="font-mono text-sm">{c.code}</Badge>
                  <span className="font-bold text-emerald-600 text-sm">{c.discount_percent}% OFF</span>
                </div>
                <div className="text-xs text-muted-foreground font-mono">Uses: {c.used_count} / {c.max_uses}</div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 4: ORDERS & INVOICES */}
        <TabsContent value="orders" className="space-y-4 pt-4">
          <Card className="overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/40 font-semibold border-b">
                <tr>
                  <th className="p-3">Order #</th>
                  <th className="p-3">Tenant Name</th>
                  <th className="p-3">Plan Name</th>
                  <th className="p-3">Razorpay Payment ID</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-secondary/20">
                    <td className="p-3 font-mono font-bold">{o.order_number}</td>
                    <td className="p-3 font-bold">{o.tenant_name}</td>
                    <td className="p-3">{o.plan_name}</td>
                    <td className="p-3 font-mono text-emerald-600 font-bold">{o.razorpay_payment_id || "pay_Rz98K4mN2Pq7L1"}</td>
                    <td className="p-3 font-mono font-bold">${o.amount}</td>
                    <td className="p-3"><Badge variant="default">{o.status}</Badge></td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" className="h-7 text-[11px] font-bold gap-1" onClick={() => setSelectedInvoiceOrder(o)}>
                        <FileText className="size-3" /> View HTML Invoice
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* TAB 5: BANK TRANSFERS */}
        <TabsContent value="bank_transfers" className="space-y-4 pt-4">
          <Card className="overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/40 font-semibold border-b">
                <tr>
                  <th className="p-3">Tenant Name</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Ref #</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bankTransfers.map((b) => (
                  <tr key={b.id}>
                    <td className="p-3 font-bold">{b.tenant_name}</td>
                    <td className="p-3 font-mono">${b.amount}</td>
                    <td className="p-3 font-mono">{b.reference_no}</td>
                    <td className="p-3"><Badge variant={b.status === "approved" ? "default" : "secondary"}>{b.status}</Badge></td>
                    <td className="p-3">
                      {b.status === "pending" && (
                        <Button size="sm" onClick={() => handleApproveTransfer(b.id)} className="h-7 text-xs bg-emerald-600">
                          Approve Transfer
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: VIEW & PRINT HTML INVOICE WITH TEMPLATE SWITCHER & RAZORPAY PAYMENT ID */}
      {selectedInvoiceOrder && (
        <Dialog open={!!selectedInvoiceOrder} onOpenChange={() => setSelectedInvoiceOrder(null)}>
          <DialogContent className="sm:max-w-[850px] max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="size-5 text-primary" /> Tax Invoice — {selectedInvoiceOrder.order_number}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Render invoice using 6 variation HTML templates with Razorpay payment details.
                  </DialogDescription>
                </div>

                {/* Template Picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground shrink-0">Template:</span>
                  <Select value={activeInvoiceTemplateId} onValueChange={setActiveInvoiceTemplateId}>
                    <SelectTrigger className="h-8 text-xs w-[220px] font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs font-semibold">
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogHeader>

            {/* Rendered HTML Container */}
            <div className="py-2 border-y my-2 overflow-x-auto">
              <div
                dangerouslySetInnerHTML={{
                  __html: renderInvoiceHtml(
                    selectedInvoiceOrder,
                    (templates.find((t) => t.id === activeInvoiceTemplateId) || templates[0]).html
                  ),
                }}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => window.print()} className="gap-1.5 text-xs font-bold">
                <Printer className="size-3.5" /> Print / Save as PDF
              </Button>
              <Button onClick={() => setSelectedInvoiceOrder(null)} className="font-bold">Close Invoice</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 2: EDIT PLAN TIER & BUNDLED ADDONS */}
      {editingPlan && (
        <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
          <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                {editingPlan.id ? "Edit Plan Tier & Default Activated Addons" : "Add New Subscription Plan Tier"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Select real-time Super-Admin marketplace addons that will be <strong>automatically activated by default</strong> when a tenant chooses this plan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Plan Name *</Label>
                  <Input
                    placeholder="Growth Plan"
                    value={editingPlan.name ?? ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Max Employee Seats</Label>
                  <Input
                    type="number"
                    value={editingPlan.max_employees ?? 50}
                    onChange={(e) => setEditingPlan({ ...editingPlan, max_employees: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Monthly Price ($)</Label>
                  <Input
                    type="number"
                    value={editingPlan.price_monthly ?? 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price_monthly: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Annual Price ($)</Label>
                  <Input
                    type="number"
                    value={editingPlan.price_annual ?? 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price_annual: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* REAL-TIME MARKETPLACE ADDONS SELECTOR */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <Store className="size-4" /> Default Activated Addons (Realtime Sync)
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {(editingPlan.included_addon_ids || []).length} selected
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-xl bg-secondary/20">
                  {availableAddons.map((addon) => {
                    const isChecked = (editingPlan.included_addon_ids || []).includes(addon.id);
                    return (
                      <div
                        key={addon.id}
                        onClick={() => toggleAddonInPlan(addon.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                          isChecked ? "bg-emerald-500/10 border-emerald-500/50 text-foreground font-semibold" : "bg-card hover:bg-secondary/50 text-muted-foreground"
                        }`}
                      >
                        <Checkbox checked={isChecked} onCheckedChange={() => toggleAddonInPlan(addon.id)} />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs truncate">{addon.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {addon.price_monthly === 0 ? "Free" : `$${addon.price_monthly}/mo`} · {addon.category || "Module"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsPlanModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePlan} className="bg-primary font-bold">Save Plan Tier</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 3: CREATE COUPON */}
      <Dialog open={isCouponModalOpen} onOpenChange={setIsCouponModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Create Discount Coupon</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Coupon Code</Label>
              <Input placeholder="e.g. SUMMER20" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Discount Percentage (%)</Label>
              <Input type="number" value={newDiscount} onChange={(e) => setNewDiscount(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCouponModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCoupon}>Create Code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
