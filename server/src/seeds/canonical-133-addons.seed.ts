/**
 * MASTERHRMS — Authoritative Canonical 133 Add-ons Catalog Registry
 *
 * Source: reverseenginerring/197_ITEM_VERIFICATION_MATRIX.md (ADDON-001 through ADDON-133)
 * Full 133 canonical Addons cataloged across 11 authoritative taxonomy domains.
 */

export interface CanonicalAddonDefinition {
  code: string;
  name: string;
  slug: string;
  category: string;
  priceMonthly: number;
  tagline: string;
  description: string;
  features: string[];
  icon: string;
  featured: boolean;
  status: string;
  developer: string;
  version: string;
  installUrl: string;
  docsUrl: string;
}

export const CANONICAL_133_ADDONS: CanonicalAddonDefinition[] = [
  {
    "code": "ADDON-001",
    "name": "AI Business Advisor",
    "slug": "ai-business-advisor",
    "category": "Free Addons",
    "priceMonthly": 0,
    "tagline": "AI-driven executive insights and strategic business advice",
    "description": "Integrate and operate AI Business Advisor within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Executive Strategy Guidance",
      "Operational Variance Alerts",
      "Natural Language Queries"
    ],
    "icon": "/addons-icons/AIBusinessAdvisor.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/ai-business-advisor",
    "docsUrl": "/docs/addons/ai-business-advisor"
  },
  {
    "code": "ADDON-002",
    "name": "Smart Dashboard Analytics",
    "slug": "smart-dashboard",
    "category": "Free Addons",
    "priceMonthly": 0,
    "tagline": "Real-time cross-module metrics and KPI widgets",
    "description": "Integrate and operate Smart Dashboard Analytics within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Real-time KPI Tracking",
      "Drag-and-Drop Widgets",
      "Departmental Breakdowns"
    ],
    "icon": "/addons-icons/SmartDashboardAnalytics.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/smart-dashboard",
    "docsUrl": "/docs/addons/smart-dashboard"
  },
  {
    "code": "ADDON-003",
    "name": "Smart Reports",
    "slug": "smart-reports",
    "category": "Free Addons",
    "priceMonthly": 0,
    "tagline": "Custom report scheduling with automated CSV and PDF export",
    "description": "Integrate and operate Smart Reports within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Automated Cron Scheduling",
      "Multi-tenant Scoping",
      "CSV/PDF Formats"
    ],
    "icon": "/addons-icons/SmartReports.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/smart-reports",
    "docsUrl": "/docs/addons/smart-reports"
  },
  {
    "code": "ADDON-004",
    "name": "Suggestion Box",
    "slug": "suggestion-box",
    "category": "Free Addons",
    "priceMonthly": 0,
    "tagline": "Anonymous or attributed employee feedback and voting box",
    "description": "Integrate and operate Suggestion Box within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Upvoting & Threading",
      "Admin Moderation",
      "Anonymous Submission Option"
    ],
    "icon": "/addons-icons/SuggestionBox.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/suggestion-box",
    "docsUrl": "/docs/addons/suggestion-box"
  },
  {
    "code": "ADDON-005",
    "name": "Notice Board",
    "slug": "notice-board",
    "category": "Free Addons",
    "priceMonthly": 0,
    "tagline": "Company-wide announcements and targeted department notices",
    "description": "Integrate and operate Notice Board within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Targeted Department Feeds",
      "Acknowledgment Tracking",
      "Rich Text Editor"
    ],
    "icon": "/addons-icons/NoticeBoard.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/notice-board",
    "docsUrl": "/docs/addons/notice-board"
  },
  {
    "code": "ADDON-006",
    "name": "Instagram",
    "slug": "instagram",
    "category": "Social Media",
    "priceMonthly": 49,
    "tagline": "Enterprise Instagram capability with multi-tenant data governance.",
    "description": "Integrate and operate Instagram within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/InstagramPost.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/instagram",
    "docsUrl": "/docs/addons/instagram"
  },
  {
    "code": "ADDON-007",
    "name": "Facebook",
    "slug": "facebook",
    "category": "Social Media",
    "priceMonthly": 49,
    "tagline": "Enterprise Facebook capability with multi-tenant data governance.",
    "description": "Integrate and operate Facebook within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/FacebookPost.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/facebook",
    "docsUrl": "/docs/addons/facebook"
  },
  {
    "code": "ADDON-008",
    "name": "WhatsApp",
    "slug": "whatsapp-alerts",
    "category": "Social Media",
    "priceMonthly": 59,
    "tagline": "Meta WhatsApp Business Cloud API alerts and employee notifications",
    "description": "Integrate and operate WhatsApp within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Instant Payslip Dispatches",
      "Two-way Messaging",
      "Template Approvals"
    ],
    "icon": "/addons-icons/WhatsAppChat.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/whatsapp-alerts",
    "docsUrl": "/docs/addons/whatsapp-alerts"
  },
  {
    "code": "ADDON-009",
    "name": "YouTube",
    "slug": "youtube",
    "category": "Social Media",
    "priceMonthly": 49,
    "tagline": "Enterprise YouTube capability with multi-tenant data governance.",
    "description": "Integrate and operate YouTube within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/YoutubeContentManagement.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/youtube",
    "docsUrl": "/docs/addons/youtube"
  },
  {
    "code": "ADDON-010",
    "name": "Telegram",
    "slug": "telegram",
    "category": "Social Media",
    "priceMonthly": 49,
    "tagline": "Real-time alerts and webhook bot notifications in Telegram",
    "description": "Integrate and operate Telegram within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Channel Dispatches",
      "Interactive Actions",
      "Incident Alerts"
    ],
    "icon": "/addons-icons/Telegram.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/telegram",
    "docsUrl": "/docs/addons/telegram"
  },
  {
    "code": "ADDON-011",
    "name": "Twilio",
    "slug": "twilio-sms",
    "category": "Social Media",
    "priceMonthly": 39,
    "tagline": "Automated transactional SMS dispatches via Twilio",
    "description": "Integrate and operate Twilio within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "OTP Delivery Engine",
      "DLT Template Compliance",
      "Delivery Receipts"
    ],
    "icon": "/addons-icons/Twilio.png",
    "featured": false,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/twilio-sms",
    "docsUrl": "/docs/addons/twilio-sms"
  },
  {
    "code": "ADDON-012",
    "name": "Slack",
    "slug": "slack",
    "category": "Social Media",
    "priceMonthly": 49,
    "tagline": "Real-time alerts and webhook bot notifications in Slack",
    "description": "Integrate and operate Slack within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Channel Dispatches",
      "Interactive Actions",
      "Incident Alerts"
    ],
    "icon": "/addons-icons/Slack.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/slack",
    "docsUrl": "/docs/addons/slack"
  },
  {
    "code": "ADDON-013",
    "name": "Discord",
    "slug": "discord",
    "category": "Social Media",
    "priceMonthly": 49,
    "tagline": "Real-time alerts and webhook bot notifications in Discord",
    "description": "Integrate and operate Discord within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Channel Dispatches",
      "Interactive Actions",
      "Incident Alerts"
    ],
    "icon": "/addons-icons/Discord.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/discord",
    "docsUrl": "/docs/addons/discord"
  },
  {
    "code": "ADDON-014",
    "name": "HubSpot",
    "slug": "hubspot",
    "category": "Social Media",
    "priceMonthly": 49,
    "tagline": "Enterprise HubSpot capability with multi-tenant data governance.",
    "description": "Integrate and operate HubSpot within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/HubSpot.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/hubspot",
    "docsUrl": "/docs/addons/hubspot"
  },
  {
    "code": "ADDON-015",
    "name": "Nexmo (SMS)",
    "slug": "nexmo-sms",
    "category": "Social Media",
    "priceMonthly": 39,
    "tagline": "Automated transactional SMS dispatches via Nexmo (SMS)",
    "description": "Integrate and operate Nexmo (SMS) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "OTP Delivery Engine",
      "DLT Template Compliance",
      "Delivery Receipts"
    ],
    "icon": "/addons-icons/VonageSMS.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/nexmo-sms",
    "docsUrl": "/docs/addons/nexmo-sms"
  },
  {
    "code": "ADDON-016",
    "name": "MSG91 (SMS)",
    "slug": "msg91-sms",
    "category": "Social Media",
    "priceMonthly": 39,
    "tagline": "Automated transactional SMS dispatches via MSG91 (SMS)",
    "description": "Integrate and operate MSG91 (SMS) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "OTP Delivery Engine",
      "DLT Template Compliance",
      "Delivery Receipts"
    ],
    "icon": "/addons-icons/MSG91.png",
    "featured": false,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/msg91-sms",
    "docsUrl": "/docs/addons/msg91-sms"
  },
  {
    "code": "ADDON-017",
    "name": "Vonage (SMS)",
    "slug": "vonage-sms",
    "category": "Social Media",
    "priceMonthly": 39,
    "tagline": "Automated transactional SMS dispatches via Vonage (SMS)",
    "description": "Integrate and operate Vonage (SMS) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "OTP Delivery Engine",
      "DLT Template Compliance",
      "Delivery Receipts"
    ],
    "icon": "/addons-icons/VonageSMS.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/vonage-sms",
    "docsUrl": "/docs/addons/vonage-sms"
  },
  {
    "code": "ADDON-018",
    "name": "ClickSend (SMS)",
    "slug": "clicksend-sms",
    "category": "Social Media",
    "priceMonthly": 39,
    "tagline": "Automated transactional SMS dispatches via ClickSend (SMS)",
    "description": "Integrate and operate ClickSend (SMS) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "OTP Delivery Engine",
      "DLT Template Compliance",
      "Delivery Receipts"
    ],
    "icon": "/addons-icons/ClickSend.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/clicksend-sms",
    "docsUrl": "/docs/addons/clicksend-sms"
  },
  {
    "code": "ADDON-019",
    "name": "SMS Provider (Generic)",
    "slug": "sms-gateway",
    "category": "Social Media",
    "priceMonthly": 39,
    "tagline": "Automated transactional SMS dispatches via SMS Provider (Generic)",
    "description": "Integrate and operate SMS Provider (Generic) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "OTP Delivery Engine",
      "DLT Template Compliance",
      "Delivery Receipts"
    ],
    "icon": "/addons-icons/BulkSMS.png",
    "featured": false,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/sms-gateway",
    "docsUrl": "/docs/addons/sms-gateway"
  },
  {
    "code": "ADDON-020",
    "name": "Google Meet",
    "slug": "google-meet",
    "category": "Social Media",
    "priceMonthly": 49,
    "tagline": "Interview and internal meeting synchronization with Google Meet",
    "description": "Integrate and operate Google Meet within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "One-click Meeting Links",
      "Candidate Interview Invites",
      "Calendar Coordination"
    ],
    "icon": "/addons-icons/GoogleMeet.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/google-meet",
    "docsUrl": "/docs/addons/google-meet"
  },
  {
    "code": "ADDON-021",
    "name": "Google Workspace",
    "slug": "google-workspace",
    "category": "Social Media",
    "priceMonthly": 79,
    "tagline": "Deep bi-directional sync with Gmail, Drive, Calendar and Docs",
    "description": "Integrate and operate Google Workspace within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Single Sign-on (SSO)",
      "Calendar Event Sync",
      "Drive Attachment Storage"
    ],
    "icon": "/addons-icons/GoogleDocs.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/google-workspace",
    "docsUrl": "/docs/addons/google-workspace"
  },
  {
    "code": "ADDON-022",
    "name": "Zoom",
    "slug": "zoom",
    "category": "Social Media",
    "priceMonthly": 49,
    "tagline": "Interview and internal meeting synchronization with Zoom",
    "description": "Integrate and operate Zoom within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "One-click Meeting Links",
      "Candidate Interview Invites",
      "Calendar Coordination"
    ],
    "icon": "/addons-icons/ZoomMeeting.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/zoom",
    "docsUrl": "/docs/addons/zoom"
  },
  {
    "code": "ADDON-023",
    "name": "Zoho",
    "slug": "zoho",
    "category": "Social Media",
    "priceMonthly": 49,
    "tagline": "Enterprise Zoho capability with multi-tenant data governance.",
    "description": "Integrate and operate Zoho within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/ZohoMeeting.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/zoho",
    "docsUrl": "/docs/addons/zoho"
  },
  {
    "code": "ADDON-024",
    "name": "Livestorm",
    "slug": "livestorm",
    "category": "Social Media",
    "priceMonthly": 49,
    "tagline": "Interview and internal meeting synchronization with Livestorm",
    "description": "Integrate and operate Livestorm within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "One-click Meeting Links",
      "Candidate Interview Invites",
      "Calendar Coordination"
    ],
    "icon": "/addons-icons/LivestormMeeting.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/livestorm",
    "docsUrl": "/docs/addons/livestorm"
  },
  {
    "code": "ADDON-025",
    "name": "Amazon SES",
    "slug": "amazon-ses",
    "category": "Social Media",
    "priceMonthly": 29,
    "tagline": "High-volume transactional email routing via Amazon SES",
    "description": "Integrate and operate Amazon SES within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Dedicated IP Support",
      "Bounce & Complaint Handling",
      "DKIM/SPF Validation"
    ],
    "icon": "/addons-icons/Fast2SMS.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/amazon-ses",
    "docsUrl": "/docs/addons/amazon-ses"
  },
  {
    "code": "ADDON-026",
    "name": "Google Calendar",
    "slug": "google-calendar",
    "category": "Integrations",
    "priceMonthly": 39,
    "tagline": "Sync shifts, holidays, and meetings with Google Calendar",
    "description": "Integrate and operate Google Calendar within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Two-way Event Sync",
      "Leave Auto-blocking",
      "Outlook & Google Support"
    ],
    "icon": "/addons-icons/GoogleCalendar.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/google-calendar",
    "docsUrl": "/docs/addons/google-calendar"
  },
  {
    "code": "ADDON-027",
    "name": "Outlook Calendar",
    "slug": "outlook-calendar",
    "category": "Integrations",
    "priceMonthly": 39,
    "tagline": "Sync shifts, holidays, and meetings with Outlook Calendar",
    "description": "Integrate and operate Outlook Calendar within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Two-way Event Sync",
      "Leave Auto-blocking",
      "Outlook & Google Support"
    ],
    "icon": "/addons-icons/OutlookCalendar.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/outlook-calendar",
    "docsUrl": "/docs/addons/outlook-calendar"
  },
  {
    "code": "ADDON-028",
    "name": "Zapier",
    "slug": "zapier",
    "category": "Integrations",
    "priceMonthly": 69,
    "tagline": "Workflow automation bridges connecting ERP with Zapier",
    "description": "Integrate and operate Zapier within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "No-code Triggers",
      "Bi-directional Webhooks",
      "Batch Action Handlers"
    ],
    "icon": "/addons-icons/Zapier.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/zapier",
    "docsUrl": "/docs/addons/zapier"
  },
  {
    "code": "ADDON-029",
    "name": "Make (Integromat)",
    "slug": "make-integromat",
    "category": "Integrations",
    "priceMonthly": 69,
    "tagline": "Workflow automation bridges connecting ERP with Make (Integromat)",
    "description": "Integrate and operate Make (Integromat) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "No-code Triggers",
      "Bi-directional Webhooks",
      "Batch Action Handlers"
    ],
    "icon": "/addons-icons/Make.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/make-integromat",
    "docsUrl": "/docs/addons/make-integromat"
  },
  {
    "code": "ADDON-030",
    "name": "Webhook",
    "slug": "outbound-webhooks",
    "category": "Integrations",
    "priceMonthly": 39,
    "tagline": "Event-driven outbound webhooks with HMAC signatures and retry backoff",
    "description": "Integrate and operate Webhook within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Configurable Subscriptions",
      "HMAC-SHA256 Signing",
      "Automatic Exponential Backoff"
    ],
    "icon": "/addons-icons/Webhook.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/outbound-webhooks",
    "docsUrl": "/docs/addons/outbound-webhooks"
  },
  {
    "code": "ADDON-031",
    "name": "n8n",
    "slug": "n8n",
    "category": "Integrations",
    "priceMonthly": 69,
    "tagline": "Workflow automation bridges connecting ERP with n8n",
    "description": "Integrate and operate n8n within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "No-code Triggers",
      "Bi-directional Webhooks",
      "Batch Action Handlers"
    ],
    "icon": "/addons-icons/n8n.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/n8n",
    "docsUrl": "/docs/addons/n8n"
  },
  {
    "code": "ADDON-032",
    "name": "IndiaMART",
    "slug": "indiamart",
    "category": "Integrations",
    "priceMonthly": 59,
    "tagline": "Enterprise IndiaMART capability with multi-tenant data governance.",
    "description": "Integrate and operate IndiaMART within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/Indiamart.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/indiamart",
    "docsUrl": "/docs/addons/indiamart"
  },
  {
    "code": "ADDON-033",
    "name": "Sendinblue (Brevo)",
    "slug": "sendinblue-brevo",
    "category": "Integrations",
    "priceMonthly": 59,
    "tagline": "Enterprise Sendinblue (Brevo) capability with multi-tenant data governance.",
    "description": "Integrate and operate Sendinblue (Brevo) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/Sendinblue.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/sendinblue-brevo",
    "docsUrl": "/docs/addons/sendinblue-brevo"
  },
  {
    "code": "ADDON-034",
    "name": "OneNote",
    "slug": "onenote",
    "category": "Integrations",
    "priceMonthly": 59,
    "tagline": "Enterprise OneNote capability with multi-tenant data governance.",
    "description": "Integrate and operate OneNote within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/OneNote.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/onenote",
    "docsUrl": "/docs/addons/onenote"
  },
  {
    "code": "ADDON-035",
    "name": "Trello",
    "slug": "trello",
    "category": "Integrations",
    "priceMonthly": 49,
    "tagline": "Project task and backlog coordination via Trello",
    "description": "Integrate and operate Trello within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Sprint Task Sync",
      "Priority Mapping",
      "Status Transitions"
    ],
    "icon": "/addons-icons/Trello.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/trello",
    "docsUrl": "/docs/addons/trello"
  },
  {
    "code": "ADDON-036",
    "name": "Microsoft To Do",
    "slug": "microsoft-todo",
    "category": "Integrations",
    "priceMonthly": 59,
    "tagline": "Enterprise Microsoft To Do capability with multi-tenant data governance.",
    "description": "Integrate and operate Microsoft To Do within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/MicrosoftToDo.png",
    "featured": false,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/microsoft-todo",
    "docsUrl": "/docs/addons/microsoft-todo"
  },
  {
    "code": "ADDON-037",
    "name": "Jira",
    "slug": "jira",
    "category": "Integrations",
    "priceMonthly": 49,
    "tagline": "Project task and backlog coordination via Jira",
    "description": "Integrate and operate Jira within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Sprint Task Sync",
      "Priority Mapping",
      "Status Transitions"
    ],
    "icon": "/addons-icons/Jira.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/jira",
    "docsUrl": "/docs/addons/jira"
  },
  {
    "code": "ADDON-038",
    "name": "Google Analytics",
    "slug": "google-analytics",
    "category": "Integrations",
    "priceMonthly": 39,
    "tagline": "Real-time web traffic, portal engagement, and user conversion tracking",
    "description": "Integrate and operate Google Analytics within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "GA4 Event Tracking",
      "Portal Traffic Metrics",
      "Conversion Funnels"
    ],
    "icon": "/addons-icons/GoogleAnalytics.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/google-analytics",
    "docsUrl": "/docs/addons/google-analytics"
  },
  {
    "code": "ADDON-039",
    "name": "Google Slides",
    "slug": "google-slides",
    "category": "Integrations",
    "priceMonthly": 59,
    "tagline": "Enterprise Google Slides capability with multi-tenant data governance.",
    "description": "Integrate and operate Google Slides within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/GoogleSlides.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/google-slides",
    "docsUrl": "/docs/addons/google-slides"
  },
  {
    "code": "ADDON-040",
    "name": "WHMCS",
    "slug": "whmcs",
    "category": "Integrations",
    "priceMonthly": 59,
    "tagline": "Enterprise WHMCS capability with multi-tenant data governance.",
    "description": "Integrate and operate WHMCS within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/WHMCS.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/whmcs",
    "docsUrl": "/docs/addons/whmcs"
  },
  {
    "code": "ADDON-041",
    "name": "Google Forms",
    "slug": "google-forms",
    "category": "Integrations",
    "priceMonthly": 59,
    "tagline": "Enterprise Google Forms capability with multi-tenant data governance.",
    "description": "Integrate and operate Google Forms within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/GoogleForm.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/google-forms",
    "docsUrl": "/docs/addons/google-forms"
  },
  {
    "code": "ADDON-042",
    "name": "Google Wallet",
    "slug": "google-wallet",
    "category": "Integrations",
    "priceMonthly": 59,
    "tagline": "Enterprise Google Wallet capability with multi-tenant data governance.",
    "description": "Integrate and operate Google Wallet within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/GoogleWallet.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/google-wallet",
    "docsUrl": "/docs/addons/google-wallet"
  },
  {
    "code": "ADDON-043",
    "name": "WooCommerce",
    "slug": "woocommerce-sync",
    "category": "E-Commerce & Sales",
    "priceMonthly": 89,
    "tagline": "Automated order, customer, and stock synchronization for WooCommerce",
    "description": "Integrate and operate WooCommerce within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Two-way Inventory Decrement",
      "Automated GST Invoicing",
      "Customer Ledger Mapping"
    ],
    "icon": "/addons-icons/WordpressWoocommerce.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/woocommerce-sync",
    "docsUrl": "/docs/addons/woocommerce-sync"
  },
  {
    "code": "ADDON-044",
    "name": "Shopify",
    "slug": "shopify-sync",
    "category": "E-Commerce & Sales",
    "priceMonthly": 99,
    "tagline": "Multi-store Shopify fulfillment, stock sync, and financial settlement",
    "description": "Integrate and operate Shopify within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Webhook Order Ingestion",
      "Inventory Restock Alerts",
      "Multi-currency Support"
    ],
    "icon": "/addons-icons/ShopifySync.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/shopify-sync",
    "docsUrl": "/docs/addons/shopify-sync"
  },
  {
    "code": "ADDON-045",
    "name": "Mailchimp",
    "slug": "mailchimp",
    "category": "E-Commerce & Sales",
    "priceMonthly": 39,
    "tagline": "Enterprise Mailchimp capability with multi-tenant data governance.",
    "description": "Integrate and operate Mailchimp within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/Mailchimp.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/mailchimp",
    "docsUrl": "/docs/addons/mailchimp"
  },
  {
    "code": "ADDON-046",
    "name": "Salesforce",
    "slug": "salesforce",
    "category": "E-Commerce & Sales",
    "priceMonthly": 39,
    "tagline": "Enterprise Salesforce capability with multi-tenant data governance.",
    "description": "Integrate and operate Salesforce within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/SalesForce.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/salesforce",
    "docsUrl": "/docs/addons/salesforce"
  },
  {
    "code": "ADDON-047",
    "name": "Sales Module",
    "slug": "sales-invoicing",
    "category": "E-Commerce & Sales",
    "priceMonthly": 69,
    "tagline": "Enterprise sales order management and GST-compliant invoicing",
    "description": "Integrate and operate Sales Module within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Intra/Inter-state Tax Split",
      "Quotation to Invoice Flow",
      "Credit Note Adjustments"
    ],
    "icon": "/addons-icons/Pipedrive.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/sales-invoicing",
    "docsUrl": "/docs/addons/sales-invoicing"
  },
  {
    "code": "ADDON-048",
    "name": "Newsletter",
    "slug": "newsletter",
    "category": "E-Commerce & Sales",
    "priceMonthly": 39,
    "tagline": "Enterprise Newsletter capability with multi-tenant data governance.",
    "description": "Integrate and operate Newsletter within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/Mailchimp.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/newsletter",
    "docsUrl": "/docs/addons/newsletter"
  },
  {
    "code": "ADDON-049",
    "name": "Feedback",
    "slug": "feedback",
    "category": "E-Commerce & Sales",
    "priceMonthly": 39,
    "tagline": "Enterprise Feedback capability with multi-tenant data governance.",
    "description": "Integrate and operate Feedback within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/Feedback.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/feedback",
    "docsUrl": "/docs/addons/feedback"
  },
  {
    "code": "ADDON-050",
    "name": "Inventory",
    "slug": "inventory-stock",
    "category": "E-Commerce & Sales",
    "priceMonthly": 79,
    "tagline": "Multi-warehouse stock control, batch tracking, and low-stock alarms",
    "description": "Integrate and operate Inventory within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-warehouse Transfers",
      "FIFO Costing Ledgers",
      "Barcode Dispatch Scanning"
    ],
    "icon": "/addons-icons/Inventory.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/inventory-stock",
    "docsUrl": "/docs/addons/inventory-stock"
  },
  {
    "code": "ADDON-051",
    "name": "Restaurant Menu",
    "slug": "restaurant-menu",
    "category": "E-Commerce & Sales",
    "priceMonthly": 39,
    "tagline": "Enterprise Restaurant Menu capability with multi-tenant data governance.",
    "description": "Integrate and operate Restaurant Menu within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/RestaurantMenu.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/restaurant-menu",
    "docsUrl": "/docs/addons/restaurant-menu"
  },
  {
    "code": "ADDON-052",
    "name": "Google Leads",
    "slug": "google-leads",
    "category": "E-Commerce & Sales",
    "priceMonthly": 39,
    "tagline": "Enterprise Google Leads capability with multi-tenant data governance.",
    "description": "Integrate and operate Google Leads within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/FindGoogleLeads.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/google-leads",
    "docsUrl": "/docs/addons/google-leads"
  },
  {
    "code": "ADDON-053",
    "name": "File Sharing",
    "slug": "file-sharing",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Centralized digital document repository with role-based access",
    "description": "Integrate and operate File Sharing within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Encrypted S3 Storage",
      "Version Control",
      "Audit Access Logs"
    ],
    "icon": "/addons-icons/Dropbox.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/file-sharing",
    "docsUrl": "/docs/addons/file-sharing"
  },
  {
    "code": "ADDON-054",
    "name": "Knowledge Base",
    "slug": "knowledge-base",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Enterprise Knowledge Base capability with multi-tenant data governance.",
    "description": "Integrate and operate Knowledge Base within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/KnowledgeBase.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/knowledge-base",
    "docsUrl": "/docs/addons/knowledge-base"
  },
  {
    "code": "ADDON-055",
    "name": "Diagram",
    "slug": "diagram",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Enterprise Diagram capability with multi-tenant data governance.",
    "description": "Integrate and operate Diagram within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/Diagram.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/diagram",
    "docsUrl": "/docs/addons/diagram"
  },
  {
    "code": "ADDON-056",
    "name": "Portfolio",
    "slug": "portfolio",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Enterprise Portfolio capability with multi-tenant data governance.",
    "description": "Integrate and operate Portfolio within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/Portfolio.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/portfolio",
    "docsUrl": "/docs/addons/portfolio"
  },
  {
    "code": "ADDON-057",
    "name": "Resume Builder",
    "slug": "resume-builder",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Enterprise Resume Builder capability with multi-tenant data governance.",
    "description": "Integrate and operate Resume Builder within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/ResumeBuilder.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/resume-builder",
    "docsUrl": "/docs/addons/resume-builder"
  },
  {
    "code": "ADDON-058",
    "name": "Digital Certificate",
    "slug": "certificate-studio",
    "category": "Content Management",
    "priceMonthly": 59,
    "tagline": "Cryptographically verifiable digital certificates and diplomas",
    "description": "Integrate and operate Digital Certificate within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Public QR Verification",
      "Custom Canvas Designer",
      "Batch Employee Issuance"
    ],
    "icon": "/addons-icons/DigitalCertificate.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/certificate-studio",
    "docsUrl": "/docs/addons/certificate-studio"
  },
  {
    "code": "ADDON-059",
    "name": "OneDrive",
    "slug": "onedrive",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Centralized digital document repository with role-based access",
    "description": "Integrate and operate OneDrive within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Encrypted S3 Storage",
      "Version Control",
      "Audit Access Logs"
    ],
    "icon": "/addons-icons/OneDrive.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/onedrive",
    "docsUrl": "/docs/addons/onedrive"
  },
  {
    "code": "ADDON-060",
    "name": "Box",
    "slug": "box",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Centralized digital document repository with role-based access",
    "description": "Integrate and operate Box within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Encrypted S3 Storage",
      "Version Control",
      "Audit Access Logs"
    ],
    "icon": "/addons-icons/Box.png",
    "featured": false,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/box",
    "docsUrl": "/docs/addons/box"
  },
  {
    "code": "ADDON-061",
    "name": "Spreadsheet",
    "slug": "spreadsheet",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Enterprise Spreadsheet capability with multi-tenant data governance.",
    "description": "Integrate and operate Spreadsheet within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/Spreadsheet.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/spreadsheet",
    "docsUrl": "/docs/addons/spreadsheet"
  },
  {
    "code": "ADDON-062",
    "name": "Innovation Center",
    "slug": "innovation-center",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Enterprise Innovation Center capability with multi-tenant data governance.",
    "description": "Integrate and operate Innovation Center within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/InnovationCenter.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/innovation-center",
    "docsUrl": "/docs/addons/innovation-center"
  },
  {
    "code": "ADDON-063",
    "name": "Planning",
    "slug": "planning",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Enterprise Planning capability with multi-tenant data governance.",
    "description": "Integrate and operate Planning within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/Planning.png",
    "featured": false,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/planning",
    "docsUrl": "/docs/addons/planning"
  },
  {
    "code": "ADDON-064",
    "name": "Business Model Canvas",
    "slug": "business-model",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Enterprise Business Model Canvas capability with multi-tenant data governance.",
    "description": "Integrate and operate Business Model Canvas within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/BusinessModelCanvas.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/business-model",
    "docsUrl": "/docs/addons/business-model"
  },
  {
    "code": "ADDON-065",
    "name": "Marketing Plan",
    "slug": "marketing-plan",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Enterprise Marketing Plan capability with multi-tenant data governance.",
    "description": "Integrate and operate Marketing Plan within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/MarketingPlan.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/marketing-plan",
    "docsUrl": "/docs/addons/marketing-plan"
  },
  {
    "code": "ADDON-066",
    "name": "McKinsey 7-S Framework",
    "slug": "mckinsey-7s",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Enterprise McKinsey 7-S Framework capability with multi-tenant data governance.",
    "description": "Integrate and operate McKinsey 7-S Framework within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/McKinseyModel.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/mckinsey-7s",
    "docsUrl": "/docs/addons/mckinsey-7s"
  },
  {
    "code": "ADDON-067",
    "name": "SWOT Analysis",
    "slug": "swot",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "SWOT Analysis framework analysis with scoring and export",
    "description": "Integrate and operate SWOT Analysis within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Interactive 4-Quadrant Canvas",
      "Impact Scoring 1-5",
      "Executive PDF Summary"
    ],
    "icon": "/addons-icons/SWOTAnalysisModel.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/swot",
    "docsUrl": "/docs/addons/swot"
  },
  {
    "code": "ADDON-068",
    "name": "PEST Analysis",
    "slug": "pest",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "PEST Analysis framework analysis with scoring and export",
    "description": "Integrate and operate PEST Analysis within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Interactive 4-Quadrant Canvas",
      "Impact Scoring 1-5",
      "Executive PDF Summary"
    ],
    "icon": "/addons-icons/PESTAnalysisModel.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/pest",
    "docsUrl": "/docs/addons/pest"
  },
  {
    "code": "ADDON-069",
    "name": "PESTEL Analysis",
    "slug": "pestel",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "PESTEL Analysis framework analysis with scoring and export",
    "description": "Integrate and operate PESTEL Analysis within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Interactive 4-Quadrant Canvas",
      "Impact Scoring 1-5",
      "Executive PDF Summary"
    ],
    "icon": "/addons-icons/PESTELAnalysisModel.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/pestel",
    "docsUrl": "/docs/addons/pestel"
  },
  {
    "code": "ADDON-070",
    "name": "Porter's Five Forces",
    "slug": "porters-five-forces",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Porter's Five Forces framework analysis with scoring and export",
    "description": "Integrate and operate Porter's Five Forces within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Interactive 4-Quadrant Canvas",
      "Impact Scoring 1-5",
      "Executive PDF Summary"
    ],
    "icon": "/addons-icons/PortersFiveForcesModel.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/porters-five-forces",
    "docsUrl": "/docs/addons/porters-five-forces"
  },
  {
    "code": "ADDON-071",
    "name": "Zendesk",
    "slug": "zendesk",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Enterprise Zendesk capability with multi-tenant data governance.",
    "description": "Integrate and operate Zendesk within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/Zendesk.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/zendesk",
    "docsUrl": "/docs/addons/zendesk"
  },
  {
    "code": "ADDON-072",
    "name": "Documents",
    "slug": "documents",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Centralized digital document repository with role-based access",
    "description": "Integrate and operate Documents within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Encrypted S3 Storage",
      "Version Control",
      "Audit Access Logs"
    ],
    "icon": "/addons-icons/GoogleDocs.png",
    "featured": false,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/documents",
    "docsUrl": "/docs/addons/documents"
  },
  {
    "code": "ADDON-073",
    "name": "Document Templates",
    "slug": "document-templates",
    "category": "Content Management",
    "priceMonthly": 49,
    "tagline": "Enterprise Document Templates capability with multi-tenant data governance.",
    "description": "Integrate and operate Document Templates within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/GoogleDocs.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/document-templates",
    "docsUrl": "/docs/addons/document-templates"
  },
  {
    "code": "ADDON-074",
    "name": "Quotation",
    "slug": "quotation",
    "category": "Finance",
    "priceMonthly": 89,
    "tagline": "Enterprise Quotation capability with multi-tenant data governance.",
    "description": "Integrate and operate Quotation within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/Quotation.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/quotation",
    "docsUrl": "/docs/addons/quotation"
  },
  {
    "code": "ADDON-075",
    "name": "QuickBooks",
    "slug": "quickbooks",
    "category": "Finance",
    "priceMonthly": 89,
    "tagline": "Cloud accounting synchronization with QuickBooks",
    "description": "Integrate and operate QuickBooks within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Voucher & Invoice Sync",
      "Customer Ledger Matching",
      "Tax Rate Normalization"
    ],
    "icon": "/addons-icons/QuickBooks.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/quickbooks",
    "docsUrl": "/docs/addons/quickbooks"
  },
  {
    "code": "ADDON-076",
    "name": "Sage",
    "slug": "sage",
    "category": "Finance",
    "priceMonthly": 89,
    "tagline": "Cloud accounting synchronization with Sage",
    "description": "Integrate and operate Sage within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Voucher & Invoice Sync",
      "Customer Ledger Matching",
      "Tax Rate Normalization"
    ],
    "icon": "/addons-icons/Sage.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/sage",
    "docsUrl": "/docs/addons/sage"
  },
  {
    "code": "ADDON-077",
    "name": "Xero",
    "slug": "xero",
    "category": "Finance",
    "priceMonthly": 89,
    "tagline": "Cloud accounting synchronization with Xero",
    "description": "Integrate and operate Xero within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Voucher & Invoice Sync",
      "Customer Ledger Matching",
      "Tax Rate Normalization"
    ],
    "icon": "/addons-icons/Xero.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/xero",
    "docsUrl": "/docs/addons/xero"
  },
  {
    "code": "ADDON-078",
    "name": "Contact Management",
    "slug": "contact-management",
    "category": "Finance",
    "priceMonthly": 89,
    "tagline": "Enterprise Contact Management capability with multi-tenant data governance.",
    "description": "Integrate and operate Contact Management within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/ContactManagement.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/contact-management",
    "docsUrl": "/docs/addons/contact-management"
  },
  {
    "code": "ADDON-079",
    "name": "Budget Planner",
    "slug": "budget-planner",
    "category": "Finance",
    "priceMonthly": 69,
    "tagline": "Departmental budget planning, cap limits, and variance analysis",
    "description": "Integrate and operate Budget Planner within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Monthly/Annual Caps",
      "Variance Alarms",
      "Manager Approval Routing"
    ],
    "icon": "/addons-icons/BudgetPlanner.png",
    "featured": false,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/budget-planner",
    "docsUrl": "/docs/addons/budget-planner"
  },
  {
    "code": "ADDON-080",
    "name": "Timesheet",
    "slug": "timesheet",
    "category": "Finance",
    "priceMonthly": 49,
    "tagline": "Project time tracking, billable hour logs, and payroll sync",
    "description": "Integrate and operate Timesheet within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Task Hour Logging",
      "Manager Sign-off Workflow",
      "Project Cost Calculation"
    ],
    "icon": "/addons-icons/Timesheet.png",
    "featured": false,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/timesheet",
    "docsUrl": "/docs/addons/timesheet"
  },
  {
    "code": "ADDON-081",
    "name": "Assets",
    "slug": "asset-management",
    "category": "Finance",
    "priceMonthly": 59,
    "tagline": "Enterprise physical and digital asset lifecycle tracking",
    "description": "Integrate and operate Assets within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Custodian Check-in/Check-out",
      "Depreciation Schedules",
      "Warranty Alerts"
    ],
    "icon": "/addons-icons/Assets.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/asset-management",
    "docsUrl": "/docs/addons/asset-management"
  },
  {
    "code": "ADDON-082",
    "name": "Asset Borrow & Rent",
    "slug": "asset-borrow-rent",
    "category": "Finance",
    "priceMonthly": 89,
    "tagline": "Enterprise Asset Borrow & Rent capability with multi-tenant data governance.",
    "description": "Integrate and operate Asset Borrow & Rent within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/AssetBorrowRent.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/asset-borrow-rent",
    "docsUrl": "/docs/addons/asset-borrow-rent"
  },
  {
    "code": "ADDON-083",
    "name": "Financial Goal",
    "slug": "financial-goal",
    "category": "Finance",
    "priceMonthly": 89,
    "tagline": "Enterprise Financial Goal capability with multi-tenant data governance.",
    "description": "Integrate and operate Financial Goal within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/FinancialGoal.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/financial-goal",
    "docsUrl": "/docs/addons/financial-goal"
  },
  {
    "code": "ADDON-084",
    "name": "Retainer",
    "slug": "retainer",
    "category": "Finance",
    "priceMonthly": 89,
    "tagline": "Enterprise Retainer capability with multi-tenant data governance.",
    "description": "Integrate and operate Retainer within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/Retainer.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/retainer",
    "docsUrl": "/docs/addons/retainer"
  },
  {
    "code": "ADDON-085",
    "name": "Plaid",
    "slug": "plaid",
    "category": "Finance",
    "priceMonthly": 99,
    "tagline": "Compliance and banking API bridge for Plaid",
    "description": "Integrate and operate Plaid within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "E-Invoice XML Signing",
      "Bank Feed Ingestion",
      "Government Portal Relay"
    ],
    "icon": "/addons-icons/Plaid.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/plaid",
    "docsUrl": "/docs/addons/plaid"
  },
  {
    "code": "ADDON-086",
    "name": "ZATCA (Saudi e-invoice)",
    "slug": "zatca",
    "category": "Finance",
    "priceMonthly": 99,
    "tagline": "Compliance and banking API bridge for ZATCA (Saudi e-invoice)",
    "description": "Integrate and operate ZATCA (Saudi e-invoice) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "E-Invoice XML Signing",
      "Bank Feed Ingestion",
      "Government Portal Relay"
    ],
    "icon": "/addons-icons/Zatca.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/zatca",
    "docsUrl": "/docs/addons/zatca"
  },
  {
    "code": "ADDON-087",
    "name": "European E-Invoice",
    "slug": "einvoice-eu",
    "category": "Finance",
    "priceMonthly": 99,
    "tagline": "Compliance and banking API bridge for European E-Invoice",
    "description": "Integrate and operate European E-Invoice within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "E-Invoice XML Signing",
      "Bank Feed Ingestion",
      "Government Portal Relay"
    ],
    "icon": "/addons-icons/EuropeanEInvoice.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/einvoice-eu",
    "docsUrl": "/docs/addons/einvoice-eu"
  },
  {
    "code": "ADDON-088",
    "name": "Recurring Invoice & Bill",
    "slug": "recurring-invoice-bill",
    "category": "Finance",
    "priceMonthly": 89,
    "tagline": "Enterprise Recurring Invoice & Bill capability with multi-tenant data governance.",
    "description": "Integrate and operate Recurring Invoice & Bill within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/RecurringInvoiceBill.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/recurring-invoice-bill",
    "docsUrl": "/docs/addons/recurring-invoice-bill"
  },
  {
    "code": "ADDON-089",
    "name": "Double Entry Accounting",
    "slug": "accounting",
    "category": "Finance",
    "priceMonthly": 99,
    "tagline": "Full double-entry general ledger, journal entries, and balance sheets",
    "description": "Integrate and operate Double Entry Accounting within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "5-Tier Chart of Accounts",
      "Trial Balance & P&L Reports",
      "Reconciliation Ledgers"
    ],
    "icon": "/addons-icons/DoubleEntryAccounting.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/accounting",
    "docsUrl": "/docs/addons/accounting"
  },
  {
    "code": "ADDON-090",
    "name": "Contract Template",
    "slug": "contract-billing",
    "category": "Finance",
    "priceMonthly": 89,
    "tagline": "Staffing client contracts, markup bases, and statutory GST billing schedules.",
    "description": "Enterprise contract staffing, multi-tier client terms, and automatic intra/inter-state tax billing calculations.",
    "features": [
      "Staffing Client Terms",
      "Configurable Markup Bases",
      "GST Tax Splitting"
    ],
    "icon": "/addons-icons/ContractTemplate.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/contract-billing",
    "docsUrl": "/docs/addons/contract-billing"
  },
  {
    "code": "ADDON-091",
    "name": "Team Workload",
    "slug": "team-workload",
    "category": "HR",
    "priceMonthly": 69,
    "tagline": "Enterprise Team Workload capability with multi-tenant data governance.",
    "description": "Integrate and operate Team Workload within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/TeamWorkload.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/team-workload",
    "docsUrl": "/docs/addons/team-workload"
  },
  {
    "code": "ADDON-092",
    "name": "Time Tracker",
    "slug": "time-tracker",
    "category": "HR",
    "priceMonthly": 69,
    "tagline": "Enterprise Time Tracker capability with multi-tenant data governance.",
    "description": "Integrate and operate Time Tracker within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/TimeTracker.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/time-tracker",
    "docsUrl": "/docs/addons/time-tracker"
  },
  {
    "code": "ADDON-093",
    "name": "Biometric Attendance",
    "slug": "biometric-sync",
    "category": "HR",
    "priceMonthly": 89,
    "tagline": "Hardware biometric punch synchronization (ZKTeco, eSSL, Realtime)",
    "description": "Integrate and operate Biometric Attendance within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Push SDK / ADMS Support",
      "Live Punch Logs",
      "Geo-fence Verification"
    ],
    "icon": "/addons-icons/BiometricAttendance.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/biometric-sync",
    "docsUrl": "/docs/addons/biometric-sync"
  },
  {
    "code": "ADDON-094",
    "name": "Recruitment (ATS)",
    "slug": "recruitment-ats",
    "category": "HR",
    "priceMonthly": 89,
    "tagline": "Applicant Tracking System (ATS), job pipelines, and candidate scoring",
    "description": "Integrate and operate Recruitment (ATS) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Kanban Candidate Stages",
      "Resume Parsing",
      "Interview Scheduling"
    ],
    "icon": "/addons-icons/RecruitmentATS.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/recruitment-ats",
    "docsUrl": "/docs/addons/recruitment-ats"
  },
  {
    "code": "ADDON-095",
    "name": "Procurement",
    "slug": "procurement",
    "category": "HR",
    "priceMonthly": 69,
    "tagline": "Enterprise Procurement capability with multi-tenant data governance.",
    "description": "Integrate and operate Procurement within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/Procurement.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/procurement",
    "docsUrl": "/docs/addons/procurement"
  },
  {
    "code": "ADDON-096",
    "name": "Performance Management",
    "slug": "okr-performance",
    "category": "HR",
    "priceMonthly": 79,
    "tagline": "OKR goal tracking, 360 appraisal review cycles, and performance scorecards",
    "description": "Integrate and operate Performance Management within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Quarterly OKR Metrics",
      "Peer & Manager Reviews",
      "Appraisal Rating Scales"
    ],
    "icon": "/addons-icons/PerformanceManagement.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/okr-performance",
    "docsUrl": "/docs/addons/okr-performance"
  },
  {
    "code": "ADDON-097",
    "name": "Petty Cash",
    "slug": "petty-cash",
    "category": "HR",
    "priceMonthly": 69,
    "tagline": "Enterprise Petty Cash capability with multi-tenant data governance.",
    "description": "Integrate and operate Petty Cash within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/PettyCash.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/petty-cash",
    "docsUrl": "/docs/addons/petty-cash"
  },
  {
    "code": "ADDON-098",
    "name": "Training Module",
    "slug": "training",
    "category": "HR",
    "priceMonthly": 69,
    "tagline": "Internal course management, employee onboarding modules, and exams",
    "description": "Integrate and operate Training Module within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Video Lesson Playlists",
      "Quiz Evaluations",
      "Automated Certification"
    ],
    "icon": "/addons-icons/TrainingModule.png",
    "featured": false,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/training",
    "docsUrl": "/docs/addons/training"
  },
  {
    "code": "ADDON-099",
    "name": "Job Search (Job Board)",
    "slug": "job-search",
    "category": "HR",
    "priceMonthly": 69,
    "tagline": "Enterprise Job Search (Job Board) capability with multi-tenant data governance.",
    "description": "Integrate and operate Job Search (Job Board) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/JobSearch.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/job-search",
    "docsUrl": "/docs/addons/job-search"
  },
  {
    "code": "ADDON-100",
    "name": "LMS (Learning Management System)",
    "slug": "learning-lms",
    "category": "HR",
    "priceMonthly": 69,
    "tagline": "Internal course management, employee onboarding modules, and exams",
    "description": "Integrate and operate LMS (Learning Management System) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Video Lesson Playlists",
      "Quiz Evaluations",
      "Automated Certification"
    ],
    "icon": "/addons-icons/LearningLMS.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/learning-lms",
    "docsUrl": "/docs/addons/learning-lms"
  },
  {
    "code": "ADDON-101",
    "name": "eBook",
    "slug": "ebook",
    "category": "HR",
    "priceMonthly": 69,
    "tagline": "Enterprise eBook capability with multi-tenant data governance.",
    "description": "Integrate and operate eBook within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/eBook.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/ebook",
    "docsUrl": "/docs/addons/ebook"
  },
  {
    "code": "ADDON-102",
    "name": "Email Box",
    "slug": "email-box",
    "category": "Communication & Customization",
    "priceMonthly": 49,
    "tagline": "Enterprise Email Box capability with multi-tenant data governance.",
    "description": "Integrate and operate Email Box within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/OutlookMail.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/email-box",
    "docsUrl": "/docs/addons/email-box"
  },
  {
    "code": "ADDON-103",
    "name": "Outlook Mail",
    "slug": "outlook-mail",
    "category": "Communication & Customization",
    "priceMonthly": 49,
    "tagline": "Enterprise Outlook Mail capability with multi-tenant data governance.",
    "description": "Integrate and operate Outlook Mail within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/OutlookMail.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/outlook-mail",
    "docsUrl": "/docs/addons/outlook-mail"
  },
  {
    "code": "ADDON-104",
    "name": "Call Hub",
    "slug": "call-hub",
    "category": "Communication & Customization",
    "priceMonthly": 49,
    "tagline": "Enterprise Call Hub capability with multi-tenant data governance.",
    "description": "Integrate and operate Call Hub within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/CallHub.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/call-hub",
    "docsUrl": "/docs/addons/call-hub"
  },
  {
    "code": "ADDON-105",
    "name": "Business Process Mapping",
    "slug": "fbp",
    "category": "Communication & Customization",
    "priceMonthly": 59,
    "tagline": "Flexible Benefit Plan (FBP) salary structuring and statutory caps",
    "description": "Integrate and operate Business Process Mapping within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Statutory Component Bounds",
      "Employee Declaration Portal",
      "Cap Overflow Guards"
    ],
    "icon": "/addons-icons/BusinessProcessMapping.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/fbp",
    "docsUrl": "/docs/addons/fbp"
  },
  {
    "code": "ADDON-106",
    "name": "Roadmap Central",
    "slug": "roadmap-central",
    "category": "Communication & Customization",
    "priceMonthly": 49,
    "tagline": "Enterprise Roadmap Central capability with multi-tenant data governance.",
    "description": "Integrate and operate Roadmap Central within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/RoadmapCentral.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/roadmap-central",
    "docsUrl": "/docs/addons/roadmap-central"
  },
  {
    "code": "ADDON-107",
    "name": "Custom Field",
    "slug": "custom-fields",
    "category": "Communication & Customization",
    "priceMonthly": 39,
    "tagline": "Dynamic custom field definitions across employees, clients, and leads",
    "description": "Integrate and operate Custom Field within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Text, Number, Date, Dropdown Types",
      "Conditional Visibility",
      "Export & Filter Support"
    ],
    "icon": "/addons-icons/CustomField.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/custom-fields",
    "docsUrl": "/docs/addons/custom-fields"
  },
  {
    "code": "ADDON-108",
    "name": "Form Builder",
    "slug": "form-builder",
    "category": "Communication & Customization",
    "priceMonthly": 49,
    "tagline": "Drag-and-drop form designer with public submission links",
    "description": "Integrate and operate Form Builder within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Custom Survey Designer",
      "Validation Rules",
      "Submission Webhooks"
    ],
    "icon": "/addons-icons/FormBuilder.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/form-builder",
    "docsUrl": "/docs/addons/form-builder"
  },
  {
    "code": "ADDON-109",
    "name": "Request Management",
    "slug": "request-management",
    "category": "Communication & Customization",
    "priceMonthly": 49,
    "tagline": "Enterprise Request Management capability with multi-tenant data governance.",
    "description": "Integrate and operate Request Management within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/RequestManagement.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/request-management",
    "docsUrl": "/docs/addons/request-management"
  },
  {
    "code": "ADDON-110",
    "name": "Workflow Automation",
    "slug": "workflows",
    "category": "Communication & Customization",
    "priceMonthly": 69,
    "tagline": "Multi-stage approval rules and automated triggering actions",
    "description": "Integrate and operate Workflow Automation within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-level Sequential Approvals",
      "Conditional Branching",
      "Terminal Triggers"
    ],
    "icon": "/addons-icons/PabblyConnect.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/workflows",
    "docsUrl": "/docs/addons/workflows"
  },
  {
    "code": "ADDON-111",
    "name": "Sidebar Menu Builder",
    "slug": "sidebar-menu-builder",
    "category": "Communication & Customization",
    "priceMonthly": 49,
    "tagline": "Enterprise Sidebar Menu Builder capability with multi-tenant data governance.",
    "description": "Integrate and operate Sidebar Menu Builder within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/SidebarMenuBuilder.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/sidebar-menu-builder",
    "docsUrl": "/docs/addons/sidebar-menu-builder"
  },
  {
    "code": "ADDON-112",
    "name": "Todo",
    "slug": "todo",
    "category": "Communication & Customization",
    "priceMonthly": 29,
    "tagline": "Collaborative workspace checklists, subtasks, and personal reminders",
    "description": "Integrate and operate Todo within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Due Date Alerts",
      "Priority Flags",
      "Checklist Progress"
    ],
    "icon": "/addons-icons/ToDo.png",
    "featured": false,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/todo",
    "docsUrl": "/docs/addons/todo"
  },
  {
    "code": "ADDON-113",
    "name": "Meeting Hub",
    "slug": "meeting-hub",
    "category": "Communication & Customization",
    "priceMonthly": 49,
    "tagline": "Enterprise Meeting Hub capability with multi-tenant data governance.",
    "description": "Integrate and operate Meeting Hub within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/WherebyMeeting.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/meeting-hub",
    "docsUrl": "/docs/addons/meeting-hub"
  },
  {
    "code": "ADDON-114",
    "name": "Notes",
    "slug": "notes",
    "category": "Mobility & Operations",
    "priceMonthly": 29,
    "tagline": "Workspace scratchpad, rich notes, pinned thoughts, and collaboration",
    "description": "Integrate and operate Notes within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Tagging & Color Codes",
      "Pinning & Starring",
      "Soft-delete Trash Lifecycle"
    ],
    "icon": "/addons-icons/Notes.png",
    "featured": false,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/notes",
    "docsUrl": "/docs/addons/notes"
  },
  {
    "code": "ADDON-115",
    "name": "API Module",
    "slug": "public-api",
    "category": "Mobility & Operations",
    "priceMonthly": 89,
    "tagline": "RESTful Public Developer APIs with bearer keys and rate limiters",
    "description": "Integrate and operate API Module within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "SHA-256 Key Protection",
      "Scoped Permissions",
      "Usage Analytics"
    ],
    "icon": "/addons-icons/APIModule.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/public-api",
    "docsUrl": "/docs/addons/public-api"
  },
  {
    "code": "ADDON-116",
    "name": "Support Ticket",
    "slug": "support",
    "category": "Mobility & Operations",
    "priceMonthly": 69,
    "tagline": "Customer and employee helpdesk ticket queues with SLA escalations",
    "description": "Integrate and operate Support Ticket within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Ticket Priority Queues",
      "SLA Response Tracking",
      "Email Piping"
    ],
    "icon": "/addons-icons/HubspotSupportTicket.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/support",
    "docsUrl": "/docs/addons/support"
  },
  {
    "code": "ADDON-117",
    "name": "Rotas (Rota/Schedule Management)",
    "slug": "shifts",
    "category": "Mobility & Operations",
    "priceMonthly": 49,
    "tagline": "Enterprise Rotas (Rota/Schedule Management) capability with multi-tenant data governance.",
    "description": "Integrate and operate Rotas (Rota/Schedule Management) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/Rotas.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/shifts",
    "docsUrl": "/docs/addons/shifts"
  },
  {
    "code": "ADDON-118",
    "name": "Activity Log",
    "slug": "activity-logs",
    "category": "Mobility & Operations",
    "priceMonthly": 59,
    "tagline": "Immutable audit logs tracking system changes, security events, and IP",
    "description": "Integrate and operate Activity Log within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "PII Deep Redaction",
      "RFC-4180 CSV Export",
      "Tamper-evident Logs"
    ],
    "icon": "/addons-icons/ActivityLog.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/activity-logs",
    "docsUrl": "/docs/addons/activity-logs"
  },
  {
    "code": "ADDON-119",
    "name": "Project Template",
    "slug": "projects",
    "category": "Mobility & Operations",
    "priceMonthly": 49,
    "tagline": "Enterprise Project Template capability with multi-tenant data governance.",
    "description": "Integrate and operate Project Template within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/AsanaProjectManagement.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/projects",
    "docsUrl": "/docs/addons/projects"
  },
  {
    "code": "ADDON-120",
    "name": "Reminder",
    "slug": "internal-reminders",
    "category": "Mobility & Operations",
    "priceMonthly": 29,
    "tagline": "Entity-linked context reminders for contract renewals and birthdays",
    "description": "Integrate and operate Reminder within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Entity Linking",
      "Recurring Schedules",
      "Email/App Dispatches"
    ],
    "icon": "/addons-icons/Reminder.png",
    "featured": false,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/internal-reminders",
    "docsUrl": "/docs/addons/internal-reminders"
  },
  {
    "code": "ADDON-121",
    "name": "Signature",
    "slug": "signature",
    "category": "Mobility & Operations",
    "priceMonthly": 49,
    "tagline": "Enterprise Signature capability with multi-tenant data governance.",
    "description": "Integrate and operate Signature within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/Signature.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/signature",
    "docsUrl": "/docs/addons/signature"
  },
  {
    "code": "ADDON-122",
    "name": "Custom Alert",
    "slug": "custom-alert",
    "category": "Mobility & Operations",
    "priceMonthly": 49,
    "tagline": "Enterprise Custom Alert capability with multi-tenant data governance.",
    "description": "Integrate and operate Custom Alert within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Multi-tenant Isolation",
      "Audit Logging",
      "Automated Synchronization"
    ],
    "icon": "/addons-icons/CustomAlert.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/custom-alert",
    "docsUrl": "/docs/addons/custom-alert"
  },
  {
    "code": "ADDON-123",
    "name": "AI Document",
    "slug": "ai-document",
    "category": "AI",
    "priceMonthly": 99,
    "tagline": "AI-assisted contract, policy, and job description generation",
    "description": "Integrate and operate AI Document within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Dynamic Prompt Templates",
      "Variable Substitution",
      "Historical Generations Archive"
    ],
    "icon": "/addons-icons/AIDocument.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/ai-document",
    "docsUrl": "/docs/addons/ai-document"
  },
  {
    "code": "ADDON-124",
    "name": "AI Assistant",
    "slug": "ai-assistant",
    "category": "AI",
    "priceMonthly": 99,
    "tagline": "Conversational AI copilot for HR, finance, and company policy answers",
    "description": "Integrate and operate AI Assistant within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Retrieval-Augmented Answers",
      "Thread History",
      "Multi-tenant Isolation"
    ],
    "icon": "/addons-icons/AIAssistant.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/ai-assistant",
    "docsUrl": "/docs/addons/ai-assistant"
  },
  {
    "code": "ADDON-125",
    "name": "Backup & Restore",
    "slug": "backup-restore",
    "category": "Security",
    "priceMonthly": 79,
    "tagline": "One-click tenant backup bundles, JSON snapshots, and automated restores",
    "description": "Integrate and operate Backup & Restore within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "SHA-256 Checksum Verification",
      "Dry-run Validation",
      "Automated S3 Archival"
    ],
    "icon": "/addons-icons/GoogleDrive.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/backup-restore",
    "docsUrl": "/docs/addons/backup-restore"
  },
  {
    "code": "ADDON-126",
    "name": "Google Authentication (2FA)",
    "slug": "two-factor-auth",
    "category": "Security",
    "priceMonthly": 49,
    "tagline": "Two-factor TOTP authentication with backup recovery codes",
    "description": "Integrate and operate Google Authentication (2FA) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "RFC 6238 TOTP Standard",
      "8 Single-use Backup Codes",
      "Enforced Tenant Policy"
    ],
    "icon": "/addons-icons/GoogleAuthentication.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/two-factor-auth",
    "docsUrl": "/docs/addons/two-factor-auth"
  },
  {
    "code": "ADDON-127",
    "name": "Google Captcha (reCAPTCHA)",
    "slug": "turnstile-captcha",
    "category": "Security",
    "priceMonthly": 29,
    "tagline": "Cloudflare Turnstile & Google reCAPTCHA bot defense",
    "description": "Integrate and operate Google Captcha (reCAPTCHA) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "Silent Bot Detection",
      "Replay Attack Prevention",
      "Login Brute-force Shield"
    ],
    "icon": "/addons-icons/GoogleCaptcha.png",
    "featured": true,
    "status": "active",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/turnstile-captcha",
    "docsUrl": "/docs/addons/turnstile-captcha"
  },
  {
    "code": "ADDON-128",
    "name": "GitHub Sign-in (OAuth)",
    "slug": "github-oauth",
    "category": "Security",
    "priceMonthly": 49,
    "tagline": "Enterprise Single Sign-On (SSO) authentication via GitHub Sign-in (OAuth)",
    "description": "Integrate and operate GitHub Sign-in (OAuth) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "OpenID Connect / OAuth 2.0",
      "Automated User Provisioning",
      "Domain Restrictions"
    ],
    "icon": "/addons-icons/Signinwithgithub.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/github-oauth",
    "docsUrl": "/docs/addons/github-oauth"
  },
  {
    "code": "ADDON-129",
    "name": "Facebook Sign-in (OAuth)",
    "slug": "facebook-oauth",
    "category": "Security",
    "priceMonthly": 49,
    "tagline": "Enterprise Single Sign-On (SSO) authentication via Facebook Sign-in (OAuth)",
    "description": "Integrate and operate Facebook Sign-in (OAuth) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "OpenID Connect / OAuth 2.0",
      "Automated User Provisioning",
      "Domain Restrictions"
    ],
    "icon": "/addons-icons/SignInWithFacebook.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/facebook-oauth",
    "docsUrl": "/docs/addons/facebook-oauth"
  },
  {
    "code": "ADDON-130",
    "name": "Google Sign-in (OAuth)",
    "slug": "google-oauth",
    "category": "Security",
    "priceMonthly": 49,
    "tagline": "Enterprise Single Sign-On (SSO) authentication via Google Sign-in (OAuth)",
    "description": "Integrate and operate Google Sign-in (OAuth) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "OpenID Connect / OAuth 2.0",
      "Automated User Provisioning",
      "Domain Restrictions"
    ],
    "icon": "/addons-icons/SignInWithGoogle.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/google-oauth",
    "docsUrl": "/docs/addons/google-oauth"
  },
  {
    "code": "ADDON-131",
    "name": "LinkedIn Sign-in (OAuth)",
    "slug": "linkedin-oauth",
    "category": "Security",
    "priceMonthly": 49,
    "tagline": "Enterprise Single Sign-On (SSO) authentication via LinkedIn Sign-in (OAuth)",
    "description": "Integrate and operate LinkedIn Sign-in (OAuth) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "OpenID Connect / OAuth 2.0",
      "Automated User Provisioning",
      "Domain Restrictions"
    ],
    "icon": "/addons-icons/SignInWithLinkedIn.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/linkedin-oauth",
    "docsUrl": "/docs/addons/linkedin-oauth"
  },
  {
    "code": "ADDON-132",
    "name": "Slack Sign-in (OAuth)",
    "slug": "slack-oauth",
    "category": "Security",
    "priceMonthly": 49,
    "tagline": "Enterprise Single Sign-On (SSO) authentication via Slack Sign-in (OAuth)",
    "description": "Integrate and operate Slack Sign-in (OAuth) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "OpenID Connect / OAuth 2.0",
      "Automated User Provisioning",
      "Domain Restrictions"
    ],
    "icon": "/addons-icons/SignInWithSlack.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/slack-oauth",
    "docsUrl": "/docs/addons/slack-oauth"
  },
  {
    "code": "ADDON-133",
    "name": "Microsoft Sign-in (OAuth)",
    "slug": "microsoft-oauth",
    "category": "Security",
    "priceMonthly": 49,
    "tagline": "Enterprise Single Sign-On (SSO) authentication via Microsoft Sign-in (OAuth)",
    "description": "Integrate and operate Microsoft Sign-in (OAuth) within your Master ERP organization. Provides seamless data synchronization, granular RBAC access controls, and automated reporting.",
    "features": [
      "OpenID Connect / OAuth 2.0",
      "Automated User Provisioning",
      "Domain Restrictions"
    ],
    "icon": "/addons-icons/SignInWithMicrosoft.png",
    "featured": false,
    "status": "available",
    "developer": "Master ERP Core Team",
    "version": "1.0.0",
    "installUrl": "/addons/microsoft-oauth",
    "docsUrl": "/docs/addons/microsoft-oauth"
  }
];

