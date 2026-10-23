/**
 * MASTERHRMS — Authoritative Breadcrumb Registry & Route Hierarchy Engine
 * 
 * Provides consistent, accessible breadcrumb paths across all application portals:
 * - Flat ERP/HRM Workspace routes (_app)
 * - HR Operations Portal (/hr/*)
 * - Employee Self-Service Portal (/me/*)
 * - Super Admin Portal (/super/*)
 * - Tenant Administration Portal (/tenant/*)
 */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Human-readable title formatter for path segments (e.g., "candidate-onboarding" -> "Candidate Onboarding")
 */
export function formatSegmentLabel(segment: string): string {
  if (!segment) return "";
  const specialCases: Record<string, string> = {
    hr: "HRM",
    me: "Employee Portal",
    sa: "Super Admin",
    super: "Super Admin",
    crm: "CRM",
    pos: "POS",
    ats: "ATS",
    lms: "LMS",
    kpi: "KPI",
    okr: "OKR",
    api: "API",
    sms: "SMS",
    dlt: "DLT",
    ocr: "AI OCR",
    wac: "WAC",
    sso: "SSO",
    "2fa": "Two-Factor Auth",
    gst: "GST",
    einvoice: "E-Invoice",
    zatca: "ZATCA",
    peppol: "PEPPOL",
    po: "Purchase Orders",
    rfq: "Request for Quotes",
  };

  const lower = segment.toLowerCase();
  if (specialCases[lower]) return specialCases[lower];

  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Authoritative static breadcrumbs for top-level and flat _app routes
 */
export const ROUTE_BREADCRUMBS: Record<string, BreadcrumbItem[]> = {
  // Dashboards & Overviews
  "/": [{ label: "Dashboard" }],
  "/dashboard": [{ label: "Dashboard" }],
  "/hrm-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Admin Dashboard" }],
  "/crm-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "CRM", href: "/crm-dashboard" }, { label: "CRM Dashboard" }],
  "/deals-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "CRM", href: "/crm-dashboard" }, { label: "Deals Dashboard" }],
  "/leads-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "CRM", href: "/crm-dashboard" }, { label: "Leads Dashboard" }],
  "/sales-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Sales & CRM", href: "/crm-dashboard" }, { label: "Sales Analytics" }],
  "/finance-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Finance", href: "/finance-dashboard" }, { label: "Finance Dashboard" }],
  "/pos-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "POS & Retail", href: "/pos-dashboard" }, { label: "POS Dashboard" }],
  "/inventory-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Inventory", href: "/inventory-dashboard" }, { label: "Inventory Dashboard" }],
  "/procurement-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Inventory", href: "/inventory-dashboard" }, { label: "Procurement Dashboard" }],
  "/payroll-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Payroll", href: "/payroll-dashboard" }, { label: "Payroll Dashboard" }],
  "/project-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Projects", href: "/projects" }, { label: "Project Dashboard" }],
  "/asset-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "IT & Assets", href: "/assets" }, { label: "Asset Dashboard" }],
  "/it-admin-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "IT & Assets", href: "/assets" }, { label: "IT Admin Dashboard" }],
  "/learning-analytics": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Training", href: "/training" }, { label: "Learning Analytics" }],
  "/support-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Support", href: "/support" }, { label: "Support Dashboard" }],
  "/help-desk-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Help Desk", href: "/helpdesk" }, { label: "Help Desk Dashboard" }],
  "/client-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Client Portal" }],
  "/analytics": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Analytics Overview" }],

  // Finance & Accounting
  "/accounting": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Finance", href: "/finance-dashboard" }, { label: "Advanced Accounting & Ledger" }],
  "/invoices": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Finance", href: "/finance-dashboard" }, { label: "Sales Invoices & Billing" }],
  "/invoice/create": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Finance", href: "/finance-dashboard" }, { label: "Invoices", href: "/invoices" }, { label: "Create Invoice" }],
  "/recurring-invoices": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Finance", href: "/finance-dashboard" }, { label: "Recurring Invoices" }],
  "/budgets": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Finance", href: "/finance-dashboard" }, { label: "Budgets & Expenses" }],
  "/taxes": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Finance", href: "/finance-dashboard" }, { label: "Tax Rates & Rules" }],
  "/currencies": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Finance", href: "/finance-dashboard" }, { label: "Multi-Currency Rates" }],
  "/expenses": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Finance", href: "/finance-dashboard" }, { label: "Expense Claims" }],
  "/expenses-report": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Finance", href: "/finance-dashboard" }, { label: "Expense Reports" }],
  "/payment-report": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Finance", href: "/finance-dashboard" }, { label: "Payment Reports" }],
  "/invoice-report": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Finance", href: "/finance-dashboard" }, { label: "Invoice Reports" }],

  // Point of Sale & Inventory
  "/pos": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "POS & Retail", href: "/pos-dashboard" }, { label: "Point of Sale Register" }],
  "/products": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Inventory", href: "/inventory-dashboard" }, { label: "Products & Services" }],
  "/purchases": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Inventory", href: "/inventory-dashboard" }, { label: "Purchases & Orders" }],
  "/transfers": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Inventory", href: "/inventory-dashboard" }, { label: "Stock Transfers" }],
  "/adjustments": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Inventory", href: "/inventory-dashboard" }, { label: "Stock Adjustments" }],
  "/suppliers": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Inventory", href: "/inventory-dashboard" }, { label: "Suppliers & Vendors" }],
  "/returns": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Inventory", href: "/inventory-dashboard" }, { label: "Sales & Purchase Returns" }],

  // CRM & Sales
  "/crm": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "CRM & Sales", href: "/crm-dashboard" }, { label: "Sales Hub" }],
  "/contacts": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "CRM & Sales", href: "/crm-dashboard" }, { label: "Contacts Directory" }],
  "/companies": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "CRM & Sales", href: "/crm-dashboard" }, { label: "Corporate Accounts" }],
  "/clients": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "CRM & Sales", href: "/crm-dashboard" }, { label: "Clients Directory" }],
  "/pipeline": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "CRM & Sales", href: "/crm-dashboard" }, { label: "Sales Pipeline" }],
  "/proposals": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "CRM & Sales", href: "/crm-dashboard" }, { label: "Proposals & Quotes" }],
  "/campaigns": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "CRM & Sales", href: "/crm-dashboard" }, { label: "Marketing Campaigns" }],

  // Projects & Tasks
  "/projects": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Projects", href: "/project-dashboard" }, { label: "Projects Directory" }],
  "/tasks": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Projects", href: "/projects" }, { label: "Tasks List" }],
  "/task-board": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Projects", href: "/projects" }, { label: "Task Board" }],
  "/project-report": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Projects", href: "/projects" }, { label: "Project Reports" }],

  // HRM & Workforce
  "/hrm": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite" }],
  "/employees": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Employee Directory" }],
  "/employee-details": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Employees", href: "/employees" }, { label: "Employee Profile" }],
  "/manager-hub": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Manager Hub & Approvals" }],
  "/attendance": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Attendance & Timesheets" }],
  "/attendance-employee": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Employee Attendance" }],
  "/shifts": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Shifts & Scheduling" }],
  "/shift-swap-requests": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Shift Swap Requests" }],
  "/overtime": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Overtime Requests" }],
  "/holidays": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Holiday Calendar" }],
  "/timesheets": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Timesheets" }],
  "/payroll": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Payroll Processing" }],
  "/hr/payroll/settings": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Payroll", href: "/hr/payroll" }, { label: "Statutory & Payroll Settings" }],
  "/payslip-report": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Payroll", href: "/payroll" }, { label: "Payslip Reports" }],
  "/employee-payslips": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Employee Payslips" }],
  "/provident-fund": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Provident Fund" }],
  "/recruitment": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Recruitment & ATS" }],
  "/campus-hiring": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Campus Hiring" }],
  "/referrals": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Employee Referrals" }],
  "/leave": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Leave Management" }],
  "/leave-report": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Leave Reports" }],
  "/work-from-home": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Work From Home" }],
  "/departments": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Departments" }],
  "/designations": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Designations" }],
  "/promotions": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Promotions" }],
  "/resignation": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Resignations" }],
  "/termination": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Terminations" }],
  "/employee-transfers": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Employee Transfers" }],
  "/warnings": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Disciplinary Warnings" }],
  "/awards": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Awards & Recognitions" }],
  "/probation": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Probation Tracking" }],
  "/notice-period-tracker": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Notice Period Tracker" }],
  "/offboarding": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Offboarding Workflow" }],
  "/training": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Training Academy & LMS" }],
  "/performance-indicator": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Performance Indicators" }],
  "/performance-appraisal": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Appraisals" }],
  "/performance-review": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Performance Reviews" }],
  "/okr": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Objectives & Key Results" }],

  // Extensions & Add-ons
  "/marketplace": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Extensions", href: "/marketplace" }, { label: "Add-ons Marketplace" }],

  // E-Commerce Standalone Module
  "/integrations": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "E-Commerce", href: "/integrations" }, { label: "WooCommerce Sync" }],
  "/shopify": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "E-Commerce", href: "/shopify" }, { label: "Shopify Sync" }],
  "/google-workspace": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Extensions", href: "/marketplace" }, { label: "Google Workspace" }],
  "/tally-importer": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Finance", href: "/accounting" }, { label: "TallyPrime XML Bridge" }],
  "/whatsapp-alerts": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Extensions", href: "/marketplace" }, { label: "WhatsApp Business Alerts" }],
  "/razorpay-gateway": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Extensions", href: "/marketplace" }, { label: "Razorpay Gateway" }],
  "/biometric": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Time & Attendance", href: "/attendance" }, { label: "Biometric Hardware Sync" }],
  "/biometric-sync": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Time & Attendance", href: "/attendance" }, { label: "Biometric Hardware Sync" }],
  "/strategy-studio": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Strategy", href: "/strategy-studio" }, { label: "Strategy Studio" }],
  "/sms-gateway": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Extensions", href: "/marketplace" }, { label: "SMS Gateway" }],

  // AI Center
  "/ai": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "AI Center", href: "/ai" }, { label: "AI Hub & Copilot" }],
  "/ai-attendance-insights": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "AI Center", href: "/ai" }, { label: "Attendance Insights" }],
  "/ai-payroll-forecast": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "AI Center", href: "/ai" }, { label: "Payroll Forecast" }],
  "/ai-hiring-forecast": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "AI Center", href: "/ai" }, { label: "Hiring Forecast" }],
  "/ai-team-performance-insights": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "AI Center", href: "/ai" }, { label: "Team Performance" }],
  "/ai-configuration": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "AI Center", href: "/ai" }, { label: "AI Configuration" }],
  // Smart Dashboard Analytics Pages
  "/smart-dashboard": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Smart Dashboard Analytics" }],
  "/smart-dashboard/financial": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Smart Dashboard", href: "/smart-dashboard" }, { label: "Financial Analytics" }],
  "/smart-dashboard/sales": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Smart Dashboard", href: "/smart-dashboard" }, { label: "Sales & Customer Analytics" }],
  "/smart-dashboard/operational": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Smart Dashboard", href: "/smart-dashboard" }, { label: "Operational Analytics" }],

  // Smart Reports Catalogue & Independent Pages
  "/smart-reports": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Smart Reports" }],
  "/smart-reports/attendance-summary": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Smart Reports", href: "/smart-reports" }, { label: "Attendance Summary Report" }],
  "/smart-reports/payroll-sheet": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Smart Reports", href: "/smart-reports" }, { label: "Payroll Sheet Report" }],
  "/smart-reports/leave-report": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Smart Reports", href: "/smart-reports" }, { label: "Leave Utilization Report" }],
  "/smart-reports/sales-invoice": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Smart Reports", href: "/smart-reports" }, { label: "Sales Invoice Summary Report" }],
  "/smart-reports/purchase-invoice": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Smart Reports", href: "/smart-reports" }, { label: "Purchase Invoice Summary Report" }],
  "/smart-reports/deal-pipeline": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Smart Reports", href: "/smart-reports" }, { label: "Deal Pipeline Report" }],
  "/smart-reports/product-stock": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Smart Reports", href: "/smart-reports" }, { label: "Product Stock Inventory Report" }],
  "/smart-reports/project-progress": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Smart Reports", href: "/smart-reports" }, { label: "Project Progress Report" }],

  // AI Business Advisor
  "/ai-business-advisor": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "AI Center", href: "/ai" }, { label: "AI Business Advisor" }],
  "/ai-settings": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "AI Center", href: "/ai" }, { label: "AI Settings" }],
  "/ai-writer": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "AI Center", href: "/ai" }, { label: "AI Content Generation Studio" }],
  "/ai-ocr": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "AI Center", href: "/ai" }, { label: "AI Invoice OCR Reader" }],

  // Settings & System
  "/settings": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Workspace Settings" }],
  "/settings/custom-domain": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Custom Domain" }],
  "/custom-fields": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Custom Fields" }],
  "/users": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Users & Roles" }],
  "/subscription": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Plan & Subscription" }],
  "/two-factor-auth": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Two-Factor Auth" }],
  "/backup-restore": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Backup & Restore" }],
  "/activity-logs": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Activity Logs" }],
  "/internal-reminders": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Internal Reminders" }],
  "/public-api": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Developer Public API" }],
  "/notice-board": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Workforce", href: "/hrm-dashboard" }, { label: "Notice Board" }],
  "/outbound-webhooks": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Outbound Webhooks" }],
  "/ban-ip-address": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Ban IP Address" }],
  "/clear-cache": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "System Cache & Maintenance" }],
  "/cronjob": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Cronjob Management" }],
  "/docs": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Documentation Portal" }],
  "/developer": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Developer API Console" }],
  "/setup-notes": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Settings", href: "/settings" }, { label: "Setup Notes" }],
  "/assets": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "IT & Hardware", href: "/asset-dashboard" }, { label: "Asset Management" }],
  "/forms": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Compliance", href: "/hrm-dashboard" }, { label: "Statutory Forms" }],
  "/workflows": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Automation", href: "/workflows" }, { label: "Workflows Engine" }],
  "/workspace": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Workspace Overview" }],
  "/profile": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "User Profile" }],
  "/documents": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Document Vault" }],
  "/chat": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Collaboration", href: "/chat" }, { label: "Chat" }],
  "/calendar": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Collaboration", href: "/calendar" }, { label: "Company Calendar" }],
  "/hr/calendar": [{ label: "Home", href: "/hr/dashboard" }, { label: "HRM Suite", href: "/hr/dashboard" }, { label: "Calendar" }],
  "/apps/calendar": [{ label: "Home", href: "/hr/dashboard" }, { label: "Applications", href: "/apps/calendar" }, { label: "Calendar" }],
  "/notes": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Collaboration", href: "/notes" }, { label: "Personal Notes" }],
  "/todo": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Collaboration", href: "/todo" }, { label: "To-Do List" }],
  "/media": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Collaboration", href: "/media" }, { label: "Media Library" }],
  "/helpdesk": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Support", href: "/helpdesk" }, { label: "Help Desk" }],
  "/support": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Support", href: "/support" }, { label: "Platform Support" }],
  "/system-states": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "System States" }],
  "/call-history": [{ label: "Dashboard", href: "/hrm-dashboard" }, { label: "Call History" }],

  // Super Admin Console Direct Routes
  "/super": [{ label: "Super Admin", href: "/super" }, { label: "Console Overview" }],
  "/super/analytics": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Platform Analytics & Telemetry" }],
  "/super/tenants": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Tenant Workspaces" }],
  "/super/plans": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Subscription Plans" }],
  "/super/coupons": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Discount Coupons" }],
  "/super/roles": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Roles & RBAC Matrix" }],
  "/super/compliance": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Statutory Compliance & Rules" }],
  "/super/users": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Super Users & Admins" }],
  "/super/transactions": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Transactions Ledger" }],
  "/super/backup": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Database Backup & Disaster Recovery" }],
  "/super/email-templates": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "System Email Templates" }],
  "/super/languages": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Localization & Languages" }],
  "/super/marketplace": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Platform Add-ons Directory" }],
  "/super/api-docs": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "API Reference Documentation" }],
  "/super/developer": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Developer Sandbox" }],
  "/super/cms": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Landing CMS & Pages" }],
  "/super/blogs": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Blog & Editorial Posts" }],
  "/super/case-studies": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Customer Case Studies" }],
  "/super/support": [{ label: "Home", href: "/super" }, { label: "Super Admin", href: "/super" }, { label: "Support Ticket Desk" }],

  // Tenant Portal Direct Routes
  "/tenant": [{ label: "Home", href: "/tenant/dashboard" }, { label: "Tenant Administration" }],
  "/tenant/dashboard": [{ label: "Home", href: "/tenant/dashboard" }, { label: "Tenant Management", href: "/tenant/dashboard" }, { label: "Command Center" }],
  "/tenant/billing": [{ label: "Home", href: "/tenant/dashboard" }, { label: "Tenant Management", href: "/tenant/dashboard" }, { label: "Billing & Invoices" }],
  "/tenant/branding": [{ label: "Home", href: "/tenant/dashboard" }, { label: "Tenant Management", href: "/tenant/dashboard" }, { label: "Brand Styling & Identity" }],
  "/tenant/company-profile": [{ label: "Home", href: "/tenant/dashboard" }, { label: "Tenant Management", href: "/tenant/dashboard" }, { label: "Company Profile" }],
  "/tenant/data": [{ label: "Home", href: "/tenant/dashboard" }, { label: "Tenant Management", href: "/tenant/dashboard" }, { label: "Data Management & Export" }],
  "/tenant/domain": [{ label: "Home", href: "/tenant/dashboard" }, { label: "Tenant Management", href: "/tenant/dashboard" }, { label: "Custom Domain & DNS" }],
  "/tenant/integrations": [{ label: "Home", href: "/tenant/dashboard" }, { label: "Tenant Management", href: "/tenant/dashboard" }, { label: "Connected Integrations" }],
  "/tenant/modules": [{ label: "Home", href: "/tenant/dashboard" }, { label: "Tenant Management", href: "/tenant/dashboard" }, { label: "Feature Modules & Subscriptions" }],
  "/tenant/roles": [{ label: "Home", href: "/tenant/dashboard" }, { label: "Tenant Management", href: "/tenant/dashboard" }, { label: "Roles & Permissions" }],
  "/tenant/settings": [{ label: "Home", href: "/tenant/dashboard" }, { label: "Tenant Management", href: "/tenant/dashboard" }, { label: "General Workspace Settings" }],
  "/tenant/subscription": [{ label: "Home", href: "/tenant/dashboard" }, { label: "Tenant Management", href: "/tenant/dashboard" }, { label: "Active Subscription Plan" }],
  "/tenant/support": [{ label: "Home", href: "/tenant/dashboard" }, { label: "Tenant Management", href: "/tenant/dashboard" }, { label: "Support & Help Desk" }],
  "/tenant/users": [{ label: "Home", href: "/tenant/dashboard" }, { label: "Tenant Management", href: "/tenant/dashboard" }, { label: "Tenant Workspace Users" }],
  "/tenant/audit-logs": [{ label: "Home", href: "/tenant/dashboard" }, { label: "Tenant Management", href: "/tenant/dashboard" }, { label: "Audit Logs & Compliance Ledger" }],
};

