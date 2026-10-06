# DASHBOARD & PAGE INVENTORY
**MASTERHRMS Complete Route and UI Element Registry**
*Total Routes Cataloged: 212*

---

## 1. Master Route Directory

| # | Portal | Route | Page Name | Source File | Layout | Protected | Role/Permission | Navigation Visible |
|---|---|---|---|---|---|---|---|---|
| 1 | Public Website & Marketing | `/403` | 403 | `src/routes/403.tsx` | MarketingLayout | NO | Public | NO |
| 2 | Public Website & Marketing | `/404` | 404 | `src/routes/404.tsx` | MarketingLayout | NO | Public | NO |
| 3 | Public Website & Marketing | `/500` | 500 | `src/routes/500.tsx` | MarketingLayout | NO | Public | NO |
| 4 | Public Website & Marketing | `/a/:tag` | A $tag | `src/routes/a.$tag.tsx` | MarketingLayout | NO | Public | NO |
| 5 | Public Website & Marketing | `/about` | About | `src/routes/about.tsx` | MarketingLayout | NO | Public | YES |
| 6 | Public Website & Marketing | `/addons/:slug` | Addons $slug | `src/routes/addons.$slug.tsx` | MarketingLayout | NO | Public | NO |
| 7 | Public Website & Marketing | `/addons` | Addons | `src/routes/addons.tsx` | MarketingLayout | NO | Public | YES |
| 8 | Authentication Portal | `/auth` | Auth | `src/routes/auth.tsx` | AuthLayout | NO | Public | YES |
| 9 | Public Website & Marketing | `/careers` | Careers | `src/routes/careers.tsx` | MarketingLayout | NO | Public | NO |
| 10 | Public Website & Marketing | `/cms/$` | Cms $ | `src/routes/cms.$.tsx` | MarketingLayout | NO | Public | NO |
| 11 | Public Website & Marketing | `/cms/index` | Cms Index | `src/routes/cms.index.tsx` | MarketingLayout | NO | Public | NO |
| 12 | Public Website & Marketing | `/contact` | Contact | `src/routes/contact.tsx` | MarketingLayout | NO | Public | YES |
| 13 | Public Website & Marketing | `/customer-display` | Customer Display | `src/routes/customer-display.tsx` | MarketingLayout | NO | Public | YES |
| 14 | Public Website & Marketing | `/developer` | Developer | `src/routes/developer.tsx` | MarketingLayout | NO | Public | YES |
| 15 | Public Website & Marketing | `/docs` | Docs | `src/routes/docs.tsx` | MarketingLayout | NO | Public | YES |
| 16 | Public Website & Marketing | `/error-404` | Error 404 | `src/routes/error-404.tsx` | MarketingLayout | NO | Public | NO |
| 17 | Public Website & Marketing | `/error-500` | Error 500 | `src/routes/error-500.tsx` | MarketingLayout | NO | Public | NO |
| 18 | Public Website & Marketing | `/help-center` | Help Center | `src/routes/help-center.tsx` | MarketingLayout | NO | Public | NO |
| 19 | Public Website & Marketing | `/` | Public Home | `src/routes/index.tsx` | MarketingLayout | NO | Public | YES |
| 20 | Public Website & Marketing | `/legal/:slug` | Legal $slug | `src/routes/legal.$slug.tsx` | MarketingLayout | NO | Public | NO |
| 21 | Authentication Portal | `/lock-screen` | Lock Screen | `src/routes/lock-screen.tsx` | AuthLayout | NO | Public | NO |
| 22 | Authentication Portal | `/login` | Login | `src/routes/login.tsx` | AuthLayout | NO | Public | NO |
| 23 | Public Website & Marketing | `/maintenance` | Maintenance | `src/routes/maintenance.tsx` | MarketingLayout | NO | Public | NO |
| 24 | Public Website & Marketing | `/offline` | Offline | `src/routes/offline.tsx` | MarketingLayout | NO | Public | NO |
| 25 | Public Website & Marketing | `/og-preview` | Og Preview | `src/routes/og-preview.tsx` | MarketingLayout | NO | Public | NO |
| 26 | Public Website & Marketing | `/p/:slug` | P $slug | `src/routes/p.$slug.tsx` | MarketingLayout | NO | Public | NO |
| 27 | Payment Gateway & Checkout Portal | `/payment/failed` | Payment Failed | `src/routes/payment.failed.tsx` | PaymentLayout | NO | Public | NO |
| 28 | Payment Gateway & Checkout Portal | `/payment/pending` | Payment Pending | `src/routes/payment.pending.tsx` | PaymentLayout | NO | Public | NO |
| 29 | Payment Gateway & Checkout Portal | `/payment/success` | Payment Success | `src/routes/payment.success.tsx` | PaymentLayout | NO | Public | NO |
| 30 | Client Document Portal | `/portal/invoices/:id` | Portal Invoices $id | `src/routes/portal.invoices.$id.tsx` | PublicClientLayout | NO | Public | NO |
| 31 | Client Document Portal | `/portal/proposals/:id` | Portal Proposals $id | `src/routes/portal.proposals.$id.tsx` | PublicClientLayout | NO | Public | NO |
| 32 | Client Document Portal | `/portal` | Portal | `src/routes/portal.tsx` | PublicClientLayout | NO | Public | NO |
| 33 | Public Website & Marketing | `/pricing` | Pricing | `src/routes/pricing.tsx` | MarketingLayout | NO | Public | YES |
| 34 | Public Website & Marketing | `/product` | Product | `src/routes/product.tsx` | MarketingLayout | NO | Public | YES |
| 35 | Public Website & Marketing | `/resources` | Resources | `src/routes/resources.tsx` | MarketingLayout | NO | Public | YES |
| 36 | Authentication Portal | `/session-expired` | Session Expired | `src/routes/session-expired.tsx` | AuthLayout | NO | Public | NO |
| 37 | Public Website & Marketing | `/solutions` | Solutions | `src/routes/solutions.tsx` | MarketingLayout | NO | Public | YES |
| 38 | Public Website & Marketing | `/store` | Store | `src/routes/store.tsx` | MarketingLayout | NO | Public | YES |
| 39 | Authentication Portal | `/super-login` | Super Login | `src/routes/super-login.tsx` | AuthLayout | NO | Public | NO |
| 40 | Authentication Portal | `/verify-2fa` | Verify 2fa | `src/routes/verify-2fa.tsx` | AuthLayout | NO | Public | NO |
| 41 | Client / Customer Portal | `/client/dashboard` | Dashboard | `src/routes/_authenticated/client/dashboard.tsx` | ClientLayout | YES | CLIENT | NO |
| 42 | Client / Customer Portal | `/client` | Client Home | `src/routes/_authenticated/client/index.tsx` | ClientLayout | YES | CLIENT | NO |
| 43 | Employee Portal (ESS) | `/employee/dashboard` | Dashboard | `src/routes/_authenticated/employee/dashboard.tsx` | EmployeeLayout | YES | EMPLOYEE | NO |
| 44 | Employee Portal (ESS) | `/employee` | Employee Home | `src/routes/_authenticated/employee/index.tsx` | EmployeeLayout | YES | EMPLOYEE | NO |
| 45 | Tenant Onboarding Portal | `/onboarding` | Onboarding | `src/routes/_authenticated/onboarding.tsx` | OnboardingLayout | YES | AUTHENTICATED | NO |
| 46 | Authenticated General | `/route` | Route | `src/routes/_authenticated/route.tsx` | AuthenticatedLayout | YES | Public | NO |
| 47 | Super Admin Portal | `/super/agents` | Agents | `src/routes/_authenticated/super/agents.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 48 | Super Admin Portal | `/super/analytics` | Analytics | `src/routes/_authenticated/super/analytics.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 49 | Super Admin Portal | `/super/api-docs` | Api Docs | `src/routes/_authenticated/super/api-docs.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 50 | Super Admin Portal | `/super/backup` | Backup | `src/routes/_authenticated/super/backup.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 51 | Super Admin Portal | `/super/blogs` | Blogs | `src/routes/_authenticated/super/blogs.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 52 | Super Admin Portal | `/super/case-studies` | Case Studies | `src/routes/_authenticated/super/case-studies.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 53 | Super Admin Portal | `/super/cms` | Cms | `src/routes/_authenticated/super/cms.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 54 | Super Admin Portal | `/super/coupons` | Coupons | `src/routes/_authenticated/super/coupons.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 55 | Super Admin Portal | `/super/domains/documentation` | Domains Documentation | `src/routes/_authenticated/super/domains.documentation.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 56 | Super Admin Portal | `/super/domains` | Domains | `src/routes/_authenticated/super/domains.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 57 | Super Admin Portal | `/super/email-templates` | Email Templates | `src/routes/_authenticated/super/email-templates.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 58 | Super Admin Portal | `/super/escalation-rules` | Escalation Rules | `src/routes/_authenticated/super/escalation-rules.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 59 | Super Admin Portal | `/super` | Super Home | `src/routes/_authenticated/super/index.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 60 | Super Admin Portal | `/super/languages` | Languages | `src/routes/_authenticated/super/languages.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 61 | Super Admin Portal | `/super/marketplace` | Marketplace | `src/routes/_authenticated/super/marketplace.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 62 | Super Admin Portal | `/super/media` | Media | `src/routes/_authenticated/super/media.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 63 | Super Admin Portal | `/super/notifications` | Notifications | `src/routes/_authenticated/super/notifications.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 64 | Super Admin Portal | `/super/plans` | Plans | `src/routes/_authenticated/super/plans.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 65 | Super Admin Portal | `/super/profile` | Profile | `src/routes/_authenticated/super/profile.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | NO |
| 66 | Super Admin Portal | `/super/roles` | Roles | `src/routes/_authenticated/super/roles.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 67 | Super Admin Portal | `/super/route` | Route | `src/routes/_authenticated/super/route.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | NO |
| 68 | Super Admin Portal | `/super/settings` | Settings | `src/routes/_authenticated/super/settings.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 69 | Super Admin Portal | `/super/sla-policies` | Sla Policies | `src/routes/_authenticated/super/sla-policies.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 70 | Super Admin Portal | `/super/support` | Support | `src/routes/_authenticated/super/support.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 71 | Super Admin Portal | `/super/tenant-support-tickets` | Tenant Support Tickets | `src/routes/_authenticated/super/tenant-support-tickets.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 72 | Super Admin Portal | `/super/tenant-usage-metrics` | Tenant Usage Metrics | `src/routes/_authenticated/super/tenant-usage-metrics.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 73 | Super Admin Portal | `/super/tenants` | Tenants | `src/routes/_authenticated/super/tenants.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 74 | Super Admin Portal | `/super/transactions` | Transactions | `src/routes/_authenticated/super/transactions.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | YES |
| 75 | Super Admin Portal | `/super/users` | Users | `src/routes/_authenticated/super/users.tsx` | SuperAdminLayout | YES | SUPER_ADMIN | NO |
| 76 | Tenant Management | `/tenant` | Tenant Home | `src/routes/_authenticated/tenant/index.tsx` | TenantLayout | YES | TENANT_ADMIN | NO |
| 77 | Tenant Admin & Core ERP Portal | `/accounting` | Accounting | `src/routes/_authenticated/_app/accounting.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 78 | Tenant Admin & Core ERP Portal | `/adjustments` | Adjustments | `src/routes/_authenticated/_app/adjustments.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 79 | Tenant Admin & Core ERP Portal | `/ai-attendance-insights` | Ai Attendance Insights | `src/routes/_authenticated/_app/ai-attendance-insights.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 80 | Tenant Admin & Core ERP Portal | `/ai-configuration` | Ai Configuration | `src/routes/_authenticated/_app/ai-configuration.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 81 | Tenant Admin & Core ERP Portal | `/ai-hiring-forecast` | Ai Hiring Forecast | `src/routes/_authenticated/_app/ai-hiring-forecast.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 82 | Tenant Admin & Core ERP Portal | `/ai-ocr` | Ai Ocr | `src/routes/_authenticated/_app/ai-ocr.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 83 | Tenant Admin & Core ERP Portal | `/ai-payroll-forecast` | Ai Payroll Forecast | `src/routes/_authenticated/_app/ai-payroll-forecast.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 84 | Tenant Admin & Core ERP Portal | `/ai-settings` | Ai Settings | `src/routes/_authenticated/_app/ai-settings.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 85 | Tenant Admin & Core ERP Portal | `/ai-team-performance-insights` | Ai Team Performance Insights | `src/routes/_authenticated/_app/ai-team-performance-insights.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 86 | Tenant Admin & Core ERP Portal | `/ai-writer` | Ai Writer | `src/routes/_authenticated/_app/ai-writer.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 87 | Tenant Admin & Core ERP Portal | `/ai` | Ai | `src/routes/_authenticated/_app/ai.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 88 | Tenant Admin & Core ERP Portal | `/analytics` | Analytics | `src/routes/_authenticated/_app/analytics.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 89 | Tenant Admin & Core ERP Portal | `/announcements` | Announcements | `src/routes/_authenticated/_app/announcements.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 90 | Tenant Admin & Core ERP Portal | `/asset-dashboard` | Asset Dashboard | `src/routes/_authenticated/_app/asset-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 91 | Tenant Admin & Core ERP Portal | `/assets` | Assets | `src/routes/_authenticated/_app/assets.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 92 | Tenant Admin & Core ERP Portal | `/attendance-employee` | Attendance Employee | `src/routes/_authenticated/_app/attendance-employee.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 93 | Tenant Admin & Core ERP Portal | `/attendance-report` | Attendance Report | `src/routes/_authenticated/_app/attendance-report.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 94 | Tenant Admin & Core ERP Portal | `/attendance` | Attendance | `src/routes/_authenticated/_app/attendance.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 95 | Tenant Admin & Core ERP Portal | `/awards` | Awards | `src/routes/_authenticated/_app/awards.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 96 | Tenant Admin & Core ERP Portal | `/ban-ip-address` | Ban Ip Address | `src/routes/_authenticated/_app/ban-ip-address.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 97 | Tenant Admin & Core ERP Portal | `/biometric-sync` | Biometric Sync | `src/routes/_authenticated/_app/biometric-sync.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 98 | Tenant Admin & Core ERP Portal | `/biometric` | Biometric | `src/routes/_authenticated/_app/biometric.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 99 | Tenant Admin & Core ERP Portal | `/budgets` | Budgets | `src/routes/_authenticated/_app/budgets.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 100 | Tenant Admin & Core ERP Portal | `/calendar` | Calendar | `src/routes/_authenticated/_app/calendar.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 101 | Tenant Admin & Core ERP Portal | `/call-history` | Call History | `src/routes/_authenticated/_app/call-history.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 102 | Tenant Admin & Core ERP Portal | `/campaigns` | Campaigns | `src/routes/_authenticated/_app/campaigns.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 103 | Tenant Admin & Core ERP Portal | `/campus-hiring` | Campus Hiring | `src/routes/_authenticated/_app/campus-hiring.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 104 | Tenant Admin & Core ERP Portal | `/certification-tracking` | Certification Tracking | `src/routes/_authenticated/_app/certification-tracking.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 105 | Tenant Admin & Core ERP Portal | `/chat` | Chat | `src/routes/_authenticated/_app/chat.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 106 | Tenant Admin & Core ERP Portal | `/clear-cache` | Clear Cache | `src/routes/_authenticated/_app/clear-cache.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 107 | Tenant Admin & Core ERP Portal | `/client-dashboard` | Client Dashboard | `src/routes/_authenticated/_app/client-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 108 | Tenant Admin & Core ERP Portal | `/clients` | Clients | `src/routes/_authenticated/_app/clients.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 109 | Tenant Admin & Core ERP Portal | `/companies` | Companies | `src/routes/_authenticated/_app/companies.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 110 | Tenant Admin & Core ERP Portal | `/contacts` | Contacts | `src/routes/_authenticated/_app/contacts.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 111 | Tenant Admin & Core ERP Portal | `/crm-dashboard` | Crm Dashboard | `src/routes/_authenticated/_app/crm-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 112 | Tenant Admin & Core ERP Portal | `/crm` | Crm | `src/routes/_authenticated/_app/crm.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 113 | Tenant Admin & Core ERP Portal | `/cronjob` | Cronjob | `src/routes/_authenticated/_app/cronjob.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 114 | Tenant Admin & Core ERP Portal | `/currencies` | Currencies | `src/routes/_authenticated/_app/currencies.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 115 | Tenant Admin & Core ERP Portal | `/custom-fields` | Custom Fields | `src/routes/_authenticated/_app/custom-fields.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 116 | Tenant Admin & Core ERP Portal | `/daily-report` | Daily Report | `src/routes/_authenticated/_app/daily-report.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 117 | Tenant Admin & Core ERP Portal | `/dashboard` | Dashboard | `src/routes/_authenticated/_app/dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 118 | Tenant Admin & Core ERP Portal | `/deals-dashboard` | Deals Dashboard | `src/routes/_authenticated/_app/deals-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 119 | Tenant Admin & Core ERP Portal | `/departments` | Departments | `src/routes/_authenticated/_app/departments.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 120 | Tenant Admin & Core ERP Portal | `/designations` | Designations | `src/routes/_authenticated/_app/designations.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 121 | Tenant Admin & Core ERP Portal | `/documents` | Documents | `src/routes/_authenticated/_app/documents.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 122 | Tenant Admin & Core ERP Portal | `/employee-dashboard` | Employee Dashboard | `src/routes/_authenticated/_app/employee-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 123 | Tenant Admin & Core ERP Portal | `/employee-details` | Employee Details | `src/routes/_authenticated/_app/employee-details.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 124 | Tenant Admin & Core ERP Portal | `/employee-report` | Employee Report | `src/routes/_authenticated/_app/employee-report.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 125 | Tenant Admin & Core ERP Portal | `/employees` | Employees | `src/routes/_authenticated/_app/employees.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 126 | Tenant Admin & Core ERP Portal | `/expenses-report` | Expenses Report | `src/routes/_authenticated/_app/expenses-report.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 127 | Tenant Admin & Core ERP Portal | `/expenses` | Expenses | `src/routes/_authenticated/_app/expenses.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 128 | Tenant Admin & Core ERP Portal | `/finance-dashboard` | Finance Dashboard | `src/routes/_authenticated/_app/finance-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 129 | Tenant Admin & Core ERP Portal | `/forms` | Forms | `src/routes/_authenticated/_app/forms.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 130 | Tenant Admin & Core ERP Portal | `/google-workspace` | Google Workspace | `src/routes/_authenticated/_app/google-workspace.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 131 | Tenant Admin & Core ERP Portal | `/help-desk-dashboard` | Help Desk Dashboard | `src/routes/_authenticated/_app/help-desk-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 132 | Tenant Admin & Core ERP Portal | `/helpdesk` | Helpdesk | `src/routes/_authenticated/_app/helpdesk.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 133 | Tenant Admin & Core ERP Portal | `/holidays` | Holidays | `src/routes/_authenticated/_app/holidays.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 134 | Tenant Admin & Core ERP Portal | `/hrm-dashboard` | Hrm Dashboard | `src/routes/_authenticated/_app/hrm-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 135 | Tenant Admin & Core ERP Portal | `/hrm` | Hrm | `src/routes/_authenticated/_app/hrm.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 136 | Tenant Admin & Core ERP Portal | `/integrations` | Integrations | `src/routes/_authenticated/_app/integrations.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 137 | Tenant Admin & Core ERP Portal | `/inventory-dashboard` | Inventory Dashboard | `src/routes/_authenticated/_app/inventory-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 138 | Tenant Admin & Core ERP Portal | `/invoice-report` | Invoice Report | `src/routes/_authenticated/_app/invoice-report.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 139 | Tenant Admin & Core ERP Portal | `/invoice/:id/print` | Invoice $id Print | `src/routes/_authenticated/_app/invoice.$id.print.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 140 | Tenant Admin & Core ERP Portal | `/invoice/:id` | Invoice $id | `src/routes/_authenticated/_app/invoice.$id.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 141 | Tenant Admin & Core ERP Portal | `/invoice/create` | Invoice Create | `src/routes/_authenticated/_app/invoice.create.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 142 | Tenant Admin & Core ERP Portal | `/invoices` | Invoices | `src/routes/_authenticated/_app/invoices.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 143 | Tenant Admin & Core ERP Portal | `/it-admin-dashboard` | It Admin Dashboard | `src/routes/_authenticated/_app/it-admin-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 144 | Tenant Admin & Core ERP Portal | `/leads-dashboard` | Leads Dashboard | `src/routes/_authenticated/_app/leads-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 145 | Tenant Admin & Core ERP Portal | `/learning-analytics` | Learning Analytics | `src/routes/_authenticated/_app/learning-analytics.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 146 | Tenant Admin & Core ERP Portal | `/leave-report` | Leave Report | `src/routes/_authenticated/_app/leave-report.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 147 | Tenant Admin & Core ERP Portal | `/leave` | Leave | `src/routes/_authenticated/_app/leave.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 148 | Tenant Admin & Core ERP Portal | `/marketplace` | Marketplace | `src/routes/_authenticated/_app/marketplace.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 149 | Tenant Admin & Core ERP Portal | `/media` | Media | `src/routes/_authenticated/_app/media.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 150 | Tenant Admin & Core ERP Portal | `/notes` | Notes | `src/routes/_authenticated/_app/notes.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 151 | Tenant Admin & Core ERP Portal | `/notice-period-tracker` | Notice Period Tracker | `src/routes/_authenticated/_app/notice-period-tracker.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 152 | Tenant Admin & Core ERP Portal | `/offboarding` | Offboarding | `src/routes/_authenticated/_app/offboarding.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 153 | Tenant Admin & Core ERP Portal | `/okr` | Okr | `src/routes/_authenticated/_app/okr.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 154 | Tenant Admin & Core ERP Portal | `/overtime` | Overtime | `src/routes/_authenticated/_app/overtime.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 155 | Tenant Admin & Core ERP Portal | `/payment-report` | Payment Report | `src/routes/_authenticated/_app/payment-report.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 156 | Tenant Admin & Core ERP Portal | `/payroll-dashboard` | Payroll Dashboard | `src/routes/_authenticated/_app/payroll-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 157 | Tenant Admin & Core ERP Portal | `/payroll` | Payroll | `src/routes/_authenticated/_app/payroll.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 158 | Tenant Admin & Core ERP Portal | `/payslip-report` | Payslip Report | `src/routes/_authenticated/_app/payslip-report.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 159 | Tenant Admin & Core ERP Portal | `/performance-appraisal` | Performance Appraisal | `src/routes/_authenticated/_app/performance-appraisal.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 160 | Tenant Admin & Core ERP Portal | `/performance-indicator` | Performance Indicator | `src/routes/_authenticated/_app/performance-indicator.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 161 | Tenant Admin & Core ERP Portal | `/performance-review` | Performance Review | `src/routes/_authenticated/_app/performance-review.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 162 | Tenant Admin & Core ERP Portal | `/pipeline` | Pipeline | `src/routes/_authenticated/_app/pipeline.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 163 | Tenant Admin & Core ERP Portal | `/pos-dashboard` | Pos Dashboard | `src/routes/_authenticated/_app/pos-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 164 | Tenant Admin & Core ERP Portal | `/pos` | Pos | `src/routes/_authenticated/_app/pos.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 165 | Tenant Admin & Core ERP Portal | `/probation` | Probation | `src/routes/_authenticated/_app/probation.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 166 | Tenant Admin & Core ERP Portal | `/procurement-dashboard` | Procurement Dashboard | `src/routes/_authenticated/_app/procurement-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 167 | Tenant Admin & Core ERP Portal | `/products` | Products | `src/routes/_authenticated/_app/products.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 168 | Tenant Admin & Core ERP Portal | `/profile` | Profile | `src/routes/_authenticated/_app/profile.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 169 | Tenant Admin & Core ERP Portal | `/project-dashboard` | Project Dashboard | `src/routes/_authenticated/_app/project-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 170 | Tenant Admin & Core ERP Portal | `/project-report` | Project Report | `src/routes/_authenticated/_app/project-report.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 171 | Tenant Admin & Core ERP Portal | `/project/:id` | Project $id | `src/routes/_authenticated/_app/project.$id.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 172 | Tenant Admin & Core ERP Portal | `/projects` | Projects | `src/routes/_authenticated/_app/projects.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 173 | Tenant Admin & Core ERP Portal | `/promotions` | Promotions | `src/routes/_authenticated/_app/promotions.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 174 | Tenant Admin & Core ERP Portal | `/proposals` | Proposals | `src/routes/_authenticated/_app/proposals.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 175 | Tenant Admin & Core ERP Portal | `/provident-fund` | Provident Fund | `src/routes/_authenticated/_app/provident-fund.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 176 | Tenant Admin & Core ERP Portal | `/purchases` | Purchases | `src/routes/_authenticated/_app/purchases.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 177 | Tenant Admin & Core ERP Portal | `/razorpay-gateway` | Razorpay Gateway | `src/routes/_authenticated/_app/razorpay-gateway.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 178 | Tenant Admin & Core ERP Portal | `/recruitment-dashboard` | Recruitment Dashboard | `src/routes/_authenticated/_app/recruitment-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 179 | Tenant Admin & Core ERP Portal | `/recruitment` | Recruitment | `src/routes/_authenticated/_app/recruitment.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 180 | Tenant Admin & Core ERP Portal | `/recurring-invoices` | Recurring Invoices | `src/routes/_authenticated/_app/recurring-invoices.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 181 | Tenant Admin & Core ERP Portal | `/referrals` | Referrals | `src/routes/_authenticated/_app/referrals.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 182 | Tenant Admin & Core ERP Portal | `/resignation` | Resignation | `src/routes/_authenticated/_app/resignation.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 183 | Tenant Admin & Core ERP Portal | `/returns` | Returns | `src/routes/_authenticated/_app/returns.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 184 | Tenant Admin & Core ERP Portal | `/_app` | Route | `src/routes/_authenticated/_app/route.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 185 | Tenant Admin & Core ERP Portal | `/sales-dashboard` | Sales Dashboard | `src/routes/_authenticated/_app/sales-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 186 | Tenant Admin & Core ERP Portal | `/settings/custom-domain` | Settings Custom Domain | `src/routes/_authenticated/_app/settings.custom-domain.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 187 | Tenant Admin & Core ERP Portal | `/settings` | Settings | `src/routes/_authenticated/_app/settings.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 188 | Tenant Admin & Core ERP Portal | `/setup-notes` | Setup Notes | `src/routes/_authenticated/_app/setup-notes.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 189 | Tenant Admin & Core ERP Portal | `/shift-swap-requests` | Shift Swap Requests | `src/routes/_authenticated/_app/shift-swap-requests.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 190 | Tenant Admin & Core ERP Portal | `/shifts` | Shifts | `src/routes/_authenticated/_app/shifts.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 191 | Tenant Admin & Core ERP Portal | `/shopify` | Shopify | `src/routes/_authenticated/_app/shopify.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 192 | Tenant Admin & Core ERP Portal | `/subscription` | Subscription | `src/routes/_authenticated/_app/subscription.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 193 | Tenant Admin & Core ERP Portal | `/suppliers` | Suppliers | `src/routes/_authenticated/_app/suppliers.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 194 | Tenant Admin & Core ERP Portal | `/support-dashboard` | Support Dashboard | `src/routes/_authenticated/_app/support-dashboard.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 195 | Tenant Admin & Core ERP Portal | `/support` | Support | `src/routes/_authenticated/_app/support.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 196 | Tenant Admin & Core ERP Portal | `/system-states` | System States | `src/routes/_authenticated/_app/system-states.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 197 | Tenant Admin & Core ERP Portal | `/tally-importer` | Tally Importer | `src/routes/_authenticated/_app/tally-importer.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 198 | Tenant Admin & Core ERP Portal | `/task-board` | Task Board | `src/routes/_authenticated/_app/task-board.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 199 | Tenant Admin & Core ERP Portal | `/tasks` | Tasks | `src/routes/_authenticated/_app/tasks.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 200 | Tenant Admin & Core ERP Portal | `/taxes` | Taxes | `src/routes/_authenticated/_app/taxes.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 201 | Tenant Admin & Core ERP Portal | `/termination` | Termination | `src/routes/_authenticated/_app/termination.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 202 | Tenant Admin & Core ERP Portal | `/ticket-reports` | Ticket Reports | `src/routes/_authenticated/_app/ticket-reports.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 203 | Tenant Admin & Core ERP Portal | `/timesheets` | Timesheets | `src/routes/_authenticated/_app/timesheets.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |
| 204 | Tenant Admin & Core ERP Portal | `/todo` | Todo | `src/routes/_authenticated/_app/todo.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 205 | Tenant Admin & Core ERP Portal | `/training` | Training | `src/routes/_authenticated/_app/training.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 206 | Tenant Admin & Core ERP Portal | `/transfers` | Transfers | `src/routes/_authenticated/_app/transfers.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 207 | Tenant Admin & Core ERP Portal | `/users` | Users | `src/routes/_authenticated/_app/users.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 208 | Tenant Admin & Core ERP Portal | `/warnings` | Warnings | `src/routes/_authenticated/_app/warnings.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 209 | Tenant Admin & Core ERP Portal | `/whatsapp-alerts` | Whatsapp Alerts | `src/routes/_authenticated/_app/whatsapp-alerts.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 210 | Tenant Admin & Core ERP Portal | `/work-from-home` | Work From Home | `src/routes/_authenticated/_app/work-from-home.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 211 | Tenant Admin & Core ERP Portal | `/workflows` | Workflows | `src/routes/_authenticated/_app/workflows.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | YES |
| 212 | Tenant Admin & Core ERP Portal | `/workspace` | Workspace | `src/routes/_authenticated/_app/workspace.tsx` | AppDashboardLayout (DreamsSidebar) | YES | HR_ADMIN / TENANT_USER | NO |

---

## 2. Page Registry & Complexity Matrix

| # | Dashboard | Page | Route | Component Count | Main Components | Complexity |
|---|---|---|---|---:|---|---|
| 1 | Public Website & Marketing | 403 | `/403` | 1 | ForbiddenView | **LOW** |
| 2 | Public Website & Marketing | 404 | `/404` | 1 | NotFoundView | **LOW** |
| 3 | Public Website & Marketing | 500 | `/500` | 1 | ServerErrorView | **LOW** |
| 4 | Public Website & Marketing | A $tag | `/a/:tag` | 6 | Card, Badge, Button | **LOW** |
| 5 | Public Website & Marketing | About | `/about` | 3 | MarketingLayout, PageHero, Badge | **LOW** |
| 6 | Public Website & Marketing | Addons $slug | `/addons/:slug` | 10 | Link, MarketingLayout, PageHero, Button, Badge | **LOW** |
| 7 | Public Website & Marketing | Addons | `/addons` | 11 | Link, MarketingLayout, PageHero, Input, Button | **LOW** |
| 8 | Authentication Portal | Auth | `/auth` | 8 | Link, ThemeToggle | **CRITICAL** |
| 9 | Public Website & Marketing | Careers | `/careers` | 26 | Link, Button, Input, Label, Textarea | **HIGH** |
| 10 | Public Website & Marketing | Cms $ | `/cms/$` | 3 | MarketingLayout, PageHero | **LOW** |
| 11 | Public Website & Marketing | Cms Index | `/cms/index` | 2 | MarketingLayout, PageHero | **LOW** |
| 12 | Public Website & Marketing | Contact | `/contact` | 10 | MarketingLayout, PageHero, Input, Label, Button | **LOW** |
| 13 | Public Website & Marketing | Customer Display | `/customer-display` | 10 | Card, Badge | **LOW** |
| 14 | Public Website & Marketing | Developer | `/developer` | 40 | Link, ThemeToggle, Card, CardContent, CardHeader | **HIGH** |
| 15 | Public Website & Marketing | Docs | `/docs` | 48 | Link, Card, CardContent, CardHeader, CardTitle | **HIGH** |
| 16 | Public Website & Marketing | Error 404 | `/error-404` | 1 | NotFoundView | **LOW** |
| 17 | Public Website & Marketing | Error 500 | `/error-500` | 1 | ServerErrorView | **LOW** |
| 18 | Public Website & Marketing | Help Center | `/help-center` | 14 | Link, Card, CardContent, CardHeader, CardTitle | **MEDIUM** |
| 19 | Public Website & Marketing | Public Home | `/` | 12 | Link, Button, Badge, MarketingLayout | **MEDIUM** |
| 20 | Public Website & Marketing | Legal $slug | `/legal/:slug` | 3 | MarketingLayout, PageHero | **LOW** |
| 21 | Authentication Portal | Lock Screen | `/lock-screen` | 3 | Link | **LOW** |
| 22 | Authentication Portal | Login | `/login` | 0 | Standard Layout Elements | **LOW** |
| 23 | Public Website & Marketing | Maintenance | `/maintenance` | 13 | Link, MarketingLayout, Button, Badge, Calendar | **MEDIUM** |
| 24 | Public Website & Marketing | Offline | `/offline` | 1 | OfflineView | **LOW** |
| 25 | Public Website & Marketing | Og Preview | `/og-preview` | 20 | MarketingLayout, PageHero, Input, Button, Card | **MEDIUM** |
| 26 | Public Website & Marketing | P $slug | `/p/:slug` | 3 | MarketingLayout, PageHero | **LOW** |
| 27 | Payment Gateway & Checkout Portal | Payment Failed | `/payment/failed` | 12 | Link, Button, Card, CardContent, Badge | **CRITICAL** |
| 28 | Payment Gateway & Checkout Portal | Payment Pending | `/payment/pending` | 9 | Link, Button, Card, CardContent, Badge | **CRITICAL** |
| 29 | Payment Gateway & Checkout Portal | Payment Success | `/payment/success` | 10 | Link, Button, Card, CardContent, Badge | **CRITICAL** |
| 30 | Client Document Portal | Portal Invoices $id | `/portal/invoices/:id` | 7 | Button, Badge | **LOW** |
| 31 | Client Document Portal | Portal Proposals $id | `/portal/proposals/:id` | 23 | Button, Badge, Card, CardContent, Input | **CRITICAL** |
| 32 | Client Document Portal | Portal | `/portal` | 21 | Link, Card, CardHeader, CardTitle, CardContent | **MEDIUM** |
| 33 | Public Website & Marketing | Pricing | `/pricing` | 21 | Link, Button, Input, MarketingLayout, PageHero | **MEDIUM** |
| 34 | Public Website & Marketing | Product | `/product` | 6 | Link, Button, MarketingLayout, PageHero | **LOW** |
| 35 | Public Website & Marketing | Resources | `/resources` | 12 | Link, MarketingLayout, PageHero, Card, Button | **LOW** |
| 36 | Authentication Portal | Session Expired | `/session-expired` | 1 | SessionExpiredView | **LOW** |
| 37 | Public Website & Marketing | Solutions | `/solutions` | 6 | Link, Button, MarketingLayout, PageHero | **LOW** |
| 38 | Public Website & Marketing | Store | `/store` | 10 | Link, Button, CartDrawer | **LOW** |
| 39 | Authentication Portal | Super Login | `/super-login` | 22 | Link, Button, Input, Label, Card | **MEDIUM** |
| 40 | Authentication Portal | Verify 2fa | `/verify-2fa` | 11 | Link, Button, Badge, ThemeToggle | **LOW** |
| 41 | Client / Customer Portal | Dashboard | `/client/dashboard` | 0 | Standard Layout Elements | **CRITICAL** |
| 42 | Client / Customer Portal | Client Home | `/client` | 0 | Standard Layout Elements | **CRITICAL** |
| 43 | Employee Portal (ESS) | Dashboard | `/employee/dashboard` | 0 | Standard Layout Elements | **CRITICAL** |
| 44 | Employee Portal (ESS) | Employee Home | `/employee` | 0 | Standard Layout Elements | **CRITICAL** |
| 45 | Tenant Onboarding Portal | Onboarding | `/onboarding` | 17 | Button, Input, Label, Card, CardContent | **CRITICAL** |
| 46 | Authenticated General | Route | `/route` | 1 | Outlet | **CRITICAL** |
| 47 | Super Admin Portal | Agents | `/super/agents` | 10 | Standard Layout Elements | **CRITICAL** |
| 48 | Super Admin Portal | Analytics | `/super/analytics` | 30 | Card, CardContent, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 49 | Super Admin Portal | Api Docs | `/super/api-docs` | 33 | Link, Card, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 50 | Super Admin Portal | Backup | `/super/backup` | 11 | Card, Button, Badge | **CRITICAL** |
| 51 | Super Admin Portal | Blogs | `/super/blogs` | 33 | Card, CardContent, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 52 | Super Admin Portal | Case Studies | `/super/case-studies` | 33 | Card, CardContent, CardHeader, CardTitle, Button | **CRITICAL** |
| 53 | Super Admin Portal | Cms | `/super/cms` | 62 | Button, Input, Label, Textarea, Switch | **CRITICAL** |
| 54 | Super Admin Portal | Coupons | `/super/coupons` | 20 | Button, Input, Label, Badge, Dialog | **CRITICAL** |
| 55 | Super Admin Portal | Domains Documentation | `/super/domains/documentation` | 21 | Link, Card, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 56 | Super Admin Portal | Domains | `/super/domains` | 34 | Link, Outlet, Card, Badge, Button | **CRITICAL** |
| 57 | Super Admin Portal | Email Templates | `/super/email-templates` | 22 | Card, Button, Input, Textarea, Badge | **CRITICAL** |
| 58 | Super Admin Portal | Escalation Rules | `/super/escalation-rules` | 10 | Standard Layout Elements | **CRITICAL** |
| 59 | Super Admin Portal | Super Home | `/super` | 16 | Link, Suspense, Dialog, DialogContent, DialogHeader | **CRITICAL** |
| 60 | Super Admin Portal | Languages | `/super/languages` | 27 | Card, Button, Input, Badge, Select | **CRITICAL** |
| 61 | Super Admin Portal | Marketplace | `/super/marketplace` | 36 | Button, Input, Label, Textarea, Card | **CRITICAL** |
| 62 | Super Admin Portal | Media | `/super/media` | 28 | Card, CardContent, Button, Input, Badge | **CRITICAL** |
| 63 | Super Admin Portal | Notifications | `/super/notifications` | 11 | Card, Button, Input, Textarea, Badge | **CRITICAL** |
| 64 | Super Admin Portal | Plans | `/super/plans` | 35 | Card, CardContent, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 65 | Super Admin Portal | Profile | `/super/profile` | 31 | Card, CardHeader, CardTitle, CardDescription, CardFooter | **CRITICAL** |
| 66 | Super Admin Portal | Roles | `/super/roles` | 43 | Card, CardContent, CardHeader, CardTitle, Button | **CRITICAL** |
| 67 | Super Admin Portal | Route | `/super/route` | 25 | Link, Outlet, Fragment, Badge, Avatar | **CRITICAL** |
| 68 | Super Admin Portal | Settings | `/super/settings` | 54 | Link, Card, Button, Input, Badge | **CRITICAL** |
| 69 | Super Admin Portal | Sla Policies | `/super/sla-policies` | 10 | Standard Layout Elements | **CRITICAL** |
| 70 | Super Admin Portal | Support | `/super/support` | 32 | Card, CardContent, Button, Input, Badge | **CRITICAL** |
| 71 | Super Admin Portal | Tenant Support Tickets | `/super/tenant-support-tickets` | 12 | Standard Layout Elements | **CRITICAL** |
| 72 | Super Admin Portal | Tenant Usage Metrics | `/super/tenant-usage-metrics` | 25 | Calendar, CompanyAvatar | **CRITICAL** |
| 73 | Super Admin Portal | Tenants | `/super/tenants` | 49 | WorkspacePolicyDialog, Link, Dialog, DialogContent, DialogHeader | **CRITICAL** |
| 74 | Super Admin Portal | Transactions | `/super/transactions` | 34 | Link, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger | **CRITICAL** |
| 75 | Super Admin Portal | Users | `/super/users` | 40 | Button, Input, Label, Card, Table | **CRITICAL** |
| 76 | Tenant Management | Tenant Home | `/tenant` | 0 | Standard Layout Elements | **CRITICAL** |
| 77 | Tenant Admin & Core ERP Portal | Accounting | `/accounting` | 50 | Card, CardContent, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 78 | Tenant Admin & Core ERP Portal | Adjustments | `/adjustments` | 36 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 79 | Tenant Admin & Core ERP Portal | Ai Attendance Insights | `/ai-attendance-insights` | 3 | Link, Suspense | **CRITICAL** |
| 80 | Tenant Admin & Core ERP Portal | Ai Configuration | `/ai-configuration` | 1 | Link | **CRITICAL** |
| 81 | Tenant Admin & Core ERP Portal | Ai Hiring Forecast | `/ai-hiring-forecast` | 30 | Link, Card, CardContent, CardHeader, CardTitle | **CRITICAL** |
| 82 | Tenant Admin & Core ERP Portal | Ai Ocr | `/ai-ocr` | 17 | Card, Button, Input, Label, Badge | **CRITICAL** |
| 83 | Tenant Admin & Core ERP Portal | Ai Payroll Forecast | `/ai-payroll-forecast` | 3 | Link, Suspense | **CRITICAL** |
| 84 | Tenant Admin & Core ERP Portal | Ai Settings | `/ai-settings` | 1 | Link | **CRITICAL** |
| 85 | Tenant Admin & Core ERP Portal | Ai Team Performance Insights | `/ai-team-performance-insights` | 3 | Link, Suspense | **CRITICAL** |
| 86 | Tenant Admin & Core ERP Portal | Ai Writer | `/ai-writer` | 30 | Card, CardContent, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 87 | Tenant Admin & Core ERP Portal | Ai | `/ai` | 43 | Card, CardContent, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 88 | Tenant Admin & Core ERP Portal | Analytics | `/analytics` | 43 | AccessDenied, Calendar, Card, CardContent, CardHeader | **CRITICAL** |
| 89 | Tenant Admin & Core ERP Portal | Announcements | `/announcements` | 42 | Card, CardContent, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 90 | Tenant Admin & Core ERP Portal | Asset Dashboard | `/asset-dashboard` | 6 | Suspense, Dialog, DialogContent, DialogHeader, DialogTitle | **CRITICAL** |
| 91 | Tenant Admin & Core ERP Portal | Assets | `/assets` | 36 | Link, Card, Button, Input, Label | **CRITICAL** |
| 92 | Tenant Admin & Core ERP Portal | Attendance Employee | `/attendance-employee` | 34 | Link, Card, CardContent, CardHeader, CardTitle | **CRITICAL** |
| 93 | Tenant Admin & Core ERP Portal | Attendance Report | `/attendance-report` | 30 | Link, Button, Input, Card, Table | **CRITICAL** |
| 94 | Tenant Admin & Core ERP Portal | Attendance | `/attendance` | 55 | Link, Button, Input, Label, Textarea | **CRITICAL** |
| 95 | Tenant Admin & Core ERP Portal | Awards | `/awards` | 45 | Link, Card, CardContent, CardHeader, CardTitle | **CRITICAL** |
| 96 | Tenant Admin & Core ERP Portal | Ban Ip Address | `/ban-ip-address` | 31 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 97 | Tenant Admin & Core ERP Portal | Biometric Sync | `/biometric-sync` | 48 | Card, Button, Input, Label, Badge | **CRITICAL** |
| 98 | Tenant Admin & Core ERP Portal | Biometric | `/biometric` | 59 | Card, CardContent, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 99 | Tenant Admin & Core ERP Portal | Budgets | `/budgets` | 38 | Link, Button, Input, Label, Textarea | **CRITICAL** |
| 100 | Tenant Admin & Core ERP Portal | Calendar | `/calendar` | 27 | Button, Input, Label, Textarea, Card | **CRITICAL** |
| 101 | Tenant Admin & Core ERP Portal | Call History | `/call-history` | 35 | Link, Card, CardContent, CardHeader, CardTitle | **CRITICAL** |
| 102 | Tenant Admin & Core ERP Portal | Campaigns | `/campaigns` | 31 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 103 | Tenant Admin & Core ERP Portal | Campus Hiring | `/campus-hiring` | 38 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 104 | Tenant Admin & Core ERP Portal | Certification Tracking | `/certification-tracking` | 39 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 105 | Tenant Admin & Core ERP Portal | Chat | `/chat` | 67 | Button, Input, Badge, Avatar, AvatarFallback | **CRITICAL** |
| 106 | Tenant Admin & Core ERP Portal | Clear Cache | `/clear-cache` | 20 | Link, Card, CardContent, CardHeader, CardTitle | **CRITICAL** |
| 107 | Tenant Admin & Core ERP Portal | Client Dashboard | `/client-dashboard` | 37 | Link, Calendar, Card, CardContent, CardHeader | **CRITICAL** |
| 108 | Tenant Admin & Core ERP Portal | Clients | `/clients` | 36 | Link, Button, Input, Label, Textarea | **CRITICAL** |
| 109 | Tenant Admin & Core ERP Portal | Companies | `/companies` | 41 | Link, Button, Input, Label, Textarea | **CRITICAL** |
| 110 | Tenant Admin & Core ERP Portal | Contacts | `/contacts` | 53 | Card, CardContent, CardHeader, CardTitle, Button | **CRITICAL** |
| 111 | Tenant Admin & Core ERP Portal | Crm Dashboard | `/crm-dashboard` | 3 | AccessDenied, Link | **CRITICAL** |
| 112 | Tenant Admin & Core ERP Portal | Crm | `/crm` | 46 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 113 | Tenant Admin & Core ERP Portal | Cronjob | `/cronjob` | 41 | Link, Card, CardContent, CardHeader, CardTitle | **CRITICAL** |
| 114 | Tenant Admin & Core ERP Portal | Currencies | `/currencies` | 35 | Link, Button, Input, Label, Badge | **CRITICAL** |
| 115 | Tenant Admin & Core ERP Portal | Custom Fields | `/custom-fields` | 28 | Link, Card, CardContent, Button, Input | **CRITICAL** |
| 116 | Tenant Admin & Core ERP Portal | Daily Report | `/daily-report` | 30 | Link, Card, CardContent, CardHeader, CardTitle | **CRITICAL** |
| 117 | Tenant Admin & Core ERP Portal | Dashboard | `/dashboard` | 0 | Standard Layout Elements | **CRITICAL** |
| 118 | Tenant Admin & Core ERP Portal | Deals Dashboard | `/deals-dashboard` | 6 | Suspense, Dialog, DialogContent, DialogHeader, DialogTitle | **CRITICAL** |
| 119 | Tenant Admin & Core ERP Portal | Departments | `/departments` | 35 | Link, Button, Input, Label, Card | **CRITICAL** |
| 120 | Tenant Admin & Core ERP Portal | Designations | `/designations` | 36 | Link, Button, Input, Label, Card | **CRITICAL** |
| 121 | Tenant Admin & Core ERP Portal | Documents | `/documents` | 44 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 122 | Tenant Admin & Core ERP Portal | Employee Dashboard | `/employee-dashboard` | 7 | Link, Suspense, Dialog, DialogContent, DialogHeader | **CRITICAL** |
| 123 | Tenant Admin & Core ERP Portal | Employee Details | `/employee-details` | 41 | Card, CardContent, CardHeader, CardTitle, Button | **CRITICAL** |
| 124 | Tenant Admin & Core ERP Portal | Employee Report | `/employee-report` | 28 | Link, Button, Input, Card, Table | **CRITICAL** |
| 125 | Tenant Admin & Core ERP Portal | Employees | `/employees` | 72 | Button, Input, Label, Card, CardContent | **CRITICAL** |
| 126 | Tenant Admin & Core ERP Portal | Expenses Report | `/expenses-report` | 25 | Card, CardContent, CardHeader, CardTitle, Button | **CRITICAL** |
| 127 | Tenant Admin & Core ERP Portal | Expenses | `/expenses` | 61 | Card, CardContent, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 128 | Tenant Admin & Core ERP Portal | Finance Dashboard | `/finance-dashboard` | 3 | Link, Suspense, AccessDenied | **CRITICAL** |
| 129 | Tenant Admin & Core ERP Portal | Forms | `/forms` | 52 | Card, CardContent, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 130 | Tenant Admin & Core ERP Portal | Google Workspace | `/google-workspace` | 27 | Card, CardHeader, CardTitle, CardDescription, Button | **CRITICAL** |
| 131 | Tenant Admin & Core ERP Portal | Help Desk Dashboard | `/help-desk-dashboard` | 6 | Suspense, Dialog, DialogContent, DialogHeader, DialogTitle | **CRITICAL** |
| 132 | Tenant Admin & Core ERP Portal | Helpdesk | `/helpdesk` | 45 | Card, CardContent, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 133 | Tenant Admin & Core ERP Portal | Holidays | `/holidays` | 36 | Link, Button, Input, Label, Card | **CRITICAL** |
| 134 | Tenant Admin & Core ERP Portal | Hrm Dashboard | `/hrm-dashboard` | 4 | AccessDenied, Link, Suspense | **CRITICAL** |
| 135 | Tenant Admin & Core ERP Portal | Hrm | `/hrm` | 9 | Link, Button, Badge, PlanGuard | **CRITICAL** |
| 136 | Tenant Admin & Core ERP Portal | Integrations | `/integrations` | 50 | Button, Input, Label, Card, CardContent | **CRITICAL** |
| 137 | Tenant Admin & Core ERP Portal | Inventory Dashboard | `/inventory-dashboard` | 10 | AccessDenied, Link, Badge | **CRITICAL** |
| 138 | Tenant Admin & Core ERP Portal | Invoice Report | `/invoice-report` | 33 | Link, Button, Input, Card, Table | **CRITICAL** |
| 139 | Tenant Admin & Core ERP Portal | Invoice $id Print | `/invoice/:id/print` | 8 | Link, Button, Separator | **CRITICAL** |
| 140 | Tenant Admin & Core ERP Portal | Invoice $id | `/invoice/:id` | 37 | Link, Outlet, Card, CardContent, CardHeader | **CRITICAL** |
| 141 | Tenant Admin & Core ERP Portal | Invoice Create | `/invoice/create` | 1 | InvoiceCreatorView | **CRITICAL** |
| 142 | Tenant Admin & Core ERP Portal | Invoices | `/invoices` | 41 | Link, Card, CardContent, Button, Input | **CRITICAL** |
| 143 | Tenant Admin & Core ERP Portal | It Admin Dashboard | `/it-admin-dashboard` | 4 | Link, Suspense, AccessDenied | **CRITICAL** |
| 144 | Tenant Admin & Core ERP Portal | Leads Dashboard | `/leads-dashboard` | 5 | Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter | **CRITICAL** |
| 145 | Tenant Admin & Core ERP Portal | Learning Analytics | `/learning-analytics` | 3 | Link, Suspense | **CRITICAL** |
| 146 | Tenant Admin & Core ERP Portal | Leave Report | `/leave-report` | 27 | Link, Button, Input, Card, Table | **CRITICAL** |
| 147 | Tenant Admin & Core ERP Portal | Leave | `/leave` | 47 | Button, Input, Label, Textarea, Card | **CRITICAL** |
| 148 | Tenant Admin & Core ERP Portal | Marketplace | `/marketplace` | 23 | Link, Card, CardContent, CardHeader, CardTitle | **CRITICAL** |
| 149 | Tenant Admin & Core ERP Portal | Media | `/media` | 28 | Card, CardContent, Button, Input, Badge | **CRITICAL** |
| 150 | Tenant Admin & Core ERP Portal | Notes | `/notes` | 27 | Button, Input, Label, Textarea, Card | **CRITICAL** |
| 151 | Tenant Admin & Core ERP Portal | Notice Period Tracker | `/notice-period-tracker` | 43 | Link, Card, CardContent, CardHeader, CardTitle | **CRITICAL** |
| 152 | Tenant Admin & Core ERP Portal | Offboarding | `/offboarding` | 45 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 153 | Tenant Admin & Core ERP Portal | Okr | `/okr` | 32 | Card, Button, Input, Label, Textarea | **CRITICAL** |
| 154 | Tenant Admin & Core ERP Portal | Overtime | `/overtime` | 37 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 155 | Tenant Admin & Core ERP Portal | Payment Report | `/payment-report` | 25 | Card, CardContent, CardHeader, CardTitle, Button | **CRITICAL** |
| 156 | Tenant Admin & Core ERP Portal | Payroll Dashboard | `/payroll-dashboard` | 7 | Link, Suspense, Dialog, DialogContent, DialogHeader | **CRITICAL** |
| 157 | Tenant Admin & Core ERP Portal | Payroll | `/payroll` | 57 | Button, Card, CardContent, CardHeader, CardTitle | **CRITICAL** |
| 158 | Tenant Admin & Core ERP Portal | Payslip Report | `/payslip-report` | 39 | Link, Button, Input, Card, Table | **CRITICAL** |
| 159 | Tenant Admin & Core ERP Portal | Performance Appraisal | `/performance-appraisal` | 44 | Link, Button, Input, Label, Textarea | **CRITICAL** |
| 160 | Tenant Admin & Core ERP Portal | Performance Indicator | `/performance-indicator` | 41 | Link, Button, Input, Label, Card | **CRITICAL** |
| 161 | Tenant Admin & Core ERP Portal | Performance Review | `/performance-review` | 32 | Link, Button, Card, CardContent, CardHeader | **CRITICAL** |
| 162 | Tenant Admin & Core ERP Portal | Pipeline | `/pipeline` | 35 | Link, Button, Input, Label, Badge | **CRITICAL** |
| 163 | Tenant Admin & Core ERP Portal | Pos Dashboard | `/pos-dashboard` | 3 | AccessDenied, Link | **CRITICAL** |
| 164 | Tenant Admin & Core ERP Portal | Pos | `/pos` | 50 | Card, Button, Input, Label, Badge | **CRITICAL** |
| 165 | Tenant Admin & Core ERP Portal | Probation | `/probation` | 35 | Card, Button, Input, Label, Textarea | **CRITICAL** |
| 166 | Tenant Admin & Core ERP Portal | Procurement Dashboard | `/procurement-dashboard` | 3 | AccessDenied, Link | **CRITICAL** |
| 167 | Tenant Admin & Core ERP Portal | Products | `/products` | 58 | Card, CardContent, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 168 | Tenant Admin & Core ERP Portal | Profile | `/profile` | 32 | Calendar, Button, Input, Label, Card | **CRITICAL** |
| 169 | Tenant Admin & Core ERP Portal | Project Dashboard | `/project-dashboard` | 3 | AccessDenied, Link | **CRITICAL** |
| 170 | Tenant Admin & Core ERP Portal | Project Report | `/project-report` | 25 | Card, CardContent, CardHeader, CardTitle, Button | **CRITICAL** |
| 171 | Tenant Admin & Core ERP Portal | Project $id | `/project/:id` | 57 | Link, Card, CardContent, CardHeader, CardTitle | **CRITICAL** |
| 172 | Tenant Admin & Core ERP Portal | Projects | `/projects` | 50 | Link, Card, CardHeader, CardTitle, CardContent | **CRITICAL** |
| 173 | Tenant Admin & Core ERP Portal | Promotions | `/promotions` | 34 | Card, Button, Input, Label, Textarea | **CRITICAL** |
| 174 | Tenant Admin & Core ERP Portal | Proposals | `/proposals` | 18 | Card, CardContent, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 175 | Tenant Admin & Core ERP Portal | Provident Fund | `/provident-fund` | 41 | Card, Button, Input, Label, Textarea | **CRITICAL** |
| 176 | Tenant Admin & Core ERP Portal | Purchases | `/purchases` | 42 | Link, Card, CardContent, CardHeader, Button | **CRITICAL** |
| 177 | Tenant Admin & Core ERP Portal | Razorpay Gateway | `/razorpay-gateway` | 24 | Card, CardHeader, CardTitle, CardDescription, Button | **CRITICAL** |
| 178 | Tenant Admin & Core ERP Portal | Recruitment Dashboard | `/recruitment-dashboard` | 1 | Link | **CRITICAL** |
| 179 | Tenant Admin & Core ERP Portal | Recruitment | `/recruitment` | 58 | Button, Input, Label, Textarea, Card | **CRITICAL** |
| 180 | Tenant Admin & Core ERP Portal | Recurring Invoices | `/recurring-invoices` | 41 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 181 | Tenant Admin & Core ERP Portal | Referrals | `/referrals` | 39 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 182 | Tenant Admin & Core ERP Portal | Resignation | `/resignation` | 37 | Button, Input, Label, Textarea, Badge | **CRITICAL** |
| 183 | Tenant Admin & Core ERP Portal | Returns | `/returns` | 41 | Card, CardContent, CardHeader, CardTitle, CardDescription | **CRITICAL** |
| 184 | Tenant Admin & Core ERP Portal | Route | `/_app` | 36 | Outlet, Link, DreamsSidebar, RealtimeNotificationDrawer, ThemeToggle | **CRITICAL** |
| 185 | Tenant Admin & Core ERP Portal | Sales Dashboard | `/sales-dashboard` | 10 | Link, Badge | **CRITICAL** |
| 186 | Tenant Admin & Core ERP Portal | Settings Custom Domain | `/settings/custom-domain` | 7 | Link, CustomDomainSettings, Button | **CRITICAL** |
| 187 | Tenant Admin & Core ERP Portal | Settings | `/settings` | 61 | WorkspaceAdminSettings, WorkspaceBrandingSettings, CompanyProfileSettings, Link, Outlet | **CRITICAL** |
| 188 | Tenant Admin & Core ERP Portal | Setup Notes | `/setup-notes` | 15 | Link, Card, CardContent, CardHeader, CardTitle | **CRITICAL** |
| 189 | Tenant Admin & Core ERP Portal | Shift Swap Requests | `/shift-swap-requests` | 38 | Link, Card, CardContent, CardHeader, CardTitle | **CRITICAL** |
| 190 | Tenant Admin & Core ERP Portal | Shifts | `/shifts` | 43 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 191 | Tenant Admin & Core ERP Portal | Shopify | `/shopify` | 41 | Button, Input, Label, Card, CardContent | **CRITICAL** |
| 192 | Tenant Admin & Core ERP Portal | Subscription | `/subscription` | 36 | Link, Card, CardContent, Button, Input | **CRITICAL** |
| 193 | Tenant Admin & Core ERP Portal | Suppliers | `/suppliers` | 33 | Card, CardContent, CardHeader, Button, Input | **CRITICAL** |
| 194 | Tenant Admin & Core ERP Portal | Support Dashboard | `/support-dashboard` | 3 | AccessDenied, Link | **CRITICAL** |
| 195 | Tenant Admin & Core ERP Portal | Support | `/support` | 34 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 196 | Tenant Admin & Core ERP Portal | System States | `/system-states` | 26 | EmptyState, NoSearchResults, LoadingState, ErrorState, SuccessState | **CRITICAL** |
| 197 | Tenant Admin & Core ERP Portal | Tally Importer | `/tally-importer` | 22 | Card, Button, Badge, Select, SelectContent | **CRITICAL** |
| 198 | Tenant Admin & Core ERP Portal | Task Board | `/task-board` | 37 | Card, Button, Input, Label, Textarea | **CRITICAL** |
| 199 | Tenant Admin & Core ERP Portal | Tasks | `/tasks` | 24 | Link, Card, CardContent, Button, Input | **CRITICAL** |
| 200 | Tenant Admin & Core ERP Portal | Taxes | `/taxes` | 30 | Link, Button, Input, Label, Badge | **CRITICAL** |
| 201 | Tenant Admin & Core ERP Portal | Termination | `/termination` | 37 | Button, Input, Label, Textarea, Badge | **CRITICAL** |
| 202 | Tenant Admin & Core ERP Portal | Ticket Reports | `/ticket-reports` | 26 | Card, CardContent, CardHeader, CardTitle, Button | **CRITICAL** |
| 203 | Tenant Admin & Core ERP Portal | Timesheets | `/timesheets` | 38 | Link, Button, Input, Label, Card | **CRITICAL** |
| 204 | Tenant Admin & Core ERP Portal | Todo | `/todo` | 27 | Button, Input, Label, Textarea, Card | **CRITICAL** |
| 205 | Tenant Admin & Core ERP Portal | Training | `/training` | 52 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 206 | Tenant Admin & Core ERP Portal | Transfers | `/transfers` | 39 | Card, CardContent, CardHeader, Button, Input | **CRITICAL** |
| 207 | Tenant Admin & Core ERP Portal | Users | `/users` | 22 | Card, CardContent, Button, Input, Badge | **CRITICAL** |
| 208 | Tenant Admin & Core ERP Portal | Warnings | `/warnings` | 44 | Link, Card, CardContent, CardHeader, CardTitle | **CRITICAL** |
| 209 | Tenant Admin & Core ERP Portal | Whatsapp Alerts | `/whatsapp-alerts` | 36 | Card, CardHeader, CardTitle, CardDescription, Button | **CRITICAL** |
| 210 | Tenant Admin & Core ERP Portal | Work From Home | `/work-from-home` | 37 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 211 | Tenant Admin & Core ERP Portal | Workflows | `/workflows` | 31 | Card, CardContent, Button, Input, Label | **CRITICAL** |
| 212 | Tenant Admin & Core ERP Portal | Workspace | `/workspace` | 14 | Link, Card, CardHeader, CardTitle, CardDescription | **CRITICAL** |

---

## 3. Page-by-Page Detailed UI Element Inventory

Below is the exhaustive inventory of all UI components discovered for each route across the application.

### PORTAL: SUPER ADMIN PORTAL (29 Pages)

#### Page: Agents (`/super/agents`)
- **Source File**: [`src/routes/_authenticated/super/agents.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/agents.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 10

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `ChevronDown` | Icon | `lucide-react` | Local | Library | Icon element for ChevronDown |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Headphones` | Icon | `lucide-react` | Local | Library | Icon element for Headphones |

#### Page: Analytics (`/super/analytics`)
- **Source File**: [`src/routes/_authenticated/super/analytics.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/analytics.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 30

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `BarChart3` | Icon | `lucide-react` | Local | Library | Visual trend / metric graph |
| `HardDrive` | Icon | `lucide-react` | Local | Library | Icon element for HardDrive |
| `Activity` | Icon | `lucide-react` | Local | Library | Icon element for Activity |
| `Server` | Icon | `lucide-react` | Local | Library | Icon element for Server |
| `Save` | Icon | `lucide-react` | Local | Library | Icon element for Save |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `ArrowUpRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowUpRight |
| `Database` | Icon | `lucide-react` | Local | Library | Tabbed sub-view switcher |
| `Cpu` | Icon | `lucide-react` | Local | Library | Icon element for Cpu |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |

#### Page: Api Docs (`/super/api-docs`)
- **Source File**: [`src/routes/_authenticated/super/api-docs.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/api-docs.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 33

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Code` | Icon | `lucide-react` | Local | Library | Icon element for Code |
| `Key` | Icon | `lucide-react` | Local | Library | Icon element for Key |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Terminal` | Icon | `lucide-react` | Local | Library | Icon element for Terminal |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Play` | Icon | `lucide-react` | Local | Library | Icon element for Play |
| `BookOpen` | Icon | `lucide-react` | Local | Library | Icon element for BookOpen |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Server` | Icon | `lucide-react` | Local | Library | Icon element for Server |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |

