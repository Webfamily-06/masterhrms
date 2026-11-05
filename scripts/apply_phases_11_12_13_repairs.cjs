const fs = require('fs');
const path = require('path');

// 1. Update server/src/routes/chat.routes.ts to add POST /meetings/start and import activeCalls
const chatRoutesPath = path.join(__dirname, '..', 'server', 'src', 'routes', 'chat.routes.ts');
let chatRoutes = fs.readFileSync(chatRoutesPath, 'utf8');

// Ensure activeCalls is imported from ../socket
if (!chatRoutes.includes('activeCalls')) {
  chatRoutes = chatRoutes.replace(
    /import \{ broadcastToTenant, broadcastToUser, getOnlineUsersForTenant, activeGroupCalls, getIO \} from "\.\.\/socket";/,
    'import { broadcastToTenant, broadcastToUser, getOnlineUsersForTenant, activeCalls, activeGroupCalls, getIO } from "../socket";'
  );
  console.log('✅ Added activeCalls import to server/src/routes/chat.routes.ts');
}

// Add POST /meetings/start before POST /meetings/:callId/token
const meetingStartRoute = `// POST /api/chat/meetings/start - Server-authoritative meeting start with explicit confirmation
chatRouter.post("/meetings/start", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId || (req.user as any)?.id;
    const { groupId, callId, callType = "video", groupName } = req.body;

    if (!groupId || !callId || !tenantId) {
      return res.status(400).json({ success: false, error: "groupId, callId and tenantId are required." });
    }

    if (activeGroupCalls.has(callId)) {
      return res.json({ success: true, callId, status: "connected", message: "Meeting already active." });
    }

    // 1. Verify group exists and belongs to user's tenant
    const group = await prisma.chatGroup.findFirst({
      where: { id: groupId, tenantId },
      include: { members: true },
    });

    if (!group || !group.members.some((m) => m.userId === userId)) {
      return res.status(403).json({ success: false, error: "You cannot start a meeting for this group." });
    }

    // 2. Check if organizer is already on an active 1-to-1 call
    for (const [, call] of activeCalls) {
      if (
        call.tenantId === tenantId &&
        (call.status === "ringing" || call.status === "connected") &&
        (call.callerId === userId || call.targetUserId === userId)
      ) {
        return res.status(409).json({ success: false, code: "CALL_BUSY", error: "You are already in an active call." });
      }
    }

    // 3. Check if organizer is in another group meeting
    for (const [, meeting] of activeGroupCalls) {
      if (meeting.tenantId === tenantId && meeting.participants.has(userId)) {
        return res.status(409).json({ success: false, code: "CALL_BUSY", error: "You are already in another meeting." });
      }
    }

    // 4. Resolve organizer name and avatar
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { fullName: true, avatarUrl: true },
    });
    const hostName = userProfile?.fullName || (req.user as any)?.email || "Host";
    const hostAvatar = userProfile?.avatarUrl || null;

    const participants = new Map<string, any>();
    participants.set(userId, {
      userId,
      name: hostName,
      avatar: hostAvatar,
      role: "host",
      joinedAt: new Date(),
      isMuted: false,
      isCameraOff: callType === "audio",
      isScreenSharing: false,
      isSpeaking: false,
      socketIds: new Set<string>(),
    });

    const invitedUserIds = new Set<string>();
    for (const m of group.members) {
      if (m.userId !== userId) {
        invitedUserIds.add(m.userId);
      }
    }

    activeGroupCalls.set(callId, {
      callId,
      groupId,
      groupName: group.name,
      groupAvatarUrl: group.avatarUrl,
      tenantId,
      creatorId: userId,
      callType: callType || "audio",
      startedAt: new Date(),
      participants,
      invitedUserIds,
      historyPersisted: false,
    });

    // 5. Broadcast incoming group call to invitees via Socket.IO & Pusher
    const ioInstance = getIO();
    for (const m of group.members) {
      if (m.userId !== userId) {
        const invitePayload = {
          groupId,
          groupName: group.name,
          groupAvatarUrl: group.avatarUrl,
          callId,
          callType: callType || "audio",
          callerId: userId,
          callerName: hostName,
          callerAvatar: hostAvatar,
          eventId: \`group_call_\${callId}_\${m.userId}\`,
        };
        ioInstance?.to(\`user:\${m.userId}\`).emit("group-call:incoming", invitePayload);
        PusherService.triggerUserEvent(tenantId, m.userId, "group-call:incoming", invitePayload).catch((err) =>
          console.warn("Pusher group-call:incoming delivery warning:", err?.message || err)
        );
      }
    }

    // Record system event
    await recordSystemEvent(
      tenantId,
      \`group_\${groupId}\`,
      userId,
      "group_call_started",
      \`\${hostName} started a group \${callType} meeting.\`,
      { groupId, callId, callType }
    ).catch(() => {});

    return res.json({
      success: true,
      callId,
      status: "connected",
      message: "Meeting session confirmed and started successfully",
    });
  } catch (err: any) {
    console.error("[Meetings API] Start meeting error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to start meeting" });
  }
});\n\n`;

if (!chatRoutes.includes('chatRouter.post("/meetings/start"')) {
  chatRoutes = chatRoutes.replace(
    /\/\/ POST \/api\/chat\/meetings\/:callId\/token/,
    meetingStartRoute + '// POST /api/chat/meetings/:callId/token'
  );
  fs.writeFileSync(chatRoutesPath, chatRoutes, 'utf8');
  console.log('✅ Added POST /api/chat/meetings/start endpoint in server/src/routes/chat.routes.ts');
}

// 2. Wrap group-call:start in server/src/socket.ts with try/catch to guarantee acknowledgment
const socketServerPath = path.join(__dirname, '..', 'server', 'src', 'socket.ts');
let socketServer = fs.readFileSync(socketServerPath, 'utf8');

if (!socketServer.includes('// TRY_WRAPPER_GROUP_CALL_START')) {
  socketServer = socketServer.replace(
    /socket\.on\(\s*"group-call:start",\s*async \(\s*payload: \{ groupId: string; callId: string; callType: "audio" \| "video" \},\s*acknowledge\?: \(result: \{ success: boolean; code\?: string; message\?: string; callId\?: string \}\) => void\s*\) => \{/,
    `socket.on(
      "group-call:start",
      async (
        payload: { groupId: string; callId: string; callType: "audio" | "video" },
        acknowledge?: (result: { success: boolean; code?: string; message?: string; callId?: string }) => void
      ) => {
        // TRY_WRAPPER_GROUP_CALL_START
        try {`
  );

  socketServer = socketServer.replace(
    /        \{ groupId, callId, callType \}\s*\);\s*\}\s*\);\s*socket\.on\("group-call:join"/,
    `        { groupId, callId, callType }
      );
      } catch (err: any) {
        console.error("[Socket] group-call:start error:", err);
        acknowledge?.({ success: false, code: "CALL_ERROR", message: err?.message || "Failed to start meeting." });
      }
      }
    );

    socket.on("group-call:join"`
  );
  fs.writeFileSync(socketServerPath, socketServer, 'utf8');
  console.log('✅ Wrapped group-call:start in try/catch in server/src/socket.ts');
}

console.log('✅ Backend Phase 12 confirmation enhancements applied.');

