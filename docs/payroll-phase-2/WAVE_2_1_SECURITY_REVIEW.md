# ADVANCED PAYROLL MODULE — PHASE 2, WAVE 2.1
## WAVE 2.1 SECURITY AUDIT & THREAT VECTOR REVIEW

**Document Reference:** `DOC-P2-020`  
**Execution Wave:** Wave 2.1 Only  
**Assessment Date:** October 2026  
**Auditor:** Application Security Engineer & Principal Architect  
**Scope:** Document Storage, Receipt Hashing, OCR Engine, Streaming Endpoints, and Multi-Tenant Isolation  

---

### 1. THREAT MODEL & MITIGATION MATRIX

| Threat Vector | Severity | Attack Mechanism | Implemented Mitigation & Verification Evidence |
| :--- | :--- | :--- | :--- |
| **Path Traversal / LFI** | Critical | Attacker submits storage keys containing `../` to access system files or adjacent tenant folders. | `LocalEncryptedStorageService` sanitizes tenant and entity names with `replace(/[^a-zA-Z0-9_-]/g, '')`, resolves paths against `STORAGE_ROOT_DIR`, and asserts `startsWith(STORAGE_ROOT_DIR)`. Test 3.4 verifies `../../../../etc/passwd` is blocked. |
| **Cross-Tenant Document Access** | Critical | Tenant A user requests `/api/documents/:id/stream` belonging to Tenant B by guessing UUID. | `GET /api/documents/:id/stream` strictly queries `prisma.storedDocument.findFirst({ where: { id, tenantId } })`. The dynamic Prisma proxy autoscopes queries to verified JWT tenant context. Verified in Test 3.4. |
| **MIME / Binary Spoofing** | High | Attacker uploads malicious `.exe` or shell script with `.pdf` extension or fake `Content-Type: application/pdf`. | `FileValidator` verifies actual binary magic bytes (`%PDF`, `\x89PNG`, `\xFF\xD8\xFF`), rejects DOS/PE (`MZ`), ELF, shell shebangs (`#!/`), and cross-checks binary type against file extension. Verified in Tests 1.4, 1.5, 1.6. |
| **Denial of Service (Oversized Payload)** | High | Attacker submits 500MB payload to exhaust server RAM. | Strict 10MB limit enforced in multer disk-backed storage and `FileValidator`. Requests exceeding 10MB are rejected early before loading into heap memory. Verified in Test 1.7. |
| **Plaintext Leakage at Rest** | High | Attacker gains read-only access to disk volume and reads sensitive invoices or vouchers. | Every file is encrypted using AES-256-GCM with a unique 96-bit random IV and 16-byte authentication tag. Files stored on disk contain zero plaintext bytes. Verified in Test 3.2. |
| **Silent File Tampering** | High | An administrator or external process alters disk contents. | Plaintext SHA-256 integrity hash is stored at upload time. On retrieval, decipher verification ensures authentication tag matches, and SHA-256 is re-verified (`crypto.timingSafeEqual`). Verified in Test 2. |
| **Cross-Site Scripting (XSS) via SVG/HTML in PDF** | Medium | Malicious PDF or SVG with embedded JavaScript executed in browser during preview. | Streaming route enforces strict HTTP security headers: `Content-Security-Policy: default-src 'none'`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`. Verified in Test 6. |
| **Data Leakage via Cloud OCR** | High | Receipt sent to third-party cloud API (Google Vision/AWS Textract), leaking PII or corporate spend. | Strictly self-hosted Tesseract.js running locally via WebAssembly and local Node worker. Zero HTTP requests made to external services. Verified in Architecture and Test 4. |

---

### 2. MULTI-TENANT ISOLATION ARCHITECTURE

1. **Storage Partitioning:**
   - Physical directory structure: `storage/tenants/<tenant_id>/<entity_type>/<random_uuid>.<ext>.enc`
   - Linux POSIX file modes: `0700` for directories, `0600` for encrypted files.
2. **Database Isolation:**
   - `StoredDocument` model includes `tenantId` foreign key referencing `Tenant(id)`.
   - `StoredDocument` is registered in `DIRECT_TENANT_MODELS` in `server/src/config/tenant-models.config.ts`.
   - The Dynamic Prisma Proxy Facade intercepts all queries to `StoredDocument`, preventing any cross-tenant data leakage.
3. **API Level Isolation:**
   - `req.user.tenantId` is extracted from verified JWT tokens and cannot be overridden by client request bodies or query parameters.

---

### 3. AUDIT CONCLUSION

The Wave 2.1 implementation satisfies all enterprise application security standards. Document storage is encrypted at rest, multi-tenant boundaries are strictly enforced at physical, database, and API layers, and OCR is self-hosted with human-in-the-loop review.
