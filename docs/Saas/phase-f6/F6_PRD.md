# MASTERHRMS FILE MANAGER — PHASE F6
## Product Requirements Document (PRD)

- **Project:** MASTERHRMS Enterprise SaaS
- **Module:** Enterprise File Manager
- **Phase:** F6 ONLY
- **Status:** **APPROVED FOR FULL IMPLEMENTATION (TRACKS A, B, C, D)**
- **Baseline Preserved:** Phases F1 through F5
- **Next Phase:** F7 — NOT AUTHORIZED

---

## 1. Executive Summary

Phase F6 elevates the MASTERHRMS File Manager into a high-security enterprise content, collaboration, and archival platform. F6 delivers four approved functional tracks:
1. **Track A (In-Browser Document Viewer, Annotation & Rich Preview Engine):** Zero-download preview for PDF, Office (DOCX, XLSX), images, text, and CSV; version-aware multi-user annotations and replies; dynamic confidential viewer watermarks.
2. **Track B (Antivirus / Malware Scanning & Data Loss Prevention):** Asynchronous quarantine lifecycle (`PENDING` $\rightarrow$ `SCANNING` $\rightarrow$ `CLEAN` / `INFECTED`); provider-neutral `IMalwareScanner` (ClamAV / VirusTotal / Heuristic); regex and keyword DLP inspection engine with redacted evidence logging and review actions.
3. **Track C (External Cloud Storage Connectors & Synchronization):** `IExternalStorageConnector` adapters for Google Drive, Microsoft OneDrive, and Dropbox; secure OAuth2 code exchange with token encryption; folder mapping; import/export; sync conflict resolution; and retention-safe remote deletion tombstoning.
4. **Track D (Streaming Archival, Batch Operations & Read-Only WebDAV Gateway):** Zero-memory-buffering streaming ZIP generation; atomic batch file actions (`move`, `trash`, `restore`, `star`, `tag`) with itemized partial-failure reports; and RFC 4918 read-only WebDAV gateway (`OPTIONS`, `PROPFIND`, `GET`, `HEAD`) protected by revocable tenant tokens and path-traversal safeguards.

---

## 2. Requirements Traceability Matrix

| Req ID | Track | Capability | Acceptance Criteria | Backend Service | Frontend Route / Component |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **REQ-F6-A1** | A | Multi-Format Document Preview | Safe in-browser preview of PDF, DOCX, XLSX, TXT, CSV, images with zoom and paging. | `DocumentPreviewService` | `DocumentPreviewModal` in `unified-file-manager.tsx` |
| **REQ-F6-A2** | A | Version-Aware Annotations | Users can add comments, coordinates, and replies linked to specific document versions. | `DocumentAnnotationService` | `DocumentPreviewModal` sidebar |
| **REQ-F6-A3** | A | Confidential Watermarking | Dynamic visual overlay showing viewer identity, tenant, and timestamp without altering file bytes. | `DocumentPreviewService` | `DocumentPreviewModal` canvas |
| **REQ-F6-B1** | B | Asynchronous Malware Scanning | Uploaded files land in `PENDING` scan status; infected files remain quarantined (`403 Forbidden`). | `MalwareScannerService` | `/tenant/files/security` |
| **REQ-F6-B2** | B | DLP Engine & Pattern Detection | Evaluates PII (emails, phones, govt IDs, credit cards) and keywords; logs redacted evidence. | `DlpEngineService` | `/tenant/files/security` (DLP tab) |
| **REQ-F6-B3** | B | Quarantine Management | Security admins can inspect quarantined items, review false positives, and release files. | `MalwareScannerService` | `/tenant/files/security` (Quarantine tab) |
| **REQ-F6-C1** | C | External Storage Connectors | OAuth2 handshake for Google Drive, OneDrive, and Dropbox with encrypted credentials. | `ExternalConnectorsService` | `/tenant/files/connectors` |
| **REQ-F6-C2** | C | Cloud Import / Export & Sync | Import files into system folders, export to cloud, detect `REMOTE_MODIFIED` conflicts. | `ExternalConnectorsService` | `/tenant/files/connectors` |
| **REQ-F6-D1** | D | Zero-Buffer Streaming ZIP | Streams multi-file archives directly to HTTP client without buffering complete ZIP in RAM. | `StreamingArchivalService` | `Download as ZIP` action in ribbon |
| **REQ-F6-D2** | D | Atomic Batch File Operations | Bulk move, trash, restore, star with itemized result reporting (`SUCCESS`, `FAILED`, `SKIPPED`). | `BatchOperationsService` | Ribbon bulk action bar |
| **REQ-F6-D3** | D | Read-Only WebDAV Gateway | RFC 4918 read-only server (`OPTIONS`, `PROPFIND`, `GET`, `HEAD`); blocks all write methods (`PUT`, `DELETE`). | `WebDavService` | `/tenant/files/webdav` |

---

## 3. Strict Boundary & Non-Functional Invariants

1. **Storage Usage Integrity (SUCE):** Temporary ZIP archives, document annotations, and quarantined files do not cause quota drift. Reconciliations preserve verified byte counts.
2. **Multi-Tenant Security:** Every API, job, and WebDAV request extracts `tenantId` exclusively from verified server-side authentication. Cross-tenant access is rejected with `403 Forbidden`.
3. **Immutability & Legal Holds:** Legal holds and retention rules established in F4-F take absolute precedence over batch deletions, external deletion syncs, and quarantine purges.
4. **Zero-Byte Linking Preservation:** Files selected via the Universal FilePicker remain referenced via `FileLink` without duplicate storage overhead.
