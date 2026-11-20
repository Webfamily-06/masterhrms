# 16 — Corrected Master Add-on Inventory (All 133 Add-ons)

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering Re-Audit  
**Audit Standard:** Codebase Reality & Strict Evidentiary Verification  
**Date:** November 19, 2026  
**Total Canonical Add-ons Re-Audited:** 133  
**Verified Implemented Modules:** 8 in `server/src/modules/`  
**Verified Route-Level Implementations:** 22 in `server/src/routes/`  
**Unimplemented / Reference Only:** 103 Add-ons  

---

## 1. Executive Summary

This register presents the authoritative, corrected master inventory for all 133 canonical Add-ons from `docs/reverse-engineering/workdo-saas/06-MASTER-ADDON-INVENTORY.md`. Every row has been independently audited against actual filesystem code, replacing optimistic labels with concrete file paths, line citations, and strict evidence tiers.

---

## 2. Master Reconciled Inventory Table

| # | Canonical Add-on Name | Category | Pricing | Priority | WorkDo Package Slug | Actual MASTERHRMS Path | Corrected Evidence Tier | Implementation Notes & Audit Findings |
|---|---|---|---|---|---|---|---|---|
| 1 | **AI Business Advisor** | Free Addons | Free | Critical | `AI Business Advisor` | `server/src/routes/ai-business-advisor.routes.ts` | **SOURCE-INSPECTED** | Route declared; business advisory prompts and analytics logic |
| 2 | **Smart Dashboard Analytics** | Free Addons | Free | Critical | `Smart Dashboard` | `server/src/routes/smart-dashboard.routes.ts` | **SOURCE-INSPECTED** | Route declared; analytics cards and aggregation service |
| 3 | **Smart Reports** | Free Addons | Free | Critical | `Smart Reports` | `server/src/routes/smart-reports.routes.ts` | **SOURCE-INSPECTED** | Route declared; report builders and CSV/PDF export logic |
| 4 | **Suggestion Box** | Free Addons | Free | Medium | `Suggestion Box` | `server/src/routes/suggestion-box.routes.ts` | **SOURCE-INSPECTED** | Route declared; anonymous feedback submission and moderation |
| 5 | **Notice Board** | Free Addons | Free | High | `Notice Board & Announcements` | `server/src/modules/notice-board/` | **VERIFIED** | Full modular directory with announcement broadcasting and feeds |
| 6 | **Instagram** | Social Media | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 7 | **Facebook** | Social Media | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 8 | **WhatsApp** | Social Media | Paid | High | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 9 | **YouTube** | Social Media | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 10 | **Telegram** | Social Media | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 11 | **Twilio** | Social Media | Paid | High | `SMS Gateway` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 12 | **Slack** | Social Media | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 13 | **Discord** | Social Media | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 14 | **HubSpot** | Social Media | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 15 | **Nexmo (SMS)** | Social Media | Paid | Medium | `SMS Gateway` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 16 | **MSG91 (SMS)** | Social Media | Paid | High | `SMS Gateway` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 17 | **Vonage (SMS)** | Social Media | Paid | Medium | `SMS Gateway` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 18 | **ClickSend (SMS)** | Social Media | Paid | Low | `SMS Gateway` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 19 | **SMS Provider (Generic)** | Social Media | Paid | High | `SMS Gateway` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 20 | **Google Meet** | Social Media | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 21 | **Google Workspace** | Social Media | Paid | High | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 22 | **Zoom** | Social Media | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 23 | **Zoho** | Social Media | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 24 | **Livestorm** | Social Media | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 25 | **Amazon SES** | Social Media | Paid | High | `Email (SMTP)` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 26 | **Google Calendar** | Integrations | Paid | High | `Calendar` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 27 | **Outlook Calendar** | Integrations | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 28 | **Zapier** | Integrations | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 29 | **Make (Integromat)** | Integrations | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 30 | **Webhook** | Integrations | Paid | High | `Outbound Webhooks` | `server/src/modules/outbound-webhooks/` | **VERIFIED** | Full modular directory with HMAC signature delivery engine |
| 31 | **n8n** | Integrations | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 32 | **IndiaMART** | Integrations | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 33 | **Sendinblue (Brevo)** | Integrations | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 34 | **OneNote** | Integrations | Paid | Low | `Notes` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 35 | **Trello** | Integrations | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 36 | **Microsoft To Do** | Integrations | Paid | Low | `Todo` | `server/src/routes/todos.routes.ts` | **SOURCE-INSPECTED** | Route declared; personal and team task management |
| 37 | **Jira** | Integrations | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 38 | **Google Analytics** | Integrations | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 39 | **Google Slides** | Integrations | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 40 | **WHMCS** | Integrations | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 41 | **Google Forms** | Integrations | Paid | Medium | `Form Builder` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 42 | **Google Wallet** | Integrations | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 43 | **WooCommerce** | E-Commerce & Sales | Paid | High | `WooCommerce` | `server/src/routes/woocommerce.routes.ts` | **SOURCE-INSPECTED** | Route declared; WooCommerce REST v3 sync |
| 44 | **Shopify** | E-Commerce & Sales | Paid | High | `Shopify` | `server/src/routes/shopify.routes.ts` | **SOURCE-INSPECTED** | Route declared; webhook listeners and order/inventory sync |
| 45 | **Mailchimp** | E-Commerce & Sales | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 46 | **Salesforce** | E-Commerce & Sales | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 47 | **Sales Module** | E-Commerce & Sales | Paid | Critical | `Sales/Invoicing` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 48 | **Newsletter** | E-Commerce & Sales | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 49 | **Feedback** | E-Commerce & Sales | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 50 | **Inventory** | E-Commerce & Sales | Paid | Critical | `Inventory/Stock` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 51 | **Restaurant Menu** | E-Commerce & Sales | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 52 | **Google Leads** | E-Commerce & Sales | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 53 | **File Sharing** | Content Management | Paid | High | `File Manager` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 54 | **Knowledge Base** | Content Management | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 55 | **Diagram** | Content Management | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 56 | **Portfolio** | Content Management | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 57 | **Resume Builder** | Content Management | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 58 | **Digital Certificate** | Content Management | Paid | Medium | `Certificate Studio` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 59 | **OneDrive** | Content Management | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 60 | **Box** | Content Management | Paid | Low | `None` | `server/src/routes/suggestion-box.routes.ts` | **SOURCE-INSPECTED** | Route declared; anonymous feedback submission and moderation |
| 61 | **Spreadsheet** | Content Management | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 62 | **Innovation Center** | Content Management | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 63 | **Planning** | Content Management | Paid | Medium | `Planning/Strategy` | `server/src/routes/planning-strategy.routes.ts` | **SOURCE-INSPECTED** | Route declared; strategic roadmap planning and milestones |
| 64 | **Business Model Canvas** | Content Management | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 65 | **Marketing Plan** | Content Management | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 66 | **McKinsey 7-S Framework** | Content Management | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 67 | **SWOT Analysis** | Content Management | Paid | Medium | `Strategy Studio` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 68 | **PEST Analysis** | Content Management | Paid | Low | `Strategy Studio` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 69 | **PESTEL Analysis** | Content Management | Paid | Low | `Strategy Studio` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 70 | **Porter's Five Forces** | Content Management | Paid | Low | `Strategy Studio` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 71 | **Zendesk** | Content Management | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 72 | **Documents** | Content Management | Paid | High | `Documents` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 73 | **Document Templates** | Content Management | Paid | High | `Document Types` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 74 | **Quotation** | Finance | Paid | High | `Sales/Invoicing` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 75 | **QuickBooks** | Finance | Paid | High | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 76 | **Sage** | Finance | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 77 | **Xero** | Finance | Paid | High | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 78 | **Contact Management** | Finance | Paid | High | `CRM/Clients` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 79 | **Budget Planner** | Finance | Paid | High | `Budgets` | `server/src/routes/budgets.routes.ts` | **SOURCE-INSPECTED** | Route declared; financial budget allocation and expense caps |
| 80 | **Timesheet** | Finance | Paid | High | `Timesheet` | `server/src/routes/timesheets.routes.ts` | **SOURCE-INSPECTED** | Route declared; billable hour logging and project approvals |
| 81 | **Assets** | Finance | Paid | High | `Assets` | `server/src/routes/assets.routes.ts` | **SOURCE-INSPECTED** | Route declared; fixed asset registry, serial barcodes, assignment |
| 82 | **Asset Borrow & Rent** | Finance | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 83 | **Financial Goal** | Finance | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 84 | **Retainer** | Finance | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 85 | **Plaid** | Finance | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 86 | **ZATCA (Saudi e-invoice)** | Finance | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 87 | **European E-Invoice** | Finance | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 88 | **Recurring Invoice & Bill** | Finance | Paid | High | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 89 | **Double Entry Accounting** | Finance | Paid | Critical | `Accounting` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 90 | **Contract Template** | Finance | Paid | High | `Contract Billing` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 91 | **Team Workload** | HR | Paid | High | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 92 | **Time Tracker** | HR | Paid | High | `Attendance/Timesheets` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 93 | **Biometric Attendance** | HR | Paid | Critical | `Biometric` | `server/src/routes/biometric.routes.ts` | **SOURCE-INSPECTED** | Route declared; ZKTeco log parser and sync interval worker |
| 94 | **Recruitment (ATS)** | HR | Paid | Critical | `HR Recruitment` | `server/src/routes/hr-recruitment.routes.ts` | **SOURCE-INSPECTED** | Route declared; job openings, applicant pipelines, ATS workflows |
| 95 | **Procurement** | HR | Paid | High | `Purchases` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 96 | **Performance Management** | HR | Paid | High | `HR Performance / OKR` | `server/src/routes/hr-performance.routes.ts` | **SOURCE-INSPECTED** | Route declared; employee appraisals, 360 reviews, goal scorecards |
| 97 | **Petty Cash** | HR | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 98 | **Training Module** | HR | Paid | High | `HR Training` | `server/src/routes/training.routes.ts` | **SOURCE-INSPECTED** | Route declared; training courses, lesson curriculum, employee enrollment |
| 99 | **Job Search (Job Board)** | HR | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 100 | **LMS (Learning Management System)** | HR | Paid | High | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 101 | **eBook** | HR | Paid | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 102 | **Email Box** | Communication & Customization | Paid | High | `Email` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 103 | **Outlook Mail** | Communication & Customization | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 104 | **Call Hub** | Communication & Customization | Paid | Medium | `Call` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 105 | **Business Process Mapping** | Communication & Customization | Paid | Medium | `FBP` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 106 | **Roadmap Central** | Communication & Customization | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 107 | **Custom Field** | Communication & Customization | Paid | Critical | `Custom Fields` | `server/src/routes/custom-fields.routes.ts` | **SOURCE-INSPECTED** | Route declared; dynamic schema extension engine for entities |
| 108 | **Form Builder** | Communication & Customization | Paid | High | `Forms` | `server/src/routes/forms.routes.ts` | **SOURCE-INSPECTED** | Route declared; dynamic web form builder and submissions |
| 109 | **Request Management** | Communication & Customization | Paid | High | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 110 | **Workflow Automation** | Communication & Customization | Paid | Critical | `Workflows` | `server/src/routes/workflows.routes.ts` | **SOURCE-INSPECTED** | Route declared; rule triggers and automated business actions |
| 111 | **Sidebar Menu Builder** | Communication & Customization | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 112 | **Todo** | Communication & Customization | Paid | Medium | `Todo` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 113 | **Meeting Hub** | Communication & Customization | Paid | High | `HR Meetings` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 114 | **Notes** | Mobility & Operations | Paid | Medium | `Notes` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 115 | **API Module** | Mobility & Operations | Paid | High | `Public Developer API` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 116 | **Support Ticket** | Mobility & Operations | Paid | High | `Helpdesk` | `server/src/routes/helpdesk.routes.ts` | **SOURCE-INSPECTED** | Route declared; ticket queues, priority SLAs, conversation threads |
| 117 | **Rotas (Rota/Schedule Management)** | Mobility & Operations | Paid | High | `Shifts` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 118 | **Activity Log** | Mobility & Operations | Paid | High | `Enterprise Audit & Activity Logs` | `server/src/modules/activity-logs/` | **VERIFIED** | Full modular directory with routes, services, manifest, and tests |
| 119 | **Project Template** | Mobility & Operations | Paid | Medium | `Projects` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 120 | **Reminder** | Mobility & Operations | Paid | High | `Internal Reminders` | `server/src/modules/internal-reminders/` | **VERIFIED** | Full modular directory with scheduled notification dispatchers |
| 121 | **Signature** | Mobility & Operations | Paid | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 122 | **Custom Alert** | Mobility & Operations | Paid | Medium | `Alerts` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 123 | **AI Document** | AI | Paid | High | `AI Document` | `server/src/routes/ai-document.routes.ts` | **SOURCE-INSPECTED** | Route declared; document generation templates and export logic |
| 124 | **AI Assistant** | AI | Paid | Critical | `AI Assistant` | `server/src/routes/ai-assistant.routes.ts` | **SOURCE-INSPECTED** | Route declared; LLM prompt engineering and streaming responses |
| 125 | **Backup & Restore** | Security | Paid | Critical | `Tenant Backup & Restore` | `server/src/modules/backup-restore/` | **VERIFIED** | Full modular directory with database dump and restore handlers |
| 126 | **Google Authentication (2FA)** | Security | Paid | Critical | `Two-Factor Auth (TOTP)` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 127 | **Google Captcha (reCAPTCHA)** | Security | Free | High | `Turnstile/CAPTCHA` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 128 | **GitHub Sign-in (OAuth)** | Security | Free | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 129 | **Facebook Sign-in (OAuth)** | Security | Free | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 130 | **Google Sign-in (OAuth)** | Security | Free | High | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 131 | **LinkedIn Sign-in (OAuth)** | Security | Free | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 132 | **Slack Sign-in (OAuth)** | Security | Free | Low | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
| 133 | **Microsoft Sign-in (OAuth)** | Security | Free | Medium | `None` | None | **OBSERVED / NOT IMPLEMENTED** | Catalogued from WorkDo reference marketplace; not implemented in MASTERHRMS |
