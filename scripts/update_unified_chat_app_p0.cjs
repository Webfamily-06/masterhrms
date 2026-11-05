const fs = require('fs');
const path = require('path');

function updateUnifiedChatApp(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Replace handleStartGroupMeeting implementation
  const oldStartRegex = /const handleStartGroupMeeting = async \(callType: "audio" \| "video"\) => \{[\s\S]*?toast\.error\(err\?\.message \|\| "Could not start the meeting\."\);\s*\}\s*\};/;

  const newStart = `const handleStartGroupMeeting = async (callType: "audio" | "video") => {
    if (!activeGroupId) return;
    if (activeCallModalOpen || activeMeeting) {
      toast.warning("You are already in an active call or meeting.");
      return;
    }

    const callId = \`meeting_\${Date.now()}_\${Math.random().toString(36).substring(2, 8)}\`;
    const correlationId = \`grp_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`;
    let meetingSessionStarted = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints(callType === "video"));
      meetingLocalStreamRef.current = stream;

      const hostName = (currentUser as any)?.profile?.fullName || (currentUser as any)?.name || currentUser?.email || "Host";
      const hostAvatar = (currentUser as any)?.avatarUrl || null;

      setActiveMeeting({
        callId,
        groupId: activeGroupId,
        groupName: activeGroup?.name || "Group Meeting",
        callType,
        isHost: true,
        creatorId: currentUserId,
        startedAt: Date.now(),
        status: "connecting",
      });

      setMeetingParticipants([
        {
          userId: currentUserId,
          name: hostName,
          avatar: hostAvatar,
          role: "host",
          isMuted: false,
          isCameraOff: callType === "audio",
          isScreenSharing: false,
          isSpeaking: false,
          isLocal: true,
        },
      ]);
      setMeetingIsMuted(false);
      setMeetingIsVideoOff(callType === "audio");
      setMeetingIsScreenSharing(false);
      setIsMeetingOpen(true);

      const socket = getSocketClient();
      let confirmedViaSocket = false;

      // 1. Primary fast path: Socket.IO confirmation with 4s timeout
      if (socket && socket.connected) {
        try {
          const socketStart = await new Promise<{ success: boolean; message?: string }>((resolve, reject) => {
            socket.timeout(4000).emit(
              "group-call:start",
              {
                callId,
                groupId: activeGroupId,
                groupName: activeGroup?.name || "Group Meeting",
                callType,
                correlationId,
              },
              (error: Error | null, response: { success?: boolean; message?: string }) => {
                if (error) {
                  reject(error);
                  return;
                }
                if (response?.success) {
                  resolve({ success: true, message: response.message });
                } else {
                  reject(new Error(response?.message || "Socket confirmation rejected"));
                }
              }
            );
          });
          if (socketStart?.success) confirmedViaSocket = true;
        } catch (sockErr) {
          console.warn("[GroupMeeting] Socket confirmation timeout or error, executing server-authoritative REST fallback:", sockErr);
        }
      }

      // 2. Server-authoritative REST fallback if socket timed out or was disconnected
      if (!confirmedViaSocket) {
        try {
          const restRes: any = await api.post("/api/chat/meetings/start", {
            callId,
            groupId: activeGroupId,
            groupName: activeGroup?.name || "Group Meeting",
            callType,
            correlationId,
          });
          if (restRes?.data?.success || restRes?.success) {
            confirmedViaSocket = true;
          } else {
            throw new Error(restRes?.data?.error || restRes?.error || "The meeting server did not confirm the meeting start.");
          }
        } catch (restErr: any) {
          throw new Error(restErr?.response?.data?.error || restErr?.message || "The meeting server did not confirm the meeting start.");
        }
      }

      meetingSessionStarted = true;
      setActiveMeeting((current) => (current?.callId === callId ? { ...current, status: "connected" } : current));

      const tokenResponse = await api.post(\`/api/chat/meetings/\${callId}/token\`, {
        groupId: activeGroupId,
        callType,
      });
      setMeetingSfuConfig((tokenResponse as any)?.data || tokenResponse);
    } catch (err: any) {
      if (meetingSessionStarted) {
        getSocketClient().emit("group-call:leave", { callId });
      }
      cleanUpMeetingMedia();
      const errCorrelation = \`err_\${Date.now().toString(36)}\`;
      console.error(\`[MeetingStartError:\${errCorrelation}]\`, err);
      toast.error(err?.message || "Could not start the meeting.", {
        description: \`Correlation ID: \${errCorrelation}. You can retry safely without duplicate sessions.\`,
        action: {
          label: "Retry",
          onClick: () => handleStartGroupMeeting(callType),
        },
      });
    }
  };`;

  if (oldStartRegex.test(content)) {
    content = content.replace(oldStartRegex, newStart);
    console.log(`✅ [${filePath}] handleStartGroupMeeting updated with REST fallback & correlation ID`);
  } else {
    console.warn(`❌ [${filePath}] oldStartRegex failed to match`);
  }

  // 2. Add global-group-call-accepted listener
  if (!content.includes('hrms:global-group-call-accepted')) {
    const globalAcceptHook = `    const handleGlobalGroupAccepted = (e: any) => {
      const call = e.detail;
      if (call?.callId) {
        handleAcceptGroupMeeting({
          callId: call.callId,
          groupId: call.groupId,
          groupName: call.groupName || "Group Meeting",
          callType: call.callType || "audio",
          callerId: call.callerId,
          callerName: call.callerName || "Colleague",
          callerAvatar: call.callerAvatar,
        });
      }
    };
    window.addEventListener("hrms:global-group-call-accepted", handleGlobalGroupAccepted);`;

    content = content.replace(
      /window\.addEventListener\("hrms:global-call-accepted", handleGlobalAccepted\);/,
      `window.addEventListener("hrms:global-call-accepted", handleGlobalAccepted);\n${globalAcceptHook}`
    );

    content = content.replace(
      /return \(\) => window\.removeEventListener\("hrms:global-call-accepted", handleGlobalAccepted\);/,
      `return () => {\n      window.removeEventListener("hrms:global-call-accepted", handleGlobalAccepted);\n      window.removeEventListener("hrms:global-group-call-accepted", handleGlobalGroupAccepted);\n    };`
    );
    console.log(`✅ [${filePath}] Added global-group-call-accepted listener`);
  }

  const finalContent = content.replace(/\r?\n/g, '\r\n');
  fs.writeFileSync(filePath, finalContent, 'utf8');
}

updateUnifiedChatApp(path.join(__dirname, '..', 'src', 'components', 'chat', 'unified-chat-app.tsx'));
updateUnifiedChatApp(path.join(__dirname, '..', 'CMS', 'src', 'components', 'chat', 'unified-chat-app.tsx'));

