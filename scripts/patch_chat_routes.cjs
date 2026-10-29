const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../server/src/routes/chat.routes.ts");
let code = fs.readFileSync(filePath, "utf8");

// 1. Add cleanPersonName and formatNaturalList
const helperCode = `
export function cleanPersonName(name: string): string {
  if (!name) return "User";
  return name
    .replace(/\\s*\\([^)]*(admin|administrator|manager|employee|owner|leader|supervisor|tester|user|staff|hr)[^)]*\\)/gi, "")
    .replace(/\\s+/g, " ")
    .trim();
}

export function formatNaturalList(names: string[]): string {
  const cleaned = names.map(cleanPersonName).filter(Boolean);
  if (cleaned.length === 0) return "members";
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return \`\${cleaned[0]} and \${cleaned[1]}\`;
  return \`\${cleaned.slice(0, -1).join(", ")}, and \${cleaned[cleaned.length - 1]}\`;
}
`;

if (!code.includes("export function cleanPersonName")) {
  const target1 = "profileMemoryCache.delete(key);\r\n    }\r\n  }\r\n}";
  const target1Alt = "profileMemoryCache.delete(key);\n    }\n  }\n}";
  if (code.includes(target1)) {
    code = code.replace(target1, target1 + "\n" + helperCode);
  } else if (code.includes(target1Alt)) {
    code = code.replace(target1Alt, target1Alt + "\n" + helperCode);
  } else {
    console.error("Target 1 not found!");
  }
}

// 2. Group creation event
code = code.replace(
  'const creatorName = creatorProfile?.fullName || req.user?.email?.split("@")[0] || "User";\r\n\r\n      await recordSystemEvent(\r\n        tenantId,\r\n        `group_${created.id}`,\r\n        currentUserId,\r\n        "group_created",\r\n        `${creatorName} created the group "${name.trim()}.".`',
  'const creatorName = cleanPersonName(creatorProfile?.fullName || req.user?.email?.split("@")[0] || "User");\r\n\r\n      await recordSystemEvent(\r\n        tenantId,\r\n        `group_${created.id}`,\r\n        currentUserId,\r\n        "group_created",\r\n        `${creatorName} created the group "${name.trim()}"`'
);
code = code.replace(
  'const creatorName = creatorProfile?.fullName || req.user?.email?.split("@")[0] || "User";\n\n      await recordSystemEvent(\n        tenantId,\n        `group_${created.id}`,\n        currentUserId,\n        "group_created",\n        `${creatorName} created the group "${name.trim()}.".`',
  'const creatorName = cleanPersonName(creatorProfile?.fullName || req.user?.email?.split("@")[0] || "User");\n\n      await recordSystemEvent(\n        tenantId,\n        `group_${created.id}`,\n        currentUserId,\n        "group_created",\n        `${creatorName} created the group "${name.trim()}"`'
);
// Also handle with period inside quotes
code = code.replace(
  '${creatorName} created the group "${name.trim()}".`',
  '${creatorName} created the group "${name.trim()}"`'
);

// 3. Group profile updated event
code = code.replace(
  '${actorName} ${changeDesc}.`',
  '${cleanPersonName(actorName)} ${changeDesc}`'
);

// 4. Member added event
code = code.replace(
  'const addedNames = addedProfiles.map((p) => p.fullName).filter(Boolean).join(", ") || `${newMembers.length} member(s)`;\r\n\r\n      await recordSystemEvent(\r\n        tenantId,\r\n        `group_${id}`,\r\n        currentUserId,\r\n        "member_added",\r\n        `${actorName} added ${addedNames}.`',
  'const addedNames = formatNaturalList(addedProfiles.map((p) => p.fullName)) || `${newMembers.length} member(s)`;\r\n\r\n      await recordSystemEvent(\r\n        tenantId,\r\n        `group_${id}`,\r\n        currentUserId,\r\n        "member_added",\r\n        `${cleanPersonName(actorName)} added ${addedNames}`'
);
code = code.replace(
  'const addedNames = addedProfiles.map((p) => p.fullName).filter(Boolean).join(", ") || `${newMembers.length} member(s)`;\n\n      await recordSystemEvent(\n        tenantId,\n        `group_${id}`,\n        currentUserId,\n        "member_added",\n        `${actorName} added ${addedNames}.`',
  'const addedNames = formatNaturalList(addedProfiles.map((p) => p.fullName)) || `${newMembers.length} member(s)`;\n\n      await recordSystemEvent(\n        tenantId,\n        `group_${id}`,\n        currentUserId,\n        "member_added",\n        `${cleanPersonName(actorName)} added ${addedNames}`'
);

// 5. Member removed / left event
code = code.replace(
  'const eventContent = isSelf ? `${actorName} left the group.` : `${actorName} removed ${targetName}.`;',
  'const eventContent = isSelf ? `${cleanPersonName(actorName)} left the group` : `${cleanPersonName(actorName)} removed ${cleanPersonName(targetName)}`;'
);

