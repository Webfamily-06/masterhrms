# 29 — Complete API & CRUD Registry

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering  
**Total Registered Endpoints:** 1629  
**Classification:** SOURCE-INSPECTED (Express Router AST Discovery)  
**Date:** November 19, 2026  

---

## 1. Executive Summary

The MASTERHRMS backend service layer exposes 1629 RESTful API endpoints across 122 route modules. All business mutations enforce role-based access control, tenant context injection via `tenantStorage`, request body validation, and structured error responses conforming to RFC 7807.

## 2. API Endpoints Catalog

| HTTP Method | API Endpoint Route | Functional Domain / Module | Auth Required | Required Permissions | Database Models | Tenant Scoped |
|---|---|---|---|---|---|---|
| **`GET`** | `/api/accounting/dashboard` | Double-Entry Accounting | ✅ Yes | `authenticated` | `chartOfAccount`, `journalItem`, `contract` | ✅ Yes |
| **`GET`** | `/api/accounting/accounts` | Double-Entry Accounting | ✅ Yes | `authenticated` | `chartOfAccount` | ✅ Yes |
| **`POST`** | `/api/accounting/accounts` | Double-Entry Accounting | ⚪ Public | `finance.accounts.create` | `chartOfAccount` | ✅ Yes |
| **`PUT`** | `/api/accounting/accounts/:id` | Double-Entry Accounting | ⚪ Public | `finance.accounts.edit` | `chartOfAccount` | ✅ Yes |
| **`DELETE`** | `/api/accounting/accounts/:id` | Double-Entry Accounting | ⚪ Public | `finance.accounts.delete` | `chartOfAccount` | ✅ Yes |
| **`GET`** | `/api/accounting/fiscal-years` | Double-Entry Accounting | ⚪ Public | `finance.accounts.view` | `fiscalYear` | ✅ Yes |
| **`POST`** | `/api/accounting/fiscal-years` | Double-Entry Accounting | ⚪ Public | `finance.accounts.manage` | `fiscalYear` | ✅ Yes |
| **`POST`** | `/api/accounting/fiscal-years/:id/periods` | Double-Entry Accounting | ⚪ Public | `finance.accounts.manage` | `fiscalYear`, `accountingPeriod` | ✅ Yes |
| **`POST`** | `/api/accounting/periods/:id/:action(close|reopen)` | Double-Entry Accounting | ⚪ Public | `finance.accounts.manage` | `accountingPeriod` | ✅ Yes |
| **`GET`** | `/api/accounting/journal-entries` | Double-Entry Accounting | ✅ Yes | `authenticated` | `journalEntry` | ✅ Yes |
| **`POST`** | `/api/accounting/journal-entries` | Double-Entry Accounting | ✅ Yes | `authenticated` | `journalEntry` | ✅ Yes |
| **`POST`** | `/api/accounting/journal-entries/:id/void` | Double-Entry Accounting | ✅ Yes | `authenticated` | `journalEntry` | ✅ Yes |
| **`POST`** | `/api/accounting/transfers` | Double-Entry Accounting | ✅ Yes | `authenticated` | `chartOfAccount`, `journalEntry` | ✅ Yes |
| **`GET`** | `/api/accounting/reports/financial-statements` | Double-Entry Accounting | ✅ Yes | `authenticated` | `chartOfAccount` | ✅ Yes |
| **`GET`** | `/api/accounting/reports/aging` | Double-Entry Accounting | ✅ Yes | `authenticated` | `sale`, `purchase`, `chartOfAccount` | ✅ Yes |
| **`GET`** | `/api/accounting/reports/trial-balance` | Double-Entry Accounting | ✅ Yes | `authenticated` | `chartOfAccount` | ✅ Yes |
| **`GET`** | `/api/accounting/reports/comparative-pnl` | Double-Entry Accounting | ✅ Yes | `authenticated` | `journalItem` | ✅ Yes |
| **`GET`** | `/api/accounting/reports/ledger/:accountId` | Double-Entry Accounting | ✅ Yes | `authenticated` | `chartOfAccount`, `journalItem` | ✅ Yes |
| **`GET`** | `/api/accounting/reports/inventory-valuation` | Double-Entry Accounting | ✅ Yes | `authenticated` | `product`, `chartOfAccount` | ✅ Yes |
| **`GET`** | `/api/accounting/export/quickbooks` | Double-Entry Accounting | ✅ Yes | `authenticated` | `sale` | ✅ Yes |
| **`GET`** | `/api/accounting/export/xero` | Double-Entry Accounting | ✅ Yes | `authenticated` | `sale` | ✅ Yes |
| **`POST`** | `/api/accounting/tally/preview` | Double-Entry Accounting | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/accounting/tally/import` | Double-Entry Accounting | ✅ Yes | `authenticated` | `chartOfAccount`, `journalEntry` | ✅ Yes |
| **`POST`** | `/api/accounting/reconcile` | Double-Entry Accounting | ✅ Yes | `authenticated` | `chartOfAccount`, `journalItem`, `journalEntry` | ✅ Yes |
| **`GET`** | `/api/addons/entitlements` | Add-on Marketplace | ✅ Yes | `authenticated` | `tenantAddon` | ✅ Yes |
| **`POST`** | `/api/addons/:addonSlug/trial` | Add-on Marketplace | ✅ Yes | `authenticated` | `tenantAddon` | ✅ Yes |
| **`POST`** | `/api/addons/:addonSlug/subscribe` | Add-on Marketplace | ✅ Yes | `authenticated` | `tenantAddon` | ✅ Yes |
| **`POST`** | `/api/addons/:addonSlug/cancel` | Add-on Marketplace | ✅ Yes | `authenticated` | `tenantAddon` | ✅ Yes |
| **`GET`** | `/api/adjustments` | Inventory Adjustments | ✅ Yes | `authenticated` | `stockAdjustment` | ✅ Yes |
| **`GET`** | `/api/adjustments/:id` | Inventory Adjustments | ✅ Yes | `authenticated` | `stockAdjustment` | ✅ Yes |
| **`POST`** | `/api/adjustments` | Inventory Adjustments | ✅ Yes | `authenticated` | `warehouse`, `product` | ✅ Yes |
| **`GET`** | `/api/ai/settings` | AI & Intelligence Services | ✅ Yes | `authenticated` | `cmsPage` | ✅ Yes |
| **`POST`** | `/api/ai/settings` | AI & Intelligence Services | ✅ Yes | `authenticated` | `cmsPage` | ✅ Yes |
| **`POST`** | `/api/ai/generate-content` | AI & Intelligence Services | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/ai/quick-templates` | AI & Intelligence Services | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/ai/ask` | AI & Intelligence Services | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/ai/ocr/extract` | AI & Intelligence Services | ✅ Yes | `authenticated` | `cmsPage` | ✅ Yes |
| **`POST`** | `/api/ai/ocr/save` | AI & Intelligence Services | ✅ Yes | `authenticated` | `warehouse`, `product`, `supplier` | ✅ Yes |
| **`GET`** | `/api/ai/hiring-forecast` | AI & Intelligence Services | ✅ Yes | `authenticated` | `jobPosting`, `jobCandidate`, `employee` | ✅ Yes |
| **`GET`** | `/api/alerts/config` | Alerts & Notifications | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/alerts/config` | Alerts & Notifications | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/alerts/history` | Alerts & Notifications | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/alerts/test` | Alerts & Notifications | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/alerts/whatsapp/send` | Alerts & Notifications | ✅ Yes | `authenticated` | `cmsPage` | ✅ Yes |
| **`POST`** | `/api/alerts/whatsapp` | Alerts & Notifications | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/alerts/whatsapp/simulate` | Alerts & Notifications | ✅ Yes | `authenticated` | `payslip`, `leaveRequest`, `sale` | ✅ Yes |
| **`GET`** | `/api/alerts/whatsapp/webhook/:tenantId` | Alerts & Notifications | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/alerts/whatsapp/webhook/:tenantId` | Alerts & Notifications | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/announcements` | Company Announcements | ⚪ Public | `authenticated` | `announcement` | ✅ Yes |
| **`GET`** | `/api/announcements/summary/stats` | Company Announcements | ⚪ Public | `authenticated` | `announcement`, `employee` | ✅ Yes |
| **`GET`** | `/api/announcements/:id` | Company Announcements | ⚪ Public | `authenticated` | `announcement` | ✅ Yes |
| **`POST`** | `/api/announcements` | Company Announcements | ⚪ Public | `authenticated` | `announcement` | ✅ Yes |
| **`PUT`** | `/api/announcements/:id` | Company Announcements | ⚪ Public | `authenticated` | `announcement` | ✅ Yes |
| **`DELETE`** | `/api/announcements/:id` | Company Announcements | ⚪ Public | `authenticated` | `announcement` | ✅ Yes |
| **`POST`** | `/api/announcements/:id/acknowledge` | Company Announcements | ⚪ Public | `authenticated` | `announcementAcknowledgement` | ✅ Yes |
| **`GET`** | `/api/v1/public/app-config` | Application Configuration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/public/app-config` | Application Configuration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/app-config` | Application Configuration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/addons/assets/public/tag/:assetTag` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `asset` | ⚪ Global |
| **`GET`** | `/api/addons/assets/categories` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `assetCategory` | ✅ Yes |
| **`POST`** | `/api/addons/assets/categories` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `assetCategory`, `assetActivityLog` | ✅ Yes |
| **`DELETE`** | `/api/addons/assets/categories/:id` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `assetCategory` | ⚪ Global |
| **`GET`** | `/api/addons/assets` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `asset` | ✅ Yes |
| **`POST`** | `/api/addons/assets` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `asset`, `assetActivityLog` | ✅ Yes |
| **`POST`** | `/api/addons/assets/:id/allocate` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `asset`, `assetAssignment`, `assetActivityLog` | ✅ Yes |
| **`POST`** | `/api/addons/assets/assignments/:assignmentId/return` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `assetAssignment`, `asset`, `assetActivityLog` | ✅ Yes |
| **`GET`** | `/api/addons/assets/requests` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `assetRequest` | ✅ Yes |
| **`POST`** | `/api/addons/assets/requests` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `assetRequest`, `assetActivityLog` | ✅ Yes |
| **`POST`** | `/api/addons/assets/requests/:id/review` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `assetRequest`, `assetActivityLog` | ✅ Yes |
| **`GET`** | `/api/addons/assets/disposals` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `assetDisposalBatch` | ✅ Yes |
| **`POST`** | `/api/addons/assets/disposals` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `assetDisposalBatch` | ✅ Yes |
| **`POST`** | `/api/addons/assets/disposals/:id/approve` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `assetDisposalBatch`, `asset`, `assetActivityLog` | ✅ Yes |
| **`GET`** | `/api/addons/assets/reports` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `assetAssignment`, `asset` | ✅ Yes |
| **`GET`** | `/api/addons/assets/activity` | Asset Management & QR Tracking | ✅ Yes | `authenticated` | `assetActivityLog` | ✅ Yes |
| **`GET`** | `/api/attendance` | Attendance & IoT Biometrics | ✅ Yes | `authenticated` | `employee`, `attendance` | ✅ Yes |
| **`POST`** | `/api/attendance` | Attendance & IoT Biometrics | ✅ Yes | `authenticated` | `attendance` | ✅ Yes |
| **`POST`** | `/api/attendance/punch` | Attendance & IoT Biometrics | ✅ Yes | `authenticated` | `employee`, `warehouse`, `attendance` | ✅ Yes |
| **`POST`** | `/api/attendance/check-in` | Attendance & IoT Biometrics | ✅ Yes | `authenticated` | `employee`, `attendance`, `shiftRoster` | ✅ Yes |
| **`POST`** | `/api/attendance/check-out` | Attendance & IoT Biometrics | ✅ Yes | `authenticated` | `employee`, `attendance` | ✅ Yes |
| **`POST`** | `/api/attendance/regularize` | Attendance & IoT Biometrics | ✅ Yes | `authenticated` | `employee`, `attendance` | ✅ Yes |
| **`POST`** | `/api/attendance/reconcile` | Attendance & IoT Biometrics | ✅ Yes | `authenticated` | `employee`, `attendance`, `leaveRequest` | ✅ Yes |
| **`GET`** | `/api/attendance/daily-report` | Attendance & IoT Biometrics | ✅ Yes | `authenticated` | `attendance`, `projectTask` | ✅ Yes |
| **`GET`** | `/api/auth/public/tenant/resolve` | Authentication & RBAC | ⚪ Public | `authenticated` | `tenant` | ⚪ Global |
| **`GET`** | `/api/auth/public/tenant-branding` | Authentication & RBAC | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/auth/public/tenant/credentials` | Authentication & RBAC | ⚪ Public | `authenticated` | `tenant`, `userRole` | ✅ Yes |
| **`POST`** | `/api/auth/register` | Authentication & RBAC | ⚪ Public | `authenticated` | `user`, `tenant` | ✅ Yes |
| **`POST`** | `/api/auth/unlock` | Authentication & RBAC | ⚪ Public | `authenticated` | `user` | ✅ Yes |
| **`POST`** | `/api/auth/login` | Authentication & RBAC | ⚪ Public | `authenticated` | `user`, `tenant`, `tenantDomain` | ✅ Yes |
| **`POST`** | `/api/auth/forgot-password` | Authentication & RBAC | ⚪ Public | `authenticated` | `user`, `tenant` | ✅ Yes |
| **`POST`** | `/api/auth/reset-password` | Authentication & RBAC | ⚪ Public | `authenticated` | `user` | ⚪ Global |
| **`POST`** | `/api/auth/verify-email` | Authentication & RBAC | ⚪ Public | `authenticated` | `user` | ⚪ Global |
| **`POST`** | `/api/auth/resend-verification` | Authentication & RBAC | ⚪ Public | `authenticated` | `user` | ⚪ Global |
| **`POST`** | `/api/auth/2fa/verify-login` | Authentication & RBAC | ✅ Yes | `authenticated` | `user`, `tenant`, `tenantDomain` | ✅ Yes |
| **`POST`** | `/api/auth/2fa/resend` | Authentication & RBAC | ⚪ Public | `authenticated` | `user` | ⚪ Global |
| **`GET`** | `/api/auth/2fa/status` | Authentication & RBAC | ✅ Yes | `authenticated` | `user` | ⚪ Global |
| **`POST`** | `/api/auth/2fa/setup-initiate` | Authentication & RBAC | ✅ Yes | `authenticated` | `user` | ⚪ Global |
| **`POST`** | `/api/auth/2fa/setup-confirm` | Authentication & RBAC | ✅ Yes | `authenticated` | `user` | ⚪ Global |
| **`GET`** | `/api/auth/me` | Authentication & RBAC | ✅ Yes | `authenticated` | `user`, `tenantModule`, `permission` | ✅ Yes |
| **`POST`** | `/api/auth/claim-super-admin` | Authentication & RBAC | ✅ Yes | `authenticated` | `userRole` | ⚪ Global |
| **`POST`** | `/api/auth/bootstrap-tenant` | Authentication & RBAC | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/auth/profile` | Authentication & RBAC | ✅ Yes | `authenticated` | `profile`, `user`, `cmsPage` | ⚪ Global |
| **`GET`** | `/api/auth/oauth/config` | Authentication & RBAC | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/auth/oauth/:provider` | Authentication & RBAC | ⚪ Public | `authenticated` | `user` | ✅ Yes |
| **`GET`** | `/api/auth/oauth/:provider/callback` | Authentication & RBAC | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/auth/oauth/:provider/callback` | Authentication & RBAC | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`PUT`** | `/api/auth/tenant` | Authentication & RBAC | ✅ Yes | `authenticated` | `tenant` | ✅ Yes |
| **`POST`** | `/api/auth/change-password` | Authentication & RBAC | ✅ Yes | `authenticated` | `user` | ⚪ Global |
| **`GET`** | `/api/awards/types` | Employee Awards & Recognition | ⚪ Public | `authenticated` | `awardType` | ✅ Yes |
| **`POST`** | `/api/awards/types` | Employee Awards & Recognition | ⚪ Public | `authenticated` | `awardType` | ✅ Yes |
| **`GET`** | `/api/awards` | Employee Awards & Recognition | ⚪ Public | `authenticated` | `award` | ✅ Yes |
| **`POST`** | `/api/awards` | Employee Awards & Recognition | ⚪ Public | `authenticated` | `award` | ✅ Yes |
| **`PUT`** | `/api/awards/:id` | Employee Awards & Recognition | ⚪ Public | `authenticated` | `award` | ✅ Yes |
| **`DELETE`** | `/api/awards/:id` | Employee Awards & Recognition | ⚪ Public | `authenticated` | `award` | ✅ Yes |
| **`GET`** | `/api/payroll/disbursement/banks` | Bank NACH / NEFT Disbursement | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/payroll/disbursement/batches` | Bank NACH / NEFT Disbursement | ⚪ Public | `authenticated` | `bankDisbursementBatch` | ✅ Yes |
| **`GET`** | `/api/payroll/disbursement/batches/:id` | Bank NACH / NEFT Disbursement | ⚪ Public | `authenticated` | `bankDisbursementBatch` | ✅ Yes |
| **`POST`** | `/api/payroll/disbursement/batches` | Bank NACH / NEFT Disbursement | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/payroll/disbursement/batches/:id/approve` | Bank NACH / NEFT Disbursement | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/payroll/disbursement/batches/:id/generate` | Bank NACH / NEFT Disbursement | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/payroll/disbursement/batches/:id/download` | Bank NACH / NEFT Disbursement | ⚪ Public | `authenticated` | `bankDisbursementBatch` | ✅ Yes |
| **`GET`** | `/api/payroll/disbursement/batches/:id/signature` | Bank NACH / NEFT Disbursement | ⚪ Public | `authenticated` | `bankDisbursementBatch` | ✅ Yes |
| **`POST`** | `/api/payroll/disbursement/batches/:id/verify-signature` | Bank NACH / NEFT Disbursement | ⚪ Public | `authenticated` | `bankDisbursementBatch` | ✅ Yes |
| **`POST`** | `/api/payroll/disbursement/batches/:id/disburse` | Bank NACH / NEFT Disbursement | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/payroll/disbursement/batches/:id/cancel` | Bank NACH / NEFT Disbursement | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/billing/durations` | Billing & Subscriptions | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/billing/public-plans` | Billing & Subscriptions | ⚪ Public | `authenticated` | `cmsPage`, `subscriptionPlan` | ⚪ Global |
| **`POST`** | `/api/billing/calculate` | Billing & Subscriptions | ⚪ Public | `authenticated` | `subscriptionPlan` | ✅ Yes |
| **`POST`** | `/api/billing/validate-coupon` | Billing & Subscriptions | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/billing/plans` | Billing & Subscriptions | ✅ Yes | `authenticated` | `subscriptionPlan`, `tenantSubscription` | ✅ Yes |
| **`GET`** | `/api/billing/preview` | Billing & Subscriptions | ✅ Yes | `authenticated` | `subscriptionPlan`, `tenantSubscription` | ✅ Yes |
| **`POST`** | `/api/billing/change-plan` | Billing & Subscriptions | ✅ Yes | `authenticated` | `subscriptionPlan`, `tenantSubscription`, `billingInvoice` | ✅ Yes |
| **`POST`** | `/api/billing/trial-activate` | Billing & Subscriptions | ✅ Yes | `authenticated` | `subscriptionPlan`, `tenantSubscription` | ✅ Yes |
| **`POST`** | `/api/billing/checkout` | Billing & Subscriptions | ✅ Yes | `authenticated` | `billingInvoice` | ✅ Yes |
| **`POST`** | `/api/billing/verify` | Billing & Subscriptions | ✅ Yes | `authenticated` | `billingInvoice`, `paymentGatewayTransaction`, `coupon` | ✅ Yes |
| **`POST`** | `/api/billing/submit-offline-payment` | Billing & Subscriptions | ✅ Yes | `authenticated` | `billingInvoice`, `tenantSubscription`, `subscriptionPlan` | ✅ Yes |
| **`POST`** | `/api/billing/retry/:invoiceId` | Billing & Subscriptions | ✅ Yes | `authenticated` | `billingInvoice` | ✅ Yes |
| **`GET`** | `/api/billing/invoices` | Billing & Subscriptions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/billing/webhook` | Billing & Subscriptions | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/biometric/devices` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricDevice` | ✅ Yes |
| **`GET`** | `/api/biometric/cloud-config` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `tenant` | ✅ Yes |
| **`GET`** | `/api/biometric/summary/stats` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricDevice`, `biometricPunchLog` | ✅ Yes |
| **`GET`** | `/api/biometric/devices/:id/passport` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricDevice`, `biometricPunchLog` | ✅ Yes |
| **`POST`** | `/api/biometric/devices/:id/sync-now` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricDevice` | ✅ Yes |
| **`GET`** | `/api/biometric/devices/:id/hardware-users` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricDevice`, `employee` | ✅ Yes |
| **`POST`** | `/api/biometric/devices/:id/apply-sync` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricDevice`, `employee`, `biometricPunchLog` | ✅ Yes |
| **`POST`** | `/api/biometric/devices/:id/map-employee` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `employee`, `biometricPunchLog` | ✅ Yes |
| **`GET`** | `/api/biometric/logs` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricPunchLog` | ✅ Yes |
| **`POST`** | `/api/biometric/probe` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricDevice` | ✅ Yes |
| **`POST`** | `/api/biometric/devices` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricDevice` | ✅ Yes |
| **`PUT`** | `/api/biometric/devices/:id` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricDevice` | ⚪ Global |
| **`DELETE`** | `/api/biometric/devices/:id` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricDevice` | ⚪ Global |
| **`POST`** | `/api/biometric/devices/:id/ping` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricDevice` | ⚪ Global |
| **`POST`** | `/api/biometric/simulate` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `tenant`, `biometricDevice` | ✅ Yes |
| **`POST`** | `/api/biometric/matrix/push` | Biometric Hardware Sync (ZKTeco) | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/biometric/devices/:id/mappings` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricDevice`, `biometricEmployeeMapping` | ✅ Yes |
| **`POST`** | `/api/biometric/devices/:id/mappings` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricDevice`, `biometricEmployeeMapping`, `biometricPunchLog` | ✅ Yes |
| **`PUT`** | `/api/biometric/devices/:id/mappings/:mappingId` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricEmployeeMapping` | ✅ Yes |
| **`DELETE`** | `/api/biometric/devices/:id/mappings/:mappingId` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricEmployeeMapping` | ✅ Yes |
| **`GET`** | `/api/biometric/offline-buffer` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricOfflineBuffer` | ✅ Yes |
| **`POST`** | `/api/biometric/offline-buffer/replay` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricOfflineBuffer` | ✅ Yes |
| **`POST`** | `/api/public/biometric/push` | Biometric Hardware Sync (ZKTeco) | ✅ Yes | `authenticated` | `biometricDevice`, `biometricEmployeeMapping`, `biometricPunchLog` | ✅ Yes |
| **`GET`** | `/api/budgets` | Financial Budgets | ⚪ Public | `authenticated` | `budgetPlan` | ✅ Yes |
| **`GET`** | `/api/budgets/summary` | Financial Budgets | ⚪ Public | `authenticated` | `budgetPlan` | ✅ Yes |
| **`POST`** | `/api/budgets` | Financial Budgets | ⚪ Public | `authenticated` | `budgetPlan` | ✅ Yes |
| **`PUT`** | `/api/budgets/:id` | Financial Budgets | ⚪ Public | `authenticated` | `budgetPlan` | ✅ Yes |
| **`DELETE`** | `/api/budgets/:id` | Financial Budgets | ⚪ Public | `authenticated` | `budgetPlan` | ✅ Yes |
| **`GET`** | `/api/calendar/events` | Company Calendar | ⚪ Public | `authenticated` | `calendarEvent` | ✅ Yes |
| **`POST`** | `/api/calendar/events` | Company Calendar | ⚪ Public | `authenticated` | `calendarEvent` | ✅ Yes |
| **`PUT`** | `/api/calendar/events/:id` | Company Calendar | ⚪ Public | `authenticated` | `calendarEvent` | ✅ Yes |
| **`DELETE`** | `/api/calendar/events/:id` | Company Calendar | ⚪ Public | `authenticated` | `calendarEvent` | ✅ Yes |
| **`POST`** | `/api/calendar/google-sync` | Company Calendar | ⚪ Public | `authenticated` | `calendarEvent` | ✅ Yes |
| **`GET`** | `/api/calendar/google-sync/status` | Company Calendar | ⚪ Public | `authenticated` | `calendarEvent` | ✅ Yes |
| **`GET`** | `/api/campaigns` | CRM Marketing Campaigns | ⚪ Public | `authenticated` | `marketingCampaign` | ✅ Yes |
| **`POST`** | `/api/campaigns` | CRM Marketing Campaigns | ⚪ Public | `authenticated` | `marketingCampaign` | ✅ Yes |
| **`PUT`** | `/api/campaigns/:id` | CRM Marketing Campaigns | ⚪ Public | `authenticated` | `marketingCampaign` | ✅ Yes |
| **`PATCH`** | `/api/campaigns/:id/status` | CRM Marketing Campaigns | ⚪ Public | `authenticated` | `marketingCampaign` | ✅ Yes |
| **`DELETE`** | `/api/campaigns/:id` | CRM Marketing Campaigns | ⚪ Public | `authenticated` | `marketingCampaign` | ✅ Yes |
| **`GET`** | `/api/chat/file-policy` | Internal Team Chat | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/chat/messages/:threadId` | Internal Team Chat | ✅ Yes | `authenticated` | `chatMessage` | ✅ Yes |
| **`POST`** | `/api/chat/messages` | Internal Team Chat | ✅ Yes | `authenticated` | `chatMessage` | ✅ Yes |
| **`GET`** | `/api/client/my-profile` | Client External Portal | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/client/my-invoices` | Client External Portal | ✅ Yes | `authenticated` | `sale` | ✅ Yes |
| **`GET`** | `/api/client/my-projects` | Client External Portal | ⚪ Public | `authenticated` | `project` | ✅ Yes |
| **`POST`** | `/api/client/invoices/:id/pay` | Client External Portal | ⚪ Public | `authenticated` | `sale` | ✅ Yes |
| **`POST`** | `/api/client/invoices/:id/confirm-payment` | Client External Portal | ⚪ Public | `authenticated` | `sale` | ✅ Yes |
| **`GET`** | `/api/client/my-projects/:id/milestones` | Client External Portal | ⚪ Public | `authenticated` | `project`, `projectMilestone` | ✅ Yes |
| **`POST`** | `/api/client/my-projects/:id/milestones/:mid/sign-off` | Client External Portal | ⚪ Public | `authenticated` | `project`, `projectMilestone` | ✅ Yes |
| **`GET`** | `/api/cms/pages` | Content Management & Pages | ⚪ Public | `authenticated` | `cmsPage` | ⚪ Global |
| **`POST`** | `/api/cms/pages/:slug/publish` | Content Management & Pages | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`DELETE`** | `/api/cms/pages/:slug` | Content Management & Pages | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`GET`** | `/api/cms/addons` | Content Management & Pages | ⚪ Public | `authenticated` | `addon`, `cmsPage` | ⚪ Global |
| **`GET`** | `/api/cms/faqs` | Content Management & Pages | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/cms/faqs` | Content Management & Pages | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`PUT`** | `/api/cms/faqs/:id` | Content Management & Pages | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`DELETE`** | `/api/cms/faqs/:id` | Content Management & Pages | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`PATCH`** | `/api/cms/faqs/reorder` | Content Management & Pages | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`GET`** | `/api/cms/testimonials` | Content Management & Pages | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/cms/testimonials` | Content Management & Pages | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`PUT`** | `/api/cms/testimonials/:id` | Content Management & Pages | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`DELETE`** | `/api/cms/testimonials/:id` | Content Management & Pages | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`PATCH`** | `/api/cms/testimonials/reorder` | Content Management & Pages | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`GET`** | `/api/v1/company-profile` | Company Profile & GST | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/company-profile` | Company Profile & GST | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/company-profile` | Company Profile & GST | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/company-profile` | Company Profile & GST | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/company-profile/gst` | Company Profile & GST | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/company-profile/gst` | Company Profile & GST | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/company-profile/gst` | Company Profile & GST | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/company-profile/gst` | Company Profile & GST | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/company-profile/tenant/:tenantId` | Company Profile & GST | ✅ Yes | `authenticated` | `tenant` | ✅ Yes |
| **`GET`** | `/api/company-profile/tenant/:tenantId` | Company Profile & GST | ✅ Yes | `authenticated` | `tenant` | ✅ Yes |
| **`GET`** | `/api/v1/company-profile/tenant/:tenantId/gst` | Company Profile & GST | ✅ Yes | `authenticated` | `tenant` | ✅ Yes |
| **`GET`** | `/api/company-profile/tenant/:tenantId/gst` | Company Profile & GST | ✅ Yes | `authenticated` | `tenant` | ✅ Yes |
| **`GET`** | `/api/v1/company-profile/identity` | Company Profile & GST | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/company-profile/identity` | Company Profile & GST | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/company-profile/tenant/:tenantId/identity` | Company Profile & GST | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/company-profile/tenant/:tenantId/identity` | Company Profile & GST | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/compliance/rules-config` | Statutory Compliance Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/compliance/forms/eligibility` | Statutory Compliance Engine | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/compliance/forms/:formCode/eligibility` | Statutory Compliance Engine | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/crm/leads` | CRM Sales Pipelines & Leads | ✅ Yes | `crm.leads.view` | `crmLead` | ✅ Yes |
| **`POST`** | `/api/crm/leads` | CRM Sales Pipelines & Leads | ✅ Yes | `crm.leads.create` | `crmLead` | ✅ Yes |
| **`PUT`** | `/api/crm/leads/:id` | CRM Sales Pipelines & Leads | ✅ Yes | `crm.leads.edit` | `crmLead` | ✅ Yes |
| **`DELETE`** | `/api/crm/leads/:id` | CRM Sales Pipelines & Leads | ✅ Yes | `crm.leads.delete` | `crmLead` | ✅ Yes |
| **`GET`** | `/api/crm/deals` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmDeal` | ✅ Yes |
| **`GET`** | `/api/crm/deals/:id` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmDeal` | ✅ Yes |
| **`POST`** | `/api/crm/deals` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmDeal` | ✅ Yes |
| **`PUT`** | `/api/crm/deals/:id` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmDeal` | ✅ Yes |
| **`PATCH`** | `/api/crm/deals/:id/stage` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmDeal` | ✅ Yes |
| **`DELETE`** | `/api/crm/deals/:id` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmDeal` | ✅ Yes |
| **`GET`** | `/api/crm/proposals` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmProposal` | ✅ Yes |
| **`POST`** | `/api/crm/proposals` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmProposal` | ✅ Yes |
| **`PATCH`** | `/api/crm/proposals/:id` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmProposal` | ✅ Yes |
| **`POST`** | `/api/crm/proposals/:id/convert` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmProposal`, `sale` | ✅ Yes |
| **`POST`** | `/api/crm/proposals/:id/convert-to-project` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmProposal` | ✅ Yes |
| **`DELETE`** | `/api/crm/proposals/:id` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmProposal` | ✅ Yes |
| **`GET`** | `/api/crm/proposals/public/:id` | CRM Sales Pipelines & Leads | ⚪ Public | `authenticated` | `crmProposal` | ⚪ Global |
| **`POST`** | `/api/crm/proposals/public/:id/respond` | CRM Sales Pipelines & Leads | ⚪ Public | `authenticated` | `crmProposal` | ✅ Yes |
| **`GET`** | `/api/crm/contacts` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmContact` | ✅ Yes |
| **`POST`** | `/api/crm/contacts` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmContact` | ✅ Yes |
| **`PUT`** | `/api/crm/contacts/:id` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmContact` | ✅ Yes |
| **`DELETE`** | `/api/crm/contacts/:id` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmContact` | ✅ Yes |
| **`GET`** | `/api/crm/companies` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmCompany` | ✅ Yes |
| **`POST`** | `/api/crm/companies` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmCompany` | ✅ Yes |
| **`PUT`** | `/api/crm/companies/:id` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmCompany` | ✅ Yes |
| **`DELETE`** | `/api/crm/companies/:id` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `crmCompany` | ✅ Yes |
| **`GET`** | `/api/crm/calls` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `callHistoryRecord` | ✅ Yes |
| **`POST`** | `/api/crm/calls` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `callHistoryRecord` | ✅ Yes |
| **`DELETE`** | `/api/crm/calls/:id` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `callHistoryRecord` | ✅ Yes |
| **`POST`** | `/api/crm/calls/bulk-delete` | CRM Sales Pipelines & Leads | ✅ Yes | `authenticated` | `callHistoryRecord` | ✅ Yes |
| **`GET`** | `/api/custom-fields` | Custom Dynamic Fields | ⚪ Public | `authenticated` | `customField` | ✅ Yes |
| **`POST`** | `/api/custom-fields` | Custom Dynamic Fields | ⚪ Public | `authenticated` | `customField` | ✅ Yes |
| **`PUT`** | `/api/custom-fields/:id` | Custom Dynamic Fields | ⚪ Public | `authenticated` | `customField` | ✅ Yes |
| **`DELETE`** | `/api/custom-fields/:id` | Custom Dynamic Fields | ⚪ Public | `authenticated` | `customField` | ✅ Yes |
| **`GET`** | `/api/custom-fields/values/:entityId` | Custom Dynamic Fields | ⚪ Public | `authenticated` | `customFieldValue` | ✅ Yes |
| **`POST`** | `/api/custom-fields/values/:entityId` | Custom Dynamic Fields | ⚪ Public | `authenticated` | `customFieldValue` | ✅ Yes |
| **`GET`** | `/api/customers` | Customer Master Data | ✅ Yes | `authenticated` | `customer` | ✅ Yes |
| **`GET`** | `/api/customers/ar-summary` | Customer Master Data | ✅ Yes | `authenticated` | `sale` | ✅ Yes |
| **`GET`** | `/api/customers/:id` | Customer Master Data | ✅ Yes | `authenticated` | `customer` | ✅ Yes |
| **`GET`** | `/api/customers/:id/payments` | Customer Master Data | ✅ Yes | `authenticated` | `customer`, `sale`, `salePayment` | ✅ Yes |
| **`POST`** | `/api/customers` | Customer Master Data | ✅ Yes | `authenticated` | `customer` | ✅ Yes |
| **`PUT`** | `/api/customers/:id` | Customer Master Data | ✅ Yes | `authenticated` | `customer` | ✅ Yes |
| **`DELETE`** | `/api/customers/:id` | Customer Master Data | ✅ Yes | `authenticated` | `customer` | ✅ Yes |
| **`GET`** | `/api/dashboard/hrm-hub` | Aggregated Analytics Dashboard | ⚪ Public | `authenticated` | `employee`, `attendance`, `leaveRequest` | ✅ Yes |
| **`GET`** | `/api/dashboard/hrm` | Aggregated Analytics Dashboard | ⚪ Public | `authenticated` | `employee`, `attendance`, `leaveRequest` | ✅ Yes |
| **`GET`** | `/api/dashboard/pos` | Aggregated Analytics Dashboard | ✅ Yes | `authenticated` | `sale`, `saleDetail`, `productCategory` | ✅ Yes |
| **`GET`** | `/api/dashboard/inventory` | Aggregated Analytics Dashboard | ✅ Yes | `authenticated` | `product`, `warehouse`, `productCategory` | ✅ Yes |
| **`GET`** | `/api/dashboard/sales-crm` | Aggregated Analytics Dashboard | ✅ Yes | `authenticated` | `customer`, `sale` | ✅ Yes |
| **`GET`** | `/api/dashboard/finance` | Aggregated Analytics Dashboard | ✅ Yes | `authenticated` | `sale`, `expenseClaim`, `expenseCategory` | ✅ Yes |
| **`GET`** | `/api/dashboard/projects` | Aggregated Analytics Dashboard | ✅ Yes | `authenticated` | `project`, `projectTask` | ✅ Yes |
| **`GET`** | `/api/dashboard/analytics` | Aggregated Analytics Dashboard | ✅ Yes | `authenticated` | `sale`, `productCategory` | ✅ Yes |
| **`GET`** | `/api/dashboard/summary` | Aggregated Analytics Dashboard | ✅ Yes | `authenticated` | `employee` | ✅ Yes |
| **`GET`** | `/api/dashboard/procurement` | Aggregated Analytics Dashboard | ⚪ Public | `authenticated` | `purchase`, `supplier` | ✅ Yes |
| **`GET`** | `/api/dashboard/support` | Aggregated Analytics Dashboard | ⚪ Public | `authenticated` | `helpdeskTicket` | ✅ Yes |
| **`GET`** | `/api/dashboard/it-admin` | Aggregated Analytics Dashboard | ⚪ Public | `authenticated` | `asset` | ✅ Yes |
| **`GET`** | `/api/dashboard/recruitment` | Aggregated Analytics Dashboard | ⚪ Public | `authenticated` | `jobPosting`, `jobCandidate` | ✅ Yes |
| **`GET`** | `/api/docs/metadata` | Developer Documentation & API Matrix | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/docs/execute` | Developer Documentation & API Matrix | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/documents` | Document Vault & Policies | ✅ Yes | `authenticated` | `companyDocument` | ✅ Yes |
| **`POST`** | `/api/documents` | Document Vault & Policies | ✅ Yes | `authenticated` | `companyDocument` | ✅ Yes |
| **`GET`** | `/api/documents/:id` | Document Vault & Policies | ✅ Yes | `authenticated` | `companyDocument` | ✅ Yes |
| **`POST`** | `/api/documents/:id/sign` | Document Vault & Policies | ✅ Yes | `authenticated` | `companyDocument` | ✅ Yes |
| **`PUT`** | `/api/documents/:id/verify` | Document Vault & Policies | ✅ Yes | `authenticated` | `companyDocument` | ✅ Yes |
| **`DELETE`** | `/api/documents/:id` | Document Vault & Policies | ✅ Yes | `authenticated` | `companyDocument` | ✅ Yes |
| **`GET`** | `/api/documents/summary/stats` | Document Vault & Policies | ✅ Yes | `authenticated` | `companyDocument` | ✅ Yes |
| **`GET`** | `/api/documents/:id/stream` | Document Vault & Policies | ✅ Yes | `authenticated` | `storedDocument` | ✅ Yes |
| **`GET`** | `/api/ecommerce/status` | E-Commerce Integrations | ✅ Yes | `authenticated` | `product` | ✅ Yes |
| **`POST`** | `/api/ecommerce/test/woocommerce` | E-Commerce Integrations | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/ecommerce/test/shopify` | E-Commerce Integrations | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/ecommerce/save-config` | E-Commerce Integrations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/ecommerce/sync/woocommerce` | E-Commerce Integrations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/ecommerce/sync/shopify` | E-Commerce Integrations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/ecommerce/sync/all` | E-Commerce Integrations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/profile` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employee` | ✅ Yes |
| **`GET`** | `/api/me/profile` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employee` | ✅ Yes |
| **`PUT`** | `/api/v1/me/profile` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employee` | ⚪ Global |
| **`PUT`** | `/api/me/profile` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employee` | ⚪ Global |
| **`POST`** | `/api/v1/me/profile/change-requests` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employee`, `employeeChangeRequest` | ✅ Yes |
| **`POST`** | `/api/me/profile/change-requests` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employee`, `employeeChangeRequest` | ✅ Yes |
| **`GET`** | `/api/v1/me/profile/change-requests` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employeeChangeRequest` | ⚪ Global |
| **`GET`** | `/api/me/profile/change-requests` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employeeChangeRequest` | ⚪ Global |
| **`GET`** | `/api/v1/me/dashboard` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `attendance`, `announcement`, `award` | ✅ Yes |
| **`GET`** | `/api/me/dashboard` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `attendance`, `announcement`, `award` | ✅ Yes |
| **`POST`** | `/api/v1/me/attendance/check-in` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `attendance` | ✅ Yes |
| **`POST`** | `/api/me/attendance/check-in` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `attendance` | ✅ Yes |
| **`POST`** | `/api/v1/me/attendance/check-out` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `attendance` | ✅ Yes |
| **`POST`** | `/api/me/attendance/check-out` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `attendance` | ✅ Yes |
| **`GET`** | `/api/v1/me/regularizations` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `attendanceRegularization` | ⚪ Global |
| **`GET`** | `/api/me/regularizations` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `attendanceRegularization` | ⚪ Global |
| **`POST`** | `/api/v1/me/regularizations` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `attendanceRegularization` | ✅ Yes |
| **`POST`** | `/api/me/regularizations` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `attendanceRegularization` | ✅ Yes |
| **`POST`** | `/api/v1/me/regularizations/:id/withdraw` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `attendanceRegularization` | ⚪ Global |
| **`POST`** | `/api/me/regularizations/:id/withdraw` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `attendanceRegularization` | ⚪ Global |
| **`POST`** | `/api/v1/me/leaves/validate` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `leaveRequest` | ✅ Yes |
| **`POST`** | `/api/me/leaves/validate` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `leaveRequest` | ✅ Yes |
| **`GET`** | `/api/v1/me/leave-balance` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `leaveType`, `leaveRequest` | ✅ Yes |
| **`GET`** | `/api/me/leave-balance` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `leaveType`, `leaveRequest` | ✅ Yes |
| **`GET`** | `/api/v1/me/leaves` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `leaveRequest` | ✅ Yes |
| **`GET`** | `/api/me/leaves` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `leaveRequest` | ✅ Yes |
| **`POST`** | `/api/v1/me/leaves` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `leaveRequest` | ✅ Yes |
| **`POST`** | `/api/me/leaves` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `leaveRequest` | ✅ Yes |
| **`GET`** | `/api/v1/me/payslips` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `payslip` | ⚪ Global |
| **`GET`** | `/api/me/payslips` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `payslip` | ⚪ Global |
| **`GET`** | `/api/v1/me/payslips/:id` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `payslip` | ⚪ Global |
| **`GET`** | `/api/me/payslips/:id` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `payslip` | ⚪ Global |
| **`GET`** | `/api/v1/me/tax-declaration` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employeeTaxDeclaration` | ✅ Yes |
| **`GET`** | `/api/me/tax-declaration` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employeeTaxDeclaration` | ✅ Yes |
| **`PUT`** | `/api/v1/me/tax-declaration` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employeeTaxDeclaration` | ✅ Yes |
| **`PUT`** | `/api/me/tax-declaration` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employeeTaxDeclaration` | ✅ Yes |
| **`POST`** | `/api/v1/me/tax-declaration/proofs` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employeeTaxDeclaration`, `taxDeclarationProof` | ✅ Yes |
| **`POST`** | `/api/me/tax-declaration/proofs` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employeeTaxDeclaration`, `taxDeclarationProof` | ✅ Yes |
| **`GET`** | `/api/v1/me/okrs` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `okrObjective` | ⚪ Global |
| **`GET`** | `/api/me/okrs` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `okrObjective` | ⚪ Global |
| **`GET`** | `/api/v1/me/awards` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `award` | ⚪ Global |
| **`GET`** | `/api/me/awards` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `award` | ⚪ Global |
| **`GET`** | `/api/v1/me/trainings` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `courseEnrollment` | ⚪ Global |
| **`GET`** | `/api/me/trainings` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `courseEnrollment` | ⚪ Global |
| **`GET`** | `/api/v1/me/documents` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `documentRequest` | ⚪ Global |
| **`GET`** | `/api/me/documents` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `documentRequest` | ⚪ Global |
| **`POST`** | `/api/v1/me/documents/request` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `documentRequest` | ✅ Yes |
| **`POST`** | `/api/me/documents/request` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `documentRequest` | ✅ Yes |
| **`GET`** | `/api/v1/me/assets` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `assetAssignment`, `assetRequest` | ⚪ Global |
| **`GET`** | `/api/me/assets` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `assetAssignment`, `assetRequest` | ⚪ Global |
| **`POST`** | `/api/v1/me/assets/request` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `assetRequest` | ✅ Yes |
| **`POST`** | `/api/me/assets/request` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `assetRequest` | ✅ Yes |
| **`GET`** | `/api/v1/me/resignation` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employeeExit` | ⚪ Global |
| **`GET`** | `/api/me/resignation` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employeeExit` | ⚪ Global |
| **`POST`** | `/api/v1/me/resignation` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`POST`** | `/api/me/resignation` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`GET`** | `/api/v1/me/tickets` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `helpdeskTicket` | ⚪ Global |
| **`GET`** | `/api/me/tickets` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `helpdeskTicket` | ⚪ Global |
| **`POST`** | `/api/v1/me/tickets` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `helpdeskTicket` | ✅ Yes |
| **`POST`** | `/api/me/tickets` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `helpdeskTicket` | ✅ Yes |
| **`GET`** | `/api/v1/me/team` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employee` | ✅ Yes |
| **`GET`** | `/api/me/team` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employee` | ✅ Yes |
| **`GET`** | `/api/v1/me/team/approvals` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employee`, `leaveRequest`, `attendanceRegularization` | ✅ Yes |
| **`GET`** | `/api/me/team/approvals` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employee`, `leaveRequest`, `attendanceRegularization` | ✅ Yes |
| **`POST`** | `/api/v1/me/team/regularizations/:id/action` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `attendanceRegularization`, `attendance` | ✅ Yes |
| **`POST`** | `/api/me/team/regularizations/:id/action` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `attendanceRegularization`, `attendance` | ✅ Yes |
| **`POST`** | `/api/v1/me/team/leaves/:id/action` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `leaveRequest` | ⚪ Global |
| **`POST`** | `/api/me/team/leaves/:id/action` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `leaveRequest` | ⚪ Global |
| **`POST`** | `/api/v1/me/team/profile-changes/:id/action` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employeeChangeRequest`, `employee` | ✅ Yes |
| **`POST`** | `/api/me/team/profile-changes/:id/action` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employeeChangeRequest`, `employee` | ✅ Yes |
| **`GET`** | `/api/v1/me/organization/structure` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `branch`, `department`, `designation` | ✅ Yes |
| **`GET`** | `/api/me/organization/structure` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `branch`, `department`, `designation` | ✅ Yes |
| **`GET`** | `/api/v1/me/organization/holidays` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `holiday` | ✅ Yes |
| **`GET`** | `/api/me/organization/holidays` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `holiday` | ✅ Yes |
| **`GET`** | `/api/v1/me/organization/announcements` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `announcement` | ✅ Yes |
| **`GET`** | `/api/me/organization/announcements` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `announcement` | ✅ Yes |
| **`POST`** | `/api/v1/me/organization/announcements/:id/acknowledge` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `announcementAcknowledgement` | ✅ Yes |
| **`POST`** | `/api/me/organization/announcements/:id/acknowledge` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `announcementAcknowledgement` | ✅ Yes |
| **`GET`** | `/api/v1/me/employees` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employee` | ✅ Yes |
| **`GET`** | `/api/me/employees` | Employee Self-Service (ESS) | ✅ Yes | `authenticated` | `employee` | ✅ Yes |
| **`GET`** | `/api/employees` | Employee Directory & Core HR | ✅ Yes | `authenticated` | `employee` | ✅ Yes |
| **`POST`** | `/api/employees` | Employee Directory & Core HR | ✅ Yes | `hrm.employees.create` | N/A | ✅ Yes |
| **`PUT`** | `/api/employees/:id` | Employee Directory & Core HR | ✅ Yes | `authenticated` | `employee`, `profile` | ✅ Yes |
| **`DELETE`** | `/api/employees/:id` | Employee Directory & Core HR | ✅ Yes | `authenticated` | `employee` | ✅ Yes |
| **`GET`** | `/api/employees/departments` | Employee Directory & Core HR | ✅ Yes | `authenticated` | `department` | ✅ Yes |
| **`GET`** | `/api/employees/departments/:id` | Employee Directory & Core HR | ✅ Yes | `authenticated` | `department` | ✅ Yes |
| **`POST`** | `/api/employees/departments` | Employee Directory & Core HR | ✅ Yes | `authenticated` | `department` | ✅ Yes |
| **`PUT`** | `/api/employees/departments/:id` | Employee Directory & Core HR | ✅ Yes | `authenticated` | `department` | ✅ Yes |
| **`PATCH`** | `/api/employees/departments/:id` | Employee Directory & Core HR | ✅ Yes | `authenticated` | `department` | ✅ Yes |
| **`DELETE`** | `/api/employees/departments/:id` | Employee Directory & Core HR | ✅ Yes | `authenticated` | `department` | ✅ Yes |
| **`GET`** | `/api/employees/:id` | Employee Directory & Core HR | ✅ Yes | `authenticated` | `employee` | ✅ Yes |
| **`POST`** | `/api/employees/:id/reset-2fa` | Employee Directory & Core HR | ✅ Yes | `authenticated` | `employee`, `user` | ✅ Yes |
| **`GET`** | `/api/employees/:id/login-account` | Employee Directory & Core HR | ✅ Yes | `authenticated` | `employee`, `user` | ✅ Yes |
| **`POST`** | `/api/employees/:id/set-password` | Employee Directory & Core HR | ✅ Yes | `authenticated` | `employee` | ✅ Yes |
| **`POST`** | `/api/employees/bulk-import` | Employee Directory & Core HR | ✅ Yes | `authenticated` | `department`, `employee` | ✅ Yes |
| **`GET`** | `/api/expenses/categories` | Expense Reimbursements | ✅ Yes | `authenticated` | `expenseCategory` | ✅ Yes |
| **`POST`** | `/api/expenses/categories` | Expense Reimbursements | ✅ Yes | `authenticated` | `expenseCategory` | ✅ Yes |
| **`PUT`** | `/api/expenses/categories/:id` | Expense Reimbursements | ✅ Yes | `authenticated` | `expenseCategory` | ✅ Yes |
| **`DELETE`** | `/api/expenses/categories/:id` | Expense Reimbursements | ✅ Yes | `authenticated` | `expenseCategory`, `expenseClaim` | ✅ Yes |
| **`GET`** | `/api/expenses/claims` | Expense Reimbursements | ✅ Yes | `authenticated` | `expenseClaim` | ✅ Yes |
| **`POST`** | `/api/expenses/claims/upload-receipt` | Expense Reimbursements | ✅ Yes | `authenticated` | `expenseClaim` | ✅ Yes |
| **`POST`** | `/api/expenses/claims` | Expense Reimbursements | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/expenses/claims/:id/ocr-process` | Expense Reimbursements | ✅ Yes | `authenticated` | `expenseClaim` | ✅ Yes |
| **`PUT`** | `/api/expenses/claims/:id/status` | Expense Reimbursements | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/expenses/claims/authorized-for-payroll` | Expense Reimbursements | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/expenses/claims/:id/reimburse` | Expense Reimbursements | ✅ Yes | `authenticated` | `expenseClaim` | ✅ Yes |
| **`DELETE`** | `/api/expenses/claims/:id` | Expense Reimbursements | ✅ Yes | `authenticated` | `expenseClaim` | ✅ Yes |
| **`GET`** | `/api/expenses/summary` | Expense Reimbursements | ✅ Yes | `authenticated` | `expenseClaim` | ✅ Yes |
| **`GET`** | `/api/fbp/window-status` | Flexible Benefit Plan (FBP) | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/fbp/components` | Flexible Benefit Plan (FBP) | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/fbp/pool` | Flexible Benefit Plan (FBP) | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/fbp/my-declaration` | Flexible Benefit Plan (FBP) | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/fbp/declarations` | Flexible Benefit Plan (FBP) | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/fbp/admin/declarations` | Flexible Benefit Plan (FBP) | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/fbp/admin/declarations/:id/approve` | Flexible Benefit Plan (FBP) | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/forms` | Custom Form Submissions | ✅ Yes | `authenticated` | `customForm` | ✅ Yes |
| **`GET`** | `/api/forms/summary/stats` | Custom Form Submissions | ✅ Yes | `authenticated` | `customForm` | ✅ Yes |
| **`GET`** | `/api/forms/:id` | Custom Form Submissions | ✅ Yes | `authenticated` | `customForm` | ✅ Yes |
| **`POST`** | `/api/forms` | Custom Form Submissions | ✅ Yes | `authenticated` | `customForm` | ✅ Yes |
| **`PUT`** | `/api/forms/:id` | Custom Form Submissions | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`DELETE`** | `/api/forms/:id` | Custom Form Submissions | ✅ Yes | `authenticated` | `customForm` | ⚪ Global |
| **`POST`** | `/api/forms/:id/submit` | Custom Form Submissions | ✅ Yes | `authenticated` | `customForm`, `formSubmission` | ✅ Yes |
| **`GET`** | `/api/forms/:id/submissions` | Custom Form Submissions | ✅ Yes | `authenticated` | `formSubmission` | ⚪ Global |
| **`PUT`** | `/api/forms/submissions/:submissionId/review` | Custom Form Submissions | ✅ Yes | `authenticated` | `formSubmission` | ⚪ Global |
| **`GET`** | `/api/forms/statutory-catalog` | Custom Form Submissions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/forms/statutory/prefill` | Custom Form Submissions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/forms/statutory/save-immutable` | Custom Form Submissions | ✅ Yes | `authenticated` | `genericFormTemplate` | ✅ Yes |
| **`GET`** | `/api/forms/statutory/immutable-records` | Custom Form Submissions | ✅ Yes | `authenticated` | `genericFormTemplate` | ✅ Yes |
| **`GET`** | `/api/forms/statutory/immutable-records/:id/verify` | Custom Form Submissions | ✅ Yes | `authenticated` | `genericFormTemplate` | ✅ Yes |
| **`GET`** | `/api/forms/templates` | Custom Form Submissions | ✅ Yes | `authenticated` | `genericFormTemplate` | ✅ Yes |
| **`GET`** | `/api/helpdesk/tickets` | Internal Helpdesk Ticketing | ✅ Yes | `authenticated` | `employee`, `helpdeskTicket` | ✅ Yes |
| **`POST`** | `/api/helpdesk/tickets` | Internal Helpdesk Ticketing | ✅ Yes | `authenticated` | `helpdeskTicket`, `helpdeskComment` | ✅ Yes |
| **`GET`** | `/api/helpdesk/tickets/:id` | Internal Helpdesk Ticketing | ✅ Yes | `authenticated` | `helpdeskTicket` | ✅ Yes |
| **`POST`** | `/api/helpdesk/tickets/:id/comments` | Internal Helpdesk Ticketing | ✅ Yes | `authenticated` | `helpdeskComment`, `helpdeskTicket` | ⚪ Global |
| **`PUT`** | `/api/helpdesk/tickets/:id/status` | Internal Helpdesk Ticketing | ✅ Yes | `authenticated` | `helpdeskTicket`, `helpdeskComment` | ✅ Yes |
| **`DELETE`** | `/api/helpdesk/tickets/:id` | Internal Helpdesk Ticketing | ✅ Yes | `authenticated` | `helpdeskTicket` | ✅ Yes |
| **`GET`** | `/api/helpdesk/summary/stats` | Internal Helpdesk Ticketing | ✅ Yes | `authenticated` | `helpdeskTicket` | ✅ Yes |
| **`GET`** | `/api/v1/hr/assets/overview` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/assets/overview` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/assets/types` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/assets/types` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/assets/types` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/assets/types` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/hr/assets/types/:id` | HR Asset Allocations | ✅ Yes | `authenticated` | `assetCategory` | ✅ Yes |
| **`PUT`** | `/api/hr/assets/types/:id` | HR Asset Allocations | ✅ Yes | `authenticated` | `assetCategory` | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/assets/types/:id` | HR Asset Allocations | ✅ Yes | `authenticated` | `assetCategory` | ✅ Yes |
| **`DELETE`** | `/api/hr/assets/types/:id` | HR Asset Allocations | ✅ Yes | `authenticated` | `assetCategory` | ✅ Yes |
| **`GET`** | `/api/v1/hr/assets/depreciation` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/assets/depreciation` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/assets/:id/depreciation/calculate` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/assets/:id/depreciation/calculate` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/assets/requests-maintenance` | HR Asset Allocations | ✅ Yes | `authenticated` | `assetRequest`, `assetMaintenance` | ✅ Yes |
| **`GET`** | `/api/hr/assets/requests-maintenance` | HR Asset Allocations | ✅ Yes | `authenticated` | `assetRequest`, `assetMaintenance` | ✅ Yes |
| **`PATCH`** | `/api/v1/hr/assets/requests/:id` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/hr/assets/requests/:id` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/assets/maintenance` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/assets/maintenance` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/v1/hr/assets/maintenance/:id/complete` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/hr/assets/maintenance/:id/complete` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/assets` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/assets` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/assets` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/assets` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/assets/:id` | HR Asset Allocations | ✅ Yes | `authenticated` | `asset` | ✅ Yes |
| **`GET`** | `/api/hr/assets/:id` | HR Asset Allocations | ✅ Yes | `authenticated` | `asset` | ✅ Yes |
| **`PUT`** | `/api/v1/hr/assets/:id` | HR Asset Allocations | ✅ Yes | `authenticated` | `asset` | ✅ Yes |
| **`PUT`** | `/api/hr/assets/:id` | HR Asset Allocations | ✅ Yes | `authenticated` | `asset` | ✅ Yes |
| **`POST`** | `/api/v1/hr/assets/:id/assign` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/assets/:id/assign` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/assets/assignments/:id/return` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/assets/assignments/:id/return` | HR Asset Allocations | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/attendance/records` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/attendance/records` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/attendance/records` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/attendance/records` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/attendance/month-lock` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/attendance/month-lock` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/attendance/month-lock` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/attendance/month-lock` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/attendance/live` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/attendance/live` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/attendance/policies` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/attendance/policies` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/attendance/policies` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/attendance/policies` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/attendance/regularizations` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/attendance/regularizations` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/attendance/regularizations/:id/action` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/attendance/regularizations/:id/action` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/attendance/shifts` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/attendance/shifts` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/attendance/shifts` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/attendance/shifts` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/attendance/shifts/rosters` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/attendance/shifts/rosters` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/attendance/shifts/rosters` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/attendance/shifts/rosters` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/attendance/shifts/swaps` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/attendance/shifts/swaps` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/attendance/shifts/swaps/:id/action` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/attendance/shifts/swaps/:id/action` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/attendance/timesheets` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/attendance/timesheets` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/attendance/timesheets/:id/action` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/attendance/timesheets/:id/action` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/attendance/overtime` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/attendance/overtime` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/attendance/overtime/:id/action` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/attendance/overtime/:id/action` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/attendance/devices` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/attendance/devices` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/attendance/devices` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/attendance/devices` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/attendance/devices/:id/sync` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/attendance/devices/:id/sync` | HR Attendance Administration | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/calendar/events` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/calendar/events` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/calendar/events` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/calendar/events` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/calendar/events/:id` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/hr/calendar/events/:id` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/todo/items` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/todo/items` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/todo/items` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/todo/items` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/v1/hr/todo/items/status` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/hr/todo/items/status` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/todo/items/:id` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/hr/todo/items/:id` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/notifications` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/notifications` | HR Collaboration Hub | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/documents/categories` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/documents/categories` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/documents/categories` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/documents/categories` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/hr/documents/categories/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/hr/documents/categories/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/documents/categories/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/hr/documents/categories/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/documents/templates` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/documents/templates` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/documents/templates/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/documents/templates/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/documents/templates` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/documents/templates` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/hr/documents/templates/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/hr/documents/templates/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/documents/templates/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/hr/documents/templates/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/documents` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/documents` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/documents` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/documents` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/documents/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/documents/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/hr/documents/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/hr/documents/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/documents/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/hr/documents/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/documents/contract-types` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/documents/contract-types` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/documents/contract-types` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/documents/contract-types` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/hr/documents/contract-types/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/hr/documents/contract-types/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/documents/contract-types/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/hr/documents/contract-types/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/documents/contracts` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/documents/contracts` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/documents/contracts` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/documents/contracts` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/documents/contracts/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/documents/contracts/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/hr/documents/contracts/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/hr/documents/contracts/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/documents/contracts/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/hr/documents/contracts/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/documents/acknowledgements` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/documents/acknowledgements` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/documents/acknowledgements/campaign` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/documents/acknowledgements/campaign` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/documents/letters` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/documents/letters` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/documents/letters/generate` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/documents/letters/generate` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/documents/letters/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/documents/letters/:id` | HR Document Records | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/employees` | HR Employee Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/employees` | HR Employee Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/employees` | HR Employee Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/employees` | HR Employee Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/employees/import/dry-run` | HR Employee Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/employees/import/dry-run` | HR Employee Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/employees/import/commit` | HR Employee Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/employees/import/commit` | HR Employee Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/employees/:id` | HR Employee Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/employees/:id` | HR Employee Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/leave/applications` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/leave/applications` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/leave/applications/:id/action` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/leave/applications/:id/action` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/leave/applications/:id/cancel` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/leave/applications/:id/cancel` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/leave/balances` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/leave/balances` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/leave/balances/adjust` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/leave/balances/adjust` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/leave/types` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/leave/types` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/leave/types` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/leave/types` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/leave/calendar` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/leave/calendar` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/leave/policies` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/leave/policies` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/leave/policies` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/leave/policies` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/leave/encashment-compoff` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/leave/encashment-compoff` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/leave/encashment-compoff/:id/action` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/leave/encashment-compoff/:id/action` | HR Leave & PTO Admin | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/lifecycle/overview` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/lifecycle/overview` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/lifecycle/awards` | HR Lifecycle Management | ✅ Yes | `authenticated` | `award` | ✅ Yes |
| **`GET`** | `/api/hr/lifecycle/awards` | HR Lifecycle Management | ✅ Yes | `authenticated` | `award` | ✅ Yes |
| **`POST`** | `/api/v1/hr/lifecycle/awards` | HR Lifecycle Management | ✅ Yes | `authenticated` | `award` | ✅ Yes |
| **`POST`** | `/api/hr/lifecycle/awards` | HR Lifecycle Management | ✅ Yes | `authenticated` | `award` | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/lifecycle/awards/:id` | HR Lifecycle Management | ✅ Yes | `authenticated` | `award` | ✅ Yes |
| **`DELETE`** | `/api/hr/lifecycle/awards/:id` | HR Lifecycle Management | ✅ Yes | `authenticated` | `award` | ✅ Yes |
| **`GET`** | `/api/v1/hr/lifecycle/promotions` | HR Lifecycle Management | ✅ Yes | `authenticated` | `promotionRecord` | ✅ Yes |
| **`GET`** | `/api/hr/lifecycle/promotions` | HR Lifecycle Management | ✅ Yes | `authenticated` | `promotionRecord` | ✅ Yes |
| **`POST`** | `/api/v1/hr/lifecycle/promotions` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/lifecycle/promotions` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/lifecycle/transfers` | HR Lifecycle Management | ✅ Yes | `authenticated` | `employeeTransfer` | ✅ Yes |
| **`GET`** | `/api/hr/lifecycle/transfers` | HR Lifecycle Management | ✅ Yes | `authenticated` | `employeeTransfer` | ✅ Yes |
| **`POST`** | `/api/v1/hr/lifecycle/transfers` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/lifecycle/transfers` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/lifecycle/warnings` | HR Lifecycle Management | ✅ Yes | `authenticated` | `disciplinaryWarning` | ✅ Yes |
| **`GET`** | `/api/hr/lifecycle/warnings` | HR Lifecycle Management | ✅ Yes | `authenticated` | `disciplinaryWarning` | ✅ Yes |
| **`POST`** | `/api/v1/hr/lifecycle/warnings` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/lifecycle/warnings` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/lifecycle/warnings/:id` | HR Lifecycle Management | ✅ Yes | `authenticated` | `disciplinaryWarning` | ✅ Yes |
| **`DELETE`** | `/api/hr/lifecycle/warnings/:id` | HR Lifecycle Management | ✅ Yes | `authenticated` | `disciplinaryWarning` | ✅ Yes |
| **`GET`** | `/api/v1/hr/lifecycle/resignations` | HR Lifecycle Management | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`GET`** | `/api/hr/lifecycle/resignations` | HR Lifecycle Management | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`PUT`** | `/api/v1/hr/lifecycle/resignations/:id/review` | HR Lifecycle Management | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`PUT`** | `/api/hr/lifecycle/resignations/:id/review` | HR Lifecycle Management | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`GET`** | `/api/v1/hr/lifecycle/terminations` | HR Lifecycle Management | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`GET`** | `/api/hr/lifecycle/terminations` | HR Lifecycle Management | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`POST`** | `/api/v1/hr/lifecycle/terminations` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/lifecycle/terminations` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/lifecycle/trips` | HR Lifecycle Management | ✅ Yes | `authenticated` | `employeeTrip` | ✅ Yes |
| **`GET`** | `/api/hr/lifecycle/trips` | HR Lifecycle Management | ✅ Yes | `authenticated` | `employeeTrip` | ✅ Yes |
| **`PUT`** | `/api/v1/hr/lifecycle/trips/:id/approve` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/hr/lifecycle/trips/:id/approve` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/lifecycle/complaints` | HR Lifecycle Management | ✅ Yes | `authenticated` | `employeeComplaint` | ✅ Yes |
| **`GET`** | `/api/hr/lifecycle/complaints` | HR Lifecycle Management | ✅ Yes | `authenticated` | `employeeComplaint` | ✅ Yes |
| **`PUT`** | `/api/v1/hr/lifecycle/complaints/:id/resolve` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/hr/lifecycle/complaints/:id/resolve` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/lifecycle/exits` | HR Lifecycle Management | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`GET`** | `/api/hr/lifecycle/exits` | HR Lifecycle Management | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`PUT`** | `/api/v1/hr/lifecycle/exits/:id/checklist/:itemId` | HR Lifecycle Management | ✅ Yes | `authenticated` | `exitChecklistItem` | ✅ Yes |
| **`PUT`** | `/api/hr/lifecycle/exits/:id/checklist/:itemId` | HR Lifecycle Management | ✅ Yes | `authenticated` | `exitChecklistItem` | ✅ Yes |
| **`PUT`** | `/api/v1/hr/lifecycle/exits/:id/finalize` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/hr/lifecycle/exits/:id/finalize` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/lifecycle/probation` | HR Lifecycle Management | ✅ Yes | `authenticated` | `probationRecord` | ✅ Yes |
| **`GET`** | `/api/hr/lifecycle/probation` | HR Lifecycle Management | ✅ Yes | `authenticated` | `probationRecord` | ✅ Yes |
| **`PUT`** | `/api/v1/hr/lifecycle/probation/:id/extend` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/hr/lifecycle/probation/:id/extend` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/hr/lifecycle/probation/:id/confirm` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/hr/lifecycle/probation/:id/confirm` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/lifecycle/timeline/:employeeId` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/lifecycle/timeline/:employeeId` | HR Lifecycle Management | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/meetings/overview` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/meetings/overview` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/meetings/rooms` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/meetings/rooms` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/meetings/rooms` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/meetings/rooms` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/hr/meetings/rooms/:id` | HR Meeting Scheduler | ✅ Yes | `authenticated` | `meetingRoom` | ✅ Yes |
| **`PUT`** | `/api/hr/meetings/rooms/:id` | HR Meeting Scheduler | ✅ Yes | `authenticated` | `meetingRoom` | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/meetings/rooms/:id` | HR Meeting Scheduler | ✅ Yes | `authenticated` | `meetingRoom` | ✅ Yes |
| **`DELETE`** | `/api/hr/meetings/rooms/:id` | HR Meeting Scheduler | ✅ Yes | `authenticated` | `meetingRoom` | ✅ Yes |
| **`GET`** | `/api/v1/hr/meetings/types` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/meetings/types` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/meetings/types` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/meetings/types` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/hr/meetings/types/:id` | HR Meeting Scheduler | ✅ Yes | `authenticated` | `meetingTypeMaster` | ✅ Yes |
| **`PUT`** | `/api/hr/meetings/types/:id` | HR Meeting Scheduler | ✅ Yes | `authenticated` | `meetingTypeMaster` | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/meetings/types/:id` | HR Meeting Scheduler | ✅ Yes | `authenticated` | `meetingTypeMaster` | ✅ Yes |
| **`DELETE`** | `/api/hr/meetings/types/:id` | HR Meeting Scheduler | ✅ Yes | `authenticated` | `meetingTypeMaster` | ✅ Yes |
| **`GET`** | `/api/v1/hr/meetings` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/meetings` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/meetings` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/meetings` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/meetings/:id` | HR Meeting Scheduler | ✅ Yes | `authenticated` | `meeting` | ✅ Yes |
| **`GET`** | `/api/hr/meetings/:id` | HR Meeting Scheduler | ✅ Yes | `authenticated` | `meeting` | ✅ Yes |
| **`POST`** | `/api/v1/hr/meetings/:id/cancel` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/meetings/:id/cancel` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/meetings/action-items` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/meetings/action-items` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/meetings/action-items` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/meetings/action-items` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/v1/hr/meetings/action-items/:id` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/hr/meetings/action-items/:id` | HR Meeting Scheduler | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/payroll/runs` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payrollRun` | ✅ Yes |
| **`GET`** | `/api/hr/payroll/runs` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payrollRun` | ✅ Yes |
| **`POST`** | `/api/v1/hr/payroll/runs` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payrollRun` | ✅ Yes |
| **`POST`** | `/api/hr/payroll/runs` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payrollRun` | ✅ Yes |
| **`POST`** | `/api/v1/hr/payroll/runs/:id/calculate` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payrollRun`, `employee`, `expenseClaim` | ✅ Yes |
| **`POST`** | `/api/hr/payroll/runs/:id/calculate` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payrollRun`, `employee`, `expenseClaim` | ✅ Yes |
| **`GET`** | `/api/v1/hr/payroll/runs/:id/variance` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payrollRun` | ✅ Yes |
| **`GET`** | `/api/hr/payroll/runs/:id/variance` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payrollRun` | ✅ Yes |
| **`POST`** | `/api/v1/hr/payroll/runs/:id/approve` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payrollRun` | ✅ Yes |
| **`POST`** | `/api/hr/payroll/runs/:id/approve` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payrollRun` | ✅ Yes |
| **`POST`** | `/api/v1/hr/payroll/runs/:id/publish` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payrollRun` | ✅ Yes |
| **`POST`** | `/api/hr/payroll/runs/:id/publish` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payrollRun` | ✅ Yes |
| **`GET`** | `/api/v1/hr/payroll/payslips` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payslip` | ✅ Yes |
| **`GET`** | `/api/hr/payroll/payslips` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payslip` | ✅ Yes |
| **`POST`** | `/api/v1/hr/payroll/payslips/bulk-publish` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payslip` | ✅ Yes |
| **`POST`** | `/api/hr/payroll/payslips/bulk-publish` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payslip` | ✅ Yes |
| **`GET`** | `/api/v1/hr/payroll/components` | HR Statutory Payroll | ⚪ Public | `authenticated` | `salaryComponent`, `salaryStructure` | ✅ Yes |
| **`GET`** | `/api/hr/payroll/components` | HR Statutory Payroll | ⚪ Public | `authenticated` | `salaryComponent`, `salaryStructure` | ✅ Yes |
| **`POST`** | `/api/v1/hr/payroll/components` | HR Statutory Payroll | ⚪ Public | `authenticated` | `salaryComponent` | ✅ Yes |
| **`POST`** | `/api/hr/payroll/components` | HR Statutory Payroll | ⚪ Public | `authenticated` | `salaryComponent` | ✅ Yes |
| **`POST`** | `/api/v1/hr/payroll/components/test-formula` | HR Statutory Payroll | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/hr/payroll/components/test-formula` | HR Statutory Payroll | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/v1/hr/payroll/employee-salaries` | HR Statutory Payroll | ⚪ Public | `authenticated` | `employeeSalaryAssignment` | ✅ Yes |
| **`GET`** | `/api/hr/payroll/employee-salaries` | HR Statutory Payroll | ⚪ Public | `authenticated` | `employeeSalaryAssignment` | ✅ Yes |
| **`POST`** | `/api/v1/hr/payroll/employee-salaries/assign` | HR Statutory Payroll | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/payroll/employee-salaries/assign` | HR Statutory Payroll | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/payroll/loans` | HR Statutory Payroll | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/payroll/loans` | HR Statutory Payroll | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/payroll/loans` | HR Statutory Payroll | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/payroll/loans` | HR Statutory Payroll | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/payroll/reimbursements` | HR Statutory Payroll | ⚪ Public | `authenticated` | `expenseClaim` | ✅ Yes |
| **`GET`** | `/api/hr/payroll/reimbursements` | HR Statutory Payroll | ⚪ Public | `authenticated` | `expenseClaim` | ✅ Yes |
| **`GET`** | `/api/v1/hr/payroll/tax/declarations` | HR Statutory Payroll | ⚪ Public | `authenticated` | `employeeTaxDeclaration` | ✅ Yes |
| **`GET`** | `/api/hr/payroll/tax/declarations` | HR Statutory Payroll | ⚪ Public | `authenticated` | `employeeTaxDeclaration` | ✅ Yes |
| **`PATCH`** | `/api/v1/hr/payroll/tax/proofs/:id` | HR Statutory Payroll | ⚪ Public | `authenticated` | `taxDeclarationProof` | ✅ Yes |
| **`PATCH`** | `/api/hr/payroll/tax/proofs/:id` | HR Statutory Payroll | ⚪ Public | `authenticated` | `taxDeclarationProof` | ✅ Yes |
| **`GET`** | `/api/v1/hr/payroll/forms/summary` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payrollRun`, `employee`, `employeeTaxDeclaration` | ✅ Yes |
| **`GET`** | `/api/hr/payroll/forms/summary` | HR Statutory Payroll | ⚪ Public | `authenticated` | `payrollRun`, `employee`, `employeeTaxDeclaration` | ✅ Yes |
| **`GET`** | `/api/v1/hr/performance/overview` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/performance/overview` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/performance/cycles` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/performance/cycles` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/performance/cycles` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/performance/cycles` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/hr/performance/cycles/:id/status` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/hr/performance/cycles/:id/status` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/performance/goals` | HR Performance Reviews | ✅ Yes | `authenticated` | `okrObjective` | ✅ Yes |
| **`GET`** | `/api/hr/performance/goals` | HR Performance Reviews | ✅ Yes | `authenticated` | `okrObjective` | ✅ Yes |
| **`POST`** | `/api/v1/hr/performance/goals` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/performance/goals` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/performance/indicators` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/performance/indicators` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/performance/indicators` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/performance/indicators` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/performance/goal-types` | HR Performance Reviews | ✅ Yes | `authenticated` | `goalTypeMaster` | ✅ Yes |
| **`GET`** | `/api/hr/performance/goal-types` | HR Performance Reviews | ✅ Yes | `authenticated` | `goalTypeMaster` | ✅ Yes |
| **`POST`** | `/api/v1/hr/performance/goal-types` | HR Performance Reviews | ✅ Yes | `authenticated` | `goalTypeMaster` | ✅ Yes |
| **`POST`** | `/api/hr/performance/goal-types` | HR Performance Reviews | ✅ Yes | `authenticated` | `goalTypeMaster` | ✅ Yes |
| **`GET`** | `/api/v1/hr/performance/indicator-categories` | HR Performance Reviews | ✅ Yes | `authenticated` | `indicatorCategory` | ✅ Yes |
| **`GET`** | `/api/hr/performance/indicator-categories` | HR Performance Reviews | ✅ Yes | `authenticated` | `indicatorCategory` | ✅ Yes |
| **`POST`** | `/api/v1/hr/performance/indicator-categories` | HR Performance Reviews | ✅ Yes | `authenticated` | `indicatorCategory` | ✅ Yes |
| **`POST`** | `/api/hr/performance/indicator-categories` | HR Performance Reviews | ✅ Yes | `authenticated` | `indicatorCategory` | ✅ Yes |
| **`GET`** | `/api/v1/hr/performance/reviews` | HR Performance Reviews | ✅ Yes | `authenticated` | `okrReview` | ✅ Yes |
| **`GET`** | `/api/hr/performance/reviews` | HR Performance Reviews | ✅ Yes | `authenticated` | `okrReview` | ✅ Yes |
| **`POST`** | `/api/v1/hr/performance/reviews` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/performance/reviews` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/performance/cycles/:id/release` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/performance/cycles/:id/release` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/performance/pip` | HR Performance Reviews | ✅ Yes | `authenticated` | `performanceImprovementPlan` | ✅ Yes |
| **`GET`** | `/api/hr/performance/pip` | HR Performance Reviews | ✅ Yes | `authenticated` | `performanceImprovementPlan` | ✅ Yes |
| **`POST`** | `/api/v1/hr/performance/pip` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/performance/pip` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/hr/performance/pip/:id/conclude` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/hr/performance/pip/:id/conclude` | HR Performance Reviews | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/job-categories` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCategory` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/job-categories` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCategory` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/job-categories` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCategory` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/job-categories` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCategory` | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/recruitment/job-categories/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCategory` | ✅ Yes |
| **`DELETE`** | `/api/hr/recruitment/job-categories/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCategory` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/job-types` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobType` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/job-types` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobType` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/job-types` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobType` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/job-types` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobType` | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/recruitment/job-types/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobType` | ✅ Yes |
| **`DELETE`** | `/api/hr/recruitment/job-types/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobType` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/job-locations` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobLocation` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/job-locations` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobLocation` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/job-locations` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobLocation` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/job-locations` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobLocation` | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/recruitment/job-locations/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobLocation` | ✅ Yes |
| **`DELETE`** | `/api/hr/recruitment/job-locations/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobLocation` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/candidate-sources` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateSource` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/candidate-sources` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateSource` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/candidate-sources` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateSource` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/candidate-sources` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateSource` | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/recruitment/candidate-sources/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateSource` | ✅ Yes |
| **`DELETE`** | `/api/hr/recruitment/candidate-sources/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateSource` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/interview-types` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `interviewTypeMaster` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/interview-types` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `interviewTypeMaster` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/interview-types` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `interviewTypeMaster` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/interview-types` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `interviewTypeMaster` | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/recruitment/interview-types/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `interviewTypeMaster` | ✅ Yes |
| **`DELETE`** | `/api/hr/recruitment/interview-types/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `interviewTypeMaster` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/interview-rounds` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `interviewRoundMaster` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/interview-rounds` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `interviewRoundMaster` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/interview-rounds` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `interviewRoundMaster` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/interview-rounds` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `interviewRoundMaster` | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/recruitment/interview-rounds/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `interviewRoundMaster` | ✅ Yes |
| **`DELETE`** | `/api/hr/recruitment/interview-rounds/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `interviewRoundMaster` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/check-items` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `onboardingCheckItem` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/check-items` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `onboardingCheckItem` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/check-items` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `onboardingCheckItem` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/check-items` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `onboardingCheckItem` | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/recruitment/check-items/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `onboardingCheckItem` | ✅ Yes |
| **`DELETE`** | `/api/hr/recruitment/check-items/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `onboardingCheckItem` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/onboarding-checklists` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `onboardingChecklistTemplate` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/onboarding-checklists` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `onboardingChecklistTemplate` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/onboarding-checklists` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `onboardingChecklistTemplate` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/onboarding-checklists` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `onboardingChecklistTemplate` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/offer-templates` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `offerTemplate` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/offer-templates` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `offerTemplate` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/offer-templates` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `offerTemplate` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/offer-templates` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `offerTemplate` | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/recruitment/offer-templates/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `offerTemplate` | ✅ Yes |
| **`DELETE`** | `/api/hr/recruitment/offer-templates/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `offerTemplate` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/job-postings` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/job-postings` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/job-postings` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/job-postings` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/job-postings/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/job-postings/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`PUT`** | `/api/v1/hr/recruitment/job-postings/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`PUT`** | `/api/hr/recruitment/job-postings/:id` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/job-postings/:id/approve` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/job-postings/:id/approve` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/job-postings/:id/publish` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/job-postings/:id/publish` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/job-postings/:id/close` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/job-postings/:id/close` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/candidates/check-duplicate` | HR Recruitment & ATS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/candidates/check-duplicate` | HR Recruitment & ATS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/candidates` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/candidates` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/candidates` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/candidates` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/candidates/:id/360` | HR Recruitment & ATS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/candidates/:id/360` | HR Recruitment & ATS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/hr/recruitment/candidates/:id/stage` | HR Recruitment & ATS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/hr/recruitment/candidates/:id/stage` | HR Recruitment & ATS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/candidates/:id/convert-to-employee` | HR Recruitment & ATS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/candidates/:id/convert-to-employee` | HR Recruitment & ATS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/pipeline` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/pipeline` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/pipeline/stats` | HR Recruitment & ATS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/pipeline/stats` | HR Recruitment & ATS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/assessments/templates` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `assessmentTemplate` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/assessments/templates` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `assessmentTemplate` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/assessments/templates` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `assessmentTemplate` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/assessments/templates` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `assessmentTemplate` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/assessments` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateAssessment` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/assessments` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateAssessment` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/assessments/assign` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateAssessment` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/assessments/assign` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateAssessment` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/interviews/check-conflict` | HR Recruitment & ATS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/interviews/check-conflict` | HR Recruitment & ATS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/interviews` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCandidateInterview` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/interviews` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCandidateInterview` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/interviews` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCandidateInterview` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/interviews` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCandidateInterview` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/interviews/:id/scorecard` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCandidateInterview` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/interviews/:id/scorecard` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `jobCandidateInterview` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/offers` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateOffer` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/offers` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateOffer` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/offers` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateOffer` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/offers` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateOffer` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/offers/:id/approve` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateOffer` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/offers/:id/approve` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateOffer` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/offers/:id/accept` | HR Recruitment & ATS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/offers/:id/accept` | HR Recruitment & ATS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/candidate-onboarding` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateOnboarding` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/candidate-onboarding` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateOnboarding` | ✅ Yes |
| **`PUT`** | `/api/v1/hr/recruitment/candidate-onboarding/:id/tasks/:taskId` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateOnboardingTask` | ✅ Yes |
| **`PUT`** | `/api/hr/recruitment/candidate-onboarding/:id/tasks/:taskId` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `candidateOnboardingTask` | ✅ Yes |
| **`GET`** | `/api/v1/hr/recruitment/referrals` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `employeeReferral` | ✅ Yes |
| **`GET`** | `/api/hr/recruitment/referrals` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `employeeReferral` | ✅ Yes |
| **`POST`** | `/api/v1/hr/recruitment/referrals` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `employee`, `employeeReferral` | ✅ Yes |
| **`POST`** | `/api/hr/recruitment/referrals` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `employee`, `employeeReferral` | ✅ Yes |
| **`PUT`** | `/api/v1/hr/recruitment/referrals/:id/status` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `employeeReferral` | ✅ Yes |
| **`PUT`** | `/api/hr/recruitment/referrals/:id/status` | HR Recruitment & ATS | ✅ Yes | `authenticated` | `employeeReferral` | ✅ Yes |
| **`GET`** | `/api/v1/hr/training/overview` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/training/overview` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/training/types` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/training/types` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/training/types` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/training/types` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/hr/training/types/:id` | HR Training & LMS | ✅ Yes | `authenticated` | `trainingTypeMaster` | ✅ Yes |
| **`PUT`** | `/api/hr/training/types/:id` | HR Training & LMS | ✅ Yes | `authenticated` | `trainingTypeMaster` | ✅ Yes |
| **`DELETE`** | `/api/v1/hr/training/types/:id` | HR Training & LMS | ✅ Yes | `authenticated` | `trainingTypeMaster` | ✅ Yes |
| **`DELETE`** | `/api/hr/training/types/:id` | HR Training & LMS | ✅ Yes | `authenticated` | `trainingTypeMaster` | ✅ Yes |
| **`GET`** | `/api/v1/hr/training/programs` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/training/programs` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/training/programs/:id` | HR Training & LMS | ✅ Yes | `authenticated` | `trainingCourse` | ✅ Yes |
| **`GET`** | `/api/hr/training/programs/:id` | HR Training & LMS | ✅ Yes | `authenticated` | `trainingCourse` | ✅ Yes |
| **`POST`** | `/api/v1/hr/training/programs` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/training/programs` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/training/sessions` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/hr/training/sessions` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/training/sessions/:id` | HR Training & LMS | ✅ Yes | `authenticated` | `trainingSession` | ✅ Yes |
| **`GET`** | `/api/hr/training/sessions/:id` | HR Training & LMS | ✅ Yes | `authenticated` | `trainingSession` | ✅ Yes |
| **`POST`** | `/api/v1/hr/training/sessions` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/training/sessions` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/training/sessions/:id/register` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/training/sessions/:id/register` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/hr/training/sessions/:id/attendance` | HR Training & LMS | ✅ Yes | `authenticated` | `sessionAttendance` | ✅ Yes |
| **`POST`** | `/api/hr/training/sessions/:id/attendance` | HR Training & LMS | ✅ Yes | `authenticated` | `sessionAttendance` | ✅ Yes |
| **`GET`** | `/api/v1/hr/training/employee-trainings` | HR Training & LMS | ✅ Yes | `authenticated` | `courseEnrollment` | ✅ Yes |
| **`GET`** | `/api/hr/training/employee-trainings` | HR Training & LMS | ✅ Yes | `authenticated` | `courseEnrollment` | ✅ Yes |
| **`POST`** | `/api/v1/hr/training/employee-trainings` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/hr/training/employee-trainings` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/v1/hr/training/employee-trainings/:id/progress` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/hr/training/employee-trainings/:id/progress` | HR Training & LMS | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/overtime` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `overtimeRequest` | ✅ Yes |
| **`POST`** | `/api/overtime` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `overtimeRequest` | ✅ Yes |
| **`PUT`** | `/api/overtime/:id/review` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `overtimeRequest` | ✅ Yes |
| **`DELETE`** | `/api/overtime/:id` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `overtimeRequest` | ✅ Yes |
| **`GET`** | `/api/overtime/stats` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `overtimeRequest`, `wfhRequest`, `promotionRecord` | ✅ Yes |
| **`GET`** | `/api/wfh` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `wfhRequest` | ✅ Yes |
| **`POST`** | `/api/wfh` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `wfhRequest` | ✅ Yes |
| **`PUT`** | `/api/wfh/:id/review` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `wfhRequest` | ✅ Yes |
| **`DELETE`** | `/api/wfh/:id` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `wfhRequest`, `promotionRecord`, `probationRecord` | ✅ Yes |
| **`GET`** | `/api/promotions` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `promotionRecord` | ✅ Yes |
| **`POST`** | `/api/promotions` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `promotionRecord` | ✅ Yes |
| **`DELETE`** | `/api/promotions/:id` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `promotionRecord`, `probationRecord`, `providentFundRecord` | ✅ Yes |
| **`GET`** | `/api/probation` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `probationRecord` | ✅ Yes |
| **`POST`** | `/api/probation` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `probationRecord` | ✅ Yes |
| **`PUT`** | `/api/probation/:id` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `probationRecord` | ✅ Yes |
| **`DELETE`** | `/api/probation/:id` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `probationRecord`, `providentFundRecord`, `employee` | ✅ Yes |
| **`GET`** | `/api/provident-funds` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `providentFundRecord` | ✅ Yes |
| **`GET`** | `/api/provident-funds/summary` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `providentFundRecord` | ✅ Yes |
| **`POST`** | `/api/provident-funds` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `employee`, `providentFundRecord` | ✅ Yes |
| **`PUT`** | `/api/provident-funds/:id` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `providentFundRecord` | ✅ Yes |
| **`DELETE`** | `/api/provident-funds/:id` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `providentFundRecord`, `bannedIp`, `systemCronJob` | ✅ Yes |
| **`GET`** | `/api/banned-ips` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `bannedIp` | ✅ Yes |
| **`POST`** | `/api/banned-ips` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `bannedIp` | ✅ Yes |
| **`PUT`** | `/api/banned-ips/:id` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `bannedIp` | ✅ Yes |
| **`DELETE`** | `/api/banned-ips/:id` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `bannedIp`, `systemCronJob` | ✅ Yes |
| **`GET`** | `/api/system/maintenance-status` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/system/clear-cache` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/system/cronjobs` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `systemCronJob` | ⚪ Global |
| **`POST`** | `/api/system/cronjobs` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `systemCronJob` | ⚪ Global |
| **`PUT`** | `/api/system/cronjobs/:id` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `systemCronJob` | ⚪ Global |
| **`POST`** | `/api/system/cronjobs/:id/run` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `systemCronJob` | ⚪ Global |
| **`POST`** | `/api/system/cronjobs/run-subscription-reminders` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`DELETE`** | `/api/system/cronjobs/:id` | HRM Extensions & Overtime | ✅ Yes | `authenticated` | `systemCronJob` | ⚪ Global |
| **`GET`** | `/api/invoices` | B2B Invoices & Estimates | ✅ Yes | `finance.invoices.view` | `sale`, `cmsPage` | ✅ Yes |
| **`POST`** | `/api/invoices` | B2B Invoices & Estimates | ✅ Yes | `finance.invoices.create` | `sale`, `customer` | ✅ Yes |
| **`GET`** | `/api/invoices/recurring` | B2B Invoices & Estimates | ✅ Yes | `finance.invoices.view` | `recurringInvoice` | ✅ Yes |
| **`POST`** | `/api/invoices/recurring/process-due` | B2B Invoices & Estimates | ✅ Yes | `finance.invoices.create` | N/A | ✅ Yes |
| **`GET`** | `/api/invoices/recurring/:id` | B2B Invoices & Estimates | ✅ Yes | `finance.invoices.view` | `recurringInvoice`, `sale` | ✅ Yes |
| **`POST`** | `/api/invoices/recurring` | B2B Invoices & Estimates | ✅ Yes | `finance.invoices.create` | `customer`, `recurringInvoice` | ✅ Yes |
| **`PUT`** | `/api/invoices/recurring/:id` | B2B Invoices & Estimates | ✅ Yes | `finance.invoices.edit` | `recurringInvoice` | ✅ Yes |
| **`PATCH`** | `/api/invoices/recurring/:id/status` | B2B Invoices & Estimates | ✅ Yes | `finance.invoices.edit` | `recurringInvoice` | ✅ Yes |
| **`DELETE`** | `/api/invoices/recurring/:id` | B2B Invoices & Estimates | ✅ Yes | `finance.invoices.delete` | `recurringInvoice` | ✅ Yes |
| **`POST`** | `/api/invoices/recurring/:id/generate` | B2B Invoices & Estimates | ✅ Yes | `finance.invoices.create` | N/A | ✅ Yes |
| **`GET`** | `/api/invoices/:id` | B2B Invoices & Estimates | ✅ Yes | `finance.invoices.view` | `sale` | ✅ Yes |
| **`GET`** | `/api/invoices/:id/payments` | B2B Invoices & Estimates | ✅ Yes | `finance.invoices.view` | `sale`, `salePayment` | ✅ Yes |
| **`POST`** | `/api/invoices/:id/payments` | B2B Invoices & Estimates | ✅ Yes | `authenticated` | `salePayment` | ✅ Yes |
| **`GET`** | `/api/invoices/pos/sales` | B2B Invoices & Estimates | ✅ Yes | `authenticated` | `sale` | ✅ Yes |
| **`POST`** | `/api/invoices/pos/sales` | B2B Invoices & Estimates | ✅ Yes | `authenticated` | `warehouse`, `sale` | ✅ Yes |
| **`GET`** | `/api/invoices/pos/held` | B2B Invoices & Estimates | ✅ Yes | `authenticated` | `heldOrder` | ✅ Yes |
| **`POST`** | `/api/invoices/pos/held` | B2B Invoices & Estimates | ✅ Yes | `authenticated` | `heldOrder` | ✅ Yes |
| **`GET`** | `/api/invoices/public/client/statement` | B2B Invoices & Estimates | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/invoices/public/:id` | B2B Invoices & Estimates | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/invoices/public/:id/pay` | B2B Invoices & Estimates | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/leave/types` | Leave & PTO Engine | ✅ Yes | `authenticated` | `leaveType` | ✅ Yes |
| **`GET`** | `/api/leaves/types` | Leave & PTO Engine | ✅ Yes | `authenticated` | `leaveType` | ✅ Yes |
| **`GET`** | `/api/leave/balances` | Leave & PTO Engine | ✅ Yes | `authenticated` | `employee`, `leaveType`, `leaveRequest` | ✅ Yes |
| **`GET`** | `/api/leaves/balances` | Leave & PTO Engine | ✅ Yes | `authenticated` | `employee`, `leaveType`, `leaveRequest` | ✅ Yes |
| **`GET`** | `/api/leave/requests` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/leaves/requests` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/leave` | Leave & PTO Engine | ✅ Yes | `authenticated` | `employee`, `leaveType`, `leaveRequest` | ✅ Yes |
| **`GET`** | `/api/leaves` | Leave & PTO Engine | ✅ Yes | `authenticated` | `employee`, `leaveType`, `leaveRequest` | ✅ Yes |
| **`POST`** | `/api/leave/requests` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/leaves/requests` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/leave` | Leave & PTO Engine | ✅ Yes | `authenticated` | `leaveRequest`, `employee`, `attendance` | ✅ Yes |
| **`POST`** | `/api/leaves` | Leave & PTO Engine | ✅ Yes | `authenticated` | `leaveRequest`, `employee`, `attendance` | ✅ Yes |
| **`PATCH`** | `/api/leave/requests/:id/status` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`PATCH`** | `/api/leaves/requests/:id/status` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`PATCH`** | `/api/leave/requests/:id` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`PATCH`** | `/api/leaves/requests/:id` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`PUT`** | `/api/leave/requests/:id` | Leave & PTO Engine | ✅ Yes | `authenticated` | `leaveRequest`, `employee`, `attendance` | ✅ Yes |
| **`PUT`** | `/api/leaves/requests/:id` | Leave & PTO Engine | ✅ Yes | `authenticated` | `leaveRequest`, `employee`, `attendance` | ✅ Yes |
| **`POST`** | `/api/leave/requests/:id/cancel` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/leaves/requests/:id/cancel` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`PUT`** | `/api/leave/requests/:id/cancel` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`PUT`** | `/api/leaves/requests/:id/cancel` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/leave/:id/cancel` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/leaves/:id/cancel` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`PUT`** | `/api/leave/:id/cancel` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`PUT`** | `/api/leaves/:id/cancel` | Leave & PTO Engine | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/leave/types` | Leave & PTO Engine | ✅ Yes | `authenticated` | `leaveType` | ✅ Yes |
| **`POST`** | `/api/leaves/types` | Leave & PTO Engine | ✅ Yes | `authenticated` | `leaveType` | ✅ Yes |
| **`PUT`** | `/api/leave/types/:id` | Leave & PTO Engine | ✅ Yes | `authenticated` | `leaveType` | ✅ Yes |
| **`PUT`** | `/api/leaves/types/:id` | Leave & PTO Engine | ✅ Yes | `authenticated` | `leaveType` | ✅ Yes |
| **`DELETE`** | `/api/leave/types/:id` | Leave & PTO Engine | ✅ Yes | `authenticated` | `leaveType` | ✅ Yes |
| **`DELETE`** | `/api/leaves/types/:id` | Leave & PTO Engine | ✅ Yes | `authenticated` | `leaveType` | ✅ Yes |
| **`GET`** | `/api/v1/me/assets/dashboard` | ESS My Custody Assets | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/assets/dashboard` | ESS My Custody Assets | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/assets/assignments/:id/acknowledge` | ESS My Custody Assets | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/assets/assignments/:id/acknowledge` | ESS My Custody Assets | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/assets/requests` | ESS My Custody Assets | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/assets/requests` | ESS My Custody Assets | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/assets/requests` | ESS My Custody Assets | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/assets/requests` | ESS My Custody Assets | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/attendance/status` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/attendance/status` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/attendance/punch` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/attendance/punch` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/attendance/records` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/attendance/records` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/attendance/regularizations` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/attendance/regularizations` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/attendance/regularizations` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/attendance/regularizations` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/attendance/shifts` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/attendance/shifts` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/attendance/policies` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/attendance/policies` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/attendance/requests` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/attendance/requests` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/attendance/requests` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/attendance/requests` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/attendance/timesheets` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/attendance/timesheets` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/attendance/timesheets` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/attendance/timesheets` | ESS My Clock-in & Attendance | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/calendar/events` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/calendar/events` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/calendar/events` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/calendar/events` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/v1/me/calendar/events/:id` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/me/calendar/events/:id` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/todo/items` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/todo/items` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/todo/items` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/todo/items` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/v1/me/todo/items/status` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/me/todo/items/status` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/v1/me/todo/items/:id` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/me/todo/items/:id` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/notifications` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/notifications` | ESS Team Collaboration | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/documents/contracts` | ESS My Document Vault | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/documents/contracts` | ESS My Document Vault | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/documents/acknowledgements` | ESS My Document Vault | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/documents/acknowledgements` | ESS My Document Vault | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/documents/acknowledgements/:documentId` | ESS My Document Vault | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/documents/acknowledgements/:documentId` | ESS My Document Vault | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/documents/requests` | ESS My Document Vault | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/documents/requests` | ESS My Document Vault | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/documents/requests` | ESS My Document Vault | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/documents/requests` | ESS My Document Vault | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/leave/applications` | ESS My Leave Requests | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/leave/applications` | ESS My Leave Requests | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/leave/applications/dry-run` | ESS My Leave Requests | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/leave/applications/dry-run` | ESS My Leave Requests | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/leave/applications` | ESS My Leave Requests | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/leave/applications` | ESS My Leave Requests | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/leave/applications/:id/cancel` | ESS My Leave Requests | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/leave/applications/:id/cancel` | ESS My Leave Requests | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/leave/balance` | ESS My Leave Requests | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/leave/balance` | ESS My Leave Requests | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/leave/policies` | ESS My Leave Requests | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/leave/policies` | ESS My Leave Requests | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/leave/team-calendar` | ESS My Leave Requests | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/leave/team-calendar` | ESS My Leave Requests | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/lifecycle/awards` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `award` | ✅ Yes |
| **`GET`** | `/api/me/lifecycle/awards` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `award` | ✅ Yes |
| **`GET`** | `/api/v1/me/lifecycle/promotions` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `promotionRecord` | ✅ Yes |
| **`GET`** | `/api/me/lifecycle/promotions` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `promotionRecord` | ✅ Yes |
| **`GET`** | `/api/v1/me/lifecycle/transfers` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `employeeTransfer` | ✅ Yes |
| **`GET`** | `/api/me/lifecycle/transfers` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `employeeTransfer` | ✅ Yes |
| **`POST`** | `/api/v1/me/lifecycle/transfers/request` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `employeeTransfer` | ✅ Yes |
| **`POST`** | `/api/me/lifecycle/transfers/request` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `employeeTransfer` | ✅ Yes |
| **`GET`** | `/api/v1/me/lifecycle/warnings` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `disciplinaryWarning` | ✅ Yes |
| **`GET`** | `/api/me/lifecycle/warnings` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `disciplinaryWarning` | ✅ Yes |
| **`PUT`** | `/api/v1/me/lifecycle/warnings/:id/acknowledge` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/me/lifecycle/warnings/:id/acknowledge` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/me/lifecycle/warnings/:id/response` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/me/lifecycle/warnings/:id/response` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/lifecycle/resignation` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`GET`** | `/api/me/lifecycle/resignation` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`POST`** | `/api/v1/me/lifecycle/resignation` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/lifecycle/resignation` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/lifecycle/resignation/:id/withdraw` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/lifecycle/resignation/:id/withdraw` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/lifecycle/exit` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`GET`** | `/api/me/lifecycle/exit` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`GET`** | `/api/v1/me/lifecycle/trips` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `employeeTrip` | ✅ Yes |
| **`GET`** | `/api/me/lifecycle/trips` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `employeeTrip` | ✅ Yes |
| **`POST`** | `/api/v1/me/lifecycle/trips` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/lifecycle/trips` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/lifecycle/trips/:id/expenses` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/lifecycle/trips/:id/expenses` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/lifecycle/complaints` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `employeeComplaint` | ✅ Yes |
| **`GET`** | `/api/me/lifecycle/complaints` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | `employeeComplaint` | ✅ Yes |
| **`POST`** | `/api/v1/me/lifecycle/complaints` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/lifecycle/complaints` | ESS My Onboarding & Transitions | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/meetings` | ESS My Scheduled Meetings | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/meetings` | ESS My Scheduled Meetings | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/meetings/:id/rsvp` | ESS My Scheduled Meetings | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/meetings/:id/rsvp` | ESS My Scheduled Meetings | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/meetings/action-items` | ESS My Scheduled Meetings | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/meetings/action-items` | ESS My Scheduled Meetings | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/v1/me/meetings/action-items/:id` | ESS My Scheduled Meetings | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/me/meetings/action-items/:id` | ESS My Scheduled Meetings | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/payroll/payslips` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | `payslip` | ✅ Yes |
| **`GET`** | `/api/me/payroll/payslips` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | `payslip` | ✅ Yes |
| **`GET`** | `/api/v1/me/payroll/payslips/:id` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | `payslip` | ✅ Yes |
| **`GET`** | `/api/me/payroll/payslips/:id` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | `payslip` | ✅ Yes |
| **`GET`** | `/api/v1/me/payroll/salary` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | `employeeSalaryAssignment` | ✅ Yes |
| **`GET`** | `/api/me/payroll/salary` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | `employeeSalaryAssignment` | ✅ Yes |
| **`GET`** | `/api/v1/me/payroll/tax` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | `employeeTaxDeclaration` | ✅ Yes |
| **`GET`** | `/api/me/payroll/tax` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | `employeeTaxDeclaration` | ✅ Yes |
| **`POST`** | `/api/v1/me/payroll/tax/declare` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | `employeeTaxDeclaration` | ✅ Yes |
| **`POST`** | `/api/me/payroll/tax/declare` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | `employeeTaxDeclaration` | ✅ Yes |
| **`GET`** | `/api/v1/me/payroll/reimbursements-loans` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | `expenseClaim`, `employeeLoan` | ✅ Yes |
| **`GET`** | `/api/me/payroll/reimbursements-loans` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | `expenseClaim`, `employeeLoan` | ✅ Yes |
| **`POST`** | `/api/v1/me/payroll/loans/request` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | `employeeLoan` | ✅ Yes |
| **`POST`** | `/api/me/payroll/loans/request` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | `employeeLoan` | ✅ Yes |
| **`GET`** | `/api/v1/me/payroll/statutory-forms` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/payroll/statutory-forms` | ESS My Payslips & Tax Declarations | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/performance/reviews` | ESS My Performance Goals | ✅ Yes | `authenticated` | `okrReview` | ✅ Yes |
| **`GET`** | `/api/me/performance/reviews` | ESS My Performance Goals | ✅ Yes | `authenticated` | `okrReview` | ✅ Yes |
| **`POST`** | `/api/v1/me/performance/reviews/self` | ESS My Performance Goals | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/performance/reviews/self` | ESS My Performance Goals | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PUT`** | `/api/v1/me/performance/reviews/:id/acknowledge` | ESS My Performance Goals | ✅ Yes | `authenticated` | `okrReview` | ✅ Yes |
| **`PUT`** | `/api/me/performance/reviews/:id/acknowledge` | ESS My Performance Goals | ✅ Yes | `authenticated` | `okrReview` | ✅ Yes |
| **`GET`** | `/api/v1/me/performance/goals` | ESS My Performance Goals | ✅ Yes | `authenticated` | `okrObjective` | ✅ Yes |
| **`GET`** | `/api/me/performance/goals` | ESS My Performance Goals | ✅ Yes | `authenticated` | `okrObjective` | ✅ Yes |
| **`POST`** | `/api/v1/me/performance/goals/checkin` | ESS My Performance Goals | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/performance/goals/checkin` | ESS My Performance Goals | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/performance/cycles` | ESS My Performance Goals | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/performance/cycles` | ESS My Performance Goals | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/performance/indicators` | ESS My Performance Goals | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/performance/indicators` | ESS My Performance Goals | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/recruitment/job-postings` | ESS Internal Job Openings | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`GET`** | `/api/me/recruitment/job-postings` | ESS Internal Job Openings | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`POST`** | `/api/v1/me/recruitment/job-postings/:id/apply` | ESS Internal Job Openings | ✅ Yes | `authenticated` | `employee`, `jobPosting`, `jobCandidate` | ✅ Yes |
| **`POST`** | `/api/me/recruitment/job-postings/:id/apply` | ESS Internal Job Openings | ✅ Yes | `authenticated` | `employee`, `jobPosting`, `jobCandidate` | ✅ Yes |
| **`GET`** | `/api/v1/me/recruitment/interviews` | ESS Internal Job Openings | ✅ Yes | `authenticated` | `employee`, `jobCandidateInterview` | ✅ Yes |
| **`GET`** | `/api/me/recruitment/interviews` | ESS Internal Job Openings | ✅ Yes | `authenticated` | `employee`, `jobCandidateInterview` | ✅ Yes |
| **`GET`** | `/api/v1/me/recruitment/onboarding` | ESS Internal Job Openings | ✅ Yes | `authenticated` | `candidateOnboardingTask` | ✅ Yes |
| **`GET`** | `/api/me/recruitment/onboarding` | ESS Internal Job Openings | ✅ Yes | `authenticated` | `candidateOnboardingTask` | ✅ Yes |
| **`GET`** | `/api/v1/me/recruitment/assessments` | ESS Internal Job Openings | ✅ Yes | `authenticated` | `candidateAssessment` | ✅ Yes |
| **`GET`** | `/api/me/recruitment/assessments` | ESS Internal Job Openings | ✅ Yes | `authenticated` | `candidateAssessment` | ✅ Yes |
| **`GET`** | `/api/v1/me/recruitment/career` | ESS Internal Job Openings | ✅ Yes | `authenticated` | `employee`, `employeeReferral` | ✅ Yes |
| **`GET`** | `/api/me/recruitment/career` | ESS Internal Job Openings | ✅ Yes | `authenticated` | `employee`, `employeeReferral` | ✅ Yes |
| **`GET`** | `/api/v1/me/training/trainings` | ESS My Learning & Courses | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/training/trainings` | ESS My Learning & Courses | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/training/sessions` | ESS My Learning & Courses | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/training/sessions` | ESS My Learning & Courses | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/me/training/programs` | ESS My Learning & Courses | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/me/training/programs` | ESS My Learning & Courses | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/me/training/sessions/:id/register` | ESS My Learning & Courses | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/me/training/sessions/:id/register` | ESS My Learning & Courses | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/v1/me/training/trainings/:id/progress` | ESS My Learning & Courses | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/me/training/trainings/:id/progress` | ESS My Learning & Courses | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/media/upload` | Media Upload & Asset Storage | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/media` | Media Upload & Asset Storage | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/media/:id` | Media Upload & Asset Storage | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/v1/media/:id` | Media Upload & Asset Storage | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/notes` | Private & Shared Notes | ⚪ Public | `authenticated` | `workspaceNote` | ✅ Yes |
| **`POST`** | `/api/notes` | Private & Shared Notes | ⚪ Public | `authenticated` | `workspaceNote` | ✅ Yes |
| **`PUT`** | `/api/notes/:id` | Private & Shared Notes | ⚪ Public | `authenticated` | `workspaceNote` | ✅ Yes |
| **`DELETE`** | `/api/notes/:id` | Private & Shared Notes | ⚪ Public | `authenticated` | `workspaceNote` | ✅ Yes |
| **`GET`** | `/api/offboarding/exits` | Offboarding & Exit Clearances (FnF) | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`POST`** | `/api/offboarding/exits` | Offboarding & Exit Clearances (FnF) | ✅ Yes | `authenticated` | `employee`, `employeeExit` | ✅ Yes |
| **`GET`** | `/api/offboarding/exits/:id` | Offboarding & Exit Clearances (FnF) | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`PUT`** | `/api/offboarding/exits/:id` | Offboarding & Exit Clearances (FnF) | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`PUT`** | `/api/offboarding/exits/:id/clearance` | Offboarding & Exit Clearances (FnF) | ✅ Yes | `authenticated` | `employeeExit`, `asset` | ✅ Yes |
| **`PUT`** | `/api/offboarding/exits/:id/checklist/:itemId` | Offboarding & Exit Clearances (FnF) | ✅ Yes | `authenticated` | `exitChecklistItem` | ⚪ Global |
| **`POST`** | `/api/offboarding/exits/:id/settle-fnf` | Offboarding & Exit Clearances (FnF) | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`DELETE`** | `/api/offboarding/exits/:id` | Offboarding & Exit Clearances (FnF) | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`GET`** | `/api/offboarding/summary` | Offboarding & Exit Clearances (FnF) | ✅ Yes | `authenticated` | `employeeExit` | ✅ Yes |
| **`GET`** | `/api/addons/okr/cycles` | OKR Goals & Objectives | ✅ Yes | `authenticated` | `okrCycle` | ✅ Yes |
| **`POST`** | `/api/addons/okr/cycles` | OKR Goals & Objectives | ✅ Yes | `authenticated` | `okrCycle` | ✅ Yes |
| **`GET`** | `/api/addons/okr/objectives` | OKR Goals & Objectives | ✅ Yes | `authenticated` | `okrObjective` | ✅ Yes |
| **`GET`** | `/api/addons/okr/tree` | OKR Goals & Objectives | ✅ Yes | `authenticated` | `okrObjective` | ✅ Yes |
| **`GET`** | `/api/addons/okr/objectives/:id` | OKR Goals & Objectives | ✅ Yes | `authenticated` | `okrObjective` | ✅ Yes |
| **`POST`** | `/api/addons/okr/objectives` | OKR Goals & Objectives | ✅ Yes | `authenticated` | `okrObjective` | ✅ Yes |
| **`GET`** | `/api/addons/okr/checkins` | OKR Goals & Objectives | ✅ Yes | `authenticated` | `okrCheckin` | ✅ Yes |
| **`POST`** | `/api/addons/okr/checkins` | OKR Goals & Objectives | ✅ Yes | `authenticated` | `okrCheckin`, `okrKeyResult`, `okrObjective` | ✅ Yes |
| **`GET`** | `/api/addons/okr/reviews` | OKR Goals & Objectives | ✅ Yes | `authenticated` | `okrReview` | ✅ Yes |
| **`POST`** | `/api/addons/okr/reviews` | OKR Goals & Objectives | ✅ Yes | `authenticated` | `okrReview` | ⚪ Global |
| **`GET`** | `/api/addons/okr/indicators` | OKR Goals & Objectives | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/addons/okr/appraisals` | OKR Goals & Objectives | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/v1/hr/organization/structure` | Organization & Departments Master | ✅ Yes | `authenticated` | `branch`, `department`, `designation` | ✅ Yes |
| **`GET`** | `/api/hr/organization/structure` | Organization & Departments Master | ✅ Yes | `authenticated` | `branch`, `department`, `designation` | ✅ Yes |
| **`GET`** | `/api/payments/razorpay/config` | Payment Gateways & Transactions | ✅ Yes | `authenticated` | `cmsPage` | ✅ Yes |
| **`POST`** | `/api/payments/razorpay/config` | Payment Gateways & Transactions | ✅ Yes | `authenticated` | `cmsPage` | ✅ Yes |
| **`POST`** | `/api/payments/razorpay/create-order` | Payment Gateways & Transactions | ✅ Yes | `authenticated` | `cmsPage` | ✅ Yes |
| **`POST`** | `/api/payments/razorpay/verify` | Payment Gateways & Transactions | ✅ Yes | `authenticated` | `cmsPage`, `sale` | ✅ Yes |
| **`POST`** | `/api/payments/razorpay/test-payment` | Payment Gateways & Transactions | ✅ Yes | `authenticated` | `sale`, `cmsPage` | ✅ Yes |
| **`GET`** | `/api/payments/razorpay/transactions` | Payment Gateways & Transactions | ✅ Yes | `authenticated` | `paymentGatewayTransaction`, `cmsPage`, `salePayment` | ✅ Yes |
| **`GET`** | `/api/payroll/states` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `stateUTMaster` | ⚪ Global |
| **`GET`** | `/api/payroll/rules` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `statutoryRule` | ✅ Yes |
| **`POST`** | `/api/payroll/rules` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `statutoryRule` | ✅ Yes |
| **`GET`** | `/api/payroll/formulas` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `payrollFormula` | ✅ Yes |
| **`POST`** | `/api/payroll/formulas` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `payrollFormula` | ✅ Yes |
| **`POST`** | `/api/payroll/formulas/test` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/payroll/preflight` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/payroll/batch/calculate` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/payroll/runs/:id/traces` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `payrollExecutionTrace` | ✅ Yes |
| **`GET`** | `/api/payroll/runs/:id/export/excel` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/payroll/runs/:id/export/pdf` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/payroll/templates` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `payrollExportTemplate` | ✅ Yes |
| **`POST`** | `/api/payroll/templates` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `payrollExportTemplate` | ✅ Yes |
| **`GET`** | `/api/payroll/establishments` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `establishment` | ✅ Yes |
| **`POST`** | `/api/payroll/establishments` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `establishment` | ✅ Yes |
| **`PUT`** | `/api/payroll/establishments/:id` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `establishment` | ✅ Yes |
| **`DELETE`** | `/api/payroll/establishments/:id` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `establishment` | ✅ Yes |
| **`GET`** | `/api/payroll/clients` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `staffingClient` | ✅ Yes |
| **`POST`** | `/api/payroll/clients` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `staffingClient` | ✅ Yes |
| **`PUT`** | `/api/payroll/clients/:id` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `staffingClient` | ✅ Yes |
| **`DELETE`** | `/api/payroll/clients/:id` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `staffingClient` | ✅ Yes |
| **`GET`** | `/api/payroll/attendance-summary` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/payroll/rules/:id/verify` | Payroll Phase 1 Processing | ⚪ Public | `authenticated` | `statutoryRule` | ✅ Yes |
| **`GET`** | `/api/payroll/salary-components` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `salaryComponent` | ✅ Yes |
| **`POST`** | `/api/payroll/salary-components` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `salaryComponent` | ✅ Yes |
| **`PUT`** | `/api/payroll/salary-components/:id` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `salaryComponent` | ✅ Yes |
| **`DELETE`** | `/api/payroll/salary-components/:id` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `salaryComponent` | ✅ Yes |
| **`GET`** | `/api/payroll/salary-structures` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `salaryStructure` | ✅ Yes |
| **`POST`** | `/api/payroll/salary-structures` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `salaryStructure` | ✅ Yes |
| **`PUT`** | `/api/payroll/salary-structures/:id` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `salaryStructure`, `salaryStructureItem` | ✅ Yes |
| **`DELETE`** | `/api/payroll/salary-structures/:id` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `salaryStructure` | ✅ Yes |
| **`GET`** | `/api/payroll/employees` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `employee` | ✅ Yes |
| **`POST`** | `/api/payroll/salary-assignments` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `employeeSalaryAssignment`, `salaryStructure`, `employeeSalaryItem` | ✅ Yes |
| **`POST`** | `/api/payroll/simulate-ctc` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/payroll/tax-declarations` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `employeeTaxDeclaration` | ✅ Yes |
| **`POST`** | `/api/payroll/tax-declarations` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `employeeTaxDeclaration`, `employee` | ✅ Yes |
| **`POST`** | `/api/payroll/tax-declarations/compare` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/payroll/tax-declarations/regime-status` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `employeeTaxDeclaration` | ✅ Yes |
| **`POST`** | `/api/payroll/tax-declarations/:id/proofs` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `taxDeclarationProof` | ⚪ Global |
| **`PATCH`** | `/api/payroll/tax-declarations/:id/proofs/:proofId/status` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `taxDeclarationProof`, `employeeTaxDeclaration` | ⚪ Global |
| **`PATCH`** | `/api/payroll/tax-declarations/:id/status` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `employeeTaxDeclaration` | ⚪ Global |
| **`GET`** | `/api/payroll/runs` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `payrollRun` | ✅ Yes |
| **`PATCH`** | `/api/payroll/runs/:id/status` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `payrollRun`, `payrollSnapshot` | ✅ Yes |
| **`GET`** | `/api/payroll/runs/:id/snapshots` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `payrollSnapshot` | ✅ Yes |
| **`GET`** | `/api/payroll/payslips` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `employee`, `payslip` | ✅ Yes |
| **`GET`** | `/api/payroll/payslips/:id` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `payslip` | ✅ Yes |
| **`GET`** | `/api/payroll/statutory-forms/form16/:employeeId` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `employee` | ✅ Yes |
| **`GET`** | `/api/payroll/statutory-forms/form138` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `tenant`, `employee`, `payslip` | ✅ Yes |
| **`GET`** | `/api/payroll/statutory-rules` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `statutoryRule` | ✅ Yes |
| **`POST`** | `/api/payroll/statutory-rules` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `statutoryRule` | ✅ Yes |
| **`PUT`** | `/api/payroll/statutory-rules/:id` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `statutoryRule` | ✅ Yes |
| **`GET`** | `/api/payroll/:id/export-bank` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `payrollRun`, `payslip` | ✅ Yes |
| **`POST`** | `/api/payroll/:id/disburse-bank` | Statutory Payroll & Tax Compliance | ✅ Yes | `authenticated` | `payrollRun` | ✅ Yes |
| **`GET`** | `/api/v1/shared/events` | Platform Foundation Services | ✅ Yes | `authenticated` | `outboxEvent` | ✅ Yes |
| **`GET`** | `/api/shared/events` | Platform Foundation Services | ✅ Yes | `authenticated` | `outboxEvent` | ✅ Yes |
| **`GET`** | `/api/v1/shared/notifications` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/shared/notifications` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/shared/notifications/:id/read` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/shared/notifications/:id/read` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/shared/notifications/read-all` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/shared/notifications/read-all` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/hr/workflows` | Platform Foundation Services | ✅ Yes | `authenticated` | `workflowDefinition` | ✅ Yes |
| **`GET`** | `/api/hr/workflows` | Platform Foundation Services | ✅ Yes | `authenticated` | `workflowDefinition` | ✅ Yes |
| **`POST`** | `/api/v1/hr/workflows` | Platform Foundation Services | ✅ Yes | `authenticated` | `workflowDefinition` | ✅ Yes |
| **`POST`** | `/api/hr/workflows` | Platform Foundation Services | ✅ Yes | `authenticated` | `workflowDefinition` | ✅ Yes |
| **`GET`** | `/api/v1/hr/approvals` | Platform Foundation Services | ✅ Yes | `authenticated` | `approvalRequest` | ✅ Yes |
| **`GET`** | `/api/hr/approvals` | Platform Foundation Services | ✅ Yes | `authenticated` | `approvalRequest` | ✅ Yes |
| **`GET`** | `/api/v1/me/approvals` | Platform Foundation Services | ✅ Yes | `authenticated` | `approvalRequest` | ✅ Yes |
| **`GET`** | `/api/me/approvals` | Platform Foundation Services | ✅ Yes | `authenticated` | `approvalRequest` | ✅ Yes |
| **`POST`** | `/api/v1/shared/approvals/:id/approve` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/shared/approvals/:id/approve` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/shared/approvals/:id/reject` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/shared/approvals/:id/reject` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/shared/approvals/:id/withdraw` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/shared/approvals/:id/withdraw` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/v1/shared/approvals/:id/delegate` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/shared/approvals/:id/delegate` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/v1/shared/audit-trail` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/shared/audit-trail` | Platform Foundation Services | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/support/platform/tickets` | Platform Support Tickets | ✅ Yes | `authenticated` | `platformSupportTicket`, `tenant`, `platformTicketMessage` | ✅ Yes |
| **`POST`** | `/api/support/platform/tickets` | Platform Support Tickets | ✅ Yes | `authenticated` | `tenant`, `platformSupportTicket`, `platformTicketMessage` | ✅ Yes |
| **`PUT`** | `/api/support/platform/tickets/:id` | Platform Support Tickets | ✅ Yes | `authenticated` | `platformSupportTicket` | ⚪ Global |
| **`GET`** | `/api/support/platform/tickets/:id` | Platform Support Tickets | ✅ Yes | `authenticated` | `platformSupportTicket` | ✅ Yes |
| **`POST`** | `/api/support/platform/tickets/:id/messages` | Platform Support Tickets | ✅ Yes | `authenticated` | `platformSupportTicket`, `platformTicketMessage` | ✅ Yes |
| **`POST`** | `/api/support/platform/tickets/:id/action` | Platform Support Tickets | ✅ Yes | `authenticated` | `platformSupportTicket`, `tenantAddon`, `platformTicketMessage` | ✅ Yes |
| **`DELETE`** | `/api/support/platform/tickets/:id` | Platform Support Tickets | ✅ Yes | `authenticated` | `platformSupportTicket` | ⚪ Global |
| **`GET`** | `/api/support/platform/summary/stats` | Platform Support Tickets | ✅ Yes | `authenticated` | `platformSupportTicket` | ✅ Yes |
| **`GET`** | `/api/products` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `product` | ✅ Yes |
| **`POST`** | `/api/products` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `productCategory` | ✅ Yes |
| **`PUT`** | `/api/products/:id` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `product` | ✅ Yes |
| **`DELETE`** | `/api/products/:id` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `product` | ✅ Yes |
| **`GET`** | `/api/products/categories` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `productCategory` | ✅ Yes |
| **`GET`** | `/api/products/warehouses` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `warehouse` | ✅ Yes |
| **`GET`** | `/api/products/brands` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `brand` | ✅ Yes |
| **`POST`** | `/api/products/brands` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `brand` | ✅ Yes |
| **`PUT`** | `/api/products/brands/:id` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `brand` | ✅ Yes |
| **`DELETE`** | `/api/products/brands/:id` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `brand` | ✅ Yes |
| **`POST`** | `/api/products/categories` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `productCategory` | ✅ Yes |
| **`DELETE`** | `/api/products/categories/:id` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `productCategory` | ✅ Yes |
| **`GET`** | `/api/products/taxes` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `taxRate` | ✅ Yes |
| **`POST`** | `/api/products/taxes` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `taxRate` | ✅ Yes |
| **`DELETE`** | `/api/products/taxes/:id` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `taxRate` | ✅ Yes |
| **`PUT`** | `/api/products/taxes/:id` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `taxRate` | ✅ Yes |
| **`GET`** | `/api/products/units` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `unit` | ✅ Yes |
| **`POST`** | `/api/products/units` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `unit` | ✅ Yes |
| **`DELETE`** | `/api/products/units/:id` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `unit` | ✅ Yes |
| **`POST`** | `/api/products/warehouses` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `warehouse` | ✅ Yes |
| **`POST`** | `/api/products/stock/add` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `productWarehouse` | ✅ Yes |
| **`GET`** | `/api/products/:id/movements` | Product & Inventory Catalog | ✅ Yes | `authenticated` | `product`, `stockMovement` | ✅ Yes |
| **`GET`** | `/api/projects` | Project Management & Kanban | ✅ Yes | `authenticated` | `project`, `cmsPage`, `projectTask` | ✅ Yes |
| **`POST`** | `/api/projects` | Project Management & Kanban | ✅ Yes | `authenticated` | `project` | ✅ Yes |
| **`DELETE`** | `/api/projects/:id` | Project Management & Kanban | ✅ Yes | `authenticated` | `project` | ✅ Yes |
| **`GET`** | `/api/projects/tasks` | Project Management & Kanban | ✅ Yes | `authenticated` | `projectTask` | ✅ Yes |
| **`POST`** | `/api/projects/tasks` | Project Management & Kanban | ✅ Yes | `authenticated` | `project`, `projectTask` | ✅ Yes |
| **`GET`** | `/api/projects/:id` | Project Management & Kanban | ✅ Yes | `authenticated` | `project` | ✅ Yes |
| **`PUT`** | `/api/projects/:id` | Project Management & Kanban | ✅ Yes | `authenticated` | `project` | ✅ Yes |
| **`POST`** | `/api/projects/:id/notes` | Project Management & Kanban | ✅ Yes | `authenticated` | `project` | ✅ Yes |
| **`POST`** | `/api/projects/:id/files` | Project Management & Kanban | ✅ Yes | `authenticated` | `project` | ✅ Yes |
| **`GET`** | `/api/projects/:id/tasks` | Project Management & Kanban | ✅ Yes | `authenticated` | `project`, `projectTask` | ✅ Yes |
| **`POST`** | `/api/projects/:id/tasks` | Project Management & Kanban | ✅ Yes | `authenticated` | `project`, `projectTask` | ✅ Yes |
| **`PUT`** | `/api/projects/tasks/:taskId` | Project Management & Kanban | ✅ Yes | `authenticated` | `projectTask` | ✅ Yes |
| **`DELETE`** | `/api/projects/tasks/:taskId` | Project Management & Kanban | ✅ Yes | `authenticated` | `projectTask` | ✅ Yes |
| **`POST`** | `/api/projects/:id/generate-invoice` | Project Management & Kanban | ✅ Yes | `authenticated` | `project`, `warehouse`, `product` | ✅ Yes |
| **`GET`** | `/api/projects/:id/milestones` | Project Management & Kanban | ✅ Yes | `authenticated` | `projectMilestone` | ✅ Yes |
| **`POST`** | `/api/projects/:id/milestones` | Project Management & Kanban | ✅ Yes | `authenticated` | `project`, `projectMilestone` | ✅ Yes |
| **`PATCH`** | `/api/projects/:id/milestones/:mid` | Project Management & Kanban | ✅ Yes | `authenticated` | `projectMilestone`, `project` | ✅ Yes |
| **`DELETE`** | `/api/projects/:id/milestones/:mid` | Project Management & Kanban | ✅ Yes | `authenticated` | `projectMilestone` | ✅ Yes |
| **`GET`** | `/api/purchases` | Purchases & Procurement | ✅ Yes | `authenticated` | `purchase` | ✅ Yes |
| **`GET`** | `/api/purchases/:id` | Purchases & Procurement | ✅ Yes | `authenticated` | `purchase` | ✅ Yes |
| **`POST`** | `/api/purchases` | Purchases & Procurement | ✅ Yes | `authenticated` | `warehouse`, `purchase` | ✅ Yes |
| **`PATCH`** | `/api/purchases/:id/status` | Purchases & Procurement | ✅ Yes | `authenticated` | `purchase` | ✅ Yes |
| **`GET`** | `/api/purchases/:id/payments` | Purchases & Procurement | ✅ Yes | `authenticated` | `purchase`, `purchasePayment` | ✅ Yes |
| **`GET`** | `/api/purchases/:id/returns` | Purchases & Procurement | ✅ Yes | `authenticated` | `purchase`, `purchaseReturn` | ✅ Yes |
| **`POST`** | `/api/purchases/:id/payments` | Purchases & Procurement | ✅ Yes | `authenticated` | `purchase` | ✅ Yes |
| **`DELETE`** | `/api/purchases/:id` | Purchases & Procurement | ✅ Yes | `authenticated` | `purchase` | ✅ Yes |
| **`GET`** | `/api/qz/certificate` | Thermal Receipt Printing (QZ Tray) | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/qz/sign` | Thermal Receipt Printing (QZ Tray) | ⚪ Public | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/recruitment/jobs` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`GET`** | `/api/addons/recruitment/jobs` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`POST`** | `/api/recruitment/jobs` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`POST`** | `/api/addons/recruitment/jobs` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`GET`** | `/api/recruitment/jobs/:id` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`GET`** | `/api/addons/recruitment/jobs/:id` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`PUT`** | `/api/recruitment/jobs/:id` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`PUT`** | `/api/addons/recruitment/jobs/:id` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`DELETE`** | `/api/recruitment/jobs/:id` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`DELETE`** | `/api/addons/recruitment/jobs/:id` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobPosting` | ✅ Yes |
| **`GET`** | `/api/recruitment/candidates` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`GET`** | `/api/addons/recruitment/candidates` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`POST`** | `/api/recruitment/candidates` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`POST`** | `/api/addons/recruitment/candidates` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`PUT`** | `/api/recruitment/candidates/:id/stage` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`PUT`** | `/api/addons/recruitment/candidates/:id/stage` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`PUT`** | `/api/recruitment/candidates/:id/scorecard` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`PUT`** | `/api/addons/recruitment/candidates/:id/scorecard` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`POST`** | `/api/recruitment/candidates/:id/convert-to-employee` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`POST`** | `/api/addons/recruitment/candidates/:id/convert-to-employee` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobCandidate` | ✅ Yes |
| **`POST`** | `/api/recruitment/candidates/:id/interviews` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobCandidate`, `jobCandidateInterview`, `tenant` | ✅ Yes |
| **`POST`** | `/api/addons/recruitment/candidates/:id/interviews` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobCandidate`, `jobCandidateInterview`, `tenant` | ✅ Yes |
| **`GET`** | `/api/recruitment/campus-candidates` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `campusCandidate` | ✅ Yes |
| **`GET`** | `/api/addons/recruitment/campus-candidates` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `campusCandidate` | ✅ Yes |
| **`POST`** | `/api/recruitment/campus-candidates` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `employee`, `campusCandidate` | ✅ Yes |
| **`POST`** | `/api/addons/recruitment/campus-candidates` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `employee`, `campusCandidate` | ✅ Yes |
| **`PUT`** | `/api/recruitment/campus-candidates/:id` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `campusCandidate` | ✅ Yes |
| **`PUT`** | `/api/addons/recruitment/campus-candidates/:id` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `campusCandidate` | ✅ Yes |
| **`DELETE`** | `/api/recruitment/campus-candidates/:id` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `campusCandidate` | ✅ Yes |
| **`DELETE`** | `/api/addons/recruitment/campus-candidates/:id` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `campusCandidate` | ✅ Yes |
| **`GET`** | `/api/recruitment/referrals` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `employeeReferral` | ✅ Yes |
| **`GET`** | `/api/addons/recruitment/referrals` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `employeeReferral` | ✅ Yes |
| **`POST`** | `/api/recruitment/referrals` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `employee`, `employeeReferral` | ✅ Yes |
| **`POST`** | `/api/addons/recruitment/referrals` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `employee`, `employeeReferral` | ✅ Yes |
| **`PUT`** | `/api/recruitment/referrals/:id` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `employeeReferral` | ✅ Yes |
| **`PUT`** | `/api/addons/recruitment/referrals/:id` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `employeeReferral` | ✅ Yes |
| **`DELETE`** | `/api/recruitment/referrals/:id` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `employeeReferral` | ✅ Yes |
| **`DELETE`** | `/api/addons/recruitment/referrals/:id` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `employeeReferral` | ✅ Yes |
| **`GET`** | `/api/public/jobs/:tenantSlug` | Recruitment & Candidate Tracking | ⚪ Public | `authenticated` | `tenant`, `jobPosting` | ✅ Yes |
| **`GET`** | `/api/public/jobs/:tenantSlug/:jobSlug` | Recruitment & Candidate Tracking | ⚪ Public | `authenticated` | `tenant`, `jobPosting` | ✅ Yes |
| **`POST`** | `/api/public/jobs/:jobId/apply` | Recruitment & Candidate Tracking | ✅ Yes | `authenticated` | `jobPosting`, `jobCandidate`, `campusCandidate` | ✅ Yes |
| **`GET`** | `/api/returns/sales` | Sales & Purchase Returns | ✅ Yes | `finance.invoices.view` | `salesReturn` | ✅ Yes |
| **`GET`** | `/api/returns/sales/:id` | Sales & Purchase Returns | ✅ Yes | `finance.invoices.view` | `salesReturn` | ✅ Yes |
| **`POST`** | `/api/returns/sales` | Sales & Purchase Returns | ✅ Yes | `finance.invoices.edit` | `sale`, `salesReturn`, `creditNote` | ✅ Yes |
| **`PATCH`** | `/api/returns/sales/:id/approve` | Sales & Purchase Returns | ✅ Yes | `finance.invoices.edit` | N/A | ⚪ Global |
| **`POST`** | `/api/returns/sales/:id/approve` | Sales & Purchase Returns | ✅ Yes | `finance.invoices.edit` | `salesReturn`, `creditNote` | ✅ Yes |
| **`PATCH`** | `/api/returns/sales/:id/complete` | Sales & Purchase Returns | ✅ Yes | `finance.invoices.edit` | N/A | ⚪ Global |
| **`POST`** | `/api/returns/sales/:id/complete` | Sales & Purchase Returns | ✅ Yes | `finance.invoices.edit` | N/A | ⚪ Global |
| **`GET`** | `/api/returns/credit-notes` | Sales & Purchase Returns | ✅ Yes | `finance.invoices.view` | `creditNote` | ✅ Yes |
| **`GET`** | `/api/returns/purchases` | Sales & Purchase Returns | ✅ Yes | `purchase.view` | `purchaseReturn` | ✅ Yes |
| **`GET`** | `/api/returns/purchases/:id` | Sales & Purchase Returns | ✅ Yes | `purchase.view` | `purchaseReturn` | ✅ Yes |
| **`POST`** | `/api/returns/purchases` | Sales & Purchase Returns | ✅ Yes | `purchase.create` | `purchase`, `purchaseReturn`, `debitNote` | ✅ Yes |
| **`PATCH`** | `/api/returns/purchases/:id/approve` | Sales & Purchase Returns | ✅ Yes | `purchase.edit` | N/A | ⚪ Global |
| **`POST`** | `/api/returns/purchases/:id/approve` | Sales & Purchase Returns | ✅ Yes | `purchase.edit` | `purchaseReturn`, `debitNote` | ✅ Yes |
| **`PATCH`** | `/api/returns/purchases/:id/complete` | Sales & Purchase Returns | ✅ Yes | `purchase.edit` | N/A | ⚪ Global |
| **`POST`** | `/api/returns/purchases/:id/complete` | Sales & Purchase Returns | ✅ Yes | `purchase.edit` | N/A | ⚪ Global |
| **`GET`** | `/api/returns/debit-notes` | Sales & Purchase Returns | ✅ Yes | `purchase.view` | `debitNote` | ✅ Yes |
| **`GET`** | `/api/sales` | POS & Sales Transactions | ✅ Yes | `authenticated` | `sale` | ✅ Yes |
| **`POST`** | `/api/sales` | POS & Sales Transactions | ✅ Yes | `authenticated` | `warehouse`, `sale`, `product` | ✅ Yes |
| **`GET`** | `/api/sales/held` | POS & Sales Transactions | ✅ Yes | `authenticated` | `heldOrder` | ✅ Yes |
| **`POST`** | `/api/sales/held` | POS & Sales Transactions | ✅ Yes | `authenticated` | `heldOrder` | ✅ Yes |
| **`DELETE`** | `/api/sales/held/:id` | POS & Sales Transactions | ✅ Yes | `authenticated` | `heldOrder` | ✅ Yes |
| **`GET`** | `/api/sales/register/current` | POS & Sales Transactions | ✅ Yes | `authenticated` | `cashRegister`, `registerShift` | ✅ Yes |
| **`POST`** | `/api/sales/register/open` | POS & Sales Transactions | ✅ Yes | `authenticated` | `registerShift`, `cashRegister` | ✅ Yes |
| **`POST`** | `/api/sales/register/drop` | POS & Sales Transactions | ✅ Yes | `authenticated` | `registerShift` | ✅ Yes |
| **`POST`** | `/api/sales/register/close` | POS & Sales Transactions | ✅ Yes | `authenticated` | `registerShift`, `cashRegister` | ✅ Yes |
| **`POST`** | `/api/sales/sync-offline` | POS & Sales Transactions | ✅ Yes | `authenticated` | `warehouse`, `sale` | ✅ Yes |
| **`GET`** | `/api/sales/:id` | POS & Sales Transactions | ✅ Yes | `authenticated` | `sale` | ✅ Yes |
| **`GET`** | `/api/sales/:id/payments` | POS & Sales Transactions | ✅ Yes | `authenticated` | `sale`, `salePayment` | ✅ Yes |
| **`GET`** | `/api/sales/:id/returns` | POS & Sales Transactions | ✅ Yes | `authenticated` | `sale`, `salesReturn` | ✅ Yes |
| **`POST`** | `/api/sales/:id/payments` | POS & Sales Transactions | ✅ Yes | `authenticated` | `salePayment` | ✅ Yes |
| **`GET`** | `/api/v1/settings/:scope/:group` | Platform Global & Tenant Settings | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`PUT`** | `/api/v1/settings/:scope/:group` | Platform Global & Tenant Settings | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`DELETE`** | `/api/v1/settings/:scope/:group/:key` | Platform Global & Tenant Settings | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/v1/settings/:scope/:group/reset` | Platform Global & Tenant Settings | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/v1/settings/:scope/:group/history` | Platform Global & Tenant Settings | ✅ Yes | `authenticated` | `settingAudit` | ⚪ Global |
| **`GET`** | `/api/shifts` | Shift Rostering & Swaps | ✅ Yes | `authenticated` | `shiftDefinition` | ✅ Yes |
| **`POST`** | `/api/shifts` | Shift Rostering & Swaps | ✅ Yes | `authenticated` | `shiftDefinition` | ✅ Yes |
| **`PUT`** | `/api/shifts/:id` | Shift Rostering & Swaps | ✅ Yes | `authenticated` | `shiftDefinition` | ✅ Yes |
| **`DELETE`** | `/api/shifts/:id` | Shift Rostering & Swaps | ✅ Yes | `authenticated` | `shiftDefinition`, `shiftRoster` | ✅ Yes |
| **`GET`** | `/api/shifts/roster` | Shift Rostering & Swaps | ✅ Yes | `authenticated` | `employee` | ✅ Yes |
| **`POST`** | `/api/shifts/roster/assign` | Shift Rostering & Swaps | ✅ Yes | `authenticated` | `shiftRoster` | ✅ Yes |
| **`POST`** | `/api/shifts/roster/bulk-assign` | Shift Rostering & Swaps | ✅ Yes | `authenticated` | `shiftDefinition` | ✅ Yes |
| **`GET`** | `/api/shifts/swaps` | Shift Rostering & Swaps | ✅ Yes | `authenticated` | `shiftSwapRequest` | ✅ Yes |
| **`POST`** | `/api/shifts/swaps` | Shift Rostering & Swaps | ✅ Yes | `authenticated` | `shiftSwapRequest` | ✅ Yes |
| **`PUT`** | `/api/shifts/swaps/:id/peer-action` | Shift Rostering & Swaps | ✅ Yes | `authenticated` | `shiftSwapRequest` | ✅ Yes |
| **`PUT`** | `/api/shifts/swaps/:id/manager-action` | Shift Rostering & Swaps | ✅ Yes | `authenticated` | `shiftSwapRequest` | ✅ Yes |
| **`POST`** | `/api/shifts/reconcile` | Shift Rostering & Swaps | ✅ Yes | `authenticated` | `employee`, `attendance`, `leaveRequest` | ✅ Yes |
| **`GET`** | `/api/shopify/dashboard` | Shopify Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/shopify/stores` | Shopify Store Sync | ✅ Yes | `authenticated` | `warehouse` | ✅ Yes |
| **`POST`** | `/api/shopify/stores` | Shopify Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`DELETE`** | `/api/shopify/stores/:id` | Shopify Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/shopify/test-connection` | Shopify Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/shopify/sync/products` | Shopify Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/shopify/sync/stock` | Shopify Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/shopify/sync/orders` | Shopify Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/shopify/sync/customers` | Shopify Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/shopify/locations` | Shopify Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/shopify/logs` | Shopify Store Sync | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/shopify/logs/clear` | Shopify Store Sync | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/payroll/statutory/filings` | Statutory Tax Returns (16/24Q/EPF) | ⚪ Public | `authenticated` | `statutoryReturnFiling` | ✅ Yes |
| **`POST`** | `/api/payroll/statutory/epf/generate` | Statutory Tax Returns (16/24Q/EPF) | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/payroll/statutory/esic/generate` | Statutory Tax Returns (16/24Q/EPF) | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/payroll/statutory/filings/:id/download` | Statutory Tax Returns (16/24Q/EPF) | ⚪ Public | `authenticated` | `statutoryReturnFiling` | ✅ Yes |
| **`POST`** | `/api/payroll/statutory/filings/:id/record-challan` | Statutory Tax Returns (16/24Q/EPF) | ⚪ Public | `authenticated` | `statutoryReturnFiling` | ✅ Yes |
| **`PUT`** | `/api/super/tenants/:id/policy` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/super/smtp/test-otp-email` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/super/impersonate/:tenantId` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenant`, `profile` | ✅ Yes |
| **`GET`** | `/api/super/tenants/:tenantId/slug-history` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/super/leave-impersonation` | Super Admin Platform Console | ✅ Yes | `authenticated` | `user`, `profile` | ✅ Yes |
| **`PATCH`** | `/api/super/tenants/:id/status` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/super/tenants/:id/suspend` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/super/tenants/:id/reactivate` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/super/email-templates/test` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/super/stats` | Super Admin Platform Console | ✅ Yes | `authenticated` | `user`, `tenant`, `employee` | ✅ Yes |
| **`GET`** | `/api/super/tenants/stats` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/super/tenants` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenant` | ⚪ Global |
| **`GET`** | `/api/super/tenants/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenant` | ⚪ Global |
| **`POST`** | `/api/super/tenants` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenant`, `subscriptionPlan` | ✅ Yes |
| **`PUT`** | `/api/super/tenants/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenant` | ⚪ Global |
| **`POST`** | `/api/super/tenants/:id/reset-password` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenant`, `user` | ✅ Yes |
| **`DELETE`** | `/api/super/tenants/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenant` | ✅ Yes |
| **`GET`** | `/api/super/users` | Super Admin Platform Console | ✅ Yes | `authenticated` | `profile` | ✅ Yes |
| **`POST`** | `/api/super/users/:id/reset-2fa` | Super Admin Platform Console | ✅ Yes | `authenticated` | `user` | ⚪ Global |
| **`PUT`** | `/api/super/users/:id/roles` | Super Admin Platform Console | ✅ Yes | `authenticated` | `profile`, `userRole` | ⚪ Global |
| **`GET`** | `/api/super/plans` | Super Admin Platform Console | ✅ Yes | `authenticated` | `subscriptionPlan` | ✅ Yes |
| **`POST`** | `/api/super/plans` | Super Admin Platform Console | ✅ Yes | `authenticated` | `subscriptionPlan` | ⚪ Global |
| **`PUT`** | `/api/super/plans/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `subscriptionPlan` | ⚪ Global |
| **`POST`** | `/api/super/plans/calculate` | Super Admin Platform Console | ✅ Yes | `authenticated` | `subscriptionPlan` | ⚪ Global |
| **`DELETE`** | `/api/super/plans/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenantSubscription`, `subscriptionPlan` | ⚪ Global |
| **`GET`** | `/api/super/coupons` | Super Admin Platform Console | ✅ Yes | `authenticated` | `coupon` | ⚪ Global |
| **`POST`** | `/api/super/coupons` | Super Admin Platform Console | ✅ Yes | `authenticated` | `coupon` | ⚪ Global |
| **`PUT`** | `/api/super/coupons/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `coupon` | ⚪ Global |
| **`DELETE`** | `/api/super/coupons/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `coupon` | ⚪ Global |
| **`GET`** | `/api/super/addons` | Super Admin Platform Console | ✅ Yes | `authenticated` | `addon` | ⚪ Global |
| **`POST`** | `/api/super/addons` | Super Admin Platform Console | ✅ Yes | `authenticated` | `addon` | ⚪ Global |
| **`PUT`** | `/api/super/addons/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `addon` | ⚪ Global |
| **`DELETE`** | `/api/super/addons/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `addon` | ⚪ Global |
| **`POST`** | `/api/super/tenants/:id/addons/:addonSlug/toggle` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenant`, `tenantAddon` | ✅ Yes |
| **`GET`** | `/api/super/settings` | Super Admin Platform Console | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`PUT`** | `/api/super/settings` | Super Admin Platform Console | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`GET`** | `/api/super/transactions` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/super/transactions/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `billingInvoice`, `cmsPage` | ⚪ Global |
| **`GET`** | `/api/super/transactions/:id/preview` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/super/transactions/:id/download` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/super/transactions/:id/approve` | Super Admin Platform Console | ✅ Yes | `authenticated` | `billingInvoice`, `paymentGatewayTransaction`, `tenantSubscription` | ✅ Yes |
| **`POST`** | `/api/super/transactions/:id/reject` | Super Admin Platform Console | ✅ Yes | `authenticated` | `billingInvoice`, `paymentGatewayTransaction`, `cmsPage` | ✅ Yes |
| **`PATCH`** | `/api/super/transactions/:id/status` | Super Admin Platform Console | ✅ Yes | `authenticated` | `billingInvoice`, `paymentGatewayTransaction` | ⚪ Global |
| **`GET`** | `/api/super/domains` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenantDomain` | ✅ Yes |
| **`POST`** | `/api/super/domains` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenant`, `tenantDomain` | ✅ Yes |
| **`PUT`** | `/api/super/domains/:id/approve` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenantDomain` | ⚪ Global |
| **`PUT`** | `/api/super/domains/:id/reject` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenantDomain` | ⚪ Global |
| **`PUT`** | `/api/super/domains/:id/status` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenantDomain` | ⚪ Global |
| **`POST`** | `/api/super/domains/:id/verify` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenantDomain` | ⚪ Global |
| **`DELETE`** | `/api/super/domains/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenantDomain` | ⚪ Global |
| **`GET`** | `/api/super/analytics/telemetry` | Super Admin Platform Console | ✅ Yes | `authenticated` | `tenant`, `tenantSubscription`, `user` | ⚪ Global |
| **`GET`** | `/api/super/tenant-usage-metrics` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/super/tenant-usage-metrics/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/super/support/agents` | Super Admin Platform Console | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`POST`** | `/api/super/support/agents` | Super Admin Platform Console | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`PUT`** | `/api/super/support/agents/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`DELETE`** | `/api/super/support/agents/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`GET`** | `/api/super/support/sla-policies` | Super Admin Platform Console | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`POST`** | `/api/super/support/sla-policies` | Super Admin Platform Console | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`PUT`** | `/api/super/support/sla-policies/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`DELETE`** | `/api/super/support/sla-policies/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`GET`** | `/api/super/support/escalation-rules` | Super Admin Platform Console | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`POST`** | `/api/super/support/escalation-rules` | Super Admin Platform Console | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`PUT`** | `/api/super/support/escalation-rules/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`DELETE`** | `/api/super/support/escalation-rules/:id` | Super Admin Platform Console | ✅ Yes | `authenticated` | `cmsPage` | ⚪ Global |
| **`PUT`** | `/api/super/tenants/:id/status` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/super/users/:id/login-history` | Super Admin Platform Console | ✅ Yes | `authenticated` | `loginHistory` | ⚪ Global |
| **`GET`** | `/api/super/backup/snapshots` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/super/backup/generate` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/super/backup/download/:filename` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`DELETE`** | `/api/super/backup/:filename` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/super/languages` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/super/languages/:code` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`PUT`** | `/api/super/languages/:code` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/super/languages` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`DELETE`** | `/api/super/languages/:code` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`PATCH`** | `/api/super/languages/:code/toggle` | Super Admin Platform Console | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`GET`** | `/api/suppliers` | Vendor & Supplier Catalog | ✅ Yes | `authenticated` | `supplier` | ✅ Yes |
| **`GET`** | `/api/suppliers/ap-summary` | Vendor & Supplier Catalog | ✅ Yes | `authenticated` | `purchase` | ✅ Yes |
| **`GET`** | `/api/suppliers/:id` | Vendor & Supplier Catalog | ✅ Yes | `authenticated` | `supplier` | ✅ Yes |
| **`POST`** | `/api/suppliers` | Vendor & Supplier Catalog | ✅ Yes | `authenticated` | `supplier` | ✅ Yes |
| **`PUT`** | `/api/suppliers/:id` | Vendor & Supplier Catalog | ✅ Yes | `authenticated` | `supplier` | ✅ Yes |
| **`DELETE`** | `/api/suppliers/:id` | Vendor & Supplier Catalog | ✅ Yes | `authenticated` | `supplier` | ✅ Yes |
| **`GET`** | `/api/workspace/custom-domain` | Custom Domain White-Labeling | ✅ Yes | `authenticated` | `tenantDomain`, `tenant` | ✅ Yes |
| **`POST`** | `/api/workspace/custom-domain` | Custom Domain White-Labeling | ✅ Yes | `authenticated` | `tenantDomain`, `tenant` | ✅ Yes |
| **`POST`** | `/api/workspace/custom-domain/:id/verify` | Custom Domain White-Labeling | ✅ Yes | `authenticated` | `tenantDomain` | ✅ Yes |
| **`PUT`** | `/api/workspace/custom-domain/:id/primary` | Custom Domain White-Labeling | ✅ Yes | `authenticated` | `tenantDomain` | ✅ Yes |
| **`DELETE`** | `/api/workspace/custom-domain/:id` | Custom Domain White-Labeling | ✅ Yes | `authenticated` | `tenantDomain` | ✅ Yes |
| **`GET`** | `/api/timesheets` | Project Timesheets | ⚪ Public | `authenticated` | `employee`, `timesheet` | ✅ Yes |
| **`POST`** | `/api/timesheets` | Project Timesheets | ⚪ Public | `authenticated` | `employee`, `timesheet` | ✅ Yes |
| **`PUT`** | `/api/timesheets/:id/approve` | Project Timesheets | ⚪ Public | `authenticated` | `timesheet` | ✅ Yes |
| **`PUT`** | `/api/timesheets/:id/reject` | Project Timesheets | ⚪ Public | `authenticated` | `timesheet` | ✅ Yes |
| **`DELETE`** | `/api/timesheets/:id` | Project Timesheets | ⚪ Public | `authenticated` | `timesheet` | ✅ Yes |
| **`GET`** | `/api/todos` | Tasks & To-Do Tracking | ⚪ Public | `authenticated` | `workspaceTodo` | ✅ Yes |
| **`POST`** | `/api/todos` | Tasks & To-Do Tracking | ⚪ Public | `authenticated` | `workspaceTodo` | ✅ Yes |
| **`PUT`** | `/api/todos/:id` | Tasks & To-Do Tracking | ⚪ Public | `authenticated` | `workspaceTodo` | ✅ Yes |
| **`DELETE`** | `/api/todos/:id` | Tasks & To-Do Tracking | ⚪ Public | `authenticated` | `workspaceTodo` | ✅ Yes |
| **`GET`** | `/api/training/courses` | Training & LMS Modules | ✅ Yes | `authenticated` | `trainingCourse` | ✅ Yes |
| **`POST`** | `/api/training/courses` | Training & LMS Modules | ✅ Yes | `authenticated` | `trainingCourse`, `courseModule` | ✅ Yes |
| **`GET`** | `/api/training/courses/:id` | Training & LMS Modules | ✅ Yes | `authenticated` | `trainingCourse` | ✅ Yes |
| **`PUT`** | `/api/training/courses/:id` | Training & LMS Modules | ✅ Yes | `authenticated` | `trainingCourse` | ✅ Yes |
| **`DELETE`** | `/api/training/courses/:id` | Training & LMS Modules | ✅ Yes | `authenticated` | `trainingCourse` | ✅ Yes |
| **`GET`** | `/api/training/enrollments` | Training & LMS Modules | ✅ Yes | `authenticated` | `courseEnrollment` | ✅ Yes |
| **`POST`** | `/api/training/enrollments` | Training & LMS Modules | ✅ Yes | `authenticated` | `courseEnrollment` | ✅ Yes |
| **`PUT`** | `/api/training/enrollments/:id/progress` | Training & LMS Modules | ✅ Yes | `authenticated` | `courseEnrollment` | ✅ Yes |
| **`GET`** | `/api/training/summary` | Training & LMS Modules | ✅ Yes | `authenticated` | `trainingCourse`, `courseEnrollment` | ✅ Yes |
| **`GET`** | `/api/training/certifications` | Training & LMS Modules | ✅ Yes | `authenticated` | `courseEnrollment` | ✅ Yes |
| **`POST`** | `/api/training/certifications` | Training & LMS Modules | ✅ Yes | `authenticated` | `employee`, `trainingCourse`, `courseEnrollment` | ✅ Yes |
| **`DELETE`** | `/api/training/certifications/:id` | Training & LMS Modules | ✅ Yes | `authenticated` | `courseEnrollment` | ✅ Yes |
| **`GET`** | `/api/transfers` | Warehouse Stock Transfers | ✅ Yes | `authenticated` | `stockTransfer` | ✅ Yes |
| **`POST`** | `/api/transfers` | Warehouse Stock Transfers | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`PATCH`** | `/api/transfers/:id/status` | Warehouse Stock Transfers | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/transfers/warehouses/summary` | Warehouse Stock Transfers | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/transfers/adjustments` | Warehouse Stock Transfers | ✅ Yes | `authenticated` | `stockAdjustment` | ✅ Yes |
| **`POST`** | `/api/transfers/adjustments` | Warehouse Stock Transfers | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/warnings/types` | Employee Disciplinary Warnings | ⚪ Public | `authenticated` | `warningType` | ✅ Yes |
| **`POST`** | `/api/warnings/types` | Employee Disciplinary Warnings | ⚪ Public | `authenticated` | `warningType` | ✅ Yes |
| **`GET`** | `/api/warnings` | Employee Disciplinary Warnings | ⚪ Public | `authenticated` | `employee`, `disciplinaryWarning` | ✅ Yes |
| **`POST`** | `/api/warnings` | Employee Disciplinary Warnings | ⚪ Public | `authenticated` | `disciplinaryWarning` | ✅ Yes |
| **`POST`** | `/api/warnings/:id/acknowledge` | Employee Disciplinary Warnings | ⚪ Public | `authenticated` | `disciplinaryWarning` | ✅ Yes |
| **`POST`** | `/api/warnings/:id/resolve` | Employee Disciplinary Warnings | ⚪ Public | `authenticated` | `disciplinaryWarning` | ✅ Yes |
| **`PUT`** | `/api/warnings/:id` | Employee Disciplinary Warnings | ⚪ Public | `authenticated` | `disciplinaryWarning` | ✅ Yes |
| **`DELETE`** | `/api/warnings/:id` | Employee Disciplinary Warnings | ⚪ Public | `authenticated` | `disciplinaryWarning` | ✅ Yes |
| **`GET`** | `/api/woocommerce/settings` | WooCommerce Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/woocommerce/settings` | WooCommerce Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/woocommerce/test-connection` | WooCommerce Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/woocommerce/status` | WooCommerce Store Sync | ✅ Yes | `authenticated` | `product`, `sale` | ✅ Yes |
| **`GET`** | `/api/woocommerce/unsynced-count` | WooCommerce Store Sync | ✅ Yes | `authenticated` | `product` | ✅ Yes |
| **`POST`** | `/api/woocommerce/sync/products` | WooCommerce Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/woocommerce/products/auto-link` | WooCommerce Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/woocommerce/sync/stock` | WooCommerce Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/woocommerce/stock-metrics` | WooCommerce Store Sync | ✅ Yes | `authenticated` | `productWarehouse` | ✅ Yes |
| **`POST`** | `/api/woocommerce/sync/orders` | WooCommerce Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/woocommerce/orders` | WooCommerce Store Sync | ✅ Yes | `authenticated` | `sale` | ✅ Yes |
| **`GET`** | `/api/woocommerce/logs` | WooCommerce Store Sync | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`DELETE`** | `/api/woocommerce/logs` | WooCommerce Store Sync | ✅ Yes | `authenticated` | N/A | ⚪ Global |
| **`POST`** | `/api/woocommerce/reset-sync` | WooCommerce Store Sync | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/workflows/rules` | Automated Approval Workflows | ✅ Yes | `authenticated` | `automationRule` | ✅ Yes |
| **`POST`** | `/api/workflows/rules` | Automated Approval Workflows | ✅ Yes | `authenticated` | `automationRule` | ✅ Yes |
| **`PUT`** | `/api/workflows/rules/:id` | Automated Approval Workflows | ✅ Yes | `authenticated` | `automationRule` | ✅ Yes |
| **`DELETE`** | `/api/workflows/rules/:id` | Automated Approval Workflows | ✅ Yes | `authenticated` | `automationRule` | ✅ Yes |
| **`GET`** | `/api/workflows/logs` | Automated Approval Workflows | ✅ Yes | `authenticated` | `automationLog` | ✅ Yes |
| **`POST`** | `/api/workflows/rules/:id/trigger` | Automated Approval Workflows | ✅ Yes | `authenticated` | `automationRule`, `automationLog` | ✅ Yes |
| **`GET`** | `/api/workspace/check-slug` | Tenant Workspace Host Routing | ⚪ Public | `authenticated` | `tenant` | ⚪ Global |
| **`GET`** | `/api/check-slug` | Tenant Workspace Host Routing | ⚪ Public | `authenticated` | `tenant` | ⚪ Global |
| **`GET`** | `/api/workspace/public/workspace` | Tenant Workspace Host Routing | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/public/workspace` | Tenant Workspace Host Routing | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/workspace/public/workspace/:slug` | Tenant Workspace Host Routing | ⚪ Public | `authenticated` | `tenant` | ⚪ Global |
| **`GET`** | `/api/public/workspace/:slug` | Tenant Workspace Host Routing | ⚪ Public | `authenticated` | `tenant` | ⚪ Global |
| **`POST`** | `/api/workspace/public/workspace/email-links` | Tenant Workspace Host Routing | ⚪ Public | `authenticated` | `user` | ⚪ Global |
| **`POST`** | `/api/public/workspace/email-links` | Tenant Workspace Host Routing | ⚪ Public | `authenticated` | `user` | ⚪ Global |
| **`POST`** | `/api/workspace/rename` | Tenant Workspace Host Routing | ✅ Yes | `authenticated` | `tenant` | ✅ Yes |
| **`POST`** | `/api/rename` | Tenant Workspace Host Routing | ✅ Yes | `authenticated` | `tenant` | ✅ Yes |
| **`GET`** | `/api/workspace/slug-history` | Tenant Workspace Host Routing | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/slug-history` | Tenant Workspace Host Routing | ✅ Yes | `authenticated` | N/A | ✅ Yes |
| **`GET`** | `/api/workspace/subscription` | Tenant Workspace Management | ⚪ Public | `authenticated` | `employee`, `profile` | ✅ Yes |
| **`GET`** | `/api/workspace/holidays` | Tenant Workspace Management | ⚪ Public | `authenticated` | `holiday` | ✅ Yes |
| **`GET`** | `/api/workspace/onboarding-status` | Tenant Workspace Management | ⚪ Public | `authenticated` | `tenant` | ✅ Yes |
| **`POST`** | `/api/workspace/onboarding` | Tenant Workspace Management | ⚪ Public | `authenticated` | `tenant`, `cmsPage`, `warehouse` | ✅ Yes |
| **`POST`** | `/api/workspace/subscription/upgrade` | Tenant Workspace Management | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/workspace/subscription/downgrade` | Tenant Workspace Management | ⚪ Public | `authenticated` | N/A | ✅ Yes |
| **`POST`** | `/api/workspace/subscription/cancel` | Tenant Workspace Management | ⚪ Public | `authenticated` | `userRoleAssignment` | ✅ Yes |
| **`GET`** | `/api/workspace/roles` | Tenant Workspace Management | ⚪ Public | `authenticated` | `workspaceRole` | ✅ Yes |
| **`GET`** | `/api/workspace/roles/:id` | Tenant Workspace Management | ⚪ Public | `authenticated` | `workspaceRole` | ✅ Yes |
| **`POST`** | `/api/workspace/roles` | Tenant Workspace Management | ⚪ Public | `authenticated` | `workspaceRole`, `permission`, `rolePermission` | ✅ Yes |
| **`PUT`** | `/api/workspace/roles/:id` | Tenant Workspace Management | ⚪ Public | `authenticated` | `workspaceRole`, `rolePermission`, `permission` | ✅ Yes |
| **`POST`** | `/api/workspace/roles/:id/duplicate` | Tenant Workspace Management | ⚪ Public | `authenticated` | `workspaceRole`, `rolePermission` | ✅ Yes |
| **`DELETE`** | `/api/workspace/roles/:id` | Tenant Workspace Management | ⚪ Public | `authenticated` | `workspaceRole`, `rolePermission` | ✅ Yes |
| **`GET`** | `/api/workspace/permissions` | Tenant Workspace Management | ⚪ Public | `authenticated` | `permission` | ⚪ Global |
| **`GET`** | `/api/workspace/modules` | Tenant Workspace Management | ⚪ Public | `authenticated` | `tenantModule` | ✅ Yes |
| **`PUT`** | `/api/workspace/modules` | Tenant Workspace Management | ⚪ Public | `authenticated` | `tenantModule` | ✅ Yes |
| **`GET`** | `/api/workspace/users` | Tenant Workspace Management | ⚪ Public | `authenticated` | `profile` | ✅ Yes |
| **`PUT`** | `/api/workspace/users/:userId/role` | Tenant Workspace Management | ⚪ Public | `authenticated` | `profile`, `workspaceRole`, `userRoleAssignment` | ✅ Yes |
| **`GET`** | `/api/workspace/google/config` | Tenant Workspace Management | ⚪ Public | `authenticated` | `cmsPage` | ✅ Yes |
| **`POST`** | `/api/workspace/google/config` | Tenant Workspace Management | ⚪ Public | `authenticated` | `cmsPage` | ✅ Yes |
| **`POST`** | `/api/workspace/google/connect-account` | Tenant Workspace Management | ⚪ Public | `authenticated` | `profile`, `user`, `cmsPage` | ✅ Yes |
| **`DELETE`** | `/api/workspace/google/accounts/:id` | Tenant Workspace Management | ⚪ Public | `authenticated` | `cmsPage` | ✅ Yes |
| **`POST`** | `/api/workspace/google/sync-directory` | Tenant Workspace Management | ⚪ Public | `authenticated` | `employee`, `cmsPage` | ✅ Yes |
| **`GET`** | `/api/workspace/google/drive-files` | Tenant Workspace Management | ⚪ Public | `authenticated` | `companyDocument` | ✅ Yes |
| **`POST`** | `/api/workspace/tally-import` | Tenant Workspace Management | ⚪ Public | `authenticated` | `chartOfAccount` | ✅ Yes |
| **`GET`** | `/api/workspace/settings` | Tenant Workspace Management | ⚪ Public | `authenticated` | `tenant`, `cmsPage` | ✅ Yes |
| **`PUT`** | `/api/workspace/settings/brand` | Tenant Workspace Management | ⚪ Public | `authenticated` | `tenant`, `cmsPage` | ✅ Yes |
| **`PUT`** | `/api/workspace/settings/company` | Tenant Workspace Management | ⚪ Public | `authenticated` | `tenant`, `cmsPage` | ✅ Yes |

---

## 3. CRUD Design Standards & Conventions

- **Pagination:** Keyset and limit/offset pagination enforced on all list endpoints (defaults to `page=1&limit=25`, max limit: `100`).
- **Filtering & Search:** Scoped text searches execute via PostgreSQL `ILIKE` or full-text tsvector indexes.
- **Error Envelope:** Standardized JSON error response:
```json
{
  "error": "Descriptive message",
  "code": "ERROR_CODE_SLUG",
  "details": {}
}
```
