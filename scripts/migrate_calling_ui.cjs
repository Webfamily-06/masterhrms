const fs = require("fs");
const path = require("path");

function migrateUnifiedChatApp(filePath) {
  console.log(`Migrating: ${filePath}`);
  let content = fs.readFileSync(filePath, "utf8");
  const isCRLF = content.includes("\r\n");
  const eol = isCRLF ? "\r\n" : "\n";

  // 1. Add imports for DreamsVideoCallScreen and DreamsVoiceCallScreen
  if (!content.includes("DreamsVideoCallScreen")) {
    const importTarget = 'import { InCallInviteModal } from "@/components/calling/in-call-invite-modal";';
    const importReplacement = 
      'import { DreamsVideoCallScreen } from "@/components/calling/dreams-video-call-screen";' + eol +
      'import { DreamsVoiceCallScreen } from "@/components/calling/dreams-voice-call-screen";' + eol +
      'import { InCallInviteModal } from "@/components/calling/in-call-invite-modal";';

    if (content.includes(importTarget)) {
      content = content.replace(importTarget, importReplacement);
      console.log("  Added DreamsVideoCallScreen & DreamsVoiceCallScreen imports");
    } else {
      console.warn("  Could not find importTarget");
    }
  }

  // 2. Update DialogContent styling and body to render Dreams calling screens
  const dialogContentTarget = 
    ': activeCallType === "video"' + eol +
    '              ? "w-screen max-w-none h-[100dvh] sm:max-w-none rounded-none border-0 p-3 sm:p-5 bg-background text-foreground flex flex-col justify-between"' + eol +
    '              : "sm:max-w-md bg-card text-foreground"';

  const dialogContentReplacement = 
    ': activeCallType === "video"' + eol +
    '              ? "max-w-6xl w-[96vw] h-[92vh] sm:max-w-6xl p-2 sm:p-4 rounded-xl border border-border-color bg-white dark:bg-card text-foreground shadow-2xl flex flex-col justify-between overflow-hidden"' + eol +
    '              : "max-w-3xl w-[94vw] h-[86vh] sm:max-w-3xl p-2 sm:p-4 rounded-xl border border-border-color bg-white dark:bg-card text-foreground shadow-2xl flex flex-col justify-between overflow-hidden"';

  if (content.includes(dialogContentTarget)) {
    content = content.replace(dialogContentTarget, dialogContentReplacement);
    console.log("  Updated DialogContent dimensions for Dreams ERP layout");
  }

  // 3. Locate active call body (from ') : (' following callSummary to '</>' before '</DialogContent>')
  const searchPatternStart = "              </div>" + eol + "            </div>" + eol + "          ) : (" + eol + "            <>";
  const searchPatternEnd = "          </Button>" + eol + "          </div>" + eol + "          </>" + eol + "          )}";

  const startIdx = content.indexOf(searchPatternStart);
  const endIdx = content.indexOf(searchPatternEnd);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const beforePart = content.substring(0, startIdx + ("              </div>" + eol + "            </div>" + eol + "          ) : (" + eol).length);
    const afterPart = content.substring(endIdx + ("          </Button>" + eol + "          </div>" + eol + "          </>" + eol).length);

    const newCallingScreensBody = 
      '            activeCallType === "video" ? (' + eol +
      '              <DreamsVideoCallScreen' + eol +
      '                targetName={activeCallTargetName}' + eol +
      '                targetAvatar={activeCallTargetAvatar}' + eol +
      '                targetPhone={activeCallTargetPhone}' + eol +
      '                targetEmail={activeCallTargetEmail}' + eol +
      '                callDurationSeconds={callDurationSeconds}' + eol +
      '                callStatus={callStatus}' + eol +
      '                networkQuality={networkQuality}' + eol +
      '                networkRttMs={networkRttMs}' + eol +
      '                localStream={localStreamRef.current}' + eol +
      '                remoteStream={remoteStreamRef.current}' + eol +
      '                localVideoRef={localVideoRef}' + eol +
      '                remoteVideoRef={remoteVideoRef}' + eol +
      '                participants={activeCallParticipants}' + eol +
      '                isMuted={isMuted}' + eol +
      '                isVideoOff={isVideoOff}' + eol +
      '                isScreenSharing={isScreenSharing}' + eol +
      '                isCallFullscreen={isCallFullscreen}' + eol +
      '                isReconnecting={isReconnecting}' + eol +
      '                peerReconnecting={peerReconnecting}' + eol +
      '                onToggleMute={toggleMute}' + eol +
      '                onToggleVideo={toggleVideo}' + eol +
      '                onToggleScreenShare={toggleScreenShare}' + eol +
      '                onToggleFullscreen={toggleFullscreenCall}' + eol +
      '                onMinimize={() => setIsCallMinimized(true)}' + eol +
      '                onEndCall={handleEndCall}' + eol +
      '                onAddParticipant={() => setInCallAddParticipantOpen(true)}' + eol +
      '                onOpenSettings={() => setInCallSettingsOpen(true)}' + eol +
      '                onSwitchCamera={switchCamera}' + eol +
      '              />' + eol +
      '            ) : (' + eol +
      '              <DreamsVoiceCallScreen' + eol +
      '                targetName={activeCallTargetName}' + eol +
      '                targetAvatar={activeCallTargetAvatar}' + eol +
      '                targetPhone={activeCallTargetPhone}' + eol +
      '                targetEmail={activeCallTargetEmail}' + eol +
      '                callDurationSeconds={callDurationSeconds}' + eol +
      '                callStatus={callStatus}' + eol +
      '                currentUserAvatar={(currentUser as any)?.profile?.avatarUrl || (currentUser as any)?.avatarUrl || null}' + eol +
      '                currentUserName={(currentUser as any)?.profile?.fullName || (currentUser as any)?.name || "You"}' + eol +
      '                remoteAudioRef={remoteAudioRef}' + eol +
      '                remoteIsSpeaking={remoteIsSpeaking}' + eol +
      '                localIsSpeaking={localIsSpeaking}' + eol +
      '                isMuted={isMuted}' + eol +
      '                onToggleMute={toggleMute}' + eol +
      '                onToggleVideo={toggleVideo}' + eol +
      '                onMinimize={() => setIsCallMinimized(true)}' + eol +
      '                onEndCall={handleEndCall}' + eol +
      '                onAddParticipant={() => setInCallAddParticipantOpen(true)}' + eol +
      '                onOpenSettings={() => setInCallSettingsOpen(true)}' + eol +
      '                onToggleScreenShare={toggleScreenShare}' + eol +
      '              />' + eol +
      '            )' + eol;

    content = beforePart + newCallingScreensBody + afterPart;
    console.log("  Successfully replaced calling screen body with DreamsVideoCallScreen and DreamsVoiceCallScreen");
  } else {
    console.error("  Failed to find start or end index for calling screens body", { startIdx, endIdx });
  }

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Finished migration for ${filePath}\n`);
}

migrateUnifiedChatApp("CMS/src/components/chat/unified-chat-app.tsx");
migrateUnifiedChatApp("src/components/chat/unified-chat-app.tsx");

