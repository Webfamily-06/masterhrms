'use client';

import React, { useState } from 'react';
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

export function IntegrationsHubStudio() {
  const [apps, setApps] = useState<IntegrationApp[]>(DEFAULT_INTEGRATIONS);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal State (Reference C)
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

  // Toggle App Connected Status
  function handleToggleApp(appId: string) {
    setApps((prev) =>
      prev.map((a) => {
        if (a.id === appId) {
          const nextState = !a.connected;
          toast.success(`${a.name} integration ${nextState ? 'enabled' : 'disabled'}`);
          return {
            ...a,
            connected: nextState,
            lastSync: nextState ? 'Just now' : 'Disabled',
          };
        }
        return a;
      })
    );
  }

  // Open Settings Modal
  function handleOpenSettings(app: IntegrationApp) {
    setSettingsApp(app);
    setFormEnv('production');
    // Security compliance: Do NOT reproduce real secrets or demo secrets
    setFormClientId(app.connected ? `mstr_${app.id}_client_prod` : '');
    setFormClientSecret(app.connected ? '••••••••••••••••••••' : '');
    setShowSecret(false);
    setFormWebhookUrl(`https://api.masterhrms.com/v1/webhooks/${app.id}/callback`);
    setSelectedEvents(app.defaultEvents || []);
    setTestResult({ status: 'idle', message: '' });
  }

  // Simulate Connection Test
  function handleTestConnection() {
    setIsTesting(true);
    setTestResult({ status: 'idle', message: '' });

    setTimeout(() => {
      setIsTesting(false);
      setTestResult({
        status: 'success',
        message: 'HTTP 200 OK — OAuth2 handshake verified successfully. Handshake latency: 142ms.',
      });
      toast.success('Connection verified successfully!');
    }, 900);
  }

  // Save Settings
  function handleSaveSettings() {
    if (!settingsApp) return;

    setApps((prev) =>
      prev.map((a) => {
        if (a.id === settingsApp.id) {
          return {
            ...a,
            connected: true,
            lastSync: 'Just now',
          };
        }
        return a;
      })
    );

    toast.success(`${settingsApp.name} configuration updated successfully.`);
    setSettingsApp(null);
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

        {/* Quick Metrics Pills */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>{apps.filter((a) => a.connected).length} Connected</span>
          </div>
          <div className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
            <span className="size-2 rounded-full bg-slate-400" />
            <span>{apps.filter((a) => !a.connected).length} Available</span>
          </div>
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
                  {app.name.substring(0, 2).toUpperCase()}
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
                    {settingsApp.authType === 'oauth' ? 'OAuth Client ID / App ID' : 'API Key'} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="integration-client-id"
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                    placeholder={`e.g. ${settingsApp.id}_live_prod_key`}
                    className="h-9 text-xs font-mono border-slate-200 dark:border-slate-800"
                  />
                </div>

                {/* Client Secret / Token with Show/Hide toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="integration-client-secret" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {settingsApp.authType === 'oauth' ? 'Client Secret' : 'API Secret Token'} <span className="text-destructive">*</span>
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
                      placeholder="Enter secure secret token"
                      className="h-9 text-xs font-mono pr-10 border-slate-200 dark:border-slate-800"
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

                {/* Webhook Callback URL */}
                <div className="space-y-1.5">
                  <Label htmlFor="integration-webhook" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Webhook Callback URL
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="integration-webhook"
                      value={formWebhookUrl}
                      readOnly
                      className="h-9 text-xs font-mono bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(formWebhookUrl);
                        toast.success('Webhook URL copied to clipboard');
                      }}
                      className="h-9 px-3 shrink-0 text-xs gap-1 border-slate-200 dark:border-slate-800"
                    >
                      <Copy className="size-3.5" /> Copy
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Paste this callback URL into your {settingsApp.name} developer portal webhook settings.
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
                    <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
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
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  className="text-xs h-9 gap-1.5"
                >
                  <CheckCircle2 className="size-3.5" /> Save Changes
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

                <div className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-mono text-[11px]">
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
