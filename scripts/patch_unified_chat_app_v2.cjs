const fs = require("fs");
const path = require("path");

const cmsFile = path.join(__dirname, "../CMS/src/components/chat/unified-chat-app.tsx");
const webFile = path.join(__dirname, "../src/components/chat/unified-chat-app.tsx");

let code = fs.readFileSync(cmsFile, "utf8");

// 1. Add cleanPersonName and cleanSystemEventContent helpers
const helperFunctions = `
export function cleanPersonName(name: string): string {
  if (!name) return "User";
  return name
    .replace(/\\s*\\([^)]*(admin|administrator|manager|employee|owner|leader|supervisor|tester|user|staff|hr)[^)]*\\)/gi, "")
    .replace(/\\s+/g, " ")
    .trim();
}

export function cleanSystemEventContent(content: string): string {
  if (!content) return "";
  return content
    .replace(/\\s*\\([^)]*(admin|administrator|manager|employee|owner|leader|supervisor|tester|user|staff|hr)[^)]*\\)/gi, "")
    .replace(/\\s*\\(\\d{1,2}:\\d{2}(?::\\d{2})?\\s*(?:AM|PM)?\\)/gi, "")
    .replace(/\\s*\\.\\s*$/, "")
    .trim();
}
`;

if (!code.includes("export function cleanSystemEventContent")) {
  if (code.includes('"use client";')) {
    code = code.replace('"use client";', '"use client";\n' + helperFunctions);
  } else {
    code = '"use client";\n' + helperFunctions + '\n' + code;
  }
}

// 2. ChatMessageItem: add isForwarded and forwardedFromSender
code = code.replace(
  "isDeletedForEveryone?: boolean;\r\n  reactions?: Record<string, string[]>;",
  "isDeletedForEveryone?: boolean;\r\n  isForwarded?: boolean;\r\n  forwardedFromSender?: string | null;\r\n  reactions?: Record<string, string[]>;"
);
code = code.replace(
  "isDeletedForEveryone?: boolean;\n  reactions?: Record<string, string[]>;",
  "isDeletedForEveryone?: boolean;\n  isForwarded?: boolean;\n  forwardedFromSender?: string | null;\n  reactions?: Record<string, string[]>;"
);

// 3. formatMessageItem: extract isForwarded and clean title
code = code.replace(
  "isDeletedForEveryone: isDeleted,\r\n    reactions: isDeleted ? {} : (rawReactions || {}),",
  "isDeletedForEveryone: isDeleted,\r\n    isForwarded: Boolean(m.isForwarded || m.eventMetadata?.isForwarded || m.replyTo?.isForwarded),\r\n    forwardedFromSender: m.forwardedFromSender || m.eventMetadata?.forwardedFromSender || null,\r\n    reactions: isDeleted ? {} : (rawReactions || {}),"
);
code = code.replace(
  "isDeletedForEveryone: isDeleted,\n    reactions: isDeleted ? {} : (rawReactions || {}),",
  "isDeletedForEveryone: isDeleted,\n    isForwarded: Boolean(m.isForwarded || m.eventMetadata?.isForwarded || m.replyTo?.isForwarded),\n    forwardedFromSender: m.forwardedFromSender || m.eventMetadata?.forwardedFromSender || null,\n    reactions: isDeleted ? {} : (rawReactions || {}),"
);

// 4. In-Chat System Event Row: strip redundant inline timestamp and use cleanSystemEventContent
code = code.replace(
  `                      {/* Distinct System Event Row */}
                      {msg.isSystemEvent ? (
                        <div className="flex items-center justify-center my-2 w-full">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-muted-foreground text-[11px] max-w-md text-center border border-border/40">
                            <InfoIcon className="size-3 flex-shrink-0 text-teal-600" />
                            <span>{msg.content}</span>
                            {msg.time && (
                              <span className="text-[10px] opacity-75 font-mono">({msg.time})</span>
                            )}
                          </div>
                        </div>
                      ) : (`,
  `                      {/* Distinct System Event Row */}
                      {msg.isSystemEvent ? (
                        <div className="flex items-center justify-center my-2 w-full">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-muted-foreground text-[11px] max-w-md text-center border border-border/40">
                            <InfoIcon className="size-3 flex-shrink-0 text-teal-600" />
                            <span>{cleanSystemEventContent(msg.content)}</span>
                          </div>
                        </div>
                      ) : (`
);

