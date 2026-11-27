'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Settings,
  MoreVertical,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  Check,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Sliders,
  Sparkles,
  Zap,
  Info,
  Layers,
  Activity,
  AlertCircle,
  HelpCircle,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';

export interface IntegrationApp {
  id: string;
  name: string;
  category: 'Communication' | 'Productivity' | 'Accounting' | 'Payment' | 'Developer' | 'Biometric';
  description: string;
  iconBg: string;
  iconColor: string;
  badgeLabel: string;
  connected: boolean;
  lastSync?: string;
  apiVersion?: string;
  authType: 'oauth' | 'apiKey';
  docsUrl: string;
  defaultEvents: string[];
}

const DEFAULT_INTEGRATIONS: IntegrationApp[] = [
  {
    id: 'slack',
    name: 'Slack',
    category: 'Communication',
    description: 'Broadcast instant leave approvals, clock-in reminders, and company announcements into dedicated Slack channels.',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    badgeLabel: 'Messaging',
    connected: true,
    lastSync: '10 mins ago',
    apiVersion: 'v2.1',
    authType: 'oauth',
    docsUrl: 'https://api.slack.com',
    defaultEvents: ['Leave Applications', 'Onboarding Alerts', 'Announcements'],
  },
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    category: 'Productivity',
    description: 'Sync employee calendar events, Google Meet interviews, corporate Gmail contacts, and Google Drive document vaults.',
    iconBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
    badgeLabel: 'Google Cloud',
    connected: true,
    lastSync: '1 hour ago',
    apiVersion: 'v3',
    authType: 'oauth',
    docsUrl: 'https://developers.google.com/workspace',
    defaultEvents: ['Calendar Sync', 'Email Invites', 'Drive Document Backup'],
  },
  {
    id: 'zoom',
    name: 'Zoom Video',
    category: 'Communication',
    description: 'Auto-generate secure Zoom meeting links for candidate interviews, one-on-one reviews, and remote onboarding sessions.',
    iconBg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
    iconColor: 'text-sky-600 dark:text-sky-400',
    badgeLabel: 'Meetings',
    connected: false,
    lastSync: 'Never',
    apiVersion: 'v2',
    authType: 'oauth',
    docsUrl: 'https://marketplace.zoom.us',
    defaultEvents: ['Interview Scheduling', 'Virtual Standups'],
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    category: 'Communication',
    description: 'Deliver instant HR notifications, leave approvals, and attendance alerts directly to employee Telegram groups via BotFather.',
    iconBg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
    iconColor: 'text-sky-600 dark:text-sky-400',
    badgeLabel: 'Bot Alerts',
    connected: false,
    lastSync: 'Never',
    apiVersion: 'Bot API 7.0',
    authType: 'apiKey',
    docsUrl: 'https://core.telegram.org/bots/api',
    defaultEvents: ['Leave Alerts', 'Payroll Published', 'Daily Digest'],
  },
  {
    id: 'twilio',
    name: 'Twilio SMS',
    category: 'Communication',
    description: 'Send real-time SMS alerts, interview reminders, shift notifications, and two-factor OTP verification codes via Twilio.',
    iconBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    iconColor: 'text-rose-600 dark:text-rose-400',
    badgeLabel: 'SMS & OTP',
    connected: false,
    lastSync: 'Never',
    apiVersion: '2010-04-01',
    authType: 'apiKey',
    docsUrl: 'https://www.twilio.com/docs/sms',
    defaultEvents: ['OTP Verification', 'Shift Reminders', 'Urgent Alerts'],
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    category: 'Accounting',
    description: 'Streamline monthly payroll journals, employee expense disbursements, tax withholding, and general ledger journal entries.',
    iconBg: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400',
    badgeLabel: 'Accounting',
    connected: true,
    lastSync: 'Yesterday at 11:30 PM',
    apiVersion: 'v3.0',
    authType: 'oauth',
    docsUrl: 'https://developer.intuit.com',
    defaultEvents: ['Payroll Journals', 'Expense Reimbursements', 'Vendor Payables'],
  },
  {
    id: 'stripe',
    name: 'Stripe Billing',
    category: 'Payment',
    description: 'Process global subscription plan payments, automated invoice collection, customer credit balances, and webhook events.',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    badgeLabel: 'Payments',
    connected: true,
    lastSync: 'Real-time Webhook',
    apiVersion: '2023-10-16',
    authType: 'apiKey',
    docsUrl: 'https://stripe.com/docs',
    defaultEvents: ['Invoice Paid', 'Subscription Renewed', 'Payment Failed'],
  },
  {
    id: 'github',
    name: 'GitHub Enterprise',
    category: 'Developer',
    description: 'Provision GitHub organization access for new engineering employees, map SSO teams, and manage departing user offboarding.',
    iconBg: 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700',
    iconColor: 'text-slate-800 dark:text-slate-200',
    badgeLabel: 'DevOps',
    connected: false,
    lastSync: 'Never',
    apiVersion: 'REST v3',
    authType: 'apiKey',
    docsUrl: 'https://docs.github.com',
    defaultEvents: ['Member Added', 'Team Sync', 'Deprovisioning'],
  },
  {
    id: 'zkteco',
    name: 'ZKTeco Biometrics',
    category: 'Biometric',
    description: 'Direct TCP/IP and HTTP push biometric attendance sync from on-premise fingerprint and facial recognition turnstile hardware.',
    iconBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeLabel: 'Hardware',
    connected: true,
    lastSync: '2 mins ago',
    apiVersion: 'Push SDK 3.0',
    authType: 'apiKey',
    docsUrl: 'https://zkteco.com',
    defaultEvents: ['Biometric Punch-In', 'Overtime Calculation', 'Late Check-In'],
  },
  {
    id: 'razorpay',
    name: 'Razorpay PG',
    category: 'Payment',
    description: 'Domestic payment gateway processing UPI, NetBanking, RuPay debit cards, and automatic payouts for India operations.',
    iconBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-700 dark:text-blue-400',
    badgeLabel: 'India Payments',
    connected: true,
    lastSync: 'Real-time Webhook',
    apiVersion: 'v1',
    authType: 'apiKey',
    docsUrl: 'https://razorpay.com/docs',
    defaultEvents: ['Payment Authorized', 'Refund Processed', 'Payout Sent'],
  },
  {
    id: 'jira',
    name: 'Jira Software',
    category: 'Productivity',
    description: 'Link employee performance reviews, sprint velocity goals, and IT support ticket escalations directly with Atlassian Jira.',
    iconBg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
    iconColor: 'text-sky-700 dark:text-sky-400',
    badgeLabel: 'Agile Tools',
    connected: false,
    lastSync: 'Never',
    apiVersion: 'Cloud REST v3',
    authType: 'oauth',
    docsUrl: 'https://developer.atlassian.com',
    defaultEvents: ['Issue Created', 'Performance Linkage'],
  },
  {
    id: 'tally',
    name: 'Tally Prime ERP',
    category: 'Accounting',
    description: 'Bi-directional XML sync of monthly payroll cost centers, PF/ESI statutory challans, and employee compensation vouchers.',
    iconBg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800',
    iconColor: 'text-orange-600 dark:text-orange-400',
    badgeLabel: 'Tally XML',
    connected: false,
    lastSync: 'Never',
    apiVersion: 'Tally XML 9.0',
    authType: 'apiKey',
    docsUrl: 'https://tallysolutions.com',
    defaultEvents: ['Salary Vouchers', 'TDS Ledger', 'Employee Masters'],
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    category: 'Developer',
    description: 'Synchronize employee store discounts, internal staff merchandise credits, and automated fulfillment notifications.',
    iconBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    iconColor: 'text-purple-600 dark:text-purple-400',
    badgeLabel: 'E-Commerce',
    connected: false,
    lastSync: 'Never',
    apiVersion: 'v3 REST',
    authType: 'apiKey',
    docsUrl: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
    defaultEvents: ['Order Placed', 'Staff Discount Claimed'],
  },
  {
    id: 'webhook-gateway',
    name: 'Outbox Webhooks',
    category: 'Developer',
    description: 'Custom HMAC-SHA256 signed HTTP POST event notifications dispatched to your proprietary microservices or AWS Lambda.',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    iconColor: 'text-emerald-700 dark:text-emerald-300',
    badgeLabel: 'Realtime Push',
    connected: true,
    lastSync: '5 mins ago',
    apiVersion: 'Webhook v2',
    authType: 'apiKey',
    docsUrl: 'https://masterhrms.com/developer',
    defaultEvents: ['Employee Joined', 'Salary Disbursed', 'Leave Approved', 'Resignation Submitted'],
  },
];

