const fs = require('fs');
const path = require('path');

function fixHandleAcceptGroupMeeting(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const oldCode = `  const handleAcceptGroupMeeting = async () => {
    if (!incomingGroupMeeting) return;
    stopRingtone();
    const meetingData = incomingGroupMeeting;
    setIncomingGroupMeeting(null);`;

  const newCode = `  const handleAcceptGroupMeeting = async (incomingOverride?: any) => {
    const meetingData = incomingOverride || incomingGroupMeeting;
    if (!meetingData) return;
    stopRingtone();
    setIncomingGroupMeeting(null);`;

  const normContent = content.replace(/\r\n/g, '\n');
  const normOld = oldCode.replace(/\r\n/g, '\n');
  const normNew = newCode.replace(/\r\n/g, '\n');

  if (normContent.includes(normOld)) {
    const updated = normContent.replace(normOld, normNew).replace(/\n/g, '\r\n');
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`✅ [${filePath}] Fixed handleAcceptGroupMeeting signature to accept incomingOverride`);
  } else {
    console.warn(`❌ [${filePath}] Failed to match old handleAcceptGroupMeeting`);
  }
}

fixHandleAcceptGroupMeeting(path.join(__dirname, '..', 'src', 'components', 'chat', 'unified-chat-app.tsx'));
fixHandleAcceptGroupMeeting(path.join(__dirname, '..', 'CMS', 'src', 'components', 'chat', 'unified-chat-app.tsx'));

