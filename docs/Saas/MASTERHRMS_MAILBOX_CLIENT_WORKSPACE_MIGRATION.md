# MASTERHRMS — Email Mailbox Client Workspace Migration Report

## Executive Summary

This report documents the migration and verification of **Gap 2: Email Mailbox Client** from the Jampack Classic reference application (`classic/src/views/Email/`) into the authoritative MASTERHRMS workspace under `src/` and `CMS/src/`.

The Email Mailbox Client provides a native workspace email interface for reading, searching, composing, replying to, and dispatching messages through the user's personal configured IMAP/POP3 and SMTP accounts. It explicitly enforces separation from the Super Admin transactional mail system (`mail.masterhrms.com`), stores local offline drafts safely in localStorage, and truthfully reports connection failures when remote servers are unreachable rather than simulating fake delivery.

---

## 1. Actual Files Changed & Created

| Component / Layer | File Path | Purpose / Description |
|---|---|---|
| **Frontend Core Component** | `src/components/email/mailbox-client.tsx` | Full mailbox client interface featuring multi-account selector dropdown, folder navigation (`INBOX`, `Sent`, `Drafts`, `Trash`, `Spam`), message preview list with search and unread badges, full message reader pane with action toolbar (Reply, Forward, Delete), compose dialog with rich fields, and local drafts manager. |
| **Frontend TanStack Route (Apps)** | `src/routes/_authenticated/_app/apps.email.tsx` | Dedicated canonical route for `/apps/email`. |
| **Frontend TanStack Route (Direct)** | `src/routes/_authenticated/_app/email.tsx` | Direct route for `/email`. |
| **Frontend CMS Component** | `CMS/src/components/email/mailbox-client.tsx` | Client-hydrated Next.js component parity. |
| **Frontend CMS Route (Apps)** | `CMS/src/app/(workspace)/apps/email/page.tsx` | Next.js App Router workspace page for `/apps/email`. |
| **Frontend CMS Route (Direct)** | `CMS/src/app/(workspace)/email/page.tsx` | Next.js App Router workspace page for `/email`. |
| **Navigation Manifest (HR)** | `src/nav/hr-sidebar.ts` & `CMS/src/nav/hr-sidebar.ts` | Added to `01. Overview -> Email Mailbox` and `05. Communications -> Email -> Mailbox` (`/apps/email`). |
| **Navigation Manifest (Employee)** | `src/nav/employee-sidebar.ts` & `CMS/src/nav/employee-sidebar.ts` | Added to `01. Overview & Profile -> Email Mailbox` (`/apps/email`). |
| **Sidebar Navigation UI** | `CMS/src/components/dreams-sidebar.tsx` | Added Email Mailbox link to `Applications` navigation. |
| **Backend Mailbox Router** | `server/src/routes/user-email-accounts.routes.ts` | Routes: `GET /:id/messages`, `GET /:id/messages/:uid`, `POST /:id/send`. |
| **Backend Mail Service** | `server/src/services/email/user-mail-client.service.ts` | Protocol drivers for IMAP sync, POP3 retrieval, and SMTP transmission. |
| **Verification Suite** | `scratch/verify_three_gaps.cjs` | Automated endpoint validation for message retrieval, dispatch, and reachability. |

---

## 2. Canonical Routes and Legacy Aliases

| Route | Environment | Type | Status | Description |
|---|---|---|---|---|
| `/apps/email` | TanStack (5173) & Next.js (3000) | Canonical Route | **PASS** | Primary mailbox route matching Classic reference convention. |
| `/email` | TanStack (5173) & Next.js (3000) | Canonical Alias | **PASS** | Direct shortcut route to the mailbox client. |
| `/apps/email/inbox` | Workspace | Alias | **PASS** | Folder deep-link alias mapped to `/apps/email?folder=INBOX`. |

---

## 3. Supported Mailbox Workflows & Protocols

### 1. Account Selection
- Dropdown selector at top-right of the client displays all active personal accounts for the logged-in user.
- Switching accounts refetches folder list and messages dynamically.
- If no accounts are configured, displays actionable empty state linking to `/settings/email-accounts`.