function renderBrandLogo(app: IntegrationApp) {
  if (app.id === 'slack') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="Slack">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A" />
        <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0" />
        <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D" />
        <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E" />
      </svg>
    );
  }
  if (app.id === 'telegram') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="Telegram">
        <circle cx="12" cy="12" r="11" fill="#26A5E4" />
        <path d="M17.2 7.4L15.1 17.3c-.16.7-.57.87-1.15.54l-3.18-2.34-1.53 1.48c-.17.17-.31.31-.64.31l.23-3.24 5.9-5.33c.26-.23-.06-.35-.4-.13l-7.29 4.59-3.14-.98c-.68-.21-.7-.68.14-1.01l12.27-4.73c.57-.21 1.07.13.89.94z" fill="#ffffff" />
      </svg>
    );
  }
  if (app.id === 'twilio') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="Twilio">
        <circle cx="12" cy="12" r="10.5" stroke="#F22F46" strokeWidth="2.4" />
        <circle cx="9.2" cy="9.2" r="1.9" fill="#F22F46" />
        <circle cx="14.8" cy="9.2" r="1.9" fill="#F22F46" />
        <circle cx="9.2" cy="14.8" r="1.9" fill="#F22F46" />
        <circle cx="14.8" cy="14.8" r="1.9" fill="#F22F46" />
      </svg>
    );
  }
  if (app.id === 'zoom') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="Zoom">
        <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="#0B5CFF" />
        <rect x="5.5" y="8.2" width="9.5" height="7.6" rx="1.8" fill="#ffffff" />
        <path d="M15.8 10.6L19.2 8.4v7.2l-3.4-2.2v-2.8z" fill="#ffffff" />
      </svg>
    );
  }
  if (app.id === 'google-workspace') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="Google Workspace">
        <path d="M21.8 12.23c0-.72-.06-1.41-.18-2.08H12v3.94h5.5a4.7 4.7 0 0 1-2.04 3.09v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.51z" fill="#4285F4" />
        <path d="M12 22c2.76 0 5.07-.91 6.76-2.48l-3.3-2.56c-.91.61-2.08.98-3.46.98-2.66 0-4.91-1.8-5.71-4.21H2.88v2.64A10.2 10.2 0 0 0 12 22z" fill="#34A853" />
        <path d="M6.29 13.73A6.14 6.14 0 0 1 5.97 12c0-.6.11-1.18.32-1.73V7.63H2.88A10.2 10.2 0 0 0 1.8 12c0 1.65.39 3.21 1.08 4.37l3.41-2.64z" fill="#FBBC05" />
        <path d="M12 6.06c1.5 0 2.85.52 3.91 1.53l2.93-2.93C17.06 2.99 14.76 2 12 2a10.2 10.2 0 0 0-9.12 5.63l3.41 2.64C7.09 7.86 9.34 6.06 12 6.06z" fill="#EA4335" />
      </svg>
    );
  }
  if (app.id === 'quickbooks') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="QuickBooks">
        <circle cx="12" cy="12" r="10.5" fill="#2CA01C" />
        <path d="M6.5 12a3 3 0 0 1 3-3h1.2v6.8a1 1 0 0 1-1 1h-.6v-5.3H9.5a1.5 1.5 0 0 0 0 3h.4v1.5h-.4a3 3 0 0 1-3-3z" fill="#ffffff" />
        <path d="M17.5 12a3 3 0 0 1-3 3h-1.2V8.2a1 1 0 0 1 1-1h.6v5.3h.6a1.5 1.5 0 0 0 0-3h-.4V8h.4a3 3 0 0 1 3 3z" fill="#ffffff" />
      </svg>
    );
  }
  if (app.id === 'stripe') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="Stripe">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#635BFF" />
        <path d="M11.3 9.7c0-.7.58-1 1.53-1 1.37 0 3.1.42 4.47 1.16V6.43c-1.5-.6-2.98-.83-4.47-.83-3.65 0-6.08 1.91-6.08 5.1 0 4.98 6.86 4.18 6.86 6.33 0 .83-.72 1.1-1.73 1.1-1.5 0-3.42-.62-4.94-1.45v3.48c1.68.72 3.38 1.04 4.94 1.04 3.74 0 6.32-1.85 6.32-5.08 0-5.38-6.9-4.42-6.9-6.42z" fill="#ffffff" />
      </svg>
    );
  }
  if (app.id === 'github') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#0f172a" className="dark:fill-white" aria-label="GitHub">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    );
  }
  if (app.id === 'zkteco') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="ZKTeco Biometrics">
        <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
        <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
        <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
        <path d="M2 12a10 10 0 0 1 18-6" />
        <path d="M2 16h.01" />
        <path d="M21.8 16c.2-2 .131-5.354 0-6" />
        <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
        <path d="M8.65 22c.21-.66.45-1.32.57-2" />
        <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
      </svg>
    );
  }
  if (app.id === 'razorpay') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="Razorpay">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#072654" />
        <path d="M14.9 6L11.4 13.1L14.1 13.1L12.1 18.5L17.8 6H14.9Z" fill="#3395FF" />
        <path d="M10.4 11.2L6.8 18.5H10.2L12.7 13.1L10.4 11.2Z" fill="#ffffff" />
      </svg>
    );
  }
  if (app.id === 'jira') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="Jira Software">
        <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84h-9.63z" fill="#2684FF" />
        <path d="M6.77 6.8a4.36 4.36 0 0 0 4.34 4.34h1.8v1.72a4.36 4.36 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.83-.83H6.77z" fill="#0052CC" />
        <path d="M2 11.6c0 2.4 1.95 4.34 4.35 4.35h1.78v1.7c.01 2.39 1.95 4.34 4.34 4.35v-9.57a.84.84 0 0 0-.84-.83H2z" fill="#2684FF" />
      </svg>
    );
  }
  if (app.id === 'tally') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="Tally Prime">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#EA580C" />
        <path d="M6.5 7.5h11v2.8h-4v7.2h-3v-7.2h-4V7.5z" fill="#ffffff" />
      </svg>
    );
  }
  if (app.id === 'woocommerce') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="WooCommerce">
        <rect x="2" y="4" width="20" height="14" rx="4" fill="#7F54B3" />
        <path d="M13.5 18l3 3.2V18h-3z" fill="#7F54B3" />
        <path d="M5.4 8.2l1.2 5.6 1.7-3.4 1.4 3.4 1.3-5.6M13.3 9.2c-1 0-1.7.8-1.7 2s.7 2 1.7 2 1.7-.8 1.7-2-.7-2-1.7-2zm4.2 0c-1 0-1.7.8-1.7 2s.7 2 1.7 2 1.7-.8 1.7-2-.7-2-1.7-2z" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (app.id === 'webhook-gateway') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Outbox Webhooks">
        <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
        <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
        <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" />
      </svg>
    );
  }
  return app.name.substring(0, 2).toUpperCase();
}

