# Missing, Incomplete & Disconnected Functionality Forensic Ledger

## 1. Classification Standards
In accordance with Constitutional Rule #3:
* **WORKING**: UI + API + Database + Workflow are all verified from actual source code.
* **PARTIAL**: UI and API exist, but a secondary step (e.g. background job, third-party webhook, external hardware fallback) requires configuration or runtime testing.
* **MISSING**: Feature is referenced or planned, but has zero backend route or database table.
* **BROKEN**: Code throws runtime errors or violates tenant isolation constraints.

---

## 2. Verified Incomplete & Partially Implemented Features

| Feature / Flow | Location | Observed Behavior in Code | Root Cause / Gap | Action Required for Phase 2 | Status |
| :--- | :--- | :--- | :--- | :--- | :-: |
| **Outbound WhatsApp Gateway** | `server/src/routes/alerts.routes.ts:310` | Inbound webhooks process correctly, but outbound messaging falls back to terminal log if Meta Cloud API token is omitted. | Tenant settings must store valid Meta WhatsApp Business Cloud API Access Token. | Add tenant WhatsApp token validation modal. | PARTIAL |
| **QZ-Tray Auto-Reconnect** | `src/routes/_authenticated/_app/pos.tsx:420` | Connects to `ws://localhost:8182` for ESC/POS printing. If QZ-Tray desktop app is not running, falls back to browser standard `window.print()`. | Requires local client machine to have QZ-Tray daemon running for raw thermal printing. | Provide downloadable pre-configured QZ-Tray certificate bundle. | PARTIAL |
| **Google Drive Bi-directional Sync** | `src/routes/_authenticated/_app/google-workspace.tsx` | File catalog reads from `GoogleFile` database table. Direct sync requires valid Google OAuth 2.0 Client ID. | Tenant must configure Google Workspace OAuth credentials in Settings. | Connect OAuth consent callback handler. | PARTIAL |
| **Tally Prime ODBC Bridge** | `src/routes/_authenticated/_app/accounting.tsx` | Client-side XML import parser maps Tally vouchers to Master ERP journals. Automated real-time background ODBC listener is planned. | Real-time 2-way sync requires desktop Windows agent daemon. | Package local Windows C# service for Tally ODBC streaming. | PARTIAL |
| **ZKTeco Direct Cloud Listen** | `server/src/services/zk-protocol.ts` | Devices on the same LAN sync via UDP/TCP port 4370. Devices behind NAT/CGNAT firewalls require Local Sync Daemon. | Biometric machines behind private office routers cannot be reached directly by cloud servers. | Distribute the lightweight Node.js/Python local sync bridge script. | PARTIAL |

---

## 3. Disconnected UI Elements Audit
1. **Chat Custom Reaction Picker**: In `src/routes/_authenticated/_app/chat.tsx`, the emoji array was cleanly removed per your specification; standard text reactions (e.g. `like`, `acknowledged`, `resolved`) remain active.
2. **Offline POS Sync Queue**: In `src/routes/_authenticated/_app/pos.tsx`, sales conducted in offline mode are correctly serialized into `localStorage("pos_offline_sales")` and synced via `POST /api/pos/checkout` upon network reconnection.
