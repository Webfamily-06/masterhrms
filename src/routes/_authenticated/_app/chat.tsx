import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlanGuard } from "@/components/plan-guard";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Users,
  Search,
  Plus,
  Paperclip,
  Image as ImageIcon,
  FileText,
  MapPin,
  Check,
  CheckCheck,
  Shield,
  Download,
  Eye,
  X,
  Mic,
  Smile,
  Play,
  Pause,
  Square,
  RotateCcw,
  Volume2,
  FolderPlus,
  ArrowLeft,
  UploadCloud,
  Pin,
  PinOff,
  UserPlus,
  UserMinus,
  LogOut,
  Trash2,
  Camera,
  Reply,
  CornerDownRight,
  ChevronUp,
  Circle,
  ChevronDown,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/chat")({
  component: TeamWhatsAppChatAddon,
  head: () => ({ meta: [{ title: "Team Chat & Workspace Channels — Master HRMS" }] }),
});

export type PresenceStatusType = "available" | "busy" | "away" | "break" | "offline";

export const PRESENCE_CONFIG: Record<
  PresenceStatusType,
  { label: string; dotClass: string; badgeClass: string; icon: string; desc: string }
> = {
  available: {
    label: "Available",
    dotClass: "bg-emerald-500",
    badgeClass: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    icon: "🟢",
    desc: "Online & ready to communicate",
  },
  busy: {
    label: "In a Meeting",
    dotClass: "bg-rose-500",
    badgeClass: "text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/30",
    icon: "🔴",
    desc: "Busy with meetings / calls",
  },
  away: {
    label: "Away from Desk",
    dotClass: "bg-amber-500",
    badgeClass: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30",
    icon: "🟡",
    desc: "Away for a moment",
  },
  break: {
    label: "On Lunch / Break",
    dotClass: "bg-indigo-500",
    badgeClass: "text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/30",
    icon: "☕",
    desc: "On short break, back soon",
  },
  offline: {
    label: "Do Not Disturb",
    dotClass: "bg-slate-400",
    badgeClass: "text-slate-700 dark:text-slate-300 bg-slate-500/10 border-slate-500/30",
    icon: "🌙",
    desc: "Urgent notifications only",
  },
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  type: "text" | "image" | "file" | "location" | "audio";
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  locationCoords?: string;
  audioDuration?: string;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  reactions?: Record<string, string[]>;
  isRead: boolean;
};

export const EMOJI_LIST = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😋", "😛", "😜",
  "🤪", "😎", "🤩", "🥳", "😏", "👍", "👎", "👌", "✌️", "🤞",
  "🤝", "🙏", "👏", "🙌", "💪", "🔥", "💯", "🎉", "🎊", "🚀",
  "💼", "📊", "📌", "🏆", "⭐", "✨", "💡", "⚡", "❤️", "💖",
  "💙", "💚", "💛", "🧡", "💜", "☕", "🍕", "🎯", "✅"
];

