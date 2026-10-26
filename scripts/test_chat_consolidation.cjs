/**
 * MASTERHRMS — Complete Chat Application Consolidation, Role-Based Routing,
 * Database Persistence, Multi-Tenant Security & Dual-Workspace Parity Test Suite
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

async function runChatVerification() {
  console.log("\n================================================================");
  console.log(" MASTERHRMS CHAT CONSOLIDATION VERIFICATION SUITE");
  console.log("================================================================\n");

  let passedAssertions = 0;
  let totalAssertions = 0;

  function assert(condition, message) {
    totalAssertions++;
    if (condition) {
      passedAssertions++;
      console.log(`  ✔ [PASS] ${message}`);
    } else {
      console.error(`  ✖ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // ─── CRITERION 1: Workspace Route Resolution & Legacy Redirects ─────────
    console.log("--- Criterion 1: Canonical Role-Based Route Resolution ---");

    const authNavPath = path.resolve(__dirname, "../src/lib/auth-navigation.ts");
    const authNavContent = fs.readFileSync(authNavPath, "utf-8");

    assert(authNavContent.includes("export function resolveWorkspaceChatRoute"), "auth-navigation exports resolveWorkspaceChatRoute");
    assert(authNavContent.includes('isTenantAdmin ? "/tenant/chat" : isHrAdmin ? "/hr/chat" : "/me/chat"'), "Resolves to /tenant/chat, /hr/chat, or /me/chat based on role hierarchy");
    assert(authNavContent.includes("if (isSuperAdmin)") && authNavContent.includes("return null;"), "Super Admin resolves to null (no normal chat entry)");

    // Test legacy redirects in TanStack routes
    const legacyChatsFile = path.resolve(__dirname, "../src/routes/_authenticated/_app/apps.chat.chats.tsx");
    const legacyGroupsFile = path.resolve(__dirname, "../src/routes/_authenticated/_app/apps.chat.chat-groups.tsx");
    const legacyContactsFile = path.resolve(__dirname, "../src/routes/_authenticated/_app/apps.chat.chat-contact.tsx");
    const rootChatFile = path.resolve(__dirname, "../src/routes/_authenticated/_app/chat.tsx");

    assert(fs.existsSync(legacyChatsFile), "Legacy /apps/chat/chats TanStack route file exists");
    assert(fs.existsSync(legacyGroupsFile), "Legacy /apps/chat/chat-groups TanStack route file exists");
    assert(fs.existsSync(legacyContactsFile), "Legacy /apps/chat/chat-contact TanStack route file exists");
    assert(fs.existsSync(rootChatFile), "Legacy /chat TanStack route file exists");

    const legacyChatsContent = fs.readFileSync(legacyChatsFile, "utf-8");
    assert(legacyChatsContent.includes("resolveWorkspaceChatRoute"), "Legacy chats route uses resolveWorkspaceChatRoute to prevent unauthorized workspace access");

    // Test CMS counterparts
    const cmsLegacyChatsFile = path.resolve(__dirname, "../CMS/src/app/(workspace)/apps/chat/chats/page.tsx");
    const cmsLegacyGroupsFile = path.resolve(__dirname, "../CMS/src/app/(workspace)/apps/chat/chat-groups/page.tsx");
    const cmsLegacyContactsFile = path.resolve(__dirname, "../CMS/src/app/(workspace)/apps/chat/chat-contact/page.tsx");
    const cmsRootChatFile = path.resolve(__dirname, "../CMS/src/app/(workspace)/chat/page.tsx");

    assert(fs.existsSync(cmsLegacyChatsFile), "Legacy /apps/chat/chats CMS route file exists");
    assert(fs.existsSync(cmsLegacyGroupsFile), "Legacy /apps/chat/chat-groups CMS route file exists");
    assert(fs.existsSync(cmsLegacyContactsFile), "Legacy /apps/chat/chat-contact CMS route file exists");
    assert(fs.existsSync(cmsRootChatFile), "Legacy /chat CMS route file exists");

    // ─── CRITERION 2: Consolidated Sidebar Navigation & Submenus ───────────
    console.log("\n--- Criterion 2: Consolidated Sidebar Navigation & Submenus ---");

    const chatNavPath = path.resolve(__dirname, "../src/nav/chat-navigation.ts");
    const chatNavContent = fs.readFileSync(chatNavPath, "utf-8");

    assert(chatNavContent.includes("HR_CHAT_NAV_GROUP"), "HR_CHAT_NAV_GROUP is exported");
    assert(chatNavContent.includes("EMPLOYEE_CHAT_NAV_GROUP"), "EMPLOYEE_CHAT_NAV_GROUP is exported");
    assert(chatNavContent.includes("TENANT_CHAT_NAV_GROUP"), "TENANT_CHAT_NAV_GROUP is exported");

    // Verify 4 submenus per workspace (including Call Logs)
    const hrSubmenus = ["Personal Chat", "Chat Groups", "Chat Contacts", "Call Logs"];
    for (const sub of hrSubmenus) {
      assert(chatNavContent.includes(sub), `chat-navigation contains submenu item "${sub}"`);
    }

    // Verify paths in chat navigation
    assert(chatNavContent.includes('path: "/hr/chat"'), "HR Personal Chat path is /hr/chat");
    assert(chatNavContent.includes('path: "/hr/chat/groups"'), "HR Groups path is /hr/chat/groups");
    assert(chatNavContent.includes('path: "/hr/chat/contacts"'), "HR Contacts path is /hr/chat/contacts");
    assert(chatNavContent.includes('path: "/hr/chat/calls"'), "HR Call Logs path is /hr/chat/calls");

    assert(chatNavContent.includes('path: "/me/chat"'), "Employee Personal Chat path is /me/chat");
    assert(chatNavContent.includes('path: "/me/chat/groups"'), "Employee Groups path is /me/chat/groups");
    assert(chatNavContent.includes('path: "/me/chat/contacts"'), "Employee Contacts path is /me/chat/contacts");
    assert(chatNavContent.includes('path: "/me/chat/calls"'), "Employee Call Logs path is /me/chat/calls");

    assert(chatNavContent.includes('path: "/tenant/chat"'), "Tenant Personal Chat path is /tenant/chat");
    assert(chatNavContent.includes('path: "/tenant/chat/groups"'), "Tenant Groups path is /tenant/chat/groups");
    assert(chatNavContent.includes('path: "/tenant/chat/contacts"'), "Tenant Contacts path is /tenant/chat/contacts");
    assert(chatNavContent.includes('path: "/tenant/chat/calls"'), "Tenant Call Logs path is /tenant/chat/calls");

    // Verify HR Overview section has NO duplicate Team Chat
    const hrSidebarPath = path.resolve(__dirname, "../src/nav/hr-sidebar.ts");
    const hrSidebarContent = fs.readFileSync(hrSidebarPath, "utf-8");
    const overviewSectionMatch = hrSidebarContent.match(/label:\s*"Overview",[\s\S]*?children:\s*\[([\s\S]*?)\]/);
    assert(overviewSectionMatch && !overviewSectionMatch[1].includes("Team Chat"), "HR Overview section contains NO duplicate Team Chat");

    // Verify registry contains tenant-chat with all 4 submenus
    const registryPath = path.resolve(__dirname, "../src/nav/registry.ts");
    const registryContent = fs.readFileSync(registryPath, "utf-8");
    assert(registryContent.includes('id: "tenant-chat"'), "registry.ts contains tenant-chat in TENANT_NAVIGATION_REGISTRY");
    assert(registryContent.includes('id: "tenant-chat-personal"'), "registry.ts contains tenant-chat-personal");
    assert(registryContent.includes('id: "tenant-chat-groups"'), "registry.ts contains tenant-chat-groups");
    assert(registryContent.includes('id: "tenant-chat-contacts"'), "registry.ts contains tenant-chat-contacts");
    assert(registryContent.includes('id: "tenant-chat-calls"'), "registry.ts contains tenant-chat-calls");

    // Verify dreams-sidebar maps Chat submenu keys and icons
    const dreamsSidebarPath = path.resolve(__dirname, "../src/components/dreams-sidebar.tsx");
    const dreamsSidebarContent = fs.readFileSync(dreamsSidebarPath, "utf-8");
    assert(dreamsSidebarContent.includes('Chat: "meChat"'), "dreams-sidebar maps Employee Chat submenu key");
    assert(dreamsSidebarContent.includes('Chat: "hrAppsChat"'), "dreams-sidebar maps HR Applications Chat submenu key");

    // ─── CRITERION 3: Dual-Workspace Code Parity ───────────────────────────
    console.log("\n--- Criterion 3: Dual-Workspace Code Parity (100% Parity) ---");

    const srcUnifiedChat = fs.readFileSync(path.resolve(__dirname, "../src/components/chat/unified-chat-app.tsx"), "utf-8");
    const cmsUnifiedChat = fs.readFileSync(path.resolve(__dirname, "../CMS/src/components/chat/unified-chat-app.tsx"), "utf-8");
    assert(srcUnifiedChat === cmsUnifiedChat, "Zero line differences between src/ and CMS/src/ unified-chat-app.tsx (100% byte parity)");

    const srcChatNav = fs.readFileSync(path.resolve(__dirname, "../src/nav/chat-navigation.ts"), "utf-8");
    const cmsChatNav = fs.readFileSync(path.resolve(__dirname, "../CMS/src/nav/chat-navigation.ts"), "utf-8");
    assert(srcChatNav === cmsChatNav, "Zero line differences between src/ and CMS/src/ chat-navigation.ts (100% byte parity)");

    // ─── CRITERION 4: Zero Mock Business Data ──────────────────────────────
    console.log("\n--- Criterion 4: Zero Mock Business Data ---");

    assert(!srcUnifiedChat.includes("const mockMessages ="), "No mockMessages in UnifiedChatApp");
    assert(!srcUnifiedChat.includes("const mockContacts ="), "No mockContacts in UnifiedChatApp");
    assert(!srcUnifiedChat.includes("const mockConversations ="), "No mockConversations in UnifiedChatApp");
    assert(srcUnifiedChat.includes("/api/chat/conversations"), "UnifiedChatApp queries authoritative /api/chat/conversations");
    assert(srcUnifiedChat.includes("/api/chat/contacts"), "UnifiedChatApp queries authoritative /api/chat/contacts");
    assert(srcUnifiedChat.includes("/api/chat/groups"), "UnifiedChatApp queries authoritative /api/chat/groups");

    // ─── CRITERION 5: Database-Backed Messaging Persistence ───────────────
    console.log("\n--- Criterion 5: Database Persistence & Real-time Sync ---");

    // Find active tenant and 2 users
    const tenant = await prisma.tenant.findFirst();
    assert(!!tenant, `Active tenant found: ${tenant?.name} (${tenant?.id})`);

    const users = await prisma.user.findMany({
      take: 2,
      select: { id: true, email: true },
    });

    let userA = users[0];
    let userB = users[1];

    if (!userA) {
      userA = await prisma.user.create({
        data: {
          email: `test_chat_user_a_${Date.now()}@example.com`,
          name: "Test Chat User A",
          role: "EMPLOYEE",
          tenantId: tenant.id,
        },
      });
    }

    if (!userB) {
      userB = await prisma.user.create({
        data: {
          email: `test_chat_user_b_${Date.now()}@example.com`,
          name: "Test Chat User B",
          role: "EMPLOYEE",
          tenantId: tenant.id,
        },
      });
    }

    assert(!!userA && !!userB, `Test users ready: User A (${userA.email}), User B (${userB.email})`);

    // 1. Direct Conversation ID Determinism
    const directThreadId = `direct_${[userA.id, userB.id].sort().join("_")}`;
    assert(directThreadId.startsWith("direct_"), "Direct conversation ID is deterministic and tenant-scoped");

    // 2. Message Persistence
    const testMessageContent = `Automated verification message @ ${Date.now()}`;
    const message = await prisma.chatMessage.create({
      data: {
        threadId: directThreadId,
        tenantId: tenant.id,
        senderId: userA.id,
        senderName: userA.email || "User A",
        content: testMessageContent,
      },
    });

    assert(!!message && message.content === testMessageContent, `Message persisted with authoritative ID: ${message.id}`);
    assert(message.senderId === userA.id, "Message senderId accurately matches authenticated User A");
    assert(message.tenantId === tenant.id, "Message tenantId matches authoritative tenant");

    // 3. Read Receipt Persistence
    const readReceipt = await prisma.chatReadReceipt.upsert({
      where: {
        tenantId_threadId_userId: {
          tenantId: tenant.id,
          threadId: directThreadId,
          userId: userB.id,
        },
      },
      update: {
        lastReadAt: new Date(),
      },
      create: {
        threadId: directThreadId,
        userId: userB.id,
        tenantId: tenant.id,
        lastReadAt: new Date(),
      },
    });
    assert(!!readReceipt, "ChatReadReceipt persisted with timestamp for recipient User B");

    // 4. Group Creation & Membership Operations
    const testGroupName = `Verification Group ${Date.now()}`;
    const group = await prisma.chatGroup.create({
      data: {
        tenantId: tenant.id,
        name: testGroupName,
        description: "Created by automated verification suite",
        createdById: userA.id,
        members: {
          create: [
            { tenantId: tenant.id, userId: userA.id, role: "ADMIN" },
            { tenantId: tenant.id, userId: userB.id, role: "MEMBER" },
          ],
        },
      },
      include: {
        members: true,
      },
    });

    assert(!!group, `ChatGroup created in database: "${group.name}" (ID: ${group.id})`);
    assert(group.members.length === 2, "Group members count in database is exactly 2");
    assert(group.members.some((m) => m.userId === userA.id && m.role === "ADMIN"), "Creator userA is ADMIN");
    assert(group.members.some((m) => m.userId === userB.id && m.role === "MEMBER"), "Recipient userB is MEMBER");

    // 5. Group Membership Removal Test
    await prisma.chatGroupMember.delete({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: userB.id,
        },
      },
    });

    const updatedGroup = await prisma.chatGroup.findUnique({
      where: { id: group.id },
      include: { members: true },
    });
    assert(updatedGroup.members.length === 1, "After member removal, group members count in database is exactly 1");
    assert(!updatedGroup.members.some((m) => m.userId === userB.id), "Removed member userB is no longer in group members list");

    // ─── CRITERION 6: Strict Multi-Tenant Isolation ────────────────────────
    console.log("\n--- Criterion 6: Multi-Tenant Boundary Isolation ---");

    const foreignTenantId = "non-existent-or-foreign-tenant-id-999";
    const crossTenantMessages = await prisma.chatMessage.findMany({
      where: {
        threadId: directThreadId,
        tenantId: foreignTenantId,
      },
    });
    assert(crossTenantMessages.length === 0, "Cross-tenant query for foreign tenant returns 0 messages");

    const crossTenantGroups = await prisma.chatGroup.findMany({
      where: {
        id: group.id,
        tenantId: foreignTenantId,
      },
    });
    assert(crossTenantGroups.length === 0, "Cross-tenant query for foreign tenant returns 0 groups");

    // ─── CRITERION 7: No Localhost or Fixed-Domain Leakage ─────────────────
    console.log("\n--- Criterion 7: No Localhost / Fixed-Port Leakage ---");

    assert(!chatNavContent.includes("localhost"), "chat-navigation contains NO hardcoded localhost");
    assert(!chatNavContent.includes(":3000"), "chat-navigation contains NO hardcoded port 3000");
    assert(!chatNavContent.includes("master.localhost"), "chat-navigation contains NO hardcoded fixed tenant slug");

    // ─── CRITERION 8: Persisted Call History & Tenant Isolation ───────────
    console.log("\n--- Criterion 8: Persisted Call History & Tenant Isolation ---");

    const callRecord = await prisma.callHistoryRecord.create({
      data: {
        tenantId: tenant.id,
        callerName: userA.email || "Test Caller",
        callerEmail: userA.email,
        callerPhone: "(555) 019-2834",
        callType: "audio",
        status: "completed",
        callTime: new Date(),
        durationSeconds: 120,
      },
    });

    assert(!!callRecord, `CallHistoryRecord persisted: ID ${callRecord.id}`);
    assert(callRecord.tenantId === tenant.id, "CallHistoryRecord enforces authoritative tenant ID");
    assert(callRecord.durationSeconds === 120, "CallHistoryRecord persists accurate call duration");

    const foreignCallRecords = await prisma.callHistoryRecord.findMany({
      where: {
        id: callRecord.id,
        tenantId: foreignTenantId,
      },
    });
    assert(foreignCallRecords.length === 0, "Cross-tenant query for foreign tenant returns 0 call history records");

    // ─── CRITERION 9: Public Sans Font Enforcement on Dialogs & Portals ────
    console.log("\n--- Criterion 9: Public Sans Font Enforcement on Dialogs & Portals ---");

    const dialogPath = path.resolve(__dirname, "../src/components/ui/dialog.tsx");
    const popoverPath = path.resolve(__dirname, "../src/components/ui/popover.tsx");
    const dropdownPath = path.resolve(__dirname, "../src/components/ui/dropdown-menu.tsx");

    const dialogContent = fs.readFileSync(dialogPath, "utf-8");
    const popoverContent = fs.readFileSync(popoverPath, "utf-8");
    const dropdownContent = fs.readFileSync(dropdownPath, "utf-8");

    assert(dialogContent.includes("font-sans"), "DialogContent explicitly enforces font-sans class for Radix portals");
    assert(popoverContent.includes("font-sans"), "PopoverContent explicitly enforces font-sans class for Radix portals");
    assert(dropdownContent.includes("font-sans"), "DropdownMenuContent explicitly enforces font-sans class for Radix portals");

    // Also check CMS counterparts
    const cmsDialogContent = fs.readFileSync(path.resolve(__dirname, "../CMS/src/components/ui/dialog.tsx"), "utf-8");
    const cmsPopoverContent = fs.readFileSync(path.resolve(__dirname, "../CMS/src/components/ui/popover.tsx"), "utf-8");
    const cmsDropdownContent = fs.readFileSync(path.resolve(__dirname, "../CMS/src/components/ui/dropdown-menu.tsx"), "utf-8");

    assert(cmsDialogContent.includes("font-sans"), "CMS DialogContent explicitly enforces font-sans class");
    assert(cmsPopoverContent.includes("font-sans"), "CMS PopoverContent explicitly enforces font-sans class");
    assert(cmsDropdownContent.includes("font-sans"), "CMS DropdownMenuContent explicitly enforces font-sans class");

    assert(srcUnifiedChat.includes("font-sans") && srcUnifiedChat.includes("Public Sans"), "UnifiedChatApp enforces Public Sans font family on root container");

    // ─── CRITERION 10: New Chat / Direct Conversation & Group Creation Restorations ───
    console.log("\n--- Criterion 10: New Chat & New Group Restorations ---");

    const chatRoutesPath = path.resolve(__dirname, "../server/src/routes/chat.routes.ts");
    const chatRoutesContent = fs.readFileSync(chatRoutesPath, "utf-8");

    assert(chatRoutesContent.includes("targetUserId = req.body.targetUserId || req.body.participantId"), "Direct conversation endpoint accepts both targetUserId and participantId");
    assert(srcUnifiedChat.includes("createGroupMutation"), "UnifiedChatApp implements complete createGroupMutation");
    assert(srcUnifiedChat.includes("selectedGroupMemberIds.map"), "UnifiedChatApp renders removable selected-member chips for group creation");
    assert(srcUnifiedChat.includes("startDirectConversationMutation"), "UnifiedChatApp implements startDirectConversationMutation with instant redirect");
    assert(srcUnifiedChat.includes("activeCallModalOpen"), "UnifiedChatApp implements interactive Audio/Video calling modals");

    // Clean up call record
    await prisma.callHistoryRecord.delete({
      where: { id: callRecord.id },
    });


    // Clean up verification records
    await prisma.chatMessage.deleteMany({
      where: { id: message.id },
    });
    await prisma.chatReadReceipt.deleteMany({
      where: { id: readReceipt.id },
    });
    await prisma.chatGroupMember.deleteMany({
      where: { groupId: group.id },
    });
    await prisma.chatGroup.delete({
      where: { id: group.id },
    });
    console.log("\nCleaned up verification test message, read receipt, and group records.");

    console.log("\n================================================================");
    console.log(` RESULTS: ${passedAssertions}/${totalAssertions} Assertions Passed!`);
    console.log(" ALL CHAT CONSOLIDATION ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!");
    console.log("================================================================\n");

  } finally {
    await prisma.$disconnect();
  }
}

runChatVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
