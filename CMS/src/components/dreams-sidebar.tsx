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
};

const HR_SUBMENU_KEY_MAP: Record<string, string> = {
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
};

const HR_ICON_MAP: Record<string, string> = {
  // 01. Overview
  Dashboard: "ph-squares-four",
  Calendar: "ph-calendar",
  "My Tasks": "ph-check-square",
  "Team Chat": "ph-chat-circle-dots",
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

  // 06. Reports & Analytics
  Headcount: "ph-chart-bar",
  Attrition: "ph-user-minus",
  Statutory: "ph-shield-check",
  "Custom Reports": "ph-file-search",

  // 07. Add-ons & Integrations
  "Strategic Planning": "ph-target",
  Challenges: "ph-lightning",
  "Initiative Charters": "ph-scroll",
  "Planning Kanban": "ph-kanban",
  OKRs: "ph-compass",
  "Learning Analytics": "ph-chart-pie-slice",
  "Biometric Sync": "ph-fingerprint",
  "Notice Board": "ph-megaphone",
  "AI Assistant Usage": "ph-robot",
  "AI Document Generator": "ph-file-arrow-up",
  "Webhook Endpoints": "ph-webhooks-logo",
  "Suggestion Box": "ph-lightbulb",
  "Call History": "ph-phone-call",
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
    if (currentPath.startsWith("/addons/planning")) setOpenMenus((p) => ({ ...p, hrPlanning: true }));
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
                  <i className="ph-duotone ph-layers"></i>
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
                              const isChildActive =
                                child.path &&
                                (currentPath === child.path ||
                                  (child.path !== "/me" &&
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
                      const iconClass = HR_ICON_MAP[item.label] || "ph-folder";

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
                              const isChildActive =
                                child.path &&
                                (currentPath === child.path ||
                                  (child.path !== "/hr" &&
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
                          currentPath.startsWith(item.path + "/")));
                    const iconClass = HR_ICON_MAP[item.label] || "ph-circle";

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
            </ul>
          ) : (
            <ul>
              {/* ===================== MAIN ===================== */}
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
                    "/hrm-dashboard",
                    "/dashboard",
                    "/products",
                    "/pos",
                    "/accounting",
                    "/crm",
                    "/projects",
                    "/analytics",
                  ].includes(currentPath) && "active"
                )}
              >
                <i className="ph-duotone ph-squares-four"></i>
                <span>Dashboards</span>
                <span className="menu-arrow"></span>
              </a>
              <ul style={{ display: !isMini && openMenus.dashboards ? "block" : "none" }}>
                {(isTenantAdmin || isSuperAdmin) && (
                  <li>
                    <Link
                      to="/tenant/dashboard"
                      onClick={onCloseMobile}
                      className={cn((currentPath === "/tenant/dashboard" || currentPath === "/tenant") && "active")}
                    >
                      Tenant Workspace Dashboard
                    </Link>
                  </li>
                )}
                {isModuleAllowed("hrm", profile) && (<li>
                  <Link
                    to={isAdminOrSuper ? "/hr/dashboard" : "/hrm-dashboard"}
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hr/dashboard" || currentPath === "/hrm-dashboard" || currentPath === "/dashboard") && "active")}
                  >
                    HRM Admin Dashboard
                  </Link>
                </li>)}
                <li>
                  <Link
                    to="/me/dashboard"
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/me/dashboard" || currentPath === "/me" || currentPath === "/employee-dashboard") && "active")}
                  >
                    Employee Portal
                  </Link>
                </li>
                <li>
                  <Link
                    to="/client-dashboard"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/client-dashboard" && "active")}
                  >
                    Client Portal
                  </Link>
                </li>
                {isCrmUnlocked && isModuleAllowed("crm", profile) && (
                  <>
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
                  </>
                )}
                {isHrmsUnlocked && isModuleAllowed("hrm", profile) && (
                  <li>
                    <Link
                      to="/payroll-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/payroll-dashboard" && "active")}
                    >
                      Payroll Dashboard
                    </Link>
                  </li>
                )}
                {isEntitled("recruitment-ats") && (
                  <li>
                    <Link
                      to="/recruitment-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/recruitment-dashboard" && "active")}
                    >
                      Recruitment Dashboard
                    </Link>
                  </li>
                )}
                {isEntitled("support") && (
                  <li>
                    <Link
                      to="/help-desk-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/help-desk-dashboard" && "active")}
                    >
                      Help Desk Dashboard
                    </Link>
                  </li>
                )}
                {isEntitled("asset-management") && (
                  <li>
                    <Link
                      to="/asset-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/asset-dashboard" && "active")}
                    >
                      Asset Dashboard
                    </Link>
                  </li>
                )}
                {(isEntitled("support") || isAdminOrSuper) && (
                  <li>
                    <Link
                      to="/it-admin-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/it-admin-dashboard" && "active")}
                    >
                      IT Admin Dashboard
                    </Link>
                  </li>
                )}
                {isEntitled("learning-lms") && (
                  <li>
                    <Link
                      to="/learning-analytics"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/learning-analytics" && "active")}
                    >
                      Learning Analytics
                    </Link>
                  </li>
                )}
                {isPosUnlocked && isModuleAllowed("pos", profile) && (<li>
                  <Link
                    to="/pos-dashboard"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/pos-dashboard" && "active")}
                  >
                    POS Dashboard
                  </Link>
                </li>)}
                {isEntitled("inventory") && isModuleAllowed("inventory", profile) && (<li>
                  <Link
                    to="/inventory-dashboard"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/inventory-dashboard" && "active")}
                  >
                    Inventory Dashboard
                  </Link>
                </li>)}
                {isCrmUnlocked && isModuleAllowed("crm", profile) && (<li>
                  <Link
                    to="/crm-dashboard"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/crm-dashboard" && "active")}
                  >
                    Sales CRM Dashboard
                  </Link>
                </li>)}
                {isFinanceUnlocked && isModuleAllowed("finance", profile) && (<li>
                  <Link
                    to="/finance-dashboard"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/finance-dashboard" && "active")}
                  >
                    Finance Dashboard
                  </Link>
                </li>)}
                  {isModuleAllowed("project", profile) && (<li>
                    <Link
                      to="/project-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/project-dashboard" && "active")}
                    >
                      Project Dashboard
                    </Link>
                  </li>)}
                  {isEntitled("support") && isModuleAllowed("support", profile) && (<li>
                    <Link
                      to="/support-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/support-dashboard" && "active")}
                    >
                      Support Dashboard
                    </Link>
                  </li>)}
                  {isEntitled("procurement") && isModuleAllowed("procurement", profile) && (<li>
                    <Link
                      to="/procurement-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/procurement-dashboard" && "active")}
                    >
                      Procurement Dashboard
                    </Link>
                  </li>)}
                {isModuleAllowed("analytics", profile) && (<li>
                  <Link
                    to="/analytics"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/analytics" && "active")}
                  >
                    Analytics Overview
                  </Link>
                </li>)}
              </ul>
            </li>

            {/* HRMS AI Center Submenu */}
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
                  <Link
                    to="/ai-attendance-insights"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/ai-attendance-insights" && "active")}
                  >
                    AI Attendance Insights
                  </Link>
                </li>
                <li>
                  <Link
                    to="/ai-payroll-forecast"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/ai-payroll-forecast" && "active")}
                  >
                    AI Payroll Forecast
                  </Link>
                </li>
                <li>
                  <Link
                    to="/ai-hiring-forecast"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/ai-hiring-forecast" && "active")}
                  >
                    AI Hiring Forecast
                  </Link>
                </li>
                <li>
                  <Link
                    to="/ai-team-performance-insights"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/ai-team-performance-insights" && "active")}
                  >
                    AI Team Performance
                  </Link>
                </li>
                <li>
                  <Link
                    to="/ai-configuration"
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/ai-configuration" || currentPath === "/ai-settings") && "active")}
                  >
                    AI Settings
                  </Link>
                </li>
                <li>
                  <Link
                    to="/ai"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/ai" && "active")}
                  >
                    AI Copilot & Hub
                  </Link>
                </li>
              </ul>
            </li>

            {/* ===================== TENANT ADMINISTRATION ===================== */}
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
                        to="/tenant/subscription"
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/tenant/subscription" && "active")}
                      >
                        Plan & Subscription
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/tenant/billing"
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/tenant/billing" && "active")}
                      >
                        Invoices & Billing
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
                        Security Audit Logs
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/tenant/support"
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/tenant/support" && "active")}
                      >
                        Priority Support
                      </Link>
                    </li>
                  </ul>
                </li>
              </>
            )}

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
                  ["/chat", "/calendar", "/notes", "/todo", "/ai-ocr", "/ai-writer"].includes(currentPath) &&
                    "active"
                )}
              >
                <i className="ph-duotone ph-house"></i>
                <span>Applications</span>
                <span className="menu-arrow"></span>
              </a>
              <ul style={{ display: !isMini && openMenus.apps ? "block" : "none" }}>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/chat" : "/me/chat"}
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hr/chat" || currentPath === "/me/chat" || currentPath === "/chat") && "active")}
                  >
                    Team Chat
                  </Link>
                </li>
                <li>
                  <Link
                    to="/call-history"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/call-history" && "active")}
                  >
                    Call History
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/calendar" : "/me/calendar"}
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hr/calendar" || currentPath === "/me/calendar" || currentPath === "/calendar") && "active")}
                  >
                    Calendar
                  </Link>
                </li>
                <li>
                  <Link
                    to="/notes"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/notes" && "active")}
                  >
                    Personal Notes
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/todo" : "/me/todo"}
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hr/todo" || currentPath === "/me/todo" || currentPath === "/todo") && "active")}
                  >
                    Todo Action List
                  </Link>
                </li>
                <li>
                  <Link
                    to="/tasks"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/tasks" && "active")}
                  >
                    Personal Tasks Board
                  </Link>
                </li>
                <li>
                  <Link
                    to="/task-board"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/task-board" && "active")}
                  >
                    Enterprise Kanban Board
                  </Link>
                </li>
                <li>
                  <a
                    href="/customer-display"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between"
                  >
                    <span>Dual Customer Display</span>
                    <i className="ph-duotone ph-arrow-square-out text-xs"></i>
                  </a>
                </li>
                <li>
                  <Link
                    to="/ai-ocr"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/ai-ocr" && "active")}
                  >
                    AI Document OCR
                  </Link>
                </li>
                <li>
                  <Link
                    to="/ai-writer"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/ai-writer" && "active")}
                  >
                    AI Copywriter
                  </Link>
                </li>
              </ul>
            </li>

            {/* ===================== INVENTORY & PURCHASES ===================== */}
            {isPosUnlocked && (
              <>
                <li className="menu-title">
                  <span>POINT OF SALE & INVENTORY</span>
                </li>
                <li>
                  <Link
                    to="/pos"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/pos" && "active")}
                    title="POS Billing Terminal"
                    aria-label="POS Billing Terminal"
                  >
                    <i className="ph-duotone ph-shopping-cart" aria-hidden="true"></i>
                    <span>POS Terminal</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/products"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/products" && "active")}
                    title="Products & Warehouse Stock"
                    aria-label="Products and Warehouse Stock"
                  >
                    <i className="ph-duotone ph-cube" aria-hidden="true"></i>
                    <span>Products & Stock</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/transfers"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/transfers" && "active")}
                    title="Stock Transfers & In-Transit"
                    aria-label="Stock Transfers and In-Transit"
                  >
                    <i className="ph-duotone ph-arrows-left-right" aria-hidden="true"></i>
                    <span>Stock Transfers</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/adjustments"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/adjustments" && "active")}
                    title="Stock Adjustments & Audit"
                    aria-label="Stock Adjustments and Audit"
                  >
                    <i className="ph-duotone ph-sliders-horizontal" aria-hidden="true"></i>
                    <span>Stock Adjustments</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/store"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/store" && "active")}
                    title="Online Storefront Catalog"
                    aria-label="Online Storefront Catalog"
                  >
                    <i className="ph-duotone ph-storefront" aria-hidden="true"></i>
                    <span>Storefront Catalog</span>
                  </Link>
                </li>
              </>
            )}

            {/* ===================== PURCHASES & PROCUREMENT ===================== */}
            {(isSuperAdmin || (isEntitled("procurement") && isModuleAllowed("purchases", profile))) && (
              <>
                <li className="menu-title">
                  <span>PROCUREMENT</span>
                </li>
                <li>
                  <Link
                    to="/purchases"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/purchases" && "active")}
                    title="Purchase Orders & Inward"
                    aria-label="Purchase Orders and Inward"
                  >
                    <i className="ph-duotone ph-truck" aria-hidden="true"></i>
                    <span>Purchase Orders</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/suppliers"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/suppliers" && "active")}
                  >
                    <i className="ph-duotone ph-buildings"></i>
                    <span>Supplier Master Directory</span>
                  </Link>
                </li>
              </>
            )}

            {/* ===================== SALES & BILLING ===================== */}
            {(isCrmUnlocked || isFinanceUnlocked) && (
              <>
                <li className="menu-title">
                  <span>SALES & BILLING</span>
                </li>
                {isCrmUnlocked && (
                  <>
                    <li>
                      <Link
                        to="/contacts"
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/contacts" && "active")}
                      >
                        <i className="ph-duotone ph-identification-badge"></i>
                        <span>Contacts CRM</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/companies"
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/companies" && "active")}
                      >
                        <i className="ph-duotone ph-buildings"></i>
                        <span>CRM Companies</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/pipeline"
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/pipeline" && "active")}
                      >
                        <i className="ph-duotone ph-git-branch"></i>
                        <span>Sales Pipelines</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/clients"
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/clients" && "active")}
                      >
                        <i className="ph-duotone ph-users-three"></i>
                        <span>Clients Directory</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/crm"
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/crm" && "active")}
                      >
                        <i className="ph-duotone ph-address-book"></i>
                        <span>Customers & CRM</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={"/campaigns" as any}
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/campaigns" && "active")}
                      >
                        <i className="ph-duotone ph-megaphone"></i>
                        <span>Marketing Campaigns</span>
                      </Link>
                    </li>
                  </>
                )}
                {isFinanceUnlocked && (
                  <>
                    <li>
                      <Link
                        to="/invoices"
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/invoices" && "active")}
                      >
                        <i className="ph-duotone ph-receipt"></i>
                        <span>Invoices & Billing</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={"/recurring-invoices" as any}
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/recurring-invoices" && "active")}
                      >
                        <i className="ph-duotone ph-arrows-clockwise"></i>
                        <span>Recurring Invoices</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={"/portal/invoices/INV-2026-001" as any}
                        onClick={onCloseMobile}
                        className={cn(currentPath.startsWith("/portal/invoices") && "active")}
                        title="Client Invoice Portal (B2B)"
                        aria-label="Client Invoice Portal B2B"
                      >
                        <i className="ph-duotone ph-arrow-square-out" aria-hidden="true"></i>
                        <span>Client Portal (B2B)</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/proposals"
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/proposals" && "active")}
                      >
                        <i className="ph-duotone ph-notification"></i>
                        <span>Proposals & Quotes</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/accounting"
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/accounting" && "active")}
                      >
                        <i className="ph-duotone ph-bank"></i>
                        <span>Ledgers & Accounting</span>
                      </Link>
                    </li>
                    {resolveIntegratedAddons(isEntitled, isAdminOrSuper, "finance-accounting", currentPath).map((item) => (
                      <li key={item.id}>
                        <Link
                          to={item.route}
                          onClick={onCloseMobile}
                          className={cn(item.isActive && "active")}
                        >
                          <i className={cn("ph-duotone", item.icon || "ph-arrows-left-right")}></i>
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link
                        to="/taxes"
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/taxes" && "active")}
                      >
                        <i className="ph-duotone ph-percent"></i>
                        <span>Tax Rates & GST Slabs</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/expenses"
                        onClick={onCloseMobile}
                        className={cn(currentPath === "/expenses" && "active")}
                      >
                        <i className="ph-duotone ph-wallet"></i>
                        <span>Expense Claims</span>
                      </Link>
                    </li>
                  </>
                )}
              </>
            )}

            {/* ===================== STANDALONE APPLICATION MODULES ===================== */}
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

            {/* ===================== HRM SUITE ===================== */}
            {isHrmsUnlocked && (
              <>
                <li className="menu-title">
                  <span>HRM SUITE</span>
                </li>
            <li>
              <Link
                to={isAdminOrSuper ? "/hr/dashboard" : "/me/dashboard"}
                onClick={onCloseMobile}
                className={cn((currentPath === "/hr/dashboard" || currentPath === "/me/dashboard" || currentPath === "/hrm") && "active")}
              >
                <i className="ph-duotone ph-squares-four"></i>
                <span>HRM Hub</span>
              </Link>
            </li>
            <li>
              <Link
                to={isAdminOrSuper ? "/hr/employees" : "/me/employees"}
                onClick={onCloseMobile}
                className={cn((currentPath === "/hr/employees" || currentPath === "/me/employees" || currentPath === "/employees") && "active")}
              >
                <i className="ph-duotone ph-users"></i>
                <span>Employee Directory</span>
              </Link>
            </li>
            <li>
              <Link
                to={isAdminOrSuper ? "/hr/approvals" : "/me/approvals"}
                onClick={onCloseMobile}
                className={cn((currentPath === "/hr/approvals" || currentPath === "/me/approvals" || currentPath === "/manager-hub") && "active")}
              >
                <i className="ph-duotone ph-user-check"></i>
                <span>Manager Hub & Approvals</span>
              </Link>
            </li>

            {/* Time & Attendance Submenu */}
            <li className="submenu">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toggleSubmenu("time");
                }}
                className={cn(
                  "cursor-pointer",
                  openMenus.time && "subdrop",
                  (
                    currentPath.startsWith("/hr/attendance") ||
                    currentPath.startsWith("/hr/leave") ||
                    currentPath.startsWith("/me/attendance") ||
                    currentPath.startsWith("/me/leave") ||
                    [
                      "/attendance",
                      "/leave",
                      "/shifts",
                      "/shift-swap-requests",
                      "/overtime",
                      "/work-from-home",
                      "/biometric",
                      "/biometric-sync",
                    ].includes(currentPath)
                  ) && "active"
                )}
              >
                <i className="ph-duotone ph-clock"></i>
                <span>Time & Attendance</span>
                <span className="menu-arrow"></span>
              </a>
              <ul style={{ display: !isMini && openMenus.time ? "block" : "none" }}>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/attendance" : "/me/attendance/records"}
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hr/attendance" || currentPath === "/me/attendance/records" || currentPath === "/attendance") && "active")}
                  >
                    Attendance Punching
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/leave/applications" : "/me/leave/applications"}
                    onClick={onCloseMobile}
                    className={cn((currentPath.startsWith("/hr/leave") || currentPath.startsWith("/me/leave") || currentPath === "/leave") && "active")}
                  >
                    Leave & PTO
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/attendance/shifts" : "/me/attendance/shifts"}
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hr/attendance/shifts" || currentPath === "/me/attendance/shifts" || currentPath === "/shifts") && "active")}
                  >
                    Shift Rostering
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/attendance/shifts" : "/me/attendance/requests"}
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hr/attendance/shifts" || currentPath === "/shift-swap-requests") && "active")}
                  >
                    Shift Swap Requests
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/attendance/records" : "/me/attendance/requests"}
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/overtime" && "active")}
                  >
                    Overtime Requests
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/attendance/regularizations" : "/me/attendance/regularizations"}
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/work-from-home" && "active")}
                  >
                    Work From Home (WFH)
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/attendance/records" : "/me/attendance/records"}
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hr/attendance/records" || currentPath === "/attendance-employee") && "active")}
                  >
                    Attendance Matrix
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/attendance/timesheets" : "/me/attendance/timesheet"}
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hr/attendance/timesheets" || currentPath === "/daily-report") && "active")}
                  >
                    Daily Attendance Report
                  </Link>
                </li>
                {resolveIntegratedAddons(isEntitled, isAdminOrSuper, "time-attendance", currentPath).map((item) => (
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

            {/* Payroll Runs */}
            <li>
              <Link
                to={isAdminOrSuper ? "/hr/payroll/runs" : "/me/payroll/payslips"}
                onClick={onCloseMobile}
                className={cn((currentPath.startsWith("/hr/payroll") || currentPath.startsWith("/me/payroll") || currentPath === "/payroll") && "active")}
              >
                <i className="ph-duotone ph-coins"></i>
                <span>Payroll Runs</span>
              </Link>
            </li>

            {/* Talent & Recruitment Submenu */}
            {(isEntitled("recruitment-ats") || isEntitled("learning-lms")) && (
              <li className="submenu">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSubmenu("talent");
                  }}
                  className={cn(
                    "cursor-pointer",
                    openMenus.talent && "subdrop",
                    (
                      currentPath.startsWith("/hr/recruitment") ||
                      currentPath.startsWith("/hr/training") ||
                      currentPath.startsWith("/me/recruitment") ||
                      currentPath.startsWith("/me/training") ||
                      [
                        "/recruitment",
                        "/training",
                        "/certification-tracking",
                        "/campus-hiring",
                        "/referrals",
                      ].includes(currentPath)
                    ) && "active"
                  )}
                >
                  <i className="ph-duotone ph-briefcase"></i>
                  <span>Talent & Hiring</span>
                  <span className="menu-arrow"></span>
                </a>
                <ul style={{ display: !isMini && openMenus.talent ? "block" : "none" }}>
                  {isEntitled("recruitment-ats") && (
                    <>
                      <li>
                        <Link
                          to={isAdminOrSuper ? "/hr/recruitment/job-postings" : "/me/recruitment/job-postings"}
                          onClick={onCloseMobile}
                          className={cn((currentPath === "/hr/recruitment/job-postings" || currentPath === "/me/recruitment/job-postings" || currentPath === "/recruitment") && "active")}
                        >
                          Recruitment ATS
                        </Link>
                      </li>
                      <li>
                        <Link
                          to={isAdminOrSuper ? "/hr/recruitment/candidates" : "/me/recruitment/job-postings"}
                          onClick={onCloseMobile}
                          className={cn((currentPath === "/hr/recruitment/candidates" || currentPath === "/campus-hiring") && "active")}
                        >
                          Campus Hiring
                        </Link>
                      </li>
                      <li>
                        <Link
                          to={isAdminOrSuper ? "/hr/recruitment/referrals" : "/me/recruitment/job-postings"}
                          onClick={onCloseMobile}
                          className={cn((currentPath === "/hr/recruitment/referrals" || currentPath === "/referrals") && "active")}
                        >
                          Employee Referrals
                        </Link>
                      </li>
                    </>
                  )}
                  {isEntitled("learning-lms") && (
                    <>
                      <li>
                        <Link
                          to={isAdminOrSuper ? "/hr/training/employee-trainings" : "/me/training/trainings"}
                          onClick={onCloseMobile}
                          className={cn((currentPath.startsWith("/hr/training") || currentPath.startsWith("/me/training") || currentPath === "/training") && "active")}
                        >
                          Training & LMS
                        </Link>
                      </li>
                      <li>
                        <Link
                          to={isAdminOrSuper ? "/hr/training/programs" : "/me/training/programs"}
                          onClick={onCloseMobile}
                          className={cn(currentPath === "/certification-tracking" && "active")}
                        >
                          Certification Tracking
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              </li>
            )}

            {/* Operations & Services Submenu */}
            <li className="submenu">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toggleSubmenu("operations");
                }}
                className={cn(
                  "cursor-pointer",
                  openMenus.operations && "subdrop",
                  (
                    currentPath.startsWith("/hr/documents") ||
                    currentPath.startsWith("/hr/assets") ||
                    currentPath.startsWith("/hr/lifecycle") ||
                    currentPath.startsWith("/hr/performance") ||
                    currentPath.startsWith("/me/documents") ||
                    currentPath.startsWith("/me/assets") ||
                    currentPath.startsWith("/me/lifecycle") ||
                    currentPath.startsWith("/me/performance") ||
                    currentPath.startsWith("/me/helpdesk") ||
                    [
                      "/helpdesk",
                      "/documents",
                      "/announcements",
                      "/awards",
                      "/warnings",
                      "/promotions",
                      "/probation",
                      "/offboarding",
                      "/resignation",
                      "/termination",
                      "/forms",
                      "/workflows",
                      "/okr",
                      "/assets",
                      "/provident-fund",
                    ].includes(currentPath)
                  ) && "active"
                )}
              >
                <i className="ph-duotone ph-folder"></i>
                <span>Employee Services</span>
                <span className="menu-arrow"></span>
              </a>
              <ul style={{ display: !isMini && openMenus.operations ? "block" : "none" }}>
                {isEntitled("support") && (
                  <li>
                    <Link
                      to={isAdminOrSuper ? "/hr/lifecycle/complaints" : "/me/helpdesk"}
                      onClick={onCloseMobile}
                      className={cn((currentPath === "/hr/lifecycle/complaints" || currentPath === "/me/helpdesk" || currentPath === "/helpdesk") && "active")}
                    >
                      Helpdesk Tickets
                    </Link>
                  </li>
                )}
                {isEntitled("documents") && (
                  <li>
                    <Link
                      to={isAdminOrSuper ? "/hr/documents" : "/me/documents"}
                      onClick={onCloseMobile}
                      className={cn((currentPath.startsWith("/hr/documents") || currentPath.startsWith("/me/documents") || currentPath === "/documents") && "active")}
                    >
                      Document Vault
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/organization/announcements" : "/me/organization/announcements"}
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hr/organization/announcements" || currentPath === "/me/organization/announcements" || currentPath === "/announcements") && "active")}
                  >
                    Company News
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/recruitment/assessments" : "/me/documents"}
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/forms" && "active")}
                  >
                    Form Builder
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/settings" : "/me/dashboard"}
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/workflows" && "active")}
                  >
                    Automations
                  </Link>
                </li>
                {isEntitled("okr-performance") && (
                  <li>
                    <Link
                      to={isAdminOrSuper ? "/hr/performance/goals" : "/me/performance/goals"}
                      onClick={onCloseMobile}
                      className={cn((currentPath === "/hr/performance/goals" || currentPath === "/me/performance/goals" || currentPath === "/okr") && "active")}
                    >
                      OKR & Goals
                    </Link>
                  </li>
                )}
                {isEntitled("asset-management") && (
                  <li>
                    <Link
                      to={isAdminOrSuper ? "/hr/assets" : "/me/assets"}
                      onClick={onCloseMobile}
                      className={cn((currentPath.startsWith("/hr/assets") || currentPath.startsWith("/me/assets") || currentPath === "/assets") && "active")}
                    >
                      Asset Management
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/lifecycle/resignations" : "/me/lifecycle/resignation"}
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/offboarding" && "active")}
                  >
                    Exit & Offboarding
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/lifecycle/resignations" : "/me/lifecycle/resignation"}
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/notice-period-tracker" && "active")}
                  >
                    Notice Period Tracker
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/lifecycle/resignations" : "/me/lifecycle/resignation"}
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hr/lifecycle/resignations" || currentPath === "/me/lifecycle/resignation" || currentPath === "/resignation") && "active")}
                  >
                    Resignations
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/lifecycle/terminations" : "/me/lifecycle/terminations"}
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hr/lifecycle/terminations" || currentPath === "/me/lifecycle/terminations" || currentPath === "/termination") && "active")}
                  >
                    Terminations
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/lifecycle/awards" : "/me/lifecycle/awards"}
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hr/lifecycle/awards" || currentPath === "/me/lifecycle/awards" || currentPath === "/awards") && "active")}
                  >
                    Awards & Honors
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/lifecycle/warnings" : "/me/lifecycle/warnings"}
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hr/lifecycle/warnings" || currentPath === "/me/lifecycle/warnings" || currentPath === "/warnings") && "active")}
                  >
                    Disciplinary Warnings
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/lifecycle/promotions" : "/me/lifecycle/promotions"}
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hr/lifecycle/promotions" || currentPath === "/me/lifecycle/promotions" || currentPath === "/promotions") && "active")}
                  >
                    Promotions & Transfers
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/employees" : "/me/employees"}
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/probation" && "active")}
                  >
                    Probation Management
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAdminOrSuper ? "/hr/payroll/components" : "/me/payroll/salary"}
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/provident-fund" && "active")}
                  >
                    Provident Fund
                  </Link>
                </li>
              </ul>
            </li>
          </>
        )}

            {/* ===================== EXTENSIONS & ADD-ONS ===================== */}
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

            {/* ===================== SYSTEM & SETTINGS ===================== */}
            <li className="menu-title">
              <span>SETTINGS & SYSTEM</span>
            </li>
            <li>
              <Link
                to={isAdminOrSuper ? "/hr/settings" : "/settings"}
                onClick={onCloseMobile}
                className={cn((currentPath === "/hr/settings" || currentPath === "/settings") && "active")}
              >
                <i className="ph-duotone ph-gear"></i>
                <span>Settings</span>
              </Link>
            </li>
            <li>
              <Link
                to="/settings/custom-domain"
                onClick={onCloseMobile}
                className={cn(currentPath.startsWith("/settings/custom-domain") && "active")}
              >
                <i className="ph-duotone ph-globe"></i>
                <span>Custom Domain</span>
              </Link>
            </li>
            <li>
              <Link
                to={"/custom-fields" as any}
                onClick={onCloseMobile}
                className={cn(currentPath === "/custom-fields" && "active")}
              >
                <i className="ph-duotone ph-sliders"></i>
                <span>Custom Fields</span>
              </Link>
            </li>
            <li>
              <Link
                to="/users"
                onClick={onCloseMobile}
                className={cn(currentPath === "/users" && "active")}
              >
                <i className="ph-duotone ph-user-gear"></i>
                <span>Users & Roles</span>
              </Link>
            </li>
            <li>
              <Link
                to="/subscription"
                onClick={onCloseMobile}
                className={cn(currentPath === "/subscription" && "active")}
              >
                <i className="ph-duotone ph-credit-card"></i>
                <span>Plan & Subscription</span>
              </Link>
            </li>
            {/* Developer Docs Portal */}
            <li>
              <Link
                to="/docs"
                onClick={onCloseMobile}
                className={cn(currentPath === "/docs" && "active", "text-blue-600 dark:text-blue-400 font-medium")}
              >
                <i className="ph-duotone ph-book-open"></i>
                <span>Documentation Portal</span>
              </Link>
            </li>

            {/* Developer Console & API Panel */}
            <li>
              <Link
                to="/developer"
                onClick={onCloseMobile}
                className={cn(currentPath === "/developer" && "active", "text-indigo-600 dark:text-indigo-400 font-medium")}
              >
                <i className="ph-duotone ph-terminal-window"></i>
                <span>Developer API Console</span>
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