// 5. Sidebar Group Activity List: use cleanSystemEventContent and keep clean separate timestamp
code = code.replace(
  `                        <InfoIcon className="size-3.5 text-teal-600 flex-shrink-0" />
                        <span>{evt.content}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : ""}
                      </p>`,
  `                        <InfoIcon className="size-3.5 text-teal-600 flex-shrink-0" />
                        <span>{cleanSystemEventContent(evt.content)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {evt.createdAt ? new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </p>`
);

// 6. Forwarding State & Handlers
if (!code.includes("selectedForwardThreadIds")) {
  code = code.replace(
    'const [forwardTargetThreadId, setForwardTargetThreadId] = useState("");',
    `const [forwardTargetThreadId, setForwardTargetThreadId] = useState("");
  const [forwardTab, setForwardTab] = useState<"personal" | "group">("personal");
  const [forwardSearch, setForwardSearch] = useState("");
  const [selectedForwardThreadIds, setSelectedForwardThreadIds] = useState<string[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);
  const isInitialScrollDoneRef = useRef<{ [threadId: string]: boolean }>({});`
  );
}

// 7. Initial Scroll-To-Bottom Effect on Thread Load
const initialScrollEffect = `
  // Auto-scroll to latest message on thread open and message load
  useEffect(() => {
    if (!activeThreadId) return;
    if (!isInitialScrollDoneRef.current[activeThreadId] && serverMessages.length > 0 && !isMessagesLoading) {
      const scrollToBottomImmediate = () => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      };

      scrollToBottomImmediate();
      const rafId = requestAnimationFrame(() => {
        scrollToBottomImmediate();
        setTimeout(scrollToBottomImmediate, 80);
        setTimeout(scrollToBottomImmediate, 250);
      });
      isInitialScrollDoneRef.current[activeThreadId] = true;
      return () => cancelAnimationFrame(rafId);
    }
  }, [activeThreadId, serverMessages.length, isMessagesLoading]);
`;

if (!code.includes("isInitialScrollDoneRef.current[activeThreadId]")) {
  code = code.replace(
    "// Cursor-based infinite scroll: load older 25 messages",
    initialScrollEffect + "\n  // Cursor-based infinite scroll: load older 25 messages"
  );
}

// 8. Forward Batch Handler
const batchForwardHandler = `
  const handleBatchForwardMessage = async () => {
    if (!forwardMessage || selectedForwardThreadIds.length === 0 || isForwarding) return;
    setIsForwarding(true);
    try {
      const res: any = await api.post("/api/chat/messages/forward-batch", {
        messageId: forwardMessage.id,
        targetThreadIds: selectedForwardThreadIds,
      });
      if (res?.success) {
        toast.success(\`Message forwarded to \${res.forwardedCount} conversation\${res.forwardedCount > 1 ? "s" : ""}\`);
        setForwardMessage(null);
        setSelectedForwardThreadIds([]);
        setForwardSearch("");
        queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
        queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeThreadId] });
      } else {
        toast.error(res?.error || "Failed to forward message");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to forward message");
    } finally {
      setIsForwarding(false);
    }
  };
`;

code = code.replace(
  "const handleForwardMessage = async () => {",
  batchForwardHandler + "\n  const handleForwardMessage = async () => {"
);

// 9. Personal vs Group filtered lists
const listSeparation = `
  // Filtered Personal Conversations (Direct only)
  const personalConversations = useMemo(() => {
    return conversations
      .filter((c) => c.type === "direct")
      .map((c) => ({
        ...c,
        title: cleanPersonName(c.title),
      }));
  }, [conversations]);

  const filteredPersonalConversations = useMemo(() => {
    return personalConversations.filter((c) => {
      const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter = filterFilter === "unread" ? c.unreadCount > 0 : true;
      return matchSearch && matchFilter;
    });
  }, [personalConversations, searchQuery, filterFilter]);

  // Clean group names
  const cleanGroups = useMemo(() => {
    return groups.map((g) => ({
      ...g,
      name: cleanPersonName(g.name),
    }));
  }, [groups]);
`;

