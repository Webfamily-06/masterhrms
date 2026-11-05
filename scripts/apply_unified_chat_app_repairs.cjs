const fs = require('fs');
const path = require('path');

function updateUnifiedChatApp(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. In cleanUpMedia, ensure meetingLocalStream, meetingScreenStream, preCallStream, audioContextRef, and ringtoneContextRef are all stopped
  const cleanUpMediaOld = `  const cleanUpMedia = useCallback(() => {
    if (callTimeoutTimerRef.current) {
      clearTimeout(callTimeoutTimerRef.current);
      callTimeoutTimerRef.current = null;
    }
    if (incomingCallTimerRef.current) {
      clearTimeout(incomingCallTimerRef.current);
      incomingCallTimerRef.current = null;
    }
    stopRingtone();
    iceCandidateQueueRef.current = [];
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch {}
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setIsScreenSharing(false);
    setAdditionalParticipants([]);
  }, [stopRingtone]);`;

  const cleanUpMediaNew = `  const cleanUpMedia = useCallback(() => {
    if (callTimeoutTimerRef.current) {
      clearTimeout(callTimeoutTimerRef.current);
      callTimeoutTimerRef.current = null;
    }
    if (incomingCallTimerRef.current) {
      clearTimeout(incomingCallTimerRef.current);
      incomingCallTimerRef.current = null;
    }
    stopRingtone();
    iceCandidateQueueRef.current = [];
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    if (meetingLocalStreamRef.current) {
      meetingLocalStreamRef.current.getTracks().forEach((track) => track.stop());
      meetingLocalStreamRef.current = null;
    }
    if (meetingScreenStreamRef.current) {
      meetingScreenStreamRef.current.getTracks().forEach((track) => track.stop());
      meetingScreenStreamRef.current = null;
    }
    if (preCallStream) {
      preCallStream.getTracks().forEach((track) => track.stop());
      setPreCallStream(null);
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    if (ringtoneContextRef.current && ringtoneContextRef.current.state !== "closed") {
      try { ringtoneContextRef.current.close(); } catch {}
      ringtoneContextRef.current = null;
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch {}
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setIsScreenSharing(false);
    setAdditionalParticipants([]);
  }, [stopRingtone, preCallStream]);`;

  // Normalize CRLF to LF for matching
  const normalizedContent = content.replace(/\\r\\n/g, '\\n');
  const normalizedOld = cleanUpMediaOld.replace(/\\r\\n/g, '\\n');
  const normalizedNew = cleanUpMediaNew.replace(/\\r\\n/g, '\\n');

  if (normalizedContent.includes(normalizedOld)) {
    content = normalizedContent.replace(normalizedOld, normalizedNew);
    console.log(`✅ [${filePath}] Replaced cleanUpMedia with comprehensive track cleanup`);
  } else {
    console.warn(`⚠️ [${filePath}] cleanUpMedia target not matched directly, checking partial...`);
  }

  // 2. Add unmount cleanup effect
  const unmountHook = `  // Ensure all media tracks are completely stopped when leaving chat
  useEffect(() => {
    return () => {
      cleanUpMedia();
      cleanUpMeetingMedia();
    };
  }, [cleanUpMedia, cleanUpMeetingMedia]);\n\n`;

  if (!content.includes('Ensure all media tracks are completely stopped when leaving chat')) {
    content = content.replace(
      /  \/\/ End \/ Cancel Call\\n  const handleEndCall/,
      `${unmountHook}  // End / Cancel Call\\n  const handleEndCall`
    );
    console.log(`✅ [${filePath}] Added unmount media cleanup effect`);
  }

  // 3. Fix onOpenChange on Active Call Dialog to clean up media
  const oldOnOpenChange = `        onOpenChange={(open) => {
          if (!open) {
            setCallSummary(null);
            setActiveCallModalOpen(false);
          } else {
            setActiveCallModalOpen(true);
          }
        }}`;

  const newOnOpenChange = `        onOpenChange={(open) => {
          if (!open) {
            cleanUpMedia();
            cleanUpMeetingMedia();
            setCallSummary(null);
            setActiveCallModalOpen(false);
          } else {
            setActiveCallModalOpen(true);
          }
        }}`;

  const normOldOpen = oldOnOpenChange.replace(/\\r\\n/g, '\\n');
  const normNewOpen = newOnOpenChange.replace(/\\r\\n/g, '\\n');
  if (content.includes(normOldOpen)) {
    content = content.replace(normOldOpen, normNewOpen);
    console.log(`✅ [${filePath}] Fixed active call dialog onOpenChange media cleanup`);
  }

  // 4. Fix Back to Chat button on summary screen
  const oldBackBtn = `                  onClick={() => {
                    setCallSummary(null);
                    setActiveCallModalOpen(false);
                    setCallStatus("calling");
                    setCallDurationSeconds(0);
                  }}`;

  const newBackBtn = `                  onClick={() => {
                    cleanUpMedia();
                    cleanUpMeetingMedia();
                    setCallSummary(null);
                    setActiveCallModalOpen(false);
                    setCallStatus("calling");
                    setCallDurationSeconds(0);
                  }}`;

  const normOldBack = oldBackBtn.replace(/\\r\\n/g, '\\n');
  const normNewBack = newBackBtn.replace(/\\r\\n/g, '\\n');
  if (content.includes(normOldBack)) {
    content = content.replace(normOldBack, normNewBack);
    console.log(`✅ [${filePath}] Fixed call summary 'Back to Chat' button media cleanup`);
  }

  // 5. Remove duplicate incoming call dialog (Section 7)
  const incomingDialogPattern = /\s*\{\/\* 7\. ENHANCED INCOMING CALL DIALOG \(CALLEE\) \*\/\}\s*\{incomingCall && \([\s\S]*?<\/Dialog>\s*\)\}/;
  if (incomingDialogPattern.test(content)) {
    content = content.replace(incomingDialogPattern, '\n      {/* 7. INCOMING CALL MANAGED GLOBALLY VIA FullScreenIncomingCall */}\n');
    console.log(`✅ [${filePath}] Removed duplicate in-chat incoming call dialog (Section 7)`);
  }

  // 6. In handleIncomingCall, avoid ringing inside UnifiedChatApp since IncomingCallProvider handles it globally
  const oldHandleIncoming = `        if (current?.callId === data.callId) return current;
        startRingtone();
        return {`;
  const newHandleIncoming = `        if (current?.callId === data.callId) return current;
        return {`;
  if (content.includes(oldHandleIncoming)) {
    content = content.replace(oldHandleIncoming, newHandleIncoming);
    console.log(`✅ [${filePath}] Disabled redundant local ringtone in UnifiedChatApp`);
  }

  // Convert back to CRLF for Windows consistency
  const finalContent = content.replace(/\r?\n/g, '\r\n');
  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log(`✅ [${filePath}] Successfully saved.`);
}

updateUnifiedChatApp(path.join(__dirname, '..', 'src', 'components', 'chat', 'unified-chat-app.tsx'));
updateUnifiedChatApp(path.join(__dirname, '..', 'CMS', 'src', 'components', 'chat', 'unified-chat-app.tsx'));