export async function syncCanonical133Addons(prismaClient: any) {
  let createdCount = 0;
  let updatedCount = 0;

  // Batch query all existing addons
  const existingRecords = await prismaClient.addon.findMany({
    select: { id: true, slug: true, tagline: true, description: true, icon: true, features: true, developer: true, version: true },
  });
  const existingMap = new Map<string, any>(existingRecords.map((r: any) => [r.slug, r]));

  for (const item of CANONICAL_133_ADDONS) {
    const existing = existingMap.get(item.slug);

    if (!existing) {
      await prismaClient.addon.create({
        data: {
          name: item.name,
          slug: item.slug,
          tagline: item.tagline,
          description: item.description,
          longDescription: item.description,
          category: item.category,
          priceMonthly: item.priceMonthly,
          icon: item.icon,
          features: item.features,
          featured: item.featured,
          status: item.status,
          developer: item.developer,
          version: item.version,
          installUrl: item.installUrl,
          docsUrl: item.docsUrl,
        },
      });
      createdCount++;
    } else {
      await prismaClient.addon.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          category: item.category,
          tagline: existing.tagline || item.tagline,
          description: existing.description || item.description,
          icon: existing.icon || item.icon,
          features: existing.features && Array.isArray(existing.features) && existing.features.length > 0
            ? existing.features
            : item.features,
          developer: existing.developer || item.developer,
          version: existing.version || item.version,
        },
      });
      updatedCount++;
    }
  }

  const total = await prismaClient.addon.count();
  return { createdCount, updatedCount, total };
}
