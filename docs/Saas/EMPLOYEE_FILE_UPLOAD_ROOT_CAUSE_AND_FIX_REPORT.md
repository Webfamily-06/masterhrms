# Master HRMS — Employee File & Profile Photo Upload Fix Report

**Report Identifier:** `docs/Saas/EMPLOYEE_FILE_UPLOAD_ROOT_CAUSE_AND_FIX_REPORT.md`  
**Target Environment:** Master HRMS Multi-Tenant Enterprise Platform  
**Status:** Completed & Empirically Verified  
**Date:** October 17, 2026  

---

## Executive Summary

A critical file upload defect was identified across the Employee Management suite (**Employee Create Wizard**, **Employee Edit Wizard**, and **Employee 360° Documents Vault**). Any attempt to upload an employee profile photo or attachment resulted in a client error:

```text
400 Bad Request: "No file uploaded in 'file' field"
```

A thorough investigation of the end-to-end request lifecycle revealed that the failure occurred because the frontend API client (`src/lib/api.ts`) unconditionally serialized all POST/PUT/PATCH bodies using `JSON.stringify(body)`. In standard browser JavaScript, passing a `FormData` object to `JSON.stringify()` outputs the literal string `"{}"`. Consequently, the HTTP client set `Content-Type: application/json` with an empty JSON object body, stripping all multipart boundary markers, form fields, and binary file chunks before transmission. When the request reached Multer on the backend (`server/src/routes/media.routes.ts`), Multer ignored the non-multipart payload, leaving `req.file` undefined.

The issue has been resolved across both frontend and backend layers with zero breaking changes, strict tenant isolation, role-based access control, file magic-byte validation, and automated regression testing.

---

## 1. Confirmed Root Cause Analysis

### 1.1 The Lost File Problem
In `src/lib/api.ts`:
```ts
// Before (Broken Implementation):
post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
  apiRequest<T>(endpoint, {
    ...options,
    method: "POST",
    body: body ? JSON.stringify(body) : undefined, // ❌ Stringified FormData evaluates to "{}"
  }),
```

In `apiRequest`:
```ts
const defaultHeaders: Record<string, string> = {
  "Content-Type": "application/json", // ❌ Overwrote multipart boundary headers
};
```

When a user submitted `FormData`, the request arrived at the server as:
```http
POST /api/v1/media/upload HTTP/1.1
Content-Type: application/json
Authorization: Bearer <JWT>

{}
```

Multer's `upload.single("file")` middleware only activates when `Content-Type` starts with `multipart/form-data; boundary=...`. Because the request had `Content-Type: application/json`, Multer bypassed the body parsing entirely. The route handler then evaluated `if (!req.file)`, immediately responding with:
```json
{
  "error": "No file uploaded in 'file' field"
}
```

### 1.2 Route Aliasing & Middleware Gaps
- **Route Namespace Discrepancy:** The frontend API client used both `/v1/media/upload` (which prefixes `/api/v1/media/upload`) and `/api/media/upload`. The backend server only mounted the router at `/api/v1/media`, resulting in 404s when unversioned aliases were queried.
- **Magic Bytes Validation Scope:** `MediaService.validateImageBuffer` strictly validated image headers (PNG, JPEG, WebP, GIF, SVG). When employee documents (PDF, DOCX, DOC) were uploaded to the media endpoint, they were rejected as unsupported file types.
- **Upload Security Static Mount Traversal:** Employee avatar headshots embedded in standard `<img>` tags cannot transmit `Authorization: Bearer` headers. `uploadsSecurityMiddleware` previously intercepted all requests not in system branding, causing browser image requests for employee photos to return `401 UPLOAD_AUTH_REQUIRED`.

---

## 2. Architecture & Code Changes

### 2.1 Frontend API Client (`src/lib/api.ts`)
1. **Preserve `FormData`:** Modified `api.post`, `api.put`, and `api.patch` to check `body instanceof FormData`. If the body is `FormData`, it is passed directly without calling `JSON.stringify()`.
2. **Boundary Computation:** In `apiRequest`, if `options.body instanceof FormData`, the default `"Content-Type": "application/json"` header is deleted from the request headers. This allows the browser/fetch runtime to automatically generate the correct `multipart/form-data; boundary=----WebKitFormBoundary...` header with proper chunk boundaries.
3. **Dedicated Upload Helper:** Added `api.upload<T>(endpoint, formData, options)` as a first-class helper for multipart operations.
4. **Resilient Window Navigation:** Added optional chaining to `window.location?.host` and `window.location?.pathname` to prevent runtime crashes in SSR or non-browser execution contexts.

