# Wave 2.1 Pre-Implementation Audit Report
## Advanced Payroll Module: Foundation Extensions & Secure Document Subsystem

**Document ID**: `DOC-P2-W21-AUDIT`  
**Classification**: Pre-Implementation Audit  
**Status**: COMPLETED & VERIFIED  
**Date**: October 1, 2026  
**Auditor**: Principal Software Architect & Application Security Engineer  

---

## 1. Executive Summary

This pre-implementation audit establishes the technical baseline and change boundaries for **Wave 2.1: Foundation Extensions & Secure Document Subsystem**.

All checks confirm:
1. Workspace root is verified at `C:\Users\TSV Global Solutions\Documents\hrms`.
2. Existing Phase 1 payroll engine, batch calculations, and formula DAG remain fully intact (67/67 tests passing).
3. The Laravel source repository (`c:\Users\TSV Global Solutions\Documents\hrms\hrms-flow`) remains untouched.
4. Product Owner decisions are enforced:
   - **PO-DEC-01 (Storage)**: Local encrypted disk storage with a pluggable adapter architecture for future S3 migration.
   - **PO-DEC-02 (OCR)**: Self-hosted Tesseract OCR (local execution, advisory only, zero external cloud transmission).
5. Wave 2.1 scope is strictly isolated: no FBP models, no bank payout formats, no biometric adapters, and no statutory returns will be modified.

---

## 2. Existing Models & Routes Audit

### 2.1 Reusable Database Models
- `ExpenseCategory` ([schema.prisma](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma) line 1290): Active with `code`, `monthlyLimit`, `requiresReceipt`, `icon`.
- `ExpenseClaim` ([schema.prisma](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma) line 1308): Active with `employeeId`, `categoryId`, `amount`, `status`, `reimbursementMethod`, `payrollMonth`.
- `PayrollAuditTrail` ([schema.prisma](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma)): Reusable for auditing receipt uploads, hash integrity checks, and OCR processing events.

### 2.2 Reusable REST Routes & Middleware
- [middleware/auth.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/middleware/auth.ts): `requireAuth` extracts verified `req.user.tenantId`, `userId`, and `role`.
- [routes/expenses.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/expenses.routes.ts): Contains existing expense category and claim CRUD routes. Will be augmented with secure receipt upload and advisory OCR trigger.
- [routes/documents.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/documents.routes.ts): Will host the authenticated document streaming route `GET /api/documents/:id/stream`.

### 2.3 Existing OCR Utilities
- [routes/ai.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/ai.routes.ts) currently contains a procurement invoice OCR stub using regex heuristics. Wave 2.1 will introduce a real self-hosted Tesseract adapter in `server/src/services/ocr/` specifically designed for receipt parsing without altering the existing procurement endpoint.

---

## 3. Scope of Changes for Wave 2.1

### 3.1 Proposed New Files
1. `server/src/services/storage/storage.types.ts`: Storage adapter interfaces (`IStorageService`, `StorageMetadata`, `ValidationResult`).
2. `server/src/services/storage/local-encrypted-storage.service.ts`: AES-256-GCM local encrypted disk storage with tenant directory partitioning (`/storage/tenants/:tenantId/`).
3. `server/src/services/storage/file-validator.ts`: Binary magic bytes inspector (`%PDF`, `\x89PNG`, `\xFF\xD8\xFF`), 10MB ceiling, and MIME validation.
4. `server/src/services/storage/integrity-hasher.ts`: Streaming SHA-256 integrity hasher.
5. `server/src/services/ocr/ocr.types.ts`: Advisory OCR interfaces (`OcrResult`, `OcrExtractionFields`).
6. `server/src/services/ocr/tesseract-ocr.service.ts`: Self-hosted local Tesseract OCR engine with heuristic merchant, date, amount, and tax parsers.
7. `server/src/tests/wave2-1-storage-ocr.test.ts`: Automated test suite covering storage, encryption, validation, hashing, streaming, tenant isolation, and Phase 1 regression.

### 3.2 Files Requiring Modification
1. `server/prisma/schema.prisma`:
   - Add `StoredDocument` model for centralized encrypted document tracking.
   - Add optional receipt metadata fields on `ExpenseClaim`: `receiptHash`, `receiptPath`, `receiptMime`, `receiptSize`, `ocrExtracted`, `ocrConfidence`, `ocrStatus`, `isDuplicateWarning`.
2. `server/src/routes/expenses.routes.ts`:
   - Add `POST /api/expenses/claims/upload-receipt`: Multipart upload with magic byte check, AES-256 encryption, and SHA-256 hashing.
   - Add `POST /api/expenses/claims/:id/ocr-process`: Trigger advisory OCR on stored receipt.
3. `server/src/routes/documents.routes.ts`:
   - Add `GET /api/documents/:id/stream`: Authenticated, tenant-isolated binary streaming route with `Content-Security-Policy: default-src 'none'`, `X-Content-Type-Options: nosniff`.
4. `src/routes/_authenticated/_app/expenses.tsx`:
   - Augment claim filing modal with drag-and-drop receipt upload dropzone, advisory OCR scan button, and pre-filled verification card.

---

## 4. Potential Breaking Changes & Safeguards

| Component | Potential Risk | Architectural Safeguard |
| :--- | :--- | :--- |
| **Prisma Migration** | Accidental table drops or data loss. | Non-destructive migration only: All added fields on `ExpenseClaim` are optional (`?`). `StoredDocument` is a new table. Zero existing tables or columns modified. |
| **Disk Encryption Key**| Hardcoded key or lost key rendering receipts unreadable. | Key derived securely from `STORAGE_ENCRYPTION_KEY` env var (or fallback to SHA-256 of `JWT_SECRET`). Key is never stored alongside files. |
| **OCR Event Loop Block**| Long OCR parsing freezing Express HTTP server. | Tesseract processing runs asynchronously via WebWorker/Wasm pool or child worker. |
| **Path Traversal / SSRF**| Malicious filenames (`../../etc/passwd`). | Original filename is discarded; files are saved with cryptographic UUIDs in tenant-isolated folders. |

---

## 5. Baseline Test & Build Verification Prior to Changes

- **Backend TypeCheck**: `npx tsc --noEmit` in `server` -> **0 errors**.
- **Frontend Production Build**: `npm run build` in root -> **0 errors** (bundled in 6.54s).
- **Phase 1 Unit & Golden Suite**: `npx ts-node src/tests/phase1-payroll.test.ts` -> **67 passed, 0 failed**.
- **Git Working Tree**: Verified clean working baseline for modified modules.
