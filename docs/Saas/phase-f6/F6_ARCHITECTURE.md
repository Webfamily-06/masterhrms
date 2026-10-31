# MASTERHRMS FILE MANAGER — PHASE F6
## System Architecture & Technical Design Specification

- **Project:** MASTERHRMS Enterprise SaaS
- **Module:** Enterprise File Manager
- **Phase:** F6 ONLY
- **Status:** **APPROVED & ARCHITECTED**

---

## 1. High-Level Architecture Overview

```mermaid
graph TD
    subgraph ClientLayer ["Client & Interface Layer"]
        UFM["Unified File Explorer<br>(Ribbon, Grid, List)"]
        DPM["DocumentPreviewModal<br>(PDF, DOCX, XLSX, TXT, Annotations)"]
        SH["Security Hub (/tenant/files/security)<br>(Quarantine & DLP)"]
        CH["Connectors Hub (/tenant/files/connectors)<br>(Google Drive, OneDrive, Dropbox)"]
        WH["WebDAV Hub (/tenant/files/webdav)<br>(Token Manager)"]
        WDC["Native OS Clients<br>(Windows Explorer / macOS Finder)"]
    end

    subgraph APILayer ["API Routing Layer (Express.js)"]
        FRouter["files.routes.ts<br>(Preview, Annotations, Batch, Archival)"]
        SRouter["security.routes.ts<br>(Quarantine, DLP policies, findings)"]
        CRouter["connectors.routes.ts<br>(OAuth, Sync, Conflicts)"]
        WRouter["webdav.routes.ts<br>(PROPFIND, GET, OPTIONS, HEAD)"]
    end

    subgraph ServiceLayer ["Enterprise Service Layer"]
        DPS["DocumentPreviewService<br>(Rendering, Metadata, Watermarking)"]
        DAS["DocumentAnnotationService<br>(CRUD, Version Attachment)"]
        MSS["MalwareScannerService<br>(IMalwareScanner, ClamAV, Quarantine)"]
        DLP["DlpEngineService<br>(Regex, Keywords, Redaction)"]
        ECS["ExternalConnectorsService<br>(OAuth Handshake, Sync, Conflict Engine)"]
        SAS["StreamingArchivalService<br>(Zero-Buffer Archiver Pipe)"]
        BOS["BatchOperationsService<br>(Bulk Move, Trash, Restore)"]
        WDS["WebDavService<br>(RFC 4918 Path Normalization & XML)"]
    end

    subgraph CoreLayer ["Existing F1–F5 Foundation Services"]
        FS["FilesService (Node Tree & CRUD)"]
        ACL["FileAclService (Role & Delegated Access)"]
        SUCE["StorageUsageEngine & QuotaService"]
        RET["RetentionPolicyService & LegalHoldService"]
        OUT["OutboxService & Socket.IO"]
    end

    subgraph StorageLayer ["Persistence & Storage Layer"]
        DB[("PostgreSQL via Prisma")]
        S3["Supabase Object Storage / Local Disk"]
    end

    UFM --> DPM
    UFM --> FRouter
    DPM --> FRouter
    SH --> SRouter
    CH --> CRouter
    WH --> WRouter
    WDC --> WRouter

    FRouter --> DPS
    FRouter --> DAS
    FRouter --> SAS
    FRouter --> BOS
    SRouter --> MSS
    SRouter --> DLP
    CRouter --> ECS
    WRouter --> WDS

    DPS --> S3
    DAS --> DB
    MSS --> OUT
    DLP --> DB
    ECS --> S3
    SAS --> S3
    BOS --> FS
    WDS --> FS

    FS --> DB
    FS --> S3
    ACL --> DB
    SUCE --> DB
    RET --> DB
```

---

## 2. Track Technical Contracts

### Track A: Document Preview & Annotations
- **DocumentPreviewService:**
  - Extracts text and HTML from DOCX safely without executing macros or external links.
  - Parses XLSX sheets into structured tabbed JSON arrays for tabular viewing.
  - Generates transparent SVG watermark tiles containing `{viewerName, viewerEmail, tenantName, timestamp}` rendered on the HTML5 canvas overlay.
- **DocumentAnnotationService:**
  - Stores annotations in `document_annotations` referencing `(tenantId, fileId, fileVersionId, authorId)`.
  - Replies stored in `document_annotation_replies`.
  - When a file has a new version uploaded (`file_versions`), annotations remain anchored to their original version.

### Track B: Malware Scanning & Data Loss Prevention
- **IMalwareScanner Interface:**
  - `scanStream(stream, fileName, mimeType): Promise<{ isClean: boolean, engine: string, findings?: any }>`
  - Adapters: `ClamAvScannerAdapter`, `VirusTotalScannerAdapter`, `HeuristicScannerAdapter`.
- **DLP Engine:**
  - Evaluates uploaded content and preview text against pre-configured rules (credit card Luhn algorithm, email RFC patterns, phone numbers, SSN/PAN/Aadhaar formats, keywords).
  - Redaction pipeline masks sensitive spans (e.g. `4532-****-****-8812`) before recording in `dlp_findings`.

### Track C: External Cloud Connectors
- **IExternalStorageConnector Interface:**
  - `getAuthUrl(tenantId, state): string`
  - `handleCallback(code, redirectUri): Promise<{ accessToken, refreshToken, expiresAt, accountInfo }>`
  - `listFolder(connection, remoteFolderId): Promise<RemoteItem[]>`
  - `downloadFile(connection, remoteFileId): Promise<ReadableStream>`
  - `uploadFile(connection, remoteFolderId, localFile): Promise<RemoteItem>`
- **Conflict Management:**
  - `ExternalSyncConflict` tracks divergent revisions between MasterHRMS and remote drive.
  - Remote deletions apply tombstone flags and never delete records under legal hold.

### Track D: Streaming Archival, Batch Operations & WebDAV
- **StreamingArchivalService:**
  - Uses `archiver` piped directly to the Express `res` stream or multipart chunked upload.
  - Memory consumption stays constant ($< 35\text{ MB}$) even for $10\text{ GB}+$ archives.
- **WebDavService:**
  - Implements RFC 4918 read-only handler:
    - `OPTIONS`: Returns `DAV: 1`, `Allow: GET, HEAD, OPTIONS, PROPFIND`.
    - `PROPFIND`: Generates `207 Multi-Status` XML response with `<D:response>`, `<D:href>`, `<D:propstat>`, `<D:displayname>`, `<D:getcontentlength>`, `<D:resourcetype>`.
    - `GET` / `HEAD`: Streams file bytes with authenticated range support.
    - `PUT`, `DELETE`, `MKCOL`, `MOVE`, `COPY`: Returns `405 Method Not Allowed`.
  - Authenticates via revocable `WebDavToken` (`Basic` auth username/token).
