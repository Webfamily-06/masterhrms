/**
 * MASTERHRMS — Phase F6 Comprehensive Automated E2E Verification Suite
 * Scope:
 * - Track A: Document Viewer, Version-Anchored Annotations & Watermark Engine
 * - Track B: Asynchronous Antivirus / Malware Scanning & Data Loss Prevention (DLP)
 * - Track C: External Cloud Storage Connectors & Synchronization
 * - Track D: Streaming Archival, Batch Operations & Read-Only WebDAV
 * - Multi-Tenant Isolation & Zero Regressions
 */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { PrismaClient } = require(path.join(__dirname, "../server/node_modules/@prisma/client"));
const prisma = new PrismaClient();

const { DocumentPreviewService } = require(path.join(__dirname, "../server/src/services/files/document-preview.service"));
const { DocumentAnnotationService } = require(path.join(__dirname, "../server/src/services/files/document-annotation.service"));
const { MalwareScannerService, HeuristicScanner } = require(path.join(__dirname, "../server/src/services/security/malware-scanner.service"));
const { DlpEngineService } = require(path.join(__dirname, "../server/src/services/security/dlp-engine.service"));
const { ExternalConnectorsService } = require(path.join(__dirname, "../server/src/services/storage/external-connectors.service"));
const { BatchOperationsService } = require(path.join(__dirname, "../server/src/services/files/batch-operations.service"));
const { WebdavService } = require(path.join(__dirname, "../server/src/services/webdav/webdav.service"));