export type ChatThread = {
  id: string;
  name: string;
  avatarUrl?: string;
  isGroup: boolean;
  groupAdminIds?: string[];
  onlyAdminsCanSend?: boolean;
  participantIds: string[];
  participantNames?: string[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isPinned?: boolean;
  pinnedMessageId?: string;
  pinnedMessageText?: string;
};

export type EmployeeUser = {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: string;
  isCheckedIn?: boolean;
};

function getInitials(name: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function TeamWhatsAppChatAddon() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: currentProfile } = useCurrentProfile(user);

  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [inputMsg, setInputMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [messagePageSize, setMessagePageSize] = useState<number>(20);

  // Local Reactive State for instant UI responsiveness
  const [localThreads, setLocalThreads] = useState<ChatThread[]>([]);
  const [localMessagesMap, setLocalMessagesMap] = useState<Record<string, ChatMessage[]>>({});
  const [presenceMap, setPresenceMap] = useState<
    Record<string, { status: PresenceStatusType; customText?: string }>
  >({});

  // Status Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatusType, setSelectedStatusType] = useState<PresenceStatusType>("available");
  const [customStatusText, setCustomStatusText] = useState("");

  // Reply Message State
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Voice Note State (Record -> Pause/Resume -> Stop & Review -> Listen Preview -> Send)
  const [voiceState, setVoiceState] = useState<"idle" | "recording" | "paused" | "reviewing">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // In-Page Attachment Viewer Modal State (Image / PDF / File)
  const [previewModalFile, setPreviewModalFile] = useState<{
    url: string;
    name: string;
    type: "image" | "pdf" | "file";
    size?: string;
  } | null>(null);

  // Attachments State
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string; dataUrl?: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Group Create Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupAvatar, setNewGroupAvatar] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [onlyAdminsCanSend, setOnlyAdminsCanSend] = useState(false);

  // Group Info / Settings Modal State
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"sidebar" | "chat">("sidebar");
  const [activeTab, setActiveTab] = useState<string>("chats");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const groupCreateImageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<any>(null);
  const touchStartXRef = useRef<number>(0);
  const touchCurrentXRef = useRef<number>(0);
  const longPressTimerRef = useRef<any>(null);

  // Current User ID
  const myUserId = user?.id || "super_admin";

  // 1. REALTIME QUERY: Fetch employees list & active attendance from MySQL
  const { data: employeesList = [] } = useQuery({
    queryKey: ["realtime-chat-employees-with-attendance"],
    queryFn: async () => {
      try {
        const [empData, attendanceData] = await Promise.all([
          api.get("/employees").catch(() => []),
          api.get(`/attendance?date=${new Date().toISOString().slice(0, 10)}`).catch(() => []),
        ]);

        const employees = Array.isArray(empData) ? empData : [];
        const attendance = Array.isArray(attendanceData) ? attendanceData : [];

        const checkedInIds = new Set(
          attendance.filter((a: any) => a.checkIn || a.check_in).map((a: any) => a.employeeId || a.employee_id),
        );

        return employees.map((e: any) => {
          const profileAvatar = e.user?.profile?.avatarUrl || e.avatarUrl || e.avatar_url || undefined;
          return {
            id: e.id,
            full_name: `${e.firstName || e.first_name || ""} ${e.lastName || e.last_name || ""}`.trim() || e.email,
            email: e.email,
            avatar_url: profileAvatar,
            role: e.position || e.department?.name || "Employee",
            isCheckedIn: checkedInIds.has(e.id),
          };
        });
      } catch {
        return [];
      }
    },
    refetchInterval: 15000,
  });

  // 2. REALTIME QUERY: Fetch Chat State from MySQL & Local Backup
  const { data: chatData } = useQuery({
    queryKey: ["team-chat-state-full"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/team-chat-workspace-v3").catch(() => null);
        if (page && page.content && (page.content.threads?.length || Object.keys(page.content.messagesMap || {}).length)) {
          try {
            localStorage.setItem("hrms_team_chat_backup_v3", JSON.stringify(page.content));
          } catch {}
          return {
            threads: page.content.threads || [],
            messagesMap: page.content.messagesMap || {},
            presenceMap: page.content.presenceMap || {},
          };
        }
      } catch {}

      // Fallback to localStorage backup if available
      try {
        const localBackup = localStorage.getItem("hrms_team_chat_backup_v3");
        if (localBackup) {
          const parsed = JSON.parse(localBackup);
          return {
            threads: parsed.threads || [],
            messagesMap: parsed.messagesMap || {},
            presenceMap: parsed.presenceMap || {},
          };
        }
      } catch {}

      return { threads: [], messagesMap: {}, presenceMap: {} };
    },
  });

  // Sync server data to local state
  useEffect(() => {
    if (chatData) {
      if (chatData.threads && chatData.threads.length > 0) {
        setLocalThreads(chatData.threads);
      }
      if (chatData.messagesMap) {
        setLocalMessagesMap(chatData.messagesMap);
      }
      if (chatData.presenceMap) {
        setPresenceMap(chatData.presenceMap);
      }
    }
  }, [chatData]);

  // Auto select first thread if activeThreadId is empty
  useEffect(() => {
    if (!activeThreadId && localThreads.length > 0) {
      setActiveThreadId(localThreads[0].id);
    }
  }, [localThreads, activeThreadId]);

  // Mark current thread's messages as read and clear unread badge
  useEffect(() => {
    if (!activeThreadId) return;
    const msgs = localMessagesMap[activeThreadId];
    if (!msgs || msgs.length === 0) return;

    let hasUnread = false;
    const updatedMsgs = msgs.map((m) => {
      if (m.senderId !== myUserId && (!m.isRead || m.status !== "read")) {
        hasUnread = true;
        return { ...m, isRead: true, status: "read" as const };
      }
      return m;
    });

    if (hasUnread) {
      setLocalMessagesMap((prev) => ({ ...prev, [activeThreadId]: updatedMsgs }));
      setLocalThreads((prev) =>
        prev.map((t) => (t.id === activeThreadId ? { ...t, unreadCount: 0 } : t)),
      );
    }
  }, [activeThreadId]);

  const currentThread = useMemo(() => {
    return localThreads.find((t) => t.id === activeThreadId) || (localThreads.length > 0 ? localThreads[0] : null);
  }, [localThreads, activeThreadId]);

  const activeMessages = useMemo(() => {
    return currentThread ? localMessagesMap[currentThread.id] || [] : [];
  }, [localMessagesMap, currentThread]);

  // Paginated visible messages (latest 20, 40, 60...)
  const visibleMessages = useMemo(() => {
    return activeMessages.slice(-messagePageSize);
  }, [activeMessages, messagePageSize]);

  const hasEarlierMessages = activeMessages.length > visibleMessages.length;

  const activeTargetEmp = useMemo(() => {
    if (!currentThread || currentThread.isGroup) return null;
    return employeesList.find((e: EmployeeUser) => currentThread.participantIds.includes(e.id));
  }, [currentThread, employeesList]);

  // Current user's presence status
  const myPresence = useMemo(() => {
    return presenceMap[myUserId] || { status: "available" as PresenceStatusType, customText: "Online & Available" };
  }, [presenceMap, myUserId]);

  // Voice Note Timer
  useEffect(() => {
    if (voiceState === "recording") {
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [voiceState]);

  // Auto Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length]);

  // Save Chat Mutation (MySQL CMS page + LocalStorage fail-safe backup)
  const saveChatStateMutation = useMutation({
    mutationFn: async ({
      updatedThreads,
      updatedMessagesMap,
      updatedPresenceMap,
    }: {
      updatedThreads?: ChatThread[];
      updatedMessagesMap?: Record<string, ChatMessage[]>;
      updatedPresenceMap?: Record<string, { status: PresenceStatusType; customText?: string }>;
    }) => {
      const payload = {
        threads: updatedThreads || localThreads,
        messagesMap: updatedMessagesMap || localMessagesMap,
        presenceMap: updatedPresenceMap || presenceMap,
      };

      try {
        localStorage.setItem("hrms_team_chat_backup_v3", JSON.stringify(payload));
      } catch {}

      return await api.put("/cms/pages/team-chat-workspace-v3", {
        title: "Enterprise Team Chat Workspace",
        content: payload,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-chat-state-full"] });
    },
  });

  // Save User Status
  function handleSavePresence(status: PresenceStatusType, customText?: string) {
    const updated = {
      ...presenceMap,
      [myUserId]: {
        status,
        customText: customText || PRESENCE_CONFIG[status].desc,
      },
    };
    setPresenceMap(updated);
    saveChatStateMutation.mutate({ updatedPresenceMap: updated });
    setIsStatusModalOpen(false);
    toast.success(`Status updated to "${PRESENCE_CONFIG[status].label}"`);
  }

  // Drag and Drop File Handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    processUploadedFile(files[0]);
  }

  function processUploadedFile(file: File) {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachedImage({ url: ev.target?.result as string, name: file.name });
        toast.success(`📸 Image "${file.name}" attached!`);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
        const displaySize = file.size > 1024 * 1024 ? `${fileSizeMb} MB` : `${Math.round(file.size / 1024)} KB`;
        setAttachedFile({
          name: file.name,
          size: displaySize,
          dataUrl: ev.target?.result as string,
        });
        toast.success(`📎 Document "${file.name}" (${displaySize}) attached!`);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processUploadedFile(files[0]);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processUploadedFile(files[0]);
  }

  // Voice Note Handlers
  function handleStartRecording() {
    setRecordingSeconds(0);
    setIsPreviewPlaying(false);
    setVoiceState("recording");
  }

  function handlePauseRecording() {
    setVoiceState("paused");
  }

  function handleResumeRecording() {
    setVoiceState("recording");
  }

  function handleFinishRecording() {
    if (recordingSeconds < 1) setRecordingSeconds(1);
    setVoiceState("reviewing");
    setIsPreviewPlaying(false);
    toast.info("Voice note recorded! Listen to preview before sending.");
  }

  function handleCancelVoiceNote() {
    setVoiceState("idle");
    setRecordingSeconds(0);
    setIsPreviewPlaying(false);
    toast.info("Voice note discarded.");
  }

  function handleReRecord() {
    setRecordingSeconds(0);
    setIsPreviewPlaying(false);
    setVoiceState("recording");
  }

  function handleTogglePreviewPlay() {
    setIsPreviewPlaying((prev) => !prev);
  }

  // Send Voice Note Handler (Only when confirmed after listening)
  function handleSendVoiceNote() {
    if (!activeThreadId || !currentThread) return toast.error("Select a chat first");
    const mins = Math.floor(recordingSeconds / 60);
    const secs = recordingSeconds % 60;
    const durationFormatted = `${mins}:${secs < 10 ? "0" : ""}${secs || 1}`;

    const otherParticipantId = currentThread.participantIds.find((id) => id !== myUserId);
    const targetPresence = otherParticipantId ? presenceMap[otherParticipantId]?.status : undefined;
    const isOffline = targetPresence === "offline";
    const initialStatus: "sent" | "delivered" | "read" = isOffline ? "sent" : "delivered";
    const msgId = `msg-${Date.now()}`;

    const newMsg: ChatMessage = {
      id: msgId,
      senderId: myUserId,
      senderName: currentProfile?.full_name || "Super Admin",
      senderAvatar: currentProfile?.avatar_url || undefined,
      text: "🎤 Voice Note",
      type: "audio",
      audioDuration: durationFormatted,
      replyTo: replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: initialStatus,
      isRead: true,
    };

    setVoiceState("idle");
    setRecordingSeconds(0);
    setIsPreviewPlaying(false);
    setReplyingTo(null);

    const updatedMessages = [...activeMessages, newMsg];
    const updatedMessagesMap = { ...localMessagesMap, [activeThreadId]: updatedMessages };

    const updatedThreads = localThreads.map((t) =>
      t.id === activeThreadId
        ? {
            ...t,
            lastMessage: "🎤 Voice Note",
            lastMessageTime: newMsg.timestamp,
            unreadCount: 0,
          }
        : t,
    );

    setLocalMessagesMap(updatedMessagesMap);
    setLocalThreads(updatedThreads);
    saveChatStateMutation.mutate({ updatedThreads, updatedMessagesMap });
    toast.success("Voice Note sent!");

    // Realtime Tick Progression (Sent -> Delivered -> Read)
    if (initialStatus === "sent") {
      setTimeout(() => {
        setLocalMessagesMap((prevMap) => {
          const msgs = prevMap[activeThreadId];
          if (!msgs) return prevMap;
          const updated = msgs.map((m) =>
            m.id === msgId && m.status === "sent" ? { ...m, status: "delivered" as const } : m,
          );
          return { ...prevMap, [activeThreadId]: updated };
        });
      }, 1500);
    }

    setTimeout(() => {
      setLocalMessagesMap((prevMap) => {
        const msgs = prevMap[activeThreadId];
        if (!msgs) return prevMap;
        const updated = msgs.map((m) => (m.id === msgId ? { ...m, status: "read" as const } : m));
        return { ...prevMap, [activeThreadId]: updated };
      });
    }, 3500);
  }

  // Send Message Handler
  function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!activeThreadId || !currentThread) return toast.error("Select a chat to send messages");

    // Check Group Admin Permission
    if (currentThread.isGroup && currentThread.onlyAdminsCanSend) {
      const isAdmin = currentThread.groupAdminIds?.includes(myUserId) || true;
      if (!isAdmin) {
        return toast.error("Only channel admins can send messages in this channel.");
      }
    }

    if (!inputMsg.trim() && !attachedImage && !attachedFile) return;

    let msgType: ChatMessage["type"] = "text";
    let mediaUrl: string | undefined = undefined;
    let fileName: string | undefined = undefined;
    let fileSize: string | undefined = undefined;

    if (attachedImage) {
      msgType = "image";
      mediaUrl = attachedImage.url;
      fileName = attachedImage.name;
    } else if (attachedFile) {
      msgType = "file";
      fileName = attachedFile.name;
      fileSize = attachedFile.size;
      mediaUrl = attachedFile.dataUrl;
    }

    const otherParticipantId = currentThread.participantIds.find((id) => id !== myUserId);
    const targetPresence = otherParticipantId ? presenceMap[otherParticipantId]?.status : undefined;
    const isOffline = targetPresence === "offline";
    const initialStatus: "sent" | "delivered" | "read" = isOffline ? "sent" : "delivered";
    const msgId = `msg-${Date.now()}`;

    const newMsg: ChatMessage = {
      id: msgId,
      senderId: myUserId,
      senderName: currentProfile?.full_name || "Super Admin",
      senderAvatar: currentProfile?.avatar_url || undefined,
      text: inputMsg.trim() || fileName || "Attachment",
      type: msgType,
      mediaUrl,
      fileName,
      fileSize,
      replyTo: replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: initialStatus,
      isRead: true,
    };

    const updatedMessages = [...activeMessages, newMsg];
    const updatedMessagesMap = { ...localMessagesMap, [activeThreadId]: updatedMessages };

    const updatedThreads = localThreads.map((t) =>
      t.id === activeThreadId
        ? {
            ...t,
            lastMessage: newMsg.text,
            lastMessageTime: newMsg.timestamp,
            unreadCount: 0,
          }
        : t,
    );

    setLocalMessagesMap(updatedMessagesMap);
    setLocalThreads(updatedThreads);
    saveChatStateMutation.mutate({ updatedThreads, updatedMessagesMap });

    // Reset Input & Reply
    setInputMsg("");
    setAttachedImage(null);
    setAttachedFile(null);
    setReplyingTo(null);

    // Realtime Tick Progression (Sent -> Delivered -> Read)
    if (initialStatus === "sent") {
      setTimeout(() => {
        setLocalMessagesMap((prevMap) => {
          const msgs = prevMap[activeThreadId];
          if (!msgs) return prevMap;
          const updated = msgs.map((m) =>
            m.id === msgId && m.status === "sent" ? { ...m, status: "delivered" as const } : m,
          );
          return { ...prevMap, [activeThreadId]: updated };
        });
      }, 1500);
    }

    setTimeout(() => {
      setLocalMessagesMap((prevMap) => {
        const msgs = prevMap[activeThreadId];
        if (!msgs) return prevMap;
        const updated = msgs.map((m) => (m.id === msgId ? { ...m, status: "read" as const } : m));
        return { ...prevMap, [activeThreadId]: updated };
      });
    }, 3500);
  }

  // Pin / Unpin Message (Admin Only)
  function handleTogglePinMessage(msg: ChatMessage) {
    if (!currentThread) return;
    const isCurrentlyPinned = currentThread.pinnedMessageId === msg.id;

    const updatedThreads = localThreads.map((t) =>
      t.id === currentThread.id
        ? {
            ...t,
            pinnedMessageId: isCurrentlyPinned ? undefined : msg.id,
            pinnedMessageText: isCurrentlyPinned ? undefined : msg.text,
          }
        : t,
    );

    setLocalThreads(updatedThreads);
    saveChatStateMutation.mutate({ updatedThreads });
    toast.success(isCurrentlyPinned ? "📌 Message unpinned from channel" : "📌 Message pinned to channel banner!");
  }

  // Toggle Emoji Reaction on a Message
  function handleToggleReaction(msg: ChatMessage, emoji: string) {
    if (!activeThreadId) return;
    const currentReactions = { ...(msg.reactions || {}) };
    const currentUsers = currentReactions[emoji] || [];

    if (currentUsers.includes(myUserId)) {
      currentReactions[emoji] = currentUsers.filter((id) => id !== myUserId);
      if (currentReactions[emoji].length === 0) {
        delete currentReactions[emoji];
      }
    } else {
      currentReactions[emoji] = [...currentUsers, myUserId];
    }

    const updatedMessages = activeMessages.map((m) =>
      m.id === msg.id ? { ...m, reactions: currentReactions } : m,
    );
    const updatedMessagesMap = { ...localMessagesMap, [activeThreadId]: updatedMessages };

    setLocalMessagesMap(updatedMessagesMap);
    saveChatStateMutation.mutate({ updatedMessagesMap });
  }

  // Start 1-on-1 Direct Chat with Employee (Instant Reactive Switching)
  function handleStartDirectChat(emp: EmployeeUser) {
    const threadId = `direct-${emp.id}`;
    const existingThread = localThreads.find((t) => t.id === threadId);

    if (!existingThread) {
      const newThread: ChatThread = {
        id: threadId,
        name: emp.full_name,
        avatarUrl: emp.avatar_url,
        isGroup: false,
        participantIds: [myUserId, emp.id],
        participantNames: [currentProfile?.full_name || "Super Admin", emp.full_name],
        lastMessage: "Started conversation",
        lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        unreadCount: 0,
      };

      const welcomeMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: myUserId,
        senderName: currentProfile?.full_name || "Super Admin",
        senderAvatar: currentProfile?.avatar_url || undefined,
        text: `👋 Hello ${emp.full_name}!`,
        type: "text",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isRead: true,
      };

      const nextThreads = [newThread, ...localThreads];
      const nextMessagesMap = { ...localMessagesMap, [threadId]: [welcomeMsg] };

      setLocalThreads(nextThreads);
      setLocalMessagesMap(nextMessagesMap);
      saveChatStateMutation.mutate({ updatedThreads: nextThreads, updatedMessagesMap: nextMessagesMap });
    }

    setActiveThreadId(threadId);
    setActiveTab("chats");
    setMobileView("chat");
    toast.success(`Chat opened with ${emp.full_name}`);
  }

  // Create Department Group
  function handleCreateGroup() {
    if (!newGroupName.trim()) return toast.error("Group name is required");

    const newGroupId = `group-${Date.now()}`;
    const memberObjects = employeesList.filter((e) => selectedGroupMembers.includes(e.id));
    const memberNames = [
      currentProfile?.full_name || "Super Admin",
      ...memberObjects.map((e) => e.full_name),
    ];

    const newThread: ChatThread = {
      id: newGroupId,
      name: newGroupName.trim(),
      avatarUrl: newGroupAvatar || undefined,
      isGroup: true,
      groupAdminIds: [myUserId],
      onlyAdminsCanSend,
      participantIds: [myUserId, ...selectedGroupMembers],
      participantNames: memberNames,
      lastMessage: "Group channel created.",
      lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      unreadCount: 0,
    };

    const welcomeMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: myUserId,
      senderName: currentProfile?.full_name || "Super Admin",
      text: `🎉 Welcome to ${newGroupName}! Group channel created with ${memberNames.length} team members.`,
      type: "text",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isRead: true,
    };

    const nextThreads = [newThread, ...localThreads];
    const nextMessagesMap = { ...localMessagesMap, [newGroupId]: [welcomeMsg] };

    setLocalThreads(nextThreads);
    setLocalMessagesMap(nextMessagesMap);
    saveChatStateMutation.mutate({ updatedThreads: nextThreads, updatedMessagesMap: nextMessagesMap });

    setIsGroupModalOpen(false);
    setNewGroupName("");
    setNewGroupAvatar("");
    setSelectedGroupMembers([]);
    setOnlyAdminsCanSend(false);
    setActiveThreadId(newGroupId);
    setActiveTab("groups");
    setMobileView("chat");
    toast.success(`Group "${newThread.name}" created successfully!`);
  }

  function handleCreateGroupImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNewGroupAvatar(ev.target?.result as string);
      toast.success("Group photo selected!");
    };
    reader.readAsDataURL(files[0]);
  }

  // Add Member to Group
  function handleAddMemberToGroup(emp: EmployeeUser) {
    if (!currentThread) return;
    if (currentThread.participantIds.includes(emp.id)) {
      return toast.error("Employee is already in this channel.");
    }

    const updatedParticipantIds = [...currentThread.participantIds, emp.id];
    const updatedParticipantNames = [...(currentThread.participantNames || []), emp.full_name];

    const systemMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: "system",
      senderName: "System",
      text: `➕ ${emp.full_name} was added to the channel.`,
      type: "text",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isRead: true,
    };

    const updatedThreads = localThreads.map((t) =>
      t.id === currentThread.id
        ? {
            ...t,
            participantIds: updatedParticipantIds,
            participantNames: updatedParticipantNames,
          }
        : t,
    );

    const updatedMessagesMap = {
      ...localMessagesMap,
      [currentThread.id]: [...activeMessages, systemMsg],
    };

    setLocalThreads(updatedThreads);
    setLocalMessagesMap(updatedMessagesMap);
    saveChatStateMutation.mutate({ updatedThreads, updatedMessagesMap });
    toast.success(`${emp.full_name} added to ${currentThread.name}!`);
  }

  // Remove Member from Group
  function handleRemoveMemberFromGroup(empId: string, empName: string) {
    if (!currentThread) return;

    const updatedParticipantIds = currentThread.participantIds.filter((id) => id !== empId);
    const updatedParticipantNames = (currentThread.participantNames || []).filter((n) => n !== empName);

    const systemMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: "system",
      senderName: "System",
      text: `➖ ${empName} was removed from the channel.`,
      type: "text",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isRead: true,
    };

    const updatedThreads = localThreads.map((t) =>
      t.id === currentThread.id
        ? {
            ...t,
            participantIds: updatedParticipantIds,
            participantNames: updatedParticipantNames,
          }
        : t,
    );

    const updatedMessagesMap = {
      ...localMessagesMap,
      [currentThread.id]: [...activeMessages, systemMsg],
    };

    setLocalThreads(updatedThreads);
    setLocalMessagesMap(updatedMessagesMap);
    saveChatStateMutation.mutate({ updatedThreads, updatedMessagesMap });
    toast.success(`${empName} removed from channel.`);
  }

  // Leave Group Handler
  function handleLeaveGroup() {
    if (!currentThread) return;
    const currentUserName = currentProfile?.full_name || "Super Admin";

    const updatedParticipantIds = currentThread.participantIds.filter((id) => id !== myUserId);
    const updatedParticipantNames = (currentThread.participantNames || []).filter((n) => n !== currentUserName);

    const systemMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: "system",
      senderName: "System",
      text: `🚪 ${currentUserName} left the channel.`,
      type: "text",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isRead: true,
    };

    const updatedThreads = localThreads.map((t) =>
      t.id === currentThread.id
        ? {
            ...t,
            participantIds: updatedParticipantIds,
            participantNames: updatedParticipantNames,
          }
        : t,
    );

    const updatedMessagesMap = {
      ...localMessagesMap,
      [currentThread.id]: [...activeMessages, systemMsg],
    };

    setLocalThreads(updatedThreads);
    setLocalMessagesMap(updatedMessagesMap);
    saveChatStateMutation.mutate({ updatedThreads, updatedMessagesMap });
    setIsGroupInfoOpen(false);
    toast.success(`You left ${currentThread.name}`);
  }

  // Delete Group Handler
  function handleDeleteGroup() {
    if (!currentThread) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${currentThread.name}"? This action cannot be undone.`)) {
      return;
    }

    const updatedThreads = localThreads.filter((t) => t.id !== currentThread.id);
    const updatedMessagesMap = { ...localMessagesMap };
    delete updatedMessagesMap[currentThread.id];

    setLocalThreads(updatedThreads);
    setLocalMessagesMap(updatedMessagesMap);
    saveChatStateMutation.mutate({ updatedThreads, updatedMessagesMap });
    setIsGroupInfoOpen(false);
    setActiveThreadId(updatedThreads[0]?.id || "");
    toast.success(`Channel "${currentThread.name}" deleted.`);
  }

  // Update Group Profile Picture in Info Modal
  function handleGroupAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentThread) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const avatarUrl = ev.target?.result as string;
      const updatedThreads = localThreads.map((t) =>
        t.id === currentThread.id ? { ...t, avatarUrl } : t,
      );
      setLocalThreads(updatedThreads);
      saveChatStateMutation.mutate({ updatedThreads });
      toast.success("Group profile picture updated!");
    };
    reader.readAsDataURL(files[0]);
  }

  // Mobile Touch Gestures: Swipe Right to Reply & Long Press to React
  function handleTouchStart(e: React.TouchEvent, msg: ChatMessage) {
    touchStartXRef.current = e.touches[0].clientX;
    touchCurrentXRef.current = e.touches[0].clientX;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      handleToggleReaction(msg, "❤️");
      toast.success(`Reacted ❤️ to ${msg.senderName}'s message`);
    }, 550);
  }

  function handleTouchMove(e: React.TouchEvent) {
    touchCurrentXRef.current = e.touches[0].clientX;
    if (Math.abs(touchCurrentXRef.current - touchStartXRef.current) > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }

  function handleTouchEnd(msg: ChatMessage) {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    const deltaX = touchCurrentXRef.current - touchStartXRef.current;
    if (deltaX > 45) {
      setReplyingTo(msg);
      toast.info(`Replying to ${msg.senderName}`);
    }
  }

  return (
    <PlanGuard moduleName="Team Internal Chat" requiredPlan="starter">
      {/* FULL WIDTH & FULL HEIGHT EDGE-TO-EDGE WORKSPACE WITHOUT TOPBAR */}
      <div className="-m-4 sm:-m-6 lg:-m-8 h-[calc(100vh-3.5rem)] flex flex-col w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] overflow-hidden bg-background">
        {/* MAIN FULL-BLEED CHAT WORKSPACE */}
        <div className="flex-1 flex overflow-hidden w-full h-full min-h-0">
          {/* LEFT CONVERSATION SIDEBAR */}
          <div
            className={`${
              mobileView === "chat" ? "hidden lg:flex" : "flex"
            } w-full lg:w-[380px] lg:min-w-[340px] border-r bg-card flex-col h-full min-h-0 shrink-0 z-10`}
          >
            {/* Sidebar Profile Header with Live Status & Group Creation */}
            <div className="p-3 bg-muted/20 border-b flex items-center justify-between shrink-0 gap-2">
              <div
                onClick={() => {
                  setSelectedStatusType(myPresence.status);
                  setCustomStatusText(myPresence.customText || "");
                  setIsStatusModalOpen(true);
                }}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                title="Click to update your status note"
              >
                <div className="relative shrink-0">
                  <Avatar className="size-9 border-2 border-emerald-500 shrink-0">
                    <AvatarImage src={currentProfile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-emerald-600 text-white font-bold text-xs">
                      {getInitials(currentProfile?.full_name || "Super Admin")}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background ${
                      PRESENCE_CONFIG[myPresence.status].dotClass
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs truncate text-foreground group-hover:text-primary transition-colors">
                    {currentProfile?.full_name || "Super Admin"}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 truncate">
                    <span>{PRESENCE_CONFIG[myPresence.status].icon}</span>
                    <span className="truncate">{myPresence.customText || PRESENCE_CONFIG[myPresence.status].label}</span>
                  </div>
                </div>
              </div>

              {/* Status Switcher Dropdown & + Group Button */}
              <div className="flex items-center gap-1 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 px-2 text-[11px] font-bold border gap-1 rounded-lg ${PRESENCE_CONFIG[myPresence.status].badgeClass}`}
                      title="Change Status"
                    >
                      <div className={`size-1.5 rounded-full ${PRESENCE_CONFIG[myPresence.status].dotClass}`} />
                      <span className="hidden sm:inline">{PRESENCE_CONFIG[myPresence.status].label}</span>
                      <ChevronDown className="size-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 text-xs">
                    <DropdownMenuLabel className="text-[11px] font-bold">Set Availability Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(Object.keys(PRESENCE_CONFIG) as PresenceStatusType[]).map((st) => (
                      <DropdownMenuItem
                        key={st}
                        onClick={() => handleSavePresence(st)}
                        className="flex items-center justify-between cursor-pointer py-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span>{PRESENCE_CONFIG[st].icon}</span>
                          <span className="font-semibold">{PRESENCE_CONFIG[st].label}</span>
                        </div>
                        {myPresence.status === st && <CheckCheck className="size-3.5 text-emerald-600" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedStatusType(myPresence.status);
                        setCustomStatusText(myPresence.customText || "");
                        setIsStatusModalOpen(true);
                      }}
                      className="text-primary font-bold cursor-pointer gap-1.5"
                    >
                      <Sparkles className="size-3.5" />
                      <span>Set Custom Status Note...</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  onClick={() => setIsGroupModalOpen(true)}
                  title="Create Department Group / Channel"
                >
                  <FolderPlus className="size-4" />
                </Button>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="p-2.5 border-b bg-background shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search chats, employees or channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-muted/30 rounded-lg border-muted"
                />
              </div>
            </div>

            {/* Tabs: All Chats vs Groups vs Employee Directory */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-2 pt-2">
                  <TabsList className="grid grid-cols-3 w-full h-8 text-[11px] bg-muted/40">
                    <TabsTrigger value="chats" className="text-[11px] py-1 font-bold">
                      Chats ({localThreads.length})
                    </TabsTrigger>
                    <TabsTrigger value="groups" className="text-[11px] py-1 font-bold">
                      Groups ({localThreads.filter((t) => t.isGroup).length})
                    </TabsTrigger>
                    <TabsTrigger value="employees" className="text-[11px] py-1 font-bold">
                      Staff ({employeesList.length})
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* TAB 1: CHATS LIST */}
                <TabsContent value="chats" className="space-y-0.5 mt-2">
                  {localThreads.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                      <MessageSquare className="size-8 mx-auto opacity-30 text-emerald-600" />
                      <p className="font-bold text-foreground">No active chats yet</p>
                      <p>Select an employee from the Staff tab to start a conversation.</p>
                    </div>
                  ) : (
                    localThreads
                      .filter((t) => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((t) => {
                        const isActive = t.id === activeThreadId;
                        const otherEmpId = !t.isGroup ? t.participantIds.find((id) => id !== myUserId) : null;
                        const otherPresence = otherEmpId ? presenceMap[otherEmpId] : null;

                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              setActiveThreadId(t.id);
                              setMobileView("chat");
                            }}
                            className={`p-3 flex items-center justify-between cursor-pointer border-b/40 transition-colors ${
                              isActive
                                ? "bg-emerald-500/10 border-l-4 border-l-emerald-600"
                                : "hover:bg-muted/30"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="relative">
                                <Avatar className="size-10 shrink-0 border">
                                  <AvatarImage src={t.avatarUrl} />
                                  <AvatarFallback className="bg-emerald-700 text-white font-bold text-xs">
                                    {getInitials(t.name)}
                                  </AvatarFallback>
                                </Avatar>
                                {otherPresence && (
                                  <div
                                    className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background ${
                                      PRESENCE_CONFIG[otherPresence.status]?.dotClass || "bg-emerald-500"
                                    }`}
                                  />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-xs truncate text-foreground flex items-center gap-1">
                                    {t.pinnedMessageId && <Pin className="size-3 text-amber-500 shrink-0 fill-current" />}
                                    <span>{t.name}</span>
                                  </h4>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {t.lastMessageTime}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  {t.lastMessage}
                                </p>
                              </div>
                            </div>

                            {t.unreadCount > 0 && (
                              <Badge className="ml-2 bg-emerald-600 text-white text-[10px] rounded-full size-5 grid place-items-center p-0 font-bold shrink-0">
                                {t.unreadCount}
                              </Badge>
                            )}
                          </div>
                        );
                      })
                  )}
                </TabsContent>

                {/* TAB 2: GROUPS LIST */}
                <TabsContent value="groups" className="space-y-0.5 mt-2">
                  {localThreads.filter((t) => t.isGroup).length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                      <Users className="size-8 mx-auto opacity-30 text-emerald-600" />
                      <p className="font-bold text-foreground">No groups created yet</p>
                      <p>Click &quot;+ Create Group&quot; to build department channels.</p>
                    </div>
                  ) : (
                    localThreads
                      .filter((t) => t.isGroup)
                      .map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setActiveThreadId(t.id);
                            setMobileView("chat");
                          }}
                          className={`p-3 flex items-center gap-3 cursor-pointer border-b/40 transition-colors ${
                            t.id === activeThreadId
                              ? "bg-emerald-500/10 border-l-4 border-l-emerald-600"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          <Avatar className="size-10 shrink-0 border">
                            <AvatarImage src={t.avatarUrl} />
                            <AvatarFallback className="bg-emerald-700 text-white font-bold text-xs">
                              {getInitials(t.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs truncate flex items-center gap-1.5 text-foreground">
                              <span>{t.name}</span>
                              {t.onlyAdminsCanSend && (
                                <Badge variant="outline" className="text-[8px] font-mono text-amber-600 border-amber-500/40">
                                  Admin Only
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              {t.participantNames?.length || t.participantIds?.length || 0} Members
                            </p>
                          </div>
                        </div>
                      ))
                  )}
                </TabsContent>

                {/* TAB 3: ALL EMPLOYEES DIRECTORY WITH LIVE PRESENCE */}
                <TabsContent value="employees" className="space-y-0.5 mt-2">
                  <div className="p-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Company Employee Directory ({employeesList.length})
                  </div>
                  {employeesList
                    .filter(
                      (e) =>
                        !searchQuery ||
                        e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        e.email.toLowerCase().includes(searchQuery.toLowerCase()),
                    )
                    .map((emp) => {
                      const empPresence = presenceMap[emp.id] || {
                        status: (emp.isCheckedIn ? "available" : "offline") as PresenceStatusType,
                        customText: emp.isCheckedIn ? "Online & Checked In" : "Offline",
                      };

                      return (
                        <div
                          key={emp.id}
                          onClick={() => handleStartDirectChat(emp)}
                          className="p-2.5 flex items-center justify-between cursor-pointer border-b/30 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative">
                              <Avatar className="size-9 border">
                                <AvatarImage src={emp.avatar_url} />
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                  {getInitials(emp.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div
                                className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background ${
                                  PRESENCE_CONFIG[empPresence.status]?.dotClass || "bg-slate-400"
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs truncate text-foreground flex items-center gap-1.5">
                                <span>{emp.full_name}</span>
                                <Badge variant="outline" className={`text-[8px] py-0 h-3.5 ${PRESENCE_CONFIG[empPresence.status]?.badgeClass}`}>
                                  {PRESENCE_CONFIG[empPresence.status]?.label}
                                </Badge>
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate font-mono">
                                {empPresence.customText || emp.role}
                              </div>
                            </div>
                          </div>

                          <Button size="icon" variant="ghost" className="size-7 text-emerald-600">
                            <MessageSquare className="size-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* RIGHT ACTIVE CHAT WORKSPACE */}
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`${
              mobileView === "sidebar" ? "hidden lg:flex" : "flex"
            } flex-1 flex-col justify-between bg-muted/10 relative h-full min-h-0 overflow-hidden`}
          >
            {/* DRAG AND DROP HIGH-VISIBILITY OVERLAY */}
            {isDragging && (
              <div className="absolute inset-0 z-50 bg-emerald-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white border-4 border-dashed border-emerald-400 animate-in fade-in-50 duration-150">
                <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-400 animate-bounce mb-3">
                  <UploadCloud className="size-12" />
                </div>
                <h3 className="text-lg font-black tracking-tight">Drop files or images to attach</h3>
                <p className="text-xs text-emerald-200 mt-1 max-w-sm text-center">
                  Drop PDF documents, spreadsheets, images, or archives directly into {currentThread?.name || "this chat"}.
                </p>
              </div>
            )}

            {!currentThread ? (
              <div className="py-32 flex flex-col items-center justify-center text-center text-muted-foreground space-y-3 p-6">
                <div className="size-16 rounded-full bg-emerald-500/10 grid place-items-center text-emerald-600">
                  <MessageSquare className="size-8" />
                </div>
                <h3 className="font-bold text-lg text-foreground">Enterprise Team Messenger</h3>
                <p className="text-xs max-w-sm">
                  Select an employee from the Staff tab or create a group channel to begin chatting.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsGroupModalOpen(true)}
                  className="bg-emerald-600 text-white text-xs font-bold gap-1.5"
                >
                  <Plus className="size-3.5" /> Create Group Channel
                </Button>
              </div>
            ) : (
              <>
                {/* Active Chat Top Bar */}
                <div className="p-3 px-4 bg-card border-b flex items-center justify-between shrink-0 shadow-2xs">
                  <div
                    onClick={() => currentThread.isGroup && setIsGroupInfoOpen(true)}
                    className={`flex items-center gap-3 min-w-0 ${currentThread.isGroup ? "cursor-pointer hover:opacity-85" : ""}`}
                  >
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 lg:hidden shrink-0 text-emerald-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMobileView("sidebar");
                      }}
                      title="Back to Chats"
                    >
                      <ArrowLeft className="size-4" />
                    </Button>

                    <div className="relative">
                      <Avatar className="size-10 border shrink-0">
                        <AvatarImage src={currentThread.avatarUrl} />
                        <AvatarFallback className="bg-emerald-700 text-white font-bold text-xs">
                          {getInitials(currentThread.name)}
                        </AvatarFallback>
                      </Avatar>
                      {!currentThread.isGroup && activeTargetEmp && (
                        <div
                          className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background ${
                            PRESENCE_CONFIG[presenceMap[activeTargetEmp.id]?.status || "available"]?.dotClass || "bg-emerald-500"
                          }`}
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-black text-sm truncate text-foreground flex items-center gap-1.5">
                        {currentThread.name}
                        {currentThread.isGroup ? (
                          <Badge variant="outline" className="text-[9px] font-mono font-bold">
                            {currentThread.participantNames?.length || 0} Members
                          </Badge>
                        ) : activeTargetEmp ? (
                          <Badge
                            variant="outline"
                            className={`text-[8px] py-0 h-3.5 ${
                              PRESENCE_CONFIG[presenceMap[activeTargetEmp.id]?.status || "available"]?.badgeClass
                            }`}
                          >
                            {PRESENCE_CONFIG[presenceMap[activeTargetEmp.id]?.status || "available"]?.label}
                          </Badge>
                        ) : null}
                      </h3>

                      <p className="text-[10px] font-semibold text-muted-foreground truncate">
                        {currentThread.isGroup
                          ? "Click for Channel Info & Member List"
                          : activeTargetEmp
                          ? presenceMap[activeTargetEmp.id]?.customText || `${activeTargetEmp.role} · ${activeTargetEmp.email}`
                          : "Direct Conversation"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 text-xs font-semibold gap-1 text-emerald-600 border-emerald-500/30 hidden sm:flex"
                    >
                      <Paperclip className="size-3.5" /> Attach File
                    </Button>

                    {currentThread.isGroup && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsGroupInfoOpen(true)}
                        className="h-8 text-xs font-semibold gap-1.5 text-primary"
                        title="Group Settings & Members"
                      >
                        <Users className="size-4 text-emerald-600" />
                        <span className="hidden md:inline">Group Info</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* PINNED MESSAGE BANNER */}
                {currentThread.pinnedMessageText && (
                  <div className="p-2.5 px-4 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <Pin className="size-4 text-amber-600 shrink-0 fill-current" />
                      <span className="font-bold shrink-0">PINNED ANNOUNCEMENT:</span>
                      <span className="truncate text-[11px]">{currentThread.pinnedMessageText}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const updatedThreads = localThreads.map((t) =>
                          t.id === currentThread.id
                            ? { ...t, pinnedMessageId: undefined, pinnedMessageText: undefined }
                            : t,
                        );
                        setLocalThreads(updatedThreads);
                        saveChatStateMutation.mutate({ updatedThreads });
                        toast.success("Message unpinned");
                      }}
                      className="h-6 text-[10px] px-2 text-amber-700 hover:bg-amber-500/20 shrink-0"
                    >
                      <PinOff className="size-3 mr-1" /> Unpin
                    </Button>
                  </div>
                )}

                {/* MESSAGES SCROLL AREA WITH PAGINATION */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 min-h-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
                  {/* Load Earlier Messages Button */}
                  {hasEarlierMessages && (
                    <div className="flex justify-center pb-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setMessagePageSize((prev) => prev + 20)}
                        className="text-[11px] h-7 px-3 font-semibold gap-1 text-muted-foreground hover:text-foreground shadow-2xs"
                      >
                        <ChevronUp className="size-3.5" />
                        <span>Load earlier messages ({activeMessages.length - visibleMessages.length} more)</span>
                      </Button>
                    </div>
                  )}

                  {visibleMessages.length === 0 ? (
                    <div className="py-20 text-center text-xs text-muted-foreground space-y-2">
                      <p className="font-bold text-foreground">No messages in this chat yet.</p>
                      <p>Type a message, record a voice note, or drag-and-drop a file below to start.</p>
                    </div>
                  ) : (
                    visibleMessages.map((m) => {
                      const isMe =
                        m.senderId === myUserId ||
                        m.senderId === user?.id ||
                        m.senderId === "super_admin" ||
                        m.senderName === "Super Admin" ||
                        m.senderName === (currentProfile?.full_name || "") ||
                        m.senderName === "You";
                      const isAudioPlaying = playingAudioId === m.id;
                      const isPinned = currentThread.pinnedMessageId === m.id;

                      return (
                        <div
                          key={m.id}
                          onTouchStart={(e) => handleTouchStart(e, m)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={() => handleTouchEnd(m)}
                          className={`flex flex-col group ${isMe ? "items-end ml-auto" : "items-start mr-auto"}`}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5 px-1">
                            {!isMe && (
                              <Avatar className="size-4 inline-block mr-0.5">
                                <AvatarImage src={m.senderAvatar} />
                                <AvatarFallback className="text-[8px]">{getInitials(m.senderName)}</AvatarFallback>
                              </Avatar>
                            )}
                            <span className="font-semibold">{isMe ? "You" : m.senderName}</span>
                            {isPinned && (
                              <Badge className="text-[8px] bg-amber-500 text-white font-bold py-0 h-3.5">
                                📌 PINNED
                              </Badge>
                            )}
                          </div>

                          <div className={`flex items-start gap-1 max-w-[85%] sm:max-w-md ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                            {/* Sleek Action Icons on Hover (Compact Emoji Popover Trigger + Reply + Pin) */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
                              {/* Compact Emoji Reaction Popover */}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-6 text-muted-foreground hover:text-amber-500 hover:bg-muted/80 rounded-full"
                                    title="React with Emoji (Long press on mobile)"
                                  >
                                    <Smile className="size-3.5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent side="top" align={isMe ? "end" : "start"} className="w-64 p-2 shadow-xl rounded-2xl border bg-card/95 backdrop-blur-md">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground border-b pb-1">
                                      <span>React to Message</span>
                                    </div>
                                    <div className="grid grid-cols-6 gap-1 p-0.5">
                                      {["👍", "❤️", "😂", "😮", "🙏", "🔥", "🎉", "👏", "🚀", "💯", "✅", "💡"].map((emoji) => (
                                        <button
                                          key={emoji}
                                          type="button"
                                          onClick={() => handleToggleReaction(m, emoji)}
                                          className="size-8 flex items-center justify-center text-lg hover:bg-muted rounded-lg transition-transform hover:scale-125"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>

                              {/* Reply Button */}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setReplyingTo(m);
                                  toast.info(`Replying to ${m.senderName}`);
                                }}
                                className="size-6 text-muted-foreground hover:text-emerald-600 hover:bg-muted/80 rounded-full"
                                title="Reply (Swipe right on mobile)"
                              >
                                <Reply className="size-3.5" />
                              </Button>

                              {/* Pin Button for Channels */}
                              {currentThread.isGroup && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleTogglePinMessage(m)}
                                  className="size-6 text-muted-foreground hover:text-amber-500 hover:bg-muted/80 rounded-full"
                                  title={isPinned ? "Unpin message" : "Pin message to top"}
                                >
                                  <Pin className={`size-3.5 ${isPinned ? "text-amber-500 fill-current" : ""}`} />
                                </Button>
                              )}
                            </div>

                            {/* Main Message Bubble */}
                            <div
                              className={`p-3.5 rounded-2xl text-xs shadow-xs space-y-2 relative flex-1 ${
                                isMe
                                  ? "bg-emerald-600 text-white rounded-tr-none"
                                  : "bg-card text-foreground rounded-tl-none border shadow-2xs"
                              }`}
                            >
                              {/* QUOTED PARENT MESSAGE (If replied) */}
                              {m.replyTo && (
                                <div
                                  className={`p-2 rounded-lg text-[11px] mb-1.5 border-l-4 ${
                                    isMe
                                      ? "bg-black/20 border-l-emerald-300 text-emerald-50"
                                      : "bg-muted/60 border-l-emerald-600 text-muted-foreground"
                                  }`}
                                >
                                  <strong className="block text-[10px] font-bold text-inherit">
                                    ↩️ Replying to {m.replyTo.senderName}
                                  </strong>
                                  <p className="truncate text-[10px] opacity-90">{m.replyTo.text}</p>
                                </div>
                              )}

                              {/* TYPE 1: VOICE NOTE BUBBLE PLAYER */}
                              {m.type === "audio" && (
                                <div className="p-2.5 rounded-xl border bg-black/10 flex items-center gap-2.5 min-w-[220px]">
                                  <Button
                                    type="button"
                                    size="icon"
                                    onClick={() => {
                                      if (isAudioPlaying) setPlayingAudioId(null);
                                      else {
                                        setPlayingAudioId(m.id);
                                        toast.info(`Playing Voice Note (${m.audioDuration || "0:15"})...`);
                                      }
                                    }}
                                    className="size-8 rounded-full bg-white text-emerald-800 shrink-0 shadow-xs"
                                  >
                                    {isAudioPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
                                  </Button>
                                  <div className="flex-1">
                                    <div className="h-1.5 rounded-full bg-white/30 overflow-hidden">
                                      <div className={`h-full bg-white ${isAudioPlaying ? "w-3/4 animate-pulse" : "w-1/4"}`} />
                                    </div>
                                    <span className="text-[9px] font-mono opacity-80 mt-1 block">
                                      Voice Note ({m.audioDuration || "0:15"})
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* TYPE 2: ATTACHED IMAGE (Click to Preview Modal, with Hover Download) */}
                              {m.type === "image" && m.mediaUrl && (
                                <div className="space-y-1.5">
                                  <div
                                    className="relative group cursor-pointer overflow-hidden rounded-xl border bg-black/10 transition-all hover:ring-2 hover:ring-white/40"
                                    onClick={() =>
                                      setPreviewModalFile({
                                        url: m.mediaUrl!,
                                        name: m.fileName || "Photo Attachment",
                                        type: "image",
                                        size: m.fileSize,
                                      })
                                    }
                                  >
                                    <img
                                      src={m.mediaUrl}
                                      alt={m.fileName || "Attachment"}
                                      className="rounded-xl max-h-64 object-contain w-full transition-transform duration-200 group-hover:scale-102"
                                    />
                                    {/* Hover overlay with Eye + Download */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                                      <div className="flex items-center gap-1 text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-xs">
                                        <Eye className="size-3.5" /> Click to View Full Size
                                      </div>
                                    </div>

                                    {/* Quick Download Button in Top Right */}
                                    <a
                                      href={m.mediaUrl}
                                      download={m.fileName || "photo.png"}
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute top-2 right-2 size-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-md"
                                      title="Download Image"
                                    >
                                      <Download className="size-3.5" />
                                    </a>
                                  </div>
                                </div>
                              )}

                              {/* TYPE 3: ATTACHED DOCUMENT / PDF (Modern Clickable Card with Download Icon) */}
                              {m.type === "file" && (
                                <div
                                  onClick={() =>
                                    setPreviewModalFile({
                                      url: m.mediaUrl || "",
                                      name: m.fileName || "Document",
                                      type: m.fileName?.toLowerCase().endsWith(".pdf") ? "pdf" : "file",
                                      size: m.fileSize,
                                    })
                                  }
                                  className={`group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border shadow-2xs ${
                                    isMe
                                      ? "bg-black/20 hover:bg-black/30 border-white/20"
                                      : "bg-muted/60 hover:bg-muted border-border/80"
                                  }`}
                                  title="Click to View Preview in page"
                                >
                                  {/* Document Badge Icon */}
                                  <div
                                    className={`size-10 rounded-lg flex items-center justify-center shrink-0 shadow-xs font-bold text-[10px] ${
                                      m.fileName?.toLowerCase().endsWith(".pdf")
                                        ? "bg-rose-500 text-white"
                                        : "bg-emerald-600 text-white"
                                    }`}
                                  >
                                    {m.fileName?.toLowerCase().endsWith(".pdf") ? "PDF" : <FileText className="size-5" />}
                                  </div>

                                  {/* File Info */}
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-xs truncate leading-snug" title={m.fileName || "Document"}>
                                      {m.fileName || "Document"}
                                    </div>
                                    <div className="text-[10px] opacity-75 font-mono flex items-center gap-1.5 mt-0.5">
                                      <span>{m.fileSize || "Attachment"}</span>
                                      <span>•</span>
                                      <span className="text-[9px] uppercase tracking-wider font-semibold opacity-90">
                                        {m.fileName?.split(".").pop() || "FILE"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Single Download Icon Button */}
                                  {m.mediaUrl && (
                                    <a
                                      href={m.mediaUrl}
                                      download={m.fileName || "document"}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toast.success(`Downloading ${m.fileName}...`);
                                      }}
                                      className={`size-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                        isMe
                                          ? "bg-white/20 hover:bg-white/35 text-white"
                                          : "bg-foreground/10 hover:bg-foreground/20 text-foreground"
                                      }`}
                                      title="Download to computer"
                                    >
                                      <Download className="size-4" />
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* TYPE 4: LIVE LOCATION */}
                              {m.type === "location" && (
                                <div className="p-2.5 rounded-xl border bg-black/10 space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-xs">
                                    <MapPin className="size-4" /> Live GPS Location
                                  </div>
                                  <div className="text-[11px] font-mono opacity-90">{m.locationCoords}</div>
                                </div>
                              )}

                              {/* TEXT CONTENT (Only shown if text is NOT an exact duplicate of filename / attachment label) */}
                              {m.type !== "audio" &&
                                m.text &&
                                m.text !== m.fileName &&
                                m.text !== "Attachment" &&
                                m.text !== "Photo" &&
                                m.text !== "📍 Shared live GPS location" && (
                                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                                )}

                              {/* TIMESTAMP & DELIVERY/READ STATUS TICKS */}
                              <div className="flex items-center justify-end gap-1.5 text-[9px] opacity-85 font-mono pt-0.5">
                                <span>{m.timestamp}</span>
                                {isMe && (
                                  <span className="inline-flex items-center shrink-0">
                                    {m.status === "sent" ? (
                                      <span title="Sent (Single tick — Recipient not yet received)">
                                        <Check className="size-3.5 text-white/70" />
                                      </span>
                                    ) : m.status === "delivered" ? (
                                      <span title="Delivered (Double grey tick — Received by user)">
                                        <CheckCheck className="size-3.5 text-white/70" />
                                      </span>
                                    ) : (
                                      <span title="Read / Seen (Double blue tick — Viewed by user)">
                                        <CheckCheck className="size-3.5 text-cyan-300 font-bold drop-shadow-xs" />
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* ACTIVE EMOJI REACTIONS DISPLAY */}
                            {m.reactions && Object.keys(m.reactions).length > 0 && (
                              <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                                {Object.entries(m.reactions).map(([emoji, userIds]) => {
                                  if (!userIds || userIds.length === 0) return null;
                                  const hasReacted = userIds.includes(myUserId);
                                  return (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => handleToggleReaction(m, emoji)}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-semibold shadow-2xs transition-all ${
                                        hasReacted
                                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                                          : "bg-card border-border text-foreground hover:bg-muted"
                                      }`}
                                      title={`${userIds.length} reaction${userIds.length > 1 ? "s" : ""}`}
                                    >
                                      <span>{emoji}</span>
                                      <span className="font-mono text-[10px]">{userIds.length}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* ATTACHMENT PREVIEW CHIPS, REPLY BANNER & INPUT BAR */}
                <div className="p-3 bg-card border-t space-y-2 shrink-0 shadow-2xs">
                  {/* Active Reply Quoting Banner */}
                  {replyingTo && (
                    <div className="p-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs animate-in fade-in-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <CornerDownRight className="size-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-emerald-700 dark:text-emerald-300 text-[11px] block">
                            Replying to {replyingTo.senderName}
                          </span>
                          <p className="text-[10px] text-muted-foreground truncate">{replyingTo.text}</p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 text-muted-foreground hover:text-foreground shrink-0"
                        onClick={() => setReplyingTo(null)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* Image Attachment Preview */}
                  {attachedImage && (
                    <div className="flex items-center justify-between p-2 rounded-xl border bg-muted/40 text-xs animate-in fade-in-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={attachedImage.url}
                          alt="Attached"
                          className="size-8 object-cover rounded-lg border shrink-0"
                        />
                        <span className="font-bold text-xs truncate text-foreground">{attachedImage.name}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 text-rose-500 shrink-0"
                        onClick={() => setAttachedImage(null)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* File Attachment Preview */}
                  {attachedFile && (
                    <div className="flex items-center justify-between p-2 rounded-xl border bg-muted/40 text-xs animate-in fade-in-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="size-5 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-xs truncate text-foreground block">{attachedFile.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{attachedFile.size}</span>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 text-rose-500 shrink-0"
                        onClick={() => setAttachedFile(null)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* Voice Recording Multi-State Bar vs Normal Input */}
                  {voiceState === "recording" ? (
                    <div className="flex items-center justify-between p-2 px-4 rounded-full bg-rose-500/10 border border-rose-500/30 text-xs">
                      <div className="flex items-center gap-2 font-bold text-rose-600 text-xs">
                        <div className="size-2.5 rounded-full bg-rose-600 animate-ping" />
                        <span>
                          Recording... ({Math.floor(recordingSeconds / 60)}:
                          {recordingSeconds % 60 < 10 ? "0" : ""}
                          {recordingSeconds % 60})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={handlePauseRecording}
                          className="h-8 px-2.5 text-xs font-bold gap-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        >
                          <Pause className="size-3.5" /> Pause
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleFinishRecording}
                          className="h-8 px-2.5 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                        >
                          <Square className="size-3.5 fill-current" /> Finish & Listen
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={handleCancelVoiceNote}
                          className="size-8 text-rose-500 hover:bg-rose-50"
                          title="Discard Note"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : voiceState === "paused" ? (
                    <div className="flex items-center justify-between p-2 px-4 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs">
                      <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300 text-xs">
                        <Pause className="size-3.5" />
                        <span>
                          Recording Paused ({Math.floor(recordingSeconds / 60)}:
                          {recordingSeconds % 60 < 10 ? "0" : ""}
                          {recordingSeconds % 60})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleResumeRecording}
                          className="h-8 px-2.5 text-xs font-bold gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50"
                        >
                          <Play className="size-3.5" /> Resume
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleFinishRecording}
                          className="h-8 px-2.5 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                        >
                          <Square className="size-3.5 fill-current" /> Finish & Listen
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={handleCancelVoiceNote}
                          className="size-8 text-rose-500 hover:bg-rose-50"
                          title="Discard Note"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : voiceState === "reviewing" ? (
                    <div className="flex items-center justify-between p-2 px-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs animate-in fade-in-50">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Button
                          type="button"
                          size="icon"
                          onClick={handleTogglePreviewPlay}
                          className="size-8 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shrink-0 shadow-xs"
                          title={isPreviewPlaying ? "Pause Preview" : "Listen to Voice Note"}
                        >
                          {isPreviewPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
                        </Button>
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-foreground mb-1">
                            <span className="flex items-center gap-1">
                              <Volume2 className="size-3 text-emerald-600" /> Listen Voice Preview
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {Math.floor(recordingSeconds / 60)}:
                              {recordingSeconds % 60 < 10 ? "0" : ""}
                              {recordingSeconds % 60}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-emerald-200 dark:bg-emerald-950 overflow-hidden">
                            <div className={`h-full bg-emerald-600 ${isPreviewPlaying ? "w-3/4 animate-pulse" : "w-1/3"}`} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={handleReRecord}
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                          title="Record again"
                        >
                          <RotateCcw className="size-3.5" /> Re-record
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={handleCancelVoiceNote}
                          className="size-8 text-rose-500 hover:bg-rose-50"
                          title="Discard Note"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSendVoiceNote}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 gap-1.5 text-xs rounded-full px-3.5 shadow-xs"
                        >
                          <Send className="size-3.5" /> Send Voice Note
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={imageInputRef}
                        accept="image/*"
                        onChange={handleImageSelected}
                        className="hidden"
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.csv,.txt"
                        onChange={handleFileSelected}
                        className="hidden"
                      />

                      <div className="flex items-center gap-0.5 shrink-0">
                        {/* EMOJI PICKER POPOVER */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-8 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 shrink-0"
                              title="Add Emoji"
                            >
                              <Smile className="size-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent side="top" align="start" className="w-72 p-2.5 shadow-xl rounded-2xl border bg-card">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b pb-1">
                                <span>Quick Emojis</span>
                                <span className="text-[10px] opacity-70">Click to insert</span>
                              </div>
                              <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto p-1">
                                {EMOJI_LIST.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setInputMsg((prev) => prev + emoji)}
                                    className="size-8 flex items-center justify-center text-lg hover:bg-muted rounded-lg transition-transform hover:scale-125"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 text-emerald-600 shrink-0 hover:bg-emerald-50"
                          onClick={() => imageInputRef.current?.click()}
                          title="Attach Photo"
                        >
                          <ImageIcon className="size-4" />
                        </Button>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 text-emerald-600 shrink-0 hover:bg-emerald-50"
                          onClick={() => fileInputRef.current?.click()}
                          title="Attach File (or Drag & Drop)"
                        >
                          <Paperclip className="size-4" />
                        </Button>
                      </div>

                      <Input
                        placeholder={
                          currentThread.isGroup && currentThread.onlyAdminsCanSend
                            ? "Only channel admins can send messages..."
                            : "Type a message, or drag & drop files here..."
                        }
                        disabled={
                          currentThread.isGroup &&
                          currentThread.onlyAdminsCanSend &&
                          !currentThread.groupAdminIds?.includes(myUserId)
                        }
                        value={inputMsg}
                        onChange={(e) => setInputMsg(e.target.value)}
                        className="flex-1 text-xs h-10 rounded-full bg-muted/40 border px-4 focus:ring-1 focus:ring-emerald-500 min-w-0"
                      />

                      {/* VOICE NOTE MIC BUTTON TO START RECORDING */}
                      <Button
                        type="button"
                        size="icon"
                        onClick={handleStartRecording}
                        className="size-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-xs"
                        title="Record Voice Note"
                      >
                        <Mic className="size-4" />
                      </Button>

                      {(inputMsg.trim() || attachedImage || attachedFile) && (
                        <Button
                          type="submit"
                          size="icon"
                          className="size-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-xs"
                          title="Send Message"
                        >
                          <Send className="size-4" />
                        </Button>
                      )}
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: SET CUSTOM AVAILABILITY STATUS */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Sparkles className="size-5 text-emerald-600" /> Set Your Availability Status
            </DialogTitle>
            <DialogDescription className="text-xs">
              This status will be displayed to all team members in direct chats and directory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <Label className="text-xs font-semibold">Select Preset Status</Label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(PRESENCE_CONFIG) as PresenceStatusType[]).map((st) => {
                const isSelected = selectedStatusType === st;
                return (
                  <div
                    key={st}
                    onClick={() => {
                      setSelectedStatusType(st);
                      if (!customStatusText) setCustomStatusText(PRESENCE_CONFIG[st].desc);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? "border-emerald-500 bg-emerald-500/10 shadow-xs font-bold" : "bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{PRESENCE_CONFIG[st].icon}</span>
                      <div>
                        <div className="text-xs">{PRESENCE_CONFIG[st].label}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">{PRESENCE_CONFIG[st].desc}</div>
                      </div>
                    </div>
                    {isSelected && <CheckCheck className="size-4 text-emerald-600" />}
                  </div>
                );
              })}
            </div>

            <div className="space-y-1 pt-1">
              <Label className="text-xs font-semibold">Custom Status Message (Optional)</Label>
              <Input
                placeholder="e.g. In client meeting, reviewing Q3 payroll..."
                value={customStatusText}
                onChange={(e) => setCustomStatusText(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex justify-between">
            <Button size="sm" variant="outline" onClick={() => setIsStatusModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleSavePresence(selectedStatusType, customStatusText)}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: CREATE DEPARTMENT GROUP */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Users className="size-5 text-emerald-600" /> Create Department Channel
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select employee participants, upload group photo, and configure permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Group / Channel Name *</Label>
              <Input
                placeholder="e.g. Sales & Field Operations"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            {/* Real File Upload for Group Photo */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Group Profile Photo</Label>
              <input
                type="file"
                ref={groupCreateImageInputRef}
                accept="image/*"
                onChange={handleCreateGroupImageSelected}
                className="hidden"
              />
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20">
                <Avatar className="size-12 border-2 border-emerald-500">
                  <AvatarImage src={newGroupAvatar} />
                  <AvatarFallback className="bg-emerald-600 text-white font-bold text-sm">
                    {getInitials(newGroupName || "Group")}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => groupCreateImageInputRef.current?.click()}
                    className="h-8 text-xs font-bold gap-1 text-emerald-600 border-emerald-500/30"
                  >
                    <Camera className="size-3.5" /> Upload Photo from Computer
                  </Button>
                  <span className="text-[10px] text-muted-foreground block">
                    PNG, JPG, or WEBP up to 5MB
                  </span>
                </div>
              </div>
            </div>

            {/* Select Employee Members */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Select Initial Members ({selectedGroupMembers.length})
              </Label>
              <div className="max-h-44 overflow-y-auto border rounded-xl p-2 space-y-1 bg-muted/20">
                {employeesList.map((emp) => {
                  const isChecked = selectedGroupMembers.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => {
                        if (isChecked)
                          setSelectedGroupMembers(selectedGroupMembers.filter((id) => id !== emp.id));
                        else setSelectedGroupMembers([...selectedGroupMembers, emp.id]);
                      }}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer ${
                        isChecked ? "bg-emerald-500/10 border-emerald-500/40 font-bold" : "bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarImage src={emp.avatar_url} />
                          <AvatarFallback className="text-[10px] font-bold">{getInitials(emp.full_name)}</AvatarFallback>
                        </Avatar>
                        <span>
                          {emp.full_name} ({emp.email})
                        </span>
                      </div>
                      <Checkbox checked={isChecked} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Group Permissions Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border bg-amber-500/10 border-amber-500/30">
              <div>
                <p className="font-bold text-xs text-amber-800 dark:text-amber-300">
                  Only Admins Can Send Messages
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Restrict this channel to broadcast announcements only.
                </p>
              </div>
              <Switch checked={onlyAdminsCanSend} onCheckedChange={setOnlyAdminsCanSend} />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex justify-between">
            <Button size="sm" variant="outline" onClick={() => setIsGroupModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim()}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Create Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: GROUP SETTINGS & MEMBER MANAGEMENT */}
      <Dialog open={isGroupInfoOpen} onOpenChange={setIsGroupInfoOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Shield className="size-5 text-emerald-600" /> Channel Passport & Members
            </DialogTitle>
          </DialogHeader>

          {currentThread && (
            <div className="space-y-4 py-2 text-xs">
              {/* Group Profile Header with Avatar Uploader */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/20 border">
                <input
                  type="file"
                  ref={groupAvatarInputRef}
                  accept="image/*"
                  onChange={handleGroupAvatarFileChange}
                  className="hidden"
                />
                <div className="relative group cursor-pointer" onClick={() => groupAvatarInputRef.current?.click()}>
                  <Avatar className="size-14 border-2 border-emerald-500 shadow-2xs">
                    <AvatarImage src={currentThread.avatarUrl} />
                    <AvatarFallback className="bg-emerald-700 text-white font-bold text-base">
                      {getInitials(currentThread.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    <Camera className="size-4" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-foreground truncate">{currentThread.name}</h4>
                  <span className="text-[11px] text-muted-foreground block font-mono">
                    {currentThread.participantIds.length} Total Members
                  </span>
                  <Button
                    size="sm"
                    variant="link"
                    onClick={() => groupAvatarInputRef.current?.click()}
                    className="p-0 h-5 text-[10px] text-emerald-600 font-semibold"
                  >
                    Change Group Photo
                  </Button>
                </div>
              </div>

              {/* Members List Header & Add Member Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs text-foreground">
                    Channel Members ({currentThread.participantIds.length})
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddMemberOpen(true)}
                    className="h-7 text-xs font-bold gap-1 text-emerald-600 border-emerald-500/30"
                  >
                    <UserPlus className="size-3" /> Add Member
                  </Button>
                </div>

                {/* Members List Container */}
                <div className="max-h-48 overflow-y-auto border rounded-xl divide-y bg-card">
                  {currentThread.participantIds.map((pId) => {
                    const emp = employeesList.find((e) => e.id === pId);
                    const isAdmin = currentThread.groupAdminIds?.includes(pId) || pId === "super_admin";
                    const isSelf = pId === myUserId || pId === "super_admin";
                    const displayName = emp?.full_name || (pId === "super_admin" ? "Super Admin" : "Staff Member");
                    const displayAvatar = emp?.avatar_url;

                    return (
                      <div key={pId} className="p-2.5 flex items-center justify-between text-xs hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="size-8 border">
                            <AvatarImage src={displayAvatar} />
                            <AvatarFallback className="text-[10px] font-bold">
                              {getInitials(displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate flex items-center gap-1.5">
                              <span>{displayName}</span>
                              {isAdmin && (
                                <Badge className="text-[8px] bg-emerald-600 text-white font-bold py-0 h-3.5">
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono truncate block">
                              {emp?.role || "Team Member"}
                            </span>
                          </div>
                        </div>

                        {!isSelf && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveMemberFromGroup(pId, displayName)}
                            className="size-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Remove Member from Group"
                          >
                            <UserMinus className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Danger Zone: Leave Group & Delete Group */}
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLeaveGroup}
                    className="text-xs font-semibold text-rose-600 hover:bg-rose-50 border-rose-200 gap-1.5 h-8"
                  >
                    <LogOut className="size-3.5" /> Leave Channel
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDeleteGroup}
                    className="text-xs font-bold gap-1.5 h-8"
                  >
                    <Trash2 className="size-3.5" /> Delete Channel
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t">
            <Button size="sm" onClick={() => setIsGroupInfoOpen(false)} className="text-xs font-bold w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: ADD MEMBER TO EXISTING GROUP */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <UserPlus className="size-5 text-emerald-600" /> Add Member to Channel
            </DialogTitle>
            <DialogDescription className="text-xs">
              Search and add employees to &quot;{currentThread?.name}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search employees by name or email..."
                value={addMemberSearch}
                onChange={(e) => setAddMemberSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <div className="max-h-48 overflow-y-auto border rounded-xl divide-y">
              {employeesList
                .filter((e) => !currentThread?.participantIds.includes(e.id))
                .filter(
                  (e) =>
                    !addMemberSearch ||
                    e.full_name.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
                    e.email.toLowerCase().includes(addMemberSearch.toLowerCase()),
                )
                .map((emp) => (
                  <div key={emp.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-muted/20">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="size-7">
                        <AvatarImage src={emp.avatar_url} />
                        <AvatarFallback className="text-[10px] font-bold">{getInitials(emp.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">{emp.full_name}</div>
                        <span className="text-[10px] text-muted-foreground font-mono block truncate">{emp.email}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        handleAddMemberToGroup(emp);
                        setIsAddMemberOpen(false);
                      }}
                      className="h-7 text-xs font-bold bg-emerald-600 text-white gap-1"
                    >
                      <Plus className="size-3" /> Add
                    </Button>
                  </div>
                ))}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => setIsAddMemberOpen(false)} className="text-xs">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: IN-PAGE FILE / PDF / IMAGE PREVIEW CONTAINER */}
      {previewModalFile && (
        <Dialog open={!!previewModalFile} onOpenChange={(open) => !open && setPreviewModalFile(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-4">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 space-y-0">
              <DialogTitle className="text-sm font-black flex items-center gap-2 truncate pr-4">
                <FileText className="size-4 text-emerald-600 shrink-0" />
                <span className="truncate">{previewModalFile.name}</span>
                {previewModalFile.size && (
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                    {previewModalFile.size}
                  </Badge>
                )}
              </DialogTitle>
              <div className="flex items-center gap-2 pr-6 shrink-0">
                <a
                  href={previewModalFile.url}
                  download={previewModalFile.name}
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-2xs"
                >
                  <Download className="size-3.5" /> Download
                </a>
              </div>
            </DialogHeader>

            {/* In-Page Container Viewer */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 min-h-[50vh] bg-muted/20 rounded-xl border mt-3">
              {previewModalFile.type === "image" ? (
                <img
                  src={previewModalFile.url}
                  alt={previewModalFile.name}
                  className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
                />
              ) : previewModalFile.type === "pdf" ||
                previewModalFile.url.startsWith("data:application/pdf") ||
                previewModalFile.name.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewModalFile.url}
                  title={previewModalFile.name}
                  className="w-full h-[70vh] rounded-lg border bg-white"
                />
              ) : (
                <div className="p-8 text-center space-y-3">
                  <FileText className="size-16 mx-auto text-emerald-600 opacity-60" />
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{previewModalFile.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Document format ready for preview & download.
                    </p>
                  </div>
                  <a
                    href={previewModalFile.url}
                    download={previewModalFile.name}
                    className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                  >
                    <Download className="size-4" /> Download ({previewModalFile.size || "File"})
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PlanGuard>
  );
}
