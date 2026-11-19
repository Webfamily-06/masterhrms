# 32 — Complete Frontend & User Workflow Register

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering  
**Target Source:** Direct Extraction from Live Company Admin Dashboard Session  
**Total Navigable Menu Items Decompiled:** 220  
**Classification:** OBSERVED (Direct Playwright DOM Extraction)  
**Date:** November 19, 2026  

---

## 1. Executive Summary

In the reference application (WorkDo Dash), the authenticated Company/Tenant Admin navigation is hydrated dynamically by Inertia.js based on active packages and role permissions. In this live session, **220 distinct menu nodes** were extracted across Core HRM, Accounting, CRM, Projects, POS, and modular add-ons.

## 2. Navigable Menu Items & Routes Catalog

| # | Menu Item Label | Type / Interaction | Target Route URL | Role Scope |
|---|---|---|---|---|
| 1 | **Dashboard** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 2 | **User Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 3 | **Add-ons Manager PREMIUM** | Direct Link | `https://dash-demo.workdo.io/add-ons/explore` | Company Admin / Tenant |
| 4 | **AI Business Advisor FREE** | Direct Link | `https://dash-demo.workdo.io/ai-advisor/dashboard` | Company Admin / Tenant |
| 5 | **Smart Dashboard FREE** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 6 | **Smart Reports FREE** | Direct Link | `https://dash-demo.workdo.io/smart-reports` | Company Admin / Tenant |
| 7 | **Notice Board FREE** | Direct Link | `https://dash-demo.workdo.io/notice-board/board` | Company Admin / Tenant |
| 8 | **Suggestion Box FREE** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 9 | **AI Agent NEW** | Direct Link | `https://dash-demo.workdo.io/ai-agent/chat-page` | Company Admin / Tenant |
| 10 | **Proposal** | Direct Link | `https://dash-demo.workdo.io/sales-proposals` | Company Admin / Tenant |
| 11 | **Sales Invoice** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 12 | **Purchase** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 13 | **Product & Service** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 14 | **Retainer** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 15 | **Quotation** | Direct Link | `https://dash-demo.workdo.io/quotations` | Company Admin / Tenant |
| 16 | **Project** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 17 | **Accounting** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 18 | **Goal** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 19 | **Budget Planner** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 20 | **Double Entry** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 21 | **HRM** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 22 | **Performance** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 23 | **Training** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 24 | **Work Permit** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 25 | **Recruitment** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 26 | **Job Search** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 27 | **Biometric Attendance** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 28 | **Performance Indicator** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 29 | **Procurement** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 30 | **POS** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 31 | **CRM** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 32 | **Form Builder** | Direct Link | `https://dash-demo.workdo.io/form-builder/forms` | Company Admin / Tenant |
| 33 | **Assets** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 34 | **Social Media Analytics** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 35 | **Sales** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 36 | **Google Forms** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 37 | **Google Slides** | Direct Link | `https://dash-demo.workdo.io/google-slides` | Company Admin / Tenant |
| 38 | **WhatsApp Chat** | Direct Link | `https://dash-demo.workdo.io/whatsapp-chat` | Company Admin / Tenant |
| 39 | **Instagram Chat** | Direct Link | `https://dash-demo.workdo.io/instagram-chat` | Company Admin / Tenant |
| 40 | **Facebook Chat** | Direct Link | `https://dash-demo.workdo.io/facebook-chat` | Company Admin / Tenant |
| 41 | **Facebook Post** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 42 | **Instagram Post** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 43 | **Zulip Chat** | Direct Link | `https://dash-demo.workdo.io/zulip-chat` | Company Admin / Tenant |
| 44 | **YouTube** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 45 | **Vcard** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 46 | **LMS** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 47 | **Ebook** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 48 | **Movie & TV Studio** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 49 | **Movie Show Booking** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 50 | **Water Park** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 51 | **Coworking Space** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 52 | **Boutique & Studio** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 53 | **Diet & Nutrition** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 54 | **Security Guard** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 55 | **Sports Club** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 56 | **Garden Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 57 | **Locker & Safe Deposit** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 58 | **CCTV Security** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 59 | **Events Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 60 | **Solar Hub** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 61 | **Franchise Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 62 | **Yoga Classes** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 63 | **Fire Safety** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 64 | **DJ & Orchestra** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 65 | **Art Showcase** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 66 | **Audit Inspection** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 67 | **Hotel & Room** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 68 | **Print Press** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 69 | **Freelancing Platform** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 70 | **Rotas** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 71 | **Commission** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 72 | **CMMS** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 73 | **Investment System** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 74 | **Hair Care Studio** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 75 | **Library Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 76 | **School & Institutes** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 77 | **Scholarship** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 78 | **Dance Academy** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 79 | **Music Institute** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 80 | **Childcare** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 81 | **Driving School** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 82 | **Gym Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 83 | **PetCare** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 84 | **Bakery Store** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 85 | **NGO Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 86 | **Construction** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 87 | **Tiffin Service** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 88 | **Vehicle Wash** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 89 | **Fleet** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 90 | **Vehicle Trade** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 91 | **Equipment Rental** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 92 | **Vehicle Booking** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 93 | **Car Dealership** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 94 | **Agriculture** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 95 | **Legal Case** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 96 | **Tour & Travel** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 97 | **Insurance** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 98 | **Courier Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 99 | **Freight** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 100 | **Newspaper** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 101 | **Property Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 102 | **Elderly Care** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 103 | **Hospital Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 104 | **Blood Bank** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 105 | **Radiology Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 106 | **Optical & Eye Care** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 107 | **Medical Lab** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 108 | **Pharmacy** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 109 | **Jewellery Store** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 110 | **Beauty Spa** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 111 | **Bookings** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 112 | **Parking Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 113 | **Facilities** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 114 | **Beverage** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 115 | **Tattoo Studio** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 116 | **Support Ticket** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 117 | **Garage Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 118 | **Tailoring & Fashion** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 119 | **Restaurant Menu** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 120 | **Grant Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 121 | **Dairy Cattle** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 122 | **Waste Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 123 | **Society Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 124 | **Consignment** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 125 | **Cleaning** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 126 | **Mobile Service** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 127 | **Vehicle Inspection** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 128 | **Machine Repair** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 129 | **Repair** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 130 | **AI Document** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 131 | **AI Images** | Direct Link | `https://dash-demo.workdo.io/ai-image` | Company Admin / Tenant |
| 132 | **Consultancy** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 133 | **Laundry Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 134 | **Rental** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 135 | **Catering** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 136 | **Sales Agent** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 137 | **SalesForce** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 138 | **Contract** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 139 | **Blog & Article** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 140 | **Documents** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 141 | **Google Docs** | Direct Link | `https://dash-demo.workdo.io/google-docs` | Company Admin / Tenant |
| 142 | **Custom Field** | Direct Link | `https://dash-demo.workdo.io/custom-fields` | Company Admin / Tenant |
| 143 | **Pipedrive** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 144 | **WooCommerce** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 145 | **Shopify** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 146 | **Indiamart** | Direct Link | `https://dash-demo.workdo.io/indiamart` | Company Admin / Tenant |
| 147 | **Sage** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 148 | **Asana** | Direct Link | `https://dash-demo.workdo.io/asana-project-management/workspaces` | Company Admin / Tenant |
| 149 | **Warranty** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 150 | **Inventory** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 151 | **Requests** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 152 | **Fix Equipment** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 153 | **Hubspot** | Direct Link | `https://dash-demo.workdo.io/hubspot-support-ticket` | Company Admin / Tenant |
| 154 | **Calendar** | Direct Link | `https://dash-demo.workdo.io/calendar-view` | Company Admin / Tenant |
| 155 | **Outlook Calendar** | Direct Link | `https://dash-demo.workdo.io/outlook-calendar` | Company Admin / Tenant |
| 156 | **Jitsi Meet** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 157 | **Zoom Meetings** | Direct Link | `https://dash-demo.workdo.io/zoom-meetings` | Company Admin / Tenant |
| 158 | **Google Meetings** | Direct Link | `https://dash-demo.workdo.io/google-meetings` | Company Admin / Tenant |
| 159 | **Whereby Meetings** | Direct Link | `https://dash-demo.workdo.io/whereby-meetings` | Company Admin / Tenant |
| 160 | **Zoho Meeting** | Direct Link | `https://dash-demo.workdo.io/zoho-meeting/zoho-meetings` | Company Admin / Tenant |
| 161 | **Livestorm Meeting** | Direct Link | `https://dash-demo.workdo.io/livestormmeeting` | Company Admin / Tenant |
| 162 | **Meeting Hub** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 163 | **Appointment** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 164 | **Portfolio** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 165 | **Resume Builder** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 166 | **Reminder** | Direct Link | `https://dash-demo.workdo.io/reminder` | Company Admin / Tenant |
| 167 | **Custom Alert** | Direct Link | `https://dash-demo.workdo.io/custom-alert` | Company Admin / Tenant |
| 168 | **Workflow** | Direct Link | `https://dash-demo.workdo.io/workflow` | Company Admin / Tenant |
| 169 | **Spreadsheets** | Direct Link | `https://dash-demo.workdo.io/spreadsheets` | Company Admin / Tenant |
| 170 | **Google Sheets** | Direct Link | `https://dash-demo.workdo.io/google-sheets` | Company Admin / Tenant |
| 171 | **Find Google Leads** | Direct Link | `https://dash-demo.workdo.io/find-google-leads` | Company Admin / Tenant |
| 172 | **Innovation Center** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 173 | **Business Process Mappings** | Direct Link | `https://dash-demo.workdo.io/business-process-mappings` | Company Admin / Tenant |
| 174 | **RoadMap Central** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 175 | **Planning** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 176 | **Internal Knowledge** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 177 | **Call Hub** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 178 | **Queue Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 179 | **Game Zone** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 180 | **Video Hub** | Direct Link | `https://dash-demo.workdo.io/video-hub/video-hub-videos` | Company Admin / Tenant |
| 181 | **Photo Studio** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 182 | **File Sharing** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 183 | **Feedback** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 184 | **Influencer Marketing** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 185 | **Newsletter** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 186 | **Click Send** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 187 | **Bulk SMS** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 188 | **MailBox** | Direct Link | `https://dash-demo.workdo.io/mailbox/inbox` | Company Admin / Tenant |
| 189 | **Sendinblue** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 190 | **Outlook Mail** | Direct Link | `https://dash-demo.workdo.io/outlook-mail` | Company Admin / Tenant |
| 191 | **WHMCS** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 192 | **Activity Log** | Direct Link | `https://dash-demo.workdo.io/activity-logs/timeline` | Company Admin / Tenant |
| 193 | **OneNote** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 194 | **Diagram** | Direct Link | `https://dash-demo.workdo.io/diagram` | Company Admin / Tenant |
| 195 | **Notes** | Direct Link | `https://dash-demo.workdo.io/notes/notes` | Company Admin / Tenant |
| 196 | **Team Workload** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 197 | **Quiz Management** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 198 | **Petty Cash** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 199 | **Office Equipment** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 200 | **Digital Certificate** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 201 | **Microsoft To-Do** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 202 | **Trello** | Direct Link | `https://dash-demo.workdo.io/trello/boards` | Company Admin / Tenant |
| 203 | **Jira** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 204 | **To Do** | Direct Link | `https://dash-demo.workdo.io/to-do/kanban` | Company Admin / Tenant |
| 205 | **Time Tracker** | Direct Link | `https://dash-demo.workdo.io/timetracker` | Company Admin / Tenant |
| 206 | **Timesheet** | Direct Link | `https://dash-demo.workdo.io/timesheet` | Company Admin / Tenant |
| 207 | **Visitors** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 208 | **Api Docs** | Direct Link | `https://dash-demo.workdo.io/api-docs` | Company Admin / Tenant |
| 209 | **Media Library** | Direct Link | `https://dash-demo.workdo.io/media-library` | Company Admin / Tenant |
| 210 | **Side Menu Builder** | Direct Link | `https://dash-demo.workdo.io/side-menu-builder` | Company Admin / Tenant |
| 211 | **Messenger** | Direct Link | `https://dash-demo.workdo.io/messenger` | Company Admin / Tenant |
| 212 | **Helpdesk** | Direct Link | `https://dash-demo.workdo.io/helpdesk-tickets` | Company Admin / Tenant |
| 213 | **Plan** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 214 | **Settings** | Direct Link | `https://dash-demo.workdo.io/settings` | Company Admin / Tenant |
| 215 | **Workdo Platform** | Direct Link | `https://workdo.io/` | Company Admin / Tenant |
| 216 | **Documentation** | Direct Link | `https://workdo.io/documents/` | Company Admin / Tenant |
| 217 | **Account** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 218 | **Customer Payments : 0** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 219 | **Customer Payments** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |
| 220 | **Vendor Payments** | Submenu Trigger | `Accordion Toggle (Child Submenu)` | Company Admin / Tenant |

---

## 3. Frontend Component & Routing Architecture

In MASTERHRMS, these workflows are implemented via:
- **Framework:** TanStack Start (Vinxi) + React 19.
- **Routing:** TanStack Router (file-based typed routing under `src/routes/_authenticated/`).
- **State Management:** TanStack Query v5 cache with optimistic UI updates.
- **Design System:** Tailwind CSS v4 paired with Lucide React icons matching WorkDo's visual ergonomics.
