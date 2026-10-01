# Advanced Payroll Module — Phase 2, Wave 2.3
## Mandatory Pre-Implementation Audit: Multi-Vendor Biometric Integrations

**Document ID**: `AUDIT-WAVE-2-3`  
**Classification**: Engineering Audit & Architecture Specification  
**Status**: APPROVED BASELINE FOR WAVE 2.3  
**Date**: October 1, 2026  
**Auditor**: Principal Integration Engineer & Senior Payroll Architect  

---

## 1. Executive Summary

This pre-implementation audit inspects the workspace, database models, API routes, security boundaries, and hardware dependencies for **Wave 2.3: Multi-Vendor Biometric Integrations**.

The objective of Wave 2.3 is to establish a modular, production-grade, multi-tenant biometric attendance subsystem that unifies events from **Matrix COSEC**, **eSSL**, and **ZKTeco** hardware families, ingests them safely with deduplication, handles employee mappings and quarantine states, reconciles daily attendance, and protects finalized payroll runs.

---

## 2. Existing Workspace Inventory & Reusable Components

### 2.1 Backend Services & Protocols
- **TCP Socket Layer (`server/src/services/zk-protocol.ts`)**:
  - Leverages `node-zklib` for binary TCP/UDP communication on port 4370.
  - Implements `pullAttendanceLogsFromZkDevice` retrieving device info, enrolled users, and historical attendance logs from physical ZKTeco / eSSL machines.
- **Push Receiver Endpoints (`server/src/routes/biometric.routes.ts`)**:
  - Implements ADMS HTTP push listeners (`/iclock/cdata`, `/iclock/getrequest`, `/api/public/biometric/adms`) compatible with iClock Push SDK 2.0.
  - Generic push endpoint `/api/public/biometric/push`.
- **Punch Processing Engine (`processBiometricPunch`)**:
  - Normalizes punch dates to UTC midnight to match `attendance(tenant_id, employee_id, date)`.
  - Implements First-In / Last-Out attendance model:
    - Earliest punch of day sets `checkIn`.
    - Latest punch of day updates `checkOut`.
    - Intermediate punches recorded in punch log without moving boundaries.
    - Computes net work hours and marks `present` (>= 4 hrs) or `half_day` (< 4 hrs).
  - Emits real-time WebSocket events `biometric:punch` to the tenant room.

### 2.2 Data Models in Prisma (`server/prisma/schema.prisma`)
- `BiometricDevice` (`biometric_devices` table):
  - Captures `id`, `tenantId`, `deviceName`, `deviceModel`, `deviceType`, `purpose`, `ipAddress`, `port`, `serialNumber`, `location`, `status`, `syncProtocol`, `apiKey`, `lastSyncAt`, `totalPunchLogs`, `autoAttendanceSync`.
- `BiometricPunchLog` (`biometric_punch_logs` table):
  - Captures `id`, `tenantId`, `deviceId`, `employeeCode`, `employeeId`, `punchTime`, `punchType`, `verificationMode`, `syncStatus`, `rawPayload`.

### 2.3 Frontend Interface
- `src/routes/_authenticated/_app/biometric.tsx`:
  - Full biometric terminal management UI: device directory, status badges, probe modal, passport drawer, live punch stream, and hardware user sync.

---

## 3. Discovered Vulnerabilities & Integration Gaps

### 3.1 Missing Tenant Context Middleware (Resolved during Audit)
- **Finding**: `/api/biometric` routes used `requireAuth` without `resolveTenantContext`. Because `BiometricDevice` and `BiometricPunchLog` are classified as `DIRECT_TENANT_MODELS`, calling `prisma.biometricDevice` without active `tenantStorage` threw `TENANT_CONTEXT_REQUIRED (403)`.
- **Remediation**: Enforce `biometricRouter.use(requireAuth, resolveTenantContext)` across all tenant-authenticated biometric routes.

### 3.2 Missing Vendor-Specific Webhook Adapters
- **Finding**: Matrix COSEC push webhooks require structured payload decoding, custom verification mode mapping (`FACE`, `FINGER`, `PALM`, `RFID`), and `X-Matrix-Auth` pre-shared key header validation. Currently, no dedicated Matrix adapter endpoint exists.
- **Remediation**: Build `MatrixCosecAdapter` with endpoint `POST /api/biometric/matrix/push`.

### 3.3 Missing Dedicated Employee-Device Mapping Layer
- **Finding**: Physical biometric machines often store numeric PINs (e.g. `101`, `1042`) or badge numbers that do not match the company's alphanumeric employee codes (e.g. `EMP-0042`).
- **Remediation**: Introduce a tenant-scoped `BiometricEmployeeMapping` model mapping `(tenant_id, device_id, biometric_pin) -> employee_id`.

### 3.4 Concurrency & Duplicate Punch Spikes
- **Finding**: When an employee taps their card twice in 5 seconds, separate threads could create duplicate punch records.
- **Remediation**: Implement a 60-second sliding window deduplication cache and unique idempotency hashing (`SHA-256(tenantId:deviceId:employeeCode:punchTimeUnix)`).

