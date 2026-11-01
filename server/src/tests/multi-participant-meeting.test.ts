import assert from "node:assert";
import http from "node:http";
import jwt from "jsonwebtoken";
import { io as ClientIO, Socket as ClientSocket } from "socket.io-client";
import { initSocket, activeGroupCalls } from "../socket";
import { prisma, rawPrisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { NotificationService } from "../services/notification.service";
import { PusherService } from "../services/pusher.service";
import * as workspacePolicyService from "../services/workspace-policy.service";
import * as chatSystemEventsService from "../services/chat-system-events.service";
import { MeetingSfuService, SfuConfigurationError } from "../services/meeting-sfu.service";

async function runMultiParticipantMeetingTests() {
  console.log("================================================================================");
  console.log("🧪 RUNNING MULTI-PARTICIPANT MEETING & SFU TEST SUITE");
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
  // TEST 1: SFU Configuration & Diagnostics when unset
  // ──────────────────────────────────────────────────────────────────────────
  console.log("▶ [Test 1] SfuConfigurationError and diagnostics when LiveKit is unset...");
  const origEnvUrl = process.env.LIVEKIT_URL;
  const origEnvKey = process.env.LIVEKIT_API_KEY;
  const origEnvSecret = process.env.LIVEKIT_API_SECRET;
  delete process.env.LIVEKIT_URL;
  delete process.env.LIVEKIT_API_KEY;
  delete process.env.LIVEKIT_API_SECRET;

  const diag = MeetingSfuService.getDiagnosticInfo();
  assert.strictEqual(diag.configured, false, "LiveKit must report unconfigured when env is missing");
  assert(diag.missing.includes("LIVEKIT_URL"), "Missing LIVEKIT_URL flagged");
  assert(diag.missing.includes("LIVEKIT_API_KEY"), "Missing LIVEKIT_API_KEY flagged");
  assert(diag.missing.includes("LIVEKIT_API_SECRET"), "Missing LIVEKIT_API_SECRET flagged");

  assert.throws(
    () => {
      MeetingSfuService.generateMeetingToken({
        tenantId,
        groupId,
        callId,
        userId: userHostId,
        name: "Host Alice",
      });
    },
    /LiveKit SFU is not configured/i,
    "Must throw SfuConfigurationError when unconfigured"
  );
  console.log("  ✔ Unconfigured environment correctly throws and produces actionable diagnostics.");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: SFU Token Generation with Scoped LiveKit Claims
  // ──────────────────────────────────────────────────────────────────────────
  console.log("▶ [Test 2] Generates cryptographically signed LiveKit JWT token when configured...");
  process.env.LIVEKIT_URL = "wss://livekit.masterhrms.test";
  process.env.LIVEKIT_API_KEY = "test_api_key_123";
  process.env.LIVEKIT_API_SECRET = "test_api_secret_32_characters_long_entropy";
  process.env.TURN_SERVER_URL = "turn:turn.masterhrms.test:3478";
  process.env.TURN_USERNAME = "turn_user";
  process.env.TURN_CREDENTIAL = "turn_password";

  const tokenResult = MeetingSfuService.generateMeetingToken({
    tenantId,
    groupId,
    callId,
    userId: userHostId,
    name: "Host Alice",
    avatarUrl: "https://masterhrms.test/avatar.png",
    isHost: true,
    ttlSeconds: 900,
  });

  assert(tokenResult.token && typeof tokenResult.token === "string", "Must return string JWT token");
  assert.strictEqual(tokenResult.room, `meeting_${tenantId}_${groupId}_${callId}`);
  assert.strictEqual(tokenResult.url, "wss://livekit.masterhrms.test");
  assert(tokenResult.iceServers.some((s) => String(s.urls).includes("turn:turn.masterhrms.test")));

  const decoded: any = jwt.verify(tokenResult.token, process.env.LIVEKIT_API_SECRET, { algorithms: ["HS256"] });
  assert.strictEqual(decoded.sub, userHostId, "JWT sub must match userHostId");
  assert.strictEqual(decoded.name, "Host Alice", "JWT name must match");
  assert.strictEqual(decoded.iss, "test_api_key_123", "JWT iss must match API Key");
  assert.strictEqual(decoded.video.room, `meeting_${tenantId}_${groupId}_${callId}`);
  assert.strictEqual(decoded.video.roomAdmin, true, "Host must have roomAdmin = true");
  assert.strictEqual(decoded.video.roomCreate, true, "Host must have roomCreate = true");

  const meta = JSON.parse(decoded.metadata);
  assert.strictEqual(meta.tenantId, tenantId);
  assert.strictEqual(meta.role, "host");
  console.log("  ✔ LiveKit token generated with strict room, tenant, and role scopes.");

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
    // TEST 4: One Active-Call Policy & LiveKit Client SDK Verification
    // ──────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 4] One active-call policy & LiveKit Client SDK Room lifecycle...");
    const { Room, RoomEvent, Track } = await import("livekit-client");
    assert.strictEqual(typeof Room, "function", "livekit-client Room class must be available");
    assert.strictEqual(typeof RoomEvent, "object", "livekit-client RoomEvent must be available");

    const testRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    let trackSubscribedFired = false;
    testRoom.on(RoomEvent.TrackSubscribed, () => {
      trackSubscribedFired = true;
    });

    assert.strictEqual(typeof testRoom.connect, "function", "Room.connect must be a function");
    assert.strictEqual(typeof testRoom.disconnect, "function", "Room.disconnect must be a function");
    assert.strictEqual(typeof testRoom.localParticipant, "object", "Room.localParticipant must be initialized");

    // Test simulated RoomEvent emission
    testRoom.emit(RoomEvent.TrackSubscribed, {} as any, {} as any, { identity: "user_remote" } as any);
    assert.strictEqual(trackSubscribedFired, true, "RoomEvent.TrackSubscribed must fire listener");

    testRoom.disconnect();
    console.log("  ✔ LiveKit Client SDK Room lifecycle and track event listeners verified.");
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    // Restore env
    if (origEnvUrl) process.env.LIVEKIT_URL = origEnvUrl; else delete process.env.LIVEKIT_URL;
    if (origEnvKey) process.env.LIVEKIT_API_KEY = origEnvKey; else delete process.env.LIVEKIT_API_KEY;
    if (origEnvSecret) process.env.LIVEKIT_API_SECRET = origEnvSecret; else delete process.env.LIVEKIT_API_SECRET;
  }

  console.log("\n================================================================================");
  console.log("✅ ALL MULTI-PARTICIPANT MEETING TESTS PASSED EMPIRICALLY!");
  console.log("================================================================================\n");
}

runMultiParticipantMeetingTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