code = code.replace(
  "// Filtered Lists\r\n  const filteredConversations = useMemo(() => {",
  listSeparation + "\n  // Filtered Lists\r\n  const filteredConversations = useMemo(() => {"
);
code = code.replace(
  "// Filtered Lists\n  const filteredConversations = useMemo(() => {",
  listSeparation + "\n  // Filtered Lists\n  const filteredConversations = useMemo(() => {"
);

// 10. Replace the Sidebar Header with Segmented Tabs: Personal, Group, Call Logs
const newSidebarNav = `        {/* Segmented Top Navigation: Personal / Group / Call Logs */}
        <div className="p-3 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-base font-bold text-foreground font-sans">
              {mode === "chats" ? "Personal Chats" : mode === "groups" ? "Group Chats" : "Call Logs"}
            </h2>
            <div className="flex items-center gap-1">
              {mode === "chats" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setNewChatOpen(true)}
                  className="size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="New Chat"
                >
                  <Plus className="size-4" />
                </Button>
              )}
              {mode === "groups" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCreateGroupOpen(true)}
                  className="size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Create Group"
                >
                  <Plus className="size-4" />
                </Button>
              )}
              {mode === "calls" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setScheduleMeetingOpen(true)}
                  className="size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Schedule Meeting"
                >
                  <CalendarPlus className="size-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-lg border border-border/40">
            <button
              type="button"
              onClick={() => handleModeSelect("chats")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer",
                mode === "chats"
                  ? "bg-background text-foreground shadow-xs font-bold border border-border/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="size-3.5" />
              <span>Personal</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeSelect("groups")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer",
                mode === "groups"
                  ? "bg-background text-foreground shadow-xs font-bold border border-border/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="size-3.5" />
              <span>Group</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeSelect("calls")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer",
                mode === "calls"
                  ? "bg-background text-foreground shadow-xs font-bold border border-border/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PhoneCall className="size-3.5" />
              <span>Call Logs</span>
            </button>
          </div>
        </div>`;

// Replace the old DropdownMenu top header
const oldDropdownStart = "        {/* Top Header / Mode Switcher */}\r\n        <div className=\"p-3.5 border-b border-border flex items-center justify-between\">\r\n          <DropdownMenu>";
const oldDropdownEnd = "            {mode === \"calls\" && (\r\n              <Button\r\n                variant=\"ghost\"\r\n                size=\"icon\"\r\n                onClick={() => setScheduleMeetingOpen(true)}\r\n                className=\"size-8 rounded-full text-muted-foreground hover:text-foreground\"\r\n                title=\"Schedule Meeting\"\r\n              >\r\n                <CalendarPlus className=\"size-4\" />\r\n              </Button>\r\n            )}\r\n          </div>\r\n        </div>";

if (code.includes(oldDropdownStart)) {
  const idx1 = code.indexOf(oldDropdownStart);
  const idx2 = code.indexOf(oldDropdownEnd) + oldDropdownEnd.length;
  code = code.slice(0, idx1) + newSidebarNav + code.slice(idx2);
} else {
  // LF fallback
  const oldDropdownStartLF = "        {/* Top Header / Mode Switcher */}\n        <div className=\"p-3.5 border-b border-border flex items-center justify-between\">\n          <DropdownMenu>";
  const oldDropdownEndLF = "            {mode === \"calls\" && (\n              <Button\n                variant=\"ghost\"\n                size=\"icon\"\n                onClick={() => setScheduleMeetingOpen(true)}\n                className=\"size-8 rounded-full text-muted-foreground hover:text-foreground\"\n                title=\"Schedule Meeting\"\n              >\n                <CalendarPlus className=\"size-4\" />\n              </Button>\n            )}\n          </div>\n        </div>";
  if (code.includes(oldDropdownStartLF)) {
    const idx1 = code.indexOf(oldDropdownStartLF);
    const idx2 = code.indexOf(oldDropdownEndLF) + oldDropdownEndLF.length;
    code = code.slice(0, idx1) + newSidebarNav + code.slice(idx2);
  }
}

// 11. In personal chats list, use filteredPersonalConversations
code = code.replace(
  "filteredConversations.length === 0 ? (",
  "filteredPersonalConversations.length === 0 ? ("
);
code = code.replace(
  "filteredConversations.map((item) => {",
  "filteredPersonalConversations.map((item) => {"
);

// 12. In group chats list, use cleanGroups
code = code.replace(
  "filteredGroups.map((group) => {",
  "cleanGroups.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase())).map((group) => {"
);

