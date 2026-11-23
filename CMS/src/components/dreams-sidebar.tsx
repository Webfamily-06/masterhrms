import { Link, useRouterState } from "@/lib/router-compat";
import React, { useState, useEffect, Fragment, useMemo } from "react";
import type { ProfileWithRoles } from "@/lib/session";
import { isModuleAllowed, isWorkspaceAdminUser } from "@/lib/permissions";
import { useTenantBranding } from "@/lib/useTenantBranding";
import { useNavigationResolver } from "@/lib/navigation-resolver";
import {
  resolveStandaloneModules,
  resolveIntegratedAddons,
  resolveExtensionItems,
} from "@/lib/addon-navigation";
import { hrSidebar, filterHRSidebar, HRMenuItem } from "@/nav/hr-sidebar";
import { employeeSidebar, filterEmployeeSidebar, EmployeeMenuItem, EmployeeMenuSection } from "@/nav/employee-sidebar";
import { cn } from "@/lib/utils";

const EMPLOYEE_SUBMENU_KEY_MAP: Record<string, string> = {
  Organization: "meOrg",
  Attendance: "meAttendance",
  "Attendance & Time Management": "meAttendance",
  "Leave Management": "meLeave",
  Recruitment: "meRecruitment",
  "Recruitment & Career": "meRecruitment",
  "Employee Lifecycle": "meLifecycle",
  Performance: "mePerformance",
  "Performance Management": "mePerformance",
  Training: "meTraining",
  "Training & Development": "meTraining",
  Payroll: "mePayroll",
  "Payroll & Finance": "mePayroll",
  Assets: "meAssets",
  Meetings: "meMeetings",
  "Meetings & Collaboration": "meMeetings",
  Documents: "meDocs",
  "Documents & Files": "meDocs",
  "Documents & Contracts": "meDocs",
  "Media Library": "meMedia",
  Chat: "meChat",
};

const HR_SUBMENU_KEY_MAP: Record<string, string> = {
  Approval: "hrApprovals",
  Approvals: "hrApprovals",
  Organization: "hrOrg",
  Attendance: "hrAttendance",
  "Leave Management": "hrLeave",
  Recruitment: "hrRecruitment",
  "Employee Lifecycle": "hrLifecycle",
  Performance: "hrPerformance",
  Training: "hrTraining",
  Payroll: "hrPayroll",
  Assets: "hrAssets",
  Meetings: "hrMeetings",
  "Company Documents": "hrDocs",
  "Strategic Planning": "hrPlanning",
  Applications: "hrApps",
  Chat: "hrAppsChat",
  Scrumboard: "hrAppsScrum",
  "Todo & Tasks": "hrAppsTodo",
  Settings: "hrSettings",
  "Settings & Administration": "hrSettingsAdmin",
  "Base UI": "hrBaseUI",
  "Advanced UI": "hrAdvancedUI",
  Forms: "hrForms",
  Tables: "hrTables",
  Charts: "hrCharts",
};

const HR_ICON_MAP: Record<string, string> = {
  // UI & Design System
  "Base UI": "ph-squares-four",
  "Advanced UI": "ph-shooting-star",
  Forms: "ph-note-pencil",
  Tables: "ph-table",
  Charts: "ph-chart-pie-slice",
  // Applications
  Applications: "ph-grid-four",
  Chat: "ph-chat-circle-dots",
  Scrumboard: "ph-kanban",
  "File Manager": "ph-folder-open",
  Files: "ph-folder-open",
  "Todo & Tasks": "ph-check-square-offset",
  Todo: "ph-check-square",
  Gantt: "ph-chart-bar-horizontal",
  "All Apps Catalog": "ph-storefront",
  Email: "ph-envelope-simple",
  "Email Mailbox": "ph-envelope-simple",

  // 01. Overview
  Dashboard: "ph-squares-four",
  Calendar: "ph-calendar",
  "My Tasks": "ph-check-square",
  "Team Chat": "ph-chat-circle-dots",
  Approval: "ph-check-circle",
  Approvals: "ph-check-circle",
  Notifications: "ph-bell",

  // 02. Workspace Management
  Employees: "ph-users",
  Organization: "ph-tree-structure",
  Attendance: "ph-clock",
  "Leave Management": "ph-calendar-blank",

  // 03. Talent & Growth
  Recruitment: "ph-user-plus",
  "Employee Lifecycle": "ph-arrows-clockwise",
  Performance: "ph-trend-up",
  Training: "ph-graduation-cap",

  // 04. Finance & Assets
  Payroll: "ph-receipt",
  Assets: "ph-hard-drive",

  // 05. Communications & Content
  Meetings: "ph-video-camera",
  "Company Documents": "ph-file-text",
  "Media Library": "ph-image",
  "My Profile": "ph-user",
  "HR Settings": "ph-gear",

  // 06. Reports & Analytics
  Reports: "ph-chart-bar",
  "Reports & Analytics": "ph-chart-bar",
  Headcount: "ph-chart-bar",
  Attrition: "ph-user-minus",
  Statutory: "ph-shield-check",
  "Custom Reports": "ph-file-magnifying-glass",
  "Custom Report": "ph-file-magnifying-glass",
  "Smart Reports": "ph-presentation-chart",

  // 07. Add-ons & Integrations
  "App Marketplace": "ph-storefront",
  "Installed Add-ons": "ph-puzzle-piece",
  "Strategy Studio": "ph-compass",
  "Custom Fields": "ph-sliders-horizontal",
  "SMS Gateway": "ph-chats-circle",
  "Support Tickets": "ph-lifebuoy",
  "Contracts Management": "ph-file-lock",
  "Contracts": "ph-file-lock",
  "E-Commerce": "ph-shopping-bag",
  "E-Commerce Cloud Suite": "ph-shopping-bag",
  "Smart Dashboard": "ph-chart-pie",
  "AI Business Advisor": "ph-brain",
  "Strategic Planning": "ph-target",
  Challenges: "ph-lightning",
  "Initiative Charters": "ph-scroll",
  "Planning Kanban": "ph-kanban",
  OKRs: "ph-compass",
  "Learning Analytics": "ph-chart-pie-slice",
  "Biometric Sync": "ph-fingerprint",
  "Biometric Hardware Hub": "ph-fingerprint",
  "Notice Board": "ph-megaphone",
  "AI Assistant Usage": "ph-robot",
  "AI Document Generator": "ph-file-arrow-up",
  "Webhook Endpoints": "ph-webhooks-logo",
  "Suggestion Box": "ph-lightbulb",
  "Call History": "ph-phone-call",
  "System States": "ph-stack",
  "System States Directory": "ph-stack",

  // 08. Settings & System
  "Settings & System": "ph-gear",
  "Settings & Administration": "ph-gear",
  "General Settings": "ph-gear",
  Settings: "ph-sliders-horizontal",
  "Settings Quick Hub": "ph-squares-four",
  "Workspace Branding": "ph-paint-brush-broad",
  "Company Profile": "ph-buildings",
  "Custom Domain": "ph-globe",
  "Dynamic Custom Fields": "ph-code",
  "Users & Roles": "ph-user-gear",
  "Email Accounts": "ph-envelope",
  "Subscription & Billing": "ph-credit-card",
};

interface DreamsSidebarProps {
  profile: ProfileWithRoles | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  fullView?: boolean;
  onToggleFullView?: () => void;
}

