import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getSocketClient } from "@/lib/socket";
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
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Video,
  VideoOff,
  MicOff,
  VolumeX,
  MonitorUp,
  Maximize2,
  Minimize2,
  MoreVertical,
  Calendar,
  Clock,
  Disc,
  FileSpreadsheet,
  Mail,
  Building,
  Briefcase,
  IdCard,
  UserCheck,
  Radio,
  FileCheck,
  Copy,
  ExternalLink,
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
    label: "On Break",
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
    desc: "Offline or notifications muted",
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
  groupDescription?: string;
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
  department?: string;
  phone?: string;
  employeeNumber?: string;
  joinDate?: string;
  isCheckedIn?: boolean;
};

export type CallLog = {
  id: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  callType: "incoming" | "outgoing" | "missed";
  mediaType: "voice" | "video";
  duration: string;
  timestamp: string;
  momNotes?: string;
};

export type ScheduledMeeting = {
  id: string;
  title: string;
  agenda: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingType: "video" | "voice";
  participantIds: string[];
  createdByName: string;
};

export type ActiveCallState = {
  status: "idle" | "outgoing" | "incoming" | "connected";
  mediaType: "voice" | "video";
  contactId?: string;
  contactName: string;
  contactAvatar?: string;
  contactRole?: string;
  contactPhone?: string;
  contactEmail?: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
  isScreenSharing: boolean;
  isFullScreen: boolean;
  durationSeconds: number;
  showChat: boolean;
  showMoM: boolean;
  isRecording: boolean;
  recordingSeconds: number;
  momDiscussionPoints: string;
  momDecisions: string;
  momActionItems: string;
};

function getInitials(name: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Security: Prohibited File Extensions (Executables, System Configs, Embedded Code & Scripts)
export const RESTRICTED_FILE_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "bin", "msi", "apk", "com", "vbs", "ps1", "scr", "pif", "app", "dmg", "pkg", "deb", "rpm",
  "env", "json", "js", "mjs", "cjs", "jsx", "ts", "tsx", "php", "py", "pyc", "rb", "go", "java", "class", "jar",
  "c", "cpp", "h", "hpp", "cs", "sql", "bash", "zsh", "lua", "pl", "asp", "aspx", "jsp", "wasm", "yaml", "yml",
  "pem", "key", "crt", "cer", "pfx", "p12"
]);

export function checkFileRestriction(fileName: string): { isRestricted: boolean; ext: string } {
  const lower = fileName.toLowerCase().trim();
  if (lower === ".env" || lower.startsWith(".env.") || lower.endsWith(".env")) {
    return { isRestricted: true, ext: ".env" };
  }
  const lastDot = lower.lastIndexOf(".");
  if (lastDot !== -1) {
    const ext = lower.slice(lastDot + 1);
    if (RESTRICTED_FILE_EXTENSIONS.has(ext)) {
      return { isRestricted: true, ext: `.${ext}` };
    }
  }
  return { isRestricted: false, ext: "" };
}