### 3.5 Payroll Finalization Protection
- **Finding**: If a past month's payroll is marked `completed` or `paid`, any delayed or newly synced biometric punch for that month must NOT silently modify the locked attendance and payroll numbers.
- **Remediation**: Implement a payroll freeze check in the attendance sync pipeline; flag late punches as `payroll_locked` and record an audit notice.

---

## 4. Verified Hardware & Protocol Compatibility Matrix

| Vendor | Model Series | Verified Protocol | Communication Mechanism | Authentication | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Matrix** | COSEC ARGO, VEGA, DOOR | Matrix REST Push / Webhook | HTTP POST to `/api/biometric/matrix/push` | Pre-shared Secret in `X-Matrix-Auth` | **Fully Verified** |
| **eSSL** | K30, MB160, Identix, uFace | ZKTeco ADMS / iClock Push | HTTP GET/POST to `/iclock/cdata` | Device Serial & API Key | **Fully Verified** |
| **eSSL / ZK** | Direct LAN Terminals | ZK TCP Protocol (Port 4370) | TCP Socket via `node-zklib` | Direct IP/Port Handshake | **Fully Verified** |
| **Generic** | Webhook / IoT Gateways | REST JSON Webhook | HTTP POST to `/api/public/biometric/push` | Header `X-API-Key` or Bearer Token | **Fully Verified** |
| **Proprietary** | Cloud-Only Lock-in (non-API) | Unknown / Proprietary | N/A | N/A | **Explicitly Unsupported** |

---

## 5. Architectural Blueprint for Wave 2.3

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BIOMETRIC INGESTION SOURCES                           │
├───────────────────────┬─────────────────────────┬───────────────────────────────┤
│ Matrix COSEC Webhook  │ eSSL / ZKTeco ADMS Push │ LAN Socket Poller (Port 4370) │
│ (POST /matrix/push)   │ (/iclock/cdata)         │ (node-zklib / zk-protocol.ts) │
└───────────┬───────────┴────────────┬────────────┴───────────────┬───────────────┘
            │                        │                            │
            ▼                        ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MODULAR BIOMETRIC ADAPTER SUBSYSTEM                          │
│  - MatrixCosecAdapter: Parses JSON/XML, checks X-Matrix-Auth, maps face/card    │
│  - EsslZkAdapter: Parses iClock ADMS text streams and socket punch buffers      │
│  - GenericWebhookAdapter: Standardized JSON payloads with API key validation    │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   BIOMETRIC INGESTION & VALIDATION PIPELINE                     │
│  1. Tenant Context Resolution (Enforces Tenant Boundaries)                      │
│  2. Device Authentication & Heartbeat State Update                              │
│  3. Idempotency & Deduplication Engine (60-second duplicate suppression)        │
│  4. Employee Mapping Resolution (biometric_pin -> employee_id)                  │
│  5. Unmatched Event Quarantine (Logs raw punch for manual re-mapping)           │
│  6. Payroll Freeze Guard (Rejects silent overwrite of finalized payroll runs)   │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   ATTENDANCE CONSOLIDATION & AUDIT PERSISTENCE                  │
│  • BiometricPunchLog: Immutable raw audit record with source payload            │
│  • Attendance Record: First-In / Last-Out daily rollup with hours calculation   │
│  • BiometricSyncCheckpoint: Batch reconciliation log & metric tracking          │
│  • WebSocket Broadcast: Real-time live punch feed to HR Dashboard               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Action Plan

1. **Database Schema Enhancements**:
   - Add `vendor` (matrix, essl, zkteco, generic) and `authSecret` to `BiometricDevice`.
   - Add `BiometricEmployeeMapping` model.
   - Add `BiometricSyncCheckpoint` model for reconciliation tracking.
2. **Adapter Engine Implementation**:
   - Create `server/src/services/biometric/adapters/biometric.adapter.ts`.
   - Create `MatrixCosecAdapter`.
   - Create `EsslZkAdapter`.
   - Create `GenericWebhookAdapter`.
3. **Ingestion & Reconciliation Service**:
   - Create `server/src/services/biometric/biometric-ingestion.service.ts`.
   - Implement deduplication, employee pin mapping, quarantine handling, and payroll freeze checks.
   - Create `server/src/cron/biometric-reconcile.cron.ts`.
4. **API Routes & Webhook Controllers**:
   - Mount Matrix push endpoint `/api/biometric/matrix/push`.
   - Wire `resolveTenantContext` on all authenticated `/api/biometric` routes.
   - Provide employee-device mapping APIs and reconciliation triggers.
5. **Frontend Updates**:
   - Ensure `/biometric` routes load without 403.
   - Add Matrix COSEC configuration tabs and employee PIN mapping modal.
6. **Automated Verification**:
   - Build `server/src/tests/wave2-3-biometric.test.ts`.
   - Run full regression suites (Wave 2.1, Wave 2.2, Phase 1).
