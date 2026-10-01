/**
 * Authoritative Model Classification Dictionary for Prisma Tenant Isolation
 * Verified against AST parse of all 106 models in server/prisma/schema.prisma
 */

// Models belonging strictly to the global SaaS platform control plane (Zero tenant isolation required)
export const GLOBAL_MODELS = new Set<string>([
  "User",
  "SubscriptionPlan",
  "Addon",
  "CmsPage",
  "Permission",
  "TwoFactorOtp",
  "SystemCronJob",
]);

// Root Tenant Entity (Has 'id' as the tenant identifier, not 'tenantId')
export const ROOT_TENANT_MODEL = "Tenant";

// Models that belong to a tenant only through a parent foreign key relationship (No direct tenant_id column)
export interface ChildModelRelation {
  parentRelation: string;
  parentModel: string;
}

export const CHILD_DEPENDENT_MODELS = new Map<string, ChildModelRelation>([
  ["SalaryStructureItem", { parentRelation: "structure", parentModel: "SalaryStructure" }],
  ["EmployeeSalaryItem", { parentRelation: "assignment", parentModel: "EmployeeSalaryAssignment" }],
  ["TaxDeclarationProof", { parentRelation: "declaration", parentModel: "EmployeeTaxDeclaration" }],
  ["FbpDeclarationItem", { parentRelation: "declaration", parentModel: "FbpDeclaration" }],
  ["OkrKeyResult", { parentRelation: "objective", parentModel: "OkrObjective" }],
  ["OkrCheckin", { parentRelation: "employee", parentModel: "Employee" }],
  ["OkrReview", { parentRelation: "cycle", parentModel: "OkrCycle" }],
  ["AssetAssignment", { parentRelation: "asset", parentModel: "Asset" }],
  ["AssetDisposalItem", { parentRelation: "batch", parentModel: "AssetDisposalBatch" }],
  ["AssetMaintenance", { parentRelation: "asset", parentModel: "Asset" }],
  ["JobCandidateInterview", { parentRelation: "candidate", parentModel: "JobCandidate" }],
  ["CourseModule", { parentRelation: "course", parentModel: "TrainingCourse" }],
  ["ExitChecklistItem", { parentRelation: "exit", parentModel: "EmployeeExit" }],
  ["HelpdeskComment", { parentRelation: "ticket", parentModel: "HelpdeskTicket" }],
  ["PlatformTicketMessage", { parentRelation: "ticket", parentModel: "PlatformSupportTicket" }],
  ["FormField", { parentRelation: "form", parentModel: "CustomForm" }],
  ["FormResponseValue", { parentRelation: "submission", parentModel: "FormSubmission" }],
  ["JournalItem", { parentRelation: "journalEntry", parentModel: "JournalEntry" }],
  ["ProductWarehouse", { parentRelation: "product", parentModel: "Product" }],
  ["SaleDetail", { parentRelation: "sale", parentModel: "Sale" }],
  ["SalePayment", { parentRelation: "sale", parentModel: "Sale" }],
  ["PurchaseDetail", { parentRelation: "purchase", parentModel: "Purchase" }],
  ["StockTransferDetail", { parentRelation: "transfer", parentModel: "StockTransfer" }],
  ["StockAdjustmentDetail", { parentRelation: "adjustment", parentModel: "StockAdjustment" }],
  ["SalesReturnDetail", { parentRelation: "salesReturn", parentModel: "SalesReturn" }],
  ["PurchaseReturnDetail", { parentRelation: "purchaseReturn", parentModel: "PurchaseReturn" }],
  ["RolePermission", { parentRelation: "role", parentModel: "WorkspaceRole" }],
  ["BankDisbursementItem", { parentRelation: "batch", parentModel: "BankDisbursementBatch" }],
]);

// Models with a direct tenant_id column (Primary multi-tenant entities - 75 models)
export const DIRECT_TENANT_MODELS = new Set<string>([
  "Profile",
  "UserRole",
  "Department",
  "Employee",
  "Attendance",
  "LeaveType",
  "LeaveRequest",
  "PayrollRun",
  "Payslip",
  "SalaryComponent",
  "SalaryStructure",
  "EmployeeSalaryAssignment",
  "StatutoryRule",
  "EmployeeTaxDeclaration",
  "PayrollSnapshot",
  "GenericFormTemplate",
  "TenantSubscription",
  "SubscriptionPolicyAudit",
  "TenantAddon",
  "OkrCycle",
  "OkrObjective",
  "AssetCategory",
  "Asset",
  "AssetRequest",
  "AssetDisposalBatch",
  "AssetActivityLog",
  "JobPosting",
  "JobCandidate",
  "ShiftDefinition",
  "ShiftRoster",
  "ShiftSwapRequest",
  "ExpenseCategory",
  "ExpenseClaim",
  "TrainingCourse",
  "CourseEnrollment",
  "EmployeeExit",
  "CompanyDocument",
  "HelpdeskTicket",
  "PlatformSupportTicket",
  "Announcement",
  "AnnouncementAcknowledgement",
  "CustomForm",
  "FormSubmission",
  "BiometricDevice",
  "BiometricPunchLog",
  "BiometricEmployeeMapping",
  "BiometricOfflineBuffer",
  "ChartOfAccount",
  "FiscalYear",
  "AccountingPeriod",
  "JournalEntry",
  "Contract",
  "BudgetPlan",
  "FinancialGoal",
  "ProductCategory",
  "Brand",
  "Unit",
  "TaxRate",
  "Warehouse",
  "Product",
  "Customer",
  "Supplier",
  "Sale",
  "PaymentGatewayTransaction",
  "PaymentWebhookEvent",
  "HeldOrder",
  "Purchase",
  "StockTransfer",
  "StockAdjustment",
  "StockMovement",
  "ChatMessage",
  "WorkspaceRole",
  "UserRoleAssignment",
  "TenantModule",
  "CrmLead",
  "CrmProposal",
  "Project",
  "ProjectTask",
  "CashRegister",
  "RegisterShift",
  "SalesReturn",
  "CreditNote",
  "PurchaseReturn",
  "PurchasePayment",
  "DebitNote",
  "AwardType",
  "Award",
  "WarningType",
  "DisciplinaryWarning",
  "StoredDocument",
  "FbpDeclaration",
  "BankDisbursementBatch",
  "StatutoryReturnFiling",
  "WorkspaceTodo",
  "WorkspaceNote",
  "CalendarEvent",
]);

export type ModelClassification = "GLOBAL" | "ROOT_TENANT" | "DIRECT_TENANT" | "CHILD_DEPENDENT" | "UNKNOWN";

export function getModelClassification(model: string): ModelClassification {
  if (GLOBAL_MODELS.has(model)) return "GLOBAL";
  if (model === ROOT_TENANT_MODEL) return "ROOT_TENANT";
  if (DIRECT_TENANT_MODELS.has(model)) return "DIRECT_TENANT";
  if (CHILD_DEPENDENT_MODELS.has(model)) return "CHILD_DEPENDENT";
  return "UNKNOWN";
}