function TeamWhatsAppChatAddon() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: currentProfile } = useCurrentProfile(user);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inputMsg, setInputMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [messagePageSize, setMessagePageSize] = useState<number>(20);

  // Local Reactive State for instant UI responsiveness
  const [localThreads, setLocalThreads] = useState<ChatThread[]>([]);
  const [localMessagesMap, setLocalMessagesMap] = useState<Record<string, ChatMessage[]>>({});
  const [presenceMap, setPresenceMap] = useState<
    Record<string, { status: PresenceStatusType; customText?: string }>
  >({});

  // Right Profile & Media Drawer State
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [profileDrawerTab, setProfileDrawerTab] = useState<"details" | "media" | "members">("details");

  // Status Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatusType, setSelectedStatusType] = useState<PresenceStatusType>("available");
  const [customStatusText, setCustomStatusText] = useState("");

  // Reply Message State
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Voice Note State
  const [voiceState, setVoiceState] = useState<"idle" | "recording" | "paused" | "reviewing">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // In-Page Attachment Viewer Modal State
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
  const [groupDescription, setGroupDescription] = useState("");
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [onlyAdminsCanSend, setOnlyAdminsCanSend] = useState(false);

  // Group Admin & Add Member Modal State
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [selectedAddMembers, setSelectedAddMembers] = useState<string[]>([]);

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"sidebar" | "chat">("sidebar");
  const [activeTab, setActiveTab] = useState<string>("chats");

  // Call & Meeting Suite State (Strictly Database/Real-Session Records)
  const [callLogs, setCallLogs] = useState<CallLog[]>(() => {
    try {
      const saved = localStorage.getItem("master_hrms_call_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const mockNames = new Set([
            "Anthony Lewis",
            "Joanne Conner",
            "Brian Villalobos",
            "Stephan Peralt",
            "Doglas Martini",
          ]);
          const cleaned = parsed.filter(
            (c: any) =>
              c &&
              c.name &&
              !mockNames.has(c.name) &&
              !String(c.id).startsWith("call-1") &&
              !String(c.id).startsWith("call-2") &&
              !String(c.id).startsWith("call-3") &&
              !String(c.id).startsWith("call-4") &&
              !String(c.id).startsWith("call-5"),
          );
          localStorage.setItem("master_hrms_call_history", JSON.stringify(cleaned));
          return cleaned;
        }
      }
    } catch {}
    return [];
  });
  const [callFilter, setCallFilter] = useState<"all" | "incoming" | "outgoing" | "missed">("all");
  const [callSearchQuery, setCallSearchQuery] = useState("");
  const [activeCall, setActiveCall] = useState<ActiveCallState>({
    status: "idle",
    mediaType: "voice",
    contactName: "",
    isMuted: false,
    isVideoOff: false,
    isSpeakerOn: true,
    isScreenSharing: false,
    isFullScreen: false,
    durationSeconds: 0,
    showChat: false,
    showMoM: false,
    isRecording: false,
    recordingSeconds: 0,
    momDiscussionPoints: "",
    momDecisions: "",
    momActionItems: "",
  });

  // Schedule Meeting State
  const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>(() => {
    try {
      const saved = localStorage.getItem("master_hrms_scheduled_meetings");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [callsSubTab, setCallsSubTab] = useState<"history" | "meetings">("history");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState<{
    title: string;
    agenda: string;
    date: string;
    startTime: string;
    endTime: string;
    meetingType: "video" | "voice";
    participantIds: string[];
  }>({
    title: "",
    agenda: "",
    date: new Date().toISOString().slice(0, 10),
    startTime: "10:00",
    endTime: "10:30",
    meetingType: "video",
    participantIds: [],
  });

  const [isNewCallModalOpen, setIsNewCallModalOpen] = useState(false);
  const [isInviteToCallOpen, setIsInviteToCallOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inCallChatInput, setInCallChatInput] = useState("");
  const [inCallMessages, setInCallMessages] = useState<
    { id: string; sender: string; avatar?: string; text: string; time: string; isSelf: boolean }[]
  >([]);

  // Hardware Streams & Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

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

  // 1. REALTIME QUERY: Fetch employees list & active attendance strictly from MySQL DB
  const { data: employeesList = [], isLoading: isEmployeesLoading } = useQuery<EmployeeUser[]>({
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
          const fullName = `${e.firstName || e.first_name || ""} ${e.lastName || e.last_name || ""}`.trim() || e.email || "Employee";
          return {
            id: e.id,
            full_name: fullName,
            email: e.email || "",
            avatar_url: profileAvatar,
            role: e.position || e.department?.name || "Team Member",
            department: e.department?.name || e.department || "General Staff",
            phone: e.phone || e.mobile || "+1 555-0100",
            employeeNumber: e.employeeNumber || e.employee_id || e.id.slice(0, 6).toUpperCase(),
            joinDate: e.hireDate ? new Date(e.hireDate).toLocaleDateString() : "Active Staff",
            isCheckedIn: checkedInIds.has(e.id),
          };
        });
      } catch {
        return [];
      }
    },
    refetchInterval: 20000,
  });

  // 2. Persistent Thread Messages Query from MySQL
  const { data: dbThreadMessages } = useQuery({
    queryKey: ["db-chat-messages", activeThreadId],
    queryFn: async () => {
      if (!activeThreadId) return [];
      try {
        const res = await api.get(`/chat/messages/${activeThreadId}`);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: !!activeThreadId,
  });

  useEffect(() => {
    if (dbThreadMessages && dbThreadMessages.length > 0 && activeThreadId) {
      setLocalMessagesMap((prev) => {
        const existing = prev[activeThreadId] || [];
        const existingIds = new Set(existing.map((m) => m.id));
        const newOnes = dbThreadMessages
          .filter((dbMsg: any) => !existingIds.has(dbMsg.id))
          .map((dbMsg: any) => ({
            id: dbMsg.id,
            senderId: dbMsg.senderId,
            senderName: dbMsg.senderName,
            senderAvatar: dbMsg.senderAvatar || undefined,
            text: dbMsg.content,
            type: "text" as const,
            timestamp: new Date(dbMsg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            status: "delivered" as const,
            isRead: true,
          }));

        if (newOnes.length === 0) return prev;
        return {
          ...prev,
          [activeThreadId]: [...existing, ...newOnes],
        };
      });
    }
  }, [dbThreadMessages, activeThreadId]);

  // 3. Real-time Socket.IO Listener for Incoming Messages
  useEffect(() => {
    const socket = getSocketClient();

    function onSocketMessage(payload: any) {
      if (!payload || !payload.threadId || !payload.message) return;
      const tId = payload.threadId;
      const msg = payload.message;

      setLocalMessagesMap((prevMap) => {
        const existing = prevMap[tId] || [];
        if (existing.some((m) => m.id === msg.id)) return prevMap;

        const incomingMsg: ChatMessage = {
          id: msg.id || `msg-${Date.now()}`,
          senderId: msg.senderId || msg.sender_id || "user",
          senderName: msg.senderName || msg.sender_name || "User",
          senderAvatar: msg.senderAvatar || msg.sender_avatar || undefined,
          text: msg.content || msg.text || "",
          type: "text",
          timestamp: new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "delivered",
          isRead: activeThreadId === tId,
        };

        return {
          ...prevMap,
          [tId]: [...existing, incomingMsg],
        };
      });
    }

    socket.on("chat:message", onSocketMessage);
    return () => {
      socket.off("chat:message", onSocketMessage);
    };
  }, [activeThreadId]);

  // 4. Fetch Chat State from MySQL & Local Backup
  const { data: chatData } = useQuery({
    queryKey: ["team-chat-state-full"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/team-chat-workspace-v3").catch(() => null);
        if (page && page.content && (page.content.threads?.length || Object.keys(page.content.messagesMap || {}).length)) {
          return {
            threads: page.content.threads || [],
            messagesMap: page.content.messagesMap || {},
            presenceMap: page.content.presenceMap || {},
          };
        }
      } catch {}

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

  // Mark current thread's messages as read
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

  // Visible messages
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

  // Auto Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length]);

  // Save Chat Mutation
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
        await api.post("/cms/pages", {
          title: "Team Chat Workspace State V3",
          slug: "team-chat-workspace-v3",
          content: payload,
          published: true,
        }).catch(() => null);
      } catch {}
    },
  });

  // Call Connected Duration Timer
  useEffect(() => {
    let interval: any = null;
    if (activeCall.status === "connected") {
      interval = setInterval(() => {
        setActiveCall((prev) => ({ ...prev, durationSeconds: prev.durationSeconds + 1 }));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall.status]);

  // Recording Timer
  useEffect(() => {
    let interval: any = null;
    if (activeCall.isRecording) {
      interval = setInterval(() => {
        setActiveCall((prev) => ({ ...prev, recordingSeconds: prev.recordingSeconds + 1 }));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall.isRecording]);

  // Outgoing Call Auto-Connect Timer
  useEffect(() => {
    let timer: any = null;
    if (activeCall.status === "outgoing") {
      timer = setTimeout(() => {
        setActiveCall((prev) => ({ ...prev, status: "connected", durationSeconds: 0 }));
      }, 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeCall.status]);

  // WebRTC Hardware Camera Setup
  useEffect(() => {
    if (activeCall.status === "connected" && activeCall.mediaType === "video" && !activeCall.isVideoOff) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: true })
          .then((stream) => {
            mediaStreamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          })
          .catch(() => {
            // Camera not available or permission denied
          });
      }
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [activeCall.status, activeCall.mediaType, activeCall.isVideoOff]);

  // Screen Share Stream Handler
  useEffect(() => {
    if (activeCall.isScreenSharing) {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: true })
          .then((stream) => {
            screenStreamRef.current = stream;
            if (screenShareVideoRef.current) {
              screenShareVideoRef.current.srcObject = stream;
            }
            stream.getVideoTracks()[0].onended = () => {
              setActiveCall((prev) => ({ ...prev, isScreenSharing: false }));
            };
          })
          .catch(() => {
            setActiveCall((prev) => ({ ...prev, isScreenSharing: false }));
          });
      }
    } else {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
    }

    return () => {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
    };
  }, [activeCall.isScreenSharing]);

  function formatCallDuration(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function handleSavePresence(status: PresenceStatusType, customText?: string) {
    const updated = {
      ...presenceMap,
      [myUserId]: { status, customText: customText || PRESENCE_CONFIG[status].label },
    };
    setPresenceMap(updated);
    saveChatStateMutation.mutate({ updatedPresenceMap: updated });
    setIsStatusModalOpen(false);
    toast.success(`Status set to ${PRESENCE_CONFIG[status].label}`);
  }

  function handleSendMessage() {
    if (!currentThread || !activeThreadId) return;

    if (currentThread.onlyAdminsCanSend) {
      const isAdmin = currentThread.groupAdminIds?.includes(myUserId) || myUserId === "super_admin";
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
      status: "delivered",
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

    setInputMsg("");
    setAttachedImage(null);
    setAttachedFile(null);
    setReplyingTo(null);
  }

  function handleStartCall(
    mediaType: "voice" | "video",
    contactName?: string,
    contactAvatar?: string,
    contactRole?: string,
    contactId?: string,
    contactEmail?: string,
    contactPhone?: string,
  ) {
    const name = contactName || currentThread?.name || (activeTargetEmp ? activeTargetEmp.full_name : "Colleague");
    const avatar = contactAvatar || currentThread?.avatarUrl || (activeTargetEmp ? activeTargetEmp.avatar_url : undefined);
    const role = contactRole || (activeTargetEmp ? activeTargetEmp.role : "Staff Member");
    const email = contactEmail || (activeTargetEmp ? activeTargetEmp.email : "");
    const phone = contactPhone || (activeTargetEmp ? activeTargetEmp.phone : "");

    setActiveCall({
      status: "outgoing",
      mediaType,
      contactId: contactId || (activeTargetEmp ? activeTargetEmp.id : undefined),
      contactName: name,
      contactAvatar: avatar,
      contactRole: role,
      contactEmail: email,
      contactPhone: phone,
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: true,
      isScreenSharing: false,
      isFullScreen: false,
      durationSeconds: 0,
      showChat: false,
      showMoM: false,
      isRecording: false,
      recordingSeconds: 0,
      momDiscussionPoints: "",
      momDecisions: "",
      momActionItems: "",
    });
    setIsNewCallModalOpen(false);
  }

  function handleAcceptCall(mediaType: "voice" | "video") {
    setActiveCall((prev) => ({
      ...prev,
      status: "connected",
      mediaType,
      durationSeconds: 0,
    }));
    toast.success(`Call connected (${mediaType === "video" ? "Video" : "Voice"})`);
  }

  function handleDeclineCall() {
    if (activeCall.status === "incoming") {
      const newLog: CallLog = {
        id: `call-${Date.now()}`,
        name: activeCall.contactName,
        avatarUrl: activeCall.contactAvatar,
        phone: activeCall.contactPhone || "",
        callType: "missed",
        mediaType: activeCall.mediaType,
        duration: "00:00",
        timestamp: "Just now",
      };
      const updated = [newLog, ...callLogs];
      setCallLogs(updated);
      try {
        localStorage.setItem("master_hrms_call_history", JSON.stringify(updated));
      } catch {}
    }
    setActiveCall({
      status: "idle",
      mediaType: "voice",
      contactName: "",
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: true,
      isScreenSharing: false,
      isFullScreen: false,
      durationSeconds: 0,
      showChat: false,
      showMoM: false,
      isRecording: false,
      recordingSeconds: 0,
      momDiscussionPoints: "",
      momDecisions: "",
      momActionItems: "",
    });
  }

  function handleEndCall() {
    const formattedDuration = formatCallDuration(activeCall.durationSeconds);
    const momSummary = [
      activeCall.momDiscussionPoints ? `Discussion: ${activeCall.momDiscussionPoints}` : "",
      activeCall.momDecisions ? `Decisions: ${activeCall.momDecisions}` : "",
      activeCall.momActionItems ? `Action Items: ${activeCall.momActionItems}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const newLog: CallLog = {
      id: `call-${Date.now()}`,
      name: activeCall.contactName,
      avatarUrl: activeCall.contactAvatar,
      phone: activeCall.contactPhone || "",
      callType: activeCall.status === "incoming" ? "incoming" : "outgoing",
      mediaType: activeCall.mediaType,
      duration: formattedDuration,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      momNotes: momSummary || undefined,
    };
    const updated = [newLog, ...callLogs];
    setCallLogs(updated);
    try {
      localStorage.setItem("master_hrms_call_history", JSON.stringify(updated));
    } catch {}

    setActiveCall({
      status: "idle",
      mediaType: "voice",
      contactName: "",
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: true,
      isScreenSharing: false,
      isFullScreen: false,
      durationSeconds: 0,
      showChat: false,
      showMoM: false,
      isRecording: false,
      recordingSeconds: 0,
      momDiscussionPoints: "",
      momDecisions: "",
      momActionItems: "",
    });
    toast.info(`Call ended · Duration: ${formattedDuration}`);
  }

  function handleToggleRecording() {
    if (!activeCall.isRecording) {
      setActiveCall((prev) => ({ ...prev, isRecording: true, recordingSeconds: 0 }));
      toast.success("Meeting recording started");
    } else {
      setActiveCall((prev) => ({ ...prev, isRecording: false }));
      toast.info(`Recording saved (${formatCallDuration(activeCall.recordingSeconds)})`);
    }
  }

  function handleExportMoM() {
    const content = `MINUTES OF MEETING (MoM)
=====================================
Meeting Participant / Title: ${activeCall.contactName}
Date: ${new Date().toLocaleDateString()}
Duration: ${formatCallDuration(activeCall.durationSeconds)}
Meeting Type: ${activeCall.mediaType === "video" ? "Video Conference" : "Voice Conference"}

1. KEY DISCUSSION POINTS:
${activeCall.momDiscussionPoints || "No points logged."}

2. DECISIONS TAKEN:
${activeCall.momDecisions || "No specific decisions logged."}

3. ACTION ITEMS & OWNERS:
${activeCall.momActionItems || "No action items recorded."}

Generated by Master HRMS Workspace Suite`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `MoM_${activeCall.contactName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Minutes of Meeting exported successfully");
  }

  function handleCreateScheduledMeeting() {
    if (!meetingForm.title.trim()) return toast.error("Meeting title is required");
    const newMeeting: ScheduledMeeting = {
      id: `meet-${Date.now()}`,
      title: meetingForm.title.trim(),
      agenda: meetingForm.agenda.trim(),
      date: meetingForm.date,
      startTime: meetingForm.startTime,
      endTime: meetingForm.endTime,
      meetingType: meetingForm.meetingType,
      participantIds: meetingForm.participantIds,
      createdByName: currentProfile?.full_name || "Super Admin",
    };

    const updated = [newMeeting, ...scheduledMeetings];
    setScheduledMeetings(updated);
    try {
      localStorage.setItem("master_hrms_scheduled_meetings", JSON.stringify(updated));
    } catch {}

    setIsScheduleModalOpen(false);
    setCallsSubTab("meetings");
    setActiveTab("calls");
    setMeetingForm({
      title: "",
      agenda: "",
      date: new Date().toISOString().slice(0, 10),
      startTime: "10:00",
      endTime: "10:30",
      meetingType: "video",
      participantIds: [],
    });
    toast.success(`Meeting "${newMeeting.title}" scheduled`);
  }

  function handleCancelScheduledMeeting(meetingId: string) {
    const updated = scheduledMeetings.filter((m) => m.id !== meetingId);
    setScheduledMeetings(updated);
    try {
      localStorage.setItem("master_hrms_scheduled_meetings", JSON.stringify(updated));
    } catch {}
    toast.info("Scheduled meeting removed");
  }

  function handleStartScheduledMeeting(meeting: ScheduledMeeting) {
    setActiveCall({
      status: "outgoing",
      mediaType: meeting.meetingType,
      contactName: meeting.title,
      contactRole: `Conference · ${meeting.participantIds.length + 1} Attendees`,
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: true,
      isScreenSharing: false,
      isFullScreen: false,
      durationSeconds: 0,
      showChat: false,
      showMoM: false,
      isRecording: false,
      recordingSeconds: 0,
      momDiscussionPoints: meeting.agenda ? `Agenda: ${meeting.agenda}` : "",
      momDecisions: "",
      momActionItems: "",
    });
    toast.success(`Starting conference for "${meeting.title}"`);
  }

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

      const updatedThreads = [newThread, ...localThreads];
      setLocalThreads(updatedThreads);
      saveChatStateMutation.mutate({ updatedThreads });
    }

    setActiveThreadId(threadId);
    setActiveTab("chats");
    setMobileView("chat");
  }

  function handleCreateGroup() {
    if (!newGroupName.trim()) {
      return toast.error("Please enter a group channel name");
    }

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
      groupDescription: groupDescription.trim() || undefined,
      participantIds: Array.from(new Set([myUserId, ...selectedGroupMembers])),
      participantNames: memberNames,
      lastMessage: "Channel created.",
      lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      unreadCount: 0,
    };

    const welcomeMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: myUserId,
      senderName: currentProfile?.full_name || "Super Admin",
      text: `Channel "${newThread.name}" created with ${memberNames.length} member(s).`,
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
    setGroupDescription("");
    setNewGroupAvatar("");
    setSelectedGroupMembers([]);
    setGroupMemberSearch("");
    setOnlyAdminsCanSend(false);
    setActiveThreadId(newGroupId);
    setActiveTab("groups");
    setMobileView("chat");
    toast.success(`Channel "${newThread.name}" created successfully`);
  }

  function handleAddMembersToCurrentGroup(empIds: string[]) {
    if (!currentThread || !currentThread.isGroup || empIds.length === 0) return;

    const newEmployees = employeesList.filter((e) => empIds.includes(e.id));
    const newNames = newEmployees.map((e) => e.full_name);
    const updatedParticipantIds = Array.from(new Set([...currentThread.participantIds, ...empIds]));
    const updatedParticipantNames = Array.from(
      new Set([...(currentThread.participantNames || []), ...newNames]),
    );

    const systemMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: myUserId,
      senderName: currentProfile?.full_name || "Super Admin",
      text: `${currentProfile?.full_name || "Super Admin"} added ${newNames.join(", ")} to the channel.`,
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
            lastMessage: systemMsg.text,
            lastMessageTime: systemMsg.timestamp,
          }
        : t,
    );

    const updatedMessages = [...(localMessagesMap[currentThread.id] || []), systemMsg];
    const updatedMessagesMap = { ...localMessagesMap, [currentThread.id]: updatedMessages };

    setLocalThreads(updatedThreads);
    setLocalMessagesMap(updatedMessagesMap);
    saveChatStateMutation.mutate({ updatedThreads, updatedMessagesMap });
    setIsAddMemberOpen(false);
    setSelectedAddMembers([]);
    setAddMemberSearch("");
    toast.success(`Added ${newNames.length} member(s) to ${currentThread.name}`);
  }

  function handleRemoveMemberFromGroup(empId: string, empName: string) {
    if (!currentThread || !currentThread.isGroup) return;

    const isMyGroupAdmin =
      currentThread.groupAdminIds?.includes(myUserId) || myUserId === "super_admin";
    if (!isMyGroupAdmin) {
      return toast.error("Only channel admins can remove members.");
    }

    const updatedParticipantIds = currentThread.participantIds.filter((id) => id !== empId);
    const updatedParticipantNames = (currentThread.participantNames || []).filter((n) => n !== empName);
    const updatedAdminIds = (currentThread.groupAdminIds || []).filter((id) => id !== empId);

    const systemMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: myUserId,
      senderName: currentProfile?.full_name || "Super Admin",
      text: `${currentProfile?.full_name || "Super Admin"} removed ${empName} from the channel.`,
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
            groupAdminIds: updatedAdminIds,
            lastMessage: systemMsg.text,
            lastMessageTime: systemMsg.timestamp,
          }
        : t,
    );

    const updatedMessages = [...(localMessagesMap[currentThread.id] || []), systemMsg];
    const updatedMessagesMap = { ...localMessagesMap, [currentThread.id]: updatedMessages };

    setLocalThreads(updatedThreads);
    setLocalMessagesMap(updatedMessagesMap);
    saveChatStateMutation.mutate({ updatedThreads, updatedMessagesMap });
    toast.info(`Removed ${empName} from channel`);
  }

  function handleToggleGroupAdminRole(empId: string, empName: string) {
    if (!currentThread || !currentThread.isGroup) return;

    const isMyGroupAdmin =
      currentThread.groupAdminIds?.includes(myUserId) || myUserId === "super_admin";
    if (!isMyGroupAdmin) {
      return toast.error("Only channel admins can change member roles.");
    }

    const currentAdmins = currentThread.groupAdminIds || [myUserId];
    const isTargetAdmin = currentAdmins.includes(empId);
    const updatedAdminIds = isTargetAdmin
      ? currentAdmins.filter((id) => id !== empId)
      : [...currentAdmins, empId];

    const updatedThreads = localThreads.map((t) =>
      t.id === currentThread.id
        ? {
            ...t,
            groupAdminIds: updatedAdminIds,
          }
        : t,
    );

    setLocalThreads(updatedThreads);
    saveChatStateMutation.mutate({ updatedThreads });
    toast.success(
      isTargetAdmin ? `Dismissed ${empName} as admin` : `Promoted ${empName} to channel admin`,
    );
  }

  function handleToggleBroadcastMode(checked: boolean) {
    if (!currentThread || !currentThread.isGroup) return;

    const updatedThreads = localThreads.map((t) =>
      t.id === currentThread.id
        ? {
            ...t,
            onlyAdminsCanSend: checked,
          }
        : t,
    );

    setLocalThreads(updatedThreads);
    saveChatStateMutation.mutate({ updatedThreads });
    toast.success(
      checked
        ? "Broadcast mode enabled: Only admins can post"
        : "Standard mode: All members can send messages",
    );
  }

  function handleLeaveGroupChannel(threadId: string) {
    const thread = localThreads.find((t) => t.id === threadId);
    if (!thread) return;

    const updatedParticipantIds = thread.participantIds.filter((id) => id !== myUserId);
    const updatedParticipantNames = (thread.participantNames || []).filter(
      (n) => n !== (currentProfile?.full_name || "Super Admin"),
    );
    const updatedAdminIds = (thread.groupAdminIds || []).filter((id) => id !== myUserId);

    const systemMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: myUserId,
      senderName: currentProfile?.full_name || "Super Admin",
      text: `${currentProfile?.full_name || "Super Admin"} left the channel.`,
      type: "text",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isRead: true,
    };

    const updatedThreads = localThreads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            participantIds: updatedParticipantIds,
            participantNames: updatedParticipantNames,
            groupAdminIds: updatedAdminIds,
            lastMessage: systemMsg.text,
            lastMessageTime: systemMsg.timestamp,
          }
        : t,
    );

    const updatedMessages = [...(localMessagesMap[threadId] || []), systemMsg];
    const updatedMessagesMap = { ...localMessagesMap, [threadId]: updatedMessages };

    setLocalThreads(updatedThreads);
    setLocalMessagesMap(updatedMessagesMap);
    saveChatStateMutation.mutate({ updatedThreads, updatedMessagesMap });

    setActiveThreadId(null);
    setIsProfileDrawerOpen(false);
    toast.info(`Left channel "${thread.name}"`);
  }

  function handleDeleteGroupChannel(threadId: string) {
    const threadToDelete = localThreads.find((t) => t.id === threadId);
    if (!threadToDelete) return;

    const updatedThreads = localThreads.filter((t) => t.id !== threadId);
    const updatedMessagesMap = { ...localMessagesMap };
    delete updatedMessagesMap[threadId];

    setLocalThreads(updatedThreads);
    setLocalMessagesMap(updatedMessagesMap);
    saveChatStateMutation.mutate({ updatedThreads, updatedMessagesMap });

    setActiveThreadId(null);
    setIsProfileDrawerOpen(false);
    toast.success(`Channel "${threadToDelete.name}" deleted`);
  }

  // Extract shared media and attachments for the active conversation
  const sharedMediaList = useMemo(() => {
    return activeMessages.filter((m) => m.type === "image" && m.mediaUrl);
  }, [activeMessages]);

  const sharedDocumentsList = useMemo(() => {
    return activeMessages.filter((m) => m.type === "file" && (m.fileName || m.mediaUrl));
  }, [activeMessages]);

  return (
    <PlanGuard moduleName="Team Internal Chat" requiredPlan="starter">
      {/* FULL RESPONSIVE WORKSPACE CONTAINER */}
      <div className="h-[calc(100vh-6.5rem)] sm:h-[calc(100vh-7.5rem)] w-full rounded-xl border bg-card flex flex-col overflow-hidden shadow-xs relative">
        <div className="flex-1 flex overflow-hidden w-full h-full min-h-0 relative">
          
          {/* 1. LEFT CONVERSATION SIDEBAR */}
          <div
            className={`${
              mobileView === "chat" ? "hidden md:flex" : "flex"
            } w-full md:w-[320px] lg:w-[360px] border-r bg-card flex-col h-full min-h-0 shrink-0 z-10 transition-all duration-200`}
          >
            {/* Sidebar Profile Header */}
            <div className="p-3 bg-muted/20 border-b flex items-center justify-between shrink-0 gap-2">
              <div
                onClick={() => {
                  setSelectedStatusType(myPresence.status);
                  setCustomStatusText(myPresence.customText || "");
                  setIsStatusModalOpen(true);
                }}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                title="Update your availability status"
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
                  <div className="font-semibold text-xs truncate text-foreground group-hover:text-primary transition-colors">
                    {currentProfile?.full_name || "Super Admin"}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                    <span>{PRESENCE_CONFIG[myPresence.status].icon}</span>
                    <span className="truncate">{myPresence.customText || PRESENCE_CONFIG[myPresence.status].label}</span>
                  </div>
                </div>
              </div>

              {/* Status Switcher & Group Button */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => setIsScheduleModalOpen(true)}
                  title="Schedule a Meeting"
                >
                  <Calendar className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  onClick={() => setIsGroupModalOpen(true)}
                  title="Create Department Channel"
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
                  placeholder="Search chats, staff, or channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-muted/30 rounded-lg border-muted"
                />
              </div>
            </div>

            {/* Tabs: Chats / Channels / Staff / Calls / Meetings */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-2 pt-2">
                  <TabsList className="grid grid-cols-4 w-full h-8 text-[11px] bg-muted/40">
                    <TabsTrigger value="chats" className="text-[11px] py-1 font-semibold truncate px-1">
                      Chats ({localThreads.filter((t) => !t.isGroup).length})
                    </TabsTrigger>
                    <TabsTrigger value="groups" className="text-[11px] py-1 font-semibold truncate px-1">
                      Groups ({localThreads.filter((t) => t.isGroup).length})
                    </TabsTrigger>
                    <TabsTrigger value="employees" className="text-[11px] py-1 font-semibold truncate px-1">
                      Staff ({employeesList.length})
                    </TabsTrigger>
                    <TabsTrigger value="calls" className="text-[11px] py-1 font-semibold truncate px-1 text-emerald-700 dark:text-emerald-300">
                      Calls ({callLogs.length + scheduledMeetings.length})
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* TAB 1: DIRECT CHATS */}
                <TabsContent value="chats" className="space-y-0.5 mt-2">
                  {localThreads.filter((t) => !t.isGroup).length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                      <MessageSquare className="size-8 mx-auto opacity-30 text-emerald-600" />
                      <p className="font-semibold text-foreground">No active direct chats</p>
                      <p>Select any colleague from the Staff tab to begin messaging.</p>
                    </div>
                  ) : (
                    localThreads
                      .filter((t) => !t.isGroup)
                      .filter((t) => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((t) => {
                        const isActive = t.id === activeThreadId;
                        const otherEmpId = t.participantIds.find((id) => id !== myUserId);
                        const otherPresence = otherEmpId ? presenceMap[otherEmpId] : null;

                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              setActiveThreadId(t.id);
                              setMobileView("chat");
                            }}
                            className={`p-3 flex items-center justify-between cursor-pointer border-b border-border/30 transition-colors ${
                              isActive
                                ? "bg-emerald-500/10 border-l-4 border-l-emerald-600"
                                : "hover:bg-muted/30"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="relative shrink-0">
                                <Avatar className="size-10 border">
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
                                  <h4 className="font-semibold text-xs truncate text-foreground flex items-center gap-1">
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
                          </div>
                        );
                      })
                  )}
                </TabsContent>

                {/* TAB 2: GROUPS / CHANNELS */}
                <TabsContent value="groups" className="space-y-2 mt-2">
                  <div className="px-2">
                    <Button
                      size="sm"
                      onClick={() => setIsGroupModalOpen(true)}
                      className="w-full h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs"
                    >
                      <Plus className="size-3.5" /> Create New Group
                    </Button>
                  </div>

                  {localThreads.filter((t) => t.isGroup).length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                      <Users className="size-8 mx-auto opacity-30 text-emerald-600" />
                      <p className="font-semibold text-foreground">No channels created</p>
                      <p>Create your first group channel to collaborate with teammates.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {localThreads
                        .filter((t) => t.isGroup)
                        .filter((t) => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((t) => {
                          const isActive = t.id === activeThreadId;
                          return (
                            <div
                              key={t.id}
                              onClick={() => {
                                setActiveThreadId(t.id);
                                setMobileView("chat");
                              }}
                              className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                                isActive
                                  ? "bg-emerald-500/10 border-l-4 border-l-emerald-600"
                                  : "hover:bg-muted/30"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <Avatar className="size-10 border shrink-0">
                                  <AvatarImage src={t.avatarUrl} />
                                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                                    {getInitials(t.name)}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-xs truncate text-foreground">{t.name}</h4>
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      {t.lastMessageTime}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                    {t.lastMessage}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </TabsContent>

                {/* TAB 3: REAL DB STAFF DIRECTORY */}
                <TabsContent value="employees" className="space-y-0.5 mt-2">
                  {isEmployeesLoading ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">Loading staff directory...</div>
                  ) : employeesList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                      <Users className="size-8 mx-auto opacity-30 text-emerald-600" />
                      <p className="font-semibold text-foreground">No employees found</p>
                      <p>Add employees via the Staff Management module.</p>
                    </div>
                  ) : (
                    employeesList
                      .filter(
                        (e) =>
                          !searchQuery ||
                          e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.role.toLowerCase().includes(searchQuery.toLowerCase()),
                      )
                      .map((emp) => {
                        const empPresence = presenceMap[emp.id] || {
                          status: (emp.isCheckedIn ? "available" : "offline") as PresenceStatusType,
                          customText: emp.isCheckedIn ? "Online & Checked In" : "Offline",
                        };

                        return (
                          <div
                            key={emp.id}
                            className="p-2.5 flex items-center justify-between border-b border-border/30 hover:bg-muted/30 transition-colors"
                          >
                            <div
                              onClick={() => handleStartDirectChat(emp)}
                              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                            >
                              <div className="relative shrink-0">
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
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-xs truncate text-foreground">
                                  {emp.full_name}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate font-mono">
                                  {emp.role} · {emp.department}
                                </div>
                              </div>
                            </div>

                            {/* Direct Communication Buttons */}
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => handleStartCall("voice", emp.full_name, emp.avatar_url, emp.role, emp.id, emp.email, emp.phone)}
                                title="Voice Call"
                              >
                                <Phone className="size-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-blue-600 hover:bg-blue-50"
                                onClick={() => handleStartCall("video", emp.full_name, emp.avatar_url, emp.role, emp.id, emp.email, emp.phone)}
                                title="Video Call"
                              >
                                <Video className="size-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-muted-foreground hover:bg-muted"
                                onClick={() => handleStartDirectChat(emp)}
                                title="Message"
                              >
                                <MessageSquare className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </TabsContent>

                {/* TAB 4: CALLS & SCHEDULED MEETINGS */}
                <TabsContent value="calls" className="space-y-2 mt-2">
                  <div className="px-2 space-y-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => setIsNewCallModalOpen(true)}
                        className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 flex-1"
                      >
                        <PhoneCall className="size-3.5" /> Start Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsScheduleModalOpen(true)}
                        className="h-7 text-xs font-semibold gap-1 flex-1 text-emerald-600 border-emerald-500/30"
                      >
                        <Calendar className="size-3.5" /> Schedule Meeting
                      </Button>
                    </div>

                    {/* Sub-Tab Switcher: Call Logs vs Upcoming Meetings */}
                    <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg">
                      <button
                        onClick={() => setCallsSubTab("history")}
                        className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                          callsSubTab === "history"
                            ? "bg-background text-foreground shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Call Logs ({callLogs.length})
                      </button>
                      <button
                        onClick={() => setCallsSubTab("meetings")}
                        className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                          callsSubTab === "meetings"
                            ? "bg-background text-emerald-600 shadow-2xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Upcoming Meetings ({scheduledMeetings.length})
                      </button>
                    </div>

                    {/* Filter Pills for Call History */}
                    {callsSubTab === "history" && (
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 p-0.5 bg-muted/40 rounded-lg flex-1">
                          {(["all", "incoming", "outgoing", "missed"] as const).map((f) => (
                            <button
                              key={f}
                              onClick={() => setCallFilter(f)}
                              className={`flex-1 py-1 text-[10px] font-semibold rounded-md capitalize transition-colors ${
                                callFilter === f
                                  ? "bg-background text-foreground shadow-2xs"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>

                        {callLogs.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setCallLogs([]);
                              try {
                                localStorage.removeItem("master_hrms_call_history");
                              } catch {}
                              toast.success("Call history cleared");
                            }}
                            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                            title="Clear all call history records"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 1. UPCOMING MEETINGS VIEW */}
                  {callsSubTab === "meetings" && (
                    <div className="divide-y divide-border/30">
                      {scheduledMeetings.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground space-y-3">
                          <Calendar className="size-8 mx-auto opacity-30 text-emerald-600" />
                          <div>
                            <p className="font-semibold text-foreground">No Upcoming Meetings</p>
                            <p className="text-[11px] mt-0.5">Schedule team video syncs or voice conferences.</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setIsScheduleModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 h-7"
                          >
                            <Calendar className="size-3.5" /> Schedule a Meeting
                          </Button>
                        </div>
                      ) : (
                        scheduledMeetings.map((meet) => (
                          <div key={meet.id} className="p-3 hover:bg-muted/30 transition-colors space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <Badge className="bg-emerald-600/10 text-emerald-600 border-emerald-500/30 text-[9px] py-0 h-4 px-1.5 font-bold uppercase">
                                    {meet.meetingType === "video" ? "Video Sync" : "Voice Call"}
                                  </Badge>
                                  <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                                    {meet.date} · {meet.startTime} - {meet.endTime}
                                  </span>
                                </div>
                                <h4 className="font-bold text-xs text-foreground mt-1 truncate">{meet.title}</h4>
                                {meet.agenda && (
                                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{meet.agenda}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-border/20 text-[10px] text-muted-foreground">
                              <span>Created by {meet.createdByName}</span>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCancelScheduledMeeting(meet.id)}
                                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleStartScheduledMeeting(meet)}
                                  className="h-6 px-2.5 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                >
                                  {meet.meetingType === "video" ? <Video className="size-3" /> : <Phone className="size-3" />}
                                  Join / Start
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Call Log List */}
                  <div className="divide-y divide-border/30">
                    {callLogs.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                        <Phone className="size-8 mx-auto opacity-30 text-emerald-600" />
                        <p className="font-semibold text-foreground">No call history</p>
                        <p>Initiate a voice or video call with any team member.</p>
                      </div>
                    ) : (
                      callLogs
                        .filter((c) => (callFilter === "all" ? true : c.callType === callFilter))
                        .map((call) => (
                          <div key={call.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="relative shrink-0">
                                <Avatar className="size-9 border">
                                  <AvatarImage src={call.avatarUrl} />
                                  <AvatarFallback className="bg-emerald-700 text-white font-bold text-xs">
                                    {getInitials(call.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div
                                  className={`absolute -bottom-1 -right-1 size-4 rounded-full border border-background grid place-items-center ${
                                    call.callType === "missed"
                                      ? "bg-rose-500 text-white"
                                      : call.callType === "incoming"
                                      ? "bg-emerald-500 text-white"
                                      : "bg-blue-500 text-white"
                                  }`}
                                >
                                  {call.callType === "missed" ? (
                                    <PhoneMissed className="size-2.5" />
                                  ) : call.callType === "incoming" ? (
                                    <PhoneIncoming className="size-2.5" />
                                  ) : (
                                    <PhoneOutgoing className="size-2.5" />
                                  )}
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-xs truncate text-foreground">{call.name}</h4>
                                  <span className="text-[10px] text-muted-foreground">{call.timestamp}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                  <span>{call.mediaType === "video" ? "Video Call" : "Voice Call"}</span>
                                  <span>·</span>
                                  <span className="font-mono">{call.duration}</span>
                                  {call.momNotes && <Badge variant="outline" className="text-[8px] py-0 h-3.5">MoM Logged</Badge>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => handleStartCall("voice", call.name, call.avatarUrl)}
                                title="Redial Voice"
                              >
                                <Phone className="size-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-blue-600 hover:bg-blue-50"
                                onClick={() => handleStartCall("video", call.name, call.avatarUrl)}
                                title="Redial Video"
                              >
                                <Video className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* 2. CENTER ACTIVE CHAT AREA */}
          <div
            className={`${
              mobileView === "sidebar" ? "hidden md:flex" : "flex"
            } flex-1 flex-col justify-between bg-muted/10 relative h-full min-h-0 overflow-hidden`}
          >
            {!currentThread ? (
              <div className="py-32 flex flex-col items-center justify-center text-center text-muted-foreground space-y-3 p-6">
                <div className="size-16 rounded-full bg-emerald-500/10 grid place-items-center text-emerald-600">
                  <MessageSquare className="size-8" />
                </div>
                <h3 className="font-bold text-lg text-foreground">Team Internal Chat</h3>
                <p className="text-xs max-w-sm">
                  Select a team member from the Staff tab or create a group channel to communicate.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsGroupModalOpen(true)}
                  className="bg-emerald-600 text-white text-xs font-semibold gap-1.5"
                >
                  <Plus className="size-3.5" /> Create Group Channel
                </Button>
              </div>
            ) : (
              <>
                {/* Active Chat Top Header */}
                <div className="p-3 px-4 bg-card border-b flex items-center justify-between shrink-0 shadow-2xs">
                  {/* Clickable user profile trigger */}
                  <div
                    onClick={() => setIsProfileDrawerOpen((prev) => !prev)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer group flex-1"
                    title="Click to view full user profile & shared media"
                  >
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 md:hidden shrink-0 text-emerald-600 -ml-1 mr-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMobileView("sidebar");
                      }}
                      title="Back to Chats"
                    >
                      <ArrowLeft className="size-4" />
                    </Button>

                    <div className="relative">
                      <Avatar className="size-10 border shrink-0 group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
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
                      <h3 className="font-bold text-sm truncate text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                        <span>{currentThread.name}</span>
                        {currentThread.isGroup ? (
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {currentThread.participantNames?.length || 0} Members
                          </Badge>
                        ) : activeTargetEmp ? (
                          <Badge
                            variant="outline"
                            className={`text-[9px] py-0 h-4 ${
                              PRESENCE_CONFIG[presenceMap[activeTargetEmp.id]?.status || "available"]?.badgeClass
                            }`}
                          >
                            {PRESENCE_CONFIG[presenceMap[activeTargetEmp.id]?.status || "available"]?.label}
                          </Badge>
                        ) : null}
                      </h3>

                      <p className="text-[11px] text-muted-foreground truncate">
                        {currentThread.isGroup
                          ? "Channel · Click to view profile passport & files"
                          : activeTargetEmp
                          ? `${activeTargetEmp.role} · ${activeTargetEmp.department}`
                          : "Direct Conversation"}
                      </p>
                    </div>
                  </div>

                  {/* Communication Controls (Voice, Video, Schedule, Profile Toggle) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartCall("voice")}
                      className="h-8 text-xs font-semibold gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50"
                      title="Start Voice Call"
                    >
                      <Phone className="size-3.5" />
                      <span className="hidden sm:inline">Voice Call</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartCall("video")}
                      className="h-8 text-xs font-semibold gap-1 text-blue-600 border-blue-500/30 hover:bg-blue-50"
                      title="Start Video Call"
                    >
                      <Video className="size-3.5" />
                      <span className="hidden sm:inline">Video Call</span>
                    </Button>
                  </div>
                </div>

                {/* Messages Conversation Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-background/50">
                  {visibleMessages.length === 0 ? (
                    <div className="py-20 text-center text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold">This is the start of your message history with {currentThread.name}.</p>
                      <p>Send a message below to begin collaborating.</p>
                    </div>
                  ) : (
                    visibleMessages.map((msg) => {
                      const isMe = msg.senderId === myUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          {!isMe && (
                            <Avatar className="size-7 border shrink-0 mb-1">
                              <AvatarImage src={msg.senderAvatar} />
                              <AvatarFallback className="text-[9px] font-bold">
                                {getInitials(msg.senderName)}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          <div className={`max-w-[78%] md:max-w-[65%] space-y-1 ${isMe ? "items-end text-right" : "items-start"}`}>
                            {!isMe && currentThread.isGroup && (
                              <span className="text-[10px] font-semibold text-muted-foreground px-1 block">
                                {msg.senderName}
                              </span>
                            )}

                            <div
                              className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                isMe
                                  ? "bg-emerald-600 text-white rounded-br-xs"
                                  : "bg-card border shadow-2xs text-foreground rounded-bl-xs"
                              }`}
                            >
                              {msg.type === "image" && msg.mediaUrl ? (
                                <img
                                  src={msg.mediaUrl}
                                  alt={msg.fileName || "Image"}
                                  className="max-h-60 rounded-lg object-contain cursor-pointer mb-1.5"
                                  onClick={() => setPreviewModalFile({ url: msg.mediaUrl!, name: msg.fileName || "Photo", type: "image" })}
                                />
                              ) : msg.type === "file" && msg.mediaUrl ? (
                                <div
                                  onClick={() => setPreviewModalFile({ url: msg.mediaUrl!, name: msg.fileName || "Document", type: "file" })}
                                  className="flex items-center gap-2 p-2 rounded-lg bg-black/10 dark:bg-white/10 cursor-pointer mb-1"
                                >
                                  <FileText className="size-4 shrink-0" />
                                  <span className="font-semibold underline truncate text-[11px]">{msg.fileName || "Download Document"}</span>
                                </div>
                              ) : null}

                              <p className="whitespace-pre-wrap">{msg.text}</p>
                              <div className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${isMe ? "text-emerald-100" : "text-muted-foreground"}`}>
                                <span>{msg.timestamp}</span>
                                {isMe && <CheckCheck className="size-3" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attached File Preview Bar if active */}
                {(attachedImage || attachedFile) && (
                  <div className="p-2 px-4 bg-muted/40 border-t flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="size-3.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold truncate">{attachedImage?.name || attachedFile?.name}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setAttachedImage(null);
                        setAttachedFile(null);
                      }}
                      className="size-6 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                )}

                {/* Input Bar */}
                <div className="p-3 bg-card border-t flex items-center gap-2 shrink-0">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.rtf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const check = checkFileRestriction(file.name);
                      if (check.isRestricted) {
                        e.target.value = "";
                        toast.error(
                          `File upload blocked: "${check.ext}" files (executables, .env secrets, and code files) are restricted for security policy compliance.`,
                        );
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setAttachedFile({
                          name: file.name,
                          size: `${(file.size / 1024).toFixed(1)} KB`,
                          dataUrl: ev.target?.result as string,
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const check = checkFileRestriction(file.name);
                      if (check.isRestricted) {
                        e.target.value = "";
                        toast.error(`File upload blocked: "${check.ext}" files are prohibited.`);
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setAttachedImage({ url: ev.target?.result as string, name: file.name });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    className="size-8 text-muted-foreground hover:text-foreground shrink-0"
                    title="Attach Document"
                  >
                    <Paperclip className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => imageInputRef.current?.click()}
                    className="size-8 text-muted-foreground hover:text-foreground shrink-0"
                    title="Attach Image"
                  >
                    <ImageIcon className="size-4" />
                  </Button>

                  <Input
                    placeholder={`Message ${currentThread.name}...`}
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                    className="h-9 text-xs flex-1 bg-muted/20 rounded-lg"
                  />

                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!inputMsg.trim() && !attachedImage && !attachedFile}
                    className="size-9 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 rounded-lg"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* 3. RIGHT PROFILE PASSPORT & MEDIA DRAWER */}
          {isProfileDrawerOpen && currentThread && (() => {
            const isMyGroupAdmin =
              currentThread.isGroup &&
              (currentThread.groupAdminIds?.includes(myUserId) || myUserId === "super_admin");

            return (
              <div className="w-full sm:w-[320px] lg:w-[340px] max-sm:absolute max-sm:inset-0 max-sm:z-30 border-l bg-card flex flex-col h-full min-h-0 shrink-0 z-20 animate-in slide-in-from-right-10 duration-200">
                {/* Drawer Header */}
                <div className="p-3.5 border-b flex items-center justify-between shrink-0">
                  <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <IdCard className="size-4 text-emerald-600" />
                    <span>{currentThread.isGroup ? "Channel Info & Controls" : "User Profile Passport"}</span>
                  </h4>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsProfileDrawerOpen(false)}
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
                  {/* Profile Avatar Card */}
                  <div className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/30 border space-y-2">
                    <Avatar className="size-20 border-2 border-emerald-500 shadow-md">
                      <AvatarImage src={currentThread.avatarUrl} />
                      <AvatarFallback className="bg-emerald-700 text-white font-bold text-lg">
                        {getInitials(currentThread.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{currentThread.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {currentThread.isGroup
                          ? `${currentThread.participantIds.length} Total Members`
                          : activeTargetEmp?.role || "Staff Member"}
                      </p>
                      {currentThread.groupDescription && (
                        <p className="text-[11px] text-muted-foreground mt-1 bg-background/60 p-2 rounded-lg border text-left italic">
                          {currentThread.groupDescription}
                        </p>
                      )}
                    </div>

                    {/* Direct Call Triggers from Drawer */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartCall("voice")}
                        className="h-7 text-xs font-semibold gap-1 text-emerald-600 border-emerald-500/30"
                      >
                        <Phone className="size-3" /> Voice
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartCall("video")}
                        className="h-7 text-xs font-semibold gap-1 text-blue-600 border-blue-500/30"
                      >
                        <Video className="size-3" /> Video
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsScheduleModalOpen(true)}
                        className="h-7 text-xs font-semibold gap-1"
                      >
                        <Calendar className="size-3" /> Meeting
                      </Button>
                    </div>
                  </div>

                  {/* GROUP CHANNEL CONTROLS & MEMBER DIRECTORY */}
                  {currentThread.isGroup && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-xs text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">
                          Members ({currentThread.participantIds.length})
                        </h5>
                        {isMyGroupAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAddMembers([]);
                              setAddMemberSearch("");
                              setIsAddMemberOpen(true);
                            }}
                            className="h-6 text-[10px] font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 gap-1 px-2"
                          >
                            <UserPlus className="size-3" /> Add Members
                          </Button>
                        )}
                      </div>

                      {/* Broadcast Only Toggle (Admins only) */}
                      {isMyGroupAdmin && (
                        <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-xs text-foreground">Only Admins Can Post</p>
                            <p className="text-[10px] text-muted-foreground">Restrict replies to channel admins</p>
                          </div>
                          <Switch
                            checked={currentThread.onlyAdminsCanSend ?? false}
                            onCheckedChange={handleToggleBroadcastMode}
                          />
                        </div>
                      )}

                      {/* Participant Members List */}
                      <div className="space-y-1 rounded-xl border divide-y divide-border/40 max-h-56 overflow-y-auto bg-card">
                        {currentThread.participantIds.map((pId) => {
                          const emp = employeesList.find((e) => e.id === pId);
                          const pName = emp?.full_name || (pId === myUserId ? currentProfile?.full_name || "Super Admin" : "Member");
                          const pRole = emp?.role || (pId === myUserId ? "Current User" : "Team Member");
                          const pAvatar = emp?.avatar_url || (pId === myUserId ? currentProfile?.avatar_url : undefined);
                          const isAdmin = currentThread.groupAdminIds?.includes(pId) || pId === "super_admin";

                          return (
                            <div key={pId} className="p-2 flex items-center justify-between hover:bg-muted/20 text-xs">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Avatar className="size-7 border shrink-0">
                                  <AvatarImage src={pAvatar || undefined} />
                                  <AvatarFallback className="text-[9px] font-bold">
                                    {getInitials(pName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="font-semibold truncate">{pName}</span>
                                    {pId === myUserId && (
                                      <span className="text-[9px] text-muted-foreground font-mono">(You)</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[10px] text-muted-foreground truncate">{pRole}</span>
                                    {isAdmin && (
                                      <Badge className="bg-emerald-600/10 text-emerald-600 border-emerald-500/30 text-[8px] py-0 h-3.5 px-1 font-bold">
                                        Admin
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Admin Action Menu for Member */}
                              {isMyGroupAdmin && pId !== myUserId && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost" className="size-6 text-muted-foreground hover:text-foreground">
                                      <MoreVertical className="size-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="text-xs">
                                    <DropdownMenuItem
                                      onClick={() => handleToggleGroupAdminRole(pId, pName)}
                                      className="gap-2 cursor-pointer"
                                    >
                                      <Shield className="size-3.5 text-emerald-600" />
                                      <span>{isAdmin ? "Dismiss as Admin" : "Make Channel Admin"}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleRemoveMemberFromGroup(pId, pName)}
                                      className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                                    >
                                      <UserMinus className="size-3.5" />
                                      <span>Remove from Channel</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Direct Contact Personal Details Section */}
                  {!currentThread.isGroup && activeTargetEmp && (
                    <div className="space-y-3">
                      <h5 className="font-bold text-xs text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">
                        Personal & Department Details
                      </h5>
                      <div className="space-y-2 rounded-xl border p-3 bg-card divide-y divide-border/30">
                        <div className="flex items-center justify-between py-1.5 first:pt-0">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Mail className="size-3.5" /> Email
                          </span>
                          <span className="font-medium text-foreground truncate max-w-[160px]">{activeTargetEmp.email}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Building className="size-3.5" /> Department
                          </span>
                          <span className="font-medium text-foreground">{activeTargetEmp.department}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Briefcase className="size-3.5" /> Designation
                          </span>
                          <span className="font-medium text-foreground">{activeTargetEmp.role}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Phone className="size-3.5" /> Phone
                          </span>
                          <span className="font-medium text-foreground font-mono">{activeTargetEmp.phone}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 last:pb-0">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <UserCheck className="size-3.5" /> Employee ID
                          </span>
                          <span className="font-mono font-semibold text-foreground">{activeTargetEmp.employeeNumber}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shared Media & Documents Section */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-xs text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">
                      Shared Media & Files ({sharedMediaList.length + sharedDocumentsList.length})
                    </h5>
                    <div className="space-y-2">
                      {sharedMediaList.length === 0 && sharedDocumentsList.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground text-center py-4 bg-muted/20 rounded-lg">
                          No shared files or photos in this conversation.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {sharedMediaList.map((m) => (
                            <div
                              key={m.id}
                              onClick={() => setPreviewModalFile({ url: m.mediaUrl!, name: m.fileName || "Photo", type: "image" })}
                              className="p-2 rounded-lg border flex items-center justify-between hover:bg-muted/30 cursor-pointer"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <ImageIcon className="size-3.5 text-blue-500 shrink-0" />
                                <span className="truncate font-medium">{m.fileName || "Image"}</span>
                              </div>
                              <Download className="size-3 text-muted-foreground" />
                            </div>
                          ))}
                          {sharedDocumentsList.map((d) => (
                            <div
                              key={d.id}
                              onClick={() => setPreviewModalFile({ url: d.mediaUrl!, name: d.fileName || "Document", type: "file" })}
                              className="p-2 rounded-lg border flex items-center justify-between hover:bg-muted/30 cursor-pointer"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="size-3.5 text-emerald-500 shrink-0" />
                                <span className="truncate font-medium">{d.fileName || "File"}</span>
                              </div>
                              <Download className="size-3 text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CHANNEL DANGER ZONE (Leave / Delete) */}
                  {currentThread.isGroup && (
                    <div className="space-y-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLeaveGroupChannel(currentThread.id)}
                        className="w-full text-xs font-semibold gap-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                      >
                        <LogOut className="size-3.5" /> Leave Channel
                      </Button>
                      {isMyGroupAdmin && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteGroupChannel(currentThread.id)}
                          className="w-full text-xs font-semibold gap-1.5"
                        >
                          <Trash2 className="size-3.5" /> Delete Channel
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📞 REALTIME CALL SUITE & MEETING OVERLAYS */}
      {/* ========================================================================= */}

      {/* 1. OUTGOING CALL OVERLAY */}
      {activeCall.status === "outgoing" && (
        <Dialog open={true} onOpenChange={() => handleEndCall()}>
          <DialogContent className="sm:max-w-[400px] p-6 text-center bg-card shadow-2xl">
            <div className="py-6 flex flex-col items-center justify-center space-y-5">
              <div className="relative">
                <Avatar className="size-24 border-4 border-emerald-500 shadow-xl">
                  <AvatarImage src={activeCall.contactAvatar} />
                  <AvatarFallback className="bg-emerald-700 text-white font-bold text-2xl">
                    {getInitials(activeCall.contactName)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">{activeCall.contactName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{activeCall.contactRole || "Staff Colleague"}</p>
                <div className="flex items-center justify-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600">
                  <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Connecting...</span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setActiveCall((prev) => ({ ...prev, isMuted: !prev.isMuted }))}
                  className="size-11 rounded-full border"
                  title={activeCall.isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {activeCall.isMuted ? <MicOff className="size-5 text-rose-500" /> : <Mic className="size-5" />}
                </Button>

                <Button
                  size="icon"
                  onClick={handleEndCall}
                  className="size-12 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg"
                  title="Cancel Call"
                >
                  <PhoneOff className="size-5" />
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    setActiveCall((prev) => ({
                      ...prev,
                      mediaType: prev.mediaType === "voice" ? "video" : "voice",
                    }))
                  }
                  className="size-11 rounded-full border"
                  title="Switch Voice/Video"
                >
                  {activeCall.mediaType === "voice" ? <Video className="size-5 text-blue-600" /> : <Phone className="size-5 text-emerald-600" />}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 2. INCOMING CALL DIALOG */}
      {activeCall.status === "incoming" && (
        <Dialog open={true} onOpenChange={() => handleDeclineCall()}>
          <DialogContent className="sm:max-w-[400px] p-6 text-center bg-card shadow-2xl">
            <div className="py-6 flex flex-col items-center justify-center space-y-5">
              <Avatar className="size-24 border-4 border-emerald-500 shadow-xl">
                <AvatarImage src={activeCall.contactAvatar} />
                <AvatarFallback className="bg-emerald-700 text-white font-bold text-2xl">
                  {getInitials(activeCall.contactName)}
                </AvatarFallback>
              </Avatar>

              <div>
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold mb-1">
                  Incoming {activeCall.mediaType === "video" ? "Video Call" : "Voice Call"}
                </Badge>
                <h3 className="text-xl font-bold text-foreground">{activeCall.contactName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{activeCall.contactRole || "Colleague"}</p>
              </div>

              <div className="flex items-center justify-center gap-4 pt-2">
                <Button
                  size="lg"
                  onClick={() => handleAcceptCall("voice")}
                  className="size-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                  title="Accept Voice Call"
                >
                  <Phone className="size-5" />
                </Button>
                <Button
                  size="lg"
                  onClick={() => handleAcceptCall("video")}
                  className="size-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                  title="Accept Video Call"
                >
                  <Video className="size-5" />
                </Button>
                <Button
                  size="lg"
                  onClick={handleDeclineCall}
                  className="size-12 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg"
                  title="Decline"
                >
                  <PhoneOff className="size-5" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 3. CONNECTED VOICE CALL ROOM */}
      {activeCall.status === "connected" && activeCall.mediaType === "voice" && (
        <Dialog open={true} onOpenChange={() => handleEndCall()}>
          <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border shadow-2xl">
            {/* Top Bar */}
            <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="size-10 border">
                  <AvatarImage src={activeCall.contactAvatar} />
                  <AvatarFallback className="bg-emerald-700 text-white font-bold text-xs">
                    {getInitials(activeCall.contactName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">{activeCall.contactName}</h4>
                  <p className="text-[11px] text-muted-foreground">Connected Voice Call</p>
                </div>
              </div>

              <Badge variant="outline" className="text-xs font-mono font-bold text-emerald-600">
                ⏱️ {formatCallDuration(activeCall.durationSeconds)}
              </Badge>
            </div>

            {/* Body */}
            <div className="py-10 px-6 flex flex-col items-center justify-center text-center space-y-4 bg-background">
              <Avatar className="size-28 border-4 border-emerald-500 shadow-xl">
                <AvatarImage src={activeCall.contactAvatar} />
                <AvatarFallback className="bg-emerald-700 text-white font-bold text-3xl">
                  {getInitials(activeCall.contactName)}
                </AvatarFallback>
              </Avatar>

              <div>
                <h3 className="text-lg font-bold text-foreground">{activeCall.contactName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{activeCall.contactRole || "Staff Colleague"}</p>
              </div>
            </div>

            {/* Footer Control Bar */}
            <div className="p-3.5 bg-muted/40 border-t flex items-center justify-center gap-3">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setActiveCall((prev) => ({ ...prev, mediaType: "video" }))}
                className="size-10 rounded-full border bg-background text-blue-600"
                title="Switch to Video"
              >
                <Video className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setActiveCall((prev) => ({ ...prev, isMuted: !prev.isMuted }))}
                className="size-10 rounded-full border bg-background"
                title={activeCall.isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {activeCall.isMuted ? <MicOff className="size-4 text-rose-500" /> : <Mic className="size-4" />}
              </Button>
              <Button
                size="icon"
                onClick={handleEndCall}
                className="size-11 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md"
                title="End Call"
              >
                <PhoneOff className="size-5" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setActiveCall((prev) => ({ ...prev, isSpeakerOn: !prev.isSpeakerOn }))}
                className="size-10 rounded-full border bg-background"
                title={activeCall.isSpeakerOn ? "Mute Speaker" : "Speaker On"}
              >
                {activeCall.isSpeakerOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 4. CONNECTED VIDEO CALL ROOM & PRESENTATION ENGINE */}
      {activeCall.status === "connected" && activeCall.mediaType === "video" && (
        <Dialog open={true} onOpenChange={() => handleEndCall()}>
          <DialogContent
            className={`${
              activeCall.isFullScreen ? "max-w-[98vw] h-[95vh]" : "sm:max-w-5xl h-[84vh]"
            } p-0 flex flex-col overflow-hidden bg-slate-950 text-white border-slate-800 shadow-2xl transition-all duration-200`}
          >
            {/* Top Bar */}
            <div className="p-3 px-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 z-20">
              <div className="flex items-center gap-3">
                <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <span>{activeCall.contactName}</span>
                  {activeCall.isRecording && (
                    <Badge className="bg-rose-600 text-white text-[10px] font-mono px-2 py-0 animate-pulse">
                      ● REC {formatCallDuration(activeCall.recordingSeconds)}
                    </Badge>
                  )}
                </h4>
              </div>

              <div className="flex items-center gap-2.5">
                <Badge className="bg-slate-800 text-emerald-400 border-slate-700 font-mono text-xs font-semibold px-2.5 py-1">
                  ⏱️ {formatCallDuration(activeCall.durationSeconds)}
                </Badge>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveCall((prev) => ({ ...prev, showMoM: !prev.showMoM }))}
                  className={`h-7 text-xs font-semibold gap-1 bg-slate-800 text-slate-200 border-slate-700 ${activeCall.showMoM ? "bg-emerald-700 text-white" : ""}`}
                >
                  <FileCheck className="size-3.5" /> MoM Notes
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setActiveCall((prev) => ({ ...prev, isFullScreen: !prev.isFullScreen }))}
                  className="size-7 text-slate-300 hover:text-white"
                >
                  {activeCall.isFullScreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                </Button>
              </div>
            </div>

            {/* Video Main Body Stage */}
            <div className="flex-1 flex overflow-hidden min-h-0 relative">
              <div className="flex-1 relative flex items-center justify-center bg-slate-900 overflow-hidden">
                {/* Real Screen Share Video Element */}
                {activeCall.isScreenSharing ? (
                  <div className="w-full h-full relative flex items-center justify-center bg-black">
                    <video
                      ref={screenShareVideoRef}
                      autoPlay
                      playsInline
                      className="max-w-full max-h-full object-contain"
                    />
                    <div className="absolute top-3 left-3 bg-slate-900/80 px-2.5 py-1 rounded text-xs font-semibold text-emerald-400 border border-slate-800">
                      Screen Presentation Active
                    </div>
                  </div>
                ) : (
                  /* Remote Participant Video Canvas */
                  <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-tr from-slate-950 to-slate-900">
                    <div className="text-center space-y-3">
                      <Avatar className="size-32 border-4 border-emerald-500/80 shadow-2xl mx-auto">
                        <AvatarImage src={activeCall.contactAvatar} />
                        <AvatarFallback className="bg-emerald-800 text-white font-bold text-4xl">
                          {getInitials(activeCall.contactName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-bold text-white">{activeCall.contactName}</h3>
                        <p className="text-xs text-slate-400">{activeCall.contactRole || "Staff Member"}</p>
                      </div>
                    </div>

                    <div className="absolute bottom-4 left-4 flex items-center gap-2 p-1.5 px-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                      <span className="font-bold text-white">{activeCall.contactName}</span>
                    </div>
                  </div>
                )}

                {/* Local Picture-in-Picture Camera Stream */}
                <div className="absolute bottom-4 right-4 size-36 sm:size-44 rounded-xl border-2 border-emerald-500 bg-slate-950 shadow-2xl overflow-hidden z-20">
                  {activeCall.isVideoOff ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-xs">
                      <VideoOff className="size-5 text-rose-400 mb-1" />
                      <span className="text-[10px]">Camera Off</span>
                    </div>
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-1 left-1 bg-black/70 text-[9px] px-1.5 py-0.5 rounded text-white">
                    You {activeCall.isMuted && "(Muted)"}
                  </div>
                </div>
              </div>

              {/* MoM (Minutes of Meeting) Side Panel */}
              {activeCall.showMoM && (
                <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20">
                  <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                    <h5 className="font-bold text-xs text-white flex items-center gap-1.5">
                      <FileCheck className="size-4 text-emerald-400" /> Minutes of Meeting (MoM)
                    </h5>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setActiveCall((prev) => ({ ...prev, showMoM: false }))}
                      className="size-6 text-slate-400 hover:text-white"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-300">Key Discussion Points</Label>
                      <textarea
                        rows={3}
                        value={activeCall.momDiscussionPoints}
                        onChange={(e) => setActiveCall((prev) => ({ ...prev, momDiscussionPoints: e.target.value }))}
                        placeholder="Log sprint decisions, architecture points..."
                        className="w-full mt-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-300">Decisions Taken</Label>
                      <textarea
                        rows={2}
                        value={activeCall.momDecisions}
                        onChange={(e) => setActiveCall((prev) => ({ ...prev, momDecisions: e.target.value }))}
                        placeholder="Approved items & conclusions..."
                        className="w-full mt-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-300">Action Items & Owners</Label>
                      <textarea
                        rows={3}
                        value={activeCall.momActionItems}
                        onChange={(e) => setActiveCall((prev) => ({ ...prev, momActionItems: e.target.value }))}
                        placeholder="1. Design review by John (Due Friday)..."
                        className="w-full mt-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="p-3 border-t border-slate-800">
                    <Button
                      size="sm"
                      onClick={handleExportMoM}
                      className="w-full h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                      <Download className="size-3.5" /> Export MoM Summary
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Floating Control Bar */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-center shrink-0 z-30">
              <div className="flex items-center gap-2.5 bg-slate-950 p-1.5 px-4 rounded-full border border-slate-800 shadow-xl">
                {/* Mute Mic */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setActiveCall((prev) => ({ ...prev, isMuted: !prev.isMuted }))}
                  className={`size-10 rounded-full ${
                    activeCall.isMuted ? "bg-rose-500/20 text-rose-400" : "bg-slate-800 text-slate-200"
                  }`}
                  title={activeCall.isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {activeCall.isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </Button>

                {/* Camera Toggle */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setActiveCall((prev) => ({ ...prev, isVideoOff: !prev.isVideoOff }))}
                  className={`size-10 rounded-full ${
                    activeCall.isVideoOff ? "bg-rose-500/20 text-rose-400" : "bg-slate-800 text-slate-200"
                  }`}
                  title={activeCall.isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  {activeCall.isVideoOff ? <VideoOff className="size-4" /> : <Video className="size-4" />}
                </Button>

                {/* End Call */}
                <Button
                  size="icon"
                  onClick={handleEndCall}
                  className="size-11 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg mx-1"
                  title="End Call"
                >
                  <PhoneOff className="size-5" />
                </Button>

                {/* Screen Share */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    const next = !activeCall.isScreenSharing;
                    setActiveCall((prev) => ({ ...prev, isScreenSharing: next }));
                    toast.info(next ? "Screen sharing started" : "Screen sharing stopped");
                  }}
                  className={`size-10 rounded-full ${
                    activeCall.isScreenSharing ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-200"
                  }`}
                  title={activeCall.isScreenSharing ? "Stop Sharing" : "Present Screen"}
                >
                  <MonitorUp className="size-4" />
                </Button>

                {/* Record Meeting */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleToggleRecording}
                  className={`size-10 rounded-full ${
                    activeCall.isRecording ? "bg-rose-600 text-white animate-pulse" : "bg-slate-800 text-slate-200"
                  }`}
                  title={activeCall.isRecording ? "Stop Recording" : "Record Meeting"}
                >
                  <Disc className="size-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 5. SCHEDULE MEETING MODAL */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Calendar className="size-5 text-emerald-600" /> Schedule Team Meeting
            </DialogTitle>
            <DialogDescription className="text-xs">
              Plan upcoming meetings and conference sessions with staff colleagues.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Meeting Title</Label>
              <Input
                placeholder="e.g. Sprint Architecture Sync"
                value={meetingForm.title}
                onChange={(e) => setMeetingForm((prev) => ({ ...prev, title: e.target.value }))}
                className="h-8 text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold">Date</Label>
                <Input
                  type="date"
                  value={meetingForm.date}
                  onChange={(e) => setMeetingForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Start Time</Label>
                <Input
                  type="time"
                  value={meetingForm.startTime}
                  onChange={(e) => setMeetingForm((prev) => ({ ...prev, startTime: e.target.value }))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">End Time</Label>
                <Input
                  type="time"
                  value={meetingForm.endTime}
                  onChange={(e) => setMeetingForm((prev) => ({ ...prev, endTime: e.target.value }))}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Meeting Type</Label>
              <div className="flex items-center gap-3 mt-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="mType"
                    checked={meetingForm.meetingType === "video"}
                    onChange={() => setMeetingForm((prev) => ({ ...prev, meetingType: "video" }))}
                  />
                  <span>Video Conference</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="mType"
                    checked={meetingForm.meetingType === "voice"}
                    onChange={() => setMeetingForm((prev) => ({ ...prev, meetingType: "voice" }))}
                  />
                  <span>Voice Conference</span>
                </label>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Agenda / Description</Label>
              <textarea
                rows={3}
                placeholder="Meeting agenda items and preparation notes..."
                value={meetingForm.agenda}
                onChange={(e) => setMeetingForm((prev) => ({ ...prev, agenda: e.target.value }))}
                className="w-full mt-1 p-2 rounded-lg border bg-background text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex justify-between">
            <Button size="sm" variant="outline" onClick={() => setIsScheduleModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateScheduledMeeting}
              disabled={!meetingForm.title.trim()}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirm Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. START CALL / QUICK DIAL MODAL */}
      <Dialog open={isNewCallModalOpen} onOpenChange={setIsNewCallModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <PhoneCall className="size-5 text-emerald-600" /> Start VoIP or Video Call
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select any registered colleague from the organization database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search staff by name or designation..."
                value={callSearchQuery}
                onChange={(e) => setCallSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <div className="max-h-56 overflow-y-auto border rounded-xl divide-y bg-card">
              {employeesList
                .filter(
                  (e) =>
                    !callSearchQuery ||
                    e.full_name.toLowerCase().includes(callSearchQuery.toLowerCase()) ||
                    e.role.toLowerCase().includes(callSearchQuery.toLowerCase()),
                )
                .map((emp) => (
                  <div key={emp.id} className="p-2.5 flex items-center justify-between hover:bg-muted/20 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="size-8 border">
                        <AvatarImage src={emp.avatar_url} />
                        <AvatarFallback className="text-[10px] font-bold">{getInitials(emp.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs truncate text-foreground">{emp.full_name}</div>
                        <span className="text-[10px] text-muted-foreground font-mono block truncate">{emp.role}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartCall("voice", emp.full_name, emp.avatar_url, emp.role, emp.id, emp.email, emp.phone)}
                        className="h-7 text-xs font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 gap-1"
                      >
                        <Phone className="size-3" /> Voice
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartCall("video", emp.full_name, emp.avatar_url, emp.role, emp.id, emp.email, emp.phone)}
                        className="h-7 text-xs font-semibold text-blue-600 border-blue-500/30 hover:bg-blue-50 gap-1"
                      >
                        <Video className="size-3" /> Video
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => setIsNewCallModalOpen(false)} className="text-xs">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. IN-PAGE FILE / IMAGE PREVIEW MODAL */}
      {previewModalFile && (
        <Dialog open={!!previewModalFile} onOpenChange={(open) => !open && setPreviewModalFile(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-4">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 space-y-0">
              <DialogTitle className="text-sm font-bold flex items-center gap-2 truncate pr-4">
                <FileText className="size-4 text-emerald-600 shrink-0" />
                <span className="truncate">{previewModalFile.name}</span>
              </DialogTitle>
              <a
                href={previewModalFile.url}
                download={previewModalFile.name}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                <Download className="size-3.5" /> Download
              </a>
            </DialogHeader>

            <div className="flex-1 overflow-auto flex items-center justify-center p-2 min-h-[40vh] bg-muted/20 rounded-xl border mt-3">
              {previewModalFile.type === "image" ? (
                <img
                  src={previewModalFile.url}
                  alt={previewModalFile.name}
                  className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div className="p-8 text-center space-y-3">
                  <FileText className="size-14 mx-auto text-emerald-600 opacity-60" />
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{previewModalFile.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">Ready for download.</p>
                  </div>
                  <a
                    href={previewModalFile.url}
                    download={previewModalFile.name}
                    className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-semibold bg-emerald-600 text-white rounded-lg"
                  >
                    <Download className="size-3.5" /> Download Document
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 8. CREATE GROUP CHANNEL MODAL */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <FolderPlus className="size-5 text-emerald-600" /> Create Department Channel
            </DialogTitle>
            <DialogDescription className="text-xs">
              Collaborate across departments with multi-member channels and administrative controls.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Channel Name *</Label>
              <Input
                placeholder="e.g. Engineering & Architecture"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Channel Description / Topic (Optional)</Label>
              <Input
                placeholder="e.g. Daily sprint standup, design reviews & releases"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
              <div>
                <p className="font-semibold text-xs text-foreground">Only Admins Can Post</p>
                <p className="text-[10px] text-muted-foreground">Broadcast-only announcements channel</p>
              </div>
              <Switch
                checked={onlyAdminsCanSend}
                onCheckedChange={setOnlyAdminsCanSend}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-semibold">
                  Select Members ({selectedGroupMembers.length} selected)
                </Label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedGroupMembers(employeesList.map((e) => e.id))}
                    className="text-emerald-600 hover:underline font-semibold"
                  >
                    Select All
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setSelectedGroupMembers([])}
                    className="text-muted-foreground hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search colleagues to add..."
                  value={groupMemberSearch}
                  onChange={(e) => setGroupMemberSearch(e.target.value)}
                  className="pl-8 h-7 text-xs bg-muted/30"
                />
              </div>

              <div className="max-h-48 overflow-y-auto border rounded-xl divide-y bg-card">
                {employeesList.length === 0 ? (
                  <p className="p-4 text-center text-muted-foreground text-xs">No employees found in database.</p>
                ) : (
                  employeesList
                    .filter(
                      (emp) =>
                        !groupMemberSearch ||
                        emp.full_name.toLowerCase().includes(groupMemberSearch.toLowerCase()) ||
                        emp.role.toLowerCase().includes(groupMemberSearch.toLowerCase()),
                    )
                    .map((emp) => {
                      const isChecked = selectedGroupMembers.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() =>
                            setSelectedGroupMembers((prev) =>
                              isChecked ? prev.filter((id) => id !== emp.id) : [...prev, emp.id],
                            )
                          }
                          className="p-2 flex items-center justify-between hover:bg-muted/30 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Avatar className="size-7 border shrink-0">
                              <AvatarImage src={emp.avatar_url} />
                              <AvatarFallback className="text-[10px] font-bold">
                                {getInitials(emp.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-xs truncate text-foreground">{emp.full_name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{emp.role}</p>
                            </div>
                          </div>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              setSelectedGroupMembers((prev) =>
                                checked ? Array.from(new Set([...prev, emp.id])) : prev.filter((id) => id !== emp.id),
                              );
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      );
                    })
                )}
              </div>
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
              Create Channel ({selectedGroupMembers.length + 1} Members)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. ADD MEMBERS TO CHANNEL MODAL */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <UserPlus className="size-5 text-emerald-600" /> Add Members to Channel
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select team members to join {currentThread?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search colleagues to invite..."
                value={addMemberSearch}
                onChange={(e) => setAddMemberSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/30"
              />
            </div>

            <div className="max-h-56 overflow-y-auto border rounded-xl divide-y bg-card">
              {employeesList
                .filter((emp) => !(currentThread?.participantIds || []).includes(emp.id))
                .filter(
                  (emp) =>
                    !addMemberSearch ||
                    emp.full_name.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
                    emp.role.toLowerCase().includes(addMemberSearch.toLowerCase()),
                ).length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  All eligible colleagues are already members of this channel.
                </div>
              ) : (
                employeesList
                  .filter((emp) => !(currentThread?.participantIds || []).includes(emp.id))
                  .filter(
                    (emp) =>
                      !addMemberSearch ||
                      emp.full_name.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
                      emp.role.toLowerCase().includes(addMemberSearch.toLowerCase()),
                  )
                  .map((emp) => {
                    const isChecked = selectedAddMembers.includes(emp.id);
                    return (
                      <div
                        key={emp.id}
                        onClick={() =>
                          setSelectedAddMembers((prev) =>
                            isChecked ? prev.filter((id) => id !== emp.id) : [...prev, emp.id],
                          )
                        }
                        className="p-2.5 flex items-center justify-between hover:bg-muted/30 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Avatar className="size-8 border shrink-0">
                            <AvatarImage src={emp.avatar_url} />
                            <AvatarFallback className="text-[10px] font-bold">
                              {getInitials(emp.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs truncate text-foreground">{emp.full_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{emp.role}</p>
                          </div>
                        </div>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            setSelectedAddMembers((prev) =>
                              checked ? Array.from(new Set([...prev, emp.id])) : prev.filter((id) => id !== emp.id),
                            );
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex justify-between">
            <Button size="sm" variant="outline" onClick={() => setIsAddMemberOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleAddMembersToCurrentGroup(selectedAddMembers)}
              disabled={selectedAddMembers.length === 0}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Add {selectedAddMembers.length} Member(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlanGuard>
  );
}
