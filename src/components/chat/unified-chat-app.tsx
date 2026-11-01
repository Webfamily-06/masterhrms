"use client";

/**
 * UNIFIED CHAT & CALLING MODULE
 *
 * ARCHITECTURE BOUNDARIES & CAPABILITIES:
 * 1. WebRTC 1-to-1 Calling: Real-time peer-to-peer audio and video calling powered
 *    by RTCPeerConnection with STUN candidate discovery.
 * 2. Multi-Transport Realtime:
 *    - Socket.IO: Primary in-app transport for low-latency chat messaging, presence,
 *      and WebRTC signaling (offers, answers, ICE candidates).
 *    - Pusher: High-availability secondary/fallback transport for call invitations,
 *      missed calls, background notifications, and offline event delivery.
 * 3. Group Calling Architecture:
 *    - One-to-one calls use peer-to-peer WebRTC.
 *    - Multi-party meetings use LiveKit SFU when server-side LiveKit credentials are
 *      configured. Without them, the UI stays in a clearly labeled local preview mode.
 * 4. NAT Traversal & Production Relay:
 *    - STUN (stun:stun.l.google.com:19302) resolves public IP mapping for direct P2P.
 *    - Symmetric NAT/strict enterprise firewalls require TURN relay servers (e.g., Coturn,
 *      Twilio Network Traversal, or Cloudflare Calls).
 * 5. Mobile Picture-in-Picture (PiP):
 *    - Handled via HTML5 Video element requestPictureInPicture API where supported by
 *      mobile browsers; full OS-level background PiP requires native React Native / Swift / Kotlin wrappers.
 */

export function cleanPersonName(name: string): string {
  if (!name) return "User";
  return name
    .replace(/\s*\([^)]*(admin|administrator|manager|employee|owner|leader|supervisor|tester|user|staff|hr)[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanSystemEventContent(content: string): string {
  if (!content) return "";
  return content
    .replace(/\s*\([^)]*(admin|administrator|manager|employee|owner|leader|supervisor|tester|user|staff|hr)[^)]*\)/gi, "")
    .replace(/\s*\(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\)/gi, "")
    .replace(/\s*\.\s*$/, "")
    .trim();
}


import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getSocketClient } from "@/lib/socket";
import { useSession } from "@/lib/session";
import { useIncomingCall } from "@/context/incoming-call-context";
import {
  MultiParticipantMeetingDialog,
  IncomingGroupMeetingDialog,
  type ActiveMeetingState,
  type MeetingParticipant,
  type SfuDiagnosticInfo,
} from "./multi-participant-meeting-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Settings,
  Plus,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Camera,
  FlipHorizontal,
  ScreenShare,
  Info as InfoIcon,
  MoreVertical,
  Paperclip,
  Send,
  Smile,
  SmilePlus,
  ChevronDown,
  UserPlus,
  Users,
  MessageSquare,
  User,
  Calendar,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Filter,
  Check,
  CheckCheck,
  Download,
  Trash2,
  X,
  AlertCircle,
  RefreshCw,
  RotateCw,
  Mail,
  Building,
  Briefcase,
  FileText,
  Eye,
  Clock,
  Pin,
  CornerUpLeft,
  Share2,
  BarChart2,
  Edit3,
  Copy,
  ThumbsUp,
  Heart,
  Play,
  Pause,
  Volume2,
  File as FileIcon,
  ExternalLink,
  HelpCircle,
  Square,
  CheckSquare,
  Bell,
  BellOff,
  LogOut,
  Shield,
  UserMinus,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  Upload,
  FolderOpen,
  RotateCcw,
  Ban,
  ArrowDown,
  Maximize2,
  Minimize2,
  Signal,
  Sliders,
  VolumeX,
  Radio,
  Tv,
  Lock as LockIcon,
  PhoneForwarded,
  Activity,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MediaPickerModal, MediaFileItem } from "@/components/media/media-picker-modal";
import { EmojiPicker } from "./emoji-picker";

export type ChatMode = "chats" | "groups" | "contacts" | "calls";

export interface ChatMessageAttachment {
  id?: string;
  name: string;
  originalName?: string;
  size: number;
  mimeType: string;
  url: string;
  path?: string;
  folder?: string;
}

export type AttachmentSendState =
  | "selected"
  | "uploading"
  | "uploaded"
  | "sending"
  | "sent"
  | "delivered"
  | "seen"
  | "failed";

export interface ComposerAttachmentItem {
  id: string;
  file?: File;
  mediaFile?: MediaFileItem;
  name: string;
  size: number;
  mimeType: string;
  previewUrl?: string;
  isUploaded?: boolean;
  uploadProgress?: number;
  state?: AttachmentSendState;
  error?: string;
  serverUrl?: string;
  mediaId?: string;
}

export interface ChatMessageUrlPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export interface ChatMessageVoiceNote {
  url: string;
  durationSeconds: number;
  size?: number;
}

export interface ChatMessagePollOption {
  id: string;
  text: string;
  votes: string[];
}

export interface ChatMessagePoll {
  question: string;
  options: ChatMessagePollOption[];
  isClosed?: boolean;
  allowMultiple?: boolean;
  isMultiSelect?: boolean;
  createdAt?: string;
}

export interface ChatMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  content: string;
  types?: "sent" | "received";
  time?: string;
  createdAt?: string;
  status?: "pending" | "sent" | "delivered" | "read" | "failed";
  deliveryStatus?: "sent" | "delivered" | "seen";
  isOptimistic?: boolean;
  clientTempId?: string;
  isSystemEvent?: boolean;
  eventType?: string;
  eventMetadata?: any;
  mentions?: string[];
  attachments?: ChatMessageAttachment[];
  replyToId?: string;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  } | null;
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedById?: string;
  isEdited?: boolean;
  editedAt?: string;
  isDeletedForEveryone?: boolean;
  isForwarded?: boolean;
  forwardedFromSender?: string | null;
  reactions?: Record<string, string[]>;
  urlPreviews?: ChatMessageUrlPreview[];
  voiceNote?: ChatMessageVoiceNote;
  poll?: ChatMessagePoll;
}

export interface ConversationSummaryItem {
  threadId: string;
  type: "direct" | "group";
  title: string;
  avatarUrl?: string | null;
  avatarLetter: string;
  avatarColor: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status?: "online" | "offline";
  otherParticipantId?: string;
  groupId?: string;
  isPinned?: boolean;
  isMuted?: boolean;
  ownerId?: string;
}

export interface ContactItem {
  id: string;
  userId?: string;
  employeeId?: string | null;
  name: string;
  avatarLetter: string;
  avatarColor: string;
  avatarUrl?: string | null;
  status: "online" | "offline";
  statusText?: string;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  unreadCount?: number;
  lastMessage?: string;
  time?: string | null;
}

export interface ParticipantProfile {
  id: string;
  userId?: string;
  employeeId?: string | null;
  employeeCode?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  designation?: string;
  avatarUrl?: string | null;
  status?: "online" | "offline";
  statusText?: string;
  employmentType?: string | null;
  joinedAt?: string | null;
  bio?: string | null;
}

export interface GroupItem {
  id: string;
  name: string;
  description?: string;
  avatarLetter: string;
  avatarColor: string;
  avatarUrl?: string | null;
  memberCount: number;
  ownerId?: string;
  isPinned?: boolean;
  isMuted?: boolean;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
    department?: string | null;
    designation?: string;
    isMuted?: boolean;
  }>;
  createdById: string;
  lastMessage?: string;
  lastMessageSender?: string;
  time?: string;
  unreadCount?: number;
}

export interface ReactionParticipant {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface NormalizedReaction {
  emoji: string;
  count: number;
  userIds: string[];
  users: ReactionParticipant[];
  hasReacted: boolean;
}

export function normalizeReactions(reactions: any, currentUserId?: string): NormalizedReaction[] {
  if (!reactions) return [];
  if (Array.isArray(reactions)) {
    return reactions
      .filter((r) => r && typeof r.emoji === "string")
      .map((r) => {
        const uids: string[] = Array.isArray(r.userIds) ? r.userIds : [];
        const rawUsers: any[] = Array.isArray(r.users) ? r.users : [];
        const users: ReactionParticipant[] = rawUsers.map((u) => ({
          userId: u.userId || u.id || "",
          fullName: u.fullName || u.name || "Colleague",
          avatarUrl: u.avatarUrl || null,
        }));
        return {
          emoji: r.emoji,
          count: uids.length || (typeof r.count === "number" ? r.count : users.length),
          userIds: uids,
          users,
          hasReacted: Boolean(currentUserId && uids.includes(currentUserId)),
        };
      })
      .filter((r) => r.count > 0);
  }
  if (typeof reactions === "object") {
    const list: NormalizedReaction[] = [];
    for (const [key, val] of Object.entries(reactions)) {
      if (!val) continue;
      if (typeof val === "object" && val !== null && "emoji" in val) {
        const r = val as any;
        const uids: string[] = Array.isArray(r.userIds) ? r.userIds : [];
        const rawUsers: any[] = Array.isArray(r.users) ? r.users : [];
        list.push({
          emoji: r.emoji,
          count: uids.length || (typeof r.count === "number" ? r.count : 0),
          userIds: uids,
          users: rawUsers,
          hasReacted: Boolean(currentUserId && uids.includes(currentUserId)),
        });
      } else if (Array.isArray(val)) {
        list.push({
          emoji: key,
          count: val.length,
          userIds: val,
          users: [],
          hasReacted: Boolean(currentUserId && val.includes(currentUserId)),
        });
      } else if (typeof val === "number") {
        list.push({
          emoji: key,
          count: val,
          userIds: [],
          users: [],
          hasReacted: false,
        });
      }
    }
    return list.filter((r) => r.count > 0);
  }
  return [];
}

// Consistent date separator helper: Today, Yesterday, or DD/MM/YYYY
export function getDateGroupLabel(dateString?: string | null): string {
  if (!dateString) return "Today";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Today";
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) return "Today";

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();
    if (isYesterday) return "Yesterday";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "Today";
  }
}

// Format raw server message into ChatMessageItem
export function formatMessageItem(m: any, currentUserId: string): ChatMessageItem {
  const isDeleted = Boolean(m.isDeletedForEveryone);
  const rawPoll = typeof m.poll === "string" ? JSON.parse(m.poll) : m.poll;
  const rawReactions = typeof m.reactions === "string" ? JSON.parse(m.reactions) : m.reactions;
  const rawAttachments = typeof m.attachments === "string" ? JSON.parse(m.attachments) : m.attachments;
  const rawVoiceNote = typeof m.voiceNote === "string" ? JSON.parse(m.voiceNote) : m.voiceNote;

  return {
    id: m.id,
    senderId: m.senderId,
    senderName: m.senderName || "User",
    senderAvatar: m.senderAvatar || m.senderAvatarUrl || m.avatarUrl || null,
    content: isDeleted ? "This message was deleted" : (m.content || ""),
    types: m.senderId === currentUserId ? "sent" : "received",
    time: m.createdAt
      ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "Now",
    createdAt: m.createdAt,
    status: m.deliveryStatus || m.status || "delivered",
    deliveryStatus: m.deliveryStatus || (m.status === "read" ? "seen" : "delivered"),
    clientTempId: m.clientTempId,
    isSystemEvent: m.isSystemEvent || false,
    eventType: m.eventType,
    eventMetadata: m.eventMetadata,
    mentions: m.mentions,
    attachments: isDeleted ? [] : (rawAttachments || []),
    replyToId: m.replyToId,
    replyTo: m.replyTo,
    isPinned: m.isPinned || false,
    pinnedAt: m.pinnedAt,
    pinnedById: m.pinnedById,
    isEdited: m.isEdited || false,
    editedAt: m.editedAt,
    isDeletedForEveryone: isDeleted,
    isForwarded: Boolean(m.isForwarded || m.eventMetadata?.isForwarded || m.replyTo?.isForwarded),
    forwardedFromSender: m.forwardedFromSender || m.eventMetadata?.forwardedFromSender || null,
    reactions: isDeleted ? {} : (rawReactions || {}),
    urlPreviews: isDeleted ? [] : (m.urlPreviews || []),
    voiceNote: isDeleted ? undefined : rawVoiceNote,
    poll: isDeleted ? undefined : rawPoll,
  };
}

export interface CallLogItem {
  id: string;
  callSessionId?: string | null;
  callerId?: string | null;
  receiverId?: string | null;
  callerName: string;
  callerEmail?: string | null;
  callerPhone: string;
  callerAvatarUrl?: string | null;
  receiverName?: string | null;
  receiverAvatarUrl?: string | null;
  callType: string;
  direction?: "incoming" | "outgoing" | string;
  status: "completed" | "missed" | "rejected" | "cancelled" | "failed" | string;
  durationSeconds: number;
  callTime: string;
  startedAt?: string | null;
  endedAt?: string | null;
  notes?: string | null;
  contactName?: string;
  contactAvatarUrl?: string | null;
  otherUserId?: string;
  computedDirection?: "incoming" | "outgoing" | string;
  totalCalls?: number;
  avgCallSeconds?: number;
  avgWaitSeconds?: number;
}

interface UnifiedChatAppProps {
  initialMode?: ChatMode;
  workspacePrefix?: string;
  onModeChange?: (mode: ChatMode) => void;
}

function getAvatarColor(_name: string): string {
  return "bg-primary text-primary-foreground";
}

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function fmtCallDate(d: string | null | undefined) {
  if (!d) return "-";
  try {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(d);
  }
}

