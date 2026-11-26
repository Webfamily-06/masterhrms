'use client';
import { Link, useNavigate, useRouterState } from "@/src/lib/router-compat";
import { useEffect, useRef, useState } from "react";
import { DreamsSidebar } from "@/components/dreams-sidebar";
import { useSession, useCurrentProfile } from "@/lib/session";
import { RealtimeNotificationDrawer } from "@/components/realtime-notification-drawer";
import { ThemeToggle } from "@/components/theme-toggle";
import { AICopilotWidget } from "@/components/ai-copilot-widget";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, Home, User, ShieldCheck, Settings, CreditCard, LogOut, Globe,
  Sparkles, Users, Clock, CalendarCheck, Wallet, Briefcase, GraduationCap, HelpCircle,
  Receipt, FileText, FolderLock, Layers, FileSpreadsheet, Workflow, BarChart3,
  ShoppingCart, Landmark, Kanban, MessageSquare, Package, Store, Compass,
  Fingerprint, ScanLine, HardDrive, Target, ArrowRightLeft, Truck, Building2, SlidersHorizontal,
  CalendarDays, Trophy, ShieldAlert, Timer, TrendingUp, UserCheck, UserX, PiggyBank, Percent, GitBranch, Coins, RefreshCw, Award, Gift, Phone, Repeat, Megaphone,
  Bell, History, Database, Code, Webhook, Lightbulb, Bot, Mail
} from "lucide-react";
import { api, clearToken, setToken, getAuthToken } from "@/lib/api";
import { resolveTenantSubdomainOrigin } from "@/lib/platform-domain";
import { toast } from "sonner";
import { WorkspaceUnavailableView } from "@/components/workspace-unavailable-view";
import { useAppConfig } from "@/lib/useAppConfig";
import { useTenantBranding } from "@/lib/useTenantBranding";
import { AccessDenied } from "@/components/access-denied";
import { isSuperAdminUser, isSharedRoute, isPlatformOnlyRoute, isWorkspaceAdminUser, isModuleAllowed, hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { SuspendedAccountView } from "@/components/subscription/suspended-account-view";
import { ExpiredSubscriptionView } from "@/components/subscription/expired-subscription-view";
import { SubscriptionWarningPopup } from "@/components/subscription/subscription-warning-popup";
import { SubscriptionFooterBar } from "@/components/subscription/subscription-footer-bar";
import { ProductNotSubscribed } from "@/components/product-not-subscribed";
import { AddonNotInstalled } from "@/components/addon-not-installed";
import { useNavigationResolver } from "@/lib/navigation-resolver";

const CRM_ROUTE_PREFIXES = [
  "/crm",
  "/crm-dashboard",
  "/deals-dashboard",
  "/leads-dashboard",
  "/contacts",
  "/companies",
  "/proposals",
  "/pipeline",
  "/campaigns",
];

const POS_ROUTE_PREFIXES = [
  "/pos",
  "/pos-dashboard",
  "/inventory-dashboard",
  "/products",
  "/purchases",
  "/transfers",
  "/adjustments",
  "/suppliers",
  "/store",
  "/returns",
];

const FINANCE_ROUTE_PREFIXES = [
  "/accounting",
  "/finance-dashboard",
  "/invoices",
  "/recurring-invoices",
  "/budgets",
  "/taxes",
  "/currencies",
];

const HRMS_ADMIN_ROUTE_PREFIXES = [
  "/hr",
  "/hrm-dashboard",
  "/payroll-dashboard",
  "/recruitment-dashboard",
  "/learning-analytics",
  "/asset-dashboard",
  "/it-admin-dashboard",
  "/help-desk-dashboard",
  "/biometric",
  "/biometric-sync",
];

function isPathMatchingPrefixes(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

const EMPLOYEE_SELF_SERVICE_SEARCH_ITEMS = [
  { title: "Dashboard", url: "/me/dashboard", group: "Overview", icon: Home },
  { title: "Calendar", url: "/me/calendar", group: "Overview", icon: CalendarDays },
  { title: "Todo", url: "/me/todo", group: "Overview", icon: Kanban },
  { title: "Gantt", url: "/me/todo/gantt", group: "Overview", icon: BarChart3 },
  { title: "My Notes", url: "/me/notes", group: "Overview", icon: FileText },
  { title: "Chat", url: "/me/chat", group: "Overview", icon: MessageSquare },
  { title: "My Reminders", url: "/me/notifications/reminders", group: "Overview", icon: Bell },
  { title: "Notifications", url: "/me/notifications", group: "Overview", icon: Bell },
  { title: "Employees", url: "/me/employees", group: "Workforce Management", icon: Users },
  { title: "Holiday", url: "/me/organization/holidays", group: "Workforce Management", icon: CalendarDays },
  { title: "Announcements", url: "/me/organization/announcements", group: "Workforce Management", icon: Megaphone },
  { title: "Attendance Records", url: "/me/attendance/records", group: "Workforce Management", icon: Clock },
  { title: "Timesheet", url: "/me/attendance/timesheet", group: "Workforce Management", icon: Clock },
  { title: "Attendance Regularizations", url: "/me/attendance/regularizations", group: "Workforce Management", icon: Clock },
  { title: "Shift", url: "/me/attendance/shifts", group: "Workforce Management", icon: Layers },
  { title: "Attendance Policies", url: "/me/attendance/policies", group: "Workforce Management", icon: FileText },
  { title: "Leave Applications", url: "/me/leave/applications", group: "Workforce Management", icon: CalendarCheck },
  { title: "Leave Balance", url: "/me/leave/balance", group: "Workforce Management", icon: CalendarCheck },
  { title: "Leave Policy", url: "/me/leave/policies", group: "Workforce Management", icon: ShieldCheck },
  { title: "Job Postings", url: "/me/recruitment/job-postings", group: "Talent & Growth", icon: Briefcase },
  { title: "Interviews", url: "/me/recruitment/interviews", group: "Talent & Growth", icon: MessageSquare },
  { title: "Candidate Onboarding", url: "/me/recruitment/onboarding", group: "Talent & Growth", icon: UserCheck },
  { title: "Candidate Assessments", url: "/me/recruitment/assessments", group: "Talent & Growth", icon: FileSpreadsheet },
  { title: "Career", url: "/me/recruitment/career", group: "Talent & Growth", icon: Sparkles },
  { title: "Awards", url: "/me/awards", group: "Talent & Growth", icon: Trophy },
  { title: "Promotion", url: "/me/lifecycle/promotions", group: "Talent & Growth", icon: TrendingUp },
  { title: "Transfers", url: "/me/lifecycle/transfers", group: "Talent & Growth", icon: ArrowRightLeft },
  { title: "Warnings", url: "/me/lifecycle/warnings", group: "Talent & Growth", icon: ShieldAlert },
  { title: "Resignations", url: "/me/lifecycle/resignation", group: "Talent & Growth", icon: LogOut },
  { title: "Trips", url: "/me/lifecycle/trips", group: "Talent & Growth", icon: Globe },
  { title: "Complaints", url: "/me/lifecycle/complaints", group: "Talent & Growth", icon: MessageSquare },
  { title: "Employee Review", url: "/me/performance/reviews", group: "Talent & Growth", icon: Target },
  { title: "Employee Goals", url: "/me/performance/goals", group: "Talent & Growth", icon: Target },
  { title: "Employee Trainings", url: "/me/training/trainings", group: "Talent & Growth", icon: GraduationCap },
  { title: "Training Sessions", url: "/me/training/sessions", group: "Talent & Growth", icon: GraduationCap },
  { title: "Training Programs", url: "/me/training/programs", group: "Talent & Growth", icon: GraduationCap },
  { title: "Payslips", url: "/me/payroll/payslips", group: "Finance & Assets", icon: Receipt },
  { title: "Employee Salaries", url: "/me/payroll/salary", group: "Finance & Assets", icon: Wallet },
  { title: "Assets", url: "/me/assets", group: "Finance & Assets", icon: HardDrive },
  { title: "Asset Requests", url: "/me/assets/requests", group: "Finance & Assets", icon: Package },
  { title: "Meetings", url: "/me/meetings", group: "Communication & Content", icon: CalendarDays },
  { title: "Action Items", url: "/me/meetings/action-items", group: "Communication & Content", icon: Kanban },
  { title: "Zoom Meeting", url: "/me/zoom-meetings", group: "Communication & Content", icon: Phone },
  { title: "HR Documents", url: "/me/documents", group: "Communication & Content", icon: FolderLock },
  { title: "Employee Contracts", url: "/me/documents/contracts", group: "Communication & Content", icon: FileText },
  { title: "Acknowledgements", url: "/me/documents/acknowledgements", group: "Communication & Content", icon: ShieldCheck },
  { title: "Helpdesk & Tickets", url: "/me/helpdesk", group: "Communication & Content", icon: HelpCircle },
  { title: "File Manager", url: "/me/files", group: "File Manager", icon: FolderLock },
  { title: "My Profile, Password & 2FA", url: "/profile", group: "Account", icon: User },
  { title: "My Settings", url: "/me/settings", group: "Account", icon: Settings },
];

const ALL_SEARCH_ITEMS = [
  { title: "HRM Dashboard", url: "/hrm-dashboard", group: "ERP Core", icon: Home },
  { title: "Deals Dashboard", url: "/deals-dashboard", group: "ERP Core", icon: Compass },
  { title: "Leads Dashboard", url: "/leads-dashboard", group: "ERP Core", icon: Users },
  { title: "Payroll Dashboard", url: "/payroll-dashboard", group: "ERP Core", icon: Wallet },
  { title: "Recruitment Dashboard", url: "/recruitment-dashboard", group: "ERP Core", icon: Briefcase },
  { title: "Help Desk Dashboard", url: "/help-desk-dashboard", group: "ERP Core", icon: HelpCircle },
  { title: "Asset Dashboard", url: "/asset-dashboard", group: "ERP Core", icon: HardDrive },
  { title: "IT Admin Dashboard", url: "/it-admin-dashboard", group: "ERP Core", icon: SlidersHorizontal },
  { title: "Learning Analytics", url: "/learning-analytics", group: "ERP Core", icon: GraduationCap },
  { title: "AI Attendance Insights", url: "/ai-attendance-insights", group: "AI Center", icon: Sparkles },
  { title: "AI Payroll Forecast", url: "/ai-payroll-forecast", group: "AI Center", icon: Sparkles },
  { title: "AI Hiring Forecast", url: "/ai-hiring-forecast", group: "AI Center", icon: Sparkles },
  { title: "AI Team Performance Insights", url: "/ai-team-performance-insights", group: "AI Center", icon: Sparkles },
  { title: "AI Settings & Configuration", url: "/ai-configuration", group: "AI Center", icon: Settings },
  { title: "POS Dashboard", url: "/pos-dashboard", group: "ERP Core", icon: ShoppingCart },
  { title: "Inventory Dashboard", url: "/inventory-dashboard", group: "ERP Core", icon: Package },
  { title: "Sales CRM Dashboard", url: "/crm-dashboard", group: "ERP Core", icon: Compass },
  { title: "Finance Dashboard", url: "/finance-dashboard", group: "ERP Core", icon: Landmark },
  { title: "Project Dashboard", url: "/project-dashboard", group: "ERP Core", icon: Kanban },
  { title: "Analytics Overview", url: "/analytics", group: "ERP Core", icon: BarChart3 },
  { title: "Point of Sale (POS Terminal)", url: "/pos", group: "ERP Core", icon: ShoppingCart },
  { title: "Online Storefront Catalog", url: "/store", group: "ERP Core", icon: Store },
  { title: "Client Invoice Portal (B2B)", url: "/portal/invoices/INV-2026-001", group: "Sales & Finance", icon: Receipt },
  { title: "WooCommerce Sync", url: "/integrations", group: "E-Commerce", icon: ShoppingCart },
  { title: "Shopify Sync", url: "/shopify", group: "E-Commerce", icon: Store },
  { title: "Products & Catalog", url: "/products", group: "ERP Core", icon: Package },
  { title: "Stock Transfers & In-Transit", url: "/transfers", group: "ERP Core", icon: ArrowRightLeft },
  { title: "Stock Adjustments & Audits", url: "/adjustments", group: "ERP Core", icon: SlidersHorizontal },
  { title: "Purchase Orders & Inward", url: "/purchases", group: "ERP Core", icon: Truck },
  { title: "Supplier Master Directory", url: "/suppliers", group: "ERP Core", icon: Building2 },
  { title: "Accounting & Ledgers", url: "/accounting", group: "Sales & Finance", icon: Landmark },
  { title: "Budgets & Financial Plans", url: "/budgets", group: "Sales & Finance", icon: PiggyBank },
  { title: "Tax Rates & GST Slabs", url: "/taxes", group: "Sales & Finance", icon: Percent },
  { title: "Currencies & FX Exchange", url: "/currencies", group: "Sales & Finance", icon: Coins },
  { title: "Clients Directory", url: "/clients", group: "Sales & Finance", icon: Users },
  { title: "CRM Companies & Accounts", url: "/companies", group: "Sales & Finance", icon: Building2 },
  { title: "Sales Pipelines", url: "/pipeline", group: "Sales & Finance", icon: GitBranch },
  { title: "Projects & Tasks", url: "/projects", group: "Platform", icon: Kanban },
  { title: "Sales CRM Pipeline", url: "/crm", group: "Sales & Finance", icon: Compass },
  { title: "Invoices & Billing", url: "/invoices", group: "Sales & Finance", icon: Receipt },
  { title: "Recurring Invoices", url: "/recurring-invoices", group: "Sales & Finance", icon: Repeat },
  { title: "Proposals & Quotes", url: "/proposals", group: "Sales & Finance", icon: FileText },
  { title: "Expense Claims", url: "/expenses", group: "Sales & Finance", icon: Wallet },
  { title: "Team Chat", url: "/hr/chat", group: "Collaboration", icon: MessageSquare },
  { title: "Call History", url: "/call-history", group: "Collaboration", icon: Phone },
  { title: "AI Document OCR", url: "/ai-ocr", group: "Collaboration", icon: ScanLine },
  { title: "AI Copywriter", url: "/ai-writer", group: "Collaboration", icon: Sparkles },
  { title: "HRM Hub & Overview", url: "/hr/dashboard", group: "HRM Suite", icon: Users },
  { title: "Workspace Settings", url: "/tenant/settings", group: "Platform", icon: Settings },
  { title: "HRM Setup (NOC, Experience & Joining Letters)", url: "/tenant/hrm-setup", group: "Platform", icon: FileText },
  { title: "Mail Templates", url: "/tenant/mail-templates", group: "Platform", icon: Mail },
  { title: "Roles & Permissions", url: "/tenant/roles", group: "Platform", icon: ShieldAlert },
  { title: "HR Administration Settings", url: "/hr/settings", group: "HRM Suite", icon: Settings },
  { title: "Personal Settings & Theme", url: "/me/settings", group: "Platform", icon: Settings },
  { title: "Employee Directory", url: "/hr/employees", group: "HRM Suite", icon: Users },
  { title: "Attendance & Clock", url: "/hr/attendance", group: "HRM Suite", icon: Clock },
  { title: "Employee Attendance Matrix", url: "/hr/attendance/records", group: "HRM Suite", icon: CalendarDays },
  { title: "Daily Attendance Report", url: "/hr/attendance/timesheets", group: "HRM Suite", icon: FileText },
  { title: "Leave Management", url: "/hr/leave/applications", group: "HRM Suite", icon: CalendarCheck },
  { title: "Shift Rostering", url: "/hr/attendance/shifts", group: "HRM Suite", icon: Layers },
  { title: "Shift Swap Requests", url: "/hr/attendance/shifts", group: "HRM Suite", icon: ArrowRightLeft },
  { title: "Overtime Requests", url: "/hr/attendance/records", group: "HRM Suite", icon: Timer },
  { title: "Work From Home (WFH)", url: "/hr/attendance/regularizations", group: "HRM Suite", icon: Home },
  { title: "Promotions & Transfers", url: "/hr/lifecycle/promotions", group: "HRM Suite", icon: TrendingUp },
  { title: "Probation Management", url: "/hr/employees", group: "HRM Suite", icon: UserCheck },
  { title: "Provident Fund Administration", url: "/hr/payroll/components", group: "HRM Suite", icon: Landmark },
  { title: "Personal Tasks Board", url: "/tasks", group: "Platform", icon: Kanban },
  { title: "Global Task Board", url: "/task-board", group: "Platform", icon: Kanban },
  { title: "Payroll Runs", url: "/hr/payroll/runs", group: "HRM Suite", icon: Wallet },
  { title: "Recruitment (ATS)", url: "/hr/recruitment/job-postings", group: "HRM Suite", icon: Briefcase },
  { title: "Campus Hiring", url: "/hr/recruitment/candidates", group: "HRM Suite", icon: GraduationCap },
  { title: "Employee Referrals", url: "/hr/recruitment/referrals", group: "HRM Suite", icon: Gift },
  { title: "Training & LMS", url: "/hr/training/employee-trainings", group: "HRM Suite", icon: GraduationCap },
  { title: "Certification Tracking", url: "/hr/training/programs", group: "HRM Suite", icon: Award },
  { title: "Helpdesk & Tickets", url: "/me/helpdesk", group: "HRM Suite", icon: HelpCircle },
  { title: "Document Vault", url: "/hr/documents", group: "HRM Suite", icon: FolderLock },
  { title: "OKR & Goals", url: "/hr/performance/goals", group: "HRM Suite", icon: Target },
  { title: "Asset Management", url: "/hr/assets", group: "HRM Suite", icon: HardDrive },
  { title: "Offboarding & Exit", url: "/hr/lifecycle/resignations", group: "HRM Suite", icon: LogOut },
  { title: "Notice Period Tracker", url: "/hr/lifecycle/resignations", group: "HRM Suite", icon: LogOut },
  { title: "Resignations", url: "/hr/lifecycle/resignations", group: "HRM Suite", icon: UserX },
  { title: "Terminations", url: "/hr/lifecycle/terminations", group: "HRM Suite", icon: ShieldAlert },
  { title: "Awards & Recognitions", url: "/hr/lifecycle/awards", group: "HRM Suite", icon: Trophy },
  { title: "Disciplinary Warnings", url: "/hr/lifecycle/warnings", group: "HRM Suite", icon: ShieldAlert },
  { title: "Biometric Hardware", url: "/hr/attendance/records", group: "HRM Suite", icon: Fingerprint },
  { title: "Biometric Device Agent", url: "/hr/attendance/records", group: "HRM Suite", icon: Fingerprint },
  { title: "Form Builder", url: "/forms", group: "HRM Suite", icon: FileSpreadsheet },
  { title: "Automation Rules", url: "/workflows", group: "HRM Suite", icon: Workflow },
  { title: "People Analytics", url: "/analytics", group: "HRM Suite", icon: BarChart3 },
  { title: "Add-ons", url: "/tenant/addon", group: "Extensions", icon: Store },
  { title: "WooCommerce Sync Hub", url: "/integrations", group: "E-Commerce", icon: Sparkles },
  { title: "Google Workspace", url: "/google-workspace", group: "Extensions", icon: Sparkles },
  { title: "Tally Prime Importer", url: "/tally-importer", group: "Finance", icon: Layers },
  { title: "WhatsApp Alerts", url: "/whatsapp-alerts", group: "Extensions", icon: MessageSquare },
  { title: "Razorpay Gateway", url: "/razorpay-gateway", group: "Extensions", icon: CreditCard },
  { title: "Strategy Studio (SWOT/PESTEL)", url: "/strategy-studio", group: "Strategy", icon: Target },
  { title: "AI Invoice OCR Reader", url: "/ai-ocr", group: "Extensions", icon: ScanLine },
  { title: "Company Notice Board", url: "/notice-board", group: "HRM Suite", icon: Megaphone },
  { title: "Internal Reminders", url: "/internal-reminders", group: "Extensions", icon: Bell },
  { title: "Two-Factor Authentication (Profile)", url: "/profile", group: "Platform", icon: ShieldCheck },
  { title: "Backup & Restore", url: "/backup-restore", group: "Platform", icon: Database },
  { title: "Activity Logs", url: "/activity-logs", group: "Platform", icon: History },
  { title: "Public REST API", url: "/public-api", group: "Extensions", icon: Code },
  { title: "Outbound Webhooks", url: "/addons/webhook/endpoints", group: "Extensions", icon: Webhook },
  { title: "AI Assistant", url: "/addons/ai-assistant/settings", group: "Extensions", icon: Bot },
  { title: "AI Document Studio", url: "/addons/ai-document/generate", group: "Extensions", icon: Sparkles },
  { title: "Planning Dashboard", url: "/addons/planning/dashboard", group: "Strategy", icon: Target },
  { title: "Strategic Challenges", url: "/addons/planning/challenges", group: "Strategy", icon: Target },
  { title: "Initiative Charters", url: "/addons/planning/charters", group: "Strategy", icon: FileText },
  { title: "Charters Kanban", url: "/addons/planning/charters/kanban", group: "Strategy", icon: Kanban },
  { title: "Suggestion Box", url: "/suggestion-box", group: "Extensions", icon: Lightbulb },
  { title: "SMS Gateway Integration", url: "/sms-gateway", group: "Extensions", icon: MessageSquare },
  { title: "Workspace Settings", url: "/settings", group: "Platform", icon: Settings },
  { title: "Primary Custom Domain", url: "/settings/custom-domain", group: "Platform", icon: Globe },
  { title: "Custom Fields", url: "/custom-fields", group: "Platform", icon: SlidersHorizontal },
  { title: "Marketing Campaigns", url: "/campaigns", group: "CRM & Growth", icon: Megaphone },
  { title: "Users & Roles", url: "/users", group: "Platform", icon: Users },
  { title: "Subscription & Plan", url: "/subscription", group: "Platform", icon: CreditCard },
  { title: "Tenant Administration", url: "/tenant/dashboard", group: "Platform", icon: Building2 },
  { title: "Tenant Users & Access", url: "/tenant/users", group: "Platform", icon: Users },
  { title: "Tenant Roles & Permissions", url: "/tenant/roles", group: "Platform", icon: ShieldCheck },
  { title: "Tenant Invoices & Billing", url: "/tenant/billing", group: "Platform", icon: Receipt },
  { title: "Tenant Custom Domains", url: "/tenant/domain", group: "Platform", icon: Globe },
  { title: "Tenant Integrations Hub", url: "/tenant/integrations", group: "Platform", icon: Sparkles },
  { title: "Tenant Data & Backups", url: "/tenant/data", group: "Platform", icon: Database },
  { title: "Storage Administration", url: "/tenant/files/storage", group: "Platform", icon: HardDrive },
  { title: "Tenant Security Audit Logs", url: "/tenant/audit-logs", group: "Platform", icon: History },
  { title: "Tenant Priority Support", url: "/tenant/support", group: "Platform", icon: HelpCircle },
  { title: "Ban IP Address", url: "/ban-ip-address", group: "Platform", icon: ShieldAlert },
  { title: "Clear Cache & Maintenance", url: "/clear-cache", group: "Platform", icon: RefreshCw },
  { title: "Cronjob Management", url: "/cronjob", group: "Platform", icon: Clock },
  { title: "Super Admin Console", url: "/super", group: "Platform", icon: ShieldCheck },
];

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { data: profile, isLoading, error: profileError, refetch: reloadProfile } = useCurrentProfile();
  const { loading } = useSession();
  const { branding, isDark } = useTenantBranding();
  const { appConfig } = useAppConfig();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  const userRoles = profile?.roles || [];
  const isSuperAdmin = isSuperAdminUser(profile);
  const isWorkspaceAdmin = isWorkspaceAdminUser(profile);
  const normalizedUserRoles = userRoles.map((r) => String(r).toLowerCase().replace(/[-_ ]/g, ""));
  const isTenantAdmin = isWorkspaceAdmin || normalizedUserRoles.some((r) => ["admin", "tenantadmin", "workspaceadmin", "organizationadmin", "owner"].includes(r));
  const isAdminOrSuper = isSuperAdmin || isWorkspaceAdmin || userRoles.some((r) =>
    ["admin", "super_admin", "tenant_admin", "hr_admin"].includes(r)
  );
  const isManager = userRoles.includes("manager");
  const canAccessPos = isModuleAllowed("pos", profile) || hasPermission("pos.terminal.view", profile) || hasPermission("pos.dashboard.view", profile);
  const isClientOnly = userRoles.includes("client") && !isAdminOrSuper;
  const isEmployeeOnly = (userRoles.includes("employee") || isManager) && !isAdminOrSuper;
  const isHrAdmin = userRoles.some((r) => ["hr_admin", "hr"].includes(r));

  const enabledModules = profile?.enabledModules || (profile as any)?.tenant?.enabledModules || [];

  const isPosEntitled = isSuperAdmin ||
    enabledModules.includes("pos") ||
    enabledModules.includes("product_pos") ||
    enabledModules.includes("inventory");

  const isFinanceEntitled = isSuperAdmin ||
    enabledModules.includes("accounting") ||
    enabledModules.includes("finance") ||
    enabledModules.includes("product_finance");

  const isCrmEntitled = isSuperAdmin ||
    enabledModules.includes("crm") ||
    enabledModules.includes("product_crm");

  const isHrmsEntitled = isSuperAdmin ||
    enabledModules.length === 0 ||
    enabledModules.includes("hrm") ||
    enabledModules.includes("hrms") ||
    enabledModules.includes("product_hrms");

  const isCrmRoute = isPathMatchingPrefixes(path, CRM_ROUTE_PREFIXES);
  const isPosRoute = isPathMatchingPrefixes(path, POS_ROUTE_PREFIXES);
  const isFinanceRoute = isPathMatchingPrefixes(path, FINANCE_ROUTE_PREFIXES);
  const isHrmsAdminRoute = isPathMatchingPrefixes(path, HRMS_ADMIN_ROUTE_PREFIXES);

  const { isEntitled, filterSearchItems } = useNavigationResolver();
  const isWooRoute = isPathMatchingPrefixes(path, ["/integrations"]);
  const isShopifyRoute = isPathMatchingPrefixes(path, ["/shopify"]);
  const isGoogleRoute = isPathMatchingPrefixes(path, ["/google-workspace"]);
  const isTallyRoute = isPathMatchingPrefixes(path, ["/tally-importer"]);
  const isWhatsappRoute = isPathMatchingPrefixes(path, ["/whatsapp-alerts"]);
  const isRazorpayRoute = isPathMatchingPrefixes(path, ["/razorpay-gateway"]);
  const isBiometricRoute = isPathMatchingPrefixes(path, ["/biometric", "/biometric-sync"]);
  const isStrategyRoute = isPathMatchingPrefixes(path, ["/strategy-studio"]);
  const isAiOcrRoute = isPathMatchingPrefixes(path, ["/ai-ocr"]);
  const isSmartReportsRoute = isPathMatchingPrefixes(path, ["/smart-reports"]);
  const isSmartDashboardRoute = isPathMatchingPrefixes(path, ["/smart-dashboard"]);
  const isAiAdvisorRoute = isPathMatchingPrefixes(path, ["/ai-business-advisor"]);
  const isIntegrationConfigRoute = isWooRoute || isShopifyRoute || isGoogleRoute || isTallyRoute || isWhatsappRoute || isRazorpayRoute;

  const homeRoute = isSuperAdmin
    ? "/super"
    : isTenantAdmin
      ? "/tenant/dashboard"
      : isClientOnly
      ? "/client-dashboard"
      : isEmployeeOnly
        ? "/me/dashboard"
        : isHrmsEntitled
          ? (isHrAdmin ? "/hr/dashboard" : "/hrm-dashboard")
          : isPosEntitled
            ? "/pos-dashboard"
            : isCrmEntitled
              ? "/crm-dashboard"
              : isFinanceEntitled
                ? "/finance-dashboard"
                : "/hrm-dashboard";
  const isPlatformOrShared = isPlatformOnlyRoute(path) || isSharedRoute(path);

  const { data: subscription, isLoading: isSubLoading, refetch: reloadSubscription } = useQuery({
    queryKey: ["workspace-subscription-shell", profile?.tenant_id],
    queryFn: () => api.get("/workspace/subscription"),
    enabled: !!profile?.tenant_id && !isSuperAdmin,
    staleTime: 5000,
    refetchOnMount: true,
  });

  const isSuspended = !isSuperAdmin && !!profile?.tenant_id && subscription?.status === "suspended";
  const isExpired =
    !isSuperAdmin &&
    !!profile?.tenant_id &&
    (subscription?.status === "expired" ||
      subscription?.isExpired === true ||
      (!!subscription?.expiresAt && new Date(subscription.expiresAt).getTime() < Date.now()));

  const { data: maintenanceStatus } = useQuery({
    queryKey: ["platform-maintenance-guard"],
    queryFn: () => api.get("/system/maintenance-status"),
    staleTime: 10000,
    refetchInterval: 15000,
  });

  const isMaintenanceActive =
    !isSuperAdmin &&
    (maintenanceStatus?.active === true || maintenanceStatus?.status === "active");

  const EMPLOYEE_ALLOWED_PREFIXES = [
    "/me",
    "/employee-dashboard",
    "/tenant/dashboard",
    "/hrm-dashboard",
    "/deals-dashboard",
    "/leads-dashboard",
    "/payroll-dashboard",
    "/recruitment-dashboard",
    "/attendance-dashboard",
    "/finance-dashboard",
    "/it-admin-dashboard",
    "/asset-dashboard",
    "/support-dashboard",
    "/help-desk-dashboard",
    "/inventory-dashboard",
    "/crm-dashboard",
    "/pos-dashboard",
    "/sales-dashboard",
    "/procurement-dashboard",
    "/project-dashboard",
    "/attendance",
    "/attendance-employee",
    "/leave",
    "/shifts",
    "/shift-swap-requests",
    "/overtime",
    "/work-from-home",
    "/tasks",
    "/employee-payslips",
    "/awards",
    "/okr",
    "/training",
    "/forms",
    "/documents",
    "/resignation",
    "/announcements",
    "/helpdesk",
    "/chat",
    "/todo",
    "/apps",
    "/expenses",
    "/assets",
    "/profile",
    "/manager-hub",
    "/daily-report",
    "/settings",
    "/clear-cache",
    "/offline",
    "/ui-",
    "/form-",
    "/tables-",
    "/chart-",
    "/data-tables",
  ];

  const CLIENT_ALLOWED_PREFIXES = [
    "/client-dashboard",
    "/invoices",
    "/projects",
    "/task-board",
    "/helpdesk",
    "/chat",
    "/portal",
    "/profile",
    "/clear-cache",
    "/offline",
  ];

  useEffect(() => {
    if (!loading && !isLoading && !getAuthToken()) {
      window.location.href = "/login";
      return;
    }
    if (!loading && !isLoading && profile && !profile.tenant_id) {
      if (isSuperAdmin) {
        if (!isPlatformOrShared && (path === "/hrm-dashboard" || path === "/dashboard" || path === "/")) {
          navigate({ to: "/super" });
        }
      } else {
        navigate({ to: "/onboarding" });
      }
      return;
    }

    // Role-based Deep Link Enforcement
    if (!loading && !isLoading && profile) {
      if (isEmployeeOnly) {
        const isAllowed = EMPLOYEE_ALLOWED_PREFIXES.some(
          (p) => path === p || path.startsWith(p + "/") || (p.endsWith("-") && path.startsWith(p))
        );
        if (!isAllowed) {
          navigate({ to: "/me/dashboard" });
          return;
        }
      }
      if (isClientOnly) {
        const isAllowed = CLIENT_ALLOWED_PREFIXES.some(
          (p) => path === p || path.startsWith(p + "/")
        );
        if (!isAllowed) {
          navigate({ to: "/client-dashboard" });
          return;
        }
      }
    }
  }, [loading, isLoading, profile, isSuperAdmin, isPlatformOrShared, isEmployeeOnly, isClientOnly, path, navigate]);

  // Sidebar collapse state with localStorage persistence
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("master_hrms_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Full View Dashboard mode state (hides sidebar completely for true full-width screen)
  const [fullView, setFullView] = useState<boolean>(() => {
    try {
      return localStorage.getItem("master_hrms_full_view") === "true";
    } catch {
      return false;
    }
  });

  // Browser native fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== "undefined" && !!document.fullscreenElement;
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [leavingImpersonation, setLeavingImpersonation] = useState(false);

  // Synchronize full-view, mini-sidebar classes on document.body and document.documentElement
  useEffect(() => {
    if (fullView) {
      document.body.classList.add("full-view", "full-width");
      document.documentElement.setAttribute("data-layout", "full-width");
      document.body.classList.remove("mini-sidebar", "expand-menu");
    } else {
      document.body.classList.remove("full-view", "full-width");
      document.documentElement.removeAttribute("data-layout");
      if (collapsed) {
        document.body.classList.add("mini-sidebar");
      } else {
        document.body.classList.remove("mini-sidebar", "expand-menu");
      }
    }
    try {
      localStorage.setItem("master_hrms_full_view", String(fullView));
      localStorage.setItem("master_hrms_sidebar_collapsed", String(collapsed));
    } catch {}
  }, [fullView, collapsed]);

  // Synchronize mobile slide-nav on document.body and html
  useEffect(() => {
    if (mobileOpen) {
      document.body.classList.add("slide-nav");
      document.documentElement.classList.add("menu-opened");
      document.body.style.overflow = "hidden";
    } else {
      document.body.classList.remove("slide-nav");
      document.documentElement.classList.remove("menu-opened");
      document.body.style.overflow = "";
    }
  }, [mobileOpen]);

  // Global keyboard shortcut: ⌘K for search, ⌘B for sidebar toggle, Escape for mobile drawer dismissal
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
      if ((e.key === "b" || e.key === "B") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setFullView((v) => !v);
      }
      if (e.key === "Escape" && mobileOpen) {
        e.preventDefault();
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [mobileOpen]);

  // Close mobile sidebar on route transition
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  // Auto-dismiss mobile drawer on viewport resize to desktop (>= 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const impersonationBannerRef = useRef<HTMLDivElement>(null);
  const isChatRoute = /^\/(hr\/chat|me\/chat|tenant\/chat|chat)(\/|$)/.test(path);

  useEffect(() => {
    if (isChatRoute && typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [isChatRoute, path]);

  useEffect(() => {
    const isImpersonating =
      typeof window !== "undefined" &&
      (localStorage.getItem("hrms_impersonation_active") === "true" ||
        localStorage.getItem("hrms_tenant_impersonation_active") === "true");
    if (!isImpersonating || !impersonationBannerRef.current) {
      document.documentElement.style.removeProperty("--impersonation-banner-height");
      return;
    }

    const updateHeight = () => {
      if (impersonationBannerRef.current) {
        const height = impersonationBannerRef.current.offsetHeight;
        document.documentElement.style.setProperty("--impersonation-banner-height", `${height}px`);
      }
    };

    updateHeight();

    const ro = new ResizeObserver(updateHeight);
    ro.observe(impersonationBannerRef.current);

    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--impersonation-banner-height");
    };
  }, []);

  // Enforce tenant subdomain routing: non-super-admin users on the root domain
  // are automatically redirected to {companySlug}.{domain}/{currentPath}
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!profile || !profile.tenant?.slug) return;
    if (isSuperAdminUser(profile)) return;

    const targetOrigin = resolveTenantSubdomainOrigin({
      tenantSlug: profile.tenant.slug,
    });
    if (!targetOrigin) return;

    const token = getAuthToken();
    const fullPath = `${window.location.pathname}${window.location.search}`;
    if (token) {
      window.location.href = `${targetOrigin}/auth?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(fullPath)}`;
    } else {
      window.location.href = `${targetOrigin}${fullPath}`;
    }
  }, [profile]);

  async function handleSignOut() {
    try { await api.post("/auth/logout"); } catch {}
    clearToken();
    localStorage.removeItem("auth_token");
    localStorage.removeItem("hrms_auth_token");
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("hrms_auth_token");
    navigate({ to: "/auth" });
  }

  if (profileError) {
    return (
      <WorkspaceUnavailableView
        error={profileError}
        onRetry={() => reloadProfile()}
        onSignOut={handleSignOut}
      />
    );
  }

  if (loading || isLoading || !profile) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!profile.tenant_id && !profile.roles?.includes("super_admin")) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
          <h2 className="text-base font-bold">Workspace Configuration Required</h2>
          <p className="text-xs text-muted-foreground">
            Please complete the organization onboarding setup to activate your dashboard.
          </p>
          <Button asChild size="sm" className="mt-2 text-xs font-bold">
            <Link to="/onboarding">Complete Setup Wizard</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 0. Maintenance Mode Guard: Restrict tenant application access during active maintenance
  if (isMaintenanceActive) {
    navigate({ to: "/maintenance" });
    return null;
  }

  // 1. Suspension Guard: Lock full workspace if tenant account is suspended
  if (isSuspended) {
    return (
      <SuspendedAccountView
        companyName={profile.tenant?.name || branding.name || "Workspace"}
        tenantId={profile.tenant_id ?? undefined}
        planName={subscription?.planName}
        suspensionReason={subscription?.suspensionReason}
        onSignOut={handleSignOut}
        onRefresh={() => reloadSubscription()}
      />
    );
  }

  // 2. Expiration Guard: Lock full workspace if subscription has expired (except /subscription renewal page)
  if (isExpired && path !== "/subscription") {
    return (
      <ExpiredSubscriptionView
        companyName={profile.tenant?.name || branding.name || "Workspace"}
        tenantId={profile.tenant_id ?? undefined}
        planName={subscription?.planName}
        expiryDate={subscription?.expiresAt}
        renewalUrl="/subscription"
        onSignOut={handleSignOut}
        onRefresh={() => reloadSubscription()}
      />
    );
  }

  const initials = (profile?.full_name || profile?.email || "U")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = (profile.roles?.[0] || "member").replace(/_/g, " ");

  const isImpersonating = typeof window !== "undefined" && localStorage.getItem("hrms_impersonation_active") === "true";
  const isTenantImpersonating =
    typeof window !== "undefined" &&
    localStorage.getItem("hrms_tenant_impersonation_active") === "true" &&
    Boolean(localStorage.getItem("hrms_tenant_admin_backup_token"));
  const impersonatedUserName =
    (typeof window !== "undefined" ? localStorage.getItem("hrms_tenant_impersonated_user_name") : null) ||
    profile?.full_name ||
    "User";
  const impersonatedUserEmail =
    (typeof window !== "undefined" ? localStorage.getItem("hrms_tenant_impersonated_user_email") : null) ||
    profile?.email ||
    "";
  const anyImpersonating = isImpersonating || isTenantImpersonating;
  const impersonatedTenantName =
    (typeof window !== "undefined" ? localStorage.getItem("hrms_impersonated_tenant_name") : null) ||
    profile?.tenant?.name ||
    "Workspace";

  function handleReturnToTenantPortal() {
    const backup = localStorage.getItem("hrms_tenant_admin_backup_token");
    if (!backup) {
      toast.error("Tenant Admin return session not found. Please sign in again.");
      return;
    }
    setToken(backup);
    localStorage.setItem("auth_token", backup);
    localStorage.setItem("token", backup);
    localStorage.setItem("master_hrms_token", backup);
    localStorage.removeItem("hrms_tenant_impersonation_active");
    localStorage.removeItem("hrms_tenant_admin_backup_token");
    localStorage.removeItem("hrms_tenant_impersonated_user_name");
    localStorage.removeItem("hrms_tenant_impersonated_user_email");
    toast.success("Returned to Tenant Portal.");
    window.location.href = "/tenant/users";
  }


  async function handleLeaveImpersonation() {
    setLeavingImpersonation(true);
    try {
      const res = await api.post("/super/leave-impersonation");
      if (res?.token) {
        setToken(res.token);
      } else {
        const backup = localStorage.getItem("hrms_super_admin_backup_token");
        if (backup) setToken(backup);
      }
      localStorage.removeItem("hrms_impersonation_active");
      localStorage.removeItem("hrms_impersonated_tenant_name");
      localStorage.removeItem("hrms_super_admin_backup_token");
      toast.success("Exited impersonation. Returned to Super Admin console.");
      window.location.href = "/super";
    } catch (e: any) {
      const backup = localStorage.getItem("hrms_super_admin_backup_token");
      if (backup) {
        setToken(backup);
        localStorage.removeItem("hrms_impersonation_active");
        localStorage.removeItem("hrms_impersonated_tenant_name");
        localStorage.removeItem("hrms_super_admin_backup_token");
        window.location.href = "/super";
      } else {
        toast.error(e.message || "Failed to exit impersonation");
      }
    } finally {
      setLeavingImpersonation(false);
    }
  }

  return (
    <div
      className={cn(
        "main-wrapper min-h-screen w-full relative bg-background",
        mobileOpen && "slide-nav",
        !fullView && collapsed && "mini-sidebar",
        fullView && "full-view full-width",
        anyImpersonating && "has-impersonation-banner"
      )}
    >
      {/* Super Admin Impersonation Banner */}
      {isImpersonating && (
        <div
          ref={impersonationBannerRef}
          className="impersonation-top-banner bg-amber-600 dark:bg-amber-700 text-white px-3 sm:px-4 py-2 flex items-center justify-between gap-3 text-xs font-semibold shadow-md"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="size-2 rounded-full bg-white animate-ping shrink-0" />
            <span className="leading-snug">
              SUPER ADMIN IMPERSONATION: Acting as administrator for{" "}
              <strong className="underline underline-offset-2">{impersonatedTenantName}</strong>. Actions affect this tenant&apos;s live database.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px] font-bold px-2.5 py-0 bg-white text-amber-700 hover:bg-slate-100 border-none shadow-xs shrink-0 cursor-pointer"
            onClick={handleLeaveImpersonation}
            disabled={leavingImpersonation}
          >
            {leavingImpersonation ? <Loader2 className="size-3 animate-spin mr-1" /> : <LogOut className="size-3 mr-1" />}
            Exit Impersonation
          </Button>
        </div>
      )}

      {/* Tenant Admin Login-As-User Exit Banner */}
      {!isImpersonating && isTenantImpersonating && (
        <div
          ref={impersonationBannerRef}
          className="impersonation-top-banner bg-primary text-primary-foreground px-3 sm:px-4 py-2 flex items-center justify-between gap-3 text-xs font-semibold shadow-md"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="size-2 rounded-full bg-white animate-pulse shrink-0" />
            <span className="leading-snug truncate">
              Logged in as <strong>{impersonatedUserName}</strong>
              {impersonatedUserEmail ? ` (${impersonatedUserEmail})` : ""} — Viewing user portal as Tenant Admin.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] font-bold px-3 py-0 bg-white text-slate-900 hover:bg-slate-100 border-none shadow-xs shrink-0 cursor-pointer gap-1.5"
            onClick={handleReturnToTenantPortal}
          >
            <i className="ph-bold ph-arrow-u-up-left text-xs" />
            Back to Tenant Portal
          </Button>
        </div>
      )}

      {/* Master HRMS Sidenav */}
      <DreamsSidebar
        profile={profile}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        fullView={fullView}
        onToggleFullView={() => setFullView((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Topbar Header */}
      <header className="navbar-header flex items-center max-lg:w-full h-16 border-b border-border/50 bg-card/95 backdrop-blur-md transition-colors">
        <div className="topbar-menu flex items-center justify-between w-full gap-2 px-1 sm:px-2 flex-nowrap">
          {/* Left section: mobile hamburger + mobile brand logo + desktop collapse toggle + workspace */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Sidenav Hamburger Button */}
            <button
              type="button"
              id="mobile_btn"
              className="mobile-btn lg:hidden flex items-center justify-center size-9 rounded-xl border border-border/70 bg-card hover:bg-muted/70 text-foreground shadow-2xs cursor-pointer transition-colors"
              onClick={() => setMobileOpen((m) => !m)}
              aria-label="Toggle Navigation Menu"
            >
              <i className="ph-duotone ph-list text-xl"></i>
            </button>

            {/* Mobile Brand Logo (Visible only on mobile / tablet < 992px) */}
            <Link to={homeRoute} className="logo lg:hidden flex items-center gap-1.5 shrink-0">
              <img
                src={branding.activeLogo || (isDark ? (branding.logoDark || "/white-logo.webp") : (branding.logoUrl || "/logo.webp"))}
                alt={branding.name || "Master Platform"}
                className="h-7 max-h-7 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = isDark ? "/white-logo.webp" : "/logo.webp";
                }}
                loading="lazy"
              />
            </Link>

            {/* Single Desktop Full Sidebar / Mini Sidebar Toggle Button */}
            <button
              type="button"
              id="toggle_btn2"
              onClick={() => {
                const currentLayout =
                  typeof document !== "undefined"
                    ? document.documentElement.getAttribute("data-layout")
                    : null;
                const isCurrentlyCollapsed =
                  fullView || collapsed || currentLayout === "mini" || currentLayout === "hidden";

                if (isCurrentlyCollapsed) {
                  setFullView(false);
                  setCollapsed(false);
                  if (typeof document !== "undefined") {
                    document.documentElement.setAttribute("data-layout", "full-width");
                    document.body.classList.remove("mini-sidebar", "expand-menu");
                  }
                } else {
                  setFullView(false);
                  setCollapsed(true);
                  if (typeof document !== "undefined") {
                    document.documentElement.setAttribute("data-layout", "mini");
                    document.body.classList.add("mini-sidebar");
                    document.body.classList.remove("expand-menu");
                  }
                }
              }}
              className={cn(
                "sidenav-toggle-btn topbar-link shrink-0 size-8.5 text-[18px] hidden lg:flex items-center justify-center rounded-xl border transition-all cursor-pointer shadow-2xs",
                collapsed
                  ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                  : "bg-card border-border/70 hover:bg-muted/70 text-foreground"
              )}
              aria-label="Toggle Sidebar Mini Rail"
              title={collapsed ? "Expand Sidebar to Full Width (252px)" : "Collapse Sidebar to Mini Rail (76px)"}
            >
              <i className={cn("ph-duotone", collapsed ? "ph-arrow-line-right" : "ph-arrow-line-left")}></i>
            </button>

            {/* Active Company / Workspace Brand Logo & Selector (Desktop >= 1024px) */}
            {isWorkspaceAdmin ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="header-item hidden lg:flex relative company-dropdown me-auto cursor-pointer">
                    <div className="bg-card border border-border/70 rounded-xl py-1 px-3 flex items-center justify-between gap-2.5 shadow-2xs hover:border-primary/40 hover:bg-muted/40 transition-colors">
                      <img
                        src={branding.activeLogo || (isDark ? (branding.logoDark || "/white-logo.webp") : (branding.logoUrl || "/logo.webp"))}
                        alt={branding.name || "Workspace"}
                        className="h-6 max-h-6 w-auto object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = isDark ? "/white-logo.webp" : "/logo.webp";
                        }}
                        loading="lazy"
                      />
                      <i className="ph-duotone ph-caret-down text-xs text-muted-foreground"></i>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60 p-2 rounded-xl border border-border/70 shadow-md font-sans" align="start">
                  <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    Active Workspace
                  </DropdownMenuLabel>
                  <DropdownMenuItem className="flex items-center gap-2 p-2 rounded-lg font-medium text-xs">
                    <img
                      src={branding.activeLogo || (isDark ? (branding.logoDark || "/white-logo.webp") : (branding.logoUrl || "/logo.webp"))}
                      alt="Tenant"
                      className="h-5 max-h-5 w-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = isDark ? "/white-logo.webp" : "/logo.webp";
                      }}
                      loading="lazy"
                    />
                    <span className="truncate text-muted-foreground text-[11px]">{profile.tenant?.name || branding.name || "Workspace"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2 p-2 cursor-pointer text-xs rounded-lg hover:bg-muted/60 transition-colors">
                      <Settings className="size-3.5 text-muted-foreground" />
                      <span>Workspace Settings</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="header-item hidden lg:flex relative me-auto">
                <div className="bg-card border border-border/70 rounded-xl py-1 px-3 flex items-center gap-2 shadow-2xs">
                  <img
                    src={branding.activeLogo || (isDark ? (branding.logoDark || "/white-logo.webp") : (branding.logoUrl || "/logo.webp"))}
                    alt={branding.name || "Workspace"}
                    className="h-6 max-h-6 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = isDark ? "/white-logo.webp" : "/logo.webp";
                    }}
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right section items */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {/* Quick POS Terminal Button (Role & Module Gated - Desktop >= 1024px) */}
            {canAccessPos && (
              <Link
                to="/pos"
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs transition-colors shrink-0"
                title="Open POS Terminal"
              >
                <i className="ph-duotone ph-shopping-cart text-sm"></i>
                <span>POS Register</span>
              </Link>
            )}

            {/* Customer Display New Window Launch (Role & Module Gated) */}
            {canAccessPos && (
              <a
                href="/customer-display"
                target="_blank"
                rel="noopener noreferrer"
                className="header-item topbar-link hidden xl:flex items-center justify-center size-8.5 rounded-xl border border-border/70 bg-card hover:bg-muted/70 text-foreground shadow-2xs transition-colors"
                title="Open Dual Customer Display in New Window"
              >
                <i className="ph-duotone ph-monitor text-base"></i>
              </a>
            )}

            {/* Global Search Trigger Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="header-item flex items-center gap-2 px-3 py-1.5 h-8.5 rounded-xl border border-border/70 bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground text-xs transition-colors shadow-2xs cursor-pointer"
              aria-label="Global Search"
            >
              <i className="ph-duotone ph-magnifying-glass text-sm"></i>
              <span className="hidden md:inline font-medium">Search...</span>
              <kbd className="hidden sm:inline-flex pointer-events-none h-4.5 items-center gap-0.5 rounded-md border border-border/60 bg-background px-1.5 font-mono text-[9px] font-semibold text-muted-foreground shadow-2xs">⌘K</kbd>
            </button>

            {/* Realtime Notification Drawer */}
            <div className="header-item">
              <RealtimeNotificationDrawer />
            </div>

            {/* Chat Quick Link */}
            <div className="header-item hidden sm:flex">
              <Link
                to={isAdminOrSuper ? "/hr/chat" : "/me/chat"}
                className="topbar-link flex items-center justify-center size-8.5 rounded-xl border border-border/70 bg-card hover:bg-muted/70 text-foreground shadow-2xs transition-colors"
                title="Team Chat"
              >
                <i className="ph-duotone ph-chats-circle text-base"></i>
              </Link>
            </div>

            {/* Full View Canvas Toggle (Hide / Show Sidebar) */}
            <div className="header-item hidden lg:flex">
              <button
                type="button"
                id="btn_full_view"
                onClick={() => setFullView((v) => !v)}
                className={cn(
                  "topbar-link flex items-center justify-center size-8.5 rounded-xl border transition-all cursor-pointer shadow-2xs",
                  fullView
                    ? "bg-primary text-white border-primary hover:bg-primary/90"
                    : "bg-card border-border/70 hover:bg-muted/70 text-foreground"
                )}
                title={fullView ? "Exit Full View (Show Sidebar) (⌘B)" : "Full View Canvas (Hide Sidebar) (⌘B)"}
                aria-label="Toggle Full View Canvas"
              >
                <i className={cn("text-base ph-duotone", fullView ? "ph-sidebar-simple" : "ph-arrows-out-line-horizontal")}></i>
              </button>
            </div>

            {/* Native Fullscreen / Full View Screen Toggle */}
            <div className="header-item hidden lg:flex">
              <button
                type="button"
                id="btn_fullscreen"
                onClick={toggleBrowserFullscreen}
                className="topbar-link flex items-center justify-center size-8.5 rounded-xl border border-border/70 bg-card hover:bg-muted/70 text-foreground shadow-2xs cursor-pointer transition-colors"
                title={isFullscreen ? "Exit Fullscreen (Esc)" : "Full View Screen (Fullscreen)"}
                aria-label="Toggle Fullscreen"
              >
                <i className={cn("text-base ph-duotone", isFullscreen ? "ph-arrows-in" : "ph-arrows-out")}></i>
              </button>
            </div>

            {/* Light / Dark Mode Toggle */}
            <div className="header-item">
              <ThemeToggle />
            </div>

            {/* User Profile Dropdown */}
            <div className="profile-dropdown">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all p-0.5 cursor-pointer"
                    aria-label="User Profile"
                  >
                    <Avatar className="size-8">
                      <AvatarImage src={profile.avatar_url || "/favicon.webp"} alt={profile.full_name || "User"} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 p-3 rounded-2xl border border-border/70 shadow-lg font-sans" align="end" forceMount>
                  <DropdownMenuLabel className="p-1">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 ring-2 ring-primary/20">
                        <AvatarImage src={profile.avatar_url || "/favicon.webp"} alt={profile.full_name || "User"} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-bold leading-tight truncate text-foreground">{profile.full_name || "User"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{profile.email}</p>
                        <div className="flex items-center gap-1 pt-0.5">
                          <Badge variant="outline" className="text-[9px] capitalize font-bold py-0 h-4 px-1.5 bg-primary/5 text-primary border-primary/20">
                            {roleLabel}
                          </Badge>
                          <Badge variant="secondary" className="text-[9px] py-0 h-4 px-1.5 truncate max-w-[90px]">
                            {profile.tenant?.name || branding.name || "Workspace"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-2" />

                  {/* 2FA Security Status Indicator */}
                  <div className="px-2.5 py-1.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] flex items-center justify-between mb-1">
                    <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-primary" />
                      2FA Status
                    </span>
                    {profile.twoFactorEnabled ? (
                      <Link to="/profile">
                        <Badge variant="outline" className="text-[10px] font-bold py-0 h-4 px-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 cursor-pointer">
                          ● Enabled
                        </Badge>
                      </Link>
                    ) : (
                      <Link to="/profile">
                        <Badge variant="outline" className="text-[10px] font-bold py-0 h-4 px-1.5 border-amber-500/40 text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer">
                          ○ Setup Required
                        </Badge>
                      </Link>
                    )}
                  </div>

                  <DropdownMenuItem asChild>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2.5 cursor-pointer py-1.5 text-xs font-medium rounded-lg hover:bg-muted/60 transition-colors"
                    >
                      <User className="size-3.5 text-muted-foreground" />
                      <span>Profile Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2.5 cursor-pointer py-1.5 text-xs font-medium rounded-lg hover:bg-muted/60 transition-colors">
                      <ShieldCheck className="size-3.5 text-emerald-500" />
                      <span>Security &amp; 2FA</span>
                    </Link>
                  </DropdownMenuItem>

                  {/* Administration Options - Workspace Admins Only */}
                  {isWorkspaceAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/tenant/settings" className="flex items-center gap-2.5 cursor-pointer py-1.5 text-xs font-medium rounded-lg hover:bg-muted/60 transition-colors">
                          <Settings className="size-3.5 text-muted-foreground" />
                          <span>Workspace Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/subscription" className="flex items-center gap-2.5 cursor-pointer py-1.5 text-xs font-medium rounded-lg hover:bg-muted/60 transition-colors">
                          <CreditCard className="size-3.5 text-muted-foreground" />
                          <span>Subscription & Plan</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {profile.roles?.includes("super_admin") && (
                    <>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem asChild>
                        <Link to="/super" className="flex items-center gap-2.5 cursor-pointer py-2 text-purple-600 dark:text-purple-400 font-semibold rounded-lg hover:bg-muted/60 transition-colors">
                          <ShieldCheck className="size-4" />
                          <span>Super Admin Console</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2.5 cursor-pointer text-destructive focus:text-destructive py-2 rounded-lg hover:bg-destructive/10 transition-colors">
                    <LogOut className="size-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Wrapper */}
      <div className={cn("page-wrapper flex flex-col justify-between bg-background", isChatRoute && "chat-page-wrapper")}>
        <main className={cn("content min-w-0 flex-1 bg-background", isChatRoute && "chat-page-content")}>
          {isSuperAdmin && !profile?.tenant_id && !isPlatformOrShared ? (
            <AccessDenied
              moduleName="Tenant Workspace"
              message="Platform Super Administrators are restricted from accessing tenant-only workspaces. Please switch to the Platform Super Admin Console or sign in with authorized tenant credentials."
            />
          ) : isIntegrationConfigRoute && !isAdminOrSuper ? (
            <AccessDenied
              moduleName="Integration Management"
              message="Your current user role does not have administrative permissions to configure workspace connectors."
            />
          ) : isWooRoute && !isEntitled("woocommerce-sync") && !isEntitled("woocommerce-hub") ? (
            <AddonNotInstalled
              addonName="WooCommerce Sync"
              addonSlug="woocommerce-sync"
              category="E-Commerce"
              description="Your workspace does not have an active installation of the WooCommerce integration add-on. Please install or enable it from the Add-ons Marketplace."
            />
          ) : isShopifyRoute && !isEntitled("shopify-sync") ? (
            <AddonNotInstalled
              addonName="Shopify Sync"
              addonSlug="shopify-sync"
              category="E-Commerce"
              description="Your workspace does not have an active installation of the Shopify Sync add-on. Please install or enable it from the Add-ons Marketplace."
            />
          ) : isGoogleRoute && !isEntitled("google-workspace-integration") ? (
            <ProductNotSubscribed
              productName="Google Workspace Integration"
              moduleKey="google-workspace-integration"
              description="Your workspace does not have an active entitlement for the Google Workspace integration add-on. Please install or assign it from the Add-ons Marketplace."
            />
          ) : isTallyRoute && !isEntitled("tally-importer") ? (
            <ProductNotSubscribed
              productName="Tally Prime Importer"
              moduleKey="tally-importer"
              description="Your workspace does not have an active entitlement for the Tally Prime Importer integration add-on. Please install or assign it from the Add-ons Marketplace."
            />
          ) : isWhatsappRoute && !isEntitled("whatsapp-alerts") ? (
            <ProductNotSubscribed
              productName="WhatsApp Business Alerts"
              moduleKey="whatsapp-alerts"
              description="Your workspace does not have an active entitlement for the WhatsApp Alerts integration add-on. Please install or assign it from the Add-ons Marketplace."
            />
          ) : isRazorpayRoute && !isEntitled("razorpay-gateway") ? (
            <ProductNotSubscribed
              productName="Razorpay Payment Gateway"
              moduleKey="razorpay-gateway"
              description="Your workspace does not have an active entitlement for the Razorpay Gateway integration add-on. Please install or assign it from the Add-ons Marketplace."
            />
          ) : isBiometricRoute && !isEntitled("biometric-sync") ? (
            <ProductNotSubscribed
              productName="Biometric Hardware Cloud Sync"
              moduleKey="biometric-sync"
              description="Your workspace does not have an active entitlement for the Biometric Sync integration add-on. Please install or assign it from the Add-ons Marketplace."
            />
          ) : isStrategyRoute && !isEntitled("swot") && !isEntitled("pestel") ? (
            <ProductNotSubscribed
              productName="Strategy Studio"
              moduleKey="swot"
              description="Your workspace does not have an active entitlement for Strategy Studio (SWOT & PESTEL). Please install or assign it from the Add-ons Marketplace."
            />
          ) : isAiOcrRoute && !isEntitled("ai-ocr") ? (
            <ProductNotSubscribed
              productName="AI Invoice OCR"
              moduleKey="ai-ocr"
              description="Your workspace does not have an active entitlement for the AI Invoice OCR reader. Please install or assign it from the Add-ons Marketplace."
            />
          ) : isSmartReportsRoute && !isEntitled("smart-reports") ? (
            <AddonNotInstalled
              addonName="Executive Smart Reports"
              addonSlug="smart-reports"
              category="Analytics"
              description="Your workspace does not have an active installation of Executive Smart Reports. Please install or enable it from the Add-ons Marketplace."
            />
          ) : isSmartDashboardRoute && !isEntitled("smart-dashboard") ? (
            <AddonNotInstalled
              addonName="Smart Dashboard Analytics"
              addonSlug="smart-dashboard"
              category="Analytics"
              description="Your workspace does not have an active installation of Smart Dashboard Analytics. Please install or enable it from the Add-ons Marketplace."
            />
          ) : isAiAdvisorRoute && !isEntitled("ai-business-advisor") ? (
            <AddonNotInstalled
              addonName="AI Business Advisor"
              addonSlug="ai-business-advisor"
              category="AI"
              description="Your workspace does not have an active installation of AI Business Advisor. Please install or enable it from the Add-ons Marketplace."
            />
          ) : isCrmRoute && !isCrmEntitled ? (
            <ProductNotSubscribed
              productName="Sales CRM & Pipeline Suite"
              moduleKey="crm"
              description="Your workspace does not have an active subscription for the Sales CRM product suite. Please upgrade your plan or activate product_crm to unlock Deals, Pipelines, Contacts, and Campaigns."
            />
          ) : isPosRoute && !isPosEntitled ? (
            <ProductNotSubscribed
              productName="Point of Sale & Inventory"
              moduleKey="pos"
              description="Your workspace does not have an active subscription for Point of Sale & Inventory. Please upgrade your plan or activate product_pos to unlock the POS terminal, Stock Management, and Procurement."
            />
          ) : isFinanceRoute && !isFinanceEntitled ? (
            <ProductNotSubscribed
              productName="Accounting & Financial Ledgers"
              moduleKey="finance"
              description="Your workspace does not have an active subscription for Financial Accounting. Please upgrade your plan or activate product_finance to unlock General Ledgers, Invoices, and Budgets."
            />
          ) : isHrmsAdminRoute && !isHrmsEntitled ? (
            <ProductNotSubscribed
              productName="HRMS Administration Suite"
              moduleKey="hrms"
              description="Your workspace does not have an active subscription for the Human Resource Management suite. Please upgrade your plan or activate product_hrms to access HR management."
            />
          ) : (
            children
          )}
        </main>
        {!isChatRoute && (
          <footer className="mt-auto py-3 px-6 border-t border-border-color/60 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2" data-testid="workspace-footer">
            <span data-testid="workspace-footer-text">
              {branding.footerText && !branding.footerText.includes("Apex HRMS") && !branding.footerText.includes("Persisted Forever")
                ? branding.footerText
                : (appConfig.footerText && !appConfig.footerText.includes("Apex HRMS") && !appConfig.footerText.includes("Persisted Forever")
                    ? appConfig.footerText
                    : `© ${new Date().getFullYear()} Webfamily Tech Solutions. All rights reserved.`)}
            </span>
            <span>{branding.name || appConfig.appName}</span>
          </footer>
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      <div
        className={cn("sidebar-overlay cursor-pointer", mobileOpen && "opened")}
        onClick={() => setMobileOpen(false)}
      />

      {/* ⌘K Global Search Dialog (Strictly RBAC-Scoped + Exact-Match-First Ranking) */}
      <CommandDialog
        open={searchOpen}
        onOpenChange={(open) => {
          setSearchOpen(open);
          if (!open) setSearchQuery("");
        }}
        commandProps={{ shouldFilter: false }}
      >
        <CommandInput
          value={searchQuery}
          onValueChange={setSearchQuery}
          placeholder={
            isEmployeeOnly
              ? "Search your dashboard, payslips, attendance, leaves, profile..."
              : "Search allowed workspace modules and pages..."
          }
        />
        <CommandList className="max-h-[380px]">
          {(() => {
            const SUPER_ONLY_URLS = ["/super", "/ban-ip-address", "/clear-cache", "/cronjob"];
            const sourceList = isEmployeeOnly
              ? EMPLOYEE_SELF_SERVICE_SEARCH_ITEMS
              : isClientOnly
              ? [
                  { title: "Client Dashboard", url: "/client-dashboard", group: "Employee Self-Service", icon: Home },
                  { title: "My Profile & 2FA", url: "/profile", group: "Employee Self-Service", icon: User },
                ]
              : [...EMPLOYEE_SELF_SERVICE_SEARCH_ITEMS, ...filterSearchItems(ALL_SEARCH_ITEMS)];

            const seenUrls = new Set<string>();
            const roleScopedItems = sourceList.filter((i) => {
              if (seenUrls.has(i.url)) return false;

              // Never expose Super Admin pages to non-Super-Admin users
              if (!isSuperAdmin && (i.url.startsWith("/super") || SUPER_ONLY_URLS.includes(i.url))) {
                return false;
              }

              // HR-only admins (without Tenant/Super Admin) should not see Tenant infrastructure/billing routes
              if (
                isHrAdmin &&
                !isTenantAdmin &&
                !isSuperAdmin &&
                (i.url.startsWith("/tenant/") || ["/users", "/subscription", "/backup-restore", "/settings/custom-domain"].includes(i.url))
              ) {
                return false;
              }

              seenUrls.add(i.url);
              return true;
            });

            const q = searchQuery.trim().toLowerCase();

            // When user types a query: rank Exact Match first, then Starts-With, Word Match, Substring, and Relevant Matches
            if (q) {
              const tokens = q.split(/\s+/).filter(Boolean);

              const scoreItem = (item: (typeof roleScopedItems)[number]): number => {
                const title = item.title.toLowerCase();
                const url = item.url.toLowerCase();
                const urlClean = url.replace(/^\/+/, "");
                const group = item.group.toLowerCase();
                const titleWords = title.split(/[\s/&_-]+/).filter(Boolean);
                const urlSegments = urlClean.split(/[/_-]+/).filter(Boolean);

                // Tier 1: Exact match on title or URL slug
                if (title === q || url === q || urlClean === q) {
                  return 1000;
                }
                // Tier 2: Title starts with exact query (shorter/closer title wins)
                if (title.startsWith(q)) {
                  return 850 + Math.max(0, 50 - (title.length - q.length));
                }
                // Tier 3: Exact word match in title or URL segment
                if (titleWords.includes(q) || urlSegments.includes(q)) {
                  return 700 + Math.max(0, 40 - title.length);
                }
                // Tier 4: Any word in title or URL starts with query
                if (titleWords.some((w) => w.startsWith(q)) || urlSegments.some((s) => s.startsWith(q))) {
                  return 550 + Math.max(0, 30 - title.length);
                }
                // Tier 5: Contiguous substring in title
                if (title.includes(q)) {
                  return 400 + Math.max(0, 20 - title.indexOf(q));
                }
                // Tier 6: Contiguous substring in URL
                if (url.includes(q)) {
                  return 300;
                }
                // Tier 7: Multi-word query where every token appears in title, URL, or group
                if (tokens.length > 1) {
                  const haystack = `${title} ${url} ${group}`;
                  if (tokens.every((t) => haystack.includes(t))) {
                    return 220;
                  }
                }
                // Tier 8: Group name match
                if (group.includes(q)) {
                  return 150;
                }
                // Tier 9: Ordered subsequence fallback (only for queries >= 2 chars)
                if (q.length >= 2) {
                  let qi = 0;
                  for (let i = 0; i < title.length && qi < q.length; i++) {
                    if (title[i] === q[qi]) qi++;
                  }
                  if (qi === q.length) return 60;
                }
                return 0;
              };

              const ranked = roleScopedItems
                .map((item) => ({ item, score: scoreItem(item) }))
                .filter((entry) => entry.score > 0)
                .sort((a, b) => {
                  if (b.score !== a.score) return b.score - a.score;
                  if (a.item.title.length !== b.item.title.length) {
                    return a.item.title.length - b.item.title.length;
                  }
                  return a.item.title.localeCompare(b.item.title);
                });

              if (ranked.length === 0) {
                return <CommandEmpty>No matching pages found for your role.</CommandEmpty>;
              }

              const exactMatches = ranked.filter((r) => r.score >= 850);
              const relevantMatches = ranked.filter((r) => r.score < 850);

              const renderSearchRow = (entry: (typeof ranked)[number], isExact: boolean) => {
                const { item } = entry;
                return (
                  <CommandItem
                    key={item.url}
                    value={`${item.title} ${item.url} ${item.group}`}
                    onSelect={() => {
                      setSearchOpen(false);
                      setSearchQuery("");
                      navigate({ to: item.url });
                    }}
                    className="flex items-center justify-between gap-2 cursor-pointer py-2 px-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <item.icon className="size-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{item.title}</span>
                      {isExact && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                          {entry.score >= 1000 ? "Exact" : "Top Match"}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 shrink-0">{item.url}</span>
                  </CommandItem>
                );
              };

              return (
                <>
                  {exactMatches.length > 0 && (
                    <CommandGroup heading="Exact & Top Matches">
                      {exactMatches.map((entry) => renderSearchRow(entry, true))}
                    </CommandGroup>
                  )}
                  {relevantMatches.length > 0 && (
                    <CommandGroup heading={exactMatches.length > 0 ? "Next Relevant Matches" : "Relevant Matches"}>
                      {relevantMatches.map((entry) => renderSearchRow(entry, false))}
                    </CommandGroup>
                  )}
                </>
              );
            }

            const groups = isEmployeeOnly
              ? ["Employee Self-Service", "Collaboration"]
              : [
                  "Employee Self-Service",
                  "HRM Suite",
                  "ERP Core",
                  "Sales & Finance",
                  "Collaboration",
                  "Extensions",
                  "Platform",
                ];

            return groups.map((group) => {
              const items = roleScopedItems.filter((i) => i.group === group);
              if (!items.length) return null;
              return (
                <CommandGroup key={group} heading={group}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.url}
                      value={`${item.title} ${item.url} ${item.group}`}
                      onSelect={() => {
                        setSearchOpen(false);
                        setSearchQuery("");
                        navigate({ to: item.url });
                      }}
                      className="flex items-center justify-between gap-2 cursor-pointer py-2 px-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className="size-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{item.title}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground/70 shrink-0">{item.url}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            });
          })()}
        </CommandList>
      </CommandDialog>

      {/* Expiry Warning Popup (Dismissible with threshold persistence) */}
      {!isSuperAdmin && profile?.tenant_id && subscription?.expiresAt && !isExpired && !isSuspended && (
        <SubscriptionWarningPopup
          tenantId={profile.tenant_id}
          planName={subscription.planName}
          expiresAt={subscription.expiresAt}
          renewalUrl="/subscription"
        />
      )}

      {/* Persistent Footer-side Warning Bar */}
      {!isSuperAdmin && profile?.tenant_id && subscription?.expiresAt && !isExpired && !isSuspended && (
        <SubscriptionFooterBar
          planName={subscription.planName}
          expiresAt={subscription.expiresAt}
          renewalUrl="/subscription"
        />
      )}

      {/* AI Copilot Widget */}
      {!isChatRoute && <AICopilotWidget />}
    </div>
  );
}