export function DreamsSidebar({
  profile,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  fullView = false,
  onToggleFullView,
}: DreamsSidebarProps) {
  const { branding, isDark } = useTenantBranding();
  const { isEntitled } = useNavigationResolver();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const [isHovered, setIsHovered] = useState(false);
  const [ignoreHover, setIgnoreHover] = useState(false);
  const isMini = collapsed && !isHovered;

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIgnoreHover(true);
    setIsHovered(false);
    document.body.classList.remove("expand-menu");
    onToggleCollapse();
    // Auto-reset ignoreHover so hover works again if cursor was already outside
    setTimeout(() => setIgnoreHover(false), 600);
  };

  // Submenu toggle states
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    dashboards: true,
    aiCenter: true,
    hrm: true,
    apps: false,
    inventory: false,
    sales: false,
    talent: false,
    operations: false,
    ecommerce: false,
    extensions: false,
    meOrg: true,
    meAttendance: true,
    meLeave: false,
    meRecruitment: false,
    meLifecycle: false,
    mePerformance: false,
    meTraining: false,
    mePayroll: false,
    meAssets: false,
    meMeetings: false,
    meDocs: false,
    meMedia: false,
    // HR portal submenus
    hrApprovals: false,
    hrOrg: false,
    hrAttendance: false,
    hrLeave: false,
    hrRecruitment: false,
    hrLifecycle: false,
    hrPerformance: false,
    hrTraining: false,
    hrPayroll: false,
    hrAssets: false,
    hrMeetings: false,
    hrDocs: false,
    hrPlanning: false,
    meChat: false,
    hrAppsChat: false,
    tenantChat: false,
    tenantWorkspace: true,
  });

  const toggleSubmenu = (menuKey: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  // Auto-expand matching employee and HR submenus on route navigation
  useEffect(() => {
    
    if (currentPath.startsWith("/manage-stock") || currentPath.startsWith("/stock-adjustment") || currentPath.startsWith("/stock-transfer")) {
      setOpenMenus((p) => ({ ...p, stock: true }));
    }
    if (currentPath.startsWith("/profit-loss") || currentPath.startsWith("/cashflow") || currentPath.startsWith("/tax-summary") || currentPath.startsWith("/income-expense")) {
      setOpenMenus((p) => ({ ...p, financeReports: true }));
    }
    if (currentPath.startsWith("/leave-types") || currentPath === "/leave") {
      setOpenMenus((p) => ({ ...p, hrmLeave: true }));
    }
    if (currentPath.startsWith("/me/organization")) setOpenMenus((p) => ({ ...p, meOrg: true }));
    if (currentPath.startsWith("/me/attendance")) setOpenMenus((p) => ({ ...p, meAttendance: true }));
    if (currentPath.startsWith("/me/leave")) setOpenMenus((p) => ({ ...p, meLeave: true }));
    if (currentPath.startsWith("/me/recruitment")) setOpenMenus((p) => ({ ...p, meRecruitment: true }));
    if (currentPath.startsWith("/me/lifecycle")) setOpenMenus((p) => ({ ...p, meLifecycle: true }));
    if (currentPath.startsWith("/me/performance")) setOpenMenus((p) => ({ ...p, mePerformance: true }));
    if (currentPath.startsWith("/me/training")) setOpenMenus((p) => ({ ...p, meTraining: true }));
    if (currentPath.startsWith("/me/payroll")) setOpenMenus((p) => ({ ...p, mePayroll: true }));
    if (currentPath.startsWith("/me/assets")) setOpenMenus((p) => ({ ...p, meAssets: true }));
    if (currentPath.startsWith("/me/meetings")) setOpenMenus((p) => ({ ...p, meMeetings: true }));
    if (currentPath.startsWith("/me/documents")) setOpenMenus((p) => ({ ...p, meDocs: true }));
    if (currentPath.startsWith("/me/media")) setOpenMenus((p) => ({ ...p, meMedia: true }));
    if (currentPath.startsWith("/me/chat")) setOpenMenus((p) => ({ ...p, meChat: true }));
    if (currentPath.startsWith("/hr/approvals") || currentPath.startsWith("/hr/requests/profile-changes")) setOpenMenus((p) => ({ ...p, hrApprovals: true }));
    if (currentPath.startsWith("/hr/organization")) setOpenMenus((p) => ({ ...p, hrOrg: true }));
    if (currentPath.startsWith("/hr/attendance")) setOpenMenus((p) => ({ ...p, hrAttendance: true }));
    if (currentPath.startsWith("/hr/leave")) setOpenMenus((p) => ({ ...p, hrLeave: true }));
    if (currentPath.startsWith("/hr/recruitment")) setOpenMenus((p) => ({ ...p, hrRecruitment: true }));
    if (currentPath.startsWith("/hr/lifecycle")) setOpenMenus((p) => ({ ...p, hrLifecycle: true }));
    if (currentPath.startsWith("/hr/performance")) setOpenMenus((p) => ({ ...p, hrPerformance: true }));
    if (currentPath.startsWith("/hr/training")) setOpenMenus((p) => ({ ...p, hrTraining: true }));
    if (currentPath.startsWith("/hr/payroll")) setOpenMenus((p) => ({ ...p, hrPayroll: true }));
    if (currentPath.startsWith("/hr/assets")) setOpenMenus((p) => ({ ...p, hrAssets: true }));
    if (currentPath.startsWith("/hr/meetings")) setOpenMenus((p) => ({ ...p, hrMeetings: true }));
    if (currentPath.startsWith("/hr/documents")) setOpenMenus((p) => ({ ...p, hrDocs: true }));
    if (currentPath.startsWith("/hr/chat")) setOpenMenus((p) => ({ ...p, hrAppsChat: true, apps: true }));
    if (currentPath.startsWith("/addons/planning")) setOpenMenus((p) => ({ ...p, hrPlanning: true }));
    if (currentPath.startsWith("/tenant/chat")) setOpenMenus((p) => ({ ...p, tenantChat: true, tenantWorkspace: true }));
    if (currentPath.startsWith("/tenant")) setOpenMenus((p) => ({ ...p, tenantWorkspace: true }));
    if (currentPath === "/integrations" || currentPath === "/shopify") {
      setOpenMenus((p) => ({ ...p, ecommerce: true }));
    }
  }, [currentPath]);

  const userRoles = profile?.roles || [];
  const normalizedRoles = userRoles.map((r) => String(r).toLowerCase().replace(/[-_ ]/g, ""));
  const roleName = String(profile?.workspaceRole?.name || profile?.roles?.[0] || "").toLowerCase();
  const normalizedRoleName = roleName.replace(/[-_ ]/g, "");
  const isSuperAdmin = userRoles.includes("super_admin") || normalizedRoles.includes("superadmin") || roleName.includes("super admin");
  const isTenantAdmin = normalizedRoles.some((r) =>
    ["admin", "tenantadmin", "workspaceadmin", "organizationadmin", "owner"].includes(r)
  ) || normalizedRoleName.includes("workspaceadmin") || normalizedRoleName.includes("tenantadmin") || normalizedRoleName.includes("organizationadmin") || normalizedRoleName === "admin" || normalizedRoleName.includes("owner");
  const isHrAdmin = normalizedRoles.some((r) => ["hradmin", "hr", "hrmanager"].includes(r)) || roleName.includes("hr");
  const isAdminOrSuper = isSuperAdmin || isTenantAdmin || isHrAdmin;
  const isManager = normalizedRoles.includes("manager") || roleName.includes("manager");
  const isClientOnly = normalizedRoles.includes("client") && !isTenantAdmin && !isHrAdmin && !isSuperAdmin;
  const isHrRoute = currentPath === "/hr" || currentPath.startsWith("/hr/");
  const isTenantRoute = currentPath === "/tenant" || currentPath.startsWith("/tenant/");
  const isEmployeeRoute = currentPath === "/me" || currentPath.startsWith("/me/");
  const isEmployeeOnly =
    isEmployeeRoute ||
    ((normalizedRoles.includes("employee") || isManager) &&
      !isTenantAdmin &&
      !isHrAdmin &&
      !isSuperAdmin &&
      !isHrRoute &&
      !isTenantRoute);
  const isHrView = !isEmployeeRoute && (isHrRoute || (!isTenantRoute && isHrAdmin && !isEmployeeOnly));

  const filteredHrSidebar = useMemo(() => {
    return filterHRSidebar(hrSidebar, {
      isWorkspaceAdmin: isTenantAdmin || isSuperAdmin,
      isSuperAdmin,
      isHrAdmin,
      permissions: profile?.permissions || [],
      isAddonActive: (slug: string) => isEntitled(slug),
    });
  }, [isTenantAdmin, isSuperAdmin, isHrAdmin, profile?.permissions, isEntitled]);

  const hasDirectReports = Boolean(
    (profile as any)?.hasDirectReports ||
    (profile as any)?.directReportsCount > 0 ||
    userRoles.includes("manager")
  );
  const hasManagerDelegation = Boolean(
    (profile as any)?.hasManagerDelegation ||
    (profile?.permissions || []).some(
      (p) => p.startsWith("manager.") || p === "approvals.manage" || p === "manager.delegation"
    )
  );
  const showManagerSection = hasDirectReports || hasManagerDelegation;
  const canApprovals =
    showManagerSection || (profile?.permissions || []).some((p) => p.includes("approvals"));
  const canInterviews =
    (profile as any)?.isInterviewer !== false &&
    (!profile?.permissions?.length ||
      profile.permissions.some((p) => p.includes("interview") || p.includes("recruitment")));
  const canAssessments =
    (profile as any)?.hasAssessments !== false &&
    (!profile?.permissions?.length ||
      profile.permissions.some(
        (p) => p.includes("assessment") || p.includes("recruitment") || p.includes("training")
      ));

  const filteredEmployeeSidebar = useMemo(() => {
    return filterEmployeeSidebar(employeeSidebar, {
      isInterviewer: canInterviews,
      hasAssessments: canAssessments,
      hasDirectReports,
      hasManagerDelegation,
      permissions: profile?.permissions || [],
      isAddonActive: (slug: string) => isEntitled(slug),
    });
  }, [canInterviews, canAssessments, hasDirectReports, hasManagerDelegation, profile?.permissions, isEntitled]);

  const enabledModules = profile?.enabledModules || (profile as any)?.tenant?.enabledModules || [];

  const isPosUnlocked = isSuperAdmin ||
    ((isEntitled("pos") || isEntitled("product_pos")) && isModuleAllowed("pos", profile));

  const isFinanceUnlocked = isSuperAdmin ||
    ((isEntitled("accounting") || isEntitled("finance") || isEntitled("product_finance")) && isModuleAllowed("finance", profile));

  const isCrmUnlocked = isSuperAdmin ||
    ((isEntitled("crm") || isEntitled("product_crm")) && isModuleAllowed("crm", profile));

  const isHrmsUnlocked = isSuperAdmin ||
    ((isEntitled("hrm") || isEntitled("hrms") || isEntitled("product_hrms") || isEntitled("core_platform")) && isModuleAllowed("hrm", profile));

  const homeRoute = isSuperAdmin
    ? "/super"
    : isTenantAdmin
      ? "/tenant/dashboard"
      : isClientOnly
      ? "/client-dashboard"
      : isEmployeeOnly
        ? "/me/dashboard"
        : isHrAdmin
          ? "/hr/dashboard"
          : "/hrm-dashboard";

  return (
    <aside
      className={cn("sidebar border-r border-border/70 bg-card/95 backdrop-blur-md shadow-2xs", mobileOpen && "opened")}
      id="sidebar"
      data-lenis-prevent="true"
      onMouseEnter={() => {
        if (collapsed && !ignoreHover) {
          setIsHovered(true);
          document.body.classList.add("expand-menu");
        }
      }}
      onMouseLeave={() => {
        setIgnoreHover(false);
        if (collapsed) {
          setIsHovered(false);
          document.body.classList.remove("expand-menu");
        }
      }}
    >
      {/* Sidebar Logo Header */}
      <div className={cn("sidebar-logo flex items-center h-14 border-b border-border/70 gap-2 bg-card/40", isMini ? "justify-center px-2" : "px-3 sm:px-4")}>
        {isMini ? (
          /* Mini Mode Centered Favicon */
          <Link
            to={homeRoute}
            className="flex items-center justify-center size-9 rounded-xl hover:bg-muted/70 transition-colors"
            title={branding.name || "Master HRMS & ERP"}
          >
            <img
              src={branding.faviconUrl || "/favicon.webp"}
              alt={branding.name || "Master HRMS"}
              className="size-7 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/favicon.webp";
              }}
              loading="lazy"
            />
          </Link>
        ) : (
          <>
            {/* Full Brand Logo */}
            <Link
              to={homeRoute}
              className="brand-logo logo flex items-center gap-2 flex-1 min-w-0 overflow-hidden"
              onClick={onCloseMobile}
            >
              <img
                src={branding.activeLogo || (isDark ? (branding.logoDark || "/white-logo.webp") : (branding.logoUrl || "/logo.webp"))}
                alt={branding.name || "Master HRMS & ERP"}
                className="h-8 max-h-8 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = isDark ? "/white-logo.webp" : "/logo.webp";
                }}
                loading="lazy"
              />
            </Link>

            {/* Desktop Collapse / Expand Button */}
            <button
              type="button"
              id="toggle_btn"
              onClick={handleToggleCollapse}
              className={cn(
                "hidden lg:flex items-center justify-center size-7.5 rounded-xl border transition-all cursor-pointer shadow-2xs",
                collapsed
                  ? "bg-card border-border/70 text-muted-foreground hover:text-primary"
                  : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
              )}
              title={collapsed ? "Expand Sidebar (250px)" : "Collapse Sidebar (72px)"}
              aria-label="Toggle Sidebar"
            >
              <i className={cn("text-base ph-duotone", collapsed ? "ph-arrow-line-right" : "ph-arrow-line-left")}></i>
            </button>

            {/* Mobile Close X Button */}
            <button
              type="button"
              className="sidebar-close lg:hidden size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 cursor-pointer border border-border/70 transition-colors"
              onClick={onCloseMobile}
              aria-label="Close Mobile Menu"
            >
              <i className="ph-bold ph-x text-base"></i>
            </button>
          </>
        )}
      </div>

      {/* Sidenav Scrollable Menu */}
      <div
        className="sidebar-inner custom-scrollbar"
        data-lenis-prevent="true"
        style={{
          overflowY: "auto",
          height: "calc(100% - 56px)",
          maxHeight: "calc(100vh - 56px)",
          minHeight: 0,
          flex: "1 1 0%",
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const anchor = target.closest("a");
          if (anchor && anchor.getAttribute("href") !== "#") {
            onCloseMobile();
          }
        }}
      >
        <div id="sidebar-menu" className="sidebar-menu">
          {isSuperAdmin && !profile?.tenant_id ? (
            <ul>
              <li className="menu-title">
                <span>PLATFORM CONTROL PLANE</span>
              </li>
              <li>
                <Link
                  to="/super"
                  onClick={onCloseMobile}
                  className={cn(currentPath.startsWith("/super") && "active", "text-primary font-semibold")}
                >
                  <i className="ph-duotone ph-shield-check"></i>
                  <span>Super Admin Console</span>
                </Link>
              </li>
              <li className="menu-title">
                <span>CENTRALIZED AUTOMATIONS</span>
              </li>
              <li>
                <Link
                  to="/cronjob"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/cronjob" && "active")}
                >
                  <i className="ph-duotone ph-clock"></i>
                  <span>Centralized Cron Jobs</span>
                </Link>
              </li>
              <li className="menu-title">
                <span>SHARED PLATFORM WORKFLOWS</span>
              </li>
              <li>
                <Link
                  to="/clear-cache"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/clear-cache" && "active")}
                >
                  <i className="ph-duotone ph-arrows-clockwise"></i>
                  <span>Clear Cache & Maintenance</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/ai-configuration"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/ai-configuration" && "active")}
                >
                  <i className="ph-duotone ph-sliders"></i>
                  <span>AI Engine Configuration</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/ai-settings"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/ai-settings" && "active")}
                >
                  <i className="ph-duotone ph-gear"></i>
                  <span>AI API Credentials</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/system-states"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/system-states" && "active")}
                >
                  <i className="ph-duotone ph-stack"></i>
                  <span>System States Directory</span>
                </Link>
              </li>
            </ul>
          ) : isClientOnly ? (
            <ul>
              <li className="menu-title">
                <span>CLIENT PORTAL</span>
              </li>
              <li>
                <Link
                  to="/client-dashboard"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/client-dashboard" && "active")}
                >
                  <i className="ph-duotone ph-squares-four"></i>
                  <span>Client Dashboard</span>
                </Link>
              </li>

              <li className="menu-title">
                <span>DELIVERABLES & BILLING</span>
              </li>
              <li>
                <Link
                  to="/invoices"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/invoices" && "active")}
                >
                  <i className="ph-duotone ph-receipt"></i>
                  <span>Invoices & Receipts</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/projects"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/projects" && "active")}
                >
                  <i className="ph-duotone ph-kanban"></i>
                  <span>Contracted Projects</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/task-board"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/task-board" && "active")}
                >
                  <i className="ph-duotone ph-kanban"></i>
                  <span>Global Task Board</span>
                </Link>
              </li>

              <li className="menu-title">
                <span>COMMUNICATIONS</span>
              </li>
              <li>
                <Link
                  to="/helpdesk"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/helpdesk" && "active")}
                >
                  <i className="ph-duotone ph-lifebuoy"></i>
                  <span>Support Tickets</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/chat"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/chat" && "active")}
                >
                  <i className="ph-duotone ph-chat-circle-dots"></i>
                  <span>Direct Messages</span>
                </Link>
              </li>
            </ul>
          ) : isEmployeeOnly ? (
            <ul>
              {filteredEmployeeSidebar.map((section) => (
                <Fragment key={section.label}>
                  <li className="menu-title">
                    <span>{section.label.toUpperCase()}</span>
                  </li>
                  {section.children?.map((item) => {
                    if (item.children && item.children.length > 0) {
                      const menuKey =
                        EMPLOYEE_SUBMENU_KEY_MAP[item.label] ||
                        `me_${item.label.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
                      const isOpen = openMenus[menuKey] ?? false;
                      const isSubActive = item.children.some(
                        (c) =>
                          c.path &&
                          (currentPath === c.path ||
                            (c.path !== "/me" &&
                              c.path !== "/me/dashboard" &&
                              currentPath.startsWith(c.path + "/")))
                      );
                      const iconClass = item.icon || "ph-folder";

                      return (
                        <li key={item.label} className="submenu">
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              toggleSubmenu(menuKey);
                            }}
                            className={cn(
                              "cursor-pointer",
                              isOpen && "subdrop",
                              isSubActive && "active"
                            )}
                          >
                            <i className={cn("ph-duotone", iconClass)}></i>
                            <span>{item.label}</span>
                            <span className="menu-arrow"></span>
                          </a>
                          <ul style={{ display: !isMini && isOpen ? "block" : "none" }}>
                            {item.children.map((child) => {
                              const currentPathClean = currentPath.split("?")[0];
                              const hasExactChildMatch = Boolean(
                                item.children?.some(
                                  (c) => c.path && (currentPathClean === c.path || currentPath === c.path)
                                )
                              );
                              const isChildActive =
                                child.path &&
                                (currentPathClean === child.path ||
                                  currentPath === child.path ||
                                  (!hasExactChildMatch &&
                                    child.path !== "/me" &&
                                    child.path !== "/me/dashboard" &&
                                    currentPath.startsWith(child.path + "/")));
                              return (
                                <li key={child.path || child.label}>
                                  <Link
                                    to={child.path!}
                                    onClick={onCloseMobile}
                                    className={cn(isChildActive && "active")}
                                  >
                                    {child.label}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      );
                    }

                    const isActive =
                      item.path &&
                      (currentPath === item.path ||
                        (item.path === "/me/dashboard" && currentPath === "/me") ||
                        (item.path !== "/me" &&
                          item.path !== "/me/dashboard" &&
                          currentPath.startsWith(item.path + "/")));
                    const iconClass = item.icon || "ph-circle";

                    return (
                      <li key={item.path || item.label}>
                        <Link
                          to={item.path!}
                          onClick={onCloseMobile}
                          className={cn(isActive && "active")}
                        >
                          <i className={cn("ph-duotone", iconClass)}></i>
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </Fragment>
              ))}

              {/* Dynamic Manager Section */}
              {showManagerSection && (
                <Fragment key="MANAGER ONLY">
                  <li className="menu-title">
                    <span>MANAGER ONLY</span>
                  </li>
                  <li>
                    <Link
                      to="/me/team"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/me/team" && "active")}
                    >
                      <i className="ph-duotone ph-users-three"></i>
                      <span>My Team</span>
                    </Link>
                  </li>
                  {canApprovals && (
                    <li>
                      <Link
                        to="/me/approvals"
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/me/approvals" && "active")}
                      >
                        <i className="ph-duotone ph-user-check"></i>
                        <span>Approvals</span>
                      </Link>
                    </li>
                  )}
                </Fragment>
              )}
            </ul>
          ) : isHrView ? (
            <ul>
              {filteredHrSidebar.map((section) => (
                <Fragment key={section.label}>
                  <li className="menu-title">
                    <span>{section.label.toUpperCase()}</span>
                  </li>
                  {section.children?.map((item) => {
                    if (item.children && item.children.length > 0) {
                      const menuKey =
                        HR_SUBMENU_KEY_MAP[item.label] ||
                        `hr_${item.label.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
                      const isOpen = openMenus[menuKey] ?? false;
                      const isSubActive = item.children.some(
                        (c) =>
                          c.path &&
                          (currentPath === c.path ||
                            (c.path !== "/hr" &&
                              c.path !== "/hr/dashboard" &&
                              currentPath.startsWith(c.path + "/")))
                      );
                      const iconClass = item.icon || HR_ICON_MAP[item.label] || "ph-folder";

                      return (
                        <li key={item.label} className="submenu">
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              toggleSubmenu(menuKey);
                            }}
                            className={cn(
                              "cursor-pointer",
                              isOpen && "subdrop",
                              isSubActive && "active"
                            )}
                          >
                            <i className={cn("ph-duotone", iconClass)}></i>
                            <span>{item.label}</span>
                            <span className="menu-arrow"></span>
                          </a>
                          <ul style={{ display: !isMini && isOpen ? "block" : "none" }}>
                            {item.children.map((child) => {
                              const currentPathClean = currentPath.split("?")[0];
                              const hasExactChildMatch = Boolean(
                                item.children?.some(
                                  (c) => c.path && (currentPathClean === c.path || currentPath === c.path)
                                )
                              );
                              const isChildActive =
                                child.path &&
                                (currentPathClean === child.path ||
                                  currentPath === child.path ||
                                  (!hasExactChildMatch &&
                                    child.path !== "/hr" &&
                                    child.path !== "/hr/dashboard" &&
                                    currentPath.startsWith(child.path + "/")));
                              return (
                                <li key={child.path || child.label}>
                                  <Link
                                    to={child.path!}
                                    onClick={onCloseMobile}
                                    className={cn(isChildActive && "active")}
                                  >
                                    {child.label}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      );
                    }

                    const isActive =
                      item.path &&
                      (currentPath === item.path ||
                        (item.path !== "/hr" &&
                          item.path !== "/hr/dashboard" &&
                          currentPath.startsWith(item.path + "/")) ||
                        (item.label === "File Manager" &&
                          (currentPath.startsWith("/apps/file-manager") ||
                            currentPath === "/tenant/files" ||
                            currentPath === "/me/files" ||
                            currentPath === "/hr/files")));
                    const iconClass = item.icon || HR_ICON_MAP[item.label] || "ph-circle";

                    return (
                      <li key={item.path || item.label}>
                        <Link
                          to={item.path!}
                          onClick={onCloseMobile}
                          className={cn(isActive && "active")}
                        >
                          <i className={cn("ph-duotone", iconClass)}></i>
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </Fragment>
              ))}

              {/* ===================== STANDALONE APPLICATION MODULES (HR VIEW) ===================== */}
              {(() => {
                const standaloneModules = resolveStandaloneModules(isEntitled, isAdminOrSuper, currentPath);
                if (!standaloneModules.length) return null;

                return (
                  <>
                    {standaloneModules.map((mod) => (
                      <React.Fragment key={mod.id}>
                        <li className="menu-title">
                          <span>{mod.menuTitle}</span>
                        </li>
                        {mod.navigationMode === "standalone_with_submenu" ? (
                          <li className="submenu">
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                toggleSubmenu(mod.key);
                              }}
                              className={cn(
                                "cursor-pointer",
                                openMenus[mod.key] && "subdrop",
                                mod.activeRoute && "active"
                              )}
                            >
                              <i className={cn("ph-duotone", mod.icon)}></i>
                              <span>{mod.label}</span>
                              <span className="menu-arrow"></span>
                            </a>
                            <ul style={{ display: !isMini && openMenus[mod.key] ? "block" : "none" }}>
                              {mod.children.map((child) => (
                                <li key={child.id}>
                                  <Link
                                    to={child.route}
                                    onClick={onCloseMobile}
                                    className={cn(child.isActive && "active")}
                                  >
                                    {child.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ) : (
                          <li>
                            <Link
                              to={mod.routes[0] || "/"}
                              onClick={onCloseMobile}
                              className={cn(mod.activeRoute && "active")}
                            >
                              <i className={cn("ph-duotone", mod.icon)}></i>
                              <span>{mod.label}</span>
                            </Link>
                          </li>
                        )}
                      </React.Fragment>
                    ))}
                  </>
                );
              })()}

              {/* ===================== EXTENSIONS & ADD-ONS (HR VIEW) ===================== */}
              {(() => {
                const extensionItems = resolveExtensionItems(isEntitled, isAdminOrSuper, currentPath);
                if (!extensionItems.length) return null;
                const anyActive = extensionItems.some((i) => i.isActive);

                return (
                  <>
                    <li className="menu-title">
                      <span>EXTENSIONS & ADD-ONS</span>
                    </li>
                    <li className="submenu">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleSubmenu("extensions");
                        }}
                        className={cn(
                          "cursor-pointer",
                          openMenus.extensions && "subdrop",
                          anyActive && "active"
                        )}
                      >
                        <i className="ph-duotone ph-sparkle"></i>
                        <span>Add-ons & Connectors</span>
                        <span className="menu-arrow"></span>
                      </a>
                      <ul style={{ display: !isMini && openMenus.extensions ? "block" : "none" }}>
                        {extensionItems.map((item) => (
                          <li key={item.id}>
                            <Link
                              to={item.route}
                              onClick={onCloseMobile}
                              className={cn(item.isActive && "active")}
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  </>
                );
              })()}
            </ul>
          ) : (
            <ul>
              {/* ===================== 1. MAIN ===================== */}
              <li className="menu-title">
                <span>MAIN</span>
              </li>

              {/* Dashboards Submenu */}
              <li className="submenu">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSubmenu("dashboards");
                  }}
                  className={cn(
                    "cursor-pointer",
                    openMenus.dashboards && "subdrop",
                    [
                      "/tenant/dashboard",
                      "/me/dashboard",
                      "/employee-dashboard",
                      "/deals-dashboard",
                      "/leads-dashboard",
                      "/hrm-dashboard",
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
                      "/analytics",
                    ].includes(currentPath) && "active"
                  )}
                >
                  <i className="ph-duotone ph-squares-four"></i>
                  <span>Dashboards</span>
                  <span className="menu-arrow"></span>
                </a>
                <ul style={{ display: !isMini && openMenus.dashboards ? "block" : "none" }}>
                  <li>
                    <Link
                      to="/tenant/dashboard"
                      onClick={onCloseMobile}
                      className={cn((currentPath === "/tenant/dashboard" || currentPath === "/tenant") && "active")}
                    >
                      Admin Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/me/dashboard"
                      onClick={onCloseMobile}
                      className={cn((currentPath === "/me/dashboard" || currentPath === "/employee-dashboard") && "active")}
                    >
                      Employee Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/deals-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/deals-dashboard" && "active")}
                    >
                      Deals Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/leads-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/leads-dashboard" && "active")}
                    >
                      Leads Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/hrm-dashboard"
                      onClick={onCloseMobile}
                      className={cn((currentPath === "/hrm-dashboard" || currentPath === "/dashboard") && "active")}
                    >
                      HR Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/payroll-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/payroll-dashboard" && "active")}
                    >
                      Payroll Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/recruitment-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/recruitment-dashboard" && "active")}
                    >
                      Recruitment Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/attendance-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/attendance-dashboard" && "active")}
                    >
                      Attendance Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/finance-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/finance-dashboard" && "active")}
                    >
                      Finance Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/it-admin-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/it-admin-dashboard" && "active")}
                    >
                      IT Admin Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/asset-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/asset-dashboard" && "active")}
                    >
                      Asset Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/support-dashboard"
                      onClick={onCloseMobile}
                      className={cn((currentPath === "/support-dashboard" || currentPath === "/help-desk-dashboard") && "active")}
                    >
                      Help Desk Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/inventory-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/inventory-dashboard" && "active")}
                    >
                      Inventory Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/crm-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/crm-dashboard" && "active")}
                    >
                      CRM Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/pos-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/pos-dashboard" && "active")}
                    >
                      POS Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/sales-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/sales-dashboard" && "active")}
                    >
                      Sales Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/procurement-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/procurement-dashboard" && "active")}
                    >
                      Procurement Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/project-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/project-dashboard" && "active")}
                    >
                      Project Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/analytics"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/analytics" && "active")}
                    >
                      Analytics Overview
                    </Link>
                  </li>
                </ul>
              </li>

              {/* Applications Submenu */}
              <li className="submenu">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSubmenu("apps");
                  }}
                  className={cn(
                    "cursor-pointer",
                    openMenus.apps && "subdrop",
                    ["/chat", "/calendar", "/email", "/apps/file-manager", "/notes", "/todo", "/workflow-approvals"].some(
                      (p) => currentPath === p || currentPath.startsWith(p + "/")
                    ) && "active"
                  )}
                >
                  <i className="ph-duotone ph-grid-four"></i>
                  <span>Applications</span>
                  <span className="menu-arrow"></span>
                </a>
                <ul style={{ display: !isMini && openMenus.apps ? "block" : "none" }}>
                  <li>
                    <Link to="/chat" onClick={onCloseMobile} className={cn(currentPath === "/chat" && "active")}>
                      Chat
                    </Link>
                  </li>
                  <li>
                    <Link to="/calendar" onClick={onCloseMobile} className={cn(currentPath === "/calendar" && "active")}>
                      Calendar
                    </Link>
                  </li>
                  <li>
                    <Link to="/email" onClick={onCloseMobile} className={cn(currentPath === "/email" && "active")}>
                      Email
                    </Link>
                  </li>
                  <li>
                    <Link to="/apps/file-manager" onClick={onCloseMobile} className={cn((currentPath === "/apps/file-manager" || currentPath === "/tenant/files") && "active")}>
                      File Manager
                    </Link>
                  </li>
                  <li>
                    <Link to="/notes" onClick={onCloseMobile} className={cn(currentPath === "/notes" && "active")}>
                      Notes
                    </Link>
                  </li>
                  <li>
                    <Link to="/todo" onClick={onCloseMobile} className={cn(currentPath === "/todo" && "active")}>
                      To Do
                    </Link>
                  </li>
                  <li>
                    <Link to="/workflow-approvals" onClick={onCloseMobile} className={cn(currentPath === "/workflow-approvals" && "active")}>
                      Workflow & Approvals
                    </Link>
                  </li>
                </ul>
              </li>

              {/* AI Center Submenu */}
              <li className="submenu">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSubmenu("aiCenter");
                  }}
                  className={cn(
                    "cursor-pointer",
                    openMenus.aiCenter && "subdrop",
                    [
                      "/ai",
                      "/ai-attendance-insights",
                      "/ai-payroll-forecast",
                      "/ai-hiring-forecast",
                      "/ai-team-performance-insights",
                      "/ai-configuration",
                      "/ai-settings"
                    ].includes(currentPath) && "active"
                  )}
                >
                  <i className="ph-duotone ph-sparkle text-purple-600"></i>
                  <span>AI Center</span>
                  <span className="menu-arrow"></span>
                </a>
                <ul style={{ display: !isMini && openMenus.aiCenter ? "block" : "none" }}>
                  <li>
                    <Link to="/ai" onClick={onCloseMobile} className={cn(currentPath === "/ai" && "active")}>
                      AI Copilot & Hub
                    </Link>
                  </li>
                  <li>
                    <Link to="/ai-attendance-insights" onClick={onCloseMobile} className={cn(currentPath === "/ai-attendance-insights" && "active")}>
                      AI Attendance Insights
                    </Link>
                  </li>
                  <li>
                    <Link to="/ai-payroll-forecast" onClick={onCloseMobile} className={cn(currentPath === "/ai-payroll-forecast" && "active")}>
                      AI Payroll Forecast
                    </Link>
                  </li>
                  <li>
                    <Link to="/ai-hiring-forecast" onClick={onCloseMobile} className={cn(currentPath === "/ai-hiring-forecast" && "active")}>
                      AI Hiring Forecast
                    </Link>
                  </li>
                  <li>
                    <Link to="/ai-team-performance-insights" onClick={onCloseMobile} className={cn(currentPath === "/ai-team-performance-insights" && "active")}>
                      AI Team Performance
                    </Link>
                  </li>
                  <li>
                    <Link to="/ai-configuration" onClick={onCloseMobile} className={cn((currentPath === "/ai-configuration" || currentPath === "/ai-settings") && "active")}>
                      AI Configuration
                    </Link>
                  </li>
                </ul>
              </li>

              {/* ===================== 2. INVENTORY ===================== */}
              <li className="menu-title">
                <span>INVENTORY</span>
              </li>

              {/* Stock Submenu */}
              <li className="submenu">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSubmenu("stock");
                  }}
                  className={cn(
                    "cursor-pointer",
                    openMenus.stock && "subdrop",
                    ["/manage-stock", "/stock-adjustment", "/stock-transfer"].some(
                      (p) => currentPath === p || currentPath.startsWith(p + "/")
                    ) && "active"
                  )}
                >
                  <i className="ph-duotone ph-stack"></i>
                  <span>Stock</span>
                  <span className="menu-arrow"></span>
                </a>
                <ul style={{ display: !isMini && openMenus.stock ? "block" : "none" }}>
                  <li>
                    <Link to="/manage-stock" onClick={onCloseMobile} className={cn(currentPath === "/manage-stock" && "active")}>
                      Manage Stock
                    </Link>
                  </li>
                  <li>
                    <Link to="/stock-adjustment" onClick={onCloseMobile} className={cn(currentPath === "/stock-adjustment" && "active")}>
                      Stock Adjustment
                    </Link>
                  </li>
                  <li>
                    <Link to="/stock-transfer" onClick={onCloseMobile} className={cn(currentPath === "/stock-transfer" && "active")}>
                      Stock Transfer
                    </Link>
                  </li>
                </ul>
              </li>

              <li>
                <Link to="/products" onClick={onCloseMobile} className={cn(currentPath === "/products" && "active")}>
                  <i className="ph-duotone ph-package"></i>
                  <span>Products & Stock</span>
                </Link>
              </li>
              <li>
                <Link to="/categories" onClick={onCloseMobile} className={cn(currentPath === "/categories" && "active")}>
                  <i className="ph-duotone ph-tree-structure"></i>
                  <span>Categories</span>
                </Link>
              </li>
              <li>
                <Link to="/brands" onClick={onCloseMobile} className={cn(currentPath === "/brands" && "active")}>
                  <i className="ph-duotone ph-tag"></i>
                  <span>Brands</span>
                </Link>
              </li>
              <li>
                <Link to="/units" onClick={onCloseMobile} className={cn(currentPath === "/units" && "active")}>
                  <i className="ph-duotone ph-scales"></i>
                  <span>Units</span>
                </Link>
              </li>
              <li>
                <Link to="/warehouse" onClick={onCloseMobile} className={cn(currentPath === "/warehouse" && "active")}>
                  <i className="ph-duotone ph-buildings"></i>
                  <span>Warehouse</span>
                </Link>
              </li>
              <li>
                <Link to="/barcode-print" onClick={onCloseMobile} className={cn(currentPath === "/barcode-print" && "active")}>
                  <i className="ph-duotone ph-barcode"></i>
                  <span>Barcode Print</span>
                </Link>
              </li>
              <li>
                <Link to="/qr-code-print" onClick={onCloseMobile} className={cn(currentPath === "/qr-code-print" && "active")}>
                  <i className="ph-duotone ph-qr-code"></i>
                  <span>QR Code Print</span>
                </Link>
              </li>
              <li>
                <Link to="/store" onClick={onCloseMobile} className={cn(currentPath === "/store" && "active")}>
                  <i className="ph-duotone ph-storefront"></i>
                  <span>Storefront Catalog</span>
                </Link>
              </li>

              {/* ===================== 3. SALES ===================== */}
              <li className="menu-title">
                <span>SALES</span>
              </li>
              <li>
                <Link to="/customers" onClick={onCloseMobile} className={cn(currentPath === "/customers" && "active")}>
                  <i className="ph-duotone ph-users"></i>
                  <span>Customers</span>
                </Link>
              </li>
              <li>
                <Link to="/sales-orders" onClick={onCloseMobile} className={cn(currentPath === "/sales-orders" && "active")}>
                  <i className="ph-duotone ph-shopping-cart"></i>
                  <span>Sales Orders</span>
                </Link>
              </li>
              <li>
                <Link to="/sales-quotes" onClick={onCloseMobile} className={cn(currentPath === "/sales-quotes" && "active")}>
                  <i className="ph-duotone ph-file-text"></i>
                  <span>Sales Quotes</span>
                </Link>
              </li>
              <li>
                <Link to="/invoices" onClick={onCloseMobile} className={cn(currentPath === "/invoices" && "active")}>
                  <i className="ph-duotone ph-receipt"></i>
                  <span>Invoices</span>
                </Link>
              </li>
              <li>
                <Link to="/delivery-notes" onClick={onCloseMobile} className={cn(currentPath === "/delivery-notes" && "active")}>
                  <i className="ph-duotone ph-truck"></i>
                  <span>Delivery Notes</span>
                </Link>
              </li>
              <li>
                <Link to="/credit-notes" onClick={onCloseMobile} className={cn(currentPath === "/credit-notes" && "active")}>
                  <i className="ph-duotone ph-arrow-u-down-left"></i>
                  <span>Credit Notes</span>
                </Link>
              </li>
              <li>
                <Link to="/cash-sales" onClick={onCloseMobile} className={cn(currentPath === "/cash-sales" && "active")}>
                  <i className="ph-duotone ph-currency-dollar"></i>
                  <span>Cash Sales</span>
                </Link>
              </li>
              <li>
                <Link to="/refunds" onClick={onCloseMobile} className={cn(currentPath === "/refunds" && "active")}>
                  <i className="ph-duotone ph-arrow-counter-clockwise"></i>
                  <span>Refunds</span>
                </Link>
              </li>
              <li>
                <Link to="/recurring-invoices" onClick={onCloseMobile} className={cn(currentPath === "/recurring-invoices" && "active")}>
                  <i className="ph-duotone ph-arrows-clockwise"></i>
                  <span>Recurring Invoices</span>
                </Link>
              </li>
              <li>
                <Link to="/sales-analytics" onClick={onCloseMobile} className={cn(currentPath === "/sales-analytics" && "active")}>
                  <i className="ph-duotone ph-chart-line-up"></i>
                  <span>Sales Analytics</span>
                </Link>
              </li>

              {/* ===================== 4. PURCHASE ===================== */}
              <li className="menu-title">
                <span>PURCHASE</span>
              </li>
              <li>
                <Link to="/purchases" onClick={onCloseMobile} className={cn(currentPath === "/purchases" && "active")}>
                  <i className="ph-duotone ph-shopping-bag"></i>
                  <span>Purchases</span>
                </Link>
              </li>
              <li>
                <Link to="/purchase-orders" onClick={onCloseMobile} className={cn(currentPath === "/purchase-orders" && "active")}>
                  <i className="ph-duotone ph-file-text"></i>
                  <span>Purchase Orders</span>
                </Link>
              </li>
              <li>
                <Link to="/purchase-return" onClick={onCloseMobile} className={cn(currentPath === "/purchase-return" && "active")}>
                  <i className="ph-duotone ph-arrow-u-down-left"></i>
                  <span>Purchase Return</span>
                </Link>
              </li>
              <li>
                <Link to="/vendors" onClick={onCloseMobile} className={cn(currentPath === "/vendors" && "active")}>
                  <i className="ph-duotone ph-truck"></i>
                  <span>Vendors</span>
                </Link>
              </li>
              <li>
                <Link to="/suppliers" onClick={onCloseMobile} className={cn(currentPath === "/suppliers" && "active")}>
                  <i className="ph-duotone ph-buildings"></i>
                  <span>Suppliers</span>
                </Link>
              </li>
              <li>
                <Link to="/procurement-analytics" onClick={onCloseMobile} className={cn(currentPath === "/procurement-analytics" && "active")}>
                  <i className="ph-duotone ph-chart-bar"></i>
                  <span>Procurement Analytics</span>
                </Link>
              </li>

              {/* ===================== 5. FINANCE ===================== */}
              <li className="menu-title">
                <span>FINANCE</span>
              </li>

              {/* Finance Reports Submenu */}
              <li className="submenu">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSubmenu("financeReports");
                  }}
                  className={cn(
                    "cursor-pointer",
                    openMenus.financeReports && "subdrop",
                    ["/expenses-report", "/profit-loss", "/income-expense", "/tax-summary", "/cashflow"].some(
                      (p) => currentPath === p || currentPath.startsWith(p + "/")
                    ) && "active"
                  )}
                >
                  <i className="ph-duotone ph-chart-pie"></i>
                  <span>Reports</span>
                  <span className="menu-arrow"></span>
                </a>
                <ul style={{ display: !isMini && openMenus.financeReports ? "block" : "none" }}>
                  <li>
                    <Link to="/expenses-report" onClick={onCloseMobile} className={cn(currentPath === "/expenses-report" && "active")}>
                      Expense Summary
                    </Link>
                  </li>
                  <li>
                    <Link to="/profit-loss" onClick={onCloseMobile} className={cn(currentPath === "/profit-loss" && "active")}>
                      Profit & Loss
                    </Link>
                  </li>
                  <li>
                    <Link to="/income-expense" onClick={onCloseMobile} className={cn(currentPath === "/income-expense" && "active")}>
                      Income vs Expense
                    </Link>
                  </li>
                  <li>
                    <Link to="/tax-summary" onClick={onCloseMobile} className={cn(currentPath === "/tax-summary" && "active")}>
                      Tax Summary
                    </Link>
                  </li>
                  <li>
                    <Link to="/cashflow" onClick={onCloseMobile} className={cn(currentPath === "/cashflow" && "active")}>
                      Cashflow
                    </Link>
                  </li>
                </ul>
              </li>

              <li>
                <Link to="/expenses" onClick={onCloseMobile} className={cn(currentPath === "/expenses" && "active")}>
                  <i className="ph-duotone ph-wallet"></i>
                  <span>Expenses</span>
                </Link>
              </li>
              <li>
                <Link to="/expense-category" onClick={onCloseMobile} className={cn(currentPath === "/expense-category" && "active")}>
                  <i className="ph-duotone ph-folder"></i>
                  <span>Expense Category</span>
                </Link>
              </li>
              <li>
                <Link to="/payments" onClick={onCloseMobile} className={cn(currentPath === "/payments" && "active")}>
                  <i className="ph-duotone ph-credit-card"></i>
                  <span>Payments</span>
                </Link>
              </li>
              <li>
                <Link to="/transactions" onClick={onCloseMobile} className={cn(currentPath === "/transactions" && "active")}>
                  <i className="ph-duotone ph-receipt"></i>
                  <span>Transactions</span>
                </Link>
              </li>
              <li>
                <Link to="/taxes" onClick={onCloseMobile} className={cn(currentPath === "/taxes" && "active")}>
                  <i className="ph-duotone ph-percent"></i>
                  <span>Taxes</span>
                </Link>
              </li>
              <li>
                <Link to="/budgets" onClick={onCloseMobile} className={cn(currentPath === "/budgets" && "active")}>
                  <i className="ph-duotone ph-chart-polar"></i>
                  <span>Budgeting</span>
                </Link>
              </li>
              <li>
                <Link to="/accounting" onClick={onCloseMobile} className={cn(currentPath === "/accounting" && "active")}>
                  <i className="ph-duotone ph-bank"></i>
                  <span>Ledgers & Accounting</span>
                </Link>
              </li>

              {/* ===================== 6. HRM ===================== */}
              <li className="menu-title">
                <span>HRM</span>
              </li>

              {/* Leaves Submenu */}
              <li className="submenu">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSubmenu("hrmLeave");
                  }}
                  className={cn(
                    "cursor-pointer",
                    openMenus.hrmLeave && "subdrop",
                    ["/leave", "/leave-types", "/leave-report"].some(
                      (p) => currentPath === p || currentPath.startsWith(p + "/")
                    ) && "active"
                  )}
                >
                  <i className="ph-duotone ph-calendar-blank"></i>
                  <span>Leaves</span>
                  <span className="menu-arrow"></span>
                </a>
                <ul style={{ display: !isMini && openMenus.hrmLeave ? "block" : "none" }}>
                  <li>
                    <Link to="/leave" onClick={onCloseMobile} className={cn(currentPath === "/leave" && "active")}>
                      Leaves
                    </Link>
                  </li>
                  <li>
                    <Link to="/leave-types" onClick={onCloseMobile} className={cn(currentPath === "/leave-types" && "active")}>
                      Leave Types
                    </Link>
                  </li>
                  <li>
                    <Link to="/leave-report" onClick={onCloseMobile} className={cn(currentPath === "/leave-report" && "active")}>
                      Leave Report
                    </Link>
                  </li>
                </ul>
              </li>

              <li>
                <Link to="/employees" onClick={onCloseMobile} className={cn(currentPath === "/employees" && "active")}>
                  <i className="ph-duotone ph-users-three"></i>
                  <span>Employees</span>
                </Link>
              </li>
              <li>
                <Link to="/departments" onClick={onCloseMobile} className={cn(currentPath === "/departments" && "active")}>
                  <i className="ph-duotone ph-tree-structure"></i>
                  <span>Departments</span>
                </Link>
              </li>
              <li>
                <Link to="/designations" onClick={onCloseMobile} className={cn(currentPath === "/designations" && "active")}>
                  <i className="ph-duotone ph-identification-badge"></i>
                  <span>Designations / Roles</span>
                </Link>
              </li>
              <li>
                <Link to="/attendance" onClick={onCloseMobile} className={cn(currentPath === "/attendance" && "active")}>
                  <i className="ph-duotone ph-clock"></i>
                  <span>Attendance</span>
                </Link>
              </li>
              <li>
                <Link to="/timesheets" onClick={onCloseMobile} className={cn(currentPath === "/timesheets" && "active")}>
                  <i className="ph-duotone ph-timer"></i>
                  <span>Timesheets</span>
                </Link>
              </li>
              <li>
                <Link to="/shifts" onClick={onCloseMobile} className={cn(currentPath === "/shifts" && "active")}>
                  <i className="ph-duotone ph-arrows-clockwise"></i>
                  <span>Shifts & Schedules</span>
                </Link>
              </li>
              <li>
                <Link to="/holidays" onClick={onCloseMobile} className={cn(currentPath === "/holidays" && "active")}>
                  <i className="ph-duotone ph-calendar"></i>
                  <span>Holidays</span>
                </Link>
              </li>
              <li>
                <Link to="/payroll" onClick={onCloseMobile} className={cn(currentPath === "/payroll" && "active")}>
                  <i className="ph-duotone ph-receipt"></i>
                  <span>Payroll</span>
                </Link>
              </li>
              <li>
                <Link to="/recruitment" onClick={onCloseMobile} className={cn(currentPath === "/recruitment" && "active")}>
                  <i className="ph-duotone ph-user-plus"></i>
                  <span>Recruitment</span>
                </Link>
              </li>
              <li>
                <Link to="/candidate-pipeline" onClick={onCloseMobile} className={cn(currentPath === "/candidate-pipeline" && "active")}>
                  <i className="ph-duotone ph-funnel"></i>
                  <span>Candidate Pipeline</span>
                </Link>
              </li>
              <li>
                <Link to="/interview-scheduler" onClick={onCloseMobile} className={cn(currentPath === "/interview-scheduler" && "active")}>
                  <i className="ph-duotone ph-video-camera"></i>
                  <span>Interview Scheduler</span>
                </Link>
              </li>
              <li>
                <Link to="/offer-management" onClick={onCloseMobile} className={cn(currentPath === "/offer-management" && "active")}>
                  <i className="ph-duotone ph-file-check"></i>
                  <span>Offer Management</span>
                </Link>
              </li>
              <li>
                <Link to="/sourcing-campaigns" onClick={onCloseMobile} className={cn(currentPath === "/sourcing-campaigns" && "active")}>
                  <i className="ph-duotone ph-megaphone"></i>
                  <span>Sourcing Campaigns</span>
                </Link>
              </li>
              <li>
                <Link to="/performance-appraisal" onClick={onCloseMobile} className={cn(currentPath === "/performance-appraisal" && "active")}>
                  <i className="ph-duotone ph-trend-up"></i>
                  <span>Performance & Appraisal</span>
                </Link>
              </li>
              <li>
                <Link to="/training" onClick={onCloseMobile} className={cn(currentPath === "/training" && "active")}>
                  <i className="ph-duotone ph-graduation-cap"></i>
                  <span>Training & Development</span>
                </Link>
              </li>
              <li>
                <Link to="/hr-analytics" onClick={onCloseMobile} className={cn(currentPath === "/hr-analytics" && "active")}>
                  <i className="ph-duotone ph-chart-bar"></i>
                  <span>HR Analytics</span>
                </Link>
              </li>

              {/* ===================== 7. CRM ===================== */}
              <li className="menu-title">
                <span>CRM</span>
              </li>
              <li>
                <Link to="/leads" onClick={onCloseMobile} className={cn(currentPath === "/leads" && "active")}>
                  <i className="ph-duotone ph-user-plus"></i>
                  <span>Leads</span>
                </Link>
              </li>
              <li>
                <Link to="/deals" onClick={onCloseMobile} className={cn(currentPath === "/deals" && "active")}>
                  <i className="ph-duotone ph-handshake"></i>
                  <span>Deals</span>
                </Link>
              </li>
              <li>
                <Link to="/contacts" onClick={onCloseMobile} className={cn(currentPath === "/contacts" && "active")}>
                  <i className="ph-duotone ph-identification-badge"></i>
                  <span>Contacts</span>
                </Link>
              </li>
              <li>
                <Link to="/companies" onClick={onCloseMobile} className={cn(currentPath === "/companies" && "active")}>
                  <i className="ph-duotone ph-buildings"></i>
                  <span>Companies</span>
                </Link>
              </li>
              <li>
                <Link to="/pipeline" onClick={onCloseMobile} className={cn(currentPath === "/pipeline" && "active")}>
                  <i className="ph-duotone ph-git-branch"></i>
                  <span>Pipeline</span>
                </Link>
              </li>
              <li>
                <Link to="/campaigns" onClick={onCloseMobile} className={cn(currentPath === "/campaigns" && "active")}>
                  <i className="ph-duotone ph-megaphone"></i>
                  <span>Campaigns</span>
                </Link>
              </li>
              <li>
                <Link to="/customer-feedback" onClick={onCloseMobile} className={cn(currentPath === "/customer-feedback" && "active")}>
                  <i className="ph-duotone ph-star"></i>
                  <span>Customer Feedback</span>
                </Link>
              </li>

              {/* ===================== 8. PROJECTS ===================== */}
              <li className="menu-title">
                <span>PROJECTS</span>
              </li>
              <li>
                <Link to="/projects" onClick={onCloseMobile} className={cn(currentPath === "/projects" && "active")}>
                  <i className="ph-duotone ph-kanban"></i>
                  <span>Projects</span>
                </Link>
              </li>
              <li>
                <Link to="/tasks" onClick={onCloseMobile} className={cn(currentPath === "/tasks" && "active")}>
                  <i className="ph-duotone ph-check-square"></i>
                  <span>Tasks</span>
                </Link>
              </li>
              <li>
                <Link to="/task-board" onClick={onCloseMobile} className={cn(currentPath === "/task-board" && "active")}>
                  <i className="ph-duotone ph-kanban"></i>
                  <span>Task Board</span>
                </Link>
              </li>
              <li>
                <Link to="/milestones" onClick={onCloseMobile} className={cn(currentPath === "/milestones" && "active")}>
                  <i className="ph-duotone ph-flag"></i>
                  <span>Milestones</span>
                </Link>
              </li>
              <li>
                <Link to="/resource-allocation" onClick={onCloseMobile} className={cn(currentPath === "/resource-allocation" && "active")}>
                  <i className="ph-duotone ph-users-four"></i>
                  <span>Resource Allocation</span>
                </Link>
              </li>
              <li>
                <Link to="/project-analytics" onClick={onCloseMobile} className={cn(currentPath === "/project-analytics" && "active")}>
                  <i className="ph-duotone ph-presentation-chart"></i>
                  <span>Project Analytics</span>
                </Link>
              </li>

              {/* ===================== 9. POS ===================== */}
              <li className="menu-title">
                <span>POS</span>
              </li>
              <li>
                <Link to="/pos" onClick={onCloseMobile} className={cn(currentPath === "/pos" && "active")}>
                  <i className="ph-duotone ph-desktop-tower"></i>
                  <span>POS Terminal</span>
                </Link>
              </li>
              <li>
                <Link to="/pos-orders" onClick={onCloseMobile} className={cn(currentPath === "/pos-orders" && "active")}>
                  <i className="ph-duotone ph-receipt"></i>
                  <span>POS Orders</span>
                </Link>
              </li>

              {/* ===================== 10. ASSETS ===================== */}
              <li className="menu-title">
                <span>ASSETS</span>
              </li>
              <li>
                <Link to="/asset-register" onClick={onCloseMobile} className={cn(currentPath === "/asset-register" && "active")}>
                  <i className="ph-duotone ph-hard-drive"></i>
                  <span>Asset Register</span>
                </Link>
              </li>
              <li>
                <Link to="/assignments" onClick={onCloseMobile} className={cn(currentPath === "/assignments" && "active")}>
                  <i className="ph-duotone ph-laptop"></i>
                  <span>Asset Allocation</span>
                </Link>
              </li>
              <li>
                <Link to="/disposal" onClick={onCloseMobile} className={cn(currentPath === "/disposal" && "active")}>
                  <i className="ph-duotone ph-trash"></i>
                  <span>Asset Disposal</span>
                </Link>
              </li>
              <li>
                <Link to="/asset-analytics" onClick={onCloseMobile} className={cn(currentPath === "/asset-analytics" && "active")}>
                  <i className="ph-duotone ph-chart-pie"></i>
                  <span>Asset Analytics</span>
                </Link>
              </li>

              {/* ===================== 11. DOCUMENTS ===================== */}
              <li className="menu-title">
                <span>DOCUMENTS</span>
              </li>
              <li>
                <Link to="/documents" onClick={onCloseMobile} className={cn(currentPath === "/documents" && "active")}>
                  <i className="ph-duotone ph-folder"></i>
                  <span>Document Repository</span>
                </Link>
              </li>
              <li>
                <Link to="/document-types" onClick={onCloseMobile} className={cn(currentPath === "/document-types" && "active")}>
                  <i className="ph-duotone ph-file-text"></i>
                  <span>Document Types</span>
                </Link>
              </li>

              {/* ===================== 12. SUPPORT ===================== */}
              <li className="menu-title">
                <span>SUPPORT</span>
              </li>
              <li>
                <Link to="/tickets" onClick={onCloseMobile} className={cn(currentPath === "/tickets" && "active")}>
                  <i className="ph-duotone ph-lifebuoy"></i>
                  <span>Tickets</span>
                </Link>
              </li>
              <li>
                <Link to="/knowledge-base" onClick={onCloseMobile} className={cn(currentPath === "/knowledge-base" && "active")}>
                  <i className="ph-duotone ph-book-open"></i>
                  <span>Knowledge Base</span>
                </Link>
              </li>
              <li>
                <Link to="/sla-management" onClick={onCloseMobile} className={cn(currentPath === "/sla-management" && "active")}>
                  <i className="ph-duotone ph-shield-check"></i>
                  <span>SLA Management</span>
                </Link>
              </li>

              {/* ===================== 13. MEMBERSHIP & ADD-ONS ===================== */}
              <li className="menu-title">
                <span>MEMBERSHIP & ADD-ONS</span>
              </li>
              <li>
                <Link to="/tenant/addon" onClick={onCloseMobile} className={cn(currentPath === "/tenant/addon" && "active")}>
                  <i className="ph-duotone ph-storefront text-indigo-500"></i>
                  <span>Add-on Store</span>
                </Link>
              </li>
              <li>
                <Link to="/tenant/subscription" onClick={onCloseMobile} className={cn(currentPath === "/tenant/subscription" && "active")}>
                  <i className="ph-duotone ph-crown text-amber-500"></i>
                  <span>Plan & Subscriptions</span>
                </Link>
              </li>
              <li>
                <Link to="/tenant/billing" onClick={onCloseMobile} className={cn(currentPath === "/tenant/billing" && "active")}>
                  <i className="ph-duotone ph-receipt"></i>
                  <span>Invoices & Billing</span>
                </Link>
              </li>

              {/* Extensions & Connectors */}
              {(() => {
                const extensionItems = resolveExtensionItems(isEntitled, isAdminOrSuper, currentPath);
                if (!extensionItems.length) return null;
                const anyActive = extensionItems.some((i) => i.isActive);

                return (
                  <li className="submenu">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu("extensions");
                      }}
                      className={cn(
                        "cursor-pointer",
                        openMenus.extensions && "subdrop",
                        anyActive && "active"
                      )}
                    >
                      <i className="ph-duotone ph-sparkle"></i>
                      <span>Installed Add-ons</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul style={{ display: !isMini && openMenus.extensions ? "block" : "none" }}>
                      {extensionItems.map((item) => (
                        <li key={item.id}>
                          <Link
                            to={item.route}
                            onClick={onCloseMobile}
                            className={cn(item.isActive && "active")}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })()}

              {/* ===================== 14. TENANT ADMINISTRATION ===================== */}
              {(isTenantAdmin || isSuperAdmin || currentPath.startsWith("/tenant")) && (
                <>
                  <li className="menu-title">
                    <span>TENANT ADMINISTRATION</span>
                  </li>
                  <li className="submenu">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu("tenantWorkspace");
                      }}
                      className={cn(
                        "cursor-pointer",
                        openMenus.tenantWorkspace && "subdrop",
                        currentPath.startsWith("/tenant") && "active"
                      )}
                    >
                      <i className="ph-duotone ph-buildings"></i>
                      <span>Workspace Control</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul style={{ display: !isMini && openMenus.tenantWorkspace ? "block" : "none" }}>
                      <li>
                        <Link
                          to="/tenant/dashboard"
                          onClick={onCloseMobile}
                          className={cn((currentPath === "/tenant/dashboard" || currentPath === "/tenant") && "active")}
                        >
                          Workspace Overview
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/tenant/company-profile"
                          onClick={onCloseMobile}
                          className={cn(currentPath === "/tenant/company-profile" && "active")}
                        >
                          Company Profile
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/tenant/users"
                          onClick={onCloseMobile}
                          className={cn(currentPath === "/tenant/users" && "active")}
                        >
                          Users & Access
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/tenant/roles"
                          onClick={onCloseMobile}
                          className={cn(currentPath === "/tenant/roles" && "active")}
                        >
                          Roles & Permissions
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/tenant/modules"
                          onClick={onCloseMobile}
                          className={cn(currentPath === "/tenant/modules" && "active")}
                        >
                          Modules & Subscriptions
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/tenant/branding"
                          onClick={onCloseMobile}
                          className={cn(currentPath === "/tenant/branding" && "active")}
                        >
                          Branding & White-label
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/tenant/domain"
                          onClick={onCloseMobile}
                          className={cn(currentPath === "/tenant/domain" && "active")}
                        >
                          Custom Domains
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/tenant/integrations"
                          onClick={onCloseMobile}
                          className={cn(currentPath === "/tenant/integrations" && "active")}
                        >
                          Integrations Hub
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/tenant/data"
                          onClick={onCloseMobile}
                          className={cn(currentPath === "/tenant/data" && "active")}
                        >
                          Data & Backups
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/tenant/audit-logs"
                          onClick={onCloseMobile}
                          className={cn(currentPath === "/tenant/audit-logs" && "active")}
                        >
                          Audit Logs
                        </Link>
                      </li>
                    </ul>
                  </li>
                </>
              )}

              {/* ===================== 15. SYSTEM SETTINGS ===================== */}
              <li className="menu-title">
                <span>SETTINGS & SYSTEM</span>
              </li>
              <li>
                <Link to="/tenant/settings" onClick={onCloseMobile} className={cn(currentPath === "/tenant/settings" && "active")}>
                  <i className="ph-duotone ph-gear-six"></i>
                  <span>Workspace Settings</span>
                </Link>
              </li>
              <li>
                <Link to="/two-factor-auth" onClick={onCloseMobile} className={cn(currentPath === "/two-factor-auth" && "active")}>
                  <i className="ph-duotone ph-shield-check text-emerald-600"></i>
                  <span>Two-Factor Auth (2FA)</span>
                </Link>
              </li>
              <li>
                <Link to="/settings" onClick={onCloseMobile} className={cn(currentPath === "/settings" && "active")}>
                  <i className="ph-duotone ph-sliders"></i>
                  <span>Security & System Settings</span>
                </Link>
              </li>
              <li>
                <Link to="/activity-logs" onClick={onCloseMobile} className={cn(currentPath === "/activity-logs" && "active")}>
                  <i className="ph-duotone ph-clock-counter-clockwise"></i>
                  <span>Activity Logs</span>
                </Link>
              </li>
              <li>
                <Link to="/backup-restore" onClick={onCloseMobile} className={cn(currentPath === "/backup-restore" && "active")}>
                  <i className="ph-duotone ph-cloud-arrow-up"></i>
                  <span>Backup & Restore</span>
                </Link>
              </li>
            

            {/* Super Admin Platform Operations (STRICTLY HIDDEN for Tenant Admin) */}
            {isSuperAdmin && (
              <>
                <li className="menu-title">
                  <span>PLATFORM CONTROL PLANE</span>
                </li>
                <li>
                  <Link
                    to="/ban-ip-address"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/ban-ip-address" && "active")}
                  >
                    <i className="ph-duotone ph-shield-warning"></i>
                    <span>Ban IP Address</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/clear-cache"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/clear-cache" && "active")}
                    title="Clear Cache & Maintenance"
                    aria-label="Clear Cache and Maintenance"
                  >
                    <i className="ph-duotone ph-broom" aria-hidden="true"></i>
                    <span>System Cache</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cronjob"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/cronjob" && "active")}
                  >
                    <i className="ph-duotone ph-clock-counter-clockwise"></i>
                    <span>Cronjob Management</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/super"
                    onClick={onCloseMobile}
                    className={cn(
                      "text-primary font-semibold",
                      currentPath.startsWith("/super") && "active"
                    )}
                  >
                    <i className="ph-duotone ph-shield-check"></i>
                    <span>Super Admin Console</span>
                  </Link>
                </li>
              </>
            )}
          </ul>
          )}
        </div>
      </div>
    </aside>
  );
}

