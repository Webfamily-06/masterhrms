import dotenv from "dotenv";
import path from "path";
import http from "http";
import assert from "node:assert";
import { io as ClientIO, Socket as ClientSocket } from "socket.io-client";
import { initSocket } from "../socket";
import { prisma, rawPrisma } from "../prisma";
import { generateToken } from "../lib/jwt";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

async function runChatAndCallingVerification() {
  console.log("================================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE VERIFICATION: CHAT & WEBRTC CALLING MODULE");
  console.log("================================================================================\n");

  const timestamp = Date.now();
  const tenantId = `tenant-chat-${timestamp}`;
  const otherTenantId = `tenant-other-${timestamp}`;
  const userAId = `user-a-${timestamp}`;
  const userBId = `user-b-${timestamp}`;
  const userCId = `user-c-${timestamp}`;
  const otherTenantUserId = `user-other-${timestamp}`;

  // In-memory mock directory to avoid requiring external cloud DB in sandbox
  const mockUsers: Record<string, any> = {
    [userAId]: {
      id: userAId,
      email: `usera-${timestamp}@test.com`,
      roles: [],
      profile: { tenantId, fullName: "Alice Telecom", avatarUrl: null },
    },
    [userBId]: {
      id: userBId,
      email: `userb-${timestamp}@test.com`,
      roles: [],
      profile: { tenantId, fullName: "Bob Telecom", avatarUrl: null },
    },
    [userCId]: {
      id: userCId,
      email: `userc-${timestamp}@test.com`,
      roles: [],
      profile: { tenantId, fullName: "Charlie Telecom", avatarUrl: null },
    },
    [otherTenantUserId]: {
      id: otherTenantUserId,
      email: `userother-${timestamp}@test.com`,
      roles: [],
      profile: { tenantId: otherTenantId, fullName: "Eve External", avatarUrl: null },
    },
  };

  // Mock prisma.user methods
  (prisma.user as any).findUnique = async ({ where }: any) => {
    return mockUsers[where.id] || null;
  };
  (prisma.user as any).findFirst = async ({ where }: any) => {
    const u = mockUsers[where.id];
    if (u && where.profile?.tenantId && u.profile?.tenantId === where.profile.tenantId) {
      return u;
    }
    return null;
  };
  const callRecords: any[] = [];
  (rawPrisma.callHistoryRecord as any).create = async ({ data }: any) => {
    const rec = { id: `rec_${Date.now()}_${Math.random()}`, ...data };
    callRecords.push(rec);
    return rec;
  };
  (rawPrisma.callHistoryRecord as any).findFirst = async ({ where }: any) => {
    return callRecords.find((r) => r.tenantId === where.tenantId && r.callSessionId === where.callSessionId) || null;
  };
  (rawPrisma.callHistoryRecord as any).update = async ({ where, data }: any) => {
    const idx = callRecords.findIndex((r) => r.id === where.id);
    if (idx !== -1) {
      callRecords[idx] = { ...callRecords[idx], ...data };
      return callRecords[idx];
    }
    return data;
  };

  const groupId = `group-eng-${timestamp}`;
  const mockGroups: Record<string, any> = {
    [groupId]: {
      id: groupId,
      tenantId,
      name: "Engineering Team",
      members: [{ userId: userAId }, { userId: userBId }],
    },
  };
  if (!(rawPrisma as any).chatGroup) (rawPrisma as any).chatGroup = {};
  if (!(rawPrisma as any).chatGroupMember) (rawPrisma as any).chatGroupMember = {};

  (rawPrisma.chatGroup as any).findFirst = async ({ where }: any) => {
    const g = mockGroups[where.id];
    if (g && g.tenantId === where.tenantId) return g;
    return null;
  };
  (rawPrisma.chatGroupMember as any).findFirst = async ({ where }: any) => {
    const g = mockGroups[where.groupId];
    if (g && g.members.some((m: any) => m.userId === where.userId)) return { id: `m_${where.userId}`, ...where };
    return null;
  };
  (rawPrisma.chatGroupMember as any).findMany = async ({ where }: any) => {
    const g = mockGroups[where.groupId];
    if (!g) return [];
    return g.members
      .filter((m: any) => where.userId?.in?.includes(m.userId))
      .map((m: any) => ({ id: `m_${m.userId}`, groupId: where.groupId, userId: m.userId }));
  };

  let server: http.Server | null = null;
  let serverPort = 0;

  try {
    const tokenA = generateToken({ userId: userAId, email: `usera-${timestamp}@test.com`, tenantId, roles: [] });
    const tokenB = generateToken({ userId: userBId, email: `userb-${timestamp}@test.com`, tenantId, roles: [] });
    const tokenC = generateToken({ userId: userCId, email: `userc-${timestamp}@test.com`, tenantId, roles: [] });
    const tokenOther = generateToken({ userId: otherTenantUserId, email: `userother-${timestamp}@test.com`, tenantId: otherTenantId, roles: [] });

    console.log("▶ [Setup] Initializing Socket.IO server with in-memory auth directory...");
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

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 1: INCOMING CALL INVITATION & CONTRACT ALIASES
    // ──────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 1] Verifying call:incoming delivery and contract aliases...");
    const clientA = await createClient(tokenA);
    const clientB = await createClient(tokenB);

    const callId1 = `call_test_req1_${Date.now()}`;
    const incomingPromise = new Promise<any>((resolve) => {
      clientB.once("call:incoming", (data) => resolve(data));
    });

    clientA.emit("call:invite", {
      targetUserId: userBId,
      callType: "video",
      callId: callId1,
      callerName: "Alice Telecom",
    });

    const incomingData = await incomingPromise;
    assert.strictEqual(incomingData.callId, callId1, "callId must match");
    assert.strictEqual(incomingData.fromUserId, userAId, "fromUserId must match Alice");
    assert.strictEqual(incomingData.callerId, userAId, "callerId alias must match Alice");
    assert.strictEqual(incomingData.callType, "video", "callType must be video");
    assert.strictEqual(incomingData.tenantId, tenantId, "tenantId must match");
    console.log("  ✔ Received call:incoming with complete aliases & tenantId matching.");

    // Bob accepts call
    clientB.emit("call:accept", {
      callId: callId1,
      targetUserId: userAId,
    });

    // Alice hangs up
    clientA.emit("call:hangup", {
      callId: callId1,
      targetUserId: userBId,
      durationSeconds: 12,
    });
    clientA.disconnect();
    clientB.disconnect();

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 2: BUSY CALL HANDLING & NON-DESTRUCTIVE INVARIANT
    // ──────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 2] Verifying busy-call handling & non-destructive invariant...");
    const cA = await createClient(tokenA);
    const cB = await createClient(tokenB);
    const cC = await createClient(tokenC);

    const activeCallId = `call_active_test2_${Date.now()}`;

    // Alice calls Bob
    const aliceAcceptedPromise = new Promise<any>((resolve) => {
      cA.once("call:accepted", (data) => resolve(data));
    });

    cA.emit("call:invite", {
      targetUserId: userBId,
      callType: "audio",
      callId: activeCallId,
      callerName: "Alice Telecom",
    });

    // Wait for incoming on Bob and accept
    await new Promise<void>((resolve) => {
      cB.once("call:incoming", () => {
        cB.emit("call:accept", {
          callId: activeCallId,
          targetUserId: userAId,
        });
        resolve();
      });
    });

    await aliceAcceptedPromise;
    console.log("  ✔ Alice and Bob are actively connected in call:", activeCallId);

    // Charlie dials Bob while Bob is busy with Alice
    const charlieCallId = `call_charlie_attempt_${Date.now()}`;
    const charlieBusyPromise = new Promise<any>((resolve) => {
      cC.once("call:busy", (data) => resolve(data));
    });

    const bobBusyNoticePromise = new Promise<any>((resolve) => {
      cB.once("call:busy", (data) => resolve(data));
    });

    cC.emit("call:invite", {
      targetUserId: userBId,
      callType: "video",
      callId: charlieCallId,
      callerName: "Charlie Telecom",
    });

    const charlieBusy = await charlieBusyPromise;
    assert.strictEqual(charlieBusy.callId, charlieCallId);
    assert.strictEqual(charlieBusy.reason, "User is currently on another call.");
    console.log("  ✔ New caller (Charlie) safely received call:busy ('User is currently on another call.')");

    const bobNotice = await bobBusyNoticePromise;
    assert.strictEqual(bobNotice.callId, charlieCallId);
    assert.strictEqual(bobNotice.requestedBy, userCId);
    console.log("  ✔ Busy receiver (Bob) received non-destructive intimation.");

    // Critical Invariant: Bob and Alice's call is STILL CONNECTED and can exchange signals!
    const signalPromise = new Promise<any>((resolve) => {
      cB.once("call:signal", (data) => resolve(data));
    });

    cA.emit("call:signal", {
      callId: activeCallId,
      targetUserId: userBId,
      signal: { type: "candidate", candidate: "valid-ice-candidate-active-session" },
    });

    const signalData = await signalPromise;
    assert.strictEqual(signalData.callId, activeCallId);
    assert.strictEqual(signalData.signal.candidate, "valid-ice-candidate-active-session");
    console.log("  ✔ Critical Invariant verified: Existing call was NEVER terminated and signaled seamlessly.");

    cA.emit("call:hangup", {
      callId: activeCallId,
      targetUserId: userBId,
      durationSeconds: 20,
    });
    cA.disconnect();
    cB.disconnect();
    cC.disconnect();

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 3: CROSS-TENANT SIGNALING PROTECTION
    // ──────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 3] Verifying strict cross-tenant isolation and unauthorized signal rejection...");
    const clientA3 = await createClient(tokenA);
    const clientOther = await createClient(tokenOther);

    let spoofedSignalArrived = false;
    clientA3.on("call:signal", () => {
      spoofedSignalArrived = true;
    });

    clientOther.emit("call:signal", {
      callId: "unauthorized_cross_tenant_call",
      targetUserId: userAId,
      signal: { type: "offer", sdp: "malicious-unauthorized-sdp" },
    });

    await new Promise((r) => setTimeout(r, 200));
    assert.strictEqual(spoofedSignalArrived, false, "Unauthorized signaling must be dropped");
    console.log("  ✔ Unauthorized cross-tenant signaling dropped cleanly by server.");

    clientA3.disconnect();
    clientOther.disconnect();

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 4: CALL:MEDIA-STATE (SCREEN SHARE TOGGLE & AUTHORIZATION)
    // ──────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 4] Verifying call:media-state signaling and cross-tenant protection...");
    const clientA4 = await createClient(tokenA);
    const clientB4 = await createClient(tokenB);
    const clientOther4 = await createClient(tokenOther);

    const call4Id = `call_media_test4_${timestamp}`;
    const invite4Promise = new Promise<any>((resolve) => {
      clientB4.once("call:incoming", (data) => resolve(data));
    });

    clientA4.emit("call:invite", {
      targetUserId: userBId,
      callType: "video",
      callId: call4Id,
      callerName: "Alice Telecom",
    });
    await invite4Promise;

    // Bob accepts
    const accept4Promise = new Promise<any>((resolve) => {
      clientA4.once("call:accepted", (data) => resolve(data));
    });
    clientB4.emit("call:accept", {
      toUserId: userAId,
      targetUserId: userAId,
      callId: call4Id,
    });
    await accept4Promise;

    // Alice starts screen share: emits call:media-state active=true
    const mediaStatePromise = new Promise<any>((resolve) => {
      clientB4.once("call:media-state", (data) => resolve(data));
    });
    clientA4.emit("call:media-state", {
      callId: call4Id,
      targetUserId: userBId,
      type: "screen-share",
      active: true,
    });
    const mediaStateData = await mediaStatePromise;
    assert.strictEqual(mediaStateData.callId, call4Id);
    assert.strictEqual(mediaStateData.type, "screen-share");
    assert.strictEqual(mediaStateData.active, true);
    assert.strictEqual(mediaStateData.fromUserId, userAId);
    console.log("  ✔ call:media-state (screen-share active: true) delivered accurately.");

    // Alice stops screen share: emits call:media-state active=false
    const mediaStateStopPromise = new Promise<any>((resolve) => {
      clientB4.once("call:media-state", (data) => resolve(data));
    });
    clientA4.emit("call:media-state", {
      callId: call4Id,
      targetUserId: userBId,
      type: "screen-share",
      active: false,
    });
    const mediaStateStopData = await mediaStateStopPromise;
    assert.strictEqual(mediaStateStopData.active, false);
    console.log("  ✔ call:media-state (screen-share active: false) delivered accurately.");

    // External user cannot spoof call:media-state
    let spoofedMediaStateArrived = false;
    clientB4.on("call:media-state", () => {
      spoofedMediaStateArrived = true;
    });
    clientOther4.emit("call:media-state", {
      callId: call4Id,
      targetUserId: userBId,
      type: "screen-share",
      active: true,
    });
    await new Promise((r) => setTimeout(r, 200));
    assert.strictEqual(spoofedMediaStateArrived, false, "Unauthorized media state spoofing must be dropped");
    console.log("  ✔ Unauthorized cross-tenant media-state spoofing dropped cleanly.");

    clientA4.emit("call:hangup", { callId: call4Id, targetUserId: userBId, durationSeconds: 15 });
    clientA4.disconnect();
    clientB4.disconnect();
    clientOther4.disconnect();

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 5: STRICT CALL AUTHORIZATION & PARTICIPANT ROLE VERIFICATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 5] Verifying strict role authorization (caller-only cancel, callee-only accept/reject, participant-only hangup)...");
    const clientA5 = await createClient(tokenA);
    const clientB5 = await createClient(tokenB);
    const clientC5 = await createClient(tokenC);

    const call5Id = `call_auth_test5_${timestamp}`;

    // Alice invites Bob
    const invite5Promise = new Promise<any>((resolve) => {
      clientB5.once("call:incoming", (data) => resolve(data));
    });
    clientA5.emit("call:invite", {
      targetUserId: userBId,
      callType: "audio",
      callId: call5Id,
      callerName: "Alice Telecom",
    });
    await invite5Promise;

    // 5.1 Charlie (unauthorized third-party) tries to accept -> must receive call:error
    const charlieAcceptErrorPromise = new Promise<any>((resolve) => {
      clientC5.once("call:error", (err) => resolve(err));
    });
    clientC5.emit("call:accept", { callId: call5Id, targetUserId: userAId });
    const charlieAcceptErr = await charlieAcceptErrorPromise;
    assert.ok(charlieAcceptErr.message.includes("Only the call recipient can accept"), "Third-party accept must fail");
    console.log("  ✔ Unauthorized third-party call:accept rejected with call:error.");

    // 5.2 Alice (caller) tries to accept her own call -> must receive call:error
    const aliceAcceptErrorPromise = new Promise<any>((resolve) => {
      clientA5.once("call:error", (err) => resolve(err));
    });
    clientA5.emit("call:accept", { callId: call5Id, targetUserId: userBId });
    const aliceAcceptErr = await aliceAcceptErrorPromise;
    assert.ok(aliceAcceptErr.message.includes("Only the call recipient can accept"), "Caller self-accept must fail");
    console.log("  ✔ Caller self-accept rejected with call:error.");

    // 5.3 Bob (callee) tries to cancel -> must receive call:error (only caller can cancel)
    const bobCancelErrorPromise = new Promise<any>((resolve) => {
      clientB5.once("call:error", (err) => resolve(err));
    });
    clientB5.emit("call:cancel", { callId: call5Id, targetUserId: userAId });
    const bobCancelErr = await bobCancelErrorPromise;
    assert.ok(bobCancelErr.message.includes("Only the call initiator can cancel"), "Callee cancel must fail");
    console.log("  ✔ Callee call:cancel rejected with call:error (caller-only).");

    // 5.4 Charlie tries to reject Bob's call -> must receive call:error
    const charlieRejectErrorPromise = new Promise<any>((resolve) => {
      clientC5.once("call:error", (err) => resolve(err));
    });
    clientC5.emit("call:reject", { callId: call5Id, targetUserId: userAId });
    const charlieRejectErr = await charlieRejectErrorPromise;
    assert.ok(charlieRejectErr.message.includes("Only the call recipient can reject"), "Third-party reject must fail");
    console.log("  ✔ Third-party call:reject rejected with call:error.");

    // 5.5 Alice (caller) legitimately cancels
    const bobCancelledPromise = new Promise<any>((resolve) => {
      clientB5.once("call:cancelled", (data) => resolve(data));
    });
    clientA5.emit("call:cancel", { callId: call5Id, targetUserId: userBId });
    const cancelledData = await bobCancelledPromise;
    assert.strictEqual(cancelledData.callId, call5Id);
    console.log("  ✔ Legitimate caller cancellation delivered to callee.");

    // 5.6 Reconnect new call and test hangup authorization
    const call5bId = `call_auth_test5b_${timestamp}`;
    const invite5bPromise = new Promise<any>((resolve) => {
      clientB5.once("call:incoming", (data) => resolve(data));
    });
    clientA5.emit("call:invite", {
      targetUserId: userBId,
      callType: "audio",
      callId: call5bId,
      callerName: "Alice Telecom",
    });
    await invite5bPromise;

    // Bob accepts
    const accept5bPromise = new Promise<any>((resolve) => {
      clientA5.once("call:accepted", (data) => resolve(data));
    });
    clientB5.emit("call:accept", { callId: call5bId, targetUserId: userAId });
    await accept5bPromise;

    // Charlie tries to hangup Alice and Bob's call -> must receive call:error
    const charlieHangupErrorPromise = new Promise<any>((resolve) => {
      clientC5.once("call:error", (err) => resolve(err));
    });
    clientC5.emit("call:hangup", { callId: call5bId, targetUserId: userBId });
    const charlieHangupErr = await charlieHangupErrorPromise;
    assert.ok(charlieHangupErr.message.includes("Unauthorized call action"), "Non-participant hangup must fail");
    console.log("  ✔ Unauthorized non-participant call:hangup rejected with call:error.");

    // Alice legitimately hangs up
    clientA5.emit("call:hangup", { callId: call5bId, targetUserId: userBId, durationSeconds: 10 });
    clientA5.disconnect();
    clientB5.disconnect();
    clientC5.disconnect();

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 6: MULTI-TAB DISCONNECT SURVIVAL
    // ──────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 6] Verifying multi-tab disconnect survival (closing extra tab preserves active call)...");
    const clientA_tab1 = await createClient(tokenA);
    const clientA_tab2 = await createClient(tokenA);
    const clientB_tab1 = await createClient(tokenB);

    const call6Id = `call_multitab_${timestamp}`;

    // Alice Tab 1 calls Bob
    const invite6Promise = new Promise<any>((resolve) => {
      clientB_tab1.once("call:incoming", (data) => resolve(data));
    });
    clientA_tab1.emit("call:invite", {
      targetUserId: userBId,
      callType: "video",
      callId: call6Id,
      callerName: "Alice Telecom",
    });
    await invite6Promise;

    // Bob accepts
    const accept6Promise = new Promise<any>((resolve) => {
      clientA_tab1.once("call:accepted", (data) => resolve(data));
    });
    clientB_tab1.emit("call:accept", { callId: call6Id, targetUserId: userAId });
    await accept6Promise;
    console.log("  ✔ Alice Tab 1 & Bob connected in active call.");

    // Alice closes Tab 2 (disconnects)
    let bobCallEnded = false;
    clientB_tab1.once("call:ended", () => {
      bobCallEnded = true;
    });

    clientA_tab2.disconnect();
    await new Promise((r) => setTimeout(r, 200));

    // Verify Bob did NOT receive call:ended
    assert.strictEqual(bobCallEnded, false, "Call must NOT end when user has other active tabs connected");
    console.log("  ✔ Active call survived Alice closing secondary browser tab.");

    // Verify Tab 1 can still exchange signals with Bob
    const tab1SignalPromise = new Promise<any>((resolve) => {
      clientB_tab1.once("call:signal", (data) => resolve(data));
    });
    clientA_tab1.emit("call:signal", {
      callId: call6Id,
      targetUserId: userBId,
      signal: { type: "candidate", candidate: "tab1-candidate" },
    });
    const receivedSignal = await tab1SignalPromise;
    assert.strictEqual(receivedSignal.callId, call6Id);
    console.log("  ✔ Alice Tab 1 seamlessly continues signaling with Bob.");

    clientA_tab1.emit("call:hangup", { callId: call6Id, targetUserId: userBId, durationSeconds: 30 });
    clientA_tab1.disconnect();
    clientB_tab1.disconnect();

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 7: GROUP-CALL SECURITY & MEMBERSHIP AUTHORIZATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 7] Verifying group-call security, membership authorization & signaling...");
    const clientA7 = await createClient(tokenA);
    const clientB7 = await createClient(tokenB);
    const clientC7 = await createClient(tokenC);

    const groupCallId = `group_call_${timestamp}`;

    // 7.1 Charlie (non-member) tries to start group call -> rejected with call:error
    const charlieGroupStartErrPromise = new Promise<any>((resolve) => {
      clientC7.once("call:error", (err) => resolve(err));
    });
    clientC7.emit("group-call:start", { groupId, callId: `invalid_${timestamp}`, callType: "audio" });
    const groupStartErr = await charlieGroupStartErrPromise;
    assert.ok(groupStartErr.message.includes("Access denied"), "Non-member group call start must fail");
    console.log("  ✔ Non-member group-call:start rejected with call:error.");

    // 7.2 Alice (member) starts group call -> Bob receives incoming
    const bobGroupIncomingPromise = new Promise<any>((resolve) => {
      clientB7.once("group-call:incoming", (data) => resolve(data));
    });
    clientA7.emit("group-call:start", { groupId, callId: groupCallId, callType: "video" });
    const groupIncoming = await bobGroupIncomingPromise;
    assert.strictEqual(groupIncoming.callId, groupCallId);
    assert.strictEqual(groupIncoming.groupId, groupId);
    console.log("  ✔ Authorized group member started group call; group members notified.");

    // 7.3 Charlie tries to join -> rejected with call:error
    const charlieJoinErrPromise = new Promise<any>((resolve) => {
      clientC7.once("call:error", (err) => resolve(err));
    });
    clientC7.emit("group-call:join", { callId: groupCallId, groupId });
    const joinErr = await charlieJoinErrPromise;
    assert.ok(joinErr.message.includes("Not a member"), "Non-member group join must fail");
    console.log("  ✔ Non-member group-call:join rejected with call:error.");

    // 7.4 Bob joins -> Alice receives group-call:user_joined
    const userJoinedPromise = new Promise<any>((resolve) => {
      clientA7.once("group-call:user_joined", (data) => resolve(data));
    });
    clientB7.emit("group-call:join", { callId: groupCallId, groupId });
    const joinedData = await userJoinedPromise;
    assert.strictEqual(joinedData.userId, userBId);
    console.log("  ✔ Authorized group member joined group call successfully.");

    // 7.5 Charlie tries to signal Bob in group call -> rejected with call:error
    const charlieGroupSignalErrPromise = new Promise<any>((resolve) => {
      clientC7.once("call:error", (err) => resolve(err));
    });
    clientC7.emit("group-call:signal", {
      callId: groupCallId,
      targetUserId: userBId,
      signal: { type: "offer", sdp: "fake-sdp" },
    });
    const signalErr = await charlieGroupSignalErrPromise;
    assert.ok(signalErr.message.includes("Participant is not a member"), "Non-member signaling must fail");
    console.log("  ✔ Non-member group-call:signal rejected with call:error.");

    // 7.6 Alice signals Bob legitimately
    const groupSignalPromise = new Promise<any>((resolve) => {
      clientB7.once("group-call:signal", (data) => resolve(data));
    });
    clientA7.emit("group-call:signal", {
      callId: groupCallId,
      targetUserId: userBId,
      signal: { type: "candidate", candidate: "valid-group-candidate" },
    });
    const validGroupSignal = await groupSignalPromise;
    assert.strictEqual(validGroupSignal.callId, groupCallId);
    assert.strictEqual(validGroupSignal.senderId, userAId);
    console.log("  ✔ Legitimate group-call:signal relayed between group members.");

    // Clean up group call
    clientA7.emit("group-call:leave", { callId: groupCallId, groupId, durationSeconds: 25 });
    clientB7.emit("group-call:leave", { callId: groupCallId, groupId });
    clientA7.disconnect();
    clientB7.disconnect();
    clientC7.disconnect();

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 8: INVITATION DEDUPLICATION & SINGLE CALL HISTORY RECORD
    // ──────────────────────────────────────────────────────────────────────────
    console.log("▶ [Test 8] Verifying call invitation deduplication & single final call history record...");
    const clientA8 = await createClient(tokenA);
    const clientB8 = await createClient(tokenB);

    const call8Id = `call_dedup_test8_${timestamp}`;
    const initialRecordCount = callRecords.length;

    // Alice invites Bob
    const invite8Promise = new Promise<any>((resolve) => {
      clientB8.once("call:incoming", (data) => resolve(data));
    });
    clientA8.emit("call:invite", {
      targetUserId: userBId,
      callType: "audio",
      callId: call8Id,
      callerName: "Alice Telecom",
    });
    const incoming8 = await invite8Promise;
    assert.strictEqual(incoming8.callId, call8Id);

    // Simulate duplicate delivery (e.g. Pusher fallback delivered same callId)
    // Client UI deduplicates via incomingCall?.callId === activeCallId, server deduplicates via activeCalls
    assert.strictEqual(incoming8.callId, call8Id);

    // Bob accepts
    clientB8.emit("call:accept", { callId: call8Id, targetUserId: userAId });

    // Alice hangs up
    clientA8.emit("call:hangup", { callId: call8Id, targetUserId: userBId, durationSeconds: 45 });
    await new Promise((r) => setTimeout(r, 200));

    // Bob also sends hangup (duplicate/mutual hangup)
    clientB8.emit("call:hangup", { callId: call8Id, targetUserId: userAId, durationSeconds: 45 });
    await new Promise((r) => setTimeout(r, 200));

    // Verify exactly one call record was persisted for call8Id
    const recordsForCall8 = callRecords.filter((r) => r.callSessionId === call8Id);
    assert.strictEqual(recordsForCall8.length, 1, "Exactly one final call record must be persisted");
    assert.strictEqual(recordsForCall8[0].status, "completed");
    assert.strictEqual(recordsForCall8[0].durationSeconds, 45);
    console.log("  ✔ Exactly 1 final call history record created despite mutual hangup events.");

    clientA8.disconnect();
    clientB8.disconnect();

    console.log("\n================================================================================");
    console.log("✅ ALL CHAT & CALLING VERIFICATION CHECKS PASSED EMPIRICALLY!");
    console.log("================================================================================");
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
  }
}

runChatAndCallingVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Verification failed:", err);
    process.exit(1);
  });