### 2. Inbound Folder Navigation & Message Reading
- Supported folders: `INBOX`, `Sent`, `Drafts`, `Trash`, `Spam`.
- Protocol support:
  - **IMAP**: Full bidirectional synchronization using `imapflow` for folder inspection, message flags (`\Seen`), UID retrieval, and envelope parsing.
  - **POP3**: Message retrieval support via `poplib`. POP3 is accurately represented as a simple retrieval protocol without folder synchronization.
- Detail Pane:
  - Displays sender, recipient list, date/time, subject, plain text and sanitized HTML body.
  - Quick action buttons: **Reply** (prefills recipient and `Re: ` subject), **Forward** (prefills `Fwd: ` subject and quoted body), and **Delete**.

### 3. Compose & Outbound SMTP Dispatch
- Modal compose dialog with `To`, `Cc`, `Bcc`, `Subject`, and message body.
- Real outbound submission calls `POST /api/user/email-accounts/:id/send`.
- The backend decrypts the user's stored SMTP password and connects directly to the user's SMTP host.
- Never falls back to Super Admin transactional mail (`mail.masterhrms.com`).

### 4. Drafts Management
- Composed drafts can be saved locally to `localStorage` (`hrms_local_mail_drafts`) for immediate offline availability.
- Drafts are clearly indicated as *Locally Saved Drafts* rather than claiming IMAP server-synced state until the remote server acknowledges.

---

## 4. System Email Separation & Truthful Error Handling

- **Super Admin Mail Isolation:**
  `mail.masterhrms.com` is strictly reserved for platform transactional emails (e.g., tenant invitations, password resets, verification codes).
  The Mailbox Client never connects to or queries `mail.masterhrms.com` for employee emails.
- **Truthful Error Handling:**
  If the remote host is unreachable or authentication fails:
  - The API returns HTTP `502 Bad Gateway` with descriptive details (e.g., `Failed to connect to IMAP server`, `ETIMEDOUT`, `EAUTH`).
  - The client displays an actionable error banner rather than displaying fake mock emails or reporting false delivery.

---

## 5. Automated Verification Results

Test execution from `scratch/verify_three_gaps.cjs`:

```
--- 2. Gap 2: Email Mailbox Client ---
[PASS] GET /messages handles provider reachability truthfully (502 Bad Gateway on unreachable remote host)
[PASS] POST /send routes to personal user account SMTP (returns truthful 502 on unreachable mock host without fake system email fallback)
[BLOCKED] Live Mailbox IMAP Sync & Real Remote SMTP Dispatch - Requires live external IMAP/SMTP mail server credentials in local sandbox
[PASS] DELETE /api/user/email-accounts/:id successfully cleans up test record
```

---

## 6. Playwright Screenshots

- **Mailbox Client View:** `docs/Saas/screenshots/migration-audit/migrated_email_mailbox_client.png`

---

## 7. Status Classification

| Workflow | Classification | Evidence |
|---|---|---|
| Route `/apps/email` Loading | **PASS** | HTTP 200, Playwright screenshot verified |
| Route `/email` Loading | **PASS** | HTTP 200, Playwright screenshot verified |
| Account Switcher Dropdown | **PASS** | Renders configured accounts; reactive query invalidation |
| Empty State (No Accounts) | **PASS** | Verified with direct link to `/settings/email-accounts` |
| Local Draft Persistence | **PASS** | Stored and restored from `localStorage` |
| Compose & Reply/Forward Actions | **PASS** | Dialog opens with prefilled quoted headers |
| Personal SMTP Route Isolation | **PASS** | Dispatches to `POST /api/user/email-accounts/:id/send` |
| System Email Non-Fallback | **PASS** | Verified that system mailer is never invoked for user mail |
| Live External IMAP/SMTP Network Delivery | **BLOCKED** | External network timeouts to mock hosts (requires live third-party mail server credentials) |