const TENANT_PERSISTED_SECTIONS = new Set(['slack', 'telegram', 'twilio', 'zoom']);

const APP_FIELD_LABELS: Record<
  string,
  { idLabel: string; idPlaceholder: string; secretLabel: string; secretPlaceholder: string; webhookLabel?: string; webhookEditable?: boolean; webhookPlaceholder?: string }
> = {
  razorpay: {
    idLabel: 'Razorpay Key ID',
    idPlaceholder: 'rzp_live_... or rzp_test_...',
    secretLabel: 'Razorpay Key Secret',
    secretPlaceholder: 'Enter Razorpay Key Secret',
    webhookLabel: 'Webhook Callback URL',
  },
  stripe: {
    idLabel: 'Stripe Publishable Key',
    idPlaceholder: 'pk_live_... or pk_test_...',
    secretLabel: 'Stripe Secret Key',
    secretPlaceholder: 'sk_live_... or sk_test_...',
    webhookLabel: 'Webhook Callback URL',
  },
  slack: {
    idLabel: 'Default Channel / App ID',
    idPlaceholder: '#hr-updates',
    secretLabel: 'Slack Bot User OAuth Token',
    secretPlaceholder: 'xoxb-...',
    webhookLabel: 'Incoming Webhook URL',
    webhookEditable: true,
    webhookPlaceholder: 'https://hooks.slack.com/services/...',
  },
  telegram: {
    idLabel: 'Target Chat / Group ID',
    idPlaceholder: '-1001234567890',
    secretLabel: 'Telegram Bot Token (@BotFather)',
    secretPlaceholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
  },
  twilio: {
    idLabel: 'Twilio Account SID',
    idPlaceholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    secretLabel: 'Twilio Auth Token',
    secretPlaceholder: 'Enter Twilio Auth Token',
    webhookLabel: 'Sender Phone Number (From)',
    webhookEditable: true,
    webhookPlaceholder: '+15551234567',
  },
  github: {
    idLabel: 'GitHub Organization / App ID',
    idPlaceholder: 'my-enterprise-org',
    secretLabel: 'Personal Access Token / App Token',
    secretPlaceholder: 'ghp_... or github_pat_...',
  },
  'webhook-gateway': {
    idLabel: 'Webhook Signing Key ID',
    idPlaceholder: 'whsec_platform_primary',
    secretLabel: 'HMAC-SHA256 Signing Secret',
    secretPlaceholder: 'Enter signing secret',
    webhookLabel: 'Target Webhook Endpoint URL',
    webhookEditable: true,
    webhookPlaceholder: 'https://your-service.example.com/webhooks/hrms',
  },
};

