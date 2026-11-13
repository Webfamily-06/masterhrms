# MASTERHRMS — PHASE 3.2
# Security, RBAC & Tenant Isolation Report

**Milestone:** Phase 3.2 — Document Expiry & Compliance Automation  
**Authoritative Reference:** Role-Based Access Controls, Permission Matrix, Tenant Boundary Enforcements, and Audit Trail Guarantees  

---

## 1. Access Control & Permission Architecture

Document compliance and expiration management involves sensitive employee identification, passports, contracts, and statutory certificates. The system strictly enforces the principle of least privilege across all API endpoints and user interfaces.

### 1.1 RBAC Permission Matrix

| Endpoint | Method | Required Roles / Permissions | Description |
| :--- | :--- | :--- | :--- |
| `/api/documents/compliance/summary` | `GET` | `super_admin`, `tenant_admin`, `admin`, `hr_admin`, `hr` | Tenant and departmental compliance aggregation |
| `/api/documents/compliance/expiring` | `GET` | `super_admin`, `tenant_admin`, `admin`, `hr_admin`, `hr` | Expiring and non-compliant credential queue |
| `/api/documents/compliance/employee/:id` | `GET` | HR Admin OR Document Owner (`employeeId === me.id`) | Specific employee compliance checklist |
| `/api/documents/:id/verify` | `POST` / `PUT` | `hr:documents:verify` OR `super_admin`, `tenant_admin`, `admin`, `hr_admin` | Certify document validity (Employees strictly forbidden) |
| `/api/documents/:id/reject` | `POST` | `hr:documents:verify` OR `super_admin`, `tenant_admin`, `admin`, `hr_admin` | Reject document verification with mandatory reason |
| `/api/documents/:id/renew` | `POST` | HR Admin OR Document Owner (`employeeId === me.id`) | Submit replacement credential for expiring/expired doc |
| `/api/v1/me/documents/compliance` | `GET` | Authenticated Employee (Own scope only) | Personal compliance rating and mandatory checklist |
| `/api/v1/me/documents/:id/renew` | `POST` | Authenticated Employee (Own documents only) | Employee self-service document renewal submission |
| `/api/system/cronjobs/run-document-expiry` | `POST` | `super_admin` only | Platform-level cron trigger |

---

## 2. Segregation of Duties & Boundary Protections

### 2.1 Prohibition of Employee Self-Verification
An employee cannot verify or approve their own documents. The verification endpoint inspects the user roles and explicit permissions:
```ts
const isEmployeeOnly = userRoles.length === 1 && userRoles[0] === "employee";
const canVerify =
  userPerms.includes("hr:documents:verify") ||
  userPerms.includes("documents:verify") ||
  userRoles.includes("super_admin") ||
  userRoles.includes("hr_admin") ||
  userRoles.includes("admin");

if (isEmployeeOnly || !canVerify) {
  return res.status(403).json({
    error: "Forbidden: You do not have permission to verify or approve employee documents. Only authorized HR personnel may verify documents.",
  });
}
```
Any attempt by a standard employee to call `POST /api/documents/:id/verify` is blocked with HTTP 403 Forbidden.

### 2.2 Strict Multi-Tenant Isolation
All document operations are scoped to the authenticated tenant context:
1. `CompanyDocument.tenantId === req.user.tenantId`.
2. Cross-tenant lookups (`findUnique`) verify tenant ownership; if a document ID belongs to Tenant B, a user in Tenant A receives HTTP 404 Not Found, preventing cross-tenant existence enumeration.
3. Cron processing evaluates tenants in strict transactional isolation, ensuring tenant notifications never cross workspace boundaries.

### 2.3 Predecessor Document Protection
When renewing a document:
- The existing predecessor document is **never deleted or overwritten**.
- Its status transitions to `superseded`, its original file attachment URL remains intact, and an immutable audit note referencing the successor document code is appended.
- Historic certification metadata (`verifiedBy`, `verifiedAt`) is fully preserved for labor audit and regulatory compliance.

---

## 3. Audit Trail & Compliance Logging

All lifecycle transitions in Phase 3.2 generate structured audit logs through `AuditService.logMutation`:

| Action | Entity Type | Metadata Captured |
| :--- | :--- | :--- |
| `DOCUMENT_VERIFIED` | `CompanyDocument` | `verifierName`, `verifiedAt`, `documentCode`, `employeeId` |
| `DOCUMENT_REJECTED` | `CompanyDocument` | `reviewerName`, `reason`, `documentCode`, `employeeId` |
| `DOCUMENT_RENEWAL_SUBMITTED` | `CompanyDocument` | `predecessorId`, `predecessorCode`, `newDocumentCode`, `employeeId`, `selfService` |
| `DOCUMENT_EXPIRED` | `CompanyDocument` | `expiryDate`, `daysRemaining`, `autoTransitioned: true` |

All mutations record the actor ID, tenant ID, timestamp, and before/after states in the `audit_logs` table for forensic analysis.

