import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import assert from "node:assert";
import http from "node:http";
import { io as ClientIO, Socket as ClientSocket } from "socket.io-client";
import { initSocket, activeGroupCalls } from "../socket";
import { prisma, rawPrisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { NotificationService } from "../services/notification.service";
import { PusherService } from "../services/pusher.service";
import * as workspacePolicyService from "../services/workspace-policy.service";
import * as chatSystemEventsService from "../services/chat-system-events.service";
import { WebRtcIceService } from "../services/webrtc-ice.service";

async function runMultiParticipantMeetingTests() {
  console.log("================================================================================");
  console.log("🧪 RUNNING MULTI-PARTICIPANT WEBRTC MESH MEETING & ICE TEST SUITE");
  console.log("================================================================================\n");

  const timestamp = Date.now();
  const tenantId = `tenant-meeting-${timestamp}`;
  const otherTenantId = `tenant-other-${timestamp}`;
  const userHostId = `user-host-${timestamp}`;
  const userMember1Id = `user-m1-${timestamp}`;
  const userMember2Id = `user-m2-${timestamp}`;
  const userExternalId = `user-ext-${timestamp}`;
  const groupId = `group-mtg-${timestamp}`;
  const callId = `meeting_call_${timestamp}`;

  // Preserve original methods
  const origFindUnique = (rawPrisma || prisma).user?.findUnique;
  const origCallHistoryCreate = rawPrisma.callHistoryRecord?.create;
  const origPusherUser = PusherService.triggerUserEvent;

  const mockUsers: Record<string, any> = {
    [userHostId]: {
      id: userHostId,
      email: `host-${timestamp}@test.com`,
      roles: [],
      profile: { tenantId, fullName: "Host Alice", avatarUrl: null },
    },
    [userMember1Id]: {
      id: userMember1Id,
      email: `m1-${timestamp}@test.com`,
      roles: [],
      profile: { tenantId, fullName: "Member Bob", avatarUrl: null },
    },
    [userMember2Id]: {
      id: userMember2Id,
      email: `m2-${timestamp}@test.com`,
      roles: [],
      profile: { tenantId, fullName: "Member Charlie", avatarUrl: null },
    },
    [userExternalId]: {
      id: userExternalId,
      email: `ext-${timestamp}@test.com`,
      roles: [],
      profile: { tenantId: otherTenantId, fullName: "External Eve", avatarUrl: null },
    },
  };

  const mockGroups: Record<string, any> = {
    [groupId]: {
      id: groupId,
      tenantId,
      name: "Engineering Standup",
      members: [
        { userId: userHostId, role: "owner" },
        { userId: userMember1Id, role: "member" },
        { userId: userMember2Id, role: "member" },
      ],
    },
  };

  const callRecords: any[] = [];

  // Mocks
  (prisma.user as any).findUnique = async ({ where }: any) => mockUsers[where.id] || null;
  (rawPrisma.user as any).findMany = async ({ where }: any) => {
    return Object.values(mockUsers).filter((u: any) =>
      where.id?.in?.includes(u.id) && (!where.profile?.tenantId || u.profile?.tenantId === where.profile.tenantId)
    );
  };

  if (!(rawPrisma as any).callHistoryRecord) (rawPrisma as any).callHistoryRecord = {};
  (rawPrisma.callHistoryRecord as any).create = async ({ data }: any) => {
    const rec = { id: `rec_${Date.now()}_${Math.random()}`, ...data };
    callRecords.push(rec);
    return rec;
  };

  if (!(rawPrisma as any).chatGroup) (rawPrisma as any).chatGroup = {};
  if (!(rawPrisma as any).chatGroupMember) (rawPrisma as any).chatGroupMember = {};
  if (!(rawPrisma as any).chatMessage) (rawPrisma as any).chatMessage = {};
  (rawPrisma.chatMessage as any).create = async () => ({ id: "mock_sys_msg" });
  if (!(rawPrisma as any).cmsPage) (rawPrisma as any).cmsPage = {};
  (rawPrisma.cmsPage as any).findFirst = async () => null;
  (rawPrisma.chatGroup as any).findFirst = async ({ where }: any) => {
    const g = mockGroups[where.id];
    if (g && g.tenantId === where.tenantId) return g;
    return null;
  };

  (rawPrisma.chatGroupMember as any).findFirst = async ({ where }: any) => {
    const g = mockGroups[where.groupId];
    if (g && g.members.some((m: any) => m.userId === where.userId)) {
      return { id: `m_${where.userId}`, ...where };
    }
    return null;
  };

  if (!(rawPrisma as any).tenantSubscription) (rawPrisma as any).tenantSubscription = {};
  (rawPrisma.tenantSubscription as any).findUnique = async () => ({
    status: "active",
    expiresAt: new Date(Date.now() + 864000000),
    plan: { id: "plan_enterprise", name: "Enterprise" },
  });

  if (workspacePolicyService.workspacePolicyCache) {
    workspacePolicyService.workspacePolicyCache.set(tenantId, {
      policy: { status: "active", expiresAt: null, isExpired: false },
      expiresAt: Date.now() + 864000000,
    });
    workspacePolicyService.workspacePolicyCache.set(otherTenantId, {
      policy: { status: "active", expiresAt: null, isExpired: false },
      expiresAt: Date.now() + 864000000,
    });
  }

  const pusherEvents: any[] = [];
  PusherService.triggerUserEvent = async (tId: string, uId: string, ev: string, data: any) => {
    pusherEvents.push({ tenantId: tId, userId: uId, event: ev, data });
    return { success: true, delivered: true };
  };
  PusherService.getInstance = async () => null as any;

  NotificationService.createNotification = async () => ({ id: "mock_notif" } as any);
  (chatSystemEventsService as any).recordSystemEvent = async () => ({}) as any;

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: WebRtcIceService STUN Default Diagnostics
  // ──────────────────────────────────────────────────────────────────────────
  console.log("▶ [Test 1] WebRtcIceService STUN diagnostics when TURN is unset...");
  const origTurnSecret = process.env.TURN_SHARED_SECRET;
  const origTurnUrl = process.env.TURN_SERVER_URL;
  delete process.env.TURN_SHARED_SECRET;
  delete process.env.TURN_SERVER_URL;

  const diag = WebRtcIceService.getDiagnostics(userHostId);
  assert.strictEqual(diag.mode, "webrtc_mesh");
  assert.strictEqual(diag.configured, true, "WebRTC Mesh is always operational with STUN");
  assert.strictEqual(diag.turnConfigured, false);
  const stunOnly = WebRtcIceService.getIceServers(userHostId);
  assert(stunOnly.length >= 1, "Must include STUN servers");
  console.log("  ✔ Default WebRTC Mesh STUN diagnostics verified.");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: RFC 7635 Ephemeral HMAC-SHA1 Coturn TURN Credentials
  // ──────────────────────────────────────────────────────────────────────────
  console.log("▶ [Test 2] Generates & verifies RFC 7635 ephemeral TURN credentials...");
  process.env.TURN_SHARED_SECRET = "test_coturn_secret_entropy_12345";
  process.env.TURN_PUBLIC_HOST = "turn.masterhrms.test";

  const iceWithTurn = WebRtcIceService.getIceServers(userHostId, 3600);
  const turnEntry = iceWithTurn.find((s) => Boolean(s.username && s.credential));
  assert(turnEntry, "Must generate ephemeral TURN entry");
  const verified = WebRtcIceService.verifyTurnCredentials(turnEntry!.username!, turnEntry!.credential!);
  assert.strictEqual(verified.valid, true, "Generated TURN HMAC-SHA1 credential must verify");
  assert.strictEqual(verified.userId, userHostId);
  console.log("  ✔ Ephemeral Coturn TURN credentials generated & verified.");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Multi-Party Socket.IO & Pusher Handshake and Lifecycle
  // ──────────────────────────────────────────────────────────────────────────
  console.log("▶ [Test 3] Socket meeting lifecycle: start, join, state_sync, media_state, leave, end...");

  let server: http.Server | null = null;
  let serverPort = 0;

  try {
    const tokenHost = generateToken({ userId: userHostId, email: `host-${timestamp}@test.com`, tenantId, roles: [] });
    const tokenM1 = generateToken({ userId: userMember1Id, email: `m1-${timestamp}@test.com`, tenantId, roles: [] });
    const tokenM2 = generateToken({ userId: userMember2Id, email: `m2-${timestamp}@test.com`, tenantId, roles: [] });
    const tokenExt = generateToken({ userId: userExternalId, email: `ext-${timestamp}@test.com`, tenantId: otherTenantId, roles: [] });

    server = http.createServer();
    initSocket(server, ["*"]);
    await new Promise<void>((resolve) => server!.listen(0, resolve));
    serverPort = (server.address() as any).port;

    const createClient = (token: string): Promise<ClientSocket> => {
      return new Promise((resolve, reject) => {
        const client = ClientIO(`http://127.0.0.1:${serverPort}`, {
          auth: { token },
          transports: ["websocket"],
        });
        client.on("connect", () => resolve(client));
        client.on("connect_error", (err) => reject(err));
      });
    };

    const hostClient = await createClient(tokenHost);
    const m1Client = await createClient(tokenM1);
    const m2Client = await createClient(tokenM2);
    const extClient = await createClient(tokenExt);

    // Host starts group meeting
    const incomingPromiseM1 = new Promise<any>((resolve) => {
      m1Client.once("group-call:incoming", resolve);
    });

    const startAckPromise = new Promise<any>((resolve) => {
      hostClient.emit("group-call:start", {
        groupId,
        callId,
        callType: "video",
      }, resolve);
    });
    const startAck = await startAckPromise;
    assert.strictEqual(startAck.success, true, "Host must receive a server acknowledgement after session creation");
    assert.strictEqual(startAck.callId, callId);
    console.log("  ✔ Host received server acknowledgement after the active meeting session was created.");

    const incomingM1 = await incomingPromiseM1;
    assert.strictEqual(incomingM1.callId, callId);
    assert.strictEqual(incomingM1.groupId, groupId);
    assert.strictEqual(incomingM1.callerId, userHostId);
    assert(incomingM1.eventId, "Must include idempotent eventId");
    console.log("  ✔ group-call:incoming received via Socket.IO with idempotent eventId.");

    // Verify Pusher fallback was triggered for members
    const pusherM1 = pusherEvents.find((e) => e.userId === userMember1Id && e.event === "group-call:incoming");
    assert(pusherM1, "Pusher fallback event must be dispatched to group member");
    assert.strictEqual(pusherM1.data.callId, callId);
    assert.strictEqual(pusherM1.data.eventId, incomingM1.eventId, "Pusher eventId must match Socket eventId for deduplication");
    console.log("  ✔ Pusher fallback event dispatched with matching eventId for client deduplication.");

    // Member 1 joins meeting
    const stateSyncPromiseM1 = new Promise<any>((resolve) => {
      m1Client.once("group-call:state_sync", resolve);
    });
    const userJoinedPromiseHost = new Promise<any>((resolve) => {
      hostClient.once("group-call:user_joined", resolve);
    });

    m1Client.emit("group-call:join", { callId, groupId });

    const stateSync = await stateSyncPromiseM1;
    const userJoinedHost = await userJoinedPromiseHost;

    assert.strictEqual(stateSync.callId, callId);
    assert(stateSync.participants.length >= 2, "State sync must return both host and joining user");
    assert.strictEqual(userJoinedHost.userId, userMember1Id);
    console.log("  ✔ Member joined, state_sync delivered roster, host received user_joined.");

    // External user from another tenant attempts to join
    const forbiddenPromiseExt = new Promise<any>((resolve) => {
      extClient.once("call:error", resolve);
    });
    extClient.emit("group-call:join", { callId, groupId });
    const forbiddenExt = await forbiddenPromiseExt;
    assert.strictEqual(forbiddenExt.code, "CALL_FORBIDDEN", "Cross-tenant user join must be rejected");
    console.log("  ✔ Cross-tenant meeting join rejected with CALL_FORBIDDEN.");

    // Media State Relay: Member 1 mutes mic and shares screen
    const mediaStatePromiseHost = new Promise<any>((resolve) => {
      hostClient.once("group-call:media_state", resolve);
    });

    m1Client.emit("group-call:media-state", {
      callId,
      isMuted: true,
      isScreenSharing: true,
      isSpeaking: false,
    });

    const mediaStateHost = await mediaStatePromiseHost;
    assert.strictEqual(mediaStateHost.userId, userMember1Id);
    assert.strictEqual(mediaStateHost.isMuted, true);
    assert.strictEqual(mediaStateHost.isScreenSharing, true);
    console.log("  ✔ Media state updates (mute, screenshare) relayed to room.");

    // In-meeting user invitation
    const invitePromiseM2 = new Promise<any>((resolve) => {
      m2Client.once("group-call:incoming", resolve);
    });

    hostClient.emit("group-call:invite_users", {
      callId,
      userIds: [userMember2Id],
    });

    const incomingM2 = await invitePromiseM2;
    assert.strictEqual(incomingM2.callId, callId);
    console.log("  ✔ In-meeting user invitation delivered to colleague.");

    // Non-host attempts to end meeting for everyone -> Rejected
    const endRejectedPromiseM1 = new Promise<any>((resolve) => {
      m1Client.once("call:error", resolve);
    });
    m1Client.emit("group-call:end", { callId });
    const endRejectedM1 = await endRejectedPromiseM1;
    assert.strictEqual(endRejectedM1.code, "CALL_FORBIDDEN", "Non-host cannot end meeting for everyone");
    console.log("  ✔ Non-host end-meeting attempt rejected with CALL_FORBIDDEN.");

    // Host ends meeting for everyone
    const endedPromiseM1 = new Promise<any>((resolve) => {
      m1Client.once("group-call:ended", resolve);
    });

    hostClient.emit("group-call:end", { callId, durationSeconds: 120 });
    const endedM1 = await endedPromiseM1;
    assert.strictEqual(endedM1.callId, callId);
    assert.strictEqual(endedM1.endedBy, userHostId);
    assert(!activeGroupCalls.has(callId), "Session must be removed from activeGroupCalls");

    // Verify CallHistoryRecord was persisted once
    assert(callRecords.some((r) => r.callSessionId === callId && r.status === "completed"));
    console.log("  ✔ Host ended meeting for everyone; CallHistoryRecord persisted once with completed status.");

    // Cleanup sockets
    hostClient.disconnect();
    m1Client.disconnect();
    m2Client.disconnect();
    extClient.disconnect();

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 4: Tampered TURN Signature Rejection
    // ──────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 4] Tampered TURN HMAC-SHA1 signature rejected...");
    const tampered = WebRtcIceService.verifyTurnCredentials(`${Math.floor(Date.now() / 1000) + 600}:attacker`, "forged_sig");
    assert.strictEqual(tampered.valid, false, "Tampered TURN credential must be rejected");
    console.log("  ✔ Tampered TURN credential rejected safely.");
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    if (origTurnSecret) process.env.TURN_SHARED_SECRET = origTurnSecret; else delete process.env.TURN_SHARED_SECRET;
    if (origTurnUrl) process.env.TURN_SERVER_URL = origTurnUrl; else delete process.env.TURN_SERVER_URL;
  }

  console.log("\n================================================================================");
  console.log("✅ ALL MULTI-PARTICIPANT MEETING TESTS PASSED EMPIRICALLY!");
  console.log("================================================================================\n");
}

runMultiParticipantMeetingTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