/**
 * Intelligent breadcrumb generator that resolves exact matches, hierarchical prefixes,
 * and dynamic parameters for all portals and routes.
 */
export function getBreadcrumbsForRoute(pathname: string): BreadcrumbItem[] {
  if (!pathname || pathname === "/") {
    return [{ label: "Dashboard" }];
  }

  // Normalize path
  const cleanPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";

  // 1. Direct match in dictionary
  if (ROUTE_BREADCRUMBS[cleanPath]) {
    return ROUTE_BREADCRUMBS[cleanPath];
  }

  // 2. HR Management Portal (/hr/*)
  if (cleanPath.startsWith("/hr/")) {
    const subSegments = cleanPath.replace("/hr/", "").split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "Home", href: "/hr/dashboard" },
      { label: "HRM Suite", href: "/hr/dashboard" },
    ];

    let currentHref = "/hr";
    subSegments.forEach((seg, idx) => {
      currentHref += `/${seg}`;
      const isLast = idx === subSegments.length - 1;
      breadcrumbs.push({
        label: formatSegmentLabel(seg),
        href: isLast ? undefined : currentHref,
      });
    });
    return breadcrumbs;
  }

  // 3. Employee Self-Service Portal (/me/*)
  if (cleanPath.startsWith("/me/")) {
    const subSegments = cleanPath.replace("/me/", "").split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "Home", href: "/me/dashboard" },
      { label: "Employee Portal", href: "/me/dashboard" },
    ];

    let currentHref = "/me";
    subSegments.forEach((seg, idx) => {
      currentHref += `/${seg}`;
      const isLast = idx === subSegments.length - 1;
      breadcrumbs.push({
        label: formatSegmentLabel(seg),
        href: isLast ? undefined : currentHref,
      });
    });
    return breadcrumbs;
  }

  // 4. Super Admin Console (/super/*)
  if (cleanPath.startsWith("/super/")) {
    const subSegments = cleanPath.replace("/super/", "").split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "Home", href: "/super" },
      { label: "Super Admin", href: "/super" },
    ];

    let currentHref = "/super";
    subSegments.forEach((seg, idx) => {
      currentHref += `/${seg}`;
      const isLast = idx === subSegments.length - 1;
      breadcrumbs.push({
        label: formatSegmentLabel(seg),
        href: isLast ? undefined : currentHref,
      });
    });
    return breadcrumbs;
  }

  // 5. Tenant Administration (/tenant/*)
  if (cleanPath.startsWith("/tenant/")) {
    const subSegments = cleanPath.replace("/tenant/", "").split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "Home", href: "/tenant/dashboard" },
      { label: "Tenant Management", href: "/tenant/dashboard" },
    ];

    let currentHref = "/tenant";
    subSegments.forEach((seg, idx) => {
      currentHref += `/${seg}`;
      const isLast = idx === subSegments.length - 1;
      breadcrumbs.push({
        label: formatSegmentLabel(seg),
        href: isLast ? undefined : currentHref,
      });
    });
    return breadcrumbs;
  }

  // 6. Generic Fallback: Split root segments
  const segments = cleanPath.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [{ label: "Dashboard", href: "/hrm-dashboard" }];

  let currentHref = "";
  segments.forEach((seg, idx) => {
    currentHref += `/${seg}`;
    const isLast = idx === segments.length - 1;
    breadcrumbs.push({
      label: formatSegmentLabel(seg),
      href: isLast ? undefined : currentHref,
    });
  });

  return breadcrumbs;
}
