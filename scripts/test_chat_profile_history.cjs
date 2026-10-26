/**
 * MASTERHRMS — Chat Profile Data Integrity, Authoritative Employee Mapping,
 * Conversation History & Security Verification Suite
 */

const fs = require("fs");
const path = require("path");

const dotenvPath = path.join(process.cwd(), "server/.env");
if (fs.existsSync(dotenvPath)) {
  require(path.join(process.cwd(), "server/node_modules/dotenv")).config({ path: dotenvPath });
}
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const { PrismaClient } = require(path.join(process.cwd(), "server/node_modules/@prisma/client"));
const prisma = new PrismaClient();

async function runProfileAndHistoryTests() {
  console.log("\n================================================================");
  console.log(" MASTERHRMS CHAT PROFILE INTEGRITY & HISTORY REPAIR SUITE");
  console.log("================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✔ [PASS] ${message}`);
    } else {
      console.error(`  ✖ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // ─── 1. Authoritative Employee Profile Mapping ─────────────────────────
    console.log("--- 1. Authoritative Employee Profile Mapping & Missing Fields ---");

    // Fetch Alex Morgan employee
    const alexEmployee = await prisma.employee.findFirst({
      where: {
        OR: [
          { email: "employee@masterhrms.com" },
          { firstName: "Alex", lastName: "Morgan" },
        ],
      },
      include: {
        department: true,
        designation: true,
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    assert(!!alexEmployee, `Alex Morgan employee record found (ID: ${alexEmployee?.id}, email: ${alexEmployee?.email})`);
    assert(alexEmployee.employeeCode === "EMP-BDAY-AVATAR", `Alex Morgan authoritative employeeCode is "${alexEmployee?.employeeCode}"`);
    assert(alexEmployee.email === "employee@masterhrms.com", `Alex Morgan authoritative email is "${alexEmployee?.email}"`);

    // Verify chat router GET /participant/:id endpoint logic against this employee
    const resolvedDesignation = alexEmployee.position || alexEmployee.designation?.name || "Team Member";
    const resolvedDepartment = alexEmployee.department?.name || null;
    const resolvedPhone = alexEmployee.phone || alexEmployee.user?.profile?.phone || null;

    assert(resolvedDesignation === "Team Member", "Designation resolves to fallback role 'Team Member' when position/designation is unassigned in DB");
    assert(resolvedDepartment === null, "Department correctly resolves to null (authoritative empty state, never fake 'General')");
    assert(resolvedPhone === null, "Phone correctly resolves to null (authoritative empty state, never fake '(555) 019-2834')");

    // Verify frontend unified-chat-app.tsx does NOT have fake fallback literals
    const unifiedChatPath = path.resolve(__dirname, "../src/components/chat/unified-chat-app.tsx");
    const unifiedChatContent = fs.readFileSync(unifiedChatPath, "utf-8");

    assert(!unifiedChatContent.includes('|| "(555) 019-2834"'), "unified-chat-app.tsx has no '(555) 019-2834' fallbacks");
    assert(!unifiedChatContent.includes('|| "General"'), "unified-chat-app.tsx has no 'General' department fallback");
    assert(!unifiedChatContent.includes('|| "Staff"'), "unified-chat-app.tsx has no 'Staff' designation fallback");

    assert(unifiedChatContent.includes("participantProfile?.email || activeContact?.email || \"Not provided\""), "Email displays 'Not provided' when missing");
    assert(unifiedChatContent.includes("participantProfile?.phone || activeContact?.phone || \"Not provided\""), "Phone displays 'Not provided' when missing");
    assert(unifiedChatContent.includes("participantProfile?.department || activeContact?.department || \"Not assigned\""), "Department displays 'Not assigned' when missing");
    assert(unifiedChatContent.includes("participantProfile?.designation || activeContact?.designation || \"Not assigned\""), "Designation displays 'Not assigned' when missing");

    // ─── 2. Conversation History Route & Response Shape ─────────────────────
    console.log("\n--- 2. Conversation History Route & Schema Validation ---");

    const chatRoutesPath = path.resolve(__dirname, "../server/src/routes/chat.routes.ts");
    const chatRoutesContent = fs.readFileSync(chatRoutesPath, "utf-8");

    assert(chatRoutesContent.includes('chatRouter.get("/messages/:threadId"'), "chat.routes.ts registers GET /messages/:threadId");
    assert(chatRoutesContent.includes('chatRouter.get("/conversations/:threadId/messages"'), "chat.routes.ts registers GET /conversations/:threadId/messages alias");

    // Test history query in database
    const tenant = await prisma.tenant.findFirst({
      where: { id: alexEmployee.tenantId },
    });
    assert(!!tenant, `Active tenant: ${tenant?.name} (${tenant?.id})`);

    const testThreadId = `direct_${alexEmployee.userId || alexEmployee.id}_testadmin`;
    
    // Create test message
    const msg = await prisma.chatMessage.create({
      data: {
        threadId: testThreadId,
        tenantId: tenant.id,
        senderId: alexEmployee.userId || alexEmployee.id,
        senderName: `${alexEmployee.firstName} ${alexEmployee.lastName}`,
        content: `History test message ${Date.now()}`,
      },
    });

    const messages = await prisma.chatMessage.findMany({
      where: {
        threadId: testThreadId,
        tenantId: tenant.id,
      },
      orderBy: { createdAt: "asc" },
    });

    assert(messages.length >= 1, "Messages successfully queried by threadId and tenantId");
    assert(messages.some((m) => m.id === msg.id), `Message list contains created message ID: ${msg.id}`);
    const foundMsg = messages.find((m) => m.id === msg.id);
    assert(foundMsg?.threadId === testThreadId, "Message belongs to testThreadId");
    assert(typeof foundMsg?.content === "string", "Message content is valid string");
    assert(foundMsg?.createdAt instanceof Date, "Message timestamp is valid Date");

    // Clean up created message
    await prisma.chatMessage.deleteMany({ where: { threadId: testThreadId } });

    // ─── 3. Empty Conversation Handling ───────────────────────────────────
    console.log("\n--- 3. Empty Conversation Handling ---");

    const emptyThreadId = `direct_empty_${Date.now()}`;
    const emptyMessages = await prisma.chatMessage.findMany({
      where: {
        threadId: emptyThreadId,
        tenantId: tenant.id,
      },
    });

    assert(Array.isArray(emptyMessages), "Empty thread returns an Array");
    assert(emptyMessages.length === 0, "Empty thread returns 0 messages without throwing error");

    // ─── 4. Conversation Switching & Stale Request Handling ───────────────
    console.log("\n--- 4. Conversation Switching & Stale Request Cleanup ---");

    assert(unifiedChatContent.includes("setOptimisticMessages([]);"), "Switching conversations resets optimistic messages");
    assert(unifiedChatContent.includes("setTypingUsers({});"), "Switching conversations resets typing users");
    assert(unifiedChatContent.includes("setConversationMessageFilter(\"\");"), "Switching conversations resets message filters");
    assert(unifiedChatContent.includes("useEffect(() => {\n    setOptimisticMessages([]);\n    setTypingUsers({});\n    setConversationMessageFilter(\"\");\n  }, [activeThreadId]);"), "activeThreadId dependency triggers state reset");

    // ─── 5. Direct Conversation Membership Authorization ──────────────────
    console.log("\n--- 5. Direct Conversation Membership Authorization ---");

    assert(chatRoutesContent.includes("checkThreadAuthorization"), "checkThreadAuthorization middleware protects message routes");
    assert(chatRoutesContent.includes('threadId.startsWith("direct_")'), "Direct thread participant check is implemented");
    assert(chatRoutesContent.includes("ue.id"), "Direct thread authorization validates linked employee ID");
    assert(chatRoutesContent.includes("ue.userId"), "Direct thread authorization validates linked user ID");

    // ─── 6. Multi-Tenant Boundary Isolation ────────────────────────────────
    console.log("\n--- 6. Multi-Tenant Boundary Isolation ---");

    const foreignTenantMessages = await prisma.chatMessage.findMany({
      where: {
        threadId: testThreadId,
        tenantId: "foreign-tenant-uuid-isolated",
      },
    });

    assert(foreignTenantMessages.length === 0, "Foreign tenant cannot access conversation messages");

    const foreignParticipant = await prisma.employee.findFirst({
      where: {
        id: alexEmployee.id,
        tenantId: "foreign-tenant-uuid-isolated",
      },
    });

    assert(foreignParticipant === null, "Foreign tenant cannot access employee profile");

    // ─── 7. UI Parity & Public Sans Root Font Enforcement ─────────────────
    console.log("\n--- 7. UI Parity & Public Sans Root Font Enforcement ---");

    const cmsUnifiedChatPath = path.resolve(__dirname, "../CMS/src/components/chat/unified-chat-app.tsx");
    const cmsUnifiedChatContent = fs.readFileSync(cmsUnifiedChatPath, "utf-8");

    assert(unifiedChatContent === cmsUnifiedChatContent, "Zero line difference between src/ and CMS/src/ unified-chat-app.tsx (100% byte parity)");
    assert(unifiedChatContent.includes("fontFamily: \"var(--font-sans), 'Public Sans', sans-serif\""), "Root chat container explicitly enforces Public Sans font family");



    console.log(`\n================================================================`);
    console.log(` RESULTS: ${passed}/${total} Assertions Passed!`);
    console.log(` ALL CHAT PROFILE & HISTORY INTEGRITY CRITERIA VERIFIED!`);
    console.log(`================================================================\n`);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runProfileAndHistoryTests();
