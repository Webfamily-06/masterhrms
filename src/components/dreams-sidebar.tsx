import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import type { ProfileWithRoles } from "@/lib/session";
import { isModuleAllowed, isWorkspaceAdminUser } from "@/lib/permissions";
import { useTenantBranding } from "@/lib/useTenantBranding";
import { cn } from "@/lib/utils";

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
    extensions: false,
  });

  const toggleSubmenu = (menuKey: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  const userRoles = profile?.roles || [];
  const isSuperAdmin = userRoles.includes("super_admin");
  const isAdminOrSuper = userRoles.some((r) =>
    ["admin", "super_admin", "tenant_admin", "hr_admin", "manager"].includes(r)
  );
  const isClientOnly = userRoles.includes("client") && !isAdminOrSuper;
  const isEmployeeOnly = userRoles.includes("employee") && !isAdminOrSuper;
  const homeRoute = isSuperAdmin ? "/super" : isClientOnly ? "/client-dashboard" : isEmployeeOnly ? "/employee-dashboard" : "/hrm-dashboard";

  return (
    <aside
      className={cn("sidebar", mobileOpen && "opened")}
      id="sidebar"
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
      <div className={cn("sidebar-logo flex items-center h-14 border-b border-border-color gap-2", isMini ? "justify-center px-2" : "px-3 sm:px-4")}>
        {isMini ? (
          /* Mini Mode Centered Favicon */
          <Link
            to={homeRoute}
            className="flex items-center justify-center size-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                "hidden lg:flex items-center justify-center size-7 rounded-md border transition-all cursor-pointer shadow-xs",
                collapsed
                  ? "bg-slate-100 dark:bg-slate-800 border-border-color text-muted-foreground hover:text-primary"
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
              className="sidebar-close lg:hidden size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border border-border-color"
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
        className="sidebar-inner"
        data-simplebar
        style={{ overflowY: "auto", height: "calc(100% - 56px)" }}
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
              <li className="menu-title">
                <span>EMPLOYEE WORKSPACE</span>
              </li>
              <li>
                <Link
                  to="/employee-dashboard"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/employee-dashboard" && "active")}
                >
                  <i className="ph-duotone ph-squares-four"></i>
                  <span>My Dashboard</span>
                </Link>
              </li>

              <li className="menu-title">
                <span>TIME & ATTENDANCE</span>
              </li>
              <li>
                <Link
                  to="/attendance"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/attendance" && "active")}
                >
                  <i className="ph-duotone ph-clock"></i>
                  <span>Attendance & Punch</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/attendance-employee"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/attendance-employee" && "active")}
                >
                  <i className="ph-duotone ph-calendar-dots"></i>
                  <span>Monthly Attendance Matrix</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/leave"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/leave" && "active")}
                >
                  <i className="ph-duotone ph-calendar-blank"></i>
                  <span>Leave Requests</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/shifts"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/shifts" && "active")}
                >
                  <i className="ph-duotone ph-calendar-check"></i>
                  <span>My Shifts</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/shift-swap-requests"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/shift-swap-requests" && "active")}
                >
                  <i className="ph-duotone ph-arrows-left-right"></i>
                  <span>Shift Swap Requests</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/overtime"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/overtime" && "active")}
                >
                  <i className="ph-duotone ph-timer"></i>
                  <span>Overtime Requests</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/work-from-home"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/work-from-home" && "active")}
                >
                  <i className="ph-duotone ph-house-line"></i>
                  <span>Work From Home</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/tasks"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/tasks" && "active")}
                >
                  <i className="ph-duotone ph-kanban"></i>
                  <span>My Tasks Board</span>
                </Link>
              </li>

              <li className="menu-title">
                <span>PAYROLL & CLAIMS</span>
              </li>
              <li>
                <Link
                  to="/payroll"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/payroll" && "active")}
                >
                  <i className="ph-duotone ph-money"></i>
                  <span>My Payslips</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/expenses"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/expenses" && "active")}
                >
                  <i className="ph-duotone ph-receipt"></i>
                  <span>Expense Claims</span>
                </Link>
              </li>

              <li className="menu-title">
                <span>WORK & COLLABORATION</span>
              </li>
              <li>
                <Link
                  to="/todo"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/todo" && "active")}
                >
                  <i className="ph-duotone ph-check-square"></i>
                  <span>My Tasks</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/training"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/training" && "active")}
                >
                  <i className="ph-duotone ph-graduation-cap"></i>
                  <span>Training & Learning</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/forms"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/forms" && "active")}
                >
                  <i className="ph-duotone ph-files"></i>
                  <span>Company Forms</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/documents"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/documents" && "active")}
                >
                  <i className="ph-duotone ph-folder"></i>
                  <span>My Documents</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/announcements"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/announcements" && "active")}
                >
                  <i className="ph-duotone ph-megaphone"></i>
                  <span>Announcements</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/helpdesk"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/helpdesk" && "active")}
                >
                  <i className="ph-duotone ph-lifebuoy"></i>
                  <span>Helpdesk Tickets</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/chat"
                  onClick={onCloseMobile}
                  className={cn(currentPath === "/chat" && "active")}
                >
                  <i className="ph-duotone ph-chat-circle-dots"></i>
                  <span>Team Chat</span>
                </Link>
              </li>
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
                {isModuleAllowed("hrm", profile) && (<li>
                  <Link
                    to="/hrm-dashboard"
                    onClick={onCloseMobile}
                    className={cn((currentPath === "/hrm-dashboard" || currentPath === "/dashboard") && "active")}
                  >
                    HRM Admin Dashboard
                  </Link>
                </li>)}
                <li>
                  <Link
                    to="/employee-dashboard"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/employee-dashboard" && "active")}
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
                    to="/help-desk-dashboard"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/help-desk-dashboard" && "active")}
                  >
                    Help Desk Dashboard
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
                    to="/it-admin-dashboard"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/it-admin-dashboard" && "active")}
                  >
                    IT Admin Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/learning-analytics"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/learning-analytics" && "active")}
                  >
                    Learning Analytics
                  </Link>
                </li>
                {isModuleAllowed("pos", profile) && (<li>
                  <Link
                    to="/pos-dashboard"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/pos-dashboard" && "active")}
                  >
                    POS Dashboard
                  </Link>
                </li>)}
                {isModuleAllowed("inventory", profile) && (<li>
                  <Link
                    to="/inventory-dashboard"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/inventory-dashboard" && "active")}
                  >
                    Inventory Dashboard
                  </Link>
                </li>)}
                {isModuleAllowed("crm", profile) && (<li>
                  <Link
                    to="/crm-dashboard"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/crm-dashboard" && "active")}
                  >
                    Sales CRM Dashboard
                  </Link>
                </li>)}
                {isModuleAllowed("finance", profile) && (<li>
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
                  {isModuleAllowed("support", profile) && (<li>
                    <Link
                      to="/support-dashboard"
                      onClick={onCloseMobile}
                      className={cn(currentPath === "/support-dashboard" && "active")}
                    >
                      Support Dashboard
                    </Link>
                  </li>)}
                  {isModuleAllowed("procurement", profile) && (<li>
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
                    to="/ai"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/ai" && "active font-semibold text-purple-600")}
                  >
                    AI Intelligence Center
                  </Link>
                </li>
                <li>
                  <Link
                    to="/chat"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/chat" && "active")}
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
                    to="/calendar"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/calendar" && "active")}
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
                    to="/todo"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/todo" && "active")}
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

            {/* ===================== PURCHASES & PROCUREMENT ===================== */}
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

            {/* ===================== SALES & BILLING ===================== */}
            <li className="menu-title">
              <span>SALES & BILLING</span>
            </li>
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
            <li>
              <Link
                to="/budgets"
                onClick={onCloseMobile}
                className={cn(currentPath === "/budgets" && "active")}
              >
                <i className="ph-duotone ph-piggy-bank"></i>
                <span>Budgets & Financial Plans</span>
              </Link>
            </li>
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
                to="/currencies"
                onClick={onCloseMobile}
                className={cn(currentPath === "/currencies" && "active")}
              >
                <i className="ph-duotone ph-coins"></i>
                <span>Currencies & FX</span>
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
            <li>
              <Link
                to="/suppliers"
                onClick={onCloseMobile}
                className={cn(currentPath === "/suppliers" && "active")}
              >
                <i className="ph-duotone ph-truck"></i>
                <span>Suppliers & Vendors</span>
              </Link>
            </li>

            {/* ===================== HRM SUITE ===================== */}
            <li className="menu-title">
              <span>HRM SUITE</span>
            </li>
            <li>
              <Link
                to="/hrm"
                onClick={onCloseMobile}
                className={cn(currentPath === "/hrm" && "active")}
              >
                <i className="ph-duotone ph-squares-four"></i>
                <span>HRM Hub</span>
              </Link>
            </li>
            <li>
              <Link
                to="/employees"
                onClick={onCloseMobile}
                className={cn(currentPath === "/employees" && "active")}
              >
                <i className="ph-duotone ph-users"></i>
                <span>Employee Directory</span>
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
                  [
                    "/attendance",
                    "/leave",
                    "/shifts",
                    "/shift-swap-requests",
                    "/overtime",
                    "/work-from-home",
                    "/biometric",
                    "/biometric-sync",
                  ].includes(currentPath) && "active"
                )}
              >
                <i className="ph-duotone ph-clock"></i>
                <span>Time & Attendance</span>
                <span className="menu-arrow"></span>
              </a>
              <ul style={{ display: !isMini && openMenus.time ? "block" : "none" }}>
                <li>
                  <Link
                    to="/attendance"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/attendance" && "active")}
                  >
                    Attendance Punching
                  </Link>
                </li>
                <li>
                  <Link
                    to="/leave"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/leave" && "active")}
                  >
                    Leave & PTO
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shifts"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/shifts" && "active")}
                  >
                    Shift Rostering
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shift-swap-requests"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/shift-swap-requests" && "active")}
                  >
                    Shift Swap Requests
                  </Link>
                </li>
                <li>
                  <Link
                    to="/overtime"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/overtime" && "active")}
                  >
                    Overtime Requests
                  </Link>
                </li>
                <li>
                  <Link
                    to="/work-from-home"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/work-from-home" && "active")}
                  >
                    Work From Home (WFH)
                  </Link>
                </li>
                <li>
                  <Link
                    to="/attendance-employee"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/attendance-employee" && "active")}
                  >
                    Attendance Matrix
                  </Link>
                </li>
                <li>
                  <Link
                    to="/daily-report"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/daily-report" && "active")}
                  >
                    Daily Attendance Report
                  </Link>
                </li>
                <li>
                  <Link
                    to="/biometric"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/biometric" && "active")}
                  >
                    Biometric Hardware
                  </Link>
                </li>
                <li>
                  <Link
                    to="/biometric-sync"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/biometric-sync" && "active")}
                  >
                    Device Sync Agent
                  </Link>
                </li>
              </ul>
            </li>

            {/* Payroll Runs */}
            <li>
              <Link
                to="/payroll"
                onClick={onCloseMobile}
                className={cn(currentPath === "/payroll" && "active")}
              >
                <i className="ph-duotone ph-coins"></i>
                <span>Payroll Runs</span>
              </Link>
            </li>

            {/* Talent & Recruitment Submenu */}
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
                  ["/recruitment", "/training", "/certification-tracking", "/campus-hiring", "/referrals"].includes(currentPath) && "active"
                )}
              >
                <i className="ph-duotone ph-briefcase"></i>
                <span>Talent & Hiring</span>
                <span className="menu-arrow"></span>
              </a>
              <ul style={{ display: !isMini && openMenus.talent ? "block" : "none" }}>
                <li>
                  <Link
                    to="/recruitment"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/recruitment" && "active")}
                  >
                    Recruitment ATS
                  </Link>
                </li>
                <li>
                  <Link
                    to="/campus-hiring"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/campus-hiring" && "active")}
                  >
                    Campus Hiring
                  </Link>
                </li>
                <li>
                  <Link
                    to="/referrals"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/referrals" && "active")}
                  >
                    Employee Referrals
                  </Link>
                </li>
                <li>
                  <Link
                    to="/training"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/training" && "active")}
                  >
                    Training & LMS
                  </Link>
                </li>
                <li>
                  <Link
                    to="/certification-tracking"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/certification-tracking" && "active")}
                  >
                    Certification Tracking
                  </Link>
                </li>
              </ul>
            </li>

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
                  ].includes(currentPath) && "active"
                )}
              >
                <i className="ph-duotone ph-folder"></i>
                <span>Employee Services</span>
                <span className="menu-arrow"></span>
              </a>
              <ul style={{ display: !isMini && openMenus.operations ? "block" : "none" }}>
                <li>
                  <Link
                    to="/helpdesk"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/helpdesk" && "active")}
                  >
                    Helpdesk Tickets
                  </Link>
                </li>
                <li>
                  <Link
                    to="/documents"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/documents" && "active")}
                  >
                    Document Vault
                  </Link>
                </li>
                <li>
                  <Link
                    to="/announcements"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/announcements" && "active")}
                  >
                    Company News
                  </Link>
                </li>
                <li>
                  <Link
                    to="/forms"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/forms" && "active")}
                  >
                    Form Builder
                  </Link>
                </li>
                <li>
                  <Link
                    to="/workflows"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/workflows" && "active")}
                  >
                    Automations
                  </Link>
                </li>
                <li>
                  <Link
                    to="/okr"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/okr" && "active")}
                  >
                    OKR & Goals
                  </Link>
                </li>
                <li>
                  <Link
                    to="/assets"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/assets" && "active")}
                  >
                    Asset Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="/offboarding"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/offboarding" && "active")}
                  >
                    Exit & Offboarding
                  </Link>
                </li>
                <li>
                  <Link
                    to="/notice-period-tracker"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/notice-period-tracker" && "active")}
                  >
                    Notice Period Tracker
                  </Link>
                </li>
                <li>
                  <Link
                    to="/resignation"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/resignation" && "active")}
                  >
                    Resignations
                  </Link>
                </li>
                <li>
                  <Link
                    to="/termination"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/termination" && "active")}
                  >
                    Terminations
                  </Link>
                </li>
                <li>
                  <Link
                    to="/awards"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/awards" && "active")}
                  >
                    Awards & Honors
                  </Link>
                </li>
                <li>
                  <Link
                    to="/warnings"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/warnings" && "active")}
                  >
                    Disciplinary Warnings
                  </Link>
                </li>
                <li>
                  <Link
                    to="/promotions"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/promotions" && "active")}
                  >
                    Promotions & Transfers
                  </Link>
                </li>
                <li>
                  <Link
                    to="/probation"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/probation" && "active")}
                  >
                    Probation Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="/provident-fund"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/provident-fund" && "active")}
                  >
                    Provident Fund
                  </Link>
                </li>
              </ul>
            </li>

            {/* ===================== EXTENSIONS ===================== */}
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
                  [
                    "/marketplace",
                    "/integrations",
                    "/google-workspace",
                    "/tally-importer",
                    "/whatsapp-alerts",
                    "/razorpay-gateway",
                  ].includes(currentPath) && "active"
                )}
              >
                <i className="ph-duotone ph-sparkle"></i>
                <span>Add-ons & Connectors</span>
                <span className="menu-arrow"></span>
              </a>
              <ul style={{ display: !isMini && openMenus.extensions ? "block" : "none" }}>
                <li>
                  <Link
                    to="/marketplace"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/marketplace" && "active")}
                  >
                    App Marketplace
                  </Link>
                </li>
                <li>
                  <Link
                    to="/integrations"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/integrations" && "active")}
                  >
                    WooCommerce Sync
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shopify"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/shopify" && "active")}
                  >
                    Shopify Sync
                  </Link>
                </li>
                <li>
                  <Link
                    to="/google-workspace"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/google-workspace" && "active")}
                  >
                    Google Workspace
                  </Link>
                </li>
                <li>
                  <Link
                    to="/tally-importer"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/tally-importer" && "active")}
                  >
                    Tally Prime Sync
                  </Link>
                </li>
                <li>
                  <Link
                    to="/whatsapp-alerts"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/whatsapp-alerts" && "active")}
                  >
                    WhatsApp Alerts
                  </Link>
                </li>
                <li>
                  <Link
                    to="/razorpay-gateway"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/razorpay-gateway" && "active")}
                  >
                    Razorpay Gateway
                  </Link>
                </li>
              </ul>
            </li>

            {/* ===================== SYSTEM & SETTINGS ===================== */}
            <li className="menu-title">
              <span>SETTINGS & SYSTEM</span>
            </li>
            <li>
              <Link
                to="/settings"
                onClick={onCloseMobile}
                className={cn(currentPath === "/settings" && "active")}
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

            {/* Super Admin Console (Conditional) */}
            {isSuperAdmin && (
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
            )}
          </ul>
          )}
        </div>
      </div>
    </aside>
  );
}

