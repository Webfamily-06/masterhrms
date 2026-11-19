# 14 — Google Analytics Integration & OAuth Flow Architecture

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering  
**Classification:** OBSERVED (WorkDo Dash) / ARCHITECTURAL SPECIFICATION (MASTERHRMS)  
**Date:** November 19, 2026  
**Status:** COMPLETE

---

## 1. Executive Summary

The Google Analytics integration allows Super Admins and Tenant Admins to monitor real-time web traffic, user demographics, session duration, and conversion events directly within the platform's Smart Dashboard, without requiring users to navigate to the external Google Analytics 4 (GA4) console.

In WorkDo Dash, Google Analytics is supported through the `GoogleAnalytics` add-on package with dedicated permissions:
- `manage-google-analytics`
- `view-google-analytics`
- `view-google-analytics-overview`
- `view-google-analytics-audiences`
- `view-google-analytics-landing-page`
- `view-google-analytics-user-acquisition`

---

## 2. End-to-End OAuth 2.0 Authorization Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Super Admin / Tenant Admin
    participant UI as Analytics Settings Page
    participant Server as Express Backend
    participant GoogleAuth as Google Identity OAuth 2.0
    participant GoogleAPI as Google Analytics Data API v1beta
    participant DB as PostgreSQL (Prisma)
    participant Dashboard as Smart Dashboard Widget

    Admin->>UI: Enter Client ID, Client Secret, and GA4 Property ID
    Admin->>UI: Click "Connect Google Analytics"
    UI->>Server: POST /api/integrations/google-analytics/authorize
    Server->>Server: Generate high-entropy state token & cache in memory
    Server-->>UI: Return Google OAuth URL with scopes
    
    UI->>GoogleAuth: Redirect to accounts.google.com
    Note over Admin,GoogleAuth: Admin reviews consent screen & grants Read-only Analytics scopes
    GoogleAuth-->>UI: Redirect to callback URL with auth code & state
    
    UI->>Server: GET /api/integrations/google-analytics/callback?code=...&state=...
    Server->>Server: Validate state token (prevent CSRF)
    Server->>GoogleAuth: POST oauth2.googleapis.com/token (code exchange)
    GoogleAuth-->>Server: Return { access_token, refresh_token, expires_in }
    
    rect rgb(240, 248, 255)
        Note over Server,DB: Secure Storage
        Server->>DB: Encrypt tokens via AES-256-GCM
        Server->>DB: Save to TenantAddon.config (addonSlug: "google-analytics")
    end
    Server-->>UI: Redirect to /settings/integrations?status=connected

    Note over Dashboard,GoogleAPI: Periodic / On-Demand Metric Hydration
    Dashboard->>Server: GET /api/analytics/overview
    Server->>DB: Fetch encrypted tokens & GA4 Property ID
    alt Access Token Expired
        Server->>GoogleAuth: Refresh token exchange
        GoogleAuth-->>Server: Fresh access_token
    end
    Server->>GoogleAPI: POST analyticsdata.googleapis.com/v1beta/properties/{id}:runReport
    GoogleAPI-->>Server: Metric report (activeUsers, sessions, bounceRate, pageViews)
    Server-->>Dashboard: Return cached JSON dataset
```

---

## 3. Configuration Fields & Required Scopes

### 3.1 OAuth Configuration Parameters
- **Google Cloud Console Project:** Must have the `Google Analytics Data API` enabled.
- **Client ID:** Google OAuth Web Application Client ID (`*.apps.googleusercontent.com`).
- **Client Secret:** Secret associated with the Client ID.
- **Redirect URI:** `https://{domain}/api/integrations/google-analytics/callback`.
- **Property ID:** 9-digit GA4 numeric identifier (e.g. `312456789`).

### 3.2 Required OAuth Scopes
- `https://www.googleapis.com/auth/analytics.readonly` (Inspect GA4 property data and reports)

---

## 4. Data Synchronization & Dashboard Widget Architecture

### 4.1 Ingestion & Cache Strategy
Querying the Google Analytics Data API on every dashboard visit triggers API quota exhaustion and slow response times. MASTERHRMS implements a two-tier caching pattern:
1. **Short-lived In-Memory Cache (5 minutes):** Active real-time user counts (`runRealtimeReport`).
2. **Scheduled Sync Worker (Hourly):** Aggregates daily sessions, page views, and top traffic sources, persisting historical metrics into an `analytics_snapshots` table.

### 4.2 Error Handling & Re-Authentication
- **Revoked Consent / Invalid Refresh Token:** If Google returns `invalid_grant`, the backend marks the integration status as `DISCONNECTED` and alerts the administrator via an in-app banner to re-authorize.
- **Quota Exceeded (RESOURCE_EXHAUSTED):** The server falls back gracefully to the most recent cached snapshot without failing the dashboard render.