function formatFileSize(bytes: number) {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT INLINE VOICE NOTE PLAYER
// ─────────────────────────────────────────────────────────────────────────────
function VoiceNotePlayer({ voiceNote }: { voiceNote: ChatMessageVoiceNote }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(voiceNote.durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => toast.error("Could not play audio message"));
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const effectiveDuration = duration || voiceNote.durationSeconds || 1;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekTime = pct * effectiveDuration;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const effectiveDuration = duration || voiceNote.durationSeconds || 0;

  return (
    <div data-testid="voice-note-player" className="flex items-center gap-2.5 py-1 min-w-[210px] select-none">
      <audio
        ref={audioRef}
        src={voiceNote.url}
        preload="metadata"
        onLoadedMetadata={() => {
          if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
            setDuration(Math.round(audioRef.current.duration));
          }
        }}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => {
          setIsPlaying(false);
        }}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={togglePlay}
        className="size-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary flex-shrink-0"
      >
        {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-current ml-0.5" />}
      </Button>
      <div className="flex-1 space-y-1 min-w-0">
        <div
          onClick={handleSeek}
          className="h-2 w-full bg-muted-foreground/20 rounded-full overflow-hidden cursor-pointer relative group/scrub"
          title="Click to seek"
        >
          <div
            className="h-full bg-primary dark:bg-primary/20 transition-all duration-100"
            style={{
              width: `${
                effectiveDuration > 0
                  ? (currentTime / effectiveDuration) * 100
                  : 0
              }%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span>{formatDuration(Math.floor(currentTime))}</span>
          <div className="flex items-center gap-1.5">
            <span>{formatDuration(effectiveDuration)}</span>
            <button
              type="button"
              onClick={cycleSpeed}
              className="text-[9px] px-1 py-0.2 rounded bg-muted/60 hover:bg-muted font-sans font-semibold text-foreground/80 cursor-pointer"
              title="Playback speed"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN UNIFIED CHAT APP
// ─────────────────────────────────────────────────────────────────────────────
export function UnifiedChatApp({
  initialMode = "chats",
  workspacePrefix,
  onModeChange,
}: UnifiedChatAppProps) {
  const queryClient = useQueryClient();
  const session = useSession();
  const currentUser = session?.user;
  const currentUserId = currentUser?.id || "";

  // Active chat mode: personal chats, groups, directory contacts, or call logs
  const [mode, setMode] = useState<ChatMode>(initialMode);
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleModeSelect = (newMode: ChatMode) => {
    setMode(newMode);
    if (newMode === "calls") setMobilePane("chat");
    if (newMode === "chats" || newMode === "groups" || newMode === "contacts") setMobilePane("list");
    onModeChange?.(newMode);
    if (workspacePrefix && typeof window !== "undefined") {
      const target =
        newMode === "chats"
          ? `${workspacePrefix}/chat`
          : newMode === "groups"
          ? `${workspacePrefix}/chat/groups`
          : newMode === "contacts"
          ? `${workspacePrefix}/chat/contacts`
          : `${workspacePrefix}/chat/calls`;
      if (window.location.pathname !== target) {
        window.history.pushState({}, "", target);
      }
    }
  };

  // UI state
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [activeThreadTitle, setActiveThreadTitle] = useState<string>("");
  const [activeThreadType, setActiveThreadType] = useState<"direct" | "group">("direct");
  const [activeTargetUserId, setActiveTargetUserId] = useState<string>("");
  const [activeGroupId, setActiveGroupId] = useState<string>("");
  const { isPushSupported, isSubscribedToPush, enablePushNotifications, pushPermission } = useIncomingCall();
  const [pushBannerDismissed, setPushBannerDismissed] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterFilter, setFilterFilter] = useState<"all" | "unread">("all");
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  // Small screens intentionally show one workspace pane at a time, matching
  // the familiar chat-list → conversation → details flow.
  const [mobilePane, setMobilePane] = useState<"list" | "chat" | "details">("list");
  const [infoTab, setInfoTab] = useState<"info" | "members" | "activity" | "files">("info");
  const [sharedFilesSearch, setSharedFilesSearch] = useState("");

  // Pagination & Cursor infinite scroll state
  const [olderMessages, setOlderMessages] = useState<ChatMessageItem[]>([]);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // In-conversation search state
  const [inThreadSearchOpen, setInThreadSearchOpen] = useState(false);
  const [inThreadSearchQuery, setInThreadSearchQuery] = useState("");

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  // Real-time typing indicators
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // New Chat Dialog
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");

  // Group creation & member management dialogs
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupMemberSearch, setNewGroupMemberSearch] = useState("");
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [groupFormError, setGroupFormError] = useState("");

  // Group Profile Editing, Role Assignment, Ownership Transfer & Safety
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [isEditingGroupSidebar, setIsEditingGroupSidebar] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDescription, setEditGroupDescription] = useState("");
  const [editGroupAvatarUrl, setEditGroupAvatarUrl] = useState("");

  const [transferOwnershipOpen, setTransferOwnershipOpen] = useState(false);
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState("");
  const [leaveGroupOpen, setLeaveGroupOpen] = useState(false);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedAddMemberId, setSelectedAddMemberId] = useState("");
  const [selectedAddMemberIds, setSelectedAddMemberIds] = useState<string[]>([]);
  const [addMemberSearch, setAddMemberSearch] = useState("");

  // Pre-Call Permission & Device Check Modal State
  const [preCallModalOpen, setPreCallModalOpen] = useState(false);
  const [preCallType, setPreCallType] = useState<"audio" | "video">("audio");
  const [preCallTarget, setPreCallTarget] = useState<{
    targetUserId: string;
    name: string;
    phone?: string;
    email?: string;
  } | null>(null);
  const [preCallPermissionState, setPreCallPermissionState] = useState<"checking" | "granted" | "denied">("checking");
  const [preCallMicMuted, setPreCallMicMuted] = useState(false);
  const [preCallVideoOff, setPreCallVideoOff] = useState(false);
  const [preCallStream, setPreCallStream] = useState<MediaStream | null>(null);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState("");
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
  const preCallVideoRef = useRef<HTMLVideoElement | null>(null);

  // Screen Sharing & Camera Switch State
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);

  // Web Audio API Ringtone Refs
  const ringtoneContextRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Message Actions: Reply, Edit, Forward, Delete
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessageItem | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessageItem | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [forwardMessage, setForwardMessage] = useState<ChatMessageItem | null>(null);
  const [forwardTargetThreadId, setForwardTargetThreadId] = useState("");
  const [forwardTab, setForwardTab] = useState<"personal" | "group">("personal");
  const [forwardSearch, setForwardSearch] = useState("");
  const [selectedForwardThreadIds, setSelectedForwardThreadIds] = useState<string[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);
  const isInitialScrollDoneRef = useRef<{ [threadId: string]: boolean }>({});

  // File Attachments & Drag-and-Drop & Media Library Integration
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [composerAttachments, setComposerAttachments] = useState<ComposerAttachmentItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // In-App Attachment Viewer Modal State (Images, PDFs & Office Documents)
  const [activeViewer, setActiveViewer] = useState<{
    items: Array<{ url: string; name: string; size?: number; mimeType?: string }>;
    currentIndex: number;
    zoom: number;
  } | null>(null);

  // Media Library Picker Modal State
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerPurpose, setMediaPickerPurpose] = useState<"composer" | "newGroup" | "editGroup">("composer");

  // Group Avatar Selection & Upload State
  const [newGroupAvatarUrl, setNewGroupAvatarUrl] = useState<string>("");
  const [newGroupAvatarMediaId, setNewGroupAvatarMediaId] = useState<string>("");
  const [isUploadingGroupAvatar, setIsUploadingGroupAvatar] = useState(false);
  const [editGroupAvatarMediaId, setEditGroupAvatarMediaId] = useState<string>("");

  // Poll Creation Dialog
  const [createPollOpen, setCreatePollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  // Voice Note Recording & Preview
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voicePreviewBlob, setVoicePreviewBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [isPlayingVoicePreview, setIsPlayingVoicePreview] = useState(false);
  const voicePreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Emoji Popovers
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);

  // Desktop Context Menu & Mobile Long-press / Swipe Gestures
  const [contextMenuMessage, setContextMenuMessage] = useState<any | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, msg: any) => {
    e.preventDefault();
    if (msg.isDeletedForEveryone) return;
    setContextMenuMessage(msg);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleTouchStart = (e: React.TouchEvent, msg: any) => {
    if (msg.isDeletedForEveryone) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleTouchEnd = (e: React.TouchEvent, msg: any) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Mobile horizontal swipe-to-reply (> 60px rightward with minimal vertical deviation)
    if (deltaX > 60 && Math.abs(deltaY) < 40) {
      setReplyingToMessage(msg);
      toast.info(`Replying to ${msg.senderName || "message"}`);
    } else if (deltaTime > 500 && Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15) {
      // Mobile long-press: open context action menu
      setContextMenuMessage(msg);
      setContextMenuPos({ x: touch.clientX, y: touch.clientY });
    }
    touchStartRef.current = null;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // WebRTC REAL CALLING STATE & REFS
  // ──────────────────────────────────────────────────────────────────────────
  const [activeCallModalOpen, setActiveCallModalOpen] = useState(false);
  const [activeCallType, setActiveCallType] = useState<"audio" | "video">("audio");
  const [activeCallTargetName, setActiveCallTargetName] = useState("");
  const [activeCallTargetPhone, setActiveCallTargetPhone] = useState("");
  const [activeCallTargetEmail, setActiveCallTargetEmail] = useState("");
  const [activeCallTargetId, setActiveCallTargetId] = useState("");
  const [activeCallId, setActiveCallId] = useState("");
  const [activeCallRole, setActiveCallRole] = useState<"caller" | "callee">("caller");
  const [callStatus, setCallStatus] = useState<"calling" | "ringing" | "connected" | "ended">("calling");
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteIsScreenSharing, setRemoteIsScreenSharing] = useState(false);

  // Incoming call state (for callee)
  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    fromUserId: string;
    type: "audio" | "video";
    callerName: string;
    callerPhone?: string;
    callerEmail?: string;
    callerAvatarUrl?: string;
    threadId?: string;
  } | null>(null);

  // WebRTC DOM Media Element Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeCallIdRef = useRef<string>("");

  // Audio Output & Speaker Selection
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState("");

  // Live Audio Level Visualizer (Web Audio API AnalyserNode)
  const [micVolumeLevel, setMicVolumeLevel] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Network Quality Monitoring (WebRTC Stats)
  const [networkQuality, setNetworkQuality] = useState<"excellent" | "good" | "poor">("excellent");
  const [networkRttMs, setNetworkRttMs] = useState<number>(35);

  // Active Speaker & Meeting View Modes
  const [remoteIsSpeaking, setRemoteIsSpeaking] = useState(false);
  const [localIsSpeaking, setLocalIsSpeaking] = useState(false);
  const [viewMode, setViewMode] = useState<"speaker" | "grid">("speaker");
  const [isCallFullscreen, setIsCallFullscreen] = useState(false);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // In-Call Settings & Add Participant
  const [inCallSettingsOpen, setInCallSettingsOpen] = useState(false);
  const [inCallAddParticipantOpen, setInCallAddParticipantOpen] = useState(false);
  const [inCallParticipantSearch, setInCallParticipantSearch] = useState("");
  const [invitedParticipants, setInvitedParticipants] = useState<Array<{
    id: string;
    name: string;
    avatarUrl?: string;
    status: "invited" | "ringing" | "connected";
  }>>([]);

  // Busy & Call Waiting Handlers
  const [busyStateData, setBusyStateData] = useState<{
    callId: string;
    targetName: string;
    targetUserId: string;
    reason: string;
  } | null>(null);
  const [callWaitingNotice, setCallWaitingNotice] = useState<{
    callId: string;
    requestedBy: string;
    requestedByName: string;
    reason: string;
  } | null>(null);

  // Multi-Participant Group Meeting States
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeetingState | null>(null);
  const [isMeetingOpen, setIsMeetingOpen] = useState<boolean>(false);
  const [meetingParticipants, setMeetingParticipants] = useState<MeetingParticipant[]>([]);
  const [meetingIsMuted, setMeetingIsMuted] = useState<boolean>(false);
  const [meetingIsVideoOff, setMeetingIsVideoOff] = useState<boolean>(false);
  const [meetingIsScreenSharing, setMeetingIsScreenSharing] = useState<boolean>(false);
  const [incomingGroupMeeting, setIncomingGroupMeeting] = useState<{
    callId: string;
    groupId: string;
    groupName: string;
    callType: "audio" | "video";
    callerId: string;
    callerName: string;
    callerAvatar?: string | null;
    eventId?: string;
  } | null>(null);
  const [meetingSfuConfig, setMeetingSfuConfig] = useState<SfuDiagnosticInfo | null>(null);

  const meetingLocalStreamRef = useRef<MediaStream | null>(null);
  const meetingScreenStreamRef = useRef<MediaStream | null>(null);
  const handledGroupEventsRef = useRef<Set<string>>(new Set());

  // Fetch initial SFU configuration and STUN/TURN diagnostics
  useEffect(() => {
    api
      .get("/api/chat/meetings/config")
      .then((res: any) => {
        setMeetingSfuConfig(res?.data || res);
      })
      .catch(() => {});
  }, []);

  // Test Speaker Playback Chime
  const testSpeakerSound = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      toast.success("Playing test chime through audio output");
    } catch (err: any) {
      toast.error("Audio test error: " + err.message);
    }
  }, []);

  // Audio output device switch
  const setAudioOutputDevice = async (deviceId: string) => {
    setSelectedAudioOutputId(deviceId);
    try {
      const audioEl = remoteAudioRef.current;
      if (audioEl && (audioEl as any).setSinkId) {
        await (audioEl as any).setSinkId(deviceId);
        toast.success("Speaker output switched successfully");
      }
    } catch (err: any) {
      console.warn("setSinkId error:", err);
      toast.error("Could not switch audio output device: " + err.message);
    }
  };

  // Picture-in-Picture
  const togglePictureInPicture = async () => {
    try {
      const isMobileDevice = typeof window !== "undefined" && (
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
      );

      // On mobile or when user toggles in-app PiP, prioritize in-app floating window
      if (isMobileDevice) {
        setIsCallMinimized((prev) => !prev);
        toast.info(!isCallMinimized ? "Switched to Picture-in-Picture" : "Restored call screen");
        return;
      }

      const videoEl = remoteVideoRef.current || localVideoRef.current;
      if (!videoEl) {
        setIsCallMinimized((prev) => !prev);
        return;
      }

      // Check iOS Safari WebKit presentation mode
      if (typeof (videoEl as any).webkitSetPresentationMode === "function") {
        const currentMode = (videoEl as any).webkitPresentationMode;
        const nextMode = currentMode === "picture-in-picture" ? "inline" : "picture-in-picture";
        (videoEl as any).webkitSetPresentationMode(nextMode);
        toast.info(nextMode === "picture-in-picture" ? "Picture-in-Picture activated" : "Picture-in-Picture exited");
        return;
      }

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        toast.info("Picture-in-Picture exited");
      } else if (document.pictureInPictureEnabled && videoEl.requestPictureInPicture) {
        await videoEl.requestPictureInPicture();
        toast.success("Picture-in-Picture activated");
      } else {
        setIsCallMinimized(true);
        toast.success("Picture-in-Picture mode active");
      }
    } catch (err: any) {
      console.warn("PiP error, falling back to in-app widget:", err);
      setIsCallMinimized(true);
      toast.info("Picture-in-Picture mode active");
    }
  };

  // Fullscreen
  const toggleFullscreenCall = () => {
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        const docEl = document.documentElement as any;
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        } else {
          const videoEl = (remoteVideoRef.current || localVideoRef.current) as any;
          if (videoEl?.webkitEnterFullscreen) {
            videoEl.webkitEnterFullscreen();
          }
        }
        setIsCallFullscreen(true);
      } else {
        const doc = document as any;
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        }
        setIsCallFullscreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
  };

  // Real-time WebRTC Network Quality Monitor
  useEffect(() => {
    if (!activeCallModalOpen || !peerConnectionRef.current) return;
    const interval = setInterval(async () => {
      try {
        const pc = peerConnectionRef.current;
        if (!pc) return;
        const stats = await pc.getStats();
        stats.forEach((report) => {
          if (report.type === "candidate-pair" && report.state === "succeeded") {
            const rtt = report.currentRoundTripTime ? Math.round(report.currentRoundTripTime * 1000) : 35;
            setNetworkRttMs(rtt);
            if (rtt < 80) setNetworkQuality("excellent");
            else if (rtt < 200) setNetworkQuality("good");
            else setNetworkQuality("poor");
          }
        });
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [activeCallModalOpen]);

  useEffect(() => {
    activeCallIdRef.current = activeCallId;
  }, [activeCallId]);

  const mediaConstraints = useCallback((video: boolean): MediaStreamConstraints => ({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...(selectedAudioInputId ? { deviceId: { exact: selectedAudioInputId } } : {}),
    },
    video: video
      ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
          ...(selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : {}),
        }
      : false,
  }), [selectedAudioInputId, selectedVideoDeviceId]);

  // Synthesize standard telephone ringtone via Web Audio API (440Hz + 480Hz dual tone)
  const startRingtone = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!ringtoneContextRef.current || ringtoneContextRef.current.state === "closed") {
        ringtoneContextRef.current = new AudioCtx();
      }
      const ctx = ringtoneContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const ringBurst = () => {
        if (!ringtoneContextRef.current || ringtoneContextRef.current.state === "closed") return;
        try {
          const now = ctx.currentTime;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = "sine";
          osc1.frequency.setValueAtTime(440, now);
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(480, now);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
          gain.gain.setValueAtTime(0.2, now + 1.8);
          gain.gain.linearRampToValueAtTime(0, now + 2.0);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 2.0);
          osc2.stop(now + 2.0);
        } catch {}
      };

      ringBurst();
      if (ringtoneIntervalRef.current) clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = setInterval(ringBurst, 4000);
    } catch {}
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (ringtoneContextRef.current && ringtoneContextRef.current.state !== "closed") {
      try {
        ringtoneContextRef.current.close().catch(() => {});
      } catch {}
      ringtoneContextRef.current = null;
    }
  }, []);

  // Manage incoming call ringtone lifecycle
  useEffect(() => {
    if (incomingCall) {
      startRingtone();
    } else {
      stopRingtone();
    }
    return () => {
      stopRingtone();
    };
  }, [incomingCall, startRingtone, stopRingtone]);

  // Call History view filters, server pagination & modals
  const [callTypeFilter, setCallTypeFilter] = useState("all");
  const [callDirectionFilter, setCallDirectionFilter] = useState("all");
  const [callStatusFilter, setCallStatusFilter] = useState("all");
  const [callPage, setCallPage] = useState(1);
  const [callStartDate, setCallStartDate] = useState("");
  const [callEndDate, setCallEndDate] = useState("");
  const [callSortOrder, setCallSortOrder] = useState<"desc" | "asc">("desc");
  const [viewCallerDetails, setViewCallerDetails] = useState<CallLogItem | null>(null);

  // Schedule Meeting modal state (replaces manual log call)
  const [scheduleMeetingOpen, setScheduleMeetingOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDescription, setMeetingDescription] = useState("");
  const [meetingStartDate, setMeetingStartDate] = useState("");
  const [meetingEndDate, setMeetingEndDate] = useState("");
  const [meetingTimezone, setMeetingTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  });
  const [meetingSelectedAttendees, setMeetingSelectedAttendees] = useState<string[]>([]);
  const [meetingLocation, setMeetingLocation] = useState("");

  const callTimeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const incomingCallTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleAcceptIncomingCallRef = useRef<((callOverride?: any) => Promise<void>) | null>(null);

  // Optimistic message list state
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessageItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [unreadBelowCount, setUnreadBelowCount] = useState<number>(0);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
    setShowScrollBottom(false);
    setUnreadBelowCount(0);
  }, []);

  const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    if (isNearBottom) {
      setShowScrollBottom(false);
      setUnreadBelowCount(0);
    } else {
      setShowScrollBottom(true);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 1. DATA QUERIES (Authoritative, Zero Mock)
  // ──────────────────────────────────────────────────────────────────────────

  // Online Presence
  const { data: onlineUserIds = [] } = useQuery<string[]>({
    queryKey: ["chat", "presence"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/chat/presence");
        return (res?.onlineUserIds || res?.data?.onlineUserIds || []) as string[];
      } catch {
        return [];
      }
    },
    refetchInterval: 15000,
  });

  // Contacts / Directory Query
  const {
    data: contacts = [],
    isLoading: isContactsLoading,
    isError: isContactsError,
    refetch: refetchContacts,
  } = useQuery<ContactItem[]>({
    queryKey: ["chat", "contacts"],
    queryFn: async () => {
      const res: any = await api.get("/api/chat/contacts");
      const list = Array.isArray(res) ? res : res?.contacts || res?.data || [];
      return list.map((item: any) => {
        const isOnline = onlineUserIds.includes(item.id) || onlineUserIds.includes(item.userId);
        return {
          id: item.id,
          userId: item.userId || item.id,
          name: item.name || "Colleague",
          email: item.email || "",
          phone: item.phone || "",
          avatarLetter: (item.name || "C").charAt(0).toUpperCase(),
          avatarColor: getAvatarColor(item.name || "C"),
          avatarUrl: item.avatarUrl || null,
          status: isOnline ? "online" : "offline",
          statusText: isOnline ? "Online" : "Offline",
          designation: item.title || item.designation || "Team Member",
          department: item.department || "",
          unreadCount: item.unread || 0,
          lastMessage: item.lastMessage || "",
          time: item.time ? new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null,
        };
      });
    },
  });

  // Conversations Query
  const {
    data: conversations = [],
    isLoading: isConversationsLoading,
    isError: isConversationsError,
    refetch: refetchConversations,
  } = useQuery<ConversationSummaryItem[]>({
    queryKey: ["chat", "conversations"],
    queryFn: async () => {
      const res: any = await api.get("/api/chat/conversations");
      const list = Array.isArray(res) ? res : res?.conversations || res?.data || [];
      return list.map((c: any) => {
        const title = c.name || c.title || "Chat";
        const isDirect = c.type === "direct";
        const isOnline = isDirect && c.id && onlineUserIds.includes(c.id);

        return {
          threadId: c.threadId,
          type: c.type || "direct",
          title,
          avatarUrl: c.avatarUrl || null,
          avatarLetter: title.charAt(0).toUpperCase(),
          avatarColor: getAvatarColor(title),
          lastMessage: c.lastMessage || "",
          lastMessageTime: c.lastMessageTime
            ? new Date(c.lastMessageTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          unreadCount: c.unreadCount || 0,
          status: isOnline ? "online" : "offline",
          otherParticipantId: isDirect ? c.id : undefined,
          groupId: !isDirect ? (c.groupId || c.id) : undefined,
          isPinned: Boolean(c.isPinned),
          isMuted: Boolean(c.isMuted),
          ownerId: c.ownerId,
        };
      });
    },
    refetchInterval: 10000,
  });

  // Groups Query
  const {
    data: groups = [],
    isLoading: isGroupsLoading,
    isError: isGroupsError,
    refetch: refetchGroups,
  } = useQuery<GroupItem[]>({
    queryKey: ["chat", "groups"],
    queryFn: async () => {
      const res: any = await api.get("/api/chat/groups");
      const list = Array.isArray(res) ? res : res?.groups || res?.data || [];
      return list.map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        avatarLetter: g.name.charAt(0).toUpperCase(),
        avatarColor: getAvatarColor(g.name),
        avatarUrl: g.avatarUrl || null,
        memberCount: g.memberCount || g.members?.length || 0,
        ownerId: g.ownerId,
        isPinned: Boolean(g.isPinned),
        isMuted: Boolean(g.isMuted),
        members: (g.members || []).map((m: any) => ({
          id: m.id || m.userId,
          userId: m.userId || m.id,
          role: m.role || "member",
          name: m.name || m.user?.profile?.fullName || m.user?.email || "Member",
          email: m.email || m.user?.email,
          avatarUrl: m.avatarUrl || m.user?.profile?.avatarUrl || null,
          department: m.department || m.user?.profile?.department || null,
          designation: m.designation || m.user?.profile?.designation || "Team Member",
          isMuted: Boolean(m.isMuted),
        })),
        createdById: g.createdById,
        lastMessage: g.lastMessage || "",
        lastMessageSender: g.lastMessageSender || "",
        time: g.time ? new Date(g.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        unreadCount: g.unread || 0,
      }));
    },
  });

  // Call History Query (Server-side search, filtering, pagination)
  const {
    data: callHistoryData = { calls: [], total: 0, page: 1, limit: 20, totalPages: 1 },
    isLoading: isCallLogsLoading,
    isError: isCallLogsError,
    refetch: refetchCallLogs,
  } = useQuery<{ calls: CallLogItem[]; total: number; page: number; limit: number; totalPages: number }>({
    queryKey: [
      "chat",
      "calls",
      searchQuery,
      callTypeFilter,
      callDirectionFilter,
      callStatusFilter,
      callStartDate,
      callEndDate,
      callPage,
      callSortOrder,
    ],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (searchQuery) p.append("search", searchQuery);
      if (callTypeFilter && callTypeFilter !== "all") p.append("callType", callTypeFilter);
      if (callDirectionFilter && callDirectionFilter !== "all") p.append("direction", callDirectionFilter);
      if (callStatusFilter && callStatusFilter !== "all") p.append("status", callStatusFilter);
      if (callStartDate) p.append("startDate", callStartDate);
      if (callEndDate) p.append("endDate", callEndDate);
      p.append("page", String(callPage));
      p.append("limit", "20");
      p.append("sort", callSortOrder);
      const res: any = await api.get(`/api/chat/calls?${p.toString()}`);
      if (res && Array.isArray(res.calls)) {
        return res;
      }
      const rawList = Array.isArray(res) ? res : res?.data || [];
      return {
        calls: rawList,
        total: rawList.length,
        page: 1,
        limit: 20,
        totalPages: Math.ceil(rawList.length / 20) || 1,
      };
    },
  });

  const callLogs = callHistoryData.calls || [];

  // Messages Query for active conversation (Cursor-based pagination: latest 25 first)
  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    isError: isMessagesError,
    refetch: refetchMessages,
  } = useQuery<{ messages: ChatMessageItem[]; nextCursor?: string | null; hasMore?: boolean }>({
    queryKey: ["chat", "messages", activeThreadId],
    queryFn: async () => {
      if (!activeThreadId) return { messages: [] };
      const res: any = await api.get(`/api/chat/conversations/${activeThreadId}/messages?limit=25`);
      const rawList = Array.isArray(res) ? res : res?.messages || res?.data || [];
      const hasMore = Boolean(res?.hasMore);
      const nextCursor = res?.nextCursor || null;

      // Acknowledge delivery for all incoming messages that aren't acknowledged yet
      const unacknowledgedIds = rawList
        .filter((m: any) => m.senderId !== currentUserId && m.deliveryStatus !== "seen")
        .map((m: any) => m.id);

      if (unacknowledgedIds.length > 0) {
        api.post("/api/chat/messages/delivered", {
          threadId: activeThreadId,
          messageIds: unacknowledgedIds,
        }).catch(() => {});
        api.post(`/api/chat/conversations/${activeThreadId}/read`).catch(() => {});
      }

      return {
        messages: rawList.map((m: any) => formatMessageItem(m, currentUserId)),
        nextCursor,
        hasMore,
      };
    },
    enabled: Boolean(activeThreadId),
  });

  const serverMessages = useMemo(() => messagesData?.messages || [], [messagesData]);

  // Sync pagination cursor when new thread messages load
  useEffect(() => {
    if (messagesData) {
      const nextHasMore = Boolean(messagesData.hasMore);
      const nextCursor = messagesData.nextCursor || null;
      setHasMoreOlder((prev) => (prev !== nextHasMore ? nextHasMore : prev));
      setOldestCursor((prev) => (prev !== nextCursor ? nextCursor : prev));
    }
  }, [messagesData?.hasMore, messagesData?.nextCursor]);

  // Query authoritative employee/participant profile for active direct thread
  const {
    data: participantProfile,
  } = useQuery<ParticipantProfile | null>({
    queryKey: ["chat", "participant", activeTargetUserId],
    queryFn: async () => {
      if (!activeTargetUserId || activeThreadType !== "direct") return null;
      try {
        const res: any = await api.get(`/api/chat/participant/${activeTargetUserId}`);
        return res || null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(activeTargetUserId && activeThreadType === "direct"),
  });

  const computedGroupId = useMemo(() => {
    if (activeGroupId) return activeGroupId;
    if (activeThreadId?.startsWith("group_")) return activeThreadId.replace("group_", "");
    return "";
  }, [activeGroupId, activeThreadId]);

  // Group Activity Events Query for Activity Tab
  const {
    data: groupActivityEvents = [],
    isLoading: isActivityLoading,
    refetch: refetchGroupActivity,
  } = useQuery<any[]>({
    queryKey: ["chat", "group_activity", computedGroupId],
    queryFn: async () => {
      if (!computedGroupId || activeThreadType !== "group") return [];
      try {
        const res: any = await api.get(`/api/chat/groups/${computedGroupId}/activity`);
        return Array.isArray(res) ? res : res?.events || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(computedGroupId && activeThreadType === "group"),
  });

  // Reset optimistic state, pagination, and filters when switching conversations to prevent cross-conversation leakage
  useEffect(() => {
    setOptimisticMessages([]);
    setOlderMessages([]);
    setHasMoreOlder(false);
    setOldestCursor(null);
    setTypingUsers({});
    setInThreadSearchQuery("");
    setReplyingToMessage(null);
    setEditingMessage(null);
  }, [activeThreadId]);

  // Sync active threadId to URL search params to preserve conversation thread state
  useEffect(() => {
    if (typeof window !== "undefined" && activeThreadId) {
      const url = new URL(window.location.href);
      if (url.searchParams.get("threadId") !== activeThreadId) {
        url.searchParams.set("threadId", activeThreadId);
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [activeThreadId]);

  // Auto-resolve otherParticipantId if direct thread is active without activeTargetUserId
  useEffect(() => {
    if (activeThreadId?.startsWith("direct_") && !activeTargetUserId) {
      const parts = activeThreadId.slice("direct_".length).split("_");
      const otherId = parts.find((p) => p !== currentUserId) || parts[0];
      if (otherId) {
        setActiveTargetUserId(otherId);
      }
    }
  }, [activeThreadId, activeTargetUserId, currentUserId]);

  // Auto-select conversation on initial load: URL param threadId takes priority, fallback to first
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlThreadId = params.get("threadId");
      if (urlThreadId && urlThreadId !== activeThreadId) {
        const found = conversations.find((c) => c.threadId === urlThreadId);
        if (found) {
          setActiveThreadId(found.threadId);
          setActiveThreadTitle(found.title);
          setActiveThreadType(found.type);
          setActiveTargetUserId(found.otherParticipantId || "");
          setActiveGroupId(found.groupId || "");
          return;
        } else if (urlThreadId.startsWith("direct_")) {
          const parts = urlThreadId.slice("direct_".length).split("_");
          const targetId = parts.find((p) => p !== currentUserId) || parts[0];
          setActiveThreadId(urlThreadId);
          setActiveThreadTitle("Direct Chat");
          setActiveThreadType("direct");
          setActiveTargetUserId(targetId);
          return;
        } else if (urlThreadId.startsWith("group_")) {
          const gId = urlThreadId.replace("group_", "");
          const matchingGroup = groups.find((g) => g.id === gId);
          setActiveThreadId(urlThreadId);
          setActiveThreadTitle(matchingGroup?.name || "Group Chat");
          setActiveThreadType("group");
          setActiveGroupId(gId);
          return;
        }
      }
    }

    if (!activeThreadId && conversations.length > 0 && mode === "chats") {
      const first = conversations[0];
      setActiveThreadId(first.threadId);
      setActiveThreadTitle(first.title);
      setActiveThreadType(first.type);
      setActiveTargetUserId(first.otherParticipantId || "");
      setActiveGroupId(first.groupId || "");
    }
  }, [conversations, activeThreadId, mode]);

  
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

  // Cursor-based infinite scroll: load older 25 messages
  const loadOlderMessages = useCallback(async () => {
    if (!activeThreadId || isLoadingOlder || !hasMoreOlder || !oldestCursor) return;
    setIsLoadingOlder(true);
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;

    try {
      const res: any = await api.get(
        `/api/chat/conversations/${activeThreadId}/messages?limit=25&before=${oldestCursor}`
      );
      const rawList = Array.isArray(res) ? res : res?.messages || res?.data || [];
      const olderFormatted = rawList.map((m: any) => formatMessageItem(m, currentUserId));

      setOlderMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newOnes = olderFormatted.filter((m: any) => !existingIds.has(m.id));
        return [...newOnes, ...prev];
      });

      setHasMoreOlder(Boolean(res?.hasMore));
      setOldestCursor(res?.nextCursor || null);

      // Preserve visible scroll position when prepending older items
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeight;
        }
      });
    } catch (err) {
      console.error("Failed to load older messages", err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [activeThreadId, isLoadingOlder, hasMoreOlder, oldestCursor, currentUserId]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 40 && hasMoreOlder && !isLoadingOlder) {
      loadOlderMessages();
    }
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom) {
      setShowScrollBottom(false);
      setUnreadBelowCount(0);
    } else {
      setShowScrollBottom(true);
    }
  }, [hasMoreOlder, isLoadingOlder, loadOlderMessages]);

  // Live Call duration timer increment
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeCallModalOpen && callStatus === "connected") {
      timer = setInterval(() => {
        setCallDurationSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeCallModalOpen, callStatus]);

  // Clean up media tracks helper
  const cleanUpMedia = useCallback(() => {
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
  }, [stopRingtone]);

  // Video element stream binding hook (ensures tracks are connected after DOM mounts)
  useEffect(() => {
    if (activeCallModalOpen) {
      if (localStreamRef.current && localVideoRef.current && !isVideoOff) {
        if (localVideoRef.current.srcObject !== localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
      if (remoteStreamRef.current) {
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
        if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStreamRef.current) {
          remoteAudioRef.current.srcObject = remoteStreamRef.current;
        }
      }
    }
  }, [activeCallModalOpen, isVideoOff, callStatus, activeCallType, isScreenSharing]);

  // ──────────────────────────────────────────────────────────────────────────
  // MULTI-PARTICIPANT GROUP MEETING LIFECYCLE & MEDIA CONTROLS
  // ──────────────────────────────────────────────────────────────────────────

  const cleanUpMeetingMedia = useCallback(() => {
    if (meetingLocalStreamRef.current) {
      meetingLocalStreamRef.current.getTracks().forEach((t) => t.stop());
      meetingLocalStreamRef.current = null;
    }
    if (meetingScreenStreamRef.current) {
      meetingScreenStreamRef.current.getTracks().forEach((t) => t.stop());
      meetingScreenStreamRef.current = null;
    }
    setActiveMeeting(null);
    setIsMeetingOpen(false);
    setMeetingParticipants([]);
    setMeetingIsMuted(false);
    setMeetingIsVideoOff(false);
    setMeetingIsScreenSharing(false);
  }, []);

  // Web Audio Speaking Activity Detection for Multi-Participant Group Meetings
  useEffect(() => {
    if (!isMeetingOpen || !meetingLocalStreamRef.current || meetingIsMuted) return;

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let microphone: MediaStreamAudioSourceNode | null = null;
    let javascriptNode: ScriptProcessorNode | null = null;
    let speakingTimer: NodeJS.Timeout | null = null;
    let isCurrentlySpeaking = false;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      audioContext = new AudioCtx();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      const audioTrack = meetingLocalStreamRef.current.getAudioTracks()[0];
      if (!audioTrack || !audioTrack.enabled) return;

      const audioStream = new MediaStream([audioTrack]);
      microphone = audioContext.createMediaStreamSource(audioStream);
      javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

      microphone.connect(analyser);
      analyser.connect(javascriptNode);
      javascriptNode.connect(audioContext.destination);

      javascriptNode.onaudioprocess = () => {
        if (!analyser || meetingIsMuted) return;
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        let values = 0;
        const length = array.length;
        for (let i = 0; i < length; i++) {
          values += array[i];
        }
        const average = values / length;

        if (average > 15) {
          if (!isCurrentlySpeaking) {
            isCurrentlySpeaking = true;
            setMeetingParticipants((prev) =>
              prev.map((p) => (p.isLocal || p.userId === currentUserId ? { ...p, isSpeaking: true } : p))
            );
            const socket = getSocketClient();
            if (socket && activeMeeting?.callId) {
              socket.emit("group-call:media-state", {
                callId: activeMeeting.callId,
                isMuted: meetingIsMuted,
                isCameraOff: meetingIsVideoOff,
                isScreenSharing: meetingIsScreenSharing,
                isSpeaking: true,
              });
            }
          }
          if (speakingTimer) clearTimeout(speakingTimer);
          speakingTimer = setTimeout(() => {
            isCurrentlySpeaking = false;
            setMeetingParticipants((prev) =>
              prev.map((p) => (p.isLocal || p.userId === currentUserId ? { ...p, isSpeaking: false } : p))
            );
            const socket = getSocketClient();
            if (socket && activeMeeting?.callId) {
              socket.emit("group-call:media-state", {
                callId: activeMeeting.callId,
                isMuted: meetingIsMuted,
                isCameraOff: meetingIsVideoOff,
                isScreenSharing: meetingIsScreenSharing,
                isSpeaking: false,
              });
            }
          }, 800);
        }
      };
    } catch (err) {
      console.warn("Speaking activity detection initialization:", err);
    }

    return () => {
      if (speakingTimer) clearTimeout(speakingTimer);
      if (javascriptNode) javascriptNode.disconnect();
      if (microphone) microphone.disconnect();
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {});
      }
    };
  }, [isMeetingOpen, meetingIsMuted, meetingIsVideoOff, meetingIsScreenSharing, activeMeeting?.callId, currentUserId]);

  const handleStartGroupMeeting = async (callType: "audio" | "video") => {
    if (!activeGroupId) return;
    if (activeCallModalOpen || activeMeeting) {
      toast.warning("You are already in an active call or meeting.");
      return;
    }

    const callId = `meeting_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
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
      const startResponse = await new Promise<{ success: boolean; message?: string }>((resolve, reject) => {
        socket.timeout(8000).emit("group-call:start", {
          callId,
          groupId: activeGroupId,
          groupName: activeGroup?.name || "Group Meeting",
          callType,
        }, (error: Error | null, response: { success?: boolean; message?: string }) => {
          if (error) {
            reject(new Error("The meeting server did not confirm the meeting start."));
            return;
          }
          if (!response?.success) {
            reject(new Error(response?.message || "The meeting could not be started."));
            return;
          }
          resolve({ success: true, message: response.message });
        });
      });
      if (!startResponse.success) throw new Error(startResponse.message || "The meeting could not be started.");
      meetingSessionStarted = true;
      setActiveMeeting((current) => current?.callId === callId ? { ...current, status: "connected" } : current);

      const tokenResponse = await api.post(`/api/chat/meetings/${callId}/token`, {
        groupId: activeGroupId,
        callType,
      });
      setMeetingSfuConfig((tokenResponse as any)?.data || tokenResponse);
    } catch (err: any) {
      if (meetingSessionStarted) {
        getSocketClient().emit("group-call:leave", { callId });
      }
      cleanUpMeetingMedia();
      toast.error(err?.message || "Could not start the meeting.");
    }
  };

  const handleAcceptGroupMeeting = async () => {
    if (!incomingGroupMeeting) return;
    stopRingtone();
    const meetingData = incomingGroupMeeting;
    setIncomingGroupMeeting(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints(meetingData.callType === "video"));
      meetingLocalStreamRef.current = stream;

      const myName = (currentUser as any)?.profile?.fullName || (currentUser as any)?.name || currentUser?.email || "Member";
      const myAvatar = (currentUser as any)?.avatarUrl || null;

      setActiveMeeting({
        callId: meetingData.callId,
        groupId: meetingData.groupId,
        groupName: meetingData.groupName,
        callType: meetingData.callType,
        isHost: meetingData.callerId === currentUserId,
        creatorId: meetingData.callerId,
        startedAt: Date.now(),
        status: "connected",
      });

      setMeetingParticipants([
        {
          userId: currentUserId,
          name: myName,
          avatar: myAvatar,
          role: meetingData.callerId === currentUserId ? "host" : "participant",
          isMuted: false,
          isCameraOff: meetingData.callType === "audio",
          isScreenSharing: false,
          isSpeaking: false,
          isLocal: true,
        },
      ]);
      setMeetingIsMuted(false);
      setMeetingIsVideoOff(meetingData.callType === "audio");
      setMeetingIsScreenSharing(false);
      setIsMeetingOpen(true);

      const socket = getSocketClient();
      if (socket) {
        socket.emit("group-call:join", {
          callId: meetingData.callId,
        });
      }

      api.post(`/api/chat/meetings/${meetingData.callId}/token`, {
        groupId: meetingData.groupId,
        callType: meetingData.callType,
      }).then((res) => {
        setMeetingSfuConfig((res as any)?.data || res);
      }).catch((err) => {
        console.warn("Failed to fetch meeting token:", err);
      });
    } catch (err: any) {
      toast.error("Could not access microphone/camera: " + err.message);
    }
  };

  const handleDeclineGroupMeeting = () => {
    stopRingtone();
    setIncomingGroupMeeting(null);
  };

  const handleMeetingToggleMute = () => {
    if (meetingLocalStreamRef.current) {
      const track = meetingLocalStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = meetingIsMuted;
      }
    }
    const nextMuted = !meetingIsMuted;
    setMeetingIsMuted(nextMuted);
    setMeetingParticipants((prev) =>
      prev.map((p) => (p.isLocal || p.userId === currentUserId ? { ...p, isMuted: nextMuted } : p))
    );
    const socket = getSocketClient();
    if (socket && activeMeeting?.callId) {
      socket.emit("group-call:media-state", {
        callId: activeMeeting.callId,
        isMuted: nextMuted,
        isCameraOff: meetingIsVideoOff,
        isScreenSharing: meetingIsScreenSharing,
        isSpeaking: false,
      });
    }
  };

  const handleMeetingToggleVideo = () => {
    if (meetingLocalStreamRef.current) {
      const track = meetingLocalStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = meetingIsVideoOff;
      }
    }
    const nextVideoOff = !meetingIsVideoOff;
    setMeetingIsVideoOff(nextVideoOff);
    setMeetingParticipants((prev) =>
      prev.map((p) => (p.isLocal || p.userId === currentUserId ? { ...p, isCameraOff: nextVideoOff } : p))
    );
    const socket = getSocketClient();
    if (socket && activeMeeting?.callId) {
      socket.emit("group-call:media-state", {
        callId: activeMeeting.callId,
        isMuted: meetingIsMuted,
        isCameraOff: nextVideoOff,
        isScreenSharing: meetingIsScreenSharing,
        isSpeaking: false,
      });
    }
  };

  const handleMeetingToggleScreenShare = async () => {
    if (meetingIsScreenSharing) {
      if (meetingScreenStreamRef.current) {
        meetingScreenStreamRef.current.getTracks().forEach((t) => t.stop());
        meetingScreenStreamRef.current = null;
      }
      setMeetingIsScreenSharing(false);
      setMeetingParticipants((prev) =>
        prev.map((p) => (p.isLocal || p.userId === currentUserId ? { ...p, isScreenSharing: false } : p))
      );
      const socket = getSocketClient();
      if (socket && activeMeeting?.callId) {
        socket.emit("group-call:media-state", {
          callId: activeMeeting.callId,
          isMuted: meetingIsMuted,
          isCameraOff: meetingIsVideoOff,
          isScreenSharing: false,
          isSpeaking: false,
        });
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        meetingScreenStreamRef.current = screenStream;
        setMeetingIsScreenSharing(true);
        setMeetingParticipants((prev) =>
          prev.map((p) => (p.isLocal || p.userId === currentUserId ? { ...p, isScreenSharing: true } : p))
        );

        screenStream.getVideoTracks()[0].onended = () => {
          setMeetingIsScreenSharing(false);
          setMeetingParticipants((prev) =>
            prev.map((p) => (p.isLocal || p.userId === currentUserId ? { ...p, isScreenSharing: false } : p))
          );
          const socket = getSocketClient();
          if (socket && activeMeeting?.callId) {
            socket.emit("group-call:media-state", {
              callId: activeMeeting.callId,
              isMuted: meetingIsMuted,
              isCameraOff: meetingIsVideoOff,
              isScreenSharing: false,
              isSpeaking: false,
            });
          }
        };

        const socket = getSocketClient();
        if (socket && activeMeeting?.callId) {
          socket.emit("group-call:media-state", {
            callId: activeMeeting.callId,
            isMuted: meetingIsMuted,
            isCameraOff: meetingIsVideoOff,
            isScreenSharing: true,
            isSpeaking: false,
          });
        }
      } catch (err: any) {
        console.warn("Screen sharing cancelled or denied:", err);
      }
    }
  };

  const handleMeetingLeave = () => {
    if (activeMeeting) {
      const durationSeconds = Math.max(1, Math.round((Date.now() - activeMeeting.startedAt) / 1000));
      const socket = getSocketClient();
      if (socket) {
        socket.emit("group-call:leave", {
          callId: activeMeeting.callId,
          durationSeconds,
        });
      }
    }
    cleanUpMeetingMedia();
    toast.info("You left the meeting.");
  };

  const handleMeetingEndForEveryone = () => {
    if (activeMeeting) {
      const durationSeconds = Math.max(1, Math.round((Date.now() - activeMeeting.startedAt) / 1000));
      const socket = getSocketClient();
      if (socket) {
        socket.emit("group-call:end", {
          callId: activeMeeting.callId,
          durationSeconds,
        });
      }
      api.post(`/api/chat/meetings/${activeMeeting.callId}/end`).catch(() => {});
    }
    cleanUpMeetingMedia();
    toast.info("Meeting ended for everyone.");
    queryClient.invalidateQueries({ queryKey: ["chat", "calls"] });
  };

  const handleMeetingRemoveParticipant = (targetUserId: string) => {
    if (!activeMeeting) return;
    const socket = getSocketClient();
    if (socket) {
      socket.emit("group-call:remove_participant", {
        callId: activeMeeting.callId,
        targetUserId,
      });
    }
    setMeetingParticipants((prev) => prev.filter((p) => p.userId !== targetUserId));
    toast.info("Participant removed from meeting.");
  };

  const handleMeetingInviteColleagues = (targetUserIds: string[]) => {
    if (!activeMeeting || targetUserIds.length === 0) return;
    const socket = getSocketClient();
    if (socket) {
      socket.emit("group-call:invite_users", {
        callId: activeMeeting.callId,
        userIds: targetUserIds,
      });
    }
    toast.success(`Invitation sent to ${targetUserIds.length} colleague${targetUserIds.length > 1 ? "s" : ""}.`);
  };

  const handleInMeetingSendMessage = async (text: string) => {
    if (!activeThreadId || !text.trim()) return;
    try {
      await api.post("/api/chat/messages", {
        threadId: activeThreadId,
        content: text.trim(),
        groupId: activeThreadType === "group" ? activeGroupId : undefined,
        recipientId: activeThreadType === "direct" ? activeTargetUserId : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeThreadId] });
    } catch (err: any) {
      toast.error("Failed to send message: " + (err?.message || "error"));
    }
  };

  const handleIncomingGroupMeeting = useCallback((data: any) => {
    if (!data || !data.callId) return;
    const dedupeKey = data.eventId || `group_call_${data.callId}`;
    if (handledGroupEventsRef.current.has(dedupeKey)) return;
    handledGroupEventsRef.current.add(dedupeKey);

    if (data.callerId === currentUserId) return;
    if (activeMeeting?.callId === data.callId) return;

    if (activeMeeting || activeCallModalOpen) {
      toast.info(`Incoming group meeting in ${data.groupName || "group"} from ${data.callerName || "a colleague"}`);
      return;
    }

    setIncomingGroupMeeting({
      callId: data.callId,
      groupId: data.groupId,
      groupName: data.groupName || "Group Meeting",
      callType: data.callType || "audio",
      callerId: data.callerId,
      callerName: data.callerName || "Colleague",
      callerAvatar: data.callerAvatar || null,
      eventId: dedupeKey,
    });
    startRingtone();

    setTimeout(() => {
      setIncomingGroupMeeting((curr) => {
        if (curr && curr.callId === data.callId) {
          stopRingtone();
          return null;
        }
        return curr;
      });
    }, 60000);
  }, [currentUserId, activeMeeting, activeCallModalOpen, startRingtone, stopRingtone]);

  const handleGroupStateSync = useCallback((data: any) => {
    if (data && data.participants) {
      const synced: MeetingParticipant[] = data.participants.map((p: any) => ({
        userId: p.userId,
        name: p.name,
        avatar: p.avatar || null,
        role: p.role || "participant",
        isMuted: Boolean(p.isMuted),
        isCameraOff: Boolean(p.isCameraOff),
        isScreenSharing: Boolean(p.isScreenSharing),
        isSpeaking: Boolean(p.isSpeaking),
        isLocal: p.userId === currentUserId,
      }));
      setMeetingParticipants(synced);
    }
  }, [currentUserId]);

  const handleGroupUserJoined = useCallback((data: any) => {
    if (data && data.user) {
      const newUser: MeetingParticipant = {
        userId: data.user.userId,
        name: data.user.name,
        avatar: data.user.avatar || null,
        role: data.user.role || "participant",
        isMuted: Boolean(data.user.isMuted),
        isCameraOff: Boolean(data.user.isCameraOff),
        isScreenSharing: Boolean(data.user.isScreenSharing),
        isSpeaking: false,
        isLocal: data.user.userId === currentUserId,
      };
      setMeetingParticipants((prev) => {
        if (prev.some((p) => p.userId === newUser.userId)) {
          return prev.map((p) => (p.userId === newUser.userId ? { ...p, ...newUser } : p));
        }
        return [...prev, newUser];
      });
      toast.info(`${data.user.name} joined the meeting`);
    }
  }, [currentUserId]);

  const handleGroupUserLeft = useCallback((data: any) => {
    if (data && data.userId) {
      setMeetingParticipants((prev) => {
        const departing = prev.find((p) => p.userId === data.userId);
        if (departing) {
          toast.info(`${departing.name} left the meeting`);
        }
        return prev.filter((p) => p.userId !== data.userId);
      });
    }
  }, []);

  const handleGroupMediaState = useCallback((data: any) => {
    if (data && data.userId) {
      setMeetingParticipants((prev) =>
        prev.map((p) =>
          p.userId === data.userId
            ? {
                ...p,
                isMuted: data.isMuted !== undefined ? Boolean(data.isMuted) : p.isMuted,
                isCameraOff: data.isCameraOff !== undefined ? Boolean(data.isCameraOff) : p.isCameraOff,
                isScreenSharing: data.isScreenSharing !== undefined ? Boolean(data.isScreenSharing) : p.isScreenSharing,
                isSpeaking: data.isSpeaking !== undefined ? Boolean(data.isSpeaking) : p.isSpeaking,
              }
            : p
        )
      );
    }
  }, []);

  const handleGroupMeetingEnded = useCallback((data: any) => {
    if (activeMeeting?.callId === data?.callId || !data?.callId) {
      toast.info(data?.reason || "Meeting ended by host.");
      cleanUpMeetingMedia();
      queryClient.invalidateQueries({ queryKey: ["chat", "calls"] });
    }
  }, [activeMeeting?.callId, cleanUpMeetingMedia, queryClient]);

  const handleGroupMeetingRemoved = useCallback((data: any) => {
    if (data?.targetUserId === currentUserId) {
      toast.error("You were removed from the meeting by the host.");
      cleanUpMeetingMedia();
    }
  }, [currentUserId, cleanUpMeetingMedia]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. REAL-TIME SUBSCRIPTION LAYER (Socket.io & WebRTC Signaling)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let socket: any = null;
    try {
      socket = getSocketClient();
    } catch {
      return;
    }

    if (!socket) return;

    if (activeThreadId) {
      socket.emit("chat:join", { threadId: activeThreadId });
    }

    const handleIncomingMessage = (payload: any) => {
      const msg = payload?.message || payload;
      const threadId = payload?.threadId || msg?.threadId;

      if (threadId === activeThreadId && msg && msg.id) {
        setOptimisticMessages((prev) =>
          prev.filter((m) => m.clientTempId !== msg.clientTempId && m.id !== msg.id)
        );

        const formatted = formatMessageItem(msg, currentUserId);
        queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
          if (!old) return { messages: [formatted], hasMore: false };
          const list = Array.isArray(old.messages) ? old.messages : [];
          const exists = list.some((m: any) => m.id === formatted.id);
          if (exists) {
            return {
              ...old,
              messages: list.map((m: any) => (m.id === formatted.id ? formatted : m)),
            };
          }
          return {
            ...old,
            messages: [...list, formatted],
          };
        });

        // Auto-ack delivery via WebSocket
        if (msg.senderId !== currentUserId) {
          socket.emit("chat:delivered", { threadId: activeThreadId, messageIds: [msg.id] });
        }

        // Auto-scroll if near bottom
        const container = scrollContainerRef.current;
        if (container) {
          const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
          if (distFromBottom < 140) {
            scrollToBottom(false);
          } else {
            setUnreadBelowCount((c) => c + 1);
            setShowScrollBottom(true);
          }
        }
      }

      // Update conversations query cache targeted
      queryClient.setQueryData(["chat", "conversations"], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((conv: any) => {
          if (conv.threadId === threadId) {
            return {
              ...conv,
              lastMessage: msg?.content || (msg?.attachments?.length ? "Shared attachment" : (msg?.voiceNote ? "Voice message" : "Message")),
              lastMessageTime: new Date(msg?.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              unreadCount: threadId === activeThreadId ? 0 : (conv.unreadCount || 0) + 1,
            };
          }
          return conv;
        });
      });
    };

    const handleMessageEdited = (payload: any) => {
      const msg = payload?.message || payload;
      const threadId = payload?.threadId || msg?.threadId;
      if (threadId === activeThreadId && msg && msg.id) {
        queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
          if (!old || !old.messages) return old;
          return {
            ...old,
            messages: old.messages.map((m: any) =>
              m.id === msg.id ? { ...m, content: msg.content, isEdited: true, editedAt: msg.editedAt } : m
            ),
          };
        });
      }
    };

    const handleMessageDeleted = (payload: any) => {
      const { id, threadId, isDeletedForEveryone, deletedForUserId } = payload || {};
      if (threadId === activeThreadId) {
        queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
          if (!old || !old.messages) return old;
          if (isDeletedForEveryone) {
            return {
              ...old,
              messages: old.messages.map((m: any) =>
                m.id === id
                  ? {
                      ...m,
                      isDeletedForEveryone: true,
                      content: "This message was deleted",
                      attachments: [],
                      voiceNote: undefined,
                      poll: undefined,
                      reactions: {},
                      urlPreviews: [],
                    }
                  : m
              ),
            };
          } else if (deletedForUserId === currentUserId) {
            return {
              ...old,
              messages: old.messages.filter((m: any) => m.id !== id),
            };
          }
          return old;
        });
        setOptimisticMessages((prev) => prev.filter((m) => m.id !== id));
      }
    };

    const handleReactionEvent = (payload: any) => {
      const { id, threadId, reactions } = payload || {};
      if (threadId === activeThreadId) {
        queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
          if (!old || !old.messages) return old;
          return {
            ...old,
            messages: old.messages.map((m: any) =>
              m.id === id ? { ...m, reactions } : m
            ),
          };
        });
      }
    };

    const handlePollUpdated = (payload: any) => {
      const { id, threadId, poll } = payload || {};
      if (threadId === activeThreadId) {
        queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
          if (!old || !old.messages) return old;
          return {
            ...old,
            messages: old.messages.map((m: any) =>
              m.id === id ? { ...m, poll } : m
            ),
          };
        });
      }
    };

    const handleTypingEvent = (data: { threadId: string; userId: string; isTyping: boolean }) => {
      if (data.threadId === activeThreadId && data.userId !== currentUserId) {
        setTypingUsers((prev) => ({
          ...prev,
          [data.userId]: data.isTyping,
        }));
      }
    };

    const handleReadReceipt = (data: { threadId: string; userId: string }) => {
      if (data?.userId === currentUserId) return;
      if (data?.threadId === activeThreadId) {
        queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
          if (!old || !old.messages) return old;
          let changed = false;
          const nextMessages = old.messages.map((m: any) => {
            if (m.senderId === currentUserId && m.deliveryStatus !== "seen") {
              changed = true;
              return { ...m, deliveryStatus: "seen", status: "read" };
            }
            return m;
          });
          return changed ? { ...old, messages: nextMessages } : old;
        });
      }
    };

    const handleDeliveredReceipt = (data: { threadId: string; messageIds: string[]; userId?: string }) => {
      if (data?.userId === currentUserId) return;
      if (data?.threadId === activeThreadId && Array.isArray(data.messageIds)) {
        const idSet = new Set(data.messageIds);
        queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
          if (!old || !old.messages) return old;
          let changed = false;
          const nextMessages = old.messages.map((m: any) => {
            if (idSet.has(m.id) && m.deliveryStatus !== "seen" && m.deliveryStatus !== "delivered") {
              changed = true;
              return { ...m, deliveryStatus: "delivered" };
            }
            return m;
          });
          return changed ? { ...old, messages: nextMessages } : old;
        });
      }
    };

    const handlePresenceUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "presence"] });
    };

    const handleGroupUpdate = (data?: any) => {
      const g = data?.group;
      const gId = data?.groupId || g?.id || (data?.threadId?.startsWith("group_") ? data.threadId.replace("group_", "") : computedGroupId);
      if (g && gId) {
        queryClient.setQueryData<GroupItem[]>(["chat", "groups"], (old) => {
          if (!old) return old;
          return old.map((item) => (item.id === gId ? { ...item, ...g } : item));
        });
        queryClient.setQueryData<ConversationSummaryItem[]>(["chat", "conversations"], (old) => {
          if (!old) return old;
          return old.map((item) =>
            item.groupId === gId || item.threadId === `group_${gId}`
              ? { ...item, title: g.name || item.title, name: g.name || item.title, avatarUrl: g.avatarUrl !== undefined ? g.avatarUrl : item.avatarUrl }
              : item
          );
        });
        if (g.name && (gId === computedGroupId || `group_${gId}` === activeThreadId)) {
          setActiveThreadTitle(g.name);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      if (gId) {
        queryClient.invalidateQueries({ queryKey: ["chat", "group_activity", gId] });
        queryClient.invalidateQueries({ queryKey: ["chat", "messages", `group_${gId}`] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["chat", "group_activity"] });
      }
    };

    // ── WebRTC Signaling Listeners ──
    const handleIncomingCall = (data: any) => {
      if (!data?.callId || !data?.fromUserId) return;

      // If user is already in a call, intimation only — never disrupt ongoing call
      if (activeCallIdRef.current && activeCallIdRef.current !== data.callId) {
        toast.info(
          `Incoming call from ${data.callerName || "a colleague"} was blocked because you are currently on another call.`
        );
        return;
      }

      setIncomingCall((current) => {
        // Socket.IO and Pusher can both deliver the same invitation. Keep one
        // visible incoming-call dialog and one timeout/ringtone.
        if (current?.callId === data.callId) return current;
        startRingtone();
        return {
          callId: data.callId,
          fromUserId: data.fromUserId,
          type: data.type || data.callType || "audio",
          callerName: data.callerName || "Colleague",
          callerPhone: data.callerPhone,
          callerEmail: data.callerEmail,
          callerAvatarUrl: data.callerAvatarUrl,
          threadId: data.threadId,
        };
      });

      if (incomingCallTimerRef.current) {
        clearTimeout(incomingCallTimerRef.current);
        incomingCallTimerRef.current = null;
      }
      // Auto-reject on callee side after 60 seconds without answer
      incomingCallTimerRef.current = setTimeout(() => {
        handleRejectIncomingCall("timeout");
      }, 60000);
    };

    const handleCallAccepted = async (data: any) => {
      if (callTimeoutTimerRef.current) {
        clearTimeout(callTimeoutTimerRef.current);
        callTimeoutTimerRef.current = null;
      }
      setCallStatus("connected");
      toast.success("Call connected!");

      // Caller creates WebRTC offer
      if (peerConnectionRef.current) {
        try {
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          socket.emit("call:signal", {
            toUserId: activeCallTargetId,
            targetUserId: activeCallTargetId,
            callId: data.callId || activeCallIdRef.current || activeCallId,
            signal: { type: "offer", sdp: offer },
          });
        } catch (err: any) {
          console.error("Failed to create WebRTC offer:", err);
        }
      }
    };

    const handleCallRejected = (data: any) => {
      if (callTimeoutTimerRef.current) {
        clearTimeout(callTimeoutTimerRef.current);
        callTimeoutTimerRef.current = null;
      }
      toast.info(`Call declined (${data.reason || "unavailable"}).`);
      cleanUpMedia();
      setActiveCallModalOpen(false);
      setCallStatus("ended");
      queryClient.invalidateQueries({ queryKey: ["chat", "calls"] });
    };

    const handleCallCancelled = () => {
      if (callTimeoutTimerRef.current) {
        clearTimeout(callTimeoutTimerRef.current);
        callTimeoutTimerRef.current = null;
      }
      if (incomingCallTimerRef.current) {
        clearTimeout(incomingCallTimerRef.current);
        incomingCallTimerRef.current = null;
      }
      toast.info("Call was cancelled by the caller.");
      setIncomingCall(null);
      cleanUpMedia();
      setActiveCallModalOpen(false);
      setCallStatus("ended");
      queryClient.invalidateQueries({ queryKey: ["chat", "calls"] });
    };

    const handleCallBusy = (data: any) => {
      const curCallId = activeCallIdRef.current || activeCallId;
      // If we are currently in an active or connected call with a different callId,
      // this is an intimation that someone tried to call us while we were busy.
      // A busy notification must NEVER terminate or clean up our existing active call!
      if (curCallId && data?.callId && data.callId !== curCallId) {
        setCallWaitingNotice({
          callId: data.callId,
          requestedBy: data.requestedBy || "",
          requestedByName: data.requestedByName || "A colleague",
          reason: data.reason || "Another incoming call was blocked because you are already in a call.",
        });
        return;
      }

      if (callTimeoutTimerRef.current) {
        clearTimeout(callTimeoutTimerRef.current);
        callTimeoutTimerRef.current = null;
      }
      cleanUpMedia();
      setActiveCallModalOpen(false);
      setCallStatus("ended");
      setBusyStateData({
        callId: data?.callId || "",
        targetName: activeCallTargetName || "Colleague",
        targetUserId: activeCallTargetId,
        reason: data?.reason || "User is currently on another call.",
      });
      queryClient.invalidateQueries({ queryKey: ["chat", "calls"] });
    };

    const handleCallTimeout = (data: any) => {
      if (callTimeoutTimerRef.current) {
        clearTimeout(callTimeoutTimerRef.current);
        callTimeoutTimerRef.current = null;
      }
      if (incomingCallTimerRef.current) {
        clearTimeout(incomingCallTimerRef.current);
        incomingCallTimerRef.current = null;
      }
      toast.info(data?.message || "No answer. Call timed out.");
      setIncomingCall(null);
      cleanUpMedia();
      setActiveCallModalOpen(false);
      setCallStatus("ended");
      queryClient.invalidateQueries({ queryKey: ["chat", "calls"] });
    };

    const handleCallSignal = async (data: any) => {
      const { signal } = data;
      const pc = peerConnectionRef.current;
      const curCallId = activeCallIdRef.current || activeCallId;
      if (!pc || !signal || (data?.callId && curCallId && data.callId !== curCallId)) return;

      try {
        if (signal.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          // Drain candidate queue
          while (iceCandidateQueueRef.current.length > 0) {
            const cand = iceCandidateQueueRef.current.shift();
            if (cand) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn("Failed to drain ICE candidate:", e);
              }
            }
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("call:signal", {
            toUserId: data.fromUserId,
            targetUserId: data.fromUserId,
            callId: data.callId || curCallId,
            signal: { type: "answer", sdp: answer },
          });
        } else if (signal.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          // Drain candidate queue
          while (iceCandidateQueueRef.current.length > 0) {
            const cand = iceCandidateQueueRef.current.shift();
            if (cand) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn("Failed to drain ICE candidate:", e);
              }
            }
          }
        } else if (signal.type === "candidate" && signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            iceCandidateQueueRef.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.error("Error processing WebRTC signal:", err);
      }
    };

    const handleCallEnded = (data: any) => {
      if (callTimeoutTimerRef.current) {
        clearTimeout(callTimeoutTimerRef.current);
        callTimeoutTimerRef.current = null;
      }
      if (incomingCallTimerRef.current) {
        clearTimeout(incomingCallTimerRef.current);
        incomingCallTimerRef.current = null;
      }
      toast.info(`Call ended (${formatDuration(data.durationSeconds || 0)}).`);
      cleanUpMedia();
      setActiveCallModalOpen(false);
      setIncomingCall(null);
      setCallStatus("ended");
      queryClient.invalidateQueries({ queryKey: ["chat", "calls"] });
    };

    socket.on("chat:message", handleIncomingMessage);
    socket.on("chat:message_edited", handleMessageEdited);
    socket.on("chat:message_deleted", handleMessageDeleted);
    socket.on("chat:reaction", handleReactionEvent);
    socket.on("chat:poll_updated", handlePollUpdated);
    socket.on("chat:typing", handleTypingEvent);
    socket.on("chat:read", handleReadReceipt);
    socket.on("chat:delivered", handleDeliveredReceipt);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("chat:group_created", handleGroupUpdate);
    socket.on("chat:group_updated", handleGroupUpdate);
    socket.on("chat:system_event", (data: any) => {
      handleGroupUpdate(data);
      if (data?.message) {
        handleIncomingMessage(data.message);
      }
    });

    // Call signaling events
    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:cancelled", handleCallCancelled);
    socket.on("call:busy", handleCallBusy);
    socket.on("call:timeout", handleCallTimeout);
    socket.on("call:signal", handleCallSignal);
    socket.on("call:ended", handleCallEnded);

    // Multi-participant meeting socket events
    socket.on("group-call:incoming", handleIncomingGroupMeeting);
    socket.on("group-call:state_sync", handleGroupStateSync);
    socket.on("group-call:user_joined", handleGroupUserJoined);
    socket.on("group-call:user_left", handleGroupUserLeft);
    socket.on("group-call:media_state", handleGroupMediaState);
    socket.on("group-call:ended", handleGroupMeetingEnded);
    socket.on("group-call:removed", handleGroupMeetingRemoved);

    const handleCallError = (data: any) => {
      console.warn("[CALL:ERROR]", data?.message);
      toast.error(data?.message || "Call action failed.");
      if (callStatus === "ringing" || callStatus === "calling") {
        cleanUpMedia();
        setActiveCallModalOpen(false);
        setIncomingCall(null);
        setCallStatus("ended");
        setActiveCallId("");
      }
    };
    socket.on("call:error", handleCallError);

    const handleMediaState = (data: any) => {
      if (data?.type === "screen-share") {
        setRemoteIsScreenSharing(!!data.active);
        if (data.active) {
          toast.info(`${activeCallTargetName || "Colleague"} started sharing screen`);
        } else {
          toast.info(`${activeCallTargetName || "Colleague"} stopped sharing screen`);
        }
      }
    };
    socket.on("call:media-state", handleMediaState);

    const handlePusherEvent = (event: Event) => {
      const { eventName, data } = (event as CustomEvent).detail || {};
      if (eventName === "call:incoming") handleIncomingCall(data);
      if (eventName === "call:busy") handleCallBusy(data);
      if (eventName === "call:media-state") handleMediaState(data);
      if (eventName === "group-call:incoming") handleIncomingGroupMeeting(data);
      if (eventName === "group-call:ended") handleGroupMeetingEnded(data);
      if (eventName === "group-call:state_sync") handleGroupStateSync(data);
      if (eventName === "group-call:user_joined") handleGroupUserJoined(data);
      if (eventName === "group-call:user_left") handleGroupUserLeft(data);
      if (eventName === "group-call:media_state") handleGroupMediaState(data);
      if (eventName === "chat:message") handleIncomingMessage(data);
      if (eventName === "chat:message_edited") handleMessageEdited(data);
      if (eventName === "chat:message_deleted") handleMessageDeleted(data);
      if (eventName === "chat:reaction") handleReactionEvent(data);
      if (eventName === "chat:poll_updated") handlePollUpdated(data);
      if (eventName === "chat:typing") handleTypingEvent(data);
      if (eventName === "chat:read") handleReadReceipt(data);
      if (eventName === "chat:delivered") handleDeliveredReceipt(data);
    };
    window.addEventListener("hrms:pusher", handlePusherEvent);

    const handleGlobalCallAccepted = (e: Event) => {
      const call = (e as CustomEvent).detail;
      if (!call) return;
      const callData = {
        callId: call.callId,
        fromUserId: call.callerId,
        type: call.callType,
        callerName: call.callerName,
        callerPhone: call.callerPhone,
        callerEmail: call.callerEmail,
        callerAvatarUrl: call.callerAvatar,
        threadId: call.threadId,
      };
      setIncomingCall(callData);
      setTimeout(() => {
        handleAcceptIncomingCallRef.current?.(callData);
      }, 50);
    };
    window.addEventListener("hrms:global-call-accepted", handleGlobalCallAccepted);

    // If navigated from background push notification with ?callId=...
    // REQUIREMENT: Never auto-accept call via URL parameter.
    // Display incoming call ringing dialog/overlay and require explicit user click on "Accept".
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlCallId = params.get("callId");
      if (urlCallId) {
        api.get(`/api/calls/${encodeURIComponent(urlCallId)}/status`).then((res: any) => {
          if (res?.success && res?.data?.status === "ringing") {
            const data = res.data;
            const callData = {
              callId: data.callId,
              fromUserId: data.callerId,
              type: data.callType,
              callerName: data.callerName,
              callerAvatarUrl: data.callerAvatar,
              threadId: data.threadId,
            };
            setIncomingCall(callData);
            // Explicitly do NOT auto-accept. The user must click "Accept" or "Decline".
          }
        }).catch(() => {});
      }
    }

    return () => {
      window.removeEventListener("hrms:global-call-accepted", handleGlobalCallAccepted);
      if (activeThreadId) {
        socket.emit("chat:leave", { threadId: activeThreadId });
      }
      socket.off("chat:message", handleIncomingMessage);
      socket.off("chat:message_edited", handleMessageEdited);
      socket.off("chat:message_deleted", handleMessageDeleted);
      socket.off("chat:reaction", handleReactionEvent);
      socket.off("chat:poll_updated", handlePollUpdated);
      socket.off("chat:typing", handleTypingEvent);
      socket.off("chat:read", handleReadReceipt);
      socket.off("chat:delivered", handleDeliveredReceipt);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("chat:group_created", handleGroupUpdate);
      socket.off("chat:group_updated", handleGroupUpdate);
      socket.off("chat:system_event");

      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:cancelled", handleCallCancelled);
      socket.off("call:busy", handleCallBusy);
      socket.off("call:timeout", handleCallTimeout);
      socket.off("call:signal", handleCallSignal);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:error", handleCallError);
      socket.off("call:media-state", handleMediaState);

      socket.off("group-call:incoming", handleIncomingGroupMeeting);
      socket.off("group-call:state_sync", handleGroupStateSync);
      socket.off("group-call:user_joined", handleGroupUserJoined);
      socket.off("group-call:user_left", handleGroupUserLeft);
      socket.off("group-call:media_state", handleGroupMediaState);
      socket.off("group-call:ended", handleGroupMeetingEnded);
      socket.off("group-call:removed", handleGroupMeetingRemoved);

      window.removeEventListener("hrms:pusher", handlePusherEvent);
    };
  }, [
    activeThreadId,
    currentUserId,
    queryClient,
    cleanUpMedia,
    activeCallTargetId,
    activeCallId,
    startRingtone,
    activeCallTargetName,
    handleIncomingGroupMeeting,
    handleGroupStateSync,
    handleGroupUserJoined,
    handleGroupUserLeft,
    handleGroupMediaState,
    handleGroupMeetingEnded,
    handleGroupMeetingRemoved,
  ]);

  // Mobile PiP & Foreground Continuation Check (visibilitychange does not hang up)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (activeCallModalOpen && peerConnectionRef.current) {
          const state = peerConnectionRef.current.connectionState;
          if (state === "disconnected" || state === "failed") {
            setIsReconnecting(true);
          } else if (state === "connected") {
            setIsReconnecting(false);
          }
        }
        if (isMeetingOpen && meetingLocalStreamRef.current) {
          meetingLocalStreamRef.current.getTracks().forEach((track) => {
            if (track.readyState === "ended") {
              console.warn("Meeting track ended during background; state preserved.");
            }
          });
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [activeCallModalOpen, isMeetingOpen]);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. MUTATIONS & ACTIONS
  // ──────────────────────────────────────────────────────────────────────────

  // Start / Open Direct Conversation
  const startDirectConversationMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res: any = await api.post("/api/chat/conversations/direct", {
        targetUserId,
        participantId: targetUserId,
      });
      return res?.thread || res;
    },
    onSuccess: (thread) => {
      const title = thread.title || thread.name || "Direct Chat";
      setActiveThreadId(thread.threadId);
      setMobilePane("chat");
      setActiveThreadTitle(title);
      setActiveThreadType("direct");
      setActiveTargetUserId(thread.otherParticipantId || thread.targetUserId || "");
      setActiveGroupId("");
      setMode("chats");
      setNewChatOpen(false);
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      toast.success(`Chat opened with ${title}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to start direct conversation");
    },
  });

  // Create Group
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; memberIds: string[]; avatarUrl?: string }) => {
      const res: any = await api.post("/api/chat/groups", data);
      return res?.group || res;
    },
    onSuccess: (group) => {
      toast.success(`Group "${group.name}" created successfully!`);
      setCreateGroupOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setNewGroupAvatarUrl("");
      setNewGroupAvatarMediaId("");
      setSelectedGroupMemberIds([]);
      setGroupFormError("");
      queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });

      setActiveThreadId(`group_${group.id}`);
      setActiveThreadTitle(group.name);
      setActiveThreadType("group");
      setActiveGroupId(group.id);
      setActiveTargetUserId("");
      handleModeSelect("groups");
    },
    onError: (err: any) => {
      setGroupFormError(err?.response?.data?.error || err?.message || "Failed to create group");
      toast.error(err?.response?.data?.error || err?.message || "Failed to create group");
    },
  });

  // Update Group Profile
  const updateGroupMutation = useMutation({
    mutationFn: async (data: { groupId: string; name?: string; description?: string; avatarUrl?: string }) => {
      return api.patch(`/api/chat/groups/${data.groupId}`, {
        name: data.name,
        description: data.description,
        avatarUrl: data.avatarUrl,
      });
    },
    onSuccess: (updatedGroup: any) => {
      toast.success("Group profile updated");
      setIsEditingGroupSidebar(false);
      setEditGroupOpen(false);
      if (updatedGroup?.id) {
        queryClient.setQueryData<GroupItem[]>(["chat", "groups"], (old) => {
          if (!old) return old;
          return old.map((g) => (g.id === updatedGroup.id ? { ...g, ...updatedGroup } : g));
        });
        queryClient.setQueryData<ConversationSummaryItem[]>(["chat", "conversations"], (old) => {
          if (!old) return old;
          return old.map((c) =>
            c.groupId === updatedGroup.id || c.threadId === `group_${updatedGroup.id}`
              ? { ...c, title: updatedGroup.name || c.title, name: updatedGroup.name || c.title, avatarUrl: updatedGroup.avatarUrl !== undefined ? updatedGroup.avatarUrl : c.avatarUrl }
              : c
          );
        });
        if (updatedGroup.name) setActiveThreadTitle(updatedGroup.name);
      }
      queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeThreadId] });
      queryClient.invalidateQueries({ queryKey: ["chat", "group_activity", computedGroupId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to update group profile");
    },
  });

  // Change Member Role (Owner, Admin, Moderator, Member)
  const changeMemberRoleMutation = useMutation({
    mutationFn: async (data: { groupId: string; userId: string; role: string }) => {
      return api.patch(`/api/chat/groups/${data.groupId}/members/${data.userId}/role`, {
        role: data.role,
      });
    },
    onSuccess: () => {
      toast.success("Member role updated");
      queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeThreadId] });
      queryClient.invalidateQueries({ queryKey: ["chat", "group_activity", activeGroupId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to change member role");
    },
  });

  // Remove Member from Group
  const removeMemberMutation = useMutation({
    mutationFn: async (data: { groupId: string; userId: string }) => {
      return api.delete(`/api/chat/groups/${data.groupId}/members/${data.userId}`);
    },
    onSuccess: () => {
      toast.success("Member removed from group");
      queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeThreadId] });
      queryClient.invalidateQueries({ queryKey: ["chat", "group_activity", activeGroupId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to remove member");
    },
  });

  // Transfer Ownership
  const transferOwnershipMutation = useMutation({
    mutationFn: async (data: { groupId: string; newOwnerId: string }) => {
      return api.post(`/api/chat/groups/${data.groupId}/transfer-ownership`, {
        newOwnerId: data.newOwnerId,
      });
    },
    onSuccess: () => {
      toast.success("Ownership transferred successfully");
      setTransferOwnershipOpen(false);
      setSelectedNewOwnerId("");
      queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeThreadId] });
      queryClient.invalidateQueries({ queryKey: ["chat", "group_activity", activeGroupId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to transfer ownership");
    },
  });

  // Leave Group (with last-admin safety)
  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return api.post(`/api/chat/groups/${groupId}/leave`);
    },
    onSuccess: () => {
      toast.success("You have left the group");
      setLeaveGroupOpen(false);
      setActiveThreadId("");
      setActiveGroupId("");
      queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to leave group");
    },
  });

  // Toggle Conversation Pin (User-specific)
  const togglePinConversationMutation = useMutation({
    mutationFn: async (threadId: string) => {
      return api.post(`/api/chat/conversations/${threadId}/pin`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
      toast.success("Pin status updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to update pin status");
    },
  });

  // Toggle Group Mute
  const toggleMuteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return api.post(`/api/chat/groups/${groupId}/mute`);
    },
    onSuccess: (res: any) => {
      toast.success(res?.isMuted ? "Group notifications muted" : "Group notifications unmuted");
      queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to update notification settings");
    },
  });

  // Add Member to Group (supports single and batch additions)
  const addGroupMemberMutation = useMutation({
    mutationFn: async (data: { groupId: string; userId?: string; memberIds?: string[] }) => {
      const ids = Array.isArray(data.memberIds) && data.memberIds.length > 0 ? data.memberIds : data.userId ? [data.userId] : [];
      const res: any = await api.post(`/api/chat/groups/${data.groupId}/members`, {
        memberIds: ids,
        userId: ids[0],
      });
      return res;
    },
    onSuccess: (res: any) => {
      const count = res?.addedCount || (res?.addedMemberIds ? res.addedMemberIds.length : 1);
      toast.success(count > 1 ? `Added ${count} members to group` : "Colleague added to group");
      setAddMemberOpen(false);
      setSelectedAddMemberId("");
      setSelectedAddMemberIds([]);
      setAddMemberSearch("");
      queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeThreadId] });
      queryClient.invalidateQueries({ queryKey: ["chat", "group_activity"] });
      if (activeGroup?.id) {
        queryClient.invalidateQueries({ queryKey: ["chat", "group_activity", activeGroup.id] });
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to add member(s)");
    },
  });

  // Delete Call Log
  const deleteCallLogMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/chat/calls/${id}`);
    },
    onSuccess: () => {
      toast.success("Call record removed");
      queryClient.invalidateQueries({ queryKey: ["chat", "calls"] });
      setViewCallerDetails(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to remove call log");
    },
  });

  // Schedule Calendar Meeting (Authoritative, Integrated)
  const scheduleMeetingMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post("/api/calendar/events", data);
    },
    onSuccess: () => {
      toast.success("Meeting scheduled and invites sent to participants");
      setScheduleMeetingOpen(false);
      setMeetingTitle("");
      setMeetingDescription("");
      setMeetingStartDate("");
      setMeetingEndDate("");
      setMeetingSelectedAttendees([]);
      setMeetingLocation("");
      queryClient.invalidateQueries({ queryKey: ["calendar", "events"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to schedule meeting");
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // WebRTC CALL HANDLERS (Pre-Call Permission, Negotiation, Media Streams)
  // ──────────────────────────────────────────────────────────────────────────

  // Open Pre-Call Device & Permission Setup Screen
  const openPreCallModal = async (
    type: "audio" | "video",
    targetUserId: string,
    name: string,
    phone = "",
    email = ""
  ) => {
    let resolvedTargetId = targetUserId;
    if (!resolvedTargetId && activeThreadId?.startsWith("direct_")) {
      const parts = activeThreadId.slice("direct_".length).split("_");
      resolvedTargetId = parts.find((p) => p !== currentUserId) || parts[0];
    }
    setPreCallType(type);
    setPreCallTarget({ targetUserId: resolvedTargetId, name, phone, email });
    setPreCallModalOpen(true);
    setPreCallPermissionState("checking");
    setPreCallMicMuted(false);
    setPreCallVideoOff(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints(type === "video"));
      setPreCallStream(stream);
      setPreCallPermissionState("granted");

      if (navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios = devices.filter((d) => d.kind === "audioinput");
        const videos = devices.filter((d) => d.kind === "videoinput");
        const outputs = devices.filter((d) => d.kind === "audiooutput");
        setAudioInputDevices(audios);
        setVideoInputDevices(videos);
        setAudioOutputDevices(outputs);
        setSelectedAudioInputId((prev) => (prev && audios.some((a) => a.deviceId === prev) ? prev : audios[0]?.deviceId || ""));
        setSelectedVideoDeviceId((prev) => (prev && videos.some((v) => v.deviceId === prev) ? prev : videos[0]?.deviceId || ""));
        setSelectedAudioOutputId((prev) => (prev && outputs.some((o) => o.deviceId === prev) ? prev : outputs[0]?.deviceId || ""));
      }
    } catch (err: any) {
      console.warn("Pre-call media acquisition error:", err);
      setPreCallPermissionState("denied");
    }
  };

  const closePreCallModal = () => {
    if (preCallStream) {
      preCallStream.getTracks().forEach((t) => t.stop());
      setPreCallStream(null);
    }
    setPreCallModalOpen(false);
    setPreCallTarget(null);
  };

  const retryPreCallPermission = async () => {
    setPreCallPermissionState("checking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints(preCallType === "video"));
      setPreCallStream(stream);
      setPreCallPermissionState("granted");
      if (navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios = devices.filter((d) => d.kind === "audioinput");
        const videos = devices.filter((d) => d.kind === "videoinput");
        const outputs = devices.filter((d) => d.kind === "audiooutput");
        setAudioInputDevices(audios);
        setVideoInputDevices(videos);
        setAudioOutputDevices(outputs);
        setSelectedAudioInputId((prev) => (prev && audios.some((a) => a.deviceId === prev) ? prev : audios[0]?.deviceId || ""));
        setSelectedVideoDeviceId((prev) => (prev && videos.some((v) => v.deviceId === prev) ? prev : videos[0]?.deviceId || ""));
        setSelectedAudioOutputId((prev) => (prev && outputs.some((o) => o.deviceId === prev) ? prev : outputs[0]?.deviceId || ""));
      }
    } catch {
      setPreCallPermissionState("denied");
      toast.error("Permission still denied. Please check your browser address bar.");
    }
  };

  const togglePreCallMic = () => {
    if (preCallStream) {
      const at = preCallStream.getAudioTracks()[0];
      if (at) {
        at.enabled = !at.enabled;
        setPreCallMicMuted(!at.enabled);
      }
    }
  };

  const togglePreCallVideo = () => {
    if (preCallStream) {
      const vt = preCallStream.getVideoTracks()[0];
      if (vt) {
        vt.enabled = !vt.enabled;
        setPreCallVideoOff(!vt.enabled);
      }
    }
  };

  // Pre-Call Live Video Preview Hook
  useEffect(() => {
    if (preCallModalOpen && preCallStream && preCallVideoRef.current && preCallType === "video" && !preCallVideoOff) {
      preCallVideoRef.current.srcObject = preCallStream;
    }
  }, [preCallModalOpen, preCallStream, preCallType, preCallVideoOff]);

  // Main Call Initiation Entrypoint (routes via Pre-Call screen)
  const handleInitiateCall = (
    type: "audio" | "video",
    targetUserId: string,
    name: string,
    phone = "",
    email = ""
  ) => {
    let resolvedTargetId = targetUserId;
    if (!resolvedTargetId && activeThreadId?.startsWith("direct_")) {
      const parts = activeThreadId.slice("direct_".length).split("_");
      resolvedTargetId = parts.find((p) => p !== currentUserId) || parts[0];
    }
    openPreCallModal(type, resolvedTargetId, name, phone, email);
  };

  // Actual Dialing after Pre-Call Confirmation
  const startActualCall = async (
    type: "audio" | "video",
    targetUserId: string,
    name: string,
    phone = "",
    email = "",
    passedStream?: MediaStream | null,
    initialMicMuted = false,
    initialVideoOff = false
  ) => {
    try {
      let resolvedTargetId = targetUserId;
      if (!resolvedTargetId && activeThreadId?.startsWith("direct_")) {
        const parts = activeThreadId.slice("direct_".length).split("_");
        resolvedTargetId = parts.find((p) => p !== currentUserId) || parts[0];
      }

      let stream = passedStream;
      if (!stream || stream.getTracks().length === 0) {
        stream = await navigator.mediaDevices.getUserMedia(mediaConstraints(type === "video"));
      }

      localStreamRef.current = stream;
      setActiveCallType(type);
      setActiveCallTargetName(name);
      setActiveCallTargetPhone(phone);
      setActiveCallTargetEmail(email);
      setActiveCallTargetId(resolvedTargetId);
      setActiveCallRole("caller");
      setCallStatus("calling");
      setCallDurationSeconds(0);
      setIsMuted(initialMicMuted);
      setIsVideoOff(initialVideoOff);
      setActiveCallModalOpen(true);

      if (initialMicMuted) {
        const at = stream.getAudioTracks()[0];
        if (at) at.enabled = false;
      }
      if (initialVideoOff) {
        const vt = stream.getVideoTracks()[0];
        if (vt) vt.enabled = false;
      }

      // Create WebRTC Peer Connection with STUN
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerConnectionRef.current = pc;

      // Add local media tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream!));

      if (type === "video" && localVideoRef.current && !initialVideoOff) {
        localVideoRef.current.srcObject = stream;
      }

      const callId = `call_${Date.now()}`;
      setActiveCallId(callId);
      const socket = getSocketClient();
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("call:signal", {
            toUserId: resolvedTargetId,
            targetUserId: resolvedTargetId,
            callId,
            signal: { type: "candidate", candidate: event.candidate },
          });
        }
      };

      pc.ontrack = (event) => {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        event.streams[0]?.getTracks().forEach((track) => {
          if (!remoteStreamRef.current!.getTracks().some((t) => t.id === track.id)) {
            remoteStreamRef.current!.addTrack(track);
          }
        });
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStreamRef.current;
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallStatus("connected");
        }
      };

      // Server-authoritative 60-second ringing timeout
      if (callTimeoutTimerRef.current) clearTimeout(callTimeoutTimerRef.current);
      callTimeoutTimerRef.current = setTimeout(() => {
        const s = getSocketClient();
        if (s && resolvedTargetId) {
          s.emit("call:timeout", {
            toUserId: resolvedTargetId,
            targetUserId: resolvedTargetId,
            callId,
            callType: type,
          });
        }
        toast.info("No answer. Call timed out.");
        cleanUpMedia();
        setActiveCallModalOpen(false);
        setCallStatus("ended");
        queryClient.invalidateQueries({ queryKey: ["chat", "calls"] });
      }, 60000);

      if (socket) {
        socket.emit("call:invite", {
          toUserId: resolvedTargetId,
          targetUserId: resolvedTargetId,
          callId,
          type,
          callType: type,
          callerName: (currentUser as any)?.profile?.fullName || (currentUser as any)?.name || currentUser?.email || "Colleague",
          callerPhone: phone,
          callerEmail: currentUser?.email,
          callerAvatarUrl: (currentUser as any)?.avatarUrl,
          threadId: activeThreadId,
        });
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast.error("Microphone/Camera permission denied.");
      } else {
        toast.error(`Media device error: ${err.message || "Failed to access devices"}`);
      }
      cleanUpMedia();
    }
  };

  // Screen Sharing Toggle
  const toggleScreenShare = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (originalVideoTrackRef.current && localStreamRef.current) {
        const senders = pc.getSenders();
        const vs = senders.find((s) => s.track?.kind === "video");
        if (vs) {
          await vs.replaceTrack(originalVideoTrackRef.current);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
      setIsScreenSharing(false);
      const socket = getSocketClient();
      if (socket && (activeCallIdRef.current || activeCallId)) {
        socket.emit("call:media-state", {
          callId: activeCallIdRef.current || activeCallId,
          targetUserId: activeCallTargetId,
          type: "screen-share",
          active: false,
        });
      }
      toast.info("Screen sharing ended");
    } else {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          toast.error("Screen sharing not supported on this browser.");
          return;
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) return;

        screenStreamRef.current = screenStream;
        const senders = pc.getSenders();
        const vs = senders.find((s) => s.track?.kind === "video");
        if (vs) {
          if (!originalVideoTrackRef.current) {
            originalVideoTrackRef.current = vs.track;
          }
          await vs.replaceTrack(screenTrack);
        }

        screenTrack.onended = async () => {
          if (originalVideoTrackRef.current && pc.signalingState !== "closed") {
            const curSenders = pc.getSenders();
            const curVs = curSenders.find((s) => s.track?.kind === "video");
            if (curVs) {
              await curVs.replaceTrack(originalVideoTrackRef.current);
            }
            if (localVideoRef.current && localStreamRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
          }
          setIsScreenSharing(false);
          screenStreamRef.current = null;
          const sock = getSocketClient();
          if (sock && (activeCallIdRef.current || activeCallId)) {
            sock.emit("call:media-state", {
              callId: activeCallIdRef.current || activeCallId,
              targetUserId: activeCallTargetId,
              type: "screen-share",
              active: false,
            });
          }
        };

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
        const socket = getSocketClient();
        if (socket && (activeCallIdRef.current || activeCallId)) {
          socket.emit("call:media-state", {
            callId: activeCallIdRef.current || activeCallId,
            targetUserId: activeCallTargetId,
            type: "screen-share",
            active: true,
          });
        }
        toast.success("Screen sharing started");
      } catch (err: any) {
        if (err.name !== "NotAllowedError") {
          toast.error("Screen sharing error: " + (err.message || "Failed"));
        }
      }
    }
  };

  // Switch Camera Device (Front / Back / Multi-device)
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");
  const switchCamera = async () => {
    const pc = peerConnectionRef.current;
    const isMobile = typeof window !== "undefined" && (
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
    );

    try {
      let videoConstraint: any;
      if (videoInputDevices.length >= 2) {
        const curIdx = videoInputDevices.findIndex((d) => d.deviceId === selectedVideoDeviceId);
        const nextDev = videoInputDevices[(curIdx + 1) % videoInputDevices.length];
        videoConstraint = { deviceId: { exact: nextDev.deviceId } };
        setSelectedVideoDeviceId(nextDev.deviceId);
      } else if (isMobile) {
        const nextMode = cameraFacingMode === "user" ? "environment" : "user";
        videoConstraint = { facingMode: { exact: nextMode } };
        setCameraFacingMode(nextMode);
      } else {
        toast.info("No alternate camera available.");
        return;
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...videoConstraint,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
      });
      const newTrack = newStream.getVideoTracks()[0];
      if (newTrack) {
        if (localStreamRef.current) {
          const oldTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldTrack) {
            localStreamRef.current.removeTrack(oldTrack);
            oldTrack.stop();
          }
          localStreamRef.current.addTrack(newTrack);
        }
        if (pc) {
          const vs = pc.getSenders().find((s) => s.track?.kind === "video");
          if (vs) {
            await vs.replaceTrack(newTrack);
          }
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current || newStream;
        }
        toast.success("Camera switched successfully");
      }
    } catch (err: any) {
      console.warn("Camera switch error:", err);
      toast.error("Camera switch error: " + err.message);
    }
  };

  // Accept Incoming Call (Callee)
  const handleAcceptIncomingCall = async (callOverride?: any) => {
    const targetCall = callOverride || incomingCall;
    if (!targetCall) return;
    stopRingtone();
    if (incomingCallTimerRef.current) {
      clearTimeout(incomingCallTimerRef.current);
      incomingCallTimerRef.current = null;
    }

    try {
      const isVideoCall = targetCall.type === "video";
      let stream: MediaStream | null = null;
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia(mediaConstraints(isVideoCall));
        }
      } catch (mediaErr: any) {
        console.warn("Could not capture device media, continuing call:", mediaErr.message);
      }

      localStreamRef.current = stream;
      setActiveCallType(targetCall.type);
      setActiveCallTargetName(targetCall.callerName);
      setActiveCallTargetPhone(targetCall.callerPhone || "");
      setActiveCallTargetEmail(targetCall.callerEmail || "");
      setActiveCallTargetId(targetCall.fromUserId);
      setActiveCallId(targetCall.callId);
      setActiveCallRole("callee");
      setCallStatus("connected");
      setCallDurationSeconds(0);
      setIsMuted(false);
      setIsVideoOff(!stream || !stream.getVideoTracks().some((t) => t.enabled));
      setActiveCallModalOpen(true);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerConnectionRef.current = pc;

      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      if (isVideoCall && localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
      }

      const socket = getSocketClient();
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("call:signal", {
            toUserId: targetCall.fromUserId,
            targetUserId: targetCall.fromUserId,
            callId: targetCall.callId,
            signal: { type: "candidate", candidate: event.candidate },
          });
        }
      };

      pc.ontrack = (event) => {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        event.streams[0]?.getTracks().forEach((t) => {
          if (!remoteStreamRef.current!.getTracks().some((tr) => tr.id === t.id)) {
            remoteStreamRef.current!.addTrack(t);
          }
        });
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStreamRef.current;
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallStatus("connected");
        }
      };

      // Emit accept
      if (socket) {
        socket.emit("call:accept", {
          toUserId: targetCall.fromUserId,
          callId: targetCall.callId,
        });
      }

      setIncomingCall(null);
    } catch (err: any) {
      toast.error(`Permission denied or device error: ${err.message}`);
      handleRejectIncomingCall("permission_denied");
    }
  };
  handleAcceptIncomingCallRef.current = handleAcceptIncomingCall;

  // Reject Incoming Call
  const handleRejectIncomingCall = (reason = "declined") => {
    stopRingtone();
    if (incomingCallTimerRef.current) {
      clearTimeout(incomingCallTimerRef.current);
      incomingCallTimerRef.current = null;
    }
    if (!incomingCall) return;
    try {
      const socket = getSocketClient();
      if (socket) {
        socket.emit("call:reject", {
          toUserId: incomingCall.fromUserId,
          targetUserId: incomingCall.fromUserId,
          callId: incomingCall.callId,
          reason,
        });
      }
    } catch {}
    setIncomingCall(null);
  };

  // End / Cancel Call
  const handleEndCall = async () => {
    const finalDuration = callDurationSeconds;
    setActiveCallModalOpen(false);

    try {
      const socket = getSocketClient();
      if (socket && activeCallTargetId) {
        if (callStatus === "calling" || callStatus === "ringing") {
          socket.emit("call:cancel", {
            toUserId: activeCallTargetId,
            callId: activeCallId,
          });
        } else {
          socket.emit("call:hangup", {
            toUserId: activeCallTargetId,
            callId: activeCallId,
            durationSeconds: finalDuration,
          });
        }
      }

      if (activeCallId) {
        await api.post("/api/chat/calls", {
          callSessionId: activeCallId,
          callerId: activeCallRole === "caller" ? currentUserId : activeCallTargetId,
          callerName: activeCallRole === "caller" ? ((currentUser as any)?.profile?.fullName || (currentUser as any)?.name || currentUser?.email || "Colleague") : (activeCallTargetName || "Colleague"),
          callerPhone: activeCallTargetPhone || "Internal Call",
          callerEmail: activeCallRole === "caller" ? currentUser?.email : activeCallTargetEmail,
          callerAvatarUrl: (currentUser as any)?.avatarUrl,
          receiverId: activeCallRole === "caller" ? activeCallTargetId : currentUserId,
          receiverName: activeCallRole === "caller" ? (activeCallTargetName || "Colleague") : ((currentUser as any)?.profile?.fullName || (currentUser as any)?.name || currentUser?.email || "Colleague"),
          direction: activeCallRole === "caller" ? "outgoing" : "incoming",
          callType: activeCallType,
          durationSeconds: Math.max(finalDuration, 1),
          status: "completed",
          notes: `${activeCallType === "video" ? "Video conference" : "Voice call"} session from Chat interface.`,
        }).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ["chat", "calls"] });
      toast.info(`Call ended (${formatDuration(finalDuration)}). Logged to call history.`);
    } catch {
      toast.info("Call ended.");
    } finally {
      cleanUpMedia();
    }
  };

  // Toggle Mic
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
    const socket = getSocketClient();
    const cId = activeCallIdRef.current || activeCallId;
    if (socket && cId && activeCallTargetId) {
      socket.emit("call:media-state", {
        callId: cId,
        targetUserId: activeCallTargetId,
        type: "audio-mute",
        active: nextMuted,
      });
    }
  };

  // Toggle Video Camera
  const toggleVideo = () => {
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !nextVideoOff;
      });
    }
    const socket = getSocketClient();
    const cId = activeCallIdRef.current || activeCallId;
    if (socket && cId && activeCallTargetId) {
      socket.emit("call:media-state", {
        callId: cId,
        targetUserId: activeCallTargetId,
        type: "video-mute",
        active: nextVideoOff,
      });
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VOICE NOTE RECORDING (MediaRecorder)
  // ──────────────────────────────────────────────────────────────────────────
  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Audio recording not supported on this browser.");
      return;
    }

    try {
      if (voicePreviewUrl) {
        URL.revokeObjectURL(voicePreviewUrl);
        setVoicePreviewUrl(null);
        setVoicePreviewBlob(null);
      }
      setIsPlayingVoicePreview(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = "audio/webm";
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else {
          mimeType = "";
        }
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start(250);
      setIsRecordingVoice(true);
      setVoiceDuration(0);

      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = setInterval(() => {
        setVoiceDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      toast.error("Microphone access denied for recording voice note.");
    }
  };

  const stopVoiceRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;

    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }

    const mr = mediaRecorderRef.current;
    mr.onstop = () => {
      try {
        mr.stream.getTracks().forEach((track) => track.stop());
      } catch {}
      const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" });
      if (blob.size === 0) {
        toast.error("No audio recorded.");
        setIsRecordingVoice(false);
        setVoiceDuration(0);
        return;
      }
      const previewUrl = URL.createObjectURL(blob);
      setVoicePreviewBlob(blob);
      setVoicePreviewUrl(previewUrl);
      setIsRecordingVoice(false);
    };

    mr.stop();
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    if (voicePreviewUrl) {
      URL.revokeObjectURL(voicePreviewUrl);
      setVoicePreviewUrl(null);
      setVoicePreviewBlob(null);
    }
    if (voicePreviewAudioRef.current) {
      voicePreviewAudioRef.current.pause();
    }
    audioChunksRef.current = [];
    setIsRecordingVoice(false);
    setIsPlayingVoicePreview(false);
    setVoiceDuration(0);
  };

  const togglePlayVoicePreview = () => {
    if (!voicePreviewAudioRef.current) return;
    if (isPlayingVoicePreview) {
      voicePreviewAudioRef.current.pause();
      setIsPlayingVoicePreview(false);
    } else {
      voicePreviewAudioRef.current.play().catch(() => {});
      setIsPlayingVoicePreview(true);
    }
  };

  const sendVoiceRecording = async () => {
    let blobToSend = voicePreviewBlob;
    let durationToSend = voiceDuration;

    if (isRecordingVoice && mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
      const mr = mediaRecorderRef.current;
      await new Promise<void>((resolve) => {
        mr.onstop = () => {
          try {
            mr.stream.getTracks().forEach((track) => track.stop());
          } catch {}
          blobToSend = new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" });
          resolve();
        };
        mr.stop();
      });
      setIsRecordingVoice(false);
    }

    if (!blobToSend || blobToSend.size === 0) {
      toast.error("No audio recorded to send.");
      cancelVoiceRecording();
      return;
    }

    if (blobToSend.size > 30 * 1024 * 1024) {
      toast.error("Voice note exceeds 30 MB size limit.");
      cancelVoiceRecording();
      return;
    }

    const tempId = `temp_voice_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const localPreviewUrl = voicePreviewUrl || URL.createObjectURL(blobToSend);

    // Optimistic voice message
    const optimisticVoiceItem: ChatMessageItem = {
      id: tempId,
      clientTempId: tempId,
      senderId: currentUserId,
      senderName: (currentUser as any)?.profile?.fullName || (currentUser as any)?.name || "Me",
      content: "",
      voiceNote: {
        url: localPreviewUrl,
        durationSeconds: Math.max(durationToSend, 1),
        size: blobToSend.size,
      },
      types: "sent",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: new Date().toISOString(),
      status: "pending",
      deliveryStatus: "sent",
      isOptimistic: true,
    };

    setOptimisticMessages((prev) => [...prev, optimisticVoiceItem]);
    cancelVoiceRecording();
    scrollToBottom(true);

    try {
      const ext = blobToSend.type.includes("mp4") ? "mp4" : "webm";
      const audioFile = new File([blobToSend], `voice_note_${Date.now()}.${ext}`, {
        type: blobToSend.type || "audio/webm",
      });

      const formData = new FormData();
      formData.append("files", audioFile);
      const uploadRes: any = await api.upload("/api/chat/upload", formData);
      const uploadedFile = (uploadRes?.files || uploadRes?.data || [])[0];

      if (!uploadedFile?.url) {
        throw new Error("Failed to upload voice message file.");
      }

      const res: any = await api.post("/api/chat/messages", {
        threadId: activeThreadId,
        content: "",
        clientTempId: tempId,
        recipientId: activeThreadType === "direct" ? activeTargetUserId : undefined,
        groupId: activeThreadType === "group" ? activeGroupId : undefined,
        voiceNote: {
          url: uploadedFile.url,
          durationSeconds: Math.max(durationToSend, 1),
          size: audioFile.size,
        },
      });

      const canonicalMsg = res?.message || res;
      setOptimisticMessages((prev) =>
        prev.filter((m) => m.clientTempId !== tempId && m.id !== tempId && m.id !== canonicalMsg?.id)
      );

      // Instant cache update
      const formattedCanonical = formatMessageItem(canonicalMsg, currentUserId);
      queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
        if (!old) return { messages: [formattedCanonical], hasMore: false };
        const list = Array.isArray(old.messages) ? old.messages : [];
        const exists = list.some((m: any) => m.id === formattedCanonical.id || (formattedCanonical.clientTempId && m.clientTempId === formattedCanonical.clientTempId));
        if (exists) {
          return {
            ...old,
            messages: list.map((m: any) =>
              m.id === formattedCanonical.id || (formattedCanonical.clientTempId && m.clientTempId === formattedCanonical.clientTempId)
                ? formattedCanonical
                : m
            ),
          };
        }
        return {
          ...old,
          messages: [...list, formattedCanonical],
        };
      });
      scrollToBottom(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to deliver voice note.");
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.clientTempId === tempId ? { ...m, status: "failed" } : m))
      );
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // FILE ATTACHMENTS & DRAG-AND-DROP
  // ──────────────────────────────────────────────────────────────────────────
  // FILE ATTACHMENTS & MEDIA LIBRARY INTEGRATION & PREVIEWS
  // ──────────────────────────────────────────────────────────────────────────
  const createPendingItem = (file: File): ComposerAttachmentItem => {
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
    let previewUrl = "";
    if (isImage || isPdf) {
      try {
        previewUrl = URL.createObjectURL(file);
      } catch {}
    }
    return {
      id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      file,
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      previewUrl,
      isUploaded: false,
    };
  };

  const handleFilesSelected = (files: FileList | File[]) => {
    const list = Array.from(files);
    const validItems: ComposerAttachmentItem[] = [];

    const RESTRICTED = [
      ".exe", ".bat", ".cmd", ".sh", ".php", ".js", ".py", ".env", ".vbs",
      ".bin", ".msi", ".apk", ".com", ".ps1", ".jar", ".html", ".htm"
    ];
    for (const f of list) {
      const ext = "." + (f.name.split(".").pop() || "").toLowerCase();
      if (RESTRICTED.includes(ext) || f.name.toLowerCase().startsWith(".env")) {
        toast.error(`Security restriction: Executable / script file "${f.name}" is blocked.`);
        continue;
      }
      if (f.size > 30 * 1024 * 1024) {
        toast.error(`File "${f.name}" exceeds 30 MB size limit.`);
        continue;
      }
      validItems.push(createPendingItem(f));
    }

    if (validItems.length > 0) {
      setComposerAttachments((prev) => [...prev, ...validItems]);
      setPendingAttachments((prev) => [...prev, ...validItems.map((v) => v.file!).filter(Boolean)]);
      toast.success(`${validItems.length} file(s) attached.`);
    }
  };

  const handleSelectFromMediaLibrary = (media: MediaFileItem) => {
    if (mediaPickerPurpose === "newGroup") {
      setNewGroupAvatarUrl(media.url);
      setNewGroupAvatarMediaId(media.id);
      setMediaPickerOpen(false);
      toast.success("Group avatar selected from Media Library");
      return;
    }
    if (mediaPickerPurpose === "editGroup") {
      setEditGroupAvatarUrl(media.url);
      setEditGroupAvatarMediaId(media.id);
      setMediaPickerOpen(false);
      toast.success("Group avatar selected from Media Library");
      return;
    }

    const item: ComposerAttachmentItem = {
      id: `media_${media.id}`,
      mediaFile: media,
      name: media.fileName || media.originalName || "Asset",
      size: media.fileSize || media.sizeBytes || 0,
      mimeType: media.mimeType || "application/octet-stream",
      previewUrl: media.url,
      isUploaded: true,
    };
    setComposerAttachments((prev) => [...prev, item]);
    setMediaPickerOpen(false);
    toast.success(`Attached "${item.name}" from Media Library`);
  };

  const removeComposerAttachment = (index: number) => {
    setComposerAttachments((prev) => {
      const target = prev[index];
      if (target?.previewUrl && target.file) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {}
      }
      const updated = prev.filter((_, i) => i !== index);
      setPendingAttachments(updated.map((u) => u.file!).filter(Boolean));
      return updated;
    });
  };

  const replaceComposerAttachment = (index: number, newFile: File) => {
    const newItem = createPendingItem(newFile);
    setComposerAttachments((prev) => {
      const old = prev[index];
      if (old?.previewUrl && old.file) {
        try {
          URL.revokeObjectURL(old.previewUrl);
        } catch {}
      }
      const copy = [...prev];
      copy[index] = newItem;
      setPendingAttachments(copy.map((u) => u.file!).filter(Boolean));
      return copy;
    });
  };

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      composerAttachments.forEach((att) => {
        if (att.previewUrl && att.file) {
          try {
            URL.revokeObjectURL(att.previewUrl);
          } catch {}
        }
      });
    };
  }, [composerAttachments]);

  // In-App Attachment Viewer opener
  const openAttachmentViewer = (attachments: any[], index: number = 0) => {
    if (!attachments || attachments.length === 0) return;
    setActiveViewer({
      items: attachments.map((a) => ({
        url: a.url,
        name: a.name || a.fileName || "Attachment",
        size: a.size || a.fileSize,
        mimeType: a.mimeType,
      })),
      currentIndex: Math.max(0, Math.min(index, attachments.length - 1)),
      zoom: 1,
    });
  };

  // Keyboard navigation for attachment viewer
  useEffect(() => {
    if (!activeViewer) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveViewer(null);
      } else if (e.key === "ArrowLeft") {
        setActiveViewer((prev) =>
          prev && prev.items.length > 1
            ? { ...prev, currentIndex: (prev.currentIndex - 1 + prev.items.length) % prev.items.length, zoom: 1 }
            : prev
        );
      } else if (e.key === "ArrowRight") {
        setActiveViewer((prev) =>
          prev && prev.items.length > 1
            ? { ...prev, currentIndex: (prev.currentIndex + 1) % prev.items.length, zoom: 1 }
            : prev
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeViewer]);

  // Group Avatar Upload Handler
  const handleGroupAvatarUpload = async (file: File, purpose: "newGroup" | "editGroup") => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP, GIF).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file exceeds 10MB limit.");
      return;
    }

    setIsUploadingGroupAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "Chat/Images");
      let uploadedUrl = "";
      let uploadedId = "";
      try {
        const res: any = await api.upload("/api/v1/media/upload", formData);
        const media = res?.data || res;
        uploadedUrl = media?.url || media?.files?.[0]?.url || media?.file?.url;
        uploadedId = media?.id || media?.files?.[0]?.id || media?.files?.[0]?.mediaId || media?.mediaId;
      } catch {
        // Fallback to /api/chat/upload
        const chatFormData = new FormData();
        chatFormData.append("files", file);
        const res2: any = await api.upload("/api/chat/upload", chatFormData);
        const fileObj = (res2?.files || res2?.data?.files || res2?.data || [])[0] || res2;
        uploadedUrl = fileObj?.url;
        uploadedId = fileObj?.id || fileObj?.mediaId;
      }

      if (!uploadedUrl) {
        throw new Error("Upload did not return a valid media URL");
      }

      if (purpose === "newGroup") {
        setNewGroupAvatarUrl(uploadedUrl);
        setNewGroupAvatarMediaId(uploadedId || "");
      } else {
        setEditGroupAvatarUrl(uploadedUrl);
        setEditGroupAvatarMediaId(uploadedId || "");
      }
      toast.success("Group avatar uploaded successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || "Failed to upload group avatar");
    } finally {
      setIsUploadingGroupAvatar(false);
    }
  };

  // Paste image handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        handleFilesSelected(files);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // SEND MESSAGE HANDLER (Resilient with Centralized Media Storage)
  // ──────────────────────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    const totalPendingCount = composerAttachments.length;
    if (isSending) return;
    if (!messageInput.trim() && totalPendingCount === 0) return;
    if (!activeThreadId) return;

    setIsSending(true);
    const content = messageInput.trim();
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const replyTarget = replyingToMessage;
    const currentAttachments = [...composerAttachments];

    // Detect @mentions if in group chat
    let mentions: string[] = [];
    if (activeThreadType === "group" && activeGroup) {
      const mentionMatches = content.match(/@(\w+)/g) || [];
      if (mentionMatches.length > 0) {
        const memberNames = (activeGroup.members || []).map((m) => ({
          userId: m.userId,
          nameLower: (m.name || "").toLowerCase().replace(/\s+/g, ""),
        }));
        for (const match of mentionMatches) {
          const cleanName = match.slice(1).toLowerCase();
          const found = memberNames.find((m) => m.nameLower.includes(cleanName));
          if (found && !mentions.includes(found.userId)) {
            mentions.push(found.userId);
          }
        }
      }
    }

    // Optimistic item
    const optimisticItem: ChatMessageItem = {
      id: tempId,
      clientTempId: tempId,
      senderId: currentUserId,
      senderName: (currentUser as any)?.profile?.fullName || (currentUser as any)?.name || "Me",
      content,
      attachments: currentAttachments.map((a) => ({
        id: a.id,
        name: a.name,
        size: a.size,
        mimeType: a.mimeType,
        url: a.previewUrl || a.mediaFile?.url || "",
      })),
      types: "sent",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: new Date().toISOString(),
      status: "pending",
      deliveryStatus: "sent",
      isOptimistic: true,
      mentions,
      replyTo: replyTarget
        ? {
            id: replyTarget.id,
            senderName: replyTarget.senderName,
            content: replyTarget.content,
          }
        : null,
    };

    setOptimisticMessages((prev) => [...prev, optimisticItem]);
    scrollToBottom(true);

    try {
      let uploadedAttachments: any[] = [];
      const filesToUpload = currentAttachments.filter((a) => a.file && !a.isUploaded);
      const existingMediaFiles = currentAttachments.filter((a) => a.mediaFile);

      // 1. Existing Media Library records
      for (const m of existingMediaFiles) {
        if (m.mediaFile) {
          uploadedAttachments.push({
            id: m.mediaFile.id,
            mediaId: m.mediaFile.id,
            url: m.mediaFile.url,
            name: m.mediaFile.fileName || m.mediaFile.originalName || m.name,
            fileName: m.mediaFile.fileName || m.mediaFile.originalName || m.name,
            size: m.mediaFile.fileSize || m.mediaFile.sizeBytes || m.size,
            fileSize: m.mediaFile.fileSize || m.mediaFile.sizeBytes || m.size,
            mimeType: m.mediaFile.mimeType || m.mimeType,
            folder: m.mediaFile.folder,
          });
        }
      }

      // 2. Upload un-uploaded files to Media Library
      if (filesToUpload.length > 0) {
        const formData = new FormData();
        filesToUpload.forEach((f) => {
          if (f.file) formData.append("files", f.file);
        });
        const uploadRes: any = await api.upload("/api/chat/upload", formData);
        const serverFiles = uploadRes?.files || uploadRes?.data || [];
        uploadedAttachments = [...uploadedAttachments, ...serverFiles];
      }

      // 3. Post message with all attachments
      const res: any = await api.post("/api/chat/messages", {
        threadId: activeThreadId,
        content,
        clientTempId: tempId,
        recipientId: activeThreadType === "direct" ? activeTargetUserId : undefined,
        groupId: activeThreadType === "group" ? activeGroupId : undefined,
        replyToId: replyTarget?.id,
        attachments: uploadedAttachments,
        mentions,
      });

      // Clear composer only after successful upload and submission
      currentAttachments.forEach((att) => {
        if (att.previewUrl && att.file) {
          try {
            URL.revokeObjectURL(att.previewUrl);
          } catch {}
        }
      });
      setComposerAttachments([]);
      setPendingAttachments([]);
      setReplyingToMessage(null);
      setMessageInput("");
      setMentionQuery(null);

      // Clear or reconcile optimistic message immediately upon server confirmation
      const canonicalMsg = res?.message || res;
      setOptimisticMessages((prev) =>
        prev.filter((m) => m.clientTempId !== tempId && m.id !== tempId && m.id !== canonicalMsg?.id)
      );

      // Instant cache update
      queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
        if (!old || !old.messages) return old;
        const exists = old.messages.some((m: any) => m.id === canonicalMsg.id || (canonicalMsg.clientTempId && m.clientTempId === canonicalMsg.clientTempId));
        if (exists) {
          return {
            ...old,
            messages: old.messages.map((m: any) =>
              m.id === canonicalMsg.id || (canonicalMsg.clientTempId && m.clientTempId === canonicalMsg.clientTempId)
                ? canonicalMsg
                : m
            ),
          };
        }
        return {
          ...old,
          messages: [...old.messages, canonicalMsg],
        };
      });

      // Update conversations list last message
      queryClient.setQueryData(["chat", "conversations"], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((c: any) =>
          c.threadId === activeThreadId
            ? {
                ...c,
                lastMessage: canonicalMsg.content || (canonicalMsg.attachments?.length ? "Shared attachment" : (canonicalMsg.voiceNote ? "Voice message" : "Message")),
                lastMessageTime: canonicalMsg.createdAt || new Date().toISOString(),
              }
            : c
        );
      });
      scrollToBottom(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to send message");
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.clientTempId === tempId ? { ...m, status: "failed" } : m))
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending) {
        handleSendMessage();
      }
    } else {
      try {
        const socket = getSocketClient();
        if (socket && activeThreadId) {
          socket.emit("chat:typing", { threadId: activeThreadId, isTyping: true });
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            socket.emit("chat:typing", { threadId: activeThreadId, isTyping: false });
          }, 2000);
        }
      } catch {}
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MESSAGE INTERACTIONS: PIN, REACT, EDIT, DELETE, POLL
  // ──────────────────────────────────────────────────────────────────────────
  const handleTogglePin = async (messageId: string) => {
    try {
      await api.post(`/api/chat/messages/${messageId}/pin`);
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeThreadId] });
      toast.success("Pinned status updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to pin message");
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    const myName = (currentUser as any)?.profile?.fullName || (currentUser as any)?.name || "Me";
    const myAvatar = (currentUser as any)?.profile?.avatarUrl || null;

    // Instant optimistic update
    queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
      if (!old || !old.messages) return old;
      return {
        ...old,
        messages: old.messages.map((m: any) => {
          if (m.id !== messageId) return m;
          const currentReactions: NormalizedReaction[] = normalizeReactions(m.reactions, currentUserId);
          const existingIdx = currentReactions.findIndex((r) => r.emoji === emoji);
          let nextReactions: NormalizedReaction[];

          if (existingIdx >= 0) {
            const target = currentReactions[existingIdx];
            if (target.hasReacted) {
              const newUsers = (target.users || []).filter((u) => u.userId !== currentUserId);
              const newUserIds = target.userIds.filter((id) => id !== currentUserId);
              if (newUserIds.length === 0) {
                nextReactions = currentReactions.filter((_, idx) => idx !== existingIdx);
              } else {
                nextReactions = currentReactions.map((r, idx) =>
                  idx === existingIdx
                    ? { ...r, count: newUserIds.length, userIds: newUserIds, users: newUsers, hasReacted: false }
                    : r
                );
              }
            } else {
              const newUsers = [...(target.users || []), { userId: currentUserId, fullName: myName, avatarUrl: myAvatar }];
              const newUserIds = [...target.userIds, currentUserId];
              nextReactions = currentReactions.map((r, idx) =>
                idx === existingIdx
                  ? { ...r, count: newUserIds.length, userIds: newUserIds, users: newUsers, hasReacted: true }
                  : r
              );
            }
          } else {
            nextReactions = [
              ...currentReactions,
              {
                emoji,
                count: 1,
                userIds: [currentUserId],
                users: [{ userId: currentUserId, fullName: myName, avatarUrl: myAvatar }],
                hasReacted: true,
              },
            ];
          }
          return {
            ...m,
            reactions: nextReactions,
          };
        }),
      };
    });

    try {
      const res: any = await api.post(`/api/chat/messages/${messageId}/react`, { emoji });
      if (res?.reactions) {
        queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
          if (!old || !old.messages) return old;
          return {
            ...old,
            messages: old.messages.map((m: any) =>
              m.id === messageId ? { ...m, reactions: res.reactions } : m
            ),
          };
        });
      }
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeThreadId] });
      toast.error("Failed to add reaction");
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !editingContent.trim()) return;
    try {
      await api.patch(`/api/chat/messages/${editingMessage.id}`, {
        content: editingContent.trim(),
      });
      queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
        if (!old || !old.messages) return old;
        return {
          ...old,
          messages: old.messages.map((m: any) =>
            m.id === editingMessage.id ? { ...m, content: editingContent.trim(), isEdited: true } : m
          ),
        };
      });
      setEditingMessage(null);
      setEditingContent("");
      toast.success("Message edited");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to edit message");
    }
  };

  const handleDeleteMessage = async (messageId: string, mode: "me" | "everyone") => {
    // Instant optimistic removal or tombstone update
    queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
      if (!old || !old.messages) return old;
      if (mode === "me") {
        return {
          ...old,
          messages: old.messages.filter((m: any) => m.id !== messageId),
        };
      } else {
        return {
          ...old,
          messages: old.messages.map((m: any) =>
            m.id === messageId
              ? {
                  ...m,
                  isDeletedForEveryone: true,
                  content: "This message was deleted",
                  attachments: null,
                  voiceNote: null,
                  poll: null,
                  reactions: null,
                  urlPreviews: null,
                }
              : m
          ),
        };
      }
    });

    try {
      await api.delete(`/api/chat/messages/${messageId}?mode=${mode}`);
      toast.success(mode === "everyone" ? "Message deleted for everyone" : "Message hidden for you");
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeThreadId] });
      toast.error(err?.response?.data?.error || "Failed to delete message");
    }
  };

  
  const handleBatchForwardMessage = async () => {
    if (!forwardMessage || selectedForwardThreadIds.length === 0 || isForwarding) return;
    setIsForwarding(true);
    try {
      const res: any = await api.post("/api/chat/messages/forward-batch", {
        messageId: forwardMessage.id,
        targetThreadIds: selectedForwardThreadIds,
      });
      if (res?.success) {
        toast.success(`Message forwarded to ${res.forwardedCount} conversation${res.forwardedCount > 1 ? "s" : ""}`);
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

  const handleForwardMessage = async () => {
    if (!forwardMessage || !forwardTargetThreadId) return;
    try {
      await api.post("/api/chat/messages", {
        threadId: forwardTargetThreadId,
        content: forwardMessage.content,
        clientTempId: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        attachments: forwardMessage.attachments,
      });
      toast.success("Message forwarded");
      setForwardMessage(null);
      setForwardTargetThreadId("");
    } catch (err: any) {
      toast.error("Failed to forward message");
    }
  };

  const handleVotePoll = async (messageId: string, optionId: string) => {
    queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
      if (!old || !old.messages) return old;
      return {
        ...old,
        messages: old.messages.map((m: any) => {
          if (m.id !== messageId || !m.poll) return m;
          const poll = typeof m.poll === "string" ? JSON.parse(m.poll) : m.poll;
          const allowMultiple = Boolean(poll.allowMultiple || poll.isMultiSelect);
          const updatedOptions = (poll.options || []).map((opt: any) => {
            const votes: string[] = Array.isArray(opt.votes) ? [...opt.votes] : [];
            if (opt.id === optionId) {
              if (votes.includes(currentUserId)) {
                return { ...opt, votes: votes.filter((id) => id !== currentUserId) };
              } else {
                return { ...opt, votes: [...votes, currentUserId] };
              }
            } else if (!allowMultiple) {
              return { ...opt, votes: votes.filter((id) => id !== currentUserId) };
            }
            return opt;
          });
          return {
            ...m,
            poll: { ...poll, options: updatedOptions },
          };
        }),
      };
    });

    try {
      const res: any = await api.post(`/api/chat/messages/${messageId}/poll/vote`, { optionId });
      if (res?.poll) {
        queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
          if (!old || !old.messages) return old;
          return {
            ...old,
            messages: old.messages.map((m: any) =>
              m.id === messageId ? { ...m, poll: res.poll } : m
            ),
          };
        });
      }
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeThreadId] });
      toast.error(err?.response?.data?.error || "Failed to cast vote");
    }
  };

  const handleClosePoll = async (messageId: string) => {
    try {
      const res: any = await api.post(`/api/chat/messages/${messageId}/poll/close`);
      queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
        if (!old || !old.messages) return old;
        return {
          ...old,
          messages: old.messages.map((m: any) =>
            m.id === messageId
              ? { ...m, poll: res?.poll ? res.poll : (m.poll ? { ...m.poll, isClosed: true } : m.poll) }
              : m
          ),
        };
      });
      toast.success("Poll closed");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to close poll");
    }
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim()) {
      toast.error("Please enter a question for the poll");
      return;
    }
    const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      toast.error("Please provide at least 2 valid options");
      return;
    }

    const tempId = `temp_poll_${Date.now()}`;
    const newPollData = {
      question: pollQuestion.trim(),
      options: cleanOptions.map((text, idx) => ({
        id: `opt_${idx + 1}`,
        text,
        votes: [],
      })),
      isClosed: false,
      allowMultiple: pollAllowMultiple,
      isMultiSelect: pollAllowMultiple,
    };

    setCreatePollOpen(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollAllowMultiple(false);

    try {
      const res: any = await api.post("/api/chat/messages", {
        threadId: activeThreadId,
        content: `📊 Poll: ${pollQuestion.trim()}`,
        clientTempId: tempId,
        recipientId: activeThreadType === "direct" ? activeTargetUserId : undefined,
        groupId: activeThreadType === "group" ? activeGroupId : undefined,
        poll: newPollData,
      });

      const canonicalMsg = res?.message || res;
      queryClient.setQueryData(["chat", "messages", activeThreadId], (old: any) => {
        if (!old || !old.messages) return old;
        const exists = old.messages.some((m: any) => m.id === canonicalMsg.id);
        if (exists) return old;
        return {
          ...old,
          messages: [...old.messages, canonicalMsg],
        };
      });
      scrollToBottom(true);
      toast.success("Poll created successfully!");
    } catch (err: any) {
      toast.error("Failed to create poll");
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MERGE & FILTER MESSAGES (Deduplicated by ID & clientTempId)
  // ──────────────────────────────────────────────────────────────────────────
  const allMessages = useMemo(() => {
    const combined = [...olderMessages, ...serverMessages];
    const seenIds = new Set<string>();
    const seenTempIds = new Set<string>();
    const uniqueList: ChatMessageItem[] = [];

    for (const m of combined) {
      const idKey = m.id;
      const tempKey = m.clientTempId;
      if (idKey && seenIds.has(idKey)) continue;
      if (tempKey && seenTempIds.has(tempKey)) continue;
      if (idKey) seenIds.add(idKey);
      if (tempKey) seenTempIds.add(tempKey);
      uniqueList.push(m);
    }

    // Append pending optimistic messages that haven't been reconciled yet
    for (const opt of optimisticMessages) {
      const optKey = opt.clientTempId || opt.id;
      if (!seenIds.has(opt.id) && !seenTempIds.has(optKey)) {
        uniqueList.push(opt);
      }
    }

    if (inThreadSearchQuery.trim()) {
      const q = inThreadSearchQuery.trim().toLowerCase();
      return uniqueList.filter(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          m.attachments?.some((a) => a.name.toLowerCase().includes(q))
      );
    }

    return uniqueList;
  }, [olderMessages, serverMessages, optimisticMessages, inThreadSearchQuery]);

  const pinnedMessages = useMemo(() => {
    return serverMessages.filter((m) => m.isPinned);
  }, [serverMessages]);

  const allSharedFiles = useMemo(() => {
    const files: Array<ChatMessageAttachment & { senderName: string; time?: string }> = [];
    serverMessages.forEach((m) => {
      if (m.attachments && m.attachments.length > 0) {
        m.attachments.forEach((att) => {
          files.push({ ...att, senderName: m.senderName, time: m.time });
        });
      }
    });
    if (sharedFilesSearch.trim()) {
      const q = sharedFilesSearch.trim().toLowerCase();
      return files.filter((f) => f.name.toLowerCase().includes(q));
    }
    return files;
  }, [serverMessages, sharedFilesSearch]);

  
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

  // Filtered Lists
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter = filterFilter === "unread" ? c.unreadCount > 0 : true;
      return matchSearch && matchFilter;
    });
  }, [conversations, searchQuery, filterFilter]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [groups, searchQuery]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contacts, searchQuery]);

  const dialogFilteredContacts = useMemo(() => {
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(newChatSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(newChatSearch.toLowerCase()) ||
        c.department?.toLowerCase().includes(newChatSearch.toLowerCase())
    );
  }, [contacts, newChatSearch]);

  const dialogGroupCandidateContacts = useMemo(() => {
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(newGroupMemberSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(newGroupMemberSearch.toLowerCase()) ||
        c.department?.toLowerCase().includes(newGroupMemberSearch.toLowerCase())
    );
  }, [contacts, newGroupMemberSearch]);

  // Current active entity details for right drawer
  const activeGroup = groups.find((g) => g.id === activeGroupId || `group_${g.id}` === activeThreadId);
  const activeContact = contacts.find(
    (c) =>
      c.userId === activeTargetUserId ||
      c.id === activeTargetUserId ||
      (c.employeeId && c.employeeId === activeTargetUserId)
  );

  // Synchronize activeThreadTitle on initial load or empty title
  useEffect(() => {
    if (activeThreadType === "group" && activeGroup?.name) {
      if (!activeThreadTitle || activeThreadTitle === "Group Chat") {
        setActiveThreadTitle(activeGroup.name);
      }
    } else if (activeThreadType === "direct" && participantProfile?.name) {
      if (!activeThreadTitle || activeThreadTitle === "Direct Chat") {
        setActiveThreadTitle(participantProfile.name);
      }
    }
  }, [activeThreadType, activeGroup?.name, participantProfile?.name]);

  const isUserTyping = Object.values(typingUsers).some(Boolean);

  return (
    <div
      className="flex h-[calc(100dvh-4rem)] min-h-[32rem] w-full overflow-hidden bg-background border-t border-border font-sans"
      style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* LEFT COLUMN: LISTS (CHATS / GROUPS / CONTACTS / CALLS)              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <aside className={cn(
        "w-full md:w-[300px] lg:w-[320px] flex-shrink-0 border-r border-border flex-col bg-card",
        mobilePane === "list" ? "flex" : "hidden md:flex",
        mobilePane === "details" && "md:hidden xl:flex"
      )}>
        {/* Segmented Top Navigation: Personal / Group / Call Logs */}
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
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 border-b border-border/80 space-y-2">
          <div className="relative">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                mode === "chats"
                  ? "Search chats..."
                  : mode === "groups"
                  ? "Search groups..."
                  : mode === "contacts"
                  ? "Search contacts..."
                  : "Search call records..."
              }
              className="pl-8 text-xs h-8.5 bg-muted/40 font-sans border-border/70"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {mode === "chats" && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterFilter("all")}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer",
                  filterFilter === "all"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                All
              </button>
              <button
                onClick={() => setFilterFilter("unread")}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer",
                  filterFilter === "unread"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                Unread
              </button>
            </div>
          )}
        </div>

        {/* Side List View */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {/* MODE: CHATS */}
          {mode === "chats" && (
            <>
              {isConversationsLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <RefreshCw className="size-5 animate-spin text-primary" />
                  <span>Loading conversations...</span>
                </div>
              ) : isConversationsError ? (
                <div className="p-6 text-center text-xs text-destructive space-y-2">
                  <AlertCircle className="size-5 mx-auto" />
                  <p>Failed to load conversations.</p>
                  <Button variant="outline" size="sm" onClick={() => refetchConversations()}>
                    Retry
                  </Button>
                </div>
              ) : filteredPersonalConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                  <MessageSquare className="size-8 mx-auto text-muted-foreground/40" />
                  <p className="font-semibold text-foreground">No conversations yet</p>
                  <p className="text-[11px]">Click + to start communicating with colleagues.</p>
                </div>
              ) : (
                filteredPersonalConversations.map((item) => {
                  const isSelected = activeThreadId === item.threadId;
                  return (
                    <div
                      key={item.threadId}
                      data-testid="chat-thread-direct"
                      onClick={() => {
                        setActiveThreadId(item.threadId);
                        setActiveThreadTitle(item.title);
                        setActiveThreadType(item.type);
                        setActiveTargetUserId(item.otherParticipantId || "");
                        setActiveGroupId(item.groupId || (item.threadId?.startsWith("group_") ? item.threadId.replace("group_", "") : ""));
                        setMobilePane("chat");
                      }}
                      className={cn(
                        "group p-3 flex items-start gap-3 cursor-pointer transition-colors relative hover:bg-muted/50",
                        isSelected && "bg-muted/80"
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="size-10 shadow-xs">
                          {item.avatarUrl && (
                            <AvatarImage src={item.avatarUrl} alt={item.title} className="object-cover" />
                          )}
                          <AvatarFallback className={cn("text-foreground font-bold text-xs", item.avatarColor)}>
                            {item.avatarLetter}
                          </AvatarFallback>
                        </Avatar>
                        {item.type === "direct" && (
                          <span
                            className={cn(
                              "size-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-card",
                              item.status === "online" ? "bg-success" : "bg-muted-foreground/40"
                            )}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                            {item.isPinned && <Pin className="size-3 text-primary flex-shrink-0" />}
                            <span className="truncate">{item.title}</span>
                          </h4>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-1">
                            {item.lastMessageTime}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.lastMessage || "No messages yet"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          title={item.isPinned ? "Unpin conversation" : "Pin conversation"}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinConversationMutation.mutate(item.threadId);
                          }}
                          className={cn(
                            "p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity",
                            item.isPinned ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                        >
                          <Pin className="size-3.5" />
                        </button>
                        {item.unreadCount > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] h-4.5 px-1.5 rounded-full flex-shrink-0">
                            {item.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* MODE: GROUPS */}
          {mode === "groups" && (
            <>
              {isGroupsLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <RefreshCw className="size-5 animate-spin text-primary" />
                  <span>Loading groups...</span>
                </div>
              ) : isGroupsError ? (
                <div className="p-6 text-center text-xs text-destructive space-y-2">
                  <AlertCircle className="size-5 mx-auto" />
                  <p>Failed to load groups.</p>
                  <Button variant="outline" size="sm" onClick={() => refetchGroups()}>
                    Retry
                  </Button>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                  <Users className="size-8 mx-auto text-muted-foreground/40" />
                  <p className="font-semibold text-foreground">No groups found</p>
                  <p className="text-[11px]">Create a collaborative group for your department or project.</p>
                  <Button
                    size="sm"
                    className="mt-2 text-xs bg-primary hover:bg-primary text-primary-foreground"
                    onClick={() => setCreateGroupOpen(true)}
                  >
                    <Plus className="size-3.5 mr-1" /> Create Group
                  </Button>
                </div>
              ) : (
                cleanGroups.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase())).map((group) => {
                  const threadId = `group_${group.id}`;
                  const isSelected = activeThreadId === threadId;
                  return (
                    <div
                      key={group.id}
                      data-testid="chat-thread-group"
                      onClick={() => {
                        setActiveThreadId(threadId);
                        setActiveThreadTitle(group.name);
                        setActiveThreadType("group");
                        setActiveGroupId(group.id);
                        setActiveTargetUserId("");
                        setMobilePane("chat");
                      }}
                      className={cn(
                        "group p-3 flex items-start gap-3 cursor-pointer transition-colors relative hover:bg-muted/50",
                        isSelected && "bg-muted/80"
                      )}
                    >
                      <Avatar className="size-10 shadow-xs flex-shrink-0">
                        {group.avatarUrl && (
                          <AvatarImage src={group.avatarUrl} alt={group.name} className="object-cover" />
                        )}
                        <AvatarFallback className={cn("text-foreground font-bold text-xs", group.avatarColor)}>
                          {group.avatarLetter}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                            {group.isPinned && <Pin className="size-3 text-primary flex-shrink-0" />}
                            <span className="truncate">{group.name}</span>
                          </h4>
                          <span className="text-[10px] text-muted-foreground">{group.time}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {group.lastMessage || `${group.memberCount} members`}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          title={group.isPinned ? "Unpin group" : "Pin group"}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinConversationMutation.mutate(threadId);
                          }}
                          className={cn(
                            "p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity",
                            group.isPinned ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                        >
                          <Pin className="size-3.5" />
                        </button>
                        {group.unreadCount && group.unreadCount > 0 ? (
                          <Badge className="bg-primary text-primary-foreground text-[10px] h-4.5 px-1.5 rounded-full flex-shrink-0">
                            {group.unreadCount}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* MODE: CONTACTS */}
          {mode === "contacts" && (
            <>
              {isContactsLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <RefreshCw className="size-5 animate-spin text-primary" />
                  <span>Loading directory...</span>
                </div>
              ) : isContactsError ? (
                <div className="p-6 text-center text-xs text-destructive space-y-2">
                  <AlertCircle className="size-5 mx-auto" />
                  <p>Failed to load contacts directory.</p>
                  <Button variant="outline" size="sm" onClick={() => refetchContacts()}>
                    Retry
                  </Button>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                  <User className="size-8 mx-auto text-muted-foreground/40" />
                  <p className="font-semibold text-foreground">No contacts found</p>
                  <p className="text-[11px]">No colleagues found in this tenant directory.</p>
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const isSelected = activeTargetUserId === contact.userId;
                  return (
                    <div
                      key={contact.id}
                      onClick={() => {
                        startDirectConversationMutation.mutate(contact.userId || contact.id);
                      }}
                      className={cn(
                        "p-3 flex items-start gap-3 cursor-pointer transition-colors relative hover:bg-muted/50",
                        isSelected && "bg-muted/80"
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        {contact.avatarUrl ? (
                          <img
                            src={contact.avatarUrl}
                            alt={contact.name}
                            className="size-10 rounded-full object-cover shadow-xs"
                          />
                        ) : (
                          <div
                            className={cn(
                              "size-10 rounded-full flex items-center justify-center font-bold text-xs shadow-xs",
                              contact.avatarColor
                            )}
                          >
                            {contact.avatarLetter}
                          </div>
                        )}
                        <span
                          className={cn(
                            "size-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-card",
                            contact.status === "online" ? "bg-success" : "bg-muted-foreground/40"
                          )}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-foreground truncate">{contact.name}</h4>
                        <p className="text-[11px] text-muted-foreground truncate">{contact.designation}</p>
                        <p className="text-[10px] text-muted-foreground/80 truncate">{contact.department}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Audio Call"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInitiateCall(
                              "audio",
                              contact.userId || contact.id,
                              contact.name,
                              contact.phone || "",
                              contact.email || ""
                            );
                          }}
                          className="size-7 text-muted-foreground hover:text-primary"
                        >
                          <Phone className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Video Call"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInitiateCall(
                              "video",
                              contact.userId || contact.id,
                              contact.name,
                              contact.phone || "",
                              contact.email || ""
                            );
                          }}
                          className="size-7 text-muted-foreground hover:text-primary"
                        >
                          <Video className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            startDirectConversationMutation.mutate(contact.userId || contact.id);
                          }}
                          className="h-7 px-2 text-xs text-primary hover:text-primary"
                        >
                          Message
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* MODE: CALL HISTORY (Side List) */}
          {mode === "calls" && (
            <div className="p-2 space-y-2">
              <div className="p-2 bg-muted/30 rounded-lg">
                <p className="text-xs font-semibold text-foreground mb-1">Call History</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Authoritative voice and video call records and meeting schedules.
                </p>
                <Button
                  size="sm"
                  className="w-full mt-2 text-xs bg-primary hover:bg-primary text-primary-foreground gap-1.5"
                  onClick={() => setScheduleMeetingOpen(true)}
                >
                  <CalendarPlus className="size-3.5" /> Schedule Meeting
                </Button>
              </div>

              {callLogs.slice(0, 8).map((call) => (
                <div
                  key={call.id}
                  onClick={() => setViewCallerDetails(call)}
                  className="p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {call.contactName || call.callerName}
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatDuration(call.durationSeconds)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="capitalize">{call.callType} call</span>
                    <span>{fmtCallDate(call.callTime)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* CENTER COLUMN: ACTIVE CONVERSATION MESSAGES / CALL LOGS TABLE       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className={cn(
        "flex-1 min-w-0 flex-col bg-background",
        mobilePane === "chat" ? "flex" : "hidden md:flex",
        mobilePane === "details" && "hidden md:flex"
      )}>
        {mode === "calls" ? (
          /* ─── FULL CALL HISTORY VIEW ─── */
          <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="btn-mobile-back-to-list"
                  onClick={() => {
                    handleModeSelect("chats");
                    setMobilePane("list");
                  }}
                  className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Call History</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Authoritative voice and video call lifecycle records, participant details, and durations.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchCallLogs()}
                  className="text-xs h-8.5 gap-1.5"
                >
                  <RotateCw className="size-3.5" />
                  <span>Refresh</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setScheduleMeetingOpen(true)}
                  className="text-xs h-8.5 bg-primary hover:bg-primary text-primary-foreground gap-1.5"
                >
                  <CalendarPlus className="size-3.5" />
                  <span>Schedule Meeting</span>
                </Button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCallPage(1);
                  }}
                  placeholder="Search contact, phone or email..."
                  className="pl-8 text-xs h-8.5 font-sans"
                />
              </div>

              {/* Call Type Filter */}
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                {[
                  { id: "all", label: "All Types" },
                  { id: "audio", label: "Audio" },
                  { id: "video", label: "Video" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setCallTypeFilter(t.id);
                      setCallPage(1);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                      callTypeFilter === t.id
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Direction Filter */}
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                {[
                  { id: "all", label: "All Directions" },
                  { id: "incoming", label: "Incoming" },
                  { id: "outgoing", label: "Outgoing" },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setCallDirectionFilter(d.id);
                      setCallPage(1);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                      callDirectionFilter === d.id
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                {[
                  { id: "all", label: "All Statuses" },
                  { id: "completed", label: "Completed" },
                  { id: "missed", label: "Missed" },
                  { id: "rejected", label: "Rejected" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setCallStatusFilter(s.id);
                      setCallPage(1);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                      callStatusFilter === s.id
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calls Table */}
            <div className="border border-border rounded-lg overflow-hidden bg-card shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Contact / Colleague</TableHead>
                    <TableHead className="text-xs font-semibold">Direction</TableHead>
                    <TableHead className="text-xs font-semibold">Call Type</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Duration</TableHead>
                    <TableHead className="text-xs font-semibold">Date & Time</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCallLogsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                        <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                        Loading authoritative call history...
                      </TableCell>
                    </TableRow>
                  ) : callLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                        <PhoneOff className="size-6 mx-auto mb-2 text-muted-foreground/40" />
                        No call records matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    callLogs.map((call) => {
                      const isIncoming = call.computedDirection === "incoming" || call.direction === "incoming";
                      const isVideo = call.callType === "video";
                      const contactDisplayName = call.contactName || call.callerName || "Colleague";
                      const contactDisplayAvatar = call.contactAvatarUrl || call.callerAvatarUrl;

                      return (
                        <TableRow key={call.id} className="hover:bg-muted/40">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              {contactDisplayAvatar ? (
                                <img
                                  src={contactDisplayAvatar}
                                  alt={contactDisplayName}
                                  className="size-8 rounded-full object-cover shadow-xs"
                                />
                              ) : (
                                <div
                                  className={cn(
                                    "size-8 rounded-full flex items-center justify-center font-bold text-xs text-foreground",
                                    getAvatarColor(contactDisplayName)
                                  )}
                                >
                                  {contactDisplayName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-semibold text-xs text-foreground block truncate">
                                  {contactDisplayName}
                                </span>
                                <span className="text-[11px] text-muted-foreground block truncate">
                                  {call.callerEmail || call.callerPhone || "-"}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="inline-flex items-center text-xs font-medium gap-1.5">
                              {isIncoming ? (
                                <>
                                  <PhoneIncoming className="size-3.5 text-success" />
                                  <span className="text-success dark:text-success">Incoming</span>
                                </>
                              ) : (
                                <>
                                  <PhoneOutgoing className="size-3.5 text-accent-foreground" />
                                  <span className="text-accent-foreground dark:text-accent-foreground">Outgoing</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="inline-flex items-center text-xs font-medium gap-1.5">
                              {isVideo ? (
                                <>
                                  <Video className="size-3.5 text-accent-foreground" />
                                  <span className="text-accent-foreground dark:text-accent-foreground">Video</span>
                                </>
                              ) : (
                                <>
                                  <Phone className="size-3.5 text-muted-foreground" />
                                  <span>Audio</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {call.status === "completed" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/10 text-success dark:bg-success dark:text-success">
                                Completed
                              </span>
                            ) : call.status === "missed" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive dark:bg-destructive dark:text-destructive">
                                Missed
                              </span>
                            ) : call.status === "rejected" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warning/15 text-warning dark:bg-warning dark:text-warning">
                                Rejected
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-foreground dark:bg-card dark:text-foreground capitalize">
                                {call.status || "Completed"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {formatDuration(call.durationSeconds)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {fmtCallDate(call.callTime)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-primary"
                                title="Audio Call"
                                onClick={() =>
                                  handleInitiateCall(
                                    "audio",
                                    call.otherUserId || call.callerId || "",
                                    contactDisplayName,
                                    call.callerPhone || "",
                                    call.callerEmail || ""
                                  )
                                }
                              >
                                <Phone className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-primary"
                                title="Video Call"
                                onClick={() =>
                                  handleInitiateCall(
                                    "video",
                                    call.otherUserId || call.callerId || "",
                                    contactDisplayName,
                                    call.callerPhone || "",
                                    call.callerEmail || ""
                                  )
                                }
                              >
                                <Video className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-primary"
                                title="Message"
                                onClick={() => {
                                  const targetId = call.otherUserId || (call.callerId === currentUserId ? call.receiverId : call.callerId);
                                  if (targetId) startDirectConversationMutation.mutate(targetId);
                                }}
                              >
                                <MessageSquare className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-foreground"
                                title="View Details"
                                onClick={() => setViewCallerDetails(call)}
                              >
                                <Eye className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Hide Record"
                                onClick={() => deleteCallLogMutation.mutate(call.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* Server-Side Pagination Footer */}
              <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
                <span>
                  Showing page {callHistoryData.page} of {callHistoryData.totalPages || 1} ({callHistoryData.total} total calls)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={callPage <= 1 || isCallLogsLoading}
                    onClick={() => setCallPage((p) => Math.max(1, p - 1))}
                    className="h-7 text-xs gap-1"
                  >
                    <ChevronLeft className="size-3.5" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={callPage >= (callHistoryData.totalPages || 1) || isCallLogsLoading}
                    onClick={() => setCallPage((p) => p + 1)}
                    className="h-7 text-xs gap-1"
                  >
                    Next <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : activeThreadId ? (
          <>
            {/* Conversation Header */}
            <div className="p-3.5 border-b border-border flex items-center justify-between bg-card">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  data-testid="btn-mobile-back-to-list"
                  onClick={() => setMobilePane("list")}
                  className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div
                  className="flex items-center gap-2 min-w-0 cursor-pointer"
                  data-testid="btn-mobile-open-details"
                  onClick={() => {
                    setShowInfo(true);
                    setMobilePane("details");
                  }}
                >
                  <Avatar className="size-9.5 flex-shrink-0 shadow-xs">
                    {(activeThreadType === "direct"
                      ? participantProfile?.avatarUrl || activeContact?.avatarUrl
                      : activeGroup?.avatarUrl) ? (
                      <AvatarImage
                        src={
                          (activeThreadType === "direct"
                            ? participantProfile?.avatarUrl || activeContact?.avatarUrl
                            : activeGroup?.avatarUrl) || ""
                        }
                        alt={activeThreadTitle}
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className={cn("text-foreground font-bold text-xs", getAvatarColor(activeThreadTitle))}>
                      {(activeThreadTitle || "C").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {activeThreadType === "group" && activeGroup?.name ? activeGroup.name : activeThreadTitle}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {activeThreadType === "direct" ? (
                        <>
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              onlineUserIds.includes(activeTargetUserId) ? "bg-success" : "bg-muted-foreground/40"
                            )}
                          />
                          <span>
                            {onlineUserIds.includes(activeTargetUserId) ? "Online" : "Offline"}
                          </span>
                          {(participantProfile?.designation || activeContact?.designation) && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[160px]">
                                {participantProfile?.designation || activeContact?.designation}
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        <span>{activeGroup?.memberCount || 0} members</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Search in Conversation Button */}
                <button
                  onClick={() => setInThreadSearchOpen((prev) => !prev)}
                  className={cn(
                    "p-2 rounded-lg transition-colors cursor-pointer",
                    inThreadSearchOpen
                      ? "text-primary bg-primary/10 dark:bg-primary/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="Search in Conversation"
                >
                  <Search className="size-4.5" />
                </button>

                {activeThreadType === "direct" && (
                  <>
                    <button
                      onClick={() =>
                        handleInitiateCall(
                          "audio",
                          activeTargetUserId,
                          activeThreadTitle,
                          participantProfile?.phone || activeContact?.phone || "",
                          participantProfile?.email || activeContact?.email || ""
                        )
                      }
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      title="Audio Call (WebRTC)"
                    >
                      <Phone className="size-4.5" />
                    </button>
                    <button
                      onClick={() =>
                        handleInitiateCall(
                          "video",
                          activeTargetUserId,
                          activeThreadTitle,
                          participantProfile?.phone || activeContact?.phone || "",
                          participantProfile?.email || activeContact?.email || ""
                        )
                      }
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      title="Video Call (WebRTC)"
                    >
                      <Video className="size-4.5" />
                    </button>
                  </>
                )}

                {activeThreadType === "group" && (
                  <>
                    <button
                      onClick={() => handleStartGroupMeeting("audio")}
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      title="Start Group Audio Meeting"
                      data-testid="btn-start-group-audio"
                    >
                      <Phone className="size-4.5 text-primary" />
                    </button>
                    <button
                      onClick={() => handleStartGroupMeeting("video")}
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      title="Start Group Video Meeting"
                      data-testid="btn-start-group-video"
                    >
                      <Video className="size-4.5 text-primary" />
                    </button>
                    <button
                      onClick={() => setAddMemberOpen(true)}
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      title="Add Member"
                    >
                      <UserPlus className="size-4.5" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    setShowInfo((prev) => {
                      const next = !prev;
                      if (next) setMobilePane("details");
                      else setMobilePane("chat");
                      return next;
                    });
                  }}
                  className={cn(
                    "p-2 rounded-lg transition-colors cursor-pointer",
                    showInfo
                      ? "text-primary bg-primary/10 dark:bg-primary/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="Toggle Details Panel"
                >
                  <InfoIcon className="size-4.5" />
                </button>
              </div>
            </div>

            {/* Desktop Web Push Call Alert Notice */}
            {isPushSupported && !isSubscribedToPush && pushPermission !== "denied" && !pushBannerDismissed && (
              <div className="bg-indigo-50/90 dark:bg-indigo-950/40 border-b border-indigo-200/60 dark:border-indigo-900/50 px-4 py-2 flex items-center justify-between text-xs text-indigo-950 dark:text-indigo-200">
                <div className="flex items-center gap-2 mr-2">
                  <Bell className="size-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    Enable browser notifications to receive incoming calls when MasterHRMS is in the background or closed.
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => enablePushNotifications()}
                    className="h-6 text-[11px] px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                  >
                    Enable
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPushBannerDismissed(true)}
                    className="size-6 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* In-Thread Search Bar */}
            {inThreadSearchOpen && (
              <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center gap-2">
                <Search className="size-4 text-muted-foreground" />
                <Input
                  value={inThreadSearchQuery}
                  onChange={(e) => setInThreadSearchQuery(e.target.value)}
                  placeholder="Search messages or filenames in this conversation..."
                  className="h-8 text-xs flex-1 bg-background"
                />
                {inThreadSearchQuery && (
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {allMessages.length} match(es)
                  </span>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => {
                    setInThreadSearchOpen(false);
                    setInThreadSearchQuery("");
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )}

            {/* Pinned Messages Banner */}
            {pinnedMessages.length > 0 && (
              <div className="px-4 py-1.5 bg-primary/10 dark:bg-primary/40 border-b border-primary/30 dark:border-primary/40 flex items-center justify-between text-xs text-primary dark:text-primary">
                <div className="flex items-center gap-2 truncate">
                  <Pin className="size-3.5 text-primary flex-shrink-0" />
                  <span className="font-semibold">Pinned:</span>
                  <span className="truncate">{pinnedMessages[0].content}</span>
                  {pinnedMessages.length > 1 && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      +{pinnedMessages.length - 1} more
                    </Badge>
                  )}
                </div>
                <button
                  onClick={() => handleTogglePin(pinnedMessages[0].id)}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline ml-2"
                >
                  Unpin
                </button>
              </div>
            )}

            {/* Messages Feed with Drag-and-Drop Area & Cursor-based Infinite Scroll */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className={cn(
                "flex-1 overflow-y-auto p-4 space-y-3.5 relative",
                isDraggingOver && "bg-primary/50 dark:bg-primary/20"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsDraggingOver(false);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFilesSelected(e.dataTransfer.files);
                }
              }}
            >
              {/* Infinite Scroll: Loading older messages spinner */}
              {isLoadingOlder && (
                <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-2">
                  <RefreshCw className="size-4 animate-spin text-primary" />
                  <span>Loading older messages...</span>
                </div>
              )}

              {/* Drag overlay notice */}
              {isDraggingOver && (
                <div className="absolute inset-0 bg-primary/80 dark:bg-primary/80 z-20 flex flex-col items-center justify-center border-2 border-dashed border-primary/30 rounded-lg pointer-events-none">
                  <Paperclip className="size-10 text-primary animate-bounce mb-2" />
                  <p className="text-sm font-bold text-primary dark:text-primary">
                    Drop files here to upload to this conversation
                  </p>
                  <p className="text-xs text-primary">Documents, images, PDF (Max 30 MB)</p>
                </div>
              )}

              {isMessagesLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground space-y-2 flex-col">
                  <RefreshCw className="size-6 animate-spin text-primary" />
                  <p>Loading messages...</p>
                </div>
              ) : isMessagesError ? (
                <div className="h-full flex items-center justify-center text-xs text-destructive space-y-2 flex-col">
                  <AlertCircle className="size-6" />
                  <p>Failed to load conversation history.</p>
                  <Button variant="outline" size="sm" onClick={() => refetchMessages()}>
                    Retry
                  </Button>
                </div>
              ) : allMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground space-y-2 flex-col">
                  <MessageSquare className="size-10 text-muted-foreground/30" />
                  <p className="font-semibold text-foreground">No messages in this thread yet</p>
                  <p className="text-[11px]">Send a message below or attach a file to start collaborating.</p>
                </div>
              ) : (
                allMessages.map((msg, index) => {
                  const isSent = msg.senderId === currentUserId || msg.types === "sent";
                  const isAuthor = msg.senderId === currentUserId;

                  // Render date separator once per transition
                  const currentDateLabel = getDateGroupLabel(msg.createdAt);
                  const prevDateLabel = index > 0 ? getDateGroupLabel(allMessages[index - 1].createdAt) : null;
                  const showDateSeparator = index === 0 || currentDateLabel !== prevDateLabel;

                  return (
                    <React.Fragment key={msg.id || msg.clientTempId || index}>
                      {showDateSeparator && (
                        <div className="flex items-center justify-center my-3">
                          <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground shadow-2xs border border-border/50">
                            {currentDateLabel}
                          </span>
                        </div>
                      )}

                      {/* Distinct System Event Row */}
                      {msg.isSystemEvent ? (
                        <div className="flex items-center justify-center my-2 w-full">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-muted-foreground text-[11px] max-w-md text-center border border-border/40">
                            <InfoIcon className="size-3 flex-shrink-0 text-primary" />
                            <span>{msg.content}</span>
                            {msg.time && (
                              <span className="text-[10px] opacity-75 font-mono">({msg.time})</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div
                          data-message-id={msg.id || msg.clientTempId}
                          className={cn(
                            "group flex items-end gap-2.5 max-w-[85%]",
                            isSent ? "ml-auto flex-row-reverse" : "mr-auto"
                          )}
                        >
                          {!isSent && (
                            <Avatar className="size-7 flex-shrink-0 shadow-2xs mb-0.5">
                              {msg.senderAvatar ? (
                                <AvatarImage
                                  src={msg.senderAvatar}
                                  alt={msg.senderName || "User"}
                                  className="object-cover"
                                />
                              ) : null}
                              <AvatarFallback
                                className={cn(
                                  "text-foreground font-bold text-[10px]",
                                  getAvatarColor(msg.senderName)
                                )}
                              >
                                {(msg.senderName || "U").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          <div className="space-y-1 relative">
                            {/* In group chats, display sender display name above incoming bubble */}
                            {!isSent && activeThreadType === "group" && (
                              <p className="text-[11px] font-semibold text-primary dark:text-primary pl-1 select-none">
                                {msg.senderName}
                              </p>
                            )}

                            {/* Forwarded message indicator */}
                            {msg.isForwarded && (
                              <div className="flex items-center gap-1 text-[10px] italic text-muted-foreground/80 mb-0.5 select-none pl-0.5">
                                <Share2 className="size-3 flex-shrink-0 text-primary" />
                                <span>Forwarded{msg.forwardedFromSender ? ` from ${cleanPersonName(msg.forwardedFromSender)}` : ""}</span>
                              </div>
                            )}

                            {/* Reply reference preview */}
                        {msg.replyTo && (
                          <div className="text-[10px] text-muted-foreground border-l-2 border-primary/30 pl-2 py-0.5 mb-1 bg-muted/40 rounded-r">
                            <span className="font-semibold">{msg.replyTo.senderName}: </span>
                            <span className="truncate">{msg.replyTo.content}</span>
                          </div>
                        )}

                        {/* Main Message Bubble */}
                        <div
                          onContextMenu={(e) => handleContextMenu(e, msg)}
                          onTouchStart={(e) => handleTouchStart(e, msg)}
                          onTouchEnd={(e) => handleTouchEnd(e, msg)}
                          className={cn(
                            "px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-2xs relative select-text",
                            msg.isDeletedForEveryone
                              ? "bg-muted/50 text-muted-foreground border border-dashed border-border italic"
                              : isSent
                              ? "bg-primary text-primary-foreground rounded-br-none"
                              : "bg-muted/80 text-foreground border border-border/60 rounded-bl-none"
                          )}
                        >
                          {msg.isDeletedForEveryone ? (
                            <div className="flex items-center gap-1.5 select-none text-muted-foreground py-0.5">
                              <Ban className="size-3.5 text-muted-foreground/80 shrink-0" />
                              <span>This message was deleted</span>
                            </div>
                          ) : (
                            <>
                              {/* Message Content */}
                              {msg.content}

                              {/* URL Previews */}
                              {msg.urlPreviews && msg.urlPreviews.length > 0 && (
                                <div className="mt-2 space-y-1.5">
                                  {msg.urlPreviews.map((preview, idx) => (
                                    <a
                                      key={idx}
                                      href={preview.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block p-2 rounded bg-card text-foreground border border-border/70 hover:bg-muted/60 transition-colors"
                                    >
                                      {preview.image && (
                                        <img
                                          src={preview.image}
                                          alt={preview.title || "Preview"}
                                          className="w-full h-28 object-cover rounded mb-1.5"
                                        />
                                      )}
                                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                                        <ExternalLink className="size-3" />
                                        <span>{preview.siteName || preview.url}</span>
                                      </div>
                                      <p className="font-semibold text-xs line-clamp-1">{preview.title}</p>
                                      {preview.description && (
                                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                                          {preview.description}
                                        </p>
                                      )}
                                    </a>
                                  ))}
                                </div>
                              )}

                              {/* Voice Note Player */}
                              {msg.voiceNote && (
                                <div className="mt-2">
                                  <VoiceNotePlayer voiceNote={msg.voiceNote} />
                                </div>
                              )}

                              {/* Attachments List */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 space-y-1.5">
                                  {msg.attachments.map((att, aIdx) => {
                                    const isImage = att.mimeType?.startsWith("image/");
                                    const isPdf = att.mimeType?.includes("pdf") || att.name?.toLowerCase().endsWith(".pdf");

                                    return isImage ? (
                                      <div
                                        key={aIdx}
                                        onClick={() => openAttachmentViewer(msg.attachments!, aIdx)}
                                        className="cursor-pointer group/img relative overflow-hidden rounded-lg border border-border/60 max-w-xs"
                                      >
                                        <img
                                          src={att.url}
                                          alt={att.name}
                                          className="max-h-48 w-auto object-cover group-hover/img:scale-105 transition-transform"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-foreground text-xs gap-1">
                                          <Eye className="size-4" /> View Full
                                        </div>
                                      </div>
                                    ) : (
                                      <div
                                        key={aIdx}
                                        onClick={() => openAttachmentViewer(msg.attachments!, aIdx)}
                                        className="flex items-center gap-2 p-2 rounded bg-card text-foreground border border-border/70 max-w-xs cursor-pointer hover:bg-muted/60 transition-colors"
                                      >
                                        {isPdf ? (
                                          <FileText className="size-5 text-destructive flex-shrink-0" />
                                        ) : (
                                          <FileIcon className="size-5 text-primary flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-xs truncate">{att.name}</p>
                                          <p className="text-[10px] text-muted-foreground">{formatFileSize(att.size)}</p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const link = document.createElement("a");
                                            link.href = att.url;
                                            link.download = att.name;
                                            link.click();
                                          }}
                                          className="p-1 hover:bg-muted rounded text-primary dark:text-primary"
                                          title="Download"
                                        >
                                          <Download className="size-4" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Poll Card */}
                              {msg.poll && (
                                <div className="mt-2 p-3 rounded-lg bg-card text-foreground border border-border/80 space-y-2 min-w-[240px]">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-semibold text-xs flex items-center gap-1.5">
                                      <BarChart2 className="size-3.5 text-primary" />
                                      <span>{msg.poll.question}</span>
                                    </h5>
                                    {msg.poll.isClosed && (
                                      <Badge variant="secondary" className="text-[9px]">Closed</Badge>
                                    )}
                                  </div>

                                  {(() => {
                                    const isMulti = Boolean(msg.poll.allowMultiple || msg.poll.isMultiSelect);
                                    const allVoterIds = new Set<string>();
                                    (msg.poll.options || []).forEach((o: any) => {
                                      if (Array.isArray(o.votes)) {
                                        o.votes.forEach((v: string) => allVoterIds.add(v));
                                      }
                                    });
                                    const distinctVotersCount = allVoterIds.size;
                                    const totalSelections = (msg.poll.options || []).reduce(
                                      (sum: number, o: any) => sum + (Array.isArray(o.votes) ? o.votes.length : (typeof o.votes === "number" ? o.votes : 0)),
                                      0
                                    );
                                    const denominator = isMulti ? Math.max(distinctVotersCount, 1) : Math.max(totalSelections, 1);

                                    return (
                                      <>
                                        <div className="space-y-1.5">
                                          {(msg.poll.options || []).map((opt: any) => {
                                            const optionVotes = Array.isArray(opt.votes)
                                              ? opt.votes.length
                                              : typeof opt.votes === "number"
                                              ? opt.votes
                                              : 0;
                                            const pct = (distinctVotersCount > 0 || totalSelections > 0)
                                              ? Math.round((optionVotes / denominator) * 100)
                                              : 0;
                                            const hasVoted = Array.isArray(opt.votes) && opt.votes.includes(currentUserId);

                                            return (
                                              <div
                                                key={opt.id}
                                                onClick={() => {
                                                  if (!msg.poll?.isClosed) handleVotePoll(msg.id, opt.id);
                                                }}
                                                className={cn(
                                                  "p-2 rounded border border-border/60 relative overflow-hidden transition-colors cursor-pointer select-none",
                                                  hasVoted && "border-primary/30 bg-primary/40 dark:bg-primary/20"
                                                )}
                                              >
                                                <div
                                                  className="absolute inset-y-0 left-0 bg-primary/40 dark:bg-primary/20 pointer-events-none"
                                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                                />
                                                <div className="relative flex items-center justify-between text-xs">
                                                  <div className="flex items-center gap-1.5">
                                                    {hasVoted ? (
                                                      <CheckSquare className="size-3.5 text-primary" />
                                                    ) : (
                                                      <Square className="size-3.5 text-muted-foreground" />
                                                    )}
                                                    <span className="font-medium">{opt.text}</span>
                                                  </div>
                                                  <span className="text-[11px] font-mono text-muted-foreground">
                                                    {optionVotes} ({pct}%)
                                                  </span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
                                          <span>
                                            {isMulti
                                              ? `${distinctVotersCount} voter${distinctVotersCount === 1 ? "" : "s"} · ${totalSelections} selections`
                                              : `${totalSelections} vote${totalSelections === 1 ? "" : "s"}`}
                                          </span>
                                          {isAuthor && !msg.poll.isClosed && (
                                            <button
                                              type="button"
                                              onClick={() => handleClosePoll(msg.id)}
                                              className="text-[10px] text-destructive hover:underline cursor-pointer"
                                            >
                                              End Poll
                                            </button>
                                          )}
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* Edited label */}
                              {msg.isEdited && (
                                <span className="text-[9px] opacity-75 ml-1.5">(edited)</span>
                              )}
                            </>
                          )}
                        </div>

                        {/* Reaction pills */}
                        {(() => {
                          const pills = normalizeReactions(msg.reactions, currentUserId);
                          if (pills.length === 0) return null;
                          return (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {pills.map(({ emoji, count, hasReacted, users }) => (
                                <Popover key={emoji}>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      data-testid={`reaction-pill-${emoji}`}
                                      className={cn(
                                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors cursor-pointer",
                                        hasReacted
                                          ? "bg-primary/10 dark:bg-primary text-primary dark:text-primary border-primary/30 dark:border-primary/30"
                                          : "bg-muted/60 hover:bg-muted border-border text-foreground"
                                      )}
                                      title="Click to view who reacted"
                                    >
                                      <span>{emoji}</span>
                                      <span className="font-semibold">{count}</span>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-56 p-2 text-xs font-sans shadow-lg" align="start">
                                    <div className="font-semibold text-xs border-b border-border pb-1.5 mb-1.5 flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-base">{emoji}</span>
                                        <span>{count} {count === 1 ? "reaction" : "reactions"}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleAddReaction(msg.id, emoji)}
                                        className="text-[11px] text-primary hover:underline cursor-pointer font-medium"
                                      >
                                        {hasReacted ? "Remove" : "React"}
                                      </button>
                                    </div>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                      {users && users.length > 0 ? (
                                        users.map((u) => {
                                          const isMe = u.userId === currentUserId;
                                          return (
                                            <div key={u.userId} className="flex items-center gap-2 py-0.5">
                                              <Avatar className="size-5">
                                                <AvatarImage src={u.avatarUrl || undefined} />
                                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                                                  {(u.fullName || "U").slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                              </Avatar>
                                              <span className="truncate flex-1 text-xs">
                                                {u.fullName} {isMe && <span className="text-muted-foreground font-normal">(You)</span>}
                                              </span>
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <div className="text-muted-foreground text-[11px] py-1">
                                          {hasReacted ? "You reacted" : `${count} person(s)`}
                                        </div>
                                      )}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ))}
                            </div>
                          );
                        })()}

                        {/* Time & Delivery Status Indicator */}
                        <div
                          className={cn(
                            "text-[10px] text-muted-foreground flex items-center gap-1",
                            isSent ? "justify-end" : "justify-start"
                          )}
                        >
                          {msg.isPinned && <Pin className="size-3 text-primary" />}
                          <span>{msg.time}</span>
                          {isSent && (
                            <>
                              {msg.status === "failed" ? (
                                <span className="text-destructive font-medium">Failed</span>
                              ) : msg.status === "pending" ? (
                                <Clock className="size-3 text-muted-foreground animate-spin" />
                              ) : msg.deliveryStatus === "seen" || msg.status === "read" ? (
                                <span title="Seen"><CheckCheck className="size-3.5 text-primary dark:text-primary" /></span>
                              ) : msg.deliveryStatus === "delivered" || msg.status === "delivered" ? (
                                <span title="Delivered"><CheckCheck className="size-3.5 text-muted-foreground" /></span>
                              ) : (
                                <span title="Sent"><Check className="size-3.5 text-muted-foreground" /></span>
                              )}
                            </>
                          )}
                        </div>

                        {/* Message Action Context Menu (Hover or Click) */}
                        {!msg.isDeletedForEveryone && (
                          <div
                            className={cn(
                              "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-card/90 backdrop-blur-xs border border-border rounded-lg shadow-sm px-1 py-0.5 z-10",
                              isSent ? "-left-28" : "-right-28",
                              reactionPickerMessageId === msg.id && "opacity-100"
                            )}
                          >
                            {/* Quick Emoji Reaction */}
                            <button
                              onClick={() => handleAddReaction(msg.id, "👍")}
                              className="p-1 hover:bg-muted rounded text-xs cursor-pointer"
                              title="React Thumbs Up"
                            >
                              👍
                            </button>
                            <button
                              onClick={() => handleAddReaction(msg.id, "❤️")}
                              className="p-1 hover:bg-muted rounded text-xs cursor-pointer"
                              title="React Heart"
                            >
                              ❤️
                            </button>

                            {/* Add Reaction Picker */}
                            <Popover
                              open={reactionPickerMessageId === msg.id}
                              onOpenChange={(open) => setReactionPickerMessageId(open ? msg.id : null)}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Add reaction"
                                >
                                  <SmilePlus className="size-3.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                side="top"
                                align={isSent ? "end" : "start"}
                                className="p-0 border-none bg-transparent shadow-none w-auto z-50"
                              >
                                <EmojiPicker
                                  onSelectEmoji={(emoji) => {
                                    handleAddReaction(msg.id, emoji);
                                    setReactionPickerMessageId(null);
                                  }}
                                  onClose={() => setReactionPickerMessageId(null)}
                                />
                              </PopoverContent>
                            </Popover>

                            {/* Reply */}
                            <button
                              onClick={() => setReplyingToMessage(msg)}
                              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                              title="Reply"
                            >
                              <CornerUpLeft className="size-3.5" />
                            </button>

                            {/* Pin */}
                            <button
                              onClick={() => handleTogglePin(msg.id)}
                              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                              title={msg.isPinned ? "Unpin message" : "Pin message"}
                            >
                              <Pin className="size-3.5" />
                            </button>

                            {/* Dropdown for More Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                                  <MoreVertical className="size-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isSent ? "start" : "end"} className="w-44 font-sans">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setForwardMessage(msg);
                                    setForwardTargetThreadId(activeThreadId);
                                  }}
                                >
                                  <Share2 className="size-3.5 mr-2" /> Forward
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.content);
                                    toast.success("Copied to clipboard");
                                  }}
                                >
                                  <Copy className="size-3.5 mr-2" /> Copy Message
                                </DropdownMenuItem>

                                {isAuthor && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingMessage(msg);
                                      setEditingContent(msg.content);
                                    }}
                                  >
                                    <Edit3 className="size-3.5 mr-2" /> Edit Message
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteMessage(msg.id, "me")}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="size-3.5 mr-2" /> Delete for Me
                                </DropdownMenuItem>
                                {isAuthor && (
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteMessage(msg.id, "everyone")}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="size-3.5 mr-2" /> Delete for Everyone
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
                );
              })
              )}

              {isUserTyping && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                  <div className="size-2 rounded-full bg-primary animate-ping" />
                  <span>Someone is typing...</span>
                </div>
              )}

              {showScrollBottom && (
                <button
                  type="button"
                  onClick={() => scrollToBottom(true)}
                  className="sticky bottom-4 ml-auto mr-2 flex items-center justify-center size-9 rounded-full bg-card border border-border shadow-lg hover:bg-muted text-foreground transition-all duration-200 cursor-pointer z-30"
                  title="Scroll to bottom"
                  data-testid="scroll-to-bottom-btn"
                >
                  <ArrowDown className="size-4 text-primary dark:text-primary" />
                  {unreadBelowCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      {unreadBelowCount}
                    </span>
                  )}
                </button>
              )}

              <div ref={messagesEndRef} />

              {/* Floating Context Action Menu (Desktop Right-Click & Mobile Long-Press) */}
              {contextMenuMessage && contextMenuPos && (
                <div
                  className="fixed inset-0 z-50 bg-black/10"
                  onClick={() => {
                    setContextMenuMessage(null);
                    setContextMenuPos(null);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenuMessage(null);
                    setContextMenuPos(null);
                  }}
                >
                  <div
                    style={{
                      top: Math.min(contextMenuPos.y, typeof window !== "undefined" ? window.innerHeight - 250 : 400),
                      left: Math.min(contextMenuPos.x, typeof window !== "undefined" ? window.innerWidth - 200 : 400),
                    }}
                    className="absolute bg-popover text-popover-foreground border border-border shadow-xl rounded-xl p-1 w-48 font-sans z-50 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground border-b border-border mb-1">
                      Message Actions
                    </div>
                    <button
                      onClick={() => {
                        setReplyingToMessage(contextMenuMessage);
                        setContextMenuMessage(null);
                        setContextMenuPos(null);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded text-left transition-colors cursor-pointer"
                    >
                      <CornerUpLeft className="size-3.5" /> Reply
                    </button>
                    <button
                      onClick={() => {
                        handleTogglePin(contextMenuMessage.id);
                        setContextMenuMessage(null);
                        setContextMenuPos(null);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded text-left transition-colors cursor-pointer"
                    >
                      <Pin className="size-3.5" /> {contextMenuMessage.isPinned ? "Unpin Message" : "Pin Message"}
                    </button>
                    <button
                      onClick={() => {
                        setForwardMessage(contextMenuMessage);
                        setForwardTargetThreadId(activeThreadId);
                        setContextMenuMessage(null);
                        setContextMenuPos(null);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded text-left transition-colors cursor-pointer"
                    >
                      <Share2 className="size-3.5" /> Forward
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(contextMenuMessage.content);
                        toast.success("Copied to clipboard");
                        setContextMenuMessage(null);
                        setContextMenuPos(null);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded text-left transition-colors cursor-pointer"
                    >
                      <Copy className="size-3.5" /> Copy Message
                    </button>
                    {(contextMenuMessage.senderId === currentUserId ||
                      (currentUser as any)?.id === contextMenuMessage.senderId) &&
                      !contextMenuMessage.isDeletedForEveryone && (
                        <button
                          onClick={() => {
                            setEditingMessage(contextMenuMessage);
                            setEditingContent(contextMenuMessage.content);
                            setContextMenuMessage(null);
                            setContextMenuPos(null);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded text-left transition-colors cursor-pointer"
                        >
                          <Edit3 className="size-3.5" /> Edit Message
                        </button>
                      )}
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={() => {
                        handleDeleteMessage(contextMenuMessage.id, "me");
                        setContextMenuMessage(null);
                        setContextMenuPos(null);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-destructive/10 text-destructive rounded text-left transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" /> Delete for Me
                    </button>
                    {(contextMenuMessage.senderId === currentUserId ||
                      (currentUser as any)?.id === contextMenuMessage.senderId) &&
                      !contextMenuMessage.isDeletedForEveryone && (
                        <button
                          onClick={() => {
                            handleDeleteMessage(contextMenuMessage.id, "everyone");
                            setContextMenuMessage(null);
                            setContextMenuPos(null);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-destructive/10 text-destructive rounded text-left transition-colors cursor-pointer"
                        >
                          <Trash2 className="size-3.5" /> Delete for Everyone
                        </button>
                      )}
                  </div>
                </div>
              )}
            </div>

            {/* Replying To Banner */}
            {replyingToMessage && (
              <div className="px-4 py-2 bg-muted/60 border-t border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <CornerUpLeft className="size-4 text-primary flex-shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-foreground">
                      Replying to {replyingToMessage.senderName}:{" "}
                    </span>
                    <span className="text-muted-foreground truncate">{replyingToMessage.content}</span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={() => setReplyingToMessage(null)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )}

            {/* Rich Composer Attachment Preview Strip */}
            {composerAttachments.length > 0 && (
              <div className="p-3 bg-muted/40 border-t border-border flex items-center gap-3 overflow-x-auto">
                {composerAttachments.map((item, idx) => {
                  const isImage = item.mimeType?.startsWith("image/") || (item.file && item.file.type.startsWith("image/"));
                  const isPdf = item.mimeType?.includes("pdf") || item.name.toLowerCase().endsWith(".pdf");
                  const ext = (item.name.split(".").pop() || "").toUpperCase();

                  return (
                    <div
                      key={item.id || idx}
                      className="group relative flex items-center gap-2.5 p-2 rounded-xl bg-card border border-border shadow-xs max-w-xs flex-shrink-0"
                    >
                      {/* Visual Preview */}
                      <div className="size-14 rounded-lg bg-muted/60 flex items-center justify-center overflow-hidden flex-shrink-0 border border-border/40 relative">
                        {isImage && item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="size-full object-cover"
                          />
                        ) : isPdf ? (
                          <div className="flex flex-col items-center justify-center text-destructive">
                            <FileText className="size-6" />
                            <span className="text-[9px] font-bold mt-0.5">PDF</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-primary">
                            <FileIcon className="size-6" />
                            <span className="text-[9px] font-bold mt-0.5">{ext || "DOC"}</span>
                          </div>
                        )}
                      </div>

                      {/* File Metadata */}
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-xs font-semibold text-foreground truncate max-w-[130px]" title={item.name}>
                          {item.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                          <span>{formatFileSize(item.size)}</span>
                          {item.mediaFile && (
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-primary/10 text-primary dark:bg-primary dark:text-primary border-primary/30">
                              From Media
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Remove Control */}
                      <button
                        type="button"
                        onClick={() => removeComposerAttachment(idx)}
                        className="absolute top-1.5 right-1.5 size-5 rounded-full bg-muted/80 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center text-muted-foreground transition-colors"
                        title="Remove attachment"
                      >
                        <X className="size-3" />
                      </button>

                      {/* Replace Control (For local file) */}
                      {item.file && (
                        <label className="absolute bottom-1.5 right-1.5 size-5 rounded-full bg-muted/80 hover:bg-primary hover:text-primary-foreground flex items-center justify-center text-muted-foreground transition-colors cursor-pointer" title="Replace file">
                          <RotateCcw className="size-3" />
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) replaceComposerAttachment(idx, f);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}

                {/* Button to add from Media Library in preview strip */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMediaPickerPurpose("composer");
                    setMediaPickerOpen(true);
                  }}
                  className="h-14 px-3 text-xs flex flex-col items-center justify-center gap-1 border-dashed border-primary/40 text-primary dark:text-primary hover:bg-primary/50 flex-shrink-0"
                >
                  <ImageIcon className="size-4" />
                  <span className="text-[10px] font-medium">+ Media Library</span>
                </Button>
              </div>
            )}

            {/* Message Composer / Voice Recording Bar */}
            {isRecordingVoice ? (
              <div className="p-3 border-t border-border bg-card flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-semibold text-destructive animate-pulse">
                  <div className="size-3 rounded-full bg-destructive" />
                  <span>Recording voice message... ({formatDuration(voiceDuration)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelVoiceRecording}
                    className="text-xs text-destructive hover:bg-destructive/10"
                    title="Cancel recording"
                  >
                    <Trash2 className="size-3.5 mr-1" /> Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={stopVoiceRecording}
                    className="text-xs"
                    title="Stop & preview"
                  >
                    <Square className="size-3 mr-1" /> Stop & Preview
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={sendVoiceRecording}
                    className="text-xs bg-primary hover:bg-primary text-primary-foreground"
                    title="Send voice note"
                  >
                    <Send className="size-3.5 mr-1" /> Send Voice Note
                  </Button>
                </div>
              </div>
            ) : voicePreviewBlob && voicePreviewUrl ? (
              <div className="p-3 border-t border-border bg-card flex items-center justify-between gap-3 animate-in fade-in">
                <audio
                  ref={voicePreviewAudioRef}
                  src={voicePreviewUrl}
                  onEnded={() => setIsPlayingVoicePreview(false)}
                  className="hidden"
                />
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={togglePlayVoicePreview}
                    className="flex items-center justify-center size-8 rounded-full bg-primary text-primary-foreground hover:bg-primary cursor-pointer"
                    title={isPlayingVoicePreview ? "Pause" : "Play preview"}
                  >
                    {isPlayingVoicePreview ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
                  </button>
                  <span className="font-mono text-xs text-muted-foreground">Voice preview ({formatDuration(voiceDuration || 1)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelVoiceRecording}
                    className="text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5 mr-1" /> Delete
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={sendVoiceRecording}
                    className="text-xs bg-primary hover:bg-primary text-primary-foreground"
                  >
                    <Send className="size-3.5 mr-1" /> Send Voice Note
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 border-t border-border bg-card flex items-center gap-2 relative">
                {/* Mentions Autocomplete Popover */}
                {mentionQuery !== null && activeThreadType === "group" && activeGroup && (
                  <div className="absolute bottom-14 left-12 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl p-1 w-64 z-50 text-xs font-sans">
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b mb-1">
                      Mention Colleague
                    </div>
                    {activeGroup.members
                      .filter((m) =>
                        (m.name || "").toLowerCase().includes(mentionQuery.toLowerCase())
                      )
                      .slice(0, 5)
                      .map((m) => (
                        <button
                          key={m.userId}
                          type="button"
                          onClick={() => {
                            const words = messageInput.split(/\s+/);
                            words.pop();
                            const cleanName = (m.name || "Member").replace(/\s+/g, "");
                            setMessageInput([...words, `@${cleanName} `].join(" "));
                            setMentionQuery(null);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left transition-colors cursor-pointer"
                        >
                          <div
                            className={cn(
                              "size-5 rounded-full flex items-center justify-center font-bold text-[9px] text-foreground flex-shrink-0",
                              getAvatarColor(m.name)
                            )}
                          >
                            {(m.name || "M").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium truncate">{m.name}</span>
                          <span className="text-[10px] text-muted-foreground capitalize ml-auto">
                            {m.role}
                          </span>
                        </button>
                      ))}
                  </div>
                )}

                {/* Attach File Dropdown (Device + Media Library) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      title="Attach files (Device or Media Library)"
                    >
                      <Paperclip className="size-4.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52 font-sans text-xs">
                    <DropdownMenuItem
                      onClick={() => chatFileInputRef.current?.click()}
                      className="gap-2 cursor-pointer"
                    >
                      <Upload className="size-3.5 text-primary" />
                      <span>Upload from Device</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setMediaPickerPurpose("composer");
                        setMediaPickerOpen(true);
                      }}
                      className="gap-2 cursor-pointer"
                    >
                      <ImageIcon className="size-3.5 text-primary" />
                      <span>Choose from Media Library</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <input
                  ref={chatFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  data-testid="chat-file-input"
                  onChange={(e) => {
                    if (e.target.files) handleFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />

                {/* Create Poll Button */}
                <button
                  type="button"
                  onClick={() => setCreatePollOpen(true)}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  title="Create a Poll"
                >
                  <BarChart2 className="size-4.5" />
                </button>

                {/* Input Field */}
                <Input
                  value={messageInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMessageInput(val);
                    if (activeThreadType === "group") {
                      const lastWord = val.split(/\s+/).pop() || "";
                      if (lastWord.startsWith("@")) {
                        setMentionQuery(lastWord.slice(1));
                      } else {
                        setMentionQuery(null);
                      }
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    activeThreadType === "group"
                      ? "Type a message... (Use @ to mention group members)"
                      : "Type your message... (Paste images or drag files directly)"
                  }
                  className="flex-1 text-xs h-9 bg-muted/30 border-border/80 rounded-full px-4 focus-visible:ring-primary font-sans"
                />

                {/* Emoji Inserter */}
                <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      title="Insert emoji"
                    >
                      <Smile className="size-4.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="end"
                    className="p-0 border-none bg-transparent shadow-none w-auto z-50 mb-1"
                  >
                    <EmojiPicker
                      onSelectEmoji={(emoji) => {
                        setMessageInput((prev) => prev + ` ${emoji} `);
                        setEmojiPickerOpen(false);
                      }}
                      onClose={() => setEmojiPickerOpen(false)}
                    />
                  </PopoverContent>
                </Popover>

                {/* Voice Note Button */}
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  title="Record voice note"
                >
                  <Mic className="size-4.5" />
                </button>

                {/* Send Button */}
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || (!messageInput.trim() && composerAttachments.length === 0)}
                  size="sm"
                  className="rounded-full size-8.5 p-0 bg-primary hover:bg-primary text-primary-foreground cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSending ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
            <MessageSquare className="size-12 text-muted-foreground/30" />
            <h3 className="font-bold text-base text-foreground">No Conversation Selected</h3>
            <p className="text-xs max-w-sm">
              Choose a conversation from the sidebar or click New Chat to start communicating.
            </p>
            <Button
              size="sm"
              onClick={() => setNewChatOpen(true)}
              className="text-xs bg-primary hover:bg-primary text-primary-foreground"
            >
              <Plus className="size-3.5 mr-1" /> Start New Chat
            </Button>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* RIGHT COLUMN: CONTACT / GROUP INFO & SHARED FILES DRAWER            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showInfo && activeThreadId && mode !== "calls" && (
        <aside className={cn(
          "w-full md:w-[300px] lg:w-[320px] flex-shrink-0 border-l border-border bg-card flex-col overflow-y-auto",
          mobilePane === "details" ? "flex" : "hidden xl:flex"
        )}>
          <div className="md:hidden flex items-center gap-2 p-3 border-b border-border">
            <button
              type="button"
              data-testid="btn-mobile-back-to-chat"
              onClick={() => setMobilePane("chat")}
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Back to conversation"
            >
              <ArrowLeft className="size-4" />
            </button>
            <span className="text-sm font-semibold">Conversation details</span>
          </div>
          {/* Top Profile Card */}
          <div className="p-6 text-center border-b border-border/70 flex flex-col items-center">
            {activeThreadType === "group" && isEditingGroupSidebar ? (
              <div className="flex flex-col items-center space-y-3 w-full">
                <div className="relative">
                  <Avatar className="size-20 shadow-md">
                    {editGroupAvatarUrl ? (
                      <AvatarImage src={editGroupAvatarUrl} alt={editGroupName || "Group"} className="object-cover" />
                    ) : null}
                    <AvatarFallback className={cn("text-foreground font-bold text-2xl", getAvatarColor(editGroupName || activeThreadTitle))}>
                      {(editGroupName || activeThreadTitle || "G").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isUploadingGroupAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <RefreshCw className="size-5 text-foreground animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleGroupAvatarUpload(file, "editGroup");
                        e.target.value = "";
                      }}
                    />
                    <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-input bg-background hover:bg-accent text-xs font-medium cursor-pointer shadow-2xs">
                      <Upload className="size-3.5 text-primary" />
                      <span>Upload</span>
                    </span>
                  </label>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2.5 gap-1"
                    onClick={() => {
                      setMediaPickerPurpose("editGroup");
                      setMediaPickerOpen(true);
                    }}
                  >
                    <FolderOpen className="size-3.5 text-primary" />
                    <span>Media Library</span>
                  </Button>

                  {editGroupAvatarUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                      onClick={() => {
                        setEditGroupAvatarUrl("");
                        setEditGroupAvatarMediaId("");
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Avatar className="size-18 shadow-md mb-3">
                  {(activeThreadType === "direct"
                    ? participantProfile?.avatarUrl || activeContact?.avatarUrl
                    : activeGroup?.avatarUrl) ? (
                    <AvatarImage
                      src={
                        (activeThreadType === "direct"
                          ? participantProfile?.avatarUrl || activeContact?.avatarUrl
                          : activeGroup?.avatarUrl) || ""
                      }
                      alt={activeThreadTitle}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className={cn("text-foreground font-bold text-2xl", getAvatarColor(activeThreadTitle))}>
                    {(activeThreadTitle || "C").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <h3 className="font-bold text-base text-foreground truncate w-full">
                  {activeThreadType === "group" && activeGroup?.name ? activeGroup.name : activeThreadTitle}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeThreadType === "direct"
                    ? participantProfile?.designation || activeContact?.designation || "Colleague"
                    : `${activeGroup?.memberCount || 0} Members`}
                </p>
              </>
            )}

            {/* Quick action buttons */}
            {activeThreadType === "direct" && (
              <div className="flex items-center gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleInitiateCall(
                      "audio",
                      activeTargetUserId,
                      activeThreadTitle,
                      participantProfile?.phone || activeContact?.phone || "",
                      participantProfile?.email || activeContact?.email || ""
                    )
                  }
                  className="text-xs h-8 gap-1.5"
                >
                  <Phone className="size-3.5 text-primary" /> Audio
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleInitiateCall(
                      "video",
                      activeTargetUserId,
                      activeThreadTitle,
                      participantProfile?.phone || activeContact?.phone || "",
                      participantProfile?.email || activeContact?.email || ""
                    )
                  }
                  className="text-xs h-8 gap-1.5"
                >
                  <Video className="size-3.5 text-primary" /> Video
                </Button>
              </div>
            )}
            {activeThreadType === "group" && (
              <div className="flex items-center gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStartGroupMeeting("audio")}
                  className="text-xs h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  data-testid="btn-sidebar-start-group-audio"
                >
                  <Phone className="size-3.5 text-primary" /> Audio Meeting
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStartGroupMeeting("video")}
                  className="text-xs h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  data-testid="btn-sidebar-start-group-video"
                >
                  <Video className="size-3.5 text-primary" /> Video Meeting
                </Button>
              </div>
            )}
          </div>

          {/* Drawer Navigation Tabs: Info / Members / Activity / Shared Files */}
          <div className="flex items-center border-b border-border/80 text-xs">
            <button
              onClick={() => setInfoTab("info")}
              className={cn(
                "flex-1 py-2.5 font-medium border-b-2 text-center transition-colors cursor-pointer",
                infoTab === "info"
                  ? "border-primary/30 text-primary dark:text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Info
            </button>
            {activeThreadType === "group" && (
              <>
                <button
                  onClick={() => setInfoTab("members")}
                  className={cn(
                    "flex-1 py-2.5 font-medium border-b-2 text-center transition-colors cursor-pointer",
                    infoTab === "members"
                      ? "border-primary/30 text-primary dark:text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Members ({activeGroup?.memberCount || 0})
                </button>
                <button
                  onClick={() => setInfoTab("activity")}
                  className={cn(
                    "flex-1 py-2.5 font-medium border-b-2 text-center transition-colors cursor-pointer",
                    infoTab === "activity"
                      ? "border-primary/30 text-primary dark:text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Activity
                </button>
              </>
            )}
            <button
              onClick={() => setInfoTab("files")}
              className={cn(
                "flex-1 py-2.5 font-medium border-b-2 text-center transition-colors cursor-pointer",
                infoTab === "files"
                  ? "border-primary/30 text-primary dark:text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Files ({allSharedFiles.length})
            </button>
          </div>

          {/* TAB 1: DETAILS */}
          {infoTab === "info" && (
            <div className="p-4 space-y-4 text-xs">
              {activeThreadType === "direct" ? (
                <>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      Email Address
                    </span>
                    <p className="text-foreground font-medium flex items-center gap-2">
                      <Mail className="size-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{participantProfile?.email || activeContact?.email || "—"}</span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      Phone Number
                    </span>
                    <p className="text-foreground font-medium flex items-center gap-2">
                      <Phone className="size-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{participantProfile?.phone || activeContact?.phone || "—"}</span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      Department
                    </span>
                    <p className="text-foreground font-medium flex items-center gap-2">
                      <Building className="size-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{participantProfile?.department || activeContact?.department || "—"}</span>
                    </p>
                  </div>
                </>
              ) : isEditingGroupSidebar ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                      Group Name *
                    </label>
                    <Input
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      maxLength={100}
                      placeholder="Enter group name"
                      className="h-8 text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                      Description
                    </label>
                    <textarea
                      value={editGroupDescription}
                      onChange={(e) => setEditGroupDescription(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="Add a description for this group..."
                      className="w-full text-xs p-2 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                    />
                    <p className="text-[10px] text-muted-foreground text-right">{editGroupDescription.length}/500</p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => {
                        if (activeGroup) {
                          setEditGroupName(activeGroup.name);
                          setEditGroupDescription(activeGroup.description || "");
                          setEditGroupAvatarUrl(activeGroup.avatarUrl || "");
                          setEditGroupAvatarMediaId("");
                        }
                        setIsEditingGroupSidebar(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs bg-primary hover:bg-primary text-primary-foreground font-sans"
                      disabled={!editGroupName.trim() || updateGroupMutation.isPending}
                      onClick={() => {
                        const targetId = activeGroup?.id || activeGroupId || (activeThreadId?.startsWith("group_") ? activeThreadId.replace("group_", "") : "");
                        if (!targetId || !editGroupName.trim()) return;
                        updateGroupMutation.mutate({
                          groupId: targetId,
                          name: editGroupName.trim(),
                          description: editGroupDescription.trim(),
                          avatarUrl: editGroupAvatarUrl.trim() || null as any,
                        });
                      }}
                    >
                      {updateGroupMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      Group Description
                    </span>
                    <p className="text-foreground font-medium mt-1">
                      {activeGroup?.description || "No description provided for this chat group."}
                    </p>
                  </div>

                  <div className="pt-2 border-t space-y-2">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                      Group Administration
                    </span>

                    {/* Edit Group Button (Owner/Admin only) */}
                    {(activeGroup?.ownerId === currentUserId ||
                      activeGroup?.members?.some(
                        (m) => m.userId === currentUserId && (m.role === "owner" || m.role === "admin")
                      )) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs justify-start gap-2"
                        onClick={() => {
                          setEditGroupName(activeGroup.name);
                          setEditGroupDescription(activeGroup.description || "");
                          setEditGroupAvatarUrl(activeGroup.avatarUrl || "");
                          setEditGroupAvatarMediaId("");
                          setIsEditingGroupSidebar(true);
                        }}
                      >
                        <Edit3 className="size-3.5 text-primary" />
                        <span>Edit Group Details</span>
                      </Button>
                    )}

                    {/* Mute/Unmute Notifications */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs justify-start gap-2"
                      onClick={() => activeGroup && toggleMuteGroupMutation.mutate(activeGroup.id)}
                    >
                      {activeGroup?.isMuted ? (
                        <>
                          <BellOff className="size-3.5 text-warning" />
                          <span>Unmute Notifications</span>
                        </>
                      ) : (
                        <>
                          <Bell className="size-3.5 text-primary" />
                          <span>Mute Notifications</span>
                        </>
                      )}
                    </Button>

                    {/* Leave Group Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setLeaveGroupOpen(true)}
                    >
                      <LogOut className="size-3.5" />
                      <span>Leave Group</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MEMBERS (GROUPS) */}
          {infoTab === "members" && activeGroup && (
            <div className="p-3 space-y-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddMemberOpen(true)}
                className="w-full text-xs gap-1.5"
              >
                <UserPlus className="size-3.5" /> Add Member
              </Button>

              <div className="divide-y divide-border/60">
                {activeGroup.members?.map((m) => {
                  const isCurrentMemberOwner = activeGroup.ownerId === currentUserId || activeGroup.members.some(
                    (cur) => cur.userId === currentUserId && cur.role === "owner"
                  );
                  const isCurrentMemberAdmin = isCurrentMemberOwner || activeGroup.members.some(
                    (cur) => cur.userId === currentUserId && cur.role === "admin"
                  );
                  const canManageMember = isCurrentMemberAdmin && m.userId !== currentUserId && m.role !== "owner";

                  return (
                    <div key={m.id || m.userId} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="size-7 flex-shrink-0 shadow-2xs">
                          {m.avatarUrl && (
                            <AvatarImage src={m.avatarUrl} alt={m.name} className="object-cover" />
                          )}
                          <AvatarFallback className={cn("text-foreground font-bold text-[10px]", getAvatarColor(m.name))}>
                            {(m.name || "M").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                          <p className="font-semibold truncate flex items-center gap-1.5">
                            <span>{m.name}</span>
                            {m.userId === currentUserId && (
                              <span className="text-[10px] text-muted-foreground">(You)</span>
                            )}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1 py-0 capitalize mt-0.5",
                              m.role === "owner"
                                ? "bg-warning/10 text-warning dark:text-warning border-warning/30 font-bold"
                                : m.role === "admin"
                                ? "bg-accent/10 text-accent-foreground dark:text-accent-foreground border-accent/30 font-semibold"
                                : m.role === "moderator"
                                ? "bg-accent/10 text-accent-foreground dark:text-accent-foreground border-accent/30"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {m.role}
                          </Badge>
                        </div>
                      </div>

                      {canManageMember && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-6 text-muted-foreground hover:text-foreground">
                              <MoreVertical className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 font-sans text-xs">
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground border-b mb-1">
                              Manage Member
                            </div>
                            <DropdownMenuItem
                              onClick={() =>
                                changeMemberRoleMutation.mutate({
                                  groupId: activeGroup.id,
                                  userId: m.userId,
                                  role: m.role === "admin" ? "member" : "admin",
                                })
                              }
                            >
                              <Shield className="size-3.5 mr-2" />
                              {m.role === "admin" ? "Demote to Member" : "Promote to Admin"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                changeMemberRoleMutation.mutate({
                                  groupId: activeGroup.id,
                                  userId: m.userId,
                                  role: m.role === "moderator" ? "member" : "moderator",
                                })
                              }
                            >
                              <Shield className="size-3.5 mr-2" />
                              {m.role === "moderator" ? "Demote to Member" : "Make Moderator"}
                            </DropdownMenuItem>
                            {isCurrentMemberOwner && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedNewOwnerId(m.userId);
                                  setTransferOwnershipOpen(true);
                                }}
                              >
                                <Users className="size-3.5 mr-2" />
                                Transfer Ownership
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                removeMemberMutation.mutate({
                                  groupId: activeGroup.id,
                                  userId: m.userId,
                                })
                              }
                            >
                              <UserMinus className="size-3.5 mr-2" />
                              Remove from Group
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

          {/* TAB 3: ACTIVITY (SYSTEM EVENTS) */}
          {infoTab === "activity" && activeGroup && (
            <div className="p-3 space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Group Activity Timeline
              </p>
              {isActivityLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <RefreshCw className="size-4 animate-spin mx-auto mb-2 text-primary" />
                  Loading activity...
                </div>
              ) : groupActivityEvents.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">
                  No activity records logged for this group.
                </p>
              ) : (
                <div className="space-y-3">
                  {groupActivityEvents.map((evt: any) => (
                    <div
                      key={evt.id}
                      className="p-2.5 rounded-lg border border-border/60 bg-muted/30 text-xs space-y-1"
                    >
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <InfoIcon className="size-3.5 text-primary flex-shrink-0" />
                        <span>{evt.content}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SHARED FILES */}
          {infoTab === "files" && (
            <div className="p-3 space-y-3">
              <div className="relative">
                <Search className="size-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={sharedFilesSearch}
                  onChange={(e) => setSharedFilesSearch(e.target.value)}
                  placeholder="Filter shared files..."
                  className="pl-7 h-7.5 text-xs"
                />
              </div>

              {allSharedFiles.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">
                  No files shared in this thread yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {allSharedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg border border-border/70 bg-card hover:bg-muted/40 transition-colors flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon className="size-4 text-primary flex-shrink-0" />
                        <div className="truncate">
                          <p className="font-medium truncate">{f.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatFileSize(f.size)} • {f.senderName}
                          </p>
                        </div>
                      </div>
                      <a
                        href={f.url}
                        download={f.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-muted rounded text-primary"
                        title="Download file"
                      >
                        <Download className="size-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* DIALOGS & MODALS                                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      {/* 1. START NEW CHAT DIALOG */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent
          className="sm:max-w-[420px] font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="font-sans">Start New Direct Chat</DialogTitle>
            <DialogDescription className="font-sans">
              Select a colleague from your organization directory to message.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 font-sans">
            <div className="relative">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
                placeholder="Search by name, email, or department..."
                className="pl-8 text-xs h-9 font-sans"
              />
            </div>

            <div className="max-h-[260px] overflow-y-auto space-y-1 border border-border rounded-md p-1">
              {dialogFilteredContacts.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground font-sans">
                  No colleagues found matching your query.
                </p>
              ) : (
                dialogFilteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => startDirectConversationMutation.mutate(contact.userId || contact.id)}
                    className="p-2 rounded-md hover:bg-muted/80 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "size-8 rounded-full flex items-center justify-center font-bold text-xs text-foreground flex-shrink-0",
                          contact.avatarColor
                        )}
                      >
                        {contact.avatarLetter}
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-foreground truncate">{contact.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {contact.designation} • {contact.department}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-primary">
                      Start
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. CREATE GROUP DIALOG */}
      <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
        <DialogContent
          className="sm:max-w-[460px] font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="font-sans">Create Chat Group</DialogTitle>
            <DialogDescription className="font-sans">
              Set up a channel for your department, team, or project members.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 font-sans">
            {groupFormError && (
              <div className="p-2.5 text-xs rounded bg-destructive/10 text-destructive flex items-center gap-2">
                <AlertCircle className="size-4 flex-shrink-0" />
                <span>{groupFormError}</span>
              </div>
            )}

            {/* Group Avatar Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Group Avatar (Optional)</Label>
              <div className="flex items-center gap-3">
                <div className="size-14 rounded-full border border-border/80 bg-muted/40 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xs relative">
                  {newGroupAvatarUrl ? (
                    <img
                      src={newGroupAvatarUrl}
                      alt="Group Avatar"
                      className="size-full object-cover"
                    />
                  ) : (
                    <Users className="size-6 text-muted-foreground/60" />
                  )}
                  {isUploadingGroupAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <RefreshCw className="size-4 text-foreground animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 font-sans"
                      onClick={() => {
                        setMediaPickerPurpose("newGroup");
                        setMediaPickerOpen(true);
                      }}
                    >
                      <ImageIcon className="size-3.5 text-primary" />
                      Choose from Media Library
                    </Button>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleGroupAvatarUpload(file, "newGroup");
                          e.target.value = "";
                        }}
                      />
                      <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-input bg-background hover:bg-accent text-xs font-medium cursor-pointer shadow-xs">
                        <Upload className="size-3.5 text-primary" />
                        Upload
                      </span>
                    </label>
                    {newGroupAvatarUrl && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                        onClick={() => {
                          setNewGroupAvatarUrl("");
                          setNewGroupAvatarMediaId("");
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    PNG, JPG, WebP or GIF up to 10MB. Stored under Chat/Images.
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="group-name" className="text-xs font-semibold">
                Group Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="group-name"
                value={newGroupName}
                onChange={(e) => {
                  setNewGroupName(e.target.value);
                  setGroupFormError("");
                }}
                placeholder="e.g. Engineering Sync"
                className="text-xs h-9 font-sans"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="group-desc" className="text-xs font-semibold">
                Description (Optional)
              </Label>
              <Input
                id="group-desc"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Short purpose of this channel"
                className="text-xs h-9 font-sans"
              />
            </div>

            {/* Selected Member Chips */}
            {selectedGroupMemberIds.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  Selected Members ({selectedGroupMemberIds.length})
                </Label>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 border border-border/60 rounded-md bg-muted/20">
                  {selectedGroupMemberIds.map((id) => {
                    const c = contacts.find((contact) => (contact.userId || contact.id) === id);
                    if (!c) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] bg-primary/10 dark:bg-primary/60 text-primary dark:text-primary border border-primary/30"
                      >
                        <span className="font-medium">{c.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedGroupMemberIds((prev) => prev.filter((mId) => mId !== id))}
                          className="hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Member Selector List with Search */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Add Members <span className="text-destructive">*</span>
                </Label>
                <span className="text-[10px] text-muted-foreground">Select at least 1 colleague</span>
              </div>

              <div className="relative">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={newGroupMemberSearch}
                  onChange={(e) => setNewGroupMemberSearch(e.target.value)}
                  placeholder="Filter colleagues to invite..."
                  className="pl-8 text-xs h-8 font-sans"
                />
              </div>

              <div className="max-h-[160px] overflow-y-auto space-y-1.5 border border-border rounded-md p-2">
                {dialogGroupCandidateContacts.map((contact) => {
                  const targetId = contact.userId || contact.id;
                  const isChecked = selectedGroupMemberIds.includes(targetId);

                  return (
                    <div
                      key={contact.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedGroupMemberIds((prev) => prev.filter((id) => id !== targetId));
                        } else {
                          setSelectedGroupMemberIds((prev) => [...prev, targetId]);
                          setGroupFormError("");
                        }
                      }}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/70 cursor-pointer"
                    >
                      <Checkbox
                        id={`group-member-${contact.id}`}
                        checked={isChecked}
                        onCheckedChange={() => {}}
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={cn(
                            "size-6 rounded-full flex items-center justify-center font-bold text-[10px] text-foreground flex-shrink-0",
                            contact.avatarColor
                          )}
                        >
                          {contact.avatarLetter}
                        </div>
                        <span className="text-xs font-medium truncate">{contact.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate ml-auto">
                          {contact.department || contact.designation}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="font-sans">
            <Button variant="outline" size="sm" onClick={() => setCreateGroupOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary text-primary-foreground font-sans"
              disabled={createGroupMutation.isPending}
              onClick={() => {
                if (!newGroupName.trim()) {
                  setGroupFormError("Please enter a group name.");
                  return;
                }
                if (selectedGroupMemberIds.length === 0) {
                  setGroupFormError("Please select at least 1 member for the group.");
                  return;
                }
                createGroupMutation.mutate({
                  name: newGroupName.trim(),
                  description: newGroupDescription.trim(),
                  memberIds: selectedGroupMemberIds,
                  avatarUrl: newGroupAvatarUrl.trim() || undefined,
                });
              }}
            >
              {createGroupMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. ADD MEMBERS TO GROUP DIALOG (MULTI-SELECTION & BATCH ADD) */}
      <Dialog
        open={addMemberOpen}
        onOpenChange={(open) => {
          setAddMemberOpen(open);
          if (!open) {
            setSelectedAddMemberIds([]);
            setSelectedAddMemberId("");
            setAddMemberSearch("");
          }
        }}
      >
        <DialogContent
          className="sm:max-w-[460px] font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="font-sans flex items-center justify-between">
              <span>Add Members to Group</span>
              {selectedAddMemberIds.length > 0 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary dark:bg-primary/60 dark:text-primary">
                  {selectedAddMemberIds.length} selected
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="font-sans text-xs">
              Select one or multiple colleagues to add to &quot;{activeGroup?.name}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 font-sans">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search colleagues by name or department..."
                value={addMemberSearch}
                onChange={(e) => setAddMemberSearch(e.target.value)}
                className="pl-8 text-xs h-9 font-sans"
              />
              {addMemberSearch && (
                <button
                  onClick={() => setAddMemberSearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Selection Toolbar */}
            {(() => {
              const eligibleContacts = contacts.filter((c) => {
                const isMember = activeGroup?.members?.some(
                  (m) => m.userId === (c.userId || c.id) || m.id === c.id
                );
                if (isMember) return false;
                if (!addMemberSearch.trim()) return true;
                const q = addMemberSearch.toLowerCase();
                return (
                  c.name?.toLowerCase().includes(q) ||
                  c.department?.toLowerCase().includes(q) ||
                  c.email?.toLowerCase().includes(q)
                );
              });

              const allEligibleSelected =
                eligibleContacts.length > 0 &&
                eligibleContacts.every((c) => selectedAddMemberIds.includes(c.userId || c.id));

              return (
                <>
                  <div className="flex items-center justify-between px-1 text-xs">
                    <span className="text-muted-foreground text-[11px]">
                      {eligibleContacts.length} colleague(s) available
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] text-primary hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/40"
                        onClick={() => {
                          if (allEligibleSelected) {
                            setSelectedAddMemberIds([]);
                          } else {
                            setSelectedAddMemberIds(eligibleContacts.map((c) => c.userId || c.id));
                          }
                        }}
                      >
                        {allEligibleSelected ? "Clear Selection" : "Select All"}
                      </Button>
                      {selectedAddMemberIds.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedAddMemberIds([])}
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-[260px] overflow-y-auto space-y-1 border border-border rounded-md p-1.5">
                    {eligibleContacts.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        {addMemberSearch ? "No colleagues match your search." : "All colleagues are already in this group."}
                      </div>
                    ) : (
                      eligibleContacts.map((contact) => {
                        const contactId = contact.userId || contact.id;
                        const isSelected = selectedAddMemberIds.includes(contactId);

                        return (
                          <div
                            key={contact.id}
                            onClick={() => {
                              setSelectedAddMemberIds((prev) =>
                                prev.includes(contactId)
                                  ? prev.filter((id) => id !== contactId)
                                  : [...prev, contactId]
                              );
                              setSelectedAddMemberId(contactId);
                            }}
                            className={cn(
                              "p-2 rounded-md flex items-center justify-between cursor-pointer text-xs transition-colors select-none",
                              isSelected
                                ? "bg-primary/10 dark:bg-primary/60 font-medium text-primary dark:text-primary border border-primary/30 dark:border-primary/30"
                                : "hover:bg-muted/80 border border-transparent"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => {
                                  setSelectedAddMemberIds((prev) =>
                                    prev.includes(contactId)
                                      ? prev.filter((id) => id !== contactId)
                                      : [...prev, contactId]
                                  );
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary/30"
                              />
                              <div
                                className={cn(
                                  "size-8 rounded-full flex items-center justify-center font-bold text-[11px] text-foreground shrink-0 shadow-xs",
                                  contact.avatarColor
                                )}
                              >
                                {contact.avatarLetter}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-xs truncate">{contact.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {contact.department || contact.email || "Employee"}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          <DialogFooter className="font-sans flex items-center justify-between sm:justify-between pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAddMemberOpen(false);
                setSelectedAddMemberIds([]);
                setAddMemberSearch("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary text-primary-foreground font-sans"
              disabled={selectedAddMemberIds.length === 0 || addGroupMemberMutation.isPending}
              onClick={() => {
                if (activeGroup && selectedAddMemberIds.length > 0) {
                  addGroupMemberMutation.mutate({
                    groupId: activeGroup.id,
                    memberIds: selectedAddMemberIds,
                  });
                }
              }}
            >
              {addGroupMemberMutation.isPending
                ? "Adding..."
                : `Add ${selectedAddMemberIds.length > 0 ? `(${selectedAddMemberIds.length})` : ""} to Group`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRE-CALL DEVICE & PERMISSION MODAL */}
      <Dialog open={preCallModalOpen} onOpenChange={(open) => !open && closePreCallModal()}>
        <DialogContent
          className="sm:max-w-md font-sans text-center"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="font-sans flex items-center justify-center gap-2">
              {preCallType === "video" ? <Video className="size-5 text-primary" /> : <Phone className="size-5 text-primary" />}
              <span>{preCallType === "video" ? "Video Call Setup" : "Voice Call Setup"}</span>
            </DialogTitle>
            <DialogDescription className="font-sans text-xs">
              Calling &quot;{preCallTarget?.name || "Colleague"}&quot; &bull; Check your camera and microphone
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 flex flex-col items-center font-sans space-y-3">
            {preCallPermissionState === "denied" ? (
              <div className="w-full p-4 rounded-lg bg-destructive/10 dark:bg-destructive/40 border border-destructive/30 dark:border-destructive/30 text-destructive dark:text-destructive text-xs text-left space-y-2">
                <div className="flex items-center gap-2 font-semibold text-destructive dark:text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>Microphone or Camera Permission Blocked</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Your browser has blocked media device access. Please click the permissions icon (padlock) in your browser address bar, set Camera and Microphone to &quot;Allow&quot;, and retry.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 mt-1 border-destructive/30 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/50"
                  onClick={retryPreCallPermission}
                >
                  <RefreshCw className="size-3 mr-1" /> Retry Permissions
                </Button>
              </div>
            ) : preCallType === "video" ? (
              <div className="w-full h-52 bg-background rounded-xl relative overflow-hidden flex items-center justify-center border border-border">
                {preCallVideoOff ? (
                  <div className="flex flex-col items-center justify-center text-muted-foreground text-xs">
                    <VideoOff className="size-8 mb-2 opacity-60" />
                    <span>Camera is turned off</span>
                  </div>
                ) : (
                  <video
                    ref={(el) => {
                      preCallVideoRef.current = el;
                      if (el && preCallStream && !preCallVideoOff) {
                        if (el.srcObject !== preCallStream) {
                          el.srcObject = preCallStream;
                        }
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] text-foreground flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", preCallMicMuted ? "bg-warning" : "bg-success animate-pulse")} />
                  <span>{preCallMicMuted ? "Mic Muted" : "Mic Live"}</span>
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] text-foreground flex items-center gap-1">
                  <ShieldCheck className="size-3 text-primary" />
                  <span>HD Preview Ready</span>
                </div>
              </div>
            ) : (
              <div className="w-full py-6 px-4 rounded-xl bg-muted/40 border border-border flex flex-col items-center justify-center gap-3">
                <div className="size-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl shadow-md">
                  {preCallTarget?.name?.charAt(0) || "C"}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-xs text-foreground">{preCallTarget?.name}</p>
                  <p className="text-[11px] text-muted-foreground">{preCallTarget?.phone || preCallTarget?.email || "Internal Call"}</p>
                </div>
                <Badge variant="outline" className="text-[10px] text-primary bg-primary/10 dark:bg-primary/40 border-primary/30">
                  {preCallMicMuted ? "Microphone Muted" : "Microphone Ready"}
                </Badge>
              </div>
            )}

            {/* Live Audio Level Meter */}
            <div className="w-full bg-muted/50 rounded-lg p-2.5 border border-border/70 space-y-1.5 text-left">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <Activity className={cn("size-3.5", micVolumeLevel > 5 ? "text-success animate-pulse" : "text-muted-foreground")} />
                  <span>Microphone Input Level</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {preCallMicMuted ? "Muted" : `${Math.round(micVolumeLevel)}%`}
                </span>
              </div>
              <div className="flex items-center gap-1 h-3 w-full bg-card/30 rounded px-1.5">
                {Array.from({ length: 14 }).map((_, i) => {
                  const threshold = ((i + 1) / 14) * 100;
                  const isActive = !preCallMicMuted && micVolumeLevel >= threshold;
                  const isRed = i >= 11;
                  const isYellow = i >= 8 && i < 11;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 h-1.5 rounded-[1px] transition-all duration-75",
                        isActive
                          ? isRed
                            ? "bg-destructive"
                            : isYellow
                            ? "bg-warning"
                            : "bg-success"
                          : "bg-muted-foreground/20"
                      )}
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Speak to test your microphone &bull; The indicator reacts dynamically to your voice
              </p>
            </div>

            {/* Pre-Call Media Toggles */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                type="button"
                variant={preCallMicMuted ? "destructive" : "outline"}
                size="sm"
                className="h-8 px-3 text-xs flex items-center gap-1.5"
                onClick={togglePreCallMic}
              >
                {preCallMicMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                <span>{preCallMicMuted ? "Unmute Mic" : "Mute Mic"}</span>
              </Button>

              {preCallType === "video" && (
                <Button
                  type="button"
                  variant={preCallVideoOff ? "destructive" : "outline"}
                  size="sm"
                  className="h-8 px-3 text-xs flex items-center gap-1.5"
                  onClick={togglePreCallVideo}
                >
                  {preCallVideoOff ? <VideoOff className="size-3.5" /> : <Video className="size-3.5" />}
                  <span>{preCallVideoOff ? "Turn Cam On" : "Turn Cam Off"}</span>
                </Button>
              )}
            </div>

            {/* Device Selectors & Speaker Chime Test */}
            <div className="w-full space-y-2 text-left pt-2 border-t text-[11px]">
              {audioInputDevices.length > 1 && (
                <div>
                  <label className="text-muted-foreground block text-[10px] font-medium">Microphone Input</label>
                  <select
                    value={selectedAudioInputId}
                    onChange={(e) => setSelectedAudioInputId(e.target.value)}
                    className="w-full mt-0.5 bg-background border border-border rounded px-2 py-1 text-xs truncate"
                  >
                    {audioInputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {preCallType === "video" && videoInputDevices.length > 1 && (
                <div>
                  <label className="text-muted-foreground block text-[10px] font-medium">Camera</label>
                  <select
                    value={selectedVideoDeviceId}
                    onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
                    className="w-full mt-0.5 bg-background border border-border rounded px-2 py-1 text-xs truncate"
                  >
                    {videoInputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Speaker Output Chooser & Test Sound */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="min-w-0 flex-1">
                  <label className="text-muted-foreground block text-[10px] font-medium">Speaker Output</label>
                  {audioOutputDevices.length > 1 ? (
                    <select
                      value={selectedAudioOutputId}
                      onChange={(e) => setAudioOutputDevice(e.target.value)}
                      className="w-full mt-0.5 bg-background border border-border rounded px-2 py-1 text-xs truncate"
                    >
                      {audioOutputDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Speaker ${d.deviceId.slice(0, 5)}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-foreground truncate block">System Default Speaker</span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testSpeakerSound}
                  className="h-7 text-xs shrink-0 flex items-center gap-1 border-primary/30 dark:border-primary/30 text-primary dark:text-primary hover:bg-primary/10 dark:hover:bg-primary/40"
                  title="Play test audio tone"
                >
                  <Volume2 className="size-3" />
                  <span>Test Audio</span>
                </Button>
              </div>

              {/* Network Latency Check Badge */}
              <div className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-primary/70 dark:bg-primary/30 border border-primary/60 dark:border-primary/40 text-[11px] text-primary dark:text-primary">
                <span className="flex items-center gap-1.5">
                  <Signal className="size-3.5 text-primary dark:text-primary" />
                  <span>Signaling Quality</span>
                </span>
                <span className="font-semibold text-success dark:text-success flex items-center gap-1">
                  <ShieldCheck className="size-3.5" /> Low Latency (P2P Ready)
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="font-sans flex items-center justify-between sm:justify-between pt-2 border-t">
            <Button variant="outline" size="sm" onClick={closePreCallModal}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-success hover:bg-success text-success-foreground font-sans flex items-center gap-1.5"
              disabled={preCallPermissionState === "denied"}
              onClick={() => {
                if (preCallTarget) {
                  const target = preCallTarget;
                  const type = preCallType;
                  const stream = preCallStream;
                  const muted = preCallMicMuted;
                  const vidOff = preCallVideoOff;
                  setPreCallModalOpen(false);
                  setPreCallStream(null);
                  startActualCall(type, target.targetUserId, target.name, target.phone || "", target.email || "", stream, muted, vidOff);
                }
              }}
            >
              <Phone className="size-3.5" />
              <span>Start {preCallType === "video" ? "Video" : "Voice"} Call</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. REAL INTERACTIVE WEBRTC CALL MODAL (AUDIO & VIDEO) */}
      <Dialog open={activeCallModalOpen && !isCallMinimized} onOpenChange={setActiveCallModalOpen}>
        <DialogContent
          className={cn(
            "font-sans text-center transition-all duration-200 [&>button:last-child]:hidden",
            activeCallType === "video"
              ? "w-screen max-w-none h-[100dvh] sm:max-w-none rounded-none border-0 p-3 sm:p-5 bg-background text-foreground flex flex-col justify-between"
              : "sm:max-w-md bg-card text-foreground"
          )}
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          {/* Header Bar */}
          <div className="w-full flex items-center justify-between px-1 py-1 border-b border-border/40 shrink-0">
            <div className="flex items-center gap-2 text-left min-w-0">
              <div className="p-1 rounded bg-primary/20 text-primary shrink-0">
                <LockIcon className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate leading-none max-w-[150px] sm:max-w-xs">
                  {activeCallTargetName || "Direct Meeting"}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                  <span className="size-1.5 rounded-full bg-success animate-pulse" />
                  <span className="font-mono text-success font-medium">{formatDuration(callDurationSeconds)}</span>
                  <span>&bull;</span>
                  <span className="capitalize">{activeCallType} Call &bull; Encrypted</span>
                </div>
              </div>
            </div>

            {/* Quality & Meeting Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Network Signal Indicator */}
              <div
                className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/60 text-[10px] font-mono cursor-help"
                title={`Connection Round Trip: ${networkRttMs}ms (${networkQuality})`}
              >
                <div className="flex items-end gap-0.5 h-3">
                  <div className={cn("w-1 rounded-[1px] h-1.5", networkQuality !== "poor" ? "bg-success" : "bg-destructive")} />
                  <div className={cn("w-1 rounded-[1px] h-2.5", networkQuality !== "poor" ? "bg-success" : "bg-destructive")} />
                  <div className={cn("w-1 rounded-[1px] h-3", networkQuality === "excellent" ? "bg-success" : "bg-muted-foreground/30")} />
                </div>
                <span>{networkRttMs}ms</span>
              </div>

              {activeCallType === "video" && (
                <>
                  {/* View Mode Toggle: Speaker vs Grid */}
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="call-btn-viewmode"
                    className="size-7 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                    title={viewMode === "speaker" ? "Switch to Grid View" : "Switch to Speaker View"}
                    onClick={() => setViewMode(viewMode === "speaker" ? "grid" : "speaker")}
                  >
                    <Sliders className="size-3.5" />
                  </Button>

                  {/* Picture-in-Picture */}
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="call-btn-pip"
                    className="size-7 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Picture-in-Picture"
                    onClick={togglePictureInPicture}
                  >
                    <Tv className="size-3.5" />
                  </Button>

                  {/* Fullscreen Toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="call-btn-fullscreen"
                    className="size-7 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Toggle Fullscreen"
                    onClick={toggleFullscreenCall}
                  >
                    {isCallFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                  </Button>
                </>
              )}

              {/* Minimize Call to Floating PiP */}
              <Button
                variant="ghost"
                size="icon"
                data-testid="call-btn-minimize"
                className="size-7 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                title="Minimize Call to Widget"
                onClick={() => setIsCallMinimized(true)}
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>
          </div>

          {/* Reconnecting State Alert */}
          {isReconnecting && (
            <div className="w-full bg-warning/90 text-foreground px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold animate-pulse shadow-md my-1.5 shrink-0">
              <RefreshCw className="size-3.5 animate-spin" />
              <span>Reconnecting WebRTC media stream... Network transition detected</span>
            </div>
          )}

          {/* Remote Screen Sharing Alert Banner */}
          {remoteIsScreenSharing && !isScreenSharing && (
            <div className="w-full bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold shadow-md my-1 shrink-0 animate-in fade-in">
              <Tv className="size-3.5 animate-pulse" />
              <span>{activeCallTargetName || "Colleague"} is sharing their screen</span>
            </div>
          )}

          {/* Media Stage */}
          <div className={cn("w-full flex-1 min-h-0 my-2 relative overflow-hidden flex items-center justify-center", activeCallType === "video" ? "bg-background rounded-xl border border-border" : "py-6")}>
            {activeCallType === "video" ? (
              isScreenSharing ? (
                /* SCREEN SHARE PRESENTATION STAGE */
                <div className="w-full h-full relative flex flex-col items-center justify-between p-2">
                  {/* Top Presenter Ownership Banner */}
                  <div className="absolute top-3 z-30 flex items-center gap-3 px-3.5 py-1 rounded-full bg-card/90 text-foreground border border-primary/50 shadow-xl text-xs">
                    <Tv className="size-3.5 text-primary" />
                    <span>Presenting your screen</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 text-[10px] px-2.5 rounded-full bg-destructive hover:bg-destructive cursor-pointer"
                      onClick={toggleScreenShare}
                    >
                      Stop Sharing
                    </Button>
                  </div>

                  {/* 88-90% Presentation View */}
                  <div className="w-full flex-1 min-h-0 relative rounded-lg overflow-hidden flex items-center justify-center bg-black">
                    <video
                      ref={(el) => {
                        localVideoRef.current = el;
                        if (el && localStreamRef.current) {
                          if (el.srcObject !== localStreamRef.current) {
                            el.srcObject = localStreamRef.current;
                          }
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* 10-12% Participant Thumbnail Strip */}
                  <div className="w-full h-24 pt-2 flex items-center justify-center gap-3 z-20 shrink-0">
                    {/* Remote participant card */}
                    <div className={cn("h-full aspect-video rounded-lg bg-card relative overflow-hidden border", remoteIsSpeaking ? "border-success/30 ring-2 ring-success/50" : "border-border")}>
                      <video
                        ref={(el) => {
                          remoteVideoRef.current = el;
                          if (el && remoteStreamRef.current) {
                            if (el.srcObject !== remoteStreamRef.current) {
                              el.srcObject = remoteStreamRef.current;
                            }
                          }
                        }}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-foreground flex items-center gap-1">
                        <span>{activeCallTargetName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : viewMode === "grid" ? (
                /* GRID MODE (EQUAL 50/50 TILES) */
                <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-3 p-2">
                  {/* Remote Tile */}
                  <div className={cn("w-full h-full bg-card rounded-xl relative overflow-hidden flex items-center justify-center border", remoteIsSpeaking ? "border-success/30 ring-4 ring-success/40" : "border-border")}>
                    <video
                      ref={(el) => {
                        remoteVideoRef.current = el;
                        if (el && remoteStreamRef.current) {
                          if (el.srcObject !== remoteStreamRef.current) {
                            el.srcObject = remoteStreamRef.current;
                          }
                        }
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {!remoteStreamRef.current?.getVideoTracks().some((track) => track.enabled) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background text-foreground">
                        <div className={cn("size-16 rounded-full flex items-center justify-center text-xl font-bold", getAvatarColor(activeCallTargetName))}>
                          {(activeCallTargetName || "C").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-foreground">{activeCallTargetName}&apos;s camera paused</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] text-foreground flex items-center gap-1">
                      <span>{activeCallTargetName}</span>
                      {remoteIsSpeaking && <span className="text-success font-medium">&bull; Speaking</span>}
                    </div>
                  </div>

                  {/* Local Tile */}
                  <div className={cn("w-full h-full bg-card rounded-xl relative overflow-hidden flex items-center justify-center border", localIsSpeaking ? "border-success/30 ring-4 ring-success/40" : "border-border")}>
                    {isVideoOff ? (
                      <div className="flex flex-col items-center justify-center text-muted-foreground text-xs gap-1">
                        <VideoOff className="size-6 text-foreground" />
                        <span>Your camera is turned off</span>
                      </div>
                    ) : (
                      <video
                        ref={(el) => {
                          localVideoRef.current = el;
                          if (el && localStreamRef.current && !isVideoOff) {
                            if (el.srcObject !== localStreamRef.current) {
                              el.srcObject = localStreamRef.current;
                            }
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] text-foreground flex items-center gap-1">
                      <span>You</span>
                      {isMuted ? <span className="text-warning">&bull; Muted</span> : localIsSpeaking ? <span className="text-success font-medium">&bull; Speaking</span> : null}
                    </div>
                  </div>
                </div>
              ) : (
                /* SPEAKER MODE (FULL REMOTE + FLOATING LOCAL PIP) */
                <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                  <video
                    ref={(el) => {
                      remoteVideoRef.current = el;
                      if (el && remoteStreamRef.current) {
                        if (el.srcObject !== remoteStreamRef.current) {
                          el.srcObject = remoteStreamRef.current;
                        }
                      }
                    }}
                    autoPlay
                    playsInline
                    className={cn("w-full h-full object-cover transition-all duration-300", remoteIsSpeaking && "ring-4 ring-success/50")}
                  />

                  {!remoteStreamRef.current?.getVideoTracks().some((track) => track.enabled) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background text-foreground">
                      <div className={cn("size-24 rounded-full flex items-center justify-center text-3xl font-bold shadow-xl", getAvatarColor(activeCallTargetName), remoteIsSpeaking && "ring-4 ring-success animate-pulse")}>
                        {(activeCallTargetName || "C").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-foreground">{activeCallTargetName}&apos;s camera is off</span>
                      {remoteIsSpeaking && (
                        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success/20 text-success text-xs font-semibold">
                          <Activity className="size-3 animate-pulse" /> Speaking...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Floating local preview in corner */}
                  <div className={cn(
                    "absolute bottom-3 right-3 bg-card rounded-xl overflow-hidden border-2 shadow-2xl z-10 transition-all",
                    localIsSpeaking ? "border-success/30 ring-2 ring-success/40" : "border-border",
                    "w-32 h-24 sm:w-44 sm:h-32"
                  )}>
                    {isVideoOff ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-[10px]">
                        <VideoOff className="size-4 mb-1" /> Cam Off
                      </div>
                    ) : (
                      <video
                        ref={(el) => {
                          localVideoRef.current = el;
                          if (el && localStreamRef.current && !isVideoOff) {
                            if (el.srcObject !== localStreamRef.current) {
                              el.srcObject = localStreamRef.current;
                            }
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-foreground flex items-center gap-1">
                      <span>You</span>
                      {isMuted && <span className="text-destructive font-semibold">(Muted)</span>}
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* VOICE CALL DISPLAY */
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <audio ref={remoteAudioRef} autoPlay />
                <div className="relative">
                  <div
                    className={cn(
                      "size-24 rounded-full text-foreground flex items-center justify-center font-bold text-3xl shadow-xl transition-all",
                      getAvatarColor(activeCallTargetName),
                      remoteIsSpeaking ? "ring-8 ring-success/40 scale-105" : callStatus === "connected" ? "ring-4 ring-primary/20" : "animate-pulse"
                    )}
                  >
                    {(activeCallTargetName || "C").charAt(0).toUpperCase()}
                  </div>
                  {remoteIsSpeaking && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-success text-success-foreground text-[9px] font-semibold animate-pulse shadow-md flex items-center gap-1">
                      <Activity className="size-2.5" /> Speaking
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-lg text-foreground">{activeCallTargetName}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {callStatus === "connected" ? "Voice Call Connected" : "Connecting Call..."}
                  </p>
                </div>

                {/* Audio Wave Visualizer */}
                <div className="flex items-center gap-1 h-5 py-1">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1 rounded-full transition-all duration-150",
                        remoteIsSpeaking || localIsSpeaking
                          ? "bg-primary animate-pulse"
                          : "bg-muted-foreground/30 h-1.5"
                      )}
                      style={{
                        height: remoteIsSpeaking || localIsSpeaking ? `${Math.max(6, (i % 3 + 1) * 6)}px` : "6px",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* In-Call Controls Toolbar */}
          <div className="w-full flex items-center justify-center gap-2 sm:gap-3 py-2 shrink-0 z-30 pb-safe">
            {/* Mic Toggle */}
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="icon"
              data-testid="call-btn-mute"
              className={cn("rounded-full size-10 sm:size-11 cursor-pointer transition-all", !isMuted && localIsSpeaking && "ring-2 ring-success")}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </Button>

            {/* Video Controls if video call */}
            {activeCallType === "video" && (
              <>
                <Button
                  variant={isVideoOff ? "destructive" : "outline"}
                  size="icon"
                  data-testid="call-btn-video"
                  className="rounded-full size-10 sm:size-11 cursor-pointer"
                  title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
                  onClick={toggleVideo}
                >
                  {isVideoOff ? <VideoOff className="size-4" /> : <Video className="size-4" />}
                </Button>

                <Button
                  variant={isScreenSharing ? "default" : "outline"}
                  size="icon"
                  data-testid="call-btn-screenshare"
                  className={cn(
                    "rounded-full size-10 sm:size-11 cursor-pointer",
                    isScreenSharing && "bg-primary text-primary-foreground hover:bg-primary ring-2 ring-primary"
                  )}
                  title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
                  onClick={toggleScreenShare}
                >
                  <ScreenShare className="size-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  data-testid="call-btn-switch-camera"
                  className="rounded-full size-10 sm:size-11 cursor-pointer"
                  title="Switch Camera (Front/Rear)"
                  onClick={switchCamera}
                >
                  <FlipHorizontal className="size-4" />
                </Button>
              </>
            )}

            {/* In-Call Add Participant */}
            <Button
              variant="outline"
              size="icon"
              data-testid="call-btn-add-participant"
              className="rounded-full size-10 sm:size-11 cursor-pointer"
              title="Add Colleague to Call"
              onClick={() => setInCallAddParticipantOpen(true)}
            >
              <UserPlus className="size-4" />
            </Button>

            {/* In-Call Settings */}
            <Button
              variant="outline"
              size="icon"
              data-testid="call-btn-settings"
              className="rounded-full size-10 sm:size-11 cursor-pointer"
              title="Device Settings"
              onClick={() => setInCallSettingsOpen(true)}
            >
              <Settings className="size-4" />
            </Button>

            {/* Hang Up Button */}
            <Button
              variant="destructive"
              size="icon"
              data-testid="call-btn-hangup"
              className="rounded-full size-11 sm:size-12 cursor-pointer shadow-xl bg-destructive hover:bg-destructive text-destructive-foreground ml-1 sm:ml-2"
              title="End Call"
              onClick={handleEndCall}
            >
              <PhoneOff className="size-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FLOATING MINI-CALL PICTURE-IN-PICTURE (PiP) WIDGET */}
      {activeCallModalOpen && isCallMinimized && (
        <div
          data-testid="floating-pip-widget"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[99999] bg-card/95 backdrop-blur-md text-foreground border border-border rounded-2xl p-2.5 sm:p-3 shadow-2xl max-w-[calc(100vw-32px)] animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {activeCallType === "video" ? (
            /* VIDEO PIP CARD */
            <div className="flex flex-col gap-2">
              <div className="relative w-48 sm:w-60 aspect-video rounded-xl overflow-hidden bg-background border border-border flex items-center justify-center">
                <video
                  ref={(el) => {
                    if (el && remoteStreamRef.current) {
                      if (el.srcObject !== remoteStreamRef.current) {
                        el.srcObject = remoteStreamRef.current;
                      }
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {(!remoteStreamRef.current?.getVideoTracks().some((t) => t.enabled) || isVideoOff) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background text-foreground gap-1.5">
                    <div className={cn("size-10 rounded-full flex items-center justify-center font-bold text-xs text-foreground shadow-md", getAvatarColor(activeCallTargetName))}>
                      {(activeCallTargetName || "C").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[10px] text-foreground font-medium truncate max-w-[120px]">{activeCallTargetName}</span>
                  </div>
                )}
                {/* Header chip on video */}
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[9px] text-success font-mono flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-success animate-pulse" />
                  <span>{formatDuration(callDurationSeconds)}</span>
                </div>
              </div>

              {/* PiP Action Toolbar */}
              <div className="flex items-center justify-between px-1">
                <div className="min-w-0 pr-1">
                  <p className="text-xs font-semibold truncate max-w-[110px] text-foreground">{activeCallTargetName}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="pip-btn-mute"
                    className={cn("size-7 rounded-full", isMuted ? "bg-destructive/20 text-destructive" : "text-foreground hover:text-foreground")}
                    onClick={toggleMute}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {isMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="pip-btn-maximize"
                    className="size-7 rounded-full text-foreground hover:text-foreground hover:bg-card"
                    onClick={() => setIsCallMinimized(false)}
                    title="Maximize Call Window"
                  >
                    <Maximize2 className="size-3.5" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    data-testid="pip-btn-hangup"
                    className="size-7 rounded-full bg-destructive hover:bg-destructive text-destructive-foreground"
                    onClick={handleEndCall}
                    title="Hang Up Call"
                  >
                    <PhoneOff className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* AUDIO PIP CARD */
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={cn("size-10 rounded-full flex items-center justify-center font-bold text-sm text-foreground shadow-md", getAvatarColor(activeCallTargetName))}>
                  {(activeCallTargetName || "C").charAt(0).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 size-3 bg-success rounded-full ring-2 ring-ring animate-pulse" />
              </div>

              <div className="min-w-0 pr-1">
                <p className="text-xs font-semibold truncate max-w-[120px] text-foreground">{activeCallTargetName}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-success font-mono">
                  <span className="size-1.5 rounded-full bg-success animate-ping" />
                  <span>{formatDuration(callDurationSeconds)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 border-l border-border/80 pl-2">
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="pip-btn-mute"
                  className={cn("size-8 rounded-full", isMuted ? "bg-destructive/20 text-destructive" : "text-foreground hover:text-foreground")}
                  onClick={toggleMute}
                  title={isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {isMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="pip-btn-maximize"
                  className="size-8 rounded-full text-foreground hover:text-foreground hover:bg-card"
                  onClick={() => setIsCallMinimized(false)}
                  title="Maximize Call Window"
                >
                  <Maximize2 className="size-3.5" />
                </Button>

                <Button
                  variant="destructive"
                  size="icon"
                  data-testid="pip-btn-hangup"
                  className="size-8 rounded-full bg-destructive hover:bg-destructive text-destructive-foreground"
                  onClick={handleEndCall}
                  title="Hang Up Call"
                >
                  <PhoneOff className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* IN-CALL ADD PARTICIPANT MODAL */}
      <Dialog open={inCallAddParticipantOpen} onOpenChange={setInCallAddParticipantOpen}>
        <DialogContent
          className="sm:max-w-md font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="font-sans flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              <span>Add Colleague to Meeting</span>
            </DialogTitle>
            <DialogDescription className="font-sans text-xs">
              Invite team members in your organization to join this live conversation.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 font-sans">
            {/* Strict SFU Deployment Notice */}
            <div className="p-3 rounded-lg bg-warning/15 dark:bg-warning/40 border border-warning/30 dark:border-warning/60 text-warning dark:text-warning space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-warning dark:text-warning">
                <InfoIcon className="size-4 text-warning dark:text-warning shrink-0" />
                <span>Multi-participant calls require LiveKit/mediasoup SFU and TURN deployment. This call will remain one-to-one.</span>
              </div>
              <p className="text-[11px] leading-relaxed text-warning dark:text-warning">
                Adding participants to an active 1-to-1 WebRTC call is disabled. Direct peer-to-peer WebRTC cannot bridge 3+ participants without an SFU media server. For group discussions, please create or open a group chat.
              </p>
            </div>

            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search team members by name or email..."
                value={inCallParticipantSearch}
                onChange={(e) => setInCallParticipantSearch(e.target.value)}
                className="text-xs pl-8 font-sans"
              />
            </div>

            {/* Participants List - Action disabled per SFU requirements */}
            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/50">
              {contacts
                .filter(
                  (c) =>
                    c.userId !== currentUserId &&
                    c.userId !== activeCallTargetId &&
                    (c.name.toLowerCase().includes(inCallParticipantSearch.toLowerCase()) ||
                      (c.email || "").toLowerCase().includes(inCallParticipantSearch.toLowerCase()))
                )
                .slice(0, 10)
                .map((contact) => (
                  <div key={contact.id} className="pt-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn("size-7 rounded-full flex items-center justify-center font-bold text-xs text-foreground", contact.avatarColor)}>
                        {contact.avatarLetter}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate text-foreground">{contact.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{contact.designation || contact.email}</p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="h-7 text-xs px-2.5 opacity-60 cursor-not-allowed bg-muted text-muted-foreground"
                      title="Multi-participant calls require LiveKit/SFU deployment."
                    >
                      Requires LiveKit/SFU
                    </Button>
                  </div>
                ))}
            </div>

            {/* SFU Architecture Disclosure Notice */}
            <div className="p-2.5 rounded-lg bg-muted dark:bg-card/80 border border-border dark:border-border text-[11px] text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground dark:text-foreground">
                <InfoIcon className="size-3.5 text-primary shrink-0" />
                <span>Multi-Party Architecture Boundary</span>
              </div>
              <p className="text-[10px] leading-relaxed">
                MasterHRMS currently utilizes 1-to-1 WebRTC peer-to-peer signaling. Inviting colleagues sends an immediate in-app call notification. For multi-stream media routing with 3+ simultaneous video tracks, LiveKit SFU media cluster deployment is recommended.
              </p>
            </div>
          </div>

          <DialogFooter className="font-sans pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setInCallAddParticipantOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IN-CALL SETTINGS & DEVICE CHOOSER MODAL */}
      <Dialog open={inCallSettingsOpen} onOpenChange={setInCallSettingsOpen}>
        <DialogContent
          className="sm:max-w-md font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="font-sans flex items-center gap-2">
              <Settings className="size-5 text-primary" />
              <span>Call & Device Settings</span>
            </DialogTitle>
            <DialogDescription className="font-sans text-xs">
              Switch devices in real-time or inspect WebRTC connection diagnostics.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 font-sans text-xs">
            {/* Microphone Selector */}
            <div className="space-y-1 text-left">
              <label className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                <Mic className="size-3.5 text-primary" /> Microphone
              </label>
              <select
                value={selectedAudioInputId}
                onChange={(e) => setSelectedAudioInputId(e.target.value)}
                className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs"
              >
                {audioInputDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Mic Level Test */}
            <div className="space-y-1 text-left">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Input Sensitivity</span>
                <span className="font-mono text-[10px]">{Math.round(micVolumeLevel)}%</span>
              </div>
              <Progress value={micVolumeLevel} className="h-1.5 bg-muted" />
            </div>

            {/* Camera Selector (if video call) */}
            {activeCallType === "video" && (
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                  <Video className="size-3.5 text-primary" /> Camera
                </label>
                <select
                  value={selectedVideoDeviceId}
                  onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs"
                >
                  {videoInputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Speaker Selector & Test Sound */}
            <div className="space-y-1 text-left">
              <label className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                <Volume2 className="size-3.5 text-primary" /> Audio Output (Speaker)
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedAudioOutputId}
                  onChange={(e) => setAudioOutputDevice(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs"
                >
                  {audioOutputDevices.length > 0 ? (
                    audioOutputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Speaker ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))
                  ) : (
                    <option value="">Default System Speaker</option>
                  )}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testSpeakerSound}
                  className="h-8 text-xs shrink-0 flex items-center gap-1 border-primary/30 text-primary dark:text-primary"
                >
                  <Volume2 className="size-3 mr-1" /> Test
                </Button>
              </div>
            </div>

            {/* WebRTC Quality Diagnostics */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1.5 text-left">
              <p className="font-semibold text-[11px] text-foreground flex items-center gap-1.5">
                <Activity className="size-3.5 text-primary" /> WebRTC Diagnostics
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-muted-foreground block">Latency (RTT):</span>
                  <span className="font-mono font-medium text-foreground">{networkRttMs} ms</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Connection Quality:</span>
                  <span className={cn("font-medium capitalize", networkQuality === "excellent" ? "text-success" : networkQuality === "good" ? "text-warning" : "text-destructive")}>
                    {networkQuality}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Signaling:</span>
                  <span className="font-medium text-foreground">Socket.IO / Pusher Fallback</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Security:</span>
                  <span className="font-medium text-success">DTLS / SRTP 128-bit</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="font-sans pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setInCallSettingsOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. CALLER BUSY DIALOG */}
      {busyStateData && (
        <Dialog open={!!busyStateData} onOpenChange={() => setBusyStateData(null)}>
          <DialogContent
            className="sm:max-w-sm font-sans text-center"
            style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
          >
            <div className="py-4 flex flex-col items-center font-sans space-y-3">
              <div className="size-16 rounded-full bg-warning/15 dark:bg-warning/60 text-warning dark:text-warning flex items-center justify-center shadow-inner">
                <PhoneOff className="size-7" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">User Currently on Another Call</h3>
                <p className="text-xs text-muted-foreground mt-1 px-4 leading-relaxed">
                  <span className="font-semibold text-foreground">{busyStateData.targetName}</span> is actively engaged in a call and cannot accept new invitations right now.
                </p>
              </div>

              <div className="w-full flex flex-col gap-2 pt-2">
                <Button
                  size="sm"
                  className="w-full bg-primary hover:bg-primary text-primary-foreground font-sans flex items-center justify-center gap-1.5"
                  onClick={() => {
                    const targetId = busyStateData.targetUserId;
                    setBusyStateData(null);
                    if (targetId) startDirectConversationMutation.mutate(targetId);
                  }}
                >
                  <MessageSquare className="size-3.5" />
                  <span>Send Direct Message</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full font-sans"
                  onClick={() => setBusyStateData(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 6. CALL WAITING FLOATING NOTICE (NON-DESTRUCTIVE FOR BUSY RECEIVER) */}
      {callWaitingNotice && (
        <div className="fixed top-5 right-5 z-[99999] max-w-sm bg-card/95 text-foreground border border-warning/40 rounded-xl p-3 shadow-2xl animate-in slide-in-from-top-4 duration-300 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-full bg-warning/20 text-warning flex items-center justify-center shrink-0">
              <PhoneForwarded className="size-4 animate-bounce" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-warning">Call Waiting Notice</p>
                <button
                  onClick={() => setCallWaitingNotice(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <p className="text-xs text-foreground mt-0.5 truncate">
                <span className="font-semibold text-foreground">{callWaitingNotice.requestedByName}</span> tried to call you.
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Your current active call was preserved without interruption.</p>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 text-[11px] px-2 bg-warning/20 hover:bg-warning/30 text-warning border-warning/30"
                  onClick={() => {
                    const callerId = callWaitingNotice.requestedBy;
                    setCallWaitingNotice(null);
                    if (callerId) {
                      api.post("/api/chat/messages", {
                        recipientId: callerId,
                        content: "I am currently in another call. I'll reach out to you as soon as I'm done.",
                      }).then(() => toast.info("Sent auto-reply to caller")).catch(() => {});
                    }
                  }}
                >
                  Send Quick Note
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setCallWaitingNotice(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. ENHANCED INCOMING CALL DIALOG (CALLEE) */}
      {incomingCall && (
        <Dialog open={!!incomingCall} onOpenChange={() => handleRejectIncomingCall("dismissed")}>
          <DialogContent
            data-testid="incoming-call-dialog"
            className="sm:max-w-md font-sans text-center z-[100000] border-2 border-primary/50 shadow-2xl overflow-hidden p-6 [&>button:last-child]:hidden"
            style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
          >
            <div className="py-2 flex flex-col items-center font-sans space-y-4">
              {/* Concentric Animated Sonar Rings */}
              <div className="relative my-2 flex items-center justify-center">
                <div className="absolute size-32 rounded-full bg-primary/20 animate-ping -z-10" />
                <div className="absolute size-28 rounded-full bg-primary/30 animate-pulse -z-10" />
                <div className="size-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-3xl shadow-2xl ring-8 ring-primary/20">
                  {incomingCall.callerName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background">
                  {incomingCall.type === "video" ? <Video className="size-4" /> : <Phone className="size-4" />}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-xl text-foreground">{incomingCall.callerName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {incomingCall.callerEmail || incomingCall.callerPhone || "Colleague"}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/60 text-primary dark:text-primary text-xs font-semibold">
                  <span className="size-2 rounded-full bg-primary animate-ping" />
                  <span>Incoming {incomingCall.type === "video" ? "Video" : "Audio"} Call</span>
                </div>
              </div>

              {/* Quick Message Decline Options */}
              <div className="w-full pt-1 space-y-1.5">
                <p className="text-[10px] text-muted-foreground">Quick decline with message:</p>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const callerId = incomingCall.fromUserId;
                      handleRejectIncomingCall("declined");
                      if (callerId) {
                        api.post("/api/chat/messages", {
                          recipientId: callerId,
                          content: "Can't talk right now. I'll message you shortly.",
                        }).catch(() => {});
                      }
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-foreground border border-border/80 transition-colors cursor-pointer"
                  >
                    Can&apos;t talk now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const callerId = incomingCall.fromUserId;
                      handleRejectIncomingCall("declined");
                      if (callerId) {
                        api.post("/api/chat/messages", {
                          recipientId: callerId,
                          content: "Currently in another meeting. I will catch up shortly.",
                        }).catch(() => {});
                      }
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-foreground border border-border/80 transition-colors cursor-pointer"
                  >
                    In a meeting
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const callerId = incomingCall.fromUserId;
                      handleRejectIncomingCall("declined");
                      if (callerId) {
                        api.post("/api/chat/messages", {
                          recipientId: callerId,
                          content: "I will call you back as soon as possible.",
                        }).catch(() => {});
                      }
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-foreground border border-border/80 transition-colors cursor-pointer"
                  >
                    Call you back soon
                  </button>
                </div>
              </div>

              {/* Accept & Decline Action Buttons */}
              <div className="flex items-center gap-10 pt-3">
                <div className="flex flex-col items-center gap-1.5">
                  <Button
                    variant="destructive"
                    size="icon"
                    data-testid="btn-decline-call"
                    className="rounded-full size-14 shadow-xl bg-destructive hover:bg-destructive cursor-pointer"
                    onClick={() => handleRejectIncomingCall("declined")}
                    title="Decline Call"
                  >
                    <PhoneOff className="size-6" />
                  </Button>
                  <span className="text-[11px] font-medium text-muted-foreground">Decline</span>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <Button
                    size="icon"
                    data-testid="btn-accept-call"
                    className="rounded-full size-14 shadow-xl bg-success hover:bg-success text-success-foreground cursor-pointer ring-4 ring-success/30 animate-pulse"
                    onClick={handleAcceptIncomingCall}
                    title="Accept Call"
                  >
                    <Phone className="size-6" />
                  </Button>
                  <span className="text-[11px] font-medium text-success dark:text-success">Accept</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 7b. INCOMING GROUP MEETING DIALOG */}
      <IncomingGroupMeetingDialog
        incoming={incomingGroupMeeting}
        onAccept={handleAcceptGroupMeeting}
        onDecline={handleDeclineGroupMeeting}
      />

      {/* 4b. MULTI-PARTICIPANT GROUP MEETING DIALOG */}
      <MultiParticipantMeetingDialog
        open={isMeetingOpen}
        onOpenChange={setIsMeetingOpen}
        meeting={activeMeeting}
        participants={meetingParticipants}
        currentUserId={currentUserId}
        currentUserName={(currentUser as any)?.profile?.fullName || (currentUser as any)?.name || currentUser?.email || "You"}
        currentUserAvatar={(currentUser as any)?.avatarUrl || null}
        isMuted={meetingIsMuted}
        isVideoOff={meetingIsVideoOff}
        isScreenSharing={meetingIsScreenSharing}
        localStream={meetingLocalStreamRef.current}
        screenStream={meetingScreenStreamRef.current}
        sfuConfig={meetingSfuConfig}
        availableColleagues={contacts.map((c) => ({
          id: c.userId || c.id,
          name: c.name || "Colleague",
          email: c.email || undefined,
          avatarUrl: c.avatarUrl || null,
        }))}
        threadMessages={allMessages.map((m) => ({
          id: m.id,
          senderName: m.senderName,
          content: m.content,
          createdAt: m.time,
        }))}
        onToggleMute={handleMeetingToggleMute}
        onToggleVideo={handleMeetingToggleVideo}
        onToggleScreenShare={handleMeetingToggleScreenShare}
        onLeaveMeeting={handleMeetingLeave}
        onEndMeetingForEveryone={handleMeetingEndForEveryone}
        onRemoveParticipant={handleMeetingRemoveParticipant}
        onInviteColleagues={handleMeetingInviteColleagues}
        onSendMessage={handleInMeetingSendMessage}
      />

      {/* 6. CREATE POLL DIALOG */}
      <Dialog open={createPollOpen} onOpenChange={setCreatePollOpen}>
        <DialogContent
          className="sm:max-w-md font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="font-sans flex items-center gap-2">
              <BarChart2 className="size-4 text-primary" /> Create a Poll
            </DialogTitle>
            <DialogDescription className="font-sans">
              Ask a question and gather opinions from team members in real-time.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 font-sans">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Question</Label>
              <Input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="e.g. Which sprint milestone should we tackle first?"
                className="text-xs font-sans"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Options</Label>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const updated = [...pollOptions];
                      updated[idx] = e.target.value;
                      setPollOptions(updated);
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="text-xs font-sans flex-1"
                  />
                  {pollOptions.length > 2 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setPollOptions((prev) => prev.filter((_, i) => i !== idx))}
                      className="size-8 text-destructive"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              ))}

              {pollOptions.length < 6 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPollOptions((prev) => [...prev, ""])}
                  className="text-xs mt-1"
                >
                  <Plus className="size-3 mr-1" /> Add Option
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t">
              <Checkbox
                id="poll-multiple"
                checked={pollAllowMultiple}
                onCheckedChange={(checked) => setPollAllowMultiple(Boolean(checked))}
              />
              <Label htmlFor="poll-multiple" className="text-xs cursor-pointer font-medium">
                Allow multiple answers
              </Label>
            </div>
          </div>

          <DialogFooter className="font-sans">
            <Button variant="outline" size="sm" onClick={() => setCreatePollOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreatePoll}
              className="bg-primary hover:bg-primary text-primary-foreground font-sans"
            >
              Create Poll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. EDIT MESSAGE DIALOG */}
      <Dialog open={!!editingMessage} onOpenChange={() => setEditingMessage(null)}>
        <DialogContent
          className="sm:max-w-md font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="font-sans">Edit Message</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="text-xs font-sans"
            />
          </div>
          <DialogFooter className="font-sans">
            <Button variant="outline" size="sm" onClick={() => setEditingMessage(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleEditMessage}
              className="bg-primary hover:bg-primary text-primary-foreground font-sans"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. FORWARD MESSAGE DIALOG (SEPARATE PERSONAL AND GROUP SECTIONS) */}
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
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 dark:bg-primary text-primary dark:text-primary">
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
              <Share2 className="size-4 text-primary flex-shrink-0 mt-0.5" />
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
                        .map((g) => `group_${g.id}`);

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
                            ? "bg-primary/10 dark:bg-primary/60 border-primary/50 text-primary-foreground font-semibold"
                            : "border-transparent hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent onClick
                            className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                          />
                          <Avatar className="size-7 flex-shrink-0">
                            {c.avatarUrl && <AvatarImage src={c.avatarUrl} alt={c.title} />}
                            <AvatarFallback className="text-[10px] font-bold bg-primary text-primary-foreground">
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
                    const threadId = `group_${g.id}`;
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
                            ? "bg-primary/10 dark:bg-primary/60 border-primary/50 text-primary-foreground font-semibold"
                            : "border-transparent hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                          />
                          <Avatar className="size-7 flex-shrink-0">
                            {g.avatarUrl && <AvatarImage src={g.avatarUrl} alt={g.name} />}
                            <AvatarFallback className="text-[10px] font-bold bg-primary text-primary-foreground">
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
              className="bg-primary hover:bg-primary text-primary-foreground font-sans flex items-center gap-1.5"
            >
              <Share2 className="size-3.5" />
              <span>
                {isForwarding
                  ? "Forwarding..."
                  : selectedForwardThreadIds.length > 0
                  ? `Forward (${selectedForwardThreadIds.length})`
                  : "Select Recipients"}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. IN-APP ATTACHMENT VIEWER MODAL (IMAGES, PDFS & DOCUMENTS) */}
      {activeViewer && activeViewer.items.length > 0 && (() => {
        const currentItem = activeViewer.items[activeViewer.currentIndex] || activeViewer.items[0];
        const fileName = currentItem.name || "Attachment";
        const fileExt = fileName.split(".").pop()?.toLowerCase() || "";
        const mime = currentItem.mimeType || "";
        const isImg = mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(fileExt);
        const isPdf = mime === "application/pdf" || fileExt === "pdf";
        const hasPrev = activeViewer.currentIndex > 0;
        const hasNext = activeViewer.currentIndex < activeViewer.items.length - 1;

        return (
          <Dialog
            open={!!activeViewer}
            onOpenChange={(open) => {
              if (!open) setActiveViewer(null);
            }}
          >
            <DialogContent
              className="sm:max-w-4xl max-w-[95vw] h-[85vh] max-h-[85vh] p-0 overflow-hidden flex flex-col bg-background border shadow-2xl font-sans"
              style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {isImg ? (
                    <ImageIcon className="size-4 text-primary flex-shrink-0" />
                  ) : isPdf ? (
                    <FileText className="size-4 text-destructive flex-shrink-0" />
                  ) : (
                    <FileIcon className="size-4 text-accent-foreground flex-shrink-0" />
                  )}
                  <div className="truncate">
                    <p className="text-xs font-semibold text-foreground truncate max-w-sm sm:max-w-md">
                      {fileName}
                    </p>
                    {currentItem.size ? (
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(currentItem.size)}
                        {activeViewer.items.length > 1 && ` • ${activeViewer.currentIndex + 1} of ${activeViewer.items.length}`}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isImg && (
                    <div className="flex items-center gap-1 mr-2 bg-background border rounded-md px-1 py-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6"
                        onClick={() => setActiveViewer((prev) => prev ? { ...prev, zoom: Math.max(0.5, prev.zoom - 0.25) } : null)}
                        title="Zoom Out"
                      >
                        <ZoomOut className="size-3.5" />
                      </Button>
                      <span className="text-[11px] font-mono px-1">
                        {Math.round(activeViewer.zoom * 100)}%
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6"
                        onClick={() => setActiveViewer((prev) => prev ? { ...prev, zoom: Math.min(3, prev.zoom + 0.25) } : null)}
                        title="Zoom In"
                      >
                        <ZoomIn className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6"
                        onClick={() => setActiveViewer((prev) => prev ? { ...prev, zoom: 1 } : null)}
                        title="Reset Zoom"
                      >
                        <RotateCcw className="size-3" />
                      </Button>
                    </div>
                  )}

                  <a
                    href={currentItem.url}
                    download={fileName}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-input bg-background hover:bg-accent text-foreground font-medium transition-colors"
                  >
                    <Download className="size-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </a>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => setActiveViewer(null)}
                    title="Close (Esc)"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Viewer Body */}
              <div className="flex-1 relative bg-muted/20 flex items-center justify-center overflow-auto p-4 select-none">
                {isImg ? (
                  <div className="w-full h-full flex items-center justify-center overflow-auto">
                    <img
                      src={currentItem.url}
                      alt={fileName}
                      style={{
                        transform: `scale(${activeViewer.zoom})`,
                        transformOrigin: "center center",
                        transition: "transform 0.15s ease-out",
                      }}
                      className="max-h-full max-w-full object-contain rounded shadow-sm select-none"
                    />
                  </div>
                ) : isPdf ? (
                  <div className="w-full h-full bg-background rounded-md overflow-hidden border">
                    <iframe
                      src={currentItem.url}
                      title={fileName}
                      className="w-full h-full border-none"
                    />
                  </div>
                ) : (
                  <div className="max-w-md w-full bg-background p-6 rounded-xl border shadow-sm text-center space-y-4">
                    <div className="size-16 rounded-2xl bg-accent/15 dark:bg-accent/40 text-accent-foreground flex items-center justify-center mx-auto border border-accent/30">
                      <FileIcon className="size-8" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground break-all">{fileName}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {fileExt.toUpperCase()} Document • {currentItem.size ? formatFileSize(currentItem.size) : "Standard format"}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80 mt-2">
                        In-app secure preview. You can safely download and open this document with your installed software.
                      </p>
                    </div>
                    <div className="pt-2 flex justify-center gap-2">
                      <a
                        href={currentItem.url}
                        download={fileName}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary text-primary-foreground text-xs font-semibold shadow-xs transition-colors"
                      >
                        <Download className="size-4" /> Download Document
                      </a>
                    </div>
                  </div>
                )}

                {/* Left/Right Navigation Buttons */}
                {hasPrev && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full size-9 bg-background/90 shadow-md hover:bg-background z-10"
                    onClick={() => setActiveViewer((prev) => prev ? { ...prev, currentIndex: prev.currentIndex - 1, zoom: 1 } : null)}
                    title="Previous Attachment (Left Arrow)"
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                )}
                {hasNext && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full size-9 bg-background/90 shadow-md hover:bg-background z-10"
                    onClick={() => setActiveViewer((prev) => prev ? { ...prev, currentIndex: prev.currentIndex + 1, zoom: 1 } : null)}
                    title="Next Attachment (Right Arrow)"
                  >
                    <ChevronRight className="size-5" />
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* 10. MEDIA LIBRARY PICKER MODAL */}
      <MediaPickerModal
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={handleSelectFromMediaLibrary}
        allowedTypes={mediaPickerPurpose === "composer" ? undefined : ["image/*"]}
        title={
          mediaPickerPurpose === "composer"
            ? "Choose Attachment from Media Library"
            : "Choose Group Avatar from Media Library"
        }
      />


      {/* 10. CALLER DETAILS MODAL */}
      {viewCallerDetails && (
        <Dialog open={!!viewCallerDetails} onOpenChange={() => setViewCallerDetails(null)}>
          <DialogContent
            className="sm:max-w-md font-sans"
            style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
          >
            <DialogHeader>
              <DialogTitle className="text-base font-bold font-sans">Caller Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 font-sans">
              <div className="p-4 rounded-xl bg-muted/40 border text-center space-y-3">
                <div className="size-16 rounded-full mx-auto overflow-hidden bg-muted border-2 border-primary/20 flex items-center justify-center font-bold text-xl text-foreground bg-primary">
                  {viewCallerDetails.callerAvatarUrl ? (
                    <img
                      src={viewCallerDetails.callerAvatarUrl}
                      alt={viewCallerDetails.callerName}
                      className="size-full object-cover"
                    />
                  ) : (
                    viewCallerDetails.callerName.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex items-center justify-center gap-3">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-9 rounded-full hover:bg-primary/10 hover:text-primary"
                    title="Video Call"
                    onClick={() => {
                      setViewCallerDetails(null);
                      handleInitiateCall(
                        "video",
                        activeTargetUserId || currentUserId,
                        viewCallerDetails.callerName,
                        viewCallerDetails.callerPhone,
                        viewCallerDetails.callerEmail || ""
                      );
                    }}
                  >
                    <Video className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-9 rounded-full hover:bg-primary/10 hover:text-primary"
                    title="Audio Call"
                    onClick={() => {
                      setViewCallerDetails(null);
                      handleInitiateCall(
                        "audio",
                        activeTargetUserId || currentUserId,
                        viewCallerDetails.callerName,
                        viewCallerDetails.callerPhone,
                        viewCallerDetails.callerEmail || ""
                      );
                    }}
                  >
                    <Phone className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="divide-y text-xs">
                <div className="py-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Phone Number</span>
                  <span className="font-semibold text-foreground font-mono">{viewCallerDetails.callerPhone}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Email Address</span>
                  <span className="font-medium text-foreground">{viewCallerDetails.callerEmail || "—"}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Call Direction</span>
                  <span className="font-semibold capitalize text-foreground">{viewCallerDetails.callType}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Session Duration</span>
                  <span className="font-mono text-primary font-bold">
                    {formatDuration(viewCallerDetails.durationSeconds)}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="font-sans">
              <Button variant="outline" size="sm" onClick={() => setViewCallerDetails(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 11. SCHEDULE MEETING MODAL (Replaces Manual Log Call) */}
      <Dialog open={scheduleMeetingOpen} onOpenChange={setScheduleMeetingOpen}>
        <DialogContent
          className="sm:max-w-lg font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-sans flex items-center gap-2">
              <CalendarPlus className="size-4 text-primary" /> Schedule Meeting
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Schedule a calendar event with colleagues. Invites, notifications, and reminders will be dispatched automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs font-sans">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Meeting Title *</Label>
              <Input
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g. Sprint Sync & Architecture Review"
                className="text-xs font-sans"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description / Agenda</Label>
              <Input
                value={meetingDescription}
                onChange={(e) => setMeetingDescription(e.target.value)}
                placeholder="Brief agenda or discussion topics"
                className="text-xs font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Start Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={meetingStartDate}
                  onChange={(e) => setMeetingStartDate(e.target.value)}
                  className="text-xs font-sans"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">End Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={meetingEndDate}
                  onChange={(e) => setMeetingEndDate(e.target.value)}
                  className="text-xs font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tenant Timezone</Label>
                <Input
                  value={meetingTimezone}
                  onChange={(e) => setMeetingTimezone(e.target.value)}
                  className="text-xs font-sans font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Location / Meeting Link</Label>
                <Input
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  placeholder="e.g. Conference Room A or Video Link"
                  className="text-xs font-sans"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Participants</Label>
              <div className="max-h-36 overflow-y-auto border rounded-md p-2 space-y-1.5 bg-muted/20">
                {contacts.length === 0 ? (
                  <p className="text-muted-foreground text-[11px] py-1">No colleagues available</p>
                ) : (
                  contacts.map((c) => {
                    const attendeeId = c.userId || c.id;
                    const isChecked = meetingSelectedAttendees.includes(attendeeId);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 p-1 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setMeetingSelectedAttendees((prev) => [...prev, attendeeId]);
                            } else {
                              setMeetingSelectedAttendees((prev) => prev.filter((id) => id !== attendeeId));
                            }
                          }}
                        />
                        <div className="flex items-center gap-2 min-w-0">
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt={c.name} className="size-5 rounded-full object-cover" />
                          ) : (
                            <span className="size-5 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                              {c.avatarLetter}
                            </span>
                          )}
                          <span className="text-xs font-medium text-foreground truncate">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground truncate">({c.designation || c.email})</span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="font-sans">
            <Button variant="outline" size="sm" onClick={() => setScheduleMeetingOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={scheduleMeetingMutation.isPending}
              onClick={() => {
                if (!meetingTitle.trim()) {
                  toast.error("Please provide a meeting title.");
                  return;
                }
                if (!meetingStartDate || !meetingEndDate) {
                  toast.error("Please set both start and end date/time.");
                  return;
                }
                if (new Date(meetingStartDate) >= new Date(meetingEndDate)) {
                  toast.error("End date must be after start date.");
                  return;
                }
                scheduleMeetingMutation.mutate({
                  title: meetingTitle.trim(),
                  description: meetingDescription.trim(),
                  startDate: new Date(meetingStartDate).toISOString(),
                  endDate: new Date(meetingEndDate).toISOString(),
                  category: "Meetings",
                  location: meetingLocation.trim() || undefined,
                  timezone: meetingTimezone,
                  sharedWith: meetingSelectedAttendees.map((id) => ({
                    recipientId: id,
                    permission: "view",
                  })),
                  reminders: [
                    { channel: "both", minutesBefore: 15 },
                    { channel: "in_app", minutesBefore: 60 },
                  ],
                });
              }}
              className="bg-primary hover:bg-primary text-primary-foreground font-sans gap-1.5"
            >
              {scheduleMeetingMutation.isPending ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <CalendarPlus className="size-3.5" />
              )}
              Schedule Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 13. TRANSFER OWNERSHIP MODAL */}
      <Dialog open={transferOwnershipOpen} onOpenChange={setTransferOwnershipOpen}>
        <DialogContent
          className="sm:max-w-md font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-sans">Transfer Group Ownership</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Choose a group member to become the new group owner. You will retain admin privileges.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs font-sans">
            <div className="p-3 bg-warning/15 dark:bg-warning/30 border border-warning/30 dark:border-warning/50 rounded-lg text-warning dark:text-warning text-xs">
              <strong>Important:</strong> Group ownership gives full administrative control. Only transfer ownership to trusted team members.
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select New Owner</Label>
              <select
                value={selectedNewOwnerId}
                onChange={(e) => setSelectedNewOwnerId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-sans"
              >
                <option value="">-- Choose Member --</option>
                {activeGroup?.members
                  ?.filter((m) => m.userId !== currentUserId)
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} ({m.role})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <DialogFooter className="font-sans">
            <Button variant="outline" size="sm" onClick={() => setTransferOwnershipOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedNewOwnerId || transferOwnershipMutation.isPending}
              onClick={() => {
                if (!activeGroupId || !selectedNewOwnerId) return;
                transferOwnershipMutation.mutate({
                  groupId: activeGroupId,
                  newOwnerId: selectedNewOwnerId,
                });
              }}
              className="bg-warning hover:bg-warning text-foreground font-sans"
            >
              Confirm Ownership Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 14. LEAVE GROUP MODAL (WITH LAST-ADMIN SAFETY) */}
      <Dialog open={leaveGroupOpen} onOpenChange={setLeaveGroupOpen}>
        <DialogContent
          className="sm:max-w-md font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-sans">Leave Group</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Confirm leaving &quot;{activeGroup?.name}&quot;.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const adminCount =
              activeGroup?.members?.filter((m) => m.role === "admin" || m.role === "owner").length || 0;
            const isUserAdminOrOwner = activeGroup?.members?.some(
              (m) => m.userId === currentUserId && (m.role === "admin" || m.role === "owner")
            );
            const isLastAdmin =
              isUserAdminOrOwner && adminCount <= 1 && (activeGroup?.members?.length || 0) > 1;

            return (
              <div className="space-y-3 py-2 text-xs font-sans">
                {isLastAdmin ? (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="size-4" /> Cannot Leave as Last Administrator
                    </p>
                    <p>
                      You are currently the only owner/admin in this group. You must promote another member to admin or transfer ownership before leaving.
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Are you sure you want to leave this group? You will no longer receive notifications or messages from this group conversation.
                  </p>
                )}

                <DialogFooter className="font-sans pt-2">
                  <Button variant="outline" size="sm" onClick={() => setLeaveGroupOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isLastAdmin || leaveGroupMutation.isPending}
                    onClick={() => {
                      if (!activeGroupId) return;
                      leaveGroupMutation.mutate(activeGroupId);
                    }}
                  >
                    Leave Group
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