// 13. Forward Message Dialog Replacement
const newForwardDialog = `      {/* 8. FORWARD MESSAGE DIALOG (SEPARATE PERSONAL AND GROUP SECTIONS) */}
      <Dialog
        open={!!forwardMessage}
        onOpenChange={() => {
          setForwardMessage(null);
          setSelectedForwardThreadIds([]);
          setForwardSearch("");
        }}
      >
        <DialogContent
          className="sm:max-w-lg font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="font-sans flex items-center justify-between">
              <span>Forward Message</span>
              {selectedForwardThreadIds.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                  {selectedForwardThreadIds.length} selected
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="font-sans">
              Select one or multiple personal and group recipients to forward this message to.
            </DialogDescription>
          </DialogHeader>

          {/* Forward Preview Snippet */}
          {forwardMessage && (
            <div className="p-2.5 rounded-lg bg-muted/60 border border-border/70 text-xs flex items-start gap-2">
              <Share2 className="size-4 text-teal-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">
                  From: {cleanPersonName(forwardMessage.senderName)}
                </p>
                <p className="text-muted-foreground truncate">{forwardMessage.content || "[Attachment/Media]"}</p>
              </div>
            </div>
          )}

          {/* Recipient Category Tabs: Personal Chats vs Group Chats */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/70 rounded-lg border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setForwardTab("personal")}
              className={cn(
                "py-1.5 rounded-md font-semibold text-center transition-all cursor-pointer",
                forwardTab === "personal"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Personal Chats ({conversations.filter((c) => c.type === "direct").length})
            </button>
            <button
              type="button"
              onClick={() => setForwardTab("group")}
              className={cn(
                "py-1.5 rounded-md font-semibold text-center transition-all cursor-pointer",
                forwardTab === "group"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Group Chats ({groups.length})
            </button>
          </div>

          {/* Search & Select All Bar */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={forwardSearch}
                  onChange={(e) => setForwardSearch(e.target.value)}
                  placeholder={forwardTab === "personal" ? "Search personal contacts..." : "Search groups..."}
                  className="pl-8 text-xs h-8 bg-muted/40 font-sans"
                />
              </div>

              {/* Select All / Clear Selection for filtered view */}
              {(() => {
                const candidateThreadIds =
                  forwardTab === "personal"
                    ? conversations
                        .filter((c) => c.type === "direct")
                        .filter((c) => cleanPersonName(c.title).toLowerCase().includes(forwardSearch.toLowerCase()))
                        .map((c) => c.threadId)
                    : groups
                        .filter((g) => cleanPersonName(g.name).toLowerCase().includes(forwardSearch.toLowerCase()))
                        .map((g) => \`group_\${g.id}\`);

                const allSelected =
                  candidateThreadIds.length > 0 &&
                  candidateThreadIds.every((tid) => selectedForwardThreadIds.includes(tid));

                return (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-sans whitespace-nowrap"
                    onClick={() => {
                      if (allSelected) {
                        setSelectedForwardThreadIds((prev) =>
                          prev.filter((tid) => !candidateThreadIds.includes(tid))
                        );
                      } else {
                        setSelectedForwardThreadIds((prev) =>
                          Array.from(new Set([...prev, ...candidateThreadIds]))
                        );
                      }
                    }}
                  >
                    {allSelected ? "Clear Filtered" : "Select All"}
                  </Button>
                );
              })()}
            </div>

            {/* Recipient Selection List with Checkboxes */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 border border-border/80 rounded-lg p-2 bg-background">
              {forwardTab === "personal" ? (
                (() => {
                  const directList = conversations
                    .filter((c) => c.type === "direct")
                    .filter((c) => cleanPersonName(c.title).toLowerCase().includes(forwardSearch.toLowerCase()));

                  if (directList.length === 0) {
                    return (
                      <p className="text-center text-xs text-muted-foreground py-6">
                        No personal conversations found.
                      </p>
                    );
                  }

                  return directList.map((c) => {
                    const isChecked = selectedForwardThreadIds.includes(c.threadId);
                    return (
                      <div
                        key={c.threadId}
                        onClick={() => {
                          setSelectedForwardThreadIds((prev) =>
                            isChecked ? prev.filter((id) => id !== c.threadId) : [...prev, c.threadId]
                          );
                        }}
                        className={cn(
                          "p-2 rounded-lg cursor-pointer text-xs flex items-center justify-between border transition-all",
                          isChecked
                            ? "bg-teal-50 dark:bg-teal-950/60 border-teal-500/50 text-foreground font-semibold"
                            : "border-transparent hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent onClick
                            className="size-4 rounded border-border text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                          <Avatar className="size-7 flex-shrink-0">
                            {c.avatarUrl && <AvatarImage src={c.avatarUrl} alt={c.title} />}
                            <AvatarFallback className="text-[10px] font-bold bg-teal-700 text-white">
                              {c.avatarLetter}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{cleanPersonName(c.title)}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground capitalize">
                          Personal
                        </Badge>
                      </div>
                    );
                  });
                })()
              ) : (
                (() => {
                  const groupList = groups.filter((g) =>
                    cleanPersonName(g.name).toLowerCase().includes(forwardSearch.toLowerCase())
                  );

                  if (groupList.length === 0) {
                    return (
                      <p className="text-center text-xs text-muted-foreground py-6">
                        No group conversations found.
                      </p>
                    );
                  }

                  return groupList.map((g) => {
                    const threadId = \`group_\${g.id}\`;
                    const isChecked = selectedForwardThreadIds.includes(threadId);
                    return (
                      <div
                        key={g.id}
                        onClick={() => {
                          setSelectedForwardThreadIds((prev) =>
                            isChecked ? prev.filter((id) => id !== threadId) : [...prev, threadId]
                          );
                        }}
                        className={cn(
                          "p-2 rounded-lg cursor-pointer text-xs flex items-center justify-between border transition-all",
                          isChecked
                            ? "bg-teal-50 dark:bg-teal-950/60 border-teal-500/50 text-foreground font-semibold"
                            : "border-transparent hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="size-4 rounded border-border text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                          <Avatar className="size-7 flex-shrink-0">
                            {g.avatarUrl && <AvatarImage src={g.avatarUrl} alt={g.name} />}
                            <AvatarFallback className="text-[10px] font-bold bg-teal-800 text-white">
                              {g.avatarLetter}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="truncate block">{cleanPersonName(g.name)}</span>
                            <span className="text-[10px] text-muted-foreground block">{g.memberCount} members</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground capitalize">
                          Group
                        </Badge>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>

          <DialogFooter className="font-sans flex items-center justify-between sm:justify-between pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setForwardMessage(null);
                setSelectedForwardThreadIds([]);
                setForwardSearch("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedForwardThreadIds.length === 0 || isForwarding}
              onClick={handleBatchForwardMessage}
              className="bg-teal-700 hover:bg-teal-800 text-white font-sans flex items-center gap-1.5"
            >
              <Share2 className="size-3.5" />
              <span>
                {isForwarding
                  ? "Forwarding..."
                  : selectedForwardThreadIds.length > 0
                  ? \`Forward (\${selectedForwardThreadIds.length})\`
                  : "Select Recipients"}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>`;

