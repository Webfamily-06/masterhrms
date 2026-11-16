/**
 * Authoritative ERP Module Keys reconciled from server/src/lib/erp-modules.ts
 */
export type ErpModuleKey =
  | 'hrm'
  | 'pos'
  | 'inventory'
  | 'crm'
  | 'finance'
  | 'project'
  | 'support'
  | 'procurement'
  | 'analytics';

export interface ErpModuleMetadata {
  key: ErpModuleKey;
  name: string;
  description: string;
  isCore: boolean;
  permission: string;
}

export const ERP_MODULE_REGISTRY: Record<ErpModuleKey, ErpModuleMetadata> = {
  hrm: {
    key: 'hrm',
    name: 'Human Resources',
    description: 'Employees, Attendance, Leaves & Payroll Management',
    isCore: true,
    permission: 'hrm.dashboard.view',
  },
  pos: {
    key: 'pos',
    name: 'Point of Sale',
    description: 'Terminal checkout sessions and register sales',
    isCore: false,
    permission: 'pos.dashboard.view',
  },
  inventory: {
    key: 'inventory',
    name: 'Inventory',
    description: 'Product catalog, stock adjustments and warehouses',
    isCore: false,
    permission: 'inventory.dashboard.view',
  },
  crm: {
    key: 'crm',
    name: 'Sales CRM',
    description: 'Leads pipeline, customer accounts and quotations',
    isCore: false,
    permission: 'crm.dashboard.view',
  },
  finance: {
    key: 'finance',
    name: 'Finance & Invoicing',
    description: 'Billing, expenses, and ledger management',
    isCore: false,
    permission: 'finance.dashboard.view',
  },
  project: {
    key: 'project',
    name: 'Project Management',
    description: 'Kanban boards, sprint tasks and milestones',
    isCore: true,
    permission: 'project.dashboard.view',
  },
  support: {
    key: 'support',
    name: 'Support Desk',
    description: 'Ticketing system, SLAs and knowledge base',
    isCore: true,
    permission: 'support.dashboard.view',
  },
  procurement: {
    key: 'procurement',
    name: 'Procurement',
    description: 'Purchase orders, vendor evaluation and requests',
    isCore: false,
    permission: 'procurement.dashboard.view',
  },
  analytics: {
    key: 'analytics',
    name: 'Executive Analytics',
    description: 'Cross-module BI reporting and business metrics',
    isCore: true,
    permission: 'analytics.dashboard.view',
  },
};