### 2.2 Backend Media Router & Error Handling (`server/src/routes/media.routes.ts` & `server/src/index.ts`)
1. **Multer Error Catching:** Wrapped `uploadSingle` in custom middleware that catches Multer error codes:
   - `LIMIT_FILE_SIZE` returns `400 File exceeds the permitted size limit of 10 MB` with error code `LIMIT_FILE_SIZE`.
   - `LIMIT_UNEXPECTED_FILE` returns `400 Unexpected field: only 'file' is supported`.
2. **Route Aliasing:** Mounted `mediaRouter` under both `/api/v1/media` and `/api/media` in `server/src/index.ts` to guarantee backward compatibility with legacy endpoints.

### 2.3 Magic Bytes Inspection (`server/src/services/media/media.service.ts`)
Expanded `MediaService.validateImageBuffer` to validate binary file signatures for official employee documents:
- **PDF:** `%PDF-` (`25 50 44 46 2D`)
- **DOCX / OpenXML:** `PK\x03\x04` (`50 4B 03 04`)
- **Legacy DOC (OLE2):** `D0 CF 11 E0 A1 B1 1A E1`
- **PNG:** `89 50 4E 47 0D 0A 1A 0A`
- **JPEG:** `FF D8 FF`
- **WebP:** `RIFF....WEBP`
- Rejects executable formats (PE/MZ, ELF), scripts, and unsanitized SVG files containing `<script>` or event attributes.

### 2.4 Uploads Security & Privacy Protection (`server/src/middleware/uploads-security.middleware.ts`)
1. **Public Headshot Serving:** Updated `isPublicUploadPath` to allow employee headshots (`avatars/`, `profiles/`, `Employees/.../Profile/`) to be served directly to standard browser `<img>` elements without requiring custom bearer token headers.
2. **Strict Document Isolation:** Retained zero-trust JWT authentication and database tenant verification for all confidential employee vaults (`documents/employee`, `contracts/`, `payroll/`, `tax/`).
3. **Path Traversal Guard:** Prevents path traversal attempts (`..`, `%2e%2e`) and returns `400 Invalid path`.
4. **Cross-Tenant Guard:** Verifies tenant ownership in `rawPrisma.mediaFile` before serving any protected file. Returns `403 FORBIDDEN_WORKSPACE_ASSET` if a user from Tenant B requests an asset owned by Tenant A.

### 2.5 Employee Atomic Persistence (`server/src/services/employee.service.ts`)
Updated `createEmployeeAtomic` to attach document metadata records directly into `tx.companyDocument`:
- Stores `employeeId`, `tenantId`, `documentCode`, `category`, `fileName`, and `fileUrl`.
- Guarantees document records are committed in the same database transaction as the employee record.

### 2.6 Employee Edit Wizard (`src/routes/_authenticated/hr/employees/$id.edit.tsx`)
1. **Profile Photo Replacement:**
   - Added instant local preview using `URL.createObjectURL(file)`.
   - Enforced client validation (PNG, JPG, WEBP <= 5 MB).
   - Executed authenticated upload via `api.upload("/v1/media/upload", data)`.
   - Updated the employee profile immediately via `api.put("/hr/employees/:id", { avatarUrl })`.
   - Invalidated TanStack query caches (`employee`, `employee-360`, `employees`, `hr-employees`).
   - Added "Remove Photo" action with clean fallback to initials.
2. **Multi-File Document Uploads:**
   - Converted single-file modal into a multi-document uploader.
   - Provided individual per-file progress, sequential uploads, and granular success/failure reporting.
   - Retained un-uploaded form state if any file fails.
3. **Free Step Navigation:** Enabled non-linear step jumping in Edit mode since employee records are already saved.

### 2.7 Employee 360° Profile (`src/routes/_authenticated/hr/employees/$id.tsx`)
1. Added an **Add Document** button to Tab 6 (Documents Vault) header.
2. Built a secure modal allowing HR admins to select an official document category, enter a title, specify an optional expiry date, and upload one or multiple files.
3. Attached documents via `POST /documents` and refreshed the `employee-360` query cache.

