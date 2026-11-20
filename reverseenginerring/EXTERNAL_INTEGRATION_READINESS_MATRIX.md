# MASTERHRMS — EXTERNAL INTEGRATION READINESS MATRIX
## Comprehensive Technical Inventory & Dependency Audit of All 57 External Interfaces

**Document Identifier:** `EGM-EXT-MATRIX-2026-11-19`  
**Investigation Standard:** Empirical Codebase Reality & Provider Dependency Verification  
**Audit Standard:** Strict Mutually Exclusive Classification  
**Date:** November 19, 2026  
**Auditor Classification:** Lead Forensic Systems Auditor  

---

## 1. Executive Summary & Classification Standard

This matrix provides the authoritative technical audit of all external third-party integrations across the WorkDo SaaS specification and MASTERHRMS codebase.

### Classification Criteria:
- **`BLOCKED_EXTERNAL` (10 Items):**
  - Meaningful integration implementation, controller, or service adapter **actually exists** in `server/src/`.
  - Synthetic or sandbox execution operates locally.
  - Live production verification is strictly gated by missing third-party provider accounts, client credentials, API tokens, or merchant approval.
- **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY` (47 Items):**
  - Integration source code, routes, or client SDK wrappers **do NOT yet exist** in the repository.
  - External credentials will eventually be required once the software adapter is authored.
  - **Audit Rule:** Unimplemented integrations are strictly separated from `BLOCKED_EXTERNAL` to prevent masking missing code as credential blockers.

---

## 2. Global Integration Summary Scoreboard

| Status Classification | Add-ons Count | Business Functions Count | Total External Scope | Percentage of External Scope | Code Presence in Repository |
|---|---|---|---|---|---|
| **BLOCKED_EXTERNAL** | **8 Items** | **2 Items** | **10 Items** | **17.5%** | **Yes (Adapters / Routes Present)** |
| **NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY** | **47 Items** | **0 Items** | **47 Items** | **82.5%** | **No (Codebase Unbuilt)** |
| **TOTAL EXTERNAL INTERFACES** | **55 Items** | **2 Items** | **57 Items** | **100.0%** | **10 Present / 47 Unbuilt** |

---

## 3. Comprehensive External Integration Register

| ID | Integration Name | Category | Code in Repo? | Implementation Path | Target External Provider / Protocol | Required Provider Credentials | Sandbox / Mock Support | Audit Classification | Technical Readiness & Blocker Assessment |
|---|---|---|---|---|---|---|---|---|---|
| **ADDON-008** | WhatsApp | Social Media / Messaging | **Yes** | `server/src/routes/alerts.routes.ts, services/messaging-gateway.service.ts` | Meta WhatsApp Cloud API v19.0 | WABA ID, Phone Number ID, Permanent System User Token | Yes (/simulate & mock-sandbox) | **`BLOCKED_EXTERNAL`** | Adapter built; blocked by live Meta WABA account |
| **ADDON-011** | Twilio | Social Media / Messaging | **Yes** | `server/src/services/messaging-gateway.service.ts` | Twilio Programmable SMS API | Account SID, Auth Token, Sender Phone Number | Yes (mock-sandbox provider) | **`BLOCKED_EXTERNAL`** | Adapter built; blocked by live Twilio credentials |
| **ADDON-016** | MSG91 | Social Media / Messaging | **Yes** | `server/src/services/messaging-gateway.service.ts` | MSG91 Send SMS API v5 | Authkey, DLT Approved Sender ID, Template IDs | Yes (mock-sandbox provider) | **`BLOCKED_EXTERNAL`** | Adapter built; blocked by live MSG91 & DLT approval |
| **ADDON-019** | Generic SMS Gateway | Social Media / Messaging | **Yes** | `server/src/modules/sms-gateway/, services/messaging-gateway.service.ts` | Telecom Aggregator HTTP Gateway | HTTP Endpoint, API Key, Secret | Yes (mock-sandbox) | **`BLOCKED_EXTERNAL`** | Module & adapter built; blocked by aggregator gateway |
| **ADDON-021** | Google Workspace | Social Media / Productivity | **Yes** | `server/src/services/integration-hub.service.ts` | Google Workspace Admin SDK / Directory API | Google Cloud Project, OAuth2 Client ID/Secret, Service Account JSON | No | **`BLOCKED_EXTERNAL`** | Connector scaffolded in IntegrationHub; blocked by Google OAuth app |
| **ADDON-043** | WooCommerce | E-Commerce & Sales | **Yes** | `server/src/routes/woocommerce.routes.ts, services/integration-hub.service.ts` | WooCommerce REST API v3 | Store URL, Consumer Key, Consumer Secret | Yes (local synthetic payload) | **`BLOCKED_EXTERNAL`** | Controller & sync logic built; blocked by live store keys |
| **ADDON-044** | Shopify | E-Commerce & Sales | **Yes** | `server/src/routes/shopify.routes.ts, services/integration-hub.service.ts` | Shopify Admin GraphQL / REST API (2024-01) | Store Domain, Admin API Access Token, Webhook Secret | Yes (local synthetic payload) | **`BLOCKED_EXTERNAL`** | Controller & webhook listeners built; blocked by live Shopify token |
| **ADDON-127** | Google Captcha / Turnstile | Security & Anti-Bot | **Yes** | `server/src/services/security/turnstile.service.ts, middleware/turnstile.middleware.ts` | Cloudflare Turnstile / Google reCAPTCHA | Site Key, Secret Key | Yes (Cloudflare test dummy keys, 13/13 test pass) | **`BLOCKED_EXTERNAL`** | Service & middleware built; tested synthetically; blocked by live site keys |
| **FN-062** | WooCommerce Bidirectional Stock Decrement | E-Commerce & External Sync | **Yes** | `server/src/routes/woocommerce.routes.ts` | WooCommerce REST API v3 | Store URL, Consumer Key, Consumer Secret | Yes | **`BLOCKED_EXTERNAL`** | Route /sync built; blocked by live store credentials |
| **FN-063** | WhatsApp Alerts Message Queue Worker | E-Commerce & External Sync | **Yes** | `server/src/routes/alerts.routes.ts (POST /api/alerts/whatsapp)` | Meta WhatsApp Cloud API | Meta Access Token, Phone Number ID | Yes (WebSocket queued broadcast) | **`BLOCKED_EXTERNAL`** | Queue worker endpoint built; blocked by live Meta token |
| **ADDON-006** | Instagram | Social Media | **No** | `None` | Meta Instagram Graph API v19.0 | Meta App ID, App Secret, Instagram Business Account Token | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Meta Graph adapter |
| **ADDON-007** | Facebook | Social Media | **No** | `None` | Meta Pages API | Meta Developer Account, Page Access Token | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Meta Pages adapter |
| **ADDON-009** | YouTube | Social Media | **No** | `None` | Google YouTube Data API v3 | Google Cloud Project, YouTube API Key, OAuth 2.0 Client | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires YouTube client |
| **ADDON-010** | Telegram | Social Media | **No** | `None` | Telegram Bot API | Telegram Bot Token from @BotFather | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Telegram bot webhook handler |
| **ADDON-012** | Slack | Social Media | **No** | `None` | Slack Web API / Events API | Slack App Bot Token (xoxb-), Signing Secret | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Slack event dispatcher |
| **ADDON-013** | Discord | Social Media | **No** | `None` | Discord REST API / Webhooks | Discord Bot Token, Application ID | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Discord bot adapter |
| **ADDON-014** | HubSpot | Social Media / CRM | **No** | `None` | HubSpot CRM API v3 | HubSpot Private App Access Token | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires HubSpot sync engine |
| **ADDON-015** | Nexmo (SMS) | Social Media | **No** | `None` | Vonage Communication API | Vonage API Key, API Secret | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Vonage SMS adapter |
| **ADDON-017** | Vonage (SMS) | Social Media | **No** | `None` | Vonage Messages API | Application ID, Private Key (.key file) | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Vonage Messages adapter |
| **ADDON-018** | ClickSend (SMS) | Social Media | **No** | `None` | ClickSend REST API | ClickSend Username, API Key | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires ClickSend adapter |
| **ADDON-020** | Google Meet | Social Media / Video | **No** | `None` | Google Meet REST API | Google Cloud OAuth2 Client ID/Secret, Scopes | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Meet conference generator |
| **ADDON-022** | Zoom | Social Media / Video | **No** | `None` | Zoom Server-to-Server OAuth API | Zoom Account ID, Client ID, Client Secret | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Zoom meeting scheduler |
| **ADDON-023** | Zoho | Social Media / CRM | **No** | `None` | Zoho CRM API v2 | Zoho Client ID, Client Secret, Refresh Token | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Zoho CRM adapter |
| **ADDON-024** | Livestorm | Social Media / Video | **No** | `None` | Livestorm API v1 | Livestorm API Token | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Livestorm adapter |
| **ADDON-025** | Amazon SES | Social Media / Email | **No** | `None` | AWS Simple Email Service v2 | AWS Access Key ID, Secret Access Key, Verified Identity | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires AWS SES client |
| **ADDON-026** | Google Calendar | Integrations / Calendar | **No** | `None` | Google Calendar API v3 | Google Cloud OAuth2 Client ID/Secret, Sync Channel | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Google Cal bidirectional sync |
| **ADDON-027** | Outlook Calendar | Integrations / Calendar | **No** | `None` | Microsoft Graph API | Azure AD App Registration (Client ID, Secret, Tenant ID) | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Graph Calendar client |
| **ADDON-028** | Zapier | Integrations / Automation | **No** | `None` | Zapier Partner CLI Platform | Zapier CLI Deploy Key | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Zapier integration app |
| **ADDON-029** | Make (Integromat) | Integrations / Automation | **No** | `None` | Make Custom Apps API | Make App UUID, Partner API Key | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Make app definition |
| **ADDON-031** | n8n | Integrations / Automation | **No** | `None` | n8n Community Node / Webhooks | n8n API Key, Webhook URL | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires n8n custom node |
| **ADDON-032** | IndiaMART | Integrations / CRM | **No** | `None` | IndiaMART CRM Lead API | IndiaMART GLUSR Mobile Key | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires IndiaMART poll worker |
| **ADDON-033** | Sendinblue (Brevo) | Integrations / Email | **No** | `None` | Brevo REST API v3 | Brevo API Key (xkeysib-) | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Brevo transactional client |
| **ADDON-034** | OneNote | Integrations / Notes | **No** | `None` | Microsoft Graph API (Notes) | Azure AD App Registration, Notes.ReadWrite.All scope | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires OneNote client |
| **ADDON-035** | Trello | Integrations / Tasks | **No** | `None` | Atlassian Trello REST API | Trello Developer API Key, Token | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Trello board sync |
| **ADDON-037** | Jira | Integrations / Tasks | **No** | `None` | Atlassian Jira Cloud REST API v3 | Atlassian Cloud URL, User Email, API Token | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Jira issue synchronizer |
| **ADDON-038** | Google Analytics | Integrations / Analytics | **No** | `None` | Google Analytics Data API (GA4) | Google Cloud Service Account with GA4 Viewer role | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires GA4 reporting client |
| **ADDON-039** | Google Slides | Integrations / Content | **No** | `None` | Google Slides API v1 | Google Cloud OAuth2 Client, Service Account | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Slides deck generator |
| **ADDON-040** | WHMCS | Integrations / Billing | **No** | `None` | WHMCS External API | WHMCS URL, Admin API Identifier, Secret Key | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires WHMCS client |
| **ADDON-041** | Google Forms | Integrations / Forms | **No** | `None` | Google Forms API v1 | Google Cloud OAuth2 Credentials | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Google Forms response listener |
| **ADDON-042** | Google Wallet | Integrations / Wallet | **No** | `None` | Google Wallet REST API | Google Cloud Service Account with Issuer Permissions | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Google Wallet pass issuer |
| **ADDON-045** | Mailchimp | E-Commerce & Sales | **No** | `None` | Mailchimp Marketing API v3 | Mailchimp API Key with datacenter prefix | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Mailchimp audience sync |
| **ADDON-046** | Salesforce | E-Commerce & Sales | **No** | `None` | Salesforce REST API | Connected App Consumer Key/Secret, Username, Password | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Salesforce SOQL sync |
| **ADDON-059** | OneDrive | Content Management | **No** | `None` | Microsoft Graph API (Files) | Azure AD App Registration, Files.ReadWrite.All scope | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires OneDrive drive client |
| **ADDON-071** | Zendesk | Content Management / Support | **No** | `None` | Zendesk Support API v2 | Zendesk Subdomain, Agent Email, API Token | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Zendesk ticket bridge |
| **ADDON-075** | QuickBooks | Finance & Accounting | **No** | `None` | Intuit QuickBooks Online Accounting API | Intuit Developer Account, Client ID/Secret, Realm ID | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Intuit OAuth2 client |
| **ADDON-076** | Sage | Finance & Accounting | **No** | `None` | Sage Business Cloud Accounting API | Sage Developer Account, Client ID, Client Secret | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Sage accounting client |
| **ADDON-077** | Xero | Finance & Accounting | **No** | `None` | Xero Accounting API v2 | Xero App Client ID, Client Secret, Tenant ID | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Xero OAuth2 client |
| **ADDON-085** | Plaid | Finance & Banking | **No** | `None` | Plaid API v2 | Plaid Client ID, Secret, Public Key | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Plaid Link transaction client |
| **ADDON-086** | ZATCA (Saudi e-invoice) | Finance & Compliance | **No** | `None` | ZATCA Fatoora Portal API | Cryptographic Stamp Identifier (CSID), Compliance Certificate | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires ZATCA XML signing engine |
| **ADDON-087** | European E-Invoice | Finance & Compliance | **No** | `None` | Peppol Access Point (AS4) | Peppol Participant ID, SMP Provider Access | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Peppol UBL invoice engine |
| **ADDON-103** | Outlook Mail | Communication | **No** | `None` | Microsoft Graph API (Mail) | Azure AD App Registration, Mail.Send scope | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Graph Mail client |
| **ADDON-128** | GitHub Sign-in (OAuth) | Security / SSO | **No** | `None` | GitHub OAuth Apps | GitHub OAuth App Client ID, Client Secret | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires GitHub OAuth callback handler |
| **ADDON-129** | Facebook Sign-in (OAuth) | Security / SSO | **No** | `None` | Meta Facebook Login | Facebook App ID, App Secret | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Facebook OAuth callback handler |
| **ADDON-130** | Google Sign-in (OAuth) | Security / SSO | **No** | `None` | Google Identity Services | Google OAuth 2.0 Web Client ID, Secret | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Google OpenID token verifier |
| **ADDON-131** | LinkedIn Sign-in (OAuth) | Security / SSO | **No** | `None` | LinkedIn OpenID Connect | LinkedIn App Client ID, Client Secret | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires LinkedIn OAuth callback handler |
| **ADDON-132** | Slack Sign-in (OAuth) | Security / SSO | **No** | `None` | Sign in with Slack (OpenID) | Slack App Client ID, Client Secret | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Slack OAuth callback handler |
| **ADDON-133** | Microsoft Sign-in (OAuth) | Security / SSO | **No** | `None` | Microsoft Entra ID (Azure AD) | Azure AD Application (Client) ID, Secret, Tenant ID | No | **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY`** | Unimplemented; requires Microsoft MSAL/OAuth handler |

---

## 4. Architectural Recommendations for Milestone 7.1 & Beyond

1. **Section 1: Live Credential Unlocking (Priority for BLOCKED_EXTERNAL):**
   - The 10 `BLOCKED_EXTERNAL` items already possess backend routes, services, or adapters in `server/src/`.
   - Providing sandbox credentials (e.g., Meta WhatsApp Cloud API test token, Twilio sandbox SID/token, WooCommerce store test consumer key/secret, Cloudflare Turnstile site key) will immediately unblock end-to-end integration testing and promote them to `VERIFIED`.
2. **Section 2: Staged Adapter Implementation (For NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY):**
   - Do not request credentials for the 47 `NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY` items until their underlying adapters are designed and implemented in subsequent milestone cycles.
   - Recommended engineering priority: Focus on internal statutory features (Section A of Remaining Work) before authoring third-party adapters.