let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ [F6-TEST ${totalAssertions}] PASS: ${message}`);
  } else {
    console.error(`  ✗ [F6-TEST ${totalAssertions}] FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runF6TestSuite() {
  console.log("\n================================================================================");
  console.log("🔬 MASTERHRMS — PHASE F6 END-TO-END AUTOMATED VERIFICATION SUITE");
  console.log("Tracks: A (Preview/Annotations) + B (Malware/DLP) + C (Connectors) + D (Archive/WebDAV)");
  console.log("================================================================================\n");

  const testTenantId = `tenant-f6-test-${Date.now()}`;
  const crossTenantId = `tenant-f6-cross-${Date.now()}`;
  const testUserId = `user-f6-${Date.now()}`;

  try {
    console.log(`[SETUP] Initializing test tenants: ${testTenantId} and ${crossTenantId}`);
    await prisma.tenant.createMany({
      data: [
        { id: testTenantId, name: "Phase F6 Enterprise Primary Org", slug: `f6-primary-${Date.now()}` },
        { id: crossTenantId, name: "Phase F6 Cross-Tenant Isolated Org", slug: `f6-cross-${Date.now()}` },
      ],
    });

    // -------------------------------------------------------------------------
    // SECTION 1: TRACK A — IN-BROWSER RICH PREVIEWS & VERSIONED ANNOTATIONS
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 1: TRACK A (RICH PREVIEW & VERSIONED ANNOTATIONS) ---");

    // 1.1 Create test files
    const txtFile = await prisma.mediaFile.create({
      data: {
        id: `f6-file-txt-${Date.now()}`,
        tenantId: testTenantId,
        fileName: "server_config_audit.log",
        mimeType: "text/plain",
        fileSize: 1024,
        storageDisk: "LOCAL",
        filePath: "dummy/server_config_audit.log",
        url: "/uploads/dummy/server_config_audit.log",
        checksumSha: "sha-dummy-txt",
        extension: "log",
        version: 1,
      },
    });

    const docxFile = await prisma.mediaFile.create({
      data: {
        id: `f6-file-docx-${Date.now()}`,
        tenantId: testTenantId,
        fileName: "Corporate_Security_Charter.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileSize: 4500,
        storageDisk: "LOCAL",
        filePath: "dummy/Corporate_Security_Charter.docx",
        url: "/uploads/dummy/Corporate_Security_Charter.docx",
        checksumSha: "sha-dummy-docx",
        extension: "docx",
        version: 1,
      },
    });

    const xlsxFile = await prisma.mediaFile.create({
      data: {
        id: `f6-file-xlsx-${Date.now()}`,
        tenantId: testTenantId,
        fileName: "FY26_Headcount_Budget.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileSize: 12500,
        storageDisk: "LOCAL",
        filePath: "dummy/FY26_Headcount_Budget.xlsx",
        url: "/uploads/dummy/FY26_Headcount_Budget.xlsx",
        checksumSha: "sha-dummy-xlsx",
        extension: "xlsx",
        version: 2,
      },
    });

    // 1.2 Watermark Generator Test
    const watermark = DocumentPreviewService.buildWatermark({
      tenantName: "Acme Corp Global",
      userEmail: "secops@acme.com",
      ip: "192.168.1.100",
    });
    assert(watermark.enabled === true, "Dynamic confidential watermark enabled");
    assert(watermark.text.includes("CONFIDENTIAL"), "Watermark includes 'CONFIDENTIAL' token");
    assert(watermark.text.includes("Acme Corp Global"), "Watermark includes dynamic tenant name");
    assert(watermark.text.includes("secops@acme.com"), "Watermark includes authenticated user email");
    assert(watermark.opacity === 0.14, "Watermark uses calibrated opacity overlay (0.14)");

    // 1.3 HTML Sanitizer Test
    const maliciousHtml = `<p>Confidential doc</p><script>alert('pwned')</script><img src="x" onerror="stealCookies()"><iframe src="evil.com"></iframe>`;
    const cleanHtml = DocumentPreviewService.sanitizeHtml(maliciousHtml);
    assert(!cleanHtml.includes("<script"), "HTML sanitizer strips <script> tags completely");
    assert(!cleanHtml.includes("onerror="), "HTML sanitizer strips event handlers (onerror, onclick)");
    assert(!cleanHtml.includes("<iframe"), "HTML sanitizer strips embedded <iframe> vectors");

    // 1.4 Annotations CRUD Test
    const ann1 = await DocumentAnnotationService.createAnnotation(testTenantId, testUserId, {
      fileId: docxFile.id,
      fileVersion: 1,
      pageNumber: 2,
      coordinates: { x: 35, y: 50 },
      content: "Please clarify section 4.2 data retention period.",
      color: "#FFEB3B",
    });
    assert(Boolean(ann1.id), "Document annotation created with ID");
    assert(ann1.pageNumber === 2, "Annotation accurately anchored to page 2");
    assert(ann1.coordinates.x === 35 && ann1.coordinates.y === 50, "Annotation coordinates preserved");
    assert(ann1.status === "ACTIVE", "Annotation defaults to ACTIVE status");

    // Threaded Reply
    const reply1 = await DocumentAnnotationService.addReply(
      testTenantId,
      ann1.id,
      "legal-counsel@masterhrms.local",
      "Retention period is mandated at 7 years per statutory compliance."
    );
    assert(Boolean(reply1.id), "Threaded reply successfully posted to annotation");
    assert(reply1.annotationId === ann1.id, "Reply linked to parent annotation");

    // List Annotations with Replies
    const annotationsList = await DocumentAnnotationService.getAnnotations(testTenantId, docxFile.id, 1);
    assert(annotationsList.length === 1, "getAnnotations returns version-anchored annotations");
    assert(annotationsList[0].replies.length === 1, "Nested replies eagerly included in annotation response");

    // Resolve Annotation
    const resolvedAnn = await DocumentAnnotationService.updateAnnotation(
      testTenantId,
      ann1.id,
      testUserId,
      { status: "RESOLVED" }
    );
    assert(resolvedAnn.status === "RESOLVED", "Annotation resolved status updated successfully");

    // -------------------------------------------------------------------------
    // SECTION 2: TRACK B — ANTIVIRUS / MALWARE SCANNING & DLP ENGINE
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 2: TRACK B (MALWARE SCANNING & DLP ENGINE) ---");

    const heuristic = new HeuristicScanner();

    // 2.1 EICAR Standard Signature Detection
    const eicarBuf = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
    const eicarResult = await heuristic.scan(eicarBuf, "test_sample.txt", "text/plain");
    assert(eicarResult.isInfected === true, "Heuristic scanner detects EICAR test signature");
    assert(eicarResult.threatName === "EICAR.Standard.Antivirus.TestFile", "Accurate threat signature name reported");

    // 2.2 Double Extension Spoofing Detection
    const doubleExtResult = await heuristic.scan(Buffer.from("dummy code"), "invoice_october.pdf.exe", "application/x-msdownload");
    assert(doubleExtResult.isInfected === true, "Heuristic scanner flags double extension executable (.pdf.exe)");

    // 2.3 Polyglot Executable Mask Detection (MZ header with image mime)
    const mzBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00]); // MZ PE signature
    const mzResult = await heuristic.scan(mzBuffer, "employee_photo.png", "image/png");
    assert(mzResult.isInfected === true, "Heuristic scanner catches Windows PE binary disguised as PNG image");

    // 2.4 Stored SVG Script Injection Detection
    const svgExploit = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.domain)</script></svg>`);
    const svgResult = await heuristic.scan(svgExploit, "vector_logo.svg", "image/svg+xml");
    assert(svgResult.isInfected === true, "Heuristic scanner catches embedded scripts in SVG vectors");

    // 2.5 Quarantine Lifecycle Invariants
    const infectedFile = await prisma.mediaFile.create({
      data: {
        id: `f6-infected-${Date.now()}`,
        tenantId: testTenantId,
        fileName: "malicious_payload.vbs",
        mimeType: "text/plain",
        fileSize: 512,
        storageDisk: "LOCAL",
        filePath: "dummy/malicious_payload.vbs",
        url: "/uploads/dummy/malicious_payload.vbs",
        checksumSha: "sha-infected",
        scanStatus: "QUARANTINED",
        quarantinedAt: new Date(),
        quarantineReason: "EICAR.Standard.Antivirus.TestFile",
      },
    });

    const quarantinedList = await MalwareScannerService.listQuarantinedFiles(testTenantId);
    assert(quarantinedList.some((f) => f.id === infectedFile.id), "Quarantine manager lists infected files");

    // Release from quarantine
    const released = await MalwareScannerService.releaseQuarantine(
      testTenantId,
      infectedFile.id,
      testUserId,
      "Verified benign administrative script"
    );
    assert(released.scanStatus === "CLEAN", "SecOps release restores file to CLEAN scanStatus");
    assert(released.quarantineReleasedBy === testUserId, "Quarantine release audit trail tracks administrator user ID");

    // 2.6 DLP Engine: Luhn Check & Redaction
    assert(DlpEngineService.isValidLuhn("4532015112830366") === true, "Luhn algorithm validates legitimate Visa card number");
    assert(DlpEngineService.isValidLuhn("4532015112830367") === false, "Luhn algorithm flags invalid credit card checksum");

    const redactedCC = DlpEngineService.redactValue("PII_CREDIT_CARD", "4532-0151-1283-0366");
    assert(redactedCC === "****-****-****-0366", "DLP masks credit card with last 4 digits preserved");

    const redactedSSN = DlpEngineService.redactValue("PII_SSN", "123-45-6789");
    assert(redactedSSN === "***-**-6789", "DLP masks SSN/Tax ID with last 4 digits preserved");

    // 2.7 Content DLP Inspection
    const sampleTextWithPII = `Employee onboarding verification:
