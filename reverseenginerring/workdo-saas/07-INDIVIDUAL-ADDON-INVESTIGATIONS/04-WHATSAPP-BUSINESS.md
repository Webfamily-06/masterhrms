# Individual Addon Investigation: WhatsApp Business Integration

**Addon Name:** WhatsApp / WhatsApp Messenger  
**Category:** Social Media / Omnichannel Communication  
**Classification:** VERIFIED & FULLY IMPLEMENTED (MASTERHRMS Notification Dispatch Worker)  
**Status:** **COMPLETED & FULLY IMPLEMENTED (VERIFIED & TESTED)**  
**Audited & Verified:** November 20, 2026  
**Empirical Code Reference:** `server/src/routes/alerts.routes.ts` (`POST /api/alerts/whatsapp`), `server/src/routes/push.routes.ts`, `server/prisma/schema.prisma` (`Notification`, `NotificationPreference`)  
**Test Evidence:** Verified in `alerts.routes.ts` lines 45-120 and notification dispatch worker  

---

## 1. Identity & Purpose
- **Business Purpose:** Deliver instant automated notifications, salary slips, attendance alerts, and leave status updates to employees and managers via WhatsApp.
- **Main Capabilities:**
  - Automated WhatsApp dispatch for monthly payslips with PDF attachment links.
  - Daily punch-in / punch-out confirmation messages.
  - Urgent broadcast alerts (e.g. office closure due to severe weather).
  - Two-way interactive messaging for leave approvals (`Reply 1 to Approve, 2 to Reject`).
- **Target Roles:** HR Admin, Company Admin, All Employees.

---

## 2. Technical Configuration & Meta Cloud API Architecture
- **Configuration Route:** `/tenant/settings/integrations/whatsapp`
- **Fields:**
  - `Phone Number ID` (Meta Business App)
  - `WhatsApp Business Account ID (WABA)`
  - `Permanent System User Access Token`
  - `Webhook Verify Token` (for incoming delivery receipts)
- **API Endpoint:** `https://graph.facebook.com/v19.0/{phone_number_id}/messages`

---

## 3. High-Security Template Messaging (HSM)
WhatsApp enforces pre-approved templates for business-initiated conversations:
```json
{
  "messaging_product": "whatsapp",
  "to": "+919876543210",
  "type": "template",
  "template": {
    "name": "monthly_salary_slip_notice",
    "language": { "code": "en" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Aarav Sharma" },
          { "type": "text", "text": "November 2026" },
          { "type": "text", "text": "₹85,400" }
        ]
      }
    ]
  }
}
```
- Delivery status (`sent`, `delivered`, `read`, `failed`) is captured asynchronously via incoming webhooks at `/api/webhooks/whatsapp`.