#### Page: Backup (`/super/backup`)
- **Source File**: [`src/routes/_authenticated/super/backup.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/backup.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 11

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Database` | Icon | `lucide-react` | Local | Library | Tabbed sub-view switcher |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `RotateCcw` | Icon | `lucide-react` | Local | Library | Icon element for RotateCcw |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `HardDrive` | Icon | `lucide-react` | Local | Library | Icon element for HardDrive |

#### Page: Blogs (`/super/blogs`)
- **Source File**: [`src/routes/_authenticated/super/blogs.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/blogs.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 33

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Switch` | Forms | `@/components/ui/switch` | Shared | Library | Forms element for Switch |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `BookOpen` | Icon | `lucide-react` | Local | Library | Icon element for BookOpen |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Edit` | Icon | `lucide-react` | Local | Library | Icon element for Edit |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Upload` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `User` | Icon | `lucide-react` | Local | Library | Icon element for User |
| `Tag` | Icon | `lucide-react` | Local | Library | Icon element for Tag |
| `FolderPlus` | Icon | `lucide-react` | Local | Library | Icon element for FolderPlus |

#### Page: Case Studies (`/super/case-studies`)
- **Source File**: [`src/routes/_authenticated/super/case-studies.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/case-studies.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 33

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Switch` | Forms | `@/components/ui/switch` | Shared | Library | Forms element for Switch |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Edit` | Icon | `lucide-react` | Local | Library | Icon element for Edit |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Upload` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `FolderPlus` | Icon | `lucide-react` | Local | Library | Icon element for FolderPlus |
| `Tag` | Icon | `lucide-react` | Local | Library | Icon element for Tag |

#### Page: Cms (`/super/cms`)
- **Source File**: [`src/routes/_authenticated/super/cms.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/cms.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 62

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Switch` | Forms | `@/components/ui/switch` | Shared | Library | Forms element for Switch |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `ScrollArea` | Data Display | `@/components/ui/scroll-area` | Shared | Library | Data Display element for ScrollArea |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Save` | Icon | `lucide-react` | Local | Library | Icon element for Save |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `HelpCircle` | Icon | `lucide-react` | Local | Library | Icon element for HelpCircle |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `Code` | Icon | `lucide-react` | Local | Library | Icon element for Code |
| `LayoutTemplate` | Icon | `lucide-react` | Local | Library | Icon element for LayoutTemplate |
| `Monitor` | Icon | `lucide-react` | Local | Library | Icon element for Monitor |
| `Tablet` | Icon | `lucide-react` | Local | Library | Data listing & columnar display |
| `Smartphone` | Icon | `lucide-react` | Local | Library | Icon element for Smartphone |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Sliders` | Icon | `lucide-react` | Local | Library | Icon element for Sliders |
| `Palette` | Icon | `lucide-react` | Local | Library | Icon element for Palette |
| `AlignLeft` | Icon | `lucide-react` | Local | Library | Icon element for AlignLeft |
| `Grid` | Icon | `lucide-react` | Local | Library | Icon element for Grid |
| `TableIcon` | Icon | `lucide-react` | Local | Library | Data listing & columnar display |
| `BookOpen` | Icon | `lucide-react` | Local | Library | Icon element for BookOpen |
| `Star` | Icon | `lucide-react` | Local | Library | Icon element for Star |
| `Award` | Icon | `lucide-react` | Local | Library | Icon element for Award |
| `ArrowUp` | Icon | `lucide-react` | Local | Library | Icon element for ArrowUp |
| `ArrowDown` | Icon | `lucide-react` | Local | Library | Icon element for ArrowDown |
| `Edit` | Icon | `lucide-react` | Local | Library | Icon element for Edit |
| `PageEditorForm` | Local Sub-Component | `src/routes/_authenticated/super/cms.tsx` | Local | Custom | Form data input field |
| `HeroSectionEditor` | Local Sub-Component | `src/routes/_authenticated/super/cms.tsx` | Local | Custom | Local Component element for HeroSectionEditor |
| `BlogCaseStudyEditor` | Local Sub-Component | `src/routes/_authenticated/super/cms.tsx` | Local | Custom | Local Component element for BlogCaseStudyEditor |
| `BodySectionEditor` | Local Sub-Component | `src/routes/_authenticated/super/cms.tsx` | Local | Custom | Local Component element for BodySectionEditor |
| `CardsSectionEditor` | Local Sub-Component | `src/routes/_authenticated/super/cms.tsx` | Local | Custom | Modular content container / card |
| `VendorSectionEditor` | Local Sub-Component | `src/routes/_authenticated/super/cms.tsx` | Local | Custom | Local Component element for VendorSectionEditor |
| `FooterSectionEditor` | Local Sub-Component | `src/routes/_authenticated/super/cms.tsx` | Local | Custom | Local Component element for FooterSectionEditor |
| `FooterPreview` | Local Sub-Component | `src/routes/_authenticated/super/cms.tsx` | Local | Custom | Local Component element for FooterPreview |
| `CreatePageDialog` | Local Sub-Component | `src/routes/_authenticated/super/cms.tsx` | Local | Custom | Modal dialog / popover overlay |
| `DeletePageDialog` | Local Sub-Component | `src/routes/_authenticated/super/cms.tsx` | Local | Custom | Modal dialog / popover overlay |
| `FaqManagerStudio` | Local Sub-Component | `src/routes/_authenticated/super/cms.tsx` | Local | Custom | Local Component element for FaqManagerStudio |
| `TestimonialsManagerStudio` | Local Sub-Component | `src/routes/_authenticated/super/cms.tsx` | Local | Custom | Local Component element for TestimonialsManagerStudio |

#### Page: Coupons (`/super/coupons`)
- **Source File**: [`src/routes/_authenticated/super/coupons.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/coupons.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 20

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Tag` | Icon | `lucide-react` | Local | Library | Icon element for Tag |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Percent` | Icon | `lucide-react` | Local | Library | Icon element for Percent |
| `IndianRupee` | Icon | `lucide-react` | Local | Library | Icon element for IndianRupee |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |

#### Page: Domains Documentation (`/super/domains/documentation`)
- **Source File**: [`src/routes/_authenticated/super/domains.documentation.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/domains.documentation.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 21

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `Server` | Icon | `lucide-react` | Local | Library | Icon element for Server |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |
| `HelpCircle` | Icon | `lucide-react` | Local | Library | Icon element for HelpCircle |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |

#### Page: Domains (`/super/domains`)
- **Source File**: [`src/routes/_authenticated/super/domains.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/domains.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 34

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Outlet` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Outlet |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Star` | Icon | `lucide-react` | Local | Library | Icon element for Star |
| `Server` | Icon | `lucide-react` | Local | Library | Icon element for Server |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `ShieldAlert` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Shield` | Icon | `lucide-react` | Local | Library | Icon element for Shield |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |
| `SlidersHorizontal` | Icon | `lucide-react` | Local | Library | Icon element for SlidersHorizontal |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |

#### Page: Email Templates (`/super/email-templates`)
- **Source File**: [`src/routes/_authenticated/super/email-templates.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/email-templates.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 22

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `Code` | Icon | `lucide-react` | Local | Library | Icon element for Code |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Save` | Icon | `lucide-react` | Local | Library | Icon element for Save |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |

#### Page: Escalation Rules (`/super/escalation-rules`)
- **Source File**: [`src/routes/_authenticated/super/escalation-rules.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/escalation-rules.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 10

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `ChevronDown` | Icon | `lucide-react` | Local | Library | Icon element for ChevronDown |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Bell` | Icon | `lucide-react` | Local | Library | Icon element for Bell |

#### Page: Super Home (`/super`)
- **Source File**: [`src/routes/_authenticated/super/index.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/index.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 16

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Suspense` | Business Component | `react` | Local | Custom | Business Component element for Suspense |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `SparklineBar` | Local Sub-Component | `src/routes/_authenticated/super/index.tsx` | Local | Custom | Local Component element for SparklineBar |

#### Page: Languages (`/super/languages`)
- **Source File**: [`src/routes/_authenticated/super/languages.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/languages.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 27

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `Save` | Icon | `lucide-react` | Local | Library | Icon element for Save |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Power` | Icon | `lucide-react` | Local | Library | Icon element for Power |
| `Languages` | Icon | `lucide-react` | Local | Library | Icon element for Languages |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |

#### Page: Marketplace (`/super/marketplace`)
- **Source File**: [`src/routes/_authenticated/super/marketplace.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/marketplace.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 36

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Pencil` | Icon | `lucide-react` | Local | Library | Icon element for Pencil |
| `Star` | Icon | `lucide-react` | Local | Library | Icon element for Star |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `LayoutGrid` | Icon | `lucide-react` | Local | Library | Icon element for LayoutGrid |
| `ListIcon` | Icon | `lucide-react` | Local | Library | Icon element for ListIcon |
| `Upload` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `ImageIcon` | Icon | `lucide-react` | Local | Library | Icon element for ImageIcon |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `Store` | Icon | `lucide-react` | Local | Library | Icon element for Store |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Tag` | Icon | `lucide-react` | Local | Library | Icon element for Tag |
| `Package` | Icon | `lucide-react` | Local | Library | Icon element for Package |
| `Field` | Local Sub-Component | `src/routes/_authenticated/super/marketplace.tsx` | Local | Custom | Local Component element for Field |

#### Page: Media (`/super/media`)
- **Source File**: [`src/routes/_authenticated/super/media.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/media.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 28

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Upload` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Folder` | Icon | `lucide-react` | Local | Library | Icon element for Folder |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `CheckCircle` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |

#### Page: Notifications (`/super/notifications`)
- **Source File**: [`src/routes/_authenticated/super/notifications.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/notifications.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 11

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Switch` | Forms | `@/components/ui/switch` | Shared | Library | Forms element for Switch |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Bell` | Icon | `lucide-react` | Local | Library | Icon element for Bell |
| `Save` | Icon | `lucide-react` | Local | Library | Icon element for Save |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |

#### Page: Plans (`/super/plans`)
- **Source File**: [`src/routes/_authenticated/super/plans.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/plans.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 35

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardFooter` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Switch` | Forms | `@/components/ui/switch` | Shared | Library | Forms element for Switch |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Pencil` | Icon | `lucide-react` | Local | Library | Icon element for Pencil |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `Flame` | Icon | `lucide-react` | Local | Library | Icon element for Flame |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Shield` | Icon | `lucide-react` | Local | Library | Icon element for Shield |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `Calculator` | Icon | `lucide-react` | Local | Library | Icon element for Calculator |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Tag` | Icon | `lucide-react` | Local | Library | Icon element for Tag |

#### Page: Profile (`/super/profile`)
- **Source File**: [`src/routes/_authenticated/super/profile.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/profile.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 31

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardFooter` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `AvatarImage` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarImage |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Slider` | Forms | `@/components/ui/slider` | Shared | Library | Forms element for Slider |
| `User` | Icon | `lucide-react` | Local | Library | Icon element for User |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Key` | Icon | `lucide-react` | Local | Library | Icon element for Key |
| `Upload` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Save` | Icon | `lucide-react` | Local | Library | Icon element for Save |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |
| `ImageIcon` | Icon | `lucide-react` | Local | Library | Icon element for ImageIcon |
| `Crop` | Icon | `lucide-react` | Local | Library | Icon element for Crop |
| `RotateCw` | Icon | `lucide-react` | Local | Library | Icon element for RotateCw |
| `ZoomIn` | Icon | `lucide-react` | Local | Library | Icon element for ZoomIn |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |

#### Page: Roles (`/super/roles`)
- **Source File**: [`src/routes/_authenticated/super/roles.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/roles.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 43

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Checkbox` | Forms | `@/components/ui/checkbox` | Shared | Library | Forms element for Checkbox |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `ShieldOff` | Icon | `lucide-react` | Local | Library | Icon element for ShieldOff |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |
| `UserPlus` | Icon | `lucide-react` | Local | Library | Icon element for UserPlus |
| `Shield` | Icon | `lucide-react` | Local | Library | Icon element for Shield |
| `Pencil` | Icon | `lucide-react` | Local | Library | Icon element for Pencil |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Sliders` | Icon | `lucide-react` | Local | Library | Icon element for Sliders |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `UserIcon` | Icon | `lucide-react` | Local | Library | Icon element for UserIcon |
| `AddUserDialog` | Local Sub-Component | `src/routes/_authenticated/super/roles.tsx` | Local | Custom | Modal dialog / popover overlay |

#### Page: Route (`/super/route`)
- **Source File**: [`src/routes/_authenticated/super/route.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/route.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 25

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Outlet` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Outlet |
| `Fragment` | Business Component | `react` | Local | Custom | Business Component element for Fragment |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `AvatarImage` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarImage |
| `ThemeToggle` | Layout | `@/components/theme-toggle` | Shared | Custom | Layout element for ThemeToggle |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuLabel` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuLabel |
| `DropdownMenuSeparator` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuSeparator |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `CommandDialog` | Layout | `@/components/ui/command` | Shared | Library | Modal dialog / popover overlay |
| `CommandEmpty` | Layout | `@/components/ui/command` | Shared | Library | Zero-data state illustration |
| `CommandGroup` | Layout | `@/components/ui/command` | Shared | Library | Layout element for CommandGroup |
| `CommandInput` | Layout | `@/components/ui/command` | Shared | Library | Form data input field |
| `CommandItem` | Layout | `@/components/ui/command` | Shared | Library | Layout element for CommandItem |
| `CommandList` | Layout | `@/components/ui/command` | Shared | Library | Layout element for CommandList |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `WorkspaceUnavailableView` | Business Component | `@/components/workspace-unavailable-view` | Shared | Custom | Business Component element for WorkspaceUnavailableView |
| `NotFoundView` | Feedback | `@/components/error-pages/not-found-view` | Shared | Custom | Feedback element for NotFoundView |
| `SuperLoginPage` | Business Component | `@/routes/super-login` | Local | Custom | Business Component element for SuperLoginPage |
| `SuperSidebar` | Local Sub-Component | `src/routes/_authenticated/super/route.tsx` | Local | Custom | Navigation sidebar structure |

#### Page: Settings (`/super/settings`)
- **Source File**: [`src/routes/_authenticated/super/settings.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/settings.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 54

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Switch` | Forms | `@/components/ui/switch` | Shared | Library | Forms element for Switch |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Save` | Icon | `lucide-react` | Local | Library | Icon element for Save |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `ImageIcon` | Icon | `lucide-react` | Local | Library | Icon element for ImageIcon |
| `Radio` | Icon | `lucide-react` | Local | Library | Icon element for Radio |
| `Palette` | Icon | `lucide-react` | Local | Library | Icon element for Palette |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `EyeOff` | Icon | `lucide-react` | Local | Library | Icon element for EyeOff |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |
| `Terminal` | Icon | `lucide-react` | Local | Library | Icon element for Terminal |
| `Coins` | Icon | `lucide-react` | Local | Library | Icon element for Coins |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Building` | Icon | `lucide-react` | Local | Library | Icon element for Building |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `MapPin` | Icon | `lucide-react` | Local | Library | Icon element for MapPin |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Languages` | Icon | `lucide-react` | Local | Library | Icon element for Languages |
| `RotateCcw` | Icon | `lucide-react` | Local | Library | Icon element for RotateCcw |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `MaintenanceMarqueeBanner` | Business Component | `@/components/maintenance-marquee-banner` | Shared | Custom | Business Component element for MaintenanceMarqueeBanner |
| `MediaImageUploader` | Business Component | `@/components/settings/media-image-uploader` | Shared | Custom | Asynchronous loading placeholder |
| `LivePreviewDock` | Business Component | `@/components/settings/live-preview-dock` | Shared | Custom | Business Component element for LivePreviewDock |
| `UnsavedChangesBar` | Business Component | `@/components/settings/unsaved-changes-bar` | Shared | Custom | Business Component element for UnsavedChangesBar |
| `SettingsNestedNav` | Business Component | `@/components/settings/settings-nested-nav` | Shared | Custom | Business Component element for SettingsNestedNav |
| `SettingsSectionBreadcrumb` | Business Component | `@/components/settings/settings-nested-nav` | Shared | Custom | Hierarchical breadcrumb path |

#### Page: Sla Policies (`/super/sla-policies`)
- **Source File**: [`src/routes/_authenticated/super/sla-policies.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/sla-policies.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 10

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `ChevronDown` | Icon | `lucide-react` | Local | Library | Icon element for ChevronDown |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |

#### Page: Support (`/super/support`)
- **Source File**: [`src/routes/_authenticated/super/support.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/support.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 32

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `LifeBuoy` | Icon | `lucide-react` | Local | Library | Icon element for LifeBuoy |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MessageSquare` | Icon | `lucide-react` | Local | Library | Icon element for MessageSquare |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |

#### Page: Tenant Support Tickets (`/super/tenant-support-tickets`)
- **Source File**: [`src/routes/_authenticated/super/tenant-support-tickets.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/tenant-support-tickets.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 12

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Ticket` | Icon | `lucide-react` | Local | Library | Icon element for Ticket |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `ChevronDown` | Icon | `lucide-react` | Local | Library | Icon element for ChevronDown |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `ArrowUpRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowUpRight |

#### Page: Tenant Usage Metrics (`/super/tenant-usage-metrics`)
- **Source File**: [`src/routes/_authenticated/super/tenant-usage-metrics.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/tenant-usage-metrics.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 25

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `ChevronDown` | Icon | `lucide-react` | Local | Library | Icon element for ChevronDown |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `HardDrive` | Icon | `lucide-react` | Local | Library | Icon element for HardDrive |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Bell` | Icon | `lucide-react` | Local | Library | Icon element for Bell |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `LayoutList` | Icon | `lucide-react` | Local | Library | Icon element for LayoutList |
| `LayoutGrid` | Icon | `lucide-react` | Local | Library | Icon element for LayoutGrid |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `Database` | Icon | `lucide-react` | Local | Library | Tabbed sub-view switcher |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `ImageIcon` | Icon | `lucide-react` | Local | Library | Icon element for ImageIcon |
| `Video` | Icon | `lucide-react` | Local | Library | Icon element for Video |
| `Music` | Icon | `lucide-react` | Local | Library | Icon element for Music |
| `FileCode` | Icon | `lucide-react` | Local | Library | Icon element for FileCode |
| `CompanyAvatar` | Local Sub-Component | `src/routes/_authenticated/super/tenant-usage-metrics.tsx` | Local | Custom | Local Component element for CompanyAvatar |

#### Page: Tenants (`/super/tenants`)
- **Source File**: [`src/routes/_authenticated/super/tenants.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/tenants.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 49

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `WorkspacePolicyDialog` | Business Component | `@/components/workspace-policy-dialog` | Shared | Custom | Modal dialog / popover overlay |
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Sheet` | Feedback | `@/components/ui/sheet` | Shared | Library | Slide-out drawer panel |
| `SheetContent` | Feedback | `@/components/ui/sheet` | Shared | Library | Slide-out drawer panel |
| `SheetHeader` | Feedback | `@/components/ui/sheet` | Shared | Library | Page or top navigation header |
| `SheetTitle` | Feedback | `@/components/ui/sheet` | Shared | Library | Slide-out drawer panel |
| `SheetDescription` | Feedback | `@/components/ui/sheet` | Shared | Library | Slide-out drawer panel |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Skeleton` | Feedback | `@/components/ui/skeleton` | Shared | Library | Asynchronous loading placeholder |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuSeparator` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuSeparator |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit` | Icon | `lucide-react` | Local | Library | Icon element for Edit |
| `LogIn` | Icon | `lucide-react` | Local | Library | Icon element for LogIn |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `LayoutList` | Icon | `lucide-react` | Local | Library | Icon element for LayoutList |
| `LayoutGrid` | Icon | `lucide-react` | Local | Library | Icon element for LayoutGrid |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `UserCheck` | Icon | `lucide-react` | Local | Library | Icon element for UserCheck |
| `KeyRound` | Icon | `lucide-react` | Local | Library | Icon element for KeyRound |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `Info` | Icon | `lucide-react` | Local | Library | Icon element for Info |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Sliders` | Icon | `lucide-react` | Local | Library | Icon element for Sliders |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `MiniSparkline` | Local Sub-Component | `src/routes/_authenticated/super/tenants.tsx` | Local | Custom | Local Component element for MiniSparkline |
| `CompanyAvatar` | Local Sub-Component | `src/routes/_authenticated/super/tenants.tsx` | Local | Custom | Local Component element for CompanyAvatar |

#### Page: Transactions (`/super/transactions`)
- **Source File**: [`src/routes/_authenticated/super/transactions.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/transactions.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 34

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Popover` | Feedback | `@/components/ui/popover` | Shared | Library | Feedback element for Popover |
| `PopoverContent` | Feedback | `@/components/ui/popover` | Shared | Library | Feedback element for PopoverContent |
| `PopoverTrigger` | Feedback | `@/components/ui/popover` | Shared | Library | Feedback element for PopoverTrigger |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `CalendarIcon` | Icon | `lucide-react` | Local | Library | Icon element for CalendarIcon |
| `ChevronDown` | Icon | `lucide-react` | Local | Library | Icon element for ChevronDown |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `ShieldAlert` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `FileCheck` | Icon | `lucide-react` | Local | Library | Icon element for FileCheck |
| `PaymentProviderBadge` | Business Component | `@/components/payment-provider-badge` | Shared | Custom | Status or categorization pill |

#### Page: Users (`/super/users`)
- **Source File**: [`src/routes/_authenticated/super/users.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/super/users.tsx)
- **Layout**: SuperAdminLayout
- **Complexity**: **CRITICAL** | **Components Used**: 40

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `AvatarImage` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarImage |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Key` | Icon | `lucide-react` | Local | Library | Icon element for Key |
| `Edit` | Icon | `lucide-react` | Local | Library | Icon element for Edit |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `ShieldAlert` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `LayoutGrid` | Icon | `lucide-react` | Local | Library | Icon element for LayoutGrid |
| `List` | Icon | `lucide-react` | Local | Library | Icon element for List |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `History` | Icon | `lucide-react` | Local | Library | Icon element for History |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Laptop` | Icon | `lucide-react` | Local | Library | Icon element for Laptop |

### PORTAL: TENANT ADMIN & CORE ERP PORTAL (136 Pages)

#### Page: Accounting (`/accounting`)
- **Source File**: [`src/routes/_authenticated/_app/accounting.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/accounting.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 50

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `ChartOfAccountsTable` | Business Component | `@/components/accounting/chart-of-accounts-table` | Shared | Custom | Data listing & columnar display |
| `BankAccountsManager` | Business Component | `@/components/accounting/bank-accounts-manager` | Shared | Custom | Business Component element for BankAccountsManager |
| `FinancialStatementsView` | Business Component | `@/components/accounting/financial-statements-view` | Shared | Custom | Key KPI / quantitative metric card |
| `Landmark` | Icon | `lucide-react` | Local | Library | Icon element for Landmark |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Scale` | Icon | `lucide-react` | Local | Library | Icon element for Scale |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `TrendingDown` | Icon | `lucide-react` | Local | Library | Icon element for TrendingDown |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `ArrowRightLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRightLeft |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `BarChart3` | Icon | `lucide-react` | Local | Library | Visual trend / metric graph |
| `Percent` | Icon | `lucide-react` | Local | Library | Icon element for Percent |
| `ArrowUpRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowUpRight |
| `ArrowDownRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowDownRight |
| `Boxes` | Icon | `lucide-react` | Local | Library | Icon element for Boxes |
| `FileDown` | Icon | `lucide-react` | Local | Library | Icon element for FileDown |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |

#### Page: Adjustments (`/adjustments`)
- **Source File**: [`src/routes/_authenticated/_app/adjustments.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/adjustments.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 36

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `SlidersHorizontal` | Icon | `lucide-react` | Local | Library | Icon element for SlidersHorizontal |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `ArrowUpRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowUpRight |
| `ArrowDownRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowDownRight |
| `WarehouseIcon` | Icon | `lucide-react` | Local | Library | Icon element for WarehouseIcon |
| `Package` | Icon | `lucide-react` | Local | Library | Icon element for Package |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Boxes` | Icon | `lucide-react` | Local | Library | Icon element for Boxes |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |

#### Page: Ai Attendance Insights (`/ai-attendance-insights`)
- **Source File**: [`src/routes/_authenticated/_app/ai-attendance-insights.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/ai-attendance-insights.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 3

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Suspense` | Business Component | `react` | Local | Custom | Business Component element for Suspense |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |

#### Page: Ai Configuration (`/ai-configuration`)
- **Source File**: [`src/routes/_authenticated/_app/ai-configuration.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/ai-configuration.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 1

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |

#### Page: Ai Hiring Forecast (`/ai-hiring-forecast`)
- **Source File**: [`src/routes/_authenticated/_app/ai-hiring-forecast.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/ai-hiring-forecast.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 30

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `Repeat` | Icon | `lucide-react` | Local | Library | Icon element for Repeat |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `AlertOctagon` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `FileSearch` | Icon | `lucide-react` | Local | Library | Icon element for FileSearch |
| `ArrowUpRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowUpRight |
| `ArrowDownRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowDownRight |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `Lightbulb` | Icon | `lucide-react` | Local | Library | Icon element for Lightbulb |

#### Page: Ai Ocr (`/ai-ocr`)
- **Source File**: [`src/routes/_authenticated/_app/ai-ocr.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/ai-ocr.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 17

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |
| `ScanLine` | Icon | `lucide-react` | Local | Library | Icon element for ScanLine |
| `Upload` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `History` | Icon | `lucide-react` | Local | Library | Icon element for History |
| `Save` | Icon | `lucide-react` | Local | Library | Icon element for Save |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |

#### Page: Ai Payroll Forecast (`/ai-payroll-forecast`)
- **Source File**: [`src/routes/_authenticated/_app/ai-payroll-forecast.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/ai-payroll-forecast.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 3

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Suspense` | Business Component | `react` | Local | Custom | Business Component element for Suspense |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |

#### Page: Ai Settings (`/ai-settings`)
- **Source File**: [`src/routes/_authenticated/_app/ai-settings.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/ai-settings.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 1

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |

#### Page: Ai Team Performance Insights (`/ai-team-performance-insights`)
- **Source File**: [`src/routes/_authenticated/_app/ai-team-performance-insights.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/ai-team-performance-insights.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 3

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Suspense` | Business Component | `react` | Local | Custom | Business Component element for Suspense |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |

#### Page: Ai Writer (`/ai-writer`)
- **Source File**: [`src/routes/_authenticated/_app/ai-writer.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/ai-writer.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 30

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `Settings` | Icon | `lucide-react` | Local | Library | Icon element for Settings |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Key` | Icon | `lucide-react` | Local | Library | Icon element for Key |
| `Bot` | Icon | `lucide-react` | Local | Library | Icon element for Bot |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |

#### Page: Ai (`/ai`)
- **Source File**: [`src/routes/_authenticated/_app/ai.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/ai.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 43

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `BrainCircuit` | Icon | `lucide-react` | Local | Library | Icon element for BrainCircuit |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `UserCheck` | Icon | `lucide-react` | Local | Library | Icon element for UserCheck |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |
| `Sliders` | Icon | `lucide-react` | Local | Library | Icon element for Sliders |
| `Save` | Icon | `lucide-react` | Local | Library | Icon element for Save |
| `ArrowUpRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowUpRight |
| `ArrowDownRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowDownRight |
| `Target` | Icon | `lucide-react` | Local | Library | Icon element for Target |
| `Flame` | Icon | `lucide-react` | Local | Library | Icon element for Flame |
| `Activity` | Icon | `lucide-react` | Local | Library | Icon element for Activity |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Slider` | Forms | `@/components/ui/slider` | Shared | Library | Forms element for Slider |
| `Switch` | Forms | `@/components/ui/switch` | Shared | Library | Forms element for Switch |

#### Page: Analytics (`/analytics`)
- **Source File**: [`src/routes/_authenticated/_app/analytics.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/analytics.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 43

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `AccessDenied` | Business Component | `@/components/access-denied` | Shared | Custom | Business Component element for AccessDenied |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `CalendarCheck` | Icon | `lucide-react` | Local | Library | Icon element for CalendarCheck |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Filter` | Icon | `lucide-react` | Local | Library | Icon element for Filter |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `ArrowUpRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowUpRight |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |

#### Page: Announcements (`/announcements`)
- **Source File**: [`src/routes/_authenticated/_app/announcements.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/announcements.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 42

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Switch` | Forms | `@/components/ui/switch` | Shared | Library | Forms element for Switch |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Megaphone` | Icon | `lucide-react` | Local | Library | Icon element for Megaphone |
| `Pin` | Icon | `lucide-react` | Local | Library | Icon element for Pin |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Pencil` | Icon | `lucide-react` | Local | Library | Icon element for Pencil |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `ShieldAlert` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `FileCheck2` | Icon | `lucide-react` | Local | Library | Icon element for FileCheck2 |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |

#### Page: Asset Dashboard (`/asset-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/asset-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/asset-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 6

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Suspense` | Business Component | `react` | Local | Custom | Business Component element for Suspense |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |

#### Page: Assets (`/assets`)
- **Source File**: [`src/routes/_authenticated/_app/assets.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/assets.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 36

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `HardDrive` | Icon | `lucide-react` | Local | Library | Icon element for HardDrive |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `UserCheck` | Icon | `lucide-react` | Local | Library | Icon element for UserCheck |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Package` | Icon | `lucide-react` | Local | Library | Icon element for Package |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `Boxes` | Icon | `lucide-react` | Local | Library | Icon element for Boxes |
| `FolderPlus` | Icon | `lucide-react` | Local | Library | Icon element for FolderPlus |
| `QrCode` | Icon | `lucide-react` | Local | Library | Icon element for QrCode |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |

#### Page: Attendance Employee (`/attendance-employee`)
- **Source File**: [`src/routes/_authenticated/_app/attendance-employee.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/attendance-employee.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 34

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `CalendarDays` | Icon | `lucide-react` | Local | Library | Icon element for CalendarDays |
| `Fingerprint` | Icon | `lucide-react` | Local | Library | Icon element for Fingerprint |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |

#### Page: Attendance Report (`/attendance-report`)
- **Source File**: [`src/routes/_authenticated/_app/attendance-report.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/attendance-report.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 30

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `AvatarImage` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarImage |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Progress` | Feedback | `@/components/ui/progress` | Shared | Library | Feedback element for Progress |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |

#### Page: Attendance (`/attendance`)
- **Source File**: [`src/routes/_authenticated/_app/attendance.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/attendance.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 55

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `LogIn` | Icon | `lucide-react` | Local | Library | Icon element for LogIn |
| `LogOut` | Icon | `lucide-react` | Local | Library | Icon element for LogOut |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Fingerprint` | Icon | `lucide-react` | Local | Library | Icon element for Fingerprint |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `LayoutGrid` | Icon | `lucide-react` | Local | Library | Icon element for LayoutGrid |
| `List` | Icon | `lucide-react` | Local | Library | Icon element for List |
| `AlarmClock` | Icon | `lucide-react` | Local | Library | Icon element for AlarmClock |
| `FileEdit` | Icon | `lucide-react` | Local | Library | Icon element for FileEdit |
| `MapPin` | Icon | `lucide-react` | Local | Library | Icon element for MapPin |
| `Compass` | Icon | `lucide-react` | Local | Library | Icon element for Compass |
| `Cpu` | Icon | `lucide-react` | Local | Library | Icon element for Cpu |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `HardDrive` | Icon | `lucide-react` | Local | Library | Icon element for HardDrive |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `Settings2` | Icon | `lucide-react` | Local | Library | Icon element for Settings2 |
| `Sliders` | Icon | `lucide-react` | Local | Library | Icon element for Sliders |
| `Brain` | Icon | `lucide-react` | Local | Library | Icon element for Brain |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `Activity` | Icon | `lucide-react` | Local | Library | Icon element for Activity |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |
| `Flame` | Icon | `lucide-react` | Local | Library | Icon element for Flame |

#### Page: Awards (`/awards`)
- **Source File**: [`src/routes/_authenticated/_app/awards.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/awards.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 45

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Trophy` | Icon | `lucide-react` | Local | Library | Icon element for Trophy |
| `Award` | Icon | `lucide-react` | Local | Library | Icon element for Award |
| `Medal` | Icon | `lucide-react` | Local | Library | Icon element for Medal |
| `Gift` | Icon | `lucide-react` | Local | Library | Icon element for Gift |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `LayoutGrid` | Icon | `lucide-react` | Local | Library | Icon element for LayoutGrid |
| `List` | Icon | `lucide-react` | Local | Library | Icon element for List |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |

#### Page: Ban Ip Address (`/ban-ip-address`)
- **Source File**: [`src/routes/_authenticated/_app/ban-ip-address.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/ban-ip-address.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 31

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `ShieldAlert` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `ShieldX` | Icon | `lucide-react` | Local | Library | Icon element for ShieldX |
| `Info` | Icon | `lucide-react` | Local | Library | Icon element for Info |
| `LayoutGrid` | Icon | `lucide-react` | Local | Library | Icon element for LayoutGrid |
| `List` | Icon | `lucide-react` | Local | Library | Icon element for List |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `AccessDenied` | Business Component | `@/components/access-denied` | Shared | Custom | Business Component element for AccessDenied |

#### Page: Biometric Sync (`/biometric-sync`)
- **Source File**: [`src/routes/_authenticated/_app/biometric-sync.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/biometric-sync.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 48

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Progress` | Feedback | `@/components/ui/progress` | Shared | Library | Feedback element for Progress |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |
| `Fingerprint` | Icon | `lucide-react` | Local | Library | Icon element for Fingerprint |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Wifi` | Icon | `lucide-react` | Local | Library | Icon element for Wifi |
| `WifiOff` | Icon | `lucide-react` | Local | Library | Icon element for WifiOff |
| `Server` | Icon | `lucide-react` | Local | Library | Icon element for Server |
| `Activity` | Icon | `lucide-react` | Local | Library | Icon element for Activity |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `UserCheck` | Icon | `lucide-react` | Local | Library | Icon element for UserCheck |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `ArrowUpRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowUpRight |
| `ArrowDownRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowDownRight |
| `Database` | Icon | `lucide-react` | Local | Library | Tabbed sub-view switcher |
| `Upload` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Radio` | Icon | `lucide-react` | Local | Library | Icon element for Radio |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `Laptop` | Icon | `lucide-react` | Local | Library | Icon element for Laptop |
| `UserPlus` | Icon | `lucide-react` | Local | Library | Icon element for UserPlus |
| `UserX` | Icon | `lucide-react` | Local | Library | Icon element for UserX |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |

#### Page: Biometric (`/biometric`)
- **Source File**: [`src/routes/_authenticated/_app/biometric.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/biometric.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 59

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Switch` | Forms | `@/components/ui/switch` | Shared | Library | Forms element for Switch |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Cpu` | Icon | `lucide-react` | Local | Library | Icon element for Cpu |
| `Fingerprint` | Icon | `lucide-react` | Local | Library | Icon element for Fingerprint |
| `ScanFace` | Icon | `lucide-react` | Local | Library | Icon element for ScanFace |
| `Radio` | Icon | `lucide-react` | Local | Library | Icon element for Radio |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |
| `Activity` | Icon | `lucide-react` | Local | Library | Icon element for Activity |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Key` | Icon | `lucide-react` | Local | Library | Icon element for Key |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `Wifi` | Icon | `lucide-react` | Local | Library | Icon element for Wifi |
| `WifiOff` | Icon | `lucide-react` | Local | Library | Icon element for WifiOff |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `Network` | Icon | `lucide-react` | Local | Library | Icon element for Network |
| `Radar` | Icon | `lucide-react` | Local | Library | Icon element for Radar |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Database` | Icon | `lucide-react` | Local | Library | Tabbed sub-view switcher |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `HardDrive` | Icon | `lucide-react` | Local | Library | Icon element for HardDrive |
| `SlidersHorizontal` | Icon | `lucide-react` | Local | Library | Icon element for SlidersHorizontal |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `UserPlus` | Icon | `lucide-react` | Local | Library | Icon element for UserPlus |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `Pencil` | Icon | `lucide-react` | Local | Library | Icon element for Pencil |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |

#### Page: Budgets (`/budgets`)
- **Source File**: [`src/routes/_authenticated/_app/budgets.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/budgets.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 38

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit` | Icon | `lucide-react` | Local | Library | Icon element for Edit |
| `PiggyBank` | Icon | `lucide-react` | Local | Library | Icon element for PiggyBank |
| `TrendingDown` | Icon | `lucide-react` | Local | Library | Icon element for TrendingDown |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `PieChart` | Icon | `lucide-react` | Local | Library | Visual trend / metric graph |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |

#### Page: Calendar (`/calendar`)
- **Source File**: [`src/routes/_authenticated/_app/calendar.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/calendar.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 27

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `CalendarIcon` | Icon | `lucide-react` | Local | Library | Icon element for CalendarIcon |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `ChevronLeft` | Icon | `lucide-react` | Local | Library | Icon element for ChevronLeft |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `MapPin` | Icon | `lucide-react` | Local | Library | Icon element for MapPin |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `CalendarCheck` | Icon | `lucide-react` | Local | Library | Icon element for CalendarCheck |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |

#### Page: Call History (`/call-history`)
- **Source File**: [`src/routes/_authenticated/_app/call-history.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/call-history.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 35

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Phone` | Icon | `lucide-react` | Local | Library | Icon element for Phone |
| `PhoneIncoming` | Icon | `lucide-react` | Local | Library | Icon element for PhoneIncoming |
| `PhoneOutgoing` | Icon | `lucide-react` | Local | Library | Icon element for PhoneOutgoing |
| `PhoneMissed` | Icon | `lucide-react` | Local | Library | Icon element for PhoneMissed |
| `Video` | Icon | `lucide-react` | Local | Library | Icon element for Video |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MessageSquare` | Icon | `lucide-react` | Local | Library | Icon element for MessageSquare |
| `RotateCw` | Icon | `lucide-react` | Local | Library | Icon element for RotateCw |
| `Home` | Icon | `lucide-react` | Local | Library | Icon element for Home |
| `User` | Icon | `lucide-react` | Local | Library | Icon element for User |

#### Page: Campaigns (`/campaigns`)
- **Source File**: [`src/routes/_authenticated/_app/campaigns.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/campaigns.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 31

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Pencil` | Icon | `lucide-react` | Local | Library | Icon element for Pencil |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `RotateCcw` | Icon | `lucide-react` | Local | Library | Icon element for RotateCcw |
| `Archive` | Icon | `lucide-react` | Local | Library | Icon element for Archive |
| `Megaphone` | Icon | `lucide-react` | Local | Library | Icon element for Megaphone |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |

#### Page: Campus Hiring (`/campus-hiring`)
- **Source File**: [`src/routes/_authenticated/_app/campus-hiring.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/campus-hiring.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 38

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `GraduationCap` | Icon | `lucide-react` | Local | Library | Icon element for GraduationCap |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `ChevronDown` | Icon | `lucide-react` | Local | Library | Icon element for ChevronDown |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |

#### Page: Certification Tracking (`/certification-tracking`)
- **Source File**: [`src/routes/_authenticated/_app/certification-tracking.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/certification-tracking.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 39

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Award` | Icon | `lucide-react` | Local | Library | Icon element for Award |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `ChevronDown` | Icon | `lucide-react` | Local | Library | Icon element for ChevronDown |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |

#### Page: Chat (`/chat`)
- **Source File**: [`src/routes/_authenticated/_app/chat.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/chat.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 67

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `AvatarImage` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarImage |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Checkbox` | Forms | `@/components/ui/checkbox` | Shared | Library | Forms element for Checkbox |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Switch` | Forms | `@/components/ui/switch` | Shared | Library | Forms element for Switch |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuSeparator` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuSeparator |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |
| `MessageSquare` | Icon | `lucide-react` | Local | Library | Icon element for MessageSquare |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Paperclip` | Icon | `lucide-react` | Local | Library | Icon element for Paperclip |
| `ImageIcon` | Icon | `lucide-react` | Local | Library | Icon element for ImageIcon |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `CheckCheck` | Icon | `lucide-react` | Local | Library | Icon element for CheckCheck |
| `Shield` | Icon | `lucide-react` | Local | Library | Icon element for Shield |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `Mic` | Icon | `lucide-react` | Local | Library | Icon element for Mic |
| `Volume2` | Icon | `lucide-react` | Local | Library | Icon element for Volume2 |
| `FolderPlus` | Icon | `lucide-react` | Local | Library | Icon element for FolderPlus |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `UserPlus` | Icon | `lucide-react` | Local | Library | Icon element for UserPlus |
| `UserMinus` | Icon | `lucide-react` | Local | Library | Icon element for UserMinus |
| `LogOut` | Icon | `lucide-react` | Local | Library | Icon element for LogOut |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Phone` | Icon | `lucide-react` | Local | Library | Icon element for Phone |
| `PhoneCall` | Icon | `lucide-react` | Local | Library | Icon element for PhoneCall |
| `PhoneIncoming` | Icon | `lucide-react` | Local | Library | Icon element for PhoneIncoming |
| `PhoneOutgoing` | Icon | `lucide-react` | Local | Library | Icon element for PhoneOutgoing |
| `PhoneMissed` | Icon | `lucide-react` | Local | Library | Icon element for PhoneMissed |
| `PhoneOff` | Icon | `lucide-react` | Local | Library | Icon element for PhoneOff |
| `Video` | Icon | `lucide-react` | Local | Library | Icon element for Video |
| `VideoOff` | Icon | `lucide-react` | Local | Library | Icon element for VideoOff |
| `MicOff` | Icon | `lucide-react` | Local | Library | Icon element for MicOff |
| `VolumeX` | Icon | `lucide-react` | Local | Library | Icon element for VolumeX |
| `MonitorUp` | Icon | `lucide-react` | Local | Library | Icon element for MonitorUp |
| `Maximize2` | Icon | `lucide-react` | Local | Library | Icon element for Maximize2 |
| `Minimize2` | Icon | `lucide-react` | Local | Library | Icon element for Minimize2 |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Disc` | Icon | `lucide-react` | Local | Library | Icon element for Disc |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `Building` | Icon | `lucide-react` | Local | Library | Icon element for Building |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `IdCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `UserCheck` | Icon | `lucide-react` | Local | Library | Icon element for UserCheck |
| `FileCheck` | Icon | `lucide-react` | Local | Library | Icon element for FileCheck |

#### Page: Clear Cache (`/clear-cache`)
- **Source File**: [`src/routes/_authenticated/_app/clear-cache.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/clear-cache.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 20

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Database` | Icon | `lucide-react` | Local | Library | Tabbed sub-view switcher |
| `HardDrive` | Icon | `lucide-react` | Local | Library | Icon element for HardDrive |
| `Cpu` | Icon | `lucide-react` | Local | Library | Icon element for Cpu |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Info` | Icon | `lucide-react` | Local | Library | Icon element for Info |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `Server` | Icon | `lucide-react` | Local | Library | Icon element for Server |

#### Page: Client Dashboard (`/client-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/client-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/client-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 37

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `LifeBuoy` | Icon | `lucide-react` | Local | Library | Icon element for LifeBuoy |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `Phone` | Icon | `lucide-react` | Local | Library | Icon element for Phone |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |

#### Page: Clients (`/clients`)
- **Source File**: [`src/routes/_authenticated/_app/clients.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/clients.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 36

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit` | Icon | `lucide-react` | Local | Library | Icon element for Edit |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `LayoutGrid` | Icon | `lucide-react` | Local | Library | Icon element for LayoutGrid |
| `List` | Icon | `lucide-react` | Local | Library | Icon element for List |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `Phone` | Icon | `lucide-react` | Local | Library | Icon element for Phone |
| `MapPin` | Icon | `lucide-react` | Local | Library | Icon element for MapPin |
| `Receipt` | Icon | `lucide-react` | Local | Library | Icon element for Receipt |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |

#### Page: Companies (`/companies`)
- **Source File**: [`src/routes/_authenticated/_app/companies.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/companies.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 41

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit` | Icon | `lucide-react` | Local | Library | Icon element for Edit |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `MapPin` | Icon | `lucide-react` | Local | Library | Icon element for MapPin |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `LayoutGrid` | Icon | `lucide-react` | Local | Library | Icon element for LayoutGrid |
| `List` | Icon | `lucide-react` | Local | Library | Icon element for List |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |

#### Page: Contacts (`/contacts`)
- **Source File**: [`src/routes/_authenticated/_app/contacts.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/contacts.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 53

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `LayoutGrid` | Icon | `lucide-react` | Local | Library | Icon element for LayoutGrid |
| `List` | Icon | `lucide-react` | Local | Library | Icon element for List |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `Phone` | Icon | `lucide-react` | Local | Library | Icon element for Phone |
| `Star` | Icon | `lucide-react` | Local | Library | Icon element for Star |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `User` | Icon | `lucide-react` | Local | Library | Icon element for User |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `MessageSquare` | Icon | `lucide-react` | Local | Library | Icon element for MessageSquare |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |

#### Page: Crm Dashboard (`/crm-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/crm-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/crm-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 3

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `AccessDenied` | Business Component | `@/components/access-denied` | Shared | Custom | Business Component element for AccessDenied |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |

#### Page: Crm (`/crm`)
- **Source File**: [`src/routes/_authenticated/_app/crm.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/crm.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 46

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |
| `Target` | Icon | `lucide-react` | Local | Library | Icon element for Target |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Kanban` | Icon | `lucide-react` | Local | Library | Icon element for Kanban |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `Star` | Icon | `lucide-react` | Local | Library | Icon element for Star |
| `Phone` | Icon | `lucide-react` | Local | Library | Icon element for Phone |
| `MapPin` | Icon | `lucide-react` | Local | Library | Icon element for MapPin |

#### Page: Cronjob (`/cronjob`)
- **Source File**: [`src/routes/_authenticated/_app/cronjob.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/cronjob.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 41

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Play` | Icon | `lucide-react` | Local | Library | Icon element for Play |
| `Pause` | Icon | `lucide-react` | Local | Library | Icon element for Pause |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `RotateCw` | Icon | `lucide-react` | Local | Library | Icon element for RotateCw |
| `Sliders` | Icon | `lucide-react` | Local | Library | Icon element for Sliders |
| `ShieldAlert` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `HardDrive` | Icon | `lucide-react` | Local | Library | Icon element for HardDrive |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Database` | Icon | `lucide-react` | Local | Library | Tabbed sub-view switcher |
| `Code2` | Icon | `lucide-react` | Local | Library | Icon element for Code2 |
| `AccessDenied` | Business Component | `@/components/access-denied` | Shared | Custom | Business Component element for AccessDenied |

#### Page: Currencies (`/currencies`)
- **Source File**: [`src/routes/_authenticated/_app/currencies.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/currencies.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 35

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit` | Icon | `lucide-react` | Local | Library | Icon element for Edit |
| `Coins` | Icon | `lucide-react` | Local | Library | Icon element for Coins |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `Star` | Icon | `lucide-react` | Local | Library | Icon element for Star |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |

#### Page: Custom Fields (`/custom-fields`)
- **Source File**: [`src/routes/_authenticated/_app/custom-fields.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/custom-fields.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 28

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Edit` | Icon | `lucide-react` | Local | Library | Icon element for Edit |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `Settings` | Icon | `lucide-react` | Local | Library | Icon element for Settings |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `Server` | Icon | `lucide-react` | Local | Library | Icon element for Server |
| `CircleDollarSign` | Icon | `lucide-react` | Local | Library | Icon element for CircleDollarSign |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |

#### Page: Daily Report (`/daily-report`)
- **Source File**: [`src/routes/_authenticated/_app/daily-report.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/daily-report.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 30

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `UserCheck` | Icon | `lucide-react` | Local | Library | Icon element for UserCheck |
| `UserX` | Icon | `lucide-react` | Local | Library | Icon element for UserX |
| `CheckSquare` | Icon | `lucide-react` | Local | Library | Icon element for CheckSquare |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `RotateCw` | Icon | `lucide-react` | Local | Library | Icon element for RotateCw |
| `Home` | Icon | `lucide-react` | Local | Library | Icon element for Home |
| `BarChart3` | Icon | `lucide-react` | Local | Library | Visual trend / metric graph |

#### Page: Dashboard (`/dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 0

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| StandardContainer | Layout | Native DOM | Local | Custom | Page container view |

#### Page: Deals Dashboard (`/deals-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/deals-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/deals-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 6

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Suspense` | Business Component | `react` | Local | Custom | Business Component element for Suspense |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |

#### Page: Departments (`/departments`)
- **Source File**: [`src/routes/_authenticated/_app/departments.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/departments.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 35

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Checkbox` | Forms | `@/components/ui/checkbox` | Shared | Library | Forms element for Checkbox |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `FolderTree` | Icon | `lucide-react` | Local | Library | Icon element for FolderTree |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |

#### Page: Designations (`/designations`)
- **Source File**: [`src/routes/_authenticated/_app/designations.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/designations.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 36

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Checkbox` | Forms | `@/components/ui/checkbox` | Shared | Library | Forms element for Checkbox |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `Award` | Icon | `lucide-react` | Local | Library | Icon element for Award |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |

#### Page: Documents (`/documents`)
- **Source File**: [`src/routes/_authenticated/_app/documents.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/documents.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 44

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `PenTool` | Icon | `lucide-react` | Local | Library | Icon element for PenTool |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `FolderLock` | Icon | `lucide-react` | Local | Library | Icon element for FolderLock |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `UploadCloud` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `FileCheck` | Icon | `lucide-react` | Local | Library | Icon element for FileCheck |
| `Eraser` | Icon | `lucide-react` | Local | Library | Icon element for Eraser |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `Award` | Icon | `lucide-react` | Local | Library | Icon element for Award |

#### Page: Employee Dashboard (`/employee-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/employee-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/employee-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 7

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Suspense` | Business Component | `react` | Local | Custom | Business Component element for Suspense |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |

#### Page: Employee Details (`/employee-details`)
- **Source File**: [`src/routes/_authenticated/_app/employee-details.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/employee-details.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 41

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `AvatarImage` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarImage |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `Phone` | Icon | `lucide-react` | Local | Library | Icon element for Phone |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `KeyRound` | Icon | `lucide-react` | Local | Library | Icon element for KeyRound |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `EyeOff` | Icon | `lucide-react` | Local | Library | Icon element for EyeOff |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `UploadCloud` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `FileCheck` | Icon | `lucide-react` | Local | Library | Icon element for FileCheck |

#### Page: Employee Report (`/employee-report`)
- **Source File**: [`src/routes/_authenticated/_app/employee-report.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/employee-report.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 28

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `AvatarImage` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarImage |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `UserCheck` | Icon | `lucide-react` | Local | Library | Icon element for UserCheck |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |

#### Page: Employees (`/employees`)
- **Source File**: [`src/routes/_authenticated/_app/employees.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/employees.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 72

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `AvatarImage` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarImage |
| `AvatarCropperDialog` | Business Component | `@/components/avatar-cropper-dialog` | Shared | Custom | Modal dialog / popover overlay |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `UserCheck` | Icon | `lucide-react` | Local | Library | Icon element for UserCheck |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `UserPlus` | Icon | `lucide-react` | Local | Library | Icon element for UserPlus |
| `Phone` | Icon | `lucide-react` | Local | Library | Icon element for Phone |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `ShieldAlert` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `Award` | Icon | `lucide-react` | Local | Library | Icon element for Award |
| `Laptop` | Icon | `lucide-react` | Local | Library | Icon element for Laptop |
| `Star` | Icon | `lucide-react` | Local | Library | Icon element for Star |
| `Target` | Icon | `lucide-react` | Local | Library | Icon element for Target |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `CheckSquare` | Icon | `lucide-react` | Local | Library | Icon element for CheckSquare |
| `PackageCheck` | Icon | `lucide-react` | Local | Library | Icon element for PackageCheck |
| `Camera` | Icon | `lucide-react` | Local | Library | Icon element for Camera |
| `LayoutGrid` | Icon | `lucide-react` | Local | Library | Icon element for LayoutGrid |
| `List` | Icon | `lucide-react` | Local | Library | Icon element for List |
| `KeyRound` | Icon | `lucide-react` | Local | Library | Icon element for KeyRound |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `ChevronDown` | Icon | `lucide-react` | Local | Library | Icon element for ChevronDown |
| `ChevronUp` | Icon | `lucide-react` | Local | Library | Icon element for ChevronUp |
| `MapPin` | Icon | `lucide-react` | Local | Library | Icon element for MapPin |
| `Heart` | Icon | `lucide-react` | Local | Library | Icon element for Heart |
| `BookOpen` | Icon | `lucide-react` | Local | Library | Icon element for BookOpen |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |

#### Page: Expenses Report (`/expenses-report`)
- **Source File**: [`src/routes/_authenticated/_app/expenses-report.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/expenses-report.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 25

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Receipt` | Icon | `lucide-react` | Local | Library | Icon element for Receipt |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `ArrowUpRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowUpRight |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |

#### Page: Expenses (`/expenses`)
- **Source File**: [`src/routes/_authenticated/_app/expenses.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/expenses.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 61

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Receipt` | Icon | `lucide-react` | Local | Library | Icon element for Receipt |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Wallet` | Icon | `lucide-react` | Local | Library | Icon element for Wallet |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `Settings2` | Icon | `lucide-react` | Local | Library | Icon element for Settings2 |
| `Landmark` | Icon | `lucide-react` | Local | Library | Icon element for Landmark |
| `PieChart` | Icon | `lucide-react` | Local | Library | Visual trend / metric graph |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `TrendingDown` | Icon | `lucide-react` | Local | Library | Icon element for TrendingDown |
| `PiggyBank` | Icon | `lucide-react` | Local | Library | Icon element for PiggyBank |
| `Calculator` | Icon | `lucide-react` | Local | Library | Icon element for Calculator |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `UploadCloud` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |

#### Page: Finance Dashboard (`/finance-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/finance-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/finance-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 3

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Suspense` | Business Component | `react` | Local | Custom | Business Component element for Suspense |
| `AccessDenied` | Business Component | `@/components/access-denied` | Shared | Custom | Business Component element for AccessDenied |

#### Page: Forms (`/forms`)
- **Source File**: [`src/routes/_authenticated/_app/forms.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/forms.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 52

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `FormInput` | Icon | `lucide-react` | Local | Library | Form data input field |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `HelpCircle` | Icon | `lucide-react` | Local | Library | Icon element for HelpCircle |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |
| `Landmark` | Icon | `lucide-react` | Local | Library | Icon element for Landmark |
| `Scale` | Icon | `lucide-react` | Local | Library | Icon element for Scale |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |

#### Page: Google Workspace (`/google-workspace`)
- **Source File**: [`src/routes/_authenticated/_app/google-workspace.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/google-workspace.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 27

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Switch` | Forms | `@/components/ui/switch` | Shared | Library | Forms element for Switch |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `AvatarImage` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarImage |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |
| `Settings2` | Icon | `lucide-react` | Local | Library | Icon element for Settings2 |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Shield` | Icon | `lucide-react` | Local | Library | Icon element for Shield |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `HardDrive` | Icon | `lucide-react` | Local | Library | Icon element for HardDrive |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `EyeOff` | Icon | `lucide-react` | Local | Library | Icon element for EyeOff |
| `Unlink` | Icon | `lucide-react` | Local | Library | Icon element for Unlink |

#### Page: Help Desk Dashboard (`/help-desk-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/help-desk-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/help-desk-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 6

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Suspense` | Business Component | `react` | Local | Custom | Business Component element for Suspense |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |

#### Page: Helpdesk (`/helpdesk`)
- **Source File**: [`src/routes/_authenticated/_app/helpdesk.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/helpdesk.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 45

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `LifeBuoy` | Icon | `lucide-react` | Local | Library | Icon element for LifeBuoy |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `MessageSquare` | Icon | `lucide-react` | Local | Library | Icon element for MessageSquare |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `BarChart3` | Icon | `lucide-react` | Local | Library | Visual trend / metric graph |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |

#### Page: Holidays (`/holidays`)
- **Source File**: [`src/routes/_authenticated/_app/holidays.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/holidays.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 36

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Checkbox` | Forms | `@/components/ui/checkbox` | Shared | Library | Forms element for Checkbox |
| `CalendarDays` | Icon | `lucide-react` | Local | Library | Icon element for CalendarDays |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `Sun` | Icon | `lucide-react` | Local | Library | Icon element for Sun |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `CalendarIcon` | Icon | `lucide-react` | Local | Library | Icon element for CalendarIcon |
| `List` | Icon | `lucide-react` | Local | Library | Icon element for List |

#### Page: Hrm Dashboard (`/hrm-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/hrm-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/hrm-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 4

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `AccessDenied` | Business Component | `@/components/access-denied` | Shared | Custom | Business Component element for AccessDenied |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Suspense` | Business Component | `react` | Local | Custom | Business Component element for Suspense |

#### Page: Hrm (`/hrm`)
- **Source File**: [`src/routes/_authenticated/_app/hrm.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/hrm.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 9

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Wallet` | Icon | `lucide-react` | Local | Library | Icon element for Wallet |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |

#### Page: Integrations (`/integrations`)
- **Source File**: [`src/routes/_authenticated/_app/integrations.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/integrations.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 50

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Progress` | Feedback | `@/components/ui/progress` | Shared | Library | Feedback element for Progress |
| `Switch` | Forms | `@/components/ui/switch` | Shared | Library | Forms element for Switch |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `Key` | Icon | `lucide-react` | Local | Library | Icon element for Key |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |
| `User` | Icon | `lucide-react` | Local | Library | Icon element for User |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `BookOpen` | Icon | `lucide-react` | Local | Library | Icon element for BookOpen |
| `Sliders` | Icon | `lucide-react` | Local | Library | Icon element for Sliders |
| `Package` | Icon | `lucide-react` | Local | Library | Icon element for Package |
| `Boxes` | Icon | `lucide-react` | Local | Library | Icon element for Boxes |
| `ShoppingCart` | Icon | `lucide-react` | Local | Library | Icon element for ShoppingCart |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `Tag` | Icon | `lucide-react` | Local | Library | Icon element for Tag |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Terminal` | Icon | `lucide-react` | Local | Library | Icon element for Terminal |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `ArrowDownLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowDownLeft |
| `ArrowUpRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowUpRight |
| `LinkIcon` | Icon | `lucide-react` | Local | Library | Icon element for LinkIcon |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `Info` | Icon | `lucide-react` | Local | Library | Icon element for Info |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `EyeOff` | Icon | `lucide-react` | Local | Library | Icon element for EyeOff |
| `Save` | Icon | `lucide-react` | Local | Library | Icon element for Save |

#### Page: Inventory Dashboard (`/inventory-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/inventory-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/inventory-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 10

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `AccessDenied` | Business Component | `@/components/access-denied` | Shared | Custom | Business Component element for AccessDenied |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `ArrowRightLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRightLeft |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Package` | Icon | `lucide-react` | Local | Library | Icon element for Package |
| `WarehouseIcon` | Icon | `lucide-react` | Local | Library | Icon element for WarehouseIcon |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |

#### Page: Invoice Report (`/invoice-report`)
- **Source File**: [`src/routes/_authenticated/_app/invoice-report.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/invoice-report.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 33

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `Receipt` | Icon | `lucide-react` | Local | Library | Icon element for Receipt |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |

#### Page: Invoice $id Print (`/invoice/:id/print`)
- **Source File**: [`src/routes/_authenticated/_app/invoice.$id.print.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/invoice.$id.print.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 8

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Separator` | Data Display | `@/components/ui/separator` | Shared | Library | Data Display element for Separator |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |

#### Page: Invoice $id (`/invoice/:id`)
- **Source File**: [`src/routes/_authenticated/_app/invoice.$id.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/invoice.$id.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 37

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Outlet` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Outlet |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `QrCode` | Icon | `lucide-react` | Local | Library | Icon element for QrCode |

#### Page: Invoice Create (`/invoice/create`)
- **Source File**: [`src/routes/_authenticated/_app/invoice.create.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/invoice.create.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 1

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `InvoiceCreatorView` | Business Component | `@/components/invoices/invoice-creator-view` | Shared | Custom | Business Component element for InvoiceCreatorView |

#### Page: Invoices (`/invoices`)
- **Source File**: [`src/routes/_authenticated/_app/invoices.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/invoices.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 41

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Separator` | Data Display | `@/components/ui/separator` | Shared | Library | Data Display element for Separator |
| `Receipt` | Icon | `lucide-react` | Local | Library | Icon element for Receipt |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `RotateCcw` | Icon | `lucide-react` | Local | Library | Icon element for RotateCcw |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |
| `PlanLimitBar` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanLimitBar |

#### Page: It Admin Dashboard (`/it-admin-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/it-admin-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/it-admin-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 4

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Suspense` | Business Component | `react` | Local | Custom | Business Component element for Suspense |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `AccessDenied` | Business Component | `@/components/access-denied` | Shared | Custom | Business Component element for AccessDenied |

#### Page: Leads Dashboard (`/leads-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/leads-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/leads-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 5

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |

#### Page: Learning Analytics (`/learning-analytics`)
- **Source File**: [`src/routes/_authenticated/_app/learning-analytics.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/learning-analytics.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 3

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Suspense` | Business Component | `react` | Local | Custom | Business Component element for Suspense |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |

#### Page: Leave Report (`/leave-report`)
- **Source File**: [`src/routes/_authenticated/_app/leave-report.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/leave-report.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 27

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `CalendarX2` | Icon | `lucide-react` | Local | Library | Icon element for CalendarX2 |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |

#### Page: Leave (`/leave`)
- **Source File**: [`src/routes/_authenticated/_app/leave.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/leave.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 47

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Checkbox` | Forms | `@/components/ui/checkbox` | Shared | Library | Forms element for Checkbox |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `CalendarCheck` | Icon | `lucide-react` | Local | Library | Icon element for CalendarCheck |
| `UserX` | Icon | `lucide-react` | Local | Library | Icon element for UserX |
| `LayoutGrid` | Icon | `lucide-react` | Local | Library | Icon element for LayoutGrid |
| `List` | Icon | `lucide-react` | Local | Library | Icon element for List |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Palmtree` | Icon | `lucide-react` | Local | Library | Icon element for Palmtree |
| `Settings2` | Icon | `lucide-react` | Local | Library | Icon element for Settings2 |
| `BarChart3` | Icon | `lucide-react` | Local | Library | Visual trend / metric graph |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |

#### Page: Marketplace (`/marketplace`)
- **Source File**: [`src/routes/_authenticated/_app/marketplace.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/marketplace.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 23

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Store` | Icon | `lucide-react` | Local | Library | Icon element for Store |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `ShoppingBag` | Icon | `lucide-react` | Local | Library | Icon element for ShoppingBag |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `Tag` | Icon | `lucide-react` | Local | Library | Icon element for Tag |
| `PaymentCheckoutModal` | Business Component | `@/components/payment-checkout-modal` | Shared | Custom | Modal dialog / popover overlay |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |
| `PlanLimitBar` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanLimitBar |

#### Page: Media (`/media`)
- **Source File**: [`src/routes/_authenticated/_app/media.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/media.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 28

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Upload` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Folder` | Icon | `lucide-react` | Local | Library | Icon element for Folder |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `CheckCircle` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |

#### Page: Notes (`/notes`)
- **Source File**: [`src/routes/_authenticated/_app/notes.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/notes.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 27

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Star` | Icon | `lucide-react` | Local | Library | Icon element for Star |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Pin` | Icon | `lucide-react` | Local | Library | Icon element for Pin |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |

#### Page: Notice Period Tracker (`/notice-period-tracker`)
- **Source File**: [`src/routes/_authenticated/_app/notice-period-tracker.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/notice-period-tracker.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 43

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Progress` | Feedback | `@/components/ui/progress` | Shared | Library | Feedback element for Progress |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `LogOut` | Icon | `lucide-react` | Local | Library | Icon element for LogOut |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Laptop` | Icon | `lucide-react` | Local | Library | Icon element for Laptop |
| `Landmark` | Icon | `lucide-react` | Local | Library | Icon element for Landmark |
| `Building` | Icon | `lucide-react` | Local | Library | Icon element for Building |
| `UserCheck` | Icon | `lucide-react` | Local | Library | Icon element for UserCheck |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |

#### Page: Offboarding (`/offboarding`)
- **Source File**: [`src/routes/_authenticated/_app/offboarding.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/offboarding.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 45

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Progress` | Feedback | `@/components/ui/progress` | Shared | Library | Feedback element for Progress |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `UserMinus` | Icon | `lucide-react` | Local | Library | Icon element for UserMinus |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Laptop` | Icon | `lucide-react` | Local | Library | Icon element for Laptop |
| `Wallet` | Icon | `lucide-react` | Local | Library | Icon element for Wallet |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Award` | Icon | `lucide-react` | Local | Library | Icon element for Award |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `Key` | Icon | `lucide-react` | Local | Library | Icon element for Key |

#### Page: Okr (`/okr`)
- **Source File**: [`src/routes/_authenticated/_app/okr.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/okr.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 32

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Progress` | Feedback | `@/components/ui/progress` | Shared | Library | Feedback element for Progress |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Target` | Icon | `lucide-react` | Local | Library | Icon element for Target |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `Award` | Icon | `lucide-react` | Local | Library | Icon element for Award |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |
| `Sliders` | Icon | `lucide-react` | Local | Library | Icon element for Sliders |
| `GitFork` | Icon | `lucide-react` | Local | Library | Icon element for GitFork |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |

#### Page: Overtime (`/overtime`)
- **Source File**: [`src/routes/_authenticated/_app/overtime.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/overtime.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 37

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |

#### Page: Payment Report (`/payment-report`)
- **Source File**: [`src/routes/_authenticated/_app/payment-report.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/payment-report.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 25

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `ArrowUpRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowUpRight |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |

#### Page: Payroll Dashboard (`/payroll-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/payroll-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/payroll-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 7

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Suspense` | Business Component | `react` | Local | Custom | Business Component element for Suspense |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |

#### Page: Payroll (`/payroll`)
- **Source File**: [`src/routes/_authenticated/_app/payroll.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/payroll.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 57

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Switch` | Forms | `@/components/ui/switch` | Shared | Library | Forms element for Switch |
| `Play` | Icon | `lucide-react` | Local | Library | Icon element for Play |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `Sliders` | Icon | `lucide-react` | Local | Library | Icon element for Sliders |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `Calculator` | Icon | `lucide-react` | Local | Library | Icon element for Calculator |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `Brain` | Icon | `lucide-react` | Local | Library | Icon element for Brain |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Landmark` | Icon | `lucide-react` | Local | Library | Icon element for Landmark |
| `UserCheck` | Icon | `lucide-react` | Local | Library | Icon element for UserCheck |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |
| `FileCheck2` | Icon | `lucide-react` | Local | Library | Icon element for FileCheck2 |
| `FileCode` | Icon | `lucide-react` | Local | Library | Icon element for FileCode |
| `Shield` | Icon | `lucide-react` | Local | Library | Icon element for Shield |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `FbpWorkspace` | Business Component | `@/components/payroll/fbp-workspace` | Shared | Custom | Business Component element for FbpWorkspace |
| `TaxVerificationWorkspace` | Business Component | `@/components/payroll/tax-verification-workspace` | Shared | Custom | Business Component element for TaxVerificationWorkspace |
| `BankDisbursementWorkspace` | Business Component | `@/components/payroll/bank-disbursement-workspace` | Shared | Custom | Business Component element for BankDisbursementWorkspace |
| `StatutoryReturnsWorkspace` | Business Component | `@/components/payroll/statutory-returns-workspace` | Shared | Custom | Key KPI / quantitative metric card |

#### Page: Payslip Report (`/payslip-report`)
- **Source File**: [`src/routes/_authenticated/_app/payslip-report.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/payslip-report.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 39

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `AvatarImage` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarImage |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |

#### Page: Performance Appraisal (`/performance-appraisal`)
- **Source File**: [`src/routes/_authenticated/_app/performance-appraisal.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/performance-appraisal.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 44

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `AvatarImage` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarImage |
| `Award` | Icon | `lucide-react` | Local | Library | Icon element for Award |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |
| `Target` | Icon | `lucide-react` | Local | Library | Icon element for Target |
| `Star` | Icon | `lucide-react` | Local | Library | Icon element for Star |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |

#### Page: Performance Indicator (`/performance-indicator`)
- **Source File**: [`src/routes/_authenticated/_app/performance-indicator.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/performance-indicator.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 41

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `AvatarImage` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarImage |
| `Sliders` | Icon | `lucide-react` | Local | Library | Icon element for Sliders |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |
| `Target` | Icon | `lucide-react` | Local | Library | Icon element for Target |

#### Page: Performance Review (`/performance-review`)
- **Source File**: [`src/routes/_authenticated/_app/performance-review.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/performance-review.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 32

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `AvatarImage` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarImage |
| `Progress` | Feedback | `@/components/ui/progress` | Shared | Library | Feedback element for Progress |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `Star` | Icon | `lucide-react` | Local | Library | Icon element for Star |
| `Award` | Icon | `lucide-react` | Local | Library | Icon element for Award |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `FileCheck` | Icon | `lucide-react` | Local | Library | Icon element for FileCheck |
| `Target` | Icon | `lucide-react` | Local | Library | Icon element for Target |

#### Page: Pipeline (`/pipeline`)
- **Source File**: [`src/routes/_authenticated/_app/pipeline.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/pipeline.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 35

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit` | Icon | `lucide-react` | Local | Library | Icon element for Edit |
| `GitBranch` | Icon | `lucide-react` | Local | Library | Icon element for GitBranch |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `Kanban` | Icon | `lucide-react` | Local | Library | Icon element for Kanban |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |

#### Page: Pos Dashboard (`/pos-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/pos-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/pos-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 3

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `AccessDenied` | Business Component | `@/components/access-denied` | Shared | Custom | Business Component element for AccessDenied |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |

#### Page: Pos (`/pos`)
- **Source File**: [`src/routes/_authenticated/_app/pos.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/pos.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 50

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |
| `ShoppingCart` | Icon | `lucide-react` | Local | Library | Icon element for ShoppingCart |
| `Monitor` | Icon | `lucide-react` | Local | Library | Icon element for Monitor |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Minus` | Icon | `lucide-react` | Local | Library | Icon element for Minus |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Package` | Icon | `lucide-react` | Local | Library | Icon element for Package |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Receipt` | Icon | `lucide-react` | Local | Library | Icon element for Receipt |
| `History` | Icon | `lucide-react` | Local | Library | Icon element for History |
| `Barcode` | Icon | `lucide-react` | Local | Library | Icon element for Barcode |
| `PauseCircle` | Icon | `lucide-react` | Local | Library | Icon element for PauseCircle |
| `BarChart3` | Icon | `lucide-react` | Local | Library | Visual trend / metric graph |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `Keyboard` | Icon | `lucide-react` | Local | Library | Icon element for Keyboard |
| `Wifi` | Icon | `lucide-react` | Local | Library | Icon element for Wifi |
| `WifiOff` | Icon | `lucide-react` | Local | Library | Icon element for WifiOff |
| `Camera` | Icon | `lucide-react` | Local | Library | Icon element for Camera |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `ScanLine` | Icon | `lucide-react` | Local | Library | Icon element for ScanLine |
| `Utensils` | Icon | `lucide-react` | Local | Library | Icon element for Utensils |
| `Banknote` | Icon | `lucide-react` | Local | Library | Icon element for Banknote |
| `Laptop` | Icon | `lucide-react` | Local | Library | Icon element for Laptop |
| `Cpu` | Icon | `lucide-react` | Local | Library | Icon element for Cpu |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `Wrench` | Icon | `lucide-react` | Local | Library | Icon element for Wrench |
| `Filter` | Icon | `lucide-react` | Local | Library | Icon element for Filter |

#### Page: Probation (`/probation`)
- **Source File**: [`src/routes/_authenticated/_app/probation.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/probation.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 35

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |

#### Page: Procurement Dashboard (`/procurement-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/procurement-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/procurement-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 3

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `AccessDenied` | Business Component | `@/components/access-denied` | Shared | Custom | Business Component element for AccessDenied |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |

#### Page: Products (`/products`)
- **Source File**: [`src/routes/_authenticated/_app/products.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/products.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 58

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Package` | Icon | `lucide-react` | Local | Library | Icon element for Package |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `LayoutGrid` | Icon | `lucide-react` | Local | Library | Icon element for LayoutGrid |
| `ListIcon` | Icon | `lucide-react` | Local | Library | Icon element for ListIcon |
| `Tag` | Icon | `lucide-react` | Local | Library | Icon element for Tag |
| `Percent` | Icon | `lucide-react` | Local | Library | Icon element for Percent |
| `Ruler` | Icon | `lucide-react` | Local | Library | Icon element for Ruler |
| `WarehouseIcon` | Icon | `lucide-react` | Local | Library | Icon element for WarehouseIcon |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `ChevronLeft` | Icon | `lucide-react` | Local | Library | Icon element for ChevronLeft |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Boxes` | Icon | `lucide-react` | Local | Library | Icon element for Boxes |
| `ArrowRightLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRightLeft |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `ImageIcon` | Icon | `lucide-react` | Local | Library | Icon element for ImageIcon |
| `ShoppingBag` | Icon | `lucide-react` | Local | Library | Icon element for ShoppingBag |
| `Barcode` | Icon | `lucide-react` | Local | Library | Icon element for Barcode |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `History` | Icon | `lucide-react` | Local | Library | Icon element for History |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |
| `AIContentGeneratorModal` | Business Component | `@/components/ai-content-generator-modal` | Shared | Custom | Modal dialog / popover overlay |
| `ProductStockMovementLedger` | Local Sub-Component | `src/routes/_authenticated/_app/products.tsx` | Local | Custom | Local Component element for ProductStockMovementLedger |

#### Page: Profile (`/profile`)
- **Source File**: [`src/routes/_authenticated/_app/profile.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/profile.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 32

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `User` | Icon | `lucide-react` | Local | Library | Icon element for User |
| `Phone` | Icon | `lucide-react` | Local | Library | Icon element for Phone |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `Building` | Icon | `lucide-react` | Local | Library | Icon element for Building |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `Shield` | Icon | `lucide-react` | Local | Library | Icon element for Shield |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `EyeOff` | Icon | `lucide-react` | Local | Library | Icon element for EyeOff |
| `MapPin` | Icon | `lucide-react` | Local | Library | Icon element for MapPin |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |

#### Page: Project Dashboard (`/project-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/project-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/project-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 3

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `AccessDenied` | Business Component | `@/components/access-denied` | Shared | Custom | Business Component element for AccessDenied |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |

#### Page: Project Report (`/project-report`)
- **Source File**: [`src/routes/_authenticated/_app/project-report.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/project-report.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 25

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Progress` | Feedback | `@/components/ui/progress` | Shared | Library | Feedback element for Progress |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `FolderKanban` | Icon | `lucide-react` | Local | Library | Icon element for FolderKanban |

#### Page: Project $id (`/project/:id`)
- **Source File**: [`src/routes/_authenticated/_app/project.$id.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/project.$id.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 57

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Progress` | Feedback | `@/components/ui/progress` | Shared | Library | Feedback element for Progress |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `User` | Icon | `lucide-react` | Local | Library | Icon element for User |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Building` | Icon | `lucide-react` | Local | Library | Icon element for Building |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Star` | Icon | `lucide-react` | Local | Library | Icon element for Star |
| `CheckSquare` | Icon | `lucide-react` | Local | Library | Icon element for CheckSquare |
| `Square` | Icon | `lucide-react` | Local | Library | Icon element for Square |
| `FolderGit2` | Icon | `lucide-react` | Local | Library | Icon element for FolderGit2 |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `Receipt` | Icon | `lucide-react` | Local | Library | Icon element for Receipt |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `ChevronDown` | Icon | `lucide-react` | Local | Library | Icon element for ChevronDown |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Paperclip` | Icon | `lucide-react` | Local | Library | Icon element for Paperclip |
| `MessageSquare` | Icon | `lucide-react` | Local | Library | Icon element for MessageSquare |
| `History` | Icon | `lucide-react` | Local | Library | Icon element for History |
| `FileArchive` | Icon | `lucide-react` | Local | Library | Icon element for FileArchive |
| `FileCode` | Icon | `lucide-react` | Local | Library | Icon element for FileCode |

#### Page: Projects (`/projects`)
- **Source File**: [`src/routes/_authenticated/_app/projects.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/projects.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 50

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |
| `Kanban` | Icon | `lucide-react` | Local | Library | Icon element for Kanban |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `User` | Icon | `lucide-react` | Local | Library | Icon element for User |
| `Folder` | Icon | `lucide-react` | Local | Library | Icon element for Folder |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `CalendarDays` | Icon | `lucide-react` | Local | Library | Icon element for CalendarDays |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `FolderPlus` | Icon | `lucide-react` | Local | Library | Icon element for FolderPlus |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `GripVertical` | Icon | `lucide-react` | Local | Library | Icon element for GripVertical |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `LayoutGrid` | Icon | `lucide-react` | Local | Library | Icon element for LayoutGrid |
| `BarChart3` | Icon | `lucide-react` | Local | Library | Visual trend / metric graph |

#### Page: Promotions (`/promotions`)
- **Source File**: [`src/routes/_authenticated/_app/promotions.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/promotions.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 34

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |

#### Page: Proposals (`/proposals`)
- **Source File**: [`src/routes/_authenticated/_app/proposals.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/proposals.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 18

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Receipt` | Icon | `lucide-react` | Local | Library | Icon element for Receipt |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |
| `PlanLimitBar` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanLimitBar |

#### Page: Provident Fund (`/provident-fund`)
- **Source File**: [`src/routes/_authenticated/_app/provident-fund.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/provident-fund.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 41

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Landmark` | Icon | `lucide-react` | Local | Library | Icon element for Landmark |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `ChevronDown` | Icon | `lucide-react` | Local | Library | Icon element for ChevronDown |

#### Page: Purchases (`/purchases`)
- **Source File**: [`src/routes/_authenticated/_app/purchases.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/purchases.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 42

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `ShoppingCart` | Icon | `lucide-react` | Local | Library | Icon element for ShoppingCart |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Ban` | Icon | `lucide-react` | Local | Library | Icon element for Ban |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `History` | Icon | `lucide-react` | Local | Library | Icon element for History |
| `RotateCcw` | Icon | `lucide-react` | Local | Library | Icon element for RotateCcw |

#### Page: Razorpay Gateway (`/razorpay-gateway`)
- **Source File**: [`src/routes/_authenticated/_app/razorpay-gateway.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/razorpay-gateway.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 24

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `Settings2` | Icon | `lucide-react` | Local | Library | Icon element for Settings2 |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `History` | Icon | `lucide-react` | Local | Library | Icon element for History |
| `Play` | Icon | `lucide-react` | Local | Library | Icon element for Play |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `EyeOff` | Icon | `lucide-react` | Local | Library | Icon element for EyeOff |
| `Webhook` | Icon | `lucide-react` | Local | Library | Icon element for Webhook |
| `Shield` | Icon | `lucide-react` | Local | Library | Icon element for Shield |

#### Page: Recruitment Dashboard (`/recruitment-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/recruitment-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/recruitment-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 1

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |

#### Page: Recruitment (`/recruitment`)
- **Source File**: [`src/routes/_authenticated/_app/recruitment.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/recruitment.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 58

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `UserPlus` | Icon | `lucide-react` | Local | Library | Icon element for UserPlus |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MapPin` | Icon | `lucide-react` | Local | Library | Icon element for MapPin |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Star` | Icon | `lucide-react` | Local | Library | Icon element for Star |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `UserCheck` | Icon | `lucide-react` | Local | Library | Icon element for UserCheck |
| `Award` | Icon | `lucide-react` | Local | Library | Icon element for Award |
| `Video` | Icon | `lucide-react` | Local | Library | Icon element for Video |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Filter` | Icon | `lucide-react` | Local | Library | Icon element for Filter |
| `Brain` | Icon | `lucide-react` | Local | Library | Icon element for Brain |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `Activity` | Icon | `lucide-react` | Local | Library | Icon element for Activity |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |

#### Page: Recurring Invoices (`/recurring-invoices`)
- **Source File**: [`src/routes/_authenticated/_app/recurring-invoices.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/recurring-invoices.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 41

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Repeat` | Icon | `lucide-react` | Local | Library | Icon element for Repeat |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `RotateCcw` | Icon | `lucide-react` | Local | Library | Icon element for RotateCcw |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Play` | Icon | `lucide-react` | Local | Library | Icon element for Play |
| `Pause` | Icon | `lucide-react` | Local | Library | Icon element for Pause |
| `Pencil` | Icon | `lucide-react` | Local | Library | Icon element for Pencil |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `ArrowUpDown` | Icon | `lucide-react` | Local | Library | Icon element for ArrowUpDown |

#### Page: Referrals (`/referrals`)
- **Source File**: [`src/routes/_authenticated/_app/referrals.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/referrals.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 39

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Gift` | Icon | `lucide-react` | Local | Library | Icon element for Gift |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `ChevronDown` | Icon | `lucide-react` | Local | Library | Icon element for ChevronDown |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |

#### Page: Resignation (`/resignation`)
- **Source File**: [`src/routes/_authenticated/_app/resignation.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/resignation.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 37

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit` | Icon | `lucide-react` | Local | Library | Icon element for Edit |
| `UserX` | Icon | `lucide-react` | Local | Library | Icon element for UserX |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |

#### Page: Returns (`/returns`)
- **Source File**: [`src/routes/_authenticated/_app/returns.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/returns.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 41

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `RotateCcw` | Icon | `lucide-react` | Local | Library | Icon element for RotateCcw |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `PackageX` | Icon | `lucide-react` | Local | Library | Icon element for PackageX |
| `CreateSalesReturnDialog` | Local Sub-Component | `src/routes/_authenticated/_app/returns.tsx` | Local | Custom | Modal dialog / popover overlay |
| `CreatePurchaseReturnDialog` | Local Sub-Component | `src/routes/_authenticated/_app/returns.tsx` | Local | Custom | Modal dialog / popover overlay |

#### Page: Route (`/_app`)
- **Source File**: [`src/routes/_authenticated/_app/route.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/route.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 36

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Outlet` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Outlet |
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `DreamsSidebar` | Layout | `@/components/dreams-sidebar` | Shared | Custom | Navigation sidebar structure |
| `RealtimeNotificationDrawer` | Business Component | `@/components/realtime-notification-drawer` | Shared | Custom | Slide-out drawer panel |
| `ThemeToggle` | Layout | `@/components/theme-toggle` | Shared | Custom | Layout element for ThemeToggle |
| `AICopilotWidget` | Business Component | `@/components/ai-copilot-widget` | Shared | Custom | Business Component element for AICopilotWidget |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuLabel` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuLabel |
| `DropdownMenuSeparator` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuSeparator |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `CommandDialog` | Layout | `@/components/ui/command` | Shared | Library | Modal dialog / popover overlay |
| `CommandEmpty` | Layout | `@/components/ui/command` | Shared | Library | Zero-data state illustration |
| `CommandGroup` | Layout | `@/components/ui/command` | Shared | Library | Layout element for CommandGroup |
| `CommandInput` | Layout | `@/components/ui/command` | Shared | Library | Form data input field |
| `CommandItem` | Layout | `@/components/ui/command` | Shared | Library | Layout element for CommandItem |
| `CommandList` | Layout | `@/components/ui/command` | Shared | Library | Layout element for CommandList |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarImage` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarImage |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `User` | Icon | `lucide-react` | Local | Library | Icon element for User |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Settings` | Icon | `lucide-react` | Local | Library | Icon element for Settings |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `LogOut` | Icon | `lucide-react` | Local | Library | Icon element for LogOut |
| `HelpCircle` | Icon | `lucide-react` | Local | Library | Icon element for HelpCircle |
| `WorkspaceUnavailableView` | Business Component | `@/components/workspace-unavailable-view` | Shared | Custom | Business Component element for WorkspaceUnavailableView |
| `AccessDenied` | Business Component | `@/components/access-denied` | Shared | Custom | Business Component element for AccessDenied |
| `SuspendedAccountView` | Business Component | `@/components/subscription/suspended-account-view` | Shared | Custom | Business Component element for SuspendedAccountView |
| `ExpiredSubscriptionView` | Business Component | `@/components/subscription/expired-subscription-view` | Shared | Custom | Business Component element for ExpiredSubscriptionView |
| `SubscriptionWarningPopup` | Business Component | `@/components/subscription/subscription-warning-popup` | Shared | Custom | Business Component element for SubscriptionWarningPopup |
| `SubscriptionFooterBar` | Business Component | `@/components/subscription/subscription-footer-bar` | Shared | Custom | Business Component element for SubscriptionFooterBar |

#### Page: Sales Dashboard (`/sales-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/sales-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/sales-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 10

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `ShoppingCart` | Icon | `lucide-react` | Local | Library | Icon element for ShoppingCart |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `ArrowUpRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowUpRight |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `Package` | Icon | `lucide-react` | Local | Library | Icon element for Package |
| `Compass` | Icon | `lucide-react` | Local | Library | Icon element for Compass |

#### Page: Settings Custom Domain (`/settings/custom-domain`)
- **Source File**: [`src/routes/_authenticated/_app/settings.custom-domain.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/settings.custom-domain.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 7

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `CustomDomainSettings` | Business Component | `@/components/custom-domain-settings` | Shared | Custom | Business Component element for CustomDomainSettings |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |

#### Page: Settings (`/settings`)
- **Source File**: [`src/routes/_authenticated/_app/settings.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/settings.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 61

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `WorkspaceAdminSettings` | Business Component | `@/components/workspace-admin-settings` | Shared | Custom | Business Component element for WorkspaceAdminSettings |
| `WorkspaceBrandingSettings` | Business Component | `@/components/settings/workspace-branding-settings` | Shared | Custom | Business Component element for WorkspaceBrandingSettings |
| `CompanyProfileSettings` | Business Component | `@/components/settings/company-profile-settings` | Shared | Custom | Business Component element for CompanyProfileSettings |
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Outlet` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Outlet |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `SettingsNestedNav` | Business Component | `@/components/settings/settings-nested-nav` | Shared | Custom | Business Component element for SettingsNestedNav |
| `SettingsSectionBreadcrumb` | Business Component | `@/components/settings/settings-nested-nav` | Shared | Custom | Hierarchical breadcrumb path |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Shield` | Icon | `lucide-react` | Local | Library | Icon element for Shield |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `ShieldAlert` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `HelpCircle` | Icon | `lucide-react` | Local | Library | Icon element for HelpCircle |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `AlarmClock` | Icon | `lucide-react` | Local | Library | Icon element for AlarmClock |
| `Sliders` | Icon | `lucide-react` | Local | Library | Icon element for Sliders |
| `SlidersHorizontal` | Icon | `lucide-react` | Local | Library | Icon element for SlidersHorizontal |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `MapPin` | Icon | `lucide-react` | Local | Library | Icon element for MapPin |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `Phone` | Icon | `lucide-react` | Local | Library | Icon element for Phone |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `CalendarCheck` | Icon | `lucide-react` | Local | Library | Icon element for CalendarCheck |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `Workflow` | Icon | `lucide-react` | Local | Library | Icon element for Workflow |
| `Calculator` | Icon | `lucide-react` | Local | Library | Icon element for Calculator |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Code` | Icon | `lucide-react` | Local | Library | Icon element for Code |

#### Page: Setup Notes (`/setup-notes`)
- **Source File**: [`src/routes/_authenticated/_app/setup-notes.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/setup-notes.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 15

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `HelpCircle` | Icon | `lucide-react` | Local | Library | Icon element for HelpCircle |
| `Shield` | Icon | `lucide-react` | Local | Library | Icon element for Shield |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |

#### Page: Shift Swap Requests (`/shift-swap-requests`)
- **Source File**: [`src/routes/_authenticated/_app/shift-swap-requests.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/shift-swap-requests.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 38

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `ArrowLeftRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeftRight |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |

#### Page: Shifts (`/shifts`)
- **Source File**: [`src/routes/_authenticated/_app/shifts.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/shifts.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 43

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `CalendarDays` | Icon | `lucide-react` | Local | Library | Icon element for CalendarDays |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `ArrowLeftRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeftRight |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `ChevronLeft` | Icon | `lucide-react` | Local | Library | Icon element for ChevronLeft |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `Settings2` | Icon | `lucide-react` | Local | Library | Icon element for Settings2 |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |

#### Page: Shopify (`/shopify`)
- **Source File**: [`src/routes/_authenticated/_app/shopify.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/shopify.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 41

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Switch` | Forms | `@/components/ui/switch` | Shared | Library | Forms element for Switch |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Store` | Icon | `lucide-react` | Local | Library | Icon element for Store |
| `Key` | Icon | `lucide-react` | Local | Library | Icon element for Key |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Package` | Icon | `lucide-react` | Local | Library | Icon element for Package |
| `Boxes` | Icon | `lucide-react` | Local | Library | Icon element for Boxes |
| `ShoppingCart` | Icon | `lucide-react` | Local | Library | Icon element for ShoppingCart |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `MapPin` | Icon | `lucide-react` | Local | Library | Icon element for MapPin |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `X` | Icon | `lucide-react` | Local | Library | Icon element for X |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `EyeOff` | Icon | `lucide-react` | Local | Library | Icon element for EyeOff |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `ArrowDownLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowDownLeft |
| `ArrowUpRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowUpRight |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |

#### Page: Subscription (`/subscription`)
- **Source File**: [`src/routes/_authenticated/_app/subscription.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/subscription.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 36

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |
| `Store` | Icon | `lucide-react` | Local | Library | Icon element for Store |
| `Boxes` | Icon | `lucide-react` | Local | Library | Icon element for Boxes |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `Receipt` | Icon | `lucide-react` | Local | Library | Icon element for Receipt |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |
| `ArrowDownRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowDownRight |
| `Minus` | Icon | `lucide-react` | Local | Library | Icon element for Minus |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Calculator` | Icon | `lucide-react` | Local | Library | Icon element for Calculator |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `PaymentCheckoutModal` | Business Component | `@/components/payment-checkout-modal` | Shared | Custom | Modal dialog / popover overlay |

#### Page: Suppliers (`/suppliers`)
- **Source File**: [`src/routes/_authenticated/_app/suppliers.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/suppliers.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 33

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Truck` | Icon | `lucide-react` | Local | Library | Icon element for Truck |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `Phone` | Icon | `lucide-react` | Local | Library | Icon element for Phone |
| `MapPin` | Icon | `lucide-react` | Local | Library | Icon element for MapPin |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Boxes` | Icon | `lucide-react` | Local | Library | Icon element for Boxes |

#### Page: Support Dashboard (`/support-dashboard`)
- **Source File**: [`src/routes/_authenticated/_app/support-dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/support-dashboard.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 3

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `AccessDenied` | Business Component | `@/components/access-denied` | Shared | Custom | Business Component element for AccessDenied |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |

#### Page: Support (`/support`)
- **Source File**: [`src/routes/_authenticated/_app/support.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/support.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 34

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `LifeBuoy` | Icon | `lucide-react` | Local | Library | Icon element for LifeBuoy |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `MessageSquare` | Icon | `lucide-react` | Local | Library | Icon element for MessageSquare |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |

#### Page: System States (`/system-states`)
- **Source File**: [`src/routes/_authenticated/_app/system-states.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/system-states.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 26

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `EmptyState` | Feedback | `@/components/system-states` | Shared | Custom | Key KPI / quantitative metric card |
| `NoSearchResults` | Feedback | `@/components/system-states` | Shared | Custom | Feedback element for NoSearchResults |
| `LoadingState` | Feedback | `@/components/system-states` | Shared | Custom | Key KPI / quantitative metric card |
| `ErrorState` | Feedback | `@/components/system-states` | Shared | Custom | Key KPI / quantitative metric card |
| `SuccessState` | Feedback | `@/components/system-states` | Shared | Custom | Key KPI / quantitative metric card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `FileQuestion` | Icon | `lucide-react` | Local | Library | Icon element for FileQuestion |
| `ShieldAlert` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `ServerCrash` | Icon | `lucide-react` | Local | Library | Icon element for ServerCrash |
| `Wrench` | Icon | `lucide-react` | Local | Library | Icon element for Wrench |
| `WifiOff` | Icon | `lucide-react` | Local | Library | Icon element for WifiOff |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `FolderOpen` | Icon | `lucide-react` | Local | Library | Icon element for FolderOpen |

#### Page: Tally Importer (`/tally-importer`)
- **Source File**: [`src/routes/_authenticated/_app/tally-importer.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/tally-importer.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 22

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |
| `ArrowLeftRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeftRight |
| `Upload` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `History` | Icon | `lucide-react` | Local | Library | Icon element for History |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `Map` | Icon | `lucide-react` | Local | Library | Icon element for Map |
| `Database` | Icon | `lucide-react` | Local | Library | Tabbed sub-view switcher |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |

#### Page: Task Board (`/task-board`)
- **Source File**: [`src/routes/_authenticated/_app/task-board.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/task-board.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 37

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Pencil` | Icon | `lucide-react` | Local | Library | Icon element for Pencil |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `RotateCcw` | Icon | `lucide-react` | Local | Library | Icon element for RotateCcw |
| `MessageCircle` | Icon | `lucide-react` | Local | Library | Icon element for MessageCircle |
| `Paperclip` | Icon | `lucide-react` | Local | Library | Icon element for Paperclip |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |

#### Page: Tasks (`/tasks`)
- **Source File**: [`src/routes/_authenticated/_app/tasks.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/tasks.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 24

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Kanban` | Icon | `lucide-react` | Local | Library | Icon element for Kanban |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `FolderKanban` | Icon | `lucide-react` | Local | Library | Icon element for FolderKanban |

#### Page: Taxes (`/taxes`)
- **Source File**: [`src/routes/_authenticated/_app/taxes.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/taxes.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 30

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit` | Icon | `lucide-react` | Local | Library | Icon element for Edit |
| `Percent` | Icon | `lucide-react` | Local | Library | Icon element for Percent |
| `Receipt` | Icon | `lucide-react` | Local | Library | Icon element for Receipt |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Star` | Icon | `lucide-react` | Local | Library | Icon element for Star |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |

#### Page: Termination (`/termination`)
- **Source File**: [`src/routes/_authenticated/_app/termination.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/termination.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 37

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit` | Icon | `lucide-react` | Local | Library | Icon element for Edit |
| `ShieldAlert` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `Flame` | Icon | `lucide-react` | Local | Library | Icon element for Flame |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |

#### Page: Ticket Reports (`/ticket-reports`)
- **Source File**: [`src/routes/_authenticated/_app/ticket-reports.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/ticket-reports.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 26

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `LifeBuoy` | Icon | `lucide-react` | Local | Library | Icon element for LifeBuoy |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Flame` | Icon | `lucide-react` | Local | Library | Icon element for Flame |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |

#### Page: Timesheets (`/timesheets`)
- **Source File**: [`src/routes/_authenticated/_app/timesheets.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/timesheets.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 38

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `AvatarImage` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarImage |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `FolderGit2` | Icon | `lucide-react` | Local | Library | Icon element for FolderGit2 |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Info` | Icon | `lucide-react` | Local | Library | Icon element for Info |

#### Page: Todo (`/todo`)
- **Source File**: [`src/routes/_authenticated/_app/todo.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/todo.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 27

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Checkbox` | Forms | `@/components/ui/checkbox` | Shared | Library | Forms element for Checkbox |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `CheckSquare` | Icon | `lucide-react` | Local | Library | Icon element for CheckSquare |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `ListTodo` | Icon | `lucide-react` | Local | Library | Icon element for ListTodo |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |

#### Page: Training (`/training`)
- **Source File**: [`src/routes/_authenticated/_app/training.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/training.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 52

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Progress` | Feedback | `@/components/ui/progress` | Shared | Library | Feedback element for Progress |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `GraduationCap` | Icon | `lucide-react` | Local | Library | Icon element for GraduationCap |
| `Award` | Icon | `lucide-react` | Local | Library | Icon element for Award |
| `BookOpen` | Icon | `lucide-react` | Local | Library | Icon element for BookOpen |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `PlayCircle` | Icon | `lucide-react` | Local | Library | Icon element for PlayCircle |
| `FileCheck` | Icon | `lucide-react` | Local | Library | Icon element for FileCheck |
| `UserPlus` | Icon | `lucide-react` | Local | Library | Icon element for UserPlus |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `Phone` | Icon | `lucide-react` | Local | Library | Icon element for Phone |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `TrendingUp` | Icon | `lucide-react` | Local | Library | Icon element for TrendingUp |
| `BarChart3` | Icon | `lucide-react` | Local | Library | Visual trend / metric graph |
| `PieChart` | Icon | `lucide-react` | Local | Library | Visual trend / metric graph |

#### Page: Transfers (`/transfers`)
- **Source File**: [`src/routes/_authenticated/_app/transfers.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/transfers.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 39

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `ArrowRightLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRightLeft |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Truck` | Icon | `lucide-react` | Local | Library | Icon element for Truck |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |
| `WarehouseIcon` | Icon | `lucide-react` | Local | Library | Icon element for WarehouseIcon |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `Ban` | Icon | `lucide-react` | Local | Library | Icon element for Ban |
| `Boxes` | Icon | `lucide-react` | Local | Library | Icon element for Boxes |

#### Page: Users (`/users`)
- **Source File**: [`src/routes/_authenticated/_app/users.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/users.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 22

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `AccessDenied` | Business Component | `@/components/access-denied` | Shared | Custom | Business Component element for AccessDenied |

#### Page: Warnings (`/warnings`)
- **Source File**: [`src/routes/_authenticated/_app/warnings.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/warnings.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 44

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `AlertOctagon` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `ShieldAlert` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `FileCheck` | Icon | `lucide-react` | Local | Library | Icon element for FileCheck |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `LayoutGrid` | Icon | `lucide-react` | Local | Library | Icon element for LayoutGrid |
| `List` | Icon | `lucide-react` | Local | Library | Icon element for List |

#### Page: Whatsapp Alerts (`/whatsapp-alerts`)
- **Source File**: [`src/routes/_authenticated/_app/whatsapp-alerts.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/whatsapp-alerts.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 36

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Switch` | Forms | `@/components/ui/switch` | Shared | Library | Forms element for Switch |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |
| `MessageSquare` | Icon | `lucide-react` | Local | Library | Icon element for MessageSquare |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `Settings2` | Icon | `lucide-react` | Local | Library | Icon element for Settings2 |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Bell` | Icon | `lucide-react` | Local | Library | Icon element for Bell |
| `Zap` | Icon | `lucide-react` | Local | Library | Icon element for Zap |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Edit2` | Icon | `lucide-react` | Local | Library | Icon element for Edit2 |
| `Play` | Icon | `lucide-react` | Local | Library | Icon element for Play |
| `Bot` | Icon | `lucide-react` | Local | Library | Icon element for Bot |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `Terminal` | Icon | `lucide-react` | Local | Library | Icon element for Terminal |

#### Page: Work From Home (`/work-from-home`)
- **Source File**: [`src/routes/_authenticated/_app/work-from-home.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/work-from-home.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 37

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Avatar` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for Avatar |
| `AvatarFallback` | Data Display | `@/components/ui/avatar` | Shared | Library | Data Display element for AvatarFallback |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `DropdownMenu` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenu |
| `DropdownMenuContent` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuContent |
| `DropdownMenuItem` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuItem |
| `DropdownMenuTrigger` | Layout | `@/components/ui/dropdown-menu` | Shared | Library | Layout element for DropdownMenuTrigger |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `MoreVertical` | Icon | `lucide-react` | Local | Library | Icon element for MoreVertical |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |

#### Page: Workflows (`/workflows`)
- **Source File**: [`src/routes/_authenticated/_app/workflows.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/workflows.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 31

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Table` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableBody` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableCell` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHead` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `TableHeader` | Data Display | `@/components/ui/table` | Shared | Library | Page or top navigation header |
| `TableRow` | Data Display | `@/components/ui/table` | Shared | Library | Data listing & columnar display |
| `Workflow` | Icon | `lucide-react` | Local | Library | Icon element for Workflow |
| `Play` | Icon | `lucide-react` | Local | Library | Icon element for Play |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Trash2` | Icon | `lucide-react` | Local | Library | Icon element for Trash2 |
| `PlanGuard` | Business Component | `@/components/plan-guard` | Shared | Custom | Business Component element for PlanGuard |

#### Page: Workspace (`/workspace`)
- **Source File**: [`src/routes/_authenticated/_app/workspace.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/_app/workspace.tsx)
- **Layout**: AppDashboardLayout (DreamsSidebar)
- **Complexity**: **CRITICAL** | **Components Used**: 14

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |

### PORTAL: EMPLOYEE PORTAL (ESS) (2 Pages)

#### Page: Dashboard (`/employee/dashboard`)
- **Source File**: [`src/routes/_authenticated/employee/dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/employee/dashboard.tsx)
- **Layout**: EmployeeLayout
- **Complexity**: **CRITICAL** | **Components Used**: 0

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| StandardContainer | Layout | Native DOM | Local | Custom | Page container view |

#### Page: Employee Home (`/employee`)
- **Source File**: [`src/routes/_authenticated/employee/index.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/employee/index.tsx)
- **Layout**: EmployeeLayout
- **Complexity**: **CRITICAL** | **Components Used**: 0

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| StandardContainer | Layout | Native DOM | Local | Custom | Page container view |

### PORTAL: CLIENT / CUSTOMER PORTAL (2 Pages)

#### Page: Dashboard (`/client/dashboard`)
- **Source File**: [`src/routes/_authenticated/client/dashboard.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/client/dashboard.tsx)
- **Layout**: ClientLayout
- **Complexity**: **CRITICAL** | **Components Used**: 0

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| StandardContainer | Layout | Native DOM | Local | Custom | Page container view |

#### Page: Client Home (`/client`)
- **Source File**: [`src/routes/_authenticated/client/index.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/client/index.tsx)
- **Layout**: ClientLayout
- **Complexity**: **CRITICAL** | **Components Used**: 0

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| StandardContainer | Layout | Native DOM | Local | Custom | Page container view |

### PORTAL: CLIENT DOCUMENT PORTAL (3 Pages)

#### Page: Portal Invoices $id (`/portal/invoices/:id`)
- **Source File**: [`src/routes/portal.invoices.$id.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/portal.invoices.$id.tsx)
- **Layout**: PublicClientLayout
- **Complexity**: **LOW** | **Components Used**: 7

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |

#### Page: Portal Proposals $id (`/portal/proposals/:id`)
- **Source File**: [`src/routes/portal.proposals.$id.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/portal.proposals.$id.tsx)
- **Layout**: PublicClientLayout
- **Complexity**: **CRITICAL** | **Components Used**: 23

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |

#### Page: Portal (`/portal`)
- **Source File**: [`src/routes/portal.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/portal.tsx)
- **Layout**: PublicClientLayout
- **Complexity**: **MEDIUM** | **Components Used**: 21

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Receipt` | Icon | `lucide-react` | Local | Library | Icon element for Receipt |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `PhoneCall` | Icon | `lucide-react` | Local | Library | Icon element for PhoneCall |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |

### PORTAL: TENANT MANAGEMENT (1 Pages)

#### Page: Tenant Home (`/tenant`)
- **Source File**: [`src/routes/_authenticated/tenant/index.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/tenant/index.tsx)
- **Layout**: TenantLayout
- **Complexity**: **CRITICAL** | **Components Used**: 0

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| StandardContainer | Layout | Native DOM | Local | Custom | Page container view |

### PORTAL: TENANT ONBOARDING PORTAL (1 Pages)

#### Page: Onboarding (`/onboarding`)
- **Source File**: [`src/routes/_authenticated/onboarding.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/_authenticated/onboarding.tsx)
- **Layout**: OnboardingLayout
- **Complexity**: **CRITICAL** | **Components Used**: 17

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `ThemeToggle` | Layout | `@/components/theme-toggle` | Shared | Custom | Layout element for ThemeToggle |

### PORTAL: AUTHENTICATION PORTAL (6 Pages)

#### Page: Auth (`/auth`)
- **Source File**: [`src/routes/auth.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/auth.tsx)
- **Layout**: AuthLayout
- **Complexity**: **CRITICAL** | **Components Used**: 8

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `ThemeToggle` | Layout | `@/components/theme-toggle` | Shared | Custom | Layout element for ThemeToggle |

#### Page: Lock Screen (`/lock-screen`)
- **Source File**: [`src/routes/lock-screen.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/lock-screen.tsx)
- **Layout**: AuthLayout
- **Complexity**: **LOW** | **Components Used**: 3

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `EyeOff` | Icon | `lucide-react` | Local | Library | Icon element for EyeOff |

#### Page: Login (`/login`)
- **Source File**: [`src/routes/login.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/login.tsx)
- **Layout**: AuthLayout
- **Complexity**: **LOW** | **Components Used**: 0

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| StandardContainer | Layout | Native DOM | Local | Custom | Page container view |

#### Page: Session Expired (`/session-expired`)
- **Source File**: [`src/routes/session-expired.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/session-expired.tsx)
- **Layout**: AuthLayout
- **Complexity**: **LOW** | **Components Used**: 1

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `SessionExpiredView` | Feedback | `@/components/error-pages/session-expired-view` | Shared | Custom | Feedback element for SessionExpiredView |

#### Page: Super Login (`/super-login`)
- **Source File**: [`src/routes/super-login.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/super-login.tsx)
- **Layout**: AuthLayout
- **Complexity**: **MEDIUM** | **Components Used**: 22

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `EyeOff` | Icon | `lucide-react` | Local | Library | Icon element for EyeOff |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `Server` | Icon | `lucide-react` | Local | Library | Icon element for Server |
| `KeyRound` | Icon | `lucide-react` | Local | Library | Icon element for KeyRound |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Database` | Icon | `lucide-react` | Local | Library | Tabbed sub-view switcher |
| `Store` | Icon | `lucide-react` | Local | Library | Icon element for Store |
| `Smartphone` | Icon | `lucide-react` | Local | Library | Icon element for Smartphone |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `ThemeToggle` | Layout | `@/components/theme-toggle` | Shared | Custom | Layout element for ThemeToggle |
| `NotFoundView` | Feedback | `@/components/error-pages/not-found-view` | Shared | Custom | Feedback element for NotFoundView |

#### Page: Verify 2fa (`/verify-2fa`)
- **Source File**: [`src/routes/verify-2fa.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/verify-2fa.tsx)
- **Layout**: AuthLayout
- **Complexity**: **LOW** | **Components Used**: 11

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `ThemeToggle` | Layout | `@/components/theme-toggle` | Shared | Custom | Layout element for ThemeToggle |

### PORTAL: PAYMENT GATEWAY & CHECKOUT PORTAL (3 Pages)

#### Page: Payment Failed (`/payment/failed`)
- **Source File**: [`src/routes/payment.failed.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/payment.failed.tsx)
- **Layout**: PaymentLayout
- **Complexity**: **CRITICAL** | **Components Used**: 12

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `XCircle` | Icon | `lucide-react` | Local | Library | Icon element for XCircle |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `CreditCard` | Icon | `lucide-react` | Local | Library | Modular content container / card |
| `LifeBuoy` | Icon | `lucide-react` | Local | Library | Icon element for LifeBuoy |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `ThemeToggle` | Layout | `@/components/theme-toggle` | Shared | Custom | Layout element for ThemeToggle |

#### Page: Payment Pending (`/payment/pending`)
- **Source File**: [`src/routes/payment.pending.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/payment.pending.tsx)
- **Layout**: PaymentLayout
- **Complexity**: **CRITICAL** | **Components Used**: 9

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `ThemeToggle` | Layout | `@/components/theme-toggle` | Shared | Custom | Layout element for ThemeToggle |

#### Page: Payment Success (`/payment/success`)
- **Source File**: [`src/routes/payment.success.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/payment.success.tsx)
- **Layout**: PaymentLayout
- **Complexity**: **CRITICAL** | **Components Used**: 10

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `ThemeToggle` | Layout | `@/components/theme-toggle` | Shared | Custom | Layout element for ThemeToggle |

### PORTAL: PUBLIC WEBSITE & MARKETING (28 Pages)

#### Page: 403 (`/403`)
- **Source File**: [`src/routes/403.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/403.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 1

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `ForbiddenView` | Feedback | `@/components/error-pages/forbidden-view` | Shared | Custom | Feedback element for ForbiddenView |

#### Page: 404 (`/404`)
- **Source File**: [`src/routes/404.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/404.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 1

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `NotFoundView` | Feedback | `@/components/error-pages/not-found-view` | Shared | Custom | Feedback element for NotFoundView |

#### Page: 500 (`/500`)
- **Source File**: [`src/routes/500.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/500.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 1

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `ServerErrorView` | Feedback | `@/components/error-pages/server-error-view` | Shared | Custom | Feedback element for ServerErrorView |

#### Page: A $tag (`/a/:tag`)
- **Source File**: [`src/routes/a.$tag.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/a.$tag.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 6

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Printer` | Icon | `lucide-react` | Local | Library | Icon element for Printer |
| `Share2` | Icon | `lucide-react` | Local | Library | Icon element for Share2 |

#### Page: About (`/about`)
- **Source File**: [`src/routes/about.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/about.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 3

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `MarketingLayout` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for MarketingLayout |
| `PageHero` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for PageHero |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |

#### Page: Addons $slug (`/addons/:slug`)
- **Source File**: [`src/routes/addons.$slug.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/addons.$slug.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 10

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `MarketingLayout` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for MarketingLayout |
| `PageHero` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for PageHero |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `BookOpen` | Icon | `lucide-react` | Local | Library | Icon element for BookOpen |
| `Download` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `Star` | Icon | `lucide-react` | Local | Library | Icon element for Star |

#### Page: Addons (`/addons`)
- **Source File**: [`src/routes/addons.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/addons.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 11

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `MarketingLayout` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for MarketingLayout |
| `PageHero` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for PageHero |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Puzzle` | Icon | `lucide-react` | Local | Library | Icon element for Puzzle |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |

#### Page: Careers (`/careers`)
- **Source File**: [`src/routes/careers.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/careers.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **HIGH** | **Components Used**: 26

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Select` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectContent` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectItem` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectTrigger` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `SelectValue` | Forms | `@/components/ui/select` | Shared | Library | Form data input field |
| `Briefcase` | Icon | `lucide-react` | Local | Library | Icon element for Briefcase |
| `MapPin` | Icon | `lucide-react` | Local | Library | Icon element for MapPin |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `DollarSign` | Icon | `lucide-react` | Local | Library | Icon element for DollarSign |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `ThemeToggle` | Layout | `@/components/theme-toggle` | Shared | Custom | Layout element for ThemeToggle |

#### Page: Cms $ (`/cms/$`)
- **Source File**: [`src/routes/cms.$.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/cms.$.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 3

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `MarketingLayout` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for MarketingLayout |
| `PageHero` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for PageHero |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |

#### Page: Cms Index (`/cms/index`)
- **Source File**: [`src/routes/cms.index.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/cms.index.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 2

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `MarketingLayout` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for MarketingLayout |
| `PageHero` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for PageHero |

#### Page: Contact (`/contact`)
- **Source File**: [`src/routes/contact.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/contact.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 10

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `MarketingLayout` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for MarketingLayout |
| `PageHero` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for PageHero |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Label` | Forms | `@/components/ui/label` | Shared | Library | Forms element for Label |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Textarea` | Forms | `@/components/ui/textarea` | Shared | Library | Forms element for Textarea |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `HeadphonesIcon` | Icon | `lucide-react` | Local | Library | Icon element for HeadphonesIcon |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |

#### Page: Customer Display (`/customer-display`)
- **Source File**: [`src/routes/customer-display.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/customer-display.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 10

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `ShoppingCart` | Icon | `lucide-react` | Local | Library | Icon element for ShoppingCart |
| `QrCode` | Icon | `lucide-react` | Local | Library | Icon element for QrCode |
| `CircleCheck` | Icon | `lucide-react` | Local | Library | Icon element for CircleCheck |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `Store` | Icon | `lucide-react` | Local | Library | Icon element for Store |
| `Wifi` | Icon | `lucide-react` | Local | Library | Icon element for Wifi |
| `Receipt` | Icon | `lucide-react` | Local | Library | Icon element for Receipt |
| `HeartHandshake` | Icon | `lucide-react` | Local | Library | Icon element for HeartHandshake |

#### Page: Developer (`/developer`)
- **Source File**: [`src/routes/developer.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/developer.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **HIGH** | **Components Used**: 40

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `ThemeToggle` | Layout | `@/components/theme-toggle` | Shared | Custom | Layout element for ThemeToggle |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `Terminal` | Icon | `lucide-react` | Local | Library | Icon element for Terminal |
| `Database` | Icon | `lucide-react` | Local | Library | Tabbed sub-view switcher |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Activity` | Icon | `lucide-react` | Local | Library | Icon element for Activity |
| `Play` | Icon | `lucide-react` | Local | Library | Icon element for Play |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Server` | Icon | `lucide-react` | Local | Library | Icon element for Server |
| `Key` | Icon | `lucide-react` | Local | Library | Icon element for Key |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `Building2` | Icon | `lucide-react` | Local | Library | Icon element for Building2 |
| `Network` | Icon | `lucide-react` | Local | Library | Icon element for Network |
| `BarChart3` | Icon | `lucide-react` | Local | Library | Visual trend / metric graph |
| `Eye` | Icon | `lucide-react` | Local | Library | Icon element for Eye |
| `History` | Icon | `lucide-react` | Local | Library | Icon element for History |
| `PlayCircle` | Icon | `lucide-react` | Local | Library | Icon element for PlayCircle |
| `BookOpen` | Icon | `lucide-react` | Local | Library | Icon element for BookOpen |
| `Send` | Icon | `lucide-react` | Local | Library | Icon element for Send |
| `Home` | Icon | `lucide-react` | Local | Library | Icon element for Home |
| `MethodBadge` | Local Sub-Component | `src/routes/developer.tsx` | Local | Custom | Status or categorization pill |
| `StatusBadge` | Local Sub-Component | `src/routes/developer.tsx` | Local | Custom | Key KPI / quantitative metric card |

#### Page: Docs (`/docs`)
- **Source File**: [`src/routes/docs.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/docs.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **HIGH** | **Components Used**: 48

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Tabs` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsList` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsTrigger` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `TabsContent` | Navigation | `@/components/ui/tabs` | Shared | Library | Tabbed sub-view switcher |
| `Dialog` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogContent` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogHeader` | Feedback | `@/components/ui/dialog` | Shared | Library | Page or top navigation header |
| `DialogTitle` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogFooter` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `DialogDescription` | Feedback | `@/components/ui/dialog` | Shared | Library | Modal dialog / popover overlay |
| `ThemeToggle` | Layout | `@/components/theme-toggle` | Shared | Custom | Layout element for ThemeToggle |
| `BookOpen` | Icon | `lucide-react` | Local | Library | Icon element for BookOpen |
| `Layers` | Icon | `lucide-react` | Local | Library | Icon element for Layers |
| `Database` | Icon | `lucide-react` | Local | Library | Tabbed sub-view switcher |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Terminal` | Icon | `lucide-react` | Local | Library | Icon element for Terminal |
| `Play` | Icon | `lucide-react` | Local | Library | Icon element for Play |
| `Copy` | Icon | `lucide-react` | Local | Library | Icon element for Copy |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Server` | Icon | `lucide-react` | Local | Library | Icon element for Server |
| `Workflow` | Icon | `lucide-react` | Local | Library | Icon element for Workflow |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `ChevronDown` | Icon | `lucide-react` | Local | Library | Icon element for ChevronDown |
| `Cpu` | Icon | `lucide-react` | Local | Library | Icon element for Cpu |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `ArrowLeft` | Icon | `lucide-react` | Local | Library | Icon element for ArrowLeft |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `FileSpreadsheet` | Icon | `lucide-react` | Local | Library | Slide-out drawer panel |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |
| `Shield` | Icon | `lucide-react` | Local | Library | Icon element for Shield |
| `Home` | Icon | `lucide-react` | Local | Library | Icon element for Home |
| `MethodBadge` | Local Sub-Component | `src/routes/docs.tsx` | Local | Custom | Status or categorization pill |
| `StatusBadge` | Local Sub-Component | `src/routes/docs.tsx` | Local | Custom | Key KPI / quantitative metric card |
| `CopyButton` | Local Sub-Component | `src/routes/docs.tsx` | Local | Custom | Interactive action trigger |
| `SectionHeader` | Local Sub-Component | `src/routes/docs.tsx` | Local | Custom | Page or top navigation header |
| `InfoBox` | Local Sub-Component | `src/routes/docs.tsx` | Local | Custom | Local Component element for InfoBox |
| `EndpointCard` | Local Sub-Component | `src/routes/docs.tsx` | Local | Custom | Modular content container / card |

#### Page: Error 404 (`/error-404`)
- **Source File**: [`src/routes/error-404.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/error-404.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 1

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `NotFoundView` | Feedback | `@/components/error-pages/not-found-view` | Shared | Custom | Feedback element for NotFoundView |

#### Page: Error 500 (`/error-500`)
- **Source File**: [`src/routes/error-500.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/error-500.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 1

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `ServerErrorView` | Feedback | `@/components/error-pages/server-error-view` | Shared | Custom | Feedback element for ServerErrorView |

#### Page: Help Center (`/help-center`)
- **Source File**: [`src/routes/help-center.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/help-center.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **MEDIUM** | **Components Used**: 14

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `BookOpen` | Icon | `lucide-react` | Local | Library | Icon element for BookOpen |
| `ChevronRight` | Icon | `lucide-react` | Local | Library | Icon element for ChevronRight |
| `HelpCircle` | Icon | `lucide-react` | Local | Library | Icon element for HelpCircle |
| `LifeBuoy` | Icon | `lucide-react` | Local | Library | Icon element for LifeBuoy |
| `ThemeToggle` | Layout | `@/components/theme-toggle` | Shared | Custom | Layout element for ThemeToggle |

#### Page: Public Home (`/`)
- **Source File**: [`src/routes/index.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/index.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **MEDIUM** | **Components Used**: 12

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `MarketingLayout` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for MarketingLayout |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `Server` | Icon | `lucide-react` | Local | Library | Icon element for Server |
| `Lock` | Icon | `lucide-react` | Local | Library | Icon element for Lock |
| `Star` | Icon | `lucide-react` | Local | Library | Icon element for Star |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |

#### Page: Legal $slug (`/legal/:slug`)
- **Source File**: [`src/routes/legal.$slug.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/legal.$slug.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 3

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `MarketingLayout` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for MarketingLayout |
| `PageHero` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for PageHero |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |

#### Page: Maintenance (`/maintenance`)
- **Source File**: [`src/routes/maintenance.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/maintenance.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **MEDIUM** | **Components Used**: 13

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `MarketingLayout` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for MarketingLayout |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Home` | Icon | `lucide-react` | Local | Library | Icon element for Home |
| `LogIn` | Icon | `lucide-react` | Local | Library | Icon element for LogIn |
| `LifeBuoy` | Icon | `lucide-react` | Local | Library | Icon element for LifeBuoy |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `AlertCircle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `Calendar` | Data Display | `lucide-react` | Local | Library | Data Display element for Calendar |
| `RotateCw` | Icon | `lucide-react` | Local | Library | Icon element for RotateCw |
| `CountdownTimer` | Local Sub-Component | `src/routes/maintenance.tsx` | Local | Custom | Local Component element for CountdownTimer |

#### Page: Offline (`/offline`)
- **Source File**: [`src/routes/offline.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/offline.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 1

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `OfflineView` | Feedback | `@/components/error-pages/offline-view` | Shared | Custom | Feedback element for OfflineView |

#### Page: Og Preview (`/og-preview`)
- **Source File**: [`src/routes/og-preview.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/og-preview.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **MEDIUM** | **Components Used**: 20

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `MarketingLayout` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for MarketingLayout |
| `PageHero` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for PageHero |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardContent` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardHeader` | Data Display | `@/components/ui/card` | Shared | Library | Page or top navigation header |
| `CardTitle` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `CardDescription` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |
| `AlertTriangle` | Icon | `lucide-react` | Local | Library | Notification / warning feedback |
| `FileQuestion` | Icon | `lucide-react` | Local | Library | Icon element for FileQuestion |
| `ExternalLink` | Icon | `lucide-react` | Local | Library | Icon element for ExternalLink |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |
| `Code` | Icon | `lucide-react` | Local | Library | Icon element for Code |
| `ImageIcon` | Icon | `lucide-react` | Local | Library | Icon element for ImageIcon |
| `Link2` | Icon | `lucide-react` | Local | Library | Icon element for Link2 |

#### Page: P $slug (`/p/:slug`)
- **Source File**: [`src/routes/p.$slug.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/p.$slug.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 3

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `MarketingLayout` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for MarketingLayout |
| `PageHero` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for PageHero |
| `Loader2` | Icon | `lucide-react` | Local | Library | Asynchronous loading placeholder |

#### Page: Pricing (`/pricing`)
- **Source File**: [`src/routes/pricing.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/pricing.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **MEDIUM** | **Components Used**: 21

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Input` | Forms | `@/components/ui/input` | Shared | Library | Form data input field |
| `MarketingLayout` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for MarketingLayout |
| `PageHero` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for PageHero |
| `Check` | Icon | `lucide-react` | Local | Library | Icon element for Check |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `Flame` | Icon | `lucide-react` | Local | Library | Icon element for Flame |
| `Clock` | Icon | `lucide-react` | Local | Library | Icon element for Clock |
| `Users` | Icon | `lucide-react` | Local | Library | Icon element for Users |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `RefreshCw` | Icon | `lucide-react` | Local | Library | Icon element for RefreshCw |
| `Mail` | Icon | `lucide-react` | Local | Library | Icon element for Mail |
| `Phone` | Icon | `lucide-react` | Local | Library | Icon element for Phone |
| `MapPin` | Icon | `lucide-react` | Local | Library | Icon element for MapPin |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Calculator` | Icon | `lucide-react` | Local | Library | Icon element for Calculator |
| `Minus` | Icon | `lucide-react` | Local | Library | Icon element for Minus |
| `Plus` | Icon | `lucide-react` | Local | Library | Icon element for Plus |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |
| `SubscriptionCheckoutModal` | Business Component | `@/components/subscription/subscription-checkout-modal` | Shared | Custom | Modal dialog / popover overlay |

#### Page: Product (`/product`)
- **Source File**: [`src/routes/product.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/product.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 6

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `MarketingLayout` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for MarketingLayout |
| `PageHero` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for PageHero |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |

#### Page: Resources (`/resources`)
- **Source File**: [`src/routes/resources.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/resources.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 12

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `MarketingLayout` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for MarketingLayout |
| `PageHero` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for PageHero |
| `BookOpen` | Icon | `lucide-react` | Local | Library | Icon element for BookOpen |
| `FileText` | Icon | `lucide-react` | Local | Library | Icon element for FileText |
| `Newspaper` | Icon | `lucide-react` | Local | Library | Icon element for Newspaper |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `Globe` | Icon | `lucide-react` | Local | Library | Icon element for Globe |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `Card` | Data Display | `@/components/ui/card` | Shared | Library | Modular content container / card |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `Badge` | Data Display | `@/components/ui/badge` | Shared | Library | Status or categorization pill |

#### Page: Solutions (`/solutions`)
- **Source File**: [`src/routes/solutions.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/solutions.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 6

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `MarketingLayout` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for MarketingLayout |
| `PageHero` | Layout | `@/components/marketing/marketing-layout` | Shared | Custom | Layout element for PageHero |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
| `CheckCircle2` | Icon | `lucide-react` | Local | Library | Icon element for CheckCircle2 |

#### Page: Store (`/store`)
- **Source File**: [`src/routes/store.tsx`](file:///c:/Users/TSV Global Solutions/Documents/hrms/src/routes/store.tsx)
- **Layout**: MarketingLayout
- **Complexity**: **LOW** | **Components Used**: 10

| Component Name | Component Type | Source File / Package | Local/Shared | Library/Custom | Purpose |
|---|---|---|---|---|---|
| `Link` | Business Component | `@tanstack/react-router` | Local | Custom | Business Component element for Link |
| `Button` | Forms | `@/components/ui/button` | Shared | Library | Interactive action trigger |
| `CartDrawer` | Business Component | `@/components/storefront/cart-drawer` | Shared | Custom | Slide-out drawer panel |
| `ShoppingBag` | Icon | `lucide-react` | Local | Library | Icon element for ShoppingBag |
| `Search` | Icon | `lucide-react` | Local | Library | Icon element for Search |
| `ShieldCheck` | Icon | `lucide-react` | Local | Library | Icon element for ShieldCheck |
| `Truck` | Icon | `lucide-react` | Local | Library | Icon element for Truck |
| `Sparkles` | Icon | `lucide-react` | Local | Library | Icon element for Sparkles |
| `PhoneCall` | Icon | `lucide-react` | Local | Library | Icon element for PhoneCall |
| `ArrowRight` | Icon | `lucide-react` | Local | Library | Icon element for ArrowRight |