export function IntegrationsHubStudio({ mode = 'super' }: { mode?: 'super' | 'tenant' }) {
  const [apps, setApps] = useState<IntegrationApp[]>(() =>
    DEFAULT_INTEGRATIONS.map((a) => ({ ...a, connected: false, lastSync: 'Not configured' }))
  );
  const [savedConfigMap, setSavedConfigMap] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  async function loadIntegrations() {
    setIsLoading(true);
    try {
      if (mode === 'super') {
        const res: any = await api.get('/super/integrations');
        const map = res?.integrations || res?.data?.integrations || {};
        setSavedConfigMap(map);
        setApps(
          DEFAULT_INTEGRATIONS.map((app) => {
            const saved = map[app.id];
            if (!saved) {
              return { ...app, connected: false, lastSync: 'Not configured' };
            }
            return {
              ...app,
              connected: Boolean(saved.connected),
              lastSync: saved.lastSync || (saved.connected ? 'Configured' : 'Disconnected'),
            };
          })
        );
      } else {
        const res: any = await api.get('/workspace/system-settings');
        const s = res?.data?.settings || res?.settings || {};
        setSavedConfigMap(s);
        setApps(
          DEFAULT_INTEGRATIONS.map((app) => {
            if (TENANT_PERSISTED_SECTIONS.has(app.id) && s[app.id]) {
              return {
                ...app,
                connected: Boolean(s[app.id].enabled),
                lastSync: s[app.id].enabled ? 'Configured' : 'Disabled',
              };
            }
            return { ...app, connected: false, lastSync: 'Not configured' };
          })
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load integrations status');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadIntegrations();
  }, [mode]);

  // Modal State
  const [settingsApp, setSettingsApp] = useState<IntegrationApp | null>(null);
  const [detailsApp, setDetailsApp] = useState<IntegrationApp | null>(null);

  // Settings Modal Form State
  const [formEnv, setFormEnv] = useState<'production' | 'sandbox'>('production');
  const [formClientId, setFormClientId] = useState('');
  const [formClientSecret, setFormClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [formWebhookUrl, setFormWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'success' | 'failed'; message: string }>({
    status: 'idle',
    message: '',
  });

  // Filtered Apps
  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      !search ||
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.description.toLowerCase().includes(search.toLowerCase()) ||
      app.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || app.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'connected' && app.connected) ||
      (selectedStatus === 'disconnected' && !app.connected);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = ['all', 'Communication', 'Productivity', 'Accounting', 'Payment', 'Developer', 'Biometric'];

  // Toggle App Connected Status (Persisted to Backend)
  async function handleToggleApp(appId: string) {
    const current = apps.find((a) => a.id === appId);
    if (!current || togglingId) return;
    const nextState = !current.connected;
    setTogglingId(appId);

    try {
      if (mode === 'super') {
        const res: any = await api.patch(`/super/integrations/${appId}/toggle`, {
          connected: nextState,
        });
        const updated = res?.integration;
        if (updated) {
          setSavedConfigMap((m) => ({ ...m, [appId]: updated }));
        }
      } else if (TENANT_PERSISTED_SECTIONS.has(appId)) {
        const existing = savedConfigMap[appId] || {};
        const updated = { ...existing, enabled: nextState };
        await api.put(`/workspace/system-settings/${appId}`, updated);
        setSavedConfigMap((m) => ({ ...m, [appId]: updated }));
      }

      setApps((prev) =>
        prev.map((a) =>
          a.id === appId
            ? { ...a, connected: nextState, lastSync: nextState ? 'Enabled just now' : 'Disabled' }
            : a
        )
      );
      toast.success(`${current.name} integration ${nextState ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      toast.error(err?.message || `Failed to update ${current.name}`);
    } finally {
      setTogglingId(null);
    }
  }

  // Open Settings Modal
  function handleOpenSettings(app: IntegrationApp) {
    setSettingsApp(app);
    const saved = savedConfigMap[app.id] || {};
    const defaultCallback =
      typeof window !== 'undefined'
        ? `${window.location.origin}/api/v1/webhooks/${app.id}/callback`
        : `https://api.masterhrms.com/v1/webhooks/${app.id}/callback`;

    if (mode === 'super') {
      setFormEnv(saved.environment === 'sandbox' ? 'sandbox' : 'production');
      setFormClientId(saved.clientId || '');
      setFormClientSecret(saved.hasSecret ? '••••••••••••••••••••' : '');
      setFormWebhookUrl(saved.webhookUrl || (APP_FIELD_LABELS[app.id]?.webhookEditable ? '' : defaultCallback));
      setSelectedEvents(Array.isArray(saved.events) && saved.events.length > 0 ? saved.events : app.defaultEvents || []);
      setTestResult(
        saved.lastTestStatus && saved.lastTestStatus !== 'idle' && saved.lastTestMessage
          ? { status: saved.lastTestStatus, message: saved.lastTestMessage }
          : { status: 'idle', message: '' }
      );
    } else if (TENANT_PERSISTED_SECTIONS.has(app.id)) {
      setFormEnv('production');
      if (app.id === 'slack') {
        setFormClientId(saved.defaultChannel || '#hr-updates');
        setFormClientSecret(saved.botToken || '');
        setFormWebhookUrl(saved.webhookUrl || '');
      } else if (app.id === 'telegram') {
        setFormClientId(saved.chatId || '');
        setFormClientSecret(saved.botToken || '');
        setFormWebhookUrl('');
      } else if (app.id === 'twilio') {
        setFormClientId(saved.accountSid || '');
        setFormClientSecret(saved.authToken || '');
        setFormWebhookUrl(saved.fromNumber || '');
      } else if (app.id === 'zoom') {
        setFormClientId(saved.clientId || '');
        setFormClientSecret(saved.clientSecret || '');
        setFormWebhookUrl(saved.accountId || '');
      }
      setSelectedEvents(app.defaultEvents || []);
      setTestResult({ status: 'idle', message: '' });
    } else {
      setFormEnv('production');
      setFormClientId('');
      setFormClientSecret('');
      setFormWebhookUrl(defaultCallback);
      setSelectedEvents(app.defaultEvents || []);
      setTestResult({ status: 'idle', message: '' });
    }
    setShowSecret(false);
  }

  // Real Live Connection Test via Backend
  async function handleTestConnection() {
    if (!settingsApp) return;
    setIsTesting(true);
    setTestResult({ status: 'idle', message: '' });

    try {
      if (mode === 'super') {
        const res: any = await api.post(`/super/integrations/${settingsApp.id}/test`, {
          environment: formEnv,
          clientId: formClientId,
          clientSecret: formClientSecret,
          webhookUrl: formWebhookUrl,
        });
        if (res?.ok || res?.success) {
          const msg = res.message || 'Connection verified successfully.';
          setTestResult({ status: 'success', message: msg });
          toast.success(msg);
        } else {
          const msg = res?.message || res?.error || 'Connection test failed.';
          setTestResult({ status: 'failed', message: msg });
          toast.error(msg);
        }
      } else {
        const res: any = await api.post(`/integrations/${settingsApp.id}/test`, {
          environment: formEnv,
          keyId: formClientId,
          keySecret: formClientSecret,
          clientId: formClientId,
          clientSecret: formClientSecret,
          webhookUrl: formWebhookUrl,
        });
        if (res?.ok || res?.success) {
          const msg = res.message || 'Connection verified successfully.';
          setTestResult({ status: 'success', message: msg });
          toast.success(msg);
        } else {
          const msg = res?.message || res?.error || 'Connection test failed.';
          setTestResult({ status: 'failed', message: msg });
          toast.error(msg);
        }
      }
    } catch (err: any) {
      const msg = err?.message || 'Connection test failed — check credentials and endpoint.';
      setTestResult({ status: 'failed', message: msg });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  }

  // Save Settings (Persisted to Backend)
  async function handleSaveSettings() {
    if (!settingsApp) return;
    setIsSaving(true);

    try {
      if (mode === 'super') {
        const res: any = await api.put(`/super/integrations/${settingsApp.id}`, {
          environment: formEnv,
          clientId: formClientId,
          clientSecret: formClientSecret,
          webhookUrl: formWebhookUrl,
          events: selectedEvents,
          connected: true,
        });
        const updated = res?.integration;
        if (updated) {
          setSavedConfigMap((m) => ({ ...m, [settingsApp.id]: updated }));
        }
      } else if (TENANT_PERSISTED_SECTIONS.has(settingsApp.id)) {
        const existing = savedConfigMap[settingsApp.id] || {};
        let payload: Record<string, any> = { ...existing, enabled: true };
        if (settingsApp.id === 'slack') {
          payload = { ...payload, defaultChannel: formClientId, botToken: formClientSecret, webhookUrl: formWebhookUrl };
        } else if (settingsApp.id === 'telegram') {
          payload = { ...payload, chatId: formClientId, botToken: formClientSecret };
        } else if (settingsApp.id === 'twilio') {
          payload = { ...payload, accountSid: formClientId, authToken: formClientSecret, fromNumber: formWebhookUrl };
        } else if (settingsApp.id === 'zoom') {
          payload = { ...payload, clientId: formClientId, clientSecret: formClientSecret, accountId: formWebhookUrl };
        }
        await api.put(`/workspace/system-settings/${settingsApp.id}`, payload);
        setSavedConfigMap((m) => ({ ...m, [settingsApp.id]: payload }));
      } else {
        await api.post(`/integrations/${settingsApp.id}/config`, {
          environment: formEnv,
          keyId: formClientId,
          keySecret: formClientSecret,
          clientId: formClientId,
          clientSecret: formClientSecret,
          webhookUrl: formWebhookUrl,
        });
      }

      setApps((prev) =>
        prev.map((a) =>
          a.id === settingsApp.id
            ? { ...a, connected: true, lastSync: 'Saved just now' }
            : a
        )
      );

      toast.success(`${settingsApp.name} configuration saved securely.`);
      setSettingsApp(null);
    } catch (err: any) {
      toast.error(err?.message || `Failed to save ${settingsApp.name} settings`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Top Statistics & Information Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Zap className="size-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Enterprise Integrations Hub
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Connect your HRMS with communication, payroll, accounting, biometric turnstiles, and payment services.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Metrics Pills & Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <div className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs tabular-nums">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>{apps.filter((a) => a.connected).length} Connected</span>
          </div>
          <div className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs tabular-nums">
            <span className="size-2 rounded-full bg-slate-400" />
            <span>{apps.filter((a) => !a.connected).length} Available</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadIntegrations()}
            disabled={isLoading}
            className="h-9 px-3 text-xs gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── 2. Search & Filter Toolbar ─── */}
      <Card className="p-3.5 border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by app name, category, or keyword..."
              className="pl-9 h-9 text-xs border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Category & Status Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 text-xs w-[160px] border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs capitalize">
                    {c === 'all' ? 'All Categories' : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-9 text-xs w-[140px] border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="connected" className="text-xs">Connected</SelectItem>
                <SelectItem value="disconnected" className="text-xs">Disconnected</SelectItem>
              </SelectContent>
            </Select>

            {(search || selectedCategory !== 'all' || selectedStatus !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                }}
                className="h-9 text-xs text-slate-500 hover:text-slate-900"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ── 3. Reference B: Clean Card Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredApps.map((app) => (
          <Card
            key={app.id}
            className="flex flex-col justify-between border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-xs hover:shadow-md hover:border-primary/40 transition-all group"
          >
            {/* Card Header & Content */}
            <div className="space-y-3.5">
              {/* Top Row: App Icon, Category Badge, 3-Dot Menu */}
              <div className="flex items-start justify-between gap-2">
                <div
                  className={`size-12 rounded-xl border flex items-center justify-center font-bold text-base shadow-2xs shrink-0 ${app.iconBg} ${app.iconColor}`}
                >
                  {renderBrandLogo(app)}
                </div>

                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    {app.badgeLabel}
                  </Badge>

                  {/* Top-Right Overflow Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs w-40">
                      <DropdownMenuItem onClick={() => handleOpenSettings(app)} className="gap-2 cursor-pointer">
                        <Settings className="size-3.5" /> Configure
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDetailsApp(app)} className="gap-2 cursor-pointer">
                        <Info className="size-3.5" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => window.open(app.docsUrl, '_blank')}
                        className="gap-2 cursor-pointer"
                      >
                        <ExternalLink className="size-3.5" /> API Docs
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Title & Connection Status */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                    {app.name}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] font-medium">
                    <span
                      className={`size-1.5 rounded-full ${
                        app.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                    <span className={app.connected ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}>
                      {app.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>

                {/* 2-line description clamp */}
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5 leading-relaxed h-8">
                  {app.description}
                </p>
              </div>
            </div>

            {/* ── Card Footer & Controls ─── */}
            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenSettings(app)}
                  className="h-8 px-2.5 text-xs gap-1 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Settings className="size-3.5" /> Settings
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailsApp(app)}
                  className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Details
                </Button>
              </div>

              {/* Enable / Disable Switch */}
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={app.connected}
                  disabled={togglingId === app.id}
                  onCheckedChange={() => handleToggleApp(app.id)}
                  aria-label={`Enable or disable ${app.name} integration`}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── 4. Reference C: Integration Settings Modal ─── */}
      <Dialog open={!!settingsApp} onOpenChange={(open) => !open && setSettingsApp(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
          {settingsApp && (
            <>
              {/* Modal Header */}
              <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`size-11 rounded-xl border flex items-center justify-center font-bold text-sm shadow-2xs ${settingsApp.iconBg} ${settingsApp.iconColor}`}
                  >
                    {settingsApp.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {settingsApp.name} Integration Settings
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Configure authentication credentials, environment endpoints, and event listeners.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Modal Body & Inputs */}
              <div className="space-y-4 pt-2">
                {/* Environment Select */}
                <div className="space-y-1.5">
                  <Label htmlFor="integration-env" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Deployment Environment <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formEnv} onValueChange={(v: any) => setFormEnv(v)}>
                    <SelectTrigger id="integration-env" className="h-9 text-xs border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Select Environment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production" className="text-xs">
                        Production Live Environment
                      </SelectItem>
                      <SelectItem value="sandbox" className="text-xs">
                        Sandbox / Staging Environment
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-400">
                    Production triggers live payroll and employee notifications. Sandbox routes to test endpoints.
                  </p>
                </div>

                {/* Client ID / API Key Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="integration-client-id" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {APP_FIELD_LABELS[settingsApp.id]?.idLabel ||
                      (settingsApp.authType === 'oauth' ? 'OAuth Client ID / App ID' : 'API Key')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="integration-client-id"
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                    placeholder={
                      APP_FIELD_LABELS[settingsApp.id]?.idPlaceholder || `e.g. ${settingsApp.id}_live_prod_key`
                    }
                    className="h-9 text-xs border-slate-200 dark:border-slate-800"
                  />
                </div>

                {/* Client Secret / Token with Show/Hide toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="integration-client-secret" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {APP_FIELD_LABELS[settingsApp.id]?.secretLabel ||
                        (settingsApp.authType === 'oauth' ? 'Client Secret' : 'API Secret Token')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="size-3 text-emerald-500" /> AES-256 Encrypted
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      id="integration-client-secret"
                      type={showSecret ? 'text' : 'password'}
                      value={formClientSecret}
                      onChange={(e) => setFormClientSecret(e.target.value)}
                      placeholder={
                        APP_FIELD_LABELS[settingsApp.id]?.secretPlaceholder || 'Enter secure secret token'
                      }
                      className="h-9 text-xs pr-10 border-slate-200 dark:border-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Webhook Callback / Endpoint URL */}
                <div className="space-y-1.5">
                  <Label htmlFor="integration-webhook" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {APP_FIELD_LABELS[settingsApp.id]?.webhookLabel || 'Webhook Callback URL'}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="integration-webhook"
                      value={formWebhookUrl}
                      onChange={(e) => setFormWebhookUrl(e.target.value)}
                      readOnly={!APP_FIELD_LABELS[settingsApp.id]?.webhookEditable}
                      placeholder={APP_FIELD_LABELS[settingsApp.id]?.webhookPlaceholder || ''}
                      className="h-9 text-xs bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(formWebhookUrl);
                        toast.success('Copied to clipboard');
                      }}
                      className="h-9 px-3 shrink-0 text-xs gap-1 border-slate-200 dark:border-slate-800"
                    >
                      <Copy className="size-3.5" /> Copy
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {APP_FIELD_LABELS[settingsApp.id]?.webhookEditable
                      ? `Configure the target endpoint or sender identifier for ${settingsApp.name}.`
                      : `Paste this callback URL into your ${settingsApp.name} developer portal webhook settings.`}
                  </p>
                </div>

                {/* Event Triggers Checkboxes */}
                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Active Event Triggers
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/30">
                    {[
                      'Employee Onboarding',
                      'Leave Application',
                      'Payroll Finalized',
                      'Attendance Punch-In',
                      'Expense Claim Approval',
                      'Resignation Notice',
                    ].map((eventName) => {
                      const isChecked = selectedEvents.includes(eventName);
                      return (
                        <label
                          key={eventName}
                          className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEvents([...selectedEvents, eventName]);
                              } else {
                                setSelectedEvents(selectedEvents.filter((ev) => ev !== eventName));
                              }
                            }}
                            className="rounded border-slate-300 text-primary focus:ring-primary size-3.5"
                          />
                          <span>{eventName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Test Connection Button & Status */}
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Diagnostics & Verification
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Send a ping packet to verify credentials and endpoint reachability.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="h-8 text-xs gap-1.5 shrink-0 border-slate-200 dark:border-slate-800"
                    >
                      {isTesting ? <RefreshCw className="size-3 animate-spin text-primary" /> : <Activity className="size-3.5" />}
                      Test Connection
                    </Button>
                  </div>

                  {testResult.status === 'success' && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                      <span>{testResult.message}</span>
                    </div>
                  )}

                  {testResult.status === 'failed' && (
                    <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2 rounded border border-rose-200 dark:border-rose-800">
                      <AlertCircle className="size-4 shrink-0 text-rose-600" />
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions Footer */}
              <DialogFooter className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSettingsApp(null)}
                  disabled={isSaving}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="text-xs h-9 gap-1.5"
                >
                  {isSaving ? <RefreshCw className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 5. App Details Drawer / Modal ─── */}
      <Dialog open={!!detailsApp} onOpenChange={(open) => !open && setDetailsApp(null)}>
        <DialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          {detailsApp && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className={`size-12 rounded-xl border flex items-center justify-center font-bold text-base shadow-2xs ${detailsApp.iconBg} ${detailsApp.iconColor}`}
                  >
                    {detailsApp.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {detailsApp.name} Overview
                    </DialogTitle>
                    <Badge variant="secondary" className="text-[10px] uppercase mt-1">
                      {detailsApp.category}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3.5 py-3 text-xs text-slate-600 dark:text-slate-300">
                <p className="leading-relaxed">{detailsApp.description}</p>

                <div className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className={detailsApp.connected ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                      {detailsApp.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Synced:</span>
                    <span>{detailsApp.lastSync || 'Never'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">API Protocol:</span>
                    <span>{detailsApp.apiVersion} ({detailsApp.authType})</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <Button variant="outline" size="sm" onClick={() => setDetailsApp(null)} className="text-xs h-8">
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const target = detailsApp;
                    setDetailsApp(null);
                    handleOpenSettings(target);
                  }}
                  className="text-xs h-8 gap-1.5"
                >
                  <Settings className="size-3.5" /> Open Settings
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
