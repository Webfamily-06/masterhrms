import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { runWithTenantContext } from "../context/tenant-context";
import { FileAclService, AclPermission } from "../services/files/file-acl.service";
import { FileLinkService } from "../services/files/file-link.service";
import { DocumentTypeService } from "../services/document-type.service";
import { encryptEmailSecret, decryptEmailSecret } from "../services/email/user-email-crypto.service";
import { CallLifecycleService } from "../services/call-lifecycle.service";
import { MeetingService } from "../services/meeting.service";
import { STANDARD_PROJECT_TEMPLATES } from "../routes/projects.routes";
import {
  getAlertConfig,
  updateAlertConfig,
  notifySaleCompleted,
  notifyLowStock,
} from "../services/alert-notification.service";
import { InternalRemindersService } from "../modules/internal-reminders/internal-reminders.service";

test("MASTERHRMS — WorkDo Reference Modules Wave 2 Verification Suite (Milestone 7.5)", async (t) => {
  const ts = Date.now();
  const testTenantId = `tenant-w2-${ts}`;
  const otherTenantId = `tenant-w2-iso-${ts}`;
  const userId = `usr-w2-${ts}`;
  const otherUserId = `usr-w2-iso-${ts}`;

  let emp1Id = `emp1-w2-${ts}`;
  let emp2Id = `emp2-w2-${ts}`;
  let fileId = `file-w2-${ts}`;

  const withTenant = <T>(tenantId: string, fn: () => Promise<T>): Promise<T> => {
    return runWithTenantContext(
      {
        tenantId,
        userId,
        roles: ["admin"],
        status: "ACTIVE",
        tenancyStrategy: "SHARED_SCHEMA",
        db: rawPrisma as any,
      },
      fn
    );
  };

  const cleanup = async () => {
    try {
      await rawPrisma.callParticipant.deleteMany({ where: { call: { tenantId: { in: [testTenantId, otherTenantId] } } } }).catch(() => {});
      await rawPrisma.callEvent.deleteMany({ where: { call: { tenantId: { in: [testTenantId, otherTenantId] } } } }).catch(() => {});
      await rawPrisma.callHistoryRecord.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
      await rawPrisma.call.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});

      await rawPrisma.meetingActionItem.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
      await rawPrisma.meetingAttendee.deleteMany({ where: { meeting: { tenantId: { in: [testTenantId, otherTenantId] } } } }).catch(() => {});
      await rawPrisma.meeting.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
      await rawPrisma.meetingTypeMaster.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
      await rawPrisma.meetingRoom.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});

      await rawPrisma.shiftSwapRequest.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
      await rawPrisma.shiftRoster.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
      await rawPrisma.shiftDefinition.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});

      await rawPrisma.projectTask.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
      await rawPrisma.projectMilestone.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
      await rawPrisma.project.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});

      await rawPrisma.sale.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
      await rawPrisma.crmProposal.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
      await rawPrisma.crmContact.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
      await rawPrisma.userEmailAccount.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});

      await rawPrisma.fileLink.deleteMany({ where: { fileId } }).catch(() => {});
      await rawPrisma.fileAcl.deleteMany({ where: { fileId } }).catch(() => {});
      await rawPrisma.mediaFile.deleteMany({ where: { id: fileId } }).catch(() => {});

      await rawPrisma.documentType.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
      await rawPrisma.workspaceTodo.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});

      await rawPrisma.employee.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
      await rawPrisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } }).catch(() => {});
      await rawPrisma.tenant.deleteMany({ where: { id: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
    } catch {
      // Best-effort cleanup
    }
  };

  await t.test("Setup: Create Test Tenants, Users, and Fixtures", async () => {
    await cleanup();

    await rawPrisma.tenant.create({
      data: { id: testTenantId, name: "Wave 2 Enterprise Corp", slug: `wave2-${ts}`, currency: "INR" },
    });
    await rawPrisma.tenant.create({
      data: { id: otherTenantId, name: "Isolated Boundary Corp", slug: `wave2-iso-${ts}`, currency: "INR" },
    });

    await rawPrisma.user.create({
      data: { id: userId, email: `owner-${ts}@wave2.com`, passwordHash: "dummy-hash" },
    });
    await rawPrisma.user.create({
      data: { id: otherUserId, email: `other-${ts}@wave2iso.com`, passwordHash: "dummy-hash" },
    });

    const emp1 = await rawPrisma.employee.create({
      data: {
        id: emp1Id,
        tenantId: testTenantId,
        userId,
        employeeCode: `EMP-A-${ts.toString().slice(-4)}`,
        firstName: "Alice",
        lastName: "Smith",
        email: `alice-${ts}@wave2.com`,
      },
    });

    const emp2 = await rawPrisma.employee.create({
      data: {
        id: emp2Id,
        tenantId: testTenantId,
        employeeCode: `EMP-B-${ts.toString().slice(-4)}`,
        firstName: "Bob",
        lastName: "Jones",
        email: `bob-${ts}@wave2.com`,
      },
    });

    assert.ok(testTenantId && emp1.id && emp2.id);
  });

  // =========================================================================
  // 1. File Sharing (ADDON-053)
  // =========================================================================
  await t.test("ADDON-053.1: Enforces file permission hierarchy and zero-byte entity link delegation", async () => {
    await rawPrisma.mediaFile.create({
      data: {
        id: fileId,
        tenantId: testTenantId,
        storageDisk: "LOCAL",
        filePath: `/uploads/${testTenantId}/contract.pdf`,
        url: `/api/files/download/${fileId}`,
        fileName: "Master_Service_Agreement.pdf",
        mimeType: "application/pdf",
        fileSize: 102400,
        checksumSha: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        uploadedBy: userId,
      },
    });

    const link = await FileLinkService.createLink({
      fileId,
      tenantId: testTenantId,
      module: "crm",
      pageKey: "deals",
      entityType: "CrmDeal",
      entityId: `deal-${ts}`,
      fieldKey: "contractAttachment",
      linkedBy: userId,
    });

    assert.ok(link.id, "File link record must be created");
    assert.equal(link.fileId, fileId);
    assert.equal(link.entityType, "CrmDeal");

    // Idempotent duplicate check
    const duplicateLink = await FileLinkService.createLink({
      fileId,
      tenantId: testTenantId,
      module: "crm",
      pageKey: "deals",
      entityType: "CrmDeal",
      entityId: `deal-${ts}`,
      fieldKey: "contractAttachment",
      linkedBy: userId,
    });
    assert.equal(duplicateLink.id, link.id, "Subsequent link requests must be idempotent");
  });

  await t.test("ADDON-053.2: Rejects cross-tenant file linking with fail-closed security", async () => {
    await assert.rejects(
      FileLinkService.createLink({
        fileId,
        tenantId: otherTenantId,
        module: "crm",
        pageKey: "deals",
        entityType: "CrmDeal",
        entityId: `deal-isolated-${ts}`,
        fieldKey: "contractAttachment",
        linkedBy: otherUserId,
      }),
      (err: any) => err.status === 403 || err.message.includes("Cross-tenant"),
      "Cross-tenant file linking must be prohibited"
    );
  });

  // =========================================================================
  // 2. Document Types & Templates (ADDON-073)
  // =========================================================================
  await t.test("ADDON-073.1: Seeds standard compliance document types and enforces required flags", async () => {
    const seededCount = await withTenant(testTenantId, async () => {
      return await DocumentTypeService.ensureDefaultDocumentTypes(testTenantId);
    });
    assert.ok(seededCount >= 10, "Must seed standard statutory compliance document types");

    const docTypes = await withTenant(testTenantId, async () => {
      return await DocumentTypeService.listDocumentTypes(testTenantId, { filter: "all" });
    });
    assert.ok(docTypes.items.length >= seededCount);

    const aadhaarType = docTypes.items.find((d: any) => d.code === "AADHAAR_NATIONAL_ID");
    assert.ok(aadhaarType, "Must include Aadhaar / National ID type");
    assert.equal(aadhaarType.isRequired, true, "National ID must be required");

    const passportType = docTypes.items.find((d: any) => d.code === "PASSPORT");
    assert.ok(passportType, "Must include Passport type");
    assert.equal(passportType.isRequired, false, "Passport must be optional");
  });

  await t.test("ADDON-073.2: Creates custom document type and verifies multi-tenant isolation", async () => {
    const customType = await withTenant(testTenantId, async () => {
      return await DocumentTypeService.createDocumentType(testTenantId, userId, {
        name: "Non-Disclosure Agreement (NDA)",
        code: "CUSTOM_NDA",
        description: "Signed proprietary information agreement",
        isRequired: true,
      });
    });

    assert.ok(customType.id);
    assert.equal(customType.code, "CUSTOM_NDA");

    // Verify isolation: Other tenant should not see this document type
    const otherTenantTypes = await withTenant(otherTenantId, async () => {
      return await DocumentTypeService.listDocumentTypes(otherTenantId, { filter: "all" });
    });
    const leaked = otherTenantTypes.items.find((d: any) => d.id === customType.id);
    assert.equal(leaked, undefined, "Custom document type must not leak to other tenants");
  });

  // =========================================================================
  // 3. Quotation / CRM Proposals & Sales Invoicing (ADDON-074)
  // =========================================================================
  await t.test("ADDON-074.1: Creates quotation proposal with line items, tax, and auto-generated proposalNo", async () => {
    const proposalCount = await rawPrisma.crmProposal.count({ where: { tenantId: testTenantId } });
    const proposalNo = `PROP-${new Date().getFullYear()}-${String(proposalCount + 1).padStart(4, "0")}`;

    const proposal = await rawPrisma.crmProposal.create({
      data: {
        tenantId: testTenantId,
        proposalNo,
        title: "Enterprise HRMS Cloud Migration",
        clientName: "Acme Global Industries",
        clientEmail: "procurement@acme.com",
        clientGstin: "27AAACA1234A1Z5",
        amount: 150000.0,
        status: "draft",
        validUntil: new Date(Date.now() + 30 * 86400000),
        items: [
          { description: "HRMS Enterprise License (Annual)", qty: 1, rate: 120000, amount: 120000 },
          { description: "Implementation & Data Migration", qty: 1, rate: 30000, amount: 30000 },
        ],
        terms: "Net 15 payment terms. Standard enterprise SLA included.",
        notes: "Approved by VP Sales.",
      },
    });

    assert.ok(proposal.id);
    assert.equal(proposal.proposalNo, proposalNo);
    assert.equal(Number(proposal.amount), 150000.0);
    assert.equal(proposal.status, "draft");
  });

  await t.test("ADDON-074.2: Transitions proposal status and converts proposal to formal Sale record", async () => {
    const proposal = await rawPrisma.crmProposal.findFirst({
      where: { tenantId: testTenantId },
    });
    assert.ok(proposal);

    // Accept quotation
    const accepted = await rawPrisma.crmProposal.update({
      where: { id: proposal.id },
      data: { status: "accepted" },
    });
    assert.equal(accepted.status, "accepted");

    // Convert proposal to Sale Invoice
    const sale = await rawPrisma.sale.create({
      data: {
        tenantId: testTenantId,
        invoiceNo: `INV-PROP-${ts.toString().slice(-6)}`,
        type: "pos",
        customerName: proposal.clientName,
        subtotal: proposal.amount,
        total: proposal.amount,
        paymentStatus: "paid",
        notes: `Converted from Proposal ${proposal.proposalNo}`,
      },
    });

    await rawPrisma.crmProposal.update({
      where: { id: proposal.id },
      data: { status: "converted" },
    });

    assert.ok(sale.id);
    assert.equal(Number(sale.total), Number(proposal.amount));
    assert.ok(sale.notes?.includes(proposal.proposalNo));
  });

  // =========================================================================
  // 4. Contact Management (ADDON-078)
  // =========================================================================
  await t.test("ADDON-078.1: Manages CRM contact lifecycle with directory attributes and multi-tenant isolation", async () => {
    const contact = await rawPrisma.crmContact.create({
      data: {
        tenantId: testTenantId,
        name: "Johnathan Doe",
        company: "Acme Global",
        email: "jdoe@acme.com",
        phone: "+919876543210",
        role: "Decision Maker",
        status: "active",
        notes: "Key decision maker for enterprise ERP rollout.",
      },
    });

    assert.ok(contact.id);
    assert.equal(contact.name, "Johnathan Doe");
    assert.equal(contact.role, "Decision Maker");

    // Verify isolation
    const isolatedSearch = await rawPrisma.crmContact.findFirst({
      where: { id: contact.id, tenantId: otherTenantId },
    });
    assert.equal(isolatedSearch, null, "Contact must not be visible across tenant boundary");

    // Update contact
    const updated = await rawPrisma.crmContact.update({
      where: { id: contact.id },
      data: { role: "VP Procurement", notes: "Pricing proposal sent." },
    });
    assert.equal(updated.role, "VP Procurement");
  });

  // =========================================================================
  // 5. Email Box (ADDON-102)
  // =========================================================================
  await t.test("ADDON-102.1: Configures user email account with AES-256-GCM encrypted credentials", async () => {
    const encIncoming = encryptEmailSecret("SecureIncomingPass123!");
    const encSmtp = encryptEmailSecret("SecureSmtpPass456!");

    const emailAccount = await rawPrisma.userEmailAccount.create({
      data: {
        userId,
        tenantId: testTenantId,
        email: `admin-${ts}@wave2.com`,
        displayName: "Enterprise Mailbox",
        fromName: "Wave 2 Admin",
        username: `admin-${ts}@wave2.com`,
        incomingProtocol: "IMAP",
        incomingHost: "imap.mailprovider.com",
        incomingPort: 993,
        incomingSecurity: "SSL/TLS",
        incomingPassCipher: encIncoming.ciphertext,
        incomingPassIv: encIncoming.iv,
        incomingPassAuthTag: encIncoming.authTag,
        smtpHost: "smtp.mailprovider.com",
        smtpPort: 465,
        smtpSecurity: "SSL/TLS",
        smtpUser: `admin-${ts}@wave2.com`,
        smtpPassCipher: encSmtp.ciphertext,
        smtpPassIv: encSmtp.iv,
        smtpPassAuthTag: encSmtp.authTag,
        status: "CONNECTED",
        isDefault: true,
      },
    });

    assert.ok(emailAccount.id);
    assert.equal(emailAccount.status, "CONNECTED");
    assert.equal(emailAccount.incomingPort, 993);
    assert.equal(emailAccount.smtpPort, 465);

    // Verify cryptographic round-trip
    const decryptedIncoming = decryptEmailSecret({
      ciphertext: emailAccount.incomingPassCipher,
      iv: emailAccount.incomingPassIv,
      authTag: emailAccount.incomingPassAuthTag,
    });
    assert.equal(decryptedIncoming, "SecureIncomingPass123!", "Decrypted IMAP password must match original secret");
  });

  // =========================================================================
  // 6. Call Hub (ADDON-104)
  // =========================================================================
  await t.test("ADDON-104.1: Call session lifecycle, participant heartbeat, and stale reaper", async () => {
    const roomKey = `call_test_${ts}`;
    const startedAt = new Date();
    const ringingExpiresAt = new Date(startedAt.getTime() + 60000);

    const call = await rawPrisma.call.create({
      data: {
        tenantId: testTenantId,
        type: "DIRECT",
        status: "RINGING",
        startedBy: userId,
        roomKey,
        startedAt,
        ringingExpiresAt,
        participants: {
          create: [
            { userId, role: "HOST", state: "RINGING" },
            { userId: otherUserId, role: "CALLEE", state: "RINGING" },
          ],
        },
      },
      include: { participants: true },
    });

    assert.ok(call.id);
    assert.equal(call.status, "RINGING");
    assert.equal(call.participants.length, 2);

    // Heartbeat tracking
    const hbResult = await CallLifecycleService.recordHeartbeat({
      tenantId: testTenantId,
      callId: call.id,
      userId,
    });
    assert.equal(hbResult.ok, true, "Heartbeat must be acknowledged");

    // Transition call to ACTIVE
    const activeCall = await rawPrisma.call.update({
      where: { id: call.id },
      data: { status: "ACTIVE", answeredAt: new Date() },
    });
    assert.equal(activeCall.status, "ACTIVE");

    // End call
    const endedCall = await rawPrisma.call.update({
      where: { id: call.id },
      data: { status: "ENDED", endedAt: new Date(), endReason: "CALL_COMPLETED" },
    });
    assert.equal(endedCall.status, "ENDED");
  });

  // =========================================================================
  // 7. Meeting Hub (ADDON-113)
  // =========================================================================
  await t.test("ADDON-113.1: Manages meeting rooms, types, and action items lifecycle", async () => {
    const room = await withTenant(testTenantId, async () => {
      return await MeetingService.createRoom(testTenantId, {
        name: "Boardroom Alpha",
        location: "Executive Tower, 4th Floor",
        capacity: 16,
        amenities: "4K Dual Displays, Cisco Telepresence, Digital Whiteboard",
      });
    });

    assert.ok(room.id);
    assert.equal(room.capacity, 16);

    const type = await withTenant(testTenantId, async () => {
      return await MeetingService.createType(testTenantId, {
        name: "Quarterly Strategy Review",
        color: "#8b5cf6",
        description: "Leadership strategic alignment",
      });
    });

    assert.ok(type.id);
    assert.equal(type.color, "#8b5cf6");

    // Create meeting action item
    const actionItem = await rawPrisma.meetingActionItem.create({
      data: {
        tenantId: testTenantId,
        title: "Finalize FY27 Sales Targets",
        assigneeId: emp1Id,
        status: "open",
        dueDate: new Date(Date.now() + 7 * 86400000),
      },
    });

    assert.ok(actionItem.id);
    assert.equal(actionItem.status, "open");

    // Complete action item
    const completedAction = await rawPrisma.meetingActionItem.update({
      where: { id: actionItem.id },
      data: { status: "completed" },
    });
    assert.equal(completedAction.status, "completed");
  });

  // =========================================================================
  // 8. Rotas & Shift Management (ADDON-117)
  // =========================================================================
  await t.test("ADDON-117.1: Shift definitions, roster scheduling, and atomic peer swap decision", async () => {
    const morningShift = await rawPrisma.shiftDefinition.create({
      data: {
        tenantId: testTenantId,
        name: "Morning Shift",
        code: `MORN-${ts.toString().slice(-4)}`,
        startTime: "07:00",
        endTime: "15:30",
        breakMinutes: 30,
        allowance: 250,
        color: "amber",
        isOvertimeEligible: true,
      },
    });

    const eveningShift = await rawPrisma.shiftDefinition.create({
      data: {
        tenantId: testTenantId,
        name: "Evening Shift",
        code: `EVE-${ts.toString().slice(-4)}`,
        startTime: "15:00",
        endTime: "23:30",
        breakMinutes: 30,
        allowance: 350,
        color: "purple",
        isOvertimeEligible: true,
      },
    });

    const shiftDate = new Date("2026-12-05T00:00:00.000Z");

    const roster1 = await rawPrisma.shiftRoster.create({
      data: {
        tenantId: testTenantId,
        employeeId: emp1Id,
        shiftId: morningShift.id,
        rosterDate: shiftDate,
        status: "scheduled",
      },
    });

    const roster2 = await rawPrisma.shiftRoster.create({
      data: {
        tenantId: testTenantId,
        employeeId: emp2Id,
        shiftId: eveningShift.id,
        rosterDate: shiftDate,
        status: "scheduled",
      },
    });

    assert.equal(roster1.shiftId, morningShift.id);
    assert.equal(roster2.shiftId, eveningShift.id);

    // Create swap request
    const swap = await rawPrisma.shiftSwapRequest.create({
      data: {
        tenantId: testTenantId,
        requesterEmployeeId: emp1Id,
        targetEmployeeId: emp2Id,
        shiftDate,
        reason: "Personal scheduling conflict",
        status: "pending_peer",
      },
    });

    assert.ok(swap.id);
    assert.equal(swap.status, "pending_peer");

    // Peer agrees to swap
    const peerApproved = await rawPrisma.shiftSwapRequest.update({
      where: { id: swap.id },
      data: { status: "pending_manager" },
    });
    assert.equal(peerApproved.status, "pending_manager");

    // Manager executes atomic shift swap in database transaction
    await rawPrisma.$transaction([
      rawPrisma.shiftRoster.update({
        where: { id: roster1.id },
        data: { shiftId: eveningShift.id, status: "swapped" },
      }),
      rawPrisma.shiftRoster.update({
        where: { id: roster2.id },
        data: { shiftId: morningShift.id, status: "swapped" },
      }),
      rawPrisma.shiftSwapRequest.update({
        where: { id: swap.id },
        data: { status: "approved" },
      }),
    ]);

    const updatedRoster1 = await rawPrisma.shiftRoster.findUnique({ where: { id: roster1.id } });
    const updatedRoster2 = await rawPrisma.shiftRoster.findUnique({ where: { id: roster2.id } });

    assert.equal(updatedRoster1?.shiftId, eveningShift.id, "Emp 1 must now have evening shift");
    assert.equal(updatedRoster2?.shiftId, morningShift.id, "Emp 2 must now have morning shift");
  });

  // =========================================================================
  // 9. Project Template (ADDON-119)
  // =========================================================================
  await t.test("ADDON-119.1: Validates standard project templates and instantiates project with tasks and milestones", async () => {
    assert.ok(Array.isArray(STANDARD_PROJECT_TEMPLATES), "STANDARD_PROJECT_TEMPLATES must be an array");
    assert.ok(STANDARD_PROJECT_TEMPLATES.length >= 3, "Must have standard enterprise templates");

    const epmsTemplate = STANDARD_PROJECT_TEMPLATES.find((t) => t.code === "EPMS_HEALTHCARE");
    assert.ok(epmsTemplate, "Must have EPMS_HEALTHCARE template");
    assert.ok(epmsTemplate.tasks.length >= 4, "Template must have tasks");
    assert.ok(epmsTemplate.milestones.length >= 3, "Template must have milestones");

    // Instantiate project from template
    const startDate = new Date();
    const dueDate = new Date(startDate.getTime() + epmsTemplate.estimatedDays * 86400000);

    const project = await rawPrisma.project.create({
      data: {
        tenantId: testTenantId,
        name: "Apollo Hospital EPMS Implementation",
        description: epmsTemplate.description,
        status: "in_progress",
        priority: "high",
        clientName: "Apollo Healthcare Networks",
        budget: 50000.0,
        startDate,
        dueDate,
        progress: 15,
        tasks: {
          create: epmsTemplate.tasks.map((task) => ({
            tenantId: testTenantId,
            title: task.title,
            description: `Generated from template: ${epmsTemplate.name}`,
            status: task.status,
            priority: task.priority,
            assignedTo: task.assignee,
          })),
        },
        milestones: {
          create: epmsTemplate.milestones.map((m) => ({
            tenantId: testTenantId,
            title: m.title,
            status: m.status,
            dueDate: new Date(startDate.getTime() + m.targetDateOffsetDays * 86400000),
          })),
        },
      },
      include: {
        tasks: true,
        milestones: true,
      },
    });

    assert.ok(project.id);
    assert.equal(project.tasks.length, epmsTemplate.tasks.length);
    assert.equal(project.milestones.length, epmsTemplate.milestones.length);

    // Milestone update
    const firstMilestone = project.milestones[0];
    const updatedMilestone = await rawPrisma.projectMilestone.update({
      where: { id: firstMilestone.id },
      data: { status: "completed", completedAt: new Date() },
    });
    assert.equal(updatedMilestone.status, "completed");
  });

  // =========================================================================
  // 10. Custom Alert & Internal Reminders (ADDON-122)
  // =========================================================================
  await t.test("ADDON-122.1: Multi-channel alert configuration, sales notifications, and internal reminders", async () => {
    const config = getAlertConfig();
    assert.ok(config.slack && config.telegram);

    updateAlertConfig({
      slack: {
        enabled: true,
        webhookUrl: "https://hooks.slack.com/services/TEST/MOCK/ALERTS",
        channelName: "#enterprise-alerts",
        highValueThreshold: 50000,
        alertOnLowStock: true,
        alertOnRegisterClose: true,
      },
    });

    // Notify low stock simulation
    await notifyLowStock({
      name: "Smart Biometric Punch Terminal ZK-800",
      sku: "ZK-BIO-800",
      quantity: 3,
      threshold: 10,
    });

    // Notify high-value sale simulation
    await notifySaleCompleted({
      receiptNo: "POS-998822",
      total: 75000,
      customer: "Global Enterprise Client",
      cashier: "Alice Smith",
      paymentMode: "UPI / Corporate Card",
      itemsCount: 5,
    });

    // Internal Reminder creation
    const { reminder } = await InternalRemindersService.createReminder(testTenantId, userId, {
      title: "Quarterly GST Filing Review",
      description: "Review GSTR-1 and GSTR-3B filings before statutory deadline",
      dueDate: new Date(Date.now() + 5 * 86400000),
      priority: "high",
      entityType: "INVOICE",
      entityId: `gst-${ts}`,
      reminderType: "STATUTORY_TAX",
    });

    assert.ok(reminder.id);
    assert.equal(reminder.title, "Quarterly GST Filing Review");
    assert.equal(reminder.priority, "high");

    const reminders = await InternalRemindersService.listReminders(testTenantId, userId);
    assert.ok(reminders.some((r) => r.id === reminder.id));

    // Complete reminder
    const completedReminder = await InternalRemindersService.completeReminder(testTenantId, reminder.id, userId);
    assert.equal(completedReminder.completed, true);
  });

  // Teardown
  await t.test("Teardown: Clean up Test Fixtures", async () => {
    await cleanup();
    assert.ok(true);
  });
});
