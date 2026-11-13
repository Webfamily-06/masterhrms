# MASTERHRMS — PHASE 3.2
# Daily Scheduler, Idempotency & Notification Reference

**Milestone:** Phase 3.2 — Document Expiry & Compliance Automation  
**Authoritative Reference:** Background Scheduling, Event Idempotency, and Multi-Channel Notification Routing  

---

## 1. Background Scheduler Specification

### 1.1 Job Definition
- **Identifier:** `document_expiry_monitor`
- **Schedule:** Daily at 02:00 AM UTC
- **POSIX Cron Expression:** `0 2 * * *`
- **Execution Engine:** `runDocumentExpiryCron(options?: DocumentExpiryCronOptions)`
- **Platform Registration:** Registered in `SystemCronJob` database table alongside other critical daemons.

### 1.2 Execution Endpoint
- **Route:** `POST /api/system/cronjobs/run-document-expiry`
- **Authorization:** `requireAuth` + `requireSuperAdmin` (or external webhook with configured cron token)
- **Query Parameters:**
  - `tenantId` (optional): If provided, executes isolation check for that specific tenant; if omitted, scans all active tenants across the platform.

### 1.3 Execution Pipeline
```
[Start Cron]
     │
     ▼
Query active non-suspended tenants
     │
     ▼
For each tenant:
  ├── Query company documents with non-null expiryDate
  │   where status NOT IN ('superseded', 'rejected')
  │
  ├── For each document:
  │     ├── Classify document against UTC calendar midnight
  │     │
  │     ├── IF classification.isExpired AND doc.status != 'expired':
  │     │     Update doc.status = 'expired'
  │     │     Increment documentsExpired counter
  │     │
  │     └── IF milestoneStage IN ('30_days', '15_days', '7_days', 'expired'):
  │           Dispatch idempotent notification
  │           Increment notificationsDispatched or alreadyProcessedCount
  │
  └── Collect tenant execution diagnostics
     │
     ▼
Return DocumentExpiryCronResult payload
```

---

## 2. Idempotency Key Architecture & Deduplication

### 2.1 Key Formation Rule
Reminders must never spam employees or HR managers across repeated daily cron evaluations. Deduplication is enforced deterministically:

$$\text{IdempotencyKey} = \text{"doc\_exp\_"} + \text{documentId} + \text{"\_"} + \text{formatDate}(expiryDate) + \text{"\_"} + stage$$

Where:
- `documentId`: UUID of the `CompanyDocument`.
- `formatDate(expiryDate)`: Standard ISO date string formatted as `YYYY-MM-DD`.
- `stage`: Current milestone stage (`"30_days"`, `"15_days"`, `"7_days"`, `"expired"`).

### 2.2 Deduplication Lifecycle Example
Consider document `doc-abc-123` expiring on `2026-12-15`:
1. **At Day 30 (2026-11-15):**
   - Stage is `30_days`.
   - Key: `doc_exp_doc-abc-123_2026-12-15_30_days`.
   - Result: Key does not exist. Notification and outbox event are created.
2. **At Day 29 through 16 (2026-11-16 to 2026-11-29):**
   - No new milestone stage is triggered (or key for `30_days` already exists). Result: Skipped.
3. **At Day 15 (2026-11-30):**
   - Stage is `15_days`.
   - Key: `doc_exp_doc-abc-123_2026-12-15_15_days`.
   - Result: New distinct key; dispatches `15_days` reminder.
4. **At Day 7 (2026-12-08):**
   - Stage is `7_days`.
   - Key: `doc_exp_doc-abc-123_2026-12-15_7_days`.
   - Result: Dispatches urgent alert to employee AND escalates to HR Administrator.
5. **At Day -1 (2026-12-16):**
   - Status updated to `expired`.
   - Key: `doc_exp_doc-abc-123_2026-12-15_expired`.
   - Result: Dispatches expired alert to employee and HR.

---

## 3. Notification Routing & Payload Formats

### 3.1 In-App Notification Record (`Notification` Model)
| Field | Value | Notes |
| :--- | :--- | :--- |
| `tenantId` | Document tenant UUID | Scoped to tenant workspace |
| `userId` | Employee user UUID (or HR user UUID) | Recipient user |
| `title` | E.g. `Document Expiring in 15 Days: Passport` | Milestone-specific subject |
| `body` | Detailed notice including code and date | Actionable guidance |
| `module` | `DOCUMENT_EXPIRY` or `HR_DOCUMENT_EXPIRY_ALERT` | System module category |
| `channel` | `IN_APP` | Standard in-app notification |
| `linkTo` | `/me/documents` (Employee) or `/hr/documents/compliance` (HR) | One-click navigation link |
| `metadataJson` | Includes `idempotencyKey`, `documentId`, `stage` | Used for deduplication lookup |

### 3.2 Transactional Outbox Event (`OutboxEvent` Model)
| Field | Value |
| :--- | :--- |
| `eventType` | `DOCUMENT_EXPIRING_SOON` or `DOCUMENT_EXPIRED` |
| `entityType` | `CompanyDocument` |
| `entityId` | `document.id` |
| `payload` | `{ idempotencyKey, documentId, documentCode, title, employeeId, employeeName, stage, daysRemaining, expiryDate }` |
| `status` | `PENDING` |

External message brokers, webhooks, and SMTP email delivery consumers process records from `OutboxEvent` asynchronously, guaranteeing at-least-once delivery with zero transactional coupling to the cron execution.

