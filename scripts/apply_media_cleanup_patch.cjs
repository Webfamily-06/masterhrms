const fs = require('fs');
const path = require('path');

function updateFiles(filePaths) {
  filePaths.forEach((filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Replace cleanUpMedia
    const cleanUpMediaRegex = /const cleanUpMedia = useCallback\(\(\) => \{[\s\S]*?\}, \[stopRingtone\]\);/;
    const newCleanUpMedia = `const cleanUpMedia = useCallback(() => {
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

    if (cleanUpMediaRegex.test(content)) {
      content = content.replace(cleanUpMediaRegex, newCleanUpMedia);
      console.log(`✅ [${filePath}] cleanUpMedia updated`);
    } else {
      console.warn(`❌ [${filePath}] cleanUpMediaRegex failed to match`);
    }

    // 2. Replace onOpenChange on activeCallModal
    const onOpenChangeRegex = /onOpenChange=\{\(open\) => \{\s*if \(!open\) \{\s*setCallSummary\(null\);\s*setActiveCallModalOpen\(false\);\s*\} else \{\s*setActiveCallModalOpen\(true\);\s*\}\s*\}\}/;
    const newOnOpenChange = `onOpenChange={(open) => {
          if (!open) {
            cleanUpMedia();
            cleanUpMeetingMedia();
            setCallSummary(null);
            setActiveCallModalOpen(false);
          } else {
            setActiveCallModalOpen(true);
          }
        }}`;

    if (onOpenChangeRegex.test(content)) {
      content = content.replace(onOpenChangeRegex, newOnOpenChange);
      console.log(`✅ [${filePath}] onOpenChange updated`);
    } else {
      console.warn(`❌ [${filePath}] onOpenChangeRegex failed to match`);
    }

    // 3. Replace call summary back button
    const backBtnRegex = /data-testid="call-summary-back-btn"\s*onClick=\{\(\) => \{\s*setCallSummary\(null\);\s*setActiveCallModalOpen\(false\);\s*setCallStatus\("calling"\);\s*setCallDurationSeconds\(0\);\s*\}\}/;
    const newBackBtn = `data-testid="call-summary-back-btn"
                  onClick={() => {
                    cleanUpMedia();
                    cleanUpMeetingMedia();
                    setCallSummary(null);
                    setActiveCallModalOpen(false);
                    setCallStatus("calling");
                    setCallDurationSeconds(0);
                  }}`;

    if (backBtnRegex.test(content)) {
      content = content.replace(backBtnRegex, newBackBtn);
      console.log(`✅ [${filePath}] call-summary-back-btn updated`);
    } else {
      console.warn(`❌ [${filePath}] backBtnRegex failed to match`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
  });
}

updateFiles([
  path.join(__dirname, '..', 'src', 'components', 'chat', 'unified-chat-app.tsx'),
  path.join(__dirname, '..', 'CMS', 'src', 'components', 'chat', 'unified-chat-app.tsx')
]);

