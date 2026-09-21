export interface ErpModuleDef {
  key: string;
  name: string;
  route: string;
  permission: string;
  description: string;
  iconName: string;
  resources: {
    resource: string;
    label: string;
    actions: string[];
  }[];
}

export const ERP_MODULES: ErpModuleDef[] = [
  {
    key: "hrm",
    name: "HRM",
    route: "/dashboard",
    permission: "hrm.dashboard.view",
    description: "Human Resource Management, Employees, Attendance, Leaves & Payroll",
    iconName: "Users",
    resources: [
      { resource: "employees", label: "Employees", actions: ["view", "create", "edit", "delete", "export"] },
      { resource: "attendance", label: "Attendance", actions: ["view", "create", "edit", "delete", "export", "approve"] },
      { resource: "leave", label: "Leave Requests", actions: ["view", "create", "edit", "delete", "export", "approve"] },
      { resource: "payroll", label: "Payroll", actions: ["view", "create", "edit", "delete", "export", "approve"] },
    ],
  },
  {
    key: "pos",
    name: "POS",
    route: "/pos-dashboard",
    permission: "pos.dashboard.view",
    description: "Point of Sale terminal, checkout sessions and daily register sales",
    iconName: "ShoppingCart",
    resources: [
      { resource: "terminal", label: "POS Terminal", actions: ["view", "create", "manage"] },
      { resource: "sales", label: "POS Sales", actions: ["view", "create", "edit", "delete", "export"] },
      { resource: "receipts", label: "Receipts & Invoices", actions: ["view", "create", "export"] },
    ],
  },
  {
    key: "inventory",
    name: "Inventory",
    route: "/inventory-dashboard",
    permission: "inventory.dashboard.view",
    description: "Product catalog, stock adjustments, warehouses & barcode tracking",
    iconName: "Package",
    resources: [
      { resource: "products", label: "Products Catalog", actions: ["view", "create", "edit", "delete", "export"] },
      { resource: "stock", label: "Stock Levels & Transfer", actions: ["view", "edit", "export", "approve"] },
      { resource: "categories", label: "Categories & Brands", actions: ["view", "create", "edit", "delete"] },
      { resource: "warehouses", label: "Warehouses & Locations", actions: ["view", "create", "edit", "delete"] },
    ],
  },
  {
    key: "crm",
    name: "Sales CRM",
    route: "/crm-dashboard",
    permission: "crm.dashboard.view",
    description: "Lead pipelines, customer accounts, deals & quotation approvals",
    iconName: "Compass",
    resources: [
      { resource: "leads", label: "Leads", actions: ["view", "create", "edit", "delete", "export"] },
      { resource: "customers", label: "Customers", actions: ["view", "create", "edit", "delete", "export"] },
      { resource: "quotations", label: "Quotations & Proposals", actions: ["view", "create", "edit", "delete", "export", "approve"] },
      { resource: "deals", label: "Deals Pipeline", actions: ["view", "create", "edit", "delete"] },
    ],
  },
  {
    key: "finance",
    name: "Finance",
    route: "/finance-dashboard",
    permission: "finance.dashboard.view",
    description: "Invoicing, accounts receivable/payable, expense claims & bank ledgers",
    iconName: "Landmark",
    resources: [
      { resource: "invoices", label: "Invoices & Billing", actions: ["view", "create", "edit", "delete", "export", "approve"] },
      { resource: "expenses", label: "Expense Claims", actions: ["view", "create", "edit", "delete", "export", "approve"] },
      { resource: "accounts", label: "General Ledger & Accounts", actions: ["view", "create", "edit", "delete", "manage"] },
    ],
  },
  {
    key: "project",
    name: "Projects",
    route: "/project-dashboard",
    permission: "project.dashboard.view",
    description: "Kanban boards, sprint tasks, milestones & team project tracking",
    iconName: "Kanban",
    resources: [
      { resource: "projects", label: "Project Registry", actions: ["view", "create", "edit", "delete", "export"] },
      { resource: "tasks", label: "Project Tasks & Kanban", actions: ["view", "create", "edit", "delete", "manage"] },
      { resource: "milestones", label: "Milestones", actions: ["view", "create", "edit", "delete"] },
    ],
  },
  {
    key: "support",
    name: "Support",
    route: "/support-dashboard",
    permission: "support.dashboard.view",
    description: "Customer service ticketing, SLA resolution & knowledge base",
    iconName: "HelpCircle",
    resources: [
      { resource: "tickets", label: "Support Tickets", actions: ["view", "create", "edit", "delete", "export"] },
      { resource: "faq", label: "Knowledge Base", actions: ["view", "create", "edit", "delete"] },
    ],
  },
  {
    key: "procurement",
    name: "Procurement",
    route: "/procurement-dashboard",
    permission: "procurement.dashboard.view",
    description: "Supplier purchase orders, vendor evaluation & material requests",
    iconName: "FileSpreadsheet",
    resources: [
      { resource: "purchase_orders", label: "Purchase Orders", actions: ["view", "create", "edit", "delete", "export", "approve"] },
      { resource: "vendors", label: "Vendors & Suppliers", actions: ["view", "create", "edit", "delete", "export"] },
      { resource: "requests", label: "Purchase Requisitions", actions: ["view", "create", "edit", "delete", "approve"] },
    ],
  },
  {
    key: "analytics",
    name: "Analytics",
    route: "/analytics",
    permission: "analytics.dashboard.view",
    description: "Cross-module BI reporting, executive KPIs & business intelligence",
    iconName: "BarChart3",
    resources: [
      { resource: "reports", label: "Executive Reports", actions: ["view", "export"] },
      { resource: "metrics", label: "Business Metrics", actions: ["view", "manage"] },
    ],
  },
];

export interface PermissionDefinition {
  code: string;
  module: string;
  resource: string;
  action: string;
  name: string;
  description: string;
}

export function getAllPermissionDefinitions(): PermissionDefinition[] {
  const permissions: PermissionDefinition[] = [];

  for (const mod of ERP_MODULES) {
    // 1. Dashboard level permission
    permissions.push({
      code: mod.permission,
      module: mod.key,
      resource: "dashboard",
      action: "view",
      name: mod.name + " Dashboard View",
      description: "Allows user to access and view the " + mod.name + " dashboard in ERP Workspace",
    });

    // 2. Resource actions
    for (const res of mod.resources) {
      for (const act of res.actions) {
        const code = mod.key + "." + res.resource + "." + act;
        const actCapitalized = act.charAt(0).toUpperCase() + act.slice(1);
        permissions.push({
          code,
          module: mod.key,
          resource: res.resource,
          action: act,
          name: actCapitalized + " " + res.label,
          description: "Permission to " + act + " " + res.label.toLowerCase() + " in " + mod.name,
        });
      }
    }
  }

  return permissions;
}
