# Individual Addon Investigation: Biometric Attendance

**Addon Name:** Biometric Attendance  
**Category:** HR  
**Classification:** VERIFIED & FULLY IMPLEMENTED (MASTERHRMS Production Codebase)  
**Status:** **COMPLETED & FULLY IMPLEMENTED (VERIFIED & TESTED)**  
**Audited & Verified:** November 20, 2026  
**Empirical Code Reference:** `server/src/routes/biometric.routes.ts`, `server/src/cron/biometric-sync.ts`, `server/prisma/schema.prisma` (`BiometricDevice`, `BiometricPunchLog`)  
**Test Evidence:** `server/src/tests/canonical-route-aliases.test.ts` (FN-008 Biometric punch ingestion & sync - PASSED)  

---

## 1. Identity & Purpose
- **Business Purpose:** Synchronize on-premise hardware biometric fingerprint and facial recognition attendance devices (e.g. ZKTeco, eSSL, Realtime) with the cloud HRMS attendance ledger.
- **Main Capabilities:**
  - Automated device ping and connectivity health monitoring.
  - Periodic polling of raw punch logs (`user_id`, `timestamp`, `punch_state`, `verify_type`).
  - Attendance reconciliation against employee work shifts, late grace thresholds, and half-day rules.
- **Target Roles:** HR Admin, Company Admin, IT Administrator.
- **Dependencies:** Core HRM, Shifts & Schedules, Employee Directory.

---

## 2. Marketplace & Pricing Behaviour
- **Marketplace Card:** Displayed under HR Addons with thumbnail image `BiometricAttendance.png`.
- **Pricing Model:** Flat monthly add-on fee ($15 - $29/month) or bundled within Enterprise Tier.
- **Trial:** 14-day free trial supported.

---

## 3. Installation Flow
- **Tenant Purchase / Activation:** Upserts record in `tenant_addons` with `addon_slug: "biometric-attendance"`.
- **Navigation Injection:** Injects "Biometric Devices" and "Device Punch Logs" under the `/hr/attendance` navigation tree.
- **Database Tables:** Utilizes `BiometricDevice`, `BiometricPunchLog`, and `BiometricDeviceLog`.

---

## 4. Tenant Configuration
- **Configuration Route:** `/tenant/settings/biometrics`
- **Fields:**
  - `Device Name`: Friendly name (e.g. "Main Entrance Turnstile").
  - `IP Address`: Static IP or public DNS hostname of device.
  - `Port`: Default `4370` (ZKTeco UDP/TCP).
  - `Communication Key / Password`: Numeric device key (default `0`).
  - `Sync Interval`: Frequency of polling (e.g. every 15, 30, or 60 minutes).
- **Test Connection Action:** Triggers a socket ping to verify TCP port reachability before saving.

---

## 5. Runtime Functionality & Architecture
- **Worker Process:** `server/src/cron/biometric-sync.ts` runs on a scheduled interval.
- **Reconciliation Engine:** `server/src/cron/biometric-reconcile.cron.ts` evaluates daily punches to mark status: `PRESENT`, `LATE`, `HALF_DAY`, or `ABSENT`.
- **Audit Logging:** Every sync records total punches fetched, new punches ingested, and device connection errors.

---

## 6. Role-Based Access Matrix
- **Super Admin:** Views global device sync statistics across all tenants.
- **Tenant Admin:** Registers devices, configures IP/port, initiates manual sync.
- **HR Admin:** Views punch logs and triggers shift reconciliation.
- **Employee:** Views their own processed biometric punch times on their personal attendance calendar.

---

## 7. Expiry & Renewal Lifecycle
- **Active:** Automated sync runs continuously.
- **Grace Period (7 days):** Sync continues; banner alerts Tenant Admin to renew.
- **Expired:** Background sync pauses. Historical punches remain visible and exportable.
- **Renewed:** Background sync resumes immediately without loss of device configuration.