// 6. Role changed event
code = code.replace(
  'let roleEventText = `${actorName} changed ${targetName}\'s role to ${role}.`;\r\n    if (role === "admin") roleEventText = `${actorName} made ${targetName} a group admin.`;\r\n    else if (role === "moderator") roleEventText = `${actorName} made ${targetName} a group moderator.`;\r\n    else if (role === "member") roleEventText = `${actorName} removed ${targetName}\'s admin privileges.`;',
  'const cActor = cleanPersonName(actorName);\r\n    const cTarget = cleanPersonName(targetName);\r\n    let roleEventText = `${cActor} changed ${cTarget}\'s role to ${role}`;\r\n    if (role === "admin") roleEventText = `${cActor} made ${cTarget} a group admin`;\r\n    else if (role === "moderator") roleEventText = `${cActor} made ${cTarget} a group moderator`;\r\n    else if (role === "member") roleEventText = `${cActor} removed ${cTarget}\'s admin privileges`;'
);
code = code.replace(
  'let roleEventText = `${actorName} changed ${targetName}\'s role to ${role}.`;\n    if (role === "admin") roleEventText = `${actorName} made ${targetName} a group admin.`;\n    else if (role === "moderator") roleEventText = `${actorName} made ${targetName} a group moderator.`;\n    else if (role === "member") roleEventText = `${actorName} removed ${targetName}\'s admin privileges.`;',
  'const cActor = cleanPersonName(actorName);\n    const cTarget = cleanPersonName(targetName);\n    let roleEventText = `${cActor} changed ${cTarget}\'s role to ${role}`;\n    if (role === "admin") roleEventText = `${cActor} made ${cTarget} a group admin`;\n    else if (role === "moderator") roleEventText = `${cActor} made ${cTarget} a group moderator`;\n    else if (role === "member") roleEventText = `${cActor} removed ${cTarget}\'s admin privileges`;'
);

// 7. Ownership transferred
code = code.replace(
  '${actorName} transferred group ownership to ${targetName}.`',
  '${cleanPersonName(actorName)} transferred group ownership to ${cleanPersonName(targetName)}`'
);

// 8. Add batch forward endpoint
const forwardBatchRoute = `
// POST /api/chat/messages/forward-batch - Forward a message to multiple direct or group conversations
chatRouter.post("/messages/forward-batch", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const currentUserId = req.user?.userId || "";
    const { messageId, targetThreadIds } = req.body;

    if (!messageId || !Array.isArray(targetThreadIds) || targetThreadIds.length === 0) {
      return res.status(400).json({ error: "messageId and targetThreadIds array are required" });
    }

    // 1. Fetch and verify original message
    const originalMessage = await prisma.chatMessage.findFirst({
      where: { id: messageId, tenantId },
    });

    if (!originalMessage) {
      return res.status(404).json({ error: "Original message not found" });
    }

    // Verify source thread access
    const sourceAuth = await checkThreadAuthorization(originalMessage.threadId, tenantId, currentUserId, req.user?.roles);
    if (!sourceAuth.authorized) {
      return res.status(403).json({ error: "Not authorized to access or forward this message" });
    }

    const senderProfile = await prisma.profile.findFirst({
      where: { userId: currentUserId, tenantId },
      select: { fullName: true, avatarUrl: true },
    });
    const senderName = cleanPersonName(senderProfile?.fullName || req.user?.email?.split("@")[0] || "User");
    const senderAvatar = senderProfile?.avatarUrl || null;

    const forwardedMessages: any[] = [];
    const failedThreads: { threadId: string; reason: string }[] = [];
    const uniqueTargets = Array.from(new Set(targetThreadIds));

    for (const targetThreadId of uniqueTargets) {
      try {
        const destAuth = await checkThreadAuthorization(targetThreadId, tenantId, currentUserId, req.user?.roles);
        if (!destAuth.authorized) {
          failedThreads.push({ threadId: targetThreadId, reason: "Access denied to destination conversation" });
          continue;
        }

        const newMsg = await prisma.chatMessage.create({
          data: {
            tenantId,
            threadId: targetThreadId,
            senderId: currentUserId,
            senderName,
            senderAvatar,
            content: originalMessage.content,
            attachments: originalMessage.attachments ? JSON.parse(JSON.stringify(originalMessage.attachments)) : null,
            voiceNote: originalMessage.voiceNote ? JSON.parse(JSON.stringify(originalMessage.voiceNote)) : null,
            poll: originalMessage.poll ? JSON.parse(JSON.stringify(originalMessage.poll)) : null,
            urlPreviews: originalMessage.urlPreviews ? JSON.parse(JSON.stringify(originalMessage.urlPreviews)) : null,
            deliveryStatus: "delivered",
            eventMetadata: {
              isForwarded: true,
              forwardedFromId: originalMessage.id,
              forwardedFromSender: originalMessage.senderName,
            },
          },
        });

        forwardedMessages.push(newMsg);

        // Realtime notification to destination conversation
        broadcastToTenant(tenantId, "chat:message", {
          threadId: targetThreadId,
          message: newMsg,
        });
        await PusherService.triggerTenantEvent(tenantId, "chat:message", {
          threadId: targetThreadId,
          message: newMsg,
        }).catch(() => {});
      } catch (destErr: any) {
        failedThreads.push({ threadId: targetThreadId, reason: destErr.message });
      }
    }

    return res.json({
      success: true,
      forwardedCount: forwardedMessages.length,
      failedCount: failedThreads.length,
      messages: forwardedMessages,
      failedThreads,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
`;

if (!code.includes('chatRouter.post("/messages/forward-batch"')) {
  const pinRouteTarget = "// POST /api/chat/messages/:id/pin";
  if (code.includes(pinRouteTarget)) {
    code = code.replace(pinRouteTarget, forwardBatchRoute + "\n" + pinRouteTarget);
  } else {
    console.error("pinRouteTarget not found!");
  }
}

fs.writeFileSync(filePath, code, "utf8");
console.log("chat.routes.ts patched successfully!");