Name: Jane Doe
SSN: 987-65-4321
Corporate Card: 4532015112830366
Department: Finance`;

    const dlpResult = await DlpEngineService.inspectContent(testTenantId, txtFile.id, sampleTextWithPII);
    assert(dlpResult.hasViolations === true, "DLP inspectContent detects PII violations in text");
    assert(dlpResult.findings.length >= 2, "DLP identifies both SSN and Credit Card instances");
    assert(dlpResult.highestAction === "BLOCK" || dlpResult.highestAction === "WARN", "DLP determines appropriate highest enforcement action");

    // -------------------------------------------------------------------------
    // SECTION 3: TRACK C — EXTERNAL CLOUD STORAGE CONNECTORS & SYNC
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 3: TRACK C (CLOUD STORAGE CONNECTORS & SYNC) ---");

    // 3.1 AES-256-GCM Token Encryption Roundtrip
    const secretToken = "ya29.a0AfH6SMD_very_secret_oauth_bearer_access_token";
    const encrypted = ExternalConnectorsService.encryptToken(secretToken);
    assert(encrypted !== secretToken, "OAuth token is strongly encrypted (not plaintext)");
    assert(encrypted.split(":").length === 3, "Encrypted token formatted with IV, AuthTag, and Ciphertext");

    const decrypted = ExternalConnectorsService.decryptToken(encrypted);
    assert(decrypted === secretToken, "AES-256-GCM decrypts token identically without corruption");

    // 3.2 Create Connector
    const gdriveConn = await ExternalConnectorsService.createConnection(testTenantId, testUserId, {
      provider: "GOOGLE_DRIVE",
      connectionName: "Engineering Team Drive",
      accessToken: secretToken,
      accountEmail: "team-drive@enterprise.com",
      syncMode: "BIDIRECTIONAL",
    });
    assert(Boolean(gdriveConn.id), "External storage connector created with ID");
    assert(gdriveConn.provider === "GOOGLE_DRIVE", "Connector provider set to GOOGLE_DRIVE");
    assert(gdriveConn.status === "CONNECTED", "Connector initial status is CONNECTED");

    // 3.3 Test Connector Health
    const health = await ExternalConnectorsService.testConnection(testTenantId, gdriveConn.id);
    assert(health.success === true, "External connector health test succeeds");
    assert(health.status === "CONNECTED", "External connector reports active authenticated status");

    // 3.4 Remote File Browsing
    const remoteFiles = await ExternalConnectorsService.listRemoteFiles(testTenantId, gdriveConn.id);
    assert(remoteFiles.length >= 3, "listRemoteFiles returns items available in remote cloud catalog");
    assert(remoteFiles[0].provider === "GOOGLE_DRIVE", "Remote file metadata identifies provider source");

    // 3.5 Sync & Conflict Resolution
    const conflict = await ExternalConnectorsService.createConflict(testTenantId, gdriveConn.id, {
      fileId: docxFile.id,
      remoteItemId: "rem-101",
      remoteItemName: "Corporate_Security_Charter.docx",
      conflictType: "REMOTE_MODIFIED",
    });
    assert(conflict.resolution === "UNRESOLVED", "New sync conflict created with UNRESOLVED status");

    const resolvedConflict = await ExternalConnectorsService.resolveConflict(
      testTenantId,
      conflict.id,
      testUserId,
      "KEEP_LOCAL"
    );
    assert(resolvedConflict.resolution === "KEEP_LOCAL", "Conflict successfully resolved to KEEP_LOCAL");
    assert(resolvedConflict.resolvedBy === testUserId, "Conflict audit trail tracks resolving user");

    // -------------------------------------------------------------------------
    // SECTION 4: TRACK D — STREAMING ARCHIVAL, BATCH ACTIONS & READ-ONLY WEBDAV
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 4: TRACK D (STREAMING ARCHIVAL, BATCH ACTIONS & WEBDAV) ---");

    // 4.1 Batch Star Action
    const batchStarRes = await BatchOperationsService.executeBatchAction(testTenantId, testUserId, {
      action: "star",
      fileIds: [docxFile.id, xlsxFile.id],
      star: true,
    });
    assert(batchStarRes.successful.length === 2, "Batch star action starred all selected items");

    // 4.2 Batch Move Action
    const targetFolder = await prisma.mediaFile.create({
      data: {
        id: `f6-folder-target-${Date.now()}`,
        tenantId: testTenantId,
        fileName: "Target Archive Folder",
        isFolder: true,
        mimeType: "inode/directory",
        fileSize: 0,
        materializedPath: `/f6-folder-target-${Date.now()}/`,
        depth: 0,
        storageDisk: "LOCAL",
        filePath: "folders/target",
        url: "/folders/target",
        checksumSha: "folder-sha",
      },
    });

    const batchMoveRes = await BatchOperationsService.executeBatchAction(testTenantId, testUserId, {
      action: "move",
      fileIds: [txtFile.id],
      targetFolderId: targetFolder.id,
    });
    assert(batchMoveRes.successful.includes(txtFile.id), "Batch move relocated file to target folder");

    const updatedTxt = await prisma.mediaFile.findUnique({ where: { id: txtFile.id } });
    assert(updatedTxt.parentId === targetFolder.id, "Target file parentId reflects new folder destination");

    // 4.3 Cycle Prevention
    const batchCycleRes = await BatchOperationsService.executeBatchAction(testTenantId, testUserId, {
      action: "move",
      fileIds: [targetFolder.id],
      targetFolderId: targetFolder.id,
    });
    assert(batchCycleRes.failed.length === 1, "Batch move rejects moving a folder into itself");

    // 4.4 WebDAV Token Management
    const davToken = await WebdavService.createToken(testTenantId, testUserId, "MacBook Pro Finder Mount");
    assert(davToken.token.startsWith("dav_"), "WebDAV token prefixed with 'dav_'");
    assert(Boolean(davToken.tokenId), "WebDAV token record persisted in database");

    // Verify Token
    const verifiedRecord = await WebdavService.verifyToken(davToken.token);
    assert(verifiedRecord !== null, "WebdavService validates authentic secret token");
    assert(verifiedRecord.tenantId === testTenantId, "Verified WebDAV token resolves correct tenant scope");

    // Verify Revocation
    await WebdavService.revokeToken(testTenantId, davToken.tokenId, testUserId);
    const postRevoke = await WebdavService.verifyToken(davToken.token);
    assert(postRevoke === null, "Revoked WebDAV token is immediately invalidated");

    // 4.5 WebDAV PROPFIND XML Multistatus Generation
    const xml = WebdavService.buildMultistatusXml(
      "/webdav/Company%20Files",
      targetFolder,
      [docxFile, xlsxFile]
    );
    assert(xml.includes("<D:multistatus xmlns:D=\"DAV:\">"), "PROPFIND generates RFC 4918 compliant multistatus XML");
    assert(xml.includes("<D:displayname>Target Archive Folder</D:displayname>"), "PROPFIND includes collection display name");
    assert(xml.includes("<D:displayname>FY26_Headcount_Budget.xlsx</D:displayname>"), "PROPFIND enumerates child file nodes");
    assert(xml.includes("<D:getcontentlength>12500</D:getcontentlength>"), "PROPFIND includes accurate content length");

    // -------------------------------------------------------------------------
    // SECTION 5: CROSS-TENANT ISOLATION INVARIANTS
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 5: CROSS-TENANT ISOLATION INVARIANTS ---");

    // Cross-tenant connector access blocked
    let crossConnError = null;
    try {
      await ExternalConnectorsService.testConnection(crossTenantId, gdriveConn.id);
    } catch (e) {
      crossConnError = e;
    }
    assert(crossConnError !== null, "Cross-tenant access to external cloud connector is blocked");

    // Cross-tenant annotation access blocked
    const crossAnnotations = await DocumentAnnotationService.getAnnotations(crossTenantId, docxFile.id);
    assert(crossAnnotations.length === 0, "Cross-tenant query for document annotations yields zero results");

    // Cross-tenant DLP policies isolated
    const crossPolicies = await DlpEngineService.listPolicies(crossTenantId);
    assert(crossPolicies.length === 0, "Cross-tenant DLP policy list is isolated");

    console.log("\n================================================================================");
    console.log(`🎉 ALL PHASE F6 VERIFICATION TESTS PASSED (${passedAssertions} / ${totalAssertions}) — 100% SUCCESS`);
    console.log("================================================================================\n");
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILURE:", err);
    process.exit(1);
  } finally {
    console.log("[TEARDOWN] Purging test tenants and temporary test records...");
    await prisma.mediaFile.deleteMany({
      where: { tenantId: { in: [testTenantId, crossTenantId] } },
    });
    await prisma.dlpFinding.deleteMany({
      where: { tenantId: { in: [testTenantId, crossTenantId] } },
    });
    await prisma.dlpPolicy.deleteMany({
      where: { tenantId: { in: [testTenantId, crossTenantId] } },
    });
    await prisma.externalStorageConnection.deleteMany({
      where: { tenantId: { in: [testTenantId, crossTenantId] } },
    });
    await prisma.webdavToken.deleteMany({
      where: { tenantId: { in: [testTenantId, crossTenantId] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [testTenantId, crossTenantId] } },
    });
    await prisma.$disconnect();
  }
}

runF6TestSuite();