### 2.8 Employee Create Wizard (`src/routes/_authenticated/hr/employees/new.tsx`)
1. Added Profile Photo upload card in Step 1 (Personal) with instant local preview, file validation, and photo removal.
2. Replaced the static URL text input in Step 6 (Documents) with a complete multi-file upload vault.
3. Integrated uploaded documents into the draft list and final atomic submission payload.
4. Rendered photo preview and attached documents in Step 8 (Review & Submit).

---

## 3. Upload Contract Specification

### Single-File Upload Endpoint
```http
POST /api/v1/media/upload HTTP/1.1
Authorization: Bearer <JWT>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXYZ

------WebKitFormBoundaryXYZ
Content-Disposition: form-data; name="file"; filename="headshot.png"
Content-Type: image/png

<binary bytes>
------WebKitFormBoundaryXYZ
Content-Disposition: form-data; name="folder"

Employees/EMP-1001/Profile
------WebKitFormBoundaryXYZ--
```

### Response Schema (201 Created)
```json
{
  "id": "e4b6c310-4fa1-463c-a968-3f59e13dfb12",
  "tenantId": "tenant-default-001",
  "fileName": "headshot.png",
  "filePath": "Employees/EMP-1001/Profile/1792217459695-b9bb1b2d.png",
  "url": "/uploads/Employees/EMP-1001/Profile/1792217459695-b9bb1b2d.png",
  "mimeType": "image/png",
  "fileSize": 142050,
  "checksumSha": "3a8b4f...",
  "folder": "Employees/EMP-1001/Profile"
}
```

---

## 4. Verification & Automated Test Evidence

### 4.1 Frontend Test Suite (`src/tests/employee-upload-flow.test.ts`)
Executed with Vitest (`npx vitest run src/tests/employee-upload-flow.test.ts`):
```text
 ✓ src/tests/employee-upload-flow.test.ts (8 tests) 17ms
   ✓ 1. API Client Multipart / FormData Handling (3)
     ✓ preserves FormData body without JSON.stringify in api.post
     ✓ preserves FormData body in api.upload helper
     ✓ keeps Content-Type: application/json for regular JSON api.post requests
   ✓ 2. Client-Side Profile Photo Validation Rules (2)
     ✓ accepts valid images and rejects non-image formats
     ✓ rejects oversized profile images exceeding 5MB
   ✓ 3. Client-Side Employee Document Validation Rules (2)
     ✓ validates supported employee document extensions
     ✓ rejects document files exceeding 15MB
   ✓ 4. Multi-File Upload Resilience & Reporting (1)
     ✓ correctly distinguishes between succeeded and failed uploads

 Test Files  1 passed (1)
      Tests  8 passed (8)
```

### 4.2 Backend Test Suite (`server/src/tests/media-employee-upload.test.ts`)
Executed against isolated Express app with real database (`npx vitest run src/tests/media-employee-upload.test.ts`):
```text
 ✓ src/tests/media-employee-upload.test.ts (9 tests) 24273ms
   ✓ Media & Employee File Upload Backend Security & Persistence Suite (9)
     ✓ 1. Multipart Upload Contract & Error Reporting (5)
       ✓ returns 400 No file uploaded in 'file' field when multipart body has no file
       ✓ rejects unauthorized upload request without Bearer token
       ✓ successfully uploads a valid PNG file and persists MediaFile record
       ✓ rejects unsupported malicious executable files disguised as images
       ✓ rejects oversized file uploads exceeding size limits
     ✓ 2. Profile Photo Upload & Employee Persistence (2)
       ✓ updates employee avatarUrl and profile without duplicating employee records
       ✓ supports profile photo removal cleanly
     ✓ 3. Employee Document Upload & Vault Persistence (2)
       ✓ uploads a valid PDF document and creates CompanyDocument record linked to employee
       ✓ prevents Tenant B from viewing or accessing Tenant A's private documents

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

### 4.3 Regression & Existing HR Test Suites
Executed without regressions:
1. `server/src/tests/hr-employee-directory-backend.test.ts` — **6 passed (100%)**
2. `server/src/tests/hr-employee-360-backend.test.ts` — **4 passed (100%)**
3. `src/tests/hr-employee-form-validation-and-status.test.ts` — **5 passed (100%)**

### 4.4 TypeScript Compilation
- **Frontend (`npx tsc --noEmit`):** Exit code `0` (Zero errors).
- **Backend (`server: npx tsc --noEmit`):** Exit code `0` (Zero errors).

---

## 5. Browser Acceptance Results (Playwright E2E)

Browser testing was executed directly against the live development servers (`http://localhost:5173` frontend and `http://localhost:4000` API) using the Playwright MCP automation suite:

