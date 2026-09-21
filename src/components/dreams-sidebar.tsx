import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import type { ProfileWithRoles } from "@/lib/session";
import { isModuleAllowed, isWorkspaceAdminUser } from "@/lib/permissions";
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

  const isSuperAdmin = profile?.roles?.includes("super_admin");

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
            to="/dashboard"
            className="flex items-center justify-center size-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Master HRMS & ERP"
          >
            <img
              src="/favicon.webp"
              alt="Master HRMS"
              className="size-7 object-contain"
            />
          </Link>
        ) : (
          <>
            {/* Full Brand Logo */}
            <Link
              to="/dashboard"
              className="brand-logo logo flex items-center gap-2 flex-1 min-w-0 overflow-hidden"
              onClick={onCloseMobile}
            >
              <img
                src="/logo.webp"
                alt="Master HRMS & ERP"
                className="h-8 max-h-8 w-auto object-contain dark:brightness-110"
              />
            </Link>

            {/* Desktop Pin / Hover Mode Switch Button */}
            <button
              type="button"
              id="toggle_btn"
              onClick={handleToggleCollapse}
              className={cn(
                "hidden lg:flex items-center justify-center size-8 rounded-lg border transition-all cursor-pointer shadow-xs",
                collapsed
                  ? "bg-slate-100 dark:bg-slate-800 border-border-color text-muted-foreground hover:text-primary"
                  : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
              )}
              title={collapsed ? "Pin Sidebar (Fixed 250px)" : "Unpin Sidebar (Mini Hover Mode)"}
              aria-label="Toggle Sidebar Pin Mode"
            >
              <i className={cn("text-base ph-duotone", collapsed ? "ph-circle" : "ph-record")}></i>
            </button>

            {/* Quick Full View Dashboard Toggle Button */}
            {onToggleFullView && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFullView();
                }}
                className="hidden lg:flex items-center justify-center size-8 rounded-lg border border-border-color bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-primary hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-xs"
                title="Full View Dashboard (Hide Sidebar)"
                aria-label="Full View Dashboard"
              >
                <i className="text-base ph-duotone ph-arrows-out-line-horizontal"></i>
              </button>
            )}

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
                    to="/dashboard"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/dashboard" && "active")}
                  >
                    HRM Dashboard
                  </Link>
                </li>)}
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
                  ["/chat", "/pos", "/ai-ocr", "/ai-writer"].includes(currentPath) &&
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
                    to="/chat"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/chat" && "active")}
                  >
                    Team Chat
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pos"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/pos" && "active")}
                  >
                    POS Retail Register
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
              >
                <i className="ph-duotone ph-shopping-cart"></i>
                <span>POS Billing Terminal</span>
                <span className="badge badge-xs bg-orange-500 text-white ml-auto font-bold px-1.5 py-0.5 rounded text-[10px]">
                  POS
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/products"
                onClick={onCloseMobile}
                className={cn(currentPath === "/products" && "active")}
              >
                <i className="ph-duotone ph-cube"></i>
                <span>Products & Warehouse Stock</span>
              </Link>
            </li>
            <li>
              <Link
                to="/transfers"
                onClick={onCloseMobile}
                className={cn(currentPath === "/transfers" && "active")}
              >
                <i className="ph-duotone ph-arrows-left-right"></i>
                <span>Stock Transfers & In-Transit</span>
              </Link>
            </li>
            <li>
              <Link
                to="/adjustments"
                onClick={onCloseMobile}
                className={cn(currentPath === "/adjustments" && "active")}
              >
                <i className="ph-duotone ph-sliders-horizontal"></i>
                <span>Stock Adjustments & Audit</span>
              </Link>
            </li>
            <li>
              <Link
                to="/store"
                onClick={onCloseMobile}
                className={cn(currentPath === "/store" && "active")}
              >
                <i className="ph-duotone ph-storefront"></i>
                <span>Online Storefront Catalog</span>
                <span className="badge badge-xs bg-emerald-500 text-white ml-auto font-bold px-1.5 py-0.5 rounded text-[10px]">
                  Shop
                </span>
              </Link>
            </li>

            {/* ===================== PURCHASES & PROCUREMENT ===================== */}
            <li className="menu-title">
              <span>PURCHASES & PROCUREMENT</span>
            </li>
            <li>
              <Link
                to="/purchases"
                onClick={onCloseMobile}
                className={cn(currentPath === "/purchases" && "active")}
              >
                <i className="ph-duotone ph-truck"></i>
                <span>Purchase Orders & Inward</span>
                <span className="badge badge-xs bg-indigo-500 text-white ml-auto font-bold px-1.5 py-0.5 rounded text-[10px]">
                  PO
                </span>
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
                to={"/portal/invoices/INV-2026-001" as any}
                onClick={onCloseMobile}
                className={cn(currentPath.startsWith("/portal/invoices") && "active")}
              >
                <i className="ph-duotone ph-arrow-square-out"></i>
                <span>Client Invoice Portal (B2B)</span>
                <span className="badge badge-xs bg-indigo-500 text-white ml-auto font-bold px-1.5 py-0.5 rounded text-[10px]">
                  Portal
                </span>
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
                to="/expenses"
                onClick={onCloseMobile}
                className={cn(currentPath === "/expenses" && "active")}
              >
                <i className="ph-duotone ph-wallet"></i>
                <span>Expense Claims</span>
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
                    Live Device Agent
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
                  ["/recruitment", "/training"].includes(currentPath) && "active"
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
                    to="/training"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/training" && "active")}
                  >
                    Training & LMS
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
                    "/offboarding",
                    "/forms",
                    "/workflows",
                    "/okr",
                    "/assets",
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
                    <span>WooCommerce Sync</span>
                    <span className="badge badge-xs bg-[#7f54b3] text-white font-semibold ml-1.5 px-1.5 py-0.5 rounded text-[9px]">
                      WooCommerce
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shopify"
                    onClick={onCloseMobile}
                    className={cn(currentPath === "/shopify" && "active")}
                  >
                    <span>Shopify Sync</span>
                    <span className="badge badge-xs bg-[#008060] text-white font-semibold ml-1.5 px-1.5 py-0.5 rounded text-[9px]">
                      Shopify
                    </span>
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

            {/* ===================== UI INTERFACE ===================== */}
            <li className="menu-title">
              <span>UI INTERFACE</span>
            </li>
            <li className="submenu">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toggleSubmenu("forms");
                }}
                className={cn(
                  "cursor-pointer",
                  openMenus.forms && "subdrop",
                  currentPath === "/forms" && "active"
                )}
              >
                <i className="ph-duotone ph-note-pencil"></i>
                <span>Forms</span>
                <span className="menu-arrow"></span>
              </a>
              <ul style={{ display: !isMini && openMenus.forms ? "block" : "none" }}>
                <li>
                  <Link to="/forms" onClick={onCloseMobile} className={cn(currentPath === "/forms" && "active")}>
                    Form Elements & Builder
                  </Link>
                </li>
              </ul>
            </li>

            <li className="submenu">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toggleSubmenu("tables");
                }}
                className={cn(
                  "cursor-pointer",
                  openMenus.tables && "subdrop",
                  ["/employees", "/attendance"].includes(currentPath) && "active"
                )}
              >
                <i className="ph-duotone ph-table"></i>
                <span>Tables</span>
                <span className="menu-arrow"></span>
              </a>
              <ul style={{ display: !isMini && openMenus.tables ? "block" : "none" }}>
                <li>
                  <Link to="/employees" onClick={onCloseMobile} className={cn(currentPath === "/employees" && "active")}>
                    Data Tables (Employees)
                  </Link>
                </li>
                <li>
                  <Link to="/attendance" onClick={onCloseMobile} className={cn(currentPath === "/attendance" && "active")}>
                    Attendance Roster Table
                  </Link>
                </li>
              </ul>
            </li>

            <li className="submenu">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toggleSubmenu("charts");
                }}
                className={cn(
                  "cursor-pointer",
                  openMenus.charts && "subdrop",
                  currentPath === "/analytics" && "active"
                )}
              >
                <i className="ph-duotone ph-chart-pie-slice"></i>
                <span>Charts</span>
                <span className="menu-arrow"></span>
              </a>
              <ul style={{ display: !isMini && openMenus.charts ? "block" : "none" }}>
                <li>
                  <Link to="/analytics" onClick={onCloseMobile} className={cn(currentPath === "/analytics" && "active")}>
                    Apex & Chart.js Analytics
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
                to="/settings"
                search={{ tab: "workspace" } as any}
                onClick={onCloseMobile}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <i className="ph-duotone ph-shield-check text-orange-500"></i>
                  <span>Workspace Roles & Modules</span>
                </div>
                <span className="badge badge-xs bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold px-1.5 py-0.5 rounded text-[9px]">
                  RBAC
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/integrations"
                onClick={onCloseMobile}
                className={cn(currentPath === "/integrations" && "active")}
              >
                <i className="ph-duotone ph-globe"></i>
                <span>WooCommerce Settings</span>
                <span className="badge badge-xs bg-purple-600 text-white font-bold ml-1.5 px-1 py-0.2 rounded text-[9px]">
                  REST API
                </span>
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

            {/* Super Admin Console (Conditional) */}
            {isSuperAdmin && (
              <li>
                <Link
                  to="/super"
                  onClick={onCloseMobile}
                  className={cn(
                    "text-purple-600 dark:text-purple-400 font-semibold",
                    currentPath.startsWith("/super") && "active"
                  )}
                >
                  <i className="ph-duotone ph-shield-check"></i>
                  <span>Super Admin Console</span>
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </aside>
  );
}

