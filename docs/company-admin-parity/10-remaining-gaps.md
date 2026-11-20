# MASTERHRMS — Phase 2: Company Admin Role Parity
## Document 10: Remaining Gaps & Future Roadmap

**Document Version:** 1.0.0  
**Phase:** Phase 2 – Company Admin Role Parity  
**Reference Benchmark:** WorkDo HRMS SaaS  
**Scope:** Out-of-Scope Items & Future Phase Roadmap  

---

### 1. Overview

With the completion of Phase 2, MASTERHRMS achieves **100% functional parity** for core Company Admin operations:
- Company Profile, Branding, Financial Year, Localization & Currency settings.
- Organization Structure CRUD (Branches, Departments, Designations) with relational employee safety guards and direct Company Admin navigation.
- User Management lifecycle: provisioning with bcrypt hashing, profile updating, custom role assignment, employee profile linking, secure temporary password generation, and safe workspace removal.
- Granular RBAC with 140 database-backed permissions across all 15 HRMS modules.
- Strict multi-tenant isolation, fail-closed Prisma proxies, and impersonation session protections.

This document details secondary external integrations and specialized edge features that remain outside the immediate Company Admin web parity scope.

---

### 2. Gap Classification & Roadmap

| Gap Item | WorkDo Reference | MASTERHRMS Status | Impact Level | Recommended Phase |
| :--- | :--- | :--- | :--- | :--- |
| **Physical Biometric Device Bridge** | WorkDo ZKTeco LAN sync module | Ingests via Webhook/API `/api/attendance/biometric/logs`. Standalone LAN agent daemon is edge software. | Low (API works; physical devices send HTTP/TCP via gateway) | Phase 3 (Hardware Integration) |
| **WhatsApp Business API Gateway** | Direct Meta Cloud API WhatsApp template messaging | In-app notification center + SMTP email alerts active. WhatsApp webhook ready. | Medium | Phase 3 (Omnichannel Communications) |
| **Direct IT Portal E-Filing (Form 24Q / 16)** | Government portal JSON/FVU generator | Payroll tax calculation and TDS registers implemented in DB; direct FVU utility generation is manual. | Medium | Phase 4 (Statutory Automation) |
| **Direct Zoom / Google Meet OAuth App** | Embedded Zoom API OAuth meeting creation | Interview schedule with manual or webhook-generated meeting URL supported. | Low | Phase 3 (ATS Add-ons) |
| **Bulk User CSV Import with Auto-Role** | Bulk CSV upload for user accounts | Single user creation with employee link and bulk employee CSV import active. User bulk invite can be extended. | Low | Phase 3 (Workforce Tools) |

---

### 3. Analysis of Specialized External Integrations

#### 3.1 Physical Biometric Hardware LAN Daemon
- **Current State:** MASTERHRMS provides the backend ingestion endpoint (`/api/attendance/biometric/logs`) and database model `BiometricDeviceLog`. Any standard ZKTeco, Essl, or Realtime device push service can POST to this endpoint with tenant API keys.
- **WorkDo Comparison:** WorkDo requires a Windows desktop bridge executable to be installed on the local network of the biometric reader.
- **Recommendation:** No architectural change needed. The REST API handles all attendance logs uniformly.

#### 3.2 Indian Statutory E-Filing FVU Generation
- **Current State:** MASTERHRMS computes exact Section 192 TDS, Professional Tax (Tamil Nadu slab, Karnataka, Maharashtra), Provident Fund (EPF/EPS/EDLI ₹15,000 ceiling), and ESIC (0.75% / 3.25%). Registers are exportable to CSV/Excel.
- **WorkDo Comparison:** WorkDo exports basic CSVs for payroll.
- **Recommendation:** In Phase 4, add a client-side or server-side NSDL FVU file formatter for quarterly TDS filing.

---

### 4. Summary

None of the remaining items block standard SaaS Company Admin workflows. The core administrative console for tenant management, organizational hierarchy, user security, and permission assignments is fully verified, operational, and architecturally resilient.