| Step | Action | Result | Empirical Evidence |
| :--- | :--- | :--- | :--- |
| **1** | Open Employee Edit (`/hr/employees/:id/edit`) | **Passed** | Loaded edit wizard for Report Tester (`a5278075-a350-47ff-8b7e-7ce68d2be9eb`). |
| **2** | Choose profile photo | **Passed** | Local preview generated and rendered in avatar circle. |
| **3** | Upload photo and verify API | **Passed** | Uploaded via `POST /api/v1/media/upload`, persisted to employee record via `PUT /hr/employees/:id`. |
| **4** | Reload page | **Passed** | `img[alt="Report Tester"]` persisted with src `http://localhost:5173/uploads/Employees/EMP-REP-1792070271292/Profile/1792217459695-b9bb1b2d.png`. |
| **5** | Switch to Documents step | **Passed** | Step 5 opened; document vault table and "Add Document" button rendered. |
| **6** | Upload Identity Document & Experience Letter | **Passed** | Uploaded `passport_identity.pdf` and `experience_letter.pdf` with individual metadata. |
| **7** | Confirm database persistence | **Passed** | Real DB query confirmed records created: `DOC-8596` (`passport_identity.pdf`) and `DOC-3645` (`experience_letter.pdf`). |
| **8** | Open Employee 360° Profile (`/hr/employees/:id`) | **Passed** | Profile header rendered avatar headshot; Tab 6 (Documents) displayed both certified documents with codes and action buttons. |
| **9** | Verify authorized preview/download | **Passed** | Download and stream endpoints functional with Tenant A authentication. |
| **10** | Cross-tenant security check | **Passed** | Access attempt from Tenant B resulted in `403 FORBIDDEN_WORKSPACE_ASSET`. Anonymous access resulted in `401 UPLOAD_AUTH_REQUIRED`. |
| **11** | Employee Create Wizard (`/hr/employees/new`) | **Passed** | Profile photo uploaded and rendered in Step 1; Step 6 document vault functional; Review step summarizes attachments. |

---

## 6. Exact Files Changed

1. `src/lib/api.ts` — Fixed `FormData` serialization bug; stopped stringifying `FormData` to `"{}"`; removed automatic `Content-Type: application/json` for multipart requests; added `api.upload<T>()` helper.
2. `server/src/routes/media.routes.ts` — Added Multer error handler for `LIMIT_FILE_SIZE` and `LIMIT_UNEXPECTED_FILE`.
3. `server/src/index.ts` — Added `/api/media` route alias pointing to `mediaRouter`.
4. `server/src/services/media/media.service.ts` — Added magic-byte inspection for PDF (`%PDF-`), DOCX (`PK\x03\x04`), and DOC (`D0 CF 11 E0`).
5. `server/src/middleware/uploads-security.middleware.ts` — Updated `isPublicUploadPath` to allow employee headshots to render in standard `<img>` elements while strictly enforcing tenant isolation on confidential documents.
6. `server/src/services/employee.service.ts` — Attached document records in `createEmployeeAtomic` to `tx.companyDocument`.
7. `src/routes/_authenticated/hr/employees/$id.edit.tsx` — Implemented avatar upload with preview, replacement, and removal; implemented multi-file document modal with individual progress reporting; enabled free step navigation in edit mode.
8. `src/routes/_authenticated/hr/employees/$id.tsx` — Added Add Document modal to Tab 6 header; enabled document deletion and verification.
9. `src/routes/_authenticated/hr/employees/new.tsx` — Added Profile Photo card in Step 1; added full document upload vault in Step 6.
10. `src/tests/employee-upload-flow.test.ts` — Automated frontend test suite (8 tests).
11. `server/src/tests/media-employee-upload.test.ts` — Automated backend test suite (9 tests).

---

## 7. Operational Status & Boundaries Respected

- **No Destructive Operations:** Existing employee records, media files, and database schemas remain intact.
- **Tenant Isolation:** Enforced strictly across all upload, storage, and retrieval endpoints.
- **Zero Simulation:** Real binary buffers and actual multipart HTTP streams were processed and verified.
- **Production Status:** Ready for deployment review.