// Replace old forward dialog
const oldForwardStart = "      {/* 8. FORWARD MESSAGE DIALOG */}\r\n      <Dialog open={!!forwardMessage}";
const oldForwardEnd = "          </DialogFooter>\r\n        </DialogContent>\r\n      </Dialog>";

if (code.includes(oldForwardStart)) {
  const idx1 = code.indexOf(oldForwardStart);
  const idx2 = code.indexOf(oldForwardEnd, idx1) + oldForwardEnd.length;
  code = code.slice(0, idx1) + newForwardDialog + code.slice(idx2);
} else {
  const oldForwardStartLF = "      {/* 8. FORWARD MESSAGE DIALOG */}\n      <Dialog open={!!forwardMessage}";
  const oldForwardEndLF = "          </DialogFooter>\n        </DialogContent>\n      </Dialog>";
  if (code.includes(oldForwardStartLF)) {
    const idx1 = code.indexOf(oldForwardStartLF);
    const idx2 = code.indexOf(oldForwardEndLF, idx1) + oldForwardEndLF.length;
    code = code.slice(0, idx1) + newForwardDialog + code.slice(idx2);
  }
}

// Write to CMS and sync to Web
fs.writeFileSync(cmsFile, code, "utf8");
fs.writeFileSync(webFile, code, "utf8");

console.log("Both CMS and Web unified-chat-app.tsx patched successfully!");
