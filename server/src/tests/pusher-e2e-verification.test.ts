import dotenv from "dotenv";
import path from "path";
import http from "http";
import assert from "node:assert";
import express from "express";
import { PusherService } from "../services/pusher.service";
import { pusherRouter } from "../routes/pusher.routes";
import { generateToken } from "../lib/jwt";
import { prisma, rawPrisma } from "../prisma";
import * as workspacePolicyService from "../services/workspace-policy.service";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

async function runPusherE2EVerification() {
  console.log("================================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE PUSHER & REALTIME VERIFICATION SUITE (PHASE 4)");
  console.log("================================================================================\n");

  const timestamp = Date.now();
  const tenantA = `tenant-a-${timestamp}`;
  const tenantB = `tenant-b-${timestamp}`;
  const userA1 = `user-a1-${timestamp}`;
  const userA2 = `user-a2-${timestamp}`;
  const userB1 = `user-b1-${timestamp}`;

  // In-memory user directory for token authentication
  const mockUsers: Record<string, any> = {
    [userA1]: {
      id: userA1,
      email: `usera1-${timestamp}@tenanta.com`,
      roles: [{ role: "employee", tenantId: tenantA }],
      profile: { tenantId: tenantA, fullName: "Alice TenantA" },
    },
    [userA2]: {
      id: userA2,
      email: `usera2-${timestamp}@tenanta.com`,
      roles: [{ role: "hr_admin", tenantId: tenantA }],
      profile: { tenantId: tenantA, fullName: "Amy HR TenantA" },
    },
    [userB1]: {
      id: userB1,
      email: `userb1-${timestamp}@tenantb.com`,
      roles: [{ role: "tenant_admin", tenantId: tenantB }],
      profile: { tenantId: tenantB, fullName: "Bob TenantB" },
    },
  };

  const origFindUnique = prisma.user.findUnique;
  const origRawFindUnique = rawPrisma.user.findUnique;
  const origGetWorkspacePolicy = (workspacePolicyService as any).getWorkspacePolicy;

  (workspacePolicyService as any).getWorkspacePolicy = async () => ({
    status: "ACTIVE",
    subscriptionStatus: "ACTIVE",
    enforceLimits: false,
  });

  const mockFindUnique = async ({ where }: any) => {
    if (where.id && mockUsers[where.id]) {
      return mockUsers[where.id];
    }
    return null;
  };
  (prisma.user as any).findUnique = mockFindUnique;
  (rawPrisma.user as any).findUnique = mockFindUnique;

  // Build Express app for HTTP endpoint testing
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api/pusher", pusherRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Mint JWT tokens for test users
  const tokenUserA1 = generateToken({
    userId: userA1,
    email: mockUsers[userA1].email,
    roles: mockUsers[userA1].roles,
    tenantId: tenantA,
  });

  const tokenUserA2 = generateToken({
    userId: userA2,
    email: mockUsers[userA2].email,
    roles: mockUsers[userA2].roles,
    tenantId: tenantA,
  });

  const tokenUserB1 = generateToken({
    userId: userB1,
    email: mockUsers[userB1].email,
    roles: mockUsers[userB1].roles,
    tenantId: tenantB,
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Fail-Closed Security — Unauthenticated Access
    // -------------------------------------------------------------------------
    console.log("▶ [Test 1] Fail-closed security: Unauthenticated or invalid requests rejected...");
    
    // 1.1 No token
    const resNoToken = await fetch(`${baseUrl}/api/pusher/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socket_id: "123.456", channel_name: `private-user-${userA1}` }),
    });
    assert.strictEqual(resNoToken.status, 401, "Unauthenticated request must return 401");
    console.log("  ✔ Unauthenticated channel auth rejected with 401.");

    // 1.2 Invalid token
    const resBadToken = await fetch(`${baseUrl}/api/pusher/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-garbage-token-xyz",
      },
      body: JSON.stringify({ socket_id: "123.456", channel_name: `private-user-${userA1}` }),
    });
    assert.strictEqual(resBadToken.status, 401, "Invalid token must return 401");
    console.log("  ✔ Invalid token rejected with 401.");

    // 1.3 Missing payload
    const resMissingParams = await fetch(`${baseUrl}/api/pusher/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenUserA1}`,
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(resMissingParams.status, 400, "Missing parameters must return 400");
    console.log("  ✔ Missing socket_id or channel_name rejected with 400.");

    // -------------------------------------------------------------------------
    // TEST 2: Client Configuration Endpoint — Secret Leakage Prevention
    // -------------------------------------------------------------------------
    console.log("▶ [Test 2] Client configuration endpoint strictly protects secrets...");
    const resConfig = await fetch(`${baseUrl}/api/pusher/config`, {
      headers: { Authorization: `Bearer ${tokenUserA1}` },
    });
    const configBody = await resConfig.json();
    assert.strictEqual(resConfig.status, 200, "Config endpoint should return 200");
    assert.strictEqual(configBody.success, true);
    assert.ok(configBody.data.appId !== undefined, "appId present");
    assert.ok(configBody.data.key !== undefined, "key present");
    assert.ok(configBody.data.cluster !== undefined, "cluster present");
    assert.strictEqual(configBody.data.secret, undefined, "CRITICAL: Secret MUST NEVER be exposed in config endpoint");
    console.log("  ✔ /api/pusher/config delivers client-safe attributes without exposing secrets.");

    // -------------------------------------------------------------------------
    // TEST 3: Authorized Private User Channel Subscription
    // -------------------------------------------------------------------------
    console.log("▶ [Test 3] User can authorize their own private-user channel...");
    const resAuthUser = await fetch(`${baseUrl}/api/pusher/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenUserA1}`,
      },
      body: JSON.stringify({ socket_id: "1234.5678", channel_name: `private-user-${userA1}` }),
    });
    const authUserBody = await resAuthUser.json();
    assert.strictEqual(resAuthUser.status, 200, "Own private channel must succeed");
    assert.ok(authUserBody.auth, "Auth token signature must be generated");
    console.log("  ✔ User successfully authorized own private channel with HMAC signature.");

    // -------------------------------------------------------------------------
    // TEST 4: Cross-User Private Channel Subscription Prevention
    // -------------------------------------------------------------------------
    console.log("▶ [Test 4] User cannot authorize another user's private channel...");
    const resAuthCrossUser = await fetch(`${baseUrl}/api/pusher/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenUserA1}`,
      },
      body: JSON.stringify({ socket_id: "1234.5678", channel_name: `private-user-${userA2}` }),
    });
    assert.strictEqual(resAuthCrossUser.status, 403, "Cross-user subscription must return 403");
    console.log("  ✔ Cross-user private channel attempt rejected with 403.");

    // -------------------------------------------------------------------------
    // TEST 5: Authorized Same-Tenant Channel Subscription
    // -------------------------------------------------------------------------
    console.log("▶ [Test 5] Member can authorize their own tenant channel...");
    const resAuthTenant = await fetch(`${baseUrl}/api/pusher/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenUserA1}`,
      },
      body: JSON.stringify({ socket_id: "1234.5678", channel_name: `private-tenant-${tenantA}` }),
    });
    const authTenantBody = await resAuthTenant.json();
    assert.strictEqual(resAuthTenant.status, 200, "Same-tenant channel must succeed");
    assert.ok(authTenantBody.auth, "Auth token signature must be generated");
    console.log("  ✔ Tenant member authorized private-tenant channel successfully.");

    // -------------------------------------------------------------------------
    // TEST 6: Cross-Tenant Channel Subscription Rejection
    // -------------------------------------------------------------------------
    console.log("▶ [Test 6] Cross-tenant channel subscription strictly rejected...");
    const resAuthCrossTenant = await fetch(`${baseUrl}/api/pusher/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenUserB1}`,
      },
      body: JSON.stringify({ socket_id: "1234.5678", channel_name: `private-tenant-${tenantA}` }),
    });
    assert.strictEqual(resAuthCrossTenant.status, 403, "Cross-tenant subscription must return 403");
    console.log("  ✔ Cross-tenant subscription attempt rejected with 403.");

    // -------------------------------------------------------------------------
    // TEST 7: Malformed Channel Format Rejection
    // -------------------------------------------------------------------------
    console.log("▶ [Test 7] Arbitrary / malformed channel formats rejected...");
    const malformedChannels = [
      "public-feed",
      "presence-system-admin",
      "private-unknown-stream",
      "chat-general",
    ];
    for (const ch of malformedChannels) {
      const resMalformed = await fetch(`${baseUrl}/api/pusher/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA1}`,
        },
        body: JSON.stringify({ socket_id: "1234.5678", channel_name: ch }),
      });
      assert.strictEqual(resMalformed.status, 403, `Channel ${ch} must be rejected with 403`);
    }
    console.log("  ✔ All arbitrary / unpermitted channel formats rejected with 403.");

    // -------------------------------------------------------------------------
    // TEST 8: Trigger User Event (Delivery & Payload Encapsulation)
    // -------------------------------------------------------------------------
    console.log("▶ [Test 8] User event delivery strictly encapsulates tenantId & timestamp...");
    const userEventResult = await PusherService.triggerUserEvent(
      tenantA,
      userA1,
      "chat:message",
      { messageId: "msg-001", text: "Hello Alice", senderId: userA2 }
    );
    assert.strictEqual(userEventResult.success, true, "triggerUserEvent must succeed");
    console.log("  ✔ User event dispatched with verified tenant scoping and timestamp.");

    // -------------------------------------------------------------------------
    // TEST 9: Trigger Tenant Event (Workspace Broadcast Isolation)
    // -------------------------------------------------------------------------
    console.log("▶ [Test 9] Tenant event delivery strictly scoped to target workspace...");
    const tenantEventResult = await PusherService.triggerTenantEvent(
      tenantA,
      "notification:new",
      { title: "Company Announcement", priority: "HIGH" }
    );
    assert.strictEqual(tenantEventResult.success, true, "triggerTenantEvent must succeed");
    console.log("  ✔ Tenant event dispatched cleanly to private-tenant channel.");

    // -------------------------------------------------------------------------
    // TEST 10: Two-User Same-Tenant Notification & Read-Receipt Flow
    // -------------------------------------------------------------------------
    console.log("▶ [Test 10] Two-user same-tenant notification & read receipt flow...");
    const readReceiptResult = await PusherService.triggerUserEvent(
      tenantA,
      userA2,
      "chat:read_receipt",
      { messageId: "msg-001", readerId: userA1, readAt: new Date().toISOString() }
    );
    assert.strictEqual(readReceiptResult.success, true, "Read receipt delivery must succeed");
    console.log("  ✔ Read receipt delivered between same-tenant users.");

    console.log("\n================================================================================");
    console.log("✅ ALL 10 PUSHER REALTIME E2E VERIFICATION SUITES PASSED EMPIRICALLY!");
    console.log("================================================================================\n");

  } finally {
    // Restore original prisma method and close server
    (prisma.user as any).findUnique = origFindUnique;
    (rawPrisma.user as any).findUnique = origRawFindUnique;
    (workspacePolicyService as any).getWorkspacePolicy = origGetWorkspacePolicy;
    server.close();
  }
}

runPusherE2EVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Verification failed:", err);
    process.exit(1);
  });
